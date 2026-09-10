import { getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "./EX2-017.js";
import { compiled } from "./EX2-058.js";
import "./EX2-058.js";

describe("EX2-058 Jeri Kato", () => {
  it("matches the catalog and typed IR", () => {
    expect(getCardDefinition("EX2-058")).toMatchObject({
      cardId: "EX2-058",
      nameEn: "Jeri Kato",
      colors: ["Blue"],
      kinds: ["Tamer"],
      playCost: 4,
      effectText:
        "[On Play] You may play 1 [Leomon] from your hand without paying its memory cost.[Opponent's Turn] When an opponent's Digimon attacks, you may suspend this Tamer to ＜Draw 1＞. (Draw 1 card from your deck.)",
      securityEffectText: "[Security] Play this card without paying its memory cost.",
    });
    expect(compiled).toMatchObject({
      effects: [
        {
          trigger: "OnPlay",
          actions: [
            {
              kind: "PlayWithoutCost",
              optional: true,
              from: ["hand"],
              target: { filter: { controller: "mine", nameOrTrait: [{ tokens: ["Leomon"], match: "nameExact" }] } },
              payCost: false,
            },
          ],
        },
        {
          trigger: "OpponentsTurn",
          actions: [
            {
              kind: "SubTrigger",
              event: "whenOpponentAttacks",
              optional: true,
              abortOnDecline: true,
              cost: { kind: "suspend" },
              actions: [{ kind: "Draw", controller: "mine", amount: 1 }],
            },
          ],
        },
        { trigger: "Security", isSecurity: true },
      ],
      coverage: "full",
      residual: [],
    });
  });

  it("may play Leomon from hand for free on play", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [
            { card: "EX2-058", as: "jeri" },
            { card: "EX2-017", as: "leomon" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoOrderTriggers: true },
    );
    s.state.memory = 10;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("jeri").instanceId })).toEqual({ ok: true });
    await settle(() =>
      s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.instanceId === s.inst("leomon").instanceId),
    );
    expect(
      s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.instanceId === s.inst("leomon").instanceId),
    ).toBe(true);
  });

  it("does not treat a longer Leomon name as exact [Leomon]", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [
            { card: "EX2-058", as: "jeri" },
            { card: "P-139", as: "leomonXAntibody" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoOrderTriggers: true },
    );
    s.state.memory = 10;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("jeri").instanceId })).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision === undefined);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toContain(s.inst("leomonXAntibody").instanceId);
    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.cardId === "P-139")).toBe(false);
  });

  it("plays from Security without paying its cost", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "EX2-050", as: "attacker" }], security: ["BT1-009"] },
      1: { security: [{ card: "EX2-058", as: "securityJeri" }] },
    });
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() =>
      s.state.players[1]!.battleArea.some((p) => p.topCard?.instanceId === s.inst("securityJeri").instanceId),
    );
    expect(
      s.state.players[1]!.battleArea.some((p) => p.topCard?.instanceId === s.inst("securityJeri").instanceId),
    ).toBe(true);
  });

  it("may suspend on the opponent's attack to draw 1", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX2-058", as: "jeri" }],
          deck: [{ card: "BT1-010", as: "drawn" }, "BT1-009", "BT1-011", "BT1-012"],
          security: ["BT1-013"],
        },
        1: {
          battleArea: [{ card: "EX2-050", as: "attacker" }],
          deck: ["BT1-009", "BT1-010", "BT1-011", "BT1-012"],
          security: ["BT1-013"],
        },
      },
      { autoOrderTriggers: true },
    );
    s.state.memory = 3;
    const turn = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    advance(s.engine).endMainPhaseIfOpen(0);
    await advance(s.engine).waitForMainPhase(1);
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
        response: { kind: "optional", accept: true },
      }),
    ).toEqual({ ok: true });
    for (let i = 0; i < 100 && !s.perm("jeri").isSuspended; i += 1) await Promise.resolve();
    expect(s.perm("jeri").isSuspended).toBe(true);
    await settle(() => s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("drawn").instanceId));
    expect(s.state.players[0]!.deck).toHaveLength(3);
    expect(s.state.players[0]!.hand).toContainEqual(
      expect.objectContaining({ instanceId: s.inst("drawn").instanceId }),
    );
    expect(s.engine.applyIntent(1, { type: "surrender" })).toEqual({ ok: true });
    await turn;
  });

  it("does not draw when the attack response is declined or during its own turn", async () => {
    const declined = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX2-058", as: "jeri" }],
          deck: [{ card: "BT1-010", as: "drawn" }, "BT1-009", "BT1-011", "BT1-012"],
          security: ["BT1-013"],
        },
        1: {
          battleArea: [{ card: "EX2-050", as: "attacker" }],
          deck: ["BT1-009", "BT1-010", "BT1-011", "BT1-012"],
          security: ["BT1-013"],
        },
      },
      { autoDeclineOptional: true },
    );
    declined.state.memory = 3;
    const declinedTurn = declined.engine.startTurnLoop();
    await advance(declined.engine).waitForMainPhase(0);
    advance(declined.engine).endMainPhaseIfOpen(0);
    await advance(declined.engine).waitForMainPhase(1);
    expect(
      declined.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: declined.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => !observe(declined.engine).isAttacking());
    expect(declined.perm("jeri").isSuspended).toBe(false);
    expect(declined.state.players[0]!.deck).toHaveLength(4);
    expect(declined.engine.applyIntent(1, { type: "surrender" })).toEqual({ ok: true });
    await declinedTurn;

    const ownTurn = setupEngine({
      0: {
        battleArea: [
          { card: "EX2-058", as: "jeri" },
          { card: "EX2-050", as: "attacker" },
        ],
        deck: [{ card: "BT1-009", as: "drawn" }],
        security: ["BT1-013"],
      },
      1: { security: ["BT1-014"] },
    });
    await ownTurn.ready();
    expect(
      ownTurn.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: ownTurn.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => !observe(ownTurn.engine).isAttacking());
    expect(ownTurn.perm("jeri").isSuspended).toBe(false);
    expect(ownTurn.state.players[0]!.deck).toHaveLength(1);
  });
});
