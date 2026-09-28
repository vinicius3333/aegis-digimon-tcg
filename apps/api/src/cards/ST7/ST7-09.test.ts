import { describe, expect, it } from "vitest";
import { EffectDuration } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "./ST7-09.js";

describe("ST7-09 Gallantmon", () => {
  it("has Security Attack +1 and deletes an opposing 4000 DP Digimon when attacking", async () => {
    const s = setupEngine(
      { 0: { battleArea: [{ card: "ST7-09", as: "gallant" }] }, 1: { battleArea: ["ST7-04"], security: ["ST7-01"] } },
      { autoSelectCards: true, autoOrderTriggers: true },
    );
    await s.ready();
    expect(observe(s.engine).keywordAmount(s.perm("gallant"), "SecurityAttack")).toBe(1);
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("gallant").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.battleArea.length === 0);
    expect(s.perm("gallant").currentDP).toBe(11000);
  });

  it("gets +3000 DP when its attack effect deletes nothing", async () => {
    const s = setupEngine(
      { 0: { battleArea: [{ card: "ST7-09", as: "gallant" }] }, 1: { security: ["ST7-01"] } },
      { autoOrderTriggers: true },
    );
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("gallant").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("gallant").currentDP === 14000);
    expect(s.perm("gallant").currentDP).toBe(14000);
  });

  it("gets +3000 after choosing a target protected from effect deletion", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "ST7-09", as: "gallant" }] },
        1: { battleArea: [{ card: "ST7-04", as: "protected" }], security: ["ST7-01"] },
      },
      { autoSelectCards: true, autoOrderTriggers: true },
    );
    advance(s.engine).ledgers.continuous.addRestriction(
      s.perm("protected").permanentId,
      "beDeleted",
      EffectDuration.Permanent,
      { byOpponentEffectsOnly: true },
    );
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("gallant").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    const combat = (s.engine as unknown as { combat: { hasOpenBlockWindow: boolean } }).combat;
    await settle(() => combat.hasOpenBlockWindow);
    expect(s.engine.applyIntent(1, { type: "declineBlock" })).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.security.length === 0);
    expect(s.state.players[1]!.battleArea).toHaveLength(1);
    expect(s.perm("gallant").currentDP).toBe(14000);
  });
});

type GallantmonHarness = ReturnType<typeof setupEngine>;

function attackPlayer(s: GallantmonHarness) {
  return s.engine.applyIntent(0, {
    type: "attack",
    attackerPermanentId: s.perm("gallant").permanentId,
    target: { kind: "player" },
  });
}

function protectFromOpponentDeletion(s: GallantmonHarness, alias: string) {
  advance(s.engine).ledgers.continuous.addRestriction(
    s.perm(alias).permanentId,
    "beDeleted",
    EffectDuration.Permanent,
    { byOpponentEffectsOnly: true },
  );
}

async function openDeletionChoice(s: GallantmonHarness) {
  expect(attackPlayer(s)).toEqual({ ok: true });
  await settle(() => s.state.pendingDecision?.kind === "chooseTargets");
  return s.decisions.at(-1)!.req;
}

describe("ST7-09 Gallantmon — KB Q&A rulings", () => {
  it("follows the 'if no Digimon was deleted' branch when the opponent has no Digimon with 4000 DP or less (Q689)", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "ST7-09", as: "gallant" }] },
        1: { battleArea: [{ card: "ST7-06", as: "tooStrong" }], security: ["ST7-01"] },
      },
      { autoSelectCards: false, autoOrderTriggers: true },
    );
    await s.ready();
    expect(s.perm("tooStrong").currentDP).toBe(5000);
    expect(attackPlayer(s)).toEqual({ ok: true });
    await settle(() => s.perm("gallant").currentDP === 14000);
    expect(s.perm("gallant").currentDP).toBe(14000);
    expect(s.state.players[1]!.battleArea.map((permanent) => permanent.permanentId)).toEqual([
      s.perm("tooStrong").permanentId,
    ]);

    const onlyUndeletable = setupEngine(
      {
        0: { battleArea: [{ card: "ST7-09", as: "gallant" }] },
        1: { battleArea: [{ card: "ST7-02", as: "protected" }], security: ["ST7-01"] },
      },
      { autoSelectCards: true, autoOrderTriggers: true },
    );
    await onlyUndeletable.ready();
    protectFromOpponentDeletion(onlyUndeletable, "protected");
    expect(attackPlayer(onlyUndeletable)).toEqual({ ok: true });
    await settle(() => onlyUndeletable.perm("gallant").currentDP === 14000);
    expect(onlyUndeletable.perm("gallant").currentDP).toBe(14000);
    expect(onlyUndeletable.state.players[1]!.battleArea.map((permanent) => permanent.permanentId)).toEqual([
      onlyUndeletable.perm("protected").permanentId,
    ]);
  });

  it("must delete an opposing Digimon with 4000 DP or less instead of skipping it for +3000 DP (Q690)", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "ST7-09", as: "gallant" }] },
        1: {
          battleArea: [
            { card: "ST7-04", as: "target" },
            { card: "ST7-02", as: "other" },
          ],
          security: ["ST7-01"],
        },
      },
      { autoSelectCards: false, autoOrderTriggers: true },
    );
    await s.ready();
    const decision = await openDeletionChoice(s);
    expect(decision.options?.min).toBe(1);
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: decision.decisionId,
        response: { kind: "chooseTargets", instanceIds: [] },
      }).ok,
    ).toBe(false);
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: decision.decisionId,
        response: { kind: "chooseTargets", instanceIds: [s.perm("target").permanentId] },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.battleArea.length === 1);
    expect(s.state.players[1]!.battleArea.map((permanent) => permanent.permanentId)).toEqual([
      s.perm("other").permanentId,
    ]);
    expect(s.perm("gallant").currentDP).toBe(11000);
  });

  it("gets +3000 DP when it chooses a 4000 DP or less Digimon that can't be deleted, even with a deletable one available (Q691)", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "ST7-09", as: "gallant" }] },
        1: {
          battleArea: [
            { card: "ST7-04", as: "protected" },
            { card: "ST7-02", as: "deletable" },
          ],
          security: ["ST7-01"],
        },
      },
      { autoSelectCards: false, autoOrderTriggers: true },
    );
    await s.ready();
    protectFromOpponentDeletion(s, "protected");
    const decision = await openDeletionChoice(s);
    expect(decision.options?.candidateInstanceIds).toEqual(
      expect.arrayContaining([s.perm("protected").permanentId, s.perm("deletable").permanentId]),
    );
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: decision.decisionId,
        response: { kind: "chooseTargets", instanceIds: [s.perm("protected").permanentId] },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("gallant").currentDP === 14000);
    expect(s.perm("gallant").currentDP).toBe(14000);
    expect(s.state.players[1]!.battleArea.map((permanent) => permanent.permanentId).sort()).toEqual(
      [s.perm("protected").permanentId, s.perm("deletable").permanentId].sort(),
    );
  });
});
