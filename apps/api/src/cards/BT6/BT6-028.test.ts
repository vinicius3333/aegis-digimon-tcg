import { EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { effectsOf } from "../../engine/effects/collect.js";
import { observe } from "../../engine/testkit/observe.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT6-028.js";

describe("BT6-028 Pukumon", () => {
  it("Digi-Bursts 2 to prevent all own Digimon from being blocked for the turn", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT6-028", under: ["BT1-001", "BT1-002"], as: "pukumon" },
            { card: "BT1-010", as: "attacker" },
          ],
        },
        1: { battleArea: [{ card: "BT6-056", as: "blocker" }], security: ["BT1-010"] },
      },
      { autoSelectCards: true },
    );
    const source = observe(s.engine).cardSource(s.perm("pukumon"));
    const effectKey = effectsOf(EffectTiming.OnDeclaration, source).find((effect) =>
      effect.effectKey.startsWith("BT6-028/"),
    )!.effectKey;

    expect(
      s.engine.applyIntent(0, {
        type: "activateEffect",
        sourceInstanceId: s.perm("pukumon").topCard!.instanceId,
        effectKey,
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        s.perm("pukumon").stack.length === 0 &&
        observe(s.engine).isRestricted(s.perm("pukumon"), "cantBeBlocked") &&
        observe(s.engine).isRestricted(s.perm("attacker"), "cantBeBlocked"),
    );

    expect(s.perm("pukumon").stack).toHaveLength(0);
    expect(observe(s.engine).isRestricted(s.perm("pukumon"), "cantBeBlocked")).toBe(true);
    expect(observe(s.engine).isRestricted(s.perm("attacker"), "cantBeBlocked")).toBe(true);
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
  });
});

async function activatePukumonDigiBurst(s: ReturnType<typeof setupEngine>) {
  const source = observe(s.engine).cardSource(s.perm("pukumon"));
  const effectKey = effectsOf(EffectTiming.OnDeclaration, source).find((effect) =>
    effect.effectKey.startsWith("BT6-028/"),
  )!.effectKey;
  expect(
    s.engine.applyIntent(0, {
      type: "activateEffect",
      sourceInstanceId: s.perm("pukumon").topCard!.instanceId,
      effectKey,
    }),
  ).toEqual({ ok: true });
  await settle(() => observe(s.engine).isRestricted(s.perm("attacker"), "cantBeBlocked"));
}

async function attackPastWoodmon(activateDigiBurst: boolean) {
  const s = setupEngine(
    {
      0: {
        battleArea: [
          { card: "BT6-028", under: ["BT1-001", "BT1-002"], as: "pukumon" },
          { card: "BT1-014", as: "attacker" },
        ],
      },
      1: { battleArea: [{ card: "BT1-072", as: "blocker" }], security: ["BT1-014", "BT1-014"] },
    },
    { autoSelectCards: true },
  );
  if (activateDigiBurst) await activatePukumonDigiBurst(s);
  expect(
    s.engine.applyIntent(0, {
      type: "attack",
      attackerPermanentId: s.perm("attacker").permanentId,
      target: { kind: "player" },
    }),
  ).toEqual({ ok: true });
  await settle(
    () => s.events.some((event) => event.kind === "blockWindowOpened") || s.state.players[1]!.security.length === 1,
  );
  const blockResult = s.engine.applyIntent(1, {
    type: "declareBlock",
    blockerPermanentId: s.perm("blocker").permanentId,
  });
  await settle();
  return {
    blockAccepted: blockResult.ok,
    blockerSuspended: s.perm("blocker").isSuspended,
    opponentSecurity: s.state.players[1]!.security.length,
  };
}

describe("BT6-028 Pukumon — KB Q&A rulings", () => {
  it("after Digi-Burst the opponent's Blocker can't redirect the attack, so it still checks security (Q1419)", async () => {
    expect(await attackPastWoodmon(false)).toEqual({
      blockAccepted: true,
      blockerSuspended: true,
      opponentSecurity: 2,
    });
    expect(await attackPastWoodmon(true)).toEqual({
      blockAccepted: false,
      blockerSuspended: false,
      opponentSecurity: 1,
    });
  });
});
