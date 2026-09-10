import { describe, expect, it } from "vitest";
import { digivolutionRequirementsFor, getCardDefinition } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { setupEngine } from "../../engine/testkit/harness.js";
import "./index.js";
import { compiled } from "./EX8-022.js";

describe("EX8-022", () => {
  it("matches the catalog identity and every printed text field", () => {
    expect(getCardDefinition("EX8-022")).toMatchObject({
      cardId: "EX8-022",
      nameEn: "Frigimon",
      colors: ["Blue", "Yellow"],
      kinds: ["Digimon"],
      level: 4,
      playCost: 5,
      dp: 5000,
      evoCosts: [
        { color: "Blue", level: 3, memoryCost: 3 },
        { color: "Yellow", level: 3, memoryCost: 3 },
      ],
      forms: ["Champion"],
      attributes: ["Vaccine"],
      types: ["Ice-Snow", "LIBERATOR"],
      effectText: expect.stringContaining("＜Ice Clad＞"),
      inheritedEffectText:
        "[When Attacking] Give 1 of your opponent's Digimon ＜Security Attack -1＞until the end of their turn.",
    });
  });
  it("traces Ice Clad, both trash/memory trigger branches, and inherited Security Attack reduction", () => {
    expect(compiled.effects?.find((entry) => entry.trigger === "Static")?.keywords).toEqual([
      { keyword: "IceClad", raw: "＜Ice Clad＞" },
    ]);
    for (const trigger of ["OnPlay", "WhenDigivolving"] as const) {
      expect(compiled.effects?.find((entry) => entry.trigger === trigger)?.actions).toMatchObject([
        {
          kind: "TrashDigivolution",
          target: { filter: { controller: "opponent", kind: ["Digimon"] }, count: 1 },
          amount: 2,
          fromTop: false,
        },
        {
          kind: "GainMemory",
          amount: 1,
          condition: {
            kind: "opponentHasNone",
            filter: { digivolutionCards: "hasAny", controllerDefault: "opponent", kind: ["Digimon"] },
          },
        },
      ]);
    }
    expect(compiled.effects?.find((entry) => entry.isInherited)?.actions[0]).toMatchObject({
      kind: "GainKeyword",
      target: { filter: { controller: "opponent", kind: ["Digimon"] }, count: 1 },
      keyword: { keyword: "SecurityAttack", amount: -1, raw: "＜Security Attack -1＞" },
      duration: "untilOpponentTurnEnd",
    });
  });
  it("exposes Ice Clad on live state", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "EX8-022", as: "frigimon" }] } });
    await s.ready();
    expect(observe(s.engine).hasKeyword(s.perm("frigimon"), "IceClad")).toBe(true);
  });
  it("reduces an opposing Digimon's Security Attack during a real host attack", async () => {
    const preferInstanceIds: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT1-038", as: "host", under: [{ card: "EX8-022", as: "frigimon" }] }],
          security: ["BT1-045"],
        },
        1: {
          battleArea: [
            { card: "BT1-009", as: "opponent" },
            { card: "BT1-010", as: "otherOpponent" },
          ],
          security: ["BT1-045", "BT1-046"],
          deck: ["BT1-046", "BT1-045"],
        },
      },
      { autoSelectCards: true, preferInstanceIds },
    );
    preferInstanceIds.push(s.perm("opponent").permanentId);
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => observe(s.engine).keywordAmount(s.perm("opponent"), "SecurityAttack") === -1);
    expect(observe(s.engine).keywordAmount(s.perm("opponent"), "SecurityAttack")).toBe(-1);
    await settle(() => !observe(s.engine).isAttacking());

    s.state.turnSeat = 1;
    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("opponent").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => !observe(s.engine).isAttacking());
    expect(s.state.players[0]!.security).toHaveLength(1);

    s.state.memory = 0;
    await advance(s.engine).runTurn(1);
    expect(observe(s.engine).keywordAmount(s.perm("opponent"), "SecurityAttack")).toBe(0);
  });

  it("uses Ice Clad source count to win a lower-DP battle", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "EX8-022", as: "frigimon", dp: 1000, under: ["BT1-003", "BT1-028"] }],
      },
      1: { battleArea: [{ card: "BT1-009", as: "opponent", dp: 15000, suspended: true }] },
    });
    await s.ready();

    const opponentId = s.perm("opponent").permanentId;
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("frigimon").permanentId,
        target: { kind: "permanent", permanentId: opponentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => !s.state.players[1]!.battleArea.some(({ permanentId }) => permanentId === opponentId));

    expect(s.state.players[0]!.battleArea).toHaveLength(1);
    expect(s.state.players[1]!.battleArea).toHaveLength(0);
  });

  it("trashes exactly the bottom two on play and gains no memory while a source remains", async () => {
    const s = setupEngine(
      {
        0: { hand: [{ card: "EX8-022", as: "frigimon" }] },
        1: {
          battleArea: [
            {
              card: "BT1-024",
              as: "target",
              under: [
                { card: "BT1-001", as: "bottom" },
                { card: "BT1-009", as: "middle" },
                { card: "BT1-016", as: "top" },
              ],
            },
          ],
        },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 10;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("frigimon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.perm("target").stack.length === 1);

    expect(s.perm("target").stack[0]!.instanceId).toBe(s.inst("top").instanceId);
    expect(s.state.players[1]!.trash.map((card) => card.instanceId)).toEqual(
      expect.arrayContaining([s.inst("bottom").instanceId, s.inst("middle").instanceId]),
    );
    expect(s.state.memory).toBe(5);
  });

  it("uses the Ice-Snow route, trashes all two sources, and then gains 1 memory", async () => {
    expect(digivolutionRequirementsFor("EX8-022")).toContainEqual({
      level: 3,
      traits: ["Ice-Snow"],
      cost: 2,
      isAlternate: true,
    });
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX8-019", as: "penguinmon" }],
          hand: [{ card: "EX8-022", as: "frigimon" }],
        },
        1: { battleArea: [{ card: "BT1-024", as: "target", under: ["BT1-001", "BT1-009"] }] },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 2;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("penguinmon").permanentId,
        instanceId: s.inst("frigimon").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("target").stack.length === 0 && s.state.memory === 1);

    expect(s.state.players[1]!.trash).toHaveLength(2);
    expect(s.state.memory).toBe(1);
  });

  it("uses the standard Blue level-3 route for 3 memory", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT1-030", as: "blueBase" }],
        hand: [{ card: "EX8-022", as: "frigimon" }],
      },
      1: { battleArea: [{ card: "BT1-009", as: "opponent" }] },
    });
    await s.ready();
    s.state.memory = 3;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("blueBase").permanentId,
        instanceId: s.inst("frigimon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("blueBase").topCard.instanceId === s.inst("frigimon").instanceId);
    expect(s.state.memory).toBe(1);
  });

  it("rejects the alternate route from a non-Ice-Snow level 3", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT1-009", as: "base" }], hand: [{ card: "EX8-022", as: "frigimon" }] },
    });
    await s.ready();
    s.state.memory = 2;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("frigimon").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: false, reason: "invalid-evolution" });
    expect(s.state.memory).toBe(2);
    expect(s.perm("base").topCard.cardId).toBe("BT1-009");
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("frigimon").instanceId)).toBe(true);
  });
});
