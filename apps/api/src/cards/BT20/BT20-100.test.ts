import { getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { matchNameOrTrait } from "../../engine/effects/interpreter.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./BT20-100.js";
import "./index.js";
import "../BT22/BT22-052.js";

describe("BT20-100 The Last Guardian", () => {
  it("matches the catalog contract and maps every printed clause to IR", () => {
    expect(getCardDefinition("BT20-100")).toMatchObject({
      cardId: "BT20-100",
      nameEn: "The Last Guardian",
      colors: ["White"],
      kinds: ["Option"],
      playCost: 4,
      evoCosts: [],
      forms: ["-"],
      attributes: ["-"],
      types: ["Royal Knight"],
      maxCountInDeck: 4,
    });
    const printed = getCardDefinition("BT20-100")!;
    const effectText = printed.effectText!.replaceAll("\u00a0", " ");
    expect(effectText).toContain(
      "[Main] Reveal the top 3 cards of your deck. Add 1 [Cool Boy] and 1 card with the [Royal Knight]/[X Antibody] trait among them to the hand. Return the rest to the bottom of the deck. Then, place this card in the battle area.",
    );
    expect(effectText).toContain(
      "[All Turns] When any of your Digimon with [Omnimon] in its name would leave the battle area",
    );
    expect(printed.securityEffectText).toBe(
      "[Security] You may play 1 [Omekamon]/[Cool Boy] from your hand or trash without paying the cost. Then, place this card in the battle area.",
    );
    expect(compiled).toMatchObject({ coverage: "full", residual: [] });

    expect(compiled.effects.find((entry) => entry.trigger === "Main")).toMatchObject({
      actions: [
        {
          kind: "RevealAdd",
          revealCount: 3,
          add: [
            { count: 1, filter: { nameOrTrait: [{ tokens: ["Cool Boy"], match: "nameExact" }] } },
            { count: 1, filter: { nameOrTrait: [{ tokens: ["Royal Knight", "X Antibody"], match: "trait" }] } },
          ],
          rest: "deckBottom",
        },
        { kind: "PlaceInBattleAreaSelf" },
      ],
    });
    expect(compiled.effects.find((entry) => entry.trigger === "Security")).toMatchObject({
      isSecurity: true,
      actions: [
        {
          kind: "PlayWithoutCost",
          target: {
            filter: {
              controller: "mine",
              nameOrTrait: [{ tokens: ["Omekamon", "Cool Boy"], match: "nameExact" }],
            },
            count: 1,
          },
          from: ["hand", "trash"],
          payCost: false,
          optional: true,
        },
        { kind: "PlaceInBattleAreaSelf" },
      ],
    });
  });

  it("uses exact names for Cool Boy/Omekamon and a substring name for Omnimon", () => {
    expect(matchNameOrTrait({ nameEn: "Cool Boy" }, { tokens: ["Cool Boy"], match: "nameExact" })).toBe(true);
    expect(matchNameOrTrait({ nameEn: "Cool Boy Jr." }, { tokens: ["Cool Boy"], match: "nameExact" })).toBe(false);
    expect(matchNameOrTrait({ nameEn: "Omekamon" }, { tokens: ["Omekamon"], match: "nameExact" })).toBe(true);
    expect(matchNameOrTrait({ nameEn: "Omekamon X" }, { tokens: ["Omekamon"], match: "nameExact" })).toBe(false);
    expect(matchNameOrTrait({ nameEn: "Omnimon (X Antibody)" }, { tokens: ["Omnimon"], match: "name" })).toBe(true);
    expect(matchNameOrTrait({ nameEn: "Dramon" }, { tokens: ["Omnimon"], match: "name" })).toBe(false);
  });

  it("naturally adds Cool Boy and a Royal Knight from the revealed top three", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "BT20-100", as: "option" }],
          battleArea: ["BT20-092"],
          deck: ["BT20-091", "BT20-056", "BT1-010"],
        },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 4;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.cardId === "BT20-100"));

    expect(s.state.players[0]!.hand.map((card) => card.cardId)).toEqual(
      expect.arrayContaining(["BT20-091", "BT20-056"]),
    );
    expect(s.state.players[0]!.battleArea.map((permanent) => permanent.topCard.cardId)).toContain("BT20-100");
    expect(s.state.players[0]!.deck).toHaveLength(1);
  });

  it("uses Delay after a natural play and next-turn public transition", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "BT20-100", as: "option" }],
          battleArea: ["BT20-092", { card: "BT10-086", as: "omnimon" }],
          deck: ["BT1-010", "BT1-010", "BT1-010", "BT1-010"],
        },
        1: { deck: ["BT1-010", "BT1-010", "BT1-010", "BT1-010"], security: ["BT1-010"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoOrderTriggers: true },
    );
    s.state.memory = 4;
    await s.ready();
    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.cardId === "BT20-100"));
    advance(s.engine).endMainPhaseIfOpen(0);
    await advance(s.engine).waitForMainPhase(1);
    advance(s.engine).endMainPhaseIfOpen(1);
    await advance(s.engine).waitForMainPhase(0);

    await advance(s.engine).verb.deletePermanent([s.perm("omnimon").permanentId], "byEffect");
    await settle(() => s.state.players[0]!.trash.some((card) => card.cardId === "BT20-100"));

    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.cardId === "BT10-086")).toBe(true);
    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.cardId === "BT20-100")).toBe(false);
    expect(s.state.players[0]!.trash.some((card) => card.cardId === "BT20-100")).toBe(true);
    expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  it("does not prevent a non-Omnimon departure after the same public timing", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "BT20-100", as: "option" }],
          battleArea: ["BT20-092", { card: "BT1-010", as: "otherDigimon" }],
          deck: ["BT1-010", "BT1-010", "BT1-010", "BT1-010"],
        },
        1: { deck: ["BT1-010", "BT1-010", "BT1-010", "BT1-010"], security: ["BT1-010"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 4;
    await s.ready();
    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.cardId === "BT20-100"));
    advance(s.engine).endMainPhaseIfOpen(0);
    await advance(s.engine).waitForMainPhase(1);
    advance(s.engine).endMainPhaseIfOpen(1);
    await advance(s.engine).waitForMainPhase(0);

    await advance(s.engine).verb.deletePermanent([s.perm("otherDigimon").permanentId], "byEffect");

    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.cardId === "BT1-010")).toBe(false);
    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.cardId === "BT20-100")).toBe(true);
    expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  it("keeps Q4905's simultaneous peer trigger live after Delay prevents the leave", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "BT20-100", as: "option" }],
          battleArea: ["BT20-092", { card: "BT22-052", as: "leopardmon" }, { card: "BT10-086", as: "omnimon" }],
          deck: ["BT1-010", "BT1-010", "BT1-010", "BT1-010"],
        },
        1: { deck: ["BT1-010", "BT1-010", "BT1-010", "BT1-010"], security: ["BT1-010"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoOrderTriggers: true },
    );
    s.state.memory = 4;
    await s.ready();
    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.cardId === "BT20-100"));
    advance(s.engine).endMainPhaseIfOpen(0);
    await advance(s.engine).waitForMainPhase(1);
    advance(s.engine).endMainPhaseIfOpen(1);
    await advance(s.engine).waitForMainPhase(0);

    await advance(s.engine).verb.deletePermanent([s.perm("omnimon").permanentId], "byEffect");
    await settle(() => s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.cardId === "BT10-086"));

    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.cardId === "BT10-086")).toBe(true);
    expect(s.state.players[0]!.trash.some((card) => card.cardId === "BT20-100")).toBe(true);
    expect(
      s.events.some(
        (event) => event.kind === "memoryChanged" && event.reason === "gainMemory" && event.to - event.from === 2,
      ),
    ).toBe(true);
    expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  it("plays an exact Omekamon from trash through Security, then places itself", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT20-010", as: "attacker" }] },
        1: {
          security: [{ card: "BT20-100", as: "securityOption" }],
          trash: [{ card: "BT13-093", as: "omekamon" }],
          deck: ["BT1-010", "BT1-010", "BT1-010"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        s.state.players[1]!.battleArea.some((permanent) => permanent.topCard.cardId === "BT20-100") &&
        s.state.players[1]!.battleArea.some((permanent) => permanent.topCard.cardId === "BT13-093"),
    );
    expect(s.state.players[1]!.security).toHaveLength(0);
    expect(s.state.players[1]!.battleArea.some((permanent) => permanent.topCard.cardId === "BT20-100")).toBe(true);
    expect(s.state.players[1]!.battleArea.some((permanent) => permanent.topCard.cardId === "BT13-093")).toBe(true);
    expect(s.state.players[1]!.trash.some((card) => card.cardId === "BT13-093")).toBe(false);
  });

  it("declines the optional Security play but still places itself", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT20-010", as: "attacker" }] },
        1: { security: [{ card: "BT20-100", as: "securityOption" }] },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.battleArea.some((permanent) => permanent.topCard.cardId === "BT20-100"));
    expect(s.state.players[1]!.security).toHaveLength(0);
    expect(s.state.players[1]!.battleArea.some((permanent) => permanent.topCard.cardId === "BT20-100")).toBe(true);
    expect(s.state.players[1]!.battleArea.some((permanent) => permanent.topCard.cardId === "BT13-093")).toBe(false);
  });
});
