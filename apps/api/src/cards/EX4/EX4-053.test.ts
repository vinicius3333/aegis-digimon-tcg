import { describe, expect, it } from "vitest";
import { EffectTiming, getCardDefinition, Phase } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { playEx4Card } from "./livePlayTestHelpers.js";
import { ex4CardBehaviorTests } from "./livePlayTestHelpers.js";
import { compiled } from "./EX4-053.js";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";

describe("EX4-053 Falcomon", () => {
  it("matches the catalog and is registered as complete IR", () => {
    expect(getCardDefinition("EX4-053")).toMatchObject({
      cardId: "EX4-053",
      nameEn: "Falcomon",
      colors: ["Purple"],
      kinds: ["Digimon"],
      level: 3,
      playCost: 3,
      dp: 1000,
      types: ["Avian"],
      effectText: expect.stringContaining("[Keenan Crier]"),
      inheritedEffectText: expect.stringContaining("deleted outside of a battle"),
    });
    expect(runtimeCompiledCard("EX4-053")).toMatchObject({ coverage: "full", residual: [] });
  });

  it("reveals three and adds purple Ravemon/Bird/Avian plus Keenan Crier", () => {
    expect(compiled.effects?.find((entry) => entry.trigger === "OnPlay")?.actions?.[0]).toMatchObject({
      kind: "RevealAdd",
      revealCount: 3,
      rest: "deckBottom",
      add: [
        {
          filter: {
            colors: ["Purple"],
            nameOrTrait: [
              { match: "name", tokens: ["Ravemon"] },
              { match: "trait", tokens: ["Bird", "Avian"] },
            ],
          },
        },
        { filter: { nameOrTrait: [{ match: "nameExact", tokens: ["Keenan Crier"] }] } },
      ],
    });
  });
  it("inherits hand trashing only when deleted outside battle", () => {
    expect(compiled.effects?.find((entry) => entry.trigger === "OnDeletion")?.actions?.[0]).toMatchObject({
      kind: "Trash",
      chooser: "opponent",
      condition: { kind: "not", condition: { kind: "triggerRemovalCause", removalCause: "byBattle" } },
    });
  });

  it("plays through the live engine", async () => {
    const s = await playEx4Card("EX4-053");
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("subject").instanceId)).toBe(false);
  });

  it("publicly adds both matching On Play cards and bottoms the nonmatching reveal", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "EX4-053", as: "source" }],
          deck: ["EX4-058", "EX4-064", "EX4-054"],
        },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 3;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("source").instanceId })).toEqual({
      ok: true,
    });
    await settle(
      () =>
        s.state.players[0]!.battleArea.some(({ topCard }) => topCard.cardId === "EX4-053") &&
        s.state.players[0]!.hand.some((card) => card.cardId === "EX4-058") &&
        s.state.players[0]!.hand.some((card) => card.cardId === "EX4-064"),
    );
    expect(s.state.players[0]!.hand.map((card) => card.cardId)).toEqual(expect.arrayContaining(["EX4-058", "EX4-064"]));
    expect(s.state.players[0]!.deck.map((card) => card.cardId)).toEqual(["EX4-054"]);
    expect(s.state.memory).toBe(0);
  });

  it("does not reveal a longer Tamer name as exact Keenan Crier", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX4-053", as: "source" }],
          deck: ["ST24-14", "BT1-010", "BT1-010"],
        },
      },
      { autoSelectCards: true },
    );
    await s.ready();
    await advance(s.engine).fireForPermanent(EffectTiming.OnPlay, s.perm("source"));
    await settle(() => s.state.players[0]!.deck.length === 3);
    expect(s.state.players[0]!.hand.map((card) => card.cardId)).not.toContain("ST24-14");
    expect(s.state.players[0]!.deck.map((card) => card.cardId)).toContain("ST24-14");
  });

  it("does not trash an opponent hand card when the inherited host is deleted in battle", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "EX4-054", dp: 1000, suspended: true, as: "host", under: ["EX4-053"] }] },
        1: {
          battleArea: [{ card: "BT1-009", as: "attacker" }],
          hand: [{ card: "BT1-009", as: "opponentCard" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.turnSeat = 1;
    s.state.phase = Phase.Main;
    await s.ready();
    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "permanent", permanentId: s.perm("host").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle();
    expect(s.state.players[0]!.battleArea).toHaveLength(0);
    expect(s.state.players[1]!.hand.map((card) => card.instanceId)).toContain(s.inst("opponentCard").instanceId);
    expect(s.state.players[1]!.trash).toHaveLength(0);
  });

  it("trashes exactly one opponent hand card when the inherited host is deleted outside battle", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "EX4-054", dp: 1000, as: "host", under: ["EX4-053"] }] },
        1: {
          battleArea: [{ card: "BT1-009", as: "redSource" }],
          hand: [
            { card: "BT1-009", as: "first" },
            { card: "BT1-011", as: "second" },
            { card: "EX4-065", as: "tridentGaia" },
          ],
        },
      },
      { autoSelectCards: true },
    );
    s.state.turnSeat = 1;
    s.state.phase = Phase.Main;
    s.state.memory = 2;
    await s.ready();
    expect(s.engine.applyIntent(1, { type: "playCard", instanceId: s.inst("tridentGaia").instanceId })).toEqual({
      ok: true,
    });
    await settle(
      () =>
        s.state.players[0]!.trash.some((card) => card.instanceId === s.inst("host").instanceId) &&
        s.state.players[1]!.trash.some((card) => card.instanceId === s.inst("first").instanceId),
    );
    expect(s.state.players[1]!.trash.some((card) => card.instanceId === s.inst("tridentGaia").instanceId)).toBe(true);
    expect(
      s.state.players[1]!.trash.filter((card) =>
        [s.inst("first").instanceId, s.inst("second").instanceId].includes(card.instanceId),
      ),
    ).toHaveLength(1);
    expect(s.state.players[1]!.hand.map((card) => card.instanceId)).toContain(s.inst("second").instanceId);
    expect(s.state.players[1]!.hand.map((card) => card.instanceId)).not.toContain(s.inst("first").instanceId);
  });
  ex4CardBehaviorTests("EX4-053");
});
