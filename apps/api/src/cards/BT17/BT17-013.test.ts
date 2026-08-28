import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { compiled } from "./BT17-013.js";

describe("BT17-013", () => {
  it("deletes an opposing Digimon at 6000 DP or less and grants Security Attack +1 if it did not delete", () => {
    expect(compiled.effects?.[0]?.actions?.[0]).toMatchObject({
      kind: "Delete",
      target: { filter: { dp: { op: "lte", value: 6000 } } },
    });
    expect(compiled.effects?.[0]?.actions?.[1]).toMatchObject({
      kind: "GainKeyword",
      keyword: { keyword: "SecurityAttack", amount: 1 },
      duration: "forTheTurn",
      condition: { kind: "ifThisEffectDidNotDelete" },
    });
  });

  it("unsuspends once per turn when an opposing Digimon is deleted", () => {
    expect(compiled.effects?.[1]).toMatchObject({
      trigger: "AllTurns",
      isInherited: true,
      frequency: "OncePerTurn",
      actions: [
        {
          kind: "SubTrigger",
          event: "onDeletionOf",
          actions: [
            { kind: "Unsuspend", optional: true, condition: { kind: "selfHasNameContaining", names: ["Gallantmon"] } },
          ],
        },
      ],
    });
  });

  it("deletes only an opposing Digimon at 6000 DP or less when digivolving", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT1-015", as: "base" }],
        hand: [{ card: "BT17-013", as: "wargrowlmon" }],
      },
      1: {
        battleArea: [
          { card: "BT1-009", dp: 6000, as: "within" },
          { card: "BT1-009", dp: 6001, as: "above" },
        ],
      },
    }, { autoSelectCards: true });
    s.state.memory = 3;
    const withinInstanceId = s.perm("within").topCard!.instanceId;
    const aboveInstanceId = s.perm("above").topCard!.instanceId;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("wargrowlmon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.trash.some(({ instanceId }) => instanceId === withinInstanceId));

    expect(s.state.players[1]!.trash.some(({ instanceId }) => instanceId === withinInstanceId)).toBe(true);
    expect(s.state.players[1]!.battleArea.some(({ topCard }) => topCard?.instanceId === aboveInstanceId)).toBe(true);
    expect(observe(s.engine).hasKeyword(s.perm("base"), "SecurityAttack")).toBe(false);
  });

  it("gains Security Attack +1 when no opposing Digimon can be deleted", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT1-015", as: "base" }],
          hand: [{ card: "BT17-013", as: "wargrowlmon" }],
        },
        1: { battleArea: [{ card: "BT1-009", dp: 6001, as: "above" }] },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 3;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("wargrowlmon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => observe(s.engine).keywordAmount(s.perm("base"), "SecurityAttack") === 1);

    expect(observe(s.engine).keywordAmount(s.perm("base"), "SecurityAttack")).toBe(1);
    expect(s.state.players[1]!.battleArea).toHaveLength(1);
  });

  it("unsuspends a Gallantmon host when another effect deletes an opponent Digimon", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT17-016", as: "gallant", suspended: true, under: ["BT17-013"] },
            { card: "BT1-015", as: "base" },
          ],
          hand: [{ card: "BT17-013", as: "wargrowlmon" }],
        },
        1: { battleArea: [{ card: "BT1-009", dp: 3000, as: "target" }] },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 3;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("wargrowlmon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => !s.perm("gallant").isSuspended);

    expect(s.perm("gallant").isSuspended).toBe(false);
    expect(s.state.players[1]!.battleArea).toHaveLength(0);
  });
});
