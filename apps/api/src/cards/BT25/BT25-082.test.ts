import { EffectTiming, digivolutionRequirementsFor } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "../index.js";

const CARD_ID = "BT25-082";

describe("BT25-082 BlackGatomon", () => {
  it("keeps both level-3 alternate routes at cost 2", () => {
    expect(digivolutionRequirementsFor(CARD_ID)).toEqual(
      expect.arrayContaining([
        { level: 3, texts: ["Three Musketeers"], cost: 2, isAlternate: true },
        { level: 3, traits: ["TS"], cost: 2, isAlternate: true },
      ]),
    );
  });

  it("supports ordinary Purple and Black Lv.3 routes at cost 3 and rejects a wrong color", async () => {
    for (const [source, as] of [
      ["BT10-071", "purpleBase"],
      ["BT10-058", "blackBase"],
    ] as const) {
      const s = setupEngine({ 0: { battleArea: [{ card: source, as }], hand: [{ card: CARD_ID, as: "cat" }] } });
      s.state.memory = 4;
      expect(
        s.engine.applyIntent(0, {
          type: "digivolve",
          permanentId: s.perm(as).permanentId,
          instanceId: s.inst("cat").instanceId,
        }),
      ).toEqual({ ok: true });
      await settle(() => s.perm(as).topCard?.cardId === CARD_ID);
      expect(s.state.memory).toBe(1);
    }
    const wrong = setupEngine({
      0: { battleArea: [{ card: "BT1-009", as: "redBase" }], hand: [{ card: CARD_ID, as: "cat" }] },
    });
    wrong.state.memory = 4;
    expect(
      wrong.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: wrong.perm("redBase").permanentId,
        instanceId: wrong.inst("cat").instanceId,
      }),
    ).toEqual({ ok: false, reason: "invalid-evolution" });
  });

  it.each([
    ["Three Musketeers text", "BT21-054", 2],
    ["TS trait", "BT24-009", 3],
  ] as const)("uses the %s alternate route at cost 2", async (_branch, source, requirementIndex) => {
    const s = setupEngine({
      0: { battleArea: [{ card: source, as: "base" }], hand: [{ card: CARD_ID, as: "cat" }] },
    });
    s.state.memory = 3;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("cat").instanceId,
        useAlternateCost: true,
        alternateRequirementIndex: requirementIndex,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard.cardId === CARD_ID);
    expect(s.state.memory).toBe(1);
  });

  it("On Play plays a full-text matching Tamer free at the exact <=1 boundary, and may be declined", async () => {
    const positive = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT1-085", as: "existing" }],
          hand: [
            { card: "BT25-092", as: "valid" },
            { card: "BT1-087", as: "invalid" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await positive.ready();
    await advance(positive.engine).fireForPermanent(
      EffectTiming.OnPlay,
      positive.putOnBoard(0, { card: CARD_ID, as: "cat" }),
    );
    expect(
      positive.state.players[0]!.battleArea.some((p) => p.topCard?.instanceId === positive.inst("valid").instanceId),
    ).toBe(true);
    expect(positive.state.memory).toBe(0);

    const blocked = setupEngine(
      {
        0: {
          battleArea: [{ card: CARD_ID, as: "cat" }, "BT1-085", "BT2-090"],
          hand: [{ card: "BT25-092", as: "valid" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await blocked.ready();
    await advance(blocked.engine).fireForPermanent(EffectTiming.OnPlay, blocked.perm("cat"));
    expect(blocked.state.players[0]!.hand.map((c) => c.instanceId)).toContain(blocked.inst("valid").instanceId);

    const declined = setupEngine(
      { 0: { battleArea: [{ card: CARD_ID, as: "cat" }], hand: [{ card: "BT25-092", as: "valid" }] } },
      { autoDeclineOptional: true },
    );
    await declined.ready();
    await advance(declined.engine).fireForPermanent(EffectTiming.OnPlay, declined.perm("cat"));
    expect(declined.state.players[0]!.hand.map((c) => c.instanceId)).toContain(declined.inst("valid").instanceId);
  });

  it("Q6388-Q6389 grants cost-4 requirement-ignoring evolution only from the battle area", async () => {
    const battle = setupEngine({
      0: {
        battleArea: [
          { card: CARD_ID, as: "cat" },
          { card: "BT25-092", as: "tamer" },
        ],
        hand: [{ card: "BT25-085", as: "beel" }],
        deck: ["AD1-001"],
      },
    });
    battle.state.memory = 4;
    await battle.ready();
    expect(
      battle.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: battle.perm("cat").permanentId,
        instanceId: battle.inst("beel").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => battle.perm("cat").topCard.cardId === "BT25-085");
    expect(battle.state.memory).toBe(0);

    const breeding = setupEngine({
      0: {
        breeding: { card: CARD_ID, as: "cat" },
        battleArea: [{ card: "BT25-092", as: "tamer" }],
        hand: [{ card: "BT25-085", as: "beel" }],
      },
    });
    breeding.state.memory = 4;
    await breeding.ready();
    expect(
      breeding.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: breeding.perm("cat").permanentId,
        instanceId: breeding.inst("beel").instanceId,
      }),
    ).toEqual(expect.objectContaining({ ok: false }));
  });

  it("Q6389/Q6392 lets an effect-driven paid digivolve use the base grant and P-108-style reduction", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: CARD_ID, as: "cat" },
            { card: "BT25-092", as: "tamer" },
          ],
          hand: [{ card: "BT25-085", as: "beel" }],
          deck: ["AD1-001"],
        },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    s.state.memory = 2;
    await s.ready();
    await advance(s.engine).verb.digivolveFromInstance(s.perm("cat").permanentId, s.inst("beel").instanceId, {
      payCost: true,
      costDelta: -2,
    });
    expect(s.perm("cat").topCard.cardId).toBe("BT25-085");
    expect(s.state.memory).toBe(0);
  });

  it("does not add an unprinted inherited draw effect", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            {
              card: "BT25-083",
              as: "host",
              under: [{ card: CARD_ID, as: "source" }],
            },
          ],
          trash: [{ card: "BT25-085", as: "cost" }],
          hand: [{ card: "AD1-002", as: "nearMiss" }],
          deck: [
            { card: "AD1-003", as: "drawn" },
            { card: "AD1-004", as: "second" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    await advance(s.engine).fireForPermanent(EffectTiming.OnAllyAttack, s.perm("host"), {
      attackerPermanentId: s.perm("host").permanentId,
    });
    expect(s.perm("host").stack.map((c) => c.instanceId)).toEqual([s.inst("source").instanceId]);
    expect(s.state.players[0]!.hand.map((c) => c.instanceId)).not.toContain(s.inst("drawn").instanceId);
    await advance(s.engine).fireForPermanent(EffectTiming.OnAllyAttack, s.perm("host"), {
      attackerPermanentId: s.perm("host").permanentId,
    });
    expect(s.state.players[0]!.hand.map((c) => c.instanceId)).not.toContain(s.inst("second").instanceId);
  });
});

describe("BT25-082 BlackGatomon — KB Q&A rulings", () => {
  it.each([
    ["effect text names [Three Musketeers]", "EX7-008", { ok: true }],
    ["no [Three Musketeers] anywhere in its text", "BT1-009", { ok: false, reason: "invalid-evolution" }],
  ] as const)(
    "reads a Lv.3 card's full printed text for the alternate route: %s (Q6387)",
    async (_case, base, result) => {
      const s = setupEngine({ 0: { battleArea: [{ card: base, as: "base" }], hand: [{ card: CARD_ID, as: "cat" }] } });
      s.state.memory = 2;
      await s.ready();

      expect(
        s.engine.applyIntent(0, {
          type: "digivolve",
          permanentId: s.perm("base").permanentId,
          instanceId: s.inst("cat").instanceId,
          alternateRequirementIndex: 2,
        }),
      ).toEqual(result);
      if (result.ok) await settle(() => s.perm("base").topCard.cardId === CARD_ID);

      expect(s.perm("base").topCard.cardId).toBe(result.ok ? CARD_ID : base);
      expect(s.state.memory).toBe(result.ok ? 0 : 2);
    },
  );

  it("lets Fly Bullet's Arts Digivolve turn it into that BeelStarmon for free, ignoring requirements (Q6390)", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: CARD_ID, as: "cat" },
            { card: "BT25-092", as: "tamer" },
          ],
          hand: [{ card: "BT25-085", as: "flyBullet" }],
        },
        1: { battleArea: [{ card: "BT1-009", as: "victim" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();
    const flyBulletId = s.inst("flyBullet").instanceId;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: flyBulletId, useAs: "option" })).toEqual({
      ok: true,
    });
    await settle(() => s.perm("cat").topCard.instanceId === flyBulletId);

    expect(s.perm("cat").stack.map((card) => card.cardId)).toEqual([CARD_ID]);
    expect(s.state.players[1]!.battleArea).toHaveLength(0);
    expect(s.state.players[0]!.trash.map((card) => card.cardId)).not.toContain("BT25-085");
    expect(s.state.memory).toBe(4);
  });

  it.each([true, false])(
    "blast digivolves into EX7-059 BeelStarmon for free at the opponent's counter timing (Musketeers Tamer=%s) (Q6391)",
    async (withTamer) => {
      const s = setupEngine(
        {
          0: {
            battleArea: [{ card: CARD_ID, as: "cat" }, ...(withTamer ? [{ card: "BT25-092" }] : [])],
            hand: [{ card: "EX7-059", as: "beel" }],
            security: ["BT1-009"],
          },
          1: { battleArea: [{ card: "BT1-009", as: "attacker" }] },
        },
        { autoAcceptOptional: true, autoSelectCards: true },
      );
      s.state.turnSeat = 1;
      s.state.memory = 0;
      await s.ready();

      expect(
        s.engine.applyIntent(1, {
          type: "attack",
          attackerPermanentId: s.perm("attacker").permanentId,
          target: { kind: "player" },
        }),
      ).toEqual({ ok: true });
      await settle(
        () =>
          s.events.some((event) => event.kind === "counterWindowOpened") || s.state.players[0]!.security.length === 0,
      );
      const blast = s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("cat").permanentId,
        instanceId: s.inst("beel").instanceId,
        useBlastDigivolve: true,
      });
      expect(blast.ok).toBe(withTamer);
      await settle(() => s.perm("cat").topCard.cardId === (withTamer ? "EX7-059" : CARD_ID));

      expect(s.events.some((event) => event.kind === "counterWindowOpened")).toBe(withTamer);
      expect(s.perm("cat").topCard.cardId).toBe(withTamer ? "EX7-059" : CARD_ID);
      expect(s.state.memory).toBe(0);
    },
  );
});
