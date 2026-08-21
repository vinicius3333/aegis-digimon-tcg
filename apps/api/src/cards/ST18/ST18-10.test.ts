import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "../index.js";
import { compiled } from "./ST18-10.js";

describe("ST18-10 GrandGalemon", () => {
  it("suspends a Digimon and, when it suspends yours, plays a qualifying Bird from hand", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "ST18-10", as: "grandgalemon" }, { card: "ST18-03", as: "bird" }],
          battleArea: [{ card: "ST18-03", as: "ownTarget" }],
        },
        1: { battleArea: [{ card: "ST18-03", as: "opponentTarget" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 7;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("grandgalemon").instanceId })).toEqual({ ok: true });
    await settle(() => s.perm("ownTarget").isSuspended);
    await settle(() => s.state.players[0]!.battleArea.some((perm) => perm.topCard?.instanceId === s.inst("bird").instanceId));

    expect(s.perm("ownTarget").isSuspended).toBe(true);
    expect(s.state.players[0]!.battleArea.some((perm) => perm.topCard?.instanceId === s.inst("bird").instanceId)).toBe(true);
    expect(s.perm("opponentTarget").isSuspended).toBe(false);
  });

  it("publishes the inherited once-per-turn unsuspend effect", () => {
    expect(compiled.effects).toContainEqual(expect.objectContaining({
      trigger: "YourTurn",
      isInherited: true,
      frequency: "OncePerTurn",
      actions: [expect.objectContaining({ kind: "SubTrigger", event: "whenAttacking" })],
    }));
  });
});
