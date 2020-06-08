const { JavaType } = require('java-mti');
const { ModuleBlock, TypeDeclBlock } = require('./parser9');
const { resolveImports } = require('../java/import-resolver');
const ResolvedImport = require('../java/parsetypes/resolved-import');
const { resolveType } = require('../java/type-resolver');
const { SourceType, SourceConstructor } = require('./source-type');
const { parseBody } = require('./body-parser3');


/**
 * @param {ModuleBlock} mod
 * @param {string} owner_typename
 * @param {ModuleBlock|TypeDeclBlock} parent 
 * @param {SourceType[]} source_types 
 */
function getSourceTypes(mod, owner_typename, parent, source_types) {
    parent.types.forEach(type => {
        const qualifiedTypeName = `${owner_typename}${type.simpleName}`;
        // we add the names of type variables here, but we resolve any bounds later
        //const typevar_names = type.typevars.map(tv => tv.name);
        //const mti = new MTI().addType(package_name, '', mods, type.kind(), qualifiedTypeName, typevar_names);
        const t = new SourceType(mod, type, qualifiedTypeName);
        source_types.push(t);
        getSourceTypes(mod, `${qualifiedTypeName}$`, type, source_types);
    });
}

/**
 * 
 * @param {SourceType} source_type 
 * @param {ResolvedImport[]} resolved_imports 
 * @param {Map<string,JavaType>} typemap 
 */
function resolveResolvableTypes(source_type, resolved_imports, typemap) {
    const fully_qualified_scope = source_type.shortSignature;
    const resolvableTypes = source_type.getAllResolvableTypes();
    resolvableTypes.forEach(rt => {
        rt._resolved = resolveType(rt.label, fully_qualified_scope, resolved_imports, typemap);
    })
}

/**
 * @param {ModuleBlock} mod 
 * @param {Map<string, JavaType>} androidLibrary
 */
function validate(mod, androidLibrary) {
    console.time('validation');

    /** @type {SourceType[]} */
    const source_types = [];
    getSourceTypes(mod, '', mod, source_types);

    const imports = resolveImports(androidLibrary, source_types, mod.imports, mod.packageName);

    source_types.forEach(t => {
        resolveResolvableTypes(t, imports.resolved, imports.typemap);
    });

    let probs = [];
    source_types.forEach(t => {
        t.initers.forEach(i => {
            console.log('<clinit>()');
            const parsed = parseBody(i, imports.resolved, imports.typemap);
            if (parsed)
                probs = probs.concat(parsed.problems)
        })
        t.constructors.forEach(c => {
            // ignore any default constructors
            if (!(c instanceof SourceConstructor)) {
                return;
            }
            console.log(c.label);
            const parsed = parseBody(c, imports.resolved, imports.typemap);
            if (parsed)
                probs = probs.concat(parsed.problems)
        })
        t.methods.forEach(m => {
            console.log(m.label);
            const parsed = parseBody(m, imports.resolved, imports.typemap);
            if (parsed)
                probs = probs.concat(parsed.problems)
        })
    })

    const module_validaters = [
        require('./validation/multiple-package-decls'),
        require('./validation/unit-decl-order'),
        require('./validation/duplicate-members'),
        require('./validation/parse-errors'),
        require('./validation/modifier-errors'),
        require('./validation/unresolved-imports'),
        require('./validation/unresolved-types'),
        require('./validation/invalid-types'),
        require('./validation/bad-extends'),
        require('./validation/bad-implements'),
        require('./validation/non-implemented-interfaces'),
        require('./validation/bad-overrides'),
        require('./validation/missing-constructor'),
    ];
    let problems = [
        module_validaters.map(v => v(mod, imports, source_types)),
        ...probs,
    ];
    console.timeEnd('validation');

    function flatten(arr) {
        let res = arr;
        for (;;) {
            const idx = res.findIndex(x => Array.isArray(x));
            if (idx < 0) {
                return res;
            }
            res = [...res.slice(0, idx), ...res[idx], ...res.slice(idx+1)]
        }
    }

    let flattened = flatten(problems).filter(x => x);
    console.log(`Problems: ${flattened.length}`)
    return flattened;
}

module.exports = {
    validate,
}
