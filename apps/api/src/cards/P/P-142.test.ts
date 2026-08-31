import { describe, expect, it } from "vitest";
import { getCompiledCard } from "@aegis/shared";
import { EffectTiming } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { assertNoLoudGap, setupEngine, settle } from "../../engine/testkit/harness.js";
import "./P-142.js";

describe("P-142 Falcomon", () => {
  it("trashes an opponent hand card when its inherited host is deleted outside battle", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT1-009", as: "host", under: ["P-142"] }] },
        1: { hand: [{ card: "BT1-010", as: "discarded" }] },
      },
      { autoSelectCards: true },
    );
    await s.ready();
    await advance(s.engine).verb.deletePermanent([s.perm("host").permanentId], "byEffect");
    await settle(() => s.state.players[1]!.trash.some((card) => card.instanceId === s.inst("discarded").instanceId));
    expect(s.state.players[1]!.trash.some((card) => card.instanceId === s.inst("discarded").instanceId)).toBe(true);
    assertNoLoudGap(s);
  });

  it("does not trash a card when the inherited host is deleted in battle", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT1-009", as: "host", under: ["P-142"] }] },
      1: { hand: [{ card: "BT1-010", as: "kept" }] },
    });
    await s.ready();
    await advance(s.engine).verb.deletePermanent([s.perm("host").permanentId], "byBattle");
    await settle();
    expect(s.state.players[1]!.hand.some((card) => card.instanceId === s.inst("kept").instanceId)).toBe(true);
    expect(s.state.players[1]!.trash).toHaveLength(0);
    assertNoLoudGap(s);
  });

  it("encodes the On Play suspension and Ravemon attack option", () => {
    const s = setupEngine({ 0: { hand: [{ card: "P-142", as: "source" }] } });
    const onPlay = getCompiledCard("P-142")?.effects.find((effect) => effect.trigger === "OnPlay");

    expect(onPlay?.actions).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          kind: "Suspend",
          target: expect.objectContaining({
            filter: { controller: "opponent", kind: ["Digimon"], levelComparison: { op: "lte", value: 6 } },
          }),
        }),
        expect.objectContaining({
          kind: "Attack",
          target: expect.objectContaining({
            filter: { controller: "mine", kind: ["Digimon"], nameOrTrait: [{ tokens: ["Ravemon"], match: "name" }] },
          }),
          optional: true,
          abortOnDecline: true,
          cost: expect.objectContaining({ kind: "place", position: "bottom", destination: "digivolutionStack" }),
        }),
      ]),
    );
    assertNoLoudGap(s);
  });

  it("encodes zero-cost Pinamon digivolution and inherited non-battle deletion hand trash", () => {
    const compiled = getCompiledCard("P-142")!;
    expect(compiled.digivolutionRequirement).toEqual([{ names: ["Pinamon"], cost: 0, isAlternate: true }]);
    expect(compiled.effects).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          trigger: "OnDeletion",
          isInherited: true,
          actions: [
            expect.objectContaining({
              kind: "Trash",
              chooser: "opponent",
              target: { filter: { controller: "opponent", zone: "hand" }, count: 1 },
              condition: { kind: "not", condition: { kind: "triggerRemovalCause", removalCause: "byBattle" } },
            }),
          ],
        }),
      ]),
    );
  });

  it("suspends an opposing level-6-or-lower Digimon on play", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "P-142", as: "falcomon" }] },
        1: { battleArea: [{ card: "BT1-009", as: "low", suspended: false }] },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    await s.ready();
    await advance(s.engine).fire(EffectTiming.OnPlay, s.perm("falcomon"));
    await settle();
    expect(s.perm("low").isSuspended).toBe(true);
  });

  it("publicly performs the optional Ravemon attack and places Falcomon underneath it", async () => {
    const preferredIds: string[] = [];
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "P-142", as: "falcomon" }],
          battleArea: [{ card: "BT13-089", as: "ravemon" }],
          security: ["BT1-001", "BT1-002"],
        },
        1: { battleArea: [{ card: "BT1-009", as: "target", suspended: false }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferredIds },
    );
    const targetId = s.perm("target").permanentId;
    preferredIds.push(targetId);
    s.state.memory = 10;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("falcomon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.events.some((event) => event.kind === "combatResolved"));
    expect(s.perm("ravemon").stack.some((card) => card.cardId === "P-142")).toBe(true);
    expect(s.perm("ravemon").isSuspended).toBe(true);
    expect(s.state.players[1]!.battleArea.some((permanent) => permanent.permanentId === targetId)).toBe(false);
  });
});
