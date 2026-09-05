import { describe, expect, it } from "vitest";
import { EffectTiming, getCardDefinition } from "@aegis/shared";
import { registeredCompiledCards } from "../../engine/effects/interpreter/compiledCards.js";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "../../cards/index.js";

const CARD_ID = "AD1-023";

describe("AD1-023 J.P., Koji, & Koichi", () => {
  it("maps the catalog, KB color assignment, threshold, security, and inherited replacement", () => {
    const definition = getCardDefinition(CARD_ID);
    const compiled = registeredCompiledCards.get(CARD_ID)!;
    expect(definition?.cardId).toBe(CARD_ID);
    expect(definition?.nameEn).toBe("J.P., Koji, & Koichi");
    expect(compiled).toMatchObject({ coverage: "full", residual: [] });

    for (const trigger of ["StartOfYourMainPhase", "OnPlay"]) {
      const effect = compiled.effects.find((entry) => entry.trigger === trigger)!;
      expect(effect.actions[0]).toMatchObject({
        kind: "PlaceUnder",
        target: {
          count: 2,
          upTo: true,
          from: ["hand", "trash"],
          filter: { differentColors: true, nameOrTrait: [{ tokens: ["Hybrid"], match: "trait" }] },
        },
        underFilter: { isSelfRef: true },
        trackCount: "placedHybrid",
      });
      expect(effect.actions[1]).toMatchObject({
        kind: "Draw",
        amount: 1,
        condition: { kind: "namedCountAtLeast", countSource: "placedHybrid", count: 1 },
      });
      expect(effect.actions[2]).toMatchObject({
        kind: "GainMemory",
        amount: 2,
        condition: { kind: "selfDigivolutionStackCountAtLeast", count: 4 },
      });
    }

    expect(compiled.effects.find((entry) => entry.trigger === "Security")).toMatchObject({
      actions: [{ kind: "PlayWithoutCost", payCost: false }],
    });
    expect(compiled.effects.find((entry) => entry.isInherited)).toMatchObject({
      trigger: "AllTurns",
      frequency: "OncePerTurn",
      actions: [
        {
          kind: "Replacement",
          event: "wouldLeavePlay",
          mode: "prevent",
          sourceFilter: { nameOrTrait: [{ tokens: ["Hybrid", "Ten Warriors"], match: "trait" }] },
          cost: { kind: "securityToHand", controller: "mine", count: 1 },
        },
      ],
    });
  });

  it("places two differently colored Hybrid cards under itself and draws", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: CARD_ID, as: "tamer" }],
          hand: [
            { card: "AD1-002", as: "redHybrid" },
            { card: "BT12-024", as: "blueHybrid" },
          ],
          deck: ["BT1-010"],
        },
      },
      { autoSelectCards: true, autoAcceptOptional: true },
    );
    await s.ready();
    await advance(s.engine).fireForPermanent(EffectTiming.OnPlay, s.perm("tamer"));
    const tamer = () => s.perm("tamer");
    await settle(() => tamer().stack.length === 2);

    expect(tamer()?.stack.map((card) => card.cardId)).toEqual(["AD1-002", "BT12-024"]);
    expect(s.state.players[0]!.hand).toHaveLength(1);
    expect(s.state.players[0]!.hand[0]!.cardId).toBe("BT1-010");
  });

  it("gains 2 memory from four existing Hybrid cards without placing another", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            {
              card: CARD_ID,
              as: "tamer",
              under: ["AD1-002", "BT12-024", "AD1-002", "BT12-024"],
            },
          ],
        },
      },
      { autoDeclineOptional: true },
    );
    await s.ready();
    s.state.memory = 0;

    await advance(s.engine).fireForPermanent(EffectTiming.OnStartMainPhase, s.perm("tamer"));

    expect(s.state.memory).toBe(2);
    expect(s.perm("tamer").stack).toHaveLength(4);
  });

  it("assigns different colors to two identical multicolor Hybrid cards (Q6113)", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: CARD_ID, as: "tamer" }],
          hand: [
            { card: "BT18-022", as: "hybrid-a" },
            { card: "BT18-022", as: "hybrid-b" },
          ],
          deck: ["BT1-010"],
        },
      },
      { autoSelectCards: true, autoAcceptOptional: true },
    );

    await advance(s.engine).fireForPermanent(EffectTiming.OnPlay, s.perm("tamer"));
    await settle(() => s.perm("tamer").stack.length === 2);
    expect(s.perm("tamer").stack).toHaveLength(2);
  });

  it("prevents a Hybrid Digimon from leaving by adding the top security card to hand", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "AD1-002", as: "host", under: [CARD_ID] }],
          security: [{ card: "BT1-101", as: "security" }],
        },
      },
      { autoAcceptOptional: true },
    );
    await s.ready();

    expect(await advance(s.engine).verb.deletePermanent([s.perm("host").permanentId], "byEffect")).toBe(0);
    expect(
      s.state.players[0]!.battleArea.some((permanent) => permanent.permanentId === s.perm("host").permanentId),
    ).toBe(true);
    expect(s.state.players[0]!.security).toHaveLength(0);
    expect(s.state.players[0]!.hand.some((card) => card.cardId === "BT1-101")).toBe(true);
  });

  it("prevents a Ten Warriors Digimon from leaving by adding the top security card to hand", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT12-032", as: "host", under: [CARD_ID] }],
          security: [{ card: "BT1-101", as: "security" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();

    expect(await advance(s.engine).verb.deletePermanent([s.perm("host").permanentId], "byEffect")).toBe(0);
    expect(s.state.players[0]!.battleArea).toHaveLength(1);
    expect(s.state.players[0]!.security).toHaveLength(0);
    expect(s.state.players[0]!.hand.map((card) => card.cardId)).toContain("BT1-101");
  });

  it("allows declining the inherited replacement without paying security", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT12-032", as: "host", under: [CARD_ID] }],
          security: [{ card: "BT1-101", as: "security" }],
        },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    await s.ready();

    expect(await advance(s.engine).verb.deletePermanent([s.perm("host").permanentId], "byEffect")).toBe(1);
    expect(s.state.players[0]!.battleArea).toHaveLength(0);
    expect(s.state.players[0]!.security).toHaveLength(1);
    expect(s.state.players[0]!.hand).toHaveLength(0);
  });

  it("does not replace a matching host's leave when its security is empty", async () => {
    const s = setupEngine(
      { 0: { battleArea: [{ card: "BT12-032", as: "host", under: [CARD_ID] }], security: [] } },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();

    expect(await advance(s.engine).verb.deletePermanent([s.perm("host").permanentId], "byEffect")).toBe(1);
    expect(s.state.players[0]!.battleArea).toHaveLength(0);
    expect(s.state.players[0]!.security).toHaveLength(0);
  });

  it("does not protect a non-Hybrid, non-Ten Warriors host", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT1-010", as: "host", under: [CARD_ID] }],
          security: [{ card: "BT1-101", as: "security" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();

    expect(await advance(s.engine).verb.deletePermanent([s.perm("host").permanentId], "byEffect")).toBe(1);
    expect(s.state.players[0]!.battleArea).toHaveLength(0);
    expect(s.state.players[0]!.security).toHaveLength(1);
  });

  it("uses the inherited replacement only once per turn", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT12-032", as: "host", under: [CARD_ID] }],
          security: ["BT1-101", "BT1-101"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    const driver = advance(s.engine);

    expect(await driver.verb.deletePermanent([s.perm("host").permanentId], "byEffect")).toBe(0);
    expect(s.state.players[0]!.security).toHaveLength(1);
    expect(await driver.verb.deletePermanent([s.perm("host").permanentId], "byEffect")).toBe(1);
    expect(s.state.players[0]!.battleArea).toHaveLength(0);
    expect(s.state.players[0]!.security).toHaveLength(1);
  });

  it("plays itself from security without paying the cost", async () => {
    const s = setupEngine(
      { 0: { security: [{ card: CARD_ID, as: "tamer", faceUp: true }] } },
      { autoDeclineOptional: true },
    );
    await advance(s.engine).fireForInstance(EffectTiming.SecuritySkill, s.inst("tamer"));
    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.cardId === CARD_ID)).toBe(true);
  });
});
