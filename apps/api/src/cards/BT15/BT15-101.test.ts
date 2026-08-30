import { digivolutionRequirementsFor, getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "../index.js";
import { compiled } from "./BT15-101.js";

describe("BT15-101", () => {
  it("matches the catalog identity and alternate Gabumon digivolution route", () => {
    expect(getCardDefinition("BT15-101")).toMatchObject({
      cardId: "BT15-101",
      nameEn: "MetalGarurumon",
      colors: ["Blue"],
      kinds: ["Digimon"],
      level: 6,
      playCost: 12,
      dp: 12000,
      evoCosts: [{ color: "Blue", level: 5, memoryCost: 4 }],
      forms: ["Mega"],
      attributes: ["Data"],
      types: ["Cyborg"],
    });
    expect(compiled.digivolutionRequirement).toEqual([{ names: ["Gabumon"], cost: 4, isAlternate: true }]);
    expect(digivolutionRequirementsFor("BT15-101")).toEqual(compiled.digivolutionRequirement);
  });

  it("conditionally digivolves a Gabumon by paying 4 when Matt and an opposing 10000 DP Digimon exist", () =>
    expect(compiled.effects?.[1]).toMatchObject({
      trigger: "Main",
      actions: [
        {
          kind: "Digivolve",
          from: ["hand"],
          payCost: true,
          costOverride: 4,
          ignoreRequirements: true,
          optional: true,
          condition: { kind: "allOf" },
        },
      ],
    }));
  it("restricts three opposing Digimon/Tamers from suspending and unsuspends itself once per turn", () => {
    expect(compiled.effects?.[2]).toMatchObject({
      trigger: "WhenDigivolving",
      actions: [{ kind: "Restrict", target: { count: 3 }, restriction: "suspend", duration: "untilOpponentTurnEnd" }],
    });
    expect(compiled.effects?.[3]).toMatchObject({
      trigger: "AllTurns",
      frequency: "OncePerTurn",
      actions: [{ kind: "SubTrigger", event: "whenSuspended", actions: [{ kind: "Unsuspend", optional: true }] }],
    });
  });

  it("suspends to prevent a natural deletion, then unsuspends once from that suspension", async () => {
    const s = setupEngine(
      { 0: { battleArea: [{ card: "BT15-101", as: "metalGarurumon" }] } },
      { autoAcceptOptional: true },
    );
    const permanentId = s.perm("metalGarurumon").permanentId;
    await s.ready();

    expect(await advance(s.engine).verb.deletePermanent([permanentId], "byEffect")).toBe(0);
    await settle(() => s.state.players[0]!.battleArea.some(({ permanentId: id }) => id === permanentId));

    expect(s.state.players[0]!.battleArea.map(({ permanentId: id }) => id)).toEqual([permanentId]);
    expect(s.perm("metalGarurumon").isSuspended).toBe(false);
    expect(s.state.players[0]!.trash.some(({ cardId }) => cardId === "BT15-101")).toBe(false);
  });

  it("allows deletion when the suspension payment is unavailable", async () => {
    const s = setupEngine(
      { 0: { battleArea: [{ card: "BT15-101", as: "metalGarurumon", suspended: true }] } },
      { autoDeclineOptional: true },
    );
    const permanentId = s.perm("metalGarurumon").permanentId;
    await s.ready();

    expect(await advance(s.engine).verb.deletePermanent([permanentId], "byEffect")).toBe(1);
    expect(s.state.players[0]!.battleArea.some(({ permanentId: id }) => id === permanentId)).toBe(false);
    expect(s.state.players[0]!.trash.some(({ cardId }) => cardId === "BT15-101")).toBe(true);
  });
});
