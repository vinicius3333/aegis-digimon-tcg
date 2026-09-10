import { getCardDefinition, getCompiledCard } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { assertNoLoudGap, setupEngine, settle } from "../../engine/testkit/harness.js";
import "./EX3-065.js";
import "./EX3-011.js";
import "./EX3-048.js";
import "./EX3-053.js";
import "./EX3-047.js";
import "../BT2/BT2-018.js";
import "../BT1/BT1-025.js";
import "../BT5/BT5-112.js";

describe("EX3-065 Hina Kurihara", () => {
  it("matches the official Tamer identity and all three printed clauses", () => {
    const definition = getCardDefinition("EX3-065")!;
    expect(definition).toMatchObject({
      cardId: "EX3-065",
      nameEn: "Hina Kurihara",
      colors: ["White"],
      kinds: ["Tamer"],
      playCost: 3,
      rarity: "R",
      maxCountInDeck: 4,
      imageId: "EX3-065",
    });
    expect(definition.effectText).toBe(
      "[Start of Your Turn] If your opponent has a Digimon in play, gain 1 memory.[Your Turn] When one of your Digimon digivolves into a Digimon with [Rock Dragon], [Earth Dragon], [Machine Dragon], or [Sky Dragon] in its traits, by suspending this Digimon, activate 1 of that Digimon's [On Play] effects.",
    );
    expect(definition.securityEffectText).toBe("[Security] Play this card without paying the cost.");

    expect(getCompiledCard("EX3-065")).toMatchObject({
      coverage: "full",
      residual: [],
      effects: [
        {
          trigger: "StartOfYourTurn",
          actions: [{ kind: "GainMemory", amount: 1 }],
        },
        {
          trigger: "YourTurn",
          actions: [
            {
              kind: "SubTrigger",
              event: "whenOneOfYoursDigivolves",
              sourceFilter: { controller: "mine", kind: ["Digimon"] },
            },
          ],
        },
        {
          trigger: "Security",
          isSecurity: true,
          actions: [{ kind: "PlayWithoutCost", from: ["security"], payCost: false }],
        },
      ],
    });
  });

  it("gains exactly 1 memory at the start of its owner's turn when the opponent has a battle-area Digimon", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "EX3-065", as: "hina" }] },
      1: { battleArea: [{ card: "BT1-028", as: "opponent" }] },
    });
    s.state.memory = 0;
    await s.ready();

    s.state.turnSeat = 0;
    const turn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(0);
    expect(s.state.memory).toBe(1);
    advance(s.engine).endMainPhaseIfOpen(0);
    await turn;
    assertNoLoudGap(s);
  });

  it("does not gain memory without an opposing battle-area Digimon, from breeding, or on the opponent's turn", async () => {
    const empty = setupEngine({ 0: { battleArea: [{ card: "EX3-065", as: "hina" }] } });
    await empty.ready();
    empty.state.memory = 0;
    empty.state.turnSeat = 0;
    const emptyTurn = empty.engine.runOneTurn();
    await advance(empty.engine).waitForMainPhase(0);
    expect(empty.state.memory).toBe(0);
    advance(empty.engine).endMainPhaseIfOpen(0);
    await emptyTurn;

    const breeding = setupEngine({
      0: { battleArea: [{ card: "EX3-065", as: "hina" }] },
      1: { breeding: { card: "BT1-028", as: "breedingOnly" } },
    });
    await breeding.ready();
    breeding.state.memory = 0;
    breeding.state.turnSeat = 0;
    const breedingTurn = breeding.engine.runOneTurn();
    await advance(breeding.engine).waitForMainPhase(0);
    expect(breeding.state.memory).toBe(0);
    advance(breeding.engine).endMainPhaseIfOpen(0);
    await breedingTurn;

    const opponentTurn = setupEngine({
      0: { battleArea: [{ card: "EX3-065", as: "hina" }] },
      1: { battleArea: [{ card: "BT1-028", as: "opponent" }] },
    });
    opponentTurn.state.turnSeat = 1;
    opponentTurn.state.memory = 0;
    await opponentTurn.ready();
    const opponentTurnRun = opponentTurn.engine.runOneTurn();
    await advance(opponentTurn.engine).waitForMainPhase(1);
    expect(opponentTurn.state.memory).toBe(0);
    advance(opponentTurn.engine).endMainPhaseIfOpen(1);
    await opponentTurnRun;
  });

  it("family: Earth Dragon digivolution suspends Hina and genuinely reactivates Volcanicdramon's On Play", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "EX3-065", as: "hina" },
            { card: "BT1-020", as: "base" },
          ],
          hand: [{ card: "BT2-018", as: "volcanic" }],
          deck: ["BT1-009"],
        },
        1: { battleArea: [{ card: "BT1-028", dp: 3000, as: "weak" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true },
    );
    s.state.memory = 3;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("volcanic").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("hina").isSuspended && s.state.players[1]!.battleArea.length === 0);

    expect(s.perm("base").topCard.cardId).toBe("BT2-018");
    expect(s.perm("hina").isSuspended).toBe(true);
    expect(s.state.players[1]!.trash.map(({ cardId }) => cardId)).toContain("BT1-028");
    expect(
      s.decisions.find(({ req }) => req.sourceCardId === "EX3-065" && req.kind === "optional")?.req.options,
    ).toMatchObject({
      timing: "YourTurn",
    });
    assertNoLoudGap(s);
  });

  it("does not trigger when an eligible Dragon is played instead of digivolved", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX3-065", as: "hina" }],
          hand: [{ card: "EX3-048", as: "jazardmon" }],
          deck: ["BT1-009", "BT1-010", "BT1-011", "BT1-012"],
        },
      },
      { autoSelectCards: true, autoOrderCards: true },
    );
    s.state.memory = 4;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("jazardmon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.battleArea.some(({ topCard }) => topCard.cardId === "EX3-048"));

    expect(s.perm("hina").isSuspended).toBe(false);
    expect(s.decisions.filter(({ req }) => req.sourceCardId === "EX3-065")).toHaveLength(0);
    assertNoLoudGap(s);
  });

  it("triggers for an eligible Dragon digivolved by an effect", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "EX3-065", as: "hina" },
            { card: "EX3-046", as: "base" },
          ],
          trash: [{ card: "EX3-048", as: "jazardmon" }],
          deck: ["BT1-009", "BT1-010", "BT1-011", "BT1-012"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoOrderCards: true },
    );
    await s.ready();

    await advance(s.engine).verb.digivolveFromInstance(s.perm("base").permanentId, s.inst("jazardmon").instanceId);

    expect(s.perm("base").topCard.cardId).toBe("EX3-048");
    expect(s.perm("hina").isSuspended).toBe(true);
    expect(s.decisions.filter(({ req }) => req.sourceCardId === "EX3-065" && req.kind === "optional")).toHaveLength(1);
    assertNoLoudGap(s);
  });

  it.each([
    ["Rock Dragon", "EX3-011", "EX3-048", 3],
    ["Earth Dragon", "BT2-018", "BT1-020", 3],
    ["Machine Dragon", "EX3-048", "EX3-047", 2],
    ["Sky Dragon", "EX3-053", "BT1-020", 4],
  ])("recognizes the %s trait and pays the suspend cost", async (_trait, digimonCardId, baseCardId, memoryCost) => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "EX3-065", as: "hina" },
            { card: baseCardId, as: "base" },
          ],
          hand: [{ card: digimonCardId, as: "dragon" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true },
    );
    s.state.memory = memoryCost;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("dragon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard.cardId === digimonCardId);

    expect(s.perm("base").stack.map(({ cardId }) => cardId)).toEqual([baseCardId]);
    expect(s.perm("hina").isSuspended).toBe(true);
    assertNoLoudGap(s);
  });

  it("ignores an own Digimon that digivolves into a non-Dragon", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "EX3-065", as: "hina" },
          { card: "BT1-020", as: "base" },
        ],
        hand: [{ card: "BT1-025", as: "nonDragon" }],
      },
    });
    s.state.memory = 3;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("nonDragon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard.cardId === "BT1-025");

    expect(s.perm("hina").isSuspended).toBe(false);
    expect(s.decisions.filter(({ req }) => req.sourceCardId === "EX3-065")).toHaveLength(0);
    assertNoLoudGap(s);
  });

  it("ignores an eligible Dragon that digivolves on the opponent's side", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "EX3-065", as: "hina" }] },
      1: {
        battleArea: [{ card: "BT1-020", as: "opponentBase" }],
        hand: [{ card: "BT2-018", as: "opponentDragon" }],
      },
    });
    s.state.turnSeat = 1;
    s.state.memory = 3;
    await s.ready();

    const turn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(1);
    expect(
      s.engine.applyIntent(1, {
        type: "digivolve",
        permanentId: s.perm("opponentBase").permanentId,
        instanceId: s.inst("opponentDragon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("opponentBase").topCard.cardId === "BT2-018");
    expect(s.perm("hina").isSuspended).toBe(false);
    expect(s.decisions.filter(({ req }) => req.sourceCardId === "EX3-065")).toHaveLength(0);
    expect(s.engine.applyIntent(1, { type: "endPhase" })).toEqual({ ok: true });
    await turn;
    assertNoLoudGap(s);
  });

  it("cannot pay the suspend cost when Hina is already suspended", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "EX3-065", suspended: true, as: "hina" },
          { card: "EX3-048", as: "base" },
        ],
        hand: [{ card: "EX3-011", as: "dragon" }],
      },
    });
    s.state.memory = 3;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("dragon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard.cardId === "EX3-011");

    expect(s.perm("hina").isSuspended).toBe(true);
    expect(s.decisions.filter(({ req }) => req.sourceCardId === "EX3-065")).toHaveLength(0);
    assertNoLoudGap(s);
  });

  it("lets the player decline without suspending Hina or activating the Dragon's On Play effect", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "EX3-065", as: "hina" },
          { card: "BT1-020", as: "base" },
        ],
        hand: [{ card: "BT2-018", as: "volcanic" }],
        deck: ["BT1-009"],
      },
      1: { battleArea: [{ card: "BT1-028", dp: 3000, as: "weak" }] },
    });
    s.state.memory = 3;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("volcanic").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision?.kind === "optional");
    const optional = s.decisions.at(-1)!.req;
    expect(optional).toMatchObject({ sourceCardId: "EX3-065", kind: "optional" });
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: optional.decisionId,
        response: { kind: "optional", accept: false },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision === undefined);

    expect(s.perm("hina").isSuspended).toBe(false);
    expect(s.state.players[1]!.battleArea.map(({ permanentId }) => permanentId)).toContain(s.perm("weak").permanentId);
    assertNoLoudGap(s);
  });

  it("Q3430 lets two Hinas resolve one at a time and suspend independently", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "EX3-065", as: "firstHina" },
            { card: "EX3-065", as: "secondHina" },
            { card: "BT1-020", as: "base" },
          ],
          hand: [{ card: "BT2-018", as: "volcanic" }],
          deck: ["BT1-009"],
        },
        1: { battleArea: [{ card: "BT1-028", dp: 3000, as: "weak" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true, autoOrderTriggers: true },
    );
    s.state.memory = 3;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("volcanic").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("firstHina").isSuspended && s.perm("secondHina").isSuspended);

    expect(s.perm("firstHina").isSuspended).toBe(true);
    expect(s.perm("secondHina").isSuspended).toBe(true);
    expect(s.decisions.filter(({ req }) => req.sourceCardId === "EX3-065" && req.kind === "optional")).toHaveLength(2);
    assertNoLoudGap(s);
  });

  it("Q3430 skips the second Hina when the first activation removes the evolved Digimon", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "EX3-065", as: "firstHina" },
            { card: "EX3-065", as: "secondHina" },
            { card: "BT1-020", as: "base" },
          ],
          hand: [{ card: "BT2-018", as: "volcanic" }],
          deck: ["BT1-009"],
        },
        1: { battleArea: [{ card: "BT5-112", dp: 3000, as: "zwartDefeat" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true, autoOrderTriggers: true },
    );
    s.state.memory = 3;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("volcanic").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.trash.some(({ cardId }) => cardId === "BT2-018"));

    expect(s.perm("firstHina").isSuspended).toBe(true);
    expect(s.perm("secondHina").isSuspended).toBe(false);
    expect(s.decisions.filter(({ req }) => req.sourceCardId === "EX3-065" && req.kind === "optional")).toHaveLength(1);
    assertNoLoudGap(s);
  });

  it("Security plays Hina without paying cost when checked by an attack", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT1-009", as: "attacker" }], security: ["BT1-010"] },
      1: { security: [{ card: "EX3-065", as: "securityHina" }] },
    });
    s.state.turnSeat = 0;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.battleArea.some(({ topCard }) => topCard.cardId === "EX3-065"));

    expect(s.state.players[1]!.battleArea.map(({ topCard }) => topCard.cardId)).toContain("EX3-065");
    expect(s.state.players[1]!.security).toHaveLength(0);
    assertNoLoudGap(s);
  });
});
