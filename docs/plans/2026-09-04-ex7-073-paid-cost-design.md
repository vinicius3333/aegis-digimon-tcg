# EX7-073 paid-cost continuation

The committed catalog requires paying two Three Musketeers digivolution cards,
then deleting the highest-level opposing Digimon and trashing opposing security.
Successful deletion is not a prerequisite for the security result.

The focused public-evolution regression reproduced the defect: both cost cards
were in trash and opposing Tortomon survived its protected deletion, but the
security card never reached trash. The deletion action overwrote
`lastEffectActed`, invalidating the following conditional security action.

Use the existing EX7-013 pattern: a self-targeted `SelectBind` owns the optional
cost and `abortOnDecline`; independent Delete and SecurityManipulation actions
follow. Apply the same sequence to When Digivolving and When Attacking. No
shared engine change or new registration seam is needed.

Removing only the security condition would retain Delete's no-target preflight
and could allow a continuation without payment. Adding a new engine receipt is
unnecessary because the existing cost gate already aborts on refusal or failure.

Verification includes paid and refused costs, insufficient matching sources,
public evolution and attacks, protected deletion, and free matching Option use.
The free Option fixture uses non-ACE MagnaKidmon to avoid conflating payment
with the legitimate Overflow of a trashed BeelStarmon ACE source.
