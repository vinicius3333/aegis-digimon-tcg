import { describe, expect, it } from "vitest";
import { EffectTiming } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { registeredCompiledCards } from "../../engine/effects/interpreter/compiledCards.js";
import "./EX12-059.js";

const CARD_ID = "EX12-059";

describe("EX12-059 Machinedramon ACE", () => {
  it("records every printed keyword, evolution route, and one shared once-per-turn budget", () => {
    const compiled = registeredCompiledCards.get(CARD_ID)!;
    expect(compiled.digivolutionRequirement).toEqual([
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
              target: { count: 2, from: ["hand", "trash"] },
            },
          },
        ],
      });
    }
  });

  it("de-digivolves first, then places exactly two materials and blocks opponent stack trash", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: CARD_ID, as: "source" }],
          hand: [
            { card: "EX12-055", as: "handMaterial" },
            { card: "EX12-055", as: "secondMaterial" },
          ],
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
});
