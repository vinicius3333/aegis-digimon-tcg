import { describe, expect, it } from "vitest";
import { EffectTiming } from "@aegis/shared";
import type { CardSource } from "../../engine/effects/CardSource.js";
import { getEffectModule } from "../../engine/effects/registry.js";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT12-051.js";

describe("BT12-051 handwritten module", () => {
  it("registers its printed timing without declarative effect record", () => {
    const module = getEffectModule("BT12-051");
    expect(module?.cardId).toBe("BT12-051");
    const source = {
      instanceId: "source-051",
      cardId: "BT12-051",
      ownerSeat: 0,
      isOnBattleArea: () => true,
      isOwnersTurn: () => true,
      permanent: () => undefined,
    } as unknown as CardSource;
    expect(module!.effectsForTiming(EffectTiming.OnPlay, source).length).toBeGreaterThan(0);
  });
});

it("plays one named Tamer from hand without paying its cost", async () => {
  const s = setupEngine({
    0: { battleArea: [{ card: "BT12-051", as: "yasha" }], hand: [{ card: "BT12-091", as: "airu" }] },
  }, { autoAcceptOptional: true, autoSelectCards: true });
  await s.ready();
  await advance(s.engine).fire(EffectTiming.OnPlay, s.perm("yasha"));
  await settle(() => s.state.players[0]!.battleArea.some(({ topCard }) => topCard?.cardId === "BT12-091"));
  expect(s.state.players[0]!.battleArea.some(({ topCard }) => topCard?.cardId === "BT12-091")).toBe(true);
});

it("does not play an unrelated Tamer from hand", async () => {
  const s = setupEngine({
    0: { battleArea: [{ card: "BT12-051", as: "yasha" }], hand: [{ card: "BT12-094", as: "unrelated" }] },
  }, { autoAcceptOptional: true, autoSelectCards: true });
  await s.ready();
  await advance(s.engine).fire(EffectTiming.OnPlay, s.perm("yasha"));
  await settle(() => s.state.pendingDecision === undefined);
  expect(s.state.players[0]!.hand.some(({ instanceId }) => instanceId === s.inst("unrelated").instanceId)).toBe(true);
  expect(s.state.players[0]!.battleArea.some(({ topCard }) => topCard?.instanceId === s.inst("unrelated").instanceId)).toBe(false);
});

it("saves a deleted Save Digimon under one of its Tamers", async () => {
  const s = setupEngine({
    0: {
      battleArea: [{ card: "BT12-051", as: "yasha" }, { card: "BT12-091", as: "airu" }],
      trash: [{ card: "BT12-008", as: "saved" }],
    },
  }, { autoAcceptOptional: true, autoSelectCards: true });
  await s.ready();
  await advance(s.engine).verb.deletePermanent([s.perm("yasha").permanentId], "byEffect");
  await settle(() => s.perm("airu").stack.some(({ cardId }) => cardId === "BT12-008"));
  expect(s.perm("airu").stack.some(({ cardId }) => cardId === "BT12-008")).toBe(true);
});

it("gives a Save-text inherited host 2000 DP during its controller's turn", async () => {
  const s = setupEngine({ 0: { battleArea: [{ card: "BT12-011", as: "host", under: ["BT12-051"] }] } });
  await s.ready();
  expect(s.perm("host").currentDP).toBe(s.perm("host").baseDP + 2000);
});
