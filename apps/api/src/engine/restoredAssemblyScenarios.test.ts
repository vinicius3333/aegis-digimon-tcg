import { Phase } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import "../cards/index.js";
import { layDevScenario, type DevScenarioId } from "./devScenario.js";
import { BLUE_DECK, RED_DECK } from "./testDecks.js";
import { advance } from "./testkit/advance.js";
import { setupEngine, settle } from "./testkit/harness.js";

async function mainPhaseIn(scenarioId: DevScenarioId) {
  const s = setupEngine({ 0: {}, 1: {} }, { autoDeclineOptional: true });
  layDevScenario(scenarioId, s.state, [BLUE_DECK, RED_DECK]);
  s.engine.startTurnLoop();
  await settle(() => s.state.phase === Phase.Breeding);
  expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
  await advance(s.engine).waitForMainPhase(0);
  expect(s.state.memory).toBe(0);
  return s;
}

describe("Assembly recipes restored from the official images (arena scenarios)", () => {
  it("plays BT24-062 MasterBlimpmon with its alternative [TS] Tamer recipe", async () => {
    const s = await mainPhaseIn("arena-bt24-masterblimpmon-assembly");
    const playWith = (materialInstanceIds: string[]) =>
      s.engine.applyIntent(0, {
        type: "playCard",
        instanceId: "dev-masterblimpmon",
        assembly: { materialInstanceIds },
      });

    expect(playWith(["dev-masterblimpmon-ts-digimon"])).toEqual({ ok: false, reason: "invalid-material" });
    expect(playWith(["dev-masterblimpmon-ts-tamer"])).toEqual({ ok: true });
    await settle(() =>
      s.state.players[0]!.battleArea.some(({ topCard }) => topCard.instanceId === "dev-masterblimpmon"),
    );
    const masterBlimpmon = s.state.players[0]!.battleArea.find(
      ({ topCard }) => topCard.instanceId === "dev-masterblimpmon",
    )!;
    expect(masterBlimpmon.stack.map(({ instanceId }) => instanceId)).toEqual(["dev-masterblimpmon-ts-tamer"]);
    await settle(() => s.state.turnSeat === 1);
    expect(s.state.memory).toBe(5);
  });

  it("plays BT22-078 Boltmon only with five different card numbers", async () => {
    const s = await mainPhaseIn("arena-bt22-boltmon-assembly");
    const distinct = ["BT11-084", "BT15-009", "BT15-015", "BT15-069", "BT18-030"].map(
      (cardId) => `dev-boltmon-${cardId}`,
    );
    const playWith = (materialInstanceIds: string[]) =>
      s.engine.applyIntent(0, { type: "playCard", instanceId: "dev-boltmon", assembly: { materialInstanceIds } });

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: "dev-boltmon" })).toEqual({
      ok: false,
      reason: "insufficient-memory",
    });
    expect(playWith([...distinct.slice(0, 4), "dev-boltmon-repeated-number"])).toEqual({
      ok: false,
      reason: "invalid-material",
    });
    expect(playWith(distinct)).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some(({ topCard }) => topCard.instanceId === "dev-boltmon"));
    await settle(() => s.state.turnSeat === 1);
    expect(s.state.memory).toBe(6);
  });
});
