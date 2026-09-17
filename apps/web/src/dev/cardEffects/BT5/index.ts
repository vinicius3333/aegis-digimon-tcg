import type { CardEffectsFixtureBuilder } from "../fixture";
import { effectBt3Demo, vanillaBt3Demo } from "../vanilla";

export const bt5Fixtures: Record<string, CardEffectsFixtureBuilder> = {
  "BT5-001": (cardId) => effectBt3Demo(cardId, "Koromon", 0, "Koromon drew once when its Greymon host attacked."),
  "BT5-002": (cardId) =>
    effectBt3Demo(cardId, "Tsunomon", 0, "Tsunomon gave its Garurumon host +1000 DP during your turn."),
  "BT5-003": (cardId) =>
    effectBt3Demo(
      cardId,
      "Pickmon",
      0,
      "Pickmon gave an opposing Digimon -1000 DP when its host attacked with 3 Digimon in play.",
    ),
  "BT5-004": (cardId) =>
    effectBt3Demo(cardId, "Yokomon", 0, "Yokomon gave an own Digimon +2000 DP after being trashed for Digi-Burst."),
  "BT5-005": (cardId) =>
    effectBt3Demo(cardId, "Tsumemon", 0, "Tsumemon drew once when its Unidentified host attacked."),
  "BT5-006": (cardId) =>
    effectBt3Demo(cardId, "Gigimon", 0, "Gigimon gave its host +2000 DP when another own Digimon was deleted."),
  "BT5-007": (cardId) =>
    effectBt3Demo(cardId, "Agumon", 2000, "Agumon revealed cards and added an eligible Greymon and Omnimon to hand."),
  "BT5-008": (cardId) =>
    effectBt3Demo(
      cardId,
      "Gaossmon",
      2000,
      "Gaossmon gave other Gaossmon +3000 DP during your turn and blocked opponent cost reduction.",
    ),
  "BT5-009": (cardId) =>
    effectBt3Demo(
      cardId,
      "Shoutmon",
      1000,
      "Shoutmon revealed cards and added a Shoutmon and a Digimon with Blitz to hand.",
    ),
  "BT5-010": (cardId) =>
    effectBt3Demo(
      cardId,
      "Greymon",
      5000,
      "Greymon gained memory with Agumon in its sources and boosted qualifying Greymon hosts.",
    ),
  "BT5-011": (cardId) =>
    effectBt3Demo(cardId, "Meramon", 5000, "Meramon gave another Digimon +3000 DP when digivolving."),
  "BT5-012": (cardId) =>
    effectBt3Demo(cardId, "Monochromon", 5000, "Monochromon has Blocker and loses 2 memory when attacking."),
  "BT5-013": (cardId) => vanillaBt3Demo(cardId, "Triceramon", 8000),
  "BT5-014": (cardId) =>
    effectBt3Demo(
      cardId,
      "OmniShoutmon",
      7000,
      "OmniShoutmon digivolved over Shoutmon for the alternate cost and grants Security Attack +1 to a Blitz host.",
    ),
  "BT5-015": (cardId) =>
    effectBt3Demo(
      cardId,
      "MetalGreymon: Alterous Mode",
      8000,
      "Alterous Mode deleted a 4000 DP Digimon and boosted qualifying Greymon hosts.",
    ),
  "BT5-016": (cardId) =>
    effectBt3Demo(
      cardId,
      "WarGreymon",
      11000,
      "WarGreymon deleted a Blocker with a qualifying Greymon source and deletes a 3000 DP or less opponent when attacking.",
    ),
  "BT5-017": (cardId) =>
    effectBt3Demo(
      cardId,
      "ZeigGreymon",
      11000,
      "ZeigGreymon gained Blitz when digivolving and lets a Blitz host attack an unsuspended Digimon.",
    ),
  "BT5-018": (cardId) => vanillaBt3Demo(cardId, "Dorbickmon", 11000),
  "BT5-019": (cardId) =>
    effectBt3Demo(
      cardId,
      "Shoutmon DX",
      12000,
      "Shoutmon DX placed a red Digimon under itself, deleted once per named source, and gained Blitz.",
    ),
  "BT5-020": (cardId) =>
    effectBt3Demo(cardId, "Gabumon", 2000, "Gabumon revealed cards and added a Garurumon and an Omnimon to hand."),
  "BT5-021": (cardId) =>
    effectBt3Demo(
      cardId,
      "Syakomon",
      3000,
      "Syakomon prevented the opponent from reducing digivolution costs on their turn.",
    ),
  "BT5-022": (cardId) =>
    effectBt3Demo(
      cardId,
      "Bulucomon",
      3000,
      "Bulucomon gained 1 memory when your effect trashed an opponent's digivolution card.",
    ),
  "BT5-023": (cardId) => vanillaBt3Demo(cardId, "Gesomon", 4000),
  "BT5-024": (cardId) =>
    effectBt3Demo(
      cardId,
      "Garurumon",
      5000,
      "Garurumon gained memory when digivolving with Gabumon in its sources and boosts its host.",
    ),
  "BT5-025": (cardId) =>
    effectBt3Demo(
      cardId,
      "Paledramon",
      4000,
      "Paledramon trashed up to two bottom sources from an opposing Digimon when digivolving.",
    ),
  "BT5-026": (cardId) =>
    effectBt3Demo(cardId, "Coelamon", 5000, "Coelamon has Blocker and loses 2 memory when attacking."),
  "BT5-027": (cardId) => vanillaBt3Demo(cardId, "MarineDevimon", 7000),
  "BT5-028": (cardId) =>
    effectBt3Demo(
      cardId,
      "CrysPaledramon",
      7000,
      "CrysPaledramon trashed the bottom source of every opposing Digimon and grants Security Attack +1 when one lacks sources.",
    ),
  "BT5-029": (cardId) =>
    effectBt3Demo(
      cardId,
      "WereGarurumon: Sagittarius Mode",
      8000,
      "Sagittarius Mode has Jamming with a WereGarurumon source and boosts its Garurumon host.",
    ),
  "BT5-030": (cardId) =>
    effectBt3Demo(
      cardId,
      "Neptunemon",
      10000,
      "Neptunemon cannot be targeted by an opponent's attack during their turn.",
    ),
  "BT5-031": (cardId) =>
    effectBt3Demo(
      cardId,
      "MetalGarurumon",
      11000,
      "MetalGarurumon bottom-decked an On Deletion Digimon and trashed its sources, and gains memory when its host attacks.",
    ),
  "BT5-032": (cardId) =>
    effectBt3Demo(
      cardId,
      "Hexeblaumon",
      11000,
      "Hexeblaumon trashed two bottom sources when attacking, gains Jamming, and restricts source-less opponents.",
    ),
  "BT5-033": (cardId) =>
    effectBt3Demo(
      cardId,
      "Cutemon",
      3000,
      "Cutemon prevented the opponent from reducing digivolution costs on their turn.",
    ),
  "BT5-034": (cardId) =>
    effectBt3Demo(
      cardId,
      "Kotemon",
      2000,
      "Kotemon revealed cards and added up to two yellow Warrior or Holy Warrior Digimon.",
    ),
  "BT5-035": (cardId) =>
    effectBt3Demo(cardId, "Starmons", 1000, "Starmons gave an opposing Digimon -1000 DP for each own Digimon in play."),
  "BT5-036": (cardId) =>
    effectBt3Demo(
      cardId,
      "Renamon",
      3000,
      "Renamon gave an opposing Digimon Security Attack -1 until the next turn ended.",
    ),
  "BT5-037": (cardId) =>
    effectBt3Demo(
      cardId,
      "Gladimon",
      4000,
      "Gladimon added a Warrior from security and recovered one card while preserving security size.",
    ),
  "BT5-038": (cardId) =>
    effectBt3Demo(cardId, "Kyubimon", 4000, "Kyubimon gave all opposing Security Digimon -1000 DP during your turn."),
  "BT5-039": (cardId) =>
    effectBt3Demo(cardId, "ShootingStarmon", 4000, "ShootingStarmon gave an opposing Digimon -3000 DP when deleted."),
  "BT5-040": (cardId) => vanillaBt3Demo(cardId, "SuperStarmon", 7000),
  "BT5-041": (cardId) =>
    effectBt3Demo(cardId, "Taomon", 7000, "Taomon gave all opposing Security Digimon -1000 DP during your turn."),
  "BT5-042": (cardId) =>
    effectBt3Demo(cardId, "Knightmon", 7000, "Knightmon gave one opposing Digimon -4000 DP for the turn."),
  "BT5-043": (cardId) => effectBt3Demo(cardId, "Jijimon", 10000, "Jijimon recovered the top deck card when deleted."),
  "BT5-044": (cardId) =>
    effectBt3Demo(
      cardId,
      "Sakuyamon",
      11000,
      "Sakuyamon gave an opposing Digimon Security Attack -3 from breeding and opposing Security Digimon -3000 DP during your turn.",
    ),
  "BT5-045": (cardId) =>
    effectBt3Demo(
      cardId,
      "LordKnightmon",
      11000,
      "LordKnightmon could play a yellow Warrior when attacking and gains +1000 DP for each other own Digimon.",
    ),
  "BT5-046": (cardId) =>
    effectBt3Demo(
      cardId,
      "Terriermon Assistant",
      1000,
      "Terriermon Assistant Digi-Bursted 1 to reveal and add a green Digimon.",
    ),
  "BT5-047": (cardId) =>
    effectBt3Demo(cardId, "Palmon", 2000, "Palmon placed itself from trash under an own green Digimon when deleted."),
  "BT5-048": (cardId) => vanillaBt3Demo(cardId, "Floramon", 4000),
  "BT5-049": (cardId) =>
    effectBt3Demo(cardId, "Kiwimon", 4000, "Kiwimon added all revealed Digimon with Digisorption to hand."),
  "BT5-050": (cardId) =>
    effectBt3Demo(cardId, "Weedmon", 3000, "Weedmon gained 1 memory after being trashed for its host's Digi-Burst."),
  "BT5-051": (cardId) => vanillaBt3Demo(cardId, "MoriShellmon", 7000),
  "BT5-052": (cardId) => vanillaBt3Demo(cardId, "Garbagemon", 8000),
  "BT5-053": (cardId) =>
    effectBt3Demo(cardId, "Deramon", 7000, "Deramon gained +2000 DP for each other suspended own Digimon."),
  "BT5-054": (cardId) => vanillaBt3Demo(cardId, "Piximon", 8000),
  "BT5-055": (cardId) =>
    effectBt3Demo(
      cardId,
      "BanchoLillymon",
      11000,
      "BanchoLillymon bottom-decked a suspended opposing Digimon and trashed its sources when deleted.",
    ),
  "BT5-056": (cardId) =>
    effectBt3Demo(
      cardId,
      "Rafflesimon",
      11000,
      "Rafflesimon Digi-Bursted 2 to boost an own Digimon and restrict an opposing Digimon from attacking or blocking.",
    ),
  "BT5-057": (cardId) =>
    effectBt3Demo(
      cardId,
      "Rosemon",
      11000,
      "Rosemon Digi-Bursted 3 to give all own Digi-Burst Digimon Security Attack +1.",
    ),
  "BT5-058": (cardId) =>
    effectBt3Demo(
      cardId,
      "Argomon",
      11000,
      "Argomon used Digisorption -2, suspended opposing Tamers when digivolving, and grants protection to its host.",
    ),
  "BT5-059": (cardId) =>
    effectBt3Demo(
      cardId,
      "Keramon",
      2000,
      "Keramon revealed cards and added an Unidentified Digimon and Arata Sanada.",
    ),
  "BT5-060": (cardId) =>
    effectBt3Demo(
      cardId,
      "Monitamon",
      2000,
      "Monitamon checked the top card without moving it and revealed 3 on deletion to play a Monitamon.",
    ),
  "BT5-061": (cardId) => effectBt3Demo(cardId, "Commandramon", 2000, "Commandramon has Blocker."),
  "BT5-062": (cardId) =>
    effectBt3Demo(
      cardId,
      "Mekanorimon",
      6000,
      "Mekanorimon has Blocker, cannot attack on its turn, and unsuspends after surviving a battle deletion.",
    ),
  "BT5-063": (cardId) =>
    effectBt3Demo(
      cardId,
      "Kurisarimon",
      4000,
      "Kurisarimon played Arata Sanada when none was in play and grants Rush to matching other Digimon.",
    ),
  "BT5-064": (cardId) =>
    effectBt3Demo(cardId, "BlackGaogamon", 5000, "BlackGaogamon grants Jamming to its host while it has Reboot."),
  "BT5-065": (cardId) =>
    effectBt3Demo(
      cardId,
      "Shademon",
      5000,
      "Shademon has Blocker, cannot attack on your turn, and plays from Security after its battle.",
    ),
  "BT5-066": (cardId) => vanillaBt3Demo(cardId, "WaruMonzaemon", 6000),
  "BT5-067": (cardId) =>
    effectBt3Demo(
      cardId,
      "Infermon",
      6000,
      "Infermon can digivolve over Keramon and may play a Diaboromon Token when its host is deleted.",
    ),
  "BT5-068": (cardId) =>
    effectBt3Demo(
      cardId,
      "BlackMachGaogamon",
      7000,
      "BlackMachGaogamon has Reboot and gives its host +2000 DP while it has Reboot.",
    ),
  "BT5-069": (cardId) =>
    effectBt3Demo(cardId, "BlackWarGreymon", 12000, "BlackWarGreymon has Security Attack +1 and Reboot."),
  "BT5-070": (cardId) =>
    effectBt3Demo(
      cardId,
      "MetalGarurumon",
      11000,
      "MetalGarurumon Digi-Bursted 2 to delete a play-cost-6 Digimon, or trash the opponent's top security when no Digimon was deleted.",
    ),
  "BT5-071": (cardId) =>
    effectBt3Demo(
      cardId,
      "Guilmon",
      2000,
      "Guilmon gained 1 memory when deleted by an effect, but not when deleted by a rule.",
    ),
  "BT5-072": (cardId) =>
    effectBt3Demo(
      cardId,
      "Fake Agumon Expert",
      1000,
      "Fake Agumon Expert returned a level 3 with a main On Deletion effect from trash.",
    ),
  "BT5-073": (cardId) => vanillaBt3Demo(cardId, "Pillomon", 4000),
  "BT5-074": (cardId) =>
    effectBt3Demo(cardId, "Troopmon", 3000, "Troopmon could play another Troopmon from hand when deleted."),
  "BT5-075": (cardId) => effectBt3Demo(cardId, "Musyamon", 4000, "Musyamon has Jamming."),
  "BT5-076": (cardId) =>
    effectBt3Demo(
      cardId,
      "BlackGrowlmon",
      4000,
      "BlackGrowlmon gave its host Security Attack +1 when another own Digimon was deleted.",
    ),
  "BT5-077": (cardId) => vanillaBt3Demo(cardId, "Vajramon", 8000),
  "BT5-078": (cardId) =>
    effectBt3Demo(
      cardId,
      "Jokermon",
      7000,
      "Jokermon played a purple level 3 from trash without activating its On Play effect.",
    ),
  "BT5-079": (cardId) =>
    effectBt3Demo(
      cardId,
      "BlackWarGrowlmon",
      7000,
      "BlackWarGrowlmon Digi-Bursted 3 to play a purple level 3 and can delete an own Digimon to unsuspend and attack again.",
    ),
  "BT5-080": (cardId) =>
    effectBt3Demo(
      cardId,
      "Zanbamon",
      10000,
      "Zanbamon deleted an opposing Digimon with Retaliation after losing a battle.",
    ),
  "BT5-081": (cardId) =>
    effectBt3Demo(
      cardId,
      "ChaosGallantmon",
      12000,
      "ChaosGallantmon could delete an own Digimon to delete an opposing level 5 and plays a purple level 3 after another own deletion.",
    ),
  "BT5-082": (cardId) =>
    effectBt3Demo(
      cardId,
      "Tactimon",
      11000,
      "Tactimon selected among memory gain, +2000 DP, and deletion modes when attacking.",
    ),
  "BT5-083": (cardId) =>
    effectBt3Demo(
      cardId,
      "Megidramon",
      11000,
      "Megidramon trashed up to five cards from both decks and can play a level 6 Gallantmon from trash when deleted.",
    ),
  "BT5-084": (cardId) =>
    effectBt3Demo(cardId, "Diaboromon", 11000, "Diaboromon may play a Diaboromon Token when digivolving."),
  "BT5-085": (cardId) =>
    effectBt3Demo(
      cardId,
      "Armageddemon",
      15000,
      "Armageddemon deleted a Diaboromon to reduce its play cost by 12, enters with Rush, and restricts level 7 When Digivolving effects.",
    ),
  "BT5-086": (cardId) =>
    effectBt3Demo(
      cardId,
      "Omnimon",
      14000,
      "Omnimon unsuspended and gained Blitz when digivolving, and can trash a level 6 source to prevent deletion.",
    ),
  "BT5-087": (cardId) =>
    effectBt3Demo(
      cardId,
      "Omnimon Zwart",
      15000,
      "Omnimon Zwart milled three and played up to two eligible Digimon from trash, and returns a level 6 source to delete an unsuspended Digimon when attacking.",
    ),
  "BT5-088": (cardId) =>
    effectBt3Demo(
      cardId,
      "Sora Takenouchi & Joe Kido",
      0,
      "Sora & Joe gained 2 memory when the opponent had a source-less Digimon, could suspend after a blue attack, and plays from security.",
    ),
  "BT5-089": (cardId) =>
    effectBt3Demo(
      cardId,
      "Izzy Izumi & Mimi Tachikawa",
      0,
      "Izzy & Mimi gained 2 memory when the opponent had a suspended Digimon and could digivolve an attacking green level 5.",
    ),
  "BT5-090": (cardId) =>
    effectBt3Demo(
      cardId,
      "Arata Sanada",
      0,
      "Arata gained memory with an Unidentified Digimon in trash, suspends for Diaboromon Token effects, and plays from security.",
    ),
  "BT5-091": (cardId) =>
    effectBt3Demo(
      cardId,
      "Takumi Aiba",
      0,
      "Takumi made level 3 Digimon lose 1 memory when they attacked and could draw when a Tamer was played.",
    ),
  "BT5-092": (cardId) =>
    effectBt3Demo(
      cardId,
      "Nokia Shiramine",
      0,
      "Nokia could play an Agumon for free, reduce a qualifying Greymon digivolution cost, and plays from security.",
    ),
  "BT5-093": (cardId) =>
    effectBt3Demo(
      cardId,
      "Tai Kamiya & Matt Ishida",
      0,
      "Tai & Matt gained 2 memory when the opponent had a level 6 or higher Digimon, boost Omnimon, and play from security.",
    ),
  "BT5-094": (cardId) =>
    effectBt3Demo(
      cardId,
      "Rowdy Rocker",
      0,
      "Rowdy Rocker placed a red level 4 or lower card under a Digimon, then drew 2, and adds itself from security.",
    ),
  "BT5-095": (cardId) =>
    effectBt3Demo(
      cardId,
      "Transcendent Sword",
      0,
      "Transcendent Sword deleted Digimon up to its DP ceiling, with a higher ceiling when Omnimon or a qualifying Greymon was present.",
    ),
  "BT5-096": (cardId) =>
    effectBt3Demo(
      cardId,
      "Supreme Cannon",
      0,
      "Supreme Cannon returned opposing Digimon at the DP threshold and trashed their sources, with a higher threshold alongside Garurumon.",
    ),
  "BT5-097": (cardId) =>
    effectBt3Demo(
      cardId,
      "Absolute Blast",
      0,
      "Absolute Blast trashed a bottom source and bottom-decked an opponent with no sources.",
    ),
  "BT5-098": (cardId) =>
    effectBt3Demo(
      cardId,
      "Meteor Shower",
      0,
      "Meteor Shower played a yellow Starmon-named Digimon from hand for free, including from security.",
    ),
  "BT5-099": (cardId) =>
    effectBt3Demo(
      cardId,
      "Spiral Masquerade",
      0,
      "Spiral Masquerade gave -3000 DP separately for each Digimon you controlled, including its Security effect.",
    ),
  "BT5-100": (cardId) =>
    effectBt3Demo(
      cardId,
      "Royal Nuts",
      0,
      "Royal Nuts revealed five cards, added one Digisorption Digimon, and placed the rest at the bottom; it adds itself from security.",
    ),
};
