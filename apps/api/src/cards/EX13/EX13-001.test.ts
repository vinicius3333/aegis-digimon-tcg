import { getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { settle, setupEngine } from "../../engine/testkit/harness.js";
import "../index.js";
import { compiled } from "./EX13-001.js";

const DECK = ["BT1-009", "BT1-010", "BT1-011", "BT1-012", "BT1-013", "BT1-014", "BT1-015", "BT1-016"];
const SECURITY = ["BT1-009", "BT1-010", "BT1-011"];

describe("EX13-001 Gigimon", () => {
  it("matches every catalog field and the complete compiled clause", () => {
    expect(getCardDefinition("EX13-001")).toMatchObject({
      cardId: "EX13-001",
      set: "EX13",
      nameEn: "Gigimon",
      colors: ["Red"],
      kinds: ["DigiEgg"],
      playCost: -1,
      dp: 0,
      evoCosts: [],
      rarity: "U",
      maxCountInDeck: 4,
    });
    expect(getCardDefinition("EX13-001")?.effectText).toBeUndefined();
    expect(getCardDefinition("EX13-001")?.securityEffectText).toBeUndefined();
    expect(getCardDefinition("EX13-001")?.inheritedEffectText).toBe(
      "[Your Turn] [Once Per Turn] When any of your red Tamers are played, this Digimon may digivolve into a Digimon card with [Growlmon] or [Gallantmon] in its name in the hand with the cost reduced by 2.",
    );

    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
    expect(compiled.effects).toHaveLength(1);
    expect(compiled.effects[0]).toMatchObject({
      trigger: "YourTurn",
      isInherited: true,
      frequency: "OncePerTurn",
      actions: [
        {
          kind: "SubTrigger",
          event: "whenPlayed",
          sourceFilter: { controller: "mine", kind: ["Tamer"], colors: ["Red"] },
          actions: [
            {
              kind: "Digivolve",
              target: { filter: { isSelfRef: true, kind: ["Digimon"] }, count: 1, isSelf: true },
              into: {
                controllerDefault: "mine",
                kind: ["Digimon"],
                nameOrTrait: [
                  { tokens: ["Growlmon"], match: "name" },
                  { tokens: ["Gallantmon"], match: "name" },
                ],
              },
              from: ["hand"],
              payCost: true,
              reduceCost: 2,
              optional: true,
            },
          ],
        },
      ],
    });
  });

  // --- the printed clause, driven by public intents --------------------------------------

  /**
   * `BT1-009` Monodramon is an inert red Lv.3 host carrying Gigimon as its only digivolution
   * card — the shape a hatched Digi-Egg really has. `BT2-084` Sora Takenouchi is a mono-red
   * Tamer with no play-time body, so the only observable consequence of playing it is this
   * inherited clause. `ST7-05` Growlmon's printed red Lv.3 route costs 2, so the reduction
   * lands it at exactly 0.
   */
  it("digivolves the host into a [Growlmon] card from hand for 2 less when a red Tamer is played", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT1-009", as: "host", under: ["EX13-001"] }],
          hand: [
            { card: "BT2-084", as: "tamer" },
            { card: "ST7-05", as: "growlmon" },
            { card: "BT1-020", as: "spare" },
          ],
          deck: DECK,
        },
        1: { deck: DECK, security: SECURITY },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true },
    );
    s.state.memory = 10;
    await s.ready();
    const permanentId = s.perm("host").permanentId;
    const hostInstanceId = s.perm("host").topCard.instanceId;
    const eggInstanceId = s.perm("host").stack[0]!.instanceId;
    const growlmonInstanceId = s.inst("growlmon").instanceId;
    const tamerInstanceId = s.inst("tamer").instanceId;

    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: tamerInstanceId })).toEqual({ ok: true });
    await settle(() => s.perm("host").topCard.cardId === "ST7-05");

    const host = s.state.players[0]!.battleArea.find((p) => p.permanentId === permanentId);
    expect(host?.topCard?.instanceId).toBe(growlmonInstanceId);
    // `Permanent.stack` holds only the cards beneath the top card, bottom-most first.
    expect(host?.stack.map((card) => card.instanceId)).toEqual([eggInstanceId, hostInstanceId]);
    expect(host?.stack[0]?.cardId).toBe("EX13-001");
    // The Tamer really was played as its own permanent — the event this clause watches.
    expect(s.state.players[0]!.battleArea.some((p) => p.topCard?.instanceId === tamerInstanceId)).toBe(true);
    // Sora costs 3; Growlmon's printed red Lv.3 cost of 2 is reduced by 2 to 0.
    expect(s.state.memory).toBe(10 - 3 - 0);
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === growlmonInstanceId)).toBe(false);
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("spare").instanceId)).toBe(true);
    expect(s.state.players[0]!.hand).toHaveLength(2); // the spare plus the digivolution bonus draw
    expect(s.events.some((event) => event.kind === "actionRejected")).toBe(false);

    expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  it("charges the unreduced cost of 2 for the same evolution with no Tamer played", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT1-009", as: "host", under: ["EX13-001"] }],
          hand: [
            { card: "ST7-05", as: "growlmon" },
            { card: "BT1-020", as: "spare" },
          ],
          deck: DECK,
        },
        1: { deck: DECK, security: SECURITY },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();
    const permanentId = s.perm("host").permanentId;

    expect(
      s.engine.applyIntent(0, { type: "digivolve", permanentId, instanceId: s.inst("growlmon").instanceId }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("host").topCard.cardId === "ST7-05");
    expect(s.state.memory).toBe(10 - 2);
  });

  /**
   * The [Gallantmon] half of the name filter, on the smallest legal stack that reaches it:
   * a red Lv.5 host over Gigimon. `ST7-09` Gallantmon's printed red Lv.5 route costs 3, so
   * the reduction lands it at exactly 1 — the amount, not just the fact, of the discount.
   */
  it("takes the [Gallantmon] branch and charges exactly 1 of the printed 3", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT1-020", as: "host", under: ["EX13-001"] }],
          hand: [
            { card: "BT2-084", as: "tamer" },
            { card: "ST7-09", as: "gallantmon" },
            { card: "BT1-009", as: "spare" },
          ],
          deck: DECK,
        },
        1: { deck: DECK, security: SECURITY },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true },
    );
    s.state.memory = 10;
    await s.ready();
    const permanentId = s.perm("host").permanentId;
    const hostInstanceId = s.perm("host").topCard.instanceId;
    const eggInstanceId = s.perm("host").stack[0]!.instanceId;
    const gallantmonInstanceId = s.inst("gallantmon").instanceId;

    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("tamer").instanceId })).toEqual({ ok: true });
    await settle(() => s.perm("host").topCard.cardId === "ST7-09");

    const host = s.state.players[0]!.battleArea.find((p) => p.permanentId === permanentId);
    expect(host?.topCard?.instanceId).toBe(gallantmonInstanceId);
    expect(host?.stack.map((card) => card.instanceId)).toEqual([eggInstanceId, hostInstanceId]);
    expect(s.state.memory).toBe(10 - 3 - 1);
    expect(s.events.some((event) => event.kind === "actionRejected")).toBe(false);

    expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  /**
   * The name filter has to DISCRIMINATE, not merely fire. `BT1-015` Greymon is a red Lv.4
   * card whose printed Lv.3 route from this very host is legal and costs 2 — the only thing
   * wrong with it is its name — so an over-broad `into` filter would grab it here.
   */
  it("ignores a legal-to-digivolve hand card whose name is neither Growlmon nor Gallantmon", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT1-009", as: "host", under: ["EX13-001"] }],
          hand: [
            { card: "BT2-084", as: "tamer" },
            { card: "BT1-015", as: "greymon" },
            { card: "BT1-020", as: "spare" },
          ],
          deck: DECK,
        },
        1: { deck: DECK, security: SECURITY },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true },
    );
    s.state.memory = 10;
    await s.ready();
    const permanentId = s.perm("host").permanentId;

    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("tamer").instanceId })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some((p) => p.topCard?.cardId === "BT2-084"));

    const host = s.state.players[0]!.battleArea.find((p) => p.permanentId === permanentId);
    expect(host?.topCard?.cardId).toBe("BT1-009");
    expect(host?.stack).toHaveLength(1);
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("greymon").instanceId)).toBe(true);
    expect(s.state.memory).toBe(10 - 3);
    expect(s.decisions).toHaveLength(0);
    expect(s.events.some((event) => event.kind === "actionRejected")).toBe(false);

    expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  it("ignores a matching Growlmon that sits in the trash instead of the hand", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT1-009", as: "host", under: ["EX13-001"] }],
          hand: [
            { card: "BT2-084", as: "tamer" },
            { card: "BT1-020", as: "spare" },
          ],
          trash: [{ card: "ST7-05", as: "growlmon" }],
          deck: DECK,
        },
        1: { deck: DECK, security: SECURITY },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true },
    );
    s.state.memory = 10;
    await s.ready();
    const permanentId = s.perm("host").permanentId;

    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("tamer").instanceId })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some((p) => p.topCard?.cardId === "BT2-084"));

    const host = s.state.players[0]!.battleArea.find((p) => p.permanentId === permanentId);
    expect(host?.topCard?.cardId).toBe("BT1-009");
    expect(s.state.players[0]!.trash.some((card) => card.instanceId === s.inst("growlmon").instanceId)).toBe(true);
    expect(s.state.memory).toBe(10 - 3);
    expect(s.decisions).toHaveLength(0);

    expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  it("does not fire for a non-red Tamer", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT1-009", as: "host", under: ["EX13-001"] }],
          hand: [
            { card: "BT1-086", as: "blueTamer" },
            { card: "ST7-05", as: "growlmon" },
            { card: "BT1-020", as: "spare" },
          ],
          deck: DECK,
        },
        1: { deck: DECK, security: SECURITY },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true },
    );
    s.state.memory = 10;
    await s.ready();
    const permanentId = s.perm("host").permanentId;

    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("blueTamer").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.battleArea.some((p) => p.topCard?.cardId === "BT1-086"));

    const host = s.state.players[0]!.battleArea.find((p) => p.permanentId === permanentId);
    expect(host?.topCard?.cardId).toBe("BT1-009");
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("growlmon").instanceId)).toBe(true);
    expect(s.state.memory).toBe(10 - 4);
    expect(s.decisions).toHaveLength(0);

    expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  it("does not fire for a red Digimon (not a Tamer) being played", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT1-009", as: "host", under: ["EX13-001"] }],
          hand: [
            { card: "BT1-013", as: "redDigimon" },
            { card: "ST7-05", as: "growlmon" },
            { card: "BT1-020", as: "spare" },
          ],
          deck: DECK,
        },
        1: { deck: DECK, security: SECURITY },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true },
    );
    s.state.memory = 10;
    await s.ready();
    const permanentId = s.perm("host").permanentId;

    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("redDigimon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.battleArea.some((p) => p.topCard?.cardId === "BT1-013"));

    const host = s.state.players[0]!.battleArea.find((p) => p.permanentId === permanentId);
    expect(host?.topCard?.cardId).toBe("BT1-009");
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("growlmon").instanceId)).toBe(true);
    expect(s.decisions).toHaveLength(0);

    expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  it("does not fire for the opponent's red Tamer played on the opponent's turn", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT1-009", as: "host", under: ["EX13-001"] }],
          hand: [
            { card: "ST7-05", as: "growlmon" },
            { card: "BT1-020", as: "spare" },
          ],
          deck: DECK,
        },
        1: {
          hand: [
            { card: "BT2-084", as: "tamer" },
            { card: "BT1-020", as: "oppSpare" },
          ],
          deck: DECK,
          security: SECURITY,
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true },
    );
    s.state.memory = 10;
    await s.ready();
    const permanentId = s.perm("host").permanentId;

    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
    await advance(s.engine).waitForMainPhase(1);
    expect(s.engine.applyIntent(1, { type: "playCard", instanceId: s.inst("tamer").instanceId })).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.battleArea.some((p) => p.topCard?.cardId === "BT2-084"));

    expect(s.state.turnSeat).toBe(1);
    const host = s.state.players[0]!.battleArea.find((p) => p.permanentId === permanentId);
    expect(host?.topCard?.cardId).toBe("BT1-009");
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("growlmon").instanceId)).toBe(true);
    expect(s.decisions).toHaveLength(0);

    expect(s.engine.applyIntent(1, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  /**
   * "YOUR red Tamers" in isolation: the opponent's red Tamer, played during this clause's
   * own turn. `BT2-084`'s [Security] clause is again the public route — seat 0 attacks, and
   * seat 1's security Tamer is played while seat 0 still holds the turn, so the [Your Turn]
   * gate is satisfied and only `sourceFilter.controller` can refuse.
   */
  it("does not fire for the opponent's red Tamer played from security during its own turn", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT1-009", as: "host", under: ["EX13-001"] },
            { card: "BT1-024", as: "attacker" },
          ],
          hand: [
            { card: "ST7-05", as: "growlmon" },
            { card: "BT1-020", as: "spare" },
          ],
          deck: DECK,
          security: SECURITY,
        },
        1: { deck: DECK, security: ["BT2-084"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true },
    );
    s.state.memory = 10;
    await s.ready();
    const permanentId = s.perm("host").permanentId;

    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.battleArea.some((p) => p.topCard?.cardId === "BT2-084"));

    expect(s.state.turnSeat).toBe(0);
    // The watched event really happened, on the opponent's side of the board.
    expect(s.state.players[1]!.battleArea.some((p) => p.topCard?.cardId === "BT2-084")).toBe(true);
    const host = s.state.players[0]!.battleArea.find((p) => p.permanentId === permanentId);
    expect(host?.topCard?.cardId).toBe("BT1-009");
    expect(host?.stack).toHaveLength(1);
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("growlmon").instanceId)).toBe(true);

    expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  /**
   * The [Your Turn] boundary, on the one public route that plays a card during the
   * OPPONENT's turn: `BT2-084` Sora Takenouchi's printed "[Security] Play this card without
   * paying its memory cost". The Tamer really is played, by this clause's own controller,
   * while the opponent holds the turn — so only the [Your Turn] gate can refuse here.
   */
  it("does not fire for its controller's own red Tamer played from security on the opponent's turn", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT1-009", as: "host", under: ["EX13-001"] }],
          hand: [
            { card: "ST7-05", as: "growlmon" },
            { card: "BT1-020", as: "spare" },
          ],
          deck: DECK,
          security: ["BT2-084"],
        },
        1: {
          battleArea: [{ card: "BT1-024", as: "attacker" }],
          hand: [{ card: "BT1-020", as: "oppSpare" }],
          deck: DECK,
          security: SECURITY,
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true },
    );
    s.state.memory = 10;
    await s.ready();
    const permanentId = s.perm("host").permanentId;

    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
    await advance(s.engine).waitForMainPhase(1);
    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some((p) => p.topCard?.cardId === "BT2-084"));

    expect(s.state.turnSeat).toBe(1);
    // The watched event really happened: seat 0's red Tamer is on seat 0's battle area.
    expect(s.state.players[0]!.battleArea.some((p) => p.topCard?.cardId === "BT2-084")).toBe(true);
    const host = s.state.players[0]!.battleArea.find((p) => p.permanentId === permanentId);
    expect(host?.topCard?.cardId).toBe("BT1-009");
    expect(host?.stack).toHaveLength(1);
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("growlmon").instanceId)).toBe(true);

    expect(s.engine.applyIntent(1, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  it("leaves the board untouched when the controller declines the optional digivolution", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT1-009", as: "host", under: ["EX13-001"] }],
          hand: [
            { card: "BT2-084", as: "tamer" },
            { card: "ST7-05", as: "growlmon" },
            { card: "BT1-020", as: "spare" },
          ],
          deck: DECK,
        },
        1: { deck: DECK, security: SECURITY },
      },
      { autoDeclineOptional: true, autoSelectCards: true, autoChooseOption: true },
    );
    s.state.memory = 10;
    await s.ready();
    const permanentId = s.perm("host").permanentId;

    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("tamer").instanceId })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some((p) => p.topCard?.cardId === "BT2-084"));

    const host = s.state.players[0]!.battleArea.find((p) => p.permanentId === permanentId);
    expect(host?.topCard?.cardId).toBe("BT1-009");
    expect(host?.stack).toHaveLength(1);
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("growlmon").instanceId)).toBe(true);
    // Only the Tamer's own play cost was paid.
    expect(s.state.memory).toBe(10 - 3);

    expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  /**
   * The clause is inherited: it must come from Gigimon sitting in the digivolution cards,
   * not from the host card. The same board without the egg underneath must do nothing.
   */
  it("does nothing when Gigimon is not among the host's digivolution cards", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT1-009", as: "host" }],
          hand: [
            { card: "BT2-084", as: "tamer" },
            { card: "ST7-05", as: "growlmon" },
            { card: "BT1-020", as: "spare" },
          ],
          deck: DECK,
        },
        1: { deck: DECK, security: SECURITY },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true },
    );
    s.state.memory = 10;
    await s.ready();
    const permanentId = s.perm("host").permanentId;

    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("tamer").instanceId })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some((p) => p.topCard?.cardId === "BT2-084"));

    const host = s.state.players[0]!.battleArea.find((p) => p.permanentId === permanentId);
    expect(host?.topCard?.cardId).toBe("BT1-009");
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("growlmon").instanceId)).toBe(true);
    expect(s.state.memory).toBe(10 - 3);
    expect(s.decisions).toHaveLength(0);

    expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  /**
   * [Once Per Turn] through the real turn loop: a second red Tamer in the same turn is
   * refused, and the counter resets on the controller's NEXT own turn. `ST7-08` WarGrowlmon
   * doubles as the substring proof — "[Growlmon] in its name" really is a substring match.
   */
  it("fires once per turn and resets on its controller's next turn", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT1-009", as: "host", under: ["EX13-001"] }],
          hand: [
            { card: "BT2-084", as: "tamer1" },
            { card: "BT2-084", as: "tamer2" },
            { card: "BT2-084", as: "tamer3" },
            { card: "ST7-05", as: "growlmon" },
            { card: "ST7-08", as: "warGrowlmon" },
            { card: "BT1-020", as: "spare" },
          ],
          deck: DECK,
        },
        1: { deck: DECK, hand: [{ card: "BT1-020", as: "oppSpare" }], security: SECURITY },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true },
    );
    s.state.memory = 10;
    await s.ready();
    const permanentId = s.perm("host").permanentId;
    const hostInstanceId = s.perm("host").topCard.instanceId;
    const eggInstanceId = s.perm("host").stack[0]!.instanceId;
    const growlmonInstanceId = s.inst("growlmon").instanceId;
    const warGrowlmonInstanceId = s.inst("warGrowlmon").instanceId;

    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);

    // First red Tamer: the clause fires.
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("tamer1").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.perm("host").topCard.cardId === "ST7-05");
    expect(s.perm("host").topCard.instanceId).toBe(growlmonInstanceId);

    // Second red Tamer, same turn: refused by [Once Per Turn]. WarGrowlmon is a legal and
    // name-matching destination from the Lv.4 Growlmon now on top, so only the frequency
    // gate can be what keeps it in hand.
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("tamer2").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.battleArea.filter((p) => p.topCard?.cardId === "BT2-084").length === 2);
    expect(s.perm("host").topCard.instanceId).toBe(growlmonInstanceId);
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === warGrowlmonInstanceId)).toBe(true);

    // Round the turn loop back to this controller's own next turn.
    expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
    await advance(s.engine).waitForMainPhase(1);
    expect(s.engine.applyIntent(1, { type: "endPhase" })).toEqual({ ok: true });
    await advance(s.engine).waitForMainPhase(0);
    s.state.memory = 10;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("tamer3").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.perm("host").topCard.cardId === "ST7-08");

    const host = s.state.players[0]!.battleArea.find((p) => p.permanentId === permanentId);
    expect(host?.topCard?.instanceId).toBe(warGrowlmonInstanceId);
    expect(host?.stack.map((card) => card.instanceId)).toEqual([eggInstanceId, hostInstanceId, growlmonInstanceId]);
    // Gigimon stays at the bottom of the stack, so the clause is still inherited.
    expect(host?.stack[0]?.cardId).toBe("EX13-001");
    // Sora costs 3; WarGrowlmon's printed red Lv.4 cost of 3 is reduced by 2 to 1.
    expect(s.state.memory).toBe(10 - 3 - 1);
    expect(s.events.some((event) => event.kind === "actionRejected")).toBe(false);

    expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  /**
   * The printed clause still digivolves, so the hand card must satisfy a real digivolution
   * requirement. `ST7-09` Gallantmon needs a red Lv.5 base and `ST7-08` WarGrowlmon a red
   * Lv.4 one: both match the name filter and neither has a legal route from a red Lv.3 host.
   */
  it("refuses name-matching hand cards that have no legal digivolution route from the host", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT1-009", as: "host", under: ["EX13-001"] }],
          hand: [
            { card: "BT2-084", as: "tamer" },
            { card: "ST7-09", as: "gallantmon" },
            { card: "ST7-08", as: "warGrowlmon" },
            { card: "BT1-020", as: "spare" },
          ],
          deck: DECK,
        },
        1: { deck: DECK, security: SECURITY },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true },
    );
    s.state.memory = 10;
    await s.ready();
    const permanentId = s.perm("host").permanentId;

    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("tamer").instanceId })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some((p) => p.topCard?.cardId === "BT2-084"));

    const host = s.state.players[0]!.battleArea.find((p) => p.permanentId === permanentId);
    expect(host?.topCard?.cardId).toBe("BT1-009");
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("gallantmon").instanceId)).toBe(true);
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("warGrowlmon").instanceId)).toBe(true);
    expect(s.state.memory).toBe(10 - 3);

    expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });
});
