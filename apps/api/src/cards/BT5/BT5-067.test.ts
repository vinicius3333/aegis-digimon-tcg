import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT5-067.js";

describe("BT5-067 Infermon", () => {
  it("digivolves over Keramon in the battle area for the alternate cost of 4", async () => {
    const s = setupEngine({ 0: {
      battleArea: [{ card: "BT5-059", as: "keramon" }],
      hand: [{ card: "BT5-067", as: "evolving" }],
    } });
    s.state.memory = 4;

    expect(s.engine.applyIntent(0, {
      type: "digivolve",
      permanentId: s.perm("keramon").permanentId,
      instanceId: s.inst("evolving").instanceId,
    })).toEqual({ ok: true });
    await settle(() => s.perm("keramon").topCard.cardId === "BT5-067");
    expect(s.state.memory).toBe(0);
  });

  it("Q1342 rejects the Keramon shortcut in the breeding area", () => {
    const s = setupEngine({ 0: {
      breeding: { card: "BT5-059", as: "keramon" },
      hand: [{ card: "BT5-067", as: "evolving" }],
    } });
    s.state.memory = 4;

    expect(s.engine.applyIntent(0, {
      type: "digivolve",
      permanentId: s.perm("keramon").permanentId,
      instanceId: s.inst("evolving").instanceId,
    })).toEqual({ ok: false, reason: "invalid-evolution" });
  });

  it("may play a Diaboromon Token when its host is deleted", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT5-069", as: "host", under: ["BT5-067"] }] } }, { autoAcceptOptional: true });
    await s.engine.recomputeContinuousEffects();
    await (s.engine as any).primitives.deletePermanent([s.perm("host").permanentId], "byEffect");
    await settle(() => s.state.players[0]!.battleArea.some((p) => p.topCard?.cardId.includes("TOKEN")));
    expect(s.state.players[0]!.battleArea.some((p) => p.topCard?.cardId.includes("TOKEN"))).toBe(true);
  });

  it("allows declining the inherited Token effect", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT5-069", as: "host", under: ["BT5-067"] }] } }, { autoDeclineOptional: true });
    await s.engine.recomputeContinuousEffects();
    await (s.engine as any).primitives.deletePermanent([s.perm("host").permanentId], "byEffect");
    await settle(() => s.state.players[0]!.battleArea.length === 0);
    expect(s.state.players[0]!.battleArea).toHaveLength(0);
  });
});
