import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./index.js";
import { compiled } from "./BT20-006.js";

describe("BT20-006 DemiMeramon", () => {
  it("proves optional On Deletion recovery targets one of your Ghost Digimon in trash", () => {
    const action = compiled.effects.find((entry) => entry.isInherited)?.actions[0];
    expect(action).toMatchObject({
      kind: "Return",
      optional: true,
      to: "hand",
      target: {
        count: 1,
        filter: {
          zone: "trash",
          controller: "mine",
          kind: ["Digimon"],
          nameOrTrait: [{ tokens: ["Ghost"], match: "trait" }],
        },
      },
    });
  });

  it("observably returns exactly one Ghost Digimon from its controller's trash after deletion", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT20-063", dp: 2000, as: "attacker", under: ["BT20-006"] }],
          hand: [{ card: "BT20-068", as: "bakemon" }],
          trash: [
            { card: "BT20-063", as: "ghost" },
            { card: "BT20-010", as: "nonGhost" },
          ],
        },
        1: {
          battleArea: [{ card: "BT20-011", dp: 10000, suspended: true, as: "defender" }],
          trash: [{ card: "BT20-063", as: "opponentGhost" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 5;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("attacker").permanentId,
        instanceId: s.inst("bakemon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("attacker").topCard.cardId === "BT20-068");
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "permanent", permanentId: s.perm("defender").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("ghost").instanceId));

    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toContain(s.inst("ghost").instanceId);
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toContain(s.inst("nonGhost").instanceId);
    expect(s.state.players[1]!.hand).toHaveLength(0);
    expect(s.state.players[1]!.trash.map((card) => card.instanceId)).toContain(s.inst("opponentGhost").instanceId);
  });
  it("allows the inherited recovery to be declined", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT20-063", as: "attacker", under: ["BT20-006"] }],
          hand: [{ card: "BT20-068", as: "bakemon" }],
          trash: [{ card: "BT20-063", as: "ghost" }],
        },
        1: { battleArea: [{ card: "BT20-011", dp: 10000, suspended: true, as: "defender" }] },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    s.state.memory = 5;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("attacker").permanentId,
        instanceId: s.inst("bakemon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("attacker").topCard.cardId === "BT20-068");
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "permanent", permanentId: s.perm("defender").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => false, 20);
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toContain(s.inst("ghost").instanceId);
    expect(s.state.players[0]!.hand).toHaveLength(0);
  });

  it("Q4285: egg recovery of deleted Bakemon cancels its pending inherited memory", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            {
              card: "BT20-068",
              dp: 4000,
              as: "attacker",
              under: [
                { card: "BT20-006", as: "egg" },
                { card: "BT20-063", as: "source" },
              ],
            },
          ],
        },
        1: { battleArea: [{ card: "BT20-011", dp: 10000, suspended: true, as: "defender" }] },
      },
      { autoOrderTriggers: false, autoAcceptOptional: true, autoSelectCards: false },
    );
    const eggInstance = s.perm("attacker").stack.find((card) => card.cardId === "BT20-006")!.instanceId;
    const bakemonInstance = s.perm("attacker").topCard.instanceId;
    s.state.memory = 0;
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "permanent", permanentId: s.perm("defender").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision?.kind === "orderTriggers");
    const order = [...s.decisions].reverse().find(({ req }) => req.kind === "orderTriggers")!.req;
    const eggKey = order.options!.triggerKeys!.find((key) => key.includes(eggInstance))!;
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: order.decisionId,
        response: { kind: "orderTriggers", order: [eggKey] },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision?.kind === "selectCards");
    const selection = [...s.decisions].reverse().find(({ req }) => req.kind === "selectCards")!.req;
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: selection.decisionId,
        response: { kind: "selectCards", instanceIds: [bakemonInstance] },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision === undefined);
    expect(s.state.memory).toBe(0);
    expect(s.state.pendingDecision).toBeUndefined();
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === bakemonInstance)).toBe(true);
    expect(s.state.players[0]!.trash.some((card) => card.instanceId === eggInstance)).toBe(true);
    expect(s.state.players[0]!.trash.some((card) => card.cardId === "BT20-063")).toBe(true);
  });

  it("Q4286: egg recovery of Ghostmon preserves the deleted host's inherited memory", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            {
              card: "BT20-068",
              dp: 4000,
              as: "attacker",
              under: [
                { card: "BT20-006", as: "egg" },
                { card: "BT20-063", as: "source" },
              ],
            },
          ],
        },
        1: { battleArea: [{ card: "BT20-011", dp: 10000, suspended: true, as: "defender" }] },
      },
      { autoOrderTriggers: false, autoAcceptOptional: true, autoSelectCards: false },
    );
    const eggInstance = s.perm("attacker").stack.find((card) => card.cardId === "BT20-006")!.instanceId;
    const ghostInstance = s.perm("attacker").stack.find((card) => card.cardId === "BT20-063")!.instanceId;
    s.state.memory = 0;
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "permanent", permanentId: s.perm("defender").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision?.kind === "orderTriggers");
    const order = [...s.decisions].reverse().find(({ req }) => req.kind === "orderTriggers")!.req;
    const eggKey = order.options!.triggerKeys!.find((key) => key.includes(eggInstance))!;
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: order.decisionId,
        response: { kind: "orderTriggers", order: [eggKey] },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision?.kind === "selectCards");
    const selection = [...s.decisions].reverse().find(({ req }) => req.kind === "selectCards")!.req;
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: selection.decisionId,
        response: { kind: "selectCards", instanceIds: [ghostInstance] },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision === undefined);
    expect(s.state.memory).toBe(1);
    expect(s.state.pendingDecision).toBeUndefined();
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === ghostInstance)).toBe(true);
    expect(s.state.players[0]!.trash.some((card) => card.cardId === "BT20-068")).toBe(true);
    expect(s.state.players[0]!.trash.some((card) => card.instanceId === eggInstance)).toBe(true);
  });
});
