import { describe, it, expect } from "vitest";
import { EffectTiming, type PlayerState } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine as setup, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./BT24-093.js";
import "../index.js";

// A3 for BT24-093 (Aegiochusmon: Cerulean) — proves the [Main] on-play body ("Add your top
// security card to the hand and <Recovery +1 (Deck)>. Then, place this card in the battle
// area.") actually resolves when the card is PLAYED.
//
// Lane R4's dead-clause class: the module used to register this clause exclusively at
// EffectTiming.OnDeclaration, a window `applyPlayCard` never fires for an Option
// (`playCard.ts` only auto-fires `EffectTiming.OnUseOption`). Playing the card sent it
// straight to the trash with no security-to-hand, no recovery, and no battle-area
// placement. The fix re-homes the clause to `EffectTiming.OnUseOption`.
//
// FAILS-WHEN-REVERTED: with the clause back at OnDeclaration only, this playCard call
// leaves the security stack, hand, and deck untouched, and the card lands in the trash
// instead of the battle area (test RED).

describe("BT24-093 [Main] on-play body fires on a real playCard (not dead)", () => {
  it("performs security-to-hand and Recovery before the printed then-place tail", () => {
    expect(compiled.effects.find((effect) => effect.trigger === "Main")?.actions).toEqual([
      expect.objectContaining({ kind: "SecurityManipulation", op: "toHand", toTop: true }),
      expect.objectContaining({ kind: "SecurityManipulation", op: "addTop", source: "deck" }),
      expect.objectContaining({ kind: "PlaceInBattleAreaSelf" }),
    ]);
  });

  it("targets an exact named host's top stacked card for the Delay effect", () => {
    const delay = compiled.effects.find((effect) => effect.trigger === "AllTurns");
    expect(delay).toMatchObject({ keywords: [{ keyword: "Delay" }] });
    expect(delay?.actions[0]).toMatchObject({
      kind: "SubTrigger",
      event: "whenSecurityRemoved",
      actions: [
        {
          kind: "SecurityManipulation",
          op: "addTop",
          fromDigivolutionTop: true,
          source: { filter: { nameOrTrait: [{ tokens: ["Aegiochusmon", "Jupitermon"], match: "nameExact" }] } },
        },
      ],
    });
  });

  it("encodes the printed Security play from hand or trash", () => {
    expect(compiled.effects.find((effect) => effect.trigger === "Security")).toMatchObject({
      isSecurity: true,
      actions: [
        {
          kind: "PlayWithoutCost",
          from: ["hand", "trash"],
          payCost: false,
          optional: true,
          target: {
            filter: {
              kind: ["Digimon"],
              nameOrTrait: [{ tokens: ["Aegiomon", "Elecmon"], match: "nameExact" }],
            },
          },
        },
      ],
    });
  });

  it.each([
    ["Aegiomon from hand", "hand", "BT24-034"],
    ["Elecmon from trash", "trash", "BT24-031"],
  ] as const)("plays %s without paying the cost", async (_label, zone, card) => {
    const s = setup(
      {
        0: {
          security: [{ card: "BT24-093", as: "temple" }],
          [zone]: [{ card, as: "target" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();

    await advance(s.engine).fireForInstance(EffectTiming.Security, s.inst("temple"));
    await settle(() =>
      s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.instanceId === s.inst("target").instanceId),
    );

    expect(
      s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.instanceId === s.inst("target").instanceId),
    ).toBe(true);
  });

  it("moves the top security card to hand, recovers 1 from deck to security, and lands in the battle area", async () => {
    const s = setup(
      {
        0: {
          battleArea: [{ card: "BT1-045", dp: 3000 }], // §4-21 color-requirement source (Yellow)
          hand: [{ card: "BT24-093", as: "option" }],
          security: [{ card: "AD1-001", as: "topSecurity" }],
          deck: [{ card: "AD1-001", as: "deckCard" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const p0 = s.state.players[0] as PlayerState;

    const option = s.inst("option");
    const topSecurity = s.inst("topSecurity");
    const deckCard = s.inst("deckCard");
    s.state.memory = 0; // maxAffordable for seat 0 (turnSeat) is memory + 10, covers cost 2

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: option.instanceId })).toEqual({ ok: true });

    await settle(() => p0.battleArea.some((perm) => perm.topCard?.cardId === "BT24-093"));
    await settle(() => false, 60); // flush the rest of the resolution

    // NEGATIVE CONTROL: a reverted (OnDeclaration-only) module leaves security, hand, and
    // deck completely unchanged by this playCard call, and the card sits in the trash.
    expect(p0.hand.some((c) => c.instanceId === topSecurity.instanceId)).toBe(true); // top security -> hand
    expect(p0.security.some((c) => c.instanceId === topSecurity.instanceId)).toBe(false);
    expect(p0.security.length).toBe(1); // Recovery +1 refilled security from the deck
    expect(p0.deck.some((c) => c.instanceId === deckCard.instanceId)).toBe(false);
    expect(p0.battleArea.some((perm) => perm.topCard?.cardId === "BT24-093")).toBe(true); // placed
    expect(p0.trash.some((c) => c.cardId === "BT24-093")).toBe(false); // NOT trashed
  });

  it("recovers and enters the battle area even with no security card to add to hand (Q5692)", async () => {
    const s = setup({
      0: {
        battleArea: ["BT1-045"],
        hand: [{ card: "BT24-093", as: "option" }],
        deck: [{ card: "BT1-001", as: "recovered" }],
      },
    });
    s.state.memory = 2;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.security.some((card) => card.instanceId === s.inst("recovered").instanceId));
    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.cardId === "BT24-093")).toBe(true);
  });

  it("uses Delay to place the named Digimon's top stacked card as top security (Q5694/Q5695)", async () => {
    const s = setup(
      {
        0: {
          battleArea: [
            { card: "BT24-093", as: "option" },
            { card: "BT24-014", as: "host", under: [{ card: "BT24-034", as: "stacked" }] },
          ],
          security: [{ card: "BT1-001", as: "removed" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    s.perm("option").enterFieldTurnCount = s.state.turnCount - 1;

    await advance(s.engine).verb.trash([s.inst("removed").instanceId]);
    await settle(() => s.state.players[0]!.security[0]?.instanceId === s.inst("stacked").instanceId);

    expect(s.perm("host").topCard.cardId).toBe("BT24-014");
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toContain(s.inst("option").instanceId);
  });
});
