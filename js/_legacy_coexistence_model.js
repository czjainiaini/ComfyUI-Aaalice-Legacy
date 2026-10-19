/** Convert structural node identities only; never interpret notes or prompt text. */
export const SHARED_IDS = ["PromptSelector", "GroupIsEnabled", "SimpleNotify", "SimpleStringSplit", "FetchFromKrita"];
export const PREFIX = "AaaliceLegacy_";
const oldOnly = new Set("DanbooruGalleryNode CharacterFeatureSwapNode MultiCharacterEditorNode ResolutionMasterSimplify PromptCleaningMaid SimpleImageCompare SimpleCheckpointLoaderWithName ParameterControlPanel ParameterBreak SimpleLoadImage SaveImagePlus SimpleValueSwitch ModelNameExtractor EnumSwitch GroupMuteManager GroupIgnoreManager WorkflowDescription OpenInKrita VAEImageBatchFix".split(" "));
const newOnly = new Set("QuickGroupManager GroupLogicProbe ResolutionPreset ConditionalSaveImage LoadImageWithMetadata BooruGalleryNode".split(" "));

function decoded(value) {
    if (typeof value !== "string") return value;
    if (!value.trim()) return null;
    try { return JSON.parse(value); } catch { return value; }
}

function selectorOwnership(node, defaultOwner) {
    const properties = node.properties || {};
    const hasOld = "selectedPrompts" in properties || "promptWeights" in properties;
    const hasNew = "promptSelectorState" in properties;
    // Serialized state is stronger evidence than a stale package hint left by another frontend.
    if (hasOld && !hasNew) return "legacy";
    if (hasNew && !hasOld) return "modern";
    const sources = [properties.aux_id, properties.cnr_id].map(value => String(value || "").toLowerCase());
    const oldSource = sources.some(value => value.includes("comfyui-danbooru-gallery") || value.includes("comfyui-aaalice-legacy"));
    const newSource = sources.some(value => value.includes("comfyui-aaalice-nodes"));
    const sourceOwner = oldSource !== newSource ? (oldSource ? "legacy" : "modern") : null;
    if (hasOld && hasNew) {
        const oldState = decoded(properties.selectedPrompts);
        const newState = decoded(properties.promptSelectorState);
        const oldSelected = typeof oldState === "string" ? Boolean(oldState) :
            Boolean(oldState && Object.values(oldState).some(value => Array.isArray(value) ? value.length > 0 : Boolean(value)));
        const newSelected = typeof newState === "string" ? Boolean(newState) :
            Boolean(newState?.selections && (!Array.isArray(newState.selections) || newState.selections.length > 0));
        if (oldSelected && newSelected) throw new Error(`节点 ${node.id} 同时保存两套非空提示词选择，请先确定保留哪一版。`);
        if (oldSelected || newSelected) return oldSelected ? "legacy" : "modern";
        // Empty defaults added by both frontends do not constitute conflicting user selections.
        return defaultOwner || sourceOwner;
    }
    return sourceOwner;
}

function ownership(node, defaultOwner) {
    if (node.type === "PromptSelector") return selectorOwnership(node, defaultOwner);
    const properties = node.properties || {};
    const source = String(properties.aux_id || properties.cnr_id || "").toLowerCase();
    const inputs = new Set((node.inputs || []).map(item => item.name));
    const outputs = node.outputs || [];
    const old = source.includes("comfyui-danbooru-gallery") || "selectedPrompts" in properties || "promptWeights" in properties
        || inputs.has("any") || inputs.has("enable_notification") || inputs.has("string")
        || inputs.has("group_name") || (node.type === "FetchFromKrita" && inputs.has("image"))
        || (node.type === "GroupIsEnabled" && outputs.some(item => item.name === "is_enabled"));
    const modern = source.includes("comfyui-aaalice-nodes") || "promptSelectorState" in properties
        || inputs.has("value") || inputs.has("desktop_notification") || inputs.has("text")
        || (node.type === "GroupIsEnabled" && outputs.some(item => item.name === "disabled"))
        || (node.type === "FetchFromKrita" && outputs.some(item => item.type === "METADATA"));
    if (old && modern) throw new Error(`节点 ${node.id} 的新旧接口证据冲突，请从干净工作流重新导入。`);
    return old ? "legacy" : modern ? "modern" : null;
}

export function convertLegacyWorkflow(graph) {
    if (!graph || !Array.isArray(graph.nodes)) return {converted: 0, legacy: false};
    const pending = [graph], seen = new Set(), nodes = [];
    while (pending.length) {
        const current = pending.pop();
        if (seen.has(current)) continue;
        seen.add(current);
        for (const node of current.nodes || []) {
            nodes.push(node);
            if (Array.isArray(node.subgraph?.nodes)) pending.push(node.subgraph);
        }
        pending.push(...(current.definitions?.subgraphs || []));
    }
    const oldEvidence = nodes.some(node => oldOnly.has(node.type) || node.type?.startsWith(PREFIX));
    const newEvidence = nodes.some(node => newOnly.has(node.type));
    const defaultOwner = oldEvidence && !newEvidence ? "legacy" : newEvidence && !oldEvidence ? "modern" : null;
    const changes = [];
    for (const node of nodes) {
        if (!SHARED_IDS.includes(node.type)) continue;
        const owner = ownership(node, defaultOwner) || defaultOwner;
        if (!owner) throw new Error(`无法确认重名节点 ${node.id} (${node.type}) 属于哪一版，已阻止猜测转换。`);
        if (owner === "legacy") changes.push(node);
    }
    // Validate everything before changing even one node; connection and widget data stay intact.
    for (const node of changes) {
        const old = node.type;
        node.type = PREFIX + old;
        if (node.properties?.["Node name for S&R"] === old) node.properties["Node name for S&R"] = node.type;
    }
    return {converted: changes.length, legacy: oldEvidence || changes.length > 0};
}
