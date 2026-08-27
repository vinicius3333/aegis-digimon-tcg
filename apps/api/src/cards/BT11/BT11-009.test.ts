import { digiXrosRequirementFor, getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { compiled } from "./BT11-009.js";

describe("BT11-009 Shoutmon + StarSword", () => {
  it("matches the errata catalog, exact recipe, rule aliases, and complete IR", async () => {
    expect(getCardDefinition("BT11-009")).toMatchObject({
      cardId: "BT11-009",
      nameEn: "Shoutmon + StarSword",
      colors: ["Red", "Yellow"],
      kinds: ["Digimon"],
      level: 3,
      playCost: 5,
      dp: 4000,
      evoCosts: [
        { color: "Red", level: 3, memoryCost: 0 },
        { color: "Yellow", level: 2, memoryCost: 1 },
      ],
      forms: ["Rookie"],
      attributes: ["Data"],
      types: ["Enhancement", "Xros Heart"],
      imageId: "BT11-009-Errata",
    });
    expect(compiled.digiXrosRequirement).toEqual([
      { materials: [{ names: ["Shoutmon"] }, { names: ["Starmons"] }], count: 1 },
    ]);
    expect(digiXrosRequirementFor("BT11-009")).toEqual(compiled.digiXrosRequirement);
    expect(compiled).toMatchObject({
      effects: [
        { trigger: "Static", keywords: [{ keyword: "MaterialSave", amount: 1 }] },
        { trigger: "OnPlay", actions: [{ kind: "ModifyDP", amount: -3000 }, { kind: "Delete" }] },
      ],
      coverage: "full",
      residual: [],
    });

    const s = setupEngine({ 0: { battleArea: [{ card: "BT11-009", as: "source" }] } });
    await advance(s.engine).recompute();
    expect(observe(s.engine).effectiveNames(s.perm("source"))).toEqual(
      expect.arrayContaining(["shoutmon + starsword", "shoutmon", "starmons"]),
    );
  });

  it("DigiXroses with Shoutmon and Starmons, applies -3000, then deletes a 2000 DP Digimon", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [
            { card: "BT11-009", as: "source" },
            { card: "BT10-008", as: "shoutmon" },
            { card: "BT10-029", as: "starmons" },
          ],
        },
        1: {
          battleArea: [
            { card: "BT1-009", as: "dpTarget", dp: 6000 },
            { card: "BT1-010", as: "deleteTarget", dp: 2000 },
          ],
        },
      },
      { autoSelectCards: true, autoOrderTriggers: true },
    );
    s.state.memory = 6;
    const deleteTargetCardId = s.perm("deleteTarget").topCard.instanceId;

    expect(
      s.engine.applyIntent(0, {
        type: "playCard",
        instanceId: s.inst("source").instanceId,
        digiXros: { materialInstanceIds: [s.inst("shoutmon").instanceId, s.inst("starmons").instanceId] },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.trash.some(({ instanceId }) => instanceId === deleteTargetCardId));

    const played = s.state.players[0]!.battleArea.find(({ topCard }) => topCard?.cardId === "BT11-009")!;
    expect(played.stack).toHaveLength(2);
    expect(observe(s.engine).keywordAmount(played, "MaterialSave")).toBe(1);
    expect(s.state.players[1]!.trash.some(({ instanceId }) => instanceId === deleteTargetCardId)).toBe(true);
  });

  it("allows one printed slot but rejects a wrong second slot", async () => {
    const partial = setupEngine({
      0: {
        hand: [
          { card: "BT11-009", as: "source" },
          { card: "BT10-008", as: "shoutmon" },
        ],
      },
      1: { battleArea: [{ card: "BT1-009", as: "target", dp: 5000 }] },
    });
    partial.state.memory = 10;
    expect(
      partial.engine.applyIntent(0, {
        type: "playCard",
        instanceId: partial.inst("source").instanceId,
        digiXros: { materialInstanceIds: [partial.inst("shoutmon").instanceId] },
      }),
    ).toEqual({ ok: true });
    await settle(() => partial.perm("target").currentDP === 2000);
    expect(partial.state.memory).toBe(6);
    expect(partial.state.players[1]!.battleArea).toHaveLength(1);

    const wrong = setupEngine({
      0: {
        hand: [
          { card: "BT11-009", as: "source" },
          { card: "BT10-008", as: "shoutmon" },
          { card: "BT1-009", as: "wrong" },
        ],
      },
    });
    wrong.state.memory = 10;
    expect(
      wrong.engine.applyIntent(0, {
        type: "playCard",
        instanceId: wrong.inst("source").instanceId,
        digiXros: { materialInstanceIds: [wrong.inst("shoutmon").instanceId, wrong.inst("wrong").instanceId] },
      }),
    ).toEqual({ ok: false, reason: "invalid-material" });
  });

  it("uses errata Material Save 1 to place one specified source under a Tamer", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT1-085", as: "tamer" },
            { card: "BT11-009", as: "source", under: ["BT10-008", "BT10-029"] },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );

    await advance(s.engine).verb.deletePermanent([s.perm("source").permanentId]);
    await settle(() => s.perm("tamer").stack.length === 1);

    expect(["BT10-008", "BT10-029"]).toContain(s.perm("tamer").stack[0]?.cardId);
    expect(s.perm("tamer").stack).toHaveLength(1);
  });

  it("does not delete at 2000 DP without two DigiXros materials", async () => {
    const s = setupEngine(
      {
        0: { hand: [{ card: "BT11-009", as: "source" }] },
        1: { battleArea: [{ card: "BT1-009", as: "target", dp: 5000 }] },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 10;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("source").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.perm("target").currentDP === 2000);

    expect(s.state.players[1]!.battleArea).toHaveLength(1);
    expect(s.state.players[1]!.trash).toHaveLength(0);
  });
});
