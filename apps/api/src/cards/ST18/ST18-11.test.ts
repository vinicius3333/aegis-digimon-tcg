import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "../index.js";
import { compiled } from "./ST18-11.js";

describe("ST18-11 Parrotmon", () => {
  it("suspends an opponent Digimon and prevents it from unsuspending", async () => {
    const s = setupEngine(
      { 0: { hand: [{ card: "ST18-11", as: "parrotmon" }] }, 1: { battleArea: [{ card: "ST18-03", as: "victim" }] } },
      { autoSelectCards: true },
    );
    s.state.memory = 7;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("parrotmon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.perm("victim").isSuspended && observe(s.engine).isRestricted(s.perm("victim"), "unsuspend"));

    expect(s.perm("victim").isSuspended).toBe(true);
    expect(observe(s.engine).isRestricted(s.perm("victim"), "unsuspend")).toBe(true);
  });

  it("publishes Piercing as its inherited keyword", () => {
    expect(compiled.effects).toContainEqual(
      expect.objectContaining({
        isInherited: true,
        keywords: [expect.objectContaining({ keyword: "Piercing" })],
      }),
    );
  });
});
