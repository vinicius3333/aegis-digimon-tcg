import { describe, expect, it } from "vitest";
import { cardEffectClauseForTiming, effectClauseForTiming, playerFacingEffectClause } from "./overlays";

// AD1-001: a single printed clause fires under either timing.
const SHARED =
  "[Digivolve] Lv.3: Cost 2\n\n[On Play] [When Digivolving] You may return 1 card with [Greymon] in its name from your trash to the hand.\n[All Turns] When your Digimon are played, this may digivolve.";

describe("effectClauseForTiming", () => {
  it("returns the shared body for BOTH timings of a stacked-bracket clause", () => {
    const onPlay = effectClauseForTiming(SHARED, "OnPlay");
    const whenDigi = effectClauseForTiming(SHARED, "WhenDigivolving");
    expect(onPlay).toBe(
      "[On Play] [When Digivolving] You may return 1 card with [Greymon] in its name from your trash to the hand.",
    );
    expect(whenDigi).toBe(onPlay);
  });

  it("does not bleed into the next clause", () => {
    expect(effectClauseForTiming(SHARED, "OnPlay")).not.toContain("[All Turns]");
  });

  it("slices a distinct clause with its own body", () => {
    const text = "[On Play] Draw 1 card.\n[When Digivolving] Gain 1 memory.";
    expect(effectClauseForTiming(text, "OnPlay")).toBe("[On Play] Draw 1 card.");
    expect(effectClauseForTiming(text, "WhenDigivolving")).toBe("[When Digivolving] Gain 1 memory.");
  });

  it("falls back to the full text when the timing bracket is absent", () => {
    const text = "[On Play] Draw 1 card.";
    expect(effectClauseForTiming(text, "OnDeletion")).toBe(text);
  });

  it("hides the [Security] clause when an On Play prompt resolves (AD1-020)", () => {
    const text =
      "[Security] Play this card without paying the cost.\n[Start of Your Main Phase] [On Play] You may place up to 2 [Hybrid] trait cards with different colors from your hand or trash under this Tamer.";
    const clause = effectClauseForTiming(text, "OnPlay");
    expect(clause).not.toContain("[Security]");
    expect(clause).toContain("[On Play]");
  });

  it("shows Meiko Mochizuki's All Turns clause instead of her On Play search", () => {
    const text =
      "[On Play] You may reveal the top 3 cards of your deck. Add 1 purple or yellow Digimon card among them to your hand. Trash the rest. [All Turns] When you play a 2-color purple and yellow Digimon, you may suspend this Tamer to gain 1 memory.";
    const clause = effectClauseForTiming(text, "AllTurns");
    expect(clause).toBe(
      "[All Turns] When you play a 2-color purple and yellow Digimon, you may suspend this Tamer to gain 1 memory.",
    );
    expect(clause).not.toContain("reveal the top 3");
  });

  it("returns the text unchanged when timing is unknown", () => {
    expect(effectClauseForTiming("anything", undefined)).toBe("anything");
  });

  it("uses Gatomon's inherited text for its end-of-turn DNA decision", () => {
    const clause = cardEffectClauseForTiming("ST10-04", "EndOfYourTurn");
    expect(clause).toContain("[End of Your Turn]");
    expect(clause).toContain("DNA digivolve this Digimon");
    expect(clause).not.toContain("[On Play]");
  });

  it("separates Shadramon's modal and inherited DNA clauses", () => {
    const whenDigivolving = cardEffectClauseForTiming("EX3-058", "WhenDigivolving");
    const inherited = cardEffectClauseForTiming("EX3-058", "EndOfYourTurn");

    expect(whenDigivolving).toContain("Activate 1 of the effects below");
    expect(whenDigivolving).toContain("level 4 red Digimon card with the [Free] trait from your trash");
    expect(whenDigivolving).toContain("DNA digivolve this Digimon and one of your other Digimon");
    expect(inherited).toContain("[End of Your Turn]");
    expect(inherited).toContain("This Digimon and one of your other Digimon may DNA digivolve");
    expect(inherited).not.toContain("Activate 1 of the effects below");
  });

  it("shows only DarkTyrannomon's inherited On Deletion clause", () => {
    const inherited = cardEffectClauseForTiming("EX3-059", "OnDeletion");

    expect(inherited).toBe("[On Deletion] Suspend 1 of your opponent's Digimon.");
  });

  it("separates ExTyrannomon's Blocker and no-source restriction", () => {
    const blocker = cardEffectClauseForTiming("EX3-060", "Static");
    const restriction = cardEffectClauseForTiming("EX3-060", "AllTurns");

    expect(blocker).toContain("＜Blocker＞");
    expect(blocker).not.toContain("has no digivolution cards");
    expect(restriction).toBe("[All Turns] While this Digimon has no digivolution cards, it can't attack or block.");
  });

  it("separates Dinobeemon's DNA, On Deletion, and inherited Imperialdramon clauses", () => {
    const dna = cardEffectClauseForTiming("EX3-061", "WhenDigivolving");
    const deletion = cardEffectClauseForTiming("EX3-061", "OnDeletion");
    const inherited = cardEffectClauseForTiming("EX3-061", "YourTurn");

    expect(dna).toContain("[When Digivolving] When DNA digivolving");
    expect(dna).toContain("play 1 [Paildramon] from your trash");
    expect(dna).not.toContain("[On Deletion]");
    expect(deletion).toBe("[On Deletion] You may play 1 [Wormmon] from your trash without paying the cost.");
    expect(inherited).toContain("[Your Turn]");
    expect(inherited).toContain("has [Imperialdramon] in its name");
    expect(inherited).toContain("attack your opponent's unsuspended Digimon");
    expect(inherited).not.toContain("Paildramon");
  });

  it("keeps WarGrowlmon's mill, post-mill threshold, and free play in one explanation", () => {
    const clause = cardEffectClauseForTiming("EX3-062", "WhenDigivolving");

    expect(clause).toContain("[When Digivolving] Trash the top 3 cards of both players' decks");
    expect(clause).toContain("if either player has 5 or more cards in their trash");
    expect(clause).toContain("play 1 [Guilmon] or [Takato Matsuki]");
    expect(clause).not.toContain("Digivolve: 3 from Lv.4");
  });

  it("separates Imperialdramon Dragon Mode's DNA consequence from its attack evolution", () => {
    const dna = cardEffectClauseForTiming("EX3-063", "WhenDigivolving");
    const attack = cardEffectClauseForTiming("EX3-063", "WhenAttacking");

    expect(dna).toContain("your opponent chooses 1 of their Digimon");
    expect(dna).toContain("Delete all of their other Digimon. Then, ＜Blitz＞");
    expect(dna).not.toContain("Fighter Mode");
    expect(attack).toContain("[When Attacking][Once Per Turn]");
    expect(attack).toContain("gets +2000 DP for the turn");
    expect(attack).toContain("digivolve into [Imperialdramon: Fighter Mode]");
    expect(attack).not.toContain("chooses 1 of their Digimon");
  });

  it("separates Megidramon's rule, On Play ceiling, and optional On Deletion placement", () => {
    const rule = cardEffectClauseForTiming("EX3-064", "Static");
    const onPlay = cardEffectClauseForTiming("EX3-064", "OnPlay");
    const onDeletion = cardEffectClauseForTiming("EX3-064", "OnDeletion");

    expect(rule).toContain("also treated as [ChaosGallantmon]");
    expect(rule).not.toContain("Delete 1");
    expect(onPlay).toContain("Delete 1 of your opponent's level 5 or lower Digimon");
    expect(onPlay).toContain("add 1 to the maximum level");
    expect(onPlay).not.toContain("[On Deletion]");
    expect(onDeletion).toContain("you may place 1 [Trial of the Four Great Dragons]");
    expect(onDeletion).not.toContain("level 5 or lower");
  });

  it("separates Hina's start-turn memory, Dragon watcher, and Security play clauses", () => {
    const start = cardEffectClauseForTiming("EX3-065", "OnStartTurn");
    const watcher = cardEffectClauseForTiming("EX3-065", "YourTurn");
    const security = cardEffectClauseForTiming("EX3-065", "Security");

    expect(start).toContain("[Start of Your Turn]");
    expect(start).toContain("gain 1 memory");
    expect(start).not.toContain("[Rock Dragon]");
    expect(watcher).toContain("[Rock Dragon], [Earth Dragon], [Machine Dragon], or [Sky Dragon]");
    expect(watcher).toContain("activate 1 of that Digimon's [On Play] effects");
    expect(watcher).not.toContain("gain 1 memory");
    expect(security).toBe("[Security] Play this card without paying the cost.");
  });

  it("separates Hyper Infinity Cannon's color waiver, Main sequence, and Security activation", () => {
    const waiver = cardEffectClauseForTiming("EX3-066", "Static");
    const main = cardEffectClauseForTiming("EX3-066", "Main");
    const security = cardEffectClauseForTiming("EX3-066", "Security");

    expect(waiver).toContain("without meeting its color requirements");
    expect(main).toContain("＜De-Digivolve 3＞");
    expect(main).toContain("placing 1 card with [Cyborg]");
    expect(main).toContain("delete 1 of your opponent's Digimon with 6000 DP or less");
    expect(security).toBe("[Security] Activate this card's [Main] effect.");
  });

  it("keeps Sourai's source trash and attack lock together, with a separate Security activation", () => {
    const main = cardEffectClauseForTiming("EX3-067", "Main");
    const security = cardEffectClauseForTiming("EX3-067", "Security");

    expect(main).toContain("Trash the top 4 digivolution cards");
    expect(main).toContain("all of your opponent's Digimon with no digivolution cards can't attack");
    expect(main).toContain("Until the end of your opponent's turn");
    expect(main).not.toContain("[Security]");
    expect(security).toBe("[Security] Activate this card's [Main] effect.");
  });

  it("keeps God Flame's DP reduction and optional errata recovery together", () => {
    const main = cardEffectClauseForTiming("EX3-068", "Main");
    const security = cardEffectClauseForTiming("EX3-068", "Security");

    expect(main).toContain("gets -6000 DP for the turn");
    expect(main).toContain("you may return 1 card with the [Four Great Dragons] trait");
    expect(main).not.toContain("[Security]");
    expect(security).toBe("[Security] Activate this card's [Main] effect.");
  });

  it("keeps Trial's independent Main clauses separate and selects its Security placement", () => {
    const main = cardEffectClauseForTiming("EX3-069", "Main");
    const security = cardEffectClauseForTiming("EX3-069", "Security");

    expect(main).toContain("＜Draw 1＞. Then, place this card in your battle area");
    expect(main).not.toContain("＜Delay＞");
    expect(main).not.toContain("[Security]");
    expect(security).toBe("[Security] Place this card in its owner's battle area.");
  });

  it("shows Agumon's complete inherited Four Great Dragons/Trial clause", () => {
    const clause = cardEffectClauseForTiming("EX3-027", "YourTurn");
    expect(clause).toContain("[Your Turn][Once Per Turn]");
    expect(clause).toContain("play a Digimon with [Four Great Dragons] in its traits");
    expect(clause).toContain("place [Trial of the Four Great Dragons] in your battle area");
    expect(clause).toContain("＜Draw 1＞");
  });

  it("separates Darkdramon's digivolution reducer from its D-Brigade play watcher", () => {
    const reducer = cardEffectClauseForTiming("EX3-054", "Static");
    const watcher = cardEffectClauseForTiming("EX3-054", "YourTurn");

    expect(reducer).toContain("returning up to 5 cards with [D-Brigade]");
    expect(reducer).toContain("top of your deck");
    expect(reducer).not.toContain("delete 1 of your opponent's Digimon");
    expect(watcher).toContain("[Your Turn][Once Per Turn]");
    expect(watcher).toContain("play cost less than or equal to the Digimon you played");
    expect(watcher).toContain("unsuspend this Digimon");
    expect(watcher).not.toContain("returning up to 5 cards");
  });

  it("selects Wormmon's errata search separately from its inherited Retaliation clause", () => {
    const onPlay = cardEffectClauseForTiming("EX3-055", "OnPlay");
    const inherited = cardEffectClauseForTiming("EX3-055", "AllTurns");

    expect(onPlay).toContain("trash 1 such card among them");
    expect(onPlay).toContain("bottom of your deck in any order");
    expect(onPlay).not.toContain("Retaliation");
    expect(inherited).toContain("[All Turns]");
    expect(inherited).toContain("While you have a red Digimon in play");
    expect(inherited).toContain("＜Retaliation＞");
    expect(inherited).not.toContain("Reveal the top 3 cards");
  });

  it("keeps Guilmon's delete and fallback mill together in its On Deletion explanation", () => {
    const onDeletion = cardEffectClauseForTiming("EX3-056", "OnDeletion");

    expect(onDeletion).toContain("Delete 1 of your opponent's Digimon with 3000 DP or less");
    expect(onDeletion).toContain("If no Digimon is deleted by this effect");
    expect(onDeletion).toContain("trash the top 2 cards of both players' decks");
  });

  it("separates Growlmon's errata When Digivolving clause from its inherited attack cost", () => {
    const whenDigivolving = cardEffectClauseForTiming("EX3-057", "WhenDigivolving");
    const whenAttacking = cardEffectClauseForTiming("EX3-057", "WhenAttacking");

    expect(whenDigivolving).toContain("Delete 1 of your opponent's Digimon with 3000 DP or less");
    expect(whenDigivolving).toContain("trash the top 2 cards of both players' decks");
    expect(whenDigivolving).not.toContain("Security Attack +1");
    expect(whenAttacking).toContain("[When Attacking][Once Per Turn]");
    expect(whenAttacking).toContain("By deleting 1 of your other Digimon");
    expect(whenAttacking).toContain("Security Attack +1");
    expect(whenAttacking).not.toContain("3000 DP or less");
  });

  it("selects Gatomon's errata search and inherited Rush clauses independently", () => {
    const search = cardEffectClauseForTiming("EX3-030", "OnPlay");
    const inherited = cardEffectClauseForTiming("EX3-030", "YourTurn");

    expect(search).toContain("[Angel], [Cherub], [Throne], [Authority], [Seraph] or [Virtue]");
    expect(search).toContain("other than [Three Great Angels]");
    expect(search).not.toContain("gains ＜Rush＞");
    expect(inherited).toContain("[Your Turn] [Once Per Turn]");
    expect(inherited).toContain("1 of those Digimon gains ＜Rush＞ for the turn");
    expect(inherited).not.toContain("Reveal the top 4 cards");
  });

  it("selects Veedramon's Dramon search and inherited Rush clauses independently", () => {
    const search = cardEffectClauseForTiming("EX3-031", "WhenDigivolving");
    const inherited = cardEffectClauseForTiming("EX3-031", "YourTurn");

    expect(search).toContain("1 yellow card with [Dramon] in its name");
    expect(search).toContain("1 card with [Four Great Dragons] in its traits");
    expect(search).toContain("bottom of your deck in any order");
    expect(search).not.toContain("gains <Rush>");
    expect(inherited).toContain("[Your Turn] [Once Per Turn]");
    expect(inherited).toContain("1 of those Digimon gains <Rush> for the turn");
    expect(inherited).not.toContain("Reveal the top 4 cards");
  });

  it("keeps Metallicdramon's complete On Play consequence separate from its opponent-turn keywords", () => {
    const onPlay = cardEffectClauseForTiming("EX3-053", "OnPlay");
    const opponentTurn = cardEffectClauseForTiming("EX3-053", "OpponentsTurn");

    expect(onPlay).toContain("＜De-Digivolve 1＞ all of your opponent's Digimon");
    expect(onPlay).toContain("delete 1 of your opponent's Digimon with a play cost of 5 or less");
    expect(onPlay).toContain("If no Digimon is deleted by this effect");
    expect(onPlay).toContain("unsuspended Digimon can digivolve");
    expect(onPlay).not.toContain("＜Blocker＞");
    expect(opponentTurn).toContain("While you have a Tamer in play");
    expect(opponentTurn).toContain("＜Blocker＞ and ＜Reboot＞");
    expect(opponentTurn).not.toContain("De-Digivolve");
  });

  it("replaces declarative effect record action names with From Master to Disciple's printed clause", () => {
    const clause = playerFacingEffectClause({
      cardId: "ST12-15",
      timing: "Main",
      description: "[Main] RevealAdd, PlaceInBattleAreaSelf",
    });

    expect(clause).toContain("[Main] Reveal the top 3 cards of your deck");
    expect(clause).toContain("place this card in your Battle Area");
    expect(clause).not.toContain("RevealAdd");
    expect(clause).not.toContain("PlaceInBattleAreaSelf");
    expect(clause).not.toContain("＜Delay＞");
  });

  it("uses the printed security box when a generated Security description leaks through", () => {
    const clause = playerFacingEffectClause({
      cardId: "ST12-15",
      timing: "Security",
      description: "[Security] RevealAdd, PlaceInBattleAreaSelf",
    });

    expect(clause).toContain("[Security] Reveal 3 cards from the top of your deck");
    expect(clause).not.toContain("RevealAdd");
  });

  it("preserves explicit human-readable effect descriptions", () => {
    const description = "[When Attacking][Inherited] You may play 1 [Sistermon].";
    expect(playerFacingEffectClause({ cardId: "ST12-08", timing: "OnAllyAttack", description })).toBe(description);
  });

  it("shows Jazamon's friendly printed Hina action instead of the generated SubTrigger name", () => {
    const clause = playerFacingEffectClause({
      cardId: "EX3-047",
      timing: "YourTurn",
      description: "[Your Turn] SubTrigger",
    });

    expect(clause).toContain("[Your Turn][Once Per Turn]");
    expect(clause).toContain("When you play [Hina Kurihara], gain 1 memory");
    expect(clause).not.toContain("SubTrigger");
  });

  it("shows Sealsdramon's inherited D-Brigade Rush clause without leaking the generated watcher", () => {
    const clause = playerFacingEffectClause({
      cardId: "EX3-049",
      timing: "YourTurn",
      description: "[Your Turn] SubTrigger",
    });

    expect(clause).toContain("[Your Turn][Once Per Turn]");
    expect(clause).toContain("another Digimon with [D-Brigade] in its traits");
    expect(clause).toContain("it gains ＜Rush＞ for the turn");
    expect(clause).not.toContain("SubTrigger");
    expect(clause).not.toContain("Jamming");
  });

  it("shows Cyberdramon's complete inherited DP condition instead of an Aura label", () => {
    const clause = playerFacingEffectClause({
      cardId: "EX3-050",
      timing: "AllTurns",
      description: "[All Turns] Aura",
    });

    expect(clause).toContain("[All Turns]");
    expect(clause).toContain("While you have a suspended Tamer in play");
    expect(clause).toContain("this Digimon gets +2000 DP");
    expect(clause).not.toContain("Aura");
  });

  it("separates Tankdramon's evolution reveal from its inherited D-Brigade attack reveal", () => {
    const evolution = playerFacingEffectClause({
      cardId: "EX3-051",
      timing: "WhenDigivolving",
      description: "[When Digivolving] RevealAdd",
    });
    const inherited = playerFacingEffectClause({
      cardId: "EX3-051",
      timing: "YourTurn",
      description: "[Your Turn] SubTrigger",
    });

    expect(evolution).toContain("Reveal the top 3 cards of your deck");
    expect(evolution).toContain("play cost of 5 or less");
    expect(evolution).not.toContain("When one of your Digimon");
    expect(inherited).toContain("[Your Turn][Once Per Turn]");
    expect(inherited).toContain("When one of your Digimon with [D-Brigade] in its traits attacks");
    expect(inherited).toContain("reveal the top 2 cards of your deck");
    expect(inherited).not.toContain("SubTrigger");
  });

  it("replaces an IR summary whose action phrases carry punctuation", () => {
    // Xeno's watcher renders as phrases, not bare action kinds, so the older
    // shape test let "card(s)" and "target(s)" through to the board.
    const clause = playerFacingEffectClause({
      cardId: "EX11-066",
      timing: "AllTurns",
      description: "[All Turns] Reveal top 2 and add, Place 2 card(s) under",
    });

    expect(clause).not.toContain("card(s)");
    expect(clause).not.toContain("Reveal top 2 and add");
  });

  it("keeps a keyword grant from reaching the board as an IR phrase", () => {
    const clause = playerFacingEffectClause({
      cardId: "EX3-049",
      timing: "YourTurn",
      description: "[Your Turn] Gain ＜Rush＞",
    });

    expect(clause).not.toBe("[Your Turn] Gain ＜Rush＞");
  });

  it("separates Jazarichmon's On Play sequence from its inherited Security Attack condition", () => {
    const onPlay = playerFacingEffectClause({
      cardId: "EX3-052",
      timing: "OnPlay",
      description: "[OnPlay] DeDigivolve",
    });
    const inherited = playerFacingEffectClause({
      cardId: "EX3-052",
      timing: "YourTurn",
      description: "[Your Turn] Aura",
    });

    expect(onPlay).toContain("De-Digivolve 1");
    expect(onPlay).toContain("Then, you may play 1 [Hina Kurihara]");
    expect(onPlay).not.toContain("Security Attack +1");
    expect(inherited).toContain("[Your Turn]");
    expect(inherited).toContain("While this Digimon has an [On Play] effect");
    expect(inherited).toContain("Security Attack +1");
    expect(inherited).not.toContain("Aura");
  });
});
