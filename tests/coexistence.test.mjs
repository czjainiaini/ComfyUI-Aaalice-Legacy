import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import vm from 'node:vm';
import path from 'node:path';
import {convertLegacyWorkflow, SHARED_IDS} from '../js/_legacy_coexistence_model.js';

test('five legacy identities convert without changing links, widgets or model values', () => {
    const graph = {nodes:[
        {id:1,type:'PromptSelector',properties:{selectedPrompts:'{}'},widgets_values:['','']},
        {id:2,type:'GroupIsEnabled',outputs:[{name:'is_enabled'}]},
        {id:3,type:'SimpleNotify',inputs:[{name:'any',link:1}],widgets_values:['done',0.5,true,true]},
        {id:4,type:'SimpleStringSplit',inputs:[{name:'string'}],widgets_values:['a|b','|']},
        {id:5,type:'FetchFromKrita',inputs:[{name:'image'}]},
        {id:6,type:'CheckpointLoaderSimple',widgets_values:['my-model.safetensors']}
    ],links:[[1,4,0,3,0,'STRING']],definitions:{subgraphs:[]}};
    const before=structuredClone(graph);
    assert.equal(convertLegacyWorkflow(graph).converted,5);
    for (const node of graph.nodes) node.type=node.type.replace(/^AaaliceLegacy_/,'');
    assert.deepEqual(graph,before);
});

test('nested definitions convert and already converted graphs reload unchanged', () => {
    const graph={nodes:[],definitions:{subgraphs:[{nodes:[{id:1,type:'GroupIsEnabled',outputs:[{name:'is_enabled'}]}]}]}};
    assert.equal(convertLegacyWorkflow(graph).converted,1);
    assert.equal(convertLegacyWorkflow(graph).converted,0);
});

test('modern identities remain untouched', () => {
    const graph={nodes:[{type:'ResolutionPreset'},
        {type:'PromptSelector',properties:{promptSelectorState:{version:1,selections:[]}}},
        {type:'GroupIsEnabled',outputs:[{name:'disabled'}]},
        {type:'SimpleNotify',inputs:[{name:'value'}]},
        {type:'SimpleStringSplit',inputs:[{name:'text'}]},
        {type:'FetchFromKrita',outputs:[{type:'METADATA'}]}]};
    const before=structuredClone(graph);
    assert.equal(convertLegacyWorkflow(graph).converted,0);
    assert.deepEqual(graph,before);
});

test('ambiguous identities fail before mutation; notes cannot activate conversion', () => {
    const graph={nodes:[{id:1,type:'SimpleStringSplit',inputs:[{name:'string'}]},
        {id:2,type:'PromptSelector'},{type:'MarkdownNote',widgets_values:['ParameterControlPanel']} ]};
    const before=structuredClone(graph);
    assert.throws(()=>convertLegacyWorkflow(graph),/无法确认/);
    assert.deepEqual(graph,before);
});

test('legacy frontend never attaches its widget to the modern node class', async () => {
    let extension;
    const app={registerExtension:e=>{extension=e;}};
    const context=vm.createContext({console});
    const source=await fs.readFile(new URL('../js/group_is_enabled/group_is_enabled.js',import.meta.url),'utf8');
    const module=new vm.SourceTextModule(source,{context});
    await module.link(specifier=>{
        const name=specifier.endsWith('/app.js')?'app':'createLogger';
        return new vm.SyntheticModule([name],function(){this.setExport(name,name==='app'?app:()=>({info(){},warn(){},error(){}}));},{context});
    });
    await module.evaluate();
    class Modern {}
    await extension.beforeRegisterNodeDef(Modern,{name:'GroupIsEnabled'},app);
    assert.equal(Modern.prototype.onNodeCreated,undefined);
    class Legacy {}
    await extension.beforeRegisterNodeDef(Legacy,{name:'AaaliceLegacy_GroupIsEnabled'},app);
    assert.equal(typeof Legacy.prototype.onNodeCreated,'function');
});

test('unmodified upstream modern detector accepts the distinct fork identity',
    {skip:!process.env.AAALICE_MODERN_ROOT},async()=>{
    const root=process.env.AAALICE_MODERN_ROOT;
    const source=await fs.readFile(path.join(root,'js/incompatible_plugins.js'),'utf8');
    assert.doesNotMatch(source,/legacyCoexistenceVerified/,'integration target must be unmodified upstream');
    const warnings=[];
    const app={extensions:[{name:'Aaalice.Legacy.GroupIsEnabled'}],
        api:{getExtensions:async()=>['/extensions/ComfyUI-Aaalice-Legacy/group_is_enabled/group_is_enabled.js']},
        extensionManager:{toast:{add:warning=>warnings.push(warning)}}};
    const context=vm.createContext({console:{error(){},warn(){}}});
    const module=new vm.SourceTextModule(source,{context});
    await module.link(specifier=>{
        const name=specifier.endsWith('/app.js')?'app':'t';
        return new vm.SyntheticModule([name],function(){this.setExport(name,name==='app'?app:(_key,fallback)=>fallback);},{context});
    });
    await module.evaluate();
    await module.namespace.warnIfIncompatiblePlugins();
    assert.equal(warnings.length,0);
    app.extensions=[{name:'danbooru.GroupIsEnabled'}];
    await module.namespace.warnIfIncompatiblePlugins();
    assert.equal(warnings.length,1,'unpatched original must still be flagged');
});
