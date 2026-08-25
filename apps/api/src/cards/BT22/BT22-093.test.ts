import { describe, it, expect } from "vitest";
import { EffectTiming } from "@aegis/shared";
import { setupEngine, settle, type EngineSetup } from "../../engine/testkit/harness.js";
import { compiled } from "./BT22-093.js";
import "./index.js";

// A3 for BT22-093 (Ami Aiba) — [Start of Your Main Phase]:
//   "If your opponent has a Digimon, gain 1 memory."
//
// FAILS-WHEN-REVERTED: with BT22-093 on the battle area and an opponent Digimon present,
// firing OnStartMainPhase on seat 0's turn gains 1 memory. Without the hand-written
// module the IR's StartOfYourMainPhase GainMemory + opponentHas condition works via the
// interpreter, but the [Your Turn] CS digivolve-chain clause is RawUnparsed (inert).
// Our test proves the [Start of Main Phase] memory gain is implemented, which is the
// correct condition-check path (requires opponent to have a Digimon).
//
// Two proofs:
//   1. Positive: opponent has a Digimon → gain 1 memory.
//   2. Negative: opponent has no Digimon → no memory gain.

const AMI_AIBA = "BT22-093";
const OPPONENT_DIGIMON = "BT1-009"; // Monodramon — any Digimon works

it("registers exclusive compiled IR for the same-level CS chain", () => {
  expect(compiled.effects.find((effect) => effect.trigger === "YourTurn")).toMatchObject({
    timingOverride: "OnEnterFieldAnyone",
    condition: {
      kind: "allOf",
      conditions: expect.arrayContaining([
        expect.objectContaining({ kind: "triggerSubjectMatchesFilter" }),
        { kind: "triggerSubjectStackHasSameLevel" },
      ]),
    },
    actions: [{ kind: "CostGatedBlock", actions: [{ kind: "Digivolve", payCost: false }] }],
  });
});

function fireTiming(s: EngineSetup, timing: EffectTiming, trigger: Record<string, unknown> = {}): Promise<void> {
  return (
    s.engine as unknown as {
      fireTiming(t: EffectTiming, trigger?: Record<string, unknown>): Promise<void>;
    }
  ).fireTiming(timing, trigger);
}

describe("BT22-093 [Start of Main Phase] gain 1 memory if opponent has Digimon", () => {
  it("gains 1 memory when opponent has a Digimon in their battle area", async () => {
    const s = setupEngine({
      // Ami Aiba on seat 0's battle area.
      0: { battleArea: [{ card: AMI_AIBA, dp: 0 }] },
      // Opponent has a Digimon (canActivate condition).
      1: { battleArea: [{ card: OPPONENT_DIGIMON, dp: 3000 }] },
    });

    const memBefore = s.state.memory;

    await fireTiming(s, EffectTiming.OnStartMainPhase, {});
    await settle(() => s.state.memory !== memBefore, 200);

    expect(s.state.memory).toBe(memBefore + 1);
  });

  it("does NOT gain memory when opponent has no Digimon (canActivate gate fails)", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: AMI_AIBA, dp: 0 }] },
    });

    // Opponent has no Digimon.
    const memBefore = s.state.memory;

    await fireTiming(s, EffectTiming.OnStartMainPhase, {});
    for (let i = 0; i < 50; i++) await Promise.resolve();

    expect(s.state.memory).toBe(memBefore);
  });
});

describe("BT22-093 [Your Turn] CS digivolution chain", () => {
  it("suspends Ami and digivolves a qualifying CS Digimon into a CS card from hand for free", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: AMI_AIBA, as: "ami" },
            // Level 5 CS Digimon with a same-level card in its stack.
            { card: "BT22-011", under: ["BT22-011"], as: "subject" },
          ],
          hand: ["BT22-013"], // Level 6 [CS] Digimon.
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );

    const subject = s.perm("subject");
    await fireTiming(s, EffectTiming.OnEnterFieldAnyone, { subjectPermanentId: subject.permanentId });
    await settle(() => s.perm("subject").topCard?.cardId === "BT22-013", 400);

    expect(s.perm("ami").isSuspended).toBe(true);
    expect(s.perm("subject").topCard?.cardId).toBe("BT22-013");
    expect(s.state.players[0]!.hand.some((card) => card.cardId === "BT22-013")).toBe(false);
  });

  it("leaves Ami unsuspended and digivolves nothing when the suspend cost is declined", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: AMI_AIBA, as: "ami" },
            { card: "BT22-011", under: ["BT22-011"], as: "subject" },
          ],
          hand: ["BT22-013"],
        },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );

    await fireTiming(s, EffectTiming.OnEnterFieldAnyone, { subjectPermanentId: s.perm("subject").permanentId });
    await settle(() => false, 80);

    expect(s.decisions.some((d) => d.req.kind === "optional")).toBe(true);
    expect(s.perm("ami").isSuspended).toBe(false);
    expect(s.perm("subject").topCard?.cardId).toBe("BT22-011");
    expect(s.state.players[0]!.hand.some((card) => card.cardId === "BT22-013")).toBe(true);
  });

  it("does not activate for a CS Digimon without a same-level stack card", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: AMI_AIBA, as: "ami" },
            { card: "BT22-011", under: ["BT22-010"], as: "subject" },
          ],
          hand: ["BT22-013"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );

    await fireTiming(s, EffectTiming.OnEnterFieldAnyone, { subjectPermanentId: s.perm("subject").permanentId });
    await settle(() => false, 80);

    expect(s.perm("ami").isSuspended).toBe(false);
    expect(s.perm("subject").topCard?.cardId).toBe("BT22-011");
  });
});

describe("BT22-093 [Security]", () => {
  it("plays itself from security without paying its play cost", async () => {
    const s = setupEngine({ 0: { security: [{ card: AMI_AIBA, as: "ami", faceUp: true }] } });

    await (
      s.engine as unknown as { fireTiming(t: EffectTiming, trigger?: Record<string, unknown>): Promise<void> }
    ).fireTiming(EffectTiming.SecuritySkill, { sourceInstanceId: s.inst("ami").instanceId });
    await settle(
      () => s.state.players[0]!.battleArea.some((p) => p.topCard?.instanceId === s.inst("ami").instanceId),
      300,
    );

    expect(s.state.players[0]!.battleArea.some((p) => p.topCard?.instanceId === s.inst("ami").instanceId)).toBe(true);
  });
});
