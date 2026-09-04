import { describe, expect, it } from "vitest";
import { digivolutionRequirementsFor } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { observe } from "../../engine/testkit/observe.js";
import { settle, setupEngine } from "../../engine/testkit/harness.js";
import { compiled } from "./EX8-054.js";

describe("EX8-054", () => {
  it("registers the printed keywords and once-per-turn effect windows", () => {
    expect(compiled.effects.filter((entry) => entry.trigger === "Static")).toHaveLength(3);
    expect(compiled.effects.find((entry) => entry.trigger === "WhenAttacking")).toMatchObject({
      frequency: "OncePerTurn",
      actions: [{ kind: "ActivateForeignEffect", zone: "digivolutionCards", fromTriggers: ["WhenDigivolving"] }],
    });
    expect(compiled.effects.find((entry) => entry.trigger === "EndOfYourTurn")).toMatchObject({
      frequency: "OncePerTurn",
      optional: true,
    });
    expect(digivolutionRequirementsFor("EX8-054")).toContainEqual({
      level: 6,
      names: ["Justimon"],
      excludeTraits: ["X Antibody"],
      cost: 1,
      isAlternate: true,
    });
  });
  it("exposes the three printed static keywords on live state", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "EX8-054", as: "justimon" }] } });
    await s.ready();

    expect(observe(s.engine).hasKeyword(s.perm("justimon"), "Rush")).toBe(true);
    expect(observe(s.engine).hasPierce(s.perm("justimon"))).toBe(true);
    expect(observe(s.engine).keywordAmount(s.perm("justimon"), "SecurityAttack")).toBe(1);
  });

  it("activates a Justimon source's When Digivolving effect when attacking", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "EX8-054", as: "xAntibody", under: ["EX2-038"] }] },
        1: { security: 1 },
      },
      { autoChooseOption: true, autoSelectCards: true },
    );
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("xAntibody").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("xAntibody").currentDP === 14000);
    expect(s.perm("xAntibody").currentDP).toBe(14000);
  });

  it("attacks a player at end of turn when the opponent has an unsuspended Digimon", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "EX8-054", as: "xAntibody" }] },
        1: { battleArea: [{ card: "AD1-001", as: "opponent" }], security: 1 },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await advance(s.engine).runTurn(0);
    await settle(() => s.state.players[1]!.security.length === 0);
    expect(s.perm("opponent").isSuspended).toBe(false);
  });
});
