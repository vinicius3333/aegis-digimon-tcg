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

  it("does not unsuspend a non-Glowing Dawn host through the inherited effect", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT25-027", as: "host", suspended: true, under: [{ card: "BT25-041" }] },
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
