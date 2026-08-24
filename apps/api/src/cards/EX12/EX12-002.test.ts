import { describe, expect, it } from "vitest";
import { irNode } from "../../engine/testkit/irNode.js";
import { Zone } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { registeredCompiledCards } from "../../engine/effects/interpreter/compiledCards.js";
import "../index.js";

describe("EX12-002 Mococomon", () => {
  it("digivolves its host into an SW card from hand for two less memory when another SW Digimon is played", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "EX12-012", as: "host", under: ["EX12-006", "EX12-002"] },
            { card: "EX12-022", as: "played" },
          ],
          hand: [{ card: "EX12-045", as: "target" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 0;
    await s.ready();

    await advance(s.engine).fireSubTrigger("whenPlayed", {
      subjectPermanentId: s.perm("played").permanentId,
    });
    await settle(() => s.perm("host").topCard?.cardId === "EX12-045");

    const host = s.perm("host");
    expect(host.topCard?.cardId).toBe("EX12-045");
    expect(host.stack.map((card) => card.cardId)).toContain("EX12-002");
    expect(s.state.memory).toBe(-1);
    expect(s.state.players[0]!.hand.some((card) => card.cardId === "EX12-045")).toBe(false);
  });

  it("does not react to a non-SW Digimon or an opponent's SW Digimon", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "EX12-006", as: "host", under: ["EX12-002"] },
            { card: "BT1-009", as: "nonSw" },
          ],
          hand: [{ card: "EX12-012", as: "target" }],
        },
        1: { battleArea: [{ card: "EX12-022", as: "opponentSw" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();

    await advance(s.engine).fireSubTrigger("whenPlayed", {
      subjectPermanentId: s.perm("nonSw").permanentId,
    });
    await advance(s.engine).fireSubTrigger("whenPlayed", {
      subjectPermanentId: s.perm("opponentSw").permanentId,
    });
    await settle();

    expect(s.perm("host").topCard?.cardId).toBe("EX12-006");
    expect(s.state.players[0]!.hand.some((card) => card.cardId === "EX12-012")).toBe(true);
  });

  it("does not trigger during the opponent's turn", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "EX12-006", as: "host", under: ["EX12-002"] },
            { card: "EX12-022", as: "played" },
          ],
          hand: [{ card: "EX12-012", as: "target" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.turnSeat = 1;
    await s.ready();

    await advance(s.engine).fireSubTrigger("whenPlayed", {
      subjectPermanentId: s.perm("played").permanentId,
    });
    await settle();

    expect(s.perm("host").topCard?.cardId).toBe("EX12-006");
    expect(s.state.players[0]!.hand.some((card) => card.cardId === "EX12-012")).toBe(true);
  });

  it("does not offer a legal Shambala card that lacks the SW trait", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "EX12-006", as: "host", under: ["EX12-002"] },
            { card: "EX12-022", as: "played" },
          ],
          hand: [{ card: "EX12-011", as: "nearMatch" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();

    await advance(s.engine).fireSubTrigger("whenPlayed", {
      subjectPermanentId: s.perm("played").permanentId,
    });
    await settle();

    expect(s.state.pendingDecision).toBeUndefined();
    expect(s.perm("host").topCard?.cardId).toBe("EX12-006");
    expect(s.state.players[0]!.hand.some((card) => card.cardId === "EX12-011")).toBe(true);
  });

  it("does not react when the played event names the inherited source itself", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX12-006", as: "host", under: ["EX12-002"] }],
          hand: [{ card: "EX12-012", as: "target" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();

    await advance(s.engine).fireSubTrigger("whenPlayed", {
      subjectPermanentId: s.perm("host").permanentId,
    });
    await settle();

    expect(s.perm("host").topCard?.cardId).toBe("EX12-006");
    expect(s.state.players[0]!.hand.some((card) => card.cardId === "EX12-012")).toBe(true);
  });

  it("does not trigger a second time in the same turn", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "EX12-006", as: "host", under: ["EX12-002"] },
            { card: "EX12-022", as: "played" },
          ],
          hand: [{ card: "EX12-012", as: "first" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();

    await advance(s.engine).fireSubTrigger("whenPlayed", {
      subjectPermanentId: s.perm("played").permanentId,
    });
    await settle(() => s.perm("host").topCard?.cardId === "EX12-012");
    s.give(0, Zone.Hand, "EX12-045");
    await advance(s.engine).fireSubTrigger("whenPlayed", {
      subjectPermanentId: s.perm("played").permanentId,
    });
    await settle();

    expect(s.perm("host").topCard?.cardId).toBe("EX12-012");
    expect(s.state.players[0]!.hand.some((card) => card.cardId === "EX12-045")).toBe(true);
  });

  it("may decline the digivolution, consuming this activation of the once-per-turn effect", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "EX12-006", as: "host", under: ["EX12-002"] },
            { card: "EX12-022", as: "played" },
          ],
          hand: [{ card: "EX12-012", as: "target" }],
        },
      },
      { autoSelectCards: true },
    );
    await s.ready();

    const first = advance(s.engine).fireSubTrigger("whenPlayed", {
      subjectPermanentId: s.perm("played").permanentId,
    });
    await settle(() => s.state.pendingDecision?.kind === "optional");
    const declined = s.state.pendingDecision!;
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: declined.decisionId,
        response: { kind: "optional", accept: false },
      }),
    ).toEqual({ ok: true });
    await first;

    await advance(s.engine).fireSubTrigger("whenPlayed", {
      subjectPermanentId: s.perm("played").permanentId,
    });
    await settle();

    expect(s.state.pendingDecision).toBeUndefined();
    expect(s.perm("host").topCard?.cardId).toBe("EX12-006");
    expect(s.state.players[0]!.hand.some((card) => card.cardId === "EX12-012")).toBe(true);
  });

  it("resolves the newly derived When Digivolving effect before the pending On Play effect (Q6723)", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX12-006", as: "host", under: ["EX12-002"] }],
          hand: [
            { card: "EX12-022", as: "played" },
            { card: "EX12-012", as: "target" },
            { card: "EX12-025", as: "cost" },
          ],
          deck: ["EX12-006", "EX12-012", "EX12-022", "EX12-025", "EX12-039"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoOrderTriggers: false, preferInstanceIds: preferred },
    );
    preferred.push(s.inst("target").instanceId);
    s.state.memory = 10;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("played").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.pendingDecision?.kind === "orderTriggers");
    const ordering = s.state.pendingDecision!;
    const request = s.decisions.find(({ req }) => req.decisionId === ordering.decisionId)!.req;
    const ids = request.options?.triggerCardIds ?? [];
    const keys = request.options?.triggerKeys ?? [];
    expect(ids).toEqual(expect.arrayContaining(["EX12-002", "EX12-022"]));
    const mococomonIndex = ids.indexOf("EX12-002");
    expect(mococomonIndex).toBeGreaterThanOrEqual(0);
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: ordering.decisionId,
        response: { kind: "orderTriggers", order: [keys[mococomonIndex]!] },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.events.some((event) => event.kind === "effectResolved" && event.sourceCardId === "EX12-022"));

    const resolved = s.events
      .filter((event) => event.kind === "effectResolved")
      .map((event) => event.sourceCardId)
      .filter((cardId) => cardId === "EX12-002" || cardId === "EX12-012" || cardId === "EX12-022");
    expect(resolved).toEqual(["EX12-002", "EX12-012", "EX12-022"]);
  });

  it("encodes an optional once-per-turn SW digivolution with a two-memory reduction", () => {
    const effect = registeredCompiledCards.get("EX12-002")!.effects[0]!;
    expect(effect.trigger).toBe("YourTurn");
    expect(effect.frequency).toBe("OncePerTurn");
    expect(effect.isInherited).toBe(true);
    expect(effect.actions[0]).toMatchObject({
      kind: "SubTrigger",
      event: "whenPlayed",
      sourceFilter: {
        controller: "mine",
        excludeSelf: true,
        kind: ["Digimon"],
        nameOrTrait: [{ match: "trait", tokens: ["SW"] }],
      },
    });
    expect(irNode(effect.actions[0]!).actions[0]).toMatchObject({
      kind: "Digivolve",
      target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
      into: { kind: ["Digimon"], nameOrTrait: [{ match: "trait", tokens: ["SW"] }] },
      from: ["hand"],
      payCost: true,
      reduceCost: 2,
      optional: true,
    });
  });
});
