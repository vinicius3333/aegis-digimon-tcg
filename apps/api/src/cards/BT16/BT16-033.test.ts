import { describe, expect, it } from "vitest";
import { digivolutionRequirementsFor } from "@aegis/shared";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./BT16-033.js";
import "../index.js";
import "../BT11/BT11-107.js";

const HARPYMON = "BT16-033";
const NEUTRAL = "BT1-009";

describe("BT16-033 Harpymon", () => {
  it("carries Armor Purge and the exact Hawkmon evolution route", () => {
    expect(compiled.effects[0]).toMatchObject({
      trigger: "Static",
      keywords: [{ keyword: "Armor Purge" }],
    });
    expect(compiled.digivolutionRequirement).toEqual([{ namesExact: ["Hawkmon"], cost: 2, isAlternate: true }]);
    expect(digivolutionRequirementsFor("BT16-033")).toEqual([{ namesExact: ["Hawkmon"], cost: 2, isAlternate: true }]);
    expect(compiled.effects[1]).toMatchObject({
      trigger: "OnSecurityCheck",
      turnCondition: "yourTurn",
      condition: { kind: "triggerAttackerIsSelf" },
      actions: [
        { kind: "GainMemory", amount: 1, condition: { kind: "securityAtLeast", value: 3 } },
        { kind: "Recover", amount: 1, condition: { kind: "securityAtMost", value: 2 } },
      ],
    });
  });

  it("gains 1 memory when this Digimon checks with 3 security cards", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: HARPYMON, as: "harpymon" }],
        security: [NEUTRAL, NEUTRAL, NEUTRAL],
      },
      1: { security: [NEUTRAL] },
    });

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("harpymon").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.events.some((event) => event.kind === "securityChecked"));

    expect(s.state.memory).toBe(1);
    expect(s.state.players[0]?.security).toHaveLength(3);
  });

  it("recovers 1 instead when this Digimon checks with 2 security cards", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: HARPYMON, as: "harpymon" }],
        deck: [NEUTRAL],
        security: [NEUTRAL, NEUTRAL],
      },
      1: { security: [NEUTRAL] },
    });

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("harpymon").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.events.some((event) => event.kind === "securityChecked"));

    expect(s.state.memory).toBe(0);
    expect(s.state.players[0]?.security).toHaveLength(3);
    expect(s.state.players[0]?.deck).toHaveLength(0);
  });

  it("activates before the revealed Security effect removes the attacker", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: HARPYMON, as: "harpymon" }],
        security: [NEUTRAL, NEUTRAL, NEUTRAL],
      },
      1: { security: [{ card: "BT11-107", as: "securityDelete" }] },
    });

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("harpymon").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.length === 0);

    expect(s.state.players[0]!.battleArea).toHaveLength(0);
    expect(s.state.memory).toBe(1);
    expect(s.state.players[1]!.security).toHaveLength(0);
  });

  it("uses Armor Purge to preserve its underlying card after losing a battle", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: HARPYMON, as: "harpymon", under: [NEUTRAL], suspended: true }] },
        1: { battleArea: [{ card: "BT1-020", as: "attacker" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.turnSeat = 1;
    await s.ready();

    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "permanent", permanentId: s.perm("harpymon").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("harpymon").topCard?.cardId === NEUTRAL);

    expect(s.perm("harpymon").topCard?.cardId).toBe(NEUTRAL);
    expect(s.state.players[0]!.trash.some((card) => card.cardId === HARPYMON)).toBe(true);
  });

  it("evolves naturally from Hawkmon for 2 memory", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT16-007", as: "hawkmon" }],
        hand: [{ card: HARPYMON, as: "harpymon" }],
      },
    });
    s.state.memory = 2;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("hawkmon").permanentId,
        instanceId: s.inst("harpymon").instanceId,
        alternateRequirementIndex: 0,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("hawkmon").topCard?.cardId === HARPYMON);

    expect(s.perm("hawkmon").stack.map((card) => card.cardId)).toEqual(["BT16-007"]);
    expect(s.state.memory).toBe(0);
  });
});
