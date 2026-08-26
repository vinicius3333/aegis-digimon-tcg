import { EffectTiming, getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import { observe } from "../../engine/testkit/observe.js";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./LM-043.js";

describe("LM-043 Darkdramon", () => {
  it("de-digivolves one opponent and deletes all of their lowest-play-cost Digimon", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "LM-043", as: "darkdramon" }] },
        1: {
          battleArea: [
            { card: "BT1-041", as: "stacked", under: ["BT1-009"] },
            { card: "BT1-009", as: "lowest" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );

    await advance(s.engine).fire(EffectTiming.OnPlay, s.perm("darkdramon"));
    await settle(() => s.state.players[1]!.battleArea.length === 0);

    expect(s.state.players[1]!.battleArea).toHaveLength(0);
    expect(s.state.players[1]!.trash.filter((card) => card.cardId === "BT1-009")).toHaveLength(2);
  });

  it("de-digivolves before choosing the lowest play cost, so the reduced Digimon can be the target", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "LM-043", as: "darkdramon" }] },
        1: { battleArea: [{ card: "BT1-041", as: "only", under: ["BT1-009"] }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();

    await advance(s.engine).fire(EffectTiming.WhenDigivolving, s.perm("darkdramon"));
    await settle(() => s.state.players[1]!.battleArea.length === 0, 2000);

    // De-Digivolve leaves BT1-009 on top, and it is then the lowest play cost on the board.
    expect(s.state.players[1]!.battleArea).toHaveLength(0);
  });

  it("carries Blast Digivolve, Scapegoat and the inherited Collision", async () => {
    const s = setupEngine(
      { 0: { battleArea: [{ card: "BT1-024", as: "host", under: ["LM-043"] }] } },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    await s.ready();
    await advance(s.engine).recompute();

    expect(observe(s.engine).hasKeyword(s.perm("host"), "Collision")).toBe(true);
  });

  it("uses Scapegoat to delete another own Digimon instead of itself against an opponent's battle", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT1-009", as: "sacrifice" },
            { card: "LM-043", as: "darkdramon", suspended: true },
          ],
        },
        1: { battleArea: [{ card: "BT1-009", as: "attacker", dp: 13000 }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.turnSeat = 1;
    await s.ready();
    const sacrificePermanentId = s.perm("sacrifice").permanentId;

    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "permanent", permanentId: s.perm("darkdramon").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => !s.state.players[0]!.battleArea.some((p) => p.permanentId === sacrificePermanentId), 2000);

    expect(s.state.players[0]!.battleArea.some((p) => p.permanentId === s.perm("darkdramon").permanentId)).toBe(true);
    expect(s.state.players[0]!.battleArea.some((p) => p.permanentId === sacrificePermanentId)).toBe(false);
  });

  it("matches committed metadata and publishes fully covered compiled IR", () => {
    const definition = getCardDefinition("LM-043");
    const compiled = runtimeCompiledCard("LM-043");
    expect(definition?.nameEn).toBe("Darkdramon");
    expect(definition?.colors).toEqual(["Black", "Purple"]);
    expect(compiled).toMatchObject({ coverage: "full", residual: [] });
    expect(compiled?.effects[0]).toMatchObject({ keywords: [{ keyword: "BlastDigivolve" }] });
    expect(compiled?.effects[1]).toMatchObject({ keywords: [{ keyword: "Scapegoat" }] });
  });
});
