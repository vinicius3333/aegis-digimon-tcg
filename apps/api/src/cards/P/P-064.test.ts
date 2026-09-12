import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "./P-064.js";

describe("P-064 Kiyoshiro Higashimitarai", () => {
  it("suspends to give Jamming to an attacker with Jellymon in its sources", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "P-064", as: "kiyoshiro" },
          { card: "BT1-036", as: "attacker", dp: 1000, under: ["P-061"] },
        ],
      },
      1: { security: ["BT1-114"] },
    });

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision?.kind === "optional");
    const prompt = s.decisions.at(-1)!.req;
    expect(prompt.sourceCardId).toBe("P-064");
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: prompt.decisionId,
        response: { kind: "optional", accept: true },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("kiyoshiro").isSuspended && observe(s.engine).hasKeyword(s.perm("attacker"), "Jamming"));

    expect(observe(s.engine).hasKeyword(s.perm("attacker"), "Jamming")).toBe(true);
    expect(
      s.state.players[0]!.battleArea.some((permanent) => permanent.permanentId === s.perm("attacker").permanentId),
    ).toBe(true);
    expect(s.decisions.filter(({ req }) => req.kind === "optional" && req.sourceCardId === "P-064")).toHaveLength(1);
  });

  it("does not grant Jamming from an already suspended Kiyoshiro", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "P-064", as: "kiyoshiro", suspended: true },
            { card: "BT1-036", as: "attacker", under: ["P-061"] },
          ],
        },
        1: { battleArea: [{ card: "BT1-009", as: "target", suspended: true, dp: 1000 }] },
      },
      { autoAcceptOptional: true },
    );

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "permanent", permanentId: s.perm("target").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle();

    expect(observe(s.engine).hasKeyword(s.perm("attacker"), "Jamming")).toBe(false);
  });

  it("does not treat TeslaJellymon as the exact Jellymon source", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "P-064", as: "kiyoshiro" },
            { card: "BT1-038", as: "attacker", under: ["BT9-025"] },
          ],
        },
        1: { security: ["BT1-011"] },
      },
      { autoAcceptOptional: true },
    );

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle();

    expect(s.perm("kiyoshiro").isSuspended).toBe(false);
    expect(observe(s.engine).hasKeyword(s.perm("attacker"), "Jamming")).toBe(false);
  });

  it("plays itself from security through a real opponent attack", async () => {
    const s = setupEngine({
      0: { security: [{ card: "P-064", as: "kiyoshiro", faceUp: true }], deck: ["BT1-009"] },
      1: { battleArea: [{ card: "BT1-009", as: "attacker", dp: 3000 }], deck: ["BT1-009"] },
    });
    const kiyoshiroId = s.inst("kiyoshiro").instanceId;
    s.state.turnSeat = 1;
    await s.ready();
    const memoryBeforeAttack = s.state.memory;
    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => !observe(s.engine).isAttacking() && s.state.pendingDecision === undefined);
    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.instanceId === kiyoshiroId)).toBe(true);
    expect(s.state.memory).toBe(memoryBeforeAttack);
  });
});
