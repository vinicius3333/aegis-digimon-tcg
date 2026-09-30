import { describe, it, expect } from "vitest";
import { EffectTiming } from "@aegis/shared";
import { setupEngine, settle, type EngineSetup } from "../../engine/testkit/harness.js";
import { compiled } from "./BT22-093.js";
import "../index.js";
import { CARD_OF_LEVEL, digivolveOnto } from "./sameLevel.testSupport.js";

const AMI_AIBA = "BT22-093";
const OPPONENT_DIGIMON = "BT1-009";

it("registers exclusive compiled IR for the same-level CS chain", () => {
  expect(compiled.effects.find((effect) => effect.trigger === "YourTurn")).toMatchObject({
    actions: [
      {
        kind: "SubTrigger",
        event: "whenOneOfYoursDigivolves",
        sourceFilter: expect.any(Object),
        actions: [
          {
            kind: "Digivolve",
            payCost: false,
            condition: { kind: "triggerSubjectStackHasSameLevel" },
          },
        ],
      },
    ],
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
      0: { battleArea: [{ card: AMI_AIBA, dp: 0 }] },
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

    const memBefore = s.state.memory;

    await fireTiming(s, EffectTiming.OnStartMainPhase, {});
    for (let i = 0; i < 50; i++) await Promise.resolve();

    expect(s.state.memory).toBe(memBefore);
  });
});

describe("BT22-093 [Your Turn] CS digivolution chain", () => {
  it("suspends Ami and chains a real public CS digivolve into a second CS card", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: AMI_AIBA, as: "ami" },
            { card: "BT22-010", under: ["BT22-011"], as: "subject" },
          ],
          hand: [
            { card: "BT22-011", as: "first" },
            { card: "BT22-013", as: "second" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("subject").permanentId,
        instanceId: s.inst("first").instanceId,
      }),
    ).toEqual({ ok: true });
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
            { card: "BT22-010", under: ["BT22-011"], as: "subject" },
          ],
          hand: [
            { card: "BT22-011", as: "first" },
            { card: "BT22-013", as: "second" },
          ],
        },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("subject").permanentId,
        instanceId: s.inst("first").instanceId,
      }),
    ).toEqual({ ok: true });
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
            { card: "BT22-010", under: ["BT22-010"], as: "subject" },
          ],
          hand: [
            { card: "BT22-011", as: "first" },
            { card: "BT22-013", as: "second" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("subject").permanentId,
        instanceId: s.inst("first").instanceId,
      }),
    ).toEqual({ ok: true });
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

describe("BT22-093 Ami Aiba — KB Q&A rulings", () => {
  it("does not let a 2nd Ami Aiba trigger once the free digivolution leaves no same-level digivolution card (Q4964)", async () => {
    const preferInstanceIds: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT22-093", as: "firstAmi" },
            { card: "BT22-093", as: "secondAmi" },
            { card: CARD_OF_LEVEL[4], as: "base", under: [CARD_OF_LEVEL[5]] },
          ],
          hand: [
            { card: "BT22-073", as: "crescemon" },
            { card: "BT22-077", as: "dianamon" },
            { card: "BT1-009", as: "discard" },
          ],
          deck: ["BT1-010", "BT1-011", "BT1-012", "BT1-013"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds },
    );
    preferInstanceIds.push(s.inst("discard").instanceId);
    s.state.memory = 10;
    await s.ready();

    expect(digivolveOnto(s, "base", "crescemon")).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard.cardId === "BT22-077");
    await settle(() => s.state.pendingDecision === undefined);

    expect(s.perm("base").stack.map((card) => card.cardId)).toEqual([CARD_OF_LEVEL[5], CARD_OF_LEVEL[4], "BT22-073"]);
    expect([s.perm("firstAmi").isSuspended, s.perm("secondAmi").isSuspended].filter(Boolean)).toHaveLength(1);
    expect(s.state.memory).toBe(10 - 4);
  });
});
