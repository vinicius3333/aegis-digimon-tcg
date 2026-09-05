import { describe, expect, it } from "vitest";
import { EffectTiming } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./EX9-071.js";

describe("EX9-071", () => {
  it("explicitly declines the Delay payload without trashing sources or unsuspending", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "EX9-071", as: "protein" },
          {
            card: "EX9-007",
            as: "target",
            suspended: true,
            under: [
              { card: "BT1-009", as: "bottomOne", faceUp: false },
              { card: "BT1-048", as: "bottomTwo", faceUp: false },
            ],
          },
        ],
      },
    });
    s.perm("protein").placedByEffect = true;
    await s.ready();
    const effect = JSON.parse(s.perm("protein").activatableEffectsJson || "[]").find(
      (entry: { description?: string }) => /Delay/i.test(entry.description ?? ""),
    );
    expect(effect).toBeDefined();
    expect(
      s.engine.applyIntent(0, {
        type: "activateEffect",
        sourceInstanceId: s.inst("protein").instanceId,
        effectKey: effect.effectKey,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision?.kind === "optional");
    const decision = s.state.pendingDecision!;
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: decision.decisionId,
        response: { kind: "optional", accept: false },
      }),
    ).toEqual({ ok: true });
    await settle();
    expect(s.state.pendingDecision).toBeUndefined();
    expect(s.perm("target").isSuspended).toBe(true);
    expect(s.perm("target").stack.map((card) => card.instanceId)).toEqual([
      s.inst("bottomOne").instanceId,
      s.inst("bottomTwo").instanceId,
    ]);
    expect(s.state.players[0]!.trash.map((card) => card.cardId)).toEqual(["EX9-071"]);
    expect(s.state.players[0]!.battleArea).toHaveLength(1);
  });
  it("waives color requirements with a DM card and draws before entering the battle area", () => {
    expect(compiled.effects?.find((entry) => entry.trigger === "Static")).toMatchObject({
      actions: [{ kind: "WaiveColorRequirement", condition: { kind: "anyOf" } }],
    });
    expect(compiled.effects?.find((entry) => entry.trigger === "Main")?.actions).toEqual([
      { kind: "Draw", controller: "mine", amount: 1 },
      { kind: "PlaceInBattleAreaSelf" },
    ]);
  });
  it("has Delay to unsuspend a selected DM Digimon by trashing its bottom two face-down cards", () =>
    expect(
      compiled.effects?.find(
        (entry) => entry.trigger === "Main" && entry.keywords?.some((keyword) => keyword.keyword === "Delay"),
      ),
    ).toMatchObject({ actions: [{ kind: "Unsuspend", cost: { kind: "trash", target: { count: 2 } } }] }));
  it("gains memory and enters the battle area from security", () =>
    expect(compiled.effects?.find((entry) => entry.trigger === "Security")).toMatchObject({
      isSecurity: true,
      actions: [{ kind: "GainMemory", amount: 1 }, { kind: "PlaceInBattleAreaSelf" }],
    }));

  it("unsuspends a DM Digimon only after trashing both bottom two face-down cards", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "EX9-071", as: "protein" },
            {
              card: "EX9-007",
              as: "target",
              suspended: true,
              under: [
                { card: "EX9-007", as: "bottomOne" },
                { card: "EX9-007", as: "bottomTwo" },
              ],
            },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    for (const card of s.perm("target").stack) card.faceUp = false;
    expect(s.perm("target").stack).toHaveLength(2);
    expect(s.perm("target").stack.every((card) => card.faceUp !== true)).toBe(true);
    await s.ready();

    const effect = JSON.parse(s.perm("protein").activatableEffectsJson || "[]").find(
      (entry: { effectKey: string; description?: string }) => /Delay/i.test(entry.description ?? ""),
    );
    expect(effect).toBeDefined();
    expect(
      s.engine.applyIntent(0, {
        type: "activateEffect",
        sourceInstanceId: s.perm("protein").topCard.instanceId,
        effectKey: effect.effectKey,
      }),
    ).toEqual({ ok: true });

    await settle(() => !s.perm("target").isSuspended, 300);
    expect(s.state.players[0]!.trash.map((card) => card.cardId)).toEqual(
      expect.arrayContaining(["EX9-071", "EX9-007"]),
    );
    expect(s.perm("target").isSuspended).toBe(false);
    expect(s.perm("target").stack).toHaveLength(0);
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toEqual(
      expect.arrayContaining([s.inst("bottomOne").instanceId, s.inst("bottomTwo").instanceId]),
    );
    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.cardId === "EX9-071")).toBe(false);
  });

  it("does not pay the Delay cost when only one eligible face-down card exists", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "EX9-071", as: "protein" },
            { card: "EX9-007", as: "target", suspended: true, under: [{ card: "EX9-007", as: "onlyCard" }] },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.perm("target").stack[0]!.faceUp = false;
    await s.ready();

    const effect = JSON.parse(s.perm("protein").activatableEffectsJson || "[]").find(
      (entry: { effectKey: string }) => entry.effectKey === "EX9-071/ir-27-0",
    );
    expect(effect).toBeUndefined();
    await settle(() => false, 20);

    expect(s.perm("target").isSuspended).toBe(true);
    expect(s.perm("target").stack).toHaveLength(1);
    expect(s.state.players[0]!.trash).toHaveLength(0);
    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.cardId === "EX9-071")).toBe(true);
  });
  it("draws one and enters the battle area when played from hand", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX9-007", as: "dm" }],
          hand: [{ card: "EX9-071", as: "protein" }],
          deck: [{ card: "BT1-009", as: "drawn" }],
        },
      },
      { autoAcceptOptional: true, autoDeclineOptional: true, autoSelectCards: true, autoOrderTriggers: true },
    );
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("protein").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.cardId === "EX9-071"));

    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("drawn").instanceId)).toBe(true);
    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.cardId === "EX9-071")).toBe(true);
  });
  it("gains one memory and enters the battle area from security", async () => {
    const s = setupEngine(
      { 0: { security: [{ card: "EX9-071", as: "protein" }] } },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.inst("protein").faceUp = true;
    const before = s.state.memory;

    await advance(s.engine).fireForInstance(EffectTiming.SecuritySkill, s.inst("protein"));
    await settle(() => s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.cardId === "EX9-071"));

    expect(s.state.memory).toBe(before + 1);
    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.cardId === "EX9-071")).toBe(true);
    expect(s.state.players[0]!.security.some((card) => card.cardId === "EX9-071")).toBe(false);
  });
});
