import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./BT21-003.js";
import "../index.js";

describe("BT21-003 Yokomon", () => {
  it("encodes the inherited once-per-turn trigger for one of your played WG Digimon", () => {
    expect(compiled.effects).toEqual([
      expect.objectContaining({
        trigger: "YourTurn",
        isInherited: true,
        frequency: "OncePerTurn",
        actions: [
          {
            kind: "SubTrigger",
            event: "whenPlayed",
            sourceFilter: {
              controller: "mine",
              kind: ["Digimon"],
              nameOrTrait: [{ tokens: ["WG"], match: "trait" }],
            },
            actions: [{ kind: "Draw", controller: "mine", amount: 1 }],
          },
        ],
      }),
    ]);
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
  });

  it("draws when a WG Digimon is played beside a realistic Yokomon evolution stack", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "BT21-034", as: "host", under: ["BT21-003", "BT21-033"] },
          { card: "BT21-048", as: "playedWG" },
        ],
        deck: [{ card: "BT1-001", as: "drawn" }],
      },
    });
    await s.ready();

    await advance(s.engine).fireSubTrigger("whenPlayed", {
      subjectPermanentId: s.perm("playedWG").permanentId,
    });

    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toContain(s.inst("drawn").instanceId);
    expect(s.perm("host").stack.map((card) => card.cardId)).toEqual(["BT21-003", "BT21-033"]);
    expect(s.perm("host").topCard.cardId).toBe("BT21-034");
  });

  it("builds the WG stack through public evolution", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT21-003", as: "host" }],
        hand: [
          { card: "BT21-033", as: "lv3" },
          { card: "BT21-034", as: "lv4" },
        ],
      },
    });
    s.state.memory = 10;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("host").permanentId,
        instanceId: s.inst("lv3").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("host").topCard.cardId === "BT21-033");
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("host").permanentId,
        instanceId: s.inst("lv4").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("host").topCard.cardId === "BT21-034");
    expect(s.perm("host").stack.map((card) => card.cardId)).toEqual(["BT21-003", "BT21-033"]);
    expect(s.state.memory).toBe(8);
  });

  it("draws when a WG Digimon is played through the public play action", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT21-034", as: "host", under: ["BT21-003", "BT21-033"] }],
          hand: [{ card: "BT21-034", as: "playedWG" }],
          deck: [{ card: "BT1-001", as: "drawn" }],
        },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("playedWG").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("drawn").instanceId));

    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toContain(s.inst("drawn").instanceId);
  });

  it("does not draw when a non-WG Digimon is publicly played", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT21-034", as: "host", under: ["BT21-003", "BT21-033"] }],
          hand: [{ card: "BT1-009", as: "nonWG" }],
          deck: [{ card: "BT1-001", as: "top" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.turnSeat = 0;
    s.state.memory = 10;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("nonWG").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.battleArea.some((p) => p.topCard.instanceId === s.inst("nonWG").instanceId));

    expect(s.state.players[0]!.hand).toHaveLength(0);
    expect(s.state.players[0]!.deck.map((card) => card.instanceId)).toEqual([s.inst("top").instanceId]);
  });

  it("does not draw when an opponent WG Digimon is publicly played during your turn", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT21-034", as: "host", under: ["BT21-003", "BT21-033"] },
            { card: "BT1-009", as: "attacker" },
          ],
          deck: [{ card: "BT1-001", as: "top" }],
        },
        1: {
          hand: [{ card: "BT21-034", as: "opponentWG" }],
          security: [{ card: "BT21-095", as: "securityOption" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.turnSeat = 0;
    s.state.memory = 10;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() =>
      s.state.players[1]!.battleArea.some((p) => p.topCard.instanceId === s.inst("opponentWG").instanceId),
    );

    expect(s.state.players[0]!.hand).toHaveLength(0);
    expect(s.state.players[0]!.deck.map((card) => card.instanceId)).toEqual([s.inst("top").instanceId]);
  });

  it("does not draw when a WG Option is publicly played", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT21-034", as: "host", under: ["BT21-003", "BT21-033"] }],
          hand: [{ card: "BT21-095", as: "option" }],
          deck: [{ card: "BT1-001", as: "top" }],
          security: [{ card: "BT1-002", as: "security" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.turnSeat = 0;
    s.state.memory = 10;
    await s.ready();
    const optionId = s.inst("option").instanceId;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: optionId })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.security.some((card) => card.instanceId === optionId));

    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toEqual([s.inst("security").instanceId]);
    expect(s.state.players[0]!.deck.map((card) => card.instanceId)).toEqual([s.inst("top").instanceId]);
  });

  it("draws only once when multiple WG Digimon are played in the same turn", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT21-034", as: "host", under: ["BT21-003", "BT21-033"] }],
          hand: [
            { card: "BT21-048", as: "firstWG" },
            { card: "BT21-048", as: "secondWG" },
          ],
          deck: [
            { card: "BT1-001", as: "firstDraw" },
            { card: "BT1-002", as: "secondDraw" },
          ],
        },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    await s.ready();

    s.state.memory = 10;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("firstWG").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("firstDraw").instanceId));
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("secondWG").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.battleArea.filter((p) => p.topCard.cardId === "BT21-048").length === 2);

    expect(s.state.players[0]!.hand).toHaveLength(1);
    expect(s.state.players[0]!.deck).toHaveLength(1);
  });
});
