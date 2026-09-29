import { describe, it, expect } from "vitest";
import { EffectTiming, type PlayerState } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { observe } from "../../engine/testkit/observe.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "../BT9/BT9-103.js";
import "../EX2/EX2-056.js";
import "../ST16/ST16-07.js";
import "./ST10-14.js";

const FILLER = ["BT1-009", "BT1-013", "BT1-009", "BT1-013", "BT1-009"];

describe("ST10-14 [Main] place an opponent Digimon onto their security (top), then trash the top", () => {
  it("places the opponent Digimon's top card to their security and trashes it (toTop)", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: ["BT1-045", "BT10-079"],
          hand: [{ card: "ST10-14", as: "option" }],
        },
        1: { battleArea: [{ card: "BT1-009", dp: 3000, as: "oppDigimon" }] },
      },
      { autoAcceptOptional: true, autoChooseOption: true, autoOrderTriggers: true, autoSelectCards: true },
    );
    const p1 = s.state.players[1] as PlayerState;
    const oppTopId = s.perm("oppDigimon").topCard!.instanceId;
    s.state.memory = 8;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
      ok: true,
    });

    await settle(() => p1.trash.some((c) => c.instanceId === oppTopId));

    expect(p1.trash.some((c) => c.instanceId === oppTopId)).toBe(true);
    expect(p1.battleArea.some((perm) => perm.topCard?.instanceId === oppTopId)).toBe(false);
  });

  it("may place an opposing Digimon in security without trashing it from Security", async () => {
    const s = setupEngine(
      {
        0: { security: [{ card: "ST10-14", as: "option", faceUp: true }] },
        1: { battleArea: [{ card: "ST10-07", as: "target" }] },
      },
      { autoChooseOption: true, autoOrderTriggers: true, autoSelectCards: true },
    );
    const id = s.perm("target").topCard.instanceId;
    const firing = advance(s.engine).fireForInstance(EffectTiming.SecuritySkill, s.inst("option"));
    await settle(() => s.state.pendingDecision?.kind === "optional");
    const optional = s.decisions.at(-1)!.req;
    expect(optional.sourceCardId).toBe("ST10-14");
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: optional.decisionId,
        response: { kind: "optional", accept: true },
      }),
    ).toEqual({ ok: true });
    await firing;
    expect(s.state.players[1]!.battleArea).toHaveLength(0);
    expect(s.state.players[1]!.security.some((c) => c.instanceId === id)).toBe(true);
    expect(s.state.players[1]!.trash).toHaveLength(0);
    expect(s.decisions.filter(({ req }) => req.kind === "optional" && req.sourceCardId === "ST10-14")).toHaveLength(1);
  });

  it("trashes the previous security top when the Digimon is placed at the bottom", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: ["BT1-045", "BT10-079"],
          hand: [{ card: "ST10-14", as: "option" }],
        },
        1: {
          battleArea: [
            {
              card: "BT1-009",
              as: "target",
              under: [{ card: "BT1-002", as: "source" }],
            },
          ],
          security: [{ card: "BT1-001", as: "oldTop" }],
        },
      },
      { autoOrderTriggers: true, autoSelectCards: true, preferOptionIndex: 1 },
    );
    s.state.memory = 8;
    const targetId = s.perm("target").topCard.instanceId;

    expect(
      s.engine.applyIntent(0, {
        type: "playCard",
        instanceId: s.inst("option").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.trash.some((card) => card.instanceId === s.inst("oldTop").instanceId));

    expect(s.state.players[1]!.security.map((card) => card.instanceId)).toEqual([targetId]);
    expect(s.state.players[1]!.trash.map((card) => card.instanceId)).toContain(s.inst("oldTop").instanceId);
    expect(s.state.players[1]!.trash.map((card) => card.instanceId)).toContain(s.inst("source").instanceId);
  });

  it("does not trash security when Kongou prevents the placement", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "BT9-103", as: "kongou" }],
          battleArea: [{ card: "BT1-009", as: "target" }],
          security: [{ card: "BT1-001", as: "oldTop" }],
        },
        1: {
          hand: [{ card: "ST10-14", as: "chaos" }],
        },
      },
      { autoOrderTriggers: true, autoSelectCards: true, preferOptionIndex: 1 },
    );
    await advance(s.engine).fireForInstance(EffectTiming.OnUseOption, s.inst("kongou"));
    await advance(s.engine).fireForInstance(EffectTiming.OnUseOption, s.inst("chaos"));

    expect(s.state.players[0]!.battleArea).toHaveLength(1);
    expect(s.state.players[0]!.security.map((card) => card.instanceId)).toEqual([s.inst("oldTop").instanceId]);
    expect(s.state.players[0]!.trash).toHaveLength(0);
  });
});

describe("ST10-14 Chaos Degradation — KB Q&A rulings", () => {
  async function playChaosDegradationOnto(optionIndex: 0 | 1) {
    const s = setupEngine(
      {
        0: {
          battleArea: ["BT1-045", "BT10-079"],
          hand: [{ card: "ST10-14", as: "chaos" }],
        },
        1: {
          battleArea: [{ card: "BT1-009", as: "target", under: [{ card: "BT1-002", as: "source" }] }],
          security: [{ card: "BT1-001", as: "oldTop" }],
        },
      },
      { autoOrderTriggers: true, autoSelectCards: true, autoChooseOption: true, preferOptionIndex: optionIndex },
    );
    s.state.memory = 8;
    const targetId = s.perm("target").topCard.instanceId;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("chaos").instanceId })).toEqual({
      ok: true,
    });
    await settle(() =>
      s.state.players[1]!.trash.some(
        (card) => card.instanceId === s.inst("oldTop").instanceId || card.instanceId === targetId,
      ),
    );
    return { s, targetId };
  }

  it("trashes the opponent's Digimon when it is placed at the top of their security (Q746)", async () => {
    const top = await playChaosDegradationOnto(0);
    const topOpponent = top.s.state.players[1]!;
    expect(topOpponent.battleArea).toHaveLength(0);
    expect(topOpponent.trash.map((card) => card.instanceId)).toContain(top.targetId);
    expect(topOpponent.security.map((card) => card.instanceId)).toEqual([top.s.inst("oldTop").instanceId]);

    const bottom = await playChaosDegradationOnto(1);
    const bottomOpponent = bottom.s.state.players[1]!;
    expect(bottomOpponent.security.map((card) => card.instanceId)).toEqual([bottom.targetId]);
    expect(bottomOpponent.trash.map((card) => card.instanceId)).not.toContain(bottom.targetId);
  });

  it("cannot place the Digimon in security while the opponent's Kongou is active, so the Digimon stays (Q747)", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: ["BT1-045", "BT10-079"],
          hand: [{ card: "ST10-14", as: "chaos" }],
          deck: [...FILLER],
          security: [...FILLER],
        },
        1: {
          battleArea: ["BT2-052", { card: "BT1-009", as: "target" }],
          hand: [{ card: "BT9-103", as: "kongou" }],
          deck: [...FILLER],
          security: [{ card: "BT1-001", as: "oldTop" }],
        },
      },
      { autoDeclineOptional: true, autoOrderTriggers: true, autoSelectCards: true, autoChooseOption: true },
    );
    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    advance(s.engine).endMainPhaseIfOpen(0);

    await advance(s.engine).waitForMainPhase(1);
    s.state.memory = 5;
    expect(s.engine.applyIntent(1, { type: "playCard", instanceId: s.inst("kongou").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[1]!.trash.some((card) => card.instanceId === s.inst("kongou").instanceId));
    advance(s.engine).endMainPhaseIfOpen(1);

    await advance(s.engine).waitForMainPhase(0);
    s.state.memory = 8;
    const targetId = s.perm("target").topCard.instanceId;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("chaos").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.trash.some((card) => card.instanceId === s.inst("chaos").instanceId));

    const opponent = s.state.players[1]!;
    expect(opponent.battleArea).toHaveLength(2);
    expect(opponent.battleArea.map((permanent) => permanent.topCard.instanceId)).toContain(targetId);
    expect(opponent.security.map((card) => card.instanceId)).toEqual([s.inst("oldTop").instanceId]);
    expect(opponent.trash.map((card) => card.instanceId)).not.toContain(s.inst("oldTop").instanceId);

    expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  it("does not trigger [On Deletion] or deletion watchers when the Digimon is placed on top of security and trashed (Q748)", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: ["BT1-045", "BT10-079", { card: "EX2-056", as: "takato" }],
          hand: [{ card: "ST10-14", as: "chaos" }],
        },
        1: {
          battleArea: [{ card: "ST16-07", as: "meramon" }],
          security: [{ card: "BT1-001", as: "oldTop" }],
        },
      },
      { autoAcceptOptional: true, autoOrderTriggers: true, autoSelectCards: true, autoChooseOption: true },
    );
    s.state.memory = 10;
    const meramonId = s.perm("meramon").topCard.instanceId;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("chaos").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[1]!.trash.some((card) => card.instanceId === meramonId));

    expect(s.state.players[1]!.trash.map((card) => card.instanceId)).toContain(meramonId);
    expect(s.state.memory).toBe(2);
    expect(s.perm("takato").isSuspended).toBe(false);

    const deletedMeramon = s.putOnBoard(1, { card: "ST16-07", as: "deletedMeramon" });
    await advance(s.engine).verb.deletePermanent([deletedMeramon.permanentId], "byEffect");
    await settle(() => s.perm("takato").isSuspended);

    expect(s.perm("takato").isSuspended).toBe(true);
    expect(s.state.memory).toBe(2);
  });

  it("cannot place the Digimon in security after the opponent's Kongou security effect activates this turn (Q1909)", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: ["BT1-045", { card: "BT10-079", as: "attacker" }],
          hand: [{ card: "ST10-14", as: "chaos" }],
          deck: [...FILLER],
          security: [...FILLER],
        },
        1: {
          battleArea: [{ card: "BT1-009", as: "target" }],
          deck: [...FILLER],
          security: [
            { card: "BT9-103", as: "kongou" },
            { card: "BT1-001", as: "remaining" },
          ],
        },
      },
      { autoDeclineOptional: true, autoOrderTriggers: true, autoSelectCards: true, autoChooseOption: true },
    );
    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("attacker").isSuspended && !observe(s.engine).isAttacking());
    await advance(s.engine).finishAttack();
    expect(s.state.players[1]!.trash.map((card) => card.instanceId)).toContain(s.inst("kongou").instanceId);
    expect(s.state.players[1]!.security.map((card) => card.instanceId)).toEqual([s.inst("remaining").instanceId]);

    s.state.memory = 8;
    const targetId = s.perm("target").topCard.instanceId;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("chaos").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.trash.some((card) => card.instanceId === s.inst("chaos").instanceId));

    const opponent = s.state.players[1]!;
    expect(opponent.battleArea.map((permanent) => permanent.topCard.instanceId)).toEqual([targetId]);
    expect(opponent.security.map((card) => card.instanceId)).toEqual([s.inst("remaining").instanceId]);
    expect(opponent.trash.map((card) => card.instanceId)).not.toContain(s.inst("remaining").instanceId);

    expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });
});
