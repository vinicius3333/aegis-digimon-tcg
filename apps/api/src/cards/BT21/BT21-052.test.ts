import { EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { compiled } from "./BT21-052.js";
import "../index.js";

describe("BT21-052 Examon (X Antibody)", () => {
  it("preserves the Examon alternate Digivolution requirement", () => {
    expect(compiled.digivolutionRequirement).toEqual([{ namesExact: ["Examon"], cost: 2, isAlternate: true }]);
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual ?? []).toEqual([]);
  });

  it("models the printed keywords and When Digivolving sequence", () => {
    expect(compiled.effects.filter((effect) => effect.keywords?.length)).toHaveLength(3);
    expect(compiled.effects.flatMap((effect) => effect.keywords ?? []).map((keyword) => keyword.keyword)).toEqual([
      "Piercing",
      "Blocker",
      "Evade",
    ]);
    const effect = compiled.effects.find((entry) => entry.trigger === "WhenDigivolving");

    expect(effect?.actions).toEqual([
      {
        kind: "Suspend",
        target: { filter: { controller: "opponent", kind: ["Digimon", "Tamer"] }, count: "all" },
      },
      {
        kind: "Delete",
        target: {
          filter: { controller: "opponent", suspended: true, kind: ["Digimon", "Tamer"] },
          count: 1,
        },
      },
    ]);
  });

  it("keeps the once-per-turn suspension watcher scoped to its own trigger", () => {
    const effect = compiled.effects.find((entry) => entry.trigger === "AllTurns");
    const watcher = effect?.actions[0];

    expect(effect?.frequency).toBe("OncePerTurn");
    expect(watcher).toMatchObject({
      kind: "SubTrigger",
      event: "whenSuspended",
      sourceFilter: { isSelfRef: true },
    });
    const watcherActions = (watcher as { actions?: unknown[] } | undefined)?.actions;
    expect(watcherActions).toHaveLength(2);
    expect(watcherActions?.[1]).toMatchObject({
      kind: "trashSecurityTop",
      controller: "opponent",
      count: 1,
      condition: {
        kind: "selfDigivolutionStackHasTrait",
        filter: {
          nameOrTrait: [
            { tokens: ["Examon"], match: "nameExact" },
            { tokens: ["X Antibody"], match: "nameExact" },
          ],
        },
      },
    });
    expect(watcherActions?.[0]).toEqual({
      kind: "Unsuspend",
      target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
    });
  });

  it("suspends every opposing Digimon and Tamer, then deletes exactly one suspended target", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT21-052", as: "examonX" }] },
        1: {
          battleArea: [
            { card: "BT1-009", as: "digimonA" },
            { card: "BT1-010", as: "digimonB" },
            { card: "BT1-085", as: "tamer" },
          ],
        },
      },
      { autoSelectCards: true, preferInstanceIds: preferred },
    );
    preferred.push(s.perm("tamer").topCard.instanceId);
    await s.ready();
    const originalIds = new Set(s.state.players[1]!.battleArea.map((permanent) => permanent.permanentId));

    await advance(s.engine).fire(EffectTiming.WhenDigivolving, s.perm("examonX"));
    await settle(() => s.state.players[1]!.trash.some((card) => card.instanceId === s.inst("tamer").instanceId));

    expect(s.state.players[1]!.battleArea).toHaveLength(2);
    expect(s.state.players[1]!.battleArea.every((permanent) => permanent.isSuspended)).toBe(true);
    expect(s.state.players[1]!.battleArea.every((permanent) => originalIds.has(permanent.permanentId))).toBe(true);
  });

  it("unsuspends itself, trashes top security with an Examon source, and spends the once-per-turn budget", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT21-052", as: "examonX", suspended: true, under: ["BT20-045"] }] },
      1: {
        security: [
          { card: "BT1-009", as: "top" },
          { card: "BT1-010", as: "bottom" },
        ],
      },
    });
    await s.ready();

    await advance(s.engine).fireSubTrigger("whenSuspended", { subjectPermanentId: s.perm("examonX").permanentId });
    await settle(() => !s.perm("examonX").isSuspended && s.state.players[1]!.security.length === 1);
    expect(s.state.players[1]!.trash[0]!.instanceId).toBe(s.inst("top").instanceId);

    s.perm("examonX").isSuspended = true;
    await advance(s.engine).fireSubTrigger("whenSuspended", { subjectPermanentId: s.perm("examonX").permanentId });
    expect(s.perm("examonX").isSuspended).toBe(true);
    expect(s.state.players[1]!.security).toHaveLength(1);
  });

  it("publicly fires the watcher with an exact X Antibody Option source", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT21-051", as: "host" }],
          hand: [
            { card: "BT9-109", as: "xAntibody" },
            { card: "BT21-052", as: "examonX" },
          ],
          deck: ["BT1-009", "BT1-010"],
        },
        1: { security: ["BT1-001", "BT1-002", "BT1-003", "BT1-004"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("xAntibody").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.perm("host").stack.some((card) => card.cardId === "BT9-109"));
    expect(s.perm("host").stack.map((card) => card.cardId)).toContain("BT9-109");

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("host").permanentId,
        instanceId: s.inst("examonX").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("host").topCard.cardId === "BT21-052");
    const firstSecurity = s.state.players[1]!.security[0]!.instanceId;
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.events.some((event) => event.kind === "securityChecked") && !observe(s.engine).isAttacking());
    expect(s.perm("host").isSuspended).toBe(false);
    expect(s.state.players[1]!.security).toHaveLength(2);
    expect(s.state.players[1]!.trash.some((card) => card.instanceId === firstSecurity)).toBe(true);
  });

  it("does not fire the security-removal branch for a differently named X Antibody Digimon source", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT21-052", as: "examonX", under: ["BT11-074"] }], deck: ["BT1-009"] },
      1: { security: ["BT1-001", "BT1-002"] },
    });
    await s.ready();
    const firstSecurity = s.state.players[1]!.security[0]!.instanceId;
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("examonX").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.events.some((event) => event.kind === "securityChecked") && !observe(s.engine).isAttacking());
    expect(s.perm("examonX").isSuspended).toBe(false);
    expect(s.state.players[1]!.security).toHaveLength(1);
    expect(s.state.players[1]!.trash.some((card) => card.instanceId === firstSecurity)).toBe(true);
  });

  it("still unsuspends without an Examon or X Antibody digivolution card but does not trash security", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT21-052", as: "examonX", suspended: true, under: ["BT1-080"] }] },
      1: { security: [{ card: "BT1-010", as: "security" }] },
    });
    await s.ready();

    await advance(s.engine).fireSubTrigger("whenSuspended", { subjectPermanentId: s.perm("examonX").permanentId });

    expect(s.perm("examonX").isSuspended).toBe(false);
    expect(s.state.players[1]!.security).toHaveLength(1);
  });

  it("alternate-digivolves from Examon for 2 and exposes all three live keywords", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT20-045", as: "examon" }],
          hand: [{ card: "BT21-052", as: "examonX" }],
        },
        1: {
          battleArea: [
            { card: "BT1-009", as: "opponent" },
            { card: "BT1-085", as: "opponentTamer" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 3;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("examon").permanentId,
        instanceId: s.inst("examonX").instanceId,
        alternateRequirementIndex: 0,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("examon").topCard.instanceId === s.inst("examonX").instanceId);
    expect(s.state.memory).toBe(1);
    expect(s.state.players[1]!.battleArea.every((permanent) => permanent.isSuspended)).toBe(true);
    expect(s.state.players[1]!.battleArea).toHaveLength(1);

    const keywords = setupEngine({ 0: { battleArea: [{ card: "BT21-052", as: "examonX" }] } });
    await keywords.ready();
    expect(observe(keywords.engine).hasPierce(keywords.perm("examonX"))).toBe(true);
    for (const keyword of ["Blocker", "Evade"]) {
      expect(observe(keywords.engine).hasKeyword(keywords.perm("examonX"), keyword)).toBe(true);
    }
  });

  it("rejects the exact Examon alternate route from a non-Examon level-6 base", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT20-044", as: "wrongBase" }],
        hand: [{ card: "BT21-052", as: "examonX" }],
      },
    });
    s.state.memory = 3;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("wrongBase").permanentId,
        instanceId: s.inst("examonX").instanceId,
        alternateRequirementIndex: 0,
      }),
    ).toMatchObject({ ok: false });
    expect(s.state.memory).toBe(3);
    expect(s.perm("wrongBase").topCard.cardId).toBe("BT20-044");
  });

  it("publicly unsuspends and trashes security once, then leaves the source suspended on the second attack", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT21-052", as: "examonX", under: ["BT20-045"] }] },
        1: { security: [{ card: "BT1-009", as: "securityTop" }, "BT1-010", "BT1-011", "BT1-012"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    const firstTop = s.inst("securityTop");
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("examonX").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.trash.some((card) => card.instanceId === firstTop.instanceId));
    await settle(() => s.events.some((event) => event.kind === "securityChecked") && !observe(s.engine).isAttacking());
    expect(observe(s.engine).isAttacking()).toBe(false);
    expect(s.perm("examonX").isSuspended).toBe(false);
    expect(s.state.players[1]!.security).toHaveLength(2);

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("examonX").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        s.events.filter((event) => event.kind === "securityChecked").length >= 2 && !observe(s.engine).isAttacking(),
    );
    expect(observe(s.engine).isAttacking()).toBe(false);
    expect(s.perm("examonX").isSuspended).toBe(true);
    expect(s.state.players[1]!.security).toHaveLength(1);
    expect(s.state.players[1]!.trash.filter((card) => card.instanceId === firstTop.instanceId)).toHaveLength(1);
  });

  it("uses Piercing in a real battle and performs the additional security check", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT21-052", as: "examonX" }] },
      1: {
        battleArea: [{ card: "BT1-009", as: "victim", suspended: true }],
        security: ["BT1-001"],
      },
    });
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("examonX").permanentId,
        target: { kind: "permanent", permanentId: s.perm("victim").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.events.some((event) => event.kind === "securityChecked") && !observe(s.engine).isAttacking());
    expect(s.state.players[1]!.battleArea.some((perm) => perm.permanentId === s.perm("victim").permanentId)).toBe(
      false,
    );
    expect(s.state.players[1]!.security).toHaveLength(0);
  });

  it("uses Blocker in a real opponent attack and keeps the defending security stack", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT1-009", as: "attacker" }], security: ["BT1-001"] },
      1: { battleArea: [{ card: "BT21-052", as: "examonX" }], security: ["BT1-002"] },
    });
    s.state.turnSeat = 0;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.events.some((event) => event.kind === "blockWindowOpened"));
    expect(
      s.engine.applyIntent(1, { type: "declareBlock", blockerPermanentId: s.perm("examonX").permanentId }),
    ).toEqual({
      ok: true,
    });
    await settle(() => s.events.some((event) => event.kind === "combatResolved") && !observe(s.engine).isAttacking());
    expect(s.state.players[1]!.security).toHaveLength(1);
    expect(s.state.players[0]!.battleArea.some((perm) => perm.permanentId === s.perm("attacker").permanentId)).toBe(
      false,
    );
    expect(s.state.players[1]!.battleArea.some((perm) => perm.permanentId === s.perm("examonX").permanentId)).toBe(
      true,
    );
  });

  it.each([false, true])("uses Evade only while unsuspended (initially suspended: %s)", async (suspended) => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT1-009", as: "redSource" }], hand: [{ card: "ST1-16", as: "gaiaForce" }] },
        1: { battleArea: [{ card: "BT21-052", as: "target", suspended }] },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();
    const targetId = s.perm("target").permanentId;
    const targetCardId = s.inst("target").instanceId;
    const optionId = s.inst("gaiaForce").instanceId;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: optionId })).toEqual({ ok: true });
    if (!suspended) {
      await settle(() => s.events.some((event) => event.kind === "evadePrompt"));
      expect(s.events.some((event) => event.kind === "evadePrompt")).toBe(true);
      expect(s.engine.applyIntent(1, { type: "respondEvade", permanentId: targetId, accept: true })).toEqual({
        ok: true,
      });
    }
    await settle(
      () =>
        s.state.players[0]!.trash.some((card) => card.instanceId === optionId) && s.state.pendingDecision === undefined,
    );
    expect(s.state.players[0]!.trash.some((card) => card.instanceId === optionId)).toBe(true);
    if (suspended) {
      expect(s.events.some((event) => event.kind === "evadePrompt")).toBe(false);
      expect(s.state.players[1]!.battleArea).toHaveLength(0);
      expect(s.state.players[1]!.trash.some((card) => card.instanceId === targetCardId)).toBe(true);
    } else {
      expect(s.events.some((event) => event.kind === "evadeResolved")).toBe(true);
      expect(s.perm("target").topCard.instanceId).toBe(targetCardId);
      // Evade pays by suspending; Examon X's own All Turns watcher then unsuspends it.
      expect(s.perm("target").isSuspended).toBe(false);
    }
  });
});
