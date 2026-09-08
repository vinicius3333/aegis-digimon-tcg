import { describe, expect, it } from "vitest";
import { EffectTiming, getCardDefinition } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./EX10-011.js";
import "../index.js";

const CARD_ID = "EX10-011";

describe("EX10-011 MaloMyotismon", () => {
  it("records the exact catalog, trash-play cost, shared deletion, and deletion payoff", () => {
    expect(getCardDefinition(CARD_ID)).toMatchObject({
      colors: ["Red", "Purple", "Blue"],
      level: 6,
      playCost: 14,
      dp: 14000,
      evoCosts: [
        { color: "Red", level: 5, memoryCost: 6 },
        { color: "Purple", level: 5, memoryCost: 6 },
        { color: "Blue", level: 5, memoryCost: 6 },
      ],
    });
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
    expect(compiled.digivolutionRequirement).toEqual([{ level: 5, names: ["Myotismon"], cost: 5, isAlternate: true }]);
    expect(compiled.effects?.find((effect) => effect.trigger === "Main")).toMatchObject({
      isFromTrash: true,
      actions: [
        {
          kind: "PlayWithoutCost",
          from: ["trash"],
          payCost: true,
          reduceCostBy: 11,
          cost: {
            kind: "deleteOwn",
            target: {
              filter: {
                controller: "mine",
                kind: ["Digimon"],
                levelComparison: { op: "gte", value: 5 },
                nameOrTrait: [{ match: "text", tokens: ["Myotismon"] }],
              },
              count: 2,
            },
          },
        },
      ],
    });
    for (const trigger of ["OnPlay", "WhenDigivolving", "WhenAttacking"]) {
      expect(compiled.effects?.find((effect) => effect.trigger === trigger)).toMatchObject({
        frequency: "OncePerTurn",
        sharedUseKey: "ir-shared-0",
        actions: [
          {
            kind: "Delete",
            target: {
              filter: { controllerDefault: "any", excludeSelf: true, unsuspended: true, kind: ["Digimon"] },
              count: 2,
            },
          },
        ],
      });
    }
  });

  it("deletes exactly 2 qualifying Digimon to play itself from trash for 3 memory", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "EX10-047", as: "textMatch" },
            { card: "BT2-075", as: "nameMatch" },
          ],
          trash: [{ card: CARD_ID, as: "malomyotismon" }],
        },
        1: {
          battleArea: [
            { card: "BT1-009", as: "firstTarget" },
            { card: "BT1-010", as: "secondTarget" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferred },
    );
    preferred.push(
      s.perm("textMatch").permanentId,
      s.perm("nameMatch").permanentId,
      s.perm("firstTarget").permanentId,
      s.perm("secondTarget").permanentId,
    );
    s.state.memory = 3;
    const sourceInstanceId = s.inst("malomyotismon").instanceId;
    const turn = s.engine.runOneTurn();
    const mainPhase = (s.engine as unknown as { mainPhase: { isOpen: boolean } }).mainPhase;
    await settle(() => mainPhase.isOpen);
    await s.engine.recomputeContinuousEffects();
    const [entry] = JSON.parse(s.inst("malomyotismon").activatableEffectsJson || "[]") as Array<{
      effectKey: string;
    }>;

    expect(entry).toBeDefined();
    expect(
      s.engine.applyIntent(0, {
        type: "activateEffect",
        sourceInstanceId,
        effectKey: entry!.effectKey,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some(({ topCard }) => topCard.instanceId === sourceInstanceId));
    await settle();

    expect(s.events).toContainEqual({ kind: "memoryChanged", from: 3, to: 0, reason: "playCard" });
    expect(s.state.players[0]!.battleArea).toHaveLength(1);
    expect(s.state.players[0]!.trash.map(({ cardId }) => cardId)).toEqual(
      expect.arrayContaining(["EX10-047", "BT2-075"]),
    );
    expect(s.state.players[1]!.battleArea).toHaveLength(0);

    if (mainPhase.isOpen) s.engine.applyIntent(0, { type: "endPhase" });
    await turn;
  });

  it("Q5028 does not expose the trash Main activation with only 1 valid deletion cost", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "BT2-075", as: "onlyValid" },
          { card: "BT1-009", as: "level3Invalid" },
        ],
        trash: [{ card: CARD_ID, as: "malomyotismon" }],
      },
    });
    s.state.memory = 3;
    const turn = s.engine.runOneTurn();
    const mainPhase = (s.engine as unknown as { mainPhase: { isOpen: boolean } }).mainPhase;
    await settle(() => mainPhase.isOpen);
    await s.engine.recomputeContinuousEffects();

    expect(JSON.parse(s.inst("malomyotismon").activatableEffectsJson || "[]")).toHaveLength(0);
    expect(s.state.players[0]!.battleArea).toHaveLength(2);

    s.engine.applyIntent(0, { type: "endPhase" });
    await turn;
  });

  it("uses the cost-5 Myotismon evolution route and shares one mandatory two-delete use", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX10-048", as: "base" }],
          hand: [{ card: CARD_ID, as: "malomyotismon" }],
          deck: ["BT1-009"],
        },
        1: {
          battleArea: [
            { card: "BT1-009", as: "first" },
            { card: "BT1-010", as: "second" },
            { card: "BT1-011", as: "third" },
            { card: "BT1-012", as: "suspended", suspended: true },
          ],
        },
      },
      { autoSelectCards: true, preferInstanceIds: preferred },
    );
    preferred.push(s.perm("first").permanentId, s.perm("second").permanentId);
    const thirdId = s.perm("third").permanentId;
    const suspendedId = s.perm("suspended").permanentId;
    s.state.memory = 5;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("malomyotismon").instanceId,
        alternateRequirementIndex: 0,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard.cardId === CARD_ID);
    expect(s.state.memory).toBe(0);
    expect(s.state.players[1]!.battleArea.map(({ permanentId }) => permanentId)).toEqual(
      expect.arrayContaining([thirdId, suspendedId]),
    );

    await advance(s.engine).fire(EffectTiming.OnUseAttack, s.perm("base"));
    expect(s.state.players[1]!.battleArea.map(({ permanentId }) => permanentId)).toEqual(
      expect.arrayContaining([thirdId, suspendedId]),
    );
  });

  it("trashes security and bottom-decks exactly 1 lowest-DP Digimon once per turn", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: CARD_ID, as: "source" },
            { card: "BT1-009", as: "firstVictim" },
            { card: "BT1-010", as: "secondVictim" },
          ],
        },
        1: {
          battleArea: [
            { card: "BT1-009", as: "lowest" },
            { card: "BT5-082", as: "higher" },
          ],
          security: ["BT1-009", "BT1-010"],
        },
      },
      { autoSelectCards: true, preferInstanceIds: preferred },
    );
    preferred.push(s.perm("lowest").permanentId);
    const lowestInstanceId = s.perm("lowest").topCard.instanceId;
    const higherId = s.perm("higher").permanentId;
    await s.ready();

    await advance(s.engine).verb.deletePermanent([s.perm("firstVictim").permanentId], "byEffect");
    await settle(() => s.state.players[1]!.security.length === 1);
    expect(s.state.players[1]!.deck.at(-1)?.instanceId).toBe(lowestInstanceId);
    expect(s.state.players[1]!.battleArea.map(({ permanentId }) => permanentId)).toContain(higherId);

    await advance(s.engine).verb.deletePermanent([s.perm("secondVictim").permanentId], "byEffect");
    await settle();
    expect(s.state.players[1]!.security).toHaveLength(1);
    expect(s.state.players[1]!.battleArea.map(({ permanentId }) => permanentId)).toContain(higherId);
  });

  it("Q5027/Q5028 excludes a level 5 Digimon without [Myotismon] anywhere in its text", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "EX10-047", as: "textMatch" },
          { card: "BT1-020", as: "levelFiveNoMyotismon" },
        ],
        trash: [{ card: CARD_ID, as: "malomyotismon" }],
      },
    });
    s.state.memory = 3;
    const turn = s.engine.runOneTurn();
    const mainPhase = (s.engine as unknown as { mainPhase: { isOpen: boolean } }).mainPhase;
    await settle(() => mainPhase.isOpen);
    await s.engine.recomputeContinuousEffects();

    expect(getCardDefinition("BT1-020")?.level).toBe(5);
    expect(JSON.parse(s.inst("malomyotismon").activatableEffectsJson || "[]")).toHaveLength(0);
    expect(s.state.players[0]!.battleArea).toHaveLength(2);
    expect(s.state.players[0]!.trash.map(({ cardId }) => cardId)).toEqual([CARD_ID]);

    s.engine.applyIntent(0, { type: "endPhase" });
    await turn;
  });

  it("Q5029 deletes 2 other unsuspended Digimon on either side, mandatorily, and skips suspended ones", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "EX10-048", as: "base" },
            { card: "BT1-009", as: "ownVictim" },
          ],
          hand: [{ card: CARD_ID, as: "malomyotismon" }],
          deck: ["BT1-009"],
        },
        1: {
          battleArea: [
            { card: "BT1-010", as: "oppVictim" },
            { card: "BT1-011", as: "oppSuspended", suspended: true },
          ],
          deck: ["BT1-009"],
          security: ["BT1-009", "BT1-010"],
        },
      },
      // Declining every optional prompt proves the two-delete clause is mandatory (Q5029).
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    const ownVictimId = s.perm("ownVictim").permanentId;
    const oppVictimId = s.perm("oppVictim").permanentId;
    const oppSuspendedInstanceId = s.perm("oppSuspended").topCard.instanceId;
    s.state.memory = 5;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("malomyotismon").instanceId,
        alternateRequirementIndex: 0,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard.cardId === CARD_ID);
    await settle();

    expect(s.state.players[0]!.battleArea.map(({ permanentId }) => permanentId)).not.toContain(ownVictimId);
    expect(s.state.players[1]!.battleArea.map(({ permanentId }) => permanentId)).not.toContain(oppVictimId);
    expect(s.state.players[0]!.battleArea).toHaveLength(1);
    // Deleting your own Digimon feeds the [All Turns] clause: one security card trashed and
    // the surviving (suspended, so never a delete target) opponent Digimon bottom-decked.
    expect(s.state.players[1]!.security).toHaveLength(1);
    expect(s.state.players[1]!.battleArea).toHaveLength(0);
    expect(s.state.players[1]!.deck.at(-1)?.instanceId).toBe(oppSuspendedInstanceId);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("shares one two-delete use across When Digivolving and a real attack, and resets on the next own turn", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX10-048", as: "base" }],
          hand: [{ card: CARD_ID, as: "malomyotismon" }, "BT1-009"],
          deck: ["BT1-009", "BT1-010", "BT1-011", "BT1-012", "BT1-013"],
          security: ["BT1-009", "BT1-010"],
        },
        1: {
          battleArea: [
            { card: "BT1-009", as: "first" },
            { card: "BT1-010", as: "second" },
            { card: "BT1-011", as: "third" },
          ],
          deck: ["BT1-009", "BT1-010", "BT1-011", "BT1-012", "BT1-013"],
          security: ["BT1-009", "BT1-010", "BT1-011"],
        },
      },
      { autoDeclineOptional: true, autoSelectCards: true, preferInstanceIds: preferred },
    );
    preferred.push(s.perm("first").permanentId, s.perm("second").permanentId);
    const thirdId = s.perm("third").permanentId;
    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    s.state.memory = 5;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("malomyotismon").instanceId,
        alternateRequirementIndex: 0,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard.cardId === CARD_ID);
    await settle();
    expect(s.state.players[1]!.battleArea.map(({ permanentId }) => permanentId)).toEqual([thirdId]);

    // Same turn: the shared once-per-turn use is spent, so [When Attacking] deletes nothing.
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("base").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.security.length === 2);
    await settle();
    expect(s.state.players[1]!.battleArea.map(({ permanentId }) => permanentId)).toEqual([thirdId]);

    advance(s.engine).endMainPhaseIfOpen(0);
    await advance(s.engine).waitForMainPhase(1);
    advance(s.engine).endMainPhaseIfOpen(1);
    await advance(s.engine).waitForMainPhase(0);

    // Next own turn: the use has reset, so the same attack now deletes the last Digimon.
    expect(s.perm("base").isSuspended).toBe(false);
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("base").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.battleArea.length === 0);
    await settle();
    expect(s.state.players[1]!.battleArea).toHaveLength(0);

    expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  it("accepts a Lv.5 source whose name only contains [Myotismon] and refuses a Lv.5 without it", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "P-145", as: "substringName" },
            { card: "EX10-047", as: "noMyotismonName" },
          ],
          hand: [
            { card: CARD_ID, as: "first" },
            { card: CARD_ID, as: "second" },
          ],
          deck: ["BT1-009", "BT1-010"],
        },
        1: { deck: ["BT1-009"] },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    s.state.memory = 8;

    expect(getCardDefinition("P-145")?.nameEn).toBe("Myotismon (X Antibody)");
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("noMyotismonName").permanentId,
        instanceId: s.inst("second").instanceId,
        alternateRequirementIndex: 0,
      }),
    ).toMatchObject({ ok: false });
    expect(s.perm("noMyotismonName").topCard.cardId).toBe("EX10-047");

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("substringName").permanentId,
        instanceId: s.inst("first").instanceId,
        alternateRequirementIndex: 0,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("substringName").topCard.cardId === CARD_ID);
    await settle();

    expect(s.state.memory).toBe(3);
    expect(s.perm("substringName").stack.map(({ cardId }) => cardId)).toEqual(["P-145"]);
  });

  it("digivolves by the printed Red Lv.5 route for memory 6, keeping the source and drawing 1", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT1-020", as: "redBase" }],
          hand: [{ card: CARD_ID, as: "malomyotismon" }, "BT1-009"],
          deck: [{ card: "BT1-010", as: "bonusDraw" }, "BT1-011"],
        },
        1: {
          battleArea: [
            { card: "BT1-009", as: "first" },
            { card: "BT1-010", as: "second" },
          ],
          deck: ["BT1-011"],
        },
      },
      { autoDeclineOptional: true, autoSelectCards: true, preferInstanceIds: preferred },
    );
    preferred.push(s.perm("first").permanentId, s.perm("second").permanentId);
    const bonusDrawInstanceId = s.inst("bonusDraw").instanceId;
    s.state.memory = 6;

    expect(getCardDefinition("BT1-020")).toMatchObject({ level: 5, colors: ["Red"] });
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("redBase").permanentId,
        instanceId: s.inst("malomyotismon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("redBase").topCard.cardId === CARD_ID);
    await settle();

    // Printed Red Lv.5 cost is 6, not the alternate route's 5.
    expect(s.state.memory).toBe(0);
    expect(s.perm("redBase").stack.map(({ cardId }) => cardId)).toEqual(["BT1-020"]);
    expect(s.state.players[0]!.hand.map(({ instanceId }) => instanceId)).toContain(bonusDrawInstanceId);
    expect(s.state.players[0]!.deck.map(({ instanceId }) => instanceId)).not.toContain(bonusDrawInstanceId);
    expect(s.state.players[0]!.hand).toHaveLength(2);
    expect(s.state.players[1]!.battleArea).toHaveLength(0);
  });
});
