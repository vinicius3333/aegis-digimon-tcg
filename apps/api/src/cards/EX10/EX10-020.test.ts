import { EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import "./EX10-020.js";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";

describe("EX10-020 Puppetmon", () => {
  it("plays itself from hand for 6 under the Dark Masters-only board condition", async () => {
    const s = setupEngine(
      { 0: { hand: [{ card: "EX10-020", as: "puppetmon" }], battleArea: ["BT15-027"] } },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 6;
    await s.ready();
    const entries = JSON.parse(s.inst("puppetmon").activatableEffectsJson || "[]") as Array<{
      effectKey: string;
      instanceId: string;
    }>;
    const entry = entries.find(({ instanceId }) => instanceId === s.inst("puppetmon").instanceId);
    expect(entry).toBeDefined();

    expect(
      s.engine.applyIntent(0, {
        type: "activateEffect",
        sourceInstanceId: s.inst("puppetmon").instanceId,
        effectKey: entry!.effectKey,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some(({ topCard }) => topCard.cardId === "EX10-020"));
    await settle();
    expect(s.state.memory).toBe(0);
  });

  it("returns a suspended opposing Digimon to the deck bottom on play", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "EX10-020", as: "puppetmon" }] },
      1: { battleArea: [{ card: "BT1-009", as: "target", suspended: true }] },
    });
    const targetId = s.perm("target").permanentId;
    await advance(s.engine).fireForPermanent(EffectTiming.OnPlay, s.perm("puppetmon"));
    await settle(() => !s.state.players[1]!.battleArea.some(({ permanentId }) => permanentId === targetId));
    expect(s.state.players[1]!.battleArea).toHaveLength(0);
  });

  it("places itself face up in security on deletion only when no green face-up security exists", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "EX10-020", as: "puppetmon" }] } });
    const instanceId = s.perm("puppetmon").topCard.instanceId;
    await advance(s.engine).verb.deletePermanent([s.perm("puppetmon").permanentId]);
    await settle(() => s.state.players[0]!.security.some((card) => card.instanceId === instanceId));
    expect(s.state.players[0]!.security.find((card) => card.instanceId === instanceId)?.faceUp).toBe(true);
  });

  it("plays a level 5 Dark Masters-text card when checked from face-up security", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT1-009", as: "attacker" }] },
        1: {
          hand: [{ card: "BT15-027", as: "playTarget" }],
          security: [{ card: "EX10-020", faceUp: true }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.battleArea.some(({ topCard }) => topCard.cardId === "BT15-027"));
    expect(s.state.players[1]!.battleArea.map(({ topCard }) => topCard.cardId)).toContain("BT15-027");
  });
});
