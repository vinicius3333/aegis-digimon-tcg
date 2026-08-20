import { describe, expect, it } from "vitest";
import { compiled } from "./BT14-017.js";

describe("BT14-017", () => {
  it("gains Blitz on digivolution", () => expect(compiled.effects?.find((entry) => entry.trigger === "WhenDigivolving")).toMatchObject({ actions: [{ kind: "GainKeyword", keyword: { keyword: "Blitz" }, duration: "forTheTurn" }] }));
  it("gets +4000 DP and restricts opposing low-DP Digimon while memory is at least one", () => expect(compiled.effects?.find((entry) => entry.trigger === "AllTurns")).toMatchObject({ actions: [{ kind: "Aura", effect: { amount: 4000 }, while: { kind: "memoryAtLeast", value: 1 } }, { kind: "RestrictPlay", seat: "opponent", filter: { dpAtMost: 6000 }, while: { kind: "memoryAtLeast", value: 1 } }] }));
});
