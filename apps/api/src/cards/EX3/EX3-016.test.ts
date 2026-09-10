import { getCardDefinition, getCompiledCard } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "../BT12/BT12-028.js";
import "../BT4/BT4-011.js";
import "./EX3-016.js";

function opponentTurn<T extends ReturnType<typeof setupEngine>>(s: T, memory: number): T {
  s.state.turnSeat = 1;
  s.state.memory = -memory;
  return s;
}

describe("EX3-016 SnowAgumon", () => {
  it("matches the catalog identity and inherited clause", () => {
    expect(getCardDefinition("EX3-016")).toMatchObject({
      cardId: "EX3-016",
      nameEn: "SnowAgumon",
      colors: ["Blue"],
      kinds: ["Digimon"],
      level: 3,
      playCost: 3,
      dp: 2000,
      evoCosts: [{ color: "Blue", level: 2, memoryCost: 0 }],
      forms: ["Rookie"],
      attributes: ["Vaccine"],
      types: ["Dinosaur"],
      inheritedEffectText:
        "[Opponent's Turn] When an opponent's Digimon with no digivolution cards would digivolve, increase the digivolution cost by 1.",
    });
  });

  it("publishes the opponent-turn inherited replacement as complete IR", () => {
    expect(getCompiledCard("EX3-016")).toMatchObject({
      coverage: "full",
      residual: [],
      effects: [
        {
          trigger: "OpponentsTurn",
          isInherited: true,
          actions: [
            {
              kind: "Replacement",
              event: "wouldDigivolve",
              sourceFilter: {
                digivolutionCards: "none",
                controller: "opponent",
                kind: ["Digimon"],
              },
              actions: [
                {
                  kind: "Replacement",
                  event: "wouldDigivolve",
                  mode: "increaseCost",
                  amount: 1,
                },
              ],
            },
          ],
        },
      ],
    });
  });

  it("does not increase digivolution costs during its controller's turn", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "EX3-017", under: ["EX3-016"], as: "snowHost" },
          { card: "BT1-029", as: "base" },
        ],
        hand: [{ card: "BT1-032", as: "evolver" }],
        deck: ["BT1-030"],
      },
    });
    s.state.memory = 2;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("evolver").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard.cardId === "BT1-032");

    expect(s.state.memory).toBe(0);
  });

  it("increases by 1 an opponent's ordinary digivolution from a Digimon with no sources", async () => {
    const s = opponentTurn(
      setupEngine({
        0: { battleArea: [{ card: "EX3-017", under: ["EX3-016"], as: "iceSnowHost" }] },
        1: {
          battleArea: [{ card: "BT1-029", as: "base" }],
          hand: [{ card: "BT1-032", as: "evolver" }],
          deck: ["BT1-030"],
        },
      }),
      3,
    );
    await s.ready();
    expect(advance(s.engine).ledgers.subTriggers.costReductionFor("wouldDigivolve", s.perm("base"))).toBe(-1);

    expect(
      s.engine.applyIntent(1, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("evolver").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard.cardId === "BT1-032");

    expect(s.state.memory).toBe(-6);
    expect(s.perm("base").stack.map(({ cardId }) => cardId)).toContain("BT1-029");
  });

  it("Q3379 stacks two inherited copies for a total increase of 2", async () => {
    const s = opponentTurn(
      setupEngine({
        0: {
          battleArea: [
            { card: "EX3-017", under: ["EX3-016"], as: "firstHost" },
            { card: "EX3-019", under: ["EX3-016"], as: "secondHost" },
          ],
        },
        1: {
          battleArea: [{ card: "BT1-029", as: "base" }],
          hand: [{ card: "BT1-033", as: "evolver" }],
          deck: ["BT1-030"],
        },
      }),
      4,
    );
    await s.ready();

    expect(
      s.engine.applyIntent(1, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("evolver").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard.cardId === "BT1-033");
    expect(s.state.memory).toBe(-8);
  });

  it("Q3383 does not increase the cost when the base already has a digivolution card", async () => {
    const s = opponentTurn(
      setupEngine({
        0: { battleArea: [{ card: "EX3-017", under: ["EX3-016"], as: "host" }] },
        1: {
          battleArea: [{ card: "BT1-029", under: ["BT1-009"], as: "base" }],
          hand: [{ card: "BT1-032", as: "evolver" }],
          deck: ["BT1-030"],
        },
      }),
      2,
    );
    await s.ready();

    expect(
      s.engine.applyIntent(1, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("evolver").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard.cardId === "BT1-032");
    expect(s.state.memory).toBe(-4);
    expect(s.perm("base").stack.map(({ cardId }) => cardId)).toEqual(["BT1-009", "BT1-029"]);
  });

  it("rejects an invalid evolution source without moving the card", async () => {
    const s = opponentTurn(
      setupEngine({
        1: {
          battleArea: [{ card: "BT1-009", as: "base" }],
          hand: [{ card: "BT1-032", as: "evolver" }],
        },
      }),
      0,
    );
    await s.ready();

    expect(
      s.engine.applyIntent(1, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("evolver").instanceId,
      }),
    ).toEqual({ ok: false, reason: "invalid-evolution" });
    expect(s.perm("base").stack.map(({ cardId }) => cardId)).toEqual([]);
    expect(s.state.players[1]!.hand.map(({ cardId }) => cardId)).toContain("BT1-032");
  });

  it("Q3384 rejects an unaffordable increased cost without moving either card", async () => {
    const s = opponentTurn(
      setupEngine({
        0: { battleArea: [{ card: "EX3-017", under: ["EX3-016"], as: "host" }] },
        1: {
          battleArea: [{ card: "BT1-029", as: "base" }],
          hand: [{ card: "BT1-032", as: "evolver" }],
        },
      }),
      8,
    );
    await s.ready();

    expect(
      s.engine.applyIntent(1, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("evolver").instanceId,
      }),
    ).toEqual({ ok: false, reason: "insufficient-memory" });
    expect(s.perm("base").topCard.cardId).toBe("BT1-029");
    expect(s.state.players[1]!.hand.map(({ cardId }) => cardId)).toContain("BT1-032");
  });

  it("Q3380/Q3381 increases one DNA digivolution only once when one or both materials have no sources", async () => {
    for (const secondHasSource of [false, true]) {
      const s = opponentTurn(
        setupEngine({
          0: { battleArea: [{ card: "EX3-017", under: ["EX3-016"], as: "host" }] },
          1: {
            battleArea: [
              { card: "BT1-037", as: "blueLevel4" },
              { card: "BT1-071", under: secondHasSource ? ["BT1-009"] : [], as: "greenLevel4" },
            ],
            hand: [{ card: "BT12-028", as: "paildramon" }],
            deck: ["BT1-030"],
          },
        }),
        1,
      );
      await s.ready();

      expect(
        s.engine.applyIntent(1, {
          type: "dnaDigivolve",
          materialPermanentIds: [s.perm("blueLevel4").permanentId, s.perm("greenLevel4").permanentId],
          instanceId: s.inst("paildramon").instanceId,
        }),
      ).toEqual({ ok: true });
      await settle(() => s.state.players[1]!.battleArea.some(({ topCard }) => topCard.cardId === "BT12-028"));
      expect(s.state.memory).toBe(-2);
      const dna = s.state.players[1]!.battleArea.find(({ topCard }) => topCard.cardId === "BT12-028");
      expect(dna?.stack.map(({ cardId }) => cardId)).toEqual(expect.arrayContaining(["BT1-037", "BT1-071"]));
    }
  });

  it("Q3382/Q3383 treats a red Tamer as the source-less Digimon, unless it has a card underneath", async () => {
    for (const tamerHasSource of [false, true]) {
      const s = opponentTurn(
        setupEngine({
          0: { battleArea: [{ card: "EX3-017", under: ["EX3-016"], as: "host" }] },
          1: {
            battleArea: [{ card: "BT1-085", under: tamerHasSource ? ["BT1-009"] : [], as: "tamer" }],
            hand: [{ card: "BT4-011", as: "agunimon" }],
            deck: ["BT1-030"],
          },
        }),
        tamerHasSource ? 2 : 3,
      );
      await s.ready();

      expect(
        s.engine.applyIntent(1, {
          type: "digivolve",
          permanentId: s.perm("tamer").permanentId,
          instanceId: s.inst("agunimon").instanceId,
        }),
      ).toEqual({ ok: true });
      await settle(() => s.perm("tamer").topCard.cardId === "BT4-011");
      expect(s.state.memory).toBe(tamerHasSource ? -4 : -6);
      expect(s.perm("tamer").stack.map(({ cardId }) => cardId)).toEqual(
        tamerHasSource ? ["BT1-009", "BT1-085"] : ["BT1-085"],
      );
    }
  });
});
