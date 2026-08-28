import { describe, expect, it } from "vitest";
import { EffectTiming, getCardDefinition } from "@aegis/shared";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import { advance } from "../../engine/testkit/advance.js";
import { observe } from "../../engine/testkit/observe.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./LM-010.js";

describe("LM-010 Chamblemon", () => {
  it("suspends a Tamer and locks every opposing Tamer from unsuspending", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "LM-010", as: "chamblemon" }] },
        1: {
          battleArea: [
            { card: "BT9-086", as: "oppTamer" },
            { card: "BT9-086", as: "otherTamer" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferred },
    );
    preferred.push(s.perm("oppTamer").permanentId);
    await s.ready();

    await advance(s.engine).fire(EffectTiming.OnPlay, s.perm("chamblemon"));
    await settle(() => s.perm("oppTamer").isSuspended, 2000);

    expect(s.perm("oppTamer").isSuspended).toBe(true);
    expect(observe(s.engine).isRestricted(s.perm("oppTamer").permanentId, "unsuspend")).toBe(true);
    expect(observe(s.engine).isRestricted(s.perm("otherTamer").permanentId, "unsuspend")).toBe(true);
  });

  it("leaves the controller's own Tamers free to unsuspend", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "LM-010", as: "chamblemon" },
            { card: "BT9-086", as: "myTamer" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();

    await advance(s.engine).fire(EffectTiming.OnPlay, s.perm("chamblemon"));
    await settle(() => s.perm("myTamer").isSuspended, 2000);

    expect(s.perm("myTamer").isSuspended).toBe(true);
    expect(observe(s.engine).isRestricted(s.perm("myTamer").permanentId, "unsuspend")).toBe(false);
  });

  it("locks an opposing Tamer that arrives after the effect resolved", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "LM-010", as: "chamblemon" }] },
        1: { battleArea: [{ card: "BT9-086", as: "oppTamer" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    await advance(s.engine).fire(EffectTiming.OnPlay, s.perm("chamblemon"));
    await settle(() => observe(s.engine).isRestricted(s.perm("oppTamer").permanentId, "unsuspend"), 2000);

    const late = s.putOnBoard(1, { card: "BT9-086", as: "lateTamer" });
    await advance(s.engine).recompute();

    expect(observe(s.engine).isRestricted(late.permanentId, "unsuspend")).toBe(true);
  });

  it("gets +1000 DP for each suspended Tamer on either side", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "LM-010", as: "chamblemon" },
            { card: "BT9-086", as: "mySuspended", suspended: true },
            { card: "BT9-086", as: "myUnsuspended" },
          ],
        },
        1: { battleArea: [{ card: "BT9-086", as: "oppSuspended", suspended: true }] },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    await s.ready();
    await advance(s.engine).recompute();

    // Printed 3000 plus 1000 for each of the two suspended Tamers.
    expect(s.perm("chamblemon").currentDP).toBe(5000);
  });

  it("keeps its printed DP with no suspended Tamer anywhere", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "LM-010", as: "chamblemon" },
            { card: "BT9-086", as: "myTamer" },
          ],
        },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    await s.ready();
    await advance(s.engine).recompute();

    expect(s.perm("chamblemon").currentDP).toBe(3000);
  });

  it("matches committed metadata and publishes fully covered compiled IR", () => {
    const definition = getCardDefinition("LM-010");
    const compiled = runtimeCompiledCard("LM-010");
    expect(definition?.nameEn).toBe("Chamblemon");
    expect(definition?.dp).toBe(3000);
    expect(compiled).toMatchObject({ coverage: "full", residual: [] });
  });
});
