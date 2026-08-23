import { describe, expect, it } from "vitest";
import { assemblyRequirementFor } from "@aegis/shared";
import { setupEngine, settle } from "../testkit/harness.js";
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
});
