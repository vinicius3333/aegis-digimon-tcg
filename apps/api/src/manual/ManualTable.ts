import { randomInt, randomUUID } from "node:crypto";
import {
  CardKind,
  deckLegality,
  getCardDefinition,
  MANUAL_ZONES,
  type ManualAction,
  type ManualCard,
  type ManualCommand,
  type ManualFieldZone,
  type ManualLooseZone,
  type ManualPlayer,
  type ManualSnapshot,
  type ManualStack,
  type ManualTableState,
  type ManualZone,
  type Seat,
} from "@aegis/shared";

const looseZones: ManualLooseZone[] = ["hand", "deck", "eggDeck", "security", "trash", "reveal"];
const fieldZones: ManualFieldZone[] = ["battle", "breeding"];
const hiddenZones = new Set<ManualZone>(["deck", "eggDeck", "security"]);
const copy = <T>(value: T): T => structuredClone(value);
function ensure(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}
function integer(value: unknown, min: number, max: number): value is number {
  return typeof value === "number" && Number.isInteger(value) && value >= min && value <= max;
}
function zone(value: unknown): value is ManualZone {
  return MANUAL_ZONES.includes(value as ManualZone);
}
function shuffle(cards: ManualCard[]): void {
  for (let i = cards.length - 1; i > 0; i--) {
    const j = randomInt(i + 1);
    [cards[i], cards[j]] = [cards[j]!, cards[i]!];
  }
}
function cleanText(value: string): string {
  return Array.from(value, (character) =>
    character.charCodeAt(0) < 32 || character.charCodeAt(0) === 127 ? " " : character,
  ).join("");
}
function text(value: unknown, max: number): string {
  ensure(typeof value === "string" && value.trim().length > 0 && value.length <= max, "Invalid text");
  return cleanText(value.trim());
}
function makeCards(ids: string[], arts?: string[]): ManualCard[] {
  return ids.map((cardId, index) => ({ id: randomUUID(), cardId, artId: arts?.[index] ?? "", faceUp: false }));
}

/** Owns only physical table operations. Never loads executable card behavior. */
export class ManualTable {
  state: ManualTableState = {
    revision: 0,
    phase: "setup",
    turn: 0,
    memory: 0,
    winner: null,
    players: [],
    history: [],
    undo: null,
  };
  private previous: ManualTableState | null = null;
  private inspections: ("deck" | "security" | "eggDeck" | null)[] = [null, null];
  private historyId = 0;

  join(
    name: string,
    deck: { mainDeck: string[]; eggDeck: string[]; mainDeckArts?: string[]; eggDeckArts?: string[] },
  ): Seat {
    ensure(this.state.players.length < 2 && this.state.phase === "setup", "Room is full");
    ensure(deck && Array.isArray(deck.mainDeck) && Array.isArray(deck.eggDeck), "Invalid deck");
    ensure(deck.mainDeck.length === 50 && deck.eggDeck.length <= 5, "Use a 50-card deck and up to 5 eggs");
    ensure(
      [...deck.mainDeck, ...deck.eggDeck].every((id) => typeof id === "string" && getCardDefinition(id)),
      "Unknown card",
    );
    ensure(
      deck.mainDeck.every((id) => !getCardDefinition(id)?.kinds.includes(CardKind.DigiEgg)) &&
        deck.eggDeck.every((id) => getCardDefinition(id)?.kinds.includes(CardKind.DigiEgg)),
      "Put eggs in the egg deck",
    );
    ensure(deckLegality(deck, { unlimited: true }).legal, "Invalid deck composition or copy limit");
    ensure(
      [deck.mainDeckArts, deck.eggDeckArts].every(
        (arts) =>
          arts === undefined || (Array.isArray(arts) && arts.every((id) => typeof id === "string" && id.length <= 150)),
      ),
      "Invalid artwork",
    );
    const player: ManualPlayer = {
      name: text(name, 40),
      connected: true,
      ready: false,
      mulligan: false,
      hand: [],
      deck: makeCards(deck.mainDeck, deck.mainDeckArts),
      eggDeck: makeCards(deck.eggDeck, deck.eggDeckArts),
      security: [],
      trash: [],
      reveal: [],
      battle: [],
      breeding: [],
    };
    shuffle(player.deck);
    shuffle(player.eggDeck);
    player.hand = player.deck.splice(0, 5);
    const seat = this.state.players.length as Seat;
    this.state.players.push(player);
    this.state.revision++;
    this.record(seat, "join", "");
    return seat;
  }

  setConnected(seat: Seat, connected: boolean): void {
    this.state.players[seat]!.connected = connected;
  }

  apply(seat: Seat, payload: unknown): void {
    ensure(payload && typeof payload === "object", "Invalid command");
    const command = payload as ManualCommand;
    ensure(command.revision === this.state.revision, "Table changed. Try again.");
    ensure(
      command.action && typeof command.action === "object" && typeof command.action.type === "string",
      "Invalid action",
    );
    const player = this.state.players[seat];
    ensure(player?.connected, "Seat is disconnected");
    ensure(this.state.phase !== "over" || command.action.type === "chat", "Match is over");
    const before = copy(this.state);
    const inspectionsBefore = [...this.inspections];
    const previousBefore = this.previous;
    try {
      const detail = this.act(seat, player, command.action);
      this.state.revision++;
      this.record(seat, command.action.type, detail);
      if (!["chat", "roll", "inspect", "undoRequest", "undoReply"].includes(command.action.type)) {
        this.previous = before.phase === "playing" ? before : null;
        this.state.undo = null;
        this.inspections = [null, null];
      }
    } catch (error) {
      this.state = before;
      this.inspections = inspectionsBefore;
      this.previous = previousBefore;
      throw error;
    }
  }

  snapshot(seat: Seat, roomCode: string): ManualSnapshot {
    const snapshot = copy(this.state);
    for (let owner = 0; owner < snapshot.players.length; owner++) {
      const player = snapshot.players[owner]!;
      for (const z of looseZones) {
        player[z] = player[z].map((card) => this.visibleCard(card, z, owner === seat));
      }
      for (const z of fieldZones)
        for (const stack of player[z]) {
          stack.cards = stack.cards.map((card) => this.visibleCard(card, z, owner === seat));
          stack.links = stack.links.map((card) => this.visibleCard(card, z, owner === seat));
        }
    }
    const inspectionZone = this.inspections[seat];
    return {
      ...snapshot,
      seat,
      roomCode,
      inspection: inspectionZone
        ? { zone: inspectionZone, cards: copy(this.state.players[seat]![inspectionZone]) }
        : null,
    };
  }

  private visibleCard(card: ManualCard, z: ManualZone, own: boolean): ManualCard {
    // No stable identifiers for hidden piles: shuffling must not expose their order.
    if (hiddenZones.has(z) && !card.faceUp) return { id: "", cardId: "", artId: "", faceUp: false };
    if (z === "hand" && !own && !card.faceUp) return { id: "", cardId: "", artId: "", faceUp: false };
    if (!card.faceUp && !own) return { ...card, cardId: "", artId: "" };
    return card;
  }

  private record(seat: Seat, action: string, detail: string): void {
    this.state.history.push({ id: ++this.historyId, seat, action, detail });
    this.state.history = this.state.history.slice(-150);
  }

  private findCard(player: ManualPlayer, id: unknown): { card: ManualCard; remove: () => void; zone: ManualZone } {
    ensure(typeof id === "string" && id.length <= 100, "Invalid card");
    for (const z of looseZones) {
      const index = player[z].findIndex((card) => card.id === id);
      if (index >= 0) {
        ensure(
          !hiddenZones.has(z) || this.inspections[this.state.players.indexOf(player)] === z || player[z][index]!.faceUp,
          "Inspect hidden pile before selecting a card",
        );
        return {
          card: player[z][index]!,
          remove: () => {
            player[z].splice(index, 1);
          },
          zone: z,
        };
      }
    }
    for (const z of fieldZones)
      for (const stack of player[z]) {
        for (const group of [stack.cards, stack.links]) {
          const index = group.findIndex((card) => card.id === id);
          if (index >= 0)
            return {
              card: group[index]!,
              zone: z,
              remove: () => {
                group.splice(index, 1);
                if (stack.cards.length === 0) {
                  // Remaining links become independent battle pieces; no physical card is lost.
                  for (const link of stack.links) this.put(player, link, z);
                  player[z].splice(player[z].indexOf(stack), 1);
                }
              },
            };
        }
      }
    throw new Error("Card does not belong to your seat");
  }

  private findStack(player: ManualPlayer, id: unknown): { stack: ManualStack; zone: ManualFieldZone } {
    ensure(typeof id === "string", "Invalid stack");
    for (const z of fieldZones) {
      const stack = player[z].find((item) => item.id === id);
      if (stack) return { stack, zone: z };
    }
    throw new Error("Stack does not belong to your seat");
  }

  private put(
    player: ManualPlayer,
    card: ManualCard,
    to: ManualZone,
    target?: string,
    placement: "top" | "bottom" | "link" = "top",
  ): void {
    ensure(zone(to), "Invalid destination");
    ensure(["top", "bottom", "link"].includes(placement), "Invalid placement");
    card.faceUp = !["deck", "eggDeck", "security", "hand"].includes(to);
    if (to === "battle" || to === "breeding") {
      if (target) {
        const found = this.findStack(player, target);
        ensure(found.zone === to, "Stack is in another zone");
        if (placement === "link") found.stack.links.push(card);
        else if (placement === "bottom") found.stack.cards.push(card);
        else found.stack.cards.unshift(card);
      } else {
        ensure(placement !== "link", "Choose a stack for the linked card");
        player[to].push({ id: randomUUID(), cards: [card], links: [], suspended: false, dp: 0, note: "" });
      }
    } else {
      ensure(!target && placement !== "link", "Invalid pile destination");
      if (placement === "bottom" || to === "hand" || to === "reveal") player[to].push(card);
      else player[to].unshift(card);
    }
  }

  private act(seat: Seat, player: ManualPlayer, action: ManualAction): string {
    if (action.type === "chat") return text(action.text, 300);
    if (action.type === "roll") return String(randomInt(1, 7));
    if (action.type === "concede") {
      ensure(this.state.players.length === 2, "Wait for an opponent");
      this.state.phase = "over";
      this.state.winner = (1 - seat) as Seat;
      return "";
    }
    if (action.type === "first") {
      ensure(this.state.phase === "setup" && integer(action.seat, 0, 1), "Choose first player during setup");
      ensure(!this.state.players.some((p) => p.ready), "Choose first player before ready");
      this.state.turn = action.seat;
      return String(action.seat);
    }
    if (action.type === "mulligan") {
      ensure(this.state.phase === "setup" && !player.ready && !player.mulligan, "Mulligan unavailable");
      player.deck.push(...player.hand);
      shuffle(player.deck);
      player.hand = player.deck.splice(0, 5);
      player.mulligan = true;
      return "";
    }
    if (action.type === "ready") {
      ensure(this.state.phase === "setup" && !player.ready, "Already ready");
      player.ready = true;
      if (this.state.players.length === 2 && this.state.players.every((p) => p.ready)) {
        for (const p of this.state.players) p.security = p.deck.splice(0, 5);
        this.state.phase = "playing";
      }
      return "";
    }
    ensure(this.state.phase === "playing", "Finish setup first");
    switch (action.type) {
      case "memory":
        ensure(integer(action.value, -10, 10), "Memory must be between -10 and 10");
        this.state.memory = action.value;
        return String(action.value);
      case "turn":
        ensure(integer(action.seat, 0, 1), "Invalid player");
        this.state.turn = action.seat;
        return String(action.seat);
      case "take": {
        ensure(
          looseZones.includes(action.from) &&
            zone(action.to) &&
            action.from !== action.to &&
            integer(action.count, 1, 50),
          "Invalid pile operation",
        );
        ensure(player[action.from].length >= action.count, "Not enough cards");
        ensure(action.bottom === undefined || typeof action.bottom === "boolean", "Invalid position");
        const cards = action.bottom
          ? player[action.from].splice(-action.count)
          : player[action.from].splice(0, action.count);
        // Preserve top-first order when placing a group at the top of a pile.
        if (!["battle", "breeding", "hand", "reveal"].includes(action.to)) cards.reverse();
        for (const card of cards) this.put(player, card, action.to);
        return `${action.count} ${action.from} → ${action.to}`;
      }
      case "move": {
        ensure(zone(action.to), "Invalid destination");
        const found = this.findCard(player, action.card);
        // Reject self-targeting of the last top card before removing the stack.
        if (action.target)
          ensure(
            !(
              this.findStack(player, action.target).stack.cards.length === 1 &&
              this.findStack(player, action.target).stack.cards[0]?.id === action.card
            ),
            "Card is already in that stack",
          );
        found.remove();
        this.put(player, found.card, action.to, action.target, action.placement);
        return `${found.zone} → ${action.to}`;
      }
      case "moveStack": {
        ensure(zone(action.to), "Invalid destination");
        const found = this.findStack(player, action.stack);
        ensure(action.target !== action.stack, "Choose another stack");
        player[found.zone].splice(player[found.zone].indexOf(found.stack), 1);
        if ((action.to === "battle" || action.to === "breeding") && !action.target) player[action.to].push(found.stack);
        else if (action.target) {
          const target = this.findStack(player, action.target);
          ensure(
            target.zone === action.to &&
              (action.placement === undefined || action.placement === "top" || action.placement === "bottom"),
            "Invalid stack placement",
          );
          if (action.placement === "bottom") target.stack.cards.push(...found.stack.cards);
          else target.stack.cards.unshift(...found.stack.cards);
          target.stack.links.push(...found.stack.links);
        } else {
          for (const card of [...found.stack.cards, ...found.stack.links].reverse())
            this.put(player, card, action.to, undefined, action.placement);
        }
        return `${found.zone} → ${action.to}`;
      }
      case "suspend": {
        ensure(typeof action.value === "boolean", "Invalid suspension");
        this.findStack(player, action.stack).stack.suspended = action.value;
        return action.value ? "suspended" : "active";
      }
      case "annotate": {
        ensure(
          integer(action.dp, -100000, 100000) && typeof action.note === "string" && action.note.length <= 120,
          "Invalid annotation",
        );
        const { stack } = this.findStack(player, action.stack);
        stack.dp = action.dp;
        stack.note = cleanText(action.note);
        return `${action.dp} DP ${stack.note}`;
      }
      case "shuffle":
        ensure(["deck", "eggDeck", "security"].includes(action.zone), "Invalid pile");
        shuffle(player[action.zone]);
        return action.zone;
      case "inspect":
        ensure(action.zone === null || ["deck", "eggDeck", "security"].includes(action.zone), "Invalid search zone");
        // A search deliberately unlocks that pile only for its owner. Close/shuffle explicitly.
        this.inspections[seat] = action.zone;
        return action.zone ?? "closed";
      case "flip": {
        ensure(typeof action.faceUp === "boolean", "Invalid card visibility");
        const { card, zone: z } = this.findCard(player, action.card);
        ensure(!["deck", "eggDeck"].includes(z), "Move deck cards to the reveal area first");
        card.faceUp = action.faceUp;
        return `${z} ${action.faceUp ? "face up" : "face down"}`;
      }
      case "attack": {
        this.findStack(player, action.stack);
        if (action.target) {
          const opponent = this.state.players[1 - seat]!;
          ensure(
            opponent.battle.some((s) => s.id === action.target),
            "Invalid attack target",
          );
        }
        return action.target ? "Digimon" : "security";
      }
      case "undoRequest":
        ensure(this.previous && !this.state.undo && this.state.players.length === 2, "Nothing to undo");
        this.state.undo = { seat, revision: this.state.revision + 1 };
        return "";
      case "undoReply": {
        ensure(
          typeof action.accept === "boolean" && this.state.undo && this.state.undo.seat !== seat && this.previous,
          "No opponent correction request",
        );
        if (action.accept) {
          const current = this.state;
          this.state = copy(this.previous);
          this.state.revision = current.revision;
          this.state.history = current.history;
          this.state.players.forEach((p, index) => {
            p.connected = current.players[index]!.connected;
          });
          this.previous = null;
          this.inspections = [null, null];
        }
        this.state.undo = null;
        return action.accept ? "accepted" : "declined";
      }
      default:
        throw new Error("Unknown manual action");
    }
  }
}
