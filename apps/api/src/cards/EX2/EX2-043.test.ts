import { getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { compiled } from "./EX2-043.js";
import "./EX2-040.js";
import "./EX2-042.js";
import "../BT4/BT4-079.js";
import "../BT6/BT6-068.js";

const INERT_DECK = ["BT1-009", "BT1-013", "BT1-014", "BT1-009", "BT1-013", "BT1-014"];
const TURN_DECK = [...INERT_DECK, ...INERT_DECK, ...INERT_DECK, ...INERT_DECK];
const INERT_SECURITY = ["BT1-009", "BT1-013", "BT1-014"];

describe("EX2-043 Gulfmon", () => {
  it("matches the catalog and compiles the hand-trim and unsuspend clauses", () => {
    expect(getCardDefinition("EX2-043")).toMatchObject({
      cardId: "EX2-043",
      nameEn: "Gulfmon",
      colors: ["Purple"],
      kinds: ["Digimon"],
      level: 6,
      playCost: 12,
      dp: 12000,
      forms: ["Mega"],
      attributes: ["Virus"],
      types: ["Dark Animal"],
      evoCosts: [{ color: "Purple", level: 5, memoryCost: 4 }],
      effectText:
        "[When Digivolving] All players trash cards in their hand until they have 5 cards left.[Your Turn][Once Per Turn] When one of your effects trashes a card in your hand, you may unsuspend 1 of your Digimon.",
    });
    const card = runtimeCompiledCard("EX2-043");
    expect(card).toMatchObject({ coverage: "full", residual: [] });
    expect(card?.effects).toMatchObject([
      {
        trigger: "WhenDigivolving",
        actions: [{ kind: "HandManipulation", op: "trashVariable", amount: "untilFive" }],
      },
      {
        trigger: "YourTurn",
        frequency: "OncePerTurn",
        actions: [
          {
            kind: "SubTrigger",
            event: "whenHandTrashed",
            sourceFilter: { controller: "mine" },
            fireCondition: { kind: "triggerByYourEffect" },
            actions: [
              {
                kind: "Unsuspend",
                target: { filter: { controller: "mine", kind: ["Digimon"] }, count: 1 },
                optional: true,
              },
            ],
          },
        ],
      },
    ]);
    expect(compiled).toEqual(card);
  });

  it("trims both players' hands to five after the evolution draw", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX2-042", as: "base" }],
          hand: [{ card: "EX2-043", as: "gulfmon" }, "BT1-009", "BT1-013", "BT1-014", "BT1-009", "BT1-013"],
          deck: [{ card: "BT1-014", as: "evolutionDraw" }, ...TURN_DECK],
          security: INERT_SECURITY,
        },
        1: {
          hand: ["BT1-009", "BT1-013", "BT1-014", "BT1-009", "BT1-013", "BT1-014"],
          deck: TURN_DECK,
          security: INERT_SECURITY,
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoOrderTriggers: true },
    );
    s.state.memory = 10;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("gulfmon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard?.cardId === "EX2-043" && s.state.players[0]!.hand.length === 5);
    expect(s.state.players[0]!.hand).toHaveLength(5);
    expect(s.state.players[1]!.hand).toHaveLength(5);
    expect(s.state.players[0]!.trash).toHaveLength(1);
    expect(s.state.players[1]!.trash).toHaveLength(1);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toContain(s.inst("evolutionDraw").instanceId);
  });

  it("does not trash its own hand when it has five after drawing, but trims the opponent", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "EX2-042", as: "base" },
            { card: "EX2-040", as: "target", suspended: true },
          ],
          hand: [{ card: "EX2-043", as: "gulfmon" }, "BT1-009", "BT1-013", "BT1-014", "BT1-009"],
          deck: [{ card: "BT1-014", as: "evolutionDraw" }, ...TURN_DECK],
          security: INERT_SECURITY,
        },
        1: {
          hand: ["BT1-009", "BT1-013", "BT1-014", "BT1-009", "BT1-013", "BT1-014"],
          deck: TURN_DECK,
          security: INERT_SECURITY,
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoOrderTriggers: true },
    );
    s.state.memory = 10;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("gulfmon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard?.cardId === "EX2-043" && s.state.players[1]!.hand.length === 5);
    expect(s.state.players[0]!.hand).toHaveLength(5);
    expect(s.state.players[0]!.trash).toHaveLength(0);
    expect(s.state.players[1]!.hand).toHaveLength(5);
    expect(s.state.players[1]!.trash).toHaveLength(1);
    expect(s.perm("target").isSuspended).toBe(true);
  });

  it("allows declining the optional unsuspend watcher", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "EX2-042", as: "base" },
            { card: "EX2-040", as: "target", suspended: true },
          ],
          hand: [{ card: "EX2-043", as: "gulfmon" }, "BT1-009", "BT1-013", "BT1-014", "BT1-009", "BT1-013"],
          deck: [{ card: "BT1-014", as: "evolutionDraw" }, ...TURN_DECK],
          security: INERT_SECURITY,
        },
        1: { deck: TURN_DECK, security: INERT_SECURITY },
      },
      { autoDeclineOptional: true, autoSelectCards: true, autoOrderTriggers: true },
    );
    s.state.memory = 10;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("gulfmon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard?.cardId === "EX2-043" && s.state.players[0]!.hand.length === 5);
    expect(s.perm("target").isSuspended).toBe(true);
    expect(s.state.players[0]!.trash).toHaveLength(1);
  });

  it("rejects evolving from a non-purple level 5 source", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT1-038", as: "blueSource" }],
        hand: [{ card: "EX2-043", as: "gulfmon" }],
        deck: INERT_DECK,
        security: INERT_SECURITY,
      },
    });
    s.state.memory = 10;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("blueSource").permanentId,
        instanceId: s.inst("gulfmon").instanceId,
      }),
    ).toMatchObject({ ok: false });
  });

  it("optionally unsuspends one Digimon once per turn, then resets on the next own turn", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "EX2-042", as: "base" },
            { card: "EX2-040", as: "firstTarget", suspended: true },
            { card: "EX2-040", as: "secondTarget", suspended: true },
          ],
          hand: [
            { card: "EX2-043", as: "gulfmon" },
            "BT1-009",
            "BT1-013",
            "BT1-014",
            "BT1-009",
            { card: "BT6-068", as: "sameTurnEffect" },
            { card: "BT6-068", as: "resetEffect" },
          ],
          deck: [{ card: "BT1-014", as: "evolutionDraw" }, ...TURN_DECK],
          security: INERT_SECURITY,
        },
        1: { deck: TURN_DECK, security: INERT_SECURITY },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoOrderTriggers: true },
    );
    s.state.memory = 10;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("gulfmon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("firstTarget").isSuspended === false && s.state.players[0]!.hand.length === 5);
    expect(s.perm("firstTarget").isSuspended).toBe(false);
    expect(s.perm("secondTarget").isSuspended).toBe(true);

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("sameTurnEffect").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.hand.length === 3);
    expect(s.perm("secondTarget").isSuspended).toBe(true);

    const loop = s.engine.startTurnLoop();
    try {
      await advance(s.engine).waitForMainPhase(0);
      advance(s.engine).endMainPhaseIfOpen(0);
      await advance(s.engine).waitForMainPhase(1);
      advance(s.engine).endMainPhaseIfOpen(1);
      await advance(s.engine).waitForMainPhase(0);
      expect(s.perm("secondTarget").isSuspended).toBe(false);
      expect(
        s.engine.applyIntent(0, {
          type: "attack",
          attackerPermanentId: s.perm("secondTarget").permanentId,
          target: { kind: "player" },
        }),
      ).toEqual({ ok: true });
      await settle(() => !observe(s.engine).isAttacking() && s.perm("secondTarget").isSuspended);
      expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("resetEffect").instanceId })).toEqual({
        ok: true,
      });
      await settle(() => s.perm("secondTarget").isSuspended === false);
      expect(s.perm("secondTarget").isSuspended).toBe(false);
    } finally {
      if (!s.state.gameOver) s.engine.applyIntent(0, { type: "surrender" });
      await loop;
    }
  });
});
