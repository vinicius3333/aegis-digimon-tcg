import type { CardEffectsFixtureBuilder } from "../fixture";
import { flamedramonDemo } from "./EX3-008";
import { wingdramonDemo } from "./EX3-020";
import { crysPaledramonDemo } from "./EX3-021";
import { megaSeadramonDemo } from "./EX3-022";
import { plesiomonDemo } from "./EX3-023";
import { slayerdramonDemo } from "./EX3-024";
import { azulongmonDemo } from "./EX3-025";
import { aegisdramonDemo } from "./EX3-026";
import { agumonInheritedDemo } from "./EX3-027";
import { patamonDemo } from "./EX3-028";
import { airdramonDemo } from "./EX3-029";
import { gatomonDemo } from "./EX3-030";
import { veedramonDemo } from "./EX3-031";
import { majiramonDemo } from "./EX3-032";
import { aeroVeedramonDemo } from "./EX3-033";
import { angewomonDemo } from "./EX3-034";
import { goldramonDemo } from "./EX3-035";
import { magnadramonDemo } from "./EX3-036";
import { dracomonDemo } from "./EX3-037";
import { pomumonDemo } from "./EX3-038";
import { coredramonDemo } from "./EX3-039";
import { parasaurmonDemo } from "./EX3-040";
import { groundramonDemo } from "./EX3-041";
import { toropiamonDemo } from "./EX3-042";
import { entmonDemo } from "./EX3-043";
import { breakdramonDemo } from "./EX3-044";
import { hydramonDemo } from "./EX3-045";
import { commandramonDemo } from "./EX3-046";
import { jazamonDemo } from "./EX3-047";
import { jazardmonDemo } from "./EX3-048";
import { sealsdramonDemo } from "./EX3-049";
import { cyberdramonDemo } from "./EX3-050";
import { tankdramonDemo } from "./EX3-051";
import { jazarichmonDemo } from "./EX3-052";
import { metallicdramonDemo } from "./EX3-053";
import { darkdramonDemo } from "./EX3-054";
import { wormmonDemo } from "./EX3-055";
import { guilmonDemo } from "./EX3-056";
import { growlmonDemo } from "./EX3-057";
import { shadramonDemo } from "./EX3-058";
import { darkTyrannomonDemo } from "./EX3-059";
import { exTyrannomonDemo } from "./EX3-060";
import { dinobeemonDemo } from "./EX3-061";
import { warGrowlmonDemo } from "./EX3-062";
import { imperialdramonDragonModeDemo } from "./EX3-063";
import { megidramonDemo } from "./EX3-064";
import { hinaKuriharaDemo } from "./EX3-065";
import { hyperInfinityCannonDemo } from "./EX3-066";
import { souraiDemo } from "./EX3-067";
import { godFlameDemo } from "./EX3-068";
import { trialOfTheFourGreatDragonsDemo } from "./EX3-069";
import { avalonsGateDemo } from "./EX3-070";
import { laserCannonDemo } from "./EX3-071";
import { megiddoFlameDemo } from "./EX3-072";
import { fighterModeDemo } from "./EX3-073";
import { examonDemo } from "./EX3-074";

export const ex3Fixtures: Record<string, CardEffectsFixtureBuilder> = {
  "EX3-074": () => examonDemo(),
  "EX3-073": (_cardId, effect) => fighterModeDemo(effect),
  "EX3-072": (_cardId, effect) => megiddoFlameDemo(effect),
  "EX3-071": (_cardId, effect, step) => laserCannonDemo(effect, step),
  "EX3-070": (_cardId, effect, step) => avalonsGateDemo(effect, step),
  "EX3-069": (_cardId, effect) => trialOfTheFourGreatDragonsDemo(effect),
  "EX3-068": (_cardId, effect, step) => godFlameDemo(effect, step),
  "EX3-067": (_cardId, effect, step) => souraiDemo(effect, step),
  "EX3-066": (_cardId, effect, step) => hyperInfinityCannonDemo(effect, step),
  "EX3-065": (_cardId, effect, step) => hinaKuriharaDemo(effect, step),
  "EX3-064": (_cardId, effect, step) => megidramonDemo(effect, step),
  "EX3-063": (_cardId, effect, step) => imperialdramonDragonModeDemo(effect, step),
  "EX3-062": (_cardId, effect, step) => warGrowlmonDemo(effect, step),
  "EX3-061": (_cardId, effect, step) => dinobeemonDemo(effect, step),
  "EX3-060": (_cardId, effect) => exTyrannomonDemo(effect),
  "EX3-059": () => darkTyrannomonDemo(),
  "EX3-058": (_cardId, effect, step) => shadramonDemo(effect, step),
  "EX3-057": (_cardId, effect, step) => growlmonDemo(effect, step),
  "EX3-056": (_cardId, effect) => guilmonDemo(effect),
  "EX3-055": (_cardId, effect, step) => wormmonDemo(effect, step),
  "EX3-054": (_cardId, effect, step) => darkdramonDemo(effect, step),
  "EX3-053": (_cardId, effect) => metallicdramonDemo(effect),
  "EX3-052": (_cardId, effect, step) => jazarichmonDemo(effect, step),
  "EX3-051": (_cardId, effect, step) => tankdramonDemo(effect, step),
  "EX3-050": (_cardId, effect) => cyberdramonDemo(effect),
  "EX3-049": (_cardId, effect) => sealsdramonDemo(effect),
  "EX3-048": (_cardId, effect, step) => jazardmonDemo(effect, step),
  "EX3-047": (_cardId, effect) => jazamonDemo(effect),
  "EX3-046": (_cardId, effect) => commandramonDemo(effect),
  "EX3-045": (_cardId, effect) => hydramonDemo(effect),
  "EX3-044": (_cardId, effect) => breakdramonDemo(effect),
  "EX3-043": (_cardId, effect) => entmonDemo(effect),
  "EX3-042": (_cardId, effect) => toropiamonDemo(effect),
  "EX3-041": (_cardId, effect, step) => groundramonDemo(effect, step),
  "EX3-040": (_cardId, effect) => parasaurmonDemo(effect),
  "EX3-039": (_cardId, effect) => coredramonDemo(effect),
  "EX3-038": (_cardId, effect) => pomumonDemo(effect),
  "EX3-037": (_cardId, effect, step) => dracomonDemo(effect, step),
  "EX3-036": (_cardId, effect, step) => magnadramonDemo(effect, step),
  "EX3-035": (_cardId, effect, step) => goldramonDemo(effect, step),
  "EX3-034": (_cardId, effect) => angewomonDemo(effect),
  "EX3-033": (_cardId, effect) => aeroVeedramonDemo(effect),
  "EX3-032": (_cardId, effect) => majiramonDemo(effect),
  "EX3-031": (_cardId, effect, step) => veedramonDemo(effect, step),
  "EX3-030": (_cardId, effect, step) => gatomonDemo(effect, step),
  "EX3-029": (_cardId, effect) => airdramonDemo(effect),
  "EX3-028": (_cardId, effect, step) => patamonDemo(effect, step),
  "EX3-027": (_cardId, effect) => agumonInheritedDemo(effect),
  "EX3-026": (_cardId, effect) => aegisdramonDemo(effect),
  "EX3-025": (_cardId, effect) => azulongmonDemo(effect),
  "EX3-024": (_cardId, effect) => slayerdramonDemo(effect),
  "EX3-023": (_cardId, effect) => plesiomonDemo(effect),
  "EX3-022": (_cardId, effect) => megaSeadramonDemo(effect),
  "EX3-021": (_cardId, effect) => crysPaledramonDemo(effect),
  "EX3-020": (_cardId, effect) => wingdramonDemo(effect),
  "EX3-008": (_cardId, _effect, step) => flamedramonDemo(step),
};
