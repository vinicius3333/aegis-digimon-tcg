import { describe, expect, it } from "vitest";
import { irNode } from "../../engine/testkit/irNode.js";
import { compiled } from "./EX11-072.js";

describe("EX11-072 Unique Emblem: Guardian Vortex", () => {
  it("requires both Bird Dragon and LIBERATOR on the Delay digivolution target", () => {
    const delay = compiled.effects?.find((effect) => effect.trigger === "YourTurn");
    const action = delay?.actions?.[0];
    expect(action?.kind).toBe("SubTrigger");
    expect(irNode(action)?.actions?.[0]?.into?.nameOrTrait?.[0]).toMatchObject({
      match: "traitAll",
      tokens: ["Bird Dragon", "LIBERATOR"],
    });
  });
});
