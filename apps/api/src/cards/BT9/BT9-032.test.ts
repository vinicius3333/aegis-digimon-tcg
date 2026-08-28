import { auditEffectlessDigimon } from "./effectlessAudit.testkit.js";
import { compiled } from "./BT9-032.js";

auditEffectlessDigimon({
  cardId: "BT9-032",
  expected: {
    cardId: "BT9-032",
    nameEn: "ToyAgumon",
    colors: ["Yellow"],
    kinds: ["Digimon"],
    level: 3,
    playCost: 2,
    dp: 3000,
    evoCosts: [{ color: "Yellow", level: 2, memoryCost: 0 }],
    forms: ["Rookie"],
    attributes: ["Vaccine"],
    types: ["Puppet"],
  },
  compiled,
  validBase: "BT1-005",
  invalidBase: "BT1-003",
});
