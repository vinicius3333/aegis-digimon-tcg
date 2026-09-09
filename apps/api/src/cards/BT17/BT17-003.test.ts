import { Phase } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./BT17-003.js";

describe("BT17-003 Bibimon", () => {
  it("exports the once-per-turn inherited Tamer-placement watcher", () => {
    expect(compiled.effects).toContainEqual(
      expect.objectContaining({
        trigger: "YourTurn",
        isInherited: true,
        frequency: "OncePerTurn",
        actions: [
          expect.objectContaining({
            kind: "SubTrigger",
            event: "onAddDigivolutionCards",
            triggerFilter: { isSelfRef: true },
            addedDigivolutionCardFilter: { kind: ["Tamer"] },
            actions: [{ kind: "GainMemory", amount: 1 }],
          }),
        ],
      }),
    );
  });

  it("Q2703: gains memory only when an effect places a Tamer in this inherited host", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "BT6-030", under: ["BT17-003"], as: "host" },
          { card: "BT1-021", as: "otherHost" },
        ],
        hand: [
          { card: "BT1-010", as: "digimon" },
          { card: "BT1-085", as: "wrongHostTamer" },
          { card: "BT1-085", as: "hostTamer" },
        ],
      },
    });
    s.state.memory = 0;
    await s.ready();

    await advance(s.engine).verb.placeUnder(s.perm("host").permanentId, [s.inst("digimon").instanceId]);
    expect(s.state.memory).toBe(0);

    await advance(s.engine).verb.placeUnder(s.perm("otherHost").permanentId, [s.inst("wrongHostTamer").instanceId]);
    expect(s.state.memory).toBe(0);

    await advance(s.engine).verb.placeUnder(s.perm("host").permanentId, [s.inst("hostTamer").instanceId]);
    expect(s.state.memory).toBe(1);
    expect(s.perm("host").stack.some((card) => card.cardId === "BT1-085")).toBe(true);
  });

  it("gains memory only once per turn across separate Tamer placements", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT6-030", under: ["BT17-003"], as: "host" }],
        hand: [
          { card: "BT1-085", as: "firstTamer" },
          { card: "BT1-085", as: "secondTamer" },
        ],
      },
    });
    s.state.memory = 0;
    await s.ready();

    await advance(s.engine).verb.placeUnder(s.perm("host").permanentId, [s.inst("firstTamer").instanceId]);
    await advance(s.engine).verb.placeUnder(s.perm("host").permanentId, [s.inst("secondTamer").instanceId]);

    expect(s.state.memory).toBe(1);
    expect(s.perm("host").stack.filter((card) => card.cardId === "BT1-085")).toHaveLength(2);
  });

  it("does not gain memory on the opponent's turn", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT6-030", under: ["BT17-003"], as: "host" }],
        hand: [{ card: "BT1-085", as: "tamer" }],
      },
    });
    s.state.turnSeat = 1;
    s.state.memory = 0;
    await s.ready();

    await advance(s.engine).verb.placeUnder(s.perm("host").permanentId, [s.inst("tamer").instanceId]);

    expect(s.state.memory).toBe(0);
    expect(s.perm("host").stack.some((card) => card.cardId === "BT1-085")).toBe(true);
  });

  it("gains memory again on the next own turn after the once-per-turn use is spent", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT6-030", under: ["BT17-003"], as: "host" }],
        hand: [
          { card: "BT1-085", as: "firstTamer" },
          { card: "BT1-085", as: "secondTamer" },
          { card: "BT1-085", as: "thirdTamer" },
        ],
        deck: ["BT1-009", "BT1-010", "BT1-011", "BT1-012"],
      },
      1: { deck: ["BT1-009", "BT1-010", "BT1-011", "BT1-012"], security: ["BT1-009", "BT1-013"] },
    });
    s.state.memory = 0;
    await s.ready();

    await advance(s.engine).verb.placeUnder(s.perm("host").permanentId, [s.inst("firstTamer").instanceId]);
    expect(s.state.memory).toBe(1);
    await advance(s.engine).verb.placeUnder(s.perm("host").permanentId, [s.inst("secondTamer").instanceId]);
    expect(s.state.memory).toBe(1);

    await advance(s.engine).runTurn(0);
    s.state.turnSeat = 1;
    s.state.memory = 3;
    await advance(s.engine).runTurn(1);
    s.state.turnSeat = 0;
    s.state.memory = 3;
    expect(s.state.turnSeat).toBe(0);

    const memoryBefore = s.state.memory;
    await advance(s.engine).verb.placeUnder(s.perm("host").permanentId, [s.inst("thirdTamer").instanceId]);
    expect(s.state.memory).toBe(memoryBefore + 1);
    expect(s.perm("host").stack.filter((card) => card.cardId === "BT1-085")).toHaveLength(3);
  });

  it("carries the inherited memory gain through the real Digi-Egg route: hatch -> digivolve -> battle area", async () => {
    // Peer/stack case, public intents only for every zone change: `hatchEgg` puts BT17-003 in
    // the breeding area, the Yellow Lv.3 BT1-045 digivolves onto it there (Lv.2 Yellow, cost 0),
    // and `moveFromBreeding` carries the stack into the battle area on the next own turn. The
    // near-miss peer beside it is a Digimon with no BT17-003 beneath: a Tamer placed under it
    // gains nothing, while the same placement under the real host gains 1.
    const s = setupEngine(
      {
        0: {
          eggDeck: [{ card: "BT17-003", as: "egg" }],
          battleArea: [{ card: "BT1-013", as: "peer" }],
          hand: [
            { card: "BT1-045", as: "tsukaimon" },
            { card: "BT1-085", as: "peerTamer" },
            { card: "BT1-085", as: "hostTamer" },
          ],
          deck: ["BT1-013", "BT1-014", "BT1-009", "BT1-012", "BT1-013", "BT1-014"],
          security: ["BT1-009", "BT1-013"],
        },
        1: {
          deck: ["BT1-009", "BT1-013", "BT1-014", "BT1-012", "BT1-009"],
          security: ["BT1-013", "BT1-014"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const loop = s.engine.startTurnLoop();

    await settle(() => s.state.phase === Phase.Breeding && s.state.turnSeat === 0);
    expect(s.engine.applyIntent(0, { type: "hatchEgg" })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.breeding?.topCard?.cardId === "BT17-003");
    const eggInstanceId = s.state.players[0]!.breeding!.topCard!.instanceId;
    const eggPermanentId = s.state.players[0]!.breeding!.permanentId;

    await advance(s.engine).waitForMainPhase(0);
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: eggPermanentId,
        instanceId: s.inst("tsukaimon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.breeding?.topCard?.cardId === "BT1-045");
    expect(s.state.players[0]!.breeding!.stack.map(({ instanceId }) => instanceId)).toEqual([eggInstanceId]);

    advance(s.engine).endMainPhaseIfOpen(0);
    await advance(s.engine).waitForMainPhase(1);
    advance(s.engine).endMainPhaseIfOpen(1);

    await settle(() => s.state.phase === Phase.Breeding && s.state.turnSeat === 0);
    expect(s.engine.applyIntent(0, { type: "moveFromBreeding", permanentId: eggPermanentId })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.length === 2);
    const carrier = s.state.players[0]!.battleArea.find(({ topCard }) => topCard?.cardId === "BT1-045")!;
    expect(carrier.stack.map(({ instanceId }) => instanceId)).toEqual([eggInstanceId]);

    await advance(s.engine).waitForMainPhase(0);
    s.state.memory = 1;

    await advance(s.engine).verb.placeUnder(s.perm("peer").permanentId, [s.inst("peerTamer").instanceId]);
    expect(s.state.memory).toBe(1);

    await advance(s.engine).verb.placeUnder(carrier.permanentId, [s.inst("hostTamer").instanceId]);
    expect(s.state.memory).toBe(2);
    expect(carrier.stack.map(({ cardId }) => cardId)).toEqual(["BT1-085", "BT17-003"]);

    expect(s.state.pendingDecision).toBeUndefined();
    expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });
});
