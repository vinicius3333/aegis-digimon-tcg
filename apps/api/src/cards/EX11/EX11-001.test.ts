import { EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import { advance } from "../../engine/testkit/advance.js";
import { assertNoLoudGap, setupEngine, settle } from "../../engine/testkit/harness.js";
import "./EX11-001.js";

describe("EX11-001 Koromon", () => {
  it("compiles its inherited once-per-turn attack digivolution permission", () => {
    const compiled = runtimeCompiledCard("EX11-001");
    expect(compiled!.coverage).toBe("full");
    expect(compiled!.residual).toEqual([]);
    expect(compiled!.effects).toContainEqual(
      expect.objectContaining({
        trigger: "WhenAttacking",
        isInherited: true,
        frequency: "OncePerTurn",
        actions: [
          expect.objectContaining({
            kind: "Digivolve",
            optional: true,
            payCost: true,
            from: ["hand"],
            into: {
              controllerDefault: "mine",
              kind: ["Digimon"],
              nameOrTrait: [
                { tokens: ["Tyrannomon"], match: "name" },
                { tokens: ["Dinosaur"], match: "trait" },
              ],
            },
          }),
        ],
      }),
    );
  });

  it("pays the printed cost to digivolve its realistic Reptile stack into a Dinosaur", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX11-008", as: "host", under: ["EX11-001"] }],
          hand: [{ card: "BT1-015", as: "greymon" }],
          deck: ["BT1-001"],
        },
        1: { battleArea: [{ card: "BT1-012", as: "target", suspended: true, dp: 0 }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoOrderTriggers: true },
    );
    s.state.memory = 10;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "permanent", permanentId: s.perm("target").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("host").topCard.instanceId === s.inst("greymon").instanceId);

    expect(s.perm("host").stack.map((card) => card.cardId)).toEqual(["EX11-001", "EX11-008"]);
    expect(s.state.memory).toBe(8);
    assertNoLoudGap(s);
  });

  it("may decline the inherited attack digivolution", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX11-008", as: "host", under: ["EX11-001"] }],
          hand: [{ card: "BT1-015", as: "greymon" }],
        },
        1: { battleArea: [{ card: "BT1-012", as: "target", suspended: true, dp: 0 }] },
      },
      { autoDeclineOptional: true, autoOrderTriggers: true },
    );
    s.state.memory = 10;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "permanent", permanentId: s.perm("target").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle();

    expect(s.perm("host").topCard.cardId).toBe("EX11-008");
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toContain(s.inst("greymon").instanceId);
    expect(s.state.memory).toBe(10);
    assertNoLoudGap(s);
  });

  it("does not offer a legal-level card outside the Tyrannomon-name and Dinosaur-trait filter", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX11-008", as: "host", under: ["EX11-001"] }],
          hand: [{ card: "BT1-014", as: "birdramon" }],
        },
        1: { battleArea: [{ card: "BT1-012", as: "target", suspended: true, dp: 0 }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoOrderTriggers: true },
    );
    s.state.memory = 10;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "permanent", permanentId: s.perm("target").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle();

    expect(s.perm("host").topCard.cardId).toBe("EX11-008");
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toContain(s.inst("birdramon").instanceId);
    expect(s.state.memory).toBe(10);
    assertNoLoudGap(s);
  });

  it("uses the inherited effect only once per turn after the first evolution keeps Koromon in the stack", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX11-008", as: "host", under: ["EX11-001"] }],
          hand: [
            { card: "BT1-015", as: "greymon" },
            { card: "EX11-010", as: "master" },
          ],
          deck: ["BT1-001"],
        },
        1: { battleArea: [{ card: "BT1-012", as: "firstTarget", suspended: true }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoOrderTriggers: true },
    );
    s.state.memory = 10;
    await s.ready();
    const firstTargetId = s.perm("firstTarget").permanentId;

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "permanent", permanentId: firstTargetId },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("host").topCard.instanceId === s.inst("greymon").instanceId);
    await settle(() => !s.state.players[1]!.battleArea.some((permanent) => permanent.permanentId === firstTargetId));
    expect(s.state.memory).toBe(8);

    await advance(s.engine).fire(EffectTiming.OnUseAttack, s.perm("host"));
    await settle();

    expect(s.perm("host").topCard.instanceId).toBe(s.inst("greymon").instanceId);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toContain(s.inst("master").instanceId);
    expect(s.state.memory).toBe(8);
    assertNoLoudGap(s);
  });
});
