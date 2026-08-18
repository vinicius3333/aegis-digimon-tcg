import { EffectTiming, getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { assertNoLoudGap, setupEngine, settle } from "../../engine/testkit/harness.js";
import "./EX3-065.js";
import "./EX3-048.js";
import "../BT2/BT2-018.js";
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
      imageId: "EX3-065",
    });
    expect(definition.effectText).toContain("[Start of Your Turn]");
    expect(definition.effectText).toContain("[Rock Dragon], [Earth Dragon], [Machine Dragon], or [Sky Dragon]");
    expect(definition.securityEffectText).toBe("[Security] Play this card without paying the cost.");
  });

  it("gains exactly 1 memory at the start of its owner's turn when the opponent has a battle-area Digimon", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "EX3-065", as: "hina" }] },
      1: { battleArea: [{ card: "BT1-028", as: "opponent" }] },
    });
    s.state.memory = 0;
    await s.ready();

    await advance(s.engine).fireForPermanent(EffectTiming.OnStartTurn, s.perm("hina"));

    expect(s.state.memory).toBe(1);
    assertNoLoudGap(s);
  });

  it("does not gain memory without an opposing battle-area Digimon, from breeding, or on the opponent's turn", async () => {
    const empty = setupEngine({ 0: { battleArea: [{ card: "EX3-065", as: "hina" }] } });
    await empty.ready();
    await advance(empty.engine).fireForPermanent(EffectTiming.OnStartTurn, empty.perm("hina"));
    expect(empty.state.memory).toBe(0);

    const breeding = setupEngine({
      0: { battleArea: [{ card: "EX3-065", as: "hina" }] },
      1: { breeding: { card: "BT1-028", as: "breedingOnly" } },
    });
    await breeding.ready();
    await advance(breeding.engine).fireForPermanent(EffectTiming.OnStartTurn, breeding.perm("hina"));
    expect(breeding.state.memory).toBe(0);

    const opponentTurn = setupEngine({
      0: { battleArea: [{ card: "EX3-065", as: "hina" }] },
      1: { battleArea: [{ card: "BT1-028", as: "opponent" }] },
    });
    opponentTurn.state.turnSeat = 1;
    await opponentTurn.ready();
    await advance(opponentTurn.engine).fireForPermanent(EffectTiming.OnStartTurn, opponentTurn.perm("hina"));
    expect(opponentTurn.state.memory).toBe(0);
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
          deck: ["BT1-001"],
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
      timing: "OnEnterFieldAnyone",
    });
    assertNoLoudGap(s);
  });

  it("does not trigger when an eligible Dragon is played instead of digivolved", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX3-065", as: "hina" }],
          hand: [{ card: "EX3-048", as: "jazardmon" }],
          deck: ["BT1-001", "BT1-002", "BT1-003", "BT1-004"],
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
          deck: ["BT1-001", "BT1-002", "BT1-003", "BT1-004"],
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
    ["Rock Dragon", "EX3-011"],
    ["Machine Dragon", "EX3-048"],
    ["Sky Dragon", "EX3-053"],
  ])("recognizes the %s trait and pays the suspend cost", async (_trait, digimonCardId) => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "EX3-065", as: "hina" },
            { card: digimonCardId, as: "dragon" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true },
    );
    await s.ready();

    await advance(s.engine).fireForPermanent(EffectTiming.OnEnterFieldAnyone, s.perm("hina"), {
      subjectPermanentId: s.perm("dragon").permanentId,
      entryCause: "digivolve",
    });

    expect(s.perm("hina").isSuspended).toBe(true);
    assertNoLoudGap(s);
  });

  it("ignores a non-Dragon evolution, an opposing Dragon, the opponent's turn, and an already suspended Hina", async () => {
    const scenarios = [
      { subject: "nonDragon", turnSeat: 0 as const, suspended: false },
      { subject: "opposingDragon", turnSeat: 0 as const, suspended: false },
      { subject: "ownDragon", turnSeat: 1 as const, suspended: false },
      { subject: "ownDragon", turnSeat: 0 as const, suspended: true },
    ];

    for (const scenario of scenarios) {
      const s = setupEngine({
        0: {
          battleArea: [
            { card: "EX3-065", suspended: scenario.suspended, as: "hina" },
            { card: "BT1-025", as: "nonDragon" },
            { card: "BT2-018", as: "ownDragon" },
          ],
        },
        1: { battleArea: [{ card: "BT2-018", as: "opposingDragon" }] },
      });
      s.state.turnSeat = scenario.turnSeat;
      await s.ready();

      await advance(s.engine).fireForPermanent(EffectTiming.OnEnterFieldAnyone, s.perm("hina"), {
        subjectPermanentId: s.perm(scenario.subject).permanentId,
        entryCause: "digivolve",
      });

      expect(s.decisions.filter(({ req }) => req.sourceCardId === "EX3-065")).toHaveLength(0);
      expect(s.perm("hina").isSuspended).toBe(scenario.suspended);
      assertNoLoudGap(s);
    }
  });

  it("lets the player decline without suspending Hina or activating the Dragon's On Play effect", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "EX3-065", as: "hina" },
          { card: "BT1-020", as: "base" },
        ],
        hand: [{ card: "BT2-018", as: "volcanic" }],
        deck: ["BT1-001"],
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
          deck: ["BT1-001"],
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
          deck: ["BT1-001"],
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

  it("Security plays Hina unconditionally even when the opponent has no Digimon", async () => {
    const s = setupEngine({ 0: { security: [{ card: "EX3-065", faceUp: true, as: "securityHina" }] } });
    await s.ready();

    await advance(s.engine).fireForInstance(EffectTiming.SecuritySkill, s.inst("securityHina"));
    await settle(() => s.state.players[0]!.battleArea.some(({ topCard }) => topCard.cardId === "EX3-065"));

    expect(s.state.players[0]!.battleArea.map(({ topCard }) => topCard.cardId)).toContain("EX3-065");
    expect(s.state.players[0]!.security).toHaveLength(0);
    assertNoLoudGap(s);
  });
});
