import { describe, it, expect } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { advance } from "../../engine/testkit/advance.js";
import "../index.js";

describe("P-094 [On Play] budget-delete an opponent permanent within a cost-3 budget", () => {
  it("deletes the single eligible opponent Digimon (play cost within budget)", async () => {
    const s = setupEngine(
      {
        0: { hand: [{ card: "P-094", as: "destromon" }] },
        1: { battleArea: [{ card: "BT1-009", dp: 3000, as: "target" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true },
    );
    const p1 = s.state.players[1]!;
    const target = s.perm("target");
    const targetPermanentId = target.permanentId;
    const targetTop = target.topCard!;
    s.state.memory = 10;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("destromon").instanceId })).toEqual({
      ok: true,
    });

    await settle(() => p1.trash.some((c) => c.instanceId === targetTop.instanceId));

    expect(p1.trash.some((c) => c.instanceId === targetTop.instanceId)).toBe(true);
    expect(p1.battleArea.some((perm) => perm.permanentId === targetPermanentId)).toBe(false);
  });

  it("redirects once per turn, then resets on the next natural opponent turn", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            {
              card: "BT11-111",
              as: "galacticmon",
              under: ["P-094", "BT11-061", "BT11-061", "BT11-061", "BT11-061"],
            },
          ],
          security: ["BT1-009", "BT1-009"],
          deck: ["BT1-009", "BT1-009", "BT1-009", "BT1-009"],
        },
        1: {
          battleArea: [
            { card: "BT1-010", as: "attacker1" },
            { card: "BT1-010", as: "attacker2" },
            { card: "BT1-010", as: "attacker3" },
          ],
          deck: ["BT1-009", "BT1-009", "BT1-009", "BT1-009"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.turnSeat = 1;
    await s.ready();
    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(1);

    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker1").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.trash.length === 1);

    expect(s.state.players[0]!.deck.filter(({ cardId }) => cardId === "BT11-061")).toHaveLength(2);
    expect(s.perm("galacticmon").stack.filter(({ cardId }) => cardId === "BT11-061")).toHaveLength(2);

    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker2").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.security.length === 1);
    expect(s.state.players[0]!.deck.filter(({ cardId }) => cardId === "BT11-061")).toHaveLength(2);

    expect(s.engine.applyIntent(1, { type: "endPhase" })).toEqual({ ok: true });
    await advance(s.engine).waitForMainPhase(0);
    expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
    await advance(s.engine).waitForMainPhase(1);

    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker3").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.trash.length === 2);
    expect(s.state.players[0]!.deck.filter(({ cardId }) => cardId === "BT11-061")).toHaveLength(4);
    expect(s.perm("galacticmon").stack.filter(({ cardId }) => cardId === "BT11-061")).toHaveLength(0);
    expect(s.engine.applyIntent(1, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  it("does not redirect when the Galacticmon stack has fewer than 2 Vemmon", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT11-111", as: "galacticmon", under: ["P-094", "BT11-061"] }],
          security: ["BT1-009"],
        },
        1: { battleArea: [{ card: "BT1-010", as: "attacker" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.turnSeat = 1;
    await s.ready();

    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.security.length === 0);

    expect(s.state.players[0]!.deck.filter(({ cardId }) => cardId === "BT11-061")).toHaveLength(0);
    expect(s.perm("galacticmon").stack.filter(({ cardId }) => cardId === "BT11-061")).toHaveLength(1);
  });

  it("allows declining the optional redirect without returning Vemmon", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT11-111", as: "galacticmon", under: ["P-094", "BT11-061", "BT11-061"] }],
          security: ["BT1-009"],
        },
        1: { battleArea: [{ card: "BT1-010", as: "attacker" }] },
      },
      { autoAcceptOptional: false, autoSelectCards: true },
    );
    s.state.turnSeat = 1;
    await s.ready();
    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.decisions.some(({ req }) => req.kind === "optional" && req.sourceCardId === "P-094"));
    const decision = s.decisions.find(({ req }) => req.kind === "optional" && req.sourceCardId === "P-094")!.req;
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: decision.decisionId,
        response: { kind: "optional", accept: false },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.security.length === 0);
    expect(s.state.players[0]!.deck.filter(({ cardId }) => cardId === "BT11-061")).toHaveLength(0);
    expect(s.perm("galacticmon").stack.filter(({ cardId }) => cardId === "BT11-061")).toHaveLength(2);
  });
});

describe("P-094 [DigiXros -1] [Snatchmon] x 4 [Vemmon]", () => {
  const materialCards = ["BT11-065", "BT11-061", "BT18-060", "BT21-056", "BT11-061"];

  it("places Snatchmon and four Vemmon from hand for a cost of 5", async () => {
    const s = setupEngine({
      0: {
        hand: [{ card: "P-094", as: "source" }, ...materialCards.map((card, index) => ({ card, as: `m${index}` }))],
      },
    });
    s.state.memory = 5;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "playCard",
        instanceId: s.inst("source").instanceId,
        digiXros: { materialInstanceIds: materialCards.map((_, index) => s.inst(`m${index}`).instanceId) },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some(({ topCard }) => topCard.cardId === "P-094"));
    const played = s.state.players[0]!.battleArea.find(({ topCard }) => topCard.cardId === "P-094")!;
    expect(played.stack).toHaveLength(5);
    expect(s.state.memory).toBe(0);
  });

  it("rejects a material that is neither [Snatchmon] nor [Vemmon]", () => {
    const s = setupEngine({
      0: {
        hand: [
          { card: "P-094", as: "source" },
          { card: "BT11-065", as: "snatchmon" },
          { card: "EX9-005", as: "wrong" },
        ],
      },
    });
    s.state.memory = 10;
    expect(
      s.engine.applyIntent(0, {
        type: "playCard",
        instanceId: s.inst("source").instanceId,
        digiXros: { materialInstanceIds: [s.inst("snatchmon").instanceId, s.inst("wrong").instanceId] },
      }),
    ).toEqual(expect.objectContaining({ ok: false }));
  });
});
