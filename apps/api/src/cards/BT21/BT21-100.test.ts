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

  it("rejects the Main play when no Takato is present to waive the purple color requirement", async () => {
    const s = setup(
      {
        0: {
          battleArea: [{ card: "BT1-009", as: "redDigimon" }],
          hand: [
            { card: "BT21-100", as: "option" },
            { card: "BT1-010", as: "filler" },
          ],
          deck: ["BT1-009", "BT1-009"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 2;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toMatchObject({
      ok: false,
    });
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("option").instanceId)).toBe(true);
    expect(s.state.players[0]!.battleArea.some((p) => p.topCard.instanceId === s.inst("option").instanceId)).toBe(
      false,
    );
    expect(s.state.memory).toBe(2);
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

  it.each([false, true])("public effect deletion resolves Delay only after aging: %s", async (aged) => {
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
        1: { battleArea: [{ card: "BT1-014", as: "victim" }], deck: ["BT1-009", "BT1-009", "BT1-009"] },
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
    let ownTurn: Promise<void> | undefined;
    if (aged) {
      await advance(s.engine).runTurn(0);
      s.state.turnSeat = 1;
      s.state.memory = 0;
      await advance(s.engine).runTurn(1);
      s.state.turnSeat = 0;
      s.state.memory = 10;
      ownTurn = s.engine.runOneTurn();
      await advance(s.engine).waitForMainPhase(0);
    }
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("cyclonemon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[1]!.battleArea.length === 0);

    if (aged) await settle(() => s.perm("growlmon").topCard.instanceId === s.inst("megidramon").instanceId);
    expect(s.perm("growlmon").topCard.cardId).toBe(aged ? "BT21-079" : "BT21-076");
    expect(s.state.players[0]!.trash.some((card) => card.instanceId === optionId)).toBe(aged);
    expect(s.state.players[0]!.battleArea.some((p) => p.topCard.instanceId === optionId)).toBe(!aged);
    if (ownTurn) {
      advance(s.engine).endMainPhaseIfOpen(0);
      await ownTurn;
    }
  });

  it.each([
    ["wrong host family", "BT1-023", "BT21-079"],
    ["wrong destination family", "BT21-076", "BT1-025"],
  ] as const)(
    "does not free-evolve for an aged deletion when the %s is invalid",
    async (_case, hostCard, destinationCard) => {
      const preferred: string[] = [];
      const s = setup(
        {
          0: {
            battleArea: [
              { card: "BT21-089", as: "takato" },
              { card: hostCard, as: "host" },
            ],
            hand: [
              { card: "BT21-100", as: "option" },
              { card: "BT21-015", as: "cyclonemon" },
              { card: "BT1-009", as: "filler" },
            ],
            deck: ["BT1-010", "BT1-009", "BT1-009", "BT1-009", "BT1-009"],
            trash: [{ card: destinationCard, as: "destination" }],
          },
          1: { battleArea: [{ card: "BT1-014", as: "victim" }], deck: ["BT1-009", "BT1-010", "BT1-011"] },
        },
        { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferred },
      );
      preferred.push(s.inst("filler").instanceId);
      s.state.memory = 10;
      const optionId = s.inst("option").instanceId;
      const destinationId = s.inst("destination").instanceId;

      expect(s.engine.applyIntent(0, { type: "playCard", instanceId: optionId })).toEqual({ ok: true });
      await settle(() => s.state.players[0]!.battleArea.some((p) => p.topCard.instanceId === optionId));
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
      expect(s.state.players[1]!.trash.some((card) => card.instanceId === s.inst("victim").instanceId)).toBe(true);
      await settle(() => s.state.pendingDecision === undefined);

      expect(s.perm("host").topCard.cardId).toBe(hostCard);
      expect(s.state.players[0]!.battleArea.some((p) => p.topCard.instanceId === optionId)).toBe(true);
      expect(s.state.players[0]!.trash.some((card) => card.instanceId === optionId)).toBe(false);
      expect(s.state.players[0]!.trash.some((card) => card.instanceId === destinationId)).toBe(true);
      advance(s.engine).endMainPhaseIfOpen(0);
      await ownTurn;
    },
  );

  it("does not arm the owner's aged Delay from an opponent's public effect deletion", async () => {
    const s = setup(
      {
        0: {
          battleArea: [
            { card: "BT21-089", as: "takato" },
            { card: "BT21-076", as: "host" },
            { card: "BT1-014", as: "victim" },
          ],
          hand: [{ card: "BT21-100", as: "option" }],
          deck: ["BT1-010", "BT1-009", "BT1-009", "BT1-009", "BT1-009"],
          trash: [{ card: "BT21-079", as: "destination" }],
        },
        1: {
          hand: [{ card: "BT21-015", as: "cyclonemon" }],
          deck: ["BT1-011", "BT1-012", "BT1-013"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    const optionId = s.inst("option").instanceId;
    const victimId = s.perm("victim").permanentId;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: optionId })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some((p) => p.topCard.instanceId === optionId));
    await advance(s.engine).runTurn(0);
    s.state.turnSeat = 1;
    s.state.memory = 0;
    await advance(s.engine).runTurn(1);
    s.state.turnSeat = 1;
    s.state.memory = 10;
    const opponentTurn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(1);

    expect(s.engine.applyIntent(1, { type: "playCard", instanceId: s.inst("cyclonemon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => !s.state.players[0]!.battleArea.some((p) => p.permanentId === victimId));
    expect(s.state.players[0]!.trash.some((card) => card.instanceId === s.inst("victim").instanceId)).toBe(true);
    await settle(() => s.state.pendingDecision === undefined);

    expect(s.state.players[0]!.battleArea.some((p) => p.topCard.instanceId === optionId)).toBe(true);
    expect(s.perm("host").topCard.cardId).toBe("BT21-076");
    expect(s.state.players[0]!.trash.some((card) => card.instanceId === s.inst("destination").instanceId)).toBe(true);
    advance(s.engine).endMainPhaseIfOpen(1);
    await opponentTurn;
  });

  it("publicly declines an eligible aged Delay evolution without paying or changing the host", async () => {
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
          deck: ["BT1-010", "BT1-009", "BT1-009", "BT1-009", "BT1-009", "BT1-009"],
          trash: [{ card: "BT21-079", as: "megidramon" }],
        },
        1: { battleArea: [{ card: "BT1-014", as: "victim" }], deck: ["BT1-009", "BT1-010", "BT1-011"] },
      },
      { autoDeclineOptional: true, autoSelectCards: true, preferInstanceIds: preferred },
    );
    preferred.push(s.inst("filler").instanceId);
    s.state.memory = 10;
    await s.ready();
    const optionId = s.inst("option").instanceId;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: optionId })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some((p) => p.topCard.instanceId === optionId));

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
    advance(s.engine).endMainPhaseIfOpen(0);
    await ownTurn;

    expect(s.perm("growlmon").topCard.instanceId).toBe(s.inst("growlmon").instanceId);
    expect(s.state.players[0]!.trash.some((card) => card.instanceId === s.inst("megidramon").instanceId)).toBe(true);
    expect(s.state.players[0]!.battleArea.some((p) => p.topCard.instanceId === optionId)).toBe(true);
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("megidramon").instanceId)).toBe(false);
  });
});
