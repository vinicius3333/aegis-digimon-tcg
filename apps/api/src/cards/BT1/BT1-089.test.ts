import { EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { advance } from "../../engine/testkit/advance.js";
import "./BT1-089.js";

describe("BT1-089 Mimi Tachikawa", () => {
  it("sets memory to 3 at the start of its owner's turn when memory is 2 or less", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT1-089", as: "mimi" }] } });
    s.state.memory = 0;
    await advance(s.engine).fire(EffectTiming.OnStartTurn, s.perm("mimi"));
    expect(s.state.memory).toBe(3);
  });

  it("sets memory while suspended (Q958), but not above 2 memory or on the opponent's turn", async () => {
    const suspended = setupEngine({
      0: { battleArea: [{ card: "BT1-089", as: "mimi", suspended: true }] },
    });
    suspended.state.memory = 2;
    await advance(suspended.engine).fire(EffectTiming.OnStartTurn, suspended.perm("mimi"));
    expect(suspended.state.memory).toBe(3);

    const aboveTwo = setupEngine({ 0: { battleArea: [{ card: "BT1-089", as: "mimi" }] } });
    aboveTwo.state.memory = 4;
    await advance(aboveTwo.engine).fire(EffectTiming.OnStartTurn, aboveTwo.perm("mimi"));
    expect(aboveTwo.state.memory).toBe(4);

    const opponentTurn = setupEngine({ 0: { battleArea: [{ card: "BT1-089", as: "mimi" }] } });
    opponentTurn.state.turnSeat = 1;
    opponentTurn.state.memory = -1;
    await advance(opponentTurn.engine).fire(EffectTiming.OnStartTurn, opponentTurn.perm("mimi"));
    expect(opponentTurn.state.memory).toBe(-1);
  });

  it("suspends to hatch when a level 5 green Digimon is in play", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT1-089", as: "mimi" }, { card: "BT1-078", under: ["BT1-073"] }],
          eggDeck: ["BT1-008"],
        },
      },
      { autoAcceptOptional: true, autoChooseOption: true },
    );
    await advance(s.engine).fire(EffectTiming.OnDeclaration, s.perm("mimi"));
    expect(s.state.players[0]!.breeding?.topCard.cardId).toBe("BT1-008");
    expect(s.perm("mimi").isSuspended).toBe(true);
  });

  it("can decline the optional breeding-area action", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT1-089", as: "mimi" }, { card: "BT1-078", under: ["BT1-073"] }],
          eggDeck: ["BT1-008"],
        },
      },
      { autoAcceptOptional: false },
    );

    const action = advance(s.engine).fire(EffectTiming.OnDeclaration, s.perm("mimi"));
    await settle(() => s.state.pendingDecision?.kind === "confirm");
    const pending = s.state.pendingDecision!;
    expect(s.decisions.at(-1)!.req).toMatchObject({ kind: "optional", sourceCardId: "BT1-089" });
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: pending.decisionId,
        response: { kind: "optional", accept: false },
      }),
    ).toEqual({ ok: true });
    await action;

    expect(s.perm("mimi").isSuspended).toBe(false);
    expect(s.state.players[0]!.breeding).toBeUndefined();
  });

  it.each<[string, { breeding?: string; battleArea?: string[] }]>([
    ["no available breeding action", {}],
    ["only a level 2 in breeding", { breeding: "BT1-008" }],
    ["a qualifying Digimon only in breeding (Q957)", { breeding: "BT1-078", battleArea: [] }],
  ])("does not suspend with %s", async (_label, extra) => {
    const qualifyingBattleArea = "battleArea" in extra ? extra.battleArea : ["BT1-078"];
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT1-089", as: "mimi" }, ...(qualifyingBattleArea ?? [])],
          breeding: extra.breeding,
        },
      },
      { autoAcceptOptional: true, autoChooseOption: true },
    );

    await advance(s.engine).fire(EffectTiming.OnDeclaration, s.perm("mimi"));

    expect(s.perm("mimi").isSuspended).toBe(false);
  });

  it("suspends to move a level 3 Digimon from breeding to the battle area", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT1-089", as: "mimi" }, { card: "BT1-078" }],
          breeding: { card: "BT1-064", as: "raised" },
        },
      },
      { autoAcceptOptional: true, autoChooseOption: true, preferOptionIndex: 1 },
    );
    const raisedId = s.perm("raised").topCard!.instanceId;
    await advance(s.engine).fire(EffectTiming.OnDeclaration, s.perm("mimi"));
    expect(s.state.players[0]!.breeding).toBeUndefined();
    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.instanceId === raisedId)).toBe(true);
    expect(s.perm("mimi").isSuspended).toBe(true);
    expect(s.perm("raised").enterFieldTurnCount).not.toBe(s.state.turnCount);
    expect(s.events.some((event) => event.kind === "cardPlayed" && event.cardId === "BT1-064")).toBe(false);
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("raised").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
  });

  it("plays itself from security without paying its cost", async () => {
    const s = setupEngine({ 0: { security: [{ card: "BT1-089", as: "securityMimi", faceUp: true }] } });

    await advance(s.engine).fireForInstance(EffectTiming.SecuritySkill, s.inst("securityMimi"));

    expect(
      s.state.players[0]!.battleArea.some(
        (permanent) => permanent.topCard?.instanceId === s.inst("securityMimi").instanceId,
      ),
    ).toBe(true);
  });
});
