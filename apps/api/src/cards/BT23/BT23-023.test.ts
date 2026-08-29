import { getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine } from "../../engine/testkit/harness.js";
import "../index.js";
import { compiled } from "./BT23-023.js";

describe("BT23-023 Whamon", () => {
  it("once per turn replaces non-owner-effect removal with an optional stack play", () => {
    expect(getCardDefinition("BT23-023")).toMatchObject({
      cardId: "BT23-023",
      nameEn: "Whamon",
      colors: ["Blue"],
      level: 5,
      playCost: 9,
      dp: 9000,
      evoCosts: [{ color: "Blue", level: 4, memoryCost: 3 }],
      forms: ["Ultimate"],
      attributes: ["Vaccine"],
      types: ["Sea Animal", "CS"],
    });
    const effect = compiled.effects.find((entry) => entry.trigger === "AllTurns") as any;
    const replacement = effect.actions[0];
    expect(effect.frequency).toBe("OncePerTurn");
    expect(replacement).toMatchObject({
      kind: "Replacement",
      event: "wouldLeavePlay",
      leaveCause: "otherThanYourEffect",
      sourceFilter: { isSelfRef: true },
      actions: [
        {
          kind: "PlayWithoutCost",
          target: {
            source: "thisDigimon",
            filter: {
              controller: "mine",
              kind: ["Digimon"],
              colors: ["Blue"],
              levelComparison: { op: "lte", value: 4 },
            },
            orFilters: [
              {
                controller: "mine",
                kind: ["Digimon"],
                levelComparison: { op: "lte", value: 4 },
                nameOrTrait: [{ tokens: ["CS"], match: "trait" }],
              },
            ],
            count: 1,
          },
          from: ["digivolutionCards"],
          payCost: false,
          optional: true,
        },
      ],
    });
    expect(compiled.effects.find((entry) => entry.isInherited)).toMatchObject({
      trigger: "AllTurns",
      frequency: "OncePerTurn",
      isInherited: true,
      actions: [expect.objectContaining({ kind: "Replacement", event: "wouldLeavePlay" })],
    });
    expect(compiled.digivolutionRequirement).toEqual([{ level: 4, traits: ["CS"], cost: 3, isAlternate: true }]);
  });

  it("plays a blue level-4 source for free before Whamon leaves by an opponent effect", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT23-023", as: "whamon", under: [{ card: "BT23-018", as: "eligible" }, "BT1-064"] }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.turnSeat = 1;
    const whamonId = s.perm("whamon").permanentId;
    expect(await advance(s.engine).verb.deletePermanent([whamonId], "byEffect")).toBe(1);
    expect(
      s.state.players[0]!.battleArea.some((card) => card.topCard?.instanceId === s.inst("eligible").instanceId),
    ).toBe(true);
    expect(s.state.players[0]!.battleArea.some((card) => card.permanentId === whamonId)).toBe(false);
  });

  it("only searches Whamon's own digivolution cards", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT23-023", as: "whamon", under: [{ card: "BT1-009", as: "ineligible" }] },
            { card: "BT23-035", as: "neighbor", under: [{ card: "BT23-019", as: "wrongStack" }] },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.turnSeat = 1;
    const whamonId = s.perm("whamon").permanentId;
    expect(await advance(s.engine).verb.deletePermanent([whamonId], "byEffect")).toBe(1);
    expect(
      s.state.players[0]!.battleArea.some((card) => card.topCard?.instanceId === s.inst("wrongStack").instanceId),
    ).toBe(false);
    expect(s.perm("neighbor").stack.some((card) => card.instanceId === s.inst("wrongStack").instanceId)).toBe(true);
    expect(s.state.players[0]!.battleArea.some((card) => card.permanentId === whamonId)).toBe(false);
  });

  it("inherits the same CS-or-blue reaction from a realistic stack", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT23-035", as: "carrier", under: [{ card: "BT23-017", as: "eligible" }, "BT23-023", "BT1-064"] },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.turnSeat = 1;
    const carrierId = s.perm("carrier").permanentId;
    expect(await advance(s.engine).verb.deletePermanent([carrierId], "byEffect")).toBe(1);
    expect(
      s.state.players[0]!.battleArea.some((card) => card.topCard?.instanceId === s.inst("eligible").instanceId),
    ).toBe(true);
  });

  it("does not react to its controller's own effect", async () => {
    const s = setupEngine(
      { 0: { battleArea: [{ card: "BT23-023", as: "whamon", under: [{ card: "BT23-018", as: "eligible" }] }] } },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.turnSeat = 0;
    expect(await advance(s.engine).verb.deletePermanent([s.perm("whamon").permanentId], "byEffect")).toBe(1);
    expect(
      s.state.players[0]!.battleArea.some((card) => card.topCard?.instanceId === s.inst("eligible").instanceId),
    ).toBe(false);
  });
});
