import { describe, expect, it } from "vitest";
import { EffectDuration } from "@aegis/shared";
import { requireCardDefinition } from "@aegis/shared/cards/registry";
import { advance } from "#api/engine/testkit/advance";
import { assertNoLoudGap, setupEngine, settle } from "#api/engine/testkit/harness";
import type { BoardSpec } from "#api/engine/scenario/types";
import { observe } from "#api/engine/testkit/observe";
import { compiled } from "#api/cards/BT27/BT27-071";
import "#api/cards/index";

const darkdramon = "BT27-071";
const thunderbirdmon = "BT27-026";
const quetzalmon = "BT27-038";
const kurataTamer = "BT27-098";
const traitlessTamer = "BT1-085";
const blackUltimate = "BT2-060";
const greenUltimate = "BT3-053";
const filler = Array(20).fill("BT1-013");
const securityFiller = Array(3).fill("BT1-009");

describe("Darkdramon gains immunity, de-digivolves on attack or Counter, and can't digivolve", () => {
  it("prints black and purple Mega stats and compiles every clause", () => {
    expect(requireCardDefinition(darkdramon)).toMatchObject({
      nameEn: "Darkdramon",
      nameJp: "ダークドラモン",
      colors: ["Black", "Purple"],
      level: 6,
      playCost: 11,
      dp: 11000,
      evoCosts: [
        { color: "Black", level: 5, memoryCost: 4 },
        { color: "Purple", level: 5, memoryCost: 4 },
      ],
      forms: ["Mega"],
      attributes: ["Virus"],
      types: ["Cyborg", "Kurata's Army", "Bio"],
      rarity: "R",
    });
    expect(compiled).toMatchObject({ coverage: "full", residual: [] });
    expect(compiled.digivolutionRequirement).toEqual([
      { namesExact: ["Thunderbirdmon"], traits: ["Bio"], cost: 5, isAlternate: true },
      { baseIsTamer: true, traits: ["Kurata's Army"], cost: 7, isAlternate: true },
    ]);
    const bodies = compiled.effects.filter(({ sharedUseKey }) => sharedUseKey === "BT27-071/de-digivolve");
    expect(bodies.map(({ trigger }) => trigger)).toEqual(["WhenAttacking", "Counter"]);
    expect(bodies.every(({ frequency, isFromHand }) => frequency === "OncePerTurn" && isFromHand === undefined)).toBe(
      true,
    );
  });

  it("has Reboot, Blocker, and Armor Purge and can't digivolve", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: darkdramon, as: "darkdramon" }] } });
    await s.ready();
    const view = observe(s.engine);
    expect(view.hasKeyword(s.perm("darkdramon"), "Reboot")).toBe(true);
    expect(view.hasKeyword(s.perm("darkdramon"), "Blocker")).toBe(true);
    expect(view.hasKeyword(s.perm("darkdramon"), "Armor Purge")).toBe(true);
    expect(view.isRestricted(s.perm("darkdramon"), "digivolve")).toBe(true);
  });

  it.each([
    ["a [Bio] Thunderbirdmon for 5", thunderbirdmon, true, true, 5],
    ["a [Bio] Armor Form with another name", quetzalmon, true, false, 0],
    ["a Kurata's Army Tamer for 7", kurataTamer, true, true, 7],
    ["a traitless Tamer", traitlessTamer, true, false, 0],
    ["a black level 5 Digimon for its printed 4", blackUltimate, false, true, 4],
    ["a green level 5 Digimon", greenUltimate, false, false, 0],
  ])("digivolves from %s", async (_label, base, useAlternateCost, allowed, cost) => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: base, as: "base" }], hand: [{ card: darkdramon, as: "darkdramon" }], deck: filler },
      },
      { autoDeclineOptional: true },
    );
    s.state.memory = 8;
    await s.ready();
    const result = s.engine.applyIntent(0, {
      type: "digivolve",
      permanentId: s.perm("base").permanentId,
      instanceId: s.inst("darkdramon").instanceId,
      useAlternateCost,
    });
    expect(result.ok).toBe(allowed);
    if (allowed) await settle(() => s.perm("base").topCard.cardId === darkdramon && !s.state.pendingDecision);
    expect(s.state.memory).toBe(8 - cost);
    expect(s.perm("base").topCard.cardId).toBe(allowed ? darkdramon : base);
  });

  it("is unaffected by opposing Digimon effects from digivolving until the end of their turn", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: darkdramon, as: "darkdramon" }, "BT1-013"],
          battleArea: [{ card: blackUltimate, as: "base" }],
          deck: filler,
          security: securityFiller,
        },
        1: { deck: filler, security: securityFiller },
      },
      { autoAcceptOptional: true, autoSelectCards: true, declinePrompts: ["Attack"] },
    );
    await s.ready();
    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    s.state.memory = 10;
    expect(s.perm("base").immuneToOpponentDigimonEffects).toBeFalsy();
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("darkdramon").instanceId,
      }).ok,
    ).toBe(true);
    await settle(() => s.perm("base").topCard.cardId === darkdramon && !s.state.pendingDecision);
    expect(s.perm("base").immuneToOpponentDigimonEffects).toBe(true);
    assertNoLoudGap(s);

    expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
    await advance(s.engine).waitForMainPhase(1);
    expect(s.perm("base").immuneToOpponentDigimonEffects).toBe(true);

    expect(s.engine.applyIntent(1, { type: "endPhase" })).toEqual({ ok: true });
    await advance(s.engine).waitForMainPhase(0);
    expect(s.perm("base").immuneToOpponentDigimonEffects).toBeFalsy();
    expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  it("de-digivolves 1 opposing Digimon by 2 when attacking", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: darkdramon, as: "darkdramon" }], deck: filler, security: securityFiller },
        1: {
          battleArea: [{ card: "BT1-024", as: "target", under: ["BT1-009", "BT1-020"] }],
          security: securityFiller,
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, declinePrompts: ["block"] },
    );
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("darkdramon").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => !s.state.pendingDecision && s.state.players[1]!.security.length === 2);
    expect(s.perm("target").topCard.cardId).toBe("BT1-009");
    expect(s.perm("target").stack).toHaveLength(0);
    expect(s.state.players[1]!.trash.map(({ cardId }) => cardId)).toEqual(
      expect.arrayContaining(["BT1-020", "BT1-024"]),
    );
  });

  it("de-digivolves the attacker from the Counter window on the opponent's turn", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: darkdramon, as: "darkdramon" }],
          deck: filler,
          security: securityFiller,
        },
        1: {
          battleArea: [{ card: "BT1-024", as: "attacker", under: ["BT1-009", "BT1-020"] }],
          deck: filler,
          security: securityFiller,
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true },
    );
    await s.ready();
    s.state.turnSeat = 1;
    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.events.some((event) => event.kind === "counterWindowOpened"));
    const opened = s.events.find((event) => event.kind === "counterWindowOpened");
    if (opened?.kind !== "counterWindowOpened") throw new Error("counter window did not open");
    const eligible = opened.eligibleCounters.find(
      (entry) => entry.instanceId === s.perm("darkdramon").topCard.instanceId,
    );
    expect(eligible).toBeDefined();

    expect(
      s.engine.applyIntent(0, {
        type: "respondCounter",
        sourceInstanceId: eligible!.instanceId,
        effectKey: eligible!.effectKey,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("attacker").topCard.cardId === "BT1-009");
    expect(s.perm("attacker").stack).toHaveLength(0);
    expect(s.state.players[1]!.trash.map(({ cardId }) => cardId).sort()).toEqual(["BT1-020", "BT1-024"]);
  });
});

describe("Darkdramon official rulings", () => {
  type Board = BoardSpec;
  type Session = ReturnType<typeof setupEngine>;

  async function digivolveDarkdramon(
    base: { card: string; enteredThisTurn?: boolean; dp?: number },
    opponent: NonNullable<Board[1]> = { deck: filler, security: securityFiller },
    useAlternateCost = true,
    beforeDigivolving: (s: Session) => Promise<void> = async () => {},
  ) {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ ...base, as: "base" }],
          hand: [{ card: darkdramon, as: "darkdramon" }],
          deck: filler,
          security: securityFiller,
        },
        1: opponent,
      },
      { autoAcceptOptional: true, autoSelectCards: true, declinePrompts: ["block"] },
    );
    await s.ready();
    await beforeDigivolving(s);
    s.state.memory = 10;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("darkdramon").instanceId,
        useAlternateCost,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard.cardId === darkdramon && !s.state.pendingDecision);
    return s;
  }

  async function attackWithBase(s: Session, target: { kind: "player" } | { kind: "permanent"; permanentId: string }) {
    expect(
      s.engine.applyIntent(0, { type: "attack", attackerPermanentId: s.perm("base").permanentId, target }),
    ).toEqual({ ok: true });
    await advance(s.engine).finishAttack();
    await settle(() => !observe(s.engine).isAttacking() && !s.state.pendingDecision);
  }

  it("still triggers its own When Digivolving effect when digivolving from a Tamer", async () => {
    const s = await digivolveDarkdramon({ card: kurataTamer });
    expect(s.state.memory).toBe(3);
    expect(s.perm("base").immuneToOpponentDigimonEffects).toBe(true);
  });

  it("performs the digivolution bonus draw when digivolving from a Tamer", async () => {
    const s = await digivolveDarkdramon({ card: kurataTamer });
    expect(s.state.players[0]!.hand.map(({ cardId }) => cardId)).toEqual(["BT1-013"]);
    expect(s.state.players[0]!.deck).toHaveLength(filler.length - 1);
  });

  it("can't attack after digivolving from a Tamer played this turn", async () => {
    const s = await digivolveDarkdramon({ card: kurataTamer, enteredThisTurn: true });
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("base").permanentId,
        target: { kind: "player" },
      }).ok,
    ).toBe(false);
    expect(s.state.players[1]!.security).toHaveLength(securityFiller.length);
  });

  it("trashes the Tamer digivolution card with the rest of the stack when it is deleted", async () => {
    const s = setupEngine(
      { 0: { battleArea: [{ card: darkdramon, as: "darkdramon", under: [kurataTamer] }] } },
      { autoDeclineOptional: true },
    );
    await s.ready();
    const removal = advance(s.engine).verb.deletePermanent([s.perm("darkdramon").permanentId], "byEffect");
    await settle(() => s.state.pendingDecision !== undefined);
    const armorPurge = s.decisions.at(-1)!.req;
    expect(armorPurge.options?.promptKey).toBe("armorPurge");
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: armorPurge.decisionId,
        response: { kind: "selectCards", instanceIds: [] },
      }),
    ).toEqual({ ok: true });
    expect(await removal).toBe(1);
    await settle(() => !s.state.pendingDecision);
    expect(s.state.players[0]!.battleArea).toHaveLength(0);
    expect(s.state.players[0]!.trash.map(({ cardId }) => cardId).sort()).toEqual([kurataTamer, darkdramon].sort());
  });

  it("gains the inherited effect of a Tamer in its digivolution cards", async () => {
    const s = await digivolveDarkdramon(
      { card: "BT27-092" },
      { battleArea: [{ card: "BT1-019", as: "victim" }], deck: filler, security: securityFiller },
    );
    await attackWithBase(s, { kind: "player" });
    expect(s.state.players[1]!.battleArea).toHaveLength(0);
    expect(s.state.players[1]!.trash.map(({ cardId }) => cardId)).toContain("BT1-019");
  });

  it("becomes a Tamer and leaves the attack when Armor Purge exposes only a Tamer", async () => {
    const s = await digivolveDarkdramon(
      { card: kurataTamer },
      { battleArea: [{ card: "BT1-084", as: "defender", suspended: true }], deck: filler, security: securityFiller },
    );
    await attackWithBase(s, { kind: "permanent", permanentId: s.perm("defender").permanentId });
    expect(s.perm("base").topCard.cardId).toBe(kurataTamer);
    expect(s.perm("base").stack).toHaveLength(0);
    expect(s.state.players[0]!.trash.map(({ cardId }) => cardId)).toEqual([darkdramon]);
    expect(s.state.players[1]!.battleArea.map(({ topCard }) => topCard.cardId)).toEqual(["BT1-084"]);
  });

  it("digivolves from a [Bio] Thunderbirdmon in the breeding area", async () => {
    const s = setupEngine(
      {
        0: {
          breeding: { card: thunderbirdmon, as: "base" },
          hand: [{ card: darkdramon, as: "darkdramon" }],
          deck: filler,
        },
      },
      { autoDeclineOptional: true },
    );
    await s.ready();
    s.state.memory = 8;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("darkdramon").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.breeding?.topCard.cardId === darkdramon && !s.state.pendingDecision);
    expect(s.state.memory).toBe(3);
  });

  it("isn't suspended by an opponent's Digimon effect after digivolving", async () => {
    const s = await digivolveDarkdramon({ card: blackUltimate }, undefined, false);
    advance(s.engine).verb.enterEffectResolution(1, ["Digimon"]);
    await advance(s.engine).verb.suspend([s.perm("base").permanentId], 1);
    advance(s.engine).verb.leaveEffectResolution();
    expect(s.perm("base").isSuspended).toBe(false);
  });

  it("can still be chosen by an opponent's Digimon effect it isn't affected by", async () => {
    const s = await digivolveDarkdramon(
      { card: blackUltimate },
      { hand: [{ card: "BT25-049", as: "suspender" }], deck: filler, security: securityFiller },
      false,
    );
    expect(s.perm("base").immuneToOpponentDigimonEffects).toBe(true);
    s.state.turnSeat = 1;
    s.state.memory = 10;
    expect(s.engine.applyIntent(1, { type: "playCard", instanceId: s.inst("suspender").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[1]!.battleArea.length === 1 && !s.state.pendingDecision);
    const darkdramonIds = [s.perm("base").permanentId, s.perm("base").topCard.instanceId];
    const choice = s.decisions.find(({ req }) => req.kind === "chooseTargets" && req.sourceCardId === "BT25-049");
    expect(choice?.req.options?.candidateInstanceIds?.some((id) => darkdramonIds.includes(id))).toBe(true);
    expect(s.perm("base").isSuspended).toBe(false);
  });

  it("stops an opponent's Digimon DP reduction once it gains the immunity", async () => {
    const s = await digivolveDarkdramon({ card: blackUltimate }, undefined, false, async (session) => {
      advance(session.engine).verb.enterEffectResolution(1, ["Digimon"]);
      await advance(session.engine).verb.modifyDP(
        session.perm("base").permanentId,
        -3000,
        EffectDuration.UntilOpponentTurnEnd,
      );
      advance(session.engine).verb.leaveEffectResolution();
      expect(session.perm("base").currentDP).toBe(6000);
    });
    expect(s.perm("base").currentDP).toBe(11000);
  });

  it("activates only 1 Counter effect per attack", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: darkdramon, as: "first" },
            { card: darkdramon, as: "second" },
          ],
          deck: filler,
          security: securityFiller,
        },
        1: {
          battleArea: [{ card: "BT1-080", as: "attacker", under: ["BT1-009", "BT1-019", "BT1-024"] }],
          deck: filler,
          security: securityFiller,
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true },
    );
    await s.ready();
    s.state.turnSeat = 1;
    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.events.some((event) => event.kind === "counterWindowOpened"));
    const opened = s.events.find((event) => event.kind === "counterWindowOpened");
    if (opened?.kind !== "counterWindowOpened") throw new Error("counter window did not open");
    const eligible = opened.eligibleCounters.find((entry) => entry.instanceId === s.perm("first").topCard.instanceId);
    expect(opened.eligibleCounters.map(({ instanceId }) => instanceId)).toContain(s.perm("second").topCard.instanceId);
    expect(
      s.engine.applyIntent(0, {
        type: "respondCounter",
        sourceInstanceId: eligible!.instanceId,
        effectKey: eligible!.effectKey,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("attacker").topCard.cardId === "BT1-019" && !s.state.pendingDecision);
    expect(s.events.filter((event) => event.kind === "counterWindowOpened")).toHaveLength(1);
    expect(s.perm("attacker").topCard.cardId).toBe("BT1-019");
    expect(s.perm("attacker").stack.map(({ cardId }) => cardId)).toEqual(["BT1-009"]);
  });
});
