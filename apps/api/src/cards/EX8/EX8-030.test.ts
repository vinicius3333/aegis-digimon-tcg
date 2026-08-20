import { describe, expect, it } from "vitest";
import { compiled } from "./EX8-030.js";

describe("EX8-030", () => {
  it("prevents the opponent from gaining memory except through Tamer effects", () => expect(compiled.effects?.find((entry) => entry.trigger === "AllTurns")?.actions[0]).toMatchObject({ kind: "RestrictMemoryGain", seat: "opponent", exceptTamerEffects: true, duration: "permanent" }));
});
