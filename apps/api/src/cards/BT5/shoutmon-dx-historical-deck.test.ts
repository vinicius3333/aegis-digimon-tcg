import { Phase } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { assertNoLoudGap, setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "./BT5-014.js";
import "./BT5-019.js";

describe("BT5 Shoutmon DX historical deck gauntlet", () => {
  it("finishes its deletion window before a crossed-memory three-check Blitz attack", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT5-014", as: "omniShoutmon" }],
          hand: [
            { card: "BT5-019", as: "shoutmonDx" },
            { card: "BT5-014", as: "placedOmniShoutmon" },
          ],
          deck: ["BT1-001"],
        },
        1: {
          battleArea: [
            { card: "BT1-010", as: "firstTarget" },
            { card: "BT1-011", as: "secondTarget" },
          ],
          security: ["BT1-009", "BT1-010", "BT1-011"],
          deck: ["BT1-002"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoOrderTriggers: true },
    );
    s.state.memory = 3;

    const turn = s.engine.runOneTurn();
    const mainPhase = (s.engine as unknown as { mainPhase: { isOpen: boolean } }).mainPhase;
    await settle(() => mainPhase.isOpen);

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("omniShoutmon").permanentId,
        instanceId: s.inst("shoutmonDx").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        s.perm("omniShoutmon").topCard.instanceId === s.inst("shoutmonDx").instanceId &&
        s.state.players[1]!.battleArea.length === 0 &&
        s.engine.hasAcceptedBlitzAttack(s.perm("omniShoutmon").permanentId) &&
        s.state.pendingDecision === undefined,
    );

    // Q1299: accepting Blitz first does not skip the other When Digivolving effect.
    expect(s.state.memory).toBe(-1);
    expect(s.state.phase).toBe(Phase.Main);
    expect(s.perm("omniShoutmon").stack.map(({ cardId }) => cardId)).toEqual([
      "BT5-014",
      "BT5-014",
    ]);
    expect(observe(s.engine).hasKeyword(s.perm("omniShoutmon"), "Blitz")).toBe(true);
    expect(observe(s.engine).keywordAmount(s.perm("omniShoutmon"), "SecurityAttack")).toBe(2);

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("omniShoutmon").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.security.length === 0 && !observe(s.engine).isAttacking());
    await turn;

    expect(s.state.players[1]!.security).toHaveLength(0);
    expect(s.state.phase).toBe(Phase.End);
    expect(observe(s.engine).hasKeyword(s.perm("omniShoutmon"), "Blitz")).toBe(false);
    assertNoLoudGap(s);
  });
});
