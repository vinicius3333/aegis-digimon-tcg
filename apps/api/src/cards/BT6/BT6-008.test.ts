import { EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "./BT6-008.js";
import "../BT9/BT9-068.js";
import "./BT6-014.js";

describe("BT6-008 Shoutmon", () => {
  it("draws when its Blitz host attacks", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT9-068", under: ["BT6-008", "BT6-011", "BT5-014"], as: "host" }],
        deck: [{ card: "BT1-011", as: "drawn" }],
      },
      1: { security: ["BT1-012"] },
    });
    await advance(s.engine).fire(EffectTiming.WhenDigivolving, s.perm("host"));
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("drawn").instanceId));
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("drawn").instanceId)).toBe(true);
  });
});

describe("BT6-008 Shoutmon — KB Q&A rulings", () => {
  async function attackNormally(hostCardId: string) {
    const s = setupEngine({
      0: {
        battleArea: [{ card: hostCardId, under: ["BT6-008"], as: "host" }],
        deck: [{ card: "BT1-011", as: "drawn" }, "BT1-012"],
      },
      1: { security: ["BT1-012", "BT1-012"] },
    });
    s.state.memory = 3;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => !observe(s.engine).isAttacking());
    await settle();
    return s;
  }

  it("draws 1 on a normal non-<Blitz> attack while the Digimon has <Blitz> (Q1404)", async () => {
    const withBlitz = await attackNormally("BT6-014");
    expect(withBlitz.state.memory).toBe(3);
    expect(withBlitz.state.players[1]!.security).toHaveLength(1);
    expect(withBlitz.state.players[0]!.hand.map((card) => card.instanceId)).toEqual([
      withBlitz.inst("drawn").instanceId,
    ]);

    const withoutBlitz = await attackNormally("BT6-011");
    expect(withoutBlitz.state.players[1]!.security).toHaveLength(1);
    expect(withoutBlitz.state.players[0]!.hand).toHaveLength(0);
  });
});
