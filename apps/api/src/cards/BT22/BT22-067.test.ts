import { digivolutionRequirementsFor, getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./BT22-067.js";
import "./index.js";

describe("BT22-067 LordKnightmon", () => {
  it("matches the printed card identity and keyword package", () => {
    expect(getCardDefinition("BT22-067")).toMatchObject({
      cardId: "BT22-067",
      nameEn: "LordKnightmon",
      colors: ["Black", "Red"],
      types: expect.arrayContaining(["CS"]),
      effectText: expect.stringContaining("1 of your Digimon gets +3000 DP"),
    });
  });

  it("registers complete compiled IR for both keywords, both buff/attack timings, and all player attacks", () => {
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
    expect(compiled.effects.filter((entry) => entry.trigger === "Static")).toHaveLength(2);
    expect(compiled.effects.find((entry) => entry.trigger === "OnPlay")?.actions[1]).toMatchObject({
      kind: "Attack",
      attackPlayer: true,
      optional: true,
    });
    expect(compiled.effects.find((entry) => entry.trigger === "AllTurns")?.actions[0]).toMatchObject({
      kind: "SubTrigger",
      event: "whenAttacking",
      sourceFilter: { controllerDefault: "any", kind: ["Digimon"] },
    });
  });

  it("gates the Rie Kishibe evolution path at three security cards", () => {
    expect(
      digivolutionRequirementsFor("BT22-067")?.find((entry) => entry.names?.includes("Rie Kishibe")),
    ).toMatchObject({
      cost: 5,
      whileCondition: { kind: "zoneCount", seat: "mine", zone: "security", op: "lte", value: 3 },
    });
  });

  it("buffs an ally, attacks a player, then plays an eligible reveal and trashes the rest", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT22-068", as: "attacker" }],
          hand: [{ card: "BT22-067", as: "lordknightmon" }],
          deck: ["BT1-009", "BT1-001", "EX5-007"],
        },
        1: { security: ["BT1-001", "BT1-002"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true },
    );
    s.state.memory = 12;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("lordknightmon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.cardId === "BT1-009"));
    await settle();

    expect(s.perm("attacker").isSuspended).toBe(true);
    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.cardId === "BT1-009")).toBe(true);
    expect(s.state.players[0]!.trash.map((card) => card.cardId)).toEqual(
      expect.arrayContaining(["BT1-001", "EX5-007"]),
    );
  });
});
