import { describe, expect, it } from "vitest";
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

  it("places a revealed black card underneath, trashes the rest, and free-digivolves after a natural target switch", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT17-056", as: "locomon" },
            { card: "BT17-059", as: "diaboromon" },
          ],
          hand: [{ card: "BT17-058", as: "groundLocomon" }],
          deck: [
            { card: "BT17-052", as: "eligible" },
            { card: "BT1-087", as: "remainderOne" },
            { card: "BT1-102", as: "remainderTwo" },
          ],
        },
        1: {
          battleArea: [
            { card: "BT17-052", as: "attackerOne" },
            { card: "BT17-053", as: "attackerTwo" },
          ],
          security: ["BT1-001"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const eligibleId = s.inst("eligible").instanceId;
    const remainderIds = [s.inst("remainderOne").instanceId, s.inst("remainderTwo").instanceId];
    const groundLocomonId = s.inst("groundLocomon").instanceId;
    const attackerOneId = s.inst("attackerOne").instanceId;
    s.state.turnSeat = 1;
    await s.ready();

    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attackerOne").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("locomon").topCard?.instanceId === groundLocomonId);

    expect(s.perm("locomon").stack.some((card) => card.instanceId === eligibleId)).toBe(true);
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toEqual(expect.arrayContaining(remainderIds));
    expect(s.state.players[1]!.security).toHaveLength(1);
    expect(s.state.players[1]!.trash.some((card) => card.instanceId === attackerOneId)).toBe(true);

    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attackerTwo").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.security.length === 0);
  });

  it("grants inherited Collision to a Machine host", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT17-058", under: ["BT17-056"], as: "machineHost" }] },
    });
    await s.ready();

    expect(observe(s.engine).hasKeyword(s.perm("machineHost"), "Collision")).toBe(true);
  });
});
