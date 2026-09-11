import { describe, expect, it } from "vitest";
import { Phase, assemblyRequirementFor } from "@aegis/shared";
import { setupEngine, settle } from "../testkit/harness.js";
import { advance } from "../testkit/advance.js";
import "../../cards/index.js";

const BT26_ASSEMBLY = [
  "BT26-014",
  "BT26-017",
  "BT26-028",
  "BT26-037",
  "BT26-047",
  "BT26-073",
  "BT26-079",
  "BT26-081",
  "BT26-083",
  "BT26-085",
  "BT26-086",
] as const;

describe("BT26 Assembly requirements", () => {
  it("exposes every printed BT26 Assembly recipe to the shared play-legality seam", () => {
    for (const cardId of BT26_ASSEMBLY) {
      const requirement = assemblyRequirementFor(cardId)?.[0];
      expect(requirement, cardId).toBeDefined();
      expect(requirement?.reduceCost, cardId).toBeGreaterThan(0);
      expect(requirement?.materials[0]?.count, cardId).toBeGreaterThan(0);
    }
  });

  it("plays BT26-014 by placing its TB material from trash and applying Assembly -2", async () => {
    const s = setupEngine({
      0: {
        hand: [{ card: "BT26-014", as: "assembled" }],
        trash: [{ card: "BT26-013", as: "material" }],
      },
    });
    s.state.memory = 50;

    const result = s.engine.applyIntent(0, {
      type: "playCard",
      instanceId: s.inst("assembled").instanceId,
      assembly: { materialInstanceIds: [s.inst("material").instanceId] },
    } as never);

    expect(result).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some((p) => p.topCard?.cardId === "BT26-014"));
    expect(s.state.players[0]!.trash.some((c) => c.cardId === "BT26-013")).toBe(false);
    const played = s.state.players[0]!.battleArea.find((p) => p.topCard?.cardId === "BT26-014");
    expect(played?.stack.some((c) => c.cardId === "BT26-013")).toBe(true);
  });

  it("keeps the main phase open when only the Assembly-reduced cost is affordable", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [
            { card: "BT26-079", as: "assembled" },
            { card: "BT1-027", as: "cheap" },
          ],
          trash: [{ card: "BT26-059", as: "material" }],
          deck: ["BT1-009", "BT1-010", "BT1-011"],
        },
        1: { deck: ["BT1-009", "BT1-010", "BT1-011"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);

    // At 1 memory the gauge affords 11: BT26-079's printed cost of 12 is out of reach, while its
    // Assembly -2 declaration brings the play to exactly 10 (§7-3, the KB's "if an effect that
    // reduces the original cost is used and the cost can be paid, that card can then be used").
    s.state.memory = 3;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("cheap").instanceId })).toEqual({ ok: true });
    await settle();
    expect(s.state.memory).toBe(1);
    expect(s.state.turnSeat).toBe(0);
    expect(s.state.phase).toBe(Phase.Main);

    expect(
      s.engine.applyIntent(0, {
        type: "playCard",
        instanceId: s.inst("assembled").instanceId,
        assembly: { materialInstanceIds: [s.inst("material").instanceId] },
      } as never),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some((p) => p.topCard?.cardId === "BT26-079"));
    // Paying 10 from 1 crosses the gauge, so the turn passes and the value is now read from the
    // opponent's perspective: 9 on their side is -9 on the player's.
    expect(s.state.memory).toBe(9);

    expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });
});
