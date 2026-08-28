import { getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { compiled } from "./BT18-102.js";

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
        namesExact: ["Takuya Kanbara", "Koji Minamoto"],
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
          security: ["BT1-001"],
        },
        1: {
          security: ["BT1-001", "BT1-002"],
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
          deck: ["BT1-001"],
        },
        1: { battleArea: [{ card: "BT1-009", as: "largeTarget", dp: 22000 }] },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 10;
    expect(observe(s.engine).effectiveNames(s.perm("takuyaKoji"))).toEqual(
      expect.arrayContaining(["takuya kanbara & koji minamoto", "takuya kanbara", "koji minamoto"]),
    );

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("takuyaKoji").permanentId,
        instanceId: s.inst("susanoomon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("takuyaKoji").topCard?.cardId === "BT18-102");
    await settle(() => s.state.players[1]!.battleArea.length === 0);

    expect(s.perm("takuyaKoji").stack).toHaveLength(16);
    expect(observe(s.engine).hasEffectiveTrait(s.perm("takuyaKoji"), "Hybrid")).toBe(true);
    expect(s.state.memory).toBe(4);
  });

  it("naturally attacks, deletes through the six-color ceiling, places at most five Tamers on bottom security, and trashes equally many opponent security cards", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT18-102", as: "susanoomon", under: [...HYBRID_STACK, ...TAMER_STACK] }],
          security: [{ card: "BT1-001", as: "ownSecurity" }],
        },
        1: {
          battleArea: [{ card: "BT1-009", as: "largeTarget", dp: 22000 }],
          security: ["BT1-001", "BT1-002", "BT1-003", "BT1-004", "BT1-005", "BT1-006", "BT1-007"],
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
      s.perm("susanoomon").stack.filter((card) =>
        s.state.players[0]!.security.every(({ instanceId }) => instanceId !== card.instanceId),
      ),
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
          security: ["BT1-001"],
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
          security: ["BT1-001"],
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
