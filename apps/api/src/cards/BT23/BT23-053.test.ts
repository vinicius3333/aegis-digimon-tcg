import { getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { settle, setupEngine } from "../../engine/testkit/harness.js";
import "../index.js";
import { compiled } from "./BT23-053.js";

const DECK = ["BT1-009", "BT1-010", "BT1-011", "BT1-012", "BT1-013", "BT1-014", "BT1-015", "BT1-016"];

describe("BT23-053 Strikedramon", () => {
  it("matches every catalog field and complete compiled clause", () => {
    expect(getCardDefinition("BT23-053")).toMatchObject({
      cardId: "BT23-053",
      nameEn: "Strikedramon",
      colors: ["Black"],
      kinds: ["Digimon"],
      level: 4,
      playCost: 5,
      dp: 5000,
      evoCosts: [{ color: "Black", level: 3, memoryCost: 2 }],
      forms: ["Champion"],
      attributes: ["Vaccine"],
      types: ["Dragonkin", "CS"],
      inheritedEffectText: "[All Turns] This Digimon gets +1000 DP.",
    });
    expect(getCardDefinition("BT23-053")?.effectText).toBe(
      "[Digivolve] Lv.3 w/[CS]\u00a0trait: Cost 2 \n\n[Your Turn] When any of your Option cards are placed in the battle area, this Digimon may digivolve into a Digimon card with [Cyberdramon]\u00a0in its name or the [CS] trait in the hand with the digivolution cost reduced by 2.",
    );
    expect(compiled.digivolutionRequirement).toEqual([{ level: 3, traits: ["CS"], cost: 2, isAlternate: true }]);
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
  });

  it("may digivolve from hand into Cyberdramon or a CS Digimon for 2 less when your Option enters the battle area", () => {
    const effect = (compiled.effects.find((entry) => entry.trigger === "YourTurn") as any).actions[0];
    expect(effect).toMatchObject({
      kind: "SubTrigger",
      event: "whenOptionPlayed",
      sourceFilter: { controller: "mine", kind: ["Option"] },
      actions: [
        {
          kind: "Digivolve",
          target: { filter: { isSelfRef: true, kind: ["Digimon"] }, isSelf: true },
          into: {
            nameOrTrait: [
              { tokens: ["Cyberdramon"], match: "name" },
              { tokens: ["CS"], match: "trait" },
            ],
          },
          from: ["hand"],
          reduceCost: 2,
          payCost: true,
          optional: true,
        },
      ],
    });
  });

  // --- the [Your Turn] Option-placement clause, driven by public intents -------------------

  /**
   * `BT23-100` is a White Option whose printed `[Main]` body draws 1 and then places itself in
   * the battle area, so a plain public `playCard` reaches the option-permanent placement seam
   * (`primitives.placeOptionAsPermanent`) that fires `whenOptionPlayed`. Strikedramon supplies
   * the on-field [CS] Digimon that waives BT23-100's colour requirement.
   */
  it("digivolves into Cyberdramon for exactly 1 when its controller publicly plays an Option", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT23-053", as: "strike" }],
          hand: [
            { card: "BT23-100", as: "option" },
            { card: "BT23-055", as: "cyber" },
            { card: "BT1-020", as: "neutral" },
          ],
          deck: DECK,
        },
        1: { deck: DECK, security: ["BT1-009", "BT1-010", "BT1-011"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true },
    );
    s.state.memory = 10;
    await s.ready();
    const permanentId = s.perm("strike").permanentId;
    const strikeInstanceId = s.perm("strike").topCard.instanceId;
    const cyberInstanceId = s.inst("cyber").instanceId;
    const optionInstanceId = s.inst("option").instanceId;

    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: optionInstanceId })).toEqual({ ok: true });
    await settle(() => s.perm("strike").topCard.cardId === "BT23-055");

    const strike = s.state.players[0]!.battleArea.find((p) => p.permanentId === permanentId);
    expect(strike?.topCard?.instanceId).toBe(cyberInstanceId);
    expect(strike?.stack.at(-1)?.instanceId).toBe(strikeInstanceId);
    // The Option really was placed as its own battle-area permanent (the event this clause watches).
    expect(s.state.players[0]!.battleArea.some((p) => p.topCard?.instanceId === optionInstanceId)).toBe(true);
    // Play cost 3 for the Option, then the printed 3 for Cyberdramon reduced by 2.
    expect(s.state.memory).toBe(10 - 3 - 1);
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("neutral").instanceId)).toBe(true);
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === cyberInstanceId)).toBe(false);
    expect(s.events.some((event) => event.kind === "actionRejected")).toBe(false);

    expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  it("charges the unreduced cost of 3 for the same evolution without an Option placement", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT23-053", as: "strike" }],
          hand: [
            { card: "BT23-055", as: "cyber" },
            { card: "BT1-020", as: "neutral" },
          ],
          deck: DECK,
        },
        1: { deck: DECK },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();
    const permanentId = s.perm("strike").permanentId;
    const cyberInstanceId = s.inst("cyber").instanceId;

    expect(s.engine.applyIntent(0, { type: "digivolve", permanentId, instanceId: cyberInstanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.perm("strike").topCard.cardId === "BT23-055");
    expect(s.state.memory).toBe(10 - 3);
  });

  it("takes the [CS] trait branch into an off-colour CS Digimon for exactly 1", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT23-053", as: "strike" }],
          hand: [
            { card: "BT23-100", as: "option" },
            { card: "BT22-037", as: "chirinmon" },
            { card: "BT1-020", as: "neutral" },
          ],
          deck: DECK,
        },
        1: { deck: DECK, security: ["BT1-009", "BT1-010", "BT1-011"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true },
    );
    s.state.memory = 10;
    await s.ready();
    const permanentId = s.perm("strike").permanentId;
    const strikeInstanceId = s.perm("strike").topCard.instanceId;
    const chirinmonInstanceId = s.inst("chirinmon").instanceId;

    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.perm("strike").topCard.cardId === "BT22-037");

    const strike = s.state.players[0]!.battleArea.find((p) => p.permanentId === permanentId);
    expect(strike?.topCard?.instanceId).toBe(chirinmonInstanceId);
    expect(strike?.stack.at(-1)?.instanceId).toBe(strikeInstanceId);
    // BT22-037 is Yellow: only its alternate "Lv.4 w/[CS] trait: Cost 3" recipe fits a Black
    // Strikedramon, so 1 here also pins that the alternate requirement was the one charged.
    expect(s.state.memory).toBe(10 - 3 - 1);

    expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  it("leaves the board untouched when the controller declines the optional digivolution", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT23-053", as: "strike" }],
          hand: [
            { card: "BT23-100", as: "option" },
            { card: "BT23-055", as: "cyber" },
            { card: "BT1-020", as: "neutral" },
          ],
          deck: DECK,
        },
        1: { deck: DECK, security: ["BT1-009", "BT1-010", "BT1-011"] },
      },
      { autoDeclineOptional: true, autoSelectCards: true, autoChooseOption: true },
    );
    s.state.memory = 10;
    await s.ready();
    const permanentId = s.perm("strike").permanentId;
    const cyberInstanceId = s.inst("cyber").instanceId;

    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.battleArea.some((p) => p.topCard?.cardId === "BT23-100"));

    expect(s.state.players[0]!.battleArea.some((p) => p.topCard?.cardId === "BT23-100")).toBe(true);
    const strike = s.state.players[0]!.battleArea.find((p) => p.permanentId === permanentId);
    expect(strike?.topCard?.cardId).toBe("BT23-053");
    expect(strike?.stack).toHaveLength(0);
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === cyberInstanceId)).toBe(true);
    // Only the Option's own play cost was paid.
    expect(s.state.memory).toBe(10 - 3);

    expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  it("stays put and asks nothing when the hand holds no Cyberdramon-named or CS card", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT23-053", as: "strike" }],
          hand: [
            { card: "BT23-100", as: "option" },
            { card: "BT1-020", as: "neutral" },
          ],
          deck: DECK,
        },
        1: { deck: DECK, security: ["BT1-009", "BT1-010", "BT1-011"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true },
    );
    s.state.memory = 10;
    await s.ready();
    const permanentId = s.perm("strike").permanentId;

    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.battleArea.some((p) => p.topCard?.cardId === "BT23-100"));

    expect(s.state.players[0]!.battleArea.some((p) => p.topCard?.cardId === "BT23-100")).toBe(true);
    const strike = s.state.players[0]!.battleArea.find((p) => p.permanentId === permanentId);
    expect(strike?.topCard?.cardId).toBe("BT23-053");
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("neutral").instanceId)).toBe(true);
    expect(s.state.memory).toBe(10 - 3);
    expect(s.decisions).toHaveLength(0);
    expect(s.events.some((event) => event.kind === "actionRejected")).toBe(false);

    expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  /**
   * The printed clause still digivolves, so the hand card must satisfy a real digivolution
   * requirement. `BT10-025` is a Blue Cyberdramon (Blue Lv.4 only) and `BT22-064` is a Black
   * Lv.6 CS card (Lv.5 only): both match the name/trait filter and neither has a legal route
   * from a Black Lv.4 Strikedramon.
   */
  it("refuses hand cards that match the name or trait but have no legal digivolution route", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT23-053", as: "strike" }],
          hand: [
            { card: "BT23-100", as: "option" },
            { card: "BT10-025", as: "blueCyber" },
            { card: "BT22-064", as: "megaCs" },
            { card: "BT1-020", as: "neutral" },
          ],
          deck: DECK,
        },
        1: { deck: DECK, security: ["BT1-009", "BT1-010", "BT1-011"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true },
    );
    s.state.memory = 10;
    await s.ready();
    const permanentId = s.perm("strike").permanentId;

    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.battleArea.some((p) => p.topCard?.cardId === "BT23-100"));

    expect(s.state.players[0]!.battleArea.some((p) => p.topCard?.cardId === "BT23-100")).toBe(true);
    const strike = s.state.players[0]!.battleArea.find((p) => p.permanentId === permanentId);
    expect(strike?.topCard?.cardId).toBe("BT23-053");
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("blueCyber").instanceId)).toBe(true);
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("megaCs").instanceId)).toBe(true);
    expect(s.state.memory).toBe(10 - 3);

    expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  /**
   * "your Option cards" in isolation. The opponent cannot publicly play an Option during seat
   * 0's turn, so the placement seam is driven directly for an OPPONENT-owned Option while seat
   * 0's Main is open — the one arrangement where only `sourceFilter.controller` can refuse.
   */
  it("ignores an opponent's Option placed while its own controller's Main is open", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT23-053", as: "strike" }],
          hand: [
            { card: "BT23-055", as: "cyber" },
            { card: "BT1-020", as: "neutral" },
          ],
          deck: DECK,
        },
        1: { deck: DECK, hand: [{ card: "BT23-100", as: "option" }], security: ["BT1-009", "BT1-010", "BT1-011"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true },
    );
    s.state.memory = 10;
    await s.ready();
    const permanentId = s.perm("strike").permanentId;

    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    await advance(s.engine).verb.placeOptionAsPermanent(s.inst("option").instanceId);
    await settle(() => s.state.players[1]!.battleArea.some((p) => p.topCard?.cardId === "BT23-100"));

    expect(s.state.turnSeat).toBe(0);
    expect(s.state.players[1]!.battleArea.some((p) => p.topCard?.cardId === "BT23-100")).toBe(true);
    const strike = s.state.players[0]!.battleArea.find((p) => p.permanentId === permanentId);
    expect(strike?.topCard?.cardId).toBe("BT23-053");
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("cyber").instanceId)).toBe(true);
    expect(s.state.memory).toBe(10);

    expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  it("ignores an Option the opponent publicly plays on the opponent's turn", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT23-053", as: "strike" }],
          hand: [
            { card: "BT23-055", as: "cyber" },
            { card: "BT1-020", as: "neutral" },
          ],
          deck: DECK,
        },
        1: {
          battleArea: [{ card: "BT22-053", as: "csAnchor" }],
          hand: [
            { card: "BT23-100", as: "option" },
            { card: "BT1-020", as: "spare" },
          ],
          deck: DECK,
          security: ["BT1-009", "BT1-010", "BT1-011"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true },
    );
    s.state.memory = 10;
    await s.ready();
    const permanentId = s.perm("strike").permanentId;

    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
    await advance(s.engine).waitForMainPhase(1);
    expect(s.engine.applyIntent(1, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[1]!.battleArea.some((p) => p.topCard?.cardId === "BT23-100"));

    expect(s.state.players[1]!.battleArea.some((p) => p.topCard?.cardId === "BT23-100")).toBe(true);
    const strike = s.state.players[0]!.battleArea.find((p) => p.permanentId === permanentId);
    expect(strike?.topCard?.cardId).toBe("BT23-053");
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("cyber").instanceId)).toBe(true);

    expect(s.engine.applyIntent(1, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  /**
   * [Your Turn] boundary. No public intent places a player's own Option during the opponent's
   * turn (BT23-100's placement rides its own [Main] body), so the placement seam is driven
   * directly here; everything else — the turn, the phase, the watcher — is production.
   */
  it("does not fire for its controller's own Option placed during the opponent's turn", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT23-053", as: "strike" }],
          hand: [
            { card: "BT23-100", as: "option" },
            { card: "BT23-055", as: "cyber" },
            { card: "BT1-020", as: "neutral" },
          ],
          deck: DECK,
        },
        1: { deck: DECK, hand: [{ card: "BT1-020", as: "spare" }], security: ["BT1-009", "BT1-010", "BT1-011"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true },
    );
    s.state.memory = 10;
    await s.ready();
    const permanentId = s.perm("strike").permanentId;

    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
    await advance(s.engine).waitForMainPhase(1);
    await advance(s.engine).verb.placeOptionAsPermanent(s.inst("option").instanceId);
    await settle(() => s.state.players[0]!.battleArea.some((p) => p.topCard?.cardId === "BT23-100"));

    // The watched event really happened: the Option is a seat-0 battle-area permanent.
    expect(s.state.players[0]!.battleArea.some((p) => p.topCard?.cardId === "BT23-100")).toBe(true);
    expect(s.state.turnSeat).toBe(1);
    const strike = s.state.players[0]!.battleArea.find((p) => p.permanentId === permanentId);
    expect(strike?.topCard?.cardId).toBe("BT23-053");
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("cyber").instanceId)).toBe(true);

    expect(s.engine.applyIntent(1, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  // --- inherited clause -------------------------------------------------------------------

  it("grants the inherited host +1000 DP on its controller's turn and the opponent's turn", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT23-055", as: "host", under: ["BT23-053"] }],
          hand: [{ card: "BT1-020", as: "neutral" }],
          deck: DECK,
        },
        1: { deck: DECK, hand: [{ card: "BT1-020", as: "spare" }], security: ["BT1-009", "BT1-010", "BT1-011"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();
    const printedDp = getCardDefinition("BT23-055")!.dp!;
    expect(s.perm("host").currentDP).toBe(printedDp + 1000);

    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    expect(s.perm("host").currentDP).toBe(printedDp + 1000);
    expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
    await advance(s.engine).waitForMainPhase(1);
    expect(s.perm("host").currentDP).toBe(printedDp + 1000);

    expect(s.engine.applyIntent(1, { type: "surrender" })).toEqual({ ok: true });
    await loop;

    const effect = compiled.effects.find((entry) => entry.trigger === "AllTurns") as any;
    expect(effect).toMatchObject({
      isInherited: true,
      actions: [
        {
          kind: "ModifyDP",
          amount: 1000,
          duration: "permanent",
          target: { filter: { isSelfRef: true }, isSelf: true },
        },
      ],
    });
  });

  // --- printed digivolution routes onto Strikedramon --------------------------------------

  it("digivolves for 2 from a black level-3 source through the printed colour recipe", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT3-059", as: "base" }], hand: [{ card: "BT23-053", as: "strike" }], deck: DECK },
    });
    s.state.memory = 5;
    await s.ready();
    const permanentId = s.perm("base").permanentId;
    const baseInstanceId = s.perm("base").topCard.instanceId;
    const strikeInstanceId = s.inst("strike").instanceId;

    expect(s.engine.applyIntent(0, { type: "digivolve", permanentId, instanceId: strikeInstanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.perm("base").topCard.cardId === "BT23-053");
    expect(s.perm("base").topCard.instanceId).toBe(strikeInstanceId);
    expect(s.perm("base").stack.at(-1)?.instanceId).toBe(baseInstanceId);
    expect(s.state.memory).toBe(5 - 2);
    // The printed bonus draw for a digivolution.
    expect(s.state.players[0]!.hand).toHaveLength(1);
  });

  it("digivolves for 2 from an off-colour level-3 [CS] source through the alternate recipe", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT22-008", as: "base" }], hand: [{ card: "BT23-053", as: "strike" }], deck: DECK },
    });
    s.state.memory = 5;
    await s.ready();
    const permanentId = s.perm("base").permanentId;
    const baseInstanceId = s.perm("base").topCard.instanceId;
    const strikeInstanceId = s.inst("strike").instanceId;

    expect(s.engine.applyIntent(0, { type: "digivolve", permanentId, instanceId: strikeInstanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.perm("base").topCard.cardId === "BT23-053");
    expect(s.perm("base").topCard.instanceId).toBe(strikeInstanceId);
    expect(s.perm("base").stack.at(-1)?.instanceId).toBe(baseInstanceId);
    expect(s.state.memory).toBe(5 - 2);
  });

  it("rejects an off-colour level-3 source without the [CS] trait", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT1-029", as: "base" }], hand: [{ card: "BT23-053", as: "strike" }], deck: DECK },
    });
    s.state.memory = 5;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("strike").instanceId,
      }),
    ).toEqual({ ok: false, reason: "invalid-evolution" });
    expect(s.perm("base").topCard.cardId).toBe("BT1-029");
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("strike").instanceId)).toBe(true);
    expect(s.state.memory).toBe(5);
  });

  it("rejects a level-4 [CS] source: both recipes are level 3 only", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT23-053", as: "base" }], hand: [{ card: "BT23-053", as: "strike" }], deck: DECK },
    });
    s.state.memory = 5;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("strike").instanceId,
      }),
    ).toEqual({ ok: false, reason: "invalid-evolution" });
    expect(s.state.memory).toBe(5);
  });
});
