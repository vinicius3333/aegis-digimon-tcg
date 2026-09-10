import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { playEx4Card } from "./livePlayTestHelpers.js";
import { ex4CardBehaviorTests } from "./livePlayTestHelpers.js";
import { compiled } from "./EX4-067.js";

describe("EX4-067 Full Metal Blaze", () => {
  it("returns up to two opposing level four or lower Digimon", () => {
    expect(compiled.effects?.find((entry) => entry.trigger === "Main")?.actions?.[0]).toMatchObject({
      kind: "Return",
      to: "hand",
      target: { filter: { controller: "opponent", levelComparison: { op: "lte", value: 4 } }, count: 2 },
    });
  });
  it("returns a level six or higher Digimon to deck bottom when opponent has eight cards", () => {
    expect(compiled.effects?.find((entry) => entry.trigger === "Main")?.actions?.[1]).toMatchObject({
      kind: "Return",
      to: "deckBottom",
      condition: { kind: "zoneCount", seat: "opponent", op: "gte", value: 8 },
      target: { filter: { levelComparison: { op: "gte", value: 6 } } },
    });
  });

  it("plays through the live engine", async () => {
    const s = await playEx4Card("EX4-067");
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("subject").instanceId)).toBe(false);
  });

  it("checks the eight-card condition after returning level four Digimon", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT1-031", as: "blue" }], hand: [{ card: "EX4-067", as: "subject" }] },
        1: {
          hand: Array(7).fill("BT1-001"),
          battleArea: [
            { card: "BT1-013", as: "low" },
            { card: "BT1-070", as: "low2" },
            { card: "BT1-044", as: "high" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true, autoOrderTriggers: true },
    );
    await s.ready();
    s.state.memory = 10;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("subject").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[1]!.battleArea.length === 0);
    expect(s.state.players[1]!.hand.length).toBe(9);
    expect(s.state.players[1]!.deck.map((card) => card.instanceId)).toContain(s.inst("high").instanceId);
  });

  it("does not return level five Digimon and only returns a qualifying level six", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT1-031", as: "blue" }], hand: [{ card: "EX4-067", as: "subject" }] },
        1: {
          hand: Array(8).fill("BT1-001"),
          battleArea: [
            { card: "BT1-013", as: "low" },
            { card: "BT1-044", as: "high" },
            { card: "BT1-020", as: "level5" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true, autoOrderTriggers: true },
    );
    await s.ready();
    s.state.memory = 10;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("subject").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[1]!.battleArea.some((perm) => perm.topCard?.cardId === "BT1-020"));
    expect(s.state.players[1]!.battleArea.some((perm) => perm.topCard?.cardId === "BT1-020")).toBe(true);
    expect(s.state.players[1]!.hand.length).toBe(9);
    expect(s.state.players[1]!.deck.map((card) => card.instanceId)).toContain(s.inst("high").instanceId);
  });

  it("preserves the security activation clause as a main-effect activation", () => {
    expect(compiled.effects?.find((entry) => entry.trigger === "Security")).toMatchObject({
      trigger: "Security",
      isSecurity: true,
      actions: [{ kind: "ActivateMain" }],
    });
  });
  ex4CardBehaviorTests("EX4-067");
});
