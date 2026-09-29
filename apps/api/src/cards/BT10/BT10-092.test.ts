import { describe, expect, it } from "vitest";
import { EffectTiming } from "@aegis/shared";
import type { PlayerState } from "@aegis/shared";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { advance } from "../../engine/testkit/advance.js";
import { observe } from "../../engine/testkit/observe.js";
import "./BT10-092.js";

describe("BT10-092 Nene Amano", () => {
  it("adds an eligible Twilight card from four revealed cards", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "BT10-092", as: "source" }],
          deck: [{ card: "BT10-061", as: "eligible" }, "BT10-062", "BT10-064", "BT10-065"],
        },
      },
      { autoSelectCards: true },
    );
    const player = s.state.players[0] as PlayerState;
    s.state.memory = 3;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("source").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => player.hand.some((c) => c.instanceId === s.inst("eligible").instanceId));
    expect(player.deck).toHaveLength(3);
  });

  it("grants Blocker to every DarkKnightmon and Twilight Digimon only on the opponent's turn", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "BT10-092", as: "nene" },
          { card: "BT10-066", as: "darkKnightmon" },
          { card: "BT10-061", as: "twilight" },
          { card: "BT1-009", as: "unrelated" },
        ],
      },
    });

    await s.ready();
    expect(observe(s.engine).hasKeyword(s.perm("darkKnightmon"), "Blocker")).toBe(false);

    s.state.turnSeat = 1;
    await s.engine.recomputeContinuousEffects();

    expect(observe(s.engine).hasKeyword(s.perm("darkKnightmon"), "Blocker")).toBe(true);
    expect(observe(s.engine).hasKeyword(s.perm("twilight"), "Blocker")).toBe(true);
    expect(observe(s.engine).hasKeyword(s.perm("unrelated"), "Blocker")).toBe(false);
  });

  it("gains two memory when deleted and plays itself from security without cost", async () => {
    const deleted = setupEngine({ 0: { battleArea: [{ card: "BT10-092", as: "nene" }] } });
    deleted.state.memory = 0;
    await advance(deleted.engine).verb.deletePermanent([deleted.perm("nene").permanentId]);
    await settle(() => deleted.state.players[0]!.trash.some((card) => card.cardId === "BT10-092"));
    expect(deleted.state.memory).toBe(2);

    const security = setupEngine({ 0: { security: [{ card: "BT10-092", as: "securityNene", faceUp: true }] } });
    security.state.memory = 0;
    await advance(security.engine).fireForInstance(EffectTiming.SecuritySkill, security.inst("securityNene"));
    await settle(() =>
      security.state.players[0]!.battleArea.some((permanent) => permanent.topCard.cardId === "BT10-092"),
    );
    expect(security.state.memory).toBe(0);
  });
});

describe("BT10-092 Nene Amano — KB Q&A rulings", () => {
  it("places the revealed cards not added to hand at the bottom of the deck in the order the player chooses (Q2023)", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "BT10-092", as: "nene" }],
          deck: [
            { card: "BT10-061", as: "added" },
            { card: "BT1-009", as: "firstRest" },
            { card: "BT1-013", as: "secondRest" },
            { card: "BT1-010", as: "thirdRest" },
            { card: "BT1-011", as: "unrevealedUpper" },
            { card: "BT1-012", as: "unrevealedLower" },
          ],
        },
      },
      { autoSelectCards: true, autoOrderCards: false },
    );
    s.state.memory = 3;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("nene").instanceId })).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision?.kind === "orderCards");

    const offered = s.decisions.at(-1)!.req.options?.candidateInstanceIds ?? [];
    const restIds = [s.inst("firstRest").instanceId, s.inst("secondRest").instanceId, s.inst("thirdRest").instanceId];
    expect([...offered].sort()).toEqual([...restIds].sort());
    const chosenOrder = [...restIds].reverse();
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: s.state.pendingDecision!.decisionId,
        response: { kind: "orderCards", order: chosenOrder },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.deck.length === 5);

    const player = s.state.players[0] as PlayerState;
    expect(player.hand.map(({ instanceId }) => instanceId)).toEqual([s.inst("added").instanceId]);
    expect(player.deck.map(({ instanceId }) => instanceId)).toEqual([
      s.inst("unrevealedUpper").instanceId,
      s.inst("unrevealedLower").instanceId,
      ...chosenOrder,
    ]);
  });
});
