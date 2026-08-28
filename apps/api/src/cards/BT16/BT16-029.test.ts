import { getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { observe } from "../../engine/testkit/observe.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./BT16-029.js";
import "../index.js";

describe("BT16-029", () => {
  it("matches the catalog identity and Light Fang/Night Claw evolution route", () => {
    expect(getCardDefinition("BT16-029")).toMatchObject({
      nameEn: "Agumon",
      colors: ["Yellow"],
      level: 3,
      playCost: 3,
      dp: 1000,
      evoCosts: [{ color: "Yellow", level: 2, memoryCost: 0 }],
      types: ["Dinosaur", "Light Fang"],
    });
    expect(compiled.digivolutionRequirement).toEqual([
      { level: 2, traits: ["Light Fang", "Night Claw"], cost: 0, isAlternate: true },
    ]);
  });

  it("reveals three and adds Light Fang, Night Claw, or multicolor cards", () => {
    expect(compiled.effects?.[0]).toMatchObject({
      trigger: "OnPlay",
      actions: [{ kind: "RevealAdd", revealCount: 3, rest: "deckBottom" }],
    });
    expect(compiled.effects?.[0]?.actions?.[0]).toMatchObject({
      add: [
        { count: 1, to: "hand" },
        { count: 1, to: "hand", orFilters: [{ multicolor: true }] },
      ],
    });
  });

  it("reduces opposing Digimon DP by 3000 as inherited", () => {
    expect(compiled.effects?.[1]).toMatchObject({
      trigger: "YourTurn",
      isInherited: true,
      actions: [{ kind: "ModifySecurityDP", controller: "opponent", amount: -3000, duration: "forTheTurn" }],
    });
  });

  it("adds one Light Fang and only one Night Claw or multicolor card from the top three", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "BT16-029", as: "agumon" }],
          deck: ["BT16-029", "BT16-020", "BT16-017", "BT1-009"],
        },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 3;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("agumon").instanceId })).toEqual({
      ok: true,
    });
    await settle(
      () =>
        s.state.players[0]!.hand.some((card) => card.cardId === "BT16-020") &&
        s.state.players[0]!.hand.some((card) => card.cardId === "BT16-029"),
    );

    expect(s.state.players[0]!.hand.some((card) => card.cardId === "BT16-029")).toBe(true);
    expect(s.state.players[0]!.hand.some((card) => card.cardId === "BT16-020")).toBe(true);
    expect(s.state.players[0]!.hand.filter((card) => card.cardId === "BT16-017")).toHaveLength(0);
    expect(s.state.players[0]!.deck.map((card) => card.cardId)).toEqual(["BT16-017", "BT1-009"]);
    expect(s.state.players[0]!.deck).toHaveLength(2);
  });

  it("digivolves from a legal off-color Light Fang level-2 base", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX5-001", as: "base" }],
          hand: [{ card: "BT16-029", as: "agumon" }],
          deck: ["BT1-009", "BT1-010", "BT1-011", "BT1-012", "BT1-013"],
        },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 0;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("agumon").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard?.cardId === "BT16-029");

    expect(s.perm("base").topCard?.cardId).toBe("BT16-029");
    expect(s.perm("base").stack).toHaveLength(1);
  });

  it("reduces opponent Security Digimon DP without changing battle-area DP", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT16-030", as: "host", under: ["BT16-029"] }] } });
    await s.ready();

    expect(observe(s.engine).securityDp(1)).toBe(-3000);
    expect(s.perm("host").currentDP).toBe(1000);
  });
});
