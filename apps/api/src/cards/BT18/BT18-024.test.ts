import { EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT18-024.js";

describe("BT18-024 Calmaramon", () => {
  it("returns an opponent level 4 when its own stack contains a level 3 Digimon", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT18-024", as: "calmaramon", under: ["BT1-030"] }] },
        1: { battleArea: [{ card: "BT1-032", as: "target" }] },
      },
      { autoSelectCards: true },
    );
    await s.ready();
    const targetId = s.perm("target").topCard!.instanceId;

    await advance(s.engine).fireForInstance(EffectTiming.OnPlay, s.perm("calmaramon").topCard!);
    await settle(() => s.state.players[1]!.hand.some((card) => card.instanceId === targetId));

    expect(s.state.players[1]!.hand.some((card) => card.instanceId === targetId)).toBe(true);
    expect(s.state.players[1]!.battleArea.some((perm) => perm.topCard?.instanceId === targetId)).toBe(false);
  });

  it("uses the inherited once-per-turn attack effect to return an exact level 3 Digimon", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT1-060", as: "calmaramon", under: ["BT18-024"] }] },
        1: { battleArea: [{ card: "BT1-030", as: "target" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    const targetId = s.perm("target").topCard!.instanceId;

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("calmaramon").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.hand.some((card) => card.instanceId === targetId));

    expect(s.state.players[1]!.hand.some((card) => card.instanceId === targetId)).toBe(true);
    expect(s.state.players[1]!.battleArea.some((perm) => perm.topCard?.instanceId === targetId)).toBe(false);
  });

  it("instead places a blue level 3 from hand under itself when its stack lacks one", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT18-024", as: "calmaramon" }],
          hand: [
            { card: "BT1-030", as: "blueLevel3" },
            { card: "BT1-009", as: "redLevel3" },
          ],
        },
        1: { battleArea: [{ card: "BT1-032", as: "target" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: [] },
    );
    await s.ready();
    const sourceId = s.inst("blueLevel3").instanceId;

    await advance(s.engine).fireForInstance(EffectTiming.OnPlay, s.perm("calmaramon").topCard!);
    await settle(() => s.perm("calmaramon").stack.some(({ instanceId }) => instanceId === sourceId));

    expect(s.perm("calmaramon").stack.map(({ instanceId }) => instanceId)).toContain(sourceId);
    expect(s.state.players[1]!.battleArea).toHaveLength(1);
    expect(s.state.players[0]!.hand.map(({ cardId }) => cardId)).toContain("BT1-009");
  });

  it("naturally places a blue level 3 from hand after evolving from Lanamon", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT18-023", as: "lanamon" }],
          hand: [{ card: "BT18-024", as: "calmaramon" }, { card: "BT1-030", as: "blueLevel3" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 3;
    const sourceId = s.inst("blueLevel3").instanceId;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("lanamon").permanentId,
        instanceId: s.inst("calmaramon").instanceId,
        alternateRequirementIndex: 0,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("lanamon").stack.some(({ instanceId }) => instanceId === sourceId));

    expect(s.perm("lanamon").topCard.cardId).toBe("BT18-024");
    expect(s.perm("lanamon").stack.map(({ instanceId }) => instanceId)).toContain(sourceId);
    expect(s.state.players[0]!.hand.some(({ instanceId }) => instanceId === sourceId)).toBe(false);
  });

  it("naturally returns an opposing level 4 when evolving onto a stack with a level 3", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT18-023", as: "lanamon", under: ["BT1-030"] }],
          hand: [{ card: "BT18-024", as: "calmaramon" }],
        },
        1: { battleArea: [{ card: "BT1-032", as: "target" }] },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 3;
    const targetId = s.perm("target").topCard!.instanceId;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("lanamon").permanentId,
        instanceId: s.inst("calmaramon").instanceId,
        alternateRequirementIndex: 0,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.hand.some(({ instanceId }) => instanceId === targetId));

    expect(s.state.players[1]!.hand.some(({ instanceId }) => instanceId === targetId)).toBe(true);
    expect(s.state.players[1]!.battleArea.some(({ topCard }) => topCard?.instanceId === targetId)).toBe(false);
  });

  it("digivolves from Lanamon for the named cost of 1", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT18-023", as: "lanamon" }],
        hand: [{ card: "BT18-024", as: "calmaramon" }],
      },
    });
    s.state.memory = 3;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("lanamon").permanentId,
        instanceId: s.inst("calmaramon").instanceId,
        alternateRequirementIndex: 0,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("lanamon").topCard.cardId === "BT18-024");

    expect(s.state.memory).toBe(2);
    expect(s.perm("lanamon").stack.at(-1)?.cardId).toBe("BT18-023");
  });
});
