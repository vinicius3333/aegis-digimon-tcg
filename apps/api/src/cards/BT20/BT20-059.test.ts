import { getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle, type BoardSpec, type SeatSpec } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { compiled } from "./BT20-059.js";
import "./index.js";
import "../BT5/BT5-035.js";
import "../BT1/BT1-055.js";
import "../BT1/BT1-070.js";
import "../BT15/BT15-041.js";
import "../EX4/EX4-018.js";
import "../P/P-134.js";

describe("BT20-059 Gankoomon (X Antibody)", () => {
  it("publishes the complete catalog identity and printed clauses", () => {
    expect(getCardDefinition("BT20-059")).toMatchObject({
      cardId: "BT20-059",
      nameEn: "Gankoomon (X Antibody)",
      colors: ["Black"],
      kinds: ["Digimon"],
      level: 6,
      playCost: 13,
      dp: 13000,
      evoCosts: [
        { color: "Black", level: 5, memoryCost: 5 },
        { color: "Red", level: 5, memoryCost: 5 },
      ],
      forms: ["Mega"],
      attributes: ["Data"],
      types: ["Holy Warrior", "X Antibody", "Royal Knight"],
    });
    expect(getCardDefinition("BT20-059")!.effectText).toContain("＜De-Digivolve 2＞");
    expect(getCardDefinition("BT20-059")!.effectText).toContain("none of your Digimon are affected");
    expect(getCardDefinition("BT20-059")!.effectText).toContain("[Sistermon]/[Huckmon]");
    expect(getCardDefinition("BT20-059")!.inheritedEffectText).toBe(
      "[Opponent's Turn] While this Digimon is [Jesmon GX] all of your Digimon gain ＜Reboot＞ and ＜Blocker＞.",
    );
  });

  it("de-digivolves one opposing Digimon and conditionally protects all own Digimon", () => {
    expect(compiled.effects.find((effect) => effect.trigger === "WhenDigivolving")).toMatchObject({
      actions: [
        { kind: "DeDigivolve", amount: 2, target: { filter: { controller: "opponent", kind: ["Digimon"] }, count: 1 } },
        {
          kind: "GrantStatic",
          grant: "immuneToOpponentDigimonEffects",
          duration: "untilOpponentTurnEnd",
          target: { filter: { controller: "mine", kind: ["Digimon"] }, count: "all" },
          condition: {
            kind: "selfDigivolutionStackMatchesFilter",
            filter: {
              nameOrTrait: [
                { tokens: ["Gankoomon"], match: "nameExact" },
                { tokens: ["X Antibody"], match: "nameExact" },
              ],
            },
          },
        },
      ],
    });
  });

  it("grants Reboot and Blocker to own Sistermon/Huckmon or Royal Knight Digimon during the opponent's turn", () => {
    const effect = compiled.effects.find((entry) => entry.trigger === "OpponentsTurn" && !entry.isInherited);
    expect(effect?.actions).toMatchObject([
      {
        kind: "GainKeyword",
        keyword: { keyword: "Reboot" },
        duration: "untilOpponentTurnEnd",
        target: {
          count: "all",
          filter: {
            nameOrTrait: [
              { tokens: ["Sistermon", "Huckmon"], match: "name" },
              { tokens: ["Royal Knight"], match: "trait" },
            ],
          },
        },
      },
      { kind: "GainKeyword", keyword: { keyword: "Blocker" }, duration: "untilOpponentTurnEnd" },
    ]);
  });

  it("gives all own Digimon Reboot and Blocker when the inherited host is Jesmon GX", () => {
    const effect = compiled.effects.find((entry) => entry.isInherited);
    expect(effect).toMatchObject({
      trigger: "OpponentsTurn",
      actions: [
        {
          kind: "GainKeyword",
          keyword: { keyword: "Reboot" },
          condition: {
            kind: "selfTopHasText",
            filter: { nameOrTrait: [{ tokens: ["Jesmon GX"], match: "nameExact" }] },
          },
        },
        {
          kind: "GainKeyword",
          keyword: { keyword: "Blocker" },
          condition: {
            kind: "selfTopHasText",
            filter: { nameOrTrait: [{ tokens: ["Jesmon GX"], match: "nameExact" }] },
          },
        },
      ],
    });
  });

  it("de-digivolves by 2 and protects all allies only with Gankoomon or X Antibody underneath", async () => {
    for (const [base, cost, protects, extraSource] of [
      ["BT20-057", 2, true, undefined],
      ["BT20-053", 5, false, undefined],
      ["BT20-054", 5, false, undefined],
      ["BT20-054", 5, true, "BT9-109"],
      ["BT20-054", 5, true, "EX5-070"],
    ] as const) {
      const s = setupEngine(
        {
          0: {
            battleArea: [
              {
                card: base,
                as: "base",
                under: [
                  ...(extraSource ? [extraSource] : []),
                  "BT13-005",
                  "BT20-048",
                  "BT20-051",
                  ...(base === "BT20-057" ? ["BT20-054"] : []),
                ],
              },
              { card: "BT20-057", as: "ally", under: ["BT20-054"] },
            ],
            hand: [{ card: "BT20-059", as: "gankoomonX" }],
            deck: ["BT1-010", "BT1-010", "BT1-010"],
          },
          1: {
            battleArea: [{ card: "BT20-053", under: ["BT13-005", "BT20-048", "BT20-051"], as: "target" }],
            hand: [{ card: "BT5-035", as: "starmons" }],
            deck: ["BT1-010", "BT1-010", "BT1-010"],
          },
        },
        { autoSelectCards: true },
      );
      s.state.memory = 5;
      await s.ready();
      const loop = s.engine.startTurnLoop();
      await advance(s.engine).waitForMainPhase(0);
      expect(
        s.engine.applyIntent(0, {
          type: "digivolve",
          permanentId: s.perm("base").permanentId,
          instanceId: s.inst("gankoomonX").instanceId,
          ...(base === "BT20-057" ? { useAlternateCost: true } : {}),
        }),
      ).toEqual({ ok: true });
      await settle(() => s.perm("target").stack.length === 1);
      await settle();
      expect(s.state.memory).toBe(5 - cost);
      expect(s.perm("ally").stack.map((card) => card.cardId)).toEqual(["BT20-054"]);
      for (const alias of ["base", "ally"]) {
        expect(observe(s.engine).isRestrictedByEffect(s.perm(alias), "beAffected", "Digimon")).toBe(protects);
      }
      advance(s.engine).endMainPhaseIfOpen(0);
      await advance(s.engine).waitForMainPhase(1);
      const beforeDP = s.perm("base").currentDP;
      expect(s.engine.applyIntent(1, { type: "playCard", instanceId: s.inst("starmons").instanceId })).toEqual({
        ok: true,
      });
      await settle(
        () =>
          s.events.some((event) => event.kind === "effectResolved" && event.sourceCardId === "BT5-035") &&
          s.state.pendingDecision === undefined,
      );
      expect(s.perm("base").currentDP).toBe(beforeDP - (protects ? 0 : 2000));
      advance(s.engine).endMainPhaseIfOpen(1);
      await advance(s.engine).waitForMainPhase(0);
      expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
      await loop;
    }
  });

  it("grants Reboot and Blocker only to the resident Sistermon/Huckmon/Royal Knight population", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "BT20-059", as: "source" },
          { card: "BT10-085", as: "sistermon" },
          { card: "BT20-014", as: "huckmonName" },
          { card: "BT20-017", as: "royalKnight" },
          { card: "BT20-048", as: "nonmatch" },
        ],
        deck: ["BT1-010", "BT1-010"],
      },
      1: { deck: ["BT1-010", "BT1-010"] },
    });
    await s.ready();
    expect(observe(s.engine).hasKeyword(s.perm("nonmatch"), "Reboot")).toBe(false);
    expect(observe(s.engine).hasKeyword(s.perm("nonmatch"), "Blocker")).toBe(false);
    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    advance(s.engine).endMainPhaseIfOpen(0);
    await advance(s.engine).waitForMainPhase(1);
    expect(
      Object.fromEntries(
        ["source", "sistermon", "huckmonName", "royalKnight"].map((alias) => [
          alias,
          {
            reboot: observe(s.engine).hasKeyword(s.perm(alias), "Reboot"),
            blocker: observe(s.engine).hasKeyword(s.perm(alias), "Blocker"),
          },
        ]),
      ),
    ).toEqual({
      source: { reboot: true, blocker: true },
      sistermon: { reboot: true, blocker: true },
      huckmonName: { reboot: true, blocker: true },
      royalKnight: { reboot: true, blocker: true },
    });
    expect(observe(s.engine).hasKeyword(s.perm("nonmatch"), "Reboot")).toBe(false);
    expect(observe(s.engine).hasKeyword(s.perm("nonmatch"), "Blocker")).toBe(false);
    expect(s.engine.applyIntent(1, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  it("inherits the all-Digimon keyword grant only under Jesmon GX", async () => {
    for (const [host, expected] of [
      ["BT10-112", true],
      ["BT20-060", false],
      ["BT10-016", false],
    ] as const) {
      const s = setupEngine({
        0: {
          battleArea: [
            { card: host, under: ["BT20-059"], as: "host" },
            { card: "BT20-048", as: "nonmatch" },
          ],
          deck: ["BT1-010", "BT1-010"],
        },
        1: { deck: ["BT1-010", "BT1-010"] },
      });
      await s.ready();
      const loop = s.engine.startTurnLoop();
      await advance(s.engine).waitForMainPhase(0);
      advance(s.engine).endMainPhaseIfOpen(0);
      await advance(s.engine).waitForMainPhase(1);
      expect(observe(s.engine).hasKeyword(s.perm("nonmatch"), "Reboot")).toBe(expected);
      expect(observe(s.engine).hasKeyword(s.perm("nonmatch"), "Blocker")).toBe(expected);
      expect(s.engine.applyIntent(1, { type: "surrender" })).toEqual({ ok: true });
      await loop;
    }
  });

  it("expires the opponent-turn immunity and keyword grants at the real opponent turn end", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT20-057", as: "base" }],
        hand: [{ card: "BT20-059", as: "gankoomonX" }],
        deck: ["BT1-010", "BT1-010", "BT1-010", "BT1-010"],
      },
      1: { deck: ["BT1-010", "BT1-010", "BT1-010", "BT1-010"] },
    });
    s.state.memory = 10;
    await s.ready();
    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("gankoomonX").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard.cardId === "BT20-059");
    expect(observe(s.engine).isRestrictedByEffect(s.perm("base"), "beAffected", "Digimon")).toBe(true);
    advance(s.engine).endMainPhaseIfOpen(0);
    await advance(s.engine).waitForMainPhase(1);
    await settle(() => observe(s.engine).hasKeyword(s.perm("base"), "Reboot"));
    expect(observe(s.engine).hasKeyword(s.perm("base"), "Reboot")).toBe(true);
    expect(observe(s.engine).hasKeyword(s.perm("base"), "Blocker")).toBe(true);
    advance(s.engine).endMainPhaseIfOpen(1);
    await advance(s.engine).waitForMainPhase(0);
    expect(observe(s.engine).isRestrictedByEffect(s.perm("base"), "beAffected", "Digimon")).toBe(false);
    expect(observe(s.engine).hasKeyword(s.perm("base"), "Reboot")).toBe(false);
    expect(observe(s.engine).hasKeyword(s.perm("base"), "Blocker")).toBe(false);
    expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });
});

type Setup = ReturnType<typeof setupEngine>;

const opponentDeck = Array.from({ length: 10 }, () => "BT1-009");

function setupProtectionBoard(board: BoardSpec): { s: Setup; preferred: string[] } {
  const preferred: string[] = [];
  const s = setupEngine(board, { autoSelectCards: true, autoDeclineOptional: true, preferInstanceIds: preferred });
  return { s, preferred };
}

function preferTarget(s: Setup, preferred: string[], alias: string): void {
  preferred.splice(0, preferred.length, s.perm(alias).topCard!.instanceId);
}

function isImmuneToOpponentDigimon(s: Setup, alias: string): boolean {
  return observe(s.engine).hasRestriction(s.perm(alias), "beAffected", "Digimon");
}

async function digivolveIntoGankoomonX(s: Setup, protectedAlias: string): Promise<void> {
  s.state.turnSeat = 0;
  s.state.memory = 10;
  expect(
    s.engine.applyIntent(0, {
      type: "digivolve",
      permanentId: s.perm("gankoomon").permanentId,
      instanceId: s.inst("gankoomonX").instanceId,
      useAlternateCost: true,
    }),
  ).toEqual({ ok: true });
  await settle(() => isImmuneToOpponentDigimon(s, protectedAlias));
  await settle();
  expect(s.perm("gankoomon").topCard.cardId).toBe("BT20-059");
  expect(isImmuneToOpponentDigimon(s, protectedAlias)).toBe(true);
}

async function playAs(s: Setup, seat: 0 | 1, alias: string): Promise<void> {
  s.state.turnSeat = seat;
  s.state.memory = 20;
  expect(s.engine.applyIntent(seat, { type: "playCard", instanceId: s.inst(alias).instanceId })).toEqual({ ok: true });
  await settle();
}

function wasOfferedToOpponent(s: Setup, alias: string): boolean {
  const ids = [s.perm(alias).permanentId, s.perm(alias).topCard!.instanceId];
  return s.decisions
    .filter(({ seat, req }) => seat === 1 && req.kind === "chooseTargets")
    .flatMap(({ req }) => req.options?.candidateInstanceIds ?? [])
    .some((id) => ids.includes(id));
}

async function attackPlayer(s: Setup, alias: string): Promise<void> {
  s.state.turnSeat = 0;
  s.state.memory = 10;
  expect(
    s.engine.applyIntent(0, {
      type: "attack",
      attackerPermanentId: s.perm(alias).permanentId,
      target: { kind: "player" },
    }),
  ).toEqual({ ok: true });
  await settle(() => !observe(s.engine).isAttacking());
}

function gankoomonBoard(allies: NonNullable<SeatSpec["battleArea"]>, opponent: SeatSpec): BoardSpec {
  return {
    0: {
      hand: [{ card: "BT20-059", as: "gankoomonX" }],
      battleArea: [{ card: "BT20-057", as: "gankoomon" }, ...allies],
    },
    1: opponent,
  };
}

describe("BT20-059 Gankoomon (X Antibody) — KB Q&A rulings", () => {
  it("keeps all own Digimon from being suspended or losing DP to opponent Digimon effects (Q4392)", async () => {
    async function allyAfterKuwagamonAndAngemon(protect: boolean) {
      const { s, preferred } = setupProtectionBoard(
        gankoomonBoard([{ card: "BT1-013", as: "ally" }], {
          hand: [
            { card: "BT1-070", as: "kuwagamon" },
            { card: "BT1-055", as: "angemon" },
          ],
        }),
      );
      await s.ready();
      if (protect) await digivolveIntoGankoomonX(s, "ally");
      preferTarget(s, preferred, "ally");
      await playAs(s, 1, "kuwagamon");
      await playAs(s, 1, "angemon");
      return { suspended: s.perm("ally").isSuspended, dp: s.perm("ally").currentDP };
    }

    expect(await allyAfterKuwagamonAndAngemon(true)).toEqual({ suspended: false, dp: 5000 });
    expect(await allyAfterKuwagamonAndAngemon(false)).toEqual({ suspended: true, dp: 2000 });
  });

  it("lets the opponent choose an unaffected Digimon for a suspend effect, which then does nothing (Q4393)", async () => {
    const { s, preferred } = setupProtectionBoard(
      gankoomonBoard([{ card: "BT1-013", as: "ally" }], { hand: [{ card: "BT1-070", as: "kuwagamon" }] }),
    );
    await s.ready();
    await digivolveIntoGankoomonX(s, "ally");

    preferTarget(s, preferred, "ally");
    await playAs(s, 1, "kuwagamon");

    expect(wasOfferedToOpponent(s, "ally")).toBe(true);
    expect(s.state.players[0]!.battleArea.filter((permanent) => permanent.isSuspended)).toHaveLength(0);
  });

  it("can be given Security Attack -1 by an opponent Digimon but is not affected by it (Q4394)", async () => {
    async function attackAfterShoemon(protect: boolean) {
      const { s, preferred } = setupProtectionBoard(
        gankoomonBoard([{ card: "BT1-013", as: "attacker" }], {
          hand: [{ card: "P-134", as: "shoemon" }],
          security: ["BT1-009", "BT1-009"],
        }),
      );
      await s.ready();
      if (protect) await digivolveIntoGankoomonX(s, "attacker");
      preferTarget(s, preferred, "attacker");
      await playAs(s, 1, "shoemon");
      const offered = wasOfferedToOpponent(s, "attacker");
      const securityAttack = observe(s.engine).keywordAmount(s.perm("attacker"), "SecurityAttack");
      await attackPlayer(s, "attacker");
      return { offered, securityAttack, remainingSecurity: s.state.players[1]!.security.length };
    }

    expect(await attackAfterShoemon(true)).toEqual({ offered: true, securityAttack: 0, remainingSecurity: 1 });
    expect(await attackAfterShoemon(false)).toEqual({ offered: true, securityAttack: -1, remainingSecurity: 2 });

    const { s, preferred } = setupProtectionBoard({
      0: {
        hand: [{ card: "BT20-059", as: "gankoomonX" }],
        battleArea: [
          { card: "BT20-057", as: "gankoomon" },
          { card: "BT1-013", as: "attacker" },
        ],
        deck: opponentDeck,
      },
      1: { hand: [{ card: "P-134", as: "shoemon" }], deck: opponentDeck },
    });
    s.state.turnSeat = 0;
    await s.ready();
    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    await digivolveIntoGankoomonX(s, "attacker");
    expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });

    await advance(s.engine).waitForMainPhase(1);
    s.state.memory = 10;
    preferTarget(s, preferred, "attacker");
    expect(s.engine.applyIntent(1, { type: "playCard", instanceId: s.inst("shoemon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.events.some((event) => event.kind === "effectResolved" && event.sourceCardId === "P-134"));
    await settle();
    expect(observe(s.engine).keywordAmount(s.perm("attacker"), "SecurityAttack")).toBe(0);
    expect(s.engine.applyIntent(1, { type: "endPhase" })).toEqual({ ok: true });

    await advance(s.engine).waitForMainPhase(0);
    expect(isImmuneToOpponentDigimon(s, "attacker")).toBe(false);
    expect(observe(s.engine).keywordAmount(s.perm("attacker"), "SecurityAttack")).toBe(-1);
    expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  it("stops an existing opponent DP reduction as soon as the Digimon gains the immunity (Q4395)", async () => {
    const { s, preferred } = setupProtectionBoard(
      gankoomonBoard([{ card: "BT1-013", as: "reduced", dp: 9000 }], { hand: [{ card: "BT15-041", as: "babamon" }] }),
    );
    await s.ready();
    preferTarget(s, preferred, "reduced");
    await playAs(s, 1, "babamon");
    expect(s.perm("reduced").currentDP).toBe(3000);

    await digivolveIntoGankoomonX(s, "reduced");
    await settle(() => s.perm("reduced").currentDP === 9000);
    expect(s.perm("reduced").currentDP).toBe(9000);
  });

  it("applies an opponent effect given during the immunity once the immunity ends (Q4396)", async () => {
    const { s, preferred } = setupProtectionBoard({
      0: {
        hand: [{ card: "BT20-059", as: "gankoomonX" }],
        battleArea: [
          { card: "BT20-057", as: "gankoomon" },
          { card: "BT1-013", as: "protected", dp: 9000 },
        ],
        deck: opponentDeck,
      },
      1: { hand: [{ card: "BT15-041", as: "babamon" }], deck: opponentDeck },
    });
    s.state.turnSeat = 0;
    await s.ready();
    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    await digivolveIntoGankoomonX(s, "protected");
    expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });

    await advance(s.engine).waitForMainPhase(1);
    s.state.memory = 10;
    preferTarget(s, preferred, "protected");
    expect(s.engine.applyIntent(1, { type: "playCard", instanceId: s.inst("babamon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[1]!.battleArea.some((permanent) => permanent.topCard?.cardId === "BT15-041"));
    await settle();
    expect(s.perm("protected").currentDP).toBe(9000);
    expect(s.engine.applyIntent(1, { type: "endPhase" })).toEqual({ ok: true });

    await advance(s.engine).waitForMainPhase(0);
    expect(isImmuneToOpponentDigimon(s, "protected")).toBe(false);
    expect(s.perm("protected").currentDP).toBe(3000);
    expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  it("does not trigger an opponent-given [When Attacking] effect while the Digimon is unaffected (Q4397)", async () => {
    async function memoryAfterAttack(protect: boolean): Promise<number> {
      const { s, preferred } = setupProtectionBoard(
        gankoomonBoard(
          [
            { card: "BT1-013", as: "attacker" },
            { card: "BT1-013", as: "same-level-bystander" },
          ],
          {
            hand: [{ card: "EX4-018", as: "mailbirdramon" }],
            security: ["BT1-009"],
          },
        ),
      );
      await s.ready();
      if (protect) await digivolveIntoGankoomonX(s, "attacker");
      preferTarget(s, preferred, "attacker");
      await playAs(s, 1, "mailbirdramon");
      expect(wasOfferedToOpponent(s, "attacker")).toBe(true);
      await attackPlayer(s, "attacker");
      expect(s.state.players[1]!.security).toHaveLength(0);
      return s.state.memory;
    }

    expect(await memoryAfterAttack(true)).toBe(10);
    expect(await memoryAfterAttack(false)).toBe(8);
  });
});
