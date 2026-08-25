import { describe, expect, it } from "vitest";
import { getCardDefinition } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { assertNoLoudGap, setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./BT10-045.js";

describe("BT10-045 Kokuwamon", () => {
  it("matches its catalog and exact inherited watcher", () => {
    const d = getCardDefinition("BT10-045")!;
    expect([d.colors, d.level, d.playCost, d.dp]).toEqual([["Green"], 3, 3, 2000]);
    expect(d.evoCosts).toEqual([{ color: "Green", level: 2, memoryCost: 0 }]);
    expect([d.forms, d.attributes, d.types]).toEqual([["Rookie"], ["Data"], ["Machine"]]);
    expect(compiled).toMatchObject({ coverage: "full", residual: [] });
    expect(compiled.effects).toEqual([
      expect.objectContaining({ trigger: "YourTurn", isInherited: true, frequency: "OncePerTurn" }),
    ]);
  });

  it("gains 1 memory from its host's real battle deletion", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT10-054", as: "host", under: ["BT10-045"] }] },
      1: { battleArea: [{ card: "BT10-043", as: "target", suspended: true }] },
    });
    await s.ready();
    s.state.memory = 0;
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "permanent", permanentId: s.perm("target").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.battleArea.length === 0 && s.state.memory === 1);
    expect(s.state.memory).toBe(1);
    assertNoLoudGap(s);
  });

  it("gains 1 memory once per turn when its host deletes an opponent in battle", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT10-054", as: "host", under: ["BT10-045"] }] } });
    s.state.memory = 0;
    await advance(s.engine).fireSubTrigger("whenDeletesInBattle", { attackerPermanentId: s.perm("host").permanentId });
    await advance(s.engine).fireSubTrigger("whenDeletesInBattle", { attackerPermanentId: s.perm("host").permanentId });
    expect(s.state.memory).toBe(1);
  });

  it("does not gain memory when a different Digimon wins the battle", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "BT10-054", as: "host", under: ["BT10-045"] },
          { card: "BT10-052", as: "otherWinner" },
        ],
      },
    });
    s.state.memory = 0;

    await advance(s.engine).fireSubTrigger("whenDeletesInBattle", {
      attackerPermanentId: s.perm("otherWinner").permanentId,
    });
    expect(s.state.memory).toBe(0);

    await advance(s.engine).fireSubTrigger("whenDeletesInBattle", {
      attackerPermanentId: s.perm("host").permanentId,
    });
    expect(s.state.memory).toBe(1);
  });

  it("does not gain memory during the opponent's turn", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT10-054", as: "host", under: ["BT10-045"] }] },
      1: { battleArea: ["BT10-052"] },
    });
    s.state.turnSeat = 1;
    s.state.memory = 0;

    await advance(s.engine).fireSubTrigger("whenDeletesInBattle", { attackerPermanentId: s.perm("host").permanentId });

    expect(s.state.memory).toBe(0);
  });
});
