import { describe, expect, it } from "vitest";
import { getCardDefinition } from "@aegis/shared";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "../index.js";
import { compiled } from "./BT15-029.js";

describe("BT15-029", () => {
  it("matches the immutable catalog identity and blue level-4 evolution route", () => {
    expect(getCardDefinition("BT15-029")).toMatchObject({
      nameEn: "MegaSeadramon",
      colors: ["Blue"],
      kinds: ["Digimon"],
      level: 5,
      playCost: 7,
      dp: 7000,
      evoCosts: [{ color: "Blue", level: 4, memoryCost: 3 }],
      types: ["Aquatic"],
    });
  });

  it("places another blue Digimon as bottom source to return an opposing Digimon at or below its level", () => {
    expect(compiled.effects?.[0]?.actions[0]).toMatchObject({
      kind: "Return",
      to: "deckBottom",
      target: { filter: { levelLte: "placedDigimonLevel" } },
      cost: {
        kind: "place",
        targetIsPermanent: true,
        shedOwnCards: true,
        storeAs: "placedDigimonLevel",
      },
    });
    expect(compiled.effects?.[1]).toMatchObject({ trigger: "WhenDigivolving", actions: [{ kind: "Return" }] });
  });
  it("once per turn may unsuspend by placing another blue Digimon underneath", () =>
    expect(compiled.effects?.[2]).toMatchObject({
      trigger: "WhenAttacking",
      isInherited: true,
      frequency: "OncePerTurn",
      actions: [
        {
          kind: "Unsuspend",
          cost: { kind: "place", targetIsPermanent: true, shedOwnCards: true },
          optional: true,
        },
      ],
    }));

  it("pays the On Play cost first, then bottoms only a Digimon at or below the placed card's level", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "BT15-029", as: "megaSeadramon" }],
          battleArea: [{ card: "BT15-025", as: "placedLevelFour" }],
        },
        1: {
          battleArea: [
            { card: "BT15-025", as: "eligibleLevelFour" },
            { card: "BT15-029", as: "ineligibleLevelFive" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 7;
    await s.ready();
    const placedPermanentId = s.perm("placedLevelFour").permanentId;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("megaSeadramon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() =>
      s.state.players[1]!.deck.some(({ instanceId }) => instanceId === s.inst("eligibleLevelFour").instanceId),
    );

    expect(s.state.players[0]!.battleArea.map(({ permanentId }) => permanentId)).not.toContain(placedPermanentId);
    expect(s.state.players[1]!.deck.at(-1)?.instanceId).toBe(s.inst("eligibleLevelFour").instanceId);
    expect(s.state.players[1]!.battleArea.map(({ permanentId }) => permanentId)).toContain(
      s.perm("ineligibleLevelFive").permanentId,
    );
  });

  it("the inherited effect pays with another blue Digimon, unsuspends its host, and is once per turn", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            {
              card: "BT15-030",
              as: "host",
              under: [
                { card: "BT15-025", as: "inheritedBase" },
                { card: "BT15-029", as: "inherited" },
              ],
            },
            { card: "BT15-025", as: "firstCost" },
            { card: "BT15-025", as: "secondCost" },
          ],
        },
        1: { battleArea: [{ card: "BT1-009", as: "defender", suspended: true }], security: ["BT1-001"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("host").isSuspended === false);
    expect(s.perm("host").isSuspended).toBe(false);
    expect(s.perm("host").stack).toHaveLength(3);
    expect(s.perm("host").stack.map(({ instanceId }) => instanceId)).toContain(s.inst("firstCost").instanceId);

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "permanent", permanentId: s.perm("defender").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("host").isSuspended);
    expect(s.perm("host").isSuspended).toBe(true);
    expect(s.perm("host").stack).toHaveLength(3);
    expect(s.state.players[0]!.battleArea.map(({ permanentId }) => permanentId)).toContain(
      s.perm("secondCost").permanentId,
    );
  });

  it("When Digivolving uses the placed Digimon's exact level as the return ceiling", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT15-025", as: "base" },
            {
              card: "BT15-023",
              as: "placedLevelThree",
              under: [{ card: "BT15-002", as: "materialPriorSource" }],
            },
          ],
          hand: [{ card: "BT15-029", as: "megaSeadramon" }],
          deck: ["BT1-009"],
        },
        1: {
          battleArea: [
            { card: "BT15-023", as: "eligibleLevelThree" },
            { card: "BT15-025", as: "ineligibleLevelFour" },
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
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("megaSeadramon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() =>
      s.state.players[1]!.deck.some(({ instanceId }) => instanceId === s.inst("eligibleLevelThree").instanceId),
    );

    expect(s.perm("base").stack.map(({ instanceId }) => instanceId)).toEqual([
      s.inst("placedLevelThree").instanceId,
      s.inst("base").instanceId,
    ]);
    expect(s.state.players[0]!.trash.map(({ instanceId }) => instanceId)).toEqual(
      expect.arrayContaining([s.inst("materialPriorSource").instanceId]),
    );
    expect(s.state.players[1]!.battleArea.map(({ permanentId }) => permanentId)).toContain(
      s.perm("ineligibleLevelFour").permanentId,
    );
  });

  it("cannot return anything when no other blue Digimon can pay the placement cost", async () => {
    const s = setupEngine(
      {
        0: { hand: [{ card: "BT15-029", as: "megaSeadramon" }] },
        1: { battleArea: [{ card: "BT15-023", as: "wouldBeTarget" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 7;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("megaSeadramon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.battleArea.some(({ topCard }) => topCard.cardId === "BT15-029"));

    expect(s.state.players[1]!.battleArea.map(({ permanentId }) => permanentId)).toContain(
      s.perm("wouldBeTarget").permanentId,
    );
    expect(s.state.players[1]!.deck).toHaveLength(0);
  });
});
