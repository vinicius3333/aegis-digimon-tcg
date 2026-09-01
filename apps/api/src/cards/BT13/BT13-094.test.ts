import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { irNode } from "../../engine/testkit/irNode.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { GRANTED_EFFECT_LIBRARY } from "../../engine/effects/interpreter/grantedEffects.js";
import { compiled } from "./BT13-094.js";

describe("BT13-094 BT13-094", () => {
  it("registers the exact Biyomon deletion grant in the public effect library", () => {
    const effectText = irNode(compiled.effects[1]?.actions[0])?.effectText;
    expect(GRANTED_EFFECT_LIBRARY[effectText!]).toMatchObject({
      trigger: "OnDeletion",
      actions: [
        {
          kind: "PlayWithoutCost",
          from: ["hand", "trash"],
          payCost: false,
          optional: true,
          target: {
            filter: { kind: ["Digimon"], nameOrTrait: [{ match: "nameExact", tokens: ["Biyomon"] }] },
            count: 1,
          },
        },
      ],
    });
  });

  it("matches Kristy Damon's printed phase, aura, and security effects", () => {
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
    expect(compiled.effects[0]).toMatchObject({
      trigger: "StartOfYourMainPhase",
      actions: [
        {
          kind: "GainMemory",
          amount: 1,
          condition: {
            kind: "youHave",
            filter: {
              controllerDefault: "mine",
              kind: ["Digimon"],
              nameOrTrait: [{ match: "trait", tokens: ["Avian", "Bird"] }],
            },
          },
        },
      ],
    });
    expect(compiled.effects[1]).toMatchObject({
      trigger: "OnPlay",
      actions: [
        {
          kind: "GrantAuraToOpponents",
          target: { filter: { controller: "mine", kind: ["Digimon"] }, count: 1 },
          effectText: "[On Deletion] You may play 1 [Biyomon] from your hand or trash without paying the cost.",
          duration: "untilOpponentTurnEnd",
        },
      ],
    });
    expect(compiled.effects[2]).toMatchObject({
      trigger: "Security",
      isSecurity: true,
      actions: [
        { kind: "PlayWithoutCost", target: { filter: { isSelfRef: true }, count: 1, isSelf: true }, payCost: false },
      ],
    });
  });

  it("loads the compiled implementation into a live permanent", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT13-094", as: "card" }] } });
    await s.ready();
    expect(s.perm("card").topCard?.cardId).toBe("BT13-094");
  });

  it("gains memory on real entry to the main phase when an Avian is present", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "BT13-094", as: "kristy" },
          { card: "BT13-079", as: "falcomon" },
        ],
        hand: ["BT1-012"],
      },
    });
    // Keep a legal Main action available so production does not auto-end the
    // phase immediately after resolving its entry window.
    s.state.memory = 3;
    await s.ready();
    const turn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(0);
    // Main opens before the start-of-main-phase effect continuation finishes;
    // settle it while the turn is intentionally still blocked in Main.
    await settle(() => s.state.memory === 4);
    expect(s.state.memory).toBe(4);
    advance(s.engine).endMainPhaseIfOpen(0);
    await turn;
  });

  it("plays itself when a real security check reveals Kristy", async () => {
    const s = setupEngine(
      {
        0: { security: [{ card: "BT13-094", as: "kristy" }] },
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
    await settle(() => s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.cardId === "BT13-094"));
    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.cardId === "BT13-094")).toBe(true);
  });

  it("grants the deletion play to one own Digimon and plays an exact Biyomon from hand", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT13-008", as: "recipient" }],
          hand: [
            { card: "BT13-094", as: "kristy" },
            { card: "BT1-012", as: "biyomon" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("kristy").instanceId })).toEqual({
      ok: true,
    });
    await settle(() =>
      s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.instanceId === s.inst("kristy").instanceId),
    );
    const recipientPermanentId = s.perm("recipient").permanentId;
    await advance(s.engine).verb.deletePermanent([recipientPermanentId]);
    await settle(() => s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.cardId === "BT1-012"));
    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.cardId === "BT1-012")).toBe(true);
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("biyomon").instanceId)).toBe(false);
  });
});
