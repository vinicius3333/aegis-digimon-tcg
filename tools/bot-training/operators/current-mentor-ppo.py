"""One all44 mixed-opponent PPO pass from actual closed warm mentor imitation."""

import argparse
import ast
import hashlib
import importlib.util
import json
import re
import subprocess
import sys
from pathlib import Path
from typing import Any

LAB = Path('/home/vinicius/aegis-bot-lab')
NAME = 'rule-link-current-aa2e56463-mentor-ppo-r1'
RUN = LAB / 'runs' / NAME
SOURCE = 'aa2e56463176046ea5a01419d271a53a164efbae'
ENGINE = '4536a92429c1b62041212e983b63f46206dd4f2eefe959d42b3cc1a7f13c6a2c'
ADAPTER = LAB / 'transfers/rule-link-current-corrective-ppo-r4.py'
ADAPTER_SHA = 'f55e4467cf0ba998216eb7ac78c08472c2961de1aff911f7c4519fa6a8949e8b'
BASE = LAB / 'transfers/rule-link-current-corrective-ppo.py'
BASE_SHA = '0ea7565cbe7ee7514780033d3a5f2b470957f37a3602126f61e94f23c301b39c'
IMITATION = LAB / 'transfers/rule-link-current-mentor-imitation-r3.py'
IMITATION_SHA = '5ac08f7961bc212fb8f4fdbdfe38860ee245a9d1085ca204addedaf2dd8edfd9'
IMITATION_NAME = 'rule-link-current-aa2e56463-mentor-imitation-r3'
IMITATION_REQUEST_SHA = 'f662b7899b1895b9e5a23a917c9aa76a38d87e337937f776f538a59ca03815da'
IMITATION_IDENTITY_SHA = '2ec641d36ece880361132fc76845c733df854e3f5605b98064159ee9167162a8'
IMITATION_GO_SHA = 'c72b637f6fa4359a4bd4f8c50bd62c738a69daa3adcd521b1359bb112903f37b'
BASELINE_COMPLETION = 'b32675433481b354e965de11ed0e118f7c66aa7dc5c76326625f0ace22eff339'
GAMES = 3872


def require(value: bool, message: str) -> None:
    if not value:
        raise ValueError(message)


def pinned_loader(path: Path, sha: str, name: str) -> Any:
    require(path.is_file() and not any(p.is_symlink() for p in (path, *path.parents)), 'Regular immutable helper source')
    require(hashlib.sha256(path.read_bytes()).hexdigest() == sha, 'Exact unchanged helper bytes')
    spec = importlib.util.spec_from_file_location(name, path)
    require(spec is not None and spec.loader is not None, 'Helper loader')
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def request_fields(r: dict) -> None:
    require(type(r.get('imitationCompletionSha256')) is str
        and re.fullmatch('[a-f0-9]{64}', r['imitationCompletionSha256']) is not None, 'Actual imitation completion required')
    checkpoint = r.get('checkpoint')
    require(type(checkpoint) is dict and set(checkpoint) == {'path', 'sha256'}
        and checkpoint['path'] == str(LAB / 'runs' / IMITATION_NAME / 'imitation/checkpoint.pt')
        and type(checkpoint['sha256']) is str and re.fullmatch('[a-f0-9]{64}', checkpoint['sha256']) is not None,
        'Exact actual selected native imitation checkpoint; no pending input')
    require(type(r.get('seed')) is int and 6000000 <= r['seed'] and r['seed'] + GAMES < 6130000, 'Fresh training range only')
    decks = r.get('learnerDecks')
    require(type(decks) is list and len(decks) == 44 and all(type(v) is str for v in decks)
        and decks == sorted(set(decks)), 'Unique all44 sorted learner recipes')
    require(r == {'formatVersion': 1, 'purpose': 'actual-current-source-mentor-ppo-continuation',
        'sourceCommit': SOURCE, 'engineSha256': ENGINE, 'operatorSha256': r.get('operatorSha256'),
        'run': str(RUN), 'identity': str(LAB / 'transfers' / (NAME + '-identity.json')),
        'resourceGo': str(LAB / 'transfers' / (NAME + '-ROOT-go.json')),
        'wrapper': r.get('wrapper'), 'inventory': r.get('inventory'), 'checkpoint': checkpoint,
        'imitationCompletionSha256': r['imitationCompletionSha256'],
        'comparisonCompletionSha256': BASELINE_COMPLETION,
        'opponentCheckpoints': r.get('opponentCheckpoints'), 'heuristicShare': 0.5,
        'learnerDecks': decks, 'seed': r['seed'], 'games': GAMES, 'passes': 1, 'batchGames': 88,
        'learningRate': 1e-5, 'fullAll44AgainstAllFourRequiredAfterLearning': True, 'finalBlindSeedsAuthorized': False},
        'Exact bounded same-source mentor PPO request')
    require(all(type(r[k]) is int for k in ('formatVersion', 'games', 'passes', 'batchGames'))
        and type(r['learningRate']) is float and type(r['heuristicShare']) is float
        and r['finalBlindSeedsAuthorized'] is False and r['fullAll44AgainstAllFourRequiredAfterLearning'] is True,
        'Exact typed learning scope; no boolean count aliases')
    # The complete scanner also pins native results.json, which changes during
    # imitation. Use fresh exclusive assets after actual imitation whole0;
    # earlier preflight files remain sealed and cannot be overwritten.
    for key, suffix in (('wrapper', '-launch-closed.sh'), ('inventory', '-seed-inventory-closed.json')):
        require(type(r[key]) is dict and set(r[key]) == {'path', 'sha256'}
            and r[key]['path'] == str(LAB / 'transfers' / (NAME + suffix)), 'Exact original external admission paths')


def imitation_proof(r: dict) -> dict:
    result = subprocess.run([str(LAB / 'venv/bin/python'), '-B', str(IMITATION), '--closed',
        '--request', str(LAB / 'transfers' / (IMITATION_NAME + '-request.json')),
        '--request-sha', IMITATION_REQUEST_SHA, '--operator-sha', IMITATION_SHA,
        '--identity-sha', IMITATION_IDENTITY_SHA, '--go-sha', IMITATION_GO_SHA,
        '--completion-sha', r['imitationCompletionSha256']], check=True, capture_output=True, text=True)
    proof = json.loads(result.stdout)
    validate_imitation_proof(r, proof)
    return proof


def validate_imitation_proof(r: dict, proof: dict) -> None:
    require(type(proof['actualWholeExitCode']) is int and proof['actualWholeExitCode'] == 0
        and proof['completionSha256'] == r['imitationCompletionSha256'], 'Actual original full imitation whole0 consumer')
    report = proof['report']
    require(report['sourceCommit'] == SOURCE and report['engineSha256'] == ENGINE
        and report['checkpoint'] == r['checkpoint'] and type(report['selectedEpoch']) is int
        and 0 < report['selectedEpoch'] <= 3 and report['actualTrainingEpochs'] == 3
        and report['actualNewGames'] == 0 and report['originalEpisodeFolds'] == {'training': 3225, 'validation': 1607}
        and report['positiveEngineTeacherCoverage']['allMechanismsBothSeatsBothFolds'] is True
        and report['selectedLearning']['all12Finite'] is True
        and type(report['selectedLearning']['selectedActorAdamUpdates']) is int
        and 0 < report['selectedLearning']['selectedActorAdamUpdates'] <= 3900
        and report['selectedLearning']['preservedValueParameters'] == ['value.bias', 'value.weight']
        and report['acceptedStrengthOrMastery'] is False and report['finalBlindSeedsConsumed'] is False,
        'Actual positive native imitation continuation and retained original data folds')


def namespace(r: dict, adapter: Any, raw: str) -> dict:
    request_fields(r)
    require(r['opponentCheckpoints'] == adapter.LEAGUE, 'All four immutable qualified reference opponents')
    # Reuse already qualified mixed-opponent command, records, tensor delta and
    # native train execution. Only the input is now the actual closed imitation.
    adapter.request_fields = request_fields
    adapter.NAME = NAME
    adapter.RUN = RUN
    ns = adapter.namespace(raw, r)
    ns['__file__'] = __file__
    snapshot_node = next(n for n in ast.parse(raw).body if isinstance(n, ast.FunctionDef) and n.name == 'snapshot')
    text = ast.get_source_segment(raw, snapshot_node)
    old = "pin(LAB/'runs/rule-link-current-aa2e56463-strength/completion.json',COMPLETION_SHA)"
    require(text.count(old) == 1, 'Exact immutable baseline snapshot seam')
    exec(compile(text.replace(old, old.replace('COMPLETION_SHA', 'BASELINE_COMPLETION')), str(BASE), 'exec'), ns)
    original_snapshot = ns['snapshot']

    def snapshot(ctx: dict) -> None:
        original_snapshot(ctx)
        adapter.pin(BASE, BASE_SHA)
        adapter.pin(ADAPTER, ADAPTER_SHA)
        adapter.pin(IMITATION, IMITATION_SHA)
        adapter.pin(LAB / 'runs' / IMITATION_NAME / 'completion.json', r['imitationCompletionSha256'])
        adapter.pin(Path(r['checkpoint']['path']), r['checkpoint']['sha256'])
        for cp in adapter.LEAGUE:
            adapter.pin(Path(cp['path']), cp['sha256'])

    def context(args: Any) -> dict:
        require(__debug__ and 'torch' not in sys.modules, 'No primary import before actual source and data admission')
        adapter.pin(Path(__file__), args.operator_sha)
        adapter.pin(args.request, args.request_sha)
        require(adapter.read(args.request) == r and r['operatorSha256'] == args.operator_sha, 'Actual own request/source binding')
        adapter.pin(IMITATION, IMITATION_SHA)
        imitation_proof(r)
        strength = adapter.load(LAB / 'transfers/rule-link-current-strength.py', ns['STRENGTH_SHA'], 'mentor_ppo_qualified_source_helpers')
        parity, h = strength.foundation()
        a = ns['COMPARISON_ARGS']
        prior = argparse.Namespace(request=Path(a[1]), request_sha=a[3], operator_sha=ns['STRENGTH_SHA'], identity_sha=a[7], go_sha=a[9])
        comparison, prepared, helper = strength.source(prior, parity, h)
        require([comparison['checkpoints'][ref] for ref in adapter.REFERENCES] == adapter.LEAGUE, 'Actual unchanged reference bindings')
        require(sorted(d['version'] for d in prepared['curriculum']['decks']) == r['learnerDecks'], 'Qualified all44 actual recipe versions')
        manifest_path = LAB / 'runs/rule-link-current-aa2e56463-prepare/source-manifest.json'
        adapter.pin(manifest_path, prepared['manifestSha256'])
        for key in ('wrapper', 'inventory'):
            adapter.pin(Path(r[key]['path']), r[key]['sha256'])
        inv = adapter.read(Path(r['inventory']['path']))
        require(type(inv['seed']) is int and inv['seed'] == r['seed'] and type(inv['games']) is int and inv['games'] == GAMES
            and inv['excludedThisNewRun'] == str(RUN) and inv['roots'] == ['runs', 'validations']
            and inv['freshAtStart'] is True and inv['observedOverlap'] == [] and bool(inv['observedScheduleFiles']),
            'Original complete fresh seed inventory; no finalblind reuse')
        ctx = {'args': args, 'request': r, 'prepared': prepared, 'pins': h, 'helper': helper,
            'comparison': comparison, 'manifest': adapter.read(manifest_path),
            'cells': ns['cells'](prepared['curriculum'], r['learnerDecks'])}
        snapshot(ctx)
        return ctx

    ns.update(context=context, snapshot=snapshot)
    return ns


def main() -> None:
    require(__debug__ and 'torch' not in sys.modules, 'Stdlib-only operator bootstrap')
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--request', type=Path, required=True)
    parser.add_argument('--request-sha', required=True)
    parser.add_argument('--operator-sha', required=True)
    args, _ = parser.parse_known_args()
    adapter = pinned_loader(ADAPTER, ADAPTER_SHA, 'mentor_ppo_unchanged_mixed_helpers')
    adapter.pin(Path(__file__), args.operator_sha)
    adapter.pin(args.request, args.request_sha)
    adapter.pin(BASE, BASE_SHA)
    ns = namespace(adapter.read(args.request), adapter, BASE.read_text(encoding='utf-8'))
    ns['main']()


if __name__ == '__main__':
    main()
