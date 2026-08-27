import { describe, expect, it } from "vitest";
import { EffectTiming, getCardDefinition } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./BT26-087.js";
import "../index.js";

describe("BT26-087 Toya Kuga", () => {
  it("compiles start-main return/memory, on-play draw, and Security play", () => {
    expect(getCardDefinition("BT26-087")).toMatchObject({
      nameEn: "Toya Kuga",
      colors: ["Red"],
      kinds: ["Tamer"],
      playCost: 3,
      types: ["TS"],
    });
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
    expect(compiled.effects.map((e) => e.trigger)).toEqual(["StartOfYourMainPhase", "OnPlay", "Security"]);
    expect(compiled.effects[0]?.actions[0]).toMatchObject({
      kind: "CostGatedBlock",
      optional: true,
      abortOnDecline: true,
      cost: { kind: "return", to: "deckBottom" },
      actions: [
        { kind: "GainMemory", amount: 1 },
        { target: { filter: { nameOrTrait: [{ tokens: ["Giant Slayer"], match: "nameExact" }] } } },
      ],
    });
    expect(compiled.effects[1]?.actions[0]).toMatchObject({
      kind: "CostGatedBlock",
      optional: true,
      cost: { kind: "trash" },
      actions: [{ kind: "Draw", amount: 2 }],
    });
    expect(compiled.effects[2]).toMatchObject({
      isSecurity: true,
      actions: [{ kind: "PlayWithoutCost", payCost: false, target: { isSelf: true } }],
    });
  });
  it("returns a TS Digimon for memory, then may recover Giant Slayer", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT26-087", as: "toya" }],
          trash: [
            { card: "BT26-021", as: "tsCost" },
            { card: "BT1-009", as: "nonTs" },
            { card: "BT26-085", as: "giantSlayer" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 0;
    await advance(s.engine).fire(EffectTiming.OnStartMainPhase, s.perm("toya"));

    expect(s.state.memory).toBe(1);
    expect(s.state.players[0]!.deck.at(-1)?.instanceId).toBe(s.inst("tsCost").instanceId);
    expect(s.state.players[0]!.trash.map(({ instanceId }) => instanceId)).toContain(s.inst("nonTs").instanceId);
    expect(s.state.players[0]!.hand.some(({ instanceId }) => instanceId === s.inst("giantSlayer").instanceId)).toBe(
      true,
    );
  });

  it("trashes any TS card from hand to draw two on play", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT26-087", as: "toya" }],
          hand: [
            { card: "BT26-088", as: "tsTamer" },
            { card: "BT1-009", as: "nonTs" },
          ],
          deck: [{ card: "BT1-001" }, { card: "BT1-002" }, { card: "BT1-003" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );

    await advance(s.engine).fire(EffectTiming.OnPlay, s.perm("toya"));
    await settle(() => s.state.players[0]!.trash.some((card) => card.instanceId === s.inst("tsTamer").instanceId));

    expect(s.state.players[0]!.deck).toHaveLength(1);
    expect(s.state.players[0]!.hand.map(({ instanceId }) => instanceId)).toContain(s.inst("nonTs").instanceId);
    expect(s.state.players[0]!.hand).toHaveLength(3);
  });

  it("does not return Giant Slayer when the TS return cost is unavailable", async () => {
    const s = setupEngine(
      { 0: { battleArea: [{ card: "BT26-087", as: "toya" }], trash: [{ card: "BT26-085", as: "giantSlayer" }] } },
      { autoDeclineOptional: true },
    );
    s.state.memory = 0;

    await advance(s.engine).fire(EffectTiming.OnStartMainPhase, s.perm("toya"));

    expect(s.state.memory).toBe(0);
    expect(s.state.players[0]!.trash.some(({ cardId }) => cardId === "BT26-085")).toBe(true);
    expect(s.state.players[0]!.hand).toHaveLength(0);
  });

  it("cannot pay the start-main cost with a TS Tamer", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT26-087", as: "toya" }],
          trash: [{ card: "BT26-088", as: "tsTamer" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();

    await advance(s.engine).fire(EffectTiming.OnStartMainPhase, s.perm("toya"));

    expect(s.state.memory).toBe(0);
    expect(s.state.players[0]!.trash.some(({ instanceId }) => instanceId === s.inst("tsTamer").instanceId)).toBe(true);
  });

  it("may decline each cost without moving cards or drawing", async () => {
    const start = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT26-087", as: "toya" }],
          trash: [
            { card: "BT26-021", as: "tsCost" },
            { card: "BT26-085", as: "giantSlayer" },
          ],
        },
      },
      { autoDeclineOptional: true },
    );
    await start.ready();
    await advance(start.engine).fire(EffectTiming.OnStartMainPhase, start.perm("toya"));

    expect(start.state.memory).toBe(0);
    expect(start.state.players[0]!.trash).toHaveLength(2);
    expect(start.state.players[0]!.hand).toHaveLength(0);

    const onPlay = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT26-087", as: "toya" }],
          hand: [{ card: "BT26-088", as: "tsCost" }],
          deck: ["BT1-001", "BT1-002"],
        },
      },
      { autoDeclineOptional: true },
    );
    await onPlay.ready();
    await advance(onPlay.engine).fire(EffectTiming.OnPlay, onPlay.perm("toya"));

    expect(onPlay.state.players[0]!.hand).toHaveLength(1);
    expect(onPlay.state.players[0]!.deck).toHaveLength(2);
    expect(onPlay.state.players[0]!.trash).toHaveLength(0);
  });

  it("plays itself without paying its cost when checked in security", async () => {
    const s = setupEngine({
      0: { security: [{ card: "BT26-087", as: "toya" }] },
      1: { battleArea: [{ card: "AD1-001", as: "attacker" }] },
    });
    s.state.turnSeat = 1;
    const toyaId = s.inst("toya").instanceId;

    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some(({ topCard }) => topCard.instanceId === toyaId));

    expect(s.state.players[0]!.trash.some(({ instanceId }) => instanceId === toyaId)).toBe(false);
    expect(s.state.memory).toBe(0);
  });
});
