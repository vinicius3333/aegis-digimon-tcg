import { describe, expect, it } from "vitest";
import { PlayerState } from "@aegis/shared";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./EX8-066.js";

describe("EX8-066", () => {
  it("registers the printed start-main memory gain", () => {
    expect(compiled.effects.find((entry) => entry.trigger === "StartOfYourMainPhase")).toMatchObject({
      actions: [{ kind: "GainMemory", amount: 1 }],
    });
  });
  it("registers the All Turns Ice-Snow play and digivolve watcher", () => {
    expect(compiled.effects.find((entry) => entry.trigger === "AllTurns")?.actions).toHaveLength(2);
  });
  it("registers the printed security play effect", () => {
    expect(compiled.effects.find((entry) => entry.trigger === "Security")).toMatchObject({ isSecurity: true });
  });
  it("plays the exact security Tamer into the battle area without cost", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT1-010", as: "attacker" }] },
      1: { security: [{ card: "EX8-066", as: "securityCard" }] },
    });
    const instanceId = s.inst("securityCard").instanceId;
    const memoryBeforeSecurityEffect = s.state.memory;
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() =>
      (s.state.players[1] as PlayerState).battleArea.some((permanent) => permanent.topCard.cardId === "EX8-066"),
    );
    expect(
      (s.state.players[1] as PlayerState).battleArea.some((permanent) => permanent.topCard.instanceId === instanceId),
    ).toBe(true);
    expect((s.state.players[1] as PlayerState).security.some((card) => card.instanceId === instanceId)).toBe(false);
    expect(s.state.memory).toBe(memoryBeforeSecurityEffect);
  });
  it("suspends to trash an opponent's digivolution card when an Ice-Snow Digimon is played", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "EX8-066", as: "tamer" }], hand: [{ card: "EX8-019", as: "ice" }] },
        1: { battleArea: [{ card: "AD1-001", as: "opponent", under: ["BT1-010"] }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();
    const stackedInstanceId = s.perm("opponent").stack[0]!.instanceId;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("ice").instanceId })).toEqual({ ok: true });
    await settle(() => s.perm("tamer").isSuspended && s.perm("opponent").stack.length === 0);

    expect(s.perm("tamer").isSuspended).toBe(true);
    expect(s.perm("opponent").stack).toHaveLength(0);
    expect(s.state.players[1]!.trash.some((card) => card.instanceId === stackedInstanceId)).toBe(true);
  });
});
