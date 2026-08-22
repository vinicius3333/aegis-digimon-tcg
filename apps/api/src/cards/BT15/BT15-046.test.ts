import { describe, expect, it } from "vitest";
import { EffectTiming } from "@aegis/shared";
import { getEffectModule } from "../../engine/effects/registry.js";
import "./BT15-046.js";

const source = { instanceId: "source", cardId: "BT15-046", ownerSeat: 0, definition: {}, permanent: () => undefined, isOnBattleArea: () => true, isOwnersTurn: () => true, hasColor: () => true } as never;

describe("BT15-046", () => {
  it("registers the once-per-turn watcher for your Digimon suspending", async () => {
    const { compiled } = await import("./BT15-046.js");
    expect(compiled.effects?.[0]).toMatchObject({ trigger: "YourTurn", frequency: "OncePerTurn", actions: [{ kind: "SubTrigger", event: "whenSuspended", sourceFilter: { controller: "mine", kind: ["Digimon"] }, actions: [{ kind: "Draw", amount: 1 }] }] });
  });
  it("registers the draw trigger in the typed YourTurn IR", () => expect(compiled.effects?.[0]).toMatchObject({ trigger: "YourTurn", frequency: "OncePerTurn", actions: [{ kind: "SubTrigger", event: "whenSuspended" }] }));
});
