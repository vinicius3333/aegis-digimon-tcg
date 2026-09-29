import { getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle, type BoardSpec } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { compiled } from "./BT20-019.js";
import "./index.js";
import "../ST22/ST22-08.js";
import "../BT1/BT1-108.js";
import "../BT4/BT4-106.js";
import "../BT11/BT11-100.js";
import "../BT11/BT11-101.js";
import "../BT14/BT14-095.js";
import "../ST2/ST2-14.js";

describe("BT20-019 Jesmon (X Antibody)", () => {
  it("keeps the post-condition attack independent and gates only the temporary immunity", () => {
    const whenDigivolving = compiled.effects.find((entry) => entry.trigger === "WhenDigivolving");
    expect(whenDigivolving?.actions[0]).toMatchObject({
      kind: "GrantStatic",
      grant: "immuneToOpponentEffects",
      duration: "forTheTurn",
      condition: {
        kind: "selfDigivolutionStackMatchesFilter",
        filter: {
          nameOrTrait: [
            { tokens: ["Jesmon"], match: "nameExact" },
            { tokens: ["X Antibody"], match: "nameExact" },
          ],
        },
      },
    });
    expect(whenDigivolving?.actions[1]).toMatchObject({ kind: "Attack", optional: true });
    const yourTurn = compiled.effects.find((entry) => entry.trigger === "YourTurn" && !entry.isInherited);
    expect(yourTurn).toMatchObject({
      actions: [
        {
          kind: "GainKeyword",
          target: {
            count: "all",
            filter: {
              nameOrTrait: [
                { tokens: ["Sistermon"], match: "name" },
                { tokens: ["Royal Knight"], match: "trait" },
              ],
            },
          },
        },
        { kind: "GrantCanAttackUnsuspended", target: { count: "all" } },
      ],
    });
    expect(compiled.effects.find((entry) => entry.isInherited)).toMatchObject({
      actions: [
        { condition: { kind: "selfHasName", names: ["Jesmon GX"] } },
        { condition: { kind: "selfHasName", names: ["Jesmon GX"] } },
      ],
    });
  });

  it("publishes the exact Jesmon alternate route and card identity", () => {
    expect(getCardDefinition("BT20-019")).toMatchObject({
      colors: ["Red"],
      kinds: ["Digimon"],
      level: 6,
      playCost: 12,
      dp: 12000,
      attributes: ["Data"],
      types: ["Holy Warrior", "X Antibody", "Royal Knight"],
      evoCosts: [{ color: "Red", level: 5, memoryCost: 4 }],
    });
    expect(compiled.digivolutionRequirement).toEqual([{ names: ["Jesmon"], cost: 1, isAlternate: true }]);
  });

  it("grants temporary opponent-effect immunity when Jesmon is in the evolved stack", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT20-017", as: "jesmon" },
            { card: "BT20-010", as: "ally" },
          ],
          hand: [{ card: "BT20-019", as: "xAntibody" }],
        },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    s.state.memory = 1;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("jesmon").permanentId,
        instanceId: s.inst("xAntibody").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("jesmon").topCard.cardId === "BT20-019");
    expect(
      ["jesmon", "ally"].some((alias) =>
        observe(s.engine).isRestrictedByEffect(s.perm(alias), "beAffected", "Digimon"),
      ),
    ).toBe(true);
    expect(s.perm("jesmon").isSuspended).toBe(false);
  });

  it.each([
    ["trait-only X Antibody Digimon", "BT9-008", false],
    ["exact X Antibody Option", "BT9-109", true],
    ["Proto Form Rule Name", "EX5-070", true],
  ] as const)("uses exact bracket-name semantics for %s in the stack", async (_label, sourceCard, qualifies) => {
    const stackSources = sourceCard === "BT9-008" ? ["BT9-008", "BT15-009"] : [sourceCard, "BT9-008", "BT15-009"];
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT20-014", as: "jesmon", under: stackSources }],
          hand: [{ card: "BT20-019", as: "xAntibody" }],
        },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    s.state.memory = 1;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("jesmon").permanentId,
        instanceId: s.inst("xAntibody").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("jesmon").topCard.cardId === "BT20-019");
    expect(observe(s.engine).isRestrictedByEffect(s.perm("jesmon"), "beAffected", "Digimon")).toBe(qualifies);
  });

  it("still allows the post-then attack when the stack condition is false", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT20-014", as: "savior" }],
          hand: [{ card: "BT20-019", as: "xAntibody" }],
        },
        1: { security: ["BT1-010", "BT1-010"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 4;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("savior").permanentId,
        instanceId: s.inst("xAntibody").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("savior").isSuspended);
    expect(observe(s.engine).isRestrictedByEffect(s.perm("savior"), "beAffected", "Digimon")).toBe(false);
    expect(s.perm("savior").isSuspended).toBe(true);
  });

  it("on your turn grants Piercing and unsuspended-target attacks only to Sistermon and Royal Knights", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "BT20-019", as: "source" },
          { card: "BT20-084", as: "sistermon" },
          { card: "BT20-017", as: "royalKnight" },
          { card: "BT20-010", as: "nonMatch" },
        ],
      },
    });
    await s.ready();
    for (const alias of ["source", "sistermon", "royalKnight"]) {
      expect(observe(s.engine).hasPierce(s.perm(alias))).toBe(true);
      expect(observe(s.engine).canAttackUnsuspended(s.perm(alias))).toBe(true);
    }
    expect(observe(s.engine).hasPierce(s.perm("nonMatch"))).toBe(false);
    expect(observe(s.engine).canAttackUnsuspended(s.perm("nonMatch"))).toBe(false);

    s.state.turnSeat = 1;
    await advance(s.engine).recompute();
    expect(observe(s.engine).hasPierce(s.perm("sistermon"))).toBe(false);
    expect(observe(s.engine).canAttackUnsuspended(s.perm("royalKnight"))).toBe(false);
  });

  it("under Jesmon GX grants both abilities to every allied Digimon on your turn", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "BT20-021", as: "gx", under: ["BT20-019"] },
          { card: "BT20-010", as: "ally" },
        ],
      },
    });
    await s.ready();
    for (const alias of ["gx", "ally"]) {
      expect(observe(s.engine).hasPierce(s.perm(alias))).toBe(true);
      expect(observe(s.engine).canAttackUnsuspended(s.perm(alias))).toBe(true);
    }
    s.state.turnSeat = 1;
    await advance(s.engine).recompute();
    expect(observe(s.engine).hasPierce(s.perm("ally"))).toBe(false);
    expect(observe(s.engine).canAttackUnsuspended(s.perm("ally"))).toBe(false);
  });
  it("allows the optional post-then attack to be refused", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT20-017", as: "jesmon" }], hand: [{ card: "BT20-019", as: "xAntibody" }] },
        1: { security: ["BT1-010"] },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    s.state.memory = 4;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("jesmon").permanentId,
        instanceId: s.inst("xAntibody").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("jesmon").topCard.cardId === "BT20-019");
    expect(s.perm("jesmon").isSuspended).toBe(false);
    expect(s.state.players[1]!.security).toHaveLength(1);
  });

  it("publicly evolves the legal Jesmon to Jesmon X to GX stack and exposes inherited abilities", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "BT20-019", as: "xAntibody", under: ["BT20-017"] },
          { card: "BT20-084", as: "sister" },
        ],
        hand: [{ card: "BT20-021", as: "gx" }],
      },
    });
    s.state.memory = 6;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("xAntibody").permanentId,
        instanceId: s.inst("gx").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("xAntibody").topCard.cardId === "BT20-021");
    expect(s.perm("xAntibody").stack.map((card) => card.cardId)).toEqual(["BT20-017", "BT20-019"]);
    expect(observe(s.engine).hasPierce(s.perm("sister"))).toBe(true);
    expect(observe(s.engine).canAttackUnsuspended(s.perm("sister"))).toBe(true);
  });

  it("protects against Security deletion for the turn, then loses that protection", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT20-017", as: "jesmon" }],
          hand: [{ card: "BT20-019", as: "xAntibody" }, "BT20-010"],
          deck: ["BT20-010", "BT20-010"],
        },
        1: { security: ["ST22-08", "ST22-08"], deck: ["BT20-010"], hand: ["BT20-010"] },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    s.state.memory = 4;
    const attackerId = s.perm("jesmon").permanentId;
    const ownTurn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(0);
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: attackerId,
        instanceId: s.inst("xAntibody").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => observe(s.engine).isRestrictedByEffect(s.perm("jesmon"), "beAffected", "Option"));
    expect(
      s.engine.applyIntent(0, { type: "attack", attackerPermanentId: attackerId, target: { kind: "player" } }),
    ).toEqual({ ok: true });
    await settle(() => s.events.some((event) => event.kind === "securityChecked"));
    expect(s.events.filter((event) => event.kind === "securityChecked")).toHaveLength(1);
    expect(s.state.players[0]!.battleArea).toHaveLength(1);
    expect(s.state.players[1]!.hand.filter((card) => card.cardId === "ST22-08")).toHaveLength(1);
    advance(s.engine).endMainPhaseIfOpen(0);
    await ownTurn;
    expect(observe(s.engine).isRestrictedByEffect(s.perm("jesmon"), "beAffected", "Option")).toBe(false);
    s.state.turnSeat = 1;
    s.state.memory = -s.state.memory;
    await advance(s.engine).runTurn(1);
    s.state.turnSeat = 0;
    s.state.memory = -s.state.memory;
    const nextTurn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(0);
    expect(
      s.engine.applyIntent(0, { type: "attack", attackerPermanentId: attackerId, target: { kind: "player" } }),
    ).toEqual({ ok: true });
    await settle(() => s.events.filter((event) => event.kind === "securityChecked").length === 2);
    expect(s.events.filter((event) => event.kind === "securityChecked")).toHaveLength(2);
    expect(s.state.players[0]!.battleArea).toHaveLength(0);
    expect(s.state.players[0]!.trash.some((card) => card.cardId === "BT20-019")).toBe(true);
    advance(s.engine).endMainPhaseIfOpen(0);
    await nextTurn;
  });
});

describe("BT20-019 Jesmon (X Antibody) — KB Q&A rulings", () => {
  const FILLER = ["BT1-009", "BT1-009", "BT1-009", "BT1-009", "BT1-009", "BT1-009"];
  const PROTECTED_BASE = "BT20-017";
  const UNPROTECTED_BASE = "BT20-014";

  type Setup = ReturnType<typeof setupEngine>;
  type DecisionRequest = Setup["decisions"][number]["req"];

  function allyBoard(base: string, opponentSecurity: string[]): BoardSpec {
    return {
      0: {
        battleArea: [
          { card: base, as: "jesmon" },
          { card: "BT1-013", as: "ally", dp: 10_000 },
        ],
        hand: [{ card: "BT20-019", as: "xAntibody" }],
        deck: [...FILLER],
        security: ["BT1-009", "BT1-009"],
      },
      1: { deck: [...FILLER], security: opponentSecurity },
    };
  }

  // Every choice is answered by hand: the immunity goes to the ally, the attack to Jesmon, and
  // the opponent's security effect to the ally, which one static preference list cannot express.
  function setupAllyBoard(base: string, opponentSecurity: string[]): Setup {
    const s = setupEngine(allyBoard(base, opponentSecurity), { autoAcceptOptional: true });
    s.state.memory = 4;
    return s;
  }

  function choiceDecisions(s: Setup): Setup["decisions"] {
    return s.decisions.filter(({ req }) => req.kind === "chooseTargets" || req.kind === "selectCards");
  }

  async function answerChoice(s: Setup, index: number, instanceIds: string[]): Promise<DecisionRequest> {
    await settle(() => choiceDecisions(s).length > index);
    const { seat, req } = choiceDecisions(s)[index]!;
    const response =
      req.kind === "selectCards"
        ? { kind: "selectCards" as const, instanceIds }
        : { kind: "chooseTargets" as const, instanceIds };
    expect(s.engine.applyIntent(seat, { type: "respondDecision", decisionId: req.decisionId, response })).toEqual({
      ok: true,
    });
    return req;
  }

  function allianceIsOpen(s: Setup): boolean {
    const count = (kind: string): number => s.events.filter((event) => event.kind === kind).length;
    return count("alliancePrompt") > count("allianceResolved");
  }

  function isImmune(s: Setup, alias: string): boolean {
    return observe(s.engine).isRestrictedByEffect(s.perm(alias), "beAffected", "Digimon");
  }

  async function digivolveIntoXAntibody(s: Setup): Promise<void> {
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("jesmon").permanentId,
        instanceId: s.inst("xAntibody").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("jesmon").topCard.cardId === "BT20-019");
  }

  /**
   * Digivolves, protects the ally, attacks the player with Jesmon without ＜Alliance＞ (which
   * would suspend the ally), and returns the opponent's security choice.
   */
  async function protectAllyAndAttack(s: Setup, base: string): Promise<DecisionRequest | undefined> {
    await digivolveIntoXAntibody(s);
    let next = 0;
    if (base === PROTECTED_BASE) await answerChoice(s, next++, [s.perm("ally").permanentId]);
    await answerChoice(s, next++, [s.perm("jesmon").permanentId]);
    await answerChoice(s, next++, ["player"]);
    const securityReached = (): boolean =>
      s.events.some((event) => event.kind === "securityChecked") || choiceDecisions(s).length > next;
    while (!securityReached()) {
      await settle(() => securityReached() || allianceIsOpen(s));
      const passedAlliance = allianceIsOpen(s) ? s.engine.applyIntent(0, { type: "respondAlliance" }) : { ok: true };
      expect(passedAlliance).toEqual({ ok: true });
    }
    const opponentChoice =
      choiceDecisions(s)[next]?.seat === 1 ? await answerChoice(s, next, [s.perm("ally").permanentId]) : undefined;
    await settle(() => s.state.pendingDecision === undefined);
    return opponentChoice;
  }

  it("gives the immunity to 1 Digimon and lets a different Digimon attack (Q4302)", async () => {
    const s = setupAllyBoard(PROTECTED_BASE, ["BT1-009", "BT1-009"]);
    await s.ready();

    await protectAllyAndAttack(s, PROTECTED_BASE);

    expect(isImmune(s, "ally")).toBe(true);
    expect(isImmune(s, "jesmon")).toBe(false);
    expect(s.events.find((event) => event.kind === "attackDeclared")).toMatchObject({
      attackerPermanentId: s.perm("jesmon").permanentId,
    });
    expect(s.perm("jesmon").isSuspended).toBe(true);
    expect(s.perm("ally").isSuspended).toBe(false);
    expect(s.state.players[1]!.security).toHaveLength(1);
  });

  it("keeps the immune Digimon from being suspended or losing DP to an opponent's effect (Q4303)", async () => {
    for (const [base, immune] of [
      [PROTECTED_BASE, true],
      [UNPROTECTED_BASE, false],
    ] as const) {
      const suspension = setupAllyBoard(base, ["BT1-108"]);
      await suspension.ready();
      const suspensionChoice = await protectAllyAndAttack(suspension, base);
      expect(suspensionChoice?.options?.candidateInstanceIds).toContain(suspension.perm("ally").permanentId);
      expect(suspension.state.players[1]!.hand.map((card) => card.cardId)).toContain("BT1-108");
      expect(suspension.perm("ally").isSuspended).toBe(!immune);

      const reduction = setupAllyBoard(base, ["BT11-100"]);
      await reduction.ready();
      const reductionChoice = await protectAllyAndAttack(reduction, base);
      expect(reductionChoice?.options?.candidateInstanceIds).toContain(reduction.perm("ally").permanentId);
      expect(reduction.state.players[1]!.trash.map((card) => card.cardId)).toContain("BT11-100");
      expect(reduction.perm("ally").currentDP).toBe(immune ? 10_000 : 2000);
    }
  });

  it("lets the opponent choose the immune Digimon, and the choice does nothing (Q4304)", async () => {
    const s = setupAllyBoard(PROTECTED_BASE, ["BT1-108"]);
    await s.ready();

    const opponentChoice = await protectAllyAndAttack(s, PROTECTED_BASE);

    expect(opponentChoice?.options?.candidateInstanceIds).toContain(s.perm("ally").permanentId);
    expect(s.events.some((event) => event.kind === "actionRejected")).toBe(false);
    expect(isImmune(s, "ally")).toBe(true);
    expect(s.perm("ally").isSuspended).toBe(false);
  });

  it("can be given an opponent's ＜Security A. -1＞ and DP loss without being considered to have them (Q4305)", async () => {
    const s = setupAllyBoard(PROTECTED_BASE, ["BT11-101"]);
    await s.ready();

    await protectAllyAndAttack(s, PROTECTED_BASE);

    expect(isImmune(s, "ally")).toBe(true);
    expect(s.perm("ally").currentDP).toBe(10_000);
    expect(observe(s.engine).keywordAmount(s.perm("ally"), "SecurityAttack")).toBe(0);
    expect(s.perm("jesmon").currentDP).toBe(7000);
    expect(observe(s.engine).keywordAmount(s.perm("jesmon"), "SecurityAttack")).toBe(-1);
  });

  it("stops an opponent's DP reduction already on the Digimon as soon as it gains the immunity (Q4306)", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: PROTECTED_BASE, as: "jesmon" },
            { card: "BT1-013", as: "ally", dp: 10_000 },
            { card: "BT1-013", as: "striker", dp: 20_000 },
          ],
          hand: [{ card: "BT20-019", as: "xAntibody" }],
          deck: [...FILLER],
          security: ["BT1-009"],
        },
        1: { deck: [...FILLER], security: ["BT4-106", "BT1-009"] },
      },
      { autoDeclineOptional: true, autoSelectCards: true, preferInstanceIds: preferred },
    );
    preferred.push(s.perm("ally").permanentId, s.perm("ally").topCard.instanceId);
    s.state.memory = 4;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("striker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.trash.some((card) => card.cardId === "BT4-106"));
    await settle(() => s.state.pendingDecision === undefined);
    expect(s.perm("ally").currentDP).toBe(7000);
    expect(s.perm("jesmon").currentDP).toBe(8000);

    await digivolveIntoXAntibody(s);
    await settle(() => isImmune(s, "ally"));

    expect(s.perm("ally").currentDP).toBe(10_000);
    expect(isImmune(s, "jesmon")).toBe(false);
    expect(s.perm("jesmon").currentDP).toBe(9000);
  });

  it("applies an opponent's effect given during the immunity once the immunity ends (Q4307)", async () => {
    const s = setupAllyBoard(PROTECTED_BASE, ["ST2-14", "BT1-009"]);
    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    await s.ready();

    await protectAllyAndAttack(s, PROTECTED_BASE);
    expect(s.state.players[1]!.trash.map((card) => card.cardId)).toContain("ST2-14");
    expect(isImmune(s, "ally")).toBe(true);
    expect(observe(s.engine).isRestricted(s.perm("ally"), "block")).toBe(false);

    advance(s.engine).endMainPhaseIfOpen(0);
    await advance(s.engine).waitForMainPhase(1);

    expect(isImmune(s, "ally")).toBe(false);
    expect(observe(s.engine).isRestricted(s.perm("ally"), "block")).toBe(true);
    expect(observe(s.engine).isRestricted(s.perm("ally"), "attack")).toBe(true);

    expect(s.engine.applyIntent(1, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  it("does not trigger an opponent-given [All Turns] suspension effect while the Digimon is immune (Q4308)", async () => {
    for (const [base, immune] of [
      [PROTECTED_BASE, true],
      [UNPROTECTED_BASE, false],
    ] as const) {
      const preferred: string[] = [];
      const s = setupEngine(
        {
          0: {
            battleArea: [
              { card: base, as: "jesmon" },
              { card: "BT1-013", as: "ally", dp: 10_000 },
              { card: "BT1-013", as: "striker", dp: 20_000 },
            ],
            hand: [{ card: "BT20-019", as: "xAntibody" }],
            deck: [...FILLER],
            security: ["BT1-009"],
          },
          1: { deck: [...FILLER], security: ["BT14-095", "BT1-009", "BT1-009"] },
        },
        { autoDeclineOptional: true, autoSelectCards: true, preferInstanceIds: preferred },
      );
      preferred.push(s.perm("ally").permanentId, s.perm("ally").topCard.instanceId);
      s.state.memory = 10;
      await s.ready();

      expect(
        s.engine.applyIntent(0, {
          type: "attack",
          attackerPermanentId: s.perm("striker").permanentId,
          target: { kind: "player" },
        }),
      ).toEqual({ ok: true });
      await settle(() => s.state.players[1]!.hand.some((card) => card.cardId === "BT14-095"));
      await settle(() => s.state.pendingDecision === undefined);
      expect(observe(s.engine).customEffectGrants(s.perm("ally"))).toHaveLength(1);

      await digivolveIntoXAntibody(s);
      await settle(() => s.state.pendingDecision === undefined);
      expect(isImmune(s, "ally")).toBe(immune);

      const memoryBeforeAllyAttack = s.state.memory;
      expect(
        s.engine.applyIntent(0, {
          type: "attack",
          attackerPermanentId: s.perm("ally").permanentId,
          target: { kind: "player" },
        }),
      ).toEqual({ ok: true });
      await settle(() => s.events.filter((event) => event.kind === "securityChecked").length === 2);
      await settle(() => s.state.pendingDecision === undefined);

      expect(s.perm("ally").isSuspended).toBe(true);
      expect(s.state.memory).toBe(immune ? memoryBeforeAllyAttack : memoryBeforeAllyAttack - 2);
    }
  });

  it("lets 1 of your Digimon attack even without [Jesmon] or [X Antibody] in the digivolution cards (Q4717)", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: UNPROTECTED_BASE, as: "jesmon" },
            { card: "BT1-013", as: "ally", dp: 10_000 },
          ],
          hand: [{ card: "BT20-019", as: "xAntibody" }],
          deck: [...FILLER],
          security: ["BT1-009"],
        },
        1: { deck: [...FILLER], security: ["BT1-009", "BT1-009"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferred },
    );
    preferred.push(s.perm("ally").permanentId, s.perm("ally").topCard.instanceId);
    s.state.memory = 4;
    await s.ready();

    await digivolveIntoXAntibody(s);
    await settle(() => s.events.some((event) => event.kind === "securityChecked"));
    await settle(() => s.state.pendingDecision === undefined);

    expect(s.perm("jesmon").stack.map((card) => card.cardId)).not.toContain("BT20-017");
    expect(isImmune(s, "ally")).toBe(false);
    expect(isImmune(s, "jesmon")).toBe(false);
    expect(s.events.find((event) => event.kind === "attackDeclared")).toMatchObject({
      attackerPermanentId: s.perm("ally").permanentId,
    });
    expect(s.perm("ally").isSuspended).toBe(true);
    expect(s.perm("jesmon").isSuspended).toBe(false);
    expect(s.state.players[1]!.security).toHaveLength(1);
  });
});
