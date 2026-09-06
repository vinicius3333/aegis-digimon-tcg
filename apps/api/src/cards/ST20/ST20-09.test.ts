import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { advance } from "../../engine/testkit/advance.js";
import "../index.js";

describe("ST20-09 MegaKabuterimon", () => {
  it.each([
    ["ST20-07", true],
    ["BT1-010", false],
  ] as const)(
    "gates the Alliance grant on played card %s while allowing attack refusal",
    async (cardId, grantsAlliance) => {
      const s = setupEngine(
        {
          0: {
            battleArea: [{ card: "ST20-09", as: "source" }],
            hand: [{ card: cardId, as: "played" }],
            deck: ["ST1-02", "ST2-02"],
          },
          1: { security: ["BT1-001"], deck: ["ST1-02", "ST2-02"] },
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
          s.decisions.some(({ req }) => req.kind === "optional" && req.sourceCardId === "ST20-09") &&
          s.state.pendingDecision === undefined,
      );
      expect(s.decisions.some(({ req }) => req.kind === "optional" && req.sourceCardId === "ST20-09")).toBe(true);
      expect(observe(s.engine).hasKeyword(s.perm("source"), "Alliance")).toBe(grantsAlliance);
      expect(s.events.some(({ kind }) => kind === "attackDeclared")).toBe(false);
      await (s.engine as unknown as { mainVerbChain: Promise<void> }).mainVerbChain;
      await advance(s.engine).runTurn(0);
      expect(observe(s.engine).hasKeyword(s.perm("source"), "Alliance")).toBe(false);
    },
  );

  it("grants Alliance after another Digimon evolves into ADVENTURE even when the attack is declined", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "ST20-09", as: "source" },
            { card: "ST20-07", as: "base" },
          ],
          hand: [{ card: "ST20-08", as: "next" }],
          deck: ["ST1-02", "ST2-02"],
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
        s.decisions.some(({ req }) => req.kind === "optional" && req.sourceCardId === "ST20-09") &&
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
            { card: "ST1-10", as: "host", under: ["ST20-09"] },
            { card: "BT1-009", as: "ally" },
          ],
        },
        1: { security: ["ST1-11", "ST1-11"], deck: ["ST1-02", "ST2-02"] },
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

  it("unsuspends one of yours and suspends one opponent Digimon per two Adventure Tamer colors", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "ST20-07", as: "ownTarget", suspended: true },
            { card: "ST20-12", as: "twoColorTamer" },
            { card: "BT21-102", as: "oneColorTamer" },
          ],
          hand: [{ card: "ST20-09", as: "mega" }],
        },
        1: { battleArea: [{ card: "BT1-009", as: "opponentTarget" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("mega").instanceId })).toEqual({ ok: true });
    await settle(() => !s.perm("ownTarget").isSuspended && s.perm("opponentTarget").isSuspended);
    expect(s.perm("ownTarget").isSuspended).toBe(false);
    expect(s.perm("opponentTarget").isSuspended).toBe(true);
  });

  it("does not suspend an opponent when no qualifying Tamer colors are present", async () => {
    const s = setupEngine({
      0: { hand: [{ card: "ST20-09", as: "mega" }] },
      1: { battleArea: [{ card: "BT1-009", as: "opponentTarget" }] },
    });
    s.state.memory = 10;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("mega").instanceId })).toEqual({ ok: true });
    await settle(() =>
      s.state.players[0]!.battleArea.some((perm) => perm.topCard?.instanceId === s.inst("mega").instanceId),
    );
    expect(s.perm("opponentTarget").isSuspended).toBe(false);
  });

  it("grants Alliance and resolves its optional attack after an Adventure is played", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "ST20-09", as: "mega" }], hand: [{ card: "ST20-07", as: "played" }] },
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
    expect(s.decisions.at(-1)?.req.sourceCardId).toBe("ST20-09");
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
    expect(combat.allianceDecisionPermanentId).toBe(s.perm("mega").permanentId);
    expect(s.engine.applyIntent(0, { type: "respondAlliance", allyPermanentId: s.perm("played").permanentId })).toEqual(
      { ok: true },
    );
    await settle(() => !combat.isAttacking && s.state.players[1]!.security.length === 0);
    expect(s.perm("played").isSuspended).toBe(true);
    expect(s.state.players[1]!.security).toHaveLength(0);
  });
});
