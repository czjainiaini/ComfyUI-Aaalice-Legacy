/** Convert structural node identities only; never interpret notes or prompt text. */
export const SHARED_IDS = ["PromptSelector", "GroupIsEnabled", "SimpleNotify", "SimpleStringSplit", "FetchFromKrita"];
export const PREFIX = "AaaliceLegacy_";
const oldOnly = new Set("DanbooruGalleryNode CharacterFeatureSwapNode MultiCharacterEditorNode ResolutionMasterSimplify PromptCleaningMaid SimpleImageCompare SimpleCheckpointLoaderWithName ParameterControlPanel ParameterBreak SimpleLoadImage SaveImagePlus SimpleValueSwitch ModelNameExtractor EnumSwitch GroupMuteManager GroupIgnoreManager WorkflowDescription OpenInKrita VAEImageBatchFix".split(" "));
const newOnly = new Set("QuickGroupManager GroupLogicProbe ResolutionPreset ConditionalSaveImage LoadImageWithMetadata BooruGalleryNode".split(" "));

function ownership(node) {
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
    const changes = [];
    for (const node of nodes) {
        if (!SHARED_IDS.includes(node.type)) continue;
        const owner = ownership(node) || (oldEvidence && !newEvidence ? "legacy" : newEvidence && !oldEvidence ? "modern" : null);
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
