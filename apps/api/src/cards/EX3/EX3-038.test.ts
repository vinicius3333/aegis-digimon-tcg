import { EffectDuration, getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "./EX3-038.js";

describe("EX3-038 Pomumon", () => {
  it("has the official metadata and digivolves from a green level 2 for 0", async () => {
    expect(getCardDefinition("EX3-038")).toMatchObject({
      cardId: "EX3-038",
      nameEn: "Pomumon",
      colors: ["Green"],
      level: 3,
      playCost: 3,
      dp: 2000,
      evoCosts: [{ color: "Green", level: 2, memoryCost: 0 }],
      forms: ["Rookie"],
      attributes: ["Data"],
      types: ["Vegetation"],
      rarity: "U",
    });
    const s = setupEngine({
      0: {
        breeding: { card: "BT1-007", as: "base" },
        hand: [{ card: "EX3-038", as: "pomumon" }],
        deck: ["BT1-001"],
      },
    });
    s.state.memory = 1;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("pomumon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard.cardId === "EX3-038");

    expect(s.state.memory).toBe(1);
  });

  it("suspends exactly 1 chosen opposing Digimon when an effect suspends itself on its turn", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "EX3-038", as: "pomumon" },
            { card: "EX3-038", as: "otherPomumon" },
          ],
        },
        1: {
          battleArea: [
            { card: "BT1-028", as: "chosen" },
            { card: "BT1-029", as: "notChosen" },
          ],
        },
      },
      { autoSelectCards: true, preferInstanceIds: preferred },
    );
    preferred.push(s.perm("chosen").permanentId);
    await s.ready();

    await advance(s.engine).verb.suspend([s.perm("pomumon").permanentId]);
    await settle(() => s.perm("chosen").isSuspended);

    expect(s.perm("pomumon").isSuspended).toBe(true);
    expect(s.perm("otherPomumon").isSuspended).toBe(false);
    expect(s.perm("chosen").isSuspended).toBe(true);
    expect(s.perm("notChosen").isSuspended).toBe(false);
    const decisions = s.decisions.filter(({ req }) => req.sourceCardId === "EX3-038");
    expect(decisions).toHaveLength(1);
    expect(decisions[0]!.req).toMatchObject({
      kind: "chooseTargets",
      sourceCardId: "EX3-038",
      options: { timing: "YourTurn", min: 1, max: 1 },
    });
  });

  it("offers only active opposing Digimon while keeping a suspended one visible but ineligible", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "EX3-038", as: "pomumon" }] },
      1: {
        battleArea: [
          { card: "BT1-028", as: "active" },
          { card: "BT1-030", as: "otherActive" },
          { card: "BT1-029", suspended: true, as: "alreadySuspended" },
        ],
      },
    });
    await s.ready();

    const suspension = advance(s.engine).verb.suspend([s.perm("pomumon").permanentId]);
    await settle(() => s.state.pendingDecision?.kind === "chooseTargets");

    expect(s.decisions.at(-1)?.req).toMatchObject({
      kind: "chooseTargets",
      sourceCardId: "EX3-038",
      options: {
        candidateInstanceIds: expect.arrayContaining([s.perm("active").permanentId, s.perm("otherActive").permanentId]),
        visibleInstanceIds: expect.arrayContaining([
          s.perm("active").permanentId,
          s.perm("otherActive").permanentId,
          s.perm("alreadySuspended").permanentId,
        ]),
        min: 1,
        max: 1,
      },
    });
    expect(s.decisions.at(-1)?.req.options?.candidateInstanceIds).toHaveLength(2);
    expect(s.decisions.at(-1)?.req.options?.candidateInstanceIds).not.toContain(s.perm("alreadySuspended").permanentId);

    const decision = s.state.pendingDecision!;
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: decision.decisionId,
        response: { kind: "chooseTargets", instanceIds: [s.perm("active").permanentId] },
      }),
    ).toEqual({ ok: true });
    await suspension;
    await settle(() => s.perm("active").isSuspended);

    expect(s.perm("otherActive").isSuspended).toBe(false);
    expect(s.perm("alreadySuspended").isSuspended).toBe(true);
  });

  it("Vegetation family: does not trigger when an effect suspends another Vegetation Digimon", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "EX3-038", as: "pomumon" },
          { card: "BT1-065", as: "mushroomon" },
        ],
      },
      1: { battleArea: [{ card: "BT1-028", as: "opponent" }] },
    });
    await s.ready();

    await advance(s.engine).verb.suspend([s.perm("mushroomon").permanentId]);
    await settle();

    expect(s.perm("mushroomon").isSuspended).toBe(true);
    expect(s.perm("opponent").isSuspended).toBe(false);
    expect(s.decisions.filter(({ req }) => req.sourceCardId === "EX3-038")).toHaveLength(0);
  });

  it("does not trigger from rule-driven suspension when Pomumon attacks", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "EX3-038", as: "pomumon" }] },
      1: {
        battleArea: [{ card: "BT1-028", as: "opponent" }],
        security: ["BT1-003"],
      },
    });
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("pomumon").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("pomumon").isSuspended);

    expect(s.perm("opponent").isSuspended).toBe(false);
    expect(s.decisions.filter(({ req }) => req.sourceCardId === "EX3-038")).toHaveLength(0);
  });

  it("does not trigger outside its controller's turn", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "EX3-038", as: "pomumon" }] },
      1: { battleArea: [{ card: "BT1-028", as: "opponent" }] },
    });
    s.state.turnSeat = 1;
    await s.ready();

    await advance(s.engine).verb.suspend([s.perm("pomumon").permanentId]);
    await settle();

    expect(s.perm("pomumon").isSuspended).toBe(true);
    expect(s.perm("opponent").isSuspended).toBe(false);
    expect(s.decisions.filter(({ req }) => req.sourceCardId === "EX3-038")).toHaveLength(0);
  });

  it("triggers when an opponent's effect suspends it during its controller's turn", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "EX3-038", as: "pomumon" }] },
        1: {
          battleArea: [
            { card: "BT1-028", as: "opponent" },
            { card: "BT1-029", as: "otherOpponent" },
          ],
        },
      },
      { autoSelectCards: true },
    );
    await s.ready();

    await advance(s.engine).verb.suspend([s.perm("pomumon").permanentId], 1);
    await settle(() => s.perm("opponent").isSuspended);

    expect(s.perm("opponent").isSuspended).toBe(true);
    expect(s.decisions.filter(({ req }) => req.sourceCardId === "EX3-038")).toHaveLength(1);
  });

  it("reactivates after unsuspending because the effect is not once per turn", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "EX3-038", as: "pomumon" }] },
        1: {
          battleArea: [
            { card: "BT1-028", as: "first" },
            { card: "BT1-029", as: "second" },
          ],
        },
      },
      { autoSelectCards: true, preferInstanceIds: preferred },
    );
    preferred.push(s.perm("first").permanentId, s.perm("second").permanentId);
    await s.ready();

    await advance(s.engine).verb.suspend([s.perm("pomumon").permanentId]);
    await settle(() => s.perm("first").isSuspended);
    await advance(s.engine).verb.unsuspend([s.perm("pomumon").permanentId]);
    await advance(s.engine).verb.suspend([s.perm("pomumon").permanentId]);
    await settle(() => s.perm("second").isSuspended);

    expect(s.perm("first").isSuspended).toBe(true);
    expect(s.perm("second").isSuspended).toBe(true);
  });

  it("resolves two copies independently when one effect suspends both", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "EX3-038", as: "firstPomumon" },
            { card: "EX3-038", as: "secondPomumon" },
          ],
        },
        1: {
          battleArea: [
            { card: "BT1-028", as: "firstTarget" },
            { card: "BT1-029", as: "secondTarget" },
          ],
        },
      },
      { autoSelectCards: true, preferInstanceIds: preferred },
    );
    preferred.push(s.perm("firstTarget").permanentId, s.perm("secondTarget").permanentId);
    await s.ready();

    await advance(s.engine).verb.suspend([s.perm("firstPomumon").permanentId, s.perm("secondPomumon").permanentId]);
    await settle(() => s.perm("firstTarget").isSuspended && s.perm("secondTarget").isSuspended);

    expect(s.perm("firstPomumon").isSuspended).toBe(true);
    expect(s.perm("secondPomumon").isSuspended).toBe(true);
  });

  it("resolves without a decision when all opposing Digimon are already suspended", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "EX3-038", as: "pomumon" }] },
      1: {
        battleArea: [
          { card: "BT1-028", suspended: true, as: "firstOpponent" },
          { card: "BT1-029", suspended: true, as: "secondOpponent" },
        ],
      },
    });
    await s.ready();

    await advance(s.engine).verb.suspend([s.perm("pomumon").permanentId]);
    await settle();

    expect(s.perm("pomumon").isSuspended).toBe(true);
    expect(s.perm("firstOpponent").isSuspended).toBe(true);
    expect(s.perm("secondOpponent").isSuspended).toBe(true);
    expect(s.decisions.filter(({ req }) => req.sourceCardId === "EX3-038")).toHaveLength(0);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("does not fire again when an effect tries to suspend an already suspended Pomumon", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "EX3-038", as: "pomumon" }] },
        1: {
          battleArea: [
            { card: "BT1-028", as: "first" },
            { card: "BT1-029", as: "second" },
          ],
        },
      },
      { autoSelectCards: true, preferInstanceIds: preferred },
    );
    preferred.push(s.perm("first").permanentId, s.perm("second").permanentId);
    await s.ready();

    await advance(s.engine).verb.suspend([s.perm("pomumon").permanentId]);
    await settle(() => s.perm("first").isSuspended);
    await advance(s.engine).verb.suspend([s.perm("pomumon").permanentId]);
    await settle();

    expect(s.perm("second").isSuspended).toBe(false);
    expect(s.decisions.filter(({ req }) => req.sourceCardId === "EX3-038")).toHaveLength(1);
  });

  it("Q3415: an accepted Evade suspension triggers Pomumon after preventing effect deletion", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "EX3-038", as: "pomumon" }] },
        1: { battleArea: [{ card: "BT1-028", as: "opponent" }] },
      },
      { autoSelectCards: true, preferInstanceIds: preferred },
    );
    preferred.push(s.perm("opponent").permanentId);
    await s.ready();
    const permanentId = s.perm("pomumon").permanentId;
    advance(s.engine).ledgers.continuous.addKeywordGrant(permanentId, "Evade", EffectDuration.Permanent);
    expect(observe(s.engine).hasKeyword(s.perm("pomumon"), "Evade")).toBe(true);

    const deletion = advance(s.engine).verb.deletePermanent([permanentId], "byEffect");
    await settle(() =>
      s.events.some(
        (event) => event.kind === "evadePrompt" && "permanentId" in event && event.permanentId === permanentId,
      ),
    );
    expect(s.engine.applyIntent(0, { type: "respondEvade", permanentId, accept: true })).toEqual({ ok: true });
    await deletion;
    await settle(() => s.perm("opponent").isSuspended);

    expect(s.perm("pomumon").isSuspended).toBe(true);
    expect(s.state.players[0]!.trash.map(({ cardId }) => cardId)).not.toContain("EX3-038");
    expect(s.perm("opponent").isSuspended).toBe(true);
  });
});
