import { describe, expect, it } from "vitest";
import { EffectTiming } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { getEffectModule } from "../../engine/effects/registry.js";
import { observe } from "../../engine/testkit/observe.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./EX9-069.js";

describe("EX9-069", () => {
  const source = { instanceId: "source", cardId: "EX9-069", ownerSeat: 0, definition: {}, permanent: () => undefined, isOnBattleArea: () => true, isOwnersTurn: () => true, hasColor: () => true } as never;
  it("registers start-main placement and security play", () => {
    expect(getEffectModule("EX9-069")!.effectsForTiming(EffectTiming.OnStartMainPhase, source)).toHaveLength(1);
    expect(getEffectModule("EX9-069")!.effectsForTiming(EffectTiming.SecuritySkill, source)).toHaveLength(1);
  });
  it("registers memory/draw on adding digivolution cards and opponent-turn Reboot", () => expect(getEffectModule("EX9-069")!.effectsForTiming(EffectTiming.None, source)).toHaveLength(2));
  it("places a hand card face-down under a DM Digimon at the start of main phase", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "EX9-069", as: "source" }, { card: "EX9-065", as: "host" }], hand: ["BT1-009"], deck: ["BT1-010"] } }, { autoAcceptOptional: true, autoSelectCards: true, autoOrderTriggers: true });
    await s.ready();

    await advance(s.engine).fire(EffectTiming.OnStartMainPhase, s.perm("source"));
    await settle(() => s.perm("host").stack.length === 1 && s.perm("source").isSuspended);

    expect(s.perm("host").stack[0]).toMatchObject({ cardId: "BT1-009", faceUp: false });
    expect(s.perm("source").isSuspended).toBe(true);
    expect(s.state.memory).toBe(1);
    expect(s.state.players[0]!.hand.some((card) => card.cardId === "BT1-010")).toBe(true);
  });
  it("grants Reboot to own Digimon with face-down sources during the opponent's turn", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "EX9-069", as: "source" }, { card: "EX9-065", as: "host", under: [{ card: "BT1-009", faceUp: false }] }] } });
    s.state.turnSeat = 1;
    await s.ready();

    expect(observe(s.engine).hasKeyword(s.perm("host"), "Reboot")).toBe(true);
  });
  it("plays itself from security without paying", async () => {
    const s = setupEngine({ 0: { security: [{ card: "EX9-069", as: "source" }] } });
    s.inst("source").faceUp = true;

    await advance(s.engine).fireForInstance(EffectTiming.SecuritySkill, s.inst("source"));
    await settle(() => s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.cardId === "EX9-069"));

    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.cardId === "EX9-069")).toBe(true);
    expect(s.state.players[0]!.security.some((card) => card.cardId === "EX9-069")).toBe(false);
  });
});
