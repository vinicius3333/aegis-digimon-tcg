import fixture from "./boltmon-assembly-flame-materials.fixture.js";
import { fixtureInstanceId } from "../scenario/references.js";
import { Phase } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import "../../cards/index.js";
import { layScenarioFixture } from "../scenario/fixture.js";
import { BLUE_DECK, RED_DECK } from "../testDecks.js";
import { advance } from "../testkit/advance.js";
import { setupEngine, settle } from "../testkit/harness.js";

async function mainPhase() {
  const s = setupEngine({ 0: {}, 1: {} }, { autoDeclineOptional: true });
  layScenarioFixture(s.state, fixture, [BLUE_DECK, RED_DECK], true);
  s.engine.startTurnLoop();
  await settle(() => s.state.phase === Phase.Breeding);
  expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
  await advance(s.engine).waitForMainPhase(0);
  return s;
}

const flameMaterials = [
  "boltmon-nso-skullmeramon-card",
  "boltmon-bt27-skullmeramon-card",
  "boltmon-cs-skullmeramon-card",
  "boltmon-rule-flame-solarmon-card",
].map(fixtureInstanceId);

describe("Boltmon Assembly counts only [Flame] trait Digimon cards", () => {
  it("rejects a [CS] Devimon as the fifth material and accepts a Rule-trait [Flame] Solarmon", async () => {
    const s = await mainPhase();
    const playWith = (materialInstanceIds: string[]) =>
      s.engine.applyIntent(0, {
        type: "playCard",
        instanceId: fixtureInstanceId("boltmon-card"),
        assembly: { materialInstanceIds },
      });

    expect(playWith([...flameMaterials, fixtureInstanceId("boltmon-cs-devimon-card")])).toEqual({
      ok: false,
      reason: "invalid-material",
    });
    expect(playWith([...flameMaterials, fixtureInstanceId("boltmon-fifth-flame-card")])).toEqual({ ok: true });
    await settle(() =>
      s.state.players[0]!.battleArea.some(({ topCard }) => topCard.instanceId === fixtureInstanceId("boltmon-card")),
    );
    const boltmon = s.state.players[0]!.battleArea.find(
      ({ topCard }) => topCard.instanceId === fixtureInstanceId("boltmon-card"),
    )!;
    expect(boltmon.stack.map(({ instanceId }) => instanceId).sort()).toEqual(
      [...flameMaterials, fixtureInstanceId("boltmon-fifth-flame-card")].sort(),
    );
    expect(s.state.players[0]!.trash.map(({ instanceId }) => instanceId)).toEqual([
      fixtureInstanceId("boltmon-cs-devimon-card"),
    ]);
  });
});
