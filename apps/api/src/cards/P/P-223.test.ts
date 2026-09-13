import { describe, expect, it } from "vitest";
import { runtimeCompiledCard, universalNameAliasesFor } from "../../engine/effects/interpreter.js";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./P-223.js";
import "../ST22/ST22-10.js";

describe("P-223 Kuzuhamon", () => {
  it("reduces play cost by 4 with three or fewer security cards", () => {
    expect(runtimeCompiledCard("P-223")!.effects.find((effect) => effect.trigger === "BeforePayCost")).toMatchObject({
      actions: [
        {
          kind: "CostModifier",
          costType: "play",
          mode: "reduce",
          amount: 4,
          handResident: true,
          target: { count: 1, isSelf: true },
          condition: { kind: "zoneCount", seat: "mine", zone: "security", op: "lte", value: 3 },
        },
      ],
    });
  });

  it("uses one matching Onmyōjutsu or Plug-In Option from hand or trash", () => {
    const card = runtimeCompiledCard("P-223")!;
    for (const trigger of ["OnPlay", "WhenDigivolving"] as const) {
      expect(card.effects.find((effect) => effect.trigger === trigger)).toMatchObject({
        actions: [
          {
            kind: "UseOptionWithoutCost",
            filter: {
              kind: ["Option"],
              playCostLte: 99,
              nameOrTrait: [{ tokens: ["Onmyōjutsu", "Plug-In"], match: "trait" }],
            },
            from: ["hand", "trash"],
            payCost: false,
            optional: true,
          },
        ],
      });
    }
  });

  it("grants the printed Sakuyamon rule name", () => {
    expect(universalNameAliasesFor("P-223")).toContain("Sakuyamon");
    expect(runtimeCompiledCard("P-223")!.effects).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          trigger: "Rule",
          actions: [expect.objectContaining({ kind: "GrantStatic", grant: "name", tokens: ["Sakuyamon"] })],
        }),
      ]),
    );
  });

  it("once per turn may play a Pipe Fox Token after a genuine Option use", () => {
    expect(runtimeCompiledCard("P-223")!.effects.find((effect) => effect.trigger === "AllTurns")).toMatchObject({
      frequency: "OncePerTurn",
      actions: [
        {
          kind: "SubTrigger",
          event: "whenOptionUsed",
          sourceFilter: { controller: "mine", kind: ["Option"] },
          actions: [{ kind: "PlayToken", tokens: ["Pipe Fox"], count: 1, payCost: false, optional: true }],
        },
      ],
    });
  });
});

describe("P-223 engine behavior", () => {
  it("uses a cost-6 Onmyōjutsu Option from hand without paying its cost", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [
            { card: "P-223", as: "kuzuhamon" },
            { card: "ST22-10", as: "onmyojutsu" },
          ],
          battleArea: [
            { card: "P-016", as: "purple" },
            { card: "BT1-063", as: "yellow" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true },
    );
    s.state.memory = 10;
    await s.ready();
    const optionId = s.inst("onmyojutsu").instanceId;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("kuzuhamon").instanceId })).toEqual({
      ok: true,
    });
    await settle();
    expect(s.state.memory).toBe(3);
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === optionId)).toBe(false);
    expect(s.state.players[0]!.security.some((card) => card.instanceId === optionId && card.faceUp)).toBe(true);
    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.cardId.includes("TOKEN"))).toBe(true);
  });

  it("allows refusing the optional cost-6 Option use", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [
            { card: "P-223", as: "kuzuhamon" },
            { card: "ST22-10", as: "onmyojutsu" },
          ],
          battleArea: [
            { card: "P-016", as: "purple" },
            { card: "BT1-063", as: "yellow" },
          ],
        },
      },
      { autoDeclineOptional: true },
    );
    s.state.memory = 10;
    await s.ready();
    const optionId = s.inst("onmyojutsu").instanceId;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("kuzuhamon").instanceId })).toEqual({
      ok: true,
    });
    await settle();
    expect(s.state.memory).toBe(3);
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === optionId)).toBe(true);
  });

  it("uses the same resident source once per turn and resets after the natural turn handoff", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [
            { card: "P-223", as: "kuzuhamon" },
            { card: "ST22-10", as: "firstOption" },
            { card: "ST22-10", as: "secondOption" },
            { card: "ST22-10", as: "thirdOption" },
          ],
          battleArea: [
            { card: "BT1-029", as: "blueDigimon" },
            { card: "BT1-085", as: "tamer" },
          ],
          deck: Array.from({ length: 20 }, () => "BT3-059"),
          security: [{ card: "BT3-059" }, { card: "BT3-059" }, { card: "BT3-059" }],
        },
        1: {
          deck: Array.from({ length: 20 }, () => "BT3-059"),
          security: Array.from({ length: 5 }, () => "BT3-059"),
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true },
    );
    const sourceId = s.inst("kuzuhamon").instanceId;
    const firstOptionId = s.inst("firstOption").instanceId;
    const secondOptionId = s.inst("secondOption").instanceId;
    const thirdOptionId = s.inst("thirdOption").instanceId;
    const pipeFoxes = () =>
      s.state.players[0]!.battleArea.filter((permanent) => permanent.topCard.cardId === "TOKEN-Pipe-Fox");
    s.state.memory = 10;
    await s.ready();
    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: sourceId })).toEqual({ ok: true });
    await settle(
      () =>
        pipeFoxes().length === 1 &&
        s.state.players[0]!.security.some((card) => card.instanceId === firstOptionId && card.faceUp) &&
        s.state.pendingDecision === undefined,
    );
    const sourcePermanentId = s.perm("kuzuhamon").permanentId;
    expect(s.perm("kuzuhamon").permanentId).toBe(sourcePermanentId);

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: secondOptionId })).toEqual({ ok: true });
    await settle();
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === secondOptionId)).toBe(false);
    expect(s.state.players[0]!.security.some((card) => card.instanceId === secondOptionId && card.faceUp)).toBe(true);
    expect(pipeFoxes()).toHaveLength(1);
    expect(s.perm("kuzuhamon").permanentId).toBe(sourcePermanentId);

    advance(s.engine).endMainPhaseIfOpen(0);
    await advance(s.engine).waitForMainPhase(1);
    advance(s.engine).endMainPhaseIfOpen(1);
    await advance(s.engine).waitForMainPhase(0);
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: thirdOptionId })).toEqual({ ok: true });
    await settle(
      () =>
        pipeFoxes().length === 2 &&
        !s.state.players[0]!.hand.some((card) => card.instanceId === thirdOptionId) &&
        s.state.players[0]!.security.some((card) => card.instanceId === thirdOptionId && card.faceUp) &&
        s.state.pendingDecision === undefined,
    );
    expect(s.perm("kuzuhamon").permanentId).toBe(sourcePermanentId);
    expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });
});
