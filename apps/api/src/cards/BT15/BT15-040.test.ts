import { describe, expect, it } from "vitest";
import { getCardDefinition } from "@aegis/shared";
import { definitionMatches } from "../../engine/effects/interpreter.js";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "../index.js";
import { compiled } from "./BT15-040.js";
import { X_ANTIBODY_NAME_PROBES, xAntibodyNameGateVerdicts } from "../../engine/testkit/xAntibodyNameGate.js";

describe("BT15-040", () => {
  it("may play a Numemon or level 3 Digimon when the stack has Monzaemon/X Antibody", () =>
    expect(compiled.effects?.[0]).toMatchObject({
      trigger: "WhenDigivolving",
      actions: [
        {
          kind: "PlayWithoutCost",
          from: ["hand"],
          payCost: false,
          condition: { kind: "selfDigivolutionStackHasTrait" },
          optional: true,
        },
      ],
    }));

  it("matches Numemon by name without accepting a card that merely mentions Numemon", () => {
    const play = compiled.effects?.[0]?.actions[0];
    expect(play?.kind).toBe("PlayWithoutCost");
    if (play?.kind !== "PlayWithoutCost") throw new Error("BT15-040 play action is missing");

    expect(play.target.filter.or?.[0]?.nameOrTrait).toEqual([{ tokens: ["Numemon"], match: "nameExact" }]);
    expect(definitionMatches(play.target.filter, getCardDefinition("BT14-058")!)).toBe(true);
    expect(definitionMatches(play.target.filter, getCardDefinition("BT14-039")!)).toBe(false);
  });

  it("once per turn gives an opposing Digimon -2000 DP when another Digimon is played, scaled by your Digimon count", () =>
    expect(compiled.effects?.[1]).toMatchObject({
      trigger: "AllTurns",
      frequency: "OncePerTurn",
      actions: [
        {
          kind: "SubTrigger",
          event: "whenPlayed",
          actions: [{ kind: "ModifyDP", amount: -2000, scaling: { per: 1, unit: "cards" } }],
        },
      ],
    }));

  it("debuffs exactly one opponent by -2000 for each of your Digimon when another Digimon is played", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT15-040", as: "monzaemon" }],
          hand: [
            { card: "BT1-009", as: "other" },
            { card: "BT1-010", as: "nextTurnOther" },
          ],
          deck: ["BT1-009", "BT1-010"],
        },
        1: {
          battleArea: [
            { card: "BT1-009", dp: 7000, as: "chosen" },
            { card: "BT1-009", dp: 7000, as: "unchosen" },
          ],
          deck: ["BT1-009", "BT1-010"],
        },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("other").instanceId })).toEqual({ ok: true });
    await settle(() => s.perm("chosen").currentDP === 3000, 1_500);

    expect(s.perm("chosen").currentDP).toBe(3000);
    expect(s.perm("unchosen").currentDP).toBe(7000);

    await advance(s.engine).runTurn(0);
    s.state.turnSeat = 1;
    s.state.memory = 3;
    await advance(s.engine).runTurn(1);
    s.state.turnSeat = 0;
    s.state.memory = 3;
    const ownTurn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(0);
    const beforeSecondPlay = s.perm("chosen").currentDP;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("nextTurnOther").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.perm("chosen").currentDP === beforeSecondPlay - 6000, 1_500);
    expect(s.perm("chosen").currentDP).toBe(beforeSecondPlay - 6000);
    advance(s.engine).endMainPhaseIfOpen(0);
    await ownTurn;
  });
});

describe("BT15-040 [X Antibody] reference", () => {
  it("matches the X Antibody card name and its Rule aliases, not X Antibody-trait Digimon", () => {
    expect(xAntibodyNameGateVerdicts("BT15-040")).toEqual(X_ANTIBODY_NAME_PROBES);
  });
});

describe("BT15-040 Monzaemon (X Antibody) — KB Q&A rulings", () => {
  it("gives only 1 opposing Digimon the whole -2000 per Digimon, not -2000 each to 2 of them (Q2524)", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT15-040", as: "monzaemon" }],
          hand: [{ card: "BT1-009", as: "played" }],
        },
        1: {
          battleArea: [
            { card: "BT1-009", dp: 7000, as: "first" },
            { card: "BT1-009", dp: 7000, as: "second" },
          ],
        },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 5;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("played").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.perm("first").currentDP !== 7000 || s.perm("second").currentDP !== 7000, 1_500);

    expect(s.state.players[0]!.battleArea).toHaveLength(2);
    const debuffTargeting = s.decisions.filter(
      ({ seat, req }) => seat === 0 && req.kind === "chooseTargets" && req.sourceCardId === "BT15-040",
    );
    expect(debuffTargeting).toHaveLength(1);
    expect(debuffTargeting[0]!.req.options?.max).toBe(1);
    expect([s.perm("first").currentDP, s.perm("second").currentDP].sort((a, b) => a - b)).toEqual([3000, 7000]);
  });
});
