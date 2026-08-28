import { EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { compiled } from "./BT24-023.js";
import "../index.js";

describe("BT24-023 Calmaramon", () => {
  it("gates the follow-up suspend restriction on effect-played entry", () => {
    for (const trigger of ["OnPlay", "WhenDigivolving"]) {
      const actions = compiled.effects.find((effect) => effect.trigger === trigger)?.actions as any[];
      expect(actions[1].condition).toMatchObject({ kind: "triggerEnteredByEffect" });
      expect(actions[1].restriction).toBe("suspend");
    }
  });

  it("implements Decode by playing Lanamon from the stack on non-battle removal", () => {
    const decode = compiled.effects.find((effect) => effect.trigger === "AllTurns")?.actions?.[0] as any;
    expect(decode).toMatchObject({ kind: "Replacement", event: "wouldLeavePlay", leaveCause: "otherThanBattle" });
    expect(decode.actions[0]).toMatchObject({ kind: "PlayWithoutCost", from: ["digivolutionCards"], optional: true });
    expect(decode.actions[0].target.filter.nameOrTrait).toEqual([{ tokens: ["Lanamon"], match: "name" }]);
  });

  it("uses an exact Lanamon evolution requirement", () => {
    expect(compiled.digivolutionRequirement).toContainEqual({
      namesExact: ["Lanamon"],
      cost: 1,
      isAlternate: true,
    });
  });

  it("bottom-decks a level 4 Digimon but does not restrict suspension after a normal play", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT24-023", as: "calmaramon" }] },
        1: {
          deck: ["BT1-009", "BT1-009", "BT1-009", "BT1-009", "BT1-009", "BT1-009"],
          battleArea: [
            { card: "BT24-022", as: "returned" },
            { card: "BT24-083", as: "tamer" },
          ],
        },
      },
      { autoSelectCards: true, preferInstanceIds: preferred },
    );
    preferred.push(s.perm("returned").topCard.instanceId, s.perm("tamer").topCard.instanceId);

    await advance(s.engine).fire(EffectTiming.OnPlay, s.perm("calmaramon"));

    expect(s.state.players[1]!.deck.map((card) => card.instanceId)).toContain(s.inst("returned").instanceId);
    expect(observe(s.engine).isRestricted(s.perm("tamer"), "suspend")).toBe(false);
  });

  it("restricts an opposing Digimon or Tamer when played by an effect", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: { hand: [{ card: "BT24-023", as: "calmaramon" }] },
        1: {
          battleArea: [
            { card: "BT24-022", as: "returned" },
            { card: "BT24-083", as: "restricted" },
          ],
        },
      },
      { autoSelectCards: true, preferInstanceIds: preferred },
    );
    preferred.push(s.perm("returned").topCard.instanceId, s.perm("restricted").topCard.instanceId);

    await advance(s.engine).verb.playInstances([s.inst("calmaramon").instanceId], "BT24-016");
    await settle(() => s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.cardId === "BT24-023"));

    expect(s.state.players[1]!.deck.map((card) => card.instanceId)).toContain(s.inst("returned").instanceId);
    expect(observe(s.engine).isRestricted(s.perm("restricted"), "suspend")).toBe(true);
  });

  it("Decodes Lanamon from its stack on non-battle removal and still leaves", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT24-023", as: "calmaramon", under: [{ card: "BT24-027", as: "lanamon" }] }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );

    expect(await advance(s.engine).verb.deletePermanent([s.perm("calmaramon").permanentId], "byEffect")).toBe(1);
    await settle(() => s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.cardId === "BT24-027"));

    expect(s.state.players[0]!.battleArea.map((permanent) => permanent.topCard.instanceId)).toContain(
      s.inst("lanamon").instanceId,
    );
    expect(s.state.players[0]!.trash.map((card) => card.cardId)).toContain("BT24-023");
  });

  it("does not Decode from battle deletion", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT24-023", as: "calmaramon", under: [{ card: "BT24-027", as: "lanamon" }] }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );

    expect(await advance(s.engine).verb.deletePermanent([s.perm("calmaramon").permanentId], "byBattle")).toBe(1);

    expect(s.state.players[0]!.battleArea).toHaveLength(0);
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toContain(s.inst("lanamon").instanceId);
  });

  it("exposes Blocker and inherited Jamming", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "BT24-023", as: "calmaramon" },
          { card: "BT24-022", as: "host", under: ["BT24-023"] },
        ],
      },
    });
    await s.ready();

    expect(observe(s.engine).hasKeyword(s.perm("calmaramon"), "Blocker")).toBe(true);
    expect(observe(s.engine).hasKeyword(s.perm("host"), "Jamming")).toBe(true);
  });

  it.each([
    ["Lanamon", "BT24-027", 1],
    ["level 3 TS", "BT24-020", 3],
  ])("digivolves from %s for cost %i", async (_label, baseCard, cost) => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: baseCard, as: "base" }],
        hand: [{ card: "BT24-023", as: "calmaramon" }],
      },
    });
    s.state.memory = 5;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("calmaramon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard.instanceId === s.inst("calmaramon").instanceId);

    expect(s.state.memory).toBe(5 - cost);
  });
});
