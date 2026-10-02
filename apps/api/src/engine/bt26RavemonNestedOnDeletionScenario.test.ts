import { Phase } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import "../cards/index.js";
import { layDevScenario } from "./devScenario.js";
import { BLUE_DECK, RED_DECK } from "./testDecks.js";
import { advance } from "./testkit/advance.js";
import { setupEngine, settle } from "./testkit/harness.js";

describe("BT26 Ravemon nested On Deletion Discord arena scenario", () => {
  it("resolves every On Deletion as soon as a Thomas-reduced Crowmon ends in Ravemon deleting itself (Discord 1555674174369042583)", async () => {
    const s = setupEngine(
      { 0: {}, 1: {} },
      {
        autoAcceptOptional: true,
        autoSelectCards: true,
        autoChooseOption: true,
        preferInstanceIds: ["dev-field-0-ravemon-yoshino"],
        declinePrompts: ["Place 1 card(s) from hand"],
      },
    );
    layDevScenario("arena-bt26-ravemon-nested-on-deletion", s.state, [BLUE_DECK, RED_DECK]);
    const human = s.state.players[0]!;
    const bot = s.state.players[1]!;
    const thomas = () => human.battleArea.find(({ permanentId }) => permanentId === "dev-perm-0-ravemon-thomas");

    const loop = s.engine.startTurnLoop();
    await settle(() => s.state.phase === Phase.Breeding);
    expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
    await advance(s.engine).waitForMainPhase(0);
    await settle(() => s.state.pendingDecision === undefined);

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: "dev-perm-0-ravemon-declared-peckmon",
        instanceId: "dev-ravemon-crowmon",
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        human.security.some(({ instanceId }) => instanceId === "dev-ravemon-trash") &&
        s.state.pendingDecision === undefined,
      2000,
    );

    expect(s.events.find(({ kind }) => kind === "digivolved")).toMatchObject({
      permanentId: "dev-perm-0-ravemon-declared-peckmon",
      cardId: "BT26-076",
    });
    expect(bot.battleArea).toHaveLength(0);
    expect(bot.hand).toHaveLength(1);
    expect(thomas()?.stack).toHaveLength(1);
    expect(human.security.at(-1)).toMatchObject({ instanceId: "dev-ravemon-trash", faceUp: true });

    expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });
});
