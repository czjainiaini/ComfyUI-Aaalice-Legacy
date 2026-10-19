import { app } from "/scripts/app.js";
import { convertLegacyWorkflow } from "./_legacy_coexistence_model.js";

app.registerExtension({
    name: "Aaalice.LegacyCoexistence",
    init() {
        const original = app.loadGraphData;
        app.loadGraphData = function (graph, ...args) {
            // Convert before the host registers subgraph definitions, not in beforeConfigureGraph.
            // Clone only the supplied JSON so files and caller-owned objects remain unchanged.
            if (!graph || !Array.isArray(graph.nodes)) return original.call(this, graph, ...args);
            try {
                const copy = structuredClone(graph);
                convertLegacyWorkflow(copy);
                return original.call(this, copy, ...args);
            } catch (error) {
                app.extensionManager?.toast?.add?.({severity: "error", summary: "旧工作流识别失败 / Legacy workflow detection failed",
                    detail: error.message, life: 16000});
                throw error;
            }
        };
    },
});
