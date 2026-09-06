import { describe, expect, it } from "vitest";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { advance } from "../../engine/testkit/advance.js";
import { observe } from "../../engine/testkit/observe.js";
import "./ST23-02.js";

describe("ST23-02 Liollmon", () => {
  it("reduces a legal Glowing Dawn digivolution from cost 2 to cost 1 during your turn", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "ST23-02", as: "liollmon" }],
        hand: [{ card: "ST23-03", as: "cougarmon" }],
        deck: ["BT1-001"],
      },
    });
    s.state.memory = 1;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("liollmon").permanentId,
        instanceId: s.inst("cougarmon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("liollmon").topCard?.cardId === "ST23-03");
    expect(s.perm("liollmon").topCard?.cardId).toBe("ST23-03");
    expect(s.state.memory).toBe(0);
  });

  it("reduces a same-controller Glowing Dawn digivolution by 1 during its turn", () => {
    const yourTurn = runtimeCompiledCard("ST23-02")?.effects.find((effect) => effect.trigger === "YourTurn");
    expect(yourTurn).toMatchObject({
      actions: [
        {
          kind: "Replacement",
          event: "wouldDigivolve",
          sourceFilter: { isSelfRef: true },
          into: { nameOrTrait: [{ match: "trait", tokens: ["Glowing Dawn"] }] },
          actions: [{ kind: "Replacement", event: "wouldDigivolve", mode: "reduceCost", amount: 1 }],
        },
      ],
    });
  });

  it("does not apply its cost reduction while this card is in the breeding area", async () => {
    const s = setupEngine(
      {
        0: {
          breeding: { card: "ST23-02", as: "liollmon" },
          hand: [{ card: "ST23-03", as: "cougarmon" }],
          deck: ["BT1-001"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 2;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("liollmon").permanentId,
        instanceId: s.inst("cougarmon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("liollmon").topCard?.cardId === "ST23-03" && s.state.memory === 0);

    expect(s.state.memory).toBe(0);
  });
  it("uses inherited Barrier to trash security and survive a battle deletion", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "ST23-03", as: "host", under: ["ST23-02"] }], security: ["BT1-001"] },
    });
    await s.ready();
    const hostId = s.perm("host").permanentId;
    expect(observe(s.engine).hasKeyword(s.perm("host"), "Barrier")).toBe(true);
    const deletion = advance(s.engine).verb.deletePermanent([hostId], "byBattle");
    await settle(() => s.events.some((event) => event.kind === "barrierPrompt"));
    expect(s.engine.applyIntent(0, { type: "respondBarrier", permanentId: hostId, accept: true })).toEqual({
      ok: true,
    });
    expect(await deletion).toBe(0);
    expect(s.state.players[0]!.battleArea.some((p) => p.permanentId === hostId)).toBe(true);
    expect(s.state.players[0]!.security).toHaveLength(0);
  });
});
