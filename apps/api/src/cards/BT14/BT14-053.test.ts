import { describe, expect, it } from "vitest";
import { compiled } from "./BT14-053.js";

describe("BT14-053", () => {
  it("suspends an opposing Digimon or Tamer on digivolution and attack", () => {
    for (const trigger of ["WhenDigivolving", "WhenAttacking"]) expect(compiled.effects?.find((entry) => entry.trigger === trigger)?.actions[0]).toMatchObject({ kind: "Suspend", target: { filter: { controller: "opponent", kind: ["Digimon", "Tamer"] } } });
  });
  it("once per turn may unsuspend itself when your effect suspends something", () => expect(compiled.effects?.find((entry) => entry.trigger === "YourTurn")).toMatchObject({ frequency: "OncePerTurn", actions: [{ kind: "SubTrigger", event: "whenEffectSuspends", actions: [{ kind: "Unsuspend" }] }] }));
});
