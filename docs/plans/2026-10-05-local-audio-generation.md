# Local original audio generation

Local text-to-audio evaluation succeeded on this arm64 Mac16,13 with 16 GiB
unified memory. Seven original candidates were generated offline: two each for
paper handling, damped impact and crystalline transformation, plus a 45-second
tactical instrumental. They have no claimed perceptual approval. Immediate textures and a mastered
background were selected for the audio owner to apply through the shared bank;
final adoption is recorded in the integration outcome.

## Primary sources and prerequisites

The [official platform repository](https://github.com/Stability-AI/stable-audio-3)
offers separate 433M Small-SFX/Small-Music models, stereo 44.1 kHz output and CPU
support. Its [MLX runtime](https://github.com/Stability-AI/stable-audio-3/tree/main/optimized/mlx)
uses Apple Silicon, Python 3.10+, MLX, NumPy, SentencePiece and a small codec.
This machine already had MLX, uv and ffmpeg; no callable audio-generation provider
was exposed. A temp venv reused installed MLX and added SentencePiece,
Hugging Face Hub and SoundFile with their dependencies. No global install,
configuration change, account, paid API or cloud generation was used.

The [base SFX](https://huggingface.co/stabilityai/stable-audio-3-small-sfx) and
[base music](https://huggingface.co/stabilityai/stable-audio-3-small-music) files
are gated. Each lists a 2,270,384,940-byte checkpoint plus a 1,183,022,944-byte
text encoder and tokenizer. The official
[optimized distribution](https://huggingface.co/stabilityai/stable-audio-3-optimized)
is publicly downloadable without authentication. Its two MLX small generators,
shared text encoder and decoder total 2,623,921,516 bytes; the concurrent
anonymous download completed in 93.98 seconds. No medium weights were fetched.

The [Community license](https://huggingface.co/stabilityai/stable-audio-3-optimized/blob/main/LICENSE.md)
permits evaluation/testing and distinguishes model use from output ownership.
Commercial model use requires registration and has a revenue eligibility limit;
Gemma terms also cover the text encoder. No registration was performed. This
prototype evaluates local generation; it does not certify commercial model-use
eligibility. Generated outputs are separate from redistribution of model weights.

Bootstrap/install scripts were downloaded and inspected, never piped into a shell
or executed. Only `optimized/mlx` source files were extracted from official commit
`3a82c807b69cf4b7c5c05270011a5d5e47abac18`. Weight downloads explicitly disabled
implicit tokens; inference then used offline mode and no playback/device output.

## Reproducible candidates

The [official prompt guide](https://stability.ai/guides/stable-audio-3-prompt-guide)
recommends specifying format, source/instruments, mood and production. Our prompts
name isolated dry paper friction, a damped impact with an airy pressure burst, or
a warm glass shimmer. Music names muted plucked arpeggios, warm pads, sparse brushed
percussion, calm tactical tension and 84 BPM. No game recording, artist imitation,
external sample or recognizable melody was supplied.

| Candidate        | Seed                | Raw length | Measured process time |
| ---------------- | ------------------- | ---------- | --------------------- |
| Paper 1 / 2      | 20261005 / 20261006 | 3 s each   | 5.958 / 1.753 s       |
| Impact 1 / 2     | 20261007 / 20261008 | 3 s each   | 1.832 / 2.442 s       |
| Crystal 1 / 2    | 20261009 / 20261010 | 3 s each   | 3.454 / 4.049 s       |
| Tactical ambient | 20261015            | 45 s       | 9.103 s               |

Each run used the corresponding `sm-sfx`/`sm-music` generator, `same-s` decoder,
eight steps and CFG 1. Exact prompts, commands, seeds, hashes and logs are retained
in parent `.local/audio-improvement/research/`. The reproducible local environment,
source, weights and original WAVs remain under `/tmp/aegis-audio-generation/`;
`generate.py` runs the seven cases with per-process time bounds.

Raw music peaked near full scale and its endpoint jump was 0.15765, so it was
not accepted as a direct gameplay loop. Mastered evaluation variants remove
per-channel DC and cap peak at approximately 0.32 (about 9.9 dB headroom). SFX
edges use 5 ms attack and 25 ms release. Music uses a one-second equal-power
cyclic crossfade, yielding 44 seconds and a measured endpoint jump of 0.00168.
Quantized mean DC is below 0.000017. This bounds signal discontinuity, without
proving musical phrase alignment or listening quality.

Energy analysis selects paper seed 20261005 at 0.135–0.385 s (250 ms), impact
seed 20261007 at 0.012–0.462 s (450 ms), and crystal seed 20261010 at
0.08–0.73 s (650 ms). These use 3 ms attack/30 ms release and peaks 0.22/0.24/0.22,
with zero measured endpoint jump. The longer delayed crystal variant was excluded.
No semantic audio audition tool is exposed, so selection is technical and no
subjective listening claim is made. The audio owner received all selected files,
metrics and the coordinator instruction to apply useful generated paper/background
through the same bank/preview path. Final applied mapping, mixing, browser evidence
and limits belong in the subsequent integration outcome.
