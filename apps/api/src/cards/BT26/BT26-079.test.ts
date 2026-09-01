import { describe, expect, it } from "vitest";
import {
  assemblyRequirementFor,
  digivolutionRequirementsFor,
  EffectTiming,
  getCardDefinition,
  Zone,
} from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./BT26-079.js";
import "../index.js";

describe("BT26-079 compiled behavior", () => {
  it("proves evolution, Assembly, Trash Main, keywords, Decode, and the shared delete cost", () => {
    expect(getCardDefinition("BT26-079")).toMatchObject({
      nameEn: "ZombiePlutomon",
      colors: ["Purple"],
      kinds: ["Digimon"],
      level: 6,
      playCost: 12,
      dp: 12000,
      types: ["Undead", "Titan", "TS"],
    });
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
    expect(compiled.effects.find((effect) => effect.trigger === "AllTurns")?.actions[0]).toMatchObject({
      kind: "SubTrigger",
      actions: [
        { kind: "Trash", target: { untilHandSize: 4 } },
        { kind: "Trash", target: { untilHandSize: 4 }, chooser: "opponent" },
      ],
    });
    expect(compiled.digivolutionRequirement).toEqual([
      { namesExact: ["Plutomon"], cost: 1, isAlternate: true },
      { level: 5, traits: ["TS"], cost: 3, isAlternate: true },
    ]);
    expect(compiled.assemblyRequirement).toEqual([
      { reduceCost: 2, materials: [{ namesExact: ["Plutomon"], count: 1 }] },
    ]);
    expect(digivolutionRequirementsFor("BT26-079")).toEqual(compiled.digivolutionRequirement);
    expect(assemblyRequirementFor("BT26-079")).toEqual(compiled.assemblyRequirement);
    expect(compiled.keywords).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ keyword: "SecurityAttack", amount: 1 }),
        expect.objectContaining({ keyword: "Decode" }),
        expect.objectContaining({ keyword: "Retaliation" }),
      ]),
    );
    expect(compiled.effects.find((effect) => effect.trigger === "Main")).toMatchObject({
      isFromTrash: true,
      actions: [
        {
          kind: "PlayWithoutCost",
          from: ["trash"],
          reduceCostBy: 4,
          condition: { kind: "handAtMost", value: 5 },
          assembly: {
            target: {
              filter: { zone: "trash", nameOrTrait: [{ tokens: ["Plutomon"], match: "nameExact" }] },
              count: 1,
            },
            reduceCostBy: 2,
          },
        },
      ],
    });
    for (const trigger of ["OnPlay", "WhenDigivolving", "WhenAttacking"]) {
      // The printed clause carries NO [Once Per Turn] — unlike the [All Turns] hand trim below.
      expect(compiled.effects.find((effect) => effect.trigger === trigger)?.frequency).toBeUndefined();
      expect(compiled.effects.find((effect) => effect.trigger === trigger)).toMatchObject({
        sharedUseKey: "bt26-079-trash-cost-delete",
        actions: [
          {
            kind: "CostGatedBlock",
            cost: { kind: "trash" },
            optional: true,
            abortOnDecline: true,
            actions: [{ kind: "Delete", target: { filter: { levelComparison: { op: "lte", value: 6 } } } }],
          },
        ],
      });
    }
    expect(compiled.effects.find((effect) => effect.trigger === "Static")?.actions[0]).toMatchObject({
      kind: "Replacement",
      event: "wouldLeavePlay",
      mode: "instead",
      actions: [{ kind: "PlayWithoutCost", fromOwnDigivolutionStack: true, payCost: false, playedByDecode: true }],
    });
  });

  it("digivolves from Plutomon for 1 and from an off-color level-5 TS Digimon for 3", async () => {
    const fromPlutomon = setupEngine({
      0: {
        battleArea: [{ card: "BT26-059", as: "plutomon" }],
        hand: [{ card: "BT26-079", as: "zombie" }],
        deck: ["BT1-001"],
      },
    });
    fromPlutomon.state.memory = 1;
    await fromPlutomon.ready();
    expect(
      fromPlutomon.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: fromPlutomon.perm("plutomon").permanentId,
        instanceId: fromPlutomon.inst("zombie").instanceId,
        alternateRequirementIndex: 0,
      }),
    ).toEqual({ ok: true });
    await settle(() => fromPlutomon.perm("plutomon").topCard.cardId === "BT26-079");
    expect(fromPlutomon.state.memory).toBe(0);

    const fromTs = setupEngine({
      0: {
        battleArea: [{ card: "BT26-015", as: "redTs" }],
        hand: [{ card: "BT26-079", as: "zombie" }],
        deck: ["BT1-001"],
      },
    });
    fromTs.state.memory = 3;
    await fromTs.ready();
    expect(
      fromTs.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: fromTs.perm("redTs").permanentId,
        instanceId: fromTs.inst("zombie").instanceId,
        alternateRequirementIndex: 1,
      }),
    ).toEqual({ ok: true });
    await settle(() => fromTs.perm("redTs").topCard.cardId === "BT26-079");
    expect(fromTs.state.memory).toBe(0);
  });

  it("does not treat ZombiePlutomon as the exact [Plutomon] evolution base", () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT26-079", as: "nearName" }],
        hand: [{ card: "BT26-079", as: "zombie" }],
      },
    });
    s.state.memory = 1;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("nearName").permanentId,
        instanceId: s.inst("zombie").instanceId,
        alternateRequirementIndex: 0,
      }),
    ).toEqual(expect.objectContaining({ ok: false }));
  });

  it("declares Assembly during its Trash Main play and stacks the Plutomon for cost 6 (Q7110)", async () => {
    const s = setupEngine(
      {
        0: {
          trash: [
            { card: "BT26-079", as: "zombiePlutomon" },
            { card: "BT26-059", as: "plutomon" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 6;
    await s.ready();

    await advance(s.engine).fireForInstance(EffectTiming.OnDeclaration, s.inst("zombiePlutomon"));

    const played = s.state.players[0]!.battleArea.find(({ topCard }) => topCard?.cardId === "BT26-079");
    expect(played?.stack.map(({ cardId }) => cardId)).toEqual(["BT26-059"]);
    expect(s.state.memory).toBe(0);
  });

  it("rejects ZombiePlutomon as the exact [Plutomon] Assembly material", () => {
    const s = setupEngine({
      0: {
        hand: [{ card: "BT26-079", as: "zombie" }],
        trash: [{ card: "BT26-079", as: "nearName" }],
      },
    });
    s.state.memory = 10;

    expect(
      s.engine.applyIntent(0, {
        type: "playCard",
        instanceId: s.inst("zombie").instanceId,
        assembly: { materialInstanceIds: [s.inst("nearName").instanceId] },
      } as never),
    ).toEqual(expect.objectContaining({ ok: false }));
  });

  it("Q7109 keeps Trash Main unavailable outside trash and with more than 5 cards in hand", async () => {
    const onBoard = setupEngine({ 0: { battleArea: [{ card: "BT26-079", as: "zombie" }] } });
    onBoard.state.memory = 12;
    await onBoard.ready();
    await advance(onBoard.engine).fireForInstance(EffectTiming.OnDeclaration, onBoard.inst("zombie"));
    expect(onBoard.state.players[0]!.battleArea.map(({ topCard }) => topCard.cardId)).toContain("BT26-079");
    expect(onBoard.state.memory).toBe(12);

    const sixCards = setupEngine({
      0: {
        trash: [{ card: "BT26-079", as: "zombie" }],
        hand: ["BT1-001", "BT1-002", "BT1-003", "BT1-004", "BT1-005", "BT1-006"],
      },
    });
    sixCards.state.memory = 12;
    await sixCards.ready();
    await advance(sixCards.engine).fireForInstance(EffectTiming.OnDeclaration, sixCards.inst("zombie"));
    expect(sixCards.state.players[0]!.trash.map(({ cardId }) => cardId)).toContain("BT26-079");
    expect(sixCards.state.memory).toBe(12);
  });

  it("uses the supported dynamic hand-trim action", () => {
    expect(compiled.residual).toEqual([]);
    expect(compiled.effects.find((effect) => effect.trigger === "AllTurns")?.actions).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          kind: "SubTrigger",
          event: "whenPlayed",
          sourceFilter: { controller: "opponent", kind: ["Digimon"] },
        }),
        expect.objectContaining({
          kind: "SubTrigger",
          event: "whenAnyDigivolves",
          sourceFilter: { controller: "opponent", kind: ["Digimon"] },
        }),
      ]),
    );
  });

  it("publicly trashes a hand card to delete an opponent's level 6 or lower Digimon", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT26-079", as: "zombiePlutomon" }], hand: [{ card: "BT1-001", as: "cost" }] },
        1: { battleArea: [{ card: "BT26-074", as: "victim" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();

    await advance(s.engine).fire(EffectTiming.OnPlay, s.perm("zombiePlutomon"));

    expect(s.state.players[1]!.battleArea).toHaveLength(0);
    expect(s.state.players[0]!.trash.map(({ cardId }) => cardId)).toContain("BT1-001");
  });

  it("does not trash or delete when the activation cost is declined", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT26-079", as: "zombiePlutomon" }], hand: [{ card: "BT1-001" }] },
        1: { battleArea: [{ card: "BT26-074", as: "victim" }] },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    await s.ready();

    await advance(s.engine).fire(EffectTiming.OnPlay, s.perm("zombiePlutomon"));

    expect(s.state.players[0]!.hand).toHaveLength(1);
    expect(s.state.players[1]!.battleArea).toHaveLength(1);
  });

  it("repeats the hand-trash deletion at every printed timing (no [Once Per Turn])", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT26-079", as: "zombie" }],
          hand: [
            { card: "BT1-001", as: "firstCost" },
            { card: "BT1-002", as: "secondCost" },
          ],
        },
        1: {
          battleArea: [
            { card: "BT26-074", as: "firstVictim" },
            { card: "BT26-074", as: "secondVictim" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();

    await advance(s.engine).fire(EffectTiming.OnPlay, s.perm("zombie"));
    expect(s.state.players[0]!.hand).toHaveLength(1);
    expect(s.state.players[1]!.battleArea).toHaveLength(1);

    await advance(s.engine).fire(EffectTiming.WhenDigivolving, s.perm("zombie"));
    expect(s.state.players[0]!.hand).toHaveLength(0);
    expect(s.state.players[1]!.battleArea).toHaveLength(0);

    // A third timing with no hand card left cannot pay the cost, so nothing more happens.
    await advance(s.engine).fire(EffectTiming.OnUseAttack, s.perm("zombie"));
    expect(s.state.players[0]!.hand).toHaveLength(0);
    expect(s.state.players[1]!.battleArea).toHaveLength(0);
  });

  it("Q7111 lets each player choose their own cards while trimming both hands to 4", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT26-079", as: "zombie" }],
          hand: [
            { card: "BT1-001", as: "mineA" },
            { card: "BT1-002", as: "mineB" },
            "BT1-003",
            "BT1-004",
            "BT1-005",
            "BT1-006",
          ],
        },
        1: {
          battleArea: [{ card: "BT1-009", as: "opponentPlayed" }],
          hand: [
            { card: "BT1-007", as: "theirsA" },
            { card: "BT1-008", as: "theirsB" },
            "BT1-010",
            "BT1-011",
            "BT1-012",
            "BT1-013",
          ],
        },
      },
      { autoSelectCards: true, preferInstanceIds: preferred },
    );
    preferred.push(
      s.inst("mineA").instanceId,
      s.inst("mineB").instanceId,
      s.inst("theirsA").instanceId,
      s.inst("theirsB").instanceId,
    );
    await s.ready();

    await advance(s.engine).fireSubTrigger("whenPlayed", {
      subjectPermanentId: s.perm("opponentPlayed").permanentId,
    });

    expect(s.state.players[0]!.hand).toHaveLength(4);
    expect(s.state.players[1]!.hand).toHaveLength(4);
    expect(s.state.players[0]!.trash.map(({ instanceId }) => instanceId)).toEqual(
      expect.arrayContaining([s.inst("mineA").instanceId, s.inst("mineB").instanceId]),
    );
    expect(s.state.players[1]!.trash.map(({ instanceId }) => instanceId)).toEqual(
      expect.arrayContaining([s.inst("theirsA").instanceId, s.inst("theirsB").instanceId]),
    );
  });

  it("shares the hand trim once across an opponent play and digivolution", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT26-079", as: "zombie" }],
          hand: ["BT1-001", "BT1-002", "BT1-003", "BT1-004", "BT1-005"],
        },
        1: {
          battleArea: [{ card: "BT1-009", as: "opponent" }],
          hand: ["BT1-006", "BT1-007", "BT1-008", "BT1-010", "BT1-011"],
        },
      },
      { autoSelectCards: true },
    );
    await s.ready();
    await advance(s.engine).fireSubTrigger("whenPlayed", { subjectPermanentId: s.perm("opponent").permanentId });
    expect(s.state.players[0]!.hand).toHaveLength(4);
    expect(s.state.players[1]!.hand).toHaveLength(4);

    s.give(0, Zone.Hand, "BT1-012");
    s.give(1, Zone.Hand, "BT1-013");
    await advance(s.engine).fireSubTrigger("whenAnyDigivolves", {
      subjectPermanentId: s.perm("opponent").permanentId,
    });

    expect(s.state.players[0]!.hand).toHaveLength(5);
    expect(s.state.players[1]!.hand).toHaveLength(5);
  });

  it("uses Decode to play Plutomon from its stack instead of leaving by an effect", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT26-079", as: "zombie", under: [{ card: "BT26-059", as: "plutomon" }] }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();

    expect(await advance(s.engine).verb.deletePermanent([s.perm("zombie").permanentId], "byEffect")).toBe(1);
    await settle(() => s.state.players[0]!.battleArea.some(({ topCard }) => topCard.cardId === "BT26-059"));

    expect(s.state.players[0]!.battleArea.map(({ topCard }) => topCard.cardId)).toContain("BT26-059");
    expect(s.state.players[0]!.trash.map(({ cardId }) => cardId)).toContain("BT26-079");
  });

  it("may decline Decode and trash the stack normally", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT26-079", as: "zombie", under: [{ card: "BT26-059", as: "plutomon" }] }] },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    await s.ready();

    expect(await advance(s.engine).verb.deletePermanent([s.perm("zombie").permanentId], "byEffect")).toBe(1);
    expect(s.state.players[0]!.battleArea).toHaveLength(0);
    expect(s.state.players[0]!.trash.map(({ cardId }) => cardId)).toEqual(
      expect.arrayContaining(["BT26-079", "BT26-059"]),
    );
  });

  it("does not Decode a battle deletion and deletes the attacker with Retaliation", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT1-082", as: "attacker", dp: 13000 }] },
      1: {
        battleArea: [
          {
            card: "BT26-079",
            as: "zombie",
            suspended: true,
            under: [{ card: "BT26-059", as: "plutomon" }],
          },
        ],
      },
    });
    const attackerId = s.perm("attacker").permanentId;
    const zombieId = s.perm("zombie").permanentId;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: attackerId,
        target: { kind: "permanent", permanentId: zombieId },
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        !s.state.players[0]!.battleArea.some(({ permanentId }) => permanentId === attackerId) &&
        !s.state.players[1]!.battleArea.some(({ permanentId }) => permanentId === zombieId),
    );

    expect(s.state.players[1]!.battleArea.map(({ topCard }) => topCard.cardId)).not.toContain("BT26-059");
    expect(s.state.players[1]!.trash.map(({ cardId }) => cardId)).toEqual(
      expect.arrayContaining(["BT26-079", "BT26-059"]),
    );
  });

  it("performs 2 security checks with Security A. +1", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT26-079", as: "zombie" }] },
      1: { security: ["BT1-001", "BT1-002"] },
    });
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("zombie").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.security.length === 0);
    expect(s.state.players[1]!.security).toHaveLength(0);
  });
});
