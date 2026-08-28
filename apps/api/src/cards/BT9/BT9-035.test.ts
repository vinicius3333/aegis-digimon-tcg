import { auditEffectlessDigimon } from "./effectlessAudit.testkit.js";
import { compiled } from "./BT9-035.js";

auditEffectlessDigimon({
  cardId: "BT9-035",
  expected: {
    cardId: "BT9-035",
    nameEn: "Starmon",
    colors: ["Yellow"],
    kinds: ["Digimon"],
    level: 4,
    playCost: 4,
    dp: 6000,
    evoCosts: [{ color: "Yellow", level: 3, memoryCost: 2 }],
    forms: ["Champion"],
    attributes: ["Data"],
    types: ["Mutant"],
  },
  compiled,
  validBase: "BT9-032",
  invalidBase: "BT9-019",
});
