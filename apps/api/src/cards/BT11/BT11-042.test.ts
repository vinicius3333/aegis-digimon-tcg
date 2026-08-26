import { getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { compiled } from "./BT11-042.js";

describe("BT11-042 Angewomon", () => {
  it("maps the catalog and all three executable clauses", () => {
    expect(getCardDefinition("BT11-042")).toMatchObject({
      cardId: "BT11-042",
      colors: ["Yellow"],
      level: 5,
      playCost: 7,
      dp: 6000,
      evoCosts: [
        { color: "Yellow", level: 4, memoryCost: 3 },
        { color: "Purple", level: 4, memoryCost: 3 },
      ],
      types: ["Archangel"],
    });
    expect(compiled.effects).toHaveLength(3);
    expect(compiled.effects[0]).toMatchObject({
      trigger: "WhenDigivolving",
      actions: [
        { kind: "Search", searchZone: "security" },
        { kind: "SecurityManipulation", op: "addTop" },
        { kind: "SecurityManipulation", op: "shuffle" },
      ],
    });
    expect(compiled.effects[1]).toMatchObject({ trigger: "YourTurn", frequency: "OncePerTurn" });
    expect(compiled.effects[2]).toMatchObject({ trigger: "OpponentsTurn", isInherited: true });
  });

  it("searches all security, adds an Angel-family card, recovers and shuffles", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT11-039", as: "base" }],
          hand: [{ card: "BT11-042", as: "angewomon" }],
          security: [
            { card: "BT11-038", as: "angel" },
            { card: "BT1-001", as: "securityRest" },
          ],
          deck: [{ card: "BT1-001", as: "recovery" }, "BT1-001"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("angewomon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        s.state.players[0]!.security.length === 2 &&
        s.state.players[0]!.hand.some(({ instanceId }) => instanceId === s.inst("angel").instanceId),
    );

    expect(s.state.players[0]!.hand.map(({ instanceId }) => instanceId)).toContain(s.inst("angel").instanceId);
    expect(s.state.players[0]!.security).toHaveLength(2);
    expect(s.state.players[0]!.deck.map(({ instanceId }) => instanceId)).not.toContain(s.inst("recovery").instanceId);
  });

  it("may decline its security search, then shuffles without recovering", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT11-039", as: "base" }],
          hand: [{ card: "BT11-042", as: "angewomon" }],
          security: [{ card: "BT11-038", as: "angel" }],
          // Normal digivolution draws the first card before this optional effect resolves;
          // leave the second card as the Recovery sentinel.
          deck: ["BT1-001", { card: "BT1-001", as: "recovery" }],
        },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("angewomon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard.cardId === "BT11-042");

    expect(s.state.players[0]!.hand).not.toContainEqual(
      expect.objectContaining({ instanceId: s.inst("angel").instanceId }),
    );
    expect(s.state.players[0]!.security).toHaveLength(1);
    expect(s.state.players[0]!.deck.map(({ instanceId }) => instanceId)).toContain(s.inst("recovery").instanceId);
  });

  it("gains 1 memory when its controller plays LadyDevimon", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT11-042", as: "angewomon" }],
        hand: [{ card: "BT11-083", as: "ladyDevimon" }],
      },
    });
    s.state.memory = 10;
    const playCost = 7;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("ladyDevimon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.memory === 10 - playCost + 1);

    expect(s.state.memory).toBe(4);
  });

  it("uses each printed evolution color and only gains memory once for LadyDevimon or Mirei", async () => {
    for (const base of ["BT11-039", "BT11-080"] as const) {
      const s = setupEngine({
        0: {
          battleArea: [{ card: base, as: "base" }],
          hand: [{ card: "BT11-042", as: "angewomon" }],
          deck: ["BT1-001"],
        },
      });
      s.state.memory = 5;
      expect(
        s.engine.applyIntent(0, {
          type: "digivolve",
          permanentId: s.perm("base").permanentId,
          instanceId: s.inst("angewomon").instanceId,
        }),
      ).toEqual({ ok: true });
      await settle(() => s.perm("base").topCard.cardId === "BT11-042");
      expect(s.state.memory).toBe(2);
    }

    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT11-042", as: "angewomon" }],
        hand: [
          { card: "BT11-083", as: "lady" },
          { card: "BT11-094", as: "mirei" },
        ],
      },
    });
    s.state.memory = 20;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("lady").instanceId })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.length === 2);
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("mirei").instanceId })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.length === 3);
    expect(s.state.memory).toBe(20 - 7 - 3 + 1);
  });

  it("inherited effect grants Blocker to Angel-family Digimon on the opponent's turn while a purple Digimon is in play", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "BT11-083", under: ["BT11-042"] },
          { card: "BT11-038", as: "angemon" },
        ],
      },
    });
    s.state.turnSeat = 1;
    await advance(s.engine).recompute();

    expect(observe(s.engine).hasKeyword(s.perm("angemon"), "Blocker")).toBe(true);
  });

  it("does not grant inherited Blocker without a purple Digimon or to a non-family Digimon", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "BT11-038", as: "host", under: ["BT11-042"] },
          { card: "BT11-037", as: "nonFamily" },
        ],
      },
    });
    s.state.turnSeat = 1;
    await advance(s.engine).recompute();

    expect(observe(s.engine).hasKeyword(s.perm("host"), "Blocker")).toBe(false);
    expect(observe(s.engine).hasKeyword(s.perm("nonFamily"), "Blocker")).toBe(false);
  });
});
