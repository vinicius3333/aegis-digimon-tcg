import { describe, expect, it } from "vitest";
import { getCardDefinition } from "@aegis/shared";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { playEx4Card } from "./livePlayTestHelpers.js";
import { ex4CardBehaviorTests } from "./livePlayTestHelpers.js";
import { compiled } from "./EX4-039.js";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";

describe("EX4-039 Gabumon", () => {
  it("matches the catalog and is registered as complete IR", () => {
    expect(getCardDefinition("EX4-039")).toMatchObject({
      cardId: "EX4-039",
      nameEn: "Gabumon",
      colors: ["Black"],
      kinds: ["Digimon"],
      level: 3,
      playCost: 3,
      dp: 1000,
      types: ["Reptile"],
      attributes: ["Virus"],
      effectText: expect.stringContaining("[Garurumon]"),
      inheritedEffectText: expect.stringContaining("gain 1 memory"),
    });
    expect(runtimeCompiledCard("EX4-039")).toMatchObject({ coverage: "full", residual: [] });
  });

  it("reveals three, adds Garurumon and Agumon/Greymon/Omnimon, and returns the rest to deck top", () => {
    expect(compiled.effects?.find((entry) => entry.trigger === "OnPlay")?.actions?.[0]).toMatchObject({
      kind: "RevealAdd",
      revealCount: 3,
      rest: "deckTop",
      add: [
        { filter: { nameOrTrait: [{ match: "name", tokens: ["Garurumon"] }] } },
        { filter: { nameOrTrait: [{ match: "name", tokens: ["Agumon", "Greymon", "Omnimon"] }] } },
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
    const s = await playEx4Card("EX4-039");
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("subject").instanceId)).toBe(false);
  });

  it("adds both matching reveal slots and leaves the unmatched card on top", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "EX4-039", as: "subject" }],
          deck: ["BT1-036", "AD1-001", "BT1-012"],
        },
      },
      { autoSelectCards: true, autoOrderCards: true },
    );
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("subject").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.hand.some((card) => card.cardId === "AD1-001"));

    expect(s.state.players[0]!.hand.map((card) => card.cardId)).toEqual(expect.arrayContaining(["BT1-036", "AD1-001"]));
    expect(s.state.players[0]!.deck[0]?.cardId).toBe("BT1-012");
  });

  it("adds the only available matching slot and returns the other reveals to deck top", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "EX4-039", as: "subject" }],
          deck: ["BT1-036", "BT1-012", "BT1-013"],
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
    expect(s.state.players[0]!.deck.slice(0, 2).map((card) => card.cardId)).toEqual(["BT1-012", "BT1-013"]);
  });

  it("gains memory for another Digimon's evolution but not for its own", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT1-010", as: "subject", under: ["EX4-039"] },
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
          battleArea: [{ card: "EX4-039", as: "subject" }],
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
  ex4CardBehaviorTests("EX4-039");
});
