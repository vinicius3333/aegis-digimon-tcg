import { getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { settle, setupEngine } from "../../engine/testkit/harness.js";
import "../index.js";
import { compiled } from "./BT23-055.js";

describe("BT23-055 Cyberdramon", () => {
  it("matches every catalog field and complete compiled clause", () => {
    expect(getCardDefinition("BT23-055")).toMatchObject({
      cardId: "BT23-055",
      nameEn: "Cyberdramon",
      colors: ["Black"],
      kinds: ["Digimon"],
      level: 5,
      playCost: 7,
      dp: 7000,
      evoCosts: [{ color: "Black", level: 4, memoryCost: 3 }],
      forms: ["Ultimate"],
      attributes: ["Vaccine"],
      types: ["Cyborg", "Hudie", "CS"],
    });
    expect(compiled.digivolutionRequirement).toEqual([{ level: 4, traits: ["CS"], cost: 3, isAlternate: true }]);
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
  });

  it("deletes at the printed play-cost boundary and leaves a cost-6 Digimon", async () => {
    const s = setupEngine(
      {
        0: { hand: [{ card: "BT23-055", as: "cyber" }] },
        1: {
          battleArea: [
            { card: "BT1-020", as: "cost5" },
            { card: "BT1-019", as: "cost6" },
          ],
        },
      },
      { autoSelectCards: true, preferInstanceIds: [] },
    );
    s.state.memory = 10;
    const cost5Id = s.perm("cost5").permanentId;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("cyber").instanceId })).toEqual({ ok: true });
    await settle(() => !s.state.players[1]!.battleArea.some((p) => p.permanentId === cost5Id));

    expect(s.state.players[1]!.battleArea.some((p) => p.topCard?.cardId === "BT1-020")).toBe(false);
    expect(s.state.players[1]!.battleArea.some((p) => p.topCard?.cardId === "BT1-019")).toBe(true);
  });

  it("trashes an effect-placed Option to prevent leaving once, then leaves on the next attempt", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT23-055", as: "cyber" }],
          hand: [{ card: "BT23-100", as: "option" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const cyberId = s.perm("cyber").permanentId;
    const optionId = s.inst("option").instanceId;
    await advance(s.engine).verb.placeOptionAsPermanent(optionId);

    expect(await advance(s.engine).verb.deletePermanent([cyberId], "byEffect")).toBe(0);
    expect(s.state.players[0]!.battleArea.some((p) => p.permanentId === cyberId)).toBe(true);
    expect(s.state.players[0]!.trash.some((card) => card.instanceId === optionId)).toBe(true);

    expect(await advance(s.engine).verb.deletePermanent([cyberId], "byEffect")).toBe(1);
    expect(s.state.players[0]!.battleArea.some((p) => p.permanentId === cyberId)).toBe(false);
  });

  it("deletes one opposing Digimon with play cost 5 or less on play and digivolving", () => {
    for (const trigger of ["OnPlay", "WhenDigivolving"]) {
      const action = (compiled.effects.find((entry) => entry.trigger === trigger) as any).actions[0];
      expect(action).toMatchObject({
        kind: "Delete",
        target: { filter: { controller: "opponent", playCostLte: 5 }, count: 1 },
      });
    }
  });

  it("once per turn prevents its own departure by trashing an effect-played Option in the battle area", () => {
    const effect = compiled.effects.find((entry) => entry.trigger === "AllTurns" && !entry.isInherited) as any;
    expect(effect.frequency).toBe("OncePerTurn");
    expect(effect.actions[0]).toMatchObject({
      kind: "Replacement",
      event: "wouldLeavePlay",
      sourceFilter: { isSelfRef: true },
      cost: {
        kind: "trash",
        target: {
          filter: { zone: "battleArea", controller: "mine", kind: ["Option"], placedInBattleAreaByEffect: true },
          count: 1,
        },
      },
    });
  });

  it("preserves the inherited Cyberdramon/Justimon/CS protection replacement", () => {
    const effect = compiled.effects.find((entry) => entry.trigger === "AllTurns" && entry.isInherited) as any;
    expect(effect).toMatchObject({
      isInherited: true,
      frequency: "OncePerTurn",
      actions: [
        {
          kind: "Replacement",
          event: "wouldLeavePlay",
          sourceFilter: { controllerDefault: "mine", kind: ["Digimon"] },
        },
      ],
    });
  });

  it("applies the inherited replacement to a realistic CS carrier", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT23-057", as: "host", under: ["BT23-055"] }],
          hand: [{ card: "BT23-100", as: "option" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await advance(s.engine).verb.placeOptionAsPermanent(s.inst("option").instanceId);
    const hostId = s.perm("host").permanentId;
    expect(await advance(s.engine).verb.deletePermanent([hostId], "byEffect")).toBe(0);
    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.permanentId === hostId)).toBe(true);
  });

  it("digivolves for 3 from an off-color level-4 CS card and rejects a non-CS peer", () => {
    const legal = setupEngine({
      0: { battleArea: [{ card: "BT23-041", as: "base" }], hand: [{ card: "BT23-055", as: "cyber" }] },
    });
    expect(
      legal.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: legal.perm("base").permanentId,
        instanceId: legal.inst("cyber").instanceId,
      }),
    ).toEqual({ ok: true });
    const illegal = setupEngine({
      0: { battleArea: [{ card: "BT1-037", as: "base" }], hand: [{ card: "BT23-055", as: "cyber" }] },
    });
    expect(
      illegal.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: illegal.perm("base").permanentId,
        instanceId: illegal.inst("cyber").instanceId,
      }),
    ).toEqual({ ok: false, reason: "invalid-evolution" });
  });
});
