import { describe, expect, it } from "vitest";
import { EffectTiming } from "@aegis/shared";
import type { CardSource } from "../../engine/effects/CardSource.js";
import { getEffectModule } from "../../engine/effects/registry.js";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT12-085.js";

describe("BT12-085 handwritten module", () => {
  it("registers its printed WhenDigivolving effect without declarative effect record", () => {
    const module = getEffectModule("BT12-085");
    expect(module?.cardId).toBe("BT12-085");
    const source = {
      instanceId: "source-085",
      cardId: "BT12-085",
      ownerSeat: 0,
      isOnBattleArea: () => true,
      isOwnersTurn: () => true,
      permanent: () => undefined,
    } as unknown as CardSource;
    expect(module!.effectsForTiming(EffectTiming.WhenDigivolving, source).length).toBeGreaterThan(0);
  });
});

it("trashes one security card per ten cards in trash with a matching stack", async () => {
  const s = setupEngine({
    0: {
      battleArea: [{ card: "BT12-085", as: "beelx", under: ["BT10-082"] }],
      trash: Array.from({ length: 20 }, () => "BT1-009"),
    },
    1: { security: ["BT1-009", "BT1-010", "BT1-011"] },
  });
  await advance(s.engine).fire(EffectTiming.WhenDigivolving, s.perm("beelx"));
  expect(s.state.players[1]!.security).toHaveLength(1);
});

it("plays an Impmon from trash when deleted", async () => {
  const s = setupEngine(
    {
      0: { battleArea: [{ card: "BT12-085", as: "beelx" }], trash: ["BT12-073"] },
    },
    { autoAcceptOptional: true, autoSelectCards: true },
  );
  await advance(s.engine).verb.deletePermanent([s.perm("beelx").permanentId]);
  await settle(() => s.state.players[0]!.battleArea.some(({ topCard }) => topCard?.cardId === "BT12-073"));
  expect(s.state.players[0]!.battleArea.some(({ topCard }) => topCard?.cardId === "BT12-073")).toBe(true);
});
