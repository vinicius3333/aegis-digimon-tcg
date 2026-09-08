import { describe, expect, it } from "vitest";
import { advance } from "./testkit/advance.js";
import { setupEngine, settle } from "./testkit/harness.js";
import { observe } from "./testkit/observe.js";
import "../cards/index.js";

/**
 * Focused engine proofs for three session-2 seams in SubTrigger matching and playing from trash.
 * Each case drives a public intent (or a public verb) and asserts the engine behaviour, not a
 * single card's text:
 *
 *  - seam 38: a SubTrigger `triggerFilter` carrying a `superlative` is a BOARD-RELATIVE gate.
 *    `permanentMatchesFilter` ranks nothing on its own, so the watcher must be narrowed through
 *    the same pool machinery target selection uses. Ties keep every extremum.
 *  - seam 49: one effect suspending several Digimon is ONE simultaneous timing carrying every
 *    subject; each suspended permanent's own `whenEffectSuspends` watcher still fires once.
 *  - seam 42: a cost that DELETES a Digimon puts its card in the trash before the play chooses
 *    a target, so the optional-play preflight must count those prospective trash arrivals.
 */
describe("session 2 SubTrigger and play-from-trash seams", () => {
  it("fires a highest-DP triggerFilter watcher for every tied extremum (seam 38)", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT11-074", as: "bwarg" }], security: ["BT1-009"] },
        1: {
          battleArea: [
            { card: "BT1-010", as: "tiedA", dp: 5000 },
            { card: "BT1-011", as: "tiedB", dp: 5000 },
          ],
        },
      },
      { autoAcceptOptional: true, autoOrderTriggers: true },
    );
    s.state.turnSeat = 1;
    await s.ready();

    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("tiedB").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => false, 300);

    // The redirect fired: the security stack was never checked.
    expect(s.state.players[0]!.security).toHaveLength(1);
  });

  it("keeps a lower-DP attacker outside the superlative gate (seam 38 control)", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT11-074", as: "bwarg" }], security: ["BT1-009"] },
        1: {
          battleArea: [
            { card: "BT1-010", as: "highest", dp: 9000 },
            { card: "BT1-011", as: "lower", dp: 3000 },
          ],
        },
      },
      { autoAcceptOptional: true, autoOrderTriggers: true },
    );
    s.state.turnSeat = 1;
    await s.ready();

    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("lower").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.security.length === 0 && !observe(s.engine).isAttacking());

    expect(s.state.players[0]!.security).toHaveLength(0);
  });

  it("fires each suspended permanent's own whenEffectSuspends watcher in one batch (seam 49)", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "EX3-038", as: "firstWatcher" },
            { card: "EX3-038", as: "secondWatcher" },
          ],
        },
        1: {
          battleArea: [
            { card: "BT1-028", as: "firstTarget" },
            { card: "BT1-029", as: "secondTarget" },
          ],
        },
      },
      { autoSelectCards: true, preferInstanceIds: preferred },
    );
    preferred.push(s.perm("firstTarget").permanentId, s.perm("secondTarget").permanentId);
    await s.ready();

    await advance(s.engine).verb.suspend([s.perm("firstWatcher").permanentId, s.perm("secondWatcher").permanentId]);
    await settle(() => s.perm("firstTarget").isSuspended && s.perm("secondTarget").isSuspended);

    // Two watchers, two independent resolutions — not one shared firing.
    expect(s.decisions.filter(({ req }) => req.sourceCardId === "EX3-038")).toHaveLength(2);
  });

  it("offers a play-from-trash whose delete cost supplies the only target (seam 42)", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT1-010", as: "host", under: ["BT17-049"], dp: 12_000 },
            { card: "BT17-043", suspended: true, as: "costBeast" },
          ],
        },
        1: { security: 1 },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const beastId = s.perm("costBeast").topCard!.instanceId;
    const costPermanentId = s.perm("costBeast").permanentId;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    // The trash is EMPTY when the effect resolves; only paying the delete cost can fill it.
    await settle(() =>
      s.state.players[0]!.battleArea.some(
        (permanent) => permanent.topCard?.instanceId === beastId && permanent.permanentId !== costPermanentId,
      ),
    );

    expect(s.state.players[0]!.trash.some((card) => card.instanceId === beastId)).toBe(false);
  });
});
