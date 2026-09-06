import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./BT20-079.js";
import "./index.js";

describe("BT20-079 Necromon", () => {
  it("has Security Attack +1 and Execute", () => {
    expect(
      compiled.effects
        .filter((effect) => effect.trigger === "Static")
        .flatMap((effect) => effect.keywords?.map((keyword) => keyword.keyword)),
    ).toEqual(["SecurityAttack", "Execute"]);
  });

  it("deletes one opposing lowest-level Digimon on play and digivolving", () => {
    for (const trigger of ["OnPlay", "WhenDigivolving"] as const) {
      const effect = compiled.effects.find((entry) => entry.trigger === trigger && entry.actions[0]?.kind === "Delete");
      expect(effect).toMatchObject({
        actions: [
          {
            kind: "Delete",
            target: { filter: { controller: "opponent", kind: ["Digimon"], superlative: "lowestLevel" }, count: 1 },
          },
        ],
      });
    }
  });

  it("may play one level 5 or lower Ghost Digimon from trash on play and deletion", () => {
    for (const trigger of ["OnPlay", "OnDeletion"] as const) {
      expect(
        compiled.effects.find((effect) => effect.trigger === trigger && effect.actions[0]?.kind === "PlayWithoutCost"),
      ).toMatchObject({
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
                levelComparison: { op: "lte", value: 5 },
                nameOrTrait: [{ tokens: ["Ghost"], match: "trait" }],
              },
              count: 1,
            },
          },
        ],
      });
    }
  });

  it("naturally deletes the lowest-level opposing Digimon on play and plays a Ghost from trash", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "BT20-079", as: "necromon" }],
          trash: [{ card: "BT20-072", as: "ghost" }],
        },
        1: {
          battleArea: [
            { card: "BT20-071", as: "lowest" },
            { card: "BT20-076", as: "higher" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 12;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("necromon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => {
      const opponent = s.state.players[1]!;
      const mine = s.state.players[0]!;
      return (
        !opponent.battleArea.some((permanent) => permanent.topCard.cardId === "BT20-071") &&
        mine.battleArea.some((permanent) => permanent.topCard.cardId === "BT20-072")
      );
    });

    expect(s.state.players[1]!.battleArea.map((permanent) => permanent.topCard.cardId)).toEqual(["BT20-076"]);
    expect(s.state.players[0]!.battleArea.map((permanent) => permanent.topCard.cardId)).toContain("BT20-072");
  });

  it("naturally proves On Deletion by losing a battle and playing a Ghost from trash", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT20-079", dp: 12000, as: "necromon" }],
          trash: [{ card: "BT20-072", as: "ghost" }],
        },
        1: { battleArea: [{ card: "BT20-076", dp: 15000, as: "attacker", suspended: true }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 5;

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("necromon").permanentId,
        target: { kind: "permanent", permanentId: s.perm("attacker").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => {
      const mine = s.state.players[0]!;
      return (
        !mine.battleArea.some((permanent) => permanent.topCard.cardId === "BT20-079") &&
        mine.battleArea.some((permanent) => permanent.topCard.cardId === "BT20-072")
      );
    });

    expect(s.state.players[0]!.battleArea.map((permanent) => permanent.topCard.cardId)).toContain("BT20-072");
    expect(s.state.players[0]!.trash.some((card) => card.cardId === "BT20-079")).toBe(true);
  });

  it("publicly evolves from a purple level-5 and may decline the trash Ghost play", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT20-073", as: "base" }],
          hand: [{ card: "BT20-079", as: "necromon" }],
          trash: [{ card: "BT20-072", as: "ghost" }],
        },
        1: { battleArea: [{ card: "BT20-071", as: "lowest" }] },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    s.state.memory = 4;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("necromon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard.cardId === "BT20-079" && s.state.pendingDecision === undefined);
    expect(s.state.players[1]!.battleArea).toHaveLength(0);
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toContain(s.inst("ghost").instanceId);
  });
});
