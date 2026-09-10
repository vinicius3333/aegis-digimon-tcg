import { describe, expect, it } from "vitest";
import { EffectTiming, getCardDefinition } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { playEx4Card } from "./livePlayTestHelpers.js";
import { ex4CardBehaviorTests } from "./livePlayTestHelpers.js";
import { compiled } from "./EX4-038.js";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";

describe("EX4-038 Agumon", () => {
  it("matches the catalog and is registered as complete IR", () => {
    expect(getCardDefinition("EX4-038")).toMatchObject({
      cardId: "EX4-038",
      nameEn: "Agumon",
      colors: ["Black"],
      kinds: ["Digimon"],
      level: 3,
      playCost: 3,
      dp: 1000,
      types: ["Reptile"],
      attributes: ["Virus"],
    });
    expect(runtimeCompiledCard("EX4-038")).toMatchObject({ coverage: "full", residual: [] });
  });
  it("reveals three, adds Greymon and Gabumon/Garurumon/Omnimon, and returns the rest to deck top", () => {
    expect(compiled.effects?.find((entry) => entry.trigger === "OnPlay")?.actions?.[0]).toMatchObject({
      kind: "RevealAdd",
      revealCount: 3,
      rest: "deckTop",
      add: [
        { filter: { nameOrTrait: [{ match: "name", tokens: ["Greymon"] }] } },
        { filter: { nameOrTrait: [{ match: "name", tokens: ["Gabumon", "Garurumon", "Omnimon"] }] } },
      ],
    });
  });
  it("gains memory once per turn when one of your Digimon digivolves", () => {
    expect(compiled.effects?.find((entry) => entry.trigger === "YourTurn")).toMatchObject({
      isInherited: true,
      frequency: "OncePerTurn",
      actions: [
        {
          kind: "SubTrigger",
          event: "whenOneOfYoursDigivolves",
          sourceFilter: { controller: "mine", kind: ["Digimon"], excludeSelf: true },
          actions: [{ kind: "GainMemory", amount: 1 }],
        },
      ],
    });
  });

  it("plays through the live engine", async () => {
    const s = await playEx4Card("EX4-038");
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("subject").instanceId)).toBe(false);
  });

  it("adds both matching reveal slots and leaves the unmatched card on top", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX4-038", as: "subject" }],
          deck: ["AD1-001", "BT1-029", "BT1-012"],
        },
      },
      { autoSelectCards: true, autoOrderCards: true },
    );
    await s.ready();
    await advance(s.engine).fireForPermanent(EffectTiming.OnPlay, s.perm("subject"));
    await settle(() => s.state.players[0]!.hand.some((card) => card.cardId === "BT1-029"));

    expect(s.state.players[0]!.hand.map((card) => card.cardId)).toEqual(expect.arrayContaining(["AD1-001", "BT1-029"]));
    expect(s.state.players[0]!.deck[0]?.cardId).toBe("BT1-012");
  });

  it("adds only the available target when the other reveal slot has no match", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "EX4-038", as: "subject" }],
          deck: ["BT1-036", "BT1-012", "BT1-011"],
        },
      },
      { autoSelectCards: true, autoOrderCards: true },
    );
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("subject").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.hand.some((card) => card.cardId === "BT1-036"));

    expect(s.state.players[0]!.hand.map((card) => card.cardId)).toContain("BT1-036");
    expect(s.state.players[0]!.hand.map((card) => card.cardId)).not.toContain("BT1-012");
    expect(s.state.players[0]!.deck.slice(0, 2).map((card) => card.cardId)).toEqual(["BT1-012", "BT1-011"]);
  });

  it("gains memory for another Digimon's evolution but not for its own", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT1-010", as: "subject", under: ["EX4-038"] },
            { card: "BT1-010", as: "other" },
          ],
          hand: [{ card: "BT1-015", as: "evolution" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoOrderCards: true },
    );
    s.state.memory = 9;
    await s.ready();
    expect(
      observe(s.engine).subscriptions("whenOneOfYoursDigivolves", s.perm("subject").permanentId).length,
    ).toBeGreaterThan(0);
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("other").permanentId,
        instanceId: s.inst("evolution").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("other").topCard?.cardId === "BT1-015");
    expect(s.state.memory).toBe(8);

    const ownEvolution = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX4-038", as: "subject" }],
          hand: [{ card: "EX4-040", as: "evolution" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoOrderCards: true },
    );
    ownEvolution.state.memory = 10;
    await ownEvolution.ready();
    expect(
      ownEvolution.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: ownEvolution.perm("subject").permanentId,
        instanceId: ownEvolution.inst("evolution").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => ownEvolution.perm("subject").topCard?.cardId === "EX4-040");
    expect(ownEvolution.state.memory).toBe(7);
  });

  it("suppresses the second other evolution this turn and re-arms next own turn", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "BT1-010", as: "subject", under: ["EX4-038"] },
          { card: "BT1-010", as: "firstOther" },
          { card: "BT1-010", as: "secondOther" },
          { card: "BT1-010", as: "thirdOther" },
        ],
        hand: [
          { card: "BT1-015", as: "firstEvolution" },
          { card: "BT1-015", as: "secondEvolution" },
          { card: "BT1-015", as: "thirdEvolution" },
        ],
        deck: ["BT1-011", "BT1-012", "BT1-013", "BT1-014", "BT1-016", "BT1-017"],
      },
      1: {
        deck: ["BT1-011", "BT1-012", "BT1-013", "BT1-014", "BT1-016", "BT1-017"],
      },
    });
    s.state.turnSeat = 0;
    s.state.memory = 6;
    await s.ready();

    const firstTurn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(0);
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("firstOther").permanentId,
        instanceId: s.inst("firstEvolution").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("firstOther").topCard?.cardId === "BT1-015");
    expect(s.state.memory).toBe(5);

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("secondOther").permanentId,
        instanceId: s.inst("secondEvolution").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("secondOther").topCard?.cardId === "BT1-015");
    expect(s.state.memory).toBe(3);
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
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("thirdOther").permanentId,
        instanceId: s.inst("thirdEvolution").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("thirdOther").topCard?.cardId === "BT1-015");
    expect(s.state.memory).toBe(1);
    advance(s.engine).endMainPhaseIfOpen(0);
    await nextOwnTurn;
  });
  ex4CardBehaviorTests("EX4-038");
});
