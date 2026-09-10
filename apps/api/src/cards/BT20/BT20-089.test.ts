import { getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { compiled } from "./BT20-089.js";
import "../BT14/BT14-087.js";
import "../BT16/BT16-023.js";
import "./BT20-029.js";
import "./BT20-034.js";
import "./BT20-070.js";
import "./BT20-080.js";
import "./index.js";

const CC_FANG = "BT20-089";
const DECK_FILLER = ["BT1-010", "BT1-010", "BT1-010", "BT1-010", "BT1-010"];

describe("BT20-089 Code Cracker Fang & Hacker Judge", () => {
  it("matches the catalog and encodes the printed Tamer, Security, Rule, and inherited branches", () => {
    expect(getCardDefinition(CC_FANG)).toMatchObject({
      cardId: CC_FANG,
      nameEn: "Code Cracker Fang & Hacker Judge",
      colors: ["Purple", "Yellow"],
      kinds: ["Tamer"],
      playCost: 4,
      types: ["SoC", "Abadin Electronics", "SEEKERS"],
      effectText: expect.stringContaining("If your opponent has a Digimon, gain 1 memory"),
      securityEffectText: expect.stringContaining("Alliance"),
    });
    expect(compiled).toMatchObject({ coverage: "full", residual: [] });

    expect(compiled.effects.find((effect) => effect.trigger === "Rule")).toMatchObject({
      actions: [
        {
          kind: "GrantStatic",
          grant: "name",
          tokens: ["Eiji Nagasumi", "Leon Alexander"],
          duration: "permanent",
          target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
        },
      ],
    });
    const watchers = compiled.effects.find(
      (effect) => effect.trigger === "AllTurns" && effect.actions.some((action) => action.kind === "SubTrigger"),
    );
    expect(watchers).toMatchObject({
      actions: [
        {
          kind: "SubTrigger",
          event: "whenPlayed",
          sourceFilter: { controller: "mine", kind: ["Digimon"] },
          actions: [
            {
              kind: "MindLink",
              optional: true,
              target: {
                filter: {
                  controller: "mine",
                  kind: ["Digimon"],
                  nameOrTrait: [
                    { match: "text", tokens: ["Pulsemon"] },
                    { match: "trait", tokens: ["SoC", "SEEKERS"] },
                  ],
                },
                count: 1,
              },
            },
          ],
        },
        {
          kind: "SubTrigger",
          event: "whenOneOfYoursDigivolves",
          sourceFilter: { controller: "mine", kind: ["Digimon"] },
        },
      ],
    });
    expect(compiled.effects.find((effect) => effect.trigger === "StartOfYourMainPhase")).toMatchObject({
      actions: [
        {
          kind: "GainMemory",
          amount: 1,
          condition: { kind: "opponentHas", filter: { controllerDefault: "opponent", kind: ["Digimon"] } },
        },
      ],
    });
    const inheritedKeywords = compiled.effects.find((effect) => effect.isInherited && effect.trigger === "AllTurns");
    expect(inheritedKeywords?.actions).toHaveLength(3);
    expect(inheritedKeywords?.actions.map((action) => action.kind)).toEqual([
      "GainKeyword",
      "GainKeyword",
      "GainKeyword",
    ]);
    expect(inheritedKeywords?.actions).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ keyword: expect.objectContaining({ keyword: "Alliance" }) }),
        expect.objectContaining({ keyword: expect.objectContaining({ keyword: "Piercing" }) }),
        expect.objectContaining({ keyword: expect.objectContaining({ keyword: "Barrier" }) }),
      ]),
    );
    expect(compiled.effects.find((effect) => effect.trigger === "EndOfAllTurns" && effect.isInherited)).toMatchObject({
      actions: [
        {
          kind: "PlayWithoutCost",
          fromOwnDigivolutionStack: true,
          payCost: false,
          optional: true,
          target: { filter: { nameOrTrait: [{ tokens: ["Eiji Nagasumi"], match: "nameExact" }] }, count: 1 },
        },
      ],
    });
    expect(compiled.effects.find((effect) => effect.isSecurity)).toMatchObject({
      trigger: "Security",
      isSecurity: true,
      actions: [{ kind: "PlayWithoutCost", payCost: false, target: { isSelf: true } }],
    });
  });

  it("gains one memory only when the opponent has a Digimon at the real start of main", async () => {
    const withOpponent = setupEngine({
      0: { battleArea: [{ card: CC_FANG, as: "fang" }], deck: DECK_FILLER },
      1: { battleArea: [{ card: "BT1-010", as: "opponent" }], deck: DECK_FILLER },
    });
    withOpponent.state.memory = 0;
    await withOpponent.ready();
    await advance(withOpponent.engine).runTurn(0);
    expect(withOpponent.events).toContainEqual(expect.objectContaining({ kind: "memoryChanged", from: 0, to: 1 }));

    const withoutOpponent = setupEngine({
      0: { battleArea: [{ card: CC_FANG, as: "fang" }], deck: DECK_FILLER },
      1: { deck: DECK_FILLER },
    });
    withoutOpponent.state.memory = 0;
    await withoutOpponent.ready();
    await advance(withoutOpponent.engine).runTurn(0);
    expect(withoutOpponent.events).not.toContainEqual(
      expect.objectContaining({ kind: "memoryChanged", from: 0, to: 1 }),
    );
  });

  it("Mind Links a qualifying Pulsemon-text Digimon when it is played, and can be declined", async () => {
    for (const [accept, target] of [
      [true, "BT16-023"],
      [false, "BT20-029"],
    ] as const) {
      const s = setupEngine(
        {
          0: {
            battleArea: [{ card: CC_FANG, as: "fang" }],
            hand: [{ card: target, as: "target" }],
            deck: [...DECK_FILLER, ...DECK_FILLER],
          },
          1: { deck: DECK_FILLER },
        },
        { autoAcceptOptional: accept, autoDeclineOptional: !accept, autoSelectCards: true },
      );
      s.state.memory = 3;
      await s.ready();
      expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("target").instanceId })).toEqual({
        ok: true,
      });
      await settle(() => s.state.pendingDecision === undefined && s.state.players[0]!.battleArea.length === 2);
      const targetPermanent = s.state.players[0]!.battleArea.find((permanent) => permanent.topCard.cardId === target)!;
      expect(targetPermanent.stack.some((card) => card.cardId === CC_FANG)).toBe(accept);
      expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.cardId === CC_FANG)).toBe(!accept);
    }
  });

  it("Mind Links again through the separate digivolve watcher", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: CC_FANG, as: "fang" },
            { card: "BT20-034", as: "base" },
          ],
          hand: [{ card: "BT20-080", as: "fenri" }],
          deck: DECK_FILLER,
        },
        1: { deck: DECK_FILLER },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 3;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("fenri").instanceId,
        alternateRequirementIndex: 1,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").stack.some((card) => card.cardId === CC_FANG));
    expect(s.perm("base").topCard.cardId).toBe("BT20-080");
    expect(s.perm("base").stack.map((card) => card.cardId)).toContain(CC_FANG);
  });

  it("matches the broad text and trait union for inherited Alliance, Piercing, and Barrier", async () => {
    for (const [card, expected] of [
      ["BT16-023", true],
      ["BT20-070", true],
      ["BT1-010", false],
    ] as const) {
      const s = setupEngine({
        0: { battleArea: [{ card, under: [CC_FANG], as: "host" }], deck: DECK_FILLER },
        1: { deck: DECK_FILLER },
      });
      await s.ready();
      expect(observe(s.engine).hasKeyword(s.perm("host"), "Alliance")).toBe(expected);
      expect(observe(s.engine).hasPierce(s.perm("host"))).toBe(expected);
      expect(observe(s.engine).hasKeyword(s.perm("host"), "Barrier")).toBe(expected);
    }
  });

  it("uses the linked inherited keywords in a public Alliance and Piercing attack", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: CC_FANG, as: "fang" },
            { card: "BT20-029", as: "pulsemon" },
            { card: "BT1-010", dp: 6000, as: "ally" },
          ],
          hand: [{ card: "BT20-032", as: "evolution" }],
          security: ["BT1-009"],
          deck: DECK_FILLER,
        },
        1: {
          battleArea: [{ card: "BT1-010", dp: 8000, suspended: true, as: "defender" }],
          security: ["BT1-009", "BT1-009", "BT1-009"],
          deck: DECK_FILLER,
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 3;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("pulsemon").permanentId,
        instanceId: s.inst("evolution").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("pulsemon").stack.some((card) => card.cardId === CC_FANG));
    expect(observe(s.engine).hasKeyword(s.perm("pulsemon"), "Alliance")).toBe(true);
    expect(observe(s.engine).hasPierce(s.perm("pulsemon"))).toBe(true);
    expect(observe(s.engine).hasKeyword(s.perm("pulsemon"), "Barrier")).toBe(true);
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("pulsemon").permanentId,
        target: { kind: "permanent", permanentId: s.perm("defender").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.events.some((event) => event.kind === "alliancePrompt"));
    expect(s.engine.applyIntent(0, { type: "respondAlliance", allyPermanentId: s.perm("ally").permanentId })).toEqual({
      ok: true,
    });
    await settle(() => !observe(s.engine).isAttacking());
    expect(s.perm("ally").isSuspended).toBe(true);
    expect(s.state.players[1]!.battleArea).toHaveLength(0);
    expect(s.events.filter((event) => event.kind === "securityChecked")).toHaveLength(2);
  });

  it("plays the exact Eiji-name card from the host stack at the public end of all turns (Q5555)", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT20-029", under: [CC_FANG], as: "host" }], deck: DECK_FILLER },
        1: { deck: DECK_FILLER },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoOrderTriggers: true },
    );
    await s.ready();
    await advance(s.engine).runTurn(0);
    await settle(() => s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.cardId === CC_FANG));
    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.cardId === CC_FANG)).toBe(true);
    expect(s.perm("host").stack.some((card) => card.cardId === CC_FANG)).toBe(false);
  });

  it("plays itself from Security without cost through a public check", async () => {
    const s = setupEngine(
      {
        0: { security: [{ card: CC_FANG, as: "securityFang" }], deck: DECK_FILLER },
        1: { battleArea: [{ card: "BT1-010", as: "attacker" }], deck: DECK_FILLER },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.turnSeat = 1;
    await s.ready();
    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.cardId === CC_FANG));
    expect(s.state.players[0]!.security).toHaveLength(0);
    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.cardId === CC_FANG)).toBe(true);
  });
});
