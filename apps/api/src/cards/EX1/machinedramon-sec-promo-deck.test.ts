import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "../BT1/BT1-114.js";
import "../P/P-033.js";
import "./EX1-048.js";
import "./EX1-049.js";
import "./EX1-050.js";
import "./EX1-073.js";

describe("Machinedramon SEC / promo Cyborg deck", () => {
  it("combines SEC MetalGreymon's DP inherited effect with promo Sunarizamon's threshold", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          {
            card: "EX1-073",
            as: "machinedramon",
            under: ["P-033", "BT1-114"],
          },
        ],
      },
      1: { security: ["BT1-001", "BT1-002"] },
    });
    await s.ready();
    await settle(
      () =>
        s.perm("machinedramon").currentDP === 14_000 &&
        observe(s.engine).keywordAmount(s.perm("machinedramon"), "SecurityAttack") === 1,
    );

    expect(s.perm("machinedramon").currentDP).toBe(14_000);
    expect(observe(s.engine).keywordAmount(s.perm("machinedramon"), "SecurityAttack")).toBe(1);
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("machinedramon").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.security.length === 0);

    expect(s.state.players[1]!.security).toHaveLength(0);
  });

  it("loads five distinct Cyborgs from hand and trash, then pays two deletion preventions", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [
            { card: "EX1-073", as: "machinedramon" },
            { card: "EX1-008", as: "metalGreymon" },
            { card: "EX1-048", as: "andromon" },
          ],
          trash: [
            { card: "EX1-049", as: "metalTyrannomon" },
            { card: "EX1-050", as: "metalMamemon" },
            { card: "BT1-114", as: "secMetalGreymon" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 12;

    expect(
      s.engine.applyIntent(0, {
        type: "playCard",
        instanceId: s.inst("machinedramon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        s.state.players[0]!.battleArea.some(
          (permanent) => permanent.topCard.cardId === "EX1-073" && permanent.stack.length === 5,
        ) && s.state.memory === 5,
    );

    const machine = s.state.players[0]!.battleArea.find((permanent) => permanent.topCard.cardId === "EX1-073")!;
    expect(new Set(machine.stack.map((card) => card.cardId)).size).toBe(5);
    expect(s.state.memory).toBe(5);

    // The prevention is a continuous install, so it exists only after a recompute.
    await s.engine.recomputeContinuousEffects();
    // Each prevention pays two digivolution cards on a continuation of the deletion consult.
    await advance(s.engine).verb.deletePermanent([machine.permanentId], "byEffect");
    await settle(() => machine.stack.length === 3, 5000);
    expect(machine.stack).toHaveLength(3);
    await advance(s.engine).verb.deletePermanent([machine.permanentId], "byEffect");
    await settle(() => machine.stack.length === 1, 5000);
    expect(machine.stack).toHaveLength(1);
    await advance(s.engine).verb.deletePermanent([machine.permanentId], "byEffect");
    await settle(() => s.state.players[0]!.battleArea.length === 0, 5000);

    expect(s.state.players[0]!.battleArea).toHaveLength(0);
  });

  it("shows hand and trash duplicates but refuses loading two copies with the same card number", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [
            { card: "EX1-073", as: "machinedramon" },
            { card: "EX1-048", as: "andromonHand" },
            { card: "EX1-049", as: "metalTyrannomon" },
          ],
          trash: [
            { card: "EX1-048", as: "andromonTrash" },
            { card: "EX1-050", as: "metalMamemon" },
          ],
        },
      },
      { autoAcceptOptional: true },
    );
    s.state.memory = 12;

    expect(
      s.engine.applyIntent(0, {
        type: "playCard",
        instanceId: s.inst("machinedramon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision?.kind === "selectCards");

    const selection = s.decisions.find(({ req }) => req.kind === "selectCards")!.req;
    expect(selection.sourceCardId).toBe("EX1-073");
    expect(selection.options?.distinctCardIds).toBe(true);
    expect(selection.options?.visibleCards).toEqual([
      { instanceId: s.inst("andromonHand").instanceId, cardId: "EX1-048" },
      { instanceId: s.inst("metalTyrannomon").instanceId, cardId: "EX1-049" },
      { instanceId: s.inst("andromonTrash").instanceId, cardId: "EX1-048" },
      { instanceId: s.inst("metalMamemon").instanceId, cardId: "EX1-050" },
    ]);

    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: selection.decisionId,
        response: {
          kind: "selectCards",
          instanceIds: [s.inst("andromonHand").instanceId, s.inst("andromonTrash").instanceId],
        },
      }),
    ).toEqual({ ok: false, reason: "decision-pending" });
    expect(s.state.pendingDecision?.decisionId).toBe(selection.decisionId);

    const validSelection = [
      s.inst("andromonHand").instanceId,
      s.inst("metalTyrannomon").instanceId,
      s.inst("metalMamemon").instanceId,
    ];
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: selection.decisionId,
        response: { kind: "selectCards", instanceIds: validSelection },
      }),
    ).toEqual({ ok: true });
    await settle(() => {
      const machine = s.state.players[0]!.battleArea.find((permanent) => permanent.topCard.cardId === "EX1-073");
      return machine?.stack.length === 3 && s.state.memory === 3;
    });

    const machine = s.state.players[0]!.battleArea.find((permanent) => permanent.topCard.cardId === "EX1-073")!;
    expect(machine.stack.map((card) => card.instanceId)).toEqual(expect.arrayContaining(validSelection));
    expect(machine.stack).toHaveLength(validSelection.length);
    expect(s.state.players[0]!.trash.some((card) => card.instanceId === s.inst("andromonTrash").instanceId)).toBe(true);
  });
});
