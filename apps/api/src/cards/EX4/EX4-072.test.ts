import { describe, expect, it } from "vitest";
import { playEx4Card } from "./livePlayTestHelpers.js";
import { ex4CardBehaviorTests } from "./livePlayTestHelpers.js";
import {
  CardKind,
  EffectTiming,
  type CardDefinition,
  type CardInstance,
  type GameState,
  type Permanent,
  type Seat,
} from "@aegis/shared";
import { getEffectModule } from "../../engine/effects/registry.js";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import { observe } from "../../engine/testkit/observe.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { advance } from "../../engine/testkit/advance.js";
import "./EX4-072.js";

describe("EX4-072 Digital Translator", () => {
  it("compiles every printed clause as full residual-free IR", () => {
    expect(runtimeCompiledCard("EX4-072")).toMatchObject({ coverage: "full", residual: [] });
    expect(runtimeCompiledCard("EX4-072")?.effects).toMatchObject([
      { trigger: "Static", actions: [{ kind: "GrantStatic", grant: "name", tokens: ["Plug-In"] }] },
      {
        trigger: "Static",
        actions: [
          {
            kind: "WaiveColorRequirement",
            condition: { kind: "youHave", filter: { controllerDefault: "mine", kind: ["Tamer"] } },
          },
        ],
      },
      {
        trigger: "Main",
        actions: [
          {
            kind: "Digivolve",
            from: ["hand"],
            payCost: false,
            ignoreRequirements: true,
            optional: true,
            nameIncludesDigivolvingTarget: true,
            differentNameFromDigivolvingTarget: true,
          },
        ],
      },
      { trigger: "Security", isSecurity: true, actions: [{ kind: "Return" }, { kind: "AddToHandSelf" }] },
    ]);
  });

  it("registers separate Main and Security effects for the erratared name set", () => {
    const source = {
      instanceId: "source",
      cardId: "EX4-072",
      ownerSeat: 0,
      definition: {},
      permanent: () => undefined,
      isOnBattleArea: () => true,
      isOwnersTurn: () => true,
      hasColor: () => true,
    } as never;
    const module = getEffectModule("EX4-072")!;
    expect(module.effectsForTiming(EffectTiming.OnUseOption, source)).toHaveLength(1);
    expect(module.effectsForTiming(EffectTiming.SecuritySkill, source)).toHaveLength(1);
  });

  it("accepts a level-six named variant such as Gallantmon X Antibody", () => {
    const sourceCard = { cardId: "EX4-072", instanceId: "option", ownerSeat: 0, faceUp: true } as CardInstance;
    const chosen = { cardId: "BASE", instanceId: "chosen", ownerSeat: 0, faceUp: true } as CardInstance;
    const evolution = { cardId: "VARIANT", instanceId: "evolution", ownerSeat: 0, faceUp: true } as CardInstance;
    const permanent = {
      permanentId: "chosen-perm",
      controllerSeat: 0,
      topCard: chosen,
      stack: [],
      linked: [],
      isSuspended: false,
      inBreeding: false,
    } as unknown as Permanent;
    const definitions = new Map<string, CardDefinition>([
      [
        "EX4-072",
        {
          cardId: "EX4-072",
          set: "EX4",
          nameEn: "Digital Translator",
          kinds: [CardKind.Option],
          colors: ["White"] as never,
          playCost: 3,
          dp: 0,
          evoCosts: [],
          maxCountInDeck: 4,
        },
      ],
      [
        "BASE",
        {
          cardId: "BASE",
          set: "TEST",
          nameEn: "Gallantmon",
          kinds: [CardKind.Digimon],
          colors: ["Red"] as never,
          playCost: 8,
          dp: 11000,
          level: 6,
          evoCosts: [],
          maxCountInDeck: 4,
        },
      ],
      [
        "VARIANT",
        {
          cardId: "VARIANT",
          set: "TEST",
          nameEn: "Gallantmon X Antibody",
          kinds: [CardKind.Digimon],
          colors: ["Red"] as never,
          playCost: 8,
          dp: 12000,
          level: 6,
          evoCosts: [],
          maxCountInDeck: 4,
        },
      ],
    ]);
    const players = [
      { battleArea: [permanent], security: [], hand: [evolution], deck: [], trash: [] },
      { battleArea: [], security: [], hand: [], deck: [], trash: [] },
    ];
    const game = {
      state: { memory: 0, players, turnSeat: 0 as Seat } as unknown as GameState,
      player: (seat: Seat) => players[seat] as never,
      opponentOf: () => 1 as Seat,
      permanentById: (id: string) => (id === permanent.permanentId ? permanent : undefined),
      definitionOf: (card: CardInstance) => definitions.get(card.cardId)!,
    };
    const source = {
      instanceId: sourceCard.instanceId,
      cardId: "EX4-072",
      ownerSeat: 0 as Seat,
      definition: definitions.get("EX4-072")!,
      permanent: () => undefined,
      isOnBattleArea: () => false,
      isOwnersTurn: () => true,
      hasColor: () => true,
    } as never;
    const effect = getEffectModule("EX4-072")!.effectsForTiming(EffectTiming.OnUseOption, source)[0]!;
    expect(effect.canActivate({ source, trigger: {}, game, fx: {}, ask: {} } as never)).toBe(true);
  });

  it("plays through the live engine", async () => {
    const s = await playEx4Card("EX4-072");
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("subject").instanceId)).toBe(false);
  });

  it("exposes the Plug-In rule name and waives white color requirements with a Tamer", async () => {
    const placed = setupEngine({
      0: {
        battleArea: [
          { card: "EX4-072", as: "placed" },
          { card: "EX4-064", as: "tamer" },
        ],
      },
    });
    await placed.ready();
    expect(observe(placed.engine).grantedNames(placed.perm("placed"))).toContain("plug-in");

    const s = setupEngine({
      0: { battleArea: [{ card: "EX4-064", as: "tamer" }], hand: [{ card: "EX4-072", as: "option" }] },
    });
    s.state.memory = 10;
    await s.ready();
    const optionId = s.inst("option").instanceId;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: optionId })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.trash.some((card) => card.instanceId === optionId));
    expect(s.state.players[0]!.trash.some((card) => card.instanceId === optionId)).toBe(true);

    const withoutTamer = setupEngine({ 0: { hand: [{ card: "EX4-072", as: "option" }] } });
    withoutTamer.state.memory = 10;
    await withoutTamer.ready();
    expect(
      withoutTamer.engine.applyIntent(0, { type: "playCard", instanceId: withoutTamer.inst("option").instanceId }),
    ).toEqual({
      ok: false,
      reason: "color-requirement-unmet",
    });
  });

  it("digivolves only to a matching level-six name, for no memory, and preserves the source stack", async () => {
    const preferredIds: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT19-054", as: "base", under: ["BT1-084"] },
            { card: "EX4-064", as: "tamer" },
          ],
          hand: [
            { card: "EX4-072", as: "option" },
            { card: "EX4-037", as: "matching" },
            { card: "EX4-030", as: "nearMiss" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferredIds },
    );
    s.state.memory = 3;
    await s.ready();
    preferredIds.push(s.inst("base").instanceId, s.inst("matching").instanceId);
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.perm("base").topCard?.cardId === "EX4-037");
    expect(s.perm("base").topCard?.cardId).toBe("EX4-037");
    expect(s.perm("base").stack.map((card) => card.cardId)).toContain("BT1-084");
    expect(s.state.memory).toBe(0);
    expect(s.state.players[0]!.hand.map((card) => card.cardId)).toEqual(expect.arrayContaining(["EX4-030"]));
  });

  it("is optional: declining leaves the Option and level-six base unchanged", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT19-054", as: "base" },
            { card: "EX4-064", as: "tamer" },
          ],
          hand: [
            { card: "EX4-072", as: "option" },
            { card: "EX4-037", as: "matching" },
          ],
        },
      },
      { autoAcceptOptional: false, autoDeclineOptional: true, autoSelectCards: true },
    );
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.pendingDecision === undefined);
    expect(s.perm("base").topCard?.cardId).toBe("BT19-054");
    expect(s.state.players[0]!.hand.map((card) => card.cardId)).toContain("EX4-037");
  });

  it("Security returns a Digimon but never a non-Digimon trash card", async () => {
    const s = setupEngine(
      { 0: { security: [{ card: "EX4-072", as: "security", faceUp: true }], trash: ["BT1-064", "EX4-070"] } },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    await advance(s.engine).fireForInstance(EffectTiming.SecuritySkill, s.inst("security"));
    await settle(() => s.state.pendingDecision === undefined);
    expect(s.state.players[0]!.hand.map((card) => card.cardId)).toEqual(expect.arrayContaining(["EX4-072", "BT1-064"]));
    expect(s.state.players[0]!.trash.map((card) => card.cardId)).toContain("EX4-070");
  });

  ex4CardBehaviorTests("EX4-072");
});
