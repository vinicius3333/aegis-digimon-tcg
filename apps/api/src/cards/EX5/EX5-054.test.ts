import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./EX5-054.js";

describe("EX5-054 Etemon", () => {
  it("deletes one opposing low-cost Digimon or Tamer with cost scaling from trashed Etemon/Sukamon", () => {
    for (const trigger of ["OnPlay", "WhenDigivolving"] as const) {
      expect(compiled.effects?.find((entry) => entry.trigger === trigger)?.actions[0]).toMatchObject({
        kind: "Delete",
        target: {
          count: 1,
          filter: {
            controller: "opponent",
            kind: ["Digimon", "Tamer"],
            playCostLte: 3,
            playCostLteScaling: {
              per: 1,
              unit: "trash",
              filter: { controller: "mine", nameOrTrait: [{ match: "name", tokens: ["Etemon", "Sukamon"] }] },
            },
          },
        },
      });
    }
  });
  it("can redirect an opponent's attack by placing an Etemon or Sukamon from hand on security", () => {
    expect(compiled.effects?.find((entry) => entry.trigger === "OpponentsTurn")).toMatchObject({
      frequency: "OncePerTurn",
      actions: [
        {
          kind: "SubTrigger",
          event: "whenOpponentAttacks",
          sourceFilter: { controller: "opponent", kind: ["Digimon"] },
          cost: {
            kind: "place",
            destination: "security",
            position: "top",
            target: {
              from: ["hand"],
              count: 1,
              filter: {
                controller: "mine",
                nameOrTrait: [{ match: "name", tokens: ["Etemon", "Sukamon"] }],
              },
            },
          },
          actions: [{ kind: "RedirectAttack", target: { filter: { isSelfRef: true }, isSelf: true, count: 1 } }],
        },
      ],
    });
  });

  it("deletes the exact scaled play-cost boundary and preserves a card above it", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "EX5-054", as: "source" }],
          trash: ["BT11-040", "BT11-041"],
        },
        1: {
          battleArea: [
            { card: "BT1-018", as: "boundary" },
            { card: "BT1-021", as: "above" },
          ],
        },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 12;
    await s.ready();
    const boundaryId = s.perm("boundary").permanentId;
    const aboveId = s.perm("above").permanentId;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("source").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => !s.state.players[1]!.battleArea.some((p) => p.permanentId === boundaryId));
    expect(s.state.players[1]!.battleArea.some((p) => p.permanentId === boundaryId)).toBe(false);
    expect(s.state.players[1]!.battleArea.some((p) => p.permanentId === aboveId)).toBe(true);
  });

  it("places the paid Etemon-name card and redirects a public opponent attack", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "EX5-054", as: "source" }], hand: ["BT11-040"], security: ["BT1-001"] },
        1: { battleArea: [{ card: "BT1-009", as: "attacker" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.turnSeat = 1;
    await s.ready();
    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.security.some((card) => card.cardId === "BT11-040"));
    expect(s.state.players[0]!.security[0]!.cardId).toBe("BT11-040");
    expect(s.events.some((event) => event.kind === "attackDeclared" && event.target.kind === "permanent")).toBe(true);
  });
});
