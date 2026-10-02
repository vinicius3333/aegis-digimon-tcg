import { Phase } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import "../cards/index.js";
import { layDevScenario } from "./devScenario.js";
import { BLUE_DECK, RED_DECK } from "./testDecks.js";
import { advance } from "./testkit/advance.js";
import { setupEngine, settle } from "./testkit/harness.js";

describe("Decoy protect choice Discord arena scenario", () => {
  it("lets the human choose which Red/Black Digimon Decoy saves from Crimson Blaze (Discord 1555594986756767896)", async () => {
    const preferInstanceIds = ["dev-field-0-decoy-token", "dev-field-0-decoy-monodramon"];
    const s = setupEngine({ 0: {}, 1: {} }, { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds });
    layDevScenario("arena-decoy-protect-choice", s.state, [BLUE_DECK, RED_DECK]);
    const loop = s.engine.startTurnLoop();
    await settle(() => s.state.phase === Phase.Breeding);
    expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
    await advance(s.engine).waitForMainPhase(0);

    const human = s.state.players[0]!;
    const attacker = human.battleArea.find(
      ({ topCard }) => topCard.instanceId === "dev-field-0-decoy-attacker",
    )!.permanentId;
    expect(
      s.engine.applyIntent(0, { type: "attack", attackerPermanentId: attacker, target: { kind: "player" } }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        s.events.some((event) => event.kind === "attackEnded" && event.attackerPermanentId === attacker) &&
        s.state.pendingDecision === undefined,
    );

    const protectPrompt = s.decisions.find(
      ({ seat, req }) => seat === 0 && req.promptText === "＜Decoy＞: choose 1 Digimon to protect from deletion",
    );
    const survivors = human.battleArea.map(({ topCard }) => topCard.instanceId);
    expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
    await loop;

    expect([...(protectPrompt?.req.options?.candidateInstanceIds ?? [])].sort()).toEqual(
      ["dev-field-0-decoy-agumon", "dev-field-0-decoy-gotsumon", "dev-field-0-decoy-monodramon"].sort(),
    );
    expect(survivors.sort()).toEqual(["dev-field-0-decoy-attacker", "dev-field-0-decoy-monodramon"]);
  });
});
