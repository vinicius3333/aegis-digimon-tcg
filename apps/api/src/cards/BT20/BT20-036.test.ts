import { describe, expect, it } from "vitest";
import { EffectTiming } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./BT20-036.js";
import "./index.js";
import "../P/P-221.js";
import "../BT13/BT13-087.js";
import "../BT16/BT16-036.js";

describe("BT20-036 BanchoLeomon", () => {
  it("de-digivolves and lowers DP on entry, then DNA-digivolves this Digimon with another before the attack", () => {
    for (const trigger of ["OnPlay", "WhenDigivolving"] as const) {
      expect(compiled.effects.find((entry) => entry.trigger === trigger)).toMatchObject({
        actions: [
          { kind: "DeDigivolve", amount: 2 },
          { kind: "ModifyDP", amount: -5000, duration: "untilOpponentTurnEnd" },
        ],
      });
    }
    expect(compiled.effects.find((entry) => entry.trigger === "EndOfYourTurn")).toMatchObject({
      actions: [
        {
          kind: "DnaDigivolve",
          materials: { count: 2, includeRef: "self" },
          into: { nameOrTrait: [{ tokens: ["Chaosmon"], match: "name" }] },
          optional: true,
          bindResultAs: "dnaDigivolvedByThisEffect",
        },
        {
          kind: "Attack",
          optional: true,
          target: { filter: { boundRef: "dnaDigivolvedByThisEffect" } },
          condition: { kind: "bindingExists", ref: "dnaDigivolvedByThisEffect" },
        },
      ],
    });
    expect(compiled.effects.find((entry) => entry.isInherited)).toMatchObject({
      trigger: "OpponentsTurn",
      frequency: "OncePerTurn",
      actions: [{ kind: "SubTrigger", event: "whenOpponentAttacks" }],
    });
  });

  it("reduces its play cost by 5 with ACCEL, then applies De-Digivolve 2 and -5000 DP", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT20-030", as: "accel" }],
          hand: [{ card: "BT20-036", as: "bancho" }],
        },
        1: {
          battleArea: [{ card: "BT20-035", dp: 10000, under: ["BT20-032", "BT20-034"], as: "target" }],
        },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 12;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("bancho").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.perm("target").stack.length === 0 && s.perm("target").currentDP === 5000);
    expect(s.state.memory).toBe(5);
  });

  it("publicly evolves from a level-5 ACCEL Digimon and refuses the non-ACCEL play reduction", async () => {
    const evolved = setupEngine({
      0: { battleArea: [{ card: "BT20-033", as: "loader" }], hand: [{ card: "BT20-036", as: "bancho" }] },
    });
    evolved.state.memory = 3;
    expect(
      evolved.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: evolved.perm("loader").permanentId,
        instanceId: evolved.inst("bancho").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(
      () => evolved.perm("loader").topCard.cardId === "BT20-036" && evolved.state.pendingDecision === undefined,
    );
    expect(evolved.perm("loader").stack.map((card) => card.cardId)).toEqual(["BT20-033"]);

    const refused = setupEngine({
      0: { battleArea: [{ card: "BT20-010", as: "ordinary" }], hand: [{ card: "BT20-036", as: "bancho" }] },
    });
    refused.state.memory = 7;
    expect(refused.engine.applyIntent(0, { type: "playCard", instanceId: refused.inst("bancho").instanceId })).toEqual({
      ok: true,
    });
    await settle(
      () =>
        refused.state.players[0]!.battleArea.some((permanent) => permanent.topCard.cardId === "BT20-036") &&
        refused.state.pendingDecision === undefined,
    );
    expect(refused.state.memory).toBe(-5);
  });

  it("redirects an opposing attack to the inherited host once on the opponent's turn", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT16-036", dp: 15000, as: "host", under: ["BT20-036"] }],
          security: ["BT20-001"],
        },
        1: { battleArea: [{ card: "BT20-010", dp: 1000, as: "attacker" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.turnSeat = 1;
    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.battleArea.length === 0);
    expect(s.state.players[0]!.security).toHaveLength(1);
    expect(s.state.players[0]!.battleArea).toContain(s.perm("host"));
  });

  it("DNA digivolves itself with another Digimon at turn end, then attacks", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT20-036", as: "bancho" },
            { card: "BT13-087", as: "purpleMega" },
          ],
          hand: [{ card: "P-221", as: "chaosmon" }],
        },
        1: { battleArea: [{ card: "BT20-010", dp: 1000, suspended: true, as: "target" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 5;
    await advance(s.engine).fire(EffectTiming.OnEndTurn, s.perm("bancho"));
    await settle(
      () =>
        s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.cardId === "P-221") &&
        s.state.players[1]!.battleArea.length === 0,
    );
    expect(s.state.players[0]!.battleArea).toHaveLength(1);
  });

  it("does not declare a second End of Your Turn attack while the first copy's attack is resolving", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT20-036", as: "first" },
            { card: "BT20-036", as: "second" },
            { card: "BT13-087", as: "firstPartner" },
            { card: "BT20-058", as: "secondPartner" },
          ],
          hand: [
            { card: "P-221", as: "firstChaosmon" },
            { card: "BT16-036", as: "secondChaosmon" },
            { card: "BT20-001", as: "playable" },
          ],
          deck: ["BT20-001", "BT20-001", "BT20-001", "BT20-001"],
        },
        1: { security: ["BT20-001", "BT20-001", "BT20-001"], deck: ["BT20-001", "BT20-001", "BT20-001"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoOrderTriggers: true, preferInstanceIds: preferred },
    );
    const firstBanchoCardId = s.perm("first").topCard.instanceId;
    const firstPartnerCardId = s.perm("firstPartner").topCard.instanceId;
    const secondBanchoCardId = s.perm("second").topCard.instanceId;
    const secondPartnerCardId = s.perm("secondPartner").topCard.instanceId;
    // Both partners are preferred in board order; the first is consumed before
    // the second selection, leaving the second pair available during combat.
    preferred.push(s.perm("firstPartner").permanentId, s.perm("secondPartner").permanentId);
    // End Main passes at -3: first P-221 pays 5, then printed BT16 DNA costs 0.
    s.state.memory = 3;
    const turn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(0);
    advance(s.engine).endMainPhaseIfOpen(0);
    await turn;
    const results = s.state.players[0]!.battleArea.filter((permanent) =>
      ["P-221", "BT16-036"].includes(permanent.topCard.cardId),
    );
    expect(results).toHaveLength(2);
    expect(
      results.some(
        (permanent) =>
          permanent.stack.some((card) => card.instanceId === firstBanchoCardId) &&
          permanent.stack.some((card) => card.instanceId === firstPartnerCardId),
      ),
    ).toBe(true);
    expect(
      results.some(
        (permanent) =>
          permanent.stack.some((card) => card.instanceId === secondBanchoCardId) &&
          permanent.stack.some((card) => card.instanceId === secondPartnerCardId),
      ),
    ).toBe(true);
    expect(s.state.players[0]!.hand.filter((card) => ["P-221", "BT16-036"].includes(card.cardId))).toHaveLength(0);
    expect(s.events.filter((event) => event.kind === "attackDeclared")).toHaveLength(1);
  });

  it("exposes the DNA result's When Digivolving and When Attacking effects as one player-ordered pool", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT20-036", as: "bancho" },
            { card: "BT13-087", as: "partner" },
          ],
          hand: [{ card: "P-221", as: "chaosmon" }],
          deck: ["BT20-001", "BT20-002"],
        },
        1: {
          battleArea: [{ card: "BT20-010", dp: 25000, as: "target" }],
          security: ["BT20-001", "BT20-002"],
          deck: ["BT20-003", "BT20-004"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoOrderTriggers: false },
    );
    s.state.memory = 3; // Paying DNA cost 5 crosses the gauge and completes this turn.
    await s.ready();
    const turn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(0);
    advance(s.engine).endMainPhaseIfOpen(0);
    await settle(() => s.state.pendingDecision?.kind === "orderTriggers");
    expect(s.events.some((event) => event.kind === "attackDeclared")).toBe(true);
    expect(s.state.players[1]!.security).toHaveLength(2); // choose before the first check removes anything
    const firstRequest = s.decisions.find(({ req }) => req.decisionId === s.state.pendingDecision?.decisionId)!.req;
    if (firstRequest.kind !== "orderTriggers") throw new Error("DNA attack trigger order decision missing");
    expect(firstRequest.options?.triggerCardIds).toEqual(["P-221", "P-221", "P-221"]);
    const keys = firstRequest.options?.triggerKeys ?? [];
    expect(keys).toHaveLength(3);
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: firstRequest.decisionId,
        response: { kind: "orderTriggers", order: [keys[0]!] },
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        s.state.pendingDecision?.kind === "orderTriggers" &&
        s.state.pendingDecision.decisionId !== firstRequest.decisionId,
    );
    const secondRequest = s.decisions.find(({ req }) => req.decisionId === s.state.pendingDecision?.decisionId)!.req;
    if (secondRequest.kind !== "orderTriggers") throw new Error("second DNA trigger order decision missing");
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: secondRequest.decisionId,
        response: { kind: "orderTriggers", order: [keys[1]!] },
      }),
    ).toEqual({ ok: true });
    advance(s.engine).endMainPhaseIfOpen(0);
    await settle(() => false, 200);
    await settle(
      () => s.state.pendingDecision === undefined && s.events.some((event) => event.kind === "combatResolved"),
    );
    expect(s.state.pendingDecision).toBeUndefined();
    await turn;
    expect(s.state.pendingDecision).toBeUndefined();
    expect(s.state.players[0]!.battleArea).toHaveLength(1);
    expect(s.state.players[0]!.battleArea[0]!.topCard.cardId).toBe("P-221");
    expect(s.state.players[1]!.battleArea[0]!.currentDP).toBe(5000);
  });
});
