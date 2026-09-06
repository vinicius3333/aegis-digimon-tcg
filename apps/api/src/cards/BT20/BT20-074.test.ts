import { getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { compiled } from "./BT20-074.js";
import "../ST2/ST2-16.js";
import "../BT2/BT2-107.js";
import "./BT20-076.js";
import "./index.js";

describe("BT20-074 Dinobeemon", () => {
  it("may return one Imperialdramon-named or Free Digimon from trash on play and digivolving", () => {
    for (const trigger of ["OnPlay", "WhenDigivolving"] as const) {
      expect(compiled.effects.find((effect) => effect.trigger === trigger)).toMatchObject({
        actions: [
          {
            kind: "Return",
            to: "hand",
            optional: true,
            target: {
              filter: {
                zone: "trash",
                controller: "mine",
                kind: ["Digimon"],
                nameOrTrait: [
                  { tokens: ["Imperialdramon"], match: "name" },
                  { tokens: ["Free"], match: "trait" },
                ],
              },
              count: 1,
            },
          },
        ],
      });
    }
  });

  it("offers DNA digivolution from hand when a qualifying Dinobeemon or Paildramon would return", () => {
    expect(compiled.effects.find((effect) => effect.trigger === "AllTurns")).toMatchObject({
      actions: [
        {
          kind: "SubTrigger",
          event: "wouldBeReturned",
          sourceFilter: {
            controller: "mine",
            kind: ["Digimon"],
            nameOrTrait: [{ tokens: ["Dinobeemon", "Paildramon"], match: "name" }],
            returnDestination: ["hand", "deck"],
          },
          actions: [
            {
              kind: "DnaDigivolve",
              optional: true,
              payCost: true,
              materials: { filter: { controller: "mine", kind: ["Digimon"] }, count: 2 },
              into: {
                controller: "mine",
                kind: ["Digimon"],
                zone: "hand",
                nameOrTrait: [{ tokens: ["Imperialdramon: Dragon Mode"], match: "name" }],
              },
            },
          ],
        },
      ],
    });
  });

  it("inherits prevention of Option security effects for the turn", () => {
    expect(compiled.effects.find((effect) => effect.isInherited)).toMatchObject({
      trigger: "YourTurn",
      actions: [
        {
          kind: "GrantStatic",
          grant: { kind: "PreventSecurityActivation", cardType: "Option" },
          duration: "forTheTurn",
        },
      ],
    });
  });

  it("publishes the printed stats and purple/red evolution routes", () => {
    expect(getCardDefinition("BT20-074")).toMatchObject({
      level: 5,
      playCost: 8,
      dp: 8000,
      evoCosts: [
        { color: "Purple", level: 4, memoryCost: 4 },
        { color: "Red", level: 4, memoryCost: 4 },
      ],
    });
  });

  it("on play and evolution returns the Imperialdramon-name and Free-trait arms from trash", async () => {
    for (const [mode, recovered] of [
      ["play", "BT20-076"],
      ["digivolve", "BT20-066"],
    ] as const) {
      const preferred: string[] = [];
      const s = setupEngine(
        {
          0: {
            ...(mode === "digivolve" ? { battleArea: [{ card: "BT20-067", as: "base" }] } : {}),
            hand: [{ card: "BT20-074", as: "dinobeemon" }],
            trash: [
              { card: recovered, as: "recovered" },
              { card: "BT20-047", as: "nonmatch" },
            ],
            deck: ["BT20-047"],
          },
        },
        { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferred },
      );
      preferred.push(s.inst("recovered").instanceId);
      s.state.memory = mode === "play" ? 8 : 4;
      const result =
        mode === "play"
          ? s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("dinobeemon").instanceId })
          : s.engine.applyIntent(0, {
              type: "digivolve",
              permanentId: s.perm("base").permanentId,
              instanceId: s.inst("dinobeemon").instanceId,
            });
      expect(result).toEqual({ ok: true });
      await settle(() => s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("recovered").instanceId));
      expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toContain(s.inst("nonmatch").instanceId);
    }
  });

  it("may decline the optional trash return and leaves the eligible card in trash", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "BT20-074", as: "dinobeemon" }],
          trash: [{ card: "BT20-076", as: "eligible" }],
        },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    s.state.memory = 8;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("dinobeemon").instanceId })).toEqual({
      ok: true,
    });
    await settle(
      () =>
        s.state.pendingDecision === undefined &&
        s.state.players[0]!.battleArea.some((p) => p.topCard.cardId === "BT20-074"),
    );
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toContain(s.inst("eligible").instanceId);
    expect(s.state.players[0]!.hand.map((card) => card.cardId)).not.toContain("BT20-076");
  });

  it("Q4400 DNA digivolves a returning material and the new Imperialdramon remains in battle", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT20-074", as: "dinobeemon" },
            { card: "BT20-016", as: "paildramon" },
          ],
          hand: [{ card: "BT20-076", as: "dragonMode" }],
          deck: ["BT20-047"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    await advance(s.engine).verb.returnToHand([s.inst("dinobeemon").instanceId]);
    const result = s.state.players[0]!.battleArea.find((permanent) => permanent.topCard.cardId === "BT20-076");
    expect(result).toBeDefined();
    expect(result!.stack.map((card) => card.cardId)).toEqual(expect.arrayContaining(["BT20-074", "BT20-016"]));
    expect(s.state.players[0]!.hand.map((card) => card.cardId)).not.toContain("BT20-074");
  });

  it("Q4400 also cancels the original deck return after DNA digivolving the material", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT20-074", as: "dinobeemon" },
            { card: "BT20-016", as: "paildramon" },
          ],
          hand: [{ card: "BT20-076", as: "dragonMode" }],
          deck: ["BT20-047"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    await advance(s.engine).verb.returnToDeck([s.inst("dinobeemon").instanceId]);
    const result = s.state.players[0]!.battleArea.find((permanent) => permanent.topCard.cardId === "BT20-076");
    expect(result).toBeDefined();
    expect(result!.stack.map((card) => card.cardId)).toEqual(expect.arrayContaining(["BT20-074", "BT20-016"]));
    expect(s.state.players[0]!.deck.map((card) => card.cardId)).not.toContain("BT20-074");
  });

  it("Q4400 triggers from a public opponent Cocytus Breath and replaces the return with DNA", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT20-074", as: "dinobeemon" },
            { card: "BT20-016", as: "paildramon" },
          ],
          hand: [{ card: "BT20-076", as: "dragonMode" }],
          deck: ["BT20-047"],
        },
        1: { battleArea: [{ card: "BT1-027", as: "blueSource" }], hand: [{ card: "ST2-16", as: "cocytus" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.turnSeat = 1;
    s.state.memory = 10;
    await s.ready();
    expect(s.engine.applyIntent(1, { type: "playCard", instanceId: s.inst("cocytus").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.battleArea.some((p) => p.topCard.cardId === "BT20-076"));
    const result = s.state.players[0]!.battleArea.find((p) => p.topCard.cardId === "BT20-076");
    expect(result?.stack.map((card) => card.cardId)).toEqual(expect.arrayContaining(["BT20-074", "BT20-016"]));
    expect(s.state.players[0]!.hand.map((card) => card.cardId)).not.toContain("BT20-074");
    expect(s.state.players[1]!.trash.map((card) => card.cardId)).toContain("ST2-16");
  });

  it("Q4400 can be declined through the public return effect, leaving the material in hand", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT20-074", as: "dinobeemon" },
            { card: "BT20-016", as: "paildramon" },
          ],
          hand: [{ card: "BT20-076", as: "dragonMode" }],
          deck: ["BT20-047"],
        },
        1: { battleArea: [{ card: "BT1-027", as: "blueSource" }], hand: [{ card: "ST2-16", as: "cocytus" }] },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    s.state.turnSeat = 1;
    s.state.memory = 10;
    await s.ready();
    expect(s.engine.applyIntent(1, { type: "playCard", instanceId: s.inst("cocytus").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.hand.some((card) => card.cardId === "BT20-074"));
    expect(s.state.players[0]!.hand.map((card) => card.cardId)).toContain("BT20-074");
    expect(s.state.players[0]!.battleArea.map((p) => p.topCard.cardId)).toEqual(["BT20-016"]);
    expect(s.state.players[0]!.hand.map((card) => card.cardId)).toContain("BT20-076");
  });

  it("Q4400 returns the material normally when no Dragon Mode result is available", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT20-074", as: "dinobeemon" },
            { card: "BT20-016", as: "paildramon" },
          ],
          deck: ["BT20-047"],
        },
        1: { battleArea: [{ card: "BT1-027", as: "blueSource" }], hand: [{ card: "ST2-16", as: "cocytus" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.turnSeat = 1;
    s.state.memory = 10;
    await s.ready();
    expect(s.engine.applyIntent(1, { type: "playCard", instanceId: s.inst("cocytus").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.hand.some((card) => card.cardId === "BT20-074"));
    expect(s.state.players[0]!.hand.map((card) => card.cardId)).toContain("BT20-074");
    expect(s.state.players[0]!.battleArea.map((p) => p.topCard.cardId)).toEqual(["BT20-016"]);
  });

  it("inherits Option Security suppression only on its controller's turn", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT20-076", under: ["BT20-074"], as: "host" }] },
      1: { security: ["BT2-107"] },
    });
    s.state.turnSeat = 0;
    s.state.memory = 10;
    await s.ready();
    expect(observe(s.engine).suppressesSecurityEffect(s.perm("host"), "BT2-107")).toBe(true);
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.security.length === 0);
    expect(s.state.memory).toBe(10);
    s.state.turnSeat = 1;
    await advance(s.engine).recompute();
    expect(observe(s.engine).suppressesSecurityEffect(s.perm("host"), "BT2-107")).toBe(false);
  });

  it("allows the same security Option to resolve without the inherited source", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT20-076", as: "host" }] }, 1: { security: ["BT2-107"] } });
    s.state.turnSeat = 0;
    s.state.memory = 10;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.security.length === 0);
    expect(s.state.memory).toBe(8);
  });
});
