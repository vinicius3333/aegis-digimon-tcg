import { EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { compiled } from "./BT24-018.js";
import "../index.js";
import "../BT8/BT8-012.js";

describe("BT24-018 Styracomon", () => {
  it("trashes an opponent security card and may unsuspend on digivolution", () => {
    const effect = compiled.effects.find((entry) => entry.trigger === "WhenDigivolving") as any;
    expect(effect.actions[0]).toMatchObject({
      kind: "Trash",
      optional: true,
      target: { filter: { controller: "opponent", zone: "security" } },
    });
    expect(effect.actions[1]).toMatchObject({ kind: "Unsuspend", optional: true });
  });

  it("uses an executable lowest-DP opponent deletion cost for leave prevention", () => {
    const replacement = compiled.effects.find(
      (entry) => entry.trigger === "AllTurns" && entry.actions?.[0]?.kind === "Replacement",
    )?.actions?.[0] as any;
    expect(replacement).toMatchObject({
      kind: "Replacement",
      event: "wouldLeavePlay",
      affectsAll: true,
      target: { filter: { controller: "mine" }, upTo: true },
    });
    expect(replacement.cost).toMatchObject({
      kind: "deleteOwn",
      target: { filter: { controller: "opponent", superlative: "lowestDP" } },
    });
  });

  it("trashes a chosen opposing security card and unsuspends", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT24-018", as: "styracomon", suspended: true }] },
        1: {
          security: [
            { card: "BT1-001", as: "top" },
            { card: "BT1-002", as: "chosen" },
            { card: "BT1-003", as: "bottom" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferred },
    );
    preferred.push(s.inst("chosen").instanceId);

    await advance(s.engine).fire(EffectTiming.WhenDigivolving, s.perm("styracomon"));

    expect(s.state.players[1]!.security.map((card) => card.instanceId)).toEqual([
      s.inst("top").instanceId,
      s.inst("bottom").instanceId,
    ]);
    expect(s.state.players[1]!.trash.map((card) => card.instanceId)).toContain(s.inst("chosen").instanceId);
    expect(s.perm("styracomon").isSuspended).toBe(false);
  });

  it("may still unsuspend when there is no security card to trash", async () => {
    const s = setupEngine(
      { 0: { battleArea: [{ card: "BT24-018", as: "styracomon", suspended: true }] } },
      { autoAcceptOptional: true, autoSelectCards: true },
    );

    await advance(s.engine).fire(EffectTiming.WhenDigivolving, s.perm("styracomon"));

    expect(s.perm("styracomon").isSuspended).toBe(false);
  });

  it("may delete one opposing Digimon only when opposing security is removed, once per turn", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT24-018", as: "styracomon" }] },
        1: {
          battleArea: [
            { card: "BT1-009", as: "first" },
            { card: "BT1-009", as: "second" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    await advance(s.engine).fire(EffectTiming.OnStartMainPhase, s.perm("styracomon"));

    await advance(s.engine).fireSubTrigger("whenSecurityRemoved", { removedFromSecuritySeat: 0 });
    expect(s.state.players[1]!.battleArea).toHaveLength(2);
    await advance(s.engine).fireSubTrigger("whenSecurityRemoved", { removedFromSecuritySeat: 1 });
    await advance(s.engine).fireSubTrigger("whenSecurityRemoved", { removedFromSecuritySeat: 1 });

    expect(s.state.players[1]!.battleArea).toHaveLength(1);
  });

  it("deletes one lowest-DP opponent to protect all simultaneously leaving Reptile and Dragonkin Digimon", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT24-018", as: "styracomon" },
            { card: "BT24-012", as: "reptile" },
            { card: "BT24-014", as: "dragonkin" },
          ],
        },
        1: {
          battleArea: [
            { card: "BT1-009", as: "lowest", dp: 3000 },
            { card: "BT1-009", as: "higher", dp: 5000 },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    expect(
      await advance(s.engine).verb.deletePermanent(
        [s.perm("styracomon").permanentId, s.perm("reptile").permanentId, s.perm("dragonkin").permanentId],
        "byEffect",
      ),
    ).toBe(0);

    expect(s.state.players[0]!.battleArea).toHaveLength(3);
    expect(s.state.players[1]!.battleArea.map((permanent) => permanent.permanentId)).toEqual([
      s.perm("higher").permanentId,
    ]);
  });

  it("does not prevent leaving when the lowest-DP deletion cost is prevented (Q5599)", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT24-018", as: "styracomon" },
            { card: "BT24-012", as: "leaving" },
          ],
        },
        1: {
          battleArea: [{ card: "BT8-012", as: "armored", dp: 3000, under: ["BT1-009"] }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    expect(observe(s.engine).hasKeyword(s.perm("armored"), "Armor Purge")).toBe(true);

    expect(await advance(s.engine).verb.deletePermanent([s.perm("leaving").permanentId], "byEffect")).toBe(1);

    expect(s.state.players[0]!.battleArea).toHaveLength(1);
    expect(s.state.players[1]!.battleArea).toHaveLength(1);
  });

  it("exposes all keywords and only uses the Lamiamon cost-6 route while Owen is controlled", async () => {
    const allowed = setupEngine({
      0: {
        battleArea: [
          { card: "BT24-016", as: "lamiamon" },
          { card: "BT24-082", as: "owen" },
        ],
        hand: [{ card: "BT24-018", as: "styracomon" }],
      },
    });
    allowed.state.memory = 10;
    await allowed.ready();

    for (const keyword of ["Progress", "Piercing", "Blocker", "Armor Purge"]) {
      expect(observe(allowed.engine).hasKeyword(allowed.perm("lamiamon"), keyword)).toBe(false);
    }
    expect(
      allowed.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: allowed.perm("lamiamon").permanentId,
        instanceId: allowed.inst("styracomon").instanceId,
        useAlternateCost: true,
        alternateRequirementIndex: 0,
      }),
    ).toEqual({ ok: true });
    await settle(() => allowed.perm("lamiamon").topCard.instanceId === allowed.inst("styracomon").instanceId);
    await allowed.ready();
    expect(allowed.state.memory).toBe(4);
    expect(observe(allowed.engine).hasKeyword(allowed.perm("lamiamon"), "Progress")).toBe(true);
    expect(compiled.effects.some((effect) => effect.keywords?.some((keyword) => keyword.keyword === "Piercing"))).toBe(
      true,
    );
    for (const keyword of ["Blocker", "Armor Purge"]) {
      expect(compiled.effects.some((effect) => effect.keywords?.some((entry) => entry.keyword === keyword))).toBe(true);
    }

    const denied = setupEngine({
      0: {
        battleArea: [{ card: "BT24-016", as: "lamiamon" }],
        hand: [{ card: "BT24-018", as: "styracomon" }],
      },
    });
    denied.state.memory = 10;
    await denied.ready();
    expect(
      denied.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: denied.perm("lamiamon").permanentId,
        instanceId: denied.inst("styracomon").instanceId,
        useAlternateCost: true,
        alternateRequirementIndex: 0,
      }),
    ).toEqual({ ok: false, reason: "invalid-evolution" });
  });
});
