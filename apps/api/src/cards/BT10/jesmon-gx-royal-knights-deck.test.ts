import { Phase } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "../BT6/BT6-082.js";
import "../BT6/BT6-084.js";
import "../ST12/ST12-10.js";
import "./BT10-016.js";
import "./BT10-112.js";

describe("ST12 Jesmon and Jesmon GX Royal Knights deck", () => {
  it("borrows Jesmon X, plays both Sistermons, and completes a three-check Blitz attack", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [{
            card: "ST12-10",
            as: "jesmon",
            under: ["ST12-08"],
          }],
          hand: [
            { card: "BT10-112", as: "gx" },
            { card: "BT6-084", as: "ciel" },
          ],
          trash: [
            { card: "BT10-016", as: "jesmonX" },
            { card: "BT6-082", as: "blanc" },
          ],
          deck: ["BT1-001", "BT1-002"],
        },
        1: {
          security: ["BT1-003", "BT1-004", "BT1-005", "BT1-006"],
          deck: ["BT1-007"],
        },
      },
      {
        autoAcceptOptional: true,
        autoOrderTriggers: true,
        autoSelectCards: true,
        preferInstanceIds: preferred,
      },
    );
    preferred.push(
      s.inst("jesmonX").instanceId,
      s.inst("ciel").instanceId,
      s.inst("blanc").instanceId,
    );
    s.state.memory = 4;

    const turn = s.engine.runOneTurn();
    const mainPhase = (s.engine as unknown as { mainPhase: { isOpen: boolean } }).mainPhase;
    await settle(() => mainPhase.isOpen);
    expect(s.engine.applyIntent(0, {
      type: "digivolve",
      permanentId: s.perm("jesmon").permanentId,
      instanceId: s.inst("gx").instanceId,
    })).toEqual({ ok: true });
    await settle(() =>
      s.engine.hasAcceptedBlitzAttack(s.perm("jesmon").permanentId) &&
      s.state.players[0]!.battleArea.some((permanent) =>
        permanent.topCard.instanceId === s.inst("ciel").instanceId,
      ) &&
      s.state.pendingDecision === undefined,
    );

    expect(s.decisions.filter(({ req }) => req.kind === "chooseTargets")).toEqual([]);

    expect(s.perm("jesmon").stack.some((card) => card.instanceId === s.inst("jesmonX").instanceId)).toBe(true);
    expect(observe(s.engine).hasKeyword(s.perm("jesmon"), "Blocker")).toBe(true);
    expect(observe(s.engine).hasPierce(s.perm("jesmon"))).toBe(true);
    expect(observe(s.engine).keywordAmount(s.perm("jesmon"), "SecurityAttack")).toBe(2);

    expect(s.engine.applyIntent(0, {
      type: "attack",
      attackerPermanentId: s.perm("jesmon").permanentId,
      target: { kind: "player" },
    })).toEqual({ ok: true });
    await settle(() =>
      s.state.players[1]!.security.length === 1 &&
      s.state.players[0]!.battleArea.some((permanent) =>
        permanent.topCard.instanceId === s.inst("blanc").instanceId,
      ) &&
      !(s.engine as unknown as { combat: { isAttacking: boolean } }).combat.isAttacking,
    );

    expect(s.state.memory).toBe(0);
    expect(s.perm("jesmon").currentDP).toBeGreaterThanOrEqual(19_000);
    expect(s.state.phase).toBe(Phase.Main);
    expect(mainPhase.isOpen).toBe(true);

    expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
    await turn;
  });
});
