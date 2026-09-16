import { describe, expect, it } from "vitest";
import { getCardDefinition } from "@aegis/shared";
import { setupEngine, settle, type EngineSetup } from "../../engine/testkit/harness.js";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import "../index.js";

const inertSecurity = ["BT1-009", "BT1-013", "BT1-012"];
const inertDeck = ["BT1-009", "BT1-013", "BT1-012", "BT1-014"];

const oppBoardCardIds = (s: EngineSetup): (string | undefined)[] =>
  s.state.players[1]!.battleArea.map((permanent) => permanent.topCard?.cardId).sort();

const board = (opts?: { own?: unknown[]; trash?: unknown[]; security?: unknown[] }) => ({
  0: {
    hand: [{ card: "BT19-096", as: "eraser" }],
    battleArea: (opts?.own ?? [{ card: "BT19-045", as: "dual", dp: 20_000 }]) as never,
    trash: (opts?.trash ?? []) as never,
    deck: [...inertDeck],
    security: (opts?.security ?? inertSecurity) as never,
  },
  1: {
    battleArea: [
      { card: "BT10-062", as: "five0", dp: 5000 },
      { card: "BT10-064", as: "five1", dp: 8000 },
    ],
    deck: [...inertDeck],
    security: [...inertSecurity],
  },
});

describe("BT19-096 Hornet Eraser — catalog and IR", () => {
  it("matches the catalog record", () => {
    expect(getCardDefinition("BT19-096")).toMatchObject({
      cardId: "BT19-096",
      nameEn: "Hornet Eraser",
      colors: ["Green", "Black"],
      kinds: ["Option"],
      playCost: 8,
      types: ["Royal Base", "LIBERATOR"],
      maxCountInDeck: 4,
      securityEffectText: "[Security] Activate this card's [Main] effect.",
    });
  });

  it("compiles the two printed clauses to the intended IR shape", () => {
    const card = runtimeCompiledCard("BT19-096");
    expect(card).toMatchObject({ coverage: "full", residual: [] });
    expect(card?.effects).toMatchObject([
      {
        trigger: "Main",
        actions: [
          {
            kind: "SecurityManipulation",
            op: "addBottom",
            controller: "mine",
            source: {
              filter: {
                controller: "mine",
                kind: ["Digimon"],
                zone: "trash",
                nameOrTrait: [{ tokens: ["Royal Base"], match: "trait" }],
              },
              count: 1,
            },
            faceUp: true,
            optional: true,
          },
          {
            kind: "DeleteBudget",
            filter: { controller: "opponent", kind: ["Digimon"] },
            budget: 8,
            upTo: true,
            scaling: { per: 1, filter: { controller: "mine", faceUp: true }, unit: "security", budgetAdd: 2 },
          },
        ],
      },
      { trigger: "Security", isSecurity: true, actions: [{ kind: "ActivateMain" }] },
    ]);
  });
});

describe("BT19-096 Hornet Eraser — use cost and the multicolour requirement (CR 4-22-3/4-22-4)", () => {
  it("refuses the play off a GREEN permanent alone: a multicolour Option needs BOTH colours", async () => {
    const s = setupEngine(board({ own: [{ card: "BT1-064", as: "green" }] }), {
      autoAcceptOptional: true,
      autoSelectCards: true,
    });
    s.state.memory = 8;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("eraser").instanceId })).toMatchObject({
      ok: false,
      reason: "color-requirement-unmet",
    });
    expect(s.state.memory).toBe(8);
    expect(oppBoardCardIds(s)).toEqual(["BT10-062", "BT10-064"]);
  });

  it("refuses the play off a BLACK permanent alone", async () => {
    const s = setupEngine(board({ own: [{ card: "BT2-052", as: "black" }] }), {
      autoAcceptOptional: true,
      autoSelectCards: true,
    });
    s.state.memory = 8;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("eraser").instanceId })).toMatchObject({
      ok: false,
      reason: "color-requirement-unmet",
    });
    expect(s.state.memory).toBe(8);
  });

  it("refuses the play off a PURPLE permanent: neither printed colour is present", async () => {
    const s = setupEngine(board({ own: [{ card: "BT2-067", as: "purple" }] }), {
      autoAcceptOptional: true,
      autoSelectCards: true,
    });
    s.state.memory = 8;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("eraser").instanceId })).toMatchObject({
      ok: false,
      reason: "color-requirement-unmet",
    });
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toEqual([s.inst("eraser").instanceId]);
  });

  it("costs 8 memory and plays off a GREEN plus a BLACK permanent", async () => {
    const s = setupEngine(
      board({
        own: [
          { card: "BT1-064", as: "green" },
          { card: "BT2-052", as: "black" },
        ],
      }),
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 8;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("eraser").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[1]!.battleArea.length === 1);

    expect(s.state.memory).toBe(0);
    expect(s.state.players[0]!.hand).toHaveLength(0);
  });

  it("CR 4-22-4: ONE Green/Black Digimon meets both colour requirements on its own", async () => {
    const s = setupEngine(board(), { autoAcceptOptional: true, autoSelectCards: true });
    s.state.memory = 8;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("eraser").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[1]!.battleArea.length === 1);
    expect(s.state.memory).toBe(0);
  });
});

describe("BT19-096 Hornet Eraser — [Main] budget and its face-up-security scaling", () => {
  it("deletes ONE cost-5 Digimon on the base budget of 8 with no face-up security card", async () => {
    const s = setupEngine(board(), { autoAcceptOptional: true, autoSelectCards: true });
    s.state.memory = 8;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("eraser").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[1]!.battleArea.length === 1);
    await settle(() => s.state.pendingDecision === undefined);

    expect(s.state.players[1]!.battleArea).toHaveLength(1);
    expect(s.state.players[0]!.security.map((card) => card.cardId)).toEqual(inertSecurity);
    expect(s.state.players[0]!.security.every((card) => !card.faceUp)).toBe(true);
  });

  it("a pre-existing FACE-UP security card raises the budget to 10 and both cost-5 Digimon die", async () => {
    const s = setupEngine(
      board({ security: [{ card: "BT1-009", as: "revealed", faceUp: true }, "BT1-013", "BT1-012"] }),
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 8;
    await s.ready();
    expect(s.inst("revealed").faceUp).toBe(true);

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("eraser").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[1]!.battleArea.length === 0);

    expect(s.state.players[1]!.battleArea).toHaveLength(0);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("places a [Royal Base] Digimon FACE UP at the BOTTOM of security, and that card pays for its own +2", async () => {
    const s = setupEngine(board({ trash: [{ card: "BT19-045", as: "funbeemon" }] }), {
      autoAcceptOptional: true,
      autoSelectCards: true,
    });
    s.state.memory = 8;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("eraser").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[1]!.battleArea.length === 0);

    const security = s.state.players[0]!.security;
    expect(security.map((card) => card.instanceId)).toHaveLength(4);
    expect(security[security.length - 1]!.instanceId).toBe(s.inst("funbeemon").instanceId);
    expect(security[security.length - 1]!.faceUp).toBe(true);
    expect(security.slice(0, 3).every((card) => !card.faceUp)).toBe(true);
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toEqual([s.inst("eraser").instanceId]);
    expect(s.state.players[1]!.battleArea).toHaveLength(0);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("near-miss peers: neither a non-[Royal Base] Digimon nor the [Royal Base] OPTION is placeable", async () => {
    const s = setupEngine(
      board({
        trash: [
          { card: "BT2-052", as: "noTrait" },
          { card: "P-181", as: "optionPeer" },
        ],
      }),
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 8;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("eraser").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[1]!.battleArea.length === 1);
    await settle(() => s.state.pendingDecision === undefined);

    expect(s.state.players[0]!.trash.map((card) => card.instanceId).sort()).toEqual(
      [s.inst("noTrait").instanceId, s.inst("optionPeer").instanceId, s.inst("eraser").instanceId].sort(),
    );
    expect(s.state.players[0]!.security.map((card) => card.cardId)).toEqual(inertSecurity);
    expect(s.state.players[1]!.battleArea).toHaveLength(1);
  });

  it("cannot reach a [Royal Base] Digimon sitting in HAND: the source zone is the trash", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [
            { card: "BT19-096", as: "eraser" },
            { card: "BT19-045", as: "inHand" },
          ],
          battleArea: [{ card: "BT19-045", as: "dual", dp: 20_000 }],
          deck: [...inertDeck],
          security: [...inertSecurity],
        },
        1: {
          battleArea: [
            { card: "BT10-062", as: "five0", dp: 5000 },
            { card: "BT10-064", as: "five1", dp: 8000 },
          ],
          deck: [...inertDeck],
          security: [...inertSecurity],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 8;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("eraser").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[1]!.battleArea.length === 1);
    await settle(() => s.state.pendingDecision === undefined);

    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toEqual([s.inst("inHand").instanceId]);
    expect(s.state.players[0]!.security.map((card) => card.cardId)).toEqual(inertSecurity);
    expect(s.state.players[1]!.battleArea).toHaveLength(1);
  });

  it("never deletes the controller's own Digimon", async () => {
    const s = setupEngine(
      board({
        own: [
          { card: "BT19-045", as: "dual", dp: 20_000 },
          { card: "BT10-062", as: "mine5" },
        ],
      }),
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 8;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("eraser").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[1]!.battleArea.length === 1);
    await settle(() => s.state.pendingDecision === undefined);

    expect(s.state.players[0]!.battleArea.map((permanent) => permanent.topCard?.cardId).sort()).toEqual(
      ["BT19-045", "BT10-062"].sort(),
    );
  });
});

describe("BT19-096 Hornet Eraser — [Security] activate this card's [Main] effect", () => {
  it("runs the whole [Main] body out of a REAL security check", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT10-062", as: "attacker", dp: 5000 },
            { card: "BT10-064", as: "bench", dp: 8000 },
          ],
          deck: [...inertDeck],
          security: [...inertSecurity],
        },
        1: {
          battleArea: [{ card: "BT1-064", as: "theirGreen", dp: 3000 }],
          trash: [{ card: "BT19-048", as: "forge" }],
          deck: [...inertDeck],
          security: [{ card: "BT19-096", as: "eraser" }, "BT1-009"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 3;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.length === 0);

    const security = s.state.players[1]!.security;
    expect(security[security.length - 1]!.instanceId).toBe(s.inst("forge").instanceId);
    expect(security[security.length - 1]!.faceUp).toBe(true);
    expect(s.state.players[1]!.trash.map((card) => card.instanceId)).not.toContain(s.inst("forge").instanceId);
    expect(s.state.players[0]!.battleArea).toHaveLength(0);
    expect(s.state.players[1]!.battleArea.map((permanent) => permanent.topCard?.cardId)).toEqual(["BT1-064"]);
    expect(s.state.pendingDecision).toBeUndefined();
  });
});

describe("BT19-096 Hornet Eraser — KB Q3171/Q3172/Q3173: what a face-up security card is", () => {
  it("a face-up security card is checked normally and its [Security] effect still triggers", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT10-062", as: "attacker", dp: 5000 }],
          deck: [...inertDeck],
          security: [...inertSecurity],
        },
        1: {
          deck: [...inertDeck],
          security: [{ card: "P-155", as: "pawn", faceUp: true }, "BT1-009"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 3;
    await s.ready();
    expect(s.inst("pawn").faceUp).toBe(true);

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.length === 0);

    expect(s.state.players[0]!.battleArea).toHaveLength(0);
    expect(s.state.players[1]!.hand.map((card) => card.instanceId)).toEqual([s.inst("pawn").instanceId]);
    expect(s.state.players[1]!.security.map((card) => card.cardId)).toEqual(["BT1-009"]);
  });
});
