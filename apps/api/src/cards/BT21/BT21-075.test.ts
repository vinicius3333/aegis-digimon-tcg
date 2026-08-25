import { EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { settle, setupEngine } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { compiled } from "./BT21-075.js";
import "../index.js";
describe("BT21-075 SkullGreymon", () => {
  it("grants Raid and Retaliation and recurs ADVENTURE", () => {
    for (const t of ["OnPlay", "WhenDigivolving"]) {
      const actions = compiled.effects.find((e) => e.trigger === t)?.actions ?? [];
      expect(actions[0]).toMatchObject({ kind: "GainKeyword", keyword: { keyword: "Raid" } });
      expect(actions[1]).toMatchObject({
        kind: "GainKeyword",
        keyword: { keyword: "Retaliation" },
        target: { sameTarget: true },
      });
    }
    expect(compiled.effects.filter((e) => e.trigger === "OnDeletion")).toHaveLength(2);
    expect(compiled.effects.find((e) => e.trigger === "OnDeletion" && e.isInherited)?.actions[0]).toMatchObject({
      kind: "PlayWithoutCost",
      from: ["trash"],
      payCost: false,
      optional: true,
    });
    expect(compiled.digivolutionRequirement).toEqual([
      { level: 4, names: ["Greymon"], cost: 3, isAlternate: true },
      { traits: ["ADVENTURE"], cost: 3, isAlternate: true, level: 4 },
    ]);
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
  });

  it("plays a qualifying ADVENTURE Digimon from trash when deleted", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT21-075", as: "skullgreymon" }],
          trash: [{ card: "BT21-057", as: "adventureGreymon" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );

    await advance(s.engine).verb.deletePermanent([s.perm("skullgreymon").permanentId], "byEffect");
    await settle(() => s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.cardId === "BT21-057"));

    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.cardId === "BT21-057")).toBe(true);
  });

  it("grants Raid and Retaliation to the same selected Digimon", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT21-075", as: "skullgreymon" },
            { card: "BT1-009", as: "target" },
          ],
        },
      },
      { autoSelectCards: true, preferInstanceIds: preferred },
    );
    await s.ready();
    preferred.push(s.perm("target").permanentId);

    await advance(s.engine).fire(EffectTiming.WhenDigivolving, s.perm("skullgreymon"));
    expect(observe(s.engine).hasKeyword(s.perm("target"), "Raid")).toBe(true);
    expect(observe(s.engine).hasKeyword(s.perm("target"), "Retaliation")).toBe(true);
    expect(observe(s.engine).hasKeyword(s.perm("skullgreymon"), "Raid")).toBe(false);
  });

  it("plays an ADVENTURE Tamer at the play-cost-4 boundary", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT21-075", as: "skullgreymon" }],
          trash: [{ card: "BT21-102", as: "tai" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();

    expect(await advance(s.engine).verb.deletePermanent([s.perm("skullgreymon").permanentId], "byEffect")).toBe(1);
    await settle(() =>
      s.state.players[0]!.battleArea.some((card) => card.topCard.instanceId === s.inst("tai").instanceId),
    );
  });

  it("does not play an ADVENTURE card above play cost 4", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT21-075", as: "skullgreymon" }],
          trash: [{ card: "AD1-001", as: "cost5" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();

    expect(await advance(s.engine).verb.deletePermanent([s.perm("skullgreymon").permanentId], "byEffect")).toBe(1);
    expect(s.state.players[0]!.trash.some((card) => card.instanceId === s.inst("cost5").instanceId)).toBe(true);
  });

  it("executes the inherited deletion play from a realistic stack", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT21-076", as: "host", under: [{ card: "BT21-075", as: "source" }] }],
          trash: [{ card: "BT21-057", as: "adventure" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();

    expect(await advance(s.engine).verb.deletePermanent([s.perm("host").permanentId], "byEffect")).toBe(1);
    await settle(() =>
      s.state.players[0]!.battleArea.some((card) => card.topCard.instanceId === s.inst("adventure").instanceId),
    );
  });

  it.each([
    ["Greymon-name", "BT1-015", 0],
    ["ADVENTURE", "BT21-067", 1],
  ] as const)("uses the %s alternate evolution route for 3", async (_label, base, requirementIndex) => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: base, as: "base" }],
        hand: [{ card: "BT21-075", as: "skullgreymon" }],
      },
    });
    s.state.memory = 4;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("skullgreymon").instanceId,
        alternateRequirementIndex: requirementIndex,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard.instanceId === s.inst("skullgreymon").instanceId);
    expect(s.state.memory).toBe(1);
  });
});
