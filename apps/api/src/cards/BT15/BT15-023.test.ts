import { describe, expect, it } from "vitest";
import { getCardDefinition } from "@aegis/shared";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "../index.js";
import { compiled } from "./BT15-023.js";

describe("BT15-023", () => {
  it("matches the catalog identity and blue level-3 evolution route", () => {
    expect(getCardDefinition("BT15-023")).toMatchObject({
      nameEn: "Coelamon",
      colors: ["Blue"],
      kinds: ["Digimon"],
      level: 4,
      playCost: 4,
      dp: 5000,
      evoCosts: [{ color: "Blue", level: 3, memoryCost: 2 }],
      types: ["Ancient Fish"],
    });
  });

  it("trashes two opposing digivolution cards and gains 1 memory if none remain", () => {
    expect(compiled.effects?.[0]?.actions[0]).toMatchObject({
      kind: "TrashDigivolution",
      amount: 2,
      fromTop: false,
      target: { filter: { controller: "opponent", digivolutionCards: "hasAny" } },
    });
    expect(compiled.effects?.[0]?.actions[1]).toMatchObject({
      kind: "GainMemory",
      amount: 1,
      condition: { kind: "opponentHasNone" },
    });
  });

  it("trashes both bottom sources and gains exactly 1 memory when no sources remain", async () => {
    const s = setupEngine(
      {
        0: { hand: [{ card: "BT15-023", as: "coelamon" }] },
        1: {
          battleArea: [
            {
              card: "BT15-023",
              as: "target",
              under: [
                { card: "BT15-002", as: "bottom" },
                { card: "BT15-021", as: "top" },
              ],
            },
          ],
        },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 6;
    const removedIds = [s.inst("bottom").instanceId, s.inst("top").instanceId];

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("coelamon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.perm("target").stack.length === 0);

    expect(s.state.memory).toBe(3);
    expect(s.state.players[1]!.trash.map((card) => card.instanceId)).toEqual(expect.arrayContaining(removedIds));
  });

  it("removes only the bottom two of three sources and gains no memory while one remains", async () => {
    const s = setupEngine(
      {
        0: { hand: [{ card: "BT15-023", as: "coelamon" }] },
        1: {
          battleArea: [
            {
              card: "BT15-027",
              as: "target",
              under: [
                { card: "BT15-002", as: "bottom" },
                { card: "BT15-021", as: "middle" },
                { card: "BT15-023", as: "top" },
              ],
            },
          ],
        },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 6;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("coelamon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.perm("target").stack.length === 1);

    expect(s.perm("target").stack.map((card) => card.instanceId)).toEqual([s.inst("top").instanceId]);
    expect(s.state.memory).toBe(2);
  });

  it("gains 1 memory on an empty opposing board, as clarified by Q2506", async () => {
    const s = setupEngine({ 0: { hand: [{ card: "BT15-023", as: "coelamon" }] } });
    s.state.memory = 5;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("coelamon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.cardId === "BT15-023"));

    expect(s.state.memory).toBe(2);
  });
});
