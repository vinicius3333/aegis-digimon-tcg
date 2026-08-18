import { EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { assertNoLoudGap, setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "./ST13-04.js";
import "./ST13-05.js";
import "./ST13-06.js";
import "./ST13-02.js";
import "./ST13-09.js";
import "./ST13-13.js";
import "./ST13-14.js";

describe("ST13 Legend-Arms end-of-turn DNA deck", () => {
  it("chains two On Play place costs into different stacks with UI-safe permanent ids", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "ST13-05", as: "durandamon" },
            { card: "ST13-14", as: "bryweludramon" },
          ],
          hand: [{ card: "ST13-02", as: "zubamon" }],
          deck: [
            { card: "ST13-09", as: "ludomon" },
            { card: "BT1-001", as: "revealedFiller" },
          ],
        },
      },
      { autoAcceptOptional: true, autoOrderTriggers: true },
    );
    const durandamonId = s.perm("durandamon").permanentId;
    const bryweludramonId = s.perm("bryweludramon").permanentId;
    const ludomonId = s.inst("ludomon").instanceId;
    s.state.memory = 3;
    await s.ready();

    expect(s.engine.applyIntent(0, {
      type: "playCard",
      instanceId: s.inst("zubamon").instanceId,
    })).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision?.kind === "chooseTargets");

    const zubamonHost = s.decisions.at(-1)!.req;
    expect(zubamonHost.sourceCardId).toBe("ST13-02");
    expect(new Set(zubamonHost.options?.candidateInstanceIds)).toEqual(
      new Set([durandamonId, bryweludramonId]),
    );
    expect(s.engine.applyIntent(0, {
      type: "respondDecision",
      decisionId: zubamonHost.decisionId,
      response: { kind: "chooseTargets", instanceIds: [durandamonId] },
    })).toEqual({ ok: true });
    await settle(() =>
      s.state.pendingDecision?.kind === "selectCards" &&
      s.decisions.at(-1)?.req.decisionId === s.state.pendingDecision.decisionId &&
      s.decisions.at(-1)?.req.sourceCardId === "ST13-02"
    );

    const revealedChoice = s.decisions.at(-1)!.req;
    expect(revealedChoice.options?.candidateInstanceIds).toEqual([ludomonId]);
    expect(s.engine.applyIntent(0, {
      type: "respondDecision",
      decisionId: revealedChoice.decisionId,
      response: { kind: "selectCards", instanceIds: [ludomonId] },
    })).toEqual({ ok: true });

    await settle(() =>
      s.state.players[0]!.battleArea.some(({ topCard }) => topCard.instanceId === ludomonId) &&
      s.state.pendingDecision?.kind === "chooseTargets" &&
      s.decisions.at(-1)?.req.decisionId === s.state.pendingDecision.decisionId &&
      s.decisions.at(-1)?.req.kind === "chooseTargets" &&
      s.decisions.at(-1)?.req.sourceCardId === "ST13-09"
    );
    const ludomonHost = s.decisions.at(-1)!.req;
    expect(s.state.players[0]!.battleArea.some(({ topCard }) =>
      topCard.instanceId === ludomonId
    )).toBe(true);
    expect(new Set(ludomonHost.options?.candidateInstanceIds)).toEqual(
      new Set([durandamonId, bryweludramonId]),
    );
    expect(s.engine.applyIntent(0, {
      type: "respondDecision",
      decisionId: ludomonHost.decisionId,
      response: { kind: "chooseTargets", instanceIds: [bryweludramonId] },
    })).toEqual({ ok: true });
    await settle(() =>
      s.perm("durandamon").stack.some(({ cardId }) => cardId === "ST13-02") &&
      s.perm("bryweludramon").stack.some(({ cardId }) => cardId === "ST13-09") &&
      s.state.players[0]!.hand.some(({ cardId }) => cardId === "BT1-001") &&
      s.perm("durandamon").currentDP === 14000 &&
      observe(s.engine).keywordAmount(s.perm("durandamon"), "SecurityAttack") === 1 &&
      observe(s.engine).isRestricted(s.perm("bryweludramon"), "beDeleted") &&
      observe(s.engine).isRestricted(s.perm("bryweludramon"), "beReturned") &&
      s.state.pendingDecision === undefined
    );

    expect(s.perm("durandamon").currentDP).toBe(14000);
    expect(observe(s.engine).keywordAmount(s.perm("durandamon"), "SecurityAttack")).toBe(1);
    expect(observe(s.engine).isRestricted(s.perm("bryweludramon"), "beDeleted")).toBe(true);
    expect(observe(s.engine).isRestricted(s.perm("bryweludramon"), "beReturned")).toBe(true);
    expect(s.state.memory).toBe(0);
    assertNoLoudGap(s);
  });

  it("offers both inherited triggers, resolves one DNA, and fizzles the consumed duplicate", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "ST13-05", as: "durandamon", under: ["ST13-04"] },
            { card: "ST13-14", as: "bryweludramon", under: ["ST13-13"] },
            { card: "BT1-009", as: "dnaDecoy" },
          ],
          hand: [{ card: "ST13-06", as: "ragnaLoardmon" }],
        },
        1: {
          battleArea: [
            { card: "BT1-009", as: "chosenDeletion" },
            { card: "BT1-010", as: "survivor" },
          ],
          security: ["BT1-001", "BT1-002", "BT1-003"],
        },
      },
      {
        autoAcceptOptional: true,
        autoOrderTriggers: true,
        autoSelectCards: true,
      },
    );
    const blackPermanentId = s.perm("bryweludramon").permanentId;
    const decoyPermanentId = s.perm("dnaDecoy").permanentId;
    const chosenDeletionId = s.perm("chosenDeletion").permanentId;
    await s.ready();

    await advance(s.engine).fire(EffectTiming.OnEndTurn, s.perm("durandamon"));
    await settle(() =>
      s.state.players[0]!.battleArea.some(({ topCard }) => topCard.cardId === "ST13-06") &&
      !s.state.players[1]!.battleArea.some(({ permanentId }) => permanentId === chosenDeletionId) &&
      s.state.players[1]!.security.length === 2 &&
      s.state.pendingDecision === undefined
    );

    const ragna = s.state.players[0]!.battleArea.find(
      ({ topCard }) => topCard.cardId === "ST13-06",
    )!;
    expect(s.state.players[0]!.battleArea).toHaveLength(2);
    expect(ragna.stack).toHaveLength(4);
    expect(ragna.stack.map(({ cardId }) => cardId)).toEqual(expect.arrayContaining([
      "ST13-04",
      "ST13-05",
      "ST13-13",
      "ST13-14",
    ]));
    expect(observe(s.engine).hasKeyword(ragna, "Blitz")).toBe(true);
    expect(s.state.players[1]!.battleArea.map(({ permanentId }) => permanentId)).toEqual([
      s.perm("survivor").permanentId,
    ]);

    const dnaMaterialDecision = s.decisions.find(({ req }) =>
      req.kind === "chooseTargets" &&
      req.options?.candidateInstanceIds?.includes(blackPermanentId) &&
      req.options.candidateInstanceIds.includes(decoyPermanentId)
    )?.req;
    expect(new Set(dnaMaterialDecision?.options?.candidateInstanceIds ?? [])).toEqual(
      new Set([blackPermanentId, decoyPermanentId]),
    );
    const dnaPrompts = s.decisions.filter(({ req }) =>
      req.kind === "optional" &&
      (req.sourceCardId === "ST13-04" || req.sourceCardId === "ST13-13")
    );
    expect(dnaPrompts).toHaveLength(1);
    expect(dnaPrompts[0]!.req.sourceCardId).toBe("ST13-04");
    assertNoLoudGap(s);
  });
});
