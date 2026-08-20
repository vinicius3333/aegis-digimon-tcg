import { describe, expect, it } from "vitest";
import { compiled } from "./EX8-043.js";

describe("EX8-043", () => {
  it("may suspend either player's Digimon, then de-digivolves an opposing Digimon if this Digimon is suspended", () => {
    const actions = compiled.effects?.find((entry) => entry.trigger === "OnPlay")?.actions ?? [];
    expect(actions[0]).toMatchObject({ kind: "Suspend", optional: true });
    expect(actions[1]).toMatchObject({ kind: "DeDigivolve", amount: 1, condition: { kind: "selfIsSuspended" } });
  });
  it("protects itself from opponent returns and de-digivolution while suspended", () => {
    const actions = compiled.effects?.find((entry) => entry.trigger === "OnPlay")?.actions ?? [];
    expect(actions[2]).toMatchObject({ kind: "Restrict", restriction: "beReturned", byOpponentEffectsOnly: true, duration: "untilOpponentTurnEnd" });
    expect(actions[3]).toMatchObject({ kind: "Restrict", restriction: "cantBeDeDigivolved", duration: "untilOpponentTurnEnd" });
  });
});
