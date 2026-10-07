"""Collect fresh all-recipe mentor/material labels; no training or serving routing."""

import argparse
import ast
import hashlib
import importlib.util
import json
import os
import re
import shutil
import subprocess
import sys
from collections import Counter
from collections.abc import Callable
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path
from typing import Any

LAB = Path('/home/vinicius/aegis-bot-lab')
NAME = 'rule-link-current-aa2e56463-mentor-data-r1'
RUN = LAB / 'runs' / NAME
CHECKOUT = LAB / 'checkouts/rule-link-current-aa2e56463'
SOURCE = 'aa2e56463176046ea5a01419d271a53a164efbae'
ENGINE = '4536a92429c1b62041212e983b63f46206dd4f2eefe959d42b3cc1a7f13c6a2c'
GAMES = 3872
BASELINE_COMPLETION = 'b32675433481b354e965de11ed0e118f7c66aa7dc5c76326625f0ace22eff339'
PARENT_COMPLETION = '2b07d65d36f43fe5146df2d1cd0cb4c32c503b1338301d7d6c28fe066cf154fb'
PARENT_OPERATOR = LAB / 'transfers/rule-link-current-corrective-strength-r4.py'
PARENT_SHA = '624e93446f5547b2ea975315802cce2d5327aa5621432ab677e7753ca6f6ee47'
PARENT_ARGS = ['--closed', '--request', str(LAB / 'transfers/rule-link-current-aa2e56463-corrective-strength-r4-request.json'),
    '--request-sha', 'a28a986990f6e912857961bbc2a317a143c2bbf2b7376e36f3da231a43da68c2',
    '--operator-sha', PARENT_SHA, '--identity-sha', '9e48d90d6b5275387aa7bfb2667a361b4a3e640c658540d0e311ab0303360aa9',
    '--go-sha', '794af38265162febfa646208e9e74dacbb45211d510a673e140072353e3cab68']
SCANNER = LAB / 'transfers/aegis-v27-fresh-curriculum-comparison.py'
SCANNER_SHA = 'c984171ddba83eecf49b0f41c20a5fe221e7a777a0b81e456acb02cfecdd15a9'
MANIFEST = LAB / 'runs/rule-link-current-aa2e56463-prepare/source-manifest.json'
MANIFEST_SHA = '8db9d03c558991b2f9fd5ffe8b3145f942204b774b388a858163523848d4cb41'
MODULE_SHA = {
    'bridge': '5c491a9c2d4a754f338d70447d8cae19d8262e11818129a0164c8e35751701c3',
    'features': '4a56127de79b1621728fdb79854c166e885576f24c988fbb2bc7c0fa7ea6fdc7',
    'inference': '55590a3ec89a10ffaba38426aa41cbaba88c96e0ebba23d32a91a806ff979691',
    'learning_mechanisms': 'ccb14e0fa6d0c4f60247a18bb762a802d071fc62e0096d1da2897807ffca2350',
    'model': 'c8f5dc9b6af9a80b095421a47bcfea5964f17116246e1ffd5c49dcf2f9911402',
    'train': '40213cae178ee56b082e2b322cd4dea67a8296cee9463c000f5d896f125527a7',
}
PARAMETERS = {f'{layer}.{field}' for layer in ('state.0', 'state.2', 'action.0', 'action.2', 'score.1', 'value')
    for field in ('weight', 'bias')}
CP = {
    'r4': {'path': str(LAB / 'runs/rule-link-current-aa2e56463-corrective-ppo-r4/ppo/checkpoint.pt'), 'sha256': '1de36f6a1e7fc439fe34c4af71d81976a5e0b74e38fa17cd417e63dea07924c1'},
    'primary-before': {'path': str(LAB / 'runs/rule-link-current-aa2e56463-bind/primary-before.pt'), 'sha256': 'c2bdb217911d5def38ae0fda8ed76189bfbe329a906329f2cfb0b04a4de622d4'},
    'v17-reference': {'path': str(LAB / 'runs/rule-link-current-aa2e56463-bind/v17-reference.pt'), 'sha256': '3b9d75a50354a521c784e1ddc8ae7086717d6a36c8d786704f3632ebf5bf62b9'},
    'source-challenger': {'path': str(LAB / 'runs/rule-link-current-aa2e56463-bind/source-challenger.pt'), 'sha256': 'da76daf3ca1f1f781d33d4617eb83c1b8c6b3ada6c1a1953236e8c5df0d29a68'},
    'fitted-reference': {'path': str(LAB / 'runs/rule-link-current-aa2e56463-bind/fitted-reference.pt'), 'sha256': '089ded9c2f478d7aed34a0da732b34e5853cbd4fde7a44400e75bd3e0bdf609d'},
}


def require(value: bool, message: str) -> None:
    if not value:
        raise ValueError(message)


def safe(path: Path) -> None:
    require(path.is_absolute() and '..' not in path.parts and not any(p.is_symlink() for p in (path, *path.parents)), 'Unsafe path')


def digest(path: Path) -> str:
    safe(path)
    require(path.is_file(), 'Missing regular file: ' + str(path))
    with path.open('rb') as stream:
        return hashlib.file_digest(stream, 'sha256').hexdigest()


def pin(path: Path, sha: str) -> None:
    require(type(sha) is str and re.fullmatch('[a-f0-9]{64}', sha) is not None and digest(path) == sha, 'Pinned bytes changed: ' + str(path))


def unique(pairs: list[tuple[str, Any]]) -> dict:
    result = {}
    for key, value in pairs:
        require(key not in result, 'Duplicate JSON key')
        result[key] = value
    return result


def invalid(value: str) -> None:
    raise ValueError('Nonfinite JSON: ' + value)


def read(path: Path) -> Any:
    safe(path)
    require(path.is_file(), 'Missing regular JSON')
    return json.loads(path.read_text(encoding='utf-8'), object_pairs_hook=unique, parse_constant=invalid)


def write(path: Path, value: Any) -> None:
    safe(path)
    with path.open('x', encoding='utf-8') as stream:
        json.dump(value, stream, sort_keys=True, indent=2, allow_nan=False)
        stream.write('\n')


def load(path: Path, sha: str, name: str) -> Any:
    pin(path, sha)
    spec = importlib.util.spec_from_file_location(name, path)
    require(spec is not None and spec.loader is not None, 'Source loader')
    module = importlib.util.module_from_spec(spec)
    sys.modules[name] = module
    spec.loader.exec_module(module)
    return module


def inventory(seed: int) -> dict:
    pin(SCANNER, SCANNER_SHA)
    nodes = [n for n in ast.parse(SCANNER.read_text(encoding='utf-8')).body if isinstance(n, ast.FunctionDef) and n.name == 'inventory_seeds']
    require(len(nodes) == 1, 'Original complete seed scanner')
    namespace = dict(Path=Path, Any=Any, LAB=LAB, RUN=RUN, SEED=seed, GAMES=GAMES, read=read, digest=digest, re=re)
    exec(compile(ast.Module(body=nodes, type_ignores=[]), str(SCANNER), 'exec'), namespace)
    return namespace['inventory_seeds']()


def inventory_fields(value: dict, seed: int) -> None:
    require(type(value['seed']) is int and value['seed'] == seed and type(value['games']) is int
        and value['games'] == GAMES and value['excludedThisNewRun'] == str(RUN)
        and value['roots'] == ['runs', 'validations'] and value['freshAtStart'] is True
        and value['observedOverlap'] == [] and bool(value['observedScheduleFiles']), 'Actual complete fresh seed receipt')


def mentor_map(parent: dict, baseline: dict) -> dict[str, str]:
    for report in (parent, baseline):
        require(report['sourceCommit'] == SOURCE and report['engineSha256'] == ENGINE
            and type(report['actualLearningUpdates']) is int and report['actualLearningUpdates'] == 0
            and report['acceptedStrengthOrMastery'] is False and report['finalBlindSeedsConsumed'] is False, 'Same qualified frozen reports')
    candidate = parent['candidate']
    require(candidate['games'] == GAMES and candidate['seed'] == 6135000 and len(candidate['byDeck']) == 44, 'Full paired all44 candidate')
    result = {}
    for recipe, row in candidate['byDeck'].items():
        require(row['games'] == 88 and row['draws'] == 0, 'All88 natural candidate cells')
        scores = {'r4': row['wins']}
        for name in CP:
            if name == 'r4':
                continue
            policy = baseline['policies'][name]
            require(policy['games'] == GAMES and policy['seed'] == 6135000 and set(policy['byDeck']) == set(candidate['byDeck']), 'Same complete reference schedule')
            entry = policy['byDeck'][recipe]
            require(entry['games'] == 88 and entry['draws'] == 0, 'All88 natural reference cells')
            scores[name] = entry['wins']
        maximum = max(scores.values())
        # Insertion order deliberately retains R4 on equal scores.
        result[recipe] = next(name for name, value in scores.items() if value == maximum)
    return result


def parent_proof() -> dict:
    pin(PARENT_OPERATOR, PARENT_SHA)
    try:
        result = subprocess.run([str(LAB / 'venv/bin/python'), '-B', str(PARENT_OPERATOR), *PARENT_ARGS],
            check=True, capture_output=True, text=True)
    except subprocess.CalledProcessError as error:
        if RUN.is_dir():
            write(RUN / 'parent-consumer-failure.json', {'exitCode': error.returncode, 'stderr': error.stderr, 'stdout': error.stdout})
        raise ValueError('Unchanged predecessor consumer failed: ' + error.stderr[-4000:]) from error
    proof = json.loads(result.stdout, object_pairs_hook=unique, parse_constant=invalid)
    require(type(proof['actualWholeExitCode']) is int and proof['actualWholeExitCode'] == 0
        and proof['completionSha256'] == PARENT_COMPLETION and proof['report']['checkpoint'] == CP['r4'], 'Actual full R4 predecessor')
    return proof


def request_fields(request: dict, sha: str) -> None:
    expected = {'purpose': 'fresh-current-source-mentored-demonstrations', 'sourceCommit': SOURCE, 'engineSha256': ENGINE,
        'operatorSha256': sha, 'run': str(RUN), 'checkpoints': CP, 'games': GAMES, 'workers': 4, 'actualUpdates': 0,
        'seed': request.get('seed'), 'mentorsByRecipe': request.get('mentorsByRecipe'),
        'parentCompletionSha256': PARENT_COMPLETION, 'baselineCompletionSha256': BASELINE_COMPLETION,
        'inventory': request.get('inventory'), 'wrapper': request.get('wrapper'), 'finalBlindSeedsAuthorized': False}
    require(request == expected and type(request['games']) is int and type(request['workers']) is int
        and type(request['actualUpdates']) is int and type(request['seed']) is int
        and 6000000 <= request['seed'] and request['seed'] + GAMES <= 6120000, 'Exact fresh data-only request')
    require(type(request['mentorsByRecipe']) is dict and len(request['mentorsByRecipe']) == 44
        and set(request['mentorsByRecipe'].values()) <= set(CP), 'All44 qualified data mentors')
    require(request['wrapper']['path'] == str(LAB / 'transfers' / (NAME + '-launch.sh'))
        and set(request['wrapper']) == {'path', 'sha256'}, 'Exact original wrapper')
    require(request['inventory']['path'] == str(LAB / 'transfers' / (NAME + '-seed-inventory.json'))
        and set(request['inventory']) == {'path', 'sha256'}, 'Bound complete seed inventory')


def snapshot(request: dict, args: argparse.Namespace) -> None:
    pin(Path(__file__), args.operator_sha)
    pin(args.request, args.request_sha)
    pin(Path(request['wrapper']['path']), request['wrapper']['sha256'])
    pin(Path(request['inventory']['path']), request['inventory']['sha256'])
    pin(LAB / 'runs/rule-link-current-aa2e56463-corrective-strength-r4/completion.json', PARENT_COMPLETION)
    pin(LAB / 'runs/rule-link-current-aa2e56463-strength/completion.json', BASELINE_COMPLETION)
    for cp in CP.values():
        pin(Path(cp['path']), cp['sha256'])
    qualified_modules()


def qualified_modules() -> dict:
    """Cheap byte admission before imports; the full consumer binds the runtime."""
    pin(MANIFEST, MANIFEST_SHA)
    manifest = read(MANIFEST)
    require(manifest['sourceCommit'] == SOURCE, 'Original qualified source manifest')
    modules = {}
    for name, sha in MODULE_SHA.items():
        relative = 'tools/bot-training/' + name + '.py'
        require(manifest['files'][relative] == sha, 'Qualified module manifest pin')
        path = CHECKOUT / relative
        pin(path, sha)
        modules[name] = {'path': str(path), 'sha256': sha}
    return modules


def frozen_fields(frozen: dict, modules: dict) -> None:
    require(frozen['checkpoints'] == CP and frozen['before'] == frozen['after'] and set(frozen['before']) == set(CP)
        and all(set(v) == PARAMETERS and all(type(sha) is str and re.fullmatch('[a-f0-9]{64}', sha) is not None
            for sha in v.values()) for v in frozen['before'].values())
        and type(frozen['actualLearningUpdates']) is int and frozen['actualLearningUpdates'] == 0
        and frozen['allFinite'] is True and frozen['actualPython'] == '3.12.14'
        and frozen['torchVersion'] == '2.7.1+cu128' and frozen['device'] == 'cuda'
        and frozen['modulePaths'] == modules, 'Exact frozen finite tensors and qualified modules')


def idle() -> None:
    runtime = load(LAB / 'transfers/rule-link-current-runtime.py', '6f45a14e9b7980974e63739d16652cfe9e074fe9816e4fbb1f712c9e55a534d0', 'mentor_static_runtime')
    helper = runtime.load(runtime.V50, runtime.V50_SHA, 'mentor_static_idle')
    helper.require_idle()
    require(not subprocess.run(['nvidia-smi', '--query-compute-apps=pid', '--format=csv,noheader,nounits'], check=True, capture_output=True, text=True).stdout.strip(), 'GPU occupied')


def approved(request: dict, args: argparse.Namespace) -> None:
    require(args.go_sha is not None, 'Separate actual ROOT collection agreement')
    path = LAB / 'transfers' / (NAME + '-ROOT-go.json')
    pin(path, args.go_sha)
    value = read(path)
    require(all(type(value.get(key)) is int for key in ('actualGamesAuthorized', 'actualLearningUpdatesAuthorized', 'maximumConcurrentGameWorkers', 'seed')),
        'Integer ROOT resource counts')
    require(value == {'phase': request['purpose'], 'requestSha256': args.request_sha, 'operatorSha256': args.operator_sha,
        'sourceReviewed': True, 'resourceAgreed': True, 'actualGamesAuthorized': GAMES,
        'actualLearningUpdatesAuthorized': 0, 'maximumConcurrentGameWorkers': 4, 'seed': request['seed'],
        'finalBlindSeedsAuthorized': False}, 'Exact data-only resource Go')


def whole(request: dict, args: argparse.Namespace, *, closed: bool) -> dict:
    require(args.identity_sha is not None, 'Actual whole identity required')
    path = LAB / 'transfers' / (NAME + '-identity.json')
    pin(path, args.identity_sha)
    identity = read(path)
    require(set(identity) == {'wholeWrapperPid', 'startTicks', 'run', 'operatorSha256', 'wrapperSha256'}
        and type(identity['wholeWrapperPid']) is int and type(identity['startTicks']) is str
        and identity['run'] == NAME and identity['operatorSha256'] == args.operator_sha
        and identity['wrapperSha256'] == request['wrapper']['sha256'], 'Exact original whole')
    pin(Path(str(RUN) + '-launch') / 'launch.sh', request['wrapper']['sha256'])
    proc = Path('/proc') / str(identity['wholeWrapperPid'])
    if closed:
        exit_path = Path(str(RUN) + '-launch') / 'exit-code.txt'
        safe(exit_path)
        require(exit_path.read_bytes() == b'0\n', 'Actual original whole0')
        if proc.exists():
            stat = (proc / 'stat').read_text(encoding='utf-8').rsplit(')', 1)[1].split()
            require(stat[19] != identity['startTicks'], 'Original whole still present')
    else:
        require(proc.exists(), 'Original whole missing')
        stat = (proc / 'stat').read_text(encoding='utf-8').rsplit(')', 1)[1].split()
        require(stat[0] != 'Z' and stat[19] == identity['startTicks'], 'Original live start ticks')
        argv = [p.decode('utf-8') for p in (proc / 'cmdline').read_bytes().split(b'\0') if p]
        require(len(argv) == 5 and Path(argv[0]).name == 'bash'
            and argv[1:] == [request['wrapper']['path'], args.request_sha, args.operator_sha, args.go_sha], 'Exact whole argv')
    return identity


def choose_label(window: dict, mentor: int, teacher: int | None, classify: Callable, mechanisms: tuple) -> tuple[int, str]:
    require(window.get('role', 'learner') == 'learner' and type(window['observation']['seat']) is int
        and window['observation']['seat'] in (0, 1), 'Learner-only labels')
    require(type(mentor) is int and 0 <= mentor < len(window['actions']), 'Legal frozen mentor index')
    require(teacher is None or (type(teacher) is int and 0 <= teacher < len(window['actions'])), 'Legal or unavailable actual teacher label')
    if teacher is not None and classify(window, teacher) in mechanisms:
        return teacher, 'current-engine-compound-material-teacher'
    return mentor, 'frozen-best-qualified-policy'


def natural(row: dict) -> None:
    require(row['type'] == 'result' and row['terminated'] is True and row['truncated'] is False
        and row['reason'] in ('security', 'deckOut') and type(row['winnerSeat']) is int and row['winnerSeat'] in (0, 1)
        and type(row['decisions']) is int and 0 < row['decisions'] < 4000
        and row['errors'] == row['rejections'] == row['asyncRejections'] == [] and 'trainingForfeit' not in row,
        'Natural loss/win required; preserve failures without discarding')


def child(request: dict, args: argparse.Namespace) -> None:
    snapshot(request, args)
    approved(request, args)
    identity = whole(request, args, closed=False)
    auth = read(RUN / 'collector-authorized.json')
    require(auth['parentPid'] == os.getppid() and auth['identitySha256'] == args.identity_sha
        and auth['requestSha256'] == args.request_sha and auth['operatorSha256'] == args.operator_sha
        and auth['resourceGoSha256'] == args.go_sha and auth['parentCompletionSha256'] == PARENT_COMPLETION, 'Actual source-admitted CPU parent')
    proc = Path('/proc') / str(os.getppid())
    stat = (proc / 'stat').read_text(encoding='utf-8').rsplit(')', 1)[1].split()
    argv = [p.decode('utf-8') for p in (proc / 'cmdline').read_bytes().split(b'\0') if p]
    require(stat[0] != 'Z' and stat[19] == auth['parentStartTicks'] and int(stat[1]) == identity['wholeWrapperPid']
        and str(Path(__file__)) in argv and '--execute' in argv, 'Direct live collector parent')
    parent = read(RUN / 'parent-before.json')
    require(parent['actualWholeExitCode'] == 0 and parent['completionSha256'] == PARENT_COMPLETION, 'Actual parent proof artifact')
    idle()
    self_stat = Path('/proc', str(os.getpid()), 'stat').read_text(encoding='utf-8').rsplit(')', 1)[1].split()
    write(RUN / 'collector-started.json', {'pid': os.getpid(), 'parentPid': os.getppid(), 'startTicks': self_stat[19],
        'argv': sys.argv, 'requestSha256': args.request_sha, 'operatorSha256': args.operator_sha,
        'identitySha256': args.identity_sha, 'resourceGoSha256': args.go_sha, 'phase': 'frozen-mentor-dataset-only'})
    require(shutil.disk_usage(LAB).free > 12 * 1024**3, 'Collection disk budget')
    require(sys.version_info[:3] == (3, 12, 14), 'Supported actual Python')
    require(subprocess.run(['node', '--version'], check=True, capture_output=True, text=True).stdout.strip() == 'v26.10.0', 'Supported actual Node')
    sys.path.insert(0, str(CHECKOUT / 'tools/bot-training'))
    import torch
    import bridge
    import features
    import inference
    import learning_mechanisms
    import model
    import train
    torch.set_num_threads(2)
    require(str(torch.__version__) == '2.7.1+cu128' and torch.cuda.is_available(), 'Qualified Torch/CUDA')
    modules = {}
    for module in (bridge, features, inference, learning_mechanisms, model, train):
        path = Path(module.__file__)
        safe(path)
        require(path.parent == CHECKOUT / 'tools/bot-training', 'Exact qualified Python module path')
        modules[module.__name__] = {'path': str(path), 'sha256': digest(path)}
    require(modules == qualified_modules(), 'Imported module bytes match admitted source')
    worker = CHECKOUT / 'apps/api/dist/bot/training/cli.js'
    metadata = bridge.describe('node', worker)
    scope = bridge.episode_scope('node', worker, metadata, True)
    require(metadata['engineSha256'] == ENGINE and features.FEATURE_VERSION == 7 and len(scope['decks']) == 44
        and len(metadata['cardIds']) == 479
        and metadata == read(MANIFEST.parent / 'metadata.log')
        and scope == read(MANIFEST.parent / 'curriculum.log'), 'Exact qualified scope')
    policies = {}
    before = {}
    for name, cp in CP.items():
        scorer = inference.CheckpointScorer(Path(cp['path']), 'cuda')
        require(scorer.metadata == metadata and scorer.checkpoint_sha256 == cp['sha256'], 'Exact frozen current metadata')
        scorer.model.requires_grad_(False)
        policies[name] = scorer
        before[name] = {k: hashlib.sha256(v.detach().cpu().numpy().tobytes()).hexdigest() for k, v in scorer.model.state_dict().items()}
        require(set(before[name]) == PARAMETERS and all(torch.isfinite(p).all().item() for p in scorer.model.parameters()),
            'Exact finite frozen model parameters')
    data = RUN / 'dataset'
    data.mkdir()
    write(data / 'config.json', {'metadata': metadata, 'curriculum': scope, 'featureVersion': 7,
        'seed': request['seed'], 'games': GAMES, 'workers': 4, 'learnerDriver': 'frozen-mentor-or-engine-material',
        'device': 'cuda', 'sourceCheckpoint': CP['r4'], 'mentorCheckpoints': CP,
        'mentorsByRecipe': request['mentorsByRecipe'], 'sourceCommit': SOURCE, 'labelOrigins': ['frozen-best-qualified-policy', 'current-engine-compound-material-teacher']})
    versions = [d['version'] for d in scope['decks']]
    require(set(versions) == set(request['mentorsByRecipe']), 'All44 data mentor scope')
    pins = {d['version']: {k: d[k] for k in ('version', 'sha256')} for d in scope['decks']}

    def collect(index: int) -> dict:
        decks, seat = bridge.scheduled_episode(versions, index)
        recipe = decks[seat]
        mentor_name = request['mentorsByRecipe'][recipe]
        scorer = policies[mentor_name]
        config = {'seed': request['seed'] + index, 'decks': decks, 'deckPins': [pins[v] for v in decks],
            'learnerSeat': seat, 'teacher': True, 'maxDecisions': 4000, 'turnLimit': 60, 'engineSha256': ENGINE}
        partial = data / f'episode-{index:05d}.partial'
        count = 0
        unavailable = 0
        origins = Counter()
        with partial.open('x', encoding='utf-8') as trajectory, bridge.Episode('node', worker, config, data / f'episode-{index:05d}.log') as episode:
            ready = episode.receive()
            require(ready['type'] == 'ready' and ready['seed'] == config['seed'] and ready['engineSha256'] == ENGINE, 'Exact worker handshake')
            bridge.verify_recipe_pins(ready, config)
            while True:
                message = episode.receive()
                if message['type'] != 'decision':
                    natural(message)
                    require(episode.process.wait(timeout=5) == 0 and message['decisions'] == count, 'Actual worker closure/frame count')
                    break
                require('teacher' in message, 'Actual requested engine teacher missing')
                teacher = message['teacher']['action']
                mentor = train.greedy_action(scorer.model, scorer.encoder, message, scorer.device)
                target, origin = choose_label(message, mentor, teacher, learning_mechanisms.label_mechanism, learning_mechanisms.MECHANISMS)
                trajectory.write(json.dumps({'window': message, 'action': target, 'executedAction': target,
                    'driver': 'frozen-mentor-or-engine-material', 'supervised': True, 'labelOrigin': origin,
                    'engineTeacherAction': teacher, 'frozenMentorAction': mentor, 'mentorPolicy': mentor_name,
                    'learnerRecipe': recipe}, allow_nan=False) + '\n')
                count += 1
                unavailable += teacher is None
                origins[origin] += 1
                episode.send({'decisionId': message['decisionId'], 'action': target})
        record = {'index': index, 'config': config, 'complete': True, 'decisions': count,
            'engineTeacherUnavailable': unavailable, 'labelOrigins': dict(origins), 'mentorPolicy': mentor_name, 'result': message}
        partial.replace(data / f'episode-{index:05d}.jsonl')
        write(data / f'episode-{index:05d}.result.json', record)
        return record

    records = []
    with ThreadPoolExecutor(max_workers=4) as pool:
        for start in range(0, GAMES, 88):
            records.extend(pool.map(collect, range(start, min(start + 88, GAMES))))
            print(json.dumps({'completedGames': len(records), 'actualLearningUpdates': 0,
                'wins': sum(r['result']['winnerSeat'] == r['config']['learnerSeat'] for r in records),
                'losses': sum(r['result']['winnerSeat'] != r['config']['learnerSeat'] for r in records),
                'recoveredPlayRejections': sum(r['result']['recoveredPlayRejections'] for r in records),
                'acceptedStrengthOrMastery': False}), flush=True)
    write(data / 'results.json', records)
    after = {}
    for name, scorer in policies.items():
        require(all(torch.isfinite(p).all().item() for p in scorer.model.parameters()), 'Finite frozen tensors after collection')
        after[name] = {k: hashlib.sha256(v.detach().cpu().numpy().tobytes()).hexdigest() for k, v in scorer.model.state_dict().items()}
    require(before == after, 'Frozen mentor tensor bytes changed')
    snapshot(request, args)
    for item in modules.values():
        pin(Path(item['path']), item['sha256'])
    write(RUN / 'frozen-model-proof.json', {'checkpoints': CP, 'before': before, 'after': after,
        'modulePaths': modules, 'actualLearningUpdates': 0, 'actualPython': sys.version.split()[0],
        'torchVersion': str(torch.__version__), 'device': 'cuda', 'allFinite': True})


def data_report(request: dict) -> dict:
    # Strict raw verification, without importing a primary model.
    mechanism = CHECKOUT / 'tools/bot-training/learning_mechanisms.py'
    helper = load(mechanism, 'ccb14e0fa6d0c4f60247a18bb762a802d071fc62e0096d1da2897807ffca2350', 'mentor_pure_label_rules')
    data = RUN / 'dataset'
    cfg = read(data / 'config.json')
    require(cfg['metadata']['engineSha256'] == ENGINE and cfg['featureVersion'] == 7 and cfg['games'] == GAMES
        and cfg['seed'] == request['seed'] and cfg['workers'] == 4 and cfg['mentorCheckpoints'] == CP
        and cfg['mentorsByRecipe'] == request['mentorsByRecipe'] and cfg['sourceCommit'] == SOURCE
        and cfg['metadata'] == read(MANIFEST.parent / 'metadata.log')
        and cfg['curriculum'] == read(MANIFEST.parent / 'curriculum.log'), 'Actual data configuration')
    versions = [d['version'] for d in cfg['curriculum']['decks']]
    pins = {d['version']: {k: d[k] for k in ('version', 'sha256')} for d in cfg['curriculum']['decks']}
    require(len(versions) == len(set(versions)) == 44 and set(versions) == set(request['mentorsByRecipe']), 'Actual all44 scope')
    records = read(data / 'results.json')
    require(len(records) == GAMES and {r['index'] for r in records} == set(range(GAMES)), 'All completed unique records')
    counts = Counter()
    labels = Counter()
    contexts = {'training': [], 'validation': []}
    visible = {0: set(), 1: set()}
    for record in records:
        i = record['index']
        require(type(i) is int and record['complete'] is True, 'Actual original completed episode')
        learner = i % 44
        opponent = (learner + i // 88) % 44
        seat = (i // 44) % 2
        decks = [versions[learner], versions[opponent]]
        if seat:
            decks.reverse()
        expected = {'seed': request['seed'] + i, 'decks': decks, 'deckPins': [pins[v] for v in decks], 'learnerSeat': seat,
            'teacher': True, 'maxDecisions': 4000, 'turnLimit': 60, 'engineSha256': ENGINE}
        require(record['config'] == expected and record == read(data / f'episode-{i:05d}.result.json'), 'Exact schedule/raw terminal record')
        natural(record['result'])
        recipe = decks[seat]
        counts[f'{recipe}:seat{seat}'] += 1
        origins = Counter()
        unavailable = 0
        frames = 0
        frame_path = data / f'episode-{i:05d}.jsonl'
        safe(frame_path)
        with frame_path.open(encoding='utf-8') as stream:
            for line in stream:
                require(line.endswith('\n'), 'Incomplete data frame')
                row = json.loads(line, object_pairs_hook=unique, parse_constant=invalid)
                window = row['window']
                require(row['supervised'] is True and row['learnerRecipe'] == recipe
                    and row['mentorPolicy'] == request['mentorsByRecipe'][recipe] and window['observation']['seat'] == seat
                    and row['engineTeacherAction'] == window['teacher']['action'], 'Actual supervisor provenance')
                selected, origin = choose_label(window, row['frozenMentorAction'], row['engineTeacherAction'], helper.label_mechanism, helper.MECHANISMS)
                require(type(row['action']) is int and type(row['executedAction']) is int
                    and row['action'] == row['executedAction'] == selected and row['labelOrigin'] == origin, 'Actual label/execution agreement')
                origins[origin] += 1
                unavailable += row['engineTeacherAction'] is None
                if len(window['actions']) > 1:
                    contexts['validation' if i % 5 == 0 else 'training'].append(helper.sample_context(row))
                for player in window['observation']['players']:
                    if player['seat'] == seat:
                        for zone in ('hand', 'trash', 'delay', 'faceUpSecurity'):
                            visible[seat].update(c['cardId'] for c in player[zone])
                        for permanent in player['board'] + ([player['breeding']] if player.get('breeding') else []):
                            visible[seat].add(permanent['top']['cardId'])
                            visible[seat].update(c['cardId'] for c in permanent['stack'] + permanent['linked'])
                frames += 1
        require(frames == record['decisions'] == record['result']['decisions']
            and dict(origins) == record['labelOrigins'] and unavailable == record['engineTeacherUnavailable'], 'All frames/counters retained')
        labels.update(origins)
    require(set(counts.values()) == {44} and len(counts) == 88, 'All recipes/both seats/full paired cells')
    require(not list(data.glob('*.partial')) and not list(RUN.rglob('*.pt')), 'Incomplete data or unauthorized checkpoint output')
    frozen = read(RUN / 'frozen-model-proof.json')
    frozen_fields(frozen, qualified_modules())
    target = {c for c in cfg['metadata']['cardIds'] if c.startswith(('BT26-', 'EX13-'))}
    require(len(target) == 181, 'Actual all181 target vocabulary')
    coverage = helper.coverage(contexts)
    missing = {str(seat): sorted(target - visible[seat]) for seat in (0, 1)}
    return {'sourceCommit': SOURCE, 'engineSha256': ENGINE, 'games': GAMES, 'seed': request['seed'],
        'recipeSeatCounts': dict(counts), 'labelOrigins': dict(labels), 'missingSetCardsVisibleBySeat': missing,
        'all181VisibleBothSeats': not any(missing.values()), 'mechanismCoverage': coverage,
        'eligibleForMechanismResampling': coverage['allMechanismsBothSeatsBothFolds'] and not any(missing.values()),
        'wins': sum(r['result']['winnerSeat'] == r['config']['learnerSeat'] for r in records),
        'losses': sum(r['result']['winnerSeat'] != r['config']['learnerSeat'] for r in records),
        'recoveredPlayRejections': sum(r['result']['recoveredPlayRejections'] for r in records),
        'actualLearningUpdates': 0, 'acceptedStrengthOrMastery': False, 'finalBlindSeedsConsumed': False}


def file_map() -> dict:
    result = {}
    for path in sorted(RUN.rglob('*')):
        safe(path)
        if path.is_file() and path != RUN / 'completion.json':
            result[str(path.relative_to(RUN))] = digest(path)
    return result


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--request', type=Path, required=True)
    parser.add_argument('--request-sha', required=True)
    parser.add_argument('--operator-sha', required=True)
    parser.add_argument('--identity-sha')
    parser.add_argument('--go-sha')
    parser.add_argument('--completion-sha')
    mode = parser.add_mutually_exclusive_group()
    mode.add_argument('--execute', action='store_true')
    mode.add_argument('--closed', action='store_true')
    mode.add_argument('--child', action='store_true')
    args = parser.parse_args()
    sys.dont_write_bytecode = True
    require(__debug__ and 'torch' not in sys.modules, 'Stdlib before source/resource admission')
    require(args.closed == (args.completion_sha is not None), 'Closed reader requires externally observed completion pin')
    if args.closed:
        pin(RUN / 'completion.json', args.completion_sha)
    pin(Path(__file__), args.operator_sha)
    pin(args.request, args.request_sha)
    request = read(args.request)
    request_fields(request, args.operator_sha)
    snapshot(request, args)
    if args.child:
        child(request, args)
        return
    proof = parent_proof()
    pin(LAB / 'runs/rule-link-current-aa2e56463-strength/completion.json', BASELINE_COMPLETION)
    baseline_receipt = read(LAB / 'runs/rule-link-current-aa2e56463-strength/completion.json')
    pin(LAB / 'runs/rule-link-current-aa2e56463-strength/report.json', baseline_receipt['reportSha256'])
    baseline = read(LAB / 'runs/rule-link-current-aa2e56463-strength/report.json')
    require(mentor_map(proof['report'], baseline) == request['mentorsByRecipe'], 'Actual full-report data mentorship')
    if not args.closed:
        inventory_fields(read(Path(request['inventory']['path'])), request['seed'])
        require(inventory(request['seed']) == read(Path(request['inventory']['path'])), 'Fresh complete seed inventory changed')
    if not (args.execute or args.closed):
        print(json.dumps({'readOnly': True, 'primaryModelsImported': False, 'jobsStarted': False,
            'actualParentFullConsumerExitCode': 0, 'parentCompletionSha256': PARENT_COMPLETION,
            'mentorRecipeCounts': dict(Counter(request['mentorsByRecipe'].values())), 'games': GAMES,
            'seed': request['seed'], 'actualLearningUpdates': 0, 'acceptedStrengthOrMastery': False}), flush=True)
        return
    approved(request, args)
    whole(request, args, closed=args.closed)
    idle()
    snapshot(request, args)
    if args.closed:
        pin(RUN / 'operator.py', args.operator_sha)
        require(read(RUN / 'request.json') == request, 'Original request custody')
        report = data_report(request)
        require(read(RUN / 'report.json') == report, 'Complete original data report')
        require(read(RUN / 'parent-before.json') == read(RUN / 'parent-after.json') == proof, 'Actual full pre/post source proof')
        receipt = read(RUN / 'completion.json')
        require(receipt == {'reportSha256': digest(RUN / 'report.json'), 'requestSha256': args.request_sha,
            'operatorSha256': args.operator_sha, 'identitySha256': args.identity_sha, 'resourceGoSha256': args.go_sha,
            'outputs': file_map()}, 'Complete actual original data custody')
        print(json.dumps({'actualWholeExitCode': 0, 'completionSha256': digest(RUN / 'completion.json'),
            'report': report, 'acceptedStrengthOrMastery': False}), flush=True)
        return
    safe(RUN)
    require(not RUN.exists(), 'Exclusive fresh data namespace')
    RUN.mkdir()
    write(RUN / 'request.json', request)
    with (RUN / 'operator.py').open('xb') as stream:
        stream.write(Path(__file__).read_bytes())
    write(RUN / 'parent-before.json', proof)
    stat = Path('/proc', str(os.getpid()), 'stat').read_text(encoding='utf-8').rsplit(')', 1)[1].split()
    write(RUN / 'collector-authorized.json', {'parentPid': os.getpid(), 'parentStartTicks': stat[19],
        'requestSha256': args.request_sha, 'operatorSha256': args.operator_sha, 'identitySha256': args.identity_sha,
        'resourceGoSha256': args.go_sha, 'parentCompletionSha256': PARENT_COMPLETION})
    cmd = [str(LAB / 'venv/bin/python'), '-B', str(Path(__file__)), '--child', '--request', str(args.request),
        '--request-sha', args.request_sha, '--operator-sha', args.operator_sha,
        '--identity-sha', args.identity_sha, '--go-sha', args.go_sha]
    subprocess.run(cmd, check=True)
    # The CUDA process has actually exited before the legacy whole consumer.
    idle()
    snapshot(request, args)
    after = parent_proof()
    require(after == proof, 'Actual predecessor/source/CP/raw maps changed')
    write(RUN / 'parent-after.json', after)
    report = data_report(request)
    write(RUN / 'report.json', report)
    write(RUN / 'completion.json', {'reportSha256': digest(RUN / 'report.json'), 'requestSha256': args.request_sha,
        'operatorSha256': args.operator_sha, 'identitySha256': args.identity_sha, 'resourceGoSha256': args.go_sha,
        'outputs': file_map()})
    print(json.dumps({'collectionComplete': True, 'completionSha256': digest(RUN / 'completion.json'),
        'eligibleForMechanismResampling': report['eligibleForMechanismResampling'],
        'actualLearningUpdates': 0, 'acceptedStrengthOrMastery': False}), flush=True)


if __name__ == '__main__':
    main()
