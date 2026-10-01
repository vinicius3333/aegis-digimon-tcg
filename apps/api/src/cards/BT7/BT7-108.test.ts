import { describe, it, expect } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT7-108.js";
import "../BT12/BT12-024.js";
import "../BT12/BT12-066.js";
import "../ST1/ST1-12.js";
describe("BT7-108 Schwarz Lehrsatz", () => {
  it("deletes opposing level 5 or lower Digimon", async () => {
    const s = setupEngine(
      {
        0: { battleArea: ["BT7-067", "BT7-011"], hand: [{ card: "BT7-108", as: "option" }] },
        1: { battleArea: ["BT7-044"] },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 8;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[1]!.battleArea.length === 0);
    expect(s.state.players[1]!.battleArea).toHaveLength(0);
  });
});

describe("BT7-108 Schwarz Lehrsatz — KB Q&A rulings", () => {
  it("deletes one Digimon per [Hybrid] Digimon plus one per Tamer, not one per pair (Q1675)", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: ["BT12-024", "BT12-066", "ST1-12", "BT7-067"],
          hand: [{ card: "BT7-108", as: "option" }],
        },
        1: { battleArea: ["BT1-010", "BT1-010", "BT1-010", "BT1-010", "BT1-010"] },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 6;
    await s.ready();
    const optionId = s.inst("option").instanceId;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: optionId })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.trash.some((card) => card.instanceId === optionId));
    await settle();

    expect(s.state.players[1]!.trash).toHaveLength(3);
    expect(s.state.players[1]!.battleArea).toHaveLength(2);
  });
});
