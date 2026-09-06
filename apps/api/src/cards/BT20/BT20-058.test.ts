import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./BT20-058.js";
import "./index.js";

describe("BT20-058 Raidenmon", () => {
  it("deletes one opposing Digimon with play cost 7 or less on play and digivolving", () => {
    for (const trigger of ["OnPlay", "WhenDigivolving"] as const) {
      expect(compiled.effects.find((effect) => effect.trigger === trigger)).toMatchObject({
        actions: [
          {
            kind: "Delete",
            target: { filter: { controller: "opponent", kind: ["Digimon"], playCostLte: 7 }, count: 1 },
          },
        ],
      });
    }
  });

  it("replaces battle-area departure with an optional free play from digivolution cards", () => {
    expect(compiled.effects.find((effect) => effect.trigger === "AllTurns")).toMatchObject({
      actions: [
        {
          kind: "Replacement",
          event: "wouldLeavePlay",
          sourceFilter: { isSelfRef: true, zone: "battleArea" },
          actions: [
            {
              kind: "PlayWithoutCost",
              fromOwnDigivolutionStack: true,
              payCost: false,
              optional: true,
              target: {
                filter: {
                  controller: "mine",
                  kind: ["Digimon"],
                  playCostLte: 11,
                  nameOrTrait: [{ tokens: ["Cyborg", "Machine"], match: "trait" }],
                },
                count: 1,
              },
            },
          ],
        },
      ],
    });
  });

  it("requires Raijinmon, Fujinmon, and Suijinmon for DigiXros -2", () => {
    expect(compiled.digiXrosRequirement).toEqual([
      { materials: [{ names: ["Raijinmon"] }, { names: ["Fujinmon"] }, { names: ["Suijinmon"] }], count: 2 },
    ]);
  });

  it("deletes at play cost 7 but not 8 on both entry timings", async () => {
    for (const mode of ["play", "digivolve"] as const) {
      const s = setupEngine(
        {
          0: {
            ...(mode === "play" ? {} : { battleArea: [{ card: "BT20-054", as: "base" }] }),
            hand: [{ card: "BT20-058", as: "raidenmon" }],
          },
          1: {
            battleArea: [
              { card: "BT1-024", as: "cost7" },
              { card: "BT10-025", as: "cost8" },
            ],
          },
        },
        { autoSelectCards: true },
      );
      s.state.memory = mode === "play" ? 12 : 4;
      const result =
        mode === "play"
          ? s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("raidenmon").instanceId })
          : s.engine.applyIntent(0, {
              type: "digivolve",
              permanentId: s.perm("base").permanentId,
              instanceId: s.inst("raidenmon").instanceId,
            });
      expect(result).toEqual({ ok: true });
      await settle(() => s.state.players[1]!.battleArea.length === 1);
      expect(s.state.players[1]!.battleArea.map((permanent) => permanent.topCard.cardId)).toEqual(["BT10-025"]);
      expect(s.state.memory).toBe(0);
    }
  });

  it("Q4391 may play either an eligible Cyborg or Machine source when leaving", async () => {
    for (const eligible of ["BT9-042", "BT9-029"] as const) {
      const s = setupEngine(
        {
          0: {
            battleArea: [
              {
                card: "BT20-058",
                under: [eligible, "BT20-058", "BT20-017"],
                as: "raidenmon",
              },
            ],
          },
        },
        { autoAcceptOptional: true, autoSelectCards: true },
      );
      await s.ready();
      await advance(s.engine).verb.deletePermanent([s.perm("raidenmon").permanentId], "byEffect");
      await settle(() => s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.cardId === eligible));
      expect(s.state.players[0]!.battleArea.map((permanent) => permanent.topCard.cardId)).toEqual([eligible]);
      expect(s.state.players[0]!.trash.map((card) => card.cardId)).toEqual(
        expect.arrayContaining(["BT20-058", "BT20-058", "BT20-017"]),
      );
    }
  });

  it("allows the leave-triggered source play to be declined", async () => {
    const s = setupEngine(
      { 0: { battleArea: [{ card: "BT20-058", under: ["BT9-042"], as: "raidenmon" }] } },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    await s.ready();
    await advance(s.engine).verb.deletePermanent([s.perm("raidenmon").permanentId], "byEffect");
    expect(s.state.players[0]!.battleArea).toHaveLength(0);
    expect(s.state.players[0]!.trash.map((card) => card.cardId)).toEqual(
      expect.arrayContaining(["BT20-058", "BT9-042"]),
    );
  });

  it("does not replay a Machine source whose play cost exceeds 11", async () => {
    const s = setupEngine(
      { 0: { battleArea: [{ card: "BT20-058", under: ["BT20-036"], as: "raidenmon" }] } },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    await advance(s.engine).verb.deletePermanent([s.perm("raidenmon").permanentId], "byEffect");
    await settle(() => s.state.players[0]!.battleArea.length === 0 && s.state.pendingDecision === undefined);
    expect(s.state.players[0]!.trash.map((card) => card.cardId)).toEqual(
      expect.arrayContaining(["BT20-058", "BT20-036"]),
    );
  });

  it("plays for 6 with all three exact DigiXros materials and stacks them", async () => {
    const s = setupEngine({
      0: {
        hand: [
          { card: "BT20-058", as: "raidenmon" },
          { card: "BT9-042", as: "raijinmon" },
          { card: "BT9-054", as: "fujinmon" },
          { card: "BT9-029", as: "suijinmon" },
        ],
      },
    });
    s.state.memory = 12;
    expect(
      s.engine.applyIntent(0, {
        type: "playCard",
        instanceId: s.inst("raidenmon").instanceId,
        digiXros: {
          materialInstanceIds: [
            s.inst("raijinmon").instanceId,
            s.inst("fujinmon").instanceId,
            s.inst("suijinmon").instanceId,
          ],
        },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.cardId === "BT20-058"));
    const raidenmon = s.state.players[0]!.battleArea.find((permanent) => permanent.topCard.cardId === "BT20-058")!;
    expect(s.state.memory).toBe(6);
    expect(raidenmon.stack.map((card) => card.cardId)).toEqual(
      expect.arrayContaining(["BT9-042", "BT9-054", "BT9-029"]),
    );
  });
});
