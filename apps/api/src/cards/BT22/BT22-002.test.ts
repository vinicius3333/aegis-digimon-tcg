import { describe, expect, it } from "vitest";
import { Phase } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { settle, setupEngine } from "../../engine/testkit/harness.js";
import { compiled } from "./BT22-002.js";
import "./BT22-040.js";

describe("BT22-002 Kyaromon", () => {
  it("hatches publicly and legally evolves into a Puppet while rejecting Agumon", async () => {
    const s = setupEngine({
      0: {
        eggDeck: [{ card: "BT22-002", as: "egg" }],
        hand: [
          { card: "BT22-029", as: "shoemon" },
          { card: "BT22-008", as: "invalidAgumon" },
        ],
        deck: ["BT1-001", "BT1-002"],
      },
    });
    s.state.phase = Phase.Breeding;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "hatchEgg" })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.breeding?.topCard?.cardId === "BT22-002");
    s.state.phase = Phase.Main;
    s.state.memory = 0;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.state.players[0]!.breeding!.permanentId,
        instanceId: s.inst("shoemon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.breeding?.topCard?.cardId === "BT22-029");
    expect(s.state.players[0]!.breeding?.stack.map((card) => card.cardId)).toEqual(["BT22-002"]);
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.state.players[0]!.breeding!.permanentId,
        instanceId: s.inst("invalidAgumon").instanceId,
      }).ok,
    ).toBe(false);
  });

  it("draws from a Token created by a public Cendrillmon play", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT22-032", under: ["BT22-002"], as: "host" }],
          hand: [{ card: "BT22-040", as: "cendrillmon" }],
          deck: ["BT1-001", "BT1-002"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    s.state.memory = 15;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("cendrillmon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.battleArea.some((p) => p.topCard?.cardId === "TOKEN-Familiar-Token"));
    const token = s.state.players[0]!.battleArea.find((p) => p.topCard?.cardId === "TOKEN-Familiar-Token")!;
    await advance(s.engine).verb.deletePermanent([token.permanentId], "byEffect");
    expect(s.state.players[0]!.deck).toHaveLength(1);
  });

  it("draws only once when another owned Puppet Digimon is deleted", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "BT6-030", under: ["BT22-002"], as: "host" },
          { card: "BT2-055", as: "firstPuppet" },
          { card: "BT2-055", as: "secondPuppet" },
        ],
        deck: ["BT1-001", "BT1-002"],
      },
    });
    await s.ready();

    await advance(s.engine).verb.deletePermanent([s.perm("firstPuppet").permanentId], "byEffect");
    expect(s.state.players[0]!.deck).toHaveLength(1);
    await advance(s.engine).verb.deletePermanent([s.perm("secondPuppet").permanentId], "byEffect");
    expect(s.state.players[0]!.deck).toHaveLength(1);
  });

  it("resets the once-per-turn draw after a complete round of public turns", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "BT6-030", under: ["BT22-002"], as: "host" },
          { card: "BT2-055", as: "firstPuppet" },
          { card: "BT2-055", as: "secondPuppet" },
        ],
        deck: ["BT1-001", "BT1-002", "BT1-003", "BT1-004"],
      },
      1: { deck: ["BT1-005", "BT1-006"] },
    });
    await s.ready();
    await advance(s.engine).verb.deletePermanent([s.perm("firstPuppet").permanentId], "byEffect");
    expect(s.state.players[0]!.deck).toHaveLength(3);
    const firstTurnCount = s.state.turnCount;
    await advance(s.engine).runTurn(0);
    s.state.turnSeat = 1;
    s.state.memory = -s.state.memory;
    await advance(s.engine).runTurn(1);
    s.state.turnSeat = 0;
    expect(s.state.turnCount).toBeGreaterThan(firstTurnCount);
    expect(s.state.turnSeat).toBe(0);
    await advance(s.engine).verb.deletePermanent([s.perm("secondPuppet").permanentId], "byEffect");
    expect(s.state.players[0]!.deck).toHaveLength(2);
  });

  it("does not draw for a non-Puppet, an opponent's Puppet, its own host, or on the opponent's turn", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "BT6-030", under: ["BT22-002"], as: "host" },
          { card: "BT1-010", as: "nonPuppet" },
          { card: "BT2-055", as: "wrongTurnPuppet" },
        ],
        deck: ["BT1-001", "BT1-002"],
      },
      1: { battleArea: [{ card: "BT2-055", as: "opponentPuppet" }] },
    });
    await s.ready();

    await advance(s.engine).verb.deletePermanent([s.perm("nonPuppet").permanentId], "byEffect");
    await advance(s.engine).verb.deletePermanent([s.perm("opponentPuppet").permanentId], "byEffect");
    await advance(s.engine).verb.deletePermanent([s.perm("host").permanentId], "byEffect");
    s.state.turnSeat = 1;
    await advance(s.engine).verb.deletePermanent([s.perm("wrongTurnPuppet").permanentId], "byEffect");
    expect(s.state.players[0]!.deck).toHaveLength(2);
  });

  it("keeps the watcher live for an opponent-turn deletion", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "BT6-030", under: ["BT22-002"], as: "host" },
          { card: "BT2-055", as: "ownedPuppet" },
        ],
        deck: ["BT1-001", "BT1-002"],
      },
    });
    await s.ready();
    s.state.turnSeat = 1;
    await advance(s.engine).verb.deletePermanent([s.perm("ownedPuppet").permanentId], "byEffect");
    expect(s.state.players[0]!.deck).toHaveLength(2);
  });

  it("models Tokens and Puppet Digimon as alternatives rather than requiring a Puppet Token", () => {
    const watcher = compiled.effects[0]?.actions[0] as any;
    expect(watcher.sourceFilter).toMatchObject({
      controller: "mine",
      excludeSelf: true,
      or: [
        { isToken: true },
        {
          kind: ["Digimon"],
          nameOrTrait: [{ tokens: ["Puppet"], match: "trait" }],
        },
      ],
    });
    expect(watcher).toMatchObject({
      kind: "SubTrigger",
      event: "onDeletionOf",
      actions: [{ kind: "Draw", controller: "mine", amount: 1 }],
    });
    expect(compiled.effects[0]).toMatchObject({
      trigger: "YourTurn",
      isInherited: true,
      frequency: "OncePerTurn",
    });
  });
});
