#!/usr/bin/env python3
"""Extract colour-light and landing emitters. Requires Python 3.12+ and PyYAML 6.

Only numeric motion/material evidence is imported. Aegis owns its palette,
procedural stamps and screen projection. Run with --source <Unity checkout>.
"""

import argparse
import hashlib
import json
import math
import re
from pathlib import Path
from typing import Any

import yaml

type Record = dict[str, Any]

ROLES = {
    100000: "core-needles",
    100002: "halo",
    100004: "long-beams",
    100006: "flash-core",
    100008: "sparks",
    100010: "soft-rays",
}
COLOURS = ("Red", "Blue", "Green", "Yellow", "Purple", "Black", "White")
LANDING_ROLES = {
    100000: "landing-stars",
    100002: "landing-beams",
    100004: "landing-sparks",
    100006: "landing-core",
}


def documents(path: Path) -> list[Record]:
    text = re.sub(r"^%.*\n", "", path.read_text(encoding="utf-8"), flags=re.M)
    text = re.sub(r"^--- !u!\d+ &[-\d]+.*$", "---", text, flags=re.M)
    return list(yaml.safe_load_all(text))


def curves(value: Record) -> Record:
    mode = value["minMaxState"]
    if mode not in (0, 1, 3):
        raise ValueError(f"Unsupported curve mode {mode}")
    result = {"mode": mode, "scalar": value["scalar"], "min": value["minScalar"]}
    if mode == 1:
        keys = value["maxCurve"]["m_Curve"]
        if any(key["weightedMode"] for key in keys):
            raise ValueError("Weighted tangents require a separate evaluator")
        result["keys"] = [
            [key["time"], key["value"], key["inSlope"], key["outSlope"]]
            for key in keys
        ]
    return result


def gradient(value: Record) -> Record:
    if value["minMaxState"] != 1 or value["maxGradient"]["m_Mode"] != 0:
        raise ValueError("Expected a blended colour-over-life gradient")
    data = value["maxGradient"]
    return {
        "alpha": [
            [data[f"atime{i}"] / 65535, data[f"key{i}"]["a"]]
            for i in range(data["m_NumAlphaKeys"])
        ],
        "colour": [
            [
                data[f"ctime{i}"] / 65535,
                *[data[f"key{i}"][channel] for channel in ("r", "g", "b")],
            ]
            for i in range(data["m_NumColorKeys"])
        ],
    }


def asset_index(assets: Path) -> dict[str, Path]:
    result = {}
    for meta in assets.rglob("*.meta"):
        match = re.search(r"^guid: (\w+)$", meta.read_text(encoding="utf-8"), re.M)
        if match:
            result[match[1]] = meta.with_suffix("")
    return result


def digest(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def card_plane(manager: Record, scene_docs: list[Record], scene_text: str, canvas: Record,
               index: dict[str, Path], assets: Path, effects: str) -> Record:
    prefab = index[manager["fieldCardPrefab"]["guid"]]
    docs = documents(prefab)
    script = next(d["MonoBehaviour"] for d in docs
                  if "MonoBehaviour" in d and "CardImage" in d["MonoBehaviour"])
    image_id = script["CardImage"]["fileID"]
    image_match = re.search(rf"^--- !u!114 &{image_id}\n(.*?)(?=^---|\Z)",
                            prefab.read_text(encoding="utf-8"), re.M | re.S)
    if image_match is None:
        raise ValueError("Unresolved printed field face")
    image = yaml.safe_load(image_match[1])["MonoBehaviour"]
    face = next(d["RectTransform"] for d in docs if "RectTransform" in d
                and d["RectTransform"]["m_GameObject"] == image["m_GameObject"])
    root = next(d["RectTransform"] for d in docs if "RectTransform" in d
                and d["RectTransform"]["m_Father"]["fileID"] == 0)
    scaler = next(d["MonoBehaviour"] for d in scene_docs if "MonoBehaviour" in d
                  and d["MonoBehaviour"].get("m_GameObject") == canvas["m_GameObject"]
                  and "m_ReferenceResolution" in d["MonoBehaviour"])
    if scaler["m_UiScaleMode"] != 1 or scaler["m_ScreenMatchMode"] != 1:
        raise ValueError("Card landing requires a new canvas scaling evaluator")
    parents = []
    for name in ("YourPermanentTransform", "OpponentPermanentTransform"):
        game = next(d["GameObject"] for d in scene_docs if "GameObject" in d
                    and d["GameObject"].get("m_Name") == name)
        transform_id = game["m_Component"][0]["component"]["fileID"]
        parent_match = re.search(rf"^--- !u!224 &{transform_id}\n(.*?)(?=^---|\Z)",
                                 scene_text, re.M | re.S)
        if parent_match is None:
            raise ValueError(f"Unresolved landing parent {name}")
        parent = yaml.safe_load(parent_match[1])["RectTransform"]
        q = parent["m_LocalRotation"]
        if q["y"] != 0 or q["z"] != 0 or parent["m_LocalScale"] != {"x": 1, "y": 1, "z": 1}:
            raise ValueError("Landing parent needs a new transform evaluator")
        parents.append(math.degrees(2 * math.atan2(q["x"], q["w"])))
    if not math.isclose(parents[0], parents[1], abs_tol=1e-5):
        raise ValueError("Landing seats require separate parent rotations")
    if face["m_SizeDelta"] != {"x": 110, "y": 154} or root["m_LocalScale"] != {"x": .9, "y": .9, "z": 1}:
        raise ValueError("Printed card geometry changed")
    for name in ("CreateFieldPermanentCardEffect", "DigivolveFieldPermanentCardEffect"):
        method = re.search(rf"public IEnumerator {name}\(.*?(?=\n    #endregion)", effects, re.S)
        if method is None or "float fallTime = 0.1f;" not in method[0] or "Ease.OutBounce" not in method[0] or ", -30);" not in method[0]:
            raise ValueError(f"Landing depth/clock changed in {name}")
    return {
        "prefab": str(prefab.relative_to(assets)), "sha256": digest(prefab),
        "referenceSize": [scaler["m_ReferenceResolution"][axis] for axis in ("x", "y")],
        "printedWidth": face["m_SizeDelta"]["x"] * root["m_LocalScale"]["x"],
        "parentAngle": parents[0], "fall": 30, "durationMs": 100,
    }


def material(renderer: Record, index: dict[str, Path], assets: Path) -> Record:
    guid = renderer["m_Materials"][0]["guid"]
    path = index[guid]
    data = documents(path)[0]["Material"]
    props = data["m_SavedProperties"]
    texture = next(item["_MainTex"]["m_Texture"] for item in props["m_TexEnvs"] if "_MainTex" in item)
    tint = next(item["_TintColor"] for item in props["m_Colors"] if "_TintColor" in item)
    texture_path = index.get(texture["guid"])
    return {
        "name": data["m_Name"],
        "shaderFileId": data["m_Shader"]["fileID"],
        "tint": [tint[key] for key in ("r", "g", "b", "a")],
        "textureFileId": texture["fileID"],
        "texture": str(texture_path.relative_to(assets)) if texture_path else None,
        "textureSha256": digest(texture_path) if texture_path else None,
        "sha256": digest(path),
    }


def emitter(ps: Record, renderer: Record, transform: Record, index: dict[str, Path], assets: Path, role: str) -> Record:
    initial = ps["InitialModule"]
    if ps["looping"] or ps["simulationSpeed"] <= 0 or initial["size3D"] or initial["rotation3D"]:
        raise ValueError("Unexpected looping, speed or 3D particle controls")
    shape = ps["ShapeModule"]
    velocity = ps["VelocityModule"]
    if ps["scalingMode"] != 2 or ps["moveWithTransform"] != 0 or velocity["inWorldSpace"] != 0:
        raise ValueError("Expected world simulation, shape-only scaling and local added velocity")
    if renderer["m_RenderMode"] == 1 and (
        renderer["m_FreeformStretching"]
        or renderer["m_VelocityScale"] != 0
        or renderer["m_CameraVelocityScale"] != 0
    ):
        raise ValueError("Stretch renderer needs a new freeform/speed evaluator")
    mesh_size = 1
    if renderer["m_RenderMode"] == 4:
        if renderer["m_Mesh"]["fileID"] != 10209 or renderer["m_RenderAlignment"] != 2:
            raise ValueError("Mesh renderer needs a new geometry/alignment evaluator")
        # Unity's built-in Plane (10209) is10x10 in XZ, unlike a1x1 billboard.
        mesh_size = 10
    colour = gradient(ps["ColorModule"]["gradient"])
    return {
        "role": role,
        "capacity": initial["maxNumParticles"],
        "emissionMs": ps["lengthInSec"] * 1000,
        "simulationSpeed": ps["simulationSpeed"],
        "scalingMode": ps["scalingMode"],
        "simulationSpace": ps["moveWithTransform"],
        "velocityWorld": velocity["inWorldSpace"],
        "rate": curves(ps["EmissionModule"]["rateOverTime"]),
        "delay": curves(ps["startDelay"]),
        "lifetime": curves(initial["startLifetime"]),
        "speed": curves(initial["startSpeed"]),
        "size": curves(initial["startSize"]),
        "rotation": curves(initial["startRotation"]),
        "rotationSpeed": curves(ps["RotationModule"]["curve"]) if ps["RotationModule"]["enabled"] else None,
        "sizeOverLife": curves(ps["SizeModule"]["curve"]) if ps["SizeModule"]["enabled"] else None,
        "alpha": colour["alpha"],
        "colour": colour["colour"],
        "shape": {
            "enabled": bool(shape["enabled"]), "type": shape["type"],
            "radius": shape["radius"]["value"], "angle": shape["angle"],
            "thickness": shape["radiusThickness"],
        },
        "velocity": [curves(velocity[axis]) for axis in ("x", "y", "z")] if velocity["enabled"] else None,
        "transform": {key: transform[key] for key in ("m_LocalRotation", "m_LocalPosition", "m_LocalScale")},
        "renderer": {
            "mode": renderer["m_RenderMode"], "length": renderer["m_LengthScale"],
            "alignment": renderer["m_RenderAlignment"], "meshFileId": renderer["m_Mesh"]["fileID"],
            "meshSize": mesh_size,
            "freeformStretching": bool(renderer["m_FreeformStretching"]),
            "rotateWithStretch": bool(renderer["m_RotateWithStretchDirection"]),
            "velocityScale": renderer["m_VelocityScale"],
            "cameraVelocityScale": renderer["m_CameraVelocityScale"],
            "material": material(renderer, index, assets),
        },
    }


def extract(source: Path) -> Record:
    assets = source / "Assets"
    scene = assets / "Scenes/BattleScene.unity"
    if not scene.is_file():
        raise ValueError(f"Missing battle scene: {scene}")
    index = asset_index(assets)
    scene_text = scene.read_text(encoding="utf-8")
    # The card UI names the camera that also draws these world-space emitters.
    scene_docs = documents(scene)
    manager = next(
        d["MonoBehaviour"] for d in scene_docs
        if "MonoBehaviour" in d and "camara" in d["MonoBehaviour"]
    )
    camera_id = manager["camara"]["fileID"]
    camera_match = re.search(
        rf"^--- !u!20 &{camera_id}\n(.*?)(?=^---|\Z)", scene_text, re.M | re.S
    )
    if camera_match is None:
        raise ValueError("Unresolved main particle camera")
    camera = yaml.safe_load(camera_match[1])["Camera"]
    camera_transform = next(
        d[k] for d in scene_docs for k in ("Transform", "RectTransform")
        if k in d and d[k].get("m_GameObject") == camera["m_GameObject"]
    )
    canvas_id = manager["canvas"]["fileID"]
    canvas_match = re.search(
        rf"^--- !u!223 &{canvas_id}\n(.*?)(?=^---|\Z)", scene_text, re.M | re.S
    )
    if canvas_match is None:
        raise ValueError("Unresolved card canvas")
    canvas = yaml.safe_load(canvas_match[1])["Canvas"]
    if canvas["m_Camera"]["fileID"] != camera_id:
        raise ValueError("Card canvas uses a different camera")
    if camera["orthographic"] or camera_transform["m_Father"]["fileID"] != 0:
        raise ValueError("Unexpected camera projection/hierarchy")
    effects_path = assets / "Scripts/Script/Effects.cs"
    if not effects_path.is_file():
        raise ValueError(f"Missing light presentation source: {effects_path}")
    effects = effects_path.read_text(encoding="utf-8-sig")
    methods = (
        "CreateFieldPermanentCardEffect", "DigivolveFieldPermanentCardEffect",
        "DestroyPermanentEffect", "DestroySecurityEffect",
    )
    spawn_scale = None
    for method_name in methods:
        method = re.search(
            rf"public IEnumerator {method_name}\(.*?(?=\n    #endregion)", effects, re.S
        )
        scale = re.search(
            r"effect2.transform.localScale = new Vector3\(([^)]+)\)",
            method[0] if method else "",
        )
        if scale is None:
            raise ValueError(f"Unresolved light spawn scale in {method_name}")
        values = [float(n.strip()) for n in scale[1].split(",")]
        if spawn_scale is not None and values != spawn_scale:
            raise ValueError(f"Different light scale in {method_name}; keep its recipe separate")
        spawn_scale = values
    systems = None
    evidence = []
    palettes = {}
    for colour in COLOURS:
        match = re.search(rf"{colour}EvolutionEffect: .*guid: (\w+)", scene_text)
        if not match or match[1] not in index:
            raise ValueError(f"Unresolved {colour} particle prefab")
        path = index[match[1]]
        docs = documents(path)
        renderers = {d["ParticleSystemRenderer"]["m_GameObject"]["fileID"]: d["ParticleSystemRenderer"] for d in docs if "ParticleSystemRenderer" in d}
        transforms = {}
        for doc in docs:
            for kind in ("Transform", "RectTransform"):
                if kind in doc:
                    transforms[doc[kind]["m_GameObject"]["fileID"]] = doc[kind]
        active = [d["ParticleSystem"] for d in docs if "ParticleSystem" in d and d["ParticleSystem"]["EmissionModule"]["enabled"]]
        if {p["m_GameObject"]["fileID"] for p in active} != set(ROLES):
            raise ValueError("Active child emitter set changed")
        extracted = [emitter(p, renderers[p["m_GameObject"]["fileID"]], transforms[p["m_GameObject"]["fileID"]], index, assets, ROLES[p["m_GameObject"]["fileID"]]) for p in active]
        palettes[colour] = [item.pop("colour") for item in extracted]
        if systems is not None and systems != extracted:
            raise ValueError(f"{colour} differs in motion, alpha or material; do not collapse it")
        systems = extracted
        evidence.append({"colour": colour, "prefab": str(path.relative_to(assets)), "sha256": digest(path)})
    landing_match = re.search(r"NewUnitEffect_OnLand: .*guid: (\w+)", scene_text)
    if not landing_match or landing_match[1] not in index:
        raise ValueError("Unresolved landing particle prefab")
    landing_path = index[landing_match[1]]
    landing_docs = documents(landing_path)
    landing_renderers = {d["ParticleSystemRenderer"]["m_GameObject"]["fileID"]: d["ParticleSystemRenderer"] for d in landing_docs if "ParticleSystemRenderer" in d}
    landing_transforms = {d["Transform"]["m_GameObject"]["fileID"]: d["Transform"] for d in landing_docs if "Transform" in d}
    landing_active = [d["ParticleSystem"] for d in landing_docs if "ParticleSystem" in d and d["ParticleSystem"]["EmissionModule"]["enabled"]]
    if {p["m_GameObject"]["fileID"] for p in landing_active} != set(LANDING_ROLES):
        raise ValueError("Active landing emitter set changed")
    root = next(t for t in landing_transforms.values() if t["m_Father"]["fileID"] == 0)
    if root["m_LocalRotation"] != {"x": 0, "y": 0, "z": 0, "w": 1}:
        raise ValueError("Landing root needs a rotation evaluator")
    landing_methods = methods[:2]
    for method_name in landing_methods:
        method = re.search(rf"public IEnumerator {method_name}\(.*?(?=\n    #endregion)", effects, re.S)
        if method is None or not re.search(r"GameObject effect = Instantiate\(NewUnitEffect_OnLand, effectParent\)", method[0]):
            raise ValueError(f"Unresolved landing spawn in {method_name}")
        if not re.search(r"effect.transform.position = new Vector3\([^\n]+, 0\.05f, [^\n]+\)", method[0]) or "effect.transform.localScale" in method[0]:
            raise ValueError(f"Landing placement/scale changed in {method_name}")
    landing_systems = []
    for ps in landing_active:
        game_id = ps["m_GameObject"]["fileID"]
        if ps["EmissionModule"]["m_BurstCount"] or ps["InitialModule"]["startColor"]["maxColor"] != {"r": 1, "g": 1, "b": 1, "a": 1}:
            raise ValueError("Landing needs a new burst/start-colour evaluator")
        landing_systems.append(emitter(ps, landing_renderers[game_id], landing_transforms[game_id], index, assets, LANDING_ROLES[game_id]))
    return {
        "schema": 4,
        "sceneSha256": digest(scene), "evidence": evidence, "systems": systems,
        "spatial": {
            "effectsSha256": digest(effects_path),
            "spawnScale": spawn_scale,
            "scaleMethods": list(methods),
            "cameraRotation": camera_transform["m_LocalRotation"],
            "planeDistance": canvas["m_PlaneDistance"],
            "fieldOfView": camera["field of view"],
            "cardPlane": card_plane(manager, scene_docs, scene_text, canvas, index, assets, effects),
        },
        "sourceColourGradients": palettes,
        "landing": {
            "prefab": str(landing_path.relative_to(assets)),
            "sha256": digest(landing_path),
            "spawnMethods": list(landing_methods),
            "spawnScale": [root["m_LocalScale"][axis] for axis in ("x", "y", "z")],
            "height": 0.05,
            "systems": landing_systems,
        },
        "note": "Numeric emitter and authored spatial evidence. Slot pixel scale, runtime camera changes, procedural stamps and seeded trajectories remain adaptations; births are a continuous-rate model, not measured Unity frame timestamps.",
    }


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--source", required=True, type=Path)
    parser.add_argument("--output", type=Path, default=Path("apps/web/src/game/particleLight.json"))
    parser.add_argument("--check", action="store_true")
    args = parser.parse_args()
    if not args.source.is_dir():
        parser.error("--source must be an existing checkout")
    result = extract(args.source.resolve())
    text = json.dumps(result, ensure_ascii=False, indent=2) + "\n"
    if args.check:
        if not args.output.is_file() or json.loads(args.output.read_text(encoding="utf-8")) != result:
            parser.error("Particle evidence does not match the extracted source")
    else:
        args.output.parent.mkdir(parents=True, exist_ok=True)
        args.output.write_text(text, encoding="utf-8")
    print(f"Verified {len(result['evidence'])} palettes; {len(result['systems'])} emitters; {sum(s['capacity'] for s in result['systems'])} particle capacity")
    print(f"Verified {len(result['landing']['systems'])} landing emitters; {sum(s['capacity'] for s in result['landing']['systems'])} particle capacity")


if __name__ == "__main__":
    main()
