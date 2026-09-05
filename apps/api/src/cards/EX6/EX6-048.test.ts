import { EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./EX6-048.js";

describe("EX6-048 Witchmon", () => {
  it("grants an opposing Digimon an End of Attack self-delete effect by trashing a hand card", () =>
    expect(compiled.effects?.find((entry) => entry.trigger === "OnPlay")?.actions[0]).toMatchObject({
      kind: "GrantAuraToOpponents",
      effectText: "[End of Attack] Delete this Digimon.",
      optional: true,
      abortOnDecline: true,
      cost: { kind: "trash", target: { filter: { zone: "hand", controller: "mine" } } },
    }));
  it("inherits once-per-turn attack ending by deleting another Digimon", () =>
    expect(compiled.effects?.find((entry) => entry.isInherited)).toMatchObject({
      frequency: "OncePerTurn",
      actions: [
        {
          kind: "SubTrigger",
          event: "whenOpponentAttacks",
          actions: [{ kind: "EndAttack" }],
          cost: { kind: "deleteOwn", target: { filter: { excludeSelf: true } } },
        },
      ],
    }));
  it("publicly pays a hand card to grant the opposing Digimon its end-of-attack deletion", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "EX6-048", as: "witch" }], hand: [{ card: "BT1-010", as: "cost" }] },
        1: { battleArea: [{ card: "BT1-009", as: "opponent" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    await advance(s.engine).fire(EffectTiming.OnPlay, s.perm("witch"));
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("cost").instanceId)).toBe(false);
  });
  it("publicly ends an opponent attack by deleting another own Digimon", async () => {
    const s = setupEngine(
      {
        0: {
          security: ["BT1-001"],
          battleArea: [
            { card: "BT1-009", as: "host", under: ["EX6-048"] },
            { card: "BT1-010", as: "cost" },
          ],
        },
        1: { battleArea: [{ card: "BT1-009", as: "attacker" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.turnSeat = 1;
    await s.ready();
    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.length === 1);
    expect(s.state.players[0]!.battleArea.some((perm) => perm.topCard?.instanceId === s.inst("cost").instanceId)).toBe(
      false,
    );
    expect(s.state.players[0]!.security).toHaveLength(1);
  });
});
