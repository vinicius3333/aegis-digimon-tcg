import { describe, expect, it } from "vitest";
import { observe } from "../../engine/testkit/observe.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./BT18-021.js";

describe("BT18-021 Penguinmon", () => {
  it("registers the self/Tamer multicolor digivolution reduction and inherited Jamming", async () => {
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
    expect(compiled.effects[0]).toMatchObject({
      trigger: "YourTurn",
      frequency: "OncePerTurn",
      actions: [
        {
          kind: "Replacement",
          event: "wouldDigivolve",
          sourceFilter: { controller: "mine", or: [{ isSelfRef: true }, { kind: ["Tamer"] }] },
          into: { multicolor: true, colors: ["Red", "Blue"] },
          actions: [{ kind: "Replacement", mode: "reduceCost", amount: 1 }],
        },
      ],
    });
    expect(compiled.effects[1]).toMatchObject({
      trigger: "Static",
      isInherited: true,
      keywords: [{ keyword: "Jamming" }],
    });
    const s = setupEngine({ 0: { battleArea: [{ card: "BT1-030", as: "host", under: ["BT18-021"] }] } });
    await s.ready();
    expect(observe(s.engine).hasKeyword(s.perm("host"), "Jamming")).toBe(true);
  });

  it("reduces this Digimon's evolution into a multicolor blue/red Digimon by 1", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT18-021", as: "penguinmon" }],
        hand: [{ card: "BT18-022", as: "kumamon" }],
      },
    });
    await s.ready();
    s.state.memory = 5;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("penguinmon").permanentId,
        instanceId: s.inst("kumamon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("penguinmon").topCard.cardId === "BT18-022");

    expect(s.state.memory).toBe(3);
  });

  it("reduces only the first qualifying Tamer evolution each turn", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "BT18-021", as: "penguinmon" },
          { card: "BT18-089", as: "tommyA" },
          { card: "BT18-089", as: "tommyB" },
        ],
        hand: [
          { card: "BT18-022", as: "kumamonA" },
          { card: "BT18-022", as: "kumamonB" },
        ],
      },
    });
    await s.ready();
    s.state.memory = 5;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("tommyA").permanentId,
        instanceId: s.inst("kumamonA").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("tommyA").topCard.cardId === "BT18-022");
    expect(s.state.memory).toBe(4);

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("tommyB").permanentId,
        instanceId: s.inst("kumamonB").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("tommyB").topCard.cardId === "BT18-022");
    expect(s.state.memory).toBe(2);
  });

  it("does not reduce its evolution cost while Penguinmon is in the breeding area", async () => {
    const s = setupEngine({
      0: {
        breeding: { card: "BT18-021", as: "penguinmon" },
        hand: [{ card: "BT18-022", as: "kumamon" }],
      },
    });
    await s.ready();
    s.state.memory = 5;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("penguinmon").permanentId,
        instanceId: s.inst("kumamon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("penguinmon").topCard.cardId === "BT18-022");

    expect(s.state.memory).toBe(2);
  });
});
