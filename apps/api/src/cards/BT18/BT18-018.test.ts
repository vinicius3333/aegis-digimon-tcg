import { EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
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
      actions: [{ kind: "SubTrigger", event: "whenDeletesInBattle" }],
    });
    const s = setupEngine({
      0: { battleArea: [{ card: "BT18-018", as: "emperor", under: ["BT1-030"], suspended: true }] },
    });
    await s.ready();
    const emperorId = s.perm("emperor").permanentId;
    await advance(s.engine).fireSubTrigger("whenDeletesInBattle", { attackerPermanentId: emperorId });
    expect(s.perm("emperor").isSuspended).toBe(false);
    expect(observe(s.engine).keywordAmount(s.perm("emperor"), "SecurityAttack")).toBe(1);

    s.perm("emperor").isSuspended = true;
    await advance(s.engine).fireSubTrigger("whenDeletesInBattle", { attackerPermanentId: emperorId });
    expect(s.perm("emperor").isSuspended).toBe(true);
    expect(observe(s.engine).keywordAmount(s.perm("emperor"), "SecurityAttack")).toBe(1);
  });

  it("trashes across stacks and suspends one Digimon per distinct source-stack color", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT18-018", as: "emperor", under: ["BT18-012", "BT18-023", "BT18-047"] }],
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

    await advance(s.engine).fireForInstance(EffectTiming.WhenDigivolving, s.perm("emperor").topCard!);

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
        0: { battleArea: [{ card: "BT18-018", as: "emperor", under: ["BT18-012"] }] },
        1: { security: [{ card: "BT1-030", as: "security" }] },
      },
      { autoAcceptOptional: true },
    );
    const flow = advance(s.engine).fireForInstance(EffectTiming.WhenDigivolving, s.perm("emperor").topCard!);
    await settle(() => s.state.pendingDecision !== undefined);
    const decision = s.state.pendingDecision!;
    const payload = JSON.parse(decision.payloadJson) as { candidateInstanceIds?: string[] };
    expect(payload.candidateInstanceIds).toContain("player");

    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: decision.decisionId,
        response: { kind: "selectCards", instanceIds: ["player"] },
      }),
    ).toEqual({ ok: true });
    await flow;
    await settle(() => s.state.players[1]!.security.length === 0);

    expect(s.perm("emperor").isSuspended).toBe(true);
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
});
