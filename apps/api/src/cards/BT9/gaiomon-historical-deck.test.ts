import { Phase } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "./BT9-068.js";

describe("BT9 Gaiomon historical deck gauntlet", () => {
  it("uses both color branches, crosses memory, and completes a two-check Blitz attack", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            {
              card: "BT8-070",
              as: "blackWarGreymon",
              under: ["BT8-067", "BT1-021"],
            },
          ],
          hand: [{ card: "BT9-068", as: "gaiomon" }],
          deck: ["BT1-001"],
        },
        1: {
          battleArea: [
            {
              card: "BT2-047",
              as: "deDigivolveTarget",
              under: [{ card: "BT1-015", as: "revealedBase" }],
            },
          ],
          security: ["BT1-009", "BT1-010", "BT1-011"],
          deck: ["BT1-002"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoOrderTriggers: true },
    );
    s.state.memory = 1;

    const turn = s.engine.runOneTurn();
    const mainPhase = (s.engine as unknown as { mainPhase: { isOpen: boolean } }).mainPhase;
    await settle(() => mainPhase.isOpen);

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("blackWarGreymon").permanentId,
        instanceId: s.inst("gaiomon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        s.perm("deDigivolveTarget").topCard?.instanceId === s.inst("revealedBase").instanceId &&
        s.engine.hasAcceptedBlitzAttack(s.perm("blackWarGreymon").permanentId) &&
        s.state.pendingDecision === undefined,
    );
    await settle(() => false, 100);

    expect(s.state.memory).toBe(-1);
    expect(s.state.phase).toBe(Phase.Main);
    expect(s.engine.hasAcceptedBlitzAttack(s.perm("blackWarGreymon").permanentId)).toBe(true);
    expect(observe(s.engine).hasKeyword(s.perm("blackWarGreymon"), "Blitz")).toBe(true);
    expect(observe(s.engine).hasKeyword(s.perm("blackWarGreymon"), "Reboot")).toBe(true);
    expect(observe(s.engine).keywordAmount(s.perm("blackWarGreymon"), "SecurityAttack")).toBe(1);
    expect(s.state.players[1]!.trash.some(({ cardId }) => cardId === "BT2-047")).toBe(true);

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("blackWarGreymon").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.security.length === 1 && !observe(s.engine).isAttacking());
    await turn;

    expect(s.perm("blackWarGreymon").isSuspended).toBe(true);
    expect(s.state.players[1]!.security).toHaveLength(1);
    expect(s.state.phase).toBe(Phase.End);
    expect(observe(s.engine).hasKeyword(s.perm("blackWarGreymon"), "Blitz")).toBe(false);
  });
});
