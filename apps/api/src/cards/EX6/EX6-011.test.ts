import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { compiled } from "./EX6-011.js";
import "../BT1/BT1-110.js";
import "./EX6-010.js";
import "./EX6-044.js";

async function declineOpenBlock(s: ReturnType<typeof setupEngine>, previousBlockWindows: number) {
  await settle(() => s.events.filter((event) => event.kind === "blockWindowOpened").length > previousBlockWindows);
  expect(s.engine.applyIntent(0, { type: "declineBlock" })).toEqual({ ok: true });
}

describe("EX6-011 RagnaLoardmon", () => {
  it("has Blast DNA Digivolve, Raid, and Reboot", () => {
    expect(compiled.effects?.find((entry) => entry.trigger === "Counter")?.keywords?.[0]?.keyword).toBe(
      "BlastDNADigivolve",
    );
    expect(
      compiled.effects
        ?.filter((entry) => entry.trigger === "Static")
        .flatMap((entry) => entry.keywords ?? [])
        .map((keyword) => keyword.keyword),
    ).toEqual(expect.arrayContaining(["Raid", "Reboot"]));
    expect(compiled.dnaDigivolveRequirement).toEqual([
      {
        cost: 0,
        materials: [{ namesExact: ["Durandamon"] }, { namesExact: ["BryweLudramon"] }],
      },
    ]);
  });
  it("trashes security, grants protection, and gates DNA de-digivolve/delete on both triggers", () => {
    for (const trigger of ["OnPlay", "WhenDigivolving"] as const) {
      expect(compiled.effects?.find((entry) => entry.trigger === trigger)?.actions).toMatchObject([
        { kind: "SecurityManipulation", op: "trashTop", controller: "opponent", amount: 1 },
        {
          kind: "GrantStatic",
          target: { filter: { isSelfRef: true } },
          grant: "immuneToOpponentEffects",
          duration: "untilOpponentTurnEnd",
        },
        {
          kind: "DeDigivolve",
          target: { filter: { controller: "opponent", kind: ["Digimon"] }, count: "all" },
          amount: 1,
          stopAtLevel: 3,
          condition: { kind: "isDnaDigivolving" },
        },
        {
          kind: "Delete",
          target: { filter: { controller: "opponent", kind: ["Digimon"] }, count: 1 },
          condition: { kind: "isDnaDigivolving" },
        },
      ]);
    }
  });

  it("trashes the opponent's top security card when played", async () => {
    const s = setupEngine(
      {
        0: { hand: [{ card: "EX6-011", as: "ragna" }] },
        1: { security: ["BT1-009", "BT1-010"] },
      },
      { autoSelectCards: true, autoAcceptOptional: true },
    );
    s.state.memory = 10;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("ragna").instanceId })).toEqual({ ok: true });
    await settle(() =>
      s.state.players[0]!.battleArea.some((p) => p.topCard?.instanceId === s.inst("ragna").instanceId),
    );
    expect(s.state.players[1]!.security).toHaveLength(1);
    expect(s.state.players[1]!.trash).toHaveLength(1);
  });

  it("publicly DNA digivolves at Main for the printed cost 0 and resolves the DNA-only de-digivolve/delete tail", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "EX6-010", as: "durandamon" },
            { card: "EX6-044", as: "brywe" },
          ],
          hand: [{ card: "EX6-011", as: "ragna" }],
        },
        1: {
          battleArea: [
            { card: "BT1-060", as: "stacked", under: ["BT1-009"] },
            { card: "BT1-009", as: "victim" },
          ],
          security: ["BT1-009", "BT1-010"],
        },
      },
      { autoAcceptOptional: true },
    );
    s.state.memory = 0;
    await s.ready();
    const stackedPermanentId = s.perm("stacked").permanentId;
    const victimPermanentId = s.perm("victim").permanentId;
    expect(
      s.engine.applyIntent(0, {
        type: "dnaDigivolve",
        materialPermanentIds: [s.perm("durandamon").permanentId, s.perm("brywe").permanentId],
        instanceId: s.inst("ragna").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision?.kind === "chooseTargets");
    const deletion = s.state.pendingDecision!;
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: deletion.decisionId,
        response: { kind: "chooseTargets", instanceIds: [victimPermanentId] },
      }),
    ).toEqual({ ok: true });
    await settle(() =>
      s.state.players[0]!.battleArea.some((perm) => perm.topCard?.instanceId === s.inst("ragna").instanceId),
    );
    expect(s.state.players[0]!.battleArea.some((perm) => perm.topCard?.instanceId === s.inst("ragna").instanceId)).toBe(
      true,
    );
    expect(s.state.players[1]!.security).toHaveLength(1);
    expect(s.state.players[1]!.battleArea).toHaveLength(1);
    expect(s.state.players[1]!.battleArea[0]!.permanentId).toBe(stackedPermanentId);
    expect(s.state.players[1]!.battleArea[0]!.topCard?.cardId).toBe("BT1-009");
    expect(s.state.players[1]!.battleArea[0]!.stack).toHaveLength(0);
    expect(
      s.state.players[1]!.battleArea.some((perm) => perm.topCard?.instanceId === s.inst("victim").instanceId),
    ).toBe(false);
  });

  it("rejects a public DNA digivolution with the wrong named material", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "EX6-010", as: "durandamon" },
          { card: "BT1-060", as: "wrongMate" },
        ],
        hand: [{ card: "EX6-011", as: "ragna" }],
      },
    });
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "dnaDigivolve",
        materialPermanentIds: [s.perm("durandamon").permanentId, s.perm("wrongMate").permanentId],
        instanceId: s.inst("ragna").instanceId,
      }),
    ).toMatchObject({ ok: false, reason: "invalid-evolution" });
    expect(s.state.players[0]!.hand.map(({ instanceId }) => instanceId)).toContain(s.inst("ragna").instanceId);
    expect(s.state.players[0]!.battleArea.map(({ permanentId }) => permanentId)).toEqual([
      s.perm("durandamon").permanentId,
      s.perm("wrongMate").permanentId,
    ]);
  });

  it("Blast DNA digivolves from its Counter window and resolves the DNA-only effects", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX6-010", as: "durandamon" }],
          hand: [
            { card: "EX6-044", as: "brywe" },
            { card: "EX6-011", as: "ragna" },
          ],
          security: ["BT1-009", "BT1-010"],
        },
        1: {
          battleArea: [
            { card: "BT1-009", as: "attacker" },
            { card: "BT1-060", as: "stacked", under: ["BT1-009"] },
            { card: "BT1-009", as: "victim" },
          ],
          security: [{ card: "BT1-009", as: "attackerSecurityTop" }, "BT1-010"],
          deck: ["BT1-011", "BT1-012"],
        },
      },
      { autoAcceptOptional: true },
    );
    s.state.turnSeat = 1;
    s.state.memory = 3;
    await s.ready();
    const stackedPermanentId = s.perm("stacked").permanentId;
    const victimPermanentId = s.perm("victim").permanentId;

    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.events.some((event) => event.kind === "counterWindowOpened"));
    const opened = s.events.find((event) => event.kind === "counterWindowOpened");
    if (opened?.kind !== "counterWindowOpened") throw new Error("Counter window did not open");
    const eligible = opened.eligibleCounters.find((entry) => entry.instanceId === s.inst("ragna").instanceId);
    expect(eligible).toBeDefined();
    const previousBlockWindows = s.events.filter((event) => event.kind === "blockWindowOpened").length;

    expect(
      s.engine.applyIntent(0, {
        type: "respondCounter",
        sourceInstanceId: eligible!.instanceId,
        effectKey: eligible!.effectKey,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision?.kind === "chooseTargets");
    const deletion = s.state.pendingDecision!;
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: deletion.decisionId,
        response: { kind: "chooseTargets", instanceIds: [victimPermanentId] },
      }),
    ).toEqual({ ok: true });
    await declineOpenBlock(s, previousBlockWindows);
    await settle(() => !observe(s.engine).isAttacking() && s.state.pendingDecision === undefined);

    const ragna = s.state.players[0]!.battleArea.find(
      (permanent) => permanent.topCard.instanceId === s.inst("ragna").instanceId,
    );
    expect(ragna?.stack.map(({ cardId }) => cardId)).toEqual(expect.arrayContaining(["EX6-010", "EX6-044"]));
    const devolved = s.state.players[1]!.battleArea.find((permanent) => permanent.permanentId === stackedPermanentId);
    expect(devolved?.topCard.cardId).toBe("BT1-009");
    expect(devolved?.stack).toHaveLength(0);
    expect(s.state.players[1]!.battleArea.some((permanent) => permanent.permanentId === victimPermanentId)).toBe(false);
    expect(s.state.players[1]!.trash.map(({ instanceId }) => instanceId)).toContain(
      s.inst("attackerSecurityTop").instanceId,
    );
    expect(s.state.players[0]!.security).toHaveLength(1);
  });

  it("Q3707: remains unaffected by a public opponent effect with zero opponent security", async () => {
    const s = setupEngine(
      {
        0: { hand: [{ card: "EX6-011", as: "ragna" }] },
        1: {
          battleArea: ["BT1-067"],
          hand: [{ card: "BT1-110", as: "flower" }],
          security: [],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("ragna").instanceId })).toEqual({ ok: true });
    await settle(() =>
      s.state.players[0]!.battleArea.some((perm) => perm.topCard?.instanceId === s.inst("ragna").instanceId),
    );
    expect(s.state.players[1]!.security).toHaveLength(0);

    s.state.turnSeat = 1;
    s.state.memory = 2;
    expect(s.engine.applyIntent(1, { type: "playCard", instanceId: s.inst("flower").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[1]!.trash.some((card) => card.instanceId === s.inst("flower").instanceId));
    expect(s.perm("ragna").isSuspended).toBe(false);
  });

  it("publicly exposes Raid and Reboot on RagnaLoardmon", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "EX6-011", as: "ragna" }] } });
    await s.ready();
    expect(observe(s.engine).hasKeyword(s.perm("ragna"), "Raid")).toBe(true);
    expect(observe(s.engine).hasKeyword(s.perm("ragna"), "Reboot")).toBe(true);
  });
});
