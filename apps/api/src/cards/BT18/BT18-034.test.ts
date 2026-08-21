import { EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT18-034.js";

describe("BT18-034 Lucemon", () => {
  it("trashes the hand cost, lets the opponent trash security, and recovers when they decline", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: { hand: [{ card: "BT18-034", as: "lucemon" }, { card: "BT1-001", as: "cost" }], deck: ["BT1-002"], security: ["BT1-003"] },
        1: { security: ["BT1-003"] },
      },
      { autoSelectCards: true, autoDeclineOptional: true, preferInstanceIds: preferred },
    );
    await s.ready();
    preferred.push(s.inst("cost").instanceId);

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("lucemon").instanceId })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some((perm) => perm.topCard?.instanceId === s.inst("lucemon").instanceId));
    await advance(s.engine).fireForInstance(EffectTiming.OnPlay, s.inst("lucemon"));

    expect(s.state.players[0]!.trash.some((card) => card.instanceId === s.inst("cost").instanceId)).toBe(true);
    expect(s.state.players[1]!.security).toHaveLength(1);
    expect(s.state.players[0]!.security).toHaveLength(2);
    expect(s.state.players[0]!.security[0]!.cardId).toBe("BT1-002");
  });

  it("recovers the exact deck card when the opponent has no security to trash", async () => {
    const s = setupEngine(
      {
        0: { hand: [{ card: "BT18-034", as: "lucemon" }, { card: "BT1-001", as: "cost" }], deck: ["BT1-002"], security: ["BT1-003"] },
        1: { security: [] },
      },
      { autoSelectCards: true, autoAcceptOptional: true },
    );
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("lucemon").instanceId })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some((perm) => perm.topCard?.instanceId === s.inst("lucemon").instanceId));
    await advance(s.engine).fireForInstance(EffectTiming.OnPlay, s.inst("lucemon"));
    await settle(() => s.state.players[0]!.security.some((card) => card.cardId === "BT1-002"));

    expect(s.state.players[0]!.security).toHaveLength(2);
    expect(s.state.players[0]!.security[0]!.cardId).toBe("BT1-002");
    expect(s.state.players[0]!.trash.some((card) => card.instanceId === s.inst("cost").instanceId)).toBe(true);
  });

});
