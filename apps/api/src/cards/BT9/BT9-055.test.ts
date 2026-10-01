import { getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./BT9-055.js";
describe("BT9-055 GrandisKuwagamon", () => {
  it("matches catalog and Q1849-Q1851 IR contract", () => {
    expect(getCardDefinition("BT9-055")).toMatchObject({
      cardId: "BT9-055",
      nameEn: "GrandisKuwagamon",
      colors: ["Green"],
      kinds: ["Digimon"],
      level: 6,
      playCost: 12,
      dp: 12000,
      evoCosts: [{ color: "Green", level: 5, memoryCost: 4 }],
      forms: ["Mega"],
      attributes: ["Virus"],
      types: ["Insectoid", "X Antibody"],
    });
    expect(compiled).toMatchObject({
      coverage: "full",
      residual: [],
      digivolutionRequirement: [{ names: ["GranKuwagamon"], cost: 1, isAlternate: true }],
      effects: [
        {
          trigger: "WhenDigivolving",
          actions: [
            { kind: "Suspend" },
            { kind: "RedirectAttack", optional: true, condition: { kind: "triggerAttackerIsSelf" } },
          ],
        },
        { trigger: "YourTurn", actions: [{ kind: "ModifyDP", amount: 4000, duration: "permanent" }] },
        { trigger: "WhenAttacking", frequency: "OncePerTurn", actions: [{ kind: "Suspend" }, { kind: "Unsuspend" }] },
      ],
    });
  });

  it("suspends an opposing Digimon when digivolving", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT1-083", as: "base" }], hand: [{ card: "BT9-055", as: "evolving" }] },
        1: { battleArea: [{ card: "BT2-047", as: "target" }] },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 1;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("evolving").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("target").isSuspended);
    expect(s.perm("target").isSuspended).toBe(true);
  });
});

describe("BT9-055 GrandisKuwagamon — KB Q&A rulings", () => {
  const attackWithSourceUnder = async (sourceCardId: string) => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT9-055", as: "attacker", under: [sourceCardId] }] },
        1: { battleArea: [{ card: "BT1-015", as: "defender" }], security: 1 },
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
    await settle(() => s.state.players[1]!.security.length === 0 && s.state.pendingDecision === undefined);
    return s;
  };

  it("needs a card named [X Antibody] in its digivolution cards; an [X Antibody] trait alone does not count (Q1850)", async () => {
    for (const traitOnlySource of ["BT9-052", "BT10-080"]) {
      const traitOnly = await attackWithSourceUnder(traitOnlySource);
      expect(traitOnly.perm("defender").isSuspended).toBe(false);
      expect(traitOnly.perm("attacker").isSuspended).toBe(true);
    }

    const namedXAntibody = await attackWithSourceUnder("BT9-109");
    expect(namedXAntibody.perm("defender").isSuspended).toBe(true);
    expect(namedXAntibody.perm("attacker").isSuspended).toBe(false);
  });
});
