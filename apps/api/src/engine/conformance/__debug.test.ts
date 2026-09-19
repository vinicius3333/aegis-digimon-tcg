import { writeFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { setupEngine as setup, makeInstance as instance, makeDigimon as digimon, settle } from "../testkit/harness.js";
import "../../cards/index.js";

function layBurstScenario() {
  const s = setup({ autoSelectCards: true });
  const p0 = s.state.players[0]!;
  const base = digimon(0, 9000, "BT4-020");
  p0.battleArea.push(base);
  const marcus = digimon(0, 0, "BT12-092");
  p0.battleArea.push(marcus);
  const burstCard = instance("BT13-020", 0, false);
  p0.hand.push(burstCard);
  s.state.memory = -10;
  return { s, p0, base, marcus, burstCard };
}

describe("debug burst pair", () => {
  it("first", async () => {
    const { s, base, burstCard } = layBurstScenario();
    s.engine.applyIntent(0, { type: "digivolve", permanentId: base.permanentId, instanceId: burstCard.instanceId, useAlternateCost: true });
    await settle(() => base.topCard?.cardId === "BT13-020");
    expect(base.stack.some((c) => c.cardId === "BT4-020")).toBe(true);
  });

  it("second", async () => {
    const { s, p0, base, burstCard } = layBurstScenario();
    const priorTopId = base.topCard!.instanceId;
    const retainedSource = instance("BT1-009", 0, false);
    base.stack.push(retainedSource);
    s.state.memory = 3;
    await s.ready();
    const result = s.engine.applyIntent(0, { type: "digivolve", permanentId: base.permanentId, instanceId: burstCard.instanceId, useAlternateCost: true });
    await settle(() => base.topCard?.cardId === "BT13-020", 3000).catch(() => {});
    writeFileSync("/tmp/dbg.json", JSON.stringify({
      result, memory: s.state.memory, top: base.topCard?.cardId,
      stack: base.stack.map((c) => c.cardId + "/" + c.instanceId),
      priorTopId, retained: retainedSource.instanceId,
      battle: p0.battleArea.map((p) => p.topCard?.cardId + "/" + p.permanentId),
      basePerm: base.permanentId,
      hand: p0.hand.map((c) => c.cardId),
    }, null, 1));
    expect(true).toBe(true);
  });
});
