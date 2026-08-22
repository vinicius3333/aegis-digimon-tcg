import { describe, expect, it } from "vitest";
import { compiled } from "./BT23-021.js";

describe("BT23-021 Dosukomon", () => {
  it("shares one Once Per Turn link effect across digivolving and attacking", () => {
    expect(compiled.effects.filter(({ trigger }) => ["WhenDigivolving", "WhenAttacking"].includes(trigger))).toEqual([
      expect.objectContaining({ frequency: "OncePerTurn", sharedUseKey: "ir-shared-0" }),
      expect.objectContaining({ frequency: "OncePerTurn", sharedUseKey: "ir-shared-0" }),
    ]);
  });

  it("installs only the printed Your Turn linked battle-deletion immunity", () => {
    const effect = compiled.effects.find(({ trigger }) => trigger === "YourTurn")!;
    expect(effect).toMatchObject({ frequency: "OncePerTurn", actions: [{ kind: "SubTrigger", event: "whenLinked", actions: [{ kind: "Restrict", restriction: "beDeletedInBattle" }] }] });
  });
});
