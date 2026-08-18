import { describe, expect, it } from "vitest";
import { assertNoLoudGap, setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "./BT5-071.js";
import "./BT5-079.js";
import "./BT5-081.js";
import "../BT10/BT10-073.js";

describe("BT5 ChaosGallantmon historical deck gauntlet", () => {
  it("chains a sacrifice, memory gain, suppressed revival, inherited restand, and second attack", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT5-079", as: "base" },
            { card: "BT5-071", as: "guilmonCost" },
          ],
          hand: [{ card: "BT5-081", as: "chaosGallantmon" }],
          trash: [
            { card: "BT10-073", as: "firstRookie" },
            { card: "BT10-073", as: "secondRookie" },
          ],
          deck: ["BT10-073", "BT10-073", "BT10-073", "BT10-073"],
        },
        1: {
          battleArea: [{ card: "AD1-002", as: "levelFiveTarget" }],
          security: ["BT1-009", "BT1-010"],
        },
      },
      {
        autoAcceptOptional: true,
        autoSelectCards: true,
        preferInstanceIds: preferred,
      },
    );
    preferred.push(
      s.perm("guilmonCost").permanentId,
      s.perm("levelFiveTarget").permanentId,
      s.inst("firstRookie").instanceId,
    );
    const firstRookieId = s.inst("firstRookie").instanceId;
    const secondRookieId = s.inst("secondRookie").instanceId;
    s.state.memory = 4;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("chaosGallantmon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() =>
      s.state.players[0]!.battleArea.some(({ topCard }) => topCard?.instanceId === firstRookieId) &&
      !s.state.players[1]!.battleArea.some(({ permanentId }) =>
        permanentId === s.perm("levelFiveTarget").permanentId
      ) &&
      s.state.pendingDecision === undefined
    );

    // ChaosGallantmon paid 4, then Guilmon's effect-deletion returned 1 memory.
    expect(s.state.memory).toBe(1);
    // Only the normal digivolution draw happened. ChuuChuumon's reveal-4 On Play was
    // suppressed by ChaosGallantmon, so three cards remain in the deck.
    expect(s.state.players[0]!.deck).toHaveLength(3);
    expect(s.state.players[0]!.hand).toHaveLength(1);
    expect(s.perm("base").stack.some(({ cardId }) => cardId === "BT5-079")).toBe(true);

    const revived = s.state.players[0]!.battleArea.find(
      ({ topCard }) => topCard?.instanceId === firstRookieId,
    );
    expect(revived).toBeDefined();
    preferred.splice(0, preferred.length, revived!.permanentId);

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("base").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() =>
      s.state.players[1]!.security.length === 1 &&
      !observe(s.engine).isAttacking() &&
      !s.perm("base").isSuspended &&
      s.state.pendingDecision === undefined
    );

    expect(s.state.players[0]!.battleArea.some(({ topCard }) => topCard?.instanceId === firstRookieId)).toBe(false);
    // ChaosGallantmon already revived once this turn, so the inherited sacrifice cannot
    // revive the second copy even though it remains a legal purple Lv.3 in the trash.
    expect(s.state.players[0]!.battleArea.some(({ topCard }) => topCard?.instanceId === secondRookieId)).toBe(false);
    expect(s.state.players[0]!.trash.some(({ instanceId }) => instanceId === secondRookieId)).toBe(true);

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("base").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.security.length === 0 && !observe(s.engine).isAttacking());

    expect(s.perm("base").isSuspended).toBe(true);
    assertNoLoudGap(s);
  });
});
