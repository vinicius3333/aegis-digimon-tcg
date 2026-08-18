import { EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT8-104.js";

describe("BT8-104 Eiseiryūoujin", () => {
  it("offers one sourced confirmation before placing X Antibody and deleting the promoted Digimon", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT8-063", as: "host" }],
        hand: [
          { card: "BT8-104", as: "option" },
          { card: "BT8-060", as: "material" },
        ],
      },
      1: {
        battleArea: [{
          card: "BT8-017",
          as: "target",
          under: [{ card: "BT1-009", as: "promoted" }],
        }],
      },
    });
    s.state.memory = 10;
    const targetTopId = s.perm("target").topCard.instanceId;

    expect(s.engine.applyIntent(0, {
      type: "playCard",
      instanceId: s.inst("option").instanceId,
    })).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision?.kind === "optional");

    const optional = s.state.pendingDecision!;
    const request = s.decisions.find(({ req }) => req.decisionId === optional.decisionId)!.req;
    expect(request.sourceCardId).toBe("BT8-104");
    expect(s.decisions.filter(({ req }) => req.kind === "optional")).toHaveLength(1);
    expect(s.engine.applyIntent(0, {
      type: "respondDecision",
      decisionId: optional.decisionId,
      response: { kind: "optional", accept: true },
    })).toEqual({ ok: true });

    await settle(() =>
      s.state.players[1]!.battleArea.length === 0 &&
      s.perm("host").stack.some(({ instanceId }) =>
        instanceId === s.inst("material").instanceId
      ),
    );

    expect(s.state.players[1]!.trash.map(({ instanceId }) => instanceId)).toEqual(
      expect.arrayContaining([
        targetTopId,
        s.inst("promoted").instanceId,
      ]),
    );
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("declining preserves the material and blocks the conditional deletion", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT8-063", as: "host" }],
        hand: [
          { card: "BT8-104", as: "option" },
          { card: "BT8-060", as: "material" },
        ],
      },
      1: {
        battleArea: [{
          card: "BT8-017",
          as: "target",
          under: [{ card: "BT1-009", as: "promoted" }],
        }],
      },
    });
    s.state.memory = 10;

    expect(s.engine.applyIntent(0, {
      type: "playCard",
      instanceId: s.inst("option").instanceId,
    })).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision?.kind === "optional");
    const optional = s.state.pendingDecision!;
    expect(s.engine.applyIntent(0, {
      type: "respondDecision",
      decisionId: optional.decisionId,
      response: { kind: "optional", accept: false },
    })).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision === undefined);

    expect(s.perm("host").stack).toHaveLength(0);
    expect(s.state.players[0]!.hand.map(({ instanceId }) => instanceId)).toContain(
      s.inst("material").instanceId,
    );
    expect(s.perm("target").topCard.instanceId).toBe(s.inst("promoted").instanceId);
  });

  it("does not offer an impossible confirmation without an eligible X Antibody card", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT8-063", as: "host" }],
        hand: [{ card: "BT8-104", as: "option" }],
      },
      1: {
        battleArea: [{
          card: "BT8-017",
          as: "target",
          under: [{ card: "BT1-009", as: "promoted" }],
        }],
      },
    });
    s.state.memory = 10;

    expect(s.engine.applyIntent(0, {
      type: "playCard",
      instanceId: s.inst("option").instanceId,
    })).toEqual({ ok: true });
    await settle(() =>
      s.state.pendingDecision !== undefined ||
      s.state.players[0]!.trash.some(({ instanceId }) =>
        instanceId === s.inst("option").instanceId
      ),
    );

    expect(s.state.pendingDecision).toBeUndefined();
    expect(s.perm("target").topCard.instanceId).toBe(s.inst("promoted").instanceId);
    expect(s.state.players[1]!.battleArea).toHaveLength(1);
  });

  it("resolves the mandatory De-Digivolve and delete clauses from Security", async () => {
    const s = setupEngine({
      0: {
        security: [{ card: "BT8-104", as: "option", faceUp: true }],
      },
      1: {
        battleArea: [{
          card: "BT8-017",
          as: "target",
          under: [{ card: "BT1-009", as: "promoted" }],
        }],
      },
    }, { autoSelectCards: true });

    await advance(s.engine).fireForInstance(EffectTiming.SecuritySkill, s.inst("option"));

    expect(s.state.players[1]!.battleArea).toHaveLength(0);
    expect(s.state.pendingDecision).toBeUndefined();
  });
});
