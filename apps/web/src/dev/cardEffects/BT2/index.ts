import type { CardEffectsFixtureBuilder } from "../fixture";
import { vanillaPlayDemo } from "../vanilla";
import { gigimonBt2Demo } from "./BT2-001";
import { demiVeemonBt2Demo } from "./BT2-002";
import { nyaromonBt2Demo } from "./BT2-003";
import { argomonEggBt2Demo } from "./BT2-004";
import { kapurimonBt2Demo } from "./BT2-005";
import { tsumemonBt2Demo } from "./BT2-006";
import { pagumonBt2Demo } from "./BT2-007";
import { yaamonBt2Demo } from "./BT2-008";
import { guilmonBt2Demo } from "./BT2-009";
import { biyomonBt2Demo } from "./BT2-010";
import { birdramonBt2Demo } from "./BT2-012";
import { growlmonBt2Demo } from "./BT2-013";
import { garudamonBt2Demo } from "./BT2-015";
import { warGrowlmonBt2Demo } from "./BT2-017";
import { volcanicdramonBt2Demo } from "./BT2-018";
import { phoenixmonBt2Demo } from "./BT2-019";
import { gallantmonBt2Demo } from "./BT2-020";
import { veemonBt2Demo } from "./BT2-021";
import { gomamonBt2Demo } from "./BT2-023";
import { ikkakumonBt2Demo } from "./BT2-025";
import { veedramonJammingBt2Demo } from "./BT2-026";
import { aeroVeedramonBt2Demo } from "./BT2-028";
import { megaSeadramonBt2Demo } from "./BT2-029";
import { metalSeadramonBt2Demo } from "./BT2-030";
import { vikemonBt2Demo } from "./BT2-031";
import { ulforceVeedramonBt2Demo } from "./BT2-032";
import { agumonBt2Demo } from "./BT2-033";
import { salamonBt2Demo } from "./BT2-034";
import { geoGreymonBt2Demo } from "./BT2-035";
import { gatomonBt2Demo } from "./BT2-036";
import { rizeGreymonBt2Demo } from "./BT2-038";
import { magnadramonBt2Demo } from "./BT2-039";
import { ophanimonBt2Demo } from "./BT2-040";
import { shineGreymonBt2Demo } from "./BT2-041";
import { agumonGreenBt2Demo } from "./BT2-043";
import { tyrannomonBt2Demo } from "./BT2-044";
import { argomonChampionBt2Demo } from "./BT2-045";
import { metalTyrannomonBt2Demo } from "./BT2-046";
import { argomonUltimateBt2Demo } from "./BT2-047";
import { cherrymonBt2Demo } from "./BT2-048";
import { puppetmonBt2Demo } from "./BT2-049";
import { argomonMegaBt2Demo } from "./BT2-050";
import { rustTyrannomonBt2Demo } from "./BT2-051";
import { hagurumonBt2Demo } from "./BT2-052";
import { keramonBt2Demo } from "./BT2-053";
import { gotsumonBt2Demo } from "./BT2-054";
import { toyAgumonBt2Demo } from "./BT2-055";
import { numemonBt2Demo } from "./BT2-056";
import { greymonBlackBt2Demo } from "./BT2-057";
import { guardromonBt2Demo } from "./BT2-058";
import { kurisarimonBt2Demo } from "./BT2-059";
import { megadramonBt2Demo } from "./BT2-060";
import { andromonBt2Demo } from "./BT2-061";
import { infermonBt2Demo } from "./BT2-062";
import { metalGreymonBt2Demo } from "./BT2-063";
import { hiAndromonBt2Demo } from "./BT2-064";
import { warGreymonBt2Demo } from "./BT2-065";
import { machinedramonBt2Demo } from "./BT2-066";
import { demiDevimonBt2Demo } from "./BT2-067";
import { impmonBt2Demo } from "./BT2-068";
import { gabumonPurpleBt2Demo } from "./BT2-069";
import { tapirmonBt2Demo } from "./BT2-070";
import { wizardmonBt2Demo } from "./BT2-071";
import { vilemonBt2Demo } from "./BT2-072";
import { garurumonPurpleBt2Demo } from "./BT2-073";
import { devimonBt2Demo } from "./BT2-074";
import { myotismonBt2Demo } from "./BT2-075";
import { pumpkinmonBt2Demo } from "./BT2-076";
import { kimeramonBt2Demo } from "./BT2-077";
import { wereGarurumonBt2Demo } from "./BT2-078";
import { venomMyotismonBt2Demo } from "./BT2-079";
import { piedmonBt2Demo } from "./BT2-080";
import { metalGarurumonBt2Demo } from "./BT2-081";
import { diaboromonBt2Demo } from "./BT2-082";
import { millenniummonBt2Demo } from "./BT2-083";
import { soraTakenouchiBt2Demo } from "./BT2-084";
import { joeKidoBt2Demo } from "./BT2-085";
import { rinaShinomiyaBt2Demo } from "./BT2-086";
import { kariKamiyaBt2Demo } from "./BT2-087";
import { taigaBt2Demo } from "./BT2-088";
import { taiKamiyaBlackBt2Demo } from "./BT2-089";
import { mattIshidaPurpleBt2Demo } from "./BT2-090";
import { volcanicFlareBt2Demo } from "./BT2-091";
import { radiationBladeBt2Demo } from "./BT2-092";
import { shieldOfTheJustBt2Demo } from "./BT2-093";
import { arcticBlizzardBt2Demo } from "./BT2-094";
import { riverOfPowerBt2Demo } from "./BT2-095";
import { rayOfVictoryBt2Demo } from "./BT2-096";
import { lightningPawBt2Demo } from "./BT2-097";
import { edensJavelinBt2Demo } from "./BT2-098";
import { gloriousBurstBt2Demo } from "./BT2-099";
import { puppetPummelBt2Demo } from "./BT2-100";
import { cherryBlastBt2Demo } from "./BT2-101";
import { terrorsClusterBt2Demo } from "./BT2-102";
import { spiralSwordBt2Demo } from "./BT2-103";
import { atomicRayBt2Demo } from "./BT2-104";
import { spiderShooterBt2Demo } from "./BT2-105";
import { infinityCannonBt2Demo } from "./BT2-106";
import { darknessClawBt2Demo } from "./BT2-107";
import { nightRaidBt2Demo } from "./BT2-108";
import { heatViperBt2Demo } from "./BT2-109";
import { trumpSwordBt2Demo } from "./BT2-110";
import { beelzemonBt2Demo } from "./BT2-111";
import { blackWarGreymonBt2Demo } from "./BT2-112";

export const bt2Fixtures: Record<string, CardEffectsFixtureBuilder> = {
  "BT2-112": (_cardId, effect) => blackWarGreymonBt2Demo(effect),
  "BT2-111": (_cardId, effect) => beelzemonBt2Demo(effect),
  "BT2-110": (_cardId, effect) => trumpSwordBt2Demo(effect),
  "BT2-109": (_cardId, effect) => heatViperBt2Demo(effect),
  "BT2-108": (_cardId, effect) => nightRaidBt2Demo(effect),
  "BT2-107": (_cardId, effect) => darknessClawBt2Demo(effect),
  "BT2-106": (_cardId, effect) => infinityCannonBt2Demo(effect),
  "BT2-105": (_cardId, effect) => spiderShooterBt2Demo(effect),
  "BT2-104": (_cardId, effect) => atomicRayBt2Demo(effect),
  "BT2-103": (_cardId, effect) => spiralSwordBt2Demo(effect),
  "BT2-102": (_cardId, effect) => terrorsClusterBt2Demo(effect),
  "BT2-101": (_cardId, effect) => cherryBlastBt2Demo(effect),
  "BT2-100": (_cardId, effect) => puppetPummelBt2Demo(effect),
  "BT2-099": (_cardId, effect) => gloriousBurstBt2Demo(effect),
  "BT2-098": (_cardId, effect) => edensJavelinBt2Demo(effect),
  "BT2-097": (_cardId, effect) => lightningPawBt2Demo(effect),
  "BT2-096": (_cardId, effect) => rayOfVictoryBt2Demo(effect),
  "BT2-095": (_cardId, effect) => riverOfPowerBt2Demo(effect),
  "BT2-094": (_cardId, effect) => arcticBlizzardBt2Demo(effect),
  "BT2-093": (_cardId, effect) => shieldOfTheJustBt2Demo(effect),
  "BT2-092": (_cardId, effect) => radiationBladeBt2Demo(effect),
  "BT2-091": (_cardId, effect) => volcanicFlareBt2Demo(effect),
  "BT2-090": (_cardId, effect) => mattIshidaPurpleBt2Demo(effect),
  "BT2-089": (_cardId, effect) => taiKamiyaBlackBt2Demo(effect),
  "BT2-088": (_cardId, effect) => taigaBt2Demo(effect),
  "BT2-087": (_cardId, effect) => kariKamiyaBt2Demo(effect),
  "BT2-086": (_cardId, effect) => rinaShinomiyaBt2Demo(effect),
  "BT2-085": (_cardId, effect) => joeKidoBt2Demo(effect),
  "BT2-084": (_cardId, effect) => soraTakenouchiBt2Demo(effect),
  "BT2-083": (_cardId, effect) => millenniummonBt2Demo(effect),
  "BT2-082": (_cardId, effect) => diaboromonBt2Demo(effect),
  "BT2-081": (_cardId, effect) => metalGarurumonBt2Demo(effect),
  "BT2-080": (_cardId, effect) => piedmonBt2Demo(effect),
  "BT2-079": (_cardId, effect) => venomMyotismonBt2Demo(effect),
  "BT2-078": (_cardId, effect) => wereGarurumonBt2Demo(effect),
  "BT2-077": (_cardId, effect) => kimeramonBt2Demo(effect),
  "BT2-076": (_cardId, effect) => pumpkinmonBt2Demo(effect),
  "BT2-075": (_cardId, effect) => myotismonBt2Demo(effect),
  "BT2-074": (_cardId, effect) => devimonBt2Demo(effect),
  "BT2-073": (_cardId, effect) => garurumonPurpleBt2Demo(effect),
  "BT2-072": (_cardId, effect) => vilemonBt2Demo(effect),
  "BT2-071": (_cardId, effect) => wizardmonBt2Demo(effect),
  "BT2-070": (_cardId, effect) => tapirmonBt2Demo(effect),
  "BT2-069": (_cardId, effect) => gabumonPurpleBt2Demo(effect),
  "BT2-068": (_cardId, effect) => impmonBt2Demo(effect),
  "BT2-067": (_cardId, effect) => demiDevimonBt2Demo(effect),
  "BT2-066": (_cardId, effect) => machinedramonBt2Demo(effect),
  "BT2-065": (_cardId, effect) => warGreymonBt2Demo(effect),
  "BT2-064": (_cardId, effect) => hiAndromonBt2Demo(effect),
  "BT2-063": (_cardId, effect) => metalGreymonBt2Demo(effect),
  "BT2-062": (_cardId, effect) => infermonBt2Demo(effect),
  "BT2-061": (_cardId, effect) => andromonBt2Demo(effect),
  "BT2-060": (_cardId, effect) => megadramonBt2Demo(effect),
  "BT2-059": (_cardId, effect) => kurisarimonBt2Demo(effect),
  "BT2-058": (_cardId, effect) => guardromonBt2Demo(effect),
  "BT2-057": (_cardId, effect) => greymonBlackBt2Demo(effect),
  "BT2-056": (_cardId, effect) => numemonBt2Demo(effect),
  "BT2-055": (_cardId, effect) => toyAgumonBt2Demo(effect),
  "BT2-054": (_cardId, effect) => gotsumonBt2Demo(effect),
  "BT2-053": (_cardId, effect) => keramonBt2Demo(effect),
  "BT2-052": (_cardId, effect) => hagurumonBt2Demo(effect),
  "BT2-051": (_cardId, effect) => rustTyrannomonBt2Demo(effect),
  "BT2-050": (_cardId, effect) => argomonMegaBt2Demo(effect),
  "BT2-049": (_cardId, effect) => puppetmonBt2Demo(effect),
  "BT2-048": (_cardId, effect) => cherrymonBt2Demo(effect),
  "BT2-047": (_cardId, effect) => argomonUltimateBt2Demo(effect),
  "BT2-046": (_cardId, effect) => metalTyrannomonBt2Demo(effect),
  "BT2-045": (_cardId, effect) => argomonChampionBt2Demo(effect),
  "BT2-044": (_cardId, effect) => tyrannomonBt2Demo(effect),
  "BT2-043": (_cardId, effect) => agumonGreenBt2Demo(effect),
  "BT2-042": (cardId, effect) => vanillaPlayDemo(cardId, 3000, 2, effect),
  "BT2-041": (_cardId, effect) => shineGreymonBt2Demo(effect),
  "BT2-040": (_cardId, effect) => ophanimonBt2Demo(effect),
  "BT2-039": (_cardId, effect) => magnadramonBt2Demo(effect),
  "BT2-038": (_cardId, effect) => rizeGreymonBt2Demo(effect),
  "BT2-037": (cardId, effect) => vanillaPlayDemo(cardId, 10000, 7, effect),
  "BT2-036": (_cardId, effect) => gatomonBt2Demo(effect),
  "BT2-035": (_cardId, effect) => geoGreymonBt2Demo(effect),
  "BT2-034": (_cardId, effect) => salamonBt2Demo(effect),
  "BT2-033": (_cardId, effect) => agumonBt2Demo(effect),
  "BT2-032": (_cardId, effect) => ulforceVeedramonBt2Demo(effect),
  "BT2-031": (_cardId, effect) => vikemonBt2Demo(effect),
  "BT2-030": (_cardId, effect) => metalSeadramonBt2Demo(effect),
  "BT2-029": (_cardId, effect) => megaSeadramonBt2Demo(effect),
  "BT2-028": (_cardId, effect) => aeroVeedramonBt2Demo(effect),
  "BT2-027": (cardId, effect) => vanillaPlayDemo(cardId, 9000, 6, effect),
  "BT2-026": (_cardId, effect) => veedramonJammingBt2Demo(effect),
  "BT2-025": (_cardId, effect) => ikkakumonBt2Demo(effect),
  "BT2-024": (cardId, effect) => vanillaPlayDemo(cardId, 4000, 3, effect),
  "BT2-023": (_cardId, effect) => gomamonBt2Demo(effect),
  "BT2-022": (cardId, effect) => vanillaPlayDemo(cardId, 5000, 3, effect),
  "BT2-021": (_cardId, effect) => veemonBt2Demo(effect),
  "BT2-020": (_cardId, effect) => gallantmonBt2Demo(effect),
  "BT2-019": (_cardId, effect) => phoenixmonBt2Demo(effect),
  "BT2-018": (_cardId, effect) => volcanicdramonBt2Demo(effect),
  "BT2-017": (_cardId, effect) => warGrowlmonBt2Demo(effect),
  "BT2-016": (cardId, effect) => vanillaPlayDemo(cardId, 8000, 7, effect),
  "BT2-015": (_cardId, effect) => garudamonBt2Demo(effect),
  "BT2-014": (cardId, effect) => vanillaPlayDemo(cardId, 6000, 5, effect),
  "BT2-013": (_cardId, effect) => growlmonBt2Demo(effect),
  "BT2-012": (_cardId, effect) => birdramonBt2Demo(effect),
  "BT2-011": (cardId, effect) => vanillaPlayDemo(cardId, 5000, 4, effect),
  "BT2-010": (_cardId, effect) => biyomonBt2Demo(effect),
  "BT2-009": (_cardId, effect) => guilmonBt2Demo(effect),
  "BT2-008": (_cardId, effect) => yaamonBt2Demo(effect),
  "BT2-007": (_cardId, effect) => pagumonBt2Demo(effect),
  "BT2-006": (_cardId, effect) => tsumemonBt2Demo(effect),
  "BT2-005": (_cardId, effect) => kapurimonBt2Demo(effect),
  "BT2-004": (_cardId, effect) => argomonEggBt2Demo(effect),
  "BT2-003": (_cardId, effect) => nyaromonBt2Demo(effect),
  "BT2-002": (_cardId, effect) => demiVeemonBt2Demo(effect),
  "BT2-001": (_cardId, effect) => gigimonBt2Demo(effect),
};
