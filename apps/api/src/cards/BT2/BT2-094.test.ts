import { getCardDefinition, getCompiledCard, type AttackTarget } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import module from "./BT2-094.js";

// A3 for BT2-094 (Arctic Blizzard, Blue Option).
// [Main] Choose 1 digivolution card of 1 of your opponent's Digimon and trash it.
//   Then, 1 of your Digimon gets +2000 DP for the turn.
// [Security] Add this card to its owner's hand.
//
// FAILS-WHEN-REVERTED: The hand-written module trashes a chosen digivolution card from
// the opponent's Digimon. The declarative effect has the trash-divo-card action as a
// inert legacy parser fallback — the digivolution card stays in the opponent's stack. The test
// asserts the digivolution card is in trash after the [Main] fires, which fails with
// the declarative effect record.

describe("BT2-094 Arctic Blizzard", () => {
  it("matches its official Option and Security text through a direct module import", () => {
    expect(module.cardId).toBe("BT2-094");
    expect(getCardDefinition("BT2-094")).toMatchObject({
      nameEn: "Arctic Blizzard",
      colors: ["Blue"],
      playCost: 2,
      effectText: expect.stringContaining("Choose 1 digivolution card"),
      securityEffectText: "[Security] Add this card to your hand.",
    });
  });

  it("publishes the executable source-selection primitive with full coverage", () => {
    expect(getCompiledCard("BT2-094")).toMatchObject({
      coverage: "full",
      residual: [],
      effects: [
        {
          trigger: "Main",
          actions: [
            { kind: "TrashDigivolution", amount: 1, choose: true },
            { kind: "ModifyDP", amount: 2000 },
          ],
        },
        { trigger: "Security", actions: [{ kind: "AddToHandSelf" }] },
      ],
    });
  });

  it("[Main] trashes 1 digivolution card from opponent's Digimon", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            // Player 0 has a Digimon (for the +2000 DP target).
            { card: "BT1-009", dp: 3000, as: "buffTarget" },
            { card: "BT1-027", dp: 3000 }, // §4-21 color-requirement source (Blue)
          ],
          hand: [{ card: "BT2-094", as: "option" }],
        },
        1: {
          // Opponent has a Digimon with a digivolution card in its stack.
          battleArea: [{ card: "BT1-057", dp: 5000, as: "oppDigimon", under: [{ card: "BT1-029", as: "divoCard" }] }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const p1 = s.state.players[1];
    s.state.memory = 5;
    const optionId = s.inst("option").instanceId;
    const divoCardId = s.inst("divoCard").instanceId;

    const res = s.engine.applyIntent(0, {
      type: "playCard",
      instanceId: optionId,
    });
    expect(res).toEqual({ ok: true });

    // Wait until the digivolution card is trashed.
    await settle(
      () => (p1?.trash.some((c) => c.instanceId === divoCardId) ?? false) && s.perm("buffTarget").currentDP === 5000,
    );

    // The digivolution card must now be in player 1's trash.
    expect(p1?.trash.some((c) => c.instanceId === divoCardId)).toBe(true);
    // The digivolution card must no longer be in the opponent's Digimon stack.
    expect(s.perm("oppDigimon").stack.some((c) => c.instanceId === divoCardId)).toBe(false);
    expect(s.perm("buffTarget").currentDP).toBe(5000);
  });

  it("still gives +2000 DP when the opponent has no digivolution cards to trash", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT1-009", dp: 3000, as: "buffTarget" },
            { card: "BT1-027", dp: 3000 },
          ],
          hand: [{ card: "BT2-094", as: "option" }],
        },
        1: { battleArea: [{ card: "BT1-057", as: "noSources" }] },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 2;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.perm("buffTarget").currentDP === 5000);
    expect(s.perm("noSources").stack).toHaveLength(0);
  });

  it("still trashes the opposing source when there is no own Digimon to receive the DP bonus", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT2-085", as: "blueTamer" }],
          hand: [{ card: "BT2-094", as: "option" }],
        },
        1: {
          battleArea: [{ card: "BT1-057", as: "opponent", under: [{ card: "BT1-029", as: "source" }] }],
        },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 2;
    const sourceId = s.inst("source").instanceId;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[1]!.trash.some((card) => card.instanceId === sourceId));

    expect(s.perm("opponent").stack).toHaveLength(0);
    expect(s.state.players[0]!.battleArea).toHaveLength(1);
  });

  it("[Security] adds this card to its owner's hand", async () => {
    const s = setupEngine({
      // Player 0 has BT2-094 in security, no battleArea Digimon.
      0: { security: [{ card: "BT2-094", as: "secCard" }] },
      // Player 1 has an attacker; player 0 has no battleArea Digimon so attack goes direct.
      1: { battleArea: [{ card: "BT1-057", dp: 5000, as: "attacker" }] },
    });
    const p0 = s.state.players[0];
    s.state.turnSeat = 1;
    s.state.memory = 0;
    const secCardId = s.inst("secCard").instanceId;
    const attackerId = s.perm("attacker").permanentId;

    const res = s.engine.applyIntent(1, {
      type: "attack",
      attackerPermanentId: attackerId,
      target: { kind: "player" } satisfies AttackTarget,
    });
    expect(res).toEqual({ ok: true });

    // After security check: BT2-094 is in player 0's hand.
    await settle(() => p0?.hand.some((c) => c.instanceId === secCardId) ?? false);

    expect(p0?.hand.some((c) => c.instanceId === secCardId)).toBe(true);
    expect(p0?.security.some((c) => c.instanceId === secCardId)).toBe(false);
  });
});
