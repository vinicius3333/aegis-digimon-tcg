import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { EffectTiming } from "@aegis/shared";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./index.js";
import { compiled } from "./BT20-007.js";

describe("BT20-007 Dracomon", () => {
  it("requires the printed hand trash cost and resolves draw plus memory", () => {
    const main = compiled.effects.find((entry) => entry.trigger === "StartOfYourMainPhase");
    expect(main?.actions).toHaveLength(2);
    expect(main?.actions[0]).toMatchObject({ kind: "Draw", amount: 1, cost: { kind: "trash" } });
    expect(main?.actions[0]).toMatchObject({ optional: true, abortOnDecline: true });
    expect(main?.actions[1]).toMatchObject({ kind: "GainMemory", amount: 1 });
    expect(main?.actions[1]?.optional).not.toBe(true);
    expect(compiled.digivolutionRequirement).toContainEqual({ names: ["Bebydomon"], cost: 0, isAlternate: true });
  });

  it("pays the matching text cost before drawing and gaining memory, and may decline the whole effect", async () => {
    const accepted = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT20-007", as: "dracomon" }],
          hand: [
            { card: "BT20-023", as: "dracomonText" },
            { card: "BT20-010", as: "nonMatch" },
          ],
          deck: [{ card: "BT20-011", as: "drawn" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await advance(accepted.engine).fire(EffectTiming.OnStartMainPhase, accepted.perm("dracomon"));
    expect(accepted.state.players[0]!.trash.map((card) => card.instanceId)).toContain(
      accepted.inst("dracomonText").instanceId,
    );
    expect(accepted.state.players[0]!.hand.map((card) => card.instanceId)).toContain(
      accepted.inst("nonMatch").instanceId,
    );
    expect(accepted.state.players[0]!.hand.map((card) => card.instanceId)).toContain(accepted.inst("drawn").instanceId);
    expect(accepted.state.memory).toBe(1);

    const declined = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT20-007", as: "dracomon" }],
          hand: [{ card: "BT20-023", as: "cost" }],
          deck: [{ card: "BT20-011", as: "top" }],
        },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    await advance(declined.engine).fire(EffectTiming.OnStartMainPhase, declined.perm("dracomon"));
    expect(declined.state.players[0]!.hand.map((card) => card.instanceId)).toContain(declined.inst("cost").instanceId);
    expect(declined.state.players[0]!.deck.map((card) => card.instanceId)).toContain(declined.inst("top").instanceId);
    expect(declined.state.memory).toBe(0);
  });

  it("observably gives its inherited host +2000 DP only on its controller's turn", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT20-012", dp: 4000, as: "host", under: ["BT20-002", "BT20-007"] }] },
    });
    await s.ready();
    expect(s.perm("host").currentDP).toBe(6000);
    s.state.turnSeat = 1;
    await advance(s.engine).recompute();
    expect(s.perm("host").currentDP).toBe(4000);
  });

  it("resolves Start of Main Phase through the natural turn lifecycle", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT20-007", as: "dracomon" }],
          hand: [{ card: "BT20-023", as: "payment" }],
          deck: [
            { card: "BT20-010", as: "turnDraw" },
            { card: "BT20-011", as: "effectDraw" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    const turn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(0);
    await settle(() => s.state.players[0]!.trash.some((card) => card.instanceId === s.inst("payment").instanceId));
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toContain(s.inst("turnDraw").instanceId);
    expect(s.state.players[0]!.deck.map((card) => card.instanceId)).toContain(s.inst("effectDraw").instanceId);
    expect(s.state.memory).toBe(1);
    advance(s.engine).endMainPhaseIfOpen(0);
    await turn;
  });

  it("reaches Dracomon from a Bebydomon egg through a public evolution intent", async () => {
    const s = setupEngine({
      0: { breeding: { card: "BT20-002", as: "bebydomon" }, hand: [{ card: "BT20-007", as: "dracomon" }] },
    });
    await s.ready();
    const result = s.engine.applyIntent(0, {
      type: "digivolve",
      permanentId: s.perm("bebydomon").permanentId,
      instanceId: s.inst("dracomon").instanceId,
    });
    expect(result).toEqual({ ok: true });
    await settle(() => s.perm("bebydomon").topCard.cardId === "BT20-007");
    expect(s.perm("bebydomon").topCard.cardId).toBe("BT20-007");
  });
});
