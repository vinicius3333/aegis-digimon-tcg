import { describe, expect, it } from "vitest";
import { assertNoLoudGap, setupEngine, settle } from "../../engine/testkit/harness.js";
import "./EX2-032.js";
import "./EX2-035.js";
import "./EX2-038.js";
import "./EX2-062.js";

describe("EX2 Justimon/Ryo modal combo deck", () => {
  it("resolves three explicit modes, unsuspends for a second attack, and caps every inherited trigger once per turn", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "EX2-035", as: "justimonBase", under: ["EX2-032"] },
            { card: "EX2-062", as: "firstRyo" },
            { card: "EX2-062", as: "secondRyo" },
          ],
          hand: [{ card: "EX2-038", as: "justimon" }],
          deck: ["BT1-009"],
        },
        1: {
          battleArea: [{ card: "EX2-032", as: "deleteTarget", under: ["EX2-030"] }],
          security: ["BT1-010", "BT1-011"],
          deck: ["BT1-012"],
        },
      },
      {
        autoAcceptOptional: true,
        autoOrderTriggers: true,
        autoSelectCards: true,
      },
    );
    s.state.memory = 10;
    await s.ready();

    const initialDecisionCount = s.decisions.length;
    expect(s.engine.applyIntent(0, {
      type: "digivolve",
      permanentId: s.perm("justimonBase").permanentId,
      instanceId: s.inst("justimon").instanceId,
    })).toEqual({ ok: true });
    await settle(() => {
      const req = s.decisions.at(-1)?.req;
      return s.decisions.length > initialDecisionCount &&
        req?.sourceCardId === "EX2-038" &&
        req.kind === "chooseOption";
    });

    const evolutionMode = s.decisions.at(-1)!.req;
    expect(evolutionMode.options?.choices).toHaveLength(3);
    expect(s.engine.applyIntent(0, {
      type: "respondDecision",
      decisionId: evolutionMode.decisionId,
      response: { kind: "chooseOption", optionIndex: 0 },
    })).toEqual({ ok: true });
    await settle(() =>
      s.perm("justimonBase").topCard.instanceId === s.inst("justimon").instanceId &&
      s.perm("justimonBase").currentDP === 13_000 &&
      s.state.memory === 7 &&
      s.state.pendingDecision === undefined,
    );
    await settle();

    const deleteTargetPermanentId = s.perm("deleteTarget").permanentId;
    const firstCombatCount = s.events.filter(({ kind }) => kind === "combatResolved").length;
    expect(s.engine.applyIntent(0, {
      type: "attack",
      attackerPermanentId: s.perm("justimonBase").permanentId,
      target: { kind: "player" },
    })).toEqual({ ok: true });

    await settle(() => {
      const req = s.decisions.at(-1)?.req;
      return req?.decisionId !== evolutionMode.decisionId &&
        req?.sourceCardId === "EX2-038" &&
        req.kind === "chooseOption";
    });
    const firstAttackMode = s.decisions.at(-1)!.req;
    expect(s.engine.applyIntent(0, {
      type: "respondDecision",
      decisionId: firstAttackMode.decisionId,
      response: { kind: "chooseOption", optionIndex: 1 },
    })).toEqual({ ok: true });

    await settle(() => {
      const req = s.decisions.at(-1)?.req;
      return req?.decisionId !== firstAttackMode.decisionId &&
        req?.sourceCardId === "EX2-038" &&
        req.kind === "chooseOption";
    });
    const secondAttackMode = s.decisions.at(-1)!.req;
    expect(s.engine.applyIntent(0, {
      type: "respondDecision",
      decisionId: secondAttackMode.decisionId,
      response: { kind: "chooseOption", optionIndex: 2 },
    })).toEqual({ ok: true });

    await settle(() =>
      !s.state.players[1]!.battleArea.some(
        ({ permanentId }) => permanentId === deleteTargetPermanentId,
      ) &&
      s.state.players[1]!.security.length === 1 &&
      s.events.filter(({ kind }) => kind === "combatResolved").length > firstCombatCount &&
      s.state.pendingDecision === undefined,
    );

    expect(s.perm("firstRyo").isSuspended).toBe(true);
    expect(s.perm("secondRyo").isSuspended).toBe(true);
    expect(s.perm("justimonBase").isSuspended).toBe(false);
    expect(s.perm("justimonBase").currentDP).toBe(15_000);
    expect(s.state.memory).toBe(8);
    expect(s.state.players[1]!.battleArea).toHaveLength(0);
    expect(s.state.players[1]!.trash.some(({ cardId }) => cardId === "EX2-032")).toBe(true);
    expect(s.state.players[1]!.trash.some(({ cardId }) => cardId === "EX2-030")).toBe(true);

    const decisionCountBeforeSecondAttack = s.decisions.length;
    const secondCombatCount = s.events.filter(({ kind }) => kind === "combatResolved").length;
    expect(s.engine.applyIntent(0, {
      type: "attack",
      attackerPermanentId: s.perm("justimonBase").permanentId,
      target: { kind: "player" },
    })).toEqual({ ok: true });
    await settle(() =>
      s.state.players[1]!.security.length === 0 &&
      s.events.filter(({ kind }) => kind === "combatResolved").length > secondCombatCount,
    );

    expect(s.decisions).toHaveLength(decisionCountBeforeSecondAttack);
    expect(s.perm("justimonBase").isSuspended).toBe(true);
    expect(s.perm("justimonBase").currentDP).toBe(15_000);
    expect(s.state.memory).toBe(8);
    assertNoLoudGap(s);
  });
});
