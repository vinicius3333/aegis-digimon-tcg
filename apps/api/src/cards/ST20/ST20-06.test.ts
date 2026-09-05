import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { advance } from "../../engine/testkit/advance.js";
import "./ST20-06.js";

describe("ST20-06 Angewomon", () => {
  it.each([
    ["ST20-07", true],
    ["BT1-010", false],
  ] as const)(
    "gates the Alliance grant on played card %s while allowing attack refusal",
    async (cardId, grantsAlliance) => {
      const s = setupEngine(
        {
          0: {
            battleArea: [{ card: "ST20-06", as: "source" }],
            hand: [{ card: cardId, as: "played" }],
            deck: ["BT1-001", "BT1-002"],
          },
          1: { security: ["BT1-001"], deck: ["BT1-001", "BT1-002"] },
        },
        { autoDeclineOptional: true, autoSelectCards: true },
      );
      s.state.memory = 10;
      await s.ready();
      expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("played").instanceId })).toEqual({
        ok: true,
      });
      await settle(
        () =>
          s.decisions.some(({ req }) => req.kind === "optional" && req.sourceCardId === "ST20-06") &&
          s.state.pendingDecision === undefined,
      );
      expect(s.decisions.some(({ req }) => req.kind === "optional" && req.sourceCardId === "ST20-06")).toBe(true);
      expect(observe(s.engine).hasKeyword(s.perm("source"), "Alliance")).toBe(grantsAlliance);
      expect(s.events.some(({ kind }) => kind === "attackDeclared")).toBe(false);
      await advance(s.engine).runTurn(0);
      expect(observe(s.engine).hasKeyword(s.perm("source"), "Alliance")).toBe(false);
    },
  );

  it("grants Alliance after another Digimon evolves into ADVENTURE even when the attack is declined", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "ST20-06", as: "source" },
            { card: "ST20-07", as: "base" },
          ],
          hand: [{ card: "ST20-08", as: "next" }],
          deck: ["BT1-001", "BT1-002"],
        },
        1: { security: ["BT1-001"] },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("next").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        s.perm("base").topCard.instanceId === s.inst("next").instanceId &&
        s.decisions.some(({ req }) => req.kind === "optional" && req.sourceCardId === "ST20-06") &&
        s.state.pendingDecision === undefined,
    );
    expect(observe(s.engine).hasKeyword(s.perm("source"), "Alliance")).toBe(true);
    expect(s.events.some(({ kind }) => kind === "attackDeclared")).toBe(false);
  });

  it("inherits Alliance and resolves the ally cost across two security checks", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "ST1-10", as: "host", under: ["ST20-06"] },
            { card: "BT1-009", as: "ally" },
          ],
        },
        1: { security: ["ST1-11", "ST1-11"], deck: ["BT1-001", "BT1-002"] },
      },
      { autoSelectCards: true },
    );
    const host = s.perm("host");
    const ally = s.perm("ally");
    expect(
      s.engine.applyIntent(0, { type: "attack", attackerPermanentId: host.permanentId, target: { kind: "player" } }),
    ).toEqual({ ok: true });
    const combat = (
      s.engine as unknown as { combat: { hasOpenAllianceDecision: boolean; hasOpenBlockWindow: boolean } }
    ).combat;
    await settle(() => combat.hasOpenAllianceDecision);
    expect(s.engine.applyIntent(0, { type: "respondAlliance", allyPermanentId: ally.permanentId } as never)).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[1]!.security.length === 0);
    expect(s.state.players[0]!.battleArea.some((p) => p.permanentId === host.permanentId)).toBe(true);
    expect(ally.isSuspended).toBe(true);
    expect(s.state.players[1]!.security).toHaveLength(0);
  });

  it("may free-digivolve one other Digimon into an Adventure card from hand", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "ST20-07", as: "other" }],
          hand: [
            { card: "ST20-06", as: "angewomon" },
            { card: "ST20-09", as: "next" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("angewomon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.perm("other").topCard?.instanceId === s.inst("next").instanceId);
  });

  it("grants Alliance and resolves its optional attack after an Adventure is played", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "ST20-06", as: "angewomon" }], hand: [{ card: "ST20-07", as: "played" }] },
        1: { security: ["BT1-001", "BT1-002"], deck: ["BT1-003", "BT1-004"] },
      },
      { autoSelectCards: true, autoChooseOption: true },
    );
    s.state.memory = 10;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("played").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.pendingDecision?.kind === "optional");
    const optional = s.state.pendingDecision!;
    expect(s.decisions.at(-1)?.req.sourceCardId).toBe("ST20-06");
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: optional.decisionId,
        response: { kind: "optional", accept: true },
      }),
    ).toEqual({ ok: true });
    const combat = (
      s.engine as unknown as {
        combat: { hasOpenAllianceDecision: boolean; allianceDecisionPermanentId?: string; isAttacking: boolean };
      }
    ).combat;
    await settle(() => combat.hasOpenAllianceDecision);
    expect(combat.allianceDecisionPermanentId).toBe(s.perm("angewomon").permanentId);
    expect(s.engine.applyIntent(0, { type: "respondAlliance", allyPermanentId: s.perm("played").permanentId })).toEqual(
      { ok: true },
    );
    await settle(() => !combat.isAttacking && s.state.players[1]!.security.length === 0);
    expect(s.perm("played").isSuspended).toBe(true);
    expect(s.state.players[1]!.security).toHaveLength(0);
  });
});
