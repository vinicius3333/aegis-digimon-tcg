import { EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "../index.js";

describe("RB1-029 GulusGammamon", () => {
  it("deletes itself at end of attack, deletes a lower-DP opponent, and plays exact Gammamon trash card suspended", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "RB1-029", as: "gulus" }], trash: [{ card: "RB1-005", as: "gammamon" }] },
        1: { battleArea: [{ card: "RB1-002", as: "target" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const gammamonInstanceId = s.inst("gammamon").instanceId;

    await advance(s.engine).fire(EffectTiming.OnEndAttack, s.perm("gulus"));
    await settle(() => s.state.players[0]!.battleArea.some((perm) => perm.topCard.instanceId === gammamonInstanceId));

    expect(s.state.players[0]!.battleArea.some((perm) => perm.topCard.instanceId === gammamonInstanceId)).toBe(true);
    expect(
      s.state.players[0]!.battleArea.find((perm) => perm.topCard.instanceId === gammamonInstanceId)?.isSuspended,
    ).toBe(true);
    expect(s.state.players[1]!.battleArea).toHaveLength(0);
    expect(s.state.players[0]!.trash.some((card) => card.instanceId === gammamonInstanceId)).toBe(false);
  });
});
