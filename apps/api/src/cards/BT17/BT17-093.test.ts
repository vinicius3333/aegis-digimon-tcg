import { describe, expect, it } from "vitest";
import { Phase } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import "./BT17-093.js";
import "./index.js";
import "../P/P-012.js";
import "../BT10/BT10-089.js";

describe("BT17-093 Tai Kamiya & Kari Kamiya — hatch trigger", () => {
  it("suspends this Tamer and gains 1 memory when its owner hatches", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT17-093", as: "tamer" }],
          eggDeck: [{ card: "BT1-001", as: "egg" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 0;
    s.state.phase = Phase.Breeding;
    await s.ready();
    await advance(s.engine).recompute();
    await advance(s.engine).recompute();

    expect(s.engine.applyIntent(0, { type: "hatchEgg" }).ok).toBe(true);
    await settle(() => s.state.memory === 1);

    expect(s.perm("tamer").isSuspended).toBe(true);
    expect(s.state.memory).toBe(1);
    expect(s.state.players[0]?.breeding?.topCard?.cardId).toBe("BT1-001");
  });

  it("naturally returns itself to deck bottom, draws, and plays a Tai/Kari Tamer at end of turn", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT17-093", as: "source" }],
          hand: [{ card: "BT17-093", as: "replacement" }],
          deck: [
            { card: "BT1-001", as: "turnDraw" },
            { card: "BT1-002", as: "effectDraw" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();

    await advance(s.engine).runTurn(0);
    await settle(() =>
      s.state.players[0]!.battleArea.some(
        (permanent) => permanent.topCard?.instanceId === s.inst("replacement").instanceId,
      ),
    );

    expect(s.state.players[0]!.deck.map((card) => card.instanceId)).toContain(s.inst("source").instanceId);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toContain(s.inst("turnDraw").instanceId);
    expect(s.state.players[0]!.battleArea.map((permanent) => permanent.topCard?.instanceId)).toContain(
      s.inst("replacement").instanceId,
    );
  });

  it("naturally plays itself from Security without paying its cost", async () => {
    const s = setupEngine({
      0: { security: [{ card: "BT17-093", as: "securityTaiKari" }] },
      1: { battleArea: [{ card: "BT1-009", as: "attacker" }] },
    });
    s.state.turnSeat = 1;

    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.cardId === "BT17-093"));

    expect(s.state.players[0]!.security).toHaveLength(0);
    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.cardId === "BT17-093")).toBe(true);
  });

  it("gains no memory when the Tamer is already suspended and cannot pay the cost", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT17-093", as: "tamer", suspended: true }],
          eggDeck: [{ card: "BT1-001", as: "egg" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 0;
    s.state.phase = Phase.Breeding;
    await s.ready();
    await advance(s.engine).recompute();

    expect(s.engine.applyIntent(0, { type: "hatchEgg" }).ok).toBe(true);
    await settle(() => s.state.players[0]?.breeding?.topCard?.cardId === "BT1-001");

    expect(s.state.memory).toBe(0);
    expect(s.perm("tamer").isSuspended).toBe(true);
  });

  it("plays the name-matching Tamer and leaves a non-matching Tamer in hand", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT17-093", as: "source" }],
          hand: [
            { card: "BT17-087", as: "marcus" },
            { card: "BT16-084", as: "yoleiKari" },
          ],
          deck: [
            { card: "BT1-001", as: "turnDraw" },
            { card: "BT1-002", as: "effectDraw" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();

    await advance(s.engine).runTurn(0);
    await settle(() =>
      s.state.players[0]!.battleArea.some(
        (permanent) => permanent.topCard?.instanceId === s.inst("yoleiKari").instanceId,
      ),
    );

    // "with [Tai Kamiya]/[Kari Kamiya] in its name" is a substring match, so Yolei Inoue & Kari
    // Kamiya qualifies and Marcus Damon does not.
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toContain(s.inst("marcus").instanceId);
    expect(s.state.players[0]!.battleArea.map((permanent) => permanent.topCard?.instanceId)).not.toContain(
      s.inst("marcus").instanceId,
    );
    expect(s.state.players[0]!.deck.map((card) => card.instanceId)).toContain(s.inst("source").instanceId);
  });

  it("treats a parenthesised Tai Kamiya name as a match and a same-colour Tamer without the name as a near miss", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT17-093", as: "source" }],
          hand: [
            { card: "BT10-089", as: "nearMiss" },
            { card: "P-012", as: "vTamer" },
          ],
          deck: [
            { card: "BT1-001", as: "turnDraw" },
            { card: "BT1-002", as: "effectDraw" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();

    await advance(s.engine).runTurn(0);
    await settle(() =>
      s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.instanceId === s.inst("vTamer").instanceId),
    );

    // "Tai Kamiya (V-Tamer)" contains [Tai Kamiya], so the substring match takes it; Akari
    // Hinomoto is a Tamer of the same cost with neither printed name and stays in hand.
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toContain(s.inst("nearMiss").instanceId);
    expect(s.state.players[0]!.battleArea.map((permanent) => permanent.topCard?.instanceId)).not.toContain(
      s.inst("nearMiss").instanceId,
    );
  });

  it("does not re-run the End of Your Turn effect on the copy it just played (Q2878)", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT17-093", as: "source" }],
          hand: [
            { card: "BT17-093", as: "replacement" },
            { card: "BT1-009", as: "spare" },
          ],
          deck: [
            { card: "BT1-001", as: "turnDraw" },
            { card: "BT1-002", as: "effectDraw" },
            { card: "BT1-010", as: "unreachableDraw" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();

    await advance(s.engine).runTurn(0);
    await settle(() =>
      s.state.players[0]!.battleArea.some(
        (permanent) => permanent.topCard?.instanceId === s.inst("replacement").instanceId,
      ),
    );

    // Q2878: the copy arrives after the [End of Your Turn] timing has passed, so it stays in the
    // battle area, is not returned to the bottom of the deck, and draws nothing more.
    expect(s.state.players[0]!.deck.map((card) => card.instanceId)).not.toContain(s.inst("replacement").instanceId);
    expect(s.state.players[0]!.deck.map((card) => card.instanceId)).toContain(s.inst("unreachableDraw").instanceId);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).not.toContain(s.inst("unreachableDraw").instanceId);
    expect(s.state.players[0]!.battleArea.filter((permanent) => permanent.topCard?.cardId === "BT17-093")).toHaveLength(
      1,
    );
  });

  // Q2877 ("play into an empty space in your breeding area without paying the cost" is not
  // hatching) is carried by the IR event name: the SubTrigger listens to `whenHatch`, which the
  // engine raises only from the `hatchEgg` intent, and no play-into-breeding action raises it.
  // No behavioural negative was added: every printed card that plays a Digimon into the breeding
  // area does so from an [End of Your Turn] effect, which would race this card's own end-of-turn
  // clause and prove nothing cleanly. Reported as a residual gap.

  it("records complete compiled coverage for the hatch trigger", () => {
    const compiled = runtimeCompiledCard("BT17-093")!;
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
  });
});
