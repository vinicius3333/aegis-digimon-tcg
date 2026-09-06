import { describe, expect, it } from "vitest";
import { EffectTiming } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { compiled as BT25_041 } from "./BT25-041.js";
import "../index.js";

type ModalAction = {
  kind?: string;
  labels?: string[];
  options?: ModalAction[][];
};

describe("BT25-041 Murasamemon", () => {
  it("exposes its printed Alliance keyword", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT25-041", as: "murasamemon" }] } });
    await s.ready();

    expect(observe(s.engine).hasKeyword(s.perm("murasamemon"), "Alliance")).toBe(true);
  });

  it("uses Alliance in a real attack and supports refusing the ally", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT25-041", as: "attacker", dp: 7000 },
            { card: "BT1-009", as: "ally" },
          ],
          security: ["BT1-010"],
        },
        1: { battleArea: [{ card: "BT1-062", as: "defender", suspended: true, dp: 8000 }], security: ["BT1-010"] },
      },
      { autoDeclineOptional: true, autoSelectCards: true, autoChooseOption: true },
    );
    await s.ready();
    const combat = (s.engine as unknown as { combat: { hasOpenAllianceDecision: boolean } }).combat;
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "permanent", permanentId: s.perm("defender").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => combat.hasOpenAllianceDecision);
    expect(s.engine.applyIntent(0, { type: "respondAlliance", allyPermanentId: s.perm("ally").permanentId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[1]!.battleArea.length === 0);
    expect(s.state.players[1]!.battleArea).toHaveLength(0);
    expect(s.perm("ally").isSuspended).toBe(true);
    expect(s.state.players[1]!.security).toHaveLength(1);

    const refused = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT25-041", as: "attacker", dp: 7000 },
            { card: "BT1-009", as: "ally" },
          ],
          security: ["BT1-010"],
        },
        1: { battleArea: [{ card: "BT1-062", as: "defender", suspended: true, dp: 8000 }], security: ["BT1-010"] },
      },
      { autoDeclineOptional: true, autoSelectCards: true, autoChooseOption: true },
    );
    await refused.ready();
    const refusedCombat = (refused.engine as unknown as { combat: { hasOpenAllianceDecision: boolean } }).combat;
    expect(
      refused.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: refused.perm("attacker").permanentId,
        target: { kind: "permanent", permanentId: refused.perm("defender").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => refusedCombat.hasOpenAllianceDecision);
    expect(refused.engine.applyIntent(0, { type: "respondAlliance" })).toEqual({ ok: true });
    await settle(() => refused.state.players[0]!.battleArea.length === 1);
    expect(refused.state.players[0]!.battleArea).toHaveLength(1);
    expect(refused.perm("ally").isSuspended).toBe(false);
    expect(refused.state.players[1]!.battleArea).toHaveLength(1);
  });

  it("keeps both payment choices and both play/use choices", () => {
    for (const trigger of ["WhenDigivolving", "WhenAttacking"] as const) {
      const effect = BT25_041.effects?.find((entry) => entry.trigger === trigger);
      expect(effect?.frequency).toBe("OncePerTurn");
      const payment = effect?.actions?.[0] as ModalAction;
      expect(payment.kind).toBe("Modal");
      expect(payment.options).toHaveLength(2);
      expect(payment.options?.[0]?.[0]).toMatchObject({ cost: { kind: "securityToHand" } });
      expect(payment.options?.[1]?.[0]).toMatchObject({
        cost: { kind: "trashBottomFaceDownUnderTamer", controller: "mine" },
      });
      for (const branch of payment.options ?? []) {
        const cardChoice = branch[0]!;
        expect(cardChoice.kind).toBe("Modal");
        expect(cardChoice.options).toHaveLength(2);
        expect(cardChoice.labels).toEqual(["Play a Glowing Dawn Digimon or Tamer", "Use a Glowing Dawn Option"]);
        expect(cardChoice.options?.[0]?.[0]).toMatchObject({ kind: "PlayWithoutCost", payCost: true, reduceCostBy: 3 });
        expect(cardChoice.options?.[1]?.[0]).toMatchObject({
          kind: "UseOptionWithoutCost",
          payCost: true,
          reduceCostBy: 3,
        });
      }
    }
  });

  it("uses the same bottom-face-down Tamer cost for inherited unsuspend", () => {
    const effect = BT25_041.effects?.find((entry) => entry.trigger === "EndOfAttack");
    expect(effect?.actions?.[0]).toMatchObject({
      kind: "Unsuspend",
      cost: { kind: "trashBottomFaceDownUnderTamer", controller: "mine" },
    });
  });

  it("plays a Glowing Dawn Tamer with the printed reduction", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT25-041", as: "murasamemon" }],
          hand: [{ card: "ST23-13", as: "tamer" }],
          security: [{ card: "BT1-009", as: "securityCost" }],
        },
      },
      { autoAcceptOptional: true, autoChooseOption: true, autoSelectCards: true },
    );
    await s.ready();
    s.state.memory = 3;
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("murasamemon").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some((p) => p.topCard?.cardId === "ST23-13"));
    expect(s.state.players[0]!.battleArea.some((p) => p.topCard?.cardId === "ST23-13")).toBe(true);
    expect(s.state.memory).toBe(2);
  });

  it("resolves the public When Digivolving choice with security payment and reduced play cost", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "ST23-03", as: "base" }],
          hand: [
            { card: "BT25-041", as: "murasamemon" },
            { card: "ST23-13", as: "tamer" },
          ],
          security: [{ card: "BT1-009", as: "securityCost" }],
        },
        1: { security: ["BT1-001"] },
      },
      { autoAcceptOptional: true, autoChooseOption: true, autoSelectCards: true },
    );
    s.state.memory = 6;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("murasamemon").instanceId,
        useAlternateCost: true,
        alternateRequirementIndex: 0,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some((p) => p.topCard?.cardId === "ST23-13"));
    expect(s.state.players[0]!.security).toHaveLength(0);
    expect(s.state.players[0]!.hand).toHaveLength(1);
    expect(s.state.players[0]!.hand).toContainEqual(expect.objectContaining({ cardId: "BT1-009" }));
    expect(s.state.memory).toBe(2);
  });

  it("shares the Once Per Turn gate between digivolution and attack choices", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "ST23-03", as: "base" }],
          hand: [
            { card: "BT25-041", as: "murasamemon" },
            { card: "ST23-13", as: "firstTamer" },
            { card: "ST23-13", as: "secondTamer" },
          ],
          security: [
            { card: "BT1-009", as: "firstSecurity" },
            { card: "BT1-010", as: "secondSecurity" },
          ],
        },
        1: { security: ["BT1-001"], deck: ["BT1-002", "BT1-003"] },
      },
      { autoAcceptOptional: true, autoChooseOption: true, autoSelectCards: true },
    );
    s.state.memory = 6;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("murasamemon").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some((p) => p.topCard?.cardId === "ST23-13"));
    expect(s.state.players[0]!.hand).not.toContainEqual(
      expect.objectContaining({ instanceId: s.inst("firstTamer").instanceId }),
    );
    expect(s.state.players[0]!.hand).toContainEqual(
      expect.objectContaining({ instanceId: s.inst("secondTamer").instanceId }),
    );
    await advance(s.engine).verb.unsuspend([s.perm("base").permanentId]);
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("base").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle();
    expect(s.state.players[0]!.security).toContainEqual(
      expect.objectContaining({ instanceId: s.inst("secondSecurity").instanceId }),
    );
    expect(s.state.players[0]!.hand).toContainEqual(
      expect.objectContaining({ instanceId: s.inst("secondTamer").instanceId }),
    );
  });

  it("trashes a bottom face-down Tamer card to unsuspend from the inherited effect", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT25-057", as: "murasamemon", suspended: true, under: [{ card: "BT25-041", as: "source" }] },
            { card: "ST23-13", as: "tamer", under: [{ card: "BT1-009", as: "bottomCost", faceUp: false }] },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    await advance(s.engine).fire(EffectTiming.EndOfAttack, s.perm("murasamemon"));
    expect(s.perm("murasamemon").isSuspended).toBe(false);
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toContain(s.inst("bottomCost").instanceId);
    expect(s.perm("tamer").stack).toHaveLength(0);
  });

  it("naturally resolves the inherited unsuspend at the end of an attack", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "ST23-05", as: "host", dp: 12000, under: [{ card: "BT25-041", as: "source" }] },
            { card: "ST23-13", as: "tamer", under: [{ card: "BT1-009", as: "bottomCost", faceUp: false }] },
          ],
        },
        1: { security: ["BT1-009", "BT1-010"], deck: ["BT1-001"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 5;
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle();
    await advance(s.engine).fire(EffectTiming.EndOfAttack, s.perm("host"));
    await settle(() => !s.perm("host").isSuspended && s.state.players[0]!.trash.length === 1);

    expect(s.perm("host").isSuspended).toBe(false);
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toContain(s.inst("bottomCost").instanceId);
  });

  it("does not unsuspend a non-Glowing Dawn host through the inherited effect", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT1-062", as: "host", suspended: true, under: [{ card: "BT25-041" }] },
            { card: "ST23-13", as: "tamer", under: [{ card: "BT1-009", as: "bottomCost", faceUp: false }] },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    await advance(s.engine).fire(EffectTiming.EndOfAttack, s.perm("host"));
    expect(s.perm("host").isSuspended).toBe(true);
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).not.toContain(s.inst("bottomCost").instanceId);
  });

  it("supports the alternate Glowing Dawn level-4 evolution path", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "ST23-03", as: "base" }],
        hand: [{ card: "BT25-041", as: "evolving" }],
        deck: ["BT1-009"],
      },
    });
    await s.ready();
    s.state.memory = 3;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("evolving").instanceId,
        alternateRequirementIndex: 0,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard?.instanceId === s.inst("evolving").instanceId);
    expect(s.perm("base").topCard?.cardId).toBe("BT25-041");
    expect(s.perm("base").stack.map((card) => card.cardId)).toContain("ST23-03");
    expect(s.state.memory).toBe(0);
  });
});
