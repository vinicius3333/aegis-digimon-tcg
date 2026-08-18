import { describe, expect, it } from "vitest";
import { advance } from "../engine/testkit/advance.js";
import { setupEngine } from "../engine/testkit/harness.js";
import { observe } from "../engine/testkit/observe.js";
import "./BT7/BT7-005.js";
import "./BT7/BT7-056.js";
import "./BT8/BT8-005.js";
import "./BT8/BT8-066.js";
import "./BT8/BT8-069.js";
import "./BT9/BT9-066.js";
import "./ST13/ST13-05.js";
import "./ST13/ST13-14.js";

describe("digivolution-card placement watcher scope", () => {
  it("installs a filtered watcher for every scoped BT7-BT9 and ST13 source-placement effect", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "BT1-081", under: ["BT7-005"], as: "dorimonHost" },
          { card: "BT1-081", under: ["BT7-056"], as: "dorumonHost" },
          { card: "BT1-081", under: ["BT8-005"], as: "kyokyomonHost" },
          { card: "BT8-066", as: "hisyaryumon" },
          { card: "BT8-069", as: "ouryumon" },
          { card: "BT9-066", as: "alphamon" },
          { card: "ST13-05", as: "durandamon" },
          { card: "ST13-14", as: "bryweludramon" },
        ],
      },
    });
    await s.ready();

    for (const alias of [
      "dorimonHost",
      "dorumonHost",
      "kyokyomonHost",
      "hisyaryumon",
      "ouryumon",
      "alphamon",
      "durandamon",
      "bryweludramon",
    ]) {
      const subscriptions = observe(s.engine).subscriptions(
        "onAddDigivolutionCards",
        s.perm(alias).permanentId,
      );
      expect(subscriptions, alias).toHaveLength(1);
      expect(subscriptions[0]?.matches, alias).toBeTypeOf("function");
    }
  });

  it("isolates inherited draw, memory, and DP payoffs to the host receiving the source", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "BT1-081", under: ["BT7-005"], as: "dorimonHost" },
          { card: "BT1-081", under: ["BT7-056"], as: "dorumonHost" },
          { card: "BT1-081", under: ["BT8-005"], as: "kyokyomonHost" },
          { card: "BT1-081", as: "unrelatedHost" },
        ],
        hand: [
          { card: "BT1-009", as: "unrelatedSource" },
          { card: "BT1-010", as: "dorimonSource" },
          { card: "BT1-011", as: "dorumonSource" },
          { card: "BT1-012", as: "kyokyomonSource" },
        ],
        deck: [{ card: "BT1-013", as: "drawn" }],
      },
    });
    s.state.memory = 0;
    await s.ready();
    const kyokyomonBaseDP = s.perm("kyokyomonHost").currentDP;

    await advance(s.engine).verb.placeUnder(
      s.perm("unrelatedHost").permanentId,
      [s.inst("unrelatedSource").instanceId],
    );
    expect(s.state.players[0]!.hand).not.toContainEqual(s.inst("drawn"));
    expect(s.state.memory).toBe(0);
    expect(s.perm("kyokyomonHost").currentDP).toBe(kyokyomonBaseDP);

    await advance(s.engine).verb.placeUnder(
      s.perm("dorimonHost").permanentId,
      [s.inst("dorimonSource").instanceId],
    );
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toContain(s.inst("drawn").instanceId);
    expect(s.state.memory).toBe(0);

    await advance(s.engine).verb.placeUnder(
      s.perm("dorumonHost").permanentId,
      [s.inst("dorumonSource").instanceId],
    );
    expect(s.state.memory).toBe(1);

    await advance(s.engine).verb.placeUnder(
      s.perm("kyokyomonHost").permanentId,
      [s.inst("kyokyomonSource").instanceId],
    );
    expect(s.perm("kyokyomonHost").currentDP).toBe(kyokyomonBaseDP + 1_000);
  });

  it("keeps Ouryumon's errata-wide ally observer while ignoring opponent source placement", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "BT8-069", as: "ouryumon" },
          { card: "BT1-081", as: "alliedHost" },
        ],
        hand: [
          { card: "BT1-009", as: "opponentSource" },
          { card: "BT1-010", as: "alliedSource" },
        ],
      },
      1: { battleArea: [{ card: "BT1-081", as: "opposingHost" }] },
    });
    await s.ready();
    const baseDP = s.perm("ouryumon").currentDP;

    await advance(s.engine).verb.placeUnder(
      s.perm("opposingHost").permanentId,
      [s.inst("opponentSource").instanceId],
    );
    expect(s.perm("ouryumon").currentDP).toBe(baseDP);

    await advance(s.engine).verb.placeUnder(
      s.perm("alliedHost").permanentId,
      [s.inst("alliedSource").instanceId],
    );
    expect(s.perm("ouryumon").currentDP).toBe(baseDP + 2_000);
  });
});
