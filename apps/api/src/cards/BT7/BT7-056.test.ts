import { describe, expect, it } from "vitest";
import type { PlayerState } from "@aegis/shared";
import { drainMicrotasks, setupEngine, settle, type CardSpec, type EngineSetup } from "../../engine/testkit/harness.js";
import "./BT7-064.js";
import "../BT9/BT9-109.js";
import "../BT18/BT18-065.js";
import "./BT7-056.js";

describe("BT7-056 Dorumon", () => {
  it("adds an X-Antibody card and Kota Domoto from the revealed cards", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "BT7-056", as: "source" }],
          deck: [{ card: "BT7-062", as: "xAntibody" }, { card: "BT7-090", as: "kota" }, "BT7-057"],
        },
      },
      { autoSelectCards: true },
    );
    const player = s.state.players[0] as PlayerState;
    const added = [s.inst("xAntibody").instanceId, s.inst("kota").instanceId];
    s.state.memory = 3;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("source").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => added.every((id) => player.hand.some((c) => c.instanceId === id)));
    expect(player.deck).toHaveLength(1);
  });
});

describe("BT7-056 Dorumon — KB Q&A rulings", () => {
  async function playDorumonRevealing(deck: CardSpec[]): Promise<EngineSetup> {
    const s = setupEngine({ 0: { hand: [{ card: "BT7-056", as: "source" }], deck } }, { autoSelectCards: true });
    s.state.memory = 3;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("source").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.deck.length === 2 && s.state.players[0]!.hand.length === 1);
    return s;
  }

  it("adds the only matching card when the reveal holds just an X-Antibody card or just Kota Domoto (Q1601)", async () => {
    const onlyAntibody = await playDorumonRevealing([
      { card: "BT7-062", as: "antibody" },
      { card: "BT7-057", as: "monitamon" },
      "BT1-010",
    ]);
    expect(onlyAntibody.state.players[0]!.hand.map((card) => card.instanceId)).toEqual([
      onlyAntibody.inst("antibody").instanceId,
    ]);
    expect(
      onlyAntibody.state.players[0]!.deck.some((c) => c.instanceId === onlyAntibody.inst("monitamon").instanceId),
    ).toBe(true);

    const onlyKota = await playDorumonRevealing([{ card: "BT7-090", as: "kota" }, "BT7-057", "BT1-010"]);
    expect(onlyKota.state.players[0]!.hand.map((card) => card.instanceId)).toEqual([onlyKota.inst("kota").instanceId]);
  });

  it("does not gain memory when an effect digivolves a Digimon with Dorumon in its digivolution cards (Q1602)", async () => {
    async function attackAndDigivolveByEffect(extraHand: CardSpec[]): Promise<EngineSetup> {
      const s = setupEngine(
        {
          0: {
            battleArea: [{ card: "BT7-062", under: ["BT7-056", "BT9-109"], as: "host" }],
            hand: [{ card: "BT7-064", as: "doruGreymon" }, ...extraHand],
            deck: ["BT1-010"],
          },
          1: { security: ["BT1-010"] },
        },
        { autoAcceptOptional: true, autoSelectCards: true },
      );
      s.state.memory = 5;
      expect(
        s.engine.applyIntent(0, {
          type: "attack",
          attackerPermanentId: s.perm("host").permanentId,
          target: { kind: "player" },
        }),
      ).toEqual({ ok: true });
      await settle(() => s.perm("host").topCard?.instanceId === s.inst("doruGreymon").instanceId);
      await settle(() => s.state.players[1]!.security.length === 0);
      await drainMicrotasks();
      return s;
    }

    const digivolvedOnly = await attackAndDigivolveByEffect([]);
    expect(digivolvedOnly.perm("host").stack.some((card) => card.cardId === "BT7-056")).toBe(true);
    expect(digivolvedOnly.state.memory).toBe(2);

    // Control: DoruGreymon's [When Digivolving] places a card under the same host, which does count.
    const placedAfterDigivolving = await attackAndDigivolveByEffect([{ card: "BT7-062", as: "placedCard" }]);
    expect(placedAfterDigivolving.perm("host").stack[0]?.instanceId).toBe(
      placedAfterDigivolving.inst("placedCard").instanceId,
    );
    expect(placedAfterDigivolving.state.memory).toBe(3);
  });

  it("gains only 1 memory when one effect places 2 cards under its host at the same time (Q1603)", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT7-056", as: "host" }],
          hand: [{ card: "BT18-065", as: "snatchmon" }],
          trash: [
            { card: "BT11-061", as: "firstVemmon" },
            { card: "BT18-060", as: "secondVemmon" },
          ],
          deck: ["BT1-010"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 5;
    const placed = [s.inst("firstVemmon").instanceId, s.inst("secondVemmon").instanceId];

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("host").permanentId,
        instanceId: s.inst("snatchmon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => placed.every((id) => s.perm("host").stack.some((card) => card.instanceId === id)));
    await drainMicrotasks();

    expect(s.perm("host").topCard?.cardId).toBe("BT18-065");
    expect(s.state.memory).toBe(3);
  });

  it("gains 1 memory when an effect places Dorumon itself under a Digimon (Q1604)", async () => {
    async function digivolveIntoDoruGreymon(placeDorumon: boolean): Promise<EngineSetup> {
      const s = setupEngine(
        {
          0: {
            battleArea: [{ card: "BT7-062", as: "host" }],
            hand: [
              { card: "BT7-064", as: "doruGreymon" },
              { card: "BT7-056", as: "dorumon" },
            ],
            deck: ["BT1-010"],
          },
        },
        placeDorumon ? { autoAcceptOptional: true, autoSelectCards: true } : { autoDeclineOptional: true },
      );
      s.state.memory = 5;
      expect(
        s.engine.applyIntent(0, {
          type: "digivolve",
          permanentId: s.perm("host").permanentId,
          instanceId: s.inst("doruGreymon").instanceId,
        }),
      ).toEqual({ ok: true });
      await settle(() => s.perm("host").topCard?.instanceId === s.inst("doruGreymon").instanceId);
      await drainMicrotasks();
      return s;
    }

    const placed = await digivolveIntoDoruGreymon(true);
    expect(placed.perm("host").stack[0]?.instanceId).toBe(placed.inst("dorumon").instanceId);
    expect(placed.state.memory).toBe(3);

    const declined = await digivolveIntoDoruGreymon(false);
    expect(declined.state.players[0]!.hand.some((c) => c.instanceId === declined.inst("dorumon").instanceId)).toBe(
      true,
    );
    expect(declined.state.memory).toBe(2);
  });
});
