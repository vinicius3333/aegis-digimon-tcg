import { describe, expect, it } from "vitest";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT7-079.js";

describe("BT7-079 Cherubimon", () => {
  it("keeps only the trash Tamer play optional; the following Then deletion is mandatory", () => {
    const whenDigivolving = runtimeCompiledCard("BT7-079")?.effects.find(
      (effect) => effect.trigger === "WhenDigivolving",
    );

    expect(whenDigivolving?.actions[0]).toMatchObject({
      kind: "PlayWithoutCost",
      optional: true,
    });
    expect(whenDigivolving?.actions[1]).toMatchObject({
      kind: "Delete",
      target: {
        filter: {
          controller: "opponent",
          kind: ["Digimon"],
          levelComparison: { op: "lte", value: 4 },
        },
      },
      scaling: {
        per: 1,
        unit: "cards",
        filter: { controller: "mine", kind: ["Tamer"], zone: "battleArea" },
      },
    });
    expect(whenDigivolving?.actions[1]).not.toHaveProperty("optional", true);
  });

  it("plays a purple Tamer from trash and deletes one level-4-or-lower Digimon per Tamer", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT10-012", as: "base" },
            { card: "BT7-091", as: "existingTamer" },
          ],
          hand: [{ card: "BT7-079", as: "evolving" }],
          trash: [{ card: "BT7-091", as: "playedTamer" }],
        },
        1: {
          battleArea: [
            { card: "BT1-014", as: "first" },
            { card: "BT1-014", as: "second" },
            { card: "BT1-014", as: "third" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 4;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("evolving").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.battleArea.length === 1);
    expect(
      s.state.players[0]!.battleArea.some(
        (permanent) => permanent.topCard?.instanceId === s.inst("playedTamer").instanceId,
      ),
    ).toBe(true);
    expect(
      s.state.players[0]!.battleArea.some(
        (permanent) => permanent.topCard?.instanceId === s.perm("existingTamer").topCard.instanceId,
      ),
    ).toBe(true);
  });
});

describe("BT7-079 Cherubimon — KB Q&A rulings", () => {
  it("still deletes for each Tamer after Then even when no purple Tamer is played from the trash (Q1643)", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT10-012", as: "base" },
            { card: "BT3-096", as: "existingTamer" },
          ],
          hand: [{ card: "BT7-079", as: "cherubimon" }],
          trash: [{ card: "BT7-091", as: "trashTamer" }],
        },
        1: {
          battleArea: [
            { card: "BT1-014", as: "firstLevelFour" },
            { card: "BT1-014", as: "secondLevelFour" },
            { card: "BT1-020", as: "levelFive" },
          ],
        },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    s.state.memory = 4;
    const levelFivePermanentId = s.perm("levelFive").permanentId;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("cherubimon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.battleArea.length === 2 && s.state.pendingDecision === undefined);

    expect(s.state.players[0]!.trash.some((card) => card.instanceId === s.inst("trashTamer").instanceId)).toBe(true);
    expect(s.state.players[0]!.battleArea).toHaveLength(2);
    expect(s.state.players[1]!.battleArea).toHaveLength(2);
    expect(s.state.players[1]!.battleArea.some((permanent) => permanent.permanentId === levelFivePermanentId)).toBe(
      true,
    );
    expect(s.state.players[1]!.trash.filter((card) => card.cardId === "BT1-014")).toHaveLength(1);
  });
});
