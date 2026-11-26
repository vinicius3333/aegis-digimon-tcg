import { describe, expect, it } from "vitest";
import { EffectDuration, Phase } from "@aegis/shared/schema/enums";
import "#api/cards/index";
import fixture from "#api/engine/scenarios/arts-digivolve-skips-digivolve-locked-digimon.fixture";
import { advance } from "#api/engine/testkit/advance";
import { setupScenario } from "#api/engine/testkit/scenario";
import { settle } from "#api/engine/testkit/harness";

const artsPrompts = (s: ReturnType<typeof setupScenario>) =>
  s.decisions.filter(({ req }) => req.promptText.includes("Arts Digivolve"));

describe("Arts Digivolve skips Digimon that can't digivolve", () => {
  it("offers only the Digimon whose digivolution is not prohibited", async () => {
    const s = setupScenario(fixture, { autoAcceptOptional: false, autoSelectCards: true });
    await s.ready();
    s.state.phase = Phase.Main;
    advance(s.engine).ledgers.continuous.addRestriction(
      s.perm("lockedNoir").permanentId,
      "digivolve",
      EffectDuration.UntilEachTurnEnd,
    );
    const freeNoirId = s.perm("freeNoir").topCard.instanceId;

    expect(
      s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("mickey").instanceId, useAs: "option" }),
    ).toEqual({ ok: true });
    await settle();

    expect(artsPrompts(s).map(({ req }) => req.options?.candidateInstanceIds)).toEqual([[freeNoirId]]);
    expect(s.perm("freeNoir").topCard.cardId).toBe("EX13-066");
    expect(s.perm("lockedNoir").topCard.cardId).toBe("BT6-084");
  });

  it("trashes the DUAL card without an offer when every candidate can't digivolve", async () => {
    const s = setupScenario(fixture, { autoAcceptOptional: false, autoSelectCards: true });
    await s.ready();
    s.state.phase = Phase.Main;
    for (const alias of ["lockedNoir", "freeNoir"]) {
      advance(s.engine).ledgers.continuous.addRestriction(
        s.perm(alias).permanentId,
        "digivolve",
        EffectDuration.UntilEachTurnEnd,
      );
    }

    expect(
      s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("mickey").instanceId, useAs: "option" }),
    ).toEqual({ ok: true });
    await settle();

    expect(artsPrompts(s)).toEqual([]);
    expect(s.state.players[0]!.trash.map(({ cardId }) => cardId)).toContain("EX13-066");
    expect(s.state.pendingDecision).toBeUndefined();
  });
});
