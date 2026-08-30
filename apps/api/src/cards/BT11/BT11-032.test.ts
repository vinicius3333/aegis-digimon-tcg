import { compiledEffects, getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./BT11-032.js";
import "./BT11-090.js";
import "./BT11-112.js";

describe("BT11-032 UlforceVeedramon", () => {
  it("matches the catalog and carries every complete printed contract", () => {
    expect(getCardDefinition("BT11-032")).toMatchObject({
      cardId: "BT11-032",
      nameEn: "UlforceVeedramon",
      colors: ["Blue"],
      kinds: ["Digimon"],
      level: 6,
      playCost: 12,
      dp: 12000,
      evoCosts: [{ color: "Blue", level: 5, memoryCost: 4 }],
      forms: ["Mega"],
      attributes: ["Vaccine"],
      types: ["Holy Warrior", "Royal Knight"],
    });
    expect(compiled).toMatchObject({
      effects: [
        { trigger: "WhenDigivolving", actions: [{ kind: "PlayWithoutCost", optional: true }] },
        { trigger: "YourTurn", actions: [{ kind: "SubTrigger", event: "whenPlayed" }] },
        {
          trigger: "YourTurn",
          frequency: "OncePerTurn",
          actions: [{ kind: "SubTrigger", event: "whenUnsuspended", actions: [{ kind: "Return" }] }],
        },
      ],
      coverage: "full",
      residual: [],
    });
    expect(compiledEffects["BT11-032"]).toEqual(compiled);
  });

  it("plays a blue Tamer from hand without paying its cost when digivolving", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT11-029", as: "base" }],
          hand: [
            { card: "BT11-032", as: "ulforce" },
            { card: "BT11-090", as: "tamer" },
          ],
          deck: ["BT1-001"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("ulforce").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() =>
      s.state.players[0]!.battleArea.some(({ topCard }) => topCard?.instanceId === s.inst("tamer").instanceId),
    );

    expect(s.state.memory).toBe(6);
  });

  it("allows declining the free Tamer play while completing the evolution", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT11-029", as: "base" }],
          hand: [
            { card: "BT11-032", as: "ulforce" },
            { card: "BT11-090", as: "tamer" },
          ],
          deck: ["BT1-001"],
        },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("ulforce").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard.cardId === "BT11-032");

    expect(s.state.players[0]!.hand.map(({ instanceId }) => instanceId)).toContain(s.inst("tamer").instanceId);
    expect(s.state.memory).toBe(6);
  });

  it("unsuspends when its controller plays a blue Tamer", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT11-032", as: "ulforce", suspended: true }],
        hand: [{ card: "BT11-090", as: "tamer" }],
      },
    });
    s.state.memory = 10;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("tamer").instanceId })).toEqual({ ok: true });
    await settle(() => !s.perm("ulforce").isSuspended);

    expect(s.perm("ulforce").isSuspended).toBe(false);
  });

  it("does not unsuspend for a non-blue Tamer or a blue Tamer played during the opponent's turn", async () => {
    const wrongColor = setupEngine({
      0: {
        battleArea: [{ card: "BT11-032", as: "ulforce", suspended: true }],
        hand: [{ card: "BT11-089", as: "redTamer" }],
      },
    });
    wrongColor.state.memory = 10;
    expect(
      wrongColor.engine.applyIntent(0, { type: "playCard", instanceId: wrongColor.inst("redTamer").instanceId }),
    ).toEqual({ ok: true });
    await settle(() => wrongColor.state.players[0]!.battleArea.length === 2);
    expect(wrongColor.perm("ulforce").isSuspended).toBe(true);

    const opponentTurn = setupEngine({
      0: { battleArea: [{ card: "BT11-032", as: "ulforce", suspended: true }] },
      1: { hand: [{ card: "BT11-090", as: "blueTamer" }] },
    });
    opponentTurn.state.turnSeat = 1;
    opponentTurn.state.memory = 10;
    expect(
      opponentTurn.engine.applyIntent(1, {
        type: "playCard",
        instanceId: opponentTurn.inst("blueTamer").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => opponentTurn.state.players[1]!.battleArea.length === 1);
    expect(opponentTurn.perm("ulforce").isSuspended).toBe(true);
  });

  it("returns up to level 3 plus one level for each blue Tamer when it unsuspends", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT11-032", as: "ulforce", suspended: true }, "BT11-090", "BT11-112"],
          hand: [{ card: "BT11-090", as: "playedTamer" }],
        },
        1: { battleArea: [{ card: "BT11-028", as: "level5" }] },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    const targetId = s.perm("level5").topCard!.instanceId;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("playedTamer").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[1]!.battleArea.length === 0);

    expect(s.state.players[1]!.battleArea).toHaveLength(0);
    expect(s.state.players[1]!.hand.map(({ instanceId }) => instanceId)).toContain(targetId);
  });

  it("uses exact 3-plus-blue-Tamers level boundaries and only once per turn", async () => {
    for (const [tamerCount, targetCard, shouldReturn] of [
      [0, "BT11-025", false],
      [1, "BT11-025", true],
      [1, "BT11-028", false],
      [2, "BT11-028", true],
    ] as const) {
      const s = setupEngine(
        {
          0: {
            battleArea: [
              { card: "BT11-032", as: "ulforce", suspended: true },
              ...Array.from({ length: tamerCount }, () => "BT11-090"),
            ],
          },
          1: { battleArea: [{ card: targetCard, as: "target" }] },
        },
        { autoDeclineOptional: true, autoSelectCards: true },
      );
      await advance(s.engine).verb.unsuspend([s.perm("ulforce").permanentId]);
      await settle(() => s.perm("ulforce").isSuspended === false);
      expect(s.state.players[1]!.battleArea.some((p) => p.topCard?.instanceId === s.inst("target").instanceId)).toBe(
        !shouldReturn,
      );
    }

    const frequency = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT11-032", as: "ulforce", suspended: true }],
          deck: ["BT1-001", "BT1-002", "BT1-003"],
        },
        1: {
          battleArea: [
            { card: "BT11-023", as: "first" },
            { card: "BT11-023", as: "second" },
            { card: "BT11-023", as: "third" },
          ],
          deck: ["BT1-001", "BT1-002", "BT1-003"],
        },
      },
      { autoSelectCards: true },
    );
    frequency.state.memory = 3;
    const firstTurn = frequency.engine.runOneTurn();
    await advance(frequency.engine).waitForMainPhase(0);
    await advance(frequency.engine).verb.unsuspend([frequency.perm("ulforce").permanentId]);
    expect(frequency.state.players[1]!.battleArea).toHaveLength(2);
    await advance(frequency.engine).verb.suspend([frequency.perm("ulforce").permanentId]);
    await advance(frequency.engine).verb.unsuspend([frequency.perm("ulforce").permanentId]);
    expect(frequency.state.players[1]!.battleArea).toHaveLength(2);
    advance(frequency.engine).endMainPhaseIfOpen(0);
    await firstTurn;

    frequency.state.turnSeat = 1;
    frequency.state.memory = 3;
    await advance(frequency.engine).runTurn(1);

    frequency.state.turnSeat = 0;
    frequency.state.memory = 3;
    const laterTurn = frequency.engine.runOneTurn();
    await advance(frequency.engine).waitForMainPhase(0);
    await advance(frequency.engine).verb.suspend([frequency.perm("ulforce").permanentId]);
    await advance(frequency.engine).verb.unsuspend([frequency.perm("ulforce").permanentId]);
    expect(frequency.state.players[1]!.battleArea).toHaveLength(1);
    advance(frequency.engine).endMainPhaseIfOpen(0);
    await laterTurn;
  });
});
