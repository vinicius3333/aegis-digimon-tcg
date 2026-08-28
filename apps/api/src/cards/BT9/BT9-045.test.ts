import { auditEffectlessDigimon } from "./effectlessAudit.testkit.js";
import { compiled } from "./BT9-045.js";

auditEffectlessDigimon({
  cardId: "BT9-045",
  expected: {
    cardId: "BT9-045",
    nameEn: "Elecmon",
    colors: ["Green"],
    kinds: ["Digimon"],
    level: 3,
    playCost: 3,
    dp: 4000,
    evoCosts: [{ color: "Green", level: 2, memoryCost: 0 }],
    forms: ["Rookie"],
    attributes: ["Data"],
    types: ["Mammal"],
  },
  compiled,
  validBase: "BT1-007",
  invalidBase: "BT1-003",
});
