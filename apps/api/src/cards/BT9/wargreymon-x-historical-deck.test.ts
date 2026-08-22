import { describe, expect, it } from "vitest";
import { assertNoLoudGap, setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "../BT1/BT1-025.js";
import "../ST1/ST1-16.js";
import "./BT9-012.js";
import "./BT9-015.js";
import "./BT9-016.js";

describe("BT9 WarGreymon X historical deck gauntlet", () => {
  it("carries MetalGreymon X buffs through evolution, profits from checks, deletes, and survives Gaia Force", async () => {
    const preferredIds: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [
            {
              card: "BT1-021",
              as: "metalGreymon",
              under: [
                { card: "BT9-012", as: "greymonXSource" },
                { card: "BT1-016", as: "tyrannomonSource" },
              ],
            },
          ],
          hand: [
            { card: "BT9-015", as: "metalGreymonX" },
            { card: "BT1-025", as: "warGreymon" },
            { card: "BT9-016", as: "warGreymonX" },
          ],
          deck: ["BT1-001", "BT1-002", "BT1-003"],
        },
        1: {
          hand: [{ card: "ST1-16", as: "gaiaForce" }],
          battleArea: [
            { card: "BT8-084", as: "endAttackTarget", dp: 11000 },
            { card: "ST1-12", as: "redColorSource" },
          ],
          security: ["BT1-001", "BT1-002", "BT1-003"],
        },
      },
      {
        autoAcceptOptional: true,
        autoSelectCards: true,
        autoOrderTriggers: true,
        preferInstanceIds: preferredIds,
      },
    );
    preferredIds.push(
      s.perm("endAttackTarget").permanentId,
      s.inst("greymonXSource").instanceId,
      s.inst("tyrannomonSource").instanceId,
      s.perm("metalGreymon").permanentId,
    );
    const hostId = s.perm("metalGreymon").permanentId;
    const greymonXSourceId = s.inst("greymonXSource").instanceId;
    const tyrannomonSourceId = s.inst("tyrannomonSource").instanceId;
    const originalMetalGreymonId = s.perm("metalGreymon").topCard!.instanceId;
    const metalGreymonXId = s.inst("metalGreymonX").instanceId;
    const endAttackTargetId = s.perm("endAttackTarget").permanentId;
    const gaiaForceId = s.inst("gaiaForce").instanceId;
    s.state.memory = 8;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: hostId,
        instanceId: metalGreymonXId,
      }),
    ).toEqual({ ok: true });
    await settle(() =>
      s.perm("metalGreymon").topCard?.instanceId === metalGreymonXId &&
      s.perm("metalGreymon").currentDP === 11000
    );
    expect(s.perm("metalGreymon").currentDP).toBe(11000);
    expect(observe(s.engine).keywordAmount(s.perm("metalGreymon"), "SecurityAttack")).toBe(1);

    expect(s.engine.applyIntent(0, {
      type: "digivolve",
      permanentId: hostId,
      instanceId: s.inst("warGreymon").instanceId,
    })).toEqual({ ok: true });
    await settle(() =>
      s.perm("metalGreymon").topCard?.instanceId === s.inst("warGreymon").instanceId &&
      s.perm("metalGreymon").currentDP === 14000 &&
      observe(s.engine).keywordAmount(s.perm("metalGreymon"), "SecurityAttack") === 2 &&
      s.state.pendingDecision === undefined
    );
    expect(observe(s.engine).keywordAmount(s.perm("metalGreymon"), "SecurityAttack")).toBe(2);

    expect(s.engine.applyIntent(0, {
      type: "digivolve",
      permanentId: hostId,
      instanceId: s.inst("warGreymonX").instanceId,
    })).toEqual({ ok: true });
    await settle(() =>
      s.perm("metalGreymon").topCard?.instanceId === s.inst("warGreymonX").instanceId &&
      s.perm("metalGreymon").currentDP === 15000 &&
      observe(s.engine).keywordAmount(s.perm("metalGreymon"), "SecurityAttack") === 2 &&
      s.state.pendingDecision === undefined
    );

    expect(s.state.memory).toBe(4);
    expect(s.perm("metalGreymon").currentDP).toBe(15000);
    expect(observe(s.engine).keywordAmount(s.perm("metalGreymon"), "SecurityAttack")).toBe(2);

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: hostId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() =>
      !observe(s.engine).isAttacking() &&
      !s.state.players[1]!.battleArea.some(({ permanentId }) => permanentId === endAttackTargetId)
    );

    expect(s.state.players[1]!.security).toHaveLength(0);
    expect(s.state.memory).toBe(7);
    expect(s.state.players[1]!.battleArea.map(({ permanentId }) => permanentId)).toEqual([
      s.perm("redColorSource").permanentId,
    ]);

    s.state.turnSeat = 1;
    s.state.memory = 8;
    expect(
      s.engine.applyIntent(1, {
        type: "playCard",
        instanceId: gaiaForceId,
      }),
    ).toEqual({ ok: true });
    await settle(() =>
      s.state.pendingDecision === undefined &&
      s.state.players[0]!.trash.some(({ instanceId }) => instanceId === greymonXSourceId) &&
      s.state.players[0]!.trash.some(({ instanceId }) => instanceId === tyrannomonSourceId) &&
      s.state.players[1]!.trash.some(({ instanceId }) => instanceId === gaiaForceId)
    );

    const protectionChoice = s.decisions.find(({ req }) =>
      req.kind === "selectCards" &&
      req.options?.candidateInstanceIds?.includes(greymonXSourceId)
    )?.req;
    expect(new Set(protectionChoice?.options?.candidateInstanceIds ?? [])).toEqual(
      new Set([
        greymonXSourceId,
        tyrannomonSourceId,
        originalMetalGreymonId,
        metalGreymonXId,
      ]),
    );
    expect(s.state.players[0]!.battleArea.map(({ permanentId }) => permanentId)).toEqual([hostId]);
    expect(s.perm("metalGreymon").stack.map(({ instanceId }) => instanceId)).toEqual([
      originalMetalGreymonId,
      metalGreymonXId,
      s.inst("warGreymon").instanceId,
    ]);
    expect(s.state.players[1]!.trash.some(({ instanceId }) => instanceId === gaiaForceId)).toBe(true);
    assertNoLoudGap(s);
  });
});
