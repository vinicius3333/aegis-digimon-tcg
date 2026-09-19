import { describe, expect, it } from "vitest";
import { EffectTiming } from "@aegis/shared";
import "../cards/BT26/BT26-026.js";
import "../cards/index.js";
import { advance } from "./testkit/advance.js";
import { setupEngine, settle } from "./testkit/harness.js";

describe("optional once-per-turn processing costs", () => {
  it("retries after declining BT26-026's optional cost gate but consumes it after paying", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT26-026", as: "cougarmon", dp: 30000 },
            {
              card: "BT26-089",
              as: "tamer",
              under: [
                { card: "BT1-001", as: "cost", faceUp: false },
                { card: "BT1-002", as: "secondCost", faceUp: false },
              ],
            },
          ],
          hand: [{ card: "P-236", as: "option" }],
        },
        1: {
          battleArea: [
            { card: "BT1-013", as: "firstVictim", suspended: true, dp: 1000 },
            { card: "BT1-013", as: "secondVictim", suspended: true, dp: 1000 },
          ],
        },
      },
      { autoChooseOption: true },
    );
    s.state.memory = 10;
    const trigger = () =>
      advance(s.engine).fireForPermanent(EffectTiming.OnUseAttack, s.perm("cougarmon"), {
        attackerPermanentId: s.perm("cougarmon").permanentId,
      });

    const first = trigger();
    await settle(() => s.decisions.at(-1)?.req.kind === "optional");
    const declinedCost = s.decisions.at(-1)?.req;
    if (declinedCost?.kind !== "optional") throw new Error("Expected the optional CostGatedBlock gate");
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: declinedCost.decisionId,
        response: { kind: "optional", accept: false },
      }),
    ).toEqual({ ok: true });
    await first;

    const decisionsBeforeSecond = s.decisions.length;
    const second = trigger();
    await settle(() => s.decisions.length > decisionsBeforeSecond && s.decisions.at(-1)?.req.kind === "optional");
    const retriedCost = s.decisions.at(-1)?.req;
    if (retriedCost?.kind !== "optional") throw new Error("Expected the optional CostGatedBlock gate again");
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: retriedCost.decisionId,
        response: { kind: "optional", accept: true },
      }),
    ).toEqual({ ok: true });
    await settle(() => {
      const latest = s.decisions.at(-1)?.req;
      return latest?.kind === "optional" && latest.decisionId !== retriedCost.decisionId;
    });
    const declineUse = s.decisions.at(-1)?.req;
    if (declineUse?.kind !== "optional") throw new Error("Expected the optional Option use");
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: declineUse.decisionId,
        response: { kind: "optional", accept: false },
      }),
    ).toEqual({ ok: true });
    await second;

    const decisionsBeforeThird = s.decisions.length;
    let thirdSettled = false;
    const third = trigger();
    void third.then(() => {
      thirdSettled = true;
    });
    await settle(() => thirdSettled);
    await third;
    expect(s.decisions).toHaveLength(decisionsBeforeThird);
    expect(s.state.players[0]!.trash).toContainEqual(
      expect.objectContaining({ instanceId: s.inst("cost").instanceId }),
    );
  });
});
