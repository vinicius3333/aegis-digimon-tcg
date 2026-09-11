import { Phase, getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { internalsOf } from "../../engine/testkit/internals.js";
import { observe } from "../../engine/testkit/observe.js";
import "./P-247.js";

// Hand fixtures, one per accepted trait. All four are printed-vanilla or keyword-only, so
// trashing them from hand cannot open a decision or change the result.
const traitCostFixtures = [
  { trait: "Dark Animal", card: "BT4-082" },
  { trait: "Shaman", card: "BT1-057" },
  { trait: "Undead", card: "BT2-075" },
  { trait: "TS", card: "BT24-011" },
] as const;

describe("P-247 Nyaromon", () => {
  it("matches the catalog identity", () => {
    expect(getCardDefinition("P-247")).toMatchObject({
      cardId: "P-247",
      nameEn: "Nyaromon",
      colors: ["Purple"],
      kinds: ["DigiEgg"],
      level: 2,
      forms: ["In-Training"],
      types: ["Lesser", "Titan", "TS"],
    });
  });

  it("encodes the inherited once-per-turn trait-costed deletion", () => {
    const compiled = runtimeCompiledCard("P-247")!;
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual ?? []).toEqual([]);
    expect(compiled.effects).toEqual([
      expect.objectContaining({
        trigger: "WhenAttacking",
        isInherited: true,
        frequency: "OncePerTurn",
        actions: [
          expect.objectContaining({
            kind: "Delete",
            optional: true,
            abortOnDecline: true,
            target: expect.objectContaining({
              filter: {
                controller: "opponent",
                kind: ["Digimon"],
                unsuspended: true,
                levelComparison: { op: "lte", value: 4 },
              },
              count: 1,
            }),
            cost: expect.objectContaining({
              kind: "trash",
              target: {
                filter: {
                  zone: "hand",
                  controller: "mine",
                  nameOrTrait: [{ tokens: ["Dark Animal", "Shaman", "Undead", "TS"], match: "trait" }],
                },
                count: 1,
              },
            }),
          }),
        ],
      }),
    ]);
  });

  for (const { trait, card } of traitCostFixtures) {
    it(`accepts a [${trait}] hand card as the trash cost and deletes an unsuspended level 4`, async () => {
      const s = setupEngine(
        {
          0: {
            battleArea: [{ card: "BT2-067", as: "host", under: ["P-247"] }],
            hand: [{ card, as: "cost" }],
          },
          1: { battleArea: [{ card: "BT1-019", as: "level4" }], security: ["BT1-010"] },
        },
        { autoAcceptOptional: true, autoSelectCards: true },
      );
      await s.ready();
      const targetId = s.perm("level4").permanentId;

      expect(
        s.engine.applyIntent(0, {
          type: "attack",
          attackerPermanentId: s.perm("host").permanentId,
          target: { kind: "player" },
        }),
      ).toEqual({ ok: true });
      await settle(() => !s.state.players[1]!.battleArea.some((permanent) => permanent.permanentId === targetId));

      expect(s.state.players[1]!.battleArea).toHaveLength(0);
      expect(s.state.players[0]!.trash.some((held) => held.instanceId === s.inst("cost").instanceId)).toBe(true);
    });
  }

  it("deletes only the unsuspended level 4 or lower Digimon from a mixed board", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT2-067", as: "host", under: ["P-247"] }],
          hand: [{ card: "BT2-075", as: "cost" }],
        },
        1: {
          battleArea: [
            { card: "BT1-020", as: "level5Unsuspended" },
            { card: "BT1-019", as: "level4Suspended", suspended: true },
            { card: "BT1-019", as: "level4Unsuspended" },
          ],
          security: ["BT1-010"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    const deletedId = s.perm("level4Unsuspended").permanentId;

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => !s.state.players[1]!.battleArea.some((permanent) => permanent.permanentId === deletedId));

    expect(s.state.players[1]!.battleArea.map((permanent) => permanent.permanentId)).toEqual([
      s.perm("level5Unsuspended").permanentId,
      s.perm("level4Suspended").permanentId,
    ]);
  });

  it("leaves an unsuspended level 5 alone when it is the only opposing Digimon", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT2-067", as: "host", under: ["P-247"] }],
          hand: [{ card: "BT2-075", as: "cost" }],
        },
        1: { battleArea: [{ card: "BT1-020", as: "level5" }], security: [{ card: "BT1-010", as: "checked" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => !observe(s.engine).isAttacking());

    expect(s.state.players[1]!.battleArea.map((permanent) => permanent.permanentId)).toEqual([
      s.perm("level5").permanentId,
    ]);
    expect(s.state.players[0]!.trash.some((held) => held.instanceId === s.inst("cost").instanceId)).toBe(false);
    expect(s.state.players[0]!.hand.map((held) => held.instanceId)).toContain(s.inst("cost").instanceId);
  });

  it("cannot pay with a hand card outside the four accepted traits", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT2-067", as: "host", under: ["P-247"] }],
          // BT1-009 is [Mini Dragon]; BT1-028 is [Mammal]. Neither is an accepted trait.
          hand: [
            { card: "BT1-009", as: "wrongTraitOne" },
            { card: "BT1-028", as: "wrongTraitTwo" },
          ],
        },
        1: { battleArea: [{ card: "BT1-019", as: "level4" }], security: ["BT1-010"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => !observe(s.engine).isAttacking());

    expect(s.state.players[1]!.battleArea.map((permanent) => permanent.permanentId)).toEqual([
      s.perm("level4").permanentId,
    ]);
    expect(s.state.players[0]!.hand.map((held) => held.instanceId)).toEqual([
      s.inst("wrongTraitOne").instanceId,
      s.inst("wrongTraitTwo").instanceId,
    ]);
  });

  it("keeps the cost card and the target when the optional effect is declined", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT2-067", as: "host", under: ["P-247"] }],
          hand: [{ card: "BT2-075", as: "cost" }],
        },
        1: { battleArea: [{ card: "BT1-019", as: "level4" }], security: ["BT1-010"] },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => !observe(s.engine).isAttacking());

    expect(s.state.players[1]!.battleArea.map((permanent) => permanent.permanentId)).toEqual([
      s.perm("level4").permanentId,
    ]);
    expect(s.state.players[0]!.hand.map((held) => held.instanceId)).toContain(s.inst("cost").instanceId);
  });

  it("fires at most once per turn even after the host unsuspends", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT2-067", as: "host", under: ["P-247"] }],
          hand: [
            { card: "BT2-075", as: "firstCost" },
            { card: "BT1-057", as: "secondCost" },
          ],
        },
        1: {
          battleArea: [
            { card: "BT1-019", as: "firstTarget" },
            { card: "BT1-019", as: "secondTarget" },
          ],
          security: ["BT1-010", "BT1-013"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    const firstId = s.perm("firstTarget").permanentId;

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => !s.state.players[1]!.battleArea.some((permanent) => permanent.permanentId === firstId));
    await settle(() => !observe(s.engine).isAttacking());

    // A real unsuspend restores attack eligibility (Comprehensive Rules §11-2-3), so the second
    // declaration is legal and the only thing that can stop the deletion is [Once Per Turn].
    await advance(s.engine).verb.unsuspend([s.perm("host").permanentId]);
    expect(s.perm("host").isSuspended).toBe(false);
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => !observe(s.engine).isAttacking());

    expect(s.state.players[1]!.battleArea.map((permanent) => permanent.permanentId)).toEqual([
      s.perm("secondTarget").permanentId,
    ]);
    expect(s.state.players[0]!.hand.map((held) => held.instanceId)).toContain(s.inst("secondCost").instanceId);
  });

  it("is reached through a legal breeding stack and still deletes from the battle area", async () => {
    const s = setupEngine(
      {
        0: {
          breeding: { card: "P-247", as: "egg" },
          // BT2-067 DemiDevimon digivolves from a Purple Lv.2 for 0 memory; BT4-082 Dobermon
          // digivolves from a Purple Lv.3 for 2 memory. Both are printed-vanilla.
          hand: [
            { card: "BT2-067", as: "level3" },
            { card: "BT4-082", as: "level4" },
            { card: "BT2-075", as: "cost" },
          ],
          deck: [{ card: "BT1-013", as: "draw1" }, { card: "BT1-014", as: "draw2" }, "BT1-009", "BT1-010"],
        },
        1: { battleArea: [{ card: "BT1-019", as: "target" }], security: ["BT1-010", "BT1-013"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("egg").permanentId,
        instanceId: s.inst("level3").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("egg").topCard.cardId === "BT2-067");
    expect(s.state.memory).toBe(10);
    expect(s.state.players[0]!.hand.some((held) => held.instanceId === s.inst("draw1").instanceId)).toBe(true);
    expect(s.perm("egg").stack.map((card) => card.cardId)).toEqual(["P-247"]);

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("egg").permanentId,
        instanceId: s.inst("level4").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("egg").topCard.cardId === "BT4-082");
    expect(s.state.memory).toBe(8);
    expect(s.state.players[0]!.hand.some((held) => held.instanceId === s.inst("draw2").instanceId)).toBe(true);
    expect(s.perm("egg").stack.map((card) => card.cardId)).toEqual(["P-247", "BT2-067"]);

    const breedingTurn = s.engine.runOneTurn();
    await settle(() => s.state.phase === Phase.Breeding);
    expect(s.engine.applyIntent(0, { type: "moveFromBreeding", permanentId: s.perm("egg").permanentId })).toEqual({
      ok: true,
    });
    await advance(s.engine).waitForMainPhase(0);
    await settle(() => !internalsOf(s.engine).mainEntryPending);

    const targetId = s.perm("target").permanentId;
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("egg").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => !s.state.players[1]!.battleArea.some((permanent) => permanent.permanentId === targetId));

    expect(s.state.players[1]!.battleArea).toHaveLength(0);
    expect(s.state.players[0]!.trash.some((held) => held.instanceId === s.inst("cost").instanceId)).toBe(true);
    expect(s.perm("egg").stack.map((card) => card.cardId)).toEqual(["P-247", "BT2-067"]);
    advance(s.engine).endMainPhaseIfOpen(0);
    await breedingTurn;
  });
});
