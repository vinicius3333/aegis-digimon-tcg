import { EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine } from "../../engine/testkit/harness.js";
import { compiled } from "./BT24-008.js";
import "../index.js";

describe("BT24-008 Elizamon", () => {
  it("requires trashing a qualifying hand card before drawing two", () => {
    const action = compiled.effects.find((effect) => effect.trigger === "OnPlay")?.actions?.[0] as any;
    expect(action).toMatchObject({
      kind: "Draw",
      amount: 2,
      cost: { kind: "trash" },
      optional: true,
      abortOnDecline: true,
    });
    expect(action.cost.target.filter.nameOrTrait).toEqual([
      { tokens: ["Reptile"], match: "trait" },
      { tokens: ["Dragonkin"], match: "trait" },
      { tokens: ["LIBERATOR"], match: "trait" },
    ]);
  });

  it("gains memory only when the opponent's security stack is removed", () => {
    const inherited = compiled.effects.find((effect) => effect.isInherited) as any;
    expect(inherited.frequency).toBe("OncePerTurn");
    expect(inherited.actions[0]).toMatchObject({
      kind: "SubTrigger",
      event: "whenSecurityRemoved",
      sourceFilter: { controller: "opponent" },
      fireCondition: { kind: "triggerRemovedSecuritySeat", seat: "opponent" },
    });
    expect(inherited.actions[0].actions[0]).toMatchObject({ kind: "GainMemory", amount: 1 });
  });

  it("trashes a qualifying card and draws exactly two on play", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT24-008", as: "elizamon" }],
          hand: [
            { card: "BT24-011", as: "dragonkin" },
            { card: "BT1-001", as: "nonMatch" },
          ],
          deck: [
            { card: "BT1-002", as: "drawOne" },
            { card: "BT1-003", as: "drawTwo" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );

    await advance(s.engine).fire(EffectTiming.OnPlay, s.perm("elizamon"));

    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toContain(s.inst("dragonkin").instanceId);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toEqual(
      expect.arrayContaining([
        s.inst("nonMatch").instanceId,
        s.inst("drawOne").instanceId,
        s.inst("drawTwo").instanceId,
      ]),
    );
  });

  it("may decline the trash cost and draw nothing", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT24-008", as: "elizamon" }],
          hand: [{ card: "BT24-011", as: "dragonkin" }],
          deck: ["BT1-002", "BT1-003"],
        },
      },
      { autoDeclineOptional: true },
    );

    await advance(s.engine).fire(EffectTiming.OnPlay, s.perm("elizamon"));

    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toContain(s.inst("dragonkin").instanceId);
    expect(s.state.players[0]!.deck).toHaveLength(2);
    expect(s.state.players[0]!.trash).toHaveLength(0);
  });

  it("gains memory once only when the opponent's security is removed", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT1-009", as: "host", under: ["BT24-008"] }] } });
    s.state.memory = 0;
    await s.ready();
    await advance(s.engine).fire(EffectTiming.OnStartMainPhase, s.perm("host"));

    await advance(s.engine).fireSubTrigger("whenSecurityRemoved", { removedFromSecuritySeat: 0 });
    expect(s.state.memory).toBe(0);

    await advance(s.engine).fireSubTrigger("whenSecurityRemoved", { removedFromSecuritySeat: 1 });
    await advance(s.engine).fireSubTrigger("whenSecurityRemoved", { removedFromSecuritySeat: 1 });
    expect(s.state.memory).toBe(1);
  });
});
