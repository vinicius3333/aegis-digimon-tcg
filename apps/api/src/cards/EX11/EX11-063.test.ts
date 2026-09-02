import { describe, expect, it } from "vitest";
import { EffectTiming, getCardDefinition } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { observe } from "../../engine/testkit/observe.js";
import { assertNoLoudGap, setupEngine } from "../../engine/testkit/harness.js";
import { compiled } from "./EX11-063.js";

describe("EX11-063 Winr", () => {
  it("preserves the printed dual-color Tamer and complete compiled coverage", () => {
    expect(getCardDefinition("EX11-063")).toMatchObject({
      nameEn: "Winr",
      colors: ["Green", "Black"],
      kinds: ["Tamer"],
      playCost: 5,
      types: ["LIBERATOR"],
      securityEffectText: "[Security] Play this card without paying the cost.",
    });
    expect(compiled).toMatchObject({ coverage: "full", residual: [] });
  });

  it("sets memory to 3 at the start of your turn from 2 or less", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "EX11-063", as: "winr" }] } });
    s.state.memory = 2;
    await advance(s.engine).fire(EffectTiming.OnStartTurn, s.perm("winr"));
    expect(s.state.memory).toBe(3);
    assertNoLoudGap(s);
  });

  it("places a Royal Base card face up at security bottom even from zero security (Q5922-Q5926)", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX11-063", as: "winr" }],
          hand: [{ card: "EX11-025", as: "royalBase" }],
          security: [],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );

    await advance(s.engine).fire(EffectTiming.OnPlay, s.perm("winr"));

    expect(s.state.players[0]!.security).toHaveLength(1);
    expect(s.state.players[0]!.security[0]).toMatchObject({ cardId: "EX11-025", faceUp: true });
    expect(s.state.players[0]!.hand).toHaveLength(0);
    assertNoLoudGap(s);
  });

  it("adds the top FACE-DOWN security card, skipping a face-up one above it (Q5923-Q5924)", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX11-063", as: "winr" }],
          hand: [],
          security: [{ card: "BT1-090", faceUp: true }, "BT1-091"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );

    await advance(s.engine).fire(EffectTiming.OnPlay, s.perm("winr"));

    // The face-up card is not "your top face-down security card": it stays put and the
    // face-down card beneath it is the one added to the hand.
    expect(s.state.players[0]!.hand.map(({ cardId }) => cardId)).toEqual(["BT1-091"]);
    expect(s.state.players[0]!.security).toHaveLength(1);
    expect(s.state.players[0]!.security[0]).toMatchObject({ cardId: "BT1-090", faceUp: true });
    assertNoLoudGap(s);
  });

  it("binds one Royal Base Digimon, grants both keywords, and makes it attack (Q5927)", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "EX11-063", as: "winr" },
            { card: "EX11-025", as: "attacker" },
          ],
        },
        1: { security: ["BT1-090"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.turnSeat = 0;

    await advance(s.engine).fire(EffectTiming.OnEndTurn, s.perm("winr"));

    expect(s.perm("winr").isSuspended).toBe(true);
    expect(observe(s.engine).hasKeyword(s.perm("attacker"), "Collision")).toBe(true);
    expect(observe(s.engine).hasPierce(s.perm("attacker"))).toBe(true);
    expect(
      s.events.some(
        (event) =>
          (event as { kind?: string }).kind === "attackDeclared" &&
          (event as { attackerPermanentId?: string }).attackerPermanentId === s.perm("attacker").permanentId,
      ),
    ).toBe(true);
    assertNoLoudGap(s);
  });

  it("places only the [Royal Base] card out of a mixed hand (near-miss trait and non-match)", async () => {
    // AD1-008 carries [Royal Knight] and EX2-054 carries [Base Defense Agent] — both contain a
    // token of the printed trait but are not it, and `match: "trait"` is exact. BT1-090 matches
    // nothing at all. Only EX11-025 has [Royal Base].
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX11-063", as: "winr" }],
          hand: [
            { card: "AD1-008", as: "royalKnight" },
            { card: "EX2-054", as: "baseDefenseAgent" },
            { card: "BT1-090", as: "unrelated" },
            { card: "EX11-025", as: "royalBase" },
          ],
          security: [],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );

    await advance(s.engine).fire(EffectTiming.OnPlay, s.perm("winr"));

    expect(s.state.players[0]!.security.map(({ cardId }) => cardId)).toEqual(["EX11-025"]);
    expect(s.state.players[0]!.hand.map(({ cardId }) => cardId)).toEqual(["AD1-008", "EX2-054", "BT1-090"]);
    assertNoLoudGap(s);
  });

  it("buffs and attacks with the [Royal Base] Digimon out of a mixed board (Q5927)", async () => {
    // The two non-matching Digimon are listed FIRST, so a broken trait gate would bind one of
    // them before ever reaching the [Royal Base] Digimon.
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "AD1-008", as: "royalKnight" },
            { card: "AD1-002", as: "unrelated" },
            { card: "EX11-063", as: "winr" },
            { card: "EX11-025", as: "royalBase" },
          ],
        },
        1: { security: ["BT1-090"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.turnSeat = 0;

    await advance(s.engine).fire(EffectTiming.OnEndTurn, s.perm("winr"));

    expect(observe(s.engine).hasKeyword(s.perm("royalBase"), "Collision")).toBe(true);
    expect(observe(s.engine).hasPierce(s.perm("royalBase"))).toBe(true);
    for (const alias of ["royalKnight", "unrelated"]) {
      expect(observe(s.engine).hasKeyword(s.perm(alias), "Collision")).toBe(false);
    }
    // AD1-008 prints its own Piercing, so only the unrelated Digimon can prove the grant did not land.
    expect(observe(s.engine).hasPierce(s.perm("unrelated"))).toBe(false);
    const attacks = s.events.filter((event) => (event as { kind?: string }).kind === "attackDeclared");
    expect(attacks.map((event) => (event as { attackerPermanentId?: string }).attackerPermanentId)).toEqual([
      s.perm("royalBase").permanentId,
    ]);
    assertNoLoudGap(s);
  });

  it("declines the suspend cost and then grants nothing and forces no attack (CR 15-7-4)", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "EX11-063", as: "winr" },
            { card: "EX11-025", as: "attacker" },
          ],
        },
        1: { security: ["BT1-090"] },
      },
      { autoDeclineOptional: true },
    );
    s.state.turnSeat = 0;

    await advance(s.engine).fire(EffectTiming.OnEndTurn, s.perm("winr"));

    expect(s.decisions.some((d) => d.req.kind === "optional")).toBe(true);
    expect(s.perm("winr").isSuspended).toBe(false);
    expect(observe(s.engine).hasKeyword(s.perm("attacker"), "Collision")).toBe(false);
    expect(observe(s.engine).hasPierce(s.perm("attacker"))).toBe(false);
    expect(s.events.some((event) => (event as { kind?: string }).kind === "attackDeclared")).toBe(false);
    assertNoLoudGap(s);
  });

  it("publishes full exclusive IR with one binding shared by both grants and the attack", () => {
    expect(compiled).toMatchObject({ coverage: "full", residual: [] });
    expect(compiled.effects.find((effect) => effect.trigger === "OnPlay")?.actions).toMatchObject([
      { kind: "SecurityManipulation", op: "toHand", controller: "mine", amount: 1, faceDownOnly: true },
      { kind: "SecurityManipulation", op: "placeAsSecurity", toTop: false, faceUp: true, optional: true },
    ]);
    expect(compiled.effects.find((effect) => effect.trigger === "EndOfYourTurn")?.actions).toMatchObject([
      { kind: "SelectBind", target: { bindAs: "buffedDigimon" }, cost: { kind: "suspend" } },
      { kind: "GainKeyword", target: { fromSelectionRef: "buffedDigimon" } },
      { kind: "GainKeyword", target: { fromSelectionRef: "buffedDigimon" } },
      { kind: "Attack", target: { fromSelectionRef: "buffedDigimon" }, optional: false },
    ]);
  });
});
