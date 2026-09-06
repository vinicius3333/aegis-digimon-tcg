import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { compiled } from "./BT21-055.js";
import "../BT3/BT3-026.js";
import "../index.js";

describe("BT21-055 Sunarizamon", () => {
  it("uses the printed normal evolution from a black level-2 base for zero memory", async () => {
    const s = setupEngine({
      0: {
        breeding: { card: "BT2-005", as: "egg" },
        hand: [{ card: "BT21-055", as: "sunari" }],
      },
    });
    s.state.memory = 3;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("egg").permanentId,
        instanceId: s.inst("sunari").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("egg").topCard.cardId === "BT21-055");
    expect(s.perm("egg").stack.map((card) => card.cardId)).toEqual(["BT2-005"]);
    expect(s.state.memory).toBe(3);
  });

  it("reduces eligible digivolution costs and deletes after its stack card is trashed", () => {
    const yourTurn = compiled.effects.find((entry) => entry.trigger === "YourTurn");
    const inherited = compiled.effects.find((entry) => entry.isInherited);

    expect(yourTurn?.actions[0]).toMatchObject({
      kind: "Replacement",
      event: "wouldDigivolve",
      sourceFilter: { isSelfRef: true },
      into: { nameOrTrait: [{ tokens: ["Mineral", "Rock"], match: "trait" }] },
    });
    expect(inherited?.actions).toEqual([
      {
        kind: "SubTrigger",
        event: "onDigivolutionCardDiscarded",
        sourceFilter: { isSelfRef: true },
        requireByEffect: true,
        hostFilter: {
          controller: "mine",
          kind: ["Digimon"],
          nameOrTrait: [
            { tokens: ["Mineral"], match: "trait" },
            { tokens: ["Rock"], match: "trait", orPrevious: true },
          ],
        },
        actions: [
          {
            kind: "Delete",
            target: { filter: { controller: "opponent", kind: ["Digimon"], playCostLte: 4 }, count: 1 },
          },
        ],
      },
    ]);
  });

  it("deletes an opposing low-play-cost Digimon when the inherited card is trashed", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT10-062", as: "host", under: [{ card: "BT21-055", as: "stacked" }] }],
        },
        1: {
          battleArea: [
            { card: "BT1-009", as: "eligible" },
            { card: "BT1-010", as: "tooExpensive" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );

    await advance(s.engine).verb.trashDigivolutionCards(s.perm("host").permanentId, [s.inst("stacked").instanceId], 0);
    await settle(() => s.state.players[1]!.trash.some((card) => card.instanceId === s.inst("eligible").instanceId));

    expect(s.state.players[1]!.battleArea.some((p) => p.permanentId === s.perm("tooExpensive").permanentId)).toBe(true);
  });

  it("publicly triggers the inherited deletion when BT3-026 trashes a legal Mineral stack source", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT21-055", as: "sunari" }],
          hand: [{ card: "BT10-062", as: "golemon" }],
          deck: ["BT1-003"],
          security: ["BT1-001", "BT1-002"],
        },
        1: {
          battleArea: [
            { card: "BT3-029", as: "magna", under: ["BT3-026"] },
            { card: "BT1-009", as: "eligible" },
            { card: "BT1-084", as: "tooExpensive" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 3;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("sunari").permanentId,
        instanceId: s.inst("golemon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("sunari").topCard.cardId === "BT10-062");
    const sourceId = s.perm("sunari").stack[0]!.instanceId;
    expect(s.perm("sunari").topCard.cardId).toBe("BT10-062");
    s.state.turnSeat = 1;

    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("magna").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.trash.some((card) => card.instanceId === sourceId));
    await settle(
      () => s.state.players[1]!.trash.some((card) => card.cardId === "BT1-009") && !observe(s.engine).isAttacking(),
    );

    expect(s.state.players[0]!.trash.some((card) => card.instanceId === sourceId)).toBe(true);
    expect(s.state.players[1]!.battleArea.some((p) => p.topCard.cardId === "BT1-009")).toBe(false);
    expect(s.state.players[1]!.battleArea.some((p) => p.topCard.cardId === "BT1-084")).toBe(true);
  });

  it("does not trigger when the inherited source is trashed as a non-effect cost", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT10-062", as: "host", under: [{ card: "BT21-055", as: "stacked" }] }] },
        1: { battleArea: [{ card: "BT1-009", as: "eligible" }] },
      },
      { autoSelectCards: true },
    );
    await s.ready();

    await advance(s.engine).verb.trashDigivolutionCards(s.perm("host").permanentId, [s.inst("stacked").instanceId]);

    expect(
      s.state.players[1]!.battleArea.some((permanent) => permanent.permanentId === s.perm("eligible").permanentId),
    ).toBe(true);
  });

  it("reduces a Mineral evolution by 1 in the battle area", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT21-055", as: "sunarizamon" }],
        hand: [{ card: "BT10-062", as: "golemon" }],
      },
    });
    s.state.memory = 3;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("sunarizamon").permanentId,
        instanceId: s.inst("golemon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("sunarizamon").topCard.instanceId === s.inst("golemon").instanceId);

    expect(s.state.memory).toBe(3);
  });

  it("Q4559 does not reduce the same evolution in the breeding area", async () => {
    const s = setupEngine({
      0: {
        breeding: { card: "BT21-055", as: "sunarizamon" },
        hand: [{ card: "BT10-062", as: "golemon" }],
      },
    });
    s.state.memory = 3;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("sunarizamon").permanentId,
        instanceId: s.inst("golemon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("sunarizamon").topCard.instanceId === s.inst("golemon").instanceId);

    expect(s.state.memory).toBe(2);
  });
});
