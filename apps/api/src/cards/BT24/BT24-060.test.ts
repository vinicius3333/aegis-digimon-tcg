import { getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { observe } from "../../engine/testkit/observe.js";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled as BT24_060 } from "./BT24-060.js";
import "../index.js";

describe("BT24-060 Hisyaryumon", () => {
  it("matches the catalog identity", () => {
    expect(getCardDefinition("BT24-060")).toMatchObject({
      cardId: "BT24-060",
      nameEn: "Hisyaryumon",
      colors: ["Black", "Green"],
      kinds: ["Digimon"],
      level: 5,
      playCost: 7,
      dp: 7000,
      forms: ["Ultimate"],
      attributes: ["Vaccine"],
      types: ["Beast Dragon", "X Antibody", "DigiPolice", "SEEKERS"],
    });
  });

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
    expect(
      BT24_060.effects?.find((entry) => entry.trigger === "AllTurns" && !entry.isInherited)?.actions?.[0],
    ).toMatchObject({
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
            { card: "BT1-013", as: "miss1" },
            { card: "BT1-015", as: "miss2" },
            { card: "BT1-016", as: "bonusDraw" },
          ],
        },
        1: { security: ["BT1-013", "BT1-015"] },
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
    expect(s.perm("hisyaryumon").topCard.instanceId).toBe(s.inst("ouryumon").instanceId);
    expect(s.perm("hisyaryumon").stack.map((card) => card.instanceId)).toEqual([s.inst("hisyaryumon").instanceId]);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toContain(s.inst("bonusDraw").instanceId);
    expect(s.state.players[0]!.deck.map((card) => card.instanceId)).toEqual(
      expect.arrayContaining([s.inst("miss1").instanceId, s.inst("miss2").instanceId]),
    );
  });

  it("returns all revealed cards to the chosen deck end when evolution is declined", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT24-060", as: "hisyaryumon" }],
          deck: ["BT24-064", "BT1-013", "BT1-015"],
        },
        1: { security: ["BT1-013"] },
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

    expect(s.state.players[0]!.deck.map((card) => card.cardId)).toEqual(["BT24-064", "BT1-013", "BT1-015"]);
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
    expect(s.perm("base").topCard.instanceId).toBe(s.inst("hisyaryumon").instanceId);
    expect(s.perm("base").stack[0]!.instanceId).toBe(s.inst("base").instanceId);
  });

  it("suspends an opponent Digimon when a Tamer is placed in its own stack", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT24-060", as: "hisyaryumon" }],
          hand: [{ card: "BT15-087", as: "shuu" }],
        },
        1: { battleArea: [{ card: "BT1-009", as: "target", dp: 1000 }] },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    await s.ready();

    await advance(s.engine).verb.placeUnder(s.perm("hisyaryumon").permanentId, [s.inst("shuu").instanceId]);
    await settle(() => s.perm("target").isSuspended);

    expect(s.perm("target").isSuspended).toBe(true);
  });

  it("may attack the Digimon it suspends after a Tamer enters its stack", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT24-060", as: "hisyaryumon" },
            { card: "BT24-086", as: "mindLink" },
          ],
          hand: [{ card: "BT1-009", as: "playedDigimon" }],
          deck: ["BT1-013", "BT1-013", "BT1-013", "BT1-013"],
        },
        1: { battleArea: [{ card: "BT1-009", as: "target" }] },
      },
      {
        autoAcceptOptional: true,
        autoSelectCards: true,
        autoChooseOption: true,
        autoOrderCards: true,
        autoOrderTriggers: true,
        preferInstanceIds: preferred,
      },
    );
    const targetId = s.perm("target").permanentId;
    const mindLinkId = s.inst("mindLink").instanceId;
    preferred.push(targetId);
    s.state.memory = 10;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("playedDigimon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.perm("hisyaryumon").stack.some((card) => card.instanceId === mindLinkId));
    await settle(() => s.events.some((event) => event.kind === "alliancePrompt"));
    const alliance = s.events.find((event) => event.kind === "alliancePrompt");
    if (alliance?.kind !== "alliancePrompt") throw new Error("Alliance prompt missing");
    expect(s.engine.applyIntent(0, { type: "respondAlliance", allyPermanentId: alliance.eligibleAllyIds[0] })).toEqual({
      ok: true,
    });
    await settle(() => !s.state.players[1]!.battleArea.some((permanent) => permanent.permanentId === targetId));

    expect(s.state.players[1]!.battleArea.some((permanent) => permanent.permanentId === targetId)).toBe(false);
    expect(s.perm("hisyaryumon").isSuspended).toBe(true);
  });

  it("publicly declines the optional attack after suspending the target", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT24-060", as: "hisyaryumon" }],
          hand: [{ card: "BT15-087", as: "shuu" }],
        },
        1: { battleArea: [{ card: "BT1-009", as: "target" }] },
      },
      { autoAcceptOptional: false, autoSelectCards: true },
    );
    const targetId = s.perm("target").permanentId;
    await s.ready();

    const placement = advance(s.engine).verb.placeUnder(s.perm("hisyaryumon").permanentId, [s.inst("shuu").instanceId]);
    await settle(() => s.perm("target").isSuspended && s.state.pendingDecision?.kind === "optional");
    const attackDecision = s.state.pendingDecision!;
    expect(attackDecision.payloadJson).toContain("attack");
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: attackDecision.decisionId,
        response: { kind: "optional", accept: false },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision === undefined);
    await placement;

    expect(s.perm("target").permanentId).toBe(targetId);
    expect(s.perm("target").isSuspended).toBe(true);
    expect(s.perm("hisyaryumon").isSuspended).toBe(false);
    expect(observe(s.engine).isAttacking()).toBe(false);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("Q5782: one inherited payment prevents every qualifying simultaneous departure", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            {
              card: "BT24-064",
              as: "host",
              dp: 1000,
              under: [{ card: "BT24-060" }, { card: "BT24-086", as: "stackTamer" }],
            },
            { card: "BT24-054", as: "other", dp: 1000 },
          ],
        },
        1: { battleArea: [{ card: "BT24-085", as: "redSource" }], hand: [{ card: "BT6-095", as: "happyBullet" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const hostId = s.perm("host").permanentId;
    const otherId = s.perm("other").permanentId;
    const stackTamerId = s.inst("stackTamer").instanceId;
    s.state.turnSeat = 1;
    s.state.memory = 7;
    await s.ready();
    expect(s.engine.applyIntent(1, { type: "playCard", instanceId: s.inst("happyBullet").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.cardId === "BT15-087"));

    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.permanentId === hostId)).toBe(true);
    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.permanentId === otherId)).toBe(true);
    expect(s.perm("host").stack.map((card) => card.instanceId)).not.toContain(stackTamerId);
    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.instanceId === stackTamerId)).toBe(
      true,
    );
    expect(s.state.players[1]!.trash.some((card) => card.instanceId === s.inst("happyBullet").instanceId)).toBe(true);
  });

  it("Q5782 refusal allows both simultaneous qualifying departures", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT24-064", as: "host", dp: 1000, under: ["BT24-060", "BT15-087"] },
            { card: "BT24-054", as: "other", dp: 1000 },
          ],
        },
        1: { battleArea: [{ card: "BT24-085", as: "redSource" }], hand: [{ card: "BT6-095", as: "happyBullet" }] },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    s.state.turnSeat = 1;
    s.state.memory = 7;
    await s.ready();
    expect(s.engine.applyIntent(1, { type: "playCard", instanceId: s.inst("happyBullet").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.battleArea.length === 0);
    expect(s.state.players[0]!.battleArea).toHaveLength(0);
  });
});
