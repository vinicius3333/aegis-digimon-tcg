import { getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./BT20-070.js";
import "./BT20-029.js";
import "./BT20-064.js";
import "./BT20-071.js";
import "./BT20-089.js";
import "./index.js";

describe("BT20-070 Loogarmon", () => {
  it("optionally trashes one hand card to return one SoC/SEEKERS card from trash on play and digivolving", () => {
    for (const trigger of ["OnPlay", "WhenDigivolving"] as const) {
      expect(compiled.effects.find((effect) => effect.trigger === trigger)).toMatchObject({
        actions: [
          {
            kind: "Return",
            to: "hand",
            optional: true,
            abortOnDecline: true,
            cost: { kind: "trash", target: { filter: { zone: "hand", controller: "mine" }, count: 1 } },
            target: {
              filter: {
                zone: "trash",
                controller: "mine",
                nameOrTrait: [{ tokens: ["SoC", "SEEKERS"], match: "trait" }],
              },
              count: 1,
            },
          },
        ],
      });
    }
  });

  it("grants inherited +2000 DP during its controller's turn", () => {
    expect(compiled.effects.find((effect) => effect.isInherited)).toMatchObject({
      trigger: "YourTurn",
      actions: [{ kind: "ModifyDP", amount: 2000, duration: "permanent" }],
    });
  });

  it("publishes stats and both exact cost-2 alternate evolution routes", async () => {
    expect(getCardDefinition("BT20-070")).toMatchObject({ level: 4, playCost: 6, dp: 6000 });
    expect(compiled.digivolutionRequirement).toEqual([
      { names: ["Loogamon"], cost: 2, isAlternate: true },
      { level: 3, traits: ["SEEKERS"], cost: 2, isAlternate: true },
    ]);
    for (const [base, requirementIndex] of [
      ["BT20-064", 0],
      ["BT20-029", 1],
    ] as const) {
      const s = setupEngine({
        0: {
          battleArea: [{ card: base, as: "base" }],
          hand: [{ card: "BT20-070", as: "loogarmon" }],
          deck: ["BT20-047"],
        },
      });
      s.state.memory = 2;
      expect(
        s.engine.applyIntent(0, {
          type: "digivolve",
          permanentId: s.perm("base").permanentId,
          instanceId: s.inst("loogarmon").instanceId,
          alternateRequirementIndex: requirementIndex,
        }),
      ).toEqual({ ok: true });
      await settle(() => s.perm("base").topCard.cardId === "BT20-070");
      expect(s.perm("base").stack.map((card) => card.cardId)).toEqual([base]);
      expect(s.state.memory).toBe(0);
    }
  });

  it("on play and evolution pays one hand card to recover one SoC/SEEKERS card", async () => {
    for (const mode of ["play", "digivolve"] as const) {
      const preferred: string[] = [];
      const s = setupEngine(
        {
          0: {
            ...(mode === "digivolve" ? { battleArea: [{ card: "BT20-064", as: "base" }] } : {}),
            hand: [
              { card: "BT20-070", as: "loogarmon" },
              { card: "BT20-047", as: "cost" },
            ],
            trash: [
              { card: "BT20-089", as: "soc" },
              { card: "BT20-047", as: "nonmatch" },
            ],
            deck: ["BT20-047"],
          },
          1: { trash: [{ card: "BT20-089", as: "opponentSoc" }] },
        },
        { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferred },
      );
      preferred.push(s.inst("cost").instanceId, s.inst("soc").instanceId);
      s.state.memory = mode === "play" ? 6 : 2;
      const result =
        mode === "play"
          ? s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("loogarmon").instanceId })
          : s.engine.applyIntent(0, {
              type: "digivolve",
              permanentId: s.perm("base").permanentId,
              instanceId: s.inst("loogarmon").instanceId,
              alternateRequirementIndex: 0,
            });
      expect(result).toEqual({ ok: true });
      await settle(() => s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("soc").instanceId));
      expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toContain(s.inst("cost").instanceId);
      expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toContain(s.inst("nonmatch").instanceId);
      expect(s.state.players[1]!.trash.map((card) => card.instanceId)).toContain(s.inst("opponentSoc").instanceId);
    }
  });

  it("allows the hand-trash exchange to be declined", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [
            { card: "BT20-070", as: "loogarmon" },
            { card: "BT20-047", as: "cost" },
          ],
          trash: [{ card: "BT20-089", as: "soc" }],
        },
      },
      { autoAcceptOptional: false, autoSelectCards: true },
    );
    s.state.memory = 6;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("loogarmon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.cardId === "BT20-070"));
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toContain(s.inst("cost").instanceId);
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toContain(s.inst("soc").instanceId);
  });

  it("applies inherited +2000 only underneath a host on its controller's turn", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT20-071", under: ["BT20-070"], as: "host" }] } });
    s.state.turnSeat = 0;
    await s.ready();
    expect(s.perm("host").currentDP).toBe(9000);
    s.state.turnSeat = 1;
    await advance(s.engine).recompute();
    expect(s.perm("host").currentDP).toBe(7000);
  });
});
