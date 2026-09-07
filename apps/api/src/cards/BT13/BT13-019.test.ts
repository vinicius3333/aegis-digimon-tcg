import { EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine } from "../../engine/testkit/harness.js";
import { settle } from "../../engine/testkit/harness.js";
import { compiled } from "./BT13-019.js";
import "../BT10/BT10-085.js";

async function fireOnPlay(s: ReturnType<typeof setupEngine>): Promise<void> {
  await advance(s.engine).fire(EffectTiming.OnPlay, s.perm("gankoomon"));
}

describe("BT13-019 Gankoomon", () => {
  it("optionally plays an allowed Sistermon or breeding-area Royal Knight", () => {
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
    for (const effect of compiled.effects) {
      expect(effect.keywords).toContainEqual(expect.objectContaining({ keyword: "Blocker" }));
      expect(effect.actions[0]).toMatchObject({
        kind: "PlayWithoutCost",
        from: ["trash", "digivolutionCards"],
        target: {
          filter: {
            controller: "mine",
            kind: ["Digimon"],
            excludeNameOrTrait: [{ tokens: ["Omnimon", "Gankoomon"], match: "nameExact" }],
          },
        },
      });
    }
  });

  it("plays Sistermon Ciel from the trash without paying its cost", async () => {
    const s = setupEngine(
      { 0: { battleArea: [{ card: "BT13-019", as: "gankoomon" }], trash: [{ card: "BT10-085", as: "ciel" }] } },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await fireOnPlay(s);
    await settle(() => s.state.players[0]!.battleArea.length === 2);
    expect(s.state.players[0]!.trash.some((card) => card.instanceId === s.inst("ciel").instanceId)).toBe(false);
    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.cardId === "BT10-085")).toBe(true);
  });

  it("does not play an eligible Sistermon from the opponent's trash", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT13-019", as: "gankoomon" }] },
        1: { trash: [{ card: "BT10-085", as: "opponent-ciel" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );

    await fireOnPlay(s);

    expect(s.state.players[1]!.trash.some((card) => card.instanceId === s.inst("opponent-ciel").instanceId)).toBe(true);
    expect(s.state.players[0]!.battleArea).toHaveLength(1);
    expect(s.state.players[1]!.battleArea).toHaveLength(0);
  });

  it("offers the same free Sistermon play when it digivolves", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT13-016", as: "base" }],
          hand: [{ card: "BT13-019", as: "gankoomon" }],
          trash: [{ card: "BT10-085", as: "ciel" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("gankoomon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.cardId === "BT10-085"));
    // Ciel gains 1 memory when the Royal Knight digivolution finishes.
    await settle(() => s.state.memory === 6);
    expect(s.state.memory).toBe(6);
  });

  it("may decline an eligible Sistermon play", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT13-019", as: "gankoomon" }], trash: [{ card: "BT10-085", as: "ciel" }] },
    });
    const resolving = fireOnPlay(s);
    await settle(() => s.state.pendingDecision?.kind === "optional");
    const pending = s.state.pendingDecision!;
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: pending.decisionId,
        response: { kind: "optional", accept: false },
      }),
    ).toEqual({ ok: true });
    await resolving;

    expect(s.state.players[0]!.trash.some((card) => card.instanceId === s.inst("ciel").instanceId)).toBe(true);
    expect(s.state.players[0]!.battleArea).toHaveLength(1);
  });

  it("plays a Royal Knight from breeding digivolution cards, including an allowed Omnimon X name (Q2277)", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT13-019", as: "gankoomon" }],
          breeding: { card: "BT13-007", as: "drasil", under: [{ card: "BT5-111", as: "omnimonX" }] },
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const omnimonXId = s.inst("omnimonX").instanceId;
    await fireOnPlay(s);
    await settle(() =>
      s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.instanceId === omnimonXId),
    );

    expect(s.perm("drasil").stack.some((card) => card.instanceId === omnimonXId)).toBe(false);
  });

  it("does not play excluded Omnimon or Gankoomon cards", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT13-019", as: "gankoomon" }],
          breeding: {
            card: "BT13-007",
            as: "drasil",
            under: [
              { card: "BT5-086", as: "omnimon" },
              { card: "BT13-019", as: "otherGankoomon" },
            ],
          },
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await fireOnPlay(s);
    await settle();
    expect(s.perm("drasil").stack.map((card) => card.instanceId)).toEqual(
      expect.arrayContaining([s.inst("omnimon").instanceId, s.inst("otherGankoomon").instanceId]),
    );
    expect(s.state.players[0]!.battleArea).toHaveLength(1);
  });
});
