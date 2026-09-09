import { getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./EX5-056.js";

describe("EX5-056 Syakomon", () => {
  it("draws based on opposing Digimon and trashes one card from hand on play", () => {
    expect(getCardDefinition("EX5-056")).toMatchObject({
      cardId: "EX5-056",
      nameEn: "Syakomon",
      colors: ["Purple"],
      kinds: ["Digimon"],
      level: 3,
      playCost: 3,
      dp: 1000,
      forms: ["Rookie"],
      attributes: ["Virus"],
      types: ["Crustacean"],
      evoCosts: [{ color: "Purple", level: 2, memoryCost: 0 }],
      effectText:
        "[On Play] For each of your opponent's Digimon, ＜Draw 1＞ (Draw 1 card from your deck). Then, trash 1 card in your hand.",
      inheritedEffectText: "[All Turns] [Once Per Turn] When an effect plays an opponent's Digimon, gain 1 memory.",
    });
    expect(compiled).toMatchObject({ coverage: "full", residual: [] });
    expect(compiled.effects?.find((entry) => entry.trigger === "OnPlay")?.actions).toMatchObject([
      {
        kind: "Draw",
        amount: 1,
        scaling: { per: 1, unit: "cards", filter: { controller: "opponent", kind: ["Digimon"] } },
      },
      { kind: "Trash", target: { count: 1, filter: { zone: "hand", controller: "mine" } } },
    ]);
  });
  it("inherits once-per-turn memory when an opponent plays a Digimon", () => {
    expect(compiled.effects?.find((entry) => entry.isInherited)).toMatchObject({
      trigger: "AllTurns",
      isInherited: true,
      frequency: "OncePerTurn",
      actions: [
        {
          kind: "SubTrigger",
          event: "whenPlayed",
          sourceFilter: { controller: "opponent", kind: ["Digimon"], byEffect: true },
          actions: [{ kind: "GainMemory", amount: 1 }],
        },
      ],
    });
  });

  it("draws once per opposing Digimon and then trashes one card from hand on public play", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [
            { card: "EX5-056", as: "source" },
            { card: "BT1-001", as: "discard" },
          ],
          deck: ["BT1-009", "BT1-010"],
        },
        1: {
          battleArea: [
            { card: "BT1-009", as: "opponentOne" },
            { card: "BT1-010", as: "opponentTwo" },
          ],
        },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 3;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("source").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.trash.some((card) => card.instanceId === s.inst("discard").instanceId));
    expect(s.state.players[0]!.trash.some((card) => card.instanceId === s.inst("discard").instanceId)).toBe(true);
    expect(s.state.players[0]!.hand.map((card) => card.cardId)).toEqual(["BT1-009", "BT1-010"]);
    expect(s.state.players[0]!.deck).toHaveLength(0);
  });

  it("gains memory once across repeated public effect-plays of opponent Digimon (Q3649)", async () => {
    const dragomon = getCardDefinition("EX5-060");
    expect(dragomon?.playCost).toBe(7);
    const effectPlay = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT4-080", as: "host", under: ["EX5-056"] }],
          hand: [
            { card: "EX5-060", as: "firstEffect" },
            { card: "EX5-060", as: "secondEffect" },
          ],
        },
        1: {
          trash: [
            { card: "BT1-009", as: "firstOpponent" },
            { card: "BT1-010", as: "secondOpponent" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await effectPlay.ready();
    effectPlay.state.memory = 10;
    expect(
      effectPlay.engine.applyIntent(0, { type: "playCard", instanceId: effectPlay.inst("firstEffect").instanceId }),
    ).toEqual({ ok: true });
    await settle(() => effectPlay.state.players[1]!.battleArea.some((perm) => perm.topCard?.cardId === "BT1-009"));
    // The real memory ceiling is 10. The seven-cost play therefore leaves 3,
    // and Syakomon's inherited watcher adds exactly one memory.
    expect(effectPlay.state.memory).toBe(4);
    expect(
      effectPlay.engine.applyIntent(0, { type: "playCard", instanceId: effectPlay.inst("secondEffect").instanceId }),
    ).toEqual({ ok: true });
    await settle(() => effectPlay.state.players[1]!.battleArea.some((perm) => perm.topCard?.cardId === "BT1-010"));
    // The second EX5-060 still costs 7, but the inherited Once Per Turn use is spent.
    expect(effectPlay.state.memory).toBe(-3);
    expect(effectPlay.state.players[1]!.trash).toHaveLength(0);
    expect(effectPlay.state.pendingDecision).toBeUndefined();
  });

  it("proves the inherited +1 memory against an identical no-watcher control", async () => {
    const withWatcher = setupEngine(
      {
        0: { battleArea: [{ card: "BT4-080", under: ["EX5-056"] }], hand: [{ card: "EX5-060", as: "source" }] },
        1: { trash: [{ card: "BT1-009", as: "target" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const control = setupEngine(
      {
        0: { hand: [{ card: "EX5-060", as: "source" }] },
        1: { trash: [{ card: "BT1-009", as: "target" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await withWatcher.ready();
    await control.ready();
    withWatcher.state.memory = 10;
    control.state.memory = 10;
    expect(
      withWatcher.engine.applyIntent(0, { type: "playCard", instanceId: withWatcher.inst("source").instanceId }),
    ).toEqual({ ok: true });
    expect(control.engine.applyIntent(0, { type: "playCard", instanceId: control.inst("source").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => withWatcher.state.players[1]!.battleArea.length > 0);
    await settle(() => control.state.players[1]!.battleArea.length > 0);
    expect(withWatcher.state.memory).toBe(control.state.memory + 1);
    expect(control.state.memory).toBe(3);
  });

  it("does not gain memory when the opponent manually plays a Digimon", async () => {
    const manualPlay = setupEngine({
      0: { battleArea: [{ card: "BT4-080", as: "host", under: ["EX5-056"] }] },
      1: {
        hand: [{ card: "BT1-009", as: "manual" }],
      },
    });
    manualPlay.state.turnSeat = 1;
    manualPlay.state.memory = 10;
    await manualPlay.ready();
    expect(
      manualPlay.engine.applyIntent(1, { type: "playCard", instanceId: manualPlay.inst("manual").instanceId }),
    ).toEqual({ ok: true });
    await settle();
    expect(manualPlay.state.memory).toBe(8);
  });
});
