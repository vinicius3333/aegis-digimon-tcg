import { describe, expect, it } from "vitest";
import { EffectTiming } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { compiled } from "./EX9-073.js";
import "../index.js";

describe("EX9-073", () => {
  it.each([false, true])(
    "places a Ver.5-only card on real attack with Q4841 On Play suppression=%s",
    async (suppressed) => {
      const s = setupEngine(
        {
          0: { battleArea: [{ card: "EX9-073", as: "host" }], trash: ["EX9-041"] },
          1: {
            battleArea: [
              { card: "BT1-009", as: "target" },
              ...(suppressed ? [{ card: "BT20-037", as: "suppressor" }] : []),
            ],
            security: ["BT1-001"],
          },
        },
        { autoAcceptOptional: true, autoSelectCards: true, autoOrderTriggers: true },
      );
      await s.ready();
      if (suppressed) await advance(s.engine).fireForPermanent(EffectTiming.WhenDigivolving, s.perm("suppressor"));
      expect(observe(s.engine).timingEffectDisabled(s.perm("host"), "onPlay")).toBe(suppressed);
      expect(s.perm("target").isSuspended).toBe(false);
      expect(
        s.engine.applyIntent(0, {
          type: "attack",
          attackerPermanentId: s.perm("host").permanentId,
          target: { kind: "player" },
        }),
      ).toEqual({ ok: true });
      await settle();
      expect(observe(s.engine).isAttacking()).toBe(false);
      expect(s.state.pendingDecision).toBeUndefined();
      expect(s.perm("host").stack.map((card) => card.cardId)).toEqual(["EX9-041"]);
      expect(s.perm("host").stack[0]?.faceUp).toBe(true);
      expect(observe(s.engine).timingEffectDisabled(s.perm("host"), "onPlay")).toBe(suppressed);
      expect(s.state.players[0]!.trash).toHaveLength(0);
      expect(s.perm("target").isSuspended).toBe(!suppressed);
      expect(s.state.players[1]!.security).toHaveLength(0);
    },
  );
  it.each([
    { name: "two hidden cards", first: "BT1-048", second: "BT1-046", firstUp: false, secondUp: false, accept: true },
    { name: "hidden plus Cyborg", first: "BT1-048", second: "EX9-011", firstUp: false, secondUp: true, accept: true },
    { name: "two Cyborg cards", first: "BT16-054", second: "EX9-011", firstUp: true, secondUp: true, accept: true },
    { name: "explicit refusal", first: "BT1-048", second: "EX9-011", firstUp: false, secondUp: true, accept: false },
  ])("Q4842 real battle prevention: $name", async ({ first, second, firstUp, secondUp, accept }) => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT1-024", as: "attacker", dp: 15000 }] },
        1: {
          battleArea: [
            {
              card: "EX9-073",
              as: "host",
              suspended: true,
              under: [
                { card: first, faceUp: firstUp },
                { card: second, faceUp: secondUp },
              ],
            },
          ],
        },
      },
      { autoAcceptOptional: accept, autoSelectCards: true },
    );
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "permanent", permanentId: s.perm("host").permanentId },
      }),
    ).toEqual({ ok: true });
    if (!accept) {
      await settle(() => s.state.pendingDecision?.kind === "optional");
      const choice = s.state.pendingDecision!;
      const response = s.engine.applyIntent(1, {
        type: "respondDecision",
        decisionId: choice.decisionId,
        response: { kind: "optional", accept: false },
      });
      if (!response.ok) throw new Error("Expected the public refusal to be accepted");
    }
    await settle();
    expect(s.state.pendingDecision).toBeUndefined();
    expect(observe(s.engine).isAttacking()).toBe(false);
    expect(s.state.players[1]!.battleArea.map((card) => card.topCard.cardId)).toEqual(accept ? ["EX9-073"] : []);
    expect(s.state.players[1]!.battleArea[0]?.stack.length).toBe(accept ? 0 : undefined);
    expect(s.state.players[1]!.trash.map((card) => card.cardId).sort()).toEqual(
      (accept ? [first, second] : [first, second, "EX9-073"]).sort(),
    );
    expect(s.state.players[0]!.battleArea.map((card) => card.topCard.cardId)).toEqual(["BT1-024"]);
  });
  it("uses its shared effect on real DM digivolution, then does not use it again on attack", async () => {
    const options = {
      autoAcceptOptional: true,
      autoSelectCards: true,
      autoChooseOption: true,
      autoOrderTriggers: true,
      preferInstanceIds: [] as string[],
    };
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX9-030", as: "host" }],
          hand: [
            { card: "EX9-073", as: "evolution" },
            { card: "EX9-011", as: "placed" },
            { card: "EX9-011", as: "second" },
          ],
          trash: [{ card: "BT1-009", as: "hidden" }],
          deck: ["BT1-048"],
        },
        1: { security: ["BT1-001", "BT1-001"] },
      },
      options,
    );
    options.preferInstanceIds.push(s.inst("placed").instanceId, s.inst("hidden").instanceId);
    s.state.memory = 10;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        useAlternateCost: true,
        permanentId: s.perm("host").permanentId,
        instanceId: s.inst("evolution").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle();
    expect(s.perm("host").topCard.cardId).toBe("EX9-073");
    expect(s.perm("host").stack.map((card) => card.cardId)).toEqual(["BT1-009", "EX9-030", "EX9-011"]);
    expect(s.perm("host").stack[0]?.faceUp).toBe(false);
    expect(s.state.players[0]!.hand.map((card) => card.cardId)).toEqual(["EX9-011", "BT1-048"]);
    expect(s.state.memory).toBe(7);
    expect(s.state.pendingDecision).toBeUndefined();
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle();
    expect(observe(s.engine).isAttacking()).toBe(false);
    expect(s.state.pendingDecision).toBeUndefined();
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("second").instanceId)).toBe(true);
    expect(s.perm("host").stack.map((card) => card.cardId)).toEqual(["BT1-009", "EX9-030", "EX9-011"]);
    expect(s.state.players[1]!.security).toHaveLength(0);
  });
  it("once per turn activates the placed level-five Cyborg or Ver.5 card's On Play effect", () => {
    for (const trigger of ["OnPlay", "WhenDigivolving", "WhenAttacking"])
      expect(compiled.effects?.find((entry) => entry.trigger === trigger)).toMatchObject({
        frequency: "OncePerTurn",
        actions: [
          {
            kind: "ActivateEffect",
            effectType: "OnPlay",
            lastPlacedOnly: true,
            cost: { kind: "place", position: "top", target: { count: 1 } },
          },
        ],
      });
  });
  it("can prevent itself from leaving by trashing two bottom qualifying digivolution cards", () =>
    expect(compiled.effects?.find((entry) => entry.trigger === "AllTurns")).toMatchObject({
      actions: [
        {
          kind: "Replacement",
          event: "wouldLeavePlay",
          actions: [{ kind: "Prevent", cost: { kind: "trash", target: { count: 2 } } }],
        },
      ],
    }));
  it("prevents deletion by trashing exactly two bottom face-down qualifying cards", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            {
              card: "EX9-073",
              as: "source",
              under: [
                { card: "EX9-011", faceUp: false },
                { card: "EX9-011", faceUp: false },
              ],
            },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    expect(s.perm("source").stack).toHaveLength(2);
    expect(s.perm("source").stack.every((card) => card.faceUp === false)).toBe(true);
    await s.ready();

    await advance(s.engine).fireForPermanent(EffectTiming.None, s.perm("source"));
    expect(await advance(s.engine).verb.deletePermanent([s.perm("source").permanentId], "byEffect")).toBe(0);
    expect(s.state.players[0]!.battleArea).toHaveLength(1);
    expect(s.perm("source").stack).toHaveLength(0);
    expect(s.state.players[0]!.trash.filter((card) => card.cardId === "EX9-011")).toHaveLength(2);
  });
  it("plays Machinedramon from hand, places a level-five card and activates its On Play effect", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [
            { card: "EX9-073", as: "source" },
            { card: "EX9-011", as: "placed" },
          ],
          trash: ["BT1-009"],
        },
        1: { battleArea: [{ card: "EX9-007", as: "opponent" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoOrderTriggers: true },
    );
    s.state.memory = 10;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("source").instanceId })).toEqual({
      ok: true,
    });
    await settle();

    expect(s.perm("source").stack.map((card) => card.cardId)).toEqual(["BT1-009", "EX9-011"]);
    expect(s.perm("source").stack[0]?.faceUp).toBe(false);
    expect(s.perm("source").stack[1]?.faceUp).toBe(true);
    expect(s.state.pendingDecision).toBeUndefined();
    expect(s.state.players[1]!.battleArea).toHaveLength(0);
  });
});
