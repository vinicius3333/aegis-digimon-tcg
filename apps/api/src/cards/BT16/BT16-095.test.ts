import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./BT16-095.js";

describe("BT16-095", () => {
  it("suspends two opposing Digimon and bottom-decks all tied lowest-DP suspended Digimon", () => {
    expect(compiled.effects?.[0]).toMatchObject({ trigger: "Main" });
    expect(compiled.effects?.[0]?.actions?.[0]).toMatchObject({ kind: "Suspend", target: { count: 2 } });
    expect(compiled.effects?.[0]?.actions?.[1]).toMatchObject({
      kind: "Return",
      to: "deckBottom",
      target: { count: "all", filter: { suspended: true, superlative: "lowestDP" } },
    });
  });

  it("gives your Digimon 3000 DP and activates its Main effect from security", () => {
    expect(compiled.effects?.[0]?.actions?.[2]).toMatchObject({
      kind: "ModifyDP",
      amount: 3000,
      duration: "untilOpponentTurnEnd",
      target: { count: "all" },
    });
    expect(compiled.effects?.[1]).toMatchObject({
      trigger: "Security",
      isSecurity: true,
      actions: [{ kind: "ActivateMain" }],
    });
  });

  it("suspends two opposing Digimon, bottoms tied lowest DP, and buffs yours", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "BT16-095", as: "shine" }],
          battleArea: [
            { card: "BT16-039", as: "color" },
            { card: "BT16-050", as: "ally", dp: 3000 },
          ],
        },
        1: {
          battleArea: [
            { card: "BT16-050", as: "lowOne", dp: 4000 },
            { card: "BT16-050", as: "lowTwo", dp: 4000 },
            { card: "BT16-050", as: "high", dp: 6000 },
          ],
        },
      },
      { autoSelectCards: true },
    );
    await s.ready();
    s.state.memory = 10;
    expect(
      s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("shine").instanceId, useAs: "option" } as never),
    ).toEqual({ ok: true });
    await settle(() => s.perm("ally").currentDP === 6000);
    expect(s.state.players[1]?.deck).toHaveLength(2);
    expect(s.perm("ally").currentDP).toBe(6000);
    expect(s.state.players[1]?.battleArea).toHaveLength(1);
  });
});
