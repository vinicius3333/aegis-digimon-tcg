import { describe, expect, it } from "vitest";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import { EffectTiming } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./P-150.js";

describe("P-150 Exermon", () => {
  it("encodes both When Digivolving branches, including the exact-three overlap", () => {
    const effect = runtimeCompiledCard("P-150")!.effects[0]!;
    expect(effect.trigger).toBe("WhenDigivolving");
    expect(effect.actions).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          kind: "Suspend",
          target: { filter: { controller: "opponent", kind: ["Digimon", "Tamer"] }, count: 1 },
          condition: expect.objectContaining({ kind: "securityAtLeast", value: 3 }),
        }),
        expect.objectContaining({
          kind: "Restrict",
          restriction: "unsuspend",
          duration: "untilOpponentTurnEnd",
          target: { filter: { controller: "opponent", kind: ["Digimon", "Tamer"] }, count: 1 },
          condition: expect.objectContaining({
            kind: "zoneCount",
            seat: "mine",
            zone: "security",
            op: "lte",
            value: 3,
          }),
        }),
      ]),
    );
  });

  it("encodes the inherited once-per-turn DP-relative suspension", () => {
    const inherited = runtimeCompiledCard("P-150")!.effects.find((effect) => effect.isInherited)!;
    expect(inherited).toMatchObject({
      trigger: "AllTurns",
      frequency: "OncePerTurn",
      actions: [
        {
          kind: "SubTrigger",
          event: "whenSuspended",
          sourceFilter: { isSelfRef: true },
          actions: [
            {
              kind: "Suspend",
              target: expect.objectContaining({
                filter: { controller: "opponent", kind: ["Digimon"], dp: { op: "lte", relativeToSource: true } },
                count: 1,
              }),
            },
          ],
        },
      ],
    });
  });

  it("suspends an opposing Digimon at the exact three-security boundary", async () => {
    const s = setupEngine(
      {
        0: { security: 3, battleArea: [{ card: "P-150", as: "exermon" }] },
        1: { battleArea: [{ card: "BT1-009", as: "target" }] },
      },
      { autoSelectCards: true },
    );
    await s.ready();
    await advance(s.engine).fire(EffectTiming.WhenDigivolving, s.perm("exermon"));
    await settle();
    expect(s.perm("target").isSuspended).toBe(true);
  });

  it("does not suspend from the security-at-least-three clause with only two security", async () => {
    const s = setupEngine(
      {
        0: { security: 2, battleArea: [{ card: "P-150", as: "exermon" }] },
        1: { battleArea: [{ card: "BT1-009", as: "target" }] },
      },
      { autoSelectCards: true },
    );
    await s.ready();
    await advance(s.engine).fire(EffectTiming.WhenDigivolving, s.perm("exermon"));
    await settle();
    expect(s.perm("target").isSuspended).toBe(false);
  });
});
