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
    // Pin the declaration contract independently of payload choices.
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

  it("15-8-4-4-1: declaring a payable condition commits its payment before optional evolution", async () => {
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
      // Complete the optional evolution refusal through the public intent.
      await finishOptional(s);
    }
    expect(s.perm("renamon").stack).toHaveLength(3);
    expect(s.perm("renamon").topCard.cardId).toBe("BT17-031");
    expect(s.state.players[0]!.hand.map(({ cardId }) => cardId)).toContain("BT17-038");
    expect(s.state.memory).toBe(4);
  });
  it.each([true, false])(
    "Henry pays his declared condition independently of evolution availability: destination=%s",
    async (withDestination) => {
      cite(
        "comprehensive-0170",
        "15-7-5 permits Henry placements without a subsequent evolution destination",
        "6cf99208432c9ac35794ee0edd04b5e68067edccb3fc5de44d96cfe768ce2c97",
      );
      const s = setupEngine(
        {
          0: {
            battleArea: [
              { card: "ST17-02", as: "host" },
              { card: "ST17-10", as: "henry" },
            ],
            trash: [
              { card: "ST17-05", as: "gargomon" },
              { card: "ST17-07", as: "rapidmon" },
            ],
            hand: withDestination ? [{ card: "ST17-08", as: "mega" }] : [],
          },
        },
        { autoSelectCards: true },
      );
      await s.ready();
      s.state.memory = 10;
      const paymentIds = [s.inst("henry").instanceId, s.inst("gargomon").instanceId, s.inst("rapidmon").instanceId];
      const source = observe(s.engine).cardSource(s.perm("henry"));
      const effect = effectsOf(EffectTiming.OnDeclaration, source).find((entry) =>
        entry.effectKey.startsWith("ST17-10/"),
      );
      if (!effect) throw new Error("Missing Henry Main activation");
      try {
        expect(
          s.engine.applyIntent(0, {
            type: "activateEffect",
            sourceInstanceId: paymentIds[0]!,
            effectKey: effect.effectKey,
          }),
        ).toEqual({ ok: true });
        await settle(() =>
          withDestination
            ? s.state.pendingDecision?.kind === "optional"
            : s.perm("host").stack.length === 3 && s.state.pendingDecision === undefined,
        );
        expect(s.perm("host").stack.map(({ instanceId }) => instanceId)).toEqual(expect.arrayContaining(paymentIds));
        expect(s.state.players[0]!.trash).toHaveLength(0);
        expect(s.state.players[0]!.battleArea.some(({ topCard }) => topCard.instanceId === paymentIds[0])).toBe(false);
      } finally {
        await finishOptional(s);
      }
      expect(s.perm("host").topCard.cardId).toBe("ST17-02");
      expect(s.perm("host").stack).toHaveLength(3);
      expect(s.state.memory).toBe(10);
      expect(observe(s.engine).hasKeyword(s.perm("host"), "Rush")).toBe(false);
      expect(s.state.players[0]!.hand.map(({ cardId }) => cardId)).toEqual(withDestination ? ["ST17-08"] : []);
    },
  );
  it.each(
    [
      { tamer: "ST17-10", host: "ST17-02", first: "ST17-05", second: "ST17-07" },
      { tamer: "BT17-085", host: "BT17-031", first: "BT17-032", second: "BT17-035" },
    ].flatMap((card) =>
      [
        [0, 1, 2],
        [0, 2, 1],
        [1, 0, 2],
        [1, 2, 0],
        [2, 0, 1],
        [2, 1, 0],
      ].map((permutation) => ({ ...card, permutation })),
    ),
  )(
    "$tamer publicly orders its complete unpaid placement batch: $permutation",
    async ({ tamer, host, first, second, permutation }) => {
      const s = setupEngine(
        {
          0: {
            battleArea: [
              { card: tamer, as: "tamer" },
              { card: host, as: "host", under: [{ card: "BT1-009", as: "existing" }] },
            ],
            trash: [
              { card: first, as: "first" },
              { card: second, as: "second" },
            ],
          },
        },
        { autoSelectCards: true, autoOrderCards: false },
      );
      await s.ready();
      s.state.memory = 10;
      const ids = [s.inst("tamer").instanceId, s.inst("first").instanceId, s.inst("second").instanceId];
      const existingId = s.inst("existing").instanceId;
      const source = observe(s.engine).cardSource(s.perm("tamer"));
      const effect = effectsOf(EffectTiming.OnDeclaration, source).find((entry) =>
        entry.effectKey.startsWith(`${tamer}/`),
      );
      if (!effect) throw new Error("Missing ordered placement declaration");
      expect(
        s.engine.applyIntent(0, { type: "activateEffect", sourceInstanceId: ids[0]!, effectKey: effect.effectKey }),
      ).toEqual({ ok: true });
      await settle(() => s.state.pendingDecision?.kind === "orderCards");
      const decision = s.state.pendingDecision!;
      expect(
        s.decisions.find(({ req }) => req.kind === "orderCards" && req.sourceCardId === tamer)?.req.options
          ?.candidateInstanceIds,
      ).toEqual(ids);
      expect(s.perm("tamer").topCard.instanceId).toBe(ids[0]);
      expect(s.state.players[0]!.trash.map(({ instanceId }) => instanceId)).toEqual(ids.slice(1));
      expect(s.perm("host").stack.map(({ instanceId }) => instanceId)).toEqual([existingId]);
      for (const invalidOrder of [ids.slice(1), [ids[0]!, ids[0]!, ids[2]!], ["forged-material", ids[1]!, ids[2]!]]) {
        expect(
          s.engine.applyIntent(0, {
            type: "respondDecision",
            decisionId: decision.decisionId,
            response: { kind: "orderCards", order: invalidOrder },
          }).ok,
        ).toBe(false);
        expect(s.state.pendingDecision?.decisionId).toBe(decision.decisionId);
        expect(s.perm("tamer").topCard.instanceId).toBe(ids[0]);
        expect(s.state.players[0]!.trash.map(({ instanceId }) => instanceId)).toEqual(ids.slice(1));
        expect(s.perm("host").stack.map(({ instanceId }) => instanceId)).toEqual([existingId]);
      }
      const chosenOrder = permutation.map((index) => ids[index]!);
      expect(
        s.engine.applyIntent(0, {
          type: "respondDecision",
          decisionId: decision.decisionId,
          response: { kind: "orderCards", order: chosenOrder },
        }),
      ).toEqual({ ok: true });
      await settle(() => s.state.pendingDecision === undefined && s.perm("host").stack.length === 4);
      expect(s.perm("host").stack.map(({ instanceId }) => instanceId)).toEqual([...chosenOrder, existingId]);
      expect(s.state.players[0]!.trash).toHaveLength(0);
      expect(s.state.players[0]!.battleArea).toHaveLength(1);
      expect(s.perm("host").topCard.cardId).toBe(host);
      expect(s.state.memory).toBe(10);
    },
  );
});
