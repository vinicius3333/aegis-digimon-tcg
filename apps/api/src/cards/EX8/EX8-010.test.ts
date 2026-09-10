import { getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { settle, setupEngine } from "../../engine/testkit/harness.js";
import "./index.js";
import { compiled } from "./EX8-010.js";

describe("EX8-010", () => {
  it("matches the catalog identity, effects, and alternate evolution requirement", () => {
    expect(getCardDefinition("EX8-010")).toMatchObject({
      cardId: "EX8-010",
      nameEn: "Meramon",
      colors: ["Red"],
      kinds: ["Digimon"],
      level: 4,
      playCost: 4,
      dp: 4000,
      forms: ["Champion"],
      attributes: ["Data"],
      types: ["Flame", "NSo"],
      evoCosts: [{ color: "Red", level: 3, memoryCost: 2 }],
      effectText:
        "[Digivolve]Lv.3 w/[NSo]\u00a0trait: Cost 2 \n\n[On Play] [On Deletion] Delete 1 of your opponent's Digimon with 4000 DP or less.",
      inheritedEffectText: "[Your Turn] This Digimon gets +2000 DP.",
    });
    expect(compiled.digivolutionRequirement).toEqual([{ level: 3, traits: ["NSo"], cost: 2, isAlternate: true }]);
  });

  it("deletes an opposing Digimon with 4000 DP or less on play and deletion", () => {
    expect(compiled.effects?.find((entry) => entry.trigger === "OnPlay")?.actions[0]).toMatchObject({
      kind: "Delete",
      target: {
        count: 1,
        filter: { controller: "opponent", kind: ["Digimon"], dp: { op: "lte", value: 4000 } },
      },
    });
    expect(compiled.effects?.find((entry) => entry.trigger === "OnDeletion")?.actions[0]).toMatchObject({
      kind: "Delete",
      target: {
        count: 1,
        filter: { controller: "opponent", kind: ["Digimon"], dp: { op: "lte", value: 4000 } },
      },
    });
  });
  it("inherits +2000 DP during your turn", () =>
    expect(compiled.effects?.find((entry) => entry.isInherited)?.actions[0]).toMatchObject({
      kind: "ModifyDP",
      amount: 2000,
      duration: "permanent",
      target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
    }));
  it("deletes a 4000-DP opposing Digimon on live On Play", async () => {
    const s = setupEngine(
      {
        0: { hand: [{ card: "EX8-010", as: "meramon" }] },
        1: {
          battleArea: [
            { card: "AD1-001", as: "exact", dp: 4000 },
            { card: "AD1-001", as: "above", dp: 5000 },
          ],
        },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 10;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("meramon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[1]!.battleArea.length === 1);
    expect(s.state.players[1]!.battleArea).toHaveLength(1);
    expect(s.state.players[1]!.battleArea[0]!.topCard.cardId).toBe("AD1-001");
    expect(s.state.players[1]!.battleArea[0]!.currentDP).toBe(5000);
  });

  it("deletes at 4000 DP on deletion and preserves a 5000-DP target", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "EX8-010", as: "meramon" }] },
        1: {
          battleArea: [
            { card: "AD1-001", as: "exact", dp: 4000 },
            { card: "AD1-001", as: "above", dp: 5000 },
          ],
        },
      },
      { autoSelectCards: true },
    );
    const above = s.perm("above");
    await s.ready();
    await advance(s.engine).verb.deletePermanent([s.perm("meramon").permanentId], "byEffect");
    await settle(() => s.state.players[1]!.battleArea.length === 1);
    expect(s.state.players[1]!.battleArea).toContain(above);
  });

  it("applies its inherited +2000 DP during its controller's turn", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT1-014", as: "host", under: [{ card: "EX8-010", as: "meramon" }] }] },
    });
    await s.ready();
    expect(s.perm("host").currentDP).toBe(6000);
    s.state.turnSeat = 1;
    await advance(s.engine).recompute();
    expect(s.perm("host").currentDP).toBe(4000);
  });

  it("digivolves from an off-color level-3 NSo card for 2 and rejects an off-color non-NSo card", async () => {
    const eligible = setupEngine({
      0: { battleArea: [{ card: "EX8-030", as: "nsoBase" }], hand: [{ card: "EX8-010", as: "meramon" }] },
    });
    eligible.state.memory = 3;
    await eligible.ready();
    expect(
      eligible.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: eligible.perm("nsoBase").permanentId,
        instanceId: eligible.inst("meramon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => eligible.perm("nsoBase").topCard.instanceId === eligible.inst("meramon").instanceId);
    expect(eligible.state.memory).toBe(1);

    const ineligible = setupEngine({
      0: { battleArea: [{ card: "BT10-058", as: "blackBase" }], hand: [{ card: "EX8-010", as: "meramon" }] },
    });
    await ineligible.ready();
    expect(
      ineligible.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: ineligible.perm("blackBase").permanentId,
        instanceId: ineligible.inst("meramon").instanceId,
      }),
    ).toEqual({ ok: false, reason: "invalid-evolution" });
  });
});
