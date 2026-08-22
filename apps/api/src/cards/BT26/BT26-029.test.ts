import { describe, expect, it } from "vitest";
import { EffectTiming } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { observe } from "../../engine/testkit/observe.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./BT26-029.js";
import "../index.js";

describe("BT26-029 compiled fidelity", () => {
  it("encodes Decode/Ascension, security-paid protection, both removal watchers, and the Angel rule trait", () => {
    const card = compiled;
    expect(card?.coverage).toBe("full");
    expect(card?.residual).toEqual([]);
    expect(card?.effects?.find((effect) => effect.trigger === "Static" && effect.keywords)?.keywords?.map((keyword) => keyword.keyword)).toEqual(expect.arrayContaining(["Decode", "Ascension"]));
    expect(card?.effects?.[0]?.actions).toMatchObject([
      { kind: "SecurityManipulation", op: "trashTop" },
      { kind: "SelectBind" },
      { kind: "Restrict", restriction: "dpImmune" },
      { kind: "StackTrashLock" },
      { kind: "Restrict", restriction: "returnToHandOrDeck" },
    ]);
    expect(card?.effects?.[2]?.actions).toMatchObject([
      {
        kind: "Replacement",
        event: "wouldLeavePlay",
        actions: [{ kind: "PlayWithoutCost", fromOwnDigivolutionStack: true, payCost: false }],
      },
    ]);
    expect(card?.effects?.[4]?.actions).toMatchObject([
      { kind: "SubTrigger", event: "whenSecurityRemoved" },
      { kind: "SubTrigger", event: "whenEffectRemovesFromSecurity" },
    ]);
  });

  it("trashes its top security and protects one chosen Digimon until the opponent's turn ends", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT26-029", as: "holy", under: ["BT24-034"] }],
          security: ["BT1-001"],
        },
        1: { battleArea: [{ card: "BT1-009", as: "opponent" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await advance(s.engine).fire(EffectTiming.OnPlay, s.perm("holy"));

    expect(s.state.players[0]!.security).toHaveLength(0);
    expect(observe(s.engine).isRestricted(s.perm("holy"), "dpImmune")).toBe(true);
    expect(observe(s.engine).isRestricted(s.perm("holy"), "beReturned")).toBe(true);
  });

  it("when its security is removed gives exactly 3 opponent Digimon -5000 DP only once", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT26-029", as: "holy" }],
        security: [
          { card: "BT1-001", as: "firstSecurity" },
          { card: "BT1-002", as: "secondSecurity" },
        ],
      },
      1: {
        battleArea: [
          { card: "BT1-009", as: "first", dp: 6000 },
          { card: "BT1-010", as: "second", dp: 6000 },
          { card: "BT1-011", as: "third", dp: 6000 },
          { card: "BT1-012", as: "fourth", dp: 6000 },
        ],
      },
    }, { autoSelectCards: true });
    await s.ready();

    await advance(s.engine).verb.trashFromSecurity(0, 1);
    expect([s.perm("first"), s.perm("second"), s.perm("third"), s.perm("fourth")].filter((permanent) => permanent.currentDP === 1000)).toHaveLength(3);

    await advance(s.engine).verb.trashFromSecurity(0, 1);
    expect([s.perm("first"), s.perm("second"), s.perm("third"), s.perm("fourth")].filter((permanent) => permanent.currentDP === 1000)).toHaveLength(3);
  });


  it("evolves from Aegiomon for 3 and applies the paid protection on When Digivolving", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT24-034", as: "aegiomon" }],
        hand: [{ card: "BT26-029", as: "holy" }],
        security: [{ card: "BT1-001", as: "cost" }],
        deck: ["BT1-009"],
      },
    }, { autoSelectCards: true });
    s.state.memory = 3;

    expect(s.engine.applyIntent(0, {
      type: "digivolve",
      permanentId: s.perm("aegiomon").permanentId,
      instanceId: s.inst("holy").instanceId,
      useAlternateCost: true,
    })).toEqual({ ok: true });
    await settle(() => observe(s.engine).isRestricted(s.perm("aegiomon"), "beReturned"));

    expect(s.perm("aegiomon").topCard.cardId).toBe("BT26-029");
    expect(s.state.memory).toBe(0);
    expect(s.state.players[0]!.security).toHaveLength(0);
    expect(observe(s.engine).isRestricted(s.perm("aegiomon"), "dpImmune")).toBe(true);
    expect(observe(s.engine).isRestricted(s.perm("aegiomon"), "beReturned")).toBe(true);
  });

  it("publishes Decode, Ascension, and the rule-granted Angel trait", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT26-029", as: "holy" }] } });
    await s.ready();
    expect(observe(s.engine).hasKeyword(s.perm("holy"), "Decode")).toBe(true);
    expect(observe(s.engine).hasKeyword(s.perm("holy"), "Ascension")).toBe(true);
    expect(observe(s.engine).hasEffectiveTrait(s.perm("holy"), "Angel")).toBe(true);
  });

  it("Decode plays Aegiomon from its stack when Holy leaves outside battle", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT26-029", as: "holy", under: [{ card: "BT24-034", as: "aegiomon" }] }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );

    const holyId = s.perm("holy").topCard.instanceId;
    expect(await advance(s.engine).verb.deletePermanent([s.perm("holy").permanentId], "byEffect")).toBe(1);
    await settle(() => s.state.players[0]!.security.some((card) => card.instanceId === holyId));

    expect(s.state.players[0]!.security.map((card) => card.instanceId)).toContain(holyId);
    expect(s.state.players[0]!.trash.some((card) => card.instanceId === s.inst("aegiomon").instanceId)).toBe(false);
  });
});
