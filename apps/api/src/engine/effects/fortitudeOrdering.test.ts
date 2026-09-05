import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../testkit/harness.js";
import "../../cards/BT20/BT20-034.js";
import "../../cards/EX5/EX5-044.js";
import "../../cards/BT20/BT20-080.js";

// Fortitude must participate in the same deletion pool as printed/inherited effects,
// including the deferred pool used by simultaneous DP rule checks (CR 16-27, Q6866).
describe("Fortitude deletion ordering", () => {
  it("pools both rule-deleted Fortitude holders and preserves each inherited host identity", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "BT1-009", as: "trigger" }],
          battleArea: [
            { card: "BT20-034", as: "first", under: ["EX5-044"] },
            { card: "BT20-034", as: "second", under: ["EX5-044"] },
          ],
        },
        1: { battleArea: [{ card: "BT1-018", as: "target", under: ["BT1-010"] }] },
      },
      { autoOrderTriggers: false, autoSelectCards: true },
    );
    await s.ready();
    const first = s.perm("first");
    const second = s.perm("second");
    const firstInstance = first.topCard!.instanceId;
    const secondInstance = second.topCard!.instanceId;
    // Negative DP and exactly zero are separate sweeps of the same rule-check pass.
    first.baseDP = -1000;
    second.baseDP = 0;
    s.state.memory = 10;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("trigger").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.pendingDecision?.kind === "orderTriggers");
    const request = s.decisions.find(({ req }) => req.decisionId === s.state.pendingDecision?.decisionId)!.req;
    const keys = request.options?.triggerKeys ?? [];
    const fortitudeKeys = keys.filter((key) => key.includes("keyword/fortitude"));
    expect(fortitudeKeys).toHaveLength(2);
    expect(keys).toHaveLength(4);
    const firstKey = fortitudeKeys.find((key) => key.includes(firstInstance))!;
    const secondKey = fortitudeKeys.find((key) => key.includes(secondInstance))!;
    expect(firstKey).toBeDefined();
    expect(secondKey).toBeDefined();
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: request.decisionId,
        response: { kind: "orderTriggers", order: [firstKey] },
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        s.state.pendingDecision?.kind === "orderTriggers" && s.state.pendingDecision.decisionId !== request.decisionId,
    );
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: s.state.pendingDecision!.decisionId,
        response: { kind: "orderTriggers", order: [secondKey] },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.length === 3 && s.state.pendingDecision === undefined);
    await settle();
    expect(s.state.pendingDecision).toBeUndefined();
    expect(s.state.players[0]!.battleArea.every((permanent) => permanent.stack.length === 0)).toBe(true);
    expect(s.perm("target").topCard?.cardId).toBe("BT1-018");
    expect(s.perm("target").stack.map((card) => card.cardId)).toEqual(["BT1-010"]);
    expect(s.state.players[1]!.trash).toHaveLength(0);
    expect(s.state.players[0]!.trash.filter((card) => card.cardId === "EX5-044")).toHaveLength(2);
  });
  it("replays a Fortitude holder sacrificed to prevent another Digimon's battle deletion", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT1-025", as: "attacker" }] },
        1: {
          battleArea: [
            { card: "BT20-080", as: "defender", dp: 4000, suspended: true },
            { card: "BT20-034", as: "sacrifice", under: ["BT1-010"] },
          ],
        },
      },
      { autoSelectCards: true },
    );
    await s.ready();
    const sacrificeId = s.perm("sacrifice").permanentId;
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "permanent", permanentId: s.perm("defender").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle();
    expect(s.state.pendingDecision).toBeUndefined();
    expect(s.state.players[1]!.battleArea.some((permanent) => permanent.permanentId === sacrificeId)).toBe(false);
    const replay = s.state.players[1]!.battleArea.find((permanent) => permanent.topCard?.cardId === "BT20-034");
    expect(replay).toBeDefined();
    expect(replay?.stack).toHaveLength(0);
    expect(s.state.players[1]!.battleArea.some((permanent) => permanent.topCard?.cardId === "BT20-080")).toBe(true);
    expect(s.state.players[1]!.trash.some((card) => card.cardId === "BT1-010")).toBe(true);
  });
});
