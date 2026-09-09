import { describe, expect, it } from "vitest";
import { Phase, getCardDefinition } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import { compiled } from "./EX4-003.js";
import "../index.js";

// EX4-003 is supplied only by an eggDeck and hatched through the public flow. No Digi-Egg is
// illegally seeded in a deck or security fixture below.
const inertSecurity = ["BT1-013", "BT1-012"];
const inertOpponentDeck = ["BT1-013", "BT1-012"];

describe("EX4-003 Tsunomon — catalog and IR", () => {
  it("matches the catalog identity and inherited clause", () => {
    expect(getCardDefinition("EX4-003")).toMatchObject({
      cardId: "EX4-003",
      nameEn: "Tsunomon",
      colors: ["Black"],
      kinds: ["DigiEgg"],
      level: 2,
      playCost: -1,
      dp: 0,
      evoCosts: [],
      forms: ["In-Training"],
      types: ["Lesser"],
      inheritedEffectText:
        "[Your Turn][Once Per Turn] When one of your other Digimon digivolves, . (Draw 1 card from your deck.)",
    });
  });

  it("registers a complete inherited IR watcher", () => {
    expect(runtimeCompiledCard("EX4-003")).toMatchObject({ coverage: "full", residual: [] });
    expect(compiled.effects).toEqual([
      {
        trigger: "YourTurn",
        actions: [
          {
            kind: "SubTrigger",
            event: "whenOneOfYoursDigivolves",
            sourceFilter: {
              controllerDefault: "mine",
              excludeSelf: true,
              kind: ["Digimon"],
            },
            actions: [{ kind: "Draw", controller: "mine", amount: 1 }],
          },
        ],
        isInherited: true,
        frequency: "OncePerTurn",
      },
    ]);
  });
});

describe("EX4-003 Tsunomon — public stack behavior", () => {
  it("hatches publicly, digivolves for the printed cost, preserves Tsunomon, and draws for another evolution", async () => {
    const s = setupEngine({
      0: {
        eggDeck: [{ card: "EX4-003", as: "tsunomon" }],
        hand: [
          { card: "BT10-058", as: "hostEvolution" },
          { card: "BT1-014", as: "otherEvolution" },
        ],
        battleArea: [{ card: "BT1-009", as: "otherBase" }],
        deck: [
          { card: "BT1-012", as: "eggEvolutionDraw" },
          { card: "BT1-013", as: "otherEvolutionDraw" },
          { card: "BT1-011", as: "inheritedDraw" },
          { card: "BT1-011", as: "remaining" },
        ],
        security: inertSecurity,
      },
      1: { deck: inertOpponentDeck, security: inertSecurity },
    });
    s.state.turnSeat = 0;
    await s.ready();

    const loop = s.engine.startTurnLoop();
    await settle(() => s.state.phase === Phase.Breeding && s.state.turnSeat === 0);

    s.engine.applyIntent(0, { type: "hatchEgg" });
    await settle(() => s.state.players[0]!.breeding?.topCard?.instanceId === s.inst("tsunomon").instanceId);
    const eggInstanceId = s.inst("tsunomon").instanceId;
    const breedingPermanentId = s.state.players[0]!.breeding!.permanentId;

    await advance(s.engine).waitForMainPhase(0);
    s.state.memory = 2;
    s.engine.applyIntent(0, {
      type: "digivolve",
      permanentId: breedingPermanentId,
      instanceId: s.inst("hostEvolution").instanceId,
    });
    await settle(() => s.state.players[0]!.breeding?.topCard?.cardId === "BT10-058");

    // The host's own evolution is excluded by “other”; the egg remains the source card in the
    // stack, and the level-2-to-level-3 Black route costs 0 memory.
    expect(s.state.memory).toBe(2);
    expect(s.state.players[0]!.breeding!.stack.map(({ instanceId }) => instanceId)).toEqual([eggInstanceId]);

    advance(s.engine).endMainPhaseIfOpen(0);
    await advance(s.engine).waitForMainPhase(1);
    advance(s.engine).endMainPhaseIfOpen(1);
    await settle(() => s.state.phase === Phase.Breeding && s.state.turnSeat === 0);
    s.engine.applyIntent(0, { type: "moveFromBreeding", permanentId: breedingPermanentId });
    await settle(() => s.state.players[0]!.battleArea.some(({ permanentId }) => permanentId === breedingPermanentId));

    const host = s.state.players[0]!.battleArea.find(({ permanentId }) => permanentId === breedingPermanentId)!;
    expect(host.topCard?.cardId).toBe("BT10-058");
    expect(host.stack.map(({ instanceId }) => instanceId)).toEqual([eggInstanceId]);

    await advance(s.engine).waitForMainPhase(0);
    s.state.memory = 2;
    s.engine.applyIntent(0, {
      type: "digivolve",
      permanentId: s.perm("otherBase").permanentId,
      instanceId: s.inst("otherEvolution").instanceId,
    });
    await settle(() => s.perm("otherBase").topCard?.cardId === "BT1-014");

    expect(s.state.players[0]!.hand.map(({ instanceId }) => instanceId)).toEqual(
      expect.arrayContaining([
        s.inst("eggEvolutionDraw").instanceId,
        s.inst("otherEvolutionDraw").instanceId,
        s.inst("inheritedDraw").instanceId,
      ]),
    );
    expect(s.state.memory).toBe(0);
    expect(s.perm("otherBase").stack.map(({ cardId }) => cardId)).toEqual(["BT1-009"]);
    expect(host.topCard?.cardId).toBe("BT10-058");
    expect(host.stack.map(({ instanceId }) => instanceId)).toEqual([eggInstanceId]);

    advance(s.engine).endMainPhaseIfOpen(0);
    s.engine.applyIntent(0, { type: "surrender" });
    await loop;
  });

  it("does not react when only the host carrying Tsunomon digivolves", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT1-009", as: "host", under: ["EX4-003"] }],
        hand: [{ card: "BT1-014", as: "hostEvolution" }],
        deck: [{ card: "BT1-012", as: "evolutionDraw" }],
        security: inertSecurity,
      },
      1: { deck: inertOpponentDeck, security: inertSecurity },
    });
    s.state.turnSeat = 0;
    s.state.memory = 2;
    await s.ready();

    s.engine.applyIntent(0, {
      type: "digivolve",
      permanentId: s.perm("host").permanentId,
      instanceId: s.inst("hostEvolution").instanceId,
    });
    await settle(() => s.perm("host").topCard?.cardId === "BT1-014");

    expect(s.state.players[0]!.hand.map(({ instanceId }) => instanceId)).toContain(s.inst("evolutionDraw").instanceId);
    expect(s.state.players[0]!.deck).toHaveLength(0);
  });

  it("rejects an illegal level-3 route before it can create a false digivolution trigger", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT1-010", as: "base", under: ["EX4-003"] }],
        hand: [{ card: "BT1-064", as: "illegalEvolution" }],
        deck: ["BT1-012"],
        security: inertSecurity,
      },
      1: { deck: inertOpponentDeck, security: inertSecurity },
    });
    s.state.turnSeat = 0;
    s.state.memory = 2;
    await s.ready();

    const result = s.engine.applyIntent(0, {
      type: "digivolve",
      permanentId: s.perm("base").permanentId,
      instanceId: s.inst("illegalEvolution").instanceId,
    });

    expect(result.ok).toBe(false);
    expect(s.perm("base").topCard?.cardId).toBe("BT1-010");
    expect(s.state.players[0]!.hand.map(({ instanceId }) => instanceId)).toContain(
      s.inst("illegalEvolution").instanceId,
    );
  });
});

describe("EX4-003 Tsunomon — once-per-turn boundaries", () => {
  it("draws only once for multiple other Digimon in one turn", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "BT1-009", as: "host", under: ["EX4-003"] },
          { card: "BT1-009", as: "firstBase" },
          { card: "BT1-009", as: "secondBase" },
        ],
        hand: [
          { card: "BT1-014", as: "firstEvolution" },
          { card: "BT1-014", as: "secondEvolution" },
        ],
        deck: [
          { card: "BT1-012", as: "firstEvolutionDraw" },
          { card: "BT1-013", as: "inheritedDraw" },
          { card: "BT1-011", as: "secondEvolutionDraw" },
          { card: "BT1-010", as: "remaining" },
        ],
        security: inertSecurity,
      },
      1: { deck: inertOpponentDeck, security: inertSecurity },
    });
    s.state.turnSeat = 0;
    s.state.memory = 4;
    await s.ready();

    s.engine.applyIntent(0, {
      type: "digivolve",
      permanentId: s.perm("firstBase").permanentId,
      instanceId: s.inst("firstEvolution").instanceId,
    });
    await settle(() => s.perm("firstBase").topCard?.cardId === "BT1-014");
    s.state.memory = 2;
    s.engine.applyIntent(0, {
      type: "digivolve",
      permanentId: s.perm("secondBase").permanentId,
      instanceId: s.inst("secondEvolution").instanceId,
    });
    await settle(() => s.perm("secondBase").topCard?.cardId === "BT1-014");

    expect(s.state.players[0]!.hand.map(({ instanceId }) => instanceId)).toEqual(
      expect.arrayContaining([s.inst("firstEvolutionDraw").instanceId, s.inst("inheritedDraw").instanceId]),
    );
    expect(s.state.players[0]!.hand.map(({ instanceId }) => instanceId)).toContain(
      s.inst("secondEvolutionDraw").instanceId,
    );
    expect(s.state.players[0]!.deck.map(({ instanceId }) => instanceId)).toEqual([s.inst("remaining").instanceId]);
  });

  it("re-arms on the next own turn", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "BT1-009", as: "host", under: ["EX4-003"] },
          { card: "BT1-009", as: "firstBase" },
          { card: "BT1-009", as: "secondBase" },
        ],
        hand: [
          { card: "BT1-014", as: "firstEvolution" },
          { card: "BT1-014", as: "secondEvolution" },
        ],
        deck: [
          { card: "BT1-012", as: "firstEvolutionDraw" },
          { card: "BT1-013", as: "firstInheritedDraw" },
          { card: "BT1-011", as: "secondEvolutionDraw" },
          { card: "BT1-010", as: "secondInheritedDraw" },
          "BT1-012",
          "BT1-013",
          "BT1-011",
          "BT1-010",
        ],
        security: inertSecurity,
      },
      1: { deck: [...inertOpponentDeck, ...inertOpponentDeck, ...inertOpponentDeck], security: inertSecurity },
    });
    s.state.turnSeat = 0;
    await s.ready();

    const firstTurn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(0);
    s.state.memory = 2;
    s.engine.applyIntent(0, {
      type: "digivolve",
      permanentId: s.perm("firstBase").permanentId,
      instanceId: s.inst("firstEvolution").instanceId,
    });
    await settle(() => s.perm("firstBase").topCard?.cardId === "BT1-014");
    expect(s.state.players[0]!.hand.map(({ instanceId }) => instanceId)).toContain(
      s.inst("firstInheritedDraw").instanceId,
    );
    advance(s.engine).endMainPhaseIfOpen(0);
    await firstTurn;

    s.state.turnSeat = 1;
    s.state.memory = -s.state.memory;
    const opponentTurn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(1);
    advance(s.engine).endMainPhaseIfOpen(1);
    await opponentTurn;

    s.state.turnSeat = 0;
    s.state.memory = -s.state.memory;
    const nextOwnTurn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(0);
    s.state.memory = 2;
    s.engine.applyIntent(0, {
      type: "digivolve",
      permanentId: s.perm("secondBase").permanentId,
      instanceId: s.inst("secondEvolution").instanceId,
    });
    await settle(() => s.perm("secondBase").topCard?.cardId === "BT1-014");
    expect(s.state.players[0]!.hand.map(({ instanceId }) => instanceId)).toContain(
      s.inst("secondInheritedDraw").instanceId,
    );
    advance(s.engine).endMainPhaseIfOpen(0);
    await nextOwnTurn;
  });
});
