import { digivolutionRequirementsFor, getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { hasRegisteredCompiledCard } from "../../engine/effects/interpreter.js";
import { compiled } from "./EX7-029.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { advance } from "../../engine/testkit/advance.js";
import { observe } from "../../engine/testkit/observe.js";
import "../index.js";

async function stopLoop(s: ReturnType<typeof setupEngine>, loop: Promise<void>, seat: 0 | 1): Promise<void> {
  if (!s.state.gameOver && !s.engine.applyIntent(seat, { type: "surrender" }).ok) {
    throw new Error("failed to stop the turn loop");
  }
  await loop;
}

describe("EX7-029", () => {
  it("matches the catalog, ACE metadata, evolution routes, complete IR, and exclusive registration", () => {
    expect(getCardDefinition("EX7-029")).toMatchObject({
      cardId: "EX7-029",
      nameEn: "SaberLeomon",
      colors: ["Yellow", "Green"],
      kinds: ["Digimon"],
      level: 6,
      playCost: 7,
      dp: 12000,
      evoCosts: [
        { color: "Yellow", level: 5, memoryCost: 4 },
        { color: "Green", level: 5, memoryCost: 4 },
      ],
      forms: ["Mega"],
      attributes: ["Data"],
      types: ["Ancient Animal", "NSp"],
      isAce: true,
      overflowMemory: 4,
    });
    expect(getCardDefinition("EX7-029")?.effectText).toBe(
      "[Digivolve]Lv.5 w/[NSp]\u00a0trait or Lv.5 w/[Leomon]\u00a0in its name: Cost 3 \n\n" +
        "[Hand] [Counter] ＜Blast Digivolve＞ \n" +
        "[On Play] [When Digivolving] 2 of your opponent's suspended Digimon get -8000 DP until the end of your turn.\n" +
        "[When Digivolving] [When Attacking] [Once Per Turn] Suspend 1 of your opponent's Digimon. Then, if your opponent has no unsuspended Digimon, unsuspend this Digimon.",
    );
    expect(digivolutionRequirementsFor("EX7-029")).toEqual([
      { level: 5, traits: ["NSp"], cost: 3, isAlternate: true },
      { level: 5, names: ["Leomon"], cost: 3, isAlternate: true },
    ]);
    expect(compiled).toMatchObject({ coverage: "full", residual: [] });
    expect(hasRegisteredCompiledCard("EX7-029")).toBe(true);

    const counter = compiled.effects?.find((entry) => entry.trigger === "Counter");
    expect(counter).toMatchObject({
      isFromHand: true,
      actions: [],
      keywords: [{ keyword: "BlastDigivolve", raw: "＜Blast Digivolve＞" }],
    });
    expect(compiled.effects?.find((entry) => entry.trigger === "Counter")?.keywords?.[0]).toMatchObject({
      keyword: "BlastDigivolve",
    });
    for (const trigger of ["OnPlay", "WhenDigivolving"] as const) {
      const actions = compiled.effects?.find((entry) => entry.trigger === trigger)?.actions ?? [];
      const modifyDp = actions.filter((action) => action.kind === "ModifyDP");
      expect(modifyDp).toHaveLength(1);
      expect(modifyDp[0]).toMatchObject({
        kind: "ModifyDP",
        amount: -8000,
        duration: "untilYourTurnEnd",
        target: { count: 2, filter: { suspended: true } },
      });
    }
    const shared = compiled.effects?.filter((entry) => entry.sharedUseKey === "ir-shared-0");
    expect(shared).toHaveLength(2);
    expect(shared?.map((entry) => entry.trigger)).toEqual(["WhenDigivolving", "WhenAttacking"]);
    expect(shared?.every((entry) => entry.frequency === "OncePerTurn")).toBe(true);
  });
  it("suspends an opposing Digimon and unsuspends itself when no opposing Digimon remain unsuspended", () =>
    expect(compiled.effects?.find((entry) => entry.trigger === "WhenAttacking")?.actions).toMatchObject([
      { kind: "Suspend" },
      { kind: "Unsuspend", condition: { kind: "opponentHasNone" } },
    ]));

  it("publicly played DP reductions persist until own turn end", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          hand: [
            { card: "EX7-029", as: "saber" },
            { card: "BT1-009", as: "followUp" },
          ],
          deck: ["BT1-009"],
        },
        1: {
          battleArea: [
            { card: "BT1-009", as: "first", suspended: true, dp: 12000 },
            { card: "BT1-009", as: "second", suspended: true, dp: 13000 },
            { card: "BT1-009", as: "third", suspended: true, dp: 14000 },
            { card: "BT1-009", as: "unsuspended", dp: 3000 },
          ],
          deck: ["BT1-009"],
        },
      },
      { autoSelectCards: true, preferInstanceIds: preferred },
    );
    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    preferred.push(s.perm("first").topCard!.instanceId, s.perm("second").topCard!.instanceId);
    s.state.memory = 10;
    expect(s.perm("first").permanentId).not.toBe(s.perm("second").permanentId);
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("saber").instanceId })).toEqual({ ok: true });
    await settle(() => s.perm("first").currentDP === 4000 && s.perm("second").currentDP === 5000);

    expect(s.perm("first").currentDP).toBe(4000);
    expect(s.perm("second").currentDP).toBe(5000);
    expect(s.perm("third").currentDP).toBe(14000);
    expect(s.perm("unsuspended").currentDP).toBe(3000);
    expect(s.state.memory).toBe(3);

    expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
    await advance(s.engine).waitForMainPhase(1);
    expect(s.perm("first").currentDP).toBe(12000);
    expect(s.perm("second").currentDP).toBe(13000);
    expect(s.perm("third").currentDP).toBe(14000);
    await stopLoop(s, loop, 1);
  });

  it("publicly alternate-digivolves from an NSp level 5, pays 3, draws, reduces two, and unsuspends after the final suspend", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX7-022", as: "source", suspended: true, under: ["BT1-009"] }],
          hand: [{ card: "EX7-029", as: "saber" }],
          deck: [{ card: "BT1-011", as: "drawn" }, "BT1-012"],
        },
        1: {
          battleArea: [
            { card: "BT1-009", as: "unsuspended", dp: 3000 },
            { card: "BT1-009", as: "first", suspended: true, dp: 12000 },
            { card: "BT1-009", as: "second", suspended: true, dp: 13000 },
            { card: "BT1-009", as: "fresh", dp: 3000 },
          ],
          deck: ["BT1-013"],
          security: ["BT1-013", "BT1-014"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferred },
    );
    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    preferred.push(s.perm("unsuspended").topCard!.instanceId);
    s.state.memory = 3;
    const sourceId = s.perm("source").topCard!.instanceId;
    const existingUnderIds = s.perm("source").stack.map((card) => card.instanceId);
    const saberId = s.inst("saber").instanceId;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("source").permanentId,
        instanceId: saberId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("source").topCard?.instanceId === saberId && !s.perm("source").isSuspended);

    expect(s.state.memory).toBe(0);
    expect(s.perm("source").stack.map((card) => card.instanceId)).toEqual([...existingUnderIds, sourceId]);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toEqual([s.inst("drawn").instanceId]);
    expect(s.perm("source").topCard?.cardId).toBe("EX7-029");
    expect(s.perm("source").isSuspended).toBe(false);
    expect(s.perm("unsuspended").isSuspended).toBe(true);
    expect(s.perm("first").currentDP).toBe(4000);
    expect(s.perm("second").currentDP).toBe(5000);

    // The same [Once Per Turn] identity is shared with [When Attacking]. A second
    // initially unsuspended target was seeded before ready; the public attack must not fire the clause again.
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("source").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => !observe(s.engine).isAttacking());
    expect(s.perm("fresh").isSuspended).toBe(false);
    expect(s.perm("source").isSuspended).toBe(true);
    await stopLoop(s, loop, 0);
  });

  it("Blast Digivolves from hand onto an NSp level 5 Digimon without paying memory", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT1-009", as: "attacker", dp: 3000 }] },
        1: {
          battleArea: [{ card: "EX7-035", as: "base" }],
          hand: [{ card: "EX7-029", as: "saber" }],
          security: ["BT1-009"],
        },
      },
      { autoSelectCards: true },
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
    const eligible = opened.eligibleCounters.find((entry) => entry.instanceId === s.inst("saber").instanceId);
    expect(eligible).toBeDefined();

    expect(
      s.engine.applyIntent(1, {
        type: "respondCounter",
        sourceInstanceId: eligible!.instanceId,
        effectKey: eligible!.effectKey,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard?.cardId === "EX7-029");

    expect(s.perm("base").topCard?.cardId).toBe("EX7-029");
    expect(s.state.memory).toBe(0);
  });

  it("alternate-digivolves from a non-NSp Leomon level 5 for 3 with exact draw and stack", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT1-042", as: "leomon" }],
        hand: [{ card: "EX7-029", as: "saber" }],
        deck: [{ card: "BT1-011", as: "drawn" }],
      },
    });
    s.state.memory = 5;
    await s.ready();
    const baseId = s.inst("leomon").instanceId;
    const saberId = s.inst("saber").instanceId;
    const drawnId = s.inst("drawn").instanceId;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("leomon").permanentId,
        instanceId: saberId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("leomon").topCard.instanceId === saberId);
    expect(s.state.memory).toBe(2);
    expect(s.perm("leomon").stack.map((card) => card.instanceId)).toEqual([baseId]);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toEqual([drawnId]);
  });

  it("rejects a wrong-color non-NSp non-Leomon level 5 without mutation", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "AD1-002", as: "base" }],
        hand: [{ card: "EX7-029", as: "saber" }],
        deck: [{ card: "BT1-011", as: "drawn" }],
      },
    });
    s.state.memory = 5;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("saber").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: false, reason: "invalid-evolution" });
    expect(s.state.memory).toBe(5);
    expect(s.perm("base").topCard.cardId).toBe("AD1-002");
    expect(s.perm("base").stack).toHaveLength(0);
    expect(s.state.players[0]!.deck[0]!.instanceId).toBe(s.inst("drawn").instanceId);
  });

  it("pays Overflow 4 when the ACE leaves in a public battle", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "EX7-029", as: "saber", dp: 12000, under: ["BT1-042"] }] },
        1: { battleArea: [{ card: "BT1-014", as: "wall", dp: 20000, suspended: true }] },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 3;
    await s.ready();
    const aceId = s.inst("saber").instanceId;
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("saber").permanentId,
        target: { kind: "permanent", permanentId: s.perm("wall").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.trash.some((card) => card.instanceId === aceId));
    expect(s.state.memory).toBe(-1);
  });

  it("suspends the only opposing Digimon and unsuspends itself when attacking it", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "EX7-029", as: "saber", dp: 7000 }] },
        1: { battleArea: [{ card: "BT1-009", as: "target", dp: 3000, suspended: true }] },
      },
      { autoSelectCards: true },
    );
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("saber").permanentId,
        target: { kind: "permanent", permanentId: s.perm("target").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => !s.perm("saber").isSuspended && s.state.players[1]!.battleArea.length === 0);

    expect(s.perm("saber").isSuspended).toBe(false);
    expect(s.state.players[1]!.battleArea).toHaveLength(0);
  });
});
