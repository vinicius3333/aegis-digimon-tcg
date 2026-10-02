import { CardKind, EffectTiming, digivolutionRequirementsFor, requireCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "../index.js";
import { compiled } from "./BT25-085.js";

const CARD_ID = "BT25-085";

describe("BT25-085 BeelStarmon", () => {
  it("places the Option-side Three Musketeers card as the bottom digivolution card", () => {
    const optionMain = compiled.effects.find((effect) => effect.trigger === "Main");
    expect(optionMain?.actions.find((action) => action.kind === "PlaceUnder")).toMatchObject({
      underFilter: { controller: "mine", kind: ["Digimon"] },
      position: "bottom",
    });
  });

  it("preserves both alternate evolution requirements and its DUAL Option identity (Q6404)", () => {
    expect(digivolutionRequirementsFor(CARD_ID)).toEqual(
      expect.arrayContaining([
        { level: 5, texts: ["Three Musketeers"], cost: 3, isAlternate: true },
        { level: 5, traits: ["TS"], cost: 3, isAlternate: true },
      ]),
    );
    const definition = requireCardDefinition(CARD_ID);
    expect(definition.kinds).toEqual(expect.arrayContaining([CardKind.Digimon, CardKind.Option]));
    expect(definition.types).toEqual(expect.arrayContaining(["Three Musketeers", "TS"]));
  });

  it("supports ordinary Purple and Black Lv.5 routes at cost 4 and rejects a wrong color", async () => {
    for (const [source, as] of [
      ["BT10-064", "blackBase"],
      ["BT10-012", "purpleBase"],
    ] as const) {
      const s = setupEngine({ 0: { battleArea: [{ card: source, as }], hand: [{ card: CARD_ID, as: "beel" }] } });
      s.state.memory = 5;
      expect(
        s.engine.applyIntent(0, {
          type: "digivolve",
          permanentId: s.perm(as).permanentId,
          instanceId: s.inst("beel").instanceId,
        }),
      ).toEqual({ ok: true });
      await settle(() => s.perm(as).topCard?.cardId === CARD_ID);
      expect(s.perm(as).topCard?.cardId).toBe(CARD_ID);
      expect(s.state.memory).toBe(1);
    }
    const wrong = setupEngine({
      0: { battleArea: [{ card: "BT10-056", as: "greenBase" }], hand: [{ card: CARD_ID, as: "beel" }] },
    });
    wrong.state.memory = 5;
    expect(
      wrong.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: wrong.perm("greenBase").permanentId,
        instanceId: wrong.inst("beel").instanceId,
      }),
    ).toEqual({ ok: false, reason: "invalid-evolution" });
  });

  it("uses exactly one eligible Option from hand for free and resolves the DUAL Option face", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: CARD_ID, as: "beel" }],
          hand: [{ card: CARD_ID, as: "option" }],
        },
        1: { battleArea: [{ card: "BT1-013", as: "target" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    const memory = s.state.memory;
    await advance(s.engine).fireForPermanent(EffectTiming.WhenDigivolving, s.perm("beel"));
    expect(s.state.memory).toBe(memory);
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("option").instanceId)).toBe(false);
    expect(s.state.players[0]!.trash.some((card) => card.instanceId === s.inst("option").instanceId)).toBe(true);
    expect(s.state.players[1]!.battleArea).toHaveLength(0);
  });

  it("uses an Option from this Digimon's sources but not another Digimon's sources", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: CARD_ID, as: "beel", under: [{ card: CARD_ID, as: "ownOption" }] },
            { card: "BT1-009", as: "other", under: [{ card: CARD_ID, as: "otherOption" }] },
          ],
        },
        1: { battleArea: [{ card: "BT1-013", as: "target" }] },
      },
      {
        autoAcceptOptional: true,
        autoSelectCards: true,
        declinePrompts: ["trashing 1 Option card"],
      },
    );
    await s.ready();

    await advance(s.engine).fireForPermanent(EffectTiming.WhenDigivolving, s.perm("beel"));

    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toContain(s.inst("ownOption").instanceId);
    expect(s.perm("other").stack.map((card) => card.instanceId)).toContain(s.inst("otherOption").instanceId);
    expect(s.state.players[1]!.battleArea).toHaveLength(0);
  });

  it("announces the Option it uses from its sources before the Option resolves (Discord 1555578375677018193)", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: CARD_ID, as: "beel", under: [{ card: "EX7-071", as: "shot" }] }] },
        1: { battleArea: [{ card: "BT1-009", as: "target" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, declinePrompts: ["trashing 1 Option card"] },
    );
    await s.ready();

    await advance(s.engine).fireForPermanent(EffectTiming.WhenDigivolving, s.perm("beel"));

    const announced = s.events.findIndex((event) => event.kind === "cardPlayed" && event.cardId === "EX7-071");
    const mainTriggered = s.events.findIndex(
      (event) => event.kind === "effectTriggered" && event.sourceCardId === "EX7-071",
    );
    const deleted = s.events.findIndex((event) => event.kind === "cardsMoved" && event.deletedPermanents !== undefined);
    expect(s.events[announced]).toMatchObject({ kind: "cardPlayed", seat: 0, cardId: "EX7-071" });
    expect(s.events[announced]).not.toHaveProperty("permanentId");
    expect(s.events[mainTriggered]).toMatchObject({
      sourceInstanceId: s.inst("shot").instanceId,
      timing: "OnUseOption",
      printedTiming: "Main",
    });
    expect(mainTriggered).toBeGreaterThan(announced);
    expect(deleted).toBeGreaterThan(mainTriggered);
  });

  it("trashes one Option link card from any own Digimon and then unsuspends", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: CARD_ID, as: "beel", suspended: true },
            { card: "BT1-013", as: "other", linked: [{ card: CARD_ID, as: "link" }] },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    await advance(s.engine).fireForPermanent(EffectTiming.WhenDigivolving, s.perm("beel"));
    expect(s.perm("beel").isSuspended).toBe(false);
    expect(s.perm("other").linked).toHaveLength(0);
    expect(s.state.players[0]!.trash.some((card) => card.instanceId === s.inst("link").instanceId)).toBe(true);
  });

  it("fires the trashed Option's digivolution-card trash trigger when paying the unsuspend cost (Discord 1555578375677018193)", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT10-012", as: "base", suspended: true, under: [{ card: "EX7-071", as: "screwShot" }] },
          ],
          hand: [{ card: CARD_ID, as: "beel" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, declinePrompts: ["Use an Option", "Arts Digivolve"] },
    );
    s.state.memory = 5;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("beel").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => !s.perm("base").isSuspended && s.state.pendingDecision === undefined);

    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toContain(s.inst("screwShot").instanceId);
    expect(s.state.memory).toBe(2);
  });

  it("does not pay the unsuspend cost from a non-Digimon's linked cards", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: CARD_ID, as: "beel", suspended: true },
            { card: "BT25-086", as: "tamer", linked: [{ card: CARD_ID, as: "link" }] },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    await advance(s.engine).fireForPermanent(EffectTiming.WhenDigivolving, s.perm("beel"));
    expect(s.perm("beel").isSuspended).toBe(true);
    expect(s.perm("tamer").linked).toHaveLength(1);
  });
});

describe("BT25-085 BeelStarmon — KB Q&A rulings", () => {
  it.each([
    ["only its traits", "BT6-017", { ok: true }],
    ["only its effect text", "BT6-060", { ok: true }],
    ["nowhere in its text", "BT1-009", { ok: false, reason: "color-requirement-unmet" }],
  ] as const)(
    "counts a field Digimon with [Three Musketeers] in %s for Fly Bullet's use requirement (Q6402)",
    async (_case, fieldCard, result) => {
      const s = setupEngine(
        {
          0: { battleArea: [{ card: fieldCard, as: "field" }], hand: [{ card: CARD_ID, as: "flyBullet" }] },
          1: { battleArea: [{ card: "BT1-013", as: "victim" }] },
        },
        { autoDeclineOptional: true },
      );
      s.state.memory = 10;
      await s.ready();

      expect(
        s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("flyBullet").instanceId, useAs: "option" }),
      ).toEqual(result);
      if (result.ok) await settle(() => s.state.players[1]!.battleArea.length === 0);

      expect(s.state.players[1]!.battleArea).toHaveLength(result.ok ? 0 : 1);
    },
  );

  it.each([
    { firstDescription: "this Digimon unsuspends", unsuspended: true, opponentDigimon: 1 },
    { firstDescription: "without paying the cost", unsuspended: false, opponentDigimon: 0 },
  ])(
    "lets its controller order its simultaneous When Digivolving effects (first: $firstDescription) (Q6403)",
    async ({ firstDescription, unsuspended, opponentDigimon }) => {
      const s = setupEngine(
        {
          0: { battleArea: [{ card: CARD_ID, as: "beel", suspended: true, under: [CARD_ID] }] },
          1: { battleArea: [{ card: "BT1-009", as: "victim" }] },
        },
        {
          autoAcceptOptional: true,
          autoSelectCards: true,
          autoOrderTriggers: false,
          declinePrompts: ["Arts Digivolve"],
        },
      );
      await s.ready();

      const resolving = advance(s.engine).fireForPermanent(EffectTiming.WhenDigivolving, s.perm("beel"));
      await settle(() => s.state.pendingDecision?.kind === "orderTriggers");
      const pending = s.state.pendingDecision!;
      const options = s.decisions.find(({ req }) => req.decisionId === pending.decisionId)!.req.options!;
      expect(options.triggerCardIds).toEqual([CARD_ID, CARD_ID]);
      const first = options.triggerDescriptions!.findIndex((text) => text.includes(firstDescription));
      expect(
        s.engine.applyIntent(0, {
          type: "respondDecision",
          decisionId: pending.decisionId,
          response: { kind: "orderTriggers", order: [options.triggerKeys![first]!] },
        }),
      ).toEqual({ ok: true });
      await resolving;

      expect(s.perm("beel").isSuspended).toBe(!unsuspended);
      expect(s.state.players[1]!.battleArea).toHaveLength(opponentDigimon);
    },
  );

  it("allows no second [Counter] effect in the same attack after its [Counter] unsuspends it (Q6716)", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: CARD_ID, as: "beel", suspended: true, under: [CARD_ID] },
            { card: "BT25-103", as: "grace", under: ["BT24-014", "BT25-018"] },
          ],
          security: ["BT1-009", "BT1-019"],
        },
        1: { battleArea: [{ card: "BT1-009", dp: 20000, as: "attacker", under: ["BT1-010"] }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.turnSeat = 1;
    await s.ready();

    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.events.some((event) => event.kind === "counterWindowOpened"));
    const opened = s.events.find((event) => event.kind === "counterWindowOpened");
    if (opened?.kind !== "counterWindowOpened") throw new Error("counter window did not open");
    const counterOf = (alias: string) =>
      opened.eligibleCounters.find((entry) => entry.instanceId === s.perm(alias).topCard.instanceId)!;
    const beelCounter = counterOf("beel");
    const graceCounter = counterOf("grace");
    expect(graceCounter).toBeDefined();

    expect(
      s.engine.applyIntent(0, {
        type: "respondCounter",
        sourceInstanceId: beelCounter.instanceId,
        effectKey: beelCounter.effectKey,
      }),
    ).toEqual({ ok: true });
    await settle(() => !s.perm("beel").isSuspended);
    expect(
      s.engine.applyIntent(0, {
        type: "respondCounter",
        sourceInstanceId: graceCounter.instanceId,
        effectKey: graceCounter.effectKey,
      }),
    ).toEqual(expect.objectContaining({ ok: false }));
    await settle(() => observe(s.engine).blockingSeat() === 0);
    expect(s.engine.applyIntent(0, { type: "declineBlock" })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.security.length === 1);

    expect(s.events.filter((event) => event.kind === "counterWindowOpened")).toHaveLength(1);
    expect(s.perm("grace").stack).toHaveLength(2);
    expect(s.perm("attacker").stack).toHaveLength(1);
  });
});
