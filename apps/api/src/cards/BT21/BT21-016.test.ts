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
    expect(compiled.digiXrosRequirement).toEqual([
      { materials: [{ traits: ["Xros Heart"] }], count: 1, maxMaterials: 1 },
    ]);
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

  it("publicly digivolves from a level-3 Xros Heart base for the alternate cost, and rejects a nonmatching base", async () => {
    const legal = setupEngine(
      {
        0: { battleArea: [{ card: "BT21-011", as: "base" }], hand: [{ card: "BT21-016", as: "king" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    legal.state.memory = 2;
    await legal.ready();
    expect(
      legal.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: legal.perm("base").permanentId,
        instanceId: legal.inst("king").instanceId,
        alternateRequirementIndex: 0,
      }),
    ).toEqual({ ok: true });
    await settle(() => legal.perm("base").topCard.cardId === "BT21-016");
    expect(legal.perm("base").topCard.cardId).toBe("BT21-016");
    // Shoutmon reduces this Xros Heart/Hero evolution by a further 1.
    expect(legal.state.memory).toBe(1);

    const illegal = setupEngine({
      0: { battleArea: [{ card: "BT1-009", as: "base" }], hand: [{ card: "BT21-016", as: "king" }] },
    });
    illegal.state.memory = 2;
    await illegal.ready();
    expect(
      illegal.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: illegal.perm("base").permanentId,
        instanceId: illegal.inst("king").instanceId,
        alternateRequirementIndex: 0,
      }),
    ).toMatchObject({ ok: false });
    expect(illegal.state.memory).toBe(2);
  });

  it("rejects a second DigiXros material and preserves hand, board, and memory", async () => {
    const s = setupEngine({
      0: {
        hand: [
          { card: "BT21-016", as: "king" },
          { card: "BT21-011", as: "first" },
          { card: "BT21-021", as: "second" },
        ],
      },
    });
    s.state.memory = 6;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "playCard",
        instanceId: s.inst("king").instanceId,
        digiXros: { materialInstanceIds: [s.inst("first").instanceId, s.inst("second").instanceId] },
      }),
    ).toMatchObject({ ok: false });
    expect(s.state.memory).toBe(6);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toEqual(
      expect.arrayContaining([s.inst("king").instanceId, s.inst("first").instanceId, s.inst("second").instanceId]),
    );
    expect(s.state.players[0]!.battleArea).toHaveLength(0);
  });

  it("performs a security check after deleting a suspended Digimon by battle with Piercing", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT21-011", as: "base" }], hand: [{ card: "BT21-016", as: "king" }] },
      1: {
        battleArea: [{ card: "BT1-009", as: "target", suspended: true }],
        security: ["BT1-001"],
      },
    });
    s.state.memory = 2;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("king").instanceId,
        alternateRequirementIndex: 0,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard.instanceId === s.inst("king").instanceId);
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("base").permanentId,
        target: { kind: "permanent", permanentId: s.perm("target").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.security.length === 0);
    expect(s.state.players[1]!.battleArea).toHaveLength(0);
  });

  it("public Raid redirects to the highest-DP unsuspended target, then Piercing checks security", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT21-011", as: "base" }], hand: [{ card: "BT21-016", as: "king" }] },
        1: {
          battleArea: [
            { card: "BT1-010", as: "low" },
            { card: "BT1-009", as: "high" },
            { card: "BT10-055", as: "suspendedHigher", suspended: true },
          ],
          security: ["BT1-001"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 2;
    const highId = s.perm("high").permanentId;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("king").instanceId,
        alternateRequirementIndex: 0,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard.instanceId === s.inst("king").instanceId);
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("base").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => !s.state.players[1]!.battleArea.some((p) => p.permanentId === highId));
    expect(s.state.players[1]!.battleArea.some((p) => p.permanentId === highId)).toBe(false);
    expect(s.state.players[1]!.battleArea.some((p) => p.permanentId === s.perm("low").permanentId)).toBe(true);
    expect(s.state.players[1]!.battleArea.some((p) => p.topCard.cardId === "BT10-055" && p.isSuspended)).toBe(true);
    expect(s.events.some((event) => event.kind === "securityChecked")).toBe(true);
    expect(s.state.players[1]!.security).toHaveLength(0);
  });

  it("on deletion places an eligible card and then itself under a Tamer", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT21-016", as: "king", under: ["BT21-011"] },
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

  it("naturally resolves optional placement and Save after battle deletion", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT21-016", as: "king", suspended: true, under: ["BT21-011"] },
            { card: "BT21-083", as: "tamer" },
          ],
          hand: [{ card: "BT21-011", as: "eligible" }],
        },
        1: { battleArea: [{ card: "BT21-062", as: "attacker" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.turnSeat = 1;
    await s.ready();
    const kingId = s.perm("king").permanentId;

    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "permanent", permanentId: kingId },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("tamer").stack.some((card) => card.cardId === "BT21-016"));

    expect(s.perm("tamer").stack.map((card) => card.instanceId)).toEqual(
      expect.arrayContaining([s.inst("eligible").instanceId, s.inst("king").instanceId]),
    );
    expect(s.state.players[0]!.hand).toHaveLength(0);
    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.permanentId === kingId)).toBe(false);
  });

  it("declining the optional first placement still offers the Save continuation", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT21-016", as: "king", under: ["BT21-011"] },
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
