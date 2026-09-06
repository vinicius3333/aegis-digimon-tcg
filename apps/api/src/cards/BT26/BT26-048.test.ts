import { describe, expect, it } from "vitest";
import { digivolutionRequirementsFor, EffectTiming } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { compiled } from "./BT26-048.js";
import "../index.js";

describe("BT26-048 BloomLordmon", () => {
  it("encodes Alliance/Vortex, the face-down stack cost and batch trash reaction", () => {
    expect(digivolutionRequirementsFor("BT26-048")).toContainEqual({
      level: 5,
      traits: ["DM"],
      cost: 3,
      isAlternate: true,
    });
    expect(compiled.effects?.[0]?.keywords).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ keyword: "Alliance" }),
        expect.objectContaining({ keyword: "Vortex" }),
      ]),
    );
    for (const trigger of ["WhenDigivolving", "WhenAttacking"])
      expect(compiled.effects?.find((e) => e.trigger === trigger)).toMatchObject({
        actions: [
          {
            kind: "CostGatedBlock",
            cost: { kind: "trashBottomFaceDownUnderDigimon" },
            actions: [
              {
                kind: "PlayWithoutCost",
                payCost: false,
                from: ["hand"],
                target: {
                  filter: {
                    controller: "mine",
                    zone: "hand",
                    kind: ["Digimon"],
                    dp: { op: "lte", value: 6000 },
                    nameOrTrait: [{ tokens: ["Ver.4"], match: "trait" }],
                  },
                  count: 1,
                },
              },
            ],
          },
        ],
      });
    expect(compiled.effects?.[3]).toMatchObject({
      trigger: "AllTurns",
      actions: [
        {
          kind: "SubTrigger",
          event: "onDigivolutionCardsDiscardedBatch",
          requireByEffect: true,
          requireFaceDownDigivolutionCardTrashed: true,
          actions: [{ kind: "ModifyDP", amount: -6000 }],
        },
      ],
    });
  });

  it("publicly digivolves, pays the face-down cost, plays Ver.4, and applies its debuff", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            {
              card: "BT26-043",
              as: "host",
              under: [{ card: "BT1-010", as: "faceDown", faceUp: false }],
            },
          ],
          hand: [
            { card: "BT26-048", as: "bloomLordmon" },
            { card: "EX9-008", as: "ver4" },
          ],
          deck: ["BT1-001"],
        },
        1: { battleArea: [{ card: "BT1-011", as: "opponent", dp: 10000 }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 3;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("host").permanentId,
        instanceId: s.inst("bloomLordmon").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        s.state.players[0]!.battleArea.some(({ topCard }) => topCard?.cardId === "EX9-008") &&
        s.perm("opponent").currentDP === 4000,
    );

    expect(s.state.players[0]!.battleArea.map(({ topCard }) => topCard?.cardId)).toContain("EX9-008");
    expect(s.perm("host").stack.map(({ cardId }) => cardId)).not.toContain("BT1-010");
    expect(s.perm("opponent").currentDP).toBe(4000);
  });

  it("may decline the optional trash-and-play processing without changing the stack or hand", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT26-048", as: "bloomLordmon" },
            { card: "BT1-009", as: "host", under: [{ card: "BT1-010", as: "faceDown", faceUp: false }] },
          ],
          hand: [{ card: "BT26-023", as: "ver4" }],
        },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    await s.ready();

    await advance(s.engine).fire(EffectTiming.WhenDigivolving, s.perm("bloomLordmon"));

    expect(s.perm("host").stack.map((card) => card.instanceId)).toEqual([s.inst("faceDown").instanceId]);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toContain(s.inst("ver4").instanceId);
    expect(s.state.players[0]!.battleArea.map(({ topCard }) => topCard?.cardId)).not.toContain("BT26-023");
  });

  it("pays with the first face-down card above a face-up bottom (Q4785)", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT26-048", as: "bloomLordmon" },
            {
              card: "BT1-016",
              as: "host",
              under: [
                { card: "BT1-010", as: "faceUpBottom", faceUp: true },
                { card: "BT1-011", as: "faceDownUpper", faceUp: false },
              ],
            },
          ],
          hand: [{ card: "BT26-023", as: "ver4" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();

    await advance(s.engine).fire(EffectTiming.WhenDigivolving, s.perm("bloomLordmon"));

    expect(s.state.players[0]!.battleArea.map((p) => p.topCard?.instanceId)).toContain(s.inst("ver4").instanceId);
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toContain(s.inst("faceDownUpper").instanceId);
    expect(s.perm("host").stack.map((card) => card.instanceId)).toEqual([s.inst("faceUpBottom").instanceId]);
  });

  it("activates its All Turns debuff once for a simultaneous batch of multiple face-down cards (Q7050)", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT26-048", as: "bloomLordmon" },
            {
              card: "BT1-009",
              as: "host",
              under: [
                { card: "BT1-010", as: "firstFaceDown", faceUp: false },
                { card: "BT1-011", as: "secondFaceDown", faceUp: false },
              ],
            },
          ],
        },
        1: { battleArea: [{ card: "BT26-045", as: "opponent" }] },
      },
      { autoSelectCards: true },
    );
    await s.ready();

    await advance(s.engine).verb.trashDigivolutionCards(
      s.perm("host").permanentId,
      [s.inst("firstFaceDown").instanceId, s.inst("secondFaceDown").instanceId],
      0,
    );

    expect(s.perm("host").stack).toHaveLength(0);
    expect(s.perm("opponent").currentDP).toBe(5000);
  });

  it("does not react to face-up, non-effect, or opponent Digimon stack trash", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT26-048", as: "bloomLordmon" },
            { card: "BT1-009", as: "ownHost", under: [{ card: "BT1-010", as: "faceUp", faceUp: true }] },
            {
              card: "BT1-009",
              as: "ownRuleHost",
              under: [{ card: "BT1-010", as: "ownRuleFaceDown", faceUp: false }],
            },
          ],
        },
        1: {
          battleArea: [
            {
              card: "BT26-045",
              as: "opponentTarget",
              under: [{ card: "BT1-011", as: "opponentFaceDown", faceUp: false }],
            },
          ],
        },
      },
      { autoSelectCards: true },
    );
    await s.ready();
    const originalDP = s.perm("opponentTarget").currentDP;

    await advance(s.engine).verb.trashDigivolutionCards(
      s.perm("ownHost").permanentId,
      [s.inst("faceUp").instanceId],
      0,
    );
    expect(s.perm("opponentTarget").currentDP).toBe(originalDP);
    await advance(s.engine).verb.trashDigivolutionCards(s.perm("ownRuleHost").permanentId, [
      s.inst("ownRuleFaceDown").instanceId,
    ]);
    expect(s.perm("ownRuleHost").stack).toHaveLength(0);
    expect(s.perm("opponentTarget").currentDP).toBe(originalDP);
    await advance(s.engine).verb.trashDigivolutionCards(
      s.perm("opponentTarget").permanentId,
      [s.inst("opponentFaceDown").instanceId],
      0,
    );

    expect(s.perm("opponentTarget").currentDP).toBe(originalDP);
  });

  it("can use the Digimon played by its When Attacking effect for the same attack's Alliance (Q7051)", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            {
              card: "BT26-048",
              as: "bloomLordmon",
              under: [{ card: "BT1-010", as: "faceDownCost", faceUp: false }],
            },
          ],
          hand: [{ card: "BT26-023", as: "ver4" }],
        },
        1: { security: ["BT1-001"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("bloomLordmon").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.events.some((event) => event.kind === "alliancePrompt"));

    const played = s.state.players[0]!.battleArea.find(
      (permanent) => permanent.topCard?.instanceId === s.inst("ver4").instanceId,
    );
    expect(played).toBeDefined();
    const prompt = s.events.find((event) => event.kind === "alliancePrompt") as
      | { kind: "alliancePrompt"; eligibleAllyIds: string[] }
      | undefined;
    expect(prompt?.eligibleAllyIds).toContain(played!.permanentId);
    expect(s.engine.applyIntent(0, { type: "respondAlliance", allyPermanentId: played!.permanentId })).toEqual({
      ok: true,
    });
    await settle(() => played!.isSuspended && !observe(s.engine).isAttacking());

    expect(played!.isSuspended).toBe(true);
    expect(s.state.players[1]!.security).toHaveLength(0);
  });
});
