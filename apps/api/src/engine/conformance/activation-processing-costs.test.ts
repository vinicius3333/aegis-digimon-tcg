import { beforeEach, describe, expect, it } from "vitest";
import { EffectTiming } from "@aegis/shared";
import { effectsOf } from "../effects/collect.js";
import { observe } from "../testkit/observe.js";
import { setupEngine, settle } from "../testkit/harness.js";
import { cite } from "./_kb.js";
import "../../cards/index.js";

function rikaFixture(withDestination: boolean, autoAcceptOptional: boolean) {
  return setupEngine(
    {
      0: {
        battleArea: [
          { card: "BT17-085", as: "rika" },
          { card: "BT17-031", as: "renamon" },
        ],
        trash: [
          { card: "BT17-032", as: "kyubimon" },
          { card: "BT17-035", as: "taomon" },
        ],
        hand: withDestination ? [{ card: "BT17-038", as: "sakuyamon" }] : [],
      },
    },
    { autoSelectCards: true, autoAcceptOptional },
  );
}

function declareRika(s: ReturnType<typeof rikaFixture>) {
  const source = observe(s.engine).cardSource(s.perm("rika"));
  const effect = effectsOf(EffectTiming.OnDeclaration, source).find((entry) => entry.effectKey.startsWith("BT17-085/"));
  if (effect === undefined) throw new Error("Missing Rika Main activation");
  return s.engine.applyIntent(0, {
    type: "activateEffect",
    sourceInstanceId: s.perm("rika").topCard.instanceId,
    effectKey: effect.effectKey,
  });
}

async function finishOptional(s: ReturnType<typeof rikaFixture>) {
  const pending = s.state.pendingDecision;
  if (pending?.kind !== "optional") return;
  const refusal = s.engine.applyIntent(0, {
    type: "respondDecision",
    decisionId: pending.decisionId,
    response: { kind: "optional", accept: false },
  });
  if (!refusal.ok) throw new Error("Failed to finish the pending processing refusal");
  await settle(() => s.state.pendingDecision === undefined);
}

describe("declared optional processing conditions", () => {
  beforeEach(() => {
    // Hook failures remain real failures even for the unresolved it.fails proof.
    cite(
      "comprehensive-0176",
      "Activation-type optional processing conditions must be performable when declared and must be performed after declaration",
      "f685a1a969a75e944c958f0cac3704d0c228231ee3865752f6ac20c4b0b49182",
    );
  });
  it.each([true, false])(
    "Option use with no evolution destination keeps its processing choice optional: accept=%s",
    async (accept) => {
      cite(
        "comprehensive-0170",
        "15-7-5 permits payable processing without subsequent content; Option-use processing is not a Main ability declaration",
        "6cf99208432c9ac35794ee0edd04b5e68067edccb3fc5de44d96cfe768ce2c97",
      );
      const s = setupEngine(
        {
          0: {
            battleArea: [{ card: "BT14-007", as: "agumon" }],
            hand: [{ card: "BT14-090", as: "option" }],
            trash: [
              { card: "BT14-012", as: "greymon" },
              { card: "BT14-014", as: "metalgreymon" },
            ],
          },
        },
        { autoSelectCards: true },
      );
      s.state.memory = 10;
      await s.ready();
      const optionId = s.inst("option").instanceId;
      const materialIds = [s.inst("greymon").instanceId, s.inst("metalgreymon").instanceId];
      expect(s.engine.applyIntent(0, { type: "playCard", instanceId: optionId })).toEqual({ ok: true });
      await settle(() => s.state.pendingDecision?.kind === "optional");
      const choice = s.state.pendingDecision!;
      expect(
        s.engine.applyIntent(0, {
          type: "respondDecision",
          decisionId: choice.decisionId,
          response: { kind: "optional", accept },
        }),
      ).toEqual({ ok: true });
      await settle(
        () =>
          s.state.pendingDecision === undefined &&
          s.state.players[0]!.trash.some(({ instanceId }) => instanceId === optionId),
      );
      expect(s.perm("agumon").topCard.cardId).toBe("BT14-007");
      const expectedStack = accept ? materialIds : [];
      expect(s.perm("agumon").stack.map(({ instanceId }) => instanceId)).toEqual(expect.arrayContaining(expectedStack));
      expect(s.perm("agumon").stack).toHaveLength(accept ? 2 : 0);
      expect(s.state.players[0]!.trash.map(({ instanceId }) => instanceId)).toEqual(
        accept ? [optionId] : [...materialIds, optionId],
      );
      expect(s.state.memory).toBe(6);
    },
  );

  it("15-7-5: payable placement may be declared without a subsequent evolution card", async () => {
    cite(
      "comprehensive-0170",
      "Optional processing conditions may be executed even when their subsequent content cannot be executed",
      "6cf99208432c9ac35794ee0edd04b5e68067edccb3fc5de44d96cfe768ce2c97",
    );
    const s = rikaFixture(false, true);
    s.state.memory = 4;
    await s.ready();
    const rikaId = s.perm("rika").topCard.instanceId;
    const materialIds = [s.inst("kyubimon").instanceId, s.inst("taomon").instanceId];
    expect(declareRika(s)).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision === undefined && s.perm("renamon").stack.length === 3);
    expect(s.perm("renamon").stack.map(({ instanceId }) => instanceId)).toEqual(
      expect.arrayContaining([rikaId, ...materialIds]),
    );
    expect(s.perm("renamon").topCard.cardId).toBe("BT17-031");
    expect(s.state.players[0]!.trash).toHaveLength(0);
    expect(s.state.players[0]!.battleArea.some(({ topCard }) => topCard.instanceId === rikaId)).toBe(false);
    expect(s.state.memory).toBe(4);
  });

  it.fails("15-8-4-4-1: declaring a payable condition commits its payment before optional evolution", async () => {
    const s = rikaFixture(true, false);
    s.state.memory = 4;
    await s.ready();
    const rikaId = s.perm("rika").topCard.instanceId;
    const materialIds = [s.inst("kyubimon").instanceId, s.inst("taomon").instanceId];
    try {
      expect(declareRika(s)).toEqual({ ok: true });
      await settle(() => s.state.pendingDecision?.kind === "optional");
      expect(s.perm("renamon").stack.map(({ instanceId }) => instanceId)).toEqual(
        expect.arrayContaining([rikaId, ...materialIds]),
      );
      expect(s.state.players[0]!.trash).toHaveLength(0);
      expect(s.state.players[0]!.battleArea.some(({ topCard }) => topCard.instanceId === rikaId)).toBe(false);
    } finally {
      // Finish the public refusal even while the expected contract assertion is red.
      await finishOptional(s);
    }
  });
});
