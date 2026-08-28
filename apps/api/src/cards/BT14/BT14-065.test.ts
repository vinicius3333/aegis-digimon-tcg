import { describe, expect, it } from "vitest";
import { compiled } from "./BT14-065.js";

describe("BT14-065", () => {
  it("reveals three opponent cards and de-digivolves an opponent by one plus one per own Digimon", () => {
    for (const trigger of ["OnPlay", "WhenDigivolving"])
      expect(compiled.effects?.find((entry) => entry.trigger === trigger)).toMatchObject({
        actions: [
          { kind: "RevealAdd", controller: "opponent", revealCount: 3, rest: "deckTopOrBottom" },
          {
            kind: "DeDigivolve",
            amount: 1,
            scaling: { unit: "cards", per: 1, filter: { zone: "revealed", kind: ["Digimon"] } },
          },
        ],
      });
  });

  it("naturally reveals the opponent deck and scales repeated de-digivolution from revealed Digimon", async () => {
    const s = setupEngine(
      {
        0: { hand: [{ card: "BT14-065", as: "source" }] },
        1: {
          deck: ["BT14-055", "BT14-064", "BT14-061"],
          battleArea: [{ card: "BT14-067", as: "target", under: ["BT14-055", "BT14-061", "BT14-064"] }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true },
    );
    s.state.memory = 10;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("source").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[1]!.battleArea[0]!.topCard.cardId === "BT14-055");

    expect(s.state.players[1]!.battleArea[0]!.topCard.cardId).toBe("BT14-055");
    expect(s.state.players[1]!.trash.map((card) => card.cardId)).toEqual(["BT14-067", "BT14-064", "BT14-061"]);
    expect(s.state.players[1]!.deck.map((card) => card.cardId)).toEqual(["BT14-055", "BT14-064", "BT14-061"]);
  });

  it("naturally resolves the When Digivolving trigger from a public evolution", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "BT14-065", as: "evolving" }],
          battleArea: [{ card: "BT14-061", as: "base" }],
        },
        1: {
          deck: ["BT14-055", "BT1-001", "BT1-002"],
          battleArea: [{ card: "BT14-067", as: "target", under: ["BT14-064"] }],
        },
      },
      { autoSelectCards: true, autoChooseOption: true },
    );
    s.state.memory = 3;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("evolving").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.battleArea[0]!.topCard.cardId === "BT14-064");

    expect(s.state.players[0]!.battleArea[0]!.topCard.cardId).toBe("BT14-065");
    expect(s.state.players[1]!.battleArea[0]!.topCard.cardId).toBe("BT14-064");
    expect(s.state.players[1]!.trash.map((card) => card.cardId)).toEqual(["BT14-067"]);
    expect(s.state.players[1]!.deck.map((card) => card.cardId)).toEqual(["BT14-055", "BT1-001", "BT1-002"]);
  });
});
