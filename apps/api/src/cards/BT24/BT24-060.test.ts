import { describe, expect, it } from "vitest";
import { observe } from "../../engine/testkit/observe.js";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled as BT24_060 } from "./BT24-060.js";
import "../index.js";

describe("BT24-060 Hisyaryumon", () => {
  it("captures the printed reveal, suspension, attack, and replacement structure", () => {
    const attack = BT24_060.effects?.find((entry) => entry.trigger === "WhenAttacking");
    // The digivolve rides on the reveal as `digivolveOption` (the shape runRevealAdd consumes),
    // not as a second action: it is the same decision window as the reveal, not a later one.
    expect(attack?.actions?.[0]).toMatchObject({
      kind: "RevealAdd",
      revealCount: 3,
      rest: "deckTopOrBottom",
      digivolveOption: {
        payCost: false,
        into: { nameOrTrait: [{ tokens: ["DigiPolice", "SEEKERS"], match: "trait" }] },
      },
    });
    const placement = BT24_060.effects?.find((entry) => entry.trigger === "AllTurns" && !entry.isInherited)
      ?.actions?.[0] as any;
    expect(placement).toMatchObject({
      event: "onAddDigivolutionCards",
      triggerFilter: { isSelfRef: true },
      addedDigivolutionCardFilter: { kind: ["Tamer"] },
    });
    const inherited = BT24_060.effects?.find((entry) => entry.isInherited);
    expect(inherited).toMatchObject({ trigger: "AllTurns", frequency: "OncePerTurn" });
    expect(inherited?.actions?.[0]).toMatchObject({
      affectsAll: true,
      cost: { kind: "playFromDigivolutionCards", hostTarget: { filter: { isSelfRef: true } } },
    });
  });

  it("When Attacking may digivolve into a revealed DigiPolice card without paying", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT24-060", as: "hisyaryumon" }],
          deck: [
            { card: "BT24-064", as: "ouryumon" },
            { card: "BT1-001", as: "miss1" },
            { card: "BT1-002", as: "miss2" },
          ],
        },
        1: { security: ["BT1-003", "BT1-004"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true, autoOrderCards: true },
    );
    s.state.memory = 3;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("hisyaryumon").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("hisyaryumon").topCard.instanceId === s.inst("ouryumon").instanceId);
    await settle(() => !observe(s.engine).isAttacking());

    expect(s.state.memory).toBe(3);
  });

  it("returns all revealed cards to the chosen deck end when evolution is declined", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT24-060", as: "hisyaryumon" }],
          deck: ["BT24-064", "BT1-001", "BT1-002"],
        },
        1: { security: ["BT1-003"] },
      },
      { autoDeclineOptional: true, autoChooseOption: true, autoOrderCards: true },
    );
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("hisyaryumon").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => !observe(s.engine).isAttacking());

    expect(s.state.players[0]!.deck.map((card) => card.cardId)).toEqual(["BT24-064", "BT1-001", "BT1-002"]);
  });

  it.each([
    ["normal black level-4 requirement", "BT10-062", false, 4],
    ["normal green level-4 requirement", "BT1-069", false, 4],
    ["alternate DigiPolice/SEEKERS requirement", "BT24-055", true, 3],
  ])("uses the %s", async (_label, baseCard, useAlternateCost, expectedCost) => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: baseCard, as: "base" }],
        hand: [{ card: "BT24-060", as: "hisyaryumon" }],
      },
    });
    s.state.memory = 5;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("hisyaryumon").instanceId,
        ...(useAlternateCost ? { useAlternateCost: true, alternateRequirementIndex: 0 } : {}),
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard.instanceId === s.inst("hisyaryumon").instanceId);

    expect(s.state.memory).toBe(5 - expectedCost);
  });

  it("suspends an opponent Digimon when a Tamer is placed in its own stack", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT24-060", as: "hisyaryumon" }],
          hand: [{ card: "BT15-087", as: "shuu" }],
        },
        1: { battleArea: [{ card: "BT1-009", as: "target" }] },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    await s.ready();

    await advance(s.engine).verb.placeUnder(s.perm("hisyaryumon").permanentId, [s.inst("shuu").instanceId]);
    await settle(() => s.perm("target").isSuspended);

    expect(s.perm("target").isSuspended).toBe(true);
  });

  it("may attack the Digimon it suspends after a Tamer enters its stack", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT24-060", as: "hisyaryumon" }],
          hand: [{ card: "BT15-087", as: "shuu" }],
        },
        1: { battleArea: [{ card: "BT1-009", as: "target" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const targetId = s.perm("target").permanentId;
    await s.ready();

    await advance(s.engine).verb.placeUnder(s.perm("hisyaryumon").permanentId, [s.inst("shuu").instanceId]);
    await settle(() => s.state.players[1]!.battleArea.every((permanent) => permanent.permanentId !== targetId));
    await settle(() => !observe(s.engine).isAttacking());

    expect(s.state.players[1]!.battleArea.some((permanent) => permanent.permanentId === targetId)).toBe(false);
    expect(s.perm("hisyaryumon").isSuspended).toBe(true);
  });

  it("Q5782: one inherited payment prevents every qualifying simultaneous departure", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT24-064", as: "host", under: ["BT24-060", "BT15-087"] },
            { card: "BT24-054", as: "other" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const hostId = s.perm("host").permanentId;
    const otherId = s.perm("other").permanentId;
    await s.ready();

    await advance(s.engine).verb.deletePermanent([hostId, otherId], "byEffect");
    await settle(() => s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.cardId === "BT15-087"));

    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.permanentId === hostId)).toBe(true);
    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.permanentId === otherId)).toBe(true);
    expect(s.perm("host").stack.some((card) => card.cardId === "BT15-087")).toBe(false);
  });
});
