import { expect, it } from "vitest";
import { setupEngine, settle } from "./testkit/harness.js";
import "../cards/index.js";

it.each([false, true])("retains Taiki's EX6 attack with a nested play=%s", async (nestedPlay) => {
  const s = setupEngine(
    {
      0: {
        battleArea: [
          { card: "BT21-083", as: "taiki" },
          { card: "P-224", under: [{ card: "BT19-035", as: "shooting" }] },
        ],
        hand: [
          { card: "BT19-014", as: "ex6" },
          { card: "BT21-021", as: "omni" },
        ],
      },
      1: { security: ["BT1-085"] },
    },
    { autoSelectCards: true, preferTriggerKeys: ["BT19-014", "BT19-035"] },
  );
  s.state.memory = 10;
  await s.ready();
  expect(
    s.engine.applyIntent(0, {
      type: "playCard",
      instanceId: s.inst("ex6").instanceId,
      digiXros: { materialInstanceIds: [s.inst("omni").instanceId] },
    }),
  ).toEqual({ ok: true });
  await settle();
  function answerOptional(sourceCardId: string, accept: boolean) {
    const req = s.decisions.at(-1)!.req;
    expect(req).toMatchObject({ kind: "optional", sourceCardId });
    expect(s.state.pendingDecision?.decisionId).toBe(req.decisionId);
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: req.decisionId,
        response: { kind: "optional", accept },
      }),
    ).toEqual({ ok: true });
  }
  answerOptional("BT19-014", nestedPlay);
  await settle();
  expect(s.state.players[0]!.battleArea.some((p) => p.topCard.instanceId === s.inst("shooting").instanceId)).toBe(
    nestedPlay,
  );
  if (nestedPlay) {
    // The newly played ShootingStarmon lacks Rush. Declining its separate
    // Taiki activation must not consume the original EX6 arrival's activation.
    answerOptional("BT21-083", false);
    await settle();
  }
  answerOptional("BT21-083", true);
  await settle();
  function declineAlliance() {
    expect(s.engine.applyIntent(0, { type: "respondAlliance" })).toEqual({ ok: true });
  }
  expect(s.events.some((event) => event.kind === "alliancePrompt")).toBe(nestedPlay);
  if (nestedPlay) {
    declineAlliance();
    await settle();
  }
  expect(s.events.filter((e) => e.kind === "attackDeclared")).toEqual([
    expect.objectContaining({ attackerCardId: "BT19-014" }),
  ]);
  expect(s.state.players[1]!.security).toHaveLength(0);
  expect(s.perm("taiki").isSuspended).toBe(true);
  expect(s.state.pendingDecision).toBeUndefined();
});
