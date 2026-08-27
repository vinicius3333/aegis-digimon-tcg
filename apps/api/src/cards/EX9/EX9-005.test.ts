import { describe, expect, it } from "vitest";
import { EffectTiming } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { compiled } from "./EX9-005.js";

describe("EX9-005", () => {
  it("once per breeding turn may play a Negamon-text Digimon from hand with cost reductions and place it underneath itself", () => {
    const actions = compiled.effects?.find((entry) => entry.isBreeding && entry.trigger === "Main")?.actions ?? [];
    expect(actions[0]).toMatchObject({
      kind: "PlayWithoutCost",
      from: ["hand"],
      payCost: true,
      reduceCostBy: 2,
      reduceCostByScaling: {
        per: 1,
        unit: "cards",
        filter: {
          zone: ["trash", "digivolutionCards"],
          kind: ["Digimon", "DigiEgg"],
          nameOrTrait: [{ tokens: ["Negamon"], match: "nameExact" }],
        },
      },
    });
    expect(actions[1]).toMatchObject({ kind: "PlaceUnder" });
  });
  it("restricts itself from digivolving, being deleted, and being trashed, and redirects opponent attacks", () => {
    expect(compiled.effects?.find((entry) => entry.trigger === "AllTurns")?.actions).toHaveLength(3);
    expect(compiled.effects?.find((entry) => entry.trigger === "OpponentsTurn")?.actions[0]).toMatchObject({
      kind: "SubTrigger",
      event: "whenOpponentAttacks",
    });
  });

  it("keeps the breeding card from digivolving or leaving by effects", async () => {
    const s = setupEngine({ 0: { breeding: { card: "EX9-005", as: "negamon" } } });
    await s.ready();
    const breeding = s.state.players[0]!.breeding!;
    expect(observe(s.engine).isRestricted(breeding, "digivolve")).toBe(true);
    expect(observe(s.engine).isRestricted(breeding, "beDeleted")).toBe(true);
    expect(observe(s.engine).isRestricted(breeding, "beTrashed")).toBe(true);
  });

  it("redirects one opponent attack to an inherited Negamon-text Digimon per turn", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX9-047", as: "host", under: ["EX9-005"], dp: 10000 }],
          security: ["BT1-001", "BT1-002"],
        },
        1: {
          battleArea: [
            { card: "BT1-016", as: "attacker", dp: 1000 },
            { card: "BT1-016", as: "second", dp: 1000 },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.turnSeat = 1;
    await s.ready();

    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.battleArea.length === 1);
    expect(s.state.players[0]!.security).toHaveLength(2);

    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("second").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.security.length === 1);
  });

  it("plays a Negamon-text Digimon from hand and places Negamon underneath it", async () => {
    const s = setupEngine(
      { 0: { breeding: { card: "EX9-005", as: "negamon" }, hand: [{ card: "EX9-046", as: "played" }] } },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 1;
    await advance(s.engine).fire(EffectTiming.OnDeclaration, s.perm("negamon"));
    await settle(() => s.state.players[0]!.battleArea[0]?.stack.some((card) => card.cardId === "EX9-005"), 100);
    expect(s.state.players[0]!.battleArea[0]!.topCard.cardId).toBe("EX9-046");
    expect(s.state.players[0]!.battleArea[0]!.stack.map((card) => card.cardId)).toContain("EX9-005");
  });

  it("counts named Negamon Digi-Eggs in trash and Digimon stacks for the extra reduction", async () => {
    const s = setupEngine(
      {
        0: {
          breeding: { card: "EX9-005", as: "negamon" },
          battleArea: [{ card: "BT1-009", under: ["EX9-005"] }],
          hand: [{ card: "EX9-047", as: "played" }],
          trash: ["EX9-005"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 0;
    await advance(s.engine).fire(EffectTiming.OnDeclaration, s.perm("negamon"));
    await settle(() => s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.cardId === "EX9-047"));

    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.cardId === "EX9-047")).toBe(true);
    expect(s.state.memory).toBe(-3);
  });

  it("counts a named Negamon Digi-Egg in trash for the extra reduction", async () => {
    const s = setupEngine(
      {
        0: {
          breeding: { card: "EX9-005", as: "negamon" },
          hand: [{ card: "EX9-047", as: "played" }],
          trash: ["EX9-005"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 0;
    await advance(s.engine).fire(EffectTiming.OnDeclaration, s.perm("negamon"));
    await settle(() => s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.cardId === "EX9-047"));
    expect(s.state.memory).toBe(-4);
  });

  it("counts a named Negamon Digi-Egg in a Digimon stack for the extra reduction", async () => {
    const s = setupEngine(
      {
        0: {
          breeding: { card: "EX9-005", as: "negamon" },
          battleArea: [{ card: "BT1-009", under: ["EX9-005"] }],
          hand: [{ card: "EX9-047", as: "played" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 0;
    await advance(s.engine).fire(EffectTiming.OnDeclaration, s.perm("negamon"));
    await settle(() => s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.cardId === "EX9-047"));
    expect(s.state.memory).toBe(-4);
  });

  it("does not count a card that only mentions Negamon in its text", async () => {
    const s = setupEngine(
      {
        0: {
          breeding: { card: "EX9-005", as: "negamon" },
          hand: [{ card: "EX9-047", as: "played" }],
          trash: ["EX9-047"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 0;
    await advance(s.engine).fire(EffectTiming.OnDeclaration, s.perm("negamon"));
    await settle(() => s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.cardId === "EX9-047"));
    expect(s.state.memory).toBe(-5);
  });
});
