import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { compiled } from "./BT22-075.js";

describe("BT22-075 Fakemon", () => {
  it("grants Scapegoat while linked", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT22-071", as: "host", linked: [{ card: "BT22-075", as: "fakemon" }] }] },
    });
    await s.ready();

    expect(observe(s.engine).hasKeyword(s.perm("host"), "Scapegoat")).toBe(true);
  });

  it("links only cards with Link requirements from trash or this stack", () => {
    for (const trigger of ["OnPlay", "WhenDigivolving"]) {
      expect(compiled.effects.find((entry) => entry.trigger === trigger)?.actions[0]).toMatchObject({
        kind: "Link",
        from: ["trash", "digivolutionCards"],
        optional: true,
        target: {
          filter: {
            controller: "mine",
            kind: ["Digimon"],
            levelComparison: { op: "lte", value: 4 },
            hasLinkRequirement: true,
          },
          count: 1,
          source: "thisDigimon",
        },
      });
    }
  });

  it("plays one of this Digimon's linked cards on leave, once per turn", () => {
    const effect = compiled.effects.find((entry) => entry.trigger === "AllTurns");
    expect(effect).toMatchObject({
      frequency: "OncePerTurn",
      actions: [
        {
          event: "wouldLeavePlay",
          sourceFilter: { isSelfRef: true },
          actions: [
            {
              kind: "PlayWithoutCost",
              from: ["linked"],
              target: { filter: { isSelfRef: true, zone: "linked" }, count: 1 },
            },
          ],
        },
      ],
    });
  });

  it("plays its physical link card free when Fakemon would be deleted", async () => {
    const s = setupEngine(
      { 0: { battleArea: [{ card: "BT22-075", as: "fakemon", linked: [{ card: "BT22-071", as: "linked" }] }] } },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const linkedId = s.inst("linked").instanceId;
    await s.ready();
    await (
      s.engine as unknown as { primitives: { deletePermanent(ids: string[], cause: "byEffect"): Promise<unknown> } }
    ).primitives.deletePermanent([s.perm("fakemon").permanentId], "byEffect");
    await settle(() => s.state.players[0]!.battleArea.some((p) => p.topCard?.instanceId === linkedId));
    expect(s.state.players[0]!.battleArea.some((p) => p.topCard?.instanceId === linkedId)).toBe(true);
  });
});
