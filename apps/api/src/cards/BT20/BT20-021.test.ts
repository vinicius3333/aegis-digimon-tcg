import { describe, expect, it } from "vitest";
import { EffectTiming } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./BT20-021.js";
import "./index.js";

describe("BT20-021 Jesmon GX", () => {
  it("shares the once-per-turn Royal Knight placement cost across entry and attack triggers", () => {
    for (const trigger of ["OnPlay", "WhenDigivolving", "WhenAttacking"] as const) {
      expect(compiled.effects.find((entry) => entry.trigger === trigger)).toMatchObject({
        frequency: "OncePerTurn",
        actions: [
          {
            kind: "Delete",
            cost: {
              kind: "place",
              target: {
                from: ["hand", "trash"],
                filter: { nameOrTrait: [{ tokens: ["Royal Knight"], match: "trait" }] },
              },
              destination: "digivolutionStack",
              position: "bottom",
              host: "self",
            },
            optional: true,
          },
        ],
      });
    }
    const attack = compiled.effects.filter((entry) => entry.trigger === "WhenAttacking")[1];
    expect(attack).toMatchObject({
      frequency: "OncePerTurn",
      actions: [
        { kind: "Unsuspend", target: { isSelf: true } },
        {
          kind: "Trash",
          target: { filter: { controller: "opponent", zone: "security", position: "top" } },
          scaling: {
            per: 2,
            unit: "digivolutionCards",
            filter: { nameOrTrait: [{ tokens: ["Royal Knight"], match: "trait" }] },
          },
        },
      ],
    });
    expect(compiled.effects.find((entry) => entry.trigger === "Counter")).toMatchObject({
      isFromHand: true,
      keywords: [{ keyword: "BlastDigivolve" }],
    });
  });

  it("places a Royal Knight from hand at stack bottom, deletes at 16000 DP, and shares the use across timings", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT20-021", as: "gx", under: ["BT20-010"] }],
          hand: [{ card: "BT20-017", as: "royalKnightCost" }],
        },
        1: {
          battleArea: [
            { card: "BT20-014", dp: 16000, as: "boundary" },
            { card: "BT20-014", dp: 17000, as: "tooLarge" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const boundaryId = s.perm("boundary").permanentId;
    await advance(s.engine).fire(EffectTiming.OnPlay, s.perm("gx"));
    await settle(() => !s.state.players[1]!.battleArea.some(({ permanentId }) => permanentId === boundaryId));
    expect(s.perm("gx").stack[0]?.cardId).toBe("BT20-017");
    expect(s.perm("gx").stack.map((card) => card.cardId)).toContain("BT20-010");
    expect(s.perm("tooLarge")).toBeDefined();

    const stackLength = s.perm("gx").stack.length;
    await advance(s.engine).fire(EffectTiming.WhenDigivolving, s.perm("gx"));
    expect(s.perm("gx").stack).toHaveLength(stackLength);
  });

  it("with 4 Royal Knight sources unsuspends and trashes the top 2 security cards", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            {
              card: "BT20-021",
              suspended: true,
              as: "gx",
              under: ["BT20-017", "BT20-019", "BT20-056", "BT20-060"],
            },
          ],
        },
        1: { security: ["BT20-001", "BT20-002", "BT20-003", "BT20-004"] },
      },
      { autoOrderTriggers: true },
    );
    await advance(s.engine).fire(EffectTiming.OnUseAttack, s.perm("gx"));
    await settle(() => !s.perm("gx").isSuspended && s.state.players[1]!.security.length === 2);
    expect(s.perm("gx").isSuspended).toBe(false);
    expect(s.state.players[1]!.security).toHaveLength(2);
  });
});
