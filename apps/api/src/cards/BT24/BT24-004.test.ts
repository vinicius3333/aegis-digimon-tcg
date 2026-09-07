import { getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./BT24-004.js";
import "../index.js";

describe("BT24-004 Wanyamon", () => {
  it("matches the catalog identity", () => {
    expect(getCardDefinition("BT24-004")).toMatchObject({
      cardId: "BT24-004",
      nameEn: "Wanyamon",
      colors: ["Green"],
      kinds: ["DigiEgg"],
      level: 2,
      types: ["Lesser", "Iliad", "TS"],
    });
  });

  it("draws once when one of your Iliad Digimon is played during your turn", () => {
    const inherited = compiled.effects.find((effect) => effect.isInherited) as any;
    expect(inherited.frequency).toBe("OncePerTurn");
    expect(inherited.actions[0]).toMatchObject({
      kind: "SubTrigger",
      event: "whenPlayed",
      sourceFilter: { controller: "mine", kind: ["Digimon"], nameOrTrait: [{ tokens: ["Iliad"], match: "trait" }] },
    });
    expect(inherited.actions[0].actions[0]).toMatchObject({ kind: "Draw", amount: 1 });
  });

  it("draws once for your Iliad Digimon but not near-matching or opposing plays", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "BT1-029", as: "host", under: ["BT24-004"] },
          { card: "BT24-022", as: "ownIliad" },
          { card: "BT1-029", as: "ownNonIliad" },
        ],
        deck: [
          { card: "BT1-009", as: "firstDraw" },
          { card: "BT1-010", as: "secondDraw" },
        ],
      },
      1: { battleArea: [{ card: "BT24-022", as: "opposingIliad" }] },
    });
    s.state.turnSeat = 0;
    await s.ready();

    await advance(s.engine).fireSubTrigger("whenPlayed", {
      subjectPermanentId: s.perm("ownNonIliad").permanentId,
    });
    await advance(s.engine).fireSubTrigger("whenPlayed", {
      subjectPermanentId: s.perm("opposingIliad").permanentId,
    });
    expect(s.state.players[0]!.hand).toHaveLength(0);

    await advance(s.engine).fireSubTrigger("whenPlayed", {
      subjectPermanentId: s.perm("ownIliad").permanentId,
    });
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toEqual([s.inst("firstDraw").instanceId]);

    await advance(s.engine).fireSubTrigger("whenPlayed", {
      subjectPermanentId: s.perm("ownIliad").permanentId,
    });
    expect(s.state.players[0]!.hand).toHaveLength(1);
  });

  it("fires from the public play intent for your Iliad Digimon", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT1-029", as: "host", under: ["BT24-004"] }],
        hand: [{ card: "BT24-022", as: "playedIliad" }],
        deck: [{ card: "BT1-009", as: "drawn" }],
      },
    });
    s.state.memory = 10;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("playedIliad").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("drawn").instanceId));

    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toContain(s.inst("drawn").instanceId);
  });

  it("rejects an opposing Iliad play during the opponent's turn", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT1-029", as: "host", under: ["BT24-004"] }], deck: [{ card: "BT1-009", as: "drawn" }] },
      1: { hand: [{ card: "BT24-022", as: "opposingIliad" }], deck: ["BT1-009", "BT1-010"] },
    });
    s.state.turnSeat = 1;
    s.state.memory = 10;
    await s.ready();
    expect(s.engine.applyIntent(1, { type: "playCard", instanceId: s.inst("opposingIliad").instanceId })).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.battleArea.some((p) => p.topCard?.instanceId === s.inst("opposingIliad").instanceId));
    expect(s.state.players[0]!.hand).toHaveLength(0);
    expect(s.state.players[0]!.deck).toHaveLength(1);
  });

  it("resets the inherited draw on the next actual owner turn", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT1-029", as: "host", under: ["BT24-004"] }],
        hand: [{ card: "BT24-022", as: "first" }, { card: "BT24-022", as: "second" }],
        deck: [
          { card: "BT1-009", as: "initialDraw" },
          { card: "BT1-010", as: "effectDraw1" },
          { card: "BT1-011", as: "effectDraw2" },
          { card: "BT1-012", as: "extra" },
        ],
      },
      1: { deck: ["BT1-009", "BT1-010", "BT1-011", "BT1-012"] },
    });
    s.state.turnSeat = 0;
    await s.ready();
    s.state.memory = 10;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("first").instanceId })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.hand.some((c) => c.instanceId === s.inst("initialDraw").instanceId));
    expect(s.state.players[0]!.hand.map((c) => c.instanceId)).toContain(s.inst("initialDraw").instanceId);
    s.state.turnSeat = 1;
    s.state.memory = 3;
    await advance(s.engine).runTurn(1);
    s.state.turnSeat = 0;
    s.state.memory = 3;
    const secondTurn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(0);
    s.state.memory = 10;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("second").instanceId })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.hand.some((c) => c.instanceId === s.inst("effectDraw1").instanceId));
    expect(s.state.players[0]!.hand.map((c) => c.instanceId)).toContain(s.inst("effectDraw1").instanceId);
    advance(s.engine).endMainPhaseIfOpen(0);
    await secondTurn;
  });

  it("reaches Wanyamon through a legal egg-to-Iliad evolution stack", async () => {
    const s = setupEngine({
      0: {
        breeding: { card: "BT24-004", as: "egg" },
        hand: [
          { card: "BT24-043", as: "tapirmon" },
          { card: "BT24-022", as: "playedIliad" },
        ],
        deck: [{ card: "BT1-009", as: "drawn" }],
      },
    });
    s.state.memory = 10;
    await s.ready();

    const eggId = s.perm("egg").permanentId;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: eggId,
        instanceId: s.inst("tapirmon").instanceId,
        useAlternateCost: true,
        alternateRequirementIndex: 0,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("egg").topCard.cardId === "BT24-043");
    expect(s.perm("egg").stack.map((card) => card.cardId)).toEqual(["BT24-004"]);
  });
});
