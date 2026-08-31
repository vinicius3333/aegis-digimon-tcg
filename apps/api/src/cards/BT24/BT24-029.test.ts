import { EffectTiming, getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { compiled } from "./BT24-029.js";
import "../index.js";

describe("BT24-029 Whamon", () => {
  it("matches the immutable catalog identity", () => {
    expect(getCardDefinition("BT24-029")).toMatchObject({
      cardId: "BT24-029",
      nameEn: "Whamon",
      colors: ["Blue"],
      kinds: ["Digimon"],
      level: 5,
      playCost: 7,
      dp: 7000,
      forms: ["Ultimate"],
      attributes: ["Vaccine"],
      types: ["Sea Animal", "Iliad", "TS"],
      evoCosts: [{ color: "Blue", level: 4, memoryCost: 3 }],
    });
  });

  it("requires the qualifying hand card placement for both entry triggers", () => {
    for (const trigger of ["OnPlay", "WhenDigivolving"]) {
      const action = compiled.effects.find((effect) => effect.trigger === trigger)?.actions?.[0] as any;
      expect(action.kind).toBe("Restrict");
      expect(action.target.filter.kind).toEqual(["Digimon", "Tamer"]);
      expect(action.cost).toMatchObject({ kind: "place", destination: "digivolutionStack", position: "bottom" });
      expect(action.cost.optional).toBeUndefined();
      expect(action.cost.abortOnDecline).toBeUndefined();
      expect(action.abortOnDecline).toBe(true);
      expect(action.cost.target.filter.nameOrTrait).toEqual([
        { tokens: ["Sea Beast", "TS"], match: "trait" },
        { tokens: ["Aqua", "Sea Animal"], match: "traitContains" },
      ]);
    }
  });

  it("plays qualifying TS cards from its digivolution cards", () => {
    const endOfAttack = compiled.effects.find((effect) => effect.trigger === "EndOfAttack")?.actions?.[0] as any;
    const inherited = compiled.effects.find((effect) => effect.trigger === "WhenAttacking")?.actions?.[0] as any;
    expect(endOfAttack).toMatchObject({
      kind: "PlayWithoutCost",
      from: ["digivolutionCards"],
      fromHost: "self",
      optional: true,
    });
    expect(inherited.fromHost).toBe("self");
    expect(inherited.target.filter).toMatchObject({ levelComparison: { op: "lte", value: 4 }, colors: ["Blue"] });
  });

  it("accepts a cost-5 TS Tamer for Q5609 and applies the suspension restriction", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT24-029", as: "whamon" }],
          hand: [{ card: "BT24-102", as: "placed" }],
        },
        1: { battleArea: [{ card: "BT24-083", as: "restricted" }] },
      },
      { autoSelectCards: true, preferInstanceIds: preferred },
    );
    preferred.push(s.inst("placed").instanceId, s.perm("restricted").topCard.instanceId);
    await s.ready();

    await advance(s.engine).fire(EffectTiming.OnPlay, s.perm("whamon"));

    expect(s.perm("whamon").stack[0]?.instanceId).toBe(s.inst("placed").instanceId);
    expect(observe(s.engine).isRestricted(s.perm("restricted"), "suspend")).toBe(true);
  });

  it("accepts an Aquatic card for Q5609's [Aqua] in any trait wording", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT24-029", as: "whamon" }],
          hand: [{ card: "BT15-025", as: "aquatic" }],
        },
        1: { battleArea: [{ card: "BT24-083", as: "restricted" }] },
      },
      { autoSelectCards: true, preferInstanceIds: preferred },
    );
    preferred.push(s.inst("aquatic").instanceId, s.perm("restricted").permanentId);
    await s.ready();

    await advance(s.engine).fire(EffectTiming.OnPlay, s.perm("whamon"));

    expect(s.perm("whamon").stack[0]?.instanceId).toBe(s.inst("aquatic").instanceId);
    expect(observe(s.engine).isRestricted(s.perm("restricted"), "suspend")).toBe(true);
  });

  it("does not restrict suspension when the placement cost is unavailable", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT24-029", as: "whamon" }] },
      1: { battleArea: [{ card: "BT24-083", as: "candidate" }] },
    });
    await s.ready();

    await advance(s.engine).fire(EffectTiming.OnPlay, s.perm("whamon"));

    expect(observe(s.engine).isRestricted(s.perm("candidate"), "suspend")).toBe(false);
  });

  it("plays a cost-5 TS card only from Whamon's own stack at end of attack", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT24-029", as: "whamon", under: [{ card: "BT24-083", as: "ownTarget" }] },
            { card: "BT24-030", as: "other", under: [{ card: "BT24-083", as: "otherTarget" }] },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();

    await advance(s.engine).fire(EffectTiming.OnEndAttack, s.perm("whamon"));
    await settle(() =>
      s.state.players[0]!.battleArea.some(
        (permanent) => permanent.topCard.instanceId === s.inst("ownTarget").instanceId,
      ),
    );

    expect(s.perm("other").stack.map((card) => card.instanceId)).toContain(s.inst("otherTarget").instanceId);
  });

  it("inherited play is limited to a level-4 blue TS card in the attacking host's stack", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT24-030", as: "host", under: [{ card: "BT24-027", as: "ownTarget" }, "BT24-029"] },
            { card: "BT24-029", as: "other", under: [{ card: "BT24-027", as: "otherTarget" }] },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();

    await advance(s.engine).fire(EffectTiming.OnUseAttack, s.perm("host"));
    await settle(() =>
      s.state.players[0]!.battleArea.some(
        (permanent) => permanent.topCard.instanceId === s.inst("ownTarget").instanceId,
      ),
    );

    expect(s.perm("other").stack.map((card) => card.instanceId)).toContain(s.inst("otherTarget").instanceId);
  });

  it("digivolves from a level 4 TS card for cost 3", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT24-010", as: "base" }],
        hand: [{ card: "BT24-029", as: "whamon" }],
      },
    });
    s.state.memory = 5;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("whamon").instanceId,
        useAlternateCost: true,
        alternateRequirementIndex: 0,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard.instanceId === s.inst("whamon").instanceId);

    expect(s.state.memory).toBe(2);
  });
});
