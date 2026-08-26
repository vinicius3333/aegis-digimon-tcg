import { describe, expect, it } from "vitest";
import { PlayerState } from "@aegis/shared";
import { settle, setupEngine } from "../../engine/testkit/harness.js";
import { advance } from "../../engine/testkit/advance.js";
import "./index.js";
import { compiled } from "./EX8-036.js";

describe("EX8-036", () => {
  it("plays an NSo Digimon costing 5 or less from hand or trash when digivolving", () =>
    expect(compiled.effects?.find((entry) => entry.trigger === "WhenDigivolving")?.actions[0]).toMatchObject({
      kind: "PlayWithoutCost",
      from: ["hand", "trash"],
      payCost: false,
      optional: true,
      target: { count: 1, filter: { playCostLte: 5 } },
    }));
  it("has Recovery +1 (Deck) on deletion", () =>
    expect(compiled.effects?.find((entry) => entry.trigger === "OnDeletion")?.keywords).toContainEqual({
      keyword: "Recovery",
      amount: 1,
      raw: "＜Recovery +1 (Deck)＞",
    }));

  it("recovers the deck top into security when deleted", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "EX8-036", as: "skull" }],
        security: 1,
        deck: [{ card: "AD1-001", as: "recoveryCard" }],
      },
    });
    const player = s.state.players[0] as PlayerState;
    await advance(s.engine).verb.deletePermanent([s.perm("skull").permanentId]);
    await settle(() => player.security.length === 2);
    expect(player.security).toHaveLength(2);
    expect(player.deck).toHaveLength(0);
  });

  it("uses the NSo route and plays a qualifying Digimon from trash for free", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX8-033", as: "base" }],
          hand: [{ card: "EX8-036", as: "skull" }],
          trash: [{ card: "EX8-030", as: "tapirmon" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 3;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("skull").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: true });
    await settle(() =>
      s.state.players[0]!.battleArea.some(
        (permanent) => permanent.topCard.instanceId === s.inst("tapirmon").instanceId,
      ),
    );
    expect(s.state.memory).toBe(0);
  });
});
