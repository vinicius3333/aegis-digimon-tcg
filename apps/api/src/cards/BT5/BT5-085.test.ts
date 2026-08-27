import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "./BT5-084.js";
import { compiled } from "./BT5-085.js";
import "./BT5-087.js";

describe("BT5-085 Armageddemon", () => {
  it("deletes a Diaboromon to reduce its play cost by 12 and enters with Rush", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "TOKEN-Diaboromon", as: "diaboromon" },
            { card: "BT24-065", as: "xAntibody" },
            { card: "BT5-073", as: "unrelated" },
          ],
          hand: [{ card: "BT5-085", as: "armageddemon" }],
        },
        1: { battleArea: [{ card: "BT5-084", as: "opponentDiaboromon" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    // Immediate validation must be able to cover the printed 15 before the
    // interactive -12 reducer resolves; memory 5 has an affordability ceiling of 15.
    s.state.memory = 5;
    const diaboromonId = s.perm("diaboromon").permanentId;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("armageddemon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() =>
      s.state.players[0]!.battleArea.some((p) => p.topCard.instanceId === s.inst("armageddemon").instanceId),
    );
    await s.engine.recomputeContinuousEffects();

    const played = s.state.players[0]!.battleArea.find(
      (p) => p.topCard.instanceId === s.inst("armageddemon").instanceId,
    )!;
    expect(s.state.memory).toBe(2);
    expect(s.state.players[0]!.battleArea.some((p) => p.permanentId === diaboromonId)).toBe(false);
    expect(s.perm("xAntibody").topCard.cardId).toBe("BT24-065");
    expect(s.perm("unrelated").topCard.cardId).toBe("BT5-073");
    expect(s.perm("opponentDiaboromon").topCard.cardId).toBe("BT5-084");
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: played.permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
  });

  it("represents Rush as an intrinsic keyword without a GainKeyword action", () => {
    const rush = compiled.effects.find(
      (effect) => effect.trigger === "Static" && effect.keywords?.some((k) => k.keyword === "Rush"),
    );

    expect(rush).toEqual(
      expect.objectContaining({
        actions: [],
        keywords: [expect.objectContaining({ keyword: "Rush", raw: "＜Rush＞" })],
      }),
    );
  });

  it("may decline deleting a Diaboromon and then pays the full play cost", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT5-084", as: "diaboromon" }],
          hand: [{ card: "BT5-085", as: "armageddemon" }],
        },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    s.state.memory = 15;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("armageddemon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() =>
      s.state.players[0]!.battleArea.some((p) => p.topCard?.instanceId === s.inst("armageddemon").instanceId),
    );

    expect(s.state.memory).toBe(0);
    expect(s.state.players[0]!.battleArea.some((p) => p.permanentId === s.perm("diaboromon").permanentId)).toBe(true);
  });

  it("prevents level 7 Digimon from activating When Digivolving effects", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "BT5-085", as: "armageddemon" },
          { card: "BT5-087", as: "ownLevel7" },
        ],
      },
      1: { battleArea: [{ card: "BT5-087", as: "level7" }] },
    });
    await s.ready();

    expect(observe(s.engine).isRestricted(s.perm("ownLevel7"), "cannotActivateWhenDigivolving")).toBe(true);
    expect(observe(s.engine).isRestricted(s.perm("level7"), "cannotActivateWhenDigivolving")).toBe(true);
  });

  it("suppresses a restricted level 7 When Digivolving effect", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT5-085", as: "armageddemon" },
            { card: "BT10-069", as: "base" },
          ],
          hand: [{ card: "BT5-087", as: "level7" }],
          deck: ["BT1-010", "BT1-011", "BT1-012", "BT1-013"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 6;
    await s.engine.recomputeContinuousEffects();

    expect(observe(s.engine).isRestricted(s.perm("base"), "cannotActivateWhenDigivolving")).toBe(false);
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("level7").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard.cardId === "BT5-087");

    expect(s.perm("base").topCard.cardId).toBe("BT5-087");
    expect(observe(s.engine).isRestricted(s.perm("base"), "cannotActivateWhenDigivolving")).toBe(true);
    expect(s.state.players[0]!.deck).toHaveLength(3);
  });
});
