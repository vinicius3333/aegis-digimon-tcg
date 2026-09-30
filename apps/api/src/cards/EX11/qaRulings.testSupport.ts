import { expect } from "vitest";
import { EffectTiming, type Permanent, type Seat, type ServerEvent } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { observe } from "../../engine/testkit/observe.js";
import { setupEngine, settle, type CardSpec, type EngineSetup } from "../../engine/testkit/harness.js";
import { syncPublicCounts } from "../../engine/state/visibility.js";

/** Every card or permanent id offered by the decisions raised since `fromDecision`. */
export function offeredIds(s: EngineSetup, fromDecision = 0): Set<string> {
  return new Set(
    s.decisions
      .slice(fromDecision)
      .flatMap(({ req }) => [...(req.options?.candidateInstanceIds ?? []), ...(req.options?.visibleInstanceIds ?? [])]),
  );
}

export function wasOffered(s: EngineSetup, permanent: Permanent, fromDecision = 0): boolean {
  const ids = offeredIds(s, fromDecision);
  return ids.has(permanent.permanentId) || ids.has(permanent.topCard.instanceId);
}

export async function attackPlayer(s: EngineSetup, seat: Seat, attackerAlias: string): Promise<void> {
  expect(
    s.engine.applyIntent(seat, {
      type: "attack",
      attackerPermanentId: s.perm(attackerAlias).permanentId,
      target: { kind: "player" },
    }),
  ).toEqual({ ok: true });
  await settle(() => !observe(s.engine).isAttacking() && s.state.pendingDecision === undefined);
}

export async function attackPermanent(
  s: EngineSetup,
  seat: Seat,
  attackerAlias: string,
  targetAlias: string,
): Promise<void> {
  expect(
    s.engine.applyIntent(seat, {
      type: "attack",
      attackerPermanentId: s.perm(attackerAlias).permanentId,
      target: { kind: "permanent", permanentId: s.perm(targetAlias).permanentId },
    }),
  ).toEqual({ ok: true });
  await settle(() => !observe(s.engine).isAttacking() && s.state.pendingDecision === undefined);
}

export function eventIndex(s: EngineSetup, matches: (event: ServerEvent) => boolean): number {
  return s.events.findIndex(matches);
}

export function isDeletionOf(permanentId: string): (event: ServerEvent) => boolean {
  return (event) =>
    event.kind === "cardsMoved" &&
    (event.deletedPermanents ?? []).some((deleted) => deleted.permanentId === permanentId);
}

export function isMemoryGain(event: ServerEvent): boolean {
  return event.kind === "memoryChanged" && event.reason === "gainMemory";
}

export function publicSecurity(s: EngineSetup, seat: Seat): { faceUp: boolean; cardId: string }[] {
  return syncPublicCounts(s.state).players[seat]!.securityView.map(({ faceUp, cardId }) => ({ faceUp, cardId }));
}

/**
 * Seat 0 holds `sourceCardId` on the battle area next to its own `ally`, seat 1 holds an
 * unsuspended `opponent`. Fires the source's `timing` with the suspension target biased
 * toward `pick`, and returns the setup plus whether each side was offered.
 */
export async function suspendOneDigimonFrom(
  sourceCardId: string,
  timing: EffectTiming,
  pick: "ally" | "opponent",
  under: CardSpec[] = [],
): Promise<{ s: EngineSetup; offeredAlly: boolean; offeredOpponent: boolean }> {
  const preferred: string[] = [];
  const s = setupEngine(
    {
      0: {
        battleArea: [
          { card: sourceCardId, as: "source", under },
          { card: "BT1-010", as: "ally" },
        ],
      },
      1: { battleArea: [{ card: "BT1-009", as: "opponent" }] },
    },
    { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferred },
  );
  preferred.push(s.perm(pick).permanentId, s.perm(pick).topCard.instanceId);
  await s.ready();

  await advance(s.engine).fire(timing, s.perm("source"));
  await settle(() => s.state.pendingDecision === undefined);

  return { s, offeredAlly: wasOffered(s, s.perm("ally")), offeredOpponent: wasOffered(s, s.perm("opponent")) };
}

/**
 * Seat 0's `attacker` checks seat 1's top security card, which is face up. Returns the
 * setup after the attack; seat 1's security holds `checked` on top of one face-down card.
 */
export async function checkFaceUpSecurity(checked: string, attackerDp = 20_000): Promise<EngineSetup> {
  const s = setupEngine(
    {
      0: { battleArea: [{ card: "AD1-001", as: "attacker", dp: attackerDp }], deck: ["BT1-009", "BT1-010"] },
      1: {
        security: [
          { card: checked, as: "checked", faceUp: true },
          { card: "BT1-011", as: "rest" },
        ],
        deck: ["BT1-009", "BT1-010"],
      },
    },
    { autoAcceptOptional: true, autoSelectCards: true },
  );
  await s.ready();
  await attackPlayer(s, 0, "attacker");
  return s;
}

/**
 * Seat 0's security holds `faceUpCards` face up among face-down cards; BT5-037 Gladimon's
 * [On Play] then shuffles that stack. Returns the setup after the shuffle.
 */
export async function shuffleSecurityHolding(faceUpCards: string[]): Promise<EngineSetup> {
  const s = setupEngine(
    {
      0: {
        hand: [{ card: "BT5-037", as: "gladimon" }],
        deck: ["BT1-009", "BT1-013", "BT1-009", "BT1-013"],
        security: [...faceUpCards.map((card) => ({ card, faceUp: true })), "BT1-009", "BT1-013"],
      },
    },
    { autoAcceptOptional: true, autoSelectCards: true },
  );
  s.state.memory = 10;
  await s.ready();
  expect(s.state.players[0]!.security.filter(({ faceUp }) => faceUp)).toHaveLength(faceUpCards.length);

  expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("gladimon").instanceId })).toEqual({
    ok: true,
  });
  await settle(() => s.state.players[0]!.battleArea.some(({ topCard }) => topCard.cardId === "BT5-037"));
  await settle(() => s.state.pendingDecision === undefined);
  return s;
}

/** Every security card is face down, both in state and in the public view. */
export function allSecurityFaceDown(s: EngineSetup, seat: Seat): boolean {
  return (
    s.state.players[seat]!.security.every(({ faceUp }) => faceUp !== true) &&
    publicSecurity(s, seat).every(({ faceUp, cardId }) => !faceUp && cardId === "")
  );
}

/**
 * Seat 1's face-up `checkedCardId` is checked by an ordinary attack: it is revealed to both
 * players beforehand and then resolves exactly as a face-down security card would.
 */
export async function expectFaceUpCardCheckedNormally(checkedCardId: string): Promise<EngineSetup> {
  const s = await checkFaceUpSecurity(checkedCardId);
  const checked = s.inst("checked");

  expect(s.events.filter((event) => event.kind === "securityChecked")).toEqual([
    expect.objectContaining({ seat: 1, revealedCardId: checkedCardId }),
  ]);
  expect(
    s.state.players[1]!.security.map(({ instanceId, faceUp }) => ({ instanceId, faceUp: faceUp === true })),
  ).toEqual([{ instanceId: s.inst("rest").instanceId, faceUp: false }]);
  const inTrash = s.state.players[1]!.trash.some(({ instanceId }) => instanceId === checked.instanceId);
  const onField = s.state.players[1]!.battleArea.some(({ topCard }) => topCard.instanceId === checked.instanceId);
  expect(inTrash || onField).toBe(true);
  return s;
}

/** Seat 0's BT15-086 Marvin Jackson uses its [Main] <Mind Link> on its only eligible host. */
export async function mindLinkMarvin(s: EngineSetup, marvinAlias: string, hostAlias: string): Promise<void> {
  const [mindLink] = observe(s.engine).activatableEffects(s.perm(marvinAlias)) as { effectKey: string }[];
  expect(
    s.engine.applyIntent(0, {
      type: "activateEffect",
      sourceInstanceId: s.perm(marvinAlias).topCard.instanceId,
      effectKey: mindLink!.effectKey,
    }),
  ).toEqual({ ok: true });
  await settle(() => s.perm(hostAlias).stack.some(({ cardId }) => cardId === "BT15-086"));
  await settle(() => s.state.pendingDecision === undefined);
}

/**
 * Answer the next `chooseTargets` decisions in order, each with the permanents the aliases
 * name, and return the candidate ids each decision offered.
 */
export async function chooseTargetsInOrder(s: EngineSetup, seat: Seat, choices: string[][]): Promise<string[][]> {
  const offered: string[][] = [];
  for (const aliases of choices) {
    await settle(() => s.state.pendingDecision?.kind === "chooseTargets");
    const decision = s.state.pendingDecision!;
    offered.push(s.decisions.at(-1)!.req.options?.candidateInstanceIds ?? []);
    expect(
      s.engine.applyIntent(seat, {
        type: "respondDecision",
        decisionId: decision.decisionId,
        response: { kind: "chooseTargets", instanceIds: aliases.map((alias) => s.perm(alias).permanentId) },
      }),
    ).toEqual({ ok: true });
  }
  return offered;
}

/**
 * Seat 0 holds `hostCardId` (with `under`) beside EX11-070 Unchained, whose [End of Your Turn]
 * effect <Mind Link>s onto the host. Runs seat 0's turn into seat 1's Main phase; call
 * `finish` to end the game loop.
 */
export async function mindLinkUnchainedAtTurnEnd(
  hostCardId: string,
  seats: { hand?: CardSpec[]; opponentBattleArea?: { card: string; as: string }[] } = {},
): Promise<{ s: EngineSetup; finish(): Promise<void> }> {
  const s = setupEngine(
    {
      0: {
        battleArea: [
          { card: hostCardId, as: "host" },
          { card: "EX11-070", as: "unchained" },
        ],
        hand: seats.hand ?? [],
        deck: ["BT1-009", "BT1-010", "BT1-011"],
      },
      1: { battleArea: seats.opponentBattleArea ?? [], deck: ["BT1-012", "BT1-013", "BT1-014"], security: ["BT1-015"] },
    },
    { autoAcceptOptional: true, autoSelectCards: true },
  );
  await s.ready();
  const loop = s.engine.startTurnLoop();
  await advance(s.engine).waitForMainPhase(0);
  advance(s.engine).endMainPhaseIfOpen(0);
  await advance(s.engine).waitForMainPhase(1);
  expect(s.perm("host").stack.map(({ cardId }) => cardId)).toContain("EX11-070");
  return {
    s,
    async finish() {
      expect(s.engine.applyIntent(1, { type: "surrender" })).toEqual({ ok: true });
      await loop;
    },
  };
}
