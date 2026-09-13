import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { compiled } from "./BT22-062.js";

describe("BT22-062 MetalTyrannomon (X Antibody)", () => {
  it("requires a non-X Antibody Tyrannomon and gates the digivolving restriction on the stack", () => {
    expect(compiled.digivolutionRequirement).toEqual([
      { level: 4, colors: ["Black"], cost: 4, isAlternate: false },
      { level: 4, colors: ["Green"], cost: 4, isAlternate: false },
      { level: 5, names: ["Tyrannomon"], excludeTraits: ["X Antibody"], cost: 1, isAlternate: true },
    ]);
    expect(compiled.digivolutionRequirement).toContainEqual({
      level: 5,
      names: ["Tyrannomon"],
      excludeTraits: ["X Antibody"],
      cost: 1,
      isAlternate: true,
    });

    const whenDigivolving = compiled.effects.find((entry) => entry.trigger === "WhenDigivolving");
    expect(whenDigivolving?.actions[0]).toMatchObject({
      kind: "ModifyDP",
      amount: 4000,
      duration: "untilOpponentTurnEnd",
      target: { filter: { isSelfRef: true }, isSelf: true },
    });
    expect(whenDigivolving?.actions[1]).toMatchObject({
      kind: "Restrict",
      restriction: "digivolve",
      duration: "untilOpponentTurnEnd",
      target: { filter: { controller: "opponent", kind: ["Digimon"] }, count: 1 },
      condition: {
        kind: "selfDigivolutionStackHasTrait",
        filter: {
          nameOrTrait: [
            { tokens: ["MetalTyrannomon"], match: "name" },
            { tokens: ["X Antibody"], match: "trait" },
          ],
        },
      },
    });
  });

  it("lets the opponent optionally choose one of their Digimon to attack", () => {
    const inherited = compiled.effects.find((entry) => entry.isInherited);
    expect(inherited).toMatchObject({ trigger: "EndOfOpponentsTurn", frequency: "OncePerTurn" });
    expect(inherited?.actions[0]).toMatchObject({
      kind: "Attack",
      optional: true,
      drainTimingWindowDuringAttack: true,
      target: {
        filter: { controller: "opponent", kind: ["Digimon"] },
        count: 1,
        chooser: "opponent",
      },
    });
  });

  it("publicly makes the opponent's chosen unsuspended Digimon attack at their turn end", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT22-065", as: "host", under: ["BT22-062"] }],
          security: ["BT1-010", "BT1-010", "BT1-010"],
        },
        1: {
          battleArea: [
            { card: "BT1-009", as: "chosen", dp: 20000 },
            { card: "BT1-010", as: "other", dp: 20000 },
          ],
        },
      },
      { autoSelectCards: true, autoAcceptOptional: true, preferInstanceIds: preferred },
    );
    preferred.push(s.perm("chosen").topCard!.instanceId);
    s.state.turnSeat = 1;
    await s.ready();
    const turn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(1);
    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("other").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => !observe(s.engine).isAttacking());
    advance(s.engine).endMainPhaseIfOpen(1);
    await turn;

    expect(s.perm("chosen").isSuspended).toBe(true);
    expect(s.perm("other").isSuspended).toBe(true);
    expect(s.state.players[0]!.security).toHaveLength(1);
    expect(s.state.players[0]!.trash.filter((card) => card.cardId === "BT1-010")).toHaveLength(2);
    expect(observe(s.engine).isAttacking()).toBe(false);
  });

  it("offers the optional attack, then allows refusal while leaving legal and suspended candidates unchanged", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT22-065", as: "host", under: ["BT22-062"] }] },
        1: { battleArea: [{ card: "BT1-009", as: "legal" }] },
      },
      { autoSelectCards: true, autoDeclineOptional: true },
    );
    s.state.turnSeat = 1;
    await s.ready();
    await advance(s.engine).runTurn(1);

    expect(s.decisions.some(({ req }) => req.kind === "optional" && req.sourceCardId === "BT22-062")).toBe(true);
    expect(s.perm("legal").isSuspended).toBe(false);
    expect(observe(s.engine).isAttacking()).toBe(false);
  });

  it("does not create an attack choice when every opponent Digimon is already suspended", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT22-065", as: "host", under: ["BT22-062"] }] },
        1: { battleArea: [{ card: "BT1-009", as: "suspended" }] },
      },
      { autoSelectCards: true, autoAcceptOptional: true },
    );
    s.state.turnSeat = 1;
    await s.ready();
    const turn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(1);
    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("suspended").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => !observe(s.engine).isAttacking());
    advance(s.engine).endMainPhaseIfOpen(1);
    await turn;

    expect(s.decisions.some(({ req }) => req.kind === "optional" && req.sourceCardId === "BT22-062")).toBe(false);
    expect(s.perm("suspended").isSuspended).toBe(true);
    expect(observe(s.engine).isAttacking()).toBe(false);
  });

  it("pays 1 from MetalTyrannomon, gains 4000 DP, and locks an opponent's evolution", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT1-024", as: "metaltyrannomon" }],
          hand: [{ card: "BT22-062", as: "x-antibody" }],
        },
        1: { battleArea: [{ card: "BT22-071", as: "opponent" }] },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 1;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("metaltyrannomon").permanentId,
        instanceId: s.inst("x-antibody").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => observe(s.engine).isRestricted(s.perm("opponent"), "digivolve"));

    expect(s.state.memory).toBe(0);
    expect(s.perm("metaltyrannomon").currentDP).toBe(12000);
    expect(observe(s.engine).isRestricted(s.perm("opponent"), "digivolve")).toBe(true);
  });
});
