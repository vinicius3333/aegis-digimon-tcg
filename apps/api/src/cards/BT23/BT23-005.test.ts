import { EffectTiming, getCardDefinition } from "@aegis/shared";
import { effectsOf } from "../../engine/effects/collect.js";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "../BT24/BT24-016.js";
import { compiled } from "./BT23-005.js";

function lamiamonMainEffectKey(s: ReturnType<typeof setupEngine>): string {
  const source = s.engine.cardSourceOf(s.inst("lamiamon"));
  return effectsOf(EffectTiming.OnDeclaration, source).find((effect) => effect.effectKey.startsWith("BT24-016/"))!
    .effectKey;
}

describe("BT23-005 Elizamon", () => {
  it("matches the catalog, rulings, and complete IR contract", () => {
    expect(getCardDefinition("BT23-005")).toMatchObject({
      cardId: "BT23-005",
      nameEn: "Elizamon",
      colors: ["Red"],
      kinds: ["Digimon"],
      level: 3,
      playCost: 3,
      dp: 1000,
      evoCosts: [{ color: "Red", level: 2, memoryCost: 0 }],
      forms: ["Rookie"],
      attributes: ["Virus"],
      types: ["Reptile", "LIBERATOR"],
      effectText:
        "[Your Turn] When this Digimon would digivolve into a Digimon card with the [Reptile] or [Dragonkin]\u00a0trait, reduce the digivolution cost by 1.",
      inheritedEffectText: "[Your Turn] This Digimon gets +2000 DP.",
    });
    expect(compiled.effects).toEqual([
      {
        trigger: "YourTurn",
        actions: [
          {
            kind: "Replacement",
            event: "wouldDigivolve",
            sourceFilter: { isSelfRef: true, zone: "battleArea" },
            into: {
              controllerDefault: "mine",
              kind: ["Digimon"],
              nameOrTrait: [{ tokens: ["Reptile", "Dragonkin"], match: "trait" }],
            },
            actions: [
              {
                kind: "Replacement",
                event: "wouldDigivolve",
                mode: "reduceCost",
                amount: 1,
                raw: "reduce the digivolution cost by 1",
              },
            ],
          },
        ],
      },
      {
        trigger: "YourTurn",
        actions: [
          {
            kind: "ModifyDP",
            target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
            amount: 2000,
            duration: "permanent",
          },
        ],
        isInherited: true,
      },
    ]);
    expect(compiled).toMatchObject({ coverage: "full", residual: [] });
  });

  it.each([
    ["Reptile", "BT21-017"],
    ["Dragonkin", "BT21-015"],
  ])("reduces a %s evolution from 2 memory to 1", async (_trait, evolution) => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT23-005", as: "elizamon" }],
        hand: [{ card: evolution, as: "evolution" }],
        deck: ["BT1-009"],
      },
    });
    s.state.memory = 5;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("elizamon").permanentId,
        instanceId: s.inst("evolution").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("elizamon").topCard.instanceId === s.inst("evolution").instanceId);

    expect(s.state.memory).toBe(4);
    expect(s.perm("elizamon").stack.at(-1)?.cardId).toBe("BT23-005");
  });

  it("does not reduce an evolution outside the Reptile and Dragonkin traits", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT23-005", as: "elizamon" }],
        hand: [{ card: "BT23-008", as: "greymon" }],
        deck: ["BT1-009"],
      },
    });
    s.state.memory = 5;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("elizamon").permanentId,
        instanceId: s.inst("greymon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("elizamon").topCard.instanceId === s.inst("greymon").instanceId);
    expect(s.state.memory).toBe(3);
  });

  it("does not apply the reduction from the breeding area, per Q5215", async () => {
    const s = setupEngine({
      0: {
        breeding: { card: "BT23-005", as: "elizamon" },
        hand: [{ card: "BT21-017", as: "dimetromon" }],
        deck: ["BT1-009"],
      },
    });
    s.state.memory = 5;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("elizamon").permanentId,
        instanceId: s.inst("dimetromon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("elizamon").topCard.instanceId === s.inst("dimetromon").instanceId);
    expect(s.state.memory).toBe(3);
  });

  it("reduces BT24-016's effect-driven cost override from 3 to 2, per Q5586", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "BT24-016", as: "lamiamon" }],
          trash: [{ card: "BT24-012", as: "dimetromon" }],
          battleArea: [
            { card: "BT23-005", as: "elizamon" },
            { card: "BT24-082", as: "owen" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 5;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "activateEffect",
        sourceInstanceId: s.inst("lamiamon").instanceId,
        effectKey: lamiamonMainEffectKey(s),
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("elizamon").topCard.instanceId === s.inst("lamiamon").instanceId);

    expect(s.state.memory).toBe(3);
    expect(s.perm("elizamon").stack.map(({ instanceId }) => instanceId)).toContain(s.inst("dimetromon").instanceId);
  });

  it("gives the evolved host +2000 DP only during its controller's turn", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT21-017", under: ["BT23-005"], as: "host" }] },
    });

    s.state.turnSeat = 0;
    await s.engine.recomputeContinuousEffects();
    expect(s.perm("host").currentDP).toBe(6000);

    s.state.turnSeat = 1;
    await s.engine.recomputeContinuousEffects();
    expect(s.perm("host").currentDP).toBe(4000);
  });

  it("does not apply the main reduction when Elizamon is only an inherited source", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT21-017", under: ["BT23-005"], as: "host" }],
        hand: [{ card: "BT13-016", as: "evolution" }],
        deck: ["BT1-009"],
      },
    });
    s.state.memory = 5;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("host").permanentId,
        instanceId: s.inst("evolution").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("host").topCard.instanceId === s.inst("evolution").instanceId);
    expect(s.state.memory).toBe(2);
  });
});
