import { getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { settle, setupEngine } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "../index.js";
import { compiled } from "./BT23-070.js";

const OPPONENT_DECK = ["BT1-009", "BT1-010", "BT1-011", "BT1-012"];
const OWN_DECK = ["BT1-009", "BT1-010", "BT1-011", "BT1-012"];

describe("BT23-070 Belphemon (X Antibody)", () => {
  it("matches every catalog field and complete compiled clause", () => {
    expect(getCardDefinition("BT23-070")).toMatchObject({
      cardId: "BT23-070",
      nameEn: "Belphemon (X Antibody)",
      colors: ["Purple"],
      kinds: ["Digimon"],
      level: 6,
      playCost: 14,
      dp: 14000,
      evoCosts: [{ color: "Purple", level: 5, memoryCost: 6 }],
      forms: ["Mega"],
      attributes: ["Virus"],
      types: ["Demon Lord", "X Antibody", "Seven Great Demon Lords"],
    });
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
  });

  it("exposes Rush and Piercing through the live keyword seam", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT23-070", as: "belphemon" }] } });
    await s.ready();
    expect(observe(s.engine).hasKeyword(s.perm("belphemon"), "Rush")).toBe(true);
    expect(observe(s.engine).hasPierce(s.perm("belphemon"))).toBe(true);
    expect(
      compiled.effects
        .filter((entry) => entry.trigger === "Static")
        .flatMap((entry) => entry.keywords?.map((keyword) => keyword.keyword)),
    ).toEqual(["Rush", "Piercing"]);
  });

  it("digivolves publicly for 2 off a suspended Belphemon, wipes every highest-level opponent, attacks while suspended and evolves into Sleep Mode for free", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT13-088", as: "belphemon" }],
          hand: [
            { card: "BT23-070", as: "x" },
            { card: "BT1-009", as: "spare" },
          ],
          trash: [{ card: "EX10-021", as: "sleep" }],
          deck: [...OWN_DECK],
          security: ["BT1-009", "BT1-010"],
        },
        1: {
          battleArea: [
            { card: "BT1-080", as: "highA" },
            { card: "ST1-10", as: "highB" },
            { card: "BT1-015", as: "low" },
          ],
          deck: [...OPPONENT_DECK],
          security: ["BT1-009", "BT1-010", "BT1-011"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 3;
    void s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    // Suspend the base publicly, by attacking with it, so the Q5342 proof never writes state
    // directly. The Unsuspend phase has already run, so the suspension survives into the
    // digivolution below.
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("belphemon").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => !observe(s.engine).isAttacking() && s.state.pendingDecision === undefined);
    expect(s.perm("belphemon").isSuspended).toBe(true);
    expect(s.state.players[1]!.security).toHaveLength(2);
    s.state.memory = 3;

    const baseInstanceId = s.perm("belphemon").topCard!.instanceId;
    const highAInstanceId = s.perm("highA").topCard!.instanceId;
    const highBInstanceId = s.perm("highB").topCard!.instanceId;
    const lowPermanentId = s.perm("low").permanentId;
    const sleepInstanceId = s.inst("sleep").instanceId;
    const deckBefore = s.state.players[0]!.deck.length;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("belphemon").permanentId,
        instanceId: s.inst("x").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("belphemon").topCard?.instanceId === sleepInstanceId);

    // Alternate route cost: 2, not the printed EvoCost of 6.
    expect(s.state.memory).toBe(1);
    // Two digivolutions happened (the paid route and the free End of Attack one), each drawing 1.
    expect(s.state.players[0]!.deck).toHaveLength(deckBefore - 2);

    // Delete all of your opponent's Digimon with the highest level: both Lv.6, never the Lv.4.
    expect(s.state.players[1]!.battleArea).toHaveLength(1);
    expect(s.state.players[1]!.battleArea[0]?.permanentId).toBe(lowPermanentId);
    const opponentTrash = s.state.players[1]!.trash.map(({ instanceId }) => instanceId);
    expect(opponentTrash).toContain(highAInstanceId);
    expect(opponentTrash).toContain(highBInstanceId);

    // Q5342: the attack happens even though this Digimon was already suspended, and it stays suspended.
    expect(s.perm("belphemon").isSuspended).toBe(true);
    expect(s.state.players[1]!.security).toHaveLength(1);
    expect(s.events.filter((event) => event.kind === "securityChecked")).toHaveLength(2);

    // End of Attack: digivolve into [Belphemon: Sleep Mode] in the trash, free, requirements ignored.
    expect(s.perm("belphemon").topCard?.cardId).toBe("EX10-021");
    expect(s.perm("belphemon").stack.map(({ instanceId }) => instanceId)).toEqual([
      baseInstanceId,
      s.inst("x").instanceId,
    ]);
    expect(s.state.players[0]!.trash.some(({ instanceId }) => instanceId === sleepInstanceId)).toBe(false);
    expect(observe(s.engine).isAttacking()).toBe(false);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("Q5341: the attack is mandatory even when every optional prompt is declined", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT13-088", as: "belphemon" }],
          hand: [
            { card: "BT23-070", as: "x" },
            { card: "BT1-009", as: "spare" },
          ],
          trash: [{ card: "EX10-021", as: "sleep" }],
          deck: [...OWN_DECK],
          security: ["BT1-009", "BT1-010"],
        },
        1: {
          battleArea: [{ card: "BT1-080", as: "high" }],
          deck: [...OPPONENT_DECK],
          security: ["BT1-009", "BT1-010"],
        },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    s.state.memory = 3;
    void s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    const xInstanceId = s.inst("x").instanceId;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("belphemon").permanentId,
        instanceId: xInstanceId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.security.length === 1);

    expect(s.state.players[1]!.battleArea).toHaveLength(0);
    expect(s.state.players[1]!.security).toHaveLength(1);
    // The optional End of Attack digivolve was refused, so the top card is still this card.
    expect(s.perm("belphemon").topCard?.instanceId).toBe(xInstanceId);
    expect(s.state.players[0]!.trash.some(({ cardId }) => cardId === "EX10-021")).toBe(true);
    expect(s.perm("belphemon").isSuspended).toBe(false);
    expect(observe(s.engine).isAttacking()).toBe(false);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("still deletes on the printed Lv.5 route for 6, but does not attack without a Belphemon in its digivolution cards", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT2-075", as: "myotismon" }],
          hand: [
            { card: "BT23-070", as: "x" },
            { card: "BT1-009", as: "spare" },
          ],
          deck: [...OWN_DECK],
          security: ["BT1-009", "BT1-010"],
        },
        1: {
          battleArea: [
            { card: "BT1-080", as: "high" },
            { card: "BT1-015", as: "low" },
          ],
          deck: [...OPPONENT_DECK],
          security: ["BT1-009", "BT1-010"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 8;
    void s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    const lowPermanentId = s.perm("low").permanentId;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("myotismon").permanentId,
        instanceId: s.inst("x").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.battleArea.length === 1);

    expect(s.state.memory).toBe(2);
    expect(s.state.players[1]!.battleArea[0]?.permanentId).toBe(lowPermanentId);
    expect(s.state.players[1]!.security).toHaveLength(2);
    expect(s.perm("myotismon").isSuspended).toBe(false);
    expect(s.perm("myotismon").topCard?.cardId).toBe("BT23-070");
    expect(s.events.some((event) => event.kind === "securityChecked")).toBe(false);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("requires a level 6 Digimon with [Belphemon] in its name and without the X Antibody trait", async () => {
    expect(compiled.digivolutionRequirement).toEqual([
      { level: 6, names: ["Belphemon"], excludeTraits: ["X Antibody"], cost: 2, isAlternate: true },
    ]);

    // Printed wording is "w/[Belphemon] in name", so substring matching is correct here:
    // "Belphemon: Sleep Mode" is a legal source.
    const substringSource = setupEngine({
      0: { battleArea: [{ card: "BT13-088", as: "base" }], hand: [{ card: "BT23-070", as: "x" }], deck: [...OWN_DECK] },
    });
    substringSource.state.memory = 3;
    await substringSource.ready();
    expect(
      substringSource.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: substringSource.perm("base").permanentId,
        instanceId: substringSource.inst("x").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: true });

    // Excluded trait: another Belphemon (X Antibody) is a level 6 Belphemon but carries the trait.
    const excludedTrait = setupEngine({
      0: { battleArea: [{ card: "BT23-070", as: "base" }], hand: [{ card: "BT23-070", as: "x" }], deck: [...OWN_DECK] },
    });
    excludedTrait.state.memory = 10;
    await excludedTrait.ready();
    expect(
      excludedTrait.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: excludedTrait.perm("base").permanentId,
        instanceId: excludedTrait.inst("x").instanceId,
      }),
    ).toEqual({ ok: false, reason: "invalid-evolution" });

    // Wrong name: a level 6 purple Digimon that is not a Belphemon matches neither route.
    const wrongName = setupEngine({
      0: { battleArea: [{ card: "BT3-089", as: "base" }], hand: [{ card: "BT23-070", as: "x" }], deck: [...OWN_DECK] },
    });
    wrongName.state.memory = 10;
    await wrongName.ready();
    expect(
      wrongName.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: wrongName.perm("base").permanentId,
        instanceId: wrongName.inst("x").instanceId,
      }),
    ).toEqual({ ok: false, reason: "invalid-evolution" });
  });

  it("leaves [Belphemon: Rage Mode] in the trash — the End of Attack destination is an exact name", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT13-088", as: "belphemon" }],
          hand: [
            { card: "BT23-070", as: "x" },
            { card: "BT1-009", as: "spare" },
          ],
          trash: [{ card: "BT13-091", as: "rage" }],
          deck: [...OWN_DECK],
          security: ["BT1-009", "BT1-010"],
        },
        1: {
          battleArea: [{ card: "BT1-080", as: "high" }],
          deck: [...OPPONENT_DECK],
          security: ["BT1-009", "BT1-010"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 3;
    void s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    const xInstanceId = s.inst("x").instanceId;
    const rageInstanceId = s.inst("rage").instanceId;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("belphemon").permanentId,
        instanceId: xInstanceId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: true });
    await settle(() => !observe(s.engine).isAttacking() && s.state.pendingDecision === undefined);

    // The attack happened, so the [End of Attack] clause was reached — and still took nothing.
    expect(s.state.players[1]!.security).toHaveLength(1);
    expect(s.perm("belphemon").topCard?.instanceId).toBe(xInstanceId);
    expect(s.state.players[0]!.trash.some(({ instanceId }) => instanceId === rageInstanceId)).toBe(true);
  });

  it("deletes all opposing highest-level Digimon and attacks without suspending when Belphemon is in its stack", () => {
    const actions = (compiled.effects.find((entry) => entry.trigger === "WhenDigivolving") as any).actions;
    expect(actions[0]).toMatchObject({
      kind: "Delete",
      target: { filter: { controller: "opponent", kind: ["Digimon"], superlative: "highestLevel" }, count: "all" },
    });
    expect(actions[1]).toMatchObject({
      kind: "Attack",
      withoutSuspending: true,
      mandatory: true,
      condition: { kind: "selfDigivolutionStackHasTrait" },
    });
    // "attacks without suspending" is not a RestrictionKind, so a Restrict carrying it would
    // install a dead continuous restriction. The Attack action's `withoutSuspending` is the seam.
    expect(actions).toHaveLength(2);
  });

  it("can digivolve into Belphemon: Sleep Mode from trash after attacking", () => {
    const action = (compiled.effects.find((entry) => entry.trigger === "EndOfAttack") as any).actions[0];
    expect(action).toMatchObject({
      kind: "Digivolve",
      from: ["trash"],
      payCost: false,
      ignoreRequirements: true,
      optional: true,
      // Bracket-only reference: exact name (comprehensive rules 2-3-1-2), not a substring.
      into: { nameOrTrait: [{ tokens: ["Belphemon: Sleep Mode"], match: "nameExact" }] },
    });
  });
});
