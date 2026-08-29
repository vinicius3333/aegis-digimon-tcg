import { describe, expect, it } from "vitest";
import { getCardDefinition } from "@aegis/shared";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./BT26-101.js";
import { observe } from "../../engine/testkit/observe.js";
import "../index.js";

describe("BT26-101 compiled fidelity", () => {
  it("preserves the TS waiver, conditional grant, and modal DP seam without an unprinted Security effect", () => {
    const card = compiled;
    expect(getCardDefinition("BT26-101")).toMatchObject({
      nameEn: "Cross Arts",
      colors: ["White"],
      kinds: ["Option"],
      playCost: 4,
      types: ["ADAMAS", "TS"],
    });
    expect(card?.coverage).toBe("full");
    expect(card?.residual).toEqual([]);
    expect(card.effects.find((effect) => effect.trigger === "Static")).toMatchObject({
      actions: [{ kind: "WaiveColorRequirement", condition: { kind: "youHave" } }],
    });
    expect(card?.effects?.find((effect) => effect.trigger === "Security")).toBeUndefined();
    expect(card.effects.find((effect) => effect.trigger === "Main")?.actions).toMatchObject([
      { kind: "GainKeyword", keyword: { keyword: "Blocker" } },
      { kind: "ModifyDP", amount: 3000 },
      { kind: "Modal", choose: 1, options: [[{ kind: "SelectBind" }, { kind: "Delete" }], [{ kind: "Unsuspend" }]] },
    ]);
  });

  it("waives the white use requirement only while its controller has a TS card", async () => {
    const withoutTs = setupEngine({ 0: { hand: [{ card: "BT26-101", as: "option" }] } });
    withoutTs.state.memory = 4;
    await withoutTs.ready();
    expect(
      withoutTs.engine.applyIntent(0, { type: "playCard", instanceId: withoutTs.inst("option").instanceId }),
    ).toEqual({ ok: false, reason: "color-requirement-unmet" });

    const withTs = setupEngine(
      {
        0: {
          hand: [{ card: "BT26-101", as: "option" }],
          battleArea: [{ card: "BT26-009", as: "tsDigimon" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    withTs.state.memory = 4;
    await withTs.ready();
    expect(withTs.engine.applyIntent(0, { type: "playCard", instanceId: withTs.inst("option").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => withTs.state.players[0]!.trash.some(({ cardId }) => cardId === "BT26-101"));
    expect(withTs.state.memory).toBe(0);
  });

  it("applies the named-Tamer bonus before using the chosen TS Digimon's DP to delete", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "BT26-101", as: "option" }],
          battleArea: [
            { card: "BT26-009", as: "tsDigimon" },
            { card: "BT1-009", as: "nonTs" },
            { card: "BT25-086", as: "dan" },
          ],
        },
        1: { battleArea: [{ card: "BT1-009", as: "target", dp: 5000 }] },
      },
      { autoSelectCards: true, autoAcceptOptional: true },
    );
    s.state.memory = 4;
    await s.ready();
    const targetId = s.perm("target").permanentId;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => !s.state.players[1]!.battleArea.some(({ permanentId }) => permanentId === targetId));

    expect(observe(s.engine).hasKeyword(s.perm("tsDigimon"), "Blocker")).toBe(true);
    expect(s.perm("tsDigimon").currentDP).toBe(5000);
    expect(observe(s.engine).hasKeyword(s.perm("nonTs"), "Blocker")).toBe(false);
    expect(s.perm("nonTs").currentDP).toBe(3000);
  });

  it("can choose the unsuspend mode without the named Tamer (Q7182)", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "BT26-101", as: "option" }],
          battleArea: [{ card: "BT26-009", as: "tsDigimon", suspended: true }],
        },
      },
      { autoSelectCards: true, autoAcceptOptional: true, preferOptionIndex: 1 },
    );
    s.state.memory = 4;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => !s.perm("tsDigimon").isSuspended);

    expect(s.perm("tsDigimon").keywords).not.toContain("Blocker");
    expect(s.perm("tsDigimon").currentDP).toBe(2000);
  });

  it("Q7182: resolves the chosen modal effect without the named Tamer and grants no bonus", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "BT26-101", as: "option" }],
          battleArea: [{ card: "BT26-009", as: "tsDigimon" }],
        },
        1: { battleArea: [{ card: "BT1-009", as: "target", dp: 2000 }] },
      },
      { autoSelectCards: true, autoAcceptOptional: true },
    );
    s.state.memory = 4;
    await s.ready();
    const targetId = s.perm("target").permanentId;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => !s.state.players[1]!.battleArea.some(({ permanentId }) => permanentId === targetId));

    expect(s.perm("tsDigimon").keywords).not.toContain("Blocker");
    expect(s.perm("tsDigimon").currentDP).toBe(2000);
  });
});
