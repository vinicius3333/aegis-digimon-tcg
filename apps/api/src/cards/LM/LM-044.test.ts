import { getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import { observe } from "../../engine/testkit/observe.js";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./LM-044.js";

describe("LM-044 Ghoulmon", () => {
  it("trashes one opposing hand card, then deletes a level 6 or lower Digimon", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "LM-044", as: "ghoulmon" }] },
        1: {
          hand: ["BT1-009", "BT1-009", "BT1-009", "BT1-009", "BT1-009"],
          battleArea: [{ card: "BT1-060", as: "target" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const targetId = s.perm("target").permanentId;

    await advance(s.engine).verb.deletePermanent([s.perm("ghoulmon").permanentId]);
    await settle(
      () =>
        s.state.players[1]!.hand.length === 4 &&
        !s.state.players[1]!.battleArea.some((p) => p.permanentId === targetId),
    );

    expect(s.state.players[1]!.hand).toHaveLength(4);
    expect(s.state.players[1]!.battleArea.some((p) => p.permanentId === targetId)).toBe(false);
  });

  it("skips the discard but still deletes when the opponent already holds four cards", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "LM-044", as: "ghoulmon" }] },
        1: {
          hand: ["BT1-009", "BT1-009", "BT1-009", "BT1-009"],
          battleArea: [{ card: "BT1-060", as: "target" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const targetId = s.perm("target").permanentId;
    await s.ready();

    await advance(s.engine).verb.deletePermanent([s.perm("ghoulmon").permanentId], "byEffect");
    await settle(() => !s.state.players[1]!.battleArea.some((p) => p.permanentId === targetId), 2000);

    // The discard needs 5 or more cards; the deletion only needs 4 or fewer, and both
    // sentences are evaluated on their own.
    expect(s.state.players[1]!.hand).toHaveLength(4);
    expect(s.state.players[1]!.battleArea.some((p) => p.permanentId === targetId)).toBe(false);
  });

  it("discards down to five and then deletes nothing", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "LM-044", as: "ghoulmon" }] },
        1: {
          hand: ["BT1-009", "BT1-009", "BT1-009", "BT1-009", "BT1-009", "BT1-009"],
          battleArea: [{ card: "BT1-060", as: "target" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const targetId = s.perm("target").permanentId;
    await s.ready();

    await advance(s.engine).verb.deletePermanent([s.perm("ghoulmon").permanentId], "byEffect");
    await settle(() => s.state.players[1]!.hand.length === 5, 2000);

    expect(s.state.players[1]!.hand).toHaveLength(5);
    expect(s.state.players[1]!.battleArea.some((p) => p.permanentId === targetId)).toBe(true);
  });

  it("carries Blocker and Retaliation", async () => {
    const s = setupEngine(
      { 0: { battleArea: [{ card: "LM-044", as: "ghoulmon" }] } },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    await s.ready();
    await advance(s.engine).recompute();

    expect(observe(s.engine).hasKeyword(s.perm("ghoulmon"), "Blocker")).toBe(true);
    expect(observe(s.engine).hasKeyword(s.perm("ghoulmon"), "Retaliation")).toBe(true);
  });

  it("matches committed metadata and publishes fully covered compiled IR", () => {
    const definition = getCardDefinition("LM-044");
    const compiled = runtimeCompiledCard("LM-044");
    expect(definition?.nameEn).toBe("Ghoulmon");
    expect(definition?.colors).toEqual(["Purple"]);
    expect(definition?.dp).toBe(11000);
    expect(compiled).toMatchObject({ coverage: "full", residual: [] });
    expect(compiled?.effects[0]).toMatchObject({ keywords: [{ keyword: "BlastDigivolve" }] });
  });
});
