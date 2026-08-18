import { describe, it, expect } from "vitest";
import { EffectTiming, type PlayerState } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "../BT9/BT9-103.js";
import "./ST10-14.js";

// A3 for ST10-14 (Chaos Degradation, Option) — [Main] place 1 opponent Digimon face down at the
// top or bottom of their security stack; if placed at top, trash the top of their security.
// source: documented behavior.
//
// FAILS-WHEN-REVERTED: choosing TOP places the opponent Digimon's top card onto their security
// and then the if(toTop) trash removes it to the opponent's trash. A no-op leaves the opponent
// Digimon on the field and the trash unchanged.

describe("ST10-14 [Main] place an opponent Digimon onto their security (top), then trash the top", () => {
  it("places the opponent Digimon's top card to their security and trashes it (toTop)", async () => {
    const s = setupEngine(
      {
        0: {
          // §4-21 color-requirement source (Yellow + Purple)
          battleArea: ["BT1-045", "BT10-079"],
          hand: [{ card: "ST10-14", as: "option" }],
        },
        1: { battleArea: [{ card: "BT1-009", dp: 3000, as: "oppDigimon" }] },
      },
      { autoAcceptOptional: true, autoChooseOption: true, autoOrderTriggers: true, autoSelectCards: true },
    );
    const p1 = s.state.players[1] as PlayerState;
    const oppTopId = s.perm("oppDigimon").topCard!.instanceId;
    s.state.memory = 8; // exact play cost

    expect(
      s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId }),
    ).toEqual({ ok: true });

    await settle(() => p1.trash.some((c) => c.instanceId === oppTopId));

    // The opponent Digimon's top card was placed at security top, then trashed → in their trash.
    expect(p1.trash.some((c) => c.instanceId === oppTopId)).toBe(true);
    // The Digimon's former top card is no longer on the battle area.
    expect(p1.battleArea.some((perm) => perm.topCard?.instanceId === oppTopId)).toBe(false);
  });

  it("may place an opposing Digimon in security without trashing it from Security", async () => {
    const s = setupEngine({ 0: { security: [{ card: "ST10-14", as: "option", faceUp: true }] }, 1: { battleArea: [{ card: "ST10-07", as: "target" }] } }, { autoChooseOption: true, autoOrderTriggers: true, autoSelectCards: true });
    const id = s.perm("target").topCard.instanceId;
    const firing = advance(s.engine).fireForInstance(EffectTiming.SecuritySkill, s.inst("option"));
    await settle(() => s.state.pendingDecision?.kind === "optional");
    const optional = s.decisions.at(-1)!.req;
    expect(optional.sourceCardId).toBe("ST10-14");
    expect(s.engine.applyIntent(0, {
      type: "respondDecision",
      decisionId: optional.decisionId,
      response: { kind: "optional", accept: true },
    })).toEqual({ ok: true });
    await firing;
    expect(s.state.players[1]!.battleArea).toHaveLength(0);
    expect(s.state.players[1]!.security.some((c) => c.instanceId === id)).toBe(true);
    expect(s.state.players[1]!.trash).toHaveLength(0);
    expect(s.decisions.filter(({ req }) =>
      req.kind === "optional" && req.sourceCardId === "ST10-14"
    )).toHaveLength(1);
  });

  it("trashes the previous security top when the Digimon is placed at the bottom", async () => {
    const s = setupEngine({
      0: {
        battleArea: ["BT1-045", "BT10-079"],
        hand: [{ card: "ST10-14", as: "option" }],
      },
      1: {
        battleArea: [{
          card: "BT1-009",
          as: "target",
          under: [{ card: "BT1-002", as: "source" }],
        }],
        security: [{ card: "BT1-001", as: "oldTop" }],
      },
    }, { autoOrderTriggers: true, autoSelectCards: true, preferOptionIndex: 1 });
    s.state.memory = 8;
    const targetId = s.perm("target").topCard.instanceId;

    expect(s.engine.applyIntent(0, {
      type: "playCard",
      instanceId: s.inst("option").instanceId,
    })).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.trash.some((card) =>
      card.instanceId === s.inst("oldTop").instanceId,
    ));

    expect(s.state.players[1]!.security.map((card) => card.instanceId)).toEqual([
      targetId,
    ]);
    expect(s.state.players[1]!.trash.map((card) => card.instanceId)).toContain(
      s.inst("oldTop").instanceId,
    );
    expect(s.state.players[1]!.trash.map((card) => card.instanceId)).toContain(
      s.inst("source").instanceId,
    );
  });

  it("does not trash security when Kongou prevents the placement", async () => {
    const s = setupEngine({
      0: {
        hand: [{ card: "BT9-103", as: "kongou" }],
        battleArea: [{ card: "BT1-009", as: "target" }],
        security: [{ card: "BT1-001", as: "oldTop" }],
      },
      1: {
        hand: [{ card: "ST10-14", as: "chaos" }],
      },
    }, { autoOrderTriggers: true, autoSelectCards: true, preferOptionIndex: 1 });
    await advance(s.engine).fireForInstance(EffectTiming.OnUseOption, s.inst("kongou"));
    await advance(s.engine).fireForInstance(EffectTiming.OnUseOption, s.inst("chaos"));

    expect(s.state.players[0]!.battleArea).toHaveLength(1);
    expect(s.state.players[0]!.security.map((card) => card.instanceId)).toEqual([
      s.inst("oldTop").instanceId,
    ]);
    expect(s.state.players[0]!.trash).toHaveLength(0);
  });
});
