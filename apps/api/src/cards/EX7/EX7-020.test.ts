import { digivolutionRequirementsFor, getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { assertNoLoudGap, setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { compiled } from "./EX7-020.js";
import "../index.js";
import "../BT1/BT1-039.js";

const FILLER = ["BT1-009", "BT1-011", "BT1-012", "BT1-013", "BT1-014"];
const SECURITY = ["BT1-013", "BT1-014", "BT1-013"];
const ATTACK_SECURITY = ["BT1-011", "BT1-011", "BT1-011", "BT1-011", "BT1-011"];

async function stopLoop(s: ReturnType<typeof setupEngine>, loop: Promise<void>) {
  expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
  await loop;
}

describe("EX7-020 Paledramon", () => {
  it("matches the catalog and compiles every printed clause", () => {
    expect(getCardDefinition("EX7-020")).toMatchObject({
      cardId: "EX7-020",
      nameEn: "Paledramon",
      colors: ["Blue"],
      kinds: ["Digimon"],
      level: 4,
      playCost: 5,
      dp: 5000,
      forms: ["Champion"],
      attributes: ["Data"],
      types: ["Dragon", "Ice-Snow"],
      evoCosts: [{ color: "Blue", level: 3, memoryCost: 2 }],
      effectText:
        "[When Digivolving] Trash the bottom 2 digivolution card of 1 of your opponent's Digimon. Then, if your opponent has no Digimon with digivolution cards, this Digimon gains ＜Jamming＞and ＜Blocker＞until the end of your opponent's turn.\n[Rule] Trait: Has the [Ice-Snow] type.",
      inheritedEffectText:
        "[When Attacking] [Once Per Turn] Trash the top digivolution card of 1 of your opponent's Digimon.",
    });
    expect(digivolutionRequirementsFor("EX7-020")).toBeUndefined();
    expect(compiled).toMatchObject({ coverage: "full", residual: [] });
    expect(compiled.effects).toEqual([
      {
        trigger: "WhenDigivolving",
        actions: [
          {
            kind: "TrashDigivolution",
            target: {
              filter: { controller: "opponent", kind: ["Digimon"], digivolutionCards: "hasAny" },
              count: 1,
            },
            amount: 2,
            fromTop: false,
          },
          {
            kind: "GainKeyword",
            target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
            keyword: { keyword: "Jamming", raw: "＜Jamming＞" },
            duration: "untilOpponentTurnEnd",
            condition: {
              kind: "opponentHasNone",
              filter: { controllerDefault: "opponent", kind: ["Digimon"], digivolutionCards: "hasAny" },
              raw: "your opponent has no Digimon with digivolution cards",
            },
          },
          {
            kind: "GainKeyword",
            target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
            keyword: { keyword: "Blocker", raw: "＜Blocker＞" },
            duration: "untilOpponentTurnEnd",
            condition: {
              kind: "opponentHasNone",
              filter: { controllerDefault: "opponent", kind: ["Digimon"], digivolutionCards: "hasAny" },
              raw: "your opponent has no Digimon with digivolution cards",
            },
          },
        ],
      },
      {
        trigger: "Rule",
        actions: [
          {
            kind: "GrantStatic",
            target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
            grant: "trait",
            tokens: ["Ice-Snow"],
          },
        ],
      },
      {
        trigger: "WhenAttacking",
        actions: [
          {
            kind: "TrashDigivolution",
            target: {
              filter: { controller: "opponent", kind: ["Digimon"], digivolutionCards: "hasAny" },
              count: 1,
            },
            amount: 1,
            fromTop: true,
          },
        ],
        isInherited: true,
        frequency: "OncePerTurn",
      },
    ]);
  });

  it("publicly evolves for cost 2, draws the standard card, grants both keywords, and expires them after the opponent turn", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT1-028", as: "source" }],
          hand: [{ card: "EX7-020", as: "pale" }],
          deck: [
            { card: "BT1-009", as: "evolutionDraw" },
            { card: "BT1-011", as: "rest" },
          ],
          security: SECURITY,
        },
        1: {
          battleArea: [{ card: "BT1-009", as: "attacker" }],
          deck: [...FILLER],
          security: ATTACK_SECURITY,
        },
      },
      { autoSelectCards: true },
    );
    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    s.state.memory = 5;
    const sourceId = s.inst("source").instanceId;
    const paleId = s.inst("pale").instanceId;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("source").permanentId,
        instanceId: paleId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("source").topCard?.instanceId === paleId);

    expect(s.perm("source").topCard?.cardId).toBe("EX7-020");
    expect(s.perm("source").topCard?.instanceId).toBe(paleId);
    expect(s.perm("source").stack.map((card) => card.instanceId)).toEqual([sourceId]);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toEqual([s.inst("evolutionDraw").instanceId]);
    expect(s.state.players[0]!.deck.map((card) => card.instanceId)).toEqual([s.inst("rest").instanceId]);
    expect(s.state.memory).toBe(3);
    expect(observe(s.engine).hasEffectiveTrait(s.perm("source"), "Ice-Snow")).toBe(true);
    expect(observe(s.engine).hasKeyword(s.perm("source"), "Jamming")).toBe(true);
    expect(observe(s.engine).hasKeyword(s.perm("source"), "Blocker")).toBe(true);
    expect(s.state.pendingDecision).toBeUndefined();

    advance(s.engine).endMainPhaseIfOpen(0);
    await advance(s.engine).waitForMainPhase(1);
    expect(observe(s.engine).hasKeyword(s.perm("source"), "Jamming")).toBe(true);
    expect(observe(s.engine).hasKeyword(s.perm("source"), "Blocker")).toBe(true);

    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.events.some((event) => event.kind === "blockWindowOpened"));
    expect(s.engine.applyIntent(0, { type: "declareBlock", blockerPermanentId: s.perm("source").permanentId })).toEqual(
      { ok: true },
    );
    await settle(() => s.events.some((event) => event.kind === "combatResolved"));
    expect(observe(s.engine).hasKeyword(s.perm("source"), "Blocker")).toBe(true);

    advance(s.engine).endMainPhaseIfOpen(1);
    await advance(s.engine).waitForMainPhase(0);
    expect(observe(s.engine).hasKeyword(s.perm("source"), "Jamming")).toBe(false);
    expect(observe(s.engine).hasKeyword(s.perm("source"), "Blocker")).toBe(false);
    await stopLoop(s, loop);
  });

  it("trashes exactly the bottom two opposing evolution cards and withholds the temporary keywords when one remains", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT1-028", as: "source" }],
          hand: [{ card: "EX7-020", as: "pale" }],
          deck: [
            { card: "BT1-009", as: "evolutionDraw" },
            { card: "BT1-011", as: "rest" },
          ],
          security: SECURITY,
        },
        1: {
          battleArea: [
            {
              card: "BT1-009",
              as: "stacked",
              under: [
                { card: "BT1-010", as: "bottom" },
                { card: "BT1-011", as: "middle" },
                { card: "BT1-012", as: "top" },
              ],
            },
          ],
          deck: [...FILLER],
          security: ATTACK_SECURITY,
        },
      },
      { autoSelectCards: true },
    );
    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    s.state.memory = 5;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("source").permanentId,
        instanceId: s.inst("pale").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("stacked").stack.length === 1);

    expect(s.perm("stacked").stack.map((card) => card.instanceId)).toEqual([s.inst("top").instanceId]);
    expect(s.state.players[1]!.trash.map((card) => card.instanceId)).toEqual([
      s.inst("bottom").instanceId,
      s.inst("middle").instanceId,
    ]);
    expect(observe(s.engine).hasKeyword(s.perm("source"), "Jamming")).toBe(false);
    expect(observe(s.engine).hasKeyword(s.perm("source"), "Blocker")).toBe(false);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toEqual([s.inst("evolutionDraw").instanceId]);
    expect(s.state.players[0]!.deck.map((card) => card.instanceId)).toEqual([s.inst("rest").instanceId]);
    expect(s.state.memory).toBe(3);
    await stopLoop(s, loop);
  });

  it("rejects an illegal Red Lv.3 source without paying, stacking, or drawing", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT1-009", as: "wrongSource" }],
        hand: [{ card: "EX7-020", as: "pale" }],
        deck: [
          { card: "BT1-009", as: "evolutionDraw" },
          { card: "BT1-011", as: "rest" },
        ],
        security: SECURITY,
      },
      1: { deck: [...FILLER], security: SECURITY },
    });
    await s.ready();
    s.state.memory = 5;
    const beforeHand = s.state.players[0]!.hand.map((card) => card.instanceId);
    const beforeDeck = s.state.players[0]!.deck.map((card) => card.instanceId);

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("wrongSource").permanentId,
        instanceId: s.inst("pale").instanceId,
      }),
    ).toEqual({ ok: false, reason: "invalid-evolution" });
    expect(s.state.memory).toBe(5);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toEqual(beforeHand);
    expect(s.state.players[0]!.deck.map((card) => card.instanceId)).toEqual(beforeDeck);
    expect(s.perm("wrongSource").topCard?.cardId).toBe("BT1-009");
    expect(s.perm("wrongSource").stack).toHaveLength(0);
  });

  it("trashes the inherited top source once per turn, refuses same-turn reuse, and resets on the next real turn", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT1-039", as: "host", under: [{ card: "EX7-020", as: "inherited" }] }],
          hand: [...FILLER, "BT1-009"],
          deck: [...FILLER],
          security: SECURITY,
        },
        1: {
          battleArea: [
            {
              card: "BT1-009",
              as: "target",
              under: [
                { card: "BT1-010", as: "bottom" },
                { card: "BT1-011", as: "top" },
              ],
            },
          ],
          deck: [...FILLER],
          security: ATTACK_SECURITY,
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    s.state.memory = 3;

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        s.perm("target").stack.length === 1 &&
        s.state.players[0]!.hand.length === 3 &&
        !observe(s.engine).isAttacking() &&
        !s.perm("host").isSuspended,
    );
    expect(s.perm("target").stack.map((card) => card.instanceId)).toEqual([s.inst("bottom").instanceId]);
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        s.perm("target").stack.length === 1 &&
        s.state.players[0]!.hand.length === 0 &&
        !observe(s.engine).isAttacking() &&
        !s.perm("host").isSuspended,
    );
    expect(s.perm("target").stack.map((card) => card.instanceId)).toEqual([s.inst("bottom").instanceId]);

    expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
    await advance(s.engine).waitForMainPhase(1);
    expect(s.engine.applyIntent(1, { type: "endPhase" })).toEqual({ ok: true });
    await advance(s.engine).waitForMainPhase(0);

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("target").stack.length === 0);
    expect(s.perm("target").stack).toHaveLength(0);
    assertNoLoudGap(s);
    await stopLoop(s, loop);
  });
});
