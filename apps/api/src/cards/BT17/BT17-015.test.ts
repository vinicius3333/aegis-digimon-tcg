import { describe, expect, it } from "vitest";
import { settle, setupEngine } from "../../engine/testkit/harness.js";
import { compiled } from "./BT17-015.js";

describe("BT17-015", () => {
  it("reduces its play cost by 3 when you have a Tai Kamiya Tamer", () => {
    expect(compiled.effects?.[0]).toMatchObject({
      trigger: "Static",
      actions: [
        {
          kind: "Replacement",
          event: "wouldBePlayed",
          actions: [{ kind: "Replacement", mode: "reduceCost", amount: 3, condition: { kind: "youHave" } }],
        },
      ],
    });
  });

  it("offers deletion or free MetalGarurumon digivolution on play and digivolution", () => {
    for (const effect of compiled.effects?.slice(1, 3) ?? []) {
      expect(effect.actions?.[0]).toMatchObject({
        kind: "Modal",
        choose: 1,
        options: [
          [{ kind: "Delete" }],
          [{ kind: "Digivolve", from: ["hand"], payCost: false, ignoreRequirements: true, optional: true }],
        ],
      });
    }
  });

  it("trashes opponent security as inherited when it has Omnimon in its name", () => {
    expect(compiled.effects?.[3]).toMatchObject({
      trigger: "WhenAttacking",
      isInherited: true,
      frequency: "OncePerTurn",
      actions: [
        {
          kind: "SecurityManipulation",
          op: "trashTop",
          controller: "opponent",
          amount: 1,
          condition: { kind: "selfHasNameContaining" },
        },
      ],
    });
  });

  it("trashes one security card when an Omnimon host attacks", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT17-078", as: "host", under: ["BT17-015"] }] },
      1: { security: ["BT1-009", "BT1-009"] },
    });
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.security.length === 0);
    // The inherited effect trashes one card, then the attack's normal check removes the
    // remaining security card.
    expect(s.state.players[1]!.security).toHaveLength(0);
  });
});
