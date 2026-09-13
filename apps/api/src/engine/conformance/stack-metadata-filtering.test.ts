import { beforeEach, describe, expect, it } from "vitest";
import { setupEngine, settle } from "../testkit/harness.js";
import { observe } from "../testkit/observe.js";
import "../../cards/EX5/index.js";
import "../../cards/P/index.js";
import { cite } from "./_kb.js";

const STACKED_INFORMATION_SHA256 = "1220b7f0fc0cb6ccc76d4ad371d1f788922a265df857413971108e64da24bc0f";

beforeEach(() => {
  cite(
    "comprehensive-0293",
    "§4-7-9: concealed stacked cards have no referenceable card information",
    STACKED_INFORMATION_SHA256,
  );
});

describe("public permanent matching and concealed stack information", () => {
  it("does not trigger a stack-name watcher from a hidden Gammamon source", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "P-062", as: "hiro" },
          { card: "BT9-023", as: "hiddenAttacker", under: [{ card: "P-059", faceUp: false }] },
          { card: "BT9-023", as: "visibleAttacker", under: ["P-059"] },
        ],
      },
      1: { security: ["BT1-053", "BT1-054", "BT1-055", "BT1-056", "BT1-057", "BT1-058"] },
    });
    await s.ready();
    const securityIds = s.state.players[1]!.security.map((card) => card.instanceId);
    expect(s.perm("hiddenAttacker").stack[0]!.faceUp).toBe(false);
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("hiddenAttacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => !observe(s.engine).isAttacking() && s.state.pendingDecision === undefined);
    expect(s.decisions.some(({ req }) => req.sourceCardId === "P-062")).toBe(false);
    expect(s.state.players[1]!.security.map((card) => card.instanceId)).toEqual(securityIds.slice(1));

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("visibleAttacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision?.kind === "optional");
    expect(s.decisions.at(-1)!.req.sourceCardId).toBe("P-062");
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: s.state.pendingDecision!.decisionId,
        response: { kind: "optional", accept: true },
      }),
    ).toEqual({ ok: true });
    await settle(() => !observe(s.engine).isAttacking() && s.state.pendingDecision === undefined);
    expect(s.perm("hiro").isSuspended).toBe(true);
    expect(observe(s.engine).keywordAmount(s.perm("visibleAttacker"), "SecurityAttack")).toBe(1);
    expect(s.state.players[1]!.security.map((card) => card.instanceId)).toEqual(securityIds.slice(3));
  });
});
