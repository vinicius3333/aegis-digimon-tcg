import { describe, expect, it } from "vitest";
import { EffectTiming } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import "./P-234.js";

describe("P-234 Yujin Ozora", () => {
  it("reveals four cards and adds one supported trait", () => {
    expect(runtimeCompiledCard("P-234")!.effects).toContainEqual(
      expect.objectContaining({
        trigger: "OnPlay",
        actions: [
          expect.objectContaining({
            kind: "RevealAdd",
            revealCount: 4,
            add: [
              expect.objectContaining({
                count: 1,
                filter: {
                  controllerDefault: "mine",
                  nameOrTrait: [{ tokens: ["System", "Navi", "Tool", "Leviathan"], match: "trait" }],
                },
                to: "hand",
              }),
            ],
            rest: "deckBottom",
          }),
        ],
      }),
    );
  });

  it("links from hand after a link card is trashed, with the suspend cost and reduction", () => {
    expect(runtimeCompiledCard("P-234")!.effects).toContainEqual(
      expect.objectContaining({
        trigger: "YourTurn",
        actions: [
          expect.objectContaining({
            kind: "SubTrigger",
            event: "whenLinkTrashed",
            sourceFilter: { controller: "mine", kind: ["Digimon"] },
            actions: [
              expect.objectContaining({
                kind: "Link",
                from: ["hand"],
                costDelta: -2,
                recipient: { filter: { controller: "mine", kind: ["Digimon"] }, count: 1 },
                cost: expect.objectContaining({ kind: "suspend" }),
              }),
            ],
          }),
        ],
      }),
    );
  });

  it("plays without cost from Security", () => {
    expect(runtimeCompiledCard("P-234")!.effects).toContainEqual(
      expect.objectContaining({ trigger: "Security", isSecurity: true }),
    );
  });
});
describe("P-234 engine behavior", () => {
  it("reveals four cards and adds one System/Life/Transmutation-family card on play", async () => {
    const s = setupEngine(
      { 0: { hand: [{ card: "P-234", as: "yujin" }], deck: ["BT21-047", "BT1-009", "BT1-028", "BT1-048"] } },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 20;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("yujin").instanceId })).toEqual({ ok: true });
    await settle();
    expect(s.state.players[0]!.hand.some((card) => card.cardId === "BT21-047")).toBe(true);
  });

  it("plays itself from Security", async () => {
    const s = setupEngine({ 0: { security: [{ card: "P-234", as: "yujin" }] } });
    await s.ready();
    await advance(s.engine).fireForInstance(EffectTiming.SecuritySkill, s.inst("yujin"));
    await settle(() => s.state.players[0]!.battleArea.some((p) => p.topCard.instanceId === s.inst("yujin").instanceId));
    expect(s.state.players[0]!.battleArea.some((p) => p.topCard.instanceId === s.inst("yujin").instanceId)).toBe(true);
  });

  it("links a matching hand card after a Digimon's link card is trashed", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "P-234", as: "yujin" },
            { card: "BT21-009", as: "host", linked: [{ card: "BT22-035", as: "oldLink" }] },
          ],
          hand: [{ card: "EX10-019", as: "newLink" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 5;
    await s.ready();
    const memoryBefore = s.state.memory;
    await advance(s.engine).verb.trash([s.inst("oldLink").instanceId]);
    await settle();
    expect(s.perm("yujin").isSuspended).toBe(true);
    expect(s.perm("host").linked.some((card) => card.instanceId === s.inst("newLink").instanceId)).toBe(true);
    expect(s.state.memory).toBe(memoryBefore - 1);
  });

  it("reacts during its own turn when Detach pays a battle departure", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "P-234", as: "yujin" },
            { card: "BT26-019", as: "attacker", linked: [{ card: "BT26-010", as: "oldLink" }] },
          ],
          hand: [{ card: "EX10-019", as: "newLink" }],
          deck: ["BT1-009"],
        },
        1: { battleArea: [{ card: "BT1-014", as: "defender", suspended: true }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "permanent", permanentId: s.perm("defender").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => !observe(s.engine).isAttacking() && s.state.pendingDecision === undefined);

    expect(s.perm("yujin").isSuspended).toBe(true);
    expect(s.perm("attacker").linked.map(({ instanceId }) => instanceId)).toEqual([s.inst("newLink").instanceId]);
    expect(s.state.players[0]!.trash.map(({ instanceId }) => instanceId)).toContain(s.inst("oldLink").instanceId);
    expect(s.state.players[1]!.battleArea).toHaveLength(0);
  });

  it("does not react to Detach's link trash during the opponent's turn", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "P-234", as: "yujin" },
            { card: "BT26-019", as: "holder", linked: [{ card: "BT26-010", as: "paymentLink" }] },
          ],
          hand: [{ card: "EX10-019", as: "newLink" }],
          security: ["BT1-009"],
        },
        1: {
          battleArea: [{ card: "BT1-009", as: "source" }],
          hand: [{ card: "ST1-16", as: "gaiaForce" }],
          security: ["BT1-009"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.turnSeat = 1;
    s.state.memory = 10;
    await s.ready();

    expect(s.engine.applyIntent(1, { type: "playCard", instanceId: s.inst("gaiaForce").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.pendingDecision === undefined && s.perm("holder").linked.length === 0);

    expect(s.perm("yujin").isSuspended).toBe(false);
    expect(s.state.players[0]!.hand.map(({ instanceId }) => instanceId)).toContain(s.inst("newLink").instanceId);
    expect(s.state.players[0]!.trash.map(({ instanceId }) => instanceId)).toContain(s.inst("paymentLink").instanceId);

    expect(s.state.players[0]!.battleArea.map(({ permanentId }) => permanentId)).toContain(
      s.perm("holder").permanentId,
    );
  });
});
