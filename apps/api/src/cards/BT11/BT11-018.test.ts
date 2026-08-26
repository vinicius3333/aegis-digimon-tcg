import { EffectTiming, digiXrosRequirementFor, getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { compiled } from "./BT11-018.js";

describe("BT11-018 Shoutmon DX", () => {
  it("matches the catalog and publishes every complete contract", () => {
    expect(getCardDefinition("BT11-018")).toMatchObject({
      cardId: "BT11-018",
      nameEn: "Shoutmon DX",
      colors: ["Red", "Blue"],
      kinds: ["Digimon"],
      level: 6,
      playCost: 13,
      dp: 12000,
      evoCosts: [
        { color: "Red", level: 5, memoryCost: 4 },
        { color: "Blue", level: 6, memoryCost: 3 },
      ],
      forms: ["Mega"],
      attributes: ["Data"],
      types: ["Composite", "Xros Heart", "Blue Flare"],
    });
    expect(digiXrosRequirementFor("BT11-018")).toEqual([
      {
        materials: [{ names: ["OmniShoutmon"] }, { names: ["ZeigGreymon"] }],
        count: 3,
      },
    ]);
    expect(compiled).toMatchObject({ coverage: "full", residual: [] });
  });

  it("DigiXroses the two distinct materials for 3 memory each", async () => {
    const s = setupEngine({
      0: {
        hand: [
          { card: "BT11-018", as: "dx" },
          { card: "BT11-015", as: "omni" },
          { card: "BT11-031", as: "zeig" },
        ],
      },
    });
    s.state.memory = 10;
    expect(
      s.engine.applyIntent(0, {
        type: "playCard",
        instanceId: s.inst("dx").instanceId,
        digiXros: { materialInstanceIds: [s.inst("omni").instanceId, s.inst("zeig").instanceId] },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.length === 1);
    expect(s.state.memory).toBe(3);
    expect(s.state.players[0]!.battleArea[0]!.stack.map(({ cardId }) => cardId)).toEqual(
      expect.arrayContaining(["BT11-015", "BT11-031"]),
    );
  });

  it("is also OmniShoutmon and ZeigGreymon and has Material Save 2", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT11-018", as: "shoutmon" }] } });

    await advance(s.engine).recompute();

    expect(observe(s.engine).effectiveNames(s.perm("shoutmon"))).toEqual(
      expect.arrayContaining(["shoutmon dx", "omnishoutmon", "zeiggreymon"]),
    );
    expect(observe(s.engine).keywordAmount(s.perm("shoutmon"), "MaterialSave")).toBe(2);
  });

  it("deletes an 8000-DP Digimon and prevents a remaining Digimon from attacking", async () => {
    const s = setupEngine(
      {
        0: { hand: [{ card: "BT11-018", as: "shoutmon" }] },
        1: {
          battleArea: [
            { card: "BT1-028", as: "deletable", dp: 8000 },
            { card: "BT1-029", as: "restricted", dp: 9000 },
          ],
        },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 20;
    const deletableInstanceId = s.perm("deletable").topCard.instanceId;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("shoutmon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => observe(s.engine).isRestricted(s.perm("restricted"), "attack"));

    expect(s.state.players[1]!.trash.map(({ instanceId }) => instanceId)).toContain(deletableInstanceId);
    expect(observe(s.engine).isRestricted(s.perm("restricted"), "attack")).toBe(true);
  });

  it("may delete itself at end of attack to gain 1 memory", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT11-018", as: "shoutmon" }] } }, { autoAcceptOptional: true });
    s.state.memory = 0;

    await advance(s.engine).fire(EffectTiming.OnEndAttack, s.perm("shoutmon"));

    expect(s.state.players[0]!.battleArea).toHaveLength(0);
    expect(s.state.memory).toBe(1);
  });

  it("may decline its end-of-attack deletion cost", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT11-018", as: "shoutmon" }] } }, { autoDeclineOptional: true });
    await advance(s.engine).fire(EffectTiming.OnEndAttack, s.perm("shoutmon"));
    expect(s.state.players[0]!.battleArea).toHaveLength(1);
    expect(s.state.memory).toBe(0);
  });
});
