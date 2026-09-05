import { describe, expect, it } from "vitest";
import { EffectTiming } from "@aegis/shared";
import { compiled } from "./EX9-023.js";
import { advance } from "../../engine/testkit/advance.js";
import { observe } from "../../engine/testkit/observe.js";
import { settle, setupEngine } from "../../engine/testkit/harness.js";

describe("EX9-023", () => {
  it("reveals 3 for a DM and Ver.3 card, placing the latter under a DM Digimon", () =>
    expect(compiled.effects?.find((entry) => entry.trigger === "OnPlay")?.actions[0]).toMatchObject({
      kind: "RevealAdd",
      revealCount: 3,
      add: [
        { count: 1, to: "hand" },
        { count: 1, to: "placeUnder" },
      ],
      rest: "deckBottom",
    }));
  it("inherits Barrier", () =>
    expect(compiled.effects?.find((entry) => entry.isInherited)?.keywords).toContainEqual({
      keyword: "Barrier",
      raw: "＜Barrier＞",
    }));

  it("adds a revealed DM card and places a Ver.3 card face down under a DM Digimon", async () => {
    const preferInstanceIds: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "EX9-022", as: "host" },
            { card: "EX9-023", as: "source" },
          ],
          deck: ["EX9-022", "EX9-023", "BT1-009"],
        },
      },
      { autoSelectCards: true, autoOrderTriggers: true, preferInstanceIds },
    );
    preferInstanceIds.push(s.perm("host").topCard!.instanceId);

    await advance(s.engine).fire(EffectTiming.OnPlay, s.perm("source"));

    expect(s.state.players[0]!.hand.some((card) => card.cardId === "EX9-022")).toBe(true);
    expect(s.perm("host").stack.some((card) => card.cardId === "EX9-023" && !card.faceUp)).toBe(true);
    expect(s.state.players[0]!.deck).toHaveLength(1);
  });

  it("evolves legally and resolves inherited Barrier against a real attack", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "EX9-023", as: "host" }], hand: [{ card: "EX9-025", as: "evo" }], security: ["BT1-001"] }, 1: { battleArea: [{ card: "BT1-015", as: "attacker" }] } });
    s.state.memory = 5;
    await s.ready();
    const host = s.perm("host");
    expect(s.engine.applyIntent(0, { type: "digivolve", permanentId: host.permanentId, instanceId: s.inst("evo").instanceId })).toEqual({ ok: true });
    await settle(() => host.topCard.cardId === "EX9-025");
    expect(observe(s.engine).hasKeyword(host, "Barrier")).toBe(true);
    s.state.turnSeat = 1;
    expect(s.engine.applyIntent(1, { type: "attack", attackerPermanentId: s.perm("attacker").permanentId, target: { kind: "permanent", permanentId: host.permanentId } })).toEqual({ ok: true });
    await settle(() => s.events.some(({ kind }) => kind === "barrierPrompt"));
    expect(s.engine.applyIntent(0, { type: "respondBarrier", permanentId: host.permanentId, accept: true })).toEqual({ ok: true });
    await settle();
    expect(s.state.players[0]!.battleArea.some(({ permanentId }) => permanentId === host.permanentId)).toBe(true);
  });
});
