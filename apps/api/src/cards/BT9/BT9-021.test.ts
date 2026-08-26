import { getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "../BT1/BT1-029.js";
import "../BT4/BT4-079.js";
import "../BT4/BT4-102.js";
import { compiled } from "./BT9-021.js";

describe("BT9-021 Jellymon", () => {
  it("matches the catalog and both once-per-turn watcher clauses", () => {
    expect(getCardDefinition("BT9-021")).toMatchObject({
      nameEn: "Jellymon",
      colors: ["Blue"],
      kinds: ["Digimon"],
      level: 3,
      playCost: 3,
      dp: 2000,
      evoCosts: [{ color: "Blue", level: 2, memoryCost: 0 }],
      forms: ["Rookie"],
      attributes: ["Data"],
      types: ["Mollusk"],
    });
    expect(compiled).toMatchObject({
      effects: [
        {
          trigger: "YourTurn",
          frequency: "OncePerTurn",
          actions: [
            {
              kind: "SubTrigger",
              event: "whenPlayed",
              sourceFilter: { kind: ["Tamer"], colors: ["Blue"] },
              actions: [{ kind: "Draw", amount: 1 }],
            },
          ],
        },
        {
          trigger: "YourTurn",
          isInherited: true,
          frequency: "OncePerTurn",
          actions: [
            {
              kind: "SubTrigger",
              event: "whenEffectAddsToHand",
              actions: [{ kind: "Return", target: { filter: { levels: [3] }, count: 1 }, to: "hand" }],
            },
          ],
        },
      ],
      coverage: "full",
      residual: [],
    });
  });

  it("evolves legally from a blue Digi-Egg in breeding for exactly 0", async () => {
    const s = setupEngine({
      0: { breeding: { card: "BT1-003", as: "stack" }, hand: [{ card: "BT9-021", as: "jellymon" }] },
    });
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("stack").permanentId,
        instanceId: s.inst("jellymon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("stack").topCard.instanceId === s.inst("jellymon").instanceId);
    expect(s.state.memory).toBe(0);
    expect(s.perm("stack").stack.map((card) => card.cardId)).toEqual(["BT1-003"]);
  });

  it("draws once when public play creates an own blue Tamer, then respects Once Per Turn", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT9-021", as: "jellymon" }],
        hand: [
          { card: "BT9-086", as: "firstTamer" },
          { card: "BT9-086", as: "secondTamer" },
        ],
        deck: [{ card: "BT1-001", as: "firstDraw" }, { card: "BT1-002", as: "unusedDraw" }],
      },
    });
    s.state.memory = 20;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("firstTamer").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("firstDraw").instanceId));
    const deckAfterFirst = s.state.players[0]!.deck.length;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("secondTamer").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.battleArea.filter((permanent) => permanent.topCard.cardId === "BT9-086").length === 2);
    expect(s.state.players[0]!.deck).toHaveLength(deckAfterFirst);
  });

  it("does not draw when the opponent publicly plays a blue Tamer", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT9-021", as: "jellymon" }], deck: [{ card: "BT1-001", as: "drawn" }] },
      1: { hand: [{ card: "BT9-086", as: "opponentTamer" }] },
    });
    s.state.turnSeat = 1;
    s.state.memory = 10;
    expect(s.engine.applyIntent(1, { type: "playCard", instanceId: s.inst("opponentTamer").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[1]!.battleArea.length === 1);
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("drawn").instanceId)).toBe(false);
  });

  it("Q1823: an effect returning its own host still activates the inherited bounce", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT9-025", as: "host", under: ["BT9-021"] }],
          hand: [{ card: "BT4-102", as: "aquaViper" }],
        },
        1: { battleArea: [{ card: "BT1-028", as: "target" }] },
      },
      { autoSelectCards: true },
    );
    const targetId = s.perm("target").topCard.instanceId;
    s.state.memory = 5;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("aquaViper").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.hand.some((card) => card.cardId === "BT9-025"));
    await settle(() => s.state.players[1]!.hand.some((card) => card.instanceId === targetId));
    expect(s.state.players[1]!.battleArea).toHaveLength(0);
  });

  it("Q1824: draw-then-trash still opens the inherited bounce when the drawn card leaves hand", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT9-025", as: "host", under: ["BT9-021"] }],
          hand: [{ card: "BT4-079", as: "labramon" }],
          deck: [{ card: "BT1-001", as: "drawnThenTrashed" }],
        },
        1: { battleArea: [{ card: "BT1-028", as: "target" }] },
      },
      { autoSelectCards: true, preferInstanceIds: preferred },
    );
    preferred.push(s.inst("drawnThenTrashed").instanceId);
    const targetId = s.perm("target").topCard.instanceId;
    s.state.memory = 3;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("labramon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.trash.some((card) => card.instanceId === s.inst("drawnThenTrashed").instanceId));
    await settle(() => s.state.players[1]!.hand.some((card) => card.instanceId === targetId));
  });

  it("the inherited bounce is once per turn", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT9-025", as: "host", under: ["BT9-021"] }],
          hand: [{ card: "BT1-029", as: "firstGabumon" }, { card: "BT1-029", as: "secondGabumon" }],
          deck: [{ card: "BT1-001", as: "firstDraw" }, { card: "BT1-002", as: "secondDraw" }],
        },
        1: {
          battleArea: [{ card: "BT1-028", as: "firstTarget" }, { card: "BT1-031", as: "secondTarget" }],
        },
      },
      { autoSelectCards: true },
    );
    await s.ready();
    const firstTargetId = s.perm("firstTarget").topCard.instanceId;
    s.state.memory = 10;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("firstGabumon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[1]!.hand.some((card) => card.instanceId === firstTargetId));
    expect(s.state.players[1]!.battleArea).toHaveLength(1);
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("secondGabumon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("secondDraw").instanceId));
    expect(s.state.players[1]!.battleArea).toHaveLength(1);
  });

  it("ignores an effect that adds a card to the opponent's hand", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT9-025", as: "host", under: ["BT9-021"] }] },
      1: {
        battleArea: [{ card: "BT1-028", as: "target" }],
        trash: [{ card: "BT1-003", as: "opponentAdded" }],
      },
    });
    await s.ready();
    await advance(s.engine).verb.returnToHand([s.inst("opponentAdded").instanceId]);
    expect(s.state.players[1]!.battleArea).toHaveLength(1);
  });
});
