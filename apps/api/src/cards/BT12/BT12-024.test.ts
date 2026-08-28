import { digivolutionRequirementsFor, EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "./BT12-024.js";

describe("BT12-024 Lanamon", () => {
  it("digivolves from Calmaramon for 0 with the evolution draw and source transition", async () => {
    expect(digivolutionRequirementsFor("BT12-024")).toContainEqual({
      names: ["Calmaramon"],
      cost: 0,
      isAlternate: true,
    });
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT12-025", as: "calmaramon" }],
        hand: [{ card: "BT12-024", as: "lanamon" }],
        deck: ["BT1-009"],
      },
    });
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("calmaramon").permanentId,
        instanceId: s.inst("lanamon").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("calmaramon").topCard.cardId === "BT12-024");
    expect(s.state.memory).toBe(0);
    expect(s.perm("calmaramon").stack.map(({ cardId }) => cardId)).toContain("BT12-025");
    expect(s.state.players[0]!.hand.map(({ cardId }) => cardId)).toContain("BT1-009");
  });

  it("digivolves from a blue Tamer for 0 and preserves it as an evolution card", async () => {
    expect(digivolutionRequirementsFor("BT12-024")).toContainEqual({
      cost: 0,
      isAlternate: true,
      baseIsTamer: true,
      baseColors: ["Blue"],
    });
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT12-090", as: "davis" }],
        hand: [{ card: "BT12-024", as: "lanamon" }],
        deck: ["BT1-009"],
      },
    });
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("davis").permanentId,
        instanceId: s.inst("lanamon").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("davis").topCard.cardId === "BT12-024");
    expect(s.perm("davis").stack.map(({ cardId }) => cardId)).toContain("BT12-090");
    expect(s.state.players[0]!.hand.map(({ cardId }) => cardId)).toContain("BT1-009");
  });

  it("rejects the Tamer route from a non-blue Tamer", () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT12-088", as: "takuya" }], hand: [{ card: "BT12-024", as: "lanamon" }] },
    });
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("takuya").permanentId,
        instanceId: s.inst("lanamon").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: false, reason: "invalid-evolution" });
  });

  it("may place a blue level 3 from hand under a chosen blue Digimon and gain Jamming for the turn", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT12-024", as: "lanamon" },
            { card: "BT12-025", as: "recipient", under: ["BT1-009"] },
          ],
          hand: [{ card: "BT12-021", as: "material" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await advance(s.engine).fire(EffectTiming.WhenDigivolving, s.perm("lanamon"));
    await settle(() => s.state.players[0]!.hand.length === 0);
    const hosts = s.state.players[0]!.battleArea.filter((permanent) =>
      permanent.stack.some(({ instanceId }) => instanceId === s.inst("material").instanceId),
    );
    expect(hosts).toHaveLength(1);
    expect(hosts[0]!.stack[0]!.instanceId).toBe(s.inst("material").instanceId);
    expect(observe(s.engine).hasKeyword(s.perm("lanamon"), "Jamming")).toBe(true);
  });

  it("can decline the placement and excludes a non-blue level 3 card", async () => {
    const declined = setupEngine(
      { 0: { battleArea: [{ card: "BT12-024", as: "lanamon" }], hand: [{ card: "BT12-021", as: "material" }] } },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    await advance(declined.engine).fire(EffectTiming.WhenDigivolving, declined.perm("lanamon"));
    expect(declined.state.players[0]!.hand.map(({ instanceId }) => instanceId)).toContain(
      declined.inst("material").instanceId,
    );
    expect(observe(declined.engine).hasKeyword(declined.perm("lanamon"), "Jamming")).toBe(false);

    const wrongColor = setupEngine({
      0: { battleArea: [{ card: "BT12-024", as: "lanamon" }], hand: [{ card: "BT12-048", as: "material" }] },
    });
    await advance(wrongColor.engine).fire(EffectTiming.WhenDigivolving, wrongColor.perm("lanamon"));
    expect(wrongColor.state.players[0]!.hand.map(({ instanceId }) => instanceId)).toContain(
      wrongColor.inst("material").instanceId,
    );
    expect(observe(wrongColor.engine).hasKeyword(wrongColor.perm("lanamon"), "Jamming")).toBe(false);
  });
});
