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
