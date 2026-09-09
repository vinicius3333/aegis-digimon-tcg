import { getCardDefinition, Zone } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "../index.js";
import { compiled } from "./BT19-010.js";

describe("BT19-010 Shoutmon X4", () => {
  it("matches the catalog printing this audit reads from", () => {
    expect(getCardDefinition("BT19-010")).toMatchObject({
      cardId: "BT19-010",
      nameEn: "Shoutmon X4",
      colors: ["Red", "Yellow"],
      kinds: ["Digimon"],
      level: 4,
      playCost: 8,
      dp: 8000,
      types: ["Composite", "Xros Heart"],
      evoCosts: [],
    });
  });

  it("compiles the would-leave clause against its OWN digivolution cards and the four exact material names", () => {
    expect(compiled.digiXrosRequirement).toEqual([
      {
        materials: [
          { names: ["Shoutmon"] },
          { names: ["Ballistamon"] },
          { names: ["Dorulumon"] },
          { names: ["Starmons"] },
        ],
        count: 2,
      },
    ]);
    expect(compiled.effects?.[0]).toMatchObject({
      trigger: "AllTurns",
      actions: [
        {
          kind: "Replacement",
          event: "wouldLeavePlay",
          sourceFilter: { isSelfRef: true },
          optional: true,
          actions: [
            {
              kind: "PlaceUnder",
              target: {
                count: 3,
                upTo: true,
                from: ["digivolutionCards"],
                filter: {
                  zone: "digivolutionCards",
                  kind: ["Digimon"],
                  // "from this Digimon's digivolution cards" — not every friendly stack.
                  hostFilter: { isSelfRef: true },
                  nameOrTrait: [{ tokens: ["Xros Heart"], match: "trait" }],
                },
              },
              underFilter: { controller: "mine", kind: ["Tamer"] },
            },
          ],
        },
      ],
    });
  });

  it("DigiXroses with its four exact materials for zero memory (-2 per placed card)", async () => {
    const s = setupEngine({
      0: {
        hand: [
          { card: "BT19-010", as: "x4" },
          { card: "BT10-008", as: "shoutmon" },
          { card: "BT10-049", as: "ballistamon" },
          { card: "BT10-034", as: "dorulumon" },
          { card: "BT10-029", as: "starmons" },
        ],
        deck: ["BT1-009", "BT1-010", "BT1-011"],
      },
    });
    s.state.memory = 0;
    await s.ready();
    const materialIds = ["shoutmon", "ballistamon", "dorulumon", "starmons"].map((a) => s.inst(a).instanceId);

    expect(
      s.engine.applyIntent(0, {
        type: "playCard",
        instanceId: s.inst("x4").instanceId,
        digiXros: { materialInstanceIds: materialIds, expanderPermanentIds: [] },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.cardId === "BT19-010"));

    // Play cost 8, reduced by 2 for each of the 4 placed cards (comprehensive 7-2-2-1).
    expect(
      s
        .perm("x4")
        .stack.map((card) => card.instanceId)
        .sort(),
    ).toEqual([...materialIds].sort());
    expect(s.state.memory).toBe(0);
    expect(s.state.players[0]!.hand).toHaveLength(0);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("reduces the cost by only 2 per card on a partial DigiXros", async () => {
    const s = setupEngine({
      0: {
        hand: [
          { card: "BT19-010", as: "x4" },
          { card: "BT10-008", as: "shoutmon" },
          { card: "BT10-049", as: "ballistamon" },
          { card: "BT10-034", as: "dorulumon" },
        ],
        deck: ["BT1-009", "BT1-010", "BT1-011"],
      },
    });
    s.state.memory = 2;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "playCard",
        instanceId: s.inst("x4").instanceId,
        digiXros: {
          materialInstanceIds: ["shoutmon", "ballistamon", "dorulumon"].map((a) => s.inst(a).instanceId),
          expanderPermanentIds: [],
        },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.cardId === "BT19-010"));

    expect(s.perm("x4").stack).toHaveLength(3);
    // 8 - (3 x 2) = 2 memory paid, from 2 down to 0.
    expect(s.state.memory).toBe(0);
  });

  it("refuses a near-miss material whose name only CONTAINS a required name", async () => {
    // BT5-014 OmniShoutmon has "Shoutmon" as a substring of its name and no
    // "treated as [Shoutmon]" clause, so it is not the [Shoutmon] the requirement names.
    const s = setupEngine({
      0: {
        hand: [
          { card: "BT19-010", as: "x4" },
          { card: "BT5-014", as: "omniShoutmon" },
          { card: "BT10-049", as: "ballistamon" },
          { card: "BT10-034", as: "dorulumon" },
          { card: "BT10-029", as: "starmons" },
        ],
        deck: ["BT1-009", "BT1-010", "BT1-011"],
      },
    });
    s.state.memory = 0;
    await s.ready();

    const refusal = s.engine.applyIntent(0, {
      type: "playCard",
      instanceId: s.inst("x4").instanceId,
      digiXros: {
        materialInstanceIds: ["omniShoutmon", "ballistamon", "dorulumon", "starmons"].map((a) => s.inst(a).instanceId),
        expanderPermanentIds: [],
      },
    });
    expect(refusal).toEqual({ ok: false, reason: "invalid-material" });
    expect(s.state.players[0]!.battleArea).toHaveLength(0);
    expect(s.state.players[0]!.hand).toHaveLength(5);
    expect(s.state.memory).toBe(0);

    // Positive control on the same board: BT19-012 OmniShoutmon prints "This card is also
    // treated as [Shoutmon] for a DigiXros", so the same slot accepts it.
    const omni = s.give(0, Zone.Hand, { card: "BT19-012", as: "treatedAsShoutmon" });
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "playCard",
        instanceId: s.inst("x4").instanceId,
        digiXros: {
          materialInstanceIds: [
            omni.instanceId,
            s.inst("ballistamon").instanceId,
            s.inst("dorulumon").instanceId,
            s.inst("starmons").instanceId,
          ],
          expanderPermanentIds: [],
        },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.cardId === "BT19-010"));
    expect(s.perm("x4").stack.map((card) => card.cardId)).toContain("BT19-012");
    expect(s.state.memory).toBe(0);
  });

  it("saves up to 3 Xros Heart Digimon from its own stack when deleted in battle (Q3067)", async () => {
    // Realistic route: X4 attacks a bigger Digimon and loses the battle, so the
    // would-leave replacement runs off a real deletion, not an injected verb.
    const s = setupEngine(
      {
        0: {
          battleArea: [
            {
              card: "BT19-010",
              as: "x4",
              // 3 Xros Heart Digimon + BT19-009 Growlmon (Dark Dragon) as the near-miss source.
              under: ["BT19-008", "BT19-012", "BT19-009", "BT19-031"],
            },
            { card: "BT19-079", as: "tamer" },
          ],
          deck: ["BT1-009", "BT1-010", "BT1-011"],
        },
        1: {
          battleArea: [{ card: "BT1-014", as: "wall", dp: 12_000, suspended: true }],
          deck: ["BT1-009", "BT1-010", "BT1-011"],
          security: ["BT1-009"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 3;
    await s.ready();
    const xrosIds = ["BT19-008", "BT19-012", "BT19-031"].map(
      (id) => s.perm("x4").stack.find((card) => card.cardId === id)!.instanceId,
    );
    const growlmonId = s.perm("x4").stack.find((card) => card.cardId === "BT19-009")!.instanceId;
    const x4InstanceId = s.perm("x4").topCard!.instanceId;

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("x4").permanentId,
        target: { kind: "permanent", permanentId: s.perm("wall").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("tamer").stack.length === 3);

    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.cardId === "BT19-010")).toBe(false);
    expect(
      s
        .perm("tamer")
        .stack.map((card) => card.instanceId)
        .sort(),
    ).toEqual([...xrosIds].sort());
    // The cap is 3: the Growlmon source and X4 itself go to the trash.
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toEqual(
      expect.arrayContaining([growlmonId, x4InstanceId]),
    );
    expect(s.state.players[1]!.battleArea.map((permanent) => permanent.permanentId)).toEqual([
      s.perm("wall").permanentId,
    ]);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("also triggers before a hand return (Q3067) and may be declined", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT19-010", as: "x4", under: ["BT19-008", "BT19-012"] },
            { card: "BT19-079", as: "tamer" },
          ],
          deck: ["BT1-009", "BT1-010", "BT1-011"],
        },
      },
      { autoDeclineOptional: true },
    );

    await s.ready();
    await advance(s.engine).verb.returnToHand([s.perm("x4").topCard!.instanceId]);

    expect(s.state.players[0]!.hand.map((card) => card.cardId)).toContain("BT19-010");
    expect(s.perm("tamer").stack).toHaveLength(0);
    expect(s.state.players[0]!.trash.map((card) => card.cardId)).toEqual(
      expect.arrayContaining(["BT19-008", "BT19-012"]),
    );
  });

  it("also triggers before a return to the deck (Q3067)", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT19-010", as: "x4", under: ["BT19-008", "BT19-012"] },
            { card: "BT19-079", as: "tamer" },
          ],
          deck: ["BT1-009", "BT1-010", "BT1-011"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );

    await s.ready();
    const savedIds = s.perm("x4").stack.map((card) => card.instanceId);
    await advance(s.engine).verb.returnToDeck([s.perm("x4").topCard!.instanceId], { toTop: true });
    await settle(() => s.perm("tamer").stack.length === 2);

    expect(s.state.players[0]!.deck[0]!.cardId).toBe("BT19-010");
    expect(
      s
        .perm("tamer")
        .stack.map((card) => card.instanceId)
        .sort(),
    ).toEqual([...savedIds].sort());
    expect(s.state.players[0]!.trash).toHaveLength(0);
  });

  it("saves only this Digimon's Xros Heart sources when another stack also qualifies", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT19-009", as: "other", under: ["BT19-012"] },
            { card: "BT19-010", as: "x4", under: ["BT19-008"] },
            { card: "BT19-079", as: "tamer" },
          ],
          deck: ["BT1-009", "BT1-010", "BT1-011"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );

    await s.ready();
    const peerSourceId = s.perm("other").stack[0]!.instanceId;
    await advance(s.engine).verb.deletePermanent([s.perm("x4").permanentId]);
    await settle(() => s.perm("tamer").stack.length === 1);

    expect(s.perm("tamer").stack.map((card) => card.cardId)).toEqual(["BT19-008"]);
    expect(s.perm("other").stack.map((card) => card.instanceId)).toEqual([peerSourceId]);
    expect(s.state.pendingDecision).toBeUndefined();
  });
});
