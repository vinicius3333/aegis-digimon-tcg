import { EffectTiming, getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { definitionOf } from "../../engine/cards/cardData.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "./EX3-041.js";
import "./EX3-044.js";
import "./EX3-063.js";
import "./EX3-074.js";

describe("EX3-041 Groundramon", () => {
  it("has the official identity and both printed evolution requirements", () => {
    expect(getCardDefinition("EX3-041")).toMatchObject({
      cardId: "EX3-041",
      nameEn: "Groundramon",
      colors: ["Green"],
      level: 5,
      playCost: 7,
      dp: 7000,
      evoCosts: [
        { color: "Green", level: 4, memoryCost: 4 },
        { color: "Blue", level: 4, memoryCost: 4 },
      ],
      forms: ["Ultimate"],
      attributes: ["Virus"],
      types: ["Earth Dragon"],
      rarity: "U",
      maxCountInDeck: 4,
      imageId: "EX3-041",
    });
  });

  it("digivolves from Coredramon for alternate cost 3 and otherwise uses printed cost 4", async () => {
    const alternate = setupEngine({
      0: {
        battleArea: [{ card: "EX3-039", as: "coredramon" }],
        hand: [{ card: "EX3-041", as: "groundramon" }],
        deck: ["BT1-003"],
      },
    });
    alternate.state.memory = 3;
    await alternate.ready();
    expect(
      alternate.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: alternate.perm("coredramon").permanentId,
        instanceId: alternate.inst("groundramon").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: true });
    await settle(() => alternate.perm("coredramon").topCard.cardId === "EX3-041");
    expect(alternate.state.memory).toBe(0);

    const normal = setupEngine({
      0: {
        battleArea: [{ card: "BT1-072", as: "greenLevel4" }],
        hand: [{ card: "EX3-041", as: "groundramon" }],
        deck: ["BT1-003"],
      },
    });
    normal.state.memory = 4;
    await normal.ready();
    expect(
      normal.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: normal.perm("greenLevel4").permanentId,
        instanceId: normal.inst("groundramon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => normal.perm("greenLevel4").topCard.cardId === "EX3-041");
    expect(normal.state.memory).toBe(0);
  });

  it("uses printed cost 4 from blue or green level 4 bases unless the base is Coredramon", async () => {
    const blue = setupEngine({
      0: {
        battleArea: [{ card: "BT1-032", as: "frigimon" }],
        hand: [{ card: "EX3-041", as: "groundramon" }],
        deck: ["BT1-003"],
      },
    });
    blue.state.memory = 4;
    await blue.ready();

    expect(
      blue.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: blue.perm("frigimon").permanentId,
        instanceId: blue.inst("groundramon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => blue.perm("frigimon").topCard.cardId === "EX3-041");
    expect(blue.state.memory).toBe(0);

    const invalidAlternate = setupEngine({
      0: {
        battleArea: [{ card: "BT1-072", as: "nonCoredramon" }],
        hand: [{ card: "EX3-041", as: "groundramon" }],
      },
    });
    invalidAlternate.state.memory = 4;
    await invalidAlternate.ready();
    expect(
      invalidAlternate.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: invalidAlternate.perm("nonCoredramon").permanentId,
        instanceId: invalidAlternate.inst("groundramon").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: true });
    await settle(() => invalidAlternate.perm("nonCoredramon").topCard.cardId === "EX3-041");
    expect(invalidAlternate.state.memory).toBe(0);
  });

  it("its printed Blocker redirects an opposing player attack", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT1-028", as: "attacker" }] },
      1: {
        battleArea: [{ card: "EX3-041", as: "groundramon" }],
        security: ["BT1-003"],
      },
    });
    await s.ready();
    expect(observe(s.engine).hasKeyword(s.perm("groundramon"), "Blocker")).toBe(true);
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.events.some(({ kind }) => kind === "blockWindowOpened"));
    expect(
      s.engine.applyIntent(1, {
        type: "declareBlock",
        blockerPermanentId: s.perm("groundramon").permanentId,
      }),
    ).toEqual({ ok: true });
    await settle(() => !s.state.players[0]!.battleArea.some(({ topCard }) => topCard.cardId === "BT1-028"));
    expect(s.perm("groundramon").isSuspended).toBe(true);
    expect(s.state.players[1]!.security).toHaveLength(1);
  });

  it("Earth Dragon family: treats Groundramon as level 6 only for Examon and completes end-turn DNA", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "EX3-041", as: "groundramon" },
            { card: "BT20-027", as: "slayerdramon" },
          ],
          hand: [
            { card: "EX3-074", as: "examon" },
            { card: "BT1-072", as: "invalidResult" },
          ],
          deck: ["BT1-003"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferred },
    );
    preferred.push(s.perm("slayerdramon").permanentId, s.inst("examon").instanceId);
    await s.ready();

    expect(
      advance(s.engine).ledgers.continuous.dnaLevelFor(s.perm("groundramon").permanentId, definitionOf("EX3-074")),
    ).toBe(6);
    expect(
      advance(s.engine).ledgers.continuous.dnaLevelFor(s.perm("groundramon").permanentId, definitionOf("BT1-072")),
    ).toBeUndefined();

    await advance(s.engine).fire(EffectTiming.OnEndTurn, s.perm("groundramon"));
    await settle(() => s.state.players[0]!.battleArea.some(({ topCard }) => topCard.cardId === "EX3-074"));
    const examon = s.state.players[0]!.battleArea.find(({ topCard }) => topCard.cardId === "EX3-074")!;
    expect(examon.stack.map(({ cardId }) => cardId)).toEqual(expect.arrayContaining(["EX3-041", "BT20-027"]));
    expect(s.state.players[0]!.hand.map(({ cardId }) => cardId)).toContain("BT1-072");
  });

  it("does not offer end-turn DNA without another Dramon or a legal result", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "EX3-041", as: "groundramon" },
          { card: "BT1-072", as: "unrelated" },
        ],
        hand: [{ card: "EX3-074", as: "examon" }],
      },
    });
    await s.ready();
    await advance(s.engine).fire(EffectTiming.OnEndTurn, s.perm("groundramon"));
    expect(s.state.pendingDecision).toBeUndefined();
    expect(s.decisions.filter(({ req }) => req.sourceCardId === "EX3-041")).toHaveLength(0);
  });

  it("does not treat a normal Groundramon evolution as an end-turn DNA result", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "EX3-041", as: "groundramon" },
            { card: "BT20-027", as: "slayerdramon" },
          ],
          hand: [{ card: "EX3-044", as: "breakdramon" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();

    await advance(s.engine).fire(EffectTiming.OnEndTurn, s.perm("groundramon"));
    await settle();

    expect(s.state.pendingDecision).toBeUndefined();
    expect(s.decisions.filter(({ req }) => req.sourceCardId === "EX3-041")).toHaveLength(0);
    expect(s.state.players[0]!.battleArea.map(({ topCard }) => topCard.cardId)).toEqual(["EX3-041", "BT20-027"]);
    expect(s.state.players[0]!.hand.map(({ cardId }) => cardId)).toContain("EX3-044");
  });

  it("allows one refusal of the optional end-turn DNA without changing the game", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "EX3-041", as: "groundramon" },
          { card: "BT20-027", as: "slayerdramon" },
        ],
        hand: [{ card: "EX3-074", as: "examon" }],
      },
    });
    s.state.memory = 3;
    await s.ready();

    const resolution = advance(s.engine).fire(EffectTiming.OnEndTurn, s.perm("groundramon"));
    await settle(() => s.state.pendingDecision?.kind === "optional");
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: s.state.pendingDecision!.decisionId,
        response: { kind: "optional", accept: false },
      }),
    ).toEqual({ ok: true });
    await resolution;

    expect(s.decisions.filter(({ req }) => req.sourceCardId === "EX3-041")).toHaveLength(1);
    expect(s.state.players[0]!.battleArea.map(({ topCard }) => topCard.cardId)).toEqual(["EX3-041", "BT20-027"]);
    expect(s.state.players[0]!.hand.map(({ cardId }) => cardId)).toEqual(["EX3-074"]);
    expect(s.state.memory).toBe(3);
  });

  it("does not use Examon's DNA-only level treatment for a normal digivolution", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "EX3-041", as: "groundramon" }],
        hand: [{ card: "EX3-074", as: "examon" }],
      },
    });
    s.state.memory = 10;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("groundramon").permanentId,
        instanceId: s.inst("examon").instanceId,
      }),
    ).toMatchObject({ ok: false });
    expect(s.perm("groundramon").topCard.cardId).toBe("EX3-041");
    expect(s.state.players[0]!.hand.map(({ cardId }) => cardId)).toContain("EX3-074");
    expect(s.state.memory).toBe(10);
  });

  it("offers only Dramon partners that complete a legal DNA recipe", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "EX3-041", as: "groundramon" },
            { card: "BT20-027", as: "firstSlayerdramon" },
            { card: "BT20-027", as: "secondSlayerdramon" },
            { card: "EX3-044", as: "incompatibleBreakdramon" },
          ],
          hand: [
            { card: "EX3-074", as: "firstExamon" },
            { card: "EX3-074", as: "secondExamon" },
            { card: "EX3-063", as: "incompatibleDnaResult" },
            { card: "EX3-044", as: "normalEvolutionOnly" },
          ],
        },
      },
      { autoAcceptOptional: true },
    );
    await s.ready();

    const resolution = advance(s.engine).fire(EffectTiming.OnEndTurn, s.perm("groundramon"));
    await settle(() => s.state.pendingDecision?.kind === "chooseTargets");

    const partnerRequest = s.decisions.at(-1)!.req;
    expect(partnerRequest).toMatchObject({
      kind: "chooseTargets",
      sourceCardId: "EX3-041",
      options: {
        candidateInstanceIds: expect.arrayContaining([
          s.perm("firstSlayerdramon").permanentId,
          s.perm("secondSlayerdramon").permanentId,
        ]),
        min: 1,
        max: 1,
        timing: "EndOfYourTurn",
      },
    });
    expect(partnerRequest.options?.candidateInstanceIds).toHaveLength(2);
    expect(partnerRequest.options?.candidateInstanceIds).not.toContain(s.perm("incompatibleBreakdramon").permanentId);
    expect(partnerRequest.options?.visibleInstanceIds).toEqual(
      expect.arrayContaining([
        s.perm("firstSlayerdramon").permanentId,
        s.perm("secondSlayerdramon").permanentId,
        s.perm("incompatibleBreakdramon").permanentId,
      ]),
    );

    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: s.state.pendingDecision!.decisionId,
        response: { kind: "chooseTargets", instanceIds: [s.perm("firstSlayerdramon").permanentId] },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision?.kind === "selectCards");
    const resultRequest = s.decisions.at(-1)!.req;
    expect(resultRequest).toMatchObject({
      kind: "selectCards",
      sourceCardId: "EX3-041",
      options: {
        candidateInstanceIds: expect.arrayContaining([
          s.inst("firstExamon").instanceId,
          s.inst("secondExamon").instanceId,
        ]),
        visibleInstanceIds: expect.arrayContaining([
          s.inst("firstExamon").instanceId,
          s.inst("secondExamon").instanceId,
          s.inst("incompatibleDnaResult").instanceId,
          s.inst("normalEvolutionOnly").instanceId,
        ]),
        min: 1,
        max: 1,
        timing: "EndOfYourTurn",
      },
    });
    expect(resultRequest.options?.candidateInstanceIds).toHaveLength(2);
    expect(resultRequest.options?.candidateInstanceIds).not.toContain(s.inst("incompatibleDnaResult").instanceId);
    expect(resultRequest.options?.candidateInstanceIds).not.toContain(s.inst("normalEvolutionOnly").instanceId);
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: s.state.pendingDecision!.decisionId,
        response: { kind: "selectCards", instanceIds: [s.inst("firstExamon").instanceId] },
      }),
    ).toEqual({ ok: true });
    await resolution;
    await settle(() => s.state.players[0]!.battleArea.some(({ topCard }) => topCard.cardId === "EX3-074"));
  });

  it("attributes the optional end-turn DNA decision to Groundramon's printed clause", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "EX3-041", as: "groundramon" },
            { card: "BT20-027", as: "slayerdramon" },
          ],
          hand: [
            { card: "EX3-074", as: "examon" },
            { card: "BT1-072", as: "invalid" },
          ],
          deck: ["BT1-003"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    await advance(s.engine).fire(EffectTiming.OnEndTurn, s.perm("groundramon"));
    const request = s.decisions.find(({ req }) => req.kind === "optional")!.req;
    expect(request).toMatchObject({
      kind: "optional",
      sourceCardId: "EX3-041",
      options: {
        timing: "EndOfYourTurn",
        effectText:
          "Digivolve: 3 from [Coredramon]＜Blocker＞ (When an opponent's Digimon attacks, you may suspend this Digimon to force the opponent to attack it instead.) [Your Turn] [Examon] in your hand can treat this Digimon as level 6 for DNA digivolution.[End of Your Turn] This Digimon and 1 of your other Digimon with [Dramon] in its name may DNA digivolve into a Digimon card in your hand by paying its DNA digivolve cost.",
      },
    });
  });

  it("inherited Blocker applies only while the host name contains Dramon or Examon", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "EX3-020", under: ["EX3-041"], as: "wingdramon" },
          { card: "EX3-074", under: ["EX3-041"], as: "examon" },
          { card: "BT1-072", under: ["EX3-041"], as: "unrelated" },
        ],
      },
    });
    await s.ready();
    expect(observe(s.engine).hasKeyword(s.perm("wingdramon"), "Blocker")).toBe(true);
    expect(observe(s.engine).hasKeyword(s.perm("examon"), "Blocker")).toBe(true);
    expect(observe(s.engine).hasKeyword(s.perm("unrelated"), "Blocker")).toBe(false);
  });
});
