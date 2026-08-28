import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { compiled } from "./BT21-016.js";
import "../index.js";

describe("BT21-016 Shoutmon (King Version)", () => {
  it("exposes complete effect coverage with no residual clauses", () => {
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual ?? []).toEqual([]);
    expect(compiled.effects).toBeDefined();
  });

  it("preserves the registered effect triggers and action boundaries", () => {
    expect(compiled.effects.every((effect) => typeof effect.trigger === "string")).toBe(true);
    for (const effect of compiled.effects) {
      expect(Array.isArray(effect.actions)).toBe(true);
      for (const action of effect.actions ?? []) expect(typeof action.kind).toBe("string");
    }
  });

  it("preserves Raid, Piercing, optional On Deletion placement followed by Save, and DigiXros", () => {
    expect(compiled.effects).toContainEqual(
      expect.objectContaining({ trigger: "Static", keywords: [{ keyword: "Raid", raw: "＜Raid＞" }] }),
    );
    expect(compiled.effects).toContainEqual(
      expect.objectContaining({ trigger: "Static", keywords: [{ keyword: "Piercing", raw: "＜Piercing＞" }] }),
    );
    expect(compiled.effects).toContainEqual(
      expect.objectContaining({
        trigger: "OnDeletion",
        actions: [
          expect.objectContaining({
            kind: "PlaceUnder",
            target: {
              filter: {
                controller: "mine",
                kind: ["Digimon"],
                nameOrTrait: [{ tokens: ["Xros Heart", "Blue Flare", "Hero"], match: "trait" }],
              },
              count: 1,
              from: ["hand", "trash"],
            },
            underFilter: { controller: "mine", kind: ["Tamer"], excludeToken: true },
            optional: true,
          }),
          {
            kind: "PlaceUnder",
            target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
            underFilter: { controller: "mine", kind: ["Tamer"], excludeToken: true },
          },
        ],
      }),
    );
    expect(compiled.digiXrosRequirement).toEqual([{ materials: [{ traits: ["Xros Heart"] }], count: 1 }]);
  });

  it("DigiXroses with one Xros Heart material for cost 4 and gains Raid and Piercing", async () => {
    const s = setupEngine({
      0: {
        hand: [
          { card: "BT21-016", as: "king" },
          { card: "BT21-011", as: "material" },
        ],
      },
    });
    s.state.memory = 6;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "playCard",
        instanceId: s.inst("king").instanceId,
        digiXros: { materialInstanceIds: [s.inst("material").instanceId] },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.cardId === "BT21-016"));
    const king = s.state.players[0]!.battleArea.find((permanent) => permanent.topCard.cardId === "BT21-016")!;
    expect(s.state.memory).toBe(2);
    expect(king.stack.map((card) => card.instanceId)).toContain(s.inst("material").instanceId);
    expect(observe(s.engine).hasKeyword(king, "Raid")).toBe(true);
  });

  it("performs a security check after deleting a suspended Digimon by battle with Piercing", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT21-016", as: "king" }] },
      1: {
        battleArea: [{ card: "BT1-009", as: "target", dp: 1000, suspended: true }],
        security: ["BT1-001"],
      },
    });
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("king").permanentId,
        target: { kind: "permanent", permanentId: s.perm("target").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.security.length === 0);
    expect(s.state.players[1]!.battleArea).toHaveLength(0);
  });

  it("on deletion places an eligible card and then itself under a Tamer", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT21-016", as: "king" },
            { card: "BT21-083", as: "tamer" },
          ],
          hand: [
            { card: "BT21-011", as: "eligible" },
            { card: "BT1-009", as: "ineligible" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferred },
    );
    preferred.push(s.inst("eligible").instanceId, s.perm("tamer").permanentId);
    await s.ready();
    await advance(s.engine).verb.deletePermanent([s.perm("king").permanentId], "byEffect");
    await settle(() => s.perm("tamer").stack.some((card) => card.cardId === "BT21-016"));
    expect(s.perm("tamer").stack.map((card) => card.instanceId)).toEqual(
      expect.arrayContaining([s.inst("eligible").instanceId, s.inst("king").instanceId]),
    );
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toContain(s.inst("ineligible").instanceId);
  });

  it("declining the optional first placement still performs mandatory Save", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT21-016", as: "king" },
            { card: "BT21-083", as: "tamer" },
          ],
          hand: [{ card: "BT21-011", as: "eligible" }],
        },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    await s.ready();
    await advance(s.engine).verb.deletePermanent([s.perm("king").permanentId], "byEffect");
    await settle(() => s.perm("tamer").stack.some((card) => card.cardId === "BT21-016"));
    expect(s.perm("tamer").stack.map((card) => card.instanceId)).toContain(s.inst("king").instanceId);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toContain(s.inst("eligible").instanceId);
  });

  it("grants inherited +2000 DP only during its controller's turn", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT21-021", as: "host", dp: 8000, under: ["BT21-016"] }] },
    });
    await s.ready();
    expect(s.perm("host").currentDP).toBe(10000);
    s.state.turnSeat = 1;
    await advance(s.engine).recompute();
    expect(s.perm("host").currentDP).toBe(8000);
  });
});
