import { assemblyRequirementFor, digivolutionRequirementsFor } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./BT26-014.js";
import "../index.js";

describe("BT26-014 Darumamon", () => {
  it("compiles delete triggers and both On Deletion branches", () => {
    expect(compiled.coverage).toBe("full");
    expect(compiled.effects.map((e) => [e.trigger, e.isInherited])).toEqual([
      ["OnPlay", undefined],
      ["WhenDigivolving", undefined],
      ["OnDeletion", undefined],
      ["OnDeletion", true],
    ]);
  });

  it("exposes the exact evolution and Assembly requirements", () => {
    expect(digivolutionRequirementsFor("BT26-014")).toContainEqual({
      level: 4,
      traits: ["Shambala"],
      cost: 3,
      isAlternate: true,
    });
    expect(assemblyRequirementFor("BT26-014")).toEqual([
      { reduceCost: 2, materials: [{ traits: ["TB"], levelMax: 4, count: 1 }] },
    ]);
  });

  it("assembles with exactly one Lv.4-or-lower TB card and rejects a Lv.5 TB near-match", async () => {
    const legal = setupEngine({
      0: {
        hand: [{ card: "BT26-014", as: "darumamon" }],
        trash: [
          { card: "BT26-013", as: "legalMaterial" },
          { card: "BT26-014", as: "levelFive" },
        ],
      },
    });
    legal.state.memory = 5;

    expect(
      legal.engine.applyIntent(0, {
        type: "playCard",
        instanceId: legal.inst("darumamon").instanceId,
        assembly: { materialInstanceIds: [legal.inst("legalMaterial").instanceId] },
      } as never),
    ).toEqual({ ok: true });
    await settle(() => legal.state.players[0]!.battleArea.some(({ topCard }) => topCard.cardId === "BT26-014"));
    const assembled = legal.state.players[0]!.battleArea.find(
      ({ topCard }) => topCard.instanceId === legal.inst("darumamon").instanceId,
    )!;
    expect(legal.state.memory).toBe(0);
    expect(assembled.stack.map(({ instanceId }) => instanceId)).toContain(legal.inst("legalMaterial").instanceId);
    expect(legal.state.players[0]!.trash.map(({ instanceId }) => instanceId)).toContain(
      legal.inst("levelFive").instanceId,
    );

    const illegal = setupEngine({
      0: {
        hand: [{ card: "BT26-014", as: "darumamon" }],
        trash: [{ card: "BT26-014", as: "levelFive" }],
      },
    });
    illegal.state.memory = 5;
    expect(
      illegal.engine.applyIntent(0, {
        type: "playCard",
        instanceId: illegal.inst("darumamon").instanceId,
        assembly: { materialInstanceIds: [illegal.inst("levelFive").instanceId] },
      } as never),
    ).toEqual(expect.objectContaining({ ok: false }));
    expect(illegal.state.memory).toBe(5);
  });

  it("deletes an opposing Digimon at 7000 DP or less on play", async () => {
    const s = setupEngine(
      {
        0: { hand: [{ card: "BT26-014", as: "self" }] },
        1: {
          battleArea: [
            { card: "BT26-012", as: "low", dp: 7000 },
            { card: "BT26-013", as: "high", dp: 8000 },
          ],
        },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 5;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("self").instanceId })).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.battleArea.length === 1);
    expect(s.state.players[1]!.battleArea[0]!.topCard.cardId).toBe("BT26-013");
  });

  it("deletes an opposing Digimon at the exact 7000 DP boundary when digivolving", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT26-013", as: "base" }],
          hand: [{ card: "BT26-014", as: "self" }],
          deck: ["BT1-009"],
        },
        1: {
          battleArea: [
            { card: "BT26-012", as: "low", dp: 7000 },
            { card: "BT26-013", as: "high", dp: 8000 },
          ],
        },
      },
      { autoSelectCards: true },
    );
    const highId = s.perm("high").topCard.instanceId;
    s.state.memory = 3;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("self").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.battleArea.length === 1);

    expect(s.perm("base").topCard.cardId).toBe("BT26-014");
    expect(s.state.players[1]!.battleArea[0]!.topCard.instanceId).toBe(highId);
  });

  it("Q6969 returns itself from trash, then continues to play an eligible TB Digimon", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT26-014", as: "self" }],
          hand: [{ card: "BT26-012", as: "played" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const selfId = s.perm("self").topCard.instanceId;

    expect(await advance(s.engine).verb.deletePermanent([s.perm("self").permanentId], "byEffect")).toBe(1);
    await settle(() =>
      s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.instanceId === s.inst("played").instanceId),
    );

    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toContain(selfId);
    expect(s.state.players[0]!.trash.some((card) => card.instanceId === selfId)).toBe(false);
  });

  it("inherits the optional On Deletion play from a real evolution stack", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT1-009", as: "host", under: [{ card: "BT26-014", as: "source" }] }],
          hand: [{ card: "BT26-013", as: "played" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const hostId = s.perm("host").topCard.instanceId;
    const sourceId = s.perm("host").stack.find((card) => card.cardId === "BT26-014")!.instanceId;

    expect(await advance(s.engine).verb.deletePermanent([s.perm("host").permanentId], "byEffect")).toBe(1);
    await settle(() =>
      s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.instanceId === s.inst("played").instanceId),
    );

    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toEqual(
      expect.arrayContaining([hostId, sourceId]),
    );
  });

  it("does not play a TB Digimon above 6000 DP or a low-DP Digimon without the TB trait", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT26-014", as: "self" }],
          hand: [
            { card: "BT26-014", as: "highTb" },
            { card: "BT1-009", as: "lowNonTb" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );

    expect(await advance(s.engine).verb.deletePermanent([s.perm("self").permanentId], "byEffect")).toBe(1);
    await settle(() => s.state.pendingDecision === undefined);

    expect(s.state.players[0]!.battleArea).toHaveLength(0);
    expect(s.state.players[0]!.hand.map(({ instanceId }) => instanceId)).toEqual(
      expect.arrayContaining([s.inst("self").instanceId, s.inst("highTb").instanceId, s.inst("lowNonTb").instanceId]),
    );
  });

  it("may decline both optional On Deletion branches", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT26-014", as: "self" }],
          hand: [{ card: "BT26-012", as: "playCandidate" }],
        },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    const selfId = s.inst("self").instanceId;

    expect(await advance(s.engine).verb.deletePermanent([s.perm("self").permanentId], "byEffect")).toBe(1);
    await settle(() => s.state.players[0]!.trash.some(({ instanceId }) => instanceId === selfId));

    expect(s.state.players[0]!.trash.map(({ instanceId }) => instanceId)).toContain(selfId);
    expect(s.state.players[0]!.hand.map(({ instanceId }) => instanceId)).toEqual([s.inst("playCandidate").instanceId]);
    expect(s.state.players[0]!.battleArea).toHaveLength(0);
  });
});
