import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./BT17-058.js";
import "./index.js";

describe("BT17-058 GroundLocomon", () => {
  it("reveals three and places one black level-5-or-lower Digimon underneath on both entry timings", () => {
    const effects = compiled.effects.filter((entry) => ["OnPlay", "WhenDigivolving"].includes(entry.trigger));
    expect(effects).toHaveLength(2);
    for (const effect of effects) {
      expect(effect.actions[0]).toMatchObject({
        kind: "RevealAdd",
        revealCount: 3,
        add: [
          {
            filter: {
              controllerDefault: "mine",
              kind: ["Digimon"],
              colors: ["Black"],
              levelComparison: { op: "lte", value: 5 },
            },
            count: 1,
            to: "placeUnder",
            underFilter: { isSelfRef: true },
          },
        ],
        rest: "trash",
      });
    }
  });

  it("once per turn plays a level-5-or-lower Machine from its digivolution cards", () => {
    const effect = compiled.effects.find((entry) => entry.trigger === "EndOfAttack");
    expect(effect).toMatchObject({
      frequency: "OncePerTurn",
      actions: [
        {
          kind: "PlayWithoutCost",
          from: ["digivolutionCards"],
          payCost: false,
          optional: true,
          target: {
            filter: {
              controller: "mine",
              kind: ["Digimon"],
              levelComparison: { op: "lte", value: 5 },
              nameOrTrait: [{ tokens: ["Machine"], match: "trait" }],
              zone: "digivolutionCards",
              hostFilter: { isSelfRef: true },
            },
          },
        },
      ],
    });
  });

  it("places the revealed card only under GroundLocomon and trashes the rest", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "BT17-058", as: "groundLocomon" }],
          battleArea: [{ card: "BT17-056", as: "otherHost" }],
          deck: [
            { card: "BT17-054", as: "eligible" },
            { card: "BT1-087", as: "remainderOne" },
            { card: "BT1-102", as: "remainderTwo" },
          ],
        },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 12;
    const eligibleId = s.inst("eligible").instanceId;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("groundLocomon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.trash.length === 2);

    const groundLocomon = s.state.players[0]!.battleArea.find((permanent) => permanent.topCard?.cardId === "BT17-058")!;
    expect(groundLocomon.stack.at(0)?.instanceId).toBe(eligibleId);
    expect(s.perm("otherHost").stack).toHaveLength(0);
  });

  it("plays the Machine only from its own evolution stack after attacking", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT17-058", under: [{ card: "BT17-056", as: "ownMachine" }], as: "groundLocomon" },
            { card: "BT17-057", under: [{ card: "BT17-056", as: "otherMachine" }], as: "otherHost" },
          ],
        },
        1: { security: 1 },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const ownMachineId = s.inst("ownMachine").instanceId;
    const otherMachineId = s.inst("otherMachine").instanceId;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("groundLocomon").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() =>
      s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.instanceId === ownMachineId),
    );

    expect(s.perm("groundLocomon").topCard?.cardId).toBe("BT17-058");
    expect(s.perm("groundLocomon").stack.some((card) => card.instanceId === ownMachineId)).toBe(false);
    expect(s.perm("otherHost").stack.some((card) => card.instanceId === otherMachineId)).toBe(true);
  });
});
