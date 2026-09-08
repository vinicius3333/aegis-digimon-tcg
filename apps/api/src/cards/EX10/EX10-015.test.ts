import { describe, expect, it } from "vitest";
import { getCardDefinition } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import type { SetupEngineOptions } from "../../engine/testkit/harness.js";
import { assertNoLoudGap, setupEngine, settle } from "../../engine/testkit/harness.js";
import compiled from "./EX10-015.js";
import "../index.js";

const CARD_ID = "EX10-015";

describe("EX10-015 Psychemon", () => {
  it("records the exact catalog, optional Save-text cost, Save, Piercing, and DigiXros recipe", () => {
    expect(getCardDefinition(CARD_ID)).toMatchObject({
      colors: ["Green", "Purple"],
      level: 3,
      playCost: 4,
      dp: 1000,
      evoCosts: [
        { color: "Green", level: 2, memoryCost: 1 },
        { color: "Purple", level: 2, memoryCost: 1 },
      ],
      forms: ["Rookie"],
      attributes: ["Data"],
      types: ["Reptile"],
    });
    expect(compiled).toMatchObject({ coverage: "full", residual: [] });
    expect(compiled.effects?.find((effect) => effect.trigger === "OnDeletion")).toMatchObject({
      actions: [
        {
          kind: "PlaceUnder",
          target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
          underFilter: { controller: "mine", kind: ["Tamer"], excludeToken: true },
          optional: true,
        },
      ],
      keywords: [{ keyword: "Save" }],
    });
    expect(compiled.effects?.find((effect) => effect.trigger === "StartOfYourMainPhase")).toMatchObject({
      actions: [
        {
          kind: "Draw",
          amount: 1,
          optional: true,
          abortOnDecline: true,
          cost: {
            kind: "trash",
            target: { filter: { controller: "mine", zone: "hand", textContains: "Save" }, count: 1 },
          },
        },
        { kind: "Suspend", target: { filter: { controller: "opponent", kind: ["Digimon"] }, count: 1 } },
      ],
    });
    expect(compiled.effects?.find((effect) => effect.isInherited)).toMatchObject({
      trigger: "Static",
      actions: [],
      keywords: [{ keyword: "Piercing" }],
    });
    expect(compiled.digiXrosRequirement).toEqual([{ materials: [{ texts: ["Save"] }], count: 2 }]);
    // No printed [Digivolve] header: the only legal routes are the cards.json EvoCost rows.
    // A restated EvoCost row here would register a second, unprinted alternate path.
    expect(compiled.digivolutionRequirement).toBeUndefined();
  });

  it("Q5044 fires at the real start of the main phase: trashes a Save-text card, draws 1, suspends 1 opposing Digimon", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: CARD_ID, as: "psychemon" }],
          // BT12-006 Monimon carries ＜Save＞ ONLY in its inherited text: Q5044's union
          // (name ∪ traits ∪ effect text ∪ inherited text) is what makes it a legal cost.
          hand: [
            { card: "BT12-006", as: "saveText" },
            { card: "BT1-009", as: "spare" },
          ],
          deck: [
            { card: "BT1-011", as: "deckA" },
            { card: "BT1-012", as: "deckB" },
            { card: "BT1-013", as: "deckC" },
          ],
          security: ["BT1-010", "BT1-010"],
        },
        1: {
          battleArea: [
            { card: "BT1-009", as: "chosen" },
            { card: "BT1-010", as: "other" },
            // "1 of your opponent's DIGIMON": a Tamer on the same board must never be a
            // candidate, so the suspended count below stays at exactly 1.
            { card: "BT1-085", as: "theirTamer" },
          ],
          hand: ["BT1-009"],
          deck: ["BT1-012", "BT1-013"],
          security: ["BT1-010", "BT1-010"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferred },
    );
    preferred.push(s.inst("saveText").instanceId, s.perm("chosen").permanentId);

    s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    await settle(() => s.perm("chosen").isSuspended);

    const p0 = s.state.players[0]!;
    expect(p0.trash.map(({ instanceId }) => instanceId)).toContain(s.inst("saveText").instanceId);
    // The opening turn skips the Draw phase card, so exactly one card left the deck: this
    // effect's ＜Draw 1＞.
    expect(p0.hand.map(({ instanceId }) => instanceId)).toEqual([
      s.inst("spare").instanceId,
      s.inst("deckA").instanceId,
    ]);
    expect(p0.deck.map(({ instanceId }) => instanceId)).toEqual([
      s.inst("deckB").instanceId,
      s.inst("deckC").instanceId,
    ]);
    expect(s.perm("chosen").isSuspended).toBe(true);
    expect(s.perm("other").isSuspended).toBe(false);
    expect(s.perm("theirTamer").isSuspended).toBe(false);
    expect(s.state.players[1]!.battleArea.filter(({ isSuspended }) => isSuspended)).toHaveLength(1);
    assertNoLoudGap(s);
  });

  it("Q5045 does not draw or suspend when no hand card contains Save", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: CARD_ID, as: "psychemon" }],
          hand: [{ card: "BT1-009", as: "noSave" }],
          deck: [
            { card: "BT1-011", as: "deckA" },
            { card: "BT1-012", as: "deckB" },
          ],
          security: ["BT1-010", "BT1-010"],
        },
        1: {
          battleArea: [{ card: "BT1-010", as: "target" }],
          hand: ["BT1-009"],
          deck: ["BT1-012", "BT1-013"],
          security: ["BT1-010", "BT1-010"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );

    s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    await settle(() => false, 20);

    const p0 = s.state.players[0]!;
    // No card left the deck: the clause never activated, so there was no ＜Draw 1＞.
    expect(p0.hand.map(({ instanceId }) => instanceId)).toEqual([s.inst("noSave").instanceId]);
    expect(p0.deck.map(({ instanceId }) => instanceId)).toEqual([
      s.inst("deckA").instanceId,
      s.inst("deckB").instanceId,
    ]);
    expect(p0.trash).toHaveLength(0);
    expect(s.perm("target").isSuspended).toBe(false);
    assertNoLoudGap(s);
  });

  it("Q5045 declining the hand-trash cost blocks the suspension as well as the draw", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: CARD_ID, as: "psychemon" }],
          hand: [{ card: "BT10-029", as: "saveText" }],
          deck: [
            { card: "BT1-011", as: "deckA" },
            { card: "BT1-012", as: "deckB" },
          ],
          security: ["BT1-010", "BT1-010"],
        },
        1: {
          battleArea: [{ card: "BT1-010", as: "target" }],
          hand: ["BT1-009"],
          deck: ["BT1-012", "BT1-013"],
          security: ["BT1-010", "BT1-010"],
        },
      },
      { autoDeclineOptional: true },
    );

    s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    await settle(() => false, 20);

    const p0 = s.state.players[0]!;
    expect(p0.hand.map(({ instanceId }) => instanceId)).toContain(s.inst("saveText").instanceId);
    expect(p0.trash).toHaveLength(0);
    expect(p0.deck.map(({ instanceId }) => instanceId)).toEqual([
      s.inst("deckA").instanceId,
      s.inst("deckB").instanceId,
    ]);
    expect(s.perm("target").isSuspended).toBe(false);
    assertNoLoudGap(s);
  });

  it("does not fire on the opponent's main phase", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: CARD_ID, as: "psychemon" }],
          hand: [{ card: "BT12-006", as: "saveText" }],
          deck: [
            { card: "BT1-011", as: "deckA" },
            { card: "BT1-012", as: "deckB" },
          ],
          security: ["BT1-010", "BT1-010"],
        },
        1: {
          battleArea: [{ card: "BT1-010", as: "theirs" }],
          hand: ["BT1-009"],
          deck: ["BT1-012", "BT1-013"],
          security: ["BT1-010", "BT1-010"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferred },
    );
    preferred.push(s.inst("saveText").instanceId);
    s.state.turnSeat = 1;

    s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(1);
    await settle(() => false, 20);

    const p0 = s.state.players[0]!;
    expect(p0.hand.map(({ instanceId }) => instanceId)).toEqual([s.inst("saveText").instanceId]);
    expect(p0.deck.map(({ instanceId }) => instanceId)).toEqual([
      s.inst("deckA").instanceId,
      s.inst("deckB").instanceId,
    ]);
    expect(p0.trash).toHaveLength(0);
    expect(s.perm("theirs").isSuspended).toBe(false);
    assertNoLoudGap(s);
  });

  it("＜Save＞ on battle deletion places this card under a chosen Tamer, and declining leaves it in trash", async () => {
    const build = (options: SetupEngineOptions) =>
      setupEngine(
        {
          0: {
            battleArea: [
              { card: CARD_ID, as: "psychemon" },
              { card: "BT1-085", as: "tamer" },
            ],
            hand: [{ card: "BT1-009", as: "spare" }],
            deck: ["BT1-012", "BT1-013"],
            security: ["BT1-010", "BT1-010"],
          },
          1: {
            // Suspended so it is a legal attack target; 3000 DP beats Psychemon's 1000 DP,
            // so the attacker is deleted in battle — the production [On Deletion] route.
            battleArea: [{ card: "BT1-009", as: "killer", suspended: true }],
            hand: ["BT1-009"],
            deck: ["BT1-012", "BT1-013"],
            security: ["BT1-010", "BT1-010"],
          },
        },
        options,
      );

    const accepted = build({ autoAcceptOptional: true, autoSelectCards: true });
    const acceptedId = accepted.inst("psychemon").instanceId;
    accepted.engine.startTurnLoop();
    await advance(accepted.engine).waitForMainPhase(0);
    expect(
      accepted.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: accepted.perm("psychemon").permanentId,
        target: { kind: "permanent", permanentId: accepted.perm("killer").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => accepted.perm("tamer").stack.some(({ instanceId }) => instanceId === acceptedId));
    expect(accepted.perm("tamer").stack.map(({ instanceId }) => instanceId)).toContain(acceptedId);
    expect(accepted.state.players[0]!.trash.map(({ instanceId }) => instanceId)).not.toContain(acceptedId);
    expect(accepted.state.players[0]!.battleArea.map(({ topCard }) => topCard.cardId)).not.toContain(CARD_ID);
    assertNoLoudGap(accepted);

    const declined = build({ autoDeclineOptional: true });
    const declinedId = declined.inst("psychemon").instanceId;
    declined.engine.startTurnLoop();
    await advance(declined.engine).waitForMainPhase(0);
    expect(
      declined.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: declined.perm("psychemon").permanentId,
        target: { kind: "permanent", permanentId: declined.perm("killer").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => declined.state.players[0]!.trash.some(({ instanceId }) => instanceId === declinedId));
    expect(declined.state.players[0]!.trash.map(({ instanceId }) => instanceId)).toContain(declinedId);
    expect(declined.perm("tamer").stack.map(({ instanceId }) => instanceId)).not.toContain(declinedId);
    assertNoLoudGap(declined);
  });

  it("digivolves for 1 from both printed level-2 colors, rejects red, and grants inherited Piercing", async () => {
    for (const baseCard of ["BT1-007", "BT10-006"]) {
      const s = setupEngine({
        0: {
          battleArea: [{ card: baseCard, as: "base" }],
          hand: [{ card: CARD_ID, as: "psychemon" }],
          deck: [{ card: "BT1-012", as: "bonus" }],
        },
      });
      s.state.memory = 1;

      expect(
        s.engine.applyIntent(0, {
          type: "digivolve",
          permanentId: s.perm("base").permanentId,
          instanceId: s.inst("psychemon").instanceId,
        }),
      ).toEqual({ ok: true });
      await settle(() => s.perm("base").topCard.cardId === CARD_ID);
      expect(s.state.memory).toBe(0);
      expect(s.perm("base").stack.map(({ cardId }) => cardId)).toContain(baseCard);
      // Digivolution bonus draw: the single deck card is now in hand and the deck is empty.
      expect(s.state.players[0]!.hand.map(({ instanceId }) => instanceId)).toContain(s.inst("bonus").instanceId);
      expect(s.state.players[0]!.deck).toHaveLength(0);
    }

    const inherited = setupEngine({
      0: { battleArea: [{ card: "BT1-009", as: "host", under: [CARD_ID] }] },
    });
    inherited.state.turnSeat = 1;
    await inherited.ready();
    expect([...inherited.perm("host").keywords]).toContain("Piercing");

    const invalid = setupEngine({
      0: {
        battleArea: [{ card: "BT1-001", as: "redEgg" }],
        hand: [{ card: CARD_ID, as: "psychemon" }],
      },
    });
    invalid.state.memory = 1;
    expect(
      invalid.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: invalid.perm("redEgg").permanentId,
        instanceId: invalid.inst("psychemon").instanceId,
      }),
    ).toEqual(expect.objectContaining({ ok: false }));
  });

  it("DigiXroses with exactly 1 Save-text Digimon for -2 and rejects a near non-match", async () => {
    const s = setupEngine({
      0: {
        hand: [
          { card: CARD_ID, as: "psychemon" },
          { card: "BT10-029", as: "saveMaterial" },
          { card: "BT1-009", as: "noSave" },
          { card: "BT12-087", as: "saveTamer" },
        ],
      },
    });
    s.state.memory = 4;
    await s.ready();

    const invalidResult = s.engine.applyIntent(0, {
      type: "playCard",
      instanceId: s.inst("psychemon").instanceId,
      digiXros: { materialInstanceIds: [s.inst("noSave").instanceId] },
    });
    expect(invalidResult).toEqual(expect.objectContaining({ ok: false }));
    // The printed slot is "1 DIGIMON card with ＜Save＞ in text": a Tamer whose text carries
    // ＜Save＞ satisfies the text half and must still be rejected by the Digimon-only guard.
    expect(
      s.engine.applyIntent(0, {
        type: "playCard",
        instanceId: s.inst("psychemon").instanceId,
        digiXros: { materialInstanceIds: [s.inst("saveTamer").instanceId] },
      }),
    ).toEqual(expect.objectContaining({ ok: false }));
    const validResult = s.engine.applyIntent(0, {
      type: "playCard",
      instanceId: s.inst("psychemon").instanceId,
      digiXros: { materialInstanceIds: [s.inst("saveMaterial").instanceId] },
    });
    expect(validResult).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some(({ topCard }) => topCard.cardId === CARD_ID));

    const psychemon = s.state.players[0]!.battleArea.find(({ topCard }) => topCard.cardId === CARD_ID)!;
    expect(s.state.memory).toBe(2);
    expect(psychemon.stack.map(({ instanceId }) => instanceId)).toContain(s.inst("saveMaterial").instanceId);
    expect(s.state.players[0]!.hand.map(({ instanceId }) => instanceId)).toContain(s.inst("noSave").instanceId);
    assertNoLoudGap(s);
  });
});
