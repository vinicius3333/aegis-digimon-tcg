import { describe, expect, it } from "vitest";
import { digivolutionRequirementsFor } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { settle } from "../../engine/testkit/harness.js";
import { setupEngine } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { compiled } from "./BT26-024.js";
import "../index.js";

const CARD_ID = "BT26-024";

describe("BT26-024 Tinkermon", () => {
  it("encodes normal WG evolution, other-trait play watcher, and free digivolution", () => {
    expect(digivolutionRequirementsFor(CARD_ID)).toContainEqual({
      level: 2,
      traits: ["WG"],
      cost: 0,
      isAlternate: true,
    });
    expect(compiled.effects.find((effect) => effect.trigger === "YourTurn")).toMatchObject({
      actions: [
        {
          kind: "SubTrigger",
          event: "whenPlayed",
          sourceFilter: { excludeSelf: true },
          actions: [{ kind: "Digivolve", from: ["hand"], payCost: false, optional: true }],
        },
      ],
    });
  });

  it("digivolves for 0 over the off-color WG egg and rejects a non-WG peer", async () => {
    const legal = setupEngine({
      0: {
        breeding: { card: "BT21-003", as: "wgEgg" },
        hand: [{ card: CARD_ID, as: "tinkermon" }],
        deck: ["BT1-009"],
      },
    });
    expect(
      legal.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: legal.perm("wgEgg").permanentId,
        instanceId: legal.inst("tinkermon").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: true });
    await settle(() => legal.perm("wgEgg").topCard.cardId === CARD_ID);
    expect(legal.state.memory).toBe(0);
    expect(legal.perm("wgEgg").stack.map(({ cardId }) => cardId)).toEqual(["BT21-003"]);

    const invalid = setupEngine({
      0: {
        breeding: { card: "BT24-002", as: "plainBlueEgg" },
        hand: [{ card: CARD_ID, as: "tinkermon" }],
      },
    });
    expect(
      invalid.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: invalid.perm("plainBlueEgg").permanentId,
        instanceId: invalid.inst("tinkermon").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual(expect.objectContaining({ ok: false }));
  });

  it("supports both printed yellow and green level-2 evolution requirements", async () => {
    for (const [baseCard, as] of [
      ["BT1-005", "yellowEgg"],
      ["BT1-007", "greenEgg"],
    ] as const) {
      const s = setupEngine({
        0: {
          breeding: { card: baseCard, as },
          hand: [{ card: CARD_ID, as: "tinkermon" }],
          deck: ["BT1-009"],
        },
      });
      s.state.memory = 3;
      await s.ready();

      expect(
        s.engine.applyIntent(0, {
          type: "digivolve",
          permanentId: s.perm(as).permanentId,
          instanceId: s.inst("tinkermon").instanceId,
          useAlternateCost: false,
        }),
      ).toEqual({ ok: true });
      await settle(() => s.perm(as).topCard.cardId === CARD_ID);
      expect(s.state.memory, `normal route from ${baseCard}`).toBe(3);
      expect(s.perm(as).stack.map(({ cardId }) => cardId)).toEqual([baseCard]);
    }
  });

  it("publicly reacts to another trait Digimon's play and digivolves without paying memory", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: CARD_ID, as: "tinkermon" }],
          hand: [
            { card: "BT26-034", as: "playedVegetation" },
            { card: "BT26-027", as: "petermon" },
            { card: "BT1-055", as: "nonTraitEvolution" },
          ],
          deck: ["BT1-009"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 3;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("playedVegetation").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.perm("tinkermon").topCard.instanceId === s.inst("petermon").instanceId);
    expect(s.state.memory).toBe(0);
    expect(s.perm("tinkermon").stack.map(({ cardId }) => cardId)).toEqual([CARD_ID]);
    expect(s.state.players[0]!.hand.map(({ instanceId }) => instanceId)).toContain(
      s.inst("nonTraitEvolution").instanceId,
    );
  });

  it("may decline the triggered digivolution without spending memory or moving the hand card", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: CARD_ID, as: "tinkermon" }],
          hand: [
            { card: "BT26-034", as: "playedVegetation" },
            { card: "BT26-027", as: "petermon" },
          ],
        },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    s.state.memory = 3;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("playedVegetation").instanceId })).toEqual({
      ok: true,
    });
    await settle();

    expect(s.perm("tinkermon").topCard.cardId).toBe(CARD_ID);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toContain(s.inst("petermon").instanceId);
    expect(s.state.memory).toBe(0);
  });

  it("does not react to the opponent playing a matching Digimon on their turn", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: CARD_ID, as: "tinkermon" }],
          hand: [{ card: "BT26-027", as: "petermon" }],
        },
        1: { hand: [{ card: "BT26-034", as: "opponentVegetation" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.turnSeat = 1;
    s.state.memory = -3;

    expect(s.engine.applyIntent(1, { type: "playCard", instanceId: s.inst("opponentVegetation").instanceId })).toEqual({
      ok: true,
    });
    await settle();

    expect(s.perm("tinkermon").topCard.cardId).toBe(CARD_ID);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toContain(s.inst("petermon").instanceId);
  });

  it("does not react to an owned nonmatching Digimon played on its controller's turn", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: CARD_ID, as: "tinkermon" }],
          hand: [
            { card: "BT1-009", as: "nonmatchingPlay" },
            { card: "BT26-027", as: "petermon" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 3;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("nonmatchingPlay").instanceId })).toEqual({
      ok: true,
    });
    await settle();

    expect(s.perm("tinkermon").topCard.cardId).toBe(CARD_ID);
    expect(s.state.players[0]!.hand.map(({ instanceId }) => instanceId)).toContain(s.inst("petermon").instanceId);
    expect(s.decisions.some(({ req }) => req.sourceCardId === CARD_ID)).toBe(false);
  });

  it("grants inherited Barrier only while Tinkermon is under another Digimon", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "BT26-027", as: "host", under: [{ card: CARD_ID, as: "source" }] },
          { card: CARD_ID, as: "top" },
        ],
      },
    });
    await s.ready();
    expect(observe(s.engine).hasKeyword(s.perm("host"), "Barrier")).toBe(true);
    expect(observe(s.engine).hasKeyword(s.perm("top"), "Barrier")).toBe(false);
  });

  it("uses inherited Barrier to trash top security and prevent battle deletion", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT26-027", as: "host", suspended: true, under: [{ card: CARD_ID }] }],
        security: [
          { card: "BT1-009", as: "barrierCost" },
          { card: "BT1-010", as: "remaining" },
        ],
      },
      1: { battleArea: [{ card: "BT1-080", as: "attacker" }] },
    });
    await s.ready();
    s.state.turnSeat = 1;
    const hostId = s.perm("host").permanentId;
    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "permanent", permanentId: hostId },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.events.some((event) => event.kind === "barrierPrompt"));
    expect(s.engine.applyIntent(0, { type: "respondBarrier", permanentId: hostId, accept: true })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.security.length === 1);

    expect(s.state.players[0]!.battleArea).toHaveLength(1);
    expect(s.state.players[0]!.security.map(({ instanceId }) => instanceId)).toEqual([s.inst("remaining").instanceId]);
    expect(s.state.players[0]!.trash.map(({ instanceId }) => instanceId)).toContain(s.inst("barrierCost").instanceId);
  });

  it("does not activate inherited Barrier against effect deletion", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT26-027", as: "host", under: [{ card: CARD_ID }] }],
        security: [{ card: "BT1-009", as: "barrierCost" }],
      },
    });
    await s.ready();
    const hostId = s.perm("host").permanentId;

    expect(await advance(s.engine).verb.deletePermanent([hostId], "byEffect")).toBe(1);
    expect(s.events.some((event) => event.kind === "barrierPrompt")).toBe(false);
    expect(s.state.players[0]!.battleArea).toHaveLength(0);
    expect(s.state.players[0]!.security).toHaveLength(1);
  });

  it("digivolves only into the controller's hand, not an opponent's matching card", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: CARD_ID, as: "tinkermon" }],
          hand: [{ card: "BT26-034", as: "playedVegetation" }],
        },
        1: { hand: [{ card: "BT26-027", as: "opponentPetermon" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 3;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("playedVegetation").instanceId })).toEqual({
      ok: true,
    });
    await settle();

    expect(s.perm("tinkermon").topCard.cardId).toBe(CARD_ID);
    expect(s.state.players[1]!.hand.map(({ instanceId }) => instanceId)).toContain(
      s.inst("opponentPetermon").instanceId,
    );
  });
});
