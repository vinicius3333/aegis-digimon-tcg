import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./BT17-057.js";
import "./index.js";

// BT17-057 Chaosdramon (Black Lv6). Printed clauses:
//   [Digivolve] Lv.5 w/[SoC] trait: Cost 3   (reduced alternate route)
//   Static: while you have a black Tamer, trash is a legal DigiXros material source
//   [On Play] [When Digivolving] place 1 [Cyborg]/[SoC] trash card as bottom digivolution
//     card, then delete up to 7 play-cost worth of the opponent's Digimon
//   [All Turns] prevent an opponent-effect leave by trashing 2 [Cyborg]/[Machine]/[SoC]
//     digivolution cards
//   [DigiXros -2] [Machinedramon] x 1 Lv.5 Digimon card w/[Cyborg] trait
// Q&A covered: Q2810 (only 1 Machinedramon), Q2811 (trash materials with a black Tamer),
//   Q2812 ("would leave" scope).

describe("BT17-057 Chaosdramon", () => {
  it("deletes opposing Digimon up to a total play-cost budget of seven", () => {
    for (const trigger of ["OnPlay", "WhenDigivolving"]) {
      expect(compiled.effects.find((entry) => entry.trigger === trigger)?.actions[0]).toMatchObject({
        kind: "DeleteBudget",
        filter: { controller: "opponent", kind: ["Digimon"] },
        budget: 7,
        upTo: true,
      });
    }
  });

  it("only prevents leaving caused by an opponent's effect", () => {
    const replacement = compiled.effects.find((entry) => entry.trigger === "AllTurns")?.actions[0];
    expect(replacement).toMatchObject({
      kind: "Replacement",
      event: "wouldLeavePlay",
      leaveCause: "byOpponentEffect",
      actions: [
        {
          kind: "Prevent",
          cost: {
            kind: "trash",
            target: { filter: { zone: "digivolutionCards", hostFilter: { isSelfRef: true } }, count: 2 },
          },
          optional: true,
        },
      ],
    });
  });

  it("carries the two-slot DigiXros recipe and grants trash DigiXros with a black Tamer", () => {
    expect(compiled.digiXrosRequirement).toEqual([
      {
        materials: [{ names: ["Machinedramon"] }, { level: 5, traits: ["Cyborg"] }],
        count: 2,
      },
    ]);
    expect(compiled.effects[0]).toMatchObject({
      trigger: "Static",
      actions: [
        {
          kind: "GrantStatic",
          grant: "digixrosFromTrash",
          condition: { kind: "youHave", filter: { kind: ["Tamer"], colors: ["Black"] } },
        },
      ],
    });
  });

  it("digivolves by the standard black Lv.5 route for cost 4", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT17-055", as: "base" }],
          hand: [{ card: "BT17-057", as: "chaosdramon" }],
          deck: [{ card: "BT1-009", as: "bonus" }],
        },
      },
      { autoDeclineOptional: true },
    );
    s.state.memory = 10;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("chaosdramon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard.cardId === "BT17-057");

    expect(s.perm("base").stack.at(-1)?.cardId).toBe("BT17-055");
    expect(s.state.memory).toBe(6);
  });

  it("digivolves by the reduced [SoC]-trait alternate route for cost 3", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT15-064", as: "base" }],
          hand: [{ card: "BT17-057", as: "chaosdramon" }],
          deck: [{ card: "BT1-009", as: "bonus" }],
        },
      },
      { autoDeclineOptional: true },
    );
    s.state.memory = 10;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("chaosdramon").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard.cardId === "BT17-057");

    expect(s.perm("base").stack.at(-1)?.cardId).toBe("BT15-064");
    expect(s.state.memory).toBe(7);
  });

  it("falls back to the standard cost-4 route when the alternate is selected over a non-[SoC] source", async () => {
    // `useAlternateCost` is a selector, not an assertion: the [SoC] gate fails over BT17-055
    // (Black Lv.5, no [SoC]), so the play falls back to the standard black route. The memory
    // delta of 4 (not 3) proves the alternate route did not apply.
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT17-055", as: "base" }],
          hand: [{ card: "BT17-057", as: "chaosdramon" }],
          deck: [{ card: "BT1-009", as: "bonus" }],
        },
      },
      { autoDeclineOptional: true },
    );
    s.state.memory = 10;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("chaosdramon").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard.cardId === "BT17-057");

    expect(s.state.memory).toBe(6);
  });

  it("rejects an illegal source that matches neither the standard nor the [SoC] route", () => {
    // AD1-002 Aldamon is Red Lv.5 without the [SoC] trait: it fails the black standard route and
    // the [SoC] alternate route, so no digivolution is legal.
    const s = setupEngine({
      0: {
        battleArea: [{ card: "AD1-002", as: "base" }],
        hand: [{ card: "BT17-057", as: "chaosdramon" }],
        deck: [{ card: "BT1-009", as: "bonus" }],
      },
    });
    s.state.memory = 10;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("chaosdramon").instanceId,
      }),
    ).toEqual(expect.objectContaining({ ok: false }));
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("chaosdramon").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual(expect.objectContaining({ ok: false }));
  });

  it("places a qualifying trash card underneath before deleting within budget on play", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "BT17-057", as: "chaosdramon" }],
          trash: [{ card: "BT17-052", as: "placedSource" }],
        },
        1: {
          battleArea: [
            { card: "BT17-052", as: "costThree" },
            { card: "BT17-054", as: "costFive" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 12;
    const placedSourceId = s.inst("placedSource").instanceId;
    const costThreeId = s.perm("costThree").permanentId;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("chaosdramon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[1]!.battleArea.length === 1);

    const chaosdramon = s.state.players[0]!.battleArea.find((permanent) => permanent.topCard?.cardId === "BT17-057")!;
    expect(chaosdramon.stack.at(0)?.instanceId).toBe(placedSourceId);
    // Budget 7 covers only one of {cost 3, cost 5}: the cost-3 target is taken and the cost-5 survives.
    expect(s.state.players[1]!.battleArea.some((permanent) => permanent.permanentId === costThreeId)).toBe(false);
    expect(s.state.players[1]!.battleArea.map((permanent) => permanent.topCard?.cardId)).toEqual(["BT17-054"]);
  });

  it("cannot reach a single opposing Digimon whose play cost exceeds the budget", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "BT17-057", as: "chaosdramon" }],
          trash: [{ card: "BT17-052", as: "placedSource" }],
        },
        1: { battleArea: [{ card: "BT1-114", as: "costEight" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 12;
    const placedSourceId = s.inst("placedSource").instanceId;
    const costEightId = s.perm("costEight").permanentId;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("chaosdramon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.cardId === "BT17-057"));
    await s.ready();

    const chaosdramon = s.state.players[0]!.battleArea.find((permanent) => permanent.topCard?.cardId === "BT17-057")!;
    expect(chaosdramon.stack.at(0)?.instanceId).toBe(placedSourceId);
    expect(s.state.players[1]!.battleArea.some((permanent) => permanent.permanentId === costEightId)).toBe(true);
  });

  it("fires the same place-and-delete effect on digivolving", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT15-064", as: "base" }],
          hand: [{ card: "BT17-057", as: "chaosdramon" }],
          trash: [{ card: "BT17-052", as: "placedSource" }],
          deck: [{ card: "BT1-009", as: "bonus" }],
        },
        1: { battleArea: [{ card: "BT17-052", as: "costThree" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    const placedSourceId = s.inst("placedSource").instanceId;
    const costThreeId = s.perm("costThree").permanentId;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("chaosdramon").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: true });
    await settle(() => !s.state.players[1]!.battleArea.some((permanent) => permanent.permanentId === costThreeId));

    expect(s.perm("base").stack.at(0)?.instanceId).toBe(placedSourceId);
    expect(s.state.players[1]!.battleArea.some((permanent) => permanent.permanentId === costThreeId)).toBe(false);
  });

  it("DigiXroses by placing a Machinedramon and a Lv.5 Cyborg Digimon underneath", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [
            { card: "BT17-057", as: "chaosdramon" },
            { card: "BT2-066", as: "machinedramon" },
            { card: "BT2-060", as: "cyborg" },
          ],
        },
      },
      { autoDeclineOptional: true },
    );
    s.state.memory = 20;
    const machinedramonId = s.inst("machinedramon").instanceId;
    const cyborgId = s.inst("cyborg").instanceId;

    expect(
      s.engine.applyIntent(0, {
        type: "playCard",
        instanceId: s.inst("chaosdramon").instanceId,
        digiXros: { materialInstanceIds: [machinedramonId, cyborgId] },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.cardId === "BT17-057"));

    const played = s.state.players[0]!.battleArea.find((permanent) => permanent.topCard?.cardId === "BT17-057")!;
    expect(played.stack.map((card) => card.instanceId).sort()).toEqual([machinedramonId, cyborgId].sort());
    // Printed play cost 12, DigiXros -2.
    expect(s.state.memory).toBe(10);
  });

  it("rejects a DigiXros that places two Machinedramon and no Lv.5 Cyborg (Q2810)", () => {
    const s = setupEngine({
      0: {
        hand: [
          { card: "BT17-057", as: "chaosdramon" },
          { card: "BT2-066", as: "firstMachinedramon" },
          { card: "BT11-072", as: "secondMachinedramon" },
        ],
      },
    });
    s.state.memory = 20;

    expect(
      s.engine.applyIntent(0, {
        type: "playCard",
        instanceId: s.inst("chaosdramon").instanceId,
        digiXros: {
          materialInstanceIds: [s.inst("firstMachinedramon").instanceId, s.inst("secondMachinedramon").instanceId],
        },
      }),
    ).toEqual(expect.objectContaining({ ok: false }));
  });

  // Q2811. `validateDigiXros` (apps/api/src/engine/actions/digiXros.ts) now consults the per-seat
  // `expandDigiXrosZones` ledger that BT17-057's Static `digixrosFromTrash` grant populates while a
  // black Tamer is in play, with the same one-material-per-uncounted-grant quota the effect-driven
  // play path uses. See docs/audits/BT17.md#digixros-zone-ledger-mechanism.
  it("accepts a trash card as DigiXros material while a black Tamer is in play (Q2811)", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT10-092", as: "blackTamer" }],
          hand: [
            { card: "BT17-057", as: "chaosdramon" },
            { card: "BT2-060", as: "cyborg" },
          ],
          trash: [{ card: "BT2-066", as: "machinedramon" }],
        },
      },
      { autoDeclineOptional: true },
    );
    s.state.memory = 20;
    const machinedramonId = s.inst("machinedramon").instanceId;
    const cyborgId = s.inst("cyborg").instanceId;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "playCard",
        instanceId: s.inst("chaosdramon").instanceId,
        digiXros: { materialInstanceIds: [machinedramonId, cyborgId] },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.cardId === "BT17-057"));

    const played = s.state.players[0]!.battleArea.find((permanent) => permanent.topCard?.cardId === "BT17-057")!;
    expect(played.stack.map((card) => card.instanceId).sort()).toEqual([machinedramonId, cyborgId].sort());
    expect(s.state.players[0]!.trash.some((card) => card.instanceId === machinedramonId)).toBe(false);
  });

  it("refuses a trash DigiXros material without a black Tamer (Q2811 negative)", () => {
    const s = setupEngine({
      0: {
        hand: [
          { card: "BT17-057", as: "chaosdramon" },
          { card: "BT2-060", as: "cyborg" },
        ],
        trash: [{ card: "BT2-066", as: "machinedramon" }],
      },
    });
    s.state.memory = 20;

    expect(
      s.engine.applyIntent(0, {
        type: "playCard",
        instanceId: s.inst("chaosdramon").instanceId,
        digiXros: {
          materialInstanceIds: [s.inst("machinedramon").instanceId, s.inst("cyborg").instanceId],
        },
      }),
    ).toEqual(expect.objectContaining({ ok: false }));
  });

  it("trashes two qualifying sources from itself to prevent opponent-effect deletion", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT17-057", under: ["BT17-052", "BT17-054", "BT17-055"], as: "chaosdramon" }],
          hand: [{ card: "BT17-052", as: "unrelatedHandCard" }],
        },
        1: { hand: [{ card: "BT17-072", as: "opponentDeleter" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.turnSeat = 1;
    const chaosId = s.perm("chaosdramon").permanentId;
    const unrelatedId = s.inst("unrelatedHandCard").instanceId;

    s.state.memory = 13;
    expect(s.engine.applyIntent(1, { type: "playCard", instanceId: s.inst("opponentDeleter").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.perm("chaosdramon").stack.length === 1);

    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.permanentId === chaosId)).toBe(true);
    // Only BT17-055 (Unidentified) lacks a [Cyborg]/[Machine]/[SoC] trait, so it is the survivor.
    expect(s.perm("chaosdramon").stack.map((card) => card.cardId)).toEqual(["BT17-055"]);
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === unrelatedId)).toBe(true);
  });
});
