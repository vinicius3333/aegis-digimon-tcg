import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { compiled } from "./BT17-056.js";
import "./index.js";

describe("BT17-056 Locomon", () => {
  it("once per turn reveals three after an attack target switch and places the eligible card underneath", () => {
    const effect = compiled.effects.find((entry) => entry.frequency === "OncePerTurn");
    expect(effect).toMatchObject({
      trigger: "AllTurns",
      actions: [
        {
          event: "whenAttackTargetSwitched",
          actions: [
            {
              kind: "RevealAdd",
              revealCount: 3,
              rest: "trash",
              add: [
                {
                  count: 1,
                  to: "placeUnder",
                  orFilters: [{ colors: ["Black"], levelComparison: { op: "lte", value: 5 } }],
                },
              ],
            },
          ],
        },
      ],
    });
  });

  it("may digivolve into GroundLocomon for free when its effect adds a source", () => {
    const effect = compiled.effects.find((entry) => entry.trigger === "AllTurns" && entry.frequency === undefined);
    expect(effect?.actions[0]).toMatchObject({
      kind: "SubTrigger",
      event: "onAddDigivolutionCards",
      sourceFilter: { isSelfRef: true },
      actions: [
        {
          kind: "Digivolve",
          from: ["hand"],
          payCost: false,
          optional: true,
          into: { nameOrTrait: [{ tokens: ["GroundLocomon"], match: "name" }] },
        },
      ],
    });
  });

  it("places a revealed black card underneath, trashes the rest, and free-digivolves", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT17-056", as: "locomon" }],
          hand: [{ card: "BT17-058", as: "groundLocomon" }],
          deck: [
            { card: "BT17-052", as: "eligible" },
            { card: "BT1-087", as: "remainderOne" },
            { card: "BT1-102", as: "remainderTwo" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const eligibleId = s.inst("eligible").instanceId;
    const remainderIds = [s.inst("remainderOne").instanceId, s.inst("remainderTwo").instanceId];
    const groundLocomonId = s.inst("groundLocomon").instanceId;
    await s.ready();

    await advance(s.engine).fireSubTrigger("whenAttackTargetSwitched", {
      subjectPermanentId: s.perm("locomon").permanentId,
    });
    await settle(() => s.perm("locomon").topCard?.instanceId === groundLocomonId);

    expect(s.perm("locomon").stack.some((card) => card.instanceId === eligibleId)).toBe(true);
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toEqual(expect.arrayContaining(remainderIds));
    expect(s.state.memory).toBe(0);
  });

  it("grants inherited Collision to a Machine host", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT17-058", under: ["BT17-056"], as: "machineHost" }] },
    });
    await s.ready();

    expect(observe(s.engine).hasKeyword(s.perm("machineHost"), "Collision")).toBe(true);
  });
});
