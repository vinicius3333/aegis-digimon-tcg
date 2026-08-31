import { describe, expect, it } from "vitest";
import { EffectTiming } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./EX1-035.js";

describe("EX1-035 Kabuterimon", () => {
  it("can digivolve into an Insectoid from hand while attacking", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "EX1-035", as: "kabuterimon" }], hand: [{ card: "BT1-076", as: "evo" }] },
        1: { security: ["BT1-001", "BT1-001"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 5;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("kabuterimon").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("kabuterimon").topCard.cardId === "BT1-076");
    expect(s.perm("kabuterimon").topCard.instanceId).toBe(s.inst("evo").instanceId);
    expect(s.state.memory).toBe(3);
  });

  it("may decline the can-digivolve action while attacking", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "EX1-035", as: "kabuterimon" }], hand: [{ card: "BT1-076", as: "evo" }] },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    await advance(s.engine).fireForPermanent(EffectTiming.OnUseAttack, s.perm("kabuterimon"));
    expect(s.perm("kabuterimon").topCard.cardId).toBe("EX1-035");
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("evo").instanceId)).toBe(true);
  });
});
