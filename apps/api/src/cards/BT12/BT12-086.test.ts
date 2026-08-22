import { describe, expect, it } from "vitest";
import { EffectTiming } from "@aegis/shared";
import type { CardSource } from "../../engine/effects/CardSource.js";
import { advance } from "../../engine/testkit/advance.js";
import { getEffectModule } from "../../engine/effects/registry.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "./BT12-086.js";

describe("BT12-086 handwritten module", () => {
  it("registers its printed OnPlay effect without declarative effect record", () => {
    const module = getEffectModule("BT12-086");
    expect(module?.cardId).toBe("BT12-086");
    const source = {
      instanceId: "source-086",
      cardId: "BT12-086",
      ownerSeat: 0,
      isOnBattleArea: () => true,
      isOwnersTurn: () => true,
      permanent: () => undefined,
    } as unknown as CardSource;
    expect(module!.effectsForTiming(EffectTiming.OnPlay, source).length).toBeGreaterThan(0);
  });
});

it("adds up to two differently colored Save Digimon from the reveal", async () => {
  const s = setupEngine({
    0: {
      hand: [{ card: "BT12-086", as: "clock" }],
      deck: ["BT12-008", "BT12-058", "BT1-009"],
    },
  }, { autoSelectCards: true, autoOrderCards: true });
  s.state.memory = 10;
  expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("clock").instanceId })).toEqual({ ok: true });
  await settle(() => s.state.players[0]!.hand.length >= 2);
  expect(s.state.players[0]!.hand.map(({ cardId }) => cardId)).toEqual(
    expect.arrayContaining(["BT12-008", "BT12-058"]),
  );
});

it("does not add two same-colored Save Digimon", async () => {
  const s = setupEngine(
    {
      0: {
        hand: [{ card: "BT12-086", as: "clock" }],
        deck: ["BT12-058", "BT12-060", "BT1-009"],
      },
    },
    { autoSelectCards: true, autoOrderCards: true },
  );
  s.state.memory = 10;
  expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("clock").instanceId })).toEqual({ ok: true });
  await settle(() => s.state.players[0]!.hand.length >= 2);
  expect(s.state.players[0]!.hand.filter(({ cardId }) => ["BT12-058", "BT12-060"].includes(cardId))).toHaveLength(1);
});

it("grants Jamming to a Save-text host", async () => {
  const s = setupEngine({ 0: { battleArea: [{ card: "BT12-077", as: "host", under: ["BT12-086"] }] } });
  await s.ready();
  expect(observe(s.engine).hasKeyword(s.perm("host"), "Jamming")).toBe(true);
});

it("saves itself under a Tamer on deletion", async () => {
  const s = setupEngine(
    { 0: { battleArea: [{ card: "BT12-086", as: "clock" }, { card: "BT12-094", as: "tamer" }] } },
    { autoAcceptOptional: true, autoSelectCards: true },
  );
  const sourceId = s.perm("clock").topCard!.instanceId;
  await s.ready();
  await advance(s.engine).verb.deletePermanent([s.perm("clock").permanentId]);
  await settle(() => s.perm("tamer").stack.some(({ instanceId }) => instanceId === sourceId));
  expect(s.perm("tamer").stack.some(({ instanceId }) => instanceId === sourceId)).toBe(true);
});
