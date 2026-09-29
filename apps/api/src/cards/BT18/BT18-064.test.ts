import { EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { assertNoLoudGap, setupEngine, settle, type EngineSetup } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "../AD1/AD1-023.js";
import "../BT2/BT2-089.js";
import "../BT5/BT5-091.js";
import "../BT13/BT13-007.js";
import { compiled } from "./BT18-064.js";
import "./index.js";

describe("BT18-064 Mercurymon", () => {
  it("prevents opponent effects from returning itself to hand or deck after play", async () => {
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
    expect(compiled.effects.slice(0, 2)).toMatchObject([
      { trigger: "OnPlay", actions: [{ kind: "Restrict", byOpponentEffectsOnly: true }] },
      { trigger: "WhenDigivolving", actions: [{ kind: "Restrict", byOpponentEffectsOnly: true }] },
    ]);
    const s = setupEngine({ 0: { hand: [{ card: "BT18-064", as: "mercurymon" }] } });
    s.state.memory = 10;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("mercurymon").instanceId })).toEqual({
      ok: true,
    });
    const mercurymon = () =>
      s.state.players[0]!.battleArea.find((permanent) => permanent.topCard?.cardId === "BT18-064")!;
    await settle(() => observe(s.engine).isRestricted(mercurymon(), "beReturned"));

    expect(observe(s.engine).isRestricted(mercurymon(), "beReturned")).toBe(true);
    s.state.turnSeat = 1;
    const instanceId = mercurymon().topCard!.instanceId;
    await advance(s.engine).verb.returnToHand([instanceId]);
    expect(s.state.players[0]!.battleArea.some(({ topCard }) => topCard?.instanceId === instanceId)).toBe(true);
    await advance(s.engine).verb.returnToDeck([instanceId]);
    expect(s.state.players[0]!.battleArea.some(({ topCard }) => topCard?.instanceId === instanceId)).toBe(true);
    s.state.turnSeat = 0;
    await advance(s.engine).verb.returnToHand([instanceId]);
    expect(s.state.players[0]!.hand.some(({ instanceId: id }) => id === instanceId)).toBe(true);
    assertNoLoudGap(s);
  });

  it("digivolves from Sephirothmon for zero, draws, and retains the source", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT18-066", as: "sephirothmon" }],
        hand: [{ card: "BT18-064", as: "mercurymon" }],
        deck: ["BT1-009"],
      },
    });
    s.state.memory = 3;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("sephirothmon").permanentId,
        instanceId: s.inst("mercurymon").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("sephirothmon").topCard.cardId === "BT18-064");
    expect(s.state.memory).toBe(3);
    expect(s.perm("sephirothmon").stack.map(({ cardId }) => cardId)).toContain("BT18-066");
    expect(s.state.players[0]!.hand.map(({ cardId }) => cardId)).toContain("BT1-009");
    expect(observe(s.engine).isRestricted(s.perm("sephirothmon"), "beReturned")).toBe(true);
    assertNoLoudGap(s);
  });

  it("grants inherited +2000 DP only to its host on the opponent's turn", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "BT1-078", dp: 5000, as: "host", under: ["BT18-064"] },
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

  it("allows a return effect after the natural opponent-turn expiration", async () => {
    const s = setupEngine(
      {
        0: { hand: [{ card: "BT18-064", as: "mercurymon" }] },
        1: { deck: ["BT1-009"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("mercurymon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.battleArea.some(({ topCard }) => topCard?.cardId === "BT18-064"));
    const instanceId = s.inst("mercurymon").instanceId;
    expect(observe(s.engine).isRestricted(s.perm("mercurymon"), "beReturned")).toBe(true);

    s.state.turnSeat = 1;
    s.state.memory = 4;
    await advance(s.engine).runTurn(1);

    expect(observe(s.engine).isRestricted(s.perm("mercurymon"), "beReturned")).toBe(false);
    await advance(s.engine).verb.returnToHand([instanceId]);
    expect(s.state.players[0]!.hand.some(({ instanceId: id }) => id === instanceId)).toBe(true);
    assertNoLoudGap(s);
  });
});

describe("BT18-064 Mercurymon — KB Q&A rulings", () => {
  const FILLER = ["BT1-009", "BT1-013", "BT1-009", "BT1-013"];
  const BLACK_TAMER = "BT2-089";

  function digivolveFromTamer(s: EngineSetup) {
    return s.engine.applyIntent(0, {
      type: "digivolve",
      permanentId: s.perm("tamer").permanentId,
      instanceId: s.inst("mercurymon").instanceId,
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

  async function mercurymonOnBlackTamer(tamerCard = BLACK_TAMER) {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: tamerCard, as: "tamer" }],
          hand: [{ card: "BT18-064", as: "mercurymon" }],
          security: [{ card: "BT1-101", as: "security" }],
          deck: [...FILLER],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    expect(digivolveFromTamer(s)).toEqual({ ok: true });
    await settle(() => s.perm("tamer").topCard.cardId === "BT18-064");
    await s.ready();
    return s;
  }

  it("digivolves from the Tamer as-is: Digimon digivolve watchers stay silent and Digimon can't-digivolve locks do not apply (Q2996)", async () => {
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
              { card: "BT18-064", as: "mercurymon" },
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
    await settle(() => fromTamer.perm("tamer").topCard.cardId === "BT18-064");
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
            { card: "BT18-064", as: "mercurymon" },
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
    await settle(() => locked.perm("tamer").topCard.cardId === "BT18-064");
    expect(locked.state.memory).toBe(8);
  });

  it("performs the digivolution bonus draw when digivolving from a Tamer (Q2997)", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: BLACK_TAMER, as: "tamer" }],
          hand: [{ card: "BT18-064", as: "mercurymon" }],
          deck: [{ card: "BT1-009", as: "drawn" }, ...FILLER],
        },
      },
      { autoDeclineOptional: true },
    );
    s.state.memory = 10;
    expect(digivolveFromTamer(s)).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.hand.length === 1);

    expect(s.perm("tamer").topCard.cardId).toBe("BT18-064");
    expect(s.state.players[0]!.hand.map(({ instanceId }) => instanceId)).toEqual([s.inst("drawn").instanceId]);
    expect(s.state.players[0]!.deck).toHaveLength(FILLER.length);
  });

  it("cannot attack the turn it digivolves from a Tamer played that turn (Q2998)", async () => {
    async function digivolvedFromTamer(enteredThisTurn: boolean) {
      const s = setupEngine(
        {
          0: {
            battleArea: [{ card: BLACK_TAMER, as: "tamer", enteredThisTurn }],
            hand: [{ card: "BT18-064", as: "mercurymon" }],
            deck: [...FILLER],
          },
          1: { security: 3, deck: [...FILLER] },
        },
        { autoDeclineOptional: true },
      );
      s.state.memory = 10;
      expect(digivolveFromTamer(s)).toEqual({ ok: true });
      await settle(() => s.perm("tamer").topCard.cardId === "BT18-064");
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

  it("keeps the Tamer as a digivolution card that is trashed when the Digimon leaves the field (Q6637)", async () => {
    const s = await mercurymonOnBlackTamer();
    const tamerCard = s.inst("tamer").instanceId;
    expect(s.perm("tamer").stack.map(({ instanceId }) => instanceId)).toEqual([tamerCard]);

    await advance(s.engine).verb.deletePermanent([s.perm("tamer").permanentId]);
    await settle(() => s.state.players[0]!.trash.length === 2);

    expect(s.state.players[0]!.battleArea).toHaveLength(0);
    expect(s.state.players[0]!.trash.map(({ instanceId }) => instanceId)).toEqual(
      expect.arrayContaining([tamerCard, s.inst("mercurymon").instanceId]),
    );
  });

  it("does not gain the [Security] effect in the lower text of a Tamer in its digivolution cards (Q6638)", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: BLACK_TAMER, as: "tamer" }],
          hand: [{ card: "BT18-064", as: "mercurymon" }],
          security: [{ card: BLACK_TAMER, as: "securityTamer" }],
          deck: [...FILLER],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    expect(digivolveFromTamer(s)).toEqual({ ok: true });
    await settle(() => s.perm("tamer").topCard.cardId === "BT18-064");
    await s.ready();

    await advance(s.engine).fire(EffectTiming.SecuritySkill, s.perm("tamer"));
    await settle();
    expect(s.state.players[0]!.battleArea).toHaveLength(1);
    expect(s.perm("tamer").stack.map(({ cardId }) => cardId)).toEqual([BLACK_TAMER]);

    await advance(s.engine).fireForInstance(EffectTiming.SecuritySkill, s.inst("securityTamer"));
    await settle(() => s.state.players[0]!.battleArea.length === 2);
    expect(s.perm("securityTamer").topCard.cardId).toBe(BLACK_TAMER);
  });

  it("gains the inherited effects in the lower text of a Tamer in its digivolution cards (Q6639)", async () => {
    const withInheritedTamer = await mercurymonOnBlackTamer("AD1-023");
    const protectedId = withInheritedTamer.perm("tamer").permanentId;
    expect(await advance(withInheritedTamer.engine).verb.deletePermanent([protectedId], "byEffect")).toBe(0);
    expect(withInheritedTamer.perm("tamer").topCard.cardId).toBe("BT18-064");
    expect(withInheritedTamer.state.players[0]!.security).toHaveLength(0);
    expect(withInheritedTamer.state.players[0]!.hand.map(({ cardId }) => cardId)).toContain("BT1-101");

    const withoutInheritedTamer = await mercurymonOnBlackTamer();
    const exposedId = withoutInheritedTamer.perm("tamer").permanentId;
    expect(await advance(withoutInheritedTamer.engine).verb.deletePermanent([exposedId], "byEffect")).toBe(1);
    expect(withoutInheritedTamer.state.players[0]!.battleArea).toHaveLength(0);
    expect(withoutInheritedTamer.state.players[0]!.security).toHaveLength(1);
  });
});
