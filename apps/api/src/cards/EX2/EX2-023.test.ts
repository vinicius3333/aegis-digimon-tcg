import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./EX2-023.js";
import "../BT1/BT1-108.js";
import "../BT1/BT1-109.js";

describe("EX2-023 Taomon", () => {
  it("plays Rika Nonaka from hand without paying her cost when digivolving", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX2-021", as: "base" }],
          hand: [
            { card: "EX2-023", as: "evolution" },
            { card: "EX2-060", as: "rika" },
          ],
        },
      },
      { autoSelectCards: true, autoAcceptOptional: true, autoOrderTriggers: true },
    );
    s.state.memory = 10;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("evolution").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() =>
      s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.instanceId === s.inst("rika").instanceId),
    );
    expect(
      s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.instanceId === s.inst("rika").instanceId),
    ).toBe(true);
  });

  it("triggers its inherited Option effect only after a cost-2 use", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX2-029", as: "host", under: ["EX2-023"] }],
          hand: [
            { card: "BT1-108", as: "cheap" },
            { card: "BT1-109", as: "option1" },
            { card: "BT1-109", as: "option2" },
          ],
          deck: ["BT1-001"],
        },
        1: { battleArea: [{ card: "EX2-014", as: "target" }], deck: ["BT1-001"] },
      },
      { autoSelectCards: true, autoOrderTriggers: true },
    );
    s.state.memory = 5;
    await s.ready();
    expect(s.perm("target").currentDP).toBe(4000);
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("cheap").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.trash.some((card) => card.cardId === "BT1-108"));
    expect(s.perm("target").currentDP).toBe(4000);
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option1").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.trash.filter((card) => card.cardId === "BT1-109").length === 1);
    expect(s.perm("target").currentDP).toBe(2000);
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option2").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.trash.filter((card) => card.cardId === "BT1-109").length === 2);
    expect(s.perm("target").currentDP).toBe(2000);
    const turnLoop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    advance(s.engine).endMainPhaseIfOpen(0);
    await advance(s.engine).waitForMainPhase(1);
    expect(s.perm("target").currentDP).toBe(4000);
    expect(s.engine.applyIntent(1, { type: "surrender" })).toEqual({ ok: true });
    await turnLoop;
  });
});
