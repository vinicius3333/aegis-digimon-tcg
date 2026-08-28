import { describe, expect, it } from "vitest";
import { EffectTiming } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "./BT12-017.js";

describe("BT12-017 EmperorGreymon", () => {
  it("has Security Attack +1 as a static keyword", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT12-017", as: "emperor" }] } });
    await s.ready();
    expect(observe(s.engine).keywordAmount(s.perm("emperor"), "SecurityAttack")).toBe(1);
  });
});

it("plays Takuya from trash after deletion", async () => {
  const s = setupEngine(
    { 0: { battleArea: [{ card: "BT12-017", as: "emperor" }], trash: [{ card: "BT12-088", as: "takuya" }] } },
    { autoAcceptOptional: true, autoSelectCards: true },
  );
  await advance(s.engine).verb.deletePermanent([s.perm("emperor").permanentId]);
  await settle(() => s.state.players[0]!.battleArea.some((p) => p.topCard?.cardId === "BT12-088"));
  expect(s.state.players[0]!.battleArea.some((p) => p.topCard?.cardId === "BT12-088")).toBe(true);
});

it("requires the red Tamer source card for the DP-based alternate deletion cap", async () => {
  const withoutRedTamer = setupEngine(
    {
      0: {
        battleArea: [{ card: "BT12-017", as: "emperor", under: ["BT12-034", "BT12-090"] }],
      },
      1: { battleArea: [{ card: "BT1-009", dp: 7000, as: "target" }] },
    },
    { autoSelectCards: true },
  );
  await withoutRedTamer.ready();
  await advance(withoutRedTamer.engine).fire(EffectTiming.WhenDigivolving, withoutRedTamer.perm("emperor"));
  expect(withoutRedTamer.state.players[1]!.battleArea).toHaveLength(1);

  const withRedTamer = setupEngine(
    {
      0: {
        battleArea: [{ card: "BT12-017", as: "emperor", under: ["BT12-034", "BT12-088"] }],
      },
      1: { battleArea: [{ card: "BT1-009", dp: 7000, as: "target" }] },
    },
    { autoSelectCards: true },
  );
  await withRedTamer.ready();
  await advance(withRedTamer.engine).fire(EffectTiming.WhenDigivolving, withRedTamer.perm("emperor"));
  expect(withRedTamer.state.players[1]!.battleArea).toHaveLength(0);
});

it("uses the red-Tamer cap instead of also applying the base cap and deletes only one target", async () => {
  const s = setupEngine(
    {
      0: { battleArea: [{ card: "BT12-017", as: "emperor", under: ["BT12-088"] }] },
      1: {
        battleArea: [
          { card: "BT1-009", dp: 4000, as: "small" },
          { card: "BT12-038", dp: 10000, as: "large" },
        ],
      },
    },
    { autoSelectCards: true },
  );
  await advance(s.engine).fire(EffectTiming.WhenDigivolving, s.perm("emperor"));
  expect(s.state.players[1]!.battleArea).toHaveLength(1);
});

it("can play Takuya from hand on deletion and can decline the optional play", async () => {
  const accepted = setupEngine(
    { 0: { battleArea: [{ card: "BT12-017", as: "emperor" }], hand: [{ card: "BT12-088", as: "takuya" }] } },
    { autoAcceptOptional: true, autoSelectCards: true },
  );
  await advance(accepted.engine).verb.deletePermanent([accepted.perm("emperor").permanentId]);
  await settle(() => accepted.state.players[0]!.battleArea.some(({ topCard }) => topCard.cardId === "BT12-088"));
  expect(accepted.state.memory).toBe(0);

  const declined = setupEngine(
    { 0: { battleArea: [{ card: "BT12-017", as: "emperor" }], hand: [{ card: "BT12-088", as: "takuya" }] } },
    { autoSelectCards: true },
  );
  let resolved = false;
  void advance(declined.engine)
    .verb.deletePermanent([declined.perm("emperor").permanentId])
    .then(() => {
      resolved = true;
    });
  await settle(() => {
    const pending = declined.state.pendingDecision;
    if (pending?.kind === "optional") {
      declined.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: pending.decisionId,
        response: { kind: "optional", accept: false },
      });
    }
    return resolved;
  });
  expect(declined.state.players[0]!.hand.map(({ instanceId }) => instanceId)).toContain(declined.inst("takuya").instanceId);
});
