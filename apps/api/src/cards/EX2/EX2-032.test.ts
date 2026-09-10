import { getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./EX2-032.js";
import "./EX2-032.js";
import "./EX2-022.js";
import "./EX2-034.js";
import "./EX2-062.js";
import "./EX2-063.js";

const FILLER = ["BT1-009", "BT1-013", "BT1-009", "BT1-013"];
const INERT_SECURITY = ["BT1-009", "BT1-013"];

describe("EX2-032 Strikedramon", () => {
  it("matches the catalog and typed IR for both printed clauses", () => {
    expect(getCardDefinition("EX2-032")).toMatchObject({
      cardId: "EX2-032",
      nameEn: "Strikedramon",
      colors: ["Black"],
      kinds: ["Digimon"],
      level: 4,
      playCost: 5,
      dp: 5000,
      evoCosts: [{ color: "Black", level: 3, memoryCost: 2 }],
      forms: ["Champion"],
      attributes: ["Vaccine"],
      types: ["Dragonkin"],
      effectText:
        "[When Digivolving] Reveal the top 4 cards of your deck. Add 1 black Tamer card among them to your hand. Place the remaining cards at the bottom of your deck in any order.",
      inheritedEffectText: "[When Attacking][Once Per Turn] If you have 2 or more black Tamers in play, gain 1 memory.",
    });
    expect(compiled).toMatchObject({
      effects: [
        {
          trigger: "WhenDigivolving",
          actions: [
            {
              kind: "RevealAdd",
              revealCount: 4,
              rest: "deckBottom",
              add: [
                {
                  count: 1,
                  to: "hand",
                  filter: { controllerDefault: "mine", kind: ["Tamer"], colors: ["Black"] },
                },
              ],
            },
          ],
        },
        {
          trigger: "WhenAttacking",
          isInherited: true,
          frequency: "OncePerTurn",
          actions: [
            {
              kind: "GainMemory",
              amount: 1,
              condition: {
                kind: "youHave",
                filter: { zone: "battleArea", controllerDefault: "mine", kind: ["Tamer"], colors: ["Black"] },
                count: 2,
              },
            },
          ],
        },
      ],
      coverage: "full",
      residual: [],
    });
  });

  it("pays 2 to add a black Tamer from the top four when digivolving", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX2-030", as: "base" }],
          hand: [{ card: "EX2-032", as: "evolution" }],
          deck: [{ card: "BT1-009", as: "drawn" }, { card: "EX2-062", as: "tamer" }, "BT1-013", "BT1-009", "BT1-013"],
          security: INERT_SECURITY,
        },
      },
      { autoSelectCards: true, autoOrderTriggers: true },
    );
    s.state.memory = 10;
    const baseInstanceId = s.perm("base").topCard.instanceId;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("evolution").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("tamer").instanceId));
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toContain(s.inst("tamer").instanceId);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toContain(s.inst("drawn").instanceId);
    expect(s.state.memory).toBe(8);
    expect(s.perm("base").topCard.instanceId).toBe(s.inst("evolution").instanceId);
    expect(s.perm("base").stack.map((card) => card.instanceId)).toEqual([baseInstanceId]);
    expect(s.state.players[0]!.deck.map((card) => card.cardId)).toEqual(["BT1-013", "BT1-009", "BT1-013"]);
  });

  it("puts the other revealed cards at the bottom in the chosen order", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX2-030", as: "base" }],
          hand: [{ card: "EX2-032", as: "evolution" }],
          deck: [
            { card: "BT1-009", as: "drawn" },
            { card: "EX2-062", as: "tamer" },
            { card: "BT1-013", as: "first" },
            { card: "BT1-009", as: "second" },
            { card: "BT1-013", as: "third" },
          ],
          security: INERT_SECURITY,
        },
      },
      { autoSelectCards: true, autoOrderCards: false },
    );
    s.state.memory = 10;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("evolution").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision?.kind === "orderCards");
    const ordering = s.decisions.at(-1)!.req;
    expect(ordering.kind).toBe("orderCards");
    expect(ordering.options?.candidateInstanceIds).toEqual([
      s.inst("first").instanceId,
      s.inst("second").instanceId,
      s.inst("third").instanceId,
    ]);
    const chosenOrder = [s.inst("third").instanceId, s.inst("first").instanceId, s.inst("second").instanceId];
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: ordering.decisionId,
        response: { kind: "orderCards", order: chosenOrder },
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        s.state.pendingDecision === undefined &&
        s.state.players[0]!.deck.map((card) => card.instanceId).join(",") === chosenOrder.join(","),
    );
    expect(s.state.players[0]!.deck.map((card) => card.instanceId)).toEqual(chosenOrder);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toContain(s.inst("drawn").instanceId);
    expect(s.state.memory).toBe(8);
  });

  it("does not add a card when the reveal has no black Tamer", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "EX2-030", as: "base" }],
        hand: [{ card: "EX2-032", as: "evolution" }],
        deck: ["BT1-009", "BT1-013", "BT1-009", "BT1-013", "BT1-009"],
        security: INERT_SECURITY,
      },
    });
    s.state.memory = 10;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("evolution").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision === undefined && s.state.players[0]!.deck.length === 4);
    expect(s.state.players[0]!.hand.some((card) => card.cardId === "EX2-062")).toBe(false);
    expect(s.state.players[0]!.deck).toHaveLength(4);
  });

  it("gains memory once per turn on public attacks and re-arms next turn", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX2-022", as: "host", under: ["EX2-032"] }, "EX2-062", "EX2-063"],
          deck: FILLER,
          security: [...INERT_SECURITY, "BT1-009", "BT1-013"],
        },
        1: { deck: FILLER, security: [...INERT_SECURITY, "BT1-009", "BT1-013"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoOrderTriggers: true },
    );
    s.state.memory = 9;
    await s.ready();
    const hostId = s.perm("host").permanentId;
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: hostId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        s.state.players[0]!.security.length === 3 &&
        s.state.players[1]!.security.length === 3 &&
        !s.perm("host").isSuspended,
    );
    expect(s.state.memory).toBe(10);

    const beforeSecondAttack = s.state.memory;
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: hostId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.security.length === 2 && s.perm("host").isSuspended);
    expect(s.state.memory).toBe(beforeSecondAttack);

    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    advance(s.engine).endMainPhaseIfOpen(0);
    await advance(s.engine).waitForMainPhase(1);
    advance(s.engine).endMainPhaseIfOpen(1);
    await advance(s.engine).waitForMainPhase(0);
    const beforeThirdAttack = s.state.memory;
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: hostId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        s.state.players[0]!.security.length === 2 &&
        s.state.players[1]!.security.length === 1 &&
        !s.perm("host").isSuspended,
    );
    expect(s.state.memory).toBe(beforeThirdAttack + 1);
    expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  it("does not gain memory from its inherited effect with fewer than two black Tamers", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "EX2-034", as: "host", under: ["EX2-032"] }, "EX2-062"] },
        1: { deck: FILLER, security: INERT_SECURITY },
      },
      { autoDeclineOptional: true },
    );
    s.state.memory = 3;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.security.length === INERT_SECURITY.length - 1);
    expect(s.state.memory).toBe(3);
  });

  it("rejects evolution from a non-black source", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "EX2-014", as: "blueSource" }],
        hand: [{ card: "EX2-032", as: "evolution" }],
        deck: FILLER,
        security: INERT_SECURITY,
      },
    });
    s.state.memory = 10;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("blueSource").permanentId,
        instanceId: s.inst("evolution").instanceId,
      }),
    ).toMatchObject({ ok: false });
  });
});
