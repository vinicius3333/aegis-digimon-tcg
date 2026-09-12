import { beforeEach, describe, expect, it } from "vitest";
import { cite } from "./_kb.js";
import { observe } from "../testkit/observe.js";
import { assertNoLoudGap, setupEngine, settle } from "../testkit/harness.js";
import "../../cards/index.js";

const NEUTRAL = "BT1-009";

const consumers = [
  { card: "BT26-032", base: "BT25-059", cost: 2, copied: [], security: 1, deck: 5, trash: 0 },
  { card: "BT26-080", base: "BT25-077", cost: 2, copied: [], security: 1, deck: 5, trash: 0 },
  { card: "BT26-060", base: "BT26-016", cost: 5, copied: ["Piercing", "Engage"], security: 1, deck: 5, trash: 0 },
  { card: "BT26-103", base: "BT24-101", cost: 5, copied: [], security: 3, deck: 1, trash: 2 },
];

describe("Succession committed consumer evolution", () => {
  beforeEach(() => {
    cite(
      "comprehensive-0324",
      "16-47: persistent gain from the topmost specified digivolution card",
      "d09f994eb5ef5e46d70b28d7d019215d5dc5856d3ec1ffee10d6db6dfa3df717",
    );
    cite(
      "comprehensive-0172",
      "15-8-2: persistent effects follow their live conditions",
      "d4b49613685801d2adcd744aeb58471c0a393a33f9f697539d305a9d21e896c6",
    );
  });

  it.each(consumers)("$card publishes Succession after legal evolution over $base", async (consumer) => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: consumer.base, as: "base" }],
          hand: [{ card: consumer.card, as: "evolution" }],
          deck: [NEUTRAL, NEUTRAL, NEUTRAL, "BT1-028", "BT1-028", "BT1-028"],
          security: [{ card: NEUTRAL, as: "security" }],
        },
        1: { deck: [NEUTRAL, NEUTRAL], security: [NEUTRAL] },
      },
      { autoDeclineOptional: true, autoSelectCards: true, autoChooseOption: true },
    );
    s.state.memory = 10;
    await s.ready();
    const baseId = s.inst("base").instanceId;
    const evolutionId = s.inst("evolution").instanceId;
    const permanentId = s.perm("base").permanentId;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId,
        instanceId: evolutionId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard.instanceId === evolutionId);
    await settle();
    const host = s.perm("base");
    expect(host.permanentId).toBe(permanentId);
    expect(host.controllerSeat).toBe(0);
    expect(host.topCard.instanceId).toBe(evolutionId);
    expect(host.stack.map((card) => card.instanceId)).toEqual([baseId]);
    expect(host.keywords).toContain("Succession");
    expect(host.keywords).not.toContain("UseReq");
    for (const keyword of consumer.copied) expect(host.keywords).toContain(keyword);
    expect(host.currentDP).toBe(consumer.card === "BT26-032" || consumer.card === "BT26-080" ? 13000 : 16000);
    expect(host.isSuspended).toBe(false);
    expect(s.state.memory).toBe(10 - consumer.cost);
    expect(s.state.players[0]!.hand).toHaveLength(1);
    expect(s.state.players[0]!.deck).toHaveLength(consumer.deck);
    expect(s.state.players[0]!.security).toHaveLength(consumer.security);
    expect(s.state.players[0]!.trash).toHaveLength(consumer.trash);
    expect(s.state.players[1]!.battleArea).toHaveLength(0);
    expect(s.state.players[1]!.security).toHaveLength(consumer.card === "BT26-103" ? 0 : 1);
    expect(s.state.pendingDecision).toBeUndefined();
    assertNoLoudGap(s);
  });

  it.each([true, false])("public Chronomon attack resolves the gained effect, acceptance %s", async (accept) => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT26-060", as: "host", under: [{ card: "BT26-016", as: "source" }] }],
          deck: [NEUTRAL, NEUTRAL],
          security: [NEUTRAL],
        },
        1: {
          battleArea: [
            { card: NEUTRAL, as: "effectTarget" },
            { card: "BT6-063", as: "battleTarget", suspended: true },
          ],
          deck: [NEUTRAL, NEUTRAL],
          security: [
            { card: "BT1-054", as: "firstSecurity" },
            { card: "BT1-054", as: "secondSecurity" },
          ],
        },
      },
      {
        autoAcceptOptional: accept,
        autoDeclineOptional: !accept,
        autoSelectCards: true,
        autoChooseOption: true,
        preferInstanceIds: preferred,
      },
    );
    s.state.memory = 10;
    await s.ready();
    const effectId = s.inst("effectTarget").instanceId;
    const battleId = s.inst("battleTarget").instanceId;
    const securityIds = [s.inst("firstSecurity").instanceId, s.inst("secondSecurity").instanceId];
    const hostId = s.inst("host").instanceId;
    const sourceId = s.inst("source").instanceId;
    preferred.push(effectId);
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "permanent", permanentId: s.perm("battleTarget").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => !observe(s.engine).isAttacking());
    await settle();
    expect(s.state.players[0]!.battleArea.map((permanent) => permanent.topCard.instanceId)).toEqual([hostId]);
    expect(s.perm("host").stack.map((card) => card.instanceId)).toEqual([sourceId]);
    expect(s.perm("host").currentDP).toBe(16000);
    expect(s.perm("host").isSuspended).toBe(true);
    expect(s.perm("host").controllerSeat).toBe(0);
    expect(s.state.players[1]!.battleArea.map((permanent) => permanent.topCard.instanceId)).toEqual(
      accept ? [] : [effectId],
    );
    expect([...s.state.players[1]!.trash].map((card) => card.instanceId).sort()).toEqual(
      (accept ? [effectId, battleId, ...securityIds] : [battleId, ...securityIds]).sort(),
    );
    expect(s.state.players[1]!.security).toHaveLength(0);
    expect(observe(s.engine).isAttacking()).toBe(false);
    expect(s.state.players[0]!.trash).toHaveLength(0);
    expect(s.state.players[0]!.hand).toHaveLength(0);
    expect(s.state.players[0]!.deck).toHaveLength(2);
    expect(s.state.players[0]!.security).toHaveLength(1);
    expect(s.state.memory).toBe(10);
    expect(s.state.pendingDecision).toBeUndefined();
    assertNoLoudGap(s);
  });
});
