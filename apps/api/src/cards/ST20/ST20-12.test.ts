import { describe, expect, it } from "vitest";
import { EffectTiming } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./ST20-12.js";
import "./ST20-13.js";

describe("ST20-12 Sora & Kari", () => {
  it("gains memory at the start of the main phase when an Adventure Digimon is present", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "ST20-12", as: "tamer" }, "ST20-07"] } });
    s.state.memory = 0;
    await advance(s.engine).fire(EffectTiming.OnStartMainPhase, s.perm("tamer"));
    expect(s.state.memory).toBe(1);
  });

  it("reduces an Adventure Digimon's play cost by suspending this Tamer", async () => {
    const s = setupEngine(
      { 0: { battleArea: [{ card: "ST20-12", as: "tamer" }], hand: [{ card: "ST20-07", as: "adventure" }] } },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.turnSeat = 0;
    s.state.memory = 5;
    await s.ready();
    await s.engine.recomputeContinuousEffects();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("adventure").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.battleArea.some((p) => p.topCard.cardId === "ST20-07"));
    expect(s.state.memory).toBe(3);
    expect(s.perm("tamer").isSuspended).toBe(true);
  });

  it("stacks the reduction with ST20-13 and plays itself from security", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "ST20-12", as: "sora" },
            { card: "ST20-13", as: "tai" },
          ],
          hand: [{ card: "ST20-07", as: "adventure" }],
          security: [{ card: "ST20-12", as: "securitySora" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 5;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("adventure").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.battleArea.some((p) => p.topCard.cardId === "ST20-07"));
    expect(s.state.memory).toBe(4);
    expect(s.perm("sora").isSuspended).toBe(true);
    expect(s.perm("tai").isSuspended).toBe(true);
    await advance(s.engine).fireForInstance(EffectTiming.SecuritySkill, s.inst("securitySora"));
    expect(s.state.players[0]!.battleArea.some((p) => p.topCard.instanceId === s.inst("securitySora").instanceId)).toBe(
      true,
    );
  });
});

describe("ST20-12 Sora Takenouchi & Kari Kamiya — KB Q&A rulings", () => {
  it.each([
    { acceptedSources: ["ST20-12", "ST20-13"], reduction: 2 },
    { acceptedSources: ["ST20-12"], reduction: 1 },
  ])(
    "reduces an [ADVENTURE] Digimon's play cost by $reduction when $acceptedSources activate (Q4463, Q4464)",
    async ({ acceptedSources, reduction }) => {
      const s = setupEngine({
        0: {
          battleArea: [
            { card: "ST20-12", as: "sora" },
            { card: "ST20-13", as: "tai" },
          ],
          hand: [{ card: "ST20-07", as: "adventure" }],
        },
      });
      s.state.turnSeat = 0;
      s.state.memory = 5;
      await s.ready();
      expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("adventure").instanceId })).toEqual({
        ok: true,
      });
      const offeredSources: string[] = [];
      await settle(() => {
        const pending = s.state.pendingDecision;
        if (pending?.kind === "optional") {
          const sourceCardId = s.decisions.at(-1)!.req.sourceCardId!;
          offeredSources.push(sourceCardId);
          s.engine.applyIntent(0, {
            type: "respondDecision",
            decisionId: pending.decisionId,
            response: { kind: "optional", accept: acceptedSources.includes(sourceCardId) },
          });
          return false;
        }
        return s.state.players[0]!.battleArea.some((p) => p.topCard.instanceId === s.inst("adventure").instanceId);
      });

      expect(offeredSources.sort()).toEqual(["ST20-12", "ST20-13"]);
      expect(s.state.memory).toBe(5 - (3 - reduction));
      expect(s.perm("sora").isSuspended).toBe(acceptedSources.includes("ST20-12"));
      expect(s.perm("tai").isSuspended).toBe(acceptedSources.includes("ST20-13"));
    },
  );
});
