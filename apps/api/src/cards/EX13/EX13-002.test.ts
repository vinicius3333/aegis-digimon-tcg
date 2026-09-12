import { getCardDefinition, Phase } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { matchNameOrTrait } from "../../engine/effects/interpreter/matching/definition.js";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./EX13-002.js";
import "../index.js";

/** A board whose only moving part is the seeded host and the Tamer in hand. */
function hostBoard(host: { card: string; as: string }) {
  return {
    0: {
      battleArea: [{ ...host, under: ["EX13-002"], suspended: true }],
      hand: [{ card: "BT11-090", as: "blueTamer" }],
      deck: ["BT1-009", "BT1-010", "BT1-011", "BT1-012"],
    },
    1: { security: ["BT1-009", "BT1-010"], deck: ["BT1-011", "BT1-012", "BT1-013"] },
  };
}

describe("EX13-002 DemiVeemon", () => {
  it("matches the catalog identity", () => {
    expect(getCardDefinition("EX13-002")).toMatchObject({
      cardId: "EX13-002",
      nameEn: "DemiVeemon",
      colors: ["Blue"],
      kinds: ["DigiEgg"],
      level: 2,
      playCost: -1,
      dp: 0,
      forms: ["In-Training"],
      types: ["Baby Dragon"],
      effectText: "[Rule] Name: Not treated as including [Vee].",
      inheritedEffectText:
        "[Your Turn] [Once Per Turn] When any of your blue Tamers are played, this Digimon with [Veedramon] in its name may unsuspend.",
    });
  });

  it("compiles the printed clause into a once-per-turn inherited blue-Tamer watcher", () => {
    const inherited = compiled.effects.find((effect) => effect.isInherited);
    expect(inherited).toMatchObject({ trigger: "YourTurn", frequency: "OncePerTurn" });
    expect(inherited?.actions?.[0]).toMatchObject({
      kind: "SubTrigger",
      event: "whenPlayed",
      sourceFilter: { controllerDefault: "mine", kind: ["Tamer"], colors: ["Blue"] },
      actions: [
        {
          kind: "Unsuspend",
          target: {
            filter: { isSelfRef: true, nameOrTrait: [{ tokens: ["Veedramon"], match: "name" }] },
            count: 1,
            isSelf: true,
          },
          optional: true,
        },
      ],
    });
    // The shared standardized-name matcher executes the printed exclusion.
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
  });

  it("unsuspends a Veedramon host when its controller plays a blue Tamer", async () => {
    const s = setupEngine(hostBoard({ card: "ST8-05", as: "host" }), { autoAcceptOptional: true });
    s.state.memory = 10;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("blueTamer").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => !s.perm("host").isSuspended);

    expect(s.perm("host").isSuspended).toBe(false);
    expect(s.state.memory).toBe(7);
    expect(s.perm("host").stack.map((card) => card.cardId)).toEqual(["EX13-002"]);
    expect(s.state.players[0]!.hand).toHaveLength(0);
    expect(s.state.players[0]!.battleArea).toHaveLength(2);
    expect(s.state.players[1]!.security.map(({ cardId }) => cardId)).toEqual(["BT1-009", "BT1-010"]);
  });

  it("reads [Veedramon] as a substring, so an AeroVeedramon host also unsuspends", async () => {
    const s = setupEngine(hostBoard({ card: "ST8-08", as: "host" }), { autoAcceptOptional: true });
    s.state.memory = 10;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("blueTamer").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => !s.perm("host").isSuspended);

    expect(s.perm("host").isSuspended).toBe(false);
    expect(s.state.memory).toBe(7);
  });

  it("does not unsuspend a Veemon, a Monodramon, or a Kokatorimon host", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "ST8-04", as: "veemon", under: ["EX13-002"], suspended: true },
            { card: "BT1-009", as: "monodramon", under: ["EX13-002"], suspended: true },
            { card: "BT1-014", as: "kokatorimon", under: ["EX13-002"], suspended: true },
          ],
          hand: [{ card: "BT11-090", as: "blueTamer" }],
          deck: ["BT1-009", "BT1-010", "BT1-011", "BT1-012"],
        },
        1: { security: ["BT1-009", "BT1-010"], deck: ["BT1-011", "BT1-012", "BT1-013"] },
      },
      { autoAcceptOptional: true },
    );
    s.state.memory = 10;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("blueTamer").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.battleArea.length === 4);

    expect(s.perm("veemon").isSuspended).toBe(true);
    expect(s.perm("monodramon").isSuspended).toBe(true);
    expect(s.perm("kokatorimon").isSuspended).toBe(true);
    expect(s.state.memory).toBe(7);
  });

  it("ignores a non-blue Tamer and a blue Tamer played on the opponent's turn", async () => {
    const wrongColor = setupEngine(
      {
        0: {
          battleArea: [{ card: "ST8-05", as: "host", under: ["EX13-002"], suspended: true }],
          hand: [{ card: "BT11-089", as: "redTamer" }],
          deck: ["BT1-009", "BT1-010", "BT1-011", "BT1-012"],
        },
        1: { security: ["BT1-009", "BT1-010"], deck: ["BT1-011", "BT1-012", "BT1-013"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    wrongColor.state.memory = 10;
    await wrongColor.ready();
    expect(
      wrongColor.engine.applyIntent(0, { type: "playCard", instanceId: wrongColor.inst("redTamer").instanceId }),
    ).toEqual({ ok: true });
    await settle(() => wrongColor.state.players[0]!.battleArea.length === 2);
    expect(wrongColor.perm("host").isSuspended).toBe(true);
    expect(wrongColor.state.memory).toBe(7);

    const opponentTurn = setupEngine(
      {
        0: {
          battleArea: [{ card: "ST8-05", as: "host", under: ["EX13-002"], suspended: true }],
          deck: ["BT1-009", "BT1-010", "BT1-011", "BT1-012"],
        },
        1: {
          hand: [{ card: "BT11-090", as: "blueTamer" }],
          security: ["BT1-009", "BT1-010"],
          deck: ["BT1-011", "BT1-012", "BT1-013"],
        },
      },
      { autoAcceptOptional: true },
    );
    opponentTurn.state.turnSeat = 1;
    opponentTurn.state.memory = 10;
    await opponentTurn.ready();
    expect(
      opponentTurn.engine.applyIntent(1, { type: "playCard", instanceId: opponentTurn.inst("blueTamer").instanceId }),
    ).toEqual({ ok: true });
    await settle(() => opponentTurn.state.players[1]!.battleArea.length === 1);
    expect(opponentTurn.perm("host").isSuspended).toBe(true);
  });

  it("does not unsuspend an opponent's Veedramon host when you play a blue Tamer", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "BT11-090", as: "blueTamer" }],
          deck: ["BT1-009", "BT1-010", "BT1-011", "BT1-012"],
        },
        1: {
          battleArea: [{ card: "ST8-05", as: "opponentHost", under: ["EX13-002"], suspended: true }],
          security: ["BT1-009", "BT1-010"],
          deck: ["BT1-011", "BT1-012", "BT1-013"],
        },
      },
      { autoAcceptOptional: true },
    );
    s.state.turnSeat = 0;
    s.state.memory = 10;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("blueTamer").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.battleArea.length === 1);

    expect(s.perm("opponentHost").isSuspended).toBe(true);
    expect(s.state.memory).toBe(7);
  });

  it("leaves the host suspended when the optional unsuspend is declined", async () => {
    const s = setupEngine(hostBoard({ card: "ST8-05", as: "host" }), { autoDeclineOptional: true });
    s.state.memory = 10;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("blueTamer").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.battleArea.length === 2);

    expect(s.perm("host").isSuspended).toBe(true);
    expect(s.state.memory).toBe(7);
  });

  it("fires once per turn and resets on the next own turn", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "ST8-05", as: "host", under: ["EX13-002"], suspended: true }],
          hand: [
            { card: "BT11-090", as: "firstTamer" },
            { card: "BT2-085", as: "secondTamer" },
            { card: "BT2-085", as: "thirdTamer" },
          ],
          deck: ["BT1-009", "BT1-010", "BT1-011", "BT1-012"],
        },
        1: {
          security: ["BT1-009", "BT1-010", "BT1-011"],
          hand: [{ card: "BT1-010", as: "opponentSpare" }],
          deck: ["BT1-011", "BT1-012", "BT1-013", "BT1-009"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.turnSeat = 0;
    s.state.memory = 10;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("firstTamer").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => !s.perm("host").isSuspended);
    expect(s.perm("host").isSuspended).toBe(false);

    // Re-suspend the host by hand so the second Tamer has something to undo.
    s.perm("host").isSuspended = true;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("secondTamer").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.battleArea.length === 3);
    expect(s.perm("host").isSuspended).toBe(true);
    expect(s.state.memory).toBe(4);

    // A full opponent turn, then the owner's next turn, through the real turn loop.
    s.state.turnSeat = 1;
    s.state.memory = 3;
    await advance(s.engine).runTurn(1);

    s.state.turnSeat = 0;
    s.state.memory = 10;
    const ownTurn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(0);
    s.perm("host").isSuspended = true;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("thirdTamer").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => !s.perm("host").isSuspended);
    expect(s.perm("host").isSuspended).toBe(false);
    advance(s.engine).endMainPhaseIfOpen(0);
    await ownTurn;
  });

  it("carries the inherited clause through a public egg evolution into Veedramon", async () => {
    const s = setupEngine(
      {
        0: {
          breeding: { card: "EX13-002", as: "egg" },
          hand: [
            { card: "ST8-04", as: "veemon" },
            { card: "ST8-05", as: "veedramon" },
            { card: "BT11-090", as: "blueTamer" },
          ],
          deck: [
            { card: "BT1-009", as: "firstDraw" },
            { card: "BT1-010", as: "secondDraw" },
            "BT1-011",
            "BT1-012",
            "BT1-013",
          ],
        },
        1: { security: ["BT1-009", "BT1-010"], deck: ["BT1-011", "BT1-012", "BT1-013"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true },
    );
    s.state.turnSeat = 0;
    s.state.memory = 10;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("egg").permanentId,
        instanceId: s.inst("veemon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("egg").topCard.instanceId === s.inst("veemon").instanceId);
    // Digi-Egg -> Lv.3 costs 0 and draws 1.
    expect(s.state.memory).toBe(10);
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("firstDraw").instanceId)).toBe(true);
    expect(s.perm("egg").stack.map((card) => card.cardId)).toEqual(["EX13-002"]);

    const turn = s.engine.runOneTurn();
    await settle(() => s.state.phase === Phase.Breeding);
    expect(s.engine.applyIntent(0, { type: "moveFromBreeding", permanentId: s.perm("egg").permanentId })).toEqual({
      ok: true,
    });
    await advance(s.engine).waitForMainPhase(0);
    s.state.memory = 10;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("egg").permanentId,
        instanceId: s.inst("veedramon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("egg").topCard.instanceId === s.inst("veedramon").instanceId);
    expect(s.state.memory).toBe(8);
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("secondDraw").instanceId)).toBe(true);
    expect(s.perm("egg").stack.map((card) => card.cardId)).toEqual(["EX13-002", "ST8-04"]);

    s.perm("egg").isSuspended = true;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("blueTamer").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => !s.perm("egg").isSuspended);

    expect(s.perm("egg").isSuspended).toBe(false);
    expect(s.perm("egg").topCard.cardId).toBe("ST8-05");
    expect(s.perm("egg").stack.map((card) => card.cardId)).toEqual(["EX13-002", "ST8-04"]);
    expect(s.state.memory).toBe(5);
    advance(s.engine).endMainPhaseIfOpen(0);
    await turn;
  });

  it("rejects an illegal source for the Digi-Egg route", async () => {
    const s = setupEngine({
      0: {
        breeding: { card: "EX13-002", as: "egg" },
        hand: [{ card: "BT1-014", as: "level4" }],
        deck: ["BT1-009", "BT1-010", "BT1-011", "BT1-012"],
      },
      1: { security: ["BT1-009", "BT1-010"], deck: ["BT1-011", "BT1-012", "BT1-013"] },
    });
    s.state.turnSeat = 0;
    s.state.memory = 10;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("egg").permanentId,
        instanceId: s.inst("level4").instanceId,
      }),
    ).not.toEqual({ ok: true });
    expect(s.perm("egg").topCard.cardId).toBe("EX13-002");
    expect(s.state.memory).toBe(10);
  });

  // Printed name exclusion, including the official universal Veemon reference rule.
  // No printed [Vee] consumer can select this Digi-Egg today: BT2-086 requires
  // Digimon. Probe the production matcher; do not claim a public producer path.
  it("does not treat DemiVeemon's name as including [Vee]", () => {
    const definition = getCardDefinition("EX13-002")!;
    expect(matchNameOrTrait(definition, { tokens: ["Vee"], match: "name" })).toBe(false);
    expect(matchNameOrTrait(definition, { tokens: ["Veemon"], match: "name" })).toBe(false);
    expect(matchNameOrTrait(definition, { tokens: ["DemiVeemon"], match: "nameExact" })).toBe(true);
    expect(matchNameOrTrait(definition, { tokens: ["Vee"], match: "name", negate: true })).toBe(true);
    expect(matchNameOrTrait(definition, { tokens: ["Vee", "DemiVeemon"], match: "name" })).toBe(true);
  });
});
