import { describe, expect, it } from "vitest";
import { EffectTiming, getCardDefinition } from "@aegis/shared";
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
          battleArea: [{ card: "EX4-053", as: "source" }],
          deck: ["EX4-058", "EX4-064", "EX4-054"],
        },
      },
      { autoSelectCards: true },
    );
    await s.ready();
    await advance(s.engine).fireForPermanent(EffectTiming.OnPlay, s.perm("source"));
    await settle(() => s.state.players[0]!.hand.length === 2);
    expect(s.state.players[0]!.hand.map((card) => card.cardId)).toEqual(expect.arrayContaining(["EX4-058", "EX4-064"]));
    expect(s.state.players[0]!.deck.map((card) => card.cardId)).toContain("EX4-054");
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
        0: { battleArea: [{ card: "EX4-054", as: "host", under: ["EX4-053"] }] },
        1: { hand: [{ card: "BT1-009", as: "opponentCard" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    await advance(s.engine).verb.deletePermanent([s.perm("host").permanentId], "byBattle");
    await settle();
    expect(s.state.players[1]!.hand.map((card) => card.instanceId)).toContain(s.inst("opponentCard").instanceId);
    expect(s.state.players[1]!.trash).toHaveLength(0);
  });

  it("trashes exactly one opponent hand card when the inherited host is deleted outside battle", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "EX4-054", as: "host", under: ["EX4-053"] }] },
        1: {
          hand: [
            { card: "BT1-009", as: "first" },
            { card: "BT1-011", as: "second" },
          ],
        },
      },
      { autoSelectCards: true },
    );
    await s.ready();
    await advance(s.engine).verb.deletePermanent([s.perm("host").permanentId], "byEffect");
    await settle(() => s.state.players[1]!.trash.length === 1);
    expect(s.state.players[1]!.hand).toHaveLength(1);
    expect(s.state.players[1]!.trash).toHaveLength(1);
  });
  ex4CardBehaviorTests("EX4-053");
});
