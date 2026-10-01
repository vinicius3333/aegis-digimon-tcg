import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT8-068.js";

describe("BT8-068 BanchoMamemon", () => {
  it("plays one revealed cost-10-or-less Mamemon per opposing Digimon and trashes the rest", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT10-013", as: "base" }],
          hand: [{ card: "BT8-068", as: "evolving" }],
          deck: [
            "BT1-009",
            { card: "BT6-064", as: "first" },
            { card: "BT3-071", as: "second" },
            { card: "BT1-010", as: "rest" },
          ],
        },
        1: { battleArea: ["BT1-015", "BT1-016"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 3;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("evolving").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.events.some((event) => event.kind === "effectResolved" && event.sourceCardId === "BT8-068"));
    expect(
      s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.instanceId === s.inst("first").instanceId),
    ).toBe(true);
    expect(
      s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.instanceId === s.inst("second").instanceId),
    ).toBe(true);
    expect(s.state.players[0]!.trash.some((card) => card.instanceId === s.inst("rest").instanceId)).toBe(true);
  });

  it("may decline the reveal even when no opposing Digimon are in play", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT10-013", as: "base" }],
          hand: [{ card: "BT8-068", as: "evolving" }],
          deck: ["BT1-009", "BT6-064", "BT3-071", "BT1-010"],
        },
        1: { battleArea: [] },
      },
      { autoDeclineOptional: true },
    );
    s.state.memory = 3;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("evolving").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.decisions.some(({ req }) => req.kind === "optional"));

    expect(s.state.players[0]!.deck).toHaveLength(3);
    expect(s.state.players[0]!.trash).toHaveLength(0);
    expect(s.perm("base").topCard?.cardId).toBe("BT8-068");
  });

  it("checks one additional security while another Mamemon is in play", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "BT8-068", as: "bancho" },
          { card: "BT6-064", as: "mamemon" },
        ],
      },
      1: { security: ["BT1-009", "BT1-010"] },
    });

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("bancho").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.security.length === 0);

    expect(s.state.players[1]!.security).toHaveLength(0);
  });

  it("does not gain the additional security check without another Mamemon", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT8-068", as: "bancho" }] },
      1: { security: ["BT1-009", "BT1-010"] },
    });

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("bancho").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.security.length === 1);

    expect(s.state.players[1]!.security).toHaveLength(1);
  });
});

describe("BT8-068 BanchoMamemon — KB Q&A rulings", () => {
  it("may reveal 3 cards and trashes all of them when the opponent has no Digimon (Q1749)", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT10-013", as: "base" }],
          hand: [{ card: "BT8-068", as: "evolving" }],
          deck: [
            { card: "BT1-009", as: "digivolutionDraw" },
            { card: "BT6-064", as: "mamemon" },
            { card: "BT3-071", as: "metalMamemon" },
            { card: "BT1-010", as: "agumon" },
            { card: "BT1-016", as: "unrevealed" },
          ],
        },
        1: { battleArea: [{ card: "BT8-093", as: "opponentTamer" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 3;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("evolving").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.events.some((event) => event.kind === "effectResolved" && event.sourceCardId === "BT8-068"));

    const player = s.state.players[0]!;
    expect(player.trash.map((card) => card.instanceId).sort()).toEqual(
      [s.inst("mamemon").instanceId, s.inst("metalMamemon").instanceId, s.inst("agumon").instanceId].sort(),
    );
    expect(player.deck.map((card) => card.instanceId)).toEqual([s.inst("unrevealed").instanceId]);
    expect(player.battleArea).toHaveLength(1);
  });

  it("reads memory cost 10 or less as play cost, so a revealed play-cost-11 Mamemon cannot be played (Q1750)", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT10-013", as: "base" }],
          hand: [{ card: "BT8-068", as: "evolving" }],
          deck: [
            "BT1-009",
            { card: "BT8-068", as: "playCostEleven" },
            { card: "BT6-064", as: "playCostSeven" },
            { card: "BT1-010", as: "agumon" },
          ],
        },
        1: { battleArea: ["BT1-015", "BT1-016"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 3;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("evolving").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.events.some((event) => event.kind === "effectResolved" && event.sourceCardId === "BT8-068"));

    const player = s.state.players[0]!;
    const inPlay = (instanceId: string) =>
      player.battleArea.some((permanent) => permanent.topCard?.instanceId === instanceId);
    expect(inPlay(s.inst("playCostSeven").instanceId)).toBe(true);
    expect(inPlay(s.inst("playCostEleven").instanceId)).toBe(false);
    expect(player.trash.some((card) => card.instanceId === s.inst("playCostEleven").instanceId)).toBe(true);
  });
});
