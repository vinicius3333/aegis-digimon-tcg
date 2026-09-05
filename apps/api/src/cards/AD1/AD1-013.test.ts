import { describe, expect, it } from "vitest";
import { getCardDefinition, getCompiledCard } from "@aegis/shared";
import { registeredCompiledCards } from "../../engine/effects/interpreter/compiledCards.js";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "../../cards/index.js";

describe("AD1-013 ZeigGreymon", () => {
  it("matches committed metadata and publishes fully covered compiled IR", () => {
    const definition = getCardDefinition("AD1-013");
    const compiled = registeredCompiledCards.get("AD1-013") ?? getCompiledCard("AD1-013");
    expect(definition).toBeDefined();
    expect(definition?.cardId).toBe("AD1-013");
    expect(definition?.nameEn).toBe("ZeigGreymon");
    expect(compiled).toMatchObject({ coverage: "full", residual: [] });
    expect(compiled?.effects.length).toBeGreaterThan(0);
    expect(compiled?.effects).toEqual(expect.any(Array));
  });

  it("deletes the opponent's Digimon with the fewest digivolution cards on play", async () => {
    const s = setupEngine(
      {
        0: { hand: [{ card: "AD1-013", as: "zeig" }] },
        1: {
          battleArea: [
            { card: "BT1-010", as: "no-sources" },
            { card: "AD1-001", as: "with-source", under: ["BT1-010"] },
          ],
        },
      },
      { autoSelectCards: true, autoAcceptOptional: true },
    );
    s.state.memory = 11;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("zeig").instanceId })).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.battleArea.length === 1);
    expect(s.state.players[1]!.battleArea[0]?.permanentId).toBe(s.perm("with-source").permanentId);
  });

  it("uses the Blue Flare alternate level-5 evolution route for cost 3 and deletes on evolution", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT10-024", as: "base" }], hand: [{ card: "AD1-013", as: "zeig" }] },
        1: {
          battleArea: [
            { card: "BT1-010", as: "no-sources" },
            { card: "AD1-001", as: "with-source", under: ["BT1-010"] },
          ],
        },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 5;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("zeig").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.battleArea.length === 1);

    expect(s.state.memory).toBe(2);
    expect(s.state.players[1]!.battleArea[0]?.permanentId).toBe(s.perm("with-source").permanentId);
  });

  it("plays an eligible Blue Flare source when it would leave, then still leaves", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "AD1-013", as: "zeig", under: [{ card: "BT10-024", as: "source" }] }] },
        1: { battleArea: [{ card: "BT1-010", as: "red-source" }], hand: [{ card: "ST1-16", as: "gaia-force" }] },
      },
      { autoSelectCards: true, autoAcceptOptional: true },
    );
    s.state.turnSeat = 1;
    s.state.memory = 8;
    await s.ready();

    expect(s.engine.applyIntent(1, { type: "playCard", instanceId: s.inst("gaia-force").instanceId })).toEqual({
      ok: true,
    });
    await settle(
      () => s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.cardId === "BT10-024"),
      5000,
    );
    await settle();

    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.cardId === "AD1-013")).toBe(false);
    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.cardId === "BT10-024")).toBe(true);
  });

  it("scopes the replacement play to this ZeigGreymon's own stack and does not add DigiXros materials", () => {
    const compiled = registeredCompiledCards.get("AD1-013") ?? getCompiledCard("AD1-013");
    if (compiled === undefined) throw new Error("AD1-013 must publish compiled IR");
    const replacement = compiled.effects.find((effect) => effect.trigger === "AllTurns" && effect.actions[0]?.kind === "Replacement");
    const play = replacement?.actions[0]?.kind === "Replacement" ? replacement.actions[0].actions[0] : undefined;
    expect(play).toMatchObject({ kind: "PlayFromZone", from: ["digivolutionCards"] });
    expect(play).not.toHaveProperty("digiXrosMaterialsFrom");
    expect(play).toMatchObject({ target: { filter: { hostFilter: { isSelfRef: true } } } });
  });

  it("does not play an eligible Blue Flare card from another permanent's stack", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "AD1-013", as: "zeig", under: ["AD1-011"] },
            { card: "AD1-006", as: "other-host", under: ["BT10-024"] },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();

    await advance(s.engine).verb.deletePermanent([s.perm("zeig").permanentId]);
    await settle();

    expect(s.state.players[0]!.battleArea).toHaveLength(1);
    expect(s.perm("other-host").topCard.cardId).toBe("AD1-006");
    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.cardId === "BT10-024")).toBe(false);
  });

  it("gives a qualifying host +1000 DP per distinct color in its digivolution cards", async () => {
    const qualified = setupEngine({
      0: { battleArea: [{ card: "AD1-006", as: "host", under: ["AD1-013", "AD1-011"] }] },
    });
    await qualified.ready();
    expect(qualified.perm("host").currentDP).toBe(16000);

    const unqualified = setupEngine({
      0: { battleArea: [{ card: "BT3-112", as: "host", under: ["AD1-013", "AD1-011"] }] },
    });
    await unqualified.ready();
    expect(unqualified.perm("host").currentDP).toBe(15000);
  });

  it("publishes Reboot and Blocker on itself", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "AD1-013", as: "zeig" }] } });
    await s.ready();
    const continuous = (s.engine as unknown as { continuous: { hasKeyword(id: string, keyword: string): boolean } })
      .continuous;
    expect(continuous.hasKeyword(s.perm("zeig").permanentId, "Reboot")).toBe(true);
    expect(continuous.hasKeyword(s.perm("zeig").permanentId, "Blocker")).toBe(true);
  });
});
