import { describe, expect, it } from "vitest";
import { EffectTiming } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { compiled } from "./EX9-073.js";
import "../index.js";

describe("EX9-073", () => {
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
  it("places a level-five card from hand and activates its On Play effect", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX9-073", as: "source" }],
          hand: [{ card: "EX9-011", as: "placed" }],
          trash: ["BT1-009"],
        },
        1: { battleArea: [{ card: "EX9-007", as: "opponent" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoOrderTriggers: true },
    );
    await s.ready();

    await advance(s.engine).fireForPermanent(EffectTiming.OnPlay, s.perm("source"));

    expect(s.perm("source").stack.map((card) => card.cardId)).toEqual(["BT1-009", "EX9-011"]);
    expect(s.perm("source").stack[0]?.faceUp).toBe(false);
    expect(s.perm("source").stack[1]?.faceUp).toBe(true);
  });
});
