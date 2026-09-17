import type { CardEffectsFixtureBuilder } from "../fixture";
import { effectBt3Demo, vanillaBt3Demo } from "../vanilla";
import { poromonBt3Demo } from "./BT3-001";
import { demiVeemonBt3Demo } from "./BT3-002";
import { upamonBt3Demo } from "./BT3-003";
import { minomonBt3Demo } from "./BT3-004";
import { kakkinmonBt3Demo } from "./BT3-005";
import { demiMeramonBt3Demo } from "./BT3-006";
import { agumonBt3Demo } from "./BT3-007";
import { zubamonBt3Demo } from "./BT3-008";
import { hawkmonBt3Demo } from "./BT3-009";
import { zubaEagermonBt3Demo } from "./BT3-010";
import { greymonBt3Demo } from "./BT3-011";
import { aquilamonBt3Demo } from "./BT3-012";
import { duramonBt3Demo } from "./BT3-013";
import { silphymonBt3Demo } from "./BT3-014";
import { metalGreymonBt3Demo } from "./BT3-015";
import { durandamonBt3Demo } from "./BT3-016";
import { valkyrimonBt3Demo } from "./BT3-017";
import { blitzGreymonBt3Demo } from "./BT3-018";
import { ragnaLoardmonBt3Demo } from "./BT3-019";
import { patamonBt3Demo } from "./BT3-020";
import { veemonBt3Demo } from "./BT3-021";
import { penguinmonBt3Demo } from "./BT3-022";
import { angemonBt3Demo } from "./BT3-023";
import { airdramonBt3Demo } from "./BT3-024";
import { exVeemonBt3Demo } from "./BT3-025";
import { magnaAngemonBt3Demo } from "./BT3-026";
import { paildramonBt3Demo } from "./BT3-027";
import { bastemonBt3Demo } from "./BT3-028";
import { goldramonBt3Demo } from "./BT3-029";
import { leopardmonBt3Demo } from "./BT3-030";
import { imperialdramonBt3Demo } from "./BT3-031";
import { armadillomonBt3Demo } from "./BT3-032";
import { salamonBt3Demo } from "./BT3-033";
import { lopmonBt3Demo } from "./BT3-034";
import { gatomonBt3Demo } from "./BT3-035";
import { ankylomonBt3Demo } from "./BT3-036";
import { turuiemonBt3Demo } from "./BT3-037";
import { antylamonBt3Demo } from "./BT3-038";
import { angewomonBt3Demo } from "./BT3-039";
import { shakkoumonBt3Demo } from "./BT3-040";
import { cherubimonBt3Demo } from "./BT3-041";
import { clavisAngemonBt3Demo } from "./BT3-042";
import { kentaurosmonBt3Demo } from "./BT3-043";
import { aruraumonBt3Demo } from "./BT3-044";
import { kunemonBt3Demo } from "./BT3-045";
import { terriermonBt3Demo } from "./BT3-046";
import { wormmonBt3Demo } from "./BT3-047";
import { gargomonBt3Demo } from "./BT3-048";
import { flymonBt3Demo } from "./BT3-049";
import { stingmonBt3Demo } from "./BT3-050";
import { dokugumonBt3Demo } from "./BT3-051";
import { rapidmonBt3Demo } from "./BT3-052";

export const bt3Fixtures: Record<string, CardEffectsFixtureBuilder> = {
  "BT3-013": (_cardId, effect) => duramonBt3Demo(effect),
  "BT3-015": (_cardId, effect) => metalGreymonBt3Demo(effect),
  "BT3-016": (_cardId, effect) => durandamonBt3Demo(effect),
  "BT3-017": (_cardId, effect) => valkyrimonBt3Demo(effect),
  "BT3-018": (_cardId, effect) => blitzGreymonBt3Demo(effect),
  "BT3-019": (_cardId, effect) => ragnaLoardmonBt3Demo(effect),
  "BT3-020": (_cardId, effect) => patamonBt3Demo(effect),
  "BT3-021": (_cardId, effect) => veemonBt3Demo(effect),
  "BT3-022": (_cardId, effect) => penguinmonBt3Demo(effect),
  "BT3-023": (_cardId, effect) => angemonBt3Demo(effect),
  "BT3-024": (_cardId, effect) => airdramonBt3Demo(effect),
  "BT3-025": (_cardId, effect) => exVeemonBt3Demo(effect),
  "BT3-026": (_cardId, effect) => magnaAngemonBt3Demo(effect),
  "BT3-027": (_cardId, effect) => paildramonBt3Demo(effect),
  "BT3-028": (_cardId, effect) => bastemonBt3Demo(effect),
  "BT3-029": (_cardId, effect) => goldramonBt3Demo(effect),
  "BT3-030": (_cardId, effect) => leopardmonBt3Demo(effect),
  "BT3-031": (_cardId, effect) => imperialdramonBt3Demo(effect),
  "BT3-032": (_cardId, effect) => armadillomonBt3Demo(effect),
  "BT3-033": (_cardId, effect) => salamonBt3Demo(effect),
  "BT3-034": (_cardId, effect) => lopmonBt3Demo(effect),
  "BT3-035": (_cardId, effect) => gatomonBt3Demo(effect),
  "BT3-036": (_cardId, effect) => ankylomonBt3Demo(effect),
  "BT3-037": (_cardId, effect) => turuiemonBt3Demo(effect),
  "BT3-038": (_cardId, effect) => antylamonBt3Demo(effect),
  "BT3-039": (_cardId, effect) => angewomonBt3Demo(effect),
  "BT3-040": (_cardId, effect) => shakkoumonBt3Demo(effect),
  "BT3-041": (_cardId, effect) => cherubimonBt3Demo(effect),
  "BT3-042": (_cardId, effect) => clavisAngemonBt3Demo(effect),
  "BT3-043": (_cardId, effect) => kentaurosmonBt3Demo(effect),
  "BT3-044": (_cardId, effect) => aruraumonBt3Demo(effect),
  "BT3-045": (_cardId, effect) => kunemonBt3Demo(effect),
  "BT3-046": (_cardId, effect) => terriermonBt3Demo(effect),
  "BT3-047": (_cardId, effect) => wormmonBt3Demo(effect),
  "BT3-048": (_cardId, effect) => gargomonBt3Demo(effect),
  "BT3-049": (_cardId, effect) => flymonBt3Demo(effect),
  "BT3-050": (_cardId, effect) => stingmonBt3Demo(effect),
  "BT3-051": (_cardId, effect) => dokugumonBt3Demo(effect),
  "BT3-052": (_cardId, effect) => rapidmonBt3Demo(effect),
  "BT3-053": (cardId) => vanillaBt3Demo(cardId, "JewelBeemon", 10000),
  "BT3-054": (cardId) =>
    effectBt3Demo(cardId, "Blossomon", 7000, "Blossomon used Digisorption -3 by suspending one of your Digimon."),
  "BT3-055": (cardId) => effectBt3Demo(cardId, "Dinobeemon", 7000, "Dinobeemon has Piercing and Jamming."),
  "BT3-056": (cardId) =>
    effectBt3Demo(
      cardId,
      "Ceresmon",
      12000,
      "Ceresmon used Digisorption -3 and may suspend an opposing Digimon instead during your turn.",
    ),
  "BT3-057": (cardId) =>
    effectBt3Demo(
      cardId,
      "MegaGargomon",
      11000,
      "MegaGargomon suspended an opposing Digimon and prevented it from unsuspending next turn.",
    ),
  "BT3-058": (cardId) =>
    effectBt3Demo(
      cardId,
      "BanchoStingmon",
      9000,
      "BanchoStingmon gained +7000 DP and Security Attack +2 when attacking a 12000 DP Digimon.",
    ),
  "BT3-059": (cardId) => vanillaBt3Demo(cardId, "Commandramon", 3000),
  "BT3-060": (cardId) => vanillaBt3Demo(cardId, "Psychemon", 5000),
  "BT3-061": (cardId) =>
    effectBt3Demo(
      cardId,
      "Chuumon",
      2000,
      "Chuumon prevented the opponent from gaining memory except by Tamer effects.",
    ),
  "BT3-062": (cardId) =>
    effectBt3Demo(
      cardId,
      "Ludomon",
      3000,
      "Ludomon revealed cards and added a RagnaLoardmon and a Legend-Arms Digimon to hand.",
    ),
  "BT3-063": (cardId) =>
    effectBt3Demo(
      cardId,
      "Sukamon",
      2000,
      "Sukamon revealed 3 cards on deletion, played a Chuumon, and placed the rest at the bottom of the deck.",
    ),
  "BT3-064": (cardId) =>
    effectBt3Demo(
      cardId,
      "TiaLudomon",
      5000,
      "TiaLudomon De-Digivolved 1 from an opposing Digimon when its level 7 host attacked.",
    ),
  "BT3-065": (cardId) =>
    effectBt3Demo(
      cardId,
      "Gururumon",
      5000,
      "Gururumon was played without paying its cost after battling as a Security Digimon.",
    ),
  "BT3-066": (cardId) =>
    effectBt3Demo(cardId, "Clockmon", 4000, "Clockmon gave its host +1000 DP during the opponent's turn."),
  "BT3-067": (cardId) => vanillaBt3Demo(cardId, "Hagurumon", 1000),
  "BT3-068": (cardId) =>
    effectBt3Demo(cardId, "Giromon", 6000, "Giromon gave its host +1000 DP during the opponent's turn."),
  "BT3-069": (cardId) =>
    effectBt3Demo(
      cardId,
      "RaijiLudomon",
      6000,
      "RaijiLudomon De-Digivolved 1 from an opposing Digimon when its level 7 host attacked.",
    ),
  "BT3-070": (cardId) =>
    effectBt3Demo(cardId, "Etemon", 6000, "Etemon has Blocker and played a revealed level 6 Etemon on deletion."),
  "BT3-071": (cardId) =>
    effectBt3Demo(
      cardId,
      "MetalMamemon",
      7000,
      "MetalMamemon has Reboot and returned a level 7 Virus Digimon from the trash to hand when digivolving.",
    ),
  "BT3-076": (cardId) => vanillaBt3Demo(cardId, "Candlemon", 3000),
  "BT3-078": (cardId) => vanillaBt3Demo(cardId, "Shamanmon", 4000),
  "BT3-072": (cardId) => effectBt3Demo(cardId, "BryweLudramon", 12000, "BryweLudramon granted Blocker to its host."),
  "BT3-073": (cardId) =>
    effectBt3Demo(
      cardId,
      "CresGarurumon",
      11000,
      "CresGarurumon revealed cards per opposing Digimon and played an eligible card.",
    ),
  "BT3-074": (cardId) =>
    effectBt3Demo(
      cardId,
      "MetalEtemon",
      10000,
      "MetalEtemon cannot be blocked on its turn and gains +2000 DP during the opponent's turn.",
    ),
  "BT3-075": (cardId) =>
    effectBt3Demo(
      cardId,
      "Craniamon",
      12000,
      "Craniamon protected an own Blocker Digimon from an opponent's deletion effect.",
    ),
  "BT3-077": (cardId) =>
    effectBt3Demo(
      cardId,
      "Gazimon",
      2000,
      "Gazimon prevented the opponent from gaining memory except by Tamer effects.",
    ),
  "BT3-079": (cardId) =>
    effectBt3Demo(cardId, "Tsukaimon", 2000, "Tsukaimon gained 1 memory when its host was deleted."),
  "BT3-080": (cardId) => effectBt3Demo(cardId, "Saberdramon", 3000, "Saberdramon granted Retaliation to its host."),
  "BT3-081": (cardId) =>
    effectBt3Demo(cardId, "Devidramon", 4000, "Devidramon gained 1 memory when its host was deleted."),
  "BT3-082": (cardId) =>
    effectBt3Demo(
      cardId,
      "BlackGatomon",
      4000,
      "BlackGatomon was played without paying its cost after battling as a Security Digimon.",
    ),
  "BT3-083": (cardId) => vanillaBt3Demo(cardId, "Meramon", 5000),
  "BT3-084": (cardId) =>
    effectBt3Demo(cardId, "Raremon", 4000, "Raremon revealed cards, added an Option to hand, and trashed the rest."),
  "BT3-085": (cardId) => vanillaBt3Demo(cardId, "SkullMeramon", 6000),
  "BT3-086": (cardId) =>
    effectBt3Demo(
      cardId,
      "Arukenimon",
      6000,
      "Arukenimon could pay 3 memory to play MaloMyotismon from hand, then delete itself.",
    ),
  "BT3-087": (cardId) =>
    effectBt3Demo(
      cardId,
      "Mummymon",
      7000,
      "Mummymon could pay 3 memory to play MaloMyotismon from trash, then delete itself.",
    ),
  "BT3-088": (cardId) =>
    effectBt3Demo(
      cardId,
      "LadyDevimon",
      8000,
      "LadyDevimon drew 2 cards, trashed 2 cards, and deleted an opposing level 3 when its host used an Option.",
    ),
  "BT3-089": (cardId) => vanillaBt3Demo(cardId, "Boltmon", 12000),
  "BT3-090": (cardId) =>
    effectBt3Demo(
      cardId,
      "Mastemon",
      12000,
      "Mastemon trashed both top security cards and played a low-level card from trash.",
    ),
  "BT3-091": (cardId) =>
    effectBt3Demo(
      cardId,
      "Lilithmon",
      11000,
      "Lilithmon returned up to two purple Options from the trash and gained memory when its owner used an Option.",
    ),
  "BT3-092": (cardId) =>
    effectBt3Demo(
      cardId,
      "MaloMyotismon",
      12000,
      "MaloMyotismon has Piercing and gains memory for each other Digimon deleted.",
    ),
  "BT3-093": (cardId) =>
    effectBt3Demo(
      cardId,
      "Davis Motomiya",
      0,
      "Davis Motomiya revealed the top 3 cards and added one blue and one green Digimon to hand.",
    ),
  "BT3-094": (cardId) =>
    effectBt3Demo(
      cardId,
      "Ken Ichijoji",
      0,
      "Ken Ichijoji set memory to 3 at turn start and could suspend to gain memory after a blue battle win.",
    ),
  "BT3-095": (cardId) =>
    effectBt3Demo(cardId, "Joe Kido", 0, "Joe Kido gained memory at turn start while an own Blocker was in play."),
  "BT3-096": (cardId) =>
    effectBt3Demo(cardId, "Mimi Tachikawa", 0, "Mimi Tachikawa could suspend when an Option was used to gain memory."),
  "BT3-097": (cardId) =>
    effectBt3Demo(
      cardId,
      "A Delicate Plan",
      0,
      "A Delicate Plan prevented checked Option cards from activating their Security effects.",
    ),
  "BT3-098": (cardId) =>
    effectBt3Demo(cardId, "Plasma Stake", 0, "Plasma Stake deleted an opposing Digimon with 13000 DP or more."),
  "BT3-099": (cardId) =>
    effectBt3Demo(
      cardId,
      "We Have to Stop Fighting!",
      0,
      "We Have to Stop Fighting! prevented battle deletion for both players' Digimon this turn.",
    ),
  "BT3-100": (cardId) =>
    effectBt3Demo(
      cardId,
      "Death Parade Blaster",
      0,
      "Death Parade Blaster trashed two bottom digivolution cards and suspended the target.",
    ),
  "BT3-014": (_cardId, effect) => silphymonBt3Demo(effect),
  "BT3-012": (_cardId, effect) => aquilamonBt3Demo(effect),
  "BT3-011": (_cardId, effect) => greymonBt3Demo(effect),
  "BT3-010": (_cardId, effect) => zubaEagermonBt3Demo(effect),
  "BT3-009": (_cardId, effect) => hawkmonBt3Demo(effect),
  "BT3-008": (_cardId, effect) => zubamonBt3Demo(effect),
  "BT3-007": (_cardId, effect) => agumonBt3Demo(effect),
  "BT3-006": (_cardId, effect) => demiMeramonBt3Demo(effect),
  "BT3-005": (_cardId, effect) => kakkinmonBt3Demo(effect),
  "BT3-004": (_cardId, effect) => minomonBt3Demo(effect),
  "BT3-003": (_cardId, effect) => upamonBt3Demo(effect),
  "BT3-002": (_cardId, effect) => demiVeemonBt3Demo(effect),
  "BT3-001": (_cardId, effect) => poromonBt3Demo(effect),
};
