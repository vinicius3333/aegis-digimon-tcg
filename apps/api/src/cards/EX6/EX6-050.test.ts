import { EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./EX6-050.js";
import { observe } from "../../engine/testkit/observe.js";
import "./EX6-046.js";
import "./EX6-055.js";

describe("EX6-050 Feresmon", () => {
  it("has Blocker and gains memory/trashes the opponent's hand on digivolving/deletion based on hand size", () => {
    expect(compiled.effects?.find((entry) => !entry.isInherited)?.keywords?.[0]?.keyword).toBe("Blocker");
    expect(compiled.effects?.find((entry) => entry.trigger === "WhenDigivolving")?.actions).toMatchObject([
      { kind: "GainMemory", amount: 1, condition: { kind: "zoneCount", op: "lte", value: 5 } },
      { kind: "Trash", controller: "opponent", condition: { kind: "zoneCount", op: "gte", value: 7 } },
    ]);
  });
  it("inherits optional opponent hand trash, or plays a purple level 3 from trash if they decline", () =>
    expect(compiled.effects?.find((entry) => entry.isInherited)).toMatchObject({
      frequency: "OncePerTurn",
      actions: [
        { kind: "Trash", controller: "opponent", chooser: "opponent", optional: true },
        {
          kind: "PlayWithoutCost",
          from: ["trash"],
          payCost: false,
          optional: true,
          condition: { kind: "ifThisEffectDidNotAct" },
        },
      ],
    }));
  it("publicly gains 1 memory on digivolving while the opponent has five cards or fewer", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "EX6-050", as: "feres" }] } }, { autoAcceptOptional: true });
    await s.ready();
    s.state.memory = 0;
    await advance(s.engine).fire(EffectTiming.WhenDigivolving, s.perm("feres"));
    expect(s.state.memory).toBe(1);
  });
  it("publicly trashes one opponent hand card on digivolving at seven cards without gaining memory", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "EX6-050", as: "feres" }] },
        1: {
          hand: [
            { card: "BT1-010", as: "discarded" },
            "BT1-011",
            "BT1-012",
            "BT1-013",
            "BT1-014",
            "BT1-015",
            "BT1-016",
          ],
        },
      },
      { autoAcceptOptional: true },
    );
    s.state.memory = 0;
    await s.ready();
    const effect = advance(s.engine).fire(EffectTiming.WhenDigivolving, s.perm("feres"));
    await settle(() => s.state.pendingDecision?.kind === "selectCards");
    const decision = s.state.pendingDecision!;
    expect(decision.seat).toBe(1);
    expect(
      s.engine.applyIntent(1, {
        type: "respondDecision",
        decisionId: decision.decisionId,
        response: { kind: "selectCards", instanceIds: [s.inst("discarded").instanceId] },
      }),
    ).toEqual({ ok: true });
    await effect;
    await settle(() => s.state.players[1]!.hand.length === 6);
    expect(s.state.players[1]!.trash.some((card) => card.instanceId === s.inst("discarded").instanceId)).toBe(true);
    expect(s.state.players[1]!.hand).toHaveLength(6);
    expect(s.state.memory).toBe(0);
  });

  it("publicly attacks with Feresmon and accepts the opponent hand discard", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "EX6-055", as: "feres", under: ["EX6-050"] }] },
        1: { hand: [{ card: "BT1-010", as: "discard" }], security: ["BT1-014", "BT1-014", "BT1-014"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.turnSeat = 0;
    await s.ready();
    const attackerId = s.perm("feres").permanentId;
    expect(
      s.engine.applyIntent(0, { type: "attack", attackerPermanentId: attackerId, target: { kind: "player" } }),
    ).toEqual({ ok: true });
    await settle(() => !observe(s.engine).isAttacking());
    expect(s.state.players[1]!.trash.some((card) => card.instanceId === s.inst("discard").instanceId)).toBe(true);
    expect(s.state.players[1]!.trash.filter((card) => card.cardId === "BT1-014")).toHaveLength(2);
    expect(s.state.players[1]!.security).toHaveLength(1);
    expect(s.state.players[0]!.battleArea.some((perm) => perm.permanentId === attackerId)).toBe(true);
  });

  it("plays a purple level 3 from trash when the opponent refuses the discard", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX6-055", as: "feres", under: ["EX6-050"] }],
          trash: [{ card: "EX6-046", as: "revive" }],
        },
        1: { hand: [{ card: "BT1-010", as: "discard" }], security: ["BT1-014", "BT1-014", "BT1-014"] },
      },
      {},
    );
    s.state.turnSeat = 0;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("feres").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision?.kind === "selectCards");
    const discardDecision = s.state.pendingDecision!;
    expect(discardDecision.seat).toBe(1);
    expect(
      s.engine.applyIntent(1, {
        type: "respondDecision",
        decisionId: discardDecision.decisionId,
        response: { kind: "selectCards", instanceIds: [] },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision?.kind === "optional");
    const playDecision = s.state.pendingDecision!;
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: playDecision.decisionId,
        response: { kind: "optional", accept: true },
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        !s.state.pendingDecision &&
        s.state.players[0]!.battleArea.some((perm) => perm.topCard?.instanceId === s.inst("revive").instanceId),
    );
    expect(s.state.players[1]!.hand.map((card) => card.instanceId)).toEqual([s.inst("discard").instanceId]);
    expect(s.state.players[0]!.trash.some((card) => card.instanceId === s.inst("revive").instanceId)).toBe(false);
  });
});
