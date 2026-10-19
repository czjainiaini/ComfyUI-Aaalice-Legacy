# Coexistence validation / 共存验证

Date: 2026-10-19. These checks validate the fork against an **unmodified** modern package, rather than requiring the earlier two-package source patch.

## Tested environment

- Windows, ComfyUI 0.39.0, frontend 1.53.10, Python 3.13.3, PyTorch CPU.
- Legacy baseline: `663897c74d5aabf4437ae31381c16328472dc8f5` plus this fork's coexistence changes.
- Modern upstream: `2395128e6f02d60ccc4c2b514201533cd8fd3f92`, version 0.18.6. Its checkout remained clean during testing.

## Results

- Ten JavaScript tests passed with `AAALICE_MODERN_ROOT` set to the clean modern checkout, including the optional upstream detector integration check. The unchanged modern detector accepts this fork's package/extension identity while still warning for the unpatched original package.
- One Python test passed for concurrent execution-context isolation and transparent argument forwarding through metadata hooks.
- Both real packages loaded in one ComfyUI process. The coexistence endpoint reported both providers ready and no overlapping IDs.
- A single real execution graph used old and modern string splitters and group probes together. Outputs were `old-a / old-b`, `new-a / new-b`, and the intentionally distinct legacy `True` / modern `False` group-state semantics.
- A subsequent modern-only graph also executed successfully.
- Frontend extension URLs contained the fork and official modern package; no original legacy package mount was present. The navigation stylesheet resolved under the fork mount.
- In the preceding local workflow conversion checks, a legacy v13.2 graph's 40 overlapping instances were converted while model settings, links and widget values stayed unchanged; a modern v1.7 graph was unchanged. No private workflow data is included in this repository.

## Limits

Full GPU/model generation, complete legacy workflow acceptance, external LLM calls, gallery networking, complete metadata saving and Krita editing remain unverified. Legacy deprecation notices and other pre-existing host compatibility issues are not all repaired by these changes. Fragment pasting, partial merging, API prompt JSON and App Mode are outside the automatic conversion contract.

The tests verify coexistence and selected behavior, not human acceptance of every legacy feature.

## 1.0.2 import-detection regression

PromptSelector package hints may be stale and empty defaults from another frontend are not conflicting user selections. Regression checks cover a legacy selector at node 3500 with empty modern defaults, a modern selector with stale legacy metadata, meaningful legacy choices alongside empty modern defaults, and refusal to discard either of two nonempty histories. The supplied legacy workflow was separately converted to an explicit-ID JSON and verified to preserve all other data. Private workflow contents are not published.

## 1.0.3 optional Impact Pack repair

The actual Impact Pack onConnectionsChange handler was exercised for 12 affected node types with modern string and historical numeric node IDs. Before the upstream one-line fix, all 12 string-ID cases reproduced findInputSlot TypeError while numeric IDs passed; afterward all 24 cases passed, preserving type propagation and trailing dynamic inputs. This is a focused frontend-contract harness, not full workflow/GPU acceptance. Repair-tool filesystem tests verified byte-exact backups, BOM/CRLF preservation, idempotence and no writes for unknown/duplicate/commented call sites. The user's installed Impact Pack was not edited during these tests.
