import { describe, expect, it } from "vitest";
import { assertNoLoudGap, setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "./BT5-067.js";
import "./BT5-084.js";
import "./BT5-085.js";
import "./BT5-090.js";
import "./BT5-104.js";

describe("BT5 Diaboromon token-swarm deck gauntlet", () => {
  it("creates three tokens, exposes each copy to the cost UI, and converts one into a Rush attacker", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT5-067", as: "infermon" },
            { card: "BT5-090", as: "arata" },
          ],
          hand: [
            { card: "BT5-084", as: "diaboromon" },
            { card: "BT5-104", as: "catastropheCannon" },
            { card: "BT5-085", as: "armageddemon" },
          ],
          deck: ["BT1-001"],
        },
        1: {
          battleArea: [
            {
              card: "BT5-084",
              as: "opponentStack",
              under: ["BT5-059", "BT5-063"],
            },
          ],
          security: ["BT1-009"],
        },
      },
      {
        autoAcceptOptional: true,
        autoSelectCards: true,
        autoOrderTriggers: true,
        preferInstanceIds: preferred,
      },
    );
    s.state.memory = 10;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("infermon").permanentId,
        instanceId: s.inst("diaboromon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() =>
      s.state.players[0]!.battleArea.filter(({ topCard }) => topCard?.cardId === "TOKEN-Diaboromon").length === 2 &&
      s.perm("arata").isSuspended &&
      s.state.pendingDecision === undefined,
    5000);
    expect(s.state.memory).toBe(7);

    expect(
      s.engine.applyIntent(0, {
        type: "playCard",
        instanceId: s.inst("catastropheCannon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() =>
      s.state.players[0]!.battleArea.filter(({ topCard }) => topCard?.cardId === "TOKEN-Diaboromon").length === 3 &&
      s.perm("opponentStack").stack.length === 0 &&
      s.state.pendingDecision === undefined,
    5000);
    expect(s.state.memory).toBe(3);
    expect(s.perm("opponentStack").topCard?.cardId).toBe("BT5-059");

    const tokenIds = s.state.players[0]!.battleArea
      .filter(({ topCard }) => topCard?.cardId === "TOKEN-Diaboromon")
      .map(({ permanentId }) => permanentId);
    expect(new Set(tokenIds).size).toBe(3);
    preferred.push(tokenIds[0]!);

    expect(
      s.engine.applyIntent(0, {
        type: "playCard",
        instanceId: s.inst("armageddemon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() =>
      s.state.players[0]!.battleArea.some(({ topCard }) => topCard?.instanceId === s.inst("armageddemon").instanceId) &&
      s.state.players[0]!.battleArea.filter(({ topCard }) => topCard?.cardId === "TOKEN-Diaboromon").length === 2 &&
      s.state.memory === 0 &&
      s.state.pendingDecision === undefined,
    5000);

    const costRequest = s.decisions
      .filter(({ req }) => req.kind === "chooseTargets")
      .find(({ req }) => {
        const candidates = req.options?.candidateInstanceIds ?? [];
        return tokenIds.every((id) => candidates.includes(id));
      })?.req;
    expect(costRequest).toBeDefined();
    expect(new Set(costRequest!.options?.candidateInstanceIds ?? [])).toEqual(
      new Set([s.perm("infermon").permanentId, ...tokenIds]),
    );
    expect(s.state.memory).toBe(0);
    expect(
      s.state.players[0]!.battleArea.filter(({ topCard }) => topCard?.cardId === "TOKEN-Diaboromon"),
    ).toHaveLength(2);
    const armageddemon = s.state.players[0]!.battleArea.find(
      ({ topCard }) => topCard?.instanceId === s.inst("armageddemon").instanceId,
    );
    expect(armageddemon).toBeDefined();
    await settle(() => observe(s.engine).hasKeyword(armageddemon!, "Rush"), 5000);
    expect(observe(s.engine).hasKeyword(armageddemon!, "Rush")).toBe(true);

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: armageddemon!.permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.security.length === 0 && !observe(s.engine).isAttacking(), 5000);

    assertNoLoudGap(s);
  });
});
