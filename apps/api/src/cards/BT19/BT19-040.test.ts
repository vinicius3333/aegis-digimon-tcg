import { describe, expect, it } from "vitest";
import { getCardDefinition } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle, type EngineSetup } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "../index.js";
import { compiled } from "./BT19-040.js";

const PIPE_FOX = "TOKEN-Pipe-Fox";

// Inert main-deck Digimon (no printed or inherited text) for deck/security padding: no
// Digi-Egg may sit in either zone, and the numeric `security: n` form is forbidden.
const FILLER = ["BT1-009", "BT1-013", "BT1-009", "BT1-013", "BT1-009", "BT1-013"];
const SECURITY = ["BT1-009", "BT1-013", "BT1-009"];

/** Every Pipe Fox token currently on seat 0's battle area. */
function tokens(s: EngineSetup) {
  return s.state.players[0]!.battleArea.filter((permanent) => permanent.topCard?.cardId === PIPE_FOX);
}

describe("BT19-040 Sakuyamon", () => {
  it("matches the catalog print, evolution cost and banlist restriction", () => {
    expect(getCardDefinition("BT19-040")).toMatchObject({
      cardId: "BT19-040",
      nameEn: "Sakuyamon",
      colors: ["Yellow"],
      kinds: ["Digimon"],
      level: 6,
      playCost: 11,
      dp: 11000,
      forms: ["Mega"],
      attributes: ["Data"],
      types: ["Shaman"],
      evoCosts: [{ color: "Yellow", level: 5, memoryCost: 3 }],
      maxCountInDeck: 4,
    });
    const printed = getCardDefinition("BT19-040")!.effectText!;
    expect(printed).toContain("[Digivolve][Sakuyamon: Maid Mode]: Cost 1");
    expect(printed).toContain(
      "[When Digivolving] ＜Draw 2＞. Then, you may use 1 single-color Option card with a cost of 5 or less from your hand without paying the cost.",
    );
    expect(printed).toContain(
      "[Your Turn] [Once Per Turn] When you use an Option card with a cost of 2 or more, play 1 [Pipe Fox] Token (Digimon/Yellow/6000 DP/＜Blocker＞).",
    );
    // The printed maxCountInDeck stays 4; the 2025-09-01 banlist restricts BT19-040 to 1 copy
    // per deck. That is a deck-construction rule, not a card effect, so nothing in the IR
    // encodes it; `data/kb/banlist.json` is the source and the audit report records it.
  });

  it("compiles the printed clauses to the intended IR shape", () => {
    // The bracketed [Sakuyamon: Maid Mode] route is an EXACT name gate, not a substring one.
    expect(compiled.digivolutionRequirement).toEqual([
      { namesExact: ["Sakuyamon: Maid Mode"], cost: 1, isAlternate: true },
    ]);
    expect(compiled.effects[0]).toMatchObject({
      trigger: "WhenDigivolving",
      actions: [
        { kind: "Draw", controller: "mine", amount: 2 },
        {
          kind: "UseOptionWithoutCost",
          payCost: false,
          optional: true,
          from: ["hand"],
          filter: { controller: "mine", kind: ["Option"], colorCount: 1, playCostLte: 5 },
        },
      ],
    });
    expect(compiled.effects[1]).toMatchObject({
      trigger: "YourTurn",
      frequency: "OncePerTurn",
      actions: [
        {
          kind: "SubTrigger",
          event: "whenOptionUsed",
          fireCondition: { kind: "triggerOptionCostAtLeast", value: 2 },
        },
      ],
    });
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
  });

  it("takes the [Sakuyamon: Maid Mode] route for 1, draws 2, and freely uses only the eligible Option", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            // A realistic Lv6 stack: Renamon -> Reppamon -> Sakuyamon: Maid Mode.
            { card: "BT10-041", as: "maid", under: ["BT1-045", "BT1-051"] },
          ],
          hand: [
            { card: "BT19-040", as: "saku" },
            { card: "BT1-102", as: "eligible" }, // Yellow, single colour, cost 2
            { card: "BT12-104", as: "twoColour" }, // Yellow/Red, cost 5 — fails colorCount 1
            { card: "BT1-107", as: "tooExpensive" }, // Yellow, single colour, cost 6
          ],
          deck: [
            { card: "BT19-030", as: "draw1" },
            { card: "BT19-031", as: "draw2" },
          ],
          security: ["BT1-009", "BT1-010"],
        },
        1: { security: ["BT1-009", "BT1-010"], deck: ["BT1-009"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 3;
    await s.ready();
    const maidId = s.inst("maid").instanceId;
    const sakuId = s.inst("saku").instanceId;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("maid").permanentId,
        instanceId: sakuId,
        useAlternateCost: true,
        alternateRequirementIndex: 0,
      }),
    ).toEqual({ ok: true });
    await settle(() => tokens(s).length === 1);

    // Cost 1 off the alternate route, not the printed evo cost of 3.
    expect(s.state.memory).toBe(2);
    expect(s.perm("saku").topCard!.instanceId).toBe(sakuId);
    expect(s.perm("saku").stack.map((card) => card.cardId)).toEqual(["BT1-045", "BT1-051", "BT10-041"]);
    expect(s.perm("saku").stack.at(-1)!.instanceId).toBe(maidId);

    // ＜Draw 2＞ emptied the deck into hand; the free use trashed only the eligible Option.
    expect(s.state.players[0]!.deck).toHaveLength(0);
    expect(s.state.players[0]!.trash.map((card) => card.cardId)).toEqual(["BT1-102"]);
    expect(s.state.players[0]!.hand.map((card) => card.cardId).sort()).toEqual([
      "BT1-107",
      "BT12-104",
      "BT19-030",
      "BT19-031",
    ]);

    // Q5473: the Option was used without paying its cost, so its ORIGINAL cost of 2 still
    // arms the watcher. One 6000 DP ＜Blocker＞ token, played for free.
    const token = tokens(s)[0]!;
    expect(token.currentDP).toBe(6000);
    expect(getCardDefinition(PIPE_FOX)).toMatchObject({ nameEn: "Pipe Fox", colors: ["Yellow"], dp: 6000 });
    expect(observe(s.engine).hasKeyword(token, "Blocker")).toBe(true);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("still draws 2 when the optional Option use is declined, and plays no token", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT10-041", as: "maid" }],
          hand: [
            { card: "BT19-040", as: "saku" },
            { card: "BT1-102", as: "eligible" },
          ],
          deck: ["BT19-030", "BT19-031"],
          security: ["BT1-009", "BT1-010"],
        },
        1: { security: ["BT1-009", "BT1-010"], deck: ["BT1-009"] },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    s.state.memory = 3;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("maid").permanentId,
        instanceId: s.inst("saku").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.deck.length === 0);

    expect(s.state.players[0]!.hand.map((card) => card.cardId).sort()).toEqual(["BT1-102", "BT19-030", "BT19-031"]);
    expect(s.state.players[0]!.trash).toHaveLength(0);
    expect(tokens(s)).toHaveLength(0);
    expect(s.state.memory).toBe(2);
  });

  it("charges the normal Lv5 route 3, and useAlternateCost falls back to it on a near-miss name", async () => {
    for (const useAlternateCost of [false, true]) {
      const s = setupEngine(
        {
          0: {
            // BT1-059 Piximon: yellow Lv5, no printed effects — the normal-route source.
            battleArea: [{ card: "BT1-059", as: "base" }],
            hand: [{ card: "BT19-040", as: "saku" }],
            deck: ["BT19-030", "BT19-031"],
            security: ["BT1-009", "BT1-010"],
          },
          1: { security: ["BT1-009", "BT1-010"], deck: ["BT1-009"] },
        },
        { autoDeclineOptional: true, autoSelectCards: true },
      );
      s.state.memory = 5;
      await s.ready();
      expect(
        s.engine.applyIntent(0, {
          type: "digivolve",
          permanentId: s.perm("base").permanentId,
          instanceId: s.inst("saku").instanceId,
          ...(useAlternateCost ? { useAlternateCost: true } : {}),
        }),
      ).toEqual({ ok: true });
      await settle(() => s.state.players[0]!.deck.length === 0);
      // Piximon is not [Sakuyamon: Maid Mode], so the cost-1 route never applies: 5 - 3 = 2.
      expect(s.state.memory).toBe(2);
      expect(s.perm("saku").stack.map((card) => card.cardId)).toEqual(["BT1-059"]);
    }
  });

  it.each([
    ["BT1-024", "a red Lv5 source fails the yellow colour requirement"],
    ["BT17-038", "another [Sakuyamon] is Lv6 and is not the exact name [Sakuyamon: Maid Mode]"],
    ["BT1-051", "a yellow Lv4 source is a level below the printed requirement"],
  ])("refuses %s: %s", async (base) => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: base, as: "base" }],
        hand: [{ card: "BT19-040", as: "saku" }],
        deck: ["BT19-030"],
        security: ["BT1-009", "BT1-010"],
      },
      1: { security: ["BT1-009", "BT1-010"], deck: ["BT1-009"] },
    });
    s.state.memory = 10;
    await s.ready();
    const normal = s.engine.applyIntent(0, {
      type: "digivolve",
      permanentId: s.perm("base").permanentId,
      instanceId: s.inst("saku").instanceId,
    });
    const alternate = s.engine.applyIntent(0, {
      type: "digivolve",
      permanentId: s.perm("base").permanentId,
      instanceId: s.inst("saku").instanceId,
      useAlternateCost: true,
    });
    expect(normal.ok).toBe(false);
    expect(alternate.ok).toBe(false);
    expect(s.state.memory).toBe(10);
    expect(s.perm("base").topCard!.cardId).toBe(base);
    expect(s.state.players[0]!.hand.map((card) => card.cardId)).toEqual(["BT19-040"]);
  });

  it("plays one token per turn for a real cost-2 Option use, and resets on the next own turn", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT19-040", as: "saku", under: ["BT10-041"] }],
          hand: [
            { card: "BT1-102", as: "first" },
            { card: "BT1-102", as: "second" },
            { card: "BT1-102", as: "third" },
            { card: "BT1-009", as: "spare" },
          ],
          deck: [...FILLER],
          security: [...SECURITY],
        },
        1: {
          hand: [{ card: "BT1-009", as: "opponentSpare" }],
          deck: [...FILLER],
          security: [...SECURITY],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 6;
    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("first").instanceId })).toEqual({ ok: true });
    await settle(() => tokens(s).length === 1);
    expect(tokens(s)).toHaveLength(1);

    // Same turn, a second cost-2 Option use: [Once Per Turn] refuses a second token.
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("second").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.trash.filter((card) => card.cardId === "BT1-102").length === 2);
    expect(tokens(s)).toHaveLength(1);
    expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });

    // The opponent's whole turn passes through the real loop.
    await advance(s.engine).waitForMainPhase(1);
    await s.ready();
    expect(tokens(s)).toHaveLength(1);
    expect(s.engine.applyIntent(1, { type: "endPhase" })).toEqual({ ok: true });

    // Back on our own turn the allowance is fresh.
    await advance(s.engine).waitForMainPhase(0);
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("third").instanceId })).toEqual({ ok: true });
    await settle(() => tokens(s).length === 2);
    expect(tokens(s)).toHaveLength(2);
    expect(s.state.pendingDecision).toBeUndefined();

    expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  it("stays silent when the OPPONENT uses a cost-2 Option on their own turn ([Your Turn])", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT19-040", as: "saku", under: ["BT10-041"] }],
          hand: [{ card: "BT1-009", as: "spare" }],
          deck: [...FILLER],
          security: [...SECURITY],
        },
        1: {
          // A yellow permanent so the opponent legally meets BT1-102's colour requirement.
          battleArea: [{ card: "BT1-059", as: "opponentYellow" }],
          hand: [
            { card: "BT1-102", as: "opponentOption" },
            { card: "BT1-009", as: "opponentSpare" },
          ],
          deck: [...FILLER],
          security: [...SECURITY],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 3;
    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    await s.ready();
    expect(tokens(s)).toHaveLength(0);
    expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });

    await advance(s.engine).waitForMainPhase(1);
    await s.ready();
    expect(s.engine.applyIntent(1, { type: "playCard", instanceId: s.inst("opponentOption").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[1]!.trash.some((card) => card.cardId === "BT1-102"));
    expect(tokens(s)).toHaveLength(0);

    expect(s.engine.applyIntent(1, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  it("reads the card's own use cost, not the printed cost (Q5471)", async () => {
    // BT7-100 Qualialise Blast prints cost 5 but sets its own use cost to the number of
    // security cards. Q5471: a change to the USE COST ITSELF is what the threshold reads.
    // Its [Main] always puts -3000 DP on an opponent's Digimon, which is the control that the
    // Option really was used in both runs.
    for (const [securityCount, expectedTokens] of [
      [1, 0],
      [3, 1],
    ] as const) {
      const s = setupEngine(
        {
          0: {
            battleArea: [{ card: "BT19-040", as: "saku", under: ["BT10-041"] }],
            hand: [
              { card: "BT7-100", as: "qualialise" },
              { card: "BT1-009", as: "spare" },
            ],
            deck: [...FILLER],
            security: Array.from({ length: securityCount }, () => "BT1-009"),
          },
          1: {
            battleArea: [{ card: "BT1-024", as: "victim" }],
            deck: [...FILLER],
            security: [...SECURITY],
          },
        },
        { autoAcceptOptional: true, autoSelectCards: true },
      );
      s.state.memory = 5;
      const loop = s.engine.startTurnLoop();
      await advance(s.engine).waitForMainPhase(0);
      await s.ready();
      expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("qualialise").instanceId })).toEqual({
        ok: true,
      });
      await settle(() => s.perm("victim").currentDP === 7000);
      expect(s.perm("victim").currentDP).toBe(7000);
      expect(tokens(s)).toHaveLength(expectedTokens);

      expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
      await loop;
    }
  });

  it("plays the token only after the used Option's [Main] effect has resolved (Q5469)", async () => {
    // BT7-100's [Main] gives an opponent's Digimon -3000 DP. Sampling the board at the instant
    // the token first appears shows that body already applied, which is the printed order.
    let victimDpWhenTokenAppeared: number | undefined;
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT19-040", as: "saku", under: ["BT10-041"] }],
          hand: [
            { card: "BT7-100", as: "qualialise" },
            { card: "BT1-009", as: "spare" },
          ],
          deck: [...FILLER],
          security: [...SECURITY],
        },
        1: {
          battleArea: [{ card: "BT1-024", as: "victim" }],
          deck: [...FILLER],
          security: [...SECURITY],
        },
      },
      {
        autoAcceptOptional: true,
        autoSelectCards: true,
        onEvent() {
          if (victimDpWhenTokenAppeared !== undefined) return;
          const token = s.state.players[0]!.battleArea.find((permanent) => permanent.topCard?.cardId === PIPE_FOX);
          if (token === undefined) return;
          victimDpWhenTokenAppeared = s.state.players[1]!.battleArea[0]!.currentDP;
        },
      },
    );
    s.state.memory = 5;
    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("qualialise").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => tokens(s).length === 1);
    expect(victimDpWhenTokenAppeared).toBe(7000);
    expect(s.perm("victim").currentDP).toBe(7000);
    expect(s.state.players[0]!.trash.map((card) => card.cardId)).toEqual(["BT7-100"]);

    expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  it("still fires when only the cost TO PAY is reduced below 2 (Q5472)", async () => {
    // BT17-035 Taomon uses a yellow Option from hand "with the cost reduced by 2". BT1-102's
    // own use cost stays 2 while nothing is paid, so the threshold still sees 2.
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT19-040", as: "saku", under: ["BT10-041"] },
            { card: "BT1-051", as: "base", under: ["BT1-045"] },
          ],
          hand: [
            { card: "BT17-035", as: "taomon" },
            { card: "BT1-102", as: "freeOption" },
            { card: "BT1-009", as: "spare" },
          ],
          deck: [...FILLER],
          security: [...SECURITY],
        },
        1: { deck: [...FILLER], security: [...SECURITY] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 5;
    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("taomon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => tokens(s).length === 1);

    // 5 - 3 for the digivolution and nothing for the Option: its 2 was fully reduced away.
    expect(s.state.memory).toBe(2);
    expect(s.state.players[0]!.trash.map((card) => card.cardId)).toEqual(["BT1-102"]);
    expect(tokens(s)).toHaveLength(1);
    expect(tokens(s)[0]!.currentDP).toBe(6000);

    expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  it("stays silent when an Option's effect activates without being used (Q5470)", async () => {
    // BT13-106 Odin's Breath activates its own [Main] when an effect trashes it from security.
    // That is an activation, not a use, so the watcher must not fire — while the [Main] body
    // itself demonstrably resolves.
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT19-040", as: "saku", under: ["BT10-041"] }],
          deck: ["BT1-009", "BT1-010"],
          security: [{ card: "BT13-106", as: "odin" }, "BT1-009"],
        },
        1: {
          battleArea: [{ card: "BT1-024", as: "victim" }],
          deck: ["BT1-009", "BT1-010"],
          security: ["BT1-009", "BT1-010"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    await advance(s.engine).verb.trashFromSecurity(0, 1, { fromTop: true });
    await settle(() => s.state.players[0]!.trash.some((card) => card.cardId === "BT13-106"));
    await settle(() => s.perm("victim").currentDP < 10000);

    expect(s.perm("victim").currentDP).toBe(7000);
    expect(tokens(s)).toHaveLength(0);
    expect(s.state.players[0]!.security.map((card) => card.cardId)).toEqual(["BT1-009"]);
  });

  it("plays a token that really blocks an opponent's attack", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT19-040", as: "saku", under: ["BT10-041"] }],
          hand: [
            { card: "BT1-102", as: "option" },
            { card: "BT1-009", as: "spare" },
          ],
          deck: [...FILLER],
          security: [...SECURITY],
        },
        1: {
          battleArea: [{ card: "BT1-024", as: "attacker" }],
          hand: [{ card: "BT1-009", as: "opponentSpare" }],
          deck: [...FILLER],
          security: [...SECURITY],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 3;
    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => tokens(s).length === 1);
    const tokenId = tokens(s)[0]!.permanentId;
    expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });

    await advance(s.engine).waitForMainPhase(1);
    await s.ready();
    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.events.some((event) => event.kind === "blockWindowOpened"));
    // ＜Blocker＞ proved by its rules consequence: the token is offered as a legal blocker and
    // takes the attack instead of the security stack.
    expect(s.engine.applyIntent(0, { type: "declareBlock", blockerPermanentId: tokenId })).toEqual({ ok: true });
    await settle(() => !observe(s.engine).isAttacking());
    expect(s.state.players[0]!.security).toHaveLength(SECURITY.length);
    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.permanentId === tokenId)).toBe(false);

    expect(s.engine.applyIntent(1, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });
});
