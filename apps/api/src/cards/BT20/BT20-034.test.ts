import { getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { matchingAlternateDigivolutionRequirement } from "../../engine/cards/cardData.js";
import { observe } from "../../engine/testkit/observe.js";
import { drainMicrotasks, setupEngine, settle, type EngineSetup } from "../../engine/testkit/harness.js";
import { compiled } from "./BT20-034.js";
import "./index.js";
import "./BT20-003.js";
import "../BT14/BT14-087.js";
import "../BT1/BT1-036.js";
import "./BT20-043.js";
import "../BT14/BT14-053.js";
import "../P/P-150.js";
import "../BT21/BT21-045.js";

describe("BT20-034 Boutmon", () => {
  it("has Fortitude, restricts one opponent Digimon after a Tamer enters the stack, and trashes security on inherited battle deletion", () => {
    expect(compiled.effects.find((entry) => entry.trigger === "Static")?.keywords).toEqual([
      { keyword: "Fortitude", raw: "＜Fortitude＞" },
    ]);
    const main = compiled.effects.find((entry) => entry.trigger === "AllTurns" && !entry.isInherited);
    expect(main).toMatchObject({
      actions: [
        {
          kind: "SubTrigger",
          event: "onAddDigivolutionCards",
          sourceFilter: { controllerDefault: "mine" },
          triggerFilter: { isSelfRef: true },
          addedDigivolutionCardFilter: { kind: ["Tamer"] },
          actions: [
            {
              kind: "Restrict",
              restriction: "cannotActivateWhenDigivolving",
              duration: "untilOpponentTurnEnd",
              target: { filter: { controller: "opponent", kind: ["Digimon"] }, count: 1 },
            },
          ],
        },
      ],
    });
    expect(compiled.effects.find((entry) => entry.isInherited)).toMatchObject({
      trigger: "AllTurns",
      frequency: "OncePerTurn",
      actions: [
        {
          kind: "SubTrigger",
          event: "whenDeletesInBattle",
          sourceFilter: { isSelfRef: true },
          actions: [{ kind: "SecurityManipulation", op: "trashTop", controller: "opponent", amount: 1 }],
        },
      ],
    });
    expect(compiled.digivolutionRequirement).toEqual([
      { level: 4, texts: ["Pulsemon"], cost: 3, isAlternate: true },
      { level: 4, traits: ["SEEKERS"], cost: 3, isAlternate: true },
    ]);
  });

  it("publishes Boutmon's catalog identity and both level-4 alternate routes", () => {
    expect(getCardDefinition("BT20-034")).toMatchObject({
      cardId: "BT20-034",
      nameEn: "Boutmon",
      colors: ["Yellow", "Green"],
      kinds: ["Digimon"],
      level: 5,
      playCost: 7,
      dp: 7000,
      evoCosts: [
        { color: "Purple", level: 4, memoryCost: 4 },
        { color: "Green", level: 4, memoryCost: 4 },
      ],
      forms: ["Ultimate"],
      attributes: ["Vaccine"],
      types: ["Beastkin", "Abadin Electronics", "SEEKERS"],
    });
    const bulkmon = getCardDefinition("BT20-032");
    if (bulkmon === undefined) throw new Error("BT20-032 catalog definition is required for this boundary");
    expect(matchingAlternateDigivolutionRequirement("BT20-034", bulkmon)).toMatchObject({
      level: 4,
      texts: ["Pulsemon"],
      cost: 3,
    });

    const pulsemonNameOnly = {
      ...bulkmon,
      nameEn: "Pulsemon",
      effectText: "[On Play] Draw 1.",
      types: ["Other"],
    };
    expect(matchingAlternateDigivolutionRequirement("BT20-034", pulsemonNameOnly)).toMatchObject({
      level: 4,
      texts: ["Pulsemon"],
      cost: 3,
    });

    const seekersOnly = {
      ...bulkmon,
      effectText: "[On Play] Draw 1.",
      types: ["SEEKERS"],
    };
    expect(matchingAlternateDigivolutionRequirement("BT20-034", seekersOnly)).toMatchObject({
      level: 4,
      traits: ["SEEKERS"],
      cost: 3,
    });
    expect(matchingAlternateDigivolutionRequirement("BT20-034", "BT20-024")).toBeUndefined();
  });

  it("has Fortitude and restricts an opponent after a Tamer enters its source stack", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT20-034", as: "boutmon" }],
          hand: [{ card: "BT20-085", as: "tamer" }],
        },
        1: { battleArea: [{ card: "BT20-010", as: "target" }] },
      },
      { autoSelectCards: true },
    );
    await s.ready();
    expect(observe(s.engine).hasKeyword(s.perm("boutmon"), "Fortitude")).toBe(true);
    await advance(s.engine).verb.placeUnder(s.perm("boutmon").permanentId, [s.inst("tamer").instanceId]);
    await settle(() => observe(s.engine).isRestricted(s.perm("target"), "cannotActivateWhenDigivolving"));

    const unrelatedHost = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT20-034", as: "boutmon" },
            { card: "BT20-030", as: "otherHost" },
          ],
          hand: [{ card: "BT20-085", as: "tamer" }],
        },
        1: { battleArea: [{ card: "BT20-010", as: "target" }] },
      },
      { autoSelectCards: true },
    );
    await unrelatedHost.ready();
    await advance(unrelatedHost.engine).verb.placeUnder(unrelatedHost.perm("otherHost").permanentId, [
      unrelatedHost.inst("tamer").instanceId,
    ]);
    expect(
      observe(unrelatedHost.engine).isRestricted(unrelatedHost.perm("target"), "cannotActivateWhenDigivolving"),
    ).toBe(false);
  });

  it("publicly replays the same Fortitude Digimon after it is deleted in battle", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT20-034", suspended: true, as: "boutmon", under: ["BT20-032"] }],
          security: ["BT1-010"],
          deck: ["BT1-010", "BT1-010"],
        },
        1: {
          battleArea: [{ card: "BT1-010", dp: 13000, as: "attacker" }],
          security: ["BT1-010"],
          deck: ["BT1-010", "BT1-010"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const originalInstanceId = s.inst("boutmon").instanceId;
    await s.ready();
    s.state.turnSeat = 1;
    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "permanent", permanentId: s.perm("boutmon").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        !observe(s.engine).isAttacking() &&
        s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.instanceId === originalInstanceId),
    );
    const replayed = s.state.players[0]!.battleArea.find(
      (permanent) => permanent.topCard.instanceId === originalInstanceId,
    );
    expect(replayed).toBeDefined();
    expect(replayed!.stack).toHaveLength(0);
    expect(s.state.players[0]!.trash.some((card) => card.cardId === "BT20-032")).toBe(true);
  });

  it("publicly places a matching Tamer through Bibimon's inherited end-of-turn effect", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT20-034", as: "boutmon", under: ["BT20-003", "BT20-029", "BT20-032"] },
            { card: "BT14-087", as: "tamer" },
          ],
          deck: ["BT1-010", "BT1-010"],
        },
        1: { battleArea: [{ card: "BT20-010", as: "target" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const hostId = s.perm("boutmon").permanentId;
    await s.ready();
    const ownTurn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(0);
    advance(s.engine).endMainPhaseIfOpen(0);
    await ownTurn;
    await settle(() => s.perm("boutmon").stack.some((card) => card.instanceId === s.inst("tamer").instanceId));
    expect(s.perm("boutmon").stack.some((card) => card.instanceId === s.inst("tamer").instanceId)).toBe(true);
    expect(observe(s.engine).isRestricted(s.perm("target"), "cannotActivateWhenDigivolving")).toBe(true);
    expect(hostId).toBe(s.perm("boutmon").permanentId);
  });

  it("publicly evolves from a level-4 Digimon with Pulsemon in its text and rejects a level-3 source", async () => {
    const legal = setupEngine({
      0: { battleArea: [{ card: "BT20-032", as: "bulkmon" }], hand: [{ card: "BT20-034", as: "boutmon" }] },
    });
    legal.state.memory = 3;
    expect(
      legal.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: legal.perm("bulkmon").permanentId,
        instanceId: legal.inst("boutmon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(
      () => legal.perm("bulkmon").topCard.cardId === "BT20-034" && legal.state.pendingDecision === undefined,
    );
    expect(legal.perm("bulkmon").stack.map((card) => card.cardId)).toEqual(["BT20-032"]);

    const illegal = setupEngine({
      0: { battleArea: [{ card: "BT20-029", as: "pulsemon" }], hand: [{ card: "BT20-034", as: "boutmon" }] },
    });
    illegal.state.memory = 3;
    expect(
      illegal.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: illegal.perm("pulsemon").permanentId,
        instanceId: illegal.inst("boutmon").instanceId,
      }),
    ).toMatchObject({ ok: false });
    expect(illegal.perm("pulsemon").topCard.cardId).toBe("BT20-029");
    expect(illegal.state.players[0]!.hand.map((card) => card.cardId)).toContain("BT20-034");
  });

  it("restricts exactly one selected opposing Digimon and expires at the real opponent turn end", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT20-034", as: "boutmon" }], hand: [{ card: "BT20-085", as: "tamer" }] },
        1: {
          battleArea: [
            { card: "BT20-010", as: "selected" },
            { card: "BT20-010", as: "other" },
          ],
          hand: [{ card: "BT1-070", as: "playable" }],
          deck: ["BT1-010", "BT1-010", "BT1-010", "BT1-010"],
        },
      },
      { autoSelectCards: true, preferInstanceIds: preferred },
    );
    preferred.push(s.perm("selected").permanentId);
    await s.ready();
    await advance(s.engine).verb.placeUnder(s.perm("boutmon").permanentId, [s.inst("tamer").instanceId]);
    await settle(() => observe(s.engine).isRestricted(s.perm("selected"), "cannotActivateWhenDigivolving"));
    expect(observe(s.engine).isRestricted(s.perm("other"), "cannotActivateWhenDigivolving")).toBe(false);

    s.state.memory = -4;
    s.state.turnSeat = 1;
    s.state.memory = -s.state.memory;
    const opponentTurn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(1);
    advance(s.engine).endMainPhaseIfOpen(1);
    await opponentTurn;
    expect(observe(s.engine).isRestricted(s.perm("selected"), "cannotActivateWhenDigivolving")).toBe(false);
  });

  it("suppresses a restricted target's When Digivolving effect on a public evolution", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT20-034", as: "boutmon" }],
          hand: [{ card: "BT20-085", as: "tamer" }],
        },
        1: {
          battleArea: [{ card: "BT20-071", as: "target" }],
          hand: [{ card: "BT20-035", as: "evolution" }],
          security: ["BT1-010", "BT1-010", "BT1-010"],
        },
      },
      { autoSelectCards: true },
    );
    await s.ready();
    await advance(s.engine).verb.placeUnder(s.perm("boutmon").permanentId, [s.inst("tamer").instanceId]);
    await settle(() => observe(s.engine).isRestricted(s.perm("target"), "cannotActivateWhenDigivolving"));
    s.state.turnSeat = 1;
    s.state.memory = 3;
    expect(
      s.engine.applyIntent(1, {
        type: "digivolve",
        permanentId: s.perm("target").permanentId,
        instanceId: s.inst("evolution").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("target").topCard.cardId === "BT20-035");
    expect(s.perm("boutmon").isSuspended).toBe(false);
    expect(s.state.players[1]!.security).toHaveLength(3);
  });

  it("inherits one opposing top-security trash after its host deletes in battle", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT20-035", as: "host", under: ["BT20-034"] }] },
      1: {
        battleArea: [{ card: "BT20-010", dp: 1000, suspended: true, as: "opponent" }],
        security: ["BT1-010", "BT1-010"],
      },
    });
    s.state.memory = 5;
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "permanent", permanentId: s.perm("opponent").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.battleArea.length === 0 && s.state.players[1]!.security.length === 1);
    expect(s.state.players[0]!.battleArea).toContain(s.perm("host"));
  });

  it("does not trash security when its host and the opponent leave simultaneously", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT20-043", dp: 12000, as: "host", under: ["BT20-034"] }] },
      1: {
        battleArea: [{ card: "BT20-010", dp: 12000, suspended: true, as: "opponent" }],
        security: ["BT1-010", "BT1-010"],
        deck: ["BT1-010", "BT1-010"],
      },
    });
    const hostId = s.perm("host").permanentId;
    const opponentId = s.perm("opponent").permanentId;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: hostId,
        target: { kind: "permanent", permanentId: opponentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => !observe(s.engine).isAttacking());
    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.permanentId === hostId)).toBe(false);
    expect(s.state.players[1]!.battleArea.some((permanent) => permanent.permanentId === opponentId)).toBe(false);
    expect(s.state.players[1]!.security).toHaveLength(2);
  });

  it("resets inherited security trash after a real turn while the host remains over Boutmon", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT20-035", dp: 12000, as: "host", under: ["BT20-034"] }],
          hand: [{ card: "BT1-036", as: "garurumon" }, "BT1-010"],
          security: ["BT1-010"],
          deck: ["BT1-010", "BT1-010", "BT1-010"],
        },
        1: {
          battleArea: [
            { card: "BT20-010", dp: 1000, suspended: true, as: "first" },
            { card: "BT20-010", dp: 1000, suspended: true, as: "second" },
            { card: "BT20-010", dp: 3000, suspended: true, as: "third" },
          ],
          security: ["BT1-010", "BT1-010"],
          deck: ["BT1-010", "BT1-010", "BT1-010"],
        },
      },
      { autoAcceptOptional: true, autoDeclineOptional: true, autoSelectCards: true },
    );
    const hostId = s.perm("host").permanentId;
    const firstId = s.perm("first").permanentId;
    const secondId = s.perm("second").permanentId;
    const thirdId = s.perm("third").permanentId;
    await s.ready();
    s.state.memory = 6;
    const ownTurn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(0);
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: hostId,
        target: { kind: "permanent", permanentId: firstId },
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        s.state.players[1]!.security.length === 1 &&
        !s.state.players[1]!.battleArea.some((p) => p.permanentId === firstId),
    );
    expect(s.state.players[1]!.security).toHaveLength(1);
    expect(s.state.memory).toBe(6);
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("garurumon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => !s.state.players[0]!.hand.some((c) => c.instanceId === s.inst("garurumon").instanceId));
    expect(s.state.memory).toBe(0);
    expect(s.perm("host").isSuspended).toBe(false);
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: hostId,
        target: { kind: "permanent", permanentId: secondId },
      }),
    ).toEqual({ ok: true });
    await settle(() => !s.state.players[1]!.battleArea.some((p) => p.permanentId === secondId));
    expect(s.state.players[1]!.security).toHaveLength(1);
    advance(s.engine).endMainPhaseIfOpen(0);
    await ownTurn;

    s.state.turnSeat = 1;
    s.state.memory = 3;
    const opponentTurn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(1);
    expect(
      s.engine.applyIntent(1, { type: "attack", attackerPermanentId: thirdId, target: { kind: "player" } }),
    ).toEqual({ ok: true });
    await settle(() => !observe(s.engine).isAttacking() && s.perm("third").isSuspended);
    expect(s.perm("third").isSuspended).toBe(true);
    expect(s.perm("host").topCard.cardId).toBe("BT20-035");
    advance(s.engine).endMainPhaseIfOpen(1);
    await opponentTurn;

    s.state.turnSeat = 0;
    s.state.memory = 3;
    const nextOwnTurn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(0);
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: hostId,
        target: { kind: "permanent", permanentId: thirdId },
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        !s.state.players[1]!.battleArea.some((p) => p.permanentId === thirdId) &&
        s.state.players[1]!.security.length === 0,
    );
    expect(s.state.players[1]!.security).toHaveLength(0);
    expect(s.state.players[0]!.trash.some((card) => card.cardId === "BT20-034")).toBe(false);
    expect(s.perm("host").stack.map((card) => card.cardId)).toContain("BT20-034");
    advance(s.engine).endMainPhaseIfOpen(0);
    await nextOwnTurn;
  });

  it("does not trash security when another allied Digimon deletes in battle", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "BT20-035", as: "host", under: ["BT20-034"] },
          { card: "BT20-010", as: "otherAttacker" },
        ],
      },
      1: {
        battleArea: [{ card: "BT20-010", dp: 1000, suspended: true, as: "opponent" }],
        security: ["BT1-010", "BT1-010"],
      },
    });
    s.state.memory = 5;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("otherAttacker").permanentId,
        target: { kind: "permanent", permanentId: s.perm("opponent").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.battleArea.length === 0);

    expect(s.state.players[1]!.security).toHaveLength(2);
    expect(s.state.players[0]!.battleArea).toContain(s.perm("host"));
  });
});

async function restrictOpponentThroughBoutmon(s: EngineSetup, targetAlias: string): Promise<void> {
  await s.ready();
  await advance(s.engine).verb.placeUnder(s.perm("boutmon").permanentId, [s.inst("boutmonTamer").instanceId]);
  await settle(() => observe(s.engine).isRestricted(s.perm(targetAlias), "cannotActivateWhenDigivolving"));
}

function digivolveOpponent(s: EngineSetup, permanentAlias: string, cardAlias: string): void {
  s.state.turnSeat = 1;
  s.state.memory = 4;
  expect(
    s.engine.applyIntent(1, {
      type: "digivolve",
      permanentId: s.perm(permanentAlias).permanentId,
      instanceId: s.inst(cardAlias).instanceId,
    }),
  ).toEqual({ ok: true });
}

function kazuchimonBoard(): EngineSetup {
  return setupEngine(
    {
      0: {
        battleArea: [{ card: "BT20-034", as: "boutmon" }],
        hand: [{ card: "BT20-085", as: "boutmonTamer" }],
      },
      1: {
        battleArea: [{ card: "BT20-071", as: "target" }],
        hand: [
          { card: "BT20-035", as: "kazuchimon" },
          { card: "BT20-085", as: "kazuchimonTamer" },
        ],
        deck: ["BT1-010", "BT1-010"],
      },
    },
    { autoDeclineOptional: true, autoSelectCards: true },
  );
}

function shineGreymonBoard(): EngineSetup {
  return setupEngine(
    {
      0: {
        battleArea: [
          { card: "BT20-034", dp: 12000, as: "boutmon" },
          { card: "BT20-010", as: "firstVictim" },
          { card: "BT20-010", as: "secondVictim" },
        ],
        hand: [{ card: "BT20-085", as: "boutmonTamer" }],
        security: ["BT1-010"],
      },
      1: {
        battleArea: [{ card: "BT20-071", as: "target" }],
        hand: [{ card: "BT21-045", as: "shineGreymon" }],
        deck: ["BT1-010", "BT1-010"],
      },
    },
    { autoAcceptOptional: true, autoSelectCards: true },
  );
}

function victimsInPlay(s: EngineSetup): number {
  const victimIds = [s.inst("firstVictim").instanceId, s.inst("secondVictim").instanceId];
  return s.state.players[0]!.battleArea.filter((permanent) => victimIds.includes(permanent.topCard.instanceId)).length;
}

describe("BT20-034 Boutmon — KB Q&A rulings", () => {
  it("digivolves from a level 4 Digimon whose digivolution requirement names [Pulsemon], because that counts as [Pulsemon] in its text (Q4333)", async () => {
    // P-150 Exermon names [Pulsemon] only in its "[Digivolve] [Pulsemon]: Cost 2" requirement;
    // its name, traits, and effects never mention it, and it lacks the [SEEKERS] trait.
    const exermon = getCardDefinition("P-150");
    if (exermon === undefined) throw new Error("P-150 catalog definition is required for this ruling");
    expect(exermon.effectText).toMatch(/^\[Digivolve\]\s*\[Pulsemon\]: Cost 2/);
    const [requirementHeader, ...printedEffects] = (exermon.effectText ?? "").split("\n\n");
    expect(requirementHeader).toMatch(/Pulsemon/);
    expect(
      [exermon.nameEn, ...(exermon.types ?? []), ...printedEffects, exermon.inheritedEffectText].join(" "),
    ).not.toMatch(/Pulsemon/);
    expect(matchingAlternateDigivolutionRequirement("BT20-034", exermon)).toMatchObject({
      level: 4,
      texts: ["Pulsemon"],
      cost: 3,
    });
    const exermonWithoutRequirement = { ...exermon, effectText: printedEffects.join("\n\n") };
    expect(matchingAlternateDigivolutionRequirement("BT20-034", exermonWithoutRequirement)).toBeUndefined();

    const pulsemonTextRoute = 0;
    const digivolveThroughPulsemonTextRoute = (sourceCardId: string) => {
      const s = setupEngine({
        0: {
          battleArea: [{ card: sourceCardId, as: "source" }],
          hand: [{ card: "BT20-034", as: "boutmon" }],
          deck: ["BT1-010", "BT1-010"],
        },
      });
      s.state.memory = 3;
      const result = s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("source").permanentId,
        instanceId: s.inst("boutmon").instanceId,
        alternateRequirementIndex: pulsemonTextRoute,
      });
      return { s, result };
    };

    const accepted = digivolveThroughPulsemonTextRoute("P-150");
    expect(accepted.result).toEqual({ ok: true });
    await settle(
      () => accepted.s.perm("source").topCard.cardId === "BT20-034" && accepted.s.state.pendingDecision === undefined,
    );
    expect(accepted.s.perm("source").stack.map((card) => card.cardId)).toEqual(["P-150"]);
    expect(accepted.s.state.memory).toBe(0);

    const vanillaGreenLevel4 = digivolveThroughPulsemonTextRoute("BT4-053");
    expect(vanillaGreenLevel4.result).toMatchObject({ ok: false });
    expect(vanillaGreenLevel4.s.perm("source").topCard.cardId).toBe("BT4-053");
    expect(vanillaGreenLevel4.s.state.memory).toBe(3);
  });

  it("stops a restricted Digimon's [When Digivolving] effect both from triggering and from being activated by another effect (Q4334)", async () => {
    const restricted = kazuchimonBoard();
    await restrictOpponentThroughBoutmon(restricted, "target");
    digivolveOpponent(restricted, "target", "kazuchimon");
    await settle(() => restricted.perm("target").topCard.cardId === "BT20-035");
    await drainMicrotasks();
    expect(restricted.perm("boutmon").isSuspended).toBe(false);

    await advance(restricted.engine).verb.placeUnder(restricted.perm("target").permanentId, [
      restricted.inst("kazuchimonTamer").instanceId,
    ]);
    await settle(() =>
      restricted.perm("target").stack.some((card) => card.instanceId === restricted.inst("kazuchimonTamer").instanceId),
    );
    await drainMicrotasks();
    expect(observe(restricted.engine).isRestricted(restricted.perm("target"), "cannotActivateWhenDigivolving")).toBe(
      true,
    );
    expect(restricted.perm("boutmon").isSuspended).toBe(false);

    const unrestricted = kazuchimonBoard();
    await unrestricted.ready();
    digivolveOpponent(unrestricted, "target", "kazuchimon");
    await settle(() => unrestricted.perm("boutmon").isSuspended);
    unrestricted.perm("boutmon").isSuspended = false;
    await advance(unrestricted.engine).verb.placeUnder(unrestricted.perm("target").permanentId, [
      unrestricted.inst("kazuchimonTamer").instanceId,
    ]);
    await settle(() => unrestricted.perm("boutmon").isSuspended);
  });

  it("still activates a restricted Digimon's shared [When Digivolving] [When Attacking] effect when it attacks (Q4335)", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT20-034", as: "boutmon" }],
          hand: [{ card: "BT20-085", as: "boutmonTamer" }],
          security: ["BT1-010"],
        },
        1: { battleArea: [{ card: "BT14-053", as: "rosemon" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await restrictOpponentThroughBoutmon(s, "rosemon");
    expect(s.perm("boutmon").isSuspended).toBe(false);
    s.state.turnSeat = 1;
    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("rosemon").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("boutmon").isSuspended);
    expect(observe(s.engine).isRestricted(s.perm("rosemon"), "cannotActivateWhenDigivolving")).toBe(true);
  });

  it("does not let another effect activate a restricted Digimon's [When Digivolving] effect (Q4336)", async () => {
    const boardWithKazuchimonInPlay = () =>
      setupEngine(
        {
          0: {
            battleArea: [{ card: "BT20-034", as: "boutmon" }],
            hand: [{ card: "BT20-085", as: "boutmonTamer" }],
          },
          1: {
            battleArea: [{ card: "BT20-035", as: "kazuchimon" }],
            hand: [{ card: "BT20-085", as: "kazuchimonTamer" }],
          },
        },
        { autoDeclineOptional: true, autoSelectCards: true },
      );
    const placeTamerUnderKazuchimon = async (s: EngineSetup) => {
      await advance(s.engine).verb.placeUnder(s.perm("kazuchimon").permanentId, [s.inst("kazuchimonTamer").instanceId]);
      await settle(() =>
        s.perm("kazuchimon").stack.some((card) => card.instanceId === s.inst("kazuchimonTamer").instanceId),
      );
    };

    const restricted = boardWithKazuchimonInPlay();
    await restrictOpponentThroughBoutmon(restricted, "kazuchimon");
    await placeTamerUnderKazuchimon(restricted);
    await drainMicrotasks();
    expect(restricted.perm("boutmon").isSuspended).toBe(false);

    const unrestricted = boardWithKazuchimonInPlay();
    await unrestricted.ready();
    await placeTamerUnderKazuchimon(unrestricted);
    await settle(() => unrestricted.perm("boutmon").isSuspended);
  });

  it('does not let a restricted Digimon pay the "by" cost of its [When Digivolving] effect (Q4337)', async () => {
    const soloogarmonBoard = () =>
      setupEngine(
        {
          0: {
            battleArea: [{ card: "BT20-034", as: "boutmon" }],
            hand: [{ card: "BT20-085", as: "boutmonTamer" }],
          },
          1: {
            battleArea: [{ card: "BT20-032", as: "target" }],
            hand: [
              { card: "BT20-071", as: "soloogarmon" },
              { card: "BT1-010", as: "handCost" },
            ],
            deck: ["BT1-010", "BT1-010"],
          },
        },
        { autoAcceptOptional: true, autoSelectCards: true },
      );
    const handCostStillInHand = (s: EngineSetup) =>
      s.state.players[1]!.hand.some((card) => card.instanceId === s.inst("handCost").instanceId);

    const restricted = soloogarmonBoard();
    await restrictOpponentThroughBoutmon(restricted, "target");
    digivolveOpponent(restricted, "target", "soloogarmon");
    await settle(() => restricted.perm("target").topCard.cardId === "BT20-071");
    await drainMicrotasks();
    expect(restricted.state.pendingDecision).toBeUndefined();
    expect(handCostStillInHand(restricted)).toBe(true);
    expect(observe(restricted.engine).hasKeyword(restricted.perm("target"), "Raid")).toBe(false);

    const unrestricted = soloogarmonBoard();
    await unrestricted.ready();
    digivolveOpponent(unrestricted, "target", "soloogarmon");
    await settle(() => !handCostStillInHand(unrestricted));
    expect(observe(unrestricted.engine).hasKeyword(unrestricted.perm("target"), "Raid")).toBe(true);
  });

  it("does not count a blocked [When Digivolving] timing toward a shared [Once Per Turn], so [When Attacking] still activates (Q4338)", async () => {
    const restricted = shineGreymonBoard();
    await restrictOpponentThroughBoutmon(restricted, "target");
    digivolveOpponent(restricted, "target", "shineGreymon");
    await settle(() => restricted.perm("target").topCard.cardId === "BT21-045");
    await drainMicrotasks();
    expect(victimsInPlay(restricted)).toBe(2);
    expect(
      restricted.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: restricted.perm("target").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => victimsInPlay(restricted) === 1);

    const unrestricted = shineGreymonBoard();
    await unrestricted.ready();
    digivolveOpponent(unrestricted, "target", "shineGreymon");
    await settle(() => victimsInPlay(unrestricted) === 1);
    expect(
      unrestricted.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: unrestricted.perm("target").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => !observe(unrestricted.engine).isAttacking() && unrestricted.state.pendingDecision === undefined);
    expect(victimsInPlay(unrestricted)).toBe(1);
  });

  it("does not trash security when the Boutmon-stacked host and the opposing Digimon are deleted at the same time (Q4341)", async () => {
    const battleWithHostDp = async (hostDp: number) => {
      const s = setupEngine({
        0: { battleArea: [{ card: "BT20-043", dp: hostDp, as: "host", under: ["BT20-034"] }] },
        1: {
          battleArea: [{ card: "BT20-010", dp: 12000, suspended: true, as: "opponent" }],
          security: ["BT1-010", "BT1-010"],
          deck: ["BT1-010", "BT1-010"],
        },
      });
      const hostId = s.perm("host").permanentId;
      const opponentId = s.perm("opponent").permanentId;
      await s.ready();
      expect(
        s.engine.applyIntent(0, {
          type: "attack",
          attackerPermanentId: hostId,
          target: { kind: "permanent", permanentId: opponentId },
        }),
      ).toEqual({ ok: true });
      await settle(() => !observe(s.engine).isAttacking() && s.state.pendingDecision === undefined);
      await drainMicrotasks();
      return {
        hostInPlay: s.state.players[0]!.battleArea.some((permanent) => permanent.permanentId === hostId),
        opponentInPlay: s.state.players[1]!.battleArea.some((permanent) => permanent.permanentId === opponentId),
        opponentSecurity: s.state.players[1]!.security.length,
      };
    };

    expect(await battleWithHostDp(12000)).toEqual({ hostInPlay: false, opponentInPlay: false, opponentSecurity: 2 });
    expect(await battleWithHostDp(13000)).toEqual({ hostInPlay: true, opponentInPlay: false, opponentSecurity: 1 });
  });
});
