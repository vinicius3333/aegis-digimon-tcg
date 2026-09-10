import { Phase } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT2-059.js";
import "./BT2-060.js";

describe("BT2-059 Kurisarimon", () => {
  it("Q1024 gains 1 memory when another Digimon with the evolved host's name is played", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT2-060", as: "host", under: ["BT2-054", "BT2-059"] }],
        hand: [{ card: "BT2-060", as: "sameName" }],
      },
    });
    s.state.memory = 10;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("sameName").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.memory === 5);

    expect(s.state.memory).toBe(5);
  });

  it("Q1024 does not compare the played name to Kurisarimon when the host has another name", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT2-060", as: "host", under: ["BT2-054", "BT2-059"] }],
        hand: [{ card: "BT2-059", as: "kurisarimon" }],
      },
    });
    s.state.memory = 10;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("kurisarimon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.battleArea.length === 2);

    expect(s.state.memory).toBe(5);
  });

  it("Q2814 triggers only once when 2 same-named Digimon are played simultaneously", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT2-082", as: "diaboromon", under: ["BT2-054", "BT2-059", "BT2-060"] }],
      },
    });
    s.state.memory = 0;

    await advance(s.engine).verb.playTwoTokensInOneWindow(0, "Diaboromon");

    expect(
      s.state.players[0]!.battleArea.filter((permanent) => permanent.topCard.cardId.includes("TOKEN")),
    ).toHaveLength(2);
    expect(s.state.memory).toBe(1);
  });

  it("does not trigger during the opponent's turn", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT2-060", as: "host", under: ["BT2-054", "BT2-059"] }],
        hand: [{ card: "BT2-060", as: "sameName" }],
      },
    });
    s.state.turnSeat = 1;
    s.state.memory = 0;

    await advance(s.engine).verb.playInstances([s.inst("sameName").instanceId]);

    expect(s.state.memory).toBe(0);
  });

  it("proves the legal black hatch stack, turn cycle, move, and evolved-host-name play trigger", async () => {
    const deck = ["BT1-010", "BT1-011", "BT1-012", "BT1-013", "BT1-014", "BT1-015"];
    const s = setupEngine({
      0: {
        eggDeck: [{ card: "BT2-005", as: "egg" }],
        hand: [
          { card: "BT2-053", as: "level3" },
          { card: "BT2-059", as: "kurisarimon" },
          { card: "BT2-060", as: "host" },
          { card: "BT2-060", as: "sameName" },
        ],
        deck,
      },
      1: { battleArea: [{ card: "BT2-060", as: "opponentPeer" }], deck },
    });
    const loop = s.engine.startTurnLoop();
    await settle(() => s.state.phase === Phase.Breeding && s.state.turnSeat === 0);
    expect(s.engine.applyIntent(0, { type: "hatchEgg" })).toEqual({ ok: true });
    await settle(() => s.state.phase === Phase.Main && s.state.turnSeat === 0);
    s.state.memory = 10;
    const breedingPermanentId = s.state.players[0]!.breeding!.permanentId;

    for (const alias of ["level3", "kurisarimon", "host"] as const) {
      expect(
        s.engine.applyIntent(0, {
          type: "digivolve",
          permanentId: breedingPermanentId,
          instanceId: s.inst(alias).instanceId,
        }),
      ).toEqual({ ok: true });
      await settle(
        () =>
          s.state.pendingDecision === undefined &&
          s.state.players[0]!.breeding!.topCard.instanceId === s.inst(alias).instanceId,
      );
    }
    expect(s.state.players[0]!.breeding!.stack.map(({ cardId }) => cardId)).toEqual(["BT2-005", "BT2-053", "BT2-059"]);
    expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
    await settle(() => s.state.phase === Phase.Main && s.state.turnSeat === 1);
    expect(s.engine.applyIntent(1, { type: "endPhase" })).toEqual({ ok: true });
    await settle(() => s.state.phase === Phase.Breeding && s.state.turnSeat === 0);
    expect(s.engine.applyIntent(0, { type: "moveFromBreeding", permanentId: breedingPermanentId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.phase === Phase.Main && s.state.turnSeat === 0);

    s.state.memory = 10;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("sameName").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.memory === 5);
    expect(s.perm("host").stack.some(({ cardId }) => cardId === "BT2-059")).toBe(true);
    expect(s.perm("opponentPeer").topCard.cardId).toBe("BT2-060");

    expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });
});
