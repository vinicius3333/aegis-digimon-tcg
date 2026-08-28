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
          deck: ["BT1-001"],
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
          security: ["BT1-001", "BT1-002"],
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
});
