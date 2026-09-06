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
            { tokens: ["X Antibody"], match: "trait" },
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

  it("still unsuspends without an Examon or X Antibody digivolution card but does not trash security", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT21-052", as: "examonX", suspended: true, under: ["BT1-009"] }] },
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
});
