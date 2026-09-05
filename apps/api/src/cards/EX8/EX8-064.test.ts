import { describe, expect, it } from "vitest";
import { dnaDigivolutionRequirementsFor, EffectTiming } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { settle, setupEngine } from "../../engine/testkit/harness.js";
import "./index.js";
import { compiled } from "./EX8-064.js";

describe("EX8-064", () => {
  it("exposes the printed Piedmon plus Myotismon DNA route for cost 0", () => {
    expect(dnaDigivolutionRequirementsFor("EX8-064")).toEqual([
      { cost: 0, materials: [{ names: ["Piedmon"] }, { names: ["Myotismon"] }] },
    ]);
  });
  it("de-digivolves an opposing Digimon by 3 and gives all opposing Digimon -6000 DP when digivolving", () => {
    const actions = compiled.effects?.find((entry) => entry.trigger === "WhenDigivolving")?.actions ?? [];
    expect(actions[0]).toMatchObject({ kind: "DeDigivolve", amount: 3 });
    expect(actions[1]).toMatchObject({
      kind: "ModifyDP",
      amount: -6000,
      duration: "forTheTurn",
      target: { count: "all" },
    });
  });
  it("plays NSo cards from trash up to total play cost 10 during DNA digivolving and inherits security trash after another Digimon is deleted", () => {
    expect(compiled.effects?.find((entry) => entry.trigger === "WhenDigivolving")?.actions[2]).toMatchObject({
      kind: "PlayWithoutCost",
      from: ["trash"],
      target: { totalPlayCost: 10 },
      condition: { kind: "isDnaDigivolving" },
    });
    expect(compiled.effects?.find((entry) => entry.trigger === "AllTurns")).toMatchObject({
      frequency: "OncePerTurn",
      actions: [
        {
          kind: "SubTrigger",
          event: "onDeletionOf",
          sourceFilter: { controllerDefault: "both", excludeSelf: true },
          actions: [{ kind: "Trash" }],
        },
      ],
    });
  });
  it("applies the printed -6000 DP turn modifier to every opposing Digimon", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "EX8-064", as: "source" }] },
        1: {
          battleArea: [
            { card: "BT1-010", as: "first", dp: 10000 },
            { card: "BT1-011", as: "second", dp: 8000 },
          ],
        },
      },
      { autoSelectCards: true },
    );
    await advance(s.engine).fire(EffectTiming.WhenDigivolving, s.perm("source"));
    await settle(() => s.perm("first").currentDP === 4000 && s.perm("second").currentDP === 2000);
    expect(s.perm("first").currentDP).toBe(4000);
    expect(s.perm("second").currentDP).toBe(2000);
    s.state.memory = 0;
    s.state.turnSeat = 1;
    await advance(s.engine).runTurn(1);
    expect(s.perm("first").currentDP).toBe(10000);
    expect(s.perm("second").currentDP).toBe(8000);
  });
  it("de-digivolves the selected opposing stack by exactly 3 before applying the global DP reduction", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "EX8-064", as: "source" }] },
        1: {
          battleArea: [{ card: "EX8-064", as: "target", under: ["BT10-009", "EX8-060", "EX8-062"] }],
        },
      },
      { autoSelectCards: true },
    );
    await advance(s.engine).fire(EffectTiming.WhenDigivolving, s.perm("source"));
    await settle(() => s.state.players[1]!.battleArea[0]?.topCard.cardId === "BT10-009");

    expect(s.state.players[1]!.battleArea[0]!.topCard.cardId).toBe("BT10-009");
    expect(s.state.players[1]!.battleArea[0]!.stack).toHaveLength(0);
    expect(s.state.players[1]!.battleArea[0]!.currentDP).toBe(s.state.players[1]!.battleArea[0]!.baseDP - 6000);
  });

  it("DNA digivolves only from Piedmon plus Myotismon for 0", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "EX8-062", as: "piedmon" },
          { card: "EX8-060", as: "myotismon" },
        ],
        hand: [{ card: "EX8-064", as: "bolt" }],
      },
    });
    expect(
      s.engine.applyIntent(0, {
        type: "dnaDigivolve",
        materialPermanentIds: [s.perm("piedmon").permanentId, s.perm("myotismon").permanentId],
        instanceId: s.inst("bolt").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.cardId === "EX8-064"));
    expect(s.state.memory).toBe(0);

    const invalid = setupEngine({
      0: {
        battleArea: [
          { card: "EX8-062", as: "piedmon" },
          { card: "EX8-061", as: "notMyotismon" },
        ],
        hand: [{ card: "EX8-064", as: "bolt" }],
      },
    });
    expect(
      invalid.engine.applyIntent(0, {
        type: "dnaDigivolve",
        materialPermanentIds: [invalid.perm("piedmon").permanentId, invalid.perm("notMyotismon").permanentId],
        instanceId: invalid.inst("bolt").instanceId,
      }),
    ).toEqual(expect.objectContaining({ ok: false }));
  });

  it("plays an exact total cost 10 after DNA and lets the newly played Piedmon observe delayed 0-DP deletion (Q3951)", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "EX8-062", as: "piedmonMaterial" },
            { card: "EX8-060", as: "myotismonMaterial" },
          ],
          hand: [{ card: "EX8-064", as: "bolt" }],
          trash: ["EX8-062", "EX8-057", "EX8-059"],
        },
        1: {
          battleArea: [{ card: "BT1-010", as: "zeroDp", dp: 6000 }],
          security: ["BT1-011"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    expect(
      s.engine.applyIntent(0, {
        type: "dnaDigivolve",
        materialPermanentIds: [s.perm("piedmonMaterial").permanentId, s.perm("myotismonMaterial").permanentId],
        instanceId: s.inst("bolt").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        !s.state.players[1]!.battleArea.some((permanent) => permanent.topCard.cardId === "BT1-010") &&
        s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.cardId === "EX8-059"),
    );

    expect(s.state.players[0]!.battleArea.map((permanent) => permanent.topCard.cardId)).toEqual(
      expect.arrayContaining(["EX8-064", "EX8-062", "EX8-057", "EX8-059"]),
    );
    expect(s.state.players[1]!.security).toHaveLength(0);
  });
  it("trashes the opponent's top security card after another Digimon is deleted", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "EX8-064", as: "source" }] },
        1: { battleArea: [{ card: "BT1-009", as: "victim" }], security: ["BT1-001"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const securityInstanceId = s.state.players[1]!.security[0]!.instanceId;
    await s.ready();

    await advance(s.engine).verb.deletePermanent([s.perm("victim").permanentId], "byEffect");
    await settle(() => s.state.players[1]!.security.length === 0);

    expect(s.state.players[1]!.security).toHaveLength(0);
    expect(s.state.players[1]!.trash.some((card) => card.instanceId === securityInstanceId)).toBe(true);
  });
});
