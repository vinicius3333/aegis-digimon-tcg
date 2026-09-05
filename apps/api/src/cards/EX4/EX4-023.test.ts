import { describe, expect, it } from "vitest";
import { getCardDefinition } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./EX4-023.js";
import "../BT9/BT9-103.js";
import "../index.js";

describe("EX4-023 Agumon Expert", () => {
  it("registers its official identity and same-level security effect", () => {
    expect(getCardDefinition("EX4-023")).toMatchObject({
      cardId: "EX4-023",
      nameEn: "Agumon Expert",
      colors: ["Yellow"],
      level: 3,
      playCost: 3,
      dp: 1000,
      evoCosts: [{ color: "Yellow", level: 2, memoryCost: 0 }],
      forms: ["Rookie"],
      attributes: ["Vaccine"],
      types: ["Dinosaur"],
    });
    expect(compiled.effects?.find((entry) => entry.trigger === "OpponentsTurn")?.actions?.[0]).toMatchObject({
      kind: "SubTrigger",
      event: "whenPlayed",
      sourceFilter: { controller: "opponent", kind: ["Digimon"] },
      actions: [
        {
          kind: "SecurityManipulation",
          op: "placeAsSecurity",
          toTop: true,
          source: "revealed",
          cost: {
            kind: "reveal",
            target: { filter: { zone: "hand", controller: "mine", levelEqTriggerSource: true } },
          },
        },
      ],
    });
  });

  it("digivolves from a yellow level-2 Digi-Egg for 0", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT1-006", as: "base" }],
        hand: [{ card: "EX4-023", as: "expert" }],
      },
    });
    s.state.memory = 0;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("expert").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard.cardId === "EX4-023");

    expect(s.state.memory).toBe(0);
    expect(s.perm("base").stack.map((card) => card.cardId)).toEqual(["BT1-006"]);
  });

  it("places the revealed same-level hand card on top of security when an opponent Digimon is played", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX4-023", as: "expert" }],
          hand: [{ card: "BT1-009", as: "revealed" }],
          security: ["BT1-001"],
        },
        1: { hand: [{ card: "BT1-010", as: "played" }], security: ["BT1-001"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.turnSeat = 1;
    await s.ready();
    s.state.memory = 10;
    expect(s.engine.applyIntent(1, { type: "playCard", instanceId: s.inst("played").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.security.some((card) => card.instanceId === s.inst("revealed").instanceId));

    expect(s.state.players[0]!.security[0]!.cardId).toBe("BT1-009");
    expect(s.state.players[0]!.security[0]!.instanceId).toBe(s.inst("revealed").instanceId);
  });

  it("places the exact card selected by the reveal cost when another same-level card is in hand", async () => {
    const preferredInstanceIds: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX4-023", as: "expert" }],
          hand: [
            { card: "BT1-009", as: "revealed" },
            { card: "BT1-010", as: "otherSameLevel" },
          ],
          security: ["BT1-001"],
        },
        1: { hand: [{ card: "BT1-011", as: "played" }], security: ["BT1-001"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferredInstanceIds },
    );
    preferredInstanceIds.push(s.inst("revealed").instanceId);
    s.state.turnSeat = 1;
    await s.ready();
    s.state.memory = 10;
    expect(s.engine.applyIntent(1, { type: "playCard", instanceId: s.inst("played").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.security.some((card) => card.instanceId === s.inst("revealed").instanceId));

    expect(s.state.players[0]!.security[0]!.instanceId).toBe(s.inst("revealed").instanceId);
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("otherSameLevel").instanceId)).toBe(true);
  });

  it("does not activate without a same-level card in hand", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX4-023", as: "expert" }],
          hand: [{ card: "EX4-016", as: "wrongLevel" }],
          security: ["BT1-001"],
        },
        1: { hand: [{ card: "BT1-010", as: "played" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.turnSeat = 1;
    s.state.memory = 10;
    await s.ready();

    expect(s.engine.applyIntent(1, { type: "playCard", instanceId: s.inst("played").instanceId })).toEqual({
      ok: true,
    });
    await settle();

    expect(s.state.players[0]!.hand.map((card) => card.cardId)).toEqual(["EX4-016"]);
    expect(s.state.players[0]!.security.map((card) => card.cardId)).toEqual(["BT1-001"]);
  });

  it("allows the player to decline the optional reveal", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX4-023", as: "expert" }],
          hand: [{ card: "BT1-009", as: "sameLevel" }],
          security: ["BT1-001"],
        },
        1: { hand: [{ card: "BT1-010", as: "played" }] },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    s.state.turnSeat = 1;
    s.state.memory = 10;
    await s.ready();

    expect(s.engine.applyIntent(1, { type: "playCard", instanceId: s.inst("played").instanceId })).toEqual({
      ok: true,
    });
    await settle();

    expect(s.state.players[0]!.hand.map((card) => card.cardId)).toEqual(["BT1-009"]);
    expect(s.state.players[0]!.security.map((card) => card.cardId)).toEqual(["BT1-001"]);
  });

  it("activates only once per opponent turn", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX4-023", as: "expert" }],
          hand: [
            { card: "BT1-009", as: "firstReveal" },
            { card: "BT1-010", as: "secondReveal" },
          ],
          security: ["BT1-001"],
        },
        1: {
          hand: [
            { card: "BT1-010", as: "firstPlay" },
            { card: "BT1-011", as: "secondPlay" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.turnSeat = 1;
    s.state.memory = 10;
    await s.ready();

    expect(s.engine.applyIntent(1, { type: "playCard", instanceId: s.inst("firstPlay").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.security.length === 2);
    expect(s.engine.applyIntent(1, { type: "playCard", instanceId: s.inst("secondPlay").instanceId })).toEqual({
      ok: true,
    });
    await settle();

    expect(s.state.players[0]!.security).toHaveLength(2);
    expect(s.state.players[0]!.hand).toHaveLength(1);
  });

  it("does not activate during its owner's turn", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "EX4-023", as: "expert" }],
        hand: [{ card: "BT1-009", as: "sameLevel" }],
        security: ["BT1-001"],
      },
      1: { hand: [{ card: "BT1-010", as: "opponentPlay" }] },
    });
    s.state.turnSeat = 0;
    await s.ready();

    await advance(s.engine).verb.playInstances([s.inst("opponentPlay").instanceId]);

    expect(s.state.players[0]!.hand.map((card) => card.cardId)).toEqual(["BT1-009"]);
    expect(s.state.players[0]!.security.map((card) => card.cardId)).toEqual(["BT1-001"]);
  });

  it("Q3465 does not treat two level-less Calumon cards as having the same level", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX4-023", as: "expert" }],
          hand: [{ card: "EX2-045", as: "ownCalumon" }],
          security: ["BT1-001"],
        },
        1: { hand: [{ card: "EX2-045", as: "opponentCalumon" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.turnSeat = 1;
    s.state.memory = 10;
    await s.ready();

    expect(s.engine.applyIntent(1, { type: "playCard", instanceId: s.inst("opponentCalumon").instanceId })).toEqual({
      ok: true,
    });
    await settle();

    expect(s.state.players[0]!.hand.map((card) => card.cardId)).toEqual(["EX2-045"]);
    expect(s.state.players[0]!.security.map((card) => card.cardId)).toEqual(["BT1-001"]);
  });

  it("Q3464 trashes the revealed card when Kongou prevents adding it to security", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX4-023", as: "expert" }],
          hand: [{ card: "BT1-009", as: "revealed" }],
          security: ["BT1-001"],
        },
        1: {
          battleArea: ["BT9-029"],
          hand: [
            { card: "BT9-103", as: "kongou" },
            { card: "BT1-010", as: "played" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.turnSeat = 1;
    s.state.memory = 10;
    await s.ready();

    expect(s.engine.applyIntent(1, { type: "playCard", instanceId: s.inst("kongou").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[1]!.trash.some((card) => card.cardId === "BT9-103"));
    expect(s.engine.applyIntent(1, { type: "playCard", instanceId: s.inst("played").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.trash.some((card) => card.instanceId === s.inst("revealed").instanceId));

    expect(s.state.players[0]!.security.map((card) => card.cardId)).toEqual(["BT1-001"]);
    expect(s.state.players[0]!.hand).toHaveLength(0);
    expect(s.state.players[0]!.trash.some((card) => card.cardId === "BT1-009")).toBe(true);
  });
});
