import { describe, expect, it } from "vitest";
import { getCardDefinition, getCompiledCard } from "@aegis/shared";
import { registeredCompiledCards } from "../../engine/effects/interpreter/compiledCards.js";
import { setupEngine } from "../../engine/testkit/harness.js";
import "./RB1-004.js";

describe("RB1-004 Agumon", () => {
  it("gives inherited +2000 DP to hosts whose name contains [Greymon], exactly or as a compound", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "RB1-007", as: "greymon", under: ["RB1-004"] },
          { card: "BT2-035", as: "geoGreymon", under: ["RB1-004"] },
          { card: "BT1-014", as: "kokatorimon", under: ["RB1-004"] },
        ],
      },
    });
    const greymonBase = s.perm("greymon").baseDP;
    const geoGreymonBase = s.perm("geoGreymon").baseDP;
    const kokatorimonBase = s.perm("kokatorimon").baseDP;
    await s.ready();

    expect(s.perm("greymon").currentDP).toBe(greymonBase + 2000);
    expect(s.perm("geoGreymon").currentDP).toBe(geoGreymonBase + 2000);
    expect(s.perm("kokatorimon").currentDP).toBe(kokatorimonBase);
  });

  it("does not give the DP on the opponent's turn", async () => {
    const s = setupEngine({
      1: { battleArea: [{ card: "RB1-007", as: "greymon", under: ["RB1-004"] }] },
    });
    const greymonBase = s.perm("greymon").baseDP;
    await s.ready();

    expect(s.perm("greymon").currentDP).toBe(greymonBase);
  });

  it("matches committed metadata and publishes fully covered compiled IR", () => {
    const definition = getCardDefinition("RB1-004");
    const compiled = registeredCompiledCards.get("RB1-004") ?? getCompiledCard("RB1-004");
    expect(definition).toMatchObject({ cardId: "RB1-004", nameEn: "Agumon", level: 3, dp: 2000, playCost: 3 });
    expect(compiled).toMatchObject({ coverage: "full", residual: [] });
    expect(compiled?.effects).toHaveLength(1);
  });
});
