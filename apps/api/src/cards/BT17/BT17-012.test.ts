import { getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { matchingAlternateDigivolutionRequirement } from "../../engine/cards/cardData.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "./index.js";
import { compiled } from "./BT17-012.js";

const PRINTED_EFFECT =
  "[Digivolve][Takuya Kanbara]: Cost 2 [Digivolve][Agunimon]: Cost 1 \n\nYou may digivolve this card from your hand onto one of your red Tamers as if that card is a level 3 red Digimon.\n＜Raid＞ \n[When Attacking] This Digimon may digivolve into a Digimon card with the [Hybrid]\u00a0trait in the hand with the digivolution cost reduced by 1.";

describe("BT17-012 BurningGreymon", () => {
  it("matches the catalog and carries the printed IR contract", () => {
    expect(getCardDefinition("BT17-012")).toMatchObject({
      cardId: "BT17-012",
      nameEn: "BurningGreymon",
      colors: ["Red", "Purple"],
      kinds: ["Digimon"],
      level: 4,
      playCost: 6,
      dp: 6000,
      forms: ["Hybrid"],
      types: ["Dark Dragon"],
      effectText: PRINTED_EFFECT,
      inheritedEffectText: "[Your Turn] This Digimon gets +2000 DP.",
    });
    // Printed "[Digivolve][X]: Cost N" carries no "in name", so the route is exact-name gated.
    expect(compiled.digivolutionRequirement).toEqual([
      { namesExact: ["Takuya Kanbara"], cost: 2, isAlternate: true, baseIsTamer: true },
      { namesExact: ["Agunimon"], cost: 1, isAlternate: true },
    ]);
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
    expect(compiled.effects?.[0]).toMatchObject({
      trigger: "Static",
      actions: [
        {
          kind: "Digivolve",
          asLevel: 3,
          from: ["hand"],
          payCost: true,
          onto: { filter: { controller: "mine", kind: ["Tamer"], colors: ["Red"] } },
        },
      ],
    });
    expect(compiled.effects?.[1]).toMatchObject({ trigger: "Static", keywords: [{ keyword: "Raid" }] });
    expect(compiled.effects?.[2]).toMatchObject({
      trigger: "WhenAttacking",
      actions: [
        {
          kind: "Digivolve",
          from: ["hand"],
          payCost: true,
          reduceCost: 1,
          optional: true,
          into: { nameOrTrait: [{ tokens: ["Hybrid"], match: "trait" }] },
        },
      ],
    });
    expect(compiled.effects?.[3]).toMatchObject({
      trigger: "YourTurn",
      isInherited: true,
      actions: [{ kind: "ModifyDP", amount: 2000, duration: "permanent" }],
    });
  });

  it("gates the named routes on the exact base name", () => {
    // [Takuya Kanbara] route: Tamer base only, cost 2.
    expect(matchingAlternateDigivolutionRequirement("BT17-012", "BT12-088")).toMatchObject({
      cost: 2,
      baseIsTamer: true,
    });
    // BT18-088 is printed "[Rule] Name: Also treated as [Takuya Kanbara]", so the exact gate
    // still accepts it through its effective name.
    expect(matchingAlternateDigivolutionRequirement("BT17-012", "BT18-088")).toMatchObject({ cost: 2 });
    // [Agunimon] route: Lv4 Digimon base, cost 1.
    expect(matchingAlternateDigivolutionRequirement("BT17-012", "BT17-011")).toMatchObject({ cost: 1 });
    // A red Lv4 Digimon that is not Agunimon has no alternate route at all.
    expect(matchingAlternateDigivolutionRequirement("BT17-012", "BT1-014")).toBeUndefined();
  });

  it("digivolves from hand onto a [Takuya Kanbara] Tamer for 2, drawing the bonus card", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT12-088", as: "takuya" }],
        hand: [{ card: "BT17-012", as: "burning" }],
        deck: [{ card: "BT1-009", as: "bonus" }, "BT1-010"],
      },
    });
    s.state.memory = 5;
    await s.ready();
    const takuyaId = s.inst("takuya").instanceId;
    const burningId = s.inst("burning").instanceId;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("takuya").permanentId,
        instanceId: burningId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("takuya").topCard?.instanceId === burningId);

    // Cost 2 from the named route, not 3 from the generic "onto a red Tamer" path.
    expect(s.state.memory).toBe(3);
    // Q2736: the Tamer becomes a digivolution card under the new top card.
    expect(s.perm("takuya").stack.map((card) => card.instanceId)).toEqual([takuyaId]);
    expect(s.perm("takuya").topCard?.cardId).toBe("BT17-012");
    // Q2734: a digivolution bonus draw happens even when the base is a Tamer.
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toEqual([s.inst("bonus").instanceId]);
    expect(s.state.players[0]!.deck).toHaveLength(1);
  });

  it("digivolves onto an unnamed red Tamer for the level-3 cost of 3", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT1-085", as: "tai" }],
        hand: [{ card: "BT17-012", as: "burning" }],
        deck: ["BT1-009", "BT1-010"],
      },
    });
    s.state.memory = 5;
    await s.ready();
    const taiId = s.inst("tai").instanceId;
    const burningId = s.inst("burning").instanceId;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("tai").permanentId,
        instanceId: burningId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("tai").topCard?.instanceId === burningId);

    expect(s.state.memory).toBe(2);
    expect(s.perm("tai").stack.map((card) => card.instanceId)).toEqual([taiId]);
  });

  it("refuses a Tamer that is not red and leaves the board untouched", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "ST3-12", as: "tk" }],
        hand: [{ card: "BT17-012", as: "burning" }],
        deck: ["BT1-009"],
      },
    });
    s.state.memory = 5;
    await s.ready();
    const tkId = s.inst("tk").instanceId;
    const burningId = s.inst("burning").instanceId;

    for (const useAlternateCost of [true, false]) {
      expect(
        s.engine.applyIntent(0, {
          type: "digivolve",
          permanentId: s.perm("tk").permanentId,
          instanceId: burningId,
          useAlternateCost,
        }),
      ).not.toEqual({ ok: true });
    }

    expect(s.perm("tk").topCard?.instanceId).toBe(tkId);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toEqual([burningId]);
    expect(s.state.memory).toBe(5);
  });

  it("digivolves from hand onto [Agunimon] for 1 but refuses a same-level red Digimon with another name", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "BT17-011", as: "agunimon" },
          { card: "BT1-014", as: "kokatorimon" },
        ],
        hand: [{ card: "BT17-012", as: "burning" }],
        deck: ["BT1-009", "BT1-010"],
      },
    });
    s.state.memory = 5;
    await s.ready();
    const agunimonId = s.inst("agunimon").instanceId;
    const kokatorimonId = s.inst("kokatorimon").instanceId;
    const burningId = s.inst("burning").instanceId;

    for (const useAlternateCost of [true, false]) {
      expect(
        s.engine.applyIntent(0, {
          type: "digivolve",
          permanentId: s.perm("kokatorimon").permanentId,
          instanceId: burningId,
          useAlternateCost,
        }),
      ).not.toEqual({ ok: true });
    }
    expect(s.perm("kokatorimon").topCard?.instanceId).toBe(kokatorimonId);
    expect(s.state.memory).toBe(5);

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("agunimon").permanentId,
        instanceId: burningId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("agunimon").topCard?.instanceId === burningId);

    expect(s.state.memory).toBe(4);
    expect(s.perm("agunimon").stack.map((card) => card.instanceId)).toEqual([agunimonId]);
    expect(s.state.players[0]!.hand).toHaveLength(1);
  });

  it("cannot attack on the turn its Tamer base was placed (Q2735)", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT12-088", as: "takuya", enteredThisTurn: true }],
        hand: [{ card: "BT17-012", as: "burning" }],
        deck: ["BT1-009", "BT1-010"],
      },
      1: { security: ["BT1-009"] },
    });
    s.state.memory = 5;
    await s.ready();
    const burningId = s.inst("burning").instanceId;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("takuya").permanentId,
        instanceId: burningId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("takuya").topCard?.instanceId === burningId);

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("takuya").permanentId,
        target: { kind: "player" },
      }),
    ).not.toEqual({ ok: true });
    expect(s.state.players[1]!.security).toHaveLength(1);
  });

  it("digivolves from an attack into a legal Hybrid for one less memory", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT17-012", as: "burning" }],
          hand: [{ card: "BT17-014", as: "aldamon" }, "BT1-009"],
          deck: [{ card: "BT1-010", as: "bonus" }, "BT1-011"],
        },
        1: { security: ["BT1-009"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 5;
    await s.ready();
    const burningPermanentId = s.perm("burning").permanentId;
    const burningId = s.inst("burning").instanceId;

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: burningPermanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("burning").topCard?.cardId === "BT17-014" && !observe(s.engine).isAttacking());

    // Printed digivolution cost 4, reduced by 1 => 3.
    expect(s.state.memory).toBe(2);
    expect(s.perm("burning").stack.map((card) => card.instanceId)).toEqual([burningId]);
    // Bonus draw for the effect-driven digivolution, plus the untouched spare card.
    expect(s.state.players[0]!.hand.map((card) => card.cardId).sort()).toEqual(["BT1-009", "BT1-010"]);
    expect(s.state.players[1]!.security).toHaveLength(0);
  });

  it("cannot use the attack digivolution on a Hybrid whose requirements are unmet (Q2737)", async () => {
    const s = setupEngine(
      {
        0: {
          // BT12-017 EmperorGreymon is [Hybrid] but needs a red Lv5 base; BurningGreymon is Lv4.
          battleArea: [{ card: "BT17-012", as: "burning" }],
          hand: [{ card: "BT12-017", as: "emperor" }, "BT1-009"],
          deck: ["BT1-010", "BT1-011"],
        },
        1: { security: ["BT1-009"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 5;
    await s.ready();
    const emperorId = s.inst("emperor").instanceId;

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("burning").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.security.length === 0 && !observe(s.engine).isAttacking());

    expect(s.perm("burning").topCard?.cardId).toBe("BT17-012");
    expect(s.perm("burning").stack).toHaveLength(0);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toContain(emperorId);
    expect(s.state.memory).toBe(5);
  });

  it("cannot use the attack digivolution on a non-Hybrid card in hand", async () => {
    const s = setupEngine(
      {
        0: {
          // BT17-013 WarGrowlmon is a legal red Lv5 successor but has the [Ultimate] form.
          battleArea: [{ card: "BT17-012", as: "burning" }],
          hand: [{ card: "BT17-013", as: "warGrowlmon" }, "BT1-009"],
          deck: ["BT1-010", "BT1-011"],
        },
        1: { security: ["BT1-009"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 5;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("burning").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.security.length === 0 && !observe(s.engine).isAttacking());

    expect(s.perm("burning").topCard?.cardId).toBe("BT17-012");
    expect(s.state.memory).toBe(5);
  });

  it("publishes Raid through the shared keyword runtime (Q2738 ordering)", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT17-012", as: "burning" }] } });
    await s.ready();
    expect(observe(s.engine).hasKeyword(s.perm("burning"), "Raid")).toBe(true);
  });

  it("grants its inherited +2000 DP only on its controller's turn, and only to its own carrier", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "BT17-013", as: "carrier", under: ["BT17-012"] },
          { card: "BT17-013", as: "peer" },
        ],
        deck: ["BT1-009", "BT1-010", "BT1-011"],
        hand: ["BT1-009"],
      },
      1: { deck: ["BT1-009", "BT1-010"], hand: ["BT1-009"] },
    });
    await s.ready();
    expect(s.perm("carrier").currentDP).toBe(9000);
    expect(s.perm("peer").currentDP).toBe(7000);

    s.state.turnSeat = 1;
    await s.ready();
    expect(s.perm("carrier").currentDP).toBe(7000);
    expect(s.perm("peer").currentDP).toBe(7000);
  });

  it("gains a Tamer digivolution card's inherited effect but not its security effect (Q6556/Q6557)", async () => {
    // BT17-079 is a red [Takuya Kanbara] Tamer registered by this set's index; its inherited
    // "[Your Turn] +2000 DP" and its "[Security] Play without paying the cost" exercise the same
    // Tamer-under-Digimon question the Q&A pair asks.
    const s = setupEngine({
      0: { battleArea: [{ card: "BT17-012", as: "burning", under: ["BT17-079"] }] },
    });
    await s.ready();

    // Q6557: the Tamer's inherited +2000 DP stacks on the printed 6000, only during your turn.
    expect(s.perm("burning").currentDP).toBe(8000);
    s.state.turnSeat = 1;
    await s.ready();
    expect(s.perm("burning").currentDP).toBe(6000);
    s.state.turnSeat = 0;
    await s.ready();

    // Q6556: the Tamer's "[Security] Play this card without paying the cost" is a security
    // effect of the digivolution card and is never granted to the Digimon. It is only ever
    // checked while that card sits in the security stack, so the board carries no affordance
    // for it: nothing was played, and the hand stays empty.
    expect(getCardDefinition("BT17-079")?.securityEffectText).toBeUndefined();
    expect(getCardDefinition("BT17-079")?.effectText).toContain("[Security] Play this card without paying the cost.");
    expect(s.state.players[0]!.hand).toHaveLength(0);
  });
});
