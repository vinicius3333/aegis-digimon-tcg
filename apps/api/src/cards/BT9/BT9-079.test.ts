import { describe, expect, it } from "vitest";
import { getCardDefinition } from "@aegis/shared";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./BT9-079.js";
import "./BT9-079.js";

describe("BT9-079 GranDracmon", () => {
  it("matches the catalog and the free-play and rules-constrained evolution IR", () => {
    expect(getCardDefinition("BT9-079")).toMatchObject({
      colors: ["Purple"],
      level: 6,
      playCost: 12,
      dp: 12000,
      evoCosts: [{ color: "Purple", level: 5, memoryCost: 4 }],
      types: ["Dark Animal"],
    });
    expect(compiled).toMatchObject({
      coverage: "full",
      residual: [],
      effects: [
        {
          trigger: "WhenDigivolving",
          actions: [
            {
              kind: "PlayWithoutCost",
              from: ["trash"],
              payCost: false,
              optional: true,
              target: { filter: { controller: "mine", colors: ["Purple"], levels: [3] } },
            },
          ],
        },
        {
          trigger: "EndOfAttack",
          frequency: "OncePerTurn",
          actions: [
            {
              kind: "Digivolve",
              from: ["trash"],
              payCost: false,
              ignoreReqs: false,
              optional: true,
              target: { filter: { controller: "mine", excludeSelf: true } },
              into: { nameOrTrait: [{ tokens: ["Undead", "Dark Animal"], match: "trait" }] },
            },
          ],
        },
      ],
    });
  });

  it("plays a purple level-3 Digimon from trash for free", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT10-012", as: "base" }],
          hand: [{ card: "BT9-079", as: "evolving" }],
          trash: [{ card: "BT9-070", as: "played" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 3;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("evolving").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() =>
      s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.instanceId === s.inst("played").instanceId),
    );
    expect(s.state.players[0]!.trash).toHaveLength(0);
  });
});

describe("BT9-079 GranDracmon — KB Q&A rulings", () => {
  it("[End of Attack] only digivolves into a trash card whose digivolution requirements are met (Q1872)", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT9-079", as: "attacker" },
            { card: "BT9-073", as: "other" },
          ],
          trash: [
            { card: "BT9-079", as: "levelSixDarkAnimal" },
            { card: "BT9-077", as: "levelFiveUndead" },
          ],
        },
        1: { security: 1 },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferred },
    );
    const levelSixId = s.inst("levelSixDarkAnimal").instanceId;
    const levelFiveId = s.inst("levelFiveUndead").instanceId;
    preferred.push(levelSixId);
    s.state.memory = 3;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("other").topCard?.cardId !== "BT9-073");

    expect(s.perm("other").topCard?.instanceId).toBe(levelFiveId);
    const offeredCards = s.decisions.flatMap(({ req }) => req.options?.candidateInstanceIds ?? []);
    expect(offeredCards).not.toContain(levelSixId);
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toEqual([levelSixId]);
    expect(s.state.memory).toBe(3);
  });
});
