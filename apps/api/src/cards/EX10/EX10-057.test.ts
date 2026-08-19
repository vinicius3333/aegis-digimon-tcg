import { describe, expect, it } from "vitest";
import "./EX10-057.js";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";

describe("EX10-057 Piedmon", () => {
  it("plays itself from hand for 6 only when every controlled Digimon has Dark Masters in its text", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "EX10-057", as: "piedmon" }],
          battleArea: ["BT15-027"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 0;
    await s.ready();
    const entries = JSON.parse(s.inst("piedmon").activatableEffectsJson || "[]") as Array<{
      effectKey: string;
      instanceId: string;
    }>;
    const entry = entries.find(({ instanceId }) => instanceId === s.inst("piedmon").instanceId);
    expect(entry).toBeDefined();

    expect(
      s.engine.applyIntent(0, {
        type: "activateEffect",
        sourceInstanceId: s.inst("piedmon").instanceId,
        effectKey: entry!.effectKey,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some(({ topCard }) => topCard.cardId === "EX10-057"));
    expect(s.state.memory).toBe(-6);
  });

  it("places itself face-up at the security bottom on deletion only with no face-up purple security", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "EX10-057", as: "piedmon" }],
        security: [{ card: "BT1-009", faceUp: false }],
      },
    });
    const instanceId = s.perm("piedmon").topCard.instanceId;

    await advance(s.engine).verb.deletePermanent([s.perm("piedmon").permanentId]);
    await settle(() => s.state.players[0]!.security.some((card) => card.instanceId === instanceId));

    const placed = s.state.players[0]!.security.find((card) => card.instanceId === instanceId)!;
    expect(placed.faceUp).toBe(true);
  });

  it("does not return to security when a purple face-up security card already exists", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "EX10-057", as: "piedmon" }],
        security: [{ card: "BT10-071", faceUp: true }],
      },
    });
    const instanceId = s.perm("piedmon").topCard.instanceId;

    await advance(s.engine).verb.deletePermanent([s.perm("piedmon").permanentId]);
    await settle();

    expect(s.state.players[0]!.security.some((card) => card.instanceId === instanceId)).toBe(false);
    expect(s.state.players[0]!.trash.some((card) => card.instanceId === instanceId)).toBe(true);
  });

  it("plays a level 5 Dark Masters-text card only when checked from face-up security", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT1-009", as: "attacker" }] },
        1: {
          hand: [{ card: "BT15-027", as: "playTarget" }],
          security: [{ card: "EX10-057", faceUp: true }],
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
