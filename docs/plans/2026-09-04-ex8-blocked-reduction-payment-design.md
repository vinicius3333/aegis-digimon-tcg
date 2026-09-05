# Optional payment under a play-cost reduction prohibition

EX8-074 Q4442/Q4443 distinguish declaring an affordable play from obtaining a
discount. At memory zero, Psychemon prevents declaring the eleven-cost play.
At memory one, the original cost is payable: the player may still suspend two
opposing Digimon, but must pay eleven while the prohibition remains active.

The public opponent-seat scenario failed because `fireBeforePayCost` returned
before resolving any optional processing when a reduction prohibition existed.
Moving only the discount suppression to the final result restores that legal
processing. Keep the early return for read-only projection and for a blocked,
unaffordable full cost, preventing partial effects on an undeclarable play.
Recheck the prohibition at final payment rather than assuming it remained in
force after resolving costs.

Alternatives rejected: removing the early guard entirely would permit costs
before an unaffordable declaration; changing only EX8-074 would leave the shared
payment window inconsistent. No card-ID branch is introduced.

Evidence covers public cost acceptance followed by explicit self-play-reaction
refusal, both opponent targets suspended, original memory paid, and no pending
decision. A separate Q6721 scenario uses immune EX8-073 at zero memory and
asserts neither partial suspension nor play. The fixed-count payment correction
is delivered separately in `afff9076f`.
