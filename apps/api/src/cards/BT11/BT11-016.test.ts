import { getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { compiled } from "./BT11-016.js";
import "../BT15/BT15-017.js";

const RED_AVIAN_5000 = "BT1-013";
const RED_AVIAN_7000 = "BT1-022";

describe("BT11-016 Phoenixmon", () => {
  it("matches the catalog and carries every complete printed contract", () => {
    expect(getCardDefinition("BT11-016")).toMatchObject({
      cardId: "BT11-016",
      nameEn: "Phoenixmon",
      colors: ["Red"],
      kinds: ["Digimon"],
      level: 6,
      playCost: 11,
      dp: 11000,
      evoCosts: [{ color: "Red", level: 5, memoryCost: 3 }],
      forms: ["Mega"],
      attributes: ["Vaccine"],
      types: ["Holy Beast"],
    });
    expect(compiled).toMatchObject({
      effects: [
        {
          trigger: "YourTurn",
          frequency: "OncePerTurn",
          actions: [{ kind: "SubTrigger", event: "whenSecurityRemoved" }],
        },
        {
          trigger: "OnDeletion",
          actions: [
            {
              kind: "PlayWithoutCost",
              target: {
                filter: {
                  colors: ["Red"],
                  dpAtMost: 3000,
                  nameOrTrait: [{ tokens: ["Avian", "Bird", "Beast", "Animal", "Sovereign"], match: "traitContains" }],
                  excludeNameOrTrait: [{ tokens: ["Sea Animal"], match: "trait" }],
                },
              },
            },
          ],
        },
      ],
      coverage: "full",
      residual: [],
    });
  });

  it("evolves from a red level 5 for 3 memory", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT11-015", as: "base" }], hand: [{ card: "BT11-016", as: "phoenix" }] },
    });
    s.state.memory = 5;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("phoenix").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard.cardId === "BT11-016");
    expect(s.state.memory).toBe(2);
  });

  it("plays the 5000-DP red Avian boundary with one red Tamer and pays no cost", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "AD1-020", as: "tamer" },
            { card: "BT11-016", dp: 0, as: "phoenixmon" },
          ],
          hand: [
            { card: RED_AVIAN_5000, as: "candidate" },
            { card: "BT6-036", as: "filler" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 4;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("filler").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.battleArea.some((p) => p.topCard?.cardId === RED_AVIAN_5000));
    expect(s.state.players[0]!.battleArea.some((p) => p.topCard?.cardId === RED_AVIAN_5000)).toBe(true);
    expect(s.state.players[0]!.hand.some((c) => c.cardId === RED_AVIAN_5000)).toBe(false);
    expect(
      s.events.some((e) => e.kind === "actionRejected" && "reason" in e && /Unsupported effect/.test(e.reason)),
    ).toBe(false);
  });

  it("does not offer a 7000-DP candidate when one red Tamer gives a 5000-DP cap", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "AD1-020", as: "tamer" },
            { card: "BT11-016", as: "phoenixmon" },
          ],
          hand: [{ card: RED_AVIAN_7000, as: "candidate" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await advance(s.engine).verb.deletePermanent([s.perm("phoenixmon").permanentId]);
    await settle(() => !s.state.players[0]!.battleArea.some((p) => p.topCard?.cardId === "BT11-016"));
    expect(s.state.players[0]!.battleArea.some((p) => p.topCard?.cardId === RED_AVIAN_7000)).toBe(false);
  });

  it("includes compound and pluralized matching traits but excludes Sea Animal (Q2059)", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "AD1-020", as: "tamer1" },
            { card: "AD1-020", as: "tamer2" },
            { card: "BT11-016", as: "phoenixmon" },
          ],
          hand: [
            { card: "BT18-022", as: "beastkin" },
            { card: "BT14-008", as: "seaAnimal" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await advance(s.engine).verb.deletePermanent([s.perm("phoenixmon").permanentId]);
    await settle(() => s.state.players[0]!.battleArea.some((p) => p.topCard?.cardId === "BT18-022"));
    expect(s.state.players[0]!.battleArea.some((p) => p.topCard?.cardId === "BT18-022")).toBe(true);
    expect(s.state.players[0]!.hand.some((c) => c.cardId === "BT14-008")).toBe(true);
  });

  it("installs one opponent-security watcher with a once-per-turn budget (Q2058)", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT11-016", as: "phoenixmon" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.turnSeat = 0;
    await s.ready();
    await advance(s.engine).recompute();
    const subscriptions = observe(s.engine).subscriptions("whenSecurityRemoved", s.perm("phoenixmon").permanentId);
    expect(subscriptions).toHaveLength(1);
    expect(subscriptions[0]?.oncePerTurnKey).toContain("BT11-016");
    expect(compiled.effects[0]?.actions[0]).toMatchObject({
      sourceFilter: { controller: "opponent" },
      actions: [{ kind: "ReactivateEffect", fromTrigger: "OnDeletion", count: 1, optional: true }],
    });
  });

  it("reactivates On Deletion after public security removal, once per turn and again next turn", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT11-016", as: "phoenixmon" },
            { card: "BT1-013", as: "secondAttacker" },
          ],
          deck: [
            "BT1-009",
            "BT1-009",
            "BT1-009",
            "BT1-009",
            "BT1-009",
            "BT1-009",
            "BT1-009",
            "BT1-009",
            "BT1-009",
            "BT1-009",
          ],
          hand: [
            { card: "BT11-007", as: "firstAvian" },
            { card: "BT11-007", as: "secondAvian" },
          ],
        },
        1: {
          deck: [
            "BT1-009",
            "BT1-009",
            "BT1-009",
            "BT1-009",
            "BT1-009",
            "BT1-009",
            "BT1-009",
            "BT1-009",
            "BT1-009",
            "BT1-009",
          ],
          security: ["BT1-009", "BT1-009", "BT1-009"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 5;

    const firstTurn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(0);
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("phoenixmon").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.security.length === 2);
    await settle(() => s.state.players[0]!.battleArea.some((p) => p.topCard?.cardId === "BT11-007"));
    await settle(() => !observe(s.engine).isAttacking());
    expect(s.state.players[1]!.security).toHaveLength(2);
    expect(s.state.players[0]!.battleArea.filter((p) => p.topCard?.cardId === "BT11-007")).toHaveLength(1);

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("secondAttacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.security.length === 1);
    await settle(() => !observe(s.engine).isAttacking());
    expect(s.state.players[1]!.security).toHaveLength(1);
    expect(s.state.players[0]!.battleArea.filter((p) => p.topCard?.cardId === "BT11-007")).toHaveLength(1);
    advance(s.engine).endMainPhaseIfOpen(0);
    await firstTurn;

    s.state.turnSeat = 1;
    s.state.memory = 3;
    await advance(s.engine).runTurn(1);

    s.state.turnSeat = 0;
    s.state.memory = 3;
    const nextTurn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(0);
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("secondAttacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => !observe(s.engine).isAttacking());
    expect(s.state.players[0]!.battleArea.filter((p) => p.topCard?.cardId === "BT11-007")).toHaveLength(2);
    advance(s.engine).endMainPhaseIfOpen(0);
    await nextTurn;
  });
});

describe("BT11-016 Phoenixmon — KB Q&A rulings", () => {
  const RED_TAMER = "BT1-085";

  async function deletePhoenixmonWith(redTamers: number, candidate: string) {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            ...Array.from({ length: redTamers }, (_, index) => ({ card: RED_TAMER, as: `tamer-${index}` })),
            { card: "BT11-016", as: "phoenixmon" },
          ],
          hand: [{ card: candidate, as: "candidate" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await advance(s.engine).verb.deletePermanent([s.perm("phoenixmon").permanentId]);
    await settle(
      () =>
        !s.state.players[0]!.battleArea.some((p) => p.topCard?.cardId === "BT11-016") &&
        s.state.pendingDecision === undefined,
    );
    return s.state.players[0]!.battleArea.some((p) => p.topCard?.cardId === candidate);
  }

  it("raises the 3000-DP play cap by 2000 per red Tamer when the effect activates (Q2060)", async () => {
    expect(await deletePhoenixmonWith(0, RED_AVIAN_5000)).toBe(false);
    expect(await deletePhoenixmonWith(1, RED_AVIAN_5000)).toBe(true);
    expect(await deletePhoenixmonWith(1, RED_AVIAN_7000)).toBe(false);
    expect(await deletePhoenixmonWith(2, RED_AVIAN_7000)).toBe(true);
  });

  it("does not raise the DP cap of another card's play effect (Q2061)", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: RED_TAMER, as: "firstTamer" },
            { card: RED_TAMER, as: "secondTamer" },
            { card: "BT11-016", as: "phoenixmon" },
            { card: "BT15-014", as: "base" },
          ],
          hand: [
            { card: "BT15-017", as: "otherPhoenixmon" },
            { card: RED_AVIAN_7000, as: "garudamon" },
            { card: RED_AVIAN_5000, as: "muchomon" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferred },
    );
    preferred.push(s.inst("garudamon").instanceId);
    s.state.memory = 6;
    const player = s.state.players[0]!;
    const garudamonOnField = () => player.battleArea.some((p) => p.topCard?.cardId === RED_AVIAN_7000);

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("otherPhoenixmon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => player.battleArea.some((p) => p.topCard?.cardId === RED_AVIAN_5000));
    expect(s.perm("base").topCard.cardId).toBe("BT15-017");
    expect(garudamonOnField()).toBe(false);
    expect(player.hand.map(({ cardId }) => cardId)).toEqual([RED_AVIAN_7000]);

    await advance(s.engine).verb.deletePermanent([s.perm("phoenixmon").permanentId]);
    await settle(() => garudamonOnField());
    expect(garudamonOnField()).toBe(true);
  });
});
