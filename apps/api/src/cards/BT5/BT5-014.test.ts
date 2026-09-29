import { describe, expect, it } from "vitest";
import { EffectDuration } from "@aegis/shared";
import { internalsOf } from "../../engine/testkit/internals.js";
import { observe } from "../../engine/testkit/observe.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "../LM/LM-027.js";
import "./BT5-014.js";

describe("BT5-014 OmniShoutmon", () => {
  it("digivolves over Shoutmon for the alternate cost of 4", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT5-009", as: "shoutmon" }],
        hand: [{ card: "BT5-014", as: "evolving" }],
      },
    });
    s.state.memory = 4;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("shoutmon").permanentId,
        instanceId: s.inst("evolving").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("shoutmon").topCard.cardId === "BT5-014" && s.state.memory === 0);

    expect(s.state.memory).toBe(0);
    expect(s.perm("shoutmon").topCard.cardId).toBe("BT5-014");
  });

  it("Q1291 rejects the Shoutmon shortcut in the breeding area", () => {
    const s = setupEngine({
      0: {
        breeding: { card: "BT5-009", as: "shoutmon" },
        hand: [{ card: "BT5-014", as: "evolving" }],
      },
    });
    s.state.memory = 4;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("shoutmon").permanentId,
        instanceId: s.inst("evolving").instanceId,
      }),
    ).toEqual({ ok: false, reason: "invalid-evolution" });
  });

  it("does not treat a Shoutmon-family name as the exact Shoutmon shortcut", () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT10-013", as: "shoutmonX5" }],
        hand: [{ card: "BT5-014", as: "evolving" }],
      },
    });
    s.state.memory = 4;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("shoutmonX5").permanentId,
        instanceId: s.inst("evolving").instanceId,
      }),
    ).toEqual({ ok: false, reason: "invalid-evolution" });
  });

  it("gives Security Attack +1 to a host with Blitz", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT4-073", as: "host", under: ["BT5-014"] }] } });
    internalsOf(s.engine).primitives.grantKeyword(s.perm("host").permanentId, "Blitz", EffectDuration.Permanent);
    await s.engine.recomputeContinuousEffects();

    expect(observe(s.engine).hasKeyword(s.perm("host"), "Blitz")).toBe(true);
    expect(observe(s.engine).keywordAmount(s.perm("host"), "SecurityAttack")).toBe(1);
  });

  it("does not grant Security Attack +1 without Blitz", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT4-073", as: "host", under: ["BT5-014"] }] } });
    await s.engine.recomputeContinuousEffects();
    expect(observe(s.engine).keywordAmount(s.perm("host"), "SecurityAttack")).toBe(0);
  });
});

async function securityLeftAfterAttack(hostHasBlitz: boolean): Promise<number> {
  const s = setupEngine({
    0: { battleArea: [{ card: "BT5-013", as: "host", dp: 20000, under: ["BT5-014"] }] },
    1: { security: ["BT5-013", "BT5-013", "BT5-013"] },
  });
  s.state.memory = 3;
  if (hostHasBlitz) {
    internalsOf(s.engine).primitives.grantKeyword(s.perm("host").permanentId, "Blitz", EffectDuration.Permanent);
  }
  await s.engine.recomputeContinuousEffects();

  expect(
    s.engine.applyIntent(0, {
      type: "attack",
      attackerPermanentId: s.perm("host").permanentId,
      target: { kind: "player" },
    }),
  ).toEqual({ ok: true });
  await settle(() => !s.engine.combat.isAttacking && s.perm("host").isSuspended);
  return s.state.players[1]!.security.length;
}

async function digivolveWithRedScramble(hostCardId: string): Promise<{ topCardId: string; memory: number }> {
  const s = setupEngine(
    {
      0: {
        battleArea: [{ card: hostCardId, as: "host" }],
        hand: [
          { card: "LM-027", as: "scramble" },
          { card: "BT5-014", as: "omni" },
        ],
      },
    },
    { autoAcceptOptional: true, autoSelectCards: true },
  );
  s.state.memory = 5;
  await s.ready();

  expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("scramble").instanceId })).toEqual({
    ok: true,
  });
  await settle(() => s.state.players[0]!.battleArea.some((perm) => perm.topCard?.cardId === "LM-027"));
  return { topCardId: s.perm("host").topCard.cardId, memory: s.state.memory };
}

describe("BT5-014 OmniShoutmon — KB Q&A rulings", () => {
  it("gives a Blitz host Security Attack +1 on an ordinary attack that does not use Blitz (Q1292)", async () => {
    expect(await securityLeftAfterAttack(true)).toBe(1);
    expect(await securityLeftAfterAttack(false)).toBe(2);
  });

  it("lets an effect digivolve a battle-area Shoutmon into OmniShoutmon from hand (Q1293)", async () => {
    expect(await digivolveWithRedScramble("BT5-009")).toEqual({ topCardId: "BT5-014", memory: 2 });
    expect(await digivolveWithRedScramble("BT5-008")).toEqual({ topCardId: "BT5-008", memory: 3 });
  });
});
