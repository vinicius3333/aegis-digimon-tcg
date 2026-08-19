import { describe, expect, it } from "vitest";
import { EffectTiming } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "../index.js";

describe("BT25-104 ShineGreymon: Burst Mode", () => {
  it("uses its DATA SQUAD Use Requirement and resolves the Option side Main effect", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "BT25-104", as: "option" }],
          battleArea: [{ card: "BT25-021", as: "dataSquad" }],
        },
        1: { battleArea: [{ card: "AD1-001", dp: 20000, as: "target" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    s.state.memory = 6;

    type PlayCardIntentWithUseAs = Parameters<typeof s.engine.applyIntent>[1] & { useAs?: "digimon" | "option" };
    expect(s.engine.applyIntent(0, {
      type: "playCard",
      instanceId: s.inst("option").instanceId,
      useAs: "option",
    } as PlayCardIntentWithUseAs)).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.battleArea.some((p) => p.currentDP === 5000));

    expect(s.state.players[1]!.battleArea.some((p) => p.currentDP === 5000)).toBe(true);
  });

  it("activates the Option-side Main effect from When Digivolving", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT25-104", as: "shine" }] },
        1: { battleArea: [{ card: "AD1-001", dp: 20000, as: "target" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await advance(s.engine).fire(EffectTiming.WhenDigivolving, s.perm("shine"));
    await settle(() => s.state.players[1]!.battleArea.some((p) => p.currentDP === 5000));

    expect(s.state.players[1]!.battleArea.some((p) => p.currentDP === 5000)).toBe(true);
  });
});
