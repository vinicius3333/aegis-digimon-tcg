import { describe, expect, it } from "vitest";
import { digiXrosRequirementFor, getCardDefinition, getCompiledCard } from "@aegis/shared";
import { registeredCompiledCards } from "../../engine/effects/interpreter/compiledCards.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "../../cards/index.js";

describe("AD1-006 Shoutmon X7", () => {
  it("bottom-decks an opposing Digimon within its DP ceiling when played", async () => {
    const s = setupEngine(
      {
        0: { hand: [{ card: "AD1-006", as: "x7" }] },
        1: {
          battleArea: [
            { card: "BT1-010", as: "target", dp: 13000 },
            { card: "BT1-010", as: "over-ceiling", dp: 13001 },
          ],
        },
      },
      { autoSelectCards: true, autoAcceptOptional: true },
    );
    s.state.memory = 13;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("x7").instanceId })).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.battleArea.length === 1);

    expect(s.state.players[1]!.deck.at(-1)?.cardId).toBe("BT1-010");
    expect(s.state.players[1]!.battleArea[0]?.permanentId).toBe(s.perm("over-ceiling").permanentId);
  });

  it("publishes and uses all six exact DigiXros slots at reduction 2 each", async () => {
    expect(digiXrosRequirementFor("AD1-006")).toEqual([
      {
        materials: ["OmniShoutmon", "ZeigGreymon", "Ballistamon", "Dorulumon", "Starmons", "Sparrowmon"].map(
          (name) => ({ names: [name] }),
        ),
        count: 2,
      },
    ]);

    const s = setupEngine(
      {
        0: {
          hand: [
            { card: "AD1-006", as: "x7" },
            { card: "BT11-015", as: "omniShoutmon" },
            { card: "BT11-031", as: "zeigGreymon" },
            { card: "BT10-049", as: "ballistamon" },
            { card: "BT10-034", as: "dorulumon" },
            { card: "BT10-029", as: "starmons" },
            { card: "BT10-060", as: "sparrowmon" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 1;
    const materialInstanceIds = [
      "omniShoutmon",
      "zeigGreymon",
      "ballistamon",
      "dorulumon",
      "starmons",
      "sparrowmon",
    ].map((alias) => s.inst(alias).instanceId);

    expect(
      s.engine.applyIntent(0, {
        type: "playCard",
        instanceId: s.inst("x7").instanceId,
        digiXros: { materialInstanceIds },
      }),
    ).toEqual({ ok: true });
    await settle(() =>
      s.state.players[0]!.battleArea.some(
        (permanent) => permanent.topCard?.cardId === "AD1-006" && permanent.stack.length === 6,
      ),
    );

    expect(s.state.memory).toBe(0);
    expect(
      s.state.players[0]!.battleArea.find((permanent) => permanent.topCard?.cardId === "AD1-006")?.stack,
    ).toHaveLength(6);
  });

  it("allows level-6 Xros Heart and Blue Flare digivolution routes for cost 2", async () => {
    for (const baseCardId of ["BT10-015", "BT19-026"]) {
      const s = setupEngine({
        0: { battleArea: [{ card: baseCardId, as: "base" }], hand: [{ card: "AD1-006", as: "x7" }], deck: ["BT1-001"] },
      });
      s.state.memory = 2;

      expect(
        s.engine.applyIntent(0, {
          type: "digivolve",
          permanentId: s.perm("base").permanentId,
          instanceId: s.inst("x7").instanceId,
        }),
      ).toEqual({ ok: true });
      await settle(() => s.perm("base").topCard?.cardId === "AD1-006");

      expect(s.perm("base").topCard?.cardId).toBe("AD1-006");
      expect(s.state.memory).toBe(0);
    }
  });

  it("bottom-decks at the DP boundary and unsuspends itself on its first attack only", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "AD1-006", dp: 13000, as: "x7" }] },
        1: {
          battleArea: [
            { card: "BT1-010", dp: 13000, as: "eligible" },
            { card: "BT1-010", dp: 14000, as: "tooLarge" },
          ],
          security: ["BT1-001"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const eligibleInstanceId = s.perm("eligible").topCard!.instanceId;

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("x7").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.battleArea.length === 1 && s.perm("x7").isSuspended === false);

    expect(s.state.players[1]!.deck.at(-1)?.instanceId).toBe(eligibleInstanceId);
    expect(
      s.state.players[1]!.battleArea.some((permanent) => permanent.permanentId === s.perm("tooLarge").permanentId),
    ).toBe(true);
    expect(s.perm("x7").isSuspended).toBe(false);
  });

  it("with no Tamer, may play a qualifying source card and rejects non-matching sources, per Q6059/Q6063", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            {
              card: "AD1-006",
              dp: 13000,
              suspended: true,
              as: "x7",
              under: [
                { card: "BT10-009", as: "xrosHeart" },
                { card: "BT1-001", as: "invalid" },
              ],
            },
          ],
        },
        1: { battleArea: [{ card: "BT1-010", dp: 14000, as: "attacker" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.turnSeat = 1;
    const x7Id = s.perm("x7").permanentId;

    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "permanent", permanentId: x7Id },
      }),
    ).toEqual({ ok: true });
    await settle(
      () => s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.cardId === "BT10-009"),
      5000,
    );
    await settle();

    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.permanentId === x7Id)).toBe(false);
    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.cardId === "BT10-009")).toBe(true);
    expect(s.state.players[0]!.trash.some((card) => card.instanceId === s.inst("invalid").instanceId)).toBe(true);
  });

  it("with one source and a Tamer, must place it and then cannot play it, per Q6062", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "AD1-006", dp: 13000, suspended: true, as: "x7", under: [{ card: "BT10-009", as: "onlySource" }] },
            { card: "BT10-087", as: "tamer" },
          ],
        },
        1: { battleArea: [{ card: "BT1-010", dp: 14000, as: "attacker" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.turnSeat = 1;
    const x7Id = s.perm("x7").permanentId;

    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "permanent", permanentId: x7Id },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("tamer").stack.some((card) => card.instanceId === s.inst("onlySource").instanceId), 5000);
    await settle();

    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.permanentId === x7Id)).toBe(false);
    expect(s.perm("tamer").stack.some((card) => card.instanceId === s.inst("onlySource").instanceId)).toBe(true);
    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.cardId === "BT10-009")).toBe(false);
  });

  it("uses newly placed cards and itself as DigiXros materials for the played card, per Q6060/Q6061", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [
            {
              card: "AD1-006",
              dp: 13000,
              suspended: true,
              as: "x7",
              under: [
                { card: "BT10-009", as: "x4" },
                { card: "BT10-049", as: "ballistamon" },
                { card: "BT10-034", as: "dorulumon" },
                { card: "BT10-029", as: "starmons" },
                { card: "BT10-049", as: "extraBallistamon" },
              ],
            },
            { card: "BT10-087", as: "tamer" },
          ],
        },
        1: { battleArea: [{ card: "BT1-010", dp: 14000, as: "attacker" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferred },
    );
    preferred.push(
      s.inst("ballistamon").instanceId,
      s.inst("dorulumon").instanceId,
      s.inst("starmons").instanceId,
      s.inst("extraBallistamon").instanceId,
    );
    s.state.turnSeat = 1;
    const x7Id = s.perm("x7").permanentId;
    const x7InstanceId = s.perm("x7").topCard!.instanceId;
    preferred.unshift(x7InstanceId);

    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "permanent", permanentId: x7Id },
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        s.state.players[0]!.battleArea.some(
          (permanent) => permanent.topCard?.cardId === "BT10-009" && permanent.stack.length === 4,
        ),
      5000,
    );

    const played = s.state.players[0]!.battleArea.find((permanent) => permanent.topCard?.cardId === "BT10-009")!;
    expect(played.stack.map((card) => card.instanceId)).toEqual(
      expect.arrayContaining([
        x7InstanceId,
        s.inst("ballistamon").instanceId,
        s.inst("dorulumon").instanceId,
        s.inst("starmons").instanceId,
      ]),
    );
    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.permanentId === x7Id)).toBe(false);
    expect(s.perm("tamer").stack).toHaveLength(1);
    expect(s.perm("tamer").stack[0]?.cardId).toBe("BT10-049");
  });

  it("may decline the leave effect and lets the whole stack go to trash", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "AD1-006", dp: 13000, suspended: true, as: "x7", under: [{ card: "BT10-009", as: "source" }] },
          ],
        },
        1: { battleArea: [{ card: "BT1-010", dp: 14000, as: "attacker" }] },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    s.state.turnSeat = 1;
    const x7Id = s.perm("x7").permanentId;

    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "permanent", permanentId: x7Id },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.every((permanent) => permanent.permanentId !== x7Id), 5000);

    expect(s.state.players[0]!.battleArea).toHaveLength(0);
    expect(s.state.players[0]!.trash.some((card) => card.instanceId === s.inst("source").instanceId)).toBe(true);
  });

  it("rejects play when memory is below the printed cost", () => {
    const s = setupEngine({ 0: { hand: [{ card: "AD1-006", as: "x7" }] } });
    s.state.memory = -10;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("x7").instanceId })).toEqual({
      ok: false,
      reason: "insufficient-memory",
    });
  });

  it("matches committed metadata and publishes fully covered compiled IR", () => {
    const definition = getCardDefinition("AD1-006");
    const compiled = registeredCompiledCards.get("AD1-006") ?? getCompiledCard("AD1-006");
    expect(definition).toBeDefined();
    expect(definition?.cardId).toBe("AD1-006");
    expect(definition?.nameEn).toBe("Shoutmon X7");
    expect(compiled).toMatchObject({ coverage: "full", residual: [] });
    expect(compiled?.effects.length).toBeGreaterThan(0);
    expect(compiled?.effects).toEqual(expect.any(Array));
  });
});
