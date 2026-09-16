import { digivolutionRequirementsFor, getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import { advance } from "../../engine/testkit/advance.js";
import { assertNoLoudGap, setupEngine, settle } from "../../engine/testkit/harness.js";
import "../index.js";

const cardId = "EX11-047";

describe("EX11-047 Impmon", () => {
  it("preserves the printed card, Yaamon evolution, start-main cost, and inherited DP", () => {
    expect(getCardDefinition(cardId)).toMatchObject({
      nameEn: "Impmon",
      colors: ["Purple", "Red"],
      level: 3,
      playCost: 3,
      dp: 1000,
      evoCosts: [
        { color: "Purple", level: 2, memoryCost: 1 },
        { color: "Red", level: 2, memoryCost: 1 },
      ],
      types: ["Evil", "LIBERATOR"],
    });
    const compiled = runtimeCompiledCard(cardId)!;
    expect(compiled).toMatchObject({ coverage: "full", residual: [] });
    expect(compiled.digivolutionRequirement).toEqual([{ namesExact: ["Yaamon"], cost: 0, isAlternate: true }]);
    expect(digivolutionRequirementsFor(cardId)).toEqual(compiled.digivolutionRequirement);
    expect(compiled.effects.find(({ trigger }) => trigger === "StartOfYourMainPhase")?.actions).toMatchObject([
      { kind: "Trash", target: { filter: { controller: "mine", zone: "hand" }, count: 1 } },
      { kind: "GainMemory", amount: 1 },
    ]);
    expect(compiled.effects.find(({ isInherited }) => isInherited)?.actions).toMatchObject([
      { kind: "ModifyDP", amount: 2000, duration: "permanent" },
    ]);
  });

  it("trashes exactly 1 hand card, then gains 1 memory at the start of the main phase", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: cardId, as: "source" }],
          hand: [
            { card: "BT1-009", as: "discard" },
            { card: "BT1-013", as: "keep" },
          ],
        },
      },
      { autoSelectCards: true, preferInstanceIds: preferred },
    );
    preferred.push(s.inst("discard").instanceId);
    s.state.memory = 0;
    const turn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(0);
    expect(s.state.players[0]!.hand).toHaveLength(1);
    expect(s.state.players[0]!.trash).toHaveLength(1);
    expect(s.state.players[0]!.trash[0]!.cardId).toBe("BT1-009");
    expect(s.state.memory).toBe(1);
    expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
    await turn;
    assertNoLoudGap(s);
  });

  it("rejects the printed evolution from a non-Yaamon breeding source", async () => {
    const s = setupEngine({ 0: { breeding: { card: "EX11-004", as: "egg" }, hand: [{ card: cardId, as: "impmon" }] } });
    await s.ready();
    s.state.memory = 0;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("egg").permanentId,
        instanceId: s.inst("impmon").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: false, reason: "invalid-evolution" });
    expect(s.perm("egg").topCard.cardId).toBe("EX11-004");
    expect(s.state.memory).toBe(0);
    assertNoLoudGap(s);
  });

  it("digivolves from a [Yaamon] Digi-Egg by either route, charging 0 or 1, and keeps Yaamon as its source", async () => {
    const evolveFromYaamon = async (useAlternateCost: boolean) => {
      const s = setupEngine(
        { 0: { breeding: { card: "EX11-005", as: "egg" }, hand: [{ card: cardId, as: "impmon" }] } },
        { autoSelectCards: true, autoChooseOption: true },
      );
      await s.ready();
      s.state.memory = 0;
      expect(
        s.engine.applyIntent(0, {
          type: "digivolve",
          permanentId: s.perm("egg").permanentId,
          instanceId: s.inst("impmon").instanceId,
          useAlternateCost,
        }),
      ).toEqual({ ok: true });
      await settle(() => s.perm("egg").topCard.cardId === cardId);
      expect(s.perm("egg").topCard.cardId).toBe(cardId);
      expect(s.perm("egg").stack.map(({ cardId: id }) => id)).toEqual(["EX11-005"]);
      expect(s.perm("egg").currentDP).toBe(1000);
      assertNoLoudGap(s);
      return s.state.memory;
    };

    expect(await evolveFromYaamon(true)).toBe(0);
    expect(await evolveFromYaamon(false)).toBe(-1);
  });

  it("still gains 1 memory when the hand is empty (CR 1-3-2)", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: cardId, as: "source" }] } }, { autoSelectCards: true });
    s.state.memory = 0;
    const turn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(0);
    expect(s.state.players[0]!.hand).toHaveLength(0);
    expect(s.state.players[0]!.trash).toHaveLength(0);
    expect(s.state.memory).toBe(1);
    expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
    await turn;
    assertNoLoudGap(s);
  });

  it("gives its host +2000 DP only during its controller's public turn", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT1-009", as: "host", under: [cardId] }], deck: ["BT1-009"] },
      1: { deck: ["BT1-009"] },
    });
    const turn = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    expect(s.perm("host").currentDP).toBe(5000);
    expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
    await advance(s.engine).waitForMainPhase(1);
    expect(s.perm("host").currentDP).toBe(3000);
    expect(s.engine.applyIntent(1, { type: "surrender" })).toEqual({ ok: true });
    await turn;
    assertNoLoudGap(s);
  });
});
