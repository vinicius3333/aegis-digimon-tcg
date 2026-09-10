import { getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { observe } from "../../engine/testkit/observe.js";
import { setupEngine, settle, settleAcrossTimers } from "../../engine/testkit/harness.js";
import { compiled } from "./EX5-048.js";
import "../index.js";

describe("EX5-048 Etemon", () => {
  it("matches the catalog and preserves every printed clause in IR", () => {
    expect(getCardDefinition("EX5-048")).toMatchObject({
      cardId: "EX5-048",
      nameEn: "Etemon",
      colors: ["Black", "Yellow"],
      kinds: ["Digimon"],
      level: 5,
      playCost: 7,
      dp: 7000,
      forms: ["Ultimate"],
      attributes: ["Virus"],
      types: ["Puppet"],
      effectText: expect.stringContaining("Until the end of your opponent's turn"),
      inheritedEffectText: expect.stringContaining("reveal the top 3 cards of your deck"),
    });
    expect(compiled).toMatchObject({ coverage: "full", residual: [] });
    expect(compiled.digivolutionRequirement).toEqual([{ level: 4, names: ["Sukamon"], cost: 3, isAlternate: true }]);

    for (const trigger of ["OnPlay", "WhenDigivolving"]) {
      expect(compiled.effects?.find((entry) => entry.trigger === trigger)).toMatchObject({
        actions: [
          {
            kind: "ModifyDP",
            amount: -3000,
            duration: "untilOpponentTurnEnd",
            target: { bindAs: "dpTarget", count: 1, filter: { controller: "opponent", kind: ["Digimon"] } },
          },
          {
            kind: "GainEffect",
            duration: "untilOpponentTurnEnd",
            target: { fromSelectionRef: "dpTarget", count: 1 },
            grant: { trigger: "StartOfYourMainPhase", actions: [{ kind: "Attack" }] },
          },
        ],
      });
    }
    expect(compiled.effects?.find((entry) => entry.isInherited)).toMatchObject({
      trigger: "OpponentsTurn",
      isInherited: true,
      frequency: "OncePerTurn",
      actions: [
        {
          kind: "SubTrigger",
          event: "whenOpponentAttacks",
          actions: [
            {
              kind: "RevealAdd",
              revealCount: 3,
              optional: true,
              add: [
                {
                  count: 1,
                  to: "play",
                  optional: true,
                  filter: {
                    controllerDefault: "mine",
                    kind: ["Digimon"],
                    colors: ["Black", "Yellow"],
                    playCostLte: 3,
                  },
                },
              ],
              rest: "trash",
            },
          ],
        },
      ],
    });
  });

  it("publicly applies the play effect and expires the forced attack at opponent-turn end", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "EX5-048", as: "etemon" }],
          security: ["BT1-009", "BT1-010"],
          deck: ["BT1-011", "BT1-012"],
        },
        1: {
          battleArea: [{ card: "BT1-014", as: "target", dp: 10_000 }],
          security: ["BT1-009"],
          deck: ["BT1-011", "BT1-012"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();
    const loop = s.engine.startTurnLoop();
    const drive = advance(s.engine);
    await drive.waitForMainPhase(0);
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("etemon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.perm("target").currentDP === 7000);
    expect(s.perm("target").currentDP).toBe(7000);
    drive.endMainPhaseIfOpen(0);
    await drive.waitForMainPhase(1);
    await settleAcrossTimers(() => !observe(s.engine).isAttacking());
    expect(
      s.events.some(
        (event) =>
          event.kind === "attackDeclared" &&
          "attackerPermanentId" in event &&
          event.attackerPermanentId === s.perm("target").permanentId,
      ),
    ).toBe(true);
    drive.endMainPhaseIfOpen(1);
    await drive.waitForMainPhase(0);
    expect(s.perm("target").currentDP).toBe(10_000);
    expect(s.state.players[0]!.security).toHaveLength(1);
    expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  it("publicly applies the same -3000 and forced attack effect on the alternate evolution route", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT11-040", as: "base" }], hand: [{ card: "EX5-048", as: "etemon" }] },
        1: { battleArea: [{ card: "BT1-014", as: "target", dp: 10_000 }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true, preferInstanceIds: preferred },
    );
    preferred.push(s.perm("target").permanentId);
    s.state.memory = 3;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("etemon").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard.cardId === "EX5-048");
    expect(s.perm("base").stack.map((card) => card.cardId)).toEqual(["BT11-040"]);
    expect(s.state.memory).toBe(0);
    expect(s.perm("target").currentDP).toBe(7000);
  });

  it("resolves Q3625 through the real turn loop: simultaneous forced attacks yield only one attack", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT11-040", as: "base" }],
          hand: [
            { card: "EX5-048", as: "first" },
            { card: "EX5-048", as: "second" },
          ],
          security: ["BT1-009", "BT1-010", "BT1-012"],
          deck: ["BT1-013", "BT1-014"],
        },
        1: {
          battleArea: [
            { card: "BT1-014", as: "targetA", dp: 10_000 },
            { card: "BT1-014", as: "targetB", dp: 10_000 },
          ],
          security: ["BT1-009"],
          deck: ["BT1-011", "BT1-012"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true, preferInstanceIds: preferred },
    );
    preferred.push(s.perm("targetA").permanentId, s.perm("targetB").permanentId);
    s.state.memory = 10;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("first").instanceId })).toEqual({ ok: true });
    await settle(() => s.perm("targetA").currentDP === 7000);
    s.state.memory = 10;
    preferred.splice(0, preferred.length, s.perm("targetB").permanentId);
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("second").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("targetB").currentDP === 7000);
    expect(s.perm("base").stack.map((card) => card.cardId)).toEqual(["BT11-040"]);

    const loop = s.engine.startTurnLoop();
    const drive = advance(s.engine);
    await drive.waitForMainPhase(0);
    drive.endMainPhaseIfOpen(0);
    await drive.waitForMainPhase(1);
    await settleAcrossTimers(() => !observe(s.engine).isAttacking());
    const forced = s.events.filter(
      (event) =>
        event.kind === "attackDeclared" &&
        "attackerPermanentId" in event &&
        [s.perm("targetA").permanentId, s.perm("targetB").permanentId].includes(event.attackerPermanentId),
    );
    expect(forced).toHaveLength(1);
    expect(s.state.players[0]!.security).toHaveLength(2);
    drive.endMainPhaseIfOpen(1);
    expect(s.engine.applyIntent(1, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  it("plays exactly one eligible black/yellow card and trashes the other revealed cards from an inherited attack trigger", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX5-049", as: "host", under: ["EX5-048"] }],
          deck: [
            { card: "BT1-045", as: "eligible" },
            { card: "BT1-015", as: "firstTrash" },
            { card: "EX5-047", as: "secondTrash" },
          ],
          security: ["BT1-009"],
        },
        1: {
          battleArea: [{ card: "BT1-010", as: "attacker" }],
          security: ["BT1-009"],
          deck: ["BT1-011", "BT1-012"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    const loop = s.engine.startTurnLoop();
    const drive = advance(s.engine);
    await drive.waitForMainPhase(0);
    drive.endMainPhaseIfOpen(0);
    await drive.waitForMainPhase(1);
    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settleAcrossTimers(() => s.state.pendingDecision === undefined && s.state.players[0]!.deck.length === 0);
    expect(
      s.state.players[0]!.battleArea.some(
        (permanent) => permanent.topCard?.instanceId === s.inst("eligible").instanceId,
      ),
    ).toBe(true);
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toEqual(
      expect.arrayContaining([s.inst("firstTrash").instanceId, s.inst("secondTrash").instanceId]),
    );
    drive.endMainPhaseIfOpen(1);
    expect(s.engine.applyIntent(1, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  it("allows the inherited reveal to be declined publicly, leaving the deck and board unchanged", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX5-049", as: "host", under: ["EX5-048"] }],
          deck: [{ card: "BT1-045", as: "eligible" }, "BT1-015", "EX5-047"],
          security: ["BT1-009"],
        },
        1: {
          battleArea: [{ card: "BT1-010", as: "attacker" }],
          security: ["BT1-009"],
          deck: ["BT1-011", "BT1-012"],
        },
      },
      { autoSelectCards: true, autoDeclineOptional: false },
    );
    await s.ready();
    const loop = s.engine.startTurnLoop();
    const drive = advance(s.engine);
    await drive.waitForMainPhase(0);
    drive.endMainPhaseIfOpen(0);
    await drive.waitForMainPhase(1);
    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision?.kind === "optional");
    const decision = s.state.pendingDecision!;
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: decision.decisionId,
        response: { kind: "optional", accept: false },
      }),
    ).toEqual({ ok: true });
    await settleAcrossTimers(() => s.state.pendingDecision === undefined && !observe(s.engine).isAttacking());
    expect(s.state.players[0]!.deck.map((card) => card.cardId)).toEqual(["BT1-045", "BT1-015", "EX5-047"]);
    expect(s.state.players[0]!.battleArea).toHaveLength(1);
    drive.endMainPhaseIfOpen(1);
    expect(s.engine.applyIntent(1, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  it.each([
    { label: "Sukamon alternate", base: "BT11-040", alternate: true, legal: true, cost: 3 },
    { label: "black/yellow normal", base: "BT11-040", alternate: false, legal: true, cost: 4 },
    { label: "non-Sukamon alternate", base: "BT1-014", alternate: true, legal: false, cost: 3 },
  ])("checks the public $label evolution route", async ({ base, alternate, legal, cost }) => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: base, as: "base" }],
          hand: [{ card: "EX5-048", as: "etemon" }],
          deck: [{ card: "BT1-009", as: "bonus" }],
        },
      },
      { autoChooseOption: true },
    );
    s.state.memory = 10;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("etemon").instanceId,
        useAlternateCost: alternate,
      }).ok,
    ).toBe(legal);
    await settle();
    expect(s.perm("base").topCard.cardId).toBe(legal ? "EX5-048" : base);
    expect(s.perm("base").stack.map((card) => card.cardId)).toEqual(legal ? [base] : []);
    expect(s.state.memory).toBe(legal ? 10 - cost : 10);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toEqual(
      legal ? [s.inst("bonus").instanceId] : [s.inst("etemon").instanceId],
    );
  });
});
