import { describe, expect, it } from "vitest";
import { compiledEffects, digivolutionRequirementsFor, EffectTiming, getCardDefinition } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { registeredCompiledCards } from "../../engine/effects/interpreter/compiledCards.js";
import { compiled } from "./EX12-059.js";

const CARD_ID = "EX12-059";

describe("EX12-059 Machinedramon ACE", () => {
  it("records every printed keyword, evolution route, and one shared once-per-turn budget", () => {
    expect(digivolutionRequirementsFor(CARD_ID)).toEqual([
      { level: 5, traits: ["Cyborg", "ME"], cost: 3, isAlternate: true },
    ]);
    expect(compiled.residual).toEqual([]);
    expect(compiled.coverage).toBe("full");
    expect(compiled.effects).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          trigger: "Counter",
          isFromHand: true,
          keywords: [{ keyword: "BlastDigivolve", raw: "＜Blast Digivolve＞" }],
        }),
        expect.objectContaining({ trigger: "Static", keywords: [{ keyword: "Reboot", raw: "＜Reboot＞" }] }),
        expect.objectContaining({
          trigger: "Static",
          keywords: [{ keyword: "Fragment", amount: 2, raw: "＜Fragment (2)＞" }],
        }),
      ]),
    );
    for (const trigger of ["OnPlay", "WhenDigivolving", "WhenAttacking"]) {
      expect(compiled.effects.find((effect) => effect.trigger === trigger)).toMatchObject({
        frequency: "OncePerTurn",
        sharedUseKey: "ir-shared-0",
        actions: [
          { kind: "DeDigivolve", amount: 3 },
          {
            kind: "StackTrashLock",
            duration: "untilOpponentTurnEnd",
            optional: true,
            cost: {
              kind: "place",
              destination: "digivolutionStack",
              position: "bottom",
              host: "self",
              target: {
                count: 2,
                from: ["hand", "trash"],
                filter: {
                  controller: "mine",
                  levelComparison: { op: "lte", value: 5 },
                  nameOrTrait: [{ tokens: ["Machine", "Cyborg", "ME"], match: "trait" }],
                },
              },
            },
          },
        ],
      });
    }
    expect(registeredCompiledCards.get(CARD_ID)).toEqual(compiled);
    expect(compiledEffects[CARD_ID]).toEqual(compiled);
  });

  it("de-digivolves first, then places exactly two materials and blocks opponent stack trash", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: CARD_ID, as: "source" }],
          hand: [{ card: "EX12-055", as: "handMaterial" }],
          trash: [{ card: "EX12-055", as: "trashMaterial" }],
        },
        1: { battleArea: [{ card: "EX12-058", as: "opponent", under: ["EX12-055", "EX12-055", "EX12-055"] }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );

    const opponentStackBefore = s.perm("opponent").stack.length;
    await advance(s.engine).fire(EffectTiming.OnPlay, s.perm("source"));
    await settle(() => s.perm("source").stack.length === 2);

    expect(s.perm("opponent").stack.length).toBeLessThan(opponentStackBefore);
    expect(s.perm("source").stack).toHaveLength(2);
    const protectedCard = s.perm("source").stack[0]!;
    await advance(s.engine).verb.trashDigivolutionCards(s.perm("source").permanentId, [protectedCard.instanceId], 1);
    expect(s.perm("source").stack).toContainEqual(protectedCard);
    await advance(s.engine).verb.trashDigivolutionCards(s.perm("source").permanentId, [protectedCard.instanceId], 0);
    expect(s.perm("source").stack).not.toContainEqual(protectedCard);
  });

  it("publicly plays for 7, resolves De-Digivolve 3, and places exactly two protected bottom sources", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [
            { card: CARD_ID, as: "source" },
            { card: "EX12-055", as: "handMaterial" },
          ],
          trash: [{ card: "EX12-054", as: "trashMaterial" }],
        },
        1: {
          battleArea: [
            {
              card: "EX12-058",
              as: "opponent",
              under: [
                { card: "EX12-055", as: "remainingSource" },
                { card: "EX12-055", as: "peeledSource1" },
                { card: "EX12-055", as: "peeledSource2" },
                { card: "EX12-055", as: "peeledSource3" },
              ],
            },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 7;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("source").instanceId })).toEqual({
      ok: true,
    });
    await settle(
      () =>
        s.state.players[0]!.battleArea.some(({ topCard }) => topCard.instanceId === s.inst("source").instanceId) &&
        s.perm("source").stack.length === 2,
    );

    expect(s.state.memory).toBe(0);
    expect(s.state.players[0]!.hand.map(({ instanceId }) => instanceId)).not.toContain(s.inst("source").instanceId);
    expect(
      s
        .perm("source")
        .stack.map(({ instanceId }) => instanceId)
        .sort(),
    ).toEqual([s.inst("handMaterial").instanceId, s.inst("trashMaterial").instanceId].sort());
    expect(s.state.players[0]!.trash.map(({ instanceId }) => instanceId)).not.toContain(
      s.inst("trashMaterial").instanceId,
    );
    expect(s.perm("opponent").stack.map(({ cardId }) => cardId)).toEqual(["EX12-055"]);
    expect(s.state.players[1]!.trash.map(({ cardId }) => cardId).sort()).toEqual(["EX12-055", "EX12-055", "EX12-058"]);
    expect(s.events).toContainEqual(
      expect.objectContaining({ kind: "effectResolved", sourceCardId: CARD_ID, timing: "OnPlay" }),
    );
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("publicly protects its new sources from an opponent's Shellmon evolution", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [
            { card: CARD_ID, as: "source" },
            { card: "EX12-055", as: "handMaterial" },
          ],
          trash: [{ card: "EX12-054", as: "trashMaterial" }],
        },
        1: {
          battleArea: [
            { card: "EX12-058", as: "deDigivolveTarget", under: ["EX12-055", "EX12-055", "EX12-055"] },
            { card: "BT1-027", as: "shellmonBase" },
          ],
          hand: [{ card: "EX12-026", as: "shellmon" }],
          deck: ["BT1-014"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    s.state.memory = 10;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("source").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.perm("source").stack.length === 2);
    const protectedIds = s.perm("source").stack.map(({ instanceId }) => instanceId);
    expect(protectedIds.sort()).toEqual([s.inst("handMaterial").instanceId, s.inst("trashMaterial").instanceId].sort());
    expect([s.state.turnSeat, s.state.memory]).toEqual([1, 3]);
    await advance(s.engine).waitForMainPhase(1);
    expect(
      s.engine.applyIntent(1, {
        type: "digivolve",
        permanentId: s.perm("shellmonBase").permanentId,
        instanceId: s.inst("shellmon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("shellmonBase").topCard.cardId === "EX12-026");
    await settle(() =>
      s.events.some(
        (event) =>
          event.kind === "effectResolved" && event.sourceCardId === "EX12-026" && event.timing === "WhenDigivolving",
      ),
    );

    expect(
      s
        .perm("source")
        .stack.map(({ instanceId }) => instanceId)
        .sort(),
    ).toEqual(protectedIds);
    expect(s.state.players[0]!.trash.map(({ instanceId }) => instanceId)).not.toContain(protectedIds[0]);
    expect(s.state.players[0]!.trash.map(({ instanceId }) => instanceId)).not.toContain(protectedIds[1]);
    expect(s.engine.applyIntent(1, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  it("accepts a level 2 [ME] Digi-Egg as one of the two placed materials", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: CARD_ID, as: "source" }],
          hand: [{ card: "EX12-055", as: "handMaterial" }],
          trash: [{ card: "EX12-003", as: "digiEggMaterial" }],
        },
        1: { battleArea: [{ card: "EX12-058", as: "opponent", under: ["EX12-055", "EX12-055", "EX12-055"] }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );

    await advance(s.engine).fire(EffectTiming.OnPlay, s.perm("source"));
    await settle(() => s.perm("source").stack.length === 2);

    expect(s.perm("source").stack.map(({ cardId }) => cardId)).toEqual(
      expect.arrayContaining(["EX12-003", "EX12-055"]),
    );
    expect(s.state.players[0]!.trash.some(({ cardId }) => cardId === "EX12-003")).toBe(false);
  });

  it("still resolves De-Digivolve when the exact two-card protection payment is unavailable", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: CARD_ID, as: "source" }] },
        1: { battleArea: [{ card: "EX12-058", as: "opponent", under: ["EX12-055", "EX12-055", "EX12-055"] }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );

    await advance(s.engine).fire(EffectTiming.OnPlay, s.perm("source"));
    await settle();

    expect(s.perm("opponent").stack.length).toBeLessThan(3);
    expect(s.perm("source").stack).toHaveLength(0);
  });

  it("Q6858 rejects a partial one-card payment and leaves that card in its original zone", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: CARD_ID, as: "source" }],
          hand: [{ card: "EX12-055", as: "onlyMaterial" }],
        },
        1: { battleArea: [{ card: "EX12-058", as: "opponent", under: ["EX12-055"] }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );

    await advance(s.engine).fire(EffectTiming.OnPlay, s.perm("source"));
    await settle();

    expect(s.perm("source").stack).toHaveLength(0);
    expect(s.state.players[0]!.hand.map(({ instanceId }) => instanceId)).toContain(s.inst("onlyMaterial").instanceId);
  });

  it("shares the De-Digivolve/protection budget across all three timings", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: CARD_ID, as: "source" }] },
        1: {
          battleArea: [
            {
              card: "EX12-058",
              as: "opponent",
              under: ["EX12-055", "EX12-055", "EX12-055", "EX12-055", "EX12-055", "EX12-055"],
            },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );

    await advance(s.engine).fire(EffectTiming.WhenDigivolving, s.perm("source"));
    expect(s.perm("opponent").stack).toHaveLength(3);
    await advance(s.engine).fire(EffectTiming.OnUseAttack, s.perm("source"));
    expect(s.perm("opponent").stack).toHaveLength(3);
  });

  it("Q6865 pays Fragment (2) from its stack and prevents its own deletion", async () => {
    const s = setupEngine(
      { 0: { battleArea: [{ card: CARD_ID, as: "source", under: ["EX12-055", "EX12-055"] }] } },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    const sourceId = s.perm("source").permanentId;

    expect(await advance(s.engine).verb.deletePermanent([sourceId], "byEffect")).toBe(0);
    expect(s.state.players[0]!.battleArea.some(({ permanentId }) => permanentId === sourceId)).toBe(true);
    expect(s.perm("source").stack).toHaveLength(0);
  });

  it("uses both normal colors and the Cyborg/ME alternate, rejects a nonmatch, and matches catalog identity", async () => {
    expect(getCardDefinition(CARD_ID)).toMatchObject({
      nameEn: "Machinedramon",
      colors: ["Black", "Purple"],
      kinds: ["Digimon"],
      playCost: 7,
      dp: 12000,
      level: 6,
      forms: ["Mega"],
      attributes: ["Virus"],
      types: ["Machine", "ME"],
      evoCosts: [
        { color: "Black", level: 5, memoryCost: 4 },
        { color: "Purple", level: 5, memoryCost: 4 },
      ],
      isAce: true,
      overflowMemory: 4,
    });
    for (const [baseCardId, useAlternateCost, expectedCost] of [
      ["BT10-064", false, 4],
      ["BT10-079", false, 4],
      ["EX12-055", true, 3],
    ] as const) {
      const s = setupEngine({
        0: { battleArea: [{ card: baseCardId, as: "base" }], hand: [{ card: CARD_ID, as: "target" }] },
      });
      s.state.memory = 4;
      expect(
        s.engine.applyIntent(0, {
          type: "digivolve",
          permanentId: s.perm("base").permanentId,
          instanceId: s.inst("target").instanceId,
          useAlternateCost,
        }),
      ).toEqual({ ok: true });
      await settle(() => s.perm("base").topCard.cardId === CARD_ID);
      expect(s.state.memory, `${baseCardId} should pay ${expectedCost}`).toBe(4 - expectedCost);
    }
    const invalid = setupEngine({
      0: { battleArea: [{ card: "BT1-075", as: "base" }], hand: [{ card: CARD_ID, as: "target" }] },
    });
    expect(
      invalid.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: invalid.perm("base").permanentId,
        instanceId: invalid.inst("target").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual(expect.objectContaining({ ok: false }));
  });
});
