import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "./BT9-081.js";

describe("BT9 Dex/DeathX historical deck gauntlet", () => {
  it("offers both legal revival branches and lets the player choose level 3 instead of DeathXmon", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT9-081", as: "dexDorugoramon", suspended: true }],
          trash: [
            { card: "BT9-070", as: "gazimonX" },
            { card: "BT9-112", as: "deathXmon" },
            "BT9-075",
            "BT9-078",
            "BT9-106",
          ],
        },
        1: { battleArea: [{ card: "BT10-057", as: "attacker", dp: 15000 }] },
      },
      { autoAcceptOptional: true, autoOrderTriggers: true },
    );
    s.state.turnSeat = 1;
    await s.ready();

    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "permanent", permanentId: s.perm("dexDorugoramon").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision?.kind === "selectCards");

    const selection = [...s.decisions].reverse().find(({ req }) => req.kind === "selectCards")!.req;
    expect(selection.options).toMatchObject({ min: 0, max: 1 });
    expect(selection.options?.candidateInstanceIds).toEqual(
      expect.arrayContaining([s.inst("gazimonX").instanceId, s.inst("deathXmon").instanceId]),
    );

    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: selection.decisionId,
        response: {
          kind: "selectCards",
          instanceIds: [s.inst("gazimonX").instanceId],
        },
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        s.state.players[0]!.battleArea.some(({ topCard }) => topCard?.instanceId === s.inst("gazimonX").instanceId) &&
        !observe(s.engine).isAttacking(),
    );

    expect(s.state.players[0]!.trash.some(({ instanceId }) => instanceId === s.inst("deathXmon").instanceId)).toBe(
      true,
    );
    expect(s.state.players[0]!.battleArea.some(({ topCard }) => topCard?.cardId === "BT9-112")).toBe(false);
  });
});
