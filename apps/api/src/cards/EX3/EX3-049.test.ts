import { getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "./EX3-046.js";
import "./EX3-049.js";

describe("EX3-049 Sealsdramon", () => {
  it("has the official metadata and digivolves from a black level 3 for 2", async () => {
    expect(getCardDefinition("EX3-049")).toMatchObject({
      cardId: "EX3-049",
      nameEn: "Sealsdramon",
      colors: ["Black"],
      level: 4,
      playCost: 5,
      dp: 4000,
      evoCosts: [{ color: "Black", level: 3, memoryCost: 2 }],
      forms: ["Champion"],
      attributes: ["Virus"],
      types: ["Cyborg", "D-Brigade"],
      rarity: "U",
    });
    const s = setupEngine({
      0: {
        battleArea: [{ card: "EX3-046", as: "base" }],
        hand: [{ card: "EX3-049", as: "sealsdramon" }],
        deck: ["BT1-001"],
      },
    });
    s.state.memory = 2;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("sealsdramon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard.cardId === "EX3-049");

    expect(s.state.memory).toBe(0);
    expect(s.perm("base").topCard.cardId).toBe("EX3-049");
  });

  it("has Jamming and survives losing a Security Digimon battle", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "EX3-049", as: "sealsdramon" }] },
      1: { security: ["EX3-044"] },
    });
    await s.ready();
    const attackerId = s.perm("sealsdramon").permanentId;

    expect(observe(s.engine).hasKeyword(s.perm("sealsdramon"), "Jamming")).toBe(true);
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: attackerId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.security.length === 0);

    expect(s.state.players[0]!.battleArea.some(({ permanentId }) => permanentId === attackerId)).toBe(true);
    expect(s.state.players[0]!.trash.some(({ cardId }) => cardId === "EX3-049")).toBe(false);
  });

  it("D-Brigade family: grants Rush to the newly played Commandramon and permits its immediate attack", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "EX3-050", under: ["EX3-049"], as: "inheritedHost" }],
        hand: [{ card: "EX3-046", as: "commandramon" }],
      },
      1: { security: ["BT1-001"] },
    });
    s.state.turnCount = 1;
    await s.ready();

    await advance(s.engine).verb.playInstances([s.inst("commandramon").instanceId]);
    const commandramon = s.state.players[0]!.battleArea.find(
      ({ topCard }) => topCard.instanceId === s.inst("commandramon").instanceId,
    )!;
    await settle(() => observe(s.engine).hasKeyword(commandramon, "Rush"));

    expect(observe(s.engine).hasKeyword(commandramon, "Rush")).toBe(true);
    expect(observe(s.engine).hasKeyword(s.perm("inheritedHost"), "Rush")).toBe(false);
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: commandramon.permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => commandramon.isSuspended && s.state.players[1]!.security.length === 0);
  });

  it("is once per turn and does not grant Rush to a second D-Brigade play", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "EX3-050", under: ["EX3-049"], as: "host" }],
        hand: [
          { card: "EX3-046", as: "first" },
          { card: "BT4-063", as: "second" },
        ],
      },
    });
    s.state.turnCount = 1;
    await s.ready();

    await advance(s.engine).verb.playInstances([s.inst("first").instanceId]);
    const first = s.state.players[0]!.battleArea.find(
      ({ topCard }) => topCard.instanceId === s.inst("first").instanceId,
    )!;
    await settle(() => observe(s.engine).hasKeyword(first, "Rush"));
    await advance(s.engine).verb.playInstances([s.inst("second").instanceId]);
    const second = s.state.players[0]!.battleArea.find(
      ({ topCard }) => topCard.instanceId === s.inst("second").instanceId,
    )!;
    await settle();

    expect(observe(s.engine).hasKeyword(first, "Rush")).toBe(true);
    expect(observe(s.engine).hasKeyword(second, "Rush")).toBe(false);
  });

  it("two inherited copies both remain once-per-turn and cannot leak Rush onto a second play", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "EX3-050", under: ["EX3-049"], as: "firstHost" },
          { card: "EX3-050", under: ["EX3-049"], as: "secondHost" },
        ],
        hand: [
          { card: "EX3-046", as: "first" },
          { card: "BT4-063", as: "second" },
        ],
      },
    });
    s.state.turnCount = 1;
    await s.ready();

    await advance(s.engine).verb.playInstances([s.inst("first").instanceId]);
    const first = s.state.players[0]!.battleArea.find(
      ({ topCard }) => topCard.instanceId === s.inst("first").instanceId,
    )!;
    await settle(() => observe(s.engine).hasKeyword(first, "Rush"));
    await advance(s.engine).verb.playInstances([s.inst("second").instanceId]);
    const second = s.state.players[0]!.battleArea.find(
      ({ topCard }) => topCard.instanceId === s.inst("second").instanceId,
    )!;
    await settle();

    expect(observe(s.engine).hasKeyword(first, "Rush")).toBe(true);
    expect(observe(s.engine).hasKeyword(second, "Rush")).toBe(false);
    expect(observe(s.engine).hasKeyword(s.perm("firstHost"), "Rush")).toBe(false);
    expect(observe(s.engine).hasKeyword(s.perm("secondHost"), "Rush")).toBe(false);
  });

  it("ignores a played Digimon without the D-Brigade trait", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "EX3-050", under: ["EX3-049"], as: "host" }],
        hand: [{ card: "BT1-028", as: "unrelated" }],
      },
    });
    s.state.turnCount = 1;
    await s.ready();

    await advance(s.engine).verb.playInstances([s.inst("unrelated").instanceId]);
    const unrelated = s.state.players[0]!.battleArea.find(
      ({ topCard }) => topCard.instanceId === s.inst("unrelated").instanceId,
    )!;
    await settle();

    expect(observe(s.engine).hasKeyword(unrelated, "Rush")).toBe(false);
  });

  it("does not grant inherited Rush during the opponent's turn", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "EX3-050", under: ["EX3-049"], as: "host" }],
        hand: [{ card: "EX3-046", as: "commandramon" }],
      },
    });
    s.state.turnSeat = 1;
    s.state.turnCount = 1;
    await s.ready();

    await advance(s.engine).verb.playInstances([s.inst("commandramon").instanceId]);
    const commandramon = s.state.players[0]!.battleArea.find(
      ({ topCard }) => topCard.instanceId === s.inst("commandramon").instanceId,
    )!;
    await settle();

    expect(observe(s.engine).hasKeyword(commandramon, "Rush")).toBe(false);
  });

  it("removes the granted Rush at the end of the turn", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "EX3-050", under: ["EX3-049"], as: "host" }],
        hand: [{ card: "EX3-046", as: "commandramon" }],
        deck: ["BT1-001"],
      },
      1: { deck: ["BT1-002"] },
    });
    s.state.turnCount = 1;
    await s.ready();

    await advance(s.engine).verb.playInstances([s.inst("commandramon").instanceId]);
    const commandramon = s.state.players[0]!.battleArea.find(
      ({ topCard }) => topCard.instanceId === s.inst("commandramon").instanceId,
    )!;
    await settle(() => observe(s.engine).hasKeyword(commandramon, "Rush"));
    await advance(s.engine).runTurn(0);

    expect(observe(s.engine).hasKeyword(commandramon, "Rush")).toBe(false);
  });
});
