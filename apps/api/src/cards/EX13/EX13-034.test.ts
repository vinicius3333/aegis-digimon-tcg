import { EffectTiming, getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { compiled } from "./EX13-034.js";
import "../index.js";

const CARD_ID = "EX13-034";
const WITCHELNY_LV4 = "EX7-019";
const PLAIN_LV4 = "BT1-014";
const DE_DIGIVOLVE_OPTION = "BT14-098";

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

    const selections = (): number =>
      s.decisions.filter(({ req }) => req.kind === "chooseTargets" || req.kind === "selectCards").length;

    await advance(s.engine).fire(EffectTiming.OnPlay, s.perm("wisemon"));
    await settle();
    expect(selections()).toBe(1);
    expect(["wisemon", "ally"].filter((alias) => observe(s.engine).hasKeyword(s.perm(alias), "Reboot"))).toHaveLength(
      1,
    );

    await advance(s.engine).fire(EffectTiming.WhenDigivolving, s.perm("wisemon"));
    await settle();
    await advance(s.engine).fire(EffectTiming.OnUseAttack, s.perm("wisemon"));
    await settle();
    expect(selections()).toBe(1);
    expect(s.state.pendingDecision).toBeUndefined();

    s.state.turnSeat = 0;
    await advance(s.engine).runTurn(0);
    s.state.turnSeat = 0;

    await advance(s.engine).fire(EffectTiming.OnPlay, s.perm("wisemon"));
    await settle();
    expect(selections()).toBe(2);
  });

  it("Q7314: resolves the checked [Security] effect before Wisemon's security-removal trigger", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: CARD_ID, as: "wisemon" }],
          deck: ["BT1-010", "BT1-012"],
          security: ["BT10-087"],
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

    const triggerOrder = s.events
      .filter((event) => event.kind === "effectTriggered")
      .map((event) => `${event.sourceCardId}/${event.timing}`);
    expect(triggerOrder).toContain("BT10-087/OnPlay");
    expect(triggerOrder).toContain("EX13-034/whenSecurityRemoved");
    expect(triggerOrder.indexOf("BT10-087/OnPlay")).toBeLessThan(triggerOrder.indexOf("EX13-034/whenSecurityRemoved"));

    expect(s.perm("victim").topCard.cardId).toBe(PLAIN_LV4);
    expect(s.state.players[1]!.trash.map(({ cardId }) => cardId)).toContain("BT1-020");
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

  it("Q7313: matches [Witchelny] anywhere in a Lv.4 card's text and refuses a plain Lv.4", async () => {
    const legal = setupEngine(
      {
        0: {
          battleArea: [{ card: WITCHELNY_LV4, as: "base" }],
          hand: [{ card: CARD_ID, as: "wisemon" }],
          deck: [{ card: "BT1-010", as: "evolutionDraw" }, "BT1-012"],
          security: ["BT1-013"],
        },
        1: { deck: ["BT1-011"] },
      },
      { autoSelectCards: true, autoAcceptOptional: true },
    );
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
    expect(legal.state.memory).toBe(5);
    expect(legal.perm("base").stack.map((card) => card.instanceId)).toEqual([baseInstanceId]);
    await settle();
    expect(observe(legal.engine).hasKeyword(legal.perm("base"), "Reboot")).toBe(true);
    expect(observe(legal.engine).hasKeyword(legal.perm("base"), "Blocker")).toBe(true);
    expect(observe(legal.engine).isRestricted(legal.perm("base"), "cantBeDeDigivolved")).toBe(true);

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

  it("refuses the OPPONENT's ＜De-Digivolve＞ on the protected Digimon but lands it on an unprotected one", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: CARD_ID, as: "wisemon" },
            { card: "BT1-020", as: "guarded", under: [{ card: PLAIN_LV4, as: "guardedBase" }] },
            { card: "BT1-020", as: "control", under: [{ card: PLAIN_LV4, as: "controlBase" }] },
          ],
          deck: ["BT1-010", "BT1-012"],
          security: ["BT1-013"],
        },
        1: {
          battleArea: [{ card: "BT3-059", as: "blackAnchor" }],
          hand: [
            { card: DE_DIGIVOLVE_OPTION, as: "optionA" },
            { card: DE_DIGIVOLVE_OPTION, as: "optionB" },
          ],
          deck: ["BT1-011", "BT1-012"],
        },
      },
      { autoSelectCards: true, autoAcceptOptional: true, preferInstanceIds: preferred },
    );
    await s.ready();
    s.state.memory = 5;
    preferred.push(s.perm("guarded").topCard.instanceId);

    await advance(s.engine).fire(EffectTiming.OnPlay, s.perm("wisemon"));
    await settle();
    expect(observe(s.engine).isRestricted(s.perm("guarded"), "cantBeDeDigivolved")).toBe(true);
    expect(observe(s.engine).isRestricted(s.perm("control"), "cantBeDeDigivolved")).toBe(false);

    s.state.turnSeat = 1;
    s.state.memory = 0;
    expect(s.engine.applyIntent(1, { type: "playCard", instanceId: s.inst("optionA").instanceId })).toEqual({
      ok: true,
    });
    await settle();
    expect(s.perm("guarded").topCard.cardId).toBe("BT1-020");
    expect(s.perm("guarded").stack.map((card) => card.cardId)).toEqual([PLAIN_LV4]);
    expect(s.state.players[0]!.trash.map(({ cardId }) => cardId)).not.toContain("BT1-020");

    preferred.length = 0;
    preferred.push(s.perm("control").topCard.instanceId);
    s.state.memory = 0;
    expect(s.engine.applyIntent(1, { type: "playCard", instanceId: s.inst("optionB").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.perm("control").topCard.cardId === PLAIN_LV4);
    expect(s.perm("control").stack).toHaveLength(0);
    expect(observe(s.engine).isRestricted(s.perm("guarded"), "cantBeDeDigivolved")).toBe(true);
  });

  it("keeps the grant through the opponent's turn, unsuspends on ＜Reboot＞, and expires at that turn's end", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: CARD_ID, as: "wisemon" },
            { card: "BT1-020", as: "ally" },
          ],
          deck: ["BT1-010", "BT1-012", "BT1-013", "BT1-009"],
          security: ["BT1-013"],
        },
        1: { deck: ["BT1-011", "BT1-014", "BT1-012", "BT1-009"], security: ["BT1-013"] },
      },
      { autoSelectCards: true, autoAcceptOptional: true, preferInstanceIds: preferred },
    );
    await s.ready();
    s.state.memory = 5;
    preferred.push(s.perm("ally").topCard.instanceId);

    await advance(s.engine).fire(EffectTiming.OnPlay, s.perm("wisemon"));
    await settle();
    expect(observe(s.engine).hasKeyword(s.perm("ally"), "Reboot")).toBe(true);

    await advance(s.engine).runTurn(0);
    s.perm("ally").isSuspended = true;
    s.state.turnSeat = 1;
    s.state.memory = 0;
    const opponentTurn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(1);

    expect(s.perm("ally").isSuspended).toBe(false);
    expect(observe(s.engine).hasKeyword(s.perm("ally"), "Blocker")).toBe(true);
    expect(observe(s.engine).isRestricted(s.perm("ally"), "cantBeDeDigivolved")).toBe(true);

    advance(s.engine).endMainPhaseIfOpen(1);
    await opponentTurn;

    expect(observe(s.engine).hasKeyword(s.perm("ally"), "Reboot")).toBe(false);
    expect(observe(s.engine).hasKeyword(s.perm("ally"), "Blocker")).toBe(false);
    expect(observe(s.engine).isRestricted(s.perm("ally"), "cantBeDeDigivolved")).toBe(false);
  });

  it("＜De-Digivolve 1＞ on a Digimon with no digivolution cards does nothing — it is not deleted", async () => {
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
            { card: "BT1-012", as: "bare" },
          ],
          deck: ["BT1-011", "BT1-014"],
        },
      },
      { autoSelectCards: true, autoAcceptOptional: true, preferInstanceIds: preferred },
    );
    await s.ready();
    s.state.turnSeat = 1;
    s.state.memory = 1;
    const bareInstanceId = s.perm("bare").topCard.instanceId;
    preferred.push(bareInstanceId);

    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.security.length === 0);
    await settle();

    expect(s.state.players[1]!.battleArea.some((permanent) => permanent.topCard?.instanceId === bareInstanceId)).toBe(
      true,
    );
    expect(s.perm("bare").stack).toHaveLength(0);
    expect(s.perm("bare").topCard.cardId).toBe("BT1-012");
    expect(s.state.players[1]!.trash.map(({ cardId }) => cardId)).not.toContain("BT1-012");
  });

  it("the digivolve lock refuses a public digivolve on the locked Digimon, spares the rest, and expires after their turn", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: CARD_ID, as: "wisemon" }],
          deck: ["BT1-010", "BT1-012", "BT1-013"],
          security: ["BT1-013"],
        },
        1: {
          battleArea: [
            { card: PLAIN_LV4, as: "attacker", dp: 20_000 },
            { card: PLAIN_LV4, as: "locked", under: [{ card: PLAIN_LV4, as: "lockedBase" }] },
          ],
          hand: [
            { card: "BT1-020", as: "evoA" },
            { card: "BT1-020", as: "evoB" },
          ],
          deck: ["BT1-011", "BT1-012", "BT1-009"],
          security: ["BT1-013"],
        },
      },
      { autoSelectCards: true, autoAcceptOptional: true, preferInstanceIds: preferred },
    );
    await s.ready();
    s.state.turnSeat = 1;
    s.state.memory = 0;
    preferred.push(s.perm("locked").topCard.instanceId);

    const opponentTurn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(1);

    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.security.length === 0);
    await settle();

    const lockedAliases = ["attacker", "locked"].filter((alias) =>
      observe(s.engine).isRestricted(s.perm(alias), "digivolve"),
    );
    expect(lockedAliases).toHaveLength(1);
    const lockedAlias = lockedAliases[0]!;
    const freeAlias = lockedAlias === "attacker" ? "locked" : "attacker";
    expect(s.perm(lockedAlias).topCard.cardId).toBe(PLAIN_LV4);
    expect(s.perm(freeAlias).topCard.cardId).toBe(PLAIN_LV4);

    s.state.memory = 0;
    const lockedTopInstanceId = s.perm(lockedAlias).topCard.instanceId;
    const refused = s.engine.applyIntent(1, {
      type: "digivolve",
      permanentId: s.perm(lockedAlias).permanentId,
      instanceId: s.inst("evoA").instanceId,
    });
    expect(refused.ok).toBe(false);
    expect(s.perm(lockedAlias).topCard.instanceId).toBe(lockedTopInstanceId);
    expect(s.state.players[1]!.hand.map(({ instanceId }) => instanceId)).toContain(s.inst("evoA").instanceId);
    expect(s.state.memory).toBe(0);

    expect(
      s.engine.applyIntent(1, {
        type: "digivolve",
        permanentId: s.perm(freeAlias).permanentId,
        instanceId: s.inst("evoB").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm(freeAlias).topCard.cardId === "BT1-020");

    advance(s.engine).endMainPhaseIfOpen(1);
    await opponentTurn;
    expect(observe(s.engine).isRestricted(s.perm(lockedAlias), "digivolve")).toBe(false);
  });

  it("inherited: the host may DECLINE the unsuspend, and the watcher is once per turn", async () => {
    const declining = setupEngine(
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
      { autoDeclineOptional: true },
    );
    await declining.ready();
    declining.state.turnSeat = 1;
    declining.state.memory = 1;

    expect(
      declining.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: declining.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => declining.state.players[0]!.security.length === 0);
    await settle();

    expect(declining.perm("host").isSuspended).toBe(true);

    const opt = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT1-020", as: "host", suspended: true, under: [CARD_ID] }],
          deck: ["BT1-010", "BT1-012"],
          security: ["BT1-013", "BT1-011"],
        },
        1: {
          battleArea: [
            { card: "BT9-035", as: "attackerA", dp: 20_000 },
            { card: "BT9-035", as: "attackerB", dp: 20_000 },
          ],
          deck: ["BT1-011", "BT1-014"],
        },
      },
      { autoSelectCards: true, autoAcceptOptional: true },
    );
    await opt.ready();
    opt.state.turnSeat = 1;
    opt.state.memory = 1;

    expect(
      opt.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: opt.perm("attackerA").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => opt.state.players[0]!.security.length === 1);
    await settle();
    expect(opt.perm("host").isSuspended).toBe(false);

    opt.perm("host").isSuspended = true;
    expect(
      opt.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: opt.perm("attackerB").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => opt.state.players[0]!.security.length === 0);
    await settle();
    expect(opt.perm("host").isSuspended).toBe(true);
  });
});
