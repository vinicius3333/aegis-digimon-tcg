import { describe, expect, it } from "vitest";
import { observe } from "../../engine/testkit/observe.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./BT18-023.js";

describe("BT18-023 Lanamon", () => {
  it("keeps Aquatic as a Rule trait and preserves the reveal placement alternatives", async () => {
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
    expect(compiled.effects[0]).toMatchObject({
      trigger: "OnPlay",
      actions: [
        {
          kind: "RevealAdd",
          revealCount: 3,
          rest: "deckBottom",
          add: [{ count: 1, to: "hand", orDispositions: [{ to: "placeUnder", underFilter: { colors: ["Blue"] } }] }],
        },
      ],
    });
    expect(compiled.effects[1]).toMatchObject({ trigger: "WhenDigivolving" });
    expect(compiled.effects[2]).toMatchObject({
      trigger: "Rule",
      actions: [{ kind: "GrantStatic", grant: "trait", tokens: ["Aquatic"] }],
    });
    expect(compiled.effects[3]).toMatchObject({
      trigger: "WhenAttacking",
      isInherited: true,
      frequency: "OncePerTurn",
      actions: [{ kind: "Return", to: "hand", target: { filter: { levels: [3] } } }],
    });
    const s = setupEngine({ 0: { battleArea: [{ card: "BT18-023", as: "lanamon" }] } });
    await s.ready();
    expect(observe(s.engine).hasEffectiveTrait(s.perm("lanamon"), "Aquatic")).toBe(true);
  });

  it("reveals three on play and adds the only Aqua/Sea Animal Digimon", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "BT18-023", as: "lanamon" }],
          deck: [{ card: "BT1-033", as: "aqua" }, { card: "BT1-009" }, { card: "BT1-010" }],
        },
      },
      { autoSelectCards: true, autoChooseOption: true },
    );
    s.state.memory = 10;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("lanamon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.hand.some(({ instanceId }) => instanceId === s.inst("aqua").instanceId));

    expect(s.state.players[0]!.hand.some(({ instanceId }) => instanceId === s.inst("aqua").instanceId)).toBe(true);
    expect(s.state.players[0]!.deck).toHaveLength(2);
  });

  it("naturally places the revealed Aqua/Sea Animal card under a blue Digimon when chosen", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT1-030", as: "host" }],
          hand: [{ card: "BT18-023", as: "lanamon" }],
          deck: [{ card: "BT1-033", as: "aqua" }, { card: "BT1-009" }, { card: "BT1-010" }],
        },
      },
      { autoSelectCards: true, autoChooseOption: true, preferOptionIndex: 1 },
    );
    s.state.memory = 10;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("lanamon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.perm("host").stack.some(({ instanceId }) => instanceId === s.inst("aqua").instanceId));

    expect(s.perm("host").stack.some(({ instanceId }) => instanceId === s.inst("aqua").instanceId)).toBe(true);
    expect(s.state.players[0]!.hand.some(({ instanceId }) => instanceId === s.inst("aqua").instanceId)).toBe(false);
    expect(s.state.players[0]!.deck).toHaveLength(2);
  });

  it("naturally resolves the reveal after evolving from Calmaramon", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT18-024", as: "calmaramon" }],
          hand: [{ card: "BT18-023", as: "lanamon" }],
          deck: [
            { card: "BT1-009" },
            { card: "BT1-033", as: "aqua" },
            { card: "BT1-010" },
            { card: "BT1-011" },
          ],
        },
      },
      { autoSelectCards: true, autoChooseOption: true },
    );
    s.state.memory = 3;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("calmaramon").permanentId,
        instanceId: s.inst("lanamon").instanceId,
        alternateRequirementIndex: 0,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("calmaramon").topCard.cardId === "BT18-023");

    expect(s.state.players[0]!.hand.some(({ instanceId }) => instanceId === s.inst("aqua").instanceId)).toBe(true);
    expect(s.state.players[0]!.deck).toHaveLength(2);
  });

  it("digivolves from Calmaramon for 0 and preserves the source stack", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT18-024", as: "calmaramon" }],
        hand: [{ card: "BT18-023", as: "lanamon" }],
      },
    });
    s.state.memory = 3;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("calmaramon").permanentId,
        instanceId: s.inst("lanamon").instanceId,
        alternateRequirementIndex: 0,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("calmaramon").topCard.cardId === "BT18-023");

    expect(s.state.memory).toBe(3);
    expect(s.perm("calmaramon").stack.at(-1)?.cardId).toBe("BT18-024");
  });

  it("returns an opposing level 3 from an evolved host's inherited attack effect", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT1-030", as: "host", under: ["BT18-023"] }] },
        1: { battleArea: [{ card: "BT1-009", as: "level3", suspended: true }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const targetId = s.perm("level3").permanentId;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => !s.state.players[1]!.battleArea.some(({ permanentId }) => permanentId === targetId));

    expect(s.state.players[1]!.hand.some(({ cardId }) => cardId === "BT1-009")).toBe(true);
  });
});
