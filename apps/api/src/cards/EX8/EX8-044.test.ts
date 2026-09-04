import { describe, expect, it } from "vitest";
import { PlayerState } from "@aegis/shared";
import { settle, setupEngine } from "../../engine/testkit/harness.js";
import { advance } from "../../engine/testkit/advance.js";
import { observe } from "../../engine/testkit/observe.js";
import { compiled } from "./EX8-044.js";

describe("EX8-044", () => {
  it("has Blast Digivolve and may suspend up to 3 Digimon, gaining memory for suspended opposing Digimon", () => {
    expect(compiled.effects?.find((entry) => entry.trigger === "Counter")?.keywords?.[0]).toMatchObject({
      keyword: "BlastDigivolve",
    });
    expect(compiled.effects?.find((entry) => entry.trigger === "OnPlay")?.actions).toMatchObject([
      { kind: "Suspend", optional: true, target: { count: 3, upTo: true } },
      { kind: "GainMemory", amount: 1, scaling: { per: 1 } },
    ]);
  });
  it("applies an All Turns once-per-turn effect when suspended that grants Piercing and +3000 DP", () =>
    expect(compiled.effects?.find((entry) => entry.trigger === "AllTurns")?.actions[0]).toMatchObject({
      kind: "SubTrigger",
      event: "whenSuspended",
      actions: [
        { kind: "SelectBind", target: { bindAs: "suspensionBuffTarget" } },
        {
          kind: "GainKeyword",
          keyword: { keyword: "Piercing" },
          target: { filter: { boundRef: "suspensionBuffTarget" } },
        },
        { kind: "ModifyDP", amount: 3000, target: { filter: { boundRef: "suspensionBuffTarget" } } },
      ],
    }));

  it("gains memory only for the opposing Digimon newly suspended by this effect", async () => {
    const s = setupEngine(
      {
        0: { hand: [{ card: "EX8-044", as: "hercules" }] },
        1: {
          battleArea: [
            { card: "EX8-043", as: "alreadySuspended", suspended: true },
            { card: "EX8-043", as: "freshOpponent" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const player = s.state.players[0] as PlayerState;
    s.state.memory = 10;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("hercules").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => player.battleArea.some((p) => p.topCard?.cardId === "EX8-044") && s.state.memory === 5);

    expect(s.state.memory).toBe(5); // 10 - 6 play cost + 1 newly suspended opponent.
    expect(s.perm("alreadySuspended").isSuspended).toBe(true);
    expect(s.perm("freshOpponent").isSuspended).toBe(true);
  });
  it("evolves from off-color NSp, suspends an opposing Digimon and gains memory", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX7-022", as: "host" }],
          hand: [{ card: "EX8-044", as: "hercules" }],
          deck: ["BT1-045"],
        },
        1: { battleArea: [{ card: "EX8-043", as: "opponent" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("host").permanentId,
        instanceId: s.inst("hercules").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("opponent").isSuspended);
    expect(s.perm("opponent").isSuspended).toBe(true);
    expect(s.state.memory).toBe(8); // 10 - 3 digivolution cost + 1 suspended opponent.
    expect(s.perm("host").topCard.cardId).toBe("EX8-044");
    expect(s.perm("host").stack.map((card) => card.cardId)).toContain("EX7-022");
    expect(s.state.players[0]!.hand.map((card) => card.cardId)).toEqual(["BT1-045"]);
  });

  it("rejects an off-color level-5 Digimon without NSp", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT1-020", as: "host" }], hand: [{ card: "EX8-044", as: "hercules" }] },
    });
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("host").permanentId,
        instanceId: s.inst("hercules").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: false, reason: "invalid-evolution" });
  });

  it("does not suspend or gain memory when the optional On Play effect is declined", async () => {
    const s = setupEngine(
      { 0: { hand: [{ card: "EX8-044", as: "hercules" }] }, 1: { battleArea: [{ card: "EX8-043", as: "opponent" }] } },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("hercules").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.battleArea.some((p) => p.topCard?.cardId === "EX8-044"));
    expect(s.perm("opponent").isSuspended).toBe(false);
    expect(s.state.memory).toBe(4);
  });
  it("grants Piercing and +3000 DP when it becomes suspended", async () => {
    const preferInstanceIds: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "EX8-044", as: "hercules" },
            { card: "AD1-001", as: "ally" },
          ],
        },
        1: { battleArea: [{ card: "AD1-001", as: "target", dp: 1000, suspended: true }], security: ["AD1-001"] },
      },
      { autoSelectCards: true, preferInstanceIds },
    );
    preferInstanceIds.push(s.perm("ally").permanentId);
    await advance(s.engine).verb.suspend([s.perm("hercules").permanentId]);
    await settle(() => observe(s.engine).hasPierce(s.perm("ally")));
    expect(observe(s.engine).hasPierce(s.perm("ally"))).toBe(true);
    expect(s.perm("ally").currentDP).toBe(8000);
    expect(observe(s.engine).hasPierce(s.perm("hercules"))).toBe(false);
    expect(s.perm("hercules").currentDP).toBe(11000);

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("ally").permanentId,
        target: { kind: "permanent", permanentId: s.perm("target").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.battleArea.length === 0 && s.state.players[1]!.security.length === 0);
    expect(s.state.players[1]!.battleArea).toHaveLength(0);
    expect(s.state.players[1]!.security).toHaveLength(0);
  });

  it("does not repeat the All Turns suspension grant in the same turn", async () => {
    const preferInstanceIds: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "EX8-044", as: "hercules" },
            { card: "AD1-001", as: "ally" },
          ],
        },
      },
      { autoSelectCards: true, preferInstanceIds },
    );
    preferInstanceIds.push(s.perm("ally").permanentId);
    await s.ready();
    await advance(s.engine).verb.suspend([s.perm("hercules").permanentId]);
    await settle(() => observe(s.engine).hasPierce(s.perm("ally")));
    await advance(s.engine).verb.unsuspend([s.perm("hercules").permanentId]);
    await advance(s.engine).verb.suspend([s.perm("hercules").permanentId]);
    expect(s.perm("ally").currentDP).toBe(8000);
  });

  it("Blast Digivolves from hand and resolves When Digivolving without paying memory", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT1-009", as: "attacker" },
            { card: "BT1-010", as: "other" },
          ],
          security: ["BT1-001"],
        },
        1: {
          battleArea: [{ card: "EX8-042", as: "base" }],
          hand: [{ card: "EX8-044", as: "hercules" }],
          deck: ["BT1-001"],
          security: ["BT1-001"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.turnSeat = 0;
    s.state.memory = 0;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.events.some((event) => event.kind === "counterWindowOpened"));
    const opened = s.events.find((event) => event.kind === "counterWindowOpened");
    if (opened?.kind !== "counterWindowOpened") throw new Error("counter window did not open");
    const eligible = opened.eligibleCounters.find((entry) => entry.instanceId === s.inst("hercules").instanceId);
    expect(eligible).toBeDefined();

    expect(
      s.engine.applyIntent(1, {
        type: "respondCounter",
        sourceInstanceId: eligible!.instanceId,
        effectKey: eligible!.effectKey,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard?.cardId === "EX8-044");

    expect(s.perm("base").topCard?.cardId).toBe("EX8-044");
    expect(s.perm("attacker").isSuspended).toBe(true);
    expect(s.perm("other").isSuspended).toBe(true);
    expect(s.state.memory).toBe(-1); // seat 1 gains one memory for suspending seat 0's other Digimon.
  });

  it("suspends an own Digimon without counting it for opposing-Digimon memory", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "EX8-044", as: "hercules" }],
          battleArea: [{ card: "AD1-001", as: "ownAlly" }],
        },
        1: { battleArea: [{ card: "EX8-043", as: "opponent" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("hercules").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.perm("ownAlly").isSuspended && s.perm("opponent").isSuspended);

    expect(s.perm("ownAlly").isSuspended).toBe(true);
    expect(s.perm("opponent").isSuspended).toBe(true);
    expect(s.state.memory).toBe(5); // 10 - 6 play cost + 1 for only the opposing suspension.
  });

  it("keeps its suspension buff through its turn and expires it at the opponent turn end", async () => {
    const preferInstanceIds: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "EX8-044", as: "hercules" },
            { card: "AD1-001", as: "ally" },
          ],
          deck: ["BT1-001"],
        },
        1: { deck: ["BT1-001"] },
      },
      { autoSelectCards: true, preferInstanceIds },
    );
    preferInstanceIds.push(s.perm("ally").permanentId);
    await s.ready();
    await advance(s.engine).verb.suspend([s.perm("hercules").permanentId]);
    expect(observe(s.engine).hasPierce(s.perm("ally"))).toBe(true);
    expect(s.perm("ally").currentDP).toBe(8000);

    await advance(s.engine).runTurn(0);
    expect(observe(s.engine).hasPierce(s.perm("ally"))).toBe(true);
    expect(s.perm("ally").currentDP).toBe(8000);

    s.state.turnSeat = 1;
    s.state.memory = -s.state.memory;
    await advance(s.engine).runTurn(1);
    expect(observe(s.engine).hasPierce(s.perm("ally"))).toBe(false);
    expect(s.perm("ally").currentDP).toBe(5000);
  });
});
