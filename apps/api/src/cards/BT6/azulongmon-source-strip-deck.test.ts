import { describe, expect, it } from "vitest";
import { assertNoLoudGap, setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "./BT6-027.js";
import "./BT6-029.js";

describe("BT6 Azulongmon source-strip deck gauntlet", () => {
  it("strips top then bottom sources, gains three memory, and reattacks for eight checks", async () => {
    const preferredIds: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "AD1-010", as: "blueLevelFour" }],
          hand: [
            { card: "BT6-027", as: "majiramon" },
            { card: "BT6-029", as: "azulongmon" },
          ],
          deck: ["BT1-001", "BT1-002"],
        },
        1: {
          battleArea: [
            {
              card: "BT2-020",
              as: "twoSources",
              under: [
                { card: "BT1-010", as: "bottomSource" },
                { card: "BT1-011", as: "topSource" },
              ],
            },
            {
              card: "BT2-017",
              as: "oneSource",
              under: [{ card: "BT1-012", as: "onlySource" }],
            },
            { card: "BT1-014", as: "alreadyEmpty" },
          ],
          security: [
            "BT1-001", "BT1-002", "BT1-003", "BT1-004",
            "BT1-005", "BT1-006", "BT1-007", "BT1-008",
          ],
        },
      },
      {
        autoSelectCards: true,
        autoOrderTriggers: true,
        preferInstanceIds: preferredIds,
      },
    );
    preferredIds.push(s.perm("twoSources").permanentId);
    const twoSourcesId = s.perm("twoSources").permanentId;
    const oneSourceId = s.perm("oneSource").permanentId;
    const topSourceId = s.inst("topSource").instanceId;
    const bottomSourceId = s.inst("bottomSource").instanceId;
    const onlySourceId = s.inst("onlySource").instanceId;
    const hostId = s.perm("blueLevelFour").permanentId;
    s.state.memory = 8;
    await s.ready();

    expect(s.engine.applyIntent(0, {
      type: "digivolve",
      permanentId: hostId,
      instanceId: s.inst("majiramon").instanceId,
    })).toEqual({ ok: true });
    await settle(() =>
      s.perm("twoSources").stack.length === 1 &&
      s.state.players[1]!.trash.some(({ instanceId }) => instanceId === topSourceId) &&
      s.state.pendingDecision === undefined
    );

    const topStripChoice = s.decisions.find(({ req }) =>
      req.kind === "chooseTargets" &&
      req.options?.candidateInstanceIds?.includes(twoSourcesId)
    )?.req;
    expect(new Set(topStripChoice?.options?.candidateInstanceIds ?? [])).toEqual(
      new Set([twoSourcesId, oneSourceId]),
    );
    expect(s.perm("twoSources").stack.map(({ instanceId }) => instanceId)).toEqual([bottomSourceId]);
    expect(s.perm("oneSource").stack.map(({ instanceId }) => instanceId)).toEqual([onlySourceId]);
    expect(s.state.memory).toBe(5);

    expect(s.engine.applyIntent(0, {
      type: "digivolve",
      permanentId: hostId,
      instanceId: s.inst("azulongmon").instanceId,
    })).toEqual({ ok: true });
    await settle(() =>
      s.state.memory === 3 &&
      s.perm("twoSources").stack.length === 0 &&
      s.perm("oneSource").stack.length === 0 &&
      observe(s.engine).keywordAmount(s.perm("blueLevelFour"), "SecurityAttack") === 3 &&
      s.state.pendingDecision === undefined
    );

    expect(s.state.players[1]!.trash.some(({ instanceId }) => instanceId === bottomSourceId)).toBe(true);
    expect(s.state.players[1]!.trash.some(({ instanceId }) => instanceId === onlySourceId)).toBe(true);
    expect(s.state.memory).toBe(3);
    expect(observe(s.engine).keywordAmount(s.perm("blueLevelFour"), "SecurityAttack")).toBe(3);

    expect(s.engine.applyIntent(0, {
      type: "attack",
      attackerPermanentId: hostId,
      target: { kind: "player" },
    })).toEqual({ ok: true });
    await settle(() =>
      !observe(s.engine).isAttacking() &&
      !s.perm("blueLevelFour").isSuspended &&
      s.state.players[1]!.security.length === 4
    );

    expect(s.engine.applyIntent(0, {
      type: "attack",
      attackerPermanentId: hostId,
      target: { kind: "player" },
    })).toEqual({ ok: true });
    await settle(() => !observe(s.engine).isAttacking() && s.state.players[1]!.security.length === 0);

    expect(s.perm("blueLevelFour").isSuspended).toBe(true);
    expect(s.engine.applyIntent(0, {
      type: "attack",
      attackerPermanentId: hostId,
      target: { kind: "player" },
    }).ok).toBe(false);
    assertNoLoudGap(s);
  });
});
