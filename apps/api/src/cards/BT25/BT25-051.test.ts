import { getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled as BT25_051 } from "./BT25-051.js";
import "../index.js";

describe("BT25-051 Grizzlymon", () => {
  it("matches the catalog identity and every printed clause", () => {
    expect(getCardDefinition("BT25-051")).toMatchObject({
      cardId: "BT25-051",
      nameEn: "Grizzlymon",
      colors: ["Green", "Black"],
      kinds: ["Digimon"],
      level: 4,
      playCost: 4,
      dp: 4000,
      evoCosts: [
        { color: "Green", level: 3, memoryCost: 3 },
        { color: "Black", level: 3, memoryCost: 3 },
      ],
      forms: ["Champion"],
      attributes: ["Vaccine"],
      types: ["Beast", "Iliad", "TS"],
      rarity: "C",
      maxCountInDeck: 4,
      dualEffect: "Grizzlymon",
    });
    expect(BT25_051.effects?.find((entry) => entry.trigger === "Static")?.keywords).toEqual([
      { keyword: "Blocker", raw: "＜Blocker＞" },
    ]);
    for (const trigger of ["OnPlay", "WhenDigivolving"] as const) {
      expect(BT25_051.effects?.find((entry) => entry.trigger === trigger)?.actions?.[0]).toMatchObject({
        kind: "ModifyDP",
        amount: 3000,
        duration: "untilOpponentTurnEnd",
        target: {
          filter: {
            controller: "mine",
            kind: ["Digimon"],
            nameOrTrait: [
              { tokens: ["Beast", "Animal", "Sovereign"], match: "trait" },
              { tokens: ["Shaman", "TS"], match: "trait" },
            ],
            excludeNameOrTrait: [{ tokens: ["Sea Animal"], match: "trait" }],
          },
        },
      });
    }
    const inherited = BT25_051.effects?.find((entry) => entry.isInherited);
    expect(inherited).toMatchObject({ trigger: "AllTurns", frequency: "OncePerTurn" });
    expect(inherited?.actions?.[0]).toMatchObject({
      kind: "SubTrigger",
      event: "whenBattleWon",
      sourceFilter: { isSelfRef: true },
    });
  });

  it("naturally gives one eligible allied Digimon +3000 DP and excludes a near-match", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "BT25-051", as: "grizzly" }],
          battleArea: [
            { card: "BT25-047", as: "eligible" },
            { card: "BT25-046", as: "nearMatch" },
          ],
        },
      },
      { autoSelectCards: true, preferInstanceIds: preferred },
    );
    preferred.push(s.perm("eligible").permanentId);
    s.state.memory = 4;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("grizzly").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.perm("eligible").currentDP === 5000);

    expect(s.perm("eligible").currentDP).toBe(5000);
    expect(s.perm("nearMatch").currentDP).toBe(2000);
  });

  it("applies the same target filter after a public When Digivolving", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT25-047", as: "source" },
            { card: "BT25-047", as: "eligible" },
            { card: "BT25-046", as: "nearMatch" },
          ],
          hand: [{ card: "BT25-051", as: "grizzly" }],
        },
      },
      { autoSelectCards: true, preferInstanceIds: preferred },
    );
    preferred.push(s.perm("eligible").permanentId);
    s.state.memory = 2;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("source").permanentId,
        instanceId: s.inst("grizzly").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("eligible").currentDP === 6000);
    expect(s.perm("eligible").currentDP).toBe(6000);
    expect(s.perm("nearMatch").currentDP).toBe(3000);
  });

  it("supports the public TS alternate evolution from a level 3 source", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT24-009", as: "source" }], hand: [{ card: "BT25-051", as: "grizzly" }] },
    });
    s.state.memory = 2;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("source").permanentId,
        instanceId: s.inst("grizzly").instanceId,
        useAlternateCost: true,
        alternateRequirementIndex: 0,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("source").topCard?.cardId === "BT25-051");
    expect(s.state.memory).toBe(0);
  });

  it("naturally draws when the Digimon carrying Grizzlymon wins a battle", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            {
              card: "BT25-055",
              as: "attacker",
              under: [{ card: "BT25-051", as: "inherited" }],
            },
          ],
          deck: [{ card: "BT1-001", as: "drawn" }],
        },
        1: { battleArea: [{ card: "BT1-010", as: "target", suspended: true }] },
      },
      { autoSelectCards: true },
    );
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "permanent", permanentId: s.perm("target").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("drawn").instanceId));

    expect(s.state.players[0]!.hand).toContainEqual(s.inst("drawn"));
    expect(s.state.players[1]!.battleArea).toHaveLength(0);
  });

  it("draws when the inherited Grizzlymon wins a Security battle", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT25-055", as: "attacker", under: [{ card: "BT25-051", as: "inherited" }], dp: 12000 }],
        deck: [{ card: "BT1-001", as: "drawn" }],
      },
      1: { security: [{ card: "BT1-009", as: "security" }] },
    });
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("drawn").instanceId));
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toContain(s.inst("drawn").instanceId);
  });
});
