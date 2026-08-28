import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./BT18-084.js";

describe("BT18-084 AncientSphinxmon", () => {
  it("deletes only an opponent's unsuspended Digimon and preserves the leave-play replacement", () => {
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
    expect(compiled.effects[0]).toMatchObject({
      trigger: "OnPlay",
      actions: [
        { kind: "Delete", target: { filter: { controller: "opponent", unsuspended: true, kind: ["Digimon"] } } },
      ],
    });
    expect(compiled.digiXrosRequirement).toEqual([
      { materials: [{ names: ["Loweemon", "Duskmon"] }, { names: ["KaiserLeomon", "Velgrmon"] }], count: 2 },
    ]);
    expect(compiled.effects[2]).toMatchObject({
      trigger: "AllTurns",
      actions: [
        {
          kind: "Replacement",
          event: "wouldLeavePlay",
          actions: [
            {
              kind: "PlayWithoutCost",
              from: ["digivolutionCards"],
              payCost: false,
              optional: true,
              target: {
                filter: {
                  levelComparison: { op: "lte", value: 4 },
                  nameOrTrait: [{ tokens: ["Dark Animal", "Mythical Beast", "Hybrid"], match: "trait" }],
                  zone: "digivolutionCards",
                  hostFilter: { sourceRef: "triggerSubject" },
                },
              },
            },
          ],
        },
      ],
    });
  });

  it("executes the On Play unsuspended-target boundary through the GameEngine", async () => {
    const s = setupEngine(
      {
        0: { hand: [{ card: "BT18-084", as: "ancient" }] },
        1: {
          battleArea: [
            { card: "BT1-009", as: "live" },
            { card: "BT1-009", as: "suspended", suspended: true },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 12;
    const liveId = s.perm("live").permanentId;
    const suspendedId = s.perm("suspended").permanentId;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("ancient").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => !s.state.players[1]!.battleArea.some((perm) => perm.permanentId === liveId));
    expect(s.state.players[1]!.battleArea.some((perm) => perm.permanentId === suspendedId)).toBe(true);
  });

  it("naturally DigiXroses with the Duskmon and Velgrmon alternatives", async () => {
    const s = setupEngine({
      0: {
        hand: [
          { card: "BT18-084", as: "ancient" },
          { card: "BT18-078", as: "duskmon" },
          { card: "BT18-079", as: "velgrmon" },
        ],
      },
    });
    s.state.memory = 8;

    expect(s.engine.applyIntent(0, {
      type: "playCard",
      instanceId: s.inst("ancient").instanceId,
      digiXros: { materialInstanceIds: [s.inst("duskmon").instanceId, s.inst("velgrmon").instanceId] },
    })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some((perm) => perm.topCard?.cardId === "BT18-084"));

    expect(s.perm("ancient").stack.map((card) => card.cardId).sort()).toEqual(["BT18-078", "BT18-079"]);
    expect(s.state.memory).toBe(0);
  });

  it("rejects two materials from the same DigiXros slot", () => {
    const s = setupEngine({
      0: {
        hand: [
          { card: "BT18-084", as: "ancient" },
          { card: "BT18-078", as: "duskmonA" },
          { card: "BT18-078", as: "duskmonB" },
        ],
      },
    });
    s.state.memory = 20;

    expect(s.engine.applyIntent(0, {
      type: "playCard",
      instanceId: s.inst("ancient").instanceId,
      digiXros: { materialInstanceIds: [s.inst("duskmonA").instanceId, s.inst("duskmonB").instanceId] },
    })).toEqual({ ok: false, reason: "invalid-material" });
  });

  it("naturally plays a qualifying source from its own stack when deleted", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT18-084", as: "ancient", under: [{ card: "BT18-078", as: "duskmon" }] }],
        },
        1: { hand: [{ card: "BT18-019", as: "millenniummon" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.turnSeat = 1;
    s.state.memory = 14;
    await s.ready();
    expect(s.engine.applyIntent(1, { type: "playCard", instanceId: s.inst("millenniummon").instanceId })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some((perm) => perm.topCard?.instanceId === s.inst("duskmon").instanceId));

    expect(s.state.players[0]!.battleArea.some((perm) => perm.topCard?.instanceId === s.inst("duskmon").instanceId)).toBe(true);
    expect(s.state.players[0]!.trash.some((card) => card.cardId === "BT18-084")).toBe(true);
  });
});
