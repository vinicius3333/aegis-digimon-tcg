import { assemblyRequirementFor, EffectTiming, getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "../index.js";
import { compiled } from "./EX13-015.js";

const CARD_ID = "EX13-015";

/** Assembly materials, leftmost printed slot first: Lv.5 / Lv.4 / Lv.3, all [Growlmon]/[Guilmon]. */
const LV5 = "BT2-017"; // WarGrowlmon — "Growlmon" as a substring of its name.
const LV4 = "BT2-013"; // Growlmon
const LV3 = "BT2-009"; // Guilmon

/** Fire the [When Attacking] window on a permanent without running a whole combat. */
async function attackWindow(s: ReturnType<typeof setupEngine>, alias: string): Promise<void> {
  await advance(s.engine).fireForPermanent(EffectTiming.OnUseAttack, s.perm(alias), {
    attackerPermanentId: s.perm(alias).permanentId,
  });
}

function combatOf(s: ReturnType<typeof setupEngine>) {
  return (
    s.engine as unknown as {
      combat: { hasOpenBlockWindow: boolean; hasOpenCounterWindow: boolean; currentAttackerId?: string };
    }
  ).combat;
}

describe("EX13-015 Gallantmon", () => {
  it("matches the catalog identity", () => {
    expect(getCardDefinition(CARD_ID)).toMatchObject({
      cardId: CARD_ID,
      nameEn: "Gallantmon",
      colors: ["Red"],
      kinds: ["Digimon"],
      level: 6,
      playCost: 12,
      dp: 12_000,
      forms: ["Mega"],
      attributes: ["Virus"],
      types: ["Holy Warrior", "Royal Knight"],
      evoCosts: [{ color: "Red", level: 5, memoryCost: 3 }],
    });
    const text = getCardDefinition(CARD_ID)?.effectText ?? "";
    expect(text).toContain("[Assembly -5] Lv.5 × Lv.4 × Lv.3, all w/[Guilmon]/[Growlmon] in name");
    expect(text).toContain("＜Raid＞");
    expect(text).toContain("＜Progress＞");
    expect(text).toContain("＜Blocker＞");
    expect(text).toContain(
      "[On Play] [When Digivolving] [When Attacking] [Counter] [Once Per Turn] Delete 1 of your opponent's 12000 DP or higher Digimon. If this effect didn't delete, trash their top security card.",
    );
    expect(text).toContain(
      "[All Turns] [Once Per Turn] When this Digimon would leave the battle area other than by your effects, by deleting 1 of your opponent's 9000 DP or lower Digimon, it doesn't leave.",
    );
    // No inherited effect and no security effect are printed.
    expect((getCardDefinition(CARD_ID)?.inheritedEffectText ?? "").trim()).toBe("");
    expect((getCardDefinition(CARD_ID)?.securityEffectText ?? "").trim()).toBe("");
  });

  it("compiles the three keywords, four shared windows, the leave replacement and the Assembly header", () => {
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
    expect(compiled.effects).toHaveLength(6);

    expect(compiled.effects[0]).toMatchObject({
      trigger: "Static",
      actions: [],
      keywords: [{ keyword: "Raid" }, { keyword: "Progress" }, { keyword: "Blocker" }],
    });

    const body = [
      {
        kind: "Delete",
        target: {
          count: 1,
          filter: { controller: "opponent", kind: ["Digimon"], dp: { op: "gte", value: 12_000 } },
        },
      },
      {
        kind: "SecurityManipulation",
        op: "trashTop",
        controller: "opponent",
        condition: { kind: "ifThisEffectDidNotDelete" },
      },
    ];
    for (const [index, trigger] of (["OnPlay", "WhenDigivolving", "WhenAttacking", "Counter"] as const).entries()) {
      expect(compiled.effects[index + 1]).toMatchObject({
        trigger,
        frequency: "OncePerTurn",
        sharedUseKey: "ir-shared-0",
        actions: body,
      });
    }
    // One printed [Once Per Turn] governs all four timings, so all four share one ledger key.
    expect(new Set(compiled.effects.slice(1, 5).map((effect) => effect.sharedUseKey)).size).toBe(1);

    expect(compiled.effects[5]).toMatchObject({
      trigger: "AllTurns",
      frequency: "OncePerTurn",
      actions: [
        {
          kind: "Replacement",
          event: "wouldLeavePlay",
          mode: "prevent",
          leaveCause: "otherThanYourEffect",
          sourceFilter: { isSelfRef: true },
          oncePerTurnKey: "EX13-015/leave-prevention",
          actions: [],
          cost: {
            kind: "deleteOwn",
            target: {
              count: 1,
              filter: { controller: "opponent", kind: ["Digimon"], dp: { op: "lte", value: 9000 } },
            },
          },
        },
      ],
    });

    const assembly = [
      {
        reduceCost: 5,
        materials: [
          { count: 1, level: 5, names: ["Guilmon", "Growlmon"] },
          { count: 1, level: 4, names: ["Guilmon", "Growlmon"] },
          { count: 1, level: 3, names: ["Guilmon", "Growlmon"] },
        ],
      },
    ];
    expect(compiled.assemblyRequirement).toEqual(assembly);
    // The registered module is what the shared Assembly reader serves to the play subsystem.
    expect(assemblyRequirementFor(CARD_ID)).toEqual(assembly);
    // The printed EvoCost row is the only digivolve route; no `[Digivolve]` header is printed.
    expect(compiled.digivolutionRequirement).toBeUndefined();
  });

  it("plays by Assembly from the trash for 5 less, stacking the leftmost slot closest to the top", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: CARD_ID, as: "gallantmon" }],
          trash: [
            { card: LV5, as: "lv5" },
            { card: LV4, as: "lv4" },
            { card: LV3, as: "lv3" },
          ],
          deck: ["BT1-009", "BT1-010"],
          security: ["BT1-009"],
        },
        1: { security: ["BT1-010", "BT1-011"], deck: ["BT1-012"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true },
    );
    s.state.memory = 8;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "playCard",
        instanceId: s.inst("gallantmon").instanceId,
        assembly: {
          materialInstanceIds: [s.inst("lv5").instanceId, s.inst("lv4").instanceId, s.inst("lv3").instanceId],
        },
      } as never),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some(({ topCard }) => topCard?.cardId === CARD_ID));
    await settle(() => s.state.pendingDecision === undefined);

    // Printed 12 reduced by 5 = 7, paid from 8.
    expect(s.state.memory).toBe(1);
    const played = s.state.players[0]!.battleArea.find(({ topCard }) => topCard?.cardId === CARD_ID)!;
    // `Permanent.stack` is bottom-most first, and the leftmost printed slot (Lv.5) ends up closest
    // to the top card (§7-3-2-6).
    expect(played.stack.map(({ instanceId }) => instanceId)).toEqual([
      s.inst("lv3").instanceId,
      s.inst("lv4").instanceId,
      s.inst("lv5").instanceId,
    ]);
    expect(played.currentDP).toBe(12_000);
    expect(s.state.players[0]!.trash).toHaveLength(0);
    // [On Play] found no 12000 DP or higher opposing Digimon, so it trashed their top security.
    expect(s.state.players[1]!.security).toHaveLength(1);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("refuses Assembly declarations that break the recipe", async () => {
    const cases: { label: string; trash: string[]; reason: string }[] = [
      // Two Lv.3s: the Lv.5 and Lv.4 slots go unfilled.
      { label: "duplicate level", trash: [LV3, "BT12-007", LV4], reason: "invalid-material" },
      // BT1-014 Kokatorimon is a Lv.4 red Digimon but carries neither printed name.
      { label: "non-family name", trash: [LV5, "BT1-014", LV3], reason: "invalid-material" },
      // §7-3-2-4: the exact total must be placed.
      { label: "partial count", trash: [LV5, LV4], reason: "invalid-material" },
    ];
    for (const { label, trash, reason } of cases) {
      const s = setupEngine({
        0: {
          hand: [{ card: CARD_ID, as: "gallantmon" }],
          trash: trash.map((card, index) => ({ card, as: `m${index}` })),
          deck: ["BT1-009"],
        },
      });
      s.state.memory = 10;
      await s.ready();
      expect(
        s.engine.applyIntent(0, {
          type: "playCard",
          instanceId: s.inst("gallantmon").instanceId,
          assembly: { materialInstanceIds: trash.map((_card, index) => s.inst(`m${index}`).instanceId) },
        } as never),
        `${label}`,
      ).toEqual({ ok: false, reason });
      expect(s.state.memory, `${label}`).toBe(10);
      expect(s.state.players[0]!.trash, `${label}`).toHaveLength(trash.length);
    }

    // §7-3-1: materials come from the trash only, never the hand.
    const fromHand = setupEngine({
      0: {
        hand: [
          { card: CARD_ID, as: "gallantmon" },
          { card: LV5, as: "lv5" },
          { card: LV4, as: "lv4" },
          { card: LV3, as: "lv3" },
        ],
        deck: ["BT1-009"],
      },
    });
    fromHand.state.memory = 10;
    await fromHand.ready();
    expect(
      fromHand.engine.applyIntent(0, {
        type: "playCard",
        instanceId: fromHand.inst("gallantmon").instanceId,
        assembly: {
          materialInstanceIds: [
            fromHand.inst("lv5").instanceId,
            fromHand.inst("lv4").instanceId,
            fromHand.inst("lv3").instanceId,
          ],
        },
      } as never),
    ).toEqual({ ok: false, reason: "invalid-material" });
    expect(fromHand.state.players[0]!.hand).toHaveLength(4);
  });

  it("[On Play] deletes a 12000 DP or higher opposing Digimon and leaves a smaller one alone", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [
            { card: CARD_ID, as: "gallantmon" },
            { card: "BT1-010", as: "spare" },
          ],
          deck: ["BT1-009", "BT1-011"],
          security: ["BT1-009"],
        },
        1: {
          battleArea: [
            { card: "BT1-013", as: "huge", dp: 13_000 },
            { card: "BT1-012", as: "small", dp: 11_000 },
          ],
          security: ["BT1-010", "BT1-011"],
          deck: ["BT1-012"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true },
    );
    s.state.memory = 12;
    await s.ready();
    const hugeId = s.perm("huge").permanentId;
    const smallId = s.perm("small").permanentId;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("gallantmon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => !s.state.players[1]!.battleArea.some(({ permanentId }) => permanentId === hugeId));
    await settle(() => s.state.pendingDecision === undefined);

    expect(s.state.memory).toBe(0);
    expect(s.state.players[1]!.battleArea.map(({ permanentId }) => permanentId)).toEqual([smallId]);
    expect(s.state.players[1]!.trash.map(({ cardId }) => cardId)).toEqual(["BT1-013"]);
    // The delete landed, so the conditional security trash did NOT run.
    expect(s.state.players[1]!.security).toHaveLength(2);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("digivolves from a red Lv.5 on the printed EvoCost for 3 and fires [When Digivolving]", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: LV5, as: "base" }],
          hand: [{ card: CARD_ID, as: "gallantmon" }],
          deck: ["BT1-009", "BT1-010"],
          security: ["BT1-009"],
        },
        1: {
          battleArea: [{ card: "BT1-013", as: "huge", dp: 12_000 }],
          security: ["BT1-010", "BT1-011"],
          deck: ["BT1-012"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true },
    );
    s.state.memory = 6;
    await s.ready();
    const baseInstanceId = s.perm("base").topCard.instanceId;
    const hugeId = s.perm("huge").permanentId;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("gallantmon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard.instanceId === s.inst("gallantmon").instanceId);
    await settle(() => s.state.pendingDecision === undefined);

    expect(s.state.memory).toBe(3);
    // Source identity survives the transition: the Lv.5 is now the single digivolution card.
    expect(s.perm("base").stack.map(({ instanceId }) => instanceId)).toEqual([baseInstanceId]);
    expect(s.perm("base").currentDP).toBe(12_000);
    // Exactly 12000 DP satisfies "12000 DP or higher".
    expect(s.state.players[1]!.battleArea.some(({ permanentId }) => permanentId === hugeId)).toBe(false);
    expect(s.state.players[1]!.security).toHaveLength(2);
    // One digivolution bonus draw, and the played card left the hand.
    expect(s.state.players[0]!.hand).toHaveLength(1);
    expect(s.state.players[0]!.hand.map(({ instanceId }) => instanceId)).not.toContain(s.inst("gallantmon").instanceId);
  });

  it("refuses illegal digivolution sources: a blue Lv.5 and a red Lv.4", async () => {
    for (const base of ["BT4-046", LV4] as const) {
      const s = setupEngine(
        {
          0: {
            battleArea: [{ card: base, as: "base" }],
            hand: [{ card: CARD_ID, as: "gallantmon" }],
            deck: ["BT1-009", "BT1-010"],
          },
        },
        { autoDeclineOptional: true, autoSelectCards: true, autoChooseOption: true },
      );
      s.state.memory = 8;
      await s.ready();

      for (const useAlternateCost of [false, true]) {
        expect(
          s.engine.applyIntent(0, {
            type: "digivolve",
            permanentId: s.perm("base").permanentId,
            instanceId: s.inst("gallantmon").instanceId,
            ...(useAlternateCost ? { useAlternateCost: true } : {}),
          }).ok,
          `${base} alt=${useAlternateCost}`,
        ).toBe(false);
      }
      expect(s.state.memory).toBe(8);
      expect(s.perm("base").topCard.cardId).toBe(base);
      expect(s.state.players[0]!.hand.map(({ instanceId }) => instanceId)).toEqual([s.inst("gallantmon").instanceId]);
    }
  });

  it("trashes the opponent's top security card when no 12000 DP or higher Digimon is there to delete", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: CARD_ID, as: "gallantmon" }], deck: ["BT1-009"], security: ["BT1-009"] },
        1: {
          battleArea: [{ card: "BT1-013", as: "small", dp: 11_999 }],
          security: [
            { card: "BT1-010", as: "top" },
            { card: "BT1-011", as: "second" },
          ],
          deck: ["BT1-012"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true },
    );
    s.state.memory = 3;
    await s.ready();

    await attackWindow(s, "gallantmon");
    await settle(() => s.state.players[1]!.trash.length > 0);
    await settle(() => s.state.pendingDecision === undefined);

    // 11999 DP is below the threshold: nothing was deleted, so the security clause ran.
    expect(s.state.players[1]!.battleArea.map(({ permanentId }) => permanentId)).toEqual([s.perm("small").permanentId]);
    expect(s.state.players[1]!.security.map(({ instanceId }) => instanceId)).toEqual([s.inst("second").instanceId]);
    expect(s.state.players[1]!.trash.map(({ instanceId }) => instanceId)).toEqual([s.inst("top").instanceId]);
    expect(s.state.memory).toBe(3);
  });

  it("spends ONE shared once-per-turn use across [When Digivolving] and [When Attacking], resetting next own turn", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: LV5, as: "base" }],
          hand: [{ card: CARD_ID, as: "gallantmon" }],
          deck: ["BT1-009", "BT1-010", "BT1-011"],
          security: ["BT1-009"],
        },
        1: {
          security: [
            { card: "BT1-010", as: "s1" },
            { card: "BT1-011", as: "s2" },
            { card: "BT1-012", as: "s3" },
          ],
          deck: ["BT1-012", "BT1-013"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true },
    );
    s.state.memory = 6;
    await s.ready();

    // [When Digivolving] spends the shared use; no 12000 DP target, so it burns a security card.
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("gallantmon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.security.length === 2);
    await settle(() => s.state.pendingDecision === undefined);
    expect(s.state.players[1]!.security.map(({ instanceId }) => instanceId)).toEqual([
      s.inst("s2").instanceId,
      s.inst("s3").instanceId,
    ]);

    // Same turn, the [When Attacking] window: the SHARED gate refuses it.
    await attackWindow(s, "base");
    await settle(() => s.state.pendingDecision === undefined);
    expect(s.state.players[1]!.security).toHaveLength(2);

    // A real opponent turn passes; the gate reopens on the controller's next turn.
    s.state.turnSeat = 1;
    await advance(s.engine).runTurn(1);
    s.state.turnSeat = 0;
    await attackWindow(s, "base");
    await settle(() => s.state.players[1]!.security.length === 1);
    await settle(() => s.state.pendingDecision === undefined);
    expect(s.state.players[1]!.security.map(({ instanceId }) => instanceId)).toEqual([s.inst("s3").instanceId]);
  });

  it("activates the body from the [Counter] window on the opponent's turn", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: CARD_ID, as: "gallantmon" }],
          deck: ["BT1-009"],
          security: ["BT1-009", "BT1-010"],
        },
        1: {
          battleArea: [{ card: "BT1-013", as: "attacker", dp: 14_000 }],
          deck: ["BT1-012"],
          security: ["BT1-011"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true },
    );
    await s.ready();
    s.state.turnSeat = 1;
    const attackerId = s.perm("attacker").permanentId;

    expect(
      s.engine.applyIntent(1, { type: "attack", attackerPermanentId: attackerId, target: { kind: "player" } }),
    ).toEqual({ ok: true });
    await settle(() => s.events.some((event) => event.kind === "counterWindowOpened"));

    const opened = s.events.find((event) => event.kind === "counterWindowOpened");
    if (opened?.kind !== "counterWindowOpened") throw new Error("counter window did not open");
    const eligible = opened.eligibleCounters.find(
      (entry) => entry.instanceId === s.perm("gallantmon").topCard.instanceId,
    );
    expect(eligible).toBeDefined();

    expect(
      s.engine.applyIntent(0, {
        type: "respondCounter",
        sourceInstanceId: eligible!.instanceId,
        effectKey: eligible!.effectKey,
      }),
    ).toEqual({ ok: true });
    await settle(() => !s.state.players[1]!.battleArea.some(({ permanentId }) => permanentId === attackerId));

    // The 14000 DP attacker is deleted from the Counter window, so the security clause stayed off.
    expect(s.state.players[1]!.battleArea).toHaveLength(0);
    expect(s.state.players[1]!.trash.map(({ cardId }) => cardId)).toEqual(["BT1-013"]);
    expect(s.state.players[1]!.security).toHaveLength(1);
  });

  it("＜Raid＞ switches a player attack onto the opponent's highest-DP unsuspended Digimon", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: CARD_ID, as: "gallantmon" }],
          deck: Array(6).fill("BT1-009"),
          security: Array(3).fill("BT1-009"),
        },
        1: {
          battleArea: [
            { card: "BT1-013", as: "big", dp: 5000 },
            { card: "BT1-012", as: "small", dp: 2000 },
          ],
          deck: Array(6).fill("BT1-010"),
          security: Array(3).fill("BT1-010"),
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true },
    );
    s.state.memory = 3;
    await s.ready();
    expect(observe(s.engine).hasKeyword(s.perm("gallantmon"), "Raid")).toBe(true);
    const smallId = s.perm("small").permanentId;
    const securityBefore = s.state.players[1]!.security.length;

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("gallantmon").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => !observe(s.engine).isAttacking());
    await settle(() => s.state.pendingDecision === undefined);

    // Redirected onto the 5000 DP Digimon, not the 2000 DP one: it lost the battle to 12000 DP.
    expect(s.state.players[1]!.battleArea.map(({ permanentId }) => permanentId)).toEqual([smallId]);
    expect(s.state.players[0]!.battleArea.map(({ permanentId }) => permanentId)).toEqual([
      s.perm("gallantmon").permanentId,
    ]);
    expect(s.state.players[1]!.trash.some(({ cardId }) => cardId === "BT1-013")).toBe(true);
    // A redirected attack battles a Digimon, so the only security loss is the [When Attacking]
    // whiff clause's single card — no security checks happened.
    expect(s.state.players[1]!.security).toHaveLength(securityBefore - 1);
  });

  it("＜Raid＞ ignores a suspended Digimon and redirects onto the unsuspended one", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: CARD_ID, as: "gallantmon" }],
          deck: Array(6).fill("BT1-009"),
          security: Array(3).fill("BT1-009"),
        },
        1: {
          battleArea: [
            { card: "BT1-013", as: "big", dp: 9000, suspended: true },
            { card: "BT1-012", as: "small", dp: 2000 },
          ],
          deck: Array(6).fill("BT1-010"),
          security: Array(3).fill("BT1-010"),
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true },
    );
    s.state.memory = 3;
    await s.ready();
    const bigId = s.perm("big").permanentId;

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("gallantmon").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => !observe(s.engine).isAttacking());
    await settle(() => s.state.pendingDecision === undefined);

    // The suspended 9000 DP Digimon was never offered; the 2000 DP one took the attack.
    expect(s.state.players[1]!.battleArea.map(({ permanentId }) => permanentId)).toEqual([bigId]);
    expect(s.state.players[1]!.trash.some(({ cardId }) => cardId === "BT1-012")).toBe(true);
  });

  it("＜Blocker＞ lets it switch itself in as the defender of an opposing attack", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: CARD_ID, as: "gallantmon" }],
          deck: Array(6).fill("BT1-009"),
          security: Array(3).fill("BT1-009"),
        },
        1: {
          battleArea: [{ card: "BT1-013", as: "attacker", dp: 5000 }],
          deck: Array(6).fill("BT1-010"),
          security: Array(3).fill("BT1-010"),
        },
      },
      { autoDeclineOptional: true, autoSelectCards: true, autoChooseOption: true },
    );
    await s.ready();
    expect(observe(s.engine).hasKeyword(s.perm("gallantmon"), "Blocker")).toBe(true);
    s.state.turnSeat = 1;
    const attackerId = s.perm("attacker").permanentId;
    const combat = combatOf(s);

    expect(
      s.engine.applyIntent(1, { type: "attack", attackerPermanentId: attackerId, target: { kind: "player" } }),
    ).toEqual({ ok: true });
    // Gallantmon's [Counter] body is eligible, so the counter window opens first; pass on it so
    // this test isolates ＜Blocker＞.
    await settle(() => combat.hasOpenCounterWindow);
    expect(s.engine.applyIntent(0, { type: "respondCounter" })).toEqual({ ok: true });
    await settle(() => combat.hasOpenBlockWindow);
    expect(
      s.engine.applyIntent(0, { type: "declareBlock", blockerPermanentId: s.perm("gallantmon").permanentId }),
    ).toEqual({ ok: true });
    await settle(() => !observe(s.engine).isAttacking());
    await settle(() => s.state.pendingDecision === undefined);

    // The block replaced the security check: 12000 DP beat the 5000 DP attacker.
    expect(s.state.players[1]!.battleArea).toHaveLength(0);
    expect(s.state.players[0]!.security).toHaveLength(3);
    expect(s.state.players[0]!.battleArea.map(({ permanentId }) => permanentId)).toEqual([
      s.perm("gallantmon").permanentId,
    ]);
  });

  it("＜Progress＞ blocks an opponent's mid-attack deletion that lands when the same card is idle", async () => {
    const build = () =>
      setupEngine(
        {
          0: {
            battleArea: [{ card: CARD_ID, as: "gallantmon" }],
            deck: Array(6).fill("BT1-009"),
            security: Array(3).fill("BT1-009"),
          },
          1: {
            // No opposing Digimon at 9000 DP or lower means the leave replacement cannot be paid,
            // so the only protection in play is ＜Progress＞.
            battleArea: [{ card: "ST18-07", as: "blocker", dp: 10_000 }],
            deck: Array(6).fill("BT1-010"),
            security: Array(3).fill("BT1-010"),
          },
        },
        { autoDeclineOptional: true, autoSelectCards: true, autoChooseOption: true },
      );

    // NEGATIVE CONTROL: idle, the opponent's effect deletes it.
    const idle = build();
    idle.state.memory = 3;
    await idle.ready();
    advance(idle.engine).verb.enterEffectResolution(1, ["Digimon"]);
    expect(await advance(idle.engine).verb.deletePermanent([idle.perm("gallantmon").permanentId], "byEffect")).toBe(1);
    advance(idle.engine).verb.leaveEffectResolution();

    // While attacking, the identical call is refused.
    const attacking = build();
    attacking.state.memory = 3;
    await attacking.ready();
    const gallantmonId = attacking.perm("gallantmon").permanentId;
    const combat = combatOf(attacking);
    expect(
      attacking.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: gallantmonId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => combat.hasOpenBlockWindow);
    expect(combat.currentAttackerId).toBe(gallantmonId);

    advance(attacking.engine).verb.enterEffectResolution(1, ["Digimon"]);
    expect(await advance(attacking.engine).verb.deletePermanent([gallantmonId], "byEffect")).toBe(0);
    advance(attacking.engine).verb.leaveEffectResolution();
    expect(attacking.state.players[0]!.battleArea.some(({ permanentId }) => permanentId === gallantmonId)).toBe(true);

    expect(attacking.engine.applyIntent(1, { type: "declineBlock" })).toEqual({ ok: true });
    await settle(() => !observe(attacking.engine).isAttacking());
  });

  it("stays in play against an opponent's effect by deleting a 9000 DP or lower opposing Digimon", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: CARD_ID, as: "gallantmon" }],
          deck: ["BT1-009"],
          security: ["BT1-009"],
        },
        1: {
          battleArea: [
            { card: "BT1-013", as: "payable", dp: 9000 },
            { card: "BT1-012", as: "tooBig", dp: 9001 },
          ],
          deck: ["BT1-010"],
          security: ["BT1-010"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true },
    );
    await s.ready();
    const gallantmonId = s.perm("gallantmon").permanentId;
    const tooBigId = s.perm("tooBig").permanentId;

    advance(s.engine).verb.enterEffectResolution(1, ["Digimon"]);
    expect(await advance(s.engine).verb.deletePermanent([gallantmonId], "byEffect")).toBe(0);
    advance(s.engine).verb.leaveEffectResolution();
    await settle(() => s.state.pendingDecision === undefined);

    expect(s.state.players[0]!.battleArea.map(({ permanentId }) => permanentId)).toEqual([gallantmonId]);
    // The cost discriminates on the DP bound: exactly 9000 is payable, 9001 is not.
    expect(s.state.players[1]!.battleArea.map(({ permanentId }) => permanentId)).toEqual([tooBigId]);
    expect(s.state.players[1]!.trash.map(({ cardId }) => cardId)).toEqual(["BT1-013"]);
  });

  it("leaves when the opponent's effect removes it and no 9000 DP or lower Digimon can pay", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: CARD_ID, as: "gallantmon" }], deck: ["BT1-009"], security: ["BT1-009"] },
        1: {
          battleArea: [{ card: "BT1-012", as: "tooBig", dp: 9001 }],
          deck: ["BT1-010"],
          security: ["BT1-010"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true },
    );
    await s.ready();
    const gallantmonId = s.perm("gallantmon").permanentId;

    advance(s.engine).verb.enterEffectResolution(1, ["Digimon"]);
    expect(await advance(s.engine).verb.deletePermanent([gallantmonId], "byEffect")).toBe(1);
    advance(s.engine).verb.leaveEffectResolution();

    expect(s.state.players[0]!.battleArea).toHaveLength(0);
    expect(s.state.players[0]!.trash.map(({ cardId }) => cardId)).toEqual([CARD_ID]);
    expect(s.state.players[1]!.battleArea.map(({ permanentId }) => permanentId)).toEqual([
      s.perm("tooBig").permanentId,
    ]);
  });

  it("does NOT prevent a leave caused by the controller's own effect", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: CARD_ID, as: "gallantmon" }], deck: ["BT1-009"], security: ["BT1-009"] },
        1: {
          battleArea: [{ card: "BT1-013", as: "payable", dp: 3000 }],
          deck: ["BT1-010"],
          security: ["BT1-010"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true },
    );
    await s.ready();
    const gallantmonId = s.perm("gallantmon").permanentId;

    advance(s.engine).verb.enterEffectResolution(0, ["Digimon"]);
    expect(await advance(s.engine).verb.deletePermanent([gallantmonId], "byEffect")).toBe(1);
    advance(s.engine).verb.leaveEffectResolution();

    expect(s.state.players[0]!.battleArea).toHaveLength(0);
    // "other than by your effects": the payable 3000 DP Digimon was never touched.
    expect(s.state.players[1]!.battleArea.map(({ permanentId }) => permanentId)).toEqual([
      s.perm("payable").permanentId,
    ]);
    expect(s.state.players[1]!.trash).toHaveLength(0);
  });

  it("prevents only ONE leave per turn and reopens on the next turn", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: CARD_ID, as: "gallantmon" }], deck: Array(6).fill("BT1-009"), security: ["BT1-009"] },
        1: {
          battleArea: [
            { card: "BT1-013", as: "first", dp: 3000 },
            { card: "BT1-012", as: "second", dp: 4000 },
          ],
          deck: Array(6).fill("BT1-010"),
          security: ["BT1-010"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true },
    );
    await s.ready();
    const gallantmonId = s.perm("gallantmon").permanentId;

    advance(s.engine).verb.enterEffectResolution(1, ["Digimon"]);
    expect(await advance(s.engine).verb.deletePermanent([gallantmonId], "byEffect")).toBe(0);
    advance(s.engine).verb.leaveEffectResolution();
    await settle(() => s.state.pendingDecision === undefined);
    expect(s.state.players[1]!.battleArea).toHaveLength(1);

    // Same turn: the once-per-turn budget is spent, so the second attempt goes through even
    // though a second payable Digimon is still standing.
    advance(s.engine).verb.enterEffectResolution(1, ["Digimon"]);
    expect(await advance(s.engine).verb.deletePermanent([gallantmonId], "byEffect")).toBe(1);
    advance(s.engine).verb.leaveEffectResolution();
    expect(s.state.players[0]!.battleArea).toHaveLength(0);
    expect(s.state.players[1]!.battleArea).toHaveLength(1);
  });

  it("reopens the leave prevention after a real turn passes", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: CARD_ID, as: "gallantmon" }], deck: Array(8).fill("BT1-009"), security: ["BT1-009"] },
        1: {
          battleArea: [
            { card: "BT1-013", as: "first", dp: 3000 },
            { card: "BT1-012", as: "second", dp: 4000 },
          ],
          deck: Array(8).fill("BT1-010"),
          security: ["BT1-010"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true },
    );
    await s.ready();
    const gallantmonId = s.perm("gallantmon").permanentId;

    advance(s.engine).verb.enterEffectResolution(1, ["Digimon"]);
    expect(await advance(s.engine).verb.deletePermanent([gallantmonId], "byEffect")).toBe(0);
    advance(s.engine).verb.leaveEffectResolution();
    await settle(() => s.state.pendingDecision === undefined);
    expect(s.state.players[1]!.battleArea).toHaveLength(1);

    s.state.turnSeat = 1;
    await advance(s.engine).runTurn(1);
    s.state.turnSeat = 0;

    // A fresh turn restores the budget: the remaining payable Digimon is spent instead.
    advance(s.engine).verb.enterEffectResolution(1, ["Digimon"]);
    expect(await advance(s.engine).verb.deletePermanent([gallantmonId], "byEffect")).toBe(0);
    advance(s.engine).verb.leaveEffectResolution();
    await settle(() => s.state.pendingDecision === undefined);

    expect(s.state.players[0]!.battleArea.map(({ permanentId }) => permanentId)).toEqual([gallantmonId]);
    expect(s.state.players[1]!.battleArea).toHaveLength(0);
  });
});
