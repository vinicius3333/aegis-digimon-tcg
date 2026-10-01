import { digivolutionRequirementsFor, getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import { advance } from "../../engine/testkit/advance.js";
import { assertNoLoudGap, setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "../index.js";
import { identityVisibility } from "../ST24/tamerStack.testSupport.js";
import {
  allSecurityFaceDown,
  checkFaceUpSecurity,
  expectFaceUpCardCheckedNormally,
  publicSecurity,
  shuffleSecurityHolding,
} from "./qaRulings.testSupport.js";

const cardId = "EX11-025";

describe("EX11-025 FunBeemon", () => {
  it("legally evolves from a Royal Base level 2", async () => {
    const s = setupEngine(
      { 0: { breeding: { card: "EX11-003", as: "base" }, hand: [{ card: "EX11-025", as: "funbeemon" }] } },
      { autoAcceptOptional: true },
    );
    s.state.memory = 0;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("funbeemon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard?.cardId === "EX11-025", 600);
    expect(s.perm("base").topCard?.cardId).toBe("EX11-025");
  });

  it("encodes Security Reboot, face-up bottom placement, and inherited DP", () => {
    expect(getCardDefinition(cardId)).toMatchObject({
      nameEn: "FunBeemon",
      colors: ["Green", "Black"],
      level: 3,
      playCost: 3,
      dp: 1000,
      evoCosts: [
        { color: "Green", level: 2, memoryCost: 1 },
        { color: "Black", level: 2, memoryCost: 1 },
      ],
      types: ["Insectoid", "X Antibody", "Royal Base", "LIBERATOR"],
    });
    const compiled = runtimeCompiledCard(cardId)!;
    expect(compiled).toMatchObject({ coverage: "full", residual: [] });
    expect(compiled.digivolutionRequirement).toEqual([
      { level: 2, traits: ["Royal Base"], cost: 0, isAlternate: true },
    ]);
    expect(compiled.effects[0]).toMatchObject({
      trigger: "OpponentsTurn",
      isSecurity: true,
      actions: [{ kind: "GainKeyword", keyword: { keyword: "Reboot", raw: "＜Reboot＞" }, target: { count: "all" } }],
    });
    expect(compiled.effects[1]).toMatchObject({
      trigger: "StartOfYourMainPhase",
      actions: [
        { kind: "SecurityManipulation", op: "toHand", amount: 1, toTop: true, faceDownOnly: true },
        {
          kind: "SecurityManipulation",
          op: "placeAsSecurity",
          from: ["hand"],
          toTop: false,
          faceUp: true,
          optional: true,
        },
      ],
    });
    expect(compiled.effects[2]).toMatchObject({
      isInherited: true,
      actions: [{ kind: "ModifyDP", amount: 1000, duration: "permanent" }],
    });
    expect(digivolutionRequirementsFor(cardId)).toEqual(compiled.digivolutionRequirement);
  });

  it("moves the top security to hand, then may place only a Royal Base Digimon face up at the bottom", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: cardId, as: "source" }],
          security: [
            { card: "BT1-009", as: "top" },
            { card: "BT1-010", as: "bottom" },
          ],
          hand: [
            { card: "EX11-030", as: "royalBase" },
            { card: "BT1-011", as: "plain" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const turn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(0);
    expect(s.state.players[0]!.hand.map(({ cardId: id }) => id)).toEqual(
      expect.arrayContaining(["BT1-009", "BT1-011"]),
    );
    expect(s.state.players[0]!.security.map(({ cardId: id }) => id)).toEqual(["BT1-010", "EX11-030"]);
    expect(s.state.players[0]!.security[1]).toMatchObject({ cardId: "EX11-030", faceUp: true });
    expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
    await turn;
    assertNoLoudGap(s);
  });

  it("skips a face-up security card and takes the top face-down one", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: cardId, as: "source" }],
          security: [
            { card: "BT1-009", as: "faceUpTop", faceUp: true },
            { card: "BT1-010", as: "faceDown" },
          ],
          hand: [{ card: "EX11-030", as: "royalBase" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const turn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(0);
    expect(s.state.players[0]!.hand.map(({ cardId: id }) => id)).toEqual(["BT1-010"]);
    expect(s.state.players[0]!.security.map(({ cardId: id }) => id)).toEqual(["BT1-009", "EX11-030"]);
    expect(s.state.players[0]!.security[0]).toMatchObject({ cardId: "BT1-009", faceUp: true });
    expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
    await turn;
    assertNoLoudGap(s);
  });

  it("may decline the replacement after the mandatory top-security pickup", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: cardId, as: "source" }],
          security: [{ card: "BT1-009", as: "top" }],
          hand: [{ card: "EX11-030", as: "royalBase" }],
        },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    const turn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(0);
    expect(s.state.players[0]!.security).toHaveLength(0);
    expect(s.state.players[0]!.hand.map(({ cardId: id }) => id)).toEqual(
      expect.arrayContaining(["BT1-009", "EX11-030"]),
    );
    expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
    await turn;
    assertNoLoudGap(s);
  });

  it("grants Reboot only to own Royal Base Digimon from security on the opponent's turn", async () => {
    const s = setupEngine({
      0: {
        security: [{ card: cardId, as: "security", faceUp: true }],
        battleArea: [
          { card: "EX11-030", as: "royalBase" },
          { card: "BT1-009", as: "plain" },
        ],
      },
      1: { battleArea: [{ card: "EX11-030", as: "opposingRoyalBase" }] },
    });
    s.state.turnSeat = 1;
    await s.ready();
    expect(observe(s.engine).hasKeyword(s.perm("royalBase"), "Reboot")).toBe(true);
    expect(observe(s.engine).hasKeyword(s.perm("plain"), "Reboot")).toBe(false);
    expect(observe(s.engine).hasKeyword(s.perm("opposingRoyalBase"), "Reboot")).toBe(false);
    assertNoLoudGap(s);
  });

  it("does not grant Reboot while the resident security card is face down", async () => {
    const s = setupEngine({
      0: {
        security: [{ card: cardId, as: "security", faceUp: false }],
        battleArea: [{ card: "EX11-030", as: "royalBase" }],
      },
    });
    s.state.turnSeat = 1;
    await s.ready();
    expect(observe(s.engine).hasKeyword(s.perm("royalBase"), "Reboot")).toBe(false);
    assertNoLoudGap(s);
  });

  it("can place a Royal Base from hand when security starts empty", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: cardId, as: "source" }],
          hand: [{ card: "EX11-030", as: "royalBase" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const turn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(0);
    expect(s.state.players[0]!.hand).toHaveLength(0);
    expect(s.state.players[0]!.security.map(({ cardId: id, faceUp }) => ({ cardId: id, faceUp }))).toEqual([
      { cardId: "EX11-030", faceUp: true },
    ]);
    expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
    await turn;
    assertNoLoudGap(s);
  });

  it("applies the inherited +1000 DP in a realistic evolution stack", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "EX11-030", as: "host", under: [cardId], dp: 5000 }] } });
    await s.ready();
    expect(s.perm("host").currentDP).toBe(6000);
    assertNoLoudGap(s);
  });
});

describe("EX11-025 FunBeemon — KB Q&A rulings", () => {
  it("keeps the card it places face up revealed to both players as an ordinary security card (Q5812)", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: cardId, as: "source" }],
          security: [
            { card: "BT1-009", as: "top" },
            { card: "BT1-010", as: "bottom" },
          ],
          hand: [{ card: "EX11-030", as: "royalBase" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const turn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(0);

    expect(s.state.players[0]!.security).toHaveLength(2);
    expect(publicSecurity(s, 0)).toEqual([
      { faceUp: false, cardId: "" },
      { faceUp: true, cardId: "EX11-030" },
    ]);
    expect(identityVisibility(s, s.inst("royalBase"))).toEqual({ owner: true, opponent: true });
    expect(identityVisibility(s, s.inst("bottom")).opponent).toBe(false);
    expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
    await turn;
  });

  it("checks a face-up security card with it left revealed, otherwise like any security check (Q5813)", async () => {
    const s = await expectFaceUpCardCheckedNormally(cardId);
    expect(s.events.find((event) => event.kind === "securityChecked")).toMatchObject({ resolution: "battle" });
  });

  it("activates a face-up security card's [Security] effect when it is checked (Q5814)", async () => {
    const s = await checkFaceUpSecurity("EX11-062");

    expect(s.state.players[1]!.battleArea.map(({ topCard }) => topCard.instanceId)).toEqual([
      s.inst("checked").instanceId,
    ]);
  });

  it("turns face-up security cards face down when the security stack is shuffled (Q5815)", async () => {
    const s = await shuffleSecurityHolding([cardId]);

    expect(s.state.players[0]!.security.map(({ cardId: id }) => id)).toContain(cardId);
    expect(allSecurityFaceDown(s, 0)).toBe(true);
  });
});
