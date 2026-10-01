import { EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { assertNoLoudGap, setupEngine, settle, type EngineSetup } from "../../engine/testkit/harness.js";
import "../AD1/AD1-023.js";
import "../BT2/BT2-089.js";
import "../BT5/BT5-091.js";
import "../BT13/BT13-007.js";
import { compiled } from "./BT18-066.js";
import "./BT18-049.js";
import "./BT18-064.js";
import "./BT18-066.js";

describe("BT18-066 Sephirothmon", () => {
  it("uses its normal black level-3 evolution route for 3", async () => {
    expect(compiled.effects.slice(0, 2)).toMatchObject([
      { trigger: "OnPlay", actions: [{ kind: "PlaceUnder" }, { kind: "ActivateEffect", lastPlacedOnly: true }] },
      {
        trigger: "WhenDigivolving",
        actions: [{ kind: "PlaceUnder" }, { kind: "ActivateEffect", lastPlacedOnly: true }],
      },
    ]);
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT18-059", as: "base" }],
        hand: [{ card: "BT18-066", as: "sephirothmon" }],
        deck: ["BT1-009"],
      },
    });
    s.state.memory = 10;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("sephirothmon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard?.cardId === "BT18-066");
    expect(s.state.memory).toBe(7);
    expect(s.perm("base").stack.map(({ cardId }) => cardId)).toContain("BT18-059");
    expect(s.state.players[0]!.hand.map(({ cardId }) => cardId)).toContain("BT1-009");
    assertNoLoudGap(s);
  });

  it("places a level-4 Hybrid from trash and activates that card's On Play effect", async () => {
    const preferredInstanceIds: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT1-030", as: "target" },
            { card: "BT18-064", as: "base" },
          ],
          hand: [{ card: "BT18-066", as: "sephirothmon" }],
          trash: [{ card: "BT18-049", as: "hybrid", faceUp: true }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferredInstanceIds },
    );
    s.state.memory = 10;
    const targetInitialDP = s.perm("target").currentDP;
    preferredInstanceIds.push(s.perm("target").topCard!.instanceId);

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("sephirothmon").instanceId,
      }),
    ).toEqual({ ok: true });
    await s.ready();
    await settle(() =>
      s.state.players[0]!.battleArea.some(
        (permanent) =>
          permanent.topCard?.cardId === "BT18-066" &&
          permanent.stack.some((card) => card.instanceId === s.inst("hybrid").instanceId),
      ),
    );
    const sephirothmon = s.state.players[0]!.battleArea.find((permanent) => permanent.topCard?.cardId === "BT18-066")!;

    expect(sephirothmon.topCard?.cardId).toBe("BT18-066");
    expect(sephirothmon.stack.find((card) => card.instanceId === s.inst("hybrid").instanceId)?.faceUp).toBe(true);
    expect(sephirothmon.stack.filter((card) => card.instanceId === s.inst("hybrid").instanceId)).toHaveLength(1);
    expect(s.state.players[0]!.trash.some((card) => card.instanceId === s.inst("hybrid").instanceId)).toBe(false);
    await settle(() => s.perm("target").currentDP === targetInitialDP + 3000);
    expect(s.perm("target").currentDP).toBe(targetInitialDP + 3000);
    expect(s.state.memory).toBe(9);
    assertNoLoudGap(s);
  });

  it("plays for 6, places an eligible hand Hybrid, and activates only that card's On Play", async () => {
    const preferredInstanceIds: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT1-030", as: "target" }],
          hand: [
            { card: "BT18-066", as: "sephirothmon" },
            { card: "BT18-049", as: "hybrid" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferredInstanceIds },
    );
    s.state.memory = 10;
    const targetInitialDP = s.perm("target").currentDP;
    preferredInstanceIds.push(s.inst("hybrid").instanceId, s.perm("target").topCard!.instanceId);

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("sephirothmon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.perm("target").currentDP === targetInitialDP + 3000);
    const sephirothmon = s.state.players[0]!.battleArea.find((permanent) => permanent.topCard?.cardId === "BT18-066")!;
    expect(sephirothmon.stack.filter(({ instanceId }) => instanceId === s.inst("hybrid").instanceId)).toHaveLength(1);
    expect(s.state.memory).toBe(4);
    expect(s.perm("target").currentDP).toBe(targetInitialDP + 3000);
    assertNoLoudGap(s);
  });

  it("may refuse and does not offer self, wrong-trait, or opposing cards", async () => {
    const refused = setupEngine(
      {
        0: {
          hand: [
            { card: "BT18-066", as: "sephirothmon" },
            { card: "BT18-049", as: "eligible" },
          ],
        },
      },
      { autoDeclineOptional: true },
    );
    refused.state.memory = 10;
    expect(
      refused.engine.applyIntent(0, { type: "playCard", instanceId: refused.inst("sephirothmon").instanceId }),
    ).toEqual({ ok: true });
    await refused.ready();
    const refusedHost = refused.state.players[0]!.battleArea.find(({ topCard }) => topCard?.cardId === "BT18-066")!;
    expect(refusedHost.stack).toHaveLength(0);
    expect(refused.state.players[0]!.hand.map(({ cardId }) => cardId)).toContain("BT18-049");

    const unavailable = setupEngine(
      {
        0: {
          hand: [
            { card: "BT18-066", as: "sephirothmon" },
            { card: "BT18-066", as: "excludedSelf" },
            { card: "BT1-009", as: "wrongTrait" },
          ],
        },
        1: { trash: [{ card: "BT18-049", as: "opposingHybrid" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    unavailable.state.memory = 10;
    expect(
      unavailable.engine.applyIntent(0, { type: "playCard", instanceId: unavailable.inst("sephirothmon").instanceId }),
    ).toEqual({ ok: true });
    await unavailable.ready();
    const unavailableHost = unavailable.state.players[0]!.battleArea.find(
      ({ topCard }) => topCard?.instanceId === unavailable.inst("sephirothmon").instanceId,
    )!;
    expect(unavailableHost.stack).toHaveLength(0);
    expect(unavailable.decisions).toHaveLength(0);
    assertNoLoudGap(refused);
    assertNoLoudGap(unavailable);
  });

  it("grants inherited +2000 DP only to its host on the opponent's turn", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "BT1-078", dp: 5000, as: "host", under: ["BT18-066"] },
          { card: "BT1-078", dp: 5000, as: "other" },
        ],
      },
    });
    await s.ready();
    expect(s.perm("host").currentDP).toBe(5000);
    expect(s.perm("other").currentDP).toBe(5000);
    s.state.turnSeat = 1;
    await s.engine.recomputeContinuousEffects();
    expect(s.perm("host").currentDP).toBe(7000);
    expect(s.perm("other").currentDP).toBe(5000);
    assertNoLoudGap(s);
  });
});

describe("BT18-066 Sephirothmon — KB Q&A rulings", () => {
  const FILLER = ["BT1-009", "BT1-013", "BT1-009", "BT1-013"];
  const BLACK_TAMER = "BT2-089";

  function digivolveFromTamer(s: EngineSetup) {
    return s.engine.applyIntent(0, {
      type: "digivolve",
      permanentId: s.perm("tamer").permanentId,
      instanceId: s.inst("sephirothmon").instanceId,
      useAlternateCost: true,
    });
  }

  function digivolveRookie(s: EngineSetup) {
    return s.engine.applyIntent(0, {
      type: "digivolve",
      permanentId: s.perm("rookie").permanentId,
      instanceId: s.inst("champion").instanceId,
    });
  }

  async function sephirothmonOnBlackTamer(tamerCard = BLACK_TAMER) {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: tamerCard, as: "tamer" }],
          hand: [{ card: "BT18-066", as: "sephirothmon" }],
          security: [{ card: "BT1-101", as: "security" }],
          deck: [...FILLER],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    expect(digivolveFromTamer(s)).toEqual({ ok: true });
    await settle(() => s.perm("tamer").topCard.cardId === "BT18-066");
    await s.ready();
    return s;
  }

  it("digivolves from the Tamer as-is: Digimon digivolve watchers stay silent and Digimon can't-digivolve locks do not apply (Q2999)", async () => {
    function boardWithTakumiAiba() {
      const s = setupEngine(
        {
          0: {
            battleArea: [
              { card: BLACK_TAMER, as: "tamer" },
              { card: "BT1-010", as: "rookie" },
              { card: "BT5-091", as: "takumi" },
            ],
            hand: [
              { card: "BT18-066", as: "sephirothmon" },
              { card: "BT1-018", as: "champion" },
            ],
            deck: [...FILLER],
          },
        },
        { autoAcceptOptional: true, autoSelectCards: true },
      );
      s.state.memory = 10;
      return s;
    }

    const digimonControl = boardWithTakumiAiba();
    expect(digivolveRookie(digimonControl)).toEqual({ ok: true });
    await settle(() => digimonControl.perm("rookie").topCard.cardId === "BT1-018");
    await settle();
    expect(digimonControl.perm("takumi").isSuspended).toBe(true);
    expect(digimonControl.state.players[0]!.hand).toHaveLength(3);

    const fromTamer = boardWithTakumiAiba();
    expect(digivolveFromTamer(fromTamer)).toEqual({ ok: true });
    await settle(() => fromTamer.perm("tamer").topCard.cardId === "BT18-066");
    await settle();
    expect(fromTamer.perm("takumi").isSuspended).toBe(false);
    expect(fromTamer.state.players[0]!.hand.map(({ cardId }) => cardId).sort()).toEqual(["BT1-009", "BT1-018"]);

    const locked = setupEngine(
      {
        0: {
          breeding: "BT13-007",
          battleArea: [
            { card: BLACK_TAMER, as: "tamer" },
            { card: "BT1-010", as: "rookie" },
          ],
          hand: [
            { card: "BT18-066", as: "sephirothmon" },
            { card: "BT1-018", as: "champion" },
          ],
          deck: [...FILLER],
        },
      },
      { autoDeclineOptional: true },
    );
    locked.state.memory = 10;
    await locked.ready();
    expect(digivolveRookie(locked)).toMatchObject({ ok: false });
    expect(locked.perm("rookie").topCard.cardId).toBe("BT1-010");
    expect(digivolveFromTamer(locked)).toEqual({ ok: true });
    await settle(() => locked.perm("tamer").topCard.cardId === "BT18-066");
    expect(locked.state.memory).toBe(7);
  });

  it("performs the digivolution bonus draw when digivolving from a Tamer (Q3000)", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: BLACK_TAMER, as: "tamer" }],
          hand: [{ card: "BT18-066", as: "sephirothmon" }],
          deck: [{ card: "BT1-009", as: "drawn" }, ...FILLER],
        },
      },
      { autoDeclineOptional: true },
    );
    s.state.memory = 10;
    expect(digivolveFromTamer(s)).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.hand.length === 1);

    expect(s.perm("tamer").topCard.cardId).toBe("BT18-066");
    expect(s.state.players[0]!.hand.map(({ instanceId }) => instanceId)).toEqual([s.inst("drawn").instanceId]);
    expect(s.state.players[0]!.deck).toHaveLength(FILLER.length);
  });

  it("cannot attack the turn it digivolves from a Tamer played that turn (Q3001)", async () => {
    async function digivolvedFromTamer(enteredThisTurn: boolean) {
      const s = setupEngine(
        {
          0: {
            battleArea: [{ card: BLACK_TAMER, as: "tamer", enteredThisTurn }],
            hand: [{ card: "BT18-066", as: "sephirothmon" }],
            deck: [...FILLER],
          },
          1: { security: 3, deck: [...FILLER] },
        },
        { autoDeclineOptional: true },
      );
      s.state.memory = 10;
      expect(digivolveFromTamer(s)).toEqual({ ok: true });
      await settle(() => s.perm("tamer").topCard.cardId === "BT18-066");
      return s;
    }
    function attackPlayer(s: EngineSetup) {
      return s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("tamer").permanentId,
        target: { kind: "player" },
      });
    }

    const fresh = await digivolvedFromTamer(true);
    expect(attackPlayer(fresh)).toMatchObject({ ok: false });
    expect(fresh.perm("tamer").isSuspended).toBe(false);
    expect(fresh.state.players[1]!.security).toHaveLength(3);

    const established = await digivolvedFromTamer(false);
    expect(attackPlayer(established)).toEqual({ ok: true });
    await settle(() => established.state.players[1]!.security.length === 2);
    expect(established.perm("tamer").isSuspended).toBe(true);
  });

  it("keeps the Tamer as a digivolution card that is trashed when the Digimon leaves the field (Q6640)", async () => {
    const s = await sephirothmonOnBlackTamer();
    const tamerCard = s.inst("tamer").instanceId;
    expect(s.perm("tamer").stack.map(({ instanceId }) => instanceId)).toEqual([tamerCard]);

    await advance(s.engine).verb.deletePermanent([s.perm("tamer").permanentId]);
    await settle(() => s.state.players[0]!.trash.length === 2);

    expect(s.state.players[0]!.battleArea).toHaveLength(0);
    expect(s.state.players[0]!.trash.map(({ instanceId }) => instanceId)).toEqual(
      expect.arrayContaining([tamerCard, s.inst("sephirothmon").instanceId]),
    );
  });

  it("does not gain the [Security] effect in the lower text of a Tamer in its digivolution cards (Q6641)", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: BLACK_TAMER, as: "tamer" }],
          hand: [{ card: "BT18-066", as: "sephirothmon" }],
          security: [{ card: BLACK_TAMER, as: "securityTamer" }],
          deck: [...FILLER],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    expect(digivolveFromTamer(s)).toEqual({ ok: true });
    await settle(() => s.perm("tamer").topCard.cardId === "BT18-066");
    await s.ready();

    await advance(s.engine).fire(EffectTiming.SecuritySkill, s.perm("tamer"));
    await settle();
    expect(s.state.players[0]!.battleArea).toHaveLength(1);
    expect(s.perm("tamer").stack.map(({ cardId }) => cardId)).toEqual([BLACK_TAMER]);

    await advance(s.engine).fireForInstance(EffectTiming.SecuritySkill, s.inst("securityTamer"));
    await settle(() => s.state.players[0]!.battleArea.length === 2);
    expect(s.perm("securityTamer").topCard.cardId).toBe(BLACK_TAMER);
  });

  it("gains the inherited effects in the lower text of a Tamer in its digivolution cards (Q6642)", async () => {
    const withInheritedTamer = await sephirothmonOnBlackTamer("AD1-023");
    const protectedId = withInheritedTamer.perm("tamer").permanentId;
    expect(await advance(withInheritedTamer.engine).verb.deletePermanent([protectedId], "byEffect")).toBe(0);
    expect(withInheritedTamer.perm("tamer").topCard.cardId).toBe("BT18-066");
    expect(withInheritedTamer.state.players[0]!.security).toHaveLength(0);
    expect(withInheritedTamer.state.players[0]!.hand.map(({ cardId }) => cardId)).toContain("BT1-101");

    const withoutInheritedTamer = await sephirothmonOnBlackTamer();
    const exposedId = withoutInheritedTamer.perm("tamer").permanentId;
    expect(await advance(withoutInheritedTamer.engine).verb.deletePermanent([exposedId], "byEffect")).toBe(1);
    expect(withoutInheritedTamer.state.players[0]!.battleArea).toHaveLength(0);
    expect(withoutInheritedTamer.state.players[0]!.security).toHaveLength(1);
  });
});
