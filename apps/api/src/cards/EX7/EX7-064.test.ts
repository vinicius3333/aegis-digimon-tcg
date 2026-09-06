import { describe, expect, it } from "vitest";
import { EffectTiming } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { observe } from "../../engine/testkit/observe.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./EX7-064.js";
import "./EX7-034.js";
describe("EX7-064 Shoto Kazama", () => {
  it("gains memory when the opponent has a Digimon", () =>
    expect(compiled.effects?.[0]?.actions[0]).toMatchObject({
      kind: "GainMemory",
      amount: 1,
      condition: { kind: "opponentHas" },
    }));
  it("grants Piercing and Blocker through the suspend cost and plays from security", () => {
    expect(compiled.effects?.[1]?.actions[0]).toMatchObject({
      kind: "GainKeyword",
      keyword: { keyword: "Piercing" },
      cost: { kind: "suspend" },
    });
    expect(compiled.effects?.[1]?.actions[1]).toMatchObject({
      kind: "GainKeyword",
      keyword: { keyword: "Blocker" },
      target: { sameTarget: true },
    });
    expect(compiled.effects?.find((e) => e.isSecurity)?.actions[0]).toMatchObject({
      kind: "PlayWithoutCost",
      payCost: false,
    });
  });

  it("gains memory only when the opponent has a Digimon at the start of Main", async () => {
    const withOpponent = setupEngine({
      0: { battleArea: [{ card: "EX7-064", as: "shoto" }] },
      1: { battleArea: [{ card: "BT1-009" }] },
    });
    withOpponent.state.memory = 0;
    await advance(withOpponent.engine).fire(EffectTiming.StartOfYourMainPhase, withOpponent.perm("shoto"));
    expect(withOpponent.state.memory).toBe(1);

    const withoutOpponent = setupEngine({ 0: { battleArea: [{ card: "EX7-064", as: "shoto" }] } });
    withoutOpponent.state.memory = 0;
    await advance(withoutOpponent.engine).fire(EffectTiming.StartOfYourMainPhase, withoutOpponent.perm("shoto"));
    expect(withoutOpponent.state.memory).toBe(0);
  });

  it("suspends itself, grants both keywords, and unsuspends a Vortex Warriors target", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "EX7-064", as: "shoto" },
            { card: "EX7-034", as: "vortex", suspended: true },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    await advance(s.engine).fire(EffectTiming.EndOfYourTurn, s.perm("shoto"));
    expect(s.perm("shoto").isSuspended).toBe(true);
    expect(observe(s.engine).hasPierce(s.perm("vortex"))).toBe(true);
    expect(observe(s.engine).hasKeyword(s.perm("vortex"), "Blocker")).toBe(true);
    expect(s.perm("vortex").isSuspended).toBe(false);
  });

  it.each([true, false])(
    "resolves Shoto before Vortex=%s in the real end-turn window (Q3868/Q3869)",
    async (shotoFirst) => {
      const shoto = { card: "EX7-064", as: "shoto" };
      const vortex = { card: "EX7-034", as: "vortex" };
      const s = setupEngine(
        {
          0: { battleArea: shotoFirst ? [shoto, vortex] : [vortex, shoto], deck: ["ST1-02", "ST1-02"] },
          1: {
            battleArea: [{ card: "BT1-009", as: "target" }],
            security: ["ST1-02", "ST1-02"],
            deck: ["ST1-02", "ST1-02"],
          },
        },
        { autoAcceptOptional: true, autoSelectCards: true, autoOrderTriggers: true },
      );
      const targetId = s.perm("target").permanentId;
      const vortexId = s.perm("vortex").permanentId;
      const startingTurn = s.state.turnCount;
      const turn = s.engine.runOneTurn();
      const mainPhase = (s.engine as unknown as { mainPhase: { isOpen: boolean } }).mainPhase;
      await settle(() => s.state.turnCount > startingTurn && s.state.phase === "Main" && mainPhase.isOpen);
      expect(s.state.turnCount).toBeGreaterThan(startingTurn);
      await advance(s.engine).waitForMainPhase(0);
      if (shotoFirst) await advance(s.engine).verb.suspend([vortexId]);
      expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
      await turn;
      expect(s.events.filter((event) => event.kind === "attackDeclared")).toEqual([
        expect.objectContaining({
          attackerPermanentId: vortexId,
          target: { kind: "permanent", permanentId: targetId },
        }),
      ]);
      expect(s.state.players[1]!.battleArea).toHaveLength(0);
      expect(s.state.players[1]!.security).toHaveLength(shotoFirst ? 1 : 2);
      expect(s.perm("shoto").isSuspended).toBe(true);
      expect(s.perm("vortex").isSuspended).toBe(shotoFirst);
      expect(observe(s.engine).hasKeyword(s.perm("vortex"), "Blocker")).toBe(true);
      expect(s.decisions.some(({ req }) => req.kind === "optional" && req.sourceCardId === "EX7-064")).toBe(true);
      expect(s.decisions.some(({ req }) => req.kind === "optional" && req.sourceCardId === "EX7-034")).toBe(true);
    },
  );

  it("does not unsuspend a non-Vortex target, and declining the optional effect leaves it unchanged", async () => {
    const accepted = setupEngine(
      {
        0: {
          battleArea: [
            { card: "EX7-064", as: "shoto" },
            { card: "BT1-009", as: "ordinary", suspended: true },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await accepted.ready();
    await advance(accepted.engine).fire(EffectTiming.EndOfYourTurn, accepted.perm("shoto"));
    expect(accepted.perm("ordinary").isSuspended).toBe(true);
    expect(observe(accepted.engine).hasPierce(accepted.perm("ordinary"))).toBe(true);
    expect(observe(accepted.engine).hasKeyword(accepted.perm("ordinary"), "Blocker")).toBe(true);

    const declined = setupEngine(
      {
        0: {
          battleArea: [
            { card: "EX7-064", as: "shoto" },
            { card: "BT1-009", as: "ordinary", suspended: true },
          ],
        },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    await declined.ready();
    await advance(declined.engine).fire(EffectTiming.EndOfYourTurn, declined.perm("shoto"));
    expect(declined.perm("shoto").isSuspended).toBe(false);
    expect(observe(declined.engine).hasKeyword(declined.perm("ordinary"), "Blocker")).toBe(false);
  });

  it("plays itself when revealed as a Security card", async () => {
    const s = setupEngine({ 0: { security: [{ card: "EX7-064", as: "shoto" }] } }, { autoAcceptOptional: true });
    await s.ready();
    await advance(s.engine).fireForInstance(EffectTiming.Security, s.inst("shoto"));
    expect(s.state.players[0]!.security).toHaveLength(0);
    expect(
      s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.instanceId === s.inst("shoto").instanceId),
    ).toBe(true);
  });
});
