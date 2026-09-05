import { describe, expect, it } from "vitest";
import { getCardDefinition } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "../index.js";
import { compiled } from "./EX4-006.js";

describe("EX4-006 Guilmon", () => {
  it("has the official identity and grants Rush at the combined-trash threshold", () => {
    expect(getCardDefinition("EX4-006")).toMatchObject({
      cardId: "EX4-006",
      nameEn: "Guilmon",
      colors: ["Red", "Purple"],
      level: 3,
      playCost: 3,
      dp: 2000,
      evoCosts: [
        { color: "Red", level: 2, memoryCost: 1 },
        { color: "Purple", level: 2, memoryCost: 1 },
      ],
      forms: ["Rookie"],
      attributes: ["Virus"],
      types: ["Reptile"],
      maxCountInDeck: 4,
    });
    expect(compiled.effects?.find((entry) => entry.trigger === "OnPlay")?.actions?.[0]).toMatchObject({
      kind: "GainKeyword",
      keyword: { keyword: "Rush" },
      duration: "forTheTurn",
      condition: { kind: "combinedTrashCount", op: "gte", value: 20 },
    });
    expect(compiled.digivolutionRequirement).toContainEqual({
      namesExact: ["Gigimon"],
      cost: 0,
      isAlternate: true,
    });
  });

  it.each([
    ["red", "BT1-001"],
    ["purple", "BT10-006"],
  ])("digivolves from a %s level 2 for the printed cost", async (_color, baseCard) => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: baseCard, as: "base" }],
        hand: [{ card: "EX4-006", as: "guilmon" }],
      },
    });
    s.state.memory = 1;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("guilmon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard.cardId === "EX4-006");

    expect(s.state.memory).toBe(0);
  });

  it("uses the zero-cost alternate digivolution route from Gigimon", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT12-001", as: "gigimon" }],
        hand: [{ card: "EX4-006", as: "guilmon" }],
      },
    });
    s.state.memory = 0;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("gigimon").permanentId,
        instanceId: s.inst("guilmon").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("gigimon").topCard.cardId === "EX4-006");

    expect(s.state.memory).toBe(0);
  });

  it("Q3440/Q3441 grants persistent Rush from combined trashes and permits an immediate attack", async () => {
    const card = "BT1-010";
    const s = setupEngine({
      0: { hand: [{ card: "EX4-006", as: "guilmon" }], trash: Array(12).fill(card) },
      1: { trash: Array(8).fill(card), security: ["BT8-090"] },
    });
    s.state.memory = 3;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("guilmon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.battleArea.some(({ topCard }) => topCard.cardId === "EX4-006"));
    const guilmon = s.state.players[0]!.battleArea.find(({ topCard }) => topCard.cardId === "EX4-006")!;
    expect(observe(s.engine).hasKeyword(guilmon, "Rush")).toBe(true);

    s.state.players[0]!.trash.splice(0);
    s.state.players[1]!.trash.splice(0);
    await advance(s.engine).recompute();
    expect(observe(s.engine).hasKeyword(guilmon, "Rush")).toBe(true);

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: guilmon.permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => guilmon.isSuspended);
    expect(guilmon.isSuspended).toBe(true);
  });

  it("does not grant Rush when the combined trashes total only 19 cards", async () => {
    const card = "BT1-010";
    const s = setupEngine({
      0: { hand: [{ card: "EX4-006", as: "guilmon" }], trash: Array(9).fill(card) },
      1: { trash: Array(10).fill(card) },
    });
    s.state.memory = 3;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("guilmon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.battleArea.some(({ topCard }) => topCard.cardId === "EX4-006"));
    const guilmon = s.state.players[0]!.battleArea.find(({ topCard }) => topCard.cardId === "EX4-006")!;

    expect(observe(s.engine).hasKeyword(guilmon, "Rush")).toBe(false);
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: guilmon.permanentId,
        target: { kind: "player" },
      }).ok,
    ).toBe(false);
  });
});
