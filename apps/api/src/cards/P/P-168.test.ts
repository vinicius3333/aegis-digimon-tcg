import { describe, expect, it } from "vitest";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import { EffectTiming } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./P-164.js";
import "./P-168.js";

describe("P-168 Yao Qinglan", () => {
  it("gains memory at start of main only when the opponent has a Digimon", () => {
    const effect = runtimeCompiledCard("P-168")!.effects.find((entry) => entry.trigger === "StartOfYourMainPhase");
    expect(effect?.actions[0]).toMatchObject({
      kind: "GainMemory",
      amount: 1,
      condition: { kind: "opponentHas", filter: { kind: ["Digimon"] } },
    });
  });

  it("suspends to evolve the exact Aqua or Sea Animal trigger subject without bypassing requirements", () => {
    const effect = runtimeCompiledCard("P-168")!.effects.find((entry) => entry.trigger === "YourTurn")!;
    const subTrigger = effect.actions[0];
    expect(subTrigger).toMatchObject({
      kind: "SubTrigger",
      event: "onAddDigivolutionCards",
      sourceFilter: { controller: "mine", kind: ["Digimon"] },
      actions: [
        {
          kind: "Digivolve",
          target: { sourceRef: "triggerSubject" },
          from: ["hand"],
          payCost: true,
          reduceCost: 1,
          optional: true,
          cost: { kind: "suspend", target: { isSelf: true } },
        },
      ],
    });
    expect(JSON.stringify(subTrigger)).not.toContain("ignoreRequirements");
  });

  it("gains one memory at the start of main when the opponent has a Digimon", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "P-168", as: "yao" }] },
      1: { battleArea: [{ card: "BT1-009", as: "opponent" }] },
    });
    await s.ready();
    const before = s.state.memory;
    await advance(s.engine).fire(EffectTiming.OnStartMainPhase, s.perm("yao"));
    await settle();
    expect(s.state.memory).toBe(before + 1);
  });

  it("reacts to an effect placing a digivolution card, then pays the reduced Aqua evolution cost", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "P-168", as: "yao" },
            { card: "BT1-033", as: "host" },
          ],
          hand: [
            { card: "P-164", as: "shellmon" },
            { card: "BT1-033", as: "placed" },
            { card: "BT7-027", as: "whamon" },
          ],
          deck: [{ card: "BT1-001", as: "drawn" }],
        },
        1: { battleArea: [{ card: "BT1-009", as: "opponent" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferred },
    );
    preferred.push(s.inst("placed").instanceId, s.perm("host").topCard!.instanceId, s.inst("whamon").instanceId);
    await s.ready();
    s.state.memory = 10;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("shellmon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.perm("host").topCard.cardId === "BT7-027");
    expect(s.perm("host").stack.some((card) => card.instanceId === s.inst("placed").instanceId)).toBe(true);
    expect(s.perm("yao").isSuspended).toBe(true);
    // Shellmon costs 4 to play and Whamon costs 3 to digivolve; Yao's reaction
    // reduces that actual digivolution payment by 1.
    expect(s.state.memory).toBe(4);
  });

  it("plays itself for free from Security", async () => {
    const s = setupEngine(
      {
        0: { security: [{ card: "P-168", as: "yao" }, "BT1-001"] },
        1: { battleArea: [{ card: "BT1-009", as: "attacker" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.turnSeat = 1;
    s.state.memory = 0;
    await s.ready();
    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some((p) => p.topCard?.cardId === "P-168"));
    expect(s.state.players[0]!.battleArea.some((p) => p.topCard?.cardId === "P-168")).toBe(true);
    expect(s.state.players[0]!.security).toHaveLength(1);
    expect(s.state.memory).toBe(0);
  });
});
