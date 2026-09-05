import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "../BT10/BT10-058.js";
import "../BT11/BT11-072.js";
import "./EX1-050.js";

describe("EX1-050 MetalMamemon", () => {
  it("adds a level 6 Machine and trashes the other revealed cards", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX1-047", as: "base" }],
          hand: [{ card: "EX1-050", as: "evo" }],
          deck: ["BT11-072", "BT1-009", "BT1-010"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 5;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("evo").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.hand.some((card) => card.cardId === "BT11-072"));
    await settle(() => s.state.players[0]!.trash.length === 2);
    expect(s.state.players[0]!.trash).toHaveLength(2);
  });

  it("honors refusal and leaves the deck untouched", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX1-047", as: "base" }],
          hand: [{ card: "EX1-050", as: "evo" }],
          deck: ["BT1-009", "BT1-010", "BT11-072"],
        },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    s.state.memory = 5;
    await s.ready();
    const deckBefore = s.state.players[0]!.deck.length;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("evo").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard.cardId === "EX1-050");
    expect(s.state.players[0]!.deck).toHaveLength(deckBefore - 1);
    expect(s.state.players[0]!.trash).toHaveLength(0);
    expect(s.state.players[0]!.hand.some((card) => card.cardId === "BT11-072")).toBe(false);
  });

  it("trashes all revealed non-Machine cards when no level 6 Machine is found", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX1-047", as: "base" }],
          hand: [{ card: "EX1-050", as: "evo" }],
          deck: ["BT1-009", "BT1-010", "BT1-011", "BT1-012"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 5;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("evo").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.trash.length === 3);
    expect(s.state.players[0]!.trash).toHaveLength(3);
    expect(s.state.players[0]!.hand.some((card) => card.cardId === "BT11-072")).toBe(false);
  });

  it("resolves a reveal of fewer than three cards after the digivolution draw", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX1-047", as: "base" }],
          hand: [{ card: "EX1-050", as: "evo" }],
          deck: ["BT1-009", "BT1-010"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 5;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("evo").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.trash.length === 1);
    expect(s.state.players[0]!.deck).toHaveLength(0);
    expect(s.state.players[0]!.trash).toHaveLength(1);
  });

  it("deletes an opposing Digimon with play cost 5 or less when a Machine host attacks", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT11-072", as: "host", under: ["BT10-058", "EX1-047", "EX1-050"] }] },
        1: {
          battleArea: [
            { card: "BT1-018", as: "costFive" },
            { card: "BT1-075", as: "costSix" },
          ],
          security: ["BT1-001", "BT1-001"],
        },
      },
      { autoSelectCards: true },
    );
    const costFiveId = s.perm("costFive").topCard.instanceId;
    const costSixId = s.perm("costSix").topCard.instanceId;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.trash.some((card) => card.instanceId === costFiveId));
    expect(s.state.players[1]!.trash.some((card) => card.instanceId === costFiveId)).toBe(true);
    expect(s.state.players[1]!.battleArea.some((permanent) => permanent.topCard.instanceId === costSixId)).toBe(true);
  });
});
