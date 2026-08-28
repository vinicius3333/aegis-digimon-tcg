import { describe, expect, it } from "vitest";
import { EffectTiming } from "@aegis/shared";
import { getEffectModule } from "../../engine/effects/registry.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "../index.js";
import "./BT15-046.js";
import { compiled } from "./BT15-046.js";

const source = {
  instanceId: "source",
  cardId: "BT15-046",
  ownerSeat: 0,
  definition: {},
  permanent: () => undefined,
  isOnBattleArea: () => true,
  isOwnersTurn: () => true,
  hasColor: () => true,
} as never;

describe("BT15-046", () => {
  it("registers the once-per-turn watcher for your Digimon suspending", async () => {
    const { compiled } = await import("./BT15-046.js");
    expect(compiled.effects?.[0]).toMatchObject({
      trigger: "YourTurn",
      frequency: "OncePerTurn",
      actions: [
        {
          kind: "SubTrigger",
          event: "whenSuspended",
          sourceFilter: { controller: "mine", kind: ["Digimon"] },
          actions: [{ kind: "Draw", amount: 1 }],
        },
      ],
    });
  });
  it("registers the draw trigger in the typed YourTurn IR", () =>
    expect(compiled.effects?.[0]).toMatchObject({
      trigger: "YourTurn",
      frequency: "OncePerTurn",
      actions: [{ kind: "SubTrigger", event: "whenSuspended" }],
    }));

  it("draws once when another one of your Digimon becomes suspended", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT15-046", as: "woodmon" }, { card: "BT1-009", as: "attacker" }], deck: [{ card: "BT1-001", as: "drawn" }] },
        1: { security: ["BT1-001"] },
      },
      { autoSelectCards: true },
    );
    expect(s.engine.applyIntent(0, { type: "attack", attackerPermanentId: s.perm("attacker").permanentId, target: { kind: "player" } })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("drawn").instanceId), 1_500);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toContain(s.inst("drawn").instanceId);
  });

  it("digivolves legally from a green level-3 Digimon and preserves the source stack", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT1-065", as: "base" }],
        hand: [{ card: "BT15-046", as: "woodmon" }],
      },
    });
    s.state.memory = 2;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("woodmon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard?.cardId === "BT15-046");

    expect(s.perm("base").stack.map((card) => card.cardId)).toEqual(["BT1-065"]);
  });
});
