import { describe, expect, it } from "vitest";
import { compiled } from "./EX9-039.js";
import { EffectTiming } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { observe } from "../../engine/testkit/observe.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "../index.js";

describe("EX9-039", () => {
  it("uses Training to suspend and place the deck top below the existing source", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "EX9-039", as: "source", under: ["BT1-064"] }], deck: ["BT1-009"] },
    });
    await s.ready();
    const [entry] = observe(s.engine).activatableEffects(s.perm("source"));
    expect(entry).toBeDefined();
    expect(
      s.engine.applyIntent(0, {
        type: "activateEffect",
        sourceInstanceId: s.perm("source").topCard.instanceId,
        effectKey: entry!.effectKey,
      }),
    ).toEqual({ ok: true });
    await settle();
    expect(s.perm("source").isSuspended).toBe(true);
    expect(s.perm("source").stack.map(({ cardId, faceUp }) => [cardId, faceUp])).toEqual([
      ["BT1-009", false],
      ["BT1-064", true],
    ]);
    expect(s.state.players[0]!.deck).toHaveLength(0);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it.each(["EX9-007", "BT1-009"])("allows off-color evolution only with the DM trait: %s", async (baseCard) => {
    const s = setupEngine({
      0: { breeding: { card: baseCard, as: "base" }, hand: [{ card: "EX9-039", as: "evo" }], deck: ["BT1-048"] },
    });
    s.state.memory = 5;
    await s.ready();
    const eligible = baseCard === "EX9-007";
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("evo").instanceId,
      }).ok,
    ).toBe(eligible);
    await settle();
    expect(s.perm("base").topCard.cardId).toBe(eligible ? "EX9-039" : baseCard);
    expect(s.perm("base").stack.map(({ cardId }) => cardId)).toEqual(eligible ? [baseCard] : []);
    expect(s.state.memory).toBe(eligible ? 3 : 5);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("explicitly declines an available attack without suspending the attacker", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "EX9-039", as: "source" }] },
        1: { battleArea: [{ card: "BT1-009", as: "target", suspended: true }] },
      },
      { autoSelectCards: true, autoOrderTriggers: true },
    );
    const resolution = advance(s.engine).fire(EffectTiming.OnPlay, s.perm("source"));
    await settle(() => s.state.pendingDecision?.kind === "optional");
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: s.state.pendingDecision!.decisionId,
        response: { kind: "optional", accept: false },
      }),
    ).toEqual({ ok: true });
    await resolution;
    await settle();
    expect(s.events.some(({ kind }) => kind === "attackDeclared")).toBe(false);
    expect(s.perm("source").isSuspended).toBe(false);
    expect(s.state.players[1]!.battleArea).toHaveLength(1);
    expect(s.state.pendingDecision).toBeUndefined();
  });
  it("has Training and suspends an opposing Digimon on play or digivolution, then may attack", () => {
    expect(compiled.effects?.find((entry) => !entry.isInherited)?.keywords).toContainEqual({
      keyword: "Training",
      raw: "＜Training＞",
    });
    for (const trigger of ["OnPlay", "WhenDigivolving"])
      expect(compiled.effects?.find((entry) => entry.trigger === trigger)).toMatchObject({
        actions: [
          { kind: "PlaceUnder", optional: true },
          { kind: "Suspend", scaling: { unit: "digivolutionCards", per: 1, filter: { faceDown: true } } },
          { kind: "Attack", attackPlayer: false, optional: true },
        ],
      });
  });
  it("inherits suspension of an opposing Digimon or Tamer on deletion", () =>
    expect(compiled.effects?.find((entry) => entry.isInherited)).toMatchObject({
      trigger: "OnDeletion",
      actions: [{ kind: "Suspend", target: { filter: { controller: "opponent", kind: ["Digimon", "Tamer"] } } }],
    }));

  it("places a hand card face-down, scales suspension from this stack, and permits the optional attack", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            {
              card: "EX9-039",
              as: "source",
              under: [
                { card: "BT1-009", faceUp: false },
                { card: "BT1-064", faceUp: true },
              ],
            },
          ],
          hand: ["BT1-001"],
        },
        1: {
          battleArea: [
            { card: "BT1-010", as: "opponent1", dp: 1000 },
            { card: "BT1-010", as: "opponent2", dp: 1000 },
            { card: "BT1-010", as: "opponent3", dp: 1000 },
          ],
          security: ["BT1-001"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoOrderTriggers: true },
    );
    await advance(s.engine).fire(EffectTiming.OnPlay, s.perm("source"));
    await settle(() => s.state.players[1]!.battleArea.length === 2);
    await settle();
    expect(s.perm("source").stack.map((card) => card.faceUp)).toEqual([false, false, true]);
    expect(s.perm("source").stack.map(({ cardId }) => cardId)).toEqual(["BT1-001", "BT1-009", "BT1-064"]);
    expect(s.state.players[0]!.hand).toHaveLength(0);
    expect(s.state.players[1]!.security).toHaveLength(1);
    expect(s.state.players[1]!.battleArea.filter((permanent) => permanent.isSuspended)).toHaveLength(1);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("still permits the following attack when the optional hand placement is declined", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "EX9-039", as: "source", dp: 12000 }], hand: ["BT1-001"] },
        1: { battleArea: [{ card: "BT1-010", as: "opponent", dp: 1000, suspended: true }] },
      },
      { autoSelectCards: true, autoOrderTriggers: true },
    );
    const source = s.perm("source");
    const resolution = advance(s.engine).fire(EffectTiming.OnPlay, source);
    await settle(() => s.state.pendingDecision?.kind === "optional");
    const placementDecision = s.state.pendingDecision!;
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: placementDecision.decisionId,
        response: { kind: "optional", accept: false },
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        s.state.pendingDecision?.kind === "optional" &&
        s.state.pendingDecision.decisionId !== placementDecision.decisionId,
    );
    const attackDecision = s.state.pendingDecision!;
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: attackDecision.decisionId,
        response: { kind: "optional", accept: true },
      }),
    ).toEqual({ ok: true });
    await resolution;
    await settle(() => s.events.some((event) => event.kind === "attackDeclared"));
    await settle();

    expect(source.stack).toHaveLength(0);
    expect(s.state.players[0]!.hand.map(({ cardId }) => cardId)).toEqual(["BT1-001"]);
    expect(s.state.players[1]!.battleArea).toHaveLength(0);
    expect(s.events.some((event) => event.kind === "attackDeclared")).toBe(true);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("does not substitute trash or deck cards for an empty hand", async () => {
    const s = setupEngine(
      { 0: { battleArea: [{ card: "EX9-039", as: "source" }], trash: ["BT1-009"], deck: ["BT1-064"] } },
      { autoSelectCards: true, autoAcceptOptional: true, autoOrderTriggers: true },
    );
    await advance(s.engine).fire(EffectTiming.OnPlay, s.perm("source"));
    await settle();
    expect(s.perm("source").stack).toHaveLength(0);
    expect(s.state.players[0]!.trash.map(({ cardId }) => cardId)).toEqual(["BT1-009"]);
    expect(s.state.players[0]!.deck.map(({ cardId }) => cardId)).toEqual(["BT1-064"]);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("places the hand card beneath a legal evolution source and attacks after real digivolution", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT1-064", as: "host" }],
          hand: [{ card: "EX9-039", as: "evo" }, "BT1-009"],
          deck: ["BT1-048"],
        },
        1: { battleArea: [{ card: "BT1-009", as: "target" }], security: ["BT1-001"] },
      },
      { autoSelectCards: true, autoAcceptOptional: true, autoOrderTriggers: true },
    );
    s.state.memory = 5;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("host").permanentId,
        instanceId: s.inst("evo").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle();
    expect(s.perm("host").topCard.cardId).toBe("EX9-039");
    expect(s.perm("host").stack.map(({ cardId, faceUp }) => [cardId, faceUp])).toEqual([
      ["BT1-009", false],
      ["BT1-064", true],
    ]);
    expect(s.state.players[0]!.hand.map(({ cardId }) => cardId)).toEqual(["BT1-048"]);
    expect(s.state.memory).toBe(3);
    expect(s.state.players[1]!.battleArea).toHaveLength(0);
    expect(s.state.players[1]!.security).toHaveLength(1);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it.each(["BT1-009", "BT1-087"])(
    "suspends opposing %s through inherited deletion after a real security loss",
    async (targetCard) => {
      const s = setupEngine(
        {
          0: {
            battleArea: [
              { card: "BT1-076", as: "host", under: ["EX9-039"] },
              { card: "BT1-009", as: "ally" },
            ],
          },
          1: { battleArea: [{ card: targetCard, as: "target" }], security: ["ST1-10"] },
        },
        { autoSelectCards: true, autoOrderTriggers: true, autoAcceptOptional: true },
      );
      await s.ready();
      expect(
        s.engine.applyIntent(0, {
          type: "attack",
          attackerPermanentId: s.perm("host").permanentId,
          target: { kind: "player" },
        }),
      ).toEqual({ ok: true });
      await settle();
      expect(s.state.players[0]!.trash.map(({ cardId }) => cardId)).toEqual(
        expect.arrayContaining(["BT1-076", "EX9-039"]),
      );
      expect(s.perm("target").isSuspended).toBe(true);
      expect(s.perm("ally").isSuspended).toBe(false);
      expect(s.state.players[1]!.security).toHaveLength(0);
      expect(s.state.pendingDecision).toBeUndefined();
    },
  );
});
