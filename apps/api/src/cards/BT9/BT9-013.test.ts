import { getCardDefinition, Phase } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./BT9-013.js";

describe("BT9-013 OmniShoutmon (X Antibody)", () => {
  it("matches the complete catalog, Blitz, attack permission, and evolution IR", () => {
    expect(getCardDefinition("BT9-013")).toMatchObject({
      cardId: "BT9-013",
      nameEn: "OmniShoutmon (X Antibody)",
      colors: ["Red"],
      kinds: ["Digimon"],
      level: 5,
      playCost: 8,
      dp: 8000,
      evoCosts: [{ color: "Red", level: 4, memoryCost: 3 }],
      forms: ["Ultimate"],
      attributes: ["Vaccine"],
      types: ["Dragonkin", "X Antibody"],
    });
    expect(compiled).toMatchObject({
      effects: [
        { trigger: "WhenDigivolving", keywords: [{ keyword: "Blitz" }] },
        {
          trigger: "YourTurn",
          actions: [
            {
              kind: "GrantCanAttackUnsuspended",
              target: {
                filter: {
                  isSelfRef: true,
                  digivolutionStackNameOrTrait: [{ tokens: ["OmniShoutmon", "X Antibody"], match: "nameExact" }],
                },
                count: 1,
                isSelf: true,
              },
              duration: "YourTurn",
            },
          ],
        },
      ],
      coverage: "full",
      residual: [],
      digivolutionRequirement: [{ names: ["OmniShoutmon"], cost: 0, isAlternate: true }],
    });
  });

  it("uses Blitz to attack after a complete legal standard evolution passes memory", async () => {
    const s = setupEngine({
      0: {
        breeding: { card: "BT1-001", as: "stack" },
        hand: [
          { card: "BT9-008", as: "agumon" },
          { card: "AD1-001", as: "greymon" },
          { card: "BT9-013", as: "omniX" },
        ],
      },
      1: { security: ["BT1-002"] },
    });
    s.state.memory = 2;
    for (const alias of ["agumon", "greymon"] as const) {
      expect(
        s.engine.applyIntent(0, {
          type: "digivolve",
          permanentId: s.perm("stack").permanentId,
          instanceId: s.inst(alias).instanceId,
        }),
      ).toEqual({ ok: true });
      await settle(() => s.perm("stack").topCard.instanceId === s.inst(alias).instanceId);
    }
    s.state.phase = Phase.Breeding;
    expect(s.engine.applyIntent(0, { type: "moveFromBreeding", permanentId: s.perm("stack").permanentId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.breeding === undefined);
    s.state.phase = Phase.Main;
    s.state.memory = 0;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("stack").permanentId,
        instanceId: s.inst("omniX").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("stack").topCard.cardId === "BT9-013");
    expect(s.state.memory).toBe(-3);
    await settle(() => s.state.pendingDecision?.kind === "optional");
    const blitzDecision = s.state.pendingDecision!;
    expect(JSON.parse(blitzDecision.payloadJson)).toMatchObject({ promptKey: "activateBlitz" });
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: blitzDecision.decisionId,
        response: { kind: "optional", accept: true },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.engine.hasAcceptedBlitzAttack(s.perm("stack").permanentId));
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("stack").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
  });

  it("uses the 0-cost OmniShoutmon alternate route and attacks an unsuspended Digimon", async () => {
    const s = setupEngine({
      0: {
        breeding: { card: "BT1-001", as: "stack" },
        hand: [
          { card: "BT9-007", as: "rookie" },
          { card: "AD1-001", as: "champion" },
          { card: "BT5-014", as: "omniShoutmon" },
          { card: "BT9-013", as: "omniX" },
        ],
      },
      1: { battleArea: [{ card: "BT1-028", as: "unsuspended" }] },
    });
    s.state.memory = 5;
    for (const alias of ["rookie", "champion", "omniShoutmon"] as const) {
      expect(
        s.engine.applyIntent(0, {
          type: "digivolve",
          permanentId: s.perm("stack").permanentId,
          instanceId: s.inst(alias).instanceId,
        }),
      ).toEqual({ ok: true });
      await settle(() => s.perm("stack").topCard.instanceId === s.inst(alias).instanceId);
    }
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("stack").permanentId,
        instanceId: s.inst("omniX").instanceId,
        alternateRequirementIndex: 0,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("stack").topCard.cardId === "BT9-013");
    s.state.phase = Phase.Breeding;
    expect(s.engine.applyIntent(0, { type: "moveFromBreeding", permanentId: s.perm("stack").permanentId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.breeding === undefined);
    s.state.phase = Phase.Main;
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("stack").permanentId,
        target: { kind: "permanent", permanentId: s.perm("unsuspended").permanentId },
      }),
    ).toEqual({ ok: true });
  });

  it("implements Q1806: exact X Antibody name qualifies but the trait alone does not", async () => {
    for (const [source, allowed] of [
      ["BT9-109", true],
      ["BT9-012", false],
    ] as const) {
      const s = setupEngine({
        0: { battleArea: [{ card: "BT9-013", as: "omniX", under: [source] }] },
        1: { battleArea: [{ card: "BT1-028", as: "unsuspended" }] },
      });
      await s.ready();
      expect(
        s.engine.applyIntent(0, {
          type: "attack",
          attackerPermanentId: s.perm("omniX").permanentId,
          target: { kind: "permanent", permanentId: s.perm("unsuspended").permanentId },
        }).ok,
      ).toBe(allowed);
    }
  });

  it("does not grant unsuspended-target permission during the opponent's turn", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT9-013", as: "omniX", under: ["BT5-014"] }] },
      1: { battleArea: [{ card: "BT1-028", as: "unsuspended" }] },
    });
    s.state.turnSeat = 1;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("omniX").permanentId,
        target: { kind: "permanent", permanentId: s.perm("unsuspended").permanentId },
      }).ok,
    ).toBe(false);
  });
});
