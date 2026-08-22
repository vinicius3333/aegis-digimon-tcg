import { describe, expect, it } from "vitest";
import { settle, setupEngine } from "../../engine/testkit/harness.js";
import "../index.js";
import { compiled } from "./BT14-004.js";

describe("BT14-004", () => it("inherits once-per-turn +2000 DP when your effect suspends a Tamer", () => expect(compiled.effects?.find((entry) => entry.isInherited)).toMatchObject({ frequency: "OncePerTurn", actions: [{ kind: "SubTrigger", event: "whenEffectSuspends", sourceFilter: { kind: ["Tamer"] }, bySourceController: "mine", actions: [{ kind: "ModifyDP", amount: 2000, duration: "forTheTurn" }] }] })));

it("gains +2000 DP once when your effect suspends a Tamer", async () => {
  const s = setupEngine({
    0: { battleArea: [{ card: "BT14-007", as: "host", under: ["BT14-004"] }] },
    1: { battleArea: [{ card: "BT22-083", as: "tamer" }] },
  });
  const host = s.perm("host");
  const before = host.currentDP;
  await (s.engine as unknown as { recomputeContinuousEffects(): Promise<void> }).recomputeContinuousEffects();

  await (s.engine as unknown as { fireSubTrigger(event: string, payload: unknown): Promise<void> }).fireSubTrigger("whenEffectSuspends", {
    subjectPermanentId: s.perm("tamer").permanentId,
    suspendedPermanentId: s.perm("tamer").permanentId,
    effectSuspendSeat: 0,
  });
  await settle(() => host.currentDP === before + 2000);
  expect(host.currentDP).toBe(before + 2000);

  await (s.engine as unknown as { fireSubTrigger(event: string, payload: unknown): Promise<void> }).fireSubTrigger("whenEffectSuspends", {
    subjectPermanentId: s.perm("tamer").permanentId,
    suspendedPermanentId: s.perm("tamer").permanentId,
    effectSuspendSeat: 0,
  });
  expect(host.currentDP).toBe(before + 2000);
});
