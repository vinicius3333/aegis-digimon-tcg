import { getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { observe } from "../../engine/testkit/observe.js";
import { settle, setupEngine } from "../../engine/testkit/harness.js";
import "../index.js";
import { compiled } from "./BT23-074.js";

const DECK = ["BT1-009", "BT1-010", "BT1-011", "BT1-012", "BT1-013", "BT1-014"];

/** Seat 0 board: Erika Mishima on the field, Eater Legion in hand, Eater Bits to play. */
function erikaRoute(options?: { motherEater?: boolean; autoSelectCards?: boolean }) {
  return setupEngine(
    {
      0: {
        deck: [...DECK],
        battleArea: [{ card: "BT23-084", as: "erika" }],
        ...(options?.motherEater === false ? {} : { breeding: { card: "BT22-007", as: "mother" } }),
        hand: [
          { card: "BT23-074", as: "legion" },
          { card: "BT23-073", as: "bit1" },
          { card: "BT23-073", as: "bit2" },
          { card: "BT23-073", as: "bit3" },
        ],
      },
      1: { deck: [...DECK], security: ["BT1-009", "BT1-010"] },
    },
    { autoAcceptOptional: true, autoSelectCards: options?.autoSelectCards ?? true },
  );
}

describe("BT23-074 Eater Legion", () => {
  it("matches every catalog field and the complete compiled record", () => {
    expect(getCardDefinition("BT23-074")).toMatchObject({
      cardId: "BT23-074",
      nameEn: "Eater Legion",
      colors: ["White"],
      kinds: ["Digimon"],
      playCost: 8,
      dp: 8000,
      evoCosts: [],
      forms: ["Eater"],
      attributes: ["-"],
      types: ["Hudie", "CS"],
    });
    // Printed text, whitespace-normalized: the catalog keeps the card's line breaks.
    expect(getCardDefinition("BT23-074")!.effectText!.replace(/\s+/g, " ").trim()).toBe(
      "[Digivolve] [Erika Mishima]: Cost 3 ＜Alliance＞ ＜Reboot＞ [On Play] [When Digivolving] If you have " +
        "[Mother Eater] in the breeding area, you may play up to 6 play cost's total worth of Digimon cards " +
        "with the [Eater] trait from your hand without paying the costs.",
    );
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
    // Printed "[Digivolve] [Erika Mishima]: Cost 3": a bracketed name is an exact identity,
    // and the base is a Tamer. `names` would be substring matching (cardData.ts name gate).
    expect(compiled.digivolutionRequirement).toEqual([
      { namesExact: ["Erika Mishima"], baseIsTamer: true, cost: 3, isAlternate: true },
    ]);
    expect(compiled.digivolutionRequirement?.[0]).not.toHaveProperty("names");
  });

  it("mirrors the same conditional play clause on both printed windows", () => {
    for (const trigger of ["OnPlay", "WhenDigivolving"] as const) {
      const effect = compiled.effects.find((entry) => entry.trigger === trigger);
      expect(effect).toBeDefined();
      expect(effect!.actions[0]).toMatchObject({
        kind: "PlayMultiple",
        totalCost: 6,
        from: "hand",
        payCost: false,
        optional: true,
        filter: {
          controllerDefault: "mine",
          kind: ["Digimon"],
          nameOrTrait: [{ tokens: ["Eater"], match: "trait" }],
        },
        condition: {
          kind: "youHave",
          filter: {
            controllerDefault: "mine",
            zone: "breeding",
            nameOrTrait: [{ tokens: ["Mother Eater"], match: "name" }],
          },
        },
      });
    }
  });

  it("publicly digivolves from the Erika Mishima Tamer for exactly 3, draws the bonus, and keeps her as a digivolution card", async () => {
    const s = erikaRoute({ motherEater: false });
    await s.ready();
    s.state.memory = 5;
    const legionId = s.inst("legion").instanceId;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("erika").permanentId,
        instanceId: legionId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("erika").topCard.instanceId === legionId);

    expect(s.state.memory).toBe(2);
    expect(s.perm("erika").topCard.cardId).toBe("BT23-074");
    // KB Q6705: the Tamer is now an ordinary digivolution card under the Digimon.
    expect(s.perm("erika").stack.map(({ cardId }) => cardId)).toEqual(["BT23-084"]);
    expect(s.state.players[0]!.battleArea).toHaveLength(1);
    // KB Q6704: a digivolution bonus draw happens on the Tamer route too. Hand loses Eater
    // Legion and gains the drawn deck card; the three Eater Bits are untouched with no
    // Mother Eater in breeding.
    expect(s.state.players[0]!.hand.map(({ cardId }) => cardId).sort()).toEqual([
      "BT1-009",
      "BT23-073",
      "BT23-073",
      "BT23-073",
    ]);
    expect(s.state.players[0]!.deck).toHaveLength(DECK.length - 1);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("plays exactly 6 play cost worth of Eater Digimon on the When Digivolving window", async () => {
    const s = erikaRoute();
    await s.ready();
    s.state.memory = 5;
    const legionId = s.inst("legion").instanceId;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("erika").permanentId,
        instanceId: legionId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.length === 3 && s.state.pendingDecision === undefined);

    // Three cost-3 Eater Bits were offered; the 6-cost budget pays for exactly two.
    const bits = s.state.players[0]!.battleArea.filter((permanent) => permanent.topCard?.cardId === "BT23-073");
    expect(bits).toHaveLength(2);
    expect(s.state.players[0]!.hand.filter(({ cardId }) => cardId === "BT23-073")).toHaveLength(1);
    // The plays are free: only the digivolve cost of 3 left memory.
    expect(s.state.memory).toBe(2);
    expect(s.perm("erika").topCard.cardId).toBe("BT23-074");
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("never plays an Eater card whose play cost alone exceeds the 6 budget", async () => {
    const s = setupEngine(
      {
        0: {
          deck: [...DECK],
          battleArea: [{ card: "BT23-084", as: "erika" }],
          breeding: { card: "BT22-007", as: "mother" },
          hand: [
            { card: "BT23-074", as: "legion" },
            { card: "BT22-082", as: "adam" },
          ],
        },
        1: { deck: [...DECK] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    s.state.memory = 5;
    const adamId = s.inst("adam").instanceId;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("erika").permanentId,
        instanceId: s.inst("legion").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("erika").topCard.cardId === "BT23-074" && s.state.pendingDecision === undefined);

    expect(s.state.players[0]!.hand.some((card) => card.instanceId === adamId)).toBe(true);
    expect(s.state.players[0]!.battleArea).toHaveLength(1);
    expect(s.state.memory).toBe(2);
  });

  it("plays nothing without [Mother Eater] in the breeding area", async () => {
    const s = erikaRoute({ motherEater: false });
    await s.ready();
    s.state.memory = 5;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("erika").permanentId,
        instanceId: s.inst("legion").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("erika").topCard.cardId === "BT23-074" && s.state.pendingDecision === undefined);

    expect(s.state.players[0]!.battleArea).toHaveLength(1);
    expect(s.state.players[0]!.hand.filter(({ cardId }) => cardId === "BT23-073")).toHaveLength(3);
  });

  it("honors the refusal branch: an empty selection plays nothing", async () => {
    const s = erikaRoute({ autoSelectCards: false });
    await s.ready();
    s.state.memory = 5;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("erika").permanentId,
        instanceId: s.inst("legion").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision?.kind === "selectCards");

    const request = s.state.pendingDecision!;
    expect(request.kind).toBe("selectCards");
    // "you MAY play up to 6": all three Eater Bits are offered and an empty answer is legal,
    // which is only true because the selection floor is zero.
    const offered = s.decisions.find(({ req }) => req.decisionId === request.decisionId)!.req;
    expect(offered.options?.min).toBe(0);
    expect(offered.options?.candidateInstanceIds).toHaveLength(3);
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: request.decisionId,
        response: { kind: "selectCards", instanceIds: [] },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision === undefined);

    expect(s.state.players[0]!.battleArea).toHaveLength(1);
    expect(s.state.players[0]!.hand.filter(({ cardId }) => cardId === "BT23-073")).toHaveLength(3);
    expect(s.state.memory).toBe(2);
  });

  it("plays the same clause when Eater Legion is played from the hand for its own cost", async () => {
    const s = setupEngine(
      {
        0: {
          deck: [...DECK],
          breeding: { card: "BT22-007", as: "mother" },
          hand: [
            { card: "BT23-074", as: "legion" },
            { card: "BT23-073", as: "bit1" },
            { card: "BT23-073", as: "bit2" },
          ],
        },
        1: { deck: [...DECK] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    s.state.memory = 8;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("legion").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.battleArea.length === 3 && s.state.pendingDecision === undefined);

    expect(s.state.memory).toBe(0);
    expect(s.state.players[0]!.battleArea.filter((p) => p.topCard?.cardId === "BT23-073")).toHaveLength(2);
    expect(s.state.players[0]!.hand).toHaveLength(0);
  });

  it("rejects every base other than the exact Erika Mishima Tamer", async () => {
    // BT23-074 prints no EvoCost, so the Erika route is the only legal source.
    for (const base of ["BT23-073", "BT23-101", "BT23-083"] as const) {
      const bad = setupEngine({
        0: {
          deck: [...DECK],
          battleArea: [{ card: base, as: "base" }],
          hand: [{ card: "BT23-074", as: "legion" }],
        },
        1: { deck: [...DECK] },
      });
      await bad.ready();
      bad.state.memory = 5;
      expect(
        bad.engine.applyIntent(0, {
          type: "digivolve",
          permanentId: bad.perm("base").permanentId,
          instanceId: bad.inst("legion").instanceId,
          useAlternateCost: true,
        }),
      ).toEqual({ ok: false, reason: "invalid-evolution" });
      expect(bad.state.players[0]!.hand.map(({ instanceId }) => instanceId)).toContain(bad.inst("legion").instanceId);
      expect(bad.state.memory).toBe(5);
    }
  });

  it("can't attack on the turn it digivolves from a freshly played Tamer (KB Q5351)", async () => {
    const s = setupEngine(
      {
        0: {
          deck: [...DECK],
          hand: [
            { card: "BT23-084", as: "erika" },
            { card: "BT23-074", as: "legion" },
          ],
        },
        1: { deck: [...DECK], security: ["BT1-009", "BT1-010"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    s.state.memory = 9;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("erika").instanceId })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some((p) => p.topCard?.cardId === "BT23-084"));
    const erika = s.state.players[0]!.battleArea.find((p) => p.topCard?.cardId === "BT23-084")!;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: erika.permanentId,
        instanceId: s.inst("legion").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: true });
    await settle(() => erika.topCard.cardId === "BT23-074");

    // The Digimon inherits the Tamer's entry turn, so it is still summoning sick (KB Q5351).
    // `illegal-target` is the engine's surfaced code for the §16-1 refusal (combat/legality.ts).
    expect(erika.summoningSick).toBe(true);
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: erika.permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: false, reason: "illegal-target" });
    expect(s.state.players[1]!.security).toHaveLength(2);
  });

  it("keeps ＜Alliance＞ and ＜Reboot＞ live on the field", async () => {
    expect(
      compiled.effects
        .filter((entry) => entry.trigger === "Static")
        .flatMap((entry) => (entry.keywords ?? []).map((keyword) => keyword.keyword)),
    ).toEqual(["Alliance", "Reboot"]);

    const s = setupEngine({ 0: { deck: [...DECK], battleArea: [{ card: "BT23-074", as: "legion" }] } });
    await s.ready();
    expect(observe(s.engine).hasKeyword(s.perm("legion"), "Alliance")).toBe(true);
    expect(observe(s.engine).hasKeyword(s.perm("legion"), "Reboot")).toBe(true);
  });
});
