import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { assertNoLoudGap, setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { digiXrosMatches } from "../../engine/combat/keywords.js";
import "./BT10-008.js";
import { compiled } from "./BT10-013.js";
import "./BT10-029.js";
import "./BT10-034.js";
import "./BT10-049.js";
import "./BT10-060.js";
import "./BT10-087.js";

describe("BT10-013 Shoutmon X5", () => {
  it("encodes all five DigiXros slots at -2 and all three static keywords", () => {
    expect(compiled.digiXrosRequirement).toEqual([
      {
        materials: ["Shoutmon", "Ballistamon", "Dorulumon", "Starmons", "Sparrowmon"].map((name) => ({
          names: [name],
        })),
        count: 2,
      },
    ]);
    expect(compiled.effects[0]?.keywords).toEqual([
      expect.objectContaining({ keyword: "SecurityAttack", amount: 1 }),
      expect.objectContaining({ keyword: "Blocker" }),
      expect.objectContaining({ keyword: "MaterialSave", amount: 3 }),
    ]);
  });

  it("does not treat Shoutmon X5 itself as any specified Material Save source (Q3068/Q3089/Q3094/Q3105)", () => {
    for (const material of ["BT10-008", "BT10-049", "BT10-034", "BT10-029"]) {
      expect(digiXrosMatches("BT10-013", material)).toBe(true);
    }
    expect(digiXrosMatches("BT10-013", "BT10-013")).toBe(false);
  });

  it("has Security Attack +1 and Blocker", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT10-013", as: "shoutmon" }] } });
    await s.ready();
    expect(observe(s.engine).keywordAmount(s.perm("shoutmon"), "SecurityAttack")).toBe(1);
    expect(observe(s.engine).hasKeyword(s.perm("shoutmon"), "Blocker")).toBe(true);
  });

  it("digivolves from a black level 4 for the printed cost 4", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT10-062", as: "base" }],
        hand: [{ card: "BT10-013", as: "shoutmonX5" }],
      },
    });
    s.state.memory = 4;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("shoutmonX5").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard.instanceId === s.inst("shoutmonX5").instanceId);

    expect(s.state.memory).toBe(0);
  });

  it("DigiXroses with all five Xros Heart materials for zero cost, then Material Saves exactly three", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT10-087", as: "taiki" }],
          hand: [
            { card: "BT10-013", as: "shoutmonX5" },
            { card: "BT10-008", as: "shoutmon" },
            { card: "BT10-049", as: "ballistamon" },
            { card: "BT10-034", as: "dorulumon" },
            { card: "BT10-029", as: "starmons" },
            { card: "BT10-060", as: "sparrowmon" },
          ],
        },
      },
      {
        autoSelectCards: true,
        autoOrderTriggers: true,
      },
    );
    const materialIds = [
      s.inst("shoutmon").instanceId,
      s.inst("ballistamon").instanceId,
      s.inst("dorulumon").instanceId,
      s.inst("starmons").instanceId,
      s.inst("sparrowmon").instanceId,
    ];
    s.state.memory = 2;

    expect(
      s.engine.applyIntent(0, {
        type: "playCard",
        instanceId: s.inst("shoutmonX5").instanceId,
        digiXros: { materialInstanceIds: materialIds },
      }),
    ).toEqual({ ok: true });
    await settle(() =>
      s.state.players[0]!.battleArea.some(
        (permanent) => permanent.topCard.instanceId === s.inst("shoutmonX5").instanceId && permanent.stack.length === 5,
      ),
    );

    const x5 = s.state.players[0]!.battleArea.find(
      (permanent) => permanent.topCard.instanceId === s.inst("shoutmonX5").instanceId,
    )!;
    expect(s.state.memory).toBe(2);
    expect(observe(s.engine).keywordAmount(x5, "SecurityAttack")).toBe(1);
    expect(observe(s.engine).hasKeyword(x5, "Blocker")).toBe(true);

    expect(await advance(s.engine).verb.deletePermanent([x5.permanentId])).toBe(1);
    await settle(() => s.perm("taiki").stack.length === 3);

    expect(s.perm("taiki").stack).toHaveLength(3);
    expect(s.perm("taiki").stack.every((card) => materialIds.includes(card.instanceId))).toBe(true);
    expect(s.state.players[0]!.trash.filter((card) => materialIds.includes(card.instanceId))).toHaveLength(2);
    assertNoLoudGap(s);
  });
});
