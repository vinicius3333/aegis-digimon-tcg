import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./EX2-021.js";
import "./EX2-023.js";
import "./EX2-014.js";
import "../BT4/BT4-104.js";
import "../BT1/BT1-102.js";

describe("EX2-021 Kyubimon", () => {
  it("adds a Plug-In Option from the top three when digivolving", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX2-019", as: "base" }],
          hand: [{ card: "EX2-021", as: "evolution" }],
          deck: [{ card: "EX2-066", as: "plugin" }, "BT1-001", "BT1-002"],
        },
      },
      { autoSelectCards: true, autoOrderTriggers: true },
    );
    s.state.memory = 10;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("evolution").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("plugin").instanceId));
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("plugin").instanceId)).toBe(true);
  });

  it("modifies one opposing Digimon only for cost-2 Options and only once per turn", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX2-023", as: "host", under: ["EX2-021"] }],
          hand: [
            { card: "BT4-104", as: "cheap" },
            { card: "BT1-102", as: "option1" },
            { card: "BT1-102", as: "option2" },
          ],
          security: ["BT1-001"],
        },
        1: { battleArea: [{ card: "EX2-014", as: "target" }] },
      },
      { autoSelectCards: true, autoOrderTriggers: true },
    );
    s.state.memory = 5;
    await s.ready();
    expect(s.perm("target").currentDP).toBe(4000);

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("cheap").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.trash.some((card) => card.cardId === "BT4-104"));
    expect(s.perm("target").currentDP).toBe(4000);

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option1").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.trash.filter((card) => card.cardId === "BT1-102").length === 1);
    expect(s.perm("target").currentDP).toBe(2000);

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option2").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.trash.filter((card) => card.cardId === "BT1-102").length === 2);
    expect(s.perm("target").currentDP).toBe(2000);
  });
});
