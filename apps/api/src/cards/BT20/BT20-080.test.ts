import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./BT20-080.js";
import "./index.js";

describe("BT20-080 Fenriloogamon", () => {
  it("has Scapegoat and may play a level 4 or lower SoC/SEEKERS Digimon from trash on digivolving", () => {
    expect(compiled.effects.find((effect) => !effect.isInherited && effect.trigger === "Static")).toMatchObject({
      keywords: [{ keyword: "Scapegoat" }],
    });
    expect(compiled.effects.find((effect) => effect.trigger === "WhenDigivolving")).toMatchObject({
      actions: [
        {
          kind: "PlayWithoutCost",
          from: ["trash"],
          payCost: false,
          optional: true,
          target: {
            filter: {
              controller: "mine",
              kind: ["Digimon"],
              levelComparison: { op: "lte", value: 4 },
              nameOrTrait: [{ tokens: ["SoC", "SEEKERS"], match: "trait" }],
            },
            count: 1,
          },
        },
      ],
    });
  });

  it("reactivates its When Digivolving effect and optionally attacks when a Tamer is placed under it", () => {
    expect(compiled.effects.find((effect) => effect.trigger === "AllTurns" && !effect.isInherited)).toMatchObject({
      actions: [
        {
          kind: "SubTrigger",
          event: "onAddDigivolutionCards",
          addedDigivolutionCardFilter: { kind: ["Tamer"] },
          triggerFilter: { isSelfRef: true },
          actions: [
            {
              kind: "ReactivateEffect",
              fromTrigger: "WhenDigivolving",
              count: 1,
              target: { filter: { isSelfRef: true }, isSelf: true },
            },
            { kind: "Attack", optional: true, attackPlayer: true },
          ],
        },
      ],
    });
  });

  it("inherits once-per-turn top-security trash after an opponent Digimon deletion", () => {
    expect(compiled.effects.find((effect) => effect.isInherited)).toMatchObject({
      trigger: "AllTurns",
      frequency: "OncePerTurn",
      actions: [
        {
          kind: "SubTrigger",
          event: "onDeletionOf",
          sourceFilter: { controller: "opponent", kind: ["Digimon"] },
          actions: [
            {
              kind: "Trash",
              condition: { kind: "selfHasNameContaining", names: ["Fenriloogamon"] },
              target: { filter: { controller: "opponent", zone: "security", position: "top" }, count: 1 },
            },
          ],
        },
      ],
    });
  });

  it("naturally plays a qualifying SoC/SEEKERS Digimon from trash after digivolving", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT20-071", as: "host" }],
          hand: [{ card: "BT20-080", as: "fenri" }],
          trash: [{ card: "BT20-032", as: "seekers" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 4;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("host").permanentId,
        instanceId: s.inst("fenri").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.cardId === "BT20-032"));

    expect(s.state.players[0]!.battleArea.map((permanent) => permanent.topCard.cardId)).toEqual(
      expect.arrayContaining(["BT20-080", "BT20-032"]),
    );
  });

  it("accepts the alternate Soloogarmon route by name without requiring SEEKERS", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT14-079", as: "soloogarmon" }],
          hand: [{ card: "BT20-080", as: "fenri" }],
        },
      },
      { autoDeclineOptional: true },
    );
    s.state.memory = 3;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("soloogarmon").permanentId,
        instanceId: s.inst("fenri").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea[0]?.topCard.cardId === "BT20-080");
    expect(s.state.players[0]!.battleArea[0]!.topCard.cardId).toBe("BT20-080");
  });

  it("naturally trashes the opponent's top security from a legal DNA-result stack", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          // BT20-081 is the catalog-legal Fenriloogamon: Takemikazuchi DNA result;
          // its materials are Fenriloogamon and Kazuchimon, bottom-most first.
          battleArea: [
            { card: "BT20-081", under: ["BT20-080", "BT20-035"], as: "host" },
            { card: "BT20-032", as: "sacrifice" },
          ],
          hand: [{ card: "BT20-073", as: "metal" }],
        },
        1: {
          battleArea: [{ card: "BT20-071", as: "target" }],
          security: ["BT20-047"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferred },
    );
    preferred.push(s.perm("sacrifice").permanentId, s.perm("target").permanentId);
    s.state.memory = 7;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("metal").instanceId })).toEqual({ ok: true });
    await settle(() => {
      const opponent = s.state.players[1]!;
      return opponent.battleArea.length === 0 && opponent.security.length === 0;
    });

    expect(s.state.players[1]!.security).toHaveLength(0);
    expect(s.state.players[1]!.trash.some((card) => card.cardId === "BT20-047")).toBe(true);
  });
});
