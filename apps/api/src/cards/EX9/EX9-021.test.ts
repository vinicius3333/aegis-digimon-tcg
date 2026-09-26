import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import compiled from "./EX9-021.js";
import "../index.js";

describe("EX9-021", () => {
  it("encodes the complete behavior as compiled IR", () => {
    expect(compiled.residual).toEqual([]);
    expect(compiled.effects[0]).toMatchObject({
      trigger: "WhenDigivolving",
      actions: [
        {
          kind: "Restrict",
          restriction: "beAffected",
          byOpponentEffectsOnly: true,
          condition: { kind: "isDnaDigivolving" },
        },
        { kind: "Delete", target: { filter: { superlative: "highestLevel" }, count: "all" } },
      ],
    });
    expect(compiled.effects[1]).toMatchObject({
      trigger: "EndOfAttack",
      optional: true,
      actions: [
        { kind: "PlayWithoutCost", fromOwnDigivolutionStack: true, bindResultAs: "firstPlayed" },
        { kind: "PlayWithoutCost", fromOwnDigivolutionStack: true, bindResultAs: "secondPlayed" },
        { kind: "SecurityManipulation", op: "addTop" },
      ],
    });
  });

  it("DNA digivolving deletes every opposing highest-level Digimon and grants Digimon-effect immunity", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "EX9-013", as: "redMaterial" },
          { card: "EX9-020", as: "blueMaterial" },
        ],
        hand: [{ card: "EX9-021", as: "alterS" }],
      },
      1: {
        battleArea: [
          { card: "EX9-013", as: "highestA" },
          { card: "BT1-009", as: "lower" },
        ],
      },
    });
    s.state.memory = 10;

    expect(
      s.engine.applyIntent(0, {
        type: "dnaDigivolve",
        materialPermanentIds: [s.perm("redMaterial").permanentId, s.perm("blueMaterial").permanentId],
        instanceId: s.inst("alterS").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.battleArea.length === 1);

    expect(s.state.players[1]!.battleArea[0]!.topCard.cardId).toBe("BT1-009");
    const alterS = s.state.players[0]!.battleArea[0]!;
    expect(alterS.topCard.cardId).toBe("EX9-021");
    expect(observe(s.engine).hasRestriction(alterS, "beAffected", "Digimon")).toBe(true);
    expect(s.state.players[1]!.trash.map((card) => card.cardId)).toEqual(expect.arrayContaining(["EX9-013"]));
  });

  it("normal digivolution with a stack of at least 2 does not grant DNA immunity", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "EX9-013", as: "alterS", under: ["BT1-009", "BT1-009"] }],
        hand: [{ card: "EX9-021", as: "evolver" }],
      },
      1: {
        battleArea: [
          { card: "EX9-013", as: "highest" },
          { card: "BT1-009", as: "lower" },
        ],
      },
    });
    s.state.memory = 10;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("alterS").permanentId,
        instanceId: s.inst("evolver").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("alterS").topCard?.cardId === "EX9-021" && s.state.players[1]!.battleArea.length === 1);
    expect(s.state.players[1]!.battleArea.map((permanent) => permanent.topCard.cardId)).toEqual(["BT1-009"]);
    expect(observe(s.engine).hasRestriction(s.perm("alterS"), "beAffected", "Digimon")).toBe(false);
  });

  it("Q4768-Q4769 lets an opponent choose the DNA-immune Digimon but ignores suspend and DP effects", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "EX9-013", as: "redMaterial" },
            { card: "EX9-020", as: "blueMaterial" },
          ],
          hand: [{ card: "EX9-021", as: "alterS" }],
        },
        1: {
          battleArea: [
            { card: "BT14-033", as: "base" },
            { card: "BT1-015", as: "deletedHighest" },
          ],
          hand: [
            { card: "BT14-036", as: "dpEffect" },
            { card: "BT1-070", as: "suspender" },
          ],
        },
      },
      { autoSelectCards: true, autoOrderTriggers: true },
    );
    s.state.memory = 10;
    expect(
      s.engine.applyIntent(0, {
        type: "dnaDigivolve",
        materialPermanentIds: [s.perm("redMaterial").permanentId, s.perm("blueMaterial").permanentId],
        instanceId: s.inst("alterS").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.battleArea.length === 1);
    const alterS = s.perm("alterS");
    expect(observe(s.engine).hasRestriction(alterS, "beAffected", "Digimon")).toBe(true);

    s.state.turnSeat = 1;
    s.state.memory = 10;
    expect(
      s.engine.applyIntent(1, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("dpEffect").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard.cardId === "BT14-036");
    expect(alterS.isSuspended).toBe(false);
    expect(alterS.currentDP).toBe(15000);

    expect(s.engine.applyIntent(1, { type: "playCard", instanceId: s.inst("suspender").instanceId })).toEqual({
      ok: true,
    });
    await settle();
    expect(alterS.isSuspended).toBe(false);
  });

  it.each([
    ["Greymon + Garurumon", ["AD1-001", "AD1-010"]],
    ["Greymon + Ver.2", ["AD1-001", "BT22-049"]],
    ["Ver.1 + Garurumon", ["EX9-016", "AD1-010"]],
    ["Ver.1 + Ver.2", ["EX9-016", "BT22-049"]],
  ] as const)("Q4765 plays the %s End of Attack combination, then becomes top security", async (_label, under) => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "EX9-021", as: "alterS", under: [...under] }] },
        1: { security: ["BT1-009", "BT1-009"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoOrderTriggers: true },
    );
    s.state.turnSeat = 0;
    await s.ready();
    const alterS = s.perm("alterS");
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: alterS.permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.security[0]?.cardId === "EX9-021");

    expect(s.state.players[0]!.security[0]!.cardId).toBe("EX9-021");
    expect(s.state.players[0]!.battleArea.map((permanent) => permanent.topCard.cardId)).toEqual(
      expect.arrayContaining([...under]),
    );
    expect(s.state.players[0]!.battleArea).toHaveLength(2);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("Q4767 may play only the available Greymon card from its stack", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "EX9-021", as: "alterS", under: ["AD1-001"] }] },
        1: { security: ["BT1-009", "BT1-009"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoOrderTriggers: true },
    );
    s.state.turnSeat = 0;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("alterS").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.security[0]?.cardId === "EX9-021");

    expect(s.state.players[0]!.battleArea.map((permanent) => permanent.topCard.cardId)).toEqual(["AD1-001"]);
    expect(s.state.players[0]!.battleArea).toHaveLength(1);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("can use End of Attack again after declining its first optional activation this turn", async () => {
    const options = {
      autoAcceptOptional: false,
      autoDeclineOptional: true,
      autoSelectCards: true,
      autoOrderTriggers: true,
    };
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX9-021", as: "alterS", under: ["AD1-001", "AD1-010"] }],
          hand: [{ card: "BT1-095", as: "braveShield" }],
        },
        1: { security: ["BT1-009", "BT1-009"] },
      },
      options,
    );
    s.state.memory = 10;
    s.state.turnSeat = 0;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("alterS").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        s.state.players[1]!.security.length === 1 &&
        s.state.pendingDecision === undefined &&
        !observe(s.engine).isAttacking(),
    );

    expect(s.perm("alterS").stack.map(({ cardId }) => cardId)).toEqual(["AD1-001", "AD1-010"]);
    expect(s.state.players[0]!.security.some(({ cardId }) => cardId === "EX9-021")).toBe(false);

    options.autoAcceptOptional = true;
    options.autoDeclineOptional = false;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("braveShield").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => !s.perm("alterS").isSuspended);
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("alterS").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.security[0]?.cardId === "EX9-021");

    expect(s.state.players[0]!.battleArea.map(({ topCard }) => topCard.cardId).sort()).toEqual(["AD1-001", "AD1-010"]);
    expect(s.state.players[0]!.security[0]!.cardId).toBe("EX9-021");
    expect(s.state.pendingDecision).toBeUndefined();
  });
});
