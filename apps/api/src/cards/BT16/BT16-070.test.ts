import { describe, expect, it } from "vitest";
import { EffectDuration } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { compiled } from "./BT16-070.js";
import "../index.js";

describe("BT16-070", () => {
  it("models Armor Purge", () => {
    expect(compiled.effects?.[0]).toMatchObject({ trigger: "Static", keywords: [{ keyword: "Armor Purge" }] });
  });

  it("deletes a chosen own Digimon and an opposing Digimon with equal-or-lower DP", () => {
    for (const effect of compiled.effects?.slice(1, 3) ?? []) {
      expect(effect.actions?.[0]).toMatchObject({
        kind: "SelectBind",
        optional: true,
        abortOnDecline: true,
        target: { bindAs: "chosenDigimon" },
      });
      expect(effect.actions?.[1]).toMatchObject({
        kind: "Delete",
        target: { filter: {}, fromSelectionRef: "chosenDigimon" },
      });
      expect(effect.actions?.[2]).toMatchObject({
        kind: "Delete",
        target: { filter: { relativeTo: { attr: "dp", op: "lte", selectionRef: "chosenDigimon" } } },
      });
    }
  });

  it("deletes the chosen own Digimon and a DP-eligible opponent live", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT1-009", as: "ally", dp: 3000 },
            { card: "BT11-023", as: "source" },
          ],
          hand: [{ card: "BT16-070", as: "seth" }],
        },
        1: { battleArea: [{ card: "BT1-009", as: "opponent", dp: 3000 }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferred },
    );
    const allyId = s.perm("ally").permanentId;
    preferred.push(s.perm("ally").topCard!.instanceId);
    s.state.memory = 2;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("source").permanentId,
        instanceId: s.inst("seth").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        s.perm("source").topCard?.cardId === "BT16-070" &&
        !s.state.players[0]!.battleArea.some((permanent) => permanent.permanentId === allyId) &&
        s.state.players[1]!.battleArea.length === 0,
    );

    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.permanentId === allyId)).toBe(false);
    expect(s.state.players[1]!.battleArea).toHaveLength(0);
    expect(observe(s.engine).hasKeyword(s.perm("seth"), "Armor Purge")).toBe(true);
  });

  it("deletes the chosen own Digimon and an eligible opponent on a natural attack", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT1-009", as: "ally", dp: 3000 },
            { card: "BT16-070", as: "seth", dp: 5000 },
          ],
        },
        1: { battleArea: [{ card: "BT1-009", as: "opponent", dp: 3000 }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferred },
    );
    const allyId = s.perm("ally").permanentId;
    preferred.push(s.perm("ally").topCard!.instanceId);

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("seth").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        !s.state.players[0]!.battleArea.some((permanent) => permanent.permanentId === allyId) &&
        s.state.players[1]!.battleArea.length === 0,
    );

    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.permanentId === allyId)).toBe(false);
    expect(s.state.players[1]!.battleArea).toHaveLength(0);
  });
});

describe("BT16-070 Sethmon — KB Q&A rulings", () => {
  // Engine gap: `beAffected` immunity is only honored against the opponent's effects, so the
  // controller's own Sethmon deletes a Quantumon that declared Digimon immunity.
  it.fails("can choose a Quantumon unaffected by Digimon effects and delete only the opponent's Digimon (Q2657)", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "LM-020", as: "quantumon" },
            { card: "BT11-023", as: "veemon" },
          ],
          hand: [{ card: "BT16-070", as: "seth" }],
        },
        1: {
          battleArea: [
            { card: "BT1-009", as: "withinDp", dp: 13000 },
            { card: "BT1-009", as: "aboveDp", dp: 14000 },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferred },
    );
    // The ledger entry Quantumon's [Start of Opponent's Turn] installs after a matching "Digimon" declaration.
    advance(s.engine).ledgers.continuous.addRestriction(
      s.perm("quantumon").permanentId,
      "beAffected",
      EffectDuration.UntilEachTurnEnd,
      { fromSourceKind: ["Digimon"] },
    );
    preferred.push(s.perm("quantumon").topCard!.instanceId, s.perm("aboveDp").topCard!.instanceId);
    s.state.memory = 2;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("veemon").permanentId,
        instanceId: s.inst("seth").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.battleArea.length === 1);

    expect(s.perm("veemon").topCard?.cardId).toBe("BT16-070");
    expect(s.state.players[1]!.battleArea.map((permanent) => permanent.permanentId)).toEqual([
      s.perm("aboveDp").permanentId,
    ]);
    expect(s.state.players[0]!.battleArea.map((permanent) => permanent.topCard?.cardId)).toContain("LM-020");
    expect(s.state.players[0]!.trash.map((card) => card.cardId)).not.toContain("LM-020");
  });
});
