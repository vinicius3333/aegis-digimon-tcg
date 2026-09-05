import { describe, expect, it } from "vitest";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { advance } from "../../engine/testkit/advance.js";
import "./P-194.js";

describe("P-194 Aegiomon", () => {
  it("requires a level 3 TS Digimon for evolution", () => {
    expect(runtimeCompiledCard("P-194")!.digivolutionRequirement).toEqual([
      { level: 3, traits: ["TS"], cost: 2, isAlternate: true },
    ]);
  });

  it("has Blocker and Barrier, with inherited Barrier preserved", () => {
    const card = runtimeCompiledCard("P-194")!;
    expect(card.effects.filter((effect) => !effect.isInherited).flatMap((effect) => effect.keywords ?? [])).toEqual([
      { keyword: "Blocker", raw: "＜Blocker＞" },
      { keyword: "Barrier", raw: "＜Barrier＞" },
    ]);
    expect(card.effects.find((effect) => effect.isInherited)).toMatchObject({
      keywords: [{ keyword: "Barrier", raw: "＜Barrier＞" }],
    });
  });

  it("exposes Blocker and Barrier on the live Aegiomon", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "P-194", as: "aegio" }] } });
    await s.ready();
    expect(observe(s.engine).hasKeyword(s.perm("aegio"), "Blocker")).toBe(true);
    expect(observe(s.engine).hasKeyword(s.perm("aegio"), "Barrier")).toBe(true);
  });

  it("passes inherited Barrier through a real evolution stack", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT1-009", as: "host", under: ["P-194"] }] } });
    await s.ready();
    expect(observe(s.engine).hasKeyword(s.perm("host"), "Barrier")).toBe(true);
  });

  it("uses inherited Barrier to survive a battle deletion after the stack evolves", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT24-009", as: "host" }],
        hand: [
          { card: "P-194", as: "aegio" },
          { card: "BT1-057", as: "higher" },
        ],
        security: ["BT1-001", "BT1-002"],
      },
    });
    s.state.memory = 4;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("host").permanentId,
        instanceId: s.inst("aegio").instanceId,
        alternateRequirementIndex: 0,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("host").topCard.cardId === "P-194");
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("host").permanentId,
        instanceId: s.inst("higher").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("host").topCard.cardId === "BT1-057");
    expect(s.perm("host").stack.some((card) => card.cardId === "P-194")).toBe(true);
    const hostId = s.perm("host").permanentId;
    const deletion = advance(s.engine).verb.deletePermanent([hostId], "byBattle");
    await settle(() => s.events.some((event) => event.kind === "barrierPrompt"));
    expect(s.engine.applyIntent(0, { type: "respondBarrier", permanentId: hostId, accept: true })).toEqual({
      ok: true,
    });
    expect(await deletion).toBe(0);
    expect(s.state.players[0]!.battleArea).toHaveLength(1);
    expect(s.state.players[0]!.security).toHaveLength(1);
  });
});
