import { describe, it, expect } from "vitest";
import { EffectDuration, EffectTiming, getCardDefinition, getCompiledCard } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "../index.js";

// A3 for ST2-15 (Kaiser Nail — Option card):
//   "[Main] Choose a Digimon digivolution card placed under 1 of your Digimon and
//    play it as another Digimon without paying its memory cost."
//
// Observable: after playing Kaiser Nail as an Option, a Digimon digi-card from under
// one of the controller's Digimon is played as a new Digimon on the battle area.
//
// FAILS-WHEN-REVERTED: without the [Main] body, no card is played from the digi-stack;
// the battle area count and trash remain unchanged.
//
// KB Q627: the played card comes into play unsuspended (a new Digimon, not inheriting state).
// KB Q626: Digimon digi-cards only — not Digi-Eggs or Tamers.
//
// Card IDs used:
//   ST2-15   — Kaiser Nail (Option, the card under test)
//   ST2-10   — Plesiomon (Lv.6 Digimon, used as the host on the field)
//   BT10-074 — Lv.4 Purple Digimon, placed as a digi-card under the host (legal play target)

describe("ST2-15 Kaiser Nail — [Main] play a Digimon digi-card from under your Digimon", () => {
  it("loads the complete shared IR artifact without residual clauses", () => {
    const definition = getCardDefinition("ST2-15");
    const compiled = getCompiledCard("ST2-15");
    expect(definition?.effectText).toContain("play it as another Digimon without paying its memory cost");
    expect(compiled?.coverage).toBe("full");
    expect(compiled?.residual).toEqual([]);
    expect(compiled?.effects).toEqual([
      {
        trigger: "Main",
        actions: [
          {
            kind: "SelectBind",
            target: {
              filter: { controller: "mine", kind: ["Digimon"], digivolutionCards: "hasAny" },
              count: 1,
              bindAs: "chosenHost",
            },
          },
          {
            kind: "PlayWithoutCost",
            target: {
              filter: {
                zone: "digivolutionCards",
                controller: "mine",
                kind: ["Digimon"],
                hostFilter: { boundRef: "chosenHost" },
              },
              count: 1,
            },
            from: ["digivolutionCards"],
            payCost: false,
            optional: true,
          },
        ],
      },
      { trigger: "Security", actions: [{ kind: "ActivateMain" }], isSecurity: true },
    ]);
  });

  it("plays a Digimon digi-card from under one of your Digimon without cost", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            // A Digimon on p0's battle area with a Digimon digi-card (BT10-074) in its stack.
            {
              card: "ST2-10",
              as: "baseDigimon",
              suspended: true,
              under: [
                { card: "ST2-01", as: "eggSource" },
                { card: "ST2-12", as: "tamerSource" },
                { card: "BT10-074", as: "digiCard" },
              ],
            },
            { card: "BT1-027", dp: 3000 }, // §4-21 color-requirement source (Blue)
          ],
          hand: [{ card: "ST2-15", as: "kaiserNail" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const p0 = s.state.players[0]!;
    const baseDigimon = s.perm("baseDigimon");
    const digiCardId = s.inst("digiCard").instanceId;

    // Pay only Kaiser Nail's printed cost of 4.
    s.state.memory = 4;

    await advance(s.engine).verb.modifyDP(baseDigimon.permanentId, 4000, EffectDuration.UntilEachTurnEnd);
    expect(baseDigimon.currentDP).toBe(baseDigimon.baseDP + 4000);
    const initialBattleCount = p0.battleArea.length;

    // Play Kaiser Nail as an Option card.
    const result = s.engine.applyIntent(0, {
      type: "playCard",
      instanceId: s.inst("kaiserNail").instanceId,
    });
    expect(result.ok).toBe(true);

    // Wait for the [Main] effect to play BT10-074 as a new Digimon.
    await settle(() => p0.battleArea.length > initialBattleCount);

    // A new Digimon should appear on the battle area (BT10-074 played from digi-stack).
    expect(p0.battleArea.length).toBeGreaterThan(initialBattleCount);
    const played = p0.battleArea.find((p) => p.topCard?.cardId === "BT10-074")!;
    expect(played).toBeDefined();
    expect(played.isSuspended).toBe(false);
    expect(played.topCard.instanceId).toBe(digiCardId);
    expect(played.currentDP).toBe(getCardDefinition("BT10-074")!.dp);
    expect(baseDigimon.currentDP).toBe(baseDigimon.baseDP + 4000);
    expect(p0.battleArea).toHaveLength(initialBattleCount + 1);
    expect(s.state.memory).toBe(0);

    // The digi-card should no longer be under the base Digimon's stack.
    expect(baseDigimon.stack.some((c) => c.instanceId === digiCardId)).toBe(false);
    expect(baseDigimon.stack.map(({ instanceId }) => instanceId)).toEqual([
      s.inst("eggSource").instanceId,
      s.inst("tamerSource").instanceId,
    ]);
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: played.permanentId,
        target: { kind: "player" },
      }).ok,
    ).toBe(false);
  });

  it("chooses an identical host by permanent id before choosing its source card", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "BT1-009", as: "firstHost", under: [{ card: "BT10-074", as: "firstSource" }] },
          {
            card: "BT1-009",
            as: "secondHost",
            under: [
              { card: "BT10-074", as: "secondSource" },
              { card: "BT10-074", as: "secondOtherSource" },
            ],
          },
          { card: "BT1-027", as: "blueSource" },
        ],
        hand: [{ card: "ST2-15", as: "kaiserNail" }],
      },
    });
    s.state.memory = 10;

    expect(
      s.engine.applyIntent(0, {
        type: "playCard",
        instanceId: s.inst("kaiserNail").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => {
      const latest = s.decisions.at(-1)?.req;
      return (
        latest !== undefined &&
        latest.decisionId === s.state.pendingDecision?.decisionId &&
        latest.kind === "chooseTargets" &&
        latest.sourceCardId === "ST2-15"
      );
    });

    const hostDecision = s.decisions.at(-1)!.req;
    expect(hostDecision.options?.candidateInstanceIds).toEqual([
      s.perm("firstHost").permanentId,
      s.perm("secondHost").permanentId,
    ]);
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: hostDecision.decisionId,
        response: {
          kind: "chooseTargets",
          instanceIds: [s.perm("secondHost").permanentId],
        },
      }),
    ).toEqual({ ok: true });
    await settle(() => {
      const latest = s.decisions.at(-1)?.req;
      return (
        latest !== undefined &&
        latest.decisionId === s.state.pendingDecision?.decisionId &&
        latest.kind === "optional" &&
        latest.sourceCardId === "ST2-15"
      );
    });

    const optionalDecision = s.state.pendingDecision;
    expect(optionalDecision?.kind).toBe("optional");
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: optionalDecision!.decisionId,
        response: { kind: "optional", accept: true },
      }),
    ).toEqual({ ok: true });
    await settle(() => {
      const latest = s.decisions.at(-1)?.req;
      return (
        latest !== undefined &&
        latest.decisionId === s.state.pendingDecision?.decisionId &&
        latest.kind === "selectCards" &&
        latest.sourceCardId === "ST2-15"
      );
    });
    const sourceDecision = s.state.pendingDecision;
    expect(sourceDecision?.kind).toBe("selectCards");
    const sourceOptions = JSON.parse(sourceDecision?.payloadJson ?? "{}");
    expect(sourceOptions.candidateInstanceIds).toEqual([
      s.inst("secondSource").instanceId,
      s.inst("secondOtherSource").instanceId,
    ]);
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: sourceDecision!.decisionId,
        response: {
          kind: "selectCards",
          instanceIds: [s.inst("secondSource").instanceId],
        },
      }),
    ).toEqual({ ok: true });
    await settle(() =>
      s.state.players[0]!.battleArea.some(
        (permanent) => permanent.topCard.instanceId === s.inst("secondSource").instanceId,
      ),
    );

    expect(s.perm("firstHost").stack.map((card) => card.instanceId)).toEqual([s.inst("firstSource").instanceId]);
    expect(s.perm("secondHost").stack.map((card) => card.instanceId)).toEqual([s.inst("secondOtherSource").instanceId]);
  });

  it("does NOT play when there are no Digimon digi-cards in any of your Digimon's stacks", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            // Digimon on battle area with NO digi-cards in stack.
            { card: "BT1-009", dp: 6000, as: "baseDigimon" },
            { card: "BT1-027", dp: 3000 }, // §4-21 color-requirement source (Blue)
          ],
          hand: [{ card: "ST2-15", as: "kaiserNail" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const p0 = s.state.players[0]!;
    s.state.memory = 3;

    const initialBattleCount = p0.battleArea.length;

    const result = s.engine.applyIntent(0, {
      type: "playCard",
      instanceId: s.inst("kaiserNail").instanceId,
    });
    expect(result.ok).toBe(true);

    await settle(() => p0.trash.some((card) => card.instanceId === s.inst("kaiserNail").instanceId));
    expect(p0.trash.some((card) => card.instanceId === s.inst("kaiserNail").instanceId)).toBe(true);

    // No new Digimon was played (no valid target).
    expect(p0.battleArea.length).toBe(initialBattleCount);
  });

  it("activates the same play-from-sources effect from security", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT1-009", under: [{ card: "BT10-074", as: "digiCard" }] }],
          security: [{ card: "ST2-15", as: "securityOption", faceUp: true }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const playedId = s.inst("digiCard").instanceId;

    await advance(s.engine).fireForInstance(EffectTiming.SecuritySkill, s.inst("securityOption"));

    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.instanceId === playedId)).toBe(true);
  });
});
