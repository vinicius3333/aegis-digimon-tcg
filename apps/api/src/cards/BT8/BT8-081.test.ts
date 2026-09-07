import { describe, expect, it } from "vitest";
import { EffectTiming, Phase } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { effectsOf } from "../../engine/effects/collect.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { internalsOf } from "../../engine/testkit/internals.js";
import { compiled } from "./BT8-081.js";
import "./BT8-081.js";
import "../BT7/BT7-040.js";
import "../BT4/BT4-012.js";

describe("BT8-081 Rasenmon Fury Mode", () => {
  it("marks the End of Attack Rasenmon evolution as requirement-free", () => {
    expect(compiled.effects[0]?.actions[0]).toMatchObject({
      kind: "Digivolve",
      ignoreReqs: true,
      payCost: false,
      optional: true,
      into: { filter: { nameOrTrait: [{ tokens: ["Rasenmon"], match: "nameExact" }] } },
    });
  });

  it("digivolves into Rasenmon from hand for free at the end of its attack", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT8-081", as: "fury" }], hand: [{ card: "BT7-040", as: "rasenmon" }] },
        1: { security: ["BT8-034"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 3;
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("fury").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("fury").topCard.instanceId === s.inst("rasenmon").instanceId);
    expect(s.state.memory).toBe(3);
  });

  it("does not bypass Rasenmon Fury Mode's printed level-5 evolution requirement", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT8-081", as: "fury" }], hand: [{ card: "BT8-081", as: "illegal" }] },
        1: { security: ["BT8-034"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 3;
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("fury").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.events.some((event) => event.kind === "effectResolved" && event.sourceCardId === "BT8-081"));
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("illegal").instanceId)).toBe(true);
    expect(s.perm("fury").topCard.cardId).toBe("BT8-081");
  });

  it("trashes the top card of your security at the end of your turn", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT8-081", as: "fury" }], security: ["BT8-034", "BT8-035"] } });
    await advance(s.engine).fireForInstance(EffectTiming.OnEndTurn, s.perm("fury").topCard);
    expect(s.state.players[0]!.security).toHaveLength(1);
  });

  it("unsuspends and gives +3000 DP when trashed by Rasenmon's Digi-Burst", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT7-040", as: "rasenmon", under: ["BT8-081", "BT8-003", "BT8-004", "BT8-005"], suspended: true },
          ],
        },
        1: { battleArea: [{ card: "BT8-017", as: "target" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    s.state.phase = Phase.Main;
    s.perm("rasenmon").isSuspended = true;
    const before = s.perm("rasenmon").currentDP;
    const source = internalsOf(s.engine).cardSourceOf(s.perm("rasenmon").topCard);
    const effectKey = effectsOf(EffectTiming.OnDeclaration, source).find((effect) =>
      effect.effectKey.startsWith(`${source.cardId}/`),
    )!.effectKey;
    expect(
      s.engine.applyIntent(0, {
        type: "activateEffect",
        sourceInstanceId: s.perm("rasenmon").topCard.instanceId,
        effectKey,
      }),
    ).toEqual({ ok: true });
    await settle(() => !s.perm("rasenmon").isSuspended && s.perm("rasenmon").currentDP > before, 5_000);
    expect(s.perm("rasenmon").currentDP).toBe(before + 3000);
  });

  it("does not activate when a non-Rasenmon Digi-Burst trashes it", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT4-012", as: "host", under: ["BT8-081", "BT8-003"], suspended: true }] },
        1: { battleArea: [{ card: "BT1-009", dp: 4000, as: "target" }] },
      },
      { autoSelectCards: true },
    );
    await s.ready();
    s.state.phase = Phase.Main;
    const before = s.perm("host").currentDP;
    const source = internalsOf(s.engine).cardSourceOf(s.perm("host").topCard);
    const effectKey = effectsOf(EffectTiming.OnDeclaration, source).find((effect) =>
      effect.effectKey.startsWith(`${source.cardId}/`),
    )!.effectKey;
    expect(
      s.engine.applyIntent(0, {
        type: "activateEffect",
        sourceInstanceId: s.perm("host").topCard.instanceId,
        effectKey,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("host").stack.length === 0);
    expect(s.perm("host").isSuspended).toBe(true);
    expect(s.perm("host").currentDP).toBe(before);
  });
});
