import { describe, expect, it } from "vitest";
import { EffectTiming } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine } from "../../engine/testkit/harness.js";
import "../index.js";

describe("BT19-029 Tapirmon", () => {
  it("On Play may trash the top security card to gain exactly 1 memory", async () => {
    const s = setupEngine({ 0: {
      battleArea: [{ card: "BT19-029", as: "tapir" }], security: ["BT19-030", "BT19-031"],
    } }, { autoAcceptOptional: true, autoSelectCards: true });
    s.state.memory = 0;
    await advance(s.engine).fireForPermanent(EffectTiming.OnPlay, s.perm("tapir"));
    expect(s.state.players[0]!.security.map((card) => card.cardId)).toEqual(["BT19-031"]);
    expect(s.state.players[0]!.trash.map((card) => card.cardId)).toEqual(["BT19-030"]);
    expect(s.state.memory).toBe(1);
  });

  it("may decline the On Play security cost and gains no memory", async () => {
    const s = setupEngine({ 0: {
      battleArea: [{ card: "BT19-029", as: "tapir" }], security: ["BT19-030"],
    } }, { autoDeclineOptional: true, autoSelectCards: true });
    s.state.memory = 0;
    await advance(s.engine).fireForPermanent(EffectTiming.OnPlay, s.perm("tapir"));
    expect(s.state.players[0]!.security).toHaveLength(1);
    expect(s.state.players[0]!.trash).toHaveLength(0);
    expect(s.state.memory).toBe(0);
  });

  it.each(["BT19-030", "BT18-039"])(
    "inherited prevention protects a yellow Data-or-Witchelny host once per turn (%s)",
    async (hostCard) => {
      const s = setupEngine({ 0: {
        battleArea: [{ card: hostCard, as: "host", under: ["BT19-029"] }],
        security: ["BT19-031", "BT19-032"],
      } }, { autoAcceptOptional: true, autoSelectCards: true });
      await s.ready();
      const driver = advance(s.engine);
      driver.verb.enterEffectResolution(1, ["Digimon"]);
      await driver.verb.deletePermanent([s.perm("host").permanentId], "byEffect");
      driver.verb.leaveEffectResolution();
      expect(s.state.players[0]!.battleArea).toHaveLength(1);
      expect(s.state.players[0]!.security).toHaveLength(1);
    },
  );

  it("uses the inherited prevention only once per turn", async () => {
    const s = setupEngine({ 0: {
      battleArea: [{ card: "BT19-030", as: "host", under: ["BT19-029"] }],
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

  it("does not protect a non-yellow Data host", async () => {
    const s = setupEngine({ 0: {
      battleArea: [{ card: "BT19-027", as: "host", under: ["BT19-029"] }], security: ["BT19-031"],
    } }, { autoAcceptOptional: true, autoSelectCards: true });
    await s.ready();
    const driver = advance(s.engine);
    driver.verb.enterEffectResolution(1, ["Digimon"]);
    await driver.verb.deletePermanent([s.perm("host").permanentId], "byEffect");
    driver.verb.leaveEffectResolution();
    expect(s.state.players[0]!.battleArea).toHaveLength(0);
    expect(s.state.players[0]!.security).toHaveLength(1);
  });
});
