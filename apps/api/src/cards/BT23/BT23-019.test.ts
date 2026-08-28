import { getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { settle, setupEngine } from "../../engine/testkit/harness.js";
import "../index.js";
import { compiled } from "./BT23-019.js";

describe("BT23-019 Gekomon", () => {
  it("matches the catalog and carries both timings plus inherited Blocker", () => {
    expect(getCardDefinition("BT23-019")).toMatchObject({
      cardId: "BT23-019",
      nameEn: "Gekomon",
      colors: ["Blue"],
      level: 4,
      playCost: 4,
      dp: 4000,
      evoCosts: [{ color: "Blue", level: 3, memoryCost: 2 }],
      forms: ["Champion"],
      attributes: ["Virus"],
      types: ["Amphibian", "CS"],
      inheritedEffectText: "＜Blocker＞",
    });
    for (const trigger of ["OnPlay", "WhenDigivolving"]) {
      const action = (compiled.effects.find((entry) => entry.trigger === trigger) as any).actions[0];
      expect(action).toMatchObject({
        kind: "TrashDigivolution",
        target: { filter: { controller: "opponent", kind: ["Digimon"], digivolutionCards: "hasAny" }, count: 1 },
        amount: 2,
      });
    }
    expect(compiled.effects).toContainEqual({
      trigger: "Static",
      actions: [],
      isInherited: true,
      keywords: [{ keyword: "Blocker", raw: "＜Blocker＞" }],
    });
  });

  it("on play trashes exactly two sources from one opposing Digimon", async () => {
    const s = setupEngine(
      {
        0: { hand: [{ card: "BT23-019", as: "gekomon" }] },
        1: { battleArea: [{ card: "BT23-018", as: "target", under: ["BT23-001", "BT23-017", "BT23-016"] }] },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 5;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("gekomon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.perm("target").stack.length === 1);
    expect(s.state.players[1]!.trash).toHaveLength(2);
    expect(s.perm("target").stack).toHaveLength(1);
  });

  it("mandatory trash clamps to the one available source", async () => {
    const s = setupEngine(
      {
        0: { hand: [{ card: "BT23-019", as: "gekomon" }] },
        1: { battleArea: [{ card: "BT23-018", as: "target", under: ["BT23-017"] }] },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 5;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("gekomon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.perm("target").stack.length === 0);
    expect(s.state.players[1]!.trash).toHaveLength(1);
  });

  it("uses the alternate level-3 CS evolution recipe and rejects a non-CS peer", async () => {
    const valid = setupEngine({
      0: {
        battleArea: [{ card: "BT23-017", as: "base" }],
        hand: [{ card: "BT23-019", as: "gekomon" }],
        deck: ["BT1-009"],
      },
    });
    valid.state.memory = 2;
    await valid.ready();
    expect(
      valid.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: valid.perm("base").permanentId,
        instanceId: valid.inst("gekomon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => valid.perm("base").topCard.instanceId === valid.inst("gekomon").instanceId);

    const invalid = setupEngine({
      0: { battleArea: [{ card: "BT1-064", as: "base" }], hand: [{ card: "BT23-019", as: "gekomon" }] },
    });
    await invalid.ready();
    expect(
      invalid.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: invalid.perm("base").permanentId,
        instanceId: invalid.inst("gekomon").instanceId,
      }),
    ).toMatchObject({ ok: false });
  });
});
