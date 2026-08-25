import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "../index.js";

describe("BT19-018 Swimmon", () => {
  it("is always Aquatic and has Evade without granting either to another Digimon", async () => {
    const s = setupEngine({ 0: { battleArea: [
      { card: "BT19-018", as: "swim" }, { card: "BT1-009", as: "other" },
    ] } });
    await s.ready();
    expect(observe(s.engine).hasEffectiveTrait(s.perm("swim"), "Aquatic")).toBe(true);
    expect(observe(s.engine).hasEffectiveTrait(s.perm("other"), "Aquatic")).toBe(false);
    expect(observe(s.engine).hasKeyword(s.perm("swim"), "Evade")).toBe(true);
    expect(observe(s.engine).hasKeyword(s.perm("other"), "Evade")).toBe(false);
  });

  it("may suspend with Evade to survive effect deletion", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT19-018", as: "swim" }] } });
    const permanentId = s.perm("swim").permanentId;
    const deletion = advance(s.engine).verb.deletePermanent([permanentId]);
    await settle(() => s.events.some((event) => event.kind === "evadePrompt"));
    expect(s.engine.applyIntent(0, { type: "respondEvade", permanentId, accept: true })).toEqual({ ok: true });
    await deletion;
    expect(s.perm("swim").isSuspended).toBe(true);
    expect(s.state.players[0]!.trash).toHaveLength(0);
  });

  it("grants inherited Jamming only to its evolution host", async () => {
    const s = setupEngine({ 0: { battleArea: [
      { card: "BT19-019", as: "host", under: ["BT19-018"] },
      { card: "BT19-019", as: "plain" },
    ] } });
    await s.ready();
    expect(observe(s.engine).hasKeyword(s.perm("host"), "Jamming")).toBe(true);
    expect(observe(s.engine).hasKeyword(s.perm("plain"), "Jamming")).toBe(false);
  });
});
