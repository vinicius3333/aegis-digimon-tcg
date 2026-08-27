import { describe, expect, it } from "vitest";
import { EffectTiming, getCardDefinition } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./BT26-096.js";
import "../index.js";

describe("BT26-096 Kosuke Misono", () => {
  it("compiles the exact catalog, memory setter, paid-play union, and Security effect", () => {
    expect(getCardDefinition("BT26-096")).toMatchObject({
      nameEn: "Kosuke Misono",
      colors: ["Purple"],
      kinds: ["Tamer"],
      playCost: 3,
      types: ["TS"],
    });
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
    expect(compiled.effects.find((effect) => effect.trigger === "Security")).toMatchObject({
      isSecurity: true,
      actions: [{ kind: "PlayWithoutCost", payCost: false, target: { isSelf: true } }],
    });
    expect(compiled.effects.find((effect) => effect.trigger === "StartOfYourTurn")).toMatchObject({
      actions: [{ kind: "SetMemory", value: 3, condition: { kind: "memoryAtMost", value: 2 } }],
    });
    expect(compiled.effects.find((effect) => effect.trigger === "Main")?.actions[0]).toMatchObject({
      kind: "PlayWithoutCost",
      from: ["hand", "trash"],
      payCost: true,
      reduceCostBy: 2,
      optional: true,
      target: {
        filter: {
          kind: ["Digimon"],
          nameOrTrait: [{ tokens: ["Chronomon"], match: "text" }],
        },
        orFilters: [
          {
            kind: ["Tamer"],
            nameOrTrait: [{ tokens: ["TS"], match: "trait" }],
          },
        ],
      },
      cost: { kind: "return", to: "deckBottom", target: { filter: { isSelfRef: true } } },
    });
  });

  it("sets memory to 3 at two or less and leaves higher memory unchanged", async () => {
    const low = setupEngine({ 0: { battleArea: [{ card: "BT26-096", as: "kosuke" }] } });
    low.state.memory = 2;
    await advance(low.engine).fire(EffectTiming.OnStartTurn, low.perm("kosuke"));
    expect(low.state.memory).toBe(3);

    const opponentSide = setupEngine({ 0: { battleArea: [{ card: "BT26-096", as: "kosuke" }] } });
    opponentSide.state.memory = -4;
    await advance(opponentSide.engine).fire(EffectTiming.OnStartTurn, opponentSide.perm("kosuke"));
    expect(opponentSide.state.memory).toBe(3);

    const high = setupEngine({ 0: { battleArea: [{ card: "BT26-096", as: "kosuke" }] } });
    high.state.memory = 3;
    await advance(high.engine).fire(EffectTiming.OnStartTurn, high.perm("kosuke"));
    expect(high.state.memory).toBe(3);
  });

  it("returns itself to the deck bottom before playing a Chronomon-text Digimon at cost minus 2", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT26-096", as: "kosuke" }],
          hand: [
            { card: "BT26-009", as: "target" },
            { card: "BT26-017", as: "nearMatch" },
            { card: "BT1-009", as: "unrelated" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 1;
    const kosukeId = s.perm("kosuke").topCard.instanceId;

    await advance(s.engine).fire(EffectTiming.OnDeclaration, s.perm("kosuke"));
    await settle(() =>
      s.state.players[0]!.battleArea.some((p) => p.topCard?.instanceId === s.inst("target").instanceId),
    );

    expect(s.state.memory).toBe(0);
    expect(s.state.players[0]!.deck.at(-1)?.instanceId).toBe(kosukeId);
    expect(s.state.players[0]!.hand.map(({ cardId }) => cardId)).toEqual(["BT26-017", "BT1-009"]);
  });

  it("returns itself to play a TS Tamer from trash with its cost reduced by 2", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT26-096", as: "kosuke" }],
          trash: [
            { card: "BT26-087", as: "target" },
            { card: "BT26-017", as: "nearMatch" },
            { card: "BT1-009", as: "unrelated" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 1;
    const kosukeId = s.inst("kosuke").instanceId;

    await advance(s.engine).fire(EffectTiming.OnDeclaration, s.perm("kosuke"));
    await settle(() =>
      s.state.players[0]!.battleArea.some(({ topCard }) => topCard.instanceId === s.inst("target").instanceId),
    );

    expect(s.state.memory).toBe(0);
    expect(s.state.players[0]!.deck.at(-1)?.instanceId).toBe(kosukeId);
    expect(s.state.players[0]!.trash.some(({ instanceId }) => instanceId === s.inst("target").instanceId)).toBe(false);
    expect(s.state.players[0]!.trash.map(({ cardId }) => cardId)).toEqual(["BT26-017", "BT1-009"]);
  });

  it("does not return itself for an unrelated card", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT26-096", as: "kosuke" }],
          hand: [{ card: "BT1-009", as: "unrelated" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );

    await advance(s.engine).fire(EffectTiming.OnDeclaration, s.perm("kosuke"));

    expect(s.state.players[0]!.battleArea.map(({ topCard }) => topCard.cardId)).toContain("BT26-096");
    expect(s.state.players[0]!.hand.map(({ cardId }) => cardId)).toContain("BT1-009");
  });

  it("does not return itself when the eligible paid play is unaffordable", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT26-096", as: "kosuke" }],
          hand: [{ card: "BT26-078", as: "target" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 0;
    await s.ready();

    await advance(s.engine).fire(EffectTiming.OnDeclaration, s.perm("kosuke"));

    expect(s.state.players[0]!.battleArea.map(({ topCard }) => topCard.cardId)).toContain("BT26-096");
    expect(s.state.players[0]!.hand.map(({ cardId }) => cardId)).toContain("BT26-078");
    expect(s.state.players[0]!.deck).toHaveLength(0);
    expect(s.state.memory).toBe(0);
  });

  it("may decline an eligible play without returning itself or paying memory", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT26-096", as: "kosuke" }],
          hand: [{ card: "BT26-009", as: "target" }],
        },
      },
      { autoDeclineOptional: true },
    );
    s.state.memory = 1;
    await s.ready();

    await advance(s.engine).fire(EffectTiming.OnDeclaration, s.perm("kosuke"));

    expect(s.state.players[0]!.battleArea.map(({ topCard }) => topCard.cardId)).toContain("BT26-096");
    expect(s.state.players[0]!.hand.map(({ cardId }) => cardId)).toContain("BT26-009");
    expect(s.state.players[0]!.deck).toHaveLength(0);
    expect(s.state.memory).toBe(1);
  });

  it("plays itself without paying its cost when checked in security", async () => {
    const s = setupEngine({
      0: { security: [{ card: "BT26-096", as: "kosuke" }] },
      1: { battleArea: [{ card: "AD1-001", as: "attacker" }] },
    });
    s.state.turnSeat = 1;
    const kosukeId = s.inst("kosuke").instanceId;

    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some(({ topCard }) => topCard.instanceId === kosukeId));

    expect(s.state.players[0]!.trash.some(({ instanceId }) => instanceId === kosukeId)).toBe(false);
    expect(s.state.memory).toBe(0);
  });
});
