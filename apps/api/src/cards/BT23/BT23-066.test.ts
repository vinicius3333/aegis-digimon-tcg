import { EffectTiming, getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { settle, setupEngine } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "../index.js";
import { compiled } from "./BT23-066.js";

describe("BT23-066 Matadormon", () => {
  it("matches every catalog field and complete compiled clause", () => {
    expect(getCardDefinition("BT23-066")).toMatchObject({
      cardId: "BT23-066",
      nameEn: "Matadormon",
      colors: ["Purple"],
      kinds: ["Digimon"],
      level: 5,
      playCost: 7,
      dp: 7000,
      evoCosts: [{ color: "Purple", level: 4, memoryCost: 3 }],
      forms: ["Ultimate"],
      attributes: ["Virus"],
      types: ["Undead", "CS"],
    });
    expect(compiled.digivolutionRequirement).toEqual([{ level: 4, traits: ["CS"], cost: 3, isAlternate: true }]);
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
  });

  it("deletes a level-4 opponent on play but does not run the trash-evolution-only tail", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT23-066", as: "matadormon" }],
          trash: [{ card: "BT23-062", as: "candidate" }],
        },
        1: { battleArea: [{ card: "BT23-063", as: "target" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const targetId = s.perm("target").permanentId;
    const candidateId = s.inst("candidate").instanceId;
    await s.ready();
    await (
      s.engine as unknown as {
        fireTiming(timing: EffectTiming, trigger: Record<string, unknown>): Promise<void>;
      }
    ).fireTiming(EffectTiming.OnPlay, { subjectPermanentId: s.perm("matadormon").permanentId });
    expect(s.state.players[1]!.battleArea.some((p) => p.permanentId === targetId)).toBe(false);
    expect(s.state.players[0]!.trash.some((card) => card.instanceId === candidateId)).toBe(true);
  });

  it("exposes Scapegoat through the live keyword seam", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT23-066", as: "matadormon" }] } });
    await s.ready();
    expect(observe(s.engine).hasKeyword(s.perm("matadormon"), "Scapegoat")).toBe(true);
    expect(compiled.effects.find((entry) => entry.trigger === "Static")?.keywords?.[0]?.keyword).toBe("Scapegoat");
  });

  it("when evolved from trash deletes a level 4 and plays a cost-3 Undead card from trash", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT23-063", as: "attacker" }],
          trash: [
            { card: "BT23-066", as: "matadormon" },
            { card: "BT23-062", as: "dracmon" },
          ],
        },
        1: {
          battleArea: [{ card: "BT23-063", as: "target" }],
          security: ["BT1-028"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true },
    );
    s.state.memory = 5;
    const targetId = s.perm("target").permanentId;
    const dracmonId = s.inst("dracmon").instanceId;
    await advance(s.engine).fire(EffectTiming.OnUseAttack, s.perm("attacker"));
    await settle(() => s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.instanceId === dracmonId));
    expect(s.perm("attacker").topCard?.cardId).toBe("BT23-066");
    expect(s.state.players[1]!.battleArea.some((permanent) => permanent.permanentId === targetId)).toBe(false);
    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.instanceId === dracmonId)).toBe(true);
    expect(s.state.memory).toBe(2);
  });

  it("deletes one opposing level 4 or lower Digimon on play and when digivolving", () => {
    for (const trigger of ["OnPlay", "WhenDigivolving"]) {
      const action = (compiled.effects.find((entry) => entry.trigger === trigger) as any).actions[0];
      expect(action).toMatchObject({
        kind: "Delete",
        target: { filter: { controller: "opponent", levelComparison: { op: "lte", value: 4 } }, count: 1 },
      });
    }
  });

  it("only plays an Undead or CS card from trash when the digivolution came from trash", () => {
    for (const trigger of ["OnPlay", "WhenDigivolving"]) {
      const action = (compiled.effects.find((entry) => entry.trigger === trigger) as any).actions[1];
      expect(action).toMatchObject({
        kind: "PlayWithoutCost",
        from: ["trash"],
        payCost: false,
        optional: true,
        condition: { kind: "digivolvedFromZone", zone: "trash" },
        target: { filter: { playCostLte: 3, nameOrTrait: [{ tokens: ["Undead", "CS"], match: "trait" }] } },
      });
    }
  });

  it("prevents another of your Digimon from leaving play once per turn by deleting this Digimon", () => {
    const effect = compiled.effects.find((entry) => entry.trigger === "AllTurns") as any;
    expect(effect).toMatchObject({
      isInherited: true,
      frequency: "OncePerTurn",
      actions: [{ kind: "Replacement", event: "wouldLeavePlay" }],
    });
    expect(effect.actions[0].actions[0]).toMatchObject({
      kind: "Prevent",
      mode: "leavePlay",
      optional: true,
      abortOnDecline: true,
      cost: { kind: "deleteOwn", target: { filter: { isSelfRef: true }, isSelf: true } },
    });
  });

  it("deletes its carrier to prevent another ally's opponent-effect deletion", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT23-067", under: ["BT23-066"], as: "carrier" },
            { card: "BT23-061", as: "ally" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.turnSeat = 1;
    const allyId = s.perm("ally").permanentId;
    const carrierId = s.perm("carrier").permanentId;
    await advance(s.engine).verb.deletePermanent([allyId], "byEffect");
    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.permanentId === allyId)).toBe(true);
    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.permanentId === carrierId)).toBe(false);
  });

  it("digivolves for 3 from an off-color level-4 CS card and rejects a non-CS peer", () => {
    const legal = setupEngine({
      0: { battleArea: [{ card: "BT23-050", as: "base" }], hand: [{ card: "BT23-066", as: "matadormon" }] },
    });
    expect(
      legal.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: legal.perm("base").permanentId,
        instanceId: legal.inst("matadormon").instanceId,
      }),
    ).toEqual({ ok: true });
    const illegal = setupEngine({
      0: { battleArea: [{ card: "BT1-025", as: "base" }], hand: [{ card: "BT23-066", as: "matadormon" }] },
    });
    expect(
      illegal.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: illegal.perm("base").permanentId,
        instanceId: illegal.inst("matadormon").instanceId,
      }),
    ).toEqual({ ok: false, reason: "invalid-evolution" });
  });
});
