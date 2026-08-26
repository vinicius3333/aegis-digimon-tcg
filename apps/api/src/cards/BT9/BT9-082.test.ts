import { describe, expect, it } from "vitest";
import { getCardDefinition } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./BT9-082.js";
import "./BT9-082.js";

describe("BT9-082 Ordinemon", () => {
  it("matches catalog values and the DNA-only delete, recovery, and replay IR", () => {
    expect(getCardDefinition("BT9-082")).toMatchObject({
      colors: ["Purple", "Yellow"], level: 7, playCost: 15, dp: 15000,
      evoCosts: [{ color: "Purple", level: 6, memoryCost: 6 }, { color: "Yellow", level: 6, memoryCost: 6 }], types: ["Fallen Angel"],
    });
    expect(compiled).toMatchObject({
      coverage: "full", residual: [],
      dnaDigivolveRequirement: [{ cost: 0, materials: [{ color: "Purple", level: 6 }, { color: "Yellow", level: 6 }], }],
      effects: [
        { trigger: "WhenDigivolving", condition: { kind: "isDnaDigivolving" }, actions: [
          { kind: "Delete", target: { filter: { levelComparison: { op: "gte", value: 6 } }, count: 1 } },
          { kind: "Delete", target: { filter: { levelComparison: { op: "lte", value: 5 } }, count: "all" } },
          { kind: "SecurityManipulation", op: "addTop", source: "deck", scaling: { unit: "deletedThisEffect", per: 1 } },
        ] },
        { trigger: "OnDeletion", actions: [{ kind: "PlayWithoutCost", from: ["trash"], payCost: false, optional: true, target: { filter: { isSelfRef: true } }, cost: { kind: "trash" } }] },
      ],
    });
  });

  it("on DNA digivolution deletes one level 6+ and all level 5- Digimon, then recovers per deletion", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "AD1-014", as: "purple" },
            { card: "AD1-016", as: "yellow" },
          ],
          hand: [{ card: "BT9-082", as: "ordinemon" }],
          deck: ["BT1-001", "BT1-002", "BT1-003"],
        },
        1: { battleArea: ["BT6-111", "BT2-047", "BT1-015"] },
      },
      { autoSelectCards: true, autoOrderTriggers: true },
    );
    s.state.memory = 0;

    expect(
      s.engine.applyIntent(0, {
        type: "dnaDigivolve",
        materialPermanentIds: [s.perm("purple").permanentId, s.perm("yellow").permanentId],
        instanceId: s.inst("ordinemon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.security.length === 3);

    expect(s.state.players[1]!.battleArea).toHaveLength(0);
    expect(s.state.players[0]!.deck).toHaveLength(0);
  });

  it("does not run its mass deletion or Recovery after a normal digivolution", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT9-080", as: "base" }],
          hand: [{ card: "BT9-082", as: "ordinemon" }],
          deck: ["BT1-001", "BT1-002"],
        },
        1: { battleArea: [{ card: "BT6-111", as: "opponent" }] },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 6;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("ordinemon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard.cardId === "BT9-082");

    expect(s.state.players[1]!.battleArea).toHaveLength(1);
    expect(s.state.players[0]!.security).toHaveLength(0);
    expect(s.state.players[0]!.deck).toHaveLength(1);
  });

  it("trashes the top security card to replay only Ordinemon as a fresh Digimon", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            {
              card: "BT9-082",
              as: "ordinemon",
              under: [
                { card: "BT9-080", as: "oldRaguel" },
                { card: "BT9-074", as: "oldMeicoomon" },
              ],
            },
          ],
          security: [{ card: "BT1-001", as: "cost", faceUp: false }],
        },
      },
      {
        autoAcceptOptional: true,
        autoSelectCards: true,
      },
    );
    const ordinemonInstanceId = s.perm("ordinemon").topCard.instanceId;
    const oldSourceIds = new Set([s.inst("oldRaguel").instanceId, s.inst("oldMeicoomon").instanceId]);

    expect(await advance(s.engine).verb.deletePermanent([s.perm("ordinemon").permanentId])).toBe(1);
    await settle(() =>
      s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.instanceId === ordinemonInstanceId),
    );

    const replayed = s.state.players[0]!.battleArea.find(
      (permanent) => permanent.topCard.instanceId === ordinemonInstanceId,
    );
    expect(replayed).toBeDefined();
    expect(replayed!.stack).toHaveLength(0);
    expect(s.state.players[0]!.security).toHaveLength(0);
    expect(s.state.players[0]!.trash.filter((card) => oldSourceIds.has(card.instanceId))).toHaveLength(2);
    expect(s.state.players[0]!.trash.some((card) => card.instanceId === s.inst("cost").instanceId)).toBe(true);
  });
});
