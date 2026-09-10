import { getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { hasRegisteredCompiledCard } from "../../engine/effects/interpreter.js";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle, type EngineSetup } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { compiled } from "./EX7-060.js";
import "../index.js";

type ActivatableEntry = { instanceId: string; effectKey: string };

function trashMain(s: EngineSetup, alias: string): ActivatableEntry | undefined {
  const source = s.inst(alias);
  const entries = JSON.parse(source.activatableEffectsJson || "[]") as ActivatableEntry[];
  return entries.find(({ instanceId }) => instanceId === source.instanceId);
}

async function stopTurn(s: EngineSetup, turn: Promise<void>): Promise<void> {
  expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
  await turn;
}

describe("EX7-060", () => {
  it("matches the catalog and fully registered IR", () => {
    expect(getCardDefinition("EX7-060")).toMatchObject({
      cardId: "EX7-060",
      nameEn: "Nidhoggmon",
      colors: ["Purple"],
      kinds: ["Digimon"],
      level: 6,
      playCost: 11,
      dp: 11000,
      evoCosts: [{ color: "Purple", level: 5, memoryCost: 3 }],
      forms: ["Mega"],
      attributes: ["Virus"],
      types: ["Dark Dragon"],
    });
    expect(compiled.effects?.find((entry) => entry.trigger === "Main")).toMatchObject({
      isFromTrash: true,
      actions: [
        {
          kind: "PlayWithoutCost",
          from: ["trash"],
          payCost: true,
          reduceCostBy: 4,
          optional: true,
          condition: { kind: "zoneCount", zone: "hand", op: "lte", value: 4 },
        },
      ],
    });
    expect(compiled.effects?.find((entry) => entry.trigger === "Static")?.keywords).toContainEqual({
      keyword: "Blocker",
      raw: "＜Blocker＞",
    });
    expect(compiled.effects?.find((entry) => entry.trigger === "OnDeletion")?.actions).toMatchObject([
      {
        kind: "PlayWithoutCost",
        from: ["trash"],
        payCost: false,
        optional: true,
        target: {
          count: 1,
          filter: {
            kind: ["Digimon"],
            levelComparison: { op: "lte", value: 5 },
            nameOrTrait: [{ tokens: ["Dark Dragon", "Evil Dragon"], match: "trait" }],
          },
        },
      },
    ]);
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
    expect(hasRegisteredCompiledCard("EX7-060")).toBe(true);
  });

  it("publicly activates from trash at the four-card boundary and pays 7 memory", async () => {
    const s = setupEngine(
      {
        0: {
          trash: [{ card: "EX7-060", as: "nidhogg" }],
          hand: ["BT1-009", "BT1-010", "BT1-014", "BT1-038"],
          deck: ["BT1-009"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();
    const turn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(0);
    const effect = trashMain(s, "nidhogg");
    expect(effect).toBeDefined();
    expect(
      s.engine.applyIntent(0, {
        type: "activateEffect",
        sourceInstanceId: effect!.instanceId,
        effectKey: effect!.effectKey,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some(({ topCard }) => topCard.cardId === "EX7-060"));
    expect(s.state.memory).toBe(3);
    expect(s.state.players[0]!.trash.some(({ instanceId }) => instanceId === effect!.instanceId)).toBe(false);
    await stopTurn(s, turn);
  });

  it("does not expose its trash Main effect with five cards in hand", async () => {
    const s = setupEngine({
      0: {
        trash: [{ card: "EX7-060", as: "nidhogg" }],
        hand: ["BT1-009", "BT1-010", "BT1-014", "BT1-038", "BT1-040"],
        deck: ["BT1-009"],
      },
    });
    s.state.memory = 10;
    await s.ready();
    const turn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(0);
    expect(trashMain(s, "nidhogg")).toBeUndefined();
    expect(s.state.players[0]!.trash.some(({ cardId }) => cardId === "EX7-060")).toBe(true);
    expect(s.state.memory).toBe(10);
    await stopTurn(s, turn);
  });

  it("may decline playing itself from trash", async () => {
    const s = setupEngine(
      {
        0: {
          trash: [{ card: "EX7-060", as: "nidhogg" }],
          hand: ["BT1-009", "BT1-010", "BT1-014", "BT1-038"],
          deck: ["BT1-009"],
        },
      },
      { autoDeclineOptional: true },
    );
    s.state.memory = 10;
    await s.ready();
    const turn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(0);
    const effect = trashMain(s, "nidhogg");
    expect(effect).toBeDefined();
    expect(
      s.engine.applyIntent(0, {
        type: "activateEffect",
        sourceInstanceId: effect!.instanceId,
        effectKey: effect!.effectKey,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision === undefined);
    expect(s.state.players[0]!.battleArea).toHaveLength(0);
    expect(s.state.players[0]!.trash.some(({ cardId }) => cardId === "EX7-060")).toBe(true);
    expect(s.state.memory).toBe(10);
    await stopTurn(s, turn);
  });

  it("evolves from purple level 5 with exact payment, draw, and stack", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "EX7-056", as: "base" }],
        hand: [{ card: "EX7-060", as: "nidhogg" }],
        deck: [{ card: "BT1-009", as: "drawn" }],
      },
    });
    s.state.memory = 4;
    await s.ready();
    const sourceId = s.perm("base").topCard.instanceId;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("nidhogg").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard.cardId === "EX7-060");
    expect(s.state.memory).toBe(1);
    expect(s.perm("base").stack.map(({ instanceId }) => instanceId)).toEqual([sourceId]);
    expect(s.state.players[0]!.hand.map(({ instanceId }) => instanceId)).toEqual([s.inst("drawn").instanceId]);
  });

  it("uses Blocker in a player-directed battle", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "EX7-060", as: "blocker", under: ["EX7-056"] }] },
      1: { battleArea: [{ card: "BT1-009", as: "attacker" }] },
    });
    s.state.turnSeat = 1;
    await s.ready();
    expect(observe(s.engine).hasKeyword(s.perm("blocker"), "Blocker")).toBe(true);
    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.events.some(({ kind }) => kind === "blockWindowOpened"));
    expect(
      s.engine.applyIntent(0, {
        type: "declareBlock",
        blockerPermanentId: s.perm("blocker").permanentId,
      }),
    ).toEqual({ ok: true });
    await settle(() => !observe(s.engine).isAttacking());
    expect(s.state.players[0]!.battleArea.map(({ topCard }) => topCard.cardId)).toEqual(["EX7-060"]);
    expect(s.state.players[1]!.battleArea).toHaveLength(0);
  });

  it.each([
    ["Dark Dragon", "EX7-056"],
    ["Evil Dragon", "BT11-079"],
  ])("plays a level 5 or lower %s from trash for free after real battle deletion", async (_trait, candidate) => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "EX7-060", as: "nidhogg" }], trash: [{ card: candidate, as: "candidate" }] },
        1: { battleArea: [{ card: "BT10-022", as: "defender", suspended: true, dp: 12000 }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("nidhogg").permanentId,
        target: { kind: "permanent", permanentId: s.perm("defender").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some(({ topCard }) => topCard.cardId === candidate));
    expect(s.state.players[0]!.battleArea.map(({ topCard }) => topCard.cardId)).toEqual([candidate]);
    expect(s.state.players[0]!.trash.some(({ cardId }) => cardId === "EX7-060")).toBe(true);
    expect(s.state.memory).toBe(0);
  });

  it("refuses matching level 6 and non-matching level 5 cards after deletion", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "EX7-060", as: "nidhogg" }], trash: ["EX7-062", "BT10-022"] },
        1: { battleArea: [{ card: "BT10-022", as: "defender", suspended: true, dp: 12000 }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("nidhogg").permanentId,
        target: { kind: "permanent", permanentId: s.perm("defender").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => !observe(s.engine).isAttacking());
    expect(s.state.players[0]!.battleArea).toHaveLength(0);
    expect(s.state.players[0]!.trash.map(({ cardId }) => cardId)).toEqual(
      expect.arrayContaining(["EX7-060", "EX7-062", "BT10-022"]),
    );
  });
});
