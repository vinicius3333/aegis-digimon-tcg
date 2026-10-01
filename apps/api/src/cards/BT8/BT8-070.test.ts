import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT8-070.js";

describe("BT8-070 BlackWarGreymon", () => {
  it("publishes and applies one combined play-cost-6 budget for opposing Digimon and Tamers", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT8-067", under: ["BT8-064"], as: "base" }],
          hand: [{ card: "BT8-070", as: "evolving" }],
        },
        1: {
          battleArea: [
            { card: "BT1-009", as: "digimon" },
            { card: "BT8-093", as: "tamer" },
            { card: "BT1-015", as: "tooExpensive" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 4;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("evolving").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.battleArea.length === 1);

    expect(s.state.players[1]!.battleArea).toHaveLength(1);
    expect(s.perm("tooExpensive").topCard?.cardId).toBe("BT1-015");
  });

  it("may unsuspend once when its digivolution effect deletes an opposing Digimon", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT8-067", under: ["BT8-064"], as: "base", suspended: true }],
          hand: [{ card: "BT8-070", as: "evolving" }],
        },
        1: { battleArea: [{ card: "BT1-009", as: "target" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 4;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("evolving").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(
      () => s.state.players[1]!.trash.some((card) => card.cardId === "BT1-009") && !s.perm("base").isSuspended,
    );

    expect(s.perm("base").isSuspended).toBe(false);
  });
});

describe("BT8-070 BlackWarGreymon — KB Q&A rulings", () => {
  type StackEntry = { card: string; under?: string[] };

  async function digivolveOnto(base: StackEntry, opponentBattleArea: { card: string; as: string }[]) {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ ...base, as: "base" }],
          hand: [{ card: "BT8-070", as: "evolving" }],
        },
        1: { battleArea: opponentBattleArea },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 4;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("evolving").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.events.some((event) => event.kind === "effectResolved" && event.sourceCardId === "BT8-070"));
    return s;
  }

  const opponentCardIds = (s: Awaited<ReturnType<typeof digivolveOnto>>) =>
    s.state.players[1]!.battleArea.map((permanent) => permanent.topCard?.cardId);

  it("deletes both an opposing Digimon and an opposing Tamer with red and black digivolution cards (Q1751)", async () => {
    const opponent = [
      { card: "BT1-009", as: "digimon" },
      { card: "BT8-093", as: "tamer" },
    ];
    const redAndBlack = await digivolveOnto({ card: "BT1-020", under: ["BT8-064"] }, opponent);
    expect(opponentCardIds(redAndBlack)).toEqual([]);

    const redOnly = await digivolveOnto({ card: "BT1-020", under: ["BT1-015"] }, opponent);
    expect(opponentCardIds(redOnly)).toEqual(["BT8-093"]);
  });

  it("shares one play-cost-6 budget between opposing Digimon and Tamers (Q1752)", async () => {
    const s = await digivolveOnto({ card: "BT1-020", under: ["BT8-064"] }, [
      { card: "BT1-018", as: "costFiveDigimon" },
      { card: "BT1-085", as: "costFourTamer" },
    ]);

    const survivors = opponentCardIds(s);
    expect(survivors).toHaveLength(1);
    expect(s.state.players[1]!.trash).toHaveLength(1);
  });

  it("uses both parts when a single red and black multicolor card is its only digivolution card (Q1753)", async () => {
    const s = await digivolveOnto({ card: "BT8-067" }, [
      { card: "BT1-009", as: "digimon" },
      { card: "BT8-093", as: "tamer" },
    ]);

    expect(s.perm("base").stack.map((card) => card.cardId)).toEqual(["BT8-067"]);
    expect(opponentCardIds(s)).toEqual([]);
  });
});
