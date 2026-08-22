import { describe, expect, it } from "vitest";
import { EffectTiming } from "@aegis/shared";
import type { CardSource } from "../../engine/effects/CardSource.js";
import { getEffectModule } from "../../engine/effects/registry.js";
import { settle, setupEngine } from "../../engine/testkit/harness.js";
import "./BT12-045.js";

describe("BT12-045 handwritten module", () => {
  it("registers its printed timing without declarative effect record", () => {
    const module = getEffectModule("BT12-045");
    expect(module?.cardId).toBe("BT12-045");
    const source = {
      instanceId: "source-045",
      cardId: "BT12-045",
      ownerSeat: 0,
      isOnBattleArea: () => true,
      isOwnersTurn: () => true,
      permanent: () => undefined,
    } as unknown as CardSource;
    expect(module!.effectsForTiming(EffectTiming.OnPlay, source).length).toBeGreaterThan(0);
  });
});

it("adds a revealed green Digimon to hand", async () => {
  const s = setupEngine({
    0: { hand: [{ card: "BT12-045", as: "ebi" }], deck: [{ card: "BT1-064", as: "greenDigimon" }, "BT1-009"] },
  }, { autoSelectCards: true });
  await s.ready();
  s.state.memory = 3;
  expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("ebi").instanceId })).toEqual({ ok: true });
  await settle(() => s.state.players[0]!.hand.some(({ instanceId }) => instanceId === s.inst("greenDigimon").instanceId));
  expect(s.state.players[0]!.hand.some(({ instanceId }) => instanceId === s.inst("greenDigimon").instanceId)).toBe(true);
});

it("bottoms a revealed non-green Digimon instead of adding it", async () => {
  const s = setupEngine({
    0: { hand: [{ card: "BT12-045", as: "ebi" }], deck: [{ card: "BT1-009", as: "notGreen" }, "BT1-010"] },
  }, { autoSelectCards: true });
  await s.ready();
  s.state.memory = 3;
  expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("ebi").instanceId })).toEqual({ ok: true });
  await settle(() => {
    const bottom = s.state.players[0]!.deck.at(-1);
    return bottom?.instanceId === s.inst("notGreen").instanceId && bottom.faceUp === false;
  });
  expect(s.state.players[0]!.hand.some(({ instanceId }) => instanceId === s.inst("notGreen").instanceId)).toBe(false);
  expect(s.state.players[0]!.deck.at(-1)?.instanceId).toBe(s.inst("notGreen").instanceId);
});
