import { describe, expect, it } from "vitest";
import { digivolutionRequirementsFor } from "@aegis/shared";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./BT22-063.js";

describe("BT22-063 Alphamon", () => {
  it("has Reboot and Blocker and reduces one opposing Digimon on all three timings", () => {
    expect(compiled.effects).toEqual(
      expect.arrayContaining([
        { trigger: "Static", actions: [], keywords: [{ keyword: "Reboot", raw: "＜Reboot＞" }] },
        { trigger: "Static", actions: [], keywords: [{ keyword: "Blocker", raw: "＜Blocker＞" }] },
      ]),
    );

    for (const trigger of ["OnPlay", "WhenDigivolving", "WhenAttacking"]) {
      expect(compiled.effects.find((entry) => entry.trigger === trigger)).toMatchObject({
        actions: [
          {
            kind: "ModifyDP",
            amount: -5000,
            duration: "forTheTurn",
            target: { filter: { controller: "opponent", kind: ["Digimon"] }, count: 1 },
          },
        ],
      });
    }
  });

  it("unsuspends every time it suspends, while gating only the DP boost", () => {
    const allTurns = compiled.effects.find((entry) => entry.trigger === "AllTurns");
    expect(allTurns).toMatchObject({ frequency: "OncePerTurn" });
    expect(allTurns?.actions).toMatchObject([
      {
        kind: "SubTrigger",
        event: "whenSuspended",
        sourceFilter: { isSelfRef: true },
        actions: [
          {
            kind: "ModifyDP",
            amount: 3000,
            duration: "untilOpponentTurnEnd",
            condition: {
              kind: "orConditions",
              conditions: [
                {
                  kind: "selfDigivolutionStackHasTrait",
                  filter: { nameOrTrait: [{ tokens: ["Kyoko Kuremi"], match: "name" }] },
                },
                { kind: "stackHasSameLevelCards", minCount: 2 },
              ],
            },
          },
          { kind: "Unsuspend", target: { filter: { isSelfRef: true }, count: 1, isSelf: true } },
        ],
      },
    ]);
  });

  it("limits the Kyoko Kuremi alternate digivolution to three security cards", () => {
    const requirement = compiled.digivolutionRequirement?.find((entry) => entry.names?.includes("Kyoko Kuremi"));
    expect(requirement).toMatchObject({
      cost: 5,
      isAlternate: true,
      whileCondition: { kind: "zoneCount", seat: "mine", zone: "security", op: "lte", value: 3 },
    });
  });

  it("exposes the same three-security Kyoko gate to shared legality consumers", () => {
    expect(
      digivolutionRequirementsFor("BT22-063")?.find((entry) => entry.names?.includes("Kyoko Kuremi")),
    ).toMatchObject({
      cost: 5,
      whileCondition: { kind: "zoneCount", seat: "mine", zone: "security", op: "lte", value: 3 },
    });
  });

  it("unsuspends after attacking even when neither DP-boost condition is true", async () => {
    const s = setupEngine(
      { 0: { battleArea: [{ card: "BT22-063", as: "alphamon" }] }, 1: { security: ["BT1-001"] } },
      { autoSelectCards: true },
    );
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("alphamon").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("alphamon").isSuspended === false);

    expect(s.perm("alphamon").isSuspended).toBe(false);
  });
});
