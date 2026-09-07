import { describe, expect, it } from "vitest";
import { CardColor, CardKind, Phase } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { definitionMatches } from "../../engine/effects/interpreter.js";
import { settle, setupEngine } from "../../engine/testkit/harness.js";
import { compiled } from "./BT22-001.js";
import "./BT22-021.js";

async function placeByEffect(s: ReturnType<typeof setupEngine>, permanentId: string, instanceIds: string[]) {
  advance(s.engine).verb.enterEffectResolution(0, ["Digimon"]);
  try {
    await advance(s.engine).verb.placeUnder(permanentId, instanceIds);
  } finally {
    advance(s.engine).verb.leaveEffectResolution();
  }
}

describe("BT22-001 Puyoyomon", () => {
  it("hatches publicly and legally evolves into Sangomon while rejecting Agumon", async () => {
    const s = setupEngine({
      0: {
        eggDeck: [{ card: "BT22-001", as: "egg" }],
        hand: [
          { card: "BT22-018", as: "sangomon" },
          { card: "BT22-008", as: "invalidAgumon" },
        ],
        deck: ["BT1-001", "BT1-002"],
      },
    });
    s.state.phase = Phase.Breeding;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "hatchEgg" })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.breeding?.topCard?.cardId === "BT22-001");
    s.state.phase = Phase.Main;
    s.state.memory = 0;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.state.players[0]!.breeding!.permanentId,
        instanceId: s.inst("sangomon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.breeding?.topCard?.cardId === "BT22-018");

    expect(s.state.players[0]!.breeding?.stack.map((card) => card.cardId)).toEqual(["BT22-001"]);
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.state.players[0]!.breeding!.permanentId,
        instanceId: s.inst("invalidAgumon").instanceId,
      }).ok,
    ).toBe(false);
  });

  it("requires effect provenance for its inherited stack-add watcher", () => {
    const watcher = compiled.effects[0]?.actions[0] as any;
    expect(watcher).toMatchObject({
      kind: "SubTrigger",
      event: "onAddDigivolutionCards",
      sourceFilter: { controllerDefault: "mine", byEffect: true },
      triggerFilter: { isSelfRef: true },
      addedDigivolutionCardFilter: {
        kind: ["Digimon"],
        nameOrTrait: [{ tokens: ["Aqua", "Sea Animal"], match: "traitContains" }],
      },
    });
  });

  it("mechanism boundary: Aqua trait text still requires a Digimon kind", () => {
    const addedFilter = (compiled.effects[0]?.actions[0] as any).addedDigivolutionCardFilter;
    const base = {
      cardId: "SYNTH-AQUA",
      nameEn: "Aqua Test",
      kinds: [CardKind.Tamer],
      colors: [CardColor.Blue],
      level: 0,
      playCost: 3,
      dp: 0,
      types: ["Aqua"],
    };
    expect(definitionMatches(addedFilter, base)).toBe(false);
    expect(definitionMatches(addedFilter, { ...base, kinds: [CardKind.Digimon] })).toBe(true);
  });

  it("draws once when an effect adds a Sea Animal Digimon to its inherited host", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT22-018", under: ["BT22-001"], as: "host" }],
        hand: [
          { card: "BT1-033", as: "firstSeaAnimal" },
          { card: "BT1-033", as: "secondSeaAnimal" },
        ],
        deck: ["BT1-001", "BT1-002"],
      },
    });
    await s.ready();

    await placeByEffect(s, s.perm("host").permanentId, [s.inst("firstSeaAnimal").instanceId]);
    expect(s.state.players[0]!.deck).toHaveLength(1);
    expect(s.state.players[0]!.hand).toHaveLength(2);

    await placeByEffect(s, s.perm("host").permanentId, [s.inst("secondSeaAnimal").instanceId]);
    expect(s.state.players[0]!.deck).toHaveLength(1);
    expect(s.state.players[0]!.hand).toHaveLength(1);
  });

  it("draws through Shellmon's real On Play placement effect for Sea Animal", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT22-018", under: ["BT22-001"], as: "host" }],
          hand: [
            { card: "BT22-021", as: "shellmon" },
            { card: "BT1-033", as: "placed" },
          ],
          deck: ["BT1-001", "BT1-002"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    s.state.memory = 10;
    expect(
      s.engine.applyIntent(0, {
        type: "playCard",
        instanceId: s.inst("shellmon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => !s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("placed").instanceId));

    expect(s.perm("host").stack.some((card) => card.instanceId === s.inst("placed").instanceId)).toBe(true);
    expect(s.state.players[0]!.deck).toHaveLength(1);
  });

  it("draws through the same natural placement for an Aquabeast trait", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT22-018", under: ["BT22-001"], as: "host" }],
          hand: [
            { card: "BT22-021", as: "shellmon" },
            { card: "BT10-023", as: "aquabeast" },
          ],
          deck: ["BT1-001", "BT1-002"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    s.state.memory = 10;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("shellmon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => !s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("aquabeast").instanceId));

    expect(s.perm("host").stack.some((card) => card.instanceId === s.inst("aquabeast").instanceId)).toBe(true);
    expect(s.state.players[0]!.deck).toHaveLength(1);
  });

  it("does not draw for a nonmatching Digimon, another stack, or the opponent's turn", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "BT22-018", under: ["BT22-001"], as: "host" },
          { card: "BT22-018", as: "otherHost" },
        ],
        hand: [
          { card: "BT1-010", as: "nonmatching" },
          { card: "BT1-033", as: "wrongStack" },
          { card: "BT1-033", as: "opponentTurn" },
        ],
        deck: ["BT1-001", "BT1-002"],
      },
    });
    await s.ready();

    await placeByEffect(s, s.perm("host").permanentId, [s.inst("nonmatching").instanceId]);
    await placeByEffect(s, s.perm("otherHost").permanentId, [s.inst("wrongStack").instanceId]);
    s.state.turnSeat = 1;
    await placeByEffect(s, s.perm("host").permanentId, [s.inst("opponentTurn").instanceId]);

    expect(s.state.players[0]!.deck).toHaveLength(2);
    expect(s.state.players[0]!.hand).toHaveLength(0);
  });

  it("does not draw for a manual placement even when the added card matches", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT22-018", under: ["BT22-001"], as: "host" }],
        hand: [{ card: "BT1-033", as: "manualSeaAnimal" }],
        deck: ["BT1-001", "BT1-002"],
      },
    });
    await s.ready();

    await advance(s.engine).verb.placeUnder(s.perm("host").permanentId, [s.inst("manualSeaAnimal").instanceId]);
    expect(s.state.players[0]!.deck).toHaveLength(2);
  });
});
