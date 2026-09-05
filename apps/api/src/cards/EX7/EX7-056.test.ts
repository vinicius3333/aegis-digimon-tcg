import { describe, expect, it } from "vitest";
import { EffectTiming } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { settle, setupEngine } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { compiled } from "./EX7-056.js";
import "../index.js";

describe("EX7-056", () => {
  it("has Blocker and on deletion trashes a card to delete opposing level 3 and level 4 Digimon", () => {
    expect(compiled.effects?.find((entry) => !entry.isInherited)?.keywords).toContainEqual({
      keyword: "Blocker",
      raw: "＜Blocker＞",
    });
    expect(compiled.effects?.find((entry) => entry.trigger === "OnDeletion")?.actions).toMatchObject([
      { kind: "Trash" },
      { kind: "Delete", target: { filter: { levels: [3] } } },
      { kind: "Delete", target: { filter: { levels: [4] } } },
    ]);
  });
  it("inherits Retaliation", () =>
    expect(compiled.effects?.find((entry) => entry.isInherited)?.keywords).toContainEqual({
      keyword: "Retaliation",
      raw: "＜Retaliation＞",
    }));

  it("trashes a hand card after real battle deletion and deletes opposing level 3 and level 4 Digimon", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "EX7-056", as: "oro" }], hand: ["BT1-001"] },
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
    expect(s.state.players[0]!.trash.some((card) => card.cardId === "BT1-001")).toBe(true);
    expect(s.state.players[0]!.trash.some((card) => card.cardId === "EX7-056")).toBe(true);
    expect(s.state.players[0]!.hand).toHaveLength(0);
    expect(s.state.players[1]!.battleArea.map((permanent) => permanent.topCard?.cardId)).toEqual(["BT10-022"]);
  });

  it("respects an opposing Tortomon's effect-deletion protection", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "EX7-056", as: "oro" }], hand: ["BT1-001"] },
        1: { battleArea: ["BT1-009", { card: "EX7-041", as: "protected" }] },
      },
      { autoSelectCards: true },
    );
    await s.ready();
    await advance(s.engine).fire(EffectTiming.OnDestroyedAnyone, s.perm("oro"));
    expect(s.state.players[0]!.trash.some((card) => card.cardId === "BT1-001")).toBe(true);
    expect(s.state.players[1]!.battleArea.map((permanent) => permanent.topCard?.cardId)).toEqual(["EX7-041"]);
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
