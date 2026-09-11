import { EffectTiming, getCardDefinition, Phase } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "../index.js";
import { compiled } from "./EX13-019.js";

const CARD_ID = "EX13-019";

/** Fire the [When Attacking] window on a permanent without running a whole combat. */
async function attackWindow(s: ReturnType<typeof setupEngine>, alias: string): Promise<void> {
  await advance(s.engine).fireForPermanent(EffectTiming.OnUseAttack, s.perm(alias), {
    attackerPermanentId: s.perm(alias).permanentId,
  });
}

describe("EX13-019 Veedramon", () => {
  it("matches the catalog identity", () => {
    expect(getCardDefinition(CARD_ID)).toMatchObject({
      cardId: CARD_ID,
      set: "EX13",
      nameEn: "Veedramon",
      colors: ["Blue"],
      kinds: ["Digimon"],
      level: 4,
      playCost: 6,
      dp: 6000,
      forms: ["Champion"],
      attributes: ["Vaccine"],
      types: ["Mythical Dragon", "CS"],
      evoCosts: [{ color: "Blue", level: 3, memoryCost: 2 }],
      rarity: "C",
      maxCountInDeck: 4,
    });
    const effectText = getCardDefinition(CARD_ID)?.effectText ?? "";
    expect(effectText).toContain("[Digivolve] Lv.3 w/[CS] trait: Cost 2");
    expect(effectText).toContain("＜Jamming＞");
    expect(effectText).toContain(
      "[When Attacking] [Once Per Turn] You may play 1 Tamer card with [Veedramon] in its text from your hand with the cost reduced by 2.",
    );
    expect((getCardDefinition(CARD_ID)?.inheritedEffectText ?? "").trim()).toBe("＜Jamming＞");
    expect(getCardDefinition(CARD_ID)?.securityEffectText ?? "").toBe("");
  });

  it("compiles the printed keyword pair, the once-per-turn attack window and the alternate digivolve header", () => {
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
    expect(compiled.effects).toHaveLength(3);

    // Printed ＜Jamming＞: a main copy (this Digimon only) and an inherited copy (passes down).
    expect(compiled.effects[0]).toMatchObject({
      trigger: "Static",
      actions: [],
      keywords: [{ keyword: "Jamming", raw: "＜Jamming＞" }],
    });
    expect(compiled.effects[0]?.isInherited).toBeUndefined();
    expect(compiled.effects[2]).toMatchObject({
      trigger: "Static",
      isInherited: true,
      actions: [],
      keywords: [{ keyword: "Jamming", raw: "＜Jamming＞" }],
    });

    expect(compiled.effects[1]).toMatchObject({
      trigger: "WhenAttacking",
      frequency: "OncePerTurn",
      actions: [
        {
          kind: "PlayWithoutCost",
          from: ["hand"],
          payCost: true,
          reduceCostBy: 2,
          optional: true,
          target: {
            count: 1,
            filter: {
              zone: "hand",
              kind: ["Tamer"],
              nameOrTrait: [{ tokens: ["Veedramon"], match: "text" }],
            },
          },
        },
      ],
    });
    expect(compiled.effects[1]?.isInherited).toBeUndefined();
    // One printed timing owns the single [Once Per Turn], so there is no shared ledger key.
    expect(compiled.effects[1]?.sharedUseKey).toBeUndefined();

    // "w/[CS] trait" is the exact trait reading, and the level is printed.
    expect(compiled.digivolutionRequirement).toEqual([{ level: 3, traits: ["CS"], cost: 2, isAlternate: true }]);
  });

  it("digivolves from a blue Lv.3 on the printed EvoCost for 2, keeping the source in the stack", async () => {
    const s = setupEngine(
      {
        0: {
          // EX13-017 Veemon: Blue, Lv.3, [CS] trait.
          battleArea: [{ card: "EX13-017", as: "base" }],
          hand: [{ card: CARD_ID, as: "veedramon" }],
          deck: ["BT1-009", "BT1-010"],
        },
      },
      { autoDeclineOptional: true, autoSelectCards: true, autoChooseOption: true },
    );
    s.state.memory = 5;
    await s.ready();
    const baseInstanceId = s.perm("base").topCard.instanceId;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("veedramon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard.instanceId === s.inst("veedramon").instanceId);
    await settle(() => s.state.pendingDecision === undefined);

    expect(s.state.memory).toBe(3);
    expect(s.perm("base").stack.map(({ instanceId }) => instanceId)).toEqual([baseInstanceId]);
    expect(s.perm("base").currentDP).toBe(6000);
    // The card left the hand; the single card there is the digivolution bonus draw.
    expect(s.state.players[0]!.hand.map(({ instanceId }) => instanceId)).not.toContain(s.inst("veedramon").instanceId);
    expect(s.state.players[0]!.hand).toHaveLength(1);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("digivolves from a RED Lv.3 with the [CS] trait on the alternate cost-2 route", async () => {
    const s = setupEngine(
      {
        0: {
          // BT22-008 Agumon: Red (so the blue EvoCost cannot reach it), Lv.3, [CS] trait.
          battleArea: [{ card: "BT22-008", as: "base" }],
          hand: [{ card: CARD_ID, as: "veedramon" }],
          deck: ["BT1-009", "BT1-010"],
        },
      },
      { autoDeclineOptional: true, autoSelectCards: true, autoChooseOption: true },
    );
    s.state.memory = 5;
    await s.ready();
    const baseInstanceId = s.perm("base").topCard.instanceId;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("veedramon").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard.instanceId === s.inst("veedramon").instanceId);
    await settle(() => s.state.pendingDecision === undefined);

    expect(s.state.memory).toBe(3);
    expect(s.perm("base").stack.map(({ instanceId }) => instanceId)).toEqual([baseInstanceId]);
    expect(s.perm("base").currentDP).toBe(6000);
    expect(s.state.players[0]!.hand.map(({ instanceId }) => instanceId)).not.toContain(s.inst("veedramon").instanceId);
    expect(s.state.players[0]!.hand).toHaveLength(1);
  });

  it("refuses illegal sources: a red Lv.3 without [CS], and a Lv.4 without [CS]", async () => {
    for (const base of ["BT1-010", "BT1-014"] as const) {
      const s = setupEngine(
        {
          0: {
            battleArea: [{ card: base, as: "base" }],
            hand: [{ card: CARD_ID, as: "veedramon" }],
            deck: ["BT1-009", "BT1-010"],
          },
        },
        { autoDeclineOptional: true, autoSelectCards: true, autoChooseOption: true },
      );
      s.state.memory = 5;
      await s.ready();

      for (const useAlternateCost of [false, true]) {
        const result = s.engine.applyIntent(0, {
          type: "digivolve",
          permanentId: s.perm("base").permanentId,
          instanceId: s.inst("veedramon").instanceId,
          ...(useAlternateCost ? { useAlternateCost: true } : {}),
        });
        expect(result.ok, `${base} alt=${useAlternateCost}`).toBe(false);
      }
      expect(s.state.memory).toBe(5);
      expect(s.perm("base").topCard.cardId).toBe(base);
      expect(s.state.players[0]!.hand.map(({ instanceId }) => instanceId)).toEqual([s.inst("veedramon").instanceId]);
    }
  });

  it("plays a [Veedramon]-text Tamer from hand for 2 less on the [When Attacking] window", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: CARD_ID, as: "veedramon" }],
          hand: [
            // EX13-069 Rina Shinomiya: blue Tamer, printed cost 3, prints [Veedramon].
            { card: "EX13-069", as: "rina" },
            { card: "BT1-010", as: "spare" },
          ],
          deck: ["BT1-009", "BT1-010"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true },
    );
    s.state.memory = 4;
    await s.ready();

    await attackWindow(s, "veedramon");
    await settle(() =>
      s.state.players[0]!.battleArea.some(({ topCard }) => topCard.instanceId === s.inst("rina").instanceId),
    );
    await settle(() => s.state.pendingDecision === undefined);

    // Printed cost 3, reduced by 2: exactly 1 memory is paid.
    expect(s.state.memory).toBe(3);
    expect(s.state.players[0]!.hand.map(({ instanceId }) => instanceId)).toEqual([s.inst("spare").instanceId]);
    const played = s.state.players[0]!.battleArea.find(
      ({ topCard }) => topCard.instanceId === s.inst("rina").instanceId,
    );
    expect(played).toBeDefined();
    expect(played!.stack).toHaveLength(0);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("floors the reduced cost at zero for a printed cost-2 Tamer", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: CARD_ID, as: "veedramon" }],
          hand: [
            // P-012 Tai Kamiya (V-Tamer): blue Tamer, printed cost 2, prints [Veedramon].
            { card: "P-012", as: "tai" },
            { card: "BT1-010", as: "spare" },
          ],
          deck: ["BT1-009", "BT1-010"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true },
    );
    s.state.memory = 2;
    await s.ready();

    await attackWindow(s, "veedramon");
    await settle(() =>
      s.state.players[0]!.battleArea.some(({ topCard }) => topCard.instanceId === s.inst("tai").instanceId),
    );
    await settle(() => s.state.pendingDecision === undefined);

    // 2 - 2 = 0: memory is untouched.
    expect(s.state.memory).toBe(2);
    expect(s.state.players[0]!.hand.map(({ instanceId }) => instanceId)).toEqual([s.inst("spare").instanceId]);
  });

  it("discriminates the [Veedramon] token from the near-miss [Vee] token and from non-Tamer cards", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: CARD_ID, as: "veedramon" }],
          hand: [
            // A Tamer whose text prints "[Vee]" and never "Veedramon": "Vee" is a prefix of
            // "Veedramon", not the other way round, so this must NOT qualify.
            { card: "BT2-086", as: "veeOnlyTamer" },
            // Prints [Veedramon] in its text but is a Digimon, not a Tamer.
            { card: "EX13-017", as: "digimonWithToken" },
            // Tamer AND prints [Veedramon]: the only legal choice.
            { card: "EX13-069", as: "match" },
          ],
          deck: ["BT1-009", "BT1-010"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true },
    );
    s.state.memory = 4;
    await s.ready();

    await attackWindow(s, "veedramon");
    await settle(() => s.state.pendingDecision === undefined);

    expect(s.state.memory).toBe(3);
    expect(s.state.players[0]!.hand.map(({ instanceId }) => instanceId)).toEqual([
      s.inst("veeOnlyTamer").instanceId,
      s.inst("digimonWithToken").instanceId,
    ]);
    expect(
      s.state.players[0]!.battleArea.some(({ topCard }) => topCard.instanceId === s.inst("match").instanceId),
    ).toBe(true);
  });

  it("does nothing when no hand card is a Tamer with [Veedramon] in its text", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: CARD_ID, as: "veedramon" }],
          hand: [
            { card: "BT2-086", as: "veeOnlyTamer" },
            { card: "EX13-017", as: "digimonWithToken" },
          ],
          deck: ["BT1-009", "BT1-010"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true },
    );
    s.state.memory = 5;
    await s.ready();

    await attackWindow(s, "veedramon");
    await settle(() => s.state.pendingDecision === undefined);

    expect(s.state.memory).toBe(5);
    expect(s.state.players[0]!.hand.map(({ instanceId }) => instanceId)).toEqual([
      s.inst("veeOnlyTamer").instanceId,
      s.inst("digimonWithToken").instanceId,
    ]);
    expect(s.state.players[0]!.battleArea).toHaveLength(1);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("declines without paying or playing when the controller says no", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: CARD_ID, as: "veedramon" }],
          hand: [{ card: "EX13-069", as: "rina" }],
          deck: ["BT1-009", "BT1-010"],
        },
      },
      { autoDeclineOptional: true, autoSelectCards: true, autoChooseOption: true },
    );
    s.state.memory = 4;
    await s.ready();

    await attackWindow(s, "veedramon");
    await settle(() => s.state.pendingDecision === undefined);

    expect(s.state.memory).toBe(4);
    expect(s.state.players[0]!.hand.map(({ instanceId }) => instanceId)).toEqual([s.inst("rina").instanceId]);
    expect(s.state.players[0]!.battleArea).toHaveLength(1);
  });

  it("refuses a second activation in the same turn and resets on the controller's next turn", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: CARD_ID, as: "veedramon" }],
          hand: [
            { card: "P-012", as: "first" },
            { card: "P-012", as: "second" },
          ],
          deck: Array(10).fill("BT1-009"),
          security: Array(3).fill("BT1-009"),
        },
        1: { deck: Array(10).fill("BT1-010"), security: Array(3).fill("BT1-010") },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true },
    );
    s.state.memory = 4;
    await s.ready();

    await attackWindow(s, "veedramon");
    await settle(() =>
      s.state.players[0]!.battleArea.some(({ topCard }) => topCard.instanceId === s.inst("first").instanceId),
    );
    await settle(() => s.state.pendingDecision === undefined);
    expect(s.state.players[0]!.hand.map(({ instanceId }) => instanceId)).toEqual([s.inst("second").instanceId]);

    // Same turn, second attack window: the printed [Once Per Turn] refuses it.
    await attackWindow(s, "veedramon");
    await settle(() => s.state.pendingDecision === undefined);
    expect(s.state.players[0]!.hand.map(({ instanceId }) => instanceId)).toEqual([s.inst("second").instanceId]);
    expect(
      s.state.players[0]!.battleArea.some(({ topCard }) => topCard.instanceId === s.inst("second").instanceId),
    ).toBe(false);

    // A real opponent turn passes; the gate reopens on the controller's next turn.
    s.state.turnSeat = 1;
    await advance(s.engine).runTurn(1);

    s.state.turnSeat = 0;
    s.state.memory = 4;
    await attackWindow(s, "veedramon");
    await settle(() =>
      s.state.players[0]!.battleArea.some(({ topCard }) => topCard.instanceId === s.inst("second").instanceId),
    );
    await settle(() => s.state.pendingDecision === undefined);

    expect(s.state.players[0]!.hand.map(({ instanceId }) => instanceId)).toEqual([]);
  });

  it("carries printed ＜Jamming＞ and survives a battle against a stronger Security Digimon", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: CARD_ID, as: "veedramon" }],
          hand: [{ card: "BT1-010", as: "spare" }],
          deck: Array(10).fill("BT1-009"),
          security: Array(3).fill("BT1-009"),
        },
        // BT1-081 HerculesKabuterimon: 10000 DP, well above this card's 6000.
        1: { deck: Array(10).fill("BT1-010"), security: ["BT1-081"] },
      },
      { autoDeclineOptional: true, autoSelectCards: true, autoChooseOption: true },
    );
    s.state.memory = 4;
    await s.ready();
    expect(observe(s.engine).hasKeyword(s.perm("veedramon"), "Jamming")).toBe(true);

    const attackerPermanentId = s.perm("veedramon").permanentId;
    expect(s.engine.applyIntent(0, { type: "attack", attackerPermanentId, target: { kind: "player" } })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[1]!.security.length === 0);
    await settle(() => s.state.pendingDecision === undefined);

    // Jamming: the 10000 DP Security Digimon does not delete it.
    expect(s.state.players[0]!.battleArea.some(({ permanentId }) => permanentId === attackerPermanentId)).toBe(true);
    expect(s.state.players[1]!.battleArea).toHaveLength(0);
  });

  it("is still deleted in a battle against a stronger Digimon in the battle area", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: CARD_ID, as: "veedramon" }],
          hand: [{ card: "BT1-010", as: "spare" }],
          deck: Array(10).fill("BT1-009"),
          security: Array(3).fill("BT1-009"),
        },
        1: {
          battleArea: [{ card: "BT1-081", as: "defender", suspended: true }],
          deck: Array(10).fill("BT1-010"),
          security: Array(3).fill("BT1-010"),
        },
      },
      { autoDeclineOptional: true, autoSelectCards: true, autoChooseOption: true },
    );
    s.state.memory = 4;
    await s.ready();
    const attackerPermanentId = s.perm("veedramon").permanentId;

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId,
        target: { kind: "permanent", permanentId: s.perm("defender").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => !s.state.players[0]!.battleArea.some(({ permanentId }) => permanentId === attackerPermanentId));

    expect(s.state.players[0]!.battleArea.some(({ permanentId }) => permanentId === attackerPermanentId)).toBe(false);
    expect(s.state.players[1]!.battleArea).toHaveLength(1);
  });

  it("passes inherited ＜Jamming＞ down to the Digimon that digivolves on top of it", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT1-014", as: "host", under: [{ card: CARD_ID, as: "veedramon" }] },
            // The same top card with nothing under it: the keyword comes from the stack.
            { card: "BT1-014", as: "bareHost" },
            { card: "BT1-013", as: "bystander" },
          ],
          deck: ["BT1-009", "BT1-010"],
        },
      },
      { autoDeclineOptional: true, autoSelectCards: true, autoChooseOption: true },
    );
    await s.ready();

    expect(s.perm("host").stack.map(({ instanceId }) => instanceId)).toEqual([s.inst("veedramon").instanceId]);
    expect(observe(s.engine).hasKeyword(s.perm("host"), "Jamming")).toBe(true);
    expect(observe(s.engine).hasKeyword(s.perm("bareHost"), "Jamming")).toBe(false);
    expect(observe(s.engine).hasKeyword(s.perm("bystander"), "Jamming")).toBe(false);
  });

  it("does not grant the [When Attacking] window to an unrelated Digimon", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: CARD_ID, as: "veedramon" },
            { card: "BT1-013", as: "bystander" },
          ],
          hand: [{ card: "EX13-069", as: "rina" }],
          deck: ["BT1-009", "BT1-010"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true },
    );
    s.state.memory = 4;
    await s.ready();

    await attackWindow(s, "bystander");
    await settle(() => s.state.pendingDecision === undefined);

    expect(s.state.memory).toBe(4);
    expect(s.state.players[0]!.hand.map(({ instanceId }) => instanceId)).toEqual([s.inst("rina").instanceId]);
    expect(s.state.players[0]!.battleArea).toHaveLength(2);
  });

  it("reaches the battle area and fires the window through a public digivolve-then-attack route", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX13-017", as: "base" }],
          hand: [
            { card: CARD_ID, as: "veedramon" },
            { card: "EX13-069", as: "rina" },
            { card: "BT1-010", as: "spare" },
          ],
          deck: Array(10).fill("BT1-009"),
          security: Array(3).fill("BT1-009"),
        },
        1: {
          battleArea: [{ card: "BT1-009", as: "target", dp: 1000, suspended: true }],
          deck: Array(10).fill("BT1-010"),
          security: Array(3).fill("BT1-010"),
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true },
    );
    s.state.memory = 6;
    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("veedramon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard.instanceId === s.inst("veedramon").instanceId);
    await settle(() => s.state.pendingDecision === undefined);
    expect(s.state.memory).toBe(4);

    expect(s.state.phase).toBe(Phase.Main);
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("base").permanentId,
        target: { kind: "permanent", permanentId: s.perm("target").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => !observe(s.engine).isAttacking());
    await settle(() => s.state.pendingDecision === undefined);

    // 6000 DP beats the 1000 DP defender, and the attack window played Rina for 3 - 2 = 1.
    expect(s.state.players[1]!.battleArea).toHaveLength(0);
    expect(s.state.memory).toBe(3);
    expect(s.perm("base").isSuspended).toBe(true);
    expect(s.state.players[0]!.battleArea.some(({ topCard }) => topCard.instanceId === s.inst("rina").instanceId)).toBe(
      true,
    );
    expect(s.state.players[0]!.hand.map(({ instanceId }) => instanceId)).toContain(s.inst("spare").instanceId);

    expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });
});
