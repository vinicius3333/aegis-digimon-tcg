import { describe, it, expect } from "vitest";
import { setupEngine as setup, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./BT14-093.js";
import "../index.js";

const EMISSARY = "BT14-093";

describe("BT14-093 Emissary of Hope [Security] add to hand", () => {
  it("keeps both the Main and Security contracts in compiled IR", () => {
    expect(compiled.effects).toMatchObject([
      {
        trigger: "Main",
        actions: [
          { kind: "Search", searchZone: "security" },
          { kind: "Digivolve", from: ["security"] },
          { kind: "SecurityManipulation", op: "shuffle" },
          { kind: "SecurityManipulation", op: "addTop" },
        ],
      },
      {
        trigger: "Security",
        isSecurity: true,
        actions: [{ kind: "PlayWithoutCost" }, { kind: "AddToHandSelf" }],
      },
    ]);
  });

  it("naturally searches security, digivolves, and recovers when T.K. is present", async () => {
    const s = setup(
      {
        0: {
          battleArea: [
            { card: "BT14-033", as: "patamon" },
            { card: "BT14-084", as: "tk" },
          ],
          hand: [{ card: EMISSARY, as: "option" }],
          security: [{ card: "BT14-035", as: "securityVaccine" }, "BT1-009"],
          deck: ["BT1-009", "BT1-009", "BT1-009"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.perm("patamon").topCard?.cardId === "BT14-035");

    expect(s.perm("patamon").topCard?.cardId).toBe("BT14-035");
    expect(s.state.players[0]!.security).toHaveLength(2);
    expect(s.state.players[0]!.security.some((card) => card.cardId === "BT14-035")).toBe(false);
  });

  it("naturally plays Patamon and returns itself after a Security check", async () => {
    const s = setup(
      {
        0: { battleArea: [{ card: "BT1-009", dp: 2000, as: "attacker" }] },
        1: {
          security: [{ card: EMISSARY, as: "securityOption" }],
          hand: [{ card: "BT14-033", as: "patamon" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.battleArea.some((perm) => perm.topCard?.cardId === "BT14-033"));

    expect(s.state.players[1]!.battleArea.some((perm) => perm.topCard?.cardId === "BT14-033")).toBe(true);
    expect(s.state.players[1]!.hand.some((card) => card.cardId === EMISSARY)).toBe(true);
  });

  it("when checked as security, the card is added to the defender's hand", async () => {
    const s = setup(
      {
        0: { battleArea: [{ card: "BT1-009", dp: 2000, as: "attacker" }] },
        1: { security: [{ card: EMISSARY }] },
      },
      { autoDeclineOptional: true },
    );
    const p1 = s.state.players[1]!;
    const attacker = s.perm("attacker");

    s.state.memory = 3;
    const res = s.engine.applyIntent(0, {
      type: "attack",
      attackerPermanentId: attacker.permanentId,
      target: { kind: "player" },
    });
    expect(res).toEqual({ ok: true });

    await settle(() => p1.hand.some((c) => c.cardId === EMISSARY), 800);

    expect(p1.hand.some((c) => c.cardId === EMISSARY)).toBe(true);
    expect(p1.security.some((c) => c.cardId === EMISSARY)).toBe(false);
  });
});

describe("BT14-093 Emissary of Hope — KB Q&A rulings", () => {
  function playEmissary(s: ReturnType<typeof setup>): void {
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
      ok: true,
    });
  }

  it("may search security and then choose not to digivolve (Q2468)", async () => {
    const s = setup(
      {
        0: {
          battleArea: [
            { card: "BT14-033", as: "patamon" },
            { card: "BT14-084", as: "tk" },
          ],
          hand: [{ card: EMISSARY, as: "option" }],
          security: [{ card: "BT14-035", as: "securityVaccine" }, "BT1-009"],
          deck: [{ card: "BT1-009", as: "deckTop" }],
        },
      },
      { autoDeclineOptional: true },
    );
    s.state.memory = 10;

    playEmissary(s);
    await settle(() => s.state.pendingDecision?.kind === "selectCards");
    const search = s.state.pendingDecision;
    if (search?.kind !== "selectCards") throw new Error("security search decision did not open");
    const searchOptions = s.decisions.find(({ req }) => req.decisionId === search.decisionId)?.req.options;
    expect(searchOptions?.candidateInstanceIds).toEqual([s.inst("securityVaccine").instanceId]);
    expect(searchOptions?.min).toBe(0);
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: search.decisionId,
        response: { kind: "selectCards", instanceIds: [] },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.trash.some((card) => card.cardId === EMISSARY));
    await settle();

    expect(s.perm("patamon").topCard?.cardId).toBe("BT14-033");
    expect(s.state.players[0]!.security.map((card) => card.cardId).sort()).toEqual(["BT1-009", "BT14-035"]);
    expect(s.state.players[0]!.deck.map((card) => card.instanceId)).toEqual([s.inst("deckTop").instanceId]);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("performs the digivolution bonus draw before the shuffle and Recovery that follow (Q2469)", async () => {
    const s = setup(
      {
        0: {
          battleArea: [
            { card: "BT14-033", as: "patamon" },
            { card: "BT14-084", as: "tk" },
          ],
          hand: [{ card: EMISSARY, as: "option" }],
          security: [{ card: "BT14-035", as: "securityVaccine" }, "BT1-009"],
          deck: [
            { card: "BT1-010", as: "firstDeckCard" },
            { card: "BT1-011", as: "secondDeckCard" },
            { card: "BT1-012", as: "thirdDeckCard" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;

    playEmissary(s);
    await settle(() =>
      s.state.players[0]!.security.some((card) => card.instanceId === s.inst("secondDeckCard").instanceId),
    );
    await settle();

    expect(s.perm("patamon").topCard?.cardId).toBe("BT14-035");
    const player = s.state.players[0]!;
    expect(player.hand.map((card) => card.instanceId)).toContain(s.inst("firstDeckCard").instanceId);
    expect(player.security.map((card) => card.instanceId)).toContain(s.inst("secondDeckCard").instanceId);
    expect(player.security.map((card) => card.instanceId)).not.toContain(s.inst("firstDeckCard").instanceId);
    expect(player.deck.map((card) => card.instanceId)).toEqual([s.inst("thirdDeckCard").instanceId]);
  });

  it("resolves the digivolved card's [When Digivolving] only after the shuffle and Recovery (Q2470)", async () => {
    const s = setup(
      {
        0: {
          battleArea: [
            { card: "BT1-057", as: "sirenmon" },
            { card: "BT14-084", as: "tk" },
          ],
          hand: [{ card: EMISSARY, as: "option" }],
          security: [{ card: "BT7-041", as: "kazuchimon" }, "BT1-009", "BT1-009"],
          deck: ["BT1-010", "BT1-011", "BT1-012", "BT1-013"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, declinePrompts: ["suspending this Tamer"] },
    );
    s.state.memory = 3;

    playEmissary(s);
    await settle(() => s.perm("sirenmon").topCard?.cardId === "BT7-041");
    await settle();

    // Kazuchimon's [When Digivolving] gains 2 memory at 3+ security and recovers at 2 or fewer.
    // Emissary leaves 2 security cards and its Recovery restores the 3rd, so only a
    // [When Digivolving] that waits for the whole effect sees 3 and gains memory.
    expect(s.state.players[0]!.security).toHaveLength(3);
    expect(s.state.memory).toBe(3 - 1 + 2);
  });

  it("cannot trash security with Boutmon while digivolving from security via this card (Q4176)", async () => {
    const s = setup(
      {
        0: {
          battleArea: [{ card: "P-074", as: "boutmon" }],
          hand: [{ card: EMISSARY, as: "option" }],
          security: [{ card: "BT10-042", as: "venusmon" }, "BT1-009", "BT1-009", "BT1-028"],
          deck: ["BT1-010", "BT1-011"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true, preferOptionIndex: 3 },
    );
    s.state.memory = 10;

    playEmissary(s);
    await settle(() => s.perm("boutmon").topCard?.cardId === "BT10-042");
    await settle();

    expect(s.perm("boutmon").topCard?.cardId).toBe("BT10-042");
    expect(s.state.players[0]!.security).toHaveLength(3);
    expect(s.state.players[0]!.trash.map((card) => card.cardId)).toEqual([EMISSARY]);
    expect(s.decisions.some(({ req }) => req.kind === "chooseOption")).toBe(false);

    const control = setup(
      {
        0: {
          battleArea: [{ card: "P-074", as: "boutmon" }],
          hand: [{ card: "BT10-042", as: "venusmon" }],
          security: ["BT1-009", "BT1-009", "BT1-028"],
          deck: ["BT1-010"],
        },
      },
      { autoChooseOption: true, preferOptionIndex: 3 },
    );
    control.state.memory = 1;
    await control.ready();
    expect(
      control.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: control.perm("boutmon").permanentId,
        instanceId: control.inst("venusmon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(
      () => control.perm("boutmon").topCard?.cardId === "BT10-042" && control.state.players[0]!.security.length === 0,
    );

    expect(control.state.players[0]!.security).toHaveLength(0);
  });
});
