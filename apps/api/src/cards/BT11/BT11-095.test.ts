import { EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { advance } from "../../engine/testkit/advance.js";
import "./BT11-095.js";
describe("BT11-095 Taiki, Kiriha, & Nene", () => {
  it("places a Xros Heart card, gains memory and draws", async () => {
    const s = setupEngine(
      { 0: { battleArea: [{ card: "BT11-095", as: "tamer" }], hand: ["BT10-008"], deck: ["BT1-001"] } },
      { autoSelectCards: true, autoAcceptOptional: true },
    );
    const before = s.state.memory;
    await advance(s.engine).fire(EffectTiming.OnStartMainPhase, s.perm("tamer"));
    expect(s.state.memory).toBe(before + 1);
    expect(s.state.players[0]!.hand).toHaveLength(1);
  });

  it("suspends itself to use a card under another Tamer for DigiXros", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "BT11-095", as: "expander" },
          { card: "BT10-087", as: "otherTamer", under: [{ card: "BT10-008", as: "shoutmon" }] },
        ],
        hand: [{ card: "BT10-009", as: "xros" }],
      },
    });
    s.state.memory = 7;

    expect(s.engine.applyIntent(0, {
      type: "playCard",
      instanceId: s.inst("xros").instanceId,
      digiXros: {
        materialInstanceIds: [s.inst("shoutmon").instanceId],
        expanderPermanentIds: [s.perm("expander").permanentId],
      },
    })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some(({ topCard }) => topCard?.cardId === "BT10-009"));

    const played = s.state.players[0]!.battleArea.find(({ topCard }) => topCard?.cardId === "BT10-009")!;
    expect(played.stack.map(({ instanceId }) => instanceId)).toContain(s.inst("shoutmon").instanceId);
    expect(s.perm("otherTamer").stack).toHaveLength(0);
    expect(s.perm("expander").isSuspended).toBe(true);
    expect(s.state.memory).toBe(0);
  });

  it("does not allow a card under a Digimon to be used as DigiXros material", () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "BT11-095", as: "expander" },
          { card: "BT10-009", as: "digimon", under: [{ card: "BT10-008", as: "shoutmon" }] },
        ],
        hand: [{ card: "BT10-009", as: "xros" }],
      },
    });
    s.state.memory = 9;

    expect(s.engine.applyIntent(0, {
      type: "playCard",
      instanceId: s.inst("xros").instanceId,
      digiXros: {
        materialInstanceIds: [s.inst("shoutmon").instanceId],
        expanderPermanentIds: [s.perm("expander").permanentId],
      },
    })).toEqual({ ok: false, reason: "invalid-material" });
    expect(s.perm("expander").isSuspended).toBe(false);
  });
});
