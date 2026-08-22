import { getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import "./ST19-14.js";
import "./ST19-12.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";

describe("ST19-14 Arisa Kinosaki", () => {
  it("matches memory, Puppet/Token Rush, and Security play wording", () => {
    const card = getCardDefinition("ST19-14")!;
    expect(card.effectText).toContain("set your memory to 3");
    expect(card.effectText).toContain("gains ＜Rush＞");
    expect(card.securityEffectText).toBe("[Security] Play this card without paying the cost.");
  });

  it("sets memory to 3 at the start of turn when memory is 2", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "ST19-14", as: "arisa" }] }, 1: {} });
    s.state.memory = 2;
    s.state.phase = "Main" as never;
    void s.engine.runOneTurn();
    await settle(() => s.state.memory === 3, 100);
    expect(s.state.memory).toBe(3);
  });

  it("suspends to grant Rush to a Familiar Token played by an effect", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "ST19-14", as: "arisa" },
            { card: "ST19-10", as: "host" },
          ],
          hand: [{ card: "ST19-12", as: "cendrill" }],
        },
        1: {},
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    s.state.memory = 5;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("host").permanentId,
        instanceId: s.inst("cendrill").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() =>
      s.state.players[0]!.battleArea.some(
        (permanent) =>
          permanent.topCard.cardId === "TOKEN-Familiar-Token" && observe(s.engine).hasKeyword(permanent, "Rush"),
      ),
    );
    const token = s.state.players[0]!.battleArea.find(
      (permanent) => permanent.topCard.cardId === "TOKEN-Familiar-Token",
    );
    expect(token).toBeDefined();
    expect(observe(s.engine).hasKeyword(s.perm("arisa"), "Rush")).toBe(false);
    expect(s.perm("arisa").isSuspended).toBe(true);
  });

  it("does not trigger when a Puppet Digimon is played normally", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "ST19-14", as: "arisa" }], hand: [{ card: "ST19-07", as: "puppet" }] },
        1: {},
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 20;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("puppet").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.cardId === "ST19-07"));
    const puppet = s.state.players[0]!.battleArea.find((permanent) => permanent.topCard.cardId === "ST19-07");
    expect(puppet).toBeDefined();
    expect(observe(s.engine).hasKeyword(puppet!, "Rush")).toBe(false);
    expect(s.perm("arisa").isSuspended).toBe(false);
  });
});
