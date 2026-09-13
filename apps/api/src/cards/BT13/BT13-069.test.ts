import { describe, expect, it } from "vitest";
import { compiled } from "./BT13-069.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT13-076.js";
import "../BT11/BT11-040.js";
import "../ST1/ST1-16.js";

describe("BT13-069 KingSukamon", () => {
  it("plays a level-4 Sukamon on attack and prevents deletion by deleting another Sukamon", () => {
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
    expect(compiled.digivolutionRequirement).toContainEqual(
      expect.objectContaining({ level: 4, names: ["Sukamon"], cost: 3 }),
    );
    expect(compiled.effects[0]).toMatchObject({
      trigger: "WhenAttacking",
      actions: [
        {
          kind: "PlayWithoutCost",
          target: {
            filter: {
              controller: "mine",
              kind: ["Digimon"],
              levelComparison: { op: "lte", value: 4 },
              nameOrTrait: [{ match: "name", tokens: ["Sukamon"] }],
            },
            count: 1,
          },
          from: ["hand"],
          payCost: false,
          optional: true,
        },
      ],
    });
    expect(compiled.effects[1]).toMatchObject({
      trigger: "AllTurns",
      isInherited: true,
      actions: [
        {
          kind: "Replacement",
          event: "wouldBeDeleted",
          sourceFilter: { isSelfRef: true },
          actions: [
            {
              kind: "Prevent",
              optional: true,
              abortOnDecline: true,
              cost: {
                kind: "deleteOwn",
                target: {
                  filter: {
                    controller: "any",
                    excludeSelf: true,
                    kind: ["Digimon"],
                    nameOrTrait: [{ match: "name", tokens: ["Sukamon"] }],
                  },
                  count: 1,
                },
              },
            },
          ],
        },
      ],
    });
  });

  it("plays a Sukamon from hand when the host attacks", async () => {
    const s = setupEngine(
      { 0: { battleArea: [{ card: "BT13-069", as: "king" }], hand: ["BT11-040"] }, 1: { security: ["BT1-009"] } },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("king").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some((p) => p.topCard?.cardId === "BT11-040"), 3000);
    expect(s.state.players[0]!.battleArea.some((p) => p.topCard?.cardId === "BT11-040")).toBe(true);
  });

  it("may delete an opponent's other Sukamon to prevent its legally evolved host's deletion (Q2309)", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT13-069", as: "host" }],
          hand: [{ card: "BT13-076", as: "kingEtemon" }],
          deck: [{ card: "BT1-010", as: "bonus" }],
        },
        1: {
          battleArea: [
            { card: "BT11-040", as: "opponent-sukamon" },
            { card: "BT1-010", as: "redSource" },
          ],
          hand: [{ card: "ST1-16", as: "gaia" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    const hostId = s.perm("host").permanentId;
    const sourceId = s.inst("host").instanceId;
    const opponentSukamonId = s.perm("opponent-sukamon").permanentId;
    const opponentSukamonInstanceId = s.inst("opponent-sukamon").instanceId;
    const gaiaId = s.inst("gaia").instanceId;
    s.state.memory = 10;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: hostId,
        instanceId: s.inst("kingEtemon").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("host").topCard.instanceId === s.inst("kingEtemon").instanceId);
    await settle();
    expect(s.state.memory).toBe(6);
    expect(s.perm("host").stack.map((card) => card.instanceId)).toEqual([sourceId]);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toEqual([s.inst("bonus").instanceId]);
    s.state.turnSeat = 1;
    s.state.memory = 10;
    expect(s.engine.applyIntent(1, { type: "playCard", instanceId: gaiaId })).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.trash.some((card) => card.instanceId === gaiaId));
    await settle();
    expect(s.state.memory).toBe(2);
    expect(s.state.players[0]!.battleArea.map((permanent) => permanent.permanentId)).toEqual([hostId]);
    expect(s.perm("host").stack.map((card) => card.instanceId)).toEqual([sourceId]);
    expect(s.state.players[1]!.battleArea.some(({ permanentId }) => permanentId === opponentSukamonId)).toBe(false);
    expect(s.state.players[1]!.trash.map((card) => card.instanceId)).toContain(opponentSukamonInstanceId);
  });

  it("alternately digivolves from a level-4 Sukamon for 3 memory", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT11-040", as: "sukamon" }], hand: [{ card: "BT13-069", as: "king" }] },
    });
    s.state.memory = 5;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("sukamon").permanentId,
        instanceId: s.inst("king").instanceId,
        alternateRequirementIndex: 0,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("sukamon").topCard?.cardId === "BT13-069");
    expect(s.state.memory).toBe(2);
  });

  it("rejects the alternate evolution from a non-Sukamon level 4", () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT13-066", as: "dorugamon" }], hand: [{ card: "BT13-069", as: "king" }] },
    });
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("dorugamon").permanentId,
        instanceId: s.inst("king").instanceId,
        alternateRequirementIndex: 0,
      }),
    ).toMatchObject({ ok: false });
  });
});
