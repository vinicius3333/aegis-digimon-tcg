import { describe, expect, it } from "vitest";
import { digivolutionRequirementsFor, EffectTiming, getCardDefinition } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./BT26-032.js";
import "./BT26-032.js";
import "../BT25/BT25-077.js";
import "../BT25/BT25-059.js";
import "../BT3/BT3-056.js";
import "../BT24/BT24-102.js";

describe("BT26-032 compiled fidelity", () => {
  it("matches the catalog and encodes both DUAL faces without residual behavior", () => {
    const card = compiled;
    expect(getCardDefinition("BT26-032")).toMatchObject({
      nameEn: "Ceresmon",
      colors: ["Yellow", "Green"],
      kinds: ["Digimon", "Option"],
      level: 6,
      playCost: 5,
      dp: 13000,
      types: ["Shaman", "Olympos XII", "Iliad", "TS"],
      isDualCard: true,
      dualEffect: "Famis",
      optionColorRequirements: ["Green"],
    });
    expect(card?.coverage).toBe("full");
    expect(card?.residual).toEqual([]);
    expect(card?.digivolutionRequirement).toEqual([
      { namesExact: ["Ceresmon"], basePlayCost: 12, cost: 2, isAlternate: true },
    ]);
    expect(digivolutionRequirementsFor("BT26-032")).toEqual(card.digivolutionRequirement);
    expect(card?.keywords?.map((keyword) => keyword.keyword)).toEqual(
      expect.arrayContaining(["Alliance", "Succession"]),
    );
    expect(card?.effects?.[0]?.actions).toMatchObject([
      { kind: "ModifyDP", amount: -5000 },
      { kind: "Suspend" },
      {
        kind: "Modal",
        choose: 1,
        condition: { kind: "allOf", conditions: [{ kind: "ifThisEffectActed" }, { kind: "isYourTurn" }] },
      },
    ]);
    expect(card?.effects).toHaveLength(5);
    expect(card?.effects?.[1]?.actions).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ kind: "GrantStatic", grant: "trait", tokens: ["Vegetation"] }),
      ]),
    );
    expect(card?.effects?.[2]).toMatchObject({
      trigger: "Static",
      actions: [{ kind: "GrantStatic", grant: "effects", topmostOnly: true }],
    });
    expect(card?.effects?.[3]).toMatchObject({
      trigger: "Static",
      actions: [{ kind: "WaiveColorRequirement", condition: { kind: "youHave" } }],
    });
    expect(card?.effects?.[4]).toMatchObject({
      trigger: "Main",
      actions: [
        { kind: "Suspend", target: { count: 2, upTo: true } },
        { kind: "Restrict", target: { count: 3 }, restriction: "unsuspend", duration: "untilOpponentTurnEnd" },
      ],
    });
  });

  it("gains the effects of its topmost Ceresmon digivolution card through Succession", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT26-032", as: "ceresmon", under: [{ card: "BT25-059", as: "successionSource" }] },
            { card: "BT1-080", as: "suspendCost" },
          ],
        },
        1: { battleArea: [{ card: "BT1-080", as: "penaltyTarget", dp: 10000 }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true, preferInstanceIds: preferred },
    );
    preferred.push(s.perm("suspendCost").permanentId, s.perm("penaltyTarget").permanentId);
    await s.ready();

    await advance(s.engine).fire(EffectTiming.WhenDigivolving, s.perm("ceresmon"));

    expect(s.perm("suspendCost").isSuspended).toBe(true);
    expect(s.perm("penaltyTarget").currentDP).toBe(7000);
  });

  it("uses the alternate cost only over a Ceresmon with printed play cost 12", async () => {
    const legal = setupEngine({
      0: {
        battleArea: [{ card: "BT25-059", as: "baseCeresmon" }],
        hand: [{ card: "BT26-032", as: "ceresmon" }],
      },
    });
    legal.state.memory = 2;
    await legal.ready();

    expect(
      legal.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: legal.perm("baseCeresmon").permanentId,
        instanceId: legal.inst("ceresmon").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: true });
    await settle(() => legal.perm("baseCeresmon").topCard.cardId === "BT26-032");
    expect(legal.state.memory).toBe(0);
    expect(
      [...legal.perm("baseCeresmon").stack, legal.perm("baseCeresmon").topCard].map(({ cardId }) => cardId),
    ).toEqual(["BT25-059", "BT26-032"]);

    const wrongCost = setupEngine({
      0: {
        battleArea: [{ card: "BT26-032", as: "wrongCostCeresmon" }],
        hand: [{ card: "BT26-032", as: "ceresmon" }],
      },
    });
    wrongCost.state.memory = 2;
    await wrongCost.ready();
    expect(
      wrongCost.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: wrongCost.perm("wrongCostCeresmon").permanentId,
        instanceId: wrongCost.inst("ceresmon").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual(expect.objectContaining({ ok: false }));
  });

  it("confers only the topmost matching Ceresmon and keeps its own printed keywords", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          {
            card: "BT26-032",
            as: "ceresmon",
            under: [
              { card: "BT25-059", as: "lowerCeresmon" },
              { card: "BT3-056", as: "topmostCeresmon" },
            ],
          },
        ],
      },
    });
    await s.ready();

    const conferrals = (
      s.engine as unknown as {
        continuous: {
          listStackEffectConferrals: () => Array<{ stackInstanceId: string; targetPermanentId: string }>;
        };
      }
    ).continuous.listStackEffectConferrals();
    expect(conferrals.map(({ stackInstanceId }) => stackInstanceId)).toContain(s.inst("topmostCeresmon").instanceId);
    expect(conferrals.map(({ stackInstanceId }) => stackInstanceId)).not.toContain(s.inst("lowerCeresmon").instanceId);
    expect(
      conferrals.some(
        ({ stackInstanceId, targetPermanentId }) =>
          stackInstanceId === s.inst("topmostCeresmon").instanceId &&
          targetPermanentId === s.perm("ceresmon").permanentId,
      ),
    ).toBe(true);
    expect(s.perm("ceresmon").keywords).toContain("Alliance");
    expect(s.perm("ceresmon").keywords).not.toContain("Digisorption");
  });

  it("publicly reduces every suspended opposing Digimon by 5000 on digivolution", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT26-032", as: "ceresmon" }] },
        1: {
          battleArea: [
            { card: "BT1-009", as: "suspended", suspended: true, dp: 11000 },
            { card: "BT1-010", as: "unsuspended", suspended: false, dp: 11000 },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true },
    );
    await s.ready();

    await advance(s.engine).fire(EffectTiming.WhenDigivolving, s.perm("ceresmon"));

    expect(s.perm("suspended").currentDP).toBe(6000);
    expect(s.perm("unsuspended").currentDP).toBe(11000);
  });

  it("offers only the native and nested Ceresmon When Digivolving bodies to public Homeros activation", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT24-102", as: "homeros" },
            { card: "BT26-032", as: "host", under: [{ card: "BT26-032", as: "nested" }] },
          ],
          deck: ["BT1-009", "BT1-009", "BT1-010"],
        },
        1: {
          battleArea: [{ card: "BT1-080", as: "target", suspended: true }],
          deck: ["BT1-009", "BT1-009", "BT1-010"],
        },
      },
      { autoAcceptOptional: false, autoSelectCards: true, autoChooseOption: false },
    );
    s.state.memory = 3;
    await s.ready();

    const turn = s.engine.runOneTurn();
    try {
      await advance(s.engine).waitForMainPhase(0);
      expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
      await settle(() => s.decisions.some((decision) => decision.req.kind === "optional"));

      const optional = s.decisions.find((decision) => decision.req.kind === "optional");
      expect(optional).toBeDefined();
      expect(
        s.engine.applyIntent(0, {
          type: "respondDecision",
          decisionId: optional!.req.decisionId,
          response: { kind: "optional", accept: true },
        }),
      ).toEqual({ ok: true });
      await settle(() => s.decisions.some((decision) => decision.req.kind === "chooseOption"));

      const choose = s.decisions.find((decision) => decision.req.kind === "chooseOption");
      expect(choose?.req.options?.choices).toHaveLength(2);
      expect(choose?.req.options?.choices).toEqual([
        "[When Digivolving] Modify DP by -5000, Suspend 1 target(s), Modal",
        "[When Digivolving] Modify DP by -5000, Suspend 1 target(s), Modal",
      ]);
      expect(
        s.engine.applyIntent(0, {
          type: "respondDecision",
          decisionId: choose!.req.decisionId,
          response: { kind: "chooseOption", optionIndex: 1 },
        }),
      ).toEqual({ ok: true });
      await settle(() => s.state.pendingDecision?.kind === "optional");

      const suspend = s.state.pendingDecision;
      expect(suspend?.kind).toBe("optional");
      expect(
        s.engine.applyIntent(0, {
          type: "respondDecision",
          decisionId: suspend!.decisionId,
          response: { kind: "optional", accept: false },
        }),
      ).toEqual({ ok: true });
      await settle(() => s.perm("target").currentDP === 7000);
      expect(s.perm("target").currentDP).toBe(7000);
      expect(s.perm("host").stack.map((card) => card.instanceId)).toEqual([s.inst("nested").instanceId]);
      expect(s.perm("host").topCard.instanceId).toBe(s.inst("host").instanceId);
      expect(s.state.pendingDecision).toBeUndefined();
    } finally {
      advance(s.engine).endMainPhaseIfOpen(0);
      await turn;
    }
  });

  it("may suspend either player's Digimon to pay the continuation (Q7001)", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT26-032", as: "ceresmon" },
            { card: "BT1-080", as: "mine" },
          ],
        },
        1: { battleArea: [{ card: "BT1-080", as: "theirs" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true, preferInstanceIds: preferred },
    );
    preferred.push(s.perm("theirs").permanentId);

    await advance(s.engine).fire(EffectTiming.WhenDigivolving, s.perm("ceresmon"));

    expect(s.perm("mine").isSuspended).toBe(false);
    expect(s.perm("theirs").isSuspended).toBe(true);
  });

  it("may decline the suspend continuation and does not play a card afterward", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT26-032", as: "ceresmon" }], hand: [{ card: "BT26-015", as: "candidate" }] },
        1: { battleArea: [{ card: "BT1-009", as: "target", suspended: false }] },
      },
      { autoDeclineOptional: true, autoSelectCards: true, autoChooseOption: true },
    );
    await s.ready();

    await advance(s.engine).fire(EffectTiming.WhenDigivolving, s.perm("ceresmon"));

    expect(s.perm("target").isSuspended).toBe(false);
    expect(s.state.players[0]!.hand.map(({ cardId }) => cardId)).toContain("BT26-015");
  });

  it("accepts only Digimon as the suspend payment and leaves unrelated hand cards unplayed", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT26-032", as: "ceresmon" }], hand: [{ card: "BT1-009", as: "unrelated" }] },
        1: { battleArea: [{ card: "BT1-085", as: "opponentTamer" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true },
    );
    await s.ready();

    await advance(s.engine).fire(EffectTiming.WhenDigivolving, s.perm("ceresmon"));

    expect(s.perm("opponentTamer").isSuspended).toBe(false);
    expect(s.state.players[0]!.hand.map(({ cardId }) => cardId)).toContain("BT1-009");
  });

  it("waits until the full effect resolves before deleting 0-DP Digimon and stacks both play reducers (Q7000/Q7002)", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT26-032", as: "ceresmon" },
            { card: "BT1-080", as: "levelSix" },
          ],
          hand: [{ card: "BT25-077", as: "bacchusmon" }],
        },
        1: { battleArea: [{ card: "BT1-009", as: "zeroDp", suspended: true, dp: 5000 }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferred },
    );
    preferred.push(s.perm("levelSix").permanentId);
    s.state.memory = 2;

    const resolving = advance(s.engine).fire(EffectTiming.WhenDigivolving, s.perm("ceresmon"));
    await resolving;

    expect(s.decisions.some(({ req }) => req.kind === "chooseOption")).toBe(false);

    expect(s.state.memory).toBe(0);
    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.cardId === "BT25-077")).toBe(true);
    expect(
      s.state.players[1]!.battleArea.some((permanent) => permanent.topCard?.instanceId === s.inst("zeroDp").instanceId),
    ).toBe(false);
  });

  it("uses Famis through a TS color waiver and can lock cards it did not suspend (Q7003)", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT25-071", as: "ts" }],
          hand: [{ card: "BT26-032", as: "famis" }],
        },
        1: {
          battleArea: [
            { card: "BT1-009", as: "suspendA" },
            { card: "BT1-010", as: "suspendB" },
            { card: "BT1-011", as: "lockOnly" },
            { card: "BT1-012", as: "other" },
          ],
        },
      },
      { autoAcceptOptional: true },
    );
    s.state.memory = 5;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "playCard",
        instanceId: s.inst("famis").instanceId,
        useAs: "option",
      } as never),
    ).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision?.kind === "chooseTargets");
    let pending = s.state.pendingDecision!;
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: pending.decisionId,
        response: {
          kind: "chooseTargets",
          instanceIds: [s.perm("suspendA").permanentId, s.perm("suspendB").permanentId],
        },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision?.decisionId !== pending.decisionId);
    pending = s.state.pendingDecision!;
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: pending.decisionId,
        response: {
          kind: "chooseTargets",
          instanceIds: [s.perm("suspendA").permanentId, s.perm("suspendB").permanentId, s.perm("lockOnly").permanentId],
        },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.trash.some((card) => card.instanceId === s.inst("famis").instanceId));

    expect(s.perm("suspendA").isSuspended).toBe(true);
    expect(s.perm("suspendB").isSuspended).toBe(true);
    expect(s.perm("lockOnly").isSuspended).toBe(false);
    expect(
      (
        s.engine as unknown as { continuous: { hasRestriction: (id: string, kind: string) => boolean } }
      ).continuous.hasRestriction(s.perm("lockOnly").permanentId, "unsuspend"),
    ).toBe(true);
  });
});
