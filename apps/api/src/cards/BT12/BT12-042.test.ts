import { describe, expect, it } from "vitest";
import { EffectTiming } from "@aegis/shared";
import type { CardSource } from "../../engine/effects/CardSource.js";
import { getEffectModule } from "../../engine/effects/registry.js";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT12-042.js";

describe("BT12-042 handwritten module", () => {
  it("registers its printed timing without declarative effect record", () => {
    const module = getEffectModule("BT12-042");
    expect(module?.cardId).toBe("BT12-042");
    const source = {
      instanceId: "source-042",
      cardId: "BT12-042",
      ownerSeat: 0,
      isOnBattleArea: () => true,
      isOwnersTurn: () => true,
      permanent: () => undefined,
    } as unknown as CardSource;
    expect(module!.effectsForTiming(EffectTiming.WhenDigivolving, source).length).toBeGreaterThan(0);
  });
});

it("recovers Marcus only when one of its owner's Tamers is deleted", async () => {
  const s = setupEngine({
    0: {
      battleArea: [
        { card: "BT12-042", as: "rize" },
        { card: "BT12-092", as: "tamer" },
      ],
      trash: [{ card: "BT12-092", as: "marcus" }],
    },
  }, { autoAcceptOptional: true, autoSelectCards: true });
  await s.ready();
  await advance(s.engine).verb.deletePermanent([s.perm("tamer").permanentId], "byEffect");
  await settle(() => s.state.players[0]!.security.some(({ instanceId }) => instanceId === s.inst("marcus").instanceId));
  expect(s.state.players[0]!.security.some(({ instanceId }) => instanceId === s.inst("marcus").instanceId)).toBe(true);
});
