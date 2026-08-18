import { describe, expect, it } from "vitest";
import { EffectTiming } from "@aegis/shared";
import type { CardSource } from "../../engine/effects/CardSource.js";
import { getEffectModule } from "../../engine/effects/registry.js";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT12-017.js";

describe("BT12-017 handwritten module", () => {
  it("registers its printed timing without declarative effect record", () => {
    const module = getEffectModule("BT12-017");
    expect(module?.cardId).toBe("BT12-017");
    const source = {
      instanceId: "source-017",
      cardId: "BT12-017",
      ownerSeat: 0,
      isOnBattleArea: () => true,
      isOwnersTurn: () => true,
      permanent: () => undefined,
    } as unknown as CardSource;
    expect(module!.effectsForTiming(EffectTiming.WhenDigivolving, source).length).toBeGreaterThan(0);
  });
});

it("plays Takuya from trash after deletion", async () => {
  const s = setupEngine(
    { 0: { battleArea: [{ card: "BT12-017", as: "emperor" }], trash: [{ card: "BT12-088", as: "takuya" }] } },
    { autoAcceptOptional: true, autoSelectCards: true },
  );
  await advance(s.engine).verb.deletePermanent([s.perm("emperor").permanentId]);
  await settle(() => s.state.players[0]!.battleArea.some((p) => p.topCard?.cardId === "BT12-088"));
  expect(s.state.players[0]!.battleArea.some((p) => p.topCard?.cardId === "BT12-088")).toBe(true);
});
