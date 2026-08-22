import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "../index.js";
import { compiled } from "./BT13-047.js";

describe("BT13-047 Angoramon", () => {
  it("keeps Blocker and the no-unsuspended-opponent aura", () => {
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
    expect(compiled.effects[0]).toMatchObject({
      trigger: "Static",
      keywords: [expect.objectContaining({ keyword: "Blocker" })],
    });
    expect(compiled.effects[1]).toMatchObject({
      trigger: "AllTurns",
      isInherited: true,
      actions: [
        {
          kind: "Aura",
          target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
          effect: { kind: "modifyDP", amount: 1000 },
          while: {
            kind: "opponentHasNone",
            filter: { controllerDefault: "opponent", unsuspended: true, kind: ["Digimon"] },
            raw: expect.stringContaining("no unsuspended Digimon"),
          },
        },
      ],
    });
  });

  it("gains the inherited +1000 DP when the opponent has no Digimon", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT1-009", under: ["BT13-047"], as: "host" }] } });
    await settle(() => s.perm("host").currentDP === 4000);
    expect(s.perm("host").currentDP).toBe(4000);
  });
});
