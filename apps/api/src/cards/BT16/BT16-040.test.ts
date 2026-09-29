import { digivolutionRequirementsFor } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { compiled } from "./BT16-040.js";
import "../index.js";

describe("BT16-040", () => {
  it("digivolves from trash into an Insectoid or Free level 4 at both timings", () => {
    expect(compiled.effects?.[0]).toMatchObject({
      trigger: "StartOfYourMainPhase",
      actions: [
        {
          kind: "Digivolve",
          target: { filter: { controller: "mine", kind: ["Digimon"] } },
          into: {
            controller: "mine",
            zone: "trash",
            kind: ["Digimon"],
            levels: [4],
            nameOrTrait: [{ tokens: ["Insectoid", "Free"], match: "trait" }],
          },
          from: ["trash"],
          reduceCost: 1,
          payCost: true,
          optional: true,
          condition: { kind: "isYourTurn" },
        },
      ],
    });
    expect(compiled.effects?.[1]).toMatchObject({
      trigger: "OnPlay",
      actions: [{ kind: "Digivolve", from: ["trash"], reduceCost: 1, payCost: true, optional: true }],
    });
  });

  it("suspends an opposing Digimon as inherited once per turn", () => {
    expect(compiled.effects?.[2]).toMatchObject({
      trigger: "WhenAttacking",
      isInherited: true,
      frequency: "OncePerTurn",
      actions: [{ kind: "Suspend" }],
    });
  });

  it("encodes the Minomon alternate evolution requirement", () => {
    expect(digivolutionRequirementsFor("BT16-040")).toEqual([{ names: ["Minomon"], cost: 0, isAlternate: true }]);
  });

  it("naturally evolves from Minomon through the zero-cost alternate route", async () => {
    const s = setupEngine({
      0: { breeding: { card: "BT16-004", as: "minomon" }, hand: [{ card: "BT16-040", as: "wormmon" }] },
    });
    s.state.memory = 0;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("minomon").permanentId,
        instanceId: s.inst("wormmon").instanceId,
        alternateRequirementIndex: 0,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("minomon").topCard?.cardId === "BT16-040");

    expect(s.perm("minomon").stack.map((card) => card.cardId)).toEqual(["BT16-004"]);
    expect(s.state.memory).toBe(0);
  });

  it("digivolves the played Wormmon into a legal level 4 from trash", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "BT16-040", as: "wormmon" }],
          trash: [{ card: "BT16-041", as: "stingmon" }],
          deck: ["BT1-009", "BT1-009"],
        },
      },
      { autoSelectCards: true, autoAcceptOptional: true },
    );
    s.state.memory = 4;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("wormmon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.perm("wormmon").topCard?.cardId === "BT16-041");

    expect(s.perm("wormmon").topCard?.cardId).toBe("BT16-041");
    expect(s.state.players[0]!.trash.some((card) => card.cardId === "BT16-041")).toBe(false);
    expect(s.state.memory).toBe(0);
  });

  it("naturally uses the Start of Your Main Phase trash-digivolve window", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT16-040", as: "wormmon" }],
          trash: [{ card: "BT16-041", as: "stingmon" }],
          deck: ["BT1-009", "BT1-010"],
        },
        1: { deck: ["BT1-009", "BT1-010"] },
      },
      { autoSelectCards: true, autoAcceptOptional: true },
    );
    s.state.memory = 1;

    const turn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(0);
    await settle(() => s.perm("wormmon").topCard?.cardId === "BT16-041");

    expect(s.state.players[0]!.trash.some((card) => card.cardId === "BT16-041")).toBe(false);
    expect(s.state.memory).toBe(0);
    advance(s.engine).endMainPhaseIfOpen(0);
    await turn;
  });

  it("does not ignore digivolution requirements for an incompatible Free card in trash", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT16-040", as: "wormmon" }],
          trash: [{ card: "BT12-037", as: "opossummon" }],
          deck: ["BT1-009", "BT1-010"],
        },
        1: { deck: ["BT1-009", "BT1-010"] },
      },
      { autoSelectCards: true, autoAcceptOptional: true },
    );
    s.state.memory = 0;

    const turn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(0);
    await settle();

    expect(s.perm("wormmon").topCard?.cardId).toBe("BT16-040");
    expect(s.state.players[0]!.trash.some((card) => card.cardId === "BT12-037")).toBe(true);
    advance(s.engine).endMainPhaseIfOpen(0);
    await turn;
  });

  it("naturally suspends one opponent Digimon on each attack after the once-per-turn reset", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT16-040", as: "wormmon" }],
          hand: [{ card: "BT19-059", as: "deadlyAxemon" }],
          deck: ["BT1-009", "BT1-010", "BT1-011", "BT1-012", "BT1-013"],
        },
        1: {
          battleArea: [
            { card: "BT1-009", as: "first" },
            { card: "BT1-010", as: "second" },
          ],
          security: ["BT1-090", "BT1-091"],
          deck: ["BT1-009", "BT1-010", "BT1-011", "BT1-012", "BT1-013"],
        },
      },
      { autoSelectCards: true, preferInstanceIds: preferred },
    );
    preferred.push(s.perm("first").permanentId);
    s.state.memory = 3;
    await s.ready();

    const firstTurn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(0);
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("wormmon").permanentId,
        instanceId: s.inst("deadlyAxemon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("wormmon").topCard?.cardId === "BT19-059");
    expect(s.state.memory).toBe(0);

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("wormmon").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("first").isSuspended && !observe(s.engine).isAttacking());
    expect(s.perm("second").isSuspended).toBe(false);
    advance(s.engine).endMainPhaseIfOpen(0);
    await firstTurn;

    s.state.turnSeat = 1;
    s.state.memory = 3;
    const opponentTurn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(1);
    expect(s.perm("wormmon").isSuspended).toBe(true);
    advance(s.engine).endMainPhaseIfOpen(1);
    await opponentTurn;

    preferred.splice(0, preferred.length, s.perm("second").permanentId);
    s.state.turnSeat = 0;
    s.state.memory = 3;
    const nextTurn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(0);
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("wormmon").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("second").isSuspended && !observe(s.engine).isAttacking());

    expect(s.perm("first").isSuspended).toBe(false);
    expect(s.perm("second").isSuspended).toBe(true);
    advance(s.engine).endMainPhaseIfOpen(0);
    await nextTurn;
  });
});

describe("BT16-040 Wormmon — KB Q&A rulings", () => {
  it("only digivolves into a trash card whose digivolution requirements it meets (Q2634)", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "BT16-040", as: "wormmon" }],
          trash: [
            { card: "BT13-011", as: "redFreeAquilamon" },
            { card: "BT12-022", as: "greenCompatibleExVeemon" },
            { card: "BT12-022", as: "secondGreenCompatibleExVeemon" },
          ],
          deck: ["BT1-009", "BT1-010"],
        },
      },
      { autoSelectCards: true, autoAcceptOptional: true, preferInstanceIds: preferred },
    );
    preferred.push(s.inst("redFreeAquilamon").instanceId);
    s.state.memory = 4;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("wormmon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.perm("wormmon").topCard?.cardId === "BT12-022");

    const offeredIds = s.decisions.flatMap(({ req }) => req.options?.candidateInstanceIds ?? []);
    expect(offeredIds).toContain(s.inst("secondGreenCompatibleExVeemon").instanceId);
    expect(offeredIds).toContain(s.inst("greenCompatibleExVeemon").instanceId);
    expect(offeredIds).not.toContain(s.inst("redFreeAquilamon").instanceId);
    expect(s.state.players[0]!.trash.map((card) => card.cardId)).toEqual(["BT13-011", "BT12-022"]);
    expect(s.state.memory).toBe(0);
  });

  it("is not returned to hand by Davis Motomiya & Ken Ichijoji after it moved to the breeding area (Q4254)", async () => {
    async function playDigivolveAndPassOpponentTurn(breedingOccupied: boolean) {
      const s = setupEngine(
        {
          0: {
            battleArea: [{ card: "BT16-085", as: "davisKen" }],
            hand: [
              { card: "BT16-040", as: "wormmon" },
              { card: "P-143", as: "drimogemon" },
            ],
            deck: ["BT1-009", "BT1-010", "BT1-011"],
            ...(breedingOccupied ? { breeding: { card: "BT16-004", as: "egg" } } : {}),
          },
          1: { deck: ["BT1-009", "BT1-010", "BT1-011"] },
        },
        { autoSelectCards: true, autoAcceptOptional: true },
      );
      s.state.memory = 2;
      await s.ready();

      const ownTurn = s.engine.runOneTurn();
      await advance(s.engine).waitForMainPhase(0);
      await settle(() => s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.cardId === "BT16-040"));
      const wormmon = s.state.players[0]!.battleArea.find((permanent) => permanent.topCard?.cardId === "BT16-040")!;
      expect(
        s.engine.applyIntent(0, {
          type: "digivolve",
          permanentId: wormmon.permanentId,
          instanceId: s.inst("drimogemon").instanceId,
        }),
      ).toEqual({ ok: true });
      await settle(() => wormmon.topCard?.cardId === "P-143");
      advance(s.engine).endMainPhaseIfOpen(0);
      await ownTurn;

      s.state.turnSeat = 1;
      s.state.memory = 3;
      await advance(s.engine).runTurn(1);
      await settle();
      return { s, wormmon };
    }

    const moved = await playDigivolveAndPassOpponentTurn(false);
    expect(moved.s.state.players[0]!.breeding?.permanentId).toBe(moved.wormmon.permanentId);
    expect(moved.s.state.players[0]!.breeding?.topCard?.cardId).toBe("P-143");
    expect(moved.s.state.players[0]!.breeding?.stack.map((card) => card.cardId)).toEqual(["BT16-040"]);
    expect(moved.s.state.players[0]!.hand.map((card) => card.cardId)).not.toContain("P-143");

    const stayed = await playDigivolveAndPassOpponentTurn(true);
    expect(stayed.s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.cardId === "P-143")).toBe(
      false,
    );
    expect(stayed.s.state.players[0]!.hand.map((card) => card.cardId)).toContain("P-143");
    expect(stayed.s.state.players[0]!.trash.map((card) => card.cardId)).toContain("BT16-040");
  });
});
