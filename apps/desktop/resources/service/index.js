"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __esm = (fn, res) => function __init() {
  return fn && (res = (0, fn[__getOwnPropNames(fn)[0]])(fn = 0)), res;
};
var __commonJS = (cb, mod) => function __require() {
  return mod || (0, cb[__getOwnPropNames(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
};
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));

// ../../node_modules/.pnpm/pino-std-serializers@7.1.0/node_modules/pino-std-serializers/lib/err-helpers.js
var require_err_helpers = __commonJS({
  "../../node_modules/.pnpm/pino-std-serializers@7.1.0/node_modules/pino-std-serializers/lib/err-helpers.js"(exports2, module2) {
    "use strict";
    var isErrorLike = (err) => {
      return err && typeof err.message === "string";
    };
    var getErrorCause = (err) => {
      if (!err) return;
      const cause = err.cause;
      if (typeof cause === "function") {
        const causeResult = err.cause();
        return isErrorLike(causeResult) ? causeResult : void 0;
      } else {
        return isErrorLike(cause) ? cause : void 0;
      }
    };
    var _stackWithCauses = (err, seen) => {
      if (!isErrorLike(err)) return "";
      const stack = err.stack || "";
      if (seen.has(err)) {
        return stack + "\ncauses have become circular...";
      }
      const cause = getErrorCause(err);
      if (cause) {
        seen.add(err);
        return stack + "\ncaused by: " + _stackWithCauses(cause, seen);
      } else {
        return stack;
      }
    };
    var stackWithCauses = (err) => _stackWithCauses(err, /* @__PURE__ */ new Set());
    var _messageWithCauses = (err, seen, skip) => {
      if (!isErrorLike(err)) return "";
      const message = skip ? "" : err.message || "";
      if (seen.has(err)) {
        return message + ": ...";
      }
      const cause = getErrorCause(err);
      if (cause) {
        seen.add(err);
        const skipIfVErrorStyleCause = typeof err.cause === "function";
        return message + (skipIfVErrorStyleCause ? "" : ": ") + _messageWithCauses(cause, seen, skipIfVErrorStyleCause);
      } else {
        return message;
      }
    };
    var messageWithCauses = (err) => _messageWithCauses(err, /* @__PURE__ */ new Set());
    module2.exports = {
      isErrorLike,
      getErrorCause,
      stackWithCauses,
      messageWithCauses
    };
  }
});

// ../../node_modules/.pnpm/pino-std-serializers@7.1.0/node_modules/pino-std-serializers/lib/err-proto.js
var require_err_proto = __commonJS({
  "../../node_modules/.pnpm/pino-std-serializers@7.1.0/node_modules/pino-std-serializers/lib/err-proto.js"(exports2, module2) {
    "use strict";
    var seen = /* @__PURE__ */ Symbol("circular-ref-tag");
    var rawSymbol = /* @__PURE__ */ Symbol("pino-raw-err-ref");
    var pinoErrProto = Object.create({}, {
      type: {
        enumerable: true,
        writable: true,
        value: void 0
      },
      message: {
        enumerable: true,
        writable: true,
        value: void 0
      },
      stack: {
        enumerable: true,
        writable: true,
        value: void 0
      },
      aggregateErrors: {
        enumerable: true,
        writable: true,
        value: void 0
      },
      raw: {
        enumerable: false,
        get: function() {
          return this[rawSymbol];
        },
        set: function(val) {
          this[rawSymbol] = val;
        }
      }
    });
    Object.defineProperty(pinoErrProto, rawSymbol, {
      writable: true,
      value: {}
    });
    module2.exports = {
      pinoErrProto,
      pinoErrorSymbols: {
        seen,
        rawSymbol
      }
    };
  }
});

// ../../node_modules/.pnpm/pino-std-serializers@7.1.0/node_modules/pino-std-serializers/lib/err.js
var require_err = __commonJS({
  "../../node_modules/.pnpm/pino-std-serializers@7.1.0/node_modules/pino-std-serializers/lib/err.js"(exports2, module2) {
    "use strict";
    module2.exports = errSerializer;
    var { messageWithCauses, stackWithCauses, isErrorLike } = require_err_helpers();
    var { pinoErrProto, pinoErrorSymbols } = require_err_proto();
    var { seen } = pinoErrorSymbols;
    var { toString } = Object.prototype;
    function errSerializer(err) {
      if (!isErrorLike(err)) {
        return err;
      }
      err[seen] = void 0;
      const _err = Object.create(pinoErrProto);
      _err.type = toString.call(err.constructor) === "[object Function]" ? err.constructor.name : err.name;
      _err.message = messageWithCauses(err);
      _err.stack = stackWithCauses(err);
      if (Array.isArray(err.errors)) {
        _err.aggregateErrors = err.errors.map((err2) => errSerializer(err2));
      }
      for (const key in err) {
        if (_err[key] === void 0) {
          const val = err[key];
          if (isErrorLike(val)) {
            if (key !== "cause" && !Object.prototype.hasOwnProperty.call(val, seen)) {
              _err[key] = errSerializer(val);
            }
          } else {
            _err[key] = val;
          }
        }
      }
      delete err[seen];
      _err.raw = err;
      return _err;
    }
  }
});

// ../../node_modules/.pnpm/pino-std-serializers@7.1.0/node_modules/pino-std-serializers/lib/err-with-cause.js
var require_err_with_cause = __commonJS({
  "../../node_modules/.pnpm/pino-std-serializers@7.1.0/node_modules/pino-std-serializers/lib/err-with-cause.js"(exports2, module2) {
    "use strict";
    module2.exports = errWithCauseSerializer;
    var { isErrorLike } = require_err_helpers();
    var { pinoErrProto, pinoErrorSymbols } = require_err_proto();
    var { seen } = pinoErrorSymbols;
    var { toString } = Object.prototype;
    function errWithCauseSerializer(err) {
      if (!isErrorLike(err)) {
        return err;
      }
      err[seen] = void 0;
      const _err = Object.create(pinoErrProto);
      _err.type = toString.call(err.constructor) === "[object Function]" ? err.constructor.name : err.name;
      _err.message = err.message;
      _err.stack = err.stack;
      if (Array.isArray(err.errors)) {
        _err.aggregateErrors = err.errors.map((err2) => errWithCauseSerializer(err2));
      }
      if (isErrorLike(err.cause) && !Object.prototype.hasOwnProperty.call(err.cause, seen)) {
        _err.cause = errWithCauseSerializer(err.cause);
      }
      for (const key in err) {
        if (_err[key] === void 0) {
          const val = err[key];
          if (isErrorLike(val)) {
            if (!Object.prototype.hasOwnProperty.call(val, seen)) {
              _err[key] = errWithCauseSerializer(val);
            }
          } else {
            _err[key] = val;
          }
        }
      }
      delete err[seen];
      _err.raw = err;
      return _err;
    }
  }
});

// ../../node_modules/.pnpm/pino-std-serializers@7.1.0/node_modules/pino-std-serializers/lib/req.js
var require_req = __commonJS({
  "../../node_modules/.pnpm/pino-std-serializers@7.1.0/node_modules/pino-std-serializers/lib/req.js"(exports2, module2) {
    "use strict";
    module2.exports = {
      mapHttpRequest,
      reqSerializer
    };
    var rawSymbol = /* @__PURE__ */ Symbol("pino-raw-req-ref");
    var pinoReqProto = Object.create({}, {
      id: {
        enumerable: true,
        writable: true,
        value: ""
      },
      method: {
        enumerable: true,
        writable: true,
        value: ""
      },
      url: {
        enumerable: true,
        writable: true,
        value: ""
      },
      query: {
        enumerable: true,
        writable: true,
        value: ""
      },
      params: {
        enumerable: true,
        writable: true,
        value: ""
      },
      headers: {
        enumerable: true,
        writable: true,
        value: {}
      },
      remoteAddress: {
        enumerable: true,
        writable: true,
        value: ""
      },
      remotePort: {
        enumerable: true,
        writable: true,
        value: ""
      },
      raw: {
        enumerable: false,
        get: function() {
          return this[rawSymbol];
        },
        set: function(val) {
          this[rawSymbol] = val;
        }
      }
    });
    Object.defineProperty(pinoReqProto, rawSymbol, {
      writable: true,
      value: {}
    });
    function reqSerializer(req) {
      const connection = req.info || req.socket;
      const _req = Object.create(pinoReqProto);
      _req.id = typeof req.id === "function" ? req.id() : req.id || (req.info ? req.info.id : void 0);
      _req.method = req.method;
      if (req.originalUrl) {
        _req.url = req.originalUrl;
      } else {
        const path8 = req.path;
        _req.url = typeof path8 === "string" ? path8 : req.url ? req.url.path || req.url : void 0;
      }
      if (req.query) {
        _req.query = req.query;
      }
      if (req.params) {
        _req.params = req.params;
      }
      _req.headers = req.headers;
      _req.remoteAddress = connection && connection.remoteAddress;
      _req.remotePort = connection && connection.remotePort;
      _req.raw = req.raw || req;
      return _req;
    }
    function mapHttpRequest(req) {
      return {
        req: reqSerializer(req)
      };
    }
  }
});

// ../../node_modules/.pnpm/pino-std-serializers@7.1.0/node_modules/pino-std-serializers/lib/res.js
var require_res = __commonJS({
  "../../node_modules/.pnpm/pino-std-serializers@7.1.0/node_modules/pino-std-serializers/lib/res.js"(exports2, module2) {
    "use strict";
    module2.exports = {
      mapHttpResponse,
      resSerializer
    };
    var rawSymbol = /* @__PURE__ */ Symbol("pino-raw-res-ref");
    var pinoResProto = Object.create({}, {
      statusCode: {
        enumerable: true,
        writable: true,
        value: 0
      },
      headers: {
        enumerable: true,
        writable: true,
        value: ""
      },
      raw: {
        enumerable: false,
        get: function() {
          return this[rawSymbol];
        },
        set: function(val) {
          this[rawSymbol] = val;
        }
      }
    });
    Object.defineProperty(pinoResProto, rawSymbol, {
      writable: true,
      value: {}
    });
    function resSerializer(res) {
      const _res = Object.create(pinoResProto);
      _res.statusCode = res.headersSent ? res.statusCode : null;
      _res.headers = res.getHeaders ? res.getHeaders() : res._headers;
      _res.raw = res;
      return _res;
    }
    function mapHttpResponse(res) {
      return {
        res: resSerializer(res)
      };
    }
  }
});

// ../../node_modules/.pnpm/pino-std-serializers@7.1.0/node_modules/pino-std-serializers/index.js
var require_pino_std_serializers = __commonJS({
  "../../node_modules/.pnpm/pino-std-serializers@7.1.0/node_modules/pino-std-serializers/index.js"(exports2, module2) {
    "use strict";
    var errSerializer = require_err();
    var errWithCauseSerializer = require_err_with_cause();
    var reqSerializers = require_req();
    var resSerializers = require_res();
    module2.exports = {
      err: errSerializer,
      errWithCause: errWithCauseSerializer,
      mapHttpRequest: reqSerializers.mapHttpRequest,
      mapHttpResponse: resSerializers.mapHttpResponse,
      req: reqSerializers.reqSerializer,
      res: resSerializers.resSerializer,
      wrapErrorSerializer: function wrapErrorSerializer(customSerializer) {
        if (customSerializer === errSerializer) return customSerializer;
        return function wrapErrSerializer(err) {
          return customSerializer(errSerializer(err));
        };
      },
      wrapRequestSerializer: function wrapRequestSerializer(customSerializer) {
        if (customSerializer === reqSerializers.reqSerializer) return customSerializer;
        return function wrappedReqSerializer(req) {
          return customSerializer(reqSerializers.reqSerializer(req));
        };
      },
      wrapResponseSerializer: function wrapResponseSerializer(customSerializer) {
        if (customSerializer === resSerializers.resSerializer) return customSerializer;
        return function wrappedResSerializer(res) {
          return customSerializer(resSerializers.resSerializer(res));
        };
      }
    };
  }
});

// ../../node_modules/.pnpm/pino@9.14.0/node_modules/pino/lib/caller.js
var require_caller = __commonJS({
  "../../node_modules/.pnpm/pino@9.14.0/node_modules/pino/lib/caller.js"(exports2, module2) {
    "use strict";
    function noOpPrepareStackTrace(_, stack) {
      return stack;
    }
    module2.exports = function getCallers() {
      const originalPrepare = Error.prepareStackTrace;
      Error.prepareStackTrace = noOpPrepareStackTrace;
      const stack = new Error().stack;
      Error.prepareStackTrace = originalPrepare;
      if (!Array.isArray(stack)) {
        return void 0;
      }
      const entries = stack.slice(2);
      const fileNames = [];
      for (const entry of entries) {
        if (!entry) {
          continue;
        }
        fileNames.push(entry.getFileName());
      }
      return fileNames;
    };
  }
});

// ../../node_modules/.pnpm/@pinojs+redact@0.4.0/node_modules/@pinojs/redact/index.js
var require_redact = __commonJS({
  "../../node_modules/.pnpm/@pinojs+redact@0.4.0/node_modules/@pinojs/redact/index.js"(exports2, module2) {
    "use strict";
    function deepClone(obj) {
      if (obj === null || typeof obj !== "object") {
        return obj;
      }
      if (obj instanceof Date) {
        return new Date(obj.getTime());
      }
      if (obj instanceof Array) {
        const cloned = [];
        for (let i = 0; i < obj.length; i++) {
          cloned[i] = deepClone(obj[i]);
        }
        return cloned;
      }
      if (typeof obj === "object") {
        const cloned = Object.create(Object.getPrototypeOf(obj));
        for (const key in obj) {
          if (Object.prototype.hasOwnProperty.call(obj, key)) {
            cloned[key] = deepClone(obj[key]);
          }
        }
        return cloned;
      }
      return obj;
    }
    function parsePath(path8) {
      const parts = [];
      let current = "";
      let inBrackets = false;
      let inQuotes = false;
      let quoteChar = "";
      for (let i = 0; i < path8.length; i++) {
        const char = path8[i];
        if (!inBrackets && char === ".") {
          if (current) {
            parts.push(current);
            current = "";
          }
        } else if (char === "[") {
          if (current) {
            parts.push(current);
            current = "";
          }
          inBrackets = true;
        } else if (char === "]" && inBrackets) {
          parts.push(current);
          current = "";
          inBrackets = false;
          inQuotes = false;
        } else if ((char === '"' || char === "'") && inBrackets) {
          if (!inQuotes) {
            inQuotes = true;
            quoteChar = char;
          } else if (char === quoteChar) {
            inQuotes = false;
            quoteChar = "";
          } else {
            current += char;
          }
        } else {
          current += char;
        }
      }
      if (current) {
        parts.push(current);
      }
      return parts;
    }
    function setValue(obj, parts, value) {
      let current = obj;
      for (let i = 0; i < parts.length - 1; i++) {
        const key = parts[i];
        if (typeof current !== "object" || current === null || !(key in current)) {
          return false;
        }
        if (typeof current[key] !== "object" || current[key] === null) {
          return false;
        }
        current = current[key];
      }
      const lastKey = parts[parts.length - 1];
      if (lastKey === "*") {
        if (Array.isArray(current)) {
          for (let i = 0; i < current.length; i++) {
            current[i] = value;
          }
        } else if (typeof current === "object" && current !== null) {
          for (const key in current) {
            if (Object.prototype.hasOwnProperty.call(current, key)) {
              current[key] = value;
            }
          }
        }
      } else {
        if (typeof current === "object" && current !== null && lastKey in current && Object.prototype.hasOwnProperty.call(current, lastKey)) {
          current[lastKey] = value;
        }
      }
      return true;
    }
    function removeKey(obj, parts) {
      let current = obj;
      for (let i = 0; i < parts.length - 1; i++) {
        const key = parts[i];
        if (typeof current !== "object" || current === null || !(key in current)) {
          return false;
        }
        if (typeof current[key] !== "object" || current[key] === null) {
          return false;
        }
        current = current[key];
      }
      const lastKey = parts[parts.length - 1];
      if (lastKey === "*") {
        if (Array.isArray(current)) {
          for (let i = 0; i < current.length; i++) {
            current[i] = void 0;
          }
        } else if (typeof current === "object" && current !== null) {
          for (const key in current) {
            if (Object.prototype.hasOwnProperty.call(current, key)) {
              delete current[key];
            }
          }
        }
      } else {
        if (typeof current === "object" && current !== null && lastKey in current && Object.prototype.hasOwnProperty.call(current, lastKey)) {
          delete current[lastKey];
        }
      }
      return true;
    }
    var PATH_NOT_FOUND = /* @__PURE__ */ Symbol("PATH_NOT_FOUND");
    function getValueIfExists(obj, parts) {
      let current = obj;
      for (const part of parts) {
        if (current === null || current === void 0) {
          return PATH_NOT_FOUND;
        }
        if (typeof current !== "object" || current === null) {
          return PATH_NOT_FOUND;
        }
        if (!(part in current)) {
          return PATH_NOT_FOUND;
        }
        current = current[part];
      }
      return current;
    }
    function getValue(obj, parts) {
      let current = obj;
      for (const part of parts) {
        if (current === null || current === void 0) {
          return void 0;
        }
        if (typeof current !== "object" || current === null) {
          return void 0;
        }
        current = current[part];
      }
      return current;
    }
    function redactPaths(obj, paths, censor, remove = false) {
      for (const path8 of paths) {
        const parts = parsePath(path8);
        if (parts.includes("*")) {
          redactWildcardPath(obj, parts, censor, path8, remove);
        } else {
          if (remove) {
            removeKey(obj, parts);
          } else {
            const value = getValueIfExists(obj, parts);
            if (value === PATH_NOT_FOUND) {
              continue;
            }
            const actualCensor = typeof censor === "function" ? censor(value, parts) : censor;
            setValue(obj, parts, actualCensor);
          }
        }
      }
    }
    function redactWildcardPath(obj, parts, censor, originalPath, remove = false) {
      const wildcardIndex = parts.indexOf("*");
      if (wildcardIndex === parts.length - 1) {
        const parentParts = parts.slice(0, -1);
        let current = obj;
        for (const part of parentParts) {
          if (current === null || current === void 0) return;
          if (typeof current !== "object" || current === null) return;
          current = current[part];
        }
        if (Array.isArray(current)) {
          if (remove) {
            for (let i = 0; i < current.length; i++) {
              current[i] = void 0;
            }
          } else {
            for (let i = 0; i < current.length; i++) {
              const indexPath = [...parentParts, i.toString()];
              const actualCensor = typeof censor === "function" ? censor(current[i], indexPath) : censor;
              current[i] = actualCensor;
            }
          }
        } else if (typeof current === "object" && current !== null) {
          if (remove) {
            const keysToDelete = [];
            for (const key in current) {
              if (Object.prototype.hasOwnProperty.call(current, key)) {
                keysToDelete.push(key);
              }
            }
            for (const key of keysToDelete) {
              delete current[key];
            }
          } else {
            for (const key in current) {
              const keyPath = [...parentParts, key];
              const actualCensor = typeof censor === "function" ? censor(current[key], keyPath) : censor;
              current[key] = actualCensor;
            }
          }
        }
      } else {
        redactIntermediateWildcard(obj, parts, censor, wildcardIndex, originalPath, remove);
      }
    }
    function redactIntermediateWildcard(obj, parts, censor, wildcardIndex, originalPath, remove = false) {
      const beforeWildcard = parts.slice(0, wildcardIndex);
      const afterWildcard = parts.slice(wildcardIndex + 1);
      const pathArray = [];
      function traverse(current, pathLength) {
        if (pathLength === beforeWildcard.length) {
          if (Array.isArray(current)) {
            for (let i = 0; i < current.length; i++) {
              pathArray[pathLength] = i.toString();
              traverse(current[i], pathLength + 1);
            }
          } else if (typeof current === "object" && current !== null) {
            for (const key in current) {
              pathArray[pathLength] = key;
              traverse(current[key], pathLength + 1);
            }
          }
        } else if (pathLength < beforeWildcard.length) {
          const nextKey = beforeWildcard[pathLength];
          if (current && typeof current === "object" && current !== null && nextKey in current) {
            pathArray[pathLength] = nextKey;
            traverse(current[nextKey], pathLength + 1);
          }
        } else {
          if (afterWildcard.includes("*")) {
            const wrappedCensor = typeof censor === "function" ? (value, path8) => {
              const fullPath = [...pathArray.slice(0, pathLength), ...path8];
              return censor(value, fullPath);
            } : censor;
            redactWildcardPath(current, afterWildcard, wrappedCensor, originalPath, remove);
          } else {
            if (remove) {
              removeKey(current, afterWildcard);
            } else {
              const actualCensor = typeof censor === "function" ? censor(getValue(current, afterWildcard), [...pathArray.slice(0, pathLength), ...afterWildcard]) : censor;
              setValue(current, afterWildcard, actualCensor);
            }
          }
        }
      }
      if (beforeWildcard.length === 0) {
        traverse(obj, 0);
      } else {
        let current = obj;
        for (let i = 0; i < beforeWildcard.length; i++) {
          const part = beforeWildcard[i];
          if (current === null || current === void 0) return;
          if (typeof current !== "object" || current === null) return;
          current = current[part];
          pathArray[i] = part;
        }
        if (current !== null && current !== void 0) {
          traverse(current, beforeWildcard.length);
        }
      }
    }
    function buildPathStructure(pathsToClone) {
      if (pathsToClone.length === 0) {
        return null;
      }
      const pathStructure = /* @__PURE__ */ new Map();
      for (const path8 of pathsToClone) {
        const parts = parsePath(path8);
        let current = pathStructure;
        for (let i = 0; i < parts.length; i++) {
          const part = parts[i];
          if (!current.has(part)) {
            current.set(part, /* @__PURE__ */ new Map());
          }
          current = current.get(part);
        }
      }
      return pathStructure;
    }
    function selectiveClone(obj, pathStructure) {
      if (!pathStructure) {
        return obj;
      }
      function cloneSelectively(source, pathMap, depth = 0) {
        if (!pathMap || pathMap.size === 0) {
          return source;
        }
        if (source === null || typeof source !== "object") {
          return source;
        }
        if (source instanceof Date) {
          return new Date(source.getTime());
        }
        if (Array.isArray(source)) {
          const cloned2 = [];
          for (let i = 0; i < source.length; i++) {
            const indexStr = i.toString();
            if (pathMap.has(indexStr) || pathMap.has("*")) {
              cloned2[i] = cloneSelectively(source[i], pathMap.get(indexStr) || pathMap.get("*"));
            } else {
              cloned2[i] = source[i];
            }
          }
          return cloned2;
        }
        const cloned = Object.create(Object.getPrototypeOf(source));
        for (const key in source) {
          if (Object.prototype.hasOwnProperty.call(source, key)) {
            if (pathMap.has(key) || pathMap.has("*")) {
              cloned[key] = cloneSelectively(source[key], pathMap.get(key) || pathMap.get("*"));
            } else {
              cloned[key] = source[key];
            }
          }
        }
        return cloned;
      }
      return cloneSelectively(obj, pathStructure);
    }
    function validatePath(path8) {
      if (typeof path8 !== "string") {
        throw new Error("Paths must be (non-empty) strings");
      }
      if (path8 === "") {
        throw new Error("Invalid redaction path ()");
      }
      if (path8.includes("..")) {
        throw new Error(`Invalid redaction path (${path8})`);
      }
      if (path8.includes(",")) {
        throw new Error(`Invalid redaction path (${path8})`);
      }
      let bracketCount = 0;
      let inQuotes = false;
      let quoteChar = "";
      for (let i = 0; i < path8.length; i++) {
        const char = path8[i];
        if ((char === '"' || char === "'") && bracketCount > 0) {
          if (!inQuotes) {
            inQuotes = true;
            quoteChar = char;
          } else if (char === quoteChar) {
            inQuotes = false;
            quoteChar = "";
          }
        } else if (char === "[" && !inQuotes) {
          bracketCount++;
        } else if (char === "]" && !inQuotes) {
          bracketCount--;
          if (bracketCount < 0) {
            throw new Error(`Invalid redaction path (${path8})`);
          }
        }
      }
      if (bracketCount !== 0) {
        throw new Error(`Invalid redaction path (${path8})`);
      }
    }
    function validatePaths(paths) {
      if (!Array.isArray(paths)) {
        throw new TypeError("paths must be an array");
      }
      for (const path8 of paths) {
        validatePath(path8);
      }
    }
    function slowRedact(options = {}) {
      const {
        paths = [],
        censor = "[REDACTED]",
        serialize = JSON.stringify,
        strict = true,
        remove = false
      } = options;
      validatePaths(paths);
      const pathStructure = buildPathStructure(paths);
      return function redact(obj) {
        if (strict && (obj === null || typeof obj !== "object")) {
          if (obj === null || obj === void 0) {
            return serialize ? serialize(obj) : obj;
          }
          if (typeof obj !== "object") {
            return serialize ? serialize(obj) : obj;
          }
        }
        const cloned = selectiveClone(obj, pathStructure);
        const original = obj;
        let actualCensor = censor;
        if (typeof censor === "function") {
          actualCensor = censor;
        }
        redactPaths(cloned, paths, actualCensor, remove);
        if (serialize === false) {
          cloned.restore = function() {
            return deepClone(original);
          };
          return cloned;
        }
        if (typeof serialize === "function") {
          return serialize(cloned);
        }
        return JSON.stringify(cloned);
      };
    }
    module2.exports = slowRedact;
  }
});

// ../../node_modules/.pnpm/pino@9.14.0/node_modules/pino/lib/symbols.js
var require_symbols = __commonJS({
  "../../node_modules/.pnpm/pino@9.14.0/node_modules/pino/lib/symbols.js"(exports2, module2) {
    "use strict";
    var setLevelSym = /* @__PURE__ */ Symbol("pino.setLevel");
    var getLevelSym = /* @__PURE__ */ Symbol("pino.getLevel");
    var levelValSym = /* @__PURE__ */ Symbol("pino.levelVal");
    var levelCompSym = /* @__PURE__ */ Symbol("pino.levelComp");
    var useLevelLabelsSym = /* @__PURE__ */ Symbol("pino.useLevelLabels");
    var useOnlyCustomLevelsSym = /* @__PURE__ */ Symbol("pino.useOnlyCustomLevels");
    var mixinSym = /* @__PURE__ */ Symbol("pino.mixin");
    var lsCacheSym = /* @__PURE__ */ Symbol("pino.lsCache");
    var chindingsSym = /* @__PURE__ */ Symbol("pino.chindings");
    var asJsonSym = /* @__PURE__ */ Symbol("pino.asJson");
    var writeSym = /* @__PURE__ */ Symbol("pino.write");
    var redactFmtSym = /* @__PURE__ */ Symbol("pino.redactFmt");
    var timeSym = /* @__PURE__ */ Symbol("pino.time");
    var timeSliceIndexSym = /* @__PURE__ */ Symbol("pino.timeSliceIndex");
    var streamSym = /* @__PURE__ */ Symbol("pino.stream");
    var stringifySym = /* @__PURE__ */ Symbol("pino.stringify");
    var stringifySafeSym = /* @__PURE__ */ Symbol("pino.stringifySafe");
    var stringifiersSym = /* @__PURE__ */ Symbol("pino.stringifiers");
    var endSym = /* @__PURE__ */ Symbol("pino.end");
    var formatOptsSym = /* @__PURE__ */ Symbol("pino.formatOpts");
    var messageKeySym = /* @__PURE__ */ Symbol("pino.messageKey");
    var errorKeySym = /* @__PURE__ */ Symbol("pino.errorKey");
    var nestedKeySym = /* @__PURE__ */ Symbol("pino.nestedKey");
    var nestedKeyStrSym = /* @__PURE__ */ Symbol("pino.nestedKeyStr");
    var mixinMergeStrategySym = /* @__PURE__ */ Symbol("pino.mixinMergeStrategy");
    var msgPrefixSym = /* @__PURE__ */ Symbol("pino.msgPrefix");
    var wildcardFirstSym = /* @__PURE__ */ Symbol("pino.wildcardFirst");
    var serializersSym = /* @__PURE__ */ Symbol.for("pino.serializers");
    var formattersSym = /* @__PURE__ */ Symbol.for("pino.formatters");
    var hooksSym = /* @__PURE__ */ Symbol.for("pino.hooks");
    var needsMetadataGsym = /* @__PURE__ */ Symbol.for("pino.metadata");
    module2.exports = {
      setLevelSym,
      getLevelSym,
      levelValSym,
      levelCompSym,
      useLevelLabelsSym,
      mixinSym,
      lsCacheSym,
      chindingsSym,
      asJsonSym,
      writeSym,
      serializersSym,
      redactFmtSym,
      timeSym,
      timeSliceIndexSym,
      streamSym,
      stringifySym,
      stringifySafeSym,
      stringifiersSym,
      endSym,
      formatOptsSym,
      messageKeySym,
      errorKeySym,
      nestedKeySym,
      wildcardFirstSym,
      needsMetadataGsym,
      useOnlyCustomLevelsSym,
      formattersSym,
      hooksSym,
      nestedKeyStrSym,
      mixinMergeStrategySym,
      msgPrefixSym
    };
  }
});

// ../../node_modules/.pnpm/pino@9.14.0/node_modules/pino/lib/redaction.js
var require_redaction = __commonJS({
  "../../node_modules/.pnpm/pino@9.14.0/node_modules/pino/lib/redaction.js"(exports2, module2) {
    "use strict";
    var Redact = require_redact();
    var { redactFmtSym, wildcardFirstSym } = require_symbols();
    var rx = /[^.[\]]+|\[([^[\]]*?)\]/g;
    var CENSOR = "[Redacted]";
    var strict = false;
    function redaction(opts, serialize) {
      const { paths, censor, remove } = handle(opts);
      const shape = paths.reduce((o, str) => {
        rx.lastIndex = 0;
        const first = rx.exec(str);
        const next = rx.exec(str);
        let ns = first[1] !== void 0 ? first[1].replace(/^(?:"|'|`)(.*)(?:"|'|`)$/, "$1") : first[0];
        if (ns === "*") {
          ns = wildcardFirstSym;
        }
        if (next === null) {
          o[ns] = null;
          return o;
        }
        if (o[ns] === null) {
          return o;
        }
        const { index } = next;
        const nextPath = `${str.substr(index, str.length - 1)}`;
        o[ns] = o[ns] || [];
        if (ns !== wildcardFirstSym && o[ns].length === 0) {
          o[ns].push(...o[wildcardFirstSym] || []);
        }
        if (ns === wildcardFirstSym) {
          Object.keys(o).forEach(function(k) {
            if (o[k]) {
              o[k].push(nextPath);
            }
          });
        }
        o[ns].push(nextPath);
        return o;
      }, {});
      const result = {
        [redactFmtSym]: Redact({ paths, censor, serialize, strict, remove })
      };
      const topCensor = (...args) => {
        return typeof censor === "function" ? serialize(censor(...args)) : serialize(censor);
      };
      return [...Object.keys(shape), ...Object.getOwnPropertySymbols(shape)].reduce((o, k) => {
        if (shape[k] === null) {
          o[k] = (value) => topCensor(value, [k]);
        } else {
          const wrappedCensor = typeof censor === "function" ? (value, path8) => {
            return censor(value, [k, ...path8]);
          } : censor;
          o[k] = Redact({
            paths: shape[k],
            censor: wrappedCensor,
            serialize,
            strict,
            remove
          });
        }
        return o;
      }, result);
    }
    function handle(opts) {
      if (Array.isArray(opts)) {
        opts = { paths: opts, censor: CENSOR };
        return opts;
      }
      let { paths, censor = CENSOR, remove } = opts;
      if (Array.isArray(paths) === false) {
        throw Error("pino \u2013 redact must contain an array of strings");
      }
      if (remove === true) censor = void 0;
      return { paths, censor, remove };
    }
    module2.exports = redaction;
  }
});

// ../../node_modules/.pnpm/pino@9.14.0/node_modules/pino/lib/time.js
var require_time = __commonJS({
  "../../node_modules/.pnpm/pino@9.14.0/node_modules/pino/lib/time.js"(exports2, module2) {
    "use strict";
    var nullTime = () => "";
    var epochTime = () => `,"time":${Date.now()}`;
    var unixTime = () => `,"time":${Math.round(Date.now() / 1e3)}`;
    var isoTime = () => `,"time":"${new Date(Date.now()).toISOString()}"`;
    var NS_PER_MS = 1000000n;
    var NS_PER_SEC = 1000000000n;
    var startWallTimeNs = BigInt(Date.now()) * NS_PER_MS;
    var startHrTime = process.hrtime.bigint();
    var isoTimeNano = () => {
      const elapsedNs = process.hrtime.bigint() - startHrTime;
      const currentTimeNs = startWallTimeNs + elapsedNs;
      const secondsSinceEpoch = currentTimeNs / NS_PER_SEC;
      const nanosWithinSecond = currentTimeNs % NS_PER_SEC;
      const msSinceEpoch = Number(secondsSinceEpoch * 1000n + nanosWithinSecond / 1000000n);
      const date = new Date(msSinceEpoch);
      const year = date.getUTCFullYear();
      const month = (date.getUTCMonth() + 1).toString().padStart(2, "0");
      const day = date.getUTCDate().toString().padStart(2, "0");
      const hours = date.getUTCHours().toString().padStart(2, "0");
      const minutes = date.getUTCMinutes().toString().padStart(2, "0");
      const seconds = date.getUTCSeconds().toString().padStart(2, "0");
      return `,"time":"${year}-${month}-${day}T${hours}:${minutes}:${seconds}.${nanosWithinSecond.toString().padStart(9, "0")}Z"`;
    };
    module2.exports = { nullTime, epochTime, unixTime, isoTime, isoTimeNano };
  }
});

// ../../node_modules/.pnpm/quick-format-unescaped@4.0.4/node_modules/quick-format-unescaped/index.js
var require_quick_format_unescaped = __commonJS({
  "../../node_modules/.pnpm/quick-format-unescaped@4.0.4/node_modules/quick-format-unescaped/index.js"(exports2, module2) {
    "use strict";
    function tryStringify(o) {
      try {
        return JSON.stringify(o);
      } catch (e) {
        return '"[Circular]"';
      }
    }
    module2.exports = format;
    function format(f, args, opts) {
      var ss = opts && opts.stringify || tryStringify;
      var offset = 1;
      if (typeof f === "object" && f !== null) {
        var len = args.length + offset;
        if (len === 1) return f;
        var objects = new Array(len);
        objects[0] = ss(f);
        for (var index = 1; index < len; index++) {
          objects[index] = ss(args[index]);
        }
        return objects.join(" ");
      }
      if (typeof f !== "string") {
        return f;
      }
      var argLen = args.length;
      if (argLen === 0) return f;
      var str = "";
      var a = 1 - offset;
      var lastPos = -1;
      var flen = f && f.length || 0;
      for (var i = 0; i < flen; ) {
        if (f.charCodeAt(i) === 37 && i + 1 < flen) {
          lastPos = lastPos > -1 ? lastPos : 0;
          switch (f.charCodeAt(i + 1)) {
            case 100:
            // 'd'
            case 102:
              if (a >= argLen)
                break;
              if (args[a] == null) break;
              if (lastPos < i)
                str += f.slice(lastPos, i);
              str += Number(args[a]);
              lastPos = i + 2;
              i++;
              break;
            case 105:
              if (a >= argLen)
                break;
              if (args[a] == null) break;
              if (lastPos < i)
                str += f.slice(lastPos, i);
              str += Math.floor(Number(args[a]));
              lastPos = i + 2;
              i++;
              break;
            case 79:
            // 'O'
            case 111:
            // 'o'
            case 106:
              if (a >= argLen)
                break;
              if (args[a] === void 0) break;
              if (lastPos < i)
                str += f.slice(lastPos, i);
              var type = typeof args[a];
              if (type === "string") {
                str += "'" + args[a] + "'";
                lastPos = i + 2;
                i++;
                break;
              }
              if (type === "function") {
                str += args[a].name || "<anonymous>";
                lastPos = i + 2;
                i++;
                break;
              }
              str += ss(args[a]);
              lastPos = i + 2;
              i++;
              break;
            case 115:
              if (a >= argLen)
                break;
              if (lastPos < i)
                str += f.slice(lastPos, i);
              str += String(args[a]);
              lastPos = i + 2;
              i++;
              break;
            case 37:
              if (lastPos < i)
                str += f.slice(lastPos, i);
              str += "%";
              lastPos = i + 2;
              i++;
              a--;
              break;
          }
          ++a;
        }
        ++i;
      }
      if (lastPos === -1)
        return f;
      else if (lastPos < flen) {
        str += f.slice(lastPos);
      }
      return str;
    }
  }
});

// ../../node_modules/.pnpm/atomic-sleep@1.0.0/node_modules/atomic-sleep/index.js
var require_atomic_sleep = __commonJS({
  "../../node_modules/.pnpm/atomic-sleep@1.0.0/node_modules/atomic-sleep/index.js"(exports2, module2) {
    "use strict";
    if (typeof SharedArrayBuffer !== "undefined" && typeof Atomics !== "undefined") {
      let sleep = function(ms) {
        const valid = ms > 0 && ms < Infinity;
        if (valid === false) {
          if (typeof ms !== "number" && typeof ms !== "bigint") {
            throw TypeError("sleep: ms must be a number");
          }
          throw RangeError("sleep: ms must be a number that is greater than 0 but less than Infinity");
        }
        Atomics.wait(nil, 0, 0, Number(ms));
      };
      const nil = new Int32Array(new SharedArrayBuffer(4));
      module2.exports = sleep;
    } else {
      let sleep = function(ms) {
        const valid = ms > 0 && ms < Infinity;
        if (valid === false) {
          if (typeof ms !== "number" && typeof ms !== "bigint") {
            throw TypeError("sleep: ms must be a number");
          }
          throw RangeError("sleep: ms must be a number that is greater than 0 but less than Infinity");
        }
        const target = Date.now() + Number(ms);
        while (target > Date.now()) {
        }
      };
      module2.exports = sleep;
    }
  }
});

// ../../node_modules/.pnpm/sonic-boom@4.2.0/node_modules/sonic-boom/index.js
var require_sonic_boom = __commonJS({
  "../../node_modules/.pnpm/sonic-boom@4.2.0/node_modules/sonic-boom/index.js"(exports2, module2) {
    "use strict";
    var fs5 = require("fs");
    var EventEmitter5 = require("events");
    var inherits = require("util").inherits;
    var path8 = require("path");
    var sleep = require_atomic_sleep();
    var assert = require("assert");
    var BUSY_WRITE_TIMEOUT = 100;
    var kEmptyBuffer = Buffer.allocUnsafe(0);
    var MAX_WRITE = 16 * 1024;
    var kContentModeBuffer = "buffer";
    var kContentModeUtf8 = "utf8";
    var [major, minor] = (process.versions.node || "0.0").split(".").map(Number);
    var kCopyBuffer = major >= 22 && minor >= 7;
    function openFile(file, sonic) {
      sonic._opening = true;
      sonic._writing = true;
      sonic._asyncDrainScheduled = false;
      function fileOpened(err, fd) {
        if (err) {
          sonic._reopening = false;
          sonic._writing = false;
          sonic._opening = false;
          if (sonic.sync) {
            process.nextTick(() => {
              if (sonic.listenerCount("error") > 0) {
                sonic.emit("error", err);
              }
            });
          } else {
            sonic.emit("error", err);
          }
          return;
        }
        const reopening = sonic._reopening;
        sonic.fd = fd;
        sonic.file = file;
        sonic._reopening = false;
        sonic._opening = false;
        sonic._writing = false;
        if (sonic.sync) {
          process.nextTick(() => sonic.emit("ready"));
        } else {
          sonic.emit("ready");
        }
        if (sonic.destroyed) {
          return;
        }
        if (!sonic._writing && sonic._len > sonic.minLength || sonic._flushPending) {
          sonic._actualWrite();
        } else if (reopening) {
          process.nextTick(() => sonic.emit("drain"));
        }
      }
      const flags = sonic.append ? "a" : "w";
      const mode = sonic.mode;
      if (sonic.sync) {
        try {
          if (sonic.mkdir) fs5.mkdirSync(path8.dirname(file), { recursive: true });
          const fd = fs5.openSync(file, flags, mode);
          fileOpened(null, fd);
        } catch (err) {
          fileOpened(err);
          throw err;
        }
      } else if (sonic.mkdir) {
        fs5.mkdir(path8.dirname(file), { recursive: true }, (err) => {
          if (err) return fileOpened(err);
          fs5.open(file, flags, mode, fileOpened);
        });
      } else {
        fs5.open(file, flags, mode, fileOpened);
      }
    }
    function SonicBoom(opts) {
      if (!(this instanceof SonicBoom)) {
        return new SonicBoom(opts);
      }
      let { fd, dest, minLength, maxLength, maxWrite, periodicFlush, sync, append = true, mkdir, retryEAGAIN, fsync, contentMode, mode } = opts || {};
      fd = fd || dest;
      this._len = 0;
      this.fd = -1;
      this._bufs = [];
      this._lens = [];
      this._writing = false;
      this._ending = false;
      this._reopening = false;
      this._asyncDrainScheduled = false;
      this._flushPending = false;
      this._hwm = Math.max(minLength || 0, 16387);
      this.file = null;
      this.destroyed = false;
      this.minLength = minLength || 0;
      this.maxLength = maxLength || 0;
      this.maxWrite = maxWrite || MAX_WRITE;
      this._periodicFlush = periodicFlush || 0;
      this._periodicFlushTimer = void 0;
      this.sync = sync || false;
      this.writable = true;
      this._fsync = fsync || false;
      this.append = append || false;
      this.mode = mode;
      this.retryEAGAIN = retryEAGAIN || (() => true);
      this.mkdir = mkdir || false;
      let fsWriteSync;
      let fsWrite;
      if (contentMode === kContentModeBuffer) {
        this._writingBuf = kEmptyBuffer;
        this.write = writeBuffer;
        this.flush = flushBuffer;
        this.flushSync = flushBufferSync;
        this._actualWrite = actualWriteBuffer;
        fsWriteSync = () => fs5.writeSync(this.fd, this._writingBuf);
        fsWrite = () => fs5.write(this.fd, this._writingBuf, this.release);
      } else if (contentMode === void 0 || contentMode === kContentModeUtf8) {
        this._writingBuf = "";
        this.write = write;
        this.flush = flush;
        this.flushSync = flushSync;
        this._actualWrite = actualWrite;
        fsWriteSync = () => fs5.writeSync(this.fd, this._writingBuf, "utf8");
        fsWrite = () => fs5.write(this.fd, this._writingBuf, "utf8", this.release);
      } else {
        throw new Error(`SonicBoom supports "${kContentModeUtf8}" and "${kContentModeBuffer}", but passed ${contentMode}`);
      }
      if (typeof fd === "number") {
        this.fd = fd;
        process.nextTick(() => this.emit("ready"));
      } else if (typeof fd === "string") {
        openFile(fd, this);
      } else {
        throw new Error("SonicBoom supports only file descriptors and files");
      }
      if (this.minLength >= this.maxWrite) {
        throw new Error(`minLength should be smaller than maxWrite (${this.maxWrite})`);
      }
      this.release = (err, n) => {
        if (err) {
          if ((err.code === "EAGAIN" || err.code === "EBUSY") && this.retryEAGAIN(err, this._writingBuf.length, this._len - this._writingBuf.length)) {
            if (this.sync) {
              try {
                sleep(BUSY_WRITE_TIMEOUT);
                this.release(void 0, 0);
              } catch (err2) {
                this.release(err2);
              }
            } else {
              setTimeout(fsWrite, BUSY_WRITE_TIMEOUT);
            }
          } else {
            this._writing = false;
            this.emit("error", err);
          }
          return;
        }
        this.emit("write", n);
        const releasedBufObj = releaseWritingBuf(this._writingBuf, this._len, n);
        this._len = releasedBufObj.len;
        this._writingBuf = releasedBufObj.writingBuf;
        if (this._writingBuf.length) {
          if (!this.sync) {
            fsWrite();
            return;
          }
          try {
            do {
              const n2 = fsWriteSync();
              const releasedBufObj2 = releaseWritingBuf(this._writingBuf, this._len, n2);
              this._len = releasedBufObj2.len;
              this._writingBuf = releasedBufObj2.writingBuf;
            } while (this._writingBuf.length);
          } catch (err2) {
            this.release(err2);
            return;
          }
        }
        if (this._fsync) {
          fs5.fsyncSync(this.fd);
        }
        const len = this._len;
        if (this._reopening) {
          this._writing = false;
          this._reopening = false;
          this.reopen();
        } else if (len > this.minLength) {
          this._actualWrite();
        } else if (this._ending) {
          if (len > 0) {
            this._actualWrite();
          } else {
            this._writing = false;
            actualClose(this);
          }
        } else {
          this._writing = false;
          if (this.sync) {
            if (!this._asyncDrainScheduled) {
              this._asyncDrainScheduled = true;
              process.nextTick(emitDrain, this);
            }
          } else {
            this.emit("drain");
          }
        }
      };
      this.on("newListener", function(name) {
        if (name === "drain") {
          this._asyncDrainScheduled = false;
        }
      });
      if (this._periodicFlush !== 0) {
        this._periodicFlushTimer = setInterval(() => this.flush(null), this._periodicFlush);
        this._periodicFlushTimer.unref();
      }
    }
    function releaseWritingBuf(writingBuf, len, n) {
      if (typeof writingBuf === "string" && Buffer.byteLength(writingBuf) !== n) {
        n = Buffer.from(writingBuf).subarray(0, n).toString().length;
      }
      len = Math.max(len - n, 0);
      writingBuf = writingBuf.slice(n);
      return { writingBuf, len };
    }
    function emitDrain(sonic) {
      const hasListeners = sonic.listenerCount("drain") > 0;
      if (!hasListeners) return;
      sonic._asyncDrainScheduled = false;
      sonic.emit("drain");
    }
    inherits(SonicBoom, EventEmitter5);
    function mergeBuf(bufs, len) {
      if (bufs.length === 0) {
        return kEmptyBuffer;
      }
      if (bufs.length === 1) {
        return bufs[0];
      }
      return Buffer.concat(bufs, len);
    }
    function write(data) {
      if (this.destroyed) {
        throw new Error("SonicBoom destroyed");
      }
      const len = this._len + data.length;
      const bufs = this._bufs;
      if (this.maxLength && len > this.maxLength) {
        this.emit("drop", data);
        return this._len < this._hwm;
      }
      if (bufs.length === 0 || bufs[bufs.length - 1].length + data.length > this.maxWrite) {
        bufs.push("" + data);
      } else {
        bufs[bufs.length - 1] += data;
      }
      this._len = len;
      if (!this._writing && this._len >= this.minLength) {
        this._actualWrite();
      }
      return this._len < this._hwm;
    }
    function writeBuffer(data) {
      if (this.destroyed) {
        throw new Error("SonicBoom destroyed");
      }
      const len = this._len + data.length;
      const bufs = this._bufs;
      const lens = this._lens;
      if (this.maxLength && len > this.maxLength) {
        this.emit("drop", data);
        return this._len < this._hwm;
      }
      if (bufs.length === 0 || lens[lens.length - 1] + data.length > this.maxWrite) {
        bufs.push([data]);
        lens.push(data.length);
      } else {
        bufs[bufs.length - 1].push(data);
        lens[lens.length - 1] += data.length;
      }
      this._len = len;
      if (!this._writing && this._len >= this.minLength) {
        this._actualWrite();
      }
      return this._len < this._hwm;
    }
    function callFlushCallbackOnDrain(cb) {
      this._flushPending = true;
      const onDrain = () => {
        if (!this._fsync) {
          try {
            fs5.fsync(this.fd, (err) => {
              this._flushPending = false;
              cb(err);
            });
          } catch (err) {
            cb(err);
          }
        } else {
          this._flushPending = false;
          cb();
        }
        this.off("error", onError);
      };
      const onError = (err) => {
        this._flushPending = false;
        cb(err);
        this.off("drain", onDrain);
      };
      this.once("drain", onDrain);
      this.once("error", onError);
    }
    function flush(cb) {
      if (cb != null && typeof cb !== "function") {
        throw new Error("flush cb must be a function");
      }
      if (this.destroyed) {
        const error = new Error("SonicBoom destroyed");
        if (cb) {
          cb(error);
          return;
        }
        throw error;
      }
      if (this.minLength <= 0) {
        cb?.();
        return;
      }
      if (cb) {
        callFlushCallbackOnDrain.call(this, cb);
      }
      if (this._writing) {
        return;
      }
      if (this._bufs.length === 0) {
        this._bufs.push("");
      }
      this._actualWrite();
    }
    function flushBuffer(cb) {
      if (cb != null && typeof cb !== "function") {
        throw new Error("flush cb must be a function");
      }
      if (this.destroyed) {
        const error = new Error("SonicBoom destroyed");
        if (cb) {
          cb(error);
          return;
        }
        throw error;
      }
      if (this.minLength <= 0) {
        cb?.();
        return;
      }
      if (cb) {
        callFlushCallbackOnDrain.call(this, cb);
      }
      if (this._writing) {
        return;
      }
      if (this._bufs.length === 0) {
        this._bufs.push([]);
        this._lens.push(0);
      }
      this._actualWrite();
    }
    SonicBoom.prototype.reopen = function(file) {
      if (this.destroyed) {
        throw new Error("SonicBoom destroyed");
      }
      if (this._opening) {
        this.once("ready", () => {
          this.reopen(file);
        });
        return;
      }
      if (this._ending) {
        return;
      }
      if (!this.file) {
        throw new Error("Unable to reopen a file descriptor, you must pass a file to SonicBoom");
      }
      if (file) {
        this.file = file;
      }
      this._reopening = true;
      if (this._writing) {
        return;
      }
      const fd = this.fd;
      this.once("ready", () => {
        if (fd !== this.fd) {
          fs5.close(fd, (err) => {
            if (err) {
              return this.emit("error", err);
            }
          });
        }
      });
      openFile(this.file, this);
    };
    SonicBoom.prototype.end = function() {
      if (this.destroyed) {
        throw new Error("SonicBoom destroyed");
      }
      if (this._opening) {
        this.once("ready", () => {
          this.end();
        });
        return;
      }
      if (this._ending) {
        return;
      }
      this._ending = true;
      if (this._writing) {
        return;
      }
      if (this._len > 0 && this.fd >= 0) {
        this._actualWrite();
      } else {
        actualClose(this);
      }
    };
    function flushSync() {
      if (this.destroyed) {
        throw new Error("SonicBoom destroyed");
      }
      if (this.fd < 0) {
        throw new Error("sonic boom is not ready yet");
      }
      if (!this._writing && this._writingBuf.length > 0) {
        this._bufs.unshift(this._writingBuf);
        this._writingBuf = "";
      }
      let buf = "";
      while (this._bufs.length || buf) {
        if (buf.length <= 0) {
          buf = this._bufs[0];
        }
        try {
          const n = fs5.writeSync(this.fd, buf, "utf8");
          const releasedBufObj = releaseWritingBuf(buf, this._len, n);
          buf = releasedBufObj.writingBuf;
          this._len = releasedBufObj.len;
          if (buf.length <= 0) {
            this._bufs.shift();
          }
        } catch (err) {
          const shouldRetry = err.code === "EAGAIN" || err.code === "EBUSY";
          if (shouldRetry && !this.retryEAGAIN(err, buf.length, this._len - buf.length)) {
            throw err;
          }
          sleep(BUSY_WRITE_TIMEOUT);
        }
      }
      try {
        fs5.fsyncSync(this.fd);
      } catch {
      }
    }
    function flushBufferSync() {
      if (this.destroyed) {
        throw new Error("SonicBoom destroyed");
      }
      if (this.fd < 0) {
        throw new Error("sonic boom is not ready yet");
      }
      if (!this._writing && this._writingBuf.length > 0) {
        this._bufs.unshift([this._writingBuf]);
        this._writingBuf = kEmptyBuffer;
      }
      let buf = kEmptyBuffer;
      while (this._bufs.length || buf.length) {
        if (buf.length <= 0) {
          buf = mergeBuf(this._bufs[0], this._lens[0]);
        }
        try {
          const n = fs5.writeSync(this.fd, buf);
          buf = buf.subarray(n);
          this._len = Math.max(this._len - n, 0);
          if (buf.length <= 0) {
            this._bufs.shift();
            this._lens.shift();
          }
        } catch (err) {
          const shouldRetry = err.code === "EAGAIN" || err.code === "EBUSY";
          if (shouldRetry && !this.retryEAGAIN(err, buf.length, this._len - buf.length)) {
            throw err;
          }
          sleep(BUSY_WRITE_TIMEOUT);
        }
      }
    }
    SonicBoom.prototype.destroy = function() {
      if (this.destroyed) {
        return;
      }
      actualClose(this);
    };
    function actualWrite() {
      const release = this.release;
      this._writing = true;
      this._writingBuf = this._writingBuf || this._bufs.shift() || "";
      if (this.sync) {
        try {
          const written = fs5.writeSync(this.fd, this._writingBuf, "utf8");
          release(null, written);
        } catch (err) {
          release(err);
        }
      } else {
        fs5.write(this.fd, this._writingBuf, "utf8", release);
      }
    }
    function actualWriteBuffer() {
      const release = this.release;
      this._writing = true;
      this._writingBuf = this._writingBuf.length ? this._writingBuf : mergeBuf(this._bufs.shift(), this._lens.shift());
      if (this.sync) {
        try {
          const written = fs5.writeSync(this.fd, this._writingBuf);
          release(null, written);
        } catch (err) {
          release(err);
        }
      } else {
        if (kCopyBuffer) {
          this._writingBuf = Buffer.from(this._writingBuf);
        }
        fs5.write(this.fd, this._writingBuf, release);
      }
    }
    function actualClose(sonic) {
      if (sonic.fd === -1) {
        sonic.once("ready", actualClose.bind(null, sonic));
        return;
      }
      if (sonic._periodicFlushTimer !== void 0) {
        clearInterval(sonic._periodicFlushTimer);
      }
      sonic.destroyed = true;
      sonic._bufs = [];
      sonic._lens = [];
      assert(typeof sonic.fd === "number", `sonic.fd must be a number, got ${typeof sonic.fd}`);
      try {
        fs5.fsync(sonic.fd, closeWrapped);
      } catch {
      }
      function closeWrapped() {
        if (sonic.fd !== 1 && sonic.fd !== 2) {
          fs5.close(sonic.fd, done);
        } else {
          done();
        }
      }
      function done(err) {
        if (err) {
          sonic.emit("error", err);
          return;
        }
        if (sonic._ending && !sonic._writing) {
          sonic.emit("finish");
        }
        sonic.emit("close");
      }
    }
    SonicBoom.SonicBoom = SonicBoom;
    SonicBoom.default = SonicBoom;
    module2.exports = SonicBoom;
  }
});

// ../../node_modules/.pnpm/on-exit-leak-free@2.1.2/node_modules/on-exit-leak-free/index.js
var require_on_exit_leak_free = __commonJS({
  "../../node_modules/.pnpm/on-exit-leak-free@2.1.2/node_modules/on-exit-leak-free/index.js"(exports2, module2) {
    "use strict";
    var refs = {
      exit: [],
      beforeExit: []
    };
    var functions = {
      exit: onExit,
      beforeExit: onBeforeExit
    };
    var registry;
    function ensureRegistry() {
      if (registry === void 0) {
        registry = new FinalizationRegistry(clear);
      }
    }
    function install(event) {
      if (refs[event].length > 0) {
        return;
      }
      process.on(event, functions[event]);
    }
    function uninstall(event) {
      if (refs[event].length > 0) {
        return;
      }
      process.removeListener(event, functions[event]);
      if (refs.exit.length === 0 && refs.beforeExit.length === 0) {
        registry = void 0;
      }
    }
    function onExit() {
      callRefs("exit");
    }
    function onBeforeExit() {
      callRefs("beforeExit");
    }
    function callRefs(event) {
      for (const ref of refs[event]) {
        const obj = ref.deref();
        const fn = ref.fn;
        if (obj !== void 0) {
          fn(obj, event);
        }
      }
      refs[event] = [];
    }
    function clear(ref) {
      for (const event of ["exit", "beforeExit"]) {
        const index = refs[event].indexOf(ref);
        refs[event].splice(index, index + 1);
        uninstall(event);
      }
    }
    function _register(event, obj, fn) {
      if (obj === void 0) {
        throw new Error("the object can't be undefined");
      }
      install(event);
      const ref = new WeakRef(obj);
      ref.fn = fn;
      ensureRegistry();
      registry.register(obj, ref);
      refs[event].push(ref);
    }
    function register(obj, fn) {
      _register("exit", obj, fn);
    }
    function registerBeforeExit(obj, fn) {
      _register("beforeExit", obj, fn);
    }
    function unregister(obj) {
      if (registry === void 0) {
        return;
      }
      registry.unregister(obj);
      for (const event of ["exit", "beforeExit"]) {
        refs[event] = refs[event].filter((ref) => {
          const _obj = ref.deref();
          return _obj && _obj !== obj;
        });
        uninstall(event);
      }
    }
    module2.exports = {
      register,
      registerBeforeExit,
      unregister
    };
  }
});

// ../../node_modules/.pnpm/thread-stream@3.1.0/node_modules/thread-stream/package.json
var require_package = __commonJS({
  "../../node_modules/.pnpm/thread-stream@3.1.0/node_modules/thread-stream/package.json"(exports2, module2) {
    module2.exports = {
      name: "thread-stream",
      version: "3.1.0",
      description: "A streaming way to send data to a Node.js Worker Thread",
      main: "index.js",
      types: "index.d.ts",
      dependencies: {
        "real-require": "^0.2.0"
      },
      devDependencies: {
        "@types/node": "^20.1.0",
        "@types/tap": "^15.0.0",
        "@yao-pkg/pkg": "^5.11.5",
        desm: "^1.3.0",
        fastbench: "^1.0.1",
        husky: "^9.0.6",
        "pino-elasticsearch": "^8.0.0",
        "sonic-boom": "^4.0.1",
        standard: "^17.0.0",
        tap: "^16.2.0",
        "ts-node": "^10.8.0",
        typescript: "^5.3.2",
        "why-is-node-running": "^2.2.2"
      },
      scripts: {
        build: "tsc --noEmit",
        test: 'standard && npm run build && npm run transpile && tap "test/**/*.test.*js" && tap --ts test/*.test.*ts',
        "test:ci": "standard && npm run transpile && npm run test:ci:js && npm run test:ci:ts",
        "test:ci:js": 'tap --no-check-coverage --timeout=120 --coverage-report=lcovonly "test/**/*.test.*js"',
        "test:ci:ts": 'tap --ts --no-check-coverage --coverage-report=lcovonly "test/**/*.test.*ts"',
        "test:yarn": 'npm run transpile && tap "test/**/*.test.js" --no-check-coverage',
        transpile: "sh ./test/ts/transpile.sh",
        prepare: "husky install"
      },
      standard: {
        ignore: [
          "test/ts/**/*",
          "test/syntax-error.mjs"
        ]
      },
      repository: {
        type: "git",
        url: "git+https://github.com/mcollina/thread-stream.git"
      },
      keywords: [
        "worker",
        "thread",
        "threads",
        "stream"
      ],
      author: "Matteo Collina <hello@matteocollina.com>",
      license: "MIT",
      bugs: {
        url: "https://github.com/mcollina/thread-stream/issues"
      },
      homepage: "https://github.com/mcollina/thread-stream#readme"
    };
  }
});

// ../../node_modules/.pnpm/thread-stream@3.1.0/node_modules/thread-stream/lib/wait.js
var require_wait = __commonJS({
  "../../node_modules/.pnpm/thread-stream@3.1.0/node_modules/thread-stream/lib/wait.js"(exports2, module2) {
    "use strict";
    var MAX_TIMEOUT = 1e3;
    function wait(state, index, expected, timeout, done) {
      const max = Date.now() + timeout;
      let current = Atomics.load(state, index);
      if (current === expected) {
        done(null, "ok");
        return;
      }
      let prior = current;
      const check = (backoff) => {
        if (Date.now() > max) {
          done(null, "timed-out");
        } else {
          setTimeout(() => {
            prior = current;
            current = Atomics.load(state, index);
            if (current === prior) {
              check(backoff >= MAX_TIMEOUT ? MAX_TIMEOUT : backoff * 2);
            } else {
              if (current === expected) done(null, "ok");
              else done(null, "not-equal");
            }
          }, backoff);
        }
      };
      check(1);
    }
    function waitDiff(state, index, expected, timeout, done) {
      const max = Date.now() + timeout;
      let current = Atomics.load(state, index);
      if (current !== expected) {
        done(null, "ok");
        return;
      }
      const check = (backoff) => {
        if (Date.now() > max) {
          done(null, "timed-out");
        } else {
          setTimeout(() => {
            current = Atomics.load(state, index);
            if (current !== expected) {
              done(null, "ok");
            } else {
              check(backoff >= MAX_TIMEOUT ? MAX_TIMEOUT : backoff * 2);
            }
          }, backoff);
        }
      };
      check(1);
    }
    module2.exports = { wait, waitDiff };
  }
});

// ../../node_modules/.pnpm/thread-stream@3.1.0/node_modules/thread-stream/lib/indexes.js
var require_indexes = __commonJS({
  "../../node_modules/.pnpm/thread-stream@3.1.0/node_modules/thread-stream/lib/indexes.js"(exports2, module2) {
    "use strict";
    var WRITE_INDEX = 4;
    var READ_INDEX = 8;
    module2.exports = {
      WRITE_INDEX,
      READ_INDEX
    };
  }
});

// ../../node_modules/.pnpm/thread-stream@3.1.0/node_modules/thread-stream/index.js
var require_thread_stream = __commonJS({
  "../../node_modules/.pnpm/thread-stream@3.1.0/node_modules/thread-stream/index.js"(exports2, module2) {
    "use strict";
    var { version } = require_package();
    var { EventEmitter: EventEmitter5 } = require("events");
    var { Worker } = require("worker_threads");
    var { join } = require("path");
    var { pathToFileURL } = require("url");
    var { wait } = require_wait();
    var {
      WRITE_INDEX,
      READ_INDEX
    } = require_indexes();
    var buffer = require("buffer");
    var assert = require("assert");
    var kImpl = /* @__PURE__ */ Symbol("kImpl");
    var MAX_STRING = buffer.constants.MAX_STRING_LENGTH;
    var FakeWeakRef = class {
      constructor(value) {
        this._value = value;
      }
      deref() {
        return this._value;
      }
    };
    var FakeFinalizationRegistry = class {
      register() {
      }
      unregister() {
      }
    };
    var FinalizationRegistry2 = process.env.NODE_V8_COVERAGE ? FakeFinalizationRegistry : global.FinalizationRegistry || FakeFinalizationRegistry;
    var WeakRef2 = process.env.NODE_V8_COVERAGE ? FakeWeakRef : global.WeakRef || FakeWeakRef;
    var registry = new FinalizationRegistry2((worker) => {
      if (worker.exited) {
        return;
      }
      worker.terminate();
    });
    function createWorker(stream, opts) {
      const { filename, workerData } = opts;
      const bundlerOverrides = "__bundlerPathsOverrides" in globalThis ? globalThis.__bundlerPathsOverrides : {};
      const toExecute = bundlerOverrides["thread-stream-worker"] || join(__dirname, "lib", "worker.js");
      const worker = new Worker(toExecute, {
        ...opts.workerOpts,
        trackUnmanagedFds: false,
        workerData: {
          filename: filename.indexOf("file://") === 0 ? filename : pathToFileURL(filename).href,
          dataBuf: stream[kImpl].dataBuf,
          stateBuf: stream[kImpl].stateBuf,
          workerData: {
            $context: {
              threadStreamVersion: version
            },
            ...workerData
          }
        }
      });
      worker.stream = new FakeWeakRef(stream);
      worker.on("message", onWorkerMessage);
      worker.on("exit", onWorkerExit);
      registry.register(stream, worker);
      return worker;
    }
    function drain(stream) {
      assert(!stream[kImpl].sync);
      if (stream[kImpl].needDrain) {
        stream[kImpl].needDrain = false;
        stream.emit("drain");
      }
    }
    function nextFlush(stream) {
      const writeIndex = Atomics.load(stream[kImpl].state, WRITE_INDEX);
      let leftover = stream[kImpl].data.length - writeIndex;
      if (leftover > 0) {
        if (stream[kImpl].buf.length === 0) {
          stream[kImpl].flushing = false;
          if (stream[kImpl].ending) {
            end(stream);
          } else if (stream[kImpl].needDrain) {
            process.nextTick(drain, stream);
          }
          return;
        }
        let toWrite = stream[kImpl].buf.slice(0, leftover);
        let toWriteBytes = Buffer.byteLength(toWrite);
        if (toWriteBytes <= leftover) {
          stream[kImpl].buf = stream[kImpl].buf.slice(leftover);
          write(stream, toWrite, nextFlush.bind(null, stream));
        } else {
          stream.flush(() => {
            if (stream.destroyed) {
              return;
            }
            Atomics.store(stream[kImpl].state, READ_INDEX, 0);
            Atomics.store(stream[kImpl].state, WRITE_INDEX, 0);
            while (toWriteBytes > stream[kImpl].data.length) {
              leftover = leftover / 2;
              toWrite = stream[kImpl].buf.slice(0, leftover);
              toWriteBytes = Buffer.byteLength(toWrite);
            }
            stream[kImpl].buf = stream[kImpl].buf.slice(leftover);
            write(stream, toWrite, nextFlush.bind(null, stream));
          });
        }
      } else if (leftover === 0) {
        if (writeIndex === 0 && stream[kImpl].buf.length === 0) {
          return;
        }
        stream.flush(() => {
          Atomics.store(stream[kImpl].state, READ_INDEX, 0);
          Atomics.store(stream[kImpl].state, WRITE_INDEX, 0);
          nextFlush(stream);
        });
      } else {
        destroy(stream, new Error("overwritten"));
      }
    }
    function onWorkerMessage(msg) {
      const stream = this.stream.deref();
      if (stream === void 0) {
        this.exited = true;
        this.terminate();
        return;
      }
      switch (msg.code) {
        case "READY":
          this.stream = new WeakRef2(stream);
          stream.flush(() => {
            stream[kImpl].ready = true;
            stream.emit("ready");
          });
          break;
        case "ERROR":
          destroy(stream, msg.err);
          break;
        case "EVENT":
          if (Array.isArray(msg.args)) {
            stream.emit(msg.name, ...msg.args);
          } else {
            stream.emit(msg.name, msg.args);
          }
          break;
        case "WARNING":
          process.emitWarning(msg.err);
          break;
        default:
          destroy(stream, new Error("this should not happen: " + msg.code));
      }
    }
    function onWorkerExit(code) {
      const stream = this.stream.deref();
      if (stream === void 0) {
        return;
      }
      registry.unregister(stream);
      stream.worker.exited = true;
      stream.worker.off("exit", onWorkerExit);
      destroy(stream, code !== 0 ? new Error("the worker thread exited") : null);
    }
    var ThreadStream = class extends EventEmitter5 {
      constructor(opts = {}) {
        super();
        if (opts.bufferSize < 4) {
          throw new Error("bufferSize must at least fit a 4-byte utf-8 char");
        }
        this[kImpl] = {};
        this[kImpl].stateBuf = new SharedArrayBuffer(128);
        this[kImpl].state = new Int32Array(this[kImpl].stateBuf);
        this[kImpl].dataBuf = new SharedArrayBuffer(opts.bufferSize || 4 * 1024 * 1024);
        this[kImpl].data = Buffer.from(this[kImpl].dataBuf);
        this[kImpl].sync = opts.sync || false;
        this[kImpl].ending = false;
        this[kImpl].ended = false;
        this[kImpl].needDrain = false;
        this[kImpl].destroyed = false;
        this[kImpl].flushing = false;
        this[kImpl].ready = false;
        this[kImpl].finished = false;
        this[kImpl].errored = null;
        this[kImpl].closed = false;
        this[kImpl].buf = "";
        this.worker = createWorker(this, opts);
        this.on("message", (message, transferList) => {
          this.worker.postMessage(message, transferList);
        });
      }
      write(data) {
        if (this[kImpl].destroyed) {
          error(this, new Error("the worker has exited"));
          return false;
        }
        if (this[kImpl].ending) {
          error(this, new Error("the worker is ending"));
          return false;
        }
        if (this[kImpl].flushing && this[kImpl].buf.length + data.length >= MAX_STRING) {
          try {
            writeSync(this);
            this[kImpl].flushing = true;
          } catch (err) {
            destroy(this, err);
            return false;
          }
        }
        this[kImpl].buf += data;
        if (this[kImpl].sync) {
          try {
            writeSync(this);
            return true;
          } catch (err) {
            destroy(this, err);
            return false;
          }
        }
        if (!this[kImpl].flushing) {
          this[kImpl].flushing = true;
          setImmediate(nextFlush, this);
        }
        this[kImpl].needDrain = this[kImpl].data.length - this[kImpl].buf.length - Atomics.load(this[kImpl].state, WRITE_INDEX) <= 0;
        return !this[kImpl].needDrain;
      }
      end() {
        if (this[kImpl].destroyed) {
          return;
        }
        this[kImpl].ending = true;
        end(this);
      }
      flush(cb) {
        if (this[kImpl].destroyed) {
          if (typeof cb === "function") {
            process.nextTick(cb, new Error("the worker has exited"));
          }
          return;
        }
        const writeIndex = Atomics.load(this[kImpl].state, WRITE_INDEX);
        wait(this[kImpl].state, READ_INDEX, writeIndex, Infinity, (err, res) => {
          if (err) {
            destroy(this, err);
            process.nextTick(cb, err);
            return;
          }
          if (res === "not-equal") {
            this.flush(cb);
            return;
          }
          process.nextTick(cb);
        });
      }
      flushSync() {
        if (this[kImpl].destroyed) {
          return;
        }
        writeSync(this);
        flushSync(this);
      }
      unref() {
        this.worker.unref();
      }
      ref() {
        this.worker.ref();
      }
      get ready() {
        return this[kImpl].ready;
      }
      get destroyed() {
        return this[kImpl].destroyed;
      }
      get closed() {
        return this[kImpl].closed;
      }
      get writable() {
        return !this[kImpl].destroyed && !this[kImpl].ending;
      }
      get writableEnded() {
        return this[kImpl].ending;
      }
      get writableFinished() {
        return this[kImpl].finished;
      }
      get writableNeedDrain() {
        return this[kImpl].needDrain;
      }
      get writableObjectMode() {
        return false;
      }
      get writableErrored() {
        return this[kImpl].errored;
      }
    };
    function error(stream, err) {
      setImmediate(() => {
        stream.emit("error", err);
      });
    }
    function destroy(stream, err) {
      if (stream[kImpl].destroyed) {
        return;
      }
      stream[kImpl].destroyed = true;
      if (err) {
        stream[kImpl].errored = err;
        error(stream, err);
      }
      if (!stream.worker.exited) {
        stream.worker.terminate().catch(() => {
        }).then(() => {
          stream[kImpl].closed = true;
          stream.emit("close");
        });
      } else {
        setImmediate(() => {
          stream[kImpl].closed = true;
          stream.emit("close");
        });
      }
    }
    function write(stream, data, cb) {
      const current = Atomics.load(stream[kImpl].state, WRITE_INDEX);
      const length = Buffer.byteLength(data);
      stream[kImpl].data.write(data, current);
      Atomics.store(stream[kImpl].state, WRITE_INDEX, current + length);
      Atomics.notify(stream[kImpl].state, WRITE_INDEX);
      cb();
      return true;
    }
    function end(stream) {
      if (stream[kImpl].ended || !stream[kImpl].ending || stream[kImpl].flushing) {
        return;
      }
      stream[kImpl].ended = true;
      try {
        stream.flushSync();
        let readIndex = Atomics.load(stream[kImpl].state, READ_INDEX);
        Atomics.store(stream[kImpl].state, WRITE_INDEX, -1);
        Atomics.notify(stream[kImpl].state, WRITE_INDEX);
        let spins = 0;
        while (readIndex !== -1) {
          Atomics.wait(stream[kImpl].state, READ_INDEX, readIndex, 1e3);
          readIndex = Atomics.load(stream[kImpl].state, READ_INDEX);
          if (readIndex === -2) {
            destroy(stream, new Error("end() failed"));
            return;
          }
          if (++spins === 10) {
            destroy(stream, new Error("end() took too long (10s)"));
            return;
          }
        }
        process.nextTick(() => {
          stream[kImpl].finished = true;
          stream.emit("finish");
        });
      } catch (err) {
        destroy(stream, err);
      }
    }
    function writeSync(stream) {
      const cb = () => {
        if (stream[kImpl].ending) {
          end(stream);
        } else if (stream[kImpl].needDrain) {
          process.nextTick(drain, stream);
        }
      };
      stream[kImpl].flushing = false;
      while (stream[kImpl].buf.length !== 0) {
        const writeIndex = Atomics.load(stream[kImpl].state, WRITE_INDEX);
        let leftover = stream[kImpl].data.length - writeIndex;
        if (leftover === 0) {
          flushSync(stream);
          Atomics.store(stream[kImpl].state, READ_INDEX, 0);
          Atomics.store(stream[kImpl].state, WRITE_INDEX, 0);
          continue;
        } else if (leftover < 0) {
          throw new Error("overwritten");
        }
        let toWrite = stream[kImpl].buf.slice(0, leftover);
        let toWriteBytes = Buffer.byteLength(toWrite);
        if (toWriteBytes <= leftover) {
          stream[kImpl].buf = stream[kImpl].buf.slice(leftover);
          write(stream, toWrite, cb);
        } else {
          flushSync(stream);
          Atomics.store(stream[kImpl].state, READ_INDEX, 0);
          Atomics.store(stream[kImpl].state, WRITE_INDEX, 0);
          while (toWriteBytes > stream[kImpl].buf.length) {
            leftover = leftover / 2;
            toWrite = stream[kImpl].buf.slice(0, leftover);
            toWriteBytes = Buffer.byteLength(toWrite);
          }
          stream[kImpl].buf = stream[kImpl].buf.slice(leftover);
          write(stream, toWrite, cb);
        }
      }
    }
    function flushSync(stream) {
      if (stream[kImpl].flushing) {
        throw new Error("unable to flush while flushing");
      }
      const writeIndex = Atomics.load(stream[kImpl].state, WRITE_INDEX);
      let spins = 0;
      while (true) {
        const readIndex = Atomics.load(stream[kImpl].state, READ_INDEX);
        if (readIndex === -2) {
          throw Error("_flushSync failed");
        }
        if (readIndex !== writeIndex) {
          Atomics.wait(stream[kImpl].state, READ_INDEX, readIndex, 1e3);
        } else {
          break;
        }
        if (++spins === 10) {
          throw new Error("_flushSync took too long (10s)");
        }
      }
    }
    module2.exports = ThreadStream;
  }
});

// ../../node_modules/.pnpm/pino@9.14.0/node_modules/pino/lib/transport.js
var require_transport = __commonJS({
  "../../node_modules/.pnpm/pino@9.14.0/node_modules/pino/lib/transport.js"(exports2, module2) {
    "use strict";
    var { createRequire } = require("module");
    var getCallers = require_caller();
    var { join, isAbsolute, sep } = require("node:path");
    var sleep = require_atomic_sleep();
    var onExit = require_on_exit_leak_free();
    var ThreadStream = require_thread_stream();
    function setupOnExit(stream) {
      onExit.register(stream, autoEnd);
      onExit.registerBeforeExit(stream, flush);
      stream.on("close", function() {
        onExit.unregister(stream);
      });
    }
    function buildStream(filename, workerData, workerOpts, sync) {
      const stream = new ThreadStream({
        filename,
        workerData,
        workerOpts,
        sync
      });
      stream.on("ready", onReady);
      stream.on("close", function() {
        process.removeListener("exit", onExit2);
      });
      process.on("exit", onExit2);
      function onReady() {
        process.removeListener("exit", onExit2);
        stream.unref();
        if (workerOpts.autoEnd !== false) {
          setupOnExit(stream);
        }
      }
      function onExit2() {
        if (stream.closed) {
          return;
        }
        stream.flushSync();
        sleep(100);
        stream.end();
      }
      return stream;
    }
    function autoEnd(stream) {
      stream.ref();
      stream.flushSync();
      stream.end();
      stream.once("close", function() {
        stream.unref();
      });
    }
    function flush(stream) {
      stream.flushSync();
    }
    function transport(fullOptions) {
      const { pipeline, targets, levels, dedupe, worker = {}, caller = getCallers(), sync = false } = fullOptions;
      const options = {
        ...fullOptions.options
      };
      const callers = typeof caller === "string" ? [caller] : caller;
      const bundlerOverrides = "__bundlerPathsOverrides" in globalThis ? globalThis.__bundlerPathsOverrides : {};
      let target = fullOptions.target;
      if (target && targets) {
        throw new Error("only one of target or targets can be specified");
      }
      if (targets) {
        target = bundlerOverrides["pino-worker"] || join(__dirname, "worker.js");
        options.targets = targets.filter((dest) => dest.target).map((dest) => {
          return {
            ...dest,
            target: fixTarget(dest.target)
          };
        });
        options.pipelines = targets.filter((dest) => dest.pipeline).map((dest) => {
          return dest.pipeline.map((t) => {
            return {
              ...t,
              level: dest.level,
              // duplicate the pipeline `level` property defined in the upper level
              target: fixTarget(t.target)
            };
          });
        });
      } else if (pipeline) {
        target = bundlerOverrides["pino-worker"] || join(__dirname, "worker.js");
        options.pipelines = [pipeline.map((dest) => {
          return {
            ...dest,
            target: fixTarget(dest.target)
          };
        })];
      }
      if (levels) {
        options.levels = levels;
      }
      if (dedupe) {
        options.dedupe = dedupe;
      }
      options.pinoWillSendConfig = true;
      return buildStream(fixTarget(target), options, worker, sync);
      function fixTarget(origin) {
        origin = bundlerOverrides[origin] || origin;
        if (isAbsolute(origin) || origin.indexOf("file://") === 0) {
          return origin;
        }
        if (origin === "pino/file") {
          return join(__dirname, "..", "file.js");
        }
        let fixTarget2;
        for (const filePath of callers) {
          try {
            const context = filePath === "node:repl" ? process.cwd() + sep : filePath;
            fixTarget2 = createRequire(context).resolve(origin);
            break;
          } catch (err) {
            continue;
          }
        }
        if (!fixTarget2) {
          throw new Error(`unable to determine transport target for "${origin}"`);
        }
        return fixTarget2;
      }
    }
    module2.exports = transport;
  }
});

// ../../node_modules/.pnpm/pino@9.14.0/node_modules/pino/lib/tools.js
var require_tools = __commonJS({
  "../../node_modules/.pnpm/pino@9.14.0/node_modules/pino/lib/tools.js"(exports2, module2) {
    "use strict";
    var diagChan = require("node:diagnostics_channel");
    var format = require_quick_format_unescaped();
    var { mapHttpRequest, mapHttpResponse } = require_pino_std_serializers();
    var SonicBoom = require_sonic_boom();
    var onExit = require_on_exit_leak_free();
    var {
      lsCacheSym,
      chindingsSym,
      writeSym,
      serializersSym,
      formatOptsSym,
      endSym,
      stringifiersSym,
      stringifySym,
      stringifySafeSym,
      wildcardFirstSym,
      nestedKeySym,
      formattersSym,
      messageKeySym,
      errorKeySym,
      nestedKeyStrSym,
      msgPrefixSym
    } = require_symbols();
    var { isMainThread } = require("worker_threads");
    var transport = require_transport();
    var asJsonChan;
    if (typeof diagChan.tracingChannel === "function") {
      asJsonChan = diagChan.tracingChannel("pino_asJson");
    } else {
      asJsonChan = {
        hasSubscribers: false,
        traceSync(fn, store, thisArg, ...args) {
          return fn.call(thisArg, ...args);
        }
      };
    }
    function noop() {
    }
    function genLog(level, hook) {
      if (!hook) return LOG;
      return function hookWrappedLog(...args) {
        hook.call(this, args, LOG, level);
      };
      function LOG(o, ...n) {
        if (typeof o === "object") {
          let msg = o;
          if (o !== null) {
            if (o.method && o.headers && o.socket) {
              o = mapHttpRequest(o);
            } else if (typeof o.setHeader === "function") {
              o = mapHttpResponse(o);
            }
          }
          let formatParams;
          if (msg === null && n.length === 0) {
            formatParams = [null];
          } else {
            msg = n.shift();
            formatParams = n;
          }
          if (typeof this[msgPrefixSym] === "string" && msg !== void 0 && msg !== null) {
            msg = this[msgPrefixSym] + msg;
          }
          this[writeSym](o, format(msg, formatParams, this[formatOptsSym]), level);
        } else {
          let msg = o === void 0 ? n.shift() : o;
          if (typeof this[msgPrefixSym] === "string" && msg !== void 0 && msg !== null) {
            msg = this[msgPrefixSym] + msg;
          }
          this[writeSym](null, format(msg, n, this[formatOptsSym]), level);
        }
      }
    }
    function asString(str) {
      let result = "";
      let last = 0;
      let found = false;
      let point = 255;
      const l = str.length;
      if (l > 100) {
        return JSON.stringify(str);
      }
      for (var i = 0; i < l && point >= 32; i++) {
        point = str.charCodeAt(i);
        if (point === 34 || point === 92) {
          result += str.slice(last, i) + "\\";
          last = i;
          found = true;
        }
      }
      if (!found) {
        result = str;
      } else {
        result += str.slice(last);
      }
      return point < 32 ? JSON.stringify(str) : '"' + result + '"';
    }
    function asJson(obj, msg, num, time) {
      if (asJsonChan.hasSubscribers === false) {
        return _asJson.call(this, obj, msg, num, time);
      }
      const store = { instance: this, arguments };
      return asJsonChan.traceSync(_asJson, store, this, obj, msg, num, time);
    }
    function _asJson(obj, msg, num, time) {
      const stringify2 = this[stringifySym];
      const stringifySafe = this[stringifySafeSym];
      const stringifiers = this[stringifiersSym];
      const end = this[endSym];
      const chindings = this[chindingsSym];
      const serializers = this[serializersSym];
      const formatters = this[formattersSym];
      const messageKey = this[messageKeySym];
      const errorKey = this[errorKeySym];
      let data = this[lsCacheSym][num] + time;
      data = data + chindings;
      let value;
      if (formatters.log) {
        obj = formatters.log(obj);
      }
      const wildcardStringifier = stringifiers[wildcardFirstSym];
      let propStr = "";
      for (const key in obj) {
        value = obj[key];
        if (Object.prototype.hasOwnProperty.call(obj, key) && value !== void 0) {
          if (serializers[key]) {
            value = serializers[key](value);
          } else if (key === errorKey && serializers.err) {
            value = serializers.err(value);
          }
          const stringifier = stringifiers[key] || wildcardStringifier;
          switch (typeof value) {
            case "undefined":
            case "function":
              continue;
            case "number":
              if (Number.isFinite(value) === false) {
                value = null;
              }
            // this case explicitly falls through to the next one
            case "boolean":
              if (stringifier) value = stringifier(value);
              break;
            case "string":
              value = (stringifier || asString)(value);
              break;
            default:
              value = (stringifier || stringify2)(value, stringifySafe);
          }
          if (value === void 0) continue;
          const strKey = asString(key);
          propStr += "," + strKey + ":" + value;
        }
      }
      let msgStr = "";
      if (msg !== void 0) {
        value = serializers[messageKey] ? serializers[messageKey](msg) : msg;
        const stringifier = stringifiers[messageKey] || wildcardStringifier;
        switch (typeof value) {
          case "function":
            break;
          case "number":
            if (Number.isFinite(value) === false) {
              value = null;
            }
          // this case explicitly falls through to the next one
          case "boolean":
            if (stringifier) value = stringifier(value);
            msgStr = ',"' + messageKey + '":' + value;
            break;
          case "string":
            value = (stringifier || asString)(value);
            msgStr = ',"' + messageKey + '":' + value;
            break;
          default:
            value = (stringifier || stringify2)(value, stringifySafe);
            msgStr = ',"' + messageKey + '":' + value;
        }
      }
      if (this[nestedKeySym] && propStr) {
        return data + this[nestedKeyStrSym] + propStr.slice(1) + "}" + msgStr + end;
      } else {
        return data + propStr + msgStr + end;
      }
    }
    function asChindings(instance, bindings) {
      let value;
      let data = instance[chindingsSym];
      const stringify2 = instance[stringifySym];
      const stringifySafe = instance[stringifySafeSym];
      const stringifiers = instance[stringifiersSym];
      const wildcardStringifier = stringifiers[wildcardFirstSym];
      const serializers = instance[serializersSym];
      const formatter = instance[formattersSym].bindings;
      bindings = formatter(bindings);
      for (const key in bindings) {
        value = bindings[key];
        const valid = (key.length < 5 || key !== "level" && key !== "serializers" && key !== "formatters" && key !== "customLevels") && bindings.hasOwnProperty(key) && value !== void 0;
        if (valid === true) {
          value = serializers[key] ? serializers[key](value) : value;
          value = (stringifiers[key] || wildcardStringifier || stringify2)(value, stringifySafe);
          if (value === void 0) continue;
          data += ',"' + key + '":' + value;
        }
      }
      return data;
    }
    function hasBeenTampered(stream) {
      return stream.write !== stream.constructor.prototype.write;
    }
    function buildSafeSonicBoom(opts) {
      const stream = new SonicBoom(opts);
      stream.on("error", filterBrokenPipe);
      if (!opts.sync && isMainThread) {
        onExit.register(stream, autoEnd);
        stream.on("close", function() {
          onExit.unregister(stream);
        });
      }
      return stream;
      function filterBrokenPipe(err) {
        if (err.code === "EPIPE") {
          stream.write = noop;
          stream.end = noop;
          stream.flushSync = noop;
          stream.destroy = noop;
          return;
        }
        stream.removeListener("error", filterBrokenPipe);
        stream.emit("error", err);
      }
    }
    function autoEnd(stream, eventName) {
      if (stream.destroyed) {
        return;
      }
      if (eventName === "beforeExit") {
        stream.flush();
        stream.on("drain", function() {
          stream.end();
        });
      } else {
        stream.flushSync();
      }
    }
    function createArgsNormalizer(defaultOptions) {
      return function normalizeArgs(instance, caller, opts = {}, stream) {
        if (typeof opts === "string") {
          stream = buildSafeSonicBoom({ dest: opts });
          opts = {};
        } else if (typeof stream === "string") {
          if (opts && opts.transport) {
            throw Error("only one of option.transport or stream can be specified");
          }
          stream = buildSafeSonicBoom({ dest: stream });
        } else if (opts instanceof SonicBoom || opts.writable || opts._writableState) {
          stream = opts;
          opts = {};
        } else if (opts.transport) {
          if (opts.transport instanceof SonicBoom || opts.transport.writable || opts.transport._writableState) {
            throw Error("option.transport do not allow stream, please pass to option directly. e.g. pino(transport)");
          }
          if (opts.transport.targets && opts.transport.targets.length && opts.formatters && typeof opts.formatters.level === "function") {
            throw Error("option.transport.targets do not allow custom level formatters");
          }
          let customLevels;
          if (opts.customLevels) {
            customLevels = opts.useOnlyCustomLevels ? opts.customLevels : Object.assign({}, opts.levels, opts.customLevels);
          }
          stream = transport({ caller, ...opts.transport, levels: customLevels });
        }
        opts = Object.assign({}, defaultOptions, opts);
        opts.serializers = Object.assign({}, defaultOptions.serializers, opts.serializers);
        opts.formatters = Object.assign({}, defaultOptions.formatters, opts.formatters);
        if (opts.prettyPrint) {
          throw new Error("prettyPrint option is no longer supported, see the pino-pretty package (https://github.com/pinojs/pino-pretty)");
        }
        const { enabled, onChild } = opts;
        if (enabled === false) opts.level = "silent";
        if (!onChild) opts.onChild = noop;
        if (!stream) {
          if (!hasBeenTampered(process.stdout)) {
            stream = buildSafeSonicBoom({ fd: process.stdout.fd || 1 });
          } else {
            stream = process.stdout;
          }
        }
        return { opts, stream };
      };
    }
    function stringify(obj, stringifySafeFn) {
      try {
        return JSON.stringify(obj);
      } catch (_) {
        try {
          const stringify2 = stringifySafeFn || this[stringifySafeSym];
          return stringify2(obj);
        } catch (_2) {
          return '"[unable to serialize, circular reference is too complex to analyze]"';
        }
      }
    }
    function buildFormatters(level, bindings, log) {
      return {
        level,
        bindings,
        log
      };
    }
    function normalizeDestFileDescriptor(destination) {
      const fd = Number(destination);
      if (typeof destination === "string" && Number.isFinite(fd)) {
        return fd;
      }
      if (destination === void 0) {
        return 1;
      }
      return destination;
    }
    module2.exports = {
      noop,
      buildSafeSonicBoom,
      asChindings,
      asJson,
      genLog,
      createArgsNormalizer,
      stringify,
      buildFormatters,
      normalizeDestFileDescriptor
    };
  }
});

// ../../node_modules/.pnpm/pino@9.14.0/node_modules/pino/lib/constants.js
var require_constants = __commonJS({
  "../../node_modules/.pnpm/pino@9.14.0/node_modules/pino/lib/constants.js"(exports2, module2) {
    var DEFAULT_LEVELS = {
      trace: 10,
      debug: 20,
      info: 30,
      warn: 40,
      error: 50,
      fatal: 60
    };
    var SORTING_ORDER = {
      ASC: "ASC",
      DESC: "DESC"
    };
    module2.exports = {
      DEFAULT_LEVELS,
      SORTING_ORDER
    };
  }
});

// ../../node_modules/.pnpm/pino@9.14.0/node_modules/pino/lib/levels.js
var require_levels = __commonJS({
  "../../node_modules/.pnpm/pino@9.14.0/node_modules/pino/lib/levels.js"(exports2, module2) {
    "use strict";
    var {
      lsCacheSym,
      levelValSym,
      useOnlyCustomLevelsSym,
      streamSym,
      formattersSym,
      hooksSym,
      levelCompSym
    } = require_symbols();
    var { noop, genLog } = require_tools();
    var { DEFAULT_LEVELS, SORTING_ORDER } = require_constants();
    var levelMethods = {
      fatal: (hook) => {
        const logFatal = genLog(DEFAULT_LEVELS.fatal, hook);
        return function(...args) {
          const stream = this[streamSym];
          logFatal.call(this, ...args);
          if (typeof stream.flushSync === "function") {
            try {
              stream.flushSync();
            } catch (e) {
            }
          }
        };
      },
      error: (hook) => genLog(DEFAULT_LEVELS.error, hook),
      warn: (hook) => genLog(DEFAULT_LEVELS.warn, hook),
      info: (hook) => genLog(DEFAULT_LEVELS.info, hook),
      debug: (hook) => genLog(DEFAULT_LEVELS.debug, hook),
      trace: (hook) => genLog(DEFAULT_LEVELS.trace, hook)
    };
    var nums = Object.keys(DEFAULT_LEVELS).reduce((o, k) => {
      o[DEFAULT_LEVELS[k]] = k;
      return o;
    }, {});
    var initialLsCache = Object.keys(nums).reduce((o, k) => {
      o[k] = '{"level":' + Number(k);
      return o;
    }, {});
    function genLsCache(instance) {
      const formatter = instance[formattersSym].level;
      const { labels } = instance.levels;
      const cache = {};
      for (const label in labels) {
        const level = formatter(labels[label], Number(label));
        cache[label] = JSON.stringify(level).slice(0, -1);
      }
      instance[lsCacheSym] = cache;
      return instance;
    }
    function isStandardLevel(level, useOnlyCustomLevels) {
      if (useOnlyCustomLevels) {
        return false;
      }
      switch (level) {
        case "fatal":
        case "error":
        case "warn":
        case "info":
        case "debug":
        case "trace":
          return true;
        default:
          return false;
      }
    }
    function setLevel(level) {
      const { labels, values } = this.levels;
      if (typeof level === "number") {
        if (labels[level] === void 0) throw Error("unknown level value" + level);
        level = labels[level];
      }
      if (values[level] === void 0) throw Error("unknown level " + level);
      const preLevelVal = this[levelValSym];
      const levelVal = this[levelValSym] = values[level];
      const useOnlyCustomLevelsVal = this[useOnlyCustomLevelsSym];
      const levelComparison = this[levelCompSym];
      const hook = this[hooksSym].logMethod;
      for (const key in values) {
        if (levelComparison(values[key], levelVal) === false) {
          this[key] = noop;
          continue;
        }
        this[key] = isStandardLevel(key, useOnlyCustomLevelsVal) ? levelMethods[key](hook) : genLog(values[key], hook);
      }
      this.emit(
        "level-change",
        level,
        levelVal,
        labels[preLevelVal],
        preLevelVal,
        this
      );
    }
    function getLevel(level) {
      const { levels, levelVal } = this;
      return levels && levels.labels ? levels.labels[levelVal] : "";
    }
    function isLevelEnabled(logLevel) {
      const { values } = this.levels;
      const logLevelVal = values[logLevel];
      return logLevelVal !== void 0 && this[levelCompSym](logLevelVal, this[levelValSym]);
    }
    function compareLevel(direction, current, expected) {
      if (direction === SORTING_ORDER.DESC) {
        return current <= expected;
      }
      return current >= expected;
    }
    function genLevelComparison(levelComparison) {
      if (typeof levelComparison === "string") {
        return compareLevel.bind(null, levelComparison);
      }
      return levelComparison;
    }
    function mappings(customLevels = null, useOnlyCustomLevels = false) {
      const customNums = customLevels ? Object.keys(customLevels).reduce((o, k) => {
        o[customLevels[k]] = k;
        return o;
      }, {}) : null;
      const labels = Object.assign(
        Object.create(Object.prototype, { Infinity: { value: "silent" } }),
        useOnlyCustomLevels ? null : nums,
        customNums
      );
      const values = Object.assign(
        Object.create(Object.prototype, { silent: { value: Infinity } }),
        useOnlyCustomLevels ? null : DEFAULT_LEVELS,
        customLevels
      );
      return { labels, values };
    }
    function assertDefaultLevelFound(defaultLevel, customLevels, useOnlyCustomLevels) {
      if (typeof defaultLevel === "number") {
        const values = [].concat(
          Object.keys(customLevels || {}).map((key) => customLevels[key]),
          useOnlyCustomLevels ? [] : Object.keys(nums).map((level) => +level),
          Infinity
        );
        if (!values.includes(defaultLevel)) {
          throw Error(`default level:${defaultLevel} must be included in custom levels`);
        }
        return;
      }
      const labels = Object.assign(
        Object.create(Object.prototype, { silent: { value: Infinity } }),
        useOnlyCustomLevels ? null : DEFAULT_LEVELS,
        customLevels
      );
      if (!(defaultLevel in labels)) {
        throw Error(`default level:${defaultLevel} must be included in custom levels`);
      }
    }
    function assertNoLevelCollisions(levels, customLevels) {
      const { labels, values } = levels;
      for (const k in customLevels) {
        if (k in values) {
          throw Error("levels cannot be overridden");
        }
        if (customLevels[k] in labels) {
          throw Error("pre-existing level values cannot be used for new levels");
        }
      }
    }
    function assertLevelComparison(levelComparison) {
      if (typeof levelComparison === "function") {
        return;
      }
      if (typeof levelComparison === "string" && Object.values(SORTING_ORDER).includes(levelComparison)) {
        return;
      }
      throw new Error('Levels comparison should be one of "ASC", "DESC" or "function" type');
    }
    module2.exports = {
      initialLsCache,
      genLsCache,
      levelMethods,
      getLevel,
      setLevel,
      isLevelEnabled,
      mappings,
      assertNoLevelCollisions,
      assertDefaultLevelFound,
      genLevelComparison,
      assertLevelComparison
    };
  }
});

// ../../node_modules/.pnpm/pino@9.14.0/node_modules/pino/lib/meta.js
var require_meta = __commonJS({
  "../../node_modules/.pnpm/pino@9.14.0/node_modules/pino/lib/meta.js"(exports2, module2) {
    "use strict";
    module2.exports = { version: "9.14.0" };
  }
});

// ../../node_modules/.pnpm/pino@9.14.0/node_modules/pino/lib/proto.js
var require_proto = __commonJS({
  "../../node_modules/.pnpm/pino@9.14.0/node_modules/pino/lib/proto.js"(exports2, module2) {
    "use strict";
    var { EventEmitter: EventEmitter5 } = require("node:events");
    var {
      lsCacheSym,
      levelValSym,
      setLevelSym,
      getLevelSym,
      chindingsSym,
      parsedChindingsSym,
      mixinSym,
      asJsonSym,
      writeSym,
      mixinMergeStrategySym,
      timeSym,
      timeSliceIndexSym,
      streamSym,
      serializersSym,
      formattersSym,
      errorKeySym,
      messageKeySym,
      useOnlyCustomLevelsSym,
      needsMetadataGsym,
      redactFmtSym,
      stringifySym,
      formatOptsSym,
      stringifiersSym,
      msgPrefixSym,
      hooksSym
    } = require_symbols();
    var {
      getLevel,
      setLevel,
      isLevelEnabled,
      mappings,
      initialLsCache,
      genLsCache,
      assertNoLevelCollisions
    } = require_levels();
    var {
      asChindings,
      asJson,
      buildFormatters,
      stringify,
      noop
    } = require_tools();
    var {
      version
    } = require_meta();
    var redaction = require_redaction();
    var constructor = class Pino {
    };
    var prototype = {
      constructor,
      child,
      bindings,
      setBindings,
      flush,
      isLevelEnabled,
      version,
      get level() {
        return this[getLevelSym]();
      },
      set level(lvl) {
        this[setLevelSym](lvl);
      },
      get levelVal() {
        return this[levelValSym];
      },
      set levelVal(n) {
        throw Error("levelVal is read-only");
      },
      get msgPrefix() {
        return this[msgPrefixSym];
      },
      get [Symbol.toStringTag]() {
        return "Pino";
      },
      [lsCacheSym]: initialLsCache,
      [writeSym]: write,
      [asJsonSym]: asJson,
      [getLevelSym]: getLevel,
      [setLevelSym]: setLevel
    };
    Object.setPrototypeOf(prototype, EventEmitter5.prototype);
    module2.exports = function() {
      return Object.create(prototype);
    };
    var resetChildingsFormatter = (bindings2) => bindings2;
    function child(bindings2, options) {
      if (!bindings2) {
        throw Error("missing bindings for child Pino");
      }
      const serializers = this[serializersSym];
      const formatters = this[formattersSym];
      const instance = Object.create(this);
      if (options == null) {
        if (instance[formattersSym].bindings !== resetChildingsFormatter) {
          instance[formattersSym] = buildFormatters(
            formatters.level,
            resetChildingsFormatter,
            formatters.log
          );
        }
        instance[chindingsSym] = asChindings(instance, bindings2);
        instance[setLevelSym](this.level);
        if (this.onChild !== noop) {
          this.onChild(instance);
        }
        return instance;
      }
      if (options.hasOwnProperty("serializers") === true) {
        instance[serializersSym] = /* @__PURE__ */ Object.create(null);
        for (const k in serializers) {
          instance[serializersSym][k] = serializers[k];
        }
        const parentSymbols = Object.getOwnPropertySymbols(serializers);
        for (var i = 0; i < parentSymbols.length; i++) {
          const ks = parentSymbols[i];
          instance[serializersSym][ks] = serializers[ks];
        }
        for (const bk in options.serializers) {
          instance[serializersSym][bk] = options.serializers[bk];
        }
        const bindingsSymbols = Object.getOwnPropertySymbols(options.serializers);
        for (var bi = 0; bi < bindingsSymbols.length; bi++) {
          const bks = bindingsSymbols[bi];
          instance[serializersSym][bks] = options.serializers[bks];
        }
      } else instance[serializersSym] = serializers;
      if (options.hasOwnProperty("formatters")) {
        const { level, bindings: chindings, log } = options.formatters;
        instance[formattersSym] = buildFormatters(
          level || formatters.level,
          chindings || resetChildingsFormatter,
          log || formatters.log
        );
      } else {
        instance[formattersSym] = buildFormatters(
          formatters.level,
          resetChildingsFormatter,
          formatters.log
        );
      }
      if (options.hasOwnProperty("customLevels") === true) {
        assertNoLevelCollisions(this.levels, options.customLevels);
        instance.levels = mappings(options.customLevels, instance[useOnlyCustomLevelsSym]);
        genLsCache(instance);
      }
      if (typeof options.redact === "object" && options.redact !== null || Array.isArray(options.redact)) {
        instance.redact = options.redact;
        const stringifiers = redaction(instance.redact, stringify);
        const formatOpts = { stringify: stringifiers[redactFmtSym] };
        instance[stringifySym] = stringify;
        instance[stringifiersSym] = stringifiers;
        instance[formatOptsSym] = formatOpts;
      }
      if (typeof options.msgPrefix === "string") {
        instance[msgPrefixSym] = (this[msgPrefixSym] || "") + options.msgPrefix;
      }
      instance[chindingsSym] = asChindings(instance, bindings2);
      const childLevel = options.level || this.level;
      instance[setLevelSym](childLevel);
      this.onChild(instance);
      return instance;
    }
    function bindings() {
      const chindings = this[chindingsSym];
      const chindingsJson = `{${chindings.substr(1)}}`;
      const bindingsFromJson = JSON.parse(chindingsJson);
      delete bindingsFromJson.pid;
      delete bindingsFromJson.hostname;
      return bindingsFromJson;
    }
    function setBindings(newBindings) {
      const chindings = asChindings(this, newBindings);
      this[chindingsSym] = chindings;
      delete this[parsedChindingsSym];
    }
    function defaultMixinMergeStrategy(mergeObject, mixinObject) {
      return Object.assign(mixinObject, mergeObject);
    }
    function write(_obj, msg, num) {
      const t = this[timeSym]();
      const mixin = this[mixinSym];
      const errorKey = this[errorKeySym];
      const messageKey = this[messageKeySym];
      const mixinMergeStrategy = this[mixinMergeStrategySym] || defaultMixinMergeStrategy;
      let obj;
      const streamWriteHook = this[hooksSym].streamWrite;
      if (_obj === void 0 || _obj === null) {
        obj = {};
      } else if (_obj instanceof Error) {
        obj = { [errorKey]: _obj };
        if (msg === void 0) {
          msg = _obj.message;
        }
      } else {
        obj = _obj;
        if (msg === void 0 && _obj[messageKey] === void 0 && _obj[errorKey]) {
          msg = _obj[errorKey].message;
        }
      }
      if (mixin) {
        obj = mixinMergeStrategy(obj, mixin(obj, num, this));
      }
      const s = this[asJsonSym](obj, msg, num, t);
      const stream = this[streamSym];
      if (stream[needsMetadataGsym] === true) {
        stream.lastLevel = num;
        stream.lastObj = obj;
        stream.lastMsg = msg;
        stream.lastTime = t.slice(this[timeSliceIndexSym]);
        stream.lastLogger = this;
      }
      stream.write(streamWriteHook ? streamWriteHook(s) : s);
    }
    function flush(cb) {
      if (cb != null && typeof cb !== "function") {
        throw Error("callback must be a function");
      }
      const stream = this[streamSym];
      if (typeof stream.flush === "function") {
        stream.flush(cb || noop);
      } else if (cb) cb();
    }
  }
});

// ../../node_modules/.pnpm/safe-stable-stringify@2.5.0/node_modules/safe-stable-stringify/index.js
var require_safe_stable_stringify = __commonJS({
  "../../node_modules/.pnpm/safe-stable-stringify@2.5.0/node_modules/safe-stable-stringify/index.js"(exports2, module2) {
    "use strict";
    var { hasOwnProperty } = Object.prototype;
    var stringify = configure();
    stringify.configure = configure;
    stringify.stringify = stringify;
    stringify.default = stringify;
    exports2.stringify = stringify;
    exports2.configure = configure;
    module2.exports = stringify;
    var strEscapeSequencesRegExp = /[\u0000-\u001f\u0022\u005c\ud800-\udfff]/;
    function strEscape(str) {
      if (str.length < 5e3 && !strEscapeSequencesRegExp.test(str)) {
        return `"${str}"`;
      }
      return JSON.stringify(str);
    }
    function sort(array, comparator) {
      if (array.length > 200 || comparator) {
        return array.sort(comparator);
      }
      for (let i = 1; i < array.length; i++) {
        const currentValue = array[i];
        let position = i;
        while (position !== 0 && array[position - 1] > currentValue) {
          array[position] = array[position - 1];
          position--;
        }
        array[position] = currentValue;
      }
      return array;
    }
    var typedArrayPrototypeGetSymbolToStringTag = Object.getOwnPropertyDescriptor(
      Object.getPrototypeOf(
        Object.getPrototypeOf(
          new Int8Array()
        )
      ),
      Symbol.toStringTag
    ).get;
    function isTypedArrayWithEntries(value) {
      return typedArrayPrototypeGetSymbolToStringTag.call(value) !== void 0 && value.length !== 0;
    }
    function stringifyTypedArray(array, separator, maximumBreadth) {
      if (array.length < maximumBreadth) {
        maximumBreadth = array.length;
      }
      const whitespace = separator === "," ? "" : " ";
      let res = `"0":${whitespace}${array[0]}`;
      for (let i = 1; i < maximumBreadth; i++) {
        res += `${separator}"${i}":${whitespace}${array[i]}`;
      }
      return res;
    }
    function getCircularValueOption(options) {
      if (hasOwnProperty.call(options, "circularValue")) {
        const circularValue = options.circularValue;
        if (typeof circularValue === "string") {
          return `"${circularValue}"`;
        }
        if (circularValue == null) {
          return circularValue;
        }
        if (circularValue === Error || circularValue === TypeError) {
          return {
            toString() {
              throw new TypeError("Converting circular structure to JSON");
            }
          };
        }
        throw new TypeError('The "circularValue" argument must be of type string or the value null or undefined');
      }
      return '"[Circular]"';
    }
    function getDeterministicOption(options) {
      let value;
      if (hasOwnProperty.call(options, "deterministic")) {
        value = options.deterministic;
        if (typeof value !== "boolean" && typeof value !== "function") {
          throw new TypeError('The "deterministic" argument must be of type boolean or comparator function');
        }
      }
      return value === void 0 ? true : value;
    }
    function getBooleanOption(options, key) {
      let value;
      if (hasOwnProperty.call(options, key)) {
        value = options[key];
        if (typeof value !== "boolean") {
          throw new TypeError(`The "${key}" argument must be of type boolean`);
        }
      }
      return value === void 0 ? true : value;
    }
    function getPositiveIntegerOption(options, key) {
      let value;
      if (hasOwnProperty.call(options, key)) {
        value = options[key];
        if (typeof value !== "number") {
          throw new TypeError(`The "${key}" argument must be of type number`);
        }
        if (!Number.isInteger(value)) {
          throw new TypeError(`The "${key}" argument must be an integer`);
        }
        if (value < 1) {
          throw new RangeError(`The "${key}" argument must be >= 1`);
        }
      }
      return value === void 0 ? Infinity : value;
    }
    function getItemCount(number) {
      if (number === 1) {
        return "1 item";
      }
      return `${number} items`;
    }
    function getUniqueReplacerSet(replacerArray) {
      const replacerSet = /* @__PURE__ */ new Set();
      for (const value of replacerArray) {
        if (typeof value === "string" || typeof value === "number") {
          replacerSet.add(String(value));
        }
      }
      return replacerSet;
    }
    function getStrictOption(options) {
      if (hasOwnProperty.call(options, "strict")) {
        const value = options.strict;
        if (typeof value !== "boolean") {
          throw new TypeError('The "strict" argument must be of type boolean');
        }
        if (value) {
          return (value2) => {
            let message = `Object can not safely be stringified. Received type ${typeof value2}`;
            if (typeof value2 !== "function") message += ` (${value2.toString()})`;
            throw new Error(message);
          };
        }
      }
    }
    function configure(options) {
      options = { ...options };
      const fail = getStrictOption(options);
      if (fail) {
        if (options.bigint === void 0) {
          options.bigint = false;
        }
        if (!("circularValue" in options)) {
          options.circularValue = Error;
        }
      }
      const circularValue = getCircularValueOption(options);
      const bigint = getBooleanOption(options, "bigint");
      const deterministic = getDeterministicOption(options);
      const comparator = typeof deterministic === "function" ? deterministic : void 0;
      const maximumDepth = getPositiveIntegerOption(options, "maximumDepth");
      const maximumBreadth = getPositiveIntegerOption(options, "maximumBreadth");
      function stringifyFnReplacer(key, parent, stack, replacer, spacer, indentation) {
        let value = parent[key];
        if (typeof value === "object" && value !== null && typeof value.toJSON === "function") {
          value = value.toJSON(key);
        }
        value = replacer.call(parent, key, value);
        switch (typeof value) {
          case "string":
            return strEscape(value);
          case "object": {
            if (value === null) {
              return "null";
            }
            if (stack.indexOf(value) !== -1) {
              return circularValue;
            }
            let res = "";
            let join = ",";
            const originalIndentation = indentation;
            if (Array.isArray(value)) {
              if (value.length === 0) {
                return "[]";
              }
              if (maximumDepth < stack.length + 1) {
                return '"[Array]"';
              }
              stack.push(value);
              if (spacer !== "") {
                indentation += spacer;
                res += `
${indentation}`;
                join = `,
${indentation}`;
              }
              const maximumValuesToStringify = Math.min(value.length, maximumBreadth);
              let i = 0;
              for (; i < maximumValuesToStringify - 1; i++) {
                const tmp2 = stringifyFnReplacer(String(i), value, stack, replacer, spacer, indentation);
                res += tmp2 !== void 0 ? tmp2 : "null";
                res += join;
              }
              const tmp = stringifyFnReplacer(String(i), value, stack, replacer, spacer, indentation);
              res += tmp !== void 0 ? tmp : "null";
              if (value.length - 1 > maximumBreadth) {
                const removedKeys = value.length - maximumBreadth - 1;
                res += `${join}"... ${getItemCount(removedKeys)} not stringified"`;
              }
              if (spacer !== "") {
                res += `
${originalIndentation}`;
              }
              stack.pop();
              return `[${res}]`;
            }
            let keys = Object.keys(value);
            const keyLength = keys.length;
            if (keyLength === 0) {
              return "{}";
            }
            if (maximumDepth < stack.length + 1) {
              return '"[Object]"';
            }
            let whitespace = "";
            let separator = "";
            if (spacer !== "") {
              indentation += spacer;
              join = `,
${indentation}`;
              whitespace = " ";
            }
            const maximumPropertiesToStringify = Math.min(keyLength, maximumBreadth);
            if (deterministic && !isTypedArrayWithEntries(value)) {
              keys = sort(keys, comparator);
            }
            stack.push(value);
            for (let i = 0; i < maximumPropertiesToStringify; i++) {
              const key2 = keys[i];
              const tmp = stringifyFnReplacer(key2, value, stack, replacer, spacer, indentation);
              if (tmp !== void 0) {
                res += `${separator}${strEscape(key2)}:${whitespace}${tmp}`;
                separator = join;
              }
            }
            if (keyLength > maximumBreadth) {
              const removedKeys = keyLength - maximumBreadth;
              res += `${separator}"...":${whitespace}"${getItemCount(removedKeys)} not stringified"`;
              separator = join;
            }
            if (spacer !== "" && separator.length > 1) {
              res = `
${indentation}${res}
${originalIndentation}`;
            }
            stack.pop();
            return `{${res}}`;
          }
          case "number":
            return isFinite(value) ? String(value) : fail ? fail(value) : "null";
          case "boolean":
            return value === true ? "true" : "false";
          case "undefined":
            return void 0;
          case "bigint":
            if (bigint) {
              return String(value);
            }
          // fallthrough
          default:
            return fail ? fail(value) : void 0;
        }
      }
      function stringifyArrayReplacer(key, value, stack, replacer, spacer, indentation) {
        if (typeof value === "object" && value !== null && typeof value.toJSON === "function") {
          value = value.toJSON(key);
        }
        switch (typeof value) {
          case "string":
            return strEscape(value);
          case "object": {
            if (value === null) {
              return "null";
            }
            if (stack.indexOf(value) !== -1) {
              return circularValue;
            }
            const originalIndentation = indentation;
            let res = "";
            let join = ",";
            if (Array.isArray(value)) {
              if (value.length === 0) {
                return "[]";
              }
              if (maximumDepth < stack.length + 1) {
                return '"[Array]"';
              }
              stack.push(value);
              if (spacer !== "") {
                indentation += spacer;
                res += `
${indentation}`;
                join = `,
${indentation}`;
              }
              const maximumValuesToStringify = Math.min(value.length, maximumBreadth);
              let i = 0;
              for (; i < maximumValuesToStringify - 1; i++) {
                const tmp2 = stringifyArrayReplacer(String(i), value[i], stack, replacer, spacer, indentation);
                res += tmp2 !== void 0 ? tmp2 : "null";
                res += join;
              }
              const tmp = stringifyArrayReplacer(String(i), value[i], stack, replacer, spacer, indentation);
              res += tmp !== void 0 ? tmp : "null";
              if (value.length - 1 > maximumBreadth) {
                const removedKeys = value.length - maximumBreadth - 1;
                res += `${join}"... ${getItemCount(removedKeys)} not stringified"`;
              }
              if (spacer !== "") {
                res += `
${originalIndentation}`;
              }
              stack.pop();
              return `[${res}]`;
            }
            stack.push(value);
            let whitespace = "";
            if (spacer !== "") {
              indentation += spacer;
              join = `,
${indentation}`;
              whitespace = " ";
            }
            let separator = "";
            for (const key2 of replacer) {
              const tmp = stringifyArrayReplacer(key2, value[key2], stack, replacer, spacer, indentation);
              if (tmp !== void 0) {
                res += `${separator}${strEscape(key2)}:${whitespace}${tmp}`;
                separator = join;
              }
            }
            if (spacer !== "" && separator.length > 1) {
              res = `
${indentation}${res}
${originalIndentation}`;
            }
            stack.pop();
            return `{${res}}`;
          }
          case "number":
            return isFinite(value) ? String(value) : fail ? fail(value) : "null";
          case "boolean":
            return value === true ? "true" : "false";
          case "undefined":
            return void 0;
          case "bigint":
            if (bigint) {
              return String(value);
            }
          // fallthrough
          default:
            return fail ? fail(value) : void 0;
        }
      }
      function stringifyIndent(key, value, stack, spacer, indentation) {
        switch (typeof value) {
          case "string":
            return strEscape(value);
          case "object": {
            if (value === null) {
              return "null";
            }
            if (typeof value.toJSON === "function") {
              value = value.toJSON(key);
              if (typeof value !== "object") {
                return stringifyIndent(key, value, stack, spacer, indentation);
              }
              if (value === null) {
                return "null";
              }
            }
            if (stack.indexOf(value) !== -1) {
              return circularValue;
            }
            const originalIndentation = indentation;
            if (Array.isArray(value)) {
              if (value.length === 0) {
                return "[]";
              }
              if (maximumDepth < stack.length + 1) {
                return '"[Array]"';
              }
              stack.push(value);
              indentation += spacer;
              let res2 = `
${indentation}`;
              const join2 = `,
${indentation}`;
              const maximumValuesToStringify = Math.min(value.length, maximumBreadth);
              let i = 0;
              for (; i < maximumValuesToStringify - 1; i++) {
                const tmp2 = stringifyIndent(String(i), value[i], stack, spacer, indentation);
                res2 += tmp2 !== void 0 ? tmp2 : "null";
                res2 += join2;
              }
              const tmp = stringifyIndent(String(i), value[i], stack, spacer, indentation);
              res2 += tmp !== void 0 ? tmp : "null";
              if (value.length - 1 > maximumBreadth) {
                const removedKeys = value.length - maximumBreadth - 1;
                res2 += `${join2}"... ${getItemCount(removedKeys)} not stringified"`;
              }
              res2 += `
${originalIndentation}`;
              stack.pop();
              return `[${res2}]`;
            }
            let keys = Object.keys(value);
            const keyLength = keys.length;
            if (keyLength === 0) {
              return "{}";
            }
            if (maximumDepth < stack.length + 1) {
              return '"[Object]"';
            }
            indentation += spacer;
            const join = `,
${indentation}`;
            let res = "";
            let separator = "";
            let maximumPropertiesToStringify = Math.min(keyLength, maximumBreadth);
            if (isTypedArrayWithEntries(value)) {
              res += stringifyTypedArray(value, join, maximumBreadth);
              keys = keys.slice(value.length);
              maximumPropertiesToStringify -= value.length;
              separator = join;
            }
            if (deterministic) {
              keys = sort(keys, comparator);
            }
            stack.push(value);
            for (let i = 0; i < maximumPropertiesToStringify; i++) {
              const key2 = keys[i];
              const tmp = stringifyIndent(key2, value[key2], stack, spacer, indentation);
              if (tmp !== void 0) {
                res += `${separator}${strEscape(key2)}: ${tmp}`;
                separator = join;
              }
            }
            if (keyLength > maximumBreadth) {
              const removedKeys = keyLength - maximumBreadth;
              res += `${separator}"...": "${getItemCount(removedKeys)} not stringified"`;
              separator = join;
            }
            if (separator !== "") {
              res = `
${indentation}${res}
${originalIndentation}`;
            }
            stack.pop();
            return `{${res}}`;
          }
          case "number":
            return isFinite(value) ? String(value) : fail ? fail(value) : "null";
          case "boolean":
            return value === true ? "true" : "false";
          case "undefined":
            return void 0;
          case "bigint":
            if (bigint) {
              return String(value);
            }
          // fallthrough
          default:
            return fail ? fail(value) : void 0;
        }
      }
      function stringifySimple(key, value, stack) {
        switch (typeof value) {
          case "string":
            return strEscape(value);
          case "object": {
            if (value === null) {
              return "null";
            }
            if (typeof value.toJSON === "function") {
              value = value.toJSON(key);
              if (typeof value !== "object") {
                return stringifySimple(key, value, stack);
              }
              if (value === null) {
                return "null";
              }
            }
            if (stack.indexOf(value) !== -1) {
              return circularValue;
            }
            let res = "";
            const hasLength = value.length !== void 0;
            if (hasLength && Array.isArray(value)) {
              if (value.length === 0) {
                return "[]";
              }
              if (maximumDepth < stack.length + 1) {
                return '"[Array]"';
              }
              stack.push(value);
              const maximumValuesToStringify = Math.min(value.length, maximumBreadth);
              let i = 0;
              for (; i < maximumValuesToStringify - 1; i++) {
                const tmp2 = stringifySimple(String(i), value[i], stack);
                res += tmp2 !== void 0 ? tmp2 : "null";
                res += ",";
              }
              const tmp = stringifySimple(String(i), value[i], stack);
              res += tmp !== void 0 ? tmp : "null";
              if (value.length - 1 > maximumBreadth) {
                const removedKeys = value.length - maximumBreadth - 1;
                res += `,"... ${getItemCount(removedKeys)} not stringified"`;
              }
              stack.pop();
              return `[${res}]`;
            }
            let keys = Object.keys(value);
            const keyLength = keys.length;
            if (keyLength === 0) {
              return "{}";
            }
            if (maximumDepth < stack.length + 1) {
              return '"[Object]"';
            }
            let separator = "";
            let maximumPropertiesToStringify = Math.min(keyLength, maximumBreadth);
            if (hasLength && isTypedArrayWithEntries(value)) {
              res += stringifyTypedArray(value, ",", maximumBreadth);
              keys = keys.slice(value.length);
              maximumPropertiesToStringify -= value.length;
              separator = ",";
            }
            if (deterministic) {
              keys = sort(keys, comparator);
            }
            stack.push(value);
            for (let i = 0; i < maximumPropertiesToStringify; i++) {
              const key2 = keys[i];
              const tmp = stringifySimple(key2, value[key2], stack);
              if (tmp !== void 0) {
                res += `${separator}${strEscape(key2)}:${tmp}`;
                separator = ",";
              }
            }
            if (keyLength > maximumBreadth) {
              const removedKeys = keyLength - maximumBreadth;
              res += `${separator}"...":"${getItemCount(removedKeys)} not stringified"`;
            }
            stack.pop();
            return `{${res}}`;
          }
          case "number":
            return isFinite(value) ? String(value) : fail ? fail(value) : "null";
          case "boolean":
            return value === true ? "true" : "false";
          case "undefined":
            return void 0;
          case "bigint":
            if (bigint) {
              return String(value);
            }
          // fallthrough
          default:
            return fail ? fail(value) : void 0;
        }
      }
      function stringify2(value, replacer, space) {
        if (arguments.length > 1) {
          let spacer = "";
          if (typeof space === "number") {
            spacer = " ".repeat(Math.min(space, 10));
          } else if (typeof space === "string") {
            spacer = space.slice(0, 10);
          }
          if (replacer != null) {
            if (typeof replacer === "function") {
              return stringifyFnReplacer("", { "": value }, [], replacer, spacer, "");
            }
            if (Array.isArray(replacer)) {
              return stringifyArrayReplacer("", value, [], getUniqueReplacerSet(replacer), spacer, "");
            }
          }
          if (spacer.length !== 0) {
            return stringifyIndent("", value, [], spacer, "");
          }
        }
        return stringifySimple("", value, []);
      }
      return stringify2;
    }
  }
});

// ../../node_modules/.pnpm/pino@9.14.0/node_modules/pino/lib/multistream.js
var require_multistream = __commonJS({
  "../../node_modules/.pnpm/pino@9.14.0/node_modules/pino/lib/multistream.js"(exports2, module2) {
    "use strict";
    var metadata = /* @__PURE__ */ Symbol.for("pino.metadata");
    var { DEFAULT_LEVELS } = require_constants();
    var DEFAULT_INFO_LEVEL = DEFAULT_LEVELS.info;
    function multistream(streamsArray, opts) {
      streamsArray = streamsArray || [];
      opts = opts || { dedupe: false };
      const streamLevels = Object.create(DEFAULT_LEVELS);
      streamLevels.silent = Infinity;
      if (opts.levels && typeof opts.levels === "object") {
        Object.keys(opts.levels).forEach((i) => {
          streamLevels[i] = opts.levels[i];
        });
      }
      const res = {
        write,
        add,
        remove,
        emit,
        flushSync,
        end,
        minLevel: 0,
        lastId: 0,
        streams: [],
        clone,
        [metadata]: true,
        streamLevels
      };
      if (Array.isArray(streamsArray)) {
        streamsArray.forEach(add, res);
      } else {
        add.call(res, streamsArray);
      }
      streamsArray = null;
      return res;
      function write(data) {
        let dest;
        const level = this.lastLevel;
        const { streams } = this;
        let recordedLevel = 0;
        let stream;
        for (let i = initLoopVar(streams.length, opts.dedupe); checkLoopVar(i, streams.length, opts.dedupe); i = adjustLoopVar(i, opts.dedupe)) {
          dest = streams[i];
          if (dest.level <= level) {
            if (recordedLevel !== 0 && recordedLevel !== dest.level) {
              break;
            }
            stream = dest.stream;
            if (stream[metadata]) {
              const { lastTime, lastMsg, lastObj, lastLogger } = this;
              stream.lastLevel = level;
              stream.lastTime = lastTime;
              stream.lastMsg = lastMsg;
              stream.lastObj = lastObj;
              stream.lastLogger = lastLogger;
            }
            stream.write(data);
            if (opts.dedupe) {
              recordedLevel = dest.level;
            }
          } else if (!opts.dedupe) {
            break;
          }
        }
      }
      function emit(...args) {
        for (const { stream } of this.streams) {
          if (typeof stream.emit === "function") {
            stream.emit(...args);
          }
        }
      }
      function flushSync() {
        for (const { stream } of this.streams) {
          if (typeof stream.flushSync === "function") {
            stream.flushSync();
          }
        }
      }
      function add(dest) {
        if (!dest) {
          return res;
        }
        const isStream = typeof dest.write === "function" || dest.stream;
        const stream_ = dest.write ? dest : dest.stream;
        if (!isStream) {
          throw Error("stream object needs to implement either StreamEntry or DestinationStream interface");
        }
        const { streams, streamLevels: streamLevels2 } = this;
        let level;
        if (typeof dest.levelVal === "number") {
          level = dest.levelVal;
        } else if (typeof dest.level === "string") {
          level = streamLevels2[dest.level];
        } else if (typeof dest.level === "number") {
          level = dest.level;
        } else {
          level = DEFAULT_INFO_LEVEL;
        }
        const dest_ = {
          stream: stream_,
          level,
          levelVal: void 0,
          id: ++res.lastId
        };
        streams.unshift(dest_);
        streams.sort(compareByLevel);
        this.minLevel = streams[0].level;
        return res;
      }
      function remove(id) {
        const { streams } = this;
        const index = streams.findIndex((s) => s.id === id);
        if (index >= 0) {
          streams.splice(index, 1);
          streams.sort(compareByLevel);
          this.minLevel = streams.length > 0 ? streams[0].level : -1;
        }
        return res;
      }
      function end() {
        for (const { stream } of this.streams) {
          if (typeof stream.flushSync === "function") {
            stream.flushSync();
          }
          stream.end();
        }
      }
      function clone(level) {
        const streams = new Array(this.streams.length);
        for (let i = 0; i < streams.length; i++) {
          streams[i] = {
            level,
            stream: this.streams[i].stream
          };
        }
        return {
          write,
          add,
          remove,
          minLevel: level,
          streams,
          clone,
          emit,
          flushSync,
          [metadata]: true
        };
      }
    }
    function compareByLevel(a, b) {
      return a.level - b.level;
    }
    function initLoopVar(length, dedupe) {
      return dedupe ? length - 1 : 0;
    }
    function adjustLoopVar(i, dedupe) {
      return dedupe ? i - 1 : i + 1;
    }
    function checkLoopVar(i, length, dedupe) {
      return dedupe ? i >= 0 : i < length;
    }
    module2.exports = multistream;
  }
});

// ../../node_modules/.pnpm/pino@9.14.0/node_modules/pino/pino.js
var require_pino = __commonJS({
  "../../node_modules/.pnpm/pino@9.14.0/node_modules/pino/pino.js"(exports2, module2) {
    "use strict";
    var os2 = require("node:os");
    var stdSerializers = require_pino_std_serializers();
    var caller = require_caller();
    var redaction = require_redaction();
    var time = require_time();
    var proto = require_proto();
    var symbols = require_symbols();
    var { configure } = require_safe_stable_stringify();
    var { assertDefaultLevelFound, mappings, genLsCache, genLevelComparison, assertLevelComparison } = require_levels();
    var { DEFAULT_LEVELS, SORTING_ORDER } = require_constants();
    var {
      createArgsNormalizer,
      asChindings,
      buildSafeSonicBoom,
      buildFormatters,
      stringify,
      normalizeDestFileDescriptor,
      noop
    } = require_tools();
    var { version } = require_meta();
    var {
      chindingsSym,
      redactFmtSym,
      serializersSym,
      timeSym,
      timeSliceIndexSym,
      streamSym,
      stringifySym,
      stringifySafeSym,
      stringifiersSym,
      setLevelSym,
      endSym,
      formatOptsSym,
      messageKeySym,
      errorKeySym,
      nestedKeySym,
      mixinSym,
      levelCompSym,
      useOnlyCustomLevelsSym,
      formattersSym,
      hooksSym,
      nestedKeyStrSym,
      mixinMergeStrategySym,
      msgPrefixSym
    } = symbols;
    var { epochTime, nullTime } = time;
    var { pid } = process;
    var hostname = os2.hostname();
    var defaultErrorSerializer = stdSerializers.err;
    var defaultOptions = {
      level: "info",
      levelComparison: SORTING_ORDER.ASC,
      levels: DEFAULT_LEVELS,
      messageKey: "msg",
      errorKey: "err",
      nestedKey: null,
      enabled: true,
      base: { pid, hostname },
      serializers: Object.assign(/* @__PURE__ */ Object.create(null), {
        err: defaultErrorSerializer
      }),
      formatters: Object.assign(/* @__PURE__ */ Object.create(null), {
        bindings(bindings) {
          return bindings;
        },
        level(label, number) {
          return { level: number };
        }
      }),
      hooks: {
        logMethod: void 0,
        streamWrite: void 0
      },
      timestamp: epochTime,
      name: void 0,
      redact: null,
      customLevels: null,
      useOnlyCustomLevels: false,
      depthLimit: 5,
      edgeLimit: 100
    };
    var normalize = createArgsNormalizer(defaultOptions);
    var serializers = Object.assign(/* @__PURE__ */ Object.create(null), stdSerializers);
    function pino2(...args) {
      const instance = {};
      const { opts, stream } = normalize(instance, caller(), ...args);
      if (opts.level && typeof opts.level === "string" && DEFAULT_LEVELS[opts.level.toLowerCase()] !== void 0) opts.level = opts.level.toLowerCase();
      const {
        redact,
        crlf,
        serializers: serializers2,
        timestamp,
        messageKey,
        errorKey,
        nestedKey,
        base,
        name,
        level,
        customLevels,
        levelComparison,
        mixin,
        mixinMergeStrategy,
        useOnlyCustomLevels,
        formatters,
        hooks,
        depthLimit,
        edgeLimit,
        onChild,
        msgPrefix
      } = opts;
      const stringifySafe = configure({
        maximumDepth: depthLimit,
        maximumBreadth: edgeLimit
      });
      const allFormatters = buildFormatters(
        formatters.level,
        formatters.bindings,
        formatters.log
      );
      const stringifyFn = stringify.bind({
        [stringifySafeSym]: stringifySafe
      });
      const stringifiers = redact ? redaction(redact, stringifyFn) : {};
      const formatOpts = redact ? { stringify: stringifiers[redactFmtSym] } : { stringify: stringifyFn };
      const end = "}" + (crlf ? "\r\n" : "\n");
      const coreChindings = asChindings.bind(null, {
        [chindingsSym]: "",
        [serializersSym]: serializers2,
        [stringifiersSym]: stringifiers,
        [stringifySym]: stringify,
        [stringifySafeSym]: stringifySafe,
        [formattersSym]: allFormatters
      });
      let chindings = "";
      if (base !== null) {
        if (name === void 0) {
          chindings = coreChindings(base);
        } else {
          chindings = coreChindings(Object.assign({}, base, { name }));
        }
      }
      const time2 = timestamp instanceof Function ? timestamp : timestamp ? epochTime : nullTime;
      const timeSliceIndex = time2().indexOf(":") + 1;
      if (useOnlyCustomLevels && !customLevels) throw Error("customLevels is required if useOnlyCustomLevels is set true");
      if (mixin && typeof mixin !== "function") throw Error(`Unknown mixin type "${typeof mixin}" - expected "function"`);
      if (msgPrefix && typeof msgPrefix !== "string") throw Error(`Unknown msgPrefix type "${typeof msgPrefix}" - expected "string"`);
      assertDefaultLevelFound(level, customLevels, useOnlyCustomLevels);
      const levels = mappings(customLevels, useOnlyCustomLevels);
      if (typeof stream.emit === "function") {
        stream.emit("message", { code: "PINO_CONFIG", config: { levels, messageKey, errorKey } });
      }
      assertLevelComparison(levelComparison);
      const levelCompFunc = genLevelComparison(levelComparison);
      Object.assign(instance, {
        levels,
        [levelCompSym]: levelCompFunc,
        [useOnlyCustomLevelsSym]: useOnlyCustomLevels,
        [streamSym]: stream,
        [timeSym]: time2,
        [timeSliceIndexSym]: timeSliceIndex,
        [stringifySym]: stringify,
        [stringifySafeSym]: stringifySafe,
        [stringifiersSym]: stringifiers,
        [endSym]: end,
        [formatOptsSym]: formatOpts,
        [messageKeySym]: messageKey,
        [errorKeySym]: errorKey,
        [nestedKeySym]: nestedKey,
        // protect against injection
        [nestedKeyStrSym]: nestedKey ? `,${JSON.stringify(nestedKey)}:{` : "",
        [serializersSym]: serializers2,
        [mixinSym]: mixin,
        [mixinMergeStrategySym]: mixinMergeStrategy,
        [chindingsSym]: chindings,
        [formattersSym]: allFormatters,
        [hooksSym]: hooks,
        silent: noop,
        onChild,
        [msgPrefixSym]: msgPrefix
      });
      Object.setPrototypeOf(instance, proto());
      genLsCache(instance);
      instance[setLevelSym](level);
      return instance;
    }
    module2.exports = pino2;
    module2.exports.destination = (dest = process.stdout.fd) => {
      if (typeof dest === "object") {
        dest.dest = normalizeDestFileDescriptor(dest.dest || process.stdout.fd);
        return buildSafeSonicBoom(dest);
      } else {
        return buildSafeSonicBoom({ dest: normalizeDestFileDescriptor(dest), minLength: 0 });
      }
    };
    module2.exports.transport = require_transport();
    module2.exports.multistream = require_multistream();
    module2.exports.levels = mappings();
    module2.exports.stdSerializers = serializers;
    module2.exports.stdTimeFunctions = Object.assign({}, time);
    module2.exports.symbols = symbols;
    module2.exports.version = version;
    module2.exports.default = pino2;
    module2.exports.pino = pino2;
  }
});

// ../../packages/ai-engine/dist/llm-agent.js
var DEFAULT_CONFIG, SYSTEM_PROMPTS, LLMAgent;
var init_llm_agent = __esm({
  "../../packages/ai-engine/dist/llm-agent.js"() {
    "use strict";
    DEFAULT_CONFIG = {
      modelPath: "",
      contextSize: 2048,
      temperature: 0.7,
      topP: 0.9,
      maxTokens: 150,
      seed: 42
    };
    SYSTEM_PROMPTS = {
      es: `Sos un ingeniero de carreras experto con 15+ a\xF1os de experiencia en automovilismo profesional.
Ten\xE9s conocimiento profundo de din\xE1mica vehicular, manejo de neum\xE1ticos y estrategia de carrera.

Tu estilo de comunicaci\xF3n:
- Directo y accionable
- Us\xE1s terminolog\xEDa de carreras naturalmente
- Habl\xE1s como un ingeniero argentino (us\xE1s "vos", "che", "est\xE1s", etc.)
- Das consejos espec\xEDficos y medibles
- Referenci\xE1s curvas, sectores y tiempos exactos

Al analizar telemetr\xEDa:
1. Identific\xE1 patrones a lo largo de vueltas, no incidentes aislados
2. Prioriz\xE1 problemas cr\xEDticos de seguridad (fallas de frenos, desgaste de neum\xE1ticos)
3. Suger\xED cambios de setup cuando los patrones indican problemas del auto
4. Celebr\xE1 las mejoras y r\xE9cords personales

Nunca:
- Des consejos vagos como "manej\xE1 m\xE1s r\xE1pido" o "fren\xE1 m\xE1s tarde"
- Abrumes al piloto con info en plena curva
- Te contradigas vuelta tras vuelta
- Ignores el contexto (ahorro de combustible, estrategias de neum\xE1ticos)

S\xE9 breve: m\xE1ximo 2 oraciones por respuesta.`,
      en: `You are an expert motorsport race engineer with 15+ years of experience in professional racing.
You have deep knowledge of vehicle dynamics, tire management, and racecraft.

Your communication style:
- Direct and actionable
- Uses racing terminology naturally
- Speaks like a professional engineer
- Provides specific, measurable advice
- References exact corners, sectors, and timing

When analyzing telemetry:
1. Identify patterns across laps, not single incidents
2. Prioritize safety-critical issues (brake failures, tire wear)
3. Suggest setup changes when patterns indicate car issues
4. Celebrate improvements and personal bests

Never:
- Give vague advice like "drive faster" or "brake later"
- Overwhelm the driver with info mid-corner
- Contradict yourself lap-to-lap
- Ignore context (fuel saving, tire management strategies)

Be concise: maximum 2 sentences per response.`,
      pt: `Voc\xEA \xE9 um engenheiro de corridas especialista com mais de 15 anos de experi\xEAncia em corridas profissionais.
Voc\xEA tem conhecimento profundo de din\xE2mica veicular, gerenciamento de pneus e estrat\xE9gia de corrida.

Seu estilo de comunica\xE7\xE3o:
- Direto e acion\xE1vel
- Usa terminologia de corridas naturalmente
- Fala como um engenheiro profissional
- Fornece conselhos espec\xEDficos e mensur\xE1veis
- Referencia curvas, setores e tempos exatos

Ao analisar telemetria:
1. Identifique padr\xF5es ao longo das voltas, n\xE3o incidentes isolados
2. Priorize problemas cr\xEDticos de seguran\xE7a (falhas de freio, desgaste de pneus)
3. Sugira mudan\xE7as de setup quando padr\xF5es indicam problemas do carro
4. Celebre melhorias e recordes pessoais

Nunca:
- D\xEA conselhos vagos como "dirija mais r\xE1pido" ou " freie mais tarde"
- Sobrecarregue o piloto com informa\xE7\xF5es no meio da curva
- Se contradiga volta ap\xF3s volta
- Ignore o contexto (economia de combust\xEDvel, estrat\xE9gias de pneus)

Seja conciso: m\xE1ximo 2 frases por resposta.`,
      fr: `Vous \xEAtes un ing\xE9nieur de course expert avec plus de 15 ans d'exp\xE9rience en course professionnelle.
Vous avez une connaissance approfondie de la dynamique du v\xE9hicule, de la gestion des pneus et de la strat\xE9gie de course.

Votre style de communication:
- Direct et actionnable
- Utilise la terminologie de course naturellement
- Parle comme un ing\xE9nieur professionnel
- Fournit des conseils sp\xE9cifiques et mesurables
- R\xE9f\xE9rence des virages, secteurs et chronom\xE9trage exacts

Lors de l'analyse de la t\xE9l\xE9m\xE9trie:
1. Identifiez les mod\xE8les sur les tours, pas les incidents isol\xE9s
2. Priorisez les probl\xE8mes critiques de s\xE9curit\xE9 (d\xE9faillances de frein, usure des pneus)
3. Sugg\xE9rez des changements de r\xE9glage lorsque les mod\xE8les indiquent des probl\xE8mes de voiture
4. C\xE9l\xE9brez les am\xE9liorations et les records personnels

Jamais:
- Donnez des conseils vagues comme "conduisez plus vite" ou "freinez plus tard"
- Submergez le pilote d'informations en plein virage
- Vous contredisez tour apr\xE8s tour
- Ignorez le contexte (\xE9conomie de carburant, strat\xE9gies de pneus)

Soyez concis: maximum 2 phrases par r\xE9ponse.`,
      it: `Sei un ingegnere di gara esperto con oltre 15 anni di esperienza nelle corse professionistiche.
Hai una profonda conoscenza della dinamica del veicolo, della gestione degli pneumatici e della strategia di gara.

Il tuo stile di comunicazione:
- Diretto e attuabile
- Usa terminologia da corsa naturalmente
- Parla come un ingegnere professionista
- Fornisce consigli specifici e misurabili
- Fa riferimento a curve, settori e tempi esatti

Quando analizzi la telemetria:
1. Identifica i pattern attraverso i giri, non incidenti singoli
2. Dai priorit\xE0 a problemi critici per la sicurezza (guasti ai freni, usura pneumatici)
3. Suggerisci modifiche al setup quando i pattern indicano problemi della vettura
4. Celebra i miglioramenti e i record personali

Mai:
- Dare consigli vaghi come "guida pi\xF9 veloce" o "frena pi\xF9 tardi"
- Sopraffare il pilota con informazioni a met\xE0 curva
- Contraddirtilap dopo lap
- Ignorare il contesto (risparmio carburante, strategie pneumatici)

Sii conciso: massimo 2 frasi per risposta.`
    };
    LLMAgent = class {
      model = null;
      context = null;
      session = null;
      config;
      language = "es";
      llamaCppAvailable = false;
      LlamaModel = null;
      LlamaContext = null;
      LlamaChatSession = null;
      constructor(config2 = {}) {
        this.config = { ...DEFAULT_CONFIG, ...config2 };
      }
      /**
       * Load the model
       */
      async load(modelPath) {
        const path8 = modelPath || this.config.modelPath;
        if (!path8) {
          throw new Error("Model path not specified");
        }
        console.log(`[LLMAgent] Loading model from ${path8}...`);
        try {
          const llamaCpp = await import("node-llama-cpp");
          this.LlamaModel = llamaCpp.LlamaModel;
          this.LlamaContext = llamaCpp.LlamaContext;
          this.LlamaChatSession = llamaCpp.LlamaChatSession;
          this.llamaCppAvailable = true;
          this.model = new this.LlamaModel({ modelPath: path8 });
          this.context = new this.LlamaContext({ model: this.model });
          console.log("[LLMAgent] Model loaded successfully");
        } catch (error) {
          console.warn("[LLMAgent] node-llama-cpp not available or failed to load. LLM features will be disabled.");
          console.warn("[LLMAgent] Error:", error);
          this.llamaCppAvailable = false;
        }
      }
      /**
       * Set language for prompts
       */
      setLanguage(language) {
        this.language = language;
        this.session = null;
      }
      /**
       * Get or create chat session
       */
      getSession() {
        if (!this.llamaCppAvailable) {
          throw new Error("node-llama-cpp not available. Cannot create chat session.");
        }
        if (!this.context) {
          throw new Error("Model not loaded. Call load() first.");
        }
        if (!this.session) {
          this.session = new this.LlamaChatSession({
            contextSequence: this.context.getSequence(),
            systemPrompt: SYSTEM_PROMPTS[this.language]
          });
        }
        return this.session;
      }
      /**
       * Build dynamic prompt from context
       */
      buildPrompt(context, userQuestion) {
        const glossary = { iracing: {}, acc: {}, rf2: {}, ac: {} }[context.simName.toLowerCase()] || {};
        let prompt = `Session: ${context.sessionType} at ${context.trackId} with ${context.carId}

`;
        prompt += `Telemetry:
`;
        prompt += `- Speed: ${Math.round(context.currentTelemetry.powertrain?.speedKph || 0)} km/h
`;
        prompt += `- RPM: ${Math.round(context.currentTelemetry.powertrain?.rpm || 0)}
`;
        prompt += `- Throttle: ${Math.round((context.currentTelemetry.powertrain?.throttle || 0) * 100)}%
`;
        prompt += `- Brake: ${Math.round((context.currentTelemetry.powertrain?.brake || 0) * 100)}%
`;
        prompt += `- Gear: ${context.currentTelemetry.powertrain?.gear || 0}
`;
        if (context.detectedPatterns.length > 0) {
          prompt += `
Detected Patterns:
`;
          context.detectedPatterns.forEach((p) => {
            prompt += `- ${p.type} (${p.severity}): ${p.recommendation}
`;
          });
        }
        if (userQuestion) {
          prompt += `
Driver Question: "${userQuestion}"
`;
        } else {
          prompt += `
Provide proactive coaching based on current data.
`;
        }
        return prompt;
      }
      /**
       * Analyze telemetry and provide coaching
       */
      async analyze(context) {
        const session = this.getSession();
        const prompt = this.buildPrompt(context);
        console.log("[LLMAgent] Analyzing telemetry...");
        try {
          const response = await session.prompt(prompt, {
            temperature: this.config.temperature,
            topP: this.config.topP,
            maxTokens: this.config.maxTokens
          });
          const hasCriticalPattern = context.detectedPatterns.some((p) => p.severity === "high");
          const priority = hasCriticalPattern ? "high" : "normal";
          const category = this.inferCategory(context.detectedPatterns);
          return {
            text: response.trim(),
            priority,
            category,
            confidence: 0.85
            // Could be calculated based on model confidence
          };
        } catch (error) {
          console.error("[LLMAgent] Analysis failed:", error);
          throw error;
        }
      }
      /**
       * Answer a driver's question
       */
      async answerQuestion(question, context) {
        const session = this.getSession();
        const prompt = this.buildPrompt(context, question);
        console.log(`[LLMAgent] Answering question: "${question}"`);
        try {
          const response = await session.prompt(prompt, {
            temperature: this.config.temperature,
            topP: this.config.topP,
            maxTokens: this.config.maxTokens
          });
          return response.trim();
        } catch (error) {
          console.error("[LLMAgent] Question answering failed:", error);
          throw error;
        }
      }
      /**
       * Infer category from patterns
       */
      inferCategory(patterns) {
        if (patterns.some((p) => p.type === "brake_lock"))
          return "safety";
        if (patterns.some((p) => p.type === "tire_wear"))
          return "setup";
        if (patterns.some((p) => p.type === "fuel_usage"))
          return "strategy";
        return "technique";
      }
      /**
       * Reset conversation history
       */
      resetSession() {
        this.session = null;
        console.log("[LLMAgent] Session reset");
      }
      /**
       * Unload model and free resources
       */
      async unload() {
        this.session = null;
        this.context = null;
        this.model = null;
        console.log("[LLMAgent] Model unloaded");
      }
    };
  }
});

// ../../packages/ai-engine/dist/stt-agent.js
var import_events, DEFAULT_CONFIG2, STTAgent;
var init_stt_agent = __esm({
  "../../packages/ai-engine/dist/stt-agent.js"() {
    "use strict";
    import_events = require("events");
    DEFAULT_CONFIG2 = {
      modelPath: "",
      language: "es",
      vadEnabled: true,
      vadThreshold: 0.5,
      silenceDuration: 300
      // ms
    };
    STTAgent = class extends import_events.EventEmitter {
      config;
      isListening = false;
      audioBuffer = [];
      constructor(config2 = {}) {
        super();
        this.config = { ...DEFAULT_CONFIG2, ...config2 };
      }
      /**
       * Initialize the STT engine
       */
      async initialize(modelPath) {
        const path8 = modelPath || this.config.modelPath;
        if (!path8) {
          throw new Error("Model path not specified");
        }
        console.log(`[STTAgent] Initializing with model: ${path8}`);
        console.log(`[STTAgent] Language: ${this.config.language}`);
        console.log(`[STTAgent] VAD: ${this.config.vadEnabled ? "enabled" : "disabled"}`);
        this.emit("ready");
      }
      /**
       * Start listening for voice input
       */
      async startListening() {
        if (this.isListening) {
          console.warn("[STTAgent] Already listening");
          return;
        }
        console.log("[STTAgent] Starting to listen...");
        this.isListening = true;
        this.audioBuffer = [];
        this.emit("event", { type: "listening" });
      }
      /**
       * Stop listening
       */
      async stopListening() {
        if (!this.isListening) {
          return;
        }
        console.log("[STTAgent] Stopping...");
        this.isListening = false;
      }
      /**
       * Process audio chunk
       * Called by audio capture system
       */
      async processAudioChunk(chunk) {
        if (!this.isListening) {
          return;
        }
        this.audioBuffer.push(chunk);
      }
      /**
       * Transcribe audio buffer
       */
      async transcribe(audioData) {
        console.log("[STTAgent] Transcribing audio...");
        this.emit("event", { type: "processing" });
        const result = {
          text: "Placeholder transcription",
          confidence: 0.95,
          language: this.config.language,
          duration: 1e3
        };
        this.emit("event", {
          type: "transcription",
          result
        });
        return result;
      }
      /**
       * Set language
       */
      setLanguage(language) {
        this.config.language = language;
        console.log(`[STTAgent] Language set to: ${language}`);
      }
      /**
       * Enable/disable VAD
       */
      setVADEnabled(enabled) {
        this.config.vadEnabled = enabled;
        console.log(`[STTAgent] VAD ${enabled ? "enabled" : "disabled"}`);
      }
      /**
       * Cleanup
       */
      async dispose() {
        await this.stopListening();
        console.log("[STTAgent] Disposed");
      }
    };
  }
});

// ../../node_modules/.pnpm/eventemitter3@5.0.4/node_modules/eventemitter3/index.js
var require_eventemitter3 = __commonJS({
  "../../node_modules/.pnpm/eventemitter3@5.0.4/node_modules/eventemitter3/index.js"(exports2, module2) {
    "use strict";
    var has = Object.prototype.hasOwnProperty;
    var prefix = "~";
    function Events() {
    }
    if (Object.create) {
      Events.prototype = /* @__PURE__ */ Object.create(null);
      if (!new Events().__proto__) prefix = false;
    }
    function EE(fn, context, once) {
      this.fn = fn;
      this.context = context;
      this.once = once || false;
    }
    function addListener(emitter, event, fn, context, once) {
      if (typeof fn !== "function") {
        throw new TypeError("The listener must be a function");
      }
      var listener = new EE(fn, context || emitter, once), evt = prefix ? prefix + event : event;
      if (!emitter._events[evt]) emitter._events[evt] = listener, emitter._eventsCount++;
      else if (!emitter._events[evt].fn) emitter._events[evt].push(listener);
      else emitter._events[evt] = [emitter._events[evt], listener];
      return emitter;
    }
    function clearEvent(emitter, evt) {
      if (--emitter._eventsCount === 0) emitter._events = new Events();
      else delete emitter._events[evt];
    }
    function EventEmitter5() {
      this._events = new Events();
      this._eventsCount = 0;
    }
    EventEmitter5.prototype.eventNames = function eventNames() {
      var names = [], events, name;
      if (this._eventsCount === 0) return names;
      for (name in events = this._events) {
        if (has.call(events, name)) names.push(prefix ? name.slice(1) : name);
      }
      if (Object.getOwnPropertySymbols) {
        return names.concat(Object.getOwnPropertySymbols(events));
      }
      return names;
    };
    EventEmitter5.prototype.listeners = function listeners(event) {
      var evt = prefix ? prefix + event : event, handlers = this._events[evt];
      if (!handlers) return [];
      if (handlers.fn) return [handlers.fn];
      for (var i = 0, l = handlers.length, ee = new Array(l); i < l; i++) {
        ee[i] = handlers[i].fn;
      }
      return ee;
    };
    EventEmitter5.prototype.listenerCount = function listenerCount(event) {
      var evt = prefix ? prefix + event : event, listeners = this._events[evt];
      if (!listeners) return 0;
      if (listeners.fn) return 1;
      return listeners.length;
    };
    EventEmitter5.prototype.emit = function emit(event, a1, a2, a3, a4, a5) {
      var evt = prefix ? prefix + event : event;
      if (!this._events[evt]) return false;
      var listeners = this._events[evt], len = arguments.length, args, i;
      if (listeners.fn) {
        if (listeners.once) this.removeListener(event, listeners.fn, void 0, true);
        switch (len) {
          case 1:
            return listeners.fn.call(listeners.context), true;
          case 2:
            return listeners.fn.call(listeners.context, a1), true;
          case 3:
            return listeners.fn.call(listeners.context, a1, a2), true;
          case 4:
            return listeners.fn.call(listeners.context, a1, a2, a3), true;
          case 5:
            return listeners.fn.call(listeners.context, a1, a2, a3, a4), true;
          case 6:
            return listeners.fn.call(listeners.context, a1, a2, a3, a4, a5), true;
        }
        for (i = 1, args = new Array(len - 1); i < len; i++) {
          args[i - 1] = arguments[i];
        }
        listeners.fn.apply(listeners.context, args);
      } else {
        var length = listeners.length, j;
        for (i = 0; i < length; i++) {
          if (listeners[i].once) this.removeListener(event, listeners[i].fn, void 0, true);
          switch (len) {
            case 1:
              listeners[i].fn.call(listeners[i].context);
              break;
            case 2:
              listeners[i].fn.call(listeners[i].context, a1);
              break;
            case 3:
              listeners[i].fn.call(listeners[i].context, a1, a2);
              break;
            case 4:
              listeners[i].fn.call(listeners[i].context, a1, a2, a3);
              break;
            default:
              if (!args) for (j = 1, args = new Array(len - 1); j < len; j++) {
                args[j - 1] = arguments[j];
              }
              listeners[i].fn.apply(listeners[i].context, args);
          }
        }
      }
      return true;
    };
    EventEmitter5.prototype.on = function on(event, fn, context) {
      return addListener(this, event, fn, context, false);
    };
    EventEmitter5.prototype.once = function once(event, fn, context) {
      return addListener(this, event, fn, context, true);
    };
    EventEmitter5.prototype.removeListener = function removeListener(event, fn, context, once) {
      var evt = prefix ? prefix + event : event;
      if (!this._events[evt]) return this;
      if (!fn) {
        clearEvent(this, evt);
        return this;
      }
      var listeners = this._events[evt];
      if (listeners.fn) {
        if (listeners.fn === fn && (!once || listeners.once) && (!context || listeners.context === context)) {
          clearEvent(this, evt);
        }
      } else {
        for (var i = 0, events = [], length = listeners.length; i < length; i++) {
          if (listeners[i].fn !== fn || once && !listeners[i].once || context && listeners[i].context !== context) {
            events.push(listeners[i]);
          }
        }
        if (events.length) this._events[evt] = events.length === 1 ? events[0] : events;
        else clearEvent(this, evt);
      }
      return this;
    };
    EventEmitter5.prototype.removeAllListeners = function removeAllListeners(event) {
      var evt;
      if (event) {
        evt = prefix ? prefix + event : event;
        if (this._events[evt]) clearEvent(this, evt);
      } else {
        this._events = new Events();
        this._eventsCount = 0;
      }
      return this;
    };
    EventEmitter5.prototype.off = EventEmitter5.prototype.removeListener;
    EventEmitter5.prototype.addListener = EventEmitter5.prototype.on;
    EventEmitter5.prefixed = prefix;
    EventEmitter5.EventEmitter = EventEmitter5;
    if ("undefined" !== typeof module2) {
      module2.exports = EventEmitter5;
    }
  }
});

// ../../node_modules/.pnpm/eventemitter3@5.0.4/node_modules/eventemitter3/index.mjs
var import_index;
var init_eventemitter3 = __esm({
  "../../node_modules/.pnpm/eventemitter3@5.0.4/node_modules/eventemitter3/index.mjs"() {
    import_index = __toESM(require_eventemitter3(), 1);
  }
});

// ../../node_modules/.pnpm/p-timeout@6.1.4/node_modules/p-timeout/index.js
function pTimeout(promise, options) {
  const {
    milliseconds,
    fallback,
    message,
    customTimers = { setTimeout, clearTimeout }
  } = options;
  let timer;
  let abortHandler;
  const wrappedPromise = new Promise((resolve, reject) => {
    if (typeof milliseconds !== "number" || Math.sign(milliseconds) !== 1) {
      throw new TypeError(`Expected \`milliseconds\` to be a positive number, got \`${milliseconds}\``);
    }
    if (options.signal) {
      const { signal } = options;
      if (signal.aborted) {
        reject(getAbortedReason(signal));
      }
      abortHandler = () => {
        reject(getAbortedReason(signal));
      };
      signal.addEventListener("abort", abortHandler, { once: true });
    }
    if (milliseconds === Number.POSITIVE_INFINITY) {
      promise.then(resolve, reject);
      return;
    }
    const timeoutError = new TimeoutError();
    timer = customTimers.setTimeout.call(void 0, () => {
      if (fallback) {
        try {
          resolve(fallback());
        } catch (error) {
          reject(error);
        }
        return;
      }
      if (typeof promise.cancel === "function") {
        promise.cancel();
      }
      if (message === false) {
        resolve();
      } else if (message instanceof Error) {
        reject(message);
      } else {
        timeoutError.message = message ?? `Promise timed out after ${milliseconds} milliseconds`;
        reject(timeoutError);
      }
    }, milliseconds);
    (async () => {
      try {
        resolve(await promise);
      } catch (error) {
        reject(error);
      }
    })();
  });
  const cancelablePromise = wrappedPromise.finally(() => {
    cancelablePromise.clear();
    if (abortHandler && options.signal) {
      options.signal.removeEventListener("abort", abortHandler);
    }
  });
  cancelablePromise.clear = () => {
    customTimers.clearTimeout.call(void 0, timer);
    timer = void 0;
  };
  return cancelablePromise;
}
var TimeoutError, AbortError, getDOMException, getAbortedReason;
var init_p_timeout = __esm({
  "../../node_modules/.pnpm/p-timeout@6.1.4/node_modules/p-timeout/index.js"() {
    TimeoutError = class extends Error {
      constructor(message) {
        super(message);
        this.name = "TimeoutError";
      }
    };
    AbortError = class extends Error {
      constructor(message) {
        super();
        this.name = "AbortError";
        this.message = message;
      }
    };
    getDOMException = (errorMessage) => globalThis.DOMException === void 0 ? new AbortError(errorMessage) : new DOMException(errorMessage);
    getAbortedReason = (signal) => {
      const reason = signal.reason === void 0 ? getDOMException("This operation was aborted.") : signal.reason;
      return reason instanceof Error ? reason : getDOMException(reason);
    };
  }
});

// ../../node_modules/.pnpm/p-queue@8.1.1/node_modules/p-queue/dist/lower-bound.js
function lowerBound(array, value, comparator) {
  let first = 0;
  let count = array.length;
  while (count > 0) {
    const step = Math.trunc(count / 2);
    let it = first + step;
    if (comparator(array[it], value) <= 0) {
      first = ++it;
      count -= step + 1;
    } else {
      count = step;
    }
  }
  return first;
}
var init_lower_bound = __esm({
  "../../node_modules/.pnpm/p-queue@8.1.1/node_modules/p-queue/dist/lower-bound.js"() {
  }
});

// ../../node_modules/.pnpm/p-queue@8.1.1/node_modules/p-queue/dist/priority-queue.js
var PriorityQueue;
var init_priority_queue = __esm({
  "../../node_modules/.pnpm/p-queue@8.1.1/node_modules/p-queue/dist/priority-queue.js"() {
    init_lower_bound();
    PriorityQueue = class {
      #queue = [];
      enqueue(run, options) {
        options = {
          priority: 0,
          ...options
        };
        const element = {
          priority: options.priority,
          id: options.id,
          run
        };
        if (this.size === 0 || this.#queue[this.size - 1].priority >= options.priority) {
          this.#queue.push(element);
          return;
        }
        const index = lowerBound(this.#queue, element, (a, b) => b.priority - a.priority);
        this.#queue.splice(index, 0, element);
      }
      setPriority(id, priority) {
        const index = this.#queue.findIndex((element) => element.id === id);
        if (index === -1) {
          throw new ReferenceError(`No promise function with the id "${id}" exists in the queue.`);
        }
        const [item] = this.#queue.splice(index, 1);
        this.enqueue(item.run, { priority, id });
      }
      dequeue() {
        const item = this.#queue.shift();
        return item?.run;
      }
      filter(options) {
        return this.#queue.filter((element) => element.priority === options.priority).map((element) => element.run);
      }
      get size() {
        return this.#queue.length;
      }
    };
  }
});

// ../../node_modules/.pnpm/p-queue@8.1.1/node_modules/p-queue/dist/index.js
var PQueue;
var init_dist = __esm({
  "../../node_modules/.pnpm/p-queue@8.1.1/node_modules/p-queue/dist/index.js"() {
    init_eventemitter3();
    init_p_timeout();
    init_priority_queue();
    PQueue = class extends import_index.default {
      #carryoverConcurrencyCount;
      #isIntervalIgnored;
      #intervalCount = 0;
      #intervalCap;
      #interval;
      #intervalEnd = 0;
      #intervalId;
      #timeoutId;
      #queue;
      #queueClass;
      #pending = 0;
      // The `!` is needed because of https://github.com/microsoft/TypeScript/issues/32194
      #concurrency;
      #isPaused;
      #throwOnTimeout;
      // Use to assign a unique identifier to a promise function, if not explicitly specified
      #idAssigner = 1n;
      /**
          Per-operation timeout in milliseconds. Operations fulfill once `timeout` elapses if they haven't already.
      
          Applies to each future operation.
          */
      timeout;
      // TODO: The `throwOnTimeout` option should affect the return types of `add()` and `addAll()`
      constructor(options) {
        super();
        options = {
          carryoverConcurrencyCount: false,
          intervalCap: Number.POSITIVE_INFINITY,
          interval: 0,
          concurrency: Number.POSITIVE_INFINITY,
          autoStart: true,
          queueClass: PriorityQueue,
          ...options
        };
        if (!(typeof options.intervalCap === "number" && options.intervalCap >= 1)) {
          throw new TypeError(`Expected \`intervalCap\` to be a number from 1 and up, got \`${options.intervalCap?.toString() ?? ""}\` (${typeof options.intervalCap})`);
        }
        if (options.interval === void 0 || !(Number.isFinite(options.interval) && options.interval >= 0)) {
          throw new TypeError(`Expected \`interval\` to be a finite number >= 0, got \`${options.interval?.toString() ?? ""}\` (${typeof options.interval})`);
        }
        this.#carryoverConcurrencyCount = options.carryoverConcurrencyCount;
        this.#isIntervalIgnored = options.intervalCap === Number.POSITIVE_INFINITY || options.interval === 0;
        this.#intervalCap = options.intervalCap;
        this.#interval = options.interval;
        this.#queue = new options.queueClass();
        this.#queueClass = options.queueClass;
        this.concurrency = options.concurrency;
        this.timeout = options.timeout;
        this.#throwOnTimeout = options.throwOnTimeout === true;
        this.#isPaused = options.autoStart === false;
      }
      get #doesIntervalAllowAnother() {
        return this.#isIntervalIgnored || this.#intervalCount < this.#intervalCap;
      }
      get #doesConcurrentAllowAnother() {
        return this.#pending < this.#concurrency;
      }
      #next() {
        this.#pending--;
        this.#tryToStartAnother();
        this.emit("next");
      }
      #onResumeInterval() {
        this.#onInterval();
        this.#initializeIntervalIfNeeded();
        this.#timeoutId = void 0;
      }
      get #isIntervalPaused() {
        const now = Date.now();
        if (this.#intervalId === void 0) {
          const delay = this.#intervalEnd - now;
          if (delay < 0) {
            this.#intervalCount = this.#carryoverConcurrencyCount ? this.#pending : 0;
          } else {
            if (this.#timeoutId === void 0) {
              this.#timeoutId = setTimeout(() => {
                this.#onResumeInterval();
              }, delay);
            }
            return true;
          }
        }
        return false;
      }
      #tryToStartAnother() {
        if (this.#queue.size === 0) {
          if (this.#intervalId) {
            clearInterval(this.#intervalId);
          }
          this.#intervalId = void 0;
          this.emit("empty");
          if (this.#pending === 0) {
            this.emit("idle");
          }
          return false;
        }
        if (!this.#isPaused) {
          const canInitializeInterval = !this.#isIntervalPaused;
          if (this.#doesIntervalAllowAnother && this.#doesConcurrentAllowAnother) {
            const job = this.#queue.dequeue();
            if (!job) {
              return false;
            }
            this.emit("active");
            job();
            if (canInitializeInterval) {
              this.#initializeIntervalIfNeeded();
            }
            return true;
          }
        }
        return false;
      }
      #initializeIntervalIfNeeded() {
        if (this.#isIntervalIgnored || this.#intervalId !== void 0) {
          return;
        }
        this.#intervalId = setInterval(() => {
          this.#onInterval();
        }, this.#interval);
        this.#intervalEnd = Date.now() + this.#interval;
      }
      #onInterval() {
        if (this.#intervalCount === 0 && this.#pending === 0 && this.#intervalId) {
          clearInterval(this.#intervalId);
          this.#intervalId = void 0;
        }
        this.#intervalCount = this.#carryoverConcurrencyCount ? this.#pending : 0;
        this.#processQueue();
      }
      /**
      Executes all queued functions until it reaches the limit.
      */
      #processQueue() {
        while (this.#tryToStartAnother()) {
        }
      }
      get concurrency() {
        return this.#concurrency;
      }
      set concurrency(newConcurrency) {
        if (!(typeof newConcurrency === "number" && newConcurrency >= 1)) {
          throw new TypeError(`Expected \`concurrency\` to be a number from 1 and up, got \`${newConcurrency}\` (${typeof newConcurrency})`);
        }
        this.#concurrency = newConcurrency;
        this.#processQueue();
      }
      async #throwOnAbort(signal) {
        return new Promise((_resolve, reject) => {
          signal.addEventListener("abort", () => {
            reject(signal.reason);
          }, { once: true });
        });
      }
      /**
          Updates the priority of a promise function by its id, affecting its execution order. Requires a defined concurrency limit to take effect.
      
          For example, this can be used to prioritize a promise function to run earlier.
      
          ```js
          import PQueue from 'p-queue';
      
          const queue = new PQueue({concurrency: 1});
      
          queue.add(async () => '🦄', {priority: 1});
          queue.add(async () => '🦀', {priority: 0, id: '🦀'});
          queue.add(async () => '🦄', {priority: 1});
          queue.add(async () => '🦄', {priority: 1});
      
          queue.setPriority('🦀', 2);
          ```
      
          In this case, the promise function with `id: '🦀'` runs second.
      
          You can also deprioritize a promise function to delay its execution:
      
          ```js
          import PQueue from 'p-queue';
      
          const queue = new PQueue({concurrency: 1});
      
          queue.add(async () => '🦄', {priority: 1});
          queue.add(async () => '🦀', {priority: 1, id: '🦀'});
          queue.add(async () => '🦄');
          queue.add(async () => '🦄', {priority: 0});
      
          queue.setPriority('🦀', -1);
          ```
          Here, the promise function with `id: '🦀'` executes last.
          */
      setPriority(id, priority) {
        this.#queue.setPriority(id, priority);
      }
      async add(function_, options = {}) {
        options.id ??= (this.#idAssigner++).toString();
        options = {
          timeout: this.timeout,
          throwOnTimeout: this.#throwOnTimeout,
          ...options
        };
        return new Promise((resolve, reject) => {
          this.#queue.enqueue(async () => {
            this.#pending++;
            try {
              options.signal?.throwIfAborted();
              this.#intervalCount++;
              let operation = function_({ signal: options.signal });
              if (options.timeout) {
                operation = pTimeout(Promise.resolve(operation), { milliseconds: options.timeout });
              }
              if (options.signal) {
                operation = Promise.race([operation, this.#throwOnAbort(options.signal)]);
              }
              const result = await operation;
              resolve(result);
              this.emit("completed", result);
            } catch (error) {
              if (error instanceof TimeoutError && !options.throwOnTimeout) {
                resolve();
                return;
              }
              reject(error);
              this.emit("error", error);
            } finally {
              this.#next();
            }
          }, options);
          this.emit("add");
          this.#tryToStartAnother();
        });
      }
      async addAll(functions, options) {
        return Promise.all(functions.map(async (function_) => this.add(function_, options)));
      }
      /**
      Start (or resume) executing enqueued tasks within concurrency limit. No need to call this if queue is not paused (via `options.autoStart = false` or by `.pause()` method.)
      */
      start() {
        if (!this.#isPaused) {
          return this;
        }
        this.#isPaused = false;
        this.#processQueue();
        return this;
      }
      /**
      Put queue execution on hold.
      */
      pause() {
        this.#isPaused = true;
      }
      /**
      Clear the queue.
      */
      clear() {
        this.#queue = new this.#queueClass();
      }
      /**
          Can be called multiple times. Useful if you for example add additional items at a later time.
      
          @returns A promise that settles when the queue becomes empty.
          */
      async onEmpty() {
        if (this.#queue.size === 0) {
          return;
        }
        await this.#onEvent("empty");
      }
      /**
          @returns A promise that settles when the queue size is less than the given limit: `queue.size < limit`.
      
          If you want to avoid having the queue grow beyond a certain size you can `await queue.onSizeLessThan()` before adding a new item.
      
          Note that this only limits the number of items waiting to start. There could still be up to `concurrency` jobs already running that this call does not include in its calculation.
          */
      async onSizeLessThan(limit) {
        if (this.#queue.size < limit) {
          return;
        }
        await this.#onEvent("next", () => this.#queue.size < limit);
      }
      /**
          The difference with `.onEmpty` is that `.onIdle` guarantees that all work from the queue has finished. `.onEmpty` merely signals that the queue is empty, but it could mean that some promises haven't completed yet.
      
          @returns A promise that settles when the queue becomes empty, and all promises have completed; `queue.size === 0 && queue.pending === 0`.
          */
      async onIdle() {
        if (this.#pending === 0 && this.#queue.size === 0) {
          return;
        }
        await this.#onEvent("idle");
      }
      async #onEvent(event, filter) {
        return new Promise((resolve) => {
          const listener = () => {
            if (filter && !filter()) {
              return;
            }
            this.off(event, listener);
            resolve();
          };
          this.on(event, listener);
        });
      }
      /**
      Size of the queue, the number of queued items waiting to run.
      */
      get size() {
        return this.#queue.size;
      }
      /**
          Size of the queue, filtered by the given options.
      
          For example, this can be used to find the number of items remaining in the queue with a specific priority level.
          */
      sizeBy(options) {
        return this.#queue.filter(options).length;
      }
      /**
      Number of running items (no longer in the queue).
      */
      get pending() {
        return this.#pending;
      }
      /**
      Whether the queue is currently paused.
      */
      get isPaused() {
        return this.#isPaused;
      }
    };
  }
});

// ../../packages/ai-engine/dist/tts-agent.js
var import_events2, import_crypto, DEFAULT_CONFIG3, VOICE_MODELS, TTSAgent;
var init_tts_agent = __esm({
  "../../packages/ai-engine/dist/tts-agent.js"() {
    "use strict";
    import_events2 = require("events");
    init_dist();
    import_crypto = require("crypto");
    DEFAULT_CONFIG3 = {
      modelPath: "",
      language: "es",
      voice: "es_AR-tux-medium",
      speed: 1,
      volume: 0.8
    };
    VOICE_MODELS = {
      es: "es_AR-tux-medium",
      // Spanish Argentina as default
      en: "en_US-lessac-medium",
      pt: "pt_BR-faber-medium",
      fr: "fr_FR-siwis-medium",
      it: "it_IT-riccardo-medium"
    };
    TTSAgent = class extends import_events2.EventEmitter {
      config;
      queue;
      queuedItems = /* @__PURE__ */ new Map();
      currentItemId = null;
      constructor(config2 = {}) {
        super();
        this.config = { ...DEFAULT_CONFIG3, ...config2 };
        this.queue = new PQueue({
          concurrency: 1,
          // One speech at a time
          autoStart: true
        });
      }
      /**
       * Initialize TTS engine
       */
      async initialize(modelPath) {
        const path8 = modelPath || this.config.modelPath;
        if (!path8) {
          throw new Error("Model path not specified");
        }
        console.log(`[TTSAgent] Initializing with voice: ${this.config.voice}`);
        console.log(`[TTSAgent] Language: ${this.config.language}`);
        this.emit("ready");
      }
      /**
       * Speak text with priority
       */
      async speak(text, priority = "normal") {
        const id = (0, import_crypto.randomUUID)();
        const item = {
          text,
          priority,
          id,
          createdAt: Date.now()
        };
        this.queuedItems.set(id, item);
        console.log(`[TTSAgent] Queuing speech: "${text}" (${priority})`);
        const queuePriority = priority === "urgent" ? 10 : 0;
        this.queue.add(async () => {
          await this.synthesizeAndPlay(item);
        }, { priority: queuePriority });
        return id;
      }
      /**
       * Synthesize speech and play audio
       */
      async synthesizeAndPlay(item) {
        this.currentItemId = item.id;
        this.emit("event", {
          type: "started",
          id: item.id
        });
        try {
          console.log(`[TTSAgent] Speaking: "${item.text}"`);
          const duration = item.text.length * 50;
          await new Promise((resolve) => setTimeout(resolve, duration));
          this.emit("event", {
            type: "completed",
            id: item.id
          });
          this.queuedItems.delete(item.id);
          this.currentItemId = null;
        } catch (error) {
          console.error(`[TTSAgent] Error speaking:`, error);
          this.emit("event", {
            type: "error",
            id: item.id,
            error
          });
          this.currentItemId = null;
        }
      }
      /**
       * Interrupt current speech and clear queue
       */
      async interrupt() {
        console.log("[TTSAgent] Interrupting speech and clearing queue");
        this.queue.clear();
        if (this.currentItemId) {
          this.emit("event", {
            type: "interrupted",
            id: this.currentItemId
          });
        }
        this.queuedItems.clear();
        this.currentItemId = null;
      }
      /**
       * Get current queue length
       */
      getQueueLength() {
        return this.queue.size + this.queue.pending;
      }
      /**
       * Check if currently speaking
       */
      isSpeaking() {
        return this.currentItemId !== null;
      }
      /**
       * Set language and voice
       */
      setLanguage(language) {
        this.config.language = language;
        this.config.voice = VOICE_MODELS[language];
        console.log(`[TTSAgent] Language set to: ${language}, voice: ${this.config.voice}`);
      }
      /**
       * Set speaking speed
       */
      setSpeed(speed) {
        this.config.speed = Math.max(0.5, Math.min(2, speed));
        console.log(`[TTSAgent] Speed set to: ${this.config.speed}`);
      }
      /**
       * Set volume
       */
      setVolume(volume) {
        this.config.volume = Math.max(0, Math.min(1, volume));
        console.log(`[TTSAgent] Volume set to: ${this.config.volume}`);
      }
      /**
       * Cleanup
       */
      async dispose() {
        await this.interrupt();
        this.queue.pause();
        console.log("[TTSAgent] Disposed");
      }
    };
  }
});

// ../../packages/ai-engine/dist/pattern-analyzer.js
var DETECTION_THRESHOLDS, PatternAnalyzer;
var init_pattern_analyzer = __esm({
  "../../packages/ai-engine/dist/pattern-analyzer.js"() {
    "use strict";
    DETECTION_THRESHOLDS = {
      brakeLock: {
        minSpeed: 50,
        // km/h
        brakePressure: 0.9,
        wheelSpeedDrop: 0.3
        // 30% drop
      },
      cornerSpeed: {
        minSteeringAngle: 0.08,
        minLateralG: 0.9,
        speedVariance: 0.1
        // 10% between laps
      },
      throttleControl: {
        maxOscillation: 0.2,
        // 20% oscillation
        windowSize: 10
        // frames
      },
      lapConsistency: {
        maxVariance: 0.02
        // 2% lap time variance for "consistent"
      }
    };
    PatternAnalyzer = class {
      patterns = /* @__PURE__ */ new Map();
      frameHistory = [];
      maxHistorySize = 300;
      // ~15 seconds at 20fps
      sessionContext = null;
      /**
       * Set session context
       */
      setSessionContext(context) {
        this.sessionContext = context;
        this.reset();
      }
      /**
       * Analyze a new frame and detect patterns
       */
      analyzeFrame(frame) {
        this.frameHistory.push(frame);
        if (this.frameHistory.length > this.maxHistorySize) {
          this.frameHistory.shift();
        }
        const detectedPatterns = [];
        const brakeLock = this.detectBrakeLocking(frame);
        if (brakeLock)
          detectedPatterns.push(brakeLock);
        const cornerSpeed = this.detectCornerSpeed(frame);
        if (cornerSpeed)
          detectedPatterns.push(cornerSpeed);
        const throttleIssue = this.detectThrottleControl(frame);
        if (throttleIssue)
          detectedPatterns.push(throttleIssue);
        detectedPatterns.forEach((pattern) => {
          this.recordPattern(pattern.type, frame);
        });
        return detectedPatterns;
      }
      /**
       * Analyze session for consistency patterns
       */
      analyzeSession(frames) {
        const patterns = [];
        const consistency = this.analyzeLapConsistency(frames);
        if (consistency)
          patterns.push(consistency);
        const tireWear = this.analyzeTireWear(frames);
        if (tireWear)
          patterns.push(tireWear);
        const fuelUsage = this.analyzeFuelUsage(frames);
        if (fuelUsage)
          patterns.push(fuelUsage);
        return patterns;
      }
      /**
       * Detect brake locking
       */
      detectBrakeLocking(frame) {
        const speed = frame.powertrain?.speedKph || 0;
        const brake = frame.powertrain?.brake || 0;
        if (speed < DETECTION_THRESHOLDS.brakeLock.minSpeed) {
          return null;
        }
        if (brake < DETECTION_THRESHOLDS.brakeLock.brakePressure) {
          return null;
        }
        if (this.frameHistory.length < 5) {
          return null;
        }
        const recentFrames = this.frameHistory.slice(-5);
        const decelRate = this.calculateDeceleration(recentFrames);
        if (decelRate > 15) {
          const history = this.patterns.get("brake_lock");
          const occurrences = history ? history.occurrences.length : 0;
          if (occurrences >= 2) {
            return {
              type: "brake_lock",
              severity: "high",
              occurrences: occurrences + 1,
              location: this.estimateLocation(),
              recommendation: "Reduc\xED la presi\xF3n inicial del freno o retras\xE1 un poco el punto de frenado",
              detectedAt: frame.t,
              frames: [...history?.occurrences.map((o) => o.frame) || [], this.frameHistory.length]
            };
          }
        }
        return null;
      }
      /**
       * Detect corner speed issues
       */
      detectCornerSpeed(frame) {
        const speed = frame.powertrain?.speedKph || 0;
        const steeringAngle = frame.physics?.steeringAngle || 0;
        const lateralG = frame.physics?.lateralG || 0;
        if (Math.abs(steeringAngle) < DETECTION_THRESHOLDS.cornerSpeed.minSteeringAngle) {
          return null;
        }
        const expectedG = Math.abs(steeringAngle) * 10;
        if (lateralG < expectedG * 0.7) {
          const history = this.patterns.get("corner_speed");
          const occurrences = history ? history.occurrences.length : 0;
          if (occurrences >= 2) {
            return {
              type: "corner_speed",
              severity: "medium",
              occurrences: occurrences + 1,
              location: this.estimateLocation(),
              recommendation: "Prob\xE1 entrar un poco m\xE1s despacio y acelerar m\xE1s temprano en la salida",
              detectedAt: frame.t,
              frames: [...history?.occurrences.map((o) => o.frame) || [], this.frameHistory.length]
            };
          }
        }
        return null;
      }
      /**
       * Detect throttle control issues
       */
      detectThrottleControl(frame) {
        if (this.frameHistory.length < DETECTION_THRESHOLDS.throttleControl.windowSize) {
          return null;
        }
        const recentFrames = this.frameHistory.slice(-DETECTION_THRESHOLDS.throttleControl.windowSize);
        const throttles = recentFrames.map((f) => f.powertrain?.throttle || 0);
        const mean = throttles.reduce((sum, t) => sum + t, 0) / throttles.length;
        const variance = throttles.reduce((sum, t) => sum + Math.pow(t - mean, 2), 0) / throttles.length;
        const oscillation = Math.sqrt(variance);
        if (oscillation > DETECTION_THRESHOLDS.throttleControl.maxOscillation) {
          return {
            type: "throttle_control",
            severity: "low",
            occurrences: 1,
            recommendation: "Suaviz\xE1 las entradas del acelerador, est\xE1s oscilando mucho",
            detectedAt: frame.t,
            frames: [this.frameHistory.length]
          };
        }
        return null;
      }
      /**
       * Analyze lap time consistency
       */
      analyzeLapConsistency(frames) {
        if (!this.sessionContext)
          return null;
        const avgLapTime = this.sessionContext.averageLapTime;
        const bestLapTime = this.sessionContext.bestLapTime;
        if (!avgLapTime || !bestLapTime || this.sessionContext.totalLaps < 3) {
          return null;
        }
        const variance = (avgLapTime - bestLapTime) / bestLapTime;
        if (variance > DETECTION_THRESHOLDS.lapConsistency.maxVariance) {
          return {
            type: "inconsistent_pace",
            severity: "medium",
            occurrences: this.sessionContext.totalLaps,
            recommendation: `Tu variaci\xF3n de tiempos es del ${(variance * 100).toFixed(1)}%. Enfocate en consistencia antes que en velocidad pura`,
            detectedAt: frames[frames.length - 1]?.t || 0,
            frames: []
          };
        }
        return null;
      }
      /**
       * Analyze tire wear patterns
       */
      analyzeTireWear(frames) {
        const lastFrame = frames[frames.length - 1];
        if (!lastFrame?.temps?.tyreC)
          return null;
        const temps = lastFrame.temps.tyreC;
        if (temps.length < 4)
          return null;
        const avgTemp = temps.reduce((a, b) => a + b, 0) / temps.length;
        const maxTemp = Math.max(...temps);
        const speed = lastFrame.powertrain?.speedKph || 0;
        if (speed < 50)
          return null;
        if (maxTemp > 100) {
          return {
            type: "tire_wear",
            severity: "high",
            occurrences: 1,
            location: this.estimateLocation(),
            recommendation: "tyres-overheating",
            detectedAt: lastFrame.t,
            frames: [frames.length - 1]
          };
        }
        if (avgTemp < 65) {
          return {
            type: "tire_wear",
            severity: "medium",
            occurrences: 1,
            location: this.estimateLocation(),
            recommendation: "tyres-too-cold",
            detectedAt: lastFrame.t,
            frames: [frames.length - 1]
          };
        }
        const leftAvg = (temps[0] + temps[2]) / 2;
        const rightAvg = (temps[1] + temps[3]) / 2;
        if (Math.abs(leftAvg - rightAvg) > 20) {
          return {
            type: "tire_wear",
            severity: "low",
            occurrences: 1,
            location: this.estimateLocation(),
            recommendation: "thermal-imbalance-lr",
            detectedAt: lastFrame.t,
            frames: [frames.length - 1]
          };
        }
        return null;
      }
      analyzeFuelUsage(frames) {
        const lastFrame = frames[frames.length - 1];
        if (lastFrame?.fuel?.level !== void 0) {
          if (lastFrame.fuel.level < 5 && lastFrame.fuel.level > 0.1) {
            return {
              type: "fuel_usage",
              severity: "high",
              occurrences: 1,
              location: this.estimateLocation(),
              recommendation: "fuel-critical-low",
              detectedAt: lastFrame.t,
              frames: [frames.length - 1]
            };
          }
        }
        return null;
      }
      detectAnomalies(currentFrame, history) {
        const anomalies = [];
        if (history.length < 10)
          return anomalies;
        const recentFrames = history.slice(-10);
        const speedDropAnomaly = this.detectSuddenSpeedDrop(currentFrame, recentFrames);
        if (speedDropAnomaly)
          anomalies.push(speedDropAnomaly);
        const tempAnomaly = this.detectTemperatureSpike(currentFrame, recentFrames);
        if (tempAnomaly)
          anomalies.push(tempAnomaly);
        return anomalies;
      }
      detectSuddenSpeedDrop(current, recent) {
        const currentSpeed = current.powertrain?.speedKph || 0;
        const avgRecentSpeed = recent.reduce((sum, f) => sum + (f.powertrain?.speedKph || 0), 0) / recent.length;
        const speedDrop = avgRecentSpeed - currentSpeed;
        const dropPercentage = speedDrop / avgRecentSpeed;
        if (dropPercentage > 0.3 && avgRecentSpeed > 50) {
          return {
            type: "sudden_deceleration",
            severity: "critical",
            description: `Ca\xEDda brusca de velocidad: ${speedDrop.toFixed(0)} km/h`,
            telemetrySnapshot: { powertrain: current.powertrain, t: current.t },
            timestamp: current.t
          };
        }
        return null;
      }
      detectTemperatureSpike(current, recent) {
        const currentWaterTemp = current.temps?.waterC || 0;
        const avgWaterTemp = recent.reduce((sum, f) => sum + (f.temps?.waterC || 0), 0) / recent.length;
        const tempIncrease = currentWaterTemp - avgWaterTemp;
        if (tempIncrease > 10) {
          return {
            type: "temperature_spike",
            severity: "high",
            description: `Temperatura del agua subi\xF3 ${tempIncrease.toFixed(1)}\xB0C`,
            telemetrySnapshot: { temps: current.temps, t: current.t },
            timestamp: current.t
          };
        }
        return null;
      }
      calculateDeceleration(frames) {
        if (frames.length < 2)
          return 0;
        const first = frames[0];
        const last = frames[frames.length - 1];
        const speedDiff = (first.powertrain?.speedKph || 0) - (last.powertrain?.speedKph || 0);
        const timeDiff = (last.t - first.t) / 1e3;
        return speedDiff / 3.6 / timeDiff;
      }
      estimateLocation() {
        const lastFrame = this.frameHistory[this.frameHistory.length - 1];
        if (!lastFrame)
          return "unknown";
        const pct = lastFrame.session?.lapDistPct;
        if (typeof pct === "number") {
          if (pct < 0.33)
            return "Sector 1";
          if (pct < 0.66)
            return "Sector 2";
          return "Sector 3";
        }
        return "on track";
      }
      /**
       * Record pattern occurrence
       */
      recordPattern(type, frame) {
        let history = this.patterns.get(type);
        if (!history) {
          history = {
            type,
            occurrences: [],
            lastDetected: 0
          };
          this.patterns.set(type, history);
        }
        history.occurrences.push({
          frame: this.frameHistory.length - 1,
          timestamp: frame.t,
          location: this.estimateLocation()
        });
        history.lastDetected = frame.t;
        if (history.occurrences.length > 10) {
          history.occurrences.shift();
        }
      }
      /**
       * Get pattern history
       */
      getPatternHistory(type) {
        return this.patterns.get(type) || null;
      }
      /**
       * Get all active patterns
       */
      getActivePatterns() {
        const patterns = [];
        const now = Date.now();
        this.patterns.forEach((history, type) => {
          if (now - history.lastDetected < 3e4 && history.occurrences.length >= 2) {
            patterns.push({
              type,
              severity: "medium",
              occurrences: history.occurrences.length,
              location: history.occurrences[history.occurrences.length - 1]?.location,
              recommendation: "Pattern detected - needs specific recommendation",
              detectedAt: history.lastDetected,
              frames: history.occurrences.map((o) => o.frame)
            });
          }
        });
        return patterns;
      }
      /**
       * Reset analyzer
       */
      reset() {
        this.patterns.clear();
        this.frameHistory = [];
        console.log("[PatternAnalyzer] Reset");
      }
    };
  }
});

// ../../packages/ai-engine/dist/model-manager.js
var import_promises, import_path, import_fs, import_url, import_meta, __filename, __dirname2, MODELS_DIR, AVAILABLE_MODELS, ModelManager;
var init_model_manager = __esm({
  "../../packages/ai-engine/dist/model-manager.js"() {
    "use strict";
    import_promises = __toESM(require("fs/promises"), 1);
    import_path = __toESM(require("path"), 1);
    import_fs = require("fs");
    import_url = require("url");
    import_meta = {};
    __filename = (0, import_url.fileURLToPath)(import_meta.url);
    __dirname2 = import_path.default.dirname(__filename);
    MODELS_DIR = import_path.default.join(__dirname2, "../models");
    AVAILABLE_MODELS = [
      {
        name: "llama-3.2-1b-q4",
        url: "https://huggingface.co/bartowski/Llama-3.2-1B-Instruct-GGUF/resolve/main/Llama-3.2-1B-Instruct-Q4_K_M.gguf",
        size: 850,
        checksum: "",
        // Will be verified after download
        required: true,
        type: "llm"
      },
      {
        name: "whisper-tiny-multilingual",
        url: "https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-tiny.bin",
        size: 75,
        checksum: "",
        required: true,
        type: "stt"
      },
      {
        name: "piper-es-ar",
        url: "https://huggingface.co/rhasspy/piper-voices/resolve/v1.0.0/es/es_AR/tux/medium/es_AR-tux-medium.onnx",
        size: 15,
        checksum: "",
        required: false,
        // Spanish Argentina voice
        type: "tts"
      },
      {
        name: "piper-es-es",
        url: "https://huggingface.co/rhasspy/piper-voices/resolve/v1.0.0/es/es_ES/davefx/medium/es_ES-davefx-medium.onnx",
        size: 15,
        checksum: "",
        required: false,
        // Spanish Spain voice (fallback)
        type: "tts"
      },
      {
        name: "piper-en-us",
        url: "https://huggingface.co/rhasspy/piper-voices/resolve/v1.0.0/en/en_US/lessac/medium/en_US-lessac-medium.onnx",
        size: 15,
        checksum: "",
        required: false,
        // English voice
        type: "tts"
      }
    ];
    ModelManager = class {
      modelsDir;
      constructor(modelsDir = MODELS_DIR) {
        this.modelsDir = modelsDir;
      }
      /**
       * Ensure models directory exists
       */
      async ensureModelsDir() {
        try {
          await import_promises.default.access(this.modelsDir);
        } catch {
          await import_promises.default.mkdir(this.modelsDir, { recursive: true });
        }
      }
      /**
       * Get path for a model
       */
      getModelPath(modelName) {
        const model = AVAILABLE_MODELS.find((m) => m.name === modelName);
        if (!model) {
          throw new Error(`Unknown model: ${modelName}`);
        }
        const ext = model.url.endsWith(".gguf") ? ".gguf" : ".onnx";
        if (model.url.includes("whisper")) {
          return import_path.default.join(this.modelsDir, `${modelName}.bin`);
        }
        return import_path.default.join(this.modelsDir, `${modelName}${ext}`);
      }
      /**
       * Check if a model is installed
       */
      async isInstalled(modelName) {
        const modelPath = this.getModelPath(modelName);
        try {
          await import_promises.default.access(modelPath);
          return true;
        } catch {
          return false;
        }
      }
      /**
       * Get status of all models
       */
      async checkModels() {
        await this.ensureModelsDir();
        const statuses = [];
        for (const model of AVAILABLE_MODELS) {
          const modelPath = this.getModelPath(model.name);
          const installed = await this.isInstalled(model.name);
          let size;
          let verified = false;
          if (installed) {
            try {
              const stats = await import_promises.default.stat(modelPath);
              size = Math.round(stats.size / (1024 * 1024));
              verified = Math.abs(size - model.size) / model.size < 0.1;
            } catch {
              verified = false;
            }
          }
          statuses.push({
            name: model.name,
            installed,
            verified,
            size,
            path: installed ? modelPath : void 0
          });
        }
        return statuses;
      }
      /**
       * Download a single model
       */
      async downloadModel(modelName, onProgress) {
        const model = AVAILABLE_MODELS.find((m) => m.name === modelName);
        if (!model) {
          throw new Error(`Unknown model: ${modelName}`);
        }
        await this.ensureModelsDir();
        const modelPath = this.getModelPath(modelName);
        console.log(`[ModelManager] Downloading ${model.name} from ${model.url}`);
        try {
          const response = await fetch(model.url);
          if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
          }
          const totalSize = parseInt(response.headers.get("content-length") || "0");
          let downloaded = 0;
          const startTime = Date.now();
          const fileStream = (0, import_fs.createWriteStream)(modelPath);
          if (!response.body) {
            throw new Error("Response body is null");
          }
          const reader = response.body.getReader();
          const chunks = [];
          while (true) {
            const { done, value } = await reader.read();
            if (done)
              break;
            chunks.push(value);
            downloaded += value.length;
            if (onProgress) {
              const elapsed = (Date.now() - startTime) / 1e3;
              const speed = downloaded / (1024 * 1024) / elapsed;
              onProgress({
                modelName: model.name,
                downloaded: downloaded / (1024 * 1024),
                total: model.size,
                percentage: totalSize > 0 ? downloaded / totalSize * 100 : 0,
                speed
              });
            }
          }
          const totalLength = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
          const combined = new Uint8Array(totalLength);
          let offset = 0;
          for (const chunk of chunks) {
            combined.set(chunk, offset);
            offset += chunk.length;
          }
          await import_promises.default.writeFile(modelPath, combined);
          console.log(`[ModelManager] Download complete: ${model.name}`);
        } catch (error) {
          try {
            await import_promises.default.unlink(modelPath);
          } catch {
          }
          throw error;
        }
      }
      /**
       * Download all missing required models
       */
      async downloadMissing(onProgress) {
        const statuses = await this.checkModels();
        const missing = statuses.filter((s) => !s.installed || !s.verified);
        const requiredMissing = missing.filter((s) => AVAILABLE_MODELS.find((m) => m.name === s.name)?.required);
        if (requiredMissing.length === 0) {
          console.log("[ModelManager] All required models are installed");
          return;
        }
        console.log(`[ModelManager] Downloading ${requiredMissing.length} missing models...`);
        for (const status of requiredMissing) {
          await this.downloadModel(status.name, onProgress);
        }
        console.log("[ModelManager] All models downloaded successfully");
      }
      /**
       * Verify integrity of a model
       */
      async verifyIntegrity(modelName) {
        const modelPath = this.getModelPath(modelName);
        const model = AVAILABLE_MODELS.find((m) => m.name === modelName);
        if (!model) {
          throw new Error(`Unknown model: ${modelName}`);
        }
        try {
          const stats = await import_promises.default.stat(modelPath);
          const sizeMB = Math.round(stats.size / (1024 * 1024));
          return Math.abs(sizeMB - model.size) / model.size < 0.1;
        } catch {
          return false;
        }
      }
      /**
       * Verify all installed models
       */
      async verifyAll() {
        const statuses = await this.checkModels();
        const required = statuses.filter((s) => AVAILABLE_MODELS.find((m) => m.name === s.name)?.required);
        return required.every((s) => s.installed && s.verified);
      }
      /**
       * Get model path if installed
       */
      async getModelPathIfInstalled(modelName) {
        const installed = await this.isInstalled(modelName);
        return installed ? this.getModelPath(modelName) : null;
      }
      /**
       * Delete a model
       */
      async deleteModel(modelName) {
        const modelPath = this.getModelPath(modelName);
        try {
          await import_promises.default.unlink(modelPath);
          console.log(`[ModelManager] Deleted model: ${modelName}`);
        } catch (error) {
          console.error(`[ModelManager] Failed to delete ${modelName}:`, error);
          throw error;
        }
      }
      /**
       * Get total size of all required models
       */
      getTotalRequiredSize() {
        return AVAILABLE_MODELS.filter((m) => m.required).reduce((sum, m) => sum + m.size, 0);
      }
    };
  }
});

// ../../packages/ai-engine/dist/types.js
var init_types = __esm({
  "../../packages/ai-engine/dist/types.js"() {
    "use strict";
    init_llm_agent();
    init_stt_agent();
    init_tts_agent();
    init_pattern_analyzer();
    init_model_manager();
  }
});

// ../../packages/ai-engine/dist/llama-cpp-agent.js
var import_child_process, import_path2, import_url2, import_meta2, __filename2, __dirname3, LLAMA_SERVER_PATH, MODEL_PATH, DEFAULT_CONFIG4, SYSTEM_PROMPTS2, LlamaCppAgent;
var init_llama_cpp_agent = __esm({
  "../../packages/ai-engine/dist/llama-cpp-agent.js"() {
    "use strict";
    import_child_process = require("child_process");
    import_path2 = __toESM(require("path"), 1);
    import_url2 = require("url");
    import_meta2 = {};
    __filename2 = (0, import_url2.fileURLToPath)(import_meta2.url);
    __dirname3 = import_path2.default.dirname(__filename2);
    LLAMA_SERVER_PATH = import_path2.default.join(__dirname3, "../../../core/ai_engines/llama-cpp/llama-server.exe");
    MODEL_PATH = import_path2.default.join(__dirname3, "../models/qwen2.5-0.5b-q4.gguf");
    DEFAULT_CONFIG4 = {
      modelPath: MODEL_PATH,
      contextSize: 2048,
      temperature: 0.7,
      topP: 0.9,
      maxTokens: 80
      // Short for max speed
    };
    SYSTEM_PROMPTS2 = {
      es: `Sos un ingeniero de carreras argentino profesional.

ANALIZA los datos y da UN consejo espec\xEDfico.

FORMATO:
- M\xE1ximo 20 palabras
- Menciona QU\xC9 detectaste + QU\xC9 hacer
- Directo, sin saludos ni charla

RESPONDE: [QU\xC9 DETECTASTE] + [QU\xC9 HACER]`,
      en: `You are an expert motorsport race engineer with 15+ years of experience in professional racing.
You have deep knowledge of vehicle dynamics, tire management, and racecraft.

Your communication style:
- Direct and actionable
- Uses racing terminology naturally
- Speaks like a professional engineer
- Provides specific, measurable advice
- References exact corners, sectors, and timing

When analyzing telemetry:
1. Identify patterns across laps, not single incidents
2. Prioritize safety-critical issues (brake failures, tire wear)
3. Suggest setup changes when patterns indicate car issues
4. Celebrate improvements and personal bests

Never:
- Give vague advice like "drive faster" or "brake later"
- Overwhelm the driver with info mid-corner
- Contradict yourself lap-to-lap
- Ignore context (fuel saving, tire management strategies)

Be concise: maximum 2 sentences per response.`,
      pt: `Voc\xEA \xE9 um engenheiro de corridas especialista com mais de 15 anos de experi\xEAncia.
Voc\xEA tem conhecimento profundo de din\xE2mica veicular, gerenciamento de pneus e estrat\xE9gia.

Seu estilo de comunica\xE7\xE3o:
- Direto e acion\xE1vel
- Usa terminologia de corridas naturalmente
- Fala como um engenheiro profissional
- Fornece conselhos espec\xEDficos e mensur\xE1veis

Ao analisar telemetria:
1. Identifique padr\xF5es ao longo das voltas
2. Priorize problemas cr\xEDticos de seguran\xE7a
3. Sugira mudan\xE7as de setup quando necess\xE1rio
4. Celebre melhorias e recordes

Seja conciso: m\xE1ximo 2 frases por resposta.`,
      fr: `Vous \xEAtes un ing\xE9nieur de course expert avec plus de 15 ans d'exp\xE9rience.

Votre style de communication:
- Direct et actionnable
- Utilise la terminologie naturellement
- Parle comme un ing\xE9nieur professionnel
- Fournit des conseils sp\xE9cifiques

Soyez concis: maximum 2 phrases par r\xE9ponse.`,
      it: `Sei un ingegnere di gara esperto con oltre 15 anni di esperienza.

Il tuo stile:
- Diretto e attuabile
- Usa terminologia da corsa
- Parla come un professionista
- Fornisce consigli specifici

Sii conciso: massimo 2 frasi per risposta.`
    };
    LlamaCppAgent = class {
      process = null;
      config;
      language = "es";
      serverUrl = "http://localhost:8080";
      ready = false;
      constructor(config2 = {}) {
        this.config = { ...DEFAULT_CONFIG4, ...config2 };
      }
      /**
       * Start llama-server as child process
       */
      async start() {
        console.log("[LlamaCpp] Starting llama-server...");
        console.log("[LlamaCpp] Binary:", LLAMA_SERVER_PATH);
        console.log("[LlamaCpp] Model:", this.config.modelPath);
        const args = [
          "--model",
          this.config.modelPath,
          "--ctx-size",
          this.config.contextSize.toString(),
          "--port",
          "8080",
          "--threads",
          "4",
          // Use 4 threads for balance
          "--n-gpu-layers",
          "0",
          // CPU only (can enable GPU if available)
          "--temp",
          this.config.temperature.toString(),
          "--top-p",
          this.config.topP.toString()
        ];
        this.process = (0, import_child_process.spawn)(LLAMA_SERVER_PATH, args, {
          stdio: ["ignore", "pipe", "pipe"]
        });
        this.process.stdout?.on("data", (data) => {
          const output = data.toString();
          console.log("[LlamaCpp]", output.trim());
          if (output.includes("server is listening")) {
            this.ready = true;
            console.log("[LlamaCpp] \u2713 Server ready");
          }
        });
        this.process.stderr?.on("data", (data) => {
          const output = data.toString();
          console.error("[LlamaCpp ERROR]", output.trim());
          if (output.includes("server is listening")) {
            this.ready = true;
            console.log("[LlamaCpp] \u2713 Server ready");
          }
        });
        this.process.on("exit", (code) => {
          console.log(`[LlamaCpp] Process exited with code ${code}`);
          this.ready = false;
        });
        await this.waitForReady();
      }
      /**
       * Wait for server to be ready
       */
      async waitForReady(timeout = 6e4) {
        const start = Date.now();
        while (!this.ready && Date.now() - start < timeout) {
          await new Promise((resolve) => setTimeout(resolve, 100));
        }
        if (!this.ready) {
          throw new Error("Llama server failed to start within timeout");
        }
      }
      /**
       * Set language for prompts
       */
      setLanguage(language) {
        this.language = language;
      }
      /**
       * Build prompt from telemetry context
       */
      buildPrompt(context, userQuestion) {
        const current = context.currentTelemetry;
        const recentFrames = context.recentFrames || [];
        if (recentFrames.length === 0) {
          return "No hay datos de telemetr\xEDa disponibles.";
        }
        const avgSpeed = recentFrames.reduce((sum, f) => sum + (f.powertrain?.speedKph || 0), 0) / recentFrames.length;
        const maxSpeed = Math.max(...recentFrames.map((f) => f.powertrain?.speedKph || 0));
        const avgRPM = recentFrames.reduce((sum, f) => sum + (f.powertrain?.rpm || 0), 0) / recentFrames.length;
        const avgThrottle = recentFrames.reduce((sum, f) => sum + (f.powertrain?.throttle || 0) * 100, 0) / recentFrames.length;
        const avgBrake = recentFrames.reduce((sum, f) => sum + (f.powertrain?.brake || 0) * 100, 0) / recentFrames.length;
        const avgClutch = recentFrames.reduce((sum, f) => sum + (f.powertrain?.clutch || 0) * 100, 0) / recentFrames.length;
        const avgLateralG = recentFrames.reduce((sum, f) => sum + Math.abs(f.physics?.lateralG || 0), 0) / recentFrames.length;
        const maxLateralG = Math.max(...recentFrames.map((f) => Math.abs(f.physics?.lateralG || 0)));
        const avgLongG = recentFrames.reduce((sum, f) => sum + (f.physics?.longitudinalG || 0), 0) / recentFrames.length;
        const avgSteering = recentFrames.reduce((sum, f) => sum + Math.abs(f.physics?.steeringAngle || 0), 0) / recentFrames.length;
        const brakingEvents = recentFrames.filter((f) => (f.powertrain?.brake || 0) > 0.5).length;
        const hardBraking = recentFrames.filter((f) => (f.physics?.longitudinalG || 0) < -1).length;
        let prompt = `=== AN\xC1LISIS COMPLETO DE TELEMETR\xCDA (\xFAltimos 30 segundos) ===

`;
        prompt += `\u{1F4CD} SESI\xD3N:
`;
        prompt += `- Tipo: ${context.sessionType}
`;
        prompt += `- Pista: ${context.trackId}
`;
        if (current.session) {
          if (current.session.lap)
            prompt += `- Vuelta actual: ${current.session.lap}
`;
          if (current.session.lapsCompleted !== void 0)
            prompt += `- Vueltas completadas: ${current.session.lapsCompleted}
`;
          if (current.session.sessionLapsRemain !== void 0)
            prompt += `- Vueltas restantes: ${current.session.sessionLapsRemain}
`;
          if (current.session.sessionTimeRemain !== void 0) {
            const minsRemain = Math.floor(current.session.sessionTimeRemain / 60);
            prompt += `- Tiempo restante: ${minsRemain} min
`;
          }
          if (current.session.incidents !== void 0)
            prompt += `- Incidentes: ${current.session.incidents}
`;
          if (current.session.onPitRoad)
            prompt += `- \u26A0\uFE0F EN PIT LANE
`;
          if (current.session.inGarage)
            prompt += `- \u26A0\uFE0F EN GARAGE
`;
        }
        if (current.player) {
          prompt += `
\u{1F3C1} POSICI\xD3N:
`;
          if (current.player.position)
            prompt += `- Posici\xF3n general: ${current.player.position}
`;
          if (current.player.classPosition)
            prompt += `- Posici\xF3n en clase: ${current.player.classPosition}
`;
        }
        if (current.lapTimes) {
          prompt += `
\u23F1\uFE0F TIEMPOS:
`;
          if (current.lapTimes.best)
            prompt += `- Mejor vuelta: ${(current.lapTimes.best / 60).toFixed(2)} min
`;
          if (current.lapTimes.last)
            prompt += `- \xDAltima vuelta: ${(current.lapTimes.last / 60).toFixed(2)} min
`;
          if (current.lapTimes.current)
            prompt += `- Vuelta actual: ${(current.lapTimes.current / 60).toFixed(2)} min
`;
        }
        if (current.flags?.sessionFlags !== void 0) {
          prompt += `
\u{1F6A9} BANDERAS:
`;
          const flags = current.flags.sessionFlags;
          if (flags & 1)
            prompt += `- \u26A0\uFE0F BANDERA AMARILLA
`;
          if (flags & 2)
            prompt += `- \u26A0\uFE0F BANDERA AMARILLA AGITADA
`;
          if (flags & 4)
            prompt += `- \u2705 BANDERA VERDE
`;
          if (flags & 8)
            prompt += `- \u2705 BANDERA VERDE SOSTENIDA
`;
          if (flags & 16)
            prompt += `- \u274C BANDERA ROJA
`;
          if (flags & 32)
            prompt += `- \u{1F3C1} BANDERA A CUADROS
`;
          if (flags & 64)
            prompt += `- \u26AA BANDERA BLANCA (\xFAltima vuelta)
`;
          if (flags & 128)
            prompt += `- \u26AB BANDERA NEGRA (descalificaci\xF3n)
`;
        }
        if (current.traffic?.carLeftRight !== void 0) {
          prompt += `
\u{1F697} TR\xC1FICO:
`;
          const lr = current.traffic.carLeftRight;
          if (lr < -0.5)
            prompt += `- \u26A0\uFE0F AUTO A LA IZQUIERDA
`;
          else if (lr > 0.5)
            prompt += `- \u26A0\uFE0F AUTO A LA DERECHA
`;
          else if (Math.abs(lr) < 0.1)
            prompt += `- \u26A0\uFE0F AUTO MUY CERCA
`;
          else
            prompt += `- Pista despejada
`;
        }
        prompt += `
\u{1F3AE} ESTADO ACTUAL:
`;
        prompt += `- Velocidad: ${Math.round(current.powertrain?.speedKph || 0)} km/h
`;
        prompt += `- RPM: ${Math.round(current.powertrain?.rpm || 0)}
`;
        prompt += `- Marcha: ${current.powertrain?.gear || 0}
`;
        prompt += `- Acelerador: ${Math.round((current.powertrain?.throttle || 0) * 100)}%
`;
        prompt += `- Freno: ${Math.round((current.powertrain?.brake || 0) * 100)}%
`;
        prompt += `- Clutch: ${Math.round((current.powertrain?.clutch || 0) * 100)}%
`;
        if (current.engineWarnings) {
          prompt += `
\u26A0\uFE0F ADVERTENCIAS MOTOR:
`;
          prompt += `- C\xF3digo: ${current.engineWarnings}
`;
        }
        if (current.physics) {
          prompt += `
\u26A1 F\xCDSICA:
`;
          if (current.physics.steeringAngle !== void 0) {
            prompt += `- \xC1ngulo volante: ${Math.round(current.physics.steeringAngle)}\xB0
`;
          }
          if (current.physics.lateralG !== void 0) {
            prompt += `- G lateral: ${current.physics.lateralG.toFixed(2)}g
`;
          }
          if (current.physics.longitudinalG !== void 0) {
            prompt += `- G longitudinal: ${current.physics.longitudinalG.toFixed(2)}g
`;
          }
        }
        prompt += `
\u{1F4CA} PROMEDIOS (30 seg):
`;
        prompt += `- Velocidad: ${Math.round(avgSpeed)} km/h (m\xE1x: ${Math.round(maxSpeed)})
`;
        prompt += `- RPM: ${Math.round(avgRPM)}
`;
        prompt += `- Acelerador: ${Math.round(avgThrottle)}%
`;
        prompt += `- Freno: ${Math.round(avgBrake)}%
`;
        prompt += `- Clutch: ${Math.round(avgClutch)}%
`;
        prompt += `- Volante: ${Math.round(avgSteering)}\xB0 promedio
`;
        prompt += `- G lateral: ${avgLateralG.toFixed(2)}g promedio (m\xE1x: ${maxLateralG.toFixed(2)}g)
`;
        prompt += `- G longitudinal: ${avgLongG.toFixed(2)}g promedio
`;
        prompt += `- Frenadas: ${brakingEvents} eventos
`;
        prompt += `- Frenadas fuertes (>1g): ${hardBraking}
`;
        if (current.temps) {
          prompt += `
\u{1F321}\uFE0F TEMPERATURAS:
`;
          if (current.temps.waterC)
            prompt += `- Agua: ${Math.round(current.temps.waterC)}\xB0C
`;
          if (current.temps.oilC)
            prompt += `- Aceite: ${Math.round(current.temps.oilC)}\xB0C
`;
          if (current.temps.trackC)
            prompt += `- Pista: ${Math.round(current.temps.trackC)}\xB0C
`;
          if (current.temps.airC)
            prompt += `- Aire: ${Math.round(current.temps.airC)}\xB0C
`;
          if (current.temps.tyreC && current.temps.tyreC.length > 0) {
            const avgTyre = current.temps.tyreC.reduce((a, b) => a + b, 0) / current.temps.tyreC.length;
            prompt += `- Neum\xE1ticos promedio: ${Math.round(avgTyre)}\xB0C
`;
            prompt += `- Neum\xE1ticos (FL/FR/RL/RR): ${current.temps.tyreC.map((t) => Math.round(t)).join("/")}
`;
          }
          if (current.temps.brakeC && current.temps.brakeC.length > 0) {
            const avgBrake2 = current.temps.brakeC.reduce((a, b) => a + b, 0) / current.temps.brakeC.length;
            prompt += `- Frenos promedio: ${Math.round(avgBrake2)}\xB0C
`;
          }
        }
        if (current.fuel) {
          prompt += `
\u26FD COMBUSTIBLE:
`;
          if (current.fuel.level !== void 0) {
            prompt += `- Nivel: ${current.fuel.level.toFixed(1)} L
`;
          }
          if (current.fuel.levelPct !== void 0) {
            prompt += `- Porcentaje: ${Math.round(current.fuel.levelPct * 100)}%
`;
          }
          if (current.fuel.usePerHour !== void 0) {
            prompt += `- Consumo: ${current.fuel.usePerHour.toFixed(1)} L/h
`;
          }
        }
        if (userQuestion) {
          prompt += `
\u2753 PREGUNTA DEL PILOTO:
"${userQuestion}"
`;
        } else {
          prompt += `
\u{1F3AF} DA UN CONSEJO ESPEC\xCDFICO PARA MEJORAR AHORA (m\xE1ximo 8 palabras):
`;
        }
        prompt += `
[IMPORTANTE: Respond\xE9 SOLAMENTE en espa\xF1ol argentino. NO uses ingl\xE9s.]`;
        return prompt;
      }
      /**
       * Analyze telemetry and generate coaching
       */
      async analyze(context) {
        if (!this.ready) {
          throw new Error("Llama server not ready");
        }
        const prompt = this.buildPrompt(context);
        const systemPrompt = SYSTEM_PROMPTS2[this.language];
        console.log("\n" + "\u{1F4E4}".repeat(50));
        console.log("[LlamaCpp] \u{1F4DD} PROMPT ENVIADO AL LLM:");
        console.log("\u2500".repeat(100));
        console.log(prompt);
        console.log("\u2500".repeat(100));
        console.log("[LlamaCpp] \u23F3 Esperando respuesta del LLM...\n");
        try {
          const response = await fetch(`${this.serverUrl}/completion`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              prompt: `${systemPrompt}

${prompt}`,
              n_predict: this.config.maxTokens,
              temperature: this.config.temperature,
              stop: ["\n\n", "User:", "Piloto:"]
            })
          });
          if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
          }
          const data = await response.json();
          const text = data.content.trim();
          console.log("\n" + "\u{1F4E5}".repeat(50));
          console.log("[LlamaCpp] \u{1F4AC} RESPUESTA DEL LLM:");
          console.log("\u2500".repeat(100));
          console.log(text);
          console.log("\u2500".repeat(100) + "\n");
          return {
            text,
            category: "technique",
            priority: "normal",
            confidence: 0.85
          };
        } catch (error) {
          const err = error;
          console.error("[LlamaCpp] \u274C Error:", err.message);
          throw err;
        }
      }
      /**
       * Answer driver's question
       */
      async answerQuestion(question, context) {
        const insight = await this.analyze({ ...context });
        return insight.text;
      }
      /**
       * Generate response for a generic prompt (used for motivational messages, translations, etc.)
       */
      async generateResponse(prompt, maxTokens = 50) {
        if (!this.ready) {
          throw new Error("Llama server not ready");
        }
        console.log("\n" + "\u{1F4E4}".repeat(50));
        console.log("[LlamaCpp] \u{1F4DD} GENERIC PROMPT:");
        console.log(prompt);
        console.log("\u2500".repeat(100));
        try {
          const response = await fetch(`${this.serverUrl}/completion`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              prompt,
              n_predict: maxTokens,
              temperature: 0.9,
              // Higher temperature for creativity
              stop: ["\n\n", ".", "!", "User:"]
            })
          });
          if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
          }
          const data = await response.json();
          const text = data.content.trim();
          console.log("\n" + "\u{1F4E5}".repeat(50));
          console.log("[LlamaCpp] \u{1F4AC} LLM GENERIC RESPONSE:");
          console.log(text);
          console.log("\u2500".repeat(100) + "\n");
          return text;
        } catch (error) {
          const err = error;
          console.error("[LlamaCpp] \u274C Generic Generation Error:", err.message);
          throw err;
        }
      }
      /**
       * Stop llama-server process
       */
      async stop() {
        if (this.process) {
          console.log("[LlamaCpp] Stopping server...");
          this.process.kill();
          this.process = null;
          this.ready = false;
        }
      }
    };
  }
});

// ../../packages/ai-engine/dist/prerendered-audio-agent.js
var import_path3, import_fs2, import_child_process2, import_url3, import_meta3, __filename3, __dirname4, PrerenderedAudioAgent;
var init_prerendered_audio_agent = __esm({
  "../../packages/ai-engine/dist/prerendered-audio-agent.js"() {
    "use strict";
    import_path3 = __toESM(require("path"), 1);
    import_fs2 = __toESM(require("fs"), 1);
    import_child_process2 = require("child_process");
    import_url3 = require("url");
    import_meta3 = {};
    __filename3 = (0, import_url3.fileURLToPath)(import_meta3.url);
    __dirname4 = import_path3.default.dirname(__filename3);
    PrerenderedAudioAgent = class {
      audioDir;
      volume;
      isPlaying = false;
      queue = [];
      // Cache to check if files exist before trying to play
      availableFiles = /* @__PURE__ */ new Set();
      constructor(config2 = {}) {
        const devPath = import_path3.default.resolve(__dirname4, "../../../core/ai_engines/piper/prerendered");
        this.audioDir = config2.audioDir || devPath;
        if (!import_fs2.default.existsSync(this.audioDir)) {
          console.warn(`[AudioAgent] \u26A0\uFE0F WARN: Audio directory missing at ${this.audioDir}`);
          const fallbackPath = import_path3.default.resolve(process.cwd(), "core/ai_engines/piper/prerendered");
          if (import_fs2.default.existsSync(fallbackPath)) {
            this.audioDir = fallbackPath;
          }
        }
        this.volume = config2.volume || 1;
        this.scanAvailableFiles();
      }
      scanAvailableFiles() {
        try {
          if (import_fs2.default.existsSync(this.audioDir)) {
            const files = import_fs2.default.readdirSync(this.audioDir);
            files.forEach((file) => {
              if (file.endsWith(".wav")) {
                this.availableFiles.add(file.replace(".wav", ""));
              }
            });
            console.log(`[AudioAgent] Indexed ${this.availableFiles.size} audio files in ${this.audioDir}`);
          } else {
            console.warn(`[AudioAgent] Warning: Audio directory not found: ${this.audioDir}`);
          }
        } catch (err) {
          console.error("[AudioAgent] Failed to scan audio files:", err);
        }
      }
      async initialize() {
        console.log("[AudioAgent] Initialized (ffplay Mode)");
        (0, import_child_process2.exec)("ffplay -version", (err) => {
          if (err) {
            console.warn("[AudioAgent] \u26A0\uFE0F ffplay not found in PATH. Audio may fail.");
          } else {
            console.log("[AudioAgent] \u2705 ffplay found.");
          }
        });
        return Promise.resolve();
      }
      async speak(ruleId, priority = "normal") {
        if (priority === "urgent") {
          this.queue.unshift(ruleId);
        } else {
          this.queue.push(ruleId);
        }
        this.processQueue();
      }
      async processQueue() {
        if (this.isPlaying || this.queue.length === 0)
          return;
        this.isPlaying = true;
        const ruleId = this.queue.shift();
        try {
          if (ruleId) {
            if (this.availableFiles.has(ruleId)) {
              const filePath = import_path3.default.join(this.audioDir, `${ruleId}.wav`);
              await this.playWithFFplay(filePath);
            }
          }
        } catch (error) {
          console.error("[AudioAgent] Playback error:", error);
        } finally {
          this.isPlaying = false;
          if (this.queue.length > 0) {
            setTimeout(() => this.processQueue(), 100);
          }
        }
      }
      playWithFFplay(filePath) {
        return new Promise((resolve) => {
          const command = `ffplay -nodisp -autoexit -v 0 "${filePath}"`;
          (0, import_child_process2.exec)(command, (error) => {
            if (error) {
              console.error("[AudioAgent] ffplay Error:", error.message);
            }
            resolve();
          });
        });
      }
      isSpeaking() {
        return this.isPlaying;
      }
      getQueueLength() {
        return this.queue.length;
      }
      setLanguage(lang) {
      }
      async dispose() {
        this.queue = [];
        this.isPlaying = false;
      }
    };
  }
});

// ../../packages/ai-engine/dist/telemetry-buffer.js
var TelemetryBuffer;
var init_telemetry_buffer = __esm({
  "../../packages/ai-engine/dist/telemetry-buffer.js"() {
    "use strict";
    TelemetryBuffer = class {
      config;
      frames = [];
      windowStartTime = 0;
      isCapturing = false;
      constructor(config2 = {}) {
        this.config = {
          windowDurationMs: config2.windowDurationMs ?? 3e4,
          // 30 segundos
          framesPerSecond: config2.framesPerSecond ?? 60,
          onWindowComplete: config2.onWindowComplete
        };
      }
      /**
       * Inicia la captura de telemetría
       */
      startCapture() {
        this.frames = [];
        this.windowStartTime = Date.now();
        this.isCapturing = true;
        console.log(`[TelemetryBuffer] \u25B6 Iniciando captura de ${this.config.windowDurationMs / 1e3}s...`);
      }
      /**
       * Agrega un frame de telemetría al buffer
       * Devuelve true si la ventana se completó y fue procesada
       */
      addFrame(frame) {
        if (!this.isCapturing) {
          console.log("[TelemetryBuffer] \u25B6 Iniciando captura de ventana...");
          this.startCapture();
        }
        this.frames.push(frame);
        const elapsed = Date.now() - this.windowStartTime;
        if (this.frames.length % 300 === 0) {
          console.log(`[TelemetryBuffer] \u{1F4CA} frames=${this.frames.length}, elapsed=${(elapsed / 1e3).toFixed(1)}s/${this.config.windowDurationMs / 1e3}s (${Math.round(elapsed / this.config.windowDurationMs * 100)}%)`);
        }
        if (elapsed >= this.config.windowDurationMs) {
          this.completeWindow();
          return true;
        }
        return false;
      }
      /**
       * Fuerza completar la ventana actual (para testing o cuando termina la sesión)
       */
      forceComplete() {
        if (this.frames.length === 0)
          return null;
        return this.completeWindow();
      }
      /**
       * Completa la ventana actual, genera resumen y reinicia
       */
      completeWindow() {
        const window = {
          frames: [...this.frames],
          startTime: this.windowStartTime,
          endTime: Date.now(),
          summary: this.calculateSummary()
        };
        console.log(`[TelemetryBuffer] \u2713 Ventana completada: ${this.frames.length} frames, ${((window.endTime - window.startTime) / 1e3).toFixed(1)}s`);
        if (this.config.onWindowComplete) {
          this.config.onWindowComplete(window);
        }
        this.frames = [];
        this.windowStartTime = Date.now();
        return window;
      }
      /**
       * Calcula resumen de la ventana actual
       */
      calculateSummary() {
        const frames = this.frames;
        const count = frames.length;
        if (count === 0) {
          return this.emptySummary();
        }
        const fps = this.config.framesPerSecond;
        const speeds = frames.map((f) => f.powertrain?.speedKph ?? 0);
        const avgSpeedKph = speeds.reduce((a, b) => a + b, 0) / count;
        const maxSpeedKph = Math.max(...speeds);
        const minSpeedKph = Math.min(...speeds.filter((s) => s > 0)) || 0;
        const rpms = frames.map((f) => f.powertrain?.rpm ?? 0);
        const avgRpm = rpms.reduce((a, b) => a + b, 0) / count;
        const maxRpm = Math.max(...rpms);
        const overRevFrames = frames.filter((f) => (f.powertrain?.rpm ?? 0) > 7500).length;
        const overRevSeconds = overRevFrames / fps;
        const brakes = frames.map((f) => (f.powertrain?.brake ?? 0) * 100);
        const avgBrakePct = brakes.reduce((a, b) => a + b, 0) / count;
        const maxBrakePct = Math.max(...brakes);
        const hardBrakingEvents = this.countBrakingEvents(frames);
        const throttles = frames.map((f) => (f.powertrain?.throttle ?? 0) * 100);
        const avgThrottlePct = throttles.reduce((a, b) => a + b, 0) / count;
        const fullThrottleFrames = throttles.filter((t) => t > 95).length;
        const fullThrottlePct = fullThrottleFrames / count * 100;
        const liftCount = this.countThrottleLifts(frames);
        const steerings = frames.map((f) => Math.abs(f.physics?.steeringAngle ?? 0));
        const avgSteeringAngle = steerings.reduce((a, b) => a + b, 0) / count;
        const maxSteeringAngle = Math.max(...steerings);
        const correctionCount = this.countSteeringCorrections(frames);
        const latGs = frames.map((f) => Math.abs(f.physics?.lateralG ?? 0));
        const longGs = frames.map((f) => f.physics?.longitudinalG ?? 0);
        const avgLateralG = latGs.reduce((a, b) => a + b, 0) / count;
        const maxLateralG = Math.max(...latGs);
        const avgLongG = longGs.reduce((a, b) => a + b, 0) / count;
        const maxLongG = Math.min(...longGs);
        const avgTyreTemps = [0, 1, 2, 3].map((i) => frames.reduce((sum, f) => sum + (f.temps?.tyreC?.[i] ?? 0), 0) / count);
        const maxTyreTemps = [0, 1, 2, 3].map((i) => Math.max(...frames.map((f) => f.temps?.tyreC?.[i] ?? 0)));
        const waters = frames.map((f) => f.temps?.waterC ?? 0);
        const oils = frames.map((f) => f.temps?.oilC ?? 0);
        const avgWaterTemp = waters.reduce((a, b) => a + b, 0) / count;
        const maxWaterTemp = Math.max(...waters);
        const avgOilTemp = oils.reduce((a, b) => a + b, 0) / count;
        const maxOilTemp = Math.max(...oils);
        const firstFuel = frames[0].fuel?.level ?? 0;
        const lastFuel = frames[frames.length - 1].fuel?.level ?? 0;
        const fuelUsed = Math.max(0, firstFuel - lastFuel);
        const fuelAtEnd = lastFuel;
        const firstIncidents = frames[0].session?.incidents ?? 0;
        const lastIncidents = frames[frames.length - 1].session?.incidents ?? 0;
        const incidentsDelta = lastIncidents - firstIncidents;
        const lapNumber = frames[frames.length - 1].session?.lap ?? 0;
        const lapDistPctStart = frames[0].session?.lapDistPct ?? 0;
        const lapDistPctEnd = frames[frames.length - 1].session?.lapDistPct ?? 0;
        return {
          avgSpeedKph,
          maxSpeedKph,
          minSpeedKph,
          avgRpm,
          maxRpm,
          overRevSeconds,
          avgBrakePct,
          maxBrakePct,
          hardBrakingEvents,
          avgThrottlePct,
          fullThrottlePct,
          liftCount,
          avgSteeringAngle,
          maxSteeringAngle,
          correctionCount,
          avgLateralG,
          maxLateralG,
          avgLongG,
          maxLongG,
          avgTyreTemps,
          maxTyreTemps,
          avgWaterTemp,
          maxWaterTemp,
          avgOilTemp,
          maxOilTemp,
          fuelUsed,
          fuelAtEnd,
          incidentsDelta,
          lapNumber,
          lapDistPctStart,
          lapDistPctEnd
        };
      }
      emptySummary() {
        return {
          avgSpeedKph: 0,
          maxSpeedKph: 0,
          minSpeedKph: 0,
          avgRpm: 0,
          maxRpm: 0,
          overRevSeconds: 0,
          avgBrakePct: 0,
          maxBrakePct: 0,
          hardBrakingEvents: 0,
          avgThrottlePct: 0,
          fullThrottlePct: 0,
          liftCount: 0,
          avgSteeringAngle: 0,
          maxSteeringAngle: 0,
          correctionCount: 0,
          avgLateralG: 0,
          maxLateralG: 0,
          avgLongG: 0,
          maxLongG: 0,
          avgTyreTemps: [0, 0, 0, 0],
          maxTyreTemps: [0, 0, 0, 0],
          avgWaterTemp: 0,
          maxWaterTemp: 0,
          avgOilTemp: 0,
          maxOilTemp: 0,
          fuelUsed: 0,
          fuelAtEnd: 0,
          incidentsDelta: 0,
          lapNumber: 0,
          lapDistPctStart: 0,
          lapDistPctEnd: 0
        };
      }
      countBrakingEvents(frames) {
        let events = 0;
        let inBraking = false;
        for (const f of frames) {
          const brake = (f.powertrain?.brake ?? 0) * 100;
          if (brake > 80 && !inBraking) {
            events++;
            inBraking = true;
          } else if (brake < 20) {
            inBraking = false;
          }
        }
        return events;
      }
      countThrottleLifts(frames) {
        let lifts = 0;
        let wasFullThrottle = false;
        for (const f of frames) {
          const throttle = (f.powertrain?.throttle ?? 0) * 100;
          if (throttle > 95) {
            wasFullThrottle = true;
          } else if (throttle < 50 && wasFullThrottle) {
            lifts++;
            wasFullThrottle = false;
          }
        }
        return lifts;
      }
      countSteeringCorrections(frames) {
        let corrections = 0;
        for (let i = 2; i < frames.length; i++) {
          const prev = frames[i - 1].physics?.steeringAngle ?? 0;
          const curr = frames[i].physics?.steeringAngle ?? 0;
          if (Math.sign(prev) !== Math.sign(curr) && Math.abs(prev) > 0.1 && Math.abs(curr) > 0.1) {
            corrections++;
          }
        }
        return corrections;
      }
      // ============================================
      // GETTERS
      // ============================================
      /**
       * Obtiene los frames actuales (ventana en progreso)
       */
      getCurrentFrames() {
        return [...this.frames];
      }
      /**
       * Obtiene el frame más reciente
       */
      getLastFrame() {
        return this.frames[this.frames.length - 1] ?? null;
      }
      /**
       * Tiempo restante para completar la ventana (ms)
       */
      getRemainingTimeMs() {
        const elapsed = Date.now() - this.windowStartTime;
        return Math.max(0, this.config.windowDurationMs - elapsed);
      }
      /**
       * Progreso de la ventana actual (0-100)
       */
      getProgress() {
        const elapsed = Date.now() - this.windowStartTime;
        return Math.min(100, elapsed / this.config.windowDurationMs * 100);
      }
      /**
       * Estadísticas del buffer
       */
      getStats() {
        return {
          frameCount: this.frames.length,
          durationMs: Date.now() - this.windowStartTime,
          progress: this.getProgress()
        };
      }
      /**
       * Está capturando?
       */
      isActive() {
        return this.isCapturing;
      }
      /**
       * Detiene la captura
       */
      stop() {
        this.isCapturing = false;
        this.frames = [];
        console.log(`[TelemetryBuffer] \u23F9 Captura detenida`);
      }
      /**
       * Exporta los frames actuales a JSON
       */
      exportToJSON() {
        return JSON.stringify({
          frames: this.frames,
          summary: this.calculateSummary(),
          startTime: this.windowStartTime,
          exportTime: Date.now()
        }, null, 2);
      }
    };
  }
});

// ../../packages/ai-engine/dist/rules/suspension-rules.js
var SUSPENSION_RULES;
var init_suspension_rules = __esm({
  "../../packages/ai-engine/dist/rules/suspension-rules.js"() {
    "use strict";
    SUSPENSION_RULES = [
      {
        id: "suspension-bottoming",
        category: "technique",
        priority: 6,
        condition: (d) => {
          return d.patterns.bottomingCount > 5;
        },
        advice: "Est\xE1s golpeando el fondo plano, endurec\xE9 la compresi\xF3n r\xE1pida.",
        cooldown: 60
      },
      {
        id: "suspension-travel-limit",
        category: "technique",
        priority: 7,
        condition: (d) => {
          if (!d.current?.suspension?.shockDeflection)
            return false;
          return d.current.suspension.shockDeflection.some((val) => Math.abs(val) > 0.13);
        },
        advice: "Ojo con los cortes, la suspensi\xF3n est\xE1 llegando al tope.",
        cooldown: 20
      }
    ];
  }
});

// ../../packages/ai-engine/dist/rules/aero-rules.js
var AERO_RULES;
var init_aero_rules = __esm({
  "../../packages/ai-engine/dist/rules/aero-rules.js"() {
    "use strict";
    AERO_RULES = [
      {
        id: "aero-unstable-rake",
        category: "technique",
        // or strategy/setup
        priority: 6,
        condition: (d) => {
          return d.patterns.rakeInstabilityCount > 10;
        },
        advice: "El auto est\xE1 inestable, el rake var\xEDa demasiado en frenada.",
        cooldown: 50
      },
      {
        id: "aero-drag-warning",
        category: "strategy",
        priority: 4,
        condition: (d) => {
          if (!d.current.aero?.rake)
            return false;
          return d.current.aero.rake > 0.025 && d.averages.speed > 200;
        },
        advice: "Mucha carga aerodin\xE1mica, estamos perdiendo velocidad punta.",
        cooldown: 120
      }
    ];
  }
});

// ../../packages/ai-engine/dist/rules/advanced-rules.js
var ADVANCED_RULES;
var init_advanced_rules = __esm({
  "../../packages/ai-engine/dist/rules/advanced-rules.js"() {
    "use strict";
    ADVANCED_RULES = [
      // ==========================================
      // A. VEHICLE DYNAMICS (HANDLING) - 10 Rules
      // ==========================================
      {
        id: "dyn-understeer-entry",
        category: "technique",
        priority: 8,
        condition: (d) => d.patterns.understeerFactor > 0.5 && (d.current.powertrain?.brake || 0) > 0.1,
        advice: "Barriendo la trompa en la entrada. Solt\xE1 freno para que muerda.",
        cooldown: 40
      },
      {
        id: "dyn-understeer-mid",
        category: "technique",
        priority: 7,
        condition: (d) => d.patterns.understeerFactor > 0.4 && (d.current.powertrain?.throttle || 0) > 0.1,
        advice: "Ida de trompa en el medio. Esper\xE1 la rotaci\xF3n antes de dar gas.",
        cooldown: 40
      },
      {
        id: "dyn-snap-oversteer",
        category: "technique",
        priority: 9,
        condition: (d) => d.patterns.oversteerFactor > 0.8,
        advice: "\xA1Latigazo! Correg\xED suave, no pelees con el volante.",
        cooldown: 30
      },
      {
        id: "dyn-power-oversteer",
        category: "technique",
        priority: 8,
        condition: (d) => d.patterns.oversteerFactor > 0.5 && (d.current.powertrain?.throttle || 0) > 0.8,
        advice: "Mucha potencia con la direcci\xF3n cruzada. Dosific\xE1 el pie derecho.",
        cooldown: 35
      },
      {
        id: "dyn-pendulum",
        category: "technique",
        priority: 8,
        condition: (d) => d.patterns.aggressiveSteeringCount > 5 && d.patterns.oversteerFactor > 0.3,
        advice: "Efecto p\xE9ndulo. No tires el auto de un lado al otro, s\xE9 progresivo.",
        cooldown: 45
      },
      {
        id: "dyn-excessive-roll",
        category: "strategy",
        priority: 5,
        condition: (d) => Math.abs(d.averages.lateralG) > 2.5,
        // Unrealistic for most cars without sterile setup
        advice: "El auto rola demasiado. Endurec\xE9 las barras estabilizadoras.",
        cooldown: 120
      },
      {
        id: "dyn-nose-dive",
        category: "strategy",
        priority: 5,
        condition: (d) => (d.current.physics?.longitudinalG || 0) < -1.8 && (d.current.suspension?.shockDeflection?.[0] || 0) > 0.1,
        advice: "Mucho cabeceo en frenada. Sub\xED la compresi\xF3n delantera.",
        cooldown: 60
      },
      {
        id: "dyn-rear-squat",
        category: "strategy",
        priority: 5,
        condition: (d) => (d.current.physics?.longitudinalG || 0) > 0.8 && (d.current.suspension?.shockDeflection?.[2] || 0) > 0.1,
        advice: "El auto se sienta mucho al acelerar. Endurec\xE9 la trasera.",
        cooldown: 60
      },
      {
        id: "dyn-scrub-radius",
        category: "technique",
        priority: 6,
        condition: (d) => d.patterns.understeerFactor > 0.3 && d.averages.speed < 60,
        advice: "Est\xE1s arrastrando las gomas en lo lento. Abr\xED m\xE1s la direcci\xF3n.",
        cooldown: 50
      },
      {
        id: "dyn-steering-lock",
        category: "technique",
        priority: 7,
        condition: (d) => Math.abs(d.current.physics?.steeringAngle || 0) > 3,
        // rads (~170 deg)
        advice: "Est\xE1s cruzando demasiado los brazos. Us\xE1 m\xE1s pista, no tanto volante.",
        cooldown: 40
      },
      // ==========================================
      // B. BRAKING & CORNERING (10 Rules)
      // ==========================================
      {
        id: "brk-early-release",
        category: "technique",
        priority: 7,
        condition: (d) => d.patterns.hardBrakingCount > 2 && (d.current.powertrain?.brake || 0) < 0.05 && d.patterns.understeerFactor > 0.2,
        advice: "Soltaste el freno muy pronto. Aguantalo hasta el v\xE9rtice.",
        cooldown: 45
      },
      {
        id: "brk-late-brake",
        category: "technique",
        priority: 8,
        condition: (d) => d.patterns.hardBrakingCount > 0 && d.current.session?.isOnTrack === false,
        advice: "Te tiraste muy tarde fiera. Referenci\xE1 antes, no somos h\xE9roes.",
        cooldown: 60
      },
      {
        id: "brk-abs-reliance",
        category: "technique",
        priority: 6,
        condition: (d) => (d.current.carControls?.absActive || false) && (d.current.powertrain?.brake || 0) > 0.95,
        advice: "Est\xE1s colgado del ABS. Fren\xE1 al 90%, no mates el sistema.",
        cooldown: 40
      },
      {
        id: "brk-migration-fwd",
        category: "strategy",
        priority: 5,
        condition: (d) => d.patterns.hardBrakingCount > 3 && d.patterns.understeerFactor > 0.3,
        advice: "Frenada muy delantera. Tir\xE1 el balance de frenos para atr\xE1s.",
        cooldown: 120
      },
      {
        id: "brk-migration-rwd",
        category: "strategy",
        priority: 5,
        condition: (d) => d.patterns.hardBrakingCount > 3 && d.patterns.oversteerFactor > 0.3,
        advice: "La cola te quiere pasar frenando. Pas\xE1 balance adelante.",
        cooldown: 120
      },
      {
        id: "cor-early-apex",
        category: "technique",
        priority: 7,
        condition: (d) => d.patterns.understeerFactor > 0.4 && (d.current.powertrain?.throttle || 0) > 0.5,
        advice: "Le pegaste muy temprano a la cuerda. Te qued\xE1s sin pista a la salida.",
        cooldown: 50
      },
      {
        id: "cor-missed-apex",
        category: "technique",
        priority: 6,
        condition: (d) => d.patterns.understeerFactor > 0.2 && d.averages.speed < 50,
        advice: "Lej\xEDsimos del piano interno. Achic\xE1 el radio, regal\xE1s metros.",
        cooldown: 50
      },
      {
        id: "cor-v-shape",
        category: "technique",
        priority: 6,
        condition: (d) => d.patterns.hardBrakingCount > 4 && d.averages.speed < 80,
        advice: "Hac\xE9 la curva en V. Entr\xE1 fuerte, rotalo y sal\xED derecho.",
        cooldown: 60
      },
      {
        id: "cor-u-shape",
        category: "technique",
        priority: 6,
        condition: (d) => d.averages.lateralG > 1.5 && d.averages.speed > 120,
        advice: "Redonde\xE1 la trazada. Manten\xE9 velocidad de paso en lo r\xE1pido.",
        cooldown: 60
      },
      {
        id: "brk-temperature-spike",
        category: "brakes",
        priority: 9,
        condition: (d) => (d.current.temps?.brakeC?.[0] || 0) > 600,
        advice: "\xA1Fuego en los discos! Mov\xE9 el reparto o refriger\xE1, se cristalizan.",
        cooldown: 40
      },
      // ==========================================
      // C. TRACTION & GEARS (10 Rules)
      // ==========================================
      {
        id: "trac-wheelspin-low",
        category: "technique",
        priority: 7,
        condition: (d) => d.patterns.tractionLossCount > 3 && (d.current.powertrain?.gear || 0) < 3,
        advice: "Patinando en baja. Dosific\xE1 el pie o sub\xED una marcha.",
        cooldown: 30
      },
      {
        id: "trac-wheelspin-exit",
        category: "technique",
        priority: 8,
        condition: (d) => d.patterns.tractionLossCount > 2 && (d.current.powertrain?.throttle || 0) > 0.9,
        advice: "Tracci\xF3n comprometida. Enderez\xE1 el volante antes de planchar el acelerador.",
        cooldown: 35
      },
      {
        id: "trac-short-shift",
        category: "technique",
        priority: 6,
        condition: (d) => d.patterns.tractionLossCount > 5,
        advice: "La pista est\xE1 lavada. Tir\xE1 el cambio antes (short-shift) para no patinar.",
        cooldown: 60
      },
      {
        id: "gr-grinding",
        category: "engine",
        priority: 9,
        condition: (d) => false,
        // Requires specific telemetry "ShiftGrindRPM", usually not exposed easily
        advice: "\xA1Cuidado la caja! Est\xE1s errando el cambio, marc\xE1 bien el movimiento.",
        cooldown: 30
      },
      {
        id: "gr-money-shift",
        category: "engine",
        priority: 10,
        condition: (d) => (d.current.powertrain?.rpm || 0) > 8500,
        // Generic limit
        advice: "\xA1Pasaste de vueltas el motor! Cuidado con los rebajes asesinos.",
        cooldown: 30
      },
      {
        id: "gr-clutch-kick",
        category: "technique",
        priority: 5,
        condition: (d) => (d.current.powertrain?.clutch || 0) > 0.5 && d.averages.speed > 50 && (d.current.powertrain?.throttle || 0) > 0.8,
        advice: "\xBFQu\xE9 hac\xE9s picando embrague? Esto no es drift, cuid\xE1 la transmisi\xF3n.",
        cooldown: 60
      },
      {
        id: "trac-tc-intrusion",
        category: "technique",
        priority: 6,
        condition: (d) => (d.current.carControls?.tcLevel || 0) > 10,
        // Assuming high TC intervention
        advice: "El control de tracci\xF3n te est\xE1 frenando. Bajale un punto al TC.",
        cooldown: 120
      },
      {
        id: "trac-diff-lock",
        category: "strategy",
        priority: 5,
        condition: (d) => d.patterns.tractionLossCount > 4 && d.averages.speed < 100,
        advice: "El diferencial est\xE1 muy abierto. Cerralo un poco para traccionar.",
        cooldown: 120
      },
      {
        id: "trac-throttle-map",
        category: "strategy",
        priority: 4,
        condition: (d) => d.patterns.throttleChanges > 30,
        // Very jerky
        advice: "Est\xE1s muy nervioso con el gas. Suaviz\xE1 el mapa de acelerador.",
        cooldown: 120
      },
      {
        id: "gr-first-gear",
        category: "technique",
        priority: 5,
        condition: (d) => (d.current.powertrain?.gear || 0) === 1 && d.averages.speed > 30,
        advice: "No pongas primera en la horquilla, mat\xE1s la inercia. Us\xE1 segunda.",
        cooldown: 45
      },
      // ==========================================
      // D. TIRES & STRATEGY (10 Rules)
      // ==========================================
      {
        id: "tyre-flat-spot",
        category: "tyres",
        priority: 9,
        condition: (d) => d.patterns.hardBrakingCount > 5 && d.current.session?.incidents !== void 0,
        // Placeholder pattern
        advice: "\xA1Bloqueaste feo! Ten\xE9s un plano en la goma, vas a sentir la vibraci\xF3n.",
        cooldown: 60
      },
      {
        id: "tyre-grainig",
        category: "tyres",
        priority: 6,
        condition: (d) => d.patterns.understeerFactor > 0.4 && d.averages.tyreC[0] < 70,
        advice: "Graining delantero. La goma se est\xE1 rompiendo por fr\xEDo y arrastre.",
        cooldown: 60
      },
      {
        id: "tyre-blistering",
        category: "tyres",
        priority: 8,
        condition: (d) => d.averages.tyreC.some((t) => t > 110),
        advice: "Ampollas en la banda de rodadura (blistering). Refriger\xE1 esas gomas ya.",
        cooldown: 60
      },
      {
        id: "tyre-puncture-slow",
        category: "tyres",
        priority: 10,
        condition: (d) => false,
        // Need pressure delta logic
        advice: "Pinchadura lenta detectada. Entr\xE1 a boxes, no llegamos.",
        cooldown: 30
      },
      {
        id: "strat-box-window",
        category: "strategy",
        priority: 8,
        condition: (d) => (d.current.session?.sessionLapsRemain || 100) < 5 && (d.current.fuel?.level || 0) < 5,
        advice: "Ventana de parada abierta. \xA1Box, Box, Box esta vuelta!",
        cooldown: 60
      },
      {
        id: "strat-push-pass",
        category: "strategy",
        priority: 7,
        condition: (d) => (d.current.p2p?.count || 0) > 0 && d.patterns.isImproving,
        // If we have P2P and are fast
        advice: "Ten\xE9s Push-to-Pass disponible. Usalo en la recta opuesta.",
        cooldown: 120
      },
      {
        id: "strat-fuel-mix",
        category: "strategy",
        priority: 5,
        condition: (d) => (d.current.session?.sessionLapsRemain || 0) > 10 && d.patterns.fuelUsedInBuffer > 2,
        // High consumption
        advice: "Estamos cortos de nafta. Pas\xE1 a mapa econ\xF3mico (Mix 2).",
        cooldown: 120
      },
      {
        id: "strat-brake-bias-adj",
        category: "strategy",
        priority: 5,
        condition: (d) => d.patterns.fuelUsedInBuffer < 0.5,
        // Car getting lighter
        advice: "El tanque se vac\xEDa. Acordate de mover el freno para atr\xE1s.",
        cooldown: 300
        // Once per stint usually
      },
      {
        id: "strat-blue-flag-ignore",
        category: "strategy",
        priority: 9,
        condition: (d) => (d.current.flags?.sessionFlags || 0) === 16,
        // Placeholder hex for Blue
        advice: "Bandera azul agitada. Respet\xE1 al l\xEDder, levant\xE1 en la recta.",
        cooldown: 20
      },
      {
        id: "strat-last-lap",
        category: "strategy",
        priority: 10,
        condition: (d) => (d.current.session?.sessionLapsRemain || 10) === 1,
        advice: "\xDAltima vuelta. A morir nada, cuid\xE1 la cuerda y traelo a casa.",
        cooldown: 999
      },
      // ==========================================
      // E. RACECRAFT & MINDSET (10 Rules)
      // ==========================================
      {
        id: "mind-focus-loss",
        category: "technique",
        priority: 6,
        condition: (d) => d.patterns.incidentCount > 2 && d.lapTimes.current > d.lapTimes.last + 1,
        advice: "Perdiste el foco. Respir\xE1 hondo, mir\xE1 lejos y resete\xE1.",
        cooldown: 60
      },
      {
        id: "mind-consistency",
        category: "technique",
        priority: 7,
        condition: (d) => d.patterns.isImproving && Math.abs(d.lapTimes.current - d.lapTimes.best) < 0.2,
        advice: "Sos un relojito suizo. Manten\xE9 ese ritmo, calco tras calco.",
        cooldown: 60
      },
      {
        id: "mind-anger-management",
        category: "technique",
        priority: 9,
        condition: (d) => d.patterns.incidentCount > 4,
        // Many incidents rapidly
        advice: "\xA1Cortala! Est\xE1s manejando con bronca y vas a romper todo. Cabeza fr\xEDa.",
        cooldown: 60
      },
      {
        id: "mind-breathing",
        category: "technique",
        priority: 4,
        condition: (d) => d.averages.speed > 250,
        // Long straight
        advice: "Aprovech\xE1 la recta. Relaj\xE1 las manos y respir\xE1.",
        cooldown: 180
      },
      {
        id: "race-gap-closing",
        category: "strategy",
        priority: 7,
        condition: (d) => d.patterns.isImproving,
        // Needs gap logic
        advice: "Le descontaste tres d\xE9cimas al de adelante. Ya lo ten\xE9s en succi\xF3n.",
        cooldown: 60
      },
      {
        id: "race-defense",
        category: "strategy",
        priority: 8,
        condition: (d) => false,
        // Needs gap behind logic
        advice: "Te buscan por adentro. Hac\xE9 el radio de giro defensivo.",
        cooldown: 40
      },
      {
        id: "race-attack",
        category: "strategy",
        priority: 8,
        condition: (d) => false,
        // Needs gap ahead logic
        advice: "Tirale el auto. Hac\xE9 la tijera a la salida.",
        cooldown: 40
      },
      {
        id: "race-start-ready",
        category: "strategy",
        priority: 10,
        condition: (d) => (d.current.powertrain?.speedKph || 0) < 1 && (d.current.powertrain?.rpm || 0) > 0,
        advice: "Primera colocada. Busc\xE1 el punto de fricci\xF3n del embrague... \xA1Verde!",
        cooldown: 999
      },
      {
        id: "race-finish-cool",
        category: "strategy",
        priority: 5,
        condition: (d) => false,
        // Needs finish flag logic
        advice: "Bandera a cuadros. Vuelta de honor tranquila, refriger\xE1 frenos.",
        cooldown: 999
      },
      {
        id: "race-damage-report",
        category: "strategy",
        priority: 9,
        condition: (d) => (d.current.temps?.waterC || 0) > 110,
        advice: "El auto est\xE1 herido. Llevelo despacito a boxes.",
        cooldown: 60
      }
    ];
  }
});

// ../../packages/ai-engine/dist/telemetry-rules.js
var TELEMETRY_RULES;
var init_telemetry_rules = __esm({
  "../../packages/ai-engine/dist/telemetry-rules.js"() {
    "use strict";
    init_suspension_rules();
    init_aero_rules();
    init_advanced_rules();
    TELEMETRY_RULES = [
      // Include Phase 6 Rules (Pro Engineer)
      ...ADVANCED_RULES,
      // Include Phase 5 Rules
      ...SUSPENSION_RULES,
      ...AERO_RULES,
      // ========================================
      // CATEGORÍA 1: TÉCNICA DE PEDALES
      // ========================================
      {
        id: "throttle-punch",
        category: "technique",
        priority: 7,
        condition: (d) => {
          if (!d.patterns || d.patterns.throttleChanges === void 0)
            return false;
          return d.patterns.throttleChanges > 20;
        },
        advice: "Entrada de potencia muy brusca, aplic\xE1 el acelerador m\xE1s gradual",
        cooldown: 40
      },
      {
        id: "pedal-fidgeting",
        category: "technique",
        priority: 6,
        condition: (d) => {
          if (!d.patterns || d.patterns.throttleChanges === void 0 || d.patterns.hardBrakingCount === void 0)
            return false;
          return d.patterns.throttleChanges > 15 && d.patterns.hardBrakingCount > 5;
        },
        advice: "Demasiado movimiento en los pedales, suaviz\xE1 las transiciones",
        cooldown: 45
      },
      {
        id: "brake-riding",
        category: "technique",
        priority: 8,
        condition: (d) => {
          if (!d.current?.powertrain)
            return false;
          const throttle = d.current.powertrain.throttle ?? 0;
          const brake = d.current.powertrain.brake ?? 0;
          return throttle > 0.3 && brake > 0.1;
        },
        advice: "Est\xE1s pisando freno y acelerador al mismo tiempo, es ineficiente",
        cooldown: 30
      },
      {
        id: "soft-braking",
        category: "technique",
        priority: 5,
        condition: (d) => {
          if (!d.patterns || d.patterns.hardBrakingCount === void 0 || !d.averages || d.averages.speed === void 0)
            return false;
          return d.patterns.hardBrakingCount < 2 && d.averages.speed > 60;
        },
        advice: "Frenadas muy suaves, metele m\xE1s presi\xF3n inicial",
        cooldown: 50
      },
      {
        id: "brake-stomp",
        category: "technique",
        priority: 7,
        condition: (d) => {
          if (!d.patterns || d.patterns.hardBrakingCount === void 0)
            return false;
          return d.patterns.hardBrakingCount > 8;
        },
        advice: "Frenadas muy bruscas, graduar mejor la presi\xF3n del pedal",
        cooldown: 40
      },
      {
        id: "lazy-throttle",
        category: "technique",
        priority: 6,
        condition: (d) => {
          if (!d.averages || d.averages.throttle === void 0 || d.averages.speed === void 0)
            return false;
          const throttle = d.averages.throttle;
          return throttle < 50 && d.averages.speed > 70;
        },
        advice: "Est\xE1s demorando mucho en acelerar despu\xE9s del apex, dale antes",
        cooldown: 45
      },
      {
        id: "coasting-too-much",
        category: "technique",
        priority: 5,
        condition: (d) => {
          if (!d.averages || d.averages.throttle === void 0 || d.averages.speed === void 0)
            return false;
          if (!d.current?.powertrain || d.current.powertrain.brake === void 0)
            return false;
          const throttle = d.averages.throttle;
          const brake = d.current.powertrain.brake;
          return throttle < 10 && brake < 0.1 && d.averages.speed > 40;
        },
        advice: "Est\xE1s yendo mucho en vac\xEDo, perd\xE9s tiempo sin acelerar ni frenar",
        cooldown: 50
      },
      {
        id: "throttle-overlap",
        category: "technique",
        priority: 7,
        condition: (d) => {
          if (!d.patterns || d.patterns.throttleChanges === void 0)
            return false;
          return d.patterns.throttleChanges > 25;
        },
        advice: "Levant\xE1s mucho el acelerador en los cambios, perd\xE9s potencia",
        cooldown: 45
      },
      {
        id: "unfinished-braking",
        category: "technique",
        priority: 6,
        condition: (d) => {
          if (!d.patterns || d.patterns.hardBrakingCount === void 0 || d.patterns.throttleChanges === void 0)
            return false;
          return d.patterns.hardBrakingCount > 3 && d.patterns.throttleChanges < 5;
        },
        advice: "Te falta trail braking, solt\xE1 el freno gradual mientras gir\xE1s",
        cooldown: 50
      },
      {
        id: "brake-inconsistency",
        category: "technique",
        priority: 5,
        condition: (d) => {
          if (!d.patterns || d.patterns.hardBrakingCount === void 0)
            return false;
          return Math.abs(d.patterns.hardBrakingCount - 5) < 2;
        },
        advice: "Frenadas inconsistentes, busc\xE1 puntos de referencia fijos",
        cooldown: 55
      },
      // ========================================
      // CATEGORÍA 2: TRANSMISIÓN Y MOTOR
      // ========================================
      {
        id: "redline-hanging",
        category: "engine",
        priority: 8,
        condition: (d) => {
          if (!d.current?.powertrain || d.current.powertrain.rpm === void 0)
            return false;
          return d.current.powertrain.rpm > 7500;
        },
        advice: "Est\xE1s colgado del limitador, cambi\xE1 antes para mantener potencia",
        cooldown: 25
      },
      {
        id: "early-short-shift",
        category: "engine",
        priority: 5,
        condition: (d) => {
          if (!d.current?.powertrain || d.current.powertrain.rpm === void 0 || d.current.powertrain.gear === void 0)
            return false;
          return d.current.powertrain.rpm < 5e3 && d.current.powertrain.gear > 3;
        },
        advice: "Cambios muy prematuros, aprovech\xE1 m\xE1s el rango de RPM",
        cooldown: 40
      },
      {
        id: "engine-braking-risk",
        category: "engine",
        priority: 7,
        condition: (d) => {
          if (!d.current?.powertrain || d.current.powertrain.rpm === void 0 || d.current.powertrain.brake === void 0)
            return false;
          return d.current.powertrain.rpm > 7e3 && d.current.powertrain.brake > 0.5;
        },
        advice: "Mucho freno motor, cuidado con romper el cambio",
        cooldown: 30
      },
      {
        id: "neutral-driving",
        category: "engine",
        priority: 6,
        condition: (d) => {
          if (!d.current?.powertrain || d.current.powertrain.gear === void 0)
            return false;
          if (!d.averages || d.averages.speed === void 0)
            return false;
          return d.current.powertrain.gear === 0 && d.averages.speed > 20;
        },
        advice: "Est\xE1s en punto muerto andando, enganch\xE1 una marcha",
        cooldown: 35
      },
      {
        id: "slow-shifts",
        category: "technique",
        priority: 4,
        condition: (d) => {
          if (!d.patterns || d.patterns.throttleChanges === void 0)
            return false;
          return d.patterns.throttleChanges > 18;
        },
        advice: "Cambios muy lentos, practic\xE1 la velocidad de palanca",
        cooldown: 50
      },
      {
        id: "wrong-gear-slow-corner",
        category: "engine",
        priority: 5,
        condition: (d) => {
          if (!d.current?.powertrain || d.current.powertrain.gear === void 0 || d.current.powertrain.speedKph === void 0)
            return false;
          const gear = d.current.powertrain.gear;
          const speed = d.current.powertrain.speedKph;
          return gear > 4 && speed < 60;
        },
        advice: "Marcha muy larga para curva lenta, baj\xE1 una m\xE1s",
        cooldown: 40
      },
      {
        id: "no-rev-match",
        category: "technique",
        priority: 6,
        condition: (d) => {
          if (!d.current?.powertrain || d.current.powertrain.rpm === void 0 || d.current.powertrain.gear === void 0)
            return false;
          const rpm = d.current.powertrain.rpm;
          return rpm < 4e3 && d.current.powertrain.gear < 4;
        },
        advice: "No est\xE1s haciendo punta-tac\xF3n, igual\xE1 las RPM en la bajada",
        cooldown: 45
      },
      {
        id: "engine-warnings-detected",
        category: "engine",
        priority: 10,
        condition: (d) => {
          if (!d.current || d.current.engineWarnings === void 0)
            return false;
          return d.current.engineWarnings === 128;
        },
        advice: "\xA1Warning del motor detectado! Revis\xE1 la telemetr\xEDa",
        cooldown: 20
      },
      // ========================================
      // CATEGORÍA 3: NEUMÁTICOS
      // ========================================
      {
        id: "tyres-too-cold",
        category: "tyres",
        priority: 7,
        condition: (d) => {
          if (!d.current?.temps?.tyreC || d.current.temps.tyreC.length === 0)
            return false;
          const tyreTemps = d.current.temps.tyreC;
          const avgTemp = tyreTemps.reduce((a, b) => a + b, 0) / tyreTemps.length;
          return avgTemp < 65 && avgTemp > 0;
        },
        advice: "Gomas muy fr\xEDas (menos de 65\xB0C), hac\xE9 serpentinas",
        cooldown: 40
      },
      {
        id: "tyres-overheating",
        category: "tyres",
        priority: 8,
        condition: (d) => {
          if (!d.current?.temps?.tyreC || d.current.temps.tyreC.length === 0)
            return false;
          const tyreTemps = d.current.temps.tyreC;
          return tyreTemps.some((t) => t > 100);
        },
        advice: "Neum\xE1ticos sobrecalentados (>100\xB0C), reduc\xED agresividad",
        cooldown: 30
      },
      {
        id: "thermal-imbalance-lr",
        category: "tyres",
        priority: 6,
        condition: (d) => {
          if (!d.current?.temps?.tyreC || d.current.temps.tyreC.length < 4)
            return false;
          const tyreTemps = d.current.temps.tyreC;
          const leftAvg = (tyreTemps[0] + tyreTemps[2]) / 2;
          const rightAvg = (tyreTemps[1] + tyreTemps[3]) / 2;
          return Math.abs(leftAvg - rightAvg) > 15;
        },
        advice: "Desbalance t\xE9rmico izquierda/derecha en gomas, revis\xE1 setup",
        cooldown: 50
      },
      {
        id: "thermal-imbalance-fb",
        category: "tyres",
        priority: 6,
        condition: (d) => {
          if (!d.current?.temps?.tyreC || d.current.temps.tyreC.length < 4)
            return false;
          const tyreTemps = d.current.temps.tyreC;
          const frontAvg = (tyreTemps[0] + tyreTemps[1]) / 2;
          const rearAvg = (tyreTemps[2] + tyreTemps[3]) / 2;
          return Math.abs(frontAvg - rearAvg) > 20;
        },
        advice: "Desbalance t\xE9rmico delantero/trasero, ajust\xE1 balance aerodin\xE1mico",
        cooldown: 50
      },
      {
        id: "brake-fade",
        category: "brakes",
        priority: 9,
        condition: (d) => {
          if (!d.current?.temps?.brakeC || d.current.temps.brakeC.length === 0)
            return false;
          const brakeTemps = d.current.temps.brakeC;
          return brakeTemps.some((t) => t > 400);
        },
        advice: "Frenos a m\xE1s de 400\xB0C, peligro de fatiga por calor",
        cooldown: 30
      },
      // ========================================
      // CATEGORÍA 4: MOTOR (TEMPERATURA)
      // ========================================
      {
        id: "cold-engine-stress",
        category: "engine",
        priority: 7,
        condition: (d) => {
          if (!d.current?.temps || d.current.temps.oilC === void 0)
            return false;
          if (!d.current?.powertrain || d.current.powertrain.rpm === void 0)
            return false;
          const oilC = d.current.temps.oilC;
          const rpm = d.current.powertrain.rpm;
          return oilC < 70 && rpm > 6e3;
        },
        advice: "Motor fr\xEDo con mucha exigencia, cuidado que el aceite est\xE1 fr\xEDo",
        cooldown: 35
      },
      {
        id: "water-overheating",
        category: "engine",
        priority: 9,
        condition: (d) => {
          if (!d.current?.temps || d.current.temps.waterC === void 0)
            return false;
          return d.current.temps.waterC > 105;
        },
        advice: "Temperatura de agua cr\xEDtica (>105\xB0C), levant\xE1 que se recalienta",
        cooldown: 30
      },
      // ========================================
      // CATEGORÍA 5: RENDIMIENTO Y CONSISTENCIA
      // ========================================
      {
        id: "top-speed-inconsistency",
        category: "technique",
        priority: 5,
        condition: (d) => {
          if (!d.averages || d.averages.speed === void 0)
            return false;
          if (!d.patterns || d.patterns.throttleChanges === void 0)
            return false;
          const speed = d.averages.speed;
          return speed > 0 && Math.abs(speed - 150) < 20 && d.patterns.throttleChanges > 12;
        },
        advice: "Velocidad de punta inconsistente, manten\xE9 el gas a fondo en recta",
        cooldown: 50
      },
      {
        id: "erratic-speed-variation",
        category: "technique",
        priority: 6,
        condition: (d) => {
          if (!d.patterns || d.patterns.throttleChanges === void 0)
            return false;
          if (!d.averages || d.averages.speed === void 0)
            return false;
          return d.patterns.throttleChanges > 18 && d.averages.speed > 80;
        },
        advice: "Variaciones err\xE1ticas de velocidad en recta, suaviz\xE1",
        cooldown: 45
      },
      // ========================================
      // CATEGORÍA 6: COMBUSTIBLE Y ESTRATEGIA
      // ========================================
      {
        id: "inefficient-fuel-consumption",
        category: "strategy",
        priority: 5,
        condition: (d) => {
          if (!d.current?.fuel || d.current.fuel.usePerHour === void 0)
            return false;
          const fuelUse = d.current.fuel.usePerHour;
          return fuelUse > 50;
        },
        advice: "Consumo de combustible ineficiente, levant\xE1 antes de frenar",
        cooldown: 60
      },
      {
        id: "fuel-critical-low",
        category: "strategy",
        priority: 9,
        condition: (d) => {
          if (!d.current?.fuel || d.current.fuel.level === void 0)
            return false;
          const fuelLevel = d.current.fuel.level;
          return fuelLevel < 5 && fuelLevel > 0;
        },
        advice: "\xA1Menos de 5 litros de nafta! Entr\xE1 a boxes o gestion\xE1",
        cooldown: 25
      },
      {
        id: "stalling-risk",
        category: "engine",
        priority: 10,
        condition: (d) => {
          if (!d.current?.powertrain || d.current.powertrain.rpm === void 0 || d.current.powertrain.speedKph === void 0)
            return false;
          const rpm = d.current.powertrain.rpm;
          const speed = d.current.powertrain.speedKph;
          return rpm < 1500 && speed > 5;
        },
        advice: "\xA1Riesgo de calado! RPM muy bajas, baj\xE1 de marcha o aceler\xE1",
        cooldown: 15
      }
    ];
  }
});

// ../../packages/ai-engine/dist/telemetry-rules-engine.js
var DEBUG, TelemetryRulesEngine;
var init_telemetry_rules_engine = __esm({
  "../../packages/ai-engine/dist/telemetry-rules-engine.js"() {
    "use strict";
    init_telemetry_rules();
    DEBUG = {
      ENTRADA: true,
      // Log de entrada con resumen del buffer (TEMP DEBUG)
      REGLAS_EVALUADAS: true,
      // Log de cada regla que cumple condición ✅
      REGLAS_ACTIVADAS: true,
      // Log de reglas que se van a hablar ✅
      SALIDA: true,
      // Log cuando no hay reglas aplicables ✅
      FLAGS: true,
      // Log de session flags ✅
      INIT: false
      // Log de inicialización
    };
    TelemetryRulesEngine = class {
      rules = [];
      lastAdviceTime = /* @__PURE__ */ new Map();
      constructor() {
        this.initializeRules();
      }
      /**
       * Analiza telemetría y devuelve el mejor consejo disponible
       */
      analyze(data) {
        const results = this.analyzeAll(data, 1);
        return results.length > 0 ? results[0].advice : null;
      }
      /**
       * Analiza telemetría y devuelve MÚLTIPLES consejos ordenados por prioridad
       * @param data Análisis de telemetría
       * @param maxResults Máximo de resultados a devolver (default: 5)
       */
      analyzeAll(data, maxResults = 5) {
        if (DEBUG.ENTRADA) {
          console.log(`[RulesEngine] \u{1F535} ENTRADA - Buffer: ${data.last30sec?.length || 0} frames, Speed: ${Math.round(data.averages?.speed || 0)} kph`);
        }
        const now = Date.now();
        const flags = data.current.flags?.sessionFlags || 0;
        if (DEBUG.FLAGS && flags !== 0) {
          console.log(`[RulesEngine] \u{1F6A9} Analizando flags: 0x${flags.toString(16)}`);
        }
        const applicableRules = this.rules.filter((rule) => {
          const lastTime = this.lastAdviceTime.get(rule.id);
          if (lastTime && rule.cooldown) {
            const elapsed = (now - lastTime) / 1e3;
            if (elapsed < rule.cooldown) {
              return false;
            }
          }
          try {
            const result = rule.condition(data);
            if (DEBUG.REGLAS_EVALUADAS && result) {
              console.log(`[RulesEngine] -> Regla "${rule.id}" CUMPLE condici\xF3n.`);
            }
            return result;
          } catch (error) {
            console.error(`[RulesEngine] Error en regla ${rule.id}:`, error);
            return false;
          }
        });
        if (applicableRules.length === 0) {
          if (DEBUG.SALIDA) {
            console.log(`[RulesEngine] \u{1F534} SALIDA - Sin reglas aplicables`);
          }
          return [];
        }
        applicableRules.sort((a, b) => b.priority - a.priority);
        const selectedRules = applicableRules.slice(0, maxResults);
        const results = selectedRules.map((rule) => {
          this.lastAdviceTime.set(rule.id, now);
          if (DEBUG.REGLAS_ACTIVADAS) {
            console.log(`[RulesEngine] \u{1F3AF} Regla activada: ${rule.id} (prioridad ${rule.priority})`);
          }
          return {
            ruleId: rule.id,
            category: rule.category,
            priority: rule.priority,
            advice: rule.advice
          };
        });
        return results;
      }
      /**
       * Calcula análisis de telemetría desde buffer
       */
      static calculateAnalysis(current, buffer) {
        const last30sec = buffer.slice(-600);
        if (last30sec.length === 0) {
          return {
            current,
            last30sec: [],
            averages: {
              speed: current.powertrain?.speedKph || 0,
              rpm: current.powertrain?.rpm || 0,
              throttle: (current.powertrain?.throttle || 0) * 100,
              brake: (current.powertrain?.brake || 0) * 100,
              lateralG: Math.abs(current.physics?.lateralG || 0),
              longitudinalG: current.physics?.longitudinalG || 0,
              steeringAngle: Math.abs(current.physics?.steeringAngle || 0),
              waterC: current.temps?.waterC || 0,
              oilC: current.temps?.oilC || 0,
              fuelPct: (current.fuel?.levelPct || 0) * 100,
              tyreC: current.temps?.tyreC || [0, 0, 0, 0],
              brakeC: current.temps?.brakeC || [0, 0, 0, 0]
            },
            patterns: {
              hardBrakingCount: 0,
              overRevCount: 0,
              aggressiveSteeringCount: 0,
              throttleChanges: 0,
              incidentCount: current.session?.incidents || 0,
              lapsSinceLastPit: 0,
              fuelUsedInBuffer: 0,
              isImproving: false,
              bottomingCount: 0,
              rakeInstabilityCount: 0,
              // Phase 6 placeholders
              understeerFactor: 0,
              oversteerFactor: 0,
              tractionLossCount: 0,
              trailBrakingQuality: 0
            },
            lapTimes: {
              best: current.lapTimes?.best || 0,
              last: current.lapTimes?.last || 0,
              current: current.lapTimes?.current || 0,
              delta: (current.lapTimes?.last || 0) - (current.lapTimes?.best || 0)
            }
          };
        }
        const count = last30sec.length;
        const avgSpeed = last30sec.reduce((sum, f) => sum + (f.powertrain?.speedKph || 0), 0) / count;
        const avgRPM = last30sec.reduce((sum, f) => sum + (f.powertrain?.rpm || 0), 0) / count;
        const avgThrottle = last30sec.reduce((sum, f) => sum + (f.powertrain?.throttle || 0) * 100, 0) / count;
        const avgBrake = last30sec.reduce((sum, f) => sum + (f.powertrain?.brake || 0) * 100, 0) / count;
        const avgLateralG = last30sec.reduce((sum, f) => sum + Math.abs(f.physics?.lateralG || 0), 0) / count;
        const avgLongG = last30sec.reduce((sum, f) => sum + (f.physics?.longitudinalG || 0), 0) / count;
        const avgSteering = last30sec.reduce((sum, f) => sum + Math.abs(f.physics?.steeringAngle || 0), 0) / count;
        const avgWater = last30sec.reduce((sum, f) => sum + (f.temps?.waterC || 0), 0) / count;
        const avgOil = last30sec.reduce((sum, f) => sum + (f.temps?.oilC || 0), 0) / count;
        const avgFuelPct = last30sec.reduce((sum, f) => sum + (f.fuel?.levelPct || 0) * 100, 0) / count;
        const avgTyres = [0, 1, 2, 3].map((i) => last30sec.reduce((sum, f) => sum + (f.temps?.tyreC?.[i] || 0), 0) / count);
        const avgBrakes = [0, 1, 2, 3].map((i) => last30sec.reduce((sum, f) => sum + (f.temps?.brakeC?.[i] || 0), 0) / count);
        const hardBrakingCount = last30sec.filter((f) => (f.physics?.longitudinalG || 0) < -1).length;
        const overRevCount = last30sec.filter((f) => (f.powertrain?.rpm || 0) > 7500).length;
        const aggressiveSteeringCount = last30sec.filter((f) => Math.abs(f.physics?.steeringAngle || 0) > 45).length;
        const incidentCount = current.session?.incidents || 0;
        const firstFuel = last30sec[0].fuel?.level || 0;
        const lastFuel = current.fuel?.level || 0;
        const fuelUsedInBuffer = Math.max(0, firstFuel - lastFuel);
        const isImproving = (current.lapTimes?.current || 0) < (current.lapTimes?.last || 0);
        let throttleChanges = 0;
        for (let i = 1; i < last30sec.length; i++) {
          const prev = (last30sec[i - 1].powertrain?.throttle || 0) * 100;
          const curr = (last30sec[i].powertrain?.throttle || 0) * 100;
          if (Math.abs(curr - prev) > 50) {
            throttleChanges++;
          }
        }
        const bottomingCount = last30sec.filter((f) => {
          if (!f.suspension?.shockDeflection)
            return false;
          return f.suspension.shockDeflection.some((d) => Math.abs(d) > 0.12);
        }).length;
        let rakeInstabilityCount = 0;
        for (let i = 1; i < last30sec.length; i++) {
          const prevAero = last30sec[i - 1].aero;
          const currAero = last30sec[i].aero;
          if (prevAero?.rake !== void 0 && currAero?.rake !== void 0) {
            if (Math.abs(currAero.rake - prevAero.rake) > 5e-3) {
              rakeInstabilityCount++;
            }
          }
        }
        let tractionLossCount = 0;
        for (let i = 1; i < last30sec.length; i++) {
          const prev = last30sec[i - 1];
          const curr = last30sec[i];
          if ((curr.powertrain?.rpm || 0) - (prev.powertrain?.rpm || 0) > 500 && (curr.powertrain?.speedKph || 0) - (prev.powertrain?.speedKph || 0) < 2 && (curr.powertrain?.throttle || 0) > 0.5 && (curr.powertrain?.gear || 0) < 4) {
            tractionLossCount++;
          }
        }
        const avgSteeringAbs = avgSteering;
        const avgLatGAbs = avgLateralG;
        let understeerFactor = 0;
        if (avgSteeringAbs > 30 && avgLatGAbs < 10 && avgSpeed > 80) {
          understeerFactor = avgSteeringAbs / Math.max(1, avgLatGAbs) * 0.1;
        }
        let oversteerFactor = 0;
        const counterSteerEvents = last30sec.filter((f) => {
          const steer = f.physics?.steeringAngle || 0;
          const latG = f.physics?.lateralG || 0;
          const speed = f.powertrain?.speedKph || 0;
          return speed > 50 && Math.abs(steer) > 5 && steer * latG < 0;
        }).length;
        if (counterSteerEvents > 5)
          oversteerFactor = 1;
        let trailBrakingQuality = 0.5;
        return {
          current,
          last30sec,
          averages: {
            speed: avgSpeed,
            rpm: avgRPM,
            throttle: avgThrottle,
            brake: avgBrake,
            lateralG: avgLateralG,
            longitudinalG: avgLongG,
            steeringAngle: avgSteering,
            waterC: avgWater,
            oilC: avgOil,
            fuelPct: avgFuelPct,
            tyreC: avgTyres,
            brakeC: avgBrakes
          },
          patterns: {
            hardBrakingCount,
            overRevCount,
            aggressiveSteeringCount,
            throttleChanges,
            incidentCount,
            lapsSinceLastPit: 0,
            // Habría que trackearlo en sesión
            fuelUsedInBuffer,
            isImproving,
            bottomingCount,
            rakeInstabilityCount,
            // Phase 6 populated
            understeerFactor,
            oversteerFactor,
            tractionLossCount,
            trailBrakingQuality
          },
          lapTimes: {
            best: current.lapTimes?.best || 0,
            last: current.lapTimes?.last || 0,
            current: current.lapTimes?.current || 0,
            delta: (current.lapTimes?.last || 0) - (current.lapTimes?.best || 0)
          }
        };
      }
      /**
       * Inicializa las reglas de telemetría desde archivo externo
       */
      initializeRules() {
        this.rules = TELEMETRY_RULES;
        if (DEBUG.INIT) {
          console.log(`[RulesEngine] \u2713 Inicializadas ${this.rules.length} reglas de telemetr\xEDa`);
        }
      }
    };
  }
});

// ../../packages/ai-engine/dist/advanced-analyzer.js
var AdvancedTelemetryAnalyzer;
var init_advanced_analyzer = __esm({
  "../../packages/ai-engine/dist/advanced-analyzer.js"() {
    "use strict";
    AdvancedTelemetryAnalyzer = class {
      /**
       * Analiza una ventana completa de telemetría
       */
      analyze(window) {
        const frames = window.frames;
        const summary = window.summary;
        if (frames.length === 0) {
          return this.emptyResult();
        }
        const lastFrame = frames[frames.length - 1];
        const corners = this.analyzeCorners(frames);
        const traffic = this.analyzeTraffic(frames, lastFrame);
        const timing = this.analyzeTiming(frames, lastFrame);
        const carState = this.analyzeCarState(frames, lastFrame, summary);
        const drivingStyle = this.analyzeDrivingStyle(frames, summary);
        const recommendations = this.generateRecommendations(corners, traffic, timing, carState, drivingStyle, lastFrame);
        return {
          corners,
          traffic,
          timing,
          carState,
          drivingStyle,
          recommendations
        };
      }
      // ============================================
      // ANÁLISIS DE CURVAS
      // ============================================
      analyzeCorners(frames) {
        const corners = [];
        let inCorner = false;
        let cornerStart = 0;
        let minSpeed = Infinity;
        let maxSteering = 0;
        let entrySpeed = 0;
        let brakePoint = 0;
        let throttlePoint = 0;
        let hasTrailBraking = false;
        let hasUndersteer = false;
        let hasOversteer = false;
        let hasWheelSpin = false;
        let hasLockup = false;
        for (let i = 1; i < frames.length; i++) {
          const prev = frames[i - 1];
          const curr = frames[i];
          const steering = Math.abs(curr.physics?.steeringAngle ?? 0);
          const speed = curr.powertrain?.speedKph ?? 0;
          const brake = (curr.powertrain?.brake ?? 0) * 100;
          const throttle = (curr.powertrain?.throttle ?? 0) * 100;
          const lapDistPct = curr.session?.lapDistPct ?? 0;
          const lateralG = Math.abs(curr.physics?.lateralG ?? 0);
          const yawRate = Math.abs(curr.physics?.yawRate ?? 0);
          if (!inCorner && steering > 0.15) {
            inCorner = true;
            cornerStart = i;
            entrySpeed = speed;
            minSpeed = speed;
            maxSteering = steering;
            brakePoint = lapDistPct;
            hasTrailBraking = false;
            hasUndersteer = false;
            hasOversteer = false;
          }
          if (inCorner) {
            minSpeed = Math.min(minSpeed, speed);
            maxSteering = Math.max(maxSteering, steering);
            if (brake > 20 && steering > 0.1) {
              hasTrailBraking = true;
            }
            if (steering > 0.3 && lateralG < 0.8 && speed > 80) {
              hasUndersteer = true;
            }
            if (yawRate > 0.5 && steering < 0.2 && speed > 60) {
              hasOversteer = true;
            }
            if (throttle > 80 && yawRate > 0.3 && speed < 120) {
              hasWheelSpin = true;
            }
            if (throttle > 50 && throttlePoint === 0) {
              throttlePoint = lapDistPct;
            }
            if (steering < 0.1) {
              corners.push({
                lapDistPct: frames[cornerStart].session?.lapDistPct ?? 0,
                entrySpeed,
                apexSpeed: minSpeed,
                exitSpeed: speed,
                entrySteeringAngle: frames[cornerStart].physics?.steeringAngle ?? 0,
                maxSteeringAngle: maxSteering,
                brakePoint,
                throttlePoint,
                trailBraking: hasTrailBraking,
                understeer: hasUndersteer,
                oversteer: hasOversteer,
                wheelSpin: hasWheelSpin,
                lockup: hasLockup,
                timeInCorner: (i - cornerStart) * (1e3 / 60)
                // Asumiendo 60fps
              });
              inCorner = false;
              throttlePoint = 0;
            }
          }
        }
        return corners;
      }
      // ============================================
      // ANÁLISIS DE TRÁFICO
      // ============================================
      analyzeTraffic(frames, lastFrame) {
        const carLeftRight = lastFrame.traffic?.carLeftRight ?? 0;
        const allCars = lastFrame.allCars;
        const playerIdx = lastFrame.player?.carIdx ?? 0;
        const flags = lastFrame.flags?.sessionFlags ?? 0;
        const carLeft = carLeftRight >= 2 && carLeftRight !== 3;
        const carRight = carLeftRight === 3 || carLeftRight === 4 || carLeftRight === 6;
        let gapToCarAhead = null;
        let gapToCarBehind = null;
        let beingPressured = false;
        let catchingCar = false;
        if (allCars?.position && allCars?.estTime) {
          const myPosition = lastFrame.player?.position ?? 0;
          const myEstTime = allCars.estTime[playerIdx] ?? 0;
          for (let i = 0; i < 64; i++) {
            if (i === playerIdx)
              continue;
            const pos = allCars.position[i];
            if (pos === myPosition - 1) {
              const theirTime = allCars.estTime[i] ?? 0;
              gapToCarAhead = Math.abs(theirTime - myEstTime);
            } else if (pos === myPosition + 1) {
              const theirTime = allCars.estTime[i] ?? 0;
              gapToCarBehind = Math.abs(theirTime - myEstTime);
            }
          }
        }
        if (gapToCarBehind !== null && gapToCarBehind < 1) {
          beingPressured = true;
        }
        if (gapToCarAhead !== null && gapToCarAhead < 2) {
          const earlierFrame = frames[Math.floor(frames.length / 2)];
          const earlierAllCars = earlierFrame.allCars;
          if (earlierAllCars?.estTime) {
            const earlierGap = Math.abs((earlierAllCars.estTime[playerIdx] ?? 0) - (earlierAllCars.estTime.find((_, i) => earlierAllCars.position[i] === (lastFrame.player?.position ?? 0) - 1) ?? 0));
            if (gapToCarAhead < earlierGap) {
              catchingCar = true;
            }
          }
        }
        const blueFlag = (flags & 1073741824) !== 0;
        return {
          carAhead: gapToCarAhead !== null && gapToCarAhead < 5,
          carBehind: gapToCarBehind !== null && gapToCarBehind < 5,
          carLeft,
          carRight,
          gapToCarAhead,
          gapToCarBehind,
          beingPressured,
          catchingCar,
          inBattle: carLeft || carRight || gapToCarAhead !== null && gapToCarAhead < 1,
          blueFlag
        };
      }
      // ============================================
      // ANÁLISIS DE TIEMPOS
      // ============================================
      analyzeTiming(frames, lastFrame) {
        const lapTimes = lastFrame.lapTimes;
        const lapDeltas = lastFrame.lapDeltas;
        const session = lastFrame.session;
        const currentLapTime = lapTimes?.current ?? 0;
        const lastLapTime = lapTimes?.last ?? 0;
        const bestLapTime = lapTimes?.best ?? 0;
        const deltaToBest = lapDeltas?.deltaToBest ?? lastLapTime - bestLapTime;
        const deltaToLast = currentLapTime - lastLapTime;
        const improving = deltaToBest < 0 || lapDeltas?.deltaToBestOK && deltaToBest < 0.5;
        const consistent = Math.abs(lastLapTime - bestLapTime) < 1;
        let sectorTrend = "same";
        if (deltaToBest < -0.3)
          sectorTrend = "faster";
        else if (deltaToBest > 0.3)
          sectorTrend = "slower";
        return {
          currentLapTime,
          lastLapTime,
          bestLapTime,
          deltaToBest,
          deltaToLast,
          improving,
          consistent,
          sectorTrend,
          estimatedLapTime: currentLapTime > 0 ? currentLapTime / (session?.lapDistPct ?? 0.5) : null,
          lapsRemaining: session?.sessionLapsRemain ?? null
        };
      }
      // ============================================
      // ANÁLISIS DE ESTADO DEL AUTO
      // ============================================
      analyzeCarState(frames, lastFrame, summary) {
        const temps = lastFrame.temps;
        const fuel = lastFrame.fuel;
        const session = lastFrame.session;
        const tyreWear = lastFrame.tyreWear;
        const avgTyreTemp = summary.avgTyreTemps.reduce((a, b) => a + b, 0) / 4;
        let tyreTemps = "optimal";
        if (avgTyreTemp < 70)
          tyreTemps = "cold";
        else if (avgTyreTemp > 100)
          tyreTemps = "overheating";
        else if (avgTyreTemp > 90)
          tyreTemps = "hot";
        const frontAvg = (summary.avgTyreTemps[0] + summary.avgTyreTemps[1]) / 2;
        const rearAvg = (summary.avgTyreTemps[2] + summary.avgTyreTemps[3]) / 2;
        let tyreBalance = "balanced";
        if (frontAvg - rearAvg > 10)
          tyreBalance = "front_hot";
        else if (rearAvg - frontAvg > 10)
          tyreBalance = "rear_hot";
        let tyreCondition = "good";
        if (tyreWear) {
          const avgWear = [
            tyreWear.LF?.[1] ?? 100,
            tyreWear.RF?.[1] ?? 100,
            tyreWear.LR?.[1] ?? 100,
            tyreWear.RR?.[1] ?? 100
          ].reduce((a, b) => a + b, 0) / 4;
          if (avgWear < 30)
            tyreCondition = "critical";
          else if (avgWear < 60)
            tyreCondition = "worn";
        }
        const waterTemp = summary.avgWaterTemp;
        let engineTemp = "optimal";
        if (waterTemp < 70)
          engineTemp = "cold";
        else if (waterTemp > 110)
          engineTemp = "overheating";
        else if (waterTemp > 100)
          engineTemp = "hot";
        const oilTemp = summary.avgOilTemp;
        let oilTempState = "optimal";
        if (oilTemp < 80)
          oilTempState = "cold";
        else if (oilTemp > 120)
          oilTempState = "hot";
        const fuelLevel = fuel?.level ?? 0;
        const fuelPct = (fuel?.levelPct ?? 0) * 100;
        let fuelState = "plenty";
        if (fuelPct < 5)
          fuelState = "critical";
        else if (fuelPct < 15)
          fuelState = "low";
        else if (fuelPct < 40)
          fuelState = "ok";
        const fuelPerLap = summary.fuelUsed * 2;
        const lapsOfFuelRemaining = fuelPerLap > 0 ? Math.floor(fuelLevel / fuelPerLap) : null;
        const incidentCount = session?.incidents ?? 0;
        const hasIncidents = summary.incidentsDelta > 0;
        return {
          tyreCondition,
          tyreTemps,
          tyreBalance,
          tyrePressure: "optimal",
          // Necesitaría más datos para evaluar
          engineTemp,
          oilTemp: oilTempState,
          fuelLevel: fuelState,
          fuelPerLap,
          lapsOfFuelRemaining,
          hasIncidents,
          incidentCount
        };
      }
      // ============================================
      // ANÁLISIS DE ESTILO DE MANEJO
      // ============================================
      analyzeDrivingStyle(frames, summary) {
        let brakingStyle = "optimal";
        if (summary.hardBrakingEvents > 10)
          brakingStyle = "late";
        else if (summary.avgBrakePct < 30 && summary.maxBrakePct < 80)
          brakingStyle = "early";
        let brakePressure = "moderate";
        if (summary.maxBrakePct > 95)
          brakePressure = "heavy";
        else if (summary.maxBrakePct < 70)
          brakePressure = "light";
        let trailBrakingCount = 0;
        for (const f of frames) {
          const brake = (f.powertrain?.brake ?? 0) * 100;
          const steering = Math.abs(f.physics?.steeringAngle ?? 0);
          if (brake > 20 && steering > 0.1)
            trailBrakingCount++;
        }
        let trailBrakingUsage = "none";
        const trailPct = trailBrakingCount / frames.length * 100;
        if (trailPct > 5)
          trailBrakingUsage = "good";
        else if (trailPct > 2)
          trailBrakingUsage = "some";
        let throttleApplication = "smooth";
        if (summary.liftCount > 20)
          throttleApplication = "jerky";
        else if (summary.fullThrottlePct > 60)
          throttleApplication = "aggressive";
        let liftAndCoast = false;
        let partialThrottleCount = 0;
        for (const f of frames) {
          const throttle = (f.powertrain?.throttle ?? 0) * 100;
          if (throttle > 20 && throttle < 80)
            partialThrottleCount++;
        }
        if (partialThrottleCount / frames.length > 0.1)
          liftAndCoast = true;
        let steeringInputs = "smooth";
        if (summary.correctionCount > 15)
          steeringInputs = "corrections";
        else if (summary.correctionCount > 8)
          steeringInputs = "busy";
        return {
          brakingStyle,
          brakePressure,
          trailBrakingUsage,
          throttleApplication,
          fullThrottlePercent: summary.fullThrottlePct,
          liftAndCoast,
          steeringInputs,
          counterSteerEvents: summary.correctionCount,
          usingAllTrack: summary.maxLateralG > 1.5,
          cuttingCorners: false,
          // Necesitaría datos de track limits
          runningWide: false
        };
      }
      // ============================================
      // GENERACIÓN DE RECOMENDACIONES
      // ============================================
      generateRecommendations(corners, traffic, timing, carState, drivingStyle, lastFrame) {
        const recs = [];
        if (traffic.blueFlag) {
          recs.push({
            priority: 10,
            category: "traffic",
            message: "Bandera azul, dej\xE1 pasar al l\xEDder cuando puedas."
          });
        }
        if (traffic.inBattle && (traffic.carLeft || traffic.carRight)) {
          recs.push({
            priority: 9,
            category: "traffic",
            message: traffic.carLeft ? "Auto a la izquierda, cuidado." : "Auto a la derecha, ojo."
          });
        }
        if (traffic.beingPressured && !traffic.inBattle) {
          recs.push({
            priority: 7,
            category: "traffic",
            message: "Te presionan atr\xE1s, manten\xE9 la calma y tu l\xEDnea."
          });
        }
        if (traffic.catchingCar && traffic.gapToCarAhead && traffic.gapToCarAhead < 2) {
          recs.push({
            priority: 6,
            category: "traffic",
            message: `Alcanzando al de adelante, gap ${traffic.gapToCarAhead.toFixed(1)} segundos.`
          });
        }
        if (carState.fuelLevel === "critical") {
          recs.push({
            priority: 10,
            category: "car",
            message: "Combustible cr\xEDtico, entr\xE1 a boxes ya."
          });
        }
        if (carState.fuelLevel === "low" && carState.lapsOfFuelRemaining !== null && carState.lapsOfFuelRemaining < 3) {
          recs.push({
            priority: 8,
            category: "strategy",
            message: `Quedan ${carState.lapsOfFuelRemaining} vueltas de combustible, planific\xE1 la parada.`
          });
        }
        if (carState.engineTemp === "overheating") {
          recs.push({
            priority: 9,
            category: "car",
            message: "Motor sobrecalentado, levant\xE1 un poco para enfriarlo."
          });
        }
        if (carState.tyreTemps === "cold") {
          recs.push({
            priority: 7,
            category: "car",
            message: "Neum\xE1ticos fr\xEDos, calent\xE1los antes de atacar."
          });
        }
        if (carState.tyreTemps === "overheating") {
          recs.push({
            priority: 7,
            category: "car",
            message: "Neum\xE1ticos muy calientes, baj\xE1 el ritmo una vuelta."
          });
        }
        if (carState.tyreCondition === "critical") {
          recs.push({
            priority: 8,
            category: "strategy",
            message: "Neum\xE1ticos muy gastados, consider\xE1 entrar a boxes."
          });
        }
        if (carState.hasIncidents) {
          recs.push({
            priority: 6,
            category: "safety",
            message: "Sumaste incidentes, baj\xE1 un cambio y concentrate."
          });
        }
        const understeerCorners = corners.filter((c) => c.understeer);
        if (understeerCorners.length > 0) {
          recs.push({
            priority: 6,
            category: "technique",
            message: "Detect\xE9 subviraje, prob\xE1 frenar un poco antes y girar menos."
          });
        }
        const oversteerCorners = corners.filter((c) => c.oversteer);
        if (oversteerCorners.length > 0) {
          recs.push({
            priority: 6,
            category: "technique",
            message: "Detect\xE9 sobreviraje, suaviz\xE1 el acelerador a la salida."
          });
        }
        const wheelSpinCorners = corners.filter((c) => c.wheelSpin);
        if (wheelSpinCorners.length > 1) {
          recs.push({
            priority: 5,
            category: "technique",
            message: "Patin\xE1s al acelerar, aplic\xE1 el gas m\xE1s progresivo."
          });
        }
        if (drivingStyle.trailBrakingUsage === "none" && corners.length > 2) {
          recs.push({
            priority: 4,
            category: "technique",
            message: "Prob\xE1 trail braking, manten\xE9 el freno mientras gir\xE1s para mejor rotaci\xF3n."
          });
        }
        if (drivingStyle.brakingStyle === "late") {
          recs.push({
            priority: 5,
            category: "technique",
            message: "Fren\xE1s muy tarde, perd\xE9s tiempo en las curvas. Adelant\xE1 el frenado."
          });
        }
        if (drivingStyle.brakingStyle === "early") {
          recs.push({
            priority: 4,
            category: "technique",
            message: "Pod\xE9s frenar m\xE1s tarde, est\xE1s dejando tiempo en la mesa."
          });
        }
        if (drivingStyle.steeringInputs === "corrections") {
          recs.push({
            priority: 5,
            category: "technique",
            message: "Muchas correcciones de volante, busc\xE1 una l\xEDnea m\xE1s limpia."
          });
        }
        if (drivingStyle.throttleApplication === "jerky") {
          recs.push({
            priority: 4,
            category: "technique",
            message: "Acelerador brusco, suaviz\xE1 las transiciones on-off."
          });
        }
        if (timing.improving && timing.deltaToBest < -0.5) {
          recs.push({
            priority: 3,
            category: "technique",
            message: "\xA1Buen ritmo! Ven\xEDs mejorando, mantenelo."
          });
        }
        if (!timing.consistent && Math.abs(timing.deltaToLast) > 1.5) {
          recs.push({
            priority: 4,
            category: "technique",
            message: "Tiempos inconsistentes, enfocate en repetir las mismas l\xEDneas."
          });
        }
        recs.sort((a, b) => b.priority - a.priority);
        return recs;
      }
      // ============================================
      // HELPERS
      // ============================================
      emptyResult() {
        return {
          corners: [],
          traffic: {
            carAhead: false,
            carBehind: false,
            carLeft: false,
            carRight: false,
            gapToCarAhead: null,
            gapToCarBehind: null,
            beingPressured: false,
            catchingCar: false,
            inBattle: false,
            blueFlag: false
          },
          timing: {
            currentLapTime: 0,
            lastLapTime: 0,
            bestLapTime: 0,
            deltaToBest: 0,
            deltaToLast: 0,
            improving: false,
            consistent: false,
            sectorTrend: "same",
            estimatedLapTime: null,
            lapsRemaining: null
          },
          carState: {
            tyreCondition: "good",
            tyreTemps: "optimal",
            tyreBalance: "balanced",
            tyrePressure: "optimal",
            engineTemp: "optimal",
            oilTemp: "optimal",
            fuelLevel: "plenty",
            fuelPerLap: 0,
            lapsOfFuelRemaining: null,
            hasIncidents: false,
            incidentCount: 0
          },
          drivingStyle: {
            brakingStyle: "optimal",
            brakePressure: "moderate",
            trailBrakingUsage: "none",
            throttleApplication: "smooth",
            fullThrottlePercent: 0,
            liftAndCoast: false,
            steeringInputs: "smooth",
            counterSteerEvents: 0,
            usingAllTrack: false,
            cuttingCorners: false,
            runningWide: false
          },
          recommendations: []
        };
      }
    };
  }
});

// ../../packages/ai-engine/dist/ai-service.js
var import_path4, import_url4, import_meta4, DEBUG2, __filename4, __dirname5, DEFAULT_CONFIG5, AICoachingService;
var init_ai_service = __esm({
  "../../packages/ai-engine/dist/ai-service.js"() {
    "use strict";
    init_prerendered_audio_agent();
    init_telemetry_rules_engine();
    import_path4 = __toESM(require("path"), 1);
    import_url4 = require("url");
    import_meta4 = {};
    DEBUG2 = {
      LIFECYCLE: false,
      // Logs de inicialización/destrucción
      FRAME_PROCESSING: false,
      // Logs de processFrame (cada frame)
      BUFFER: true,
      // Logs del buffer (cada 30s) ✅ IMPORTANTE
      GREETING: false
      // Logs de saludos iniciales
    };
    __filename4 = (0, import_url4.fileURLToPath)(import_meta4.url);
    __dirname5 = import_path4.default.dirname(__filename4);
    DEFAULT_CONFIG5 = {
      analysisInterval: 30,
      // 30 seconds buffer window
      enabled: true,
      mode: "ai",
      language: {
        stt: "es",
        tts: "es"
      },
      llm: {
        modelPath: "",
        contextSize: 2048,
        temperature: 0.7,
        topP: 0.9,
        maxTokens: 40
      },
      stt: {
        modelPath: "",
        language: "es",
        vadEnabled: false
      },
      tts: {
        modelPath: "",
        language: "es",
        voice: "es_AR-tux-medium",
        speed: 1,
        volume: 0.8
      },
      voiceInputMode: "push-to-talk"
    };
    AICoachingService = class {
      config;
      tts;
      rulesEngine;
      // Simple buffer system
      frameBuffer = [];
      bufferStartTime = 0;
      isProcessingBuffer = false;
      sessionContext = null;
      hasGivenInitialGreeting = false;
      initialized = false;
      externalAgents = false;
      // New tracking for UI
      lastRecommendation = null;
      // Recommendation history for feed (last 20)
      recommendationHistory = [];
      constructor(config2 = {}, externalTts) {
        this.config = { ...DEFAULT_CONFIG5, ...config2 };
        if (externalTts) {
          if (DEBUG2.LIFECYCLE)
            console.log("[AIService] Using external TTS agent");
          this.tts = externalTts;
          this.externalAgents = true;
        } else {
          if (DEBUG2.LIFECYCLE)
            console.log("[AIService] Creating new Audio agent");
          this.tts = new PrerenderedAudioAgent();
          this.externalAgents = false;
        }
        this.rulesEngine = new TelemetryRulesEngine();
        if (DEBUG2.LIFECYCLE)
          console.log("[AIService] \u2713 Simple 30s Buffer System initialized");
      }
      async initialize() {
        if (DEBUG2.LIFECYCLE)
          console.log("[AIService] Initializing...");
        try {
          if (!this.externalAgents) {
            await this.tts.initialize();
          }
          this.initialized = true;
          if (DEBUG2.LIFECYCLE)
            console.log("[AIService] \u2713 Ready");
        } catch (error) {
          console.error("[AIService] Failed to initialize:", error);
          throw error;
        }
      }
      async startSession(context) {
        this.sessionContext = context;
        this.frameBuffer = [];
        this.bufferStartTime = 0;
        this.hasGivenInitialGreeting = false;
        this.recommendationHistory = [];
        if (DEBUG2.LIFECYCLE)
          console.log("[AIService] Session started");
      }
      endSession() {
        this.sessionContext = null;
        this.frameBuffer = [];
        if (DEBUG2.LIFECYCLE)
          console.log("[AIService] Session ended");
      }
      /**
       * Process telemetry frame - Simple flow:
       * 1. Add frame to buffer
       * 2. Every 30s, send buffer to rules engine
       * 3. Clear buffer and repeat
       */
      async processFrame(frame) {
        if (DEBUG2.FRAME_PROCESSING && Math.random() < 0.01) {
          console.log("\u{1F7E2} processFrame CALLED");
        }
        if (!this.initialized) {
          if (DEBUG2.FRAME_PROCESSING)
            console.log("[AIService] \u26A0 processFrame skipped: not initialized");
          return;
        }
        if (!this.sessionContext) {
          if (DEBUG2.FRAME_PROCESSING)
            console.log("[AIService] \u26A0 processFrame skipped: no session context");
          return;
        }
        this.frameBuffer.push(frame);
        if (this.bufferStartTime === 0) {
          this.bufferStartTime = Date.now();
          if (DEBUG2.BUFFER)
            console.log("[Buffer] \u25B6 Buffer started, collecting frames for 10s...");
        }
        const elapsed = Date.now() - this.bufferStartTime;
        if (DEBUG2.BUFFER && this.frameBuffer.length % 300 === 0) {
          const progress = Math.min(100, elapsed / 1e4 * 100);
          console.log(`[Buffer] \u{1F4CA} frames=${this.frameBuffer.length}, elapsed=${(elapsed / 1e3).toFixed(1)}s/30s (${progress.toFixed(0)}%), isProcessing=${this.isProcessingBuffer}`);
        }
        if (elapsed >= 1e4 && !this.isProcessingBuffer) {
          if (DEBUG2.BUFFER)
            console.log(`[Buffer] \u23F0 10s reached! Calling processBufferAndSendToEngine...`);
          this.bufferStartTime = 0;
          await this.processBufferAndSendToEngine();
        }
      }
      /**
       * Uses edge detection: only announces when flag transitions from OFF to ON
       */
      activeFlagsState = /* @__PURE__ */ new Map();
      async checkCriticalFlags(frame) {
        const flags = frame.flags?.sessionFlags || 0;
        const criticalFlags = [
          { id: "black", bit: 128, message: "\xA1Bandera negra! Ten\xE9s una sanci\xF3n, entr\xE1 a boxes." },
          { id: "meatball", bit: 8192, message: "\xA1Bandera t\xE9cnica! El auto est\xE1 da\xF1ado, entr\xE1 a boxes ya." },
          { id: "yellow", bit: 8, message: "Bandera amarilla, baj\xE1 la velocidad y cuidado." },
          { id: "blue", bit: 16, message: "Bandera azul, dej\xE1 pasar al auto de atr\xE1s." }
        ];
        for (const flag of criticalFlags) {
          const isActive = (flags & flag.bit) !== 0;
          const wasActive = this.activeFlagsState.get(flag.id) || false;
          if (isActive) {
            console.log(`\u{1F50D} DEBUG ${flag.id}: isActive=${isActive}, wasActive=${wasActive}, Map size=${this.activeFlagsState.size}`);
          }
          if (isActive && !wasActive) {
            console.log(`\u{1F6A9} [BANDERA CR\xCDTICA] ${flag.id.toUpperCase()} detectada - Anunciando (primera vez)`);
            await this.tts.speak(flag.message, "urgent");
          }
          this.activeFlagsState.set(flag.id, isActive);
          console.log(`\u2705 DEBUG AFTER SET: ${flag.id} = ${this.activeFlagsState.get(flag.id)}, Map size=${this.activeFlagsState.size}`);
        }
      }
      /**
       * Check if car is stopped/in pits and motivate driver to start
       */
      lastStoppedAnnouncement = 0;
      stoppedSince = 0;
      async checkIfStoppedAndMotivate(frame) {
        const speedKph = frame.powertrain?.speedKph || 0;
        const now = Date.now();
        if (speedKph >= 5) {
          this.stoppedSince = 0;
          return;
        }
        if (this.stoppedSince === 0) {
          this.stoppedSince = now;
          return;
        }
        const stoppedDuration = now - this.stoppedSince;
        const timeSinceLastAnnouncement = now - this.lastStoppedAnnouncement;
        if (stoppedDuration > 5e3 && timeSinceLastAnnouncement > 3e4) {
          const messages = [
            "Dale, aceler\xE1 que arrancamos!",
            "Vamos, sal\xED a pista que te estoy esperando!",
            "Larg\xE1 el freno y vamos, que hay que rodar!",
            "Che, arranc\xE1 que se enfr\xEDa todo!"
          ];
          const message = messages[Math.floor(Math.random() * messages.length)];
          console.log(`\u{1F3C1} [AUTO PARADO] Motivando al piloto: "${message}"`);
          await this.tts.speak(message, "normal");
          this.lastStoppedAnnouncement = now;
        }
      }
      /**
       * Process buffer and send to rules engine
       */
      async processBufferAndSendToEngine() {
        if (this.isProcessingBuffer || this.frameBuffer.length === 0) {
          return;
        }
        this.isProcessingBuffer = true;
        try {
          console.log("\n" + "\u2550".repeat(60));
          console.log("[AIService] \u{1F514} 30s window complete - Analyzing buffer");
          console.log("\u2550".repeat(60));
          const firstFrame = this.frameBuffer[0];
          const lastFrame = this.frameBuffer[this.frameBuffer.length - 1];
          console.log(`
\u{1F4CB} BUFFER ENVIADO AL MOTOR:`);
          console.log(`   Frames: ${this.frameBuffer.length}`);
          console.log(`   Duration: 30 seconds`);
          console.log(`   First frame speed: ${Math.round(firstFrame?.powertrain?.speedKph || 0)} kph`);
          console.log(`   Last frame speed: ${Math.round(lastFrame?.powertrain?.speedKph || 0)} kph`);
          console.log(`
\u{1F4CB} BUFFER TAIL (\xFAltimos 5 frames):`);
          const tail = this.frameBuffer.slice(-5);
          tail.forEach((f, i) => {
            console.log(`   [${this.frameBuffer.length - 5 + i}] Speed=${Math.round(f.powertrain?.speedKph || 0)}kph, Throttle=${Math.round((f.powertrain?.throttle || 0) * 100)}%, Brake=${Math.round((f.powertrain?.brake || 0) * 100)}%`);
          });
          const analysis = TelemetryRulesEngine.calculateAnalysis(lastFrame, this.frameBuffer);
          console.log(`
\u{1F4C8} AN\xC1LISIS:`);
          console.log(`   HardBrakes: ${analysis.patterns.hardBrakingCount}`);
          console.log(`   ThrottleChanges: ${analysis.patterns.throttleChanges}`);
          console.log(`   AvgSpeed: ${Math.round(analysis.averages.speed)} kph`);
          console.log(`
\u{1F50D} DEBUG - Datos del frame actual:`);
          console.log(`   RPM: ${lastFrame?.powertrain?.rpm || "N/A"}`);
          console.log(`   Water temp: ${lastFrame?.temps?.waterC || "N/A"}\xB0C`);
          console.log(`   Oil temp: ${lastFrame?.temps?.oilC || "N/A"}\xB0C`);
          console.log(`   Tyre temps: ${lastFrame?.temps?.tyreC?.join(", ") || "N/A"}`);
          console.log(`   Brake temps: ${lastFrame?.temps?.brakeC?.join(", ") || "N/A"}`);
          const allRules = this.rulesEngine.analyzeAll(analysis, 50);
          if (allRules.length > 0) {
            console.log(`
\u{1F3AF} REGLAS ACTIVADAS (${allRules.length} total):`);
            console.log("\u2500".repeat(60));
            allRules.forEach((rule, i) => {
              const marker = i < 4 ? "\u{1F50A}" : "  ";
              console.log(`${marker} [${i + 1}] ${rule.ruleId} (P${rule.priority}) - "${rule.advice}"`);
            });
            console.log("\u2500".repeat(60));
            const MAX_CONSEJOS = 4;
            const topRules = allRules.slice(0, MAX_CONSEJOS);
            console.log(`
\u{1F50A} HABLANDO ${topRules.length} consejos (de ${allRules.length} total):`);
            for (const rule of topRules) {
              console.log(`   -> "${rule.advice}" (${rule.ruleId})`);
              const recId = `${rule.ruleId}-${Date.now()}`;
              this.recommendationHistory.unshift({
                id: recId,
                ruleId: rule.ruleId,
                advice: rule.advice,
                category: rule.category,
                priority: rule.priority,
                timestamp: Date.now()
              });
              if (this.recommendationHistory.length > 20) {
                this.recommendationHistory.pop();
              }
              await this.tts.speak(rule.ruleId, "normal");
            }
            console.log("[AIService] \u2713 Consejos reproducidos");
          } else {
            console.log("[AIService] \u2139\uFE0F No hay consejos aplicables");
          }
          this.frameBuffer = [];
          console.log("[AIService] \u2713 Buffer cleared, ready for new 10s window");
        } catch (error) {
          console.error("[AIService] \u274C Error processing buffer:", error);
        } finally {
          this.isProcessingBuffer = false;
        }
      }
      async giveInitialGreeting() {
        try {
          const greetings = [
            "greeting-1",
            "greeting-2",
            "greeting-3",
            "greeting-4"
          ];
          const greeting = greetings[Math.floor(Math.random() * greetings.length)];
          if (DEBUG2.GREETING)
            console.log(`[AIService] \u{1F3AF} GREETING: "${greeting}"`);
          await this.tts.speak(greeting, "normal");
          if (DEBUG2.GREETING)
            console.log("[AIService] \u2705 Greeting spoken");
        } catch (error) {
          if (DEBUG2.GREETING)
            console.error("[AIService] Greeting failed:", error);
        }
      }
      setLanguage(language) {
        this.config.language.stt = language;
        this.config.language.tts = language;
        this.tts.setLanguage(language);
        if (DEBUG2.LIFECYCLE)
          console.log(`[AIService] Language changed to: ${language}`);
      }
      getStatus() {
        const targetFrames = 200;
        const currentFrames = this.frameBuffer.length;
        const elapsed = this.bufferStartTime > 0 ? Date.now() - this.bufferStartTime : 0;
        const secondsToAnalysis = Math.max(0, (1e4 - elapsed) / 1e3);
        const timeBasedProgress = this.bufferStartTime > 0 ? Math.min(100, Math.round(elapsed / 1e4 * 100)) : 0;
        return {
          initialized: this.initialized,
          sessionActive: this.sessionContext !== null,
          mode: "ai",
          language: this.config.language,
          audio: {
            isSpeaking: this.tts.isSpeaking(),
            queue: this.tts.getQueueLength()
          },
          buffer: {
            size: currentFrames,
            target: targetFrames,
            progress: timeBasedProgress,
            // Now based on time elapsed (0-100% over 10s)
            secondsToAnalysis: Math.round(secondsToAnalysis)
          },
          lastRecommendation: this.lastRecommendation,
          recommendations: this.recommendationHistory
        };
      }
      async dispose() {
        await this.tts.dispose();
        this.initialized = false;
        if (DEBUG2.LIFECYCLE)
          console.log("[AIService] Disposed");
      }
    };
  }
});

// ../../packages/ai-engine/dist/index.js
var dist_exports = {};
__export(dist_exports, {
  AICoachingService: () => AICoachingService,
  AVAILABLE_MODELS: () => AVAILABLE_MODELS,
  AdvancedTelemetryAnalyzer: () => AdvancedTelemetryAnalyzer,
  LLMAgent: () => LLMAgent,
  LlamaCppAgent: () => LlamaCppAgent,
  ModelManager: () => ModelManager,
  PatternAnalyzer: () => PatternAnalyzer,
  PrerenderedAudioAgent: () => PrerenderedAudioAgent,
  RulesEngine: () => TelemetryRulesEngine,
  STTAgent: () => STTAgent,
  TTSAgent: () => TTSAgent,
  TelemetryBuffer: () => TelemetryBuffer,
  TelemetryRulesEngine: () => TelemetryRulesEngine
});
var init_dist2 = __esm({
  "../../packages/ai-engine/dist/index.js"() {
    "use strict";
    init_types();
    init_llm_agent();
    init_stt_agent();
    init_tts_agent();
    init_llama_cpp_agent();
    init_prerendered_audio_agent();
    init_pattern_analyzer();
    init_model_manager();
    init_telemetry_buffer();
    init_telemetry_rules_engine();
    init_advanced_analyzer();
    init_ai_service();
  }
});

// src/index.ts
var import_node_http = __toESM(require("node:http"), 1);
var import_node_path3 = __toESM(require("node:path"), 1);

// ../../packages/adapters-runtime/dist/index.js
var import_node_events = require("node:events");
var import_node_child_process = require("node:child_process");
var ADAPTER_SPECS = [
  { id: "iracing", label: "iRacing", simName: "iRacing" },
  { id: "ams2", label: "AMS2", simName: "Automobilista 2" },
  { id: "raceroom", label: "RaceRoom", simName: "RaceRoom Racing Experience" },
  { id: "rfactor", label: "rFactor", simName: "rFactor" },
  { id: "rfactor2", label: "rFactor 2", simName: "rFactor 2" },
  { id: "automobilista", label: "Automobilista", simName: "Automobilista" },
  { id: "simutc", label: "SimuTC", simName: "SimuTC" },
  { id: "ac", label: "Assetto Corsa", simName: "Assetto Corsa" },
  { id: "acc", label: "ACC", simName: "Assetto Corsa Competizione" },
  { id: "actc", label: "ACTC", simName: "Turismo Carretera" },
  { id: "mock-iracing", label: "iRacing (Mock)", simName: "iRacing Mock" },
  { id: "other", label: "Other", simName: "Other" }
];
var AdapterSupervisor = class extends import_node_events.EventEmitter {
  adapterId;
  resolveCommand;
  env;
  child = null;
  buffer = "";
  stopRequested = false;
  restartAttempts = 0;
  restartTimer;
  lastStatus;
  constructor(options) {
    super();
    this.adapterId = options.adapterId;
    this.resolveCommand = options.resolveCommand;
    this.env = options.env;
  }
  start() {
    this.stopRequested = false;
    this.restartAttempts = 0;
    this.spawnAdapter();
  }
  stop() {
    this.stopRequested = true;
    this.restartAttempts = 0;
    if (this.restartTimer) {
      clearTimeout(this.restartTimer);
      this.restartTimer = void 0;
    }
    if (this.child) {
      this.child.kill();
      this.child = null;
    }
    this.emitStatus({
      type: "status",
      state: "disconnected",
      sim: this.adapterId,
      details: "Stopped"
    });
  }
  async spawnAdapter() {
    if (this.stopRequested) {
      return;
    }
    const resolved = await this.resolveCommand(this.adapterId);
    if (!resolved) {
      this.emitStatus({
        type: "status",
        state: "error",
        sim: this.adapterId,
        details: "Adapter command not available."
      });
      return;
    }
    try {
      this.child = (0, import_node_child_process.spawn)(resolved.command, resolved.args, {
        env: { ...process.env, ...this.env, ...resolved.env },
        cwd: resolved.cwd,
        stdio: ["pipe", "pipe", "pipe"]
      });
    } catch (error) {
      this.emitStatus({
        type: "status",
        state: "error",
        sim: this.adapterId,
        details: `Failed to start adapter: ${String(error)}`
      });
      return;
    }
    if (!this.child) {
      return;
    }
    this.child.stdout.setEncoding("utf8");
    this.child.stderr.setEncoding("utf8");
    this.child.stdout.on("data", (chunk) => this.handleStdout(chunk));
    this.child.stderr.on("data", (chunk) => this.handleStderr(chunk));
    this.child.on("error", (error) => {
      this.emitStatus({
        type: "status",
        state: "error",
        sim: this.adapterId,
        details: `Adapter error: ${String(error)}`
      });
    });
    this.child.on("exit", (code, signal) => this.handleExit(code, signal));
  }
  handleStdout(chunk) {
    this.buffer += chunk;
    while (this.buffer.includes("\n")) {
      const idx = this.buffer.indexOf("\n");
      const line = this.buffer.slice(0, idx).trim();
      this.buffer = this.buffer.slice(idx + 1);
      if (!line) {
        continue;
      }
      try {
        const parsed = JSON.parse(line);
        this.handleMessage(parsed);
      } catch (error) {
        this.emit("log", {
          type: "log",
          level: "warn",
          message: `Invalid adapter output: ${String(error)}`
        });
      }
    }
  }
  handleStderr(chunk) {
    const lines = chunk.split(/\r?\n/).filter(Boolean);
    for (const line of lines) {
      this.emit("log", {
        type: "log",
        level: "warn",
        message: line
      });
    }
  }
  handleMessage(message) {
    if (message.type === "status") {
      this.emitStatus(message);
      return;
    }
    this.emit(message.type, message);
  }
  emitStatus(message) {
    this.lastStatus = message;
    this.emit("status", message);
  }
  handleExit(code, signal) {
    this.child = null;
    if (this.stopRequested) {
      return;
    }
    const detail = `Adapter exited (${code ?? "unknown"}${signal ? ` ${signal}` : ""})`;
    this.emitStatus({
      type: "status",
      state: "disconnected",
      sim: this.adapterId,
      details: detail
    });
    const delays = [1e3, 2e3, 4e3, 8e3, 16e3, 3e4];
    const delay = delays[Math.min(this.restartAttempts, delays.length - 1)];
    this.restartAttempts += 1;
    this.restartTimer = setTimeout(() => this.spawnAdapter(), delay);
  }
};
function getAdapterSpec(adapterId) {
  return ADAPTER_SPECS.find((spec) => spec.id === adapterId) ?? {
    id: adapterId,
    label: adapterId,
    simName: adapterId
  };
}

// ../../packages/config/dist/index.js
var import_node_fs = __toESM(require("node:fs"), 1);
var import_node_os = __toESM(require("node:os"), 1);
var import_node_path = __toESM(require("node:path"), 1);

// ../../node_modules/.pnpm/zod@3.25.76/node_modules/zod/v3/external.js
var external_exports = {};
__export(external_exports, {
  BRAND: () => BRAND,
  DIRTY: () => DIRTY,
  EMPTY_PATH: () => EMPTY_PATH,
  INVALID: () => INVALID,
  NEVER: () => NEVER,
  OK: () => OK,
  ParseStatus: () => ParseStatus,
  Schema: () => ZodType,
  ZodAny: () => ZodAny,
  ZodArray: () => ZodArray,
  ZodBigInt: () => ZodBigInt,
  ZodBoolean: () => ZodBoolean,
  ZodBranded: () => ZodBranded,
  ZodCatch: () => ZodCatch,
  ZodDate: () => ZodDate,
  ZodDefault: () => ZodDefault,
  ZodDiscriminatedUnion: () => ZodDiscriminatedUnion,
  ZodEffects: () => ZodEffects,
  ZodEnum: () => ZodEnum,
  ZodError: () => ZodError,
  ZodFirstPartyTypeKind: () => ZodFirstPartyTypeKind,
  ZodFunction: () => ZodFunction,
  ZodIntersection: () => ZodIntersection,
  ZodIssueCode: () => ZodIssueCode,
  ZodLazy: () => ZodLazy,
  ZodLiteral: () => ZodLiteral,
  ZodMap: () => ZodMap,
  ZodNaN: () => ZodNaN,
  ZodNativeEnum: () => ZodNativeEnum,
  ZodNever: () => ZodNever,
  ZodNull: () => ZodNull,
  ZodNullable: () => ZodNullable,
  ZodNumber: () => ZodNumber,
  ZodObject: () => ZodObject,
  ZodOptional: () => ZodOptional,
  ZodParsedType: () => ZodParsedType,
  ZodPipeline: () => ZodPipeline,
  ZodPromise: () => ZodPromise,
  ZodReadonly: () => ZodReadonly,
  ZodRecord: () => ZodRecord,
  ZodSchema: () => ZodType,
  ZodSet: () => ZodSet,
  ZodString: () => ZodString,
  ZodSymbol: () => ZodSymbol,
  ZodTransformer: () => ZodEffects,
  ZodTuple: () => ZodTuple,
  ZodType: () => ZodType,
  ZodUndefined: () => ZodUndefined,
  ZodUnion: () => ZodUnion,
  ZodUnknown: () => ZodUnknown,
  ZodVoid: () => ZodVoid,
  addIssueToContext: () => addIssueToContext,
  any: () => anyType,
  array: () => arrayType,
  bigint: () => bigIntType,
  boolean: () => booleanType,
  coerce: () => coerce,
  custom: () => custom,
  date: () => dateType,
  datetimeRegex: () => datetimeRegex,
  defaultErrorMap: () => en_default,
  discriminatedUnion: () => discriminatedUnionType,
  effect: () => effectsType,
  enum: () => enumType,
  function: () => functionType,
  getErrorMap: () => getErrorMap,
  getParsedType: () => getParsedType,
  instanceof: () => instanceOfType,
  intersection: () => intersectionType,
  isAborted: () => isAborted,
  isAsync: () => isAsync,
  isDirty: () => isDirty,
  isValid: () => isValid,
  late: () => late,
  lazy: () => lazyType,
  literal: () => literalType,
  makeIssue: () => makeIssue,
  map: () => mapType,
  nan: () => nanType,
  nativeEnum: () => nativeEnumType,
  never: () => neverType,
  null: () => nullType,
  nullable: () => nullableType,
  number: () => numberType,
  object: () => objectType,
  objectUtil: () => objectUtil,
  oboolean: () => oboolean,
  onumber: () => onumber,
  optional: () => optionalType,
  ostring: () => ostring,
  pipeline: () => pipelineType,
  preprocess: () => preprocessType,
  promise: () => promiseType,
  quotelessJson: () => quotelessJson,
  record: () => recordType,
  set: () => setType,
  setErrorMap: () => setErrorMap,
  strictObject: () => strictObjectType,
  string: () => stringType,
  symbol: () => symbolType,
  transformer: () => effectsType,
  tuple: () => tupleType,
  undefined: () => undefinedType,
  union: () => unionType,
  unknown: () => unknownType,
  util: () => util,
  void: () => voidType
});

// ../../node_modules/.pnpm/zod@3.25.76/node_modules/zod/v3/helpers/util.js
var util;
(function(util2) {
  util2.assertEqual = (_) => {
  };
  function assertIs(_arg) {
  }
  util2.assertIs = assertIs;
  function assertNever(_x) {
    throw new Error();
  }
  util2.assertNever = assertNever;
  util2.arrayToEnum = (items) => {
    const obj = {};
    for (const item of items) {
      obj[item] = item;
    }
    return obj;
  };
  util2.getValidEnumValues = (obj) => {
    const validKeys = util2.objectKeys(obj).filter((k) => typeof obj[obj[k]] !== "number");
    const filtered = {};
    for (const k of validKeys) {
      filtered[k] = obj[k];
    }
    return util2.objectValues(filtered);
  };
  util2.objectValues = (obj) => {
    return util2.objectKeys(obj).map(function(e) {
      return obj[e];
    });
  };
  util2.objectKeys = typeof Object.keys === "function" ? (obj) => Object.keys(obj) : (object) => {
    const keys = [];
    for (const key in object) {
      if (Object.prototype.hasOwnProperty.call(object, key)) {
        keys.push(key);
      }
    }
    return keys;
  };
  util2.find = (arr, checker) => {
    for (const item of arr) {
      if (checker(item))
        return item;
    }
    return void 0;
  };
  util2.isInteger = typeof Number.isInteger === "function" ? (val) => Number.isInteger(val) : (val) => typeof val === "number" && Number.isFinite(val) && Math.floor(val) === val;
  function joinValues(array, separator = " | ") {
    return array.map((val) => typeof val === "string" ? `'${val}'` : val).join(separator);
  }
  util2.joinValues = joinValues;
  util2.jsonStringifyReplacer = (_, value) => {
    if (typeof value === "bigint") {
      return value.toString();
    }
    return value;
  };
})(util || (util = {}));
var objectUtil;
(function(objectUtil2) {
  objectUtil2.mergeShapes = (first, second) => {
    return {
      ...first,
      ...second
      // second overwrites first
    };
  };
})(objectUtil || (objectUtil = {}));
var ZodParsedType = util.arrayToEnum([
  "string",
  "nan",
  "number",
  "integer",
  "float",
  "boolean",
  "date",
  "bigint",
  "symbol",
  "function",
  "undefined",
  "null",
  "array",
  "object",
  "unknown",
  "promise",
  "void",
  "never",
  "map",
  "set"
]);
var getParsedType = (data) => {
  const t = typeof data;
  switch (t) {
    case "undefined":
      return ZodParsedType.undefined;
    case "string":
      return ZodParsedType.string;
    case "number":
      return Number.isNaN(data) ? ZodParsedType.nan : ZodParsedType.number;
    case "boolean":
      return ZodParsedType.boolean;
    case "function":
      return ZodParsedType.function;
    case "bigint":
      return ZodParsedType.bigint;
    case "symbol":
      return ZodParsedType.symbol;
    case "object":
      if (Array.isArray(data)) {
        return ZodParsedType.array;
      }
      if (data === null) {
        return ZodParsedType.null;
      }
      if (data.then && typeof data.then === "function" && data.catch && typeof data.catch === "function") {
        return ZodParsedType.promise;
      }
      if (typeof Map !== "undefined" && data instanceof Map) {
        return ZodParsedType.map;
      }
      if (typeof Set !== "undefined" && data instanceof Set) {
        return ZodParsedType.set;
      }
      if (typeof Date !== "undefined" && data instanceof Date) {
        return ZodParsedType.date;
      }
      return ZodParsedType.object;
    default:
      return ZodParsedType.unknown;
  }
};

// ../../node_modules/.pnpm/zod@3.25.76/node_modules/zod/v3/ZodError.js
var ZodIssueCode = util.arrayToEnum([
  "invalid_type",
  "invalid_literal",
  "custom",
  "invalid_union",
  "invalid_union_discriminator",
  "invalid_enum_value",
  "unrecognized_keys",
  "invalid_arguments",
  "invalid_return_type",
  "invalid_date",
  "invalid_string",
  "too_small",
  "too_big",
  "invalid_intersection_types",
  "not_multiple_of",
  "not_finite"
]);
var quotelessJson = (obj) => {
  const json = JSON.stringify(obj, null, 2);
  return json.replace(/"([^"]+)":/g, "$1:");
};
var ZodError = class _ZodError extends Error {
  get errors() {
    return this.issues;
  }
  constructor(issues) {
    super();
    this.issues = [];
    this.addIssue = (sub) => {
      this.issues = [...this.issues, sub];
    };
    this.addIssues = (subs = []) => {
      this.issues = [...this.issues, ...subs];
    };
    const actualProto = new.target.prototype;
    if (Object.setPrototypeOf) {
      Object.setPrototypeOf(this, actualProto);
    } else {
      this.__proto__ = actualProto;
    }
    this.name = "ZodError";
    this.issues = issues;
  }
  format(_mapper) {
    const mapper = _mapper || function(issue) {
      return issue.message;
    };
    const fieldErrors = { _errors: [] };
    const processError = (error) => {
      for (const issue of error.issues) {
        if (issue.code === "invalid_union") {
          issue.unionErrors.map(processError);
        } else if (issue.code === "invalid_return_type") {
          processError(issue.returnTypeError);
        } else if (issue.code === "invalid_arguments") {
          processError(issue.argumentsError);
        } else if (issue.path.length === 0) {
          fieldErrors._errors.push(mapper(issue));
        } else {
          let curr = fieldErrors;
          let i = 0;
          while (i < issue.path.length) {
            const el = issue.path[i];
            const terminal = i === issue.path.length - 1;
            if (!terminal) {
              curr[el] = curr[el] || { _errors: [] };
            } else {
              curr[el] = curr[el] || { _errors: [] };
              curr[el]._errors.push(mapper(issue));
            }
            curr = curr[el];
            i++;
          }
        }
      }
    };
    processError(this);
    return fieldErrors;
  }
  static assert(value) {
    if (!(value instanceof _ZodError)) {
      throw new Error(`Not a ZodError: ${value}`);
    }
  }
  toString() {
    return this.message;
  }
  get message() {
    return JSON.stringify(this.issues, util.jsonStringifyReplacer, 2);
  }
  get isEmpty() {
    return this.issues.length === 0;
  }
  flatten(mapper = (issue) => issue.message) {
    const fieldErrors = {};
    const formErrors = [];
    for (const sub of this.issues) {
      if (sub.path.length > 0) {
        const firstEl = sub.path[0];
        fieldErrors[firstEl] = fieldErrors[firstEl] || [];
        fieldErrors[firstEl].push(mapper(sub));
      } else {
        formErrors.push(mapper(sub));
      }
    }
    return { formErrors, fieldErrors };
  }
  get formErrors() {
    return this.flatten();
  }
};
ZodError.create = (issues) => {
  const error = new ZodError(issues);
  return error;
};

// ../../node_modules/.pnpm/zod@3.25.76/node_modules/zod/v3/locales/en.js
var errorMap = (issue, _ctx) => {
  let message;
  switch (issue.code) {
    case ZodIssueCode.invalid_type:
      if (issue.received === ZodParsedType.undefined) {
        message = "Required";
      } else {
        message = `Expected ${issue.expected}, received ${issue.received}`;
      }
      break;
    case ZodIssueCode.invalid_literal:
      message = `Invalid literal value, expected ${JSON.stringify(issue.expected, util.jsonStringifyReplacer)}`;
      break;
    case ZodIssueCode.unrecognized_keys:
      message = `Unrecognized key(s) in object: ${util.joinValues(issue.keys, ", ")}`;
      break;
    case ZodIssueCode.invalid_union:
      message = `Invalid input`;
      break;
    case ZodIssueCode.invalid_union_discriminator:
      message = `Invalid discriminator value. Expected ${util.joinValues(issue.options)}`;
      break;
    case ZodIssueCode.invalid_enum_value:
      message = `Invalid enum value. Expected ${util.joinValues(issue.options)}, received '${issue.received}'`;
      break;
    case ZodIssueCode.invalid_arguments:
      message = `Invalid function arguments`;
      break;
    case ZodIssueCode.invalid_return_type:
      message = `Invalid function return type`;
      break;
    case ZodIssueCode.invalid_date:
      message = `Invalid date`;
      break;
    case ZodIssueCode.invalid_string:
      if (typeof issue.validation === "object") {
        if ("includes" in issue.validation) {
          message = `Invalid input: must include "${issue.validation.includes}"`;
          if (typeof issue.validation.position === "number") {
            message = `${message} at one or more positions greater than or equal to ${issue.validation.position}`;
          }
        } else if ("startsWith" in issue.validation) {
          message = `Invalid input: must start with "${issue.validation.startsWith}"`;
        } else if ("endsWith" in issue.validation) {
          message = `Invalid input: must end with "${issue.validation.endsWith}"`;
        } else {
          util.assertNever(issue.validation);
        }
      } else if (issue.validation !== "regex") {
        message = `Invalid ${issue.validation}`;
      } else {
        message = "Invalid";
      }
      break;
    case ZodIssueCode.too_small:
      if (issue.type === "array")
        message = `Array must contain ${issue.exact ? "exactly" : issue.inclusive ? `at least` : `more than`} ${issue.minimum} element(s)`;
      else if (issue.type === "string")
        message = `String must contain ${issue.exact ? "exactly" : issue.inclusive ? `at least` : `over`} ${issue.minimum} character(s)`;
      else if (issue.type === "number")
        message = `Number must be ${issue.exact ? `exactly equal to ` : issue.inclusive ? `greater than or equal to ` : `greater than `}${issue.minimum}`;
      else if (issue.type === "bigint")
        message = `Number must be ${issue.exact ? `exactly equal to ` : issue.inclusive ? `greater than or equal to ` : `greater than `}${issue.minimum}`;
      else if (issue.type === "date")
        message = `Date must be ${issue.exact ? `exactly equal to ` : issue.inclusive ? `greater than or equal to ` : `greater than `}${new Date(Number(issue.minimum))}`;
      else
        message = "Invalid input";
      break;
    case ZodIssueCode.too_big:
      if (issue.type === "array")
        message = `Array must contain ${issue.exact ? `exactly` : issue.inclusive ? `at most` : `less than`} ${issue.maximum} element(s)`;
      else if (issue.type === "string")
        message = `String must contain ${issue.exact ? `exactly` : issue.inclusive ? `at most` : `under`} ${issue.maximum} character(s)`;
      else if (issue.type === "number")
        message = `Number must be ${issue.exact ? `exactly` : issue.inclusive ? `less than or equal to` : `less than`} ${issue.maximum}`;
      else if (issue.type === "bigint")
        message = `BigInt must be ${issue.exact ? `exactly` : issue.inclusive ? `less than or equal to` : `less than`} ${issue.maximum}`;
      else if (issue.type === "date")
        message = `Date must be ${issue.exact ? `exactly` : issue.inclusive ? `smaller than or equal to` : `smaller than`} ${new Date(Number(issue.maximum))}`;
      else
        message = "Invalid input";
      break;
    case ZodIssueCode.custom:
      message = `Invalid input`;
      break;
    case ZodIssueCode.invalid_intersection_types:
      message = `Intersection results could not be merged`;
      break;
    case ZodIssueCode.not_multiple_of:
      message = `Number must be a multiple of ${issue.multipleOf}`;
      break;
    case ZodIssueCode.not_finite:
      message = "Number must be finite";
      break;
    default:
      message = _ctx.defaultError;
      util.assertNever(issue);
  }
  return { message };
};
var en_default = errorMap;

// ../../node_modules/.pnpm/zod@3.25.76/node_modules/zod/v3/errors.js
var overrideErrorMap = en_default;
function setErrorMap(map) {
  overrideErrorMap = map;
}
function getErrorMap() {
  return overrideErrorMap;
}

// ../../node_modules/.pnpm/zod@3.25.76/node_modules/zod/v3/helpers/parseUtil.js
var makeIssue = (params) => {
  const { data, path: path8, errorMaps, issueData } = params;
  const fullPath = [...path8, ...issueData.path || []];
  const fullIssue = {
    ...issueData,
    path: fullPath
  };
  if (issueData.message !== void 0) {
    return {
      ...issueData,
      path: fullPath,
      message: issueData.message
    };
  }
  let errorMessage = "";
  const maps = errorMaps.filter((m) => !!m).slice().reverse();
  for (const map of maps) {
    errorMessage = map(fullIssue, { data, defaultError: errorMessage }).message;
  }
  return {
    ...issueData,
    path: fullPath,
    message: errorMessage
  };
};
var EMPTY_PATH = [];
function addIssueToContext(ctx, issueData) {
  const overrideMap = getErrorMap();
  const issue = makeIssue({
    issueData,
    data: ctx.data,
    path: ctx.path,
    errorMaps: [
      ctx.common.contextualErrorMap,
      // contextual error map is first priority
      ctx.schemaErrorMap,
      // then schema-bound map if available
      overrideMap,
      // then global override map
      overrideMap === en_default ? void 0 : en_default
      // then global default map
    ].filter((x) => !!x)
  });
  ctx.common.issues.push(issue);
}
var ParseStatus = class _ParseStatus {
  constructor() {
    this.value = "valid";
  }
  dirty() {
    if (this.value === "valid")
      this.value = "dirty";
  }
  abort() {
    if (this.value !== "aborted")
      this.value = "aborted";
  }
  static mergeArray(status, results) {
    const arrayValue = [];
    for (const s of results) {
      if (s.status === "aborted")
        return INVALID;
      if (s.status === "dirty")
        status.dirty();
      arrayValue.push(s.value);
    }
    return { status: status.value, value: arrayValue };
  }
  static async mergeObjectAsync(status, pairs) {
    const syncPairs = [];
    for (const pair of pairs) {
      const key = await pair.key;
      const value = await pair.value;
      syncPairs.push({
        key,
        value
      });
    }
    return _ParseStatus.mergeObjectSync(status, syncPairs);
  }
  static mergeObjectSync(status, pairs) {
    const finalObject = {};
    for (const pair of pairs) {
      const { key, value } = pair;
      if (key.status === "aborted")
        return INVALID;
      if (value.status === "aborted")
        return INVALID;
      if (key.status === "dirty")
        status.dirty();
      if (value.status === "dirty")
        status.dirty();
      if (key.value !== "__proto__" && (typeof value.value !== "undefined" || pair.alwaysSet)) {
        finalObject[key.value] = value.value;
      }
    }
    return { status: status.value, value: finalObject };
  }
};
var INVALID = Object.freeze({
  status: "aborted"
});
var DIRTY = (value) => ({ status: "dirty", value });
var OK = (value) => ({ status: "valid", value });
var isAborted = (x) => x.status === "aborted";
var isDirty = (x) => x.status === "dirty";
var isValid = (x) => x.status === "valid";
var isAsync = (x) => typeof Promise !== "undefined" && x instanceof Promise;

// ../../node_modules/.pnpm/zod@3.25.76/node_modules/zod/v3/helpers/errorUtil.js
var errorUtil;
(function(errorUtil2) {
  errorUtil2.errToObj = (message) => typeof message === "string" ? { message } : message || {};
  errorUtil2.toString = (message) => typeof message === "string" ? message : message?.message;
})(errorUtil || (errorUtil = {}));

// ../../node_modules/.pnpm/zod@3.25.76/node_modules/zod/v3/types.js
var ParseInputLazyPath = class {
  constructor(parent, value, path8, key) {
    this._cachedPath = [];
    this.parent = parent;
    this.data = value;
    this._path = path8;
    this._key = key;
  }
  get path() {
    if (!this._cachedPath.length) {
      if (Array.isArray(this._key)) {
        this._cachedPath.push(...this._path, ...this._key);
      } else {
        this._cachedPath.push(...this._path, this._key);
      }
    }
    return this._cachedPath;
  }
};
var handleResult = (ctx, result) => {
  if (isValid(result)) {
    return { success: true, data: result.value };
  } else {
    if (!ctx.common.issues.length) {
      throw new Error("Validation failed but no issues detected.");
    }
    return {
      success: false,
      get error() {
        if (this._error)
          return this._error;
        const error = new ZodError(ctx.common.issues);
        this._error = error;
        return this._error;
      }
    };
  }
};
function processCreateParams(params) {
  if (!params)
    return {};
  const { errorMap: errorMap2, invalid_type_error, required_error, description } = params;
  if (errorMap2 && (invalid_type_error || required_error)) {
    throw new Error(`Can't use "invalid_type_error" or "required_error" in conjunction with custom error map.`);
  }
  if (errorMap2)
    return { errorMap: errorMap2, description };
  const customMap = (iss, ctx) => {
    const { message } = params;
    if (iss.code === "invalid_enum_value") {
      return { message: message ?? ctx.defaultError };
    }
    if (typeof ctx.data === "undefined") {
      return { message: message ?? required_error ?? ctx.defaultError };
    }
    if (iss.code !== "invalid_type")
      return { message: ctx.defaultError };
    return { message: message ?? invalid_type_error ?? ctx.defaultError };
  };
  return { errorMap: customMap, description };
}
var ZodType = class {
  get description() {
    return this._def.description;
  }
  _getType(input) {
    return getParsedType(input.data);
  }
  _getOrReturnCtx(input, ctx) {
    return ctx || {
      common: input.parent.common,
      data: input.data,
      parsedType: getParsedType(input.data),
      schemaErrorMap: this._def.errorMap,
      path: input.path,
      parent: input.parent
    };
  }
  _processInputParams(input) {
    return {
      status: new ParseStatus(),
      ctx: {
        common: input.parent.common,
        data: input.data,
        parsedType: getParsedType(input.data),
        schemaErrorMap: this._def.errorMap,
        path: input.path,
        parent: input.parent
      }
    };
  }
  _parseSync(input) {
    const result = this._parse(input);
    if (isAsync(result)) {
      throw new Error("Synchronous parse encountered promise.");
    }
    return result;
  }
  _parseAsync(input) {
    const result = this._parse(input);
    return Promise.resolve(result);
  }
  parse(data, params) {
    const result = this.safeParse(data, params);
    if (result.success)
      return result.data;
    throw result.error;
  }
  safeParse(data, params) {
    const ctx = {
      common: {
        issues: [],
        async: params?.async ?? false,
        contextualErrorMap: params?.errorMap
      },
      path: params?.path || [],
      schemaErrorMap: this._def.errorMap,
      parent: null,
      data,
      parsedType: getParsedType(data)
    };
    const result = this._parseSync({ data, path: ctx.path, parent: ctx });
    return handleResult(ctx, result);
  }
  "~validate"(data) {
    const ctx = {
      common: {
        issues: [],
        async: !!this["~standard"].async
      },
      path: [],
      schemaErrorMap: this._def.errorMap,
      parent: null,
      data,
      parsedType: getParsedType(data)
    };
    if (!this["~standard"].async) {
      try {
        const result = this._parseSync({ data, path: [], parent: ctx });
        return isValid(result) ? {
          value: result.value
        } : {
          issues: ctx.common.issues
        };
      } catch (err) {
        if (err?.message?.toLowerCase()?.includes("encountered")) {
          this["~standard"].async = true;
        }
        ctx.common = {
          issues: [],
          async: true
        };
      }
    }
    return this._parseAsync({ data, path: [], parent: ctx }).then((result) => isValid(result) ? {
      value: result.value
    } : {
      issues: ctx.common.issues
    });
  }
  async parseAsync(data, params) {
    const result = await this.safeParseAsync(data, params);
    if (result.success)
      return result.data;
    throw result.error;
  }
  async safeParseAsync(data, params) {
    const ctx = {
      common: {
        issues: [],
        contextualErrorMap: params?.errorMap,
        async: true
      },
      path: params?.path || [],
      schemaErrorMap: this._def.errorMap,
      parent: null,
      data,
      parsedType: getParsedType(data)
    };
    const maybeAsyncResult = this._parse({ data, path: ctx.path, parent: ctx });
    const result = await (isAsync(maybeAsyncResult) ? maybeAsyncResult : Promise.resolve(maybeAsyncResult));
    return handleResult(ctx, result);
  }
  refine(check, message) {
    const getIssueProperties = (val) => {
      if (typeof message === "string" || typeof message === "undefined") {
        return { message };
      } else if (typeof message === "function") {
        return message(val);
      } else {
        return message;
      }
    };
    return this._refinement((val, ctx) => {
      const result = check(val);
      const setError = () => ctx.addIssue({
        code: ZodIssueCode.custom,
        ...getIssueProperties(val)
      });
      if (typeof Promise !== "undefined" && result instanceof Promise) {
        return result.then((data) => {
          if (!data) {
            setError();
            return false;
          } else {
            return true;
          }
        });
      }
      if (!result) {
        setError();
        return false;
      } else {
        return true;
      }
    });
  }
  refinement(check, refinementData) {
    return this._refinement((val, ctx) => {
      if (!check(val)) {
        ctx.addIssue(typeof refinementData === "function" ? refinementData(val, ctx) : refinementData);
        return false;
      } else {
        return true;
      }
    });
  }
  _refinement(refinement) {
    return new ZodEffects({
      schema: this,
      typeName: ZodFirstPartyTypeKind.ZodEffects,
      effect: { type: "refinement", refinement }
    });
  }
  superRefine(refinement) {
    return this._refinement(refinement);
  }
  constructor(def) {
    this.spa = this.safeParseAsync;
    this._def = def;
    this.parse = this.parse.bind(this);
    this.safeParse = this.safeParse.bind(this);
    this.parseAsync = this.parseAsync.bind(this);
    this.safeParseAsync = this.safeParseAsync.bind(this);
    this.spa = this.spa.bind(this);
    this.refine = this.refine.bind(this);
    this.refinement = this.refinement.bind(this);
    this.superRefine = this.superRefine.bind(this);
    this.optional = this.optional.bind(this);
    this.nullable = this.nullable.bind(this);
    this.nullish = this.nullish.bind(this);
    this.array = this.array.bind(this);
    this.promise = this.promise.bind(this);
    this.or = this.or.bind(this);
    this.and = this.and.bind(this);
    this.transform = this.transform.bind(this);
    this.brand = this.brand.bind(this);
    this.default = this.default.bind(this);
    this.catch = this.catch.bind(this);
    this.describe = this.describe.bind(this);
    this.pipe = this.pipe.bind(this);
    this.readonly = this.readonly.bind(this);
    this.isNullable = this.isNullable.bind(this);
    this.isOptional = this.isOptional.bind(this);
    this["~standard"] = {
      version: 1,
      vendor: "zod",
      validate: (data) => this["~validate"](data)
    };
  }
  optional() {
    return ZodOptional.create(this, this._def);
  }
  nullable() {
    return ZodNullable.create(this, this._def);
  }
  nullish() {
    return this.nullable().optional();
  }
  array() {
    return ZodArray.create(this);
  }
  promise() {
    return ZodPromise.create(this, this._def);
  }
  or(option) {
    return ZodUnion.create([this, option], this._def);
  }
  and(incoming) {
    return ZodIntersection.create(this, incoming, this._def);
  }
  transform(transform) {
    return new ZodEffects({
      ...processCreateParams(this._def),
      schema: this,
      typeName: ZodFirstPartyTypeKind.ZodEffects,
      effect: { type: "transform", transform }
    });
  }
  default(def) {
    const defaultValueFunc = typeof def === "function" ? def : () => def;
    return new ZodDefault({
      ...processCreateParams(this._def),
      innerType: this,
      defaultValue: defaultValueFunc,
      typeName: ZodFirstPartyTypeKind.ZodDefault
    });
  }
  brand() {
    return new ZodBranded({
      typeName: ZodFirstPartyTypeKind.ZodBranded,
      type: this,
      ...processCreateParams(this._def)
    });
  }
  catch(def) {
    const catchValueFunc = typeof def === "function" ? def : () => def;
    return new ZodCatch({
      ...processCreateParams(this._def),
      innerType: this,
      catchValue: catchValueFunc,
      typeName: ZodFirstPartyTypeKind.ZodCatch
    });
  }
  describe(description) {
    const This = this.constructor;
    return new This({
      ...this._def,
      description
    });
  }
  pipe(target) {
    return ZodPipeline.create(this, target);
  }
  readonly() {
    return ZodReadonly.create(this);
  }
  isOptional() {
    return this.safeParse(void 0).success;
  }
  isNullable() {
    return this.safeParse(null).success;
  }
};
var cuidRegex = /^c[^\s-]{8,}$/i;
var cuid2Regex = /^[0-9a-z]+$/;
var ulidRegex = /^[0-9A-HJKMNP-TV-Z]{26}$/i;
var uuidRegex = /^[0-9a-fA-F]{8}\b-[0-9a-fA-F]{4}\b-[0-9a-fA-F]{4}\b-[0-9a-fA-F]{4}\b-[0-9a-fA-F]{12}$/i;
var nanoidRegex = /^[a-z0-9_-]{21}$/i;
var jwtRegex = /^[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+\.[A-Za-z0-9-_]*$/;
var durationRegex = /^[-+]?P(?!$)(?:(?:[-+]?\d+Y)|(?:[-+]?\d+[.,]\d+Y$))?(?:(?:[-+]?\d+M)|(?:[-+]?\d+[.,]\d+M$))?(?:(?:[-+]?\d+W)|(?:[-+]?\d+[.,]\d+W$))?(?:(?:[-+]?\d+D)|(?:[-+]?\d+[.,]\d+D$))?(?:T(?=[\d+-])(?:(?:[-+]?\d+H)|(?:[-+]?\d+[.,]\d+H$))?(?:(?:[-+]?\d+M)|(?:[-+]?\d+[.,]\d+M$))?(?:[-+]?\d+(?:[.,]\d+)?S)?)??$/;
var emailRegex = /^(?!\.)(?!.*\.\.)([A-Z0-9_'+\-\.]*)[A-Z0-9_+-]@([A-Z0-9][A-Z0-9\-]*\.)+[A-Z]{2,}$/i;
var _emojiRegex = `^(\\p{Extended_Pictographic}|\\p{Emoji_Component})+$`;
var emojiRegex;
var ipv4Regex = /^(?:(?:25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9][0-9]|[0-9])\.){3}(?:25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9][0-9]|[0-9])$/;
var ipv4CidrRegex = /^(?:(?:25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9][0-9]|[0-9])\.){3}(?:25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9][0-9]|[0-9])\/(3[0-2]|[12]?[0-9])$/;
var ipv6Regex = /^(([0-9a-fA-F]{1,4}:){7,7}[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,7}:|([0-9a-fA-F]{1,4}:){1,6}:[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,5}(:[0-9a-fA-F]{1,4}){1,2}|([0-9a-fA-F]{1,4}:){1,4}(:[0-9a-fA-F]{1,4}){1,3}|([0-9a-fA-F]{1,4}:){1,3}(:[0-9a-fA-F]{1,4}){1,4}|([0-9a-fA-F]{1,4}:){1,2}(:[0-9a-fA-F]{1,4}){1,5}|[0-9a-fA-F]{1,4}:((:[0-9a-fA-F]{1,4}){1,6})|:((:[0-9a-fA-F]{1,4}){1,7}|:)|fe80:(:[0-9a-fA-F]{0,4}){0,4}%[0-9a-zA-Z]{1,}|::(ffff(:0{1,4}){0,1}:){0,1}((25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])\.){3,3}(25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])|([0-9a-fA-F]{1,4}:){1,4}:((25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])\.){3,3}(25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9]))$/;
var ipv6CidrRegex = /^(([0-9a-fA-F]{1,4}:){7,7}[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,7}:|([0-9a-fA-F]{1,4}:){1,6}:[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,5}(:[0-9a-fA-F]{1,4}){1,2}|([0-9a-fA-F]{1,4}:){1,4}(:[0-9a-fA-F]{1,4}){1,3}|([0-9a-fA-F]{1,4}:){1,3}(:[0-9a-fA-F]{1,4}){1,4}|([0-9a-fA-F]{1,4}:){1,2}(:[0-9a-fA-F]{1,4}){1,5}|[0-9a-fA-F]{1,4}:((:[0-9a-fA-F]{1,4}){1,6})|:((:[0-9a-fA-F]{1,4}){1,7}|:)|fe80:(:[0-9a-fA-F]{0,4}){0,4}%[0-9a-zA-Z]{1,}|::(ffff(:0{1,4}){0,1}:){0,1}((25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])\.){3,3}(25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])|([0-9a-fA-F]{1,4}:){1,4}:((25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])\.){3,3}(25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9]))\/(12[0-8]|1[01][0-9]|[1-9]?[0-9])$/;
var base64Regex = /^([0-9a-zA-Z+/]{4})*(([0-9a-zA-Z+/]{2}==)|([0-9a-zA-Z+/]{3}=))?$/;
var base64urlRegex = /^([0-9a-zA-Z-_]{4})*(([0-9a-zA-Z-_]{2}(==)?)|([0-9a-zA-Z-_]{3}(=)?))?$/;
var dateRegexSource = `((\\d\\d[2468][048]|\\d\\d[13579][26]|\\d\\d0[48]|[02468][048]00|[13579][26]00)-02-29|\\d{4}-((0[13578]|1[02])-(0[1-9]|[12]\\d|3[01])|(0[469]|11)-(0[1-9]|[12]\\d|30)|(02)-(0[1-9]|1\\d|2[0-8])))`;
var dateRegex = new RegExp(`^${dateRegexSource}$`);
function timeRegexSource(args) {
  let secondsRegexSource = `[0-5]\\d`;
  if (args.precision) {
    secondsRegexSource = `${secondsRegexSource}\\.\\d{${args.precision}}`;
  } else if (args.precision == null) {
    secondsRegexSource = `${secondsRegexSource}(\\.\\d+)?`;
  }
  const secondsQuantifier = args.precision ? "+" : "?";
  return `([01]\\d|2[0-3]):[0-5]\\d(:${secondsRegexSource})${secondsQuantifier}`;
}
function timeRegex(args) {
  return new RegExp(`^${timeRegexSource(args)}$`);
}
function datetimeRegex(args) {
  let regex = `${dateRegexSource}T${timeRegexSource(args)}`;
  const opts = [];
  opts.push(args.local ? `Z?` : `Z`);
  if (args.offset)
    opts.push(`([+-]\\d{2}:?\\d{2})`);
  regex = `${regex}(${opts.join("|")})`;
  return new RegExp(`^${regex}$`);
}
function isValidIP(ip, version) {
  if ((version === "v4" || !version) && ipv4Regex.test(ip)) {
    return true;
  }
  if ((version === "v6" || !version) && ipv6Regex.test(ip)) {
    return true;
  }
  return false;
}
function isValidJWT(jwt, alg) {
  if (!jwtRegex.test(jwt))
    return false;
  try {
    const [header] = jwt.split(".");
    if (!header)
      return false;
    const base64 = header.replace(/-/g, "+").replace(/_/g, "/").padEnd(header.length + (4 - header.length % 4) % 4, "=");
    const decoded = JSON.parse(atob(base64));
    if (typeof decoded !== "object" || decoded === null)
      return false;
    if ("typ" in decoded && decoded?.typ !== "JWT")
      return false;
    if (!decoded.alg)
      return false;
    if (alg && decoded.alg !== alg)
      return false;
    return true;
  } catch {
    return false;
  }
}
function isValidCidr(ip, version) {
  if ((version === "v4" || !version) && ipv4CidrRegex.test(ip)) {
    return true;
  }
  if ((version === "v6" || !version) && ipv6CidrRegex.test(ip)) {
    return true;
  }
  return false;
}
var ZodString = class _ZodString extends ZodType {
  _parse(input) {
    if (this._def.coerce) {
      input.data = String(input.data);
    }
    const parsedType = this._getType(input);
    if (parsedType !== ZodParsedType.string) {
      const ctx2 = this._getOrReturnCtx(input);
      addIssueToContext(ctx2, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.string,
        received: ctx2.parsedType
      });
      return INVALID;
    }
    const status = new ParseStatus();
    let ctx = void 0;
    for (const check of this._def.checks) {
      if (check.kind === "min") {
        if (input.data.length < check.value) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.too_small,
            minimum: check.value,
            type: "string",
            inclusive: true,
            exact: false,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "max") {
        if (input.data.length > check.value) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.too_big,
            maximum: check.value,
            type: "string",
            inclusive: true,
            exact: false,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "length") {
        const tooBig = input.data.length > check.value;
        const tooSmall = input.data.length < check.value;
        if (tooBig || tooSmall) {
          ctx = this._getOrReturnCtx(input, ctx);
          if (tooBig) {
            addIssueToContext(ctx, {
              code: ZodIssueCode.too_big,
              maximum: check.value,
              type: "string",
              inclusive: true,
              exact: true,
              message: check.message
            });
          } else if (tooSmall) {
            addIssueToContext(ctx, {
              code: ZodIssueCode.too_small,
              minimum: check.value,
              type: "string",
              inclusive: true,
              exact: true,
              message: check.message
            });
          }
          status.dirty();
        }
      } else if (check.kind === "email") {
        if (!emailRegex.test(input.data)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            validation: "email",
            code: ZodIssueCode.invalid_string,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "emoji") {
        if (!emojiRegex) {
          emojiRegex = new RegExp(_emojiRegex, "u");
        }
        if (!emojiRegex.test(input.data)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            validation: "emoji",
            code: ZodIssueCode.invalid_string,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "uuid") {
        if (!uuidRegex.test(input.data)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            validation: "uuid",
            code: ZodIssueCode.invalid_string,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "nanoid") {
        if (!nanoidRegex.test(input.data)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            validation: "nanoid",
            code: ZodIssueCode.invalid_string,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "cuid") {
        if (!cuidRegex.test(input.data)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            validation: "cuid",
            code: ZodIssueCode.invalid_string,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "cuid2") {
        if (!cuid2Regex.test(input.data)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            validation: "cuid2",
            code: ZodIssueCode.invalid_string,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "ulid") {
        if (!ulidRegex.test(input.data)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            validation: "ulid",
            code: ZodIssueCode.invalid_string,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "url") {
        try {
          new URL(input.data);
        } catch {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            validation: "url",
            code: ZodIssueCode.invalid_string,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "regex") {
        check.regex.lastIndex = 0;
        const testResult = check.regex.test(input.data);
        if (!testResult) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            validation: "regex",
            code: ZodIssueCode.invalid_string,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "trim") {
        input.data = input.data.trim();
      } else if (check.kind === "includes") {
        if (!input.data.includes(check.value, check.position)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.invalid_string,
            validation: { includes: check.value, position: check.position },
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "toLowerCase") {
        input.data = input.data.toLowerCase();
      } else if (check.kind === "toUpperCase") {
        input.data = input.data.toUpperCase();
      } else if (check.kind === "startsWith") {
        if (!input.data.startsWith(check.value)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.invalid_string,
            validation: { startsWith: check.value },
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "endsWith") {
        if (!input.data.endsWith(check.value)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.invalid_string,
            validation: { endsWith: check.value },
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "datetime") {
        const regex = datetimeRegex(check);
        if (!regex.test(input.data)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.invalid_string,
            validation: "datetime",
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "date") {
        const regex = dateRegex;
        if (!regex.test(input.data)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.invalid_string,
            validation: "date",
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "time") {
        const regex = timeRegex(check);
        if (!regex.test(input.data)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.invalid_string,
            validation: "time",
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "duration") {
        if (!durationRegex.test(input.data)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            validation: "duration",
            code: ZodIssueCode.invalid_string,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "ip") {
        if (!isValidIP(input.data, check.version)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            validation: "ip",
            code: ZodIssueCode.invalid_string,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "jwt") {
        if (!isValidJWT(input.data, check.alg)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            validation: "jwt",
            code: ZodIssueCode.invalid_string,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "cidr") {
        if (!isValidCidr(input.data, check.version)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            validation: "cidr",
            code: ZodIssueCode.invalid_string,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "base64") {
        if (!base64Regex.test(input.data)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            validation: "base64",
            code: ZodIssueCode.invalid_string,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "base64url") {
        if (!base64urlRegex.test(input.data)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            validation: "base64url",
            code: ZodIssueCode.invalid_string,
            message: check.message
          });
          status.dirty();
        }
      } else {
        util.assertNever(check);
      }
    }
    return { status: status.value, value: input.data };
  }
  _regex(regex, validation, message) {
    return this.refinement((data) => regex.test(data), {
      validation,
      code: ZodIssueCode.invalid_string,
      ...errorUtil.errToObj(message)
    });
  }
  _addCheck(check) {
    return new _ZodString({
      ...this._def,
      checks: [...this._def.checks, check]
    });
  }
  email(message) {
    return this._addCheck({ kind: "email", ...errorUtil.errToObj(message) });
  }
  url(message) {
    return this._addCheck({ kind: "url", ...errorUtil.errToObj(message) });
  }
  emoji(message) {
    return this._addCheck({ kind: "emoji", ...errorUtil.errToObj(message) });
  }
  uuid(message) {
    return this._addCheck({ kind: "uuid", ...errorUtil.errToObj(message) });
  }
  nanoid(message) {
    return this._addCheck({ kind: "nanoid", ...errorUtil.errToObj(message) });
  }
  cuid(message) {
    return this._addCheck({ kind: "cuid", ...errorUtil.errToObj(message) });
  }
  cuid2(message) {
    return this._addCheck({ kind: "cuid2", ...errorUtil.errToObj(message) });
  }
  ulid(message) {
    return this._addCheck({ kind: "ulid", ...errorUtil.errToObj(message) });
  }
  base64(message) {
    return this._addCheck({ kind: "base64", ...errorUtil.errToObj(message) });
  }
  base64url(message) {
    return this._addCheck({
      kind: "base64url",
      ...errorUtil.errToObj(message)
    });
  }
  jwt(options) {
    return this._addCheck({ kind: "jwt", ...errorUtil.errToObj(options) });
  }
  ip(options) {
    return this._addCheck({ kind: "ip", ...errorUtil.errToObj(options) });
  }
  cidr(options) {
    return this._addCheck({ kind: "cidr", ...errorUtil.errToObj(options) });
  }
  datetime(options) {
    if (typeof options === "string") {
      return this._addCheck({
        kind: "datetime",
        precision: null,
        offset: false,
        local: false,
        message: options
      });
    }
    return this._addCheck({
      kind: "datetime",
      precision: typeof options?.precision === "undefined" ? null : options?.precision,
      offset: options?.offset ?? false,
      local: options?.local ?? false,
      ...errorUtil.errToObj(options?.message)
    });
  }
  date(message) {
    return this._addCheck({ kind: "date", message });
  }
  time(options) {
    if (typeof options === "string") {
      return this._addCheck({
        kind: "time",
        precision: null,
        message: options
      });
    }
    return this._addCheck({
      kind: "time",
      precision: typeof options?.precision === "undefined" ? null : options?.precision,
      ...errorUtil.errToObj(options?.message)
    });
  }
  duration(message) {
    return this._addCheck({ kind: "duration", ...errorUtil.errToObj(message) });
  }
  regex(regex, message) {
    return this._addCheck({
      kind: "regex",
      regex,
      ...errorUtil.errToObj(message)
    });
  }
  includes(value, options) {
    return this._addCheck({
      kind: "includes",
      value,
      position: options?.position,
      ...errorUtil.errToObj(options?.message)
    });
  }
  startsWith(value, message) {
    return this._addCheck({
      kind: "startsWith",
      value,
      ...errorUtil.errToObj(message)
    });
  }
  endsWith(value, message) {
    return this._addCheck({
      kind: "endsWith",
      value,
      ...errorUtil.errToObj(message)
    });
  }
  min(minLength, message) {
    return this._addCheck({
      kind: "min",
      value: minLength,
      ...errorUtil.errToObj(message)
    });
  }
  max(maxLength, message) {
    return this._addCheck({
      kind: "max",
      value: maxLength,
      ...errorUtil.errToObj(message)
    });
  }
  length(len, message) {
    return this._addCheck({
      kind: "length",
      value: len,
      ...errorUtil.errToObj(message)
    });
  }
  /**
   * Equivalent to `.min(1)`
   */
  nonempty(message) {
    return this.min(1, errorUtil.errToObj(message));
  }
  trim() {
    return new _ZodString({
      ...this._def,
      checks: [...this._def.checks, { kind: "trim" }]
    });
  }
  toLowerCase() {
    return new _ZodString({
      ...this._def,
      checks: [...this._def.checks, { kind: "toLowerCase" }]
    });
  }
  toUpperCase() {
    return new _ZodString({
      ...this._def,
      checks: [...this._def.checks, { kind: "toUpperCase" }]
    });
  }
  get isDatetime() {
    return !!this._def.checks.find((ch) => ch.kind === "datetime");
  }
  get isDate() {
    return !!this._def.checks.find((ch) => ch.kind === "date");
  }
  get isTime() {
    return !!this._def.checks.find((ch) => ch.kind === "time");
  }
  get isDuration() {
    return !!this._def.checks.find((ch) => ch.kind === "duration");
  }
  get isEmail() {
    return !!this._def.checks.find((ch) => ch.kind === "email");
  }
  get isURL() {
    return !!this._def.checks.find((ch) => ch.kind === "url");
  }
  get isEmoji() {
    return !!this._def.checks.find((ch) => ch.kind === "emoji");
  }
  get isUUID() {
    return !!this._def.checks.find((ch) => ch.kind === "uuid");
  }
  get isNANOID() {
    return !!this._def.checks.find((ch) => ch.kind === "nanoid");
  }
  get isCUID() {
    return !!this._def.checks.find((ch) => ch.kind === "cuid");
  }
  get isCUID2() {
    return !!this._def.checks.find((ch) => ch.kind === "cuid2");
  }
  get isULID() {
    return !!this._def.checks.find((ch) => ch.kind === "ulid");
  }
  get isIP() {
    return !!this._def.checks.find((ch) => ch.kind === "ip");
  }
  get isCIDR() {
    return !!this._def.checks.find((ch) => ch.kind === "cidr");
  }
  get isBase64() {
    return !!this._def.checks.find((ch) => ch.kind === "base64");
  }
  get isBase64url() {
    return !!this._def.checks.find((ch) => ch.kind === "base64url");
  }
  get minLength() {
    let min = null;
    for (const ch of this._def.checks) {
      if (ch.kind === "min") {
        if (min === null || ch.value > min)
          min = ch.value;
      }
    }
    return min;
  }
  get maxLength() {
    let max = null;
    for (const ch of this._def.checks) {
      if (ch.kind === "max") {
        if (max === null || ch.value < max)
          max = ch.value;
      }
    }
    return max;
  }
};
ZodString.create = (params) => {
  return new ZodString({
    checks: [],
    typeName: ZodFirstPartyTypeKind.ZodString,
    coerce: params?.coerce ?? false,
    ...processCreateParams(params)
  });
};
function floatSafeRemainder(val, step) {
  const valDecCount = (val.toString().split(".")[1] || "").length;
  const stepDecCount = (step.toString().split(".")[1] || "").length;
  const decCount = valDecCount > stepDecCount ? valDecCount : stepDecCount;
  const valInt = Number.parseInt(val.toFixed(decCount).replace(".", ""));
  const stepInt = Number.parseInt(step.toFixed(decCount).replace(".", ""));
  return valInt % stepInt / 10 ** decCount;
}
var ZodNumber = class _ZodNumber extends ZodType {
  constructor() {
    super(...arguments);
    this.min = this.gte;
    this.max = this.lte;
    this.step = this.multipleOf;
  }
  _parse(input) {
    if (this._def.coerce) {
      input.data = Number(input.data);
    }
    const parsedType = this._getType(input);
    if (parsedType !== ZodParsedType.number) {
      const ctx2 = this._getOrReturnCtx(input);
      addIssueToContext(ctx2, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.number,
        received: ctx2.parsedType
      });
      return INVALID;
    }
    let ctx = void 0;
    const status = new ParseStatus();
    for (const check of this._def.checks) {
      if (check.kind === "int") {
        if (!util.isInteger(input.data)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.invalid_type,
            expected: "integer",
            received: "float",
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "min") {
        const tooSmall = check.inclusive ? input.data < check.value : input.data <= check.value;
        if (tooSmall) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.too_small,
            minimum: check.value,
            type: "number",
            inclusive: check.inclusive,
            exact: false,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "max") {
        const tooBig = check.inclusive ? input.data > check.value : input.data >= check.value;
        if (tooBig) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.too_big,
            maximum: check.value,
            type: "number",
            inclusive: check.inclusive,
            exact: false,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "multipleOf") {
        if (floatSafeRemainder(input.data, check.value) !== 0) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.not_multiple_of,
            multipleOf: check.value,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "finite") {
        if (!Number.isFinite(input.data)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.not_finite,
            message: check.message
          });
          status.dirty();
        }
      } else {
        util.assertNever(check);
      }
    }
    return { status: status.value, value: input.data };
  }
  gte(value, message) {
    return this.setLimit("min", value, true, errorUtil.toString(message));
  }
  gt(value, message) {
    return this.setLimit("min", value, false, errorUtil.toString(message));
  }
  lte(value, message) {
    return this.setLimit("max", value, true, errorUtil.toString(message));
  }
  lt(value, message) {
    return this.setLimit("max", value, false, errorUtil.toString(message));
  }
  setLimit(kind, value, inclusive, message) {
    return new _ZodNumber({
      ...this._def,
      checks: [
        ...this._def.checks,
        {
          kind,
          value,
          inclusive,
          message: errorUtil.toString(message)
        }
      ]
    });
  }
  _addCheck(check) {
    return new _ZodNumber({
      ...this._def,
      checks: [...this._def.checks, check]
    });
  }
  int(message) {
    return this._addCheck({
      kind: "int",
      message: errorUtil.toString(message)
    });
  }
  positive(message) {
    return this._addCheck({
      kind: "min",
      value: 0,
      inclusive: false,
      message: errorUtil.toString(message)
    });
  }
  negative(message) {
    return this._addCheck({
      kind: "max",
      value: 0,
      inclusive: false,
      message: errorUtil.toString(message)
    });
  }
  nonpositive(message) {
    return this._addCheck({
      kind: "max",
      value: 0,
      inclusive: true,
      message: errorUtil.toString(message)
    });
  }
  nonnegative(message) {
    return this._addCheck({
      kind: "min",
      value: 0,
      inclusive: true,
      message: errorUtil.toString(message)
    });
  }
  multipleOf(value, message) {
    return this._addCheck({
      kind: "multipleOf",
      value,
      message: errorUtil.toString(message)
    });
  }
  finite(message) {
    return this._addCheck({
      kind: "finite",
      message: errorUtil.toString(message)
    });
  }
  safe(message) {
    return this._addCheck({
      kind: "min",
      inclusive: true,
      value: Number.MIN_SAFE_INTEGER,
      message: errorUtil.toString(message)
    })._addCheck({
      kind: "max",
      inclusive: true,
      value: Number.MAX_SAFE_INTEGER,
      message: errorUtil.toString(message)
    });
  }
  get minValue() {
    let min = null;
    for (const ch of this._def.checks) {
      if (ch.kind === "min") {
        if (min === null || ch.value > min)
          min = ch.value;
      }
    }
    return min;
  }
  get maxValue() {
    let max = null;
    for (const ch of this._def.checks) {
      if (ch.kind === "max") {
        if (max === null || ch.value < max)
          max = ch.value;
      }
    }
    return max;
  }
  get isInt() {
    return !!this._def.checks.find((ch) => ch.kind === "int" || ch.kind === "multipleOf" && util.isInteger(ch.value));
  }
  get isFinite() {
    let max = null;
    let min = null;
    for (const ch of this._def.checks) {
      if (ch.kind === "finite" || ch.kind === "int" || ch.kind === "multipleOf") {
        return true;
      } else if (ch.kind === "min") {
        if (min === null || ch.value > min)
          min = ch.value;
      } else if (ch.kind === "max") {
        if (max === null || ch.value < max)
          max = ch.value;
      }
    }
    return Number.isFinite(min) && Number.isFinite(max);
  }
};
ZodNumber.create = (params) => {
  return new ZodNumber({
    checks: [],
    typeName: ZodFirstPartyTypeKind.ZodNumber,
    coerce: params?.coerce || false,
    ...processCreateParams(params)
  });
};
var ZodBigInt = class _ZodBigInt extends ZodType {
  constructor() {
    super(...arguments);
    this.min = this.gte;
    this.max = this.lte;
  }
  _parse(input) {
    if (this._def.coerce) {
      try {
        input.data = BigInt(input.data);
      } catch {
        return this._getInvalidInput(input);
      }
    }
    const parsedType = this._getType(input);
    if (parsedType !== ZodParsedType.bigint) {
      return this._getInvalidInput(input);
    }
    let ctx = void 0;
    const status = new ParseStatus();
    for (const check of this._def.checks) {
      if (check.kind === "min") {
        const tooSmall = check.inclusive ? input.data < check.value : input.data <= check.value;
        if (tooSmall) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.too_small,
            type: "bigint",
            minimum: check.value,
            inclusive: check.inclusive,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "max") {
        const tooBig = check.inclusive ? input.data > check.value : input.data >= check.value;
        if (tooBig) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.too_big,
            type: "bigint",
            maximum: check.value,
            inclusive: check.inclusive,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "multipleOf") {
        if (input.data % check.value !== BigInt(0)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.not_multiple_of,
            multipleOf: check.value,
            message: check.message
          });
          status.dirty();
        }
      } else {
        util.assertNever(check);
      }
    }
    return { status: status.value, value: input.data };
  }
  _getInvalidInput(input) {
    const ctx = this._getOrReturnCtx(input);
    addIssueToContext(ctx, {
      code: ZodIssueCode.invalid_type,
      expected: ZodParsedType.bigint,
      received: ctx.parsedType
    });
    return INVALID;
  }
  gte(value, message) {
    return this.setLimit("min", value, true, errorUtil.toString(message));
  }
  gt(value, message) {
    return this.setLimit("min", value, false, errorUtil.toString(message));
  }
  lte(value, message) {
    return this.setLimit("max", value, true, errorUtil.toString(message));
  }
  lt(value, message) {
    return this.setLimit("max", value, false, errorUtil.toString(message));
  }
  setLimit(kind, value, inclusive, message) {
    return new _ZodBigInt({
      ...this._def,
      checks: [
        ...this._def.checks,
        {
          kind,
          value,
          inclusive,
          message: errorUtil.toString(message)
        }
      ]
    });
  }
  _addCheck(check) {
    return new _ZodBigInt({
      ...this._def,
      checks: [...this._def.checks, check]
    });
  }
  positive(message) {
    return this._addCheck({
      kind: "min",
      value: BigInt(0),
      inclusive: false,
      message: errorUtil.toString(message)
    });
  }
  negative(message) {
    return this._addCheck({
      kind: "max",
      value: BigInt(0),
      inclusive: false,
      message: errorUtil.toString(message)
    });
  }
  nonpositive(message) {
    return this._addCheck({
      kind: "max",
      value: BigInt(0),
      inclusive: true,
      message: errorUtil.toString(message)
    });
  }
  nonnegative(message) {
    return this._addCheck({
      kind: "min",
      value: BigInt(0),
      inclusive: true,
      message: errorUtil.toString(message)
    });
  }
  multipleOf(value, message) {
    return this._addCheck({
      kind: "multipleOf",
      value,
      message: errorUtil.toString(message)
    });
  }
  get minValue() {
    let min = null;
    for (const ch of this._def.checks) {
      if (ch.kind === "min") {
        if (min === null || ch.value > min)
          min = ch.value;
      }
    }
    return min;
  }
  get maxValue() {
    let max = null;
    for (const ch of this._def.checks) {
      if (ch.kind === "max") {
        if (max === null || ch.value < max)
          max = ch.value;
      }
    }
    return max;
  }
};
ZodBigInt.create = (params) => {
  return new ZodBigInt({
    checks: [],
    typeName: ZodFirstPartyTypeKind.ZodBigInt,
    coerce: params?.coerce ?? false,
    ...processCreateParams(params)
  });
};
var ZodBoolean = class extends ZodType {
  _parse(input) {
    if (this._def.coerce) {
      input.data = Boolean(input.data);
    }
    const parsedType = this._getType(input);
    if (parsedType !== ZodParsedType.boolean) {
      const ctx = this._getOrReturnCtx(input);
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.boolean,
        received: ctx.parsedType
      });
      return INVALID;
    }
    return OK(input.data);
  }
};
ZodBoolean.create = (params) => {
  return new ZodBoolean({
    typeName: ZodFirstPartyTypeKind.ZodBoolean,
    coerce: params?.coerce || false,
    ...processCreateParams(params)
  });
};
var ZodDate = class _ZodDate extends ZodType {
  _parse(input) {
    if (this._def.coerce) {
      input.data = new Date(input.data);
    }
    const parsedType = this._getType(input);
    if (parsedType !== ZodParsedType.date) {
      const ctx2 = this._getOrReturnCtx(input);
      addIssueToContext(ctx2, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.date,
        received: ctx2.parsedType
      });
      return INVALID;
    }
    if (Number.isNaN(input.data.getTime())) {
      const ctx2 = this._getOrReturnCtx(input);
      addIssueToContext(ctx2, {
        code: ZodIssueCode.invalid_date
      });
      return INVALID;
    }
    const status = new ParseStatus();
    let ctx = void 0;
    for (const check of this._def.checks) {
      if (check.kind === "min") {
        if (input.data.getTime() < check.value) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.too_small,
            message: check.message,
            inclusive: true,
            exact: false,
            minimum: check.value,
            type: "date"
          });
          status.dirty();
        }
      } else if (check.kind === "max") {
        if (input.data.getTime() > check.value) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.too_big,
            message: check.message,
            inclusive: true,
            exact: false,
            maximum: check.value,
            type: "date"
          });
          status.dirty();
        }
      } else {
        util.assertNever(check);
      }
    }
    return {
      status: status.value,
      value: new Date(input.data.getTime())
    };
  }
  _addCheck(check) {
    return new _ZodDate({
      ...this._def,
      checks: [...this._def.checks, check]
    });
  }
  min(minDate, message) {
    return this._addCheck({
      kind: "min",
      value: minDate.getTime(),
      message: errorUtil.toString(message)
    });
  }
  max(maxDate, message) {
    return this._addCheck({
      kind: "max",
      value: maxDate.getTime(),
      message: errorUtil.toString(message)
    });
  }
  get minDate() {
    let min = null;
    for (const ch of this._def.checks) {
      if (ch.kind === "min") {
        if (min === null || ch.value > min)
          min = ch.value;
      }
    }
    return min != null ? new Date(min) : null;
  }
  get maxDate() {
    let max = null;
    for (const ch of this._def.checks) {
      if (ch.kind === "max") {
        if (max === null || ch.value < max)
          max = ch.value;
      }
    }
    return max != null ? new Date(max) : null;
  }
};
ZodDate.create = (params) => {
  return new ZodDate({
    checks: [],
    coerce: params?.coerce || false,
    typeName: ZodFirstPartyTypeKind.ZodDate,
    ...processCreateParams(params)
  });
};
var ZodSymbol = class extends ZodType {
  _parse(input) {
    const parsedType = this._getType(input);
    if (parsedType !== ZodParsedType.symbol) {
      const ctx = this._getOrReturnCtx(input);
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.symbol,
        received: ctx.parsedType
      });
      return INVALID;
    }
    return OK(input.data);
  }
};
ZodSymbol.create = (params) => {
  return new ZodSymbol({
    typeName: ZodFirstPartyTypeKind.ZodSymbol,
    ...processCreateParams(params)
  });
};
var ZodUndefined = class extends ZodType {
  _parse(input) {
    const parsedType = this._getType(input);
    if (parsedType !== ZodParsedType.undefined) {
      const ctx = this._getOrReturnCtx(input);
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.undefined,
        received: ctx.parsedType
      });
      return INVALID;
    }
    return OK(input.data);
  }
};
ZodUndefined.create = (params) => {
  return new ZodUndefined({
    typeName: ZodFirstPartyTypeKind.ZodUndefined,
    ...processCreateParams(params)
  });
};
var ZodNull = class extends ZodType {
  _parse(input) {
    const parsedType = this._getType(input);
    if (parsedType !== ZodParsedType.null) {
      const ctx = this._getOrReturnCtx(input);
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.null,
        received: ctx.parsedType
      });
      return INVALID;
    }
    return OK(input.data);
  }
};
ZodNull.create = (params) => {
  return new ZodNull({
    typeName: ZodFirstPartyTypeKind.ZodNull,
    ...processCreateParams(params)
  });
};
var ZodAny = class extends ZodType {
  constructor() {
    super(...arguments);
    this._any = true;
  }
  _parse(input) {
    return OK(input.data);
  }
};
ZodAny.create = (params) => {
  return new ZodAny({
    typeName: ZodFirstPartyTypeKind.ZodAny,
    ...processCreateParams(params)
  });
};
var ZodUnknown = class extends ZodType {
  constructor() {
    super(...arguments);
    this._unknown = true;
  }
  _parse(input) {
    return OK(input.data);
  }
};
ZodUnknown.create = (params) => {
  return new ZodUnknown({
    typeName: ZodFirstPartyTypeKind.ZodUnknown,
    ...processCreateParams(params)
  });
};
var ZodNever = class extends ZodType {
  _parse(input) {
    const ctx = this._getOrReturnCtx(input);
    addIssueToContext(ctx, {
      code: ZodIssueCode.invalid_type,
      expected: ZodParsedType.never,
      received: ctx.parsedType
    });
    return INVALID;
  }
};
ZodNever.create = (params) => {
  return new ZodNever({
    typeName: ZodFirstPartyTypeKind.ZodNever,
    ...processCreateParams(params)
  });
};
var ZodVoid = class extends ZodType {
  _parse(input) {
    const parsedType = this._getType(input);
    if (parsedType !== ZodParsedType.undefined) {
      const ctx = this._getOrReturnCtx(input);
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.void,
        received: ctx.parsedType
      });
      return INVALID;
    }
    return OK(input.data);
  }
};
ZodVoid.create = (params) => {
  return new ZodVoid({
    typeName: ZodFirstPartyTypeKind.ZodVoid,
    ...processCreateParams(params)
  });
};
var ZodArray = class _ZodArray extends ZodType {
  _parse(input) {
    const { ctx, status } = this._processInputParams(input);
    const def = this._def;
    if (ctx.parsedType !== ZodParsedType.array) {
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.array,
        received: ctx.parsedType
      });
      return INVALID;
    }
    if (def.exactLength !== null) {
      const tooBig = ctx.data.length > def.exactLength.value;
      const tooSmall = ctx.data.length < def.exactLength.value;
      if (tooBig || tooSmall) {
        addIssueToContext(ctx, {
          code: tooBig ? ZodIssueCode.too_big : ZodIssueCode.too_small,
          minimum: tooSmall ? def.exactLength.value : void 0,
          maximum: tooBig ? def.exactLength.value : void 0,
          type: "array",
          inclusive: true,
          exact: true,
          message: def.exactLength.message
        });
        status.dirty();
      }
    }
    if (def.minLength !== null) {
      if (ctx.data.length < def.minLength.value) {
        addIssueToContext(ctx, {
          code: ZodIssueCode.too_small,
          minimum: def.minLength.value,
          type: "array",
          inclusive: true,
          exact: false,
          message: def.minLength.message
        });
        status.dirty();
      }
    }
    if (def.maxLength !== null) {
      if (ctx.data.length > def.maxLength.value) {
        addIssueToContext(ctx, {
          code: ZodIssueCode.too_big,
          maximum: def.maxLength.value,
          type: "array",
          inclusive: true,
          exact: false,
          message: def.maxLength.message
        });
        status.dirty();
      }
    }
    if (ctx.common.async) {
      return Promise.all([...ctx.data].map((item, i) => {
        return def.type._parseAsync(new ParseInputLazyPath(ctx, item, ctx.path, i));
      })).then((result2) => {
        return ParseStatus.mergeArray(status, result2);
      });
    }
    const result = [...ctx.data].map((item, i) => {
      return def.type._parseSync(new ParseInputLazyPath(ctx, item, ctx.path, i));
    });
    return ParseStatus.mergeArray(status, result);
  }
  get element() {
    return this._def.type;
  }
  min(minLength, message) {
    return new _ZodArray({
      ...this._def,
      minLength: { value: minLength, message: errorUtil.toString(message) }
    });
  }
  max(maxLength, message) {
    return new _ZodArray({
      ...this._def,
      maxLength: { value: maxLength, message: errorUtil.toString(message) }
    });
  }
  length(len, message) {
    return new _ZodArray({
      ...this._def,
      exactLength: { value: len, message: errorUtil.toString(message) }
    });
  }
  nonempty(message) {
    return this.min(1, message);
  }
};
ZodArray.create = (schema, params) => {
  return new ZodArray({
    type: schema,
    minLength: null,
    maxLength: null,
    exactLength: null,
    typeName: ZodFirstPartyTypeKind.ZodArray,
    ...processCreateParams(params)
  });
};
function deepPartialify(schema) {
  if (schema instanceof ZodObject) {
    const newShape = {};
    for (const key in schema.shape) {
      const fieldSchema = schema.shape[key];
      newShape[key] = ZodOptional.create(deepPartialify(fieldSchema));
    }
    return new ZodObject({
      ...schema._def,
      shape: () => newShape
    });
  } else if (schema instanceof ZodArray) {
    return new ZodArray({
      ...schema._def,
      type: deepPartialify(schema.element)
    });
  } else if (schema instanceof ZodOptional) {
    return ZodOptional.create(deepPartialify(schema.unwrap()));
  } else if (schema instanceof ZodNullable) {
    return ZodNullable.create(deepPartialify(schema.unwrap()));
  } else if (schema instanceof ZodTuple) {
    return ZodTuple.create(schema.items.map((item) => deepPartialify(item)));
  } else {
    return schema;
  }
}
var ZodObject = class _ZodObject extends ZodType {
  constructor() {
    super(...arguments);
    this._cached = null;
    this.nonstrict = this.passthrough;
    this.augment = this.extend;
  }
  _getCached() {
    if (this._cached !== null)
      return this._cached;
    const shape = this._def.shape();
    const keys = util.objectKeys(shape);
    this._cached = { shape, keys };
    return this._cached;
  }
  _parse(input) {
    const parsedType = this._getType(input);
    if (parsedType !== ZodParsedType.object) {
      const ctx2 = this._getOrReturnCtx(input);
      addIssueToContext(ctx2, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.object,
        received: ctx2.parsedType
      });
      return INVALID;
    }
    const { status, ctx } = this._processInputParams(input);
    const { shape, keys: shapeKeys } = this._getCached();
    const extraKeys = [];
    if (!(this._def.catchall instanceof ZodNever && this._def.unknownKeys === "strip")) {
      for (const key in ctx.data) {
        if (!shapeKeys.includes(key)) {
          extraKeys.push(key);
        }
      }
    }
    const pairs = [];
    for (const key of shapeKeys) {
      const keyValidator = shape[key];
      const value = ctx.data[key];
      pairs.push({
        key: { status: "valid", value: key },
        value: keyValidator._parse(new ParseInputLazyPath(ctx, value, ctx.path, key)),
        alwaysSet: key in ctx.data
      });
    }
    if (this._def.catchall instanceof ZodNever) {
      const unknownKeys = this._def.unknownKeys;
      if (unknownKeys === "passthrough") {
        for (const key of extraKeys) {
          pairs.push({
            key: { status: "valid", value: key },
            value: { status: "valid", value: ctx.data[key] }
          });
        }
      } else if (unknownKeys === "strict") {
        if (extraKeys.length > 0) {
          addIssueToContext(ctx, {
            code: ZodIssueCode.unrecognized_keys,
            keys: extraKeys
          });
          status.dirty();
        }
      } else if (unknownKeys === "strip") {
      } else {
        throw new Error(`Internal ZodObject error: invalid unknownKeys value.`);
      }
    } else {
      const catchall = this._def.catchall;
      for (const key of extraKeys) {
        const value = ctx.data[key];
        pairs.push({
          key: { status: "valid", value: key },
          value: catchall._parse(
            new ParseInputLazyPath(ctx, value, ctx.path, key)
            //, ctx.child(key), value, getParsedType(value)
          ),
          alwaysSet: key in ctx.data
        });
      }
    }
    if (ctx.common.async) {
      return Promise.resolve().then(async () => {
        const syncPairs = [];
        for (const pair of pairs) {
          const key = await pair.key;
          const value = await pair.value;
          syncPairs.push({
            key,
            value,
            alwaysSet: pair.alwaysSet
          });
        }
        return syncPairs;
      }).then((syncPairs) => {
        return ParseStatus.mergeObjectSync(status, syncPairs);
      });
    } else {
      return ParseStatus.mergeObjectSync(status, pairs);
    }
  }
  get shape() {
    return this._def.shape();
  }
  strict(message) {
    errorUtil.errToObj;
    return new _ZodObject({
      ...this._def,
      unknownKeys: "strict",
      ...message !== void 0 ? {
        errorMap: (issue, ctx) => {
          const defaultError = this._def.errorMap?.(issue, ctx).message ?? ctx.defaultError;
          if (issue.code === "unrecognized_keys")
            return {
              message: errorUtil.errToObj(message).message ?? defaultError
            };
          return {
            message: defaultError
          };
        }
      } : {}
    });
  }
  strip() {
    return new _ZodObject({
      ...this._def,
      unknownKeys: "strip"
    });
  }
  passthrough() {
    return new _ZodObject({
      ...this._def,
      unknownKeys: "passthrough"
    });
  }
  // const AugmentFactory =
  //   <Def extends ZodObjectDef>(def: Def) =>
  //   <Augmentation extends ZodRawShape>(
  //     augmentation: Augmentation
  //   ): ZodObject<
  //     extendShape<ReturnType<Def["shape"]>, Augmentation>,
  //     Def["unknownKeys"],
  //     Def["catchall"]
  //   > => {
  //     return new ZodObject({
  //       ...def,
  //       shape: () => ({
  //         ...def.shape(),
  //         ...augmentation,
  //       }),
  //     }) as any;
  //   };
  extend(augmentation) {
    return new _ZodObject({
      ...this._def,
      shape: () => ({
        ...this._def.shape(),
        ...augmentation
      })
    });
  }
  /**
   * Prior to zod@1.0.12 there was a bug in the
   * inferred type of merged objects. Please
   * upgrade if you are experiencing issues.
   */
  merge(merging) {
    const merged = new _ZodObject({
      unknownKeys: merging._def.unknownKeys,
      catchall: merging._def.catchall,
      shape: () => ({
        ...this._def.shape(),
        ...merging._def.shape()
      }),
      typeName: ZodFirstPartyTypeKind.ZodObject
    });
    return merged;
  }
  // merge<
  //   Incoming extends AnyZodObject,
  //   Augmentation extends Incoming["shape"],
  //   NewOutput extends {
  //     [k in keyof Augmentation | keyof Output]: k extends keyof Augmentation
  //       ? Augmentation[k]["_output"]
  //       : k extends keyof Output
  //       ? Output[k]
  //       : never;
  //   },
  //   NewInput extends {
  //     [k in keyof Augmentation | keyof Input]: k extends keyof Augmentation
  //       ? Augmentation[k]["_input"]
  //       : k extends keyof Input
  //       ? Input[k]
  //       : never;
  //   }
  // >(
  //   merging: Incoming
  // ): ZodObject<
  //   extendShape<T, ReturnType<Incoming["_def"]["shape"]>>,
  //   Incoming["_def"]["unknownKeys"],
  //   Incoming["_def"]["catchall"],
  //   NewOutput,
  //   NewInput
  // > {
  //   const merged: any = new ZodObject({
  //     unknownKeys: merging._def.unknownKeys,
  //     catchall: merging._def.catchall,
  //     shape: () =>
  //       objectUtil.mergeShapes(this._def.shape(), merging._def.shape()),
  //     typeName: ZodFirstPartyTypeKind.ZodObject,
  //   }) as any;
  //   return merged;
  // }
  setKey(key, schema) {
    return this.augment({ [key]: schema });
  }
  // merge<Incoming extends AnyZodObject>(
  //   merging: Incoming
  // ): //ZodObject<T & Incoming["_shape"], UnknownKeys, Catchall> = (merging) => {
  // ZodObject<
  //   extendShape<T, ReturnType<Incoming["_def"]["shape"]>>,
  //   Incoming["_def"]["unknownKeys"],
  //   Incoming["_def"]["catchall"]
  // > {
  //   // const mergedShape = objectUtil.mergeShapes(
  //   //   this._def.shape(),
  //   //   merging._def.shape()
  //   // );
  //   const merged: any = new ZodObject({
  //     unknownKeys: merging._def.unknownKeys,
  //     catchall: merging._def.catchall,
  //     shape: () =>
  //       objectUtil.mergeShapes(this._def.shape(), merging._def.shape()),
  //     typeName: ZodFirstPartyTypeKind.ZodObject,
  //   }) as any;
  //   return merged;
  // }
  catchall(index) {
    return new _ZodObject({
      ...this._def,
      catchall: index
    });
  }
  pick(mask) {
    const shape = {};
    for (const key of util.objectKeys(mask)) {
      if (mask[key] && this.shape[key]) {
        shape[key] = this.shape[key];
      }
    }
    return new _ZodObject({
      ...this._def,
      shape: () => shape
    });
  }
  omit(mask) {
    const shape = {};
    for (const key of util.objectKeys(this.shape)) {
      if (!mask[key]) {
        shape[key] = this.shape[key];
      }
    }
    return new _ZodObject({
      ...this._def,
      shape: () => shape
    });
  }
  /**
   * @deprecated
   */
  deepPartial() {
    return deepPartialify(this);
  }
  partial(mask) {
    const newShape = {};
    for (const key of util.objectKeys(this.shape)) {
      const fieldSchema = this.shape[key];
      if (mask && !mask[key]) {
        newShape[key] = fieldSchema;
      } else {
        newShape[key] = fieldSchema.optional();
      }
    }
    return new _ZodObject({
      ...this._def,
      shape: () => newShape
    });
  }
  required(mask) {
    const newShape = {};
    for (const key of util.objectKeys(this.shape)) {
      if (mask && !mask[key]) {
        newShape[key] = this.shape[key];
      } else {
        const fieldSchema = this.shape[key];
        let newField = fieldSchema;
        while (newField instanceof ZodOptional) {
          newField = newField._def.innerType;
        }
        newShape[key] = newField;
      }
    }
    return new _ZodObject({
      ...this._def,
      shape: () => newShape
    });
  }
  keyof() {
    return createZodEnum(util.objectKeys(this.shape));
  }
};
ZodObject.create = (shape, params) => {
  return new ZodObject({
    shape: () => shape,
    unknownKeys: "strip",
    catchall: ZodNever.create(),
    typeName: ZodFirstPartyTypeKind.ZodObject,
    ...processCreateParams(params)
  });
};
ZodObject.strictCreate = (shape, params) => {
  return new ZodObject({
    shape: () => shape,
    unknownKeys: "strict",
    catchall: ZodNever.create(),
    typeName: ZodFirstPartyTypeKind.ZodObject,
    ...processCreateParams(params)
  });
};
ZodObject.lazycreate = (shape, params) => {
  return new ZodObject({
    shape,
    unknownKeys: "strip",
    catchall: ZodNever.create(),
    typeName: ZodFirstPartyTypeKind.ZodObject,
    ...processCreateParams(params)
  });
};
var ZodUnion = class extends ZodType {
  _parse(input) {
    const { ctx } = this._processInputParams(input);
    const options = this._def.options;
    function handleResults(results) {
      for (const result of results) {
        if (result.result.status === "valid") {
          return result.result;
        }
      }
      for (const result of results) {
        if (result.result.status === "dirty") {
          ctx.common.issues.push(...result.ctx.common.issues);
          return result.result;
        }
      }
      const unionErrors = results.map((result) => new ZodError(result.ctx.common.issues));
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_union,
        unionErrors
      });
      return INVALID;
    }
    if (ctx.common.async) {
      return Promise.all(options.map(async (option) => {
        const childCtx = {
          ...ctx,
          common: {
            ...ctx.common,
            issues: []
          },
          parent: null
        };
        return {
          result: await option._parseAsync({
            data: ctx.data,
            path: ctx.path,
            parent: childCtx
          }),
          ctx: childCtx
        };
      })).then(handleResults);
    } else {
      let dirty = void 0;
      const issues = [];
      for (const option of options) {
        const childCtx = {
          ...ctx,
          common: {
            ...ctx.common,
            issues: []
          },
          parent: null
        };
        const result = option._parseSync({
          data: ctx.data,
          path: ctx.path,
          parent: childCtx
        });
        if (result.status === "valid") {
          return result;
        } else if (result.status === "dirty" && !dirty) {
          dirty = { result, ctx: childCtx };
        }
        if (childCtx.common.issues.length) {
          issues.push(childCtx.common.issues);
        }
      }
      if (dirty) {
        ctx.common.issues.push(...dirty.ctx.common.issues);
        return dirty.result;
      }
      const unionErrors = issues.map((issues2) => new ZodError(issues2));
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_union,
        unionErrors
      });
      return INVALID;
    }
  }
  get options() {
    return this._def.options;
  }
};
ZodUnion.create = (types, params) => {
  return new ZodUnion({
    options: types,
    typeName: ZodFirstPartyTypeKind.ZodUnion,
    ...processCreateParams(params)
  });
};
var getDiscriminator = (type) => {
  if (type instanceof ZodLazy) {
    return getDiscriminator(type.schema);
  } else if (type instanceof ZodEffects) {
    return getDiscriminator(type.innerType());
  } else if (type instanceof ZodLiteral) {
    return [type.value];
  } else if (type instanceof ZodEnum) {
    return type.options;
  } else if (type instanceof ZodNativeEnum) {
    return util.objectValues(type.enum);
  } else if (type instanceof ZodDefault) {
    return getDiscriminator(type._def.innerType);
  } else if (type instanceof ZodUndefined) {
    return [void 0];
  } else if (type instanceof ZodNull) {
    return [null];
  } else if (type instanceof ZodOptional) {
    return [void 0, ...getDiscriminator(type.unwrap())];
  } else if (type instanceof ZodNullable) {
    return [null, ...getDiscriminator(type.unwrap())];
  } else if (type instanceof ZodBranded) {
    return getDiscriminator(type.unwrap());
  } else if (type instanceof ZodReadonly) {
    return getDiscriminator(type.unwrap());
  } else if (type instanceof ZodCatch) {
    return getDiscriminator(type._def.innerType);
  } else {
    return [];
  }
};
var ZodDiscriminatedUnion = class _ZodDiscriminatedUnion extends ZodType {
  _parse(input) {
    const { ctx } = this._processInputParams(input);
    if (ctx.parsedType !== ZodParsedType.object) {
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.object,
        received: ctx.parsedType
      });
      return INVALID;
    }
    const discriminator = this.discriminator;
    const discriminatorValue = ctx.data[discriminator];
    const option = this.optionsMap.get(discriminatorValue);
    if (!option) {
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_union_discriminator,
        options: Array.from(this.optionsMap.keys()),
        path: [discriminator]
      });
      return INVALID;
    }
    if (ctx.common.async) {
      return option._parseAsync({
        data: ctx.data,
        path: ctx.path,
        parent: ctx
      });
    } else {
      return option._parseSync({
        data: ctx.data,
        path: ctx.path,
        parent: ctx
      });
    }
  }
  get discriminator() {
    return this._def.discriminator;
  }
  get options() {
    return this._def.options;
  }
  get optionsMap() {
    return this._def.optionsMap;
  }
  /**
   * The constructor of the discriminated union schema. Its behaviour is very similar to that of the normal z.union() constructor.
   * However, it only allows a union of objects, all of which need to share a discriminator property. This property must
   * have a different value for each object in the union.
   * @param discriminator the name of the discriminator property
   * @param types an array of object schemas
   * @param params
   */
  static create(discriminator, options, params) {
    const optionsMap = /* @__PURE__ */ new Map();
    for (const type of options) {
      const discriminatorValues = getDiscriminator(type.shape[discriminator]);
      if (!discriminatorValues.length) {
        throw new Error(`A discriminator value for key \`${discriminator}\` could not be extracted from all schema options`);
      }
      for (const value of discriminatorValues) {
        if (optionsMap.has(value)) {
          throw new Error(`Discriminator property ${String(discriminator)} has duplicate value ${String(value)}`);
        }
        optionsMap.set(value, type);
      }
    }
    return new _ZodDiscriminatedUnion({
      typeName: ZodFirstPartyTypeKind.ZodDiscriminatedUnion,
      discriminator,
      options,
      optionsMap,
      ...processCreateParams(params)
    });
  }
};
function mergeValues(a, b) {
  const aType = getParsedType(a);
  const bType = getParsedType(b);
  if (a === b) {
    return { valid: true, data: a };
  } else if (aType === ZodParsedType.object && bType === ZodParsedType.object) {
    const bKeys = util.objectKeys(b);
    const sharedKeys = util.objectKeys(a).filter((key) => bKeys.indexOf(key) !== -1);
    const newObj = { ...a, ...b };
    for (const key of sharedKeys) {
      const sharedValue = mergeValues(a[key], b[key]);
      if (!sharedValue.valid) {
        return { valid: false };
      }
      newObj[key] = sharedValue.data;
    }
    return { valid: true, data: newObj };
  } else if (aType === ZodParsedType.array && bType === ZodParsedType.array) {
    if (a.length !== b.length) {
      return { valid: false };
    }
    const newArray = [];
    for (let index = 0; index < a.length; index++) {
      const itemA = a[index];
      const itemB = b[index];
      const sharedValue = mergeValues(itemA, itemB);
      if (!sharedValue.valid) {
        return { valid: false };
      }
      newArray.push(sharedValue.data);
    }
    return { valid: true, data: newArray };
  } else if (aType === ZodParsedType.date && bType === ZodParsedType.date && +a === +b) {
    return { valid: true, data: a };
  } else {
    return { valid: false };
  }
}
var ZodIntersection = class extends ZodType {
  _parse(input) {
    const { status, ctx } = this._processInputParams(input);
    const handleParsed = (parsedLeft, parsedRight) => {
      if (isAborted(parsedLeft) || isAborted(parsedRight)) {
        return INVALID;
      }
      const merged = mergeValues(parsedLeft.value, parsedRight.value);
      if (!merged.valid) {
        addIssueToContext(ctx, {
          code: ZodIssueCode.invalid_intersection_types
        });
        return INVALID;
      }
      if (isDirty(parsedLeft) || isDirty(parsedRight)) {
        status.dirty();
      }
      return { status: status.value, value: merged.data };
    };
    if (ctx.common.async) {
      return Promise.all([
        this._def.left._parseAsync({
          data: ctx.data,
          path: ctx.path,
          parent: ctx
        }),
        this._def.right._parseAsync({
          data: ctx.data,
          path: ctx.path,
          parent: ctx
        })
      ]).then(([left, right]) => handleParsed(left, right));
    } else {
      return handleParsed(this._def.left._parseSync({
        data: ctx.data,
        path: ctx.path,
        parent: ctx
      }), this._def.right._parseSync({
        data: ctx.data,
        path: ctx.path,
        parent: ctx
      }));
    }
  }
};
ZodIntersection.create = (left, right, params) => {
  return new ZodIntersection({
    left,
    right,
    typeName: ZodFirstPartyTypeKind.ZodIntersection,
    ...processCreateParams(params)
  });
};
var ZodTuple = class _ZodTuple extends ZodType {
  _parse(input) {
    const { status, ctx } = this._processInputParams(input);
    if (ctx.parsedType !== ZodParsedType.array) {
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.array,
        received: ctx.parsedType
      });
      return INVALID;
    }
    if (ctx.data.length < this._def.items.length) {
      addIssueToContext(ctx, {
        code: ZodIssueCode.too_small,
        minimum: this._def.items.length,
        inclusive: true,
        exact: false,
        type: "array"
      });
      return INVALID;
    }
    const rest = this._def.rest;
    if (!rest && ctx.data.length > this._def.items.length) {
      addIssueToContext(ctx, {
        code: ZodIssueCode.too_big,
        maximum: this._def.items.length,
        inclusive: true,
        exact: false,
        type: "array"
      });
      status.dirty();
    }
    const items = [...ctx.data].map((item, itemIndex) => {
      const schema = this._def.items[itemIndex] || this._def.rest;
      if (!schema)
        return null;
      return schema._parse(new ParseInputLazyPath(ctx, item, ctx.path, itemIndex));
    }).filter((x) => !!x);
    if (ctx.common.async) {
      return Promise.all(items).then((results) => {
        return ParseStatus.mergeArray(status, results);
      });
    } else {
      return ParseStatus.mergeArray(status, items);
    }
  }
  get items() {
    return this._def.items;
  }
  rest(rest) {
    return new _ZodTuple({
      ...this._def,
      rest
    });
  }
};
ZodTuple.create = (schemas, params) => {
  if (!Array.isArray(schemas)) {
    throw new Error("You must pass an array of schemas to z.tuple([ ... ])");
  }
  return new ZodTuple({
    items: schemas,
    typeName: ZodFirstPartyTypeKind.ZodTuple,
    rest: null,
    ...processCreateParams(params)
  });
};
var ZodRecord = class _ZodRecord extends ZodType {
  get keySchema() {
    return this._def.keyType;
  }
  get valueSchema() {
    return this._def.valueType;
  }
  _parse(input) {
    const { status, ctx } = this._processInputParams(input);
    if (ctx.parsedType !== ZodParsedType.object) {
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.object,
        received: ctx.parsedType
      });
      return INVALID;
    }
    const pairs = [];
    const keyType = this._def.keyType;
    const valueType = this._def.valueType;
    for (const key in ctx.data) {
      pairs.push({
        key: keyType._parse(new ParseInputLazyPath(ctx, key, ctx.path, key)),
        value: valueType._parse(new ParseInputLazyPath(ctx, ctx.data[key], ctx.path, key)),
        alwaysSet: key in ctx.data
      });
    }
    if (ctx.common.async) {
      return ParseStatus.mergeObjectAsync(status, pairs);
    } else {
      return ParseStatus.mergeObjectSync(status, pairs);
    }
  }
  get element() {
    return this._def.valueType;
  }
  static create(first, second, third) {
    if (second instanceof ZodType) {
      return new _ZodRecord({
        keyType: first,
        valueType: second,
        typeName: ZodFirstPartyTypeKind.ZodRecord,
        ...processCreateParams(third)
      });
    }
    return new _ZodRecord({
      keyType: ZodString.create(),
      valueType: first,
      typeName: ZodFirstPartyTypeKind.ZodRecord,
      ...processCreateParams(second)
    });
  }
};
var ZodMap = class extends ZodType {
  get keySchema() {
    return this._def.keyType;
  }
  get valueSchema() {
    return this._def.valueType;
  }
  _parse(input) {
    const { status, ctx } = this._processInputParams(input);
    if (ctx.parsedType !== ZodParsedType.map) {
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.map,
        received: ctx.parsedType
      });
      return INVALID;
    }
    const keyType = this._def.keyType;
    const valueType = this._def.valueType;
    const pairs = [...ctx.data.entries()].map(([key, value], index) => {
      return {
        key: keyType._parse(new ParseInputLazyPath(ctx, key, ctx.path, [index, "key"])),
        value: valueType._parse(new ParseInputLazyPath(ctx, value, ctx.path, [index, "value"]))
      };
    });
    if (ctx.common.async) {
      const finalMap = /* @__PURE__ */ new Map();
      return Promise.resolve().then(async () => {
        for (const pair of pairs) {
          const key = await pair.key;
          const value = await pair.value;
          if (key.status === "aborted" || value.status === "aborted") {
            return INVALID;
          }
          if (key.status === "dirty" || value.status === "dirty") {
            status.dirty();
          }
          finalMap.set(key.value, value.value);
        }
        return { status: status.value, value: finalMap };
      });
    } else {
      const finalMap = /* @__PURE__ */ new Map();
      for (const pair of pairs) {
        const key = pair.key;
        const value = pair.value;
        if (key.status === "aborted" || value.status === "aborted") {
          return INVALID;
        }
        if (key.status === "dirty" || value.status === "dirty") {
          status.dirty();
        }
        finalMap.set(key.value, value.value);
      }
      return { status: status.value, value: finalMap };
    }
  }
};
ZodMap.create = (keyType, valueType, params) => {
  return new ZodMap({
    valueType,
    keyType,
    typeName: ZodFirstPartyTypeKind.ZodMap,
    ...processCreateParams(params)
  });
};
var ZodSet = class _ZodSet extends ZodType {
  _parse(input) {
    const { status, ctx } = this._processInputParams(input);
    if (ctx.parsedType !== ZodParsedType.set) {
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.set,
        received: ctx.parsedType
      });
      return INVALID;
    }
    const def = this._def;
    if (def.minSize !== null) {
      if (ctx.data.size < def.minSize.value) {
        addIssueToContext(ctx, {
          code: ZodIssueCode.too_small,
          minimum: def.minSize.value,
          type: "set",
          inclusive: true,
          exact: false,
          message: def.minSize.message
        });
        status.dirty();
      }
    }
    if (def.maxSize !== null) {
      if (ctx.data.size > def.maxSize.value) {
        addIssueToContext(ctx, {
          code: ZodIssueCode.too_big,
          maximum: def.maxSize.value,
          type: "set",
          inclusive: true,
          exact: false,
          message: def.maxSize.message
        });
        status.dirty();
      }
    }
    const valueType = this._def.valueType;
    function finalizeSet(elements2) {
      const parsedSet = /* @__PURE__ */ new Set();
      for (const element of elements2) {
        if (element.status === "aborted")
          return INVALID;
        if (element.status === "dirty")
          status.dirty();
        parsedSet.add(element.value);
      }
      return { status: status.value, value: parsedSet };
    }
    const elements = [...ctx.data.values()].map((item, i) => valueType._parse(new ParseInputLazyPath(ctx, item, ctx.path, i)));
    if (ctx.common.async) {
      return Promise.all(elements).then((elements2) => finalizeSet(elements2));
    } else {
      return finalizeSet(elements);
    }
  }
  min(minSize, message) {
    return new _ZodSet({
      ...this._def,
      minSize: { value: minSize, message: errorUtil.toString(message) }
    });
  }
  max(maxSize, message) {
    return new _ZodSet({
      ...this._def,
      maxSize: { value: maxSize, message: errorUtil.toString(message) }
    });
  }
  size(size, message) {
    return this.min(size, message).max(size, message);
  }
  nonempty(message) {
    return this.min(1, message);
  }
};
ZodSet.create = (valueType, params) => {
  return new ZodSet({
    valueType,
    minSize: null,
    maxSize: null,
    typeName: ZodFirstPartyTypeKind.ZodSet,
    ...processCreateParams(params)
  });
};
var ZodFunction = class _ZodFunction extends ZodType {
  constructor() {
    super(...arguments);
    this.validate = this.implement;
  }
  _parse(input) {
    const { ctx } = this._processInputParams(input);
    if (ctx.parsedType !== ZodParsedType.function) {
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.function,
        received: ctx.parsedType
      });
      return INVALID;
    }
    function makeArgsIssue(args, error) {
      return makeIssue({
        data: args,
        path: ctx.path,
        errorMaps: [ctx.common.contextualErrorMap, ctx.schemaErrorMap, getErrorMap(), en_default].filter((x) => !!x),
        issueData: {
          code: ZodIssueCode.invalid_arguments,
          argumentsError: error
        }
      });
    }
    function makeReturnsIssue(returns, error) {
      return makeIssue({
        data: returns,
        path: ctx.path,
        errorMaps: [ctx.common.contextualErrorMap, ctx.schemaErrorMap, getErrorMap(), en_default].filter((x) => !!x),
        issueData: {
          code: ZodIssueCode.invalid_return_type,
          returnTypeError: error
        }
      });
    }
    const params = { errorMap: ctx.common.contextualErrorMap };
    const fn = ctx.data;
    if (this._def.returns instanceof ZodPromise) {
      const me = this;
      return OK(async function(...args) {
        const error = new ZodError([]);
        const parsedArgs = await me._def.args.parseAsync(args, params).catch((e) => {
          error.addIssue(makeArgsIssue(args, e));
          throw error;
        });
        const result = await Reflect.apply(fn, this, parsedArgs);
        const parsedReturns = await me._def.returns._def.type.parseAsync(result, params).catch((e) => {
          error.addIssue(makeReturnsIssue(result, e));
          throw error;
        });
        return parsedReturns;
      });
    } else {
      const me = this;
      return OK(function(...args) {
        const parsedArgs = me._def.args.safeParse(args, params);
        if (!parsedArgs.success) {
          throw new ZodError([makeArgsIssue(args, parsedArgs.error)]);
        }
        const result = Reflect.apply(fn, this, parsedArgs.data);
        const parsedReturns = me._def.returns.safeParse(result, params);
        if (!parsedReturns.success) {
          throw new ZodError([makeReturnsIssue(result, parsedReturns.error)]);
        }
        return parsedReturns.data;
      });
    }
  }
  parameters() {
    return this._def.args;
  }
  returnType() {
    return this._def.returns;
  }
  args(...items) {
    return new _ZodFunction({
      ...this._def,
      args: ZodTuple.create(items).rest(ZodUnknown.create())
    });
  }
  returns(returnType) {
    return new _ZodFunction({
      ...this._def,
      returns: returnType
    });
  }
  implement(func) {
    const validatedFunc = this.parse(func);
    return validatedFunc;
  }
  strictImplement(func) {
    const validatedFunc = this.parse(func);
    return validatedFunc;
  }
  static create(args, returns, params) {
    return new _ZodFunction({
      args: args ? args : ZodTuple.create([]).rest(ZodUnknown.create()),
      returns: returns || ZodUnknown.create(),
      typeName: ZodFirstPartyTypeKind.ZodFunction,
      ...processCreateParams(params)
    });
  }
};
var ZodLazy = class extends ZodType {
  get schema() {
    return this._def.getter();
  }
  _parse(input) {
    const { ctx } = this._processInputParams(input);
    const lazySchema = this._def.getter();
    return lazySchema._parse({ data: ctx.data, path: ctx.path, parent: ctx });
  }
};
ZodLazy.create = (getter, params) => {
  return new ZodLazy({
    getter,
    typeName: ZodFirstPartyTypeKind.ZodLazy,
    ...processCreateParams(params)
  });
};
var ZodLiteral = class extends ZodType {
  _parse(input) {
    if (input.data !== this._def.value) {
      const ctx = this._getOrReturnCtx(input);
      addIssueToContext(ctx, {
        received: ctx.data,
        code: ZodIssueCode.invalid_literal,
        expected: this._def.value
      });
      return INVALID;
    }
    return { status: "valid", value: input.data };
  }
  get value() {
    return this._def.value;
  }
};
ZodLiteral.create = (value, params) => {
  return new ZodLiteral({
    value,
    typeName: ZodFirstPartyTypeKind.ZodLiteral,
    ...processCreateParams(params)
  });
};
function createZodEnum(values, params) {
  return new ZodEnum({
    values,
    typeName: ZodFirstPartyTypeKind.ZodEnum,
    ...processCreateParams(params)
  });
}
var ZodEnum = class _ZodEnum extends ZodType {
  _parse(input) {
    if (typeof input.data !== "string") {
      const ctx = this._getOrReturnCtx(input);
      const expectedValues = this._def.values;
      addIssueToContext(ctx, {
        expected: util.joinValues(expectedValues),
        received: ctx.parsedType,
        code: ZodIssueCode.invalid_type
      });
      return INVALID;
    }
    if (!this._cache) {
      this._cache = new Set(this._def.values);
    }
    if (!this._cache.has(input.data)) {
      const ctx = this._getOrReturnCtx(input);
      const expectedValues = this._def.values;
      addIssueToContext(ctx, {
        received: ctx.data,
        code: ZodIssueCode.invalid_enum_value,
        options: expectedValues
      });
      return INVALID;
    }
    return OK(input.data);
  }
  get options() {
    return this._def.values;
  }
  get enum() {
    const enumValues = {};
    for (const val of this._def.values) {
      enumValues[val] = val;
    }
    return enumValues;
  }
  get Values() {
    const enumValues = {};
    for (const val of this._def.values) {
      enumValues[val] = val;
    }
    return enumValues;
  }
  get Enum() {
    const enumValues = {};
    for (const val of this._def.values) {
      enumValues[val] = val;
    }
    return enumValues;
  }
  extract(values, newDef = this._def) {
    return _ZodEnum.create(values, {
      ...this._def,
      ...newDef
    });
  }
  exclude(values, newDef = this._def) {
    return _ZodEnum.create(this.options.filter((opt) => !values.includes(opt)), {
      ...this._def,
      ...newDef
    });
  }
};
ZodEnum.create = createZodEnum;
var ZodNativeEnum = class extends ZodType {
  _parse(input) {
    const nativeEnumValues = util.getValidEnumValues(this._def.values);
    const ctx = this._getOrReturnCtx(input);
    if (ctx.parsedType !== ZodParsedType.string && ctx.parsedType !== ZodParsedType.number) {
      const expectedValues = util.objectValues(nativeEnumValues);
      addIssueToContext(ctx, {
        expected: util.joinValues(expectedValues),
        received: ctx.parsedType,
        code: ZodIssueCode.invalid_type
      });
      return INVALID;
    }
    if (!this._cache) {
      this._cache = new Set(util.getValidEnumValues(this._def.values));
    }
    if (!this._cache.has(input.data)) {
      const expectedValues = util.objectValues(nativeEnumValues);
      addIssueToContext(ctx, {
        received: ctx.data,
        code: ZodIssueCode.invalid_enum_value,
        options: expectedValues
      });
      return INVALID;
    }
    return OK(input.data);
  }
  get enum() {
    return this._def.values;
  }
};
ZodNativeEnum.create = (values, params) => {
  return new ZodNativeEnum({
    values,
    typeName: ZodFirstPartyTypeKind.ZodNativeEnum,
    ...processCreateParams(params)
  });
};
var ZodPromise = class extends ZodType {
  unwrap() {
    return this._def.type;
  }
  _parse(input) {
    const { ctx } = this._processInputParams(input);
    if (ctx.parsedType !== ZodParsedType.promise && ctx.common.async === false) {
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.promise,
        received: ctx.parsedType
      });
      return INVALID;
    }
    const promisified = ctx.parsedType === ZodParsedType.promise ? ctx.data : Promise.resolve(ctx.data);
    return OK(promisified.then((data) => {
      return this._def.type.parseAsync(data, {
        path: ctx.path,
        errorMap: ctx.common.contextualErrorMap
      });
    }));
  }
};
ZodPromise.create = (schema, params) => {
  return new ZodPromise({
    type: schema,
    typeName: ZodFirstPartyTypeKind.ZodPromise,
    ...processCreateParams(params)
  });
};
var ZodEffects = class extends ZodType {
  innerType() {
    return this._def.schema;
  }
  sourceType() {
    return this._def.schema._def.typeName === ZodFirstPartyTypeKind.ZodEffects ? this._def.schema.sourceType() : this._def.schema;
  }
  _parse(input) {
    const { status, ctx } = this._processInputParams(input);
    const effect = this._def.effect || null;
    const checkCtx = {
      addIssue: (arg) => {
        addIssueToContext(ctx, arg);
        if (arg.fatal) {
          status.abort();
        } else {
          status.dirty();
        }
      },
      get path() {
        return ctx.path;
      }
    };
    checkCtx.addIssue = checkCtx.addIssue.bind(checkCtx);
    if (effect.type === "preprocess") {
      const processed = effect.transform(ctx.data, checkCtx);
      if (ctx.common.async) {
        return Promise.resolve(processed).then(async (processed2) => {
          if (status.value === "aborted")
            return INVALID;
          const result = await this._def.schema._parseAsync({
            data: processed2,
            path: ctx.path,
            parent: ctx
          });
          if (result.status === "aborted")
            return INVALID;
          if (result.status === "dirty")
            return DIRTY(result.value);
          if (status.value === "dirty")
            return DIRTY(result.value);
          return result;
        });
      } else {
        if (status.value === "aborted")
          return INVALID;
        const result = this._def.schema._parseSync({
          data: processed,
          path: ctx.path,
          parent: ctx
        });
        if (result.status === "aborted")
          return INVALID;
        if (result.status === "dirty")
          return DIRTY(result.value);
        if (status.value === "dirty")
          return DIRTY(result.value);
        return result;
      }
    }
    if (effect.type === "refinement") {
      const executeRefinement = (acc) => {
        const result = effect.refinement(acc, checkCtx);
        if (ctx.common.async) {
          return Promise.resolve(result);
        }
        if (result instanceof Promise) {
          throw new Error("Async refinement encountered during synchronous parse operation. Use .parseAsync instead.");
        }
        return acc;
      };
      if (ctx.common.async === false) {
        const inner = this._def.schema._parseSync({
          data: ctx.data,
          path: ctx.path,
          parent: ctx
        });
        if (inner.status === "aborted")
          return INVALID;
        if (inner.status === "dirty")
          status.dirty();
        executeRefinement(inner.value);
        return { status: status.value, value: inner.value };
      } else {
        return this._def.schema._parseAsync({ data: ctx.data, path: ctx.path, parent: ctx }).then((inner) => {
          if (inner.status === "aborted")
            return INVALID;
          if (inner.status === "dirty")
            status.dirty();
          return executeRefinement(inner.value).then(() => {
            return { status: status.value, value: inner.value };
          });
        });
      }
    }
    if (effect.type === "transform") {
      if (ctx.common.async === false) {
        const base = this._def.schema._parseSync({
          data: ctx.data,
          path: ctx.path,
          parent: ctx
        });
        if (!isValid(base))
          return INVALID;
        const result = effect.transform(base.value, checkCtx);
        if (result instanceof Promise) {
          throw new Error(`Asynchronous transform encountered during synchronous parse operation. Use .parseAsync instead.`);
        }
        return { status: status.value, value: result };
      } else {
        return this._def.schema._parseAsync({ data: ctx.data, path: ctx.path, parent: ctx }).then((base) => {
          if (!isValid(base))
            return INVALID;
          return Promise.resolve(effect.transform(base.value, checkCtx)).then((result) => ({
            status: status.value,
            value: result
          }));
        });
      }
    }
    util.assertNever(effect);
  }
};
ZodEffects.create = (schema, effect, params) => {
  return new ZodEffects({
    schema,
    typeName: ZodFirstPartyTypeKind.ZodEffects,
    effect,
    ...processCreateParams(params)
  });
};
ZodEffects.createWithPreprocess = (preprocess, schema, params) => {
  return new ZodEffects({
    schema,
    effect: { type: "preprocess", transform: preprocess },
    typeName: ZodFirstPartyTypeKind.ZodEffects,
    ...processCreateParams(params)
  });
};
var ZodOptional = class extends ZodType {
  _parse(input) {
    const parsedType = this._getType(input);
    if (parsedType === ZodParsedType.undefined) {
      return OK(void 0);
    }
    return this._def.innerType._parse(input);
  }
  unwrap() {
    return this._def.innerType;
  }
};
ZodOptional.create = (type, params) => {
  return new ZodOptional({
    innerType: type,
    typeName: ZodFirstPartyTypeKind.ZodOptional,
    ...processCreateParams(params)
  });
};
var ZodNullable = class extends ZodType {
  _parse(input) {
    const parsedType = this._getType(input);
    if (parsedType === ZodParsedType.null) {
      return OK(null);
    }
    return this._def.innerType._parse(input);
  }
  unwrap() {
    return this._def.innerType;
  }
};
ZodNullable.create = (type, params) => {
  return new ZodNullable({
    innerType: type,
    typeName: ZodFirstPartyTypeKind.ZodNullable,
    ...processCreateParams(params)
  });
};
var ZodDefault = class extends ZodType {
  _parse(input) {
    const { ctx } = this._processInputParams(input);
    let data = ctx.data;
    if (ctx.parsedType === ZodParsedType.undefined) {
      data = this._def.defaultValue();
    }
    return this._def.innerType._parse({
      data,
      path: ctx.path,
      parent: ctx
    });
  }
  removeDefault() {
    return this._def.innerType;
  }
};
ZodDefault.create = (type, params) => {
  return new ZodDefault({
    innerType: type,
    typeName: ZodFirstPartyTypeKind.ZodDefault,
    defaultValue: typeof params.default === "function" ? params.default : () => params.default,
    ...processCreateParams(params)
  });
};
var ZodCatch = class extends ZodType {
  _parse(input) {
    const { ctx } = this._processInputParams(input);
    const newCtx = {
      ...ctx,
      common: {
        ...ctx.common,
        issues: []
      }
    };
    const result = this._def.innerType._parse({
      data: newCtx.data,
      path: newCtx.path,
      parent: {
        ...newCtx
      }
    });
    if (isAsync(result)) {
      return result.then((result2) => {
        return {
          status: "valid",
          value: result2.status === "valid" ? result2.value : this._def.catchValue({
            get error() {
              return new ZodError(newCtx.common.issues);
            },
            input: newCtx.data
          })
        };
      });
    } else {
      return {
        status: "valid",
        value: result.status === "valid" ? result.value : this._def.catchValue({
          get error() {
            return new ZodError(newCtx.common.issues);
          },
          input: newCtx.data
        })
      };
    }
  }
  removeCatch() {
    return this._def.innerType;
  }
};
ZodCatch.create = (type, params) => {
  return new ZodCatch({
    innerType: type,
    typeName: ZodFirstPartyTypeKind.ZodCatch,
    catchValue: typeof params.catch === "function" ? params.catch : () => params.catch,
    ...processCreateParams(params)
  });
};
var ZodNaN = class extends ZodType {
  _parse(input) {
    const parsedType = this._getType(input);
    if (parsedType !== ZodParsedType.nan) {
      const ctx = this._getOrReturnCtx(input);
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.nan,
        received: ctx.parsedType
      });
      return INVALID;
    }
    return { status: "valid", value: input.data };
  }
};
ZodNaN.create = (params) => {
  return new ZodNaN({
    typeName: ZodFirstPartyTypeKind.ZodNaN,
    ...processCreateParams(params)
  });
};
var BRAND = /* @__PURE__ */ Symbol("zod_brand");
var ZodBranded = class extends ZodType {
  _parse(input) {
    const { ctx } = this._processInputParams(input);
    const data = ctx.data;
    return this._def.type._parse({
      data,
      path: ctx.path,
      parent: ctx
    });
  }
  unwrap() {
    return this._def.type;
  }
};
var ZodPipeline = class _ZodPipeline extends ZodType {
  _parse(input) {
    const { status, ctx } = this._processInputParams(input);
    if (ctx.common.async) {
      const handleAsync = async () => {
        const inResult = await this._def.in._parseAsync({
          data: ctx.data,
          path: ctx.path,
          parent: ctx
        });
        if (inResult.status === "aborted")
          return INVALID;
        if (inResult.status === "dirty") {
          status.dirty();
          return DIRTY(inResult.value);
        } else {
          return this._def.out._parseAsync({
            data: inResult.value,
            path: ctx.path,
            parent: ctx
          });
        }
      };
      return handleAsync();
    } else {
      const inResult = this._def.in._parseSync({
        data: ctx.data,
        path: ctx.path,
        parent: ctx
      });
      if (inResult.status === "aborted")
        return INVALID;
      if (inResult.status === "dirty") {
        status.dirty();
        return {
          status: "dirty",
          value: inResult.value
        };
      } else {
        return this._def.out._parseSync({
          data: inResult.value,
          path: ctx.path,
          parent: ctx
        });
      }
    }
  }
  static create(a, b) {
    return new _ZodPipeline({
      in: a,
      out: b,
      typeName: ZodFirstPartyTypeKind.ZodPipeline
    });
  }
};
var ZodReadonly = class extends ZodType {
  _parse(input) {
    const result = this._def.innerType._parse(input);
    const freeze = (data) => {
      if (isValid(data)) {
        data.value = Object.freeze(data.value);
      }
      return data;
    };
    return isAsync(result) ? result.then((data) => freeze(data)) : freeze(result);
  }
  unwrap() {
    return this._def.innerType;
  }
};
ZodReadonly.create = (type, params) => {
  return new ZodReadonly({
    innerType: type,
    typeName: ZodFirstPartyTypeKind.ZodReadonly,
    ...processCreateParams(params)
  });
};
function cleanParams(params, data) {
  const p = typeof params === "function" ? params(data) : typeof params === "string" ? { message: params } : params;
  const p2 = typeof p === "string" ? { message: p } : p;
  return p2;
}
function custom(check, _params = {}, fatal) {
  if (check)
    return ZodAny.create().superRefine((data, ctx) => {
      const r = check(data);
      if (r instanceof Promise) {
        return r.then((r2) => {
          if (!r2) {
            const params = cleanParams(_params, data);
            const _fatal = params.fatal ?? fatal ?? true;
            ctx.addIssue({ code: "custom", ...params, fatal: _fatal });
          }
        });
      }
      if (!r) {
        const params = cleanParams(_params, data);
        const _fatal = params.fatal ?? fatal ?? true;
        ctx.addIssue({ code: "custom", ...params, fatal: _fatal });
      }
      return;
    });
  return ZodAny.create();
}
var late = {
  object: ZodObject.lazycreate
};
var ZodFirstPartyTypeKind;
(function(ZodFirstPartyTypeKind2) {
  ZodFirstPartyTypeKind2["ZodString"] = "ZodString";
  ZodFirstPartyTypeKind2["ZodNumber"] = "ZodNumber";
  ZodFirstPartyTypeKind2["ZodNaN"] = "ZodNaN";
  ZodFirstPartyTypeKind2["ZodBigInt"] = "ZodBigInt";
  ZodFirstPartyTypeKind2["ZodBoolean"] = "ZodBoolean";
  ZodFirstPartyTypeKind2["ZodDate"] = "ZodDate";
  ZodFirstPartyTypeKind2["ZodSymbol"] = "ZodSymbol";
  ZodFirstPartyTypeKind2["ZodUndefined"] = "ZodUndefined";
  ZodFirstPartyTypeKind2["ZodNull"] = "ZodNull";
  ZodFirstPartyTypeKind2["ZodAny"] = "ZodAny";
  ZodFirstPartyTypeKind2["ZodUnknown"] = "ZodUnknown";
  ZodFirstPartyTypeKind2["ZodNever"] = "ZodNever";
  ZodFirstPartyTypeKind2["ZodVoid"] = "ZodVoid";
  ZodFirstPartyTypeKind2["ZodArray"] = "ZodArray";
  ZodFirstPartyTypeKind2["ZodObject"] = "ZodObject";
  ZodFirstPartyTypeKind2["ZodUnion"] = "ZodUnion";
  ZodFirstPartyTypeKind2["ZodDiscriminatedUnion"] = "ZodDiscriminatedUnion";
  ZodFirstPartyTypeKind2["ZodIntersection"] = "ZodIntersection";
  ZodFirstPartyTypeKind2["ZodTuple"] = "ZodTuple";
  ZodFirstPartyTypeKind2["ZodRecord"] = "ZodRecord";
  ZodFirstPartyTypeKind2["ZodMap"] = "ZodMap";
  ZodFirstPartyTypeKind2["ZodSet"] = "ZodSet";
  ZodFirstPartyTypeKind2["ZodFunction"] = "ZodFunction";
  ZodFirstPartyTypeKind2["ZodLazy"] = "ZodLazy";
  ZodFirstPartyTypeKind2["ZodLiteral"] = "ZodLiteral";
  ZodFirstPartyTypeKind2["ZodEnum"] = "ZodEnum";
  ZodFirstPartyTypeKind2["ZodEffects"] = "ZodEffects";
  ZodFirstPartyTypeKind2["ZodNativeEnum"] = "ZodNativeEnum";
  ZodFirstPartyTypeKind2["ZodOptional"] = "ZodOptional";
  ZodFirstPartyTypeKind2["ZodNullable"] = "ZodNullable";
  ZodFirstPartyTypeKind2["ZodDefault"] = "ZodDefault";
  ZodFirstPartyTypeKind2["ZodCatch"] = "ZodCatch";
  ZodFirstPartyTypeKind2["ZodPromise"] = "ZodPromise";
  ZodFirstPartyTypeKind2["ZodBranded"] = "ZodBranded";
  ZodFirstPartyTypeKind2["ZodPipeline"] = "ZodPipeline";
  ZodFirstPartyTypeKind2["ZodReadonly"] = "ZodReadonly";
})(ZodFirstPartyTypeKind || (ZodFirstPartyTypeKind = {}));
var instanceOfType = (cls, params = {
  message: `Input not instance of ${cls.name}`
}) => custom((data) => data instanceof cls, params);
var stringType = ZodString.create;
var numberType = ZodNumber.create;
var nanType = ZodNaN.create;
var bigIntType = ZodBigInt.create;
var booleanType = ZodBoolean.create;
var dateType = ZodDate.create;
var symbolType = ZodSymbol.create;
var undefinedType = ZodUndefined.create;
var nullType = ZodNull.create;
var anyType = ZodAny.create;
var unknownType = ZodUnknown.create;
var neverType = ZodNever.create;
var voidType = ZodVoid.create;
var arrayType = ZodArray.create;
var objectType = ZodObject.create;
var strictObjectType = ZodObject.strictCreate;
var unionType = ZodUnion.create;
var discriminatedUnionType = ZodDiscriminatedUnion.create;
var intersectionType = ZodIntersection.create;
var tupleType = ZodTuple.create;
var recordType = ZodRecord.create;
var mapType = ZodMap.create;
var setType = ZodSet.create;
var functionType = ZodFunction.create;
var lazyType = ZodLazy.create;
var literalType = ZodLiteral.create;
var enumType = ZodEnum.create;
var nativeEnumType = ZodNativeEnum.create;
var promiseType = ZodPromise.create;
var effectsType = ZodEffects.create;
var optionalType = ZodOptional.create;
var nullableType = ZodNullable.create;
var preprocessType = ZodEffects.createWithPreprocess;
var pipelineType = ZodPipeline.create;
var ostring = () => stringType().optional();
var onumber = () => numberType().optional();
var oboolean = () => booleanType().optional();
var coerce = {
  string: ((arg) => ZodString.create({ ...arg, coerce: true })),
  number: ((arg) => ZodNumber.create({ ...arg, coerce: true })),
  boolean: ((arg) => ZodBoolean.create({
    ...arg,
    coerce: true
  })),
  bigint: ((arg) => ZodBigInt.create({ ...arg, coerce: true })),
  date: ((arg) => ZodDate.create({ ...arg, coerce: true }))
};
var NEVER = INVALID;

// ../../packages/config/dist/index.js
var hotkeySchema = external_exports.object({
  muteToggle: external_exports.string(),
  volumeUp: external_exports.string(),
  volumeDown: external_exports.string(),
  repeatLast: external_exports.string().optional()
});
var thresholdsSchema = external_exports.object({
  warning: external_exports.number(),
  critical: external_exports.number()
});
var configSchema = external_exports.object({
  adapter: external_exports.object({
    id: external_exports.string()
  }),
  language: external_exports.string(),
  api: external_exports.object({
    url: external_exports.string().url(),
    token: external_exports.string().optional(),
    useRemoteApi: external_exports.boolean()
  }),
  voice: external_exports.object({
    voice: external_exports.string().optional(),
    volume: external_exports.number().min(0).max(100),
    rate: external_exports.number().min(-10).max(10)
  }),
  hotkeys: hotkeySchema,
  filters: external_exports.object({
    TRAFFIC: external_exports.boolean(),
    FLAGS: external_exports.boolean(),
    ENGINE: external_exports.boolean(),
    COACHING: external_exports.boolean(),
    SYSTEM: external_exports.boolean()
  }),
  focusMode: external_exports.boolean(),
  temperatures: external_exports.object({
    water: thresholdsSchema,
    oil: thresholdsSchema
  }),
  ai: external_exports.object({
    enabled: external_exports.boolean(),
    mode: external_exports.enum(["rules", "ai", "hybrid"]),
    language: external_exports.enum(["es", "en", "pt", "fr", "it"]),
    voiceInput: external_exports.boolean(),
    voiceInputMode: external_exports.enum(["push-to-talk", "vad"]),
    analysisInterval: external_exports.number().min(5).max(60)
    // seconds
  }).optional(),
  debug: external_exports.object({
    telemetryDump: external_exports.boolean()
  })
});
var defaultConfig = {
  adapter: {
    id: "iracing"
  },
  language: "es-AR",
  api: {
    url: "http://localhost:8080",
    token: "",
    useRemoteApi: false
    // Disabled by default - local coaching only
  },
  voice: {
    voice: "Microsoft Raul Desktop",
    volume: 80,
    rate: 0
  },
  hotkeys: {
    muteToggle: "Ctrl+Shift+M",
    volumeUp: "Ctrl+Shift+Up",
    volumeDown: "Ctrl+Shift+Down",
    repeatLast: "Ctrl+Shift+R"
  },
  filters: {
    TRAFFIC: true,
    FLAGS: true,
    ENGINE: true,
    COACHING: true,
    SYSTEM: true
  },
  focusMode: false,
  temperatures: {
    water: { warning: 110, critical: 120 },
    oil: { warning: 110, critical: 120 }
  },
  ai: {
    enabled: true,
    // FORCED: Always enabled - AI coaching is the only mode
    mode: "ai",
    // FORCED: AI-based coaching (LLM + Piper)
    language: "es",
    // Spanish default
    voiceInput: false,
    // Disabled by default
    voiceInputMode: "vad",
    // Voice activity detection
    analysisInterval: 10
    // Every 10 seconds
  },
  debug: {
    telemetryDump: true
  }
};
function getConfigPath(appName = "SimRacingCoach") {
  const baseDir = process.env.APPDATA ? import_node_path.default.join(process.env.APPDATA, appName) : import_node_path.default.join(import_node_os.default.homedir(), `.${appName}`);
  return import_node_path.default.join(baseDir, "config.json");
}
function loadConfig(configPath2 = getConfigPath()) {
  try {
    const raw = import_node_fs.default.readFileSync(configPath2, "utf-8");
    const parsed = configSchema.parse(JSON.parse(raw));
    return { ...defaultConfig, ...parsed };
  } catch {
    return { ...defaultConfig };
  }
}
function saveConfig(config2, configPath2 = getConfigPath()) {
  const dir = import_node_path.default.dirname(configPath2);
  import_node_fs.default.mkdirSync(dir, { recursive: true });
  import_node_fs.default.writeFileSync(configPath2, JSON.stringify(config2, null, 2));
}
function updateConfig(partial, configPath2 = getConfigPath()) {
  const current = loadConfig(configPath2);
  const next = {
    ...current,
    ...partial,
    adapter: { ...current.adapter, ...partial.adapter },
    language: partial.language ?? current.language,
    api: { ...current.api, ...partial.api },
    voice: { ...current.voice, ...partial.voice },
    hotkeys: { ...current.hotkeys, ...partial.hotkeys },
    filters: { ...current.filters, ...partial.filters },
    temperatures: {
      ...current.temperatures,
      ...partial.temperatures,
      water: { ...current.temperatures.water, ...partial.temperatures?.water },
      oil: { ...current.temperatures.oil, ...partial.temperatures?.oil }
    },
    ai: { ...current.ai, ...partial.ai },
    debug: { ...current.debug, ...partial.debug }
  };
  const validated = configSchema.parse(next);
  saveConfig(validated, configPath2);
  return validated;
}
function watchConfig(callback, configPath2 = getConfigPath()) {
  const dir = import_node_path.default.dirname(configPath2);
  import_node_fs.default.mkdirSync(dir, { recursive: true });
  if (!import_node_fs.default.existsSync(configPath2)) {
    saveConfig(defaultConfig, configPath2);
  }
  return import_node_fs.default.watch(configPath2, () => {
    callback(loadConfig(configPath2));
  });
}

// ../../packages/diagnostics/dist/index.js
var import_node_fs2 = __toESM(require("node:fs"), 1);
var import_node_path2 = __toESM(require("node:path"), 1);
var import_pino = __toESM(require_pino(), 1);
function createLogger(options) {
  import_node_fs2.default.mkdirSync(options.logDir, { recursive: true });
  const logPath = import_node_path2.default.join(options.logDir, "simracing.log");
  const streams = [
    {
      level: options.level ?? "info",
      stream: import_pino.default.destination({ dest: logPath, sync: false })
    },
    {
      level: options.level ?? "info",
      stream: import_pino.default.transport({
        target: "pino-pretty",
        options: {
          colorize: true,
          translateTime: "HH:MM:ss",
          ignore: "pid,hostname"
        }
      })
    }
  ];
  return (0, import_pino.default)({
    level: options.level ?? "info",
    name: options.name ?? "simracing"
  }, import_pino.default.multistream(streams));
}
var FpsTracker = class {
  lastTick = Date.now();
  frames = 0;
  fps = 0;
  tick() {
    this.frames += 1;
    const now = Date.now();
    if (now - this.lastTick >= 1e3) {
      this.fps = this.frames;
      this.frames = 0;
      this.lastTick = now;
    }
    return this.fps;
  }
  get current() {
    return this.fps;
  }
};

// src/index.ts
init_dist2();
var configPath = getConfigPath();
var config = loadConfig(configPath);
var logger = createLogger({
  logDir: "./logs",
  name: "service",
  level: "silent"
  // Cambiar a 'debug' para ver todos los logs
});
var fpsTracker = new FpsTracker();
var adapterSupervisor = null;
var adapterStatus = {
  type: "status",
  state: "disconnected",
  sim: config.adapter.id,
  details: "Not running"
};
var adapterRunning = false;
var telemetryBuffer = [];
var latestFrameTime = 0;
var sessionId = "local-session";
var aiService = null;
var aiInitialized = false;
var piperAgent = null;
function applyConfig(next) {
  const adapterChanged = next.adapter.id !== config.adapter.id;
  config = next;
  logger.info({ config }, "config updated");
  if (adapterChanged && adapterRunning) {
    logger.info({ from: config.adapter.id, to: next.adapter.id }, "adapter changed, restarting...");
    startAdapter(next.adapter.id);
  }
}
function handleAdapterFrame(message) {
  latestFrameTime = message.ts;
  fpsTracker.tick();
  const data = message.data;
  if (!aiService && adapterStatus?.state === "connected" && piperAgent) {
    aiService = new AICoachingService({
      enabled: true,
      mode: "ai",
      language: {
        stt: "es",
        tts: "es"
      }
    }, piperAgent);
    aiService.initialize().then(() => {
      aiInitialized = true;
      aiService.startSession({
        simName: "iracing",
        trackId: "unknown",
        carId: "unknown",
        sessionType: "practice",
        sessionId,
        startTime: Date.now(),
        totalLaps: 0,
        currentLap: 0,
        bestLapTime: null,
        averageLapTime: null,
        consistency: 0
      });
    }).catch((err) => {
      console.error("[Service] \u2717 AI initialization failed:", err);
    });
  }
  const rawSim = adapterStatus?.sim || "generic";
  const simMap = {
    "iRacing": "iracing",
    "Assetto Corsa Competizione": "acc",
    "Assetto Corsa": "assetto_corsa",
    "rFactor": "rfactor",
    "rFactor 2": "rfactor2",
    "Automobilista 2": "automobilista2",
    "SimuTC": "actc",
    // Mapping SimuTC to actc for Turismo Carretera
    "Other": "generic"
  };
  const normalizedSim = simMap[rawSim] || "generic";
  const frame = {
    t: message.ts,
    sim: normalizedSim,
    sessionId,
    player: {
      position: typeof data.position === "number" ? data.position : void 0,
      classPosition: typeof data.class_position === "number" ? data.class_position : void 0
    },
    traffic: {
      carLeftRight: typeof data.traffic === "number" ? data.traffic : void 0
    },
    flags: {
      sessionFlags: typeof data.session_flags_raw === "number" ? data.session_flags_raw : void 0
    },
    powertrain: {
      speedKph: typeof data.speed_mps === "number" ? data.speed_mps * 3.6 : void 0,
      rpm: typeof data.rpm === "number" ? data.rpm : void 0,
      gear: typeof data.gear === "number" ? data.gear : void 0,
      throttle: typeof data.throttle_pct === "number" ? data.throttle_pct / 100 : void 0,
      brake: typeof data.brake_pct === "number" ? data.brake_pct / 100 : void 0,
      clutch: typeof data.clutch_pct === "number" ? data.clutch_pct / 100 : void 0
    },
    temps: {
      waterC: typeof data.temps?.water_c === "number" ? data.temps.water_c : void 0,
      oilC: typeof data.temps?.oil_c === "number" ? data.temps.oil_c : void 0,
      trackC: typeof data.temps?.track_c === "number" ? data.temps.track_c : void 0,
      airC: typeof data.temps?.air_c === "number" ? data.temps.air_c : void 0,
      tyreC: Array.isArray(data.temps?.tyre_c) ? data.temps.tyre_c.filter((v) => typeof v === "number") : void 0,
      brakeC: Array.isArray(data.temps?.brake_c) ? data.temps.brake_c.filter((v) => typeof v === "number") : void 0
    },
    fuel: {
      level: typeof data.fuel_level === "number" ? data.fuel_level : void 0,
      levelPct: typeof data.fuel_level_pct === "number" ? data.fuel_level_pct : void 0,
      usePerHour: typeof data.fuel_use_per_hour === "number" ? data.fuel_use_per_hour : void 0
    },
    session: {
      // iRacing returns 0/1 as numbers, not booleans
      onPitRoad: data.on_pit_road !== void 0 ? Boolean(data.on_pit_road) : void 0,
      inGarage: data.in_garage !== void 0 ? Boolean(data.in_garage) : void 0,
      isOnTrack: data.is_on_track !== void 0 ? Boolean(data.is_on_track) : void 0,
      incidents: typeof data.incidents === "number" ? data.incidents : void 0,
      lap: typeof data.lap === "number" ? data.lap : void 0,
      lapsCompleted: typeof data.laps_completed === "number" ? data.laps_completed : void 0,
      sessionTime: typeof data.session_time === "number" ? data.session_time : void 0,
      sessionLapsRemain: typeof data.session_laps_remain === "number" ? data.session_laps_remain : void 0,
      sessionTimeRemain: typeof data.session_time_remain === "number" ? data.session_time_remain : void 0,
      lapDistPct: typeof data.lap_dist_pct === "number" ? data.lap_dist_pct : void 0
    },
    lapTimes: {
      best: typeof data.lap_times?.best === "number" ? data.lap_times.best : void 0,
      last: typeof data.lap_times?.last === "number" ? data.lap_times.last : void 0,
      current: typeof data.lap_times?.current === "number" ? data.lap_times.current : void 0
    },
    engineWarnings: typeof data.engine_warnings === "number" ? data.engine_warnings : void 0,
    // New mappings for ACC/Advanced Physics
    physics: {
      steeringAngle: typeof data.steering_rad === "number" ? data.steering_rad : void 0,
      lateralG: typeof data.lateral_g === "number" ? data.lateral_g : void 0,
      longitudinalG: typeof data.longitudinal_g === "number" ? data.longitudinal_g : void 0
    },
    suspension: data.suspension ?? void 0,
    aero: data.aero ?? void 0,
    carControls: data.carControls ?? void 0
  };
  if (aiService && aiInitialized) {
    aiService.processFrame(frame).catch((err) => {
      logger.error({ err }, "AI processing failed");
    });
  }
  telemetryBuffer.push(frame);
  if (telemetryBuffer.length > 1e3) {
    telemetryBuffer.shift();
  }
}
function handleAdapterStatus(message) {
  const wasConnected = adapterStatus?.state === "connected";
  adapterStatus = message;
  if (message.state === "connected" && !wasConnected) {
    if (piperAgent) {
      piperAgent.speak("coach-connected", "normal").then(() => {
      }).catch((err) => {
      });
    }
    if (!aiService) {
      aiService = new AICoachingService({
        enabled: true,
        mode: "ai",
        language: {
          stt: "es",
          tts: "es"
        }
      }, piperAgent);
      aiService.initialize().then(() => {
        aiInitialized = true;
        aiService.startSession({
          simName: "iracing",
          trackId: "unknown",
          carId: "unknown",
          sessionType: "practice",
          sessionId,
          startTime: Date.now(),
          totalLaps: 0,
          currentLap: 0,
          bestLapTime: null,
          averageLapTime: null,
          consistency: 0
        });
      }).catch((err) => {
      });
    } else {
      aiService.startSession({
        simName: "iracing",
        trackId: "unknown",
        carId: "unknown",
        sessionType: "practice",
        sessionId,
        startTime: Date.now(),
        totalLaps: 0,
        currentLap: 0,
        bestLapTime: null,
        averageLapTime: null,
        consistency: 0
      });
    }
  }
  if (message.state === "disconnected" && wasConnected) {
    if (aiService) {
      aiService.endSession();
    }
  }
  logger.info({ adapterStatus: message });
}
function handleAdapterLog(message) {
}
function startAdapter(which) {
  if (adapterSupervisor) {
    adapterSupervisor.stop();
  }
  const spec = getAdapterSpec(which);
  if (!spec) {
    logger.error({ which }, "unknown adapter");
    return;
  }
  let adapterPath = "";
  const basePath = process.env.ADAPTER_PATH ? process.env.ADAPTER_PATH : import_node_path3.default.join(process.cwd(), "../adapters");
  const extension = process.env.ADAPTER_PATH ? ".js" : ".mjs";
  if (which === "mock-iracing") {
    adapterPath = import_node_path3.default.join(basePath, `mock-iracing/adapter.js`);
  } else if (which === "acc") {
    adapterPath = import_node_path3.default.join(basePath, `acc/adapter${extension}`);
  } else if (which === "ams2") {
    adapterPath = import_node_path3.default.join(basePath, `ams2/adapter${extension}`);
  } else if (which === "actc") {
    adapterPath = import_node_path3.default.join(basePath, `actc/adapter${extension}`);
  } else {
    adapterPath = import_node_path3.default.join(basePath, `iracing-node/adapter${extension}`);
  }
  adapterSupervisor = new AdapterSupervisor({
    adapterId: which,
    resolveCommand: async () => ({
      command: process.execPath,
      // Use current runtime (Node or Electron)
      args: [adapterPath],
      env: {
        ...process.env,
        ELECTRON_RUN_AS_NODE: "1"
        // Ensure Electron behaves as Node
      },
      cwd: import_node_path3.default.dirname(adapterPath)
      // Run from adapter dir
    })
  });
  adapterSupervisor.on("status", handleAdapterStatus);
  adapterSupervisor.on("frame", handleAdapterFrame);
  adapterSupervisor.on("log", handleAdapterLog);
  adapterSupervisor.start();
  adapterRunning = true;
  logger.info({ adapter: which }, "adapter started");
}
function stopAdapter() {
  if (adapterSupervisor) {
    adapterSupervisor.stop();
    adapterSupervisor = null;
    adapterRunning = false;
    logger.info("adapter stopped");
  }
}
var server = import_node_http.default.createServer(async (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") {
    res.writeHead(200);
    res.end();
    return;
  }
  if (req.method === "POST" && req.url === "/config") {
    let body = "";
    req.on("data", (chunk) => {
      body += chunk.toString();
    });
    req.on("end", () => {
      try {
        const partial = JSON.parse(body);
        const updated = {
          ...config,
          ...partial,
          adapter: partial.adapter ? { ...config.adapter, ...partial.adapter } : config.adapter,
          voice: partial.voice ? { ...config.voice, ...partial.voice } : config.voice,
          hotkeys: partial.hotkeys ? { ...config.hotkeys, ...partial.hotkeys } : config.hotkeys,
          filters: partial.filters ? { ...config.filters, ...partial.filters } : config.filters,
          ai: partial.ai ? { ...config.ai, ...partial.ai } : config.ai
        };
        applyConfig(updated);
        res.writeHead(200);
        res.end();
      } catch (err) {
        logger.error({ error: err }, "failed to update config");
        res.writeHead(400);
        res.end();
      }
    });
    return;
  }
  if (req.method === "GET" && req.url === "/status") {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(
      JSON.stringify({
        state: adapterStatus.state,
        sim: adapterStatus.sim,
        details: adapterStatus.details,
        adapter: adapterStatus,
        ai: aiService?.getStatus() || { initialized: false },
        fps: 0,
        bufferSize: telemetryBuffer.length
      })
    );
    return;
  }
  if (req.method === "POST" && req.url === "/start") {
    startAdapter(config.adapter.id);
    res.writeHead(200);
    res.end();
    return;
  }
  if (req.method === "POST" && req.url === "/stop") {
    stopAdapter();
    res.writeHead(200);
    res.end();
    return;
  }
  if (req.method === "POST" && req.url === "/test-voice") {
    let body = "";
    req.on("data", (chunk) => {
      body += chunk.toString();
    });
    req.on("end", async () => {
      try {
        const params = body ? JSON.parse(body) : {};
        const drivingRuleIds = [
          "throttle-punch",
          "pedal-fidgeting",
          "brake-riding",
          "soft-braking",
          "brake-stomp",
          "lazy-throttle",
          "coasting-too-much",
          "throttle-overlap",
          "unfinished-braking",
          "brake-inconsistency",
          "redline-hanging",
          "early-short-shift",
          "engine-braking-risk",
          "neutral-driving",
          "slow-shifts",
          "wrong-gear-slow-corner",
          "no-rev-match"
        ];
        const testRuleId = drivingRuleIds[Math.floor(Math.random() * drivingRuleIds.length)];
        logger.info({ testRuleId }, "Voice test - playing prerendered WAV");
        if (!piperAgent) {
          throw new Error("Piper not ready");
        }
        await piperAgent.speak(testRuleId, "normal", config.voice.rate / 10 + 1);
        res.writeHead(200);
        res.end(JSON.stringify({ success: true }));
      } catch (error) {
        logger.error({ error }, "Voice test failed");
        res.writeHead(500);
        res.end(JSON.stringify({ error: String(error) }));
      }
    });
    return;
  }
  if (req.method === "GET" && req.url === "/config") {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify(config));
    return;
  }
  if (req.method === "POST" && req.url === "/config") {
    let body = "";
    req.on("data", (chunk) => {
      body += chunk.toString();
    });
    req.on("end", () => {
      try {
        const updates = JSON.parse(body);
        updateConfig(configPath, updates);
        applyConfig(loadConfig(configPath));
        res.writeHead(200);
        res.end();
      } catch (error) {
        logger.error({ error }, "failed to update config");
        res.writeHead(400);
        res.end();
      }
    });
    return;
  }
  res.writeHead(404);
  res.end();
});
var PORT = 7878;
server.listen(PORT, () => {
  logger.info({ port: PORT }, "control server listening");
});
watchConfig(applyConfig);
process.on("SIGINT", async () => {
  stopAdapter();
  if (aiService) {
    await aiService.dispose();
  }
  server.close();
  process.exit(0);
});
(async () => {
  try {
    const { LlamaCppAgent: LlamaCppAgent2, PrerenderedAudioAgent: PrerenderedAudioAgent2 } = await Promise.resolve().then(() => (init_dist2(), dist_exports));
    piperAgent = new PrerenderedAudioAgent2();
    await piperAgent.initialize();
    console.log("[Service] \u2705 Audio System ready - Sistema iniciado");
    if (adapterStatus?.state === "connected" && !aiService) {
      aiService = new AICoachingService({
        enabled: true,
        mode: "ai",
        language: {
          stt: "es",
          tts: "es"
        }
      }, piperAgent);
      await aiService.initialize();
      aiInitialized = true;
      aiService.startSession({
        simName: "iracing",
        trackId: "unknown",
        carId: "unknown",
        sessionType: "practice",
        sessionId,
        startTime: Date.now(),
        totalLaps: 0,
        currentLap: 0,
        bestLapTime: null,
        averageLapTime: null,
        consistency: 0
      });
    }
  } catch (error) {
  }
})();
