import { describe, expect, it } from "vitest";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import { observe } from "../../engine/testkit/observe.js";
import "./P-241.js";

describe("P-241 Yujin Ozora", () => {
  it("sets memory to three at the start of turn when memory is two or less", () => {
    expect(runtimeCompiledCard("P-241")!.effects).toContainEqual(
      expect.objectContaining({
        trigger: "StartOfYourTurn",
        actions: [
          { kind: "SetMemory", value: 3, condition: expect.objectContaining({ kind: "memoryAtMost", value: 2 }) },
        ],
      }),
    );
  });

  it("handles linking in one trigger: grants Appmon Vortex and DP, then permits App Fuse", () => {
    expect(runtimeCompiledCard("P-241")!.effects).toContainEqual(
      expect.objectContaining({
        trigger: "YourTurn",
        actions: [
          expect.objectContaining({
            kind: "SubTrigger",
            event: "whenLinked",
            sourceFilter: { controller: "mine", kind: ["Digimon"] },
            actions: [
              expect.objectContaining({
                kind: "GainKeyword",
                duration: "forTheTurn",
                cost: expect.objectContaining({ kind: "suspend" }),
              }),
              expect.objectContaining({ kind: "ModifyDP", amount: 3000, duration: "forTheTurn" }),
              expect.objectContaining({ kind: "AppFuse", optional: true }),
            ],
          }),
        ],
      }),
    );
  });

  it("grants the Leviathan trait by Rule and plays from Security", () => {
    const effects = runtimeCompiledCard("P-241")!.effects;
    expect(effects).toContainEqual(
      expect.objectContaining({
        trigger: "Rule",
        actions: [expect.objectContaining({ kind: "GrantStatic", grant: "trait", tokens: ["Leviathan"] })],
      }),
    );
    expect(effects).toContainEqual(
      expect.objectContaining({
        trigger: "Security",
        isSecurity: true,
        actions: [expect.objectContaining({ kind: "PlayWithoutCost" })],
      }),
    );
  });
});
import { EffectTiming } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";

describe("P-241 engine behavior", () => {
  it("sets memory to exactly three at the start of a real turn from memory two", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "P-241", as: "yujin" }],
          security: 3,
          deck: ["BT1-009", "BT1-009", "BT1-009", "BT1-009", "BT1-009"],
        },
        1: { security: 3 },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 2;
    s.state.isFirstPlayersFirstTurn = false;
    await s.ready();
    await advance(s.engine).fireGlobal(EffectTiming.OnStartTurn);
    expect(s.state.memory).toBe(3);
  });

  it("plays itself without cost from Security", async () => {
    const s = setupEngine({ 0: { security: [{ card: "P-241", as: "yujin" }] } });
    await s.ready();
    await advance(s.engine).fireForInstance(EffectTiming.SecuritySkill, s.inst("yujin"));
    await settle(() => s.state.players[0]!.battleArea.some((p) => p.topCard.instanceId === s.inst("yujin").instanceId));
    expect(s.state.players[0]!.battleArea.some((p) => p.topCard.instanceId === s.inst("yujin").instanceId)).toBe(true);
  });

  it("reacts to a real link by suspending, granting Vortex, and adding 3000 DP", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "P-241", as: "yujin" },
            { card: "BT21-009", as: "host" },
          ],
          hand: [{ card: "BT21-047", as: "link" }],
        },
      },
      { autoAcceptOptional: false, autoSelectCards: true },
    );
    s.state.memory = 5;
    await s.ready();
    const baseDp = s.perm("host").currentDP;
    expect(
      s.engine.applyIntent(0, {
        type: "linkCard",
        instanceId: s.inst("link").instanceId,
        targetPermanentId: s.perm("host").permanentId,
      }),
    ).toEqual({ ok: true });
    for (const accept of [true, true, false]) {
      await settle(() => s.state.pendingDecision?.kind === "optional");
      const decision = s.state.pendingDecision;
      if (decision === undefined || decision.kind !== "optional") break;
      expect(
        s.engine.applyIntent(0, {
          type: "respondDecision",
          decisionId: decision.decisionId,
          response: { kind: "optional", accept },
        }),
      ).toEqual({ ok: true });
    }
    await settle(() => s.perm("host").linked.some((card) => card.instanceId === s.inst("link").instanceId));
    expect(s.perm("yujin").isSuspended).toBe(true);
    expect(observe(s.engine).hasKeyword(s.perm("host"), "Vortex")).toBe(true);
    expect(s.perm("host").currentDP).toBe(baseDp + 5000);
  });

  it("accepts the linked-trigger App Fuse and merges a legal hand target", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "P-241", as: "yujin" },
            { card: "BT21-043", as: "host" },
          ],
          hand: [
            { card: "BT21-070", as: "link" },
            { card: "BT21-073", as: "fusion" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "linkCard",
        instanceId: s.inst("link").instanceId,
        targetPermanentId: s.perm("host").permanentId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("host").topCard.instanceId === s.inst("fusion").instanceId);

    expect(s.perm("host").topCard.cardId).toBe("BT21-073");
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("fusion").instanceId)).toBe(false);
  });
});
