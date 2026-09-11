import { EffectTiming, getCardDefinition, Phase } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "../index.js";
import { compiled } from "./EX13-012.js";

const CARD_ID = "EX13-012";

/** Fire the [When Attacking] window on a permanent without running a whole combat. */
async function attackWindow(s: ReturnType<typeof setupEngine>, alias: string): Promise<void> {
  await advance(s.engine).fireForPermanent(EffectTiming.OnUseAttack, s.perm(alias), {
    attackerPermanentId: s.perm(alias).permanentId,
  });
}

describe("EX13-012 SaviorHuckmon", () => {
  it("matches the catalog identity", () => {
    expect(getCardDefinition(CARD_ID)).toMatchObject({
      cardId: CARD_ID,
      nameEn: "SaviorHuckmon",
      colors: ["Red", "White"],
      kinds: ["Digimon"],
      level: 5,
      playCost: 7,
      dp: 7000,
      forms: ["Ultimate"],
      attributes: ["Data"],
      types: ["Dragonkin"],
      evoCosts: [{ color: "Red", level: 4, memoryCost: 3 }],
    });
    expect(getCardDefinition(CARD_ID)?.effectText ?? "").toContain("[Digivolve] Lv.4 w/[Huckmon] in text: Cost 3");
    expect(getCardDefinition(CARD_ID)?.effectText ?? "").toContain("＜Alliance＞");
    expect(getCardDefinition(CARD_ID)?.effectText ?? "").toContain(
      "[When Digivolving] [When Attacking] [Once Per Turn] You may play or use 1 white card with [Huckmon] in its text from your hand with the cost reduced by 3.",
    );
    expect((getCardDefinition(CARD_ID)?.inheritedEffectText ?? "").trim()).toBe("＜Alliance＞");
    expect(getCardDefinition(CARD_ID)?.securityEffectText ?? "").toBe("");
  });

  it("compiles the printed keyword, the shared once-per-turn windows and the alternate digivolve header", () => {
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
    expect(compiled.effects).toHaveLength(4);

    expect(compiled.effects[0]).toMatchObject({
      trigger: "Static",
      actions: [],
      keywords: [{ keyword: "Alliance" }],
    });
    expect(compiled.effects[0]?.isInherited).toBeUndefined();
    expect(compiled.effects[3]).toMatchObject({
      trigger: "Static",
      isInherited: true,
      actions: [],
      keywords: [{ keyword: "Alliance" }],
    });

    const body = {
      kind: "Modal",
      choose: 1,
      options: [
        [
          {
            kind: "PlayWithoutCost",
            from: ["hand"],
            payCost: true,
            reduceCostBy: 3,
            optional: true,
            target: {
              count: 1,
              filter: {
                zone: "hand",
                kind: ["Digimon", "Tamer"],
                colors: ["White"],
                nameOrTrait: [{ tokens: ["Huckmon"], match: "text" }],
              },
            },
          },
        ],
        [
          {
            kind: "UseOptionWithoutCost",
            from: ["hand"],
            payCost: true,
            reduceCostBy: 3,
            optional: true,
            filter: {
              zone: "hand",
              kind: ["Option"],
              colors: ["White"],
              nameOrTrait: [{ tokens: ["Huckmon"], match: "text" }],
            },
          },
        ],
      ],
    };
    expect(compiled.effects[1]).toMatchObject({
      trigger: "WhenDigivolving",
      frequency: "OncePerTurn",
      sharedUseKey: "ir-shared-0",
      actions: [body],
    });
    expect(compiled.effects[2]).toMatchObject({
      trigger: "WhenAttacking",
      frequency: "OncePerTurn",
      sharedUseKey: "ir-shared-0",
      actions: [body],
    });
    // One printed [Once Per Turn] governs both timings, so both windows share one ledger key.
    expect(compiled.effects[1]?.sharedUseKey).toBe(compiled.effects[2]?.sharedUseKey);

    expect(compiled.digivolutionRequirement).toEqual([{ level: 4, texts: ["Huckmon"], cost: 3, isAlternate: true }]);
  });

  it("digivolves from a red Lv.4 on the printed EvoCost for 3, keeping the source in the stack", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT1-014", as: "base" }],
          hand: [{ card: CARD_ID, as: "savior" }],
          deck: ["BT1-009", "BT1-010"],
        },
      },
      { autoDeclineOptional: true, autoSelectCards: true, autoChooseOption: true },
    );
    s.state.memory = 6;
    await s.ready();
    const baseInstanceId = s.perm("base").topCard.instanceId;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("savior").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard.instanceId === s.inst("savior").instanceId);
    await settle(() => s.state.pendingDecision === undefined);

    expect(s.state.memory).toBe(3);
    expect(s.perm("base").stack.map(({ instanceId }) => instanceId)).toEqual([baseInstanceId]);
    expect(s.perm("base").currentDP).toBe(7000);
    // The card left the hand; the single card there is the digivolution bonus draw.
    expect(s.state.players[0]!.hand.map(({ instanceId }) => instanceId)).not.toContain(s.inst("savior").instanceId);
    expect(s.state.players[0]!.hand).toHaveLength(1);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("digivolves from a WHITE Lv.4 with [Huckmon] in text on the alternate cost-3 route", async () => {
    const s = setupEngine(
      {
        0: {
          // BT10-085 Sistermon Ciel: White, Lv.4, and its printed text carries [Huckmon].
          battleArea: [{ card: "BT10-085", as: "base" }],
          hand: [{ card: CARD_ID, as: "savior" }],
          deck: ["BT1-009", "BT1-010"],
        },
      },
      { autoDeclineOptional: true, autoSelectCards: true, autoChooseOption: true },
    );
    s.state.memory = 6;
    await s.ready();
    const baseInstanceId = s.perm("base").topCard.instanceId;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("savior").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard.instanceId === s.inst("savior").instanceId);
    await settle(() => s.state.pendingDecision === undefined);

    expect(s.state.memory).toBe(3);
    expect(s.perm("base").stack.map(({ instanceId }) => instanceId)).toEqual([baseInstanceId]);
    expect(s.state.players[0]!.hand.map(({ instanceId }) => instanceId)).not.toContain(s.inst("savior").instanceId);
    expect(s.state.players[0]!.hand).toHaveLength(1);
  });

  it("refuses illegal sources: wrong color without the token, and the right token at the wrong level", async () => {
    for (const base of ["BT1-037", "EX13-009"] as const) {
      const s = setupEngine(
        {
          0: {
            battleArea: [{ card: base, as: "base" }],
            hand: [{ card: CARD_ID, as: "savior" }],
            deck: ["BT1-009", "BT1-010"],
          },
        },
        { autoDeclineOptional: true, autoSelectCards: true, autoChooseOption: true },
      );
      s.state.memory = 6;
      await s.ready();

      for (const useAlternateCost of [false, true]) {
        const result = s.engine.applyIntent(0, {
          type: "digivolve",
          permanentId: s.perm("base").permanentId,
          instanceId: s.inst("savior").instanceId,
          ...(useAlternateCost ? { useAlternateCost: true } : {}),
        });
        expect(result.ok, `${base} alt=${useAlternateCost}`).toBe(false);
      }
      expect(s.state.memory).toBe(6);
      expect(s.perm("base").topCard.cardId).toBe(base);
      expect(s.state.players[0]!.hand.map(({ instanceId }) => instanceId)).toEqual([s.inst("savior").instanceId]);
    }
  });

  it("plays a white [Huckmon]-text Digimon from hand for 3 less on the [When Digivolving] window", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT1-014", as: "base" }],
          hand: [
            { card: CARD_ID, as: "savior" },
            // ST12-13 Sistermon Ciel: white, printed cost 4, [Huckmon] in its text.
            { card: "ST12-13", as: "ciel" },
            { card: "BT1-010", as: "spare" },
          ],
          deck: ["BT1-009", "BT1-010"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true },
    );
    s.state.memory = 5;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("savior").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() =>
      s.state.players[0]!.battleArea.some(({ topCard }) => topCard.instanceId === s.inst("ciel").instanceId),
    );
    await settle(() => s.state.pendingDecision === undefined);

    // 5 memory - 3 (digivolve) - (4 - 3) for Sistermon Ciel = 1.
    expect(s.state.memory).toBe(1);
    // Spare untouched plus the digivolution bonus draw; Sistermon Ciel left the hand.
    const handIds = s.state.players[0]!.hand.map(({ instanceId }) => instanceId);
    expect(handIds).toContain(s.inst("spare").instanceId);
    expect(handIds).not.toContain(s.inst("ciel").instanceId);
    expect(handIds).toHaveLength(2);
    const played = s.state.players[0]!.battleArea.find(
      ({ topCard }) => topCard.instanceId === s.inst("ciel").instanceId,
    );
    expect(played).toBeDefined();
    expect(played!.stack).toHaveLength(0);
  });

  it("plays the same card for 3 less on the [When Attacking] window", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: CARD_ID, as: "savior" }],
          hand: [
            { card: "ST12-13", as: "ciel" },
            { card: "BT1-010", as: "spare" },
          ],
          deck: ["BT1-009", "BT1-010"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true },
    );
    s.state.memory = 4;
    await s.ready();

    await attackWindow(s, "savior");
    await settle(() =>
      s.state.players[0]!.battleArea.some(({ topCard }) => topCard.instanceId === s.inst("ciel").instanceId),
    );
    await settle(() => s.state.pendingDecision === undefined);

    expect(s.state.memory).toBe(3);
    expect(s.state.players[0]!.hand.map(({ instanceId }) => instanceId)).toEqual([s.inst("spare").instanceId]);
  });

  it("uses a white [Huckmon]-text Option for 3 less when the play branch has no candidate", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: CARD_ID, as: "savior" }],
          hand: [
            // BT23-099 The Sistermon Sisters Training Gym: white Option, cost 2, [Huckmon] in text.
            { card: "BT23-099", as: "option" },
            { card: "BT1-010", as: "spare" },
          ],
          deck: ["BT1-009", "BT1-010", "BT1-011", "BT1-012"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true },
    );
    s.state.memory = 2;
    await s.ready();

    await attackWindow(s, "savior");
    await settle(() =>
      s.state.players[0]!.battleArea.some(({ topCard }) => topCard.instanceId === s.inst("option").instanceId),
    );
    await settle(() => s.state.pendingDecision === undefined);

    // Printed use cost 2, reduced by 3, floors at 0: memory is untouched.
    expect(s.state.memory).toBe(2);
    const handIds = s.state.players[0]!.hand.map(({ instanceId }) => instanceId);
    expect(handIds).toContain(s.inst("spare").instanceId);
    expect(handIds).not.toContain(s.inst("option").instanceId);
    // The Option resolved its own [Main] body: ＜Draw 1＞, then place itself in the battle area.
    expect(handIds).toHaveLength(2);
    expect(s.state.players[0]!.battleArea.map(({ topCard }) => topCard.instanceId)).toEqual([
      s.perm("savior").topCard.instanceId,
      s.inst("option").instanceId,
    ]);
    expect(s.state.players[0]!.trash).toHaveLength(0);
  });

  it("discriminates white [Huckmon]-text cards from white non-[Huckmon] and red [Huckmon] hand cards", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: CARD_ID, as: "savior" }],
          hand: [
            // White but prints no [Huckmon] token.
            { card: "BT16-082", as: "whiteNoToken" },
            // Prints [Huckmon] (it IS Huckmon) but is red only.
            { card: "BT13-009", as: "redToken" },
            // White AND prints [Huckmon]: the only legal choice.
            { card: "ST12-13", as: "match" },
          ],
          deck: ["BT1-009", "BT1-010"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true },
    );
    s.state.memory = 4;
    await s.ready();

    await attackWindow(s, "savior");
    await settle(() => s.state.pendingDecision === undefined);

    expect(s.state.memory).toBe(3);
    expect(s.state.players[0]!.hand.map(({ instanceId }) => instanceId)).toEqual([
      s.inst("whiteNoToken").instanceId,
      s.inst("redToken").instanceId,
    ]);
    expect(
      s.state.players[0]!.battleArea.some(({ topCard }) => topCard.instanceId === s.inst("match").instanceId),
    ).toBe(true);
  });

  it("does nothing when no hand card satisfies both the color and the token", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: CARD_ID, as: "savior" }],
          hand: [
            { card: "BT16-082", as: "whiteNoToken" },
            { card: "BT13-009", as: "redToken" },
          ],
          deck: ["BT1-009", "BT1-010"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true },
    );
    s.state.memory = 5;
    await s.ready();

    await attackWindow(s, "savior");
    await settle(() => s.state.pendingDecision === undefined);

    expect(s.state.memory).toBe(5);
    expect(s.state.players[0]!.hand.map(({ instanceId }) => instanceId)).toEqual([
      s.inst("whiteNoToken").instanceId,
      s.inst("redToken").instanceId,
    ]);
    expect(s.state.players[0]!.battleArea).toHaveLength(1);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("declines without paying or playing when the controller says no", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: CARD_ID, as: "savior" }],
          hand: [{ card: "ST12-13", as: "ciel" }],
          deck: ["BT1-009", "BT1-010"],
        },
      },
      { autoDeclineOptional: true, autoSelectCards: true, autoChooseOption: true },
    );
    s.state.memory = 4;
    await s.ready();

    await attackWindow(s, "savior");
    await settle(() => s.state.pendingDecision === undefined);

    expect(s.state.memory).toBe(4);
    expect(s.state.players[0]!.hand.map(({ instanceId }) => instanceId)).toEqual([s.inst("ciel").instanceId]);
    expect(s.state.players[0]!.battleArea).toHaveLength(1);
  });

  it("spends one shared once-per-turn use across both timings and resets on the next own turn", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT1-014", as: "base" }],
          hand: [
            { card: CARD_ID, as: "savior" },
            { card: "ST12-13", as: "first" },
            { card: "ST12-13", as: "second" },
          ],
          deck: ["BT1-009", "BT1-010", "BT1-011"],
          security: ["BT1-009"],
        },
        1: { deck: ["BT1-009", "BT1-010", "BT1-011"], security: ["BT1-009"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true },
    );
    s.state.memory = 5;
    await s.ready();

    // [When Digivolving] spends the shared use.
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("savior").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() =>
      s.state.players[0]!.battleArea.some(({ topCard }) => topCard.instanceId === s.inst("first").instanceId),
    );
    await settle(() => s.state.pendingDecision === undefined);
    expect(s.state.memory).toBe(1);
    const afterDigivolve = s.state.players[0]!.hand.map(({ instanceId }) => instanceId);
    expect(afterDigivolve).toContain(s.inst("second").instanceId);
    expect(afterDigivolve).not.toContain(s.inst("first").instanceId);

    // Same turn, the [When Attacking] window: the SHARED gate refuses it.
    s.state.memory = 4;
    await attackWindow(s, "base");
    await settle(() => s.state.pendingDecision === undefined);
    expect(s.state.memory).toBe(4);
    expect(s.state.players[0]!.hand.map(({ instanceId }) => instanceId)).toEqual(afterDigivolve);

    // A real opponent turn passes; the gate reopens on the controller's next turn.
    s.state.turnSeat = 1;
    s.state.memory = 3;
    await advance(s.engine).runTurn(1);

    s.state.turnSeat = 0;
    s.state.memory = 4;
    await attackWindow(s, "base");
    await settle(() => s.state.pendingDecision === undefined);

    expect(s.state.memory).toBe(3);
    expect(s.state.players[0]!.hand.map(({ instanceId }) => instanceId)).not.toContain(s.inst("second").instanceId);
    expect(
      s.state.players[0]!.battleArea.some(({ topCard }) => topCard.instanceId === s.inst("second").instanceId),
    ).toBe(true);
  });

  it("carries printed ＜Alliance＞ and spends an ally's suspension for a second security check", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: CARD_ID, as: "savior" },
            { card: "BT1-013", as: "ally" },
          ],
          deck: Array(10).fill("BT1-009"),
          security: Array(5).fill("BT1-009"),
        },
        1: { deck: Array(10).fill("BT1-010"), security: Array(5).fill("BT1-010") },
      },
      { autoDeclineOptional: true, autoSelectCards: true, autoChooseOption: true },
    );
    s.state.memory = 6;
    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    expect(observe(s.engine).hasKeyword(s.perm("savior"), "Alliance")).toBe(true);

    const combat = (s.engine as unknown as { combat: { hasOpenAllianceDecision: boolean } }).combat;
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("savior").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => combat.hasOpenAllianceDecision);
    expect(s.engine.applyIntent(0, { type: "respondAlliance", allyPermanentId: s.perm("ally").permanentId })).toEqual({
      ok: true,
    });
    await settle(() => !observe(s.engine).isAttacking());

    // Alliance suspends the ally and adds one security check on top of the base one.
    expect(s.perm("ally").isSuspended).toBe(true);
    expect(s.perm("savior").isSuspended).toBe(true);
    expect(s.state.players[1]!.security).toHaveLength(3);

    expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  it("passes ＜Alliance＞ down to the Digimon that digivolves on top of it", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT1-014", as: "host", under: [{ card: CARD_ID, as: "savior" }] },
            // The same card with nothing under it: the keyword comes from the stack, not BT1-014.
            { card: "BT1-014", as: "bareHost" },
          ],
          deck: ["BT1-009", "BT1-010"],
        },
      },
      { autoDeclineOptional: true, autoSelectCards: true, autoChooseOption: true },
    );
    await s.ready();

    expect(s.perm("host").stack.map(({ instanceId }) => instanceId)).toEqual([s.inst("savior").instanceId]);
    expect(observe(s.engine).hasKeyword(s.perm("host"), "Alliance")).toBe(true);
    expect(observe(s.engine).hasKeyword(s.perm("bareHost"), "Alliance")).toBe(false);
  });

  it("does not grant ＜Alliance＞ to an unrelated Digimon", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: CARD_ID, as: "savior" },
            { card: "BT1-013", as: "bystander" },
          ],
          deck: ["BT1-009", "BT1-010"],
        },
      },
      { autoDeclineOptional: true, autoSelectCards: true, autoChooseOption: true },
    );
    await s.ready();

    expect(observe(s.engine).hasKeyword(s.perm("bystander"), "Alliance")).toBe(false);
  });

  it("reaches the battle area through a public breeding-to-attack route", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT1-014", as: "base" }],
          hand: [
            { card: CARD_ID, as: "savior" },
            { card: "ST12-13", as: "ciel" },
            { card: "BT1-010", as: "spare" },
          ],
          deck: Array(10).fill("BT1-009"),
          security: Array(5).fill("BT1-009"),
        },
        1: {
          battleArea: [{ card: "BT1-009", as: "target", dp: 1000, suspended: true }],
          deck: Array(10).fill("BT1-010"),
          security: Array(5).fill("BT1-010"),
        },
      },
      { autoDeclineOptional: true, autoSelectCards: true, autoChooseOption: true },
    );
    s.state.memory = 6;
    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("savior").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard.instanceId === s.inst("savior").instanceId);
    await settle(() => s.state.pendingDecision === undefined);
    // The [When Digivolving] offer was declined, so only the digivolve cost was paid.
    expect(s.state.memory).toBe(3);
    const handIds = s.state.players[0]!.hand.map(({ instanceId }) => instanceId);
    expect(handIds).toContain(s.inst("ciel").instanceId);
    expect(handIds).toContain(s.inst("spare").instanceId);

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

    // 7000 DP beats the 1000 DP defender; the once-per-turn offer was declined again.
    expect(s.state.players[1]!.battleArea).toHaveLength(0);
    expect(s.state.memory).toBe(3);
    expect(s.perm("base").isSuspended).toBe(true);

    expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });
});
