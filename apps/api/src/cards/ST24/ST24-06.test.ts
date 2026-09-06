import { describe, expect, it } from "vitest";
import { getCompiledCard } from "@aegis/shared";
import { registeredCompiledCards } from "../../engine/effects/interpreter/compiledCards.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { advance } from "../../engine/testkit/advance.js";
import "../index.js";

describe("ST24-06 RizeGreymon", () => {
  it("shares its once-per-turn DP reduction and exact two-card face-down Tamer cost across three triggers", () => {
    const compiled = registeredCompiledCards.get("ST24-06") ?? getCompiledCard("ST24-06")!;
    for (const trigger of ["OnPlay", "WhenDigivolving", "WhenAttacking"]) {
      const effect = compiled.effects.find((entry) => entry.trigger === trigger);
      expect(effect).toMatchObject({
        frequency: "OncePerTurn",
        sharedUseKey: "ir-shared-0",
        actions: [
          { kind: "ModifyDP", amount: -5000 },
          {
            kind: "Modal",
            optional: true,
            cost: {
              kind: "trash",
              target: {
                count: 2,
                filter: {
                  zone: "digivolutionCards",
                  faceDown: true,
                  position: "bottom",
                  hostFilter: { kind: ["Tamer"] },
                },
              },
            },
            options: [
              [
                {
                  kind: "PlayWithoutCost",
                  target: { filter: { kind: ["Digimon", "Tamer"], playCostLte: 5 } },
                },
              ],
              [
                {
                  kind: "UseOptionWithoutCost",
                  filter: { kind: ["Option"], playCostLte: 5 },
                },
              ],
            ],
          },
        ],
      });
    }
    const inherited = compiled.effects.find((entry) => entry.isInherited);
    expect(inherited).toMatchObject({
      frequency: "OncePerTurn",
      actions: [
        {
          kind: "Replacement",
          cost: {
            kind: "trash",
            target: {
              count: 1,
              filter: {
                zone: "digivolutionCards",
                faceDown: true,
                position: "bottom",
                hostFilter: { kind: ["Tamer"] },
              },
            },
          },
        },
      ],
    });
  });

  it("uses an eligible DATA SQUAD Option after paying two Tamer-stack cards", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            {
              card: "ST24-13",
              as: "firstTamer",
              under: [{ card: "BT1-001", as: "firstCost", faceUp: false }],
            },
            {
              card: "ST24-14",
              as: "secondTamer",
              under: [{ card: "BT1-002", as: "secondCost", faceUp: false }],
            },
          ],
          hand: [
            { card: "ST24-06", as: "rizeGreymon" },
            { card: "ST24-07", as: "option" },
          ],
        },
        1: { battleArea: [{ card: "BT1-009", as: "opponent" }] },
      },
      {
        autoAcceptOptional: true,
        autoSelectCards: true,
        autoChooseOption: true,
        preferOptionIndex: 1,
      },
    );
    s.state.memory = 10;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("rizeGreymon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.trash.some((card) => card.instanceId === s.inst("option").instanceId));

    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toEqual(
      expect.arrayContaining([s.inst("firstCost").instanceId, s.inst("secondCost").instanceId]),
    );
    expect(
      s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.instanceId === s.inst("option").instanceId),
    ).toBe(false);
  });

  it("prevents a legal host from leaving by paying one bottom face-down Tamer card", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "ST24-07", as: "host", under: [{ card: "ST24-06" }] },
            { card: "ST24-13", as: "tamer", under: [{ card: "BT1-001", as: "under", faceUp: false }] },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    const hostId = s.perm("host").permanentId;
    expect(await advance(s.engine).verb.deletePermanent([hostId])).toBe(0);
    expect(s.state.players[0]!.battleArea.some((p) => p.permanentId === hostId)).toBe(true);
    expect(s.state.players[0]!.trash.some((c) => c.instanceId === s.inst("under").instanceId)).toBe(true);
  });

  it("allows the host to leave when the inherited replacement cost cannot be paid", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "ST24-07", as: "host", under: [{ card: "ST24-06" }] }] } });
    await s.ready();
    const hostId = s.perm("host").permanentId;
    expect(await advance(s.engine).verb.deletePermanent([hostId])).toBe(1);
    expect(s.state.players[0]!.battleArea.some((p) => p.permanentId === hostId)).toBe(false);
  });
});
