import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "../ST2/ST2-16.js";
import "../BT1/BT1-055.js";
import { compiled } from "./BT22-059.js";

describe("BT22-059 Infermon", () => {
  it("deletes an opposing play-cost-5-or-lower Digimon and grants conditional protection", () => {
    for (const trigger of ["OnPlay", "WhenDigivolving"]) {
      const effect = compiled.effects.find((entry) => entry.trigger === trigger);
      expect(effect?.actions[0]).toMatchObject({
        kind: "Delete",
        target: { filter: { controller: "opponent", kind: ["Digimon"], playCostLte: 5 }, count: 1 },
      });
      expect(effect?.actions[1]).toMatchObject({
        kind: "GrantStatic",
        grant: "immuneToOpponentDPReductionAndReturn",
        duration: "untilOpponentTurnEnd",
        target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
        condition: {
          kind: "youHave",
          filter: { nameOrTrait: [{ tokens: ["Arata Sanada", "Eater Adam"], match: "name" }] },
        },
      });
    }
  });

  it("plays one Diaboromon token when an own Unidentified Digimon is deleted", () => {
    const inherited = compiled.effects.find((entry) => entry.isInherited);
    expect(inherited).toMatchObject({
      frequency: "OncePerTurn",
      actions: [
        {
          kind: "SubTrigger",
          event: "onDeletionOf",
          sourceFilter: {
            controller: "mine",
            kind: ["Digimon"],
            nameOrTrait: [{ tokens: ["Unidentified"], match: "trait" }],
          },
          actions: [{ kind: "PlayToken", tokens: ["Diaboromon"], count: 1, payCost: false, optional: true }],
        },
      ],
    });
  });

  it("deletes a cost-5 Digimon through the public play flow", async () => {
    const s = setupEngine(
      { 0: { hand: [{ card: "BT22-059", as: "infermon" }] }, 1: { battleArea: [{ card: "BT22-071", as: "target" }] } },
      { autoSelectCards: true },
    );
    s.state.memory = 7;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("infermon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[1]!.battleArea.length === 0);

    expect(s.state.players[1]!.trash.some((card) => card.cardId === "BT22-071")).toBe(true);
  });

  it("rejects cost 6 and protects Infermon from an opponent DP reduction when Arata is present", async () => {
    const prefer: string[] = [];
    const s = setupEngine(
      {
        0: {
          hand: [
            { card: "BT22-059", as: "infermon" },
            { card: "BT1-009", as: "spare" },
          ],
          battleArea: [
            { card: "BT22-091", as: "arata" },
            { card: "BT22-070", as: "dpControl", dp: 6000 },
          ],
          deck: ["BT1-009", "BT1-010", "BT1-011"],
        },
        1: {
          hand: [
            { card: "BT1-055", as: "firstReduction" },
            { card: "BT1-055", as: "secondReduction" },
          ],
          battleArea: [{ card: "BT22-070", as: "cost6" }],
          deck: ["BT1-012", "BT1-013", "BT1-014"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: prefer },
    );
    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    s.state.memory = 10;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("infermon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.perm("infermon") !== undefined);
    expect(s.perm("cost6")).toBeDefined();

    expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
    await advance(s.engine).waitForMainPhase(1);
    s.state.memory = 10;
    prefer.push(s.perm("infermon").topCard!.instanceId);
    expect(s.engine.applyIntent(1, { type: "playCard", instanceId: s.inst("firstReduction").instanceId })).toEqual({
      ok: true,
    });
    await settle();
    expect(s.perm("infermon").currentDP).toBe(7000);

    prefer.splice(0, prefer.length, s.perm("dpControl").topCard!.instanceId);
    expect(s.engine.applyIntent(1, { type: "playCard", instanceId: s.inst("secondReduction").instanceId })).toEqual({
      ok: true,
    });
    await settle();
    expect(s.perm("dpControl").currentDP).toBe(3000);
    expect(s.perm("infermon").currentDP).toBe(7000);
    expect(s.perm("cost6").currentDP).toBe(6000);
    expect(s.engine.applyIntent(1, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  it("survives an opponent's public Cocytus Breath while an unprotected peer returns to hand", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "BT22-059", as: "infermon" }],
          battleArea: [
            { card: "BT22-091", as: "arata" },
            { card: "BT22-070", as: "peer" },
          ],
          deck: ["BT1-009", "BT1-010", "BT1-011"],
        },
        1: {
          battleArea: [{ card: "BT14-029", as: "blueAnchor" }],
          hand: [
            { card: "ST2-16", as: "firstBounce" },
            { card: "ST2-16", as: "secondBounce" },
          ],
          deck: ["BT1-012", "BT1-013", "BT1-014"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferred },
    );
    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    s.state.memory = 10;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("infermon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.perm("infermon") !== undefined);
    const infermonId = s.perm("infermon").topCard!.instanceId;
    const peerId = s.perm("peer").topCard!.instanceId;
    expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
    await advance(s.engine).waitForMainPhase(1);
    s.state.memory = 10;
    preferred.push(infermonId);
    const firstBounceId = s.inst("firstBounce").instanceId;
    expect(s.engine.applyIntent(1, { type: "playCard", instanceId: s.inst("firstBounce").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[1]!.trash.some((card) => card.instanceId === firstBounceId));
    expect(s.state.memory).toBe(3);
    expect(s.state.players[0]!.battleArea.some((p) => p.topCard?.instanceId === infermonId)).toBe(true);
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === infermonId)).toBe(false);
    s.state.memory = 10;
    preferred.splice(0, preferred.length, peerId);
    const secondBounceId = s.inst("secondBounce").instanceId;
    expect(s.engine.applyIntent(1, { type: "playCard", instanceId: s.inst("secondBounce").instanceId })).toEqual({
      ok: true,
    });
    await settle(
      () =>
        s.state.players[1]!.trash.some((card) => card.instanceId === secondBounceId) &&
        s.state.players[0]!.hand.some((card) => card.instanceId === peerId),
    );
    expect(s.state.memory).toBe(3);
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === peerId)).toBe(true);
    expect(s.state.players[0]!.battleArea.some((p) => p.topCard?.instanceId === infermonId)).toBe(true);
    expect(s.engine.applyIntent(1, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  it("plays a Diaboromon token when an own Unidentified Digimon is deleted", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT22-064", as: "host", under: ["BT22-059"] },
            { card: "BT22-057", as: "deleted" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    await (
      s.engine as unknown as { primitives: { deletePermanent(ids: string[], cause: "byEffect"): Promise<unknown> } }
    ).primitives.deletePermanent([s.perm("deleted").permanentId], "byEffect");
    await settle(() =>
      s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.cardId.startsWith("TOKEN-")),
    );

    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.cardId.startsWith("TOKEN-"))).toBe(
      true,
    );
  });
});
