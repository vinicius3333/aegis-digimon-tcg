import { describe, expect, it } from "vitest";
import { EffectTiming } from "@aegis/shared";
import type { CardSource } from "../../engine/effects/CardSource.js";
import { getEffectModule } from "../../engine/effects/registry.js";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine } from "../../engine/testkit/harness.js";
import "./BT12-082.js";

describe("BT12-082 handwritten module", () => {
  it("registers its printed WhenDigivolving effect without declarative effect record", () => {
    const module = getEffectModule("BT12-082");
    expect(module?.cardId).toBe("BT12-082");
    const source = {
      instanceId: "source-082",
      cardId: "BT12-082",
      ownerSeat: 0,
      isOnBattleArea: () => true,
      isOwnersTurn: () => true,
      permanent: () => undefined,
    } as unknown as CardSource;
    expect(module!.effectsForTiming(EffectTiming.WhenDigivolving, source).length).toBeGreaterThan(0);
  });
});

it("returns X Antibody and deletes a low-level target with a matching stack", async () => {
  const s = setupEngine({
    0: {
      battleArea: [{ card: "BT12-082", as: "baalx", under: ["BT10-081"] }],
      trash: ["BT9-109"],
      deck: ["BT1-009", "BT1-010", "BT1-011"],
    },
    1: { battleArea: [{ card: "BT1-009", as: "target", level: 4 }] },
  }, { autoSelectCards: true });
  await advance(s.engine).fire(EffectTiming.WhenDigivolving, s.perm("baalx"));
  expect(s.state.players[0]!.hand.map(({ cardId }) => cardId)).toContain("BT9-109");
  expect(s.state.players[0]!.trash.map(({ cardId }) => cardId)).toEqual([]);
  expect(s.state.players[1]!.battleArea).toHaveLength(0);
});

it("trashes the top three cards when the stack lacks Baalmon or X Antibody", async () => {
  const s = setupEngine({
    0: { battleArea: [{ card: "BT12-082", as: "baalx", under: ["BT1-009"] }], deck: ["BT1-010", "BT1-011", "BT1-012"] },
    1: { battleArea: [{ card: "BT1-009", as: "target", level: 4 }] },
  });
  await advance(s.engine).fire(EffectTiming.WhenDigivolving, s.perm("baalx"));
  expect(s.state.players[0]!.trash.map(({ cardId }) => cardId)).toEqual(["BT1-009", "BT1-010", "BT1-011"]);
  expect(s.state.players[1]!.battleArea).toHaveLength(1);
});
