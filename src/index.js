"use strict";
var __spreadArray = (this && this.__spreadArray) || function (to, from, pack) {
    if (pack || arguments.length === 2) for (var i = 0, l = from.length, ar; i < l; i++) {
        if (ar || !(i in from)) {
            if (!ar) ar = Array.prototype.slice.call(from, 0, i);
            ar[i] = from[i];
        }
    }
    return to.concat(ar || Array.prototype.slice.call(from));
};
exports.__esModule = true;
var util = require('util');
var ts_interface_1 = require("./ts-interface");
function convert(typeName, path, requiredFrom) {
    if (path === void 0) { path = null; }
    var types = (0, ts_interface_1["default"])(typeName, path);
    var schema = {
        type: 'object',
        properties: Object.assign.apply(Object, __spreadArray([{}], types.map(function (type) {
            var _a;
            return _a = {},
                _a[type.name] = typeToObject(type),
                _a;
        }), false)),
        required: types.filter(function (e) { return !e.optional; }).map(function (e) { return e.name; })
    };
    //console.log(util.inspect(schema, false, null, true))
    return schema;
}
exports["default"] = convert;
function typeToObject(type) {
    console.log(type);
    if (type.type.endsWith('[]')) {
        return {
            type: 'array',
            items: typeToObject({
                type: type.type.slice(0, type.type.length - 2)
            })
        };
    }
    else if (type.type === 'string') {
        return {
            type: 'string'
        };
    }
    else if (type.type === 'number') {
        return {
            type: 'number'
        };
    }
    else if (type.type === 'array') {
        return {
            type: 'array',
            items: typeToObject(type.items)
        };
    }
    else if (type.type === 'object') {
        return {
            type: 'object',
            properties: Object.assign.apply(Object, __spreadArray([{}], type.keys.map(function (typeKey) {
                var _a;
                return (_a = {},
                    _a[typeKey.name] = typeToObject(typeKey),
                    _a);
            }), false)),
            required: type.keys.filter(function (e) { return !e.optional; }).map(function (e) { return e.name; })
        };
    }
    else if (type.type === 'any') {
        return {};
    }
    else if (type.type === 'Date') {
        return {
            type: 'string',
            format: 'date-time'
        };
    }
    else if (type.type === 'oneOf') {
        var nullable = type.types.find(function (t) { return t.type === 'null'; });
        var nonnull = type.types.filter(function (t) { return t.type !== 'null'; });
        return Object.assign({}, (nonnull.length > 1
            ? { oneOf: nonnull.map(typeToObject) }
            : typeToObject(nonnull[0])), (nullable ? { nullable: true } : {}));
    }
    else {
        console.log(type.type);
        throw new Error('UnimplementedType');
    }
}
