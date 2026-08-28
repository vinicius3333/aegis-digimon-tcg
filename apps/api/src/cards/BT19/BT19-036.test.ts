import { describe, expect, it } from "vitest";
import { digivolutionRequirementsFor, EffectTiming } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine } from "../../engine/testkit/harness.js";
import "../index.js";

describe("BT19-036 Wizardmon (X Antibody)", () => {
  it("has the free Wizardmon evolution route", () => {
    expect(digivolutionRequirementsFor("BT19-036")).toContainEqual({
      names: ["Wizardmon"], cost: 0, isAlternate: true,
    });
  });

  it.each([
    [EffectTiming.OnPlay, "BT1-102"],
    [EffectTiming.WhenDigivolving, "BT10-107"],
  ] as const)("%s cycles top security and may bottom an eligible yellow or purple Option", async (timing, optionCard) => {
    const s = setupEngine({ 0: {
      battleArea: [{ card: "BT19-036", as: "wizardX", under: ["BT18-036"] }],
      security: [{ card: "BT19-030", as: "topSecurity" }],
      hand: [{ card: optionCard, as: "option" }, { card: "BT19-020", as: "nonOption" }],
    } }, { autoAcceptOptional: true, autoSelectCards: true });
    await advance(s.engine).fireForPermanent(timing, s.perm("wizardX"));
    expect(s.state.players[0]!.hand.map((card) => card.cardId).sort()).toEqual(["BT19-020", "BT19-030"].sort());
    expect(s.state.players[0]!.security.map((card) => card.cardId)).toEqual([optionCard]);
  });

  it("may bottom the Option even when no top security card can be added to hand (Q3093)", async () => {
    const s = setupEngine({ 0: {
      battleArea: [{ card: "BT19-036", as: "wizardX", under: ["BT18-036"] }],
      hand: [{ card: "BT1-102", as: "option" }],
    } }, { autoAcceptOptional: true, autoSelectCards: true });
    await advance(s.engine).fireForPermanent(EffectTiming.OnPlay, s.perm("wizardX"));
    expect(s.state.players[0]!.hand).toHaveLength(0);
    expect(s.state.players[0]!.security.map((card) => card.cardId)).toEqual(["BT1-102"]);
  });

  it("does not bottom a hand Option without Wizardmon or X Antibody in the stack", async () => {
    const s = setupEngine({ 0: {
      battleArea: [{ card: "BT19-036", as: "wizardX", under: ["BT19-030"] }],
      security: ["BT19-031"], hand: [{ card: "BT1-102", as: "option" }],
    } }, { autoAcceptOptional: true, autoSelectCards: true });
    await advance(s.engine).fireForPermanent(EffectTiming.OnPlay, s.perm("wizardX"));
    expect(s.state.players[0]!.hand.map((card) => card.cardId).sort()).toEqual(["BT1-102", "BT19-031"].sort());
    expect(s.state.players[0]!.security).toHaveLength(0);
  });

  it.each(["BT19-030", "BT18-039"])(
    "inherited prevention protects a yellow Data-or-Witchelny host from an opponent effect (%s)",
    async (hostCard) => {
      const s = setupEngine({ 0: {
        battleArea: [{ card: hostCard, as: "host", under: ["BT19-036"] }], security: ["BT19-031"],
      } }, { autoAcceptOptional: true, autoSelectCards: true });
      await s.ready();
      const driver = advance(s.engine);
      driver.verb.enterEffectResolution(1, ["Digimon"]);
      await driver.verb.deletePermanent([s.perm("host").permanentId], "byEffect");
      driver.verb.leaveEffectResolution();
      expect(s.state.players[0]!.battleArea).toHaveLength(1);
      expect(s.state.players[0]!.security).toHaveLength(0);
    },
  );

  it("does not protect a non-yellow Data host", async () => {
    const s = setupEngine({ 0: {
      battleArea: [{ card: "BT19-027", as: "host", under: ["BT19-036"] }], security: ["BT19-031"],
    } }, { autoAcceptOptional: true, autoSelectCards: true });
    await s.ready();
    const driver = advance(s.engine);
    driver.verb.enterEffectResolution(1, ["Digimon"]);
    await driver.verb.deletePermanent([s.perm("host").permanentId], "byEffect");
    driver.verb.leaveEffectResolution();
    expect(s.state.players[0]!.battleArea).toHaveLength(0);
    expect(s.state.players[0]!.security).toHaveLength(1);
  });

  it("uses the inherited prevention only once per turn", async () => {
    const s = setupEngine({ 0: {
      battleArea: [{ card: "BT19-030", as: "host", under: ["BT19-036"] }],
      security: ["BT19-031", "BT19-032"],
    } }, { autoAcceptOptional: true, autoSelectCards: true });
    await s.ready();
    const driver = advance(s.engine);
    driver.verb.enterEffectResolution(1, ["Digimon"]);
    await driver.verb.deletePermanent([s.perm("host").permanentId], "byEffect");
    driver.verb.leaveEffectResolution();
    driver.verb.enterEffectResolution(1, ["Digimon"]);
    await driver.verb.deletePermanent([s.perm("host").permanentId], "byEffect");
    driver.verb.leaveEffectResolution();
    expect(s.state.players[0]!.battleArea).toHaveLength(0);
    expect(s.state.players[0]!.security).toHaveLength(1);
  });
});
