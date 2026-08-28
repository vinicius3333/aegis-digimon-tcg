import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { compiled } from "./BT18-013.js";

describe("BT18-013 Deltamon", () => {
  it("trashes a hand card as cost and returns a Composite/Wicked God card from trash", async () => {
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
    expect(compiled.effects[1]).toMatchObject({
      trigger: "OnPlay",
      actions: [
        {
          kind: "Return",
          to: "hand",
          cost: { kind: "trash", target: { filter: { zone: "hand", controller: "mine" }, count: 1 } },
          target: { filter: { zone: "trash", controller: "mine" } },
        },
      ],
    });
    const s = setupEngine(
      {
        0: {
          hand: [
            { card: "BT18-013", as: "deltamon" },
            { card: "BT1-001", as: "cost" },
          ],
          trash: ["BT18-015"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("deltamon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.hand.some((card) => card.cardId === "BT18-015"));
    expect(s.state.players[0]!.hand.some((card) => card.cardId === "BT18-015")).toBe(true);
    expect(s.state.players[0]!.trash.some((card) => card.cardId === "BT1-001")).toBe(true);
  });

  it("selects the Wicked God branch of the OR trait filter and rejects a nonmatching card", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          hand: [
            { card: "BT18-013", as: "deltamon" },
            { card: "BT1-001", as: "cost" },
          ],
          trash: [
            { card: "BT1-030", as: "nonmatching" },
            { card: "BT19-075", as: "wicked" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferred },
    );
    preferred.push(s.inst("wicked").instanceId);
    s.state.memory = 10;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("deltamon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("wicked").instanceId));

    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toContain(s.inst("wicked").instanceId);
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toContain(s.inst("nonmatching").instanceId);
  });

  it("may decline the optional processing condition without moving either card", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [
            { card: "BT18-013", as: "deltamon" },
            { card: "BT1-001", as: "cost" },
          ],
          trash: [{ card: "BT18-015", as: "target" }],
        },
      },
      { autoAcceptOptional: false, autoSelectCards: true },
    );
    s.state.memory = 10;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("deltamon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.pendingDecision?.kind === "optional");
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: s.state.pendingDecision!.decisionId,
        response: { kind: "optional", accept: false },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision === undefined);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toContain(s.inst("cost").instanceId);
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toContain(s.inst("target").instanceId);
  });

  it.each([
    ["Gazimon", "BT18-007"],
    ["Gizamon", "BT14-008"],
  ])("digivolves from %s for 2 and resolves the paid return", async (_name, baseCard) => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: baseCard, as: "base" }],
          hand: [
            { card: "BT18-013", as: "deltamon" },
            { card: "BT1-001", as: "cost" },
          ],
          trash: [{ card: "BT18-015", as: "target" }],
          deck: ["BT1-002"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 5;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("deltamon").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("target").instanceId));
    expect(s.state.memory).toBe(3);
    expect(s.perm("base").stack.at(-1)?.cardId).toBe(baseCard);
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toContain(s.inst("cost").instanceId);
  });

  it("grants Raid to itself and executable inherited Retaliation to its host", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "BT18-013", as: "deltamon" },
          { card: "BT1-030", dp: 3000, as: "host", under: ["BT18-013"] },
        ],
      },
      1: { battleArea: [{ card: "BT1-030", dp: 4000, suspended: true, as: "defender" }] },
    });
    const defenderId = s.perm("defender").permanentId;
    const hostId = s.perm("host").permanentId;
    await s.ready();
    expect(observe(s.engine).hasKeyword(s.perm("deltamon"), "Raid")).toBe(true);
    expect(observe(s.engine).hasKeyword(s.perm("host"), "Retaliation")).toBe(true);
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: hostId,
        target: { kind: "permanent", permanentId: defenderId },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.every((permanent) => permanent.permanentId !== hostId));
    expect(s.state.players[1]!.battleArea.map(({ permanentId }) => permanentId)).not.toContain(defenderId);
  });
});
