import { EffectTiming, getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { settle, setupEngine } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "../index.js";
import { compiled } from "./BT23-060.js";

describe("BT23-060 Machinedramon", () => {
  it("matches every catalog field and complete compiled clause", () => {
    expect(getCardDefinition("BT23-060")).toMatchObject({
      cardId: "BT23-060",
      nameEn: "Machinedramon",
      colors: ["Black", "Red"],
      kinds: ["Digimon"],
      level: 6,
      playCost: 12,
      dp: 12000,
      evoCosts: [
        { color: "Black", level: 5, memoryCost: 4 },
        { color: "Red", level: 5, memoryCost: 4 },
      ],
      forms: ["Mega"],
      attributes: ["Virus"],
      types: ["Machine", "Zaxon", "CS"],
    });
    expect(compiled.digivolutionRequirement).toEqual([{ level: 5, traits: ["CS"], cost: 4, isAlternate: true }]);
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
  });

  it("de-digivolves first, then deletes the resulting 8000-DP-or-lower Digimon", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT23-060", as: "machinedramon" }] },
        1: {
          battleArea: [
            { card: "BT23-068", under: ["BT23-063"], as: "stacked" },
            { card: "BT23-071", as: "large" },
          ],
        },
      },
      { autoSelectCards: true },
    );
    const stackedId = s.perm("stacked").permanentId;
    const largeId = s.perm("large").permanentId;
    await (
      s.engine as unknown as {
        fireTiming(timing: EffectTiming, trigger: Record<string, unknown>): Promise<void>;
      }
    ).fireTiming(EffectTiming.OnPlay, { subjectPermanentId: s.perm("machinedramon").permanentId });
    expect(s.state.players[1]!.battleArea.some((p) => p.permanentId === stackedId)).toBe(false);
    expect(s.state.players[1]!.battleArea.some((p) => p.permanentId === largeId)).toBe(true);
  });

  it("exposes Security Attack +1 and Reboot through the live keyword seam", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT23-060", as: "machinedramon" }] } });
    await s.ready();
    expect(observe(s.engine).keywordAmount(s.perm("machinedramon"), "SecurityAttack")).toBe(1);
    expect(observe(s.engine).hasKeyword(s.perm("machinedramon"), "Reboot")).toBe(true);
    const keywords = compiled.effects
      .filter((entry) => entry.trigger === "Static")
      .flatMap((entry) => entry.actions.map((action: any) => action.keyword?.keyword));
    expect(keywords).toEqual(["SecurityAttack", "Reboot"]);
    expect((compiled.effects[0]!.actions[0] as any).keyword.amount).toBe(1);
  });

  it("activates a face-up Zaxon security card's On Play effect when attacking", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT23-060", as: "machinedramon" }],
          security: [{ card: "BT23-015", faceUp: true }],
        },
        1: {
          battleArea: [{ card: "AD1-001", as: "victim" }],
          security: ["BT1-028", "BT1-028"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const victimId = s.perm("victim").permanentId;
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("machinedramon").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => !s.state.players[1]!.battleArea.some((permanent) => permanent.permanentId === victimId));
    expect(s.state.players[1]!.battleArea.some((permanent) => permanent.permanentId === victimId)).toBe(false);
  });

  it("forces the borrowed BT23-045 processing condition even when ordinary resolution may be declined", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT23-060", as: "machinedramon" }],
          security: [{ card: "BT23-045", faceUp: true }],
          trash: [{ card: "BT23-043", as: "royalBase" }],
        },
        1: { battleArea: [{ card: "BT1-009", as: "victim" }] },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    const victimId = s.perm("victim").permanentId;
    const royalBaseId = s.inst("royalBase").instanceId;

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("machinedramon").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => !observe(s.engine).isAttacking());

    expect(s.state.players[0]!.security.at(-1)).toMatchObject({ instanceId: royalBaseId, faceUp: true });
    expect(s.state.players[0]!.trash.some((card) => card.instanceId === royalBaseId)).toBe(false);
    expect(s.state.players[1]!.battleArea.some((permanent) => permanent.permanentId === victimId)).toBe(false);
  });

  it("uses an eligible trash card before a hand card for the borrowed processing condition", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT23-060", as: "machinedramon" }],
          security: [{ card: "BT23-045", faceUp: true }],
          hand: [{ card: "BT23-015", as: "handZaxon" }],
          trash: [{ card: "BT23-043", as: "trashRoyalBase" }],
        },
        1: { battleArea: [{ card: "BT1-009", as: "victim" }] },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("machinedramon").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => !observe(s.engine).isAttacking());

    expect(s.state.players[0]!.security.at(-1)).toMatchObject({
      instanceId: s.inst("trashRoyalBase").instanceId,
      faceUp: true,
    });
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("handZaxon").instanceId)).toBe(true);
  });

  it("falls back to an eligible hand card when the borrowed trash source is empty", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT23-060", as: "machinedramon" }],
          security: [{ card: "BT23-045", faceUp: true }],
          hand: [{ card: "BT23-015", as: "handZaxon" }],
        },
        1: { battleArea: [{ card: "BT1-009", as: "victim" }] },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("machinedramon").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => !observe(s.engine).isAttacking());

    expect(s.state.players[0]!.security.at(-1)).toMatchObject({
      instanceId: s.inst("handZaxon").instanceId,
      faceUp: true,
    });
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("handZaxon").instanceId)).toBe(false);
  });

  it("does not force another eligible Zaxon borrower's costless optional On Play follow-up", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT23-060", as: "machinedramon" }],
          security: [{ card: "BT23-015", faceUp: true }],
        },
        1: { battleArea: [{ card: "BT1-009", as: "victim" }] },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    const victimInstanceId = s.inst("victim").instanceId;

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("machinedramon").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => !observe(s.engine).isAttacking());

    expect(s.state.players[1]!.trash.some((card) => card.instanceId === victimInstanceId)).toBe(true);
  });

  it("declares the Q5331 override only for BT23-045 On Play", () => {
    const action = (compiled.effects.find((entry) => entry.trigger === "WhenAttacking") as any).actions[0];
    expect(action.borrowedEffectOverrides).toEqual({
      sourceCardId: "BT23-045",
      trigger: "OnPlay",
      forceCostProcessing: true,
      preferTrashCostSource: true,
    });
  });

  it("consumes its once-per-turn use even when no face-up Zaxon security card exists", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT23-060", as: "machinedramon" }],
          security: [{ card: "BT23-015", as: "lender" }],
        },
        1: {
          battleArea: [{ card: "AD1-001", as: "victim" }],
          security: ["BT1-028", "BT1-028", "BT1-028", "BT1-028"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const attack = () =>
      s.engine.applyIntent(0, {
        type: "attack" as const,
        attackerPermanentId: s.perm("machinedramon").permanentId,
        target: { kind: "player" as const },
      });
    expect(attack()).toEqual({ ok: true });
    await settle(() => !observe(s.engine).isAttacking());
    await advance(s.engine).verb.unsuspend([s.perm("machinedramon").permanentId]);
    s.inst("lender").faceUp = true;
    expect(attack()).toEqual({ ok: true });
    await settle(() => !observe(s.engine).isAttacking());
    expect(
      s.state.players[1]!.battleArea.some((permanent) => permanent.permanentId === s.perm("victim").permanentId),
    ).toBe(true);
  });

  it("de-digivolves one opposing Digimon and then deletes one at 8000 DP or less on play and digivolving", () => {
    for (const trigger of ["OnPlay", "WhenDigivolving"]) {
      const actions = (compiled.effects.find((entry) => entry.trigger === trigger) as any).actions;
      expect(actions[0]).toMatchObject({
        kind: "DeDigivolve",
        target: { filter: { controller: "opponent", kind: ["Digimon"] }, count: 1 },
        amount: 1,
      });
      expect(actions[1]).toMatchObject({
        kind: "Delete",
        target: { filter: { controllerDefault: "opponent", dp: { op: "lte", value: 8000 } }, count: 1 },
      });
    }
  });

  it("once per turn activates an On Play effect on a face-up Zaxon security Digimon", () => {
    const effect = compiled.effects.find((entry) => entry.trigger === "WhenAttacking") as any;
    expect(effect).toMatchObject({
      frequency: "OncePerTurn",
      actions: [
        {
          kind: "ActivateForeignEffect",
          zone: "security",
          fromTriggers: ["OnPlay"],
          count: 1,
          optional: false,
          borrowedEffectOverrides: {
            sourceCardId: "BT23-045",
            trigger: "OnPlay",
            forceCostProcessing: true,
            preferTrashCostSource: true,
          },
          filter: {
            controller: "mine",
            kind: ["Digimon"],
            faceUp: true,
            nameOrTrait: [{ tokens: ["Zaxon"], match: "trait" }],
          },
        },
      ],
    });
  });

  it("digivolves for 4 from an off-color level-5 CS card and rejects a non-CS peer", () => {
    const legal = setupEngine({
      0: { battleArea: [{ card: "BT23-044", as: "base" }], hand: [{ card: "BT23-060", as: "machine" }] },
    });
    expect(
      legal.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: legal.perm("base").permanentId,
        instanceId: legal.inst("machine").instanceId,
      }),
    ).toEqual({ ok: true });
    const illegal = setupEngine({
      0: { battleArea: [{ card: "BT1-039", as: "base" }], hand: [{ card: "BT23-060", as: "machine" }] },
    });
    expect(
      illegal.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: illegal.perm("base").permanentId,
        instanceId: illegal.inst("machine").instanceId,
      }),
    ).toEqual({ ok: false, reason: "invalid-evolution" });
  });
});
