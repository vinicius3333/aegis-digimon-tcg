import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT17-010.js";
import { compiled } from "./BT17-008.js";

describe("BT17-008", () => {
  it("registers the Calumon/Takato enter-field reaction and inherited DP threshold effect", () => {
    expect(compiled.effects).toHaveLength(2);
    expect(compiled.effects?.[0]).toMatchObject({ trigger: "YourTurn", frequency: "OncePerTurn" });
    expect(compiled.effects?.[0]).toMatchObject({
      actions: [
        {
          sourceFilter: {
            controller: "mine",
            or: [{ kind: ["Digimon"] }, { kind: ["Tamer"] }],
          },
        },
      ],
    });
    expect(compiled.effects?.[1]).toMatchObject({
      trigger: "AllTurns",
      isInherited: true,
      actions: [{ kind: "CostModifier", costType: "dpDeletion" }],
    });
  });

  it("deletes a legal low-DP target when a Takato Tamer is naturally played", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT17-008", as: "guilmon", under: ["BT17-001"] }],
          hand: [{ card: "BT17-080", as: "takato" }],
          deck: [{ card: "BT1-001", as: "drawn" }],
        },
        1: { battleArea: [{ card: "BT1-009", as: "lowTarget" }] },
      },
      { autoSelectCards: true, autoAcceptOptional: true },
    );
    s.state.memory = 10;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("takato").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[1]!.battleArea.length === 0);

    expect(s.state.players[1]!.battleArea).toHaveLength(0);
    expect(s.state.memory).toBe(7);
  });

  it("gains memory when the played-trigger deletion has no legal target", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT17-008", as: "guilmon", under: ["BT17-001"] }],
          hand: [{ card: "BT17-080", as: "takato" }],
          deck: [{ card: "BT1-001", as: "drawn" }],
        },
        1: { battleArea: [{ card: "BT1-010", as: "highTarget", dp: 4000 }] },
      },
      { autoSelectCards: true, autoAcceptOptional: true },
    );
    s.state.memory = 10;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("takato").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.memory === 8);

    expect(s.state.players[1]!.battleArea).toHaveLength(1);
    expect(s.state.memory).toBe(8);
  });

  it("raises a DP deletion threshold through a natural digivolution at memory 0", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT17-008", as: "guilmon", under: ["BT17-001"] }],
          hand: [{ card: "BT17-010", as: "growlmon" }],
          deck: [{ card: "BT1-001", as: "drawn" }],
        },
        1: { battleArea: [{ card: "BT1-010", as: "fiveKTarget" }] },
      },
      { autoSelectCards: true, autoAcceptOptional: true },
    );
    s.state.memory = 2;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("guilmon").permanentId,
        instanceId: s.inst("growlmon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.battleArea.length === 0);

    expect(s.perm("guilmon").topCard.cardId).toBe("BT17-010");
    expect(s.state.players[1]!.battleArea).toHaveLength(0);
    expect(s.state.memory).toBe(0);
  });
});
