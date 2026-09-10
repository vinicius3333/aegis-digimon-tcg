import { getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./EX5-039.js";
import "../index.js";

describe("EX5-039 Garudamon", () => {
  it("matches the catalog and encodes Fortitude, DP-relative suspension, and inherited aura", () => {
    expect(getCardDefinition("EX5-039")).toMatchObject({
      cardId: "EX5-039",
      nameEn: "Garudamon",
      colors: ["Green"],
      kinds: ["Digimon"],
      level: 5,
      playCost: 7,
      dp: 7000,
      forms: ["Ultimate"],
      attributes: ["Vaccine"],
      types: ["Birdkin"],
      evoCosts: [{ color: "Green", level: 4, memoryCost: 3 }],
      effectText: expect.stringContaining("Suspend 1 of your opponent's Digimon"),
      inheritedEffectText: expect.stringContaining("gains +1000 DP"),
    });
    expect(compiled).toMatchObject({ coverage: "full", residual: [] });
    expect(compiled.effects?.every((entry) => entry.frequency === undefined)).toBe(true);
    expect(compiled.effects?.find((entry) => entry.trigger === "Static")?.keywords).toEqual([
      { keyword: "Fortitude", raw: "＜Fortitude＞" },
    ]);

    for (const trigger of ["OnPlay", "WhenDigivolving"] as const) {
      expect(compiled.effects?.find((entry) => entry.trigger === trigger)?.actions).toEqual([
        {
          kind: "Suspend",
          target: {
            filter: {
              controller: "opponent",
              kind: ["Digimon"],
              dp: { op: "lte", relativeToSource: true },
            },
            count: 1,
          },
        },
      ]);
    }
    expect(compiled.effects?.find((entry) => entry.isInherited)).toEqual({
      trigger: "AllTurns",
      actions: [
        {
          kind: "Aura",
          target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
          effect: { kind: "modifyDP", amount: 1000 },
          while: { kind: "selfIsSuspended", raw: "this Digimon is suspended" },
        },
      ],
      isInherited: true,
    });
  });

  it("suspends exactly one opposing Digimon at or below its current DP on public play", async () => {
    const s = setupEngine({
      0: { hand: [{ card: "EX5-039", as: "source" }] },
      1: {
        battleArea: [
          { card: "BT1-021", as: "eligible", dp: 7000 },
          { card: "BT1-021", as: "tooLarge", dp: 8000 },
        ],
      },
    });
    s.state.memory = 7;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("source").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.perm("eligible").isSuspended);

    expect(s.perm("eligible").isSuspended).toBe(true);
    expect(s.perm("tooLarge").isSuspended).toBe(false);
    expect(s.state.players[0]!.hand.map((card) => card.cardId)).not.toContain("EX5-039");
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("suspends an eligible target after public digivolution using modified source DP (Q3614)", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX5-036", as: "base", under: ["EX5-012"] }],
          hand: [{ card: "EX5-039", as: "garudamon" }],
        },
        1: {
          battleArea: [
            { card: "BT1-021", as: "eligible", dp: 8500 },
            { card: "BT1-021", as: "tooLarge", dp: 9500 },
          ],
        },
      },
      { autoSelectCards: true, preferInstanceIds: preferred },
    );
    preferred.push(s.perm("eligible").permanentId);
    s.state.memory = 3;
    await s.ready();
    expect(s.perm("base").currentDP).toBe(6000);

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("garudamon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("eligible").isSuspended);

    expect(s.perm("base").currentDP).toBe(9000);
    expect(s.perm("eligible").isSuspended).toBe(true);
    expect(s.perm("tooLarge").isSuspended).toBe(false);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("does not suspend an opposing Digimon above source DP or an own Digimon", async () => {
    const s = setupEngine({
      0: {
        hand: [{ card: "EX5-039", as: "source" }],
        battleArea: [{ card: "BT1-021", as: "own", dp: 1000 }],
      },
      1: { battleArea: [{ card: "BT1-021", as: "tooLarge", dp: 8000 }] },
    });
    s.state.memory = 7;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("source").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.battleArea.some((perm) => perm.topCard?.cardId === "EX5-039"));

    expect(s.perm("tooLarge").isSuspended).toBe(false);
    expect(s.perm("own").isSuspended).toBe(false);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("applies inherited +1000 DP only while a public host is suspended", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT1-036", as: "host", under: ["EX5-039"] }] },
      1: { security: ["BT1-009"] },
    });
    s.state.memory = 10;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("host").isSuspended);
    expect(s.perm("host").currentDP).toBe(6000);

    await advance(s.engine).verb.unsuspend([s.perm("host").permanentId]);
    await settle(() => s.perm("host").currentDP === 5000);
    expect(s.perm("host").currentDP).toBe(5000);
    expect(s.state.pendingDecision).toBeUndefined();
  });
});
