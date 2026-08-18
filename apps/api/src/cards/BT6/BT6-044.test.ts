import type { PlayerState } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT6-044.js";

describe("BT6-044 Dynasmon", () => {
  it("reveals 6 before resolving the Recovery triggered by its security-trash cost", async () => {
    const s = setupEngine({ 0: {
      battleArea: [{ card: "AD1-015", as: "base" }],
      hand: [{ card: "BT6-044", as: "evolving" }],
      security: [{ card: "BT1-010", as: "trashedSecurity" }],
      deck: [
        { card: "BT1-095", as: "digivolveDraw" },
        { card: "BT2-020", as: "one" },
        { card: "BT2-017", as: "two" },
        "BT1-090",
        "BT1-091",
        "BT1-092",
        "BT1-093",
        { card: "BT1-094", as: "recovered" },
      ],
    } }, { autoAcceptOptional: true, autoSelectCards: true });
    const player = s.state.players[0] as PlayerState;
    s.state.memory = 4;

    expect(s.engine.applyIntent(0, { type: "digivolve", permanentId: s.perm("base").permanentId, instanceId: s.inst("evolving").instanceId })).toEqual({ ok: true });
    await settle(() => player.security.some((card) => card.instanceId === s.inst("recovered").instanceId));

    expect(player.hand.some((card) => card.instanceId === s.inst("one").instanceId)).toBe(true);
    expect(player.hand.some((card) => card.instanceId === s.inst("two").instanceId)).toBe(true);
    expect(player.security.map((card) => card.instanceId)).toEqual([s.inst("recovered").instanceId]);
    expect(player.trash).toHaveLength(5);
  });

  it("may add none of the eligible level 6 or lower Digimon after paying the cost", async () => {
    const s = setupEngine({ 0: {
      battleArea: [{ card: "AD1-015", as: "base" }],
      hand: [{ card: "BT6-044", as: "evolving" }],
      security: ["BT1-010", "BT1-011", "BT1-012", "BT1-013"],
      deck: [
        { card: "BT1-095", as: "digivolveDraw" },
        { card: "BT2-020", as: "eligibleA" },
        { card: "BT2-017", as: "eligibleB" },
        "BT1-090", "BT1-091", "BT1-092", "BT1-093", "BT1-094",
      ],
    } }, { autoAcceptOptional: true, autoOrderTriggers: true });
    s.state.memory = 4;

    expect(s.engine.applyIntent(0, { type: "digivolve", permanentId: s.perm("base").permanentId, instanceId: s.inst("evolving").instanceId })).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision?.kind === "selectCards");
    const choice = s.state.pendingDecision!;
    expect(JSON.parse(choice.payloadJson)).toMatchObject({ min: 0, max: 2 });
    expect(s.engine.applyIntent(0, {
      type: "respondDecision",
      decisionId: choice.decisionId,
      response: { kind: "selectCards", instanceIds: [] },
    })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.trash.some((card) => card.instanceId === s.inst("eligibleA").instanceId));

    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("eligibleA").instanceId)).toBe(false);
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("eligibleB").instanceId)).toBe(false);
  });
});
