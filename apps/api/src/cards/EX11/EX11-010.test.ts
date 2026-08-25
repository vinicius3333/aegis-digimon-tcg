import { describe, expect, it } from "vitest";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import { advance } from "../../engine/testkit/advance.js";
import { assertNoLoudGap, setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "../index.js";

describe("EX11-010 MasterTyrannomon", () => {
  it("encodes both timings, the live suspended-state gate, duration, keywords, inherited effect, and Dinosaur evolution", () => {
    const compiled = runtimeCompiledCard("EX11-010")!;

    expect(compiled.digivolutionRequirement).toEqual([{ level: 4, traits: ["Dinosaur"], cost: 3, isAlternate: true }]);
    for (const trigger of ["OnPlay", "WhenDigivolving"]) {
      expect(compiled.effects.find((effect) => effect.trigger === trigger)).toMatchObject({
        actions: [
          {
            kind: "Suspend",
            target: { filter: { controllerDefault: "any", kind: ["Digimon"] }, count: 1 },
            optional: true,
          },
          {
            kind: "ModifyDP",
            target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
            amount: 4000,
            duration: "untilOpponentTurnEnd",
            condition: { kind: "selfIsSuspended", raw: "if this Digimon is suspended" },
          },
        ],
      });
    }
    expect(compiled.effects.find((effect) => effect.trigger === "Static" && !effect.isInherited)?.keywords).toEqual([
      { keyword: "SecurityAttack", amount: 1, raw: "＜Security Attack +1＞" },
      { keyword: "Fortitude", raw: "＜Fortitude＞" },
    ]);
    expect(compiled.effects.find((effect) => effect.trigger === "Static" && effect.isInherited)?.keywords).toEqual([
      { keyword: "SecurityAttack", amount: 1, raw: "＜Security Attack +1＞" },
    ]);
  });

  it("may suspend itself on play and then gets +4000 DP", async () => {
    const s = setupEngine(
      { 0: { hand: [{ card: "EX11-010", as: "master" }] } },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("master").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.cardId === "EX11-010"));

    const master = s.state.players[0]!.battleArea.find((permanent) => permanent.topCard.cardId === "EX11-010")!;
    expect(master.isSuspended).toBe(true);
    expect(master.currentDP).toBe(11000);
    expect(s.state.memory).toBe(2);
    assertNoLoudGap(s);
  });

  it("may suspend an opponent Digimon, but gets no DP when it remains unsuspended", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: { hand: [{ card: "EX11-010", as: "master" }] },
        1: { battleArea: [{ card: "BT1-009", as: "opponent" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferred },
    );
    preferred.push(s.perm("opponent").permanentId);
    s.state.memory = 8;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("master").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.perm("opponent").isSuspended);

    const master = s.state.players[0]!.battleArea.find((permanent) => permanent.topCard.cardId === "EX11-010")!;
    expect(s.perm("opponent").isSuspended).toBe(true);
    expect(master.isSuspended).toBe(false);
    expect(master.currentDP).toBe(7000);
    assertNoLoudGap(s);
  });

  it("checks its existing suspended state after declining the optional suspension when digivolving", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX11-009", as: "base", suspended: true }],
          hand: [{ card: "EX11-010", as: "master" }],
          deck: ["BT1-001"],
        },
      },
      { autoDeclineOptional: true },
    );
    s.state.memory = 3;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("master").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard.cardId === "EX11-010");

    expect(s.perm("base").isSuspended).toBe(true);
    expect(s.perm("base").currentDP).toBe(12000);
    expect(s.state.memory).toBe(0);
    assertNoLoudGap(s);
  });

  it("may decline the suspension on play and remains at printed DP while unsuspended", async () => {
    const s = setupEngine({ 0: { hand: [{ card: "EX11-010", as: "master" }] } }, { autoDeclineOptional: true });
    s.state.memory = 8;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("master").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.cardId === "EX11-010"));

    const master = s.state.players[0]!.battleArea.find((permanent) => permanent.topCard.cardId === "EX11-010")!;
    expect(master.isSuspended).toBe(false);
    expect(master.currentDP).toBe(7000);
    assertNoLoudGap(s);
  });

  it("rejects the Dinosaur alternate path on a non-Dinosaur level 4", () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "EX11-015", as: "frigimon" }],
        hand: [{ card: "EX11-010", as: "master" }],
      },
    });
    s.state.memory = 4;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("frigimon").permanentId,
        instanceId: s.inst("master").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: false, reason: "invalid-evolution" });
  });

  it("publishes Security Attack +1 and Fortitude only in their printed placements", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "EX11-010", as: "standalone" },
          { card: "EX11-009", as: "host", under: ["EX11-010"] },
        ],
      },
    });
    await s.ready();

    expect(observe(s.engine).keywordAmount(s.perm("standalone"), "SecurityAttack")).toBe(1);
    expect(observe(s.engine).hasKeyword(s.perm("standalone"), "Fortitude")).toBe(true);
    expect(observe(s.engine).keywordAmount(s.perm("host"), "SecurityAttack")).toBe(1);
    expect(observe(s.engine).hasKeyword(s.perm("host"), "Fortitude")).toBe(false);
  });

  it("replays itself through Fortitude when deleted with an evolution card", async () => {
    const s = setupEngine(
      { 0: { battleArea: [{ card: "EX11-010", as: "master", under: ["EX11-009"] }] } },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const masterInstanceId = s.perm("master").topCard!.instanceId;

    await advance(s.engine).verb.deletePermanent([s.perm("master").permanentId], "byEffect");
    await settle(() =>
      s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.instanceId === masterInstanceId),
    );

    const replayed = s.state.players[0]!.battleArea.find(
      (permanent) => permanent.topCard?.instanceId === masterInstanceId,
    );
    expect(replayed).toBeDefined();
    expect(replayed?.stack).toHaveLength(0);
    assertNoLoudGap(s);
  });
});
