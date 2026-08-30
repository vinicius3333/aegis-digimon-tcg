import { describe, expect, it } from "vitest";
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
      expect(effect.actions?.[1]).toMatchObject({ kind: "Delete", target: { fromSelectionRef: "chosenDigimon" } });
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
        // "as much or less DP as it" is measured against the CHOSEN ally (3000), so a
        // DP-eligible opponent has to be at or below that.
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
