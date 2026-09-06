import { EffectTiming, getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./BT24-008.js";
import "../index.js";

describe("BT24-008 Elizamon", () => {
  it("matches the catalog identity", () => {
    expect(getCardDefinition("BT24-008")).toMatchObject({
      cardId: "BT24-008",
      nameEn: "Elizamon",
      colors: ["Red"],
      kinds: ["Digimon"],
      level: 3,
      types: ["Reptile", "LIBERATOR"],
    });
  });

  it("requires trashing a qualifying hand card before drawing two", () => {
    const action = compiled.effects.find((effect) => effect.trigger === "OnPlay")?.actions?.[0] as any;
    expect(action).toMatchObject({
      kind: "Draw",
      amount: 2,
      cost: { kind: "trash" },
      optional: true,
      abortOnDecline: true,
    });
    expect(action.cost.target.filter.nameOrTrait).toEqual([
      { tokens: ["Reptile"], match: "trait" },
      { tokens: ["Dragonkin"], match: "trait" },
      { tokens: ["LIBERATOR"], match: "trait" },
    ]);
  });

  it("gains memory only when the opponent's security stack is removed", () => {
    const inherited = compiled.effects.find((effect) => effect.isInherited) as any;
    expect(inherited.frequency).toBe("OncePerTurn");
    expect(inherited.actions[0]).toMatchObject({
      kind: "SubTrigger",
      event: "whenSecurityRemoved",
      sourceFilter: { controller: "opponent" },
      fireCondition: { kind: "triggerRemovedSecuritySeat", seat: "opponent" },
    });
    expect(inherited.actions[0].actions[0]).toMatchObject({ kind: "GainMemory", amount: 1 });
  });

  it("trashes a qualifying card and draws exactly two on play", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT24-008", as: "elizamon" }],
          hand: [
            { card: "BT24-011", as: "dragonkin" },
            { card: "BT1-001", as: "nonMatch" },
          ],
          deck: [
            { card: "BT1-002", as: "drawOne" },
            { card: "BT1-003", as: "drawTwo" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );

    await advance(s.engine).fire(EffectTiming.OnPlay, s.perm("elizamon"));

    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toContain(s.inst("dragonkin").instanceId);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toEqual(
      expect.arrayContaining([
        s.inst("nonMatch").instanceId,
        s.inst("drawOne").instanceId,
        s.inst("drawTwo").instanceId,
      ]),
    );
  });

  it("may decline the trash cost and draw nothing", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT24-008", as: "elizamon" }],
          hand: [{ card: "BT24-011", as: "dragonkin" }],
          deck: ["BT1-002", "BT1-003"],
        },
      },
      { autoDeclineOptional: true },
    );

    await advance(s.engine).fire(EffectTiming.OnPlay, s.perm("elizamon"));

    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toContain(s.inst("dragonkin").instanceId);
    expect(s.state.players[0]!.deck).toHaveLength(2);
    expect(s.state.players[0]!.trash).toHaveLength(0);
  });

  it("resolves On Play from a public play intent", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [
            { card: "BT24-008", as: "elizamon" },
            { card: "BT24-011", as: "dragonkin" },
          ],
          deck: ["BT1-002", "BT1-003"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("elizamon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.trash.some((card) => card.instanceId === s.inst("dragonkin").instanceId));
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toContain(s.inst("dragonkin").instanceId);
    expect(s.state.players[0]!.hand).toHaveLength(2);
  });

  it("gains memory once only when the opponent's security is removed", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT1-015", as: "host", under: ["BT24-008"] }] } });
    s.state.memory = 0;
    await s.ready();
    await advance(s.engine).fire(EffectTiming.OnStartMainPhase, s.perm("host"));

    await advance(s.engine).fireSubTrigger("whenSecurityRemoved", { removedFromSecuritySeat: 0 });
    expect(s.state.memory).toBe(0);

    await advance(s.engine).fireSubTrigger("whenSecurityRemoved", { removedFromSecuritySeat: 1 });
    await advance(s.engine).fireSubTrigger("whenSecurityRemoved", { removedFromSecuritySeat: 1 });
    expect(s.state.memory).toBe(1);
  });

  it("gains memory from a natural player attack that removes opponent security", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT1-015", as: "host", under: ["BT24-008"] }] },
      1: { security: ["BT1-001"] },
    });
    s.state.memory = 0;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.events.some((event) => event.kind === "securityChecked"));
    expect(s.state.players[1]!.security).toHaveLength(0);
    expect(s.state.memory).toBe(1);
  });

  it("does not gain memory when the opponent removes their own security on their turn", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT1-015", as: "host", under: ["BT24-008"] }] },
      1: {
        battleArea: ["BT1-045"],
        hand: [{ card: "BT24-093", as: "temple" }],
        security: [{ card: "BT1-001", as: "removed" }],
        deck: ["BT1-002"],
      },
    });
    s.state.memory = 5;
    s.state.turnSeat = 1;
    await s.ready();
    const templeId = s.inst("temple").instanceId;
    expect(s.engine.applyIntent(1, { type: "playCard", instanceId: templeId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[1]!.battleArea.some((permanent) => permanent.topCard.instanceId === templeId));
    expect(s.state.players[1]!.hand.map((card) => card.instanceId)).toContain(s.inst("removed").instanceId);
    expect(s.state.players[1]!.security).toHaveLength(1);
    expect(s.state.memory).toBe(3);
  });

  it("reaches Elizamon through a legal red egg evolution", async () => {
    const s = setupEngine({
      0: { breeding: { card: "BT24-001", as: "egg" }, hand: [{ card: "BT24-008", as: "elizamon" }] },
    });
    s.state.memory = 5;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("egg").permanentId,
        instanceId: s.inst("elizamon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("egg").topCard.instanceId === s.inst("elizamon").instanceId);
    expect(s.perm("egg").stack.map((card) => card.cardId)).toEqual(["BT24-001"]);
  });
});
