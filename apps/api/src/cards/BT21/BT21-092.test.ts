import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./BT21-092.js";
import "../index.js";

describe("BT21-092 Can't Turn My Back!", () => {
  it("encodes stack transfer, counted reduction, color waiver, and Security play", () => {
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
    expect(compiled.effects.find((effect) => effect.trigger === "Main")?.actions).toMatchObject([
      {
        kind: "PlaceUnder",
        fromSelectedPermanentDigivolutionCards: true,
        position: "bottom",
        order: "any",
        trackCount: "placedXrosSources",
      },
      {
        kind: "PlayWithoutCost",
        payCost: true,
        from: ["hand"],
        reduceCostByScaling: { unit: "namedCount", countSource: "placedXrosSources" },
      },
    ]);
    expect(compiled.effects.find((effect) => effect.trigger === "Security")?.isSecurity).toBe(true);
  });

  it("moves only Digimon source cards under a Tamer and reduces the played card by that count", async () => {
    const setup = setupEngine(
      {
        0: {
          battleArea: [
            {
              card: "BT10-008",
              as: "xrosHost",
              under: [
                { card: "BT1-009", as: "digimonSourceA" },
                { card: "BT1-010", as: "digimonSourceB" },
                { card: "BT21-083", as: "tamerSource" },
              ],
            },
            { card: "BT21-083", as: "destination", under: [{ card: "BT21-082", as: "existing" }] },
          ],
          hand: [
            { card: "BT21-092", as: "option" },
            { card: "BT10-008", as: "playedXros" },
          ],
        },
      },
      { autoSelectCards: true, autoAcceptOptional: true },
    );
    setup.state.memory = 10;

    expect(
      setup.engine.applyIntent(0, {
        type: "playCard",
        instanceId: setup.inst("option").instanceId,
      }),
    ).toEqual({ ok: true });
    const playedId = setup.inst("playedXros").instanceId;
    await settle(() =>
      setup.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.instanceId === playedId),
    );

    expect(setup.perm("xrosHost").stack.map((card) => card.instanceId)).toEqual([setup.inst("tamerSource").instanceId]);
    expect(setup.perm("destination").stack.map((card) => card.instanceId)).toEqual([
      setup.inst("digimonSourceA").instanceId,
      setup.inst("digimonSourceB").instanceId,
      setup.inst("existing").instanceId,
    ]);
    // 10 - option cost 2 - (Shoutmon cost 4 - 2 placed Digimon cards) = 6.
    expect(setup.state.memory).toBe(6);
  });

  it("waives color with a Xros Heart Digimon and rejects the option without one", async () => {
    const allowed = setupEngine({
      0: {
        battleArea: [{ card: "BT10-008", as: "xros" }],
        hand: [{ card: "BT21-092", as: "option" }],
      },
    });
    allowed.state.memory = 2;
    await allowed.ready();
    expect(allowed.engine.applyIntent(0, { type: "playCard", instanceId: allowed.inst("option").instanceId })).toEqual({
      ok: true,
    });

    const rejected = setupEngine({ 0: { hand: [{ card: "BT21-092", as: "option" }] } });
    rejected.state.memory = 2;
    await rejected.ready();
    expect(
      rejected.engine.applyIntent(0, { type: "playCard", instanceId: rejected.inst("option").instanceId }),
    ).toEqual({ ok: false, reason: "color-requirement-unmet" });
  });

  it("Security plays a cost-5 Xros Heart Tamer from trash without paying cost", async () => {
    const setup = setupEngine(
      {
        0: { battleArea: [{ card: "BT21-032", as: "attacker", dp: 2000 }] },
        1: { security: [{ card: "BT21-092", as: "option" }], trash: [{ card: "BT10-087", as: "tamer" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    setup.state.memory = 0;
    await setup.ready();

    expect(
      setup.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: setup.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() =>
      setup.state.players[1]!.battleArea.some((p) => p.topCard.instanceId === setup.inst("tamer").instanceId),
    );
    expect(setup.state.players[1]!.battleArea[0]!.topCard.instanceId).toBe(setup.inst("tamer").instanceId);
    expect(setup.state.memory).toBe(0);
  });
});
