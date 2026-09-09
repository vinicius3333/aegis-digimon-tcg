import { describe, expect, it } from "vitest";
import { digivolutionRequirementsFor, getCardDefinition } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./BT19-045.js";
import "../index.js";

// BT19-045 FunBeemon (Green/Black, Lv.3, Rookie/Virus, DP 1000, play 3,
// digivolve Green Lv.2 cost 1 / Black Lv.2 cost 1)
//   [Digivolve] Lv.2 w/[Royal Base] trait: Cost 0
//   [Security] [All Turns] All of your [Royal Base] trait Digimon get +1000 DP.
//   [Your Turn] When this Digimon would digivolve into a [Royal Base] trait Digimon,
//               reduce the digivolution cost by 1.
//   Inherited: [All Turns] This Digimon gets +1000 DP.
//
// Peers: BT19-048 ForgeBeemon carries the [Royal Base] trait; BT8-038 Magnamon carries
// [Royal Knight] (the near-miss trait token) and BT1-013 Muchomon carries neither.
// "[X] trait" is EXACT token equality, so neither near miss may match.

const inertSecurity = ["BT1-009", "BT1-013", "BT1-012"];
const inertDeck = ["BT1-009", "BT1-013", "BT1-012", "BT1-014"];

describe("BT19-045 FunBeemon", () => {
  it("matches the catalog printing", () => {
    expect(getCardDefinition("BT19-045")).toMatchObject({
      cardId: "BT19-045",
      nameEn: "FunBeemon",
      colors: ["Green", "Black"],
      kinds: ["Digimon"],
      level: 3,
      playCost: 3,
      dp: 1000,
      forms: ["Rookie"],
      attributes: ["Virus"],
      types: ["Insectoid", "X Antibody", "Royal Base", "LIBERATOR"],
      evoCosts: [
        { color: "Green", level: 2, memoryCost: 1 },
        { color: "Black", level: 2, memoryCost: 1 },
      ],
      inheritedEffectText: "[All Turns] This Digimon gets +1000 DP.",
    });
  });

  it("compiles the security static, the digivolve-cost replacement and the inherited buff", () => {
    expect(compiled.digivolutionRequirement).toEqual([
      { level: 2, traits: ["Royal Base"], cost: 0, isAlternate: true },
    ]);
    expect(digivolutionRequirementsFor("BT19-045")).toContainEqual({
      level: 2,
      traits: ["Royal Base"],
      cost: 0,
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
      trigger: "YourTurn",
      actions: [
        {
          kind: "Replacement",
          event: "wouldDigivolve",
          sourceFilter: { isSelfRef: true },
          into: { nameOrTrait: [{ tokens: ["Royal Base"], match: "trait" }] },
          actions: [{ kind: "Replacement", event: "wouldDigivolve", mode: "reduceCost", amount: 1 }],
        },
      ],
    });
    expect(compiled.effects?.[2]).toMatchObject({
      trigger: "AllTurns",
      isInherited: true,
      actions: [{ kind: "ModifyDP", amount: 1000, target: { filter: { isSelfRef: true }, isSelf: true } }],
    });
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
  });

  it("face up in security buffs every [Royal Base] Digimon we control and nothing else", async () => {
    const s = setupEngine({
      0: {
        security: [{ card: "BT19-045", faceUp: true }, "BT1-009", "BT1-013"],
        battleArea: [
          { card: "BT19-048", as: "royalOne" },
          { card: "BT19-052", as: "royalTwo" },
          { card: "BT8-038", as: "royalKnight" },
          { card: "BT1-013", as: "plain" },
        ],
        deck: inertDeck,
      },
      1: {
        battleArea: [{ card: "BT19-048", as: "theirRoyal" }],
        security: inertSecurity,
        deck: inertDeck,
      },
    });
    await s.ready();

    expect(s.perm("royalOne").currentDP).toBe(5000);
    expect(s.perm("royalTwo").currentDP).toBe(9000);
    // Near miss on the trait token: [Royal Knight] is not [Royal Base].
    expect(s.perm("royalKnight").currentDP).toBe(7000);
    expect(s.perm("plain").currentDP).toBe(5000);
    // "All of YOUR": the opponent's Royal Base Digimon is untouched.
    expect(s.perm("theirRoyal").currentDP).toBe(4000);
  });

  it("gives no buff while face down in security", async () => {
    const s = setupEngine({
      0: {
        security: ["BT19-045", "BT1-009"],
        battleArea: [{ card: "BT19-048", as: "royal" }],
        deck: inertDeck,
      },
      1: { security: inertSecurity, deck: inertDeck },
    });
    await s.ready();
    expect(s.perm("royal").currentDP).toBe(4000);
  });

  it("buffs only its own controller's Royal Base Digimon when the OPPONENT holds it face up", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT19-048", as: "ourRoyal" }],
        security: inertSecurity,
        deck: inertDeck,
      },
      1: {
        security: [{ card: "BT19-045", faceUp: true }, "BT1-009", "BT1-013"],
        battleArea: [{ card: "BT19-048", as: "theirRoyal" }],
        deck: inertDeck,
      },
    });
    await s.ready();
    expect(s.perm("theirRoyal").currentDP).toBe(5000);
    expect(s.perm("ourRoyal").currentDP).toBe(4000);
  });

  it("takes the free Lv.2 [Royal Base] route and charges 1 for a plain green Lv.2", async () => {
    const royal = setupEngine({
      0: {
        breeding: { card: "BT18-004", as: "puroromon" },
        hand: [{ card: "BT19-045", as: "fun" }],
        deck: inertDeck,
        security: inertSecurity,
      },
      1: { deck: inertDeck, security: inertSecurity },
    });
    royal.state.memory = 3;
    await royal.ready();
    const puroromonId = royal.inst("puroromon").instanceId;
    expect(
      royal.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: royal.perm("puroromon").permanentId,
        instanceId: royal.inst("fun").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: true });
    await settle(() => royal.perm("puroromon").topCard?.cardId === "BT19-045");
    // Cost 0, not the printed Green Lv.2 cost of 1: the memory delta is what discriminates.
    expect(royal.state.memory).toBe(3);
    expect(royal.perm("puroromon").stack.map((card) => card.instanceId)).toEqual([puroromonId]);
    expect(royal.state.players[0]!.hand.some((card) => card.cardId === "BT19-045")).toBe(false);

    const plain = setupEngine({
      0: {
        // BT1-007 Tanemon is a green Lv.2 WITHOUT the [Royal Base] trait: normal route only.
        breeding: { card: "BT1-007", as: "tanemon" },
        hand: [{ card: "BT19-045", as: "fun" }],
        deck: inertDeck,
        security: inertSecurity,
      },
      1: { deck: inertDeck, security: inertSecurity },
    });
    plain.state.memory = 3;
    await plain.ready();
    expect(
      plain.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: plain.perm("tanemon").permanentId,
        instanceId: plain.inst("fun").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: true });
    await settle(() => plain.perm("tanemon").topCard?.cardId === "BT19-045");
    // `useAlternateCost` silently falls back to the normal route when none matches.
    expect(plain.state.memory).toBe(2);
  });

  it("refuses an off-color Lv.2 source on both routes", async () => {
    const s = setupEngine({
      0: {
        breeding: { card: "BT1-005", as: "kyaromon" },
        hand: [{ card: "BT19-045", as: "fun" }],
        deck: inertDeck,
        security: inertSecurity,
      },
      1: { deck: inertDeck, security: inertSecurity },
    });
    s.state.memory = 5;
    await s.ready();
    for (const useAlternateCost of [true, false]) {
      expect(
        s.engine.applyIntent(0, {
          type: "digivolve",
          permanentId: s.perm("kyaromon").permanentId,
          instanceId: s.inst("fun").instanceId,
          useAlternateCost,
        }),
      ).not.toEqual({ ok: true });
    }
    expect(s.perm("kyaromon").topCard?.cardId).toBe("BT1-005");
    expect(s.state.players[0]!.hand.map((card) => card.cardId)).toEqual(["BT19-045"]);
    expect(s.state.memory).toBe(5);
  });

  it("reduces a battle-area [Royal Base] digivolution by 1 but not a plain one", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT19-045", as: "royalRoute" },
            { card: "BT19-045", as: "plainRoute" },
          ],
          hand: [
            { card: "BT19-048", as: "forge" },
            { card: "BT19-046", as: "chamble" },
          ],
          deck: inertDeck,
          security: inertSecurity,
        },
        1: { deck: inertDeck, security: inertSecurity },
      },
      { autoSelectCards: true, autoDeclineOptional: true },
    );
    s.state.memory = 8;
    await s.ready();

    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    s.state.memory = 8;

    // Into [Royal Base] ForgeBeemon: printed green Lv.3 cost 3, reduced to 2.
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("royalRoute").permanentId,
        instanceId: s.inst("forge").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("royalRoute").topCard?.cardId === "BT19-048");
    expect(s.state.memory).toBe(6);
    expect(s.perm("royalRoute").stack.map((card) => card.cardId)).toEqual(["BT19-045"]);

    // Into Chamblemon, which has no [Royal Base] trait: the printed cost 2 stands.
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("plainRoute").permanentId,
        instanceId: s.inst("chamble").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("plainRoute").topCard?.cardId === "BT19-046");
    await settle();
    expect(s.state.memory).toBe(4);

    expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  it("does not reduce the cost from the breeding area (Q3097)", async () => {
    const s = setupEngine(
      {
        0: {
          breeding: { card: "BT19-045", as: "fun" },
          hand: [{ card: "BT19-048", as: "forge" }],
          deck: inertDeck,
          security: inertSecurity,
        },
        1: { deck: inertDeck, security: inertSecurity },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 5;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("fun").permanentId,
        instanceId: s.inst("forge").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("fun").topCard?.cardId === "BT19-048");
    // Q3097: the [Your Turn] effect does not trigger in the breeding area — full cost 3.
    expect(s.state.memory).toBe(2);
    expect(s.perm("fun").stack.map((card) => card.cardId)).toEqual(["BT19-045"]);
  });

  it("as a digivolution card gives +1000 DP to its own host only", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "BT19-048", as: "host", under: ["BT19-045"] },
          { card: "BT19-048", as: "peerHost", under: ["BT1-068"] },
        ],
        deck: inertDeck,
        security: inertSecurity,
      },
      1: { deck: inertDeck, security: inertSecurity },
    });
    await s.ready();
    expect(s.perm("host").currentDP).toBe(5000);
    expect(s.perm("peerHost").currentDP).toBe(4000);
  });

  it("stacks the inherited buff with a face-up security copy on the same Digimon", async () => {
    const s = setupEngine({
      0: {
        security: [{ card: "BT19-045", faceUp: true }, "BT1-009", "BT1-013"],
        battleArea: [{ card: "BT19-048", as: "host", under: ["BT19-045"] }],
        deck: inertDeck,
      },
      1: { deck: inertDeck, security: inertSecurity },
    });
    await s.ready();
    expect(s.perm("host").currentDP).toBe(6000);
  });
});
