import { describe, it, expect } from "vitest";
import type { PlayerState } from "@aegis/shared";
// Importing the cards root barrel self-registers every compiled-IR card module so the
// engine can resolve BT20-011's OnPlay DnaDigivolve and the EX3-063 result definition.
import "../cards/index.js";
import { setupEngine, settle, assertNoLoudGap } from "./testkit/harness.js";

/**
 * Phase A3 — DNA-digivolve (Jogress) behavioral oracle for SYS-01 (advanced-mechanics).
 *
 * Drives a REAL DnaDigivolve card (BT20-011 ExVeemon) through the real GameEngine and
 * asserts the actual MERGE: two material Digimon are consumed and a single new permanent
 * whose top card is the named `into` result (EX3-063 Imperialdramon: Dragon Mode) appears.
 * "No error thrown" is not proof — this asserts the observable state transition.
 *
 * IR-faithfulness (RESEARCH Pitfall 5 / Assumption A2): BT20-011's OnPlay IR is
 *   Delete(opponent Digimon <=3000 DP) then DnaDigivolve(2 of your Digimon -> a Digimon
 *   card in hand with [Imperialdramon] in name OR the [Free] trait, payCost).
 * This matches the documented behavior oracle exactly — documented behavior CanSelectCardCondition gates the DNA
 * target on `IsDigimon && (CardTraits.Contains("Free") || ContainsCardName("Imperialdramon"))
 * && CanPlayJogress(true)` and calls DNADigivolvePermanentsIntoHandOrTrashCard(payCost:true,
 * isHand:true). The compiled `into` filter {name:"Imperialdramon" OR trait:"Free"} reproduces
 * that condition; the printed text ("into a Digimon card with [Imperialdramon] in its name or
 * the [Free] trait in the hand") confirms the named result is faithful, NOT a runtime record
 * mismodel. (The "named into" candidates BT16-091/097 were REJECTED: their documented behavior / printed text
 * say "into a Digimon card in your hand" — generic — so their named `into` is a mismodel.)
 */

describe("A3 DnaDigivolve (Jogress) — two materials merge into the named result", () => {
  it("rejects a surplus third material for a two-slot DNA recipe without consuming any cards", () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "BT1-014", as: "red" },
          { card: "BT1-051", as: "yellow" },
          { card: "BT1-009", as: "extra" },
        ],
        hand: [{ card: "BT16-012", as: "result" }],
      },
    });
    const before = s.state.players[0]!.battleArea.map((p) => p.topCard.instanceId);
    const memory = s.state.memory;
    expect(
      s.engine.applyIntent(0, {
        type: "dnaDigivolve",
        instanceId: s.inst("result").instanceId,
        materialPermanentIds: ["red", "yellow", "extra"].map((alias) => s.perm(alias).permanentId),
      }),
    ).toEqual({ ok: false, reason: "invalid-evolution" });
    expect(s.state.players[0]!.battleArea.map((p) => p.topCard.instanceId)).toEqual(before);
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("result").instanceId)).toBe(true);
    expect(s.state.memory).toBe(memory);
  });

  it.each([false, true])(
    "preserves source groups in printed DNA order regardless of input reversal %s",
    async (reverse) => {
      const s = setupEngine(
        {
          0: {
            battleArea: [
              { card: "BT1-014", as: "red", under: [{ card: "BT1-009", as: "redSource" }] },
              { card: "BT1-051", as: "yellow", under: [{ card: "BT1-045", as: "yellowSource" }] },
            ],
            hand: [{ card: "BT16-012", as: "result" }],
          },
        },
        { autoAcceptOptional: true, autoSelectCards: true },
      );
      const ids = [s.perm("red").permanentId, s.perm("yellow").permanentId];
      const expected = ["yellowSource", "yellow", "redSource", "red"].map((alias) => s.inst(alias).instanceId);
      expect(
        s.engine.applyIntent(0, {
          type: "dnaDigivolve",
          instanceId: s.inst("result").instanceId,
          materialPermanentIds: reverse ? ids.reverse() : ids,
        }),
      ).toEqual({ ok: true });
      await settle(() => s.state.players[0]!.battleArea.some((p) => p.topCard.cardId === "BT16-012"));
      expect(s.state.players[0]!.battleArea[0]!.stack.map((card) => card.instanceId)).toEqual(expected);
      assertNoLoudGap(s);
    },
  );

  it("BT20-011 [On Play] DNA-digivolves 2 of your Digimon into EX3-063 (Imperialdramon)", async () => {
    // Two material Digimon on my battle area, laid BEFORE BT20-011 is played so they are the
    // first two `mine Digimon` candidates the material pick sees. A DNA digivolve is legal only
    // against a matching printed DNA requirement, so the pair is chosen to satisfy the result's
    // recipe: EX3-063 prints [DNA Digivolve] Purple Lv.5 + Red Lv.5 for cost 0.
    //
    // The DNA result in hand: Imperialdramon: Dragon Mode — carries BOTH [Imperialdramon] in
    // its name AND the [Free] trait, so it satisfies BT20-011's `into` filter either way.
    // BT20-011 ExVeemon itself is the OnPlay source, cost 4 to play.
    // Both hand cards are laid face-down, matching how a card sits in hand pre-reveal.
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT10-081", dp: 8000, as: "materialA", linked: [{ card: "BT24-036", as: "materialLink" }] },
            { card: "BT1-021", dp: 8000, as: "materialB" },
          ],
          hand: [
            { card: "EX3-063", faceUp: false, as: "result" },
            { card: "BT20-011", faceUp: false, as: "source" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 8; // play (4) + DNA digivolve (0)
    const p0 = s.state.players[0] as PlayerState;
    const materialAId = s.perm("materialA").permanentId;
    const materialATopId = s.perm("materialA").topCard?.instanceId;
    const materialLinkId = s.inst("materialLink").instanceId;
    const materialBId = s.perm("materialB").permanentId;
    const materialBTopId = s.perm("materialB").topCard?.instanceId;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("source").instanceId })).toEqual({
      ok: true,
    });

    // The merge produces a single new permanent whose top card is the named result.
    await settle(() => p0.battleArea.some((p) => p.topCard?.cardId === "EX3-063"));

    const merged = p0.battleArea.find((p) => p.topCard?.cardId === "EX3-063");
    expect(merged, "the named DNA result EX3-063 must be on my battle area").toBeDefined();

    // Both material permanents are consumed by the merge (their ids are gone).
    expect(p0.battleArea.some((p) => p.permanentId === materialAId)).toBe(false);
    expect(p0.battleArea.some((p) => p.permanentId === materialBId)).toBe(false);

    // The materials' top-card instances are no longer the top of any battle-area permanent —
    // they were pulled off the field and stacked under the merged result.
    const topInstanceIds = p0.battleArea.map((p) => p.topCard?.instanceId);
    expect(topInstanceIds).not.toContain(materialATopId);
    expect(topInstanceIds).not.toContain(materialBTopId);

    // Both materials' top cards are now carried under the merged permanent (the DNA stack).
    const stackInstanceIds = merged!.stack.map((c) => c.instanceId);
    expect(stackInstanceIds).toHaveLength(2);
    // EX3-063 prints Purple + Red: the Purple material belongs nearest the top.
    expect(stackInstanceIds).toEqual([materialBTopId, materialATopId]);
    expect(p0.trash.map((card) => card.instanceId)).toContain(materialLinkId);

    assertNoLoudGap(s);
  });
});
