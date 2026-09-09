import { getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { hasRegisteredCompiledCard } from "../../engine/effects/interpreter.js";
import { settle, setupEngine } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { compiled } from "./EX7-056.js";
import "../index.js";

describe("EX7-056", () => {
  it("matches the catalog and fully registered IR", () => {
    expect(getCardDefinition("EX7-056")).toMatchObject({
      cardId: "EX7-056",
      nameEn: "Orochimon",
      colors: ["Purple"],
      kinds: ["Digimon"],
      level: 5,
      playCost: 6,
      dp: 6000,
      evoCosts: [{ color: "Purple", level: 4, memoryCost: 3 }],
      forms: ["Ultimate"],
      attributes: ["Virus"],
      types: ["Dark Dragon"],
    });
    expect(compiled.effects?.find((entry) => !entry.isInherited)?.keywords).toContainEqual({
      keyword: "Blocker",
      raw: "＜Blocker＞",
    });
    expect(compiled.effects?.find((entry) => entry.trigger === "OnDeletion")?.actions).toMatchObject([
      { kind: "Trash" },
      { kind: "Delete", target: { filter: { levels: [3] } } },
      { kind: "Delete", target: { filter: { levels: [4] } } },
    ]);
    expect(compiled.effects?.find((entry) => entry.isInherited)?.keywords).toContainEqual({
      keyword: "Retaliation",
      raw: "＜Retaliation＞",
    });
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
    expect(hasRegisteredCompiledCard("EX7-056")).toBe(true);
  });

  it("trashes a hand card after real battle deletion and deletes opposing level 3 and level 4 Digimon", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "EX7-056", as: "oro" }], hand: [{ card: "BT1-010", as: "cost" }] },
        1: {
          battleArea: [
            { card: "BT1-009", as: "level3" },
            { card: "BT1-014", as: "level4" },
            { card: "BT10-022", as: "defender", suspended: true },
          ],
        },
      },
      { autoSelectCards: true },
    );
    await s.ready();
    expect(observe(s.engine).hasKeyword(s.perm("oro"), "Blocker")).toBe(true);
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("oro").permanentId,
        target: { kind: "permanent", permanentId: s.perm("defender").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => !observe(s.engine).isAttacking() && s.state.players[0]!.battleArea.length === 0);
    expect(s.state.players[0]!.trash.some((card) => card.instanceId === s.inst("cost").instanceId)).toBe(true);
    expect(s.state.players[0]!.trash.some((card) => card.cardId === "EX7-056")).toBe(true);
    expect(s.state.players[0]!.hand).toHaveLength(0);
    expect(s.state.players[1]!.battleArea.map((permanent) => permanent.topCard?.cardId)).toEqual(["BT10-022"]);
  });

  it("respects an opposing Tortomon's effect-deletion protection", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "EX7-056", as: "oro" }], hand: [{ card: "BT1-010", as: "cost" }] },
        1: {
          battleArea: [
            { card: "BT1-009", as: "level3" },
            { card: "EX7-041", as: "protected" },
            { card: "BT10-022", as: "defender", suspended: true },
          ],
        },
      },
      { autoSelectCards: true },
    );
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("oro").permanentId,
        target: { kind: "permanent", permanentId: s.perm("defender").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.events.some((event) => event.kind === "blockWindowOpened"));
    expect(s.engine.applyIntent(1, { type: "declineBlock" })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.trash.some((card) => card.cardId === "EX7-056"));
    expect(s.state.players[0]!.trash.some((card) => card.instanceId === s.inst("cost").instanceId)).toBe(true);
    expect(s.state.players[1]!.battleArea.map((permanent) => permanent.topCard?.cardId)).toEqual(
      expect.arrayContaining(["EX7-041", "BT10-022"]),
    );
    expect(s.state.players[1]!.battleArea.some((permanent) => permanent.topCard.cardId === "BT1-009")).toBe(false);
  });

  it("evolves from purple level 4 with exact payment, draw, and stack", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "EX7-053", as: "base" }],
        hand: [{ card: "EX7-056", as: "oro" }],
        deck: [{ card: "BT1-009", as: "drawn" }],
      },
    });
    s.state.memory = 4;
    await s.ready();
    const sourceId = s.perm("base").topCard.instanceId;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("oro").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard.cardId === "EX7-056");
    expect(s.state.memory).toBe(1);
    expect(s.perm("base").stack.map((card) => card.instanceId)).toEqual([sourceId]);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toEqual([s.inst("drawn").instanceId]);
  });

  it("uses Blocker in a real player-directed battle from a legal evolution stack", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "EX7-056", as: "blocker", under: ["BT10-074"] }] },
        1: { battleArea: [{ card: "BT1-009", as: "attacker" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.turnSeat = 1;
    await s.ready();
    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.events.some((event) => event.kind === "blockWindowOpened"));
    expect(
      s.engine.applyIntent(0, {
        type: "declareBlock",
        blockerPermanentId: s.perm("blocker").permanentId,
      }),
    ).toEqual({ ok: true });
    await settle(() => !observe(s.engine).isAttacking());
    expect(s.state.players[0]!.battleArea.map((permanent) => permanent.topCard?.cardId)).toEqual(["EX7-056"]);
    expect(s.state.players[1]!.battleArea).toHaveLength(0);
  });

  it("uses inherited Retaliation in a real battle from a legal evolution stack", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT10-082", as: "host", under: ["BT10-074", "EX7-056"], dp: 5000 }],
      },
      1: { battleArea: [{ card: "BT1-009", as: "target", suspended: true, dp: 6000 }] },
    });
    await s.ready();
    expect(observe(s.engine).hasKeyword(s.perm("host"), "Retaliation")).toBe(true);
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "permanent", permanentId: s.perm("target").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.length === 0 && s.state.players[1]!.battleArea.length === 0);
    expect(s.state.players[0]!.battleArea).toHaveLength(0);
    expect(s.state.players[1]!.battleArea).toHaveLength(0);
  });

  it("exposes Blocker and inherited Retaliation through an evolution stack", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "EX7-056", as: "blocker" },
          { card: "BT1-009", as: "host", under: ["EX7-056"] },
        ],
      },
    });
    await s.ready();
    expect(observe(s.engine).hasKeyword(s.perm("blocker"), "Blocker")).toBe(true);
    expect(observe(s.engine).hasKeyword(s.perm("host"), "Retaliation")).toBe(true);
  });
});
