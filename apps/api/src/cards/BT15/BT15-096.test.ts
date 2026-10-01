import { describe, expect, it } from "vitest";
import { setupEngine, settle, type EngineSetup } from "../../engine/testkit/harness.js";
import { compiled } from "./BT15-096.js";

describe("BT15-096", () => {
  it("reveals five to add a Machine/Cyborg and trash another, then places itself in battle", () => {
    expect(compiled.effects?.[0]).toMatchObject({
      trigger: "Main",
      actions: [
        {
          kind: "RevealAdd",
          revealCount: 5,
          rest: "deckTop",
          add: [{ to: "hand" }, { to: "trash", requiresMinRevealed: 2 }],
        },
        { kind: "PlaceInBattleAreaSelf" },
      ],
    });
  });
  it("may play a level 5 or higher Machine/Cyborg from hand with cost reduced by 3 and has the same security reveal", () => {
    expect(compiled.effects?.[1]).toMatchObject({
      trigger: "Main",
      actions: [{ kind: "PlayWithoutCost", from: ["hand"], payCost: true, reduceCostBy: 3, optional: true }],
    });
    expect(compiled.effects?.[2]).toMatchObject({
      trigger: "Security",
      isSecurity: true,
      actions: [{ kind: "RevealAdd" }, { kind: "PlaceInBattleAreaSelf" }],
    });
  });

  it("naturally adds one revealed Machine/Cyborg, trashes a second, preserves the rest on deck, and places itself", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT15-056", as: "source" }],
          hand: [{ card: "BT15-096", as: "option" }],
          deck: [
            { card: "BT15-055", as: "added" },
            "BT15-007",
            { card: "BT15-061", as: "trashed" },
            "BT15-008",
            "BT15-009",
          ],
        },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();
    const optionInstanceId = s.inst("option").instanceId;
    const addedInstanceId = s.inst("added").instanceId;
    const trashedInstanceId = s.inst("trashed").instanceId;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.battleArea.some((p) => p.topCard?.instanceId === optionInstanceId));

    expect(s.state.players[0]!.hand.some((card) => card.instanceId === addedInstanceId)).toBe(true);
    expect(s.state.players[0]!.trash.some((card) => card.instanceId === trashedInstanceId)).toBe(true);
    expect(s.state.players[0]!.deck.map((card) => card.cardId)).toEqual(["BT15-007", "BT15-008", "BT15-009"]);
  });

  it("naturally leaves the sole revealed Machine/Cyborg in hand and cannot trash a second card", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT15-056", as: "source" }],
          hand: [{ card: "BT15-096", as: "option" }],
          deck: [{ card: "BT15-055", as: "onlyHit" }, "BT15-007", "BT15-008", "BT15-009", "BT15-010"],
        },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();
    const optionInstanceId = s.inst("option").instanceId;
    const onlyHitInstanceId = s.inst("onlyHit").instanceId;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.battleArea.some((p) => p.topCard?.instanceId === optionInstanceId));

    expect(s.state.players[0]!.hand.some((card) => card.instanceId === onlyHitInstanceId)).toBe(true);
    expect(s.state.players[0]!.trash.some((card) => card.instanceId === onlyHitInstanceId)).toBe(false);
    expect(s.state.players[0]!.deck.map((card) => card.cardId)).toEqual([
      "BT15-007",
      "BT15-008",
      "BT15-009",
      "BT15-010",
    ]);
  });
});

const REVEAL_WITH_TWO_MACHINES = [
  { card: "BT15-055", as: "hagurumon" },
  { card: "BT15-007", as: "biyomon" },
  { card: "BT15-061", as: "guardromon" },
  { card: "BT15-008", as: "fillerA" },
  { card: "BT15-009", as: "fillerB" },
];

async function answerNextRevealSelection(s: EngineSetup, seat: 0 | 1, answered: Set<string>, pickIds: string[]) {
  const isUnansweredSelection = ({ req }: EngineSetup["decisions"][number]) =>
    req.kind === "selectCards" && !answered.has(req.decisionId);
  await settle(() => s.decisions.some(isUnansweredSelection));
  const { req } = s.decisions.find(isUnansweredSelection)!;
  answered.add(req.decisionId);
  expect(
    s.engine.applyIntent(seat, {
      type: "respondDecision",
      decisionId: req.decisionId,
      response: { kind: "selectCards", instanceIds: pickIds },
    }),
  ).toEqual({ ok: true });
  return req.options?.candidateInstanceIds ?? [];
}

describe("BT15-096 Supreme Connection! — KB Q&A rulings", () => {
  it("can only trash a revealed card with the [Machine]/[Cyborg] trait for both its [Main] and [Security] effects (Q2592)", async () => {
    const main = setupEngine({
      0: {
        battleArea: [{ card: "BT15-056", as: "source" }],
        hand: [{ card: "BT15-096", as: "option" }],
        deck: REVEAL_WITH_TWO_MACHINES,
      },
    });
    main.state.memory = 10;
    await main.ready();
    const mainOptionId = main.inst("option").instanceId;
    const mainHagurumonId = main.inst("hagurumon").instanceId;
    const mainGuardromonId = main.inst("guardromon").instanceId;
    const mainAnswered = new Set<string>();
    expect(main.engine.applyIntent(0, { type: "playCard", instanceId: mainOptionId })).toEqual({
      ok: true,
    });
    const mainHandCandidates = await answerNextRevealSelection(main, 0, mainAnswered, [mainGuardromonId]);
    expect([...mainHandCandidates].sort()).toEqual([mainHagurumonId, mainGuardromonId].sort());
    const mainTrashCandidates = await answerNextRevealSelection(main, 0, mainAnswered, [mainHagurumonId]);
    expect(mainTrashCandidates).toEqual([mainHagurumonId]);
    await settle(() => main.state.players[0]!.battleArea.some((p) => p.topCard?.instanceId === mainOptionId));
    expect(main.state.players[0]!.trash.map((card) => card.cardId)).toEqual(["BT15-055"]);
    expect([...main.state.players[0]!.deck.map((card) => card.cardId)].sort()).toEqual([
      "BT15-007",
      "BT15-008",
      "BT15-009",
    ]);

    const security = setupEngine({
      0: { battleArea: [{ card: "BT15-056", as: "attacker" }] },
      1: {
        security: [{ card: "BT15-096", as: "option" }],
        deck: REVEAL_WITH_TWO_MACHINES,
      },
    });
    await security.ready();
    const securityOptionId = security.inst("option").instanceId;
    const securityHagurumonId = security.inst("hagurumon").instanceId;
    const securityGuardromonId = security.inst("guardromon").instanceId;
    const securityAnswered = new Set<string>();
    expect(
      security.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: security.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await answerNextRevealSelection(security, 1, securityAnswered, [securityGuardromonId]);
    const securityTrashCandidates = await answerNextRevealSelection(security, 1, securityAnswered, [
      securityHagurumonId,
    ]);
    expect(securityTrashCandidates).toEqual([securityHagurumonId]);
    await settle(() => security.state.players[1]!.battleArea.some((p) => p.topCard?.instanceId === securityOptionId));
    expect(security.state.players[1]!.trash.map((card) => card.cardId)).toEqual(["BT15-055"]);
    expect(security.state.players[1]!.hand.map((card) => card.cardId)).toEqual(["BT15-061"]);
  });

  it("adds the only revealed [Machine]/[Cyborg] card to the hand and trashes nothing (Q2593)", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT15-056", as: "source" }],
        hand: [{ card: "BT15-096", as: "option" }],
        deck: [{ card: "BT15-055", as: "onlyHit" }, "BT15-007", "BT15-008", "BT15-009", "BT15-010"],
      },
    });
    s.state.memory = 10;
    await s.ready();
    const answered = new Set<string>();
    const optionId = s.inst("option").instanceId;
    const onlyHitId = s.inst("onlyHit").instanceId;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: optionId })).toEqual({ ok: true });
    expect(await answerNextRevealSelection(s, 0, answered, [onlyHitId])).toEqual([onlyHitId]);
    await settle(() => s.state.players[0]!.battleArea.some((p) => p.topCard?.instanceId === optionId));

    expect(s.decisions.filter(({ req }) => req.kind === "selectCards")).toHaveLength(1);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toEqual([onlyHitId]);
    expect(s.state.players[0]!.trash).toHaveLength(0);
    expect(s.state.players[0]!.deck).toHaveLength(4);
  });
});
