"""Warm anchored imitation of a fully closed fresh mentor dataset; no new games."""

import argparse
import hashlib
import importlib.util
import json
import math
import os
import re
import shutil
import subprocess
import sys
from pathlib import Path
from typing import Any

LAB = Path('/home/vinicius/aegis-bot-lab')
NAME = 'rule-link-current-aa2e56463-mentor-imitation-r1'
RUN = LAB / 'runs' / NAME
DATA_OPERATOR = LAB / 'transfers/rule-link-current-mentor-collection.py'
DATA_SHA = '61de62422b2963c90321251df521f0d0720582674c90bef0e73c00ce5729e3f2'
DATA_REQUEST_SHA = '5627db4efa83936ead839829c98d84d9e9dc592cda7b77ffe917631e46598343'
DATA_IDENTITY_SHA = 'ca05ae5c851f7f6c3a55c6d578b93b4e9ac4c0e5f0d80bac9f2d9c7c70fa56f6'
DATA_GO_SHA = '3c58a954ba7a17de78cd0229b94522167f24ba1bb8278b33ea697b2e8a0a81a5'
SOURCE = 'aa2e56463176046ea5a01419d271a53a164efbae'
ENGINE = '4536a92429c1b62041212e983b63f46206dd4f2eefe959d42b3cc1a7f13c6a2c'
CHECKOUT = LAB / 'checkouts/rule-link-current-aa2e56463'
EPOCHS = 3
SEED = 424006  # Optimizer RNG only; no episode is launched by imitation.
RATE = 1e-5
ANCHOR = 0.1
SHARE = 0.2
EXTRA_MODULES = {
    'imitate': '8ccc98d14358f7d61ebc7e9ea9e1c7558d0943ce3bfb9c125dd770068e0b70d9',
    'adaptation': '907244a5678bdf9ded497bd7623a3bf62af8faeee302593c6bcdb29b945cd373',
    'migrate': '44d9076672fc72163eee7ecff9a5c501f75a54b184c35b98c9f515cfcc6ed74b',
}


def require(value: bool, message: str) -> None:
    if not value:
        raise ValueError(message)


def data_module() -> Any:
    # Importing this sealed operator imports stdlib only, never its CUDA child.
    require(DATA_OPERATOR.is_file() and not any(p.is_symlink() for p in (DATA_OPERATOR, *DATA_OPERATOR.parents)), 'Regular producer source')
    require(hashlib.sha256(DATA_OPERATOR.read_bytes()).hexdigest() == DATA_SHA, 'Original producer source pin')
    spec = importlib.util.spec_from_file_location('imitation_static_producer', DATA_OPERATOR)
    require(spec is not None and spec.loader is not None, 'Producer source loader')
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def budget(report: dict) -> dict:
    require(report['sourceCommit'] == SOURCE and report['engineSha256'] == ENGINE and report['games'] == 3872
        and type(report['actualLearningUpdates']) is int and report['actualLearningUpdates'] == 0
        and report['eligibleForMechanismResampling'] is True and report['all181VisibleBothSeats'] is True
        and report['acceptedStrengthOrMastery'] is False and report['finalBlindSeedsConsumed'] is False, 'Actual fully covered same-source data only')
    coverage = report['mechanismCoverage']
    require(coverage['allMechanismsBothSeatsBothFolds'] is True
        and coverage['missingMechanismSeatsByFold'] == {'training': [], 'validation': []}
        and coverage['physicalExecutionOrStrengthEstablished'] is False, 'Original-fold supervision coverage')
    counts = coverage['nontrivialSupervisedLabelsByFold']
    families = ('linkCard', 'dnaDigivolve', 'appFusion', 'mainAssembly', 'mainAssemblyMaterial',
        'effectAssemblyMaterial', 'mainDigiXros', 'effectDigiXrosMaterial')
    for fold in ('training', 'validation'):
        require(all(type(v) is int and v > 0 for v in counts[fold].values()), 'Positive exact original sample counts')
        require(all(counts[fold].get(f'{family}:seat{seat}', 0) > 0 for family in families for seat in (0, 1)), 'All sixteen original mechanism/seat bins')
    original = sum(counts['training'].values())
    mechanisms = sum(counts['training'][f'{family}:seat{seat}'] for family in families for seat in (0, 1))
    extra = max(0, math.ceil((SHARE * original - mechanisms) / (1 - SHARE)))
    per_epoch = math.ceil((original + extra) / 128)
    return {'originalTrainingSamples': original, 'originalMechanismSamples': mechanisms,
        'resampledTrainingSamplesPerEpoch': original + extra, 'actualAdamUpdatesPerEpoch': per_epoch,
        'maximumActualActorAdamUpdates': EPOCHS * per_epoch}


def request_fields(m: Any, r: dict, sha: str) -> None:
    require(type(r.get('dataCompletionSha256')) is str and re.fullmatch('[a-f0-9]{64}', r['dataCompletionSha256']) is not None,
        'Actual producer completion pin required; pending data rejected')
    require(r == {'purpose': 'actual-current-source-mentor-imitation-continuation', 'sourceCommit': SOURCE,
        'engineSha256': ENGINE, 'operatorSha256': sha, 'run': str(RUN), 'dataset': str(m.RUN / 'dataset'),
        'dataCompletionSha256': r['dataCompletionSha256'], 'warmCheckpoint': m.CP['r4'], 'epochs': EPOCHS,
        'optimizerSeed': SEED, 'learningRate': RATE, 'policyAnchor': ANCHOR, 'mechanismShare': SHARE,
        'budget': r.get('budget'), 'wrapper': r.get('wrapper'), 'actualGamesAuthorized': 0, 'finalBlindSeedsAuthorized': False}, 'Exact bounded imitation request')
    require(type(r['epochs']) is int and type(r['optimizerSeed']) is int and type(r['actualGamesAuthorized']) is int
        and type(r['budget']) is dict and all(type(v) is int and v > 0 for v in r['budget'].values()), 'Exact integer learning scope')
    require(r['wrapper']['path'] == str(LAB / 'transfers' / (NAME + '-launch.sh'))
        and set(r['wrapper']) == {'path', 'sha256'}, 'Original imitation wrapper')


def modules(m: Any) -> dict:
    result = m.qualified_modules()
    manifest = m.read(m.MANIFEST)
    for name, sha in EXTRA_MODULES.items():
        relative = 'tools/bot-training/' + name + '.py'
        require(manifest['files'][relative] == sha, 'Qualified imitation module manifest')
        path = CHECKOUT / relative
        m.pin(path, sha)
        result[name] = {'path': str(path), 'sha256': sha}
    return result


def snapshot(m: Any, r: dict, a: argparse.Namespace) -> None:
    m.pin(Path(__file__), a.operator_sha)
    m.pin(a.request, a.request_sha)
    m.pin(Path(r['wrapper']['path']), r['wrapper']['sha256'])
    m.pin(DATA_OPERATOR, DATA_SHA)
    m.pin(m.RUN / 'completion.json', r['dataCompletionSha256'])
    for cp in m.CP.values():
        m.pin(Path(cp['path']), cp['sha256'])
    modules(m)


def producer_proof(m: Any, r: dict) -> dict:
    cmd = [str(LAB / 'venv/bin/python'), '-B', str(DATA_OPERATOR), '--closed',
        '--request', str(LAB / 'transfers' / (m.NAME + '-request.json')), '--request-sha', DATA_REQUEST_SHA,
        '--operator-sha', DATA_SHA, '--identity-sha', DATA_IDENTITY_SHA, '--go-sha', DATA_GO_SHA,
        '--completion-sha', r['dataCompletionSha256']]
    try:
        result = subprocess.run(cmd, check=True, capture_output=True, text=True)
    except subprocess.CalledProcessError as error:
        if RUN.is_dir():
            m.write(RUN / 'producer-consumer-failure.json', {'exitCode': error.returncode, 'stdout': error.stdout, 'stderr': error.stderr})
        raise ValueError('Actual unchanged data closure consumer failed: ' + error.stderr[-3000:]) from error
    proof = json.loads(result.stdout, object_pairs_hook=m.unique, parse_constant=m.invalid)
    require(type(proof['actualWholeExitCode']) is int and proof['actualWholeExitCode'] == 0
        and proof['completionSha256'] == r['dataCompletionSha256'], 'Actual original producer whole0')
    require(budget(proof['report']) == r['budget'], 'Resource budget from actual original-fold counts')
    proof['positiveEngineTeacherCoverage'] = teacher_coverage(m)
    return proof


def teacher_coverage(m: Any) -> dict:
    """Require real teacher positives separately from legitimate frozen-policy labels."""
    helper = m.load(CHECKOUT / 'tools/bot-training/learning_mechanisms.py',
        m.MODULE_SHA['learning_mechanisms'], 'imitation_pure_teacher_labels')
    contexts = {'training': [], 'validation': []}
    for index in range(3872):
        path = m.RUN / 'dataset' / f'episode-{index:05d}.jsonl'
        m.safe(path)
        with path.open(encoding='utf-8') as stream:
            for line in stream:
                row = json.loads(line, object_pairs_hook=m.unique, parse_constant=m.invalid)
                if row['labelOrigin'] != 'current-engine-compound-material-teacher' or len(row['window']['actions']) <= 1:
                    continue
                require(row['supervised'] is True and row['action'] == row['engineTeacherAction'], 'Actual positive engine label provenance')
                context = helper.sample_context(row)
                require(context['mechanism'] in helper.MECHANISMS, 'Actual positive engine family')
                contexts['validation' if index % 5 == 0 else 'training'].append(context)
    coverage = helper.coverage(contexts)
    require(coverage['allMechanismsBothSeatsBothFolds'] is True, 'Actual engine-teacher positives required in every original mechanism/seat/fold bin')
    return coverage


def approved(m: Any, r: dict, a: argparse.Namespace) -> None:
    require(a.go_sha is not None, 'Separate actual ROOT learning agreement')
    path = LAB / 'transfers' / (NAME + '-ROOT-go.json')
    m.pin(path, a.go_sha)
    go = m.read(path)
    require(go == {'phase': r['purpose'], 'requestSha256': a.request_sha, 'operatorSha256': a.operator_sha,
        'dataCompletionSha256': r['dataCompletionSha256'], 'sourceReviewed': True, 'resourceAgreed': True,
        'maximumLearningEpochs': EPOCHS, 'maximumActualActorAdamUpdates': r['budget']['maximumActualActorAdamUpdates'],
        'actualGamesAuthorized': 0, 'finalBlindSeedsAuthorized': False}
        and type(go['maximumLearningEpochs']) is int and type(go['maximumActualActorAdamUpdates']) is int
        and type(go['actualGamesAuthorized']) is int, 'Exact no-game learning resource Go')


def whole(m: Any, r: dict, a: argparse.Namespace, *, closed: bool) -> dict:
    require(a.identity_sha is not None, 'Original imitation whole identity required')
    path = LAB / 'transfers' / (NAME + '-identity.json')
    m.pin(path, a.identity_sha)
    identity = m.read(path)
    require(set(identity) == {'wholeWrapperPid', 'startTicks', 'run', 'operatorSha256', 'wrapperSha256'}
        and type(identity['wholeWrapperPid']) is int and type(identity['startTicks']) is str
        and identity['run'] == NAME and identity['operatorSha256'] == a.operator_sha
        and identity['wrapperSha256'] == r['wrapper']['sha256'], 'Exact original imitation identity')
    launch = Path(str(RUN) + '-launch')
    m.pin(launch / 'launch.sh', r['wrapper']['sha256'])
    proc = Path('/proc') / str(identity['wholeWrapperPid'])
    if closed:
        m.safe(launch / 'exit-code.txt')
        require((launch / 'exit-code.txt').read_bytes() == b'0\n', 'Actual original imitation whole0')
        if proc.exists():
            require((proc / 'stat').read_text(encoding='utf-8').rsplit(')', 1)[1].split()[19] != identity['startTicks'], 'Original whole still present')
    else:
        require(proc.exists(), 'Original whole missing')
        stat = (proc / 'stat').read_text(encoding='utf-8').rsplit(')', 1)[1].split()
        argv = [x.decode() for x in (proc / 'cmdline').read_bytes().split(b'\0') if x]
        require(stat[0] != 'Z' and stat[19] == identity['startTicks'] and len(argv) == 5
            and Path(argv[0]).name == 'bash' and argv[1:] == [r['wrapper']['path'], a.request_sha, a.operator_sha, a.go_sha], 'Exact live original whole ticks/argv')
    return identity


def checkpoint_view(m: Any, path: Path, metadata: dict) -> dict:
    # Conditional primary CPU inspection follows real data/source/whole/resource admission.
    import torch
    require(str(torch.__version__) == '2.7.1+cu128' and not torch.cuda.is_initialized(), 'Qualified CPU-only checkpoint inspection')
    m.safe(path)
    saved = torch.load(path, map_location='cpu', weights_only=True)
    require(saved['metadata'] == metadata and type(saved['featureVersion']) is int and saved['featureVersion'] == 7, 'Exact qualified metadata/encoder')
    weights = saved['model']; state = saved['optimizer']['state']; groups = saved['optimizer']['param_groups']
    require(set(weights) == m.PARAMETERS and len(state) == 12 and len(groups) == 1
        and groups[0]['params'] == list(state) and len(groups[0]['params']) == 12, 'Complete twelve-parameter Adam state')
    result = {}
    for (name, tensor), adam in zip(weights.items(), state.values(), strict=True):
        require(tensor.dtype == torch.float32 and torch.isfinite(tensor).all().item(), 'Finite actual weight')
        require(set(adam) == {'step', 'exp_avg', 'exp_avg_sq'} and adam['exp_avg'].shape == adam['exp_avg_sq'].shape == tensor.shape
            and all(torch.isfinite(v).all().item() for v in adam.values()), 'Finite shaped Adam state')
        step = adam['step'].item()
        require(type(step) in (int, float) and step > 0 and step == int(step), 'Exact positive inherited Adam step')
        result[name] = {'shape': list(tensor.shape), 'sha256': hashlib.sha256(tensor.contiguous().numpy().tobytes()).hexdigest(),
            'adamStep': int(step), 'expAvgSha256': hashlib.sha256(adam['exp_avg'].contiguous().numpy().tobytes()).hexdigest(),
            'expAvgSqSha256': hashlib.sha256(adam['exp_avg_sq'].contiguous().numpy().tobytes()).hexdigest()}
    return {'path': str(path), 'sha256': m.digest(path), 'weights': result, 'learningRate': groups[0]['lr'],
        'metadata': saved['metadata'], 'savedGames': saved['games'], 'savedSeed': saved['seed'],
        'imitationEpoch': saved.get('imitationEpoch'), 'imitationUpdates': saved.get('imitationUpdates'),
        'imitationSource': saved.get('imitationSource'), 'cudaInitialized': False}


def tensor_delta(before: dict, after: dict, updates: int) -> dict:
    require(type(updates) is int and updates > 0 and set(before['weights']) == set(after['weights'])
        and len(before['weights']) == 12 and before['cudaInitialized'] is after['cudaInitialized'] is False, 'Actual positive selected imitation updates')
    deltas = {}; changed = {}; preserved_values = []
    for name, old in before['weights'].items():
        new = after['weights'][name]
        require(new['shape'] == old['shape'] and type(old['adamStep']) is int and type(new['adamStep']) is int, 'Exact tensor/state shape')
        deltas[name] = new['adamStep'] - old['adamStep']
        changed[name] = new['sha256'] != old['sha256']
        if name.startswith('value.'):
            require(new == old, 'Disconnected imitation value weight and full Adam state must remain exact')
            preserved_values.append(name)
        else:
            require(deltas[name] == updates, 'Actual selected actor Adam delta; no reset or fabricated update count')
    require(set(preserved_values) == {'value.weight', 'value.bias'} and any(changed.values()), 'Actual learned actor and two preserved value tensors')
    return {'selectedActorAdamUpdates': updates, 'optimizerStepDeltas': deltas, 'weightChangedByParameter': changed,
        'preservedValueParameters': sorted(preserved_values), 'all12Finite': True, 'acceptedStrengthOrMastery': False}


def cli_args(m: Any, r: dict) -> list[str]:
    return ['--dataset', r['dataset'], '--output', str(RUN / 'imitation'), '--epochs', str(EPOCHS), '--seed', str(SEED),
        '--device', 'cuda', '--checkpoint', r['warmCheckpoint']['path'], '--learning-rate', str(RATE),
        '--policy-anchor', str(ANCHOR), '--mechanism-share', str(SHARE)]


def child(m: Any, r: dict, a: argparse.Namespace) -> None:
    snapshot(m, r, a); approved(m, r, a); identity = whole(m, r, a, closed=False)
    auth = m.read(RUN / 'learner-authorized.json')
    proc = Path('/proc') / str(os.getppid())
    stat = (proc / 'stat').read_text(encoding='utf-8').rsplit(')', 1)[1].split()
    argv = [x.decode() for x in (proc / 'cmdline').read_bytes().split(b'\0') if x]
    require(auth == {'parentPid': os.getppid(), 'parentStartTicks': stat[19], 'requestSha256': a.request_sha,
        'operatorSha256': a.operator_sha, 'identitySha256': a.identity_sha, 'resourceGoSha256': a.go_sha,
        'dataCompletionSha256': r['dataCompletionSha256']} and stat[0] != 'Z'
        and int(stat[1]) == identity['wholeWrapperPid'] and str(Path(__file__)) in argv and '--execute' in argv, 'Actual direct admitted learning parent')
    proof = m.read(RUN / 'data-before.json')
    require(proof['actualWholeExitCode'] == 0 and proof['completionSha256'] == r['dataCompletionSha256']
        and budget(proof['report']) == r['budget'] and proof['positiveEngineTeacherCoverage']['allMechanismsBothSeatsBothFolds'] is True,
        'Actual complete eligible parent data proof')
    m.idle()
    require(shutil.disk_usage(LAB).free > 80 * 1024**3, 'Encoded data cache disk budget')
    require(sys.version_info[:3] == (3, 12, 14), 'Supported actual Python')
    require(subprocess.run(['node', '--version'], check=True, capture_output=True, text=True).stdout.strip() == 'v26.10.0', 'Supported actual Node')
    sys.path.insert(0, str(CHECKOUT / 'tools/bot-training'))
    import torch
    import adaptation
    import features
    import imitate
    import learning_mechanisms
    import migrate
    import model
    require(str(torch.__version__) == '2.7.1+cu128' and torch.cuda.is_available(), 'Qualified actual CUDA')
    expected = modules(m)
    imported = {}
    for module in (adaptation, features, imitate, learning_mechanisms, migrate, model):
        path = Path(module.__file__); m.safe(path)
        imported[module.__name__] = {'path': str(path), 'sha256': m.digest(path)}
        require(imported[module.__name__] == expected[module.__name__], 'Actual imported module path and bytes')
    st = Path('/proc', str(os.getpid()), 'stat').read_text(encoding='utf-8').rsplit(')', 1)[1].split()
    m.write(RUN / 'learner-started.json', {'pid': os.getpid(), 'parentPid': os.getppid(), 'startTicks': st[19],
        'argv': sys.argv, 'requestSha256': a.request_sha, 'operatorSha256': a.operator_sha, 'identitySha256': a.identity_sha,
        'resourceGoSha256': a.go_sha, 'modulePaths': imported, 'actualPython': sys.version.split()[0],
        'torchVersion': str(torch.__version__), 'device': 'cuda', 'actualGamesAuthorized': 0})
    imitate.main.main(args=cli_args(m, r), standalone_mode=False)
    snapshot(m, r, a); whole(m, r, a, closed=False)


def output_report(m: Any, r: dict, before: dict) -> dict:
    output = RUN / 'imitation'; cfg = m.read(output / 'config.json'); history = m.read(output / 'results.json')
    expected = {'dataset': r['dataset'], 'seed': SEED, 'epochs': EPOCHS, 'metadata': before['metadata'], 'featureVersion': 7,
        'learningRate': RATE, 'learningRateOverride': RATE, 'policyAnchor': ANCHOR, 'compoundShare': 0.0,
        'mechanismShare': SHARE, 'compoundPolicyAnchor': ANCHOR, 'teacherLossScope': 'all',
        'newCardColumnsOnly': False, 'identityAdaptationScope': None, 'adaptedCardIds': [],
        'trainableIdentityParameters': None, 'torchVersion': '2.7.1+cu128', 'device': 'cuda'}
    require(all(cfg[k] == v for k, v in expected.items()), 'Exact actual original imitation configuration')
    require(cfg['sourceCheckpoint']['checkpoint'] == r['warmCheckpoint']['path']
        and cfg['sourceCheckpoint']['sha256'] == r['warmCheckpoint']['sha256'], 'Actual warm source CPP')
    expected_modules = modules(m)
    require(cfg['implementationHashes'] == {n + '.py': expected_modules[n]['sha256']
        for n in ('imitate', 'features', 'model', 'adaptation', 'migrate', 'learning_mechanisms')}, 'Actual trained implementation hashes')
    files = [f'episode-{i:05d}.jsonl' for i in range(3872)]
    splits = {fold: [name for i, name in enumerate(files) if (i % 5 == 0) == (fold == 'validation')] for fold in ('training', 'validation')}
    require(cfg['split'] == splits, 'Exact original episode folds; no moved or dropped data')
    receipt = m.read(m.RUN / 'completion.json')
    require(cfg['sourceHashes'] == {name: receipt['outputs']['dataset/' + name] for name in ('config.json', *files)}, 'All original data bytes consumed')
    require(len(history) == EPOCHS + 1 and [row['epoch'] for row in history] == list(range(EPOCHS + 1)), 'All actual original epochs')
    for epoch, row in enumerate(history[1:], 1):
        require(type(row['updates']) is int and row['updates'] == epoch * r['budget']['actualAdamUpdatesPerEpoch']
            and row['trainingSamples'] == r['budget']['resampledTrainingSamplesPerEpoch']
            and row['parameterChangeNorm'] > 0, 'Actual bounded actor optimization history')
    coverage = m.read(output / 'mechanism-coverage.json')
    original = m.read(RUN / 'data-before.json')['report']['mechanismCoverage']
    require(coverage == original, 'Encoded original-fold mechanism counts match full raw data')
    initial = checkpoint_view(m, output / 'checkpoint-epoch-000.pt', before['metadata'])
    require(initial['weights'] == before['weights'] and initial['learningRate'] == RATE
        and initial['imitationUpdates'] == 0 and initial['imitationEpoch'] == 0, 'Actual exact initial model and restored Adam state')
    after = checkpoint_view(m, output / 'checkpoint.pt', before['metadata'])
    selected = after['imitationEpoch']
    require(type(selected) is int and 0 < selected <= EPOCHS
        and after['sha256'] == m.digest(output / f'checkpoint-epoch-{selected:03d}.pt')
        and after['imitationUpdates'] == history[selected]['updates'], 'Actual positive selected native epoch snapshot')
    best = 0
    for i in range(1, len(history)):
        if history[i]['validation']['loss'] < history[best]['validation']['loss']:
            best = i
    require(selected == best and after['savedGames'] == len(splits['training']) and after['savedSeed'] == SEED
        and after['learningRate'] == RATE and after['imitationSource'] == cfg['sourceCheckpoint'], 'Actual validation-selected continuation')
    selected_delta = tensor_delta(before, after, after['imitationUpdates'])
    last = checkpoint_view(m, output / f'checkpoint-epoch-{EPOCHS:03d}.pt', before['metadata'])
    last_delta = tensor_delta(before, last, r['budget']['maximumActualActorAdamUpdates'])
    return {'sourceCommit': SOURCE, 'engineSha256': ENGINE, 'dataCompletionSha256': r['dataCompletionSha256'],
        'warmCheckpoint': r['warmCheckpoint'], 'checkpoint': {'path': after['path'], 'sha256': after['sha256']},
        'selectedEpoch': selected, 'selectedLearning': selected_delta, 'wholeTrainingLearning': last_delta,
        'budget': r['budget'], 'originalEpisodeFolds': {k: len(v) for k, v in splits.items()}, 'mechanismCoverage': coverage,
        'positiveEngineTeacherCoverage': m.read(RUN / 'data-before.json')['positiveEngineTeacherCoverage'],
        'supervisionSources': ['frozen-best-qualified-policy', 'current-engine-compound-material-teacher'],
        'modulePaths': expected_modules, 'actualNewGames': 0, 'actualTrainingEpochs': EPOCHS,
        'acceptedStrengthOrMastery': False, 'finalBlindSeedsConsumed': False}


def file_map(m: Any) -> dict:
    result = {}
    for path in sorted(RUN.rglob('*')):
        m.safe(path)
        if path.is_file() and path != RUN / 'completion.json':
            result[str(path.relative_to(RUN))] = m.digest(path)
    return result


def main() -> None:
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument('--request', type=Path, required=True); p.add_argument('--request-sha', required=True)
    p.add_argument('--operator-sha', required=True); p.add_argument('--identity-sha'); p.add_argument('--go-sha'); p.add_argument('--completion-sha')
    mode = p.add_mutually_exclusive_group(); mode.add_argument('--execute', action='store_true'); mode.add_argument('--closed', action='store_true'); mode.add_argument('--child', action='store_true')
    a = p.parse_args(); sys.dont_write_bytecode = True
    require(__debug__ and 'torch' not in sys.modules, 'Stdlib before source/data/resource admission')
    m = data_module(); m.pin(Path(__file__), a.operator_sha); m.pin(a.request, a.request_sha)
    r = m.read(a.request); request_fields(m, r, a.operator_sha); snapshot(m, r, a)
    require(a.closed == (a.completion_sha is not None), 'Closed reader requires externally observed own completion pin')
    if a.closed:
        m.pin(RUN / 'completion.json', a.completion_sha)
    if a.child:
        child(m, r, a); return
    proof = producer_proof(m, r)
    if not (a.execute or a.closed):
        print(json.dumps({'readOnly': True, 'actualProducerFullConsumerExitCode': 0, 'dataCompletionSha256': r['dataCompletionSha256'],
            'budget': r['budget'], 'primaryModelsImported': False, 'jobsStarted': False, 'acceptedStrengthOrMastery': False}), flush=True); return
    approved(m, r, a); whole(m, r, a, closed=a.closed); m.idle(); snapshot(m, r, a)
    if a.closed:
        m.pin(RUN / 'operator.py', a.operator_sha); require(m.read(RUN / 'request.json') == r, 'Original request custody')
        before = m.read(RUN / 'source-checkpoint-before.json')
        require(checkpoint_view(m, Path(r['warmCheckpoint']['path']), before['metadata']) == before, 'Actual immutable source tensor custody')
        report = output_report(m, r, before)
        require(m.read(RUN / 'report.json') == report and m.read(RUN / 'data-before.json') == m.read(RUN / 'data-after.json') == proof, 'Actual full pre/post producer/source custody')
        require(m.read(RUN / 'completion.json') == {'reportSha256': m.digest(RUN / 'report.json'), 'requestSha256': a.request_sha,
            'operatorSha256': a.operator_sha, 'identitySha256': a.identity_sha, 'resourceGoSha256': a.go_sha, 'outputs': file_map(m)}, 'Complete original learning custody')
        print(json.dumps({'actualWholeExitCode': 0, 'completionSha256': a.completion_sha, 'report': report, 'acceptedStrengthOrMastery': False}), flush=True); return
    require(shutil.disk_usage(LAB).free > 80 * 1024**3, 'Encoded data cache disk budget')
    m.safe(RUN); require(not RUN.exists(), 'Exclusive fresh learning namespace'); RUN.mkdir()
    m.write(RUN / 'request.json', r)
    with (RUN / 'operator.py').open('xb') as f:
        f.write(Path(__file__).read_bytes())
    m.write(RUN / 'data-before.json', proof)
    metadata = m.read(m.MANIFEST.parent / 'metadata.log')
    before = checkpoint_view(m, Path(r['warmCheckpoint']['path']), metadata)
    m.write(RUN / 'source-checkpoint-before.json', before)
    st = Path('/proc', str(os.getpid()), 'stat').read_text(encoding='utf-8').rsplit(')', 1)[1].split()
    m.write(RUN / 'learner-authorized.json', {'parentPid': os.getpid(), 'parentStartTicks': st[19], 'requestSha256': a.request_sha,
        'operatorSha256': a.operator_sha, 'identitySha256': a.identity_sha, 'resourceGoSha256': a.go_sha,
        'dataCompletionSha256': r['dataCompletionSha256']})
    cmd = [str(LAB / 'venv/bin/python'), '-B', str(Path(__file__)), '--child', '--request', str(a.request),
        '--request-sha', a.request_sha, '--operator-sha', a.operator_sha, '--identity-sha', a.identity_sha, '--go-sha', a.go_sha]
    with (RUN / 'imitation.log').open('xb') as log:
        subprocess.run(cmd, check=True, stdout=log, stderr=subprocess.STDOUT)
    # The CUDA learner has exited before any original full source/data consumer.
    m.idle(); snapshot(m, r, a); whole(m, r, a, closed=False); after_proof = producer_proof(m, r)
    require(after_proof == proof, 'Actual original data/source/CP maps changed')
    m.write(RUN / 'data-after.json', after_proof)
    require(checkpoint_view(m, Path(r['warmCheckpoint']['path']), metadata) == before, 'Immutable warm CPP model/Adam custody')
    report = output_report(m, r, before); whole(m, r, a, closed=False); snapshot(m, r, a)
    m.write(RUN / 'report.json', report)
    m.write(RUN / 'completion.json', {'reportSha256': m.digest(RUN / 'report.json'), 'requestSha256': a.request_sha,
        'operatorSha256': a.operator_sha, 'identitySha256': a.identity_sha, 'resourceGoSha256': a.go_sha, 'outputs': file_map(m)})
    print(json.dumps({'imitationComplete': True, 'completionSha256': m.digest(RUN / 'completion.json'), 'report': report,
        'acceptedStrengthOrMastery': False}), flush=True)


if __name__ == '__main__':
    main()
