import { describe, expect, it } from "vitest";
import { EffectTiming, getCardDefinition } from "@aegis/shared";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { advance } from "../../engine/testkit/advance.js";
import { compiled } from "./EX4-022.js";
import "../index.js";

describe("EX4-022 ZeedGarurumon", () => {
  it("has the official identity and returns an opposing level four or lower Digimon", () => {
    expect(getCardDefinition("EX4-022")).toMatchObject({
      cardId: "EX4-022",
      nameEn: "ZeedGarurumon",
      colors: ["Blue"],
      level: 6,
      playCost: 12,
      dp: 12000,
      evoCosts: [{ color: "Blue", level: 5, memoryCost: 4 }],
      forms: ["Mega"],
      attributes: ["Data"],
      types: ["Cyborg"],
    });
    expect(compiled.effects?.find((entry) => entry.trigger === "WhenDigivolving")?.actions?.[0]).toMatchObject({
      kind: "Return",
      to: "hand",
      target: { filter: { controller: "opponent", levelComparison: { op: "lte", value: 4 } } },
    });
  });

  it("digivolves from a blue level-5 Digimon for 4 and preserves the source", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "EX4-019", as: "base" }],
        hand: [{ card: "EX4-022", as: "zeed" }],
      },
    });
    s.state.memory = 4;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("zeed").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard.cardId === "EX4-022");

    expect(s.state.memory).toBe(0);
    expect(s.perm("base").stack.map((card) => card.cardId)).toEqual(["EX4-019"]);
  });
  it("checks eight cards in hand for the second return and requires a Tamer for the inherited return", () => {
    const digivolving = compiled.effects?.find((entry) => entry.trigger === "WhenDigivolving");
    expect(digivolving?.actions?.[1]).toMatchObject({
      condition: { kind: "zoneCount", seat: "opponent", zone: "hand", op: "gte", value: 8 },
      target: { filter: { levelComparison: { op: "gte", value: 6 } } },
    });
    expect(compiled.effects?.find((entry) => entry.trigger === "AllTurns")).toMatchObject({
      frequency: "OncePerTurn",
      actions: [
        {
          kind: "SubTrigger",
          event: "whenEffectAddsToOpponentHand",
          actions: [
            {
              kind: "Return",
              target: { filter: { levels: [3] } },
              condition: { kind: "youHave", filter: { kind: ["Tamer"] } },
            },
          ],
        },
      ],
    });
  });

  it("returns level four and then level six Digimon as the opponent reaches eight cards", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "EX4-022", as: "zeed" }] },
        1: {
          hand: ["BT1-001", "BT1-001", "BT1-001", "BT1-001", "BT1-001", "BT1-001", "BT1-001"],
          battleArea: [
            { card: "EX4-016", as: "level4" },
            { card: "BT5-030", as: "level6" },
          ],
        },
      },
      { autoSelectCards: true },
    );
    await s.ready();
    await advance(s.engine).fireForPermanent(EffectTiming.WhenDigivolving, s.perm("zeed"));
    await settle(() => s.state.players[1]!.battleArea.length === 1);

    expect(s.state.players[1]!.battleArea.some((p) => p.permanentId === s.perm("level6").permanentId)).toBe(false);
    expect(s.state.players[1]!.hand).toHaveLength(9);
  });

  it("does not return a level six when the first bounce leaves only seven cards in hand", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "EX4-022", as: "zeed" }] },
        1: {
          hand: Array(6).fill("BT1-001"),
          battleArea: [
            { card: "EX4-016", as: "level4" },
            { card: "BT5-030", as: "level6" },
          ],
        },
      },
      { autoSelectCards: true },
    );
    await s.ready();

    await advance(s.engine).fireForPermanent(EffectTiming.WhenDigivolving, s.perm("zeed"));

    expect(s.state.players[1]!.hand).toHaveLength(7);
    expect(s.perm("level6").topCard.cardId).toBe("BT5-030");
  });

  it("returns one opposing level three after an effect hand add, once per turn", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "EX4-022", as: "zeed" },
            { card: "BT1-089", as: "tamer" },
          ],
        },
        1: {
          battleArea: [
            { card: "EX4-016", as: "firstAdded" },
            { card: "EX4-016", as: "secondAdded" },
            { card: "BT1-009", as: "firstLevel3" },
            { card: "BT1-009", as: "secondLevel3" },
          ],
        },
      },
      { autoSelectCards: true },
    );
    await s.ready();

    await advance(s.engine).verb.returnToHand([s.perm("firstAdded").topCard!.instanceId]);
    await settle(() => s.state.players[1]!.battleArea.length === 2);
    await advance(s.engine).verb.returnToHand([s.perm("secondAdded").topCard!.instanceId]);

    expect(s.state.players[1]!.battleArea).toHaveLength(1);
    expect(s.state.players[1]!.battleArea[0]!.topCard.cardId).toBe("BT1-009");
    expect(s.state.players[1]!.hand.filter((card) => card.cardId === "BT1-009")).toHaveLength(1);
  });

  it("does not perform the level-three follow-up without one of your Tamers", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "EX4-022", as: "zeed" }] },
        1: {
          battleArea: [
            { card: "EX4-016", as: "added" },
            { card: "BT1-009", as: "level3" },
          ],
        },
      },
      { autoSelectCards: true },
    );
    await s.ready();

    await advance(s.engine).verb.returnToHand([s.perm("added").topCard!.instanceId]);

    expect(s.state.players[1]!.battleArea).toHaveLength(1);
    expect(s.perm("level3").topCard.cardId).toBe("BT1-009");
  });
});
