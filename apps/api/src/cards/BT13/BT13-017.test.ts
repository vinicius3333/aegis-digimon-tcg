import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT13-017.js";

describe("BT13-017 Jesmon", () => {
  it("on play adds 2000 to its deletion budget for each other allied Digimon", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT1-012", as: "allyA" }, { card: "BT1-015", as: "allyB" }], hand: [{ card: "BT13-017", as: "jesmon" }] },
        1: { battleArea: [{ card: "BT1-024", as: "tenK" }] },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 20;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("jesmon").instanceId })).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.battleArea.length === 0);

    const tooLarge = setupEngine(
      { 0: { battleArea: [{ card: "BT1-012" }, { card: "BT1-015" }], hand: [{ card: "BT13-017", as: "jesmon" }] }, 1: { battleArea: [{ card: "BT1-025", as: "target" }] } },
      { autoSelectCards: true },
    );
    tooLarge.state.memory = 20;
    await tooLarge.ready();
    expect(tooLarge.engine.applyIntent(0, { type: "playCard", instanceId: tooLarge.inst("jesmon").instanceId })).toEqual({ ok: true });
    await settle();
    expect(tooLarge.state.players[1]!.battleArea).toHaveLength(1);
  });

  it("when digivolving applies the same scaled deletion budget", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT13-016", as: "base" }, { card: "BT1-012", as: "ally" }], hand: [{ card: "BT13-017", as: "jesmon" }] },
        1: { battleArea: [{ card: "BT1-021", as: "sevenK" }] },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "digivolve", permanentId: s.perm("base").permanentId, instanceId: s.inst("jesmon").instanceId })).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.battleArea.length === 0);

    const tooLarge = setupEngine(
      { 0: { battleArea: [{ card: "BT13-016", as: "base" }, { card: "BT1-012" }], hand: [{ card: "BT13-017", as: "jesmon" }] }, 1: { battleArea: [{ card: "BT1-059" }] } },
      { autoSelectCards: true },
    );
    tooLarge.state.memory = 10;
    await tooLarge.ready();
    expect(tooLarge.engine.applyIntent(0, { type: "digivolve", permanentId: tooLarge.perm("base").permanentId, instanceId: tooLarge.inst("jesmon").instanceId })).toEqual({ ok: true });
    await settle();
    expect(tooLarge.state.players[1]!.battleArea).toHaveLength(1);
  });

  it("gives all allied Digimon +1000 DP for each other Sistermon or Royal Knight", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT13-017", as: "jesmon" }, { card: "BT6-082", as: "sistermon" }, { card: "BT13-040", as: "royalKnight" }, { card: "BT1-012", as: "other" }],
      },
    });
    const baseDp = new Map(["jesmon", "sistermon", "royalKnight", "other"].map((alias) => [alias, s.perm(alias).currentDP]));
    await s.ready();

    for (const alias of baseDp.keys()) expect(s.perm(alias).currentDP).toBe(baseDp.get(alias)! + 2000);
  });
});
