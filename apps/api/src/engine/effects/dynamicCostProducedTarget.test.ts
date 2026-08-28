import { EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import "../../cards/BT18/BT18-042.js";
import { advance } from "../testkit/advance.js";
import { assertNoLoudGap, setupEngine, settle } from "../testkit/harness.js";

describe("cost-produced dynamic targets", () => {
  it("offers a Delete whose level target is established by its placement cost", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT18-042", as: "source", under: ["BT1-060"] }],
          security: ["BT1-001"],
        },
        1: {
          battleArea: [
            { card: "BT1-060", as: "matching" },
            { card: "BT1-009", as: "other" },
          ],
        },
      },
      { autoSelectCards: true },
    );
    await s.ready();
    const matchingId = s.perm("matching").permanentId;
    const otherId = s.perm("other").permanentId;

    const resolution = advance(s.engine).fire(EffectTiming.WhenDigivolving, s.perm("source"));
    await settle(() => s.state.pendingDecision?.kind === "optional");

    const decision = s.state.pendingDecision!;
    expect(decision.kind).toBe("optional");
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: decision.decisionId,
        response: { kind: "optional", accept: true },
      }),
    ).toEqual({ ok: true });
    await resolution;

    expect(s.state.players[0]!.security.at(-1)?.cardId).toBe("BT1-060");
    expect(s.state.players[1]!.battleArea.some(({ permanentId }) => permanentId === matchingId)).toBe(false);
    expect(s.state.players[1]!.battleArea.some(({ permanentId }) => permanentId === otherId)).toBe(true);
    assertNoLoudGap(s);
  });
});
