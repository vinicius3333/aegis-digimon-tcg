import type { PlayerState } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "./BT2-038.js";

describe("BT2-038 RizeGreymon", () => {
  it("plays a yellow Tamer from hand without paying its cost", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT2-035", as: "base" }], hand: [{ card: "BT2-038", as: "evolving" }, { card: "BT1-087", as: "tamer" }] } }, { autoAcceptOptional: true, autoSelectCards: true });
    const player = s.state.players[0] as PlayerState;
    s.state.memory = 3;
    expect(s.engine.applyIntent(0, { type: "digivolve", permanentId: s.perm("base").permanentId, instanceId: s.inst("evolving").instanceId })).toEqual({ ok: true });
    await settle(() => player.battleArea.some((permanent) => permanent.topCard.instanceId === s.inst("tamer").instanceId));
    expect(s.state.memory).toBe(0);
  });

  it("grants Security Attack +1 to its host while its owner has 3 yellow Tamers", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT2-041", as: "host", under: ["BT2-038"] }, "BT1-087", "BT1-087", "BT1-087"] } });
    await s.engine.recomputeContinuousEffects();
    expect(observe(s.engine).hasKeyword(s.perm("host"), "SecurityAttack")).toBe(true);
  });
});
