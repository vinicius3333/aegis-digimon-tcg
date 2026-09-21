import { EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import "../cards/index.js";
import { advance } from "./testkit/advance.js";
import { settle, setupEngine } from "./testkit/harness.js";

describe("effect-attack security-removal ordering", () => {
  it("orders a security-removal watcher with When Attacking and drops a stale former-top effect", async () => {
    const preferred: string[] = [];
    const automation = {
      autoAcceptOptional: true,
      autoSelectCards: true,
      autoChooseOption: true,
      autoOrderTriggers: false,
      preferInstanceIds: preferred,
    };
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX13-033", as: "attacker", under: ["EX13-004"] }],
          hand: [
            { card: "BT18-036", as: "securityPlacement" },
            { card: "EX13-037", as: "evolver" },
          ],
          security: ["BT1-010", "BT1-011", "BT1-012", "BT1-013", "BT1-014"],
          deck: ["BT1-009", "BT1-009"],
        },
        1: {
          battleArea: [{ card: "BT1-037", as: "target", dp: 20_000 }],
          security: ["BT1-009", "BT1-009"],
          deck: ["BT1-009", "BT1-009"],
        },
      },
      automation,
    );
    s.state.memory = 10;
    preferred.push(s.inst("securityPlacement").instanceId);
    await s.ready();

    const resolution = advance(s.engine).fire(EffectTiming.OnPlay, s.perm("attacker"));
    await settle(() => s.state.pendingDecision?.kind === "orderTriggers");
    const request = s.decisions.findLast(({ req }) => req.kind === "orderTriggers")!.req;
    expect(request.options?.triggerCardIds).toEqual(expect.arrayContaining(["EX13-033", "EX13-004"]));
    const inheritedIndex = request.options!.triggerCardIds!.findIndex((id) => id === "EX13-004");
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: request.decisionId,
        response: { kind: "orderTriggers", order: [request.options!.triggerKeys![inheritedIndex]!] },
      }),
    ).toEqual({ ok: true });
    automation.autoOrderTriggers = true;
    await resolution;
    await settle(() => s.state.pendingDecision === undefined);

    expect(s.perm("attacker").topCard.cardId).toBe("EX13-037");
    // Dynasmon's newly active security-removal watcher applies -12000. Mistymon's stale
    // -6000 watcher must not stack on top after its source becomes a digivolution card.
    expect(s.perm("target").currentDP).toBe(8000);
  });
});
