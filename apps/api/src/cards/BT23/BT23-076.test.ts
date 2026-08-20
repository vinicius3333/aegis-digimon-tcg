import { EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { setupEngine } from "../../engine/testkit/harness.js";
import "../index.js";
import { compiled } from "./BT23-076.js";

describe("BT23-076 Sistermon Blanc", () => {
  it("moves the old top security to hand and recovers the deck top in exact order", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT23-076", as: "blanc" }],
        security: [{ card: "BT1-009", as: "oldSecurity" }],
        deck: [{ card: "BT1-010", as: "recovered" }],
      },
    });
    const oldId = s.inst("oldSecurity").instanceId;
    const recoveredId = s.inst("recovered").instanceId;
    await (
      s.engine as unknown as {
        fireTiming(timing: EffectTiming, trigger: Record<string, unknown>): Promise<void>;
      }
    ).fireTiming(EffectTiming.OnPlay, { subjectPermanentId: s.perm("blanc").permanentId });

    expect(s.state.players[0]!.hand.some((card) => card.instanceId === oldId)).toBe(true);
    expect(s.state.players[0]!.security[0]).toMatchObject({ instanceId: recoveredId, faceUp: false });
    expect(s.state.players[0]!.deck).toHaveLength(0);
  });

  it("adds the top security card to hand, then performs Recovery +1 from deck", () => {
    const effect = compiled.effects.find((entry) => entry.trigger === "OnPlay") as any;
    expect(effect.actions).toMatchObject([
      { kind: "SecurityManipulation", op: "toHand", controller: "mine", amount: 1 },
      { kind: "SecurityManipulation", op: "addTop", controller: "mine", source: "deck", amount: 1 },
    ]);
    expect(effect.keywords).toBeUndefined();
  });

  it("only reacts when this Sistermon Blanc suspends and offers the reduced digivolution", () => {
    const watcher = (compiled.effects.find((entry) => entry.trigger === "YourTurn") as any).actions[0];
    expect(watcher.sourceFilter).toEqual({ isSelfRef: true });
    expect(watcher.actions[0]).toMatchObject({
      kind: "Digivolve",
      from: ["hand", "trash"],
      payCost: true,
      reduceCost: 1,
      optional: true,
    });
  });
});
