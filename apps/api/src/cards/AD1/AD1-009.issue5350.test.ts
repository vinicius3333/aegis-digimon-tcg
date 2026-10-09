import { EffectDuration, type Seat, type ServerEvent } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import "../index.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { advance } from "../../engine/testkit/advance.js";
import { observe } from "../../engine/testkit/observe.js";

// Match 3f6c4bdb-212b-4405-8c3d-b53a3e889a95: Assembly was declared
// egg first, then levels 3–6. CR 7-3-2-6 permits that counted-recipe order.
const assemblyOrder = ["BT26-001", "BT26-009", "BT26-011", "BT26-015", "BT26-016"];
const sourcesBottomFirst = [...assemblyOrder].reverse();

function strips(s: ReturnType<typeof setupEngine>) {
  return s.events.filter(
    (event): event is Extract<ServerEvent, { kind: "cardsMoved" }> =>
      event.kind === "cardsMoved" && event.strippedStackTops?.reason === "deDigivolve",
  );
}

async function resolveBlitz(s: ReturnType<typeof setupEngine>, seat: Seat) {
  expect(
    s.engine.applyIntent(seat, {
      type: "digivolve",
      permanentId: s.perm("base").permanentId,
      instanceId: s.inst("blitz").instanceId,
      alternateRequirementIndex: 0,
    }),
  ).toEqual({ ok: true });
  await settle(
    () =>
      s.events.some((event) => event.kind === "effectResolved" && event.sourceCardId === "AD1-009") &&
      s.state.pendingDecision === undefined,
  );
}

describe.each([0, 1] as const)("GitHub #5350: reported holder in seat %s", (holder) => {
  const caster: Seat = holder === 0 ? 1 : 0;

  it("public Assembly preserves the egg above buried level 3–6 cards and its fresh stack lock", async () => {
    const s = setupEngine(
      {
        [holder]: {
          hand: [
            { card: "BT26-085", as: "giant" },
            { card: "BT26-060", as: "destroy" },
          ],
          trash: assemblyOrder.map((card, index) => ({ card, as: `material${index}` })),
          deck: ["BT1-009"],
        },
        [caster]: {
          battleArea: [{ card: "BT1-021", as: "base" }],
          hand: [{ card: "AD1-009", as: "blitz" }],
          deck: ["BT1-009"],
        },
      },
      { autoDeclineOptional: true, autoSelectCards: true, autoChooseOption: true },
    );
    s.state.turnSeat = holder;
    s.state.memory = 10;
    await s.ready();
    expect(
      s.engine.applyIntent(holder, {
        type: "playCard",
        instanceId: s.inst("giant").instanceId,
        assembly: { materialInstanceIds: assemblyOrder.map((_, index) => s.inst(`material${index}`).instanceId) },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.events.some((event) => event.kind === "effectResolved" && event.sourceCardId === "BT26-085"));
    const giant = s.state.players[holder]!.battleArea[0]!;
    expect(giant.stack.map((card) => card.cardId)).toEqual(sourcesBottomFirst);
    // The reported battle replacement uses the same permitted Giant Slayer ->
    // Destroy Mode route without its cost; here the public normal route pays 5.
    s.state.memory = 10;
    expect(
      s.engine.applyIntent(holder, {
        type: "digivolve",
        permanentId: giant.permanentId,
        instanceId: s.inst("destroy").instanceId,
        alternateRequirementIndex: 1,
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        giant.topCard.cardId === "BT26-060" &&
        s.events.some((event) => event.kind === "effectResolved" && event.sourceCardId === "BT26-060"),
    );
    expect(giant.stack.map((card) => card.cardId)).toEqual([...sourcesBottomFirst, "BT26-085"]);
    // Before the first opponent turn ends, the On Play stacked-card lock
    // still protects the same permanent after it digivolves.
    s.state.turnSeat = caster;
    s.state.memory = 10;
    await resolveBlitz(s, caster);
    expect(giant.topCard.cardId).toBe("BT26-060");
    expect(giant.stack.map((card) => card.cardId)).toEqual([...sourcesBottomFirst, "BT26-085"]);
    expect(strips(s)).toHaveLength(0);
  });

  it("public battle invokes the reported Giant Slayer replacement without reordering materials", async () => {
    const s = setupEngine(
      {
        [holder]: {
          battleArea: [{ card: "BT26-085", as: "giant", under: sourcesBottomFirst, suspended: true }],
          hand: [{ card: "BT26-060", as: "destroy" }],
          deck: ["BT1-009"],
        },
        [caster]: { battleArea: [{ card: "EX9-021", as: "attacker" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.turnSeat = caster;
    s.state.memory = 10;
    await s.ready();
    expect(
      s.engine.applyIntent(caster, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "permanent", permanentId: s.perm("giant").permanentId },
      }),
    ).toEqual({ ok: true });
    await advance(s.engine).finishAttack();
    await settle(() => s.perm("giant").topCard.cardId === "BT26-060");
    expect(
      s.events.some(
        (event) => event.kind === "battleCompared" && event.loserPermanentIds.includes(s.perm("giant").permanentId),
      ),
    ).toBe(true);
    expect(
      s.events.some(
        (event) => event.kind === "effectTriggered" && event.sourceCardId === "BT26-085" && event.beforeRemoval,
      ),
    ).toBe(true);
    expect(s.perm("giant").stack.map((card) => card.cardId)).toEqual([...sourcesBottomFirst, "BT26-085"]);
  });

  it("exact prior stack exposes the egg after two strips and waits for effect end before removing it", async () => {
    const s = setupEngine({
      [holder]: {
        battleArea: [
          {
            card: "BT26-060",
            as: "victim",
            under: [
              ...sourcesBottomFirst.map((card, index) => ({ card, as: `source${index}` })),
              { card: "BT26-085", as: "giantSource" },
            ],
          },
          { card: "BT1-009", as: "otherTarget" },
        ],
      },
      [caster]: {
        hand: [{ card: "AD1-009", as: "blitz" }],
        deck: ["BT1-009"],
        battleArea: [
          { card: "BT1-021", as: "base" },
          { card: "BT1-036", as: "garurumon" },
          { card: "BT1-036", as: "otherGarurumon" },
        ],
      },
    });
    s.state.turnSeat = caster;
    s.state.memory = 10;
    await s.ready();
    const victimId = s.perm("victim").permanentId;
    expect(
      s.engine.applyIntent(caster, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("blitz").instanceId,
        alternateRequirementIndex: 0,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.decisions.at(-1)?.req.kind === "chooseTargets");
    const targetDecision = s.decisions.at(-1)!.req.decisionId;
    expect(
      s.engine.applyIntent(caster, {
        type: "respondDecision",
        decisionId: targetDecision,
        response: { kind: "chooseTargets", instanceIds: [victimId] },
      }),
    ).toEqual({ ok: true });
    await settle(
      () => s.decisions.at(-1)?.req.kind === "chooseTargets" && s.decisions.at(-1)!.req.decisionId !== targetDecision,
    );
    expect(s.perm("victim").topCard.cardId).toBe("BT26-001");
    expect(s.perm("victim").stack.map((card) => card.cardId)).toEqual(sourcesBottomFirst.slice(0, -1));
    expect(strips(s).flatMap((event) => event.cardIds ?? [])).toEqual(["BT26-060", "BT26-085"]);
    expect(s.events.filter((event) => event.kind === "stackTopResolved").map((event) => event.topInstanceId)).toEqual([
      s.inst("giantSource").instanceId,
      s.inst("source4").instanceId,
    ]);
    expect(
      s.engine.applyIntent(caster, {
        type: "respondDecision",
        decisionId: s.decisions.at(-1)!.req.decisionId,
        response: { kind: "chooseTargets", instanceIds: [s.perm("garurumon").permanentId] },
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        !s.state.players[holder]!.battleArea.some((permanent) => permanent.permanentId === victimId) &&
        s.state.pendingDecision === undefined,
    );
    expect(s.state.players[holder]!.trash.map((card) => card.cardId)).toEqual([
      "BT26-060",
      "BT26-085",
      ...sourcesBottomFirst,
    ]);
  });

  it("rule-trash of the exposed egg does not grant Patamon memory or trigger Makoto", async () => {
    const s = setupEngine(
      {
        [holder]: { battleArea: [{ card: "BT26-060", as: "victim", under: [...sourcesBottomFirst, "BT26-085"] }] },
        [caster]: {
          battleArea: [
            { card: "BT1-021", as: "base", under: ["ST3-04"] },
            { card: "BT26-095", as: "makoto" },
          ],
          hand: [{ card: "AD1-009", as: "blitz" }],
          deck: ["BT1-009", "BT1-010", "BT1-011"],
        },
      },
      { autoSelectCards: true, autoChooseOption: true, autoAcceptOptional: true },
    );
    s.state.turnSeat = caster;
    s.state.memory = 10;
    await s.ready();
    await resolveBlitz(s, caster);
    await settle();
    expect(s.state.players[holder]!.battleArea).toHaveLength(0);
    expect(s.state.memory).toBe(7);
    expect(s.perm("makoto").isSuspended).toBe(false);
    expect(
      s.events.filter(
        (event) => event.kind === "effectTriggered" && ["ST3-04", "BT26-095"].includes(event.sourceCardId),
      ),
    ).toHaveLength(0);
  });

  it("rule-trash of an exposed no-DP egg does not activate inherited Koichi On Deletion", async () => {
    const s = setupEngine(
      {
        [holder]: {
          battleArea: [{ card: "BT26-060", as: "victim", under: ["BT7-091", ...sourcesBottomFirst, "BT26-085"] }],
        },
        [caster]: {
          battleArea: [{ card: "BT1-021", as: "base" }],
          hand: [{ card: "AD1-009", as: "blitz" }],
          deck: ["BT1-009"],
        },
      },
      { autoSelectCards: true, autoChooseOption: true },
    );
    s.state.turnSeat = caster;
    s.state.memory = 10;
    await s.ready();
    await resolveBlitz(s, caster);
    await settle();
    expect(s.state.players[holder]!.battleArea).toHaveLength(0);
    expect(s.state.memory).toBe(7);
    expect(s.events.some((event) => event.kind === "effectTriggered" && event.sourceCardId === "BT7-091")).toBe(false);
  });

  it("rule-trash removes the exposed egg even under an unqualified deletion prohibition", async () => {
    const s = setupEngine(
      {
        [holder]: { battleArea: [{ card: "BT26-060", as: "victim", under: [...sourcesBottomFirst, "BT26-085"] }] },
        [caster]: {
          battleArea: [{ card: "BT1-021", as: "base" }],
          hand: [{ card: "AD1-009", as: "blitz" }],
          deck: ["BT1-009"],
        },
      },
      { autoSelectCards: true, autoChooseOption: true },
    );
    s.state.turnSeat = caster;
    s.state.memory = 10;
    await s.ready();
    // Arm a prohibition through the documented test seam; the resolving effect
    // and rule check still run exclusively through the public digivolve intent.
    advance(s.engine).ledgers.continuous.addRestriction(
      s.perm("victim").permanentId,
      "beDeleted",
      EffectDuration.Permanent,
    );
    await resolveBlitz(s, caster);
    expect(s.state.players[holder]!.battleArea).toHaveLength(0);
    expect(s.state.players[holder]!.trash).toHaveLength(7);
  });

  it.each([false, true])(
    "a DP-bearing Digimon reduced to zero still follows deletion processing (protected=%s)",
    async (protectedFromDeletion) => {
      const s = setupEngine(
        {
          [holder]: { battleArea: [{ card: "BT26-060", as: "victim", under: ["ST1-07"] }] },
          [caster]: {
            battleArea: [{ card: "BT1-021", as: "base", under: ["ST3-04"] }],
            hand: [{ card: "AD1-009", as: "blitz" }],
            deck: ["BT1-009"],
          },
        },
        { autoSelectCards: true, autoChooseOption: true },
      );
      s.state.turnSeat = caster;
      s.state.memory = 10;
      await s.ready();
      const victim = s.perm("victim");
      await advance(s.engine).verb.modifyDP(victim.permanentId, -5000, EffectDuration.Permanent);
      if (protectedFromDeletion)
        advance(s.engine).ledgers.continuous.addRestriction(victim.permanentId, "beDeleted", EffectDuration.Permanent);
      await resolveBlitz(s, caster);
      await settle();
      expect(s.state.players[holder]!.battleArea).toHaveLength(protectedFromDeletion ? 1 : 0);
      expect(s.events.some((event) => event.kind === "effectTriggered" && event.sourceCardId === "ST3-04")).toBe(
        !protectedFromDeletion,
      );
      expect(victim.topCard.cardId).toBe("ST1-07");
      expect(victim.currentDP).toBe(0);
    },
  );

  it.each([
    {
      name: "level 3 floor",
      top: "BT26-060",
      under: ["BT26-001", "BT26-009", "BT26-011", "BT26-015"],
      final: "BT26-009",
      removed: 3,
    },
    {
      name: "fewer than the declared three",
      top: "BT26-011",
      under: ["BT26-001", "BT26-009"],
      final: "BT26-009",
      removed: 1,
    },
    { name: "zero sources", top: "BT26-060", under: [], final: "BT26-060", removed: 0 },
    { name: "Digi-Egg with printed DP", top: "BT26-060", under: ["EX2-007"], final: "EX2-007", removed: 1 },
    {
      name: "opponent Digimon effect immunity",
      top: "EX5-074",
      under: [...sourcesBottomFirst],
      final: "EX5-074",
      removed: 0,
    },
  ])("public intent respects $name", async ({ top, under, final, removed }) => {
    const s = setupEngine(
      {
        [holder]: { battleArea: [{ card: top, as: "victim", under }] },
        [caster]: {
          battleArea: [{ card: "BT1-021", as: "base" }],
          hand: [{ card: "AD1-009", as: "blitz" }],
          deck: ["BT1-009"],
        },
      },
      { autoSelectCards: true, autoChooseOption: true },
    );
    s.state.turnSeat = caster;
    s.state.memory = 10;
    await s.ready();
    expect(observe(s.engine).hasRestriction(s.perm("victim"), "beAffected", "Digimon")).toBe(top === "EX5-074");
    await resolveBlitz(s, caster);
    expect(s.perm("victim").topCard.cardId).toBe(final);
    expect(strips(s)).toHaveLength(removed);
    expect(s.state.players[holder]!.trash).toHaveLength(removed);
    expect(s.perm("victim").stack.map((card) => card.cardId)).toEqual(
      under.slice(0, Math.max(0, under.length - removed)),
    );
  });
});
