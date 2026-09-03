import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./BT15-078.js";
import "../index.js";

describe("BT15-078", () => {
  it("grants Piercing as its inherited effect", () =>
    expect(compiled.effects?.[2]).toMatchObject({
      trigger: "Static",
      isInherited: true,
      keywords: [{ keyword: "Piercing" }],
    }));
  it("gives opponent-played Digimon an On Deletion memory loss effect once per turn", () =>
    expect(compiled.effects?.[0]).toMatchObject({
      trigger: "AllTurns",
      frequency: "OncePerTurn",
      actions: [
        {
          kind: "SubTrigger",
          event: "whenPlayed",
          actions: [{ kind: "GrantAuraToOpponents", duration: "untilOpponentTurnEnd" }],
        },
      ],
    }));
  it("may play a level 4 or lower opposing Digimon from trash suspended and redirect the attack", () =>
    expect(compiled.effects?.[1]).toMatchObject({
      trigger: "WhenAttacking",
      actions: [
        { kind: "PlayWithoutCost", from: ["trash"], payCost: false, suspended: true, suppressOnPlayEffects: true },
        { kind: "RedirectAttack", optional: true, condition: { kind: "bindingExists" } },
      ],
    }));

  it("naturally plays the opposing trash Digimon, suppresses its On Play, and redirects into it", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT15-078", as: "waruSeadramon" }] },
        1: {
          trash: [{ card: "BT15-070", as: "playedDigimon" }],
          deck: ["BT15-098", "BT1-001", "BT1-001", "BT1-001"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoOrderTriggers: true },
    );
    s.state.turnSeat = 0;
    s.state.memory = 3;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("waruSeadramon").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() =>
      s.state.players[1]!.trash.some(({ instanceId }) => instanceId === s.inst("playedDigimon").instanceId),
    );

    // The redirected battle deletes the suspended level-3 target. Its On Play was
    // suppressed, so the deck was not revealed and the aura's On Deletion loss was applied.
    expect(s.state.players[1]!.battleArea).toHaveLength(0);
    expect(s.state.players[1]!.deck).toHaveLength(4);
    expect(s.state.memory).toBe(4);
  });
});
