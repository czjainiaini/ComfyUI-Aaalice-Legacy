# ComfyUI-Aaalice-Legacy

English · [简体中文](README.md)

An unofficial maintenance fork of [ComfyUI-Danbooru-Gallery](https://github.com/Aaalice233/ComfyUI-Danbooru-Gallery), retaining legacy Illustrious / NoobAI workflows while giving overlapping nodes independent identities. Original author: Aaalice233. Fork maintainer: czjainiaini. Original MIT license retained. Default maintenance branch: **coexistence**.

## Install

Stop ComfyUI and back up your old package settings and workflows. Disable the original Danbooru Gallery package or move it outside custom_nodes. Keep official ComfyUI-Aaalice-Nodes unchanged. Do not enable the original legacy package alongside this fork.

From ComfyUI/custom_nodes:

```bash
git clone --branch coexistence https://github.com/czjainiaini/ComfyUI-Aaalice-Legacy.git
```

Use ComfyUI's Python to install this fork's requirements.txt. Migrate runtime settings and prompt libraries into the same relative paths, without copying old source files over this fork. Restart ComfyUI and hard-refresh the browser. Import the original workflow normally; routine workflow switching does not require a restart.

## Update

Version 1.0.2 fixes false PromptSelector conflicts caused by stale package hints or empty defaults from the other frontend, including the node 3500 regression. Actual saved state takes precedence.

```bash
git -C ComfyUI-Aaalice-Legacy pull --ff-only
```

Update the official modern package through its normal channel. This fork does not download models or modify other plugins.

## Coexistence changes

Legacy PromptSelector, GroupIsEnabled, SimpleNotify, SimpleStringSplit and FetchFromKrita use the AaaliceLegacy_ prefix. Modern IDs stay unchanged. Legacy frontend hooks target only legacy identities. Complete canvas workflow JSON, including subgraph definitions, is converted on import without rewriting the original file, links, widgets or model configuration. Legacy metadata hooks are scoped to legacy-containing execution contexts. The fork has distinct package and extension identities and resolves its stylesheet relative to itself. Other legacy nodes remain available.

## Validation and limits

See [VALIDATION.md](VALIDATION.md) for Windows / ComfyUI 0.39.0 / frontend 1.53.10 / CPU checks against unmodified modern package 0.18.6 at commit 2395128.

Full GPU generation, external LLM calls, gallery networking, complete saved metadata and Krita editing remain unverified. This is not a general repair for all legacy host incompatibilities. Fragment pasting, partial merging, API prompt JSON and App Mode are outside the automatic conversion contract. Ambiguous identities fail explicitly. Previously corrupted workflows require a clean backup. Do not let two group managers control the same visual group.

## Impact Pack findInputSlot error

Version 1.0.3 adds an opt-in manual repair tool for the Impact Pack string-node-ID import error. It applies the one-line fix from [upstream PR #1233](https://github.com/ltdrdata/ComfyUI-Impact-Pack/pull/1233), passing the node object instead of node.id to connect(). Stop ComfyUI, run tools/修复ImpactPack.cmd, restart and hard-refresh the browser. Or run `python tools/fix_impact_connect.py ../ComfyUI-Impact-Pack` with ComfyUI's Python.

The tool backs up the original file, refuses unknown or duplicate call sites, and is idempotent. A git pull of this fork does not modify Impact Pack automatically. The local Impact Pack source edit may need restoring from the printed backup before an upstream update. No models or workflows are changed.

## Development tests

```bash
node --experimental-vm-modules --test tests/coexistence.test.mjs
python -m unittest discover -s tests -v
```

Set AAALICE_MODERN_ROOT to an official modern source checkout to enable the optional detector integration test; otherwise that test is explicitly skipped. Node is not a runtime dependency. Upstream baseline: 663897c74d5aabf4437ae31381c16328472dc8f5. No user workflows, account settings or local logs are included.
