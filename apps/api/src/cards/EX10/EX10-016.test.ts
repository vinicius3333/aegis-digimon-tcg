import { describe, expect, it } from "vitest";
import { EffectDuration, getCardDefinition, Phase } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { assertNoLoudGap, setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./EX10-016.js";
import "../index.js";

const CARD_ID = "EX10-016";

describe("EX10-016 Mirrormon", () => {
  it("records the exact catalog, evolution, link, linked cost, and self-linked watcher", () => {
    expect(getCardDefinition(CARD_ID)).toMatchObject({
      colors: ["Green"],
      level: 3,
      playCost: 3,
      dp: 1000,
      evoCosts: [{ color: "Green", level: 2, memoryCost: 0 }],
      forms: ["Stnd.", "Appmon"],
      attributes: ["Tool"],
      types: ["Mirror"],
      linkDp: 2000,
    });
    expect(compiled).toMatchObject({ coverage: "full", residual: [] });
    expect(compiled.digivolutionRequirement).toEqual([{ level: 2, traits: ["Appmon"], cost: 0, isAlternate: true }]);
    expect(compiled.linkRequirement).toEqual([{ traits: ["Appmon"], cost: 1 }]);
    expect(compiled.effects?.find((effect) => effect.isLinked)).toMatchObject({
      trigger: "WhenAttacking",
      actions: [
        {
          kind: "Suspend",
          optional: true,
          abortOnDecline: true,
          target: { filter: { controller: "opponent", kind: ["Digimon"] }, count: 2 },
          cost: {
            kind: "trash",
            target: {
              filter: { controller: "mine", kind: ["Digimon"], zone: "linked", isSelfRef: true },
              count: 1,
            },
          },
        },
      ],
    });
    expect(compiled.effects?.find((effect) => effect.trigger === "YourTurn")).toMatchObject({
      frequency: "OncePerTurn",
      actions: [
        {
          kind: "SubTrigger",
          event: "whenLinked",
          sourceFilter: { isSelfRef: true },
          actions: [{ kind: "Suspend", optional: true, target: { count: 1 } }],
        },
      ],
    });
  });

  it.each([
    ["normal green route", "BT1-007", false],
    ["alternate Appmon route", "BT21-005", true],
  ])("uses the %s for cost 0", async (_label, baseCard, useAlternateCost) => {
    const s = setupEngine({
      0: {
        breeding: { card: baseCard, as: "base" },
        hand: [{ card: CARD_ID, as: "mirrormon" }],
      },
    });
    s.state.memory = 1;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("mirrormon").instanceId,
        ...(useAlternateCost ? { useAlternateCost: true, alternateRequirementIndex: 0 } : {}),
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard.instanceId === s.inst("mirrormon").instanceId);

    expect(s.state.memory).toBe(1);
    expect(s.perm("base").stack.map(({ cardId }) => cardId)).toContain(baseCard);
  });

  it("rejects a non-Appmon red level 2, links only to Appmon for 1, and contributes +2000 DP", async () => {
    const evolution = setupEngine({
      0: {
        breeding: { card: "BT1-001", as: "redEgg" },
        hand: [{ card: CARD_ID, as: "mirrormon" }],
      },
    });
    evolution.state.memory = 1;
    expect(
      evolution.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: evolution.perm("redEgg").permanentId,
        instanceId: evolution.inst("mirrormon").instanceId,
        useAlternateCost: true,
        alternateRequirementIndex: 0,
      }),
    ).toEqual(expect.objectContaining({ ok: false }));

    const link = setupEngine({
      0: {
        battleArea: [
          { card: "BT21-009", as: "appmon" },
          { card: "BT1-009", as: "notAppmon" },
        ],
        hand: [{ card: CARD_ID, as: "mirrormon" }],
      },
    });
    link.state.memory = 1;
    await link.ready();
    const baseDp = link.perm("appmon").currentDP;

    expect(
      link.engine.applyIntent(0, {
        type: "linkCard",
        instanceId: link.inst("mirrormon").instanceId,
        targetPermanentId: link.perm("notAppmon").permanentId,
      }),
    ).toEqual(expect.objectContaining({ ok: false }));
    expect(
      link.engine.applyIntent(0, {
        type: "linkCard",
        instanceId: link.inst("mirrormon").instanceId,
        targetPermanentId: link.perm("appmon").permanentId,
      }),
    ).toEqual({ ok: true });
    await settle(() => link.perm("appmon").linked.some(({ cardId }) => cardId === CARD_ID));

    expect(link.state.memory).toBe(0);
    expect(link.perm("appmon").currentDP).toBe(baseDp + 2000);
    assertNoLoudGap(link);
  });

  it("suspends 1 only when this Digimon gets linked, refuses a second use, and resets next own turn", async () => {
    // A live bias array: each step names the ONE opposing Digimon a firing would suspend, so a
    // refused use cannot be confused with a use that re-suspended an already suspended target.
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: CARD_ID, as: "mirrormon" },
            { card: "BT21-009", as: "neighbor" },
          ],
          hand: [
            { card: "BT24-053", as: "neighborLink" },
            { card: "BT24-053", as: "firstLink" },
            { card: "BT24-053", as: "secondLink" },
            { card: "BT24-053", as: "thirdLink" },
          ],
          deck: ["BT1-013", "BT1-014", "BT1-009", "BT1-010", "BT1-011"],
          security: ["BT1-009", "BT1-010"],
        },
        1: {
          battleArea: [
            { card: "BT1-009", as: "firstTarget" },
            { card: "BT1-010", as: "secondTarget" },
            { card: "BT1-011", as: "thirdTarget" },
          ],
          deck: ["BT1-013", "BT1-014", "BT1-009", "BT1-010", "BT1-011"],
          hand: ["BT1-013"],
          security: ["BT1-009", "BT1-010"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferred },
    );
    const suspendedOpponents = () => s.state.players[1]!.battleArea.filter((permanent) => permanent.isSuspended).length;
    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    // The turn loop hands the turn player its own memory; top it up so the link declarations
    // below never drive memory to zero and hand the turn over mid-test.
    s.state.memory = 8;

    // A card linked to a NEIGHBOUR is not this Digimon getting linked: the watcher stays quiet.
    expect(
      s.engine.applyIntent(0, {
        type: "linkCard",
        instanceId: s.inst("neighborLink").instanceId,
        targetPermanentId: s.perm("neighbor").permanentId,
      }),
    ).toEqual({ ok: true });
    await settle(() =>
      s.perm("neighbor").linked.some(({ instanceId }) => instanceId === s.inst("neighborLink").instanceId),
    );
    expect(suspendedOpponents()).toBe(0);

    s.state.memory = 8;
    preferred.length = 0;
    preferred.push(s.perm("firstTarget").permanentId);
    // First link onto Mirrormon: one opposing Digimon is suspended.
    expect(
      s.engine.applyIntent(0, {
        type: "linkCard",
        instanceId: s.inst("firstLink").instanceId,
        targetPermanentId: s.perm("mirrormon").permanentId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("firstTarget").isSuspended);
    expect(s.perm("mirrormon").linked).toHaveLength(1);
    expect(suspendedOpponents()).toBe(1);

    // Second link in the SAME turn, through a real ＜Link +1＞ grant and a real link intent:
    // the once-per-turn gate refuses the second use, so the suspend count does not move.
    await advance(s.engine).verb.grantLinkMax(s.perm("mirrormon").permanentId, 1, EffectDuration.UntilEachTurnEnd);
    s.state.memory = 8;
    preferred.length = 0;
    preferred.push(s.perm("secondTarget").permanentId);
    expect(
      s.engine.applyIntent(0, {
        type: "linkCard",
        instanceId: s.inst("secondLink").instanceId,
        targetPermanentId: s.perm("mirrormon").permanentId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("mirrormon").linked.length === 2);
    expect(s.perm("secondTarget").isSuspended).toBe(false);
    expect(suspendedOpponents()).toBe(1);

    // Round-trip the real turn loop. The opponent unsuspends on their own turn, so the board
    // is clean again and any suspension seen afterwards is a fresh use of the reset gate.
    advance(s.engine).endMainPhaseIfOpen(0);
    await advance(s.engine).waitForMainPhase(1);
    advance(s.engine).endMainPhaseIfOpen(1);
    await advance(s.engine).waitForMainPhase(0);
    expect(suspendedOpponents()).toBe(0);

    await advance(s.engine).verb.grantLinkMax(s.perm("mirrormon").permanentId, 1, EffectDuration.UntilEachTurnEnd);
    s.state.memory = 8;
    preferred.length = 0;
    preferred.push(s.perm("thirdTarget").permanentId);
    expect(
      s.engine.applyIntent(0, {
        type: "linkCard",
        instanceId: s.inst("thirdLink").instanceId,
        targetPermanentId: s.perm("mirrormon").permanentId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("thirdTarget").isSuspended);
    expect(suspendedOpponents()).toBe(1);
    assertNoLoudGap(s);

    expect(s.engine.applyIntent(1, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  it("builds Mirrormon through a real breeding stack: hatch, digivolve in breeding, move out", async () => {
    const s = setupEngine(
      {
        0: {
          eggDeck: [{ card: "BT1-007", as: "egg" }],
          hand: [
            { card: CARD_ID, as: "mirrormon" },
            { card: "BT24-053", as: "link" },
          ],
          deck: ["BT1-013", "BT1-014"],
        },
        1: { battleArea: [{ card: "BT1-009", as: "target" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.phase = Phase.Breeding;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "hatchEgg" })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.breeding?.topCard?.cardId === "BT1-007");
    const breedingPermanentId = s.state.players[0]!.breeding!.permanentId;
    const eggInstanceId = s.state.players[0]!.breeding!.topCard!.instanceId;

    // The green Lv.2 route is the printed evolution cost, taken inside breeding where it costs
    // no memory. The stack identity below is what makes this a real build, not a seeded board.
    s.state.phase = Phase.Main;
    const memoryBeforeDigivolve = s.state.memory;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: breedingPermanentId,
        instanceId: s.inst("mirrormon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.breeding?.topCard?.cardId === CARD_ID);
    expect(s.state.memory).toBe(memoryBeforeDigivolve);
    expect(s.state.players[0]!.breeding!.stack.map(({ instanceId }) => instanceId)).toEqual([eggInstanceId]);

    s.state.phase = Phase.Breeding;
    expect(s.engine.applyIntent(0, { type: "moveFromBreeding", permanentId: breedingPermanentId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.battleArea.length === 1);
    s.state.phase = Phase.Main;
    expect(s.state.players[0]!.breeding).toBeUndefined();

    const bred = s.state.players[0]!.battleArea[0]!;
    expect(bred.topCard!.cardId).toBe(CARD_ID);
    expect(bred.stack.map(({ cardId }) => cardId)).toEqual(["BT1-007"]);
    expect(bred.stack.map(({ instanceId }) => instanceId)).toEqual([eggInstanceId]);

    // The self-linked watcher fires on the bred permanent, so the clause is proved on the card
    // as it is actually built rather than on a seeded permanent.
    s.state.memory = 1;
    expect(
      s.engine.applyIntent(0, {
        type: "linkCard",
        instanceId: s.inst("link").instanceId,
        targetPermanentId: bred.permanentId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("target").isSuspended);

    const linkedHost = s.state.players[0]!.battleArea[0]!;
    expect(linkedHost.linked.map(({ instanceId }) => instanceId)).toEqual([s.inst("link").instanceId]);
    expect(linkedHost.stack.map(({ cardId }) => cardId)).toEqual(["BT1-007"]);
    expect(s.state.memory).toBe(0);
    expect(s.perm("target").isSuspended).toBe(true);
    assertNoLoudGap(s);
  });

  it("may refuse the self-linked suspension", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: CARD_ID, as: "mirrormon" }],
          hand: [{ card: "BT24-053", as: "link" }],
        },
        1: { battleArea: [{ card: "BT1-009", as: "target" }] },
      },
      { autoDeclineOptional: true },
    );
    s.state.memory = 1;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "linkCard",
        instanceId: s.inst("link").instanceId,
        targetPermanentId: s.perm("mirrormon").permanentId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("mirrormon").linked.length === 1);

    expect(s.perm("target").isSuspended).toBe(false);
    assertNoLoudGap(s);
  });

  it("Q5046 may trash itself as cost on a real attack and suspends exactly 2 of 3 opposing Digimon", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT21-009", as: "host", dp: 20_000, linked: [{ card: CARD_ID, as: "mirror" }] }],
          hand: ["BT1-013"],
        },
        1: {
          battleArea: [
            { card: "BT1-009", as: "first" },
            { card: "BT1-010", as: "second" },
            { card: "BT1-011", as: "third" },
          ],
          security: ["BT1-009", "BT1-010"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferred },
    );
    preferred.push(s.perm("first").permanentId, s.perm("second").permanentId);
    await s.ready();

    // Natural origin: a public attack intent opens the [When Attacking] window.
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("host").linked.length === 0);

    expect(s.perm("host").linked).toHaveLength(0);
    expect(s.state.players[0]!.trash.map(({ instanceId }) => instanceId)).toContain(s.inst("mirror").instanceId);
    expect(s.perm("first").isSuspended).toBe(true);
    expect(s.perm("second").isSuspended).toBe(true);
    expect(s.perm("third").isSuspended).toBe(false);
    assertNoLoudGap(s);
  });

  it("Q5047 may trash another card on the same Link +1 host, and the linked effect may be refused", async () => {
    const preferred: string[] = [];
    const accepted = setupEngine(
      {
        0: {
          battleArea: [
            {
              card: "BT21-009",
              as: "host",
              dp: 20_000,
              linked: [
                { card: CARD_ID, as: "mirror" },
                { card: "BT26-010", as: "otherLink" },
              ],
            },
          ],
          hand: ["BT1-013"],
        },
        1: {
          battleArea: [
            { card: "BT1-009", as: "first" },
            { card: "BT1-010", as: "second" },
          ],
          security: ["BT1-009", "BT1-010"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferred },
    );
    preferred.push(
      accepted.inst("otherLink").instanceId,
      accepted.perm("first").permanentId,
      accepted.perm("second").permanentId,
    );
    await advance(accepted.engine).verb.grantLinkMax(
      accepted.perm("host").permanentId,
      1,
      EffectDuration.UntilEachTurnEnd,
    );
    await accepted.ready();

    expect(
      accepted.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: accepted.perm("host").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => accepted.perm("host").linked.length === 1);

    expect(accepted.perm("host").linked.map(({ instanceId }) => instanceId)).toContain(
      accepted.inst("mirror").instanceId,
    );
    expect(accepted.state.players[0]!.trash.map(({ instanceId }) => instanceId)).toContain(
      accepted.inst("otherLink").instanceId,
    );
    expect(accepted.perm("first").isSuspended).toBe(true);
    expect(accepted.perm("second").isSuspended).toBe(true);
    assertNoLoudGap(accepted);

    const declined = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT21-009", as: "host", dp: 20_000, linked: [{ card: CARD_ID, as: "mirror" }] }],
          hand: ["BT1-013"],
        },
        1: {
          battleArea: [
            { card: "BT1-009", as: "first" },
            { card: "BT1-010", as: "second" },
          ],
          security: ["BT1-009", "BT1-010"],
        },
      },
      { autoDeclineOptional: true },
    );
    await declined.ready();
    expect(
      declined.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: declined.perm("host").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => declined.events.some((event) => event.kind === "combatResolved"));

    expect(declined.perm("host").linked).toHaveLength(1);
    expect(declined.perm("first").isSuspended).toBe(false);
    expect(declined.perm("second").isSuspended).toBe(false);
    assertNoLoudGap(declined);
  });
});
