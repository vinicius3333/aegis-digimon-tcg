"""Fresh natural CPU validation-only teacher games; folds declared before any outcome."""

import argparse
import ast
import hashlib
import importlib.util
import json
import os
import re
import subprocess
import sys
from collections import Counter
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path
from typing import Any

LAB = Path('/home/vinicius/aegis-bot-lab')
NAME = 'rule-link-current-aa2e56463-teacher-validation-r1'
RUN = LAB / 'runs' / NAME
DATA_OPERATOR = LAB / 'transfers/rule-link-current-mentor-collection.py'
DATA_SHA = '61de62422b2963c90321251df521f0d0720582674c90bef0e73c00ce5729e3f2'
DATA_COMPLETION = '5bc00d0ef3b23564d23306811e8757f8cadeacc6ad2786037843a84f268cb461'
DATA_REQUEST_SHA = '5627db4efa83936ead839829c98d84d9e9dc592cda7b77ffe917631e46598343'
DATA_IDENTITY_SHA = 'ca05ae5c851f7f6c3a55c6d578b93b4e9ac4c0e5f0d80bac9f2d9c7c70fa56f6'
DATA_GO_SHA = '3c58a954ba7a17de78cd0229b94522167f24ba1bb8278b33ea697b2e8a0a81a5'
GAMES = 800
TARGETS = ('ex13-examon-royal-knights@1', 'bt26-dgo-2026-08-28-1-toho-braves@1',
    'curriculum-bagra-darkknightmon@1', 'ex13-lordknightmon-royal-knights@1')
REQUIRED = ('dnaDigivolve:seat0', 'effectDigiXrosMaterial:seat0')


def require(value: bool, message: str) -> None:
    if not value:
        raise ValueError(message)


def data_module() -> Any:
    require(DATA_OPERATOR.is_file() and not any(p.is_symlink() for p in (DATA_OPERATOR, *DATA_OPERATOR.parents)), 'Regular original producer source')
    require(hashlib.sha256(DATA_OPERATOR.read_bytes()).hexdigest() == DATA_SHA, 'Original producer source pin')
    spec = importlib.util.spec_from_file_location('supplement_static_producer', DATA_OPERATOR)
    require(spec is not None and spec.loader is not None, 'Original source loader')
    module = importlib.util.module_from_spec(spec); spec.loader.exec_module(module)
    return module


def schedule(index: int) -> tuple[str, int]:
    require(type(index) is int and 0 <= index < GAMES, 'Exact supplemental index')
    return TARGETS[index % len(TARGETS)], 0


def dataset_index(index: int) -> int:
    require(type(index) is int and 0 <= index < GAMES, 'Original validation episode index')
    # The complete batch is assigned to validation before any games run.
    # Every numeric index is a multiple of five, as canonical imitation requires.
    return index * 5


def teacher_choice(window: dict) -> tuple[int | None, int]:
    require(window.get('role', 'learner') == 'learner' and type(window['observation']['seat']) is int
        and window['observation']['seat'] == 0 and len(window['actions']) > 0, 'Declared learner-only seat0 scope')
    require('teacher' in window, 'Actual requested engine teacher missing')
    label = window['teacher']['action']
    require(label is None or (type(label) is int and 0 <= label < len(window['actions'])), 'Actual legal or unavailable teacher label')
    # Match canonical collect.py's legal first-action fallback, but keep action
    # None and supervised False. An unavailable teacher never supplies label0.
    return label, 0 if label is None else label


def frame_label(frame: dict, recipe: str) -> int | None:
    label, executed = teacher_choice(frame['window'])
    require(all(value is None or type(value) is int for value in
        (frame['action'], frame['engineTeacherAction'])), 'Integer or unavailable recorded labels')
    require(frame['action'] == frame['engineTeacherAction'] == label and type(frame['executedAction']) is int
        and frame['executedAction'] == executed and frame['supervised'] is (label is not None)
        and frame['learnerRecipe'] == recipe and frame['driver'] == 'current-engine-teacher'
        and frame['labelOrigin'] == ('current-engine-teacher' if label is not None else 'unsupervised-legal-first-action-fallback'),
        'Original explicit available/unavailable engine labels')
    return label


def request_fields(m: Any, r: dict, sha: str) -> None:
    require(r == {'purpose': 'fresh-current-source-natural-teacher-validation-only', 'sourceCommit': m.SOURCE,
        'engineSha256': m.ENGINE, 'operatorSha256': sha, 'run': str(RUN), 'games': GAMES, 'workers': 4,
        'seed': r.get('seed'), 'dataCompletionSha256': DATA_COMPLETION, 'targetRecipes': list(TARGETS),
        'learnerSeat': 0, 'originalEpisodeIndexStride': 5, 'declaredFold': 'validation', 'requiredOriginalValidationTeacherBins': list(REQUIRED),
        'inventory': r.get('inventory'), 'wrapper': r.get('wrapper'), 'actualLearningUpdates': 0,
        'primaryModelImportsAuthorized': False, 'finalBlindSeedsAuthorized': False}, 'Exact CPU teacher scope and real predecessor')
    require(all(type(r[k]) is int for k in ('games', 'workers', 'seed', 'learnerSeat', 'originalEpisodeIndexStride', 'actualLearningUpdates'))
        and 6000000 <= r['seed'] and r['seed'] + GAMES <= 6120000, 'Exact fresh bounded counts')
    require(all(type(r[k]) is bool for k in ('primaryModelImportsAuthorized', 'finalBlindSeedsAuthorized')), 'Boolean request permissions')
    for key, suffix in (('inventory', '-seed-inventory.json'), ('wrapper', '-launch.sh')):
        require(set(r[key]) == {'path', 'sha256'} and r[key]['path'] == str(LAB / 'transfers' / (NAME + suffix)), 'Bound original ' + key)


def inventory(m: Any, seed: int) -> dict:
    m.pin(m.SCANNER, m.SCANNER_SHA)
    nodes = [n for n in ast.parse(m.SCANNER.read_text(encoding='utf-8')).body if isinstance(n, ast.FunctionDef) and n.name == 'inventory_seeds']
    require(len(nodes) == 1, 'Unchanged complete original seed scanner')
    namespace = dict(Path=Path, Any=Any, LAB=LAB, RUN=RUN, SEED=seed, GAMES=GAMES, read=m.read, digest=m.digest, re=re)
    exec(compile(ast.Module(body=nodes, type_ignores=[]), str(m.SCANNER), 'exec'), namespace)
    return namespace['inventory_seeds']()


def snapshot(m: Any, r: dict, a: argparse.Namespace) -> None:
    m.pin(Path(__file__), a.operator_sha); m.pin(a.request, a.request_sha)
    m.pin(Path(r['wrapper']['path']), r['wrapper']['sha256']); m.pin(Path(r['inventory']['path']), r['inventory']['sha256'])
    m.pin(DATA_OPERATOR, DATA_SHA); m.pin(m.RUN / 'completion.json', DATA_COMPLETION)
    for cp in m.CP.values(): m.pin(Path(cp['path']), cp['sha256'])
    m.qualified_modules()


def predecessor(m: Any) -> dict:
    try:
        result = subprocess.run([str(LAB / 'venv/bin/python'), '-B', str(DATA_OPERATOR), '--closed',
            '--request', str(LAB / 'transfers' / (m.NAME + '-request.json')), '--request-sha', DATA_REQUEST_SHA,
            '--operator-sha', DATA_SHA, '--identity-sha', DATA_IDENTITY_SHA, '--go-sha', DATA_GO_SHA,
            '--completion-sha', DATA_COMPLETION], check=True, capture_output=True, text=True)
    except subprocess.CalledProcessError as error:
        sys.stderr.write(error.stderr or '')
        raise ValueError('Original actual data consumer failed with exit ' + str(error.returncode)) from error
    proof = json.loads(result.stdout, object_pairs_hook=m.unique, parse_constant=m.invalid)
    require(type(proof['actualWholeExitCode']) is int and proof['actualWholeExitCode'] == 0
        and proof['completionSha256'] == DATA_COMPLETION and proof['report']['games'] == 3872
        and proof['report']['all181VisibleBothSeats'] is True and proof['report']['acceptedStrengthOrMastery'] is False,
        'Original actual full current-source dataset closure')
    return proof


def approved(m: Any, r: dict, a: argparse.Namespace) -> None:
    require(a.go_sha is not None, 'Separate actual ROOT CPU resource agreement')
    path = LAB / 'transfers' / (NAME + '-ROOT-go.json'); m.pin(path, a.go_sha); value = m.read(path)
    require(all(type(value.get(k)) is bool for k in ('sourceReviewed', 'resourceAgreed', 'cpuOnly',
        'primaryModelImportsAuthorized', 'finalBlindSeedsAuthorized')), 'Boolean ROOT permissions')
    require(value == {'phase': r['purpose'], 'requestSha256': a.request_sha, 'operatorSha256': a.operator_sha,
        'dataCompletionSha256': DATA_COMPLETION, 'sourceReviewed': True, 'resourceAgreed': True,
        'cpuOnly': True, 'actualGamesAuthorized': GAMES, 'maximumConcurrentGameWorkers': 4, 'declaredFold': 'validation', 'originalEpisodeIndexStride': 5,
        'seed': r['seed'], 'actualLearningUpdatesAuthorized': 0, 'primaryModelImportsAuthorized': False,
        'finalBlindSeedsAuthorized': False} and all(type(value[k]) is int for k in
        ('actualGamesAuthorized', 'maximumConcurrentGameWorkers', 'seed', 'originalEpisodeIndexStride', 'actualLearningUpdatesAuthorized')), 'Exact CPU no-model no-update Go')


def whole(m: Any, r: dict, a: argparse.Namespace, *, closed: bool) -> dict:
    require(a.identity_sha is not None, 'Original whole identity required')
    path = LAB / 'transfers' / (NAME + '-identity.json'); m.pin(path, a.identity_sha); identity = m.read(path)
    require(set(identity) == {'wholeWrapperPid', 'startTicks', 'run', 'operatorSha256', 'wrapperSha256'}
        and type(identity['wholeWrapperPid']) is int and type(identity['startTicks']) is str and identity['run'] == NAME
        and identity['operatorSha256'] == a.operator_sha and identity['wrapperSha256'] == r['wrapper']['sha256'], 'Exact original CPU whole')
    launch = Path(str(RUN) + '-launch'); m.pin(launch / 'launch.sh', r['wrapper']['sha256'])
    proc = Path('/proc') / str(identity['wholeWrapperPid'])
    if closed:
        m.safe(launch / 'exit-code.txt'); require((launch / 'exit-code.txt').read_bytes() == b'0\n', 'Actual original whole0')
        if proc.exists(): require((proc / 'stat').read_text(encoding='utf-8').rsplit(')', 1)[1].split()[19] != identity['startTicks'], 'Original whole still present')
    else:
        require(proc.exists(), 'Original live whole missing'); stat = (proc / 'stat').read_text(encoding='utf-8').rsplit(')', 1)[1].split()
        argv = [x.decode() for x in (proc / 'cmdline').read_bytes().split(b'\0') if x]
        require(stat[0] != 'Z' and stat[19] == identity['startTicks'] and len(argv) == 5 and Path(argv[0]).name == 'bash'
            and argv[1:] == [r['wrapper']['path'], a.request_sha, a.operator_sha, a.go_sha], 'Exact original live ticks/argv')
    return identity


def collect(m: Any, r: dict, a: argparse.Namespace) -> None:
    bridge = m.load(m.CHECKOUT / 'tools/bot-training/bridge.py', m.MODULE_SHA['bridge'], 'supplement_actual_bridge')
    require(sys.version_info[:3] == (3, 12, 14) and 'torch' not in sys.modules, 'Supported Python; no model/library imports')
    require(subprocess.run(['node', '--version'], check=True, capture_output=True, text=True).stdout.strip() == 'v26.10.0', 'Supported actual Node')
    metadata = m.read(m.MANIFEST.parent / 'metadata.log'); scope = m.read(m.MANIFEST.parent / 'curriculum.log')
    worker = m.CHECKOUT / 'apps/api/dist/bot/training/cli.js'
    require(bridge.describe('node', worker) == metadata and bridge.episode_scope('node', worker, metadata, True) == scope, 'Exact qualified real metadata/curriculum')
    pins = {d['version']: {k: d[k] for k in ('version', 'sha256')} for d in scope['decks']}; require(set(TARGETS) <= set(pins), 'Real declared routes')
    data = RUN / 'dataset'; data.mkdir()
    m.write(data / 'config.json', {'metadata': metadata, 'curriculum': scope, 'featureVersion': 7, 'seed': r['seed'],
        'games': GAMES, 'workers': 4, 'learnerDriver': 'current-engine-teacher', 'sourceCommit': m.SOURCE,
        'targetRecipes': list(TARGETS), 'learnerSeat': 0, 'originalEpisodeIndexStride': 5, 'declaredFold': 'validation', 'sourceCheckpoint': None, 'device': None})
    st = Path('/proc', str(os.getpid()), 'stat').read_text(encoding='utf-8').rsplit(')', 1)[1].split()
    m.write(RUN / 'teacher-started.json', {'pid': os.getpid(), 'startTicks': st[19], 'parentPid': os.getppid(), 'argv': sys.argv,
        'requestSha256': a.request_sha, 'operatorSha256': a.operator_sha, 'identitySha256': a.identity_sha, 'resourceGoSha256': a.go_sha,
        'bridgeModule': {'path': str(Path(bridge.__file__)), 'sha256': m.digest(Path(bridge.__file__))},
        'primaryModelsImported': False, 'cpuOnly': True, 'actualPython': sys.version.split()[0], 'actualNode': '26.10.0'})

    def episode(index: int) -> dict:
        recipe, seat = schedule(index)
        config = {'seed': r['seed'] + index, 'decks': [recipe, recipe], 'deckPins': [pins[recipe], pins[recipe]],
            'learnerSeat': seat, 'teacher': True, 'maxDecisions': 4000, 'turnLimit': 60, 'engineSha256': m.ENGINE}
        partial = data / f'episode-{dataset_index(index):05d}.partial'; count = unavailable = 0
        with partial.open('x', encoding='utf-8') as stream, bridge.Episode('node', worker, config, data / f'episode-{dataset_index(index):05d}.log') as game:
            ready = game.receive(); require(ready['type'] == 'ready' and ready['seed'] == config['seed'] and ready['engineSha256'] == m.ENGINE, 'Actual worker handshake')
            bridge.verify_recipe_pins(ready, config)
            while True:
                message = game.receive()
                if message['type'] != 'decision':
                    m.natural(message); require(game.process.wait(timeout=5) == 0 and message['decisions'] == count, 'Actual natural terminal and worker exit0'); break
                label, executed = teacher_choice(message)
                stream.write(json.dumps({'window': message, 'action': label, 'executedAction': executed, 'engineTeacherAction': label,
                    'supervised': label is not None, 'labelOrigin': 'current-engine-teacher' if label is not None else 'unsupervised-legal-first-action-fallback',
                    'driver': 'current-engine-teacher', 'learnerRecipe': recipe}, allow_nan=False) + '\n')
                count += 1; unavailable += label is None; game.send({'decisionId': message['decisionId'], 'action': executed})
        record = {'index': index, 'originalDatasetIndex': dataset_index(index), 'config': config, 'complete': True, 'decisions': count, 'engineTeacherUnavailable': unavailable, 'result': message}
        partial.replace(data / f'episode-{dataset_index(index):05d}.jsonl'); m.write(data / f'episode-{dataset_index(index):05d}.result.json', record); return record

    records = []
    with ThreadPoolExecutor(max_workers=4) as pool:
        for start in range(0, GAMES, 20):
            records.extend(pool.map(episode, range(start, min(start + 20, GAMES))))
            print(json.dumps({'completedGames': len(records), 'wins': sum(x['result']['winnerSeat'] == 0 for x in records),
                'losses': sum(x['result']['winnerSeat'] != 0 for x in records), 'actualLearningUpdates': 0,
                'primaryModelsImported': False, 'acceptedStrengthOrMastery': False}), flush=True)
    m.write(data / 'results.json', records); require('torch' not in sys.modules, 'No primary model/library import')


def report(m: Any, r: dict) -> dict:
    helper = m.load(m.CHECKOUT / 'tools/bot-training/learning_mechanisms.py', m.MODULE_SHA['learning_mechanisms'], 'supplement_pure_labels')
    data = RUN / 'dataset'; cfg = m.read(data / 'config.json'); metadata = m.read(m.MANIFEST.parent / 'metadata.log'); scope = m.read(m.MANIFEST.parent / 'curriculum.log')
    require(cfg == {'metadata': metadata, 'curriculum': scope, 'featureVersion': 7, 'seed': r['seed'], 'games': GAMES,
        'workers': 4, 'learnerDriver': 'current-engine-teacher', 'sourceCommit': m.SOURCE, 'targetRecipes': list(TARGETS),
        'learnerSeat': 0, 'originalEpisodeIndexStride': 5, 'declaredFold': 'validation', 'sourceCheckpoint': None, 'device': None}, 'Exact actual CPU teacher config')
    pins = {d['version']: {k: d[k] for k in ('version', 'sha256')} for d in scope['decks']}
    records = m.read(data / 'results.json'); require(len(records) == GAMES and [x['index'] for x in records] == list(range(GAMES)), 'All original natural records')
    counts = {'training': Counter(), 'validation': Counter()}; unavailable = decisions = 0
    for row in records:
        i = row['index']; recipe, seat = schedule(i)
        require(row['config'] == {'seed': r['seed'] + i, 'decks': [recipe, recipe], 'deckPins': [pins[recipe], pins[recipe]],
            'learnerSeat': seat, 'teacher': True, 'maxDecisions': 4000, 'turnLimit': 60, 'engineSha256': m.ENGINE}
            and row == m.read(data / f'episode-{dataset_index(i):05d}.result.json') and row['complete'] is True and type(row['originalDatasetIndex']) is int and row['originalDatasetIndex'] == dataset_index(i), 'Exact original scope/schedule/raw record')
        m.natural(row['result']); n = absent = 0; path = data / f'episode-{dataset_index(i):05d}.jsonl'; m.safe(path)
        with path.open(encoding='utf-8') as stream:
            for line in stream:
                require(line.endswith('\n'), 'Complete newline frame'); frame = json.loads(line, object_pairs_hook=m.unique, parse_constant=m.invalid)
                label = frame_label(frame, recipe)
                if label is not None and len(frame['window']['actions']) > 1:
                    ctx = helper.sample_context(frame); counts['validation' if dataset_index(i) % 5 == 0 else 'training'][ctx['mechanism'] + ':seat0'] += 1
                n += 1; absent += label is None
        require(n == row['decisions'] == row['result']['decisions'] and absent == row['engineTeacherUnavailable'], 'All original frames/counters retained')
        unavailable += absent; decisions += n
    require(not list(data.glob('*.partial')) and not list(RUN.rglob('*.pt')), 'Incomplete or unauthorized model output')
    missing = [key for key in REQUIRED if not counts['validation'].get(key)]
    return {'sourceCommit': m.SOURCE, 'engineSha256': m.ENGINE, 'games': GAMES, 'seed': r['seed'], 'targetRecipes': list(TARGETS),
        'learnerSeat': 0, 'originalEpisodeIndexStride': 5, 'declaredFold': 'validation', 'originalIndexModuloFiveEngineTeacherCounts': {k: dict(v) for k, v in counts.items()},
        'missingRequiredValidationTeacherBins': missing, 'requiredValidationTeacherBinsCovered': not missing,
        'decisions': decisions, 'engineTeacherUnavailable': unavailable, 'wins': sum(x['result']['winnerSeat'] == 0 for x in records),
        'losses': sum(x['result']['winnerSeat'] != 0 for x in records), 'recoveredPlayRejections': sum(x['result']['recoveredPlayRejections'] for x in records),
        'actualLearningUpdates': 0, 'primaryModelsImported': False, 'acceptedStrengthOrMastery': False, 'finalBlindSeedsConsumed': False}


def outputs(m: Any) -> dict:
    result = {}
    for path in sorted(RUN.rglob('*')):
        m.safe(path)
        if path.is_file() and path != RUN / 'completion.json': result[str(path.relative_to(RUN))] = m.digest(path)
    return result


def main() -> None:
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument('--request', type=Path, required=True); p.add_argument('--request-sha', required=True); p.add_argument('--operator-sha', required=True)
    p.add_argument('--identity-sha'); p.add_argument('--go-sha'); p.add_argument('--completion-sha')
    mode = p.add_mutually_exclusive_group(); mode.add_argument('--execute', action='store_true'); mode.add_argument('--closed', action='store_true')
    a = p.parse_args(); sys.dont_write_bytecode = True; require(__debug__ and 'torch' not in sys.modules, 'Stdlib/no models before admission')
    m = data_module(); m.pin(Path(__file__), a.operator_sha); m.pin(a.request, a.request_sha); r = m.read(a.request); request_fields(m, r, a.operator_sha); snapshot(m, r, a)
    require(a.closed == (a.completion_sha is not None), 'Externally observed completion pin required for closure')
    if a.closed: m.pin(RUN / 'completion.json', a.completion_sha)
    proof = predecessor(m)
    if not a.closed:
        original = m.read(Path(r['inventory']['path'])); require(original == inventory(m, r['seed']), 'Unchanged complete fresh seed inventory')
        require(original['freshAtStart'] is True and original['observedOverlap'] == [] and original['roots'] == ['runs', 'validations'], 'Actual fresh seeds')
    if not (a.execute or a.closed):
        print(json.dumps({'readOnly': True, 'actualOriginalDataFullConsumerExitCode': 0, 'dataCompletionSha256': DATA_COMPLETION,
            'games': GAMES, 'seed': r['seed'], 'cpuOnly': True, 'primaryModelsImported': False, 'jobsStarted': False}), flush=True); return
    approved(m, r, a); whole(m, r, a, closed=a.closed); m.idle(); snapshot(m, r, a)
    if a.closed:
        m.pin(RUN / 'operator.py', a.operator_sha); require(m.read(RUN / 'request.json') == r, 'Original request/source custody')
        actual = report(m, r); require(m.read(RUN / 'report.json') == actual and m.read(RUN / 'source-before.json') == m.read(RUN / 'source-after.json') == proof, 'Full actual pre/post source/CP/data custody')
        require(m.read(RUN / 'completion.json') == {'reportSha256': m.digest(RUN / 'report.json'), 'requestSha256': a.request_sha,
            'operatorSha256': a.operator_sha, 'identitySha256': a.identity_sha, 'resourceGoSha256': a.go_sha, 'outputs': outputs(m)}, 'Complete original supplemental custody')
        print(json.dumps({'actualWholeExitCode': 0, 'completionSha256': a.completion_sha, 'report': actual, 'acceptedStrengthOrMastery': False}), flush=True); return
    m.safe(RUN); require(not RUN.exists(), 'Exclusive new data namespace'); RUN.mkdir(); m.write(RUN / 'request.json', r)
    with (RUN / 'operator.py').open('xb') as f: f.write(Path(__file__).read_bytes())
    m.write(RUN / 'source-before.json', proof); collect(m, r, a); m.idle(); snapshot(m, r, a); whole(m, r, a, closed=False)
    after = predecessor(m); require(after == proof, 'Original qualified data/source/CP proof changed'); m.write(RUN / 'source-after.json', after)
    actual = report(m, r); snapshot(m, r, a); whole(m, r, a, closed=False); m.write(RUN / 'report.json', actual)
    m.write(RUN / 'completion.json', {'reportSha256': m.digest(RUN / 'report.json'), 'requestSha256': a.request_sha,
        'operatorSha256': a.operator_sha, 'identitySha256': a.identity_sha, 'resourceGoSha256': a.go_sha, 'outputs': outputs(m)})
    print(json.dumps({'supplementComplete': True, 'completionSha256': m.digest(RUN / 'completion.json'),
        'requiredValidationTeacherBinsCovered': actual['requiredValidationTeacherBinsCovered'], 'actualLearningUpdates': 0}), flush=True)


if __name__ == '__main__':
    main()
