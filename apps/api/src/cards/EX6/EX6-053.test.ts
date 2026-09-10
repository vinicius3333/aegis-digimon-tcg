import { EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { compiled } from "./EX6-053.js";

describe("EX6-053 LadyDevimon", () => {
  it("has Retaliation and deletes a level 4 or lower Digimon when Mirei is present", () => {
    expect(compiled.effects?.find((entry) => !entry.isInherited)?.keywords?.[0]?.keyword).toBe("Retaliation");
    expect(compiled.effects?.find((entry) => entry.trigger === "OnPlay")?.actions[0]).toMatchObject({
      kind: "Delete",
      condition: { kind: "youHave" },
      target: { filter: { levelComparison: { op: "lte", value: 4 } } },
    });
  });
  it("plays Mirei from trash only when absent and inherits conditional Scapegoat", () => {
    expect(compiled.effects?.find((entry) => entry.trigger === "OnPlay")?.actions[1]).toMatchObject({
      kind: "PlayWithoutCost",
      from: ["trash"],
      payCost: false,
      optional: true,
      condition: { kind: "youHaveNone" },
    });
    expect(compiled.effects?.find((entry) => entry.isInherited)).toMatchObject({
      actions: [
        {
          kind: "Aura",
          effect: { kind: "keyword", keyword: { keyword: "Scapegoat" } },
          while: { kind: "selfHasTrait" },
        },
      ],
    });
  });
  it("publicly deletes an opposing level 4 Digimon when Mirei is present", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "EX6-053", as: "lady" },
            { card: "EX6-074", as: "mirei" },
          ],
        },
        1: { battleArea: [{ card: "BT1-053", as: "victim" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    await advance(s.engine).fire(EffectTiming.OnPlay, s.perm("lady"));
    await settle(() => s.state.players[1]!.battleArea.length === 0);
    expect(s.state.players[1]!.battleArea).toHaveLength(0);
  });

  it("legally evolves from a yellow level 4, pays 3 memory, and preserves the source stack", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "EX6-019", as: "base" }], hand: [{ card: "EX6-053", as: "lady" }] },
    });
    s.state.memory = 5;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("lady").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard.cardId === "EX6-053");
    expect(s.perm("base").stack.map((card) => card.cardId)).toEqual(["EX6-019"]);
    expect(s.state.memory).toBe(2);
  });

  it("grants inherited Scapegoat only while the top card has Angel-family traits", async () => {
    const withAngel = setupEngine({
      0: { battleArea: [{ card: "EX6-019", as: "angelHost", under: ["EX6-053"] }] },
    });
    await withAngel.ready();
    expect(observe(withAngel.engine).hasKeyword(withAngel.perm("angelHost"), "Scapegoat")).toBe(true);

    const withoutAngel = setupEngine({
      0: { battleArea: [{ card: "EX6-049", as: "fallenHost", under: ["EX6-053"] }] },
    });
    await withoutAngel.ready();
    expect(observe(withoutAngel.engine).hasKeyword(withoutAngel.perm("fallenHost"), "Scapegoat")).toBe(false);
  });

  it("rejects a non-purple-or-yellow level 4 as an illegal evolution source", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT1-014", as: "base" }], hand: [{ card: "EX6-053", as: "lady" }] },
    });
    s.state.memory = 5;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("lady").instanceId,
      }),
    ).toEqual({ ok: false, reason: "invalid-evolution" });
  });
});
