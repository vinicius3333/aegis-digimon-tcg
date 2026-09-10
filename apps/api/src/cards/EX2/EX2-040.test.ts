import { getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { compiled } from "./EX2-040.js";

const INERT_DECK = ["BT1-009", "BT1-012", "BT1-013", "BT1-014", "BT1-009", "BT1-012"];
const INERT_SECURITY = ["BT1-009"];

describe("EX2-040 Devidramon", () => {
  it("matches the catalog and compiles both printed clauses", () => {
    expect(getCardDefinition("EX2-040")).toMatchObject({
      cardId: "EX2-040",
      nameEn: "Devidramon",
      colors: ["Purple"],
      kinds: ["Digimon"],
      level: 4,
      playCost: 5,
      dp: 4000,
      evoCosts: [{ color: "Purple", level: 3, memoryCost: 2 }],
      forms: ["Champion"],
      attributes: ["Virus"],
      types: ["Evil Dragon"],
      effectText:
        "＜Retaliation＞ (When this Digimon is deleted after losing a battle, delete the Digimon it was battling.)",
      inheritedEffectText: "[When Attacking] You may trash the top 2 cards of your deck.",
    });
    const card = runtimeCompiledCard("EX2-040");
    expect(card).toMatchObject({ coverage: "full", residual: [] });
    expect(card?.effects).toMatchObject([
      { trigger: "Static", keywords: [{ keyword: "Retaliation", raw: "＜Retaliation＞" }] },
      {
        trigger: "WhenAttacking",
        isInherited: true,
        actions: [{ kind: "TrashTopDeck", controller: "mine", amount: 2, optional: true }],
      },
    ]);
    expect(compiled).toEqual(card);
  });

  it("legally evolves from purple level 3 and exposes Retaliation on top", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "EX2-039", as: "base" }],
        hand: [{ card: "EX2-040", as: "devidramon" }],
        deck: INERT_DECK,
        security: INERT_SECURITY,
      },
      1: { deck: INERT_DECK, security: INERT_SECURITY },
    });
    s.state.memory = 5;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("devidramon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard?.cardId === "EX2-040");
    expect(s.state.memory).toBe(3);
    expect(s.perm("base").stack.map((card) => card.cardId)).toEqual(["EX2-039"]);
    expect(observe(s.engine).hasKeyword(s.perm("base"), "Retaliation")).toBe(true);
  });

  it("trashes the top two cards from an evolved host when the inherited effect is accepted", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX2-039", as: "base" }],
          hand: [
            { card: "EX2-040", as: "devidramon" },
            { card: "BT10-079", as: "host" },
          ],
          deck: [{ card: "BT1-009", as: "first" }, { card: "BT1-012", as: "second" }, ...INERT_DECK],
          security: INERT_SECURITY,
        },
        1: { deck: INERT_DECK, security: INERT_SECURITY },
      },
      { autoAcceptOptional: true, autoOrderTriggers: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("devidramon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard?.cardId === "EX2-040");
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("host").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard?.cardId === "BT10-079");
    expect(s.perm("base").stack.map((card) => card.cardId)).toEqual(["EX2-039", "EX2-040"]);
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("base").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.trash.length === 2);
    expect(s.state.players[0]!.trash.map((card) => card.cardId)).toEqual(["BT1-009", "BT1-012"]);
  });

  it("leaves the deck unchanged when the inherited optional effect is declined", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX2-039", as: "base" }],
          hand: [
            { card: "EX2-040", as: "devidramon" },
            { card: "BT10-079", as: "host" },
          ],
          deck: [{ card: "BT1-009", as: "first" }, { card: "BT1-012", as: "second" }, ...INERT_DECK],
          security: INERT_SECURITY,
        },
        1: { deck: INERT_DECK, security: INERT_SECURITY },
      },
      { autoOrderTriggers: true },
    );
    s.state.memory = 10;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("devidramon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard?.cardId === "EX2-040");
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("host").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard?.cardId === "BT10-079");
    const deckBeforeAttack = s.state.players[0]!.deck.map((card) => card.instanceId);
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("base").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.decisions.some(({ req }) => req.kind === "optional"));
    const optionalDecision = s.decisions.find(({ req }) => req.kind === "optional");
    expect(optionalDecision).toBeDefined();
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: optionalDecision!.req.decisionId,
        response: { kind: "optional", accept: false },
      }),
    ).toEqual({ ok: true });
    await settle();
    expect(s.state.players[0]!.trash).toHaveLength(0);
    expect(s.state.players[0]!.deck.map((card) => card.instanceId)).toEqual(deckBeforeAttack);
  });

  it("Retaliation deletes the attacker after Devidramon loses a battle", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT1-013", as: "attacker" }], deck: INERT_DECK, security: INERT_SECURITY },
        1: {
          battleArea: [{ card: "EX2-040", as: "devidramon", suspended: true }],
          deck: INERT_DECK,
          security: INERT_SECURITY,
        },
      },
      { autoDeclineOptional: true },
    );
    await s.ready();
    const attackerId = s.perm("attacker").permanentId;
    const devidramonId = s.perm("devidramon").permanentId;
    expect(observe(s.engine).hasKeyword(s.perm("devidramon"), "Retaliation")).toBe(true);
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: attackerId,
        target: { kind: "permanent", permanentId: devidramonId },
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        !s.state.players[0]!.battleArea.some((permanent) => permanent.permanentId === attackerId) &&
        !s.state.players[1]!.battleArea.some((permanent) => permanent.permanentId === devidramonId),
    );
    expect(s.state.players[0]!.trash.map((card) => card.cardId)).toEqual(["BT1-013"]);
    expect(s.state.players[1]!.trash.map((card) => card.cardId)).toEqual(["EX2-040"]);
    expect(s.state.players[1]!.security).toHaveLength(1);
  });

  it("does not grant Retaliation to a bare non-Devidramon peer", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT1-013", as: "attacker" }], deck: INERT_DECK },
      1: { battleArea: [{ card: "BT1-014", as: "peer", suspended: true }], deck: INERT_DECK },
    });
    await s.ready();
    const attackerId = s.perm("attacker").permanentId;
    expect(observe(s.engine).hasKeyword(s.perm("peer"), "Retaliation")).toBe(false);
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: attackerId,
        target: { kind: "permanent", permanentId: s.perm("peer").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.battleArea.length === 0);
    expect(s.state.players[0]!.battleArea.map((permanent) => permanent.permanentId)).toEqual([attackerId]);
    expect(s.state.players[0]!.trash).toHaveLength(0);
  });
});
