import { describe, expect, it } from "vitest";
import { EffectTiming, Phase, getCardDefinition } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled as BT25_008 } from "./BT25-008.js";
import "../index.js";

describe("BT25-008 Coronamon", () => {
  it("matches the catalog identity and Iliad TS traits", () => {
    expect(getCardDefinition("BT25-008")).toMatchObject({
      cardId: "BT25-008",
      nameEn: "Coronamon",
      colors: ["Red"],
      kinds: ["Digimon"],
      level: 3,
      playCost: 3,
      dp: 1000,
      forms: ["Rookie"],
      attributes: ["Vaccine"],
      types: ["Beast", "Iliad", "TS"],
    });
  });

  it("draws one for each actually trashed Iliad/TS hand card", () => {
    for (const trigger of ["WhenMoving", "OnPlay"] as const) {
      const effect = BT25_008.effects?.find((entry) => entry.trigger === trigger);
      expect(effect?.actions?.[0]).toMatchObject({
        kind: "Draw",
        controller: "mine",
        amount: 1,
        optional: true,
        abortOnDecline: true,
        cost: {
          kind: "trash",
          target: {
            filter: { zone: "hand", controller: "mine", nameOrTrait: [{ tokens: ["Iliad", "TS"], match: "trait" }] },
            count: 2,
            upTo: true,
          },
        },
        scaling: { per: 1, usePaidCount: true },
      });
    }
  });

  it("preserves inherited +2000 DP during your turn", () => {
    expect(BT25_008.effects?.find((entry) => entry.isInherited)).toMatchObject({
      trigger: "YourTurn",
      actions: [{ kind: "ModifyDP", amount: 2000, duration: "permanent" }],
    });
  });

  it.each(["OnPlay", "WhenMoving"] as const)(
    "trashes up to two qualifying cards and draws for each on %s",
    async (trigger) => {
      const s = setupEngine(
        {
          0:
            trigger === "OnPlay"
              ? {
                  hand: [
                    { card: "BT25-008", as: "coronamon" },
                    { card: "BT25-022", as: "iliad" },
                    { card: "BT25-021", as: "wrongTrait" },
                    { card: "BT25-005", as: "ts" },
                  ],
                  deck: ["BT1-001", "BT1-002"],
                }
              : {
                  breeding: { card: "BT25-008", as: "coronamon" },
                  hand: [
                    { card: "BT25-022", as: "iliad" },
                    { card: "BT25-021", as: "wrongTrait" },
                    { card: "BT25-005", as: "ts" },
                  ],
                  deck: ["BT1-001", "BT1-002"],
                },
        },
        { autoAcceptOptional: true, autoSelectCards: true },
      );
      if (trigger === "OnPlay") s.state.memory = 3;
      else s.state.phase = Phase.Breeding;

      const result =
        trigger === "OnPlay"
          ? s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("coronamon").instanceId })
          : s.engine.applyIntent(0, { type: "moveFromBreeding", permanentId: s.perm("coronamon").permanentId });
      expect(result).toEqual({ ok: true });

      await settle(() => s.state.players[0]!.trash.length === 2);
      expect(s.state.players[0]!.trash.map((card) => card.cardId)).toEqual(
        expect.arrayContaining(["BT25-022", "BT25-005"]),
      );
      expect(s.state.players[0]!.hand.map((card) => card.cardId)).toEqual(
        expect.arrayContaining(["BT1-001", "BT1-002"]),
      );
      expect(s.state.players[0]!.hand.map((card) => card.cardId)).toContain("BT25-021");
    },
  );

  it("draws only once when one qualifying card is paid and can be declined", async () => {
    const paid = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT25-008", as: "coronamon" }],
          hand: [
            { card: "BT25-022", as: "iliad" },
            { card: "BT25-021", as: "wrongTrait" },
          ],
          deck: ["BT1-001", "BT1-002"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await advance(paid.engine).fireForPermanent(EffectTiming.WhenMoving, paid.perm("coronamon"));
    await settle(() => paid.state.players[0]!.trash.length === 1);
    expect(paid.state.players[0]!.trash.map((card) => card.cardId)).toEqual(["BT25-022"]);
    expect(paid.state.players[0]!.hand.map((card) => card.cardId)).toEqual(
      expect.arrayContaining(["BT1-001", "BT25-021"]),
    );
    expect(paid.state.players[0]!.deck.map((card) => card.cardId)).toEqual(["BT1-002"]);

    const declined = setupEngine(
      {
        0: {
          breeding: { card: "BT25-008", as: "coronamon" },
          hand: ["BT25-022"],
          deck: ["BT1-001"],
        },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    declined.state.phase = Phase.Breeding;
    await declined.ready();
    expect(
      declined.engine.applyIntent(0, {
        type: "moveFromBreeding",
        permanentId: declined.perm("coronamon").permanentId,
      }),
    ).toEqual({ ok: true });
    await settle(() => declined.perm("coronamon").inBreeding === false);
    expect(declined.state.players[0]!.trash).toHaveLength(0);
    expect(declined.state.players[0]!.hand.map((card) => card.cardId)).toEqual(["BT25-022"]);
    expect(declined.state.players[0]!.deck.map((card) => card.cardId)).toEqual(["BT1-001"]);
  });

  it("supports the zero-cost TS evolution and inherited DP only during your turn", async () => {
    const s = setupEngine({
      0: { breeding: { card: "BT25-005", as: "base" }, hand: [{ card: "BT25-008", as: "coronamon" }] },
    });
    s.state.memory = 2;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("coronamon").instanceId,
        useAlternateCost: true,
        alternateRequirementIndex: 0,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard.cardId === "BT25-008");
    expect(s.state.memory).toBe(2);
    expect(s.perm("base").currentDP).toBe(getCardDefinition("BT25-008")!.dp);

    const inherited = setupEngine({
      0: { battleArea: [{ card: "BT25-021", dp: 4000, under: ["BT25-008"], as: "host" }] },
    });
    await inherited.ready();
    expect(inherited.perm("host").currentDP).toBe(6000);
    inherited.state.turnSeat = 1;
    await (inherited.engine as unknown as { recomputeContinuousEffects(): Promise<void> }).recomputeContinuousEffects();
    expect(inherited.perm("host").currentDP).toBe(4000);

    const invalid = setupEngine({
      0: { breeding: { card: "BT25-004", as: "nonTs" }, hand: [{ card: "BT25-008", as: "coronamon" }] },
    });
    expect(
      invalid.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: invalid.perm("nonTs").permanentId,
        instanceId: invalid.inst("coronamon").instanceId,
        useAlternateCost: true,
        alternateRequirementIndex: 0,
      }),
    ).toEqual({ ok: false, reason: "invalid-evolution" });
  });
});
