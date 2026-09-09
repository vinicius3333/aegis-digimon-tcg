import { getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { hasRegisteredCompiledCard } from "../../engine/effects/interpreter.js";
import { advance } from "../../engine/testkit/advance.js";
import { settle, setupEngine } from "../../engine/testkit/harness.js";
import { compiled } from "./EX7-055.js";
import "../index.js";

async function stopLoop(s: ReturnType<typeof setupEngine>, loop: Promise<void>, seat: 0 | 1): Promise<void> {
  if (!s.state.gameOver && !s.engine.applyIntent(seat, { type: "surrender" }).ok)
    throw new Error("failed to stop loop");
  await loop;
}

describe("EX7-055 Punkmon", () => {
  it("matches the catalog and fully registered IR", () => {
    expect(getCardDefinition("EX7-055")).toMatchObject({
      cardId: "EX7-055",
      nameEn: "Punkmon",
      colors: ["Purple", "Red"],
      kinds: ["Digimon"],
      level: 4,
      playCost: 6,
      dp: 6000,
      evoCosts: [
        { color: "Purple", level: 3, memoryCost: 3 },
        { color: "Red", level: 3, memoryCost: 3 },
      ],
      forms: ["Champion"],
      attributes: ["Virus"],
      types: ["Dark Dragon", "LIBERATOR"],
    });
    expect(compiled.digivolutionRequirement).toEqual([{ level: 3, traits: ["Evil"], cost: 2, isAlternate: true }]);
    expect(compiled.effects?.find((entry) => entry.trigger === "WhenDigivolving")?.actions[0]).toMatchObject({
      kind: "PlayWithoutCost",
      from: ["hand"],
      payCost: false,
      optional: true,
      target: { filter: { nameOrTrait: [{ tokens: ["Yuuki"], match: "nameExact" }] } },
      condition: {
        kind: "zoneCount",
        seat: "mine",
        zone: "battleArea",
        filter: { kind: ["Tamer"] },
        op: "lte",
        value: 1,
      },
    });
    expect(compiled.effects?.find((entry) => entry.isInherited)?.actions[0]).toMatchObject({
      kind: "ModifyDP",
      amount: 2000,
      duration: "permanent",
    });
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
    expect(hasRegisteredCompiledCard("EX7-055")).toBe(true);
  });

  it.each([
    [0, true],
    [1, true],
    [2, false],
  ])("public evolution with %i Tamers plays Yuuki=%s", async (tamerCount, shouldPlay) => {
    const tamers = ["BT14-086", "BT14-087"].slice(0, tamerCount).map((card, index) => ({ card, as: `tamer${index}` }));
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT10-071", as: "base" }, ...tamers],
          hand: [
            { card: "EX7-055", as: "punk" },
            { card: "EX7-065", as: "yuuki" },
          ],
          deck: [{ card: "BT1-009", as: "drawn" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 4;
    await s.ready();
    const sourceId = s.perm("base").topCard.instanceId;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("punk").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard.cardId === "EX7-055");
    expect(s.state.memory).toBe(1);
    expect(s.perm("base").stack.map((card) => card.instanceId)).toEqual([sourceId]);
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("drawn").instanceId)).toBe(true);
    expect(
      s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.instanceId === s.inst("yuuki").instanceId),
    ).toBe(shouldPlay);
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("yuuki").instanceId)).toBe(!shouldPlay);
  });

  it("may decline the free Yuuki play", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT10-071", as: "base" }],
          hand: [
            { card: "EX7-055", as: "punk" },
            { card: "EX7-065", as: "yuuki" },
          ],
          deck: ["BT1-009"],
        },
      },
      { autoAcceptOptional: false, autoSelectCards: true },
    );
    s.state.memory = 4;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("punk").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard.cardId === "EX7-055");
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("yuuki").instanceId)).toBe(true);
  });

  it("uses its Evil route for 2 and rejects a non-Evil off-color level 3", async () => {
    const legal = setupEngine({
      0: {
        battleArea: [{ card: "BT2-067", as: "evil" }],
        hand: [{ card: "EX7-055", as: "punk" }],
        deck: [{ card: "BT1-009", as: "drawn" }],
      },
    });
    legal.state.memory = 3;
    await legal.ready();
    const sourceId = legal.perm("evil").topCard.instanceId;
    expect(
      legal.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: legal.perm("evil").permanentId,
        instanceId: legal.inst("punk").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: true });
    await settle(() => legal.perm("evil").topCard.cardId === "EX7-055");
    expect(legal.state.memory).toBe(1);
    expect(legal.perm("evil").stack.map((card) => card.instanceId)).toEqual([sourceId]);
    expect(legal.state.players[0]!.hand.map((card) => card.instanceId)).toEqual([legal.inst("drawn").instanceId]);

    const invalid = setupEngine({
      0: { battleArea: [{ card: "BT1-030", as: "base" }], hand: [{ card: "EX7-055", as: "punk" }] },
    });
    await invalid.ready();
    expect(
      invalid.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: invalid.perm("base").permanentId,
        instanceId: invalid.inst("punk").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: false, reason: "invalid-evolution" });
  });

  it("publicly carries inherited +2000 DP into a host only during its controller's turn", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX7-055", as: "punk" }],
          hand: [{ card: "BT1-020", as: "host" }],
          deck: [{ card: "BT1-015", as: "passer" }, "BT1-009", "BT1-010"],
        },
        1: { deck: ["BT1-011", "BT1-012", "BT1-013"] },
      },
      { autoSelectCards: true },
    );
    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    s.state.memory = 3;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("punk").permanentId,
        instanceId: s.inst("host").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("punk").topCard.cardId === "BT1-020");
    expect(s.perm("punk").currentDP).toBe(8000);
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("passer").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.turnSeat === 1 && s.state.phase === "Breeding");
    await advance(s.engine).waitForMainPhase(1);
    expect(s.perm("punk").currentDP).toBe(6000);
    await stopLoop(s, loop, 1);
  });
});
