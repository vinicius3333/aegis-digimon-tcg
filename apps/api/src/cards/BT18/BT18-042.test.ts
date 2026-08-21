import { describe, expect, it } from "vitest";
import { EffectTiming } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT18-042.js";

describe("BT18-042 MagnaGarurumon", () => {
  it("places an exact level 5 stack card into security and deletes the matching opponent Digimon", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT18-042", as: "host", under: ["BT1-060"] }],
          security: ["BT1-001"],
        },
        1: { battleArea: [{ card: "BT1-060", as: "target" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();

    await advance(s.engine).fireForInstance(EffectTiming.WhenDigivolving, s.perm("host").topCard!);
    await settle(() => s.state.players[0]!.security.some((card) => card.cardId === "BT1-060"));

    expect(s.state.players[0]!.security.some((card) => card.cardId === "BT1-060")).toBe(true);
    expect(s.perm("host").stack).toHaveLength(0);
    expect(s.state.players[1]!.battleArea.some((perm) => perm.topCard?.instanceId === s.inst("target").instanceId)).toBe(false);
  });
});
