import { EffectTiming, getCardDefinition, Phase } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { definitionOf } from "../../engine/cards/cardData.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "./EX3-020.js";
import "./EX3-074.js";

describe("EX3-020 Wingdramon", () => {
  it("has its printed identity, both normal evolution colors, and alternate Coredramon requirement", () => {
    expect(getCardDefinition("EX3-020")).toMatchObject({
      cardId: "EX3-020",
      nameEn: "Wingdramon",
      colors: ["Blue"],
      level: 5,
      playCost: 7,
      dp: 7000,
      evoCosts: [
        { color: "Blue", level: 4, memoryCost: 4 },
        { color: "Green", level: 4, memoryCost: 4 },
      ],
      forms: ["Ultimate"],
      attributes: ["Vaccine"],
      types: ["Sky Dragon"],
      rarity: "U",
      imageId: "EX3-020",
    });
  });

  it("digivolves for 3 from Coredramon through its alternate path", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "EX3-018", as: "coredramon" }],
        hand: [{ card: "EX3-020", as: "wingdramon" }],
        deck: ["BT1-030"],
      },
    });
    s.state.memory = 3;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("coredramon").permanentId,
        instanceId: s.inst("wingdramon").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("coredramon").topCard.cardId === "EX3-020");
    expect(s.state.memory).toBe(0);
  });

  it("uses the normal cost 4 from an unrelated blue level 4", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT1-032", as: "frigimon" }],
        hand: [{ card: "EX3-020", as: "wingdramon" }],
        deck: ["BT1-030"],
      },
    });
    s.state.memory = 4;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("frigimon").permanentId,
        instanceId: s.inst("wingdramon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("frigimon").topCard.cardId === "EX3-020");
    expect(s.state.memory).toBe(0);
  });

  it("its printed Evade suspends it and prevents effect deletion when accepted", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "EX3-020", as: "wingdramon" }] } });
    await s.ready();
    const deletion = advance(s.engine).verb.deletePermanent([s.perm("wingdramon").permanentId], "byEffect");
    await settle(() => s.events.some(({ kind }) => kind === "evadePrompt"));
    expect(
      s.engine.applyIntent(0, {
        type: "respondEvade",
        permanentId: s.perm("wingdramon").permanentId,
        accept: true,
      }),
    ).toEqual({ ok: true });
    await deletion;
    expect(s.perm("wingdramon").isSuspended).toBe(true);
  });

  it("deletes Wingdramon when Evade is declined and does not offer Evade when already suspended", async () => {
    const declined = setupEngine({ 0: { battleArea: [{ card: "EX3-020", as: "wingdramon" }] } });
    await declined.ready();
    const deletion = advance(declined.engine).verb.deletePermanent(
      [declined.perm("wingdramon").permanentId],
      "byEffect",
    );
    await settle(() => declined.events.some(({ kind }) => kind === "evadePrompt"));
    expect(
      declined.engine.applyIntent(0, {
        type: "respondEvade",
        permanentId: declined.perm("wingdramon").permanentId,
        accept: false,
      }),
    ).toEqual({ ok: true });
    await deletion;
    expect(declined.state.players[0]!.battleArea).toHaveLength(0);
    expect(declined.state.players[0]!.trash.map(({ cardId }) => cardId)).toContain("EX3-020");

    const suspended = setupEngine({ 0: { battleArea: [{ card: "EX3-020", as: "wingdramon", suspended: true }] } });
    await suspended.ready();
    await advance(suspended.engine).verb.deletePermanent([suspended.perm("wingdramon").permanentId], "byEffect");
    expect(suspended.events.some(({ kind }) => kind === "evadePrompt")).toBe(false);
    expect(suspended.state.players[0]!.battleArea).toHaveLength(0);
  });

  it("grants inherited Evade only while its host has Dramon or Examon in its name", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "EX3-019", under: ["EX3-020"], as: "paledramon" },
          { card: "BT1-038", under: ["EX3-020"], as: "unrelated" },
        ],
      },
    });
    await s.ready();
    expect(observe(s.engine).hasKeyword(s.perm("paledramon"), "Evade")).toBe(true);
    expect(observe(s.engine).hasKeyword(s.perm("unrelated"), "Evade")).toBe(false);
  });

  it("the inherited Evade protects a Dramon host through the public response", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "EX3-019", under: ["EX3-020"], as: "host" }] } });
    await s.ready();
    const deletion = advance(s.engine).verb.deletePermanent([s.perm("host").permanentId], "byEffect");
    await settle(() => s.events.some(({ kind }) => kind === "evadePrompt"));
    expect(
      s.engine.applyIntent(0, {
        type: "respondEvade",
        permanentId: s.perm("host").permanentId,
        accept: true,
      }),
    ).toEqual({ ok: true });
    await deletion;
    expect(s.perm("host").isSuspended).toBe(true);
    expect(s.perm("host").stack.map(({ cardId }) => cardId)).toContain("EX3-020");
  });

  it("scopes level 6 treatment to own-turn DNA into Examon, not normal evolution or opponent turn", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "EX3-020", as: "wingdramon" }],
        hand: [{ card: "EX3-074", as: "examon" }],
      },
    });
    s.state.memory = 10;
    await s.ready();
    const examon = definitionOf("EX3-074");
    expect(advance(s.engine).ledgers.continuous.dnaLevelFor(s.perm("wingdramon").permanentId, examon)).toBe(6);
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("wingdramon").permanentId,
        instanceId: s.inst("examon").instanceId,
      }),
    ).toMatchObject({ ok: false });
    expect(s.perm("wingdramon").topCard.cardId).toBe("EX3-020");

    s.state.turnSeat = 1;
    await advance(s.engine).recompute();
    expect(advance(s.engine).ledgers.continuous.dnaLevelFor(s.perm("wingdramon").permanentId, examon)).toBeUndefined();
  });

  it("uses the public end-of-turn window and re-evaluates a second Wingdramon after the first DNA", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "EX3-020", as: "firstWingdramon" },
            { card: "EX3-020", as: "secondWingdramon" },
            { card: "BT20-044", as: "breakdramon" },
          ],
          hand: [{ card: "EX3-074", as: "examon" }],
          deck: ["BT1-029", "BT1-030"],
        },
        1: { deck: ["BT1-009", "BT1-010"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoOrderTriggers: true, preferInstanceIds: preferred },
    );
    preferred.push(s.perm("breakdramon").permanentId, s.inst("examon").instanceId);
    await s.ready();

    const mainPhase = (s.engine as unknown as { mainPhase: { isOpen: boolean } }).mainPhase;
    const turn = s.engine.runOneTurn();
    await settle(() => mainPhase.isOpen && s.state.phase === Phase.Main && s.state.turnSeat === 0);
    expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
    await turn;

    expect(s.state.players[0]!.battleArea.filter(({ topCard }) => topCard.cardId === "EX3-074")).toHaveLength(1);
    expect(s.state.players[0]!.battleArea.filter(({ topCard }) => topCard.cardId === "EX3-020")).toHaveLength(1);
    expect(s.decisions.filter(({ req }) => req.sourceCardId === "EX3-020" && req.kind === "optional")).toHaveLength(1);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("allows the public end-of-turn DNA optional to be declined without changing cards or memory", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "EX3-020", as: "wingdramon" },
          { card: "BT20-044", as: "breakdramon" },
        ],
        hand: [{ card: "EX3-074", as: "examon" }],
        deck: ["BT1-029"],
      },
      1: { deck: ["BT1-009"] },
    });
    s.state.memory = 3;
    await s.ready();

    const mainPhase = (s.engine as unknown as { mainPhase: { isOpen: boolean } }).mainPhase;
    const turn = s.engine.runOneTurn();
    await settle(() => mainPhase.isOpen && s.state.phase === Phase.Main);
    expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision?.kind === "optional");
    const memoryAtPrompt = s.state.memory;
    const optional = s.decisions.at(-1)!.req;
    expect(optional).toMatchObject({
      seat: 0,
      sourceCardId: "EX3-020",
      kind: "optional",
      options: {
        timing: "EndOfYourTurn",
        effectText: expect.stringContaining("may DNA digivolve"),
      },
    });
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: s.state.pendingDecision!.decisionId,
        response: { kind: "optional", accept: false },
      }),
    ).toEqual({ ok: true });
    await turn;

    expect(s.state.players[0]!.battleArea.map(({ topCard }) => topCard.cardId)).toEqual(["EX3-020", "BT20-044"]);
    expect(s.state.players[0]!.hand.map(({ cardId }) => cardId)).toEqual(["EX3-074"]);
    expect(s.state.memory).toBe(memoryAtPrompt);
  });

  it("shows only compatible Dramon partners and Examon results while keeping invalid choices visible", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "EX3-020", as: "wingdramon" },
            { card: "BT20-044", as: "firstBreakdramon" },
            { card: "BT20-044", as: "secondBreakdramon" },
            { card: "EX3-021", as: "incompatibleCrysPaledramon" },
            { card: "BT1-032", as: "notDramon" },
          ],
          hand: [
            { card: "EX3-074", as: "firstExamon" },
            { card: "EX3-074", as: "secondExamon" },
            { card: "EX3-063", as: "incompatibleDna" },
            { card: "EX3-024", as: "normalEvolution" },
          ],
        },
        1: { battleArea: [{ card: "BT20-044", as: "opponentBreakdramon" }] },
      },
      { autoAcceptOptional: true },
    );
    await s.ready();

    const resolution = advance(s.engine).fire(EffectTiming.OnEndTurn, s.perm("wingdramon"));
    await settle(() => s.state.pendingDecision?.kind === "chooseTargets");
    const partner = s.decisions.at(-1)!.req;
    expect(partner).toMatchObject({
      seat: 0,
      sourceCardId: "EX3-020",
      kind: "chooseTargets",
      options: {
        candidateInstanceIds: expect.arrayContaining([
          s.perm("firstBreakdramon").permanentId,
          s.perm("secondBreakdramon").permanentId,
        ]),
        min: 1,
        max: 1,
        timing: "EndOfYourTurn",
        effectText: expect.stringContaining("may DNA digivolve"),
      },
    });
    expect(partner.options?.candidateInstanceIds).not.toContain(s.perm("incompatibleCrysPaledramon").permanentId);
    expect(partner.options?.candidateInstanceIds).not.toContain(s.perm("notDramon").permanentId);
    expect(partner.options?.candidateInstanceIds).toHaveLength(2);
    expect(partner.options?.visibleInstanceIds).toEqual(
      expect.arrayContaining([
        s.perm("firstBreakdramon").permanentId,
        s.perm("secondBreakdramon").permanentId,
        s.perm("incompatibleCrysPaledramon").permanentId,
      ]),
    );
    expect(partner.options?.visibleInstanceIds).not.toContain(s.perm("opponentBreakdramon").permanentId);
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: s.state.pendingDecision!.decisionId,
        response: { kind: "chooseTargets", instanceIds: [s.perm("firstBreakdramon").permanentId] },
      }),
    ).toEqual({ ok: true });

    await settle(() => s.state.pendingDecision?.kind === "selectCards");
    const result = s.decisions.at(-1)!.req;
    expect(result).toMatchObject({
      seat: 0,
      sourceCardId: "EX3-020",
      kind: "selectCards",
      options: {
        candidateInstanceIds: expect.arrayContaining([
          s.inst("firstExamon").instanceId,
          s.inst("secondExamon").instanceId,
        ]),
        visibleInstanceIds: expect.arrayContaining([
          s.inst("firstExamon").instanceId,
          s.inst("secondExamon").instanceId,
          s.inst("incompatibleDna").instanceId,
          s.inst("normalEvolution").instanceId,
        ]),
        min: 1,
        max: 1,
        timing: "EndOfYourTurn",
        effectText: expect.stringContaining("may DNA digivolve"),
      },
    });
    expect(result.options?.candidateInstanceIds).toHaveLength(2);
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: s.state.pendingDecision!.decisionId,
        response: { kind: "selectCards", instanceIds: [s.inst("firstExamon").instanceId] },
      }),
    ).toEqual({ ok: true });
    await resolution;

    const evolved = s.state.players[0]!.battleArea.find(({ topCard }) => topCard.cardId === "EX3-074")!;
    expect(evolved.stack.map(({ cardId }) => cardId)).toEqual(expect.arrayContaining(["EX3-020", "BT20-044"]));
    expect(s.state.players[0]!.hand.map(({ cardId }) => cardId)).toEqual(
      expect.arrayContaining(["EX3-074", "EX3-063"]),
    );
    expect(s.state.players[0]!.battleArea.some(({ topCard }) => topCard.cardId === "EX3-024")).toBe(false);
  });

  it("Sky Dragon family: treats Wingdramon as blue level 6 only for Examon and completes end-turn DNA", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "EX3-020", as: "wingdramon" },
            { card: "BT20-044", as: "breakdramon" },
          ],
          hand: [
            { card: "EX3-074", as: "examon" },
            { card: "BT1-032", as: "invalidResult" },
          ],
          deck: ["BT1-030"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferred },
    );
    preferred.push(s.perm("breakdramon").permanentId, s.inst("examon").instanceId);
    await s.ready();

    const examonDefinition = definitionOf(s.inst("examon").cardId);
    const invalidDefinition = definitionOf(s.inst("invalidResult").cardId);
    expect(advance(s.engine).ledgers.continuous.dnaLevelFor(s.perm("wingdramon").permanentId, examonDefinition)).toBe(
      6,
    );
    expect(
      advance(s.engine).ledgers.continuous.dnaLevelFor(s.perm("wingdramon").permanentId, invalidDefinition),
    ).toBeUndefined();

    await advance(s.engine).fire(EffectTiming.OnEndTurn, s.perm("wingdramon"));
    await settle(() => s.state.players[0]!.battleArea.some(({ topCard }) => topCard.cardId === "EX3-074"));

    expect(s.state.players[0]!.battleArea.map(({ topCard }) => topCard.cardId)).toEqual(["EX3-074"]);
    const examon = s.state.players[0]!.battleArea[0]!;
    expect(examon.stack.map(({ cardId }) => cardId)).toEqual(expect.arrayContaining(["EX3-020", "BT20-044"]));
    expect(s.state.players[0]!.hand.map(({ cardId }) => cardId)).toContain("BT1-032");
  });

  it("does not offer the optional end-turn DNA effect when no legal DNA result is in hand", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "EX3-020", as: "wingdramon" },
          { card: "BT20-044", as: "breakdramon" },
        ],
        hand: [{ card: "BT1-032", as: "invalidResult" }],
      },
    });
    await s.ready();
    await advance(s.engine).fire(EffectTiming.OnEndTurn, s.perm("wingdramon"));
    expect(s.state.pendingDecision).toBeUndefined();
    expect(s.decisions.filter(({ req }) => req.sourceCardId === "EX3-020")).toHaveLength(0);
  });

  it("offers the UI only legal Examon results with Wingdramon as the effect source", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "EX3-020", as: "wingdramon" },
            { card: "BT20-044", as: "breakdramon" },
          ],
          hand: [
            { card: "EX3-074", as: "firstExamon" },
            { card: "EX3-074", as: "secondExamon" },
            { card: "BT1-032", as: "invalidResult" },
          ],
          deck: ["BT1-030"],
        },
      },
      { autoAcceptOptional: true },
    );
    await s.ready();

    const firing = advance(s.engine).fire(EffectTiming.OnEndTurn, s.perm("wingdramon"));
    await settle(() => s.state.pendingDecision?.kind === "selectCards");
    const decision = s.state.pendingDecision!;
    const payload = JSON.parse(decision.payloadJson) as { candidateInstanceIds: string[] };
    expect(s.decisions.at(-1)!.req.sourceCardId).toBe("EX3-020");
    expect(payload.candidateInstanceIds).toEqual(
      expect.arrayContaining([s.inst("firstExamon").instanceId, s.inst("secondExamon").instanceId]),
    );
    expect(payload.candidateInstanceIds).not.toContain(s.inst("invalidResult").instanceId);

    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: decision.decisionId,
        response: { kind: "selectCards", instanceIds: [s.inst("firstExamon").instanceId] },
      }),
    ).toEqual({ ok: true });
    await firing;
    expect(s.state.players[0]!.battleArea.map(({ topCard }) => topCard.cardId)).toContain("EX3-074");
  });
});
