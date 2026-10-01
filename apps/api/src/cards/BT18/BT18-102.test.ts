import { EffectTiming, getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { drainMicrotasks, setupEngine, settle, type EngineSetup } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { compiled } from "./BT18-102.js";
import "../BT1/BT1-085.js";
import "../BT13/BT13-007.js";
import "../BT7/BT7-085.js";
import "../EX2/EX2-045.js";
import "./BT18-088.js";

const HYBRID_STACK = [
  "BT18-018",
  "BT18-042",
  "BT18-018",
  "BT18-042",
  "BT18-018",
  "BT18-042",
  "BT18-018",
  "BT18-042",
  "BT18-018",
  "BT18-042",
];

const TAMER_STACK = [
  { card: "BT1-085", as: "tamerOne" },
  { card: "BT1-086", as: "tamerTwo" },
  { card: "BT1-087", as: "tamerThree" },
  { card: "BT1-088", as: "tamerFour" },
  { card: "BT1-089", as: "tamerFive" },
  { card: "BT7-090", as: "tamerSix" },
];

describe("BT18-102 Susanoomon", () => {
  it("matches the catalog and carries every printed keyword and rule clause", () => {
    expect(getCardDefinition("BT18-102")).toMatchObject({
      nameEn: "Susanoomon",
      colors: ["White"],
      kinds: ["Digimon"],
      level: 7,
      playCost: 9,
      dp: 16000,
      evoCosts: [
        { color: "Red", level: 6, memoryCost: 6 },
        { color: "Blue", level: 6, memoryCost: 6 },
        { color: "Yellow", level: 6, memoryCost: 6 },
        { color: "Green", level: 6, memoryCost: 6 },
        { color: "Black", level: 6, memoryCost: 6 },
        { color: "Purple", level: 6, memoryCost: 6 },
        { color: "White", level: 6, memoryCost: 6 },
      ],
      forms: ["Mega", "Hybrid"],
      attributes: ["Vaccine"],
      types: ["Shaman"],
      isAce: true,
      overflowMemory: 5,
    });
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
    expect(compiled.effects[0]).toMatchObject({
      trigger: "Counter",
      isFromHand: true,
      keywords: [{ keyword: "BlastDigivolve" }],
    });
    expect(compiled.effects[4]).toMatchObject({
      trigger: "Rule",
      actions: [{ kind: "GrantStatic", grant: "trait", tokens: ["Hybrid"] }],
    });
    expect(compiled.effects[3]).toMatchObject({
      trigger: "WhenAttacking",
      actions: [
        {
          kind: "SecurityManipulation",
          op: "addBottom",
          source: {
            filter: {
              zone: "digivolutionCards",
              kind: ["Tamer"],
              hostFilter: { isSelfRef: true },
            },
            count: 5,
            upTo: true,
          },
          trackCount: "placedTamers",
        },
        {
          kind: "SecurityManipulation",
          op: "trashTop",
          controller: "opponent",
          amountFromNamedCount: { base: 0, countSource: "placedTamers", per: 1 },
        },
      ],
    });
  });

  it("raises both deletion ceilings by the distinct colors in this stack", () => {
    for (const effect of compiled.effects.slice(1, 3)) {
      expect(effect).toMatchObject({
        actions: [
          {
            kind: "Delete",
            target: { filter: { kind: ["Digimon"], dp: { op: "lte", value: 10000 } }, count: 1 },
            dpCeilingScaling: {
              amount: 2000,
              per: 1,
              unit: "colors",
              filter: { zone: "digivolutionCards", controllerDefault: "mine" },
            },
          },
        ],
      });
    }
  });

  it("requires ten Hybrid cards under Takuya/Koji and excludes that alternate path from Blast Digivolve", () => {
    expect(compiled.digivolutionRequirement).toEqual([
      {
        namesExact: ["Takuya Kanbara", "Koji Minamoto", "Takuya Kanbara & Koji Minamoto"],
        cost: 6,
        isAlternate: true,
        requiredDigivolutionCardCount: { trait: "Hybrid", min: 10 },
        incompatibleWithBlastDigivolve: true,
      },
    ]);
  });

  it("does not source a Tamer from another own stack", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT18-102", as: "susanoomon", under: HYBRID_STACK },
            { card: "BT1-009", as: "otherOwnStack", under: [{ card: "BT1-085", as: "otherStackTamer" }] },
          ],
          security: ["BT1-010"],
        },
        1: {
          security: ["BT1-010", "BT1-011"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("susanoomon").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.security.length === 1);

    expect(s.state.players[0]!.security).toHaveLength(1);
    expect(s.perm("otherOwnStack").stack.some((card) => card.instanceId === s.inst("otherStackTamer").instanceId)).toBe(
      true,
    );
  });

  it("naturally evolves from a Takuya/Koji Tamer with ten Hybrids and applies six-color deletion", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT18-088", as: "takuyaKoji", under: [...HYBRID_STACK, ...TAMER_STACK] }],
          hand: [{ card: "BT18-102", as: "susanoomon" }],
          deck: ["BT1-010"],
        },
        1: { battleArea: [{ card: "BT1-009", as: "largeTarget", dp: 22000 }] },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 10;
    expect(observe(s.engine).effectiveNames(s.perm("takuyaKoji"))).toEqual(["takuya kanbara & koji minamoto"]);

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("takuyaKoji").permanentId,
        instanceId: s.inst("susanoomon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("takuyaKoji").topCard?.cardId === "BT18-102");
    await settle(() => s.state.players[1]!.battleArea.length === 0);

    expect(s.perm("takuyaKoji").stack).toHaveLength(17);
    expect(observe(s.engine).hasEffectiveTrait(s.perm("takuyaKoji"), "Hybrid")).toBe(true);
    expect(s.state.memory).toBe(4);
  });

  it("naturally attacks, deletes through the six-color ceiling, places at most five Tamers on bottom security, and trashes equally many opponent security cards", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT18-102", as: "susanoomon", under: [...HYBRID_STACK, ...TAMER_STACK] }],
          security: [{ card: "BT1-010", as: "ownSecurity" }],
        },
        1: {
          battleArea: [{ card: "BT1-009", as: "largeTarget", dp: 22000 }],
          security: ["BT1-010", "BT1-011", "BT1-012", "BT1-013", "BT1-014", "BT1-015", "BT1-016"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("susanoomon").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        s.state.players[1]!.battleArea.length === 0 &&
        s.state.players[0]!.security.length === 6 &&
        s.state.players[1]!.security.length === 1,
    );

    const placedTamerIds = TAMER_STACK.map(({ as }) => s.inst(as).instanceId).filter((instanceId) =>
      s.state.players[0]!.security.some((card) => card.instanceId === instanceId),
    );
    expect(placedTamerIds).toHaveLength(5);
    expect(
      s
        .perm("susanoomon")
        .stack.filter((card) => s.state.players[0]!.security.every(({ instanceId }) => instanceId !== card.instanceId)),
    ).toHaveLength(11);
    expect(s.perm("susanoomon").isSuspended).toBe(true);
  });

  it("naturally offers Blast Digivolve from hand on the standard level-6 route", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT1-009", as: "attacker" }] },
        1: {
          battleArea: [{ card: "BT1-025", as: "levelSixBase" }],
          hand: [{ card: "BT18-102", as: "susanoomon" }],
          security: ["BT1-010"],
        },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 0;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.events.some((event) => event.kind === "counterWindowOpened"));
    const opened = s.events.find((event) => event.kind === "counterWindowOpened");
    if (opened?.kind !== "counterWindowOpened") throw new Error("counter window did not open");
    const eligible = opened.eligibleCounters.find((entry) => entry.instanceId === s.inst("susanoomon").instanceId);
    expect(eligible).toBeDefined();

    expect(
      s.engine.applyIntent(1, {
        type: "respondCounter",
        sourceInstanceId: eligible!.instanceId,
        effectKey: eligible!.effectKey,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("levelSixBase").topCard?.cardId === "BT18-102");
    expect(s.state.memory).toBe(0);
  });

  it("does not offer Blast Digivolve on the ten-Hybrid Tamer alternate route", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT1-009", as: "attacker" }] },
        1: {
          battleArea: [{ card: "BT18-088", as: "takuyaKoji", under: HYBRID_STACK }],
          hand: [{ card: "BT18-102", as: "susanoomon" }],
          security: ["BT1-010"],
        },
      },
      { autoSelectCards: true },
    );
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        s.events.some((event) => event.kind === "counterWindowOpened") ||
        s.events.some((event) => event.kind === "securityChecked"),
    );

    const counterWindow = s.events.findLast((event) => event.kind === "counterWindowOpened");
    expect(counterWindow?.kind === "counterWindowOpened" ? counterWindow.eligibleCounters : []).not.toContainEqual(
      expect.objectContaining({ instanceId: s.inst("susanoomon").instanceId }),
    );
  });
});

describe("BT18-102 Susanoomon — KB Q&A rulings", () => {
  const digivolve = (s: EngineSetup, baseAlias: string, cardAlias: string) =>
    s.engine.applyIntent(0, {
      type: "digivolve",
      permanentId: s.perm(baseAlias).permanentId,
      instanceId: s.inst(cardAlias).instanceId,
    });

  const attackAndPlaceTamers = async (tamerAliases: string[], chosenOrder: string[]) => {
    const tamerStack = TAMER_STACK.filter(({ as }) => tamerAliases.includes(as));
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT18-102", as: "susanoomon", under: [...HYBRID_STACK, ...tamerStack] }],
          security: [{ card: "BT1-010", as: "ownSecurity" }],
        },
        1: { security: ["BT1-010", "BT1-011", "BT1-012", "BT1-013", "BT1-014"] },
      },
      { autoAcceptOptional: true },
    );
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("susanoomon").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    const tamerIds = tamerAliases.map((alias) => s.inst(alias).instanceId);
    const isTamerSelection = ({ req }: EngineSetup["decisions"][number]) =>
      req.kind === "selectCards" && tamerIds.every((id) => req.options?.candidateInstanceIds?.includes(id));
    await settle(() => s.decisions.some(isTamerSelection));
    const selection = s.decisions.find(isTamerSelection)!;
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: selection.req.decisionId,
        response: { kind: "selectCards", instanceIds: chosenOrder.map((alias) => s.inst(alias).instanceId) },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.security.length === 1 + chosenOrder.length);
    await drainMicrotasks();
    return s;
  };

  const opponentSecurityAfterAttack = (placedTamers: number) => 5 - placedTamers - 1;

  const securityAliasesOf = (s: EngineSetup, aliases: string[]) =>
    s.state.players[0]!.security.map(
      (card) => aliases.find((alias) => s.inst(alias).instanceId === card.instanceId) ?? card.cardId,
    );

  it("lets the player choose the order of multiple Tamers placed as bottom security cards (Q3054)", async () => {
    const aliases = ["ownSecurity", "tamerOne", "tamerTwo"];

    const oneThenTwo = await attackAndPlaceTamers(["tamerOne", "tamerTwo"], ["tamerOne", "tamerTwo"]);
    expect(securityAliasesOf(oneThenTwo, aliases)).toEqual(["ownSecurity", "tamerOne", "tamerTwo"]);
    expect(oneThenTwo.state.players[1]!.security).toHaveLength(opponentSecurityAfterAttack(2));

    const twoThenOne = await attackAndPlaceTamers(["tamerOne", "tamerTwo"], ["tamerTwo", "tamerOne"]);
    expect(securityAliasesOf(twoThenOne, aliases)).toEqual(["ownSecurity", "tamerTwo", "tamerOne"]);
    expect(twoThenOne.state.players[1]!.security).toHaveLength(opponentSecurityAfterAttack(2));
  });

  it("places three Tamers as bottom security cards in any order the player chooses (Q3057)", async () => {
    const tamers = ["tamerOne", "tamerTwo", "tamerThree"];
    const aliases = ["ownSecurity", ...tamers];

    const chosen = ["tamerThree", "tamerOne", "tamerTwo"];
    const s = await attackAndPlaceTamers(tamers, chosen);
    expect(securityAliasesOf(s, aliases)).toEqual(["ownSecurity", ...chosen]);
    expect(s.state.players[1]!.security).toHaveLength(opponentSecurityAfterAttack(3));

    const reordered = ["tamerTwo", "tamerThree", "tamerOne"];
    const control = await attackAndPlaceTamers(tamers, reordered);
    expect(securityAliasesOf(control, aliases)).toEqual(["ownSecurity", ...reordered]);
  });

  it("digivolves for cost 6 from Takuya & Koji with more than 10 Hybrid cards under it (Q3055)", async () => {
    const twelveHybrids = [...HYBRID_STACK, "BT18-018", "BT18-042"];
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT18-088", as: "takuyaKoji", under: twelveHybrids }],
          hand: [{ card: "BT18-102", as: "susanoomon" }],
          deck: ["BT1-010"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;

    expect(digivolve(s, "takuyaKoji", "susanoomon")).toEqual({ ok: true });
    await settle(() => s.perm("takuyaKoji").topCard?.cardId === "BT18-102");
    expect(s.state.memory).toBe(4);
    expect(s.perm("takuyaKoji").stack).toHaveLength(twelveHybrids.length + 1);

    const tooFew = setupEngine({
      0: {
        battleArea: [{ card: "BT18-088", as: "takuyaKoji", under: HYBRID_STACK.slice(0, 9) }],
        hand: [{ card: "BT18-102", as: "susanoomon" }],
      },
    });
    tooFew.state.memory = 10;
    expect(digivolve(tooFew, "takuyaKoji", "susanoomon")).toEqual({ ok: false, reason: "invalid-evolution" });
  });

  it("cannot Blast Digivolve through the Takuya/Koji ten-Hybrid requirement (Q3056)", async () => {
    const counterWindowFor = async (defender: { card: string; as: string; under?: string[] }) => {
      const s = setupEngine(
        {
          0: { battleArea: [{ card: "BT1-009", as: "attacker" }] },
          1: {
            battleArea: [defender],
            hand: [{ card: "BT18-102", as: "susanoomon" }],
            security: ["BT1-010"],
          },
        },
        { autoSelectCards: true },
      );
      s.state.memory = 0;
      await s.ready();
      expect(
        s.engine.applyIntent(0, {
          type: "attack",
          attackerPermanentId: s.perm("attacker").permanentId,
          target: { kind: "player" },
        }),
      ).toEqual({ ok: true });
      await settle(
        () =>
          s.events.some((event) => event.kind === "counterWindowOpened") ||
          s.events.some((event) => event.kind === "securityChecked"),
      );
      const opened = s.events.findLast((event) => event.kind === "counterWindowOpened");
      const eligible = opened?.kind === "counterWindowOpened" ? opened.eligibleCounters : [];
      return { s, susanoomonOffered: eligible.some((entry) => entry.instanceId === s.inst("susanoomon").instanceId) };
    };

    const tamerRoute = await counterWindowFor({ card: "BT18-088", as: "takuyaKoji", under: HYBRID_STACK });
    expect(tamerRoute.susanoomonOffered).toBe(false);
    await drainMicrotasks();
    expect(tamerRoute.s.perm("takuyaKoji").topCard?.cardId).toBe("BT18-088");
    expect(tamerRoute.s.state.players[1]!.hand.map((card) => card.cardId)).toContain("BT18-102");

    const levelSixRoute = await counterWindowFor({ card: "BT1-025", as: "levelSixBase" });
    expect(levelSixRoute.susanoomonOffered).toBe(true);
  });

  it("digivolves from a Tamer under a Digimon-can't-digivolve effect without firing when-a-Digimon-digivolves effects (Q6665)", async () => {
    const s = setupEngine(
      {
        0: {
          breeding: { card: "BT13-007", as: "drasil" },
          battleArea: [
            { card: "BT18-088", as: "takuyaKoji", under: HYBRID_STACK },
            { card: "BT1-009", as: "monodramon" },
            { card: "EX2-045", as: "calumon" },
          ],
          hand: [
            { card: "BT18-102", as: "susanoomon" },
            { card: "BT1-015", as: "greymon" },
          ],
          deck: ["BT1-010", "BT1-011", "BT1-012"],
        },
        1: { security: 5 },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 6;
    await s.ready();

    expect(digivolve(s, "monodramon", "greymon")).toEqual({ ok: false, reason: "invalid-evolution" });
    expect(s.perm("monodramon").topCard?.cardId).toBe("BT1-009");

    expect(digivolve(s, "takuyaKoji", "susanoomon")).toEqual({ ok: true });
    await settle(() => s.perm("takuyaKoji").topCard?.cardId === "BT18-102");
    await drainMicrotasks();
    expect(s.perm("calumon").isSuspended).toBe(false);
    expect(s.state.memory).toBe(0);

    const control = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT1-009", as: "monodramon" },
            { card: "EX2-045", as: "calumon" },
          ],
          hand: [{ card: "BT1-015", as: "greymon" }],
          deck: ["BT1-010", "BT1-011", "BT1-012"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    control.state.memory = 3;
    expect(digivolve(control, "monodramon", "greymon")).toEqual({ ok: true });
    await settle(() => control.perm("calumon").isSuspended);
    expect(control.state.memory).toBe(2);
  });

  it("performs the digivolution bonus draw when digivolving from a Tamer (Q6666)", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT18-088", as: "takuyaKoji", under: HYBRID_STACK }],
          hand: [{ card: "BT18-102", as: "susanoomon" }],
          deck: [{ card: "BT1-010", as: "bonusDraw" }, "BT1-011"],
        },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    s.state.memory = 6;

    expect(digivolve(s, "takuyaKoji", "susanoomon")).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("bonusDraw").instanceId));

    expect(s.perm("takuyaKoji").topCard?.cardId).toBe("BT18-102");
    expect(s.state.players[0]!.hand.map((card) => card.cardId)).toEqual(["BT1-010"]);
    expect(s.state.players[0]!.deck).toHaveLength(1);
  });
  it("cannot attack on the turn it digivolves from a Tamer that was played this turn (Q6667)", async () => {
    const digivolveThenAttack = async (tamerEnteredThisTurn: boolean) => {
      const s = setupEngine(
        {
          0: {
            battleArea: [
              { card: "BT18-088", as: "takuyaKoji", under: HYBRID_STACK, enteredThisTurn: tamerEnteredThisTurn },
            ],
            hand: [{ card: "BT18-102", as: "susanoomon" }],
            deck: ["BT1-010", "BT1-011"],
          },
          1: { security: ["BT1-010", "BT1-011", "BT1-012"] },
        },
        { autoDeclineOptional: true, autoSelectCards: true },
      );
      s.state.memory = 10;
      await s.ready();
      expect(digivolve(s, "takuyaKoji", "susanoomon")).toEqual({ ok: true });
      await settle(() => s.perm("takuyaKoji").topCard?.cardId === "BT18-102");
      await drainMicrotasks();
      return {
        s,
        attack: s.engine.applyIntent(0, {
          type: "attack",
          attackerPermanentId: s.perm("takuyaKoji").permanentId,
          target: { kind: "player" },
        }),
      };
    };

    const playedThisTurn = await digivolveThenAttack(true);
    expect(playedThisTurn.attack.ok).toBe(false);
    expect(playedThisTurn.s.perm("takuyaKoji").isSuspended).toBe(false);

    const playedEarlier = await digivolveThenAttack(false);
    expect(playedEarlier.attack).toEqual({ ok: true });
  });

  it("trashes a Tamer under the Digimon like any digivolution card when the Digimon is deleted (Q6668)", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT18-102", as: "attacker", under: [...HYBRID_STACK, ...TAMER_STACK] }],
        },
        1: {
          battleArea: [
            {
              card: "BT18-102",
              as: "defender",
              under: [{ card: "BT18-088", as: "defenderTamer" }, ...HYBRID_STACK],
            },
          ],
          security: ["BT1-010", "BT1-011", "BT1-012", "BT1-013", "BT1-014", "BT1-015", "BT1-016"],
        },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    await s.ready();
    const defenderTamerId = s.inst("defenderTamer").instanceId;
    const defender = s.perm("defender");
    expect(defender.stack.some((card) => card.instanceId === defenderTamerId)).toBe(true);
    expect(defender.stack).toHaveLength(HYBRID_STACK.length + 1);
    const defenderCardIds = [defender.topCard!, ...defender.stack].map((card) => card.instanceId);

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.battleArea.length === 0);
    await drainMicrotasks();

    const opponent = s.state.players[1]!;
    expect(opponent.trash.some((card) => card.instanceId === defenderTamerId)).toBe(true);
    expect(defenderCardIds.every((id) => opponent.trash.some((card) => card.instanceId === id))).toBe(true);
    expect(opponent.hand.some((card) => card.instanceId === defenderTamerId)).toBe(false);
    expect(opponent.security.some((card) => card.instanceId === defenderTamerId)).toBe(false);
  });

  it("does not gain the [Security] effect of a Tamer in its digivolution cards (Q6669)", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT1-009", as: "attacker", dp: 20000 }] },
        1: {
          battleArea: [
            { card: "BT18-102", as: "susanoomon", under: [{ card: "BT7-085", as: "stackedTakuya" }] },
            { card: "BT7-085", as: "fieldTakuya" },
          ],
          security: [{ card: "BT1-085", as: "securityTai" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    const stackedTakuyaId = s.inst("stackedTakuya").instanceId;
    const fieldTakuyaId = s.inst("fieldTakuya").instanceId;
    const securityTriggersFrom = (instanceId: string) =>
      s.events.filter(
        (event) =>
          event.kind === "effectTriggered" &&
          event.sourceInstanceId === instanceId &&
          (event.timing === "Security" || event.printedTiming === "Security"),
      );

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.battleArea.some((permanent) => permanent.topCard?.cardId === "BT1-085"));
    await drainMicrotasks();

    expect(securityTriggersFrom(s.inst("securityTai").instanceId)).toHaveLength(1);
    expect(securityTriggersFrom(stackedTakuyaId)).toEqual([]);
    expect(s.perm("susanoomon").stack.some((card) => card.instanceId === stackedTakuyaId)).toBe(true);

    // No intent opens a [Security] window on a battle-area permanent, so the seam fires it
    // directly: an effect the Digimon had gained would be collected and announced here.
    await advance(s.engine).fireForPermanent(EffectTiming.SecuritySkill, s.perm("susanoomon"));
    await advance(s.engine).fireForPermanent(EffectTiming.SecuritySkill, s.perm("fieldTakuya"));
    await drainMicrotasks();

    expect(securityTriggersFrom(stackedTakuyaId)).toEqual([]);
    expect(securityTriggersFrom(fieldTakuyaId)).toHaveLength(1);
    expect(s.perm("susanoomon").stack.some((card) => card.instanceId === stackedTakuyaId)).toBe(true);
  });

  it("gains the inherited effects of a Tamer in its digivolution cards (Q6670)", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "BT18-102", as: "withTakuya", under: [{ card: "BT7-085", as: "stackedTakuya" }] },
          { card: "BT18-102", as: "withoutTakuya", under: ["BT1-085"] },
        ],
      },
    });
    await s.ready();

    expect(observe(s.engine).canUseInheritedEffect(s.perm("withTakuya"), "BT7-085")).toBe(true);
    expect(s.perm("withTakuya").currentDP).toBe(18000);
    expect(observe(s.engine).keywordAmount(s.perm("withTakuya"), "SecurityAttack")).toBe(1);
    expect(s.perm("withoutTakuya").currentDP).toBe(16000);
    expect(observe(s.engine).keywordAmount(s.perm("withoutTakuya"), "SecurityAttack")).toBe(0);
  });
});
