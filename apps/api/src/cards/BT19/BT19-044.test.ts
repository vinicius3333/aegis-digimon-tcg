import { describe, expect, it } from "vitest";
import { EffectTiming, getCardDefinition } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./BT19-044.js";
import "../index.js";

// BT19-044 Terriermon (Green, Lv.3, Rookie/Vaccine/Beast, DP 1000, play 3, digivolve Green Lv.2 cost 0)
//   [Start of Your Main Phase] If you have [Henry Wong]/[Calumon], gain 1 memory.
//   Inherited: [When Attacking] [Once Per Turn] Suspend 1 of your opponent's Digimon.
//
// Peers used for the exact-name gate: ST17-10 [Henry Wong] and BT19-077 [Calumon] match;
// EX4-063 [Henry Wong & Shu-Chong Wong] is the near miss (substring only, and it prints no
// "also treated as [Henry Wong]" line), BT19-081 [Kiriha Aonuma] is the unrelated Tamer.
// Inert fixtures are main-deck Digimon (BT1-009..BT1-014); no Digi-Egg is seeded in deck
// or security.

const inertSecurity = ["BT1-009", "BT1-013", "BT1-012"];
const inertDeck = ["BT1-009", "BT1-013", "BT1-012", "BT1-014"];

describe("BT19-044 Terriermon", () => {
  it("matches the catalog printing", () => {
    expect(getCardDefinition("BT19-044")).toMatchObject({
      cardId: "BT19-044",
      nameEn: "Terriermon",
      colors: ["Green"],
      kinds: ["Digimon"],
      level: 3,
      playCost: 3,
      dp: 1000,
      forms: ["Rookie"],
      attributes: ["Vaccine"],
      types: ["Beast"],
      evoCosts: [{ color: "Green", level: 2, memoryCost: 0 }],
      effectText: "[Start of Your Main Phase] If you have [Henry Wong]/[Calumon], gain 1 memory.",
      inheritedEffectText: "[When Attacking] [Once Per Turn] Suspend 1 of your opponent's Digimon.",
    });
  });

  it("compiles the printed clauses: exact-name gate, and a once-per-turn inherited suspension", () => {
    expect(compiled.effects?.[0]).toMatchObject({
      trigger: "StartOfYourMainPhase",
      actions: [
        {
          kind: "GainMemory",
          amount: 1,
          condition: {
            kind: "youHave",
            filter: {
              controllerDefault: "mine",
              // Bracketed [Name] references are EXACT, never the substring `match: "name"`.
              nameOrTrait: [{ tokens: ["Henry Wong", "Calumon"], match: "nameExact" }],
            },
          },
        },
      ],
    });
    expect(compiled.effects?.[1]).toMatchObject({
      trigger: "WhenAttacking",
      isInherited: true,
      frequency: "OncePerTurn",
      actions: [{ kind: "Suspend", target: { filter: { controller: "opponent", kind: ["Digimon"] }, count: 1 } }],
    });
    // No `suspended: false`: the printed text does not restrict the choice (KB Q845).
    expect(JSON.stringify(compiled)).not.toContain("suspended");
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
  });

  it.each([
    ["ST17-10", "Henry Wong"],
    ["BT19-077", "Calumon"],
  ])("gains exactly 1 memory inside the open Main phase with %s in play", async (support) => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT19-044", as: "terrier" }, { card: support }],
          hand: [{ card: "BT1-009", as: "spare" }],
          deck: inertDeck,
          security: inertSecurity,
        },
        1: { deck: inertDeck, security: inertSecurity },
      },
      { autoDeclineOptional: true },
    );
    s.state.memory = 0;
    await s.ready();

    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    await settle(() => s.state.memory === 1);
    // Read the value INSIDE the open Main phase: after the phase passes, memory is the
    // post-pass value and proves nothing.
    expect(s.state.memory).toBe(1);
    expect(s.perm("terrier").isSuspended).toBe(false);

    expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  it.each([
    ["EX4-063", "Henry Wong & Shu-Chong Wong (substring, not the exact name)"],
    ["BT19-081", "Kiriha Aonuma (unrelated Tamer)"],
  ])("gains no memory with %s in play — %s", async (peer) => {
    const s = setupEngine(
      {
        0: {
          // A second Digimon keeps EX4-063's own "1 or fewer Digimon" clause from firing,
          // so the only candidate memory gain in the window is Terriermon's.
          battleArea: [{ card: "BT19-044", as: "terrier" }, { card: "BT1-009" }, { card: peer }],
          hand: [{ card: "BT1-009", as: "spare" }],
          deck: inertDeck,
          security: inertSecurity,
        },
        1: { deck: inertDeck, security: inertSecurity },
      },
      { autoDeclineOptional: true },
    );
    s.state.memory = 0;
    await s.ready();

    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    await settle();
    expect(s.state.memory).toBe(0);

    expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  it("does not read the OPPONENT's [Henry Wong] as its own", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT19-044", as: "terrier" }],
          hand: [{ card: "BT1-009", as: "spare" }],
          deck: inertDeck,
          security: inertSecurity,
        },
        1: { battleArea: [{ card: "ST17-10", as: "theirHenry" }], deck: inertDeck, security: inertSecurity },
      },
      { autoDeclineOptional: true },
    );
    s.state.memory = 0;
    await s.ready();

    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    await settle();
    expect(s.state.memory).toBe(0);
    expect(s.perm("theirHenry").controllerSeat).toBe(1);

    expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  it("suspends exactly 1 opponent Digimon — never a Tamer, never our own — on a real attack", async () => {
    // Realistic stack: Terriermon (Green Lv.3) under BT19-049 Gargomon (Green Lv.4, digivolve
    // from Green Lv.3), so the inherited clause runs under a legal host.
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT19-049", as: "host", under: ["BT19-044"] },
            { card: "BT1-009", as: "ours" },
          ],
          hand: [{ card: "BT1-009", as: "spare" }],
          deck: inertDeck,
          security: inertSecurity,
        },
        1: {
          battleArea: [
            { card: "BT1-013", as: "theirDigimon" },
            { card: "ST17-10", as: "theirTamer" },
          ],
          deck: inertDeck,
          security: inertSecurity,
        },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    await s.ready();

    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("theirDigimon").isSuspended);

    expect(s.perm("theirDigimon").isSuspended).toBe(true);
    expect(s.perm("theirTamer").isSuspended).toBe(false);
    expect(s.perm("ours").isSuspended).toBe(false);
    // The attack itself resolved: the attacker is suspended and one security card was checked.
    expect(s.perm("host").isSuspended).toBe(true);
    expect(s.state.players[1]!.security).toHaveLength(inertSecurity.length - 1);
    expect(s.perm("host").stack.map((card) => card.cardId)).toEqual(["BT19-044"]);

    expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  it("may choose an ALREADY-suspended Digimon, leaving the unsuspended peer alone (KB Q845)", async () => {
    // ST18-10 Q845: "Even if you specify an already suspended Digimon as the target for a
    // suspending effect, it isn't considered to be suspended by the effect." The printed text
    // says only "1 of your opponent's Digimon", so the suspended one is a legal choice.
    const preferInstanceIds: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT19-049", as: "host", under: ["BT19-044"] }],
          hand: [{ card: "BT1-009", as: "spare" }],
          deck: inertDeck,
          security: inertSecurity,
        },
        1: {
          battleArea: [
            { card: "BT1-013", as: "already", suspended: true },
            { card: "BT1-012", as: "fresh" },
          ],
          deck: inertDeck,
          security: inertSecurity,
        },
      },
      { autoDeclineOptional: true, autoSelectCards: true, preferInstanceIds },
    );
    preferInstanceIds.push(s.perm("already").topCard!.instanceId);
    await s.ready();

    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    // Seat 1's permanent seeded `suspended: true` would stand up at ITS unsuspend phase; seat
    // 0 attacks on the very first turn, so it is still suspended here.
    expect(s.perm("already").isSuspended).toBe(true);
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("host").isSuspended);
    await settle();

    expect(s.perm("already").isSuspended).toBe(true);
    expect(s.perm("fresh").isSuspended).toBe(false);

    expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  it("fires once per turn and refreshes on our next real turn", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT19-049", as: "host", under: ["BT19-044"] }],
          hand: [{ card: "BT1-009", as: "spare" }],
          deck: inertDeck,
          security: inertSecurity,
        },
        1: {
          battleArea: [
            { card: "BT1-013", as: "first" },
            { card: "BT1-012", as: "second" },
          ],
          deck: inertDeck,
          security: [...inertSecurity, "BT1-014"],
        },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    await s.ready();

    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("host").isSuspended);
    await settle();
    const suspendedAfterFirst = ["first", "second"].filter((alias) => s.perm(alias).isSuspended);
    expect(suspendedAfterFirst).toHaveLength(1);

    // Same turn, second firing of the same window: the [Once Per Turn] budget is spent.
    // Injected timing only — no public intent re-opens a When Attacking window for an
    // attacker that is already suspended.
    await advance(s.engine).fire(EffectTiming.OnUseAttack, s.perm("host"));
    await settle();
    expect(["first", "second"].filter((alias) => s.perm(alias).isSuspended)).toEqual(suspendedAfterFirst);
    expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });

    // The opponent's real turn, driven by the loop rather than by setting turnSeat.
    await advance(s.engine).waitForMainPhase(1);
    expect(s.engine.applyIntent(1, { type: "endPhase" })).toEqual({ ok: true });

    // Our next own turn: the host unsuspended in the real unsuspend phase and the budget reset.
    await advance(s.engine).waitForMainPhase(0);
    expect(s.perm("host").isSuspended).toBe(false);
    // Both opponent Digimon stood up in seat 1's own unsuspend phase, so a fresh firing is
    // the only thing that can suspend one again.
    expect(["first", "second"].filter((alias) => s.perm(alias).isSuspended)).toEqual([]);
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => ["first", "second"].some((alias) => s.perm(alias).isSuspended));
    await settle();
    expect(["first", "second"].filter((alias) => s.perm(alias).isSuspended)).toHaveLength(1);

    expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  it("takes the printed Green Lv.2 route for cost 0 and refuses an off-color Lv.2 source", async () => {
    const legal = setupEngine({
      0: {
        breeding: { card: "BT1-007", as: "tanemon" },
        hand: [{ card: "BT19-044", as: "terrier" }],
        deck: inertDeck,
        security: inertSecurity,
      },
      1: { deck: inertDeck, security: inertSecurity },
    });
    legal.state.memory = 3;
    await legal.ready();
    const tanemonId = legal.inst("tanemon").instanceId;
    expect(
      legal.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: legal.perm("tanemon").permanentId,
        instanceId: legal.inst("terrier").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => legal.perm("tanemon").topCard?.cardId === "BT19-044");
    // Cost 0 from the printed Green Lv.2 route, and the source stays as a digivolution card.
    expect(legal.state.memory).toBe(3);
    expect(legal.perm("tanemon").stack.map((card) => card.instanceId)).toEqual([tanemonId]);
    expect(legal.state.players[0]!.hand.some((card) => card.cardId === "BT19-044")).toBe(false);

    const illegal = setupEngine({
      0: {
        // BT1-005 Kyaromon is a YELLOW Lv.2: no printed route reaches this Green Lv.3.
        breeding: { card: "BT1-005", as: "kyaromon" },
        hand: [{ card: "BT19-044", as: "terrier" }],
        deck: inertDeck,
        security: inertSecurity,
      },
      1: { deck: inertDeck, security: inertSecurity },
    });
    illegal.state.memory = 3;
    await illegal.ready();
    for (const useAlternateCost of [true, false]) {
      expect(
        illegal.engine.applyIntent(0, {
          type: "digivolve",
          permanentId: illegal.perm("kyaromon").permanentId,
          instanceId: illegal.inst("terrier").instanceId,
          useAlternateCost,
        }),
      ).not.toEqual({ ok: true });
    }
    expect(illegal.perm("kyaromon").topCard?.cardId).toBe("BT1-005");
    expect(illegal.state.players[0]!.hand.map((card) => card.cardId)).toEqual(["BT19-044"]);
    expect(illegal.state.memory).toBe(3);
  });
});
