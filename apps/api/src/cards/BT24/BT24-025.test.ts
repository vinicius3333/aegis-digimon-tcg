import { describe, expect, it } from "vitest";
import { compiled } from "./BT24-025.js";

describe("BT24-025 Shellmon", () => {
  it("digivolves on another blue TS Digimon's unsuspend, ignoring only level", () => {
    const sub = compiled.effects.find((effect) => effect.trigger === "YourTurn")?.actions?.[0] as any;
    expect(sub).toMatchObject({
      kind: "SubTrigger",
      event: "whenUnsuspended",
      sourceFilter: { excludeSelf: true, colors: ["Blue"] },
    });
    expect(sub.actions[0]).toMatchObject({
      kind: "Digivolve",
      from: ["hand"],
      payCost: true,
      ignoreLevelRequirement: true,
      optional: true,
    });
  });

  it("keeps the once-per-turn end-of-turn unsuspend and inherited Jamming", () => {
    const end = compiled.effects.find((effect) => effect.trigger === "EndOfYourTurn") as any;
    expect(end.frequency).toBe("OncePerTurn");
    expect(end.actions[0]).toMatchObject({ kind: "Unsuspend", optional: true });
    expect(compiled.effects.find((effect) => effect.isInherited)?.keywords?.[0]?.keyword).toBe("Jamming");
  });
});
