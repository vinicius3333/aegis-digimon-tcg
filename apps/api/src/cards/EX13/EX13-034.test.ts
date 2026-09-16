import { EffectTiming, getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { compiled } from "./EX13-034.js";
import "../index.js";

const CARD_ID = "EX13-034";
// EX7-019 Sorcermon: Lv.4 BLUE with [Witchelny] in its printed text. Blue is exactly what the
// alternate header widens past the catalog EvoCost (Yellow Lv.4 for 4).
const WITCHELNY_LV4 = "EX7-019";
// BT1-014: Lv.4 Red, no printed text at all — neither the alternate header nor the EvoCost.
const PLAIN_LV4 = "BT1-014";

describe("EX13-034 Wisemon", () => {
  it("matches the catalog identity", () => {
    expect(getCardDefinition(CARD_ID)).toMatchObject({
      cardId: CARD_ID,
      nameEn: "Wisemon",
      colors: ["Yellow", "Black"],
      kinds: ["Digimon"],
      level: 5,
      playCost: 6,
      dp: 6000,
      forms: ["Ultimate"],
      attributes: ["Virus"],
      types: ["Wizard"],
      evoCosts: [{ color: "Yellow", level: 4, memoryCost: 4 }],
      effectText: expect.stringContaining("[Digivolve] Lv.4 w/[Witchelny] in text: Cost 3"),
      inheritedEffectText: expect.stringContaining("this Digimon may unsuspend"),
    });
  });

  it("compiles every printed clause", () => {
    expect(compiled).toMatchObject({ cardId: CARD_ID, coverage: "full", residual: [] });
    expect(compiled.digivolutionRequirement).toEqual([{ level: 4, texts: ["Witchelny"], cost: 3, isAlternate: true }]);
    expect(compiled.effects).toHaveLength(6);

    expect(compiled.effects[0]).toMatchObject({ trigger: "Static", keywords: [{ keyword: "Barrier" }] });

    // One printed [Once Per Turn] over three printed timings ⇒ one shared use ledger.
    const sharedKeys = new Set<string>();
    for (const [index, trigger] of (["OnPlay", "WhenDigivolving", "WhenAttacking"] as const).entries()) {
      const effect = compiled.effects[index + 1]!;
      expect(effect).toMatchObject({ trigger, frequency: "OncePerTurn" });
      sharedKeys.add(effect.sharedUseKey!);
      expect(effect.actions).toMatchObject([
        { kind: "SelectBind", target: { count: 1, bindAs: "wisemonProtected" } },
        {
          kind: "GainKeyword",
          keyword: { keyword: "Reboot" },
          duration: "untilOpponentTurnEnd",
          target: { fromSelectionRef: "wisemonProtected" },
        },
        {
          kind: "GainKeyword",
          keyword: { keyword: "Blocker" },
          duration: "untilOpponentTurnEnd",
          target: { fromSelectionRef: "wisemonProtected" },
        },
        {
          kind: "Restrict",
          restriction: "cantBeDeDigivolved",
          byOpponentEffectsOnly: true,
          duration: "untilOpponentTurnEnd",
          target: { fromSelectionRef: "wisemonProtected" },
        },
      ]);
    }
    expect(sharedKeys.size).toBe(1);

    expect(compiled.effects[4]).toMatchObject({
      trigger: "AllTurns",
      frequency: "OncePerTurn",
      actions: [
        {
          kind: "SubTrigger",
          event: "whenSecurityRemoved",
          fireCondition: { kind: "triggerRemovedSecuritySeat", seat: "mine" },
          actions: [
            { kind: "DeDigivolve", amount: 1, target: { filter: { controller: "opponent" }, count: 1 } },
            {
              kind: "Restrict",
              restriction: "digivolve",
              duration: "untilOpponentTurnEnd",
              condition: { kind: "zoneCount", seat: "mine", zone: "security", op: "lte", value: 3 },
            },
          ],
        },
      ],
    });

    expect(compiled.effects[5]).toMatchObject({
      trigger: "AllTurns",
      isInherited: true,
      frequency: "OncePerTurn",
      actions: [
        {
          kind: "SubTrigger",
          event: "whenSecurityRemoved",
          fireCondition: { kind: "triggerRemovedSecuritySeat", seat: "mine" },
          actions: [{ kind: "Unsuspend", optional: true, target: { isSelf: true } }],
        },
      ],
    });
  });

  it("carries ＜Barrier＞ on the board", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: CARD_ID, as: "wisemon" }], deck: ["BT1-010"], security: ["BT1-013"] },
      1: { deck: ["BT1-011"] },
    });
    await s.ready();
    await advance(s.engine).recompute();
    expect(observe(s.engine).hasKeyword(s.perm("wisemon"), "Barrier")).toBe(true);
  });

  it("[On Play] grants Reboot, Blocker and De-Digivolve immunity to one chosen Digimon", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: CARD_ID, as: "wisemon" },
            { card: "BT1-020", as: "chosen" },
            { card: "BT1-019", as: "other" },
          ],
          deck: ["BT1-010"],
          security: ["BT1-013"],
        },
        1: { deck: ["BT1-011"] },
      },
      { autoSelectCards: true, autoAcceptOptional: true },
    );
    await s.ready();
    s.state.memory = 5;

    await advance(s.engine).fire(EffectTiming.OnPlay, s.perm("wisemon"));
    await settle();

    // Exactly one of the controller's Digimon received the whole bundle, and it is the same one
    // for all three grants — the SelectBind contract.
    const withReboot = ["wisemon", "chosen", "other"].filter((alias) =>
      observe(s.engine).hasKeyword(s.perm(alias), "Reboot"),
    );
    expect(withReboot).toHaveLength(1);
    const granted = withReboot[0]!;
    expect(observe(s.engine).hasKeyword(s.perm(granted), "Blocker")).toBe(true);
    expect(observe(s.engine).isRestricted(s.perm(granted), "cantBeDeDigivolved")).toBe(true);
    for (const alias of ["wisemon", "chosen", "other"].filter((entry) => entry !== granted)) {
      expect(observe(s.engine).hasKeyword(s.perm(alias), "Reboot")).toBe(false);
      expect(observe(s.engine).isRestricted(s.perm(alias), "cantBeDeDigivolved")).toBe(false);
    }
  });

  it("spends one shared use across all three printed timings and resets next own turn", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: CARD_ID, as: "wisemon" },
            { card: "BT1-020", as: "ally" },
          ],
          deck: ["BT1-010", "BT1-012", "BT1-013"],
          security: ["BT1-013"],
        },
        1: { deck: ["BT1-011", "BT1-014"] },
      },
      { autoSelectCards: true, autoAcceptOptional: true },
    );
    await s.ready();

    // The clause always opens a card selection ("1 of your Digimon"), so counting those decisions
    // is the crisp signal for whether a window actually ran: re-granting the same keywords to the
    // same Digimon would be invisible in board state.
    const selections = (): number =>
      s.decisions.filter(({ req }) => req.kind === "chooseTargets" || req.kind === "selectCards").length;

    await advance(s.engine).fire(EffectTiming.OnPlay, s.perm("wisemon"));
    await settle();
    expect(selections()).toBe(1);
    expect(["wisemon", "ally"].filter((alias) => observe(s.engine).hasKeyword(s.perm(alias), "Reboot"))).toHaveLength(
      1,
    );

    // Same turn, the other two printed timings: both refused, because the [Once Per Turn] is shared
    // across all three windows.
    await advance(s.engine).fire(EffectTiming.WhenDigivolving, s.perm("wisemon"));
    await settle();
    await advance(s.engine).fire(EffectTiming.OnUseAttack, s.perm("wisemon"));
    await settle();
    expect(selections()).toBe(1);
    expect(s.state.pendingDecision).toBeUndefined();

    // A real turn through the production turn loop refills the quota.
    s.state.turnSeat = 0;
    await advance(s.engine).runTurn(0);
    s.state.turnSeat = 0;

    await advance(s.engine).fire(EffectTiming.OnPlay, s.perm("wisemon"));
    await settle();
    expect(selections()).toBe(2);
  });

  it("[All Turns] fires when the opponent's attack removes YOUR security", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: CARD_ID, as: "wisemon" }],
          deck: ["BT1-010", "BT1-012"],
          security: ["BT1-013"],
        },
        1: {
          battleArea: [
            { card: "BT9-035", as: "attacker", dp: 20_000 },
            { card: "BT1-020", as: "victim", under: [{ card: PLAIN_LV4, as: "victimBase" }] },
          ],
          deck: ["BT1-011", "BT1-014"],
        },
      },
      { autoSelectCards: true, autoAcceptOptional: true, preferInstanceIds: preferred },
    );
    await s.ready();
    s.state.turnSeat = 1;
    s.state.memory = 1;
    // `autoSelectCards` otherwise picks an arbitrary legal candidate; the ＜De-Digivolve 1＞ peel is
    // only observable on the Digimon that actually has a digivolution card under it.
    preferred.push(s.perm("victim").topCard.instanceId);

    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.security.length === 0);
    await settle();

    // ＜De-Digivolve 1＞ peeled the chosen opposing Digimon's top card.
    expect(s.perm("victim").topCard.cardId).toBe(PLAIN_LV4);
    expect(s.state.players[1]!.trash.map(({ cardId }) => cardId)).toContain("BT1-020");
    // 0 security left ⇒ the "3 or fewer" gate holds and a digivolve lock lands.
    // "1 of their Digimon" — exactly one of the opponent's board, never all of it, and never the
    // controller's own Wisemon. The choice itself is free, so the assertion counts rather than
    // names it.
    const locked = ["attacker", "victim"].filter((alias) => observe(s.engine).isRestricted(s.perm(alias), "digivolve"));
    expect(locked).toHaveLength(1);
    expect(observe(s.engine).isRestricted(s.perm("wisemon"), "digivolve")).toBe(false);
  });

  it("does NOT fire when the OPPONENT's security stack is the one removed from", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: CARD_ID, as: "wisemon", dp: 20_000 }],
          deck: ["BT1-010", "BT1-012"],
          security: ["BT1-013", "BT1-011"],
        },
        1: {
          battleArea: [{ card: "BT1-020", as: "victim", under: [{ card: PLAIN_LV4, as: "victimBase" }] }],
          deck: ["BT1-011", "BT1-014"],
          security: ["BT1-013"],
        },
      },
      { autoSelectCards: true, autoAcceptOptional: true },
    );
    await s.ready();
    s.state.memory = 3;

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("wisemon").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.security.length === 0);
    await settle();

    expect(s.perm("victim").topCard.cardId).toBe("BT1-020");
    expect(observe(s.engine).isRestricted(s.perm("victim"), "digivolve")).toBe(false);
  });

  it("leaves the digivolve lock off while you still hold 4 or more security cards", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: CARD_ID, as: "wisemon" }],
          deck: ["BT1-010", "BT1-012"],
          security: ["BT1-013", "BT1-011", "BT1-012", "BT1-010", "BT1-009"],
        },
        1: {
          battleArea: [
            { card: "BT9-035", as: "attacker", dp: 20_000 },
            { card: "BT1-020", as: "victim", under: [{ card: PLAIN_LV4, as: "victimBase" }] },
          ],
          deck: ["BT1-011", "BT1-014"],
        },
      },
      { autoSelectCards: true, autoAcceptOptional: true, preferInstanceIds: preferred },
    );
    await s.ready();
    s.state.turnSeat = 1;
    s.state.memory = 1;
    // `autoSelectCards` otherwise picks an arbitrary legal candidate; the ＜De-Digivolve 1＞ peel is
    // only observable on the Digimon that actually has a digivolution card under it.
    preferred.push(s.perm("victim").topCard.instanceId);

    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.security.length === 4);
    await settle();

    // The mandatory ＜De-Digivolve 1＞ still resolved; only the gated tail was skipped.
    expect(s.perm("victim").topCard.cardId).toBe(PLAIN_LV4);
    for (const alias of ["attacker", "victim"]) {
      expect(observe(s.engine).isRestricted(s.perm(alias), "digivolve")).toBe(false);
    }
  });

  it("inherited: the host may unsuspend when your security stack is removed from", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT1-020", as: "host", suspended: true, under: [CARD_ID] }],
          deck: ["BT1-010", "BT1-012"],
          security: ["BT1-013"],
        },
        1: {
          battleArea: [{ card: "BT9-035", as: "attacker", dp: 20_000 }],
          deck: ["BT1-011", "BT1-014"],
        },
      },
      { autoSelectCards: true, autoAcceptOptional: true },
    );
    await s.ready();
    s.state.turnSeat = 1;
    s.state.memory = 1;
    expect(s.perm("host").isSuspended).toBe(true);

    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.security.length === 0);
    await settle();

    expect(s.perm("host").isSuspended).toBe(false);
  });

  it("digivolves from a BLUE Lv.4 [Witchelny]-text source for 3 and refuses a plain Lv.4", async () => {
    const legal = setupEngine({
      0: {
        battleArea: [{ card: WITCHELNY_LV4, as: "base" }],
        hand: [{ card: CARD_ID, as: "wisemon" }],
        deck: [{ card: "BT1-010", as: "evolutionDraw" }, "BT1-012"],
        security: ["BT1-013"],
      },
      1: { deck: ["BT1-011"] },
    });
    legal.state.memory = 8;
    await legal.ready();
    const baseInstanceId = legal.perm("base").topCard.instanceId;

    expect(
      legal.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: legal.perm("base").permanentId,
        instanceId: legal.inst("wisemon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => legal.perm("base").topCard.instanceId === legal.inst("wisemon").instanceId);
    // Cost 3 off the alternate header, not the Yellow-only EvoCost's 4.
    expect(legal.state.memory).toBe(5);
    expect(legal.perm("base").stack.map((card) => card.instanceId)).toEqual([baseInstanceId]);

    const illegal = setupEngine({
      0: {
        battleArea: [{ card: PLAIN_LV4, as: "base" }],
        hand: [{ card: CARD_ID, as: "wisemon" }],
        deck: ["BT1-010"],
        security: ["BT1-013"],
      },
      1: { deck: ["BT1-011"] },
    });
    illegal.state.memory = 8;
    await illegal.ready();
    expect(
      illegal.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: illegal.perm("base").permanentId,
        instanceId: illegal.inst("wisemon").instanceId,
      }),
    ).toEqual({ ok: false, reason: "invalid-evolution" });
    expect(illegal.state.memory).toBe(8);
  });
});
