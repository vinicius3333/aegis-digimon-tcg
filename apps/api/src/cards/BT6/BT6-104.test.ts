import { EffectTiming, requireCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import type { GameEngine } from "../../engine/GameEngine.js";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT6-104.js";

describe("BT6-104 Parabolic Junk", () => {
  it("makes the chosen own Digimon gain 2 memory when deleted", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT6-055", as: "recipient" }], hand: [{ card: "BT6-104", as: "option" }] },
      },
      { autoSelectCards: true },
    );
    const initialMemory = 5;
    s.state.memory = initialMemory;
    const recipientId = s.perm("recipient").permanentId;
    const expectedMemory = initialMemory - requireCardDefinition("BT6-104").playCost + 2;
    const engine = s.engine as unknown as Pick<GameEngine, "applyIntent"> & {
      primitives: { deletePermanent(ids: string[], cause?: string): Promise<number> };
    };

    expect(engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.trash.some((card) => card.cardId === "BT6-104"));
    await engine.primitives.deletePermanent([recipientId], "byEffect");
    await settle(() => s.state.memory === expectedMemory);

    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.permanentId === recipientId)).toBe(false);
    expect(s.state.memory).toBe(expectedMemory);
  });

  it("adds itself to hand from security", async () => {
    const s = setupEngine({ 0: { security: [{ card: "BT6-104", as: "securityOption", faceUp: true }] } });
    const instanceId = s.inst("securityOption").instanceId;

    await advance(s.engine).fireForInstance(EffectTiming.SecuritySkill, s.inst("securityOption"));

    expect(s.state.players[0]!.hand.some((card) => card.instanceId === instanceId)).toBe(true);
  });
});
