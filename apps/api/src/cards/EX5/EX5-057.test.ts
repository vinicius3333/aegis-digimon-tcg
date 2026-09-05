import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./EX5-057.js";

describe("EX5-057 Labramon", () => {
  it("returns a Dark Animal or Shaman from trash by trashing one card from hand", () => {
    expect(compiled.effects?.find((entry) => entry.trigger === "OnPlay")?.actions[0]).toMatchObject({
      kind: "Return",
      to: "hand",
      optional: true,
      abortOnDecline: true,
      target: {
        count: 1,
        filter: {
          zone: "trash",
          controller: "mine",
          kind: ["Digimon"],
          nameOrTrait: [{ match: "trait", tokens: ["Dark Animal", "Shaman"] }],
        },
      },
      cost: { kind: "trash", target: { count: 1, filter: { zone: "hand", controller: "mine" } } },
    });
  });
  it("inherits once-per-turn memory when you play a Digimon", () => {
    expect(compiled.effects?.find((entry) => entry.isInherited)).toMatchObject({
      trigger: "YourTurn",
      isInherited: true,
      frequency: "OncePerTurn",
      actions: [
        {
          kind: "SubTrigger",
          event: "whenPlayed",
          sourceFilter: { controller: "mine", kind: ["Digimon"], byEffect: true },
          actions: [{ kind: "GainMemory", amount: 1 }],
        },
      ],
    });
  });

  it("trashes the paid hand card and returns a matching trait Digimon from trash on public play", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [
            { card: "EX5-057", as: "source" },
            { card: "BT1-001", as: "cost" },
          ],
          trash: [{ card: "BT1-039", as: "target" }, "BT1-009"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 3;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("source").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("target").instanceId));
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("target").instanceId)).toBe(true);
    expect(s.state.players[0]!.trash.some((card) => card.instanceId === s.inst("cost").instanceId)).toBe(true);
    expect(s.state.players[0]!.trash.some((card) => card.cardId === "BT1-009")).toBe(true);
  });

  it("declines the optional return without trashing a hand card", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [
            { card: "EX5-057", as: "source" },
            { card: "BT1-001", as: "cost" },
          ],
          trash: ["BT1-039"],
        },
      },
      { autoAcceptOptional: false, autoSelectCards: true },
    );
    s.state.memory = 3;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("source").instanceId })).toEqual({
      ok: true,
    });
    await settle();
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("cost").instanceId)).toBe(true);
    expect(s.state.players[0]!.trash.some((card) => card.instanceId === s.inst("cost").instanceId)).toBe(false);
    expect(s.state.players[0]!.trash.some((card) => card.cardId === "BT1-039")).toBe(true);
  });

  it("gains memory once when an effect plays an own Digimon, but not for manual play", async () => {
    const effectPlay = setupEngine({
      0: {
        battleArea: [{ card: "BT1-009", as: "host", under: ["EX5-057"] }],
        hand: [
          { card: "BT1-009", as: "effectPlayed" },
          { card: "BT1-010", as: "second" },
        ],
      },
    });
    await effectPlay.ready();
    effectPlay.state.memory = 0;
    await advance(effectPlay.engine).verb.playInstances([effectPlay.inst("effectPlayed").instanceId], "EX5-057");
    await advance(effectPlay.engine).verb.playInstances([effectPlay.inst("second").instanceId], "EX5-057");
    await settle();
    expect(effectPlay.state.memory).toBe(1);

    const manualPlay = setupEngine({
      0: {
        battleArea: [{ card: "BT1-009", as: "host", under: ["EX5-057"] }],
        hand: [{ card: "BT1-009", as: "manual" }],
      },
    });
    manualPlay.state.memory = 10;
    await manualPlay.ready();
    expect(
      manualPlay.engine.applyIntent(0, { type: "playCard", instanceId: manualPlay.inst("manual").instanceId }),
    ).toEqual({ ok: true });
    await settle();
    expect(manualPlay.state.memory).toBe(8);
  });
});
