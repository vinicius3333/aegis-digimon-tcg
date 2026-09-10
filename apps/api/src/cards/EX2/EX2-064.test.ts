import { getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./EX2-064.js";
import "./EX2-064.js";

const inertDeck = ["BT1-009", "BT1-010", "BT1-011", "BT1-012"];
const inertSecurity = ["BT1-013", "BT1-014"];

describe("EX2-064 Alice McCoy", () => {
  it("matches the catalog, Q&A boundaries, and typed IR", () => {
    expect(getCardDefinition("EX2-064")).toMatchObject({
      cardId: "EX2-064",
      nameEn: "Alice McCoy",
      colors: ["Purple"],
      kinds: ["Tamer"],
      playCost: 2,
      dp: 0,
      evoCosts: [],
      rarity: "U",
      maxCountInDeck: 4,
      effectText:
        "[Your Turn][Once Per Turn] When one of your Digimon would digivolve from level 5 to level 6, you may delete 1 of your Digimon to reduce the digivolution cost by 3.",
      securityEffectText: "[Security] Play this card without paying its memory cost.",
    });
    expect(compiled).toMatchObject({
      effects: [
        {
          trigger: "YourTurn",
          frequency: "OncePerTurn",
          actions: [
            {
              kind: "Replacement",
              event: "wouldDigivolve",
              mode: "reduceCost",
              amount: 3,
              sourceFilter: { controller: "mine", kind: ["Digimon"], levels: [5], zone: "battleArea" },
              into: { levels: [6] },
              cost: {
                kind: "deleteOwn",
                target: { filter: { controller: "mine", kind: ["Digimon"] }, count: 1 },
              },
              optional: true,
              abortOnDecline: true,
            },
          ],
        },
        {
          trigger: "Security",
          isSecurity: true,
          actions: [
            {
              kind: "PlayWithoutCost",
              target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
              payCost: false,
            },
          ],
        },
      ],
      coverage: "full",
      residual: [],
    });
  });

  it("may delete one of its Digimon to reduce a level-5-to-6 digivolution cost by 3", async () => {
    const preferInstanceIds: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX2-042", as: "base" }, { card: "EX2-039", as: "sacrifice" }, "EX2-064"],
          hand: [{ card: "EX2-044", as: "evolution" }],
          deck: inertDeck,
          security: inertSecurity,
        },
        1: { deck: inertDeck, security: inertSecurity },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoOrderTriggers: true, preferInstanceIds },
    );
    preferInstanceIds.push(s.perm("sacrifice").permanentId);
    s.state.memory = 10;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("evolution").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        s.state.players[0]!.trash.some((card) => card.cardId === "EX2-039") &&
        s.perm("base").topCard?.instanceId === s.inst("evolution").instanceId,
    );
    expect(s.state.memory).toBe(10);
    expect(s.state.players[0]!.trash.some((card) => card.cardId === "EX2-039")).toBe(true);
  });

  it("offers its delete-for-3 reduction only once across two digivolutions in the turn", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "EX2-042", as: "firstBase" },
            { card: "EX2-042", as: "secondBase" },
            { card: "EX2-039", as: "firstSacrifice" },
            { card: "EX2-039", as: "secondSacrifice" },
            "EX2-064",
          ],
          hand: [
            { card: "EX2-044", as: "firstEvolution" },
            { card: "EX2-044", as: "secondEvolution" },
          ],
          deck: inertDeck,
          security: inertSecurity,
        },
        1: { deck: inertDeck, security: inertSecurity },
      },
      {
        autoAcceptOptional: true,
        autoSelectCards: true,
        autoOrderTriggers: true,
        preferInstanceIds: preferred,
      },
    );
    preferred.push(s.perm("firstSacrifice").permanentId, s.perm("secondSacrifice").permanentId);
    s.state.memory = 10;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("firstBase").permanentId,
        instanceId: s.inst("firstEvolution").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("firstBase").topCard?.instanceId === s.inst("firstEvolution").instanceId);
    expect(s.state.memory).toBe(10);

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("secondBase").permanentId,
        instanceId: s.inst("secondEvolution").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("secondBase").topCard?.instanceId === s.inst("secondEvolution").instanceId);

    expect(s.state.memory).toBe(7);
    expect(s.state.players[0]!.trash.filter((card) => card.cardId === "EX2-039")).toHaveLength(1);
  });

  it("leaves the sacrifice in play when the optional reduction is declined", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX2-042", as: "base" }, { card: "EX2-039", as: "sacrifice" }, "EX2-064"],
          hand: [{ card: "EX2-044", as: "evolution" }],
          deck: inertDeck,
          security: inertSecurity,
        },
        1: { deck: inertDeck, security: inertSecurity },
      },
      { autoDeclineOptional: true },
    );
    s.state.memory = 10;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("evolution").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard?.instanceId === s.inst("evolution").instanceId);
    expect(s.state.players[0]!.trash.some((card) => card.instanceId === s.inst("sacrifice").instanceId)).toBe(false);
    expect(s.state.memory).toBe(7);
  });

  it("does not offer the reduction for a non-level-5-to-6 evolution", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "EX2-041", as: "base" }, { card: "EX2-039", as: "sacrifice" }, "EX2-064"],
        hand: [{ card: "EX2-042", as: "evolution" }],
        deck: inertDeck,
        security: inertSecurity,
      },
      1: { deck: inertDeck, security: inertSecurity },
    });
    s.state.memory = 10;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("evolution").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard?.instanceId === s.inst("evolution").instanceId);
    expect(s.state.players[0]!.trash.some((card) => card.instanceId === s.inst("sacrifice").instanceId)).toBe(false);
    expect(s.state.memory).toBe(7);
  });

  it("Q3349: does not reduce a level-5-to-6 digivolution from the breeding area", async () => {
    const s = setupEngine(
      {
        0: {
          breeding: { card: "EX2-042", as: "breedingBase" },
          battleArea: [{ card: "EX2-039", as: "sacrifice" }, "EX2-064"],
          hand: [{ card: "EX2-044", as: "evolution" }],
          deck: inertDeck,
          security: inertSecurity,
        },
        1: { deck: inertDeck, security: inertSecurity },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoOrderTriggers: true },
    );
    s.state.memory = 10;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("breedingBase").permanentId,
        instanceId: s.inst("evolution").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("breedingBase").topCard?.instanceId === s.inst("evolution").instanceId);
    expect(s.state.memory).toBe(7);
    expect(s.perm("sacrifice").inBreeding).toBe(false);
    expect(s.state.players[0]!.trash.some((card) => card.instanceId === s.inst("sacrifice").instanceId)).toBe(false);
  });

  it("Q3350: deleting the level-5 digivolution source cancels the digivolution", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX2-042", as: "base" }, "EX2-064"],
          hand: [{ card: "EX2-044", as: "evolution" }],
          deck: inertDeck,
          security: inertSecurity,
        },
        1: { deck: inertDeck, security: inertSecurity },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoOrderTriggers: true, preferInstanceIds: preferred },
    );
    preferred.push(s.perm("base").permanentId);
    const evolutionId = s.inst("evolution").instanceId;
    const baseId = s.inst("base").instanceId;
    s.state.memory = 10;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: evolutionId,
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        s.state.players[0]!.trash.some((card) => card.instanceId === baseId) &&
        s.state.players[0]!.hand.some((card) => card.instanceId === evolutionId),
    );
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toContain(evolutionId);
    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.instanceId === evolutionId)).toBe(
      false,
    );
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toContain(baseId);
    expect(s.state.memory).toBe(10);
  });

  it("plays EX2-064 from Security without paying its cost", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "EX2-050", as: "attacker" }], deck: inertDeck, security: inertSecurity },
      1: { deck: inertDeck, security: [{ card: "EX2-064", as: "securityAlice" }, ...inertSecurity] },
    });
    s.state.memory = 5;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() =>
      s.state.players[1]!.battleArea.some((p) => p.topCard?.instanceId === s.inst("securityAlice").instanceId),
    );
    expect(
      s.state.players[1]!.battleArea.some((p) => p.topCard?.instanceId === s.inst("securityAlice").instanceId),
    ).toBe(true);
    expect(s.state.memory).toBe(5);
  });
});
