import { describe, it, expect } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle, type PermanentSpec } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "../BT8/BT8-008.js";
import "../BT8/BT8-013.js";
import "../BT8/BT8-084.js";
import "../BT9/BT9-023.js";
import "../BT22/BT22-045.js";
import "../EX5/EX5-059.js";
import "../EX5/EX5-061.js";
import "../P/P-065.js";
import { compiled } from "./BT10-011.js";

describe("BT10-011 Canoweissmon [Your Turn] suspend trigger", () => {
  it("encodes the suspend trigger, both effect-conferral clauses, and alternate evolution", () => {
    expect(compiled.effects).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ trigger: "YourTurn", frequency: "OncePerTurn" }),
        expect.objectContaining({
          trigger: "AllTurns",
          actions: [expect.objectContaining({ kind: "GrantStatic", grant: "effects" })],
        }),
      ]),
    );
    expect(compiled.effects.filter((effect) => effect.actions.some((action) => action.kind === "GrantStatic"))).toEqual(
      [
        expect.objectContaining({ trigger: "AllTurns" }),
        expect.objectContaining({ trigger: "AllTurns", isInherited: true }),
      ],
    );
    expect(compiled.digivolutionRequirement).toEqual([{ level: 4, names: ["Gammamon"], cost: 3, isAlternate: true }]);
  });

  it("digivolves for 3 from an off-color level 4 with Gammamon in its name", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT10-050", as: "wezenGammamon" }],
        hand: [{ card: "BT10-011", as: "canoweissmon" }],
      },
    });
    s.state.memory = 3;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("wezenGammamon").permanentId,
        instanceId: s.inst("canoweissmon").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("wezenGammamon").topCard.instanceId === s.inst("canoweissmon").instanceId);

    expect(s.state.memory).toBe(0);
  });

  it("confers a Gammamon main effect twice through its main and inherited clauses (Q1943)", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT10-011", as: "host", under: ["BT10-011", "BT8-008"] }],
        hand: [{ card: "BT8-086", as: "hiro" }],
        deck: ["BT8-033", "BT8-034"],
      },
    });
    s.state.memory = 5;
    await s.ready();
    expect(advance(s.engine).ledgers.continuous.listStackEffectConferrals()).toHaveLength(2);

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("hiro").instanceId })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.hand.length === 2);

    expect(s.state.players[0]!.hand).toHaveLength(2);
  });

  it("ignores an opponent's Tamer becoming suspended", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT10-011", as: "canoweissmon" }] },
      1: { battleArea: [{ card: "BT10-087", as: "opponentTamer" }] },
    });
    const baseDP = s.perm("canoweissmon").baseDP;

    await advance(s.engine).verb.suspend([s.perm("opponentTamer").permanentId]);

    expect(s.perm("canoweissmon").currentDP).toBe(baseDP);
    expect(observe(s.engine).keywordAmount(s.perm("canoweissmon"), "SecurityAttack")).toBe(0);
  });

  it("gains only +2000 DP when two of your Tamers suspend together (Q1938)", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "BT10-011", as: "canoweissmon" },
          { card: "BT10-087", as: "firstTamer" },
          { card: "BT10-087", as: "secondTamer" },
        ],
      },
    });
    const baseDP = s.perm("canoweissmon").baseDP;

    await advance(s.engine).verb.suspend([s.perm("firstTamer").permanentId, s.perm("secondTamer").permanentId]);

    expect(s.perm("canoweissmon").currentDP).toBe(baseDP + 2000);
    expect(observe(s.engine).keywordAmount(s.perm("canoweissmon"), "SecurityAttack")).toBe(0);
  });

  it("does not double-count the bonus when checking the 12000 DP threshold", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "BT10-011", as: "canoweissmon", dp: 9000 },
          { card: "BT10-087", as: "tamer" },
        ],
      },
    });

    await advance(s.engine).verb.suspend([s.perm("tamer").permanentId]);

    expect(s.perm("canoweissmon").currentDP).toBe(11_000);
    expect(observe(s.engine).keywordAmount(s.perm("canoweissmon"), "SecurityAttack")).toBe(0);
  });

  it("grants Security Attack +1 when the suspend bonus reaches exactly 12000 DP", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "BT10-011", as: "canoweissmon", dp: 10_000 },
          { card: "BT10-087", as: "tamer" },
        ],
      },
    });

    await advance(s.engine).verb.suspend([s.perm("tamer").permanentId]);

    expect(s.perm("canoweissmon").currentDP).toBe(12_000);
    expect(observe(s.engine).keywordAmount(s.perm("canoweissmon"), "SecurityAttack")).toBe(1);
  });
});

describe("BT10-011 Canoweissmon — KB Q&A rulings", () => {
  function digivolveBetelGammamonIntoCanoweissmon(startingMemory: number) {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT8-013", as: "betelGammamon" }],
          hand: [{ card: "BT10-011", as: "canoweissmon" }],
        },
        1: { security: ["BT8-034"] },
      },
      { autoAcceptOptional: true },
    );
    s.state.memory = startingMemory;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("betelGammamon").permanentId,
        instanceId: s.inst("canoweissmon").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: true });
    return s;
  }

  function digivolveBetelGammamonIntoKimeramon(canoweissmonAlreadyUnder: boolean) {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT8-013", as: "betelGammamon", under: canoweissmonAlreadyUnder ? ["BT10-011"] : [] }],
          hand: [{ card: "BT8-084", as: "kimeramon" }],
          trash: canoweissmonAlreadyUnder ? [] : [{ card: "BT10-011", as: "canoweissmon" }],
        },
        1: { security: ["BT8-034"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 3;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("betelGammamon").permanentId,
        instanceId: s.inst("kimeramon").instanceId,
      }),
    ).toEqual({ ok: true });
    return s;
  }

  const blitzWasOffered = (s: { decisions: { req: unknown }[] }) =>
    s.decisions.some(({ req }) => JSON.stringify(req).includes("activateBlitz"));

  it("activates a gained [When Digivolving] Blitz from a Gammamon source and attacks (Q1939)", async () => {
    const s = digivolveBetelGammamonIntoCanoweissmon(2);
    await settle(() => s.engine.hasAcceptedBlitzAttack(s.perm("betelGammamon").permanentId));

    const canoweissmon = s.perm("betelGammamon");
    expect(canoweissmon.topCard.cardId).toBe("BT10-011");
    expect(canoweissmon.stack.map((card) => card.cardId)).toEqual(["BT8-013"]);
    expect(s.state.memory).toBe(-1);
    expect(blitzWasOffered(s)).toBe(true);
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: canoweissmon.permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.security.length === 0);
    expect(s.state.players[1]!.security).toHaveLength(0);

    const opponentHasNoMemory = digivolveBetelGammamonIntoCanoweissmon(3);
    await settle();
    expect(opponentHasNoMemory.state.memory).toBe(0);
    expect(blitzWasOffered(opponentHasNoMemory)).toBe(false);
  });

  it("does not activate Blitz when Kimeramon's [When Digivolving] places this card under it (Q1940)", async () => {
    const placedDuringDigivolve = digivolveBetelGammamonIntoKimeramon(false);
    await settle();

    const kimeramon = placedDuringDigivolve.perm("betelGammamon");
    expect(kimeramon.topCard.cardId).toBe("BT8-084");
    expect(kimeramon.stack.map((card) => card.cardId)).toEqual(["BT10-011", "BT8-013"]);
    expect(placedDuringDigivolve.state.memory).toBe(-1);
    expect(blitzWasOffered(placedDuringDigivolve)).toBe(false);
    expect(placedDuringDigivolve.engine.hasAcceptedBlitzAttack(kimeramon.permanentId)).toBe(false);
    expect(
      placedDuringDigivolve.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: kimeramon.permanentId,
        target: { kind: "player" },
      }),
    ).toMatchObject({ ok: false });
    expect(placedDuringDigivolve.state.players[1]!.security).toHaveLength(1);

    const alreadyUnderBeforeDigivolve = digivolveBetelGammamonIntoKimeramon(true);
    await settle();
    expect(blitzWasOffered(alreadyUnderBeforeDigivolve)).toBe(true);
  });

  it("gains the effects of every Gammamon-named digivolution card at once (Q1941)", async () => {
    function setup(under: string[]) {
      const s = setupEngine({
        0: {
          battleArea: [{ card: "BT10-011", as: "canoweissmon", under }],
          hand: [{ card: "BT8-086", as: "hiro" }],
          deck: ["BT8-033", "BT8-034"],
        },
      });
      s.state.memory = 5;
      return s;
    }

    const s = setup(["BT8-008", "BT9-023"]);
    await s.ready();
    expect(observe(s.engine).isRestricted(s.perm("canoweissmon"), "cantBeBlocked")).toBe(true);
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("hiro").instanceId })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.hand.length === 1);
    expect(s.state.players[0]!.hand).toHaveLength(1);

    const withoutGammamonSources = setup(["BT1-009", "BT1-010"]);
    await withoutGammamonSources.ready();
    expect(
      observe(withoutGammamonSources.engine).isRestricted(withoutGammamonSources.perm("canoweissmon"), "cantBeBlocked"),
    ).toBe(false);
    expect(
      withoutGammamonSources.engine.applyIntent(0, {
        type: "playCard",
        instanceId: withoutGammamonSources.inst("hiro").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle();
    expect(withoutGammamonSources.state.players[0]!.hand).toHaveLength(0);
  });

  it("does not grant a Gammamon source's inherited effect a second time (Q1942)", async () => {
    async function attackWith(attacker: PermanentSpec) {
      const s = setupEngine(
        {
          0: { battleArea: [attacker] },
          1: {
            battleArea: [
              { card: "BT1-009", as: "firstVictim" },
              { card: "BT1-009", as: "secondVictim" },
            ],
            security: ["BT8-034", "BT8-033"],
          },
        },
        { autoAcceptOptional: true, autoSelectCards: true },
      );
      await s.ready();
      expect(
        s.engine.applyIntent(0, {
          type: "attack",
          attackerPermanentId: s.perm("attacker").permanentId,
          target: { kind: "player" },
        }),
      ).toEqual({ ok: true });
      await settle(() => s.state.players[1]!.security.length < 2);
      return s;
    }

    const mainClause = await attackWith({ card: "BT10-011", as: "attacker", under: ["BT8-008"] });
    expect(mainClause.perm("attacker").currentDP).toBe(8000);
    expect(mainClause.state.players[1]!.battleArea).toHaveLength(1);
    expect(mainClause.state.players[1]!.trash.filter((card) => card.cardId === "BT1-009")).toHaveLength(1);

    const inheritedClause = await attackWith({
      card: "BT1-009",
      as: "attacker",
      dp: 7000,
      under: ["BT8-008", "BT10-011"],
    });
    expect(inheritedClause.state.players[1]!.battleArea).toHaveLength(1);
    expect(inheritedClause.state.players[1]!.trash.filter((card) => card.cardId === "BT1-009")).toHaveLength(1);
  });

  function stackCardsConferringEffects(s: ReturnType<typeof setupEngine>, alias: string) {
    const permanent = s.perm(alias);
    const conferredInstanceIds = new Set(
      advance(s.engine)
        .ledgers.continuous.listStackEffectConferrals()
        .filter((conferral) => conferral.targetPermanentId === permanent.permanentId)
        .map((conferral) => conferral.stackInstanceId),
    );
    return permanent.stack.filter((card) => conferredInstanceIds.has(card.instanceId)).map((card) => card.cardId);
  }

  function digivolveIntoDobermonX(under: string[]) {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT14-071", as: "base", under }],
          hand: [
            { card: "EX5-059", as: "dobermonX" },
            { card: "BT1-009", as: "discard" },
          ],
          deck: ["BT1-010"],
        },
        1: {
          battleArea: [
            { card: "ST1-03", as: "victim", dp: 2000 },
            { card: "BT1-009", as: "survivor", dp: 3000 },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferred },
    );
    preferred.push(s.inst("discard").instanceId, s.perm("victim").permanentId, s.perm("victim").topCard.instanceId);
    s.state.memory = 2;
    return s;
  }

  function digivolveCerberusmonIntoCerberusmonX(under: string[]) {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT1-039", as: "cerberusmon", under }],
          hand: [
            { card: "EX5-061", as: "cerberusmonX" },
            { card: "BT1-010", as: "discard" },
          ],
          trash: [{ card: "BT14-069", as: "revival" }],
          deck: ["BT1-012"],
        },
        1: {
          battleArea: [
            { card: "ST1-03", as: "victim", dp: 2000 },
            { card: "BT1-009", as: "survivor", dp: 3000 },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferred },
    );
    preferred.push(s.inst("discard").instanceId, s.inst("revival").instanceId, s.perm("victim").permanentId);
    s.state.memory = 3;
    return s;
  }

  it("lets Dobermon (X Antibody) activate both its own and a gained Gammamon [On Play] effect (Q3656)", async () => {
    const s = digivolveIntoDobermonX(["EX2-041", "P-065", "BT10-011"]);
    const victimId = s.perm("victim").permanentId;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("dobermonX").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision === undefined && s.state.players[1]!.battleArea.length === 1);

    expect(s.perm("base").topCard.cardId).toBe("EX5-059");
    expect(stackCardsConferringEffects(s, "base")).toContain("P-065");
    expect(s.state.players[1]!.battleArea.some((perm) => perm.permanentId === victimId)).toBe(false);
    expect(s.state.players[1]!.battleArea.map((perm) => perm.topCard.cardId)).toEqual(["BT1-009"]);
    expect(observe(s.engine).hasKeyword(s.perm("base"), "Retaliation")).toBe(true);

    const withoutCanoweissmon = digivolveIntoDobermonX(["EX2-041", "P-065", "BT1-010"]);
    await withoutCanoweissmon.ready();
    expect(stackCardsConferringEffects(withoutCanoweissmon, "base")).toEqual([]);
  });

  it("lets Cerberusmon (X Antibody) activate both its own and a gained Gammamon [On Play] effect (Q3660)", async () => {
    const s = digivolveCerberusmonIntoCerberusmonX(["P-065", "BT10-011"]);
    const victimId = s.perm("victim").permanentId;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("cerberusmon").permanentId,
        instanceId: s.inst("cerberusmonX").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        s.state.pendingDecision === undefined &&
        s.state.players[0]!.battleArea.some((perm) => perm.topCard.cardId === "BT14-069"),
    );

    expect(s.perm("cerberusmon").topCard.cardId).toBe("EX5-061");
    expect(s.state.memory).toBe(3);
    expect(stackCardsConferringEffects(s, "cerberusmon")).toContain("P-065");
    expect(s.state.players[1]!.battleArea.some((perm) => perm.permanentId === victimId)).toBe(false);
    expect(s.state.players[1]!.battleArea.map((perm) => perm.topCard.cardId)).toEqual(["BT1-009"]);
    expect(s.state.players[0]!.battleArea.some((perm) => perm.topCard.cardId === "BT14-069")).toBe(true);

    const withoutCanoweissmon = digivolveCerberusmonIntoCerberusmonX(["P-065", "BT1-010"]);
    await withoutCanoweissmon.ready();
    expect(stackCardsConferringEffects(withoutCanoweissmon, "cerberusmon")).toEqual([]);
  });

  function digivolveWezenGammamonIntoCanoweissmon(options: {
    hand: { card: string; as: string }[];
    under?: string[];
    startingMemory: number;
    preferredAlias?: string;
  }) {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT22-045", as: "wezenGammamon", under: options.under ?? [] }],
          hand: [{ card: "BT10-011", as: "canoweissmon" }, ...options.hand],
        },
        1: { security: ["BT8-034"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferred },
    );
    if (options.preferredAlias) preferred.push(s.inst(options.preferredAlias).instanceId);
    s.state.memory = options.startingMemory;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("wezenGammamon").permanentId,
        instanceId: s.inst("canoweissmon").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: true });
    return s;
  }

  it("does not activate the [When Digivolving] Blitz of a Gammamon card placed by a gained [When Digivolving] effect (Q4874)", async () => {
    const s = digivolveWezenGammamonIntoCanoweissmon({
      hand: [{ card: "BT8-013", as: "betelGammamon" }],
      startingMemory: 2,
    });
    await settle();

    const canoweissmon = s.perm("wezenGammamon");
    expect(canoweissmon.topCard.cardId).toBe("BT10-011");
    expect(canoweissmon.stack.map((card) => card.cardId)).toEqual(["BT8-013", "BT22-045"]);
    expect(canoweissmon.currentDP).toBe(11_000);
    expect(observe(s.engine).hasKeyword(canoweissmon, "Blocker")).toBe(true);
    expect(s.state.memory).toBe(-1);
    expect(blitzWasOffered(s)).toBe(false);
    expect(s.engine.hasAcceptedBlitzAttack(canoweissmon.permanentId)).toBe(false);
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: canoweissmon.permanentId,
        target: { kind: "player" },
      }),
    ).toMatchObject({ ok: false });
    expect(s.state.players[1]!.security).toHaveLength(1);

    const betelGammamonAlreadyUnder = digivolveWezenGammamonIntoCanoweissmon({
      hand: [],
      under: ["BT8-013"],
      startingMemory: 2,
    });
    await settle();
    expect(blitzWasOffered(betelGammamonAlreadyUnder)).toBe(true);
  });

  it("does not activate the [When Digivolving] effect of a second WezenGammamon placed by the gained one (Q4897)", async () => {
    const s = digivolveWezenGammamonIntoCanoweissmon({
      hand: [
        { card: "BT22-045", as: "placedWezenGammamon" },
        { card: "BT8-008", as: "remainingGammamon" },
      ],
      startingMemory: 3,
      preferredAlias: "placedWezenGammamon",
    });
    await settle();

    const canoweissmon = s.perm("wezenGammamon");
    expect(canoweissmon.topCard.cardId).toBe("BT10-011");
    expect(canoweissmon.stack.map((card) => card.cardId)).toEqual(["BT22-045", "BT22-045"]);
    expect(canoweissmon.currentDP).toBe(11_000);
    expect(s.state.players[0]!.hand.map((card) => card.cardId)).toEqual(["BT8-008"]);

    const secondWezenGammamonAlreadyUnder = digivolveWezenGammamonIntoCanoweissmon({
      hand: [
        { card: "BT8-008", as: "firstGammamon" },
        { card: "BT8-008", as: "secondGammamon" },
      ],
      under: ["BT22-045"],
      startingMemory: 3,
    });
    await settle();
    const controlCanoweissmon = secondWezenGammamonAlreadyUnder.perm("wezenGammamon");
    expect(controlCanoweissmon.currentDP).toBe(14_000);
    expect(secondWezenGammamonAlreadyUnder.state.players[0]!.hand).toHaveLength(0);
  });
});
