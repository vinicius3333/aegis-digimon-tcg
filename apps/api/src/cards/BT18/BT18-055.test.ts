import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT18-055.js";

describe("BT18-055 AncientTroymon", () => {
  it("trashes the opponent's top security card when their Digimon becomes suspended", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT18-055", as: "ancientTroymon" }] },
      1: {
        battleArea: [{ card: "BT1-030", as: "opponentDigimon" }],
        security: ["BT1-010", "BT1-011"],
      },
    });
    const top = s.state.players[1]!.security[0]!.instanceId;

    await advance(s.engine).verb.suspend([s.perm("opponentDigimon").permanentId]);
    await settle(() => !s.state.players[1]!.security.some((card) => card.instanceId === top));

    expect(s.state.players[1]!.security).toHaveLength(1);
    expect(s.state.players[1]!.trash.some((card) => card.instanceId === top)).toBe(true);
  });
});
