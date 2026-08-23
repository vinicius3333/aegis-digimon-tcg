import { describe, expect, it } from "vitest";
import { advance } from "../engine/testkit/advance.js";
import { setupEngine } from "../engine/testkit/harness.js";
import "./BT4/BT4-088.js";
import "./BT4/BT4-097.js";
import "./BT6/BT6-032.js";
import "./BT6/BT6-034.js";
import "./BT6/BT6-040.js";
import "./BT6/BT6-044.js";
import "./BT9/BT9-016.js";

describe("security removal watcher direction", () => {
  it("separates own-security Kari and Dynasmon effects from WarGreymon's opponent-security effect", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT4-097", as: "kari" },
            { card: "BT6-044", as: "dynasmon" },
            { card: "BT9-016", as: "warGreymonX" },
          ],
          security: ["BT1-001", "BT1-002", "BT1-003"],
          deck: [{ card: "BT1-004", as: "recovered" }],
        },
      },
      { autoAcceptOptional: true, autoOrderTriggers: true },
    );
    s.state.memory = 0;
    await s.ready();

    await advance(s.engine).fireSubTrigger("whenSecurityRemoved", {
      removedFromSecuritySeat: 1,
    });
    expect(s.state.memory).toBe(1);
    expect(s.perm("kari").isSuspended).toBe(false);
    expect(s.state.players[0]!.security).toHaveLength(3);

    await advance(s.engine).fireSubTrigger("whenSecurityRemoved", {
      removedFromSecuritySeat: 0,
    });
    expect(s.state.memory).toBe(2);
    expect(s.perm("kari").isSuspended).toBe(true);
    expect(s.state.players[0]!.security).toHaveLength(4);
    expect(s.state.players[0]!.security.map((card) => card.instanceId)).toContain(s.inst("recovered").instanceId);
  });

  it("fires Tapirmon, Wizardmon, and Mistymon only for their controller's security", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT1-081", under: ["BT6-032"], as: "tapirmonHost" },
            { card: "BT1-081", under: ["BT6-034"], as: "wizardmonHost" },
            { card: "BT1-081", under: ["BT6-040"], as: "mistymonHost" },
          ],
          deck: [{ card: "BT1-001", as: "drawn" }],
        },
        1: { battleArea: [{ card: "BT1-081", as: "dpTarget" }] },
      },
      { autoSelectCards: true, autoOrderTriggers: true },
    );
    s.state.memory = 0;
    await s.ready();
    const targetBaseDP = s.perm("dpTarget").currentDP;

    await advance(s.engine).fireSubTrigger("whenSecurityRemoved", {
      removedFromSecuritySeat: 1,
    });
    expect(s.state.players[0]!.hand).toHaveLength(0);
    expect(s.state.memory).toBe(0);
    expect(s.perm("dpTarget").currentDP).toBe(targetBaseDP);

    await advance(s.engine).fireSubTrigger("whenSecurityRemoved", {
      removedFromSecuritySeat: 0,
    });
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toContain(s.inst("drawn").instanceId);
    expect(s.state.memory).toBe(1);
    expect(s.perm("dpTarget").currentDP).toBe(targetBaseDP - 2_000);
  });

  it("makes DanDevimon retaliate only when its controller's security loses a card", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT4-088", as: "danDevimon" }] },
      1: {
        security: [
          { card: "BT1-001", as: "removedSecurity" },
          { card: "BT1-002", as: "remainingSecurity" },
        ],
      },
    });
    s.state.turnSeat = 1;
    await s.ready();

    await advance(s.engine).fireSubTrigger("whenSecurityRemoved", {
      removedFromSecuritySeat: 1,
    });
    expect(s.state.players[1]!.security).toHaveLength(2);

    await advance(s.engine).fireSubTrigger("whenSecurityRemoved", {
      removedFromSecuritySeat: 0,
    });
    expect(s.state.players[1]!.security).toHaveLength(1);
    expect(s.state.players[1]!.trash.map((card) => card.instanceId)).toContain(s.inst("removedSecurity").instanceId);
  });
});
