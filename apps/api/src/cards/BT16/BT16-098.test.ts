import { describe, expect, it } from "vitest";
import { setupEngine, settle, type PermanentSpec } from "../../engine/testkit/harness.js";
import { compiled } from "./BT16-098.js";
import "../index.js";

describe("BT16-098", () => {
  it("deletes an opposing cost 4 or lower Digimon or Tamer if Dorugoramon is present", () => {
    expect(compiled.effects?.[0]?.actions?.[0]).toMatchObject({
      kind: "Delete",
      condition: { kind: "youHave" },
      target: { filter: { kind: ["Digimon", "Tamer"], playCostLte: 4 } },
    });
  });

  it("then deletes all opposing Digimon with the lowest play cost", () => {
    expect(compiled.effects?.[0]?.actions?.[1]).toMatchObject({
      kind: "Delete",
      target: { filter: { kind: ["Digimon"], superlative: "lowestPlayCost" }, count: "all" },
    });
  });

  it("activates its Main effect from security", () => {
    expect(compiled.effects?.[1]).toMatchObject({
      trigger: "Security",
      isSecurity: true,
      actions: [{ kind: "ActivateMain" }],
    });
  });

  it("deletes the conditional low-cost target and all tied lowest-cost Digimon", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "BT16-098", as: "option" }],
          battleArea: [
            { card: "BT16-050", as: "color" },
            { card: "BT16-101", as: "dorugoramon" },
          ],
        },
        1: {
          battleArea: [
            { card: "BT16-050", as: "lowOne" },
            { card: "BT16-050", as: "lowTwo" },
            { card: "BT16-101", as: "high" },
          ],
        },
      },
      { autoSelectCards: true },
    );
    await s.ready();
    s.state.memory = 10;
    expect(
      s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId, useAs: "option" } as never),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]?.battleArea.length === 1);
    expect(s.state.players[1]?.battleArea).toHaveLength(1);
    expect(s.state.players[1]?.battleArea[0]?.topCard?.cardId).toBe("BT16-101");
  });
});

describe("BT16-098 DORU-Din — KB Q&A rulings", () => {
  it("still deletes the lowest play cost Digimon after 'then' without a [Dorugoramon] (Q2696)", async () => {
    async function useDoruDin(myBattleArea: PermanentSpec[]) {
      const preferred: string[] = [];
      const s = setupEngine(
        {
          0: { hand: [{ card: "BT16-098", as: "option" }], battleArea: myBattleArea },
          1: {
            battleArea: [
              { card: "BT16-088", as: "tamer" },
              { card: "BT1-009", as: "lowestCost" },
              { card: "BT16-050", as: "higherCost" },
            ],
          },
        },
        { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferred },
      );
      preferred.push(s.perm("tamer").topCard!.instanceId);
      s.state.memory = 10;
      await s.ready();
      expect(
        s.engine.applyIntent(0, {
          type: "playCard",
          instanceId: s.inst("option").instanceId,
          useAs: "option",
        } as never),
      ).toEqual({ ok: true });
      await settle(() => s.state.players[0]!.trash.some((card) => card.instanceId === s.inst("option").instanceId));
      await settle();
      return s.state.players[1]!.battleArea.map((permanent) => permanent.topCard?.cardId);
    }

    expect(await useDoruDin([{ card: "BT16-050" }])).toEqual(["BT16-088", "BT16-050"]);
    expect(await useDoruDin([{ card: "BT16-050" }, { card: "BT16-064" }])).toEqual(["BT16-050"]);
  });
});
