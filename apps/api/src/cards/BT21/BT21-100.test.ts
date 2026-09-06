import { describe, expect, it } from "vitest";
import { setupEngine as setup, settle } from "../../engine/testkit/harness.js";
import { advance } from "../../engine/testkit/advance.js";
import { compiled } from "./BT21-100.js";

describe("BT21-100 The Digimon I Designed", () => {
  it("executes Main draw, hand trash, and battle-area placement when Takato waives the color requirement", async () => {
    const preferred: string[] = [];
    const s = setup(
      {
        0: {
          battleArea: [{ card: "BT21-089", as: "takato" }],
          hand: [
            { card: "BT21-100", as: "option" },
            { card: "BT1-009", as: "filler" },
          ],
          deck: [{ card: "BT1-010", as: "drawn" }, "BT1-009", "BT1-009", "BT1-009"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferred },
    );
    preferred.push(s.inst("filler").instanceId);
    s.state.memory = 10;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.battleArea.length === 2);

    expect(s.state.players[0]!.battleArea.length).toBe(2);
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("drawn").instanceId)).toBe(true);
    expect(s.state.players[0]!.trash.some((card) => card.instanceId === s.inst("filler").instanceId)).toBe(true);
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("option").instanceId)).toBe(false);
    expect(s.events.some((event) => event.kind === "actionRejected")).toBe(false);
  });

  it("models the Takato waiver, Main draw/trash/place, and separate effect-delete Delay payload", () => {
    const staticEffect = compiled.effects.find((entry) => entry.trigger === "Static");
    expect(staticEffect?.actions[0]).toMatchObject({
      kind: "WaiveColorRequirement",
      condition: {
        kind: "youHave",
        filter: { nameOrTrait: [{ tokens: ["Takato Matsuki"], match: "nameExact" }] },
      },
    });

    const main = compiled.effects.find((entry) => entry.trigger === "Main");
    expect(main?.actions).toEqual([
      { kind: "Draw", controller: "mine", amount: 1 },
      expect.objectContaining({ kind: "Trash", target: { filter: { controller: "mine", zone: "hand" }, count: 1 } }),
      { kind: "PlaceInBattleAreaSelf" },
    ]);

    const turns = compiled.effects.filter((entry) => entry.trigger === "YourTurn");
    expect(turns).toHaveLength(1);
    expect(turns[0]?.actions[0]).toMatchObject({
      kind: "SubTrigger",
      event: "onDeletionOf",
      sourceFilter: { kind: ["Digimon"], deleteCause: "byEffect" },
    });
    expect(turns[0]?.keywords).toEqual([{ keyword: "Delay", raw: "＜Delay＞" }]);
    const watcher = turns[0]?.actions[0];
    if (watcher?.kind !== "SubTrigger") throw new Error("expected reactive Delay watcher");
    expect(watcher.actions[0]).toMatchObject({ kind: "Digivolve", payCost: false, from: ["trash"], optional: true });
    expect(compiled.effects.find((entry) => entry.trigger === "Security")).toMatchObject({
      isSecurity: true,
      actions: [{ kind: "GainMemory", amount: 1 }, { kind: "PlaceInBattleAreaSelf" }],
    });
  });

  it("gains 1 memory and enters the battle area from a real security check", async () => {
    const s = setup({
      0: { battleArea: [{ card: "BT21-032", as: "attacker", dp: 2000 }] },
      1: { security: [{ card: "BT21-100", as: "option" }] },
    });
    s.state.memory = 2;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() =>
      s.state.players[1]!.battleArea.some((permanent) => permanent.topCard.instanceId === s.inst("option").instanceId),
    );

    expect(
      s.state.players[1]!.battleArea.some((permanent) => permanent.topCard.instanceId === s.inst("option").instanceId),
    ).toBe(true);
    expect(s.state.memory).toBe(1);
    expect(s.state.players[1]!.security).toHaveLength(0);
  });

  it("arms and activates Delay after a public effect deletes a Digimon", async () => {
    const preferred: string[] = [];
    const s = setup(
      {
        0: {
          battleArea: [
            { card: "BT21-089", as: "takato" },
            { card: "BT21-076", as: "growlmon" },
          ],
          hand: [
            { card: "BT21-100", as: "option" },
            { card: "BT21-015", as: "cyclonemon" },
            { card: "BT1-009", as: "filler" },
          ],
          deck: [{ card: "BT1-010", as: "drawn" }, "BT1-009", "BT1-009", "BT1-009"],
          trash: [{ card: "BT21-079", as: "megidramon" }],
        },
        1: { battleArea: [{ card: "BT1-009", as: "victim", dp: 4000 }], deck: ["BT1-009", "BT1-009", "BT1-009"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferred },
    );
    preferred.push(s.inst("filler").instanceId);
    preferred.push(s.inst("megidramon").instanceId);
    s.state.memory = 10;
    await s.ready();
    const optionId = s.inst("option").instanceId;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: optionId })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some((p) => p.topCard.instanceId === optionId));
    // CR 16-17-3: Delay gained this turn cannot be activated until a later turn.
    await advance(s.engine).runTurn(0);
    s.state.turnSeat = 1;
    s.state.memory = 0;
    await advance(s.engine).runTurn(1);
    s.state.turnSeat = 0;
    s.state.memory = 10;
    const ownTurn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(0);
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("cyclonemon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[1]!.battleArea.length === 0);

    await settle(() => s.perm("growlmon").topCard.instanceId === s.inst("megidramon").instanceId);
    expect(s.perm("growlmon").topCard.instanceId).toBe(s.inst("megidramon").instanceId);
    expect(s.state.players[0]!.trash.some((card) => card.instanceId === optionId)).toBe(true);
    advance(s.engine).endMainPhaseIfOpen(0);
    await ownTurn;
  });
});
