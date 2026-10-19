"""Keep legacy metadata wrappers out of modern-only prompts; advertise verified coexistence."""
import contextvars
import functools
import inspect
import sys

PREFIX = "AaaliceLegacy_"
SHARED = ("PromptSelector", "GroupIsEnabled", "SimpleNotify", "SimpleStringSplit", "FetchFromKrita")
_active = contextvars.ContextVar("aaalice_legacy_metadata", default=False)


def legacy_prompt(prompt):
    raw = getattr(prompt, "original_prompt", prompt)
    owner = sys.modules.get(__package__)
    keys = getattr(owner, "NODE_CLASS_MAPPINGS", {})
    return isinstance(raw, dict) and any(isinstance(n, dict) and n.get("class_type") in keys for n in raw.values())


def scope_metadata_hooks(execution, map_name):
    """Delegate modern-only calls directly to the pre-existing functions, preserving their API."""
    collect_execute = execution.execute
    original_execute = collect_execute.__wrapped__
    collect_map = getattr(execution, map_name)
    original_map = collect_map.__wrapped__

    if inspect.iscoroutinefunction(original_execute):
        @functools.wraps(original_execute)
        async def execute(*args, **kwargs):
            prompt = args[1] if len(args) > 1 else kwargs.get("dynprompt", kwargs.get("prompt"))
            enabled = legacy_prompt(prompt)
            token = _active.set(enabled)
            try:
                return await (collect_execute if enabled else original_execute)(*args, **kwargs)
            finally:
                _active.reset(token)
    else:
        @functools.wraps(original_execute)
        def execute(*args, **kwargs):
            prompt = args[1] if len(args) > 1 else kwargs.get("prompt")
            enabled = legacy_prompt(prompt)
            token = _active.set(enabled)
            try:
                return (collect_execute if enabled else original_execute)(*args, **kwargs)
            finally:
                _active.reset(token)

    if inspect.iscoroutinefunction(original_map):
        @functools.wraps(original_map)
        async def map_nodes(*args, **kwargs):
            return await (collect_map if _active.get() else original_map)(*args, **kwargs)
    else:
        @functools.wraps(original_map)
        def map_nodes(*args, **kwargs):
            return (collect_map if _active.get() else original_map)(*args, **kwargs)

    execution.execute = execute
    setattr(execution, map_name, map_nodes)


def register_coexistence_api(legacy_mappings):
    from aiohttp import web
    from server import PromptServer

    @PromptServer.instance.routes.get("/aaalice-legacy/coexistence")
    async def status(request):
        import nodes
        registry = nodes.NODE_CLASS_MAPPINGS
        collisions = sorted(set(legacy_mappings).intersection(SHARED))
        legacy_ready = all(registry.get(PREFIX + key) is legacy_mappings.get(PREFIX + key)
                           and registry.get(PREFIX + key) is not None for key in SHARED)
        modern_ready = all(key in registry and "comfyui-aaalice-nodes" in inspect.getfile(registry[key]).lower()
                           for key in SHARED)
        return web.json_response({"protocol": 1, "legacy_namespaced": legacy_ready,
                                  "modern_ready": modern_ready, "collisions": collisions},
                                 headers={"Cache-Control": "no-store"})
