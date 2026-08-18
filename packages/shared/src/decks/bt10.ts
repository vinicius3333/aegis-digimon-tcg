import { CardColor } from "../schema/enums.js";
import { defineMetaDeck, type MetaDeck } from "./types.js";

/** BT10 Xros Heart / Blue Flare format (from 2022-10-14). */
export const BT10_DECKS: readonly MetaDeck[] = [
  defineMetaDeck({
    deckId: "bt10-xros-heart",
    revision: 1,
    name: "Xros Heart",
    block: "BT10",
    archetype: "Xros Heart",
    colors: [CardColor.Red, CardColor.Yellow, CardColor.Black, CardColor.Green, CardColor.Purple],
    source:
      "BT10 Xros Encounter format, the set's defining tier-1 deck: Shoutmon X4/X5 DigiXros lines under the four Xros Heart Tamers.",
    approximation:
      "Shoutmon X4 (BT10-009) is capped at 1 by the banlist in force (restricted 2022-11-11), where the era ran 4. The three freed slots became Dondokomon (BT10-007), a Lv.3 Xros Heart body that feeds the same DigiXros conditions.",
    mainDeck: [
      { cardId: "BT10-007", count: 4 }, // Dondokomon        Lv.3 Red,   free digivolve from a Xros Heart egg
      { cardId: "BT10-008", count: 4 }, // Shoutmon          Lv.3 Red,   On Play digs for Digimon + Tamer
      { cardId: "BT10-029", count: 4 }, // Starmons          Lv.3 Yellow, DigiXros material
      { cardId: "BT10-060", count: 4 }, // Sparrowmon        Lv.3 Black,  +3000 DP beside another Xros Heart
      { cardId: "BT10-034", count: 4 }, // Dorulumon         Lv.4 Yellow, On Play -3000 DP
      { cardId: "BT10-049", count: 4 }, // Ballistamon       Lv.4 Green,  conditional Blocker
      { cardId: "BT10-111", count: 4 }, // Shoutmon (King)   Lv.4 Red,    treated as Shoutmon; recurs a DigiXros card
      { cardId: "BT10-009", count: 1 }, // Shoutmon X4       Lv.4 Red/Yellow, Material Save 2 (banlist: 1)
      { cardId: "BT10-013", count: 4 }, // Shoutmon X5       Lv.5 Red/Black, Blocker + Security Attack +1
      { cardId: "BT10-015", count: 2 }, // Shoutmon X5B      Lv.6 Red/Purple, Blocker + Armor Purge
      { cardId: "BT10-087", count: 4 }, // Taiki Kudo        Tamer, DigiXros enabler
      { cardId: "BT10-089", count: 4 }, // Akari Hinomoto    Tamer, free Dorulumon
      { cardId: "BT10-090", count: 4 }, // Zenjiro Tsurugi   Tamer, free Ballistamon
      { cardId: "BT10-095", count: 3 }, // Hero of the Skies! Option, Security Attack +1 / Draw 2
    ],
    eggDeck: [
      { cardId: "BT10-003", count: 4 }, // Pickmons     Draw 1 when a Xros Heart Digimon attacks
      { cardId: "BT10-001", count: 1 }, // DemiMeramon  +1000 DP with an off-red source
    ],
  }),
  defineMetaDeck({
    deckId: "bt10-blue-flare",
    revision: 1,
    name: "Blue Flare",
    block: "BT10",
    archetype: "Blue Flare",
    colors: [CardColor.Blue, CardColor.Black],
    source:
      "BT10 Xros Encounter format: the set's mono-blue Blue Flare shell, Greymon/MailBirdramon into MetalGreymon into DeckerGreymon under Kiriha Aonuma.",
    approximation:
      "Blue Flare prints only one Lv.3 of its own (Gaossmon), so the rookie count is filled with the pool's blue Lv.3 bodies rather than era-specific tech choices.",
    mainDeck: [
      { cardId: "BT10-018", count: 4 }, // Gaossmon        Lv.3, On Deletion frees a Lv.4 Blue Flare
      { cardId: "BT10-017", count: 4 }, // Bulucomon       Lv.3, 5000 DP body for 2
      { cardId: "BT9-021", count: 4 }, //  Jellymon        Lv.3 filler rookie
      { cardId: "BT10-019", count: 4 }, // Greymon         Lv.4, digs two Blue Flare cards
      { cardId: "BT10-020", count: 4 }, // Deckerdramon    Lv.4, draws off the opposing board
      { cardId: "BT10-021", count: 4 }, // MailBirdramon   Lv.4, free Kiriha / MetalGreymon recursion
      { cardId: "BT10-024", count: 4 }, // MetalGreymon    Lv.5, DigiXros + Material Save 2
      { cardId: "BT10-025", count: 4 }, // Cyberdramon     Lv.5, unsuspends a Blue Flare from hand
      { cardId: "BT10-026", count: 4 }, // DeckerGreymon   Lv.5, Armor Purge finisher
      { cardId: "BT10-027", count: 2 }, // Regalecusmon    Lv.6, strips digivolution cards
      { cardId: "BT10-028", count: 2 }, // Cannondramon    Lv.6, repeat-blocking wall
      { cardId: "BT10-088", count: 4 }, // Kiriha Aonuma   Tamer, memory floor of 3
      { cardId: "BT10-097", count: 4 }, // Blazing Memory Boost!      Option
      { cardId: "BT10-098", count: 2 }, // Plasma Deckerdra Launcher  Option, bounces a Lv.6+
    ],
    eggDeck: [
      { cardId: "BT10-002", count: 4 }, // Bebydomon  Draw 1 when attacking into a wide board
      { cardId: "BT9-002", count: 1 }, //  Puyoyomon
    ],
  }),
];
