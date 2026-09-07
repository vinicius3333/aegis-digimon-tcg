import { getCardDefinition, type Seat } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "./BT25-072.js";

const CARD_ID = "BT25-072";
const VALID_LINK = "BT21-041";
const NEAR_TRAIT_LINK = "BT23-039";
const NO_LINK_TOOL = "BT25-004";

describe("BT25-072 Shutmon", () => {
  it("matches the complete catalog, App Fusion, link, and printed keyword contract", () => {
    const card = getCardDefinition(CARD_ID);
    expect(card).toBeDefined();
    if (card === undefined) return;
    expect(card).toMatchObject({
      nameEn: "Shutmon",
      colors: ["Black", "Purple"],
      kinds: ["Digimon"],
      level: 5,
      playCost: 7,
      dp: 7000,
      evoCosts: [
        { color: "Black", level: 4, memoryCost: 4 },
        { color: "Purple", level: 4, memoryCost: 4 },
      ],
      forms: ["Ult.", "Appmon"],
      attributes: ["Tool"],
      types: ["Forced Termination"],
      maxCountInDeck: 4,
      linkDp: 4000,
      linkEffect: "[When Linking] 2 of your opponent's Digimon or Tamers can't unsuspend until their turn ends.",
      linkRequirement: "[Link] [Appmon] trait: Cost 3",
      dualEffect: "Shutmon",
    });
    expect(card.effectText?.replace(/\u00a0/g, " ")).toContain(
      "[On Play] [When Digivolving] [When Attacking] If it's your turn, you may link 1",
    );
    expect(card.effectText).toContain("[All Turns] [Once Per Turn]");
  });

  it("On Play links only a legal Social/Tool/Game card from trash, at cost 0 after the reduction", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: CARD_ID, as: "shutmon" }],
          trash: [VALID_LINK, NEAR_TRAIT_LINK, NO_LINK_TOOL],
        },
        1: { battleArea: [{ card: "BT25-081", as: "opponent" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    s.state.memory = 7;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("shutmon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() =>
      s.state.players[0]!.battleArea.some((p) => p.topCard?.cardId === CARD_ID && p.linked.length > 0),
    );

    const shutmon = s.state.players[0]!.battleArea.find((p) => p.topCard?.cardId === CARD_ID)!;
    expect(shutmon.linked.map((card) => card.cardId)).toEqual([VALID_LINK]);
    expect(s.state.players[0]!.trash.map((card) => card.cardId)).toEqual([NEAR_TRAIT_LINK, NO_LINK_TOOL]);
    expect(s.state.memory).toBe(0); // play 7; the link's printed cost 1 is reduced by 2 to 0
    expect(shutmon.currentDP).toBe(9000); // 7000 + BT21-041's 2000 link DP
  });

  it("does not link from On Play during the opponent's turn", async () => {
    const s = setupEngine(
      {
        0: { hand: [{ card: CARD_ID, as: "shutmon" }], trash: [VALID_LINK] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    s.state.turnSeat = 1;
    await advance(s.engine).verb.playInstances([s.inst("shutmon").instanceId], "BT25-070");
    await settle(() => s.state.players[0]!.battleArea.some((p) => p.topCard?.cardId === CARD_ID));

    const shutmon = s.state.players[0]!.battleArea.find((p) => p.topCard?.cardId === CARD_ID)!;
    expect(shutmon.linked).toHaveLength(0);
    expect(s.state.players[0]!.trash.map((card) => card.cardId)).toContain(VALID_LINK);
  });

  it("does not enter play or link when the printed play cost is not affordable", async () => {
    const s = setupEngine(
      {
        0: { hand: [{ card: CARD_ID, as: "shutmon" }], trash: [VALID_LINK] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    s.state.memory = -10;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("shutmon").instanceId })).toMatchObject({
      ok: false,
    });
    expect(s.state.players[0]!.hand.map((card) => card.cardId)).toEqual([CARD_ID]);
    expect(s.state.players[0]!.trash.map((card) => card.cardId)).toEqual([VALID_LINK]);
  });

  it("When Digivolving links a card from this stack, not an unrelated Digimon's stack", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: CARD_ID, as: "shutmon" }],
          battleArea: [
            { card: "BT25-070", as: "base", under: ["BT21-053", VALID_LINK] },
            { card: "BT25-070", as: "other", under: ["BT21-053", "BT21-054"] },
          ],
        },
        1: { battleArea: [{ card: "BT25-081", as: "opponent" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    s.state.memory = 4;
    await advance(s.engine).verb.digivolveFromInstance(s.perm("base").permanentId, s.inst("shutmon").instanceId, {
      payCost: true,
    });
    await settle(() => s.perm("base").topCard?.cardId === CARD_ID);

    expect(s.perm("base").linked.map((card) => card.cardId)).toEqual(["BT21-053"]);
    expect(s.perm("base").stack.map((card) => card.cardId)).toContain("BT25-070");
    expect(s.perm("base").stack.map((card) => card.cardId)).toEqual(["BT21-041", "BT25-070"]);
    expect(s.perm("other").stack.map((card) => card.cardId)).toEqual(["BT21-053", "BT21-054"]);
    expect(s.state.memory).toBe(0);
  });

  it("When Attacking links from trash on your turn, including after the attack is declared", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: CARD_ID, as: "shutmon" }],
          trash: [VALID_LINK],
        },
        1: { security: ["BT1-009"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("shutmon").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("shutmon").linked.some((card) => card.cardId === VALID_LINK));

    const shutmon = s.state.players[0]!.battleArea.find((p) => p.topCard?.cardId === CARD_ID)!;
    expect(shutmon.linked.map((card) => card.cardId)).toEqual([VALID_LINK]);
    expect(shutmon.isSuspended).toBe(true);
  });

  it("shares the All Turns once-per-turn link reaction and targets only one opposing permanent", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: CARD_ID, as: "shutmon" }] },
        1: {
          battleArea: [
            { card: "BT25-081", as: "firstOpponent" },
            { card: "BT25-080", as: "secondOpponent" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    await advance(s.engine).fireSubTrigger("whenLinked", { subjectPermanentId: s.perm("shutmon").permanentId });
    expect(observe(s.engine).hasRestriction(s.perm("firstOpponent"), "digivolve")).toBe(true);
    expect(observe(s.engine).hasRestriction(s.perm("secondOpponent"), "digivolve")).toBe(false);

    await advance(s.engine).fireSubTrigger("whenLinked", { subjectPermanentId: s.perm("shutmon").permanentId });
    expect(observe(s.engine).hasRestriction(s.perm("secondOpponent"), "digivolve")).toBe(false);
  });

  it("does not react when a different host receives a link", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: CARD_ID, as: "shutmon" },
            { card: "BT21-009", as: "otherHost" },
          ],
          hand: [{ card: CARD_ID, as: "linkCard" }],
        },
        1: { battleArea: [{ card: "BT25-081", as: "opponent" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    s.state.memory = 3;

    expect(
      s.engine.applyIntent(0, {
        type: "linkCard",
        instanceId: s.inst("linkCard").instanceId,
        targetPermanentId: s.perm("otherHost").permanentId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("otherHost").linked.some((card) => card.cardId === CARD_ID));

    expect(observe(s.engine).hasRestriction(s.perm("opponent"), "digivolve")).toBe(false);
  });

  it.each([
    ["black", "BT10-061"],
    ["purple", "BT10-074"],
  ] as const)("uses the ordinary %s Lv4 evolution at exact cost 4", async (_color, source) => {
    const s = setupEngine({
      0: { battleArea: [{ card: source, as: "base" }], hand: [{ card: CARD_ID, as: "shutmon" }] },
    });
    s.state.memory = 5;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("shutmon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard?.cardId === CARD_ID);
    expect(s.state.memory).toBe(1);
    expect(s.perm("base").topCard?.cardId).toBe(CARD_ID);
  });

  it("App Fuses the printed Logamon and Timemon pair at zero cost", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT25-070", as: "logamon", linked: [{ card: "BT21-059", as: "timemon" }] }],
          hand: [{ card: CARD_ID, as: "shutmon" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 0;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("logamon").permanentId,
        instanceId: s.inst("shutmon").instanceId,
        appFusionLinkInstanceId: s.inst("timemon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("logamon").topCard.cardId === CARD_ID);
    expect(s.perm("logamon").stack.map((card) => card.cardId)).toEqual(["BT21-059"]);
    expect(s.perm("logamon").linked.map((card) => card.cardId)).toContain("BT25-070");
    expect(s.state.memory).toBe(0);
  });

  it("linked Shutmon's printed When Linking effect restricts two opposing Digimon/Tamers from unsuspending", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT21-009", as: "host" }],
          hand: [{ card: CARD_ID, as: "linkedShutmon" }],
        },
        1: {
          battleArea: [
            { card: "BT25-081", as: "opponentDigimon" },
            { card: "BT1-087", as: "opponentTamer" },
          ],
        },
      },
      { autoSelectCards: true },
    );
    await s.ready();
    s.state.memory = 3;
    expect(
      s.engine.applyIntent(0, {
        type: "linkCard",
        instanceId: s.inst("linkedShutmon").instanceId,
        targetPermanentId: s.perm("host").permanentId,
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        s.perm("host").linked.some((card) => card.cardId === CARD_ID) &&
        observe(s.engine).hasRestriction(s.perm("opponentDigimon"), "unsuspend"),
    );

    expect(s.perm("host").linked.map((card) => card.cardId)).toEqual([CARD_ID]);
    expect(observe(s.engine).hasRestriction(s.perm("opponentDigimon"), "unsuspend")).toBe(true);
    expect(observe(s.engine).hasRestriction(s.perm("opponentTamer"), "unsuspend")).toBe(true);
    expect(observe(s.engine).hasRestriction(s.perm("opponentDigimon"), "digivolve")).toBe(false);

    advance(s.engine).ledgers.continuous.sweep(s.state, "ownerTurnEnd", 1 as Seat);
    expect(observe(s.engine).hasRestriction(s.perm("opponentDigimon"), "unsuspend")).toBe(false);
    expect(observe(s.engine).hasRestriction(s.perm("opponentTamer"), "unsuspend")).toBe(false);
  });
});
