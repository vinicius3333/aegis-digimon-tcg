import { describe, expect, it } from "vitest";
import { getCardDefinition } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { compiled } from "./BT20-080.js";
import "../BT14/BT14-087.js";
import "../ST1/ST1-16.js";
import "../BT2/BT2-107.js";
import "../BT1/BT1-085.js";
import "./index.js";

describe("BT20-080 Fenriloogamon", () => {
  it("has Scapegoat and may play a level 4 or lower SoC/SEEKERS Digimon from trash on digivolving", () => {
    expect(compiled.effects.find((effect) => !effect.isInherited && effect.trigger === "Static")).toMatchObject({
      keywords: [{ keyword: "Scapegoat" }],
    });
    expect(compiled.effects.find((effect) => effect.trigger === "WhenDigivolving")).toMatchObject({
      actions: [
        {
          kind: "PlayWithoutCost",
          from: ["trash"],
          payCost: false,
          optional: true,
          target: {
            filter: {
              controller: "mine",
              kind: ["Digimon"],
              levelComparison: { op: "lte", value: 4 },
              nameOrTrait: [{ tokens: ["SoC", "SEEKERS"], match: "trait" }],
            },
            count: 1,
          },
        },
      ],
    });
  });

  it("publishes the complete catalog identity and exact alternate evolution route", () => {
    expect(getCardDefinition("BT20-080")).toMatchObject({
      cardId: "BT20-080",
      nameEn: "Fenriloogamon",
      colors: ["Purple", "Red"],
      kinds: ["Digimon"],
      level: 6,
      playCost: 12,
      dp: 12000,
      forms: ["Mega"],
      attributes: ["Virus"],
      types: ["Dark Animal", "X Antibody", "SoC", "SEEKERS"],
      evoCosts: [
        { color: "Red", level: 5, memoryCost: 4 },
        { color: "Yellow", level: 5, memoryCost: 4 },
      ],
      effectText: expect.stringContaining("Soloogarmon"),
      inheritedEffectText: expect.stringContaining("Fenriloogamon"),
    });
    expect(compiled).toMatchObject({ coverage: "full", residual: [] });
    expect(compiled.digivolutionRequirement).toEqual([
      { namesExact: ["Soloogarmon"], cost: 3, isAlternate: true },
      { level: 5, traits: ["SEEKERS"], cost: 3, isAlternate: true },
    ]);
  });

  it("reactivates its When Digivolving effect and optionally attacks when a Tamer is placed under it", () => {
    expect(compiled.effects.find((effect) => effect.trigger === "AllTurns" && !effect.isInherited)).toMatchObject({
      actions: [
        {
          kind: "SubTrigger",
          event: "onAddDigivolutionCards",
          addedDigivolutionCardFilter: { kind: ["Tamer"] },
          triggerFilter: { isSelfRef: true },
          actions: [
            {
              kind: "ReactivateEffect",
              fromTrigger: "WhenDigivolving",
              count: 1,
              target: { filter: { isSelfRef: true }, isSelf: true },
            },
            { kind: "Attack", optional: true, attackPlayer: true },
          ],
        },
      ],
    });
  });

  it("inherits once-per-turn top-security trash after an opponent Digimon deletion", () => {
    expect(compiled.effects.find((effect) => effect.isInherited)).toMatchObject({
      trigger: "AllTurns",
      frequency: "OncePerTurn",
      actions: [
        {
          kind: "SubTrigger",
          event: "onDeletionOf",
          sourceFilter: { controller: "opponent", kind: ["Digimon"] },
          actions: [
            {
              kind: "Trash",
              condition: { kind: "selfHasNameContaining", names: ["Fenriloogamon"] },
              target: { filter: { controller: "opponent", zone: "security", position: "top" }, count: 1 },
            },
          ],
        },
      ],
    });
  });

  it("naturally plays a qualifying SoC/SEEKERS Digimon from trash after digivolving", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT20-071", as: "host" }],
          hand: [{ card: "BT20-080", as: "fenri" }],
          trash: [
            { card: "BT20-032", as: "seekers" },
            { card: "BT20-080", as: "tooHigh" },
            { card: "BT20-047", as: "notMatching" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 3;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("host").permanentId,
        instanceId: s.inst("fenri").instanceId,
        alternateRequirementIndex: 0,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.cardId === "BT20-032"));

    expect(s.state.players[0]!.battleArea.map((permanent) => permanent.topCard.cardId)).toEqual(
      expect.arrayContaining(["BT20-080", "BT20-032"]),
    );
    expect(s.state.players[0]!.trash.map((card) => card.cardId)).toEqual(
      expect.arrayContaining(["BT20-080", "BT20-047"]),
    );
  });

  it("accepts the alternate Soloogarmon route by exact name without requiring SEEKERS", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT14-079", as: "soloogarmon" }],
          hand: [{ card: "BT20-080", as: "fenri" }],
        },
      },
      { autoDeclineOptional: true },
    );
    s.state.memory = 3;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("soloogarmon").permanentId,
        instanceId: s.inst("fenri").instanceId,
        alternateRequirementIndex: 0,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea[0]?.topCard.cardId === "BT20-080");
    expect(s.state.players[0]!.battleArea[0]!.topCard.cardId).toBe("BT20-080");
  });

  it("accepts the alternate level-5 SEEKERS route at cost 3", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT20-034", as: "seekersBase" }],
        hand: [{ card: "BT20-080", as: "fenri" }],
      },
    });
    s.state.memory = 3;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("seekersBase").permanentId,
        instanceId: s.inst("fenri").instanceId,
        alternateRequirementIndex: 1,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("seekersBase").topCard.cardId === "BT20-080");
    expect(s.state.memory).toBe(0);
  });

  it("publicly Mind Links Eiji under Fenriloogamon, reactivates its effect, and allows declining the attack", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT20-071", under: ["BT20-064", "BT20-070"], as: "host" }],
          hand: [
            { card: "BT20-080", as: "fenri" },
            { card: "BT14-087", as: "eiji" },
          ],
          trash: [{ card: "BT20-070", as: "seekers" }],
        },
        1: { security: ["BT20-047"] },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 7;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("host").permanentId,
        instanceId: s.inst("fenri").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision?.kind === "optional");
    const initialPlay = s.state.pendingDecision!;
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: initialPlay.decisionId,
        response: { kind: "optional", accept: false },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("host").topCard.cardId === "BT20-080" && s.state.pendingDecision === undefined);

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("eiji").instanceId })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some((perm) => perm.topCard.cardId === "BT14-087"));
    const eiji = s.state.players[0]!.battleArea.find((perm) => perm.topCard.cardId === "BT14-087")!;
    const mindLink = observe(s.engine).activatableEffects(eiji)[0]!;
    expect(
      s.engine.applyIntent(0, {
        type: "activateEffect",
        sourceInstanceId: eiji.topCard.instanceId,
        effectKey: mindLink.effectKey,
      }),
    ).toEqual({ ok: true });

    await settle(() => s.state.pendingDecision?.kind === "optional");
    const reactivatedPlay = s.state.pendingDecision!;
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: reactivatedPlay.decisionId,
        response: { kind: "optional", accept: true },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some((perm) => perm.topCard.cardId === "BT20-070"));
    await settle(() => s.state.pendingDecision?.kind === "optional");
    const attack = s.state.pendingDecision!;
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: attack.decisionId,
        response: { kind: "optional", accept: false },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision === undefined);
    expect(s.perm("host").stack.map((card) => card.cardId)).toContain("BT14-087");
    expect(s.state.players[0]!.battleArea.some((perm) => perm.topCard.cardId === "BT20-070")).toBe(true);
    expect(s.events.some((event) => event.kind === "attackDeclared" && event.attackerCardId === "BT20-080")).toBe(
      false,
    );
  });

  it("naturally trashes the opponent's top security from a legal DNA-result stack", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          // BT20-081 is the catalog-legal Fenriloogamon: Takemikazuchi DNA result;
          // its materials are Fenriloogamon and Kazuchimon, bottom-most first.
          battleArea: [
            { card: "BT20-081", under: ["BT20-080", "BT20-035"], as: "host" },
            { card: "BT20-032", as: "sacrifice" },
          ],
          hand: [{ card: "BT20-073", as: "metal" }],
        },
        1: {
          battleArea: [{ card: "BT20-071", as: "target" }],
          security: ["BT20-047"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferred },
    );
    preferred.push(s.perm("sacrifice").permanentId, s.perm("target").permanentId);
    s.state.memory = 7;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("metal").instanceId })).toEqual({ ok: true });
    await settle(() => {
      const opponent = s.state.players[1]!;
      return opponent.battleArea.length === 0 && opponent.security.length === 0;
    });

    expect(s.state.players[1]!.security).toHaveLength(0);
    expect(s.state.players[1]!.trash.some((card) => card.cardId === "BT20-047")).toBe(true);
  });

  it("limits inherited security trash to once per opponent turn and resets on the next real turn", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "ST1-16", as: "gaia" }, "BT1-010"],
          security: ["BT2-107"],
          deck: ["BT20-010", "BT20-010", "BT20-010"],
          battleArea: [
            { card: "BT20-081", under: ["BT20-080", "BT20-035"], as: "host" },
            { card: "BT20-071", dp: 9000, as: "attackerOne" },
            { card: "BT20-071", dp: 9000, as: "attackerTwo" },
            { card: "BT1-085", as: "redTamer" },
          ],
        },
        1: {
          battleArea: [
            { card: "BT20-071", dp: 1000, suspended: true, as: "targetOne" },
            { card: "BT20-047", dp: 1000, suspended: true, as: "targetTwo" },
            // Keep this target below the 9000-DP attacker so the next-own-turn public
            // attack proves the once-per-turn reset rather than a failed battle.
            { card: "BT20-010", dp: 1000, suspended: true, as: "targetThree" },
          ],
          deck: ["BT20-010", "BT20-010", "BT20-010"],
          hand: ["BT1-010"],
          security: ["BT1-010", "BT1-010", "BT1-010"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferred },
    );
    await s.ready();
    const targetOneId = s.perm("targetOne").permanentId;
    const targetTwoId = s.perm("targetTwo").permanentId;
    const targetThreeId = s.perm("targetThree").permanentId;
    const gaiaId = s.inst("gaia").instanceId;
    const securityIds = s.state.players[1]!.security.map((card) => card.instanceId);
    s.state.memory = 10;
    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: gaiaId })).toEqual({ ok: true });
    await settle(() => !s.state.players[1]!.battleArea.some((p) => p.permanentId === targetOneId));
    expect(s.state.players[1]!.security.map((card) => card.instanceId)).toEqual(securityIds.slice(1));

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attackerOne").permanentId,
        target: { kind: "permanent", permanentId: targetTwoId },
      }),
    ).toEqual({ ok: true });
    await settle(() => !s.state.players[1]!.battleArea.some((p) => p.permanentId === targetTwoId));
    expect(s.state.players[1]!.security.map((card) => card.instanceId)).toEqual(securityIds.slice(1));

    advance(s.engine).endMainPhaseIfOpen(0);
    await advance(s.engine).waitForMainPhase(1);
    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: targetThreeId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("targetThree").isSuspended);
    advance(s.engine).endMainPhaseIfOpen(1);
    await advance(s.engine).waitForMainPhase(0);
    preferred.push(targetThreeId);
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attackerTwo").permanentId,
        target: { kind: "permanent", permanentId: targetThreeId },
      }),
    ).toEqual({ ok: true });
    await settle(() => !s.state.players[1]!.battleArea.some((p) => p.permanentId === targetThreeId));
    expect(s.state.players[1]!.security.map((card) => card.instanceId)).toEqual(securityIds.slice(2));
    expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });
});
