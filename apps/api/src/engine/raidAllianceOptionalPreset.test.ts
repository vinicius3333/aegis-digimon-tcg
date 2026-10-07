import { describe, expect, it } from "vitest";
import "../cards/index.js";
import { setupEngine, settle } from "./testkit/harness.js";
import { observe } from "./testkit/observe.js";

async function orderAttackTriggers(attackerBattleArea: { card: string; as: string; under?: string[] }[]) {
  const s = setupEngine(
    {
      0: {
        battleArea: [{ card: "BT1-013", as: "highestDp" }],
        security: ["BT1-009", "BT1-010", "BT1-011"],
      },
      1: {
        battleArea: attackerBattleArea,
        security: ["BT1-009"],
        deck: Array(6).fill("BT1-009"),
      },
    },
    { autoAcceptOptional: true, autoSelectCards: true, autoOrderTriggers: false },
  );
  s.state.turnSeat = 1;
  await s.ready();
  expect(
    s.engine.applyIntent(1, {
      type: "attack",
      attackerPermanentId: s.perm("attacker").permanentId,
      target: { kind: "player" },
    }),
  ).toEqual({ ok: true });
  await settle(() => s.state.pendingDecision?.kind === "orderTriggers");
  const prompt = s.decisions.find(({ req }) => req.kind === "orderTriggers")!.req;
  return { s, prompt };
}

describe("Discord bug 1557475935962398842: keyword attack triggers accept Yes/No presets", () => {
  it.each([true, false])("honors a %s preset for <Raid> in the effect order", async (accept) => {
    const { s, prompt } = await orderAttackTriggers([{ card: "EX13-045", as: "attacker", under: ["BT1-041"] }]);
    const keys = prompt.options!.triggerKeys!;
    const raidIndex = keys.findIndex((key) => key.endsWith("/keyword/Raid"));
    expect(raidIndex).toBeGreaterThanOrEqual(0);
    expect(prompt.options!.triggerIsOptional![raidIndex]).toBe(true);
    const raidKey = keys[raidIndex]!;
    expect(
      s.engine.applyIntent(1, {
        type: "respondDecision",
        decisionId: prompt.decisionId,
        response: {
          kind: "orderTriggers",
          order: [raidKey, ...keys.filter((key) => key !== raidKey)],
          optionalAnswers: { [raidKey]: accept },
        },
      }),
    ).toEqual({ ok: true });
    await settle(() => !observe(s.engine).isAttacking());

    const raidPrompts = s.decisions.filter(({ req }) => req.kind === "selectCards" && req.promptText.includes("Raid"));
    expect(raidPrompts).toHaveLength(0);
    const redirectTargetSurvived = s.state.players[0]!.battleArea.some(
      (p) => p.permanentId === s.perm("highestDp").permanentId,
    );
    expect(redirectTargetSurvived).toBe(!accept);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it.each([true, false])("honors a %s preset for <Alliance> in the effect order", async (accept) => {
    const { s, prompt } = await orderAttackTriggers([
      { card: "BT19-014", as: "attacker", under: ["BT1-041"] },
      { card: "BT1-010", as: "ally" },
    ]);
    const keys = prompt.options!.triggerKeys!;
    const allianceIndex = keys.findIndex((key) => key.includes("/alliance/"));
    expect(allianceIndex).toBeGreaterThanOrEqual(0);
    expect(prompt.options!.triggerIsOptional![allianceIndex]).toBe(true);
    const allianceKey = keys[allianceIndex]!;
    expect(
      s.engine.applyIntent(1, {
        type: "respondDecision",
        decisionId: prompt.decisionId,
        response: {
          kind: "orderTriggers",
          order: [allianceKey, ...keys.filter((key) => key !== allianceKey)],
          optionalAnswers: { [allianceKey]: accept },
        },
      }),
    ).toEqual({ ok: true });
    await settle(() => !observe(s.engine).isAttacking() || s.state.pendingDecision !== undefined);

    expect(s.state.pendingDecision).toBeUndefined();
    expect(s.perm("ally").isSuspended).toBe(accept);
  });
});
