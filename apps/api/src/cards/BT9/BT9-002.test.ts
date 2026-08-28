import { getCardDefinition, Phase } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "../BT1/BT1-029.js";
import { compiled } from "./BT9-002.js";

describe("BT9-002 Puyoyomon", () => {
  it("matches the catalog and complete inherited event contract", () => {
    expect(getCardDefinition("BT9-002")).toMatchObject({
      cardId: "BT9-002",
      nameEn: "Puyoyomon",
      colors: ["Blue"],
      kinds: ["DigiEgg"],
      level: 2,
      playCost: -1,
      dp: 0,
      evoCosts: [],
      forms: ["In-Training"],
      types: ["Lesser"],
      inheritedEffectText:
        "[Your Turn][Once Per Turn] When an effect adds a card to your hand, this Digimon gets +1000 DP for the turn.",
    });
    expect(compiled).toEqual({
      effects: [
        {
          trigger: "YourTurn",
          actions: [
            {
              kind: "SubTrigger",
              event: "whenEffectAddsToHand",
              actions: [
                {
                  kind: "ModifyDP",
                  target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
                  amount: 1000,
                  duration: "forTheTurn",
                },
              ],
            },
          ],
          isInherited: true,
          frequency: "OncePerTurn",
        },
      ],
      coverage: "full",
      residual: [],
    });
  });

  it("implements Q1794 for an effect-driven return to its controller's hand", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT1-028", as: "host", under: ["BT9-002"] }],
        trash: [{ card: "BT1-028", as: "returned" }],
      },
    });
    await s.ready();
    const baseline = s.perm("host").currentDP;
    await advance(s.engine).verb.returnToHand([s.inst("returned").instanceId]);
    await settle(() => s.perm("host").currentDP === baseline + 1000);
    expect(s.state.players[0]!.hand).toContainEqual(s.inst("returned"));
    expect(s.perm("host").currentDP).toBe(baseline + 1000);
  });

  it("implements Q1795 for Draw and remains once per turn across later additions", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT1-028", as: "host", under: ["BT9-002"] }],
        deck: ["BT1-009"],
        trash: [{ card: "BT1-010", as: "returned" }],
      },
    });
    await s.ready();
    const baseline = s.perm("host").currentDP;
    await advance(s.engine).verb.draw(0, 1);
    await settle(() => s.perm("host").currentDP === baseline + 1000);
    await advance(s.engine).verb.returnToHand([s.inst("returned").instanceId]);
    await settle();
    expect(s.state.players[0]!.hand).toHaveLength(2);
    expect(s.perm("host").currentDP).toBe(baseline + 1000);
  });

  it("triggers from a public On Play Draw intent", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT1-028", as: "host", under: ["BT9-002"] }],
        hand: [{ card: "BT1-029", as: "gabumon" }],
        deck: [{ card: "BT1-010", as: "drawn" }],
      },
    });
    s.state.memory = 3;
    await s.ready();
    const baseline = s.perm("host").currentDP;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("gabumon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.perm("host").currentDP === baseline + 1000);
    expect(s.state.players[0]!.hand).toContainEqual(s.inst("drawn"));
    expect(s.perm("host").currentDP).toBe(baseline + 1000);
  });

  it("ignores an opponent's hand addition", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT1-028", as: "host", under: ["BT9-002"] }] },
      1: { trash: [{ card: "BT1-010", as: "opponentCard" }] },
    });
    await s.ready();
    const baseline = s.perm("host").currentDP;
    await advance(s.engine).verb.returnToHand([s.inst("opponentCard").instanceId]);
    await settle();
    expect(s.perm("host").currentDP).toBe(baseline);
  });

  it("does not install the watcher during the opponent's turn", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT1-028", as: "host", under: ["BT9-002"] }],
        trash: [{ card: "BT1-010", as: "returned" }],
      },
    });
    s.state.turnSeat = 1;
    await s.ready();
    const baseline = s.perm("host").currentDP;
    await advance(s.engine).verb.returnToHand([s.inst("returned").instanceId]);
    await settle();
    expect(s.perm("host").currentDP).toBe(baseline);
  });

  it("keeps the inherited watcher on a legal Puyoyomon-to-Elecmon stack", async () => {
    const s = setupEngine({
      0: {
        breeding: { card: "BT9-002", as: "puyoyomon" },
        hand: [{ card: "BT1-028", as: "elecmon" }],
        trash: [{ card: "BT1-010", as: "returned" }],
      },
    });
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("puyoyomon").permanentId,
        instanceId: s.inst("elecmon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("puyoyomon").topCard.instanceId === s.inst("elecmon").instanceId);
    s.state.phase = Phase.Breeding;
    expect(s.engine.applyIntent(0, { type: "moveFromBreeding", permanentId: s.perm("puyoyomon").permanentId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.breeding === undefined);

    const baseline = s.perm("puyoyomon").currentDP;
    await advance(s.engine).verb.returnToHand([s.inst("returned").instanceId]);
    await settle(() => s.perm("puyoyomon").currentDP === baseline + 1000);
    expect(s.perm("puyoyomon").stack.map((card) => card.cardId)).toContain("BT9-002");
    expect(s.perm("puyoyomon").currentDP).toBe(baseline + 1000);
  });
});
