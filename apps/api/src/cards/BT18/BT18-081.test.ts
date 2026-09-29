import { describe, expect, it } from "vitest";
import { Phase } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle, type EngineSetup, type PermanentSpec } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { compiled } from "./BT18-081.js";
import "../BT13/BT13-007.js";
import "../BT16/BT16-084.js";
import "../BT1/BT1-060.js";
import "../BT1/BT1-087.js";
import "./BT18-088.js";

describe("BT18-081 Rhihimon", () => {
  it("proves the hand-only exact-name two-material Tamer digivolution and all printed clauses", () => {
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
    expect(compiled.effects[0]).toMatchObject({
      trigger: "Main",
      isFromHand: true,
      actions: [
        {
          kind: "Digivolve",
          from: ["hand"],
          payCost: true,
          costOverride: 3,
          ignoreRequirements: true,
          target: {
            filter: { kind: ["Tamer"], colors: ["Purple", "Yellow"] },
            fromSelectionRef: "rhihimonHost",
          },
          cost: {
            kind: "place",
            bindHostAs: "rhihimonHost",
            target: {
              filter: { zone: "trash", nameOrTrait: [{ tokens: ["Loweemon"], match: "nameExact" }] },
            },
          },
          additionalCosts: [
            {
              kind: "place",
              host: { filter: { boundRef: "rhihimonHost" }, count: 1 },
              target: {
                filter: { zone: "trash", nameOrTrait: [{ tokens: ["KaiserLeomon"], match: "nameExact" }] },
                count: 1,
              },
            },
          ],
        },
      ],
    });
    expect(compiled.effects[1]).toMatchObject({ trigger: "Static", keywords: [{ keyword: "Jamming" }] });
    expect(compiled.effects[2]).toMatchObject({
      trigger: "WhenDigivolving",
      actions: [
        {
          kind: "PlayWithoutCost",
          from: ["trash"],
          payCost: false,
          optional: true,
          target: { filter: { kind: ["Tamer"], hasInheritedEffects: true } },
        },
      ],
    });
    expect(compiled.effects[3]).toMatchObject({
      trigger: "WhenAttacking",
      isInherited: true,
      frequency: "OncePerTurn",
      actions: [{ kind: "ModifyDP", amount: -4000, duration: "forTheTurn" }],
    });
  });

  it("naturally places both named materials under the selected Tamer before hand digivolving it", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT1-087", as: "yellowTamer" },
            { card: "BT10-093", as: "purpleTamer" },
          ],
          hand: [{ card: "BT18-081", as: "rhihimon" }],
          trash: [
            { card: "BT18-076", as: "loweemon" },
            { card: "BT18-077", as: "kaiserLeomon" },
            { card: "BT18-088", as: "inheritedTamer" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 3;
    await s.ready();
    const effect = JSON.parse(s.inst("rhihimon").activatableEffectsJson) as Array<{ effectKey: string }>;

    expect(
      s.engine.applyIntent(0, {
        type: "activateEffect",
        sourceInstanceId: s.inst("rhihimon").instanceId,
        effectKey: effect[0]!.effectKey,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("yellowTamer").topCard?.cardId === "BT18-081");

    expect(s.perm("yellowTamer").stack.map((card) => card.cardId)).toEqual(["BT18-077", "BT18-076", "BT1-087"]);
    expect(s.perm("purpleTamer").stack).toHaveLength(0);
    expect(s.perm("purpleTamer").topCard?.cardId).toBe("BT10-093");
    expect(
      s.state.players[0]!.battleArea.some((perm) => perm.topCard?.instanceId === s.inst("inheritedTamer").instanceId),
    ).toBe(true);
  });

  it("refuses the hand effect when either named material is missing", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT1-087", as: "yellowTamer" }],
        hand: [{ card: "BT18-081", as: "rhihimon" }],
        trash: [{ card: "BT18-076", as: "loweemon" }],
      },
    });
    await s.ready();
    expect(s.inst("rhihimon").activatableEffectsJson).toBe("");
    expect(s.perm("yellowTamer").topCard?.cardId).toBe("BT1-087");
    expect(s.state.players[0]!.trash.some((card) => card.instanceId === s.inst("loweemon").instanceId)).toBe(true);
  });

  it("allows refusal of the optional Tamer play after the hand digivolution", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT1-087", as: "yellowTamer" }],
          hand: [{ card: "BT18-081", as: "rhihimon" }],
          trash: [
            { card: "BT18-076", as: "loweemon" },
            { card: "BT18-077", as: "kaiserLeomon" },
            { card: "BT18-088", as: "inheritedTamer" },
          ],
        },
      },
      { autoDeclineOptional: true },
    );
    s.state.memory = 3;
    await s.ready();
    const effect = JSON.parse(s.inst("rhihimon").activatableEffectsJson) as Array<{ effectKey: string }>;
    expect(
      s.engine.applyIntent(0, {
        type: "activateEffect",
        sourceInstanceId: s.inst("rhihimon").instanceId,
        effectKey: effect[0]!.effectKey,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("yellowTamer").topCard?.cardId === "BT18-081");
    expect(s.state.players[0]!.trash.some((card) => card.instanceId === s.inst("inheritedTamer").instanceId)).toBe(
      true,
    );
    expect(
      s.state.players[0]!.battleArea.some((perm) => perm.topCard?.instanceId === s.inst("inheritedTamer").instanceId),
    ).toBe(false);
  });

  it("resets the inherited once-per-turn DP reduction on the next turn", async () => {
    const s = setupEngine(
      {
        0: { deck: ["BT1-009", "BT1-013"], battleArea: [{ card: "BT1-060", as: "host", under: ["BT18-081"] }] },
        1: {
          deck: ["BT1-009", "BT1-013"],
          battleArea: [{ card: "BT1-060", as: "target", dp: 10000 }],
          security: ["BT1-011", "BT1-011"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.turnSeat = 0;
    s.state.memory = 10;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("target").currentDP === 6000);
    expect(s.perm("target").currentDP).toBe(6000);

    s.state.turnSeat = 1;
    await advance(s.engine).runTurn(1);
    expect(s.perm("target").currentDP).toBe(10000);
    s.state.turnSeat = 0;
    s.state.phase = Phase.Main;
    s.state.memory = 3;
    s.perm("host").isSuspended = false;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("target").currentDP === 6000);
    expect(s.perm("target").currentDP).toBe(6000);
  });
});

const RHIHIMON = "BT18-081";
const LOWEEMON = "BT18-076";
const KAISERLEOMON = "BT18-077";
const YELLOW_TAMER = "BT1-087";
const TAKUYA_AND_KOJI = "BT18-088";
const YOLEI_AND_KARI = "BT16-084";
const KING_DRASIL_7D6 = "BT13-007";
const REPPAMON = "BT1-051";
const SIRENMON = "BT1-057";
const FILLER = ["BT1-009", "BT1-013", "BT1-009", "BT1-013"];

function rhihimonHandEffectKey(s: EngineSetup, alias = "rhihimon"): string | undefined {
  const json = s.inst(alias).activatableEffectsJson;
  if (json === "") return undefined;
  return (JSON.parse(json) as Array<{ effectKey: string }>)[0]?.effectKey;
}

function activateRhihimonFromHand(s: EngineSetup, effectKey: string, alias = "rhihimon") {
  return s.engine.applyIntent(0, {
    type: "activateEffect",
    sourceInstanceId: s.inst(alias).instanceId,
    effectKey,
  });
}

function isInTrash(s: EngineSetup, alias: string): boolean {
  return s.state.players[0]!.trash.some((card) => card.instanceId === s.inst(alias).instanceId);
}

function rhihimonBoard(extraBattleArea: PermanentSpec[] = [], tamer: Pick<PermanentSpec, "enteredThisTurn"> = {}) {
  return {
    0: {
      deck: [...FILLER],
      battleArea: [{ card: YELLOW_TAMER, as: "tamer", ...tamer }, ...extraBattleArea],
      hand: [{ card: RHIHIMON, as: "rhihimon" }],
      trash: [
        { card: LOWEEMON, as: "loweemon" },
        { card: KAISERLEOMON, as: "kaiserLeomon" },
      ],
    },
    1: { deck: [...FILLER], security: ["BT1-011", "BT1-011"] },
  };
}

describe("BT18-081 Rhihimon — KB Q&A rulings", () => {
  it("activates its [Hand] [Main] effect only while the card is in the hand (Q3038)", async () => {
    const s = setupEngine(
      {
        0: {
          deck: [...FILLER],
          battleArea: [
            { card: YELLOW_TAMER, as: "tamer" },
            { card: RHIHIMON, as: "fieldRhihimon" },
          ],
          hand: [{ card: RHIHIMON, as: "rhihimon" }],
          trash: [
            { card: RHIHIMON, as: "trashRhihimon" },
            { card: LOWEEMON, as: "loweemon" },
            { card: KAISERLEOMON, as: "kaiserLeomon" },
          ],
        },
      },
      { autoDeclineOptional: true },
    );
    s.state.memory = 3;
    await s.ready();

    const handEffectKey = rhihimonHandEffectKey(s);
    expect(handEffectKey).toBeDefined();
    expect(observe(s.engine).activatableEffects(s.perm("fieldRhihimon"))).toEqual([]);
    expect(s.inst("trashRhihimon").activatableEffectsJson).toBe("");

    expect(
      s.engine.applyIntent(0, {
        type: "activateEffect",
        sourceInstanceId: s.perm("fieldRhihimon").topCard!.instanceId,
        effectKey: handEffectKey!,
      }).ok,
    ).toBe(false);
    expect(
      s.engine.applyIntent(0, {
        type: "activateEffect",
        sourceInstanceId: s.inst("trashRhihimon").instanceId,
        effectKey: handEffectKey!,
      }).ok,
    ).toBe(false);
    expect(s.perm("tamer").topCard?.cardId).toBe(YELLOW_TAMER);
    expect(isInTrash(s, "loweemon")).toBe(true);
    expect(isInTrash(s, "kaiserLeomon")).toBe(true);

    expect(activateRhihimonFromHand(s, handEffectKey!)).toEqual({ ok: true });
    await settle(() => s.perm("tamer").topCard?.cardId === RHIHIMON);
    expect(s.perm("tamer").topCard?.instanceId).toBe(s.inst("rhihimon").instanceId);
  });

  it("cannot digivolve by placing only one of [Loweemon] and [KaiserLeomon] (Q3039)", async () => {
    const complete = setupEngine(rhihimonBoard(), { autoDeclineOptional: true });
    complete.state.memory = 3;
    await complete.ready();
    const effectKey = rhihimonHandEffectKey(complete);
    expect(effectKey).toBeDefined();

    for (const material of [LOWEEMON, KAISERLEOMON]) {
      const board = rhihimonBoard();
      const partial = setupEngine(
        { ...board, 0: { ...board[0], trash: [{ card: material, as: "material" }] } },
        { autoDeclineOptional: true, autoSelectCards: true },
      );
      partial.state.memory = 3;
      await partial.ready();

      expect(rhihimonHandEffectKey(partial)).toBeUndefined();
      expect(activateRhihimonFromHand(partial, effectKey!).ok).toBe(false);
      expect(partial.perm("tamer").topCard?.cardId).toBe(YELLOW_TAMER);
      expect(partial.perm("tamer").stack).toHaveLength(0);
      expect(isInTrash(partial, "material")).toBe(true);
      expect(partial.state.players[0]!.hand.map((card) => card.cardId)).toEqual([RHIHIMON]);
      expect(partial.state.memory).toBe(3);
    }

    expect(activateRhihimonFromHand(complete, effectKey!)).toEqual({ ok: true });
    await settle(() => complete.perm("tamer").topCard?.cardId === RHIHIMON);
    expect(complete.perm("tamer").stack.map((card) => card.cardId)).toEqual([KAISERLEOMON, LOWEEMON, YELLOW_TAMER]);
  });

  it("digivolves the Tamer as-is: no 'when a Digimon digivolves' trigger and no 'Digimon can't digivolve' lock (Q3040)", async () => {
    const preferredHost: string[] = [];
    const watched = setupEngine(rhihimonBoard([{ card: YOLEI_AND_KARI, as: "yolei" }]), {
      autoAcceptOptional: true,
      autoSelectCards: true,
      preferInstanceIds: preferredHost,
    });
    preferredHost.push(watched.perm("tamer").topCard!.instanceId);
    watched.state.memory = 3;
    await watched.ready();
    expect(activateRhihimonFromHand(watched, rhihimonHandEffectKey(watched)!)).toEqual({ ok: true });
    await settle(() => watched.perm("tamer").topCard?.cardId === RHIHIMON);
    expect(watched.perm("yolei").topCard?.cardId).toBe(YOLEI_AND_KARI);
    expect(watched.perm("yolei").isSuspended).toBe(false);
    expect(watched.state.memory).toBe(0);

    const digimonControl = setupEngine(
      {
        0: {
          deck: [...FILLER],
          battleArea: [
            { card: REPPAMON, as: "reppamon" },
            { card: YOLEI_AND_KARI, as: "yolei" },
          ],
          hand: [{ card: SIRENMON, as: "sirenmon" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    digimonControl.state.memory = 3;
    await digimonControl.ready();
    expect(
      digimonControl.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: digimonControl.perm("reppamon").permanentId,
        instanceId: digimonControl.inst("sirenmon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => digimonControl.perm("yolei").isSuspended);
    expect(digimonControl.perm("yolei").isSuspended).toBe(true);
    expect(digimonControl.state.memory).toBe(2);

    const locked = setupEngine(
      {
        0: {
          deck: [...FILLER],
          breeding: { card: KING_DRASIL_7D6, as: "kingDrasil" },
          battleArea: [
            { card: YELLOW_TAMER, as: "tamer" },
            { card: REPPAMON, as: "reppamon" },
          ],
          hand: [
            { card: RHIHIMON, as: "rhihimon" },
            { card: SIRENMON, as: "sirenmon" },
          ],
          trash: [
            { card: LOWEEMON, as: "loweemon" },
            { card: KAISERLEOMON, as: "kaiserLeomon" },
          ],
        },
      },
      { autoDeclineOptional: true },
    );
    locked.state.memory = 3;
    await locked.ready();
    expect(
      locked.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: locked.perm("reppamon").permanentId,
        instanceId: locked.inst("sirenmon").instanceId,
      }).ok,
    ).toBe(false);
    expect(locked.perm("reppamon").topCard?.cardId).toBe(REPPAMON);

    const effectKey = rhihimonHandEffectKey(locked);
    expect(effectKey).toBeDefined();
    expect(activateRhihimonFromHand(locked, effectKey!)).toEqual({ ok: true });
    await settle(() => locked.perm("tamer").topCard?.cardId === RHIHIMON);
    expect(locked.perm("tamer").stack.map((card) => card.cardId)).toEqual([KAISERLEOMON, LOWEEMON, YELLOW_TAMER]);
  });

  it("performs the digivolution bonus draw when a Tamer digivolves (Q3041)", async () => {
    const s = setupEngine(rhihimonBoard(), { autoDeclineOptional: true });
    s.state.memory = 3;
    await s.ready();
    const topOfDeck = s.state.players[0]!.deck[0]!.instanceId;
    const deckBefore = s.state.players[0]!.deck.length;

    expect(activateRhihimonFromHand(s, rhihimonHandEffectKey(s)!)).toEqual({ ok: true });
    await settle(() => s.perm("tamer").topCard?.cardId === RHIHIMON);

    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toEqual([topOfDeck]);
    expect(s.state.players[0]!.deck).toHaveLength(deckBefore - 1);
  });

  it("cannot attack the turn it digivolves from a Tamer played that turn (Q3042)", async () => {
    const freshTamer = setupEngine(rhihimonBoard([], { enteredThisTurn: true }), { autoDeclineOptional: true });
    freshTamer.state.memory = 3;
    await freshTamer.ready();
    expect(activateRhihimonFromHand(freshTamer, rhihimonHandEffectKey(freshTamer)!)).toEqual({ ok: true });
    await settle(() => freshTamer.perm("tamer").topCard?.cardId === RHIHIMON);
    expect(
      freshTamer.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: freshTamer.perm("tamer").permanentId,
        target: { kind: "player" },
      }).ok,
    ).toBe(false);
    expect(freshTamer.perm("tamer").isSuspended).toBe(false);

    const establishedTamer = setupEngine(rhihimonBoard(), { autoDeclineOptional: true });
    establishedTamer.state.memory = 3;
    await establishedTamer.ready();
    expect(activateRhihimonFromHand(establishedTamer, rhihimonHandEffectKey(establishedTamer)!)).toEqual({
      ok: true,
    });
    await settle(() => establishedTamer.perm("tamer").topCard?.cardId === RHIHIMON);
    expect(
      establishedTamer.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: establishedTamer.perm("tamer").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
  });

  it("keeps the Tamer under it as a digivolution card that is trashed when the Digimon leaves play (Q6662)", async () => {
    const board = rhihimonBoard();
    const s = setupEngine(
      {
        0: board[0],
        1: {
          ...board[1],
          battleArea: [{ card: "BT1-060", as: "wall", dp: 12000, suspended: true }],
        },
      },
      { autoDeclineOptional: true },
    );
    s.state.memory = 3;
    await s.ready();
    expect(activateRhihimonFromHand(s, rhihimonHandEffectKey(s)!)).toEqual({ ok: true });
    await settle(() => s.perm("tamer").topCard?.cardId === RHIHIMON);

    const rhihimonPermanent = s.perm("tamer");
    expect(rhihimonPermanent.stack.map((card) => card.cardId)).toContain(YELLOW_TAMER);
    const tamerCard = rhihimonPermanent.stack.find((card) => card.cardId === YELLOW_TAMER)!.instanceId;

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: rhihimonPermanent.permanentId,
        target: { kind: "permanent", permanentId: s.perm("wall").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(
      () => !s.state.players[0]!.battleArea.some((perm) => perm.permanentId === rhihimonPermanent.permanentId),
    );

    const trash = s.state.players[0]!.trash.map((card) => card.instanceId);
    expect(trash).toContain(tamerCard);
    expect(trash).toContain(s.inst("rhihimon").instanceId);
    expect(trash).toContain(s.inst("loweemon").instanceId);
    expect(trash).toContain(s.inst("kaiserLeomon").instanceId);
  });

  it("does not give the Digimon the [Security] effect of a Tamer in its digivolution cards (Q6663)", async () => {
    async function opponentChecksSecurity(securityCard: string) {
      const s = setupEngine(
        {
          0: {
            deck: [...FILLER],
            battleArea: [{ card: RHIHIMON, as: "rhihimon", under: [TAKUYA_AND_KOJI] }],
            security: [{ card: securityCard, as: "checked" }],
          },
          1: { deck: [...FILLER], battleArea: [{ card: "BT1-060", as: "attacker" }] },
        },
        { autoAcceptOptional: true, autoSelectCards: true },
      );
      s.state.turnSeat = 1;
      await s.ready();
      const stackTamer = s.perm("rhihimon").stack[0]!.instanceId;
      const isOnField = (instanceId: string) =>
        s.state.players[0]!.battleArea.some((perm) => perm.topCard?.instanceId === instanceId);

      expect(
        s.engine.applyIntent(1, {
          type: "attack",
          attackerPermanentId: s.perm("attacker").permanentId,
          target: { kind: "player" },
        }),
      ).toEqual({ ok: true });
      await advance(s.engine).finishAttack();

      expect(s.state.players[0]!.security).toHaveLength(0);
      return {
        stack: s.perm("rhihimon").stack.map((card) => card.instanceId),
        stackTamerPlayed: isOnField(stackTamer),
        checkedTamerPlayed: isOnField(s.inst("checked").instanceId),
        stackTamer,
      };
    }

    const inertCheck = await opponentChecksSecurity("BT1-010");
    expect(inertCheck.stack).toEqual([inertCheck.stackTamer]);
    expect(inertCheck.stackTamerPlayed).toBe(false);
    expect(inertCheck.checkedTamerPlayed).toBe(false);

    const tamerCheck = await opponentChecksSecurity(TAKUYA_AND_KOJI);
    expect(tamerCheck.checkedTamerPlayed).toBe(true);
    expect(tamerCheck.stack).toEqual([tamerCheck.stackTamer]);
    expect(tamerCheck.stackTamerPlayed).toBe(false);
  });

  it("gives the Digimon the inherited effect of a Tamer in its digivolution cards (Q6664)", async () => {
    async function digivolveFromTamerAndEndTurn(tamer: string) {
      const board = rhihimonBoard();
      const s = setupEngine(
        {
          ...board,
          0: {
            ...board[0],
            battleArea: [{ card: tamer, as: "tamer" }],
            // Spares for BT18-088's optional [Start of Your Main Phase] placement.
            trash: [...board[0].trash, LOWEEMON, KAISERLEOMON],
          },
        },
        { autoAcceptOptional: true, autoSelectCards: true },
      );
      s.state.turnSeat = 0;
      s.state.memory = 3;
      await s.ready();

      const turn = s.engine.runOneTurn();
      await advance(s.engine).waitForMainPhase(0);
      s.state.memory = 3;
      expect(activateRhihimonFromHand(s, rhihimonHandEffectKey(s)!)).toEqual({ ok: true });
      await settle(() => s.perm("tamer").topCard?.cardId === RHIHIMON);
      expect(s.perm("tamer").stack.map((card) => card.cardId)).toContain(tamer);

      advance(s.engine).endMainPhaseIfOpen(0);
      await turn;
      return { security: s.state.players[1]!.security.length, attacked: s.perm("tamer").isSuspended };
    }

    expect(await digivolveFromTamerAndEndTurn(TAKUYA_AND_KOJI)).toEqual({ security: 1, attacked: true });
    expect(await digivolveFromTamerAndEndTurn(YELLOW_TAMER)).toEqual({ security: 2, attacked: false });
  });
});
