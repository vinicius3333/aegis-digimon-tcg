import { describe, expect, it } from "vitest";
import type { PlayerState } from "@aegis/shared";
import { drainMicrotasks, setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT6-068.js";

describe("BT6-068 Impmon", () => {
  it("may trash a hand card to return a Three Musketeers Digimon from trash", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          hand: [
            { card: "BT6-068", as: "source" },
            { card: "BT6-069", as: "discard" },
          ],
          trash: [
            { card: "BT6-017", as: "returned" },
            { card: "BT6-076", as: "unmatched" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferred },
    );
    const player = s.state.players[0] as PlayerState;
    preferred.push(s.inst("discard").instanceId, s.inst("returned").instanceId);
    s.state.memory = 3;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("source").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => player.hand.some((card) => card.instanceId === s.inst("returned").instanceId));
    expect(player.trash.map((card) => card.instanceId)).toContain(s.inst("discard").instanceId);
    expect(player.trash.map((card) => card.instanceId)).toContain(s.inst("unmatched").instanceId);
  });

  it("returns nothing when the optional hand trash is declined", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [
            { card: "BT6-068", as: "source" },
            { card: "BT6-069", as: "kept" },
          ],
          trash: [{ card: "BT6-017", as: "candidate" }],
        },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    s.state.memory = 3;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("source").instanceId })).toEqual({
      ok: true,
    });
    await drainMicrotasks();
    expect(s.events.some((event) => event.kind === "effectTriggered" && event.sourceCardId === "BT6-068")).toBe(false);

    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toContain(s.inst("kept").instanceId);
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toContain(s.inst("candidate").instanceId);
  });
});

describe("BT6-068 Impmon — KB Q&A rulings", () => {
  it("lets the player skip trashing a hand card, and then returns no Digimon from trash (Q1462)", async () => {
    const s = setupEngine({
      0: {
        hand: [
          { card: "BT6-068", as: "source" },
          { card: "BT6-069", as: "kept" },
        ],
        trash: [{ card: "BT6-017", as: "candidate" }],
      },
    });
    const player = s.state.players[0]!;
    s.state.memory = 3;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("source").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.pendingDecision?.seat === 0);
    const prompt = s.decisions.at(-1)!.req;
    expect(prompt.sourceCardId).toBe("BT6-068");
    expect(prompt.kind).toBe("optional");
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: prompt.decisionId,
        response: { kind: "optional", accept: false },
      }),
    ).toEqual({ ok: true });
    await drainMicrotasks();
    expect(s.events.some((event) => event.kind === "effectTriggered" && event.sourceCardId === "BT6-068")).toBe(false);

    expect(s.state.pendingDecision).toBeUndefined();
    expect(player.battleArea.map((permanent) => permanent.topCard.instanceId)).toContain(s.inst("source").instanceId);
    expect(player.hand.map((card) => card.instanceId)).toEqual([s.inst("kept").instanceId]);
    expect(player.trash.map((card) => card.instanceId)).toEqual([s.inst("candidate").instanceId]);
  });
});
