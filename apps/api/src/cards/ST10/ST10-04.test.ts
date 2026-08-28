import { EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "../BT8/BT8-082.js";
import "../BT9/BT9-040.js";
import "../BT9/BT9-082.js";
import "./ST10-04.js";
import "./ST10-06.js";

describe("ST10-04 Gatomon", () => {
  it("adds one yellow and one purple Digimon from the revealed top 3", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "ST10-04", as: "gatomon" }],
          deck: [
            { card: "ST10-02", as: "yellow" },
            { card: "ST10-07", as: "purple" },
            { card: "ST10-14", as: "rest" },
          ],
        },
      },
      { autoOrderTriggers: true, autoSelectCards: true },
    );
    s.state.memory = 5;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("gatomon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.hand.length === 2);
    expect(s.state.players[0]!.hand.map((c) => c.instanceId)).toEqual(
      expect.arrayContaining([s.inst("yellow").instanceId, s.inst("purple").instanceId]),
    );
    expect(s.state.players[0]!.deck.map((c) => c.instanceId)).toEqual([s.inst("rest").instanceId]);
  });

  it("requires a choice when a mandatory reveal slot has multiple matches", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "ST10-04", as: "gatomon" }],
          deck: [
            { card: "ST10-02", as: "yellowA" },
            { card: "BT1-048", as: "yellowB" },
            { card: "ST10-07", as: "purple" },
          ],
        },
      },
      { autoOrderTriggers: false },
    );
    s.state.memory = 5;

    expect(
      s.engine.applyIntent(0, {
        type: "playCard",
        instanceId: s.inst("gatomon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision?.kind === "selectCards");
    expect(s.decisions.at(-1)?.req.sourceCardId).toBe("ST10-04");
    const pending = s.state.pendingDecision!;
    const payload = JSON.parse(pending.payloadJson) as { min: number; max: number };
    expect(payload).toMatchObject({ min: 1, max: 1 });
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: pending.decisionId,
        response: { kind: "selectCards", instanceIds: [] },
      }),
    ).toEqual({ ok: false, reason: "decision-pending" });
  });

  it("shows the full reveal and confirms even a single eligible card", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "ST10-04", as: "gatomon" }],
          deck: [
            { card: "ST10-02", as: "yellow" },
            { card: "ST10-07", as: "purple" },
            { card: "ST10-14", as: "ineligible" },
          ],
        },
      },
      { autoOrderTriggers: true, autoSelectCards: false },
    );
    s.state.memory = 5;

    expect(
      s.engine.applyIntent(0, {
        type: "playCard",
        instanceId: s.inst("gatomon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision?.kind === "selectCards");

    const first = s.decisions.at(-1)!.req;
    expect(first.sourceCardId).toBe("ST10-04");
    expect(first.options?.candidateInstanceIds).toEqual([s.inst("yellow").instanceId]);
    expect(first.options?.visibleInstanceIds).toEqual(
      expect.arrayContaining([
        s.inst("yellow").instanceId,
        s.inst("purple").instanceId,
        s.inst("ineligible").instanceId,
      ]),
    );
    expect(first.options).toMatchObject({ min: 1, max: 1 });

    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: first.decisionId,
        response: { kind: "selectCards", instanceIds: [s.inst("yellow").instanceId] },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision?.kind === "selectCards" && s.decisions.length >= 3);

    const second = s.decisions.at(-1)!.req;
    expect(second.sourceCardId).toBe("ST10-04");
    expect(second.options?.candidateInstanceIds).toEqual([s.inst("purple").instanceId]);
    expect(second.options?.visibleInstanceIds).toEqual(
      expect.arrayContaining([
        s.inst("yellow").instanceId,
        s.inst("purple").instanceId,
        s.inst("ineligible").instanceId,
      ]),
    );
  });

  it("reduces its digivolution cost by 2 into an Archangel", async () => {
    const s = setupEngine(
      { 0: { battleArea: [{ card: "ST10-04", as: "gatomon" }], hand: [{ card: "ST10-05", as: "angewomon" }] } },
      { autoOrderTriggers: true },
    );
    s.state.memory = 3;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("gatomon").permanentId,
        instanceId: s.inst("angewomon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("gatomon").topCard.instanceId === s.inst("angewomon").instanceId);
    expect(s.state.memory).toBe(2);
  });

  it("may DNA digivolve its host and another Digimon at end of turn", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "ST10-05", as: "yellow", under: ["ST10-04"] },
            { card: "ST10-12", as: "purple" },
          ],
          hand: [{ card: "ST10-06", as: "mastemon" }],
        },
      },
      { autoAcceptOptional: true, autoOrderTriggers: true, autoSelectCards: true },
    );
    await advance(s.engine).fireForInstance(
      EffectTiming.OnEndTurn,
      s.perm("yellow").stack.find((c) => c.cardId === "ST10-04")!,
    );
    const result = s.state.players[0]!.battleArea.find((p) => p.topCard.instanceId === s.inst("mastemon").instanceId);
    expect(result).toBeDefined();
    expect(s.state.players[0]!.battleArea).toHaveLength(1);
    expect(result!.stack.map((card) => card.cardId)).toEqual(expect.arrayContaining(["ST10-04", "ST10-05", "ST10-12"]));
  });

  it("DNA digivolves two dual-color Ophanimon Falldown Mode into Ordinemon", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT8-082", as: "host", under: ["ST10-04"] },
            { card: "BT8-082", as: "partner" },
          ],
          hand: [{ card: "BT9-082", as: "ordinemon" }],
        },
      },
      {
        autoAcceptOptional: true,
        autoOrderTriggers: true,
        autoSelectCards: true,
        preferInstanceIds: preferred,
      },
    );
    preferred.push(s.perm("host").permanentId, s.perm("partner").permanentId, s.inst("ordinemon").instanceId);

    await advance(s.engine).fireForInstance(
      EffectTiming.OnEndTurn,
      s.perm("host").stack.find((card) => card.cardId === "ST10-04")!,
    );

    const ordinemon = s.state.players[0]!.battleArea.find(
      (permanent) => permanent.topCard.instanceId === s.inst("ordinemon").instanceId,
    );
    expect(ordinemon).toBeDefined();
    expect(s.state.players[0]!.battleArea).toHaveLength(1);
    expect(ordinemon!.stack.map((card) => card.cardId)).toEqual(["ST10-04", "BT8-082", "BT8-082"]);
  });

  it("DNA digivolves the two Falldown Mode during the real end-of-turn flow", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT8-082", as: "host", under: ["ST10-04"] },
            { card: "BT8-082", as: "partner" },
          ],
          hand: [{ card: "BT9-082", as: "ordinemon" }],
          deck: ["ST10-01"],
        },
        1: { deck: ["ST10-01"] },
      },
      {
        autoAcceptOptional: true,
        autoOrderTriggers: true,
        autoSelectCards: true,
        preferInstanceIds: preferred,
      },
    );
    preferred.push(s.perm("host").permanentId, s.perm("partner").permanentId, s.inst("ordinemon").instanceId);
    s.state.memory = 3;

    const turn = s.engine.runOneTurn();
    const mainPhase = (s.engine as unknown as { mainPhase: { isOpen: boolean } }).mainPhase;
    await settle(() => mainPhase.isOpen);
    expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
    await settle(() =>
      s.state.players[0]!.battleArea.some(
        (permanent) => permanent.topCard.instanceId === s.inst("ordinemon").instanceId,
      ),
    );
    await turn;

    const ordinemon = s.state.players[0]!.battleArea.find(
      (permanent) => permanent.topCard.instanceId === s.inst("ordinemon").instanceId,
    );
    expect(ordinemon).toBeDefined();
    expect(s.state.players[0]!.battleArea).toHaveLength(1);
    expect(ordinemon!.stack.map((card) => card.cardId)).toEqual(["ST10-04", "BT8-082", "BT8-082"]);
  });

  it("DNA digivolves the two Falldown Mode when memory crossing ends the turn", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT8-082", as: "host", under: ["ST10-04"] },
            { card: "BT8-082", as: "partner" },
          ],
          hand: [
            { card: "BT9-082", as: "ordinemon" },
            { card: "BT1-010", as: "memoryPass" },
          ],
          deck: ["ST10-01"],
        },
        1: { deck: ["ST10-01"] },
      },
      {
        autoAcceptOptional: true,
        autoOrderTriggers: true,
        autoSelectCards: true,
        preferInstanceIds: preferred,
      },
    );
    preferred.push(s.perm("host").permanentId, s.perm("partner").permanentId, s.inst("ordinemon").instanceId);
    s.state.memory = 2;

    const turn = s.engine.runOneTurn();
    const mainPhase = (s.engine as unknown as { mainPhase: { isOpen: boolean } }).mainPhase;
    await settle(() => mainPhase.isOpen);
    expect(
      s.engine.applyIntent(0, {
        type: "playCard",
        instanceId: s.inst("memoryPass").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() =>
      s.state.players[0]!.battleArea.some(
        (permanent) => permanent.topCard.instanceId === s.inst("ordinemon").instanceId,
      ),
    );
    await turn;

    const ordinemon = s.state.players[0]!.battleArea.find(
      (permanent) => permanent.topCard.instanceId === s.inst("ordinemon").instanceId,
    );
    expect(ordinemon).toBeDefined();
    expect(ordinemon!.stack.map((card) => card.cardId)).toEqual(["ST10-04", "BT8-082", "BT8-082"]);
  });

  it("keeps Gatomon's inherited DNA after Angewomon X evolves into Falldown Mode", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [
            {
              card: "BT9-040",
              as: "angewomonX",
              under: ["ST10-04", "ST10-05"],
            },
            { card: "BT8-082", as: "partner" },
          ],
          hand: [
            { card: "BT8-082", as: "hostOphanimon" },
            { card: "BT9-082", as: "ordinemon" },
          ],
          deck: ["BT1-010", "ST10-01"],
          security: ["BT1-011", "BT1-012", "BT1-013", "BT1-014", "BT1-015"],
        },
        1: { deck: ["ST10-01"] },
      },
      {
        autoAcceptOptional: true,
        autoOrderTriggers: true,
        autoSelectCards: true,
        preferInstanceIds: preferred,
      },
    );
    preferred.push(s.perm("angewomonX").permanentId, s.perm("partner").permanentId, s.inst("ordinemon").instanceId);
    s.state.memory = 2;

    const turn = s.engine.runOneTurn();
    const mainPhase = (s.engine as unknown as { mainPhase: { isOpen: boolean } }).mainPhase;
    await settle(() => mainPhase.isOpen);
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("angewomonX").permanentId,
        instanceId: s.inst("hostOphanimon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("angewomonX").topCard.instanceId === s.inst("hostOphanimon").instanceId);
    expect(s.state.memory).toBe(-2);
    await settle(() =>
      s.state.players[0]!.battleArea.some(
        (permanent) => permanent.topCard.instanceId === s.inst("ordinemon").instanceId,
      ),
    );
    await turn;

    const ordinemon = s.state.players[0]!.battleArea.find(
      (permanent) => permanent.topCard.instanceId === s.inst("ordinemon").instanceId,
    );
    expect(ordinemon).toBeDefined();
    expect(ordinemon!.stack.map((card) => card.cardId)).toEqual([
      "ST10-04",
      "ST10-05",
      "BT9-040",
      "BT8-082",
      "BT8-082",
    ]);
  });

  it("does not offer Ordinemon for two mono-yellow Ophanimon", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT2-040", as: "host", under: ["ST10-04"] },
            { card: "P-053", as: "partner" },
          ],
          hand: [{ card: "BT9-082", as: "ordinemon" }],
        },
      },
      {
        autoAcceptOptional: true,
        autoOrderTriggers: true,
        autoSelectCards: true,
      },
    );

    await advance(s.engine).fireForInstance(
      EffectTiming.OnEndTurn,
      s.perm("host").stack.find((card) => card.cardId === "ST10-04")!,
    );

    expect(s.state.players[0]!.battleArea).toHaveLength(2);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toContain(s.inst("ordinemon").instanceId);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("performs the inherited DNA during the real end-of-turn flow", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "ST10-05", as: "yellow", under: ["ST10-04"] },
            { card: "ST10-12", as: "purple" },
          ],
          hand: [
            { card: "ST10-06", as: "mastemon" },
            { card: "ST10-05", as: "normalEvolution" },
          ],
          deck: ["ST10-01"],
        },
        1: { deck: ["ST10-01"] },
      },
      {
        autoAcceptOptional: true,
        autoOrderTriggers: true,
        autoSelectCards: true,
        preferInstanceIds: preferred,
      },
    );
    preferred.push(s.perm("yellow").permanentId, s.perm("purple").permanentId, s.inst("mastemon").instanceId);
    s.state.memory = 3;

    const turn = s.engine.runOneTurn();
    const mainPhase = (s.engine as unknown as { mainPhase: { isOpen: boolean } }).mainPhase;
    await settle(() => mainPhase.isOpen);
    expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
    await settle(() =>
      s.state.players[0]!.battleArea.some(
        (permanent) => permanent.topCard.instanceId === s.inst("mastemon").instanceId,
      ),
    );
    await turn;

    const mastemon = s.state.players[0]!.battleArea.find(
      (permanent) => permanent.topCard.instanceId === s.inst("mastemon").instanceId,
    );
    expect(mastemon).toBeDefined();
    expect(s.state.players[0]!.battleArea).toHaveLength(1);
    expect(mastemon!.stack.map((card) => card.cardId)).toEqual(
      expect.arrayContaining(["ST10-04", "ST10-05", "ST10-12"]),
    );
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("normalEvolution").instanceId)).toBe(
      true,
    );
  });

  it("does not fall back to a normal digivolution without a second DNA material", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "ST10-05", as: "host", under: ["ST10-04"] }],
          hand: [{ card: "ST10-05", as: "normalEvolution" }],
        },
      },
      { autoAcceptOptional: true, autoOrderTriggers: true, autoSelectCards: true },
    );

    await advance(s.engine).fireForInstance(
      EffectTiming.OnEndTurn,
      s.perm("host").stack.find((card) => card.cardId === "ST10-04")!,
    );

    expect(s.perm("host").topCard.cardId).toBe("ST10-05");
    expect(s.perm("host").stack.map((card) => card.cardId)).toContain("ST10-04");
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("normalEvolution").instanceId)).toBe(
      true,
    );
  });

  it("does not consume two valid materials for a non-DNA result", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "ST10-05", as: "yellow", under: ["ST10-04"] },
            { card: "ST10-12", as: "purple" },
          ],
          hand: [{ card: "BT9-112", as: "normalLevel7" }],
        },
      },
      { autoAcceptOptional: true, autoOrderTriggers: true, autoSelectCards: true },
    );
    s.state.memory = 10;

    await advance(s.engine).fireForInstance(
      EffectTiming.OnEndTurn,
      s.perm("yellow").stack.find((card) => card.cardId === "ST10-04")!,
    );

    expect(s.state.players[0]!.battleArea).toHaveLength(2);
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("normalLevel7").instanceId)).toBe(true);
  });

  it("does not open a pending-effect or material modal when no DNA card is in hand", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "ST10-05", as: "yellow", under: ["ST10-04"] },
            { card: "ST10-12", as: "purple" },
          ],
          hand: [{ card: "ST10-05", as: "normalEvolution" }],
        },
      },
      { autoOrderTriggers: false },
    );

    await advance(s.engine).fireForInstance(
      EffectTiming.OnEndTurn,
      s.perm("yellow").stack.find((card) => card.cardId === "ST10-04")!,
    );

    expect(s.state.pendingDecision).toBeUndefined();
    expect(s.decisions).toHaveLength(0);
    expect(s.state.players[0]!.battleArea).toHaveLength(2);
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("normalEvolution").instanceId)).toBe(
      true,
    );
  });

  it("leaves both materials untouched when the optional DNA is declined", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "ST10-05", as: "yellow", under: ["ST10-04"] },
            { card: "ST10-12", as: "purple" },
          ],
          hand: [{ card: "ST10-06", as: "mastemon" }],
        },
      },
      { autoOrderTriggers: true },
    );

    const firing = advance(s.engine).fireForInstance(
      EffectTiming.OnEndTurn,
      s.perm("yellow").stack.find((card) => card.cardId === "ST10-04")!,
    );
    await settle(() => s.state.pendingDecision?.kind === "optional");
    const pending = s.state.pendingDecision!;
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: pending.decisionId,
        response: { kind: "optional", accept: false },
      }),
    ).toEqual({ ok: true });
    await firing;

    expect(s.state.players[0]!.battleArea.map((permanent) => permanent.permanentId)).toEqual(
      expect.arrayContaining([s.perm("yellow").permanentId, s.perm("purple").permanentId]),
    );
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("mastemon").instanceId)).toBe(true);
  });
});
