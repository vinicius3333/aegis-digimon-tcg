import { describe, expect, it } from "vitest";
import { CardKind, type CardDefinition } from "@aegis/shared";
import { setupEngine } from "../testkit/harness.js";
import { digimonEligibleForMindLink, hasTamerInDigivolutionStack } from "./mindLink.js";

const tamerDef = { cardId: "T-1", nameEn: "Tamer", kinds: [CardKind.Tamer] } as CardDefinition;
const digimonDef = { cardId: "D-1", nameEn: "Agumon", kinds: [CardKind.Digimon] } as CardDefinition;
const tokenDef = { cardId: "TK-1", nameEn: "Token", kinds: [CardKind.Digimon], isToken: true } as CardDefinition;

/** Seat 0 holds "withTamer" (a Tamer under a Digimon) and "bare" (nothing underneath). */
function board() {
  return setupEngine({
    0: {
      battleArea: [
        { card: "D-1", as: "withTamer", dp: 3000, under: [{ card: "T-1", faceUp: true }] },
        { card: "D-1", as: "bare", dp: 3000 },
      ],
    },
  });
}

describe("mindLink helpers", () => {
  it("detects Tamer in digivolution stack", () => {
    const s = board();
    expect(hasTamerInDigivolutionStack(s.perm("withTamer"), (c) => (c.cardId === "T-1" ? tamerDef : digimonDef))).toBe(
      true,
    );
    expect(hasTamerInDigivolutionStack(s.perm("bare"), () => digimonDef)).toBe(false);
  });

  it("rejects Digimon with Tamer in stack for Mind Link", () => {
    const s = board();
    const filter = { controller: "mine" as const, kind: ["Digimon"] as "Digimon"[] };
    const ok = digimonEligibleForMindLink(
      s.perm("withTamer"),
      filter,
      () => true,
      (c) => (c.cardId === "T-1" ? tamerDef : digimonDef),
    );
    expect(ok).toBe(false);
  });

  it("accepts eligible non-token Digimon", () => {
    const s = board();
    const filter = { controller: "mine" as const, kind: ["Digimon"] as "Digimon"[], excludeToken: true };
    const ok = digimonEligibleForMindLink(
      s.perm("bare"),
      filter,
      () => true,
      (c) => (c.cardId === "TK-1" ? tokenDef : digimonDef),
    );
    expect(ok).toBe(true);
  });
});
