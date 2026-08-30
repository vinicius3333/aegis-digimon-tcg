import { describe, expect, it } from "vitest";
import { EffectTiming, type PlayerState } from "@aegis/shared";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { advance } from "../../engine/testkit/advance.js";
import "../BT1/BT1-048.js";
import "./BT2-039.js";

describe("BT2-039 Magnadramon", () => {
  it("recovers two cards when its owner has three or fewer security cards", async () => {
    const s = setupEngine({
      0: {
        hand: [{ card: "BT2-039", as: "source" }],
        security: ["BT1-049"],
        deck: [
          { card: "BT1-050", as: "recoveryA" },
          { card: "BT1-051", as: "recoveryB" },
          { card: "BT1-052", as: "notRecovered" },
        ],
      },
    });
    const player = s.state.players[0] as PlayerState;
    s.state.memory = 11;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("source").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => player.security.length === 3);
    expect(player.deck.map((card) => card.instanceId)).toEqual([s.inst("notRecovered").instanceId]);
    expect(player.security.slice(0, 2).map((card) => card.instanceId)).toEqual([
      s.inst("recoveryB").instanceId,
      s.inst("recoveryA").instanceId,
    ]);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("does not recover when played with 4 security cards", async () => {
    const s = setupEngine({
      0: {
        hand: [{ card: "BT2-039", as: "source" }],
        security: ["BT1-049", "BT1-050", "BT1-051", "BT1-052"],
        deck: [{ card: "BT1-053", as: "deckTop" }],
      },
    });
    s.state.memory = 11;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("source").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.battleArea.length === 1);

    expect(s.state.players[0]!.security).toHaveLength(4);
    expect(s.state.players[0]!.deck[0]!.instanceId).toBe(s.inst("deckTop").instanceId);
  });

  it("may play a yellow level 3 Digimon from hand without paying its cost when attacking", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT2-039", as: "magnadramon", under: ["BT2-037"] }],
          hand: [{ card: "BT1-048", as: "played" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const instanceId = s.inst("played").instanceId;
    await advance(s.engine).fire(EffectTiming.OnUseAttack, s.perm("magnadramon"));
    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.instanceId === instanceId)).toBe(true);
  });

  it("Q1011 allows declining the optional level 3 play", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT2-039", as: "magnadramon", under: ["BT2-037"] }],
          hand: [{ card: "BT1-048", as: "candidate" }],
        },
      },
      { autoAcceptOptional: false },
    );

    const attackEffect = advance(s.engine).fire(EffectTiming.OnUseAttack, s.perm("magnadramon"));
    await settle(() => s.state.pendingDecision?.kind === "optional");
    const decision = s.state.pendingDecision!;
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: decision.decisionId,
        response: { kind: "optional", accept: false },
      }),
    ).toEqual({ ok: true });
    await attackEffect;

    expect(s.state.players[0]!.hand[0]!.instanceId).toBe(s.inst("candidate").instanceId);
    expect(s.state.players[0]!.battleArea).toHaveLength(1);
  });

  it("Q1012 activates the On Play effect of the level 3 played while attacking", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT2-039", as: "magnadramon", under: ["BT2-037"] }],
          hand: [{ card: "BT1-048", as: "patamon" }],
          deck: ["BT1-087", "BT1-010", "BT1-011", "BT1-012"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );

    await advance(s.engine).fire(EffectTiming.OnUseAttack, s.perm("magnadramon"));
    await settle(() => s.state.players[0]!.hand.some((card) => card.cardId === "BT1-087"));

    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.cardId === "BT1-048")).toBe(true);
    expect(s.state.players[0]!.hand.some((card) => card.cardId === "BT1-087")).toBe(true);
  });
});
