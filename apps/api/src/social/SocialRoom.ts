import { DirectMessageStore } from "#api/messages/DirectMessageStore";
import { Room, ServerError, type Client } from "colyseus";
import { accountStore } from "#api/accounts/runtime";
import { SocialService } from "#api/social/SocialService";
import { resolveSocialInviteRoom } from "#api/social/resolveSocialInviteRoom";
import { SocialStatus } from "@aegis/shared/social/SocialStatus";
import type { SocialEvent, SocialIntent } from "@aegis/shared/protocol/social";
import type { SocialPresence } from "@aegis/shared/social/SocialPresence";
import { tokenBucketLimiter } from "#api/http/rateLimit";

const rooms = new WeakMap<object, string>();
const LEASE_RENEWAL_INTERVAL_MS = 10_000;
const SNAPSHOT_RECONCILE_INTERVAL_MS = 30_000;

type FriendsSnapshot = Extract<SocialEvent, { kind: "friendsSnapshot" }>;

export class SocialRoom extends Room {
  override maxClients = 10_000;
  override autoDispose = false;
  private service!: SocialService;
  private readonly accountByClient = new Map<string, string>();
  private readonly subscriptions = new Map<string, (event: SocialEvent) => void>();
  private readonly lastSnapshotBySession = new Map<string, string>();
  private readonly refreshLimit = tokenBucketLimiter({ capacity: 5, refillMs: 2000 });
  private readonly messageLimit = tokenBucketLimiter({ capacity: 5, refillMs: 1500 });
  private readonly limit = tokenBucketLimiter({ capacity: 3, refillMs: 20_000 });

  private retiring = false;
  private readonly pendingTasks = new Set<Promise<unknown>>();
  private readonly taskFailures = new Map<number, unknown>();
  private nextTask = 0;
  private heartbeat?: ReturnType<Room["clock"]["setInterval"]>;
  private reconciliation?: ReturnType<Room["clock"]["setInterval"]>;
  private disposing?: Promise<void>;

  private runTask<T>(work: () => Promise<T>, retiredValue: T): Promise<T> {
    if (this.retiring) return Promise.resolve(retiredValue);
    const order = this.nextTask++;
    let start!: (value: T | PromiseLike<T>) => void;
    let fail!: (error: unknown) => void;
    const task = new Promise<T>((resolve, reject) => {
      start = resolve;
      fail = reject;
    });
    this.pendingTasks.add(task);
    void task.then(
      () => this.pendingTasks.delete(task),
      (error: unknown) => {
        this.taskFailures.set(order, error);
        this.pendingTasks.delete(task);
      },
    );
    try {
      start(work());
    } catch (error) {
      fail(error);
    }
    return task;
  }

  override onCreate(): void {
    if (rooms.has(this.presence)) {
      throw new ServerError(409, "Social room already exists on this process");
    }
    rooms.set(this.presence, this.roomId);
    this.service = this.createSocialService();
    this.onMessage("social", (client, payload: unknown) => {
      void this.runTask(
        () =>
          this.handleIntent(client, payload).catch(() =>
            client.send("social", { kind: "error", error: "unavailable" }),
          ),
        undefined,
      );
    });
    this.heartbeat = this.clock.setInterval(() => {
      void this.runTask(() => this.renewConnections().catch(() => undefined), undefined);
    }, LEASE_RENEWAL_INTERVAL_MS);
    this.reconciliation = this.clock.setInterval(() => {
      void this.runTask(() => this.reconcileSnapshots().catch(() => undefined), undefined);
    }, SNAPSHOT_RECONCILE_INTERVAL_MS);
  }

  override async onAuth(_client: Client, options: { authTicket?: string }): Promise<{ accountId: string } | false> {
    return this.runTask<{ accountId: string } | false>(() => this.authenticate(options), false);
  }

  private async authenticate(options: { authTicket?: string }): Promise<{ accountId: string } | false> {
    const ticket = await this.service.accounts.consumeRoomTicket(options.authTicket);
    if (!ticket || ticket.tournamentMatchId) {
      return false;
    }
    return { accountId: ticket.account.id };
  }

  override onJoin(client: Client): Promise<void> {
    return this.runTask(() => this.join(client), undefined);
  }

  private async join(client: Client): Promise<void> {
    const accountId = (client.auth as { accountId: string }).accountId;
    this.accountByClient.set(client.sessionId, accountId);
    if (!this.subscriptions.has(accountId)) {
      const receive = (event: SocialEvent) => {
        void this.runTask(() => this.deliver({ accountId, event }).catch(() => undefined), undefined);
      };
      this.subscriptions.set(accountId, receive);
      await this.presence.subscribe(`social:account:${accountId}`, receive);
    }
    await this.service.writePresence({
      accountId,
      connectionId: client.sessionId,
      status: SocialStatus.ONLINE.value,
    });
    client.send("social", await this.unreadMessages(accountId));
    this.sendSnapshot(client, await this.service.snapshot(accountId));
    for (const invite of await this.service.readInvites(accountId)) {
      client.send("social", { kind: "matchInvite", invite });
    }
  }

  override onLeave(client: Client): Promise<void> {
    return this.runTask(() => this.leave(client), undefined);
  }

  private async leave(client: Client): Promise<void> {
    const accountId = this.accountByClient.get(client.sessionId);
    this.accountByClient.delete(client.sessionId);
    this.lastSnapshotBySession.delete(client.sessionId);
    if (!accountId) {
      return;
    }
    await this.service.deletePresence({ accountId, connectionId: client.sessionId });
    if (![...this.accountByClient.values()].includes(accountId)) {
      await this.presence.unsubscribe(`social:account:${accountId}`, this.subscriptions.get(accountId));
      this.subscriptions.delete(accountId);
    }
  }

  override onDispose(): Promise<void> {
    this.retiring = true;
    this.heartbeat?.clear();
    this.reconciliation?.clear();
    this.disposing ??= this.dispose();
    return this.disposing;
  }

  private async dispose(): Promise<void> {
    await Promise.allSettled(this.pendingTasks);
    const errors = [...this.taskFailures].sort(([a], [b]) => a - b).map(([, error]) => error);
    const attempt = async (work: () => Promise<unknown>) => {
      try {
        await work();
      } catch (error) {
        errors.push(error);
      }
    };
    if (rooms.get(this.presence) === this.roomId) {
      rooms.delete(this.presence);
    }
    for (const [accountId, receive] of this.subscriptions) {
      await attempt(() => this.presence.unsubscribe(`social:account:${accountId}`, receive));
    }
    for (const [connectionId, accountId] of this.accountByClient) {
      await attempt(() => this.service.deletePresence({ accountId, connectionId }));
    }
    this.subscriptions.clear();
    this.accountByClient.clear();
    if (errors.length === 1) throw errors[0];
    if (errors.length > 1) throw new AggregateError(errors, "Social room cleanup failed", { cause: errors[0] });
  }

  protected createSocialService(): SocialService {
    return new SocialService({
      accounts: accountStore,
      presence: this.presence,
      resolveRoom: resolveSocialInviteRoom,
    });
  }

  private async deliver({ accountId, event }: { accountId: string; event: SocialEvent }): Promise<void> {
    if (
      event.kind === "directMessage" &&
      !(await this.service.canInteract(
        accountId,
        event.message.senderId === accountId ? event.message.recipientId : event.message.senderId,
      ))
    ) {
      return;
    }
    if (event.kind === "presenceChanged" && !(await this.service.canInteract(accountId, event.presence.accountId))) {
      return;
    }
    const unread = ["directMessage", "messagesRead", "friendsChanged"].includes(event.kind)
      ? await this.unreadMessages(accountId)
      : undefined;
    for (const client of this.clients) {
      if (this.accountByClient.get(client.sessionId) !== accountId) {
        continue;
      }
      client.send(
        "social",
        event.kind === "presenceChanged"
          ? {
              ...event,
              presence: await this.service.visiblePresence({
                viewerId: accountId,
                presence: event.presence,
              }),
            }
          : event,
      );
      if (unread) {
        client.send("social", unread);
      }
      if (event.kind === "friendsChanged") {
        this.sendSnapshot(client, await this.service.snapshot(accountId));
      }
    }
  }

  private async unreadMessages(accountId: string): Promise<SocialEvent> {
    const conversations = await new DirectMessageStore(this.service.accounts).conversations(accountId);
    return {
      kind: "unreadMessages",
      count: conversations.reduce((total, conversation) => total + conversation.unread, 0),
      conversations,
    };
  }

  private sendSnapshot(client: Client, snapshot: FriendsSnapshot): void {
    this.lastSnapshotBySession.set(client.sessionId, JSON.stringify(snapshot));
    client.send("social", snapshot);
  }

  private async renewConnections(): Promise<void> {
    for (const [connectionId, accountId] of this.accountByClient) {
      await this.service.writePresence({
        accountId,
        connectionId,
        status: SocialStatus.ONLINE.value,
      });
    }
    for (const accountId of new Set(this.accountByClient.values())) {
      await this.service.readInvites(accountId);
    }
  }

  private async reconcileSnapshots(): Promise<void> {
    const presenceByAccount = new Map<string, Promise<SocialPresence>>();
    for (const accountId of new Set(this.accountByClient.values())) {
      const snapshot = await this.service.snapshot(accountId, presenceByAccount);
      const serialized = JSON.stringify(snapshot);
      for (const client of this.clients) {
        if (
          this.accountByClient.get(client.sessionId) === accountId &&
          this.lastSnapshotBySession.get(client.sessionId) !== serialized
        ) {
          this.sendSnapshot(client, snapshot);
        }
      }
    }
  }

  private async handleIntent(client: Client, payload: unknown): Promise<void> {
    const accountId = this.accountByClient.get(client.sessionId);
    if (!accountId || typeof payload !== "object" || payload === null) {
      return;
    }
    const intent = payload as SocialIntent;
    if (intent.kind === "directMessage" || intent.kind === "readMessages") {
      if (typeof intent.friendId !== "string" || !/^[0-9a-f-]{36}$/i.test(intent.friendId)) {
        return;
      }
      if (!this.messageLimit(accountId)) {
        client.send("social", {
          kind: "error",
          error: "rate_limited",
          requestId: intent.kind === "directMessage" ? intent.requestId : undefined,
        });
        return;
      }
      const store = new DirectMessageStore(this.service.accounts);
      if (intent.kind === "directMessage") {
        if (typeof intent.requestId !== "string" || !/^[0-9a-f-]{36}$/i.test(intent.requestId)) {
          return;
        }
        const message = await store.send({
          accountId,
          friendId: intent.friendId,
          body: intent.body,
        });
        if (!message) {
          client.send("social", {
            kind: "error",
            error: "message_unavailable",
            requestId: intent.requestId,
          });
          return;
        }
        client.send("social", { kind: "messageSent", requestId: intent.requestId, message });
        for (const target of [accountId, intent.friendId]) {
          await this.service.publish({
            accountId: target,
            event: { kind: "directMessage", message },
          });
        }
      } else if (this.refreshLimit(accountId)) {
        const at = await store.markRead({ accountId, friendId: intent.friendId });
        if (at !== undefined) {
          for (const target of [accountId, intent.friendId]) {
            await this.service.publish({
              accountId: target,
              event: { kind: "messagesRead", accountId, friendId: intent.friendId, at },
            });
          }
        }
      }
      return;
    }
    if (intent.kind === "refresh") {
      if (!this.refreshLimit(accountId)) {
        return;
      }
      client.send("social", await this.unreadMessages(accountId));
      this.sendSnapshot(client, await this.service.snapshot(accountId));
      for (const invite of await this.service.readInvites(accountId)) {
        client.send("social", { kind: "matchInvite", invite });
      }
      return;
    }
    if (!this.limit(accountId)) {
      client.send("social", { kind: "error", error: "rate_limited" });
      return;
    }
    if (
      intent.kind === "invite" &&
      typeof intent.friendId === "string" &&
      /^[0-9a-f-]{36}$/i.test(intent.friendId) &&
      typeof intent.roomCode === "string" &&
      /^[A-Z2-9]{6}$/i.test(intent.roomCode)
    ) {
      const invite = await this.service.invite({
        senderId: accountId,
        recipientId: intent.friendId,
        roomCode: intent.roomCode.toUpperCase(),
      });
      if (!invite) {
        client.send("social", { kind: "error", error: "invite_unavailable" });
      }
    }
    if (
      intent.kind === "answerInvite" &&
      typeof intent.inviteId === "string" &&
      /^[0-9a-f-]{36}$/i.test(intent.inviteId) &&
      typeof intent.accept === "boolean"
    ) {
      const invite = await this.service.answer({
        accountId,
        inviteId: intent.inviteId,
        accept: intent.accept,
      });
      if (!invite) {
        client.send("social", { kind: "inviteExpired", inviteId: intent.inviteId });
      }
    }
  }
}
