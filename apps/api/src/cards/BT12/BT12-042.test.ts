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

it("gains 1 memory when digivolving with a yellow or red Tamer in play", async () => {
  const s = setupEngine({
    0: {
      battleArea: [{ card: "BT12-038", as: "geo" }, { card: "BT12-092", as: "tamer" }],
      hand: [{ card: "BT12-042", as: "rize" }],
    },
  });
  await s.ready();
  s.state.memory = 3;
  await advance(s.engine).verb.digivolveFromInstance(s.perm("geo").permanentId, s.inst("rize").instanceId);
  await settle(() => s.perm("geo").topCard?.cardId === "BT12-042");
  expect(s.state.memory).toBe(1);
});

it("does not repeat the Marcus recovery during the same turn", async () => {
  const s = setupEngine({
    0: {
      battleArea: [
        { card: "BT12-042", as: "rize" },
        { card: "BT12-092", as: "tamer1" },
        { card: "BT12-092", as: "tamer2" },
      ],
      trash: [{ card: "BT12-092", as: "marcus1" }, { card: "BT12-092", as: "marcus2" }],
    },
  }, { autoAcceptOptional: true, autoSelectCards: true });
  await s.ready();
  await advance(s.engine).verb.deletePermanent([s.perm("tamer1").permanentId], "byEffect");
  await settle(() => s.state.players[0]!.security.some(({ instanceId }) => instanceId === s.inst("marcus1").instanceId));
  await advance(s.engine).verb.deletePermanent([s.perm("tamer2").permanentId], "byEffect");
  await settle(() => s.state.players[0]!.battleArea.length === 1);
  expect(s.state.players[0]!.security).toHaveLength(1);
});
