import { describe, expect, it } from "vitest";
import { dnaDigivolutionRequirementsFor, digivolutionRequirementsFor, getCardDefinition } from "@aegis/shared";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { registeredCompiledCards } from "../../engine/effects/interpreter/compiledCards.js";
import "../index.js";

describe("EX12-055 Andromon", () => {
  it("maps every printed clause, evolution route, DNA route, and Counter legality", () => {
    const card = getCardDefinition("EX12-055");
    const compiled = registeredCompiledCards.get("EX12-055")!;

    expect(card?.effectText).toContain("Reveal the top 3 cards");
    expect(card?.effectText).toContain("level 6 or lower [ME] trait Digimon card");
    expect(digivolutionRequirementsFor("EX12-055")).toEqual([
      { level: 4, traits: ["Machine", "ME"], cost: 3, isAlternate: true },
    ]);
    expect(dnaDigivolutionRequirementsFor("EX12-055")).toEqual([
      {
        cost: 0,
        materials: [
          { color: "Black", level: 4 },
          { color: "Red", level: 4 },
        ],
      },
      {
        cost: 0,
        materials: [
          { color: "Black", level: 4 },
          { color: "Yellow", level: 4 },
        ],
      },
      {
        cost: 0,
        materials: [
          { color: "Purple", level: 4 },
          { color: "Red", level: 4 },
        ],
      },
      {
        cost: 0,
        materials: [
          { color: "Purple", level: 4 },
          { color: "Yellow", level: 4 },
        ],
      },
    ]);

    for (const trigger of ["OnPlay", "WhenDigivolving"]) {
      expect(compiled.effects.find((effect) => effect.trigger === trigger)).toMatchObject({
        actions: [
          {
            kind: "RevealAdd",
            revealCount: 3,
            rest: "trash",
            add: [
              {
                count: 1,
                to: "play",
                optional: true,
                filter: {
                  playCostLte: 5,
                  nameOrTrait: [{ match: "trait", tokens: ["Machine", "Cyborg", "ME"] }],
                },
              },
            ],
          },
        ],
      });
    }

    const counter = compiled.effects.find((effect) => effect.trigger === "Counter")!;
    expect(counter).toMatchObject({
      frequency: "OncePerTurn",
      actions: [
        {
          kind: "Digivolve",
          payCost: false,
          from: ["hand"],
          optional: true,
          target: { filter: { controller: "mine", excludeSelf: true, kind: ["Digimon"] }, count: 1 },
          into: {
            controllerDefault: "mine",
            kind: ["Digimon"],
            levelComparison: { op: "lte", value: 6 },
            nameOrTrait: [{ match: "trait", tokens: ["ME"] }],
          },
        },
      ],
    });
    expect(counter.actions[0]).not.toHaveProperty("ignoreRequirements");

    expect(compiled.effects.find((effect) => effect.isInherited)).toMatchObject({
      trigger: "OpponentsTurn",
      isInherited: true,
      frequency: "OncePerTurn",
      actions: [
        {
          kind: "SubTrigger",
          event: "whenOpponentAttacks",
          actions: [{ kind: "RedirectAttack", optional: true, target: { filter: { isSelfRef: true } } }],
        },
      ],
    });
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
  });

  it("plays only a matching Machine/Cyborg/ME card with play cost 5 or less and trashes the rest", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "EX12-055", as: "andromon" }],
          deck: ["BT3-066", "BT14-062", "BT14-015"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("andromon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.cardId === "BT3-066"));
    await settle(() => false, 80);

    expect(s.state.players[0]!.battleArea.map((permanent) => permanent.topCard?.cardId)).toEqual(
      expect.arrayContaining(["EX12-055", "BT3-066"]),
    );
    expect(s.state.players[0]!.trash.map((card) => card.cardId)).toEqual(
      expect.arrayContaining(["BT14-062", "BT14-015"]),
    );
    expect(s.state.memory).toBe(3);
  });

  it("trashes all revealed cards and plays nothing when no card matches the optional branch", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "EX12-055", as: "andromon" }],
          deck: ["BT14-062", "BT14-015", "BT1-009"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("andromon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.deck.length === 0 && s.state.players[0]!.trash.length === 3);

    expect(s.state.players[0]!.battleArea.map((permanent) => permanent.topCard?.cardId)).toEqual(["EX12-055"]);
    expect(s.state.players[0]!.trash.map((card) => card.cardId)).toEqual(
      expect.arrayContaining(["BT14-062", "BT14-015", "BT1-009"]),
    );
  });

  it("DNA digivolves through a printed Black Lv.4 plus Red Lv.4 route at cost 0", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT13-066", as: "blackMaterial" },
            { card: "BT1-014", as: "redMaterial" },
          ],
          hand: [{ card: "EX12-055", as: "andromon" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 0;

    expect(
      s.engine.applyIntent(0, {
        type: "dnaDigivolve",
        materialPermanentIds: [s.perm("blackMaterial").permanentId, s.perm("redMaterial").permanentId],
        instanceId: s.inst("andromon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.cardId === "EX12-055"));

    const andromon = s.state.players[0]!.battleArea.find((permanent) => permanent.topCard?.cardId === "EX12-055")!;
    expect(andromon.stack.map((card) => card.cardId)).toEqual(expect.arrayContaining(["BT13-066", "BT1-014"]));
    expect(s.state.memory).toBe(0);
  });

  it("uses the Counter window to digivolve one other Digimon from hand without paying memory", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT1-009", as: "attacker" }] },
        1: {
          battleArea: [
            { card: "EX12-055", as: "counterCard" },
            { card: "EX12-064", as: "other" },
          ],
          hand: [{ card: "EX12-059", as: "target" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const attacker = s.perm("attacker");
    const counterCard = s.perm("counterCard");

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: attacker.permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.events.some((event) => event.kind === "counterWindowOpened"));

    const opened = s.events.find((event) => event.kind === "counterWindowOpened");
    if (opened?.kind !== "counterWindowOpened") throw new Error("counter window did not open");
    const eligible = opened.eligibleCounters.find((entry) => entry.instanceId === counterCard.topCard!.instanceId);
    expect(eligible).toBeDefined();
    expect(
      s.engine.applyIntent(1, {
        type: "respondCounter",
        sourceInstanceId: eligible!.instanceId,
        effectKey: eligible!.effectKey,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("other").topCard?.cardId === "EX12-059");

    expect(s.perm("other").topCard?.cardId).toBe("EX12-059");
    expect(s.state.memory).toBe(0);
  });
});
