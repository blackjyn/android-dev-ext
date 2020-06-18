/**
 * @typedef {import('../tokenizer').Token} Token
 * @typedef {import('../body-types').ResolvedIdent} ResolvedIdent
 * @typedef {import('../body-types').ResolveInfo} ResolveInfo
 * @typedef {import('../source-types').SourceTypeIdent} SourceTypeIdent
 * @typedef {import('java-mti').JavaType} JavaType
 */
const { Expression } = require("./Expression");
const { ArrayType } = require('java-mti');

class NewArray extends Expression {
    /**
     * @param {Token} new_token
     * @param {SourceTypeIdent} element_type
     * @param {ResolvedIdent} dimensions
     */
    constructor(new_token, element_type, dimensions) {
        super();
        this.new_token = new_token;
        this.element_type = element_type;
        this.dimensions = dimensions;
        this.array_type = new ArrayType(element_type.resolved, 1);
    }

    /**
     * @param {ResolveInfo} ri 
     */
    resolveExpression(ri) {
        return this.array_type;
    }

    tokens() {
        return [this.new_token, ...this.element_type.tokens, ...this.dimensions.tokens];
    }
}

class NewObject extends Expression {
    /**
     * @param {Token} new_token
     * @param {SourceTypeIdent} object_type
     * @param {ResolvedIdent[]} ctr_args
     * @param {Token[]} type_body
     */
    constructor(new_token, object_type, ctr_args, type_body) {
        super();
        this.new_token = new_token;
        this.object_type = object_type;
        this.ctr_args = ctr_args;
        this.type_body = type_body;
    }

    /**
     * @param {ResolveInfo} ri 
     */
    resolveExpression(ri) {
        return this.object_type.resolved;
    }

    tokens() {
        return [this.new_token, ...this.object_type.tokens];
    }
}

exports.NewArray = NewArray;
exports.NewObject = NewObject;