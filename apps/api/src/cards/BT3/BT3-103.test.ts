import { EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT3-103.js";

describe("BT3-103 Hidden Potential Discovered!", () => {
  it("suspends a Digimon to reduce the next green digivolution cost by 5", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT3-054", as: "base" },
            { card: "BT3-044", as: "payer" },
          ],
          hand: [
            { card: "BT3-103", as: "option" },
            { card: "BT3-057", as: "evolving" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferred },
    );
    preferred.push(s.perm("payer").topCard.instanceId);
    s.state.memory = 10;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.trash.some((card) => card.cardId === "BT3-103"));
    const memoryAfterOption = s.state.memory;
    expect(s.perm("payer").isSuspended).toBe(false);
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("evolving").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard.cardId === "BT3-057" && s.perm("payer").isSuspended);
    expect(s.state.memory).toBe(memoryAfterOption);
  });

  it("adds itself to its owner's hand from security", async () => {
    const s = setupEngine({ 0: { security: [{ card: "BT3-103", as: "securityOption", faceUp: true }] } });
    const id = s.inst("securityOption").instanceId;
    await advance(s.engine).fireForInstance(EffectTiming.SecuritySkill, s.inst("securityOption"));
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === id)).toBe(true);
  });
});
