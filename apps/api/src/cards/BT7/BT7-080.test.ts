import { describe, expect, it } from "vitest";
import { CardKind, getCardDefinition, type PlayerState } from "@aegis/shared";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT7-080.js";

describe("BT7-080 Neemon", () => {
  it("plays a Tamer with an inherited effect from hand for free", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [
            { card: "BT7-080", as: "source" },
            { card: "BT7-085", as: "tamer" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const player = s.state.players[0] as PlayerState;
    s.state.memory = 3;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("source").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => player.battleArea.some((p) => p.topCard?.instanceId === s.inst("tamer").instanceId));
    expect(s.state.memory).toBe(0);
  });
});

describe("BT7-080 Neemon — KB Q&A rulings", () => {
  const deleteDigimonInBattle = async (sources: string[]) => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT7-080", as: "neemon" },
            { card: "BT7-071", as: "attacker", under: sources.map((card) => ({ card, as: `source-${card}` })) },
          ],
          trash: [{ card: "BT3-096", as: "trashedEarlier" }],
        },
        1: { battleArea: [{ card: "BT1-080", as: "defender", suspended: true }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferred },
    );
    preferred.push(...sources.map((card) => s.inst(`source-${card}`).instanceId));
    s.state.memory = 2;
    const attackerInstanceId = s.perm("attacker").topCard!.instanceId;
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "permanent", permanentId: s.perm("defender").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        s.state.players[0]!.trash.some((card) => card.instanceId === attackerInstanceId) &&
        s.state.pendingDecision === undefined,
    );
    const tamersInPlay = s.state.players[0]!.battleArea.filter(
      (permanent) => getCardDefinition(permanent.topCard!.cardId)?.kinds.includes(CardKind.Tamer) === true,
    );
    return { s, tamersInPlay };
  };

  it("plays the Tamer that was in the deleted Digimon's digivolution cards from the trash for free (Q1644)", async () => {
    const withTamerSource = await deleteDigimonInBattle(["BT7-085"]);
    expect(withTamerSource.tamersInPlay).toHaveLength(1);
    expect(withTamerSource.s.state.memory).toBe(2);
    expect(
      withTamerSource.s.state.players[0]!.battleArea.some(
        (permanent) => permanent.topCard?.instanceId === withTamerSource.s.inst("source-BT7-085").instanceId,
      ),
    ).toBe(true);

    const withoutTamerSource = await deleteDigimonInBattle(["BT7-067"]);
    expect(withoutTamerSource.tamersInPlay).toHaveLength(0);
    expect(
      withoutTamerSource.s.state.players[0]!.trash.some(
        (card) => card.instanceId === withoutTamerSource.s.inst("trashedEarlier").instanceId,
      ),
    ).toBe(true);
  });
});
