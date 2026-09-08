import { describe, expect, it } from "vitest";
import { drainMicrotasks, setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./EX5-004.js";
import "../index.js";

describe("EX5-004 Frimon", () => {
  it("draws once per turn when attacking if it has Leomon in its name", () => {
    expect(compiled.effects?.find((entry) => entry.trigger === "WhenAttacking")).toMatchObject({
      isInherited: true,
      frequency: "OncePerTurn",
      actions: [
        {
          kind: "Draw",
          controller: "mine",
          amount: 1,
          condition: { kind: "selfHasNameContaining", names: ["Leomon"] },
        },
      ],
    });
  });

  it("draws on a Leomon-name attack but not on an unrelated Digimon attack", async () => {
    // An unrelated host never fires the inherited draw, so that case can only be proven
    // by draining the queue and asserting the draw did NOT happen (a disguised negative
    // proof otherwise).
    const resolve = async (hostCard: string, expectDraw: boolean) => {
      const s = setupEngine({
        0: {
          battleArea: [{ card: hostCard, as: "host", under: ["EX5-004"] }],
          deck: [{ card: "BT1-010", as: "drawn" }],
        },
        1: { security: ["BT1-001"] },
      });
      await s.ready();
      expect(
        s.engine.applyIntent(0, {
          type: "attack",
          attackerPermanentId: s.perm("host").permanentId,
          target: { kind: "player" },
        }),
      ).toEqual({ ok: true });
      if (expectDraw) {
        await settle(
          () => s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("drawn").instanceId),
          300,
        );
      } else {
        await drainMicrotasks(300);
      }
      return s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("drawn").instanceId);
    };

    expect(await resolve("BT1-035", true)).toBe(true);
    expect(await resolve("BT1-034", false)).toBe(false);
  });
});
