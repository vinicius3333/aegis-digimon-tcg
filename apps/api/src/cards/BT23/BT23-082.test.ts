import { getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { settle, setupEngine } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "../index.js";
import { compiled } from "./BT23-082.js";

const NEUTRAL_SECURITY = ["BT1-009", "BT1-010", "BT1-011"];

describe("BT23-082 Makiko Date", () => {
  it("matches every catalog field and printed text", () => {
    expect(getCardDefinition("BT23-082")).toMatchObject({
      cardId: "BT23-082",
      nameEn: "Makiko Date",
      colors: ["Yellow"],
      kinds: ["Tamer"],
      playCost: 3,
      types: ["CS"],
      effectText:
        "[Start of Your Main Phase] If your opponent has a Digimon, gain 1 memory.\n" +
        "[Your Turn] When any of your Digimon digivolve into a Digimon with the [Beastkin], [Holy Beast], [Cherub] " +
        "or [CS]\u00a0trait, by returning this Tamer to the hand, you may play 1 [Lopmon] or level 3 Digimon card with " +
        "the [CS]\u00a0trait from your hand without paying the cost.",
      securityEffectText: "[Security] Play this card without paying the cost.",
    });
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
  });

  it("compiles the bracketed [Lopmon] reference as an exact-name match", () => {
    type NameRef = { tokens: string[]; match: string };
    type PlayAction = { target: { filter: { nameOrTrait: NameRef[] }; orFilters: { levels: number[] }[] } };
    type Watcher = { actions: PlayAction[] };
    const yourTurn = compiled.effects.find((entry) => entry.trigger === "YourTurn") as unknown as {
      actions: Watcher[];
    };
    const play = yourTurn.actions[0]!.actions[0]!;
    expect(play.target.filter.nameOrTrait).toEqual([{ tokens: ["Lopmon"], match: "nameExact" }]);
    expect(play.target.orFilters[0]!.levels).toEqual([3]);
  });

  it("gains 1 memory at the start of its controller's main phase while the opponent has a Digimon", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT23-082", as: "makiko" }],
        hand: [{ card: "BT1-009", as: "neutral" }],
        deck: ["BT1-010", "BT1-011", "BT1-012"],
        security: NEUTRAL_SECURITY,
      },
      1: {
        battleArea: [{ card: "BT1-024", as: "opponentDigimon" }],
        deck: ["BT1-013", "BT1-014"],
        security: NEUTRAL_SECURITY,
      },
    });
    s.state.memory = 0;

    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);

    expect(s.state.memory).toBe(1);
    expect(s.state.pendingDecision).toBeUndefined();
    expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  it("gains no memory when the opponent controls no Digimon", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT23-082", as: "makiko" }],
        hand: [{ card: "BT1-009", as: "neutral" }],
        deck: ["BT1-010", "BT1-011", "BT1-012"],
        security: NEUTRAL_SECURITY,
      },
      1: {
        deck: ["BT1-013", "BT1-014"],
        security: NEUTRAL_SECURITY,
      },
    });
    s.state.memory = 0;

    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);

    expect(s.state.memory).toBe(0);
    expect(s.state.pendingDecision).toBeUndefined();
    expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  it("stays silent at the opponent's own start of main phase", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "BT23-082", as: "makiko" },
          { card: "BT1-009", as: "ownDigimon" },
        ],
        hand: [{ card: "BT1-009", as: "neutral" }],
        deck: ["BT1-010", "BT1-011", "BT1-012"],
        security: NEUTRAL_SECURITY,
      },
      1: {
        battleArea: [{ card: "BT1-024", as: "opponentDigimon" }],
        hand: [{ card: "BT1-010", as: "opponentNeutral" }],
        deck: ["BT1-013", "BT1-014", "BT1-011"],
        security: NEUTRAL_SECURITY,
      },
    });
    s.state.memory = 0;

    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    expect(s.state.memory).toBe(1);
    expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
    await advance(s.engine).waitForMainPhase(1);

    // Passing the turn hands seat 1 the minimum 3 memory. A gain for seat 0 would show up
    // here as 2, so the exact 3 proves the Tamer stayed silent on the opponent's turn.
    expect(s.state.memory).toBe(3);
    expect(s.state.players[0]!.battleArea.some((perm) => perm.topCard?.cardId === "BT23-082")).toBe(true);
    expect(s.state.pendingDecision).toBeUndefined();
    expect(s.engine.applyIntent(1, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  it("returns itself to the hand to play a [Lopmon] for free after a CS digivolution", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT23-082", as: "makiko" },
            { card: "BT1-047", as: "base" },
          ],
          hand: [
            { card: "BT23-041", as: "evolution" },
            { card: "ST10-03", as: "lopmon" },
          ],
          deck: ["BT1-010", "BT1-011"],
          security: NEUTRAL_SECURITY,
        },
        1: { deck: ["BT1-013"], security: NEUTRAL_SECURITY },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 3;
    await s.ready();
    const makikoId = s.inst("makiko").instanceId;
    const lopmonId = s.inst("lopmon").instanceId;
    const baseId = s.perm("base").topCard!.instanceId;
    const drawnId = s.state.players[0]!.deck[0]!.instanceId;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("evolution").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some((perm) => perm.topCard?.instanceId === lopmonId));

    expect(s.perm("base").topCard?.cardId).toBe("BT23-041");
    expect(s.perm("base").stack.map((card) => card.instanceId)).toEqual([baseId]);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toEqual([drawnId, makikoId]);
    expect(s.state.players[0]!.battleArea.some((perm) => perm.topCard?.instanceId === makikoId)).toBe(false);
    expect(s.state.players[0]!.battleArea.some((perm) => perm.topCard?.instanceId === lopmonId)).toBe(true);
    // Only the digivolution cost of 3 was paid: the played Lopmon costs nothing.
    expect(s.state.memory).toBe(0);
    expect(s.state.pendingDecision).toBeUndefined();
    expect(observe(s.engine).isAttacking()).toBe(false);
  });

  it("keeps the Tamer on the board and the card in hand when the option is declined", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT23-082", as: "makiko" },
            { card: "BT1-047", as: "base" },
          ],
          hand: [
            { card: "BT23-041", as: "evolution" },
            { card: "ST10-03", as: "lopmon" },
          ],
          deck: ["BT1-010", "BT1-011"],
          security: NEUTRAL_SECURITY,
        },
        1: { deck: ["BT1-013"], security: NEUTRAL_SECURITY },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    s.state.memory = 3;
    await s.ready();
    const makikoPermanentId = s.perm("makiko").permanentId;
    const lopmonId = s.inst("lopmon").instanceId;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("evolution").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard?.cardId === "BT23-041" && s.state.pendingDecision === undefined);

    expect(s.state.players[0]!.battleArea.some((perm) => perm.permanentId === makikoPermanentId)).toBe(true);
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === lopmonId)).toBe(true);
    expect(s.state.players[0]!.hand.some((card) => card.cardId === "BT23-082")).toBe(false);
    expect(s.state.memory).toBe(0);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("plays a level 3 Digimon with the [CS] trait and leaves an unrelated level 3 in hand", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT23-082", as: "makiko" },
            { card: "BT1-047", as: "base" },
          ],
          hand: [
            { card: "BT23-041", as: "evolution" },
            { card: "BT22-043", as: "level3Cs" },
            { card: "BT1-009", as: "ineligible" },
          ],
          deck: ["BT1-010", "BT1-011"],
          security: NEUTRAL_SECURITY,
        },
        1: { deck: ["BT1-013"], security: NEUTRAL_SECURITY },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 3;
    await s.ready();
    const eligibleId = s.inst("level3Cs").instanceId;
    const ineligibleId = s.inst("ineligible").instanceId;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("evolution").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some((perm) => perm.topCard?.instanceId === eligibleId));

    expect(s.state.players[0]!.battleArea.some((perm) => perm.topCard?.instanceId === eligibleId)).toBe(true);
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === ineligibleId)).toBe(true);
    expect(s.state.players[0]!.hand.some((card) => card.cardId === "BT23-082")).toBe(true);
    expect(s.state.memory).toBe(0);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("refuses a level 4 [CS] Digimon: only level 3 qualifies through the trait branch", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT23-082", as: "makiko" },
            { card: "BT1-047", as: "base" },
          ],
          hand: [
            { card: "BT23-041", as: "evolution" },
            { card: "BT23-018", as: "level4Cs" },
          ],
          deck: ["BT1-010", "BT1-011"],
          security: NEUTRAL_SECURITY,
        },
        1: { deck: ["BT1-013"], security: NEUTRAL_SECURITY },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 3;
    await s.ready();
    const makikoPermanentId = s.perm("makiko").permanentId;
    const level4Id = s.inst("level4Cs").instanceId;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("evolution").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard?.cardId === "BT23-041" && s.state.pendingDecision === undefined);

    expect(s.state.players[0]!.hand.some((card) => card.instanceId === level4Id)).toBe(true);
    expect(s.state.players[0]!.battleArea.some((perm) => perm.permanentId === makikoPermanentId)).toBe(true);
    expect(s.state.players[0]!.hand.some((card) => card.cardId === "BT23-082")).toBe(false);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("refuses [Lopmon (X Antibody)]: the bracketed name is exact, not a substring", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT23-082", as: "makiko" },
            { card: "BT1-047", as: "base" },
          ],
          hand: [
            { card: "BT23-041", as: "evolution" },
            { card: "BT16-067", as: "nearName" },
          ],
          deck: ["BT1-010", "BT1-011"],
          security: NEUTRAL_SECURITY,
        },
        1: { deck: ["BT1-013"], security: NEUTRAL_SECURITY },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 3;
    await s.ready();
    const makikoPermanentId = s.perm("makiko").permanentId;
    const nearNameId = s.inst("nearName").instanceId;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("evolution").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard?.cardId === "BT23-041" && s.state.pendingDecision === undefined);

    expect(s.state.players[0]!.hand.some((card) => card.instanceId === nearNameId)).toBe(true);
    expect(s.state.players[0]!.battleArea.some((perm) => perm.topCard?.instanceId === nearNameId)).toBe(false);
    expect(s.state.players[0]!.battleArea.some((perm) => perm.permanentId === makikoPermanentId)).toBe(true);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("does not fire for a digivolution into a Digimon without a listed trait", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT23-082", as: "makiko" },
            { card: "BT1-047", as: "base" },
          ],
          hand: [
            { card: "BT5-038", as: "plainEvolution" },
            { card: "ST10-03", as: "lopmon" },
          ],
          deck: ["BT1-010", "BT1-011"],
          security: NEUTRAL_SECURITY,
        },
        1: { deck: ["BT1-013"], security: NEUTRAL_SECURITY },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 3;
    await s.ready();
    const makikoPermanentId = s.perm("makiko").permanentId;
    const lopmonId = s.inst("lopmon").instanceId;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("plainEvolution").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard?.cardId === "BT5-038" && s.state.pendingDecision === undefined);

    expect(s.state.players[0]!.battleArea.some((perm) => perm.permanentId === makikoPermanentId)).toBe(true);
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === lopmonId)).toBe(true);
    expect(s.state.players[0]!.hand.some((card) => card.cardId === "BT23-082")).toBe(false);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("plays itself for free from security", async () => {
    const s = setupEngine(
      {
        0: {
          security: [{ card: "BT23-082", as: "securityMakiko" }],
          deck: ["BT1-010", "BT1-011"],
        },
        1: {
          battleArea: [{ card: "BT1-024", as: "attacker" }],
          deck: ["BT1-013", "BT1-014"],
          security: NEUTRAL_SECURITY,
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.turnSeat = 1;
    s.state.memory = 3;
    await s.ready();
    const makikoId = s.inst("securityMakiko").instanceId;

    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some((perm) => perm.topCard?.instanceId === makikoId));

    expect(s.state.players[0]!.battleArea.some((perm) => perm.topCard?.instanceId === makikoId)).toBe(true);
    expect(s.state.players[0]!.trash.some((card) => card.instanceId === makikoId)).toBe(false);
    expect(s.state.players[0]!.security).toHaveLength(0);
    expect(s.state.pendingDecision).toBeUndefined();
    expect(observe(s.engine).isAttacking()).toBe(false);
  });

  it("fires off BT23-026 Lopmon's Makiko-gated route into [Antylamon]", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT23-082", as: "makiko" },
            { card: "BT23-026", as: "base" },
          ],
          hand: [
            { card: "BT23-029", as: "antylamon" },
            { card: "ST10-03", as: "lopmon" },
          ],
          deck: ["BT1-010", "BT1-011"],
          security: NEUTRAL_SECURITY,
        },
        1: { deck: ["BT1-013"], security: NEUTRAL_SECURITY },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 3;
    await s.ready();
    const makikoId = s.inst("makiko").instanceId;
    const lopmonId = s.inst("lopmon").instanceId;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("antylamon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some((perm) => perm.topCard?.instanceId === lopmonId));

    // BT23-026 grants the level-skipping [Antylamon] route while [Makiko Date] is in play, and
    // charges its own cost of 3 (the printed level-4 route costs 4). Makiko's play costs nothing.
    expect(s.state.memory).toBe(0);
    expect(s.perm("base").topCard?.cardId).toBe("BT23-029");
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === makikoId)).toBe(true);
    expect(s.state.players[0]!.battleArea.some((perm) => perm.topCard?.instanceId === lopmonId)).toBe(true);
    expect(s.state.pendingDecision).toBeUndefined();
  });
});
