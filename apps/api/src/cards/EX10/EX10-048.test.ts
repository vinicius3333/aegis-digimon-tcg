import { getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { compiled } from "./EX10-048.js";
import "../index.js";

const CARD_ID = "EX10-048";

/**
 * EX10-048 Myotismon (Purple, Lv.5 Ultimate, [Undead]).
 *
 * "When this card would be played, by deleting 1 of your Digimon with [Myotismon] in its
 * text, reduce the play cost by 4.
 *  [On Play] [On Deletion] Until your opponent's turn ends, 1 of your purple Digimon gains
 *  ＜Blocker＞ and ＜Retaliation＞"
 * Inherited: "[On Deletion] You may play 1 purple Tamer card from your trash suspended
 * without paying the cost."
 *
 * Fixtures:
 * - EX1-056 DemiDevimon: purple Lv.3, carries "[Myotismon]" in its EFFECT text but not in
 *   its name — the Q5130 discriminator for "in its text".
 * - BT2-067 DemiDevimon: purple Lv.3 with no text at all — an inert buff target.
 * - BT1-009 Monodramon / BT1-013 Muchomon: inert RED Digimon — colour negatives / walls.
 * - BT3-096 Mimi Tachikawa: purple Tamer whose own trigger needs an Option card, so it
 *   stays quiet after being played. BT1-085 Tai Kamiya is the red-Tamer negative.
 */
describe("EX10-048 Myotismon", () => {
  it("records the exact catalog", () => {
    expect(getCardDefinition(CARD_ID)).toMatchObject({
      nameEn: "Myotismon",
      colors: ["Purple"],
      kinds: ["Digimon"],
      level: 5,
      playCost: 7,
      dp: 7000,
      evoCosts: [{ color: "Purple", level: 4, memoryCost: 3 }],
      forms: ["Ultimate"],
      attributes: ["Virus"],
      types: ["Undead"],
      inheritedEffectText:
        "[On Deletion] You may play 1 purple Tamer card from your trash suspended without paying the cost.",
    });
    // CATALOG DISCREPANCY: the printed text carries a NON-BREAKING SPACE (U+00A0) after
    // "[Myotismon]" where the official list has a plain space. Compared on normalized
    // whitespace so the clause itself is still asserted exactly.
    expect(getCardDefinition(CARD_ID)!.effectText!.replace(/\u00a0/gu, " ")).toBe(
      "When this card would be played, by deleting 1 of your Digimon with [Myotismon] in its text, reduce the play cost by 4.\n[On Play] [On Deletion] Until your opponent's turn ends, 1 of your purple Digimon gains ＜Blocker＞ and ＜Retaliation＞",
    );
    expect(getCardDefinition(CARD_ID)!.securityEffectText ?? "").toBe("");
  });

  it("compiles the printed clauses with no residual", () => {
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
    expect(compiled.effects?.find((effect) => effect.trigger === "Static")).toMatchObject({
      actions: [
        {
          kind: "Replacement",
          event: "wouldBePlayed",
          sourceFilter: { isSelfRef: true },
          mode: "reduceCost",
          amount: 4,
          cost: {
            kind: "deleteOwn",
            target: {
              count: 1,
              filter: {
                controller: "mine",
                kind: ["Digimon"],
                // Q5130: "in its text" is the whole-card union (name, traits, every text
                // field), which the interpreter models as match "text".
                nameOrTrait: [{ tokens: ["Myotismon"], match: "text" }],
              },
            },
          },
          optional: true,
        },
      ],
    });
    for (const trigger of ["OnPlay", "OnDeletion"]) {
      expect(
        compiled.effects?.find((effect) => effect.trigger === trigger && effect.isInherited !== true),
      ).toMatchObject({
        actions: [
          {
            kind: "GainKeyword",
            keyword: { keyword: "Blocker" },
            duration: "untilOpponentTurnEnd",
            target: { filter: { controller: "mine", kind: ["Digimon"], colors: ["Purple"] }, count: 1 },
          },
          {
            kind: "GainKeyword",
            keyword: { keyword: "Retaliation" },
            duration: "untilOpponentTurnEnd",
            // "1 of your purple Digimon gains X and Y" is one Digimon, not two.
            target: { sameTarget: true },
          },
        ],
      });
    }
    expect(
      compiled.effects?.find((effect) => effect.trigger === "OnDeletion" && effect.isInherited === true),
    ).toMatchObject({
      actions: [
        {
          kind: "PlayWithoutCost",
          from: ["trash"],
          payCost: false,
          suspended: true,
          optional: true,
          target: { filter: { controller: "mine", kind: ["Tamer"], colors: ["Purple"] }, count: 1 },
        },
      ],
    });
  });

  it("Q5130: deletes a Digimon holding [Myotismon] only in its EFFECT text and pays 3 instead of 7", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          hand: [{ card: CARD_ID, as: "myotismon" }, "BT1-009"],
          battleArea: [
            { card: "EX1-056", as: "sacrifice" },
            { card: "BT2-067", as: "ally" },
            { card: "BT1-009", as: "red" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferred },
    );
    preferred.push(s.perm("sacrifice").permanentId, s.perm("ally").permanentId);
    s.state.memory = 7;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("myotismon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.battleArea.some(({ topCard }) => topCard?.cardId === CARD_ID));
    await settle(() => false, 30);

    // 7 - 4 = 3 memory paid, and the named cost card is in the trash.
    expect(s.state.memory).toBe(4);
    expect(s.state.players[0]!.trash.map(({ instanceId }) => instanceId)).toEqual([s.inst("sacrifice").instanceId]);
    expect(s.state.players[0]!.battleArea).toHaveLength(3);

    // [On Play]: exactly one purple Digimon gains BOTH keywords; the red one gains neither,
    // and Myotismon itself was not the chosen target.
    const seen = observe(s.engine);
    expect(seen.hasKeyword(s.perm("ally"), "Blocker")).toBe(true);
    expect(seen.hasKeyword(s.perm("ally"), "Retaliation")).toBe(true);
    expect(seen.hasKeyword(s.perm("red"), "Blocker")).toBe(false);
    expect(seen.hasKeyword(s.perm("red"), "Retaliation")).toBe(false);
    const myotismon = s.state.players[0]!.battleArea.find(({ topCard }) => topCard?.cardId === CARD_ID)!;
    expect(seen.hasKeyword(myotismon, "Blocker")).toBe(false);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("without a [Myotismon]-text Digimon the reduction is unavailable: the full cost 7 is paid", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          hand: [{ card: CARD_ID, as: "myotismon" }, "BT1-009"],
          battleArea: [
            { card: "BT2-067", as: "ally" },
            { card: "BT1-009", as: "red" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferred },
    );
    preferred.push(s.perm("ally").permanentId);
    s.state.memory = 7;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("myotismon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.battleArea.some(({ topCard }) => topCard?.cardId === CARD_ID));
    await settle(() => false, 30);

    // A purple Digimon is on the board, but none of them has [Myotismon] in its text, so the
    // cost could not be paid: full price, nothing deleted.
    expect(s.state.memory).toBe(0);
    expect(s.state.players[0]!.trash).toHaveLength(0);
    expect(s.state.players[0]!.battleArea).toHaveLength(3);
    expect(observe(s.engine).hasKeyword(s.perm("ally"), "Blocker")).toBe(true);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("the grant lasts through the opponent's turn and expires at its end", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          hand: [{ card: CARD_ID, as: "myotismon" }, "BT1-009"],
          battleArea: [
            { card: "EX1-056", as: "sacrifice" },
            { card: "BT2-067", as: "ally" },
          ],
          deck: ["BT1-013", "BT1-014", "BT1-009"],
          security: ["BT1-013", "BT1-014"],
        },
        1: {
          hand: ["BT1-009"],
          deck: ["BT1-013", "BT1-014", "BT1-009"],
          security: ["BT1-013", "BT1-014"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferred },
    );
    preferred.push(s.perm("sacrifice").permanentId, s.perm("ally").permanentId);
    void s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    s.state.memory = 7;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("myotismon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => observe(s.engine).hasKeyword(s.perm("ally"), "Blocker"));
    expect(observe(s.engine).hasKeyword(s.perm("ally"), "Retaliation")).toBe(true);

    advance(s.engine).endMainPhaseIfOpen(0);
    await advance(s.engine).waitForMainPhase(1);
    // Still granted on the opponent's turn: the duration runs UNTIL that turn ends.
    expect(observe(s.engine).hasKeyword(s.perm("ally"), "Blocker")).toBe(true);
    expect(observe(s.engine).hasKeyword(s.perm("ally"), "Retaliation")).toBe(true);

    advance(s.engine).endMainPhaseIfOpen(1);
    await advance(s.engine).waitForMainPhase(0);
    expect(observe(s.engine).hasKeyword(s.perm("ally"), "Blocker")).toBe(false);
    expect(observe(s.engine).hasKeyword(s.perm("ally"), "Retaliation")).toBe(false);

    advance(s.engine).endMainPhaseIfOpen(0);
  });

  it("[On Deletion] on the card itself: losing a battle grants the pair to a purple Digimon", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: CARD_ID, as: "myotismon" },
            { card: "BT2-067", as: "ally" },
          ],
        },
        1: { battleArea: [{ card: "BT1-013", as: "wall", dp: 20_000, suspended: true }], security: ["BT1-013"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferred },
    );
    preferred.push(s.perm("ally").permanentId);
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("myotismon").permanentId,
        target: { kind: "permanent", permanentId: s.perm("wall").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.trash.some(({ cardId }) => cardId === CARD_ID));
    await settle(() => false, 30);

    expect(s.state.players[0]!.battleArea).toHaveLength(1);
    expect(observe(s.engine).hasKeyword(s.perm("ally"), "Blocker")).toBe(true);
    expect(observe(s.engine).hasKeyword(s.perm("ally"), "Retaliation")).toBe(true);
    expect(s.state.players[1]!.battleArea).toHaveLength(1);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("the inherited [On Deletion] plays a purple Tamer from trash suspended and for free", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT2-067", as: "host", under: [{ card: CARD_ID, as: "myotismon" }] }],
          trash: [{ card: "BT3-096", as: "tamer" }],
        },
        1: { battleArea: [{ card: "BT1-013", as: "wall", dp: 20_000, suspended: true }], security: ["BT1-013"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    s.state.memory = 0;

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "permanent", permanentId: s.perm("wall").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() =>
      s.state.players[0]!.battleArea.some(({ topCard }) => topCard?.instanceId === s.inst("tamer").instanceId),
    );
    await settle(() => false, 30);

    const tamer = s.state.players[0]!.battleArea.find(
      ({ topCard }) => topCard?.instanceId === s.inst("tamer").instanceId,
    )!;
    expect(tamer.isSuspended).toBe(true);
    // Free: the Tamer's printed cost of 2 was never charged.
    expect(s.state.memory).toBe(0);
    expect(s.state.players[0]!.trash.map(({ cardId }) => cardId).sort()).toEqual(["BT2-067", CARD_ID]);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("the inherited [On Deletion] refuses a non-purple Tamer in the trash", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT2-067", as: "host", under: [CARD_ID] }],
          trash: [{ card: "BT1-085", as: "redTamer" }],
        },
        1: { battleArea: [{ card: "BT1-013", as: "wall", dp: 20_000, suspended: true }], security: ["BT1-013"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    s.state.memory = 0;

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "permanent", permanentId: s.perm("wall").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.trash.some(({ cardId }) => cardId === CARD_ID));
    await settle(() => false, 30);

    expect(s.state.players[0]!.battleArea).toHaveLength(0);
    expect(s.state.players[0]!.trash.map(({ instanceId }) => instanceId)).toContain(s.inst("redTamer").instanceId);
    expect(s.state.memory).toBe(0);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  /**
   * Q5131 regression: deleting a Digimon with an [On Deletion] effect to pay this card's
   * play-cost reduction makes that [On Deletion] and this card's [On Play] trigger
   * SIMULTANEOUSLY, so the turn player picks the resolve order. The current engine parks the
   * cost deletion in the play's trigger batch and exposes both effects through `orderTriggers`.
   */
  it("Q5131: the cost deletion's [On Deletion] and this card's [On Play] share the turn player's ordering window", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          hand: [{ card: CARD_ID, as: "myotismon" }, "BT1-009"],
          battleArea: [
            { card: "EX10-047", as: "sacrifice" },
            { card: "BT2-067", as: "ally" },
          ],
        },
      },
      {
        autoAcceptOptional: true,
        autoSelectCards: true,
        autoOrderTriggers: false,
        preferInstanceIds: preferred,
      },
    );
    preferred.push(s.perm("sacrifice").permanentId, s.perm("ally").permanentId);
    s.state.memory = 7;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("myotismon").instanceId })).toEqual({
      ok: true,
    });
    // EX10-047 Arukenimon carries its own [On Deletion]; deleting it as this card's play cost
    // makes both effects trigger together, so the turn player must choose the order.
    await settle(() => s.state.pendingDecision?.kind === "orderTriggers");
    const decision = s.state.pendingDecision;
    expect(decision?.kind).toBe("orderTriggers");
    const triggerKeys = (JSON.parse(decision!.payloadJson) as { triggerKeys: string[] }).triggerKeys;
    // One key per source: this card's [On Play] and the cost-deleted Arukenimon's [On Deletion].
    expect(triggerKeys).toHaveLength(2);
    expect(triggerKeys.filter((key) => key.includes(CARD_ID))).toHaveLength(1);
    expect(triggerKeys.filter((key) => key.includes("EX10-047"))).toHaveLength(1);
    expect(decision!.seat).toBe(0);
  });

  it("the cost deletion resolves and the play completes with the default trigger order", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          hand: [{ card: CARD_ID, as: "myotismon" }, "BT1-009"],
          battleArea: [
            { card: "EX10-047", as: "sacrifice" },
            { card: "BT2-067", as: "ally" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferred },
    );
    preferred.push(s.perm("sacrifice").permanentId, s.perm("ally").permanentId);
    s.state.memory = 7;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("myotismon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.battleArea.some(({ topCard }) => topCard?.cardId === CARD_ID));
    await settle(() => false, 30);

    // With the default harness ordering, the cost card is deleted, the reduced cost is charged,
    // and this card's own [On Play] resolves.
    expect(s.state.memory).toBe(4);
    expect(s.state.players[0]!.trash.map(({ cardId }) => cardId)).toEqual(["EX10-047"]);
    expect(observe(s.engine).hasKeyword(s.perm("ally"), "Blocker")).toBe(true);
    expect(observe(s.engine).hasKeyword(s.perm("ally"), "Retaliation")).toBe(true);
    expect(s.state.pendingDecision).toBeUndefined();
  });
});
