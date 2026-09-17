import type { CardEffectsFixtureBuilder } from "../fixture";
import { vanillaPlayDemo } from "../vanilla";
import { labramonDemo } from "./BT1-049";
import { seasarmonDemo } from "./BT1-052";
import { darcmonDemo } from "./BT1-053";
import { liamonDemo } from "./BT1-054";
import { angemonDemo } from "./BT1-055";
import { petermonDemo } from "./BT1-056";
import { chirinmonDemo } from "./BT1-058";
import { magnaAngemonDemo } from "./BT1-060";
import { mistymonDemo } from "./BT1-061";
import { slashAngemonDemo } from "./BT1-062";
import { seraphimonDemo } from "./BT1-063";
import { tentomonDemo } from "./BT1-066";
import { palmonDemo } from "./BT1-067";
import { kokuwamonDemo } from "./BT1-068";
import { ogremonDemo } from "./BT1-069";
import { kuwagamonDemo } from "./BT1-070";
import { woodmonDemo } from "./BT1-072";
import { kabuterimonDemo } from "./BT1-073";
import { togemonDemo } from "./BT1-074";
import { digitamamonDemo } from "./BT1-075";
import { megaKabuterimonDemo } from "./BT1-076";
import { okuwamonDemo } from "./BT1-077";
import { jagamonDemo } from "./BT1-078";
import { lillymonDemo } from "./BT1-079";
import { herculesKabuterimonDemo } from "./BT1-081";
import { rosemonDemo } from "./BT1-082";
import { granKuwagamonDemo } from "./BT1-083";
import { omnimonDemo } from "./BT1-084";
import { taiKamiyaDemo } from "./BT1-085";
import { mattIshidaDemo } from "./BT1-086";
import { tkTakaishiDemo } from "./BT1-087";
import { izzyIzumiDemo } from "./BT1-088";
import { mimiTachikawaDemo } from "./BT1-089";
import { gravityCrushDemo } from "./BT1-090";
import { scrapClawDemo } from "./BT1-091";
import { nuclearLaserDemo } from "./BT1-092";
import { greatTornadoDemo } from "./BT1-093";
import { oblivionBirdDemo } from "./BT1-094";
import { braveShieldDemo } from "./BT1-095";
import { madDogFireDemo } from "./BT1-096";
import { boringStormDemo } from "./BT1-097";
import { vNovaBlastDemo } from "./BT1-098";
import { heartsAttackDemo } from "./BT1-099";
import { graceCrossFreezerDemo } from "./BT1-100";
import { howlingCrusherDemo } from "./BT1-101";
import { bladeOfTheTrueDemo } from "./BT1-102";
import { testamentDemo } from "./BT1-103";
import { goldenRipperDemo } from "./BT1-104";
import { blastFireDemo } from "./BT1-105";
import { polyphonyDemo } from "./BT1-106";
import { holyWaveDemo } from "./BT1-107";
import { hornBusterDemo } from "./BT1-108";
import { smashedPotatoesDemo } from "./BT1-109";
import { flowerCannonDemo } from "./BT1-110";
import { gigaBlasterDemo } from "./BT1-111";
import { dimensionScissorDemo } from "./BT1-112";
import { forbiddenTemptationDemo } from "./BT1-113";
import { metalGreymonBt1Demo } from "./BT1-114";
import { veedramonBt1Demo } from "./BT1-115";

export const bt1Fixtures: Record<string, CardEffectsFixtureBuilder> = {
  "BT1-115": (_cardId, effect) => veedramonBt1Demo(effect),
  "BT1-114": (_cardId, effect) => metalGreymonBt1Demo(effect),
  "BT1-113": (_cardId, effect) => forbiddenTemptationDemo(effect),
  "BT1-112": (_cardId, effect) => dimensionScissorDemo(effect),
  "BT1-111": (_cardId, effect) => gigaBlasterDemo(effect),
  "BT1-110": (_cardId, effect) => flowerCannonDemo(effect),
  "BT1-109": (_cardId, effect) => smashedPotatoesDemo(effect),
  "BT1-108": (_cardId, effect) => hornBusterDemo(effect),
  "BT1-107": (_cardId, effect) => holyWaveDemo(effect),
  "BT1-106": (_cardId, effect) => polyphonyDemo(effect),
  "BT1-105": (_cardId, effect) => blastFireDemo(effect),
  "BT1-104": (_cardId, effect) => goldenRipperDemo(effect),
  "BT1-103": (_cardId, effect) => testamentDemo(effect),
  "BT1-102": (_cardId, effect) => bladeOfTheTrueDemo(effect),
  "BT1-101": (_cardId, effect) => howlingCrusherDemo(effect),
  "BT1-100": (_cardId, effect) => graceCrossFreezerDemo(effect),
  "BT1-099": (_cardId, effect) => heartsAttackDemo(effect),
  "BT1-098": (_cardId, effect) => vNovaBlastDemo(effect),
  "BT1-097": (_cardId, effect) => boringStormDemo(effect),
  "BT1-096": (_cardId, effect) => madDogFireDemo(effect),
  "BT1-095": (_cardId, effect) => braveShieldDemo(effect),
  "BT1-094": (_cardId, effect) => oblivionBirdDemo(effect),
  "BT1-093": (_cardId, effect) => greatTornadoDemo(effect),
  "BT1-092": (_cardId, effect) => nuclearLaserDemo(effect),
  "BT1-091": (_cardId, effect) => scrapClawDemo(effect),
  "BT1-090": (_cardId, effect) => gravityCrushDemo(effect),
  "BT1-089": (_cardId, effect) => mimiTachikawaDemo(effect),
  "BT1-088": (_cardId, effect) => izzyIzumiDemo(effect),
  "BT1-087": (_cardId, effect) => tkTakaishiDemo(effect),
  "BT1-086": (_cardId, effect, step) => mattIshidaDemo(effect, step),
  "BT1-085": (_cardId, effect) => taiKamiyaDemo(effect),
  "BT1-084": (_cardId, effect, step) => omnimonDemo(effect, step),
  "BT1-083": (_cardId, effect) => granKuwagamonDemo(effect),
  "BT1-082": (_cardId, effect) => rosemonDemo(effect),
  "BT1-081": (_cardId, effect) => herculesKabuterimonDemo(effect),
  "BT1-080": (cardId, effect) => vanillaPlayDemo(cardId, 12000, 10, effect),
  "BT1-079": (_cardId, effect) => lillymonDemo(effect),
  "BT1-078": (_cardId, _effect, step) => jagamonDemo(step),
  "BT1-077": (_cardId, effect) => okuwamonDemo(effect),
  "BT1-076": (_cardId, effect) => megaKabuterimonDemo(effect),
  "BT1-075": (_cardId, effect) => digitamamonDemo(effect),
  "BT1-074": (_cardId, _effect, step) => togemonDemo(step),
  "BT1-073": (_cardId, effect) => kabuterimonDemo(effect),
  "BT1-072": (_cardId, effect) => woodmonDemo(effect),
  "BT1-071": (cardId, effect) => vanillaPlayDemo(cardId, 6000, 4, effect),
  "BT1-070": (_cardId, effect) => kuwagamonDemo(effect),
  "BT1-069": (_cardId, effect) => ogremonDemo(effect),
  "BT1-068": (_cardId, effect) => kokuwamonDemo(effect),
  "BT1-067": (_cardId, effect) => palmonDemo(effect),
  "BT1-066": (_cardId, effect) => tentomonDemo(effect),
  "BT1-065": (cardId, effect) => vanillaPlayDemo(cardId, 4000, 2, effect),
  "BT1-064": (cardId, effect) => vanillaPlayDemo(cardId, 3000, 2, effect),
  "BT1-063": (_cardId, effect) => seraphimonDemo(effect),
  "BT1-062": (_cardId, effect) => slashAngemonDemo(effect),
  "BT1-061": (_cardId, effect) => mistymonDemo(effect),
  "BT1-060": (_cardId, effect) => magnaAngemonDemo(effect),
  "BT1-059": (cardId, effect) => vanillaPlayDemo(cardId, 9000, 6, effect),
  "BT1-058": (_cardId, effect) => chirinmonDemo(effect),
  "BT1-057": (cardId, effect) => vanillaPlayDemo(cardId, 6000, 5, effect),
  "BT1-056": (_cardId, effect) => petermonDemo(effect),
  "BT1-055": (_cardId, effect) => angemonDemo(effect),
  "BT1-054": (_cardId, effect) => liamonDemo(effect),
  "BT1-053": (_cardId, effect) => darcmonDemo(effect),
  "BT1-052": (_cardId, effect) => seasarmonDemo(effect),
  "BT1-051": (cardId, effect) => vanillaPlayDemo(cardId, 4000, 3, effect),
  "BT1-050": (cardId, effect) => vanillaPlayDemo(cardId, 4000, 3, effect),
  "BT1-049": (_cardId, effect) => labramonDemo(effect),
};
