import { describe, expect, it } from "vitest";
import { EffectTiming } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "../index.js";

describe("BT19-041 Dynasmon", () => {
  it.each([
    ["BT19-037", "BT19-035"],
    ["BT19-011", "BT19-009"],
  ] as const)("legally digivolves from a yellow or red level-5 evolved stack (%s)", async (base, source) => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: base, as: "base", under: [source] }],
          hand: [{ card: "BT19-041", as: "dynas" }],
          deck: ["BT19-030"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 5;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("dynas").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard?.cardId === "BT19-041");
    expect(s.perm("base").stack.map((card) => card.cardId)).toEqual([source, base]);
    expect(s.state.memory).toBe(2);
    expect(s.state.players[0]!.hand.some((card) => card.cardId === "BT19-041")).toBe(false);
    expect(s.state.players[0]!.hand.map((card) => card.cardId)).toEqual(["BT19-030"]);
  });

  it.each([EffectTiming.OnPlay, EffectTiming.WhenDigivolving])(
    "%s may trash top security to give the same friendly Digimon Blocker and +6000 DP",
    async (timing) => {
      const s = setupEngine(
        {
          0: {
            battleArea: [
              { card: "BT19-041", as: "dynas" },
              { card: "BT19-020", as: "peer" },
            ],
            security: ["BT19-030", "BT19-031"],
          },
        },
        { autoAcceptOptional: true, autoSelectCards: true },
      );
      await s.ready();
      await advance(s.engine).fireForPermanent(timing, s.perm("dynas"));
      expect(s.state.players[0]!.security.map((card) => card.cardId)).toEqual(["BT19-031"]);
      const affected = ["dynas", "peer"].filter(
        (alias) => s.perm(alias).currentDP > (alias === "dynas" ? 11000 : 5000),
      );
      expect(affected).toHaveLength(1);
      expect(observe(s.engine).hasKeyword(s.perm(affected[0]!), "Blocker")).toBe(true);
      const untouched = affected[0] === "dynas" ? "peer" : "dynas";
      expect(observe(s.engine).hasKeyword(s.perm(untouched), "Blocker")).toBe(false);
    },
  );

  it("may decline the security cost and grants neither DP nor Blocker", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT19-041", as: "dynas" }],
          security: ["BT19-030"],
        },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    await s.ready();
    await advance(s.engine).fireForPermanent(EffectTiming.OnPlay, s.perm("dynas"));
    expect(s.state.players[0]!.security).toHaveLength(1);
    expect(s.perm("dynas").currentDP).toBe(11000);
    expect(observe(s.engine).hasKeyword(s.perm("dynas"), "Blocker")).toBe(false);
  });

  it("cannot pay the cost at zero security and grants neither DP nor Blocker", async () => {
    const s = setupEngine(
      { 0: { battleArea: [{ card: "BT19-041", as: "dynas" }] } },
      {
        autoAcceptOptional: true,
        autoSelectCards: true,
      },
    );
    await s.ready();
    await advance(s.engine).fireForPermanent(EffectTiming.OnPlay, s.perm("dynas"));
    expect(s.perm("dynas").currentDP).toBe(11000);
    expect(observe(s.engine).hasKeyword(s.perm("dynas"), "Blocker")).toBe(false);
    expect(s.state.players[0]!.security).toHaveLength(0);
    expect(s.state.players[0]!.trash).toHaveLength(0);
  });

  it("keeps +6000 DP and Blocker through the owner's turn, then expires at the opponent's turn end", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT19-041", as: "dynas" }], security: ["BT19-030"], deck: ["BT19-031", "BT19-032"] },
        1: { deck: ["BT19-030", "BT19-031"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    await advance(s.engine).fireForPermanent(EffectTiming.OnPlay, s.perm("dynas"));
    expect(s.perm("dynas").currentDP).toBe(17000);
    expect(observe(s.engine).hasKeyword(s.perm("dynas"), "Blocker")).toBe(true);
    await advance(s.engine).runTurn(0);
    expect(s.perm("dynas").currentDP).toBe(17000);
    expect(observe(s.engine).hasKeyword(s.perm("dynas"), "Blocker")).toBe(true);
    s.state.turnSeat = 1;
    s.state.memory = -s.state.memory;
    await advance(s.engine).runTurn(1);
    expect(s.perm("dynas").currentDP).toBe(11000);
    expect(observe(s.engine).hasKeyword(s.perm("dynas"), "Blocker")).toBe(false);
  });

  it.each([2, 3])("recovers on would-leave only at 2 or fewer security, then still leaves (%s)", async (count) => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT19-041", as: "dynas" }],
          security: Array.from({ length: count }, () => "BT19-030"),
          deck: ["BT19-031"],
        },
      },
      { autoSelectCards: true },
    );
    await s.ready();
    await advance(s.engine).verb.deletePermanent([s.perm("dynas").permanentId], "byEffect");
    await settle(() => s.state.players[0]!.battleArea.length === 0);
    expect(s.state.players[0]!.security).toHaveLength(count === 2 ? 3 : 3);
    expect(s.state.players[0]!.deck).toHaveLength(count === 2 ? 0 : 1);
  });

  it("can recover before Tapirmon's simultaneous prevention cost (Q3095)", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT19-041", as: "dynas", under: ["BT19-029"] }],
          security: ["BT19-030", "BT19-032"],
          deck: ["BT19-031"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoOrderTriggers: true },
    );
    await s.ready();
    const driver = advance(s.engine);
    driver.verb.enterEffectResolution(1, ["Digimon"]);
    await driver.verb.deletePermanent([s.perm("dynas").permanentId], "byEffect");
    driver.verb.leaveEffectResolution();
    expect(s.state.players[0]!.battleArea).toHaveLength(1);
    expect(s.state.players[0]!.deck).toHaveLength(0);
    expect(s.state.players[0]!.security.map((card) => card.cardId)).toEqual(["BT19-030", "BT19-032"]);
    expect(s.state.players[0]!.trash.map((card) => card.cardId)).toEqual(["BT19-031"]);
  });

  it("can order Tapirmon's simultaneous prevention before Dynasmon's Recovery (Q3095 reverse)", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT19-041", as: "dynas", under: ["BT19-029"] }],
          security: ["BT19-030", "BT19-032"],
          deck: ["BT19-031"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoOrderTriggers: false },
    );
    await s.ready();
    const driver = advance(s.engine);
    driver.verb.enterEffectResolution(1, ["Digimon"]);
    const deleting = driver.verb.deletePermanent([s.perm("dynas").permanentId], "byEffect");
    await settle(() => s.state.pendingDecision?.kind === "orderTriggers");
    const pending = s.state.pendingDecision!;
    const request = s.decisions.find(({ req }) => req.decisionId === pending.decisionId)!.req;
    const keys = request.options?.triggerKeys ?? [];
    expect(keys).toHaveLength(2);
    const tapirmonKey = keys.find((key) => key.includes("BT19-029"));
    expect(tapirmonKey).toBeDefined();
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: pending.decisionId,
        response: { kind: "orderTriggers", order: [tapirmonKey!] },
      }),
    ).toEqual({ ok: true });
    await deleting;
    driver.verb.leaveEffectResolution();
    expect(s.state.players[0]!.battleArea).toHaveLength(1);
    expect(s.state.players[0]!.security.map((card) => card.cardId)).toEqual(["BT19-031", "BT19-032"]);
    expect(s.state.players[0]!.trash.map((card) => card.cardId)).toEqual(["BT19-030"]);
  });

  it("uses the would-leave Recovery only once across a second leave event", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT19-041", as: "dynas", under: ["BT19-029"] }],
          security: ["BT19-030"],
          deck: ["BT19-031", "BT19-032"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoOrderTriggers: true },
    );
    await s.ready();
    const driver = advance(s.engine);
    driver.verb.enterEffectResolution(1, ["Digimon"]);
    await driver.verb.deletePermanent([s.perm("dynas").permanentId], "byEffect");
    driver.verb.leaveEffectResolution();
    expect(s.state.players[0]!.battleArea).toHaveLength(1);
    expect(s.state.players[0]!.deck).toHaveLength(1);
    expect(s.state.players[0]!.security).toHaveLength(1);

    driver.verb.enterEffectResolution(1, ["Digimon"]);
    await driver.verb.deletePermanent([s.perm("dynas").permanentId], "byEffect");
    driver.verb.leaveEffectResolution();
    expect(s.state.players[0]!.battleArea).toHaveLength(0);
    expect(s.state.players[0]!.deck).toHaveLength(1);
    expect(s.state.players[0]!.security).toHaveLength(1);
  });

  it("resolves On Play from a public play intent", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "BT19-041", as: "dynas" }],
          security: ["BT19-030", "BT19-031"],
          battleArea: [{ card: "BT19-020", as: "peer" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("dynas").instanceId })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.security.length === 1);
    expect(s.state.players[0]!.security).toHaveLength(1);
    expect(s.state.players[0]!.battleArea.some((p) => observe(s.engine).hasKeyword(p, "Blocker"))).toBe(true);
  });
});
