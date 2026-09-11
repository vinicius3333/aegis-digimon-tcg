import { EffectTiming, getCardDefinition, Phase } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "../index.js";
import { compiled } from "./EX13-022.js";

const CARD_ID = "EX13-022";

/** A blue Lv.4 with the [CS] trait: the printed EvoCost route's legal base. */
const BLUE_CS_LV4 = "EX13-019";
/** A Black/Red Lv.4 with the [CS] trait and NO inherited text: only the alternate route reaches it. */
const OFF_COLOR_CS_LV4 = "BT23-051";
/** EX13-069 Rina Shinomiya: blue Tamer, printed cost 3, prints [Veedramon] in its text. */
const VEEDRAMON_TAMER = "EX13-069";
/** P-012 Tai Kamiya (V-Tamer): blue Tamer, printed cost 2, prints [Veedramon] in its text. */
const VEEDRAMON_TAMER_CHEAP = "P-012";
/** BT2-086 Rina Shinomiya: blue Tamer whose text prints "[Vee]" and never "Veedramon". */
const VEE_ONLY_TAMER = "BT2-086";
/** EX13-017 Veemon: prints [Veedramon] in its text but is a Digimon, not a Tamer. */
const VEEDRAMON_TEXT_DIGIMON = "EX13-017";
/** BT11-032 UlforceVeedramon: Lv.6, 12000 DP, "Veedramon" in its name, no inherited text. */
const VEEDRAMON_NAME_HOST = "BT11-032";

/** Fire the [When Attacking] window on a permanent without running a whole combat. */
async function attackWindow(s: ReturnType<typeof setupEngine>, alias: string): Promise<void> {
  await advance(s.engine).fireForPermanent(EffectTiming.OnUseAttack, s.perm(alias), {
    attackerPermanentId: s.perm(alias).permanentId,
  });
}

describe("EX13-022 AeroVeedramon", () => {
  it("matches the catalog identity", () => {
    expect(getCardDefinition(CARD_ID)).toMatchObject({
      cardId: CARD_ID,
      set: "EX13",
      nameEn: "AeroVeedramon",
      colors: ["Blue"],
      kinds: ["Digimon"],
      level: 5,
      playCost: 7,
      dp: 7000,
      forms: ["Ultimate"],
      attributes: ["Vaccine"],
      types: ["Holy Dragon", "CS"],
      evoCosts: [{ color: "Blue", level: 4, memoryCost: 3 }],
      rarity: "U",
      maxCountInDeck: 4,
    });
    const effectText = getCardDefinition(CARD_ID)?.effectText ?? "";
    expect(effectText).toContain("[Digivolve] Lv.4 w/[CS] trait: Cost 3");
    expect(effectText).toContain(
      "[On Play] [When Digivolving] [When Attacking] [Once Per Turn] You may play 1 Tamer card with [Veedramon] in its text from your hand without paying the cost.",
    );
    expect(effectText).toContain(
      "[All Turns] [Once Per Turn] When any of your Tamers are played, 1 of your opponent's Digimon or Tamers can't suspend until their turn ends.",
    );
    expect((getCardDefinition(CARD_ID)?.inheritedEffectText ?? "").trim()).toBe(
      "[All Turns] [Once Per Turn] When this Digimon with [Veedramon] in its name suspends, it may unsuspend.",
    );
    expect(getCardDefinition(CARD_ID)?.securityEffectText ?? "").toBe("");
  });

  it("compiles three shared-gate play windows, the Tamer-play lock and the inherited unsuspend", () => {
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
    expect(compiled.effects).toHaveLength(5);

    // The three printed timings share ONE printed [Once Per Turn] via one `sharedUseKey`.
    const playBody = {
      kind: "PlayWithoutCost",
      from: ["hand"],
      payCost: false,
      optional: true,
      target: {
        count: 1,
        filter: {
          zone: "hand",
          kind: ["Tamer"],
          nameOrTrait: [{ tokens: ["Veedramon"], match: "text" }],
        },
      },
    };
    expect(compiled.effects.slice(0, 3).map(({ trigger }) => trigger)).toEqual([
      "OnPlay",
      "WhenDigivolving",
      "WhenAttacking",
    ]);
    for (const effect of compiled.effects.slice(0, 3)) {
      expect(effect).toMatchObject({ frequency: "OncePerTurn", sharedUseKey: "ir-shared-0", actions: [playBody] });
      expect(effect.isInherited).toBeUndefined();
      // "without paying the cost" is payCost:false, never a reduceCostBy discount.
      expect((effect.actions[0] as { reduceCostBy?: number }).reduceCostBy).toBeUndefined();
    }

    expect(compiled.effects[3]).toMatchObject({
      trigger: "AllTurns",
      frequency: "OncePerTurn",
      actions: [
        {
          kind: "SubTrigger",
          event: "whenPlayed",
          sourceFilter: { controller: "mine", kind: ["Tamer"] },
          actions: [
            {
              kind: "Restrict",
              restriction: "suspend",
              duration: "untilOpponentTurnEnd",
              target: { count: 1, filter: { controller: "opponent", kind: ["Digimon", "Tamer"] } },
            },
          ],
        },
      ],
    });
    expect(compiled.effects[3]?.isInherited).toBeUndefined();
    // "any of your Tamers" has no "other": nothing excludes a self-driven play.
    const lockWatcher = compiled.effects[3]!.actions[0] as { sourceFilter?: { excludeSelf?: boolean } };
    expect(lockWatcher.sourceFilter?.excludeSelf).toBeUndefined();

    expect(compiled.effects[4]).toMatchObject({
      trigger: "AllTurns",
      frequency: "OncePerTurn",
      isInherited: true,
      actions: [
        {
          kind: "SubTrigger",
          event: "whenSuspended",
          sourceFilter: { isSelfRef: true },
          hostFilter: { nameOrTrait: [{ tokens: ["Veedramon"], match: "name" }] },
          actions: [
            { kind: "Unsuspend", optional: true, target: { count: 1, isSelf: true, filter: { isSelfRef: true } } },
          ],
        },
      ],
    });
    expect(compiled.effects[4]?.sharedUseKey).toBeUndefined();

    // "w/[CS] trait" is the exact trait reading, and the level is printed.
    expect(compiled.digivolutionRequirement).toEqual([{ level: 4, traits: ["CS"], cost: 3, isAlternate: true }]);
  });

  it("digivolves from a blue Lv.4 on the printed EvoCost for 3, keeping the source in the stack", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: BLUE_CS_LV4, as: "base" }],
          hand: [{ card: CARD_ID, as: "aero" }],
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
        instanceId: s.inst("aero").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard.instanceId === s.inst("aero").instanceId);
    await settle(() => s.state.pendingDecision === undefined);

    expect(s.state.memory).toBe(3);
    expect(s.perm("base").stack.map(({ instanceId }) => instanceId)).toEqual([baseInstanceId]);
    expect(s.perm("base").currentDP).toBe(7000);
    // EX13-019's inherited ＜Jamming＞ survives the transition as a stack-conferred keyword.
    expect(observe(s.engine).hasKeyword(s.perm("base"), "Jamming")).toBe(true);
    // The card left the hand; the single card there is the digivolution bonus draw.
    expect(s.state.players[0]!.hand.map(({ instanceId }) => instanceId)).not.toContain(s.inst("aero").instanceId);
    expect(s.state.players[0]!.hand).toHaveLength(1);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("digivolves from a BLACK/RED Lv.4 with the [CS] trait on the alternate cost-3 route", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: OFF_COLOR_CS_LV4, as: "base" }],
          hand: [{ card: CARD_ID, as: "aero" }],
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
        instanceId: s.inst("aero").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard.instanceId === s.inst("aero").instanceId);
    await settle(() => s.state.pendingDecision === undefined);

    expect(s.state.memory).toBe(3);
    expect(s.perm("base").stack.map(({ instanceId }) => instanceId)).toEqual([baseInstanceId]);
    // BT23-051 prints no inherited text, so the new top keeps its own printed 7000 DP.
    expect(s.perm("base").currentDP).toBe(7000);
    expect(s.state.players[0]!.hand.map(({ instanceId }) => instanceId)).not.toContain(s.inst("aero").instanceId);
    expect(s.state.players[0]!.hand).toHaveLength(1);
  });

  it('refuses illegal sources on BOTH routes, including a Lv.4 whose trait merely CONTAINS "cs"', async () => {
    // BT1-014: red Lv.4, no [CS]. BT1-013: red Lv.3, no [CS] (wrong level on both routes).
    // BT17-034 Bulkmon: Yellow/Green Lv.4 whose trait "Abadin Electronics" contains "cs" —
    // it would pass a `traitSubstrings` reading of "w/[CS] trait" and must fail the exact one.
    for (const base of ["BT1-014", "BT1-013", "BT17-034"] as const) {
      const s = setupEngine(
        {
          0: {
            battleArea: [{ card: base, as: "base" }],
            hand: [{ card: CARD_ID, as: "aero" }],
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
          instanceId: s.inst("aero").instanceId,
          ...(useAlternateCost ? { useAlternateCost: true } : {}),
        });
        expect(result.ok, `${base} alt=${useAlternateCost}`).toBe(false);
      }
      // No memory moved and the base is untouched, so neither route silently fell through.
      expect(s.state.memory).toBe(6);
      expect(s.perm("base").topCard.cardId).toBe(base);
      expect(s.state.players[0]!.hand.map(({ instanceId }) => instanceId)).toEqual([s.inst("aero").instanceId]);
    }
  });

  it("plays a [Veedramon]-text Tamer from hand for FREE on the [When Attacking] window", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: CARD_ID, as: "aero" }],
          hand: [
            { card: VEEDRAMON_TAMER, as: "rina" },
            { card: "BT1-009", as: "spare" },
          ],
          deck: ["BT1-009", "BT1-010"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true },
    );
    s.state.memory = 4;
    await s.ready();

    await attackWindow(s, "aero");
    await settle(() =>
      s.state.players[0]!.battleArea.some(({ topCard }) => topCard.instanceId === s.inst("rina").instanceId),
    );
    await settle(() => s.state.pendingDecision === undefined);

    // Printed cost 3, played "without paying the cost": memory is untouched.
    expect(s.state.memory).toBe(4);
    expect(s.state.players[0]!.hand.map(({ instanceId }) => instanceId)).toEqual([s.inst("spare").instanceId]);
    const played = s.state.players[0]!.battleArea.find(
      ({ topCard }) => topCard.instanceId === s.inst("rina").instanceId,
    );
    expect(played).toBeDefined();
    expect(played!.stack).toHaveLength(0);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("plays the Tamer for free from the [On Play] window even at 0 memory", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [
            { card: CARD_ID, as: "aero" },
            { card: VEEDRAMON_TAMER, as: "rina" },
            { card: "BT1-009", as: "spare" },
          ],
          deck: ["BT1-009", "BT1-010"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true },
    );
    // Exactly the play cost of this card (7) and nothing more, so the free Tamer play is the
    // only way Rina can reach the battle area.
    s.state.memory = 7;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("aero").instanceId })).toEqual({ ok: true });
    await settle(() =>
      s.state.players[0]!.battleArea.some(({ topCard }) => topCard.instanceId === s.inst("rina").instanceId),
    );
    await settle(() => s.state.pendingDecision === undefined);

    // 7 memory paid for AeroVeedramon, 0 for the Tamer.
    expect(s.state.memory).toBe(0);
    expect(s.state.players[0]!.hand.map(({ instanceId }) => instanceId)).toEqual([s.inst("spare").instanceId]);
    expect(s.state.players[0]!.battleArea).toHaveLength(2);
  });

  it("discriminates the [Veedramon] token from the near-miss [Vee] token and from non-Tamer cards", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: CARD_ID, as: "aero" }],
          hand: [
            // A Tamer whose text prints "[Vee]" and never "Veedramon": "Vee" is a prefix of
            // "Veedramon", not the other way round, so this must NOT qualify.
            { card: VEE_ONLY_TAMER, as: "veeOnlyTamer" },
            // Prints [Veedramon] in its text but is a Digimon, not a Tamer.
            { card: VEEDRAMON_TEXT_DIGIMON, as: "digimonWithToken" },
            // Tamer AND prints [Veedramon]: the only legal choice.
            { card: VEEDRAMON_TAMER, as: "match" },
          ],
          deck: ["BT1-009", "BT1-010"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true },
    );
    s.state.memory = 4;
    await s.ready();

    await attackWindow(s, "aero");
    await settle(() => s.state.pendingDecision === undefined);

    expect(s.state.memory).toBe(4);
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
          battleArea: [{ card: CARD_ID, as: "aero" }],
          hand: [
            { card: VEE_ONLY_TAMER, as: "veeOnlyTamer" },
            { card: VEEDRAMON_TEXT_DIGIMON, as: "digimonWithToken" },
          ],
          deck: ["BT1-009", "BT1-010"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true },
    );
    s.state.memory = 5;
    await s.ready();

    await attackWindow(s, "aero");
    await settle(() => s.state.pendingDecision === undefined);

    expect(s.state.memory).toBe(5);
    expect(s.state.players[0]!.hand.map(({ instanceId }) => instanceId)).toEqual([
      s.inst("veeOnlyTamer").instanceId,
      s.inst("digimonWithToken").instanceId,
    ]);
    expect(s.state.players[0]!.battleArea).toHaveLength(1);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("declines without playing when the controller says no", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: CARD_ID, as: "aero" }],
          hand: [{ card: VEEDRAMON_TAMER, as: "rina" }],
          deck: ["BT1-009", "BT1-010"],
        },
      },
      { autoDeclineOptional: true, autoSelectCards: true, autoChooseOption: true },
    );
    s.state.memory = 4;
    await s.ready();

    await attackWindow(s, "aero");
    await settle(() => s.state.pendingDecision === undefined);

    expect(s.state.memory).toBe(4);
    expect(s.state.players[0]!.hand.map(({ instanceId }) => instanceId)).toEqual([s.inst("rina").instanceId]);
    expect(s.state.players[0]!.battleArea).toHaveLength(1);
  });

  it("does not grant the [When Attacking] window to an unrelated Digimon", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: CARD_ID, as: "aero" },
            { card: "BT1-013", as: "bystander" },
          ],
          hand: [{ card: VEEDRAMON_TAMER, as: "rina" }],
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

  it("spends ONE shared [Once Per Turn] across the digivolve and attack windows, and resets next own turn", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: BLUE_CS_LV4, as: "base" }],
          hand: [
            { card: CARD_ID, as: "aero" },
            { card: VEEDRAMON_TAMER_CHEAP, as: "first" },
            { card: VEEDRAMON_TAMER_CHEAP, as: "second" },
          ],
          deck: Array(10).fill("BT1-009"),
          security: Array(3).fill("BT1-009"),
        },
        1: { deck: Array(10).fill("BT1-010"), security: Array(3).fill("BT1-010") },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true },
    );
    s.state.memory = 6;
    await s.ready();

    // [When Digivolving] spends the single shared activation.
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("aero").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard.instanceId === s.inst("aero").instanceId);
    await settle(() =>
      s.state.players[0]!.battleArea.some(({ topCard }) => topCard.instanceId === s.inst("first").instanceId),
    );
    await settle(() => s.state.pendingDecision === undefined);
    expect(s.state.players[0]!.hand.map(({ instanceId }) => instanceId)).toContain(s.inst("second").instanceId);
    expect(
      s.state.players[0]!.battleArea.some(({ topCard }) => topCard.instanceId === s.inst("second").instanceId),
    ).toBe(false);

    // Same turn, the OTHER printed timing: the shared [Once Per Turn] refuses it.
    await attackWindow(s, "base");
    await settle(() => s.state.pendingDecision === undefined);
    expect(
      s.state.players[0]!.battleArea.some(({ topCard }) => topCard.instanceId === s.inst("second").instanceId),
    ).toBe(false);

    // A real opponent turn passes; the gate reopens on the controller's next turn.
    s.state.turnSeat = 1;
    await advance(s.engine).runTurn(1);

    s.state.turnSeat = 0;
    await attackWindow(s, "base");
    await settle(() =>
      s.state.players[0]!.battleArea.some(({ topCard }) => topCard.instanceId === s.inst("second").instanceId),
    );
    await settle(() => s.state.pendingDecision === undefined);

    expect(
      s.state.players[0]!.battleArea.some(({ topCard }) => topCard.instanceId === s.inst("second").instanceId),
    ).toBe(true);
  });

  it("locks 1 opponent permanent out of suspending when one of your Tamers is played", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: CARD_ID, as: "aero" }],
          hand: [
            { card: VEEDRAMON_TAMER, as: "rina" },
            { card: "BT1-009", as: "spare" },
          ],
          deck: ["BT1-009", "BT1-010"],
        },
        1: {
          battleArea: [{ card: "BT1-009", as: "victim" }],
          deck: ["BT1-010", "BT1-010"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true },
    );
    s.state.memory = 5;
    await s.ready();
    expect(observe(s.engine).isRestricted(s.perm("victim"), "suspend")).toBe(false);

    // The Tamer is played by hand, not by this card's own window, so the watcher is what fires.
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("rina").instanceId })).toEqual({ ok: true });
    await settle(() =>
      s.state.players[0]!.battleArea.some(({ topCard }) => topCard.instanceId === s.inst("rina").instanceId),
    );
    await settle(() => s.state.pendingDecision === undefined);

    expect(observe(s.engine).isRestricted(s.perm("victim"), "suspend")).toBe(true);
    // Printed "can't suspend" is recorded as `beSuspended`; both spellings read as one prohibition.
    expect(observe(s.engine).isRestricted(s.perm("victim"), "beSuspended")).toBe(true);
    // Rina costs 3: the restriction rode along with a normal, fully paid play.
    expect(s.state.memory).toBe(2);
    expect(s.state.players[0]!.hand.map(({ instanceId }) => instanceId)).toEqual([s.inst("spare").instanceId]);
  });

  it("refuses to unsuspend a locked opponent Digimon through the effect primitive", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: CARD_ID, as: "aero" }],
          hand: [
            { card: VEEDRAMON_TAMER, as: "rina" },
            { card: "BT1-009", as: "spare" },
          ],
          deck: ["BT1-009", "BT1-010"],
        },
        1: {
          battleArea: [{ card: "BT1-009", as: "victim" }],
          deck: ["BT1-010", "BT1-010"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true },
    );
    s.state.memory = 5;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("rina").instanceId })).toEqual({ ok: true });
    await settle(() => observe(s.engine).isRestricted(s.perm("victim"), "suspend"));
    await settle(() => s.state.pendingDecision === undefined);

    // An effect-driven suspension is refused while the restriction stands.
    await advance(s.engine).verb.suspend([s.perm("victim").permanentId], 0);
    await settle(() => s.state.pendingDecision === undefined);
    expect(s.perm("victim").isSuspended).toBe(false);
  });

  it("fires the Tamer-play lock once per turn and resets on the controller's next turn", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: CARD_ID, as: "aero" }],
          hand: [
            { card: VEEDRAMON_TAMER_CHEAP, as: "firstTamer" },
            { card: VEEDRAMON_TAMER_CHEAP, as: "secondTamer" },
            { card: VEEDRAMON_TAMER_CHEAP, as: "thirdTamer" },
            { card: "BT1-009", as: "spare" },
          ],
          deck: Array(10).fill("BT1-009"),
          security: Array(3).fill("BT1-009"),
        },
        1: {
          battleArea: [
            { card: "BT1-009", as: "victimA", dp: 20_000 },
            { card: "BT1-009", as: "victimB", dp: 20_000 },
          ],
          deck: Array(10).fill("BT1-010"),
          security: Array(3).fill("BT1-010"),
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true },
    );
    s.state.memory = 10;
    await s.ready();
    const victimBPermanentId = s.perm("victimB").permanentId;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("firstTamer").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => observe(s.engine).isRestricted(s.perm("victimA"), "suspend"));
    await settle(() => s.state.pendingDecision === undefined);
    expect(observe(s.engine).isRestricted(victimBPermanentId, "suspend")).toBe(false);

    // Remove the already-locked permanent so victimB is the ONLY candidate left: a second
    // activation would have to land there, which makes the refusal observable rather than
    // hidden behind a chooser that simply re-picks the permanent it already restricted.
    await advance(s.engine).verb.deletePermanent([s.perm("victimA").permanentId]);
    await settle(() => s.state.players[1]!.battleArea.length === 1);

    // Second Tamer, same turn: the printed [Once Per Turn] blocks a second lock.
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("secondTamer").instanceId })).toEqual({
      ok: true,
    });
    await settle(() =>
      s.state.players[0]!.battleArea.some(({ topCard }) => topCard.instanceId === s.inst("secondTamer").instanceId),
    );
    await settle(() => s.state.pendingDecision === undefined);
    expect(observe(s.engine).isRestricted(victimBPermanentId, "suspend")).toBe(false);

    // A real opponent turn passes; the gate reopens on the controller's next turn.
    s.state.turnSeat = 1;
    await advance(s.engine).runTurn(1);
    s.state.turnSeat = 0;
    // `runTurn` leaves the phase where the opponent's turn ended; a public play intent is only
    // legal in the controller's own main phase.
    s.state.phase = Phase.Main;
    s.state.memory = 6;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("thirdTamer").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => observe(s.engine).isRestricted(victimBPermanentId, "suspend"));
    await settle(() => s.state.pendingDecision === undefined);
    expect(observe(s.engine).isRestricted(victimBPermanentId, "suspend")).toBe(true);
  });

  it("expires the suspend lock at the end of the opponent's turn", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: CARD_ID, as: "aero" }],
          hand: [
            { card: VEEDRAMON_TAMER_CHEAP, as: "tamer" },
            { card: "BT1-009", as: "spare" },
          ],
          deck: Array(10).fill("BT1-009"),
          security: Array(3).fill("BT1-009"),
        },
        1: {
          battleArea: [{ card: "BT1-009", as: "victim", dp: 20_000 }],
          deck: Array(10).fill("BT1-010"),
          security: Array(3).fill("BT1-010"),
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true },
    );
    s.state.memory = 5;
    await s.ready();
    const victimPermanentId = s.perm("victim").permanentId;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("tamer").instanceId })).toEqual({ ok: true });
    await settle(() => observe(s.engine).isRestricted(victimPermanentId, "suspend"));
    await settle(() => s.state.pendingDecision === undefined);

    expect(observe(s.engine).isRestricted(victimPermanentId, "suspend")).toBe(true);

    // "until THEIR turn ends" outlives the controller's OWN turn end — a `forTheTurn` duration
    // would have been swept at this boundary.
    s.state.turnSeat = 0;
    await advance(s.engine).runTurn(0);
    expect(observe(s.engine).isRestricted(victimPermanentId, "suspend")).toBe(true);
  });

  it("clears the suspend lock once the opponent's own turn has ended", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: CARD_ID, as: "aero" }],
          hand: [
            { card: VEEDRAMON_TAMER_CHEAP, as: "tamer" },
            { card: "BT1-009", as: "spare" },
          ],
          deck: Array(10).fill("BT1-009"),
          security: Array(3).fill("BT1-009"),
        },
        1: {
          battleArea: [{ card: "BT1-009", as: "victim", dp: 20_000 }],
          deck: Array(10).fill("BT1-010"),
          security: Array(3).fill("BT1-010"),
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true },
    );
    s.state.memory = 5;
    await s.ready();
    const victimPermanentId = s.perm("victim").permanentId;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("tamer").instanceId })).toEqual({ ok: true });
    await settle(() => observe(s.engine).isRestricted(victimPermanentId, "suspend"));
    await settle(() => s.state.pendingDecision === undefined);
    expect(observe(s.engine).isRestricted(victimPermanentId, "suspend")).toBe(true);

    s.state.turnSeat = 1;
    await advance(s.engine).runTurn(1);
    s.state.turnSeat = 0;
    expect(observe(s.engine).isRestricted(victimPermanentId, "suspend")).toBe(false);
  });

  it("does not lock anything when an OPPONENT's Tamer is played", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: CARD_ID, as: "aero" }],
          hand: [{ card: "BT1-009", as: "spare" }],
          deck: ["BT1-009", "BT1-010"],
        },
        1: {
          battleArea: [{ card: "BT1-009", as: "bystander" }],
          hand: [{ card: VEEDRAMON_TAMER, as: "theirRina" }],
          deck: ["BT1-010", "BT1-010"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true },
    );
    s.state.memory = -5;
    s.state.turnSeat = 1;
    await s.ready();

    expect(s.engine.applyIntent(1, { type: "playCard", instanceId: s.inst("theirRina").instanceId })).toEqual({
      ok: true,
    });
    await settle(() =>
      s.state.players[1]!.battleArea.some(({ topCard }) => topCard.instanceId === s.inst("theirRina").instanceId),
    );
    await settle(() => s.state.pendingDecision === undefined);

    // `sourceFilter.controller: "mine"` rejected the opponent's own Tamer play.
    expect(observe(s.engine).isRestricted(s.perm("bystander"), "suspend")).toBe(false);
    expect(observe(s.engine).isRestricted(s.perm("aero"), "suspend")).toBe(false);
  });

  it("does not lock anything when one of your DIGIMON is played", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: CARD_ID, as: "aero" }],
          hand: [
            { card: VEEDRAMON_TEXT_DIGIMON, as: "veemon" },
            { card: "BT1-009", as: "spare" },
          ],
          deck: ["BT1-009", "BT1-010"],
        },
        1: {
          battleArea: [{ card: "BT1-009", as: "victim" }],
          deck: ["BT1-010", "BT1-010"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true },
    );
    s.state.memory = 5;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("veemon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.pendingDecision === undefined);

    // `kind: ["Tamer"]` rejected the Digimon play, even one printing [Veedramon].
    expect(observe(s.engine).isRestricted(s.perm("victim"), "suspend")).toBe(false);
  });

  it("chains its own window into the lock: the free Tamer play arms the restriction", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: CARD_ID, as: "aero" }],
          hand: [
            { card: VEEDRAMON_TAMER, as: "rina" },
            { card: "BT1-009", as: "spare" },
          ],
          deck: ["BT1-009", "BT1-010"],
        },
        1: {
          battleArea: [{ card: "BT1-009", as: "victim" }],
          deck: ["BT1-010", "BT1-010"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true },
    );
    s.state.memory = 4;
    await s.ready();

    await attackWindow(s, "aero");
    await settle(() =>
      s.state.players[0]!.battleArea.some(({ topCard }) => topCard.instanceId === s.inst("rina").instanceId),
    );
    await settle(() => s.state.pendingDecision === undefined);

    // "any of your Tamers" covers a Tamer this card itself played, and it cost no memory.
    expect(s.state.memory).toBe(4);
    expect(observe(s.engine).isRestricted(s.perm("victim"), "suspend")).toBe(true);
  });

  it("passes the inherited unsuspend to a [Veedramon]-named host and to nobody else", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: VEEDRAMON_NAME_HOST, as: "namedHost", under: [{ card: CARD_ID, as: "underNamed" }] },
            // "Veemon" does not contain "Veedramon": the near-miss host.
            { card: VEEDRAMON_TEXT_DIGIMON, as: "veemonHost", under: [{ card: CARD_ID, as: "underVeemon" }] },
            // No Vee token at all.
            { card: "BT1-014", as: "plainHost", under: [{ card: CARD_ID, as: "underPlain" }] },
          ],
          hand: [{ card: "BT1-009", as: "spare" }],
          deck: ["BT1-009", "BT1-010"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true },
    );
    await s.ready();

    // The carrier really is a digivolution card under each host.
    expect(s.perm("namedHost").stack.map(({ instanceId }) => instanceId)).toEqual([s.inst("underNamed").instanceId]);

    for (const [alias, expectSuspended] of [
      ["namedHost", false],
      ["veemonHost", true],
      ["plainHost", true],
    ] as const) {
      await advance(s.engine).verb.suspend([s.perm(alias).permanentId]);
      await settle(() => s.state.pendingDecision === undefined);
      expect(s.perm(alias).isSuspended, `${alias}`).toBe(expectSuspended);
    }
  });

  it("offers the inherited unsuspend once per turn and reopens on the host owner's next turn", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: VEEDRAMON_NAME_HOST, as: "host", under: [{ card: CARD_ID, as: "under" }] }],
          hand: [{ card: "BT1-009", as: "spare" }],
          deck: Array(10).fill("BT1-009"),
          security: Array(3).fill("BT1-009"),
        },
        1: { deck: Array(10).fill("BT1-010"), security: Array(3).fill("BT1-010") },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true },
    );
    await s.ready();

    await advance(s.engine).verb.suspend([s.perm("host").permanentId]);
    await settle(() => s.state.pendingDecision === undefined);
    expect(s.perm("host").isSuspended).toBe(false);

    // Second suspension in the same turn: the printed [Once Per Turn] leaves it suspended.
    await advance(s.engine).verb.suspend([s.perm("host").permanentId]);
    await settle(() => s.state.pendingDecision === undefined);
    expect(s.perm("host").isSuspended).toBe(true);

    await advance(s.engine).verb.unsuspend([s.perm("host").permanentId]);
    s.state.turnSeat = 1;
    await advance(s.engine).runTurn(1);
    s.state.turnSeat = 0;

    await advance(s.engine).verb.suspend([s.perm("host").permanentId]);
    await settle(() => s.state.pendingDecision === undefined);
    expect(s.perm("host").isSuspended).toBe(false);
  });

  it("leaves the host suspended when the controller declines the inherited unsuspend", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: VEEDRAMON_NAME_HOST, as: "host", under: [{ card: CARD_ID, as: "under" }] }],
          hand: [{ card: "BT1-009", as: "spare" }],
          deck: ["BT1-009", "BT1-010"],
        },
      },
      { autoDeclineOptional: true, autoSelectCards: true, autoChooseOption: true },
    );
    await s.ready();

    await advance(s.engine).verb.suspend([s.perm("host").permanentId]);
    await settle(() => s.state.pendingDecision === undefined);

    expect(s.perm("host").isSuspended).toBe(true);
  });

  it("does not apply the inherited unsuspend to itself while it is the top card", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: CARD_ID, as: "aero" }],
          hand: [{ card: "BT1-009", as: "spare" }],
          deck: ["BT1-009", "BT1-010"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true },
    );
    await s.ready();

    await advance(s.engine).verb.suspend([s.perm("aero").permanentId]);
    await settle(() => s.state.pendingDecision === undefined);

    // Inherited clauses apply only while the card is a digivolution card, even though
    // "AeroVeedramon" itself contains "Veedramon".
    expect(s.perm("aero").isSuspended).toBe(true);
  });

  it("reaches the battle area and chains digivolve → free Tamer → suspend lock through public intents", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: BLUE_CS_LV4, as: "base" }],
          hand: [
            { card: CARD_ID, as: "aero" },
            { card: VEEDRAMON_TAMER, as: "rina" },
            { card: "BT1-009", as: "spare" },
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
        instanceId: s.inst("aero").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard.instanceId === s.inst("aero").instanceId);
    await settle(() =>
      s.state.players[0]!.battleArea.some(({ topCard }) => topCard.instanceId === s.inst("rina").instanceId),
    );
    await settle(() => s.state.pendingDecision === undefined);

    // 3 memory for the digivolve, 0 for the Tamer, and the lock landed on the only opponent.
    expect(s.state.memory).toBe(3);
    expect(observe(s.engine).isRestricted(s.perm("target"), "suspend")).toBe(true);

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

    // 7000 DP beats the 1000 DP defender; the shared gate had already been spent on the
    // digivolve, so the attack window played no second Tamer.
    expect(s.state.players[1]!.battleArea).toHaveLength(0);
    expect(s.state.players[0]!.hand.map(({ instanceId }) => instanceId)).toContain(s.inst("spare").instanceId);
    expect(s.perm("base").isSuspended).toBe(true);

    expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });
});
