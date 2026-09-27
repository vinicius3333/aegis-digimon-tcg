import { describe, expect, it } from "vitest";
import "../cards/index.js";
import { setupEngine, settle } from "./testkit/harness.js";
import { observe } from "./testkit/observe.js";

describe("optional effect presets on watchers in a shared timing window", () => {
  it.each(["yes", "yes-all", "no", "ask"] as const)("honors %s for Rika's optional attack effect", async (preset) => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT3-089", as: "dpTarget" }],
          security: ["BT1-009", "BT1-010", "BT1-011"],
        },
        1: {
          battleArea: [
            { card: "BT23-034", as: "sakuyamon" },
            { card: "EX2-060", as: "rika" },
          ],
          hand: [{ card: "EX2-066", as: "plugIn" }],
          security: ["BT1-009"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoOrderTriggers: false },
    );
    s.state.turnSeat = 1;
    await s.ready();
    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("sakuyamon").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision?.kind === "orderTriggers");
    const prompt = s.decisions.find(({ req }) => req.kind === "orderTriggers")!.req;
    const keys = prompt.options!.triggerKeys!;
    const rikaIndex = prompt.options!.triggerCardIds!.indexOf("EX2-060");
    expect(rikaIndex).toBeGreaterThanOrEqual(0);
    expect(prompt.options!.triggerIsOptional![rikaIndex]).toBe(true);
    const rikaKey = keys[rikaIndex]!;
    const optionalAnswers =
      preset === "ask"
        ? {}
        : preset === "yes-all"
          ? Object.fromEntries(keys.map((key) => [key, true]))
          : { [rikaKey]: preset === "yes" };
    expect(
      s.engine.applyIntent(1, {
        type: "respondDecision",
        decisionId: prompt.decisionId,
        response: {
          kind: "orderTriggers",
          order: [rikaKey, ...keys.filter((key) => key !== rikaKey)],
          optionalAnswers,
        },
      }),
    ).toEqual({ ok: true });
    await settle(() => !observe(s.engine).isAttacking());

    // Auto-answering keeps the regression deterministic even when a broken preset asks again.
    const confirmations = s.decisions.filter(({ req }) => req.sourceCardId === "EX2-060" && req.kind === "optional");
    expect(confirmations).toHaveLength(preset === "ask" ? 1 : 0);
    const cardChoices = s.decisions.filter(({ req }) => req.sourceCardId === "EX2-060" && req.kind === "selectCards");
    expect(cardChoices).toHaveLength(preset === "no" ? 0 : 1);
    expect(s.perm("rika").isSuspended).toBe(preset !== "no");
    const usedPlugin = s.state.players[1]!.trash.some((card) => card.instanceId === s.inst("plugIn").instanceId);
    expect(usedPlugin).toBe(preset !== "no");
    expect(s.decisions.filter(({ req }) => req.kind === "orderTriggers")).toHaveLength(1);
    expect(s.state.pendingDecision).toBeUndefined();
  });
});
