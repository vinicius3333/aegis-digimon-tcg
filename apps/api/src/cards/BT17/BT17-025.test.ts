import { getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { compiled } from "./BT17-025.js";
import "../BT1/BT1-043.js";
import "./index.js";

describe("BT17-025", () => {
  it("plays a level 3 blue or purple Digimon from trash or digivolution cards and returns it", () => {
    expect(compiled.effects?.[0]).toMatchObject({
      trigger: "WhenDigivolving",
      actions: [
        {
          kind: "PlayWithoutCost",
          from: ["trash", "digivolutionCards"],
          payCost: false,
          optional: true,
          bindResultAs: "playedLevel3",
        },
        {
          kind: "DelayedEffect",
          trigger: "nextEndOfOpponentTurn",
          effect: { kind: "Return", to: "hand", target: { filter: { boundRef: "playedLevel3" } } },
        },
      ],
    });
  });

  it("grants itself Dark Animal and returns a level 3 opponent Digimon when yours is played", () => {
    expect(compiled.effects?.[1]).toMatchObject({
      trigger: "Rule",
      actions: [{ kind: "GrantStatic", grant: "trait", tokens: ["Dark Animal"] }],
    });
    expect(compiled.effects?.[2]).toMatchObject({
      trigger: "AllTurns",
      isInherited: true,
      frequency: "OncePerTurn",
      actions: [
        {
          kind: "SubTrigger",
          event: "whenPlayed",
          sourceFilter: { byEffect: true },
          actions: [{ kind: "Return", to: "hand", target: { filter: { levels: [3] } } }],
        },
      ],
    });
  });

  it("plays a level 3 Digimon from trash and returns it at the end of a complete opponent turn", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT4-083", as: "cerberusmon" }],
          trash: [{ card: "BT17-021", as: "revived" }],
          deck: ["BT1-011"],
          // BT17-021 has its own On Play placement cost; keep a legal neutral
          // level-3 blue card available so entry fully resolves before the
          // delayed return watcher is exercised.
          hand: [
            { card: "BT17-025", as: "werewolf" },
            { card: "BT1-029", as: "placement" },
          ],
        },
        // Keep the public Main phase open for the opponent's complete turn; this free card is
        // never played, so it cannot alter the delayed-return outcome.
        1: {
          // Keep the opponent's turn alive through its draw phase so the delayed
          // end-of-opponent-turn watcher actually gets its production boundary.
          deck: ["BT1-011"],
          battleArea: [{ card: "BT1-029", as: "opponentLevel3" }],
          hand: [{ card: "BT1-090", as: "opponentMainAction" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 1;
    const revivedId = s.inst("revived").instanceId;
    const opponentId = s.perm("opponentLevel3").permanentId;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("cerberusmon").permanentId,
        instanceId: s.inst("werewolf").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.instanceId === revivedId));

    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.instanceId === revivedId)).toBe(true);
    expect(s.state.players[1]!.battleArea.some((permanent) => permanent.permanentId === opponentId)).toBe(true);
    expect(observe(s.engine).hasEffectiveTrait(s.perm("cerberusmon"), "Dark Animal")).toBe(true);

    s.state.turnSeat = 1;
    await advance(s.engine).runTurn(1);
    await settle(() => s.state.players[0]!.hand.some((card) => card.instanceId === revivedId));

    expect(s.state.players[0]!.hand.some((card) => card.instanceId === revivedId)).toBe(true);
    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.instanceId === revivedId)).toBe(false);
  });

  it("returns an opposing level 3 Digimon when an effect plays yours", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT1-043", as: "inheritedHost", under: ["BT17-025"] },
            { card: "BT4-083", as: "cerberusmon" },
          ],
          hand: [{ card: "BT17-025", as: "werewolf" }],
          trash: [{ card: "BT1-029", as: "played" }],
        },
        1: { battleArea: [{ card: "BT1-029", as: "opponentLevel3" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 1;
    await s.ready();
    const opponentId = s.perm("opponentLevel3").permanentId;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("cerberusmon").permanentId,
        instanceId: s.inst("werewolf").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() =>
      s.state.players[1]!.hand.some((card) => card.instanceId === s.inst("opponentLevel3").instanceId),
    );

    expect(s.state.players[1]!.hand.some((card) => card.cardId === "BT1-029")).toBe(true);
    expect(s.state.players[1]!.battleArea.some((permanent) => permanent.permanentId === opponentId)).toBe(false);
  });

  it("does not return an opposing Digimon for a natural play", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT1-043", as: "host", under: ["BT17-025"] }],
          hand: [{ card: "BT1-029", as: "played" }],
        },
        1: { battleArea: [{ card: "BT1-029", as: "opponentLevel3" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 3;
    await s.ready();
    const opponentId = s.perm("opponentLevel3").permanentId;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("played").instanceId })).toEqual({
      ok: true,
    });
    await settle(() =>
      s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.instanceId === s.inst("played").instanceId),
    );

    expect(s.state.players[1]!.battleArea.some((permanent) => permanent.permanentId === opponentId)).toBe(true);
  });
  it("matches the catalog identity, printed text and Cerberusmon alternate evolution route", () => {
    expect(getCardDefinition("BT17-025")).toMatchObject({
      cardId: "BT17-025",
      nameEn: "Cerberusmon: Werewolf Mode",
      colors: ["Blue", "Purple"],
      kinds: ["Digimon"],
      level: 5,
      playCost: 7,
      dp: 7000,
      types: ["Wizard", "Dark Animal"],
      evoCosts: [
        { color: "Blue", level: 4, memoryCost: 4 },
        { color: "Purple", level: 4, memoryCost: 4 },
      ],
    });
    const printed = getCardDefinition("BT17-025")!.effectText!;
    expect(printed).toContain("[Digivolve][Cerberusmon]: Cost 1");
    expect(printed).toContain("[Rule] Trait: Has the [Dark Animal] type.");
    expect(compiled.digivolutionRequirement).toEqual([{ names: ["Cerberusmon"], cost: 1, isAlternate: true }]);
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
  });

  it("publicly digivolves from Cerberusmon through the printed [Cerberusmon] route for 1", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT4-083", as: "cerberusmon" }],
        hand: [{ card: "BT17-025", as: "werewolf" }],
        trash: [],
        deck: ["BT1-009"],
      },
    });
    s.state.memory = 0;
    await s.ready();
    const cerberusId = s.inst("cerberusmon").instanceId;
    const werewolfId = s.inst("werewolf").instanceId;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("cerberusmon").permanentId,
        instanceId: werewolfId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("cerberusmon").topCard?.instanceId === werewolfId);

    // Cost 1 through the alternate route, not the printed 4 of the normal Lv4 route.
    expect(s.state.memory).toBe(-1);
    expect(s.perm("cerberusmon").stack.map((card) => card.instanceId)).toEqual([cerberusId]);
    expect(s.state.players[0]!.hand).toHaveLength(1); // the bonus draw
  });

  it("publicly digivolves from a purple Lv4 through the normal route for 4", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT4-080", as: "bakemon" }],
        hand: [{ card: "BT17-025", as: "werewolf" }],
        deck: ["BT1-009"],
      },
    });
    s.state.memory = 0;
    await s.ready();
    const bakemonId = s.inst("bakemon").instanceId;
    const werewolfId = s.inst("werewolf").instanceId;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("bakemon").permanentId,
        instanceId: werewolfId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("bakemon").topCard?.instanceId === werewolfId);

    expect(s.state.memory).toBe(-4);
    expect(s.perm("bakemon").stack.map((card) => card.instanceId)).toEqual([bakemonId]);
  });

  it("refuses a Lv4 source that is neither the right color nor named Cerberusmon", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT1-014", as: "kokatorimon" }],
        hand: [{ card: "BT17-025", as: "werewolf" }],
        deck: ["BT1-009"],
      },
    });
    s.state.memory = 5;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("kokatorimon").permanentId,
        instanceId: s.inst("werewolf").instanceId,
        useAlternateCost: true,
      }),
    ).toMatchObject({ ok: false });
    expect(s.perm("kokatorimon").topCard?.cardId).toBe("BT1-014");
    expect(s.state.players[0]!.hand).toHaveLength(1);
  });

  // Q2770: if the played Digimon later digivolved, only its top card goes back to the
  // hand; the cards beneath it (the played card included) are trashed.
  it("Q2770: returns only the top card when the played Digimon has digivolved", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT4-083", as: "cerberusmon" }],
          trash: [{ card: "BT17-021", as: "revived" }],
          deck: ["BT1-009", "BT1-013"],
          hand: [
            { card: "BT17-025", as: "werewolf" },
            { card: "BT1-029", as: "placement" },
            { card: "BT1-037", as: "gorillamon" },
          ],
        },
        1: { deck: ["BT1-009"], hand: [{ card: "BT1-090", as: "opponentMainAction" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 3;
    const revivedId = s.inst("revived").instanceId;
    const gorillamonId = s.inst("gorillamon").instanceId;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("cerberusmon").permanentId,
        instanceId: s.inst("werewolf").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some((p) => p.topCard?.instanceId === revivedId));

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("revived").permanentId,
        instanceId: gorillamonId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("revived").topCard?.instanceId === gorillamonId);

    s.state.turnSeat = 1;
    await advance(s.engine).runTurn(1);
    await settle(() => s.state.players[0]!.hand.some((card) => card.instanceId === gorillamonId));

    expect(s.state.players[0]!.hand.some((card) => card.instanceId === gorillamonId)).toBe(true);
    expect(s.state.players[0]!.trash.some((card) => card.instanceId === revivedId)).toBe(true);
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === revivedId)).toBe(false);
    expect(s.state.players[0]!.battleArea.some((p) => p.topCard?.instanceId === gorillamonId)).toBe(false);
  });

  // Q2771: the delayed return only reaches the Digimon it played. Once that card has
  // already left the battle area for the trash, nothing comes back.
  it("Q2771: does not return the played card from the trash at the end of the opponent turn", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT4-083", as: "cerberusmon" }],
          trash: [{ card: "BT17-021", as: "revived" }],
          deck: ["BT1-009", "BT1-013"],
          hand: [
            { card: "BT17-025", as: "werewolf" },
            { card: "BT1-029", as: "placement" },
          ],
        },
        1: { deck: ["BT1-009"], hand: [{ card: "BT1-090", as: "opponentMainAction" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 3;
    const revivedId = s.inst("revived").instanceId;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("cerberusmon").permanentId,
        instanceId: s.inst("werewolf").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some((p) => p.topCard?.instanceId === revivedId));

    await advance(s.engine).verb.deletePermanent([s.perm("revived").permanentId]);
    await settle(() => s.state.players[0]!.trash.some((card) => card.instanceId === revivedId));

    s.state.turnSeat = 1;
    await advance(s.engine).runTurn(1);

    expect(s.state.players[0]!.trash.some((card) => card.instanceId === revivedId)).toBe(true);
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === revivedId)).toBe(false);
  });
});
