import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { observe } from "../../engine/testkit/observe.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "../index.js";

describe("ST12-12 Sistermon Blanc", () => {
  it("may trash 1 hand card to draw exactly 2 and gains Decoy with Huckmon in play", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: ["ST12-04"],
          hand: [
            { card: "ST12-12", as: "blanc" },
            { card: "BT1-001", as: "cost" },
          ],
          deck: ["BT1-002", "BT1-003"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoOrderTriggers: true },
    );
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("blanc").instanceId })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.deck.length === 0);
    expect(s.state.players[0]!.hand).toHaveLength(2);
    expect(s.state.players[0]!.trash.some((c) => c.instanceId === s.inst("cost").instanceId)).toBe(true);
    const blanc = s.state.players[0]!.battleArea.find((p) => p.topCard.cardId === "ST12-12")!;
    expect(observe(s.engine).hasKeyword(blanc, "Decoy")).toBe(true);
    expect([...blanc.keywords]).toContain("Decoy");
  });

  it("may refuse the trash cost and does not draw", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [
            { card: "ST12-12", as: "blanc" },
            { card: "BT1-001", as: "cost" },
          ],
          deck: ["BT1-002", "BT1-003"],
        },
      },
      { autoOrderTriggers: true },
    );
    const costId = s.inst("cost").instanceId;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("blanc").instanceId })).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision?.kind === "selectCards");
    const pending = s.state.pendingDecision!;
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: pending.decisionId,
        response: { kind: "selectCards", instanceIds: [] },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision === undefined);
    expect(s.state.players[0]!.deck).toHaveLength(2);
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === costId)).toBe(true);
  });

  it("uses Decoy Red/Black to redirect an actual opponent-effect deletion", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: ["ST12-04", { card: "ST12-12", as: "blanc" }, { card: "ST12-10", as: "target" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoOrderTriggers: true },
    );
    await s.ready();
    s.state.turnSeat = 1;
    const removed = await advance(s.engine).verb.deletePermanent([s.perm("target").permanentId], "byEffect");

    expect(removed).toBe(0);
    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.cardId === "ST12-10")).toBe(true);
    expect(s.state.players[0]!.trash.some((card) => card.cardId === "ST12-12")).toBe(true);
  });

  it("does not protect a non-red/non-black Digimon with Decoy", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: ["ST12-04", { card: "ST12-12", as: "blanc" }, { card: "BT1-029", as: "blueTarget" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoOrderTriggers: true },
    );
    await s.ready();
    s.state.turnSeat = 1;
    const removed = await advance(s.engine).verb.deletePermanent([s.perm("blueTarget").permanentId], "byEffect");

    expect(removed).toBe(1);
    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.cardId === "BT1-029")).toBe(false);
    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.cardId === "ST12-12")).toBe(true);
  });
});

describe("ST12-12 Sistermon Blanc — KB Q&A rulings", () => {
  it("may choose not to trash a hand card, and then does not draw 2 (Q758)", async () => {
    async function playBlanc(trashCost: boolean) {
      const s = setupEngine(
        {
          0: {
            hand: [
              { card: "ST12-12", as: "blanc" },
              { card: "BT1-001", as: "cost" },
            ],
            deck: ["BT1-002", "BT1-003", "BT1-004"],
          },
        },
        { autoOrderTriggers: true },
      );
      s.state.memory = 3;
      expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("blanc").instanceId })).toEqual({
        ok: true,
      });
      await settle(() => s.state.pendingDecision !== undefined);
      while (s.state.pendingDecision !== undefined) {
        const pending = s.state.pendingDecision;
        const response =
          pending.kind === "optional"
            ? { kind: "optional" as const, accept: trashCost }
            : { kind: "selectCards" as const, instanceIds: trashCost ? [s.inst("cost").instanceId] : [] };
        expect(s.engine.applyIntent(0, { type: "respondDecision", decisionId: pending.decisionId, response })).toEqual({
          ok: true,
        });
        await settle(() => s.state.pendingDecision?.decisionId !== pending.decisionId);
      }
      return s;
    }

    const declined = await playBlanc(false);
    expect(declined.state.players[0]!.deck).toHaveLength(3);
    expect(Array.from(declined.state.players[0]!.hand, (card) => card.instanceId)).toEqual([
      declined.inst("cost").instanceId,
    ]);
    expect(declined.state.players[0]!.trash).toHaveLength(0);

    const accepted = await playBlanc(true);
    expect(accepted.state.players[0]!.deck).toHaveLength(1);
    expect(accepted.state.players[0]!.hand).toHaveLength(2);
    expect(accepted.state.players[0]!.trash.some((card) => card.instanceId === accepted.inst("cost").instanceId)).toBe(
      true,
    );
  });
});
