import { describe, expect, it } from "vitest";
import { observe } from "../../engine/testkit/observe.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./BT18-018.js";

describe("BT18-018 EmperorGreymon", () => {
  it("gains Security Attack +1 and unsuspends once when it wins a battle", async () => {
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
    expect(compiled.effects[0]).toMatchObject({
      trigger: "WhenDigivolving",
      actions: [
        {
          kind: "TrashDigivolution",
          choose: true,
          scope: "acrossDigimon",
          scaling: { unit: "digivolutionCardColors" },
        },
        { kind: "Suspend", scaling: { unit: "digivolutionCardColors" } },
        { kind: "Attack" },
      ],
    });
    expect(compiled.effects[1]).toMatchObject({
      trigger: "YourTurn",
      frequency: "OncePerTurn",
      actions: [
        {
          kind: "SubTrigger",
          event: "whenDeletesInBattle",
          sourceFilter: { isSelfRef: true, zone: "battleArea" },
        },
      ],
    });
    const s = setupEngine({
      0: { battleArea: [{ card: "BT18-018", as: "emperor", under: ["BT1-030"] }] },
      1: {
        battleArea: [
          { card: "BT1-030", dp: 10000, suspended: true, as: "targetA" },
          { card: "BT1-030", dp: 10000, suspended: true, as: "targetB" },
        ],
      },
    });
    await s.ready();
    const emperorId = s.perm("emperor").permanentId;
    const targetAId = s.perm("targetA").permanentId;
    const targetBId = s.perm("targetB").permanentId;
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: emperorId,
        target: { kind: "permanent", permanentId: s.perm("targetA").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => !s.state.players[1]!.battleArea.some((permanent) => permanent.permanentId === targetAId));
    expect(s.perm("emperor").isSuspended).toBe(false);
    expect(observe(s.engine).keywordAmount(s.perm("emperor"), "SecurityAttack")).toBe(1);

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: emperorId,
        target: { kind: "permanent", permanentId: s.perm("targetB").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => !s.state.players[1]!.battleArea.some((permanent) => permanent.permanentId === targetBId));
    expect(s.perm("emperor").isSuspended).toBe(true);
    expect(observe(s.engine).keywordAmount(s.perm("emperor"), "SecurityAttack")).toBe(1);
  });

  it("trashes across stacks and suspends one Digimon per distinct source-stack color", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            {
              card: "BT18-088",
              as: "takuya",
              under: ["BT18-011", "BT18-012", "BT18-014", "BT18-022", "BT18-023", "BT18-047"],
            },
          ],
          hand: [{ card: "BT18-018", as: "emperor" }],
          deck: ["BT1-001"],
        },
        1: {
          battleArea: [
            { card: "BT1-030", as: "targetA", under: ["BT1-001"] },
            { card: "BT1-030", as: "targetB", under: ["BT1-001"] },
            { card: "BT1-030", as: "targetC", under: ["BT1-001"] },
          ],
        },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );

    s.state.memory = 10;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("takuya").permanentId,
        instanceId: s.inst("emperor").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("takuya").topCard?.cardId === "BT18-018");

    expect(
      [s.perm("targetA"), s.perm("targetB"), s.perm("targetC")].map((permanent) => permanent.stack.length),
    ).toEqual([0, 0, 0]);
    expect([s.perm("targetA"), s.perm("targetB"), s.perm("targetC")].every((permanent) => permanent.isSuspended)).toBe(
      true,
    );
  });

  it("may attack after its When Digivolving processing", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            {
              card: "BT18-088",
              as: "takuya",
              under: ["BT18-011", "BT18-012", "BT18-014", "BT18-022", "BT18-023", "BT18-047"],
            },
          ],
          hand: [{ card: "BT18-018", as: "emperor" }],
          deck: ["BT1-001"],
        },
        1: { security: [{ card: "BT1-030", as: "security" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("takuya").permanentId,
        instanceId: s.inst("emperor").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("takuya").topCard?.cardId === "BT18-018");
    await settle(() => s.state.players[1]!.security.length === 0);

    expect(s.perm("takuya").isSuspended).toBe(true);
    expect(s.state.players[1]!.security).toHaveLength(0);
  });

  it("digivolves from Takuya with at least 5 Hybrid cards under it for cost 5", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          {
            card: "BT18-088",
            as: "takuya",
            under: ["BT18-011", "BT18-012", "BT18-014", "BT18-022", "BT18-023", "BT18-047"],
          },
        ],
        hand: [{ card: "BT18-018", as: "emperor" }],
      },
    });
    s.state.memory = 10;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("takuya").permanentId,
        instanceId: s.inst("emperor").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("takuya").topCard.cardId === "BT18-018");

    expect(s.state.memory).toBe(5);
    expect(s.perm("takuya").stack).toHaveLength(7);
  });

  it("rejects the Takuya alternate evolution with only 4 Hybrid cards under it", () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT18-088", as: "takuya", under: ["BT18-011", "BT18-012", "BT18-014", "BT18-022"] }],
        hand: [{ card: "BT18-018", as: "emperor" }],
      },
    });
    s.state.memory = 10;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("takuya").permanentId,
        instanceId: s.inst("emperor").instanceId,
      }),
    ).toEqual({ ok: false, reason: "invalid-evolution" });
  });

  it("does not trigger its inherited effect when another Digimon wins a battle", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT18-018", as: "emperor", under: ["BT1-030"] },
            { card: "BT1-030", dp: 5000, as: "other" },
          ],
        },
        1: { battleArea: [{ card: "BT1-030", dp: 1000, suspended: true, as: "target" }] },
      },
      { autoSelectCards: true },
    );
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("other").permanentId,
        target: { kind: "permanent", permanentId: s.perm("target").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.battleArea.length === 0);

    expect(observe(s.engine).keywordAmount(s.perm("emperor"), "SecurityAttack")).toBe(0);
  });
});
