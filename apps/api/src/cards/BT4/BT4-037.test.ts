import { describe, expect, it } from "vitest";
import type { PlayerState } from "@aegis/shared";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT4-037.js";

describe("BT4-037 Kudamon", () => {
  it("trashes the top security card to give an opponent Digimon -2000 DP", async () => {
    const s = setupEngine(
      {
        0: { hand: [{ card: "BT4-037", as: "source" }], security: [{ card: "BT4-038", as: "securityTop" }, "BT4-039"] },
        1: { battleArea: [{ card: "BT4-026", as: "target", dp: 6000 }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const player = s.state.players[0] as PlayerState;
    s.state.memory = 3;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("source").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.perm("target").currentDP === 4000);
    expect(player.trash.some((card) => card.instanceId === s.inst("securityTop").instanceId)).toBe(true);
    expect(player.security).toHaveLength(1);
  });

  it("does not reduce DP when its controller has no security card to trash", async () => {
    const s = setupEngine(
      {
        0: { hand: [{ card: "BT4-037", as: "source" }] },
        1: { battleArea: [{ card: "BT4-026", as: "target", dp: 6000 }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 3;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("source").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.battleArea.some((p) => p.topCard?.cardId === "BT4-037"), 5000);

    expect(s.perm("target").currentDP).toBe(s.perm("target").baseDP);
    expect(s.state.players[0]!.security).toHaveLength(0);
  });
});

describe("BT4-037 Kudamon — KB Q&A rulings", () => {
  async function playKudamonWithSecurity(securityCards: string[]) {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "BT4-037", as: "source" }, "BT1-009"],
          deck: ["BT1-009", "BT1-010"],
          security: securityCards,
        },
        1: { battleArea: [{ card: "BT4-026", as: "target", dp: 6000 }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 3;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("source").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.battleArea.some((p) => p.topCard?.cardId === "BT4-037"), 5000);
    await settle();
    return s;
  }

  it("cannot reduce DP with its [On Play] effect when its controller has no security cards (Q1205)", async () => {
    const empty = await playKudamonWithSecurity([]);
    expect(empty.perm("target").currentDP).toBe(6000);
    expect(empty.state.players[0]!.hand).toHaveLength(1);
    expect(empty.state.players[0]!.trash).toHaveLength(0);
    expect(empty.decisions.some((decision) => decision.req.kind === "optional")).toBe(false);

    const withSecurity = await playKudamonWithSecurity(["BT4-038"]);
    expect(withSecurity.perm("target").currentDP).toBe(4000);
    expect(withSecurity.state.players[0]!.security).toHaveLength(0);
    expect(withSecurity.state.players[0]!.trash.map((card) => card.cardId)).toEqual(["BT4-038"]);
    expect(withSecurity.decisions.some((decision) => decision.req.kind === "optional")).toBe(true);
  });
});
