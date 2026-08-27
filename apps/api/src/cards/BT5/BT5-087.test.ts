import { EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT5-087.js";

describe("BT5-087 Omnimon Zwart", () => {
  it("mills three then plays up to two eligible Digimon from trash", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT5-087", as: "omnimon" }],
          deck: ["BT1-010", "BT1-011", "BT1-012"],
          trash: [
            { card: "BT5-059", as: "black" },
            { card: "BT5-071", as: "purple" },
            { card: "BT10-012", as: "tooExpensive" },
            { card: "BT1-010", as: "wrongColor" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );

    await advance(s.engine).fire(EffectTiming.WhenDigivolving, s.perm("omnimon"));
    await settle(() => s.state.players[0]!.battleArea.length === 3);

    expect(s.state.players[0]!.deck).toHaveLength(0);
    expect(s.state.players[0]!.battleArea.some((p) => p.topCard.instanceId === s.inst("black").instanceId)).toBe(true);
    expect(s.state.players[0]!.battleArea.some((p) => p.topCard.instanceId === s.inst("purple").instanceId)).toBe(true);
    expect(s.state.players[0]!.trash.some((card) => card.instanceId === s.inst("tooExpensive").instanceId)).toBe(true);
    expect(s.state.players[0]!.trash.some((card) => card.instanceId === s.inst("wrongColor").instanceId)).toBe(true);
  });

  it("returns a level 6 source to hand to delete an unsuspended Digimon when attacking", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT5-087", under: [{ card: "BT5-070", as: "level6" }], as: "omnimon" },
            { card: "BT5-087", under: [{ card: "AD1-004", as: "otherLevel6" }], as: "other" },
          ],
        },
        1: {
          battleArea: [
            { card: "BT2-047", as: "suspendedTarget", suspended: true },
            { card: "BT2-047", as: "target" },
            { card: "BT5-085", as: "tooExpensive" },
          ],
          security: ["BT1-010"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const suspendedTargetId = s.perm("suspendedTarget").permanentId;
    const targetId = s.perm("target").permanentId;
    const tooExpensiveId = s.perm("tooExpensive").permanentId;

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("omnimon").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.battleArea.length === 2);

    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("level6").instanceId)).toBe(true);
    expect(s.perm("other").stack.some((card) => card.instanceId === s.inst("otherLevel6").instanceId)).toBe(true);
    expect(s.state.players[1]!.battleArea.some((p) => p.permanentId === suspendedTargetId)).toBe(true);
    expect(s.state.players[1]!.battleArea.some((p) => p.permanentId === tooExpensiveId)).toBe(true);
    expect(s.state.players[1]!.battleArea.some((p) => p.permanentId === targetId)).toBe(false);
  });

  it("may decline playing from trash after milling three cards", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT5-087", as: "omnimon" }],
          deck: ["BT1-010", "BT1-011", "BT1-012"],
          trash: [{ card: "BT5-059", as: "black" }],
        },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );

    await advance(s.engine).fire(EffectTiming.WhenDigivolving, s.perm("omnimon"));
    await settle(() => s.state.players[0]!.deck.length === 0);

    expect(s.state.players[0]!.battleArea).toHaveLength(1);
    expect(s.state.players[0]!.trash.some((card) => card.instanceId === s.inst("black").instanceId)).toBe(true);
  });

  it("plays one eligible card when fewer than two are available", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT5-087", as: "omnimon" }],
          deck: ["BT1-010", "BT1-011", "BT1-012"],
          trash: [{ card: "BT5-059", as: "black" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );

    await advance(s.engine).fire(EffectTiming.WhenDigivolving, s.perm("omnimon"));
    await settle(() => s.state.players[0]!.battleArea.length === 2);

    expect(s.state.players[0]!.battleArea.some((p) => p.topCard.instanceId === s.inst("black").instanceId)).toBe(true);
    expect(s.state.players[0]!.trash.some((card) => card.instanceId === s.inst("black").instanceId)).toBe(false);
  });

  it("may decline returning a level 6 source, leaving the target and source in place", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT5-087", under: [{ card: "BT5-070", as: "level6" }], as: "omnimon" }] },
        1: { battleArea: [{ card: "BT2-047", as: "target" }], security: ["BT1-010"] },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("omnimon").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("omnimon").isSuspended);

    expect(s.perm("omnimon").stack.some((card) => card.instanceId === s.inst("level6").instanceId)).toBe(true);
    expect(s.state.players[1]!.battleArea.some((p) => p.permanentId === s.perm("target").permanentId)).toBe(true);
  });

  it("does not pay the source cost when no opponent target is legal", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT5-087", under: [{ card: "BT5-070", as: "level6" }], as: "omnimon" }] },
        1: { battleArea: [{ card: "BT2-047", as: "suspendedTarget", suspended: true }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("omnimon").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("omnimon").isSuspended);

    expect(s.perm("omnimon").stack.some((card) => card.instanceId === s.inst("level6").instanceId)).toBe(true);
    expect(s.state.players[1]!.battleArea.some((p) => p.permanentId === s.perm("suspendedTarget").permanentId)).toBe(
      true,
    );
  });
});
