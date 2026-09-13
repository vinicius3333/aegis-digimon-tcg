import { describe, expect, it } from "vitest";
import { registeredCompiledCards } from "../../engine/effects/interpreter/compiledCards.js";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "./AD1-021.js";

// AD1-021 Marcus Damon & Agumon
// [End of Your Turn] [Once Per Turn] If you have a yellow Digimon with [Agumon] or
// [Greymon] in its name, for the turn, 1 of your [Marcus Damon]s is also treated as
// a 6000 DP Digimon, gains <Rush> and can't digivolve. Then, 1 of your Digimon may attack.
//
// KB sources: Q6101-Q6111 (2026-03-13/2026-05-08)

describe("AD1-021 Marcus Damon & Agumon", () => {
  const compiled = registeredCompiledCards.get("AD1-021");

  it("plays from security without paying its cost", async () => {
    const s = setupEngine({
      0: { security: [{ card: "AD1-021", as: "securityMarcus" }] },
      1: { battleArea: [{ card: "BT1-013", as: "attacker", dp: 20000 }] },
    });

    s.state.turnSeat = 1;
    await s.ready();
    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() =>
      s.state.players[0]!.battleArea.some(
        (permanent) => permanent.topCard?.instanceId === s.inst("securityMarcus").instanceId,
      ),
    );

    expect(
      s.state.players[0]!.battleArea.some(
        (permanent) => permanent.topCard?.instanceId === s.inst("securityMarcus").instanceId,
      ),
    ).toBe(true);
  });

  it("is registered as fully covered compiled IR", () => {
    expect(compiled).toMatchObject({ coverage: "full", residual: [] });
  });

  it("draws and may digivolve for 3 less only when this Tamer suspends", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "AD1-021", as: "tamer" },
            { card: "BT12-042", as: "rize" },
          ],
          hand: [{ card: "AD1-016", as: "shine" }],
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
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true },
    );
    s.state.memory = 3;

    await advance(s.engine).verb.suspend([s.perm("tamer").permanentId]);
    await settle(() => s.perm("rize").topCard.cardId === "AD1-016");

    expect(s.state.players[0]!.hand.some((card) => card.cardId === "BT1-009")).toBe(true);
    expect(s.state.memory).toBe(2);
  });

  it("turns only the chosen Marcus into a restricted 6000 DP Rush Digimon, then attacks once", async () => {
    const preferInstanceIds: string[] = [];
    const snapshots: Array<{ attackerId?: string; dp: number; rush: boolean; restricted: boolean }> = [];
    let engineRef: ReturnType<typeof setupEngine>["engine"] | undefined;
    let stateRef: ReturnType<typeof setupEngine>["state"] | undefined;
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "AD1-021", as: "marcus" },
            { card: "BT12-034", as: "agumon" },
          ],
          hand: ["BT1-009", "BT1-010"],
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
        },
        1: {
          security: [
            "BT1-009",
            "BT1-009",
            "BT1-010",
            "BT1-011",
            "BT1-012",
            "BT1-013",
            "BT1-014",
            "BT1-009",
            "BT1-010",
            "BT1-011",
          ],
          hand: ["BT1-013"],
          deck: ["BT1-009", "BT1-009", "BT1-009", "BT1-009", "BT1-009", "BT1-009"],
        },
      },
      {
        autoAcceptOptional: true,
        autoSelectCards: true,
        preferInstanceIds,
        onEvent: (event) => {
          if (event.kind === "attackDeclared" && engineRef !== undefined) {
            const marcus = stateRef?.players[0]!.battleArea.find((p) => p.topCard?.cardId === "AD1-021");
            if (marcus !== undefined)
              snapshots.push({
                attackerId: event.attackerPermanentId,
                dp: marcus.currentDP,
                rush: observe(engineRef).hasKeyword(marcus, "Rush"),
                restricted: observe(engineRef).isRestricted(marcus, "digivolve"),
              });
          }
        },
      },
    );
    engineRef = s.engine;
    stateRef = s.state;
    preferInstanceIds.push(s.perm("marcus").topCard!.instanceId);
    const marcusPermanentId = s.perm("marcus").permanentId;

    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    advance(s.engine).endMainPhaseIfOpen(0);
    await advance(s.engine).waitForMainPhase(1);

    const view = observe(s.engine);
    expect(s.perm("marcus").currentDP).not.toBe(6000);
    expect(view.hasKeyword(s.perm("marcus"), "Rush")).toBe(false);
    expect(view.isRestricted(s.perm("marcus"), "digivolve")).toBe(false);
    expect(view.hasKeyword(s.perm("agumon"), "Rush")).toBe(false);
    expect(view.isRestricted(s.perm("agumon"), "digivolve")).toBe(false);
    expect(s.events.filter((event) => event.kind === "attackDeclared")).toHaveLength(1);
    advance(s.engine).endMainPhaseIfOpen(1);
    await advance(s.engine).waitForMainPhase(0);
    advance(s.engine).endMainPhaseIfOpen(0);
    await advance(s.engine).waitForMainPhase(1);
    expect(s.events.filter((event) => event.kind === "attackDeclared")).toHaveLength(2);
    expect(snapshots).toHaveLength(2);
    expect(snapshots.every((snapshot) => snapshot.dp === 6000 && snapshot.rush && snapshot.restricted)).toBe(true);
    expect(snapshots.every((snapshot) => snapshot.attackerId === marcusPermanentId)).toBe(true);
    expect(s.engine.applyIntent(1, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  it("does not offer the trailing attack without the yellow Agumon/Greymon gate", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "AD1-021", as: "marcus" }],
          hand: ["BT1-009"],
          deck: ["BT1-009", "BT1-009", "BT1-009", "BT1-009", "BT1-009"],
        },
        1: {
          security: ["BT1-009", "BT1-010"],
          hand: ["BT1-011"],
          deck: ["BT1-012", "BT1-013", "BT1-014", "BT1-009", "BT1-010"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );

    await advance(s.engine).runTurn(0);

    expect(s.state.players[1]!.security).toHaveLength(2);
  });

  it("binds every Marcus grant to one selection and declares exactly one optional attack", () => {
    const endTurn = compiled?.effects.find((effect) => effect.trigger === "EndOfYourTurn");
    expect(endTurn).toBeDefined();
    expect(endTurn?.frequency).toBe("OncePerTurn");
    expect(endTurn?.actions).toHaveLength(6);
    expect(endTurn?.actions[0]).toMatchObject({
      kind: "SelectBind",
      target: {
        bindAs: "chosenMarcus",
        count: 1,
        filter: { controller: "mine", nameOrTrait: [{ tokens: ["Marcus Damon"], match: "name" }] },
      },
    });
    for (const action of endTurn?.actions.slice(1, 5) ?? []) {
      expect(action).toMatchObject({ target: { fromSelectionRef: "chosenMarcus", count: 1 } });
    }
    expect(endTurn?.actions.filter((action) => action.kind === "Attack")).toEqual([
      expect.objectContaining({ kind: "Attack", optional: true }),
    ]);
  });

  it("still draws on suspension but rejects a hand Digimon without Greymon in its name", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "AD1-021", as: "tamer" },
            { card: "BT12-042", as: "base" },
          ],
          hand: [{ card: "BT1-010", as: "notGreymon" }],
          deck: ["BT1-009"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await advance(s.engine).verb.suspend([s.perm("tamer").permanentId]);
    await settle();
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("notGreymon").instanceId)).toBe(true);
    expect(s.state.players[0]!.hand.some((card) => card.cardId === "BT1-009")).toBe(true);
    expect(s.perm("base").topCard.cardId).toBe("BT12-042");
  });
});
