import { describe, it, expect } from "vitest";
import { type PlayerState, EffectTiming, type Seat } from "@aegis/shared";
import { setupEngine, settle, type EngineSetup } from "../../engine/testkit/harness.js";
import "../index.js";

const DELAY_KEY = `LM-033/ir-${EffectTiming.OnDeclaration}-0`;

function setupGarnet(): EngineSetup {
  return setupEngine(
    {
      0: {
        battleArea: [{ card: "BT1-009", as: "colorSource" }],
        hand: [{ card: "LM-033", as: "option" }],
        deck: ["BT1-009", "BT1-045", "BT1-064"],
      },
    },
    { autoAcceptOptional: true, autoSelectCards: true },
  );
}

function playGarnet(s: EngineSetup): { instanceId: string } {
  s.state.memory = 3;
  const option = s.inst("option");
  expect(s.engine.applyIntent(0 as Seat, { type: "playCard", instanceId: option.instanceId })).toEqual({
    ok: true,
  });
  return { instanceId: option.instanceId };
}

describe("LM-033 ＜Delay＞ activation subsystem", () => {
  it("does NOT gain memory on play (the delay payload is no longer an immediate [Main])", async () => {
    const s = setupGarnet();
    const p0 = s.state.players[0] as PlayerState;
    playGarnet(s);
    await settle(() => p0.battleArea.some((perm) => perm.topCard?.cardId === "LM-033"));
    await settle(() => false, 60);

    expect(p0.hand.some((c) => c.cardId === "BT1-009")).toBe(true);
    expect(p0.battleArea.some((perm) => perm.topCard?.cardId === "LM-033")).toBe(true);
    expect(s.state.memory).toBe(0);
  });

  it("cannot be activated the turn the option entered, but DOES on a later turn (trash + gain 2)", async () => {
    const s = setupGarnet();
    const p0 = s.state.players[0] as PlayerState;
    playGarnet(s);
    await settle(() => p0.battleArea.some((perm) => perm.topCard?.cardId === "LM-033"));
    await settle(() => false, 60);
    const perm = p0.battleArea.find((p) => p.topCard?.cardId === "LM-033")!;
    const optionInstanceId = perm.topCard!.instanceId;

    s.engine.applyIntent(0 as Seat, {
      type: "activateEffect",
      sourceInstanceId: optionInstanceId,
      effectKey: DELAY_KEY,
    });
    await settle(() => false, 60);
    expect(s.state.memory).toBe(0);
    expect(p0.battleArea.some((p) => p.topCard?.cardId === "LM-033")).toBe(true);

    s.state.turnCount += 1;
    expect(
      s.engine.applyIntent(0 as Seat, {
        type: "activateEffect",
        sourceInstanceId: optionInstanceId,
        effectKey: DELAY_KEY,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.memory !== 0);

    expect(s.state.memory).toBe(2);
    expect(p0.battleArea.some((p) => p.topCard?.cardId === "LM-033")).toBe(false);
    expect(p0.trash.some((c) => c.cardId === "LM-033")).toBe(true);
  });
});
