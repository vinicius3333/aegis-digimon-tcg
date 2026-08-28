import { describe, expect, it } from "vitest";
import { getCardDefinition } from "@aegis/shared";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./LM-015.js";

describe("LM-015 Ryudamon", () => {
  it("digivolves into Ginryumon from hand when attacking while its owner has a Tamer", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "LM-015", as: "ryudamon" },
            { card: "BT1-085", as: "tamer" },
          ],
          hand: [{ card: "BT15-058", as: "ginryumon" }],
        },
        1: { security: ["BT1-001"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 0;

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("ryudamon").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("ryudamon").topCard?.cardId === "BT15-058", 2000);

    expect(s.perm("ryudamon").topCard?.cardId).toBe("BT15-058");
    expect(s.state.memory).toBe(0);
  });

  it("does nothing without a Tamer", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "LM-015", as: "ryudamon" }],
          hand: [{ card: "BT15-058", as: "ginryumon" }],
        },
        1: { security: ["BT1-001"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 0;

    s.engine.applyIntent(0, {
      type: "attack",
      attackerPermanentId: s.perm("ryudamon").permanentId,
      target: { kind: "player" },
    });
    await settle(() => s.state.pendingDecision === null);

    expect(s.perm("ryudamon").topCard?.cardId).toBe("LM-015");
    expect(s.state.players[0]!.hand.some((card) => card.cardId === "BT15-058")).toBe(true);
  });

  it("stays put when the optional digivolution is declined", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "LM-015", as: "ryudamon" },
            { card: "BT1-085", as: "tamer" },
          ],
          hand: [{ card: "BT15-058", as: "ginryumon" }],
        },
        1: { security: ["BT1-001"] },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    s.state.memory = 0;

    s.engine.applyIntent(0, {
      type: "attack",
      attackerPermanentId: s.perm("ryudamon").permanentId,
      target: { kind: "player" },
    });
    await settle(() => s.state.pendingDecision === null);

    expect(s.perm("ryudamon").topCard?.cardId).toBe("LM-015");
  });

  it("grants its inherited +1000 DP on your turn to an X Antibody host", async () => {
    const s = setupEngine(
      { 0: { battleArea: [{ card: "BT15-058", as: "host", under: ["LM-015"] }] } },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    s.state.turnSeat = 0;
    await s.ready();

    // Ginryumon carries the [X Antibody] trait, so the aura applies.
    expect(s.perm("host").currentDP).toBe(getCardDefinition("BT15-058")!.dp! + 1000);
  });

  it("withholds the inherited bonus from a host with no X Antibody trait", async () => {
    const s = setupEngine(
      { 0: { battleArea: [{ card: "BT1-024", as: "host", under: ["LM-015"] }] } },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    s.state.turnSeat = 0;
    await s.ready();
    await advance(s.engine).recompute();

    expect(s.perm("host").currentDP).toBe(getCardDefinition("BT1-024")!.dp);
  });

  it("withholds the inherited bonus on the opponent's turn", async () => {
    const s = setupEngine(
      { 0: { battleArea: [{ card: "BT15-058", as: "host", under: ["LM-015"] }] } },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    s.state.turnSeat = 1;
    await s.ready();
    await advance(s.engine).recompute();

    expect(s.perm("host").currentDP).toBe(getCardDefinition("BT15-058")!.dp);
  });

  it("matches committed metadata and publishes fully covered compiled IR", () => {
    const definition = getCardDefinition("LM-015");
    const compiled = runtimeCompiledCard("LM-015");
    expect(definition?.nameEn).toBe("Ryudamon");
    expect(definition?.types).toEqual(["Beast", "X Antibody"]);
    expect(compiled).toMatchObject({ coverage: "full", residual: [] });
  });
});
