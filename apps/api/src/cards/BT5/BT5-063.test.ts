import { describe, expect, it } from "vitest";
import type { PlayerState } from "@aegis/shared";
import { observe } from "../../engine/testkit/observe.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT5-063.js";

describe("BT5-063 Kurisarimon", () => {
  it("plays Arata Sanada without cost when none is in play", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT10-058", as: "base" }], hand: [{ card: "BT5-063", as: "evolving" }, { card: "BT5-090", as: "arata" }] } }, { autoAcceptOptional: true, autoSelectCards: true });
    const player = s.state.players[0] as PlayerState;
    s.state.memory = 2;

    expect(s.engine.applyIntent(0, { type: "digivolve", permanentId: s.perm("base").permanentId, instanceId: s.inst("evolving").instanceId })).toEqual({ ok: true });
    await settle(() => s.events.some((event) => event.kind === "effectResolved" && event.sourceCardId === "BT5-063"));

    expect(player.battleArea.some((permanent) => permanent.topCard.instanceId === s.inst("arata").instanceId)).toBe(true);
  });

  it("grants Rush only to other Digimon with the host's current name", async () => {
    const s = setupEngine({ 0: { battleArea: [
      { card: "BT5-084", as: "host", under: ["BT5-063"] },
      { card: "BT5-084", as: "sameName" },
      { card: "BT5-066", as: "differentName" },
    ] } });

    await s.engine.recomputeContinuousEffects();

    expect(observe(s.engine).hasKeyword(s.perm("sameName"), "Rush")).toBe(true);
    expect(observe(s.engine).hasKeyword(s.perm("differentName"), "Rush")).toBe(false);
    expect(observe(s.engine).hasKeyword(s.perm("host"), "Rush")).toBe(false);
  });
});
