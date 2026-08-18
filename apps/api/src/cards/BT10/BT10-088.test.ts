import { EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT10-088.js";

describe("BT10-088 Kiriha Aonuma", () => {
  it("sets memory to 3 at the start of the turn", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT10-088", as: "kiriha" }] } });
    s.state.memory = 1;
    await advance(s.engine).fire(EffectTiming.OnStartTurn, s.perm("kiriha"));
    expect(s.state.memory).toBe(3);
  });

  it("does not lower memory when the turn starts above 3", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT10-088", as: "kiriha" }] } });
    s.state.memory = 5;

    await advance(s.engine).fire(EffectTiming.OnStartTurn, s.perm("kiriha"));

    expect(s.state.memory).toBe(5);
  });

  it("suspends itself to DigiXros with cards under another Tamer", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "BT10-088", as: "kiriha" },
          {
            card: "BT10-087",
            as: "otherTamer",
            under: [
              { card: "BT10-019", as: "greymon" },
              { card: "BT10-021", as: "mailbirdramon" },
            ],
          },
        ],
        hand: [{ card: "BT10-024", as: "metalGreymon" }],
      },
    });
    s.state.memory = 7;
    await s.ready();
    expect(s.perm("kiriha").isSuspended).toBe(false);

    expect(s.engine.applyIntent(0, {
      type: "playCard",
      instanceId: s.inst("metalGreymon").instanceId,
      digiXros: {
        materialInstanceIds: [s.inst("greymon").instanceId, s.inst("mailbirdramon").instanceId],
        expanderPermanentIds: [s.perm("kiriha").permanentId],
      },
    })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some(
      (permanent) => permanent.topCard.cardId === "BT10-024" && permanent.stack.length === 2,
    ));

    expect(s.perm("kiriha").isSuspended).toBe(true);
    expect(s.perm("otherTamer").stack).toHaveLength(0);
  });

  it("plays itself from security without paying memory", async () => {
    const s = setupEngine(
      { 0: { security: [{ card: "BT10-088", as: "kiriha", faceUp: true }] } },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 0;

    await advance(s.engine).fireForInstance(EffectTiming.SecuritySkill, s.inst("kiriha"));
    await settle(() => s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.cardId === "BT10-088"));

    expect(s.state.memory).toBe(0);
  });
});
