import { EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./ST14-11.js";

describe("ST14-11 Ai & Mako", () => {
  it("suspends, returns a hand card to the deck, and gains memory after a purple digivolution", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "ST14-11", as: "tamer" },
            { card: "BT12-085", as: "purple" },
          ],
          hand: [{ card: "BT1-009", as: "cost-card" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 0;
    await advance(s.engine).fireSubTrigger("whenOneOfYoursDigivolves", {
      subjectPermanentId: s.perm("purple").permanentId,
    });
    await settle(() => s.state.memory === 1 && s.state.players[0]!.hand.length === 0);
    expect(s.perm("tamer").isSuspended).toBe(true);
    expect(s.state.memory).toBe(1);
    expect(s.state.players[0]!.hand).toHaveLength(0);
    expect(s.state.players[0]!.deck[0]!.instanceId).toBe(s.inst("cost-card").instanceId);
  });

  it("still suspends and gains memory with an empty hand", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "ST14-11", as: "tamer" },
            { card: "BT12-085", as: "purple" },
          ],
        },
      },
      { autoAcceptOptional: true },
    );
    await s.ready();
    await advance(s.engine).fireSubTrigger("whenOneOfYoursDigivolves", {
      subjectPermanentId: s.perm("purple").permanentId,
    });
    await settle();
    expect(s.perm("tamer").isSuspended).toBe(true);
    expect(s.state.memory).toBe(1);
  });

  it("reveals four on play and adds one Evil Digimon", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "ST14-11", as: "tamer" }],
          deck: ["ST14-02", "BT1-009", "BT1-010", "BT1-011"],
        },
      },
      { autoSelectCards: true, autoOrderCards: true },
    );
    s.state.memory = 10;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("tamer").instanceId })).toEqual({ ok: true });
    await settle(() => s.decisions.some(({ req }) => req.kind === "orderCards"));
    await settle(() => s.state.pendingDecision === undefined && s.state.players[0]!.deck.length === 3);
    expect(s.state.players[0]!.hand.some(({ cardId }) => cardId === "ST14-02")).toBe(true);
    expect(s.state.players[0]!.deck).toHaveLength(3);
  });

  it("plays itself from security without paying the cost", async () => {
    const s = setupEngine({ 0: { security: [{ card: "ST14-11", as: "security-tamer" }] } });
    await advance(s.engine).fireForInstance(EffectTiming.SecuritySkill, s.inst("security-tamer"));
    await settle(() => s.state.players[0]!.battleArea.some(({ topCard }) => topCard?.cardId === "ST14-11"));
    expect(s.state.memory).toBe(0);
  });
});
