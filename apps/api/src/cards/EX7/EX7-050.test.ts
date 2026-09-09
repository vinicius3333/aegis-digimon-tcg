import { getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { hasRegisteredCompiledCard } from "../../engine/effects/interpreter.js";
import { advance } from "../../engine/testkit/advance.js";
import { settle, setupEngine } from "../../engine/testkit/harness.js";
import { compiled } from "./EX7-050.js";
import "../index.js";

async function stopLoop(s: ReturnType<typeof setupEngine>, loop: Promise<void>, seat: 0 | 1): Promise<void> {
  if (!s.state.gameOver && !s.engine.applyIntent(seat, { type: "surrender" }).ok)
    throw new Error("failed to stop loop");
  await loop;
}

describe("EX7-050 Impmon", () => {
  it("matches the catalog and fully registered IR", () => {
    expect(getCardDefinition("EX7-050")).toMatchObject({
      cardId: "EX7-050",
      nameEn: "Impmon",
      colors: ["Purple", "Red"],
      kinds: ["Digimon"],
      level: 3,
      playCost: 3,
      dp: 1000,
      evoCosts: [
        { color: "Purple", level: 2, memoryCost: 1 },
        { color: "Red", level: 2, memoryCost: 1 },
      ],
      forms: ["Rookie"],
      attributes: ["Virus"],
      types: ["Evil", "LIBERATOR"],
    });
    expect(compiled.digivolutionRequirement).toEqual([{ names: ["Yaamon"], cost: 0, isAlternate: true }]);
    expect(compiled.effects?.find((entry) => !entry.isInherited)?.actions[0]).toMatchObject({
      kind: "Replacement",
      event: "wouldDigivolve",
      sourceFilter: { isSelfRef: true, zone: ["battleArea"] },
      into: { nameOrTrait: [{ tokens: ["Dark Dragon", "Evil Dragon"], match: "trait" }] },
      actions: [{ mode: "reduceCost", amount: 1 }],
    });
    expect(compiled.effects?.find((entry) => entry.isInherited)?.actions[0]).toMatchObject({
      kind: "ModifyDP",
      amount: 2000,
      duration: "permanent",
    });
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
    expect(hasRegisteredCompiledCard("EX7-050")).toBe(true);
  });

  it.each([
    ["BT11-079", "Evil Dragon"],
    ["BT12-010", "Dark Dragon"],
  ])("publicly reduces a legal %s (%s) evolution by 1", async (card) => {
    const s = setupEngine(
      { 0: { battleArea: [{ card: "EX7-050", as: "imp" }], hand: [{ card, as: "evolving" }], deck: ["BT1-009"] } },
      { autoSelectCards: true },
    );
    s.state.memory = 3;
    await s.ready();
    const sourceId = s.perm("imp").topCard.instanceId;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("imp").permanentId,
        instanceId: s.inst("evolving").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("imp").topCard.cardId === card);
    expect(s.state.memory).toBe(2);
    expect(s.perm("imp").stack.map(({ instanceId }) => instanceId)).toEqual([sourceId]);
    expect(s.state.players[0]!.hand.map(({ cardId }) => cardId)).toEqual(["BT1-009"]);
  });

  it("does not reduce a legal evolution into a Digimon without either trait", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "EX7-050", as: "imp" }],
        hand: [{ card: "BT1-015", as: "evolving" }],
        deck: ["BT1-009"],
      },
    });
    s.state.memory = 3;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("imp").permanentId,
        instanceId: s.inst("evolving").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("imp").topCard.cardId === "BT1-015");
    expect(s.state.memory).toBe(1);
  });

  it("publicly uses its zero-cost Yaamon route with the standard draw and exact stack", async () => {
    const s = setupEngine({
      0: { breeding: { card: "EX7-006", as: "yaamon" }, hand: [{ card: "EX7-050", as: "imp" }], deck: ["BT1-009"] },
    });
    s.state.memory = 3;
    await s.ready();
    const sourceId = s.perm("yaamon").topCard.instanceId;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("yaamon").permanentId,
        instanceId: s.inst("imp").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("yaamon").topCard.cardId === "EX7-050");
    expect(s.state.memory).toBe(3);
    expect(s.perm("yaamon").stack.map(({ instanceId }) => instanceId)).toEqual([sourceId]);
    expect(s.state.players[0]!.hand.map(({ cardId }) => cardId)).toEqual(["BT1-009"]);
  });

  it("publicly grants inherited DP only during its controller's turn", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX7-050", as: "imp" }],
          hand: [{ card: "BT11-079", as: "host" }],
          deck: [{ card: "BT1-020", as: "passer" }, "BT1-010", "BT1-011"],
        },
        1: { deck: ["BT1-012", "BT1-013", "BT1-014"] },
      },
      { autoSelectCards: true },
    );
    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    s.state.memory = 3;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("imp").permanentId,
        instanceId: s.inst("host").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("imp").topCard.cardId === "BT11-079");
    expect(s.perm("imp").currentDP).toBe(6000);
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("passer").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.turnSeat === 1 && s.state.phase === "Breeding");
    await advance(s.engine).waitForMainPhase(1);
    expect(s.perm("imp").currentDP).toBe(4000);
    await stopLoop(s, loop, 1);
  });

  it("Q3857: does not reduce a Dark Dragon evolution from the breeding area", async () => {
    const s = setupEngine({
      0: { breeding: { card: "EX7-050", as: "imp" }, hand: [{ card: "BT12-010", as: "evolving" }], deck: ["BT1-009"] },
    });
    s.state.memory = 3;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("imp").permanentId,
        instanceId: s.inst("evolving").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("imp").topCard.cardId === "BT12-010");
    expect(s.state.memory).toBe(1);
  });
});
