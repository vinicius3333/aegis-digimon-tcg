import { describe, expect, it } from "vitest";
import type { ContinuousEffectLedger } from "./continuous.js";
import { isTimingActivationDisabled } from "./timingActivation.js";
import { EffectDuration } from "@aegis/shared";
import { settle, setupEngine } from "../testkit/harness.js";
import { observe } from "../testkit/observe.js";
import { internalsOf } from "../testkit/internals.js";
import "../../cards/BT23/BT23-060.js";

describe("timing activation suppression gate", () => {
  function ledger(
    restrictions: string[] = [],
    masked: string[] = [],
  ): Pick<ContinuousEffectLedger, "hasRestriction" | "isTimingEffectDisabled"> {
    return {
      hasRestriction: (_id, kind) => restrictions.includes(kind),
      isTimingEffectDisabled: (_id, timing) => masked.includes(timing),
    } as Pick<ContinuousEffectLedger, "hasRestriction" | "isTimingEffectDisabled">;
  }

  it("keeps unconditional When Digivolving suppression despite beAffected", () => {
    const restricted = ledger(["cannotActivateWhenDigivolving", "beAffected"]);
    expect(isTimingActivationDisabled(restricted, "target", "whenDigivolving")).toBe(true);
  });

  it("allows beAffected to bypass only a timing mask", () => {
    const masked = ledger([], ["whenDigivolving"]);
    expect(isTimingActivationDisabled(masked, "target", "whenDigivolving")).toBe(true);
    const immune = {
      hasRestriction: (_id: string, kind: string) => kind === "beAffected",
      isTimingEffectDisabled: (_id: string, _timing: string) => true,
    } as Pick<ContinuousEffectLedger, "hasRestriction" | "isTimingEffectDisabled">;
    expect(isTimingActivationDisabled(immune, "target", "whenDigivolving")).toBe(false);
  });

  it("applies the On Play restriction while leaving an unrelated attack window open", () => {
    const restricted = ledger(["activateOnPlay"]);
    expect(isTimingActivationDisabled(restricted, "target", "onPlay")).toBe(true);
    expect(isTimingActivationDisabled(restricted, "target", "whenAttacking")).toBe(false);
  });

  it.each([true, false])(
    "gates a real borrowed On Play effect from a security card (restricted=%s)",
    async (restricted) => {
      const s = setupEngine(
        {
          0: {
            battleArea: [{ card: "BT23-060", as: "machinedramon" }],
            security: [{ card: "BT23-015", faceUp: true }],
          },
          1: { battleArea: [{ card: "BT1-009", as: "victim" }] },
        },
        { autoAcceptOptional: true, autoSelectCards: true },
      );
      await s.ready();
      if (restricted) {
        internalsOf(s.engine).continuous.addRestriction(
          s.perm("machinedramon").permanentId,
          "activateOnPlay",
          EffectDuration.Permanent,
        );
      }
      const victimId = s.perm("victim").permanentId;
      expect(
        s.engine.applyIntent(0, {
          type: "attack",
          attackerPermanentId: s.perm("machinedramon").permanentId,
          target: { kind: "player" },
        }),
      ).toEqual({ ok: true });
      await settle(() => !observe(s.engine).isAttacking());
      expect(s.state.players[1]!.battleArea.some((permanent) => permanent.permanentId === victimId)).toBe(restricted);
    },
  );
});
