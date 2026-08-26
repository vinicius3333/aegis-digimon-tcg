import { getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { assertNoLoudGap, settle, setupEngine } from "../../engine/testkit/harness.js";
import "../index.js";
import { compiled } from "./BT14-031.js";

describe("BT14-031", () => {
  it("preserves Elecmon's catalog identity and exact inherited IR", () => {
    expect(getCardDefinition("BT14-031")).toMatchObject({
      nameEn: "Elecmon",
      colors: ["Yellow"],
      level: 3,
      playCost: 3,
      dp: 2000,
      evoCosts: [{ color: "Yellow", level: 2, memoryCost: 0 }],
      attributes: ["Data"],
      types: ["Mammal"],
    });
    expect(compiled).toMatchObject({
      coverage: "full",
      residual: [],
      effects: [
        {
          trigger: "WhenAttacking",
          isInherited: true,
          frequency: "OncePerTurn",
          actions: [
            {
              kind: "ModifyDP",
              amount: -2000,
              duration: "forTheTurn",
              target: { filter: { controller: "opponent", kind: ["Digimon"] } },
            },
          ],
        },
      ],
    });
  });

  it("evolves legally from a yellow Digi-Egg for zero memory", async () => {
    const s = setupEngine({
      0: { breeding: { card: "BT14-003", as: "egg" }, hand: [{ card: "BT14-031", as: "elecmon" }] },
    });
    s.state.memory = 3;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("egg").permanentId,
        instanceId: s.inst("elecmon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("egg").topCard.cardId === "BT14-031");
    expect(s.perm("egg").stack.map((card) => card.cardId)).toEqual(["BT14-003"]);
    expect(s.state.memory).toBe(3);
    assertNoLoudGap(s);
  });

  it("the inherited effect gives exactly one opposing Digimon -2000 DP once per turn", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT14-035", as: "host", under: ["BT14-003", "BT14-031"] }] },
        1: {
          battleArea: [
            { card: "BT14-026", as: "target", dp: 8000 },
            { card: "BT14-028", as: "control", dp: 1000, suspended: true },
          ],
          security: ["BT1-001"],
        },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 10;
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "permanent", permanentId: s.perm("control").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("target").currentDP === 6000 && s.state.players[1]!.trash.length > 0);
    await settle();
    await advance(s.engine).verb.unsuspend([s.perm("host").permanentId]);
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.security.length === 0);
    expect(s.perm("target").currentDP).toBe(6000);
    assertNoLoudGap(s);
  });
});
