import { describe, expect, it } from "vitest";
import type { Primitives } from "../../engine/effects/EffectContext.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "./ST23-14.js";
import "./ST23-12.js";

describe("ST23-14 Reina Sakuya & Makoto Kuonji", () => {
  it("suspends itself and grants Jamming to an exact Glowing Dawn Digimon when its under-card is trashed", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "ST23-14", as: "tamer", under: [{ card: "BT1-001", faceUp: false }] },
            { card: "ST23-11", as: "glowing" },
          ],
          hand: [{ card: "ST23-12", as: "liollmon" }],
          trash: [{ card: "ST23-03", as: "returnTarget" }],
          deck: ["BT1-002"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const underId = s.perm("tamer").stack[0]!.instanceId;
    s.state.memory = 10;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("liollmon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => {
      return s.state.players[0]!.trash.some((card) => card.instanceId === underId) && s.perm("tamer").isSuspended;
    });

    expect(s.state.players[0]!.trash.some((card) => card.instanceId === underId)).toBe(true);
    expect(s.perm("tamer").stack.some((card) => card.instanceId === underId)).toBe(false);
    expect(s.perm("tamer").isSuspended).toBe(true);
    expect(observe(s.engine).hasKeyword(s.perm("glowing"), "Jamming")).toBe(true);
  });

  it("does not react when an effect trashes a card under another permanent", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "ST23-14", as: "tamer" },
            { card: "ST23-11", as: "glowing" },
            { card: "BT1-009", as: "otherHost", under: [{ card: "BT1-001", as: "otherUnder" }] },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.engine.recomputeContinuousEffects();
    const primitives = (s.engine as unknown as { primitives: Primitives }).primitives;

    await primitives.trashDigivolutionCards(s.perm("otherHost").permanentId, [s.inst("otherUnder").instanceId], {
      byEffectSeat: 0,
    });
    await settle(() => false, 100);

    expect(s.perm("tamer").isSuspended).toBe(false);
    expect(observe(s.engine).hasKeyword(s.perm("glowing"), "Jamming")).toBe(false);
  });

  it("uses the granted Jamming to survive a security Digimon battle", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "ST23-14", as: "tamer", under: [{ card: "BT1-001", faceUp: false }] },
            { card: "ST23-11", as: "glowing" },
          ],
          hand: [{ card: "ST23-12", as: "trigger" }],
          trash: [{ card: "ST23-03", as: "returnTarget" }],
        },
        1: { security: ["ST1-10"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoOrderTriggers: true },
    );
    s.state.turnSeat = 0;
    s.state.memory = 10;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("trigger").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => observe(s.engine).hasKeyword(s.perm("glowing"), "Jamming"));
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("glowing").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => !observe(s.engine).isAttacking() && s.state.players[1]!.security.length === 0);
    expect(s.state.players[1]!.security).toHaveLength(0);
    expect(observe(s.engine).isAttacking()).toBe(false);
    expect(s.state.players[0]!.battleArea.some((p) => p.permanentId === s.perm("glowing").permanentId)).toBe(true);
  });
});
