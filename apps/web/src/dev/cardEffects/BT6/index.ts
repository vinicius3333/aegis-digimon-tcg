import type { CardEffectsFixtureBuilder } from "../fixture";
import { effectBt3Demo, vanillaBt3Demo } from "../vanilla";

export const bt6Fixtures: Record<string, CardEffectsFixtureBuilder> = {
  "BT6-001": (cardId) =>
    effectBt3Demo(
      cardId,
      "DemiMeramon",
      0,
      "DemiMeramon gave its host +1000 DP when attacking a player, but not when attacking a Digimon.",
    ),
  "BT6-002": (cardId) =>
    effectBt3Demo(
      cardId,
      "Kyaromon",
      0,
      "Kyaromon drew once when an opponent's digivolution card was trashed on your turn.",
    ),
  "BT6-003": (cardId) =>
    effectBt3Demo(cardId, "Bibimon", 0, "Bibimon gained 1 memory when attacking with exactly 3 security cards."),
  "BT6-004": (cardId) =>
    effectBt3Demo(cardId, "Pinamon", 0, "Pinamon drew when its host attacked an opposing Digimon."),
  "BT6-005": (cardId) =>
    effectBt3Demo(cardId, "Pagumon", 0, "Pagumon added a revealed black Digimon to hand when its host was deleted."),
  "BT6-006": (cardId) =>
    effectBt3Demo(cardId, "Tsunomon", 0, "Tsunomon drew once when one of your effects trashed a card in hand."),
  "BT6-007": (cardId) =>
    effectBt3Demo(
      cardId,
      "Agumon",
      2000,
      "Agumon gained memory when you played Tai Kamiya and grants Security Attack +1 to an inherited Bond of Bravery host.",
    ),
  "BT6-008": (cardId) => effectBt3Demo(cardId, "Shoutmon", 2000, "Shoutmon drew when its Blitz host attacked."),
  "BT6-009": (cardId) =>
    effectBt3Demo(
      cardId,
      "Huckmon",
      2000,
      "Huckmon revealed cards and offered every unchosen card for explicit deck-bottom ordering.",
    ),
  "BT6-010": (cardId) =>
    effectBt3Demo(cardId, "Flamemon", 3000, "Flamemon granted Piercing to a Hybrid host during your turn."),
  "BT6-011": (cardId) =>
    effectBt3Demo(
      cardId,
      "BaoHuckmon",
      6000,
      "BaoHuckmon deleted a 5000 DP Digimon when attacking while you had Sistermon.",
    ),
  "BT6-012": (cardId) => vanillaBt3Demo(cardId, "Deltamon", 7000),
  "BT6-013": (cardId) =>
    effectBt3Demo(
      cardId,
      "Megadramon",
      7000,
      "Megadramon is treated as black in the battle area and gives its host +2000 DP during your turn.",
    ),
  "BT6-014": (cardId) => effectBt3Demo(cardId, "Asuramon", 8000, "Asuramon gained Blitz when digivolving."),
  "BT6-015": (cardId) =>
    effectBt3Demo(
      cardId,
      "SaviorHuckmon",
      7000,
      "SaviorHuckmon played a Sistermon from hand when digivolving and its inherited effect enables one reattack.",
    ),
  "BT6-016": (cardId) =>
    effectBt3Demo(
      cardId,
      "Jesmon",
      11000,
      "Jesmon played a Sistermon when attacking and gains +3000 DP from the inherited effect.",
    ),
  "BT6-017": (cardId) =>
    effectBt3Demo(
      cardId,
      "MagnaKidmon",
      11000,
      "MagnaKidmon has Security Attack +1, can use a cost-7 Option for free, or delete a 4000 DP Digimon.",
    ),
  "BT6-018": (cardId) =>
    effectBt3Demo(
      cardId,
      "Agumon - Bond of Bravery",
      14000,
      "Agumon - Bond of Bravery deleted up to 13000 DP when attacking and trashes security once per turn on deletion.",
    ),
  "BT6-019": (cardId) =>
    effectBt3Demo(
      cardId,
      "Gabumon",
      2000,
      "Gabumon gains memory once per turn when matching Matt Tamers are played and unsuspends its Bond host after attacking.",
    ),
  "BT6-020": (cardId) =>
    effectBt3Demo(
      cardId,
      "Lobomon",
      2000,
      "Lobomon gave its host +2000 DP while the opponent had no Digimon with sources.",
    ),
  "BT6-021": (cardId) =>
    effectBt3Demo(cardId, "Tinkermon", 2000, "Tinkermon blocked opponent memory gain except from Tamer effects."),
  "BT6-022": (cardId) =>
    effectBt3Demo(cardId, "Strabimon", 3000, "Strabimon gained 1 memory when its Hybrid host attacked."),
  "BT6-023": (cardId) => vanillaBt3Demo(cardId, "Octomon", 7000),
  "BT6-024": (cardId) =>
    effectBt3Demo(
      cardId,
      "AncientGarurumon",
      5000,
      "AncientGarurumon gains Jamming while the opponent has no Digimon with sources and trashes a bottom source when attacking.",
    ),
  "BT6-025": (cardId) => effectBt3Demo(cardId, "Panjyamon", 6000, "Panjyamon gained 1 memory when its host attacked."),
  "BT6-026": (cardId) =>
    effectBt3Demo(
      cardId,
      "Dragomon",
      7000,
      "Dragomon returned a level 4 source-less opposing Digimon to hand when digivolving.",
    ),
  "BT6-027": (cardId) =>
    effectBt3Demo(
      cardId,
      "Majiramon",
      7000,
      "Majiramon trashed the top source when digivolving and permits one reattack while the opponent has no Digimon.",
    ),
  "BT6-028": (cardId) =>
    effectBt3Demo(
      cardId,
      "Pukumon",
      11000,
      "Pukumon Digi-Bursted 2 to prevent all own Digimon from being blocked for the turn.",
    ),
  "BT6-029": (cardId) =>
    effectBt3Demo(
      cardId,
      "Azulongmon",
      13000,
      "Azulongmon trashed each bottom source, gained memory for source-less opponents, and gains Security Attack +1 for each.",
    ),
  "BT6-030": (cardId) =>
    effectBt3Demo(
      cardId,
      "Gabumon - Bond of Friendship",
      14000,
      "Gabumon - Bond of Friendship unsuspended and bottom-decked a level 5 Digimon after trashing its sources.",
    ),
  "BT6-031": (cardId) =>
    effectBt3Demo(cardId, "Tinkermon", 2000, "Tinkermon gave an opposing Digimon Security Attack -1 when deleted."),
  "BT6-032": (cardId) =>
    effectBt3Demo(cardId, "Tapirmon", 2000, "Tapirmon drew once when its host removed a card from your security."),
  "BT6-033": (cardId) =>
    effectBt3Demo(
      cardId,
      "Pulsemon",
      2000,
      "Pulsemon could trash security down to three for memory and grants inherited Jamming at exactly three security.",
    ),
  "BT6-034": (cardId) =>
    effectBt3Demo(
      cardId,
      "Wizardmon",
      4000,
      "Wizardmon gained 1 memory when its host removed a card from your security.",
    ),
  "BT6-035": (cardId) =>
    effectBt3Demo(
      cardId,
      "Baluchimon",
      5000,
      "Baluchimon drew two cards when its owner had three or fewer security cards.",
    ),
  "BT6-036": (cardId) =>
    effectBt3Demo(
      cardId,
      "Mimicmon",
      3000,
      "Mimicmon gained two memory when its owner had three or fewer security cards.",
    ),
  "BT6-037": (cardId) =>
    effectBt3Demo(
      cardId,
      "Manticoremon",
      5000,
      "Manticoremon gained Security Attack +1 while you had at least three security cards.",
    ),
  "BT6-038": (cardId) => vanillaBt3Demo(cardId, "Apemon", 8000),
  "BT6-039": (cardId) =>
    effectBt3Demo(
      cardId,
      "Mammothmon",
      6000,
      "Mammothmon gave its host +1000 DP while you had at most three security cards.",
    ),
  "BT6-040": (cardId) =>
    effectBt3Demo(
      cardId,
      "Mistymon",
      7000,
      "Mistymon gave an opposing Digimon -2000 DP when its host removed your security.",
    ),
  "BT6-041": (cardId) =>
    effectBt3Demo(
      cardId,
      "Mistymon",
      7000,
      "Mistymon trashed the top security card to give an opposing Digimon -5000 DP when attacking.",
    ),
  "BT6-042": (cardId) => vanillaBt3Demo(cardId, "Babamon", 10000),
  "BT6-043": (cardId) =>
    effectBt3Demo(
      cardId,
      "SkullMammothmon",
      11000,
      "SkullMammothmon has Blocker and gets +2000 DP while you have at most 3 security cards.",
    ),
  "BT6-044": (cardId) =>
    effectBt3Demo(
      cardId,
      "Dynasmon",
      12000,
      "Dynasmon revealed 6, paid a security cost, and recovered an eligible card.",
    ),
  "BT6-045": (cardId) =>
    effectBt3Demo(
      cardId,
      "Bakomon",
      2000,
      "Bakomon gained 1 memory when attacking while the opponent had 2 suspended Digimon.",
    ),
  "BT6-046": (cardId) => vanillaBt3Demo(cardId, "Pomumon", 5000),
  "BT6-047": (cardId) =>
    effectBt3Demo(cardId, "Morphomon", 1000, "Morphomon added Menoa and Eosmon from the top 5 on deletion."),
  "BT6-048": (cardId) => vanillaBt3Demo(cardId, "Parasaurmon", 5000),
  "BT6-049": (cardId) =>
    effectBt3Demo(cardId, "Arbormon", 5000, "Arbormon digivolved onto a green Tamer for 2 memory."),
  "BT6-050": (cardId) =>
    effectBt3Demo(
      cardId,
      "Petaldramon",
      7000,
      "Petaldramon digivolved onto a green Tamer and has Piercing, rejecting zero-cost evolution on non-green Tamers.",
    ),
  "BT6-051": (cardId) =>
    effectBt3Demo(
      cardId,
      "Toropiamon",
      6000,
      "Toropiamon suspended an opposing 5000 DP Digimon when its host attacked.",
    ),
  "BT6-052": (cardId) =>
    effectBt3Demo(
      cardId,
      "Entmon",
      8000,
      "Entmon unsuspended after deleting an opposing Digimon in battle and could attack again.",
    ),
  "BT6-053": (cardId) =>
    effectBt3Demo(
      cardId,
      "Eldradimon",
      12000,
      "Eldradimon has Security Attack +1 and prevents effect DP reduction during the opponent's turn.",
    ),
  "BT6-054": (cardId) =>
    effectBt3Demo(
      cardId,
      "AncientTroymon",
      13000,
      "AncientTroymon suspended up to two opposing non-Blockers when the opponent attacked and plays a green level 4 Hybrid on deletion.",
    ),
  "BT6-055": (cardId) => effectBt3Demo(cardId, "Junkmon", 2000, "Junkmon gained 1 memory when its host was deleted."),
  "BT6-056": (cardId) =>
    effectBt3Demo(cardId, "Chikurimon", 1000, "Chikurimon De-Digivolved an opposing Digimon from Security."),
  "BT6-057": (cardId) =>
    effectBt3Demo(cardId, "ToyAgumon", 2000, "ToyAgumon gave its host +1000 DP while the host had Blocker."),
  "BT6-058": (cardId) => effectBt3Demo(cardId, "Nanimon", 2000, "Nanimon played itself from its Security effect."),
  "BT6-059": (cardId) => effectBt3Demo(cardId, "Machmon", 5000, "Machmon has Decoy (Black)."),
  "BT6-060": (cardId) =>
    effectBt3Demo(
      cardId,
      "Deputymon",
      4000,
      "Deputymon revealed cards, added a Three Musketeers Digimon and cost-7 Option, and trashed the rest.",
    ),
  "BT6-061": (cardId) =>
    effectBt3Demo(
      cardId,
      "Gigadramon",
      7000,
      "Gigadramon is treated as red in the battle area and gives its host +2000 DP during the opponent's turn.",
    ),
  "BT6-062": (cardId) =>
    effectBt3Demo(
      cardId,
      "Volcanomon",
      7000,
      "Volcanomon gave its host Security Attack +1 while an opposing Digimon was unsuspended.",
    ),
  "BT6-063": (cardId) => vanillaBt3Demo(cardId, "BigMamemon", 10000),
  "BT6-064": (cardId) =>
    effectBt3Demo(cardId, "Mamemon", 6000, "Mamemon has Decoy and deletes a play-cost-7 Digimon on deletion."),
  "BT6-065": (cardId) =>
    effectBt3Demo(
      cardId,
      "Gundramon",
      11000,
      "Gundramon has Blocker and may use a revealed cost-7 Option without paying its cost.",
    ),
  "BT6-066": (cardId) =>
    effectBt3Demo(
      cardId,
      "PileVolcamon",
      11000,
      "PileVolcamon has Reboot and De-Digivolves once per turn when another own Digimon is deleted on the opponent's turn.",
    ),
  "BT6-067": (cardId) =>
    effectBt3Demo(
      cardId,
      "Gankoomon",
      12000,
      "Gankoomon deleted all opposing Digimon tied for lowest play cost and gains Security Attack +1 while the opponent has an unsuspended Digimon.",
    ),
  "BT6-068": (cardId) =>
    effectBt3Demo(
      cardId,
      "Impmon",
      2000,
      "Impmon could trash a hand card to return a Three Musketeers Digimon from trash.",
    ),
  "BT6-069": (cardId) =>
    effectBt3Demo(
      cardId,
      "Goblimon",
      2000,
      "Goblimon gave its host +2000 DP once per turn when effects trashed cards from hand.",
    ),
  "BT6-070": (cardId) =>
    effectBt3Demo(cardId, "Elecmon", 2000, "Elecmon deleted an opposing level 3 Digimon when deleted."),
  "BT6-071": (cardId) =>
    effectBt3Demo(
      cardId,
      "Kinkakumon",
      5000,
      "Kinkakumon trashed a card from hand to delete an opposing level 3 Digimon when attacking.",
    ),
  "BT6-072": (cardId) =>
    effectBt3Demo(
      cardId,
      "Ogremon",
      4000,
      "Ogremon could trash a card from hand to delete an opposing level 4 or lower Digimon.",
    ),
  "BT6-073": (cardId) =>
    effectBt3Demo(
      cardId,
      "Ginkakumon",
      5000,
      "Ginkakumon gained 1 memory once per turn when an effect trashed a card from hand.",
    ),
  "BT6-074": (cardId) => vanillaBt3Demo(cardId, "Boogiemon", 7000),
  "BT6-075": (cardId) =>
    effectBt3Demo(
      cardId,
      "Ginkakumon Promote",
      6000,
      "Ginkakumon Promote has Rush and places the required named cards under itself, then draws and gains memory.",
    ),
  "BT6-076": (cardId) => vanillaBt3Demo(cardId, "Feresmon", 9000),
  "BT6-077": (cardId) =>
    effectBt3Demo(
      cardId,
      "Rebellimon",
      7000,
      "Rebellimon is treated as purple and black and can trash a card from hand to gain Blocker and Retaliation.",
    ),
  "BT6-078": (cardId) =>
    effectBt3Demo(
      cardId,
      "SkullGreymon",
      7000,
      "SkullGreymon gains DP when a card is trashed from hand and grants Retaliation; when trashed, it can go under a purple Digimon.",
    ),
  "BT6-079": (cardId) =>
    effectBt3Demo(
      cardId,
      "Murmukusmon",
      10000,
      "Murmukusmon has Retaliation and plays Ornismon from trash on deletion when the trash has enough cards.",
    ),
  "BT6-080": (cardId) =>
    effectBt3Demo(
      cardId,
      "Ornismon",
      12000,
      "Ornismon has Security Attack +1 and deletes an opposing level 5 or lower Digimon when played.",
    ),
  "BT6-081": (cardId) =>
    effectBt3Demo(cardId, "Titamon", 12000, "Titamon gains DP and Security Attack +1 after trashing cards from hand."),
  "BT6-082": (cardId) =>
    effectBt3Demo(
      cardId,
      "Sistermon Blanc",
      3000,
      "Sistermon Blanc grants Blocker to Sistermon Digimon and draws 1 when played.",
    ),
  "BT6-083": (cardId) =>
    effectBt3Demo(
      cardId,
      "Eosmon",
      4000,
      "Eosmon gains memory when played and can draw an Eosmon from the deck when attacking.",
    ),
  "BT6-084": (cardId) =>
    effectBt3Demo(
      cardId,
      "Sistermon Ciel",
      5000,
      "Sistermon Ciel gives Huckmon and Royal Knight Digimon +2000 DP and gains 1 memory when played.",
    ),
  "BT6-085": (cardId) =>
    effectBt3Demo(
      cardId,
      "Eosmon",
      6000,
      "Eosmon gains an attack effect that draws an Eosmon and can play Eosmon from hand.",
    ),
  "BT6-086": (cardId) =>
    effectBt3Demo(
      cardId,
      "Eosmon",
      13000,
      "Eosmon gains memory and draws when another Eosmon is deleted, then can play a level 5 or lower Eosmon from hand.",
    ),
  "BT6-087": (cardId) =>
    effectBt3Demo(
      cardId,
      "Tai Kamiya",
      0,
      "Tai Kamiya gains memory and draws when Agumon or Greymon moves from breeding, and enables Agumon Bond of Bravery digivolution.",
    ),
  "BT6-088": (cardId) =>
    effectBt3Demo(
      cardId,
      "Matt Ishida",
      0,
      "Matt Ishida gains memory and draws when Gabumon or Garurumon moves from breeding, and enables Gabumon Bond of Friendship digivolution.",
    ),
  "BT6-089": (cardId) =>
    effectBt3Demo(
      cardId,
      "T.K. Takaishi & Kari Kamiya",
      0,
      "T.K. and Kari recover or add security and gain memory when security is reduced.",
    ),
  "BT6-090": (cardId) =>
    effectBt3Demo(
      cardId,
      "Izzy Izumi & Joe Kido",
      0,
      "Izzy and Joe reveal cards and gain memory when an opponent has 2 or more Digimon in play.",
    ),
  "BT6-091": (cardId) =>
    effectBt3Demo(
      cardId,
      "Sora Takenouchi & Mimi Tachikawa",
      0,
      "Sora and Mimi suspend an opposing Digimon and gain memory when a Digimon is deleted by an effect.",
    ),
  "BT6-092": (cardId) =>
    effectBt3Demo(
      cardId,
      "Menoa Bellucci",
      0,
      "Menoa reduces the digivolution cost of Eosmon and draws when an Eosmon is played.",
    ),
  "BT6-093": (cardId) =>
    effectBt3Demo(
      cardId,
      "Judgement of the Blade",
      0,
      "Judgement of the Blade deletes an opposing Digimon with a play cost of 7 or less.",
    ),
  "BT6-094": (cardId) =>
    effectBt3Demo(
      cardId,
      "Red Reamer",
      0,
      "Red Reamer deletes an opposing Digimon with 4000 DP or less and can be used from security.",
    ),
  "BT6-095": (cardId) =>
    effectBt3Demo(
      cardId,
      "Happy Bullet Showering",
      0,
      "Happy Bullet Showering deletes up to two opposing Digimon with 3000 DP or less.",
    ),
  "BT6-096": (cardId) =>
    effectBt3Demo(
      cardId,
      "Forbidden Trident",
      0,
      "Forbidden Trident gives one of your Digimon Security Attack +1 and allows it to attack an opponent's Digimon.",
    ),
  "BT6-097": (cardId) =>
    effectBt3Demo(
      cardId,
      "Howling Memory Boost!",
      0,
      "Howling Memory Boost! reveals cards to add a Gabumon or Garurumon and sets up a delayed memory gain.",
    ),
  "BT6-098": (cardId) =>
    effectBt3Demo(
      cardId,
      "Raddle Star",
      0,
      "Raddle Star returns an opposing level 4 or lower Digimon to its owner's hand.",
    ),
  "BT6-099": (cardId) =>
    effectBt3Demo(cardId, "Acid Injection", 0, "Acid Injection deletes an opposing Digimon with 5000 DP or less."),
  "BT6-100": (cardId) =>
    effectBt3Demo(
      cardId,
      "Reinforcing Memory Boost!",
      0,
      "Reinforcing Memory Boost! reveals cards to add a Tamer and sets up a delayed memory gain.",
    ),
  "BT6-101": (cardId) =>
    effectBt3Demo(
      cardId,
      "Wyvern's Breath",
      0,
      "Wyvern's Breath returns an opposing level 5 or lower Digimon to its owner's hand.",
    ),
  "BT6-102": (cardId) =>
    effectBt3Demo(cardId, "Tropical Venom", 0, "Tropical Venom suspends an opposing Digimon and reduces its DP."),
  "BT6-103": (cardId) =>
    effectBt3Demo(cardId, "Blasted Disaster", 0, "Blasted Disaster deletes an opposing Digimon with 6000 DP or less."),
  "BT6-104": (cardId) =>
    effectBt3Demo(
      cardId,
      "Parabolic Junk",
      0,
      "Parabolic Junk trashes a card from an opponent's hand and draws 1 card.",
    ),
  "BT6-105": (cardId) =>
    effectBt3Demo(cardId, "Gewalt Schwärmer", 0, "Gewalt Schwärmer deletes an opposing Digimon with 7000 DP or less."),
  "BT6-106": (cardId) =>
    effectBt3Demo(
      cardId,
      "Iron-Fisted Onslaught",
      0,
      "Iron-Fisted Onslaught deletes an opposing Digimon with 5000 DP or less and an opposing Tamer.",
    ),
  "BT6-107": (cardId) =>
    effectBt3Demo(
      cardId,
      "Glaive Memory Boost!",
      0,
      "Glaive Memory Boost! reveals cards to add a purple Digimon and sets up a delayed memory gain.",
    ),
  "BT6-108": (cardId) =>
    effectBt3Demo(
      cardId,
      "Underworld's Call",
      0,
      "Underworld's Call plays a purple Digimon from trash while suspending one of your Digimon.",
    ),
  "BT6-109": (cardId) =>
    effectBt3Demo(cardId, "Fly Bullet", 0, "Fly Bullet deletes an opposing Digimon with 3000 DP or less."),
  "BT6-110": (cardId) =>
    effectBt3Demo(cardId, "Cutting Edge", 0, "Cutting Edge deletes an opposing Digimon with 7000 DP or less."),
  "BT6-111": (cardId) =>
    effectBt3Demo(
      cardId,
      "Alphamon",
      11000,
      "Alphamon places a card from its hand under itself when digivolving and gains Security Attack +1 while it has a Digimon card under it.",
    ),
  "BT6-112": (cardId) =>
    effectBt3Demo(
      cardId,
      "BeelStarmon",
      11000,
      "BeelStarmon reduces its play cost for each tamer and can play a cost-7 Option from trash when played.",
    ),
};
