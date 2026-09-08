import { getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./EX10-055.js";
import "../index.js";

const CARD_ID = "EX10-055";

/**
 * EX10-055 Tactimon (Lv.6 Purple/Black, [Wizard]/[Bagra Army], play cost 12).
 *
 * "[On Play] [When Digivolving] You may choose 1 of your Digimon. Delete the chosen Digimon
 *  and 1 of your opponent's Digimon with as high or lower a level as it.
 *  [All Turns] [Once Per Turn] When any of your [Bagra Army] trait Digimon would leave the
 *  battle area by effects, by trashing any 2 of this Digimon's digivolution cards, they don't leave.
 *  [DigiXros -2] 2 Digimon cards w/[Bagra Army] trait"
 *
 * Fixture notes: EX10-026 SkullKnightmon and EX10-027 DeadlyAxemon are Black/Purple
 * [Bagra Army] Lv.4s used only as DigiXros material (placed under, never played, so their
 * [On Play] never fires); their inherited text is ＜Blocker＞ / ＜Retaliation＞, which opens no
 * decision here. EX10-045 Tuwarmon is a third genuine [Bagra Army] material, used to prove
 * the 2-material cap rather than a trait mismatch. BT10-064 Gogmamon is an inert Black Lv.5
 * (no main and no inherited text) used as the digivolution source. BT1-009 Monodramon is the
 * inert non-[Bagra Army] card.
 */
describe("EX10-055 Tactimon", () => {
  it("records the exact catalog", () => {
    expect(getCardDefinition(CARD_ID)).toMatchObject({
      colors: ["Purple", "Black"],
      level: 6,
      playCost: 12,
      dp: 12000,
      evoCosts: [
        { color: "Purple", level: 5, memoryCost: 4 },
        { color: "Black", level: 5, memoryCost: 4 },
      ],
      forms: ["Mega"],
      attributes: ["Data"],
      types: ["Wizard", "Bagra Army"],
    });
  });

  it("compiles the level-relative sacrifice/delete, the all-target replacement and the DigiXros recipe", () => {
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
    expect(compiled.digiXrosRequirement).toEqual([
      { materials: [{ traits: ["Bagra Army"] }], count: 2, costReduction: 2, maxMaterials: 2 },
    ]);
    for (const trigger of ["OnPlay", "WhenDigivolving"]) {
      expect(compiled.effects?.find((effect) => effect.trigger === trigger)).toMatchObject({
        optional: true,
        actions: [
          { kind: "SelectBind", target: { filter: { controller: "mine", kind: ["Digimon"] }, count: 1, bindAs: "A" } },
          { kind: "Delete", target: { fromSelectionRef: "A" } },
          {
            kind: "Delete",
            target: {
              filter: {
                controller: "opponent",
                kind: ["Digimon"],
                relativeTo: { attr: "level", op: "lte", selectionRef: "A" },
              },
              count: 1,
            },
          },
        ],
      });
    }
    expect(compiled.effects?.find((effect) => effect.trigger === "AllTurns")).toMatchObject({
      frequency: "OncePerTurn",
      actions: [
        {
          kind: "Replacement",
          event: "wouldLeavePlay",
          mode: "prevent",
          affectsAll: true,
          leaveCause: "byEffect",
          target: {
            filter: {
              controller: "mine",
              kind: ["Digimon"],
              nameOrTrait: [{ tokens: ["Bagra Army"], match: "trait" }],
            },
            count: "all",
          },
          cost: { kind: "trash", target: { filter: { isSelfRef: true, zone: "digivolutionCards" }, count: 2 } },
        },
      ],
    });
  });

  // --- DigiXros: sources, per-material reduction, cap, refusal (all through playCard) ---

  it("DigiXroses from hand: 2 [Bagra Army] materials reduce the cost by 2 each and land in the stack", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [
            { card: CARD_ID, as: "tactimon" },
            { card: "EX10-026", as: "first" },
            { card: "EX10-027", as: "second" },
          ],
        },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    s.state.memory = 12;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "playCard",
        instanceId: s.inst("tactimon").instanceId,
        digiXros: { materialInstanceIds: [s.inst("first").instanceId, s.inst("second").instanceId] },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision === undefined);

    // 12 printed - 2 per material x 2 materials = 8 paid.
    expect(s.state.memory).toBe(4);
    const played = s.state.players[0]!.battleArea;
    expect(played).toHaveLength(1);
    expect(played[0]!.topCard!.cardId).toBe(CARD_ID);
    // `stack` is bottom-first and each loose material is placed at the bottom, so the
    // second material ends up beneath the first.
    expect(played[0]!.stack.map(({ cardId }) => cardId)).toEqual(["EX10-027", "EX10-026"]);
    expect(s.state.players[0]!.hand).toHaveLength(0);
    expect(s.state.players[0]!.trash).toHaveLength(0);
  });

  it("DigiXroses with a single material for exactly 2 less, proving the reduction is per material", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [
            { card: CARD_ID, as: "tactimon" },
            { card: "EX10-026", as: "only" },
          ],
        },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    s.state.memory = 12;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "playCard",
        instanceId: s.inst("tactimon").instanceId,
        digiXros: { materialInstanceIds: [s.inst("only").instanceId] },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision === undefined);

    // 12 printed - 2 for the one material = 10 paid; a flat -2 total would leave memory at 4.
    expect(s.state.memory).toBe(2);
    expect(s.state.players[0]!.battleArea[0]!.stack.map(({ cardId }) => cardId)).toEqual(["EX10-026"]);
  });

  it("takes a [Bagra Army] material from the battle area, removing that permanent whole", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [
            { card: CARD_ID, as: "tactimon" },
            { card: "EX10-026", as: "fromHand" },
          ],
          battleArea: [{ card: "EX10-027", as: "onField", under: [{ card: "BT1-009", as: "shed" }] }],
        },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    s.state.memory = 12;
    await s.ready();
    const fieldPermanentId = s.perm("onField").permanentId;
    expect(
      s.engine.applyIntent(0, {
        type: "playCard",
        instanceId: s.inst("tactimon").instanceId,
        digiXros: {
          materialInstanceIds: [s.inst("fromHand").instanceId, s.perm("onField").topCard!.instanceId],
        },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision === undefined);

    expect(s.state.memory).toBe(4);
    const board = s.state.players[0]!.battleArea;
    expect(board).toHaveLength(1);
    expect(board[0]!.permanentId).not.toBe(fieldPermanentId);
    expect(board[0]!.topCard!.cardId).toBe(CARD_ID);
    expect(board[0]!.stack.map(({ cardId }) => cardId)).toEqual(expect.arrayContaining(["EX10-026", "EX10-027"]));
    // Only the top card of a battle-area material joins the stack (§7-2-2-7); what was under it is trashed.
    expect(s.state.players[0]!.trash.map(({ instanceId }) => instanceId)).toEqual([s.inst("shed").instanceId]);
  });

  it("refuses a non-[Bagra Army] material without spending memory or moving cards", async () => {
    const s = setupEngine({
      0: {
        hand: [
          { card: CARD_ID, as: "tactimon" },
          { card: "EX10-026", as: "bagra" },
          { card: "BT1-009", as: "outsider" },
        ],
      },
    });
    s.state.memory = 12;
    await s.ready();
    const handBefore = s.state.players[0]!.hand.map(({ instanceId }) => instanceId);
    expect(
      s.engine.applyIntent(0, {
        type: "playCard",
        instanceId: s.inst("tactimon").instanceId,
        digiXros: { materialInstanceIds: [s.inst("bagra").instanceId, s.inst("outsider").instanceId] },
      }).ok,
    ).toBe(false);
    expect(s.state.memory).toBe(12);
    expect(s.state.players[0]!.hand.map(({ instanceId }) => instanceId)).toEqual(handBefore);
    expect(s.state.players[0]!.battleArea).toHaveLength(0);
  });

  it("refuses a third material even when it matches the trait, capping the recipe at 2", async () => {
    const s = setupEngine({
      0: {
        hand: [
          { card: CARD_ID, as: "played" },
          { card: "EX10-026", as: "firstMaterial" },
          { card: "EX10-027", as: "secondMaterial" },
          { card: "EX10-045", as: "thirdMaterial" },
        ],
      },
    });
    s.state.memory = 12;
    await s.ready();
    const originalHand = s.state.players[0]!.hand.map(({ instanceId }) => instanceId);
    expect(
      s.engine.applyIntent(0, {
        type: "playCard",
        instanceId: s.inst("played").instanceId,
        digiXros: {
          materialInstanceIds: ["firstMaterial", "secondMaterial", "thirdMaterial"].map(
            (alias) => s.inst(alias).instanceId,
          ),
        },
      }).ok,
    ).toBe(false);
    expect(s.state.memory).toBe(12);
    expect(s.state.players[0]!.hand.map(({ instanceId }) => instanceId)).toEqual(originalHand);
    expect(s.state.players[0]!.battleArea).toHaveLength(0);
  });

  // --- [On Play] / [When Digivolving] and the [All Turns] replacement, through public intents ---

  it("[On Play] via DigiXros: Q5141 keeps the self-chosen Tactimon by trashing its 2 materials", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          hand: [
            { card: CARD_ID, as: "tactimon" },
            { card: "EX10-026", as: "first" },
            { card: "EX10-027", as: "second" },
          ],
        },
        1: { battleArea: [{ card: "BT1-009", as: "victim" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferred },
    );
    s.state.memory = 12;
    await s.ready();
    // The played card keeps its hand instance id once it reaches the battle area, so binding
    // "A" to Tactimon itself is expressible before the play.
    preferred.push(s.inst("tactimon").instanceId);
    const victimId = s.perm("victim").permanentId;

    expect(
      s.engine.applyIntent(0, {
        type: "playCard",
        instanceId: s.inst("tactimon").instanceId,
        digiXros: { materialInstanceIds: [s.inst("first").instanceId, s.inst("second").instanceId] },
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        s.state.pendingDecision === undefined &&
        !s.state.players[1]!.battleArea.some((p) => p.permanentId === victimId),
    );

    // Tactimon chose itself, so it "would leave by effects"; the [All Turns] replacement paid
    // its 2 digivolution cards and it stayed. The opponent's Lv.3 was still deleted.
    const board = s.state.players[0]!.battleArea;
    expect(board).toHaveLength(1);
    expect(board[0]!.topCard!.cardId).toBe(CARD_ID);
    expect(board[0]!.stack).toHaveLength(0);
    expect(s.state.players[0]!.trash.map(({ cardId }) => cardId)).toEqual(
      expect.arrayContaining(["EX10-026", "EX10-027"]),
    );
    expect(s.state.players[1]!.battleArea).toHaveLength(0);
    expect(s.state.players[1]!.trash.map(({ cardId }) => cardId)).toEqual(["BT1-009"]);
    expect(s.state.memory).toBe(4);
  });

  it("[When Digivolving] deletes the chosen own Digimon and only an opponent Digimon at or below its level", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          hand: [{ card: CARD_ID, as: "tactimon" }],
          battleArea: [
            { card: "BT10-064", as: "source", under: [{ card: "BT1-009", as: "beneath" }] },
            // A non-[Bagra Army] sacrifice: SkullKnightmon here would be saved by Tactimon's
            // own [All Turns] replacement, which is proved separately.
            { card: "BT1-014", as: "sacrifice" },
          ],
        },
        1: {
          battleArea: [
            { card: "BT1-009", as: "low" },
            { card: "EX10-031", as: "high" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferred },
    );
    s.state.memory = 4;
    await s.ready();
    // Bind "A" to the Lv.4 Kokatorimon: only the opponent's Lv.3 is then a legal delete,
    // never their Lv.5 DarkKnightmon.
    preferred.push(s.perm("sacrifice").topCard!.instanceId, s.perm("low").topCard!.instanceId);
    const sacrificeId = s.perm("sacrifice").permanentId;
    const highId = s.perm("high").permanentId;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("source").permanentId,
        instanceId: s.inst("tactimon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        s.state.pendingDecision === undefined &&
        !s.state.players[0]!.battleArea.some((p) => p.permanentId === sacrificeId),
    );

    expect(s.state.memory).toBe(0);
    const evolved = s.perm("source");
    expect(evolved.topCard!.cardId).toBe(CARD_ID);
    expect(evolved.stack.map(({ cardId }) => cardId)).toEqual(["BT1-009", "BT10-064"]);
    expect(s.state.players[0]!.battleArea.map(({ permanentId }) => permanentId)).not.toContain(sacrificeId);
    // The Lv.5 opponent Digimon was never a legal target for a Lv.4 sacrifice.
    expect(s.state.players[1]!.battleArea.map(({ permanentId }) => permanentId)).toEqual([highId]);
  });

  it("does not protect an own Digimon without the [Bagra Army] trait", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          hand: [{ card: CARD_ID, as: "tactimon" }],
          battleArea: [
            { card: "BT10-064", as: "source", under: [{ card: "BT1-009", as: "beneath" }] },
            { card: "BT1-009", as: "outsider" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferred },
    );
    s.state.memory = 4;
    await s.ready();
    preferred.push(s.perm("outsider").topCard!.instanceId);
    const outsiderId = s.perm("outsider").permanentId;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("source").permanentId,
        instanceId: s.inst("tactimon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        s.state.pendingDecision === undefined &&
        !s.state.players[0]!.battleArea.some((p) => p.permanentId === outsiderId),
    );

    // A non-[Bagra Army] Digimon is outside the replacement's filter, so the cost was never paid.
    expect(s.state.players[0]!.battleArea.map(({ permanentId }) => permanentId)).not.toContain(outsiderId);
    expect(s.perm("source").stack.map(({ cardId }) => cardId)).toEqual(["BT1-009", "BT10-064"]);
  });

  it("Q5139 prevents every simultaneous [Bagra Army] departure for one 2-card payment", async () => {
    // Structural: no public intent in the card pool deletes two of my own Digimon at once by
    // effect (Tactimon's own clause deletes exactly one). The simultaneity itself is injected;
    // the payment and the "all, without choosing" reading of Q5139 are what this asserts.
    const s = setupEngine(
      {
        0: {
          battleArea: [
            {
              card: CARD_ID,
              as: "tactimon",
              under: [
                { card: "BT1-009", as: "first" },
                { card: "BT1-013", as: "second" },
              ],
            },
            { card: "EX10-026", as: "ally" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    const ids = [s.perm("tactimon").permanentId, s.perm("ally").permanentId];
    await advance(s.engine).verb.deletePermanent(ids, "byEffect");
    await settle(() => s.state.pendingDecision === undefined);

    expect(s.state.players[0]!.battleArea.map(({ permanentId }) => permanentId)).toEqual(expect.arrayContaining(ids));
    expect(s.perm("tactimon").stack).toHaveLength(0);
    expect(s.state.players[0]!.trash.map(({ instanceId }) => instanceId)).toEqual(
      expect.arrayContaining([s.inst("first").instanceId, s.inst("second").instanceId]),
    );
  });

  it("Q5140 cannot pay the replacement with only 1 digivolution card", async () => {
    const s = setupEngine(
      { 0: { battleArea: [{ card: CARD_ID, as: "tactimon", under: [{ card: "BT1-009", as: "only" }] }] } },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    const id = s.perm("tactimon").permanentId;
    await advance(s.engine).verb.deletePermanent([id], "byEffect");
    await settle(() => !s.state.players[0]!.battleArea.some(({ permanentId }) => permanentId === id));

    // The whole card went to the trash: the "by trashing any 2" condition was never met, so
    // nothing was trashed as a cost either.
    expect(s.state.players[0]!.trash.map(({ instanceId }) => instanceId)).toContain(s.inst("only").instanceId);
    expect(s.state.players[0]!.trash.map(({ cardId }) => cardId)).toContain(CARD_ID);
  });

  it("[Once Per Turn]: a second by-effect departure in the same turn is not prevented", async () => {
    // Structural companion to the public-intent proof below ("the opponent's two Option
    // plays ..."), kept for the injected-timing path. Four digivolution cards make the
    // second payment affordable, so a departure that is not prevented can only be the gate.
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: CARD_ID, as: "tactimon", under: ["BT1-009", "BT1-013", "BT1-014", "BT1-009"] },
            { card: "EX10-026", as: "ally" },
            { card: "EX10-027", as: "secondAlly" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    const allyId = s.perm("ally").permanentId;
    const secondAllyId = s.perm("secondAlly").permanentId;

    await advance(s.engine).verb.deletePermanent([allyId], "byEffect");
    await settle(() => s.state.pendingDecision === undefined);
    expect(s.state.players[0]!.battleArea.map(({ permanentId }) => permanentId)).toContain(allyId);
    expect(s.perm("tactimon").stack).toHaveLength(2);

    await advance(s.engine).verb.deletePermanent([secondAllyId], "byEffect");
    await settle(() => s.state.pendingDecision === undefined);
    expect(s.state.players[0]!.battleArea.map(({ permanentId }) => permanentId)).not.toContain(secondAllyId);
    // The gate, not the cost: 2 digivolution cards were still available and untouched.
    expect(s.perm("tactimon").stack).toHaveLength(2);
  });
  it("the opponent's two Option plays in one turn: the first departure is prevented, the second is not, and the gate resets next turn", async () => {
    // Public-intent proof of the [Once Per Turn] gate. Catalog search for a second public
    // by-effect departure (packages/shared/src/cards/data/cards.json): Option cards whose
    // [Main] reads "Delete 1 of your opponent's Digimon" with play cost <= 4 returns 16 cards.
    // BT2-091 Volcanic Flare (Red, cost 3, "Delete 1 of your opponent's Digimon with 4000 DP
    // or less") is the only single-clause one with no rider, and both [Bagra Army] allies here
    // are exactly 4000 DP. The opponent holds three copies and plays them under the real turn
    // loop, so every departure comes from a public playCard intent.
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: CARD_ID, as: "tactimon", under: ["BT1-009", "BT1-013", "BT1-014", "BT1-009"] },
            { card: "EX10-026", as: "ally" },
            { card: "EX10-027", as: "secondAlly" },
          ],
          deck: ["BT1-009", "BT1-013", "BT1-014", "BT1-009", "BT1-013", "BT1-014"],
          hand: ["BT1-009"],
          security: ["BT1-009", "BT1-013"],
        },
        1: {
          // BT1-013 Muchomon is an inert Red Lv.3 at 5000 DP: it supplies the Red color the
          // Option requires and is itself out of range of that Option's own 4000 DP filter.
          battleArea: [{ card: "BT1-013", as: "redSource" }],
          hand: [
            { card: "BT2-091", as: "firstOption" },
            { card: "BT2-091", as: "secondOption" },
            { card: "BT2-091", as: "thirdOption" },
            "BT1-009",
          ],
          deck: ["BT1-009", "BT1-013", "BT1-014", "BT1-009", "BT1-013", "BT1-014"],
          security: ["BT1-009", "BT1-013"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const loop = s.engine.startTurnLoop();
    const p0 = s.state.players[0]!;
    const p1 = s.state.players[1]!;
    const allyId = s.perm("ally").permanentId;
    const secondAllyId = s.perm("secondAlly").permanentId;

    await advance(s.engine).waitForMainPhase(0);
    advance(s.engine).endMainPhaseIfOpen(0);
    await advance(s.engine).waitForMainPhase(1);
    expect(s.state.turnSeat).toBe(1);
    expect(s.perm("tactimon").stack).toHaveLength(4);

    // First by-effect departure of the turn: prevented, paid with 2 digivolution cards.
    s.state.memory = 9;
    const firstOptionId = s.inst("firstOption").instanceId;
    expect(s.engine.applyIntent(1, { type: "playCard", instanceId: firstOptionId })).toEqual({ ok: true });
    await settle(
      () => p1.trash.some(({ instanceId }) => instanceId === firstOptionId) && s.state.pendingDecision === undefined,
    );
    expect(p0.battleArea.map(({ permanentId }) => permanentId)).toEqual(expect.arrayContaining([allyId, secondAllyId]));
    expect(p0.battleArea).toHaveLength(3);
    expect(s.perm("tactimon").stack).toHaveLength(2);

    // Second by-effect departure in the SAME turn: the gate is spent, so it goes through even
    // though 2 digivolution cards are still there to pay with.
    const secondOptionId = s.inst("secondOption").instanceId;
    expect(s.engine.applyIntent(1, { type: "playCard", instanceId: secondOptionId })).toEqual({ ok: true });
    await settle(
      () => p1.trash.some(({ instanceId }) => instanceId === secondOptionId) && s.state.pendingDecision === undefined,
    );
    expect(p0.battleArea).toHaveLength(2);
    const survivorId = p0.battleArea.find(
      ({ permanentId }) => permanentId !== s.perm("tactimon").permanentId,
    )!.permanentId;
    expect([allyId, secondAllyId]).toContain(survivorId);
    // The gate, not the cost: the payment was still affordable and was not taken.
    expect(s.perm("tactimon").stack).toHaveLength(2);

    // Next turn cycle: the once-per-turn use has reset, so the third Option is prevented again.
    advance(s.engine).endMainPhaseIfOpen(1);
    await advance(s.engine).waitForMainPhase(0);
    advance(s.engine).endMainPhaseIfOpen(0);
    await advance(s.engine).waitForMainPhase(1);
    expect(s.state.turnSeat).toBe(1);

    s.state.memory = 9;
    const thirdOptionId = s.inst("thirdOption").instanceId;
    expect(s.engine.applyIntent(1, { type: "playCard", instanceId: thirdOptionId })).toEqual({ ok: true });
    await settle(
      () => p1.trash.some(({ instanceId }) => instanceId === thirdOptionId) && s.state.pendingDecision === undefined,
    );
    expect(p0.battleArea.map(({ permanentId }) => permanentId)).toContain(survivorId);
    expect(p0.battleArea).toHaveLength(2);
    // Reset proved by the payment: the remaining 2 digivolution cards were spent this turn.
    expect(s.perm("tactimon").stack).toHaveLength(0);

    expect(s.engine.applyIntent(1, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });
});
