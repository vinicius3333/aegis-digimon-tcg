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

  it.each([
    ["a non-WG Digimon", { seat: 0, card: "BT1-009" }],
    ["an opponent WG Digimon", { seat: 1, card: "BT21-048" }],
    ["a WG Option", { seat: 0, card: "BT21-095" }],
  ])("does not draw for %s", async (_label, subject) => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "BT21-034", as: "host", under: ["BT21-003"] },
          ...(subject.seat === 0 ? [{ card: subject.card, as: "subject" }] : []),
        ],
        deck: [{ card: "BT1-001", as: "top" }],
      },
      1: {
        battleArea: subject.seat === 1 ? [{ card: subject.card, as: "subject" }] : [],
      },
    });
    await s.ready();

    await advance(s.engine).fireSubTrigger("whenPlayed", {
      subjectPermanentId: s.perm("subject").permanentId,
    });

    expect(s.state.players[0]!.hand).toHaveLength(0);
    expect(s.state.players[0]!.deck).toHaveLength(1);
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
