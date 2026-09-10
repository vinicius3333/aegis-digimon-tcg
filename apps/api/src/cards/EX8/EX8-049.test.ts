import { describe, expect, it } from "vitest";
import { getCardDefinition, PlayerState } from "@aegis/shared";
import { settle, setupEngine } from "../../engine/testkit/harness.js";
import { advance } from "../../engine/testkit/advance.js";
import { observe } from "../../engine/testkit/observe.js";
import "./index.js";
import { compiled } from "./EX8-049.js";

describe("EX8-049", () => {
  it("matches the committed catalog identity, evolution, text, and inherited Blocker", () => {
    expect(getCardDefinition("EX8-049")).toMatchObject({
      cardId: "EX8-049",
      nameEn: "Golemon",
      colors: ["Black"],
      kinds: ["Digimon"],
      level: 4,
      playCost: 5,
      dp: 5000,
      evoCosts: [{ color: "Black", level: 3, memoryCost: 2 }],
      forms: ["Champion"],
      attributes: ["Virus"],
      types: ["Mineral"],
      effectText: "[On Play] [On Deletion] ＜De-Digivolve1＞ 1 of your opponent's Digimon.",
      inheritedEffectText: "＜Blocker＞",
    });
    expect(getCardDefinition("EX8-049")?.securityEffectText).toBeUndefined();
    expect(compiled.effects?.find((entry) => entry.isInherited)).toMatchObject({
      trigger: "Static",
      isInherited: true,
      keywords: [{ keyword: "Blocker", raw: "＜Blocker＞" }],
    });
  });

  it("de-digivolves an opposing Digimon by 1 on play and deletion", () => {
    expect(compiled.effects?.find((entry) => entry.trigger === "OnPlay")?.actions[0]).toMatchObject({
      kind: "DeDigivolve",
      amount: 1,
      target: { filter: { controller: "opponent", kind: ["Digimon"] }, count: 1 },
    });
    expect(compiled.effects?.find((entry) => entry.trigger === "OnDeletion")?.actions[0]).toMatchObject({
      kind: "DeDigivolve",
      amount: 1,
      target: { filter: { controller: "opponent", kind: ["Digimon"] }, count: 1 },
    });
  });
  it("removes one evolution card when played", async () => {
    const s = setupEngine(
      {
        0: { hand: [{ card: "EX8-049", as: "source" }] },
        1: { battleArea: [{ card: "EX8-048", as: "opponent", under: ["BT1-009", "BT1-009"] }] },
      },
      { autoSelectCards: true },
    );
    const player = s.state.players[0] as PlayerState;
    s.state.memory = 10;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("source").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => player.battleArea.some((permanent) => permanent.topCard?.cardId === "EX8-049"));
    await settle(() => s.state.players[1]!.battleArea[0]!.stack.length === 1);
    expect(s.state.players[1]!.battleArea[0]!.stack).toHaveLength(1);
    expect(s.state.players[1]!.battleArea[0]!.topCard.cardId).toBe("BT1-009");
    expect(s.state.players[1]!.trash.map((card) => card.cardId)).toContain("EX8-048");
    expect(s.state.memory).toBe(5);
  });
  it("removes one evolution card when deleted", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "EX8-049", as: "source" }] },
        1: { battleArea: [{ card: "EX8-048", as: "opponent", under: ["BT1-009", "BT1-009"] }] },
      },
      { autoSelectCards: true },
    );

    await advance(s.engine).verb.deletePermanent([s.perm("source").permanentId]);
    await settle(() => s.state.players[1]!.battleArea[0]!.stack.length === 1);

    expect(s.state.players[1]!.battleArea[0]!.stack).toHaveLength(1);
    expect(s.state.players[1]!.battleArea[0]!.topCard.cardId).toBe("BT1-009");
    expect(s.state.players[1]!.trash.map((card) => card.cardId)).toContain("EX8-048");
  });

  it("evolves legally from Black level 3 for two and rejects a non-Black source", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "EX8-047", as: "base" }], hand: [{ card: "EX8-049", as: "golemon" }] },
    });
    await s.ready();
    s.state.memory = 2;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("golemon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard.cardId === "EX8-049");
    expect(s.perm("base").stack.map((card) => card.cardId)).toEqual(["EX8-047"]);
    expect(s.state.memory).toBe(0);

    const invalid = setupEngine({
      0: { battleArea: [{ card: "BT1-009", as: "base" }], hand: [{ card: "EX8-049", as: "golemon" }] },
    });
    await invalid.ready();
    invalid.state.memory = 2;
    expect(
      invalid.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: invalid.perm("base").permanentId,
        instanceId: invalid.inst("golemon").instanceId,
      }),
    ).toEqual({ ok: false, reason: "invalid-evolution" });
  });

  it("grants Blocker to the live evolution host", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT1-080", as: "host", under: ["EX8-049"] }] } });
    await s.ready();
    expect(observe(s.engine).hasKeyword(s.perm("host"), "Blocker")).toBe(true);
  });
});
