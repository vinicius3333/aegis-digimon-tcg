import { describe, expect, it } from "vitest";
import { observe } from "../../engine/testkit/observe.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT5-014.js";

describe("BT5-014 OmniShoutmon", () => {
  it("digivolves over Shoutmon for the alternate cost of 4", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT5-009", as: "shoutmon" }],
        hand: [{ card: "BT5-014", as: "evolving" }],
      },
    });
    s.state.memory = 4;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("shoutmon").permanentId,
        instanceId: s.inst("evolving").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("shoutmon").topCard.cardId === "BT5-014" && s.state.memory === 0);

    expect(s.state.memory).toBe(0);
    expect(s.perm("shoutmon").topCard.cardId).toBe("BT5-014");
  });

  it("Q1291 rejects the Shoutmon shortcut in the breeding area", () => {
    const s = setupEngine({
      0: {
        breeding: { card: "BT5-009", as: "shoutmon" },
        hand: [{ card: "BT5-014", as: "evolving" }],
      },
    });
    s.state.memory = 4;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("shoutmon").permanentId,
        instanceId: s.inst("evolving").instanceId,
      }),
    ).toEqual({ ok: false, reason: "invalid-evolution" });
  });

  it("gives Security Attack +1 to a host with Blitz", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT4-073", as: "host", under: ["BT5-014"] }] } });
    (s.engine as any).primitives.grantKeyword(s.perm("host").permanentId, "Blitz", "permanent");
    await s.engine.recomputeContinuousEffects();

    expect(observe(s.engine).hasKeyword(s.perm("host"), "Blitz")).toBe(true);
    expect(observe(s.engine).keywordAmount(s.perm("host"), "SecurityAttack")).toBe(1);
  });

  it("does not grant Security Attack +1 without Blitz", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT4-073", as: "host", under: ["BT5-014"] }] } });
    await s.engine.recomputeContinuousEffects();
    expect(observe(s.engine).keywordAmount(s.perm("host"), "SecurityAttack")).toBe(0);
  });
});
