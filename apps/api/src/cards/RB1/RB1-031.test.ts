import { EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "../index.js";

describe("RB1-031 Arcturusmon", () => {
  it("places an exact Gammamon from trash and deletes only within its stack-count level cap", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "RB1-031", as: "arcturus", under: [{ card: "RB1-005" }, { card: "RB1-005" }] }],
          trash: [{ card: "RB1-005", as: "gammamon" }],
        },
        1: { battleArea: [{ card: "RB1-005", as: "opponent" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const gammamonInstanceId = s.inst("gammamon").instanceId;
    const opponentPermanentId = s.perm("opponent").permanentId;

    await advance(s.engine).fire(EffectTiming.WhenDigivolving, s.perm("arcturus"));
    await settle(() => s.perm("arcturus").stack.some((card) => card.instanceId === gammamonInstanceId));

    expect(s.perm("arcturus").stack.some((card) => card.instanceId === gammamonInstanceId)).toBe(true);
    expect(s.state.players[0]!.trash.some((card) => card.instanceId === gammamonInstanceId)).toBe(false);
    expect(s.state.players[1]!.battleArea.some((permanent) => permanent.permanentId === opponentPermanentId)).toBe(
      false,
    );
  });
});
