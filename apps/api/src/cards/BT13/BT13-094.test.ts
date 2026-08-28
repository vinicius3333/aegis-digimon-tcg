import { EffectTiming } from "@aegis/shared";
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

  it("grants the deletion play to one own Digimon and plays an exact Biyomon from hand", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT13-008", as: "recipient" }],
          hand: [{ card: "BT13-094", as: "kristy" }, { card: "BT1-012", as: "biyomon" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("kristy").instanceId })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.instanceId === s.inst("kristy").instanceId));
    const recipientPermanentId = s.perm("recipient").permanentId;
    await advance(s.engine).verb.deletePermanent([recipientPermanentId]);
    await settle(() => s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.cardId === "BT1-012"));
    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.cardId === "BT1-012")).toBe(true);
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("biyomon").instanceId)).toBe(false);
  });
});
