import { describe, expect, it, vi } from "vitest";
import { CardKind, EffectTiming } from "@aegis/shared";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type { EffectContext } from "../../engine/effects/EffectContext.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import module from "./BT26-098.js";
import "../index.js";

describe("BT26-098 Queen of Thorns", () => {
  it("places both named cards face down under Lalamon before free Rosemon digivolution", async () => {
    const lalamon = {
      permanentId: "lalamon",
      inBreeding: false,
      topCard: { instanceId: "lalamon-card", cardId: "BT26-001" },
    };
    const source = {
      ownerSeat: 0,
      definition: { nameEn: "Queen of Thorns" },
      permanent: () => ({ permanentId: "option" }),
      isOnBattleArea: () => true,
    } as unknown as CardSource;
    const placeUnder = vi.fn<(...args: any[]) => any>(async (_id: string, ids: string[]) =>
      ids.map((instanceId) => ({ instanceId })),
    );
    const digivolveFromInstance = vi.fn<(...args: any[]) => any>(async () => undefined);
    const cards = {
      sunflowmon: { instanceId: "sunflowmon", cardId: "BT26-050" },
      lilamon: { instanceId: "lilamon", cardId: "BT26-051" },
      rosemon: { instanceId: "rosemon", cardId: "BT26-052" },
    };
    const ctx = {
      source,
      game: {
        player: () => ({
          trash: [cards.sunflowmon, cards.lilamon],
          hand: [cards.rosemon],
          battleArea: [lalamon],
        }),
        definitionOf: (card: { cardId: string }) => {
          const nameById: Record<string, string> = {
            "BT26-001": "Lalamon",
            "BT26-050": "Sunflowmon",
            "BT26-051": "Lilamon",
            "BT26-052": "Rosemon",
          };
          return {
            cardId: card.cardId,
            nameEn: nameById[card.cardId],
            kinds: [CardKind.Digimon],
          };
        },
        permanentById: (id: string) => (id === "lalamon" ? lalamon : undefined),
      },
      ask: {
        chooseTargets: vi.fn<(...args: any[]) => any>(async ({ candidates }: { candidates: string[] }) => candidates.slice(0, 1)),
        selectCards: vi.fn<(...args: any[]) => any>(async (_ctx: unknown, { candidates }: { candidates: string[] }) => candidates.slice(0, 1)),
        orderCards: vi.fn<(...args: any[]) => any>(async (_ctx: unknown, { candidates }: { candidates: string[] }) =>
          candidates,
        ),
      },
      fx: { placeUnder, digivolveFromInstance },
    } as unknown as EffectContext;

    const effect = module.effectsForTiming(EffectTiming.OnUseOption, source)[0]!;
    await effect.resolve(ctx);

    expect(placeUnder).toHaveBeenCalledWith("lalamon", ["lilamon", "sunflowmon"]);
    expect(digivolveFromInstance).toHaveBeenCalledWith("lalamon", "rosemon", {
      payCost: false,
      ignoreRequirements: true,
    });
  });

  it("requires the bottom card under a Tamer to be face down for the use discount", () => {
    const source = {
      ownerSeat: 0,
      definition: { nameEn: "Queen of Thorns" },
      isOnBattleArea: () => true,
    } as unknown as CardSource;
    const effect = module.effectsForTiming(EffectTiming.BeforePayCost, source)[0]!;
    const definitionOf = () => ({ kinds: [CardKind.Tamer] });
    const context = (stack: Array<{ faceUp: boolean }>) =>
      ({
        source,
        game: { player: () => ({ battleArea: [{ topCard: { cardId: "BT26-010" }, stack }] }), definitionOf },
      }) as unknown as EffectContext;

    expect(effect.canActivate(context([{ faceUp: true }, { faceUp: false }]))).toBe(false);
    expect(effect.canActivate(context([{ faceUp: false }, { faceUp: true }]))).toBe(true);
  });

  it("trashes the exact bottom face-down Tamer card to pay 3 instead of 5", async () => {
    const accepted = setupEngine(
      {
        0: {
          hand: [{ card: "BT26-098", as: "option" }],
          battleArea: [
            { card: "BT26-036", as: "greenSource" },
            {
              card: "BT26-091",
              as: "tamer",
              under: [
                { card: "AD1-001", faceUp: false, as: "bottomCost" },
                { card: "AD1-002", faceUp: false, as: "upperCard" },
              ],
            },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await accepted.ready();
    accepted.state.memory = 5;
    const bottomCostId = accepted.inst("bottomCost").instanceId;
    const upperCardId = accepted.inst("upperCard").instanceId;

    expect(
      accepted.engine.applyIntent(0, { type: "playCard", instanceId: accepted.inst("option").instanceId }),
    ).toEqual({ ok: true });
    await settle(() => accepted.state.players[0]!.trash.some((card) => card.cardId === "BT26-098"));

    expect(accepted.state.memory).toBe(2);
    expect(accepted.state.players[0]!.trash.map((card) => card.instanceId)).toContain(bottomCostId);
    expect(accepted.perm("tamer").stack.map((card) => card.instanceId)).toEqual([upperCardId]);

    const declined = setupEngine(
      {
        0: {
          hand: [{ card: "BT26-098", as: "option" }],
          battleArea: [
            { card: "BT26-036" },
            { card: "BT26-091", as: "tamer", under: [{ card: "AD1-001", faceUp: false }] },
          ],
        },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    await declined.ready();
    declined.state.memory = 5;
    expect(declined.engine.applyIntent(0, { type: "playCard", instanceId: declined.inst("option").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => declined.state.players[0]!.trash.some((card) => card.cardId === "BT26-098"));

    expect(declined.state.memory).toBe(0);
    expect(declined.perm("tamer").stack).toHaveLength(1);
  });

  it("places both exact materials face up in chosen stack order and digivolves for free", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [
            { card: "BT26-098", as: "option" },
            { card: "BT5-057", as: "rosemon" },
          ],
          trash: [
            { card: "BT26-039", as: "sunflowmon" },
            { card: "BT26-044", as: "lilamon" },
          ],
          battleArea: [{ card: "BT26-036", as: "lalamon" }],
        },
      },
      { autoSelectCards: true },
    );
    await s.ready();
    s.state.memory = 5;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({ ok: true });
    await settle(() => s.perm("lalamon").topCard?.instanceId === s.inst("rosemon").instanceId);

    expect(s.perm("lalamon").topCard!.cardId).toBe("BT5-057");
    expect(s.perm("lalamon").stack.slice(0, 2).map((card) => card.instanceId)).toEqual([
      s.inst("sunflowmon").instanceId,
      s.inst("lilamon").instanceId,
    ]);
    expect(s.perm("lalamon").stack.slice(0, 2).every((card) => card.faceUp)).toBe(true);
    expect(s.state.memory).toBe(0);
  });

  it("plays an eligible named card from Security and always returns itself to hand", async () => {
    const s = setupEngine(
      {
        0: {
          trash: [{ card: "BT26-036", as: "lalamon" }],
          security: [{ card: "BT26-098", as: "optionSecurity" }],
        },
        1: { battleArea: [{ card: "AD1-003", as: "attacker" }] },
      },
      { autoSelectCards: true },
    );
    s.state.turnSeat = 1;
    const optionId = s.inst("optionSecurity").instanceId;

    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.hand.some((card) => card.instanceId === optionId));

    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.cardId === "BT26-036")).toBe(true);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toContain(optionId);
  });
});
