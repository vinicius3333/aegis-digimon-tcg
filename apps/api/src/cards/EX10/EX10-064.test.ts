import { describe, expect, it } from "vitest";
import { compiled } from "./EX10-064.js";

describe("EX10-064 Yuu Amano & Nene Amano compiled contract", () => {
  it("proves the draw cost, DigiXros expansion, and Security play clauses", () => {
    expect(compiled).toMatchObject({ coverage: "full", residual: [] });
    expect(compiled.effects).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          trigger: "StartOfYourMainPhase",
          actions: [expect.objectContaining({ kind: "Draw", cost: expect.objectContaining({ kind: "place" }) })],
        }),
        expect.objectContaining({
          trigger: "AllTurns",
          actions: [
            expect.objectContaining({
              kind: "Replacement",
              event: "wouldBePlayed",
              actions: expect.arrayContaining([expect.objectContaining({ kind: "DigiXrosExtraMaterial" })]),
            }),
          ],
        }),
        expect.objectContaining({
          trigger: "Security",
          isSecurity: true,
          actions: [expect.objectContaining({ kind: "PlayWithoutCost", payCost: false })],
        }),
      ]),
    );
  });
});
