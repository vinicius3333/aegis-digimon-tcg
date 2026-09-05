# LM serial low-RAM queue

Do not start this queue while broad Vitest PID/PGID 82901 is active. After it exits, run exactly one listed
file per process, in order, with no file parallelism:

```sh
pnpm --filter @aegis/api exec vitest run src/cards/LM/<CARD-ID>.test.ts --pool=forks --poolOptions.forks.singleFork=true --fileParallelism=false
```

Do not wrap these paths in a shell loop or pass multiple files to one process. After all focused
files and applicable mechanism files are green, run the single collection gate.

Before executing LM-050–053, update this worktree from `origin/main` after EX6 commit
`d1082a712` has merged. That commit is the generic Delay-engine integration dependency; the LM
suite proves card integration and must not reimplement the generic engine repair.

1. `LM-001.test.ts`
2. `LM-002.test.ts`
3. `LM-003.test.ts`
4. `LM-004.test.ts`
5. `LM-005.test.ts`
6. `LM-006.test.ts`
7. `LM-007.test.ts`
8. `LM-008.test.ts`
9. `LM-009.test.ts`
10. `LM-010.test.ts`
11. `LM-011.test.ts`
12. `LM-012.test.ts`
13. `LM-013.test.ts`
14. `LM-014.test.ts`
15. `LM-015.test.ts`
16. `LM-016.test.ts`
17. `LM-017.test.ts`
18. `LM-018.test.ts`
19. `LM-019.test.ts`
20. `LM-020.test.ts`
21. `LM-021.test.ts`
22. `LM-022.test.ts`
23. `LM-023.test.ts`
24. `LM-024.test.ts`
25. `LM-025.test.ts`
26. `LM-026.test.ts`
27. `LM-027.test.ts`
28. `LM-028.test.ts`
29. `LM-029.test.ts`
30. `LM-030.test.ts`
31. `LM-031.test.ts`
32. `LM-032.test.ts`
33. `LM-033.test.ts`
34. `LM-034.test.ts`
35. `LM-035.test.ts`
36. `LM-036.test.ts`
37. `LM-037.test.ts`
38. `LM-038.test.ts`
39. `LM-039.test.ts`
40. `LM-040.test.ts`
41. `LM-041.test.ts`
42. `LM-042.test.ts`
43. `LM-043.test.ts`
44. `LM-044.test.ts`
45. `LM-045.test.ts`
46. `LM-046.test.ts`
47. `LM-047.test.ts`
48. `LM-048.test.ts`
49. `LM-049.test.ts`
50. `LM-050.test.ts`
51. `LM-051.test.ts`
52. `LM-052.test.ts`
53. `LM-053.test.ts`
54. `LM-050-053.delay.test.ts` (four explicit parameterized card cases; run this one file alone)
55. `LM-054.test.ts`
56. `LM-055.test.ts`
57. `LM-056.test.ts`
58. `LM-057.test.ts`
59. `LM-058.test.ts`
60. `LM-059.test.ts`
61. `LM-060.test.ts`
62. `LM-061.test.ts`
63. `LM-062.test.ts`
