import { describe, expect, it } from "vitest";
import { digivolutionRequirementsFor, getCardDefinition } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { assertNoLoudGap, setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { syncPublicCounts } from "../../engine/state/visibility.js";
import "../index.js";
import "./BT19-053.js";
import "../BT5/BT5-110.js";
import { compiled } from "./BT19-048.js";

const INERT_SECURITY = ["BT1-009", "BT1-011", "BT1-012"];
const INERT_DECK = ["BT1-012", "BT1-012", "BT1-012"];
const QUEEN_PLACEMENT_PROMPT = "as your security card";

type Setup = ReturnType<typeof setupEngine>;

async function openMain(s: Setup, seat: 0 | 1): Promise<void> {
  await advance(s.engine).waitForMainPhase(seat);
}

function closeMain(s: Setup, seat: 0 | 1): void {
  advance(s.engine).endMainPhaseIfOpen(seat);
}

async function stopLoop(s: Setup, loop: Promise<void>, seat: 0 | 1): Promise<void> {
  expect(s.engine.applyIntent(seat, { type: "surrender" })).toEqual({ ok: true });
  await loop;
}

describe("BT19-048 ForgeBeemon", () => {
  it("matches the printed catalog entry and compiles every printed clause", () => {
    expect(getCardDefinition("BT19-048")).toMatchObject({
      cardId: "BT19-048",
      nameEn: "ForgeBeemon",
      colors: ["Green", "Black"],
      kinds: ["Digimon"],
      level: 4,
      playCost: 4,
      dp: 4000,
      attributes: ["Virus"],
      types: ["Cyborg", "X Antibody", "Royal Base", "LIBERATOR", "Insectoid"],
      inheritedEffectText: "[All Turns] This Digimon gets +1000 DP.",
    });
    expect(getCardDefinition("BT19-048")!.effectText!.replace(/\u00a0/g, " ")).toBe(
      "[Digivolve]Lv.3 w/[Royal Base] trait: Cost 2 \n\n" +
        "[Security] [All Turns] All of your [Royal Base] trait Digimon get +1000 DP.\n" +
        "[All Turns] [Once Per Turn] When any of your other Digimon with the [Royal Base] trait " +
        "would leave the battle area by effects, by placing this Digimon as the face-up bottom " +
        "security card, they don't leave.\n" +
        "[Rule] Trait: Has the [Insectoid] type.",
    );
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
    expect(digivolutionRequirementsFor("BT19-048")).toContainEqual({
      level: 3,
      traits: ["Royal Base"],
      cost: 2,
      isAlternate: true,
    });

    expect(compiled.effects?.[0]).toMatchObject({
      trigger: "AllTurns",
      isSecurity: true,
      actions: [
        {
          kind: "ModifyDP",
          amount: 1000,
          duration: "permanent",
          target: {
            count: "all",
            filter: {
              controller: "mine",
              kind: ["Digimon"],
              nameOrTrait: [{ tokens: ["Royal Base"], match: "trait" }],
            },
          },
        },
      ],
    });
    expect(compiled.effects?.[1]).toMatchObject({
      trigger: "AllTurns",
      frequency: "OncePerTurn",
      actions: [
        {
          kind: "Replacement",
          event: "wouldLeavePlay",
          mode: "prevent",
          affectsAll: true,
          sourceFilter: { controller: "mine", excludeSelf: true, leaveReason: "effect" },
          target: { count: "all", filter: { controller: "mine", excludeSelf: true, leaveReason: "effect" } },
          cost: { kind: "placeAsSecurity", position: "faceUpBottom", target: { isSelf: true } },
        },
      ],
    });
    expect(compiled.effects?.[2]).toMatchObject({
      trigger: "Rule",
      actions: [{ kind: "GrantStatic", grant: "trait", tokens: ["Insectoid"] }],
    });
    expect(compiled.effects?.[3]).toMatchObject({
      trigger: "AllTurns",
      isInherited: true,
      actions: [{ kind: "ModifyDP", amount: 1000, duration: "permanent", target: { isSelf: true } }],
    });
  });

  it("publicly digivolves from a Lv.3 [Royal Base] source for the reduced cost of 2", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT18-044", as: "base" }],
        hand: [{ card: "BT19-048", as: "forge" }],
        deck: [{ card: "BT1-012", as: "bonusDraw" }],
        security: INERT_SECURITY,
      },
      1: { security: INERT_SECURITY, deck: INERT_DECK },
    });
    s.state.memory = 5;
    await s.ready();
    const baseId = s.inst("base").instanceId;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("forge").instanceId,
        useAlternateCost: true,
        alternateRequirementIndex: 0,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard?.cardId === "BT19-048");

    expect(s.state.memory).toBe(3);
    expect(s.perm("base").stack.map((card) => card.instanceId)).toEqual([baseId]);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toEqual([s.inst("bonusDraw").instanceId]);
    expect(s.state.players[0]!.deck).toHaveLength(0);
    expect(s.state.players[0]!.security).toHaveLength(3);
    assertNoLoudGap(s);
  });

  it("charges the printed colour cost of 3 from a Lv.3 source without the [Royal Base] trait", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT1-064", as: "goblimon" }],
        hand: [{ card: "BT19-048", as: "forge" }],
        deck: [{ card: "BT1-012", as: "bonusDraw" }],
        security: INERT_SECURITY,
      },
      1: { security: INERT_SECURITY, deck: INERT_DECK },
    });
    s.state.memory = 5;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("goblimon").permanentId,
        instanceId: s.inst("forge").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("goblimon").topCard?.cardId === "BT19-048");

    expect(s.state.memory).toBe(2);
  });

  it("refuses the [Royal Base] route from a source without that trait and from a Lv.4 source", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "BT1-064", as: "goblimon" },
          { card: "BT18-046", as: "royalLevelFour" },
        ],
        hand: [{ card: "BT19-048", as: "forge" }],
        deck: INERT_DECK,
        security: INERT_SECURITY,
      },
      1: { security: INERT_SECURITY, deck: INERT_DECK },
    });
    s.state.memory = 5;
    await s.ready();
    const forgeId = s.inst("forge").instanceId;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("goblimon").permanentId,
        instanceId: forgeId,
        useAlternateCost: true,
        alternateRequirementIndex: 0,
      }),
    ).not.toEqual({ ok: true });
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("royalLevelFour").permanentId,
        instanceId: forgeId,
        useAlternateCost: true,
        alternateRequirementIndex: 0,
      }),
    ).not.toEqual({ ok: true });

    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toEqual([forgeId]);
    expect(s.state.memory).toBe(5);
    expect(s.state.players[0]!.battleArea.map((permanent) => permanent.topCard?.cardId)).toEqual([
      "BT1-064",
      "BT18-046",
    ]);
  });

  it("buffs only its controller's [Royal Base] Digimon while face up in security", async () => {
    const s = setupEngine({
      0: {
        security: [{ card: "BT19-048", faceUp: true }, ...INERT_SECURITY],
        battleArea: [
          { card: "BT19-045", as: "royalLevelThree" },
          { card: "BT19-052", as: "royalLevelFive" },
          { card: "BT19-015", as: "royalKnight" },
          { card: "BT1-013", as: "plain" },
        ],
        deck: INERT_DECK,
      },
      1: {
        battleArea: [{ card: "BT19-045", as: "opponentRoyal" }],
        security: INERT_SECURITY,
        deck: INERT_DECK,
      },
    });
    await s.ready();

    expect(s.perm("royalLevelThree").currentDP).toBe(2000);
    expect(s.perm("royalLevelFive").currentDP).toBe(9000);
    expect(s.perm("royalKnight").currentDP).toBe(12000);
    expect(s.perm("plain").currentDP).toBe(5000);
    expect(s.perm("opponentRoyal").currentDP).toBe(1000);
    expect(s.state.players[0]!.security[0]!.faceUp).toBe(true);
    expect(s.state.players[0]!.security.filter((card) => card.faceUp === true)).toHaveLength(1);
    assertNoLoudGap(s);
  });

  it("gives no buff from a face-down security copy or from a battle-area copy", async () => {
    const faceDown = setupEngine({
      0: {
        security: ["BT19-048", ...INERT_SECURITY],
        battleArea: [{ card: "BT19-045", as: "royal" }],
        deck: INERT_DECK,
      },
      1: { security: INERT_SECURITY, deck: INERT_DECK },
    });
    await faceDown.ready();
    expect(faceDown.perm("royal").currentDP).toBe(1000);

    const onField = setupEngine({
      0: {
        battleArea: [
          { card: "BT19-048", as: "forge" },
          { card: "BT19-045", as: "royal" },
        ],
        security: INERT_SECURITY,
        deck: INERT_DECK,
      },
      1: { security: INERT_SECURITY, deck: INERT_DECK },
    });
    await onField.ready();
    expect(onField.perm("royal").currentDP).toBe(1000);
    expect(onField.perm("forge").currentDP).toBe(4000);
  });

  it("is checked as an ordinary security card while revealed, and the buff ends with it (Q3101)", async () => {
    const s = setupEngine({
      0: {
        security: [{ card: "BT19-048", as: "forge", faceUp: true }],
        battleArea: [{ card: "BT19-045", as: "royal" }],
        deck: INERT_DECK,
      },
      1: {
        battleArea: [{ card: "BT1-013", as: "attacker", dp: 20_000 }],
        security: INERT_SECURITY,
        deck: INERT_DECK,
      },
    });
    await s.ready();
    expect(s.perm("royal").currentDP).toBe(2000);
    const loop = s.engine.startTurnLoop();
    await openMain(s, 0);
    closeMain(s, 0);
    await openMain(s, 1);

    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.security.length === 0);
    closeMain(s, 1);
    await stopLoop(s, loop, 1);

    expect(s.state.players[0]!.trash.map((card) => card.cardId)).toEqual(["BT19-048"]);
    expect(s.perm("royal").currentDP).toBe(1000);
  });

  it("goes face down when an effect shuffles the security stack, ending the buff (Q3103)", async () => {
    const s = setupEngine(
      {
        0: {
          security: [{ card: "BT19-048", faceUp: true }, ...INERT_SECURITY],
          battleArea: [
            { card: "BT19-045", as: "royal" },
            { card: "BT1-045", as: "yellowSource" },
          ],
          hand: [{ card: "BT14-093", as: "emissary" }, "BT1-012"],
          deck: INERT_DECK,
        },
        1: { security: INERT_SECURITY, deck: INERT_DECK },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    s.state.memory = 5;
    await s.ready();
    expect(s.perm("royal").currentDP).toBe(2000);

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("emissary").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.security.every((card) => card.faceUp !== true));

    expect(s.state.players[0]!.security).toHaveLength(4);
    expect(s.state.players[0]!.security.every((card) => card.faceUp !== true)).toBe(true);
    expect(s.perm("royal").currentDP).toBe(1000);
  });

  it("keeps every simultaneously-leaving [Royal Base] Digimon for one placement (Q3098)", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT19-048", as: "forge", dp: 20_000 },
            { card: "BT19-045", as: "royalOne" },
            { card: "BT18-044", as: "royalTwo" },
            { card: "BT1-013", as: "plain" },
          ],
          security: [{ card: "BT1-009", as: "secTop" }, ...INERT_SECURITY.slice(1)],
          deck: INERT_DECK,
          hand: ["BT1-012"],
        },
        1: {
          battleArea: [{ card: "BT1-014", as: "opponentRedSource", dp: 20_000 }],
          hand: [{ card: "BT8-097", as: "blaze" }, "BT1-012"],
          security: INERT_SECURITY,
          deck: INERT_DECK,
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    const forgeId = s.inst("forge").instanceId;
    const loop = s.engine.startTurnLoop();
    await openMain(s, 0);
    closeMain(s, 0);
    await openMain(s, 1);

    expect(s.engine.applyIntent(1, { type: "playCard", instanceId: s.inst("blaze").instanceId })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.security.length === 4);
    closeMain(s, 1);
    await stopLoop(s, loop, 1);

    expect(s.state.players[0]!.battleArea.map((permanent) => permanent.topCard?.cardId).sort()).toEqual([
      "BT18-044",
      "BT19-045",
    ]);
    expect(s.state.players[0]!.trash.map((card) => card.cardId)).toEqual(["BT1-013"]);
    const security = s.state.players[0]!.security;
    expect(security.at(-1)!.instanceId).toBe(forgeId);
    expect(security.at(-1)!.faceUp).toBe(true);
    expect(security.slice(0, -1).map((card) => card.instanceId)).toEqual([
      s.inst("secTop").instanceId,
      ...security.slice(1, -1).map((card) => card.instanceId),
    ]);
    expect(security.slice(0, -1).every((card) => card.faceUp !== true)).toBe(true);
    expect(s.perm("royalOne").currentDP).toBe(2000);
    expect(s.perm("royalTwo").currentDP).toBe(2000);
    assertNoLoudGap(s);
  });

  it("declining the placement lets the opponent's effect take every [Royal Base] Digimon", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT19-048", as: "forge", dp: 20_000 },
            { card: "BT19-045", as: "royalOne" },
            { card: "BT18-044", as: "royalTwo" },
          ],
          security: INERT_SECURITY,
          deck: INERT_DECK,
          hand: ["BT1-012"],
        },
        1: {
          battleArea: [{ card: "BT1-014", as: "opponentRedSource", dp: 20_000 }],
          hand: [{ card: "BT8-097", as: "blaze" }, "BT1-012"],
          security: INERT_SECURITY,
          deck: INERT_DECK,
        },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    await s.ready();
    const loop = s.engine.startTurnLoop();
    await openMain(s, 0);
    closeMain(s, 0);
    await openMain(s, 1);

    expect(s.engine.applyIntent(1, { type: "playCard", instanceId: s.inst("blaze").instanceId })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.length === 1);
    closeMain(s, 1);
    await stopLoop(s, loop, 1);

    expect(s.state.players[0]!.battleArea.map((permanent) => permanent.topCard?.cardId)).toEqual(["BT19-048"]);
    expect(s.state.players[0]!.trash.map((card) => card.cardId).sort()).toEqual(["BT18-044", "BT19-045"]);
    expect(s.state.players[0]!.security).toHaveLength(3);
    expect(s.state.players[0]!.security.every((card) => card.faceUp !== true)).toBe(true);
  });

  it("does not answer a battle deletion, only a deletion by effects", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT19-048", as: "forge" },
            { card: "BT19-045", as: "royal" },
          ],
          security: INERT_SECURITY,
          deck: INERT_DECK,
        },
        1: {
          battleArea: [{ card: "BT1-013", as: "wall", dp: 20_000, suspended: true }],
          security: INERT_SECURITY,
          deck: INERT_DECK,
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    const loop = s.engine.startTurnLoop();
    await openMain(s, 0);

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("royal").permanentId,
        target: { kind: "permanent", permanentId: s.perm("wall").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.trash.length === 1);
    closeMain(s, 0);
    await stopLoop(s, loop, 0);

    expect(s.state.players[0]!.trash.map((card) => card.cardId)).toEqual(["BT19-045"]);
    expect(s.state.players[0]!.battleArea.map((permanent) => permanent.topCard?.cardId)).toEqual(["BT19-048"]);
    expect(s.state.players[0]!.security).toHaveLength(3);
    expect(s.state.players[0]!.security.every((card) => card.faceUp !== true)).toBe(true);
  });

  it("never protects itself, and never protects the opponent's [Royal Base] Digimon", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT19-048", as: "forge" },
            { card: "BT1-014", as: "myRedSource", dp: 20_000 },
          ],
          hand: [{ card: "BT2-091", as: "myFlare" }, "BT1-012"],
          security: INERT_SECURITY,
          deck: INERT_DECK,
        },
        1: {
          battleArea: [
            { card: "BT19-045", as: "opponentRoyal" },
            { card: "BT1-014", as: "theirRedSource", dp: 20_000 },
          ],
          hand: [{ card: "BT2-091", as: "theirFlare" }, "BT1-012"],
          security: INERT_SECURITY,
          deck: INERT_DECK,
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    const loop = s.engine.startTurnLoop();
    await openMain(s, 0);

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("myFlare").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[1]!.trash.length === 1);
    expect(s.state.players[1]!.trash.map((card) => card.cardId)).toEqual(["BT19-045"]);
    expect(s.state.players[0]!.security).toHaveLength(3);
    closeMain(s, 0);
    await openMain(s, 1);

    expect(s.engine.applyIntent(1, { type: "playCard", instanceId: s.inst("theirFlare").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.battleArea.length === 1);
    closeMain(s, 1);
    await stopLoop(s, loop, 1);

    expect(s.state.players[0]!.trash.map((card) => card.cardId)).toEqual(["BT2-091", "BT19-048"]);
    expect(s.state.players[0]!.battleArea.map((permanent) => permanent.topCard?.cardId)).toEqual(["BT1-014"]);
    expect(s.state.players[0]!.security).toHaveLength(3);
    expect(s.state.players[0]!.security.every((card) => card.faceUp !== true)).toBe(true);
  });

  it("counts as an [Insectoid] Digimon for another card's trait gate", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT19-048", as: "forge" },
            { card: "BT19-046", as: "plant" },
          ],
          hand: [{ card: "BT15-094", as: "shocker" }, "BT1-012"],
          security: INERT_SECURITY,
          deck: INERT_DECK,
        },
        1: { battleArea: [{ card: "BT1-013", as: "suspendTarget" }], security: INERT_SECURITY, deck: INERT_DECK },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 5;
    await s.ready();
    expect(observe(s.engine).hasEffectiveTrait(s.perm("forge"), "Insectoid")).toBe(true);
    expect(observe(s.engine).hasEffectiveTrait(s.perm("plant"), "Insectoid")).toBe(false);

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("shocker").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.perm("forge").currentDP === 7000);

    expect(s.perm("forge").currentDP).toBe(7000);
    expect(s.perm("plant").currentDP).toBe(3000);
  });

  it("gives its evolution host inherited +1000 DP, and only its own host", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "BT19-052", as: "host", under: [{ card: "BT19-048", as: "underForge" }] },
          { card: "BT19-052", as: "peerHost", under: ["BT1-009"] },
        ],
        security: INERT_SECURITY,
        deck: INERT_DECK,
      },
      1: { security: INERT_SECURITY, deck: INERT_DECK },
    });
    await s.ready();

    expect(s.perm("host").stack.map((card) => card.instanceId)).toEqual([s.inst("underForge").instanceId]);
    expect(s.perm("host").currentDP).toBe(9000);
    expect(s.perm("peerHost").currentDP).toBe(8000);
    assertNoLoudGap(s);
  });
});

describe("BT19-048 ForgeBeemon — KB Q&A rulings", () => {
  async function allDeleteAgainstForgeAndQueen(queenPlaces: boolean): Promise<Setup> {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT19-053", as: "queen" },
            { card: "BT19-048", as: "forge" },
            { card: "BT19-045", as: "royal" },
          ],
          hand: ["BT1-012"],
          security: [{ card: "BT1-009", as: "secTop" }],
          deck: INERT_DECK,
        },
        1: {
          battleArea: [{ card: "BT1-084", as: "omnimon" }],
          hand: [{ card: "BT5-110", as: "allDelete" }, "BT1-012"],
          security: INERT_SECURITY,
          deck: INERT_DECK,
        },
      },
      {
        autoAcceptOptional: true,
        autoSelectCards: true,
        preferTriggerKeys: ["BT19-048"],
        declinePrompts: queenPlaces ? [] : [QUEEN_PLACEMENT_PROMPT],
      },
    );
    await s.ready();
    const loop = s.engine.startTurnLoop();
    await openMain(s, 0);
    closeMain(s, 0);
    await openMain(s, 1);
    s.state.memory = 10;

    expect(s.engine.applyIntent(1, { type: "playCard", instanceId: s.inst("allDelete").instanceId })).toEqual({
      ok: true,
    });
    const expectedBattleArea = queenPlaces ? 0 : 2;
    const expectedSecurity = queenPlaces ? 4 : 2;
    await settle(
      () =>
        s.state.players[1]!.battleArea.length === 0 &&
        s.state.players[0]!.battleArea.length === expectedBattleArea &&
        s.state.players[0]!.security.length === expectedSecurity,
    );
    closeMain(s, 1);
    await stopLoop(s, loop, 1);
    return s;
  }

  it("lets [QueenBeemon] still place the Digimon it saved from [All Delete] into security afterward (Q3099)", async () => {
    const s = await allDeleteAgainstForgeAndQueen(true);

    const ownPrompts = s.decisions.filter(({ seat, req }) => seat === 0 && req.kind === "optional");
    const forgePrevention = ownPrompts.findIndex(({ req }) => req.sourceInstanceId === s.inst("forge").instanceId);
    const queenPlacement = ownPrompts.findIndex(({ req }) => req.sourceInstanceId === s.inst("queen").instanceId);
    expect(forgePrevention).toBeGreaterThanOrEqual(0);
    expect(queenPlacement).toBeGreaterThan(forgePrevention);
    expect(ownPrompts[queenPlacement]!.req.promptText).toContain(QUEEN_PLACEMENT_PROMPT);

    expect(s.state.players[1]!.hand.map((card) => card.cardId)).toContain("BT1-084");
    expect(s.state.players[0]!.battleArea).toHaveLength(0);
    expect(s.state.players[0]!.trash).toHaveLength(0);
    const security = s.state.players[0]!.security;
    expect(security[0]!.instanceId).toBe(s.inst("secTop").instanceId);
    expect(security[0]!.faceUp).not.toBe(true);
    expect(security[1]!.instanceId).toBe(s.inst("forge").instanceId);
    expect(
      security
        .slice(2)
        .map((card) => card.cardId)
        .sort(),
    ).toEqual(["BT19-045", "BT19-053"]);
    expect(security.slice(1).every((card) => card.faceUp === true)).toBe(true);

    // Declining QueenBeemon shows ForgeBeemon alone already kept both Digimon out of the trash.
    const forgeOnly = await allDeleteAgainstForgeAndQueen(false);
    expect(forgeOnly.state.players[0]!.battleArea.map((permanent) => permanent.topCard?.cardId).sort()).toEqual([
      "BT19-045",
      "BT19-053",
    ]);
    expect(forgeOnly.state.players[0]!.trash).toHaveLength(0);
    expect(forgeOnly.state.players[0]!.security.map((card) => card.instanceId)).toEqual([
      forgeOnly.inst("secTop").instanceId,
      forgeOnly.inst("forge").instanceId,
    ]);
  });

  it("keeps a card placed face up by its effect revealed as an ordinary security card (Q3100)", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT19-048", as: "forge" },
            { card: "BT19-045", as: "royal" },
          ],
          security: INERT_SECURITY,
          deck: INERT_DECK,
        },
        1: { security: INERT_SECURITY, deck: INERT_DECK },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    expect(s.perm("royal").currentDP).toBe(1000);

    await advance(s.engine).verb.deletePermanent([s.perm("royal").permanentId], "byEffect");
    await settle(() => s.state.players[0]!.security.length === 4);

    const security = s.state.players[0]!.security;
    expect(security.at(-1)!.instanceId).toBe(s.inst("forge").instanceId);
    expect(security.at(-1)!.faceUp).toBe(true);
    expect(security.slice(0, -1).every((card) => card.faceUp !== true)).toBe(true);

    const view = syncPublicCounts(s.state).players[0]!;
    expect(view.securityCount).toBe(4);
    expect(view.securityView.map((card) => card.cardId)).toEqual(["", "", "", "BT19-048"]);
    expect(s.perm("royal").currentDP).toBe(2000);
  });

  it("triggers a face-up security card's [Security] effect when it is checked (Q3102)", async () => {
    const s = setupEngine({
      0: {
        security: [{ card: "BT5-110", as: "faceUpOption", faceUp: true }],
        battleArea: [{ card: "BT19-048", as: "forge" }],
        deck: INERT_DECK,
      },
      1: {
        battleArea: [{ card: "BT1-013", as: "attacker", dp: 20_000 }],
        security: INERT_SECURITY,
        deck: INERT_DECK,
      },
    });
    await s.ready();
    const loop = s.engine.startTurnLoop();
    await openMain(s, 0);
    closeMain(s, 0);
    await openMain(s, 1);

    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.security.length === 0 && !observe(s.engine).isAttacking());
    closeMain(s, 1);
    await stopLoop(s, loop, 1);

    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toContain(s.inst("faceUpOption").instanceId);
    expect(s.state.players[0]!.trash.map((card) => card.cardId)).not.toContain("BT5-110");
  });
});
