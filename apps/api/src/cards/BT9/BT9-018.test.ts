import { EffectDuration, getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { compiled } from "./BT9-018.js";

describe("BT9-018 Dinorexmon", () => {
  it("matches the catalog and executable clause structure", () => {
    expect(getCardDefinition("BT9-018")).toMatchObject({
      nameEn: "Dinorexmon",
      colors: ["Red", "Green"],
      kinds: ["Digimon"],
      level: 6,
      playCost: 13,
      dp: 13000,
      evoCosts: [
        { color: "Red", level: 5, memoryCost: 5 },
        { color: "Green", level: 5, memoryCost: 5 },
      ],
      forms: ["Mega"],
      attributes: ["Data"],
      types: ["Dinosaur", "X Antibody"],
    });
    expect(compiled).toMatchObject({
      effects: [
        {
          trigger: "WhenDigivolving",
          actions: [
            { kind: "Suspend", target: { count: 1 }, scaling: { filter: { kind: ["Tamer"] } } },
            { kind: "GainMemory", amount: 1, scaling: { filter: { kind: ["Tamer"] } } },
          ],
        },
        {
          trigger: "AllTurns",
          frequency: "OncePerTurn",
          actions: [
            {
              kind: "SubTrigger",
              event: "whenSuspended",
              sourceFilter: { controller: "opponent", kind: ["Digimon"], dp: { op: "lte", value: 6000 } },
              actions: [
                {
                  kind: "Delete",
                  optional: true,
                  preserveOncePerTurnOnDecline: true,
                  target: { sourceRef: "triggerSubject", count: "all" },
                },
              ],
            },
          ],
        },
      ],
      coverage: "full",
      residual: [],
    });
  });

  it.each([
    ["red", "BT1-021"],
    ["green", "BT1-075"],
  ])("pays exactly 5 memory on the legal %s level-5 evolution route", async (_color, base) => {
    const s = setupEngine({
      0: { battleArea: [{ card: base, as: "base" }], hand: [{ card: "BT9-018", as: "evolving" }] },
    });
    s.state.memory = 5;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("evolving").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard.instanceId === s.inst("evolving").instanceId);
    expect(s.state.memory).toBe(0);
  });

  it("suspends 1 opposing Digimon per Tamer and gains 1 memory per Tamer (Q1816)", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "AD1-002", as: "base" }], hand: [{ card: "BT9-018", as: "evolving" }] },
        1: {
          battleArea: [
            { card: "BT1-015", as: "first", dp: 7000 },
            { card: "BT1-016", as: "second", dp: 7000 },
            "BT1-085",
            "BT1-086",
          ],
        },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 10;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("evolving").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.memory === 7);
    expect(s.state.players[1]!.battleArea.filter((permanent) => permanent.isSuspended)).toHaveLength(2);
    expect(s.state.memory).toBe(7);
  });

  it("gains for every Tamer even when only 1 opposing Digimon can be suspended (Q1817)", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "AD1-002", as: "base" }], hand: [{ card: "BT9-018", as: "evolving" }] },
        1: { battleArea: [{ card: "BT1-015", as: "onlyDigimon" }, "BT1-085", "BT1-086"] },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 10;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("evolving").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.memory === 7);
    expect(s.perm("onlyDigimon").isSuspended).toBe(true);
    expect(s.state.memory).toBe(7);
  });

  it("declining the optional deletion does not consume Once Per Turn (Q1818)", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT9-018", as: "dino" }] },
      1: {
        battleArea: [
          { card: "BT1-028", as: "first" },
          { card: "BT1-031", as: "second" },
        ],
      },
    });
    await s.ready();
    const firstId = s.perm("first").permanentId;

    const firstSuspension = advance(s.engine).verb.suspend([firstId], 1);
    await settle(() => s.state.pendingDecision?.kind === "optional");
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: s.state.pendingDecision!.decisionId,
        response: { kind: "optional", accept: false },
      }),
    ).toEqual({ ok: true });
    await firstSuspension;
    expect(s.state.players[1]!.battleArea).toHaveLength(2);

    const secondSuspension = advance(s.engine).verb.suspend([s.perm("second").permanentId], 1);
    await settle(() => s.state.pendingDecision?.kind === "optional");
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: s.state.pendingDecision!.decisionId,
        response: { kind: "optional", accept: true },
      }),
    ).toEqual({ ok: true });
    await secondSuspension;
    expect(s.state.players[1]!.battleArea.map((p) => p.permanentId)).toEqual([firstId]);
  });

  it("deletes every eligible Digimon suspended simultaneously in one activation (Q1820)", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT9-018", as: "dino" }] },
        1: {
          battleArea: [
            { card: "BT1-028", as: "first" },
            { card: "BT1-031", as: "second" },
          ],
        },
      },
      { autoAcceptOptional: true },
    );
    await s.ready();
    await advance(s.engine).verb.suspend([s.perm("first").permanentId, s.perm("second").permanentId], 1);
    expect(s.state.players[1]!.battleArea).toHaveLength(0);
  });

  it("keeps activation-time eligibility when the suspended Digimon rises above 6000 DP (Q4287)", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT9-018", as: "dino" }] },
      1: { battleArea: [{ card: "BT1-028", as: "target" }] },
    });
    await s.ready();
    const targetId = s.perm("target").permanentId;
    const activation = advance(s.engine).verb.suspend([targetId], 1);
    await settle(() => s.state.pendingDecision?.kind === "optional");
    await advance(s.engine).verb.modifyDP(targetId, 4000, EffectDuration.UntilEachTurnEnd);
    expect(s.perm("target").currentDP).toBeGreaterThan(6000);
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: s.state.pendingDecision!.decisionId,
        response: { kind: "optional", accept: true },
      }),
    ).toEqual({ ok: true });
    await activation;
    expect(s.state.players[1]!.battleArea).toHaveLength(0);
  });

  it("deletes a 6000-DP Blocker before battle, so no battle occurs (Q1819)", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT9-018", as: "dino" },
            { card: "BT1-010", dp: 9000, as: "attacker" },
          ],
        },
        1: { battleArea: [{ card: "BT1-072", as: "blocker" }], security: ["BT1-001"] },
      },
      { autoAcceptOptional: true },
    );
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => observe(s.engine).blockingSeat() === 1);
    expect(
      s.engine.applyIntent(1, { type: "declareBlock", blockerPermanentId: s.perm("blocker").permanentId }),
    ).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[1]!.battleArea.length === 0);
    expect(s.events.some((event) => event.kind === "combatResolved")).toBe(false);
    expect(s.state.players[1]!.security).toHaveLength(1);
  });
});
