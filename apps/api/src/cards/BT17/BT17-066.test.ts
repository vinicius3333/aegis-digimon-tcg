import { getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { compiled } from "./BT17-066.js";
import "./index.js";

describe("BT17-066 HippoGryphonmon", () => {
  it("matches the catalog and the complete IR contract", () => {
    expect(getCardDefinition("BT17-066")).toMatchObject({
      cardId: "BT17-066",
      nameEn: "HippoGryphonmon",
      colors: ["Purple", "Yellow"],
      kinds: ["Digimon"],
      level: 5,
      playCost: 7,
      dp: 7000,
      evoCosts: [
        { color: "Purple", level: 4, memoryCost: 4 },
        { color: "Yellow", level: 4, memoryCost: 4 },
      ],
      forms: ["Ultimate"],
      attributes: ["Data"],
      types: ["Mythical Beast"],
      effectText:
        "[Digivolve][Darcmon]: Cost 3 \n\n＜Blocker＞ \n[When Digivolving] You may play 1 level 3 Purple or Yellow Digimon card from your hand without paying the cost.",
      inheritedEffectText: "＜Blocker＞.",
    });
    expect(compiled.effects).toEqual([
      { trigger: "Static", actions: [], keywords: [{ keyword: "Blocker", raw: "＜Blocker＞" }] },
      {
        trigger: "WhenDigivolving",
        actions: [
          {
            kind: "PlayWithoutCost",
            target: {
              filter: { controller: "mine", kind: ["Digimon"], colors: ["Yellow", "Purple"], levels: [3] },
              count: 1,
            },
            from: ["hand"],
            payCost: false,
            optional: true,
          },
        ],
      },
      {
        trigger: "Static",
        actions: [],
        isInherited: true,
        keywords: [{ keyword: "Blocker", raw: "＜Blocker＞" }],
      },
    ]);
    expect(compiled).toMatchObject({
      coverage: "full",
      residual: [],
      digivolutionRequirement: [{ names: ["Darcmon"], cost: 3, isAlternate: true }],
    });
  });

  it("uses the Darcmon route for 3 memory and plays a yellow level 3 from hand without cost", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT17-063", as: "darcmon" }],
          hand: [
            { card: "BT17-066", as: "hippoGryphonmon" },
            { card: "BT1-045", as: "played" },
            { card: "BT1-010", as: "wrongColor" },
          ],
          deck: ["BT1-009"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 3;
    await s.ready();
    const darcmonInstanceId = s.perm("darcmon").topCard.instanceId;
    const darcmonPermanentId = s.perm("darcmon").permanentId;
    const playedId = s.inst("played").instanceId;
    const hippoId = s.inst("hippoGryphonmon").instanceId;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: darcmonPermanentId,
        instanceId: hippoId,
        alternateRequirementIndex: 0,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.instanceId === playedId));

    // The source stack keeps its identity: same permanent, Darcmon underneath.
    expect(s.perm("darcmon").permanentId).toBe(darcmonPermanentId);
    expect(s.perm("darcmon").topCard.instanceId).toBe(hippoId);
    expect(s.perm("darcmon").stack.map(({ instanceId }) => instanceId)).toEqual([darcmonInstanceId]);
    // Cost 3 alternate route, not the printed 4.
    expect(s.state.memory).toBe(0);
    // Digivolving draws 1.
    expect(s.state.players[0]!.deck).toHaveLength(0);
    expect(s.state.players[0]!.hand.map((card) => card.cardId).sort()).toEqual(["BT1-009", "BT1-010"]);
    expect(
      s.state.players[0]!.battleArea.filter((permanent) => permanent.topCard.instanceId === playedId),
    ).toHaveLength(1);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("uses the printed level 4 route for 4 memory when no alternate is named", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT4-080", as: "bakemon" }],
          hand: [{ card: "BT17-066", as: "hippoGryphonmon" }],
          deck: ["BT1-009"],
        },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    s.state.memory = 4;
    await s.ready();
    const hippoId = s.inst("hippoGryphonmon").instanceId;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("bakemon").permanentId,
        instanceId: hippoId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("bakemon").topCard.instanceId === hippoId);

    expect(s.state.memory).toBe(0);
    expect(s.perm("bakemon").stack.map((card) => card.cardId)).toEqual(["BT4-080"]);
    expect(s.state.players[0]!.hand.map((card) => card.cardId)).toEqual(["BT1-009"]);
  });

  it("refuses a level 4 Red source that matches neither the printed nor the Darcmon route", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT1-019", as: "darkTyrannomon" }],
        hand: [{ card: "BT17-066", as: "hippoGryphonmon" }],
        deck: ["BT1-009"],
      },
    });
    s.state.memory = 6;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("darkTyrannomon").permanentId,
        instanceId: s.inst("hippoGryphonmon").instanceId,
      }),
    ).toEqual({ ok: false, reason: "invalid-evolution" });
    expect(s.state.memory).toBe(6);
    expect(s.state.players[0]!.hand.map((card) => card.cardId)).toEqual(["BT17-066"]);
  });

  it("may decline the free play and leaves an ineligible hand card untouched", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT17-063", as: "darcmon" }],
          hand: [
            { card: "BT17-066", as: "hippoGryphonmon" },
            { card: "BT1-010", as: "wrongColor" },
          ],
          deck: ["BT1-009"],
        },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    s.state.memory = 3;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("darcmon").permanentId,
        instanceId: s.inst("hippoGryphonmon").instanceId,
        alternateRequirementIndex: 0,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea[0]?.topCard.cardId === "BT17-066");

    expect(s.state.memory).toBe(0);
    expect(s.state.players[0]!.battleArea).toHaveLength(1);
    expect(s.state.players[0]!.battleArea[0]?.stack).toHaveLength(1);
    expect(s.state.players[0]!.hand.map((card) => card.cardId).sort()).toEqual(["BT1-009", "BT1-010"]);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("intercepts a player attack with its printed Blocker and wins the battle", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT1-019", as: "attacker" }] },
      1: { battleArea: [{ card: "BT17-066", as: "hippoGryphonmon" }], security: ["BT1-009"] },
    });
    await s.ready();
    expect(observe(s.engine).hasKeyword(s.perm("hippoGryphonmon"), "Blocker")).toBe(true);

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.events.some((event) => event.kind === "blockWindowOpened"));

    expect(
      s.engine.applyIntent(1, { type: "declareBlock", blockerPermanentId: s.perm("hippoGryphonmon").permanentId }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.length === 0);

    // 7000 DP beats the 6000 DP attacker; security is untouched because the block intercepted.
    expect(s.state.players[0]!.trash.map((card) => card.cardId)).toEqual(["BT1-019"]);
    expect(s.state.players[1]!.battleArea.map((permanent) => permanent.topCard.cardId)).toEqual(["BT17-066"]);
    expect(s.state.players[1]!.security.map((card) => card.cardId)).toEqual(["BT1-009"]);
    expect(s.perm("hippoGryphonmon").isSuspended).toBe(true);
  });

  it("grants inherited Blocker to its evolved host", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT17-071", under: ["BT17-066"], as: "host" }] } });
    await s.ready();

    expect(s.perm("host").topCard.cardId).toBe("BT17-071");
    expect(s.perm("host").stack.map((card) => card.cardId)).toEqual(["BT17-066"]);
    expect(observe(s.engine).hasKeyword(s.perm("host"), "Blocker")).toBe(true);
  });
});
