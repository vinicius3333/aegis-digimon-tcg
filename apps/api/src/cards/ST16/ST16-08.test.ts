import { describe, expect, it } from "vitest";
import { EffectTiming } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./ST16-08.js";

describe("ST16-08 Garurumon", () => {
  it("plays an exact-name Gabumon from hand with its security effect", async () => {
    const s = setupEngine(
      {
        0: {
          security: [{ card: "ST16-08", as: "garurumon", faceUp: true }],
          hand: [{ card: "BT1-029", as: "gabumon" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );

    await advance(s.engine).fireForInstance(EffectTiming.SecuritySkill, s.inst("garurumon"));

    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.cardId === "BT1-029")).toBe(true);
  });

  it("does not treat a longer Gabumon name as exact Gabumon (Q823)", async () => {
    const s = setupEngine(
      {
        0: {
          security: [{ card: "ST16-08", as: "garurumon", faceUp: true }],
          hand: [{ card: "BT9-020", as: "gabumonX" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );

    await advance(s.engine).fireForInstance(EffectTiming.SecuritySkill, s.inst("garurumon"));

    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("gabumonX").instanceId)).toBe(true);
    expect(s.state.players[0]!.battleArea).toHaveLength(0);
  });

  it("plays a Tamer whose name contains Matt Ishida from trash", async () => {
    const s = setupEngine(
      {
        0: {
          security: [{ card: "ST16-08", as: "garurumon", faceUp: true }],
          trash: [{ card: "AD1-019", as: "mattTamer" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );

    await advance(s.engine).fireForInstance(EffectTiming.SecuritySkill, s.inst("garurumon"));

    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.cardId === "AD1-019")).toBe(true);
  });

  it("draws 1 then trashes 1 card when digivolving", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "ST16-03", as: "gabumon" }],
          hand: [
            { card: "ST16-08", as: "garurumon" },
            { card: "BT1-001", as: "discard" },
          ],
          deck: [{ card: "BT1-002", as: "drawn" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    const discardId = s.inst("discard").instanceId;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("gabumon").permanentId,
        instanceId: s.inst("garurumon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.trash.some((card) => card.instanceId === discardId));

    expect(s.perm("gabumon").topCard.cardId).toBe("ST16-08");
    expect(s.state.players[0]!.hand.some((card) => card.cardId === "BT1-002")).toBe(true);
    expect(s.state.players[0]!.trash.some((card) => card.instanceId === discardId)).toBe(true);
  });
});
