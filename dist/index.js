"use strict";
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (_) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", { value: true });
var registry = {};
function define(consumes, unit) {
    var normalizedDependencies = (consumes || []).map(function (item) {
        var normalizedItem = typeof item === "string"
            ? { id: item, version: "*" }
            : !item.version
                ? __assign(__assign({}, item), { version: "*" }) : item;
        return normalizedItem;
    });
    if (registry[unit.id]) {
        throw new Error("Unit \"" + unit.id + "\" already defined");
    }
    var unitInstance = __assign(__assign({}, unit), { value: undefined, state: "stopped", dependencies: normalizedDependencies, dependencyInstances: {} });
    registry[unit.id] = unitInstance;
}
exports.define = define;
function initOne(one, queued) {
    return __awaiter(this, void 0, void 0, function () {
        var stopped, getUnit, config, _a, _b;
        var _this = this;
        return __generator(this, function (_c) {
            switch (_c.label) {
                case 0:
                    stopped = Object.values(one.dependencyInstances).filter(function (dep) { return dep.state === "stopped"; });
                    stopped.forEach(function (dep) {
                        if (queued[dep.id]) {
                            throw new Error("Circular reference at \"" + dep.id + "\"");
                        }
                    });
                    return [4 /*yield*/, stopped.reduce(function (acc, next) { return __awaiter(_this, void 0, void 0, function () {
                            var _a;
                            return __generator(this, function (_b) {
                                switch (_b.label) {
                                    case 0: return [4 /*yield*/, acc];
                                    case 1:
                                        _b.sent();
                                        return [4 /*yield*/, initOne(next, __assign(__assign({}, queued), (_a = {}, _a[next.id] = true, _a)))];
                                    case 2:
                                        _b.sent();
                                        return [2 /*return*/];
                                }
                            });
                        }); }, Promise.resolve())];
                case 1:
                    _c.sent();
                    getUnit = function (unitId) {
                        if (one.dependencyInstances[unitId]) {
                            return one.dependencyInstances[unitId].value;
                        }
                        throw new Error("Unit \"" + one.id + "\" cannot reference \"" + unitId + "\" because it does not depend on it.");
                    };
                    one.dependencies.reduce(function (acc, next) {
                        acc[next.id] = registry[next.id];
                        if (!acc[next.id]) {
                            throw new Error("Unit \"" + one.id + "\" has missing dependency \"" + next.id + "\"");
                        }
                        var nextFeatures = next.features;
                        if (typeof nextFeatures === "object") {
                            Object.keys(nextFeatures).forEach(function (feature) {
                                var features = acc[next.id].features;
                                if (typeof features !== "object") {
                                    throw new Error("Unit \"" + one.id + "\" has a dependency \"" + next.id + "\" that needs a non-implemented feature \"" + feature + "\"");
                                }
                                if (features[feature] !== nextFeatures[feature]) {
                                    throw new Error("Unit \"" + one.id + "\" has a dependency \"" + next.id + "\" that requires feature \"" + feature + "\" = \"" + nextFeatures[feature] + "\" but the provider is \"" + features[feature] + "\"");
                                }
                            });
                        }
                        return acc;
                    }, one.dependencyInstances);
                    one.state = "starting";
                    if (!(typeof one.config === "function")) return [3 /*break*/, 3];
                    return [4 /*yield*/, one.config()];
                case 2:
                    _a = _c.sent();
                    return [3 /*break*/, 4];
                case 3:
                    _a = one.config;
                    _c.label = 4;
                case 4:
                    config = _a;
                    _b = one;
                    return [4 /*yield*/, one.start(config, getUnit)];
                case 5:
                    _b.value = _c.sent();
                    one.state = "started";
                    return [2 /*return*/];
            }
        });
    });
}
function init() {
    var _this = this;
    var stopped = Object.values(registry).filter(function (unit) { return unit.state === "stopped"; });
    return stopped.reduce(function (acc, next) { return __awaiter(_this, void 0, void 0, function () {
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, acc];
                case 1:
                    _a.sent();
                    return [4 /*yield*/, initOne(next, {})];
                case 2:
                    _a.sent();
                    return [2 /*return*/];
            }
        });
    }); }, Promise.resolve());
}
exports.init = init;
