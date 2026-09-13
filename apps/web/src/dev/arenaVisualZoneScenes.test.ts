// @vitest-environment jsdom
import { CardKind, getCardDefinition, type CardInstance, type GameState, type Permanent } from "@aegis/shared";
import { beforeEach, expect, it } from "vitest";
import { snapshotGameState } from "../net/presentedState";
import { createArenaDemoState } from "./ArenaDemo";
import {
  ARENA_VISUAL_ZONE_KEYWORDS,
  applyArenaVisualZoneScene,
  prepareArenaVisualZoneScene,
  type ArenaVisualZoneContext,
} from "./arenaVisualZoneScenes";
import type { DemoKeyword } from "./arenaDemoKeywords";

beforeEach(() => window.history.replaceState(null, "", "/dev/arena?hand=20&opponentHand=20"));

function permanentCards(permanent: Permanent): CardInstance[] {
  return [...(permanent.topCard ? [permanent.topCard] : []), ...permanent.stack, ...permanent.linked];
}

function visibleCards(state: GameState): CardInstance[] {
  return state.players.flatMap((player) => [
    ...player.hand,
    ...player.trash,
    ...player.delayZone,
    ...player.battleArea.flatMap(permanentCards),
    ...(player.breeding ? permanentCards(player.breeding) : []),
  ]);
}

function inventory(state: GameState): string[] {
  const cards = visibleCards(state);
  expect(new Set(cards.map((card) => card.instanceId)).size).toBe(cards.length);
  return cards.map((card) => `${card.instanceId}:${card.cardId}:${card.ownerSeat}`).sort();
}

function fixture(keyword: DemoKeyword, seed?: (state: GameState) => void) {
  const manual = createArenaDemoState([1, 1]);
  const unchanged = snapshotGameState(manual);
  const state = snapshotGameState(manual);
  seed?.(state);
  const own = state.players[0]!;
  const opp = state.players[1]!;
  const actor = own.battleArea[0]!;
  const frames: {
    before: GameState;
    after: GameState;
    atMs: number;
    events: Parameters<ArenaVisualZoneContext["stage"]>[3];
  }[] = [];
  const context: ArenaVisualZoneContext = {
    keyword,
    state,
    actor,
    own,
    opp,
    portuguese: false,
    stage(atMs, _pt, _en, events, change) {
      const before = snapshotGameState(state);
      change?.();
      frames.push({ before, after: snapshotGameState(state), atMs, events });
    },
  };
  return { manual, unchanged, state, actor, own, opp, context, frames };
}

it.each(ARENA_VISUAL_ZONE_KEYWORDS)(
  "moves existing public copies without duplicating cards or leaking hidden identities for %s",
  (keyword) => {
    const scene = fixture(keyword);
    const original = inventory(scene.state);
    const counts = scene.state.players.map((player) => [player.deckCount, player.eggDeckCount, player.securityCount]);
    prepareArenaVisualZoneScene(scene.context);
    expect(inventory(scene.state)).toEqual(original);
    expect(applyArenaVisualZoneScene(scene.context)).toBe(true);
    expect(scene.frames.length).toBeGreaterThan(0);
    let lastTime = 0;
    for (const frame of scene.frames) {
      expect(frame.atMs).toBeGreaterThan(lastTime);
      lastTime = frame.atMs;
      for (const state of [frame.before, frame.after]) {
        expect(inventory(state)).toEqual(original);
        expect(state.players[1]!.hand).toHaveLength(0);
        expect(state.players[1]!.handCount).toBe(21);
        expect(state.players.map((player) => [player.deckCount, player.eggDeckCount, player.securityCount])).toEqual(
          counts,
        );
        expect(state.pendingDecision).toBeUndefined();
        expect(state.combatWindow).toBeUndefined();
      }
      const known = new Map(visibleCards(frame.before).map((card) => [card.instanceId, card.cardId]));
      for (const event of frame.events.filter((candidate) => candidate.kind === "cardsMoved")) {
        expect(event.cardIds).toEqual(event.instanceIds.map((id) => known.get(id)));
      }
    }
    expect(snapshotGameState(scene.manual)).toEqual(scene.unchanged);
  },
);

it.each(["Save", "MaterialSave"] as const)(
  "saves the same %s copy under a Tamer only after an opponent battle deletion",
  (keyword) => {
    const scene = fixture(keyword);
    const saved = keyword === "Save" ? scene.actor.topCard! : scene.actor.stack.at(-1)!;
    const savedId = saved.instanceId;
    prepareArenaVisualZoneScene(scene.context);
    applyArenaVisualZoneScene(scene.context);
    expect(scene.frames[0]!.events[0]).toMatchObject({
      kind: "attackDeclared",
      seat: 1,
      target: { kind: "permanent", permanentId: "you-chronomon" },
    });
    expect(
      scene.frames[1]!.after.players[0]!.battleArea.some((permanent) => permanent.permanentId === "you-chronomon"),
    ).toBe(false);
    expect(scene.frames[1]!.after.players[0]!.trash.some((card) => card.instanceId === savedId)).toBe(true);
    const tamer = scene.own.battleArea.find(
      (permanent) => !!getCardDefinition(permanent.topCard!.cardId)?.kinds.includes(CardKind.Tamer),
    )!;
    expect(tamer.stack[0]?.instanceId).toBe(savedId);
    expect(scene.own.trash.some((card) => card.instanceId === savedId)).toBe(false);
  },
);

it("pays a Digi-Burst source while retaining its permanent and top card", () => {
  const scene = fixture("DigiBurst");
  const topId = scene.actor.topCard!.instanceId;
  const sourceId = scene.actor.stack.at(-1)!.instanceId;
  applyArenaVisualZoneScene(scene.context);
  expect(scene.actor.stack).toHaveLength(3);
  expect(scene.actor.topCard!.instanceId).toBe(topId);
  expect(scene.own.trash.at(-1)!.instanceId).toBe(sourceId);
  expect(scene.frames[0]!.events[0]).toMatchObject({ kind: "effectTriggered", seat: 0 });
});

it("pays a visible Detach link after an incoming attack without deleting the host", () => {
  const scene = fixture("Detach");
  const linkedId = scene.actor.stack.at(-1)!.instanceId;
  prepareArenaVisualZoneScene(scene.context);
  expect(scene.actor.linked[0]!.instanceId).toBe(linkedId);
  applyArenaVisualZoneScene(scene.context);
  expect(scene.actor.linked).toHaveLength(0);
  expect(scene.own.trash.at(-1)!.instanceId).toBe(linkedId);
  expect(scene.own.battleArea.includes(scene.actor)).toBe(true);
});

it("links an actual own hand card and updates the matching public hand count", () => {
  const scene = fixture("Link");
  const linkedId = scene.own.hand[0]!.instanceId;
  applyArenaVisualZoneScene(scene.context);
  expect(scene.actor.linked[0]!.instanceId).toBe(linkedId);
  expect(scene.own.hand).toHaveLength(20);
  expect(scene.own.handCount).toBe(20);
});

it("moves a Tamer into the link slot and trashes its other cards without losing any copies", () => {
  const scene = fixture("Mind Link", (state) => {
    state.players[0]!.battleArea[2]!.stack.push(...state.players[0]!.battleArea[0]!.stack.splice(0, 2));
  });
  const original = inventory(scene.state);
  const tamerId = scene.own.battleArea[2]!.topCard!.instanceId;
  const sourceIds = scene.own.battleArea[2]!.stack.map((card) => card.instanceId);
  applyArenaVisualZoneScene(scene.context);
  expect(scene.own.battleArea).toHaveLength(2);
  expect(scene.actor.linked[0]!.instanceId).toBe(tamerId);
  expect(scene.own.trash.map((card) => card.instanceId)).toEqual(expect.arrayContaining(sourceIds));
  expect(inventory(scene.state)).toEqual(original);
});

it.each([
  ["Armor Purge", 0, "BT26-015"],
  ["DeDigivolve", 1, "BT26-074"],
] as const)("promotes the most recent source for %s while retaining the permanent ID", (keyword, seat, promotedId) => {
  const scene = fixture(keyword);
  const target = scene.state.players[seat]!.battleArea[0]!;
  const oldTopId = target.topCard!.instanceId;
  const permanentId = target.permanentId;
  prepareArenaVisualZoneScene(scene.context);
  applyArenaVisualZoneScene(scene.context);
  expect(target.permanentId).toBe(permanentId);
  expect(target.topCard!.cardId).toBe(promotedId);
  expect(target.stack).toHaveLength(3);
  expect(target.currentDP).toBe(getCardDefinition(promotedId)!.dp);
  expect(scene.state.players[seat]!.trash.at(-1)!.instanceId).toBe(oldTopId);
  expect(scene.frames[0]!.events[0]).toMatchObject(
    keyword === "Armor Purge" ? { kind: "attackDeclared", seat: 1 } : { kind: "effectTriggered", seat: 0 },
  );
});

it("leaves unsupported families untouched for the main scene dispatcher", () => {
  const scene = fixture("Blocker");
  const original = snapshotGameState(scene.state);
  prepareArenaVisualZoneScene(scene.context);
  expect(applyArenaVisualZoneScene(scene.context)).toBe(false);
  expect(scene.frames).toHaveLength(0);
  expect(snapshotGameState(scene.state)).toEqual(original);
});
