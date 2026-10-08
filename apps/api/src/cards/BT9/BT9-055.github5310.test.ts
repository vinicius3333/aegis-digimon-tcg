import { getCompiledCard } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "../P/P-075.js";
import "./BT9-055.js";

describe("GitHub #5310 separate GrandisKuwagamon timing finding", () => {
  it("keeps Grandis's shared snapshot identical to its registered compiled IR", () => {
    expect(getCompiledCard("BT9-055")).toEqual(runtimeCompiledCard("BT9-055"));
  });
  it("GitHub #5310 separate timing finding: unsuspends at End of Attack after security, not When Attacking", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT9-055", as: "host", under: ["BT9-109"] }] },
        1: { battleArea: [{ card: "BT1-009", as: "opponent" }], security: ["BT1-009", "BT1-009"] },
      },
      { autoSelectCards: true },
    );
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.events.some((event) => event.kind === "attackEnded") && s.state.pendingDecision === undefined);
    const securityIndex = s.events.findIndex((event) => event.kind === "securityChecked");
    const unsuspendIndex = s.events.findIndex(
      (event) => event.kind === "cardsMoved" && event.from === "suspended" && event.to === "unsuspended",
    );
    expect(securityIndex).toBeGreaterThanOrEqual(0);
    expect(unsuspendIndex).toBeGreaterThan(securityIndex);
    expect(s.perm("host").isSuspended).toBe(false);
    expect(
      s.events.filter((event) => event.kind === "effectResolved" && event.sourceCardId === "BT9-055"),
    ).toMatchObject([{ timing: "OnEndAttack" }]);
  });
});
