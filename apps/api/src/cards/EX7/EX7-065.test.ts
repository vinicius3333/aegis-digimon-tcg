import { describe, expect, it } from "vitest";
import { EffectTiming } from "@aegis/shared";
import { effectsOf } from "../../engine/effects/collect.js";
import { advance } from "../../engine/testkit/advance.js";
import { settle, setupEngine } from "../../engine/testkit/harness.js";
import { compiled } from "./EX7-065.js";

function mainEffectKey(s: ReturnType<typeof setupEngine>): string {
  const source = (s.engine as unknown as { cardSourceOf(instance: unknown): unknown }).cardSourceOf(
    s.perm("yuuki").topCard!,
  ) as never;
  const effect = effectsOf(EffectTiming.OnDeclaration, source).find((entry) => entry.effectKey.startsWith("EX7-065/"));
  if (effect === undefined) throw new Error("EX7-065 did not surface its Main effect");
  return effect.effectKey;
}

describe("EX7-065 Yuuki", () => {
  it("gains 1 memory when the opponent has a Digimon and can digivolve from trash by suspending itself", () => {
    expect(compiled.effects?.find((entry) => entry.trigger === "StartOfYourMainPhase")?.actions[0]).toMatchObject({
      kind: "GainMemory",
      amount: 1,
      condition: { kind: "opponentHas" },
    });
    expect(compiled.effects?.find((entry) => entry.trigger === "Main")?.actions[0]).toMatchObject({
      kind: "Digivolve",
      from: ["trash"],
      optional: true,
      cost: { kind: "suspend" },
      condition: { kind: "zoneCount", value: 4 },
    });
  });
  it("plays itself from security", () =>
    expect(compiled.effects?.find((entry) => entry.isSecurity)?.actions[0]).toMatchObject({
      kind: "PlayWithoutCost",
      payCost: false,
    }));

  it("gains memory only when the opponent has a Digimon at the start of Main", async () => {
    const withOpponent = setupEngine({
      0: { battleArea: [{ card: "EX7-065", as: "yuuki" }] },
      1: { battleArea: [{ card: "BT1-009" }] },
    });
    withOpponent.state.memory = 0;
    await advance(withOpponent.engine).fire(EffectTiming.StartOfYourMainPhase, withOpponent.perm("yuuki"));
    expect(withOpponent.state.memory).toBe(1);

    const withoutOpponent = setupEngine({ 0: { battleArea: [{ card: "EX7-065", as: "yuuki" }] } });
    withoutOpponent.state.memory = 0;
    await advance(withoutOpponent.engine).fire(EffectTiming.StartOfYourMainPhase, withoutOpponent.perm("yuuki"));
    expect(withoutOpponent.state.memory).toBe(0);
  });

  it("digivolves a Digimon into a Dark Dragon from trash when the hand has four cards", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "EX7-065", as: "yuuki" },
            { card: "BT2-075", as: "base" },
          ],
          hand: ["BT1-010", "BT1-010", "BT1-010", "BT1-010"],
          trash: [{ card: "EX7-060", as: "nidhogg" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "activateEffect",
        sourceInstanceId: s.perm("yuuki").topCard!.instanceId,
        effectKey: mainEffectKey(s),
      }),
    ).toEqual({ ok: true });
    await settle(
      () => s.perm("yuuki").isSuspended || s.perm("base").topCard?.instanceId === s.inst("nidhogg").instanceId,
    );
    expect(s.perm("yuuki").isSuspended).toBe(true);
    expect(s.perm("base").topCard?.instanceId).toBe(s.inst("nidhogg").instanceId);
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).not.toContain(s.inst("nidhogg").instanceId);
    expect(s.state.memory).toBe(7);
  });

  it("does not offer the trash digivolution when the hand exceeds four cards", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "EX7-065", as: "yuuki" },
            { card: "BT2-075", as: "base" },
          ],
          hand: ["BT1-010", "BT1-010", "BT1-010", "BT1-010", "BT1-010"],
          trash: [{ card: "EX7-060", as: "nidhogg" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "activateEffect",
        sourceInstanceId: s.perm("yuuki").topCard!.instanceId,
        effectKey: mainEffectKey(s),
      }),
    ).toEqual({ ok: false, reason: "illegal-target" });
    expect(s.perm("yuuki").isSuspended).toBe(false);
    expect(s.perm("base").topCard?.cardId).toBe("BT2-075");
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toContain(s.inst("nidhogg").instanceId);
  });

  it("plays itself when revealed as a Security card", async () => {
    const s = setupEngine({ 0: { security: [{ card: "EX7-065", as: "yuuki" }] } }, { autoAcceptOptional: true });
    await s.ready();
    await advance(s.engine).fireForInstance(EffectTiming.Security, s.inst("yuuki"));
    expect(s.state.players[0]!.security).toHaveLength(0);
    expect(
      s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.instanceId === s.inst("yuuki").instanceId),
    ).toBe(true);
  });
});
