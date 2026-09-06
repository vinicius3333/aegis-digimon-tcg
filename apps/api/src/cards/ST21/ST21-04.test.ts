import { describe, expect, it } from "vitest";
import { getCardDefinition } from "@aegis/shared";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "../index.js";
describe("ST21-04", () => {
  it("implements the errata's one-source removal boundary", () => {
    expect(getCardDefinition("ST21-04")?.effectText).toContain("1 or fewer digivolution cards");
    const action = runtimeCompiledCard("ST21-04")?.effects.find((x) => x.trigger === "OnPlay")?.actions[0];
    expect(action).toMatchObject({
      kind: "TrashDigivolution",
      target: { count: 1 },
      amount: 1,
      scaling: { per: 2, unit: "colors" },
    });
  });
  it("makes Alliance mandatory while keeping the subsequent attack optional", () => {
    const actions = runtimeCompiledCard("ST21-04")?.effects.find((x) => x.trigger === "YourTurn")?.actions ?? [];
    expect(actions.some((a) => a.kind === "SubTrigger")).toBe(true);
    const watchers = actions.filter((a) => a.kind === "SubTrigger");
    expect(watchers).toHaveLength(2);
    expect(watchers.every((watcher) => watcher.actions?.at(-1)?.kind === "Attack")).toBe(true);
    expect(watchers.every((watcher) => watcher.actions?.at(-1)?.optional === true)).toBe(true);
  });

  it("returns only an opponent Digimon at the one-source boundary on play", async () => {
    const s = setupEngine(
      {
        0: { hand: [{ card: "ST21-04", as: "zudomon" }] },
        1: {
          battleArea: [
            { card: "BT1-021", as: "eligible", under: ["BT1-009"] },
            { card: "BT1-040", as: "tooMany", under: ["BT1-009", "BT1-010"] },
          ],
        },
      },
      { autoSelectCards: true, preferInstanceIds: [] },
    );
    const eligibleId = s.perm("eligible").permanentId;
    const tooManyId = s.perm("tooMany").permanentId;
    s.state.memory = 7;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("zudomon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => !s.state.players[1]!.battleArea.some(({ permanentId }) => permanentId === eligibleId));

    expect(s.state.players[1]!.battleArea.some(({ permanentId }) => permanentId === tooManyId)).toBe(true);
    expect(s.state.players[1]!.hand.some(({ cardId }) => cardId === "BT1-021")).toBe(true);
  });

  it("opens the optional attack only after a qualifying other Digimon event", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "ST21-04", as: "zudomon" }], hand: [{ card: "BT1-009", as: "played" }] },
        1: { security: ["BT1-001"] },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();
    expect(s.events.some(({ kind }) => kind === "attackDeclared")).toBe(false);
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("played").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.decisions.some(({ req }) => req.kind === "optional" && req.sourceCardId === "ST21-04"));
    expect(s.decisions.some(({ req }) => req.kind === "optional" && req.sourceCardId === "ST21-04")).toBe(true);
    expect(s.events.some(({ kind }) => kind === "attackDeclared")).toBe(false);
  });

  it("gives Alliance and attacks after another ADVENTURE is played", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "ST21-04", as: "zudomon" }], hand: [{ card: "ST21-09", as: "played" }] },
        1: { security: ["ST1-09", "ST1-09"] },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("played").instanceId })).toEqual({
      ok: true,
    });
    await settle(
      () => s.state.pendingDecision?.kind === "optional" && s.decisions.at(-1)?.req.sourceCardId === "ST21-04",
    );
    expect(s.decisions.at(-1)?.req.sourceCardId).toBe("ST21-04");
    const playOptional = s.state.pendingDecision!;
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: playOptional.decisionId,
        response: { kind: "optional", accept: true },
      }),
    ).toEqual({ ok: true });
    const combat = (
      s.engine as unknown as {
        combat: { hasOpenAllianceDecision: boolean; allianceDecisionPermanentId?: string; isAttacking: boolean };
      }
    ).combat;
    await settle(() => combat.hasOpenAllianceDecision);
    expect(combat.hasOpenAllianceDecision).toBe(true);
    expect(combat.allianceDecisionPermanentId).toBe(s.perm("zudomon").permanentId);
    expect(s.engine.applyIntent(0, { type: "respondAlliance", allyPermanentId: s.perm("played").permanentId })).toEqual(
      {
        ok: true,
      },
    );
    await settle(() => !combat.isAttacking && s.state.players[1]!.security.length === 0);
    expect(s.state.players[1]!.security).toHaveLength(0);
    expect(combat.isAttacking).toBe(false);
    expect(s.state.players[0]!.battleArea.some((p) => p.permanentId === s.perm("zudomon").permanentId)).toBe(true);
    expect(s.events.some(({ kind }) => kind === "attackDeclared")).toBe(true);
    expect(s.perm("played").isSuspended).toBe(true);
    expect(s.state.players[0]!.battleArea.some(({ isSuspended }) => isSuspended)).toBe(true);
  });

  it("gives Alliance and attacks after another ADVENTURE digivolves", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "ST21-04", as: "zudomon" },
            { card: "ST21-07", as: "base" },
          ],
          hand: [{ card: "ST21-08", as: "evolved" }],
          deck: ["ST1-02", "ST1-02"],
        },
        1: { security: ["ST1-09", "ST1-09"] },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("evolved").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(
      () => s.state.pendingDecision?.kind === "optional" && s.decisions.at(-1)?.req.sourceCardId === "ST21-04",
    );
    expect(s.decisions.at(-1)?.req.sourceCardId).toBe("ST21-04");
    const evoOptional = s.state.pendingDecision!;
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: evoOptional.decisionId,
        response: { kind: "optional", accept: true },
      }),
    ).toEqual({ ok: true });
    const combat = (
      s.engine as unknown as {
        combat: { hasOpenAllianceDecision: boolean; allianceDecisionPermanentId?: string; isAttacking: boolean };
      }
    ).combat;
    await settle(() => combat.hasOpenAllianceDecision);
    expect(combat.hasOpenAllianceDecision).toBe(true);
    expect(combat.allianceDecisionPermanentId).toBe(s.perm("zudomon").permanentId);
    expect(
      s.engine.applyIntent(0, { type: "respondAlliance", allyPermanentId: s.perm("evolved").permanentId }),
    ).toEqual({
      ok: true,
    });
    await settle(() => !combat.isAttacking && s.state.players[1]!.security.length === 0);
    expect(s.state.players[1]!.security).toHaveLength(0);
    expect(combat.isAttacking).toBe(false);
    expect(s.state.players[0]!.battleArea.some((p) => p.permanentId === s.perm("zudomon").permanentId)).toBe(true);
    expect(s.events.some(({ kind }) => kind === "attackDeclared")).toBe(true);
    expect(s.perm("evolved").isSuspended).toBe(true);
  });
});
