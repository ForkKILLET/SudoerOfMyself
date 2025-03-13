var __defProp = Object.defineProperty;
var __defNormalProp = (obj, key, value) => key in obj ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
var __publicField = (obj, key, value) => __defNormalProp(obj, typeof key !== "symbol" ? key + "" : key, value);
var _a, _b, _c, _d;
(function polyfill() {
  const relList = document.createElement("link").relList;
  if (relList && relList.supports && relList.supports("modulepreload")) {
    return;
  }
  for (const link of document.querySelectorAll('link[rel="modulepreload"]')) {
    processPreload(link);
  }
  new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      if (mutation.type !== "childList") {
        continue;
      }
      for (const node of mutation.addedNodes) {
        if (node.tagName === "LINK" && node.rel === "modulepreload")
          processPreload(node);
      }
    }
  }).observe(document, { childList: true, subtree: true });
  function getFetchOpts(link) {
    const fetchOpts = {};
    if (link.integrity) fetchOpts.integrity = link.integrity;
    if (link.referrerPolicy) fetchOpts.referrerPolicy = link.referrerPolicy;
    if (link.crossOrigin === "use-credentials")
      fetchOpts.credentials = "include";
    else if (link.crossOrigin === "anonymous") fetchOpts.credentials = "omit";
    else fetchOpts.credentials = "same-origin";
    return fetchOpts;
  }
  function processPreload(link) {
    if (link.ep)
      return;
    link.ep = true;
    const fetchOpts = getFetchOpts(link);
    fetch(link.href, fetchOpts);
  }
})();
class Emitter {
  constructor() {
    __publicField(this, "listeners", {});
  }
  initEmitter() {
    this.listeners = {};
  }
  on(event, listener, option) {
    var _a2;
    const realListener = (...data) => {
      listener(...data);
      if (option == null ? void 0 : option.once) dispose();
    };
    const dispose = () => this.off(event, realListener);
    void ((_a2 = this.listeners)[event] ?? (_a2[event] = [])).push(realListener);
    return { dispose };
  }
  off(event, listener) {
    if (!this.listeners[event]) return;
    this.listeners[event].eraseOne(listener);
  }
  emit(event, ...data) {
    var _a2;
    (_a2 = this.listeners[event]) == null ? void 0 : _a2.forEach((listener) => listener(...data));
  }
}
const placeholder = null;
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const createSignal = () => {
  let trigger = placeholder;
  const promise = new Promise((resolve) => {
    trigger = () => {
      resolve(null);
      signal.triggered = true;
    };
  });
  const signal = { trigger, promise, triggered: false };
  return signal;
};
class Stack extends Array {
  get top() {
    return this[this.length - 1];
  }
}
const kContinue = Symbol("Control.continue");
const Control = {
  continue: kContinue
};
const compute = (value) => typeof value === "function" ? value() : value;
const mixin = (ctor, mixin2) => Object.getOwnPropertyNames(mixin2.prototype).filter((key) => key !== "constructor").forEach((key) => {
  ctor.prototype[key] = mixin2.prototype[key];
});
const id = (value) => value;
class AbortEmitter extends Emitter {
}
const prop = (key) => (obj) => obj[key];
const getCommonPrefix = (strs) => {
  if (!strs.length) return "";
  const min = strs.map(prop("length")).min();
  let i = 0;
  while (i < min && new Set(strs.map((str) => str[i])).size === 1) i++;
  return strs[0].slice(0, i);
};
const pick = (obj, keys) => {
  const result = {};
  keys.forEach((key) => {
    result[key] = obj[key];
  });
  return result;
};
const equalBy = (a, b, keys) => keys.every((key) => a[key] === b[key]);
const mapOrNull = (value, fn) => value == null ? null : fn(value);
Array.prototype.sum = function() {
  return this.reduce((acc, curr) => acc + curr, 0);
};
Array.prototype.max = function() {
  return Math.max(...this);
};
Array.prototype.min = function() {
  return Math.min(...this);
};
Array.prototype.eraseOne = function(value) {
  const index = this.indexOf(value);
  if (index !== -1) {
    this.splice(index, 1);
    return true;
  }
  return false;
};
Array.prototype.sortWith = function(fn) {
  return this.sort((a, b) => {
    const fa = fn(a), fb = fn(b);
    return fa < fb ? -1 : fa > fb ? 1 : 0;
  });
};
Array.prototype.groupWith = function(fn) {
  const groups = {};
  this.forEach((value) => {
    const key = fn(value);
    void (groups[key] ?? (groups[key] = [])).push(value);
  });
  return groups;
};
Array.prototype.divideWith = function(fn) {
  const trues = [], falses = [];
  this.forEach((value) => (fn(value) ? trues : falses).push(value));
  return [trues, falses];
};
Array.prototype.findMap = function(callback) {
  for (let i = 0; i < this.length; i++) {
    const ret = callback(this[i], i, this);
    if (ret !== Control.continue) return ret;
  }
};
Array.range = function(start, end, step = 1) {
  if (!step) throw new RangeError("Step cannot be zero");
  const arr = new this();
  for (let i = start; step > 0 && i < end || step < 0 && i > end; i += step) arr.push(i);
  return arr;
};
Array.replicate = function(n, value) {
  return new this(n).fill(value);
};
Array.lift = function(value) {
  return Array.isArray(value) ? value : [value];
};
Number.prototype.toPercent = function(precision = 0) {
  return `${(this * 100).toFixed(precision)}%`;
};
Number.prototype.mod = function(operand) {
  if (!operand) return NaN;
  const rem = this % operand;
  return rem >= 0 ? rem : rem + operand;
};
Number.prototype.remDiv = function(operand) {
  if (!operand) return [NaN, NaN];
  const rem = this % operand, div = (this - rem) / operand;
  return [rem, div];
};
Number.prototype.isBetween = function(min, max) {
  return min <= this && this <= max;
};
Promise.try ?? (Promise.try = function(fn) {
  return (async () => fn())();
});
Storage.prototype.getJson = function(key) {
  const value = this.getItem(key);
  if (value === null) return void 0;
  return JSON.parse(value);
};
Storage.prototype.getJsonOr = function(key, defaultValue) {
  const value = this.getItem(key);
  if (value === null) return defaultValue;
  return JSON.parse(value);
};
Storage.prototype.setJson = function(key, value) {
  this.setItem(key, JSON.stringify(value));
};
const ANSI_BACKGROUND_OFFSET = 10;
const wrapAnsi16 = (offset = 0) => (code) => `\x1B[${code + offset}m`;
const wrapAnsi256 = (offset = 0) => (code) => `\x1B[${38 + offset};5;${code}m`;
const wrapAnsi16m = (offset = 0) => (red, green, blue) => `\x1B[${38 + offset};2;${red};${green};${blue}m`;
const styles$1 = {
  modifier: {
    reset: [0, 0],
    // 21 isn't widely supported and 22 does the same thing
    bold: [1, 22],
    dim: [2, 22],
    italic: [3, 23],
    underline: [4, 24],
    overline: [53, 55],
    inverse: [7, 27],
    hidden: [8, 28],
    strikethrough: [9, 29]
  },
  color: {
    black: [30, 39],
    red: [31, 39],
    green: [32, 39],
    yellow: [33, 39],
    blue: [34, 39],
    magenta: [35, 39],
    cyan: [36, 39],
    white: [37, 39],
    // Bright color
    blackBright: [90, 39],
    gray: [90, 39],
    // Alias of `blackBright`
    grey: [90, 39],
    // Alias of `blackBright`
    redBright: [91, 39],
    greenBright: [92, 39],
    yellowBright: [93, 39],
    blueBright: [94, 39],
    magentaBright: [95, 39],
    cyanBright: [96, 39],
    whiteBright: [97, 39]
  },
  bgColor: {
    bgBlack: [40, 49],
    bgRed: [41, 49],
    bgGreen: [42, 49],
    bgYellow: [43, 49],
    bgBlue: [44, 49],
    bgMagenta: [45, 49],
    bgCyan: [46, 49],
    bgWhite: [47, 49],
    // Bright color
    bgBlackBright: [100, 49],
    bgGray: [100, 49],
    // Alias of `bgBlackBright`
    bgGrey: [100, 49],
    // Alias of `bgBlackBright`
    bgRedBright: [101, 49],
    bgGreenBright: [102, 49],
    bgYellowBright: [103, 49],
    bgBlueBright: [104, 49],
    bgMagentaBright: [105, 49],
    bgCyanBright: [106, 49],
    bgWhiteBright: [107, 49]
  }
};
Object.keys(styles$1.modifier);
const foregroundColorNames = Object.keys(styles$1.color);
const backgroundColorNames = Object.keys(styles$1.bgColor);
[...foregroundColorNames, ...backgroundColorNames];
function assembleStyles() {
  const codes = /* @__PURE__ */ new Map();
  for (const [groupName, group] of Object.entries(styles$1)) {
    for (const [styleName, style] of Object.entries(group)) {
      styles$1[styleName] = {
        open: `\x1B[${style[0]}m`,
        close: `\x1B[${style[1]}m`
      };
      group[styleName] = styles$1[styleName];
      codes.set(style[0], style[1]);
    }
    Object.defineProperty(styles$1, groupName, {
      value: group,
      enumerable: false
    });
  }
  Object.defineProperty(styles$1, "codes", {
    value: codes,
    enumerable: false
  });
  styles$1.color.close = "\x1B[39m";
  styles$1.bgColor.close = "\x1B[49m";
  styles$1.color.ansi = wrapAnsi16();
  styles$1.color.ansi256 = wrapAnsi256();
  styles$1.color.ansi16m = wrapAnsi16m();
  styles$1.bgColor.ansi = wrapAnsi16(ANSI_BACKGROUND_OFFSET);
  styles$1.bgColor.ansi256 = wrapAnsi256(ANSI_BACKGROUND_OFFSET);
  styles$1.bgColor.ansi16m = wrapAnsi16m(ANSI_BACKGROUND_OFFSET);
  Object.defineProperties(styles$1, {
    rgbToAnsi256: {
      value(red, green, blue) {
        if (red === green && green === blue) {
          if (red < 8) {
            return 16;
          }
          if (red > 248) {
            return 231;
          }
          return Math.round((red - 8) / 247 * 24) + 232;
        }
        return 16 + 36 * Math.round(red / 255 * 5) + 6 * Math.round(green / 255 * 5) + Math.round(blue / 255 * 5);
      },
      enumerable: false
    },
    hexToRgb: {
      value(hex) {
        const matches = /[a-f\d]{6}|[a-f\d]{3}/i.exec(hex.toString(16));
        if (!matches) {
          return [0, 0, 0];
        }
        let [colorString] = matches;
        if (colorString.length === 3) {
          colorString = [...colorString].map((character) => character + character).join("");
        }
        const integer = Number.parseInt(colorString, 16);
        return [
          /* eslint-disable no-bitwise */
          integer >> 16 & 255,
          integer >> 8 & 255,
          integer & 255
          /* eslint-enable no-bitwise */
        ];
      },
      enumerable: false
    },
    hexToAnsi256: {
      value: (hex) => styles$1.rgbToAnsi256(...styles$1.hexToRgb(hex)),
      enumerable: false
    },
    ansi256ToAnsi: {
      value(code) {
        if (code < 8) {
          return 30 + code;
        }
        if (code < 16) {
          return 90 + (code - 8);
        }
        let red;
        let green;
        let blue;
        if (code >= 232) {
          red = ((code - 232) * 10 + 8) / 255;
          green = red;
          blue = red;
        } else {
          code -= 16;
          const remainder = code % 36;
          red = Math.floor(code / 36) / 5;
          green = Math.floor(remainder / 6) / 5;
          blue = remainder % 6 / 5;
        }
        const value = Math.max(red, green, blue) * 2;
        if (value === 0) {
          return 30;
        }
        let result = 30 + (Math.round(blue) << 2 | Math.round(green) << 1 | Math.round(red));
        if (value === 2) {
          result += 60;
        }
        return result;
      },
      enumerable: false
    },
    rgbToAnsi: {
      value: (red, green, blue) => styles$1.ansi256ToAnsi(styles$1.rgbToAnsi256(red, green, blue)),
      enumerable: false
    },
    hexToAnsi: {
      value: (hex) => styles$1.ansi256ToAnsi(styles$1.hexToAnsi256(hex)),
      enumerable: false
    }
  });
  return styles$1;
}
const ansiStyles = assembleStyles();
const level = (() => {
  if (!("navigator" in globalThis)) {
    return 0;
  }
  if (globalThis.navigator.userAgentData) {
    const brand = navigator.userAgentData.brands.find(({ brand: brand2 }) => brand2 === "Chromium");
    if (brand && brand.version > 93) {
      return 3;
    }
  }
  if (/\b(Chrome|Chromium)\//.test(globalThis.navigator.userAgent)) {
    return 1;
  }
  return 0;
})();
const colorSupport = level !== 0 && {
  level
};
const supportsColor = {
  stdout: colorSupport,
  stderr: colorSupport
};
function stringReplaceAll(string, substring, replacer) {
  let index = string.indexOf(substring);
  if (index === -1) {
    return string;
  }
  const substringLength = substring.length;
  let endIndex = 0;
  let returnValue = "";
  do {
    returnValue += string.slice(endIndex, index) + substring + replacer;
    endIndex = index + substringLength;
    index = string.indexOf(substring, endIndex);
  } while (index !== -1);
  returnValue += string.slice(endIndex);
  return returnValue;
}
function stringEncaseCRLFWithFirstIndex(string, prefix, postfix, index) {
  let endIndex = 0;
  let returnValue = "";
  do {
    const gotCR = string[index - 1] === "\r";
    returnValue += string.slice(endIndex, gotCR ? index - 1 : index) + prefix + (gotCR ? "\r\n" : "\n") + postfix;
    endIndex = index + 1;
    index = string.indexOf("\n", endIndex);
  } while (index !== -1);
  returnValue += string.slice(endIndex);
  return returnValue;
}
const { stdout: stdoutColor, stderr: stderrColor } = supportsColor;
const GENERATOR = Symbol("GENERATOR");
const STYLER = Symbol("STYLER");
const IS_EMPTY = Symbol("IS_EMPTY");
const levelMapping = [
  "ansi",
  "ansi",
  "ansi256",
  "ansi16m"
];
const styles = /* @__PURE__ */ Object.create(null);
const applyOptions = (object, options = {}) => {
  if (options.level && !(Number.isInteger(options.level) && options.level >= 0 && options.level <= 3)) {
    throw new Error("The `level` option should be an integer from 0 to 3");
  }
  const colorLevel = stdoutColor ? stdoutColor.level : 0;
  object.level = options.level === void 0 ? colorLevel : options.level;
};
const chalkFactory = (options) => {
  const chalk2 = (...strings) => strings.join(" ");
  applyOptions(chalk2, options);
  Object.setPrototypeOf(chalk2, createChalk.prototype);
  return chalk2;
};
function createChalk(options) {
  return chalkFactory(options);
}
Object.setPrototypeOf(createChalk.prototype, Function.prototype);
for (const [styleName, style] of Object.entries(ansiStyles)) {
  styles[styleName] = {
    get() {
      const builder = createBuilder(this, createStyler(style.open, style.close, this[STYLER]), this[IS_EMPTY]);
      Object.defineProperty(this, styleName, { value: builder });
      return builder;
    }
  };
}
styles.visible = {
  get() {
    const builder = createBuilder(this, this[STYLER], true);
    Object.defineProperty(this, "visible", { value: builder });
    return builder;
  }
};
const getModelAnsi = (model, level2, type, ...arguments_) => {
  if (model === "rgb") {
    if (level2 === "ansi16m") {
      return ansiStyles[type].ansi16m(...arguments_);
    }
    if (level2 === "ansi256") {
      return ansiStyles[type].ansi256(ansiStyles.rgbToAnsi256(...arguments_));
    }
    return ansiStyles[type].ansi(ansiStyles.rgbToAnsi(...arguments_));
  }
  if (model === "hex") {
    return getModelAnsi("rgb", level2, type, ...ansiStyles.hexToRgb(...arguments_));
  }
  return ansiStyles[type][model](...arguments_);
};
const usedModels = ["rgb", "hex", "ansi256"];
for (const model of usedModels) {
  styles[model] = {
    get() {
      const { level: level2 } = this;
      return function(...arguments_) {
        const styler = createStyler(getModelAnsi(model, levelMapping[level2], "color", ...arguments_), ansiStyles.color.close, this[STYLER]);
        return createBuilder(this, styler, this[IS_EMPTY]);
      };
    }
  };
  const bgModel = "bg" + model[0].toUpperCase() + model.slice(1);
  styles[bgModel] = {
    get() {
      const { level: level2 } = this;
      return function(...arguments_) {
        const styler = createStyler(getModelAnsi(model, levelMapping[level2], "bgColor", ...arguments_), ansiStyles.bgColor.close, this[STYLER]);
        return createBuilder(this, styler, this[IS_EMPTY]);
      };
    }
  };
}
const proto = Object.defineProperties(() => {
}, {
  ...styles,
  level: {
    enumerable: true,
    get() {
      return this[GENERATOR].level;
    },
    set(level2) {
      this[GENERATOR].level = level2;
    }
  }
});
const createStyler = (open, close, parent) => {
  let openAll;
  let closeAll;
  if (parent === void 0) {
    openAll = open;
    closeAll = close;
  } else {
    openAll = parent.openAll + open;
    closeAll = close + parent.closeAll;
  }
  return {
    open,
    close,
    openAll,
    closeAll,
    parent
  };
};
const createBuilder = (self2, _styler, _isEmpty) => {
  const builder = (...arguments_) => applyStyle(builder, arguments_.length === 1 ? "" + arguments_[0] : arguments_.join(" "));
  Object.setPrototypeOf(builder, proto);
  builder[GENERATOR] = self2;
  builder[STYLER] = _styler;
  builder[IS_EMPTY] = _isEmpty;
  return builder;
};
const applyStyle = (self2, string) => {
  if (self2.level <= 0 || !string) {
    return self2[IS_EMPTY] ? "" : string;
  }
  let styler = self2[STYLER];
  if (styler === void 0) {
    return string;
  }
  const { openAll, closeAll } = styler;
  if (string.includes("\x1B")) {
    while (styler !== void 0) {
      string = stringReplaceAll(string, styler.close, styler.open);
      styler = styler.parent;
    }
  }
  const lfIndex = string.indexOf("\n");
  if (lfIndex !== -1) {
    string = stringEncaseCRLFWithFirstIndex(string, closeAll, openAll, lfIndex);
  }
  return openAll + string + closeAll;
};
Object.defineProperties(createChalk.prototype, styles);
const chalk = createChalk();
createChalk({ level: stderrColor ? stderrColor.level : 0 });
chalk.level = 3;
var Disposable;
((Disposable2) => {
  Disposable2.combine = (...disposables) => ({
    dispose: () => disposables.forEach((disposable) => disposable == null ? void 0 : disposable.dispose())
  });
})(Disposable || (Disposable = {}));
const kStdin = Symbol("Stdin");
const kStdout = Symbol("Stdout");
class Stdin extends (_b = Emitter, _a = kStdin, _b) {
  constructor(term) {
    super();
    __publicField(this, _a, true);
    __publicField(this, "isDisabled", false);
    this.term = term;
    this.term.on("data", (data) => {
      if (this.isDisabled) return;
      this.emit("data", data);
    });
  }
  readKey({
    abortEmitter
  } = {}) {
    return new Promise((resolve) => {
      const { dispose } = Disposable.combine(
        this.on("data", (data) => {
          resolve(data);
          dispose();
        }),
        abortEmitter == null ? void 0 : abortEmitter.on("abort", () => {
          resolve("");
          dispose();
        })
      );
    });
  }
  async *readChar() {
    while (true) {
      const key = await this.readKey();
      if (!key) return "\0";
      yield* [...key].map((char) => char === "\r" ? "\n" : char);
    }
  }
  async readUntil(pred) {
    let data = "";
    for await (const char of this.readChar()) {
      if (char === "\0" || char === "" || pred(char)) break;
      if (char === "") data = data.slice(0, -1);
      else data += char;
    }
    return data;
  }
  async read() {
    return this.readUntil(() => false);
  }
  async readLn() {
    return this.readUntil((char) => char === "\n");
  }
}
__publicField(Stdin, "isStdin", (obj) => obj[kStdin]);
class Stdout extends (_d = Emitter, _c = kStdout, _d) {
  constructor(term) {
    super();
    __publicField(this, _c, true);
    __publicField(this, "isDisabled", false);
    __publicField(this, "isWriting", false);
    this.term = term;
  }
  startWriting() {
    this.isWriting = true;
    this.emit("start-writing");
  }
  stopWriting() {
    this.isWriting = false;
    this.emit("stop-writing");
  }
  write(data) {
    if (this.isDisabled) return;
    this.startWriting();
    this.term.write(data.replaceAll("\n", "\r\n"));
    this.stopWriting();
  }
  writeLn(data) {
    this.write(data + "\n");
  }
  async type(data, interval) {
    if (this.isDisabled) return;
    this.startWriting();
    for (const char of data) {
      this.term.write(char);
      await sleep(interval);
    }
    this.stopWriting();
  }
}
__publicField(Stdout, "isStdout", (obj) => obj[kStdout]);
class Stdio {
  constructor(input, output) {
    __publicField(this, "isTied", true);
    __publicField(this, "doEcho", true);
    __publicField(this, "stdin");
    __publicField(this, "stdout");
    this.input = input;
    this.output = output;
  }
  static fromTerm(term) {
    const input = new Stdin(term);
    const output = new Stdout(term);
    const stdio = new Stdio(input, output);
    stdio.stdin = input;
    stdio.stdout = output;
    output.on("start-writing", () => {
      if (stdio.isTied) input.isDisabled = true;
    });
    output.on("stop-writing", () => {
      if (stdio.isTied) input.isDisabled = false;
    });
    return stdio;
  }
  readKey(options) {
    return this.input.readKey(options);
  }
  read() {
    return this.input.read();
  }
  readLn() {
    return this.input.readLn();
  }
  readUntil(pred) {
    return this.input.readUntil(pred);
  }
  write(data) {
    this.output.write(data);
  }
  writeLn(data) {
    this.output.writeLn(data);
  }
  async prompt(msg) {
    this.write(`${msg} (y/n) `);
    const line = await this.readLn();
    return line.trim().toLowerCase() === "y";
  }
}
const createEnv = (env) => new Proxy(env, {
  get(target, prop2) {
    return Reflect.get(target, prop2) ?? "";
  }
});
class Process extends Emitter {
  constructor(ctx2, parent, options) {
    super();
    __publicField(this, "name");
    __publicField(this, "staticName");
    __publicField(this, "env");
    __publicField(this, "stdio");
    __publicField(this, "_cwd", "/");
    __publicField(this, "subProcesses", []);
    this.ctx = ctx2;
    this.parent = parent;
    this.name = options.name;
    this.env = createEnv({ ...parent == null ? void 0 : parent.env, ...options.env });
    this.cwd = options.cwd ?? (parent == null ? void 0 : parent.cwd) ?? "/";
    this.stdio = options.stdio ?? Stdio.fromTerm(ctx2.term);
  }
  get cwd() {
    return this._cwd;
  }
  set cwd(cwd) {
    this._cwd = this.env.PWD = cwd;
  }
  get fgProcess() {
    return this.subProcesses.at(0);
  }
  fork(options) {
    const proc = new Process(this.ctx, this, options);
    this.subProcesses.unshift(proc);
    this.ctx.fgProc = proc;
    return proc;
  }
  log(msg) {
    Array.lift(msg).forEach((msg2) => {
      this.stdio.writeLn(`${this.staticName ?? this.name}: ${msg2}`);
    });
  }
  error(err) {
    Array.lift(err).forEach((err2) => {
      if (err2 instanceof Error) console.error(err2);
      this.stdio.writeLn(`${this.staticName ?? this.name}: ${err2}`);
    });
  }
  async spawn(program, options, ...args) {
    const { name } = options;
    const proc = this.fork(options);
    try {
      const ret = await program(proc, name, ...args);
      return ret;
    } catch (err) {
      console.error(err);
      this.stdio.writeLn(`${name}: ${err}`);
      return 128;
    } finally {
      this.subProcesses.shift();
      this.ctx.fgProc = this;
    }
  }
}
function ansiRegex({ onlyFirst = false } = {}) {
  const ST = "(?:\\u0007|\\u001B\\u005C|\\u009C)";
  const pattern = [
    `[\\u001B\\u009B][[\\]()#;?]*(?:(?:(?:(?:;[-a-zA-Z\\d\\/#&.:=?%@~_]+)*|[a-zA-Z\\d]+(?:;[-a-zA-Z\\d\\/#&.:=?%@~_]*)*)?${ST})`,
    "(?:(?:\\d{1,4}(?:;\\d{0,4})*)?[\\dA-PR-TZcf-nq-uy=><~]))"
  ].join("|");
  return new RegExp(pattern, onlyFirst ? void 0 : "g");
}
const regex = ansiRegex();
function stripAnsi(string) {
  if (typeof string !== "string") {
    throw new TypeError(`Expected a \`string\`, got \`${typeof string}\``);
  }
  return string.replace(regex, "");
}
var xterm = { exports: {} };
var hasRequiredXterm;
function requireXterm() {
  if (hasRequiredXterm) return xterm.exports;
  hasRequiredXterm = 1;
  (function(module, exports) {
    !function(e, t) {
      module.exports = t();
    }(globalThis, () => (() => {
      var e = { 4567: function(e2, t2, i2) {
        var s2 = this && this.__decorate || function(e3, t3, i3, s3) {
          var r2, n2 = arguments.length, o2 = n2 < 3 ? t3 : null === s3 ? s3 = Object.getOwnPropertyDescriptor(t3, i3) : s3;
          if ("object" == typeof Reflect && "function" == typeof Reflect.decorate) o2 = Reflect.decorate(e3, t3, i3, s3);
          else for (var a2 = e3.length - 1; a2 >= 0; a2--) (r2 = e3[a2]) && (o2 = (n2 < 3 ? r2(o2) : n2 > 3 ? r2(t3, i3, o2) : r2(t3, i3)) || o2);
          return n2 > 3 && o2 && Object.defineProperty(t3, i3, o2), o2;
        }, r = this && this.__param || function(e3, t3) {
          return function(i3, s3) {
            t3(i3, s3, e3);
          };
        };
        Object.defineProperty(t2, "__esModule", { value: true }), t2.AccessibilityManager = void 0;
        const n = i2(9042), o = i2(9924), a = i2(844), h = i2(4725), c = i2(2585), l = i2(3656);
        let d = t2.AccessibilityManager = class extends a.Disposable {
          constructor(e3, t3, i3, s3) {
            super(), this._terminal = e3, this._coreBrowserService = i3, this._renderService = s3, this._rowColumns = /* @__PURE__ */ new WeakMap(), this._liveRegionLineCount = 0, this._charsToConsume = [], this._charsToAnnounce = "", this._accessibilityContainer = this._coreBrowserService.mainDocument.createElement("div"), this._accessibilityContainer.classList.add("xterm-accessibility"), this._rowContainer = this._coreBrowserService.mainDocument.createElement("div"), this._rowContainer.setAttribute("role", "list"), this._rowContainer.classList.add("xterm-accessibility-tree"), this._rowElements = [];
            for (let e4 = 0; e4 < this._terminal.rows; e4++) this._rowElements[e4] = this._createAccessibilityTreeNode(), this._rowContainer.appendChild(this._rowElements[e4]);
            if (this._topBoundaryFocusListener = (e4) => this._handleBoundaryFocus(e4, 0), this._bottomBoundaryFocusListener = (e4) => this._handleBoundaryFocus(e4, 1), this._rowElements[0].addEventListener("focus", this._topBoundaryFocusListener), this._rowElements[this._rowElements.length - 1].addEventListener("focus", this._bottomBoundaryFocusListener), this._refreshRowsDimensions(), this._accessibilityContainer.appendChild(this._rowContainer), this._liveRegion = this._coreBrowserService.mainDocument.createElement("div"), this._liveRegion.classList.add("live-region"), this._liveRegion.setAttribute("aria-live", "assertive"), this._accessibilityContainer.appendChild(this._liveRegion), this._liveRegionDebouncer = this.register(new o.TimeBasedDebouncer(this._renderRows.bind(this))), !this._terminal.element) throw new Error("Cannot enable accessibility before Terminal.open");
            this._terminal.element.insertAdjacentElement("afterbegin", this._accessibilityContainer), this.register(this._terminal.onResize((e4) => this._handleResize(e4.rows))), this.register(this._terminal.onRender((e4) => this._refreshRows(e4.start, e4.end))), this.register(this._terminal.onScroll(() => this._refreshRows())), this.register(this._terminal.onA11yChar((e4) => this._handleChar(e4))), this.register(this._terminal.onLineFeed(() => this._handleChar("\n"))), this.register(this._terminal.onA11yTab((e4) => this._handleTab(e4))), this.register(this._terminal.onKey((e4) => this._handleKey(e4.key))), this.register(this._terminal.onBlur(() => this._clearLiveRegion())), this.register(this._renderService.onDimensionsChange(() => this._refreshRowsDimensions())), this.register((0, l.addDisposableDomListener)(document, "selectionchange", () => this._handleSelectionChange())), this.register(this._coreBrowserService.onDprChange(() => this._refreshRowsDimensions())), this._refreshRows(), this.register((0, a.toDisposable)(() => {
              this._accessibilityContainer.remove(), this._rowElements.length = 0;
            }));
          }
          _handleTab(e3) {
            for (let t3 = 0; t3 < e3; t3++) this._handleChar(" ");
          }
          _handleChar(e3) {
            this._liveRegionLineCount < 21 && (this._charsToConsume.length > 0 ? this._charsToConsume.shift() !== e3 && (this._charsToAnnounce += e3) : this._charsToAnnounce += e3, "\n" === e3 && (this._liveRegionLineCount++, 21 === this._liveRegionLineCount && (this._liveRegion.textContent += n.tooMuchOutput)));
          }
          _clearLiveRegion() {
            this._liveRegion.textContent = "", this._liveRegionLineCount = 0;
          }
          _handleKey(e3) {
            this._clearLiveRegion(), new RegExp("\\p{Control}", "u").test(e3) || this._charsToConsume.push(e3);
          }
          _refreshRows(e3, t3) {
            this._liveRegionDebouncer.refresh(e3, t3, this._terminal.rows);
          }
          _renderRows(e3, t3) {
            const i3 = this._terminal.buffer, s3 = i3.lines.length.toString();
            for (let r2 = e3; r2 <= t3; r2++) {
              const e4 = i3.lines.get(i3.ydisp + r2), t4 = [], n2 = (e4 == null ? void 0 : e4.translateToString(true, void 0, void 0, t4)) || "", o2 = (i3.ydisp + r2 + 1).toString(), a2 = this._rowElements[r2];
              a2 && (0 === n2.length ? (a2.innerText = " ", this._rowColumns.set(a2, [0, 1])) : (a2.textContent = n2, this._rowColumns.set(a2, t4)), a2.setAttribute("aria-posinset", o2), a2.setAttribute("aria-setsize", s3));
            }
            this._announceCharacters();
          }
          _announceCharacters() {
            0 !== this._charsToAnnounce.length && (this._liveRegion.textContent += this._charsToAnnounce, this._charsToAnnounce = "");
          }
          _handleBoundaryFocus(e3, t3) {
            const i3 = e3.target, s3 = this._rowElements[0 === t3 ? 1 : this._rowElements.length - 2];
            if (i3.getAttribute("aria-posinset") === (0 === t3 ? "1" : `${this._terminal.buffer.lines.length}`)) return;
            if (e3.relatedTarget !== s3) return;
            let r2, n2;
            if (0 === t3 ? (r2 = i3, n2 = this._rowElements.pop(), this._rowContainer.removeChild(n2)) : (r2 = this._rowElements.shift(), n2 = i3, this._rowContainer.removeChild(r2)), r2.removeEventListener("focus", this._topBoundaryFocusListener), n2.removeEventListener("focus", this._bottomBoundaryFocusListener), 0 === t3) {
              const e4 = this._createAccessibilityTreeNode();
              this._rowElements.unshift(e4), this._rowContainer.insertAdjacentElement("afterbegin", e4);
            } else {
              const e4 = this._createAccessibilityTreeNode();
              this._rowElements.push(e4), this._rowContainer.appendChild(e4);
            }
            this._rowElements[0].addEventListener("focus", this._topBoundaryFocusListener), this._rowElements[this._rowElements.length - 1].addEventListener("focus", this._bottomBoundaryFocusListener), this._terminal.scrollLines(0 === t3 ? -1 : 1), this._rowElements[0 === t3 ? 1 : this._rowElements.length - 2].focus(), e3.preventDefault(), e3.stopImmediatePropagation();
          }
          _handleSelectionChange() {
            var _a2;
            if (0 === this._rowElements.length) return;
            const e3 = document.getSelection();
            if (!e3) return;
            if (e3.isCollapsed) return void (this._rowContainer.contains(e3.anchorNode) && this._terminal.clearSelection());
            if (!e3.anchorNode || !e3.focusNode) return void console.error("anchorNode and/or focusNode are null");
            let t3 = { node: e3.anchorNode, offset: e3.anchorOffset }, i3 = { node: e3.focusNode, offset: e3.focusOffset };
            if ((t3.node.compareDocumentPosition(i3.node) & Node.DOCUMENT_POSITION_PRECEDING || t3.node === i3.node && t3.offset > i3.offset) && ([t3, i3] = [i3, t3]), t3.node.compareDocumentPosition(this._rowElements[0]) & (Node.DOCUMENT_POSITION_CONTAINED_BY | Node.DOCUMENT_POSITION_FOLLOWING) && (t3 = { node: this._rowElements[0].childNodes[0], offset: 0 }), !this._rowContainer.contains(t3.node)) return;
            const s3 = this._rowElements.slice(-1)[0];
            if (i3.node.compareDocumentPosition(s3) & (Node.DOCUMENT_POSITION_CONTAINED_BY | Node.DOCUMENT_POSITION_PRECEDING) && (i3 = { node: s3, offset: ((_a2 = s3.textContent) == null ? void 0 : _a2.length) ?? 0 }), !this._rowContainer.contains(i3.node)) return;
            const r2 = ({ node: e4, offset: t4 }) => {
              const i4 = e4 instanceof Text ? e4.parentNode : e4;
              let s4 = parseInt(i4 == null ? void 0 : i4.getAttribute("aria-posinset"), 10) - 1;
              if (isNaN(s4)) return console.warn("row is invalid. Race condition?"), null;
              const r3 = this._rowColumns.get(i4);
              if (!r3) return console.warn("columns is null. Race condition?"), null;
              let n3 = t4 < r3.length ? r3[t4] : r3.slice(-1)[0] + 1;
              return n3 >= this._terminal.cols && (++s4, n3 = 0), { row: s4, column: n3 };
            }, n2 = r2(t3), o2 = r2(i3);
            if (n2 && o2) {
              if (n2.row > o2.row || n2.row === o2.row && n2.column >= o2.column) throw new Error("invalid range");
              this._terminal.select(n2.column, n2.row, (o2.row - n2.row) * this._terminal.cols - n2.column + o2.column);
            }
          }
          _handleResize(e3) {
            this._rowElements[this._rowElements.length - 1].removeEventListener("focus", this._bottomBoundaryFocusListener);
            for (let e4 = this._rowContainer.children.length; e4 < this._terminal.rows; e4++) this._rowElements[e4] = this._createAccessibilityTreeNode(), this._rowContainer.appendChild(this._rowElements[e4]);
            for (; this._rowElements.length > e3; ) this._rowContainer.removeChild(this._rowElements.pop());
            this._rowElements[this._rowElements.length - 1].addEventListener("focus", this._bottomBoundaryFocusListener), this._refreshRowsDimensions();
          }
          _createAccessibilityTreeNode() {
            const e3 = this._coreBrowserService.mainDocument.createElement("div");
            return e3.setAttribute("role", "listitem"), e3.tabIndex = -1, this._refreshRowDimensions(e3), e3;
          }
          _refreshRowsDimensions() {
            if (this._renderService.dimensions.css.cell.height) {
              this._accessibilityContainer.style.width = `${this._renderService.dimensions.css.canvas.width}px`, this._rowElements.length !== this._terminal.rows && this._handleResize(this._terminal.rows);
              for (let e3 = 0; e3 < this._terminal.rows; e3++) this._refreshRowDimensions(this._rowElements[e3]);
            }
          }
          _refreshRowDimensions(e3) {
            e3.style.height = `${this._renderService.dimensions.css.cell.height}px`;
          }
        };
        t2.AccessibilityManager = d = s2([r(1, c.IInstantiationService), r(2, h.ICoreBrowserService), r(3, h.IRenderService)], d);
      }, 3614: (e2, t2) => {
        function i2(e3) {
          return e3.replace(/\r?\n/g, "\r");
        }
        function s2(e3, t3) {
          return t3 ? "\x1B[200~" + e3 + "\x1B[201~" : e3;
        }
        function r(e3, t3, r2, n2) {
          e3 = s2(e3 = i2(e3), r2.decPrivateModes.bracketedPasteMode && true !== n2.rawOptions.ignoreBracketedPasteMode), r2.triggerDataEvent(e3, true), t3.value = "";
        }
        function n(e3, t3, i3) {
          const s3 = i3.getBoundingClientRect(), r2 = e3.clientX - s3.left - 10, n2 = e3.clientY - s3.top - 10;
          t3.style.width = "20px", t3.style.height = "20px", t3.style.left = `${r2}px`, t3.style.top = `${n2}px`, t3.style.zIndex = "1000", t3.focus();
        }
        Object.defineProperty(t2, "__esModule", { value: true }), t2.rightClickHandler = t2.moveTextAreaUnderMouseCursor = t2.paste = t2.handlePasteEvent = t2.copyHandler = t2.bracketTextForPaste = t2.prepareTextForTerminal = void 0, t2.prepareTextForTerminal = i2, t2.bracketTextForPaste = s2, t2.copyHandler = function(e3, t3) {
          e3.clipboardData && e3.clipboardData.setData("text/plain", t3.selectionText), e3.preventDefault();
        }, t2.handlePasteEvent = function(e3, t3, i3, s3) {
          e3.stopPropagation(), e3.clipboardData && r(e3.clipboardData.getData("text/plain"), t3, i3, s3);
        }, t2.paste = r, t2.moveTextAreaUnderMouseCursor = n, t2.rightClickHandler = function(e3, t3, i3, s3, r2) {
          n(e3, t3, i3), r2 && s3.rightClickSelect(e3), t3.value = s3.selectionText, t3.select();
        };
      }, 7239: (e2, t2, i2) => {
        Object.defineProperty(t2, "__esModule", { value: true }), t2.ColorContrastCache = void 0;
        const s2 = i2(1505);
        t2.ColorContrastCache = class {
          constructor() {
            this._color = new s2.TwoKeyMap(), this._css = new s2.TwoKeyMap();
          }
          setCss(e3, t3, i3) {
            this._css.set(e3, t3, i3);
          }
          getCss(e3, t3) {
            return this._css.get(e3, t3);
          }
          setColor(e3, t3, i3) {
            this._color.set(e3, t3, i3);
          }
          getColor(e3, t3) {
            return this._color.get(e3, t3);
          }
          clear() {
            this._color.clear(), this._css.clear();
          }
        };
      }, 3656: (e2, t2) => {
        Object.defineProperty(t2, "__esModule", { value: true }), t2.addDisposableDomListener = void 0, t2.addDisposableDomListener = function(e3, t3, i2, s2) {
          e3.addEventListener(t3, i2, s2);
          let r = false;
          return { dispose: () => {
            r || (r = true, e3.removeEventListener(t3, i2, s2));
          } };
        };
      }, 3551: function(e2, t2, i2) {
        var s2 = this && this.__decorate || function(e3, t3, i3, s3) {
          var r2, n2 = arguments.length, o2 = n2 < 3 ? t3 : null === s3 ? s3 = Object.getOwnPropertyDescriptor(t3, i3) : s3;
          if ("object" == typeof Reflect && "function" == typeof Reflect.decorate) o2 = Reflect.decorate(e3, t3, i3, s3);
          else for (var a2 = e3.length - 1; a2 >= 0; a2--) (r2 = e3[a2]) && (o2 = (n2 < 3 ? r2(o2) : n2 > 3 ? r2(t3, i3, o2) : r2(t3, i3)) || o2);
          return n2 > 3 && o2 && Object.defineProperty(t3, i3, o2), o2;
        }, r = this && this.__param || function(e3, t3) {
          return function(i3, s3) {
            t3(i3, s3, e3);
          };
        };
        Object.defineProperty(t2, "__esModule", { value: true }), t2.Linkifier = void 0;
        const n = i2(3656), o = i2(8460), a = i2(844), h = i2(2585), c = i2(4725);
        let l = t2.Linkifier = class extends a.Disposable {
          get currentLink() {
            return this._currentLink;
          }
          constructor(e3, t3, i3, s3, r2) {
            super(), this._element = e3, this._mouseService = t3, this._renderService = i3, this._bufferService = s3, this._linkProviderService = r2, this._linkCacheDisposables = [], this._isMouseOut = true, this._wasResized = false, this._activeLine = -1, this._onShowLinkUnderline = this.register(new o.EventEmitter()), this.onShowLinkUnderline = this._onShowLinkUnderline.event, this._onHideLinkUnderline = this.register(new o.EventEmitter()), this.onHideLinkUnderline = this._onHideLinkUnderline.event, this.register((0, a.getDisposeArrayDisposable)(this._linkCacheDisposables)), this.register((0, a.toDisposable)(() => {
              var _a2;
              this._lastMouseEvent = void 0, (_a2 = this._activeProviderReplies) == null ? void 0 : _a2.clear();
            })), this.register(this._bufferService.onResize(() => {
              this._clearCurrentLink(), this._wasResized = true;
            })), this.register((0, n.addDisposableDomListener)(this._element, "mouseleave", () => {
              this._isMouseOut = true, this._clearCurrentLink();
            })), this.register((0, n.addDisposableDomListener)(this._element, "mousemove", this._handleMouseMove.bind(this))), this.register((0, n.addDisposableDomListener)(this._element, "mousedown", this._handleMouseDown.bind(this))), this.register((0, n.addDisposableDomListener)(this._element, "mouseup", this._handleMouseUp.bind(this)));
          }
          _handleMouseMove(e3) {
            this._lastMouseEvent = e3;
            const t3 = this._positionFromMouseEvent(e3, this._element, this._mouseService);
            if (!t3) return;
            this._isMouseOut = false;
            const i3 = e3.composedPath();
            for (let e4 = 0; e4 < i3.length; e4++) {
              const t4 = i3[e4];
              if (t4.classList.contains("xterm")) break;
              if (t4.classList.contains("xterm-hover")) return;
            }
            this._lastBufferCell && t3.x === this._lastBufferCell.x && t3.y === this._lastBufferCell.y || (this._handleHover(t3), this._lastBufferCell = t3);
          }
          _handleHover(e3) {
            if (this._activeLine !== e3.y || this._wasResized) return this._clearCurrentLink(), this._askForLink(e3, false), void (this._wasResized = false);
            this._currentLink && this._linkAtPosition(this._currentLink.link, e3) || (this._clearCurrentLink(), this._askForLink(e3, true));
          }
          _askForLink(e3, t3) {
            var _a2, _b2;
            this._activeProviderReplies && t3 || ((_a2 = this._activeProviderReplies) == null ? void 0 : _a2.forEach((e4) => {
              e4 == null ? void 0 : e4.forEach((e5) => {
                e5.link.dispose && e5.link.dispose();
              });
            }), this._activeProviderReplies = /* @__PURE__ */ new Map(), this._activeLine = e3.y);
            let i3 = false;
            for (const [s3, r2] of this._linkProviderService.linkProviders.entries()) if (t3) {
              const t4 = (_b2 = this._activeProviderReplies) == null ? void 0 : _b2.get(s3);
              t4 && (i3 = this._checkLinkProviderResult(s3, e3, i3));
            } else r2.provideLinks(e3.y, (t4) => {
              var _a3, _b3;
              if (this._isMouseOut) return;
              const r3 = t4 == null ? void 0 : t4.map((e4) => ({ link: e4 }));
              (_a3 = this._activeProviderReplies) == null ? void 0 : _a3.set(s3, r3), i3 = this._checkLinkProviderResult(s3, e3, i3), ((_b3 = this._activeProviderReplies) == null ? void 0 : _b3.size) === this._linkProviderService.linkProviders.length && this._removeIntersectingLinks(e3.y, this._activeProviderReplies);
            });
          }
          _removeIntersectingLinks(e3, t3) {
            const i3 = /* @__PURE__ */ new Set();
            for (let s3 = 0; s3 < t3.size; s3++) {
              const r2 = t3.get(s3);
              if (r2) for (let t4 = 0; t4 < r2.length; t4++) {
                const s4 = r2[t4], n2 = s4.link.range.start.y < e3 ? 0 : s4.link.range.start.x, o2 = s4.link.range.end.y > e3 ? this._bufferService.cols : s4.link.range.end.x;
                for (let e4 = n2; e4 <= o2; e4++) {
                  if (i3.has(e4)) {
                    r2.splice(t4--, 1);
                    break;
                  }
                  i3.add(e4);
                }
              }
            }
          }
          _checkLinkProviderResult(e3, t3, i3) {
            var _a2;
            if (!this._activeProviderReplies) return i3;
            const s3 = this._activeProviderReplies.get(e3);
            let r2 = false;
            for (let t4 = 0; t4 < e3; t4++) this._activeProviderReplies.has(t4) && !this._activeProviderReplies.get(t4) || (r2 = true);
            if (!r2 && s3) {
              const e4 = s3.find((e5) => this._linkAtPosition(e5.link, t3));
              e4 && (i3 = true, this._handleNewLink(e4));
            }
            if (this._activeProviderReplies.size === this._linkProviderService.linkProviders.length && !i3) for (let e4 = 0; e4 < this._activeProviderReplies.size; e4++) {
              const s4 = (_a2 = this._activeProviderReplies.get(e4)) == null ? void 0 : _a2.find((e5) => this._linkAtPosition(e5.link, t3));
              if (s4) {
                i3 = true, this._handleNewLink(s4);
                break;
              }
            }
            return i3;
          }
          _handleMouseDown() {
            this._mouseDownLink = this._currentLink;
          }
          _handleMouseUp(e3) {
            if (!this._currentLink) return;
            const t3 = this._positionFromMouseEvent(e3, this._element, this._mouseService);
            t3 && this._mouseDownLink === this._currentLink && this._linkAtPosition(this._currentLink.link, t3) && this._currentLink.link.activate(e3, this._currentLink.link.text);
          }
          _clearCurrentLink(e3, t3) {
            this._currentLink && this._lastMouseEvent && (!e3 || !t3 || this._currentLink.link.range.start.y >= e3 && this._currentLink.link.range.end.y <= t3) && (this._linkLeave(this._element, this._currentLink.link, this._lastMouseEvent), this._currentLink = void 0, (0, a.disposeArray)(this._linkCacheDisposables));
          }
          _handleNewLink(e3) {
            if (!this._lastMouseEvent) return;
            const t3 = this._positionFromMouseEvent(this._lastMouseEvent, this._element, this._mouseService);
            t3 && this._linkAtPosition(e3.link, t3) && (this._currentLink = e3, this._currentLink.state = { decorations: { underline: void 0 === e3.link.decorations || e3.link.decorations.underline, pointerCursor: void 0 === e3.link.decorations || e3.link.decorations.pointerCursor }, isHovered: true }, this._linkHover(this._element, e3.link, this._lastMouseEvent), e3.link.decorations = {}, Object.defineProperties(e3.link.decorations, { pointerCursor: { get: () => {
              var _a2, _b2;
              return (_b2 = (_a2 = this._currentLink) == null ? void 0 : _a2.state) == null ? void 0 : _b2.decorations.pointerCursor;
            }, set: (e4) => {
              var _a2;
              ((_a2 = this._currentLink) == null ? void 0 : _a2.state) && this._currentLink.state.decorations.pointerCursor !== e4 && (this._currentLink.state.decorations.pointerCursor = e4, this._currentLink.state.isHovered && this._element.classList.toggle("xterm-cursor-pointer", e4));
            } }, underline: { get: () => {
              var _a2, _b2;
              return (_b2 = (_a2 = this._currentLink) == null ? void 0 : _a2.state) == null ? void 0 : _b2.decorations.underline;
            }, set: (t4) => {
              var _a2, _b2, _c2;
              ((_a2 = this._currentLink) == null ? void 0 : _a2.state) && ((_c2 = (_b2 = this._currentLink) == null ? void 0 : _b2.state) == null ? void 0 : _c2.decorations.underline) !== t4 && (this._currentLink.state.decorations.underline = t4, this._currentLink.state.isHovered && this._fireUnderlineEvent(e3.link, t4));
            } } }), this._linkCacheDisposables.push(this._renderService.onRenderedViewportChange((e4) => {
              if (!this._currentLink) return;
              const t4 = 0 === e4.start ? 0 : e4.start + 1 + this._bufferService.buffer.ydisp, i3 = this._bufferService.buffer.ydisp + 1 + e4.end;
              if (this._currentLink.link.range.start.y >= t4 && this._currentLink.link.range.end.y <= i3 && (this._clearCurrentLink(t4, i3), this._lastMouseEvent)) {
                const e5 = this._positionFromMouseEvent(this._lastMouseEvent, this._element, this._mouseService);
                e5 && this._askForLink(e5, false);
              }
            })));
          }
          _linkHover(e3, t3, i3) {
            var _a2;
            ((_a2 = this._currentLink) == null ? void 0 : _a2.state) && (this._currentLink.state.isHovered = true, this._currentLink.state.decorations.underline && this._fireUnderlineEvent(t3, true), this._currentLink.state.decorations.pointerCursor && e3.classList.add("xterm-cursor-pointer")), t3.hover && t3.hover(i3, t3.text);
          }
          _fireUnderlineEvent(e3, t3) {
            const i3 = e3.range, s3 = this._bufferService.buffer.ydisp, r2 = this._createLinkUnderlineEvent(i3.start.x - 1, i3.start.y - s3 - 1, i3.end.x, i3.end.y - s3 - 1, void 0);
            (t3 ? this._onShowLinkUnderline : this._onHideLinkUnderline).fire(r2);
          }
          _linkLeave(e3, t3, i3) {
            var _a2;
            ((_a2 = this._currentLink) == null ? void 0 : _a2.state) && (this._currentLink.state.isHovered = false, this._currentLink.state.decorations.underline && this._fireUnderlineEvent(t3, false), this._currentLink.state.decorations.pointerCursor && e3.classList.remove("xterm-cursor-pointer")), t3.leave && t3.leave(i3, t3.text);
          }
          _linkAtPosition(e3, t3) {
            const i3 = e3.range.start.y * this._bufferService.cols + e3.range.start.x, s3 = e3.range.end.y * this._bufferService.cols + e3.range.end.x, r2 = t3.y * this._bufferService.cols + t3.x;
            return i3 <= r2 && r2 <= s3;
          }
          _positionFromMouseEvent(e3, t3, i3) {
            const s3 = i3.getCoords(e3, t3, this._bufferService.cols, this._bufferService.rows);
            if (s3) return { x: s3[0], y: s3[1] + this._bufferService.buffer.ydisp };
          }
          _createLinkUnderlineEvent(e3, t3, i3, s3, r2) {
            return { x1: e3, y1: t3, x2: i3, y2: s3, cols: this._bufferService.cols, fg: r2 };
          }
        };
        t2.Linkifier = l = s2([r(1, c.IMouseService), r(2, c.IRenderService), r(3, h.IBufferService), r(4, c.ILinkProviderService)], l);
      }, 9042: (e2, t2) => {
        Object.defineProperty(t2, "__esModule", { value: true }), t2.tooMuchOutput = t2.promptLabel = void 0, t2.promptLabel = "Terminal input", t2.tooMuchOutput = "Too much output to announce, navigate to rows manually to read";
      }, 3730: function(e2, t2, i2) {
        var s2 = this && this.__decorate || function(e3, t3, i3, s3) {
          var r2, n2 = arguments.length, o2 = n2 < 3 ? t3 : null === s3 ? s3 = Object.getOwnPropertyDescriptor(t3, i3) : s3;
          if ("object" == typeof Reflect && "function" == typeof Reflect.decorate) o2 = Reflect.decorate(e3, t3, i3, s3);
          else for (var a2 = e3.length - 1; a2 >= 0; a2--) (r2 = e3[a2]) && (o2 = (n2 < 3 ? r2(o2) : n2 > 3 ? r2(t3, i3, o2) : r2(t3, i3)) || o2);
          return n2 > 3 && o2 && Object.defineProperty(t3, i3, o2), o2;
        }, r = this && this.__param || function(e3, t3) {
          return function(i3, s3) {
            t3(i3, s3, e3);
          };
        };
        Object.defineProperty(t2, "__esModule", { value: true }), t2.OscLinkProvider = void 0;
        const n = i2(511), o = i2(2585);
        let a = t2.OscLinkProvider = class {
          constructor(e3, t3, i3) {
            this._bufferService = e3, this._optionsService = t3, this._oscLinkService = i3;
          }
          provideLinks(e3, t3) {
            var _a2;
            const i3 = this._bufferService.buffer.lines.get(e3 - 1);
            if (!i3) return void t3(void 0);
            const s3 = [], r2 = this._optionsService.rawOptions.linkHandler, o2 = new n.CellData(), a2 = i3.getTrimmedLength();
            let c = -1, l = -1, d = false;
            for (let t4 = 0; t4 < a2; t4++) if (-1 !== l || i3.hasContent(t4)) {
              if (i3.loadCell(t4, o2), o2.hasExtendedAttrs() && o2.extended.urlId) {
                if (-1 === l) {
                  l = t4, c = o2.extended.urlId;
                  continue;
                }
                d = o2.extended.urlId !== c;
              } else -1 !== l && (d = true);
              if (d || -1 !== l && t4 === a2 - 1) {
                const i4 = (_a2 = this._oscLinkService.getLinkData(c)) == null ? void 0 : _a2.uri;
                if (i4) {
                  const n2 = { start: { x: l + 1, y: e3 }, end: { x: t4 + (d || t4 !== a2 - 1 ? 0 : 1), y: e3 } };
                  let o3 = false;
                  if (!(r2 == null ? void 0 : r2.allowNonHttpProtocols)) try {
                    const e4 = new URL(i4);
                    ["http:", "https:"].includes(e4.protocol) || (o3 = true);
                  } catch (e4) {
                    o3 = true;
                  }
                  o3 || s3.push({ text: i4, range: n2, activate: (e4, t5) => r2 ? r2.activate(e4, t5, n2) : h(0, t5), hover: (e4, t5) => {
                    var _a3;
                    return (_a3 = r2 == null ? void 0 : r2.hover) == null ? void 0 : _a3.call(r2, e4, t5, n2);
                  }, leave: (e4, t5) => {
                    var _a3;
                    return (_a3 = r2 == null ? void 0 : r2.leave) == null ? void 0 : _a3.call(r2, e4, t5, n2);
                  } });
                }
                d = false, o2.hasExtendedAttrs() && o2.extended.urlId ? (l = t4, c = o2.extended.urlId) : (l = -1, c = -1);
              }
            }
            t3(s3);
          }
        };
        function h(e3, t3) {
          if (confirm(`Do you want to navigate to ${t3}?

WARNING: This link could potentially be dangerous`)) {
            const e4 = window.open();
            if (e4) {
              try {
                e4.opener = null;
              } catch {
              }
              e4.location.href = t3;
            } else console.warn("Opening link blocked as opener could not be cleared");
          }
        }
        t2.OscLinkProvider = a = s2([r(0, o.IBufferService), r(1, o.IOptionsService), r(2, o.IOscLinkService)], a);
      }, 6193: (e2, t2) => {
        Object.defineProperty(t2, "__esModule", { value: true }), t2.RenderDebouncer = void 0, t2.RenderDebouncer = class {
          constructor(e3, t3) {
            this._renderCallback = e3, this._coreBrowserService = t3, this._refreshCallbacks = [];
          }
          dispose() {
            this._animationFrame && (this._coreBrowserService.window.cancelAnimationFrame(this._animationFrame), this._animationFrame = void 0);
          }
          addRefreshCallback(e3) {
            return this._refreshCallbacks.push(e3), this._animationFrame || (this._animationFrame = this._coreBrowserService.window.requestAnimationFrame(() => this._innerRefresh())), this._animationFrame;
          }
          refresh(e3, t3, i2) {
            this._rowCount = i2, e3 = void 0 !== e3 ? e3 : 0, t3 = void 0 !== t3 ? t3 : this._rowCount - 1, this._rowStart = void 0 !== this._rowStart ? Math.min(this._rowStart, e3) : e3, this._rowEnd = void 0 !== this._rowEnd ? Math.max(this._rowEnd, t3) : t3, this._animationFrame || (this._animationFrame = this._coreBrowserService.window.requestAnimationFrame(() => this._innerRefresh()));
          }
          _innerRefresh() {
            if (this._animationFrame = void 0, void 0 === this._rowStart || void 0 === this._rowEnd || void 0 === this._rowCount) return void this._runRefreshCallbacks();
            const e3 = Math.max(this._rowStart, 0), t3 = Math.min(this._rowEnd, this._rowCount - 1);
            this._rowStart = void 0, this._rowEnd = void 0, this._renderCallback(e3, t3), this._runRefreshCallbacks();
          }
          _runRefreshCallbacks() {
            for (const e3 of this._refreshCallbacks) e3(0);
            this._refreshCallbacks = [];
          }
        };
      }, 3236: (e2, t2, i2) => {
        Object.defineProperty(t2, "__esModule", { value: true }), t2.Terminal = void 0;
        const s2 = i2(3614), r = i2(3656), n = i2(3551), o = i2(9042), a = i2(3730), h = i2(1680), c = i2(3107), l = i2(5744), d = i2(2950), _ = i2(1296), u = i2(428), f = i2(4269), v = i2(5114), p = i2(8934), g = i2(3230), m = i2(9312), S = i2(4725), C = i2(6731), b = i2(8055), w = i2(8969), y = i2(8460), E = i2(844), k = i2(6114), L = i2(8437), D = i2(2584), R = i2(7399), x = i2(5941), A = i2(9074), B = i2(2585), T = i2(5435), M = i2(4567), O = i2(779);
        class P extends w.CoreTerminal {
          get onFocus() {
            return this._onFocus.event;
          }
          get onBlur() {
            return this._onBlur.event;
          }
          get onA11yChar() {
            return this._onA11yCharEmitter.event;
          }
          get onA11yTab() {
            return this._onA11yTabEmitter.event;
          }
          get onWillOpen() {
            return this._onWillOpen.event;
          }
          constructor(e3 = {}) {
            super(e3), this.browser = k, this._keyDownHandled = false, this._keyDownSeen = false, this._keyPressHandled = false, this._unprocessedDeadKey = false, this._accessibilityManager = this.register(new E.MutableDisposable()), this._onCursorMove = this.register(new y.EventEmitter()), this.onCursorMove = this._onCursorMove.event, this._onKey = this.register(new y.EventEmitter()), this.onKey = this._onKey.event, this._onRender = this.register(new y.EventEmitter()), this.onRender = this._onRender.event, this._onSelectionChange = this.register(new y.EventEmitter()), this.onSelectionChange = this._onSelectionChange.event, this._onTitleChange = this.register(new y.EventEmitter()), this.onTitleChange = this._onTitleChange.event, this._onBell = this.register(new y.EventEmitter()), this.onBell = this._onBell.event, this._onFocus = this.register(new y.EventEmitter()), this._onBlur = this.register(new y.EventEmitter()), this._onA11yCharEmitter = this.register(new y.EventEmitter()), this._onA11yTabEmitter = this.register(new y.EventEmitter()), this._onWillOpen = this.register(new y.EventEmitter()), this._setup(), this._decorationService = this._instantiationService.createInstance(A.DecorationService), this._instantiationService.setService(B.IDecorationService, this._decorationService), this._linkProviderService = this._instantiationService.createInstance(O.LinkProviderService), this._instantiationService.setService(S.ILinkProviderService, this._linkProviderService), this._linkProviderService.registerLinkProvider(this._instantiationService.createInstance(a.OscLinkProvider)), this.register(this._inputHandler.onRequestBell(() => this._onBell.fire())), this.register(this._inputHandler.onRequestRefreshRows((e4, t3) => this.refresh(e4, t3))), this.register(this._inputHandler.onRequestSendFocus(() => this._reportFocus())), this.register(this._inputHandler.onRequestReset(() => this.reset())), this.register(this._inputHandler.onRequestWindowsOptionsReport((e4) => this._reportWindowsOptions(e4))), this.register(this._inputHandler.onColor((e4) => this._handleColorEvent(e4))), this.register((0, y.forwardEvent)(this._inputHandler.onCursorMove, this._onCursorMove)), this.register((0, y.forwardEvent)(this._inputHandler.onTitleChange, this._onTitleChange)), this.register((0, y.forwardEvent)(this._inputHandler.onA11yChar, this._onA11yCharEmitter)), this.register((0, y.forwardEvent)(this._inputHandler.onA11yTab, this._onA11yTabEmitter)), this.register(this._bufferService.onResize((e4) => this._afterResize(e4.cols, e4.rows))), this.register((0, E.toDisposable)(() => {
              var _a2, _b2;
              this._customKeyEventHandler = void 0, (_b2 = (_a2 = this.element) == null ? void 0 : _a2.parentNode) == null ? void 0 : _b2.removeChild(this.element);
            }));
          }
          _handleColorEvent(e3) {
            if (this._themeService) for (const t3 of e3) {
              let e4, i3 = "";
              switch (t3.index) {
                case 256:
                  e4 = "foreground", i3 = "10";
                  break;
                case 257:
                  e4 = "background", i3 = "11";
                  break;
                case 258:
                  e4 = "cursor", i3 = "12";
                  break;
                default:
                  e4 = "ansi", i3 = "4;" + t3.index;
              }
              switch (t3.type) {
                case 0:
                  const s3 = b.color.toColorRGB("ansi" === e4 ? this._themeService.colors.ansi[t3.index] : this._themeService.colors[e4]);
                  this.coreService.triggerDataEvent(`${D.C0.ESC}]${i3};${(0, x.toRgbString)(s3)}${D.C1_ESCAPED.ST}`);
                  break;
                case 1:
                  if ("ansi" === e4) this._themeService.modifyColors((e5) => e5.ansi[t3.index] = b.channels.toColor(...t3.color));
                  else {
                    const i4 = e4;
                    this._themeService.modifyColors((e5) => e5[i4] = b.channels.toColor(...t3.color));
                  }
                  break;
                case 2:
                  this._themeService.restoreColor(t3.index);
              }
            }
          }
          _setup() {
            super._setup(), this._customKeyEventHandler = void 0;
          }
          get buffer() {
            return this.buffers.active;
          }
          focus() {
            this.textarea && this.textarea.focus({ preventScroll: true });
          }
          _handleScreenReaderModeOptionChange(e3) {
            e3 ? !this._accessibilityManager.value && this._renderService && (this._accessibilityManager.value = this._instantiationService.createInstance(M.AccessibilityManager, this)) : this._accessibilityManager.clear();
          }
          _handleTextAreaFocus(e3) {
            this.coreService.decPrivateModes.sendFocus && this.coreService.triggerDataEvent(D.C0.ESC + "[I"), this.element.classList.add("focus"), this._showCursor(), this._onFocus.fire();
          }
          blur() {
            var _a2;
            return (_a2 = this.textarea) == null ? void 0 : _a2.blur();
          }
          _handleTextAreaBlur() {
            this.textarea.value = "", this.refresh(this.buffer.y, this.buffer.y), this.coreService.decPrivateModes.sendFocus && this.coreService.triggerDataEvent(D.C0.ESC + "[O"), this.element.classList.remove("focus"), this._onBlur.fire();
          }
          _syncTextArea() {
            if (!this.textarea || !this.buffer.isCursorInViewport || this._compositionHelper.isComposing || !this._renderService) return;
            const e3 = this.buffer.ybase + this.buffer.y, t3 = this.buffer.lines.get(e3);
            if (!t3) return;
            const i3 = Math.min(this.buffer.x, this.cols - 1), s3 = this._renderService.dimensions.css.cell.height, r2 = t3.getWidth(i3), n2 = this._renderService.dimensions.css.cell.width * r2, o2 = this.buffer.y * this._renderService.dimensions.css.cell.height, a2 = i3 * this._renderService.dimensions.css.cell.width;
            this.textarea.style.left = a2 + "px", this.textarea.style.top = o2 + "px", this.textarea.style.width = n2 + "px", this.textarea.style.height = s3 + "px", this.textarea.style.lineHeight = s3 + "px", this.textarea.style.zIndex = "-5";
          }
          _initGlobal() {
            this._bindKeys(), this.register((0, r.addDisposableDomListener)(this.element, "copy", (e4) => {
              this.hasSelection() && (0, s2.copyHandler)(e4, this._selectionService);
            }));
            const e3 = (e4) => (0, s2.handlePasteEvent)(e4, this.textarea, this.coreService, this.optionsService);
            this.register((0, r.addDisposableDomListener)(this.textarea, "paste", e3)), this.register((0, r.addDisposableDomListener)(this.element, "paste", e3)), k.isFirefox ? this.register((0, r.addDisposableDomListener)(this.element, "mousedown", (e4) => {
              2 === e4.button && (0, s2.rightClickHandler)(e4, this.textarea, this.screenElement, this._selectionService, this.options.rightClickSelectsWord);
            })) : this.register((0, r.addDisposableDomListener)(this.element, "contextmenu", (e4) => {
              (0, s2.rightClickHandler)(e4, this.textarea, this.screenElement, this._selectionService, this.options.rightClickSelectsWord);
            })), k.isLinux && this.register((0, r.addDisposableDomListener)(this.element, "auxclick", (e4) => {
              1 === e4.button && (0, s2.moveTextAreaUnderMouseCursor)(e4, this.textarea, this.screenElement);
            }));
          }
          _bindKeys() {
            this.register((0, r.addDisposableDomListener)(this.textarea, "keyup", (e3) => this._keyUp(e3), true)), this.register((0, r.addDisposableDomListener)(this.textarea, "keydown", (e3) => this._keyDown(e3), true)), this.register((0, r.addDisposableDomListener)(this.textarea, "keypress", (e3) => this._keyPress(e3), true)), this.register((0, r.addDisposableDomListener)(this.textarea, "compositionstart", () => this._compositionHelper.compositionstart())), this.register((0, r.addDisposableDomListener)(this.textarea, "compositionupdate", (e3) => this._compositionHelper.compositionupdate(e3))), this.register((0, r.addDisposableDomListener)(this.textarea, "compositionend", () => this._compositionHelper.compositionend())), this.register((0, r.addDisposableDomListener)(this.textarea, "input", (e3) => this._inputEvent(e3), true)), this.register(this.onRender(() => this._compositionHelper.updateCompositionElements()));
          }
          open(e3) {
            var _a2;
            if (!e3) throw new Error("Terminal requires a parent element.");
            if (e3.isConnected || this._logService.debug("Terminal.open was called on an element that was not attached to the DOM"), ((_a2 = this.element) == null ? void 0 : _a2.ownerDocument.defaultView) && this._coreBrowserService) return void (this.element.ownerDocument.defaultView !== this._coreBrowserService.window && (this._coreBrowserService.window = this.element.ownerDocument.defaultView));
            this._document = e3.ownerDocument, this.options.documentOverride && this.options.documentOverride instanceof Document && (this._document = this.optionsService.rawOptions.documentOverride), this.element = this._document.createElement("div"), this.element.dir = "ltr", this.element.classList.add("terminal"), this.element.classList.add("xterm"), e3.appendChild(this.element);
            const t3 = this._document.createDocumentFragment();
            this._viewportElement = this._document.createElement("div"), this._viewportElement.classList.add("xterm-viewport"), t3.appendChild(this._viewportElement), this._viewportScrollArea = this._document.createElement("div"), this._viewportScrollArea.classList.add("xterm-scroll-area"), this._viewportElement.appendChild(this._viewportScrollArea), this.screenElement = this._document.createElement("div"), this.screenElement.classList.add("xterm-screen"), this.register((0, r.addDisposableDomListener)(this.screenElement, "mousemove", (e4) => this.updateCursorStyle(e4))), this._helperContainer = this._document.createElement("div"), this._helperContainer.classList.add("xterm-helpers"), this.screenElement.appendChild(this._helperContainer), t3.appendChild(this.screenElement), this.textarea = this._document.createElement("textarea"), this.textarea.classList.add("xterm-helper-textarea"), this.textarea.setAttribute("aria-label", o.promptLabel), k.isChromeOS || this.textarea.setAttribute("aria-multiline", "false"), this.textarea.setAttribute("autocorrect", "off"), this.textarea.setAttribute("autocapitalize", "off"), this.textarea.setAttribute("spellcheck", "false"), this.textarea.tabIndex = 0, this._coreBrowserService = this.register(this._instantiationService.createInstance(v.CoreBrowserService, this.textarea, e3.ownerDocument.defaultView ?? window, this._document ?? "undefined" != typeof window ? window.document : null)), this._instantiationService.setService(S.ICoreBrowserService, this._coreBrowserService), this.register((0, r.addDisposableDomListener)(this.textarea, "focus", (e4) => this._handleTextAreaFocus(e4))), this.register((0, r.addDisposableDomListener)(this.textarea, "blur", () => this._handleTextAreaBlur())), this._helperContainer.appendChild(this.textarea), this._charSizeService = this._instantiationService.createInstance(u.CharSizeService, this._document, this._helperContainer), this._instantiationService.setService(S.ICharSizeService, this._charSizeService), this._themeService = this._instantiationService.createInstance(C.ThemeService), this._instantiationService.setService(S.IThemeService, this._themeService), this._characterJoinerService = this._instantiationService.createInstance(f.CharacterJoinerService), this._instantiationService.setService(S.ICharacterJoinerService, this._characterJoinerService), this._renderService = this.register(this._instantiationService.createInstance(g.RenderService, this.rows, this.screenElement)), this._instantiationService.setService(S.IRenderService, this._renderService), this.register(this._renderService.onRenderedViewportChange((e4) => this._onRender.fire(e4))), this.onResize((e4) => this._renderService.resize(e4.cols, e4.rows)), this._compositionView = this._document.createElement("div"), this._compositionView.classList.add("composition-view"), this._compositionHelper = this._instantiationService.createInstance(d.CompositionHelper, this.textarea, this._compositionView), this._helperContainer.appendChild(this._compositionView), this._mouseService = this._instantiationService.createInstance(p.MouseService), this._instantiationService.setService(S.IMouseService, this._mouseService), this.linkifier = this.register(this._instantiationService.createInstance(n.Linkifier, this.screenElement)), this.element.appendChild(t3);
            try {
              this._onWillOpen.fire(this.element);
            } catch {
            }
            this._renderService.hasRenderer() || this._renderService.setRenderer(this._createRenderer()), this.viewport = this._instantiationService.createInstance(h.Viewport, this._viewportElement, this._viewportScrollArea), this.viewport.onRequestScrollLines((e4) => this.scrollLines(e4.amount, e4.suppressScrollEvent, 1)), this.register(this._inputHandler.onRequestSyncScrollBar(() => this.viewport.syncScrollArea())), this.register(this.viewport), this.register(this.onCursorMove(() => {
              this._renderService.handleCursorMove(), this._syncTextArea();
            })), this.register(this.onResize(() => this._renderService.handleResize(this.cols, this.rows))), this.register(this.onBlur(() => this._renderService.handleBlur())), this.register(this.onFocus(() => this._renderService.handleFocus())), this.register(this._renderService.onDimensionsChange(() => this.viewport.syncScrollArea())), this._selectionService = this.register(this._instantiationService.createInstance(m.SelectionService, this.element, this.screenElement, this.linkifier)), this._instantiationService.setService(S.ISelectionService, this._selectionService), this.register(this._selectionService.onRequestScrollLines((e4) => this.scrollLines(e4.amount, e4.suppressScrollEvent))), this.register(this._selectionService.onSelectionChange(() => this._onSelectionChange.fire())), this.register(this._selectionService.onRequestRedraw((e4) => this._renderService.handleSelectionChanged(e4.start, e4.end, e4.columnSelectMode))), this.register(this._selectionService.onLinuxMouseSelection((e4) => {
              this.textarea.value = e4, this.textarea.focus(), this.textarea.select();
            })), this.register(this._onScroll.event((e4) => {
              this.viewport.syncScrollArea(), this._selectionService.refresh();
            })), this.register((0, r.addDisposableDomListener)(this._viewportElement, "scroll", () => this._selectionService.refresh())), this.register(this._instantiationService.createInstance(c.BufferDecorationRenderer, this.screenElement)), this.register((0, r.addDisposableDomListener)(this.element, "mousedown", (e4) => this._selectionService.handleMouseDown(e4))), this.coreMouseService.areMouseEventsActive ? (this._selectionService.disable(), this.element.classList.add("enable-mouse-events")) : this._selectionService.enable(), this.options.screenReaderMode && (this._accessibilityManager.value = this._instantiationService.createInstance(M.AccessibilityManager, this)), this.register(this.optionsService.onSpecificOptionChange("screenReaderMode", (e4) => this._handleScreenReaderModeOptionChange(e4))), this.options.overviewRulerWidth && (this._overviewRulerRenderer = this.register(this._instantiationService.createInstance(l.OverviewRulerRenderer, this._viewportElement, this.screenElement))), this.optionsService.onSpecificOptionChange("overviewRulerWidth", (e4) => {
              !this._overviewRulerRenderer && e4 && this._viewportElement && this.screenElement && (this._overviewRulerRenderer = this.register(this._instantiationService.createInstance(l.OverviewRulerRenderer, this._viewportElement, this.screenElement)));
            }), this._charSizeService.measure(), this.refresh(0, this.rows - 1), this._initGlobal(), this.bindMouse();
          }
          _createRenderer() {
            return this._instantiationService.createInstance(_.DomRenderer, this, this._document, this.element, this.screenElement, this._viewportElement, this._helperContainer, this.linkifier);
          }
          bindMouse() {
            const e3 = this, t3 = this.element;
            function i3(t4) {
              const i4 = e3._mouseService.getMouseReportCoords(t4, e3.screenElement);
              if (!i4) return false;
              let s4, r2;
              switch (t4.overrideType || t4.type) {
                case "mousemove":
                  r2 = 32, void 0 === t4.buttons ? (s4 = 3, void 0 !== t4.button && (s4 = t4.button < 3 ? t4.button : 3)) : s4 = 1 & t4.buttons ? 0 : 4 & t4.buttons ? 1 : 2 & t4.buttons ? 2 : 3;
                  break;
                case "mouseup":
                  r2 = 0, s4 = t4.button < 3 ? t4.button : 3;
                  break;
                case "mousedown":
                  r2 = 1, s4 = t4.button < 3 ? t4.button : 3;
                  break;
                case "wheel":
                  if (e3._customWheelEventHandler && false === e3._customWheelEventHandler(t4)) return false;
                  if (0 === e3.viewport.getLinesScrolled(t4)) return false;
                  r2 = t4.deltaY < 0 ? 0 : 1, s4 = 4;
                  break;
                default:
                  return false;
              }
              return !(void 0 === r2 || void 0 === s4 || s4 > 4) && e3.coreMouseService.triggerMouseEvent({ col: i4.col, row: i4.row, x: i4.x, y: i4.y, button: s4, action: r2, ctrl: t4.ctrlKey, alt: t4.altKey, shift: t4.shiftKey });
            }
            const s3 = { mouseup: null, wheel: null, mousedrag: null, mousemove: null }, n2 = { mouseup: (e4) => (i3(e4), e4.buttons || (this._document.removeEventListener("mouseup", s3.mouseup), s3.mousedrag && this._document.removeEventListener("mousemove", s3.mousedrag)), this.cancel(e4)), wheel: (e4) => (i3(e4), this.cancel(e4, true)), mousedrag: (e4) => {
              e4.buttons && i3(e4);
            }, mousemove: (e4) => {
              e4.buttons || i3(e4);
            } };
            this.register(this.coreMouseService.onProtocolChange((e4) => {
              e4 ? ("debug" === this.optionsService.rawOptions.logLevel && this._logService.debug("Binding to mouse events:", this.coreMouseService.explainEvents(e4)), this.element.classList.add("enable-mouse-events"), this._selectionService.disable()) : (this._logService.debug("Unbinding from mouse events."), this.element.classList.remove("enable-mouse-events"), this._selectionService.enable()), 8 & e4 ? s3.mousemove || (t3.addEventListener("mousemove", n2.mousemove), s3.mousemove = n2.mousemove) : (t3.removeEventListener("mousemove", s3.mousemove), s3.mousemove = null), 16 & e4 ? s3.wheel || (t3.addEventListener("wheel", n2.wheel, { passive: false }), s3.wheel = n2.wheel) : (t3.removeEventListener("wheel", s3.wheel), s3.wheel = null), 2 & e4 ? s3.mouseup || (s3.mouseup = n2.mouseup) : (this._document.removeEventListener("mouseup", s3.mouseup), s3.mouseup = null), 4 & e4 ? s3.mousedrag || (s3.mousedrag = n2.mousedrag) : (this._document.removeEventListener("mousemove", s3.mousedrag), s3.mousedrag = null);
            })), this.coreMouseService.activeProtocol = this.coreMouseService.activeProtocol, this.register((0, r.addDisposableDomListener)(t3, "mousedown", (e4) => {
              if (e4.preventDefault(), this.focus(), this.coreMouseService.areMouseEventsActive && !this._selectionService.shouldForceSelection(e4)) return i3(e4), s3.mouseup && this._document.addEventListener("mouseup", s3.mouseup), s3.mousedrag && this._document.addEventListener("mousemove", s3.mousedrag), this.cancel(e4);
            })), this.register((0, r.addDisposableDomListener)(t3, "wheel", (e4) => {
              if (!s3.wheel) {
                if (this._customWheelEventHandler && false === this._customWheelEventHandler(e4)) return false;
                if (!this.buffer.hasScrollback) {
                  const t4 = this.viewport.getLinesScrolled(e4);
                  if (0 === t4) return;
                  const i4 = D.C0.ESC + (this.coreService.decPrivateModes.applicationCursorKeys ? "O" : "[") + (e4.deltaY < 0 ? "A" : "B");
                  let s4 = "";
                  for (let e5 = 0; e5 < Math.abs(t4); e5++) s4 += i4;
                  return this.coreService.triggerDataEvent(s4, true), this.cancel(e4, true);
                }
                return this.viewport.handleWheel(e4) ? this.cancel(e4) : void 0;
              }
            }, { passive: false })), this.register((0, r.addDisposableDomListener)(t3, "touchstart", (e4) => {
              if (!this.coreMouseService.areMouseEventsActive) return this.viewport.handleTouchStart(e4), this.cancel(e4);
            }, { passive: true })), this.register((0, r.addDisposableDomListener)(t3, "touchmove", (e4) => {
              if (!this.coreMouseService.areMouseEventsActive) return this.viewport.handleTouchMove(e4) ? void 0 : this.cancel(e4);
            }, { passive: false }));
          }
          refresh(e3, t3) {
            var _a2;
            (_a2 = this._renderService) == null ? void 0 : _a2.refreshRows(e3, t3);
          }
          updateCursorStyle(e3) {
            var _a2;
            ((_a2 = this._selectionService) == null ? void 0 : _a2.shouldColumnSelect(e3)) ? this.element.classList.add("column-select") : this.element.classList.remove("column-select");
          }
          _showCursor() {
            this.coreService.isCursorInitialized || (this.coreService.isCursorInitialized = true, this.refresh(this.buffer.y, this.buffer.y));
          }
          scrollLines(e3, t3, i3 = 0) {
            var _a2;
            1 === i3 ? (super.scrollLines(e3, t3, i3), this.refresh(0, this.rows - 1)) : (_a2 = this.viewport) == null ? void 0 : _a2.scrollLines(e3);
          }
          paste(e3) {
            (0, s2.paste)(e3, this.textarea, this.coreService, this.optionsService);
          }
          attachCustomKeyEventHandler(e3) {
            this._customKeyEventHandler = e3;
          }
          attachCustomWheelEventHandler(e3) {
            this._customWheelEventHandler = e3;
          }
          registerLinkProvider(e3) {
            return this._linkProviderService.registerLinkProvider(e3);
          }
          registerCharacterJoiner(e3) {
            if (!this._characterJoinerService) throw new Error("Terminal must be opened first");
            const t3 = this._characterJoinerService.register(e3);
            return this.refresh(0, this.rows - 1), t3;
          }
          deregisterCharacterJoiner(e3) {
            if (!this._characterJoinerService) throw new Error("Terminal must be opened first");
            this._characterJoinerService.deregister(e3) && this.refresh(0, this.rows - 1);
          }
          get markers() {
            return this.buffer.markers;
          }
          registerMarker(e3) {
            return this.buffer.addMarker(this.buffer.ybase + this.buffer.y + e3);
          }
          registerDecoration(e3) {
            return this._decorationService.registerDecoration(e3);
          }
          hasSelection() {
            return !!this._selectionService && this._selectionService.hasSelection;
          }
          select(e3, t3, i3) {
            this._selectionService.setSelection(e3, t3, i3);
          }
          getSelection() {
            return this._selectionService ? this._selectionService.selectionText : "";
          }
          getSelectionPosition() {
            if (this._selectionService && this._selectionService.hasSelection) return { start: { x: this._selectionService.selectionStart[0], y: this._selectionService.selectionStart[1] }, end: { x: this._selectionService.selectionEnd[0], y: this._selectionService.selectionEnd[1] } };
          }
          clearSelection() {
            var _a2;
            (_a2 = this._selectionService) == null ? void 0 : _a2.clearSelection();
          }
          selectAll() {
            var _a2;
            (_a2 = this._selectionService) == null ? void 0 : _a2.selectAll();
          }
          selectLines(e3, t3) {
            var _a2;
            (_a2 = this._selectionService) == null ? void 0 : _a2.selectLines(e3, t3);
          }
          _keyDown(e3) {
            if (this._keyDownHandled = false, this._keyDownSeen = true, this._customKeyEventHandler && false === this._customKeyEventHandler(e3)) return false;
            const t3 = this.browser.isMac && this.options.macOptionIsMeta && e3.altKey;
            if (!t3 && !this._compositionHelper.keydown(e3)) return this.options.scrollOnUserInput && this.buffer.ybase !== this.buffer.ydisp && this.scrollToBottom(), false;
            t3 || "Dead" !== e3.key && "AltGraph" !== e3.key || (this._unprocessedDeadKey = true);
            const i3 = (0, R.evaluateKeyboardEvent)(e3, this.coreService.decPrivateModes.applicationCursorKeys, this.browser.isMac, this.options.macOptionIsMeta);
            if (this.updateCursorStyle(e3), 3 === i3.type || 2 === i3.type) {
              const t4 = this.rows - 1;
              return this.scrollLines(2 === i3.type ? -t4 : t4), this.cancel(e3, true);
            }
            return 1 === i3.type && this.selectAll(), !!this._isThirdLevelShift(this.browser, e3) || (i3.cancel && this.cancel(e3, true), !i3.key || !!(e3.key && !e3.ctrlKey && !e3.altKey && !e3.metaKey && 1 === e3.key.length && e3.key.charCodeAt(0) >= 65 && e3.key.charCodeAt(0) <= 90) || (this._unprocessedDeadKey ? (this._unprocessedDeadKey = false, true) : (i3.key !== D.C0.ETX && i3.key !== D.C0.CR || (this.textarea.value = ""), this._onKey.fire({ key: i3.key, domEvent: e3 }), this._showCursor(), this.coreService.triggerDataEvent(i3.key, true), !this.optionsService.rawOptions.screenReaderMode || e3.altKey || e3.ctrlKey ? this.cancel(e3, true) : void (this._keyDownHandled = true))));
          }
          _isThirdLevelShift(e3, t3) {
            const i3 = e3.isMac && !this.options.macOptionIsMeta && t3.altKey && !t3.ctrlKey && !t3.metaKey || e3.isWindows && t3.altKey && t3.ctrlKey && !t3.metaKey || e3.isWindows && t3.getModifierState("AltGraph");
            return "keypress" === t3.type ? i3 : i3 && (!t3.keyCode || t3.keyCode > 47);
          }
          _keyUp(e3) {
            this._keyDownSeen = false, this._customKeyEventHandler && false === this._customKeyEventHandler(e3) || (function(e4) {
              return 16 === e4.keyCode || 17 === e4.keyCode || 18 === e4.keyCode;
            }(e3) || this.focus(), this.updateCursorStyle(e3), this._keyPressHandled = false);
          }
          _keyPress(e3) {
            let t3;
            if (this._keyPressHandled = false, this._keyDownHandled) return false;
            if (this._customKeyEventHandler && false === this._customKeyEventHandler(e3)) return false;
            if (this.cancel(e3), e3.charCode) t3 = e3.charCode;
            else if (null === e3.which || void 0 === e3.which) t3 = e3.keyCode;
            else {
              if (0 === e3.which || 0 === e3.charCode) return false;
              t3 = e3.which;
            }
            return !(!t3 || (e3.altKey || e3.ctrlKey || e3.metaKey) && !this._isThirdLevelShift(this.browser, e3) || (t3 = String.fromCharCode(t3), this._onKey.fire({ key: t3, domEvent: e3 }), this._showCursor(), this.coreService.triggerDataEvent(t3, true), this._keyPressHandled = true, this._unprocessedDeadKey = false, 0));
          }
          _inputEvent(e3) {
            if (e3.data && "insertText" === e3.inputType && (!e3.composed || !this._keyDownSeen) && !this.optionsService.rawOptions.screenReaderMode) {
              if (this._keyPressHandled) return false;
              this._unprocessedDeadKey = false;
              const t3 = e3.data;
              return this.coreService.triggerDataEvent(t3, true), this.cancel(e3), true;
            }
            return false;
          }
          resize(e3, t3) {
            e3 !== this.cols || t3 !== this.rows ? super.resize(e3, t3) : this._charSizeService && !this._charSizeService.hasValidSize && this._charSizeService.measure();
          }
          _afterResize(e3, t3) {
            var _a2, _b2;
            (_a2 = this._charSizeService) == null ? void 0 : _a2.measure(), (_b2 = this.viewport) == null ? void 0 : _b2.syncScrollArea(true);
          }
          clear() {
            var _a2;
            if (0 !== this.buffer.ybase || 0 !== this.buffer.y) {
              this.buffer.clearAllMarkers(), this.buffer.lines.set(0, this.buffer.lines.get(this.buffer.ybase + this.buffer.y)), this.buffer.lines.length = 1, this.buffer.ydisp = 0, this.buffer.ybase = 0, this.buffer.y = 0;
              for (let e3 = 1; e3 < this.rows; e3++) this.buffer.lines.push(this.buffer.getBlankLine(L.DEFAULT_ATTR_DATA));
              this._onScroll.fire({ position: this.buffer.ydisp, source: 0 }), (_a2 = this.viewport) == null ? void 0 : _a2.reset(), this.refresh(0, this.rows - 1);
            }
          }
          reset() {
            var _a2, _b2;
            this.options.rows = this.rows, this.options.cols = this.cols;
            const e3 = this._customKeyEventHandler;
            this._setup(), super.reset(), (_a2 = this._selectionService) == null ? void 0 : _a2.reset(), this._decorationService.reset(), (_b2 = this.viewport) == null ? void 0 : _b2.reset(), this._customKeyEventHandler = e3, this.refresh(0, this.rows - 1);
          }
          clearTextureAtlas() {
            var _a2;
            (_a2 = this._renderService) == null ? void 0 : _a2.clearTextureAtlas();
          }
          _reportFocus() {
            var _a2;
            ((_a2 = this.element) == null ? void 0 : _a2.classList.contains("focus")) ? this.coreService.triggerDataEvent(D.C0.ESC + "[I") : this.coreService.triggerDataEvent(D.C0.ESC + "[O");
          }
          _reportWindowsOptions(e3) {
            if (this._renderService) switch (e3) {
              case T.WindowsOptionsReportType.GET_WIN_SIZE_PIXELS:
                const e4 = this._renderService.dimensions.css.canvas.width.toFixed(0), t3 = this._renderService.dimensions.css.canvas.height.toFixed(0);
                this.coreService.triggerDataEvent(`${D.C0.ESC}[4;${t3};${e4}t`);
                break;
              case T.WindowsOptionsReportType.GET_CELL_SIZE_PIXELS:
                const i3 = this._renderService.dimensions.css.cell.width.toFixed(0), s3 = this._renderService.dimensions.css.cell.height.toFixed(0);
                this.coreService.triggerDataEvent(`${D.C0.ESC}[6;${s3};${i3}t`);
            }
          }
          cancel(e3, t3) {
            if (this.options.cancelEvents || t3) return e3.preventDefault(), e3.stopPropagation(), false;
          }
        }
        t2.Terminal = P;
      }, 9924: (e2, t2) => {
        Object.defineProperty(t2, "__esModule", { value: true }), t2.TimeBasedDebouncer = void 0, t2.TimeBasedDebouncer = class {
          constructor(e3, t3 = 1e3) {
            this._renderCallback = e3, this._debounceThresholdMS = t3, this._lastRefreshMs = 0, this._additionalRefreshRequested = false;
          }
          dispose() {
            this._refreshTimeoutID && clearTimeout(this._refreshTimeoutID);
          }
          refresh(e3, t3, i2) {
            this._rowCount = i2, e3 = void 0 !== e3 ? e3 : 0, t3 = void 0 !== t3 ? t3 : this._rowCount - 1, this._rowStart = void 0 !== this._rowStart ? Math.min(this._rowStart, e3) : e3, this._rowEnd = void 0 !== this._rowEnd ? Math.max(this._rowEnd, t3) : t3;
            const s2 = Date.now();
            if (s2 - this._lastRefreshMs >= this._debounceThresholdMS) this._lastRefreshMs = s2, this._innerRefresh();
            else if (!this._additionalRefreshRequested) {
              const e4 = s2 - this._lastRefreshMs, t4 = this._debounceThresholdMS - e4;
              this._additionalRefreshRequested = true, this._refreshTimeoutID = window.setTimeout(() => {
                this._lastRefreshMs = Date.now(), this._innerRefresh(), this._additionalRefreshRequested = false, this._refreshTimeoutID = void 0;
              }, t4);
            }
          }
          _innerRefresh() {
            if (void 0 === this._rowStart || void 0 === this._rowEnd || void 0 === this._rowCount) return;
            const e3 = Math.max(this._rowStart, 0), t3 = Math.min(this._rowEnd, this._rowCount - 1);
            this._rowStart = void 0, this._rowEnd = void 0, this._renderCallback(e3, t3);
          }
        };
      }, 1680: function(e2, t2, i2) {
        var s2 = this && this.__decorate || function(e3, t3, i3, s3) {
          var r2, n2 = arguments.length, o2 = n2 < 3 ? t3 : null === s3 ? s3 = Object.getOwnPropertyDescriptor(t3, i3) : s3;
          if ("object" == typeof Reflect && "function" == typeof Reflect.decorate) o2 = Reflect.decorate(e3, t3, i3, s3);
          else for (var a2 = e3.length - 1; a2 >= 0; a2--) (r2 = e3[a2]) && (o2 = (n2 < 3 ? r2(o2) : n2 > 3 ? r2(t3, i3, o2) : r2(t3, i3)) || o2);
          return n2 > 3 && o2 && Object.defineProperty(t3, i3, o2), o2;
        }, r = this && this.__param || function(e3, t3) {
          return function(i3, s3) {
            t3(i3, s3, e3);
          };
        };
        Object.defineProperty(t2, "__esModule", { value: true }), t2.Viewport = void 0;
        const n = i2(3656), o = i2(4725), a = i2(8460), h = i2(844), c = i2(2585);
        let l = t2.Viewport = class extends h.Disposable {
          constructor(e3, t3, i3, s3, r2, o2, h2, c2) {
            super(), this._viewportElement = e3, this._scrollArea = t3, this._bufferService = i3, this._optionsService = s3, this._charSizeService = r2, this._renderService = o2, this._coreBrowserService = h2, this.scrollBarWidth = 0, this._currentRowHeight = 0, this._currentDeviceCellHeight = 0, this._lastRecordedBufferLength = 0, this._lastRecordedViewportHeight = 0, this._lastRecordedBufferHeight = 0, this._lastTouchY = 0, this._lastScrollTop = 0, this._wheelPartialScroll = 0, this._refreshAnimationFrame = null, this._ignoreNextScrollEvent = false, this._smoothScrollState = { startTime: 0, origin: -1, target: -1 }, this._onRequestScrollLines = this.register(new a.EventEmitter()), this.onRequestScrollLines = this._onRequestScrollLines.event, this.scrollBarWidth = this._viewportElement.offsetWidth - this._scrollArea.offsetWidth || 15, this.register((0, n.addDisposableDomListener)(this._viewportElement, "scroll", this._handleScroll.bind(this))), this._activeBuffer = this._bufferService.buffer, this.register(this._bufferService.buffers.onBufferActivate((e4) => this._activeBuffer = e4.activeBuffer)), this._renderDimensions = this._renderService.dimensions, this.register(this._renderService.onDimensionsChange((e4) => this._renderDimensions = e4)), this._handleThemeChange(c2.colors), this.register(c2.onChangeColors((e4) => this._handleThemeChange(e4))), this.register(this._optionsService.onSpecificOptionChange("scrollback", () => this.syncScrollArea())), setTimeout(() => this.syncScrollArea());
          }
          _handleThemeChange(e3) {
            this._viewportElement.style.backgroundColor = e3.background.css;
          }
          reset() {
            this._currentRowHeight = 0, this._currentDeviceCellHeight = 0, this._lastRecordedBufferLength = 0, this._lastRecordedViewportHeight = 0, this._lastRecordedBufferHeight = 0, this._lastTouchY = 0, this._lastScrollTop = 0, this._coreBrowserService.window.requestAnimationFrame(() => this.syncScrollArea());
          }
          _refresh(e3) {
            if (e3) return this._innerRefresh(), void (null !== this._refreshAnimationFrame && this._coreBrowserService.window.cancelAnimationFrame(this._refreshAnimationFrame));
            null === this._refreshAnimationFrame && (this._refreshAnimationFrame = this._coreBrowserService.window.requestAnimationFrame(() => this._innerRefresh()));
          }
          _innerRefresh() {
            if (this._charSizeService.height > 0) {
              this._currentRowHeight = this._renderDimensions.device.cell.height / this._coreBrowserService.dpr, this._currentDeviceCellHeight = this._renderDimensions.device.cell.height, this._lastRecordedViewportHeight = this._viewportElement.offsetHeight;
              const e4 = Math.round(this._currentRowHeight * this._lastRecordedBufferLength) + (this._lastRecordedViewportHeight - this._renderDimensions.css.canvas.height);
              this._lastRecordedBufferHeight !== e4 && (this._lastRecordedBufferHeight = e4, this._scrollArea.style.height = this._lastRecordedBufferHeight + "px");
            }
            const e3 = this._bufferService.buffer.ydisp * this._currentRowHeight;
            this._viewportElement.scrollTop !== e3 && (this._ignoreNextScrollEvent = true, this._viewportElement.scrollTop = e3), this._refreshAnimationFrame = null;
          }
          syncScrollArea(e3 = false) {
            if (this._lastRecordedBufferLength !== this._bufferService.buffer.lines.length) return this._lastRecordedBufferLength = this._bufferService.buffer.lines.length, void this._refresh(e3);
            this._lastRecordedViewportHeight === this._renderService.dimensions.css.canvas.height && this._lastScrollTop === this._activeBuffer.ydisp * this._currentRowHeight && this._renderDimensions.device.cell.height === this._currentDeviceCellHeight || this._refresh(e3);
          }
          _handleScroll(e3) {
            if (this._lastScrollTop = this._viewportElement.scrollTop, !this._viewportElement.offsetParent) return;
            if (this._ignoreNextScrollEvent) return this._ignoreNextScrollEvent = false, void this._onRequestScrollLines.fire({ amount: 0, suppressScrollEvent: true });
            const t3 = Math.round(this._lastScrollTop / this._currentRowHeight) - this._bufferService.buffer.ydisp;
            this._onRequestScrollLines.fire({ amount: t3, suppressScrollEvent: true });
          }
          _smoothScroll() {
            if (this._isDisposed || -1 === this._smoothScrollState.origin || -1 === this._smoothScrollState.target) return;
            const e3 = this._smoothScrollPercent();
            this._viewportElement.scrollTop = this._smoothScrollState.origin + Math.round(e3 * (this._smoothScrollState.target - this._smoothScrollState.origin)), e3 < 1 ? this._coreBrowserService.window.requestAnimationFrame(() => this._smoothScroll()) : this._clearSmoothScrollState();
          }
          _smoothScrollPercent() {
            return this._optionsService.rawOptions.smoothScrollDuration && this._smoothScrollState.startTime ? Math.max(Math.min((Date.now() - this._smoothScrollState.startTime) / this._optionsService.rawOptions.smoothScrollDuration, 1), 0) : 1;
          }
          _clearSmoothScrollState() {
            this._smoothScrollState.startTime = 0, this._smoothScrollState.origin = -1, this._smoothScrollState.target = -1;
          }
          _bubbleScroll(e3, t3) {
            const i3 = this._viewportElement.scrollTop + this._lastRecordedViewportHeight;
            return !(t3 < 0 && 0 !== this._viewportElement.scrollTop || t3 > 0 && i3 < this._lastRecordedBufferHeight) || (e3.cancelable && e3.preventDefault(), false);
          }
          handleWheel(e3) {
            const t3 = this._getPixelsScrolled(e3);
            return 0 !== t3 && (this._optionsService.rawOptions.smoothScrollDuration ? (this._smoothScrollState.startTime = Date.now(), this._smoothScrollPercent() < 1 ? (this._smoothScrollState.origin = this._viewportElement.scrollTop, -1 === this._smoothScrollState.target ? this._smoothScrollState.target = this._viewportElement.scrollTop + t3 : this._smoothScrollState.target += t3, this._smoothScrollState.target = Math.max(Math.min(this._smoothScrollState.target, this._viewportElement.scrollHeight), 0), this._smoothScroll()) : this._clearSmoothScrollState()) : this._viewportElement.scrollTop += t3, this._bubbleScroll(e3, t3));
          }
          scrollLines(e3) {
            if (0 !== e3) if (this._optionsService.rawOptions.smoothScrollDuration) {
              const t3 = e3 * this._currentRowHeight;
              this._smoothScrollState.startTime = Date.now(), this._smoothScrollPercent() < 1 ? (this._smoothScrollState.origin = this._viewportElement.scrollTop, this._smoothScrollState.target = this._smoothScrollState.origin + t3, this._smoothScrollState.target = Math.max(Math.min(this._smoothScrollState.target, this._viewportElement.scrollHeight), 0), this._smoothScroll()) : this._clearSmoothScrollState();
            } else this._onRequestScrollLines.fire({ amount: e3, suppressScrollEvent: false });
          }
          _getPixelsScrolled(e3) {
            if (0 === e3.deltaY || e3.shiftKey) return 0;
            let t3 = this._applyScrollModifier(e3.deltaY, e3);
            return e3.deltaMode === WheelEvent.DOM_DELTA_LINE ? t3 *= this._currentRowHeight : e3.deltaMode === WheelEvent.DOM_DELTA_PAGE && (t3 *= this._currentRowHeight * this._bufferService.rows), t3;
          }
          getBufferElements(e3, t3) {
            var _a2;
            let i3, s3 = "";
            const r2 = [], n2 = t3 ?? this._bufferService.buffer.lines.length, o2 = this._bufferService.buffer.lines;
            for (let t4 = e3; t4 < n2; t4++) {
              const e4 = o2.get(t4);
              if (!e4) continue;
              const n3 = (_a2 = o2.get(t4 + 1)) == null ? void 0 : _a2.isWrapped;
              if (s3 += e4.translateToString(!n3), !n3 || t4 === o2.length - 1) {
                const e5 = document.createElement("div");
                e5.textContent = s3, r2.push(e5), s3.length > 0 && (i3 = e5), s3 = "";
              }
            }
            return { bufferElements: r2, cursorElement: i3 };
          }
          getLinesScrolled(e3) {
            if (0 === e3.deltaY || e3.shiftKey) return 0;
            let t3 = this._applyScrollModifier(e3.deltaY, e3);
            return e3.deltaMode === WheelEvent.DOM_DELTA_PIXEL ? (t3 /= this._currentRowHeight + 0, this._wheelPartialScroll += t3, t3 = Math.floor(Math.abs(this._wheelPartialScroll)) * (this._wheelPartialScroll > 0 ? 1 : -1), this._wheelPartialScroll %= 1) : e3.deltaMode === WheelEvent.DOM_DELTA_PAGE && (t3 *= this._bufferService.rows), t3;
          }
          _applyScrollModifier(e3, t3) {
            const i3 = this._optionsService.rawOptions.fastScrollModifier;
            return "alt" === i3 && t3.altKey || "ctrl" === i3 && t3.ctrlKey || "shift" === i3 && t3.shiftKey ? e3 * this._optionsService.rawOptions.fastScrollSensitivity * this._optionsService.rawOptions.scrollSensitivity : e3 * this._optionsService.rawOptions.scrollSensitivity;
          }
          handleTouchStart(e3) {
            this._lastTouchY = e3.touches[0].pageY;
          }
          handleTouchMove(e3) {
            const t3 = this._lastTouchY - e3.touches[0].pageY;
            return this._lastTouchY = e3.touches[0].pageY, 0 !== t3 && (this._viewportElement.scrollTop += t3, this._bubbleScroll(e3, t3));
          }
        };
        t2.Viewport = l = s2([r(2, c.IBufferService), r(3, c.IOptionsService), r(4, o.ICharSizeService), r(5, o.IRenderService), r(6, o.ICoreBrowserService), r(7, o.IThemeService)], l);
      }, 3107: function(e2, t2, i2) {
        var s2 = this && this.__decorate || function(e3, t3, i3, s3) {
          var r2, n2 = arguments.length, o2 = n2 < 3 ? t3 : null === s3 ? s3 = Object.getOwnPropertyDescriptor(t3, i3) : s3;
          if ("object" == typeof Reflect && "function" == typeof Reflect.decorate) o2 = Reflect.decorate(e3, t3, i3, s3);
          else for (var a2 = e3.length - 1; a2 >= 0; a2--) (r2 = e3[a2]) && (o2 = (n2 < 3 ? r2(o2) : n2 > 3 ? r2(t3, i3, o2) : r2(t3, i3)) || o2);
          return n2 > 3 && o2 && Object.defineProperty(t3, i3, o2), o2;
        }, r = this && this.__param || function(e3, t3) {
          return function(i3, s3) {
            t3(i3, s3, e3);
          };
        };
        Object.defineProperty(t2, "__esModule", { value: true }), t2.BufferDecorationRenderer = void 0;
        const n = i2(4725), o = i2(844), a = i2(2585);
        let h = t2.BufferDecorationRenderer = class extends o.Disposable {
          constructor(e3, t3, i3, s3, r2) {
            super(), this._screenElement = e3, this._bufferService = t3, this._coreBrowserService = i3, this._decorationService = s3, this._renderService = r2, this._decorationElements = /* @__PURE__ */ new Map(), this._altBufferIsActive = false, this._dimensionsChanged = false, this._container = document.createElement("div"), this._container.classList.add("xterm-decoration-container"), this._screenElement.appendChild(this._container), this.register(this._renderService.onRenderedViewportChange(() => this._doRefreshDecorations())), this.register(this._renderService.onDimensionsChange(() => {
              this._dimensionsChanged = true, this._queueRefresh();
            })), this.register(this._coreBrowserService.onDprChange(() => this._queueRefresh())), this.register(this._bufferService.buffers.onBufferActivate(() => {
              this._altBufferIsActive = this._bufferService.buffer === this._bufferService.buffers.alt;
            })), this.register(this._decorationService.onDecorationRegistered(() => this._queueRefresh())), this.register(this._decorationService.onDecorationRemoved((e4) => this._removeDecoration(e4))), this.register((0, o.toDisposable)(() => {
              this._container.remove(), this._decorationElements.clear();
            }));
          }
          _queueRefresh() {
            void 0 === this._animationFrame && (this._animationFrame = this._renderService.addRefreshCallback(() => {
              this._doRefreshDecorations(), this._animationFrame = void 0;
            }));
          }
          _doRefreshDecorations() {
            for (const e3 of this._decorationService.decorations) this._renderDecoration(e3);
            this._dimensionsChanged = false;
          }
          _renderDecoration(e3) {
            this._refreshStyle(e3), this._dimensionsChanged && this._refreshXPosition(e3);
          }
          _createElement(e3) {
            var _a2;
            const t3 = this._coreBrowserService.mainDocument.createElement("div");
            t3.classList.add("xterm-decoration"), t3.classList.toggle("xterm-decoration-top-layer", "top" === ((_a2 = e3 == null ? void 0 : e3.options) == null ? void 0 : _a2.layer)), t3.style.width = `${Math.round((e3.options.width || 1) * this._renderService.dimensions.css.cell.width)}px`, t3.style.height = (e3.options.height || 1) * this._renderService.dimensions.css.cell.height + "px", t3.style.top = (e3.marker.line - this._bufferService.buffers.active.ydisp) * this._renderService.dimensions.css.cell.height + "px", t3.style.lineHeight = `${this._renderService.dimensions.css.cell.height}px`;
            const i3 = e3.options.x ?? 0;
            return i3 && i3 > this._bufferService.cols && (t3.style.display = "none"), this._refreshXPosition(e3, t3), t3;
          }
          _refreshStyle(e3) {
            const t3 = e3.marker.line - this._bufferService.buffers.active.ydisp;
            if (t3 < 0 || t3 >= this._bufferService.rows) e3.element && (e3.element.style.display = "none", e3.onRenderEmitter.fire(e3.element));
            else {
              let i3 = this._decorationElements.get(e3);
              i3 || (i3 = this._createElement(e3), e3.element = i3, this._decorationElements.set(e3, i3), this._container.appendChild(i3), e3.onDispose(() => {
                this._decorationElements.delete(e3), i3.remove();
              })), i3.style.top = t3 * this._renderService.dimensions.css.cell.height + "px", i3.style.display = this._altBufferIsActive ? "none" : "block", e3.onRenderEmitter.fire(i3);
            }
          }
          _refreshXPosition(e3, t3 = e3.element) {
            if (!t3) return;
            const i3 = e3.options.x ?? 0;
            "right" === (e3.options.anchor || "left") ? t3.style.right = i3 ? i3 * this._renderService.dimensions.css.cell.width + "px" : "" : t3.style.left = i3 ? i3 * this._renderService.dimensions.css.cell.width + "px" : "";
          }
          _removeDecoration(e3) {
            var _a2;
            (_a2 = this._decorationElements.get(e3)) == null ? void 0 : _a2.remove(), this._decorationElements.delete(e3), e3.dispose();
          }
        };
        t2.BufferDecorationRenderer = h = s2([r(1, a.IBufferService), r(2, n.ICoreBrowserService), r(3, a.IDecorationService), r(4, n.IRenderService)], h);
      }, 5871: (e2, t2) => {
        Object.defineProperty(t2, "__esModule", { value: true }), t2.ColorZoneStore = void 0, t2.ColorZoneStore = class {
          constructor() {
            this._zones = [], this._zonePool = [], this._zonePoolIndex = 0, this._linePadding = { full: 0, left: 0, center: 0, right: 0 };
          }
          get zones() {
            return this._zonePool.length = Math.min(this._zonePool.length, this._zones.length), this._zones;
          }
          clear() {
            this._zones.length = 0, this._zonePoolIndex = 0;
          }
          addDecoration(e3) {
            if (e3.options.overviewRulerOptions) {
              for (const t3 of this._zones) if (t3.color === e3.options.overviewRulerOptions.color && t3.position === e3.options.overviewRulerOptions.position) {
                if (this._lineIntersectsZone(t3, e3.marker.line)) return;
                if (this._lineAdjacentToZone(t3, e3.marker.line, e3.options.overviewRulerOptions.position)) return void this._addLineToZone(t3, e3.marker.line);
              }
              if (this._zonePoolIndex < this._zonePool.length) return this._zonePool[this._zonePoolIndex].color = e3.options.overviewRulerOptions.color, this._zonePool[this._zonePoolIndex].position = e3.options.overviewRulerOptions.position, this._zonePool[this._zonePoolIndex].startBufferLine = e3.marker.line, this._zonePool[this._zonePoolIndex].endBufferLine = e3.marker.line, void this._zones.push(this._zonePool[this._zonePoolIndex++]);
              this._zones.push({ color: e3.options.overviewRulerOptions.color, position: e3.options.overviewRulerOptions.position, startBufferLine: e3.marker.line, endBufferLine: e3.marker.line }), this._zonePool.push(this._zones[this._zones.length - 1]), this._zonePoolIndex++;
            }
          }
          setPadding(e3) {
            this._linePadding = e3;
          }
          _lineIntersectsZone(e3, t3) {
            return t3 >= e3.startBufferLine && t3 <= e3.endBufferLine;
          }
          _lineAdjacentToZone(e3, t3, i2) {
            return t3 >= e3.startBufferLine - this._linePadding[i2 || "full"] && t3 <= e3.endBufferLine + this._linePadding[i2 || "full"];
          }
          _addLineToZone(e3, t3) {
            e3.startBufferLine = Math.min(e3.startBufferLine, t3), e3.endBufferLine = Math.max(e3.endBufferLine, t3);
          }
        };
      }, 5744: function(e2, t2, i2) {
        var s2 = this && this.__decorate || function(e3, t3, i3, s3) {
          var r2, n2 = arguments.length, o2 = n2 < 3 ? t3 : null === s3 ? s3 = Object.getOwnPropertyDescriptor(t3, i3) : s3;
          if ("object" == typeof Reflect && "function" == typeof Reflect.decorate) o2 = Reflect.decorate(e3, t3, i3, s3);
          else for (var a2 = e3.length - 1; a2 >= 0; a2--) (r2 = e3[a2]) && (o2 = (n2 < 3 ? r2(o2) : n2 > 3 ? r2(t3, i3, o2) : r2(t3, i3)) || o2);
          return n2 > 3 && o2 && Object.defineProperty(t3, i3, o2), o2;
        }, r = this && this.__param || function(e3, t3) {
          return function(i3, s3) {
            t3(i3, s3, e3);
          };
        };
        Object.defineProperty(t2, "__esModule", { value: true }), t2.OverviewRulerRenderer = void 0;
        const n = i2(5871), o = i2(4725), a = i2(844), h = i2(2585), c = { full: 0, left: 0, center: 0, right: 0 }, l = { full: 0, left: 0, center: 0, right: 0 }, d = { full: 0, left: 0, center: 0, right: 0 };
        let _ = t2.OverviewRulerRenderer = class extends a.Disposable {
          get _width() {
            return this._optionsService.options.overviewRulerWidth || 0;
          }
          constructor(e3, t3, i3, s3, r2, o2, h2) {
            var _a2;
            super(), this._viewportElement = e3, this._screenElement = t3, this._bufferService = i3, this._decorationService = s3, this._renderService = r2, this._optionsService = o2, this._coreBrowserService = h2, this._colorZoneStore = new n.ColorZoneStore(), this._shouldUpdateDimensions = true, this._shouldUpdateAnchor = true, this._lastKnownBufferLength = 0, this._canvas = this._coreBrowserService.mainDocument.createElement("canvas"), this._canvas.classList.add("xterm-decoration-overview-ruler"), this._refreshCanvasDimensions(), (_a2 = this._viewportElement.parentElement) == null ? void 0 : _a2.insertBefore(this._canvas, this._viewportElement);
            const c2 = this._canvas.getContext("2d");
            if (!c2) throw new Error("Ctx cannot be null");
            this._ctx = c2, this._registerDecorationListeners(), this._registerBufferChangeListeners(), this._registerDimensionChangeListeners(), this.register((0, a.toDisposable)(() => {
              var _a3;
              (_a3 = this._canvas) == null ? void 0 : _a3.remove();
            }));
          }
          _registerDecorationListeners() {
            this.register(this._decorationService.onDecorationRegistered(() => this._queueRefresh(void 0, true))), this.register(this._decorationService.onDecorationRemoved(() => this._queueRefresh(void 0, true)));
          }
          _registerBufferChangeListeners() {
            this.register(this._renderService.onRenderedViewportChange(() => this._queueRefresh())), this.register(this._bufferService.buffers.onBufferActivate(() => {
              this._canvas.style.display = this._bufferService.buffer === this._bufferService.buffers.alt ? "none" : "block";
            })), this.register(this._bufferService.onScroll(() => {
              this._lastKnownBufferLength !== this._bufferService.buffers.normal.lines.length && (this._refreshDrawHeightConstants(), this._refreshColorZonePadding());
            }));
          }
          _registerDimensionChangeListeners() {
            this.register(this._renderService.onRender(() => {
              this._containerHeight && this._containerHeight === this._screenElement.clientHeight || (this._queueRefresh(true), this._containerHeight = this._screenElement.clientHeight);
            })), this.register(this._optionsService.onSpecificOptionChange("overviewRulerWidth", () => this._queueRefresh(true))), this.register(this._coreBrowserService.onDprChange(() => this._queueRefresh(true))), this._queueRefresh(true);
          }
          _refreshDrawConstants() {
            const e3 = Math.floor(this._canvas.width / 3), t3 = Math.ceil(this._canvas.width / 3);
            l.full = this._canvas.width, l.left = e3, l.center = t3, l.right = e3, this._refreshDrawHeightConstants(), d.full = 0, d.left = 0, d.center = l.left, d.right = l.left + l.center;
          }
          _refreshDrawHeightConstants() {
            c.full = Math.round(2 * this._coreBrowserService.dpr);
            const e3 = this._canvas.height / this._bufferService.buffer.lines.length, t3 = Math.round(Math.max(Math.min(e3, 12), 6) * this._coreBrowserService.dpr);
            c.left = t3, c.center = t3, c.right = t3;
          }
          _refreshColorZonePadding() {
            this._colorZoneStore.setPadding({ full: Math.floor(this._bufferService.buffers.active.lines.length / (this._canvas.height - 1) * c.full), left: Math.floor(this._bufferService.buffers.active.lines.length / (this._canvas.height - 1) * c.left), center: Math.floor(this._bufferService.buffers.active.lines.length / (this._canvas.height - 1) * c.center), right: Math.floor(this._bufferService.buffers.active.lines.length / (this._canvas.height - 1) * c.right) }), this._lastKnownBufferLength = this._bufferService.buffers.normal.lines.length;
          }
          _refreshCanvasDimensions() {
            this._canvas.style.width = `${this._width}px`, this._canvas.width = Math.round(this._width * this._coreBrowserService.dpr), this._canvas.style.height = `${this._screenElement.clientHeight}px`, this._canvas.height = Math.round(this._screenElement.clientHeight * this._coreBrowserService.dpr), this._refreshDrawConstants(), this._refreshColorZonePadding();
          }
          _refreshDecorations() {
            this._shouldUpdateDimensions && this._refreshCanvasDimensions(), this._ctx.clearRect(0, 0, this._canvas.width, this._canvas.height), this._colorZoneStore.clear();
            for (const e4 of this._decorationService.decorations) this._colorZoneStore.addDecoration(e4);
            this._ctx.lineWidth = 1;
            const e3 = this._colorZoneStore.zones;
            for (const t3 of e3) "full" !== t3.position && this._renderColorZone(t3);
            for (const t3 of e3) "full" === t3.position && this._renderColorZone(t3);
            this._shouldUpdateDimensions = false, this._shouldUpdateAnchor = false;
          }
          _renderColorZone(e3) {
            this._ctx.fillStyle = e3.color, this._ctx.fillRect(d[e3.position || "full"], Math.round((this._canvas.height - 1) * (e3.startBufferLine / this._bufferService.buffers.active.lines.length) - c[e3.position || "full"] / 2), l[e3.position || "full"], Math.round((this._canvas.height - 1) * ((e3.endBufferLine - e3.startBufferLine) / this._bufferService.buffers.active.lines.length) + c[e3.position || "full"]));
          }
          _queueRefresh(e3, t3) {
            this._shouldUpdateDimensions = e3 || this._shouldUpdateDimensions, this._shouldUpdateAnchor = t3 || this._shouldUpdateAnchor, void 0 === this._animationFrame && (this._animationFrame = this._coreBrowserService.window.requestAnimationFrame(() => {
              this._refreshDecorations(), this._animationFrame = void 0;
            }));
          }
        };
        t2.OverviewRulerRenderer = _ = s2([r(2, h.IBufferService), r(3, h.IDecorationService), r(4, o.IRenderService), r(5, h.IOptionsService), r(6, o.ICoreBrowserService)], _);
      }, 2950: function(e2, t2, i2) {
        var s2 = this && this.__decorate || function(e3, t3, i3, s3) {
          var r2, n2 = arguments.length, o2 = n2 < 3 ? t3 : null === s3 ? s3 = Object.getOwnPropertyDescriptor(t3, i3) : s3;
          if ("object" == typeof Reflect && "function" == typeof Reflect.decorate) o2 = Reflect.decorate(e3, t3, i3, s3);
          else for (var a2 = e3.length - 1; a2 >= 0; a2--) (r2 = e3[a2]) && (o2 = (n2 < 3 ? r2(o2) : n2 > 3 ? r2(t3, i3, o2) : r2(t3, i3)) || o2);
          return n2 > 3 && o2 && Object.defineProperty(t3, i3, o2), o2;
        }, r = this && this.__param || function(e3, t3) {
          return function(i3, s3) {
            t3(i3, s3, e3);
          };
        };
        Object.defineProperty(t2, "__esModule", { value: true }), t2.CompositionHelper = void 0;
        const n = i2(4725), o = i2(2585), a = i2(2584);
        let h = t2.CompositionHelper = class {
          get isComposing() {
            return this._isComposing;
          }
          constructor(e3, t3, i3, s3, r2, n2) {
            this._textarea = e3, this._compositionView = t3, this._bufferService = i3, this._optionsService = s3, this._coreService = r2, this._renderService = n2, this._isComposing = false, this._isSendingComposition = false, this._compositionPosition = { start: 0, end: 0 }, this._dataAlreadySent = "";
          }
          compositionstart() {
            this._isComposing = true, this._compositionPosition.start = this._textarea.value.length, this._compositionView.textContent = "", this._dataAlreadySent = "", this._compositionView.classList.add("active");
          }
          compositionupdate(e3) {
            this._compositionView.textContent = e3.data, this.updateCompositionElements(), setTimeout(() => {
              this._compositionPosition.end = this._textarea.value.length;
            }, 0);
          }
          compositionend() {
            this._finalizeComposition(true);
          }
          keydown(e3) {
            if (this._isComposing || this._isSendingComposition) {
              if (229 === e3.keyCode) return false;
              if (16 === e3.keyCode || 17 === e3.keyCode || 18 === e3.keyCode) return false;
              this._finalizeComposition(false);
            }
            return 229 !== e3.keyCode || (this._handleAnyTextareaChanges(), false);
          }
          _finalizeComposition(e3) {
            if (this._compositionView.classList.remove("active"), this._isComposing = false, e3) {
              const e4 = { start: this._compositionPosition.start, end: this._compositionPosition.end };
              this._isSendingComposition = true, setTimeout(() => {
                if (this._isSendingComposition) {
                  let t3;
                  this._isSendingComposition = false, e4.start += this._dataAlreadySent.length, t3 = this._isComposing ? this._textarea.value.substring(e4.start, e4.end) : this._textarea.value.substring(e4.start), t3.length > 0 && this._coreService.triggerDataEvent(t3, true);
                }
              }, 0);
            } else {
              this._isSendingComposition = false;
              const e4 = this._textarea.value.substring(this._compositionPosition.start, this._compositionPosition.end);
              this._coreService.triggerDataEvent(e4, true);
            }
          }
          _handleAnyTextareaChanges() {
            const e3 = this._textarea.value;
            setTimeout(() => {
              if (!this._isComposing) {
                const t3 = this._textarea.value, i3 = t3.replace(e3, "");
                this._dataAlreadySent = i3, t3.length > e3.length ? this._coreService.triggerDataEvent(i3, true) : t3.length < e3.length ? this._coreService.triggerDataEvent(`${a.C0.DEL}`, true) : t3.length === e3.length && t3 !== e3 && this._coreService.triggerDataEvent(t3, true);
              }
            }, 0);
          }
          updateCompositionElements(e3) {
            if (this._isComposing) {
              if (this._bufferService.buffer.isCursorInViewport) {
                const e4 = Math.min(this._bufferService.buffer.x, this._bufferService.cols - 1), t3 = this._renderService.dimensions.css.cell.height, i3 = this._bufferService.buffer.y * this._renderService.dimensions.css.cell.height, s3 = e4 * this._renderService.dimensions.css.cell.width;
                this._compositionView.style.left = s3 + "px", this._compositionView.style.top = i3 + "px", this._compositionView.style.height = t3 + "px", this._compositionView.style.lineHeight = t3 + "px", this._compositionView.style.fontFamily = this._optionsService.rawOptions.fontFamily, this._compositionView.style.fontSize = this._optionsService.rawOptions.fontSize + "px";
                const r2 = this._compositionView.getBoundingClientRect();
                this._textarea.style.left = s3 + "px", this._textarea.style.top = i3 + "px", this._textarea.style.width = Math.max(r2.width, 1) + "px", this._textarea.style.height = Math.max(r2.height, 1) + "px", this._textarea.style.lineHeight = r2.height + "px";
              }
              e3 || setTimeout(() => this.updateCompositionElements(true), 0);
            }
          }
        };
        t2.CompositionHelper = h = s2([r(2, o.IBufferService), r(3, o.IOptionsService), r(4, o.ICoreService), r(5, n.IRenderService)], h);
      }, 9806: (e2, t2) => {
        function i2(e3, t3, i3) {
          const s2 = i3.getBoundingClientRect(), r = e3.getComputedStyle(i3), n = parseInt(r.getPropertyValue("padding-left")), o = parseInt(r.getPropertyValue("padding-top"));
          return [t3.clientX - s2.left - n, t3.clientY - s2.top - o];
        }
        Object.defineProperty(t2, "__esModule", { value: true }), t2.getCoords = t2.getCoordsRelativeToElement = void 0, t2.getCoordsRelativeToElement = i2, t2.getCoords = function(e3, t3, s2, r, n, o, a, h, c) {
          if (!o) return;
          const l = i2(e3, t3, s2);
          return l ? (l[0] = Math.ceil((l[0] + (c ? a / 2 : 0)) / a), l[1] = Math.ceil(l[1] / h), l[0] = Math.min(Math.max(l[0], 1), r + (c ? 1 : 0)), l[1] = Math.min(Math.max(l[1], 1), n), l) : void 0;
        };
      }, 9504: (e2, t2, i2) => {
        Object.defineProperty(t2, "__esModule", { value: true }), t2.moveToCellSequence = void 0;
        const s2 = i2(2584);
        function r(e3, t3, i3, s3) {
          const r2 = e3 - n(e3, i3), a2 = t3 - n(t3, i3), l = Math.abs(r2 - a2) - function(e4, t4, i4) {
            let s4 = 0;
            const r3 = e4 - n(e4, i4), a3 = t4 - n(t4, i4);
            for (let n2 = 0; n2 < Math.abs(r3 - a3); n2++) {
              const a4 = "A" === o(e4, t4) ? -1 : 1, h2 = i4.buffer.lines.get(r3 + a4 * n2);
              (h2 == null ? void 0 : h2.isWrapped) && s4++;
            }
            return s4;
          }(e3, t3, i3);
          return c(l, h(o(e3, t3), s3));
        }
        function n(e3, t3) {
          let i3 = 0, s3 = t3.buffer.lines.get(e3), r2 = s3 == null ? void 0 : s3.isWrapped;
          for (; r2 && e3 >= 0 && e3 < t3.rows; ) i3++, s3 = t3.buffer.lines.get(--e3), r2 = s3 == null ? void 0 : s3.isWrapped;
          return i3;
        }
        function o(e3, t3) {
          return e3 > t3 ? "A" : "B";
        }
        function a(e3, t3, i3, s3, r2, n2) {
          let o2 = e3, a2 = t3, h2 = "";
          for (; o2 !== i3 || a2 !== s3; ) o2 += r2 ? 1 : -1, r2 && o2 > n2.cols - 1 ? (h2 += n2.buffer.translateBufferLineToString(a2, false, e3, o2), o2 = 0, e3 = 0, a2++) : !r2 && o2 < 0 && (h2 += n2.buffer.translateBufferLineToString(a2, false, 0, e3 + 1), o2 = n2.cols - 1, e3 = o2, a2--);
          return h2 + n2.buffer.translateBufferLineToString(a2, false, e3, o2);
        }
        function h(e3, t3) {
          const i3 = t3 ? "O" : "[";
          return s2.C0.ESC + i3 + e3;
        }
        function c(e3, t3) {
          e3 = Math.floor(e3);
          let i3 = "";
          for (let s3 = 0; s3 < e3; s3++) i3 += t3;
          return i3;
        }
        t2.moveToCellSequence = function(e3, t3, i3, s3) {
          const o2 = i3.buffer.x, l = i3.buffer.y;
          if (!i3.buffer.hasScrollback) return function(e4, t4, i4, s4, o3, l2) {
            return 0 === r(t4, s4, o3, l2).length ? "" : c(a(e4, t4, e4, t4 - n(t4, o3), false, o3).length, h("D", l2));
          }(o2, l, 0, t3, i3, s3) + r(l, t3, i3, s3) + function(e4, t4, i4, s4, o3, l2) {
            let d2;
            d2 = r(t4, s4, o3, l2).length > 0 ? s4 - n(s4, o3) : t4;
            const _2 = s4, u = function(e5, t5, i5, s5, o4, a2) {
              let h2;
              return h2 = r(i5, s5, o4, a2).length > 0 ? s5 - n(s5, o4) : t5, e5 < i5 && h2 <= s5 || e5 >= i5 && h2 < s5 ? "C" : "D";
            }(e4, t4, i4, s4, o3, l2);
            return c(a(e4, d2, i4, _2, "C" === u, o3).length, h(u, l2));
          }(o2, l, e3, t3, i3, s3);
          let d;
          if (l === t3) return d = o2 > e3 ? "D" : "C", c(Math.abs(o2 - e3), h(d, s3));
          d = l > t3 ? "D" : "C";
          const _ = Math.abs(l - t3);
          return c(function(e4, t4) {
            return t4.cols - e4;
          }(l > t3 ? e3 : o2, i3) + (_ - 1) * i3.cols + 1 + ((l > t3 ? o2 : e3) - 1), h(d, s3));
        };
      }, 1296: function(e2, t2, i2) {
        var s2 = this && this.__decorate || function(e3, t3, i3, s3) {
          var r2, n2 = arguments.length, o2 = n2 < 3 ? t3 : null === s3 ? s3 = Object.getOwnPropertyDescriptor(t3, i3) : s3;
          if ("object" == typeof Reflect && "function" == typeof Reflect.decorate) o2 = Reflect.decorate(e3, t3, i3, s3);
          else for (var a2 = e3.length - 1; a2 >= 0; a2--) (r2 = e3[a2]) && (o2 = (n2 < 3 ? r2(o2) : n2 > 3 ? r2(t3, i3, o2) : r2(t3, i3)) || o2);
          return n2 > 3 && o2 && Object.defineProperty(t3, i3, o2), o2;
        }, r = this && this.__param || function(e3, t3) {
          return function(i3, s3) {
            t3(i3, s3, e3);
          };
        };
        Object.defineProperty(t2, "__esModule", { value: true }), t2.DomRenderer = void 0;
        const n = i2(3787), o = i2(2550), a = i2(2223), h = i2(6171), c = i2(6052), l = i2(4725), d = i2(8055), _ = i2(8460), u = i2(844), f = i2(2585), v = "xterm-dom-renderer-owner-", p = "xterm-rows", g = "xterm-fg-", m = "xterm-bg-", S = "xterm-focus", C = "xterm-selection";
        let b = 1, w = t2.DomRenderer = class extends u.Disposable {
          constructor(e3, t3, i3, s3, r2, a2, l2, d2, f2, g2, m2, S2, w2) {
            super(), this._terminal = e3, this._document = t3, this._element = i3, this._screenElement = s3, this._viewportElement = r2, this._helperContainer = a2, this._linkifier2 = l2, this._charSizeService = f2, this._optionsService = g2, this._bufferService = m2, this._coreBrowserService = S2, this._themeService = w2, this._terminalClass = b++, this._rowElements = [], this._selectionRenderModel = (0, c.createSelectionRenderModel)(), this.onRequestRedraw = this.register(new _.EventEmitter()).event, this._rowContainer = this._document.createElement("div"), this._rowContainer.classList.add(p), this._rowContainer.style.lineHeight = "normal", this._rowContainer.setAttribute("aria-hidden", "true"), this._refreshRowElements(this._bufferService.cols, this._bufferService.rows), this._selectionContainer = this._document.createElement("div"), this._selectionContainer.classList.add(C), this._selectionContainer.setAttribute("aria-hidden", "true"), this.dimensions = (0, h.createRenderDimensions)(), this._updateDimensions(), this.register(this._optionsService.onOptionChange(() => this._handleOptionsChanged())), this.register(this._themeService.onChangeColors((e4) => this._injectCss(e4))), this._injectCss(this._themeService.colors), this._rowFactory = d2.createInstance(n.DomRendererRowFactory, document), this._element.classList.add(v + this._terminalClass), this._screenElement.appendChild(this._rowContainer), this._screenElement.appendChild(this._selectionContainer), this.register(this._linkifier2.onShowLinkUnderline((e4) => this._handleLinkHover(e4))), this.register(this._linkifier2.onHideLinkUnderline((e4) => this._handleLinkLeave(e4))), this.register((0, u.toDisposable)(() => {
              this._element.classList.remove(v + this._terminalClass), this._rowContainer.remove(), this._selectionContainer.remove(), this._widthCache.dispose(), this._themeStyleElement.remove(), this._dimensionsStyleElement.remove();
            })), this._widthCache = new o.WidthCache(this._document, this._helperContainer), this._widthCache.setFont(this._optionsService.rawOptions.fontFamily, this._optionsService.rawOptions.fontSize, this._optionsService.rawOptions.fontWeight, this._optionsService.rawOptions.fontWeightBold), this._setDefaultSpacing();
          }
          _updateDimensions() {
            const e3 = this._coreBrowserService.dpr;
            this.dimensions.device.char.width = this._charSizeService.width * e3, this.dimensions.device.char.height = Math.ceil(this._charSizeService.height * e3), this.dimensions.device.cell.width = this.dimensions.device.char.width + Math.round(this._optionsService.rawOptions.letterSpacing), this.dimensions.device.cell.height = Math.floor(this.dimensions.device.char.height * this._optionsService.rawOptions.lineHeight), this.dimensions.device.char.left = 0, this.dimensions.device.char.top = 0, this.dimensions.device.canvas.width = this.dimensions.device.cell.width * this._bufferService.cols, this.dimensions.device.canvas.height = this.dimensions.device.cell.height * this._bufferService.rows, this.dimensions.css.canvas.width = Math.round(this.dimensions.device.canvas.width / e3), this.dimensions.css.canvas.height = Math.round(this.dimensions.device.canvas.height / e3), this.dimensions.css.cell.width = this.dimensions.css.canvas.width / this._bufferService.cols, this.dimensions.css.cell.height = this.dimensions.css.canvas.height / this._bufferService.rows;
            for (const e4 of this._rowElements) e4.style.width = `${this.dimensions.css.canvas.width}px`, e4.style.height = `${this.dimensions.css.cell.height}px`, e4.style.lineHeight = `${this.dimensions.css.cell.height}px`, e4.style.overflow = "hidden";
            this._dimensionsStyleElement || (this._dimensionsStyleElement = this._document.createElement("style"), this._screenElement.appendChild(this._dimensionsStyleElement));
            const t3 = `${this._terminalSelector} .${p} span { display: inline-block; height: 100%; vertical-align: top;}`;
            this._dimensionsStyleElement.textContent = t3, this._selectionContainer.style.height = this._viewportElement.style.height, this._screenElement.style.width = `${this.dimensions.css.canvas.width}px`, this._screenElement.style.height = `${this.dimensions.css.canvas.height}px`;
          }
          _injectCss(e3) {
            this._themeStyleElement || (this._themeStyleElement = this._document.createElement("style"), this._screenElement.appendChild(this._themeStyleElement));
            let t3 = `${this._terminalSelector} .${p} { color: ${e3.foreground.css}; font-family: ${this._optionsService.rawOptions.fontFamily}; font-size: ${this._optionsService.rawOptions.fontSize}px; font-kerning: none; white-space: pre}`;
            t3 += `${this._terminalSelector} .${p} .xterm-dim { color: ${d.color.multiplyOpacity(e3.foreground, 0.5).css};}`, t3 += `${this._terminalSelector} span:not(.xterm-bold) { font-weight: ${this._optionsService.rawOptions.fontWeight};}${this._terminalSelector} span.xterm-bold { font-weight: ${this._optionsService.rawOptions.fontWeightBold};}${this._terminalSelector} span.xterm-italic { font-style: italic;}`;
            const i3 = `blink_underline_${this._terminalClass}`, s3 = `blink_bar_${this._terminalClass}`, r2 = `blink_block_${this._terminalClass}`;
            t3 += `@keyframes ${i3} { 50% {  border-bottom-style: hidden; }}`, t3 += `@keyframes ${s3} { 50% {  box-shadow: none; }}`, t3 += `@keyframes ${r2} { 0% {  background-color: ${e3.cursor.css};  color: ${e3.cursorAccent.css}; } 50% {  background-color: inherit;  color: ${e3.cursor.css}; }}`, t3 += `${this._terminalSelector} .${p}.${S} .xterm-cursor.xterm-cursor-blink.xterm-cursor-underline { animation: ${i3} 1s step-end infinite;}${this._terminalSelector} .${p}.${S} .xterm-cursor.xterm-cursor-blink.xterm-cursor-bar { animation: ${s3} 1s step-end infinite;}${this._terminalSelector} .${p}.${S} .xterm-cursor.xterm-cursor-blink.xterm-cursor-block { animation: ${r2} 1s step-end infinite;}${this._terminalSelector} .${p} .xterm-cursor.xterm-cursor-block { background-color: ${e3.cursor.css}; color: ${e3.cursorAccent.css};}${this._terminalSelector} .${p} .xterm-cursor.xterm-cursor-block:not(.xterm-cursor-blink) { background-color: ${e3.cursor.css} !important; color: ${e3.cursorAccent.css} !important;}${this._terminalSelector} .${p} .xterm-cursor.xterm-cursor-outline { outline: 1px solid ${e3.cursor.css}; outline-offset: -1px;}${this._terminalSelector} .${p} .xterm-cursor.xterm-cursor-bar { box-shadow: ${this._optionsService.rawOptions.cursorWidth}px 0 0 ${e3.cursor.css} inset;}${this._terminalSelector} .${p} .xterm-cursor.xterm-cursor-underline { border-bottom: 1px ${e3.cursor.css}; border-bottom-style: solid; height: calc(100% - 1px);}`, t3 += `${this._terminalSelector} .${C} { position: absolute; top: 0; left: 0; z-index: 1; pointer-events: none;}${this._terminalSelector}.focus .${C} div { position: absolute; background-color: ${e3.selectionBackgroundOpaque.css};}${this._terminalSelector} .${C} div { position: absolute; background-color: ${e3.selectionInactiveBackgroundOpaque.css};}`;
            for (const [i4, s4] of e3.ansi.entries()) t3 += `${this._terminalSelector} .${g}${i4} { color: ${s4.css}; }${this._terminalSelector} .${g}${i4}.xterm-dim { color: ${d.color.multiplyOpacity(s4, 0.5).css}; }${this._terminalSelector} .${m}${i4} { background-color: ${s4.css}; }`;
            t3 += `${this._terminalSelector} .${g}${a.INVERTED_DEFAULT_COLOR} { color: ${d.color.opaque(e3.background).css}; }${this._terminalSelector} .${g}${a.INVERTED_DEFAULT_COLOR}.xterm-dim { color: ${d.color.multiplyOpacity(d.color.opaque(e3.background), 0.5).css}; }${this._terminalSelector} .${m}${a.INVERTED_DEFAULT_COLOR} { background-color: ${e3.foreground.css}; }`, this._themeStyleElement.textContent = t3;
          }
          _setDefaultSpacing() {
            const e3 = this.dimensions.css.cell.width - this._widthCache.get("W", false, false);
            this._rowContainer.style.letterSpacing = `${e3}px`, this._rowFactory.defaultSpacing = e3;
          }
          handleDevicePixelRatioChange() {
            this._updateDimensions(), this._widthCache.clear(), this._setDefaultSpacing();
          }
          _refreshRowElements(e3, t3) {
            for (let e4 = this._rowElements.length; e4 <= t3; e4++) {
              const e5 = this._document.createElement("div");
              this._rowContainer.appendChild(e5), this._rowElements.push(e5);
            }
            for (; this._rowElements.length > t3; ) this._rowContainer.removeChild(this._rowElements.pop());
          }
          handleResize(e3, t3) {
            this._refreshRowElements(e3, t3), this._updateDimensions(), this.handleSelectionChanged(this._selectionRenderModel.selectionStart, this._selectionRenderModel.selectionEnd, this._selectionRenderModel.columnSelectMode);
          }
          handleCharSizeChanged() {
            this._updateDimensions(), this._widthCache.clear(), this._setDefaultSpacing();
          }
          handleBlur() {
            this._rowContainer.classList.remove(S), this.renderRows(0, this._bufferService.rows - 1);
          }
          handleFocus() {
            this._rowContainer.classList.add(S), this.renderRows(this._bufferService.buffer.y, this._bufferService.buffer.y);
          }
          handleSelectionChanged(e3, t3, i3) {
            if (this._selectionContainer.replaceChildren(), this._rowFactory.handleSelectionChanged(e3, t3, i3), this.renderRows(0, this._bufferService.rows - 1), !e3 || !t3) return;
            this._selectionRenderModel.update(this._terminal, e3, t3, i3);
            const s3 = this._selectionRenderModel.viewportStartRow, r2 = this._selectionRenderModel.viewportEndRow, n2 = this._selectionRenderModel.viewportCappedStartRow, o2 = this._selectionRenderModel.viewportCappedEndRow;
            if (n2 >= this._bufferService.rows || o2 < 0) return;
            const a2 = this._document.createDocumentFragment();
            if (i3) {
              const i4 = e3[0] > t3[0];
              a2.appendChild(this._createSelectionElement(n2, i4 ? t3[0] : e3[0], i4 ? e3[0] : t3[0], o2 - n2 + 1));
            } else {
              const i4 = s3 === n2 ? e3[0] : 0, h2 = n2 === r2 ? t3[0] : this._bufferService.cols;
              a2.appendChild(this._createSelectionElement(n2, i4, h2));
              const c2 = o2 - n2 - 1;
              if (a2.appendChild(this._createSelectionElement(n2 + 1, 0, this._bufferService.cols, c2)), n2 !== o2) {
                const e4 = r2 === o2 ? t3[0] : this._bufferService.cols;
                a2.appendChild(this._createSelectionElement(o2, 0, e4));
              }
            }
            this._selectionContainer.appendChild(a2);
          }
          _createSelectionElement(e3, t3, i3, s3 = 1) {
            const r2 = this._document.createElement("div"), n2 = t3 * this.dimensions.css.cell.width;
            let o2 = this.dimensions.css.cell.width * (i3 - t3);
            return n2 + o2 > this.dimensions.css.canvas.width && (o2 = this.dimensions.css.canvas.width - n2), r2.style.height = s3 * this.dimensions.css.cell.height + "px", r2.style.top = e3 * this.dimensions.css.cell.height + "px", r2.style.left = `${n2}px`, r2.style.width = `${o2}px`, r2;
          }
          handleCursorMove() {
          }
          _handleOptionsChanged() {
            this._updateDimensions(), this._injectCss(this._themeService.colors), this._widthCache.setFont(this._optionsService.rawOptions.fontFamily, this._optionsService.rawOptions.fontSize, this._optionsService.rawOptions.fontWeight, this._optionsService.rawOptions.fontWeightBold), this._setDefaultSpacing();
          }
          clear() {
            for (const e3 of this._rowElements) e3.replaceChildren();
          }
          renderRows(e3, t3) {
            const i3 = this._bufferService.buffer, s3 = i3.ybase + i3.y, r2 = Math.min(i3.x, this._bufferService.cols - 1), n2 = this._optionsService.rawOptions.cursorBlink, o2 = this._optionsService.rawOptions.cursorStyle, a2 = this._optionsService.rawOptions.cursorInactiveStyle;
            for (let h2 = e3; h2 <= t3; h2++) {
              const e4 = h2 + i3.ydisp, t4 = this._rowElements[h2], c2 = i3.lines.get(e4);
              if (!t4 || !c2) break;
              t4.replaceChildren(...this._rowFactory.createRow(c2, e4, e4 === s3, o2, a2, r2, n2, this.dimensions.css.cell.width, this._widthCache, -1, -1));
            }
          }
          get _terminalSelector() {
            return `.${v}${this._terminalClass}`;
          }
          _handleLinkHover(e3) {
            this._setCellUnderline(e3.x1, e3.x2, e3.y1, e3.y2, e3.cols, true);
          }
          _handleLinkLeave(e3) {
            this._setCellUnderline(e3.x1, e3.x2, e3.y1, e3.y2, e3.cols, false);
          }
          _setCellUnderline(e3, t3, i3, s3, r2, n2) {
            i3 < 0 && (e3 = 0), s3 < 0 && (t3 = 0);
            const o2 = this._bufferService.rows - 1;
            i3 = Math.max(Math.min(i3, o2), 0), s3 = Math.max(Math.min(s3, o2), 0), r2 = Math.min(r2, this._bufferService.cols);
            const a2 = this._bufferService.buffer, h2 = a2.ybase + a2.y, c2 = Math.min(a2.x, r2 - 1), l2 = this._optionsService.rawOptions.cursorBlink, d2 = this._optionsService.rawOptions.cursorStyle, _2 = this._optionsService.rawOptions.cursorInactiveStyle;
            for (let o3 = i3; o3 <= s3; ++o3) {
              const u2 = o3 + a2.ydisp, f2 = this._rowElements[o3], v2 = a2.lines.get(u2);
              if (!f2 || !v2) break;
              f2.replaceChildren(...this._rowFactory.createRow(v2, u2, u2 === h2, d2, _2, c2, l2, this.dimensions.css.cell.width, this._widthCache, n2 ? o3 === i3 ? e3 : 0 : -1, n2 ? (o3 === s3 ? t3 : r2) - 1 : -1));
            }
          }
        };
        t2.DomRenderer = w = s2([r(7, f.IInstantiationService), r(8, l.ICharSizeService), r(9, f.IOptionsService), r(10, f.IBufferService), r(11, l.ICoreBrowserService), r(12, l.IThemeService)], w);
      }, 3787: function(e2, t2, i2) {
        var s2 = this && this.__decorate || function(e3, t3, i3, s3) {
          var r2, n2 = arguments.length, o2 = n2 < 3 ? t3 : null === s3 ? s3 = Object.getOwnPropertyDescriptor(t3, i3) : s3;
          if ("object" == typeof Reflect && "function" == typeof Reflect.decorate) o2 = Reflect.decorate(e3, t3, i3, s3);
          else for (var a2 = e3.length - 1; a2 >= 0; a2--) (r2 = e3[a2]) && (o2 = (n2 < 3 ? r2(o2) : n2 > 3 ? r2(t3, i3, o2) : r2(t3, i3)) || o2);
          return n2 > 3 && o2 && Object.defineProperty(t3, i3, o2), o2;
        }, r = this && this.__param || function(e3, t3) {
          return function(i3, s3) {
            t3(i3, s3, e3);
          };
        };
        Object.defineProperty(t2, "__esModule", { value: true }), t2.DomRendererRowFactory = void 0;
        const n = i2(2223), o = i2(643), a = i2(511), h = i2(2585), c = i2(8055), l = i2(4725), d = i2(4269), _ = i2(6171), u = i2(3734);
        let f = t2.DomRendererRowFactory = class {
          constructor(e3, t3, i3, s3, r2, n2, o2) {
            this._document = e3, this._characterJoinerService = t3, this._optionsService = i3, this._coreBrowserService = s3, this._coreService = r2, this._decorationService = n2, this._themeService = o2, this._workCell = new a.CellData(), this._columnSelectMode = false, this.defaultSpacing = 0;
          }
          handleSelectionChanged(e3, t3, i3) {
            this._selectionStart = e3, this._selectionEnd = t3, this._columnSelectMode = i3;
          }
          createRow(e3, t3, i3, s3, r2, a2, h2, l2, _2, f2, p) {
            const g = [], m = this._characterJoinerService.getJoinedCharacters(t3), S = this._themeService.colors;
            let C, b = e3.getNoBgTrimmedLength();
            i3 && b < a2 + 1 && (b = a2 + 1);
            let w = 0, y = "", E = 0, k = 0, L = 0, D = false, R = 0, x = false, A = 0;
            const B = [], T = -1 !== f2 && -1 !== p;
            for (let M = 0; M < b; M++) {
              e3.loadCell(M, this._workCell);
              let b2 = this._workCell.getWidth();
              if (0 === b2) continue;
              let O = false, P = M, I = this._workCell;
              if (m.length > 0 && M === m[0][0]) {
                O = true;
                const t4 = m.shift();
                I = new d.JoinedCellData(this._workCell, e3.translateToString(true, t4[0], t4[1]), t4[1] - t4[0]), P = t4[1] - 1, b2 = I.getWidth();
              }
              const H = this._isCellInSelection(M, t3), F = i3 && M === a2, W = T && M >= f2 && M <= p;
              let U = false;
              this._decorationService.forEachDecorationAtCell(M, t3, void 0, (e4) => {
                U = true;
              });
              let N = I.getChars() || o.WHITESPACE_CELL_CHAR;
              if (" " === N && (I.isUnderline() || I.isOverline()) && (N = " "), A = b2 * l2 - _2.get(N, I.isBold(), I.isItalic()), C) {
                if (w && (H && x || !H && !x && I.bg === E) && (H && x && S.selectionForeground || I.fg === k) && I.extended.ext === L && W === D && A === R && !F && !O && !U) {
                  I.isInvisible() ? y += o.WHITESPACE_CELL_CHAR : y += N, w++;
                  continue;
                }
                w && (C.textContent = y), C = this._document.createElement("span"), w = 0, y = "";
              } else C = this._document.createElement("span");
              if (E = I.bg, k = I.fg, L = I.extended.ext, D = W, R = A, x = H, O && a2 >= M && a2 <= P && (a2 = M), !this._coreService.isCursorHidden && F && this._coreService.isCursorInitialized) {
                if (B.push("xterm-cursor"), this._coreBrowserService.isFocused) h2 && B.push("xterm-cursor-blink"), B.push("bar" === s3 ? "xterm-cursor-bar" : "underline" === s3 ? "xterm-cursor-underline" : "xterm-cursor-block");
                else if (r2) switch (r2) {
                  case "outline":
                    B.push("xterm-cursor-outline");
                    break;
                  case "block":
                    B.push("xterm-cursor-block");
                    break;
                  case "bar":
                    B.push("xterm-cursor-bar");
                    break;
                  case "underline":
                    B.push("xterm-cursor-underline");
                }
              }
              if (I.isBold() && B.push("xterm-bold"), I.isItalic() && B.push("xterm-italic"), I.isDim() && B.push("xterm-dim"), y = I.isInvisible() ? o.WHITESPACE_CELL_CHAR : I.getChars() || o.WHITESPACE_CELL_CHAR, I.isUnderline() && (B.push(`xterm-underline-${I.extended.underlineStyle}`), " " === y && (y = " "), !I.isUnderlineColorDefault())) if (I.isUnderlineColorRGB()) C.style.textDecorationColor = `rgb(${u.AttributeData.toColorRGB(I.getUnderlineColor()).join(",")})`;
              else {
                let e4 = I.getUnderlineColor();
                this._optionsService.rawOptions.drawBoldTextInBrightColors && I.isBold() && e4 < 8 && (e4 += 8), C.style.textDecorationColor = S.ansi[e4].css;
              }
              I.isOverline() && (B.push("xterm-overline"), " " === y && (y = " ")), I.isStrikethrough() && B.push("xterm-strikethrough"), W && (C.style.textDecoration = "underline");
              let $ = I.getFgColor(), j = I.getFgColorMode(), z = I.getBgColor(), K = I.getBgColorMode();
              const q = !!I.isInverse();
              if (q) {
                const e4 = $;
                $ = z, z = e4;
                const t4 = j;
                j = K, K = t4;
              }
              let V, G, X, J = false;
              switch (this._decorationService.forEachDecorationAtCell(M, t3, void 0, (e4) => {
                "top" !== e4.options.layer && J || (e4.backgroundColorRGB && (K = 50331648, z = e4.backgroundColorRGB.rgba >> 8 & 16777215, V = e4.backgroundColorRGB), e4.foregroundColorRGB && (j = 50331648, $ = e4.foregroundColorRGB.rgba >> 8 & 16777215, G = e4.foregroundColorRGB), J = "top" === e4.options.layer);
              }), !J && H && (V = this._coreBrowserService.isFocused ? S.selectionBackgroundOpaque : S.selectionInactiveBackgroundOpaque, z = V.rgba >> 8 & 16777215, K = 50331648, J = true, S.selectionForeground && (j = 50331648, $ = S.selectionForeground.rgba >> 8 & 16777215, G = S.selectionForeground)), J && B.push("xterm-decoration-top"), K) {
                case 16777216:
                case 33554432:
                  X = S.ansi[z], B.push(`xterm-bg-${z}`);
                  break;
                case 50331648:
                  X = c.channels.toColor(z >> 16, z >> 8 & 255, 255 & z), this._addStyle(C, `background-color:#${v((z >>> 0).toString(16), "0", 6)}`);
                  break;
                default:
                  q ? (X = S.foreground, B.push(`xterm-bg-${n.INVERTED_DEFAULT_COLOR}`)) : X = S.background;
              }
              switch (V || I.isDim() && (V = c.color.multiplyOpacity(X, 0.5)), j) {
                case 16777216:
                case 33554432:
                  I.isBold() && $ < 8 && this._optionsService.rawOptions.drawBoldTextInBrightColors && ($ += 8), this._applyMinimumContrast(C, X, S.ansi[$], I, V, void 0) || B.push(`xterm-fg-${$}`);
                  break;
                case 50331648:
                  const e4 = c.channels.toColor($ >> 16 & 255, $ >> 8 & 255, 255 & $);
                  this._applyMinimumContrast(C, X, e4, I, V, G) || this._addStyle(C, `color:#${v($.toString(16), "0", 6)}`);
                  break;
                default:
                  this._applyMinimumContrast(C, X, S.foreground, I, V, G) || q && B.push(`xterm-fg-${n.INVERTED_DEFAULT_COLOR}`);
              }
              B.length && (C.className = B.join(" "), B.length = 0), F || O || U ? C.textContent = y : w++, A !== this.defaultSpacing && (C.style.letterSpacing = `${A}px`), g.push(C), M = P;
            }
            return C && w && (C.textContent = y), g;
          }
          _applyMinimumContrast(e3, t3, i3, s3, r2, n2) {
            if (1 === this._optionsService.rawOptions.minimumContrastRatio || (0, _.treatGlyphAsBackgroundColor)(s3.getCode())) return false;
            const o2 = this._getContrastCache(s3);
            let a2;
            if (r2 || n2 || (a2 = o2.getColor(t3.rgba, i3.rgba)), void 0 === a2) {
              const e4 = this._optionsService.rawOptions.minimumContrastRatio / (s3.isDim() ? 2 : 1);
              a2 = c.color.ensureContrastRatio(r2 || t3, n2 || i3, e4), o2.setColor((r2 || t3).rgba, (n2 || i3).rgba, a2 ?? null);
            }
            return !!a2 && (this._addStyle(e3, `color:${a2.css}`), true);
          }
          _getContrastCache(e3) {
            return e3.isDim() ? this._themeService.colors.halfContrastCache : this._themeService.colors.contrastCache;
          }
          _addStyle(e3, t3) {
            e3.setAttribute("style", `${e3.getAttribute("style") || ""}${t3};`);
          }
          _isCellInSelection(e3, t3) {
            const i3 = this._selectionStart, s3 = this._selectionEnd;
            return !(!i3 || !s3) && (this._columnSelectMode ? i3[0] <= s3[0] ? e3 >= i3[0] && t3 >= i3[1] && e3 < s3[0] && t3 <= s3[1] : e3 < i3[0] && t3 >= i3[1] && e3 >= s3[0] && t3 <= s3[1] : t3 > i3[1] && t3 < s3[1] || i3[1] === s3[1] && t3 === i3[1] && e3 >= i3[0] && e3 < s3[0] || i3[1] < s3[1] && t3 === s3[1] && e3 < s3[0] || i3[1] < s3[1] && t3 === i3[1] && e3 >= i3[0]);
          }
        };
        function v(e3, t3, i3) {
          for (; e3.length < i3; ) e3 = t3 + e3;
          return e3;
        }
        t2.DomRendererRowFactory = f = s2([r(1, l.ICharacterJoinerService), r(2, h.IOptionsService), r(3, l.ICoreBrowserService), r(4, h.ICoreService), r(5, h.IDecorationService), r(6, l.IThemeService)], f);
      }, 2550: (e2, t2) => {
        Object.defineProperty(t2, "__esModule", { value: true }), t2.WidthCache = void 0, t2.WidthCache = class {
          constructor(e3, t3) {
            this._flat = new Float32Array(256), this._font = "", this._fontSize = 0, this._weight = "normal", this._weightBold = "bold", this._measureElements = [], this._container = e3.createElement("div"), this._container.classList.add("xterm-width-cache-measure-container"), this._container.setAttribute("aria-hidden", "true"), this._container.style.whiteSpace = "pre", this._container.style.fontKerning = "none";
            const i2 = e3.createElement("span");
            i2.classList.add("xterm-char-measure-element");
            const s2 = e3.createElement("span");
            s2.classList.add("xterm-char-measure-element"), s2.style.fontWeight = "bold";
            const r = e3.createElement("span");
            r.classList.add("xterm-char-measure-element"), r.style.fontStyle = "italic";
            const n = e3.createElement("span");
            n.classList.add("xterm-char-measure-element"), n.style.fontWeight = "bold", n.style.fontStyle = "italic", this._measureElements = [i2, s2, r, n], this._container.appendChild(i2), this._container.appendChild(s2), this._container.appendChild(r), this._container.appendChild(n), t3.appendChild(this._container), this.clear();
          }
          dispose() {
            this._container.remove(), this._measureElements.length = 0, this._holey = void 0;
          }
          clear() {
            this._flat.fill(-9999), this._holey = /* @__PURE__ */ new Map();
          }
          setFont(e3, t3, i2, s2) {
            e3 === this._font && t3 === this._fontSize && i2 === this._weight && s2 === this._weightBold || (this._font = e3, this._fontSize = t3, this._weight = i2, this._weightBold = s2, this._container.style.fontFamily = this._font, this._container.style.fontSize = `${this._fontSize}px`, this._measureElements[0].style.fontWeight = `${i2}`, this._measureElements[1].style.fontWeight = `${s2}`, this._measureElements[2].style.fontWeight = `${i2}`, this._measureElements[3].style.fontWeight = `${s2}`, this.clear());
          }
          get(e3, t3, i2) {
            let s2 = 0;
            if (!t3 && !i2 && 1 === e3.length && (s2 = e3.charCodeAt(0)) < 256) {
              if (-9999 !== this._flat[s2]) return this._flat[s2];
              const t4 = this._measure(e3, 0);
              return t4 > 0 && (this._flat[s2] = t4), t4;
            }
            let r = e3;
            t3 && (r += "B"), i2 && (r += "I");
            let n = this._holey.get(r);
            if (void 0 === n) {
              let s3 = 0;
              t3 && (s3 |= 1), i2 && (s3 |= 2), n = this._measure(e3, s3), n > 0 && this._holey.set(r, n);
            }
            return n;
          }
          _measure(e3, t3) {
            const i2 = this._measureElements[t3];
            return i2.textContent = e3.repeat(32), i2.offsetWidth / 32;
          }
        };
      }, 2223: (e2, t2, i2) => {
        Object.defineProperty(t2, "__esModule", { value: true }), t2.TEXT_BASELINE = t2.DIM_OPACITY = t2.INVERTED_DEFAULT_COLOR = void 0;
        const s2 = i2(6114);
        t2.INVERTED_DEFAULT_COLOR = 257, t2.DIM_OPACITY = 0.5, t2.TEXT_BASELINE = s2.isFirefox || s2.isLegacyEdge ? "bottom" : "ideographic";
      }, 6171: (e2, t2) => {
        function i2(e3) {
          return 57508 <= e3 && e3 <= 57558;
        }
        function s2(e3) {
          return e3 >= 128512 && e3 <= 128591 || e3 >= 127744 && e3 <= 128511 || e3 >= 128640 && e3 <= 128767 || e3 >= 9728 && e3 <= 9983 || e3 >= 9984 && e3 <= 10175 || e3 >= 65024 && e3 <= 65039 || e3 >= 129280 && e3 <= 129535 || e3 >= 127462 && e3 <= 127487;
        }
        Object.defineProperty(t2, "__esModule", { value: true }), t2.computeNextVariantOffset = t2.createRenderDimensions = t2.treatGlyphAsBackgroundColor = t2.allowRescaling = t2.isEmoji = t2.isRestrictedPowerlineGlyph = t2.isPowerlineGlyph = t2.throwIfFalsy = void 0, t2.throwIfFalsy = function(e3) {
          if (!e3) throw new Error("value must not be falsy");
          return e3;
        }, t2.isPowerlineGlyph = i2, t2.isRestrictedPowerlineGlyph = function(e3) {
          return 57520 <= e3 && e3 <= 57527;
        }, t2.isEmoji = s2, t2.allowRescaling = function(e3, t3, r, n) {
          return 1 === t3 && r > Math.ceil(1.5 * n) && void 0 !== e3 && e3 > 255 && !s2(e3) && !i2(e3) && !function(e4) {
            return 57344 <= e4 && e4 <= 63743;
          }(e3);
        }, t2.treatGlyphAsBackgroundColor = function(e3) {
          return i2(e3) || function(e4) {
            return 9472 <= e4 && e4 <= 9631;
          }(e3);
        }, t2.createRenderDimensions = function() {
          return { css: { canvas: { width: 0, height: 0 }, cell: { width: 0, height: 0 } }, device: { canvas: { width: 0, height: 0 }, cell: { width: 0, height: 0 }, char: { width: 0, height: 0, left: 0, top: 0 } } };
        }, t2.computeNextVariantOffset = function(e3, t3, i3 = 0) {
          return (e3 - (2 * Math.round(t3) - i3)) % (2 * Math.round(t3));
        };
      }, 6052: (e2, t2) => {
        Object.defineProperty(t2, "__esModule", { value: true }), t2.createSelectionRenderModel = void 0;
        class i2 {
          constructor() {
            this.clear();
          }
          clear() {
            this.hasSelection = false, this.columnSelectMode = false, this.viewportStartRow = 0, this.viewportEndRow = 0, this.viewportCappedStartRow = 0, this.viewportCappedEndRow = 0, this.startCol = 0, this.endCol = 0, this.selectionStart = void 0, this.selectionEnd = void 0;
          }
          update(e3, t3, i3, s2 = false) {
            if (this.selectionStart = t3, this.selectionEnd = i3, !t3 || !i3 || t3[0] === i3[0] && t3[1] === i3[1]) return void this.clear();
            const r = e3.buffers.active.ydisp, n = t3[1] - r, o = i3[1] - r, a = Math.max(n, 0), h = Math.min(o, e3.rows - 1);
            a >= e3.rows || h < 0 ? this.clear() : (this.hasSelection = true, this.columnSelectMode = s2, this.viewportStartRow = n, this.viewportEndRow = o, this.viewportCappedStartRow = a, this.viewportCappedEndRow = h, this.startCol = t3[0], this.endCol = i3[0]);
          }
          isCellSelected(e3, t3, i3) {
            return !!this.hasSelection && (i3 -= e3.buffer.active.viewportY, this.columnSelectMode ? this.startCol <= this.endCol ? t3 >= this.startCol && i3 >= this.viewportCappedStartRow && t3 < this.endCol && i3 <= this.viewportCappedEndRow : t3 < this.startCol && i3 >= this.viewportCappedStartRow && t3 >= this.endCol && i3 <= this.viewportCappedEndRow : i3 > this.viewportStartRow && i3 < this.viewportEndRow || this.viewportStartRow === this.viewportEndRow && i3 === this.viewportStartRow && t3 >= this.startCol && t3 < this.endCol || this.viewportStartRow < this.viewportEndRow && i3 === this.viewportEndRow && t3 < this.endCol || this.viewportStartRow < this.viewportEndRow && i3 === this.viewportStartRow && t3 >= this.startCol);
          }
        }
        t2.createSelectionRenderModel = function() {
          return new i2();
        };
      }, 456: (e2, t2) => {
        Object.defineProperty(t2, "__esModule", { value: true }), t2.SelectionModel = void 0, t2.SelectionModel = class {
          constructor(e3) {
            this._bufferService = e3, this.isSelectAllActive = false, this.selectionStartLength = 0;
          }
          clearSelection() {
            this.selectionStart = void 0, this.selectionEnd = void 0, this.isSelectAllActive = false, this.selectionStartLength = 0;
          }
          get finalSelectionStart() {
            return this.isSelectAllActive ? [0, 0] : this.selectionEnd && this.selectionStart && this.areSelectionValuesReversed() ? this.selectionEnd : this.selectionStart;
          }
          get finalSelectionEnd() {
            if (this.isSelectAllActive) return [this._bufferService.cols, this._bufferService.buffer.ybase + this._bufferService.rows - 1];
            if (this.selectionStart) {
              if (!this.selectionEnd || this.areSelectionValuesReversed()) {
                const e3 = this.selectionStart[0] + this.selectionStartLength;
                return e3 > this._bufferService.cols ? e3 % this._bufferService.cols == 0 ? [this._bufferService.cols, this.selectionStart[1] + Math.floor(e3 / this._bufferService.cols) - 1] : [e3 % this._bufferService.cols, this.selectionStart[1] + Math.floor(e3 / this._bufferService.cols)] : [e3, this.selectionStart[1]];
              }
              if (this.selectionStartLength && this.selectionEnd[1] === this.selectionStart[1]) {
                const e3 = this.selectionStart[0] + this.selectionStartLength;
                return e3 > this._bufferService.cols ? [e3 % this._bufferService.cols, this.selectionStart[1] + Math.floor(e3 / this._bufferService.cols)] : [Math.max(e3, this.selectionEnd[0]), this.selectionEnd[1]];
              }
              return this.selectionEnd;
            }
          }
          areSelectionValuesReversed() {
            const e3 = this.selectionStart, t3 = this.selectionEnd;
            return !(!e3 || !t3) && (e3[1] > t3[1] || e3[1] === t3[1] && e3[0] > t3[0]);
          }
          handleTrim(e3) {
            return this.selectionStart && (this.selectionStart[1] -= e3), this.selectionEnd && (this.selectionEnd[1] -= e3), this.selectionEnd && this.selectionEnd[1] < 0 ? (this.clearSelection(), true) : (this.selectionStart && this.selectionStart[1] < 0 && (this.selectionStart[1] = 0), false);
          }
        };
      }, 428: function(e2, t2, i2) {
        var s2 = this && this.__decorate || function(e3, t3, i3, s3) {
          var r2, n2 = arguments.length, o2 = n2 < 3 ? t3 : null === s3 ? s3 = Object.getOwnPropertyDescriptor(t3, i3) : s3;
          if ("object" == typeof Reflect && "function" == typeof Reflect.decorate) o2 = Reflect.decorate(e3, t3, i3, s3);
          else for (var a2 = e3.length - 1; a2 >= 0; a2--) (r2 = e3[a2]) && (o2 = (n2 < 3 ? r2(o2) : n2 > 3 ? r2(t3, i3, o2) : r2(t3, i3)) || o2);
          return n2 > 3 && o2 && Object.defineProperty(t3, i3, o2), o2;
        }, r = this && this.__param || function(e3, t3) {
          return function(i3, s3) {
            t3(i3, s3, e3);
          };
        };
        Object.defineProperty(t2, "__esModule", { value: true }), t2.CharSizeService = void 0;
        const n = i2(2585), o = i2(8460), a = i2(844);
        let h = t2.CharSizeService = class extends a.Disposable {
          get hasValidSize() {
            return this.width > 0 && this.height > 0;
          }
          constructor(e3, t3, i3) {
            super(), this._optionsService = i3, this.width = 0, this.height = 0, this._onCharSizeChange = this.register(new o.EventEmitter()), this.onCharSizeChange = this._onCharSizeChange.event;
            try {
              this._measureStrategy = this.register(new d(this._optionsService));
            } catch {
              this._measureStrategy = this.register(new l(e3, t3, this._optionsService));
            }
            this.register(this._optionsService.onMultipleOptionChange(["fontFamily", "fontSize"], () => this.measure()));
          }
          measure() {
            const e3 = this._measureStrategy.measure();
            e3.width === this.width && e3.height === this.height || (this.width = e3.width, this.height = e3.height, this._onCharSizeChange.fire());
          }
        };
        t2.CharSizeService = h = s2([r(2, n.IOptionsService)], h);
        class c extends a.Disposable {
          constructor() {
            super(...arguments), this._result = { width: 0, height: 0 };
          }
          _validateAndSet(e3, t3) {
            void 0 !== e3 && e3 > 0 && void 0 !== t3 && t3 > 0 && (this._result.width = e3, this._result.height = t3);
          }
        }
        class l extends c {
          constructor(e3, t3, i3) {
            super(), this._document = e3, this._parentElement = t3, this._optionsService = i3, this._measureElement = this._document.createElement("span"), this._measureElement.classList.add("xterm-char-measure-element"), this._measureElement.textContent = "W".repeat(32), this._measureElement.setAttribute("aria-hidden", "true"), this._measureElement.style.whiteSpace = "pre", this._measureElement.style.fontKerning = "none", this._parentElement.appendChild(this._measureElement);
          }
          measure() {
            return this._measureElement.style.fontFamily = this._optionsService.rawOptions.fontFamily, this._measureElement.style.fontSize = `${this._optionsService.rawOptions.fontSize}px`, this._validateAndSet(Number(this._measureElement.offsetWidth) / 32, Number(this._measureElement.offsetHeight)), this._result;
          }
        }
        class d extends c {
          constructor(e3) {
            super(), this._optionsService = e3, this._canvas = new OffscreenCanvas(100, 100), this._ctx = this._canvas.getContext("2d");
            const t3 = this._ctx.measureText("W");
            if (!("width" in t3 && "fontBoundingBoxAscent" in t3 && "fontBoundingBoxDescent" in t3)) throw new Error("Required font metrics not supported");
          }
          measure() {
            this._ctx.font = `${this._optionsService.rawOptions.fontSize}px ${this._optionsService.rawOptions.fontFamily}`;
            const e3 = this._ctx.measureText("W");
            return this._validateAndSet(e3.width, e3.fontBoundingBoxAscent + e3.fontBoundingBoxDescent), this._result;
          }
        }
      }, 4269: function(e2, t2, i2) {
        var s2 = this && this.__decorate || function(e3, t3, i3, s3) {
          var r2, n2 = arguments.length, o2 = n2 < 3 ? t3 : null === s3 ? s3 = Object.getOwnPropertyDescriptor(t3, i3) : s3;
          if ("object" == typeof Reflect && "function" == typeof Reflect.decorate) o2 = Reflect.decorate(e3, t3, i3, s3);
          else for (var a2 = e3.length - 1; a2 >= 0; a2--) (r2 = e3[a2]) && (o2 = (n2 < 3 ? r2(o2) : n2 > 3 ? r2(t3, i3, o2) : r2(t3, i3)) || o2);
          return n2 > 3 && o2 && Object.defineProperty(t3, i3, o2), o2;
        }, r = this && this.__param || function(e3, t3) {
          return function(i3, s3) {
            t3(i3, s3, e3);
          };
        };
        Object.defineProperty(t2, "__esModule", { value: true }), t2.CharacterJoinerService = t2.JoinedCellData = void 0;
        const n = i2(3734), o = i2(643), a = i2(511), h = i2(2585);
        class c extends n.AttributeData {
          constructor(e3, t3, i3) {
            super(), this.content = 0, this.combinedData = "", this.fg = e3.fg, this.bg = e3.bg, this.combinedData = t3, this._width = i3;
          }
          isCombined() {
            return 2097152;
          }
          getWidth() {
            return this._width;
          }
          getChars() {
            return this.combinedData;
          }
          getCode() {
            return 2097151;
          }
          setFromCharData(e3) {
            throw new Error("not implemented");
          }
          getAsCharData() {
            return [this.fg, this.getChars(), this.getWidth(), this.getCode()];
          }
        }
        t2.JoinedCellData = c;
        let l = t2.CharacterJoinerService = class e3 {
          constructor(e4) {
            this._bufferService = e4, this._characterJoiners = [], this._nextCharacterJoinerId = 0, this._workCell = new a.CellData();
          }
          register(e4) {
            const t3 = { id: this._nextCharacterJoinerId++, handler: e4 };
            return this._characterJoiners.push(t3), t3.id;
          }
          deregister(e4) {
            for (let t3 = 0; t3 < this._characterJoiners.length; t3++) if (this._characterJoiners[t3].id === e4) return this._characterJoiners.splice(t3, 1), true;
            return false;
          }
          getJoinedCharacters(e4) {
            if (0 === this._characterJoiners.length) return [];
            const t3 = this._bufferService.buffer.lines.get(e4);
            if (!t3 || 0 === t3.length) return [];
            const i3 = [], s3 = t3.translateToString(true);
            let r2 = 0, n2 = 0, a2 = 0, h2 = t3.getFg(0), c2 = t3.getBg(0);
            for (let e5 = 0; e5 < t3.getTrimmedLength(); e5++) if (t3.loadCell(e5, this._workCell), 0 !== this._workCell.getWidth()) {
              if (this._workCell.fg !== h2 || this._workCell.bg !== c2) {
                if (e5 - r2 > 1) {
                  const e6 = this._getJoinedRanges(s3, a2, n2, t3, r2);
                  for (let t4 = 0; t4 < e6.length; t4++) i3.push(e6[t4]);
                }
                r2 = e5, a2 = n2, h2 = this._workCell.fg, c2 = this._workCell.bg;
              }
              n2 += this._workCell.getChars().length || o.WHITESPACE_CELL_CHAR.length;
            }
            if (this._bufferService.cols - r2 > 1) {
              const e5 = this._getJoinedRanges(s3, a2, n2, t3, r2);
              for (let t4 = 0; t4 < e5.length; t4++) i3.push(e5[t4]);
            }
            return i3;
          }
          _getJoinedRanges(t3, i3, s3, r2, n2) {
            const o2 = t3.substring(i3, s3);
            let a2 = [];
            try {
              a2 = this._characterJoiners[0].handler(o2);
            } catch (e4) {
              console.error(e4);
            }
            for (let t4 = 1; t4 < this._characterJoiners.length; t4++) try {
              const i4 = this._characterJoiners[t4].handler(o2);
              for (let t5 = 0; t5 < i4.length; t5++) e3._mergeRanges(a2, i4[t5]);
            } catch (e4) {
              console.error(e4);
            }
            return this._stringRangesToCellRanges(a2, r2, n2), a2;
          }
          _stringRangesToCellRanges(e4, t3, i3) {
            let s3 = 0, r2 = false, n2 = 0, a2 = e4[s3];
            if (a2) {
              for (let h2 = i3; h2 < this._bufferService.cols; h2++) {
                const i4 = t3.getWidth(h2), c2 = t3.getString(h2).length || o.WHITESPACE_CELL_CHAR.length;
                if (0 !== i4) {
                  if (!r2 && a2[0] <= n2 && (a2[0] = h2, r2 = true), a2[1] <= n2) {
                    if (a2[1] = h2, a2 = e4[++s3], !a2) break;
                    a2[0] <= n2 ? (a2[0] = h2, r2 = true) : r2 = false;
                  }
                  n2 += c2;
                }
              }
              a2 && (a2[1] = this._bufferService.cols);
            }
          }
          static _mergeRanges(e4, t3) {
            let i3 = false;
            for (let s3 = 0; s3 < e4.length; s3++) {
              const r2 = e4[s3];
              if (i3) {
                if (t3[1] <= r2[0]) return e4[s3 - 1][1] = t3[1], e4;
                if (t3[1] <= r2[1]) return e4[s3 - 1][1] = Math.max(t3[1], r2[1]), e4.splice(s3, 1), e4;
                e4.splice(s3, 1), s3--;
              } else {
                if (t3[1] <= r2[0]) return e4.splice(s3, 0, t3), e4;
                if (t3[1] <= r2[1]) return r2[0] = Math.min(t3[0], r2[0]), e4;
                t3[0] < r2[1] && (r2[0] = Math.min(t3[0], r2[0]), i3 = true);
              }
            }
            return i3 ? e4[e4.length - 1][1] = t3[1] : e4.push(t3), e4;
          }
        };
        t2.CharacterJoinerService = l = s2([r(0, h.IBufferService)], l);
      }, 5114: (e2, t2, i2) => {
        Object.defineProperty(t2, "__esModule", { value: true }), t2.CoreBrowserService = void 0;
        const s2 = i2(844), r = i2(8460), n = i2(3656);
        class o extends s2.Disposable {
          constructor(e3, t3, i3) {
            super(), this._textarea = e3, this._window = t3, this.mainDocument = i3, this._isFocused = false, this._cachedIsFocused = void 0, this._screenDprMonitor = new a(this._window), this._onDprChange = this.register(new r.EventEmitter()), this.onDprChange = this._onDprChange.event, this._onWindowChange = this.register(new r.EventEmitter()), this.onWindowChange = this._onWindowChange.event, this.register(this.onWindowChange((e4) => this._screenDprMonitor.setWindow(e4))), this.register((0, r.forwardEvent)(this._screenDprMonitor.onDprChange, this._onDprChange)), this._textarea.addEventListener("focus", () => this._isFocused = true), this._textarea.addEventListener("blur", () => this._isFocused = false);
          }
          get window() {
            return this._window;
          }
          set window(e3) {
            this._window !== e3 && (this._window = e3, this._onWindowChange.fire(this._window));
          }
          get dpr() {
            return this.window.devicePixelRatio;
          }
          get isFocused() {
            return void 0 === this._cachedIsFocused && (this._cachedIsFocused = this._isFocused && this._textarea.ownerDocument.hasFocus(), queueMicrotask(() => this._cachedIsFocused = void 0)), this._cachedIsFocused;
          }
        }
        t2.CoreBrowserService = o;
        class a extends s2.Disposable {
          constructor(e3) {
            super(), this._parentWindow = e3, this._windowResizeListener = this.register(new s2.MutableDisposable()), this._onDprChange = this.register(new r.EventEmitter()), this.onDprChange = this._onDprChange.event, this._outerListener = () => this._setDprAndFireIfDiffers(), this._currentDevicePixelRatio = this._parentWindow.devicePixelRatio, this._updateDpr(), this._setWindowResizeListener(), this.register((0, s2.toDisposable)(() => this.clearListener()));
          }
          setWindow(e3) {
            this._parentWindow = e3, this._setWindowResizeListener(), this._setDprAndFireIfDiffers();
          }
          _setWindowResizeListener() {
            this._windowResizeListener.value = (0, n.addDisposableDomListener)(this._parentWindow, "resize", () => this._setDprAndFireIfDiffers());
          }
          _setDprAndFireIfDiffers() {
            this._parentWindow.devicePixelRatio !== this._currentDevicePixelRatio && this._onDprChange.fire(this._parentWindow.devicePixelRatio), this._updateDpr();
          }
          _updateDpr() {
            var _a3;
            this._outerListener && ((_a3 = this._resolutionMediaMatchList) == null ? void 0 : _a3.removeListener(this._outerListener), this._currentDevicePixelRatio = this._parentWindow.devicePixelRatio, this._resolutionMediaMatchList = this._parentWindow.matchMedia(`screen and (resolution: ${this._parentWindow.devicePixelRatio}dppx)`), this._resolutionMediaMatchList.addListener(this._outerListener));
          }
          clearListener() {
            this._resolutionMediaMatchList && this._outerListener && (this._resolutionMediaMatchList.removeListener(this._outerListener), this._resolutionMediaMatchList = void 0, this._outerListener = void 0);
          }
        }
      }, 779: (e2, t2, i2) => {
        Object.defineProperty(t2, "__esModule", { value: true }), t2.LinkProviderService = void 0;
        const s2 = i2(844);
        class r extends s2.Disposable {
          constructor() {
            super(), this.linkProviders = [], this.register((0, s2.toDisposable)(() => this.linkProviders.length = 0));
          }
          registerLinkProvider(e3) {
            return this.linkProviders.push(e3), { dispose: () => {
              const t3 = this.linkProviders.indexOf(e3);
              -1 !== t3 && this.linkProviders.splice(t3, 1);
            } };
          }
        }
        t2.LinkProviderService = r;
      }, 8934: function(e2, t2, i2) {
        var s2 = this && this.__decorate || function(e3, t3, i3, s3) {
          var r2, n2 = arguments.length, o2 = n2 < 3 ? t3 : null === s3 ? s3 = Object.getOwnPropertyDescriptor(t3, i3) : s3;
          if ("object" == typeof Reflect && "function" == typeof Reflect.decorate) o2 = Reflect.decorate(e3, t3, i3, s3);
          else for (var a2 = e3.length - 1; a2 >= 0; a2--) (r2 = e3[a2]) && (o2 = (n2 < 3 ? r2(o2) : n2 > 3 ? r2(t3, i3, o2) : r2(t3, i3)) || o2);
          return n2 > 3 && o2 && Object.defineProperty(t3, i3, o2), o2;
        }, r = this && this.__param || function(e3, t3) {
          return function(i3, s3) {
            t3(i3, s3, e3);
          };
        };
        Object.defineProperty(t2, "__esModule", { value: true }), t2.MouseService = void 0;
        const n = i2(4725), o = i2(9806);
        let a = t2.MouseService = class {
          constructor(e3, t3) {
            this._renderService = e3, this._charSizeService = t3;
          }
          getCoords(e3, t3, i3, s3, r2) {
            return (0, o.getCoords)(window, e3, t3, i3, s3, this._charSizeService.hasValidSize, this._renderService.dimensions.css.cell.width, this._renderService.dimensions.css.cell.height, r2);
          }
          getMouseReportCoords(e3, t3) {
            const i3 = (0, o.getCoordsRelativeToElement)(window, e3, t3);
            if (this._charSizeService.hasValidSize) return i3[0] = Math.min(Math.max(i3[0], 0), this._renderService.dimensions.css.canvas.width - 1), i3[1] = Math.min(Math.max(i3[1], 0), this._renderService.dimensions.css.canvas.height - 1), { col: Math.floor(i3[0] / this._renderService.dimensions.css.cell.width), row: Math.floor(i3[1] / this._renderService.dimensions.css.cell.height), x: Math.floor(i3[0]), y: Math.floor(i3[1]) };
          }
        };
        t2.MouseService = a = s2([r(0, n.IRenderService), r(1, n.ICharSizeService)], a);
      }, 3230: function(e2, t2, i2) {
        var s2 = this && this.__decorate || function(e3, t3, i3, s3) {
          var r2, n2 = arguments.length, o2 = n2 < 3 ? t3 : null === s3 ? s3 = Object.getOwnPropertyDescriptor(t3, i3) : s3;
          if ("object" == typeof Reflect && "function" == typeof Reflect.decorate) o2 = Reflect.decorate(e3, t3, i3, s3);
          else for (var a2 = e3.length - 1; a2 >= 0; a2--) (r2 = e3[a2]) && (o2 = (n2 < 3 ? r2(o2) : n2 > 3 ? r2(t3, i3, o2) : r2(t3, i3)) || o2);
          return n2 > 3 && o2 && Object.defineProperty(t3, i3, o2), o2;
        }, r = this && this.__param || function(e3, t3) {
          return function(i3, s3) {
            t3(i3, s3, e3);
          };
        };
        Object.defineProperty(t2, "__esModule", { value: true }), t2.RenderService = void 0;
        const n = i2(6193), o = i2(4725), a = i2(8460), h = i2(844), c = i2(7226), l = i2(2585);
        let d = t2.RenderService = class extends h.Disposable {
          get dimensions() {
            return this._renderer.value.dimensions;
          }
          constructor(e3, t3, i3, s3, r2, o2, l2, d2) {
            super(), this._rowCount = e3, this._charSizeService = s3, this._renderer = this.register(new h.MutableDisposable()), this._pausedResizeTask = new c.DebouncedIdleTask(), this._observerDisposable = this.register(new h.MutableDisposable()), this._isPaused = false, this._needsFullRefresh = false, this._isNextRenderRedrawOnly = true, this._needsSelectionRefresh = false, this._canvasWidth = 0, this._canvasHeight = 0, this._selectionState = { start: void 0, end: void 0, columnSelectMode: false }, this._onDimensionsChange = this.register(new a.EventEmitter()), this.onDimensionsChange = this._onDimensionsChange.event, this._onRenderedViewportChange = this.register(new a.EventEmitter()), this.onRenderedViewportChange = this._onRenderedViewportChange.event, this._onRender = this.register(new a.EventEmitter()), this.onRender = this._onRender.event, this._onRefreshRequest = this.register(new a.EventEmitter()), this.onRefreshRequest = this._onRefreshRequest.event, this._renderDebouncer = new n.RenderDebouncer((e4, t4) => this._renderRows(e4, t4), l2), this.register(this._renderDebouncer), this.register(l2.onDprChange(() => this.handleDevicePixelRatioChange())), this.register(o2.onResize(() => this._fullRefresh())), this.register(o2.buffers.onBufferActivate(() => {
              var _a2;
              return (_a2 = this._renderer.value) == null ? void 0 : _a2.clear();
            })), this.register(i3.onOptionChange(() => this._handleOptionsChanged())), this.register(this._charSizeService.onCharSizeChange(() => this.handleCharSizeChanged())), this.register(r2.onDecorationRegistered(() => this._fullRefresh())), this.register(r2.onDecorationRemoved(() => this._fullRefresh())), this.register(i3.onMultipleOptionChange(["customGlyphs", "drawBoldTextInBrightColors", "letterSpacing", "lineHeight", "fontFamily", "fontSize", "fontWeight", "fontWeightBold", "minimumContrastRatio", "rescaleOverlappingGlyphs"], () => {
              this.clear(), this.handleResize(o2.cols, o2.rows), this._fullRefresh();
            })), this.register(i3.onMultipleOptionChange(["cursorBlink", "cursorStyle"], () => this.refreshRows(o2.buffer.y, o2.buffer.y, true))), this.register(d2.onChangeColors(() => this._fullRefresh())), this._registerIntersectionObserver(l2.window, t3), this.register(l2.onWindowChange((e4) => this._registerIntersectionObserver(e4, t3)));
          }
          _registerIntersectionObserver(e3, t3) {
            if ("IntersectionObserver" in e3) {
              const i3 = new e3.IntersectionObserver((e4) => this._handleIntersectionChange(e4[e4.length - 1]), { threshold: 0 });
              i3.observe(t3), this._observerDisposable.value = (0, h.toDisposable)(() => i3.disconnect());
            }
          }
          _handleIntersectionChange(e3) {
            this._isPaused = void 0 === e3.isIntersecting ? 0 === e3.intersectionRatio : !e3.isIntersecting, this._isPaused || this._charSizeService.hasValidSize || this._charSizeService.measure(), !this._isPaused && this._needsFullRefresh && (this._pausedResizeTask.flush(), this.refreshRows(0, this._rowCount - 1), this._needsFullRefresh = false);
          }
          refreshRows(e3, t3, i3 = false) {
            this._isPaused ? this._needsFullRefresh = true : (i3 || (this._isNextRenderRedrawOnly = false), this._renderDebouncer.refresh(e3, t3, this._rowCount));
          }
          _renderRows(e3, t3) {
            this._renderer.value && (e3 = Math.min(e3, this._rowCount - 1), t3 = Math.min(t3, this._rowCount - 1), this._renderer.value.renderRows(e3, t3), this._needsSelectionRefresh && (this._renderer.value.handleSelectionChanged(this._selectionState.start, this._selectionState.end, this._selectionState.columnSelectMode), this._needsSelectionRefresh = false), this._isNextRenderRedrawOnly || this._onRenderedViewportChange.fire({ start: e3, end: t3 }), this._onRender.fire({ start: e3, end: t3 }), this._isNextRenderRedrawOnly = true);
          }
          resize(e3, t3) {
            this._rowCount = t3, this._fireOnCanvasResize();
          }
          _handleOptionsChanged() {
            this._renderer.value && (this.refreshRows(0, this._rowCount - 1), this._fireOnCanvasResize());
          }
          _fireOnCanvasResize() {
            this._renderer.value && (this._renderer.value.dimensions.css.canvas.width === this._canvasWidth && this._renderer.value.dimensions.css.canvas.height === this._canvasHeight || this._onDimensionsChange.fire(this._renderer.value.dimensions));
          }
          hasRenderer() {
            return !!this._renderer.value;
          }
          setRenderer(e3) {
            this._renderer.value = e3, this._renderer.value && (this._renderer.value.onRequestRedraw((e4) => this.refreshRows(e4.start, e4.end, true)), this._needsSelectionRefresh = true, this._fullRefresh());
          }
          addRefreshCallback(e3) {
            return this._renderDebouncer.addRefreshCallback(e3);
          }
          _fullRefresh() {
            this._isPaused ? this._needsFullRefresh = true : this.refreshRows(0, this._rowCount - 1);
          }
          clearTextureAtlas() {
            var _a2, _b2;
            this._renderer.value && ((_b2 = (_a2 = this._renderer.value).clearTextureAtlas) == null ? void 0 : _b2.call(_a2), this._fullRefresh());
          }
          handleDevicePixelRatioChange() {
            this._charSizeService.measure(), this._renderer.value && (this._renderer.value.handleDevicePixelRatioChange(), this.refreshRows(0, this._rowCount - 1));
          }
          handleResize(e3, t3) {
            this._renderer.value && (this._isPaused ? this._pausedResizeTask.set(() => {
              var _a2;
              return (_a2 = this._renderer.value) == null ? void 0 : _a2.handleResize(e3, t3);
            }) : this._renderer.value.handleResize(e3, t3), this._fullRefresh());
          }
          handleCharSizeChanged() {
            var _a2;
            (_a2 = this._renderer.value) == null ? void 0 : _a2.handleCharSizeChanged();
          }
          handleBlur() {
            var _a2;
            (_a2 = this._renderer.value) == null ? void 0 : _a2.handleBlur();
          }
          handleFocus() {
            var _a2;
            (_a2 = this._renderer.value) == null ? void 0 : _a2.handleFocus();
          }
          handleSelectionChanged(e3, t3, i3) {
            var _a2;
            this._selectionState.start = e3, this._selectionState.end = t3, this._selectionState.columnSelectMode = i3, (_a2 = this._renderer.value) == null ? void 0 : _a2.handleSelectionChanged(e3, t3, i3);
          }
          handleCursorMove() {
            var _a2;
            (_a2 = this._renderer.value) == null ? void 0 : _a2.handleCursorMove();
          }
          clear() {
            var _a2;
            (_a2 = this._renderer.value) == null ? void 0 : _a2.clear();
          }
        };
        t2.RenderService = d = s2([r(2, l.IOptionsService), r(3, o.ICharSizeService), r(4, l.IDecorationService), r(5, l.IBufferService), r(6, o.ICoreBrowserService), r(7, o.IThemeService)], d);
      }, 9312: function(e2, t2, i2) {
        var s2 = this && this.__decorate || function(e3, t3, i3, s3) {
          var r2, n2 = arguments.length, o2 = n2 < 3 ? t3 : null === s3 ? s3 = Object.getOwnPropertyDescriptor(t3, i3) : s3;
          if ("object" == typeof Reflect && "function" == typeof Reflect.decorate) o2 = Reflect.decorate(e3, t3, i3, s3);
          else for (var a2 = e3.length - 1; a2 >= 0; a2--) (r2 = e3[a2]) && (o2 = (n2 < 3 ? r2(o2) : n2 > 3 ? r2(t3, i3, o2) : r2(t3, i3)) || o2);
          return n2 > 3 && o2 && Object.defineProperty(t3, i3, o2), o2;
        }, r = this && this.__param || function(e3, t3) {
          return function(i3, s3) {
            t3(i3, s3, e3);
          };
        };
        Object.defineProperty(t2, "__esModule", { value: true }), t2.SelectionService = void 0;
        const n = i2(9806), o = i2(9504), a = i2(456), h = i2(4725), c = i2(8460), l = i2(844), d = i2(6114), _ = i2(4841), u = i2(511), f = i2(2585), v = String.fromCharCode(160), p = new RegExp(v, "g");
        let g = t2.SelectionService = class extends l.Disposable {
          constructor(e3, t3, i3, s3, r2, n2, o2, h2, d2) {
            super(), this._element = e3, this._screenElement = t3, this._linkifier = i3, this._bufferService = s3, this._coreService = r2, this._mouseService = n2, this._optionsService = o2, this._renderService = h2, this._coreBrowserService = d2, this._dragScrollAmount = 0, this._enabled = true, this._workCell = new u.CellData(), this._mouseDownTimeStamp = 0, this._oldHasSelection = false, this._oldSelectionStart = void 0, this._oldSelectionEnd = void 0, this._onLinuxMouseSelection = this.register(new c.EventEmitter()), this.onLinuxMouseSelection = this._onLinuxMouseSelection.event, this._onRedrawRequest = this.register(new c.EventEmitter()), this.onRequestRedraw = this._onRedrawRequest.event, this._onSelectionChange = this.register(new c.EventEmitter()), this.onSelectionChange = this._onSelectionChange.event, this._onRequestScrollLines = this.register(new c.EventEmitter()), this.onRequestScrollLines = this._onRequestScrollLines.event, this._mouseMoveListener = (e4) => this._handleMouseMove(e4), this._mouseUpListener = (e4) => this._handleMouseUp(e4), this._coreService.onUserInput(() => {
              this.hasSelection && this.clearSelection();
            }), this._trimListener = this._bufferService.buffer.lines.onTrim((e4) => this._handleTrim(e4)), this.register(this._bufferService.buffers.onBufferActivate((e4) => this._handleBufferActivate(e4))), this.enable(), this._model = new a.SelectionModel(this._bufferService), this._activeSelectionMode = 0, this.register((0, l.toDisposable)(() => {
              this._removeMouseDownListeners();
            }));
          }
          reset() {
            this.clearSelection();
          }
          disable() {
            this.clearSelection(), this._enabled = false;
          }
          enable() {
            this._enabled = true;
          }
          get selectionStart() {
            return this._model.finalSelectionStart;
          }
          get selectionEnd() {
            return this._model.finalSelectionEnd;
          }
          get hasSelection() {
            const e3 = this._model.finalSelectionStart, t3 = this._model.finalSelectionEnd;
            return !(!e3 || !t3 || e3[0] === t3[0] && e3[1] === t3[1]);
          }
          get selectionText() {
            const e3 = this._model.finalSelectionStart, t3 = this._model.finalSelectionEnd;
            if (!e3 || !t3) return "";
            const i3 = this._bufferService.buffer, s3 = [];
            if (3 === this._activeSelectionMode) {
              if (e3[0] === t3[0]) return "";
              const r2 = e3[0] < t3[0] ? e3[0] : t3[0], n2 = e3[0] < t3[0] ? t3[0] : e3[0];
              for (let o2 = e3[1]; o2 <= t3[1]; o2++) {
                const e4 = i3.translateBufferLineToString(o2, true, r2, n2);
                s3.push(e4);
              }
            } else {
              const r2 = e3[1] === t3[1] ? t3[0] : void 0;
              s3.push(i3.translateBufferLineToString(e3[1], true, e3[0], r2));
              for (let r3 = e3[1] + 1; r3 <= t3[1] - 1; r3++) {
                const e4 = i3.lines.get(r3), t4 = i3.translateBufferLineToString(r3, true);
                (e4 == null ? void 0 : e4.isWrapped) ? s3[s3.length - 1] += t4 : s3.push(t4);
              }
              if (e3[1] !== t3[1]) {
                const e4 = i3.lines.get(t3[1]), r3 = i3.translateBufferLineToString(t3[1], true, 0, t3[0]);
                e4 && e4.isWrapped ? s3[s3.length - 1] += r3 : s3.push(r3);
              }
            }
            return s3.map((e4) => e4.replace(p, " ")).join(d.isWindows ? "\r\n" : "\n");
          }
          clearSelection() {
            this._model.clearSelection(), this._removeMouseDownListeners(), this.refresh(), this._onSelectionChange.fire();
          }
          refresh(e3) {
            this._refreshAnimationFrame || (this._refreshAnimationFrame = this._coreBrowserService.window.requestAnimationFrame(() => this._refresh())), d.isLinux && e3 && this.selectionText.length && this._onLinuxMouseSelection.fire(this.selectionText);
          }
          _refresh() {
            this._refreshAnimationFrame = void 0, this._onRedrawRequest.fire({ start: this._model.finalSelectionStart, end: this._model.finalSelectionEnd, columnSelectMode: 3 === this._activeSelectionMode });
          }
          _isClickInSelection(e3) {
            const t3 = this._getMouseBufferCoords(e3), i3 = this._model.finalSelectionStart, s3 = this._model.finalSelectionEnd;
            return !!(i3 && s3 && t3) && this._areCoordsInSelection(t3, i3, s3);
          }
          isCellInSelection(e3, t3) {
            const i3 = this._model.finalSelectionStart, s3 = this._model.finalSelectionEnd;
            return !(!i3 || !s3) && this._areCoordsInSelection([e3, t3], i3, s3);
          }
          _areCoordsInSelection(e3, t3, i3) {
            return e3[1] > t3[1] && e3[1] < i3[1] || t3[1] === i3[1] && e3[1] === t3[1] && e3[0] >= t3[0] && e3[0] < i3[0] || t3[1] < i3[1] && e3[1] === i3[1] && e3[0] < i3[0] || t3[1] < i3[1] && e3[1] === t3[1] && e3[0] >= t3[0];
          }
          _selectWordAtCursor(e3, t3) {
            var _a2, _b2;
            const i3 = (_b2 = (_a2 = this._linkifier.currentLink) == null ? void 0 : _a2.link) == null ? void 0 : _b2.range;
            if (i3) return this._model.selectionStart = [i3.start.x - 1, i3.start.y - 1], this._model.selectionStartLength = (0, _.getRangeLength)(i3, this._bufferService.cols), this._model.selectionEnd = void 0, true;
            const s3 = this._getMouseBufferCoords(e3);
            return !!s3 && (this._selectWordAt(s3, t3), this._model.selectionEnd = void 0, true);
          }
          selectAll() {
            this._model.isSelectAllActive = true, this.refresh(), this._onSelectionChange.fire();
          }
          selectLines(e3, t3) {
            this._model.clearSelection(), e3 = Math.max(e3, 0), t3 = Math.min(t3, this._bufferService.buffer.lines.length - 1), this._model.selectionStart = [0, e3], this._model.selectionEnd = [this._bufferService.cols, t3], this.refresh(), this._onSelectionChange.fire();
          }
          _handleTrim(e3) {
            this._model.handleTrim(e3) && this.refresh();
          }
          _getMouseBufferCoords(e3) {
            const t3 = this._mouseService.getCoords(e3, this._screenElement, this._bufferService.cols, this._bufferService.rows, true);
            if (t3) return t3[0]--, t3[1]--, t3[1] += this._bufferService.buffer.ydisp, t3;
          }
          _getMouseEventScrollAmount(e3) {
            let t3 = (0, n.getCoordsRelativeToElement)(this._coreBrowserService.window, e3, this._screenElement)[1];
            const i3 = this._renderService.dimensions.css.canvas.height;
            return t3 >= 0 && t3 <= i3 ? 0 : (t3 > i3 && (t3 -= i3), t3 = Math.min(Math.max(t3, -50), 50), t3 /= 50, t3 / Math.abs(t3) + Math.round(14 * t3));
          }
          shouldForceSelection(e3) {
            return d.isMac ? e3.altKey && this._optionsService.rawOptions.macOptionClickForcesSelection : e3.shiftKey;
          }
          handleMouseDown(e3) {
            if (this._mouseDownTimeStamp = e3.timeStamp, (2 !== e3.button || !this.hasSelection) && 0 === e3.button) {
              if (!this._enabled) {
                if (!this.shouldForceSelection(e3)) return;
                e3.stopPropagation();
              }
              e3.preventDefault(), this._dragScrollAmount = 0, this._enabled && e3.shiftKey ? this._handleIncrementalClick(e3) : 1 === e3.detail ? this._handleSingleClick(e3) : 2 === e3.detail ? this._handleDoubleClick(e3) : 3 === e3.detail && this._handleTripleClick(e3), this._addMouseDownListeners(), this.refresh(true);
            }
          }
          _addMouseDownListeners() {
            this._screenElement.ownerDocument && (this._screenElement.ownerDocument.addEventListener("mousemove", this._mouseMoveListener), this._screenElement.ownerDocument.addEventListener("mouseup", this._mouseUpListener)), this._dragScrollIntervalTimer = this._coreBrowserService.window.setInterval(() => this._dragScroll(), 50);
          }
          _removeMouseDownListeners() {
            this._screenElement.ownerDocument && (this._screenElement.ownerDocument.removeEventListener("mousemove", this._mouseMoveListener), this._screenElement.ownerDocument.removeEventListener("mouseup", this._mouseUpListener)), this._coreBrowserService.window.clearInterval(this._dragScrollIntervalTimer), this._dragScrollIntervalTimer = void 0;
          }
          _handleIncrementalClick(e3) {
            this._model.selectionStart && (this._model.selectionEnd = this._getMouseBufferCoords(e3));
          }
          _handleSingleClick(e3) {
            if (this._model.selectionStartLength = 0, this._model.isSelectAllActive = false, this._activeSelectionMode = this.shouldColumnSelect(e3) ? 3 : 0, this._model.selectionStart = this._getMouseBufferCoords(e3), !this._model.selectionStart) return;
            this._model.selectionEnd = void 0;
            const t3 = this._bufferService.buffer.lines.get(this._model.selectionStart[1]);
            t3 && t3.length !== this._model.selectionStart[0] && 0 === t3.hasWidth(this._model.selectionStart[0]) && this._model.selectionStart[0]++;
          }
          _handleDoubleClick(e3) {
            this._selectWordAtCursor(e3, true) && (this._activeSelectionMode = 1);
          }
          _handleTripleClick(e3) {
            const t3 = this._getMouseBufferCoords(e3);
            t3 && (this._activeSelectionMode = 2, this._selectLineAt(t3[1]));
          }
          shouldColumnSelect(e3) {
            return e3.altKey && !(d.isMac && this._optionsService.rawOptions.macOptionClickForcesSelection);
          }
          _handleMouseMove(e3) {
            if (e3.stopImmediatePropagation(), !this._model.selectionStart) return;
            const t3 = this._model.selectionEnd ? [this._model.selectionEnd[0], this._model.selectionEnd[1]] : null;
            if (this._model.selectionEnd = this._getMouseBufferCoords(e3), !this._model.selectionEnd) return void this.refresh(true);
            2 === this._activeSelectionMode ? this._model.selectionEnd[1] < this._model.selectionStart[1] ? this._model.selectionEnd[0] = 0 : this._model.selectionEnd[0] = this._bufferService.cols : 1 === this._activeSelectionMode && this._selectToWordAt(this._model.selectionEnd), this._dragScrollAmount = this._getMouseEventScrollAmount(e3), 3 !== this._activeSelectionMode && (this._dragScrollAmount > 0 ? this._model.selectionEnd[0] = this._bufferService.cols : this._dragScrollAmount < 0 && (this._model.selectionEnd[0] = 0));
            const i3 = this._bufferService.buffer;
            if (this._model.selectionEnd[1] < i3.lines.length) {
              const e4 = i3.lines.get(this._model.selectionEnd[1]);
              e4 && 0 === e4.hasWidth(this._model.selectionEnd[0]) && this._model.selectionEnd[0] < this._bufferService.cols && this._model.selectionEnd[0]++;
            }
            t3 && t3[0] === this._model.selectionEnd[0] && t3[1] === this._model.selectionEnd[1] || this.refresh(true);
          }
          _dragScroll() {
            if (this._model.selectionEnd && this._model.selectionStart && this._dragScrollAmount) {
              this._onRequestScrollLines.fire({ amount: this._dragScrollAmount, suppressScrollEvent: false });
              const e3 = this._bufferService.buffer;
              this._dragScrollAmount > 0 ? (3 !== this._activeSelectionMode && (this._model.selectionEnd[0] = this._bufferService.cols), this._model.selectionEnd[1] = Math.min(e3.ydisp + this._bufferService.rows, e3.lines.length - 1)) : (3 !== this._activeSelectionMode && (this._model.selectionEnd[0] = 0), this._model.selectionEnd[1] = e3.ydisp), this.refresh();
            }
          }
          _handleMouseUp(e3) {
            const t3 = e3.timeStamp - this._mouseDownTimeStamp;
            if (this._removeMouseDownListeners(), this.selectionText.length <= 1 && t3 < 500 && e3.altKey && this._optionsService.rawOptions.altClickMovesCursor) {
              if (this._bufferService.buffer.ybase === this._bufferService.buffer.ydisp) {
                const t4 = this._mouseService.getCoords(e3, this._element, this._bufferService.cols, this._bufferService.rows, false);
                if (t4 && void 0 !== t4[0] && void 0 !== t4[1]) {
                  const e4 = (0, o.moveToCellSequence)(t4[0] - 1, t4[1] - 1, this._bufferService, this._coreService.decPrivateModes.applicationCursorKeys);
                  this._coreService.triggerDataEvent(e4, true);
                }
              }
            } else this._fireEventIfSelectionChanged();
          }
          _fireEventIfSelectionChanged() {
            const e3 = this._model.finalSelectionStart, t3 = this._model.finalSelectionEnd, i3 = !(!e3 || !t3 || e3[0] === t3[0] && e3[1] === t3[1]);
            i3 ? e3 && t3 && (this._oldSelectionStart && this._oldSelectionEnd && e3[0] === this._oldSelectionStart[0] && e3[1] === this._oldSelectionStart[1] && t3[0] === this._oldSelectionEnd[0] && t3[1] === this._oldSelectionEnd[1] || this._fireOnSelectionChange(e3, t3, i3)) : this._oldHasSelection && this._fireOnSelectionChange(e3, t3, i3);
          }
          _fireOnSelectionChange(e3, t3, i3) {
            this._oldSelectionStart = e3, this._oldSelectionEnd = t3, this._oldHasSelection = i3, this._onSelectionChange.fire();
          }
          _handleBufferActivate(e3) {
            this.clearSelection(), this._trimListener.dispose(), this._trimListener = e3.activeBuffer.lines.onTrim((e4) => this._handleTrim(e4));
          }
          _convertViewportColToCharacterIndex(e3, t3) {
            let i3 = t3;
            for (let s3 = 0; t3 >= s3; s3++) {
              const r2 = e3.loadCell(s3, this._workCell).getChars().length;
              0 === this._workCell.getWidth() ? i3-- : r2 > 1 && t3 !== s3 && (i3 += r2 - 1);
            }
            return i3;
          }
          setSelection(e3, t3, i3) {
            this._model.clearSelection(), this._removeMouseDownListeners(), this._model.selectionStart = [e3, t3], this._model.selectionStartLength = i3, this.refresh(), this._fireEventIfSelectionChanged();
          }
          rightClickSelect(e3) {
            this._isClickInSelection(e3) || (this._selectWordAtCursor(e3, false) && this.refresh(true), this._fireEventIfSelectionChanged());
          }
          _getWordAt(e3, t3, i3 = true, s3 = true) {
            if (e3[0] >= this._bufferService.cols) return;
            const r2 = this._bufferService.buffer, n2 = r2.lines.get(e3[1]);
            if (!n2) return;
            const o2 = r2.translateBufferLineToString(e3[1], false);
            let a2 = this._convertViewportColToCharacterIndex(n2, e3[0]), h2 = a2;
            const c2 = e3[0] - a2;
            let l2 = 0, d2 = 0, _2 = 0, u2 = 0;
            if (" " === o2.charAt(a2)) {
              for (; a2 > 0 && " " === o2.charAt(a2 - 1); ) a2--;
              for (; h2 < o2.length && " " === o2.charAt(h2 + 1); ) h2++;
            } else {
              let t4 = e3[0], i4 = e3[0];
              0 === n2.getWidth(t4) && (l2++, t4--), 2 === n2.getWidth(i4) && (d2++, i4++);
              const s4 = n2.getString(i4).length;
              for (s4 > 1 && (u2 += s4 - 1, h2 += s4 - 1); t4 > 0 && a2 > 0 && !this._isCharWordSeparator(n2.loadCell(t4 - 1, this._workCell)); ) {
                n2.loadCell(t4 - 1, this._workCell);
                const e4 = this._workCell.getChars().length;
                0 === this._workCell.getWidth() ? (l2++, t4--) : e4 > 1 && (_2 += e4 - 1, a2 -= e4 - 1), a2--, t4--;
              }
              for (; i4 < n2.length && h2 + 1 < o2.length && !this._isCharWordSeparator(n2.loadCell(i4 + 1, this._workCell)); ) {
                n2.loadCell(i4 + 1, this._workCell);
                const e4 = this._workCell.getChars().length;
                2 === this._workCell.getWidth() ? (d2++, i4++) : e4 > 1 && (u2 += e4 - 1, h2 += e4 - 1), h2++, i4++;
              }
            }
            h2++;
            let f2 = a2 + c2 - l2 + _2, v2 = Math.min(this._bufferService.cols, h2 - a2 + l2 + d2 - _2 - u2);
            if (t3 || "" !== o2.slice(a2, h2).trim()) {
              if (i3 && 0 === f2 && 32 !== n2.getCodePoint(0)) {
                const t4 = r2.lines.get(e3[1] - 1);
                if (t4 && n2.isWrapped && 32 !== t4.getCodePoint(this._bufferService.cols - 1)) {
                  const t5 = this._getWordAt([this._bufferService.cols - 1, e3[1] - 1], false, true, false);
                  if (t5) {
                    const e4 = this._bufferService.cols - t5.start;
                    f2 -= e4, v2 += e4;
                  }
                }
              }
              if (s3 && f2 + v2 === this._bufferService.cols && 32 !== n2.getCodePoint(this._bufferService.cols - 1)) {
                const t4 = r2.lines.get(e3[1] + 1);
                if ((t4 == null ? void 0 : t4.isWrapped) && 32 !== t4.getCodePoint(0)) {
                  const t5 = this._getWordAt([0, e3[1] + 1], false, false, true);
                  t5 && (v2 += t5.length);
                }
              }
              return { start: f2, length: v2 };
            }
          }
          _selectWordAt(e3, t3) {
            const i3 = this._getWordAt(e3, t3);
            if (i3) {
              for (; i3.start < 0; ) i3.start += this._bufferService.cols, e3[1]--;
              this._model.selectionStart = [i3.start, e3[1]], this._model.selectionStartLength = i3.length;
            }
          }
          _selectToWordAt(e3) {
            const t3 = this._getWordAt(e3, true);
            if (t3) {
              let i3 = e3[1];
              for (; t3.start < 0; ) t3.start += this._bufferService.cols, i3--;
              if (!this._model.areSelectionValuesReversed()) for (; t3.start + t3.length > this._bufferService.cols; ) t3.length -= this._bufferService.cols, i3++;
              this._model.selectionEnd = [this._model.areSelectionValuesReversed() ? t3.start : t3.start + t3.length, i3];
            }
          }
          _isCharWordSeparator(e3) {
            return 0 !== e3.getWidth() && this._optionsService.rawOptions.wordSeparator.indexOf(e3.getChars()) >= 0;
          }
          _selectLineAt(e3) {
            const t3 = this._bufferService.buffer.getWrappedRangeForLine(e3), i3 = { start: { x: 0, y: t3.first }, end: { x: this._bufferService.cols - 1, y: t3.last } };
            this._model.selectionStart = [0, t3.first], this._model.selectionEnd = void 0, this._model.selectionStartLength = (0, _.getRangeLength)(i3, this._bufferService.cols);
          }
        };
        t2.SelectionService = g = s2([r(3, f.IBufferService), r(4, f.ICoreService), r(5, h.IMouseService), r(6, f.IOptionsService), r(7, h.IRenderService), r(8, h.ICoreBrowserService)], g);
      }, 4725: (e2, t2, i2) => {
        Object.defineProperty(t2, "__esModule", { value: true }), t2.ILinkProviderService = t2.IThemeService = t2.ICharacterJoinerService = t2.ISelectionService = t2.IRenderService = t2.IMouseService = t2.ICoreBrowserService = t2.ICharSizeService = void 0;
        const s2 = i2(8343);
        t2.ICharSizeService = (0, s2.createDecorator)("CharSizeService"), t2.ICoreBrowserService = (0, s2.createDecorator)("CoreBrowserService"), t2.IMouseService = (0, s2.createDecorator)("MouseService"), t2.IRenderService = (0, s2.createDecorator)("RenderService"), t2.ISelectionService = (0, s2.createDecorator)("SelectionService"), t2.ICharacterJoinerService = (0, s2.createDecorator)("CharacterJoinerService"), t2.IThemeService = (0, s2.createDecorator)("ThemeService"), t2.ILinkProviderService = (0, s2.createDecorator)("LinkProviderService");
      }, 6731: function(e2, t2, i2) {
        var s2 = this && this.__decorate || function(e3, t3, i3, s3) {
          var r2, n2 = arguments.length, o2 = n2 < 3 ? t3 : null === s3 ? s3 = Object.getOwnPropertyDescriptor(t3, i3) : s3;
          if ("object" == typeof Reflect && "function" == typeof Reflect.decorate) o2 = Reflect.decorate(e3, t3, i3, s3);
          else for (var a2 = e3.length - 1; a2 >= 0; a2--) (r2 = e3[a2]) && (o2 = (n2 < 3 ? r2(o2) : n2 > 3 ? r2(t3, i3, o2) : r2(t3, i3)) || o2);
          return n2 > 3 && o2 && Object.defineProperty(t3, i3, o2), o2;
        }, r = this && this.__param || function(e3, t3) {
          return function(i3, s3) {
            t3(i3, s3, e3);
          };
        };
        Object.defineProperty(t2, "__esModule", { value: true }), t2.ThemeService = t2.DEFAULT_ANSI_COLORS = void 0;
        const n = i2(7239), o = i2(8055), a = i2(8460), h = i2(844), c = i2(2585), l = o.css.toColor("#ffffff"), d = o.css.toColor("#000000"), _ = o.css.toColor("#ffffff"), u = o.css.toColor("#000000"), f = { css: "rgba(255, 255, 255, 0.3)", rgba: 4294967117 };
        t2.DEFAULT_ANSI_COLORS = Object.freeze((() => {
          const e3 = [o.css.toColor("#2e3436"), o.css.toColor("#cc0000"), o.css.toColor("#4e9a06"), o.css.toColor("#c4a000"), o.css.toColor("#3465a4"), o.css.toColor("#75507b"), o.css.toColor("#06989a"), o.css.toColor("#d3d7cf"), o.css.toColor("#555753"), o.css.toColor("#ef2929"), o.css.toColor("#8ae234"), o.css.toColor("#fce94f"), o.css.toColor("#729fcf"), o.css.toColor("#ad7fa8"), o.css.toColor("#34e2e2"), o.css.toColor("#eeeeec")], t3 = [0, 95, 135, 175, 215, 255];
          for (let i3 = 0; i3 < 216; i3++) {
            const s3 = t3[i3 / 36 % 6 | 0], r2 = t3[i3 / 6 % 6 | 0], n2 = t3[i3 % 6];
            e3.push({ css: o.channels.toCss(s3, r2, n2), rgba: o.channels.toRgba(s3, r2, n2) });
          }
          for (let t4 = 0; t4 < 24; t4++) {
            const i3 = 8 + 10 * t4;
            e3.push({ css: o.channels.toCss(i3, i3, i3), rgba: o.channels.toRgba(i3, i3, i3) });
          }
          return e3;
        })());
        let v = t2.ThemeService = class extends h.Disposable {
          get colors() {
            return this._colors;
          }
          constructor(e3) {
            super(), this._optionsService = e3, this._contrastCache = new n.ColorContrastCache(), this._halfContrastCache = new n.ColorContrastCache(), this._onChangeColors = this.register(new a.EventEmitter()), this.onChangeColors = this._onChangeColors.event, this._colors = { foreground: l, background: d, cursor: _, cursorAccent: u, selectionForeground: void 0, selectionBackgroundTransparent: f, selectionBackgroundOpaque: o.color.blend(d, f), selectionInactiveBackgroundTransparent: f, selectionInactiveBackgroundOpaque: o.color.blend(d, f), ansi: t2.DEFAULT_ANSI_COLORS.slice(), contrastCache: this._contrastCache, halfContrastCache: this._halfContrastCache }, this._updateRestoreColors(), this._setTheme(this._optionsService.rawOptions.theme), this.register(this._optionsService.onSpecificOptionChange("minimumContrastRatio", () => this._contrastCache.clear())), this.register(this._optionsService.onSpecificOptionChange("theme", () => this._setTheme(this._optionsService.rawOptions.theme)));
          }
          _setTheme(e3 = {}) {
            const i3 = this._colors;
            if (i3.foreground = p(e3.foreground, l), i3.background = p(e3.background, d), i3.cursor = p(e3.cursor, _), i3.cursorAccent = p(e3.cursorAccent, u), i3.selectionBackgroundTransparent = p(e3.selectionBackground, f), i3.selectionBackgroundOpaque = o.color.blend(i3.background, i3.selectionBackgroundTransparent), i3.selectionInactiveBackgroundTransparent = p(e3.selectionInactiveBackground, i3.selectionBackgroundTransparent), i3.selectionInactiveBackgroundOpaque = o.color.blend(i3.background, i3.selectionInactiveBackgroundTransparent), i3.selectionForeground = e3.selectionForeground ? p(e3.selectionForeground, o.NULL_COLOR) : void 0, i3.selectionForeground === o.NULL_COLOR && (i3.selectionForeground = void 0), o.color.isOpaque(i3.selectionBackgroundTransparent)) {
              const e4 = 0.3;
              i3.selectionBackgroundTransparent = o.color.opacity(i3.selectionBackgroundTransparent, e4);
            }
            if (o.color.isOpaque(i3.selectionInactiveBackgroundTransparent)) {
              const e4 = 0.3;
              i3.selectionInactiveBackgroundTransparent = o.color.opacity(i3.selectionInactiveBackgroundTransparent, e4);
            }
            if (i3.ansi = t2.DEFAULT_ANSI_COLORS.slice(), i3.ansi[0] = p(e3.black, t2.DEFAULT_ANSI_COLORS[0]), i3.ansi[1] = p(e3.red, t2.DEFAULT_ANSI_COLORS[1]), i3.ansi[2] = p(e3.green, t2.DEFAULT_ANSI_COLORS[2]), i3.ansi[3] = p(e3.yellow, t2.DEFAULT_ANSI_COLORS[3]), i3.ansi[4] = p(e3.blue, t2.DEFAULT_ANSI_COLORS[4]), i3.ansi[5] = p(e3.magenta, t2.DEFAULT_ANSI_COLORS[5]), i3.ansi[6] = p(e3.cyan, t2.DEFAULT_ANSI_COLORS[6]), i3.ansi[7] = p(e3.white, t2.DEFAULT_ANSI_COLORS[7]), i3.ansi[8] = p(e3.brightBlack, t2.DEFAULT_ANSI_COLORS[8]), i3.ansi[9] = p(e3.brightRed, t2.DEFAULT_ANSI_COLORS[9]), i3.ansi[10] = p(e3.brightGreen, t2.DEFAULT_ANSI_COLORS[10]), i3.ansi[11] = p(e3.brightYellow, t2.DEFAULT_ANSI_COLORS[11]), i3.ansi[12] = p(e3.brightBlue, t2.DEFAULT_ANSI_COLORS[12]), i3.ansi[13] = p(e3.brightMagenta, t2.DEFAULT_ANSI_COLORS[13]), i3.ansi[14] = p(e3.brightCyan, t2.DEFAULT_ANSI_COLORS[14]), i3.ansi[15] = p(e3.brightWhite, t2.DEFAULT_ANSI_COLORS[15]), e3.extendedAnsi) {
              const s3 = Math.min(i3.ansi.length - 16, e3.extendedAnsi.length);
              for (let r2 = 0; r2 < s3; r2++) i3.ansi[r2 + 16] = p(e3.extendedAnsi[r2], t2.DEFAULT_ANSI_COLORS[r2 + 16]);
            }
            this._contrastCache.clear(), this._halfContrastCache.clear(), this._updateRestoreColors(), this._onChangeColors.fire(this.colors);
          }
          restoreColor(e3) {
            this._restoreColor(e3), this._onChangeColors.fire(this.colors);
          }
          _restoreColor(e3) {
            if (void 0 !== e3) switch (e3) {
              case 256:
                this._colors.foreground = this._restoreColors.foreground;
                break;
              case 257:
                this._colors.background = this._restoreColors.background;
                break;
              case 258:
                this._colors.cursor = this._restoreColors.cursor;
                break;
              default:
                this._colors.ansi[e3] = this._restoreColors.ansi[e3];
            }
            else for (let e4 = 0; e4 < this._restoreColors.ansi.length; ++e4) this._colors.ansi[e4] = this._restoreColors.ansi[e4];
          }
          modifyColors(e3) {
            e3(this._colors), this._onChangeColors.fire(this.colors);
          }
          _updateRestoreColors() {
            this._restoreColors = { foreground: this._colors.foreground, background: this._colors.background, cursor: this._colors.cursor, ansi: this._colors.ansi.slice() };
          }
        };
        function p(e3, t3) {
          if (void 0 !== e3) try {
            return o.css.toColor(e3);
          } catch {
          }
          return t3;
        }
        t2.ThemeService = v = s2([r(0, c.IOptionsService)], v);
      }, 6349: (e2, t2, i2) => {
        Object.defineProperty(t2, "__esModule", { value: true }), t2.CircularList = void 0;
        const s2 = i2(8460), r = i2(844);
        class n extends r.Disposable {
          constructor(e3) {
            super(), this._maxLength = e3, this.onDeleteEmitter = this.register(new s2.EventEmitter()), this.onDelete = this.onDeleteEmitter.event, this.onInsertEmitter = this.register(new s2.EventEmitter()), this.onInsert = this.onInsertEmitter.event, this.onTrimEmitter = this.register(new s2.EventEmitter()), this.onTrim = this.onTrimEmitter.event, this._array = new Array(this._maxLength), this._startIndex = 0, this._length = 0;
          }
          get maxLength() {
            return this._maxLength;
          }
          set maxLength(e3) {
            if (this._maxLength === e3) return;
            const t3 = new Array(e3);
            for (let i3 = 0; i3 < Math.min(e3, this.length); i3++) t3[i3] = this._array[this._getCyclicIndex(i3)];
            this._array = t3, this._maxLength = e3, this._startIndex = 0;
          }
          get length() {
            return this._length;
          }
          set length(e3) {
            if (e3 > this._length) for (let t3 = this._length; t3 < e3; t3++) this._array[t3] = void 0;
            this._length = e3;
          }
          get(e3) {
            return this._array[this._getCyclicIndex(e3)];
          }
          set(e3, t3) {
            this._array[this._getCyclicIndex(e3)] = t3;
          }
          push(e3) {
            this._array[this._getCyclicIndex(this._length)] = e3, this._length === this._maxLength ? (this._startIndex = ++this._startIndex % this._maxLength, this.onTrimEmitter.fire(1)) : this._length++;
          }
          recycle() {
            if (this._length !== this._maxLength) throw new Error("Can only recycle when the buffer is full");
            return this._startIndex = ++this._startIndex % this._maxLength, this.onTrimEmitter.fire(1), this._array[this._getCyclicIndex(this._length - 1)];
          }
          get isFull() {
            return this._length === this._maxLength;
          }
          pop() {
            return this._array[this._getCyclicIndex(this._length-- - 1)];
          }
          splice(e3, t3, ...i3) {
            if (t3) {
              for (let i4 = e3; i4 < this._length - t3; i4++) this._array[this._getCyclicIndex(i4)] = this._array[this._getCyclicIndex(i4 + t3)];
              this._length -= t3, this.onDeleteEmitter.fire({ index: e3, amount: t3 });
            }
            for (let t4 = this._length - 1; t4 >= e3; t4--) this._array[this._getCyclicIndex(t4 + i3.length)] = this._array[this._getCyclicIndex(t4)];
            for (let t4 = 0; t4 < i3.length; t4++) this._array[this._getCyclicIndex(e3 + t4)] = i3[t4];
            if (i3.length && this.onInsertEmitter.fire({ index: e3, amount: i3.length }), this._length + i3.length > this._maxLength) {
              const e4 = this._length + i3.length - this._maxLength;
              this._startIndex += e4, this._length = this._maxLength, this.onTrimEmitter.fire(e4);
            } else this._length += i3.length;
          }
          trimStart(e3) {
            e3 > this._length && (e3 = this._length), this._startIndex += e3, this._length -= e3, this.onTrimEmitter.fire(e3);
          }
          shiftElements(e3, t3, i3) {
            if (!(t3 <= 0)) {
              if (e3 < 0 || e3 >= this._length) throw new Error("start argument out of range");
              if (e3 + i3 < 0) throw new Error("Cannot shift elements in list beyond index 0");
              if (i3 > 0) {
                for (let s4 = t3 - 1; s4 >= 0; s4--) this.set(e3 + s4 + i3, this.get(e3 + s4));
                const s3 = e3 + t3 + i3 - this._length;
                if (s3 > 0) for (this._length += s3; this._length > this._maxLength; ) this._length--, this._startIndex++, this.onTrimEmitter.fire(1);
              } else for (let s3 = 0; s3 < t3; s3++) this.set(e3 + s3 + i3, this.get(e3 + s3));
            }
          }
          _getCyclicIndex(e3) {
            return (this._startIndex + e3) % this._maxLength;
          }
        }
        t2.CircularList = n;
      }, 1439: (e2, t2) => {
        Object.defineProperty(t2, "__esModule", { value: true }), t2.clone = void 0, t2.clone = function e3(t3, i2 = 5) {
          if ("object" != typeof t3) return t3;
          const s2 = Array.isArray(t3) ? [] : {};
          for (const r in t3) s2[r] = i2 <= 1 ? t3[r] : t3[r] && e3(t3[r], i2 - 1);
          return s2;
        };
      }, 8055: (e2, t2) => {
        Object.defineProperty(t2, "__esModule", { value: true }), t2.contrastRatio = t2.toPaddedHex = t2.rgba = t2.rgb = t2.css = t2.color = t2.channels = t2.NULL_COLOR = void 0;
        let i2 = 0, s2 = 0, r = 0, n = 0;
        var o, a, h, c, l;
        function d(e3) {
          const t3 = e3.toString(16);
          return t3.length < 2 ? "0" + t3 : t3;
        }
        function _(e3, t3) {
          return e3 < t3 ? (t3 + 0.05) / (e3 + 0.05) : (e3 + 0.05) / (t3 + 0.05);
        }
        t2.NULL_COLOR = { css: "#00000000", rgba: 0 }, function(e3) {
          e3.toCss = function(e4, t3, i3, s3) {
            return void 0 !== s3 ? `#${d(e4)}${d(t3)}${d(i3)}${d(s3)}` : `#${d(e4)}${d(t3)}${d(i3)}`;
          }, e3.toRgba = function(e4, t3, i3, s3 = 255) {
            return (e4 << 24 | t3 << 16 | i3 << 8 | s3) >>> 0;
          }, e3.toColor = function(t3, i3, s3, r2) {
            return { css: e3.toCss(t3, i3, s3, r2), rgba: e3.toRgba(t3, i3, s3, r2) };
          };
        }(o || (t2.channels = o = {})), function(e3) {
          function t3(e4, t4) {
            return n = Math.round(255 * t4), [i2, s2, r] = l.toChannels(e4.rgba), { css: o.toCss(i2, s2, r, n), rgba: o.toRgba(i2, s2, r, n) };
          }
          e3.blend = function(e4, t4) {
            if (n = (255 & t4.rgba) / 255, 1 === n) return { css: t4.css, rgba: t4.rgba };
            const a2 = t4.rgba >> 24 & 255, h2 = t4.rgba >> 16 & 255, c2 = t4.rgba >> 8 & 255, l2 = e4.rgba >> 24 & 255, d2 = e4.rgba >> 16 & 255, _2 = e4.rgba >> 8 & 255;
            return i2 = l2 + Math.round((a2 - l2) * n), s2 = d2 + Math.round((h2 - d2) * n), r = _2 + Math.round((c2 - _2) * n), { css: o.toCss(i2, s2, r), rgba: o.toRgba(i2, s2, r) };
          }, e3.isOpaque = function(e4) {
            return 255 == (255 & e4.rgba);
          }, e3.ensureContrastRatio = function(e4, t4, i3) {
            const s3 = l.ensureContrastRatio(e4.rgba, t4.rgba, i3);
            if (s3) return o.toColor(s3 >> 24 & 255, s3 >> 16 & 255, s3 >> 8 & 255);
          }, e3.opaque = function(e4) {
            const t4 = (255 | e4.rgba) >>> 0;
            return [i2, s2, r] = l.toChannels(t4), { css: o.toCss(i2, s2, r), rgba: t4 };
          }, e3.opacity = t3, e3.multiplyOpacity = function(e4, i3) {
            return n = 255 & e4.rgba, t3(e4, n * i3 / 255);
          }, e3.toColorRGB = function(e4) {
            return [e4.rgba >> 24 & 255, e4.rgba >> 16 & 255, e4.rgba >> 8 & 255];
          };
        }(a || (t2.color = a = {})), function(e3) {
          let t3, a2;
          try {
            const e4 = document.createElement("canvas");
            e4.width = 1, e4.height = 1;
            const i3 = e4.getContext("2d", { willReadFrequently: true });
            i3 && (t3 = i3, t3.globalCompositeOperation = "copy", a2 = t3.createLinearGradient(0, 0, 1, 1));
          } catch {
          }
          e3.toColor = function(e4) {
            if (e4.match(/#[\da-f]{3,8}/i)) switch (e4.length) {
              case 4:
                return i2 = parseInt(e4.slice(1, 2).repeat(2), 16), s2 = parseInt(e4.slice(2, 3).repeat(2), 16), r = parseInt(e4.slice(3, 4).repeat(2), 16), o.toColor(i2, s2, r);
              case 5:
                return i2 = parseInt(e4.slice(1, 2).repeat(2), 16), s2 = parseInt(e4.slice(2, 3).repeat(2), 16), r = parseInt(e4.slice(3, 4).repeat(2), 16), n = parseInt(e4.slice(4, 5).repeat(2), 16), o.toColor(i2, s2, r, n);
              case 7:
                return { css: e4, rgba: (parseInt(e4.slice(1), 16) << 8 | 255) >>> 0 };
              case 9:
                return { css: e4, rgba: parseInt(e4.slice(1), 16) >>> 0 };
            }
            const h2 = e4.match(/rgba?\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})\s*(,\s*(0|1|\d?\.(\d+))\s*)?\)/);
            if (h2) return i2 = parseInt(h2[1]), s2 = parseInt(h2[2]), r = parseInt(h2[3]), n = Math.round(255 * (void 0 === h2[5] ? 1 : parseFloat(h2[5]))), o.toColor(i2, s2, r, n);
            if (!t3 || !a2) throw new Error("css.toColor: Unsupported css format");
            if (t3.fillStyle = a2, t3.fillStyle = e4, "string" != typeof t3.fillStyle) throw new Error("css.toColor: Unsupported css format");
            if (t3.fillRect(0, 0, 1, 1), [i2, s2, r, n] = t3.getImageData(0, 0, 1, 1).data, 255 !== n) throw new Error("css.toColor: Unsupported css format");
            return { rgba: o.toRgba(i2, s2, r, n), css: e4 };
          };
        }(h || (t2.css = h = {})), function(e3) {
          function t3(e4, t4, i3) {
            const s3 = e4 / 255, r2 = t4 / 255, n2 = i3 / 255;
            return 0.2126 * (s3 <= 0.03928 ? s3 / 12.92 : Math.pow((s3 + 0.055) / 1.055, 2.4)) + 0.7152 * (r2 <= 0.03928 ? r2 / 12.92 : Math.pow((r2 + 0.055) / 1.055, 2.4)) + 0.0722 * (n2 <= 0.03928 ? n2 / 12.92 : Math.pow((n2 + 0.055) / 1.055, 2.4));
          }
          e3.relativeLuminance = function(e4) {
            return t3(e4 >> 16 & 255, e4 >> 8 & 255, 255 & e4);
          }, e3.relativeLuminance2 = t3;
        }(c || (t2.rgb = c = {})), function(e3) {
          function t3(e4, t4, i3) {
            const s3 = e4 >> 24 & 255, r2 = e4 >> 16 & 255, n2 = e4 >> 8 & 255;
            let o2 = t4 >> 24 & 255, a3 = t4 >> 16 & 255, h2 = t4 >> 8 & 255, l2 = _(c.relativeLuminance2(o2, a3, h2), c.relativeLuminance2(s3, r2, n2));
            for (; l2 < i3 && (o2 > 0 || a3 > 0 || h2 > 0); ) o2 -= Math.max(0, Math.ceil(0.1 * o2)), a3 -= Math.max(0, Math.ceil(0.1 * a3)), h2 -= Math.max(0, Math.ceil(0.1 * h2)), l2 = _(c.relativeLuminance2(o2, a3, h2), c.relativeLuminance2(s3, r2, n2));
            return (o2 << 24 | a3 << 16 | h2 << 8 | 255) >>> 0;
          }
          function a2(e4, t4, i3) {
            const s3 = e4 >> 24 & 255, r2 = e4 >> 16 & 255, n2 = e4 >> 8 & 255;
            let o2 = t4 >> 24 & 255, a3 = t4 >> 16 & 255, h2 = t4 >> 8 & 255, l2 = _(c.relativeLuminance2(o2, a3, h2), c.relativeLuminance2(s3, r2, n2));
            for (; l2 < i3 && (o2 < 255 || a3 < 255 || h2 < 255); ) o2 = Math.min(255, o2 + Math.ceil(0.1 * (255 - o2))), a3 = Math.min(255, a3 + Math.ceil(0.1 * (255 - a3))), h2 = Math.min(255, h2 + Math.ceil(0.1 * (255 - h2))), l2 = _(c.relativeLuminance2(o2, a3, h2), c.relativeLuminance2(s3, r2, n2));
            return (o2 << 24 | a3 << 16 | h2 << 8 | 255) >>> 0;
          }
          e3.blend = function(e4, t4) {
            if (n = (255 & t4) / 255, 1 === n) return t4;
            const a3 = t4 >> 24 & 255, h2 = t4 >> 16 & 255, c2 = t4 >> 8 & 255, l2 = e4 >> 24 & 255, d2 = e4 >> 16 & 255, _2 = e4 >> 8 & 255;
            return i2 = l2 + Math.round((a3 - l2) * n), s2 = d2 + Math.round((h2 - d2) * n), r = _2 + Math.round((c2 - _2) * n), o.toRgba(i2, s2, r);
          }, e3.ensureContrastRatio = function(e4, i3, s3) {
            const r2 = c.relativeLuminance(e4 >> 8), n2 = c.relativeLuminance(i3 >> 8);
            if (_(r2, n2) < s3) {
              if (n2 < r2) {
                const n3 = t3(e4, i3, s3), o3 = _(r2, c.relativeLuminance(n3 >> 8));
                if (o3 < s3) {
                  const t4 = a2(e4, i3, s3);
                  return o3 > _(r2, c.relativeLuminance(t4 >> 8)) ? n3 : t4;
                }
                return n3;
              }
              const o2 = a2(e4, i3, s3), h2 = _(r2, c.relativeLuminance(o2 >> 8));
              if (h2 < s3) {
                const n3 = t3(e4, i3, s3);
                return h2 > _(r2, c.relativeLuminance(n3 >> 8)) ? o2 : n3;
              }
              return o2;
            }
          }, e3.reduceLuminance = t3, e3.increaseLuminance = a2, e3.toChannels = function(e4) {
            return [e4 >> 24 & 255, e4 >> 16 & 255, e4 >> 8 & 255, 255 & e4];
          };
        }(l || (t2.rgba = l = {})), t2.toPaddedHex = d, t2.contrastRatio = _;
      }, 8969: (e2, t2, i2) => {
        Object.defineProperty(t2, "__esModule", { value: true }), t2.CoreTerminal = void 0;
        const s2 = i2(844), r = i2(2585), n = i2(4348), o = i2(7866), a = i2(744), h = i2(7302), c = i2(6975), l = i2(8460), d = i2(1753), _ = i2(1480), u = i2(7994), f = i2(9282), v = i2(5435), p = i2(5981), g = i2(2660);
        let m = false;
        class S extends s2.Disposable {
          get onScroll() {
            return this._onScrollApi || (this._onScrollApi = this.register(new l.EventEmitter()), this._onScroll.event((e3) => {
              var _a2;
              (_a2 = this._onScrollApi) == null ? void 0 : _a2.fire(e3.position);
            })), this._onScrollApi.event;
          }
          get cols() {
            return this._bufferService.cols;
          }
          get rows() {
            return this._bufferService.rows;
          }
          get buffers() {
            return this._bufferService.buffers;
          }
          get options() {
            return this.optionsService.options;
          }
          set options(e3) {
            for (const t3 in e3) this.optionsService.options[t3] = e3[t3];
          }
          constructor(e3) {
            super(), this._windowsWrappingHeuristics = this.register(new s2.MutableDisposable()), this._onBinary = this.register(new l.EventEmitter()), this.onBinary = this._onBinary.event, this._onData = this.register(new l.EventEmitter()), this.onData = this._onData.event, this._onLineFeed = this.register(new l.EventEmitter()), this.onLineFeed = this._onLineFeed.event, this._onResize = this.register(new l.EventEmitter()), this.onResize = this._onResize.event, this._onWriteParsed = this.register(new l.EventEmitter()), this.onWriteParsed = this._onWriteParsed.event, this._onScroll = this.register(new l.EventEmitter()), this._instantiationService = new n.InstantiationService(), this.optionsService = this.register(new h.OptionsService(e3)), this._instantiationService.setService(r.IOptionsService, this.optionsService), this._bufferService = this.register(this._instantiationService.createInstance(a.BufferService)), this._instantiationService.setService(r.IBufferService, this._bufferService), this._logService = this.register(this._instantiationService.createInstance(o.LogService)), this._instantiationService.setService(r.ILogService, this._logService), this.coreService = this.register(this._instantiationService.createInstance(c.CoreService)), this._instantiationService.setService(r.ICoreService, this.coreService), this.coreMouseService = this.register(this._instantiationService.createInstance(d.CoreMouseService)), this._instantiationService.setService(r.ICoreMouseService, this.coreMouseService), this.unicodeService = this.register(this._instantiationService.createInstance(_.UnicodeService)), this._instantiationService.setService(r.IUnicodeService, this.unicodeService), this._charsetService = this._instantiationService.createInstance(u.CharsetService), this._instantiationService.setService(r.ICharsetService, this._charsetService), this._oscLinkService = this._instantiationService.createInstance(g.OscLinkService), this._instantiationService.setService(r.IOscLinkService, this._oscLinkService), this._inputHandler = this.register(new v.InputHandler(this._bufferService, this._charsetService, this.coreService, this._logService, this.optionsService, this._oscLinkService, this.coreMouseService, this.unicodeService)), this.register((0, l.forwardEvent)(this._inputHandler.onLineFeed, this._onLineFeed)), this.register(this._inputHandler), this.register((0, l.forwardEvent)(this._bufferService.onResize, this._onResize)), this.register((0, l.forwardEvent)(this.coreService.onData, this._onData)), this.register((0, l.forwardEvent)(this.coreService.onBinary, this._onBinary)), this.register(this.coreService.onRequestScrollToBottom(() => this.scrollToBottom())), this.register(this.coreService.onUserInput(() => this._writeBuffer.handleUserInput())), this.register(this.optionsService.onMultipleOptionChange(["windowsMode", "windowsPty"], () => this._handleWindowsPtyOptionChange())), this.register(this._bufferService.onScroll((e4) => {
              this._onScroll.fire({ position: this._bufferService.buffer.ydisp, source: 0 }), this._inputHandler.markRangeDirty(this._bufferService.buffer.scrollTop, this._bufferService.buffer.scrollBottom);
            })), this.register(this._inputHandler.onScroll((e4) => {
              this._onScroll.fire({ position: this._bufferService.buffer.ydisp, source: 0 }), this._inputHandler.markRangeDirty(this._bufferService.buffer.scrollTop, this._bufferService.buffer.scrollBottom);
            })), this._writeBuffer = this.register(new p.WriteBuffer((e4, t3) => this._inputHandler.parse(e4, t3))), this.register((0, l.forwardEvent)(this._writeBuffer.onWriteParsed, this._onWriteParsed));
          }
          write(e3, t3) {
            this._writeBuffer.write(e3, t3);
          }
          writeSync(e3, t3) {
            this._logService.logLevel <= r.LogLevelEnum.WARN && !m && (this._logService.warn("writeSync is unreliable and will be removed soon."), m = true), this._writeBuffer.writeSync(e3, t3);
          }
          input(e3, t3 = true) {
            this.coreService.triggerDataEvent(e3, t3);
          }
          resize(e3, t3) {
            isNaN(e3) || isNaN(t3) || (e3 = Math.max(e3, a.MINIMUM_COLS), t3 = Math.max(t3, a.MINIMUM_ROWS), this._bufferService.resize(e3, t3));
          }
          scroll(e3, t3 = false) {
            this._bufferService.scroll(e3, t3);
          }
          scrollLines(e3, t3, i3) {
            this._bufferService.scrollLines(e3, t3, i3);
          }
          scrollPages(e3) {
            this.scrollLines(e3 * (this.rows - 1));
          }
          scrollToTop() {
            this.scrollLines(-this._bufferService.buffer.ydisp);
          }
          scrollToBottom() {
            this.scrollLines(this._bufferService.buffer.ybase - this._bufferService.buffer.ydisp);
          }
          scrollToLine(e3) {
            const t3 = e3 - this._bufferService.buffer.ydisp;
            0 !== t3 && this.scrollLines(t3);
          }
          registerEscHandler(e3, t3) {
            return this._inputHandler.registerEscHandler(e3, t3);
          }
          registerDcsHandler(e3, t3) {
            return this._inputHandler.registerDcsHandler(e3, t3);
          }
          registerCsiHandler(e3, t3) {
            return this._inputHandler.registerCsiHandler(e3, t3);
          }
          registerOscHandler(e3, t3) {
            return this._inputHandler.registerOscHandler(e3, t3);
          }
          _setup() {
            this._handleWindowsPtyOptionChange();
          }
          reset() {
            this._inputHandler.reset(), this._bufferService.reset(), this._charsetService.reset(), this.coreService.reset(), this.coreMouseService.reset();
          }
          _handleWindowsPtyOptionChange() {
            let e3 = false;
            const t3 = this.optionsService.rawOptions.windowsPty;
            t3 && void 0 !== t3.buildNumber && void 0 !== t3.buildNumber ? e3 = !!("conpty" === t3.backend && t3.buildNumber < 21376) : this.optionsService.rawOptions.windowsMode && (e3 = true), e3 ? this._enableWindowsWrappingHeuristics() : this._windowsWrappingHeuristics.clear();
          }
          _enableWindowsWrappingHeuristics() {
            if (!this._windowsWrappingHeuristics.value) {
              const e3 = [];
              e3.push(this.onLineFeed(f.updateWindowsModeWrappedState.bind(null, this._bufferService))), e3.push(this.registerCsiHandler({ final: "H" }, () => ((0, f.updateWindowsModeWrappedState)(this._bufferService), false))), this._windowsWrappingHeuristics.value = (0, s2.toDisposable)(() => {
                for (const t3 of e3) t3.dispose();
              });
            }
          }
        }
        t2.CoreTerminal = S;
      }, 8460: (e2, t2) => {
        Object.defineProperty(t2, "__esModule", { value: true }), t2.runAndSubscribe = t2.forwardEvent = t2.EventEmitter = void 0, t2.EventEmitter = class {
          constructor() {
            this._listeners = [], this._disposed = false;
          }
          get event() {
            return this._event || (this._event = (e3) => (this._listeners.push(e3), { dispose: () => {
              if (!this._disposed) {
                for (let t3 = 0; t3 < this._listeners.length; t3++) if (this._listeners[t3] === e3) return void this._listeners.splice(t3, 1);
              }
            } })), this._event;
          }
          fire(e3, t3) {
            const i2 = [];
            for (let e4 = 0; e4 < this._listeners.length; e4++) i2.push(this._listeners[e4]);
            for (let s2 = 0; s2 < i2.length; s2++) i2[s2].call(void 0, e3, t3);
          }
          dispose() {
            this.clearListeners(), this._disposed = true;
          }
          clearListeners() {
            this._listeners && (this._listeners.length = 0);
          }
        }, t2.forwardEvent = function(e3, t3) {
          return e3((e4) => t3.fire(e4));
        }, t2.runAndSubscribe = function(e3, t3) {
          return t3(void 0), e3((e4) => t3(e4));
        };
      }, 5435: function(e2, t2, i2) {
        var s2 = this && this.__decorate || function(e3, t3, i3, s3) {
          var r2, n2 = arguments.length, o2 = n2 < 3 ? t3 : null === s3 ? s3 = Object.getOwnPropertyDescriptor(t3, i3) : s3;
          if ("object" == typeof Reflect && "function" == typeof Reflect.decorate) o2 = Reflect.decorate(e3, t3, i3, s3);
          else for (var a2 = e3.length - 1; a2 >= 0; a2--) (r2 = e3[a2]) && (o2 = (n2 < 3 ? r2(o2) : n2 > 3 ? r2(t3, i3, o2) : r2(t3, i3)) || o2);
          return n2 > 3 && o2 && Object.defineProperty(t3, i3, o2), o2;
        }, r = this && this.__param || function(e3, t3) {
          return function(i3, s3) {
            t3(i3, s3, e3);
          };
        };
        Object.defineProperty(t2, "__esModule", { value: true }), t2.InputHandler = t2.WindowsOptionsReportType = void 0;
        const n = i2(2584), o = i2(7116), a = i2(2015), h = i2(844), c = i2(482), l = i2(8437), d = i2(8460), _ = i2(643), u = i2(511), f = i2(3734), v = i2(2585), p = i2(1480), g = i2(6242), m = i2(6351), S = i2(5941), C = { "(": 0, ")": 1, "*": 2, "+": 3, "-": 1, ".": 2 }, b = 131072;
        function w(e3, t3) {
          if (e3 > 24) return t3.setWinLines || false;
          switch (e3) {
            case 1:
              return !!t3.restoreWin;
            case 2:
              return !!t3.minimizeWin;
            case 3:
              return !!t3.setWinPosition;
            case 4:
              return !!t3.setWinSizePixels;
            case 5:
              return !!t3.raiseWin;
            case 6:
              return !!t3.lowerWin;
            case 7:
              return !!t3.refreshWin;
            case 8:
              return !!t3.setWinSizeChars;
            case 9:
              return !!t3.maximizeWin;
            case 10:
              return !!t3.fullscreenWin;
            case 11:
              return !!t3.getWinState;
            case 13:
              return !!t3.getWinPosition;
            case 14:
              return !!t3.getWinSizePixels;
            case 15:
              return !!t3.getScreenSizePixels;
            case 16:
              return !!t3.getCellSizePixels;
            case 18:
              return !!t3.getWinSizeChars;
            case 19:
              return !!t3.getScreenSizeChars;
            case 20:
              return !!t3.getIconTitle;
            case 21:
              return !!t3.getWinTitle;
            case 22:
              return !!t3.pushTitle;
            case 23:
              return !!t3.popTitle;
            case 24:
              return !!t3.setWinLines;
          }
          return false;
        }
        var y;
        !function(e3) {
          e3[e3.GET_WIN_SIZE_PIXELS = 0] = "GET_WIN_SIZE_PIXELS", e3[e3.GET_CELL_SIZE_PIXELS = 1] = "GET_CELL_SIZE_PIXELS";
        }(y || (t2.WindowsOptionsReportType = y = {}));
        let E = 0;
        class k extends h.Disposable {
          getAttrData() {
            return this._curAttrData;
          }
          constructor(e3, t3, i3, s3, r2, h2, _2, f2, v2 = new a.EscapeSequenceParser()) {
            super(), this._bufferService = e3, this._charsetService = t3, this._coreService = i3, this._logService = s3, this._optionsService = r2, this._oscLinkService = h2, this._coreMouseService = _2, this._unicodeService = f2, this._parser = v2, this._parseBuffer = new Uint32Array(4096), this._stringDecoder = new c.StringToUtf32(), this._utf8Decoder = new c.Utf8ToUtf32(), this._workCell = new u.CellData(), this._windowTitle = "", this._iconName = "", this._windowTitleStack = [], this._iconNameStack = [], this._curAttrData = l.DEFAULT_ATTR_DATA.clone(), this._eraseAttrDataInternal = l.DEFAULT_ATTR_DATA.clone(), this._onRequestBell = this.register(new d.EventEmitter()), this.onRequestBell = this._onRequestBell.event, this._onRequestRefreshRows = this.register(new d.EventEmitter()), this.onRequestRefreshRows = this._onRequestRefreshRows.event, this._onRequestReset = this.register(new d.EventEmitter()), this.onRequestReset = this._onRequestReset.event, this._onRequestSendFocus = this.register(new d.EventEmitter()), this.onRequestSendFocus = this._onRequestSendFocus.event, this._onRequestSyncScrollBar = this.register(new d.EventEmitter()), this.onRequestSyncScrollBar = this._onRequestSyncScrollBar.event, this._onRequestWindowsOptionsReport = this.register(new d.EventEmitter()), this.onRequestWindowsOptionsReport = this._onRequestWindowsOptionsReport.event, this._onA11yChar = this.register(new d.EventEmitter()), this.onA11yChar = this._onA11yChar.event, this._onA11yTab = this.register(new d.EventEmitter()), this.onA11yTab = this._onA11yTab.event, this._onCursorMove = this.register(new d.EventEmitter()), this.onCursorMove = this._onCursorMove.event, this._onLineFeed = this.register(new d.EventEmitter()), this.onLineFeed = this._onLineFeed.event, this._onScroll = this.register(new d.EventEmitter()), this.onScroll = this._onScroll.event, this._onTitleChange = this.register(new d.EventEmitter()), this.onTitleChange = this._onTitleChange.event, this._onColor = this.register(new d.EventEmitter()), this.onColor = this._onColor.event, this._parseStack = { paused: false, cursorStartX: 0, cursorStartY: 0, decodedLength: 0, position: 0 }, this._specialColors = [256, 257, 258], this.register(this._parser), this._dirtyRowTracker = new L(this._bufferService), this._activeBuffer = this._bufferService.buffer, this.register(this._bufferService.buffers.onBufferActivate((e4) => this._activeBuffer = e4.activeBuffer)), this._parser.setCsiHandlerFallback((e4, t4) => {
              this._logService.debug("Unknown CSI code: ", { identifier: this._parser.identToString(e4), params: t4.toArray() });
            }), this._parser.setEscHandlerFallback((e4) => {
              this._logService.debug("Unknown ESC code: ", { identifier: this._parser.identToString(e4) });
            }), this._parser.setExecuteHandlerFallback((e4) => {
              this._logService.debug("Unknown EXECUTE code: ", { code: e4 });
            }), this._parser.setOscHandlerFallback((e4, t4, i4) => {
              this._logService.debug("Unknown OSC code: ", { identifier: e4, action: t4, data: i4 });
            }), this._parser.setDcsHandlerFallback((e4, t4, i4) => {
              "HOOK" === t4 && (i4 = i4.toArray()), this._logService.debug("Unknown DCS code: ", { identifier: this._parser.identToString(e4), action: t4, payload: i4 });
            }), this._parser.setPrintHandler((e4, t4, i4) => this.print(e4, t4, i4)), this._parser.registerCsiHandler({ final: "@" }, (e4) => this.insertChars(e4)), this._parser.registerCsiHandler({ intermediates: " ", final: "@" }, (e4) => this.scrollLeft(e4)), this._parser.registerCsiHandler({ final: "A" }, (e4) => this.cursorUp(e4)), this._parser.registerCsiHandler({ intermediates: " ", final: "A" }, (e4) => this.scrollRight(e4)), this._parser.registerCsiHandler({ final: "B" }, (e4) => this.cursorDown(e4)), this._parser.registerCsiHandler({ final: "C" }, (e4) => this.cursorForward(e4)), this._parser.registerCsiHandler({ final: "D" }, (e4) => this.cursorBackward(e4)), this._parser.registerCsiHandler({ final: "E" }, (e4) => this.cursorNextLine(e4)), this._parser.registerCsiHandler({ final: "F" }, (e4) => this.cursorPrecedingLine(e4)), this._parser.registerCsiHandler({ final: "G" }, (e4) => this.cursorCharAbsolute(e4)), this._parser.registerCsiHandler({ final: "H" }, (e4) => this.cursorPosition(e4)), this._parser.registerCsiHandler({ final: "I" }, (e4) => this.cursorForwardTab(e4)), this._parser.registerCsiHandler({ final: "J" }, (e4) => this.eraseInDisplay(e4, false)), this._parser.registerCsiHandler({ prefix: "?", final: "J" }, (e4) => this.eraseInDisplay(e4, true)), this._parser.registerCsiHandler({ final: "K" }, (e4) => this.eraseInLine(e4, false)), this._parser.registerCsiHandler({ prefix: "?", final: "K" }, (e4) => this.eraseInLine(e4, true)), this._parser.registerCsiHandler({ final: "L" }, (e4) => this.insertLines(e4)), this._parser.registerCsiHandler({ final: "M" }, (e4) => this.deleteLines(e4)), this._parser.registerCsiHandler({ final: "P" }, (e4) => this.deleteChars(e4)), this._parser.registerCsiHandler({ final: "S" }, (e4) => this.scrollUp(e4)), this._parser.registerCsiHandler({ final: "T" }, (e4) => this.scrollDown(e4)), this._parser.registerCsiHandler({ final: "X" }, (e4) => this.eraseChars(e4)), this._parser.registerCsiHandler({ final: "Z" }, (e4) => this.cursorBackwardTab(e4)), this._parser.registerCsiHandler({ final: "`" }, (e4) => this.charPosAbsolute(e4)), this._parser.registerCsiHandler({ final: "a" }, (e4) => this.hPositionRelative(e4)), this._parser.registerCsiHandler({ final: "b" }, (e4) => this.repeatPrecedingCharacter(e4)), this._parser.registerCsiHandler({ final: "c" }, (e4) => this.sendDeviceAttributesPrimary(e4)), this._parser.registerCsiHandler({ prefix: ">", final: "c" }, (e4) => this.sendDeviceAttributesSecondary(e4)), this._parser.registerCsiHandler({ final: "d" }, (e4) => this.linePosAbsolute(e4)), this._parser.registerCsiHandler({ final: "e" }, (e4) => this.vPositionRelative(e4)), this._parser.registerCsiHandler({ final: "f" }, (e4) => this.hVPosition(e4)), this._parser.registerCsiHandler({ final: "g" }, (e4) => this.tabClear(e4)), this._parser.registerCsiHandler({ final: "h" }, (e4) => this.setMode(e4)), this._parser.registerCsiHandler({ prefix: "?", final: "h" }, (e4) => this.setModePrivate(e4)), this._parser.registerCsiHandler({ final: "l" }, (e4) => this.resetMode(e4)), this._parser.registerCsiHandler({ prefix: "?", final: "l" }, (e4) => this.resetModePrivate(e4)), this._parser.registerCsiHandler({ final: "m" }, (e4) => this.charAttributes(e4)), this._parser.registerCsiHandler({ final: "n" }, (e4) => this.deviceStatus(e4)), this._parser.registerCsiHandler({ prefix: "?", final: "n" }, (e4) => this.deviceStatusPrivate(e4)), this._parser.registerCsiHandler({ intermediates: "!", final: "p" }, (e4) => this.softReset(e4)), this._parser.registerCsiHandler({ intermediates: " ", final: "q" }, (e4) => this.setCursorStyle(e4)), this._parser.registerCsiHandler({ final: "r" }, (e4) => this.setScrollRegion(e4)), this._parser.registerCsiHandler({ final: "s" }, (e4) => this.saveCursor(e4)), this._parser.registerCsiHandler({ final: "t" }, (e4) => this.windowOptions(e4)), this._parser.registerCsiHandler({ final: "u" }, (e4) => this.restoreCursor(e4)), this._parser.registerCsiHandler({ intermediates: "'", final: "}" }, (e4) => this.insertColumns(e4)), this._parser.registerCsiHandler({ intermediates: "'", final: "~" }, (e4) => this.deleteColumns(e4)), this._parser.registerCsiHandler({ intermediates: '"', final: "q" }, (e4) => this.selectProtected(e4)), this._parser.registerCsiHandler({ intermediates: "$", final: "p" }, (e4) => this.requestMode(e4, true)), this._parser.registerCsiHandler({ prefix: "?", intermediates: "$", final: "p" }, (e4) => this.requestMode(e4, false)), this._parser.setExecuteHandler(n.C0.BEL, () => this.bell()), this._parser.setExecuteHandler(n.C0.LF, () => this.lineFeed()), this._parser.setExecuteHandler(n.C0.VT, () => this.lineFeed()), this._parser.setExecuteHandler(n.C0.FF, () => this.lineFeed()), this._parser.setExecuteHandler(n.C0.CR, () => this.carriageReturn()), this._parser.setExecuteHandler(n.C0.BS, () => this.backspace()), this._parser.setExecuteHandler(n.C0.HT, () => this.tab()), this._parser.setExecuteHandler(n.C0.SO, () => this.shiftOut()), this._parser.setExecuteHandler(n.C0.SI, () => this.shiftIn()), this._parser.setExecuteHandler(n.C1.IND, () => this.index()), this._parser.setExecuteHandler(n.C1.NEL, () => this.nextLine()), this._parser.setExecuteHandler(n.C1.HTS, () => this.tabSet()), this._parser.registerOscHandler(0, new g.OscHandler((e4) => (this.setTitle(e4), this.setIconName(e4), true))), this._parser.registerOscHandler(1, new g.OscHandler((e4) => this.setIconName(e4))), this._parser.registerOscHandler(2, new g.OscHandler((e4) => this.setTitle(e4))), this._parser.registerOscHandler(4, new g.OscHandler((e4) => this.setOrReportIndexedColor(e4))), this._parser.registerOscHandler(8, new g.OscHandler((e4) => this.setHyperlink(e4))), this._parser.registerOscHandler(10, new g.OscHandler((e4) => this.setOrReportFgColor(e4))), this._parser.registerOscHandler(11, new g.OscHandler((e4) => this.setOrReportBgColor(e4))), this._parser.registerOscHandler(12, new g.OscHandler((e4) => this.setOrReportCursorColor(e4))), this._parser.registerOscHandler(104, new g.OscHandler((e4) => this.restoreIndexedColor(e4))), this._parser.registerOscHandler(110, new g.OscHandler((e4) => this.restoreFgColor(e4))), this._parser.registerOscHandler(111, new g.OscHandler((e4) => this.restoreBgColor(e4))), this._parser.registerOscHandler(112, new g.OscHandler((e4) => this.restoreCursorColor(e4))), this._parser.registerEscHandler({ final: "7" }, () => this.saveCursor()), this._parser.registerEscHandler({ final: "8" }, () => this.restoreCursor()), this._parser.registerEscHandler({ final: "D" }, () => this.index()), this._parser.registerEscHandler({ final: "E" }, () => this.nextLine()), this._parser.registerEscHandler({ final: "H" }, () => this.tabSet()), this._parser.registerEscHandler({ final: "M" }, () => this.reverseIndex()), this._parser.registerEscHandler({ final: "=" }, () => this.keypadApplicationMode()), this._parser.registerEscHandler({ final: ">" }, () => this.keypadNumericMode()), this._parser.registerEscHandler({ final: "c" }, () => this.fullReset()), this._parser.registerEscHandler({ final: "n" }, () => this.setgLevel(2)), this._parser.registerEscHandler({ final: "o" }, () => this.setgLevel(3)), this._parser.registerEscHandler({ final: "|" }, () => this.setgLevel(3)), this._parser.registerEscHandler({ final: "}" }, () => this.setgLevel(2)), this._parser.registerEscHandler({ final: "~" }, () => this.setgLevel(1)), this._parser.registerEscHandler({ intermediates: "%", final: "@" }, () => this.selectDefaultCharset()), this._parser.registerEscHandler({ intermediates: "%", final: "G" }, () => this.selectDefaultCharset());
            for (const e4 in o.CHARSETS) this._parser.registerEscHandler({ intermediates: "(", final: e4 }, () => this.selectCharset("(" + e4)), this._parser.registerEscHandler({ intermediates: ")", final: e4 }, () => this.selectCharset(")" + e4)), this._parser.registerEscHandler({ intermediates: "*", final: e4 }, () => this.selectCharset("*" + e4)), this._parser.registerEscHandler({ intermediates: "+", final: e4 }, () => this.selectCharset("+" + e4)), this._parser.registerEscHandler({ intermediates: "-", final: e4 }, () => this.selectCharset("-" + e4)), this._parser.registerEscHandler({ intermediates: ".", final: e4 }, () => this.selectCharset("." + e4)), this._parser.registerEscHandler({ intermediates: "/", final: e4 }, () => this.selectCharset("/" + e4));
            this._parser.registerEscHandler({ intermediates: "#", final: "8" }, () => this.screenAlignmentPattern()), this._parser.setErrorHandler((e4) => (this._logService.error("Parsing error: ", e4), e4)), this._parser.registerDcsHandler({ intermediates: "$", final: "q" }, new m.DcsHandler((e4, t4) => this.requestStatusString(e4, t4)));
          }
          _preserveStack(e3, t3, i3, s3) {
            this._parseStack.paused = true, this._parseStack.cursorStartX = e3, this._parseStack.cursorStartY = t3, this._parseStack.decodedLength = i3, this._parseStack.position = s3;
          }
          _logSlowResolvingAsync(e3) {
            this._logService.logLevel <= v.LogLevelEnum.WARN && Promise.race([e3, new Promise((e4, t3) => setTimeout(() => t3("#SLOW_TIMEOUT"), 5e3))]).catch((e4) => {
              if ("#SLOW_TIMEOUT" !== e4) throw e4;
              console.warn("async parser handler taking longer than 5000 ms");
            });
          }
          _getCurrentLinkId() {
            return this._curAttrData.extended.urlId;
          }
          parse(e3, t3) {
            let i3, s3 = this._activeBuffer.x, r2 = this._activeBuffer.y, n2 = 0;
            const o2 = this._parseStack.paused;
            if (o2) {
              if (i3 = this._parser.parse(this._parseBuffer, this._parseStack.decodedLength, t3)) return this._logSlowResolvingAsync(i3), i3;
              s3 = this._parseStack.cursorStartX, r2 = this._parseStack.cursorStartY, this._parseStack.paused = false, e3.length > b && (n2 = this._parseStack.position + b);
            }
            if (this._logService.logLevel <= v.LogLevelEnum.DEBUG && this._logService.debug("parsing data" + ("string" == typeof e3 ? ` "${e3}"` : ` "${Array.prototype.map.call(e3, (e4) => String.fromCharCode(e4)).join("")}"`), "string" == typeof e3 ? e3.split("").map((e4) => e4.charCodeAt(0)) : e3), this._parseBuffer.length < e3.length && this._parseBuffer.length < b && (this._parseBuffer = new Uint32Array(Math.min(e3.length, b))), o2 || this._dirtyRowTracker.clearRange(), e3.length > b) for (let t4 = n2; t4 < e3.length; t4 += b) {
              const n3 = t4 + b < e3.length ? t4 + b : e3.length, o3 = "string" == typeof e3 ? this._stringDecoder.decode(e3.substring(t4, n3), this._parseBuffer) : this._utf8Decoder.decode(e3.subarray(t4, n3), this._parseBuffer);
              if (i3 = this._parser.parse(this._parseBuffer, o3)) return this._preserveStack(s3, r2, o3, t4), this._logSlowResolvingAsync(i3), i3;
            }
            else if (!o2) {
              const t4 = "string" == typeof e3 ? this._stringDecoder.decode(e3, this._parseBuffer) : this._utf8Decoder.decode(e3, this._parseBuffer);
              if (i3 = this._parser.parse(this._parseBuffer, t4)) return this._preserveStack(s3, r2, t4, 0), this._logSlowResolvingAsync(i3), i3;
            }
            this._activeBuffer.x === s3 && this._activeBuffer.y === r2 || this._onCursorMove.fire();
            const a2 = this._dirtyRowTracker.end + (this._bufferService.buffer.ybase - this._bufferService.buffer.ydisp), h2 = this._dirtyRowTracker.start + (this._bufferService.buffer.ybase - this._bufferService.buffer.ydisp);
            h2 < this._bufferService.rows && this._onRequestRefreshRows.fire(Math.min(h2, this._bufferService.rows - 1), Math.min(a2, this._bufferService.rows - 1));
          }
          print(e3, t3, i3) {
            let s3, r2;
            const n2 = this._charsetService.charset, o2 = this._optionsService.rawOptions.screenReaderMode, a2 = this._bufferService.cols, h2 = this._coreService.decPrivateModes.wraparound, d2 = this._coreService.modes.insertMode, u2 = this._curAttrData;
            let f2 = this._activeBuffer.lines.get(this._activeBuffer.ybase + this._activeBuffer.y);
            this._dirtyRowTracker.markDirty(this._activeBuffer.y), this._activeBuffer.x && i3 - t3 > 0 && 2 === f2.getWidth(this._activeBuffer.x - 1) && f2.setCellFromCodepoint(this._activeBuffer.x - 1, 0, 1, u2);
            let v2 = this._parser.precedingJoinState;
            for (let g2 = t3; g2 < i3; ++g2) {
              if (s3 = e3[g2], s3 < 127 && n2) {
                const e4 = n2[String.fromCharCode(s3)];
                e4 && (s3 = e4.charCodeAt(0));
              }
              const t4 = this._unicodeService.charProperties(s3, v2);
              r2 = p.UnicodeService.extractWidth(t4);
              const i4 = p.UnicodeService.extractShouldJoin(t4), m2 = i4 ? p.UnicodeService.extractWidth(v2) : 0;
              if (v2 = t4, o2 && this._onA11yChar.fire((0, c.stringFromCodePoint)(s3)), this._getCurrentLinkId() && this._oscLinkService.addLineToLink(this._getCurrentLinkId(), this._activeBuffer.ybase + this._activeBuffer.y), this._activeBuffer.x + r2 - m2 > a2) {
                if (h2) {
                  const e4 = f2;
                  let t5 = this._activeBuffer.x - m2;
                  for (this._activeBuffer.x = m2, this._activeBuffer.y++, this._activeBuffer.y === this._activeBuffer.scrollBottom + 1 ? (this._activeBuffer.y--, this._bufferService.scroll(this._eraseAttrData(), true)) : (this._activeBuffer.y >= this._bufferService.rows && (this._activeBuffer.y = this._bufferService.rows - 1), this._activeBuffer.lines.get(this._activeBuffer.ybase + this._activeBuffer.y).isWrapped = true), f2 = this._activeBuffer.lines.get(this._activeBuffer.ybase + this._activeBuffer.y), m2 > 0 && f2 instanceof l.BufferLine && f2.copyCellsFrom(e4, t5, 0, m2, false); t5 < a2; ) e4.setCellFromCodepoint(t5++, 0, 1, u2);
                } else if (this._activeBuffer.x = a2 - 1, 2 === r2) continue;
              }
              if (i4 && this._activeBuffer.x) {
                const e4 = f2.getWidth(this._activeBuffer.x - 1) ? 1 : 2;
                f2.addCodepointToCell(this._activeBuffer.x - e4, s3, r2);
                for (let e5 = r2 - m2; --e5 >= 0; ) f2.setCellFromCodepoint(this._activeBuffer.x++, 0, 0, u2);
              } else if (d2 && (f2.insertCells(this._activeBuffer.x, r2 - m2, this._activeBuffer.getNullCell(u2)), 2 === f2.getWidth(a2 - 1) && f2.setCellFromCodepoint(a2 - 1, _.NULL_CELL_CODE, _.NULL_CELL_WIDTH, u2)), f2.setCellFromCodepoint(this._activeBuffer.x++, s3, r2, u2), r2 > 0) for (; --r2; ) f2.setCellFromCodepoint(this._activeBuffer.x++, 0, 0, u2);
            }
            this._parser.precedingJoinState = v2, this._activeBuffer.x < a2 && i3 - t3 > 0 && 0 === f2.getWidth(this._activeBuffer.x) && !f2.hasContent(this._activeBuffer.x) && f2.setCellFromCodepoint(this._activeBuffer.x, 0, 1, u2), this._dirtyRowTracker.markDirty(this._activeBuffer.y);
          }
          registerCsiHandler(e3, t3) {
            return "t" !== e3.final || e3.prefix || e3.intermediates ? this._parser.registerCsiHandler(e3, t3) : this._parser.registerCsiHandler(e3, (e4) => !w(e4.params[0], this._optionsService.rawOptions.windowOptions) || t3(e4));
          }
          registerDcsHandler(e3, t3) {
            return this._parser.registerDcsHandler(e3, new m.DcsHandler(t3));
          }
          registerEscHandler(e3, t3) {
            return this._parser.registerEscHandler(e3, t3);
          }
          registerOscHandler(e3, t3) {
            return this._parser.registerOscHandler(e3, new g.OscHandler(t3));
          }
          bell() {
            return this._onRequestBell.fire(), true;
          }
          lineFeed() {
            return this._dirtyRowTracker.markDirty(this._activeBuffer.y), this._optionsService.rawOptions.convertEol && (this._activeBuffer.x = 0), this._activeBuffer.y++, this._activeBuffer.y === this._activeBuffer.scrollBottom + 1 ? (this._activeBuffer.y--, this._bufferService.scroll(this._eraseAttrData())) : this._activeBuffer.y >= this._bufferService.rows ? this._activeBuffer.y = this._bufferService.rows - 1 : this._activeBuffer.lines.get(this._activeBuffer.ybase + this._activeBuffer.y).isWrapped = false, this._activeBuffer.x >= this._bufferService.cols && this._activeBuffer.x--, this._dirtyRowTracker.markDirty(this._activeBuffer.y), this._onLineFeed.fire(), true;
          }
          carriageReturn() {
            return this._activeBuffer.x = 0, true;
          }
          backspace() {
            var _a2;
            if (!this._coreService.decPrivateModes.reverseWraparound) return this._restrictCursor(), this._activeBuffer.x > 0 && this._activeBuffer.x--, true;
            if (this._restrictCursor(this._bufferService.cols), this._activeBuffer.x > 0) this._activeBuffer.x--;
            else if (0 === this._activeBuffer.x && this._activeBuffer.y > this._activeBuffer.scrollTop && this._activeBuffer.y <= this._activeBuffer.scrollBottom && ((_a2 = this._activeBuffer.lines.get(this._activeBuffer.ybase + this._activeBuffer.y)) == null ? void 0 : _a2.isWrapped)) {
              this._activeBuffer.lines.get(this._activeBuffer.ybase + this._activeBuffer.y).isWrapped = false, this._activeBuffer.y--, this._activeBuffer.x = this._bufferService.cols - 1;
              const e3 = this._activeBuffer.lines.get(this._activeBuffer.ybase + this._activeBuffer.y);
              e3.hasWidth(this._activeBuffer.x) && !e3.hasContent(this._activeBuffer.x) && this._activeBuffer.x--;
            }
            return this._restrictCursor(), true;
          }
          tab() {
            if (this._activeBuffer.x >= this._bufferService.cols) return true;
            const e3 = this._activeBuffer.x;
            return this._activeBuffer.x = this._activeBuffer.nextStop(), this._optionsService.rawOptions.screenReaderMode && this._onA11yTab.fire(this._activeBuffer.x - e3), true;
          }
          shiftOut() {
            return this._charsetService.setgLevel(1), true;
          }
          shiftIn() {
            return this._charsetService.setgLevel(0), true;
          }
          _restrictCursor(e3 = this._bufferService.cols - 1) {
            this._activeBuffer.x = Math.min(e3, Math.max(0, this._activeBuffer.x)), this._activeBuffer.y = this._coreService.decPrivateModes.origin ? Math.min(this._activeBuffer.scrollBottom, Math.max(this._activeBuffer.scrollTop, this._activeBuffer.y)) : Math.min(this._bufferService.rows - 1, Math.max(0, this._activeBuffer.y)), this._dirtyRowTracker.markDirty(this._activeBuffer.y);
          }
          _setCursor(e3, t3) {
            this._dirtyRowTracker.markDirty(this._activeBuffer.y), this._coreService.decPrivateModes.origin ? (this._activeBuffer.x = e3, this._activeBuffer.y = this._activeBuffer.scrollTop + t3) : (this._activeBuffer.x = e3, this._activeBuffer.y = t3), this._restrictCursor(), this._dirtyRowTracker.markDirty(this._activeBuffer.y);
          }
          _moveCursor(e3, t3) {
            this._restrictCursor(), this._setCursor(this._activeBuffer.x + e3, this._activeBuffer.y + t3);
          }
          cursorUp(e3) {
            const t3 = this._activeBuffer.y - this._activeBuffer.scrollTop;
            return t3 >= 0 ? this._moveCursor(0, -Math.min(t3, e3.params[0] || 1)) : this._moveCursor(0, -(e3.params[0] || 1)), true;
          }
          cursorDown(e3) {
            const t3 = this._activeBuffer.scrollBottom - this._activeBuffer.y;
            return t3 >= 0 ? this._moveCursor(0, Math.min(t3, e3.params[0] || 1)) : this._moveCursor(0, e3.params[0] || 1), true;
          }
          cursorForward(e3) {
            return this._moveCursor(e3.params[0] || 1, 0), true;
          }
          cursorBackward(e3) {
            return this._moveCursor(-(e3.params[0] || 1), 0), true;
          }
          cursorNextLine(e3) {
            return this.cursorDown(e3), this._activeBuffer.x = 0, true;
          }
          cursorPrecedingLine(e3) {
            return this.cursorUp(e3), this._activeBuffer.x = 0, true;
          }
          cursorCharAbsolute(e3) {
            return this._setCursor((e3.params[0] || 1) - 1, this._activeBuffer.y), true;
          }
          cursorPosition(e3) {
            return this._setCursor(e3.length >= 2 ? (e3.params[1] || 1) - 1 : 0, (e3.params[0] || 1) - 1), true;
          }
          charPosAbsolute(e3) {
            return this._setCursor((e3.params[0] || 1) - 1, this._activeBuffer.y), true;
          }
          hPositionRelative(e3) {
            return this._moveCursor(e3.params[0] || 1, 0), true;
          }
          linePosAbsolute(e3) {
            return this._setCursor(this._activeBuffer.x, (e3.params[0] || 1) - 1), true;
          }
          vPositionRelative(e3) {
            return this._moveCursor(0, e3.params[0] || 1), true;
          }
          hVPosition(e3) {
            return this.cursorPosition(e3), true;
          }
          tabClear(e3) {
            const t3 = e3.params[0];
            return 0 === t3 ? delete this._activeBuffer.tabs[this._activeBuffer.x] : 3 === t3 && (this._activeBuffer.tabs = {}), true;
          }
          cursorForwardTab(e3) {
            if (this._activeBuffer.x >= this._bufferService.cols) return true;
            let t3 = e3.params[0] || 1;
            for (; t3--; ) this._activeBuffer.x = this._activeBuffer.nextStop();
            return true;
          }
          cursorBackwardTab(e3) {
            if (this._activeBuffer.x >= this._bufferService.cols) return true;
            let t3 = e3.params[0] || 1;
            for (; t3--; ) this._activeBuffer.x = this._activeBuffer.prevStop();
            return true;
          }
          selectProtected(e3) {
            const t3 = e3.params[0];
            return 1 === t3 && (this._curAttrData.bg |= 536870912), 2 !== t3 && 0 !== t3 || (this._curAttrData.bg &= -536870913), true;
          }
          _eraseInBufferLine(e3, t3, i3, s3 = false, r2 = false) {
            const n2 = this._activeBuffer.lines.get(this._activeBuffer.ybase + e3);
            n2.replaceCells(t3, i3, this._activeBuffer.getNullCell(this._eraseAttrData()), r2), s3 && (n2.isWrapped = false);
          }
          _resetBufferLine(e3, t3 = false) {
            const i3 = this._activeBuffer.lines.get(this._activeBuffer.ybase + e3);
            i3 && (i3.fill(this._activeBuffer.getNullCell(this._eraseAttrData()), t3), this._bufferService.buffer.clearMarkers(this._activeBuffer.ybase + e3), i3.isWrapped = false);
          }
          eraseInDisplay(e3, t3 = false) {
            let i3;
            switch (this._restrictCursor(this._bufferService.cols), e3.params[0]) {
              case 0:
                for (i3 = this._activeBuffer.y, this._dirtyRowTracker.markDirty(i3), this._eraseInBufferLine(i3++, this._activeBuffer.x, this._bufferService.cols, 0 === this._activeBuffer.x, t3); i3 < this._bufferService.rows; i3++) this._resetBufferLine(i3, t3);
                this._dirtyRowTracker.markDirty(i3);
                break;
              case 1:
                for (i3 = this._activeBuffer.y, this._dirtyRowTracker.markDirty(i3), this._eraseInBufferLine(i3, 0, this._activeBuffer.x + 1, true, t3), this._activeBuffer.x + 1 >= this._bufferService.cols && (this._activeBuffer.lines.get(i3 + 1).isWrapped = false); i3--; ) this._resetBufferLine(i3, t3);
                this._dirtyRowTracker.markDirty(0);
                break;
              case 2:
                for (i3 = this._bufferService.rows, this._dirtyRowTracker.markDirty(i3 - 1); i3--; ) this._resetBufferLine(i3, t3);
                this._dirtyRowTracker.markDirty(0);
                break;
              case 3:
                const e4 = this._activeBuffer.lines.length - this._bufferService.rows;
                e4 > 0 && (this._activeBuffer.lines.trimStart(e4), this._activeBuffer.ybase = Math.max(this._activeBuffer.ybase - e4, 0), this._activeBuffer.ydisp = Math.max(this._activeBuffer.ydisp - e4, 0), this._onScroll.fire(0));
            }
            return true;
          }
          eraseInLine(e3, t3 = false) {
            switch (this._restrictCursor(this._bufferService.cols), e3.params[0]) {
              case 0:
                this._eraseInBufferLine(this._activeBuffer.y, this._activeBuffer.x, this._bufferService.cols, 0 === this._activeBuffer.x, t3);
                break;
              case 1:
                this._eraseInBufferLine(this._activeBuffer.y, 0, this._activeBuffer.x + 1, false, t3);
                break;
              case 2:
                this._eraseInBufferLine(this._activeBuffer.y, 0, this._bufferService.cols, true, t3);
            }
            return this._dirtyRowTracker.markDirty(this._activeBuffer.y), true;
          }
          insertLines(e3) {
            this._restrictCursor();
            let t3 = e3.params[0] || 1;
            if (this._activeBuffer.y > this._activeBuffer.scrollBottom || this._activeBuffer.y < this._activeBuffer.scrollTop) return true;
            const i3 = this._activeBuffer.ybase + this._activeBuffer.y, s3 = this._bufferService.rows - 1 - this._activeBuffer.scrollBottom, r2 = this._bufferService.rows - 1 + this._activeBuffer.ybase - s3 + 1;
            for (; t3--; ) this._activeBuffer.lines.splice(r2 - 1, 1), this._activeBuffer.lines.splice(i3, 0, this._activeBuffer.getBlankLine(this._eraseAttrData()));
            return this._dirtyRowTracker.markRangeDirty(this._activeBuffer.y, this._activeBuffer.scrollBottom), this._activeBuffer.x = 0, true;
          }
          deleteLines(e3) {
            this._restrictCursor();
            let t3 = e3.params[0] || 1;
            if (this._activeBuffer.y > this._activeBuffer.scrollBottom || this._activeBuffer.y < this._activeBuffer.scrollTop) return true;
            const i3 = this._activeBuffer.ybase + this._activeBuffer.y;
            let s3;
            for (s3 = this._bufferService.rows - 1 - this._activeBuffer.scrollBottom, s3 = this._bufferService.rows - 1 + this._activeBuffer.ybase - s3; t3--; ) this._activeBuffer.lines.splice(i3, 1), this._activeBuffer.lines.splice(s3, 0, this._activeBuffer.getBlankLine(this._eraseAttrData()));
            return this._dirtyRowTracker.markRangeDirty(this._activeBuffer.y, this._activeBuffer.scrollBottom), this._activeBuffer.x = 0, true;
          }
          insertChars(e3) {
            this._restrictCursor();
            const t3 = this._activeBuffer.lines.get(this._activeBuffer.ybase + this._activeBuffer.y);
            return t3 && (t3.insertCells(this._activeBuffer.x, e3.params[0] || 1, this._activeBuffer.getNullCell(this._eraseAttrData())), this._dirtyRowTracker.markDirty(this._activeBuffer.y)), true;
          }
          deleteChars(e3) {
            this._restrictCursor();
            const t3 = this._activeBuffer.lines.get(this._activeBuffer.ybase + this._activeBuffer.y);
            return t3 && (t3.deleteCells(this._activeBuffer.x, e3.params[0] || 1, this._activeBuffer.getNullCell(this._eraseAttrData())), this._dirtyRowTracker.markDirty(this._activeBuffer.y)), true;
          }
          scrollUp(e3) {
            let t3 = e3.params[0] || 1;
            for (; t3--; ) this._activeBuffer.lines.splice(this._activeBuffer.ybase + this._activeBuffer.scrollTop, 1), this._activeBuffer.lines.splice(this._activeBuffer.ybase + this._activeBuffer.scrollBottom, 0, this._activeBuffer.getBlankLine(this._eraseAttrData()));
            return this._dirtyRowTracker.markRangeDirty(this._activeBuffer.scrollTop, this._activeBuffer.scrollBottom), true;
          }
          scrollDown(e3) {
            let t3 = e3.params[0] || 1;
            for (; t3--; ) this._activeBuffer.lines.splice(this._activeBuffer.ybase + this._activeBuffer.scrollBottom, 1), this._activeBuffer.lines.splice(this._activeBuffer.ybase + this._activeBuffer.scrollTop, 0, this._activeBuffer.getBlankLine(l.DEFAULT_ATTR_DATA));
            return this._dirtyRowTracker.markRangeDirty(this._activeBuffer.scrollTop, this._activeBuffer.scrollBottom), true;
          }
          scrollLeft(e3) {
            if (this._activeBuffer.y > this._activeBuffer.scrollBottom || this._activeBuffer.y < this._activeBuffer.scrollTop) return true;
            const t3 = e3.params[0] || 1;
            for (let e4 = this._activeBuffer.scrollTop; e4 <= this._activeBuffer.scrollBottom; ++e4) {
              const i3 = this._activeBuffer.lines.get(this._activeBuffer.ybase + e4);
              i3.deleteCells(0, t3, this._activeBuffer.getNullCell(this._eraseAttrData())), i3.isWrapped = false;
            }
            return this._dirtyRowTracker.markRangeDirty(this._activeBuffer.scrollTop, this._activeBuffer.scrollBottom), true;
          }
          scrollRight(e3) {
            if (this._activeBuffer.y > this._activeBuffer.scrollBottom || this._activeBuffer.y < this._activeBuffer.scrollTop) return true;
            const t3 = e3.params[0] || 1;
            for (let e4 = this._activeBuffer.scrollTop; e4 <= this._activeBuffer.scrollBottom; ++e4) {
              const i3 = this._activeBuffer.lines.get(this._activeBuffer.ybase + e4);
              i3.insertCells(0, t3, this._activeBuffer.getNullCell(this._eraseAttrData())), i3.isWrapped = false;
            }
            return this._dirtyRowTracker.markRangeDirty(this._activeBuffer.scrollTop, this._activeBuffer.scrollBottom), true;
          }
          insertColumns(e3) {
            if (this._activeBuffer.y > this._activeBuffer.scrollBottom || this._activeBuffer.y < this._activeBuffer.scrollTop) return true;
            const t3 = e3.params[0] || 1;
            for (let e4 = this._activeBuffer.scrollTop; e4 <= this._activeBuffer.scrollBottom; ++e4) {
              const i3 = this._activeBuffer.lines.get(this._activeBuffer.ybase + e4);
              i3.insertCells(this._activeBuffer.x, t3, this._activeBuffer.getNullCell(this._eraseAttrData())), i3.isWrapped = false;
            }
            return this._dirtyRowTracker.markRangeDirty(this._activeBuffer.scrollTop, this._activeBuffer.scrollBottom), true;
          }
          deleteColumns(e3) {
            if (this._activeBuffer.y > this._activeBuffer.scrollBottom || this._activeBuffer.y < this._activeBuffer.scrollTop) return true;
            const t3 = e3.params[0] || 1;
            for (let e4 = this._activeBuffer.scrollTop; e4 <= this._activeBuffer.scrollBottom; ++e4) {
              const i3 = this._activeBuffer.lines.get(this._activeBuffer.ybase + e4);
              i3.deleteCells(this._activeBuffer.x, t3, this._activeBuffer.getNullCell(this._eraseAttrData())), i3.isWrapped = false;
            }
            return this._dirtyRowTracker.markRangeDirty(this._activeBuffer.scrollTop, this._activeBuffer.scrollBottom), true;
          }
          eraseChars(e3) {
            this._restrictCursor();
            const t3 = this._activeBuffer.lines.get(this._activeBuffer.ybase + this._activeBuffer.y);
            return t3 && (t3.replaceCells(this._activeBuffer.x, this._activeBuffer.x + (e3.params[0] || 1), this._activeBuffer.getNullCell(this._eraseAttrData())), this._dirtyRowTracker.markDirty(this._activeBuffer.y)), true;
          }
          repeatPrecedingCharacter(e3) {
            const t3 = this._parser.precedingJoinState;
            if (!t3) return true;
            const i3 = e3.params[0] || 1, s3 = p.UnicodeService.extractWidth(t3), r2 = this._activeBuffer.x - s3, n2 = this._activeBuffer.lines.get(this._activeBuffer.ybase + this._activeBuffer.y).getString(r2), o2 = new Uint32Array(n2.length * i3);
            let a2 = 0;
            for (let e4 = 0; e4 < n2.length; ) {
              const t4 = n2.codePointAt(e4) || 0;
              o2[a2++] = t4, e4 += t4 > 65535 ? 2 : 1;
            }
            let h2 = a2;
            for (let e4 = 1; e4 < i3; ++e4) o2.copyWithin(h2, 0, a2), h2 += a2;
            return this.print(o2, 0, h2), true;
          }
          sendDeviceAttributesPrimary(e3) {
            return e3.params[0] > 0 || (this._is("xterm") || this._is("rxvt-unicode") || this._is("screen") ? this._coreService.triggerDataEvent(n.C0.ESC + "[?1;2c") : this._is("linux") && this._coreService.triggerDataEvent(n.C0.ESC + "[?6c")), true;
          }
          sendDeviceAttributesSecondary(e3) {
            return e3.params[0] > 0 || (this._is("xterm") ? this._coreService.triggerDataEvent(n.C0.ESC + "[>0;276;0c") : this._is("rxvt-unicode") ? this._coreService.triggerDataEvent(n.C0.ESC + "[>85;95;0c") : this._is("linux") ? this._coreService.triggerDataEvent(e3.params[0] + "c") : this._is("screen") && this._coreService.triggerDataEvent(n.C0.ESC + "[>83;40003;0c")), true;
          }
          _is(e3) {
            return 0 === (this._optionsService.rawOptions.termName + "").indexOf(e3);
          }
          setMode(e3) {
            for (let t3 = 0; t3 < e3.length; t3++) switch (e3.params[t3]) {
              case 4:
                this._coreService.modes.insertMode = true;
                break;
              case 20:
                this._optionsService.options.convertEol = true;
            }
            return true;
          }
          setModePrivate(e3) {
            for (let t3 = 0; t3 < e3.length; t3++) switch (e3.params[t3]) {
              case 1:
                this._coreService.decPrivateModes.applicationCursorKeys = true;
                break;
              case 2:
                this._charsetService.setgCharset(0, o.DEFAULT_CHARSET), this._charsetService.setgCharset(1, o.DEFAULT_CHARSET), this._charsetService.setgCharset(2, o.DEFAULT_CHARSET), this._charsetService.setgCharset(3, o.DEFAULT_CHARSET);
                break;
              case 3:
                this._optionsService.rawOptions.windowOptions.setWinLines && (this._bufferService.resize(132, this._bufferService.rows), this._onRequestReset.fire());
                break;
              case 6:
                this._coreService.decPrivateModes.origin = true, this._setCursor(0, 0);
                break;
              case 7:
                this._coreService.decPrivateModes.wraparound = true;
                break;
              case 12:
                this._optionsService.options.cursorBlink = true;
                break;
              case 45:
                this._coreService.decPrivateModes.reverseWraparound = true;
                break;
              case 66:
                this._logService.debug("Serial port requested application keypad."), this._coreService.decPrivateModes.applicationKeypad = true, this._onRequestSyncScrollBar.fire();
                break;
              case 9:
                this._coreMouseService.activeProtocol = "X10";
                break;
              case 1e3:
                this._coreMouseService.activeProtocol = "VT200";
                break;
              case 1002:
                this._coreMouseService.activeProtocol = "DRAG";
                break;
              case 1003:
                this._coreMouseService.activeProtocol = "ANY";
                break;
              case 1004:
                this._coreService.decPrivateModes.sendFocus = true, this._onRequestSendFocus.fire();
                break;
              case 1005:
                this._logService.debug("DECSET 1005 not supported (see #2507)");
                break;
              case 1006:
                this._coreMouseService.activeEncoding = "SGR";
                break;
              case 1015:
                this._logService.debug("DECSET 1015 not supported (see #2507)");
                break;
              case 1016:
                this._coreMouseService.activeEncoding = "SGR_PIXELS";
                break;
              case 25:
                this._coreService.isCursorHidden = false;
                break;
              case 1048:
                this.saveCursor();
                break;
              case 1049:
                this.saveCursor();
              case 47:
              case 1047:
                this._bufferService.buffers.activateAltBuffer(this._eraseAttrData()), this._coreService.isCursorInitialized = true, this._onRequestRefreshRows.fire(0, this._bufferService.rows - 1), this._onRequestSyncScrollBar.fire();
                break;
              case 2004:
                this._coreService.decPrivateModes.bracketedPasteMode = true;
            }
            return true;
          }
          resetMode(e3) {
            for (let t3 = 0; t3 < e3.length; t3++) switch (e3.params[t3]) {
              case 4:
                this._coreService.modes.insertMode = false;
                break;
              case 20:
                this._optionsService.options.convertEol = false;
            }
            return true;
          }
          resetModePrivate(e3) {
            for (let t3 = 0; t3 < e3.length; t3++) switch (e3.params[t3]) {
              case 1:
                this._coreService.decPrivateModes.applicationCursorKeys = false;
                break;
              case 3:
                this._optionsService.rawOptions.windowOptions.setWinLines && (this._bufferService.resize(80, this._bufferService.rows), this._onRequestReset.fire());
                break;
              case 6:
                this._coreService.decPrivateModes.origin = false, this._setCursor(0, 0);
                break;
              case 7:
                this._coreService.decPrivateModes.wraparound = false;
                break;
              case 12:
                this._optionsService.options.cursorBlink = false;
                break;
              case 45:
                this._coreService.decPrivateModes.reverseWraparound = false;
                break;
              case 66:
                this._logService.debug("Switching back to normal keypad."), this._coreService.decPrivateModes.applicationKeypad = false, this._onRequestSyncScrollBar.fire();
                break;
              case 9:
              case 1e3:
              case 1002:
              case 1003:
                this._coreMouseService.activeProtocol = "NONE";
                break;
              case 1004:
                this._coreService.decPrivateModes.sendFocus = false;
                break;
              case 1005:
                this._logService.debug("DECRST 1005 not supported (see #2507)");
                break;
              case 1006:
              case 1016:
                this._coreMouseService.activeEncoding = "DEFAULT";
                break;
              case 1015:
                this._logService.debug("DECRST 1015 not supported (see #2507)");
                break;
              case 25:
                this._coreService.isCursorHidden = true;
                break;
              case 1048:
                this.restoreCursor();
                break;
              case 1049:
              case 47:
              case 1047:
                this._bufferService.buffers.activateNormalBuffer(), 1049 === e3.params[t3] && this.restoreCursor(), this._coreService.isCursorInitialized = true, this._onRequestRefreshRows.fire(0, this._bufferService.rows - 1), this._onRequestSyncScrollBar.fire();
                break;
              case 2004:
                this._coreService.decPrivateModes.bracketedPasteMode = false;
            }
            return true;
          }
          requestMode(e3, t3) {
            const i3 = this._coreService.decPrivateModes, { activeProtocol: s3, activeEncoding: r2 } = this._coreMouseService, o2 = this._coreService, { buffers: a2, cols: h2 } = this._bufferService, { active: c2, alt: l2 } = a2, d2 = this._optionsService.rawOptions, _2 = (e4) => e4 ? 1 : 2, u2 = e3.params[0];
            return f2 = u2, v2 = t3 ? 2 === u2 ? 4 : 4 === u2 ? _2(o2.modes.insertMode) : 12 === u2 ? 3 : 20 === u2 ? _2(d2.convertEol) : 0 : 1 === u2 ? _2(i3.applicationCursorKeys) : 3 === u2 ? d2.windowOptions.setWinLines ? 80 === h2 ? 2 : 132 === h2 ? 1 : 0 : 0 : 6 === u2 ? _2(i3.origin) : 7 === u2 ? _2(i3.wraparound) : 8 === u2 ? 3 : 9 === u2 ? _2("X10" === s3) : 12 === u2 ? _2(d2.cursorBlink) : 25 === u2 ? _2(!o2.isCursorHidden) : 45 === u2 ? _2(i3.reverseWraparound) : 66 === u2 ? _2(i3.applicationKeypad) : 67 === u2 ? 4 : 1e3 === u2 ? _2("VT200" === s3) : 1002 === u2 ? _2("DRAG" === s3) : 1003 === u2 ? _2("ANY" === s3) : 1004 === u2 ? _2(i3.sendFocus) : 1005 === u2 ? 4 : 1006 === u2 ? _2("SGR" === r2) : 1015 === u2 ? 4 : 1016 === u2 ? _2("SGR_PIXELS" === r2) : 1048 === u2 ? 1 : 47 === u2 || 1047 === u2 || 1049 === u2 ? _2(c2 === l2) : 2004 === u2 ? _2(i3.bracketedPasteMode) : 0, o2.triggerDataEvent(`${n.C0.ESC}[${t3 ? "" : "?"}${f2};${v2}$y`), true;
            var f2, v2;
          }
          _updateAttrColor(e3, t3, i3, s3, r2) {
            return 2 === t3 ? (e3 |= 50331648, e3 &= -16777216, e3 |= f.AttributeData.fromColorRGB([i3, s3, r2])) : 5 === t3 && (e3 &= -50331904, e3 |= 33554432 | 255 & i3), e3;
          }
          _extractColor(e3, t3, i3) {
            const s3 = [0, 0, -1, 0, 0, 0];
            let r2 = 0, n2 = 0;
            do {
              if (s3[n2 + r2] = e3.params[t3 + n2], e3.hasSubParams(t3 + n2)) {
                const i4 = e3.getSubParams(t3 + n2);
                let o2 = 0;
                do {
                  5 === s3[1] && (r2 = 1), s3[n2 + o2 + 1 + r2] = i4[o2];
                } while (++o2 < i4.length && o2 + n2 + 1 + r2 < s3.length);
                break;
              }
              if (5 === s3[1] && n2 + r2 >= 2 || 2 === s3[1] && n2 + r2 >= 5) break;
              s3[1] && (r2 = 1);
            } while (++n2 + t3 < e3.length && n2 + r2 < s3.length);
            for (let e4 = 2; e4 < s3.length; ++e4) -1 === s3[e4] && (s3[e4] = 0);
            switch (s3[0]) {
              case 38:
                i3.fg = this._updateAttrColor(i3.fg, s3[1], s3[3], s3[4], s3[5]);
                break;
              case 48:
                i3.bg = this._updateAttrColor(i3.bg, s3[1], s3[3], s3[4], s3[5]);
                break;
              case 58:
                i3.extended = i3.extended.clone(), i3.extended.underlineColor = this._updateAttrColor(i3.extended.underlineColor, s3[1], s3[3], s3[4], s3[5]);
            }
            return n2;
          }
          _processUnderline(e3, t3) {
            t3.extended = t3.extended.clone(), (!~e3 || e3 > 5) && (e3 = 1), t3.extended.underlineStyle = e3, t3.fg |= 268435456, 0 === e3 && (t3.fg &= -268435457), t3.updateExtended();
          }
          _processSGR0(e3) {
            e3.fg = l.DEFAULT_ATTR_DATA.fg, e3.bg = l.DEFAULT_ATTR_DATA.bg, e3.extended = e3.extended.clone(), e3.extended.underlineStyle = 0, e3.extended.underlineColor &= -67108864, e3.updateExtended();
          }
          charAttributes(e3) {
            if (1 === e3.length && 0 === e3.params[0]) return this._processSGR0(this._curAttrData), true;
            const t3 = e3.length;
            let i3;
            const s3 = this._curAttrData;
            for (let r2 = 0; r2 < t3; r2++) i3 = e3.params[r2], i3 >= 30 && i3 <= 37 ? (s3.fg &= -50331904, s3.fg |= 16777216 | i3 - 30) : i3 >= 40 && i3 <= 47 ? (s3.bg &= -50331904, s3.bg |= 16777216 | i3 - 40) : i3 >= 90 && i3 <= 97 ? (s3.fg &= -50331904, s3.fg |= 16777224 | i3 - 90) : i3 >= 100 && i3 <= 107 ? (s3.bg &= -50331904, s3.bg |= 16777224 | i3 - 100) : 0 === i3 ? this._processSGR0(s3) : 1 === i3 ? s3.fg |= 134217728 : 3 === i3 ? s3.bg |= 67108864 : 4 === i3 ? (s3.fg |= 268435456, this._processUnderline(e3.hasSubParams(r2) ? e3.getSubParams(r2)[0] : 1, s3)) : 5 === i3 ? s3.fg |= 536870912 : 7 === i3 ? s3.fg |= 67108864 : 8 === i3 ? s3.fg |= 1073741824 : 9 === i3 ? s3.fg |= 2147483648 : 2 === i3 ? s3.bg |= 134217728 : 21 === i3 ? this._processUnderline(2, s3) : 22 === i3 ? (s3.fg &= -134217729, s3.bg &= -134217729) : 23 === i3 ? s3.bg &= -67108865 : 24 === i3 ? (s3.fg &= -268435457, this._processUnderline(0, s3)) : 25 === i3 ? s3.fg &= -536870913 : 27 === i3 ? s3.fg &= -67108865 : 28 === i3 ? s3.fg &= -1073741825 : 29 === i3 ? s3.fg &= 2147483647 : 39 === i3 ? (s3.fg &= -67108864, s3.fg |= 16777215 & l.DEFAULT_ATTR_DATA.fg) : 49 === i3 ? (s3.bg &= -67108864, s3.bg |= 16777215 & l.DEFAULT_ATTR_DATA.bg) : 38 === i3 || 48 === i3 || 58 === i3 ? r2 += this._extractColor(e3, r2, s3) : 53 === i3 ? s3.bg |= 1073741824 : 55 === i3 ? s3.bg &= -1073741825 : 59 === i3 ? (s3.extended = s3.extended.clone(), s3.extended.underlineColor = -1, s3.updateExtended()) : 100 === i3 ? (s3.fg &= -67108864, s3.fg |= 16777215 & l.DEFAULT_ATTR_DATA.fg, s3.bg &= -67108864, s3.bg |= 16777215 & l.DEFAULT_ATTR_DATA.bg) : this._logService.debug("Unknown SGR attribute: %d.", i3);
            return true;
          }
          deviceStatus(e3) {
            switch (e3.params[0]) {
              case 5:
                this._coreService.triggerDataEvent(`${n.C0.ESC}[0n`);
                break;
              case 6:
                const e4 = this._activeBuffer.y + 1, t3 = this._activeBuffer.x + 1;
                this._coreService.triggerDataEvent(`${n.C0.ESC}[${e4};${t3}R`);
            }
            return true;
          }
          deviceStatusPrivate(e3) {
            if (6 === e3.params[0]) {
              const e4 = this._activeBuffer.y + 1, t3 = this._activeBuffer.x + 1;
              this._coreService.triggerDataEvent(`${n.C0.ESC}[?${e4};${t3}R`);
            }
            return true;
          }
          softReset(e3) {
            return this._coreService.isCursorHidden = false, this._onRequestSyncScrollBar.fire(), this._activeBuffer.scrollTop = 0, this._activeBuffer.scrollBottom = this._bufferService.rows - 1, this._curAttrData = l.DEFAULT_ATTR_DATA.clone(), this._coreService.reset(), this._charsetService.reset(), this._activeBuffer.savedX = 0, this._activeBuffer.savedY = this._activeBuffer.ybase, this._activeBuffer.savedCurAttrData.fg = this._curAttrData.fg, this._activeBuffer.savedCurAttrData.bg = this._curAttrData.bg, this._activeBuffer.savedCharset = this._charsetService.charset, this._coreService.decPrivateModes.origin = false, true;
          }
          setCursorStyle(e3) {
            const t3 = e3.params[0] || 1;
            switch (t3) {
              case 1:
              case 2:
                this._optionsService.options.cursorStyle = "block";
                break;
              case 3:
              case 4:
                this._optionsService.options.cursorStyle = "underline";
                break;
              case 5:
              case 6:
                this._optionsService.options.cursorStyle = "bar";
            }
            const i3 = t3 % 2 == 1;
            return this._optionsService.options.cursorBlink = i3, true;
          }
          setScrollRegion(e3) {
            const t3 = e3.params[0] || 1;
            let i3;
            return (e3.length < 2 || (i3 = e3.params[1]) > this._bufferService.rows || 0 === i3) && (i3 = this._bufferService.rows), i3 > t3 && (this._activeBuffer.scrollTop = t3 - 1, this._activeBuffer.scrollBottom = i3 - 1, this._setCursor(0, 0)), true;
          }
          windowOptions(e3) {
            if (!w(e3.params[0], this._optionsService.rawOptions.windowOptions)) return true;
            const t3 = e3.length > 1 ? e3.params[1] : 0;
            switch (e3.params[0]) {
              case 14:
                2 !== t3 && this._onRequestWindowsOptionsReport.fire(y.GET_WIN_SIZE_PIXELS);
                break;
              case 16:
                this._onRequestWindowsOptionsReport.fire(y.GET_CELL_SIZE_PIXELS);
                break;
              case 18:
                this._bufferService && this._coreService.triggerDataEvent(`${n.C0.ESC}[8;${this._bufferService.rows};${this._bufferService.cols}t`);
                break;
              case 22:
                0 !== t3 && 2 !== t3 || (this._windowTitleStack.push(this._windowTitle), this._windowTitleStack.length > 10 && this._windowTitleStack.shift()), 0 !== t3 && 1 !== t3 || (this._iconNameStack.push(this._iconName), this._iconNameStack.length > 10 && this._iconNameStack.shift());
                break;
              case 23:
                0 !== t3 && 2 !== t3 || this._windowTitleStack.length && this.setTitle(this._windowTitleStack.pop()), 0 !== t3 && 1 !== t3 || this._iconNameStack.length && this.setIconName(this._iconNameStack.pop());
            }
            return true;
          }
          saveCursor(e3) {
            return this._activeBuffer.savedX = this._activeBuffer.x, this._activeBuffer.savedY = this._activeBuffer.ybase + this._activeBuffer.y, this._activeBuffer.savedCurAttrData.fg = this._curAttrData.fg, this._activeBuffer.savedCurAttrData.bg = this._curAttrData.bg, this._activeBuffer.savedCharset = this._charsetService.charset, true;
          }
          restoreCursor(e3) {
            return this._activeBuffer.x = this._activeBuffer.savedX || 0, this._activeBuffer.y = Math.max(this._activeBuffer.savedY - this._activeBuffer.ybase, 0), this._curAttrData.fg = this._activeBuffer.savedCurAttrData.fg, this._curAttrData.bg = this._activeBuffer.savedCurAttrData.bg, this._charsetService.charset = this._savedCharset, this._activeBuffer.savedCharset && (this._charsetService.charset = this._activeBuffer.savedCharset), this._restrictCursor(), true;
          }
          setTitle(e3) {
            return this._windowTitle = e3, this._onTitleChange.fire(e3), true;
          }
          setIconName(e3) {
            return this._iconName = e3, true;
          }
          setOrReportIndexedColor(e3) {
            const t3 = [], i3 = e3.split(";");
            for (; i3.length > 1; ) {
              const e4 = i3.shift(), s3 = i3.shift();
              if (/^\d+$/.exec(e4)) {
                const i4 = parseInt(e4);
                if (D(i4)) if ("?" === s3) t3.push({ type: 0, index: i4 });
                else {
                  const e5 = (0, S.parseColor)(s3);
                  e5 && t3.push({ type: 1, index: i4, color: e5 });
                }
              }
            }
            return t3.length && this._onColor.fire(t3), true;
          }
          setHyperlink(e3) {
            const t3 = e3.split(";");
            return !(t3.length < 2) && (t3[1] ? this._createHyperlink(t3[0], t3[1]) : !t3[0] && this._finishHyperlink());
          }
          _createHyperlink(e3, t3) {
            this._getCurrentLinkId() && this._finishHyperlink();
            const i3 = e3.split(":");
            let s3;
            const r2 = i3.findIndex((e4) => e4.startsWith("id="));
            return -1 !== r2 && (s3 = i3[r2].slice(3) || void 0), this._curAttrData.extended = this._curAttrData.extended.clone(), this._curAttrData.extended.urlId = this._oscLinkService.registerLink({ id: s3, uri: t3 }), this._curAttrData.updateExtended(), true;
          }
          _finishHyperlink() {
            return this._curAttrData.extended = this._curAttrData.extended.clone(), this._curAttrData.extended.urlId = 0, this._curAttrData.updateExtended(), true;
          }
          _setOrReportSpecialColor(e3, t3) {
            const i3 = e3.split(";");
            for (let e4 = 0; e4 < i3.length && !(t3 >= this._specialColors.length); ++e4, ++t3) if ("?" === i3[e4]) this._onColor.fire([{ type: 0, index: this._specialColors[t3] }]);
            else {
              const s3 = (0, S.parseColor)(i3[e4]);
              s3 && this._onColor.fire([{ type: 1, index: this._specialColors[t3], color: s3 }]);
            }
            return true;
          }
          setOrReportFgColor(e3) {
            return this._setOrReportSpecialColor(e3, 0);
          }
          setOrReportBgColor(e3) {
            return this._setOrReportSpecialColor(e3, 1);
          }
          setOrReportCursorColor(e3) {
            return this._setOrReportSpecialColor(e3, 2);
          }
          restoreIndexedColor(e3) {
            if (!e3) return this._onColor.fire([{ type: 2 }]), true;
            const t3 = [], i3 = e3.split(";");
            for (let e4 = 0; e4 < i3.length; ++e4) if (/^\d+$/.exec(i3[e4])) {
              const s3 = parseInt(i3[e4]);
              D(s3) && t3.push({ type: 2, index: s3 });
            }
            return t3.length && this._onColor.fire(t3), true;
          }
          restoreFgColor(e3) {
            return this._onColor.fire([{ type: 2, index: 256 }]), true;
          }
          restoreBgColor(e3) {
            return this._onColor.fire([{ type: 2, index: 257 }]), true;
          }
          restoreCursorColor(e3) {
            return this._onColor.fire([{ type: 2, index: 258 }]), true;
          }
          nextLine() {
            return this._activeBuffer.x = 0, this.index(), true;
          }
          keypadApplicationMode() {
            return this._logService.debug("Serial port requested application keypad."), this._coreService.decPrivateModes.applicationKeypad = true, this._onRequestSyncScrollBar.fire(), true;
          }
          keypadNumericMode() {
            return this._logService.debug("Switching back to normal keypad."), this._coreService.decPrivateModes.applicationKeypad = false, this._onRequestSyncScrollBar.fire(), true;
          }
          selectDefaultCharset() {
            return this._charsetService.setgLevel(0), this._charsetService.setgCharset(0, o.DEFAULT_CHARSET), true;
          }
          selectCharset(e3) {
            return 2 !== e3.length ? (this.selectDefaultCharset(), true) : ("/" === e3[0] || this._charsetService.setgCharset(C[e3[0]], o.CHARSETS[e3[1]] || o.DEFAULT_CHARSET), true);
          }
          index() {
            return this._restrictCursor(), this._activeBuffer.y++, this._activeBuffer.y === this._activeBuffer.scrollBottom + 1 ? (this._activeBuffer.y--, this._bufferService.scroll(this._eraseAttrData())) : this._activeBuffer.y >= this._bufferService.rows && (this._activeBuffer.y = this._bufferService.rows - 1), this._restrictCursor(), true;
          }
          tabSet() {
            return this._activeBuffer.tabs[this._activeBuffer.x] = true, true;
          }
          reverseIndex() {
            if (this._restrictCursor(), this._activeBuffer.y === this._activeBuffer.scrollTop) {
              const e3 = this._activeBuffer.scrollBottom - this._activeBuffer.scrollTop;
              this._activeBuffer.lines.shiftElements(this._activeBuffer.ybase + this._activeBuffer.y, e3, 1), this._activeBuffer.lines.set(this._activeBuffer.ybase + this._activeBuffer.y, this._activeBuffer.getBlankLine(this._eraseAttrData())), this._dirtyRowTracker.markRangeDirty(this._activeBuffer.scrollTop, this._activeBuffer.scrollBottom);
            } else this._activeBuffer.y--, this._restrictCursor();
            return true;
          }
          fullReset() {
            return this._parser.reset(), this._onRequestReset.fire(), true;
          }
          reset() {
            this._curAttrData = l.DEFAULT_ATTR_DATA.clone(), this._eraseAttrDataInternal = l.DEFAULT_ATTR_DATA.clone();
          }
          _eraseAttrData() {
            return this._eraseAttrDataInternal.bg &= -67108864, this._eraseAttrDataInternal.bg |= 67108863 & this._curAttrData.bg, this._eraseAttrDataInternal;
          }
          setgLevel(e3) {
            return this._charsetService.setgLevel(e3), true;
          }
          screenAlignmentPattern() {
            const e3 = new u.CellData();
            e3.content = 1 << 22 | "E".charCodeAt(0), e3.fg = this._curAttrData.fg, e3.bg = this._curAttrData.bg, this._setCursor(0, 0);
            for (let t3 = 0; t3 < this._bufferService.rows; ++t3) {
              const i3 = this._activeBuffer.ybase + this._activeBuffer.y + t3, s3 = this._activeBuffer.lines.get(i3);
              s3 && (s3.fill(e3), s3.isWrapped = false);
            }
            return this._dirtyRowTracker.markAllDirty(), this._setCursor(0, 0), true;
          }
          requestStatusString(e3, t3) {
            const i3 = this._bufferService.buffer, s3 = this._optionsService.rawOptions;
            return ((e4) => (this._coreService.triggerDataEvent(`${n.C0.ESC}${e4}${n.C0.ESC}\\`), true))('"q' === e3 ? `P1$r${this._curAttrData.isProtected() ? 1 : 0}"q` : '"p' === e3 ? 'P1$r61;1"p' : "r" === e3 ? `P1$r${i3.scrollTop + 1};${i3.scrollBottom + 1}r` : "m" === e3 ? "P1$r0m" : " q" === e3 ? `P1$r${{ block: 2, underline: 4, bar: 6 }[s3.cursorStyle] - (s3.cursorBlink ? 1 : 0)} q` : "P0$r");
          }
          markRangeDirty(e3, t3) {
            this._dirtyRowTracker.markRangeDirty(e3, t3);
          }
        }
        t2.InputHandler = k;
        let L = class {
          constructor(e3) {
            this._bufferService = e3, this.clearRange();
          }
          clearRange() {
            this.start = this._bufferService.buffer.y, this.end = this._bufferService.buffer.y;
          }
          markDirty(e3) {
            e3 < this.start ? this.start = e3 : e3 > this.end && (this.end = e3);
          }
          markRangeDirty(e3, t3) {
            e3 > t3 && (E = e3, e3 = t3, t3 = E), e3 < this.start && (this.start = e3), t3 > this.end && (this.end = t3);
          }
          markAllDirty() {
            this.markRangeDirty(0, this._bufferService.rows - 1);
          }
        };
        function D(e3) {
          return 0 <= e3 && e3 < 256;
        }
        L = s2([r(0, v.IBufferService)], L);
      }, 844: (e2, t2) => {
        function i2(e3) {
          for (const t3 of e3) t3.dispose();
          e3.length = 0;
        }
        Object.defineProperty(t2, "__esModule", { value: true }), t2.getDisposeArrayDisposable = t2.disposeArray = t2.toDisposable = t2.MutableDisposable = t2.Disposable = void 0, t2.Disposable = class {
          constructor() {
            this._disposables = [], this._isDisposed = false;
          }
          dispose() {
            this._isDisposed = true;
            for (const e3 of this._disposables) e3.dispose();
            this._disposables.length = 0;
          }
          register(e3) {
            return this._disposables.push(e3), e3;
          }
          unregister(e3) {
            const t3 = this._disposables.indexOf(e3);
            -1 !== t3 && this._disposables.splice(t3, 1);
          }
        }, t2.MutableDisposable = class {
          constructor() {
            this._isDisposed = false;
          }
          get value() {
            return this._isDisposed ? void 0 : this._value;
          }
          set value(e3) {
            var _a2;
            this._isDisposed || e3 === this._value || ((_a2 = this._value) == null ? void 0 : _a2.dispose(), this._value = e3);
          }
          clear() {
            this.value = void 0;
          }
          dispose() {
            var _a2;
            this._isDisposed = true, (_a2 = this._value) == null ? void 0 : _a2.dispose(), this._value = void 0;
          }
        }, t2.toDisposable = function(e3) {
          return { dispose: e3 };
        }, t2.disposeArray = i2, t2.getDisposeArrayDisposable = function(e3) {
          return { dispose: () => i2(e3) };
        };
      }, 1505: (e2, t2) => {
        Object.defineProperty(t2, "__esModule", { value: true }), t2.FourKeyMap = t2.TwoKeyMap = void 0;
        class i2 {
          constructor() {
            this._data = {};
          }
          set(e3, t3, i3) {
            this._data[e3] || (this._data[e3] = {}), this._data[e3][t3] = i3;
          }
          get(e3, t3) {
            return this._data[e3] ? this._data[e3][t3] : void 0;
          }
          clear() {
            this._data = {};
          }
        }
        t2.TwoKeyMap = i2, t2.FourKeyMap = class {
          constructor() {
            this._data = new i2();
          }
          set(e3, t3, s2, r, n) {
            this._data.get(e3, t3) || this._data.set(e3, t3, new i2()), this._data.get(e3, t3).set(s2, r, n);
          }
          get(e3, t3, i3, s2) {
            var _a2;
            return (_a2 = this._data.get(e3, t3)) == null ? void 0 : _a2.get(i3, s2);
          }
          clear() {
            this._data.clear();
          }
        };
      }, 6114: (e2, t2) => {
        Object.defineProperty(t2, "__esModule", { value: true }), t2.isChromeOS = t2.isLinux = t2.isWindows = t2.isIphone = t2.isIpad = t2.isMac = t2.getSafariVersion = t2.isSafari = t2.isLegacyEdge = t2.isFirefox = t2.isNode = void 0, t2.isNode = "undefined" != typeof process && "title" in process;
        const i2 = t2.isNode ? "node" : navigator.userAgent, s2 = t2.isNode ? "node" : navigator.platform;
        t2.isFirefox = i2.includes("Firefox"), t2.isLegacyEdge = i2.includes("Edge"), t2.isSafari = /^((?!chrome|android).)*safari/i.test(i2), t2.getSafariVersion = function() {
          if (!t2.isSafari) return 0;
          const e3 = i2.match(/Version\/(\d+)/);
          return null === e3 || e3.length < 2 ? 0 : parseInt(e3[1]);
        }, t2.isMac = ["Macintosh", "MacIntel", "MacPPC", "Mac68K"].includes(s2), t2.isIpad = "iPad" === s2, t2.isIphone = "iPhone" === s2, t2.isWindows = ["Windows", "Win16", "Win32", "WinCE"].includes(s2), t2.isLinux = s2.indexOf("Linux") >= 0, t2.isChromeOS = /\bCrOS\b/.test(i2);
      }, 6106: (e2, t2) => {
        Object.defineProperty(t2, "__esModule", { value: true }), t2.SortedList = void 0;
        let i2 = 0;
        t2.SortedList = class {
          constructor(e3) {
            this._getKey = e3, this._array = [];
          }
          clear() {
            this._array.length = 0;
          }
          insert(e3) {
            0 !== this._array.length ? (i2 = this._search(this._getKey(e3)), this._array.splice(i2, 0, e3)) : this._array.push(e3);
          }
          delete(e3) {
            if (0 === this._array.length) return false;
            const t3 = this._getKey(e3);
            if (void 0 === t3) return false;
            if (i2 = this._search(t3), -1 === i2) return false;
            if (this._getKey(this._array[i2]) !== t3) return false;
            do {
              if (this._array[i2] === e3) return this._array.splice(i2, 1), true;
            } while (++i2 < this._array.length && this._getKey(this._array[i2]) === t3);
            return false;
          }
          *getKeyIterator(e3) {
            if (0 !== this._array.length && (i2 = this._search(e3), !(i2 < 0 || i2 >= this._array.length) && this._getKey(this._array[i2]) === e3)) do {
              yield this._array[i2];
            } while (++i2 < this._array.length && this._getKey(this._array[i2]) === e3);
          }
          forEachByKey(e3, t3) {
            if (0 !== this._array.length && (i2 = this._search(e3), !(i2 < 0 || i2 >= this._array.length) && this._getKey(this._array[i2]) === e3)) do {
              t3(this._array[i2]);
            } while (++i2 < this._array.length && this._getKey(this._array[i2]) === e3);
          }
          values() {
            return [...this._array].values();
          }
          _search(e3) {
            let t3 = 0, i3 = this._array.length - 1;
            for (; i3 >= t3; ) {
              let s2 = t3 + i3 >> 1;
              const r = this._getKey(this._array[s2]);
              if (r > e3) i3 = s2 - 1;
              else {
                if (!(r < e3)) {
                  for (; s2 > 0 && this._getKey(this._array[s2 - 1]) === e3; ) s2--;
                  return s2;
                }
                t3 = s2 + 1;
              }
            }
            return t3;
          }
        };
      }, 7226: (e2, t2, i2) => {
        Object.defineProperty(t2, "__esModule", { value: true }), t2.DebouncedIdleTask = t2.IdleTaskQueue = t2.PriorityTaskQueue = void 0;
        const s2 = i2(6114);
        class r {
          constructor() {
            this._tasks = [], this._i = 0;
          }
          enqueue(e3) {
            this._tasks.push(e3), this._start();
          }
          flush() {
            for (; this._i < this._tasks.length; ) this._tasks[this._i]() || this._i++;
            this.clear();
          }
          clear() {
            this._idleCallback && (this._cancelCallback(this._idleCallback), this._idleCallback = void 0), this._i = 0, this._tasks.length = 0;
          }
          _start() {
            this._idleCallback || (this._idleCallback = this._requestCallback(this._process.bind(this)));
          }
          _process(e3) {
            this._idleCallback = void 0;
            let t3 = 0, i3 = 0, s3 = e3.timeRemaining(), r2 = 0;
            for (; this._i < this._tasks.length; ) {
              if (t3 = Date.now(), this._tasks[this._i]() || this._i++, t3 = Math.max(1, Date.now() - t3), i3 = Math.max(t3, i3), r2 = e3.timeRemaining(), 1.5 * i3 > r2) return s3 - t3 < -20 && console.warn(`task queue exceeded allotted deadline by ${Math.abs(Math.round(s3 - t3))}ms`), void this._start();
              s3 = r2;
            }
            this.clear();
          }
        }
        class n extends r {
          _requestCallback(e3) {
            return setTimeout(() => e3(this._createDeadline(16)));
          }
          _cancelCallback(e3) {
            clearTimeout(e3);
          }
          _createDeadline(e3) {
            const t3 = Date.now() + e3;
            return { timeRemaining: () => Math.max(0, t3 - Date.now()) };
          }
        }
        t2.PriorityTaskQueue = n, t2.IdleTaskQueue = !s2.isNode && "requestIdleCallback" in window ? class extends r {
          _requestCallback(e3) {
            return requestIdleCallback(e3);
          }
          _cancelCallback(e3) {
            cancelIdleCallback(e3);
          }
        } : n, t2.DebouncedIdleTask = class {
          constructor() {
            this._queue = new t2.IdleTaskQueue();
          }
          set(e3) {
            this._queue.clear(), this._queue.enqueue(e3);
          }
          flush() {
            this._queue.flush();
          }
        };
      }, 9282: (e2, t2, i2) => {
        Object.defineProperty(t2, "__esModule", { value: true }), t2.updateWindowsModeWrappedState = void 0;
        const s2 = i2(643);
        t2.updateWindowsModeWrappedState = function(e3) {
          const t3 = e3.buffer.lines.get(e3.buffer.ybase + e3.buffer.y - 1), i3 = t3 == null ? void 0 : t3.get(e3.cols - 1), r = e3.buffer.lines.get(e3.buffer.ybase + e3.buffer.y);
          r && i3 && (r.isWrapped = i3[s2.CHAR_DATA_CODE_INDEX] !== s2.NULL_CELL_CODE && i3[s2.CHAR_DATA_CODE_INDEX] !== s2.WHITESPACE_CELL_CODE);
        };
      }, 3734: (e2, t2) => {
        Object.defineProperty(t2, "__esModule", { value: true }), t2.ExtendedAttrs = t2.AttributeData = void 0;
        class i2 {
          constructor() {
            this.fg = 0, this.bg = 0, this.extended = new s2();
          }
          static toColorRGB(e3) {
            return [e3 >>> 16 & 255, e3 >>> 8 & 255, 255 & e3];
          }
          static fromColorRGB(e3) {
            return (255 & e3[0]) << 16 | (255 & e3[1]) << 8 | 255 & e3[2];
          }
          clone() {
            const e3 = new i2();
            return e3.fg = this.fg, e3.bg = this.bg, e3.extended = this.extended.clone(), e3;
          }
          isInverse() {
            return 67108864 & this.fg;
          }
          isBold() {
            return 134217728 & this.fg;
          }
          isUnderline() {
            return this.hasExtendedAttrs() && 0 !== this.extended.underlineStyle ? 1 : 268435456 & this.fg;
          }
          isBlink() {
            return 536870912 & this.fg;
          }
          isInvisible() {
            return 1073741824 & this.fg;
          }
          isItalic() {
            return 67108864 & this.bg;
          }
          isDim() {
            return 134217728 & this.bg;
          }
          isStrikethrough() {
            return 2147483648 & this.fg;
          }
          isProtected() {
            return 536870912 & this.bg;
          }
          isOverline() {
            return 1073741824 & this.bg;
          }
          getFgColorMode() {
            return 50331648 & this.fg;
          }
          getBgColorMode() {
            return 50331648 & this.bg;
          }
          isFgRGB() {
            return 50331648 == (50331648 & this.fg);
          }
          isBgRGB() {
            return 50331648 == (50331648 & this.bg);
          }
          isFgPalette() {
            return 16777216 == (50331648 & this.fg) || 33554432 == (50331648 & this.fg);
          }
          isBgPalette() {
            return 16777216 == (50331648 & this.bg) || 33554432 == (50331648 & this.bg);
          }
          isFgDefault() {
            return 0 == (50331648 & this.fg);
          }
          isBgDefault() {
            return 0 == (50331648 & this.bg);
          }
          isAttributeDefault() {
            return 0 === this.fg && 0 === this.bg;
          }
          getFgColor() {
            switch (50331648 & this.fg) {
              case 16777216:
              case 33554432:
                return 255 & this.fg;
              case 50331648:
                return 16777215 & this.fg;
              default:
                return -1;
            }
          }
          getBgColor() {
            switch (50331648 & this.bg) {
              case 16777216:
              case 33554432:
                return 255 & this.bg;
              case 50331648:
                return 16777215 & this.bg;
              default:
                return -1;
            }
          }
          hasExtendedAttrs() {
            return 268435456 & this.bg;
          }
          updateExtended() {
            this.extended.isEmpty() ? this.bg &= -268435457 : this.bg |= 268435456;
          }
          getUnderlineColor() {
            if (268435456 & this.bg && ~this.extended.underlineColor) switch (50331648 & this.extended.underlineColor) {
              case 16777216:
              case 33554432:
                return 255 & this.extended.underlineColor;
              case 50331648:
                return 16777215 & this.extended.underlineColor;
              default:
                return this.getFgColor();
            }
            return this.getFgColor();
          }
          getUnderlineColorMode() {
            return 268435456 & this.bg && ~this.extended.underlineColor ? 50331648 & this.extended.underlineColor : this.getFgColorMode();
          }
          isUnderlineColorRGB() {
            return 268435456 & this.bg && ~this.extended.underlineColor ? 50331648 == (50331648 & this.extended.underlineColor) : this.isFgRGB();
          }
          isUnderlineColorPalette() {
            return 268435456 & this.bg && ~this.extended.underlineColor ? 16777216 == (50331648 & this.extended.underlineColor) || 33554432 == (50331648 & this.extended.underlineColor) : this.isFgPalette();
          }
          isUnderlineColorDefault() {
            return 268435456 & this.bg && ~this.extended.underlineColor ? 0 == (50331648 & this.extended.underlineColor) : this.isFgDefault();
          }
          getUnderlineStyle() {
            return 268435456 & this.fg ? 268435456 & this.bg ? this.extended.underlineStyle : 1 : 0;
          }
          getUnderlineVariantOffset() {
            return this.extended.underlineVariantOffset;
          }
        }
        t2.AttributeData = i2;
        class s2 {
          get ext() {
            return this._urlId ? -469762049 & this._ext | this.underlineStyle << 26 : this._ext;
          }
          set ext(e3) {
            this._ext = e3;
          }
          get underlineStyle() {
            return this._urlId ? 5 : (469762048 & this._ext) >> 26;
          }
          set underlineStyle(e3) {
            this._ext &= -469762049, this._ext |= e3 << 26 & 469762048;
          }
          get underlineColor() {
            return 67108863 & this._ext;
          }
          set underlineColor(e3) {
            this._ext &= -67108864, this._ext |= 67108863 & e3;
          }
          get urlId() {
            return this._urlId;
          }
          set urlId(e3) {
            this._urlId = e3;
          }
          get underlineVariantOffset() {
            const e3 = (3758096384 & this._ext) >> 29;
            return e3 < 0 ? 4294967288 ^ e3 : e3;
          }
          set underlineVariantOffset(e3) {
            this._ext &= 536870911, this._ext |= e3 << 29 & 3758096384;
          }
          constructor(e3 = 0, t3 = 0) {
            this._ext = 0, this._urlId = 0, this._ext = e3, this._urlId = t3;
          }
          clone() {
            return new s2(this._ext, this._urlId);
          }
          isEmpty() {
            return 0 === this.underlineStyle && 0 === this._urlId;
          }
        }
        t2.ExtendedAttrs = s2;
      }, 9092: (e2, t2, i2) => {
        Object.defineProperty(t2, "__esModule", { value: true }), t2.Buffer = t2.MAX_BUFFER_SIZE = void 0;
        const s2 = i2(6349), r = i2(7226), n = i2(3734), o = i2(8437), a = i2(4634), h = i2(511), c = i2(643), l = i2(4863), d = i2(7116);
        t2.MAX_BUFFER_SIZE = 4294967295, t2.Buffer = class {
          constructor(e3, t3, i3) {
            this._hasScrollback = e3, this._optionsService = t3, this._bufferService = i3, this.ydisp = 0, this.ybase = 0, this.y = 0, this.x = 0, this.tabs = {}, this.savedY = 0, this.savedX = 0, this.savedCurAttrData = o.DEFAULT_ATTR_DATA.clone(), this.savedCharset = d.DEFAULT_CHARSET, this.markers = [], this._nullCell = h.CellData.fromCharData([0, c.NULL_CELL_CHAR, c.NULL_CELL_WIDTH, c.NULL_CELL_CODE]), this._whitespaceCell = h.CellData.fromCharData([0, c.WHITESPACE_CELL_CHAR, c.WHITESPACE_CELL_WIDTH, c.WHITESPACE_CELL_CODE]), this._isClearing = false, this._memoryCleanupQueue = new r.IdleTaskQueue(), this._memoryCleanupPosition = 0, this._cols = this._bufferService.cols, this._rows = this._bufferService.rows, this.lines = new s2.CircularList(this._getCorrectBufferLength(this._rows)), this.scrollTop = 0, this.scrollBottom = this._rows - 1, this.setupTabStops();
          }
          getNullCell(e3) {
            return e3 ? (this._nullCell.fg = e3.fg, this._nullCell.bg = e3.bg, this._nullCell.extended = e3.extended) : (this._nullCell.fg = 0, this._nullCell.bg = 0, this._nullCell.extended = new n.ExtendedAttrs()), this._nullCell;
          }
          getWhitespaceCell(e3) {
            return e3 ? (this._whitespaceCell.fg = e3.fg, this._whitespaceCell.bg = e3.bg, this._whitespaceCell.extended = e3.extended) : (this._whitespaceCell.fg = 0, this._whitespaceCell.bg = 0, this._whitespaceCell.extended = new n.ExtendedAttrs()), this._whitespaceCell;
          }
          getBlankLine(e3, t3) {
            return new o.BufferLine(this._bufferService.cols, this.getNullCell(e3), t3);
          }
          get hasScrollback() {
            return this._hasScrollback && this.lines.maxLength > this._rows;
          }
          get isCursorInViewport() {
            const e3 = this.ybase + this.y - this.ydisp;
            return e3 >= 0 && e3 < this._rows;
          }
          _getCorrectBufferLength(e3) {
            if (!this._hasScrollback) return e3;
            const i3 = e3 + this._optionsService.rawOptions.scrollback;
            return i3 > t2.MAX_BUFFER_SIZE ? t2.MAX_BUFFER_SIZE : i3;
          }
          fillViewportRows(e3) {
            if (0 === this.lines.length) {
              void 0 === e3 && (e3 = o.DEFAULT_ATTR_DATA);
              let t3 = this._rows;
              for (; t3--; ) this.lines.push(this.getBlankLine(e3));
            }
          }
          clear() {
            this.ydisp = 0, this.ybase = 0, this.y = 0, this.x = 0, this.lines = new s2.CircularList(this._getCorrectBufferLength(this._rows)), this.scrollTop = 0, this.scrollBottom = this._rows - 1, this.setupTabStops();
          }
          resize(e3, t3) {
            const i3 = this.getNullCell(o.DEFAULT_ATTR_DATA);
            let s3 = 0;
            const r2 = this._getCorrectBufferLength(t3);
            if (r2 > this.lines.maxLength && (this.lines.maxLength = r2), this.lines.length > 0) {
              if (this._cols < e3) for (let t4 = 0; t4 < this.lines.length; t4++) s3 += +this.lines.get(t4).resize(e3, i3);
              let n2 = 0;
              if (this._rows < t3) for (let s4 = this._rows; s4 < t3; s4++) this.lines.length < t3 + this.ybase && (this._optionsService.rawOptions.windowsMode || void 0 !== this._optionsService.rawOptions.windowsPty.backend || void 0 !== this._optionsService.rawOptions.windowsPty.buildNumber ? this.lines.push(new o.BufferLine(e3, i3)) : this.ybase > 0 && this.lines.length <= this.ybase + this.y + n2 + 1 ? (this.ybase--, n2++, this.ydisp > 0 && this.ydisp--) : this.lines.push(new o.BufferLine(e3, i3)));
              else for (let e4 = this._rows; e4 > t3; e4--) this.lines.length > t3 + this.ybase && (this.lines.length > this.ybase + this.y + 1 ? this.lines.pop() : (this.ybase++, this.ydisp++));
              if (r2 < this.lines.maxLength) {
                const e4 = this.lines.length - r2;
                e4 > 0 && (this.lines.trimStart(e4), this.ybase = Math.max(this.ybase - e4, 0), this.ydisp = Math.max(this.ydisp - e4, 0), this.savedY = Math.max(this.savedY - e4, 0)), this.lines.maxLength = r2;
              }
              this.x = Math.min(this.x, e3 - 1), this.y = Math.min(this.y, t3 - 1), n2 && (this.y += n2), this.savedX = Math.min(this.savedX, e3 - 1), this.scrollTop = 0;
            }
            if (this.scrollBottom = t3 - 1, this._isReflowEnabled && (this._reflow(e3, t3), this._cols > e3)) for (let t4 = 0; t4 < this.lines.length; t4++) s3 += +this.lines.get(t4).resize(e3, i3);
            this._cols = e3, this._rows = t3, this._memoryCleanupQueue.clear(), s3 > 0.1 * this.lines.length && (this._memoryCleanupPosition = 0, this._memoryCleanupQueue.enqueue(() => this._batchedMemoryCleanup()));
          }
          _batchedMemoryCleanup() {
            let e3 = true;
            this._memoryCleanupPosition >= this.lines.length && (this._memoryCleanupPosition = 0, e3 = false);
            let t3 = 0;
            for (; this._memoryCleanupPosition < this.lines.length; ) if (t3 += this.lines.get(this._memoryCleanupPosition++).cleanupMemory(), t3 > 100) return true;
            return e3;
          }
          get _isReflowEnabled() {
            const e3 = this._optionsService.rawOptions.windowsPty;
            return e3 && e3.buildNumber ? this._hasScrollback && "conpty" === e3.backend && e3.buildNumber >= 21376 : this._hasScrollback && !this._optionsService.rawOptions.windowsMode;
          }
          _reflow(e3, t3) {
            this._cols !== e3 && (e3 > this._cols ? this._reflowLarger(e3, t3) : this._reflowSmaller(e3, t3));
          }
          _reflowLarger(e3, t3) {
            const i3 = (0, a.reflowLargerGetLinesToRemove)(this.lines, this._cols, e3, this.ybase + this.y, this.getNullCell(o.DEFAULT_ATTR_DATA));
            if (i3.length > 0) {
              const s3 = (0, a.reflowLargerCreateNewLayout)(this.lines, i3);
              (0, a.reflowLargerApplyNewLayout)(this.lines, s3.layout), this._reflowLargerAdjustViewport(e3, t3, s3.countRemoved);
            }
          }
          _reflowLargerAdjustViewport(e3, t3, i3) {
            const s3 = this.getNullCell(o.DEFAULT_ATTR_DATA);
            let r2 = i3;
            for (; r2-- > 0; ) 0 === this.ybase ? (this.y > 0 && this.y--, this.lines.length < t3 && this.lines.push(new o.BufferLine(e3, s3))) : (this.ydisp === this.ybase && this.ydisp--, this.ybase--);
            this.savedY = Math.max(this.savedY - i3, 0);
          }
          _reflowSmaller(e3, t3) {
            const i3 = this.getNullCell(o.DEFAULT_ATTR_DATA), s3 = [];
            let r2 = 0;
            for (let n2 = this.lines.length - 1; n2 >= 0; n2--) {
              let h2 = this.lines.get(n2);
              if (!h2 || !h2.isWrapped && h2.getTrimmedLength() <= e3) continue;
              const c2 = [h2];
              for (; h2.isWrapped && n2 > 0; ) h2 = this.lines.get(--n2), c2.unshift(h2);
              const l2 = this.ybase + this.y;
              if (l2 >= n2 && l2 < n2 + c2.length) continue;
              const d2 = c2[c2.length - 1].getTrimmedLength(), _ = (0, a.reflowSmallerGetNewLineLengths)(c2, this._cols, e3), u = _.length - c2.length;
              let f;
              f = 0 === this.ybase && this.y !== this.lines.length - 1 ? Math.max(0, this.y - this.lines.maxLength + u) : Math.max(0, this.lines.length - this.lines.maxLength + u);
              const v = [];
              for (let e4 = 0; e4 < u; e4++) {
                const e5 = this.getBlankLine(o.DEFAULT_ATTR_DATA, true);
                v.push(e5);
              }
              v.length > 0 && (s3.push({ start: n2 + c2.length + r2, newLines: v }), r2 += v.length), c2.push(...v);
              let p = _.length - 1, g = _[p];
              0 === g && (p--, g = _[p]);
              let m = c2.length - u - 1, S = d2;
              for (; m >= 0; ) {
                const e4 = Math.min(S, g);
                if (void 0 === c2[p]) break;
                if (c2[p].copyCellsFrom(c2[m], S - e4, g - e4, e4, true), g -= e4, 0 === g && (p--, g = _[p]), S -= e4, 0 === S) {
                  m--;
                  const e5 = Math.max(m, 0);
                  S = (0, a.getWrappedLineTrimmedLength)(c2, e5, this._cols);
                }
              }
              for (let t4 = 0; t4 < c2.length; t4++) _[t4] < e3 && c2[t4].setCell(_[t4], i3);
              let C = u - f;
              for (; C-- > 0; ) 0 === this.ybase ? this.y < t3 - 1 ? (this.y++, this.lines.pop()) : (this.ybase++, this.ydisp++) : this.ybase < Math.min(this.lines.maxLength, this.lines.length + r2) - t3 && (this.ybase === this.ydisp && this.ydisp++, this.ybase++);
              this.savedY = Math.min(this.savedY + u, this.ybase + t3 - 1);
            }
            if (s3.length > 0) {
              const e4 = [], t4 = [];
              for (let e5 = 0; e5 < this.lines.length; e5++) t4.push(this.lines.get(e5));
              const i4 = this.lines.length;
              let n2 = i4 - 1, o2 = 0, a2 = s3[o2];
              this.lines.length = Math.min(this.lines.maxLength, this.lines.length + r2);
              let h2 = 0;
              for (let c3 = Math.min(this.lines.maxLength - 1, i4 + r2 - 1); c3 >= 0; c3--) if (a2 && a2.start > n2 + h2) {
                for (let e5 = a2.newLines.length - 1; e5 >= 0; e5--) this.lines.set(c3--, a2.newLines[e5]);
                c3++, e4.push({ index: n2 + 1, amount: a2.newLines.length }), h2 += a2.newLines.length, a2 = s3[++o2];
              } else this.lines.set(c3, t4[n2--]);
              let c2 = 0;
              for (let t5 = e4.length - 1; t5 >= 0; t5--) e4[t5].index += c2, this.lines.onInsertEmitter.fire(e4[t5]), c2 += e4[t5].amount;
              const l2 = Math.max(0, i4 + r2 - this.lines.maxLength);
              l2 > 0 && this.lines.onTrimEmitter.fire(l2);
            }
          }
          translateBufferLineToString(e3, t3, i3 = 0, s3) {
            const r2 = this.lines.get(e3);
            return r2 ? r2.translateToString(t3, i3, s3) : "";
          }
          getWrappedRangeForLine(e3) {
            let t3 = e3, i3 = e3;
            for (; t3 > 0 && this.lines.get(t3).isWrapped; ) t3--;
            for (; i3 + 1 < this.lines.length && this.lines.get(i3 + 1).isWrapped; ) i3++;
            return { first: t3, last: i3 };
          }
          setupTabStops(e3) {
            for (null != e3 ? this.tabs[e3] || (e3 = this.prevStop(e3)) : (this.tabs = {}, e3 = 0); e3 < this._cols; e3 += this._optionsService.rawOptions.tabStopWidth) this.tabs[e3] = true;
          }
          prevStop(e3) {
            for (null == e3 && (e3 = this.x); !this.tabs[--e3] && e3 > 0; ) ;
            return e3 >= this._cols ? this._cols - 1 : e3 < 0 ? 0 : e3;
          }
          nextStop(e3) {
            for (null == e3 && (e3 = this.x); !this.tabs[++e3] && e3 < this._cols; ) ;
            return e3 >= this._cols ? this._cols - 1 : e3 < 0 ? 0 : e3;
          }
          clearMarkers(e3) {
            this._isClearing = true;
            for (let t3 = 0; t3 < this.markers.length; t3++) this.markers[t3].line === e3 && (this.markers[t3].dispose(), this.markers.splice(t3--, 1));
            this._isClearing = false;
          }
          clearAllMarkers() {
            this._isClearing = true;
            for (let e3 = 0; e3 < this.markers.length; e3++) this.markers[e3].dispose(), this.markers.splice(e3--, 1);
            this._isClearing = false;
          }
          addMarker(e3) {
            const t3 = new l.Marker(e3);
            return this.markers.push(t3), t3.register(this.lines.onTrim((e4) => {
              t3.line -= e4, t3.line < 0 && t3.dispose();
            })), t3.register(this.lines.onInsert((e4) => {
              t3.line >= e4.index && (t3.line += e4.amount);
            })), t3.register(this.lines.onDelete((e4) => {
              t3.line >= e4.index && t3.line < e4.index + e4.amount && t3.dispose(), t3.line > e4.index && (t3.line -= e4.amount);
            })), t3.register(t3.onDispose(() => this._removeMarker(t3))), t3;
          }
          _removeMarker(e3) {
            this._isClearing || this.markers.splice(this.markers.indexOf(e3), 1);
          }
        };
      }, 8437: (e2, t2, i2) => {
        Object.defineProperty(t2, "__esModule", { value: true }), t2.BufferLine = t2.DEFAULT_ATTR_DATA = void 0;
        const s2 = i2(3734), r = i2(511), n = i2(643), o = i2(482);
        t2.DEFAULT_ATTR_DATA = Object.freeze(new s2.AttributeData());
        let a = 0;
        class h {
          constructor(e3, t3, i3 = false) {
            this.isWrapped = i3, this._combined = {}, this._extendedAttrs = {}, this._data = new Uint32Array(3 * e3);
            const s3 = t3 || r.CellData.fromCharData([0, n.NULL_CELL_CHAR, n.NULL_CELL_WIDTH, n.NULL_CELL_CODE]);
            for (let t4 = 0; t4 < e3; ++t4) this.setCell(t4, s3);
            this.length = e3;
          }
          get(e3) {
            const t3 = this._data[3 * e3 + 0], i3 = 2097151 & t3;
            return [this._data[3 * e3 + 1], 2097152 & t3 ? this._combined[e3] : i3 ? (0, o.stringFromCodePoint)(i3) : "", t3 >> 22, 2097152 & t3 ? this._combined[e3].charCodeAt(this._combined[e3].length - 1) : i3];
          }
          set(e3, t3) {
            this._data[3 * e3 + 1] = t3[n.CHAR_DATA_ATTR_INDEX], t3[n.CHAR_DATA_CHAR_INDEX].length > 1 ? (this._combined[e3] = t3[1], this._data[3 * e3 + 0] = 2097152 | e3 | t3[n.CHAR_DATA_WIDTH_INDEX] << 22) : this._data[3 * e3 + 0] = t3[n.CHAR_DATA_CHAR_INDEX].charCodeAt(0) | t3[n.CHAR_DATA_WIDTH_INDEX] << 22;
          }
          getWidth(e3) {
            return this._data[3 * e3 + 0] >> 22;
          }
          hasWidth(e3) {
            return 12582912 & this._data[3 * e3 + 0];
          }
          getFg(e3) {
            return this._data[3 * e3 + 1];
          }
          getBg(e3) {
            return this._data[3 * e3 + 2];
          }
          hasContent(e3) {
            return 4194303 & this._data[3 * e3 + 0];
          }
          getCodePoint(e3) {
            const t3 = this._data[3 * e3 + 0];
            return 2097152 & t3 ? this._combined[e3].charCodeAt(this._combined[e3].length - 1) : 2097151 & t3;
          }
          isCombined(e3) {
            return 2097152 & this._data[3 * e3 + 0];
          }
          getString(e3) {
            const t3 = this._data[3 * e3 + 0];
            return 2097152 & t3 ? this._combined[e3] : 2097151 & t3 ? (0, o.stringFromCodePoint)(2097151 & t3) : "";
          }
          isProtected(e3) {
            return 536870912 & this._data[3 * e3 + 2];
          }
          loadCell(e3, t3) {
            return a = 3 * e3, t3.content = this._data[a + 0], t3.fg = this._data[a + 1], t3.bg = this._data[a + 2], 2097152 & t3.content && (t3.combinedData = this._combined[e3]), 268435456 & t3.bg && (t3.extended = this._extendedAttrs[e3]), t3;
          }
          setCell(e3, t3) {
            2097152 & t3.content && (this._combined[e3] = t3.combinedData), 268435456 & t3.bg && (this._extendedAttrs[e3] = t3.extended), this._data[3 * e3 + 0] = t3.content, this._data[3 * e3 + 1] = t3.fg, this._data[3 * e3 + 2] = t3.bg;
          }
          setCellFromCodepoint(e3, t3, i3, s3) {
            268435456 & s3.bg && (this._extendedAttrs[e3] = s3.extended), this._data[3 * e3 + 0] = t3 | i3 << 22, this._data[3 * e3 + 1] = s3.fg, this._data[3 * e3 + 2] = s3.bg;
          }
          addCodepointToCell(e3, t3, i3) {
            let s3 = this._data[3 * e3 + 0];
            2097152 & s3 ? this._combined[e3] += (0, o.stringFromCodePoint)(t3) : 2097151 & s3 ? (this._combined[e3] = (0, o.stringFromCodePoint)(2097151 & s3) + (0, o.stringFromCodePoint)(t3), s3 &= -2097152, s3 |= 2097152) : s3 = t3 | 1 << 22, i3 && (s3 &= -12582913, s3 |= i3 << 22), this._data[3 * e3 + 0] = s3;
          }
          insertCells(e3, t3, i3) {
            if ((e3 %= this.length) && 2 === this.getWidth(e3 - 1) && this.setCellFromCodepoint(e3 - 1, 0, 1, i3), t3 < this.length - e3) {
              const s3 = new r.CellData();
              for (let i4 = this.length - e3 - t3 - 1; i4 >= 0; --i4) this.setCell(e3 + t3 + i4, this.loadCell(e3 + i4, s3));
              for (let s4 = 0; s4 < t3; ++s4) this.setCell(e3 + s4, i3);
            } else for (let t4 = e3; t4 < this.length; ++t4) this.setCell(t4, i3);
            2 === this.getWidth(this.length - 1) && this.setCellFromCodepoint(this.length - 1, 0, 1, i3);
          }
          deleteCells(e3, t3, i3) {
            if (e3 %= this.length, t3 < this.length - e3) {
              const s3 = new r.CellData();
              for (let i4 = 0; i4 < this.length - e3 - t3; ++i4) this.setCell(e3 + i4, this.loadCell(e3 + t3 + i4, s3));
              for (let e4 = this.length - t3; e4 < this.length; ++e4) this.setCell(e4, i3);
            } else for (let t4 = e3; t4 < this.length; ++t4) this.setCell(t4, i3);
            e3 && 2 === this.getWidth(e3 - 1) && this.setCellFromCodepoint(e3 - 1, 0, 1, i3), 0 !== this.getWidth(e3) || this.hasContent(e3) || this.setCellFromCodepoint(e3, 0, 1, i3);
          }
          replaceCells(e3, t3, i3, s3 = false) {
            if (s3) for (e3 && 2 === this.getWidth(e3 - 1) && !this.isProtected(e3 - 1) && this.setCellFromCodepoint(e3 - 1, 0, 1, i3), t3 < this.length && 2 === this.getWidth(t3 - 1) && !this.isProtected(t3) && this.setCellFromCodepoint(t3, 0, 1, i3); e3 < t3 && e3 < this.length; ) this.isProtected(e3) || this.setCell(e3, i3), e3++;
            else for (e3 && 2 === this.getWidth(e3 - 1) && this.setCellFromCodepoint(e3 - 1, 0, 1, i3), t3 < this.length && 2 === this.getWidth(t3 - 1) && this.setCellFromCodepoint(t3, 0, 1, i3); e3 < t3 && e3 < this.length; ) this.setCell(e3++, i3);
          }
          resize(e3, t3) {
            if (e3 === this.length) return 4 * this._data.length * 2 < this._data.buffer.byteLength;
            const i3 = 3 * e3;
            if (e3 > this.length) {
              if (this._data.buffer.byteLength >= 4 * i3) this._data = new Uint32Array(this._data.buffer, 0, i3);
              else {
                const e4 = new Uint32Array(i3);
                e4.set(this._data), this._data = e4;
              }
              for (let i4 = this.length; i4 < e3; ++i4) this.setCell(i4, t3);
            } else {
              this._data = this._data.subarray(0, i3);
              const t4 = Object.keys(this._combined);
              for (let i4 = 0; i4 < t4.length; i4++) {
                const s4 = parseInt(t4[i4], 10);
                s4 >= e3 && delete this._combined[s4];
              }
              const s3 = Object.keys(this._extendedAttrs);
              for (let t5 = 0; t5 < s3.length; t5++) {
                const i4 = parseInt(s3[t5], 10);
                i4 >= e3 && delete this._extendedAttrs[i4];
              }
            }
            return this.length = e3, 4 * i3 * 2 < this._data.buffer.byteLength;
          }
          cleanupMemory() {
            if (4 * this._data.length * 2 < this._data.buffer.byteLength) {
              const e3 = new Uint32Array(this._data.length);
              return e3.set(this._data), this._data = e3, 1;
            }
            return 0;
          }
          fill(e3, t3 = false) {
            if (t3) for (let t4 = 0; t4 < this.length; ++t4) this.isProtected(t4) || this.setCell(t4, e3);
            else {
              this._combined = {}, this._extendedAttrs = {};
              for (let t4 = 0; t4 < this.length; ++t4) this.setCell(t4, e3);
            }
          }
          copyFrom(e3) {
            this.length !== e3.length ? this._data = new Uint32Array(e3._data) : this._data.set(e3._data), this.length = e3.length, this._combined = {};
            for (const t3 in e3._combined) this._combined[t3] = e3._combined[t3];
            this._extendedAttrs = {};
            for (const t3 in e3._extendedAttrs) this._extendedAttrs[t3] = e3._extendedAttrs[t3];
            this.isWrapped = e3.isWrapped;
          }
          clone() {
            const e3 = new h(0);
            e3._data = new Uint32Array(this._data), e3.length = this.length;
            for (const t3 in this._combined) e3._combined[t3] = this._combined[t3];
            for (const t3 in this._extendedAttrs) e3._extendedAttrs[t3] = this._extendedAttrs[t3];
            return e3.isWrapped = this.isWrapped, e3;
          }
          getTrimmedLength() {
            for (let e3 = this.length - 1; e3 >= 0; --e3) if (4194303 & this._data[3 * e3 + 0]) return e3 + (this._data[3 * e3 + 0] >> 22);
            return 0;
          }
          getNoBgTrimmedLength() {
            for (let e3 = this.length - 1; e3 >= 0; --e3) if (4194303 & this._data[3 * e3 + 0] || 50331648 & this._data[3 * e3 + 2]) return e3 + (this._data[3 * e3 + 0] >> 22);
            return 0;
          }
          copyCellsFrom(e3, t3, i3, s3, r2) {
            const n2 = e3._data;
            if (r2) for (let r3 = s3 - 1; r3 >= 0; r3--) {
              for (let e4 = 0; e4 < 3; e4++) this._data[3 * (i3 + r3) + e4] = n2[3 * (t3 + r3) + e4];
              268435456 & n2[3 * (t3 + r3) + 2] && (this._extendedAttrs[i3 + r3] = e3._extendedAttrs[t3 + r3]);
            }
            else for (let r3 = 0; r3 < s3; r3++) {
              for (let e4 = 0; e4 < 3; e4++) this._data[3 * (i3 + r3) + e4] = n2[3 * (t3 + r3) + e4];
              268435456 & n2[3 * (t3 + r3) + 2] && (this._extendedAttrs[i3 + r3] = e3._extendedAttrs[t3 + r3]);
            }
            const o2 = Object.keys(e3._combined);
            for (let s4 = 0; s4 < o2.length; s4++) {
              const r3 = parseInt(o2[s4], 10);
              r3 >= t3 && (this._combined[r3 - t3 + i3] = e3._combined[r3]);
            }
          }
          translateToString(e3, t3, i3, s3) {
            t3 = t3 ?? 0, i3 = i3 ?? this.length, e3 && (i3 = Math.min(i3, this.getTrimmedLength())), s3 && (s3.length = 0);
            let r2 = "";
            for (; t3 < i3; ) {
              const e4 = this._data[3 * t3 + 0], i4 = 2097151 & e4, a2 = 2097152 & e4 ? this._combined[t3] : i4 ? (0, o.stringFromCodePoint)(i4) : n.WHITESPACE_CELL_CHAR;
              if (r2 += a2, s3) for (let e5 = 0; e5 < a2.length; ++e5) s3.push(t3);
              t3 += e4 >> 22 || 1;
            }
            return s3 && s3.push(t3), r2;
          }
        }
        t2.BufferLine = h;
      }, 4841: (e2, t2) => {
        Object.defineProperty(t2, "__esModule", { value: true }), t2.getRangeLength = void 0, t2.getRangeLength = function(e3, t3) {
          if (e3.start.y > e3.end.y) throw new Error(`Buffer range end (${e3.end.x}, ${e3.end.y}) cannot be before start (${e3.start.x}, ${e3.start.y})`);
          return t3 * (e3.end.y - e3.start.y) + (e3.end.x - e3.start.x + 1);
        };
      }, 4634: (e2, t2) => {
        function i2(e3, t3, i3) {
          if (t3 === e3.length - 1) return e3[t3].getTrimmedLength();
          const s2 = !e3[t3].hasContent(i3 - 1) && 1 === e3[t3].getWidth(i3 - 1), r = 2 === e3[t3 + 1].getWidth(0);
          return s2 && r ? i3 - 1 : i3;
        }
        Object.defineProperty(t2, "__esModule", { value: true }), t2.getWrappedLineTrimmedLength = t2.reflowSmallerGetNewLineLengths = t2.reflowLargerApplyNewLayout = t2.reflowLargerCreateNewLayout = t2.reflowLargerGetLinesToRemove = void 0, t2.reflowLargerGetLinesToRemove = function(e3, t3, s2, r, n) {
          const o = [];
          for (let a = 0; a < e3.length - 1; a++) {
            let h = a, c = e3.get(++h);
            if (!c.isWrapped) continue;
            const l = [e3.get(a)];
            for (; h < e3.length && c.isWrapped; ) l.push(c), c = e3.get(++h);
            if (r >= a && r < h) {
              a += l.length - 1;
              continue;
            }
            let d = 0, _ = i2(l, d, t3), u = 1, f = 0;
            for (; u < l.length; ) {
              const e4 = i2(l, u, t3), r2 = e4 - f, o2 = s2 - _, a2 = Math.min(r2, o2);
              l[d].copyCellsFrom(l[u], f, _, a2, false), _ += a2, _ === s2 && (d++, _ = 0), f += a2, f === e4 && (u++, f = 0), 0 === _ && 0 !== d && 2 === l[d - 1].getWidth(s2 - 1) && (l[d].copyCellsFrom(l[d - 1], s2 - 1, _++, 1, false), l[d - 1].setCell(s2 - 1, n));
            }
            l[d].replaceCells(_, s2, n);
            let v = 0;
            for (let e4 = l.length - 1; e4 > 0 && (e4 > d || 0 === l[e4].getTrimmedLength()); e4--) v++;
            v > 0 && (o.push(a + l.length - v), o.push(v)), a += l.length - 1;
          }
          return o;
        }, t2.reflowLargerCreateNewLayout = function(e3, t3) {
          const i3 = [];
          let s2 = 0, r = t3[s2], n = 0;
          for (let o = 0; o < e3.length; o++) if (r === o) {
            const i4 = t3[++s2];
            e3.onDeleteEmitter.fire({ index: o - n, amount: i4 }), o += i4 - 1, n += i4, r = t3[++s2];
          } else i3.push(o);
          return { layout: i3, countRemoved: n };
        }, t2.reflowLargerApplyNewLayout = function(e3, t3) {
          const i3 = [];
          for (let s2 = 0; s2 < t3.length; s2++) i3.push(e3.get(t3[s2]));
          for (let t4 = 0; t4 < i3.length; t4++) e3.set(t4, i3[t4]);
          e3.length = t3.length;
        }, t2.reflowSmallerGetNewLineLengths = function(e3, t3, s2) {
          const r = [], n = e3.map((s3, r2) => i2(e3, r2, t3)).reduce((e4, t4) => e4 + t4);
          let o = 0, a = 0, h = 0;
          for (; h < n; ) {
            if (n - h < s2) {
              r.push(n - h);
              break;
            }
            o += s2;
            const c = i2(e3, a, t3);
            o > c && (o -= c, a++);
            const l = 2 === e3[a].getWidth(o - 1);
            l && o--;
            const d = l ? s2 - 1 : s2;
            r.push(d), h += d;
          }
          return r;
        }, t2.getWrappedLineTrimmedLength = i2;
      }, 5295: (e2, t2, i2) => {
        Object.defineProperty(t2, "__esModule", { value: true }), t2.BufferSet = void 0;
        const s2 = i2(8460), r = i2(844), n = i2(9092);
        class o extends r.Disposable {
          constructor(e3, t3) {
            super(), this._optionsService = e3, this._bufferService = t3, this._onBufferActivate = this.register(new s2.EventEmitter()), this.onBufferActivate = this._onBufferActivate.event, this.reset(), this.register(this._optionsService.onSpecificOptionChange("scrollback", () => this.resize(this._bufferService.cols, this._bufferService.rows))), this.register(this._optionsService.onSpecificOptionChange("tabStopWidth", () => this.setupTabStops()));
          }
          reset() {
            this._normal = new n.Buffer(true, this._optionsService, this._bufferService), this._normal.fillViewportRows(), this._alt = new n.Buffer(false, this._optionsService, this._bufferService), this._activeBuffer = this._normal, this._onBufferActivate.fire({ activeBuffer: this._normal, inactiveBuffer: this._alt }), this.setupTabStops();
          }
          get alt() {
            return this._alt;
          }
          get active() {
            return this._activeBuffer;
          }
          get normal() {
            return this._normal;
          }
          activateNormalBuffer() {
            this._activeBuffer !== this._normal && (this._normal.x = this._alt.x, this._normal.y = this._alt.y, this._alt.clearAllMarkers(), this._alt.clear(), this._activeBuffer = this._normal, this._onBufferActivate.fire({ activeBuffer: this._normal, inactiveBuffer: this._alt }));
          }
          activateAltBuffer(e3) {
            this._activeBuffer !== this._alt && (this._alt.fillViewportRows(e3), this._alt.x = this._normal.x, this._alt.y = this._normal.y, this._activeBuffer = this._alt, this._onBufferActivate.fire({ activeBuffer: this._alt, inactiveBuffer: this._normal }));
          }
          resize(e3, t3) {
            this._normal.resize(e3, t3), this._alt.resize(e3, t3), this.setupTabStops(e3);
          }
          setupTabStops(e3) {
            this._normal.setupTabStops(e3), this._alt.setupTabStops(e3);
          }
        }
        t2.BufferSet = o;
      }, 511: (e2, t2, i2) => {
        Object.defineProperty(t2, "__esModule", { value: true }), t2.CellData = void 0;
        const s2 = i2(482), r = i2(643), n = i2(3734);
        class o extends n.AttributeData {
          constructor() {
            super(...arguments), this.content = 0, this.fg = 0, this.bg = 0, this.extended = new n.ExtendedAttrs(), this.combinedData = "";
          }
          static fromCharData(e3) {
            const t3 = new o();
            return t3.setFromCharData(e3), t3;
          }
          isCombined() {
            return 2097152 & this.content;
          }
          getWidth() {
            return this.content >> 22;
          }
          getChars() {
            return 2097152 & this.content ? this.combinedData : 2097151 & this.content ? (0, s2.stringFromCodePoint)(2097151 & this.content) : "";
          }
          getCode() {
            return this.isCombined() ? this.combinedData.charCodeAt(this.combinedData.length - 1) : 2097151 & this.content;
          }
          setFromCharData(e3) {
            this.fg = e3[r.CHAR_DATA_ATTR_INDEX], this.bg = 0;
            let t3 = false;
            if (e3[r.CHAR_DATA_CHAR_INDEX].length > 2) t3 = true;
            else if (2 === e3[r.CHAR_DATA_CHAR_INDEX].length) {
              const i3 = e3[r.CHAR_DATA_CHAR_INDEX].charCodeAt(0);
              if (55296 <= i3 && i3 <= 56319) {
                const s3 = e3[r.CHAR_DATA_CHAR_INDEX].charCodeAt(1);
                56320 <= s3 && s3 <= 57343 ? this.content = 1024 * (i3 - 55296) + s3 - 56320 + 65536 | e3[r.CHAR_DATA_WIDTH_INDEX] << 22 : t3 = true;
              } else t3 = true;
            } else this.content = e3[r.CHAR_DATA_CHAR_INDEX].charCodeAt(0) | e3[r.CHAR_DATA_WIDTH_INDEX] << 22;
            t3 && (this.combinedData = e3[r.CHAR_DATA_CHAR_INDEX], this.content = 2097152 | e3[r.CHAR_DATA_WIDTH_INDEX] << 22);
          }
          getAsCharData() {
            return [this.fg, this.getChars(), this.getWidth(), this.getCode()];
          }
        }
        t2.CellData = o;
      }, 643: (e2, t2) => {
        Object.defineProperty(t2, "__esModule", { value: true }), t2.WHITESPACE_CELL_CODE = t2.WHITESPACE_CELL_WIDTH = t2.WHITESPACE_CELL_CHAR = t2.NULL_CELL_CODE = t2.NULL_CELL_WIDTH = t2.NULL_CELL_CHAR = t2.CHAR_DATA_CODE_INDEX = t2.CHAR_DATA_WIDTH_INDEX = t2.CHAR_DATA_CHAR_INDEX = t2.CHAR_DATA_ATTR_INDEX = t2.DEFAULT_EXT = t2.DEFAULT_ATTR = t2.DEFAULT_COLOR = void 0, t2.DEFAULT_COLOR = 0, t2.DEFAULT_ATTR = 256 | t2.DEFAULT_COLOR << 9, t2.DEFAULT_EXT = 0, t2.CHAR_DATA_ATTR_INDEX = 0, t2.CHAR_DATA_CHAR_INDEX = 1, t2.CHAR_DATA_WIDTH_INDEX = 2, t2.CHAR_DATA_CODE_INDEX = 3, t2.NULL_CELL_CHAR = "", t2.NULL_CELL_WIDTH = 1, t2.NULL_CELL_CODE = 0, t2.WHITESPACE_CELL_CHAR = " ", t2.WHITESPACE_CELL_WIDTH = 1, t2.WHITESPACE_CELL_CODE = 32;
      }, 4863: (e2, t2, i2) => {
        Object.defineProperty(t2, "__esModule", { value: true }), t2.Marker = void 0;
        const s2 = i2(8460), r = i2(844);
        class n {
          get id() {
            return this._id;
          }
          constructor(e3) {
            this.line = e3, this.isDisposed = false, this._disposables = [], this._id = n._nextId++, this._onDispose = this.register(new s2.EventEmitter()), this.onDispose = this._onDispose.event;
          }
          dispose() {
            this.isDisposed || (this.isDisposed = true, this.line = -1, this._onDispose.fire(), (0, r.disposeArray)(this._disposables), this._disposables.length = 0);
          }
          register(e3) {
            return this._disposables.push(e3), e3;
          }
        }
        t2.Marker = n, n._nextId = 1;
      }, 7116: (e2, t2) => {
        Object.defineProperty(t2, "__esModule", { value: true }), t2.DEFAULT_CHARSET = t2.CHARSETS = void 0, t2.CHARSETS = {}, t2.DEFAULT_CHARSET = t2.CHARSETS.B, t2.CHARSETS[0] = { "`": "◆", a: "▒", b: "␉", c: "␌", d: "␍", e: "␊", f: "°", g: "±", h: "␤", i: "␋", j: "┘", k: "┐", l: "┌", m: "└", n: "┼", o: "⎺", p: "⎻", q: "─", r: "⎼", s: "⎽", t: "├", u: "┤", v: "┴", w: "┬", x: "│", y: "≤", z: "≥", "{": "π", "|": "≠", "}": "£", "~": "·" }, t2.CHARSETS.A = { "#": "£" }, t2.CHARSETS.B = void 0, t2.CHARSETS[4] = { "#": "£", "@": "¾", "[": "ij", "\\": "½", "]": "|", "{": "¨", "|": "f", "}": "¼", "~": "´" }, t2.CHARSETS.C = t2.CHARSETS[5] = { "[": "Ä", "\\": "Ö", "]": "Å", "^": "Ü", "`": "é", "{": "ä", "|": "ö", "}": "å", "~": "ü" }, t2.CHARSETS.R = { "#": "£", "@": "à", "[": "°", "\\": "ç", "]": "§", "{": "é", "|": "ù", "}": "è", "~": "¨" }, t2.CHARSETS.Q = { "@": "à", "[": "â", "\\": "ç", "]": "ê", "^": "î", "`": "ô", "{": "é", "|": "ù", "}": "è", "~": "û" }, t2.CHARSETS.K = { "@": "§", "[": "Ä", "\\": "Ö", "]": "Ü", "{": "ä", "|": "ö", "}": "ü", "~": "ß" }, t2.CHARSETS.Y = { "#": "£", "@": "§", "[": "°", "\\": "ç", "]": "é", "`": "ù", "{": "à", "|": "ò", "}": "è", "~": "ì" }, t2.CHARSETS.E = t2.CHARSETS[6] = { "@": "Ä", "[": "Æ", "\\": "Ø", "]": "Å", "^": "Ü", "`": "ä", "{": "æ", "|": "ø", "}": "å", "~": "ü" }, t2.CHARSETS.Z = { "#": "£", "@": "§", "[": "¡", "\\": "Ñ", "]": "¿", "{": "°", "|": "ñ", "}": "ç" }, t2.CHARSETS.H = t2.CHARSETS[7] = { "@": "É", "[": "Ä", "\\": "Ö", "]": "Å", "^": "Ü", "`": "é", "{": "ä", "|": "ö", "}": "å", "~": "ü" }, t2.CHARSETS["="] = { "#": "ù", "@": "à", "[": "é", "\\": "ç", "]": "ê", "^": "î", _: "è", "`": "ô", "{": "ä", "|": "ö", "}": "ü", "~": "û" };
      }, 2584: (e2, t2) => {
        var i2, s2, r;
        Object.defineProperty(t2, "__esModule", { value: true }), t2.C1_ESCAPED = t2.C1 = t2.C0 = void 0, function(e3) {
          e3.NUL = "\0", e3.SOH = "", e3.STX = "", e3.ETX = "", e3.EOT = "", e3.ENQ = "", e3.ACK = "", e3.BEL = "\x07", e3.BS = "\b", e3.HT = "	", e3.LF = "\n", e3.VT = "\v", e3.FF = "\f", e3.CR = "\r", e3.SO = "", e3.SI = "", e3.DLE = "", e3.DC1 = "", e3.DC2 = "", e3.DC3 = "", e3.DC4 = "", e3.NAK = "", e3.SYN = "", e3.ETB = "", e3.CAN = "", e3.EM = "", e3.SUB = "", e3.ESC = "\x1B", e3.FS = "", e3.GS = "", e3.RS = "", e3.US = "", e3.SP = " ", e3.DEL = "";
        }(i2 || (t2.C0 = i2 = {})), function(e3) {
          e3.PAD = "", e3.HOP = "", e3.BPH = "", e3.NBH = "", e3.IND = "", e3.NEL = "", e3.SSA = "", e3.ESA = "", e3.HTS = "", e3.HTJ = "", e3.VTS = "", e3.PLD = "", e3.PLU = "", e3.RI = "", e3.SS2 = "", e3.SS3 = "", e3.DCS = "", e3.PU1 = "", e3.PU2 = "", e3.STS = "", e3.CCH = "", e3.MW = "", e3.SPA = "", e3.EPA = "", e3.SOS = "", e3.SGCI = "", e3.SCI = "", e3.CSI = "", e3.ST = "", e3.OSC = "", e3.PM = "", e3.APC = "";
        }(s2 || (t2.C1 = s2 = {})), function(e3) {
          e3.ST = `${i2.ESC}\\`;
        }(r || (t2.C1_ESCAPED = r = {}));
      }, 7399: (e2, t2, i2) => {
        Object.defineProperty(t2, "__esModule", { value: true }), t2.evaluateKeyboardEvent = void 0;
        const s2 = i2(2584), r = { 48: ["0", ")"], 49: ["1", "!"], 50: ["2", "@"], 51: ["3", "#"], 52: ["4", "$"], 53: ["5", "%"], 54: ["6", "^"], 55: ["7", "&"], 56: ["8", "*"], 57: ["9", "("], 186: [";", ":"], 187: ["=", "+"], 188: [",", "<"], 189: ["-", "_"], 190: [".", ">"], 191: ["/", "?"], 192: ["`", "~"], 219: ["[", "{"], 220: ["\\", "|"], 221: ["]", "}"], 222: ["'", '"'] };
        t2.evaluateKeyboardEvent = function(e3, t3, i3, n) {
          const o = { type: 0, cancel: false, key: void 0 }, a = (e3.shiftKey ? 1 : 0) | (e3.altKey ? 2 : 0) | (e3.ctrlKey ? 4 : 0) | (e3.metaKey ? 8 : 0);
          switch (e3.keyCode) {
            case 0:
              "UIKeyInputUpArrow" === e3.key ? o.key = t3 ? s2.C0.ESC + "OA" : s2.C0.ESC + "[A" : "UIKeyInputLeftArrow" === e3.key ? o.key = t3 ? s2.C0.ESC + "OD" : s2.C0.ESC + "[D" : "UIKeyInputRightArrow" === e3.key ? o.key = t3 ? s2.C0.ESC + "OC" : s2.C0.ESC + "[C" : "UIKeyInputDownArrow" === e3.key && (o.key = t3 ? s2.C0.ESC + "OB" : s2.C0.ESC + "[B");
              break;
            case 8:
              o.key = e3.ctrlKey ? "\b" : s2.C0.DEL, e3.altKey && (o.key = s2.C0.ESC + o.key);
              break;
            case 9:
              if (e3.shiftKey) {
                o.key = s2.C0.ESC + "[Z";
                break;
              }
              o.key = s2.C0.HT, o.cancel = true;
              break;
            case 13:
              o.key = e3.altKey ? s2.C0.ESC + s2.C0.CR : s2.C0.CR, o.cancel = true;
              break;
            case 27:
              o.key = s2.C0.ESC, e3.altKey && (o.key = s2.C0.ESC + s2.C0.ESC), o.cancel = true;
              break;
            case 37:
              if (e3.metaKey) break;
              a ? (o.key = s2.C0.ESC + "[1;" + (a + 1) + "D", o.key === s2.C0.ESC + "[1;3D" && (o.key = s2.C0.ESC + (i3 ? "b" : "[1;5D"))) : o.key = t3 ? s2.C0.ESC + "OD" : s2.C0.ESC + "[D";
              break;
            case 39:
              if (e3.metaKey) break;
              a ? (o.key = s2.C0.ESC + "[1;" + (a + 1) + "C", o.key === s2.C0.ESC + "[1;3C" && (o.key = s2.C0.ESC + (i3 ? "f" : "[1;5C"))) : o.key = t3 ? s2.C0.ESC + "OC" : s2.C0.ESC + "[C";
              break;
            case 38:
              if (e3.metaKey) break;
              a ? (o.key = s2.C0.ESC + "[1;" + (a + 1) + "A", i3 || o.key !== s2.C0.ESC + "[1;3A" || (o.key = s2.C0.ESC + "[1;5A")) : o.key = t3 ? s2.C0.ESC + "OA" : s2.C0.ESC + "[A";
              break;
            case 40:
              if (e3.metaKey) break;
              a ? (o.key = s2.C0.ESC + "[1;" + (a + 1) + "B", i3 || o.key !== s2.C0.ESC + "[1;3B" || (o.key = s2.C0.ESC + "[1;5B")) : o.key = t3 ? s2.C0.ESC + "OB" : s2.C0.ESC + "[B";
              break;
            case 45:
              e3.shiftKey || e3.ctrlKey || (o.key = s2.C0.ESC + "[2~");
              break;
            case 46:
              o.key = a ? s2.C0.ESC + "[3;" + (a + 1) + "~" : s2.C0.ESC + "[3~";
              break;
            case 36:
              o.key = a ? s2.C0.ESC + "[1;" + (a + 1) + "H" : t3 ? s2.C0.ESC + "OH" : s2.C0.ESC + "[H";
              break;
            case 35:
              o.key = a ? s2.C0.ESC + "[1;" + (a + 1) + "F" : t3 ? s2.C0.ESC + "OF" : s2.C0.ESC + "[F";
              break;
            case 33:
              e3.shiftKey ? o.type = 2 : e3.ctrlKey ? o.key = s2.C0.ESC + "[5;" + (a + 1) + "~" : o.key = s2.C0.ESC + "[5~";
              break;
            case 34:
              e3.shiftKey ? o.type = 3 : e3.ctrlKey ? o.key = s2.C0.ESC + "[6;" + (a + 1) + "~" : o.key = s2.C0.ESC + "[6~";
              break;
            case 112:
              o.key = a ? s2.C0.ESC + "[1;" + (a + 1) + "P" : s2.C0.ESC + "OP";
              break;
            case 113:
              o.key = a ? s2.C0.ESC + "[1;" + (a + 1) + "Q" : s2.C0.ESC + "OQ";
              break;
            case 114:
              o.key = a ? s2.C0.ESC + "[1;" + (a + 1) + "R" : s2.C0.ESC + "OR";
              break;
            case 115:
              o.key = a ? s2.C0.ESC + "[1;" + (a + 1) + "S" : s2.C0.ESC + "OS";
              break;
            case 116:
              o.key = a ? s2.C0.ESC + "[15;" + (a + 1) + "~" : s2.C0.ESC + "[15~";
              break;
            case 117:
              o.key = a ? s2.C0.ESC + "[17;" + (a + 1) + "~" : s2.C0.ESC + "[17~";
              break;
            case 118:
              o.key = a ? s2.C0.ESC + "[18;" + (a + 1) + "~" : s2.C0.ESC + "[18~";
              break;
            case 119:
              o.key = a ? s2.C0.ESC + "[19;" + (a + 1) + "~" : s2.C0.ESC + "[19~";
              break;
            case 120:
              o.key = a ? s2.C0.ESC + "[20;" + (a + 1) + "~" : s2.C0.ESC + "[20~";
              break;
            case 121:
              o.key = a ? s2.C0.ESC + "[21;" + (a + 1) + "~" : s2.C0.ESC + "[21~";
              break;
            case 122:
              o.key = a ? s2.C0.ESC + "[23;" + (a + 1) + "~" : s2.C0.ESC + "[23~";
              break;
            case 123:
              o.key = a ? s2.C0.ESC + "[24;" + (a + 1) + "~" : s2.C0.ESC + "[24~";
              break;
            default:
              if (!e3.ctrlKey || e3.shiftKey || e3.altKey || e3.metaKey) if (i3 && !n || !e3.altKey || e3.metaKey) !i3 || e3.altKey || e3.ctrlKey || e3.shiftKey || !e3.metaKey ? e3.key && !e3.ctrlKey && !e3.altKey && !e3.metaKey && e3.keyCode >= 48 && 1 === e3.key.length ? o.key = e3.key : e3.key && e3.ctrlKey && ("_" === e3.key && (o.key = s2.C0.US), "@" === e3.key && (o.key = s2.C0.NUL)) : 65 === e3.keyCode && (o.type = 1);
              else {
                const t4 = r[e3.keyCode], i4 = t4 == null ? void 0 : t4[e3.shiftKey ? 1 : 0];
                if (i4) o.key = s2.C0.ESC + i4;
                else if (e3.keyCode >= 65 && e3.keyCode <= 90) {
                  const t5 = e3.ctrlKey ? e3.keyCode - 64 : e3.keyCode + 32;
                  let i5 = String.fromCharCode(t5);
                  e3.shiftKey && (i5 = i5.toUpperCase()), o.key = s2.C0.ESC + i5;
                } else if (32 === e3.keyCode) o.key = s2.C0.ESC + (e3.ctrlKey ? s2.C0.NUL : " ");
                else if ("Dead" === e3.key && e3.code.startsWith("Key")) {
                  let t5 = e3.code.slice(3, 4);
                  e3.shiftKey || (t5 = t5.toLowerCase()), o.key = s2.C0.ESC + t5, o.cancel = true;
                }
              }
              else e3.keyCode >= 65 && e3.keyCode <= 90 ? o.key = String.fromCharCode(e3.keyCode - 64) : 32 === e3.keyCode ? o.key = s2.C0.NUL : e3.keyCode >= 51 && e3.keyCode <= 55 ? o.key = String.fromCharCode(e3.keyCode - 51 + 27) : 56 === e3.keyCode ? o.key = s2.C0.DEL : 219 === e3.keyCode ? o.key = s2.C0.ESC : 220 === e3.keyCode ? o.key = s2.C0.FS : 221 === e3.keyCode && (o.key = s2.C0.GS);
          }
          return o;
        };
      }, 482: (e2, t2) => {
        Object.defineProperty(t2, "__esModule", { value: true }), t2.Utf8ToUtf32 = t2.StringToUtf32 = t2.utf32ToString = t2.stringFromCodePoint = void 0, t2.stringFromCodePoint = function(e3) {
          return e3 > 65535 ? (e3 -= 65536, String.fromCharCode(55296 + (e3 >> 10)) + String.fromCharCode(e3 % 1024 + 56320)) : String.fromCharCode(e3);
        }, t2.utf32ToString = function(e3, t3 = 0, i2 = e3.length) {
          let s2 = "";
          for (let r = t3; r < i2; ++r) {
            let t4 = e3[r];
            t4 > 65535 ? (t4 -= 65536, s2 += String.fromCharCode(55296 + (t4 >> 10)) + String.fromCharCode(t4 % 1024 + 56320)) : s2 += String.fromCharCode(t4);
          }
          return s2;
        }, t2.StringToUtf32 = class {
          constructor() {
            this._interim = 0;
          }
          clear() {
            this._interim = 0;
          }
          decode(e3, t3) {
            const i2 = e3.length;
            if (!i2) return 0;
            let s2 = 0, r = 0;
            if (this._interim) {
              const i3 = e3.charCodeAt(r++);
              56320 <= i3 && i3 <= 57343 ? t3[s2++] = 1024 * (this._interim - 55296) + i3 - 56320 + 65536 : (t3[s2++] = this._interim, t3[s2++] = i3), this._interim = 0;
            }
            for (let n = r; n < i2; ++n) {
              const r2 = e3.charCodeAt(n);
              if (55296 <= r2 && r2 <= 56319) {
                if (++n >= i2) return this._interim = r2, s2;
                const o = e3.charCodeAt(n);
                56320 <= o && o <= 57343 ? t3[s2++] = 1024 * (r2 - 55296) + o - 56320 + 65536 : (t3[s2++] = r2, t3[s2++] = o);
              } else 65279 !== r2 && (t3[s2++] = r2);
            }
            return s2;
          }
        }, t2.Utf8ToUtf32 = class {
          constructor() {
            this.interim = new Uint8Array(3);
          }
          clear() {
            this.interim.fill(0);
          }
          decode(e3, t3) {
            const i2 = e3.length;
            if (!i2) return 0;
            let s2, r, n, o, a = 0, h = 0, c = 0;
            if (this.interim[0]) {
              let s3 = false, r2 = this.interim[0];
              r2 &= 192 == (224 & r2) ? 31 : 224 == (240 & r2) ? 15 : 7;
              let n2, o2 = 0;
              for (; (n2 = 63 & this.interim[++o2]) && o2 < 4; ) r2 <<= 6, r2 |= n2;
              const h2 = 192 == (224 & this.interim[0]) ? 2 : 224 == (240 & this.interim[0]) ? 3 : 4, l2 = h2 - o2;
              for (; c < l2; ) {
                if (c >= i2) return 0;
                if (n2 = e3[c++], 128 != (192 & n2)) {
                  c--, s3 = true;
                  break;
                }
                this.interim[o2++] = n2, r2 <<= 6, r2 |= 63 & n2;
              }
              s3 || (2 === h2 ? r2 < 128 ? c-- : t3[a++] = r2 : 3 === h2 ? r2 < 2048 || r2 >= 55296 && r2 <= 57343 || 65279 === r2 || (t3[a++] = r2) : r2 < 65536 || r2 > 1114111 || (t3[a++] = r2)), this.interim.fill(0);
            }
            const l = i2 - 4;
            let d = c;
            for (; d < i2; ) {
              for (; !(!(d < l) || 128 & (s2 = e3[d]) || 128 & (r = e3[d + 1]) || 128 & (n = e3[d + 2]) || 128 & (o = e3[d + 3])); ) t3[a++] = s2, t3[a++] = r, t3[a++] = n, t3[a++] = o, d += 4;
              if (s2 = e3[d++], s2 < 128) t3[a++] = s2;
              else if (192 == (224 & s2)) {
                if (d >= i2) return this.interim[0] = s2, a;
                if (r = e3[d++], 128 != (192 & r)) {
                  d--;
                  continue;
                }
                if (h = (31 & s2) << 6 | 63 & r, h < 128) {
                  d--;
                  continue;
                }
                t3[a++] = h;
              } else if (224 == (240 & s2)) {
                if (d >= i2) return this.interim[0] = s2, a;
                if (r = e3[d++], 128 != (192 & r)) {
                  d--;
                  continue;
                }
                if (d >= i2) return this.interim[0] = s2, this.interim[1] = r, a;
                if (n = e3[d++], 128 != (192 & n)) {
                  d--;
                  continue;
                }
                if (h = (15 & s2) << 12 | (63 & r) << 6 | 63 & n, h < 2048 || h >= 55296 && h <= 57343 || 65279 === h) continue;
                t3[a++] = h;
              } else if (240 == (248 & s2)) {
                if (d >= i2) return this.interim[0] = s2, a;
                if (r = e3[d++], 128 != (192 & r)) {
                  d--;
                  continue;
                }
                if (d >= i2) return this.interim[0] = s2, this.interim[1] = r, a;
                if (n = e3[d++], 128 != (192 & n)) {
                  d--;
                  continue;
                }
                if (d >= i2) return this.interim[0] = s2, this.interim[1] = r, this.interim[2] = n, a;
                if (o = e3[d++], 128 != (192 & o)) {
                  d--;
                  continue;
                }
                if (h = (7 & s2) << 18 | (63 & r) << 12 | (63 & n) << 6 | 63 & o, h < 65536 || h > 1114111) continue;
                t3[a++] = h;
              }
            }
            return a;
          }
        };
      }, 225: (e2, t2, i2) => {
        Object.defineProperty(t2, "__esModule", { value: true }), t2.UnicodeV6 = void 0;
        const s2 = i2(1480), r = [[768, 879], [1155, 1158], [1160, 1161], [1425, 1469], [1471, 1471], [1473, 1474], [1476, 1477], [1479, 1479], [1536, 1539], [1552, 1557], [1611, 1630], [1648, 1648], [1750, 1764], [1767, 1768], [1770, 1773], [1807, 1807], [1809, 1809], [1840, 1866], [1958, 1968], [2027, 2035], [2305, 2306], [2364, 2364], [2369, 2376], [2381, 2381], [2385, 2388], [2402, 2403], [2433, 2433], [2492, 2492], [2497, 2500], [2509, 2509], [2530, 2531], [2561, 2562], [2620, 2620], [2625, 2626], [2631, 2632], [2635, 2637], [2672, 2673], [2689, 2690], [2748, 2748], [2753, 2757], [2759, 2760], [2765, 2765], [2786, 2787], [2817, 2817], [2876, 2876], [2879, 2879], [2881, 2883], [2893, 2893], [2902, 2902], [2946, 2946], [3008, 3008], [3021, 3021], [3134, 3136], [3142, 3144], [3146, 3149], [3157, 3158], [3260, 3260], [3263, 3263], [3270, 3270], [3276, 3277], [3298, 3299], [3393, 3395], [3405, 3405], [3530, 3530], [3538, 3540], [3542, 3542], [3633, 3633], [3636, 3642], [3655, 3662], [3761, 3761], [3764, 3769], [3771, 3772], [3784, 3789], [3864, 3865], [3893, 3893], [3895, 3895], [3897, 3897], [3953, 3966], [3968, 3972], [3974, 3975], [3984, 3991], [3993, 4028], [4038, 4038], [4141, 4144], [4146, 4146], [4150, 4151], [4153, 4153], [4184, 4185], [4448, 4607], [4959, 4959], [5906, 5908], [5938, 5940], [5970, 5971], [6002, 6003], [6068, 6069], [6071, 6077], [6086, 6086], [6089, 6099], [6109, 6109], [6155, 6157], [6313, 6313], [6432, 6434], [6439, 6440], [6450, 6450], [6457, 6459], [6679, 6680], [6912, 6915], [6964, 6964], [6966, 6970], [6972, 6972], [6978, 6978], [7019, 7027], [7616, 7626], [7678, 7679], [8203, 8207], [8234, 8238], [8288, 8291], [8298, 8303], [8400, 8431], [12330, 12335], [12441, 12442], [43014, 43014], [43019, 43019], [43045, 43046], [64286, 64286], [65024, 65039], [65056, 65059], [65279, 65279], [65529, 65531]], n = [[68097, 68099], [68101, 68102], [68108, 68111], [68152, 68154], [68159, 68159], [119143, 119145], [119155, 119170], [119173, 119179], [119210, 119213], [119362, 119364], [917505, 917505], [917536, 917631], [917760, 917999]];
        let o;
        t2.UnicodeV6 = class {
          constructor() {
            if (this.version = "6", !o) {
              o = new Uint8Array(65536), o.fill(1), o[0] = 0, o.fill(0, 1, 32), o.fill(0, 127, 160), o.fill(2, 4352, 4448), o[9001] = 2, o[9002] = 2, o.fill(2, 11904, 42192), o[12351] = 1, o.fill(2, 44032, 55204), o.fill(2, 63744, 64256), o.fill(2, 65040, 65050), o.fill(2, 65072, 65136), o.fill(2, 65280, 65377), o.fill(2, 65504, 65511);
              for (let e3 = 0; e3 < r.length; ++e3) o.fill(0, r[e3][0], r[e3][1] + 1);
            }
          }
          wcwidth(e3) {
            return e3 < 32 ? 0 : e3 < 127 ? 1 : e3 < 65536 ? o[e3] : function(e4, t3) {
              let i3, s3 = 0, r2 = t3.length - 1;
              if (e4 < t3[0][0] || e4 > t3[r2][1]) return false;
              for (; r2 >= s3; ) if (i3 = s3 + r2 >> 1, e4 > t3[i3][1]) s3 = i3 + 1;
              else {
                if (!(e4 < t3[i3][0])) return true;
                r2 = i3 - 1;
              }
              return false;
            }(e3, n) ? 0 : e3 >= 131072 && e3 <= 196605 || e3 >= 196608 && e3 <= 262141 ? 2 : 1;
          }
          charProperties(e3, t3) {
            let i3 = this.wcwidth(e3), r2 = 0 === i3 && 0 !== t3;
            if (r2) {
              const e4 = s2.UnicodeService.extractWidth(t3);
              0 === e4 ? r2 = false : e4 > i3 && (i3 = e4);
            }
            return s2.UnicodeService.createPropertyValue(0, i3, r2);
          }
        };
      }, 5981: (e2, t2, i2) => {
        Object.defineProperty(t2, "__esModule", { value: true }), t2.WriteBuffer = void 0;
        const s2 = i2(8460), r = i2(844);
        class n extends r.Disposable {
          constructor(e3) {
            super(), this._action = e3, this._writeBuffer = [], this._callbacks = [], this._pendingData = 0, this._bufferOffset = 0, this._isSyncWriting = false, this._syncCalls = 0, this._didUserInput = false, this._onWriteParsed = this.register(new s2.EventEmitter()), this.onWriteParsed = this._onWriteParsed.event;
          }
          handleUserInput() {
            this._didUserInput = true;
          }
          writeSync(e3, t3) {
            if (void 0 !== t3 && this._syncCalls > t3) return void (this._syncCalls = 0);
            if (this._pendingData += e3.length, this._writeBuffer.push(e3), this._callbacks.push(void 0), this._syncCalls++, this._isSyncWriting) return;
            let i3;
            for (this._isSyncWriting = true; i3 = this._writeBuffer.shift(); ) {
              this._action(i3);
              const e4 = this._callbacks.shift();
              e4 && e4();
            }
            this._pendingData = 0, this._bufferOffset = 2147483647, this._isSyncWriting = false, this._syncCalls = 0;
          }
          write(e3, t3) {
            if (this._pendingData > 5e7) throw new Error("write data discarded, use flow control to avoid losing data");
            if (!this._writeBuffer.length) {
              if (this._bufferOffset = 0, this._didUserInput) return this._didUserInput = false, this._pendingData += e3.length, this._writeBuffer.push(e3), this._callbacks.push(t3), void this._innerWrite();
              setTimeout(() => this._innerWrite());
            }
            this._pendingData += e3.length, this._writeBuffer.push(e3), this._callbacks.push(t3);
          }
          _innerWrite(e3 = 0, t3 = true) {
            const i3 = e3 || Date.now();
            for (; this._writeBuffer.length > this._bufferOffset; ) {
              const e4 = this._writeBuffer[this._bufferOffset], s3 = this._action(e4, t3);
              if (s3) {
                const e5 = (e6) => Date.now() - i3 >= 12 ? setTimeout(() => this._innerWrite(0, e6)) : this._innerWrite(i3, e6);
                return void s3.catch((e6) => (queueMicrotask(() => {
                  throw e6;
                }), Promise.resolve(false))).then(e5);
              }
              const r2 = this._callbacks[this._bufferOffset];
              if (r2 && r2(), this._bufferOffset++, this._pendingData -= e4.length, Date.now() - i3 >= 12) break;
            }
            this._writeBuffer.length > this._bufferOffset ? (this._bufferOffset > 50 && (this._writeBuffer = this._writeBuffer.slice(this._bufferOffset), this._callbacks = this._callbacks.slice(this._bufferOffset), this._bufferOffset = 0), setTimeout(() => this._innerWrite())) : (this._writeBuffer.length = 0, this._callbacks.length = 0, this._pendingData = 0, this._bufferOffset = 0), this._onWriteParsed.fire();
          }
        }
        t2.WriteBuffer = n;
      }, 5941: (e2, t2) => {
        Object.defineProperty(t2, "__esModule", { value: true }), t2.toRgbString = t2.parseColor = void 0;
        const i2 = /^([\da-f])\/([\da-f])\/([\da-f])$|^([\da-f]{2})\/([\da-f]{2})\/([\da-f]{2})$|^([\da-f]{3})\/([\da-f]{3})\/([\da-f]{3})$|^([\da-f]{4})\/([\da-f]{4})\/([\da-f]{4})$/, s2 = /^[\da-f]+$/;
        function r(e3, t3) {
          const i3 = e3.toString(16), s3 = i3.length < 2 ? "0" + i3 : i3;
          switch (t3) {
            case 4:
              return i3[0];
            case 8:
              return s3;
            case 12:
              return (s3 + s3).slice(0, 3);
            default:
              return s3 + s3;
          }
        }
        t2.parseColor = function(e3) {
          if (!e3) return;
          let t3 = e3.toLowerCase();
          if (0 === t3.indexOf("rgb:")) {
            t3 = t3.slice(4);
            const e4 = i2.exec(t3);
            if (e4) {
              const t4 = e4[1] ? 15 : e4[4] ? 255 : e4[7] ? 4095 : 65535;
              return [Math.round(parseInt(e4[1] || e4[4] || e4[7] || e4[10], 16) / t4 * 255), Math.round(parseInt(e4[2] || e4[5] || e4[8] || e4[11], 16) / t4 * 255), Math.round(parseInt(e4[3] || e4[6] || e4[9] || e4[12], 16) / t4 * 255)];
            }
          } else if (0 === t3.indexOf("#") && (t3 = t3.slice(1), s2.exec(t3) && [3, 6, 9, 12].includes(t3.length))) {
            const e4 = t3.length / 3, i3 = [0, 0, 0];
            for (let s3 = 0; s3 < 3; ++s3) {
              const r2 = parseInt(t3.slice(e4 * s3, e4 * s3 + e4), 16);
              i3[s3] = 1 === e4 ? r2 << 4 : 2 === e4 ? r2 : 3 === e4 ? r2 >> 4 : r2 >> 8;
            }
            return i3;
          }
        }, t2.toRgbString = function(e3, t3 = 16) {
          const [i3, s3, n] = e3;
          return `rgb:${r(i3, t3)}/${r(s3, t3)}/${r(n, t3)}`;
        };
      }, 5770: (e2, t2) => {
        Object.defineProperty(t2, "__esModule", { value: true }), t2.PAYLOAD_LIMIT = void 0, t2.PAYLOAD_LIMIT = 1e7;
      }, 6351: (e2, t2, i2) => {
        Object.defineProperty(t2, "__esModule", { value: true }), t2.DcsHandler = t2.DcsParser = void 0;
        const s2 = i2(482), r = i2(8742), n = i2(5770), o = [];
        t2.DcsParser = class {
          constructor() {
            this._handlers = /* @__PURE__ */ Object.create(null), this._active = o, this._ident = 0, this._handlerFb = () => {
            }, this._stack = { paused: false, loopPosition: 0, fallThrough: false };
          }
          dispose() {
            this._handlers = /* @__PURE__ */ Object.create(null), this._handlerFb = () => {
            }, this._active = o;
          }
          registerHandler(e3, t3) {
            void 0 === this._handlers[e3] && (this._handlers[e3] = []);
            const i3 = this._handlers[e3];
            return i3.push(t3), { dispose: () => {
              const e4 = i3.indexOf(t3);
              -1 !== e4 && i3.splice(e4, 1);
            } };
          }
          clearHandler(e3) {
            this._handlers[e3] && delete this._handlers[e3];
          }
          setHandlerFallback(e3) {
            this._handlerFb = e3;
          }
          reset() {
            if (this._active.length) for (let e3 = this._stack.paused ? this._stack.loopPosition - 1 : this._active.length - 1; e3 >= 0; --e3) this._active[e3].unhook(false);
            this._stack.paused = false, this._active = o, this._ident = 0;
          }
          hook(e3, t3) {
            if (this.reset(), this._ident = e3, this._active = this._handlers[e3] || o, this._active.length) for (let e4 = this._active.length - 1; e4 >= 0; e4--) this._active[e4].hook(t3);
            else this._handlerFb(this._ident, "HOOK", t3);
          }
          put(e3, t3, i3) {
            if (this._active.length) for (let s3 = this._active.length - 1; s3 >= 0; s3--) this._active[s3].put(e3, t3, i3);
            else this._handlerFb(this._ident, "PUT", (0, s2.utf32ToString)(e3, t3, i3));
          }
          unhook(e3, t3 = true) {
            if (this._active.length) {
              let i3 = false, s3 = this._active.length - 1, r2 = false;
              if (this._stack.paused && (s3 = this._stack.loopPosition - 1, i3 = t3, r2 = this._stack.fallThrough, this._stack.paused = false), !r2 && false === i3) {
                for (; s3 >= 0 && (i3 = this._active[s3].unhook(e3), true !== i3); s3--) if (i3 instanceof Promise) return this._stack.paused = true, this._stack.loopPosition = s3, this._stack.fallThrough = false, i3;
                s3--;
              }
              for (; s3 >= 0; s3--) if (i3 = this._active[s3].unhook(false), i3 instanceof Promise) return this._stack.paused = true, this._stack.loopPosition = s3, this._stack.fallThrough = true, i3;
            } else this._handlerFb(this._ident, "UNHOOK", e3);
            this._active = o, this._ident = 0;
          }
        };
        const a = new r.Params();
        a.addParam(0), t2.DcsHandler = class {
          constructor(e3) {
            this._handler = e3, this._data = "", this._params = a, this._hitLimit = false;
          }
          hook(e3) {
            this._params = e3.length > 1 || e3.params[0] ? e3.clone() : a, this._data = "", this._hitLimit = false;
          }
          put(e3, t3, i3) {
            this._hitLimit || (this._data += (0, s2.utf32ToString)(e3, t3, i3), this._data.length > n.PAYLOAD_LIMIT && (this._data = "", this._hitLimit = true));
          }
          unhook(e3) {
            let t3 = false;
            if (this._hitLimit) t3 = false;
            else if (e3 && (t3 = this._handler(this._data, this._params), t3 instanceof Promise)) return t3.then((e4) => (this._params = a, this._data = "", this._hitLimit = false, e4));
            return this._params = a, this._data = "", this._hitLimit = false, t3;
          }
        };
      }, 2015: (e2, t2, i2) => {
        Object.defineProperty(t2, "__esModule", { value: true }), t2.EscapeSequenceParser = t2.VT500_TRANSITION_TABLE = t2.TransitionTable = void 0;
        const s2 = i2(844), r = i2(8742), n = i2(6242), o = i2(6351);
        class a {
          constructor(e3) {
            this.table = new Uint8Array(e3);
          }
          setDefault(e3, t3) {
            this.table.fill(e3 << 4 | t3);
          }
          add(e3, t3, i3, s3) {
            this.table[t3 << 8 | e3] = i3 << 4 | s3;
          }
          addMany(e3, t3, i3, s3) {
            for (let r2 = 0; r2 < e3.length; r2++) this.table[t3 << 8 | e3[r2]] = i3 << 4 | s3;
          }
        }
        t2.TransitionTable = a;
        const h = 160;
        t2.VT500_TRANSITION_TABLE = function() {
          const e3 = new a(4095), t3 = Array.apply(null, Array(256)).map((e4, t4) => t4), i3 = (e4, i4) => t3.slice(e4, i4), s3 = i3(32, 127), r2 = i3(0, 24);
          r2.push(25), r2.push.apply(r2, i3(28, 32));
          const n2 = i3(0, 14);
          let o2;
          for (o2 in e3.setDefault(1, 0), e3.addMany(s3, 0, 2, 0), n2) e3.addMany([24, 26, 153, 154], o2, 3, 0), e3.addMany(i3(128, 144), o2, 3, 0), e3.addMany(i3(144, 152), o2, 3, 0), e3.add(156, o2, 0, 0), e3.add(27, o2, 11, 1), e3.add(157, o2, 4, 8), e3.addMany([152, 158, 159], o2, 0, 7), e3.add(155, o2, 11, 3), e3.add(144, o2, 11, 9);
          return e3.addMany(r2, 0, 3, 0), e3.addMany(r2, 1, 3, 1), e3.add(127, 1, 0, 1), e3.addMany(r2, 8, 0, 8), e3.addMany(r2, 3, 3, 3), e3.add(127, 3, 0, 3), e3.addMany(r2, 4, 3, 4), e3.add(127, 4, 0, 4), e3.addMany(r2, 6, 3, 6), e3.addMany(r2, 5, 3, 5), e3.add(127, 5, 0, 5), e3.addMany(r2, 2, 3, 2), e3.add(127, 2, 0, 2), e3.add(93, 1, 4, 8), e3.addMany(s3, 8, 5, 8), e3.add(127, 8, 5, 8), e3.addMany([156, 27, 24, 26, 7], 8, 6, 0), e3.addMany(i3(28, 32), 8, 0, 8), e3.addMany([88, 94, 95], 1, 0, 7), e3.addMany(s3, 7, 0, 7), e3.addMany(r2, 7, 0, 7), e3.add(156, 7, 0, 0), e3.add(127, 7, 0, 7), e3.add(91, 1, 11, 3), e3.addMany(i3(64, 127), 3, 7, 0), e3.addMany(i3(48, 60), 3, 8, 4), e3.addMany([60, 61, 62, 63], 3, 9, 4), e3.addMany(i3(48, 60), 4, 8, 4), e3.addMany(i3(64, 127), 4, 7, 0), e3.addMany([60, 61, 62, 63], 4, 0, 6), e3.addMany(i3(32, 64), 6, 0, 6), e3.add(127, 6, 0, 6), e3.addMany(i3(64, 127), 6, 0, 0), e3.addMany(i3(32, 48), 3, 9, 5), e3.addMany(i3(32, 48), 5, 9, 5), e3.addMany(i3(48, 64), 5, 0, 6), e3.addMany(i3(64, 127), 5, 7, 0), e3.addMany(i3(32, 48), 4, 9, 5), e3.addMany(i3(32, 48), 1, 9, 2), e3.addMany(i3(32, 48), 2, 9, 2), e3.addMany(i3(48, 127), 2, 10, 0), e3.addMany(i3(48, 80), 1, 10, 0), e3.addMany(i3(81, 88), 1, 10, 0), e3.addMany([89, 90, 92], 1, 10, 0), e3.addMany(i3(96, 127), 1, 10, 0), e3.add(80, 1, 11, 9), e3.addMany(r2, 9, 0, 9), e3.add(127, 9, 0, 9), e3.addMany(i3(28, 32), 9, 0, 9), e3.addMany(i3(32, 48), 9, 9, 12), e3.addMany(i3(48, 60), 9, 8, 10), e3.addMany([60, 61, 62, 63], 9, 9, 10), e3.addMany(r2, 11, 0, 11), e3.addMany(i3(32, 128), 11, 0, 11), e3.addMany(i3(28, 32), 11, 0, 11), e3.addMany(r2, 10, 0, 10), e3.add(127, 10, 0, 10), e3.addMany(i3(28, 32), 10, 0, 10), e3.addMany(i3(48, 60), 10, 8, 10), e3.addMany([60, 61, 62, 63], 10, 0, 11), e3.addMany(i3(32, 48), 10, 9, 12), e3.addMany(r2, 12, 0, 12), e3.add(127, 12, 0, 12), e3.addMany(i3(28, 32), 12, 0, 12), e3.addMany(i3(32, 48), 12, 9, 12), e3.addMany(i3(48, 64), 12, 0, 11), e3.addMany(i3(64, 127), 12, 12, 13), e3.addMany(i3(64, 127), 10, 12, 13), e3.addMany(i3(64, 127), 9, 12, 13), e3.addMany(r2, 13, 13, 13), e3.addMany(s3, 13, 13, 13), e3.add(127, 13, 0, 13), e3.addMany([27, 156, 24, 26], 13, 14, 0), e3.add(h, 0, 2, 0), e3.add(h, 8, 5, 8), e3.add(h, 6, 0, 6), e3.add(h, 11, 0, 11), e3.add(h, 13, 13, 13), e3;
        }();
        class c extends s2.Disposable {
          constructor(e3 = t2.VT500_TRANSITION_TABLE) {
            super(), this._transitions = e3, this._parseStack = { state: 0, handlers: [], handlerPos: 0, transition: 0, chunkPos: 0 }, this.initialState = 0, this.currentState = this.initialState, this._params = new r.Params(), this._params.addParam(0), this._collect = 0, this.precedingJoinState = 0, this._printHandlerFb = (e4, t3, i3) => {
            }, this._executeHandlerFb = (e4) => {
            }, this._csiHandlerFb = (e4, t3) => {
            }, this._escHandlerFb = (e4) => {
            }, this._errorHandlerFb = (e4) => e4, this._printHandler = this._printHandlerFb, this._executeHandlers = /* @__PURE__ */ Object.create(null), this._csiHandlers = /* @__PURE__ */ Object.create(null), this._escHandlers = /* @__PURE__ */ Object.create(null), this.register((0, s2.toDisposable)(() => {
              this._csiHandlers = /* @__PURE__ */ Object.create(null), this._executeHandlers = /* @__PURE__ */ Object.create(null), this._escHandlers = /* @__PURE__ */ Object.create(null);
            })), this._oscParser = this.register(new n.OscParser()), this._dcsParser = this.register(new o.DcsParser()), this._errorHandler = this._errorHandlerFb, this.registerEscHandler({ final: "\\" }, () => true);
          }
          _identifier(e3, t3 = [64, 126]) {
            let i3 = 0;
            if (e3.prefix) {
              if (e3.prefix.length > 1) throw new Error("only one byte as prefix supported");
              if (i3 = e3.prefix.charCodeAt(0), i3 && 60 > i3 || i3 > 63) throw new Error("prefix must be in range 0x3c .. 0x3f");
            }
            if (e3.intermediates) {
              if (e3.intermediates.length > 2) throw new Error("only two bytes as intermediates are supported");
              for (let t4 = 0; t4 < e3.intermediates.length; ++t4) {
                const s4 = e3.intermediates.charCodeAt(t4);
                if (32 > s4 || s4 > 47) throw new Error("intermediate must be in range 0x20 .. 0x2f");
                i3 <<= 8, i3 |= s4;
              }
            }
            if (1 !== e3.final.length) throw new Error("final must be a single byte");
            const s3 = e3.final.charCodeAt(0);
            if (t3[0] > s3 || s3 > t3[1]) throw new Error(`final must be in range ${t3[0]} .. ${t3[1]}`);
            return i3 <<= 8, i3 |= s3, i3;
          }
          identToString(e3) {
            const t3 = [];
            for (; e3; ) t3.push(String.fromCharCode(255 & e3)), e3 >>= 8;
            return t3.reverse().join("");
          }
          setPrintHandler(e3) {
            this._printHandler = e3;
          }
          clearPrintHandler() {
            this._printHandler = this._printHandlerFb;
          }
          registerEscHandler(e3, t3) {
            const i3 = this._identifier(e3, [48, 126]);
            void 0 === this._escHandlers[i3] && (this._escHandlers[i3] = []);
            const s3 = this._escHandlers[i3];
            return s3.push(t3), { dispose: () => {
              const e4 = s3.indexOf(t3);
              -1 !== e4 && s3.splice(e4, 1);
            } };
          }
          clearEscHandler(e3) {
            this._escHandlers[this._identifier(e3, [48, 126])] && delete this._escHandlers[this._identifier(e3, [48, 126])];
          }
          setEscHandlerFallback(e3) {
            this._escHandlerFb = e3;
          }
          setExecuteHandler(e3, t3) {
            this._executeHandlers[e3.charCodeAt(0)] = t3;
          }
          clearExecuteHandler(e3) {
            this._executeHandlers[e3.charCodeAt(0)] && delete this._executeHandlers[e3.charCodeAt(0)];
          }
          setExecuteHandlerFallback(e3) {
            this._executeHandlerFb = e3;
          }
          registerCsiHandler(e3, t3) {
            const i3 = this._identifier(e3);
            void 0 === this._csiHandlers[i3] && (this._csiHandlers[i3] = []);
            const s3 = this._csiHandlers[i3];
            return s3.push(t3), { dispose: () => {
              const e4 = s3.indexOf(t3);
              -1 !== e4 && s3.splice(e4, 1);
            } };
          }
          clearCsiHandler(e3) {
            this._csiHandlers[this._identifier(e3)] && delete this._csiHandlers[this._identifier(e3)];
          }
          setCsiHandlerFallback(e3) {
            this._csiHandlerFb = e3;
          }
          registerDcsHandler(e3, t3) {
            return this._dcsParser.registerHandler(this._identifier(e3), t3);
          }
          clearDcsHandler(e3) {
            this._dcsParser.clearHandler(this._identifier(e3));
          }
          setDcsHandlerFallback(e3) {
            this._dcsParser.setHandlerFallback(e3);
          }
          registerOscHandler(e3, t3) {
            return this._oscParser.registerHandler(e3, t3);
          }
          clearOscHandler(e3) {
            this._oscParser.clearHandler(e3);
          }
          setOscHandlerFallback(e3) {
            this._oscParser.setHandlerFallback(e3);
          }
          setErrorHandler(e3) {
            this._errorHandler = e3;
          }
          clearErrorHandler() {
            this._errorHandler = this._errorHandlerFb;
          }
          reset() {
            this.currentState = this.initialState, this._oscParser.reset(), this._dcsParser.reset(), this._params.reset(), this._params.addParam(0), this._collect = 0, this.precedingJoinState = 0, 0 !== this._parseStack.state && (this._parseStack.state = 2, this._parseStack.handlers = []);
          }
          _preserveStack(e3, t3, i3, s3, r2) {
            this._parseStack.state = e3, this._parseStack.handlers = t3, this._parseStack.handlerPos = i3, this._parseStack.transition = s3, this._parseStack.chunkPos = r2;
          }
          parse(e3, t3, i3) {
            let s3, r2 = 0, n2 = 0, o2 = 0;
            if (this._parseStack.state) if (2 === this._parseStack.state) this._parseStack.state = 0, o2 = this._parseStack.chunkPos + 1;
            else {
              if (void 0 === i3 || 1 === this._parseStack.state) throw this._parseStack.state = 1, new Error("improper continuation due to previous async handler, giving up parsing");
              const t4 = this._parseStack.handlers;
              let n3 = this._parseStack.handlerPos - 1;
              switch (this._parseStack.state) {
                case 3:
                  if (false === i3 && n3 > -1) {
                    for (; n3 >= 0 && (s3 = t4[n3](this._params), true !== s3); n3--) if (s3 instanceof Promise) return this._parseStack.handlerPos = n3, s3;
                  }
                  this._parseStack.handlers = [];
                  break;
                case 4:
                  if (false === i3 && n3 > -1) {
                    for (; n3 >= 0 && (s3 = t4[n3](), true !== s3); n3--) if (s3 instanceof Promise) return this._parseStack.handlerPos = n3, s3;
                  }
                  this._parseStack.handlers = [];
                  break;
                case 6:
                  if (r2 = e3[this._parseStack.chunkPos], s3 = this._dcsParser.unhook(24 !== r2 && 26 !== r2, i3), s3) return s3;
                  27 === r2 && (this._parseStack.transition |= 1), this._params.reset(), this._params.addParam(0), this._collect = 0;
                  break;
                case 5:
                  if (r2 = e3[this._parseStack.chunkPos], s3 = this._oscParser.end(24 !== r2 && 26 !== r2, i3), s3) return s3;
                  27 === r2 && (this._parseStack.transition |= 1), this._params.reset(), this._params.addParam(0), this._collect = 0;
              }
              this._parseStack.state = 0, o2 = this._parseStack.chunkPos + 1, this.precedingJoinState = 0, this.currentState = 15 & this._parseStack.transition;
            }
            for (let i4 = o2; i4 < t3; ++i4) {
              switch (r2 = e3[i4], n2 = this._transitions.table[this.currentState << 8 | (r2 < 160 ? r2 : h)], n2 >> 4) {
                case 2:
                  for (let s4 = i4 + 1; ; ++s4) {
                    if (s4 >= t3 || (r2 = e3[s4]) < 32 || r2 > 126 && r2 < h) {
                      this._printHandler(e3, i4, s4), i4 = s4 - 1;
                      break;
                    }
                    if (++s4 >= t3 || (r2 = e3[s4]) < 32 || r2 > 126 && r2 < h) {
                      this._printHandler(e3, i4, s4), i4 = s4 - 1;
                      break;
                    }
                    if (++s4 >= t3 || (r2 = e3[s4]) < 32 || r2 > 126 && r2 < h) {
                      this._printHandler(e3, i4, s4), i4 = s4 - 1;
                      break;
                    }
                    if (++s4 >= t3 || (r2 = e3[s4]) < 32 || r2 > 126 && r2 < h) {
                      this._printHandler(e3, i4, s4), i4 = s4 - 1;
                      break;
                    }
                  }
                  break;
                case 3:
                  this._executeHandlers[r2] ? this._executeHandlers[r2]() : this._executeHandlerFb(r2), this.precedingJoinState = 0;
                  break;
                case 0:
                  break;
                case 1:
                  if (this._errorHandler({ position: i4, code: r2, currentState: this.currentState, collect: this._collect, params: this._params, abort: false }).abort) return;
                  break;
                case 7:
                  const o3 = this._csiHandlers[this._collect << 8 | r2];
                  let a2 = o3 ? o3.length - 1 : -1;
                  for (; a2 >= 0 && (s3 = o3[a2](this._params), true !== s3); a2--) if (s3 instanceof Promise) return this._preserveStack(3, o3, a2, n2, i4), s3;
                  a2 < 0 && this._csiHandlerFb(this._collect << 8 | r2, this._params), this.precedingJoinState = 0;
                  break;
                case 8:
                  do {
                    switch (r2) {
                      case 59:
                        this._params.addParam(0);
                        break;
                      case 58:
                        this._params.addSubParam(-1);
                        break;
                      default:
                        this._params.addDigit(r2 - 48);
                    }
                  } while (++i4 < t3 && (r2 = e3[i4]) > 47 && r2 < 60);
                  i4--;
                  break;
                case 9:
                  this._collect <<= 8, this._collect |= r2;
                  break;
                case 10:
                  const c2 = this._escHandlers[this._collect << 8 | r2];
                  let l = c2 ? c2.length - 1 : -1;
                  for (; l >= 0 && (s3 = c2[l](), true !== s3); l--) if (s3 instanceof Promise) return this._preserveStack(4, c2, l, n2, i4), s3;
                  l < 0 && this._escHandlerFb(this._collect << 8 | r2), this.precedingJoinState = 0;
                  break;
                case 11:
                  this._params.reset(), this._params.addParam(0), this._collect = 0;
                  break;
                case 12:
                  this._dcsParser.hook(this._collect << 8 | r2, this._params);
                  break;
                case 13:
                  for (let s4 = i4 + 1; ; ++s4) if (s4 >= t3 || 24 === (r2 = e3[s4]) || 26 === r2 || 27 === r2 || r2 > 127 && r2 < h) {
                    this._dcsParser.put(e3, i4, s4), i4 = s4 - 1;
                    break;
                  }
                  break;
                case 14:
                  if (s3 = this._dcsParser.unhook(24 !== r2 && 26 !== r2), s3) return this._preserveStack(6, [], 0, n2, i4), s3;
                  27 === r2 && (n2 |= 1), this._params.reset(), this._params.addParam(0), this._collect = 0, this.precedingJoinState = 0;
                  break;
                case 4:
                  this._oscParser.start();
                  break;
                case 5:
                  for (let s4 = i4 + 1; ; s4++) if (s4 >= t3 || (r2 = e3[s4]) < 32 || r2 > 127 && r2 < h) {
                    this._oscParser.put(e3, i4, s4), i4 = s4 - 1;
                    break;
                  }
                  break;
                case 6:
                  if (s3 = this._oscParser.end(24 !== r2 && 26 !== r2), s3) return this._preserveStack(5, [], 0, n2, i4), s3;
                  27 === r2 && (n2 |= 1), this._params.reset(), this._params.addParam(0), this._collect = 0, this.precedingJoinState = 0;
              }
              this.currentState = 15 & n2;
            }
          }
        }
        t2.EscapeSequenceParser = c;
      }, 6242: (e2, t2, i2) => {
        Object.defineProperty(t2, "__esModule", { value: true }), t2.OscHandler = t2.OscParser = void 0;
        const s2 = i2(5770), r = i2(482), n = [];
        t2.OscParser = class {
          constructor() {
            this._state = 0, this._active = n, this._id = -1, this._handlers = /* @__PURE__ */ Object.create(null), this._handlerFb = () => {
            }, this._stack = { paused: false, loopPosition: 0, fallThrough: false };
          }
          registerHandler(e3, t3) {
            void 0 === this._handlers[e3] && (this._handlers[e3] = []);
            const i3 = this._handlers[e3];
            return i3.push(t3), { dispose: () => {
              const e4 = i3.indexOf(t3);
              -1 !== e4 && i3.splice(e4, 1);
            } };
          }
          clearHandler(e3) {
            this._handlers[e3] && delete this._handlers[e3];
          }
          setHandlerFallback(e3) {
            this._handlerFb = e3;
          }
          dispose() {
            this._handlers = /* @__PURE__ */ Object.create(null), this._handlerFb = () => {
            }, this._active = n;
          }
          reset() {
            if (2 === this._state) for (let e3 = this._stack.paused ? this._stack.loopPosition - 1 : this._active.length - 1; e3 >= 0; --e3) this._active[e3].end(false);
            this._stack.paused = false, this._active = n, this._id = -1, this._state = 0;
          }
          _start() {
            if (this._active = this._handlers[this._id] || n, this._active.length) for (let e3 = this._active.length - 1; e3 >= 0; e3--) this._active[e3].start();
            else this._handlerFb(this._id, "START");
          }
          _put(e3, t3, i3) {
            if (this._active.length) for (let s3 = this._active.length - 1; s3 >= 0; s3--) this._active[s3].put(e3, t3, i3);
            else this._handlerFb(this._id, "PUT", (0, r.utf32ToString)(e3, t3, i3));
          }
          start() {
            this.reset(), this._state = 1;
          }
          put(e3, t3, i3) {
            if (3 !== this._state) {
              if (1 === this._state) for (; t3 < i3; ) {
                const i4 = e3[t3++];
                if (59 === i4) {
                  this._state = 2, this._start();
                  break;
                }
                if (i4 < 48 || 57 < i4) return void (this._state = 3);
                -1 === this._id && (this._id = 0), this._id = 10 * this._id + i4 - 48;
              }
              2 === this._state && i3 - t3 > 0 && this._put(e3, t3, i3);
            }
          }
          end(e3, t3 = true) {
            if (0 !== this._state) {
              if (3 !== this._state) if (1 === this._state && this._start(), this._active.length) {
                let i3 = false, s3 = this._active.length - 1, r2 = false;
                if (this._stack.paused && (s3 = this._stack.loopPosition - 1, i3 = t3, r2 = this._stack.fallThrough, this._stack.paused = false), !r2 && false === i3) {
                  for (; s3 >= 0 && (i3 = this._active[s3].end(e3), true !== i3); s3--) if (i3 instanceof Promise) return this._stack.paused = true, this._stack.loopPosition = s3, this._stack.fallThrough = false, i3;
                  s3--;
                }
                for (; s3 >= 0; s3--) if (i3 = this._active[s3].end(false), i3 instanceof Promise) return this._stack.paused = true, this._stack.loopPosition = s3, this._stack.fallThrough = true, i3;
              } else this._handlerFb(this._id, "END", e3);
              this._active = n, this._id = -1, this._state = 0;
            }
          }
        }, t2.OscHandler = class {
          constructor(e3) {
            this._handler = e3, this._data = "", this._hitLimit = false;
          }
          start() {
            this._data = "", this._hitLimit = false;
          }
          put(e3, t3, i3) {
            this._hitLimit || (this._data += (0, r.utf32ToString)(e3, t3, i3), this._data.length > s2.PAYLOAD_LIMIT && (this._data = "", this._hitLimit = true));
          }
          end(e3) {
            let t3 = false;
            if (this._hitLimit) t3 = false;
            else if (e3 && (t3 = this._handler(this._data), t3 instanceof Promise)) return t3.then((e4) => (this._data = "", this._hitLimit = false, e4));
            return this._data = "", this._hitLimit = false, t3;
          }
        };
      }, 8742: (e2, t2) => {
        Object.defineProperty(t2, "__esModule", { value: true }), t2.Params = void 0;
        const i2 = 2147483647;
        class s2 {
          static fromArray(e3) {
            const t3 = new s2();
            if (!e3.length) return t3;
            for (let i3 = Array.isArray(e3[0]) ? 1 : 0; i3 < e3.length; ++i3) {
              const s3 = e3[i3];
              if (Array.isArray(s3)) for (let e4 = 0; e4 < s3.length; ++e4) t3.addSubParam(s3[e4]);
              else t3.addParam(s3);
            }
            return t3;
          }
          constructor(e3 = 32, t3 = 32) {
            if (this.maxLength = e3, this.maxSubParamsLength = t3, t3 > 256) throw new Error("maxSubParamsLength must not be greater than 256");
            this.params = new Int32Array(e3), this.length = 0, this._subParams = new Int32Array(t3), this._subParamsLength = 0, this._subParamsIdx = new Uint16Array(e3), this._rejectDigits = false, this._rejectSubDigits = false, this._digitIsSub = false;
          }
          clone() {
            const e3 = new s2(this.maxLength, this.maxSubParamsLength);
            return e3.params.set(this.params), e3.length = this.length, e3._subParams.set(this._subParams), e3._subParamsLength = this._subParamsLength, e3._subParamsIdx.set(this._subParamsIdx), e3._rejectDigits = this._rejectDigits, e3._rejectSubDigits = this._rejectSubDigits, e3._digitIsSub = this._digitIsSub, e3;
          }
          toArray() {
            const e3 = [];
            for (let t3 = 0; t3 < this.length; ++t3) {
              e3.push(this.params[t3]);
              const i3 = this._subParamsIdx[t3] >> 8, s3 = 255 & this._subParamsIdx[t3];
              s3 - i3 > 0 && e3.push(Array.prototype.slice.call(this._subParams, i3, s3));
            }
            return e3;
          }
          reset() {
            this.length = 0, this._subParamsLength = 0, this._rejectDigits = false, this._rejectSubDigits = false, this._digitIsSub = false;
          }
          addParam(e3) {
            if (this._digitIsSub = false, this.length >= this.maxLength) this._rejectDigits = true;
            else {
              if (e3 < -1) throw new Error("values lesser than -1 are not allowed");
              this._subParamsIdx[this.length] = this._subParamsLength << 8 | this._subParamsLength, this.params[this.length++] = e3 > i2 ? i2 : e3;
            }
          }
          addSubParam(e3) {
            if (this._digitIsSub = true, this.length) if (this._rejectDigits || this._subParamsLength >= this.maxSubParamsLength) this._rejectSubDigits = true;
            else {
              if (e3 < -1) throw new Error("values lesser than -1 are not allowed");
              this._subParams[this._subParamsLength++] = e3 > i2 ? i2 : e3, this._subParamsIdx[this.length - 1]++;
            }
          }
          hasSubParams(e3) {
            return (255 & this._subParamsIdx[e3]) - (this._subParamsIdx[e3] >> 8) > 0;
          }
          getSubParams(e3) {
            const t3 = this._subParamsIdx[e3] >> 8, i3 = 255 & this._subParamsIdx[e3];
            return i3 - t3 > 0 ? this._subParams.subarray(t3, i3) : null;
          }
          getSubParamsAll() {
            const e3 = {};
            for (let t3 = 0; t3 < this.length; ++t3) {
              const i3 = this._subParamsIdx[t3] >> 8, s3 = 255 & this._subParamsIdx[t3];
              s3 - i3 > 0 && (e3[t3] = this._subParams.slice(i3, s3));
            }
            return e3;
          }
          addDigit(e3) {
            let t3;
            if (this._rejectDigits || !(t3 = this._digitIsSub ? this._subParamsLength : this.length) || this._digitIsSub && this._rejectSubDigits) return;
            const s3 = this._digitIsSub ? this._subParams : this.params, r = s3[t3 - 1];
            s3[t3 - 1] = ~r ? Math.min(10 * r + e3, i2) : e3;
          }
        }
        t2.Params = s2;
      }, 5741: (e2, t2) => {
        Object.defineProperty(t2, "__esModule", { value: true }), t2.AddonManager = void 0, t2.AddonManager = class {
          constructor() {
            this._addons = [];
          }
          dispose() {
            for (let e3 = this._addons.length - 1; e3 >= 0; e3--) this._addons[e3].instance.dispose();
          }
          loadAddon(e3, t3) {
            const i2 = { instance: t3, dispose: t3.dispose, isDisposed: false };
            this._addons.push(i2), t3.dispose = () => this._wrappedAddonDispose(i2), t3.activate(e3);
          }
          _wrappedAddonDispose(e3) {
            if (e3.isDisposed) return;
            let t3 = -1;
            for (let i2 = 0; i2 < this._addons.length; i2++) if (this._addons[i2] === e3) {
              t3 = i2;
              break;
            }
            if (-1 === t3) throw new Error("Could not dispose an addon that has not been loaded");
            e3.isDisposed = true, e3.dispose.apply(e3.instance), this._addons.splice(t3, 1);
          }
        };
      }, 8771: (e2, t2, i2) => {
        Object.defineProperty(t2, "__esModule", { value: true }), t2.BufferApiView = void 0;
        const s2 = i2(3785), r = i2(511);
        t2.BufferApiView = class {
          constructor(e3, t3) {
            this._buffer = e3, this.type = t3;
          }
          init(e3) {
            return this._buffer = e3, this;
          }
          get cursorY() {
            return this._buffer.y;
          }
          get cursorX() {
            return this._buffer.x;
          }
          get viewportY() {
            return this._buffer.ydisp;
          }
          get baseY() {
            return this._buffer.ybase;
          }
          get length() {
            return this._buffer.lines.length;
          }
          getLine(e3) {
            const t3 = this._buffer.lines.get(e3);
            if (t3) return new s2.BufferLineApiView(t3);
          }
          getNullCell() {
            return new r.CellData();
          }
        };
      }, 3785: (e2, t2, i2) => {
        Object.defineProperty(t2, "__esModule", { value: true }), t2.BufferLineApiView = void 0;
        const s2 = i2(511);
        t2.BufferLineApiView = class {
          constructor(e3) {
            this._line = e3;
          }
          get isWrapped() {
            return this._line.isWrapped;
          }
          get length() {
            return this._line.length;
          }
          getCell(e3, t3) {
            if (!(e3 < 0 || e3 >= this._line.length)) return t3 ? (this._line.loadCell(e3, t3), t3) : this._line.loadCell(e3, new s2.CellData());
          }
          translateToString(e3, t3, i3) {
            return this._line.translateToString(e3, t3, i3);
          }
        };
      }, 8285: (e2, t2, i2) => {
        Object.defineProperty(t2, "__esModule", { value: true }), t2.BufferNamespaceApi = void 0;
        const s2 = i2(8771), r = i2(8460), n = i2(844);
        class o extends n.Disposable {
          constructor(e3) {
            super(), this._core = e3, this._onBufferChange = this.register(new r.EventEmitter()), this.onBufferChange = this._onBufferChange.event, this._normal = new s2.BufferApiView(this._core.buffers.normal, "normal"), this._alternate = new s2.BufferApiView(this._core.buffers.alt, "alternate"), this._core.buffers.onBufferActivate(() => this._onBufferChange.fire(this.active));
          }
          get active() {
            if (this._core.buffers.active === this._core.buffers.normal) return this.normal;
            if (this._core.buffers.active === this._core.buffers.alt) return this.alternate;
            throw new Error("Active buffer is neither normal nor alternate");
          }
          get normal() {
            return this._normal.init(this._core.buffers.normal);
          }
          get alternate() {
            return this._alternate.init(this._core.buffers.alt);
          }
        }
        t2.BufferNamespaceApi = o;
      }, 7975: (e2, t2) => {
        Object.defineProperty(t2, "__esModule", { value: true }), t2.ParserApi = void 0, t2.ParserApi = class {
          constructor(e3) {
            this._core = e3;
          }
          registerCsiHandler(e3, t3) {
            return this._core.registerCsiHandler(e3, (e4) => t3(e4.toArray()));
          }
          addCsiHandler(e3, t3) {
            return this.registerCsiHandler(e3, t3);
          }
          registerDcsHandler(e3, t3) {
            return this._core.registerDcsHandler(e3, (e4, i2) => t3(e4, i2.toArray()));
          }
          addDcsHandler(e3, t3) {
            return this.registerDcsHandler(e3, t3);
          }
          registerEscHandler(e3, t3) {
            return this._core.registerEscHandler(e3, t3);
          }
          addEscHandler(e3, t3) {
            return this.registerEscHandler(e3, t3);
          }
          registerOscHandler(e3, t3) {
            return this._core.registerOscHandler(e3, t3);
          }
          addOscHandler(e3, t3) {
            return this.registerOscHandler(e3, t3);
          }
        };
      }, 7090: (e2, t2) => {
        Object.defineProperty(t2, "__esModule", { value: true }), t2.UnicodeApi = void 0, t2.UnicodeApi = class {
          constructor(e3) {
            this._core = e3;
          }
          register(e3) {
            this._core.unicodeService.register(e3);
          }
          get versions() {
            return this._core.unicodeService.versions;
          }
          get activeVersion() {
            return this._core.unicodeService.activeVersion;
          }
          set activeVersion(e3) {
            this._core.unicodeService.activeVersion = e3;
          }
        };
      }, 744: function(e2, t2, i2) {
        var s2 = this && this.__decorate || function(e3, t3, i3, s3) {
          var r2, n2 = arguments.length, o2 = n2 < 3 ? t3 : null === s3 ? s3 = Object.getOwnPropertyDescriptor(t3, i3) : s3;
          if ("object" == typeof Reflect && "function" == typeof Reflect.decorate) o2 = Reflect.decorate(e3, t3, i3, s3);
          else for (var a2 = e3.length - 1; a2 >= 0; a2--) (r2 = e3[a2]) && (o2 = (n2 < 3 ? r2(o2) : n2 > 3 ? r2(t3, i3, o2) : r2(t3, i3)) || o2);
          return n2 > 3 && o2 && Object.defineProperty(t3, i3, o2), o2;
        }, r = this && this.__param || function(e3, t3) {
          return function(i3, s3) {
            t3(i3, s3, e3);
          };
        };
        Object.defineProperty(t2, "__esModule", { value: true }), t2.BufferService = t2.MINIMUM_ROWS = t2.MINIMUM_COLS = void 0;
        const n = i2(8460), o = i2(844), a = i2(5295), h = i2(2585);
        t2.MINIMUM_COLS = 2, t2.MINIMUM_ROWS = 1;
        let c = t2.BufferService = class extends o.Disposable {
          get buffer() {
            return this.buffers.active;
          }
          constructor(e3) {
            super(), this.isUserScrolling = false, this._onResize = this.register(new n.EventEmitter()), this.onResize = this._onResize.event, this._onScroll = this.register(new n.EventEmitter()), this.onScroll = this._onScroll.event, this.cols = Math.max(e3.rawOptions.cols || 0, t2.MINIMUM_COLS), this.rows = Math.max(e3.rawOptions.rows || 0, t2.MINIMUM_ROWS), this.buffers = this.register(new a.BufferSet(e3, this));
          }
          resize(e3, t3) {
            this.cols = e3, this.rows = t3, this.buffers.resize(e3, t3), this._onResize.fire({ cols: e3, rows: t3 });
          }
          reset() {
            this.buffers.reset(), this.isUserScrolling = false;
          }
          scroll(e3, t3 = false) {
            const i3 = this.buffer;
            let s3;
            s3 = this._cachedBlankLine, s3 && s3.length === this.cols && s3.getFg(0) === e3.fg && s3.getBg(0) === e3.bg || (s3 = i3.getBlankLine(e3, t3), this._cachedBlankLine = s3), s3.isWrapped = t3;
            const r2 = i3.ybase + i3.scrollTop, n2 = i3.ybase + i3.scrollBottom;
            if (0 === i3.scrollTop) {
              const e4 = i3.lines.isFull;
              n2 === i3.lines.length - 1 ? e4 ? i3.lines.recycle().copyFrom(s3) : i3.lines.push(s3.clone()) : i3.lines.splice(n2 + 1, 0, s3.clone()), e4 ? this.isUserScrolling && (i3.ydisp = Math.max(i3.ydisp - 1, 0)) : (i3.ybase++, this.isUserScrolling || i3.ydisp++);
            } else {
              const e4 = n2 - r2 + 1;
              i3.lines.shiftElements(r2 + 1, e4 - 1, -1), i3.lines.set(n2, s3.clone());
            }
            this.isUserScrolling || (i3.ydisp = i3.ybase), this._onScroll.fire(i3.ydisp);
          }
          scrollLines(e3, t3, i3) {
            const s3 = this.buffer;
            if (e3 < 0) {
              if (0 === s3.ydisp) return;
              this.isUserScrolling = true;
            } else e3 + s3.ydisp >= s3.ybase && (this.isUserScrolling = false);
            const r2 = s3.ydisp;
            s3.ydisp = Math.max(Math.min(s3.ydisp + e3, s3.ybase), 0), r2 !== s3.ydisp && (t3 || this._onScroll.fire(s3.ydisp));
          }
        };
        t2.BufferService = c = s2([r(0, h.IOptionsService)], c);
      }, 7994: (e2, t2) => {
        Object.defineProperty(t2, "__esModule", { value: true }), t2.CharsetService = void 0, t2.CharsetService = class {
          constructor() {
            this.glevel = 0, this._charsets = [];
          }
          reset() {
            this.charset = void 0, this._charsets = [], this.glevel = 0;
          }
          setgLevel(e3) {
            this.glevel = e3, this.charset = this._charsets[e3];
          }
          setgCharset(e3, t3) {
            this._charsets[e3] = t3, this.glevel === e3 && (this.charset = t3);
          }
        };
      }, 1753: function(e2, t2, i2) {
        var s2 = this && this.__decorate || function(e3, t3, i3, s3) {
          var r2, n2 = arguments.length, o2 = n2 < 3 ? t3 : null === s3 ? s3 = Object.getOwnPropertyDescriptor(t3, i3) : s3;
          if ("object" == typeof Reflect && "function" == typeof Reflect.decorate) o2 = Reflect.decorate(e3, t3, i3, s3);
          else for (var a2 = e3.length - 1; a2 >= 0; a2--) (r2 = e3[a2]) && (o2 = (n2 < 3 ? r2(o2) : n2 > 3 ? r2(t3, i3, o2) : r2(t3, i3)) || o2);
          return n2 > 3 && o2 && Object.defineProperty(t3, i3, o2), o2;
        }, r = this && this.__param || function(e3, t3) {
          return function(i3, s3) {
            t3(i3, s3, e3);
          };
        };
        Object.defineProperty(t2, "__esModule", { value: true }), t2.CoreMouseService = void 0;
        const n = i2(2585), o = i2(8460), a = i2(844), h = { NONE: { events: 0, restrict: () => false }, X10: { events: 1, restrict: (e3) => 4 !== e3.button && 1 === e3.action && (e3.ctrl = false, e3.alt = false, e3.shift = false, true) }, VT200: { events: 19, restrict: (e3) => 32 !== e3.action }, DRAG: { events: 23, restrict: (e3) => 32 !== e3.action || 3 !== e3.button }, ANY: { events: 31, restrict: (e3) => true } };
        function c(e3, t3) {
          let i3 = (e3.ctrl ? 16 : 0) | (e3.shift ? 4 : 0) | (e3.alt ? 8 : 0);
          return 4 === e3.button ? (i3 |= 64, i3 |= e3.action) : (i3 |= 3 & e3.button, 4 & e3.button && (i3 |= 64), 8 & e3.button && (i3 |= 128), 32 === e3.action ? i3 |= 32 : 0 !== e3.action || t3 || (i3 |= 3)), i3;
        }
        const l = String.fromCharCode, d = { DEFAULT: (e3) => {
          const t3 = [c(e3, false) + 32, e3.col + 32, e3.row + 32];
          return t3[0] > 255 || t3[1] > 255 || t3[2] > 255 ? "" : `\x1B[M${l(t3[0])}${l(t3[1])}${l(t3[2])}`;
        }, SGR: (e3) => {
          const t3 = 0 === e3.action && 4 !== e3.button ? "m" : "M";
          return `\x1B[<${c(e3, true)};${e3.col};${e3.row}${t3}`;
        }, SGR_PIXELS: (e3) => {
          const t3 = 0 === e3.action && 4 !== e3.button ? "m" : "M";
          return `\x1B[<${c(e3, true)};${e3.x};${e3.y}${t3}`;
        } };
        let _ = t2.CoreMouseService = class extends a.Disposable {
          constructor(e3, t3) {
            super(), this._bufferService = e3, this._coreService = t3, this._protocols = {}, this._encodings = {}, this._activeProtocol = "", this._activeEncoding = "", this._lastEvent = null, this._onProtocolChange = this.register(new o.EventEmitter()), this.onProtocolChange = this._onProtocolChange.event;
            for (const e4 of Object.keys(h)) this.addProtocol(e4, h[e4]);
            for (const e4 of Object.keys(d)) this.addEncoding(e4, d[e4]);
            this.reset();
          }
          addProtocol(e3, t3) {
            this._protocols[e3] = t3;
          }
          addEncoding(e3, t3) {
            this._encodings[e3] = t3;
          }
          get activeProtocol() {
            return this._activeProtocol;
          }
          get areMouseEventsActive() {
            return 0 !== this._protocols[this._activeProtocol].events;
          }
          set activeProtocol(e3) {
            if (!this._protocols[e3]) throw new Error(`unknown protocol "${e3}"`);
            this._activeProtocol = e3, this._onProtocolChange.fire(this._protocols[e3].events);
          }
          get activeEncoding() {
            return this._activeEncoding;
          }
          set activeEncoding(e3) {
            if (!this._encodings[e3]) throw new Error(`unknown encoding "${e3}"`);
            this._activeEncoding = e3;
          }
          reset() {
            this.activeProtocol = "NONE", this.activeEncoding = "DEFAULT", this._lastEvent = null;
          }
          triggerMouseEvent(e3) {
            if (e3.col < 0 || e3.col >= this._bufferService.cols || e3.row < 0 || e3.row >= this._bufferService.rows) return false;
            if (4 === e3.button && 32 === e3.action) return false;
            if (3 === e3.button && 32 !== e3.action) return false;
            if (4 !== e3.button && (2 === e3.action || 3 === e3.action)) return false;
            if (e3.col++, e3.row++, 32 === e3.action && this._lastEvent && this._equalEvents(this._lastEvent, e3, "SGR_PIXELS" === this._activeEncoding)) return false;
            if (!this._protocols[this._activeProtocol].restrict(e3)) return false;
            const t3 = this._encodings[this._activeEncoding](e3);
            return t3 && ("DEFAULT" === this._activeEncoding ? this._coreService.triggerBinaryEvent(t3) : this._coreService.triggerDataEvent(t3, true)), this._lastEvent = e3, true;
          }
          explainEvents(e3) {
            return { down: !!(1 & e3), up: !!(2 & e3), drag: !!(4 & e3), move: !!(8 & e3), wheel: !!(16 & e3) };
          }
          _equalEvents(e3, t3, i3) {
            if (i3) {
              if (e3.x !== t3.x) return false;
              if (e3.y !== t3.y) return false;
            } else {
              if (e3.col !== t3.col) return false;
              if (e3.row !== t3.row) return false;
            }
            return e3.button === t3.button && e3.action === t3.action && e3.ctrl === t3.ctrl && e3.alt === t3.alt && e3.shift === t3.shift;
          }
        };
        t2.CoreMouseService = _ = s2([r(0, n.IBufferService), r(1, n.ICoreService)], _);
      }, 6975: function(e2, t2, i2) {
        var s2 = this && this.__decorate || function(e3, t3, i3, s3) {
          var r2, n2 = arguments.length, o2 = n2 < 3 ? t3 : null === s3 ? s3 = Object.getOwnPropertyDescriptor(t3, i3) : s3;
          if ("object" == typeof Reflect && "function" == typeof Reflect.decorate) o2 = Reflect.decorate(e3, t3, i3, s3);
          else for (var a2 = e3.length - 1; a2 >= 0; a2--) (r2 = e3[a2]) && (o2 = (n2 < 3 ? r2(o2) : n2 > 3 ? r2(t3, i3, o2) : r2(t3, i3)) || o2);
          return n2 > 3 && o2 && Object.defineProperty(t3, i3, o2), o2;
        }, r = this && this.__param || function(e3, t3) {
          return function(i3, s3) {
            t3(i3, s3, e3);
          };
        };
        Object.defineProperty(t2, "__esModule", { value: true }), t2.CoreService = void 0;
        const n = i2(1439), o = i2(8460), a = i2(844), h = i2(2585), c = Object.freeze({ insertMode: false }), l = Object.freeze({ applicationCursorKeys: false, applicationKeypad: false, bracketedPasteMode: false, origin: false, reverseWraparound: false, sendFocus: false, wraparound: true });
        let d = t2.CoreService = class extends a.Disposable {
          constructor(e3, t3, i3) {
            super(), this._bufferService = e3, this._logService = t3, this._optionsService = i3, this.isCursorInitialized = false, this.isCursorHidden = false, this._onData = this.register(new o.EventEmitter()), this.onData = this._onData.event, this._onUserInput = this.register(new o.EventEmitter()), this.onUserInput = this._onUserInput.event, this._onBinary = this.register(new o.EventEmitter()), this.onBinary = this._onBinary.event, this._onRequestScrollToBottom = this.register(new o.EventEmitter()), this.onRequestScrollToBottom = this._onRequestScrollToBottom.event, this.modes = (0, n.clone)(c), this.decPrivateModes = (0, n.clone)(l);
          }
          reset() {
            this.modes = (0, n.clone)(c), this.decPrivateModes = (0, n.clone)(l);
          }
          triggerDataEvent(e3, t3 = false) {
            if (this._optionsService.rawOptions.disableStdin) return;
            const i3 = this._bufferService.buffer;
            t3 && this._optionsService.rawOptions.scrollOnUserInput && i3.ybase !== i3.ydisp && this._onRequestScrollToBottom.fire(), t3 && this._onUserInput.fire(), this._logService.debug(`sending data "${e3}"`, () => e3.split("").map((e4) => e4.charCodeAt(0))), this._onData.fire(e3);
          }
          triggerBinaryEvent(e3) {
            this._optionsService.rawOptions.disableStdin || (this._logService.debug(`sending binary "${e3}"`, () => e3.split("").map((e4) => e4.charCodeAt(0))), this._onBinary.fire(e3));
          }
        };
        t2.CoreService = d = s2([r(0, h.IBufferService), r(1, h.ILogService), r(2, h.IOptionsService)], d);
      }, 9074: (e2, t2, i2) => {
        Object.defineProperty(t2, "__esModule", { value: true }), t2.DecorationService = void 0;
        const s2 = i2(8055), r = i2(8460), n = i2(844), o = i2(6106);
        let a = 0, h = 0;
        class c extends n.Disposable {
          get decorations() {
            return this._decorations.values();
          }
          constructor() {
            super(), this._decorations = new o.SortedList((e3) => e3 == null ? void 0 : e3.marker.line), this._onDecorationRegistered = this.register(new r.EventEmitter()), this.onDecorationRegistered = this._onDecorationRegistered.event, this._onDecorationRemoved = this.register(new r.EventEmitter()), this.onDecorationRemoved = this._onDecorationRemoved.event, this.register((0, n.toDisposable)(() => this.reset()));
          }
          registerDecoration(e3) {
            if (e3.marker.isDisposed) return;
            const t3 = new l(e3);
            if (t3) {
              const e4 = t3.marker.onDispose(() => t3.dispose());
              t3.onDispose(() => {
                t3 && (this._decorations.delete(t3) && this._onDecorationRemoved.fire(t3), e4.dispose());
              }), this._decorations.insert(t3), this._onDecorationRegistered.fire(t3);
            }
            return t3;
          }
          reset() {
            for (const e3 of this._decorations.values()) e3.dispose();
            this._decorations.clear();
          }
          *getDecorationsAtCell(e3, t3, i3) {
            let s3 = 0, r2 = 0;
            for (const n2 of this._decorations.getKeyIterator(t3)) s3 = n2.options.x ?? 0, r2 = s3 + (n2.options.width ?? 1), e3 >= s3 && e3 < r2 && (!i3 || (n2.options.layer ?? "bottom") === i3) && (yield n2);
          }
          forEachDecorationAtCell(e3, t3, i3, s3) {
            this._decorations.forEachByKey(t3, (t4) => {
              a = t4.options.x ?? 0, h = a + (t4.options.width ?? 1), e3 >= a && e3 < h && (!i3 || (t4.options.layer ?? "bottom") === i3) && s3(t4);
            });
          }
        }
        t2.DecorationService = c;
        class l extends n.Disposable {
          get isDisposed() {
            return this._isDisposed;
          }
          get backgroundColorRGB() {
            return null === this._cachedBg && (this.options.backgroundColor ? this._cachedBg = s2.css.toColor(this.options.backgroundColor) : this._cachedBg = void 0), this._cachedBg;
          }
          get foregroundColorRGB() {
            return null === this._cachedFg && (this.options.foregroundColor ? this._cachedFg = s2.css.toColor(this.options.foregroundColor) : this._cachedFg = void 0), this._cachedFg;
          }
          constructor(e3) {
            super(), this.options = e3, this.onRenderEmitter = this.register(new r.EventEmitter()), this.onRender = this.onRenderEmitter.event, this._onDispose = this.register(new r.EventEmitter()), this.onDispose = this._onDispose.event, this._cachedBg = null, this._cachedFg = null, this.marker = e3.marker, this.options.overviewRulerOptions && !this.options.overviewRulerOptions.position && (this.options.overviewRulerOptions.position = "full");
          }
          dispose() {
            this._onDispose.fire(), super.dispose();
          }
        }
      }, 4348: (e2, t2, i2) => {
        Object.defineProperty(t2, "__esModule", { value: true }), t2.InstantiationService = t2.ServiceCollection = void 0;
        const s2 = i2(2585), r = i2(8343);
        class n {
          constructor(...e3) {
            this._entries = /* @__PURE__ */ new Map();
            for (const [t3, i3] of e3) this.set(t3, i3);
          }
          set(e3, t3) {
            const i3 = this._entries.get(e3);
            return this._entries.set(e3, t3), i3;
          }
          forEach(e3) {
            for (const [t3, i3] of this._entries.entries()) e3(t3, i3);
          }
          has(e3) {
            return this._entries.has(e3);
          }
          get(e3) {
            return this._entries.get(e3);
          }
        }
        t2.ServiceCollection = n, t2.InstantiationService = class {
          constructor() {
            this._services = new n(), this._services.set(s2.IInstantiationService, this);
          }
          setService(e3, t3) {
            this._services.set(e3, t3);
          }
          getService(e3) {
            return this._services.get(e3);
          }
          createInstance(e3, ...t3) {
            const i3 = (0, r.getServiceDependencies)(e3).sort((e4, t4) => e4.index - t4.index), s3 = [];
            for (const t4 of i3) {
              const i4 = this._services.get(t4.id);
              if (!i4) throw new Error(`[createInstance] ${e3.name} depends on UNKNOWN service ${t4.id}.`);
              s3.push(i4);
            }
            const n2 = i3.length > 0 ? i3[0].index : t3.length;
            if (t3.length !== n2) throw new Error(`[createInstance] First service dependency of ${e3.name} at position ${n2 + 1} conflicts with ${t3.length} static arguments`);
            return new e3(...[...t3, ...s3]);
          }
        };
      }, 7866: function(e2, t2, i2) {
        var s2 = this && this.__decorate || function(e3, t3, i3, s3) {
          var r2, n2 = arguments.length, o2 = n2 < 3 ? t3 : null === s3 ? s3 = Object.getOwnPropertyDescriptor(t3, i3) : s3;
          if ("object" == typeof Reflect && "function" == typeof Reflect.decorate) o2 = Reflect.decorate(e3, t3, i3, s3);
          else for (var a2 = e3.length - 1; a2 >= 0; a2--) (r2 = e3[a2]) && (o2 = (n2 < 3 ? r2(o2) : n2 > 3 ? r2(t3, i3, o2) : r2(t3, i3)) || o2);
          return n2 > 3 && o2 && Object.defineProperty(t3, i3, o2), o2;
        }, r = this && this.__param || function(e3, t3) {
          return function(i3, s3) {
            t3(i3, s3, e3);
          };
        };
        Object.defineProperty(t2, "__esModule", { value: true }), t2.traceCall = t2.setTraceLogger = t2.LogService = void 0;
        const n = i2(844), o = i2(2585), a = { trace: o.LogLevelEnum.TRACE, debug: o.LogLevelEnum.DEBUG, info: o.LogLevelEnum.INFO, warn: o.LogLevelEnum.WARN, error: o.LogLevelEnum.ERROR, off: o.LogLevelEnum.OFF };
        let h, c = t2.LogService = class extends n.Disposable {
          get logLevel() {
            return this._logLevel;
          }
          constructor(e3) {
            super(), this._optionsService = e3, this._logLevel = o.LogLevelEnum.OFF, this._updateLogLevel(), this.register(this._optionsService.onSpecificOptionChange("logLevel", () => this._updateLogLevel())), h = this;
          }
          _updateLogLevel() {
            this._logLevel = a[this._optionsService.rawOptions.logLevel];
          }
          _evalLazyOptionalParams(e3) {
            for (let t3 = 0; t3 < e3.length; t3++) "function" == typeof e3[t3] && (e3[t3] = e3[t3]());
          }
          _log(e3, t3, i3) {
            this._evalLazyOptionalParams(i3), e3.call(console, (this._optionsService.options.logger ? "" : "xterm.js: ") + t3, ...i3);
          }
          trace(e3, ...t3) {
            var _a2;
            this._logLevel <= o.LogLevelEnum.TRACE && this._log(((_a2 = this._optionsService.options.logger) == null ? void 0 : _a2.trace.bind(this._optionsService.options.logger)) ?? console.log, e3, t3);
          }
          debug(e3, ...t3) {
            var _a2;
            this._logLevel <= o.LogLevelEnum.DEBUG && this._log(((_a2 = this._optionsService.options.logger) == null ? void 0 : _a2.debug.bind(this._optionsService.options.logger)) ?? console.log, e3, t3);
          }
          info(e3, ...t3) {
            var _a2;
            this._logLevel <= o.LogLevelEnum.INFO && this._log(((_a2 = this._optionsService.options.logger) == null ? void 0 : _a2.info.bind(this._optionsService.options.logger)) ?? console.info, e3, t3);
          }
          warn(e3, ...t3) {
            var _a2;
            this._logLevel <= o.LogLevelEnum.WARN && this._log(((_a2 = this._optionsService.options.logger) == null ? void 0 : _a2.warn.bind(this._optionsService.options.logger)) ?? console.warn, e3, t3);
          }
          error(e3, ...t3) {
            var _a2;
            this._logLevel <= o.LogLevelEnum.ERROR && this._log(((_a2 = this._optionsService.options.logger) == null ? void 0 : _a2.error.bind(this._optionsService.options.logger)) ?? console.error, e3, t3);
          }
        };
        t2.LogService = c = s2([r(0, o.IOptionsService)], c), t2.setTraceLogger = function(e3) {
          h = e3;
        }, t2.traceCall = function(e3, t3, i3) {
          if ("function" != typeof i3.value) throw new Error("not supported");
          const s3 = i3.value;
          i3.value = function(...e4) {
            if (h.logLevel !== o.LogLevelEnum.TRACE) return s3.apply(this, e4);
            h.trace(`GlyphRenderer#${s3.name}(${e4.map((e5) => JSON.stringify(e5)).join(", ")})`);
            const t4 = s3.apply(this, e4);
            return h.trace(`GlyphRenderer#${s3.name} return`, t4), t4;
          };
        };
      }, 7302: (e2, t2, i2) => {
        Object.defineProperty(t2, "__esModule", { value: true }), t2.OptionsService = t2.DEFAULT_OPTIONS = void 0;
        const s2 = i2(8460), r = i2(844), n = i2(6114);
        t2.DEFAULT_OPTIONS = { cols: 80, rows: 24, cursorBlink: false, cursorStyle: "block", cursorWidth: 1, cursorInactiveStyle: "outline", customGlyphs: true, drawBoldTextInBrightColors: true, documentOverride: null, fastScrollModifier: "alt", fastScrollSensitivity: 5, fontFamily: "courier-new, courier, monospace", fontSize: 15, fontWeight: "normal", fontWeightBold: "bold", ignoreBracketedPasteMode: false, lineHeight: 1, letterSpacing: 0, linkHandler: null, logLevel: "info", logger: null, scrollback: 1e3, scrollOnUserInput: true, scrollSensitivity: 1, screenReaderMode: false, smoothScrollDuration: 0, macOptionIsMeta: false, macOptionClickForcesSelection: false, minimumContrastRatio: 1, disableStdin: false, allowProposedApi: false, allowTransparency: false, tabStopWidth: 8, theme: {}, rescaleOverlappingGlyphs: false, rightClickSelectsWord: n.isMac, windowOptions: {}, windowsMode: false, windowsPty: {}, wordSeparator: " ()[]{}',\"`", altClickMovesCursor: true, convertEol: false, termName: "xterm", cancelEvents: false, overviewRulerWidth: 0 };
        const o = ["normal", "bold", "100", "200", "300", "400", "500", "600", "700", "800", "900"];
        class a extends r.Disposable {
          constructor(e3) {
            super(), this._onOptionChange = this.register(new s2.EventEmitter()), this.onOptionChange = this._onOptionChange.event;
            const i3 = { ...t2.DEFAULT_OPTIONS };
            for (const t3 in e3) if (t3 in i3) try {
              const s3 = e3[t3];
              i3[t3] = this._sanitizeAndValidateOption(t3, s3);
            } catch (e4) {
              console.error(e4);
            }
            this.rawOptions = i3, this.options = { ...i3 }, this._setupOptions(), this.register((0, r.toDisposable)(() => {
              this.rawOptions.linkHandler = null, this.rawOptions.documentOverride = null;
            }));
          }
          onSpecificOptionChange(e3, t3) {
            return this.onOptionChange((i3) => {
              i3 === e3 && t3(this.rawOptions[e3]);
            });
          }
          onMultipleOptionChange(e3, t3) {
            return this.onOptionChange((i3) => {
              -1 !== e3.indexOf(i3) && t3();
            });
          }
          _setupOptions() {
            const e3 = (e4) => {
              if (!(e4 in t2.DEFAULT_OPTIONS)) throw new Error(`No option with key "${e4}"`);
              return this.rawOptions[e4];
            }, i3 = (e4, i4) => {
              if (!(e4 in t2.DEFAULT_OPTIONS)) throw new Error(`No option with key "${e4}"`);
              i4 = this._sanitizeAndValidateOption(e4, i4), this.rawOptions[e4] !== i4 && (this.rawOptions[e4] = i4, this._onOptionChange.fire(e4));
            };
            for (const t3 in this.rawOptions) {
              const s3 = { get: e3.bind(this, t3), set: i3.bind(this, t3) };
              Object.defineProperty(this.options, t3, s3);
            }
          }
          _sanitizeAndValidateOption(e3, i3) {
            switch (e3) {
              case "cursorStyle":
                if (i3 || (i3 = t2.DEFAULT_OPTIONS[e3]), !/* @__PURE__ */ function(e4) {
                  return "block" === e4 || "underline" === e4 || "bar" === e4;
                }(i3)) throw new Error(`"${i3}" is not a valid value for ${e3}`);
                break;
              case "wordSeparator":
                i3 || (i3 = t2.DEFAULT_OPTIONS[e3]);
                break;
              case "fontWeight":
              case "fontWeightBold":
                if ("number" == typeof i3 && 1 <= i3 && i3 <= 1e3) break;
                i3 = o.includes(i3) ? i3 : t2.DEFAULT_OPTIONS[e3];
                break;
              case "cursorWidth":
                i3 = Math.floor(i3);
              case "lineHeight":
              case "tabStopWidth":
                if (i3 < 1) throw new Error(`${e3} cannot be less than 1, value: ${i3}`);
                break;
              case "minimumContrastRatio":
                i3 = Math.max(1, Math.min(21, Math.round(10 * i3) / 10));
                break;
              case "scrollback":
                if ((i3 = Math.min(i3, 4294967295)) < 0) throw new Error(`${e3} cannot be less than 0, value: ${i3}`);
                break;
              case "fastScrollSensitivity":
              case "scrollSensitivity":
                if (i3 <= 0) throw new Error(`${e3} cannot be less than or equal to 0, value: ${i3}`);
                break;
              case "rows":
              case "cols":
                if (!i3 && 0 !== i3) throw new Error(`${e3} must be numeric, value: ${i3}`);
                break;
              case "windowsPty":
                i3 = i3 ?? {};
            }
            return i3;
          }
        }
        t2.OptionsService = a;
      }, 2660: function(e2, t2, i2) {
        var s2 = this && this.__decorate || function(e3, t3, i3, s3) {
          var r2, n2 = arguments.length, o2 = n2 < 3 ? t3 : null === s3 ? s3 = Object.getOwnPropertyDescriptor(t3, i3) : s3;
          if ("object" == typeof Reflect && "function" == typeof Reflect.decorate) o2 = Reflect.decorate(e3, t3, i3, s3);
          else for (var a = e3.length - 1; a >= 0; a--) (r2 = e3[a]) && (o2 = (n2 < 3 ? r2(o2) : n2 > 3 ? r2(t3, i3, o2) : r2(t3, i3)) || o2);
          return n2 > 3 && o2 && Object.defineProperty(t3, i3, o2), o2;
        }, r = this && this.__param || function(e3, t3) {
          return function(i3, s3) {
            t3(i3, s3, e3);
          };
        };
        Object.defineProperty(t2, "__esModule", { value: true }), t2.OscLinkService = void 0;
        const n = i2(2585);
        let o = t2.OscLinkService = class {
          constructor(e3) {
            this._bufferService = e3, this._nextId = 1, this._entriesWithId = /* @__PURE__ */ new Map(), this._dataByLinkId = /* @__PURE__ */ new Map();
          }
          registerLink(e3) {
            const t3 = this._bufferService.buffer;
            if (void 0 === e3.id) {
              const i4 = t3.addMarker(t3.ybase + t3.y), s4 = { data: e3, id: this._nextId++, lines: [i4] };
              return i4.onDispose(() => this._removeMarkerFromLink(s4, i4)), this._dataByLinkId.set(s4.id, s4), s4.id;
            }
            const i3 = e3, s3 = this._getEntryIdKey(i3), r2 = this._entriesWithId.get(s3);
            if (r2) return this.addLineToLink(r2.id, t3.ybase + t3.y), r2.id;
            const n2 = t3.addMarker(t3.ybase + t3.y), o2 = { id: this._nextId++, key: this._getEntryIdKey(i3), data: i3, lines: [n2] };
            return n2.onDispose(() => this._removeMarkerFromLink(o2, n2)), this._entriesWithId.set(o2.key, o2), this._dataByLinkId.set(o2.id, o2), o2.id;
          }
          addLineToLink(e3, t3) {
            const i3 = this._dataByLinkId.get(e3);
            if (i3 && i3.lines.every((e4) => e4.line !== t3)) {
              const e4 = this._bufferService.buffer.addMarker(t3);
              i3.lines.push(e4), e4.onDispose(() => this._removeMarkerFromLink(i3, e4));
            }
          }
          getLinkData(e3) {
            var _a2;
            return (_a2 = this._dataByLinkId.get(e3)) == null ? void 0 : _a2.data;
          }
          _getEntryIdKey(e3) {
            return `${e3.id};;${e3.uri}`;
          }
          _removeMarkerFromLink(e3, t3) {
            const i3 = e3.lines.indexOf(t3);
            -1 !== i3 && (e3.lines.splice(i3, 1), 0 === e3.lines.length && (void 0 !== e3.data.id && this._entriesWithId.delete(e3.key), this._dataByLinkId.delete(e3.id)));
          }
        };
        t2.OscLinkService = o = s2([r(0, n.IBufferService)], o);
      }, 8343: (e2, t2) => {
        Object.defineProperty(t2, "__esModule", { value: true }), t2.createDecorator = t2.getServiceDependencies = t2.serviceRegistry = void 0;
        const i2 = "di$target", s2 = "di$dependencies";
        t2.serviceRegistry = /* @__PURE__ */ new Map(), t2.getServiceDependencies = function(e3) {
          return e3[s2] || [];
        }, t2.createDecorator = function(e3) {
          if (t2.serviceRegistry.has(e3)) return t2.serviceRegistry.get(e3);
          const r = function(e4, t3, n) {
            if (3 !== arguments.length) throw new Error("@IServiceName-decorator can only be used to decorate a parameter");
            !function(e5, t4, r2) {
              t4[i2] === t4 ? t4[s2].push({ id: e5, index: r2 }) : (t4[s2] = [{ id: e5, index: r2 }], t4[i2] = t4);
            }(r, e4, n);
          };
          return r.toString = () => e3, t2.serviceRegistry.set(e3, r), r;
        };
      }, 2585: (e2, t2, i2) => {
        Object.defineProperty(t2, "__esModule", { value: true }), t2.IDecorationService = t2.IUnicodeService = t2.IOscLinkService = t2.IOptionsService = t2.ILogService = t2.LogLevelEnum = t2.IInstantiationService = t2.ICharsetService = t2.ICoreService = t2.ICoreMouseService = t2.IBufferService = void 0;
        const s2 = i2(8343);
        var r;
        t2.IBufferService = (0, s2.createDecorator)("BufferService"), t2.ICoreMouseService = (0, s2.createDecorator)("CoreMouseService"), t2.ICoreService = (0, s2.createDecorator)("CoreService"), t2.ICharsetService = (0, s2.createDecorator)("CharsetService"), t2.IInstantiationService = (0, s2.createDecorator)("InstantiationService"), function(e3) {
          e3[e3.TRACE = 0] = "TRACE", e3[e3.DEBUG = 1] = "DEBUG", e3[e3.INFO = 2] = "INFO", e3[e3.WARN = 3] = "WARN", e3[e3.ERROR = 4] = "ERROR", e3[e3.OFF = 5] = "OFF";
        }(r || (t2.LogLevelEnum = r = {})), t2.ILogService = (0, s2.createDecorator)("LogService"), t2.IOptionsService = (0, s2.createDecorator)("OptionsService"), t2.IOscLinkService = (0, s2.createDecorator)("OscLinkService"), t2.IUnicodeService = (0, s2.createDecorator)("UnicodeService"), t2.IDecorationService = (0, s2.createDecorator)("DecorationService");
      }, 1480: (e2, t2, i2) => {
        Object.defineProperty(t2, "__esModule", { value: true }), t2.UnicodeService = void 0;
        const s2 = i2(8460), r = i2(225);
        class n {
          static extractShouldJoin(e3) {
            return 0 != (1 & e3);
          }
          static extractWidth(e3) {
            return e3 >> 1 & 3;
          }
          static extractCharKind(e3) {
            return e3 >> 3;
          }
          static createPropertyValue(e3, t3, i3 = false) {
            return (16777215 & e3) << 3 | (3 & t3) << 1 | (i3 ? 1 : 0);
          }
          constructor() {
            this._providers = /* @__PURE__ */ Object.create(null), this._active = "", this._onChange = new s2.EventEmitter(), this.onChange = this._onChange.event;
            const e3 = new r.UnicodeV6();
            this.register(e3), this._active = e3.version, this._activeProvider = e3;
          }
          dispose() {
            this._onChange.dispose();
          }
          get versions() {
            return Object.keys(this._providers);
          }
          get activeVersion() {
            return this._active;
          }
          set activeVersion(e3) {
            if (!this._providers[e3]) throw new Error(`unknown Unicode version "${e3}"`);
            this._active = e3, this._activeProvider = this._providers[e3], this._onChange.fire(e3);
          }
          register(e3) {
            this._providers[e3.version] = e3;
          }
          wcwidth(e3) {
            return this._activeProvider.wcwidth(e3);
          }
          getStringCellWidth(e3) {
            let t3 = 0, i3 = 0;
            const s3 = e3.length;
            for (let r2 = 0; r2 < s3; ++r2) {
              let o = e3.charCodeAt(r2);
              if (55296 <= o && o <= 56319) {
                if (++r2 >= s3) return t3 + this.wcwidth(o);
                const i4 = e3.charCodeAt(r2);
                56320 <= i4 && i4 <= 57343 ? o = 1024 * (o - 55296) + i4 - 56320 + 65536 : t3 += this.wcwidth(i4);
              }
              const a = this.charProperties(o, i3);
              let h = n.extractWidth(a);
              n.extractShouldJoin(a) && (h -= n.extractWidth(i3)), t3 += h, i3 = a;
            }
            return t3;
          }
          charProperties(e3, t3) {
            return this._activeProvider.charProperties(e3, t3);
          }
        }
        t2.UnicodeService = n;
      } }, t = {};
      function i(s2) {
        var r = t[s2];
        if (void 0 !== r) return r.exports;
        var n = t[s2] = { exports: {} };
        return e[s2].call(n.exports, n, n.exports, i), n.exports;
      }
      var s = {};
      return (() => {
        var e2 = s;
        Object.defineProperty(e2, "__esModule", { value: true }), e2.Terminal = void 0;
        const t2 = i(9042), r = i(3236), n = i(844), o = i(5741), a = i(8285), h = i(7975), c = i(7090), l = ["cols", "rows"];
        class d extends n.Disposable {
          constructor(e3) {
            super(), this._core = this.register(new r.Terminal(e3)), this._addonManager = this.register(new o.AddonManager()), this._publicOptions = { ...this._core.options };
            const t3 = (e4) => this._core.options[e4], i2 = (e4, t4) => {
              this._checkReadonlyOptions(e4), this._core.options[e4] = t4;
            };
            for (const e4 in this._core.options) {
              const s2 = { get: t3.bind(this, e4), set: i2.bind(this, e4) };
              Object.defineProperty(this._publicOptions, e4, s2);
            }
          }
          _checkReadonlyOptions(e3) {
            if (l.includes(e3)) throw new Error(`Option "${e3}" can only be set in the constructor`);
          }
          _checkProposedApi() {
            if (!this._core.optionsService.rawOptions.allowProposedApi) throw new Error("You must set the allowProposedApi option to true to use proposed API");
          }
          get onBell() {
            return this._core.onBell;
          }
          get onBinary() {
            return this._core.onBinary;
          }
          get onCursorMove() {
            return this._core.onCursorMove;
          }
          get onData() {
            return this._core.onData;
          }
          get onKey() {
            return this._core.onKey;
          }
          get onLineFeed() {
            return this._core.onLineFeed;
          }
          get onRender() {
            return this._core.onRender;
          }
          get onResize() {
            return this._core.onResize;
          }
          get onScroll() {
            return this._core.onScroll;
          }
          get onSelectionChange() {
            return this._core.onSelectionChange;
          }
          get onTitleChange() {
            return this._core.onTitleChange;
          }
          get onWriteParsed() {
            return this._core.onWriteParsed;
          }
          get element() {
            return this._core.element;
          }
          get parser() {
            return this._parser || (this._parser = new h.ParserApi(this._core)), this._parser;
          }
          get unicode() {
            return this._checkProposedApi(), new c.UnicodeApi(this._core);
          }
          get textarea() {
            return this._core.textarea;
          }
          get rows() {
            return this._core.rows;
          }
          get cols() {
            return this._core.cols;
          }
          get buffer() {
            return this._buffer || (this._buffer = this.register(new a.BufferNamespaceApi(this._core))), this._buffer;
          }
          get markers() {
            return this._checkProposedApi(), this._core.markers;
          }
          get modes() {
            const e3 = this._core.coreService.decPrivateModes;
            let t3 = "none";
            switch (this._core.coreMouseService.activeProtocol) {
              case "X10":
                t3 = "x10";
                break;
              case "VT200":
                t3 = "vt200";
                break;
              case "DRAG":
                t3 = "drag";
                break;
              case "ANY":
                t3 = "any";
            }
            return { applicationCursorKeysMode: e3.applicationCursorKeys, applicationKeypadMode: e3.applicationKeypad, bracketedPasteMode: e3.bracketedPasteMode, insertMode: this._core.coreService.modes.insertMode, mouseTrackingMode: t3, originMode: e3.origin, reverseWraparoundMode: e3.reverseWraparound, sendFocusMode: e3.sendFocus, wraparoundMode: e3.wraparound };
          }
          get options() {
            return this._publicOptions;
          }
          set options(e3) {
            for (const t3 in e3) this._publicOptions[t3] = e3[t3];
          }
          blur() {
            this._core.blur();
          }
          focus() {
            this._core.focus();
          }
          input(e3, t3 = true) {
            this._core.input(e3, t3);
          }
          resize(e3, t3) {
            this._verifyIntegers(e3, t3), this._core.resize(e3, t3);
          }
          open(e3) {
            this._core.open(e3);
          }
          attachCustomKeyEventHandler(e3) {
            this._core.attachCustomKeyEventHandler(e3);
          }
          attachCustomWheelEventHandler(e3) {
            this._core.attachCustomWheelEventHandler(e3);
          }
          registerLinkProvider(e3) {
            return this._core.registerLinkProvider(e3);
          }
          registerCharacterJoiner(e3) {
            return this._checkProposedApi(), this._core.registerCharacterJoiner(e3);
          }
          deregisterCharacterJoiner(e3) {
            this._checkProposedApi(), this._core.deregisterCharacterJoiner(e3);
          }
          registerMarker(e3 = 0) {
            return this._verifyIntegers(e3), this._core.registerMarker(e3);
          }
          registerDecoration(e3) {
            return this._checkProposedApi(), this._verifyPositiveIntegers(e3.x ?? 0, e3.width ?? 0, e3.height ?? 0), this._core.registerDecoration(e3);
          }
          hasSelection() {
            return this._core.hasSelection();
          }
          select(e3, t3, i2) {
            this._verifyIntegers(e3, t3, i2), this._core.select(e3, t3, i2);
          }
          getSelection() {
            return this._core.getSelection();
          }
          getSelectionPosition() {
            return this._core.getSelectionPosition();
          }
          clearSelection() {
            this._core.clearSelection();
          }
          selectAll() {
            this._core.selectAll();
          }
          selectLines(e3, t3) {
            this._verifyIntegers(e3, t3), this._core.selectLines(e3, t3);
          }
          dispose() {
            super.dispose();
          }
          scrollLines(e3) {
            this._verifyIntegers(e3), this._core.scrollLines(e3);
          }
          scrollPages(e3) {
            this._verifyIntegers(e3), this._core.scrollPages(e3);
          }
          scrollToTop() {
            this._core.scrollToTop();
          }
          scrollToBottom() {
            this._core.scrollToBottom();
          }
          scrollToLine(e3) {
            this._verifyIntegers(e3), this._core.scrollToLine(e3);
          }
          clear() {
            this._core.clear();
          }
          write(e3, t3) {
            this._core.write(e3, t3);
          }
          writeln(e3, t3) {
            this._core.write(e3), this._core.write("\r\n", t3);
          }
          paste(e3) {
            this._core.paste(e3);
          }
          refresh(e3, t3) {
            this._verifyIntegers(e3, t3), this._core.refresh(e3, t3);
          }
          reset() {
            this._core.reset();
          }
          clearTextureAtlas() {
            this._core.clearTextureAtlas();
          }
          loadAddon(e3) {
            this._addonManager.loadAddon(this, e3);
          }
          static get strings() {
            return t2;
          }
          _verifyIntegers(...e3) {
            for (const t3 of e3) if (t3 === 1 / 0 || isNaN(t3) || t3 % 1 != 0) throw new Error("This API only accepts integers");
          }
          _verifyPositiveIntegers(...e3) {
            for (const t3 of e3) if (t3 && (t3 === 1 / 0 || isNaN(t3) || t3 % 1 != 0 || t3 < 0)) throw new Error("This API only accepts positive integers");
          }
        }
        e2.Terminal = d;
      })(), s;
    })());
  })(xterm);
  return xterm.exports;
}
var xtermExports = requireXterm();
var addonUnicode11$1 = { exports: {} };
var addonUnicode11 = addonUnicode11$1.exports;
var hasRequiredAddonUnicode11;
function requireAddonUnicode11() {
  if (hasRequiredAddonUnicode11) return addonUnicode11$1.exports;
  hasRequiredAddonUnicode11 = 1;
  (function(module, exports) {
    !function(e, t) {
      module.exports = t();
    }(addonUnicode11, () => (() => {
      var e = { 433: (e2, t2, i2) => {
        Object.defineProperty(t2, "__esModule", { value: true }), t2.UnicodeV11 = void 0;
        const r2 = i2(938), s = [[768, 879], [1155, 1161], [1425, 1469], [1471, 1471], [1473, 1474], [1476, 1477], [1479, 1479], [1536, 1541], [1552, 1562], [1564, 1564], [1611, 1631], [1648, 1648], [1750, 1757], [1759, 1764], [1767, 1768], [1770, 1773], [1807, 1807], [1809, 1809], [1840, 1866], [1958, 1968], [2027, 2035], [2045, 2045], [2070, 2073], [2075, 2083], [2085, 2087], [2089, 2093], [2137, 2139], [2259, 2306], [2362, 2362], [2364, 2364], [2369, 2376], [2381, 2381], [2385, 2391], [2402, 2403], [2433, 2433], [2492, 2492], [2497, 2500], [2509, 2509], [2530, 2531], [2558, 2558], [2561, 2562], [2620, 2620], [2625, 2626], [2631, 2632], [2635, 2637], [2641, 2641], [2672, 2673], [2677, 2677], [2689, 2690], [2748, 2748], [2753, 2757], [2759, 2760], [2765, 2765], [2786, 2787], [2810, 2815], [2817, 2817], [2876, 2876], [2879, 2879], [2881, 2884], [2893, 2893], [2902, 2902], [2914, 2915], [2946, 2946], [3008, 3008], [3021, 3021], [3072, 3072], [3076, 3076], [3134, 3136], [3142, 3144], [3146, 3149], [3157, 3158], [3170, 3171], [3201, 3201], [3260, 3260], [3263, 3263], [3270, 3270], [3276, 3277], [3298, 3299], [3328, 3329], [3387, 3388], [3393, 3396], [3405, 3405], [3426, 3427], [3530, 3530], [3538, 3540], [3542, 3542], [3633, 3633], [3636, 3642], [3655, 3662], [3761, 3761], [3764, 3772], [3784, 3789], [3864, 3865], [3893, 3893], [3895, 3895], [3897, 3897], [3953, 3966], [3968, 3972], [3974, 3975], [3981, 3991], [3993, 4028], [4038, 4038], [4141, 4144], [4146, 4151], [4153, 4154], [4157, 4158], [4184, 4185], [4190, 4192], [4209, 4212], [4226, 4226], [4229, 4230], [4237, 4237], [4253, 4253], [4448, 4607], [4957, 4959], [5906, 5908], [5938, 5940], [5970, 5971], [6002, 6003], [6068, 6069], [6071, 6077], [6086, 6086], [6089, 6099], [6109, 6109], [6155, 6158], [6277, 6278], [6313, 6313], [6432, 6434], [6439, 6440], [6450, 6450], [6457, 6459], [6679, 6680], [6683, 6683], [6742, 6742], [6744, 6750], [6752, 6752], [6754, 6754], [6757, 6764], [6771, 6780], [6783, 6783], [6832, 6846], [6912, 6915], [6964, 6964], [6966, 6970], [6972, 6972], [6978, 6978], [7019, 7027], [7040, 7041], [7074, 7077], [7080, 7081], [7083, 7085], [7142, 7142], [7144, 7145], [7149, 7149], [7151, 7153], [7212, 7219], [7222, 7223], [7376, 7378], [7380, 7392], [7394, 7400], [7405, 7405], [7412, 7412], [7416, 7417], [7616, 7673], [7675, 7679], [8203, 8207], [8234, 8238], [8288, 8292], [8294, 8303], [8400, 8432], [11503, 11505], [11647, 11647], [11744, 11775], [12330, 12333], [12441, 12442], [42607, 42610], [42612, 42621], [42654, 42655], [42736, 42737], [43010, 43010], [43014, 43014], [43019, 43019], [43045, 43046], [43204, 43205], [43232, 43249], [43263, 43263], [43302, 43309], [43335, 43345], [43392, 43394], [43443, 43443], [43446, 43449], [43452, 43453], [43493, 43493], [43561, 43566], [43569, 43570], [43573, 43574], [43587, 43587], [43596, 43596], [43644, 43644], [43696, 43696], [43698, 43700], [43703, 43704], [43710, 43711], [43713, 43713], [43756, 43757], [43766, 43766], [44005, 44005], [44008, 44008], [44013, 44013], [64286, 64286], [65024, 65039], [65056, 65071], [65279, 65279], [65529, 65531]], n = [[66045, 66045], [66272, 66272], [66422, 66426], [68097, 68099], [68101, 68102], [68108, 68111], [68152, 68154], [68159, 68159], [68325, 68326], [68900, 68903], [69446, 69456], [69633, 69633], [69688, 69702], [69759, 69761], [69811, 69814], [69817, 69818], [69821, 69821], [69837, 69837], [69888, 69890], [69927, 69931], [69933, 69940], [70003, 70003], [70016, 70017], [70070, 70078], [70089, 70092], [70191, 70193], [70196, 70196], [70198, 70199], [70206, 70206], [70367, 70367], [70371, 70378], [70400, 70401], [70459, 70460], [70464, 70464], [70502, 70508], [70512, 70516], [70712, 70719], [70722, 70724], [70726, 70726], [70750, 70750], [70835, 70840], [70842, 70842], [70847, 70848], [70850, 70851], [71090, 71093], [71100, 71101], [71103, 71104], [71132, 71133], [71219, 71226], [71229, 71229], [71231, 71232], [71339, 71339], [71341, 71341], [71344, 71349], [71351, 71351], [71453, 71455], [71458, 71461], [71463, 71467], [71727, 71735], [71737, 71738], [72148, 72151], [72154, 72155], [72160, 72160], [72193, 72202], [72243, 72248], [72251, 72254], [72263, 72263], [72273, 72278], [72281, 72283], [72330, 72342], [72344, 72345], [72752, 72758], [72760, 72765], [72767, 72767], [72850, 72871], [72874, 72880], [72882, 72883], [72885, 72886], [73009, 73014], [73018, 73018], [73020, 73021], [73023, 73029], [73031, 73031], [73104, 73105], [73109, 73109], [73111, 73111], [73459, 73460], [78896, 78904], [92912, 92916], [92976, 92982], [94031, 94031], [94095, 94098], [113821, 113822], [113824, 113827], [119143, 119145], [119155, 119170], [119173, 119179], [119210, 119213], [119362, 119364], [121344, 121398], [121403, 121452], [121461, 121461], [121476, 121476], [121499, 121503], [121505, 121519], [122880, 122886], [122888, 122904], [122907, 122913], [122915, 122916], [122918, 122922], [123184, 123190], [123628, 123631], [125136, 125142], [125252, 125258], [917505, 917505], [917536, 917631], [917760, 917999]], o = [[4352, 4447], [8986, 8987], [9001, 9002], [9193, 9196], [9200, 9200], [9203, 9203], [9725, 9726], [9748, 9749], [9800, 9811], [9855, 9855], [9875, 9875], [9889, 9889], [9898, 9899], [9917, 9918], [9924, 9925], [9934, 9934], [9940, 9940], [9962, 9962], [9970, 9971], [9973, 9973], [9978, 9978], [9981, 9981], [9989, 9989], [9994, 9995], [10024, 10024], [10060, 10060], [10062, 10062], [10067, 10069], [10071, 10071], [10133, 10135], [10160, 10160], [10175, 10175], [11035, 11036], [11088, 11088], [11093, 11093], [11904, 11929], [11931, 12019], [12032, 12245], [12272, 12283], [12288, 12329], [12334, 12350], [12353, 12438], [12443, 12543], [12549, 12591], [12593, 12686], [12688, 12730], [12736, 12771], [12784, 12830], [12832, 12871], [12880, 19903], [19968, 42124], [42128, 42182], [43360, 43388], [44032, 55203], [63744, 64255], [65040, 65049], [65072, 65106], [65108, 65126], [65128, 65131], [65281, 65376], [65504, 65510]], c = [[94176, 94179], [94208, 100343], [100352, 101106], [110592, 110878], [110928, 110930], [110948, 110951], [110960, 111355], [126980, 126980], [127183, 127183], [127374, 127374], [127377, 127386], [127488, 127490], [127504, 127547], [127552, 127560], [127568, 127569], [127584, 127589], [127744, 127776], [127789, 127797], [127799, 127868], [127870, 127891], [127904, 127946], [127951, 127955], [127968, 127984], [127988, 127988], [127992, 128062], [128064, 128064], [128066, 128252], [128255, 128317], [128331, 128334], [128336, 128359], [128378, 128378], [128405, 128406], [128420, 128420], [128507, 128591], [128640, 128709], [128716, 128716], [128720, 128722], [128725, 128725], [128747, 128748], [128756, 128762], [128992, 129003], [129293, 129393], [129395, 129398], [129402, 129442], [129445, 129450], [129454, 129482], [129485, 129535], [129648, 129651], [129656, 129658], [129664, 129666], [129680, 129685], [131072, 196605], [196608, 262141]];
        let l;
        function d(e3, t3) {
          let i3, r3 = 0, s2 = t3.length - 1;
          if (e3 < t3[0][0] || e3 > t3[s2][1]) return false;
          for (; s2 >= r3; ) if (i3 = r3 + s2 >> 1, e3 > t3[i3][1]) r3 = i3 + 1;
          else {
            if (!(e3 < t3[i3][0])) return true;
            s2 = i3 - 1;
          }
          return false;
        }
        t2.UnicodeV11 = class {
          constructor() {
            if (this.version = "11", !l) {
              l = new Uint8Array(65536), l.fill(1), l[0] = 0, l.fill(0, 1, 32), l.fill(0, 127, 160);
              for (let e3 = 0; e3 < s.length; ++e3) l.fill(0, s[e3][0], s[e3][1] + 1);
              for (let e3 = 0; e3 < o.length; ++e3) l.fill(2, o[e3][0], o[e3][1] + 1);
            }
          }
          wcwidth(e3) {
            return e3 < 32 ? 0 : e3 < 127 ? 1 : e3 < 65536 ? l[e3] : d(e3, n) ? 0 : d(e3, c) ? 2 : 1;
          }
          charProperties(e3, t3) {
            let i3 = this.wcwidth(e3), s2 = 0 === i3 && 0 !== t3;
            if (s2) {
              const e4 = r2.UnicodeService.extractWidth(t3);
              0 === e4 ? s2 = false : e4 > i3 && (i3 = e4);
            }
            return r2.UnicodeService.createPropertyValue(0, i3, s2);
          }
        };
      }, 345: (e2, t2) => {
        Object.defineProperty(t2, "__esModule", { value: true }), t2.runAndSubscribe = t2.forwardEvent = t2.EventEmitter = void 0, t2.EventEmitter = class {
          constructor() {
            this._listeners = [], this._disposed = false;
          }
          get event() {
            return this._event || (this._event = (e3) => (this._listeners.push(e3), { dispose: () => {
              if (!this._disposed) {
                for (let t3 = 0; t3 < this._listeners.length; t3++) if (this._listeners[t3] === e3) return void this._listeners.splice(t3, 1);
              }
            } })), this._event;
          }
          fire(e3, t3) {
            const i2 = [];
            for (let e4 = 0; e4 < this._listeners.length; e4++) i2.push(this._listeners[e4]);
            for (let r2 = 0; r2 < i2.length; r2++) i2[r2].call(void 0, e3, t3);
          }
          dispose() {
            this.clearListeners(), this._disposed = true;
          }
          clearListeners() {
            this._listeners && (this._listeners.length = 0);
          }
        }, t2.forwardEvent = function(e3, t3) {
          return e3((e4) => t3.fire(e4));
        }, t2.runAndSubscribe = function(e3, t3) {
          return t3(void 0), e3((e4) => t3(e4));
        };
      }, 490: (e2, t2, i2) => {
        Object.defineProperty(t2, "__esModule", { value: true }), t2.UnicodeV6 = void 0;
        const r2 = i2(938), s = [[768, 879], [1155, 1158], [1160, 1161], [1425, 1469], [1471, 1471], [1473, 1474], [1476, 1477], [1479, 1479], [1536, 1539], [1552, 1557], [1611, 1630], [1648, 1648], [1750, 1764], [1767, 1768], [1770, 1773], [1807, 1807], [1809, 1809], [1840, 1866], [1958, 1968], [2027, 2035], [2305, 2306], [2364, 2364], [2369, 2376], [2381, 2381], [2385, 2388], [2402, 2403], [2433, 2433], [2492, 2492], [2497, 2500], [2509, 2509], [2530, 2531], [2561, 2562], [2620, 2620], [2625, 2626], [2631, 2632], [2635, 2637], [2672, 2673], [2689, 2690], [2748, 2748], [2753, 2757], [2759, 2760], [2765, 2765], [2786, 2787], [2817, 2817], [2876, 2876], [2879, 2879], [2881, 2883], [2893, 2893], [2902, 2902], [2946, 2946], [3008, 3008], [3021, 3021], [3134, 3136], [3142, 3144], [3146, 3149], [3157, 3158], [3260, 3260], [3263, 3263], [3270, 3270], [3276, 3277], [3298, 3299], [3393, 3395], [3405, 3405], [3530, 3530], [3538, 3540], [3542, 3542], [3633, 3633], [3636, 3642], [3655, 3662], [3761, 3761], [3764, 3769], [3771, 3772], [3784, 3789], [3864, 3865], [3893, 3893], [3895, 3895], [3897, 3897], [3953, 3966], [3968, 3972], [3974, 3975], [3984, 3991], [3993, 4028], [4038, 4038], [4141, 4144], [4146, 4146], [4150, 4151], [4153, 4153], [4184, 4185], [4448, 4607], [4959, 4959], [5906, 5908], [5938, 5940], [5970, 5971], [6002, 6003], [6068, 6069], [6071, 6077], [6086, 6086], [6089, 6099], [6109, 6109], [6155, 6157], [6313, 6313], [6432, 6434], [6439, 6440], [6450, 6450], [6457, 6459], [6679, 6680], [6912, 6915], [6964, 6964], [6966, 6970], [6972, 6972], [6978, 6978], [7019, 7027], [7616, 7626], [7678, 7679], [8203, 8207], [8234, 8238], [8288, 8291], [8298, 8303], [8400, 8431], [12330, 12335], [12441, 12442], [43014, 43014], [43019, 43019], [43045, 43046], [64286, 64286], [65024, 65039], [65056, 65059], [65279, 65279], [65529, 65531]], n = [[68097, 68099], [68101, 68102], [68108, 68111], [68152, 68154], [68159, 68159], [119143, 119145], [119155, 119170], [119173, 119179], [119210, 119213], [119362, 119364], [917505, 917505], [917536, 917631], [917760, 917999]];
        let o;
        t2.UnicodeV6 = class {
          constructor() {
            if (this.version = "6", !o) {
              o = new Uint8Array(65536), o.fill(1), o[0] = 0, o.fill(0, 1, 32), o.fill(0, 127, 160), o.fill(2, 4352, 4448), o[9001] = 2, o[9002] = 2, o.fill(2, 11904, 42192), o[12351] = 1, o.fill(2, 44032, 55204), o.fill(2, 63744, 64256), o.fill(2, 65040, 65050), o.fill(2, 65072, 65136), o.fill(2, 65280, 65377), o.fill(2, 65504, 65511);
              for (let e3 = 0; e3 < s.length; ++e3) o.fill(0, s[e3][0], s[e3][1] + 1);
            }
          }
          wcwidth(e3) {
            return e3 < 32 ? 0 : e3 < 127 ? 1 : e3 < 65536 ? o[e3] : function(e4, t3) {
              let i3, r3 = 0, s2 = t3.length - 1;
              if (e4 < t3[0][0] || e4 > t3[s2][1]) return false;
              for (; s2 >= r3; ) if (i3 = r3 + s2 >> 1, e4 > t3[i3][1]) r3 = i3 + 1;
              else {
                if (!(e4 < t3[i3][0])) return true;
                s2 = i3 - 1;
              }
              return false;
            }(e3, n) ? 0 : e3 >= 131072 && e3 <= 196605 || e3 >= 196608 && e3 <= 262141 ? 2 : 1;
          }
          charProperties(e3, t3) {
            let i3 = this.wcwidth(e3), s2 = 0 === i3 && 0 !== t3;
            if (s2) {
              const e4 = r2.UnicodeService.extractWidth(t3);
              0 === e4 ? s2 = false : e4 > i3 && (i3 = e4);
            }
            return r2.UnicodeService.createPropertyValue(0, i3, s2);
          }
        };
      }, 938: (e2, t2, i2) => {
        Object.defineProperty(t2, "__esModule", { value: true }), t2.UnicodeService = void 0;
        const r2 = i2(345), s = i2(490);
        class n {
          static extractShouldJoin(e3) {
            return 0 != (1 & e3);
          }
          static extractWidth(e3) {
            return e3 >> 1 & 3;
          }
          static extractCharKind(e3) {
            return e3 >> 3;
          }
          static createPropertyValue(e3, t3, i3 = false) {
            return (16777215 & e3) << 3 | (3 & t3) << 1 | (i3 ? 1 : 0);
          }
          constructor() {
            this._providers = /* @__PURE__ */ Object.create(null), this._active = "", this._onChange = new r2.EventEmitter(), this.onChange = this._onChange.event;
            const e3 = new s.UnicodeV6();
            this.register(e3), this._active = e3.version, this._activeProvider = e3;
          }
          dispose() {
            this._onChange.dispose();
          }
          get versions() {
            return Object.keys(this._providers);
          }
          get activeVersion() {
            return this._active;
          }
          set activeVersion(e3) {
            if (!this._providers[e3]) throw new Error(`unknown Unicode version "${e3}"`);
            this._active = e3, this._activeProvider = this._providers[e3], this._onChange.fire(e3);
          }
          register(e3) {
            this._providers[e3.version] = e3;
          }
          wcwidth(e3) {
            return this._activeProvider.wcwidth(e3);
          }
          getStringCellWidth(e3) {
            let t3 = 0, i3 = 0;
            const r3 = e3.length;
            for (let s2 = 0; s2 < r3; ++s2) {
              let o = e3.charCodeAt(s2);
              if (55296 <= o && o <= 56319) {
                if (++s2 >= r3) return t3 + this.wcwidth(o);
                const i4 = e3.charCodeAt(s2);
                56320 <= i4 && i4 <= 57343 ? o = 1024 * (o - 55296) + i4 - 56320 + 65536 : t3 += this.wcwidth(i4);
              }
              const c = this.charProperties(o, i3);
              let l = n.extractWidth(c);
              n.extractShouldJoin(c) && (l -= n.extractWidth(i3)), t3 += l, i3 = c;
            }
            return t3;
          }
          charProperties(e3, t3) {
            return this._activeProvider.charProperties(e3, t3);
          }
        }
        t2.UnicodeService = n;
      } }, t = {};
      function i(r2) {
        var s = t[r2];
        if (void 0 !== s) return s.exports;
        var n = t[r2] = { exports: {} };
        return e[r2](n, n.exports, i), n.exports;
      }
      var r = {};
      return (() => {
        var e2 = r;
        Object.defineProperty(e2, "__esModule", { value: true }), e2.Unicode11Addon = void 0;
        const t2 = i(433);
        e2.Unicode11Addon = class {
          activate(e3) {
            e3.unicode.register(new t2.UnicodeV11());
          }
          dispose() {
          }
        };
      })(), r;
    })());
  })(addonUnicode11$1);
  return addonUnicode11$1.exports;
}
var addonUnicode11Exports = requireAddonUnicode11();
var addonWebgl = { exports: {} };
var hasRequiredAddonWebgl;
function requireAddonWebgl() {
  if (hasRequiredAddonWebgl) return addonWebgl.exports;
  hasRequiredAddonWebgl = 1;
  (function(module, exports) {
    !function(e, t) {
      module.exports = t();
    }(self, () => (() => {
      var e = { 965: (e2, t2, i2) => {
        Object.defineProperty(t2, "__esModule", { value: true }), t2.GlyphRenderer = void 0;
        const s2 = i2(374), r = i2(509), o = i2(855), n = i2(859), a = i2(381), h = 11, l = h * Float32Array.BYTES_PER_ELEMENT;
        let c, d = 0, _ = 0, u = 0;
        class g extends n.Disposable {
          constructor(e3, t3, i3, o2) {
            super(), this._terminal = e3, this._gl = t3, this._dimensions = i3, this._optionsService = o2, this._activeBuffer = 0, this._vertices = { count: 0, attributes: new Float32Array(0), attributesBuffers: [new Float32Array(0), new Float32Array(0)] };
            const h2 = this._gl;
            void 0 === r.TextureAtlas.maxAtlasPages && (r.TextureAtlas.maxAtlasPages = Math.min(32, (0, s2.throwIfFalsy)(h2.getParameter(h2.MAX_TEXTURE_IMAGE_UNITS))), r.TextureAtlas.maxTextureSize = (0, s2.throwIfFalsy)(h2.getParameter(h2.MAX_TEXTURE_SIZE))), this._program = (0, s2.throwIfFalsy)((0, a.createProgram)(h2, "#version 300 es\nlayout (location = 0) in vec2 a_unitquad;\nlayout (location = 1) in vec2 a_cellpos;\nlayout (location = 2) in vec2 a_offset;\nlayout (location = 3) in vec2 a_size;\nlayout (location = 4) in float a_texpage;\nlayout (location = 5) in vec2 a_texcoord;\nlayout (location = 6) in vec2 a_texsize;\n\nuniform mat4 u_projection;\nuniform vec2 u_resolution;\n\nout vec2 v_texcoord;\nflat out int v_texpage;\n\nvoid main() {\n  vec2 zeroToOne = (a_offset / u_resolution) + a_cellpos + (a_unitquad * a_size);\n  gl_Position = u_projection * vec4(zeroToOne, 0.0, 1.0);\n  v_texpage = int(a_texpage);\n  v_texcoord = a_texcoord + a_unitquad * a_texsize;\n}", function(e4) {
              let t4 = "";
              for (let i4 = 1; i4 < e4; i4++) t4 += ` else if (v_texpage == ${i4}) { outColor = texture(u_texture[${i4}], v_texcoord); }`;
              return `#version 300 es
precision lowp float;

in vec2 v_texcoord;
flat in int v_texpage;

uniform sampler2D u_texture[${e4}];

out vec4 outColor;

void main() {
  if (v_texpage == 0) {
    outColor = texture(u_texture[0], v_texcoord);
  } ${t4}
}`;
            }(r.TextureAtlas.maxAtlasPages))), this.register((0, n.toDisposable)(() => h2.deleteProgram(this._program))), this._projectionLocation = (0, s2.throwIfFalsy)(h2.getUniformLocation(this._program, "u_projection")), this._resolutionLocation = (0, s2.throwIfFalsy)(h2.getUniformLocation(this._program, "u_resolution")), this._textureLocation = (0, s2.throwIfFalsy)(h2.getUniformLocation(this._program, "u_texture")), this._vertexArrayObject = h2.createVertexArray(), h2.bindVertexArray(this._vertexArrayObject);
            const c2 = new Float32Array([0, 0, 1, 0, 0, 1, 1, 1]), d2 = h2.createBuffer();
            this.register((0, n.toDisposable)(() => h2.deleteBuffer(d2))), h2.bindBuffer(h2.ARRAY_BUFFER, d2), h2.bufferData(h2.ARRAY_BUFFER, c2, h2.STATIC_DRAW), h2.enableVertexAttribArray(0), h2.vertexAttribPointer(0, 2, this._gl.FLOAT, false, 0, 0);
            const _2 = new Uint8Array([0, 1, 2, 3]), u2 = h2.createBuffer();
            this.register((0, n.toDisposable)(() => h2.deleteBuffer(u2))), h2.bindBuffer(h2.ELEMENT_ARRAY_BUFFER, u2), h2.bufferData(h2.ELEMENT_ARRAY_BUFFER, _2, h2.STATIC_DRAW), this._attributesBuffer = (0, s2.throwIfFalsy)(h2.createBuffer()), this.register((0, n.toDisposable)(() => h2.deleteBuffer(this._attributesBuffer))), h2.bindBuffer(h2.ARRAY_BUFFER, this._attributesBuffer), h2.enableVertexAttribArray(2), h2.vertexAttribPointer(2, 2, h2.FLOAT, false, l, 0), h2.vertexAttribDivisor(2, 1), h2.enableVertexAttribArray(3), h2.vertexAttribPointer(3, 2, h2.FLOAT, false, l, 2 * Float32Array.BYTES_PER_ELEMENT), h2.vertexAttribDivisor(3, 1), h2.enableVertexAttribArray(4), h2.vertexAttribPointer(4, 1, h2.FLOAT, false, l, 4 * Float32Array.BYTES_PER_ELEMENT), h2.vertexAttribDivisor(4, 1), h2.enableVertexAttribArray(5), h2.vertexAttribPointer(5, 2, h2.FLOAT, false, l, 5 * Float32Array.BYTES_PER_ELEMENT), h2.vertexAttribDivisor(5, 1), h2.enableVertexAttribArray(6), h2.vertexAttribPointer(6, 2, h2.FLOAT, false, l, 7 * Float32Array.BYTES_PER_ELEMENT), h2.vertexAttribDivisor(6, 1), h2.enableVertexAttribArray(1), h2.vertexAttribPointer(1, 2, h2.FLOAT, false, l, 9 * Float32Array.BYTES_PER_ELEMENT), h2.vertexAttribDivisor(1, 1), h2.useProgram(this._program);
            const g2 = new Int32Array(r.TextureAtlas.maxAtlasPages);
            for (let e4 = 0; e4 < r.TextureAtlas.maxAtlasPages; e4++) g2[e4] = e4;
            h2.uniform1iv(this._textureLocation, g2), h2.uniformMatrix4fv(this._projectionLocation, false, a.PROJECTION_MATRIX), this._atlasTextures = [];
            for (let e4 = 0; e4 < r.TextureAtlas.maxAtlasPages; e4++) {
              const t4 = new a.GLTexture((0, s2.throwIfFalsy)(h2.createTexture()));
              this.register((0, n.toDisposable)(() => h2.deleteTexture(t4.texture))), h2.activeTexture(h2.TEXTURE0 + e4), h2.bindTexture(h2.TEXTURE_2D, t4.texture), h2.texParameteri(h2.TEXTURE_2D, h2.TEXTURE_WRAP_S, h2.CLAMP_TO_EDGE), h2.texParameteri(h2.TEXTURE_2D, h2.TEXTURE_WRAP_T, h2.CLAMP_TO_EDGE), h2.texImage2D(h2.TEXTURE_2D, 0, h2.RGBA, 1, 1, 0, h2.RGBA, h2.UNSIGNED_BYTE, new Uint8Array([255, 0, 0, 255])), this._atlasTextures[e4] = t4;
            }
            h2.enable(h2.BLEND), h2.blendFunc(h2.SRC_ALPHA, h2.ONE_MINUS_SRC_ALPHA), this.handleResize();
          }
          beginFrame() {
            return !this._atlas || this._atlas.beginFrame();
          }
          updateCell(e3, t3, i3, s3, r2, o2, n2, a2, h2) {
            this._updateCell(this._vertices.attributes, e3, t3, i3, s3, r2, o2, n2, a2, h2);
          }
          _updateCell(e3, t3, i3, r2, n2, a2, l2, g2, v, f) {
            d = (i3 * this._terminal.cols + t3) * h, r2 !== o.NULL_CELL_CODE && void 0 !== r2 ? this._atlas && (c = g2 && g2.length > 1 ? this._atlas.getRasterizedGlyphCombinedChar(g2, n2, a2, l2, false) : this._atlas.getRasterizedGlyph(r2, n2, a2, l2, false), _ = Math.floor((this._dimensions.device.cell.width - this._dimensions.device.char.width) / 2), n2 !== f && c.offset.x > _ ? (u = c.offset.x - _, e3[d] = -(c.offset.x - u) + this._dimensions.device.char.left, e3[d + 1] = -c.offset.y + this._dimensions.device.char.top, e3[d + 2] = (c.size.x - u) / this._dimensions.device.canvas.width, e3[d + 3] = c.size.y / this._dimensions.device.canvas.height, e3[d + 4] = c.texturePage, e3[d + 5] = c.texturePositionClipSpace.x + u / this._atlas.pages[c.texturePage].canvas.width, e3[d + 6] = c.texturePositionClipSpace.y, e3[d + 7] = c.sizeClipSpace.x - u / this._atlas.pages[c.texturePage].canvas.width, e3[d + 8] = c.sizeClipSpace.y) : (e3[d] = -c.offset.x + this._dimensions.device.char.left, e3[d + 1] = -c.offset.y + this._dimensions.device.char.top, e3[d + 2] = c.size.x / this._dimensions.device.canvas.width, e3[d + 3] = c.size.y / this._dimensions.device.canvas.height, e3[d + 4] = c.texturePage, e3[d + 5] = c.texturePositionClipSpace.x, e3[d + 6] = c.texturePositionClipSpace.y, e3[d + 7] = c.sizeClipSpace.x, e3[d + 8] = c.sizeClipSpace.y), this._optionsService.rawOptions.rescaleOverlappingGlyphs && (0, s2.allowRescaling)(r2, v, c.size.x, this._dimensions.device.cell.width) && (e3[d + 2] = (this._dimensions.device.cell.width - 1) / this._dimensions.device.canvas.width)) : e3.fill(0, d, d + h - 1 - 2);
          }
          clear() {
            const e3 = this._terminal, t3 = e3.cols * e3.rows * h;
            this._vertices.count !== t3 ? this._vertices.attributes = new Float32Array(t3) : this._vertices.attributes.fill(0);
            let i3 = 0;
            for (; i3 < this._vertices.attributesBuffers.length; i3++) this._vertices.count !== t3 ? this._vertices.attributesBuffers[i3] = new Float32Array(t3) : this._vertices.attributesBuffers[i3].fill(0);
            this._vertices.count = t3, i3 = 0;
            for (let t4 = 0; t4 < e3.rows; t4++) for (let s3 = 0; s3 < e3.cols; s3++) this._vertices.attributes[i3 + 9] = s3 / e3.cols, this._vertices.attributes[i3 + 10] = t4 / e3.rows, i3 += h;
          }
          handleResize() {
            const e3 = this._gl;
            e3.useProgram(this._program), e3.viewport(0, 0, e3.canvas.width, e3.canvas.height), e3.uniform2f(this._resolutionLocation, e3.canvas.width, e3.canvas.height), this.clear();
          }
          render(e3) {
            if (!this._atlas) return;
            const t3 = this._gl;
            t3.useProgram(this._program), t3.bindVertexArray(this._vertexArrayObject), this._activeBuffer = (this._activeBuffer + 1) % 2;
            const i3 = this._vertices.attributesBuffers[this._activeBuffer];
            let s3 = 0;
            for (let t4 = 0; t4 < e3.lineLengths.length; t4++) {
              const r2 = t4 * this._terminal.cols * h, o2 = this._vertices.attributes.subarray(r2, r2 + e3.lineLengths[t4] * h);
              i3.set(o2, s3), s3 += o2.length;
            }
            t3.bindBuffer(t3.ARRAY_BUFFER, this._attributesBuffer), t3.bufferData(t3.ARRAY_BUFFER, i3.subarray(0, s3), t3.STREAM_DRAW);
            for (let e4 = 0; e4 < this._atlas.pages.length; e4++) this._atlas.pages[e4].version !== this._atlasTextures[e4].version && this._bindAtlasPageTexture(t3, this._atlas, e4);
            t3.drawElementsInstanced(t3.TRIANGLE_STRIP, 4, t3.UNSIGNED_BYTE, 0, s3 / h);
          }
          setAtlas(e3) {
            this._atlas = e3;
            for (const e4 of this._atlasTextures) e4.version = -1;
          }
          _bindAtlasPageTexture(e3, t3, i3) {
            e3.activeTexture(e3.TEXTURE0 + i3), e3.bindTexture(e3.TEXTURE_2D, this._atlasTextures[i3].texture), e3.texParameteri(e3.TEXTURE_2D, e3.TEXTURE_WRAP_S, e3.CLAMP_TO_EDGE), e3.texParameteri(e3.TEXTURE_2D, e3.TEXTURE_WRAP_T, e3.CLAMP_TO_EDGE), e3.texImage2D(e3.TEXTURE_2D, 0, e3.RGBA, e3.RGBA, e3.UNSIGNED_BYTE, t3.pages[i3].canvas), e3.generateMipmap(e3.TEXTURE_2D), this._atlasTextures[i3].version = t3.pages[i3].version;
          }
          setDimensions(e3) {
            this._dimensions = e3;
          }
        }
        t2.GlyphRenderer = g;
      }, 742: (e2, t2, i2) => {
        Object.defineProperty(t2, "__esModule", { value: true }), t2.RectangleRenderer = void 0;
        const s2 = i2(374), r = i2(859), o = i2(310), n = i2(381), a = 8 * Float32Array.BYTES_PER_ELEMENT;
        class h {
          constructor() {
            this.attributes = new Float32Array(160), this.count = 0;
          }
        }
        let l = 0, c = 0, d = 0, _ = 0, u = 0, g = 0, v = 0;
        class f extends r.Disposable {
          constructor(e3, t3, i3, o2) {
            super(), this._terminal = e3, this._gl = t3, this._dimensions = i3, this._themeService = o2, this._vertices = new h(), this._verticesCursor = new h();
            const l2 = this._gl;
            this._program = (0, s2.throwIfFalsy)((0, n.createProgram)(l2, "#version 300 es\nlayout (location = 0) in vec2 a_position;\nlayout (location = 1) in vec2 a_size;\nlayout (location = 2) in vec4 a_color;\nlayout (location = 3) in vec2 a_unitquad;\n\nuniform mat4 u_projection;\n\nout vec4 v_color;\n\nvoid main() {\n  vec2 zeroToOne = a_position + (a_unitquad * a_size);\n  gl_Position = u_projection * vec4(zeroToOne, 0.0, 1.0);\n  v_color = a_color;\n}", "#version 300 es\nprecision lowp float;\n\nin vec4 v_color;\n\nout vec4 outColor;\n\nvoid main() {\n  outColor = v_color;\n}")), this.register((0, r.toDisposable)(() => l2.deleteProgram(this._program))), this._projectionLocation = (0, s2.throwIfFalsy)(l2.getUniformLocation(this._program, "u_projection")), this._vertexArrayObject = l2.createVertexArray(), l2.bindVertexArray(this._vertexArrayObject);
            const c2 = new Float32Array([0, 0, 1, 0, 0, 1, 1, 1]), d2 = l2.createBuffer();
            this.register((0, r.toDisposable)(() => l2.deleteBuffer(d2))), l2.bindBuffer(l2.ARRAY_BUFFER, d2), l2.bufferData(l2.ARRAY_BUFFER, c2, l2.STATIC_DRAW), l2.enableVertexAttribArray(3), l2.vertexAttribPointer(3, 2, this._gl.FLOAT, false, 0, 0);
            const _2 = new Uint8Array([0, 1, 2, 3]), u2 = l2.createBuffer();
            this.register((0, r.toDisposable)(() => l2.deleteBuffer(u2))), l2.bindBuffer(l2.ELEMENT_ARRAY_BUFFER, u2), l2.bufferData(l2.ELEMENT_ARRAY_BUFFER, _2, l2.STATIC_DRAW), this._attributesBuffer = (0, s2.throwIfFalsy)(l2.createBuffer()), this.register((0, r.toDisposable)(() => l2.deleteBuffer(this._attributesBuffer))), l2.bindBuffer(l2.ARRAY_BUFFER, this._attributesBuffer), l2.enableVertexAttribArray(0), l2.vertexAttribPointer(0, 2, l2.FLOAT, false, a, 0), l2.vertexAttribDivisor(0, 1), l2.enableVertexAttribArray(1), l2.vertexAttribPointer(1, 2, l2.FLOAT, false, a, 2 * Float32Array.BYTES_PER_ELEMENT), l2.vertexAttribDivisor(1, 1), l2.enableVertexAttribArray(2), l2.vertexAttribPointer(2, 4, l2.FLOAT, false, a, 4 * Float32Array.BYTES_PER_ELEMENT), l2.vertexAttribDivisor(2, 1), this._updateCachedColors(o2.colors), this.register(this._themeService.onChangeColors((e4) => {
              this._updateCachedColors(e4), this._updateViewportRectangle();
            }));
          }
          renderBackgrounds() {
            this._renderVertices(this._vertices);
          }
          renderCursor() {
            this._renderVertices(this._verticesCursor);
          }
          _renderVertices(e3) {
            const t3 = this._gl;
            t3.useProgram(this._program), t3.bindVertexArray(this._vertexArrayObject), t3.uniformMatrix4fv(this._projectionLocation, false, n.PROJECTION_MATRIX), t3.bindBuffer(t3.ARRAY_BUFFER, this._attributesBuffer), t3.bufferData(t3.ARRAY_BUFFER, e3.attributes, t3.DYNAMIC_DRAW), t3.drawElementsInstanced(this._gl.TRIANGLE_STRIP, 4, t3.UNSIGNED_BYTE, 0, e3.count);
          }
          handleResize() {
            this._updateViewportRectangle();
          }
          setDimensions(e3) {
            this._dimensions = e3;
          }
          _updateCachedColors(e3) {
            this._bgFloat = this._colorToFloat32Array(e3.background), this._cursorFloat = this._colorToFloat32Array(e3.cursor);
          }
          _updateViewportRectangle() {
            this._addRectangleFloat(this._vertices.attributes, 0, 0, 0, this._terminal.cols * this._dimensions.device.cell.width, this._terminal.rows * this._dimensions.device.cell.height, this._bgFloat);
          }
          updateBackgrounds(e3) {
            const t3 = this._terminal, i3 = this._vertices;
            let s3, r2, n2, a2, h2, l2, c2, d2, _2, u2, g2, v2 = 1;
            for (s3 = 0; s3 < t3.rows; s3++) {
              for (n2 = -1, a2 = 0, h2 = 0, l2 = false, r2 = 0; r2 < t3.cols; r2++) c2 = (s3 * t3.cols + r2) * o.RENDER_MODEL_INDICIES_PER_CELL, d2 = e3.cells[c2 + o.RENDER_MODEL_BG_OFFSET], _2 = e3.cells[c2 + o.RENDER_MODEL_FG_OFFSET], u2 = !!(67108864 & _2), (d2 !== a2 || _2 !== h2 && (l2 || u2)) && ((0 !== a2 || l2 && 0 !== h2) && (g2 = 8 * v2++, this._updateRectangle(i3, g2, h2, a2, n2, r2, s3)), n2 = r2, a2 = d2, h2 = _2, l2 = u2);
              (0 !== a2 || l2 && 0 !== h2) && (g2 = 8 * v2++, this._updateRectangle(i3, g2, h2, a2, n2, t3.cols, s3));
            }
            i3.count = v2;
          }
          updateCursor(e3) {
            const t3 = this._verticesCursor, i3 = e3.cursor;
            if (!i3 || "block" === i3.style) return void (t3.count = 0);
            let s3, r2 = 0;
            "bar" !== i3.style && "outline" !== i3.style || (s3 = 8 * r2++, this._addRectangleFloat(t3.attributes, s3, i3.x * this._dimensions.device.cell.width, i3.y * this._dimensions.device.cell.height, "bar" === i3.style ? i3.dpr * i3.cursorWidth : i3.dpr, this._dimensions.device.cell.height, this._cursorFloat)), "underline" !== i3.style && "outline" !== i3.style || (s3 = 8 * r2++, this._addRectangleFloat(t3.attributes, s3, i3.x * this._dimensions.device.cell.width, (i3.y + 1) * this._dimensions.device.cell.height - i3.dpr, i3.width * this._dimensions.device.cell.width, i3.dpr, this._cursorFloat)), "outline" === i3.style && (s3 = 8 * r2++, this._addRectangleFloat(t3.attributes, s3, i3.x * this._dimensions.device.cell.width, i3.y * this._dimensions.device.cell.height, i3.width * this._dimensions.device.cell.width, i3.dpr, this._cursorFloat), s3 = 8 * r2++, this._addRectangleFloat(t3.attributes, s3, (i3.x + i3.width) * this._dimensions.device.cell.width - i3.dpr, i3.y * this._dimensions.device.cell.height, i3.dpr, this._dimensions.device.cell.height, this._cursorFloat)), t3.count = r2;
          }
          _updateRectangle(e3, t3, i3, s3, r2, o2, a2) {
            if (67108864 & i3) switch (50331648 & i3) {
              case 16777216:
              case 33554432:
                l = this._themeService.colors.ansi[255 & i3].rgba;
                break;
              case 50331648:
                l = (16777215 & i3) << 8;
                break;
              default:
                l = this._themeService.colors.foreground.rgba;
            }
            else switch (50331648 & s3) {
              case 16777216:
              case 33554432:
                l = this._themeService.colors.ansi[255 & s3].rgba;
                break;
              case 50331648:
                l = (16777215 & s3) << 8;
                break;
              default:
                l = this._themeService.colors.background.rgba;
            }
            e3.attributes.length < t3 + 4 && (e3.attributes = (0, n.expandFloat32Array)(e3.attributes, this._terminal.rows * this._terminal.cols * 8)), c = r2 * this._dimensions.device.cell.width, d = a2 * this._dimensions.device.cell.height, _ = (l >> 24 & 255) / 255, u = (l >> 16 & 255) / 255, g = (l >> 8 & 255) / 255, v = 1, this._addRectangle(e3.attributes, t3, c, d, (o2 - r2) * this._dimensions.device.cell.width, this._dimensions.device.cell.height, _, u, g, v);
          }
          _addRectangle(e3, t3, i3, s3, r2, o2, n2, a2, h2, l2) {
            e3[t3] = i3 / this._dimensions.device.canvas.width, e3[t3 + 1] = s3 / this._dimensions.device.canvas.height, e3[t3 + 2] = r2 / this._dimensions.device.canvas.width, e3[t3 + 3] = o2 / this._dimensions.device.canvas.height, e3[t3 + 4] = n2, e3[t3 + 5] = a2, e3[t3 + 6] = h2, e3[t3 + 7] = l2;
          }
          _addRectangleFloat(e3, t3, i3, s3, r2, o2, n2) {
            e3[t3] = i3 / this._dimensions.device.canvas.width, e3[t3 + 1] = s3 / this._dimensions.device.canvas.height, e3[t3 + 2] = r2 / this._dimensions.device.canvas.width, e3[t3 + 3] = o2 / this._dimensions.device.canvas.height, e3[t3 + 4] = n2[0], e3[t3 + 5] = n2[1], e3[t3 + 6] = n2[2], e3[t3 + 7] = n2[3];
          }
          _colorToFloat32Array(e3) {
            return new Float32Array([(e3.rgba >> 24 & 255) / 255, (e3.rgba >> 16 & 255) / 255, (e3.rgba >> 8 & 255) / 255, (255 & e3.rgba) / 255]);
          }
        }
        t2.RectangleRenderer = f;
      }, 310: (e2, t2, i2) => {
        Object.defineProperty(t2, "__esModule", { value: true }), t2.RenderModel = t2.COMBINED_CHAR_BIT_MASK = t2.RENDER_MODEL_EXT_OFFSET = t2.RENDER_MODEL_FG_OFFSET = t2.RENDER_MODEL_BG_OFFSET = t2.RENDER_MODEL_INDICIES_PER_CELL = void 0;
        const s2 = i2(296);
        t2.RENDER_MODEL_INDICIES_PER_CELL = 4, t2.RENDER_MODEL_BG_OFFSET = 1, t2.RENDER_MODEL_FG_OFFSET = 2, t2.RENDER_MODEL_EXT_OFFSET = 3, t2.COMBINED_CHAR_BIT_MASK = 2147483648, t2.RenderModel = class {
          constructor() {
            this.cells = new Uint32Array(0), this.lineLengths = new Uint32Array(0), this.selection = (0, s2.createSelectionRenderModel)();
          }
          resize(e3, i3) {
            const s3 = e3 * i3 * t2.RENDER_MODEL_INDICIES_PER_CELL;
            s3 !== this.cells.length && (this.cells = new Uint32Array(s3), this.lineLengths = new Uint32Array(i3));
          }
          clear() {
            this.cells.fill(0, 0), this.lineLengths.fill(0, 0);
          }
        };
      }, 666: (e2, t2, i2) => {
        Object.defineProperty(t2, "__esModule", { value: true }), t2.JoinedCellData = t2.WebglRenderer = void 0;
        const s2 = i2(820), r = i2(274), o = i2(627), n = i2(457), a = i2(56), h = i2(374), l = i2(345), c = i2(859), d = i2(147), _ = i2(782), u = i2(855), g = i2(965), v = i2(742), f = i2(310), p = i2(733);
        class C extends c.Disposable {
          constructor(e3, t3, i3, n2, d2, u2, g2, v2, C2) {
            super(), this._terminal = e3, this._characterJoinerService = t3, this._charSizeService = i3, this._coreBrowserService = n2, this._coreService = d2, this._decorationService = u2, this._optionsService = g2, this._themeService = v2, this._cursorBlinkStateManager = new c.MutableDisposable(), this._charAtlasDisposable = this.register(new c.MutableDisposable()), this._observerDisposable = this.register(new c.MutableDisposable()), this._model = new f.RenderModel(), this._workCell = new _.CellData(), this._workCell2 = new _.CellData(), this._rectangleRenderer = this.register(new c.MutableDisposable()), this._glyphRenderer = this.register(new c.MutableDisposable()), this._onChangeTextureAtlas = this.register(new l.EventEmitter()), this.onChangeTextureAtlas = this._onChangeTextureAtlas.event, this._onAddTextureAtlasCanvas = this.register(new l.EventEmitter()), this.onAddTextureAtlasCanvas = this._onAddTextureAtlasCanvas.event, this._onRemoveTextureAtlasCanvas = this.register(new l.EventEmitter()), this.onRemoveTextureAtlasCanvas = this._onRemoveTextureAtlasCanvas.event, this._onRequestRedraw = this.register(new l.EventEmitter()), this.onRequestRedraw = this._onRequestRedraw.event, this._onContextLoss = this.register(new l.EventEmitter()), this.onContextLoss = this._onContextLoss.event, this.register(this._themeService.onChangeColors(() => this._handleColorChange())), this._cellColorResolver = new r.CellColorResolver(this._terminal, this._optionsService, this._model.selection, this._decorationService, this._coreBrowserService, this._themeService), this._core = this._terminal._core, this._renderLayers = [new p.LinkRenderLayer(this._core.screenElement, 2, this._terminal, this._core.linkifier, this._coreBrowserService, g2, this._themeService)], this.dimensions = (0, h.createRenderDimensions)(), this._devicePixelRatio = this._coreBrowserService.dpr, this._updateDimensions(), this._updateCursorBlink(), this.register(g2.onOptionChange(() => this._handleOptionsChanged())), this._canvas = this._coreBrowserService.mainDocument.createElement("canvas");
            const m2 = { antialias: false, depth: false, preserveDrawingBuffer: C2 };
            if (this._gl = this._canvas.getContext("webgl2", m2), !this._gl) throw new Error("WebGL2 not supported " + this._gl);
            this.register((0, s2.addDisposableDomListener)(this._canvas, "webglcontextlost", (e4) => {
              console.log("webglcontextlost event received"), e4.preventDefault(), this._contextRestorationTimeout = setTimeout(() => {
                this._contextRestorationTimeout = void 0, console.warn("webgl context not restored; firing onContextLoss"), this._onContextLoss.fire(e4);
              }, 3e3);
            })), this.register((0, s2.addDisposableDomListener)(this._canvas, "webglcontextrestored", (e4) => {
              console.warn("webglcontextrestored event received"), clearTimeout(this._contextRestorationTimeout), this._contextRestorationTimeout = void 0, (0, o.removeTerminalFromCache)(this._terminal), this._initializeWebGLState(), this._requestRedrawViewport();
            })), this._observerDisposable.value = (0, a.observeDevicePixelDimensions)(this._canvas, this._coreBrowserService.window, (e4, t4) => this._setCanvasDevicePixelDimensions(e4, t4)), this.register(this._coreBrowserService.onWindowChange((e4) => {
              this._observerDisposable.value = (0, a.observeDevicePixelDimensions)(this._canvas, e4, (e5, t4) => this._setCanvasDevicePixelDimensions(e5, t4));
            })), this._core.screenElement.appendChild(this._canvas), [this._rectangleRenderer.value, this._glyphRenderer.value] = this._initializeWebGLState(), this._isAttached = this._coreBrowserService.window.document.body.contains(this._core.screenElement), this.register((0, c.toDisposable)(() => {
              var _a2;
              for (const e4 of this._renderLayers) e4.dispose();
              (_a2 = this._canvas.parentElement) == null ? void 0 : _a2.removeChild(this._canvas), (0, o.removeTerminalFromCache)(this._terminal);
            }));
          }
          get textureAtlas() {
            var _a2;
            return (_a2 = this._charAtlas) == null ? void 0 : _a2.pages[0].canvas;
          }
          _handleColorChange() {
            this._refreshCharAtlas(), this._clearModel(true);
          }
          handleDevicePixelRatioChange() {
            this._devicePixelRatio !== this._coreBrowserService.dpr && (this._devicePixelRatio = this._coreBrowserService.dpr, this.handleResize(this._terminal.cols, this._terminal.rows));
          }
          handleResize(e3, t3) {
            var _a2, _b2, _c2, _d2;
            this._updateDimensions(), this._model.resize(this._terminal.cols, this._terminal.rows);
            for (const e4 of this._renderLayers) e4.resize(this._terminal, this.dimensions);
            this._canvas.width = this.dimensions.device.canvas.width, this._canvas.height = this.dimensions.device.canvas.height, this._canvas.style.width = `${this.dimensions.css.canvas.width}px`, this._canvas.style.height = `${this.dimensions.css.canvas.height}px`, this._core.screenElement.style.width = `${this.dimensions.css.canvas.width}px`, this._core.screenElement.style.height = `${this.dimensions.css.canvas.height}px`, (_a2 = this._rectangleRenderer.value) == null ? void 0 : _a2.setDimensions(this.dimensions), (_b2 = this._rectangleRenderer.value) == null ? void 0 : _b2.handleResize(), (_c2 = this._glyphRenderer.value) == null ? void 0 : _c2.setDimensions(this.dimensions), (_d2 = this._glyphRenderer.value) == null ? void 0 : _d2.handleResize(), this._refreshCharAtlas(), this._clearModel(false);
          }
          handleCharSizeChanged() {
            this.handleResize(this._terminal.cols, this._terminal.rows);
          }
          handleBlur() {
            var _a2;
            for (const e3 of this._renderLayers) e3.handleBlur(this._terminal);
            (_a2 = this._cursorBlinkStateManager.value) == null ? void 0 : _a2.pause(), this._requestRedrawViewport();
          }
          handleFocus() {
            var _a2;
            for (const e3 of this._renderLayers) e3.handleFocus(this._terminal);
            (_a2 = this._cursorBlinkStateManager.value) == null ? void 0 : _a2.resume(), this._requestRedrawViewport();
          }
          handleSelectionChanged(e3, t3, i3) {
            for (const s3 of this._renderLayers) s3.handleSelectionChanged(this._terminal, e3, t3, i3);
            this._model.selection.update(this._core, e3, t3, i3), this._requestRedrawViewport();
          }
          handleCursorMove() {
            var _a2;
            for (const e3 of this._renderLayers) e3.handleCursorMove(this._terminal);
            (_a2 = this._cursorBlinkStateManager.value) == null ? void 0 : _a2.restartBlinkAnimation();
          }
          _handleOptionsChanged() {
            this._updateDimensions(), this._refreshCharAtlas(), this._updateCursorBlink();
          }
          _initializeWebGLState() {
            return this._rectangleRenderer.value = new v.RectangleRenderer(this._terminal, this._gl, this.dimensions, this._themeService), this._glyphRenderer.value = new g.GlyphRenderer(this._terminal, this._gl, this.dimensions, this._optionsService), this.handleCharSizeChanged(), [this._rectangleRenderer.value, this._glyphRenderer.value];
          }
          _refreshCharAtlas() {
            var _a2;
            if (this.dimensions.device.char.width <= 0 && this.dimensions.device.char.height <= 0) return void (this._isAttached = false);
            const e3 = (0, o.acquireTextureAtlas)(this._terminal, this._optionsService.rawOptions, this._themeService.colors, this.dimensions.device.cell.width, this.dimensions.device.cell.height, this.dimensions.device.char.width, this.dimensions.device.char.height, this._coreBrowserService.dpr);
            this._charAtlas !== e3 && (this._onChangeTextureAtlas.fire(e3.pages[0].canvas), this._charAtlasDisposable.value = (0, c.getDisposeArrayDisposable)([(0, l.forwardEvent)(e3.onAddTextureAtlasCanvas, this._onAddTextureAtlasCanvas), (0, l.forwardEvent)(e3.onRemoveTextureAtlasCanvas, this._onRemoveTextureAtlasCanvas)])), this._charAtlas = e3, this._charAtlas.warmUp(), (_a2 = this._glyphRenderer.value) == null ? void 0 : _a2.setAtlas(this._charAtlas);
          }
          _clearModel(e3) {
            var _a2;
            this._model.clear(), e3 && ((_a2 = this._glyphRenderer.value) == null ? void 0 : _a2.clear());
          }
          clearTextureAtlas() {
            var _a2;
            (_a2 = this._charAtlas) == null ? void 0 : _a2.clearTexture(), this._clearModel(true), this._requestRedrawViewport();
          }
          clear() {
            var _a2;
            this._clearModel(true);
            for (const e3 of this._renderLayers) e3.reset(this._terminal);
            (_a2 = this._cursorBlinkStateManager.value) == null ? void 0 : _a2.restartBlinkAnimation(), this._updateCursorBlink();
          }
          registerCharacterJoiner(e3) {
            return -1;
          }
          deregisterCharacterJoiner(e3) {
            return false;
          }
          renderRows(e3, t3) {
            if (!this._isAttached) {
              if (!(this._coreBrowserService.window.document.body.contains(this._core.screenElement) && this._charSizeService.width && this._charSizeService.height)) return;
              this._updateDimensions(), this._refreshCharAtlas(), this._isAttached = true;
            }
            for (const i3 of this._renderLayers) i3.handleGridChanged(this._terminal, e3, t3);
            this._glyphRenderer.value && this._rectangleRenderer.value && (this._glyphRenderer.value.beginFrame() ? (this._clearModel(true), this._updateModel(0, this._terminal.rows - 1)) : this._updateModel(e3, t3), this._rectangleRenderer.value.renderBackgrounds(), this._glyphRenderer.value.render(this._model), this._cursorBlinkStateManager.value && !this._cursorBlinkStateManager.value.isCursorVisible || this._rectangleRenderer.value.renderCursor());
          }
          _updateCursorBlink() {
            this._terminal.options.cursorBlink ? this._cursorBlinkStateManager.value = new n.CursorBlinkStateManager(() => {
              this._requestRedrawCursor();
            }, this._coreBrowserService) : this._cursorBlinkStateManager.clear(), this._requestRedrawCursor();
          }
          _updateModel(e3, t3) {
            const i3 = this._core;
            let s3, r2, o2, n2, a2, h2, l2, c2, d2, _2, g2, v2, p2, C2, x = this._workCell;
            e3 = L(e3, i3.rows - 1, 0), t3 = L(t3, i3.rows - 1, 0);
            const w = this._terminal.buffer.active.baseY + this._terminal.buffer.active.cursorY, b = w - i3.buffer.ydisp, M = Math.min(this._terminal.buffer.active.cursorX, i3.cols - 1);
            let R = -1;
            const y = this._coreService.isCursorInitialized && !this._coreService.isCursorHidden && (!this._cursorBlinkStateManager.value || this._cursorBlinkStateManager.value.isCursorVisible);
            this._model.cursor = void 0;
            let A = false;
            for (r2 = e3; r2 <= t3; r2++) for (o2 = r2 + i3.buffer.ydisp, n2 = i3.buffer.lines.get(o2), this._model.lineLengths[r2] = 0, a2 = this._characterJoinerService.getJoinedCharacters(o2), p2 = 0; p2 < i3.cols; p2++) if (s3 = this._cellColorResolver.result.bg, n2.loadCell(p2, x), 0 === p2 && (s3 = this._cellColorResolver.result.bg), h2 = false, l2 = p2, a2.length > 0 && p2 === a2[0][0] && (h2 = true, c2 = a2.shift(), x = new m(x, n2.translateToString(true, c2[0], c2[1]), c2[1] - c2[0]), l2 = c2[1] - 1), d2 = x.getChars(), _2 = x.getCode(), v2 = (r2 * i3.cols + p2) * f.RENDER_MODEL_INDICIES_PER_CELL, this._cellColorResolver.resolve(x, p2, o2, this.dimensions.device.cell.width), y && o2 === w && (p2 === M && (this._model.cursor = { x: M, y: b, width: x.getWidth(), style: this._coreBrowserService.isFocused ? i3.options.cursorStyle || "block" : i3.options.cursorInactiveStyle, cursorWidth: i3.options.cursorWidth, dpr: this._devicePixelRatio }, R = M + x.getWidth() - 1), p2 >= M && p2 <= R && (this._coreBrowserService.isFocused && "block" === (i3.options.cursorStyle || "block") || false === this._coreBrowserService.isFocused && "block" === i3.options.cursorInactiveStyle) && (this._cellColorResolver.result.fg = 50331648 | this._themeService.colors.cursorAccent.rgba >> 8 & 16777215, this._cellColorResolver.result.bg = 50331648 | this._themeService.colors.cursor.rgba >> 8 & 16777215)), _2 !== u.NULL_CELL_CODE && (this._model.lineLengths[r2] = p2 + 1), (this._model.cells[v2] !== _2 || this._model.cells[v2 + f.RENDER_MODEL_BG_OFFSET] !== this._cellColorResolver.result.bg || this._model.cells[v2 + f.RENDER_MODEL_FG_OFFSET] !== this._cellColorResolver.result.fg || this._model.cells[v2 + f.RENDER_MODEL_EXT_OFFSET] !== this._cellColorResolver.result.ext) && (A = true, d2.length > 1 && (_2 |= f.COMBINED_CHAR_BIT_MASK), this._model.cells[v2] = _2, this._model.cells[v2 + f.RENDER_MODEL_BG_OFFSET] = this._cellColorResolver.result.bg, this._model.cells[v2 + f.RENDER_MODEL_FG_OFFSET] = this._cellColorResolver.result.fg, this._model.cells[v2 + f.RENDER_MODEL_EXT_OFFSET] = this._cellColorResolver.result.ext, g2 = x.getWidth(), this._glyphRenderer.value.updateCell(p2, r2, _2, this._cellColorResolver.result.bg, this._cellColorResolver.result.fg, this._cellColorResolver.result.ext, d2, g2, s3), h2)) for (x = this._workCell, p2++; p2 < l2; p2++) C2 = (r2 * i3.cols + p2) * f.RENDER_MODEL_INDICIES_PER_CELL, this._glyphRenderer.value.updateCell(p2, r2, u.NULL_CELL_CODE, 0, 0, 0, u.NULL_CELL_CHAR, 0, 0), this._model.cells[C2] = u.NULL_CELL_CODE, this._model.cells[C2 + f.RENDER_MODEL_BG_OFFSET] = this._cellColorResolver.result.bg, this._model.cells[C2 + f.RENDER_MODEL_FG_OFFSET] = this._cellColorResolver.result.fg, this._model.cells[C2 + f.RENDER_MODEL_EXT_OFFSET] = this._cellColorResolver.result.ext;
            A && this._rectangleRenderer.value.updateBackgrounds(this._model), this._rectangleRenderer.value.updateCursor(this._model);
          }
          _updateDimensions() {
            this._charSizeService.width && this._charSizeService.height && (this.dimensions.device.char.width = Math.floor(this._charSizeService.width * this._devicePixelRatio), this.dimensions.device.char.height = Math.ceil(this._charSizeService.height * this._devicePixelRatio), this.dimensions.device.cell.height = Math.floor(this.dimensions.device.char.height * this._optionsService.rawOptions.lineHeight), this.dimensions.device.char.top = 1 === this._optionsService.rawOptions.lineHeight ? 0 : Math.round((this.dimensions.device.cell.height - this.dimensions.device.char.height) / 2), this.dimensions.device.cell.width = this.dimensions.device.char.width + Math.round(this._optionsService.rawOptions.letterSpacing), this.dimensions.device.char.left = Math.floor(this._optionsService.rawOptions.letterSpacing / 2), this.dimensions.device.canvas.height = this._terminal.rows * this.dimensions.device.cell.height, this.dimensions.device.canvas.width = this._terminal.cols * this.dimensions.device.cell.width, this.dimensions.css.canvas.height = Math.round(this.dimensions.device.canvas.height / this._devicePixelRatio), this.dimensions.css.canvas.width = Math.round(this.dimensions.device.canvas.width / this._devicePixelRatio), this.dimensions.css.cell.height = this.dimensions.device.cell.height / this._devicePixelRatio, this.dimensions.css.cell.width = this.dimensions.device.cell.width / this._devicePixelRatio);
          }
          _setCanvasDevicePixelDimensions(e3, t3) {
            this._canvas.width === e3 && this._canvas.height === t3 || (this._canvas.width = e3, this._canvas.height = t3, this._requestRedrawViewport());
          }
          _requestRedrawViewport() {
            this._onRequestRedraw.fire({ start: 0, end: this._terminal.rows - 1 });
          }
          _requestRedrawCursor() {
            const e3 = this._terminal.buffer.active.cursorY;
            this._onRequestRedraw.fire({ start: e3, end: e3 });
          }
        }
        t2.WebglRenderer = C;
        class m extends d.AttributeData {
          constructor(e3, t3, i3) {
            super(), this.content = 0, this.combinedData = "", this.fg = e3.fg, this.bg = e3.bg, this.combinedData = t3, this._width = i3;
          }
          isCombined() {
            return 2097152;
          }
          getWidth() {
            return this._width;
          }
          getChars() {
            return this.combinedData;
          }
          getCode() {
            return 2097151;
          }
          setFromCharData(e3) {
            throw new Error("not implemented");
          }
          getAsCharData() {
            return [this.fg, this.getChars(), this.getWidth(), this.getCode()];
          }
        }
        function L(e3, t3, i3 = 0) {
          return Math.max(Math.min(e3, t3), i3);
        }
        t2.JoinedCellData = m;
      }, 381: (e2, t2, i2) => {
        Object.defineProperty(t2, "__esModule", { value: true }), t2.GLTexture = t2.expandFloat32Array = t2.createShader = t2.createProgram = t2.PROJECTION_MATRIX = void 0;
        const s2 = i2(374);
        function r(e3, t3, i3) {
          const r2 = (0, s2.throwIfFalsy)(e3.createShader(t3));
          if (e3.shaderSource(r2, i3), e3.compileShader(r2), e3.getShaderParameter(r2, e3.COMPILE_STATUS)) return r2;
          console.error(e3.getShaderInfoLog(r2)), e3.deleteShader(r2);
        }
        t2.PROJECTION_MATRIX = new Float32Array([2, 0, 0, 0, 0, -2, 0, 0, 0, 0, 1, 0, -1, 1, 0, 1]), t2.createProgram = function(e3, t3, i3) {
          const o = (0, s2.throwIfFalsy)(e3.createProgram());
          if (e3.attachShader(o, (0, s2.throwIfFalsy)(r(e3, e3.VERTEX_SHADER, t3))), e3.attachShader(o, (0, s2.throwIfFalsy)(r(e3, e3.FRAGMENT_SHADER, i3))), e3.linkProgram(o), e3.getProgramParameter(o, e3.LINK_STATUS)) return o;
          console.error(e3.getProgramInfoLog(o)), e3.deleteProgram(o);
        }, t2.createShader = r, t2.expandFloat32Array = function(e3, t3) {
          const i3 = Math.min(2 * e3.length, t3), s3 = new Float32Array(i3);
          for (let t4 = 0; t4 < e3.length; t4++) s3[t4] = e3[t4];
          return s3;
        }, t2.GLTexture = class {
          constructor(e3) {
            this.texture = e3, this.version = -1;
          }
        };
      }, 592: (e2, t2, i2) => {
        Object.defineProperty(t2, "__esModule", { value: true }), t2.BaseRenderLayer = void 0;
        const s2 = i2(627), r = i2(237), o = i2(374), n = i2(859);
        class a extends n.Disposable {
          constructor(e3, t3, i3, s3, r2, o2, a2, h) {
            super(), this._container = t3, this._alpha = r2, this._coreBrowserService = o2, this._optionsService = a2, this._themeService = h, this._deviceCharWidth = 0, this._deviceCharHeight = 0, this._deviceCellWidth = 0, this._deviceCellHeight = 0, this._deviceCharLeft = 0, this._deviceCharTop = 0, this._canvas = this._coreBrowserService.mainDocument.createElement("canvas"), this._canvas.classList.add(`xterm-${i3}-layer`), this._canvas.style.zIndex = s3.toString(), this._initCanvas(), this._container.appendChild(this._canvas), this.register(this._themeService.onChangeColors((t4) => {
              this._refreshCharAtlas(e3, t4), this.reset(e3);
            })), this.register((0, n.toDisposable)(() => {
              this._canvas.remove();
            }));
          }
          _initCanvas() {
            this._ctx = (0, o.throwIfFalsy)(this._canvas.getContext("2d", { alpha: this._alpha })), this._alpha || this._clearAll();
          }
          handleBlur(e3) {
          }
          handleFocus(e3) {
          }
          handleCursorMove(e3) {
          }
          handleGridChanged(e3, t3, i3) {
          }
          handleSelectionChanged(e3, t3, i3, s3 = false) {
          }
          _setTransparency(e3, t3) {
            if (t3 === this._alpha) return;
            const i3 = this._canvas;
            this._alpha = t3, this._canvas = this._canvas.cloneNode(), this._initCanvas(), this._container.replaceChild(this._canvas, i3), this._refreshCharAtlas(e3, this._themeService.colors), this.handleGridChanged(e3, 0, e3.rows - 1);
          }
          _refreshCharAtlas(e3, t3) {
            this._deviceCharWidth <= 0 && this._deviceCharHeight <= 0 || (this._charAtlas = (0, s2.acquireTextureAtlas)(e3, this._optionsService.rawOptions, t3, this._deviceCellWidth, this._deviceCellHeight, this._deviceCharWidth, this._deviceCharHeight, this._coreBrowserService.dpr), this._charAtlas.warmUp());
          }
          resize(e3, t3) {
            this._deviceCellWidth = t3.device.cell.width, this._deviceCellHeight = t3.device.cell.height, this._deviceCharWidth = t3.device.char.width, this._deviceCharHeight = t3.device.char.height, this._deviceCharLeft = t3.device.char.left, this._deviceCharTop = t3.device.char.top, this._canvas.width = t3.device.canvas.width, this._canvas.height = t3.device.canvas.height, this._canvas.style.width = `${t3.css.canvas.width}px`, this._canvas.style.height = `${t3.css.canvas.height}px`, this._alpha || this._clearAll(), this._refreshCharAtlas(e3, this._themeService.colors);
          }
          _fillBottomLineAtCells(e3, t3, i3 = 1) {
            this._ctx.fillRect(e3 * this._deviceCellWidth, (t3 + 1) * this._deviceCellHeight - this._coreBrowserService.dpr - 1, i3 * this._deviceCellWidth, this._coreBrowserService.dpr);
          }
          _clearAll() {
            this._alpha ? this._ctx.clearRect(0, 0, this._canvas.width, this._canvas.height) : (this._ctx.fillStyle = this._themeService.colors.background.css, this._ctx.fillRect(0, 0, this._canvas.width, this._canvas.height));
          }
          _clearCells(e3, t3, i3, s3) {
            this._alpha ? this._ctx.clearRect(e3 * this._deviceCellWidth, t3 * this._deviceCellHeight, i3 * this._deviceCellWidth, s3 * this._deviceCellHeight) : (this._ctx.fillStyle = this._themeService.colors.background.css, this._ctx.fillRect(e3 * this._deviceCellWidth, t3 * this._deviceCellHeight, i3 * this._deviceCellWidth, s3 * this._deviceCellHeight));
          }
          _fillCharTrueColor(e3, t3, i3, s3) {
            this._ctx.font = this._getFont(e3, false, false), this._ctx.textBaseline = r.TEXT_BASELINE, this._clipCell(i3, s3, t3.getWidth()), this._ctx.fillText(t3.getChars(), i3 * this._deviceCellWidth + this._deviceCharLeft, s3 * this._deviceCellHeight + this._deviceCharTop + this._deviceCharHeight);
          }
          _clipCell(e3, t3, i3) {
            this._ctx.beginPath(), this._ctx.rect(e3 * this._deviceCellWidth, t3 * this._deviceCellHeight, i3 * this._deviceCellWidth, this._deviceCellHeight), this._ctx.clip();
          }
          _getFont(e3, t3, i3) {
            return `${i3 ? "italic" : ""} ${t3 ? e3.options.fontWeightBold : e3.options.fontWeight} ${e3.options.fontSize * this._coreBrowserService.dpr}px ${e3.options.fontFamily}`;
          }
        }
        t2.BaseRenderLayer = a;
      }, 733: (e2, t2, i2) => {
        Object.defineProperty(t2, "__esModule", { value: true }), t2.LinkRenderLayer = void 0;
        const s2 = i2(197), r = i2(237), o = i2(592);
        class n extends o.BaseRenderLayer {
          constructor(e3, t3, i3, s3, r2, o2, n2) {
            super(i3, e3, "link", t3, true, r2, o2, n2), this.register(s3.onShowLinkUnderline((e4) => this._handleShowLinkUnderline(e4))), this.register(s3.onHideLinkUnderline((e4) => this._handleHideLinkUnderline(e4)));
          }
          resize(e3, t3) {
            super.resize(e3, t3), this._state = void 0;
          }
          reset(e3) {
            this._clearCurrentLink();
          }
          _clearCurrentLink() {
            if (this._state) {
              this._clearCells(this._state.x1, this._state.y1, this._state.cols - this._state.x1, 1);
              const e3 = this._state.y2 - this._state.y1 - 1;
              e3 > 0 && this._clearCells(0, this._state.y1 + 1, this._state.cols, e3), this._clearCells(0, this._state.y2, this._state.x2, 1), this._state = void 0;
            }
          }
          _handleShowLinkUnderline(e3) {
            if (e3.fg === r.INVERTED_DEFAULT_COLOR ? this._ctx.fillStyle = this._themeService.colors.background.css : void 0 !== e3.fg && (0, s2.is256Color)(e3.fg) ? this._ctx.fillStyle = this._themeService.colors.ansi[e3.fg].css : this._ctx.fillStyle = this._themeService.colors.foreground.css, e3.y1 === e3.y2) this._fillBottomLineAtCells(e3.x1, e3.y1, e3.x2 - e3.x1);
            else {
              this._fillBottomLineAtCells(e3.x1, e3.y1, e3.cols - e3.x1);
              for (let t3 = e3.y1 + 1; t3 < e3.y2; t3++) this._fillBottomLineAtCells(0, t3, e3.cols);
              this._fillBottomLineAtCells(0, e3.y2, e3.x2);
            }
            this._state = e3;
          }
          _handleHideLinkUnderline(e3) {
            this._clearCurrentLink();
          }
        }
        t2.LinkRenderLayer = n;
      }, 820: (e2, t2) => {
        Object.defineProperty(t2, "__esModule", { value: true }), t2.addDisposableDomListener = void 0, t2.addDisposableDomListener = function(e3, t3, i2, s2) {
          e3.addEventListener(t3, i2, s2);
          let r = false;
          return { dispose: () => {
            r || (r = true, e3.removeEventListener(t3, i2, s2));
          } };
        };
      }, 274: (e2, t2, i2) => {
        Object.defineProperty(t2, "__esModule", { value: true }), t2.CellColorResolver = void 0;
        const s2 = i2(855), r = i2(160), o = i2(374);
        let n, a = 0, h = 0, l = false, c = false, d = false, _ = 0;
        t2.CellColorResolver = class {
          constructor(e3, t3, i3, s3, r2, o2) {
            this._terminal = e3, this._optionService = t3, this._selectionRenderModel = i3, this._decorationService = s3, this._coreBrowserService = r2, this._themeService = o2, this.result = { fg: 0, bg: 0, ext: 0 };
          }
          resolve(e3, t3, i3, u) {
            if (this.result.bg = e3.bg, this.result.fg = e3.fg, this.result.ext = 268435456 & e3.bg ? e3.extended.ext : 0, h = 0, a = 0, c = false, l = false, d = false, n = this._themeService.colors, _ = 0, e3.getCode() !== s2.NULL_CELL_CODE && 4 === e3.extended.underlineStyle) {
              const e4 = Math.max(1, Math.floor(this._optionService.rawOptions.fontSize * this._coreBrowserService.dpr / 15));
              _ = t3 * u % (2 * Math.round(e4));
            }
            if (this._decorationService.forEachDecorationAtCell(t3, i3, "bottom", (e4) => {
              e4.backgroundColorRGB && (h = e4.backgroundColorRGB.rgba >> 8 & 16777215, c = true), e4.foregroundColorRGB && (a = e4.foregroundColorRGB.rgba >> 8 & 16777215, l = true);
            }), d = this._selectionRenderModel.isCellSelected(this._terminal, t3, i3), d) {
              if (67108864 & this.result.fg || 0 != (50331648 & this.result.bg)) {
                if (67108864 & this.result.fg) switch (50331648 & this.result.fg) {
                  case 16777216:
                  case 33554432:
                    h = this._themeService.colors.ansi[255 & this.result.fg].rgba;
                    break;
                  case 50331648:
                    h = (16777215 & this.result.fg) << 8 | 255;
                    break;
                  default:
                    h = this._themeService.colors.foreground.rgba;
                }
                else switch (50331648 & this.result.bg) {
                  case 16777216:
                  case 33554432:
                    h = this._themeService.colors.ansi[255 & this.result.bg].rgba;
                    break;
                  case 50331648:
                    h = (16777215 & this.result.bg) << 8 | 255;
                }
                h = r.rgba.blend(h, 4294967040 & (this._coreBrowserService.isFocused ? n.selectionBackgroundOpaque : n.selectionInactiveBackgroundOpaque).rgba | 128) >> 8 & 16777215;
              } else h = (this._coreBrowserService.isFocused ? n.selectionBackgroundOpaque : n.selectionInactiveBackgroundOpaque).rgba >> 8 & 16777215;
              if (c = true, n.selectionForeground && (a = n.selectionForeground.rgba >> 8 & 16777215, l = true), (0, o.treatGlyphAsBackgroundColor)(e3.getCode())) {
                if (67108864 & this.result.fg && 0 == (50331648 & this.result.bg)) a = (this._coreBrowserService.isFocused ? n.selectionBackgroundOpaque : n.selectionInactiveBackgroundOpaque).rgba >> 8 & 16777215;
                else {
                  if (67108864 & this.result.fg) switch (50331648 & this.result.bg) {
                    case 16777216:
                    case 33554432:
                      a = this._themeService.colors.ansi[255 & this.result.bg].rgba;
                      break;
                    case 50331648:
                      a = (16777215 & this.result.bg) << 8 | 255;
                  }
                  else switch (50331648 & this.result.fg) {
                    case 16777216:
                    case 33554432:
                      a = this._themeService.colors.ansi[255 & this.result.fg].rgba;
                      break;
                    case 50331648:
                      a = (16777215 & this.result.fg) << 8 | 255;
                      break;
                    default:
                      a = this._themeService.colors.foreground.rgba;
                  }
                  a = r.rgba.blend(a, 4294967040 & (this._coreBrowserService.isFocused ? n.selectionBackgroundOpaque : n.selectionInactiveBackgroundOpaque).rgba | 128) >> 8 & 16777215;
                }
                l = true;
              }
            }
            this._decorationService.forEachDecorationAtCell(t3, i3, "top", (e4) => {
              e4.backgroundColorRGB && (h = e4.backgroundColorRGB.rgba >> 8 & 16777215, c = true), e4.foregroundColorRGB && (a = e4.foregroundColorRGB.rgba >> 8 & 16777215, l = true);
            }), c && (h = d ? -16777216 & e3.bg & -134217729 | h | 50331648 : -16777216 & e3.bg | h | 50331648), l && (a = -16777216 & e3.fg & -67108865 | a | 50331648), 67108864 & this.result.fg && (c && !l && (a = 0 == (50331648 & this.result.bg) ? -134217728 & this.result.fg | 16777215 & n.background.rgba >> 8 | 50331648 : -134217728 & this.result.fg | 67108863 & this.result.bg, l = true), !c && l && (h = 0 == (50331648 & this.result.fg) ? -67108864 & this.result.bg | 16777215 & n.foreground.rgba >> 8 | 50331648 : -67108864 & this.result.bg | 67108863 & this.result.fg, c = true)), n = void 0, this.result.bg = c ? h : this.result.bg, this.result.fg = l ? a : this.result.fg, this.result.ext &= 536870911, this.result.ext |= _ << 29 & 3758096384;
          }
        };
      }, 627: (e2, t2, i2) => {
        Object.defineProperty(t2, "__esModule", { value: true }), t2.removeTerminalFromCache = t2.acquireTextureAtlas = void 0;
        const s2 = i2(509), r = i2(197), o = [];
        t2.acquireTextureAtlas = function(e3, t3, i3, n, a, h, l, c) {
          const d = (0, r.generateConfig)(n, a, h, l, t3, i3, c);
          for (let t4 = 0; t4 < o.length; t4++) {
            const i4 = o[t4], s3 = i4.ownedBy.indexOf(e3);
            if (s3 >= 0) {
              if ((0, r.configEquals)(i4.config, d)) return i4.atlas;
              1 === i4.ownedBy.length ? (i4.atlas.dispose(), o.splice(t4, 1)) : i4.ownedBy.splice(s3, 1);
              break;
            }
          }
          for (let t4 = 0; t4 < o.length; t4++) {
            const i4 = o[t4];
            if ((0, r.configEquals)(i4.config, d)) return i4.ownedBy.push(e3), i4.atlas;
          }
          const _ = e3._core, u = { atlas: new s2.TextureAtlas(document, d, _.unicodeService), config: d, ownedBy: [e3] };
          return o.push(u), u.atlas;
        }, t2.removeTerminalFromCache = function(e3) {
          for (let t3 = 0; t3 < o.length; t3++) {
            const i3 = o[t3].ownedBy.indexOf(e3);
            if (-1 !== i3) {
              1 === o[t3].ownedBy.length ? (o[t3].atlas.dispose(), o.splice(t3, 1)) : o[t3].ownedBy.splice(i3, 1);
              break;
            }
          }
        };
      }, 197: (e2, t2, i2) => {
        Object.defineProperty(t2, "__esModule", { value: true }), t2.is256Color = t2.configEquals = t2.generateConfig = void 0;
        const s2 = i2(160);
        t2.generateConfig = function(e3, t3, i3, r, o, n, a) {
          const h = { foreground: n.foreground, background: n.background, cursor: s2.NULL_COLOR, cursorAccent: s2.NULL_COLOR, selectionForeground: s2.NULL_COLOR, selectionBackgroundTransparent: s2.NULL_COLOR, selectionBackgroundOpaque: s2.NULL_COLOR, selectionInactiveBackgroundTransparent: s2.NULL_COLOR, selectionInactiveBackgroundOpaque: s2.NULL_COLOR, ansi: n.ansi.slice(), contrastCache: n.contrastCache, halfContrastCache: n.halfContrastCache };
          return { customGlyphs: o.customGlyphs, devicePixelRatio: a, letterSpacing: o.letterSpacing, lineHeight: o.lineHeight, deviceCellWidth: e3, deviceCellHeight: t3, deviceCharWidth: i3, deviceCharHeight: r, fontFamily: o.fontFamily, fontSize: o.fontSize, fontWeight: o.fontWeight, fontWeightBold: o.fontWeightBold, allowTransparency: o.allowTransparency, drawBoldTextInBrightColors: o.drawBoldTextInBrightColors, minimumContrastRatio: o.minimumContrastRatio, colors: h };
        }, t2.configEquals = function(e3, t3) {
          for (let i3 = 0; i3 < e3.colors.ansi.length; i3++) if (e3.colors.ansi[i3].rgba !== t3.colors.ansi[i3].rgba) return false;
          return e3.devicePixelRatio === t3.devicePixelRatio && e3.customGlyphs === t3.customGlyphs && e3.lineHeight === t3.lineHeight && e3.letterSpacing === t3.letterSpacing && e3.fontFamily === t3.fontFamily && e3.fontSize === t3.fontSize && e3.fontWeight === t3.fontWeight && e3.fontWeightBold === t3.fontWeightBold && e3.allowTransparency === t3.allowTransparency && e3.deviceCharWidth === t3.deviceCharWidth && e3.deviceCharHeight === t3.deviceCharHeight && e3.drawBoldTextInBrightColors === t3.drawBoldTextInBrightColors && e3.minimumContrastRatio === t3.minimumContrastRatio && e3.colors.foreground.rgba === t3.colors.foreground.rgba && e3.colors.background.rgba === t3.colors.background.rgba;
        }, t2.is256Color = function(e3) {
          return 16777216 == (50331648 & e3) || 33554432 == (50331648 & e3);
        };
      }, 237: (e2, t2, i2) => {
        Object.defineProperty(t2, "__esModule", { value: true }), t2.TEXT_BASELINE = t2.DIM_OPACITY = t2.INVERTED_DEFAULT_COLOR = void 0;
        const s2 = i2(399);
        t2.INVERTED_DEFAULT_COLOR = 257, t2.DIM_OPACITY = 0.5, t2.TEXT_BASELINE = s2.isFirefox || s2.isLegacyEdge ? "bottom" : "ideographic";
      }, 457: (e2, t2) => {
        Object.defineProperty(t2, "__esModule", { value: true }), t2.CursorBlinkStateManager = void 0;
        t2.CursorBlinkStateManager = class {
          constructor(e3, t3) {
            this._renderCallback = e3, this._coreBrowserService = t3, this.isCursorVisible = true, this._coreBrowserService.isFocused && this._restartInterval();
          }
          get isPaused() {
            return !(this._blinkStartTimeout || this._blinkInterval);
          }
          dispose() {
            this._blinkInterval && (this._coreBrowserService.window.clearInterval(this._blinkInterval), this._blinkInterval = void 0), this._blinkStartTimeout && (this._coreBrowserService.window.clearTimeout(this._blinkStartTimeout), this._blinkStartTimeout = void 0), this._animationFrame && (this._coreBrowserService.window.cancelAnimationFrame(this._animationFrame), this._animationFrame = void 0);
          }
          restartBlinkAnimation() {
            this.isPaused || (this._animationTimeRestarted = Date.now(), this.isCursorVisible = true, this._animationFrame || (this._animationFrame = this._coreBrowserService.window.requestAnimationFrame(() => {
              this._renderCallback(), this._animationFrame = void 0;
            })));
          }
          _restartInterval(e3 = 600) {
            this._blinkInterval && (this._coreBrowserService.window.clearInterval(this._blinkInterval), this._blinkInterval = void 0), this._blinkStartTimeout = this._coreBrowserService.window.setTimeout(() => {
              if (this._animationTimeRestarted) {
                const e4 = 600 - (Date.now() - this._animationTimeRestarted);
                if (this._animationTimeRestarted = void 0, e4 > 0) return void this._restartInterval(e4);
              }
              this.isCursorVisible = false, this._animationFrame = this._coreBrowserService.window.requestAnimationFrame(() => {
                this._renderCallback(), this._animationFrame = void 0;
              }), this._blinkInterval = this._coreBrowserService.window.setInterval(() => {
                if (this._animationTimeRestarted) {
                  const e4 = 600 - (Date.now() - this._animationTimeRestarted);
                  return this._animationTimeRestarted = void 0, void this._restartInterval(e4);
                }
                this.isCursorVisible = !this.isCursorVisible, this._animationFrame = this._coreBrowserService.window.requestAnimationFrame(() => {
                  this._renderCallback(), this._animationFrame = void 0;
                });
              }, 600);
            }, e3);
          }
          pause() {
            this.isCursorVisible = true, this._blinkInterval && (this._coreBrowserService.window.clearInterval(this._blinkInterval), this._blinkInterval = void 0), this._blinkStartTimeout && (this._coreBrowserService.window.clearTimeout(this._blinkStartTimeout), this._blinkStartTimeout = void 0), this._animationFrame && (this._coreBrowserService.window.cancelAnimationFrame(this._animationFrame), this._animationFrame = void 0);
          }
          resume() {
            this.pause(), this._animationTimeRestarted = void 0, this._restartInterval(), this.restartBlinkAnimation();
          }
        };
      }, 860: (e2, t2, i2) => {
        Object.defineProperty(t2, "__esModule", { value: true }), t2.tryDrawCustomChar = t2.powerlineDefinitions = t2.boxDrawingDefinitions = t2.blockElementDefinitions = void 0;
        const s2 = i2(374);
        t2.blockElementDefinitions = { "▀": [{ x: 0, y: 0, w: 8, h: 4 }], "▁": [{ x: 0, y: 7, w: 8, h: 1 }], "▂": [{ x: 0, y: 6, w: 8, h: 2 }], "▃": [{ x: 0, y: 5, w: 8, h: 3 }], "▄": [{ x: 0, y: 4, w: 8, h: 4 }], "▅": [{ x: 0, y: 3, w: 8, h: 5 }], "▆": [{ x: 0, y: 2, w: 8, h: 6 }], "▇": [{ x: 0, y: 1, w: 8, h: 7 }], "█": [{ x: 0, y: 0, w: 8, h: 8 }], "▉": [{ x: 0, y: 0, w: 7, h: 8 }], "▊": [{ x: 0, y: 0, w: 6, h: 8 }], "▋": [{ x: 0, y: 0, w: 5, h: 8 }], "▌": [{ x: 0, y: 0, w: 4, h: 8 }], "▍": [{ x: 0, y: 0, w: 3, h: 8 }], "▎": [{ x: 0, y: 0, w: 2, h: 8 }], "▏": [{ x: 0, y: 0, w: 1, h: 8 }], "▐": [{ x: 4, y: 0, w: 4, h: 8 }], "▔": [{ x: 0, y: 0, w: 8, h: 1 }], "▕": [{ x: 7, y: 0, w: 1, h: 8 }], "▖": [{ x: 0, y: 4, w: 4, h: 4 }], "▗": [{ x: 4, y: 4, w: 4, h: 4 }], "▘": [{ x: 0, y: 0, w: 4, h: 4 }], "▙": [{ x: 0, y: 0, w: 4, h: 8 }, { x: 0, y: 4, w: 8, h: 4 }], "▚": [{ x: 0, y: 0, w: 4, h: 4 }, { x: 4, y: 4, w: 4, h: 4 }], "▛": [{ x: 0, y: 0, w: 4, h: 8 }, { x: 4, y: 0, w: 4, h: 4 }], "▜": [{ x: 0, y: 0, w: 8, h: 4 }, { x: 4, y: 0, w: 4, h: 8 }], "▝": [{ x: 4, y: 0, w: 4, h: 4 }], "▞": [{ x: 4, y: 0, w: 4, h: 4 }, { x: 0, y: 4, w: 4, h: 4 }], "▟": [{ x: 4, y: 0, w: 4, h: 8 }, { x: 0, y: 4, w: 8, h: 4 }], "🭰": [{ x: 1, y: 0, w: 1, h: 8 }], "🭱": [{ x: 2, y: 0, w: 1, h: 8 }], "🭲": [{ x: 3, y: 0, w: 1, h: 8 }], "🭳": [{ x: 4, y: 0, w: 1, h: 8 }], "🭴": [{ x: 5, y: 0, w: 1, h: 8 }], "🭵": [{ x: 6, y: 0, w: 1, h: 8 }], "🭶": [{ x: 0, y: 1, w: 8, h: 1 }], "🭷": [{ x: 0, y: 2, w: 8, h: 1 }], "🭸": [{ x: 0, y: 3, w: 8, h: 1 }], "🭹": [{ x: 0, y: 4, w: 8, h: 1 }], "🭺": [{ x: 0, y: 5, w: 8, h: 1 }], "🭻": [{ x: 0, y: 6, w: 8, h: 1 }], "🭼": [{ x: 0, y: 0, w: 1, h: 8 }, { x: 0, y: 7, w: 8, h: 1 }], "🭽": [{ x: 0, y: 0, w: 1, h: 8 }, { x: 0, y: 0, w: 8, h: 1 }], "🭾": [{ x: 7, y: 0, w: 1, h: 8 }, { x: 0, y: 0, w: 8, h: 1 }], "🭿": [{ x: 7, y: 0, w: 1, h: 8 }, { x: 0, y: 7, w: 8, h: 1 }], "🮀": [{ x: 0, y: 0, w: 8, h: 1 }, { x: 0, y: 7, w: 8, h: 1 }], "🮁": [{ x: 0, y: 0, w: 8, h: 1 }, { x: 0, y: 2, w: 8, h: 1 }, { x: 0, y: 4, w: 8, h: 1 }, { x: 0, y: 7, w: 8, h: 1 }], "🮂": [{ x: 0, y: 0, w: 8, h: 2 }], "🮃": [{ x: 0, y: 0, w: 8, h: 3 }], "🮄": [{ x: 0, y: 0, w: 8, h: 5 }], "🮅": [{ x: 0, y: 0, w: 8, h: 6 }], "🮆": [{ x: 0, y: 0, w: 8, h: 7 }], "🮇": [{ x: 6, y: 0, w: 2, h: 8 }], "🮈": [{ x: 5, y: 0, w: 3, h: 8 }], "🮉": [{ x: 3, y: 0, w: 5, h: 8 }], "🮊": [{ x: 2, y: 0, w: 6, h: 8 }], "🮋": [{ x: 1, y: 0, w: 7, h: 8 }], "🮕": [{ x: 0, y: 0, w: 2, h: 2 }, { x: 4, y: 0, w: 2, h: 2 }, { x: 2, y: 2, w: 2, h: 2 }, { x: 6, y: 2, w: 2, h: 2 }, { x: 0, y: 4, w: 2, h: 2 }, { x: 4, y: 4, w: 2, h: 2 }, { x: 2, y: 6, w: 2, h: 2 }, { x: 6, y: 6, w: 2, h: 2 }], "🮖": [{ x: 2, y: 0, w: 2, h: 2 }, { x: 6, y: 0, w: 2, h: 2 }, { x: 0, y: 2, w: 2, h: 2 }, { x: 4, y: 2, w: 2, h: 2 }, { x: 2, y: 4, w: 2, h: 2 }, { x: 6, y: 4, w: 2, h: 2 }, { x: 0, y: 6, w: 2, h: 2 }, { x: 4, y: 6, w: 2, h: 2 }], "🮗": [{ x: 0, y: 2, w: 8, h: 2 }, { x: 0, y: 6, w: 8, h: 2 }] };
        const r = { "░": [[1, 0, 0, 0], [0, 0, 0, 0], [0, 0, 1, 0], [0, 0, 0, 0]], "▒": [[1, 0], [0, 0], [0, 1], [0, 0]], "▓": [[0, 1], [1, 1], [1, 0], [1, 1]] };
        t2.boxDrawingDefinitions = { "─": { 1: "M0,.5 L1,.5" }, "━": { 3: "M0,.5 L1,.5" }, "│": { 1: "M.5,0 L.5,1" }, "┃": { 3: "M.5,0 L.5,1" }, "┌": { 1: "M0.5,1 L.5,.5 L1,.5" }, "┏": { 3: "M0.5,1 L.5,.5 L1,.5" }, "┐": { 1: "M0,.5 L.5,.5 L.5,1" }, "┓": { 3: "M0,.5 L.5,.5 L.5,1" }, "└": { 1: "M.5,0 L.5,.5 L1,.5" }, "┗": { 3: "M.5,0 L.5,.5 L1,.5" }, "┘": { 1: "M.5,0 L.5,.5 L0,.5" }, "┛": { 3: "M.5,0 L.5,.5 L0,.5" }, "├": { 1: "M.5,0 L.5,1 M.5,.5 L1,.5" }, "┣": { 3: "M.5,0 L.5,1 M.5,.5 L1,.5" }, "┤": { 1: "M.5,0 L.5,1 M.5,.5 L0,.5" }, "┫": { 3: "M.5,0 L.5,1 M.5,.5 L0,.5" }, "┬": { 1: "M0,.5 L1,.5 M.5,.5 L.5,1" }, "┳": { 3: "M0,.5 L1,.5 M.5,.5 L.5,1" }, "┴": { 1: "M0,.5 L1,.5 M.5,.5 L.5,0" }, "┻": { 3: "M0,.5 L1,.5 M.5,.5 L.5,0" }, "┼": { 1: "M0,.5 L1,.5 M.5,0 L.5,1" }, "╋": { 3: "M0,.5 L1,.5 M.5,0 L.5,1" }, "╴": { 1: "M.5,.5 L0,.5" }, "╸": { 3: "M.5,.5 L0,.5" }, "╵": { 1: "M.5,.5 L.5,0" }, "╹": { 3: "M.5,.5 L.5,0" }, "╶": { 1: "M.5,.5 L1,.5" }, "╺": { 3: "M.5,.5 L1,.5" }, "╷": { 1: "M.5,.5 L.5,1" }, "╻": { 3: "M.5,.5 L.5,1" }, "═": { 1: (e3, t3) => `M0,${0.5 - t3} L1,${0.5 - t3} M0,${0.5 + t3} L1,${0.5 + t3}` }, "║": { 1: (e3, t3) => `M${0.5 - e3},0 L${0.5 - e3},1 M${0.5 + e3},0 L${0.5 + e3},1` }, "╒": { 1: (e3, t3) => `M.5,1 L.5,${0.5 - t3} L1,${0.5 - t3} M.5,${0.5 + t3} L1,${0.5 + t3}` }, "╓": { 1: (e3, t3) => `M${0.5 - e3},1 L${0.5 - e3},.5 L1,.5 M${0.5 + e3},.5 L${0.5 + e3},1` }, "╔": { 1: (e3, t3) => `M1,${0.5 - t3} L${0.5 - e3},${0.5 - t3} L${0.5 - e3},1 M1,${0.5 + t3} L${0.5 + e3},${0.5 + t3} L${0.5 + e3},1` }, "╕": { 1: (e3, t3) => `M0,${0.5 - t3} L.5,${0.5 - t3} L.5,1 M0,${0.5 + t3} L.5,${0.5 + t3}` }, "╖": { 1: (e3, t3) => `M${0.5 + e3},1 L${0.5 + e3},.5 L0,.5 M${0.5 - e3},.5 L${0.5 - e3},1` }, "╗": { 1: (e3, t3) => `M0,${0.5 + t3} L${0.5 - e3},${0.5 + t3} L${0.5 - e3},1 M0,${0.5 - t3} L${0.5 + e3},${0.5 - t3} L${0.5 + e3},1` }, "╘": { 1: (e3, t3) => `M.5,0 L.5,${0.5 + t3} L1,${0.5 + t3} M.5,${0.5 - t3} L1,${0.5 - t3}` }, "╙": { 1: (e3, t3) => `M1,.5 L${0.5 - e3},.5 L${0.5 - e3},0 M${0.5 + e3},.5 L${0.5 + e3},0` }, "╚": { 1: (e3, t3) => `M1,${0.5 - t3} L${0.5 + e3},${0.5 - t3} L${0.5 + e3},0 M1,${0.5 + t3} L${0.5 - e3},${0.5 + t3} L${0.5 - e3},0` }, "╛": { 1: (e3, t3) => `M0,${0.5 + t3} L.5,${0.5 + t3} L.5,0 M0,${0.5 - t3} L.5,${0.5 - t3}` }, "╜": { 1: (e3, t3) => `M0,.5 L${0.5 + e3},.5 L${0.5 + e3},0 M${0.5 - e3},.5 L${0.5 - e3},0` }, "╝": { 1: (e3, t3) => `M0,${0.5 - t3} L${0.5 - e3},${0.5 - t3} L${0.5 - e3},0 M0,${0.5 + t3} L${0.5 + e3},${0.5 + t3} L${0.5 + e3},0` }, "╞": { 1: (e3, t3) => `M.5,0 L.5,1 M.5,${0.5 - t3} L1,${0.5 - t3} M.5,${0.5 + t3} L1,${0.5 + t3}` }, "╟": { 1: (e3, t3) => `M${0.5 - e3},0 L${0.5 - e3},1 M${0.5 + e3},0 L${0.5 + e3},1 M${0.5 + e3},.5 L1,.5` }, "╠": { 1: (e3, t3) => `M${0.5 - e3},0 L${0.5 - e3},1 M1,${0.5 + t3} L${0.5 + e3},${0.5 + t3} L${0.5 + e3},1 M1,${0.5 - t3} L${0.5 + e3},${0.5 - t3} L${0.5 + e3},0` }, "╡": { 1: (e3, t3) => `M.5,0 L.5,1 M0,${0.5 - t3} L.5,${0.5 - t3} M0,${0.5 + t3} L.5,${0.5 + t3}` }, "╢": { 1: (e3, t3) => `M0,.5 L${0.5 - e3},.5 M${0.5 - e3},0 L${0.5 - e3},1 M${0.5 + e3},0 L${0.5 + e3},1` }, "╣": { 1: (e3, t3) => `M${0.5 + e3},0 L${0.5 + e3},1 M0,${0.5 + t3} L${0.5 - e3},${0.5 + t3} L${0.5 - e3},1 M0,${0.5 - t3} L${0.5 - e3},${0.5 - t3} L${0.5 - e3},0` }, "╤": { 1: (e3, t3) => `M0,${0.5 - t3} L1,${0.5 - t3} M0,${0.5 + t3} L1,${0.5 + t3} M.5,${0.5 + t3} L.5,1` }, "╥": { 1: (e3, t3) => `M0,.5 L1,.5 M${0.5 - e3},.5 L${0.5 - e3},1 M${0.5 + e3},.5 L${0.5 + e3},1` }, "╦": { 1: (e3, t3) => `M0,${0.5 - t3} L1,${0.5 - t3} M0,${0.5 + t3} L${0.5 - e3},${0.5 + t3} L${0.5 - e3},1 M1,${0.5 + t3} L${0.5 + e3},${0.5 + t3} L${0.5 + e3},1` }, "╧": { 1: (e3, t3) => `M.5,0 L.5,${0.5 - t3} M0,${0.5 - t3} L1,${0.5 - t3} M0,${0.5 + t3} L1,${0.5 + t3}` }, "╨": { 1: (e3, t3) => `M0,.5 L1,.5 M${0.5 - e3},.5 L${0.5 - e3},0 M${0.5 + e3},.5 L${0.5 + e3},0` }, "╩": { 1: (e3, t3) => `M0,${0.5 + t3} L1,${0.5 + t3} M0,${0.5 - t3} L${0.5 - e3},${0.5 - t3} L${0.5 - e3},0 M1,${0.5 - t3} L${0.5 + e3},${0.5 - t3} L${0.5 + e3},0` }, "╪": { 1: (e3, t3) => `M.5,0 L.5,1 M0,${0.5 - t3} L1,${0.5 - t3} M0,${0.5 + t3} L1,${0.5 + t3}` }, "╫": { 1: (e3, t3) => `M0,.5 L1,.5 M${0.5 - e3},0 L${0.5 - e3},1 M${0.5 + e3},0 L${0.5 + e3},1` }, "╬": { 1: (e3, t3) => `M0,${0.5 + t3} L${0.5 - e3},${0.5 + t3} L${0.5 - e3},1 M1,${0.5 + t3} L${0.5 + e3},${0.5 + t3} L${0.5 + e3},1 M0,${0.5 - t3} L${0.5 - e3},${0.5 - t3} L${0.5 - e3},0 M1,${0.5 - t3} L${0.5 + e3},${0.5 - t3} L${0.5 + e3},0` }, "╱": { 1: "M1,0 L0,1" }, "╲": { 1: "M0,0 L1,1" }, "╳": { 1: "M1,0 L0,1 M0,0 L1,1" }, "╼": { 1: "M.5,.5 L0,.5", 3: "M.5,.5 L1,.5" }, "╽": { 1: "M.5,.5 L.5,0", 3: "M.5,.5 L.5,1" }, "╾": { 1: "M.5,.5 L1,.5", 3: "M.5,.5 L0,.5" }, "╿": { 1: "M.5,.5 L.5,1", 3: "M.5,.5 L.5,0" }, "┍": { 1: "M.5,.5 L.5,1", 3: "M.5,.5 L1,.5" }, "┎": { 1: "M.5,.5 L1,.5", 3: "M.5,.5 L.5,1" }, "┑": { 1: "M.5,.5 L.5,1", 3: "M.5,.5 L0,.5" }, "┒": { 1: "M.5,.5 L0,.5", 3: "M.5,.5 L.5,1" }, "┕": { 1: "M.5,.5 L.5,0", 3: "M.5,.5 L1,.5" }, "┖": { 1: "M.5,.5 L1,.5", 3: "M.5,.5 L.5,0" }, "┙": { 1: "M.5,.5 L.5,0", 3: "M.5,.5 L0,.5" }, "┚": { 1: "M.5,.5 L0,.5", 3: "M.5,.5 L.5,0" }, "┝": { 1: "M.5,0 L.5,1", 3: "M.5,.5 L1,.5" }, "┞": { 1: "M0.5,1 L.5,.5 L1,.5", 3: "M.5,.5 L.5,0" }, "┟": { 1: "M.5,0 L.5,.5 L1,.5", 3: "M.5,.5 L.5,1" }, "┠": { 1: "M.5,.5 L1,.5", 3: "M.5,0 L.5,1" }, "┡": { 1: "M.5,.5 L.5,1", 3: "M.5,0 L.5,.5 L1,.5" }, "┢": { 1: "M.5,.5 L.5,0", 3: "M0.5,1 L.5,.5 L1,.5" }, "┥": { 1: "M.5,0 L.5,1", 3: "M.5,.5 L0,.5" }, "┦": { 1: "M0,.5 L.5,.5 L.5,1", 3: "M.5,.5 L.5,0" }, "┧": { 1: "M.5,0 L.5,.5 L0,.5", 3: "M.5,.5 L.5,1" }, "┨": { 1: "M.5,.5 L0,.5", 3: "M.5,0 L.5,1" }, "┩": { 1: "M.5,.5 L.5,1", 3: "M.5,0 L.5,.5 L0,.5" }, "┪": { 1: "M.5,.5 L.5,0", 3: "M0,.5 L.5,.5 L.5,1" }, "┭": { 1: "M0.5,1 L.5,.5 L1,.5", 3: "M.5,.5 L0,.5" }, "┮": { 1: "M0,.5 L.5,.5 L.5,1", 3: "M.5,.5 L1,.5" }, "┯": { 1: "M.5,.5 L.5,1", 3: "M0,.5 L1,.5" }, "┰": { 1: "M0,.5 L1,.5", 3: "M.5,.5 L.5,1" }, "┱": { 1: "M.5,.5 L1,.5", 3: "M0,.5 L.5,.5 L.5,1" }, "┲": { 1: "M.5,.5 L0,.5", 3: "M0.5,1 L.5,.5 L1,.5" }, "┵": { 1: "M.5,0 L.5,.5 L1,.5", 3: "M.5,.5 L0,.5" }, "┶": { 1: "M.5,0 L.5,.5 L0,.5", 3: "M.5,.5 L1,.5" }, "┷": { 1: "M.5,.5 L.5,0", 3: "M0,.5 L1,.5" }, "┸": { 1: "M0,.5 L1,.5", 3: "M.5,.5 L.5,0" }, "┹": { 1: "M.5,.5 L1,.5", 3: "M.5,0 L.5,.5 L0,.5" }, "┺": { 1: "M.5,.5 L0,.5", 3: "M.5,0 L.5,.5 L1,.5" }, "┽": { 1: "M.5,0 L.5,1 M.5,.5 L1,.5", 3: "M.5,.5 L0,.5" }, "┾": { 1: "M.5,0 L.5,1 M.5,.5 L0,.5", 3: "M.5,.5 L1,.5" }, "┿": { 1: "M.5,0 L.5,1", 3: "M0,.5 L1,.5" }, "╀": { 1: "M0,.5 L1,.5 M.5,.5 L.5,1", 3: "M.5,.5 L.5,0" }, "╁": { 1: "M.5,.5 L.5,0 M0,.5 L1,.5", 3: "M.5,.5 L.5,1" }, "╂": { 1: "M0,.5 L1,.5", 3: "M.5,0 L.5,1" }, "╃": { 1: "M0.5,1 L.5,.5 L1,.5", 3: "M.5,0 L.5,.5 L0,.5" }, "╄": { 1: "M0,.5 L.5,.5 L.5,1", 3: "M.5,0 L.5,.5 L1,.5" }, "╅": { 1: "M.5,0 L.5,.5 L1,.5", 3: "M0,.5 L.5,.5 L.5,1" }, "╆": { 1: "M.5,0 L.5,.5 L0,.5", 3: "M0.5,1 L.5,.5 L1,.5" }, "╇": { 1: "M.5,.5 L.5,1", 3: "M.5,.5 L.5,0 M0,.5 L1,.5" }, "╈": { 1: "M.5,.5 L.5,0", 3: "M0,.5 L1,.5 M.5,.5 L.5,1" }, "╉": { 1: "M.5,.5 L1,.5", 3: "M.5,0 L.5,1 M.5,.5 L0,.5" }, "╊": { 1: "M.5,.5 L0,.5", 3: "M.5,0 L.5,1 M.5,.5 L1,.5" }, "╌": { 1: "M.1,.5 L.4,.5 M.6,.5 L.9,.5" }, "╍": { 3: "M.1,.5 L.4,.5 M.6,.5 L.9,.5" }, "┄": { 1: "M.0667,.5 L.2667,.5 M.4,.5 L.6,.5 M.7333,.5 L.9333,.5" }, "┅": { 3: "M.0667,.5 L.2667,.5 M.4,.5 L.6,.5 M.7333,.5 L.9333,.5" }, "┈": { 1: "M.05,.5 L.2,.5 M.3,.5 L.45,.5 M.55,.5 L.7,.5 M.8,.5 L.95,.5" }, "┉": { 3: "M.05,.5 L.2,.5 M.3,.5 L.45,.5 M.55,.5 L.7,.5 M.8,.5 L.95,.5" }, "╎": { 1: "M.5,.1 L.5,.4 M.5,.6 L.5,.9" }, "╏": { 3: "M.5,.1 L.5,.4 M.5,.6 L.5,.9" }, "┆": { 1: "M.5,.0667 L.5,.2667 M.5,.4 L.5,.6 M.5,.7333 L.5,.9333" }, "┇": { 3: "M.5,.0667 L.5,.2667 M.5,.4 L.5,.6 M.5,.7333 L.5,.9333" }, "┊": { 1: "M.5,.05 L.5,.2 M.5,.3 L.5,.45 L.5,.55 M.5,.7 L.5,.95" }, "┋": { 3: "M.5,.05 L.5,.2 M.5,.3 L.5,.45 L.5,.55 M.5,.7 L.5,.95" }, "╭": { 1: (e3, t3) => `M.5,1 L.5,${0.5 + t3 / 0.15 * 0.5} C.5,${0.5 + t3 / 0.15 * 0.5},.5,.5,1,.5` }, "╮": { 1: (e3, t3) => `M.5,1 L.5,${0.5 + t3 / 0.15 * 0.5} C.5,${0.5 + t3 / 0.15 * 0.5},.5,.5,0,.5` }, "╯": { 1: (e3, t3) => `M.5,0 L.5,${0.5 - t3 / 0.15 * 0.5} C.5,${0.5 - t3 / 0.15 * 0.5},.5,.5,0,.5` }, "╰": { 1: (e3, t3) => `M.5,0 L.5,${0.5 - t3 / 0.15 * 0.5} C.5,${0.5 - t3 / 0.15 * 0.5},.5,.5,1,.5` } }, t2.powerlineDefinitions = { "": { d: "M0,0 L1,.5 L0,1", type: 0, rightPadding: 2 }, "": { d: "M-1,-.5 L1,.5 L-1,1.5", type: 1, leftPadding: 1, rightPadding: 1 }, "": { d: "M1,0 L0,.5 L1,1", type: 0, leftPadding: 2 }, "": { d: "M2,-.5 L0,.5 L2,1.5", type: 1, leftPadding: 1, rightPadding: 1 }, "": { d: "M0,0 L0,1 C0.552,1,1,0.776,1,.5 C1,0.224,0.552,0,0,0", type: 0, rightPadding: 1 }, "": { d: "M.2,1 C.422,1,.8,.826,.78,.5 C.8,.174,0.422,0,.2,0", type: 1, rightPadding: 1 }, "": { d: "M1,0 L1,1 C0.448,1,0,0.776,0,.5 C0,0.224,0.448,0,1,0", type: 0, leftPadding: 1 }, "": { d: "M.8,1 C0.578,1,0.2,.826,.22,.5 C0.2,0.174,0.578,0,0.8,0", type: 1, leftPadding: 1 }, "": { d: "M-.5,-.5 L1.5,1.5 L-.5,1.5", type: 0 }, "": { d: "M-.5,-.5 L1.5,1.5", type: 1, leftPadding: 1, rightPadding: 1 }, "": { d: "M1.5,-.5 L-.5,1.5 L1.5,1.5", type: 0 }, "": { d: "M1.5,-.5 L-.5,1.5 L-.5,-.5", type: 0 }, "": { d: "M1.5,-.5 L-.5,1.5", type: 1, leftPadding: 1, rightPadding: 1 }, "": { d: "M-.5,-.5 L1.5,1.5 L1.5,-.5", type: 0 } }, t2.powerlineDefinitions[""] = t2.powerlineDefinitions[""], t2.powerlineDefinitions[""] = t2.powerlineDefinitions[""], t2.tryDrawCustomChar = function(e3, i3, n2, l, c, d, _, u) {
          const g = t2.blockElementDefinitions[i3];
          if (g) return function(e4, t3, i4, s3, r2, o2) {
            for (let n3 = 0; n3 < t3.length; n3++) {
              const a2 = t3[n3], h2 = r2 / 8, l2 = o2 / 8;
              e4.fillRect(i4 + a2.x * h2, s3 + a2.y * l2, a2.w * h2, a2.h * l2);
            }
          }(e3, g, n2, l, c, d), true;
          const v = r[i3];
          if (v) return function(e4, t3, i4, r2, n3, a2) {
            let h2 = o.get(t3);
            h2 || (h2 = /* @__PURE__ */ new Map(), o.set(t3, h2));
            const l2 = e4.fillStyle;
            if ("string" != typeof l2) throw new Error(`Unexpected fillStyle type "${l2}"`);
            let c2 = h2.get(l2);
            if (!c2) {
              const i5 = t3[0].length, r3 = t3.length, o2 = e4.canvas.ownerDocument.createElement("canvas");
              o2.width = i5, o2.height = r3;
              const n4 = (0, s2.throwIfFalsy)(o2.getContext("2d")), a3 = new ImageData(i5, r3);
              let d2, _2, u2, g2;
              if (l2.startsWith("#")) d2 = parseInt(l2.slice(1, 3), 16), _2 = parseInt(l2.slice(3, 5), 16), u2 = parseInt(l2.slice(5, 7), 16), g2 = l2.length > 7 && parseInt(l2.slice(7, 9), 16) || 1;
              else {
                if (!l2.startsWith("rgba")) throw new Error(`Unexpected fillStyle color format "${l2}" when drawing pattern glyph`);
                [d2, _2, u2, g2] = l2.substring(5, l2.length - 1).split(",").map((e5) => parseFloat(e5));
              }
              for (let e5 = 0; e5 < r3; e5++) for (let s3 = 0; s3 < i5; s3++) a3.data[4 * (e5 * i5 + s3)] = d2, a3.data[4 * (e5 * i5 + s3) + 1] = _2, a3.data[4 * (e5 * i5 + s3) + 2] = u2, a3.data[4 * (e5 * i5 + s3) + 3] = t3[e5][s3] * (255 * g2);
              n4.putImageData(a3, 0, 0), c2 = (0, s2.throwIfFalsy)(e4.createPattern(o2, null)), h2.set(l2, c2);
            }
            e4.fillStyle = c2, e4.fillRect(i4, r2, n3, a2);
          }(e3, v, n2, l, c, d), true;
          const f = t2.boxDrawingDefinitions[i3];
          if (f) return function(e4, t3, i4, s3, r2, o2, n3) {
            e4.strokeStyle = e4.fillStyle;
            for (const [l2, c2] of Object.entries(t3)) {
              let t4;
              e4.beginPath(), e4.lineWidth = n3 * Number.parseInt(l2), t4 = "function" == typeof c2 ? c2(0.15, 0.15 / o2 * r2) : c2;
              for (const l3 of t4.split(" ")) {
                const t5 = l3[0], c3 = a[t5];
                if (!c3) {
                  console.error(`Could not find drawing instructions for "${t5}"`);
                  continue;
                }
                const d2 = l3.substring(1).split(",");
                d2[0] && d2[1] && c3(e4, h(d2, r2, o2, i4, s3, true, n3));
              }
              e4.stroke(), e4.closePath();
            }
          }(e3, f, n2, l, c, d, u), true;
          const p = t2.powerlineDefinitions[i3];
          return !!p && (function(e4, t3, i4, s3, r2, o2, n3, l2) {
            const c2 = new Path2D();
            c2.rect(i4, s3, r2, o2), e4.clip(c2), e4.beginPath();
            const d2 = n3 / 12;
            e4.lineWidth = l2 * d2;
            for (const n4 of t3.d.split(" ")) {
              const c3 = n4[0], _2 = a[c3];
              if (!_2) {
                console.error(`Could not find drawing instructions for "${c3}"`);
                continue;
              }
              const u2 = n4.substring(1).split(",");
              u2[0] && u2[1] && _2(e4, h(u2, r2, o2, i4, s3, false, l2, (t3.leftPadding ?? 0) * (d2 / 2), (t3.rightPadding ?? 0) * (d2 / 2)));
            }
            1 === t3.type ? (e4.strokeStyle = e4.fillStyle, e4.stroke()) : e4.fill(), e4.closePath();
          }(e3, p, n2, l, c, d, _, u), true);
        };
        const o = /* @__PURE__ */ new Map();
        function n(e3, t3, i3 = 0) {
          return Math.max(Math.min(e3, t3), i3);
        }
        const a = { C: (e3, t3) => e3.bezierCurveTo(t3[0], t3[1], t3[2], t3[3], t3[4], t3[5]), L: (e3, t3) => e3.lineTo(t3[0], t3[1]), M: (e3, t3) => e3.moveTo(t3[0], t3[1]) };
        function h(e3, t3, i3, s3, r2, o2, a2, h2 = 0, l = 0) {
          const c = e3.map((e4) => parseFloat(e4) || parseInt(e4));
          if (c.length < 2) throw new Error("Too few arguments for instruction");
          for (let e4 = 0; e4 < c.length; e4 += 2) c[e4] *= t3 - h2 * a2 - l * a2, o2 && 0 !== c[e4] && (c[e4] = n(Math.round(c[e4] + 0.5) - 0.5, t3, 0)), c[e4] += s3 + h2 * a2;
          for (let e4 = 1; e4 < c.length; e4 += 2) c[e4] *= i3, o2 && 0 !== c[e4] && (c[e4] = n(Math.round(c[e4] + 0.5) - 0.5, i3, 0)), c[e4] += r2;
          return c;
        }
      }, 56: (e2, t2, i2) => {
        Object.defineProperty(t2, "__esModule", { value: true }), t2.observeDevicePixelDimensions = void 0;
        const s2 = i2(859);
        t2.observeDevicePixelDimensions = function(e3, t3, i3) {
          let r = new t3.ResizeObserver((t4) => {
            const s3 = t4.find((t5) => t5.target === e3);
            if (!s3) return;
            if (!("devicePixelContentBoxSize" in s3)) return r == null ? void 0 : r.disconnect(), void (r = void 0);
            const o = s3.devicePixelContentBoxSize[0].inlineSize, n = s3.devicePixelContentBoxSize[0].blockSize;
            o > 0 && n > 0 && i3(o, n);
          });
          try {
            r.observe(e3, { box: ["device-pixel-content-box"] });
          } catch {
            r.disconnect(), r = void 0;
          }
          return (0, s2.toDisposable)(() => r == null ? void 0 : r.disconnect());
        };
      }, 374: (e2, t2) => {
        function i2(e3) {
          return 57508 <= e3 && e3 <= 57558;
        }
        function s2(e3) {
          return e3 >= 128512 && e3 <= 128591 || e3 >= 127744 && e3 <= 128511 || e3 >= 128640 && e3 <= 128767 || e3 >= 9728 && e3 <= 9983 || e3 >= 9984 && e3 <= 10175 || e3 >= 65024 && e3 <= 65039 || e3 >= 129280 && e3 <= 129535 || e3 >= 127462 && e3 <= 127487;
        }
        Object.defineProperty(t2, "__esModule", { value: true }), t2.computeNextVariantOffset = t2.createRenderDimensions = t2.treatGlyphAsBackgroundColor = t2.allowRescaling = t2.isEmoji = t2.isRestrictedPowerlineGlyph = t2.isPowerlineGlyph = t2.throwIfFalsy = void 0, t2.throwIfFalsy = function(e3) {
          if (!e3) throw new Error("value must not be falsy");
          return e3;
        }, t2.isPowerlineGlyph = i2, t2.isRestrictedPowerlineGlyph = function(e3) {
          return 57520 <= e3 && e3 <= 57527;
        }, t2.isEmoji = s2, t2.allowRescaling = function(e3, t3, r, o) {
          return 1 === t3 && r > Math.ceil(1.5 * o) && void 0 !== e3 && e3 > 255 && !s2(e3) && !i2(e3) && !function(e4) {
            return 57344 <= e4 && e4 <= 63743;
          }(e3);
        }, t2.treatGlyphAsBackgroundColor = function(e3) {
          return i2(e3) || function(e4) {
            return 9472 <= e4 && e4 <= 9631;
          }(e3);
        }, t2.createRenderDimensions = function() {
          return { css: { canvas: { width: 0, height: 0 }, cell: { width: 0, height: 0 } }, device: { canvas: { width: 0, height: 0 }, cell: { width: 0, height: 0 }, char: { width: 0, height: 0, left: 0, top: 0 } } };
        }, t2.computeNextVariantOffset = function(e3, t3, i3 = 0) {
          return (e3 - (2 * Math.round(t3) - i3)) % (2 * Math.round(t3));
        };
      }, 296: (e2, t2) => {
        Object.defineProperty(t2, "__esModule", { value: true }), t2.createSelectionRenderModel = void 0;
        class i2 {
          constructor() {
            this.clear();
          }
          clear() {
            this.hasSelection = false, this.columnSelectMode = false, this.viewportStartRow = 0, this.viewportEndRow = 0, this.viewportCappedStartRow = 0, this.viewportCappedEndRow = 0, this.startCol = 0, this.endCol = 0, this.selectionStart = void 0, this.selectionEnd = void 0;
          }
          update(e3, t3, i3, s2 = false) {
            if (this.selectionStart = t3, this.selectionEnd = i3, !t3 || !i3 || t3[0] === i3[0] && t3[1] === i3[1]) return void this.clear();
            const r = e3.buffers.active.ydisp, o = t3[1] - r, n = i3[1] - r, a = Math.max(o, 0), h = Math.min(n, e3.rows - 1);
            a >= e3.rows || h < 0 ? this.clear() : (this.hasSelection = true, this.columnSelectMode = s2, this.viewportStartRow = o, this.viewportEndRow = n, this.viewportCappedStartRow = a, this.viewportCappedEndRow = h, this.startCol = t3[0], this.endCol = i3[0]);
          }
          isCellSelected(e3, t3, i3) {
            return !!this.hasSelection && (i3 -= e3.buffer.active.viewportY, this.columnSelectMode ? this.startCol <= this.endCol ? t3 >= this.startCol && i3 >= this.viewportCappedStartRow && t3 < this.endCol && i3 <= this.viewportCappedEndRow : t3 < this.startCol && i3 >= this.viewportCappedStartRow && t3 >= this.endCol && i3 <= this.viewportCappedEndRow : i3 > this.viewportStartRow && i3 < this.viewportEndRow || this.viewportStartRow === this.viewportEndRow && i3 === this.viewportStartRow && t3 >= this.startCol && t3 < this.endCol || this.viewportStartRow < this.viewportEndRow && i3 === this.viewportEndRow && t3 < this.endCol || this.viewportStartRow < this.viewportEndRow && i3 === this.viewportStartRow && t3 >= this.startCol);
          }
        }
        t2.createSelectionRenderModel = function() {
          return new i2();
        };
      }, 509: (e2, t2, i2) => {
        Object.defineProperty(t2, "__esModule", { value: true }), t2.TextureAtlas = void 0;
        const s2 = i2(237), r = i2(860), o = i2(374), n = i2(160), a = i2(345), h = i2(485), l = i2(385), c = i2(147), d = i2(855), _ = { texturePage: 0, texturePosition: { x: 0, y: 0 }, texturePositionClipSpace: { x: 0, y: 0 }, offset: { x: 0, y: 0 }, size: { x: 0, y: 0 }, sizeClipSpace: { x: 0, y: 0 } };
        let u;
        class g {
          get pages() {
            return this._pages;
          }
          constructor(e3, t3, i3) {
            this._document = e3, this._config = t3, this._unicodeService = i3, this._didWarmUp = false, this._cacheMap = new h.FourKeyMap(), this._cacheMapCombined = new h.FourKeyMap(), this._pages = [], this._activePages = [], this._workBoundingBox = { top: 0, left: 0, bottom: 0, right: 0 }, this._workAttributeData = new c.AttributeData(), this._textureSize = 512, this._onAddTextureAtlasCanvas = new a.EventEmitter(), this.onAddTextureAtlasCanvas = this._onAddTextureAtlasCanvas.event, this._onRemoveTextureAtlasCanvas = new a.EventEmitter(), this.onRemoveTextureAtlasCanvas = this._onRemoveTextureAtlasCanvas.event, this._requestClearModel = false, this._createNewPage(), this._tmpCanvas = p(e3, 4 * this._config.deviceCellWidth + 4, this._config.deviceCellHeight + 4), this._tmpCtx = (0, o.throwIfFalsy)(this._tmpCanvas.getContext("2d", { alpha: this._config.allowTransparency, willReadFrequently: true }));
          }
          dispose() {
            for (const e3 of this.pages) e3.canvas.remove();
            this._onAddTextureAtlasCanvas.dispose();
          }
          warmUp() {
            this._didWarmUp || (this._doWarmUp(), this._didWarmUp = true);
          }
          _doWarmUp() {
            const e3 = new l.IdleTaskQueue();
            for (let t3 = 33; t3 < 126; t3++) e3.enqueue(() => {
              if (!this._cacheMap.get(t3, d.DEFAULT_COLOR, d.DEFAULT_COLOR, d.DEFAULT_EXT)) {
                const e4 = this._drawToCache(t3, d.DEFAULT_COLOR, d.DEFAULT_COLOR, d.DEFAULT_EXT);
                this._cacheMap.set(t3, d.DEFAULT_COLOR, d.DEFAULT_COLOR, d.DEFAULT_EXT, e4);
              }
            });
          }
          beginFrame() {
            return this._requestClearModel;
          }
          clearTexture() {
            if (0 !== this._pages[0].currentRow.x || 0 !== this._pages[0].currentRow.y) {
              for (const e3 of this._pages) e3.clear();
              this._cacheMap.clear(), this._cacheMapCombined.clear(), this._didWarmUp = false;
            }
          }
          _createNewPage() {
            if (g.maxAtlasPages && this._pages.length >= Math.max(4, g.maxAtlasPages)) {
              const e4 = this._pages.filter((e5) => 2 * e5.canvas.width <= (g.maxTextureSize || 4096)).sort((e5, t4) => t4.canvas.width !== e5.canvas.width ? t4.canvas.width - e5.canvas.width : t4.percentageUsed - e5.percentageUsed);
              let t3 = -1, i3 = 0;
              for (let s4 = 0; s4 < e4.length; s4++) if (e4[s4].canvas.width !== i3) t3 = s4, i3 = e4[s4].canvas.width;
              else if (s4 - t3 == 3) break;
              const s3 = e4.slice(t3, t3 + 4), r2 = s3.map((e5) => e5.glyphs[0].texturePage).sort((e5, t4) => e5 > t4 ? 1 : -1), o2 = this.pages.length - s3.length, n2 = this._mergePages(s3, o2);
              n2.version++;
              for (let e5 = r2.length - 1; e5 >= 0; e5--) this._deletePage(r2[e5]);
              this.pages.push(n2), this._requestClearModel = true, this._onAddTextureAtlasCanvas.fire(n2.canvas);
            }
            const e3 = new v(this._document, this._textureSize);
            return this._pages.push(e3), this._activePages.push(e3), this._onAddTextureAtlasCanvas.fire(e3.canvas), e3;
          }
          _mergePages(e3, t3) {
            const i3 = 2 * e3[0].canvas.width, s3 = new v(this._document, i3, e3);
            for (const [r2, o2] of e3.entries()) {
              const e4 = r2 * o2.canvas.width % i3, n2 = Math.floor(r2 / 2) * o2.canvas.height;
              s3.ctx.drawImage(o2.canvas, e4, n2);
              for (const s4 of o2.glyphs) s4.texturePage = t3, s4.sizeClipSpace.x = s4.size.x / i3, s4.sizeClipSpace.y = s4.size.y / i3, s4.texturePosition.x += e4, s4.texturePosition.y += n2, s4.texturePositionClipSpace.x = s4.texturePosition.x / i3, s4.texturePositionClipSpace.y = s4.texturePosition.y / i3;
              this._onRemoveTextureAtlasCanvas.fire(o2.canvas);
              const a2 = this._activePages.indexOf(o2);
              -1 !== a2 && this._activePages.splice(a2, 1);
            }
            return s3;
          }
          _deletePage(e3) {
            this._pages.splice(e3, 1);
            for (let t3 = e3; t3 < this._pages.length; t3++) {
              const e4 = this._pages[t3];
              for (const t4 of e4.glyphs) t4.texturePage--;
              e4.version++;
            }
          }
          getRasterizedGlyphCombinedChar(e3, t3, i3, s3, r2) {
            return this._getFromCacheMap(this._cacheMapCombined, e3, t3, i3, s3, r2);
          }
          getRasterizedGlyph(e3, t3, i3, s3, r2) {
            return this._getFromCacheMap(this._cacheMap, e3, t3, i3, s3, r2);
          }
          _getFromCacheMap(e3, t3, i3, s3, r2, o2 = false) {
            return u = e3.get(t3, i3, s3, r2), u || (u = this._drawToCache(t3, i3, s3, r2, o2), e3.set(t3, i3, s3, r2, u)), u;
          }
          _getColorFromAnsiIndex(e3) {
            if (e3 >= this._config.colors.ansi.length) throw new Error("No color found for idx " + e3);
            return this._config.colors.ansi[e3];
          }
          _getBackgroundColor(e3, t3, i3, s3) {
            if (this._config.allowTransparency) return n.NULL_COLOR;
            let r2;
            switch (e3) {
              case 16777216:
              case 33554432:
                r2 = this._getColorFromAnsiIndex(t3);
                break;
              case 50331648:
                const e4 = c.AttributeData.toColorRGB(t3);
                r2 = n.channels.toColor(e4[0], e4[1], e4[2]);
                break;
              default:
                r2 = i3 ? n.color.opaque(this._config.colors.foreground) : this._config.colors.background;
            }
            return r2;
          }
          _getForegroundColor(e3, t3, i3, r2, o2, a2, h2, l2, d2, _2) {
            const u2 = this._getMinimumContrastColor(e3, t3, i3, r2, o2, a2, h2, d2, l2, _2);
            if (u2) return u2;
            let g2;
            switch (o2) {
              case 16777216:
              case 33554432:
                this._config.drawBoldTextInBrightColors && d2 && a2 < 8 && (a2 += 8), g2 = this._getColorFromAnsiIndex(a2);
                break;
              case 50331648:
                const e4 = c.AttributeData.toColorRGB(a2);
                g2 = n.channels.toColor(e4[0], e4[1], e4[2]);
                break;
              default:
                g2 = h2 ? this._config.colors.background : this._config.colors.foreground;
            }
            return this._config.allowTransparency && (g2 = n.color.opaque(g2)), l2 && (g2 = n.color.multiplyOpacity(g2, s2.DIM_OPACITY)), g2;
          }
          _resolveBackgroundRgba(e3, t3, i3) {
            switch (e3) {
              case 16777216:
              case 33554432:
                return this._getColorFromAnsiIndex(t3).rgba;
              case 50331648:
                return t3 << 8;
              default:
                return i3 ? this._config.colors.foreground.rgba : this._config.colors.background.rgba;
            }
          }
          _resolveForegroundRgba(e3, t3, i3, s3) {
            switch (e3) {
              case 16777216:
              case 33554432:
                return this._config.drawBoldTextInBrightColors && s3 && t3 < 8 && (t3 += 8), this._getColorFromAnsiIndex(t3).rgba;
              case 50331648:
                return t3 << 8;
              default:
                return i3 ? this._config.colors.background.rgba : this._config.colors.foreground.rgba;
            }
          }
          _getMinimumContrastColor(e3, t3, i3, s3, r2, o2, a2, h2, l2, c2) {
            if (1 === this._config.minimumContrastRatio || c2) return;
            const d2 = this._getContrastCache(l2), _2 = d2.getColor(e3, s3);
            if (void 0 !== _2) return _2 || void 0;
            const u2 = this._resolveBackgroundRgba(t3, i3, a2), g2 = this._resolveForegroundRgba(r2, o2, a2, h2), v2 = n.rgba.ensureContrastRatio(u2, g2, this._config.minimumContrastRatio / (l2 ? 2 : 1));
            if (!v2) return void d2.setColor(e3, s3, null);
            const f2 = n.channels.toColor(v2 >> 24 & 255, v2 >> 16 & 255, v2 >> 8 & 255);
            return d2.setColor(e3, s3, f2), f2;
          }
          _getContrastCache(e3) {
            return e3 ? this._config.colors.halfContrastCache : this._config.colors.contrastCache;
          }
          _drawToCache(e3, t3, i3, n2, a2 = false) {
            const h2 = "number" == typeof e3 ? String.fromCharCode(e3) : e3, l2 = Math.min(this._config.deviceCellWidth * Math.max(h2.length, 2) + 4, this._textureSize);
            this._tmpCanvas.width < l2 && (this._tmpCanvas.width = l2);
            const d2 = Math.min(this._config.deviceCellHeight + 8, this._textureSize);
            if (this._tmpCanvas.height < d2 && (this._tmpCanvas.height = d2), this._tmpCtx.save(), this._workAttributeData.fg = i3, this._workAttributeData.bg = t3, this._workAttributeData.extended.ext = n2, this._workAttributeData.isInvisible()) return _;
            const u2 = !!this._workAttributeData.isBold(), v2 = !!this._workAttributeData.isInverse(), p2 = !!this._workAttributeData.isDim(), C = !!this._workAttributeData.isItalic(), m = !!this._workAttributeData.isUnderline(), L = !!this._workAttributeData.isStrikethrough(), x = !!this._workAttributeData.isOverline();
            let w = this._workAttributeData.getFgColor(), b = this._workAttributeData.getFgColorMode(), M = this._workAttributeData.getBgColor(), R = this._workAttributeData.getBgColorMode();
            if (v2) {
              const e4 = w;
              w = M, M = e4;
              const t4 = b;
              b = R, R = t4;
            }
            const y = this._getBackgroundColor(R, M, v2, p2);
            this._tmpCtx.globalCompositeOperation = "copy", this._tmpCtx.fillStyle = y.css, this._tmpCtx.fillRect(0, 0, this._tmpCanvas.width, this._tmpCanvas.height), this._tmpCtx.globalCompositeOperation = "source-over";
            const A = u2 ? this._config.fontWeightBold : this._config.fontWeight, E = C ? "italic" : "";
            this._tmpCtx.font = `${E} ${A} ${this._config.fontSize * this._config.devicePixelRatio}px ${this._config.fontFamily}`, this._tmpCtx.textBaseline = s2.TEXT_BASELINE;
            const S = 1 === h2.length && (0, o.isPowerlineGlyph)(h2.charCodeAt(0)), T = 1 === h2.length && (0, o.isRestrictedPowerlineGlyph)(h2.charCodeAt(0)), D = this._getForegroundColor(t3, R, M, i3, b, w, v2, p2, u2, (0, o.treatGlyphAsBackgroundColor)(h2.charCodeAt(0)));
            this._tmpCtx.fillStyle = D.css;
            const B = T ? 0 : 4;
            let F = false;
            false !== this._config.customGlyphs && (F = (0, r.tryDrawCustomChar)(this._tmpCtx, h2, B, B, this._config.deviceCellWidth, this._config.deviceCellHeight, this._config.fontSize, this._config.devicePixelRatio));
            let P, I = !S;
            if (P = "number" == typeof e3 ? this._unicodeService.wcwidth(e3) : this._unicodeService.getStringCellWidth(e3), m) {
              this._tmpCtx.save();
              const e4 = Math.max(1, Math.floor(this._config.fontSize * this._config.devicePixelRatio / 15)), t4 = e4 % 2 == 1 ? 0.5 : 0;
              if (this._tmpCtx.lineWidth = e4, this._workAttributeData.isUnderlineColorDefault()) this._tmpCtx.strokeStyle = this._tmpCtx.fillStyle;
              else if (this._workAttributeData.isUnderlineColorRGB()) I = false, this._tmpCtx.strokeStyle = `rgb(${c.AttributeData.toColorRGB(this._workAttributeData.getUnderlineColor()).join(",")})`;
              else {
                I = false;
                let e5 = this._workAttributeData.getUnderlineColor();
                this._config.drawBoldTextInBrightColors && this._workAttributeData.isBold() && e5 < 8 && (e5 += 8), this._tmpCtx.strokeStyle = this._getColorFromAnsiIndex(e5).css;
              }
              this._tmpCtx.beginPath();
              const i4 = B, s3 = Math.ceil(B + this._config.deviceCharHeight) - t4 - (a2 ? 2 * e4 : 0), r2 = s3 + e4, n3 = s3 + 2 * e4;
              let l3 = this._workAttributeData.getUnderlineVariantOffset();
              for (let a3 = 0; a3 < P; a3++) {
                this._tmpCtx.save();
                const h3 = i4 + a3 * this._config.deviceCellWidth, c2 = i4 + (a3 + 1) * this._config.deviceCellWidth, d3 = h3 + this._config.deviceCellWidth / 2;
                switch (this._workAttributeData.extended.underlineStyle) {
                  case 2:
                    this._tmpCtx.moveTo(h3, s3), this._tmpCtx.lineTo(c2, s3), this._tmpCtx.moveTo(h3, n3), this._tmpCtx.lineTo(c2, n3);
                    break;
                  case 3:
                    const i5 = e4 <= 1 ? n3 : Math.ceil(B + this._config.deviceCharHeight - e4 / 2) - t4, a4 = e4 <= 1 ? s3 : Math.ceil(B + this._config.deviceCharHeight + e4 / 2) - t4, _2 = new Path2D();
                    _2.rect(h3, s3, this._config.deviceCellWidth, n3 - s3), this._tmpCtx.clip(_2), this._tmpCtx.moveTo(h3 - this._config.deviceCellWidth / 2, r2), this._tmpCtx.bezierCurveTo(h3 - this._config.deviceCellWidth / 2, a4, h3, a4, h3, r2), this._tmpCtx.bezierCurveTo(h3, i5, d3, i5, d3, r2), this._tmpCtx.bezierCurveTo(d3, a4, c2, a4, c2, r2), this._tmpCtx.bezierCurveTo(c2, i5, c2 + this._config.deviceCellWidth / 2, i5, c2 + this._config.deviceCellWidth / 2, r2);
                    break;
                  case 4:
                    const u3 = 0 === l3 ? 0 : l3 >= e4 ? 2 * e4 - l3 : e4 - l3;
                    false == !(l3 >= e4) || 0 === u3 ? (this._tmpCtx.setLineDash([Math.round(e4), Math.round(e4)]), this._tmpCtx.moveTo(h3 + u3, s3), this._tmpCtx.lineTo(c2, s3)) : (this._tmpCtx.setLineDash([Math.round(e4), Math.round(e4)]), this._tmpCtx.moveTo(h3, s3), this._tmpCtx.lineTo(h3 + u3, s3), this._tmpCtx.moveTo(h3 + u3 + e4, s3), this._tmpCtx.lineTo(c2, s3)), l3 = (0, o.computeNextVariantOffset)(c2 - h3, e4, l3);
                    break;
                  case 5:
                    const g2 = 0.6, v3 = 0.3, f2 = c2 - h3, p3 = Math.floor(g2 * f2), C2 = Math.floor(v3 * f2), m2 = f2 - p3 - C2;
                    this._tmpCtx.setLineDash([p3, C2, m2]), this._tmpCtx.moveTo(h3, s3), this._tmpCtx.lineTo(c2, s3);
                    break;
                  default:
                    this._tmpCtx.moveTo(h3, s3), this._tmpCtx.lineTo(c2, s3);
                }
                this._tmpCtx.stroke(), this._tmpCtx.restore();
              }
              if (this._tmpCtx.restore(), !F && this._config.fontSize >= 12 && !this._config.allowTransparency && " " !== h2) {
                this._tmpCtx.save(), this._tmpCtx.textBaseline = "alphabetic";
                const t5 = this._tmpCtx.measureText(h2);
                if (this._tmpCtx.restore(), "actualBoundingBoxDescent" in t5 && t5.actualBoundingBoxDescent > 0) {
                  this._tmpCtx.save();
                  const t6 = new Path2D();
                  t6.rect(i4, s3 - Math.ceil(e4 / 2), this._config.deviceCellWidth * P, n3 - s3 + Math.ceil(e4 / 2)), this._tmpCtx.clip(t6), this._tmpCtx.lineWidth = 3 * this._config.devicePixelRatio, this._tmpCtx.strokeStyle = y.css, this._tmpCtx.strokeText(h2, B, B + this._config.deviceCharHeight), this._tmpCtx.restore();
                }
              }
            }
            if (x) {
              const e4 = Math.max(1, Math.floor(this._config.fontSize * this._config.devicePixelRatio / 15)), t4 = e4 % 2 == 1 ? 0.5 : 0;
              this._tmpCtx.lineWidth = e4, this._tmpCtx.strokeStyle = this._tmpCtx.fillStyle, this._tmpCtx.beginPath(), this._tmpCtx.moveTo(B, B + t4), this._tmpCtx.lineTo(B + this._config.deviceCharWidth * P, B + t4), this._tmpCtx.stroke();
            }
            if (F || this._tmpCtx.fillText(h2, B, B + this._config.deviceCharHeight), "_" === h2 && !this._config.allowTransparency) {
              let e4 = f(this._tmpCtx.getImageData(B, B, this._config.deviceCellWidth, this._config.deviceCellHeight), y, D, I);
              if (e4) for (let t4 = 1; t4 <= 5 && (this._tmpCtx.save(), this._tmpCtx.fillStyle = y.css, this._tmpCtx.fillRect(0, 0, this._tmpCanvas.width, this._tmpCanvas.height), this._tmpCtx.restore(), this._tmpCtx.fillText(h2, B, B + this._config.deviceCharHeight - t4), e4 = f(this._tmpCtx.getImageData(B, B, this._config.deviceCellWidth, this._config.deviceCellHeight), y, D, I), e4); t4++) ;
            }
            if (L) {
              const e4 = Math.max(1, Math.floor(this._config.fontSize * this._config.devicePixelRatio / 10)), t4 = this._tmpCtx.lineWidth % 2 == 1 ? 0.5 : 0;
              this._tmpCtx.lineWidth = e4, this._tmpCtx.strokeStyle = this._tmpCtx.fillStyle, this._tmpCtx.beginPath(), this._tmpCtx.moveTo(B, B + Math.floor(this._config.deviceCharHeight / 2) - t4), this._tmpCtx.lineTo(B + this._config.deviceCharWidth * P, B + Math.floor(this._config.deviceCharHeight / 2) - t4), this._tmpCtx.stroke();
            }
            this._tmpCtx.restore();
            const O = this._tmpCtx.getImageData(0, 0, this._tmpCanvas.width, this._tmpCanvas.height);
            let k;
            if (k = this._config.allowTransparency ? function(e4) {
              for (let t4 = 0; t4 < e4.data.length; t4 += 4) if (e4.data[t4 + 3] > 0) return false;
              return true;
            }(O) : f(O, y, D, I), k) return _;
            const $ = this._findGlyphBoundingBox(O, this._workBoundingBox, l2, T, F, B);
            let U, N;
            for (; ; ) {
              if (0 === this._activePages.length) {
                const e4 = this._createNewPage();
                U = e4, N = e4.currentRow, N.height = $.size.y;
                break;
              }
              U = this._activePages[this._activePages.length - 1], N = U.currentRow;
              for (const e4 of this._activePages) $.size.y <= e4.currentRow.height && (U = e4, N = e4.currentRow);
              for (let e4 = this._activePages.length - 1; e4 >= 0; e4--) for (const t4 of this._activePages[e4].fixedRows) t4.height <= N.height && $.size.y <= t4.height && (U = this._activePages[e4], N = t4);
              if (N.y + $.size.y >= U.canvas.height || N.height > $.size.y + 2) {
                let e4 = false;
                if (U.currentRow.y + U.currentRow.height + $.size.y >= U.canvas.height) {
                  let t4;
                  for (const e5 of this._activePages) if (e5.currentRow.y + e5.currentRow.height + $.size.y < e5.canvas.height) {
                    t4 = e5;
                    break;
                  }
                  if (t4) U = t4;
                  else if (g.maxAtlasPages && this._pages.length >= g.maxAtlasPages && N.y + $.size.y <= U.canvas.height && N.height >= $.size.y && N.x + $.size.x <= U.canvas.width) e4 = true;
                  else {
                    const t5 = this._createNewPage();
                    U = t5, N = t5.currentRow, N.height = $.size.y, e4 = true;
                  }
                }
                e4 || (U.currentRow.height > 0 && U.fixedRows.push(U.currentRow), N = { x: 0, y: U.currentRow.y + U.currentRow.height, height: $.size.y }, U.fixedRows.push(N), U.currentRow = { x: 0, y: N.y + N.height, height: 0 });
              }
              if (N.x + $.size.x <= U.canvas.width) break;
              N === U.currentRow ? (N.x = 0, N.y += N.height, N.height = 0) : U.fixedRows.splice(U.fixedRows.indexOf(N), 1);
            }
            return $.texturePage = this._pages.indexOf(U), $.texturePosition.x = N.x, $.texturePosition.y = N.y, $.texturePositionClipSpace.x = N.x / U.canvas.width, $.texturePositionClipSpace.y = N.y / U.canvas.height, $.sizeClipSpace.x /= U.canvas.width, $.sizeClipSpace.y /= U.canvas.height, N.height = Math.max(N.height, $.size.y), N.x += $.size.x, U.ctx.putImageData(O, $.texturePosition.x - this._workBoundingBox.left, $.texturePosition.y - this._workBoundingBox.top, this._workBoundingBox.left, this._workBoundingBox.top, $.size.x, $.size.y), U.addGlyph($), U.version++, $;
          }
          _findGlyphBoundingBox(e3, t3, i3, s3, r2, o2) {
            t3.top = 0;
            const n2 = s3 ? this._config.deviceCellHeight : this._tmpCanvas.height, a2 = s3 ? this._config.deviceCellWidth : i3;
            let h2 = false;
            for (let i4 = 0; i4 < n2; i4++) {
              for (let s4 = 0; s4 < a2; s4++) {
                const r3 = i4 * this._tmpCanvas.width * 4 + 4 * s4 + 3;
                if (0 !== e3.data[r3]) {
                  t3.top = i4, h2 = true;
                  break;
                }
              }
              if (h2) break;
            }
            t3.left = 0, h2 = false;
            for (let i4 = 0; i4 < o2 + a2; i4++) {
              for (let s4 = 0; s4 < n2; s4++) {
                const r3 = s4 * this._tmpCanvas.width * 4 + 4 * i4 + 3;
                if (0 !== e3.data[r3]) {
                  t3.left = i4, h2 = true;
                  break;
                }
              }
              if (h2) break;
            }
            t3.right = a2, h2 = false;
            for (let i4 = o2 + a2 - 1; i4 >= o2; i4--) {
              for (let s4 = 0; s4 < n2; s4++) {
                const r3 = s4 * this._tmpCanvas.width * 4 + 4 * i4 + 3;
                if (0 !== e3.data[r3]) {
                  t3.right = i4, h2 = true;
                  break;
                }
              }
              if (h2) break;
            }
            t3.bottom = n2, h2 = false;
            for (let i4 = n2 - 1; i4 >= 0; i4--) {
              for (let s4 = 0; s4 < a2; s4++) {
                const r3 = i4 * this._tmpCanvas.width * 4 + 4 * s4 + 3;
                if (0 !== e3.data[r3]) {
                  t3.bottom = i4, h2 = true;
                  break;
                }
              }
              if (h2) break;
            }
            return { texturePage: 0, texturePosition: { x: 0, y: 0 }, texturePositionClipSpace: { x: 0, y: 0 }, size: { x: t3.right - t3.left + 1, y: t3.bottom - t3.top + 1 }, sizeClipSpace: { x: t3.right - t3.left + 1, y: t3.bottom - t3.top + 1 }, offset: { x: -t3.left + o2 + (s3 || r2 ? Math.floor((this._config.deviceCellWidth - this._config.deviceCharWidth) / 2) : 0), y: -t3.top + o2 + (s3 || r2 ? 1 === this._config.lineHeight ? 0 : Math.round((this._config.deviceCellHeight - this._config.deviceCharHeight) / 2) : 0) } };
          }
        }
        t2.TextureAtlas = g;
        class v {
          get percentageUsed() {
            return this._usedPixels / (this.canvas.width * this.canvas.height);
          }
          get glyphs() {
            return this._glyphs;
          }
          addGlyph(e3) {
            this._glyphs.push(e3), this._usedPixels += e3.size.x * e3.size.y;
          }
          constructor(e3, t3, i3) {
            if (this._usedPixels = 0, this._glyphs = [], this.version = 0, this.currentRow = { x: 0, y: 0, height: 0 }, this.fixedRows = [], i3) for (const e4 of i3) this._glyphs.push(...e4.glyphs), this._usedPixels += e4._usedPixels;
            this.canvas = p(e3, t3, t3), this.ctx = (0, o.throwIfFalsy)(this.canvas.getContext("2d", { alpha: true }));
          }
          clear() {
            this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height), this.currentRow.x = 0, this.currentRow.y = 0, this.currentRow.height = 0, this.fixedRows.length = 0, this.version++;
          }
        }
        function f(e3, t3, i3, s3) {
          const r2 = t3.rgba >>> 24, o2 = t3.rgba >>> 16 & 255, n2 = t3.rgba >>> 8 & 255, a2 = i3.rgba >>> 24, h2 = i3.rgba >>> 16 & 255, l2 = i3.rgba >>> 8 & 255, c2 = Math.floor((Math.abs(r2 - a2) + Math.abs(o2 - h2) + Math.abs(n2 - l2)) / 12);
          let d2 = true;
          for (let t4 = 0; t4 < e3.data.length; t4 += 4) e3.data[t4] === r2 && e3.data[t4 + 1] === o2 && e3.data[t4 + 2] === n2 || s3 && Math.abs(e3.data[t4] - r2) + Math.abs(e3.data[t4 + 1] - o2) + Math.abs(e3.data[t4 + 2] - n2) < c2 ? e3.data[t4 + 3] = 0 : d2 = false;
          return d2;
        }
        function p(e3, t3, i3) {
          const s3 = e3.createElement("canvas");
          return s3.width = t3, s3.height = i3, s3;
        }
      }, 160: (e2, t2) => {
        Object.defineProperty(t2, "__esModule", { value: true }), t2.contrastRatio = t2.toPaddedHex = t2.rgba = t2.rgb = t2.css = t2.color = t2.channels = t2.NULL_COLOR = void 0;
        let i2 = 0, s2 = 0, r = 0, o = 0;
        var n, a, h, l, c;
        function d(e3) {
          const t3 = e3.toString(16);
          return t3.length < 2 ? "0" + t3 : t3;
        }
        function _(e3, t3) {
          return e3 < t3 ? (t3 + 0.05) / (e3 + 0.05) : (e3 + 0.05) / (t3 + 0.05);
        }
        t2.NULL_COLOR = { css: "#00000000", rgba: 0 }, function(e3) {
          e3.toCss = function(e4, t3, i3, s3) {
            return void 0 !== s3 ? `#${d(e4)}${d(t3)}${d(i3)}${d(s3)}` : `#${d(e4)}${d(t3)}${d(i3)}`;
          }, e3.toRgba = function(e4, t3, i3, s3 = 255) {
            return (e4 << 24 | t3 << 16 | i3 << 8 | s3) >>> 0;
          }, e3.toColor = function(t3, i3, s3, r2) {
            return { css: e3.toCss(t3, i3, s3, r2), rgba: e3.toRgba(t3, i3, s3, r2) };
          };
        }(n || (t2.channels = n = {})), function(e3) {
          function t3(e4, t4) {
            return o = Math.round(255 * t4), [i2, s2, r] = c.toChannels(e4.rgba), { css: n.toCss(i2, s2, r, o), rgba: n.toRgba(i2, s2, r, o) };
          }
          e3.blend = function(e4, t4) {
            if (o = (255 & t4.rgba) / 255, 1 === o) return { css: t4.css, rgba: t4.rgba };
            const a2 = t4.rgba >> 24 & 255, h2 = t4.rgba >> 16 & 255, l2 = t4.rgba >> 8 & 255, c2 = e4.rgba >> 24 & 255, d2 = e4.rgba >> 16 & 255, _2 = e4.rgba >> 8 & 255;
            return i2 = c2 + Math.round((a2 - c2) * o), s2 = d2 + Math.round((h2 - d2) * o), r = _2 + Math.round((l2 - _2) * o), { css: n.toCss(i2, s2, r), rgba: n.toRgba(i2, s2, r) };
          }, e3.isOpaque = function(e4) {
            return 255 == (255 & e4.rgba);
          }, e3.ensureContrastRatio = function(e4, t4, i3) {
            const s3 = c.ensureContrastRatio(e4.rgba, t4.rgba, i3);
            if (s3) return n.toColor(s3 >> 24 & 255, s3 >> 16 & 255, s3 >> 8 & 255);
          }, e3.opaque = function(e4) {
            const t4 = (255 | e4.rgba) >>> 0;
            return [i2, s2, r] = c.toChannels(t4), { css: n.toCss(i2, s2, r), rgba: t4 };
          }, e3.opacity = t3, e3.multiplyOpacity = function(e4, i3) {
            return o = 255 & e4.rgba, t3(e4, o * i3 / 255);
          }, e3.toColorRGB = function(e4) {
            return [e4.rgba >> 24 & 255, e4.rgba >> 16 & 255, e4.rgba >> 8 & 255];
          };
        }(a || (t2.color = a = {})), function(e3) {
          let t3, a2;
          try {
            const e4 = document.createElement("canvas");
            e4.width = 1, e4.height = 1;
            const i3 = e4.getContext("2d", { willReadFrequently: true });
            i3 && (t3 = i3, t3.globalCompositeOperation = "copy", a2 = t3.createLinearGradient(0, 0, 1, 1));
          } catch {
          }
          e3.toColor = function(e4) {
            if (e4.match(/#[\da-f]{3,8}/i)) switch (e4.length) {
              case 4:
                return i2 = parseInt(e4.slice(1, 2).repeat(2), 16), s2 = parseInt(e4.slice(2, 3).repeat(2), 16), r = parseInt(e4.slice(3, 4).repeat(2), 16), n.toColor(i2, s2, r);
              case 5:
                return i2 = parseInt(e4.slice(1, 2).repeat(2), 16), s2 = parseInt(e4.slice(2, 3).repeat(2), 16), r = parseInt(e4.slice(3, 4).repeat(2), 16), o = parseInt(e4.slice(4, 5).repeat(2), 16), n.toColor(i2, s2, r, o);
              case 7:
                return { css: e4, rgba: (parseInt(e4.slice(1), 16) << 8 | 255) >>> 0 };
              case 9:
                return { css: e4, rgba: parseInt(e4.slice(1), 16) >>> 0 };
            }
            const h2 = e4.match(/rgba?\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})\s*(,\s*(0|1|\d?\.(\d+))\s*)?\)/);
            if (h2) return i2 = parseInt(h2[1]), s2 = parseInt(h2[2]), r = parseInt(h2[3]), o = Math.round(255 * (void 0 === h2[5] ? 1 : parseFloat(h2[5]))), n.toColor(i2, s2, r, o);
            if (!t3 || !a2) throw new Error("css.toColor: Unsupported css format");
            if (t3.fillStyle = a2, t3.fillStyle = e4, "string" != typeof t3.fillStyle) throw new Error("css.toColor: Unsupported css format");
            if (t3.fillRect(0, 0, 1, 1), [i2, s2, r, o] = t3.getImageData(0, 0, 1, 1).data, 255 !== o) throw new Error("css.toColor: Unsupported css format");
            return { rgba: n.toRgba(i2, s2, r, o), css: e4 };
          };
        }(h || (t2.css = h = {})), function(e3) {
          function t3(e4, t4, i3) {
            const s3 = e4 / 255, r2 = t4 / 255, o2 = i3 / 255;
            return 0.2126 * (s3 <= 0.03928 ? s3 / 12.92 : Math.pow((s3 + 0.055) / 1.055, 2.4)) + 0.7152 * (r2 <= 0.03928 ? r2 / 12.92 : Math.pow((r2 + 0.055) / 1.055, 2.4)) + 0.0722 * (o2 <= 0.03928 ? o2 / 12.92 : Math.pow((o2 + 0.055) / 1.055, 2.4));
          }
          e3.relativeLuminance = function(e4) {
            return t3(e4 >> 16 & 255, e4 >> 8 & 255, 255 & e4);
          }, e3.relativeLuminance2 = t3;
        }(l || (t2.rgb = l = {})), function(e3) {
          function t3(e4, t4, i3) {
            const s3 = e4 >> 24 & 255, r2 = e4 >> 16 & 255, o2 = e4 >> 8 & 255;
            let n2 = t4 >> 24 & 255, a3 = t4 >> 16 & 255, h2 = t4 >> 8 & 255, c2 = _(l.relativeLuminance2(n2, a3, h2), l.relativeLuminance2(s3, r2, o2));
            for (; c2 < i3 && (n2 > 0 || a3 > 0 || h2 > 0); ) n2 -= Math.max(0, Math.ceil(0.1 * n2)), a3 -= Math.max(0, Math.ceil(0.1 * a3)), h2 -= Math.max(0, Math.ceil(0.1 * h2)), c2 = _(l.relativeLuminance2(n2, a3, h2), l.relativeLuminance2(s3, r2, o2));
            return (n2 << 24 | a3 << 16 | h2 << 8 | 255) >>> 0;
          }
          function a2(e4, t4, i3) {
            const s3 = e4 >> 24 & 255, r2 = e4 >> 16 & 255, o2 = e4 >> 8 & 255;
            let n2 = t4 >> 24 & 255, a3 = t4 >> 16 & 255, h2 = t4 >> 8 & 255, c2 = _(l.relativeLuminance2(n2, a3, h2), l.relativeLuminance2(s3, r2, o2));
            for (; c2 < i3 && (n2 < 255 || a3 < 255 || h2 < 255); ) n2 = Math.min(255, n2 + Math.ceil(0.1 * (255 - n2))), a3 = Math.min(255, a3 + Math.ceil(0.1 * (255 - a3))), h2 = Math.min(255, h2 + Math.ceil(0.1 * (255 - h2))), c2 = _(l.relativeLuminance2(n2, a3, h2), l.relativeLuminance2(s3, r2, o2));
            return (n2 << 24 | a3 << 16 | h2 << 8 | 255) >>> 0;
          }
          e3.blend = function(e4, t4) {
            if (o = (255 & t4) / 255, 1 === o) return t4;
            const a3 = t4 >> 24 & 255, h2 = t4 >> 16 & 255, l2 = t4 >> 8 & 255, c2 = e4 >> 24 & 255, d2 = e4 >> 16 & 255, _2 = e4 >> 8 & 255;
            return i2 = c2 + Math.round((a3 - c2) * o), s2 = d2 + Math.round((h2 - d2) * o), r = _2 + Math.round((l2 - _2) * o), n.toRgba(i2, s2, r);
          }, e3.ensureContrastRatio = function(e4, i3, s3) {
            const r2 = l.relativeLuminance(e4 >> 8), o2 = l.relativeLuminance(i3 >> 8);
            if (_(r2, o2) < s3) {
              if (o2 < r2) {
                const o3 = t3(e4, i3, s3), n3 = _(r2, l.relativeLuminance(o3 >> 8));
                if (n3 < s3) {
                  const t4 = a2(e4, i3, s3);
                  return n3 > _(r2, l.relativeLuminance(t4 >> 8)) ? o3 : t4;
                }
                return o3;
              }
              const n2 = a2(e4, i3, s3), h2 = _(r2, l.relativeLuminance(n2 >> 8));
              if (h2 < s3) {
                const o3 = t3(e4, i3, s3);
                return h2 > _(r2, l.relativeLuminance(o3 >> 8)) ? n2 : o3;
              }
              return n2;
            }
          }, e3.reduceLuminance = t3, e3.increaseLuminance = a2, e3.toChannels = function(e4) {
            return [e4 >> 24 & 255, e4 >> 16 & 255, e4 >> 8 & 255, 255 & e4];
          };
        }(c || (t2.rgba = c = {})), t2.toPaddedHex = d, t2.contrastRatio = _;
      }, 345: (e2, t2) => {
        Object.defineProperty(t2, "__esModule", { value: true }), t2.runAndSubscribe = t2.forwardEvent = t2.EventEmitter = void 0, t2.EventEmitter = class {
          constructor() {
            this._listeners = [], this._disposed = false;
          }
          get event() {
            return this._event || (this._event = (e3) => (this._listeners.push(e3), { dispose: () => {
              if (!this._disposed) {
                for (let t3 = 0; t3 < this._listeners.length; t3++) if (this._listeners[t3] === e3) return void this._listeners.splice(t3, 1);
              }
            } })), this._event;
          }
          fire(e3, t3) {
            const i2 = [];
            for (let e4 = 0; e4 < this._listeners.length; e4++) i2.push(this._listeners[e4]);
            for (let s2 = 0; s2 < i2.length; s2++) i2[s2].call(void 0, e3, t3);
          }
          dispose() {
            this.clearListeners(), this._disposed = true;
          }
          clearListeners() {
            this._listeners && (this._listeners.length = 0);
          }
        }, t2.forwardEvent = function(e3, t3) {
          return e3((e4) => t3.fire(e4));
        }, t2.runAndSubscribe = function(e3, t3) {
          return t3(void 0), e3((e4) => t3(e4));
        };
      }, 859: (e2, t2) => {
        function i2(e3) {
          for (const t3 of e3) t3.dispose();
          e3.length = 0;
        }
        Object.defineProperty(t2, "__esModule", { value: true }), t2.getDisposeArrayDisposable = t2.disposeArray = t2.toDisposable = t2.MutableDisposable = t2.Disposable = void 0, t2.Disposable = class {
          constructor() {
            this._disposables = [], this._isDisposed = false;
          }
          dispose() {
            this._isDisposed = true;
            for (const e3 of this._disposables) e3.dispose();
            this._disposables.length = 0;
          }
          register(e3) {
            return this._disposables.push(e3), e3;
          }
          unregister(e3) {
            const t3 = this._disposables.indexOf(e3);
            -1 !== t3 && this._disposables.splice(t3, 1);
          }
        }, t2.MutableDisposable = class {
          constructor() {
            this._isDisposed = false;
          }
          get value() {
            return this._isDisposed ? void 0 : this._value;
          }
          set value(e3) {
            var _a2;
            this._isDisposed || e3 === this._value || ((_a2 = this._value) == null ? void 0 : _a2.dispose(), this._value = e3);
          }
          clear() {
            this.value = void 0;
          }
          dispose() {
            var _a2;
            this._isDisposed = true, (_a2 = this._value) == null ? void 0 : _a2.dispose(), this._value = void 0;
          }
        }, t2.toDisposable = function(e3) {
          return { dispose: e3 };
        }, t2.disposeArray = i2, t2.getDisposeArrayDisposable = function(e3) {
          return { dispose: () => i2(e3) };
        };
      }, 485: (e2, t2) => {
        Object.defineProperty(t2, "__esModule", { value: true }), t2.FourKeyMap = t2.TwoKeyMap = void 0;
        class i2 {
          constructor() {
            this._data = {};
          }
          set(e3, t3, i3) {
            this._data[e3] || (this._data[e3] = {}), this._data[e3][t3] = i3;
          }
          get(e3, t3) {
            return this._data[e3] ? this._data[e3][t3] : void 0;
          }
          clear() {
            this._data = {};
          }
        }
        t2.TwoKeyMap = i2, t2.FourKeyMap = class {
          constructor() {
            this._data = new i2();
          }
          set(e3, t3, s2, r, o) {
            this._data.get(e3, t3) || this._data.set(e3, t3, new i2()), this._data.get(e3, t3).set(s2, r, o);
          }
          get(e3, t3, i3, s2) {
            var _a2;
            return (_a2 = this._data.get(e3, t3)) == null ? void 0 : _a2.get(i3, s2);
          }
          clear() {
            this._data.clear();
          }
        };
      }, 399: (e2, t2) => {
        Object.defineProperty(t2, "__esModule", { value: true }), t2.isChromeOS = t2.isLinux = t2.isWindows = t2.isIphone = t2.isIpad = t2.isMac = t2.getSafariVersion = t2.isSafari = t2.isLegacyEdge = t2.isFirefox = t2.isNode = void 0, t2.isNode = "undefined" != typeof process && "title" in process;
        const i2 = t2.isNode ? "node" : navigator.userAgent, s2 = t2.isNode ? "node" : navigator.platform;
        t2.isFirefox = i2.includes("Firefox"), t2.isLegacyEdge = i2.includes("Edge"), t2.isSafari = /^((?!chrome|android).)*safari/i.test(i2), t2.getSafariVersion = function() {
          if (!t2.isSafari) return 0;
          const e3 = i2.match(/Version\/(\d+)/);
          return null === e3 || e3.length < 2 ? 0 : parseInt(e3[1]);
        }, t2.isMac = ["Macintosh", "MacIntel", "MacPPC", "Mac68K"].includes(s2), t2.isIpad = "iPad" === s2, t2.isIphone = "iPhone" === s2, t2.isWindows = ["Windows", "Win16", "Win32", "WinCE"].includes(s2), t2.isLinux = s2.indexOf("Linux") >= 0, t2.isChromeOS = /\bCrOS\b/.test(i2);
      }, 385: (e2, t2, i2) => {
        Object.defineProperty(t2, "__esModule", { value: true }), t2.DebouncedIdleTask = t2.IdleTaskQueue = t2.PriorityTaskQueue = void 0;
        const s2 = i2(399);
        class r {
          constructor() {
            this._tasks = [], this._i = 0;
          }
          enqueue(e3) {
            this._tasks.push(e3), this._start();
          }
          flush() {
            for (; this._i < this._tasks.length; ) this._tasks[this._i]() || this._i++;
            this.clear();
          }
          clear() {
            this._idleCallback && (this._cancelCallback(this._idleCallback), this._idleCallback = void 0), this._i = 0, this._tasks.length = 0;
          }
          _start() {
            this._idleCallback || (this._idleCallback = this._requestCallback(this._process.bind(this)));
          }
          _process(e3) {
            this._idleCallback = void 0;
            let t3 = 0, i3 = 0, s3 = e3.timeRemaining(), r2 = 0;
            for (; this._i < this._tasks.length; ) {
              if (t3 = Date.now(), this._tasks[this._i]() || this._i++, t3 = Math.max(1, Date.now() - t3), i3 = Math.max(t3, i3), r2 = e3.timeRemaining(), 1.5 * i3 > r2) return s3 - t3 < -20 && console.warn(`task queue exceeded allotted deadline by ${Math.abs(Math.round(s3 - t3))}ms`), void this._start();
              s3 = r2;
            }
            this.clear();
          }
        }
        class o extends r {
          _requestCallback(e3) {
            return setTimeout(() => e3(this._createDeadline(16)));
          }
          _cancelCallback(e3) {
            clearTimeout(e3);
          }
          _createDeadline(e3) {
            const t3 = Date.now() + e3;
            return { timeRemaining: () => Math.max(0, t3 - Date.now()) };
          }
        }
        t2.PriorityTaskQueue = o, t2.IdleTaskQueue = !s2.isNode && "requestIdleCallback" in window ? class extends r {
          _requestCallback(e3) {
            return requestIdleCallback(e3);
          }
          _cancelCallback(e3) {
            cancelIdleCallback(e3);
          }
        } : o, t2.DebouncedIdleTask = class {
          constructor() {
            this._queue = new t2.IdleTaskQueue();
          }
          set(e3) {
            this._queue.clear(), this._queue.enqueue(e3);
          }
          flush() {
            this._queue.flush();
          }
        };
      }, 147: (e2, t2) => {
        Object.defineProperty(t2, "__esModule", { value: true }), t2.ExtendedAttrs = t2.AttributeData = void 0;
        class i2 {
          constructor() {
            this.fg = 0, this.bg = 0, this.extended = new s2();
          }
          static toColorRGB(e3) {
            return [e3 >>> 16 & 255, e3 >>> 8 & 255, 255 & e3];
          }
          static fromColorRGB(e3) {
            return (255 & e3[0]) << 16 | (255 & e3[1]) << 8 | 255 & e3[2];
          }
          clone() {
            const e3 = new i2();
            return e3.fg = this.fg, e3.bg = this.bg, e3.extended = this.extended.clone(), e3;
          }
          isInverse() {
            return 67108864 & this.fg;
          }
          isBold() {
            return 134217728 & this.fg;
          }
          isUnderline() {
            return this.hasExtendedAttrs() && 0 !== this.extended.underlineStyle ? 1 : 268435456 & this.fg;
          }
          isBlink() {
            return 536870912 & this.fg;
          }
          isInvisible() {
            return 1073741824 & this.fg;
          }
          isItalic() {
            return 67108864 & this.bg;
          }
          isDim() {
            return 134217728 & this.bg;
          }
          isStrikethrough() {
            return 2147483648 & this.fg;
          }
          isProtected() {
            return 536870912 & this.bg;
          }
          isOverline() {
            return 1073741824 & this.bg;
          }
          getFgColorMode() {
            return 50331648 & this.fg;
          }
          getBgColorMode() {
            return 50331648 & this.bg;
          }
          isFgRGB() {
            return 50331648 == (50331648 & this.fg);
          }
          isBgRGB() {
            return 50331648 == (50331648 & this.bg);
          }
          isFgPalette() {
            return 16777216 == (50331648 & this.fg) || 33554432 == (50331648 & this.fg);
          }
          isBgPalette() {
            return 16777216 == (50331648 & this.bg) || 33554432 == (50331648 & this.bg);
          }
          isFgDefault() {
            return 0 == (50331648 & this.fg);
          }
          isBgDefault() {
            return 0 == (50331648 & this.bg);
          }
          isAttributeDefault() {
            return 0 === this.fg && 0 === this.bg;
          }
          getFgColor() {
            switch (50331648 & this.fg) {
              case 16777216:
              case 33554432:
                return 255 & this.fg;
              case 50331648:
                return 16777215 & this.fg;
              default:
                return -1;
            }
          }
          getBgColor() {
            switch (50331648 & this.bg) {
              case 16777216:
              case 33554432:
                return 255 & this.bg;
              case 50331648:
                return 16777215 & this.bg;
              default:
                return -1;
            }
          }
          hasExtendedAttrs() {
            return 268435456 & this.bg;
          }
          updateExtended() {
            this.extended.isEmpty() ? this.bg &= -268435457 : this.bg |= 268435456;
          }
          getUnderlineColor() {
            if (268435456 & this.bg && ~this.extended.underlineColor) switch (50331648 & this.extended.underlineColor) {
              case 16777216:
              case 33554432:
                return 255 & this.extended.underlineColor;
              case 50331648:
                return 16777215 & this.extended.underlineColor;
              default:
                return this.getFgColor();
            }
            return this.getFgColor();
          }
          getUnderlineColorMode() {
            return 268435456 & this.bg && ~this.extended.underlineColor ? 50331648 & this.extended.underlineColor : this.getFgColorMode();
          }
          isUnderlineColorRGB() {
            return 268435456 & this.bg && ~this.extended.underlineColor ? 50331648 == (50331648 & this.extended.underlineColor) : this.isFgRGB();
          }
          isUnderlineColorPalette() {
            return 268435456 & this.bg && ~this.extended.underlineColor ? 16777216 == (50331648 & this.extended.underlineColor) || 33554432 == (50331648 & this.extended.underlineColor) : this.isFgPalette();
          }
          isUnderlineColorDefault() {
            return 268435456 & this.bg && ~this.extended.underlineColor ? 0 == (50331648 & this.extended.underlineColor) : this.isFgDefault();
          }
          getUnderlineStyle() {
            return 268435456 & this.fg ? 268435456 & this.bg ? this.extended.underlineStyle : 1 : 0;
          }
          getUnderlineVariantOffset() {
            return this.extended.underlineVariantOffset;
          }
        }
        t2.AttributeData = i2;
        class s2 {
          get ext() {
            return this._urlId ? -469762049 & this._ext | this.underlineStyle << 26 : this._ext;
          }
          set ext(e3) {
            this._ext = e3;
          }
          get underlineStyle() {
            return this._urlId ? 5 : (469762048 & this._ext) >> 26;
          }
          set underlineStyle(e3) {
            this._ext &= -469762049, this._ext |= e3 << 26 & 469762048;
          }
          get underlineColor() {
            return 67108863 & this._ext;
          }
          set underlineColor(e3) {
            this._ext &= -67108864, this._ext |= 67108863 & e3;
          }
          get urlId() {
            return this._urlId;
          }
          set urlId(e3) {
            this._urlId = e3;
          }
          get underlineVariantOffset() {
            const e3 = (3758096384 & this._ext) >> 29;
            return e3 < 0 ? 4294967288 ^ e3 : e3;
          }
          set underlineVariantOffset(e3) {
            this._ext &= 536870911, this._ext |= e3 << 29 & 3758096384;
          }
          constructor(e3 = 0, t3 = 0) {
            this._ext = 0, this._urlId = 0, this._ext = e3, this._urlId = t3;
          }
          clone() {
            return new s2(this._ext, this._urlId);
          }
          isEmpty() {
            return 0 === this.underlineStyle && 0 === this._urlId;
          }
        }
        t2.ExtendedAttrs = s2;
      }, 782: (e2, t2, i2) => {
        Object.defineProperty(t2, "__esModule", { value: true }), t2.CellData = void 0;
        const s2 = i2(133), r = i2(855), o = i2(147);
        class n extends o.AttributeData {
          constructor() {
            super(...arguments), this.content = 0, this.fg = 0, this.bg = 0, this.extended = new o.ExtendedAttrs(), this.combinedData = "";
          }
          static fromCharData(e3) {
            const t3 = new n();
            return t3.setFromCharData(e3), t3;
          }
          isCombined() {
            return 2097152 & this.content;
          }
          getWidth() {
            return this.content >> 22;
          }
          getChars() {
            return 2097152 & this.content ? this.combinedData : 2097151 & this.content ? (0, s2.stringFromCodePoint)(2097151 & this.content) : "";
          }
          getCode() {
            return this.isCombined() ? this.combinedData.charCodeAt(this.combinedData.length - 1) : 2097151 & this.content;
          }
          setFromCharData(e3) {
            this.fg = e3[r.CHAR_DATA_ATTR_INDEX], this.bg = 0;
            let t3 = false;
            if (e3[r.CHAR_DATA_CHAR_INDEX].length > 2) t3 = true;
            else if (2 === e3[r.CHAR_DATA_CHAR_INDEX].length) {
              const i3 = e3[r.CHAR_DATA_CHAR_INDEX].charCodeAt(0);
              if (55296 <= i3 && i3 <= 56319) {
                const s3 = e3[r.CHAR_DATA_CHAR_INDEX].charCodeAt(1);
                56320 <= s3 && s3 <= 57343 ? this.content = 1024 * (i3 - 55296) + s3 - 56320 + 65536 | e3[r.CHAR_DATA_WIDTH_INDEX] << 22 : t3 = true;
              } else t3 = true;
            } else this.content = e3[r.CHAR_DATA_CHAR_INDEX].charCodeAt(0) | e3[r.CHAR_DATA_WIDTH_INDEX] << 22;
            t3 && (this.combinedData = e3[r.CHAR_DATA_CHAR_INDEX], this.content = 2097152 | e3[r.CHAR_DATA_WIDTH_INDEX] << 22);
          }
          getAsCharData() {
            return [this.fg, this.getChars(), this.getWidth(), this.getCode()];
          }
        }
        t2.CellData = n;
      }, 855: (e2, t2) => {
        Object.defineProperty(t2, "__esModule", { value: true }), t2.WHITESPACE_CELL_CODE = t2.WHITESPACE_CELL_WIDTH = t2.WHITESPACE_CELL_CHAR = t2.NULL_CELL_CODE = t2.NULL_CELL_WIDTH = t2.NULL_CELL_CHAR = t2.CHAR_DATA_CODE_INDEX = t2.CHAR_DATA_WIDTH_INDEX = t2.CHAR_DATA_CHAR_INDEX = t2.CHAR_DATA_ATTR_INDEX = t2.DEFAULT_EXT = t2.DEFAULT_ATTR = t2.DEFAULT_COLOR = void 0, t2.DEFAULT_COLOR = 0, t2.DEFAULT_ATTR = 256 | t2.DEFAULT_COLOR << 9, t2.DEFAULT_EXT = 0, t2.CHAR_DATA_ATTR_INDEX = 0, t2.CHAR_DATA_CHAR_INDEX = 1, t2.CHAR_DATA_WIDTH_INDEX = 2, t2.CHAR_DATA_CODE_INDEX = 3, t2.NULL_CELL_CHAR = "", t2.NULL_CELL_WIDTH = 1, t2.NULL_CELL_CODE = 0, t2.WHITESPACE_CELL_CHAR = " ", t2.WHITESPACE_CELL_WIDTH = 1, t2.WHITESPACE_CELL_CODE = 32;
      }, 133: (e2, t2) => {
        Object.defineProperty(t2, "__esModule", { value: true }), t2.Utf8ToUtf32 = t2.StringToUtf32 = t2.utf32ToString = t2.stringFromCodePoint = void 0, t2.stringFromCodePoint = function(e3) {
          return e3 > 65535 ? (e3 -= 65536, String.fromCharCode(55296 + (e3 >> 10)) + String.fromCharCode(e3 % 1024 + 56320)) : String.fromCharCode(e3);
        }, t2.utf32ToString = function(e3, t3 = 0, i2 = e3.length) {
          let s2 = "";
          for (let r = t3; r < i2; ++r) {
            let t4 = e3[r];
            t4 > 65535 ? (t4 -= 65536, s2 += String.fromCharCode(55296 + (t4 >> 10)) + String.fromCharCode(t4 % 1024 + 56320)) : s2 += String.fromCharCode(t4);
          }
          return s2;
        }, t2.StringToUtf32 = class {
          constructor() {
            this._interim = 0;
          }
          clear() {
            this._interim = 0;
          }
          decode(e3, t3) {
            const i2 = e3.length;
            if (!i2) return 0;
            let s2 = 0, r = 0;
            if (this._interim) {
              const i3 = e3.charCodeAt(r++);
              56320 <= i3 && i3 <= 57343 ? t3[s2++] = 1024 * (this._interim - 55296) + i3 - 56320 + 65536 : (t3[s2++] = this._interim, t3[s2++] = i3), this._interim = 0;
            }
            for (let o = r; o < i2; ++o) {
              const r2 = e3.charCodeAt(o);
              if (55296 <= r2 && r2 <= 56319) {
                if (++o >= i2) return this._interim = r2, s2;
                const n = e3.charCodeAt(o);
                56320 <= n && n <= 57343 ? t3[s2++] = 1024 * (r2 - 55296) + n - 56320 + 65536 : (t3[s2++] = r2, t3[s2++] = n);
              } else 65279 !== r2 && (t3[s2++] = r2);
            }
            return s2;
          }
        }, t2.Utf8ToUtf32 = class {
          constructor() {
            this.interim = new Uint8Array(3);
          }
          clear() {
            this.interim.fill(0);
          }
          decode(e3, t3) {
            const i2 = e3.length;
            if (!i2) return 0;
            let s2, r, o, n, a = 0, h = 0, l = 0;
            if (this.interim[0]) {
              let s3 = false, r2 = this.interim[0];
              r2 &= 192 == (224 & r2) ? 31 : 224 == (240 & r2) ? 15 : 7;
              let o2, n2 = 0;
              for (; (o2 = 63 & this.interim[++n2]) && n2 < 4; ) r2 <<= 6, r2 |= o2;
              const h2 = 192 == (224 & this.interim[0]) ? 2 : 224 == (240 & this.interim[0]) ? 3 : 4, c2 = h2 - n2;
              for (; l < c2; ) {
                if (l >= i2) return 0;
                if (o2 = e3[l++], 128 != (192 & o2)) {
                  l--, s3 = true;
                  break;
                }
                this.interim[n2++] = o2, r2 <<= 6, r2 |= 63 & o2;
              }
              s3 || (2 === h2 ? r2 < 128 ? l-- : t3[a++] = r2 : 3 === h2 ? r2 < 2048 || r2 >= 55296 && r2 <= 57343 || 65279 === r2 || (t3[a++] = r2) : r2 < 65536 || r2 > 1114111 || (t3[a++] = r2)), this.interim.fill(0);
            }
            const c = i2 - 4;
            let d = l;
            for (; d < i2; ) {
              for (; !(!(d < c) || 128 & (s2 = e3[d]) || 128 & (r = e3[d + 1]) || 128 & (o = e3[d + 2]) || 128 & (n = e3[d + 3])); ) t3[a++] = s2, t3[a++] = r, t3[a++] = o, t3[a++] = n, d += 4;
              if (s2 = e3[d++], s2 < 128) t3[a++] = s2;
              else if (192 == (224 & s2)) {
                if (d >= i2) return this.interim[0] = s2, a;
                if (r = e3[d++], 128 != (192 & r)) {
                  d--;
                  continue;
                }
                if (h = (31 & s2) << 6 | 63 & r, h < 128) {
                  d--;
                  continue;
                }
                t3[a++] = h;
              } else if (224 == (240 & s2)) {
                if (d >= i2) return this.interim[0] = s2, a;
                if (r = e3[d++], 128 != (192 & r)) {
                  d--;
                  continue;
                }
                if (d >= i2) return this.interim[0] = s2, this.interim[1] = r, a;
                if (o = e3[d++], 128 != (192 & o)) {
                  d--;
                  continue;
                }
                if (h = (15 & s2) << 12 | (63 & r) << 6 | 63 & o, h < 2048 || h >= 55296 && h <= 57343 || 65279 === h) continue;
                t3[a++] = h;
              } else if (240 == (248 & s2)) {
                if (d >= i2) return this.interim[0] = s2, a;
                if (r = e3[d++], 128 != (192 & r)) {
                  d--;
                  continue;
                }
                if (d >= i2) return this.interim[0] = s2, this.interim[1] = r, a;
                if (o = e3[d++], 128 != (192 & o)) {
                  d--;
                  continue;
                }
                if (d >= i2) return this.interim[0] = s2, this.interim[1] = r, this.interim[2] = o, a;
                if (n = e3[d++], 128 != (192 & n)) {
                  d--;
                  continue;
                }
                if (h = (7 & s2) << 18 | (63 & r) << 12 | (63 & o) << 6 | 63 & n, h < 65536 || h > 1114111) continue;
                t3[a++] = h;
              }
            }
            return a;
          }
        };
      }, 776: function(e2, t2, i2) {
        var s2 = this && this.__decorate || function(e3, t3, i3, s3) {
          var r2, o2 = arguments.length, n2 = o2 < 3 ? t3 : null === s3 ? s3 = Object.getOwnPropertyDescriptor(t3, i3) : s3;
          if ("object" == typeof Reflect && "function" == typeof Reflect.decorate) n2 = Reflect.decorate(e3, t3, i3, s3);
          else for (var a2 = e3.length - 1; a2 >= 0; a2--) (r2 = e3[a2]) && (n2 = (o2 < 3 ? r2(n2) : o2 > 3 ? r2(t3, i3, n2) : r2(t3, i3)) || n2);
          return o2 > 3 && n2 && Object.defineProperty(t3, i3, n2), n2;
        }, r = this && this.__param || function(e3, t3) {
          return function(i3, s3) {
            t3(i3, s3, e3);
          };
        };
        Object.defineProperty(t2, "__esModule", { value: true }), t2.traceCall = t2.setTraceLogger = t2.LogService = void 0;
        const o = i2(859), n = i2(97), a = { trace: n.LogLevelEnum.TRACE, debug: n.LogLevelEnum.DEBUG, info: n.LogLevelEnum.INFO, warn: n.LogLevelEnum.WARN, error: n.LogLevelEnum.ERROR, off: n.LogLevelEnum.OFF };
        let h, l = t2.LogService = class extends o.Disposable {
          get logLevel() {
            return this._logLevel;
          }
          constructor(e3) {
            super(), this._optionsService = e3, this._logLevel = n.LogLevelEnum.OFF, this._updateLogLevel(), this.register(this._optionsService.onSpecificOptionChange("logLevel", () => this._updateLogLevel())), h = this;
          }
          _updateLogLevel() {
            this._logLevel = a[this._optionsService.rawOptions.logLevel];
          }
          _evalLazyOptionalParams(e3) {
            for (let t3 = 0; t3 < e3.length; t3++) "function" == typeof e3[t3] && (e3[t3] = e3[t3]());
          }
          _log(e3, t3, i3) {
            this._evalLazyOptionalParams(i3), e3.call(console, (this._optionsService.options.logger ? "" : "xterm.js: ") + t3, ...i3);
          }
          trace(e3, ...t3) {
            var _a2;
            this._logLevel <= n.LogLevelEnum.TRACE && this._log(((_a2 = this._optionsService.options.logger) == null ? void 0 : _a2.trace.bind(this._optionsService.options.logger)) ?? console.log, e3, t3);
          }
          debug(e3, ...t3) {
            var _a2;
            this._logLevel <= n.LogLevelEnum.DEBUG && this._log(((_a2 = this._optionsService.options.logger) == null ? void 0 : _a2.debug.bind(this._optionsService.options.logger)) ?? console.log, e3, t3);
          }
          info(e3, ...t3) {
            var _a2;
            this._logLevel <= n.LogLevelEnum.INFO && this._log(((_a2 = this._optionsService.options.logger) == null ? void 0 : _a2.info.bind(this._optionsService.options.logger)) ?? console.info, e3, t3);
          }
          warn(e3, ...t3) {
            var _a2;
            this._logLevel <= n.LogLevelEnum.WARN && this._log(((_a2 = this._optionsService.options.logger) == null ? void 0 : _a2.warn.bind(this._optionsService.options.logger)) ?? console.warn, e3, t3);
          }
          error(e3, ...t3) {
            var _a2;
            this._logLevel <= n.LogLevelEnum.ERROR && this._log(((_a2 = this._optionsService.options.logger) == null ? void 0 : _a2.error.bind(this._optionsService.options.logger)) ?? console.error, e3, t3);
          }
        };
        t2.LogService = l = s2([r(0, n.IOptionsService)], l), t2.setTraceLogger = function(e3) {
          h = e3;
        }, t2.traceCall = function(e3, t3, i3) {
          if ("function" != typeof i3.value) throw new Error("not supported");
          const s3 = i3.value;
          i3.value = function(...e4) {
            if (h.logLevel !== n.LogLevelEnum.TRACE) return s3.apply(this, e4);
            h.trace(`GlyphRenderer#${s3.name}(${e4.map((e5) => JSON.stringify(e5)).join(", ")})`);
            const t4 = s3.apply(this, e4);
            return h.trace(`GlyphRenderer#${s3.name} return`, t4), t4;
          };
        };
      }, 726: (e2, t2) => {
        Object.defineProperty(t2, "__esModule", { value: true }), t2.createDecorator = t2.getServiceDependencies = t2.serviceRegistry = void 0;
        const i2 = "di$target", s2 = "di$dependencies";
        t2.serviceRegistry = /* @__PURE__ */ new Map(), t2.getServiceDependencies = function(e3) {
          return e3[s2] || [];
        }, t2.createDecorator = function(e3) {
          if (t2.serviceRegistry.has(e3)) return t2.serviceRegistry.get(e3);
          const r = function(e4, t3, o) {
            if (3 !== arguments.length) throw new Error("@IServiceName-decorator can only be used to decorate a parameter");
            !function(e5, t4, r2) {
              t4[i2] === t4 ? t4[s2].push({ id: e5, index: r2 }) : (t4[s2] = [{ id: e5, index: r2 }], t4[i2] = t4);
            }(r, e4, o);
          };
          return r.toString = () => e3, t2.serviceRegistry.set(e3, r), r;
        };
      }, 97: (e2, t2, i2) => {
        Object.defineProperty(t2, "__esModule", { value: true }), t2.IDecorationService = t2.IUnicodeService = t2.IOscLinkService = t2.IOptionsService = t2.ILogService = t2.LogLevelEnum = t2.IInstantiationService = t2.ICharsetService = t2.ICoreService = t2.ICoreMouseService = t2.IBufferService = void 0;
        const s2 = i2(726);
        var r;
        t2.IBufferService = (0, s2.createDecorator)("BufferService"), t2.ICoreMouseService = (0, s2.createDecorator)("CoreMouseService"), t2.ICoreService = (0, s2.createDecorator)("CoreService"), t2.ICharsetService = (0, s2.createDecorator)("CharsetService"), t2.IInstantiationService = (0, s2.createDecorator)("InstantiationService"), function(e3) {
          e3[e3.TRACE = 0] = "TRACE", e3[e3.DEBUG = 1] = "DEBUG", e3[e3.INFO = 2] = "INFO", e3[e3.WARN = 3] = "WARN", e3[e3.ERROR = 4] = "ERROR", e3[e3.OFF = 5] = "OFF";
        }(r || (t2.LogLevelEnum = r = {})), t2.ILogService = (0, s2.createDecorator)("LogService"), t2.IOptionsService = (0, s2.createDecorator)("OptionsService"), t2.IOscLinkService = (0, s2.createDecorator)("OscLinkService"), t2.IUnicodeService = (0, s2.createDecorator)("UnicodeService"), t2.IDecorationService = (0, s2.createDecorator)("DecorationService");
      } }, t = {};
      function i(s2) {
        var r = t[s2];
        if (void 0 !== r) return r.exports;
        var o = t[s2] = { exports: {} };
        return e[s2].call(o.exports, o, o.exports, i), o.exports;
      }
      var s = {};
      return (() => {
        var e2 = s;
        Object.defineProperty(e2, "__esModule", { value: true }), e2.WebglAddon = void 0;
        const t2 = i(345), r = i(859), o = i(399), n = i(666), a = i(776);
        class h extends r.Disposable {
          constructor(e3) {
            if (o.isSafari && (0, o.getSafariVersion)() < 16) {
              const e4 = { antialias: false, depth: false, preserveDrawingBuffer: true };
              if (!document.createElement("canvas").getContext("webgl2", e4)) throw new Error("Webgl2 is only supported on Safari 16 and above");
            }
            super(), this._preserveDrawingBuffer = e3, this._onChangeTextureAtlas = this.register(new t2.EventEmitter()), this.onChangeTextureAtlas = this._onChangeTextureAtlas.event, this._onAddTextureAtlasCanvas = this.register(new t2.EventEmitter()), this.onAddTextureAtlasCanvas = this._onAddTextureAtlasCanvas.event, this._onRemoveTextureAtlasCanvas = this.register(new t2.EventEmitter()), this.onRemoveTextureAtlasCanvas = this._onRemoveTextureAtlasCanvas.event, this._onContextLoss = this.register(new t2.EventEmitter()), this.onContextLoss = this._onContextLoss.event;
          }
          activate(e3) {
            const i2 = e3._core;
            if (!e3.element) return void this.register(i2.onWillOpen(() => this.activate(e3)));
            this._terminal = e3;
            const s2 = i2.coreService, o2 = i2.optionsService, h2 = i2, l = h2._renderService, c = h2._characterJoinerService, d = h2._charSizeService, _ = h2._coreBrowserService, u = h2._decorationService, g = h2._logService, v = h2._themeService;
            (0, a.setTraceLogger)(g), this._renderer = this.register(new n.WebglRenderer(e3, c, d, _, s2, u, o2, v, this._preserveDrawingBuffer)), this.register((0, t2.forwardEvent)(this._renderer.onContextLoss, this._onContextLoss)), this.register((0, t2.forwardEvent)(this._renderer.onChangeTextureAtlas, this._onChangeTextureAtlas)), this.register((0, t2.forwardEvent)(this._renderer.onAddTextureAtlasCanvas, this._onAddTextureAtlasCanvas)), this.register((0, t2.forwardEvent)(this._renderer.onRemoveTextureAtlasCanvas, this._onRemoveTextureAtlasCanvas)), l.setRenderer(this._renderer), this.register((0, r.toDisposable)(() => {
              const t3 = this._terminal._core._renderService;
              t3.setRenderer(this._terminal._core._createRenderer()), t3.handleResize(e3.cols, e3.rows);
            }));
          }
          get textureAtlas() {
            var _a2;
            return (_a2 = this._renderer) == null ? void 0 : _a2.textureAtlas;
          }
          clearTextureAtlas() {
            var _a2;
            (_a2 = this._renderer) == null ? void 0 : _a2.clearTextureAtlas();
          }
        }
        e2.WebglAddon = h;
      })(), s;
    })());
  })(addonWebgl);
  return addonWebgl.exports;
}
var addonWebglExports = requireAddonWebgl();
const _Term = class _Term extends xtermExports.Terminal {
  constructor(options) {
    super({
      rows: 30,
      cols: 97,
      fontFamily: `'Fira Code', 'Jetbrains Mono', 'Consolas', monospace`,
      allowProposedApi: true,
      cursorBlink: true,
      ...options
    });
    __publicField(this, "doEcho", true);
    this.initEmitter();
    this.loadAddon(new addonUnicode11Exports.Unicode11Addon());
    this.unicode.activeVersion = "11";
    const webglAddon = new addonWebglExports.WebglAddon();
    webglAddon.onContextLoss(() => {
      webglAddon.dispose();
    });
    this.loadAddon(webglAddon);
    this.onData((data) => {
      if (this.doEcho) {
        this.write(this.escape(data));
      }
      if (data === "") {
        this.emit("interrupt");
        return;
      }
      this.emit("data", data);
    });
  }
  getCharWidth(char) {
    return this._core.unicodeService._activeProvider.wcwidth(char.charCodeAt(0));
  }
  getStringWidth(str) {
    return [...stripAnsi(str)].map((char) => this.getCharWidth(char)).sum();
  }
  escape(str) {
    return str.replace(/[\x00-\x1F]/g, (char) => {
      if (char === "") return "";
      if (char === "\r") return "\r\n";
      else return `^${String.fromCharCode(char.charCodeAt(0) + 64)}`;
    }).replace(/\x7F/g, "\b \b");
  }
};
mixin(_Term, Emitter);
let Term = _Term;
var Vfs;
((Vfs2) => {
  Vfs2.dir = (children = {}) => {
    return {
      type: FileT.DIR,
      children
    };
  };
  Vfs2.normal = (content) => ({
    type: FileT.NORMAL,
    content
  });
  Vfs2.jsExe = (programName) => ({
    type: FileT.JSEXE,
    programName
  });
  Vfs2.create = (fs, vroot) => {
    const queue = [{ vfile: vroot, entries: {}, name: "" }];
    let rootInode;
    while (queue.length) {
      const { vfile: tree, entries, name } = queue.shift();
      let file;
      if (tree.type === FileT.DIR) {
        file = {
          type: FileT.DIR,
          entries: {}
        };
        for (const [name2, child] of Object.entries(tree.children)) {
          queue.push({ vfile: child, entries: file.entries, name: name2 });
        }
      } else {
        file = tree;
      }
      const iid = fs.inodeBitmap.getFree(1);
      if (iid === -1) return FOp.err({ type: FOp.T.OUT_OF_INODES });
      const inode = { iid, file };
      fs.inodes.set(iid, inode);
      if (!rootInode) rootInode = inode;
      entries[name] = iid;
    }
    return {
      type: FOp.T.OK,
      inode: rootInode
    };
  };
})(Vfs || (Vfs = {}));
const wrapProgram = (program) => {
  const wrapped = async (proc, name, ...args) => {
    try {
      return await program(proc, name, ...args);
    } catch (err) {
      if (typeof err === "number") {
        return err;
      }
      if (typeof err === "string" || Array.isArray(err)) {
        proc.error(err);
        return 1;
      }
      throw err;
    }
  };
  const source = `wrapProgram(${program.toString()})
`;
  wrapped.toString = () => source;
  return wrapped;
};
class Command {
  constructor(name, args, description = "") {
    __publicField(this, "optionTypes", {});
    __publicField(this, "optionDescriptions", {});
    __publicField(this, "optionLongForms", {});
    __publicField(this, "optionShortForms", {});
    __publicField(this, "longOptions", {});
    __publicField(this, "shortOptions", {});
    __publicField(this, "helpOption", null);
    __publicField(this, "usageMessage", null);
    __publicField(this, "actionWhenUnknownOption", "throw");
    this.name = name;
    this.args = args;
    this.description = description;
  }
  whenUnknownOption(action) {
    this.actionWhenUnknownOption = action;
    return this;
  }
  option(name, format, typeDef, description = "") {
    const that = this;
    const forms = format.split(",").map((str) => str.trim());
    forms.forEach((form) => {
      if (form.startsWith("--")) {
        const longForm = form.slice(2);
        that.longOptions[longForm] = name;
        this.optionLongForms[name] = longForm;
      } else if (form.startsWith("-")) {
        const shortForm = form.slice(1);
        that.shortOptions[shortForm] = name;
        this.optionShortForms[name] = shortForm;
      } else {
        throw `option: Invalid option format: '${form}'`;
      }
    });
    that.optionTypes[name] = typeDef;
    that.optionDescriptions[name] = description;
    return that;
  }
  usage(message) {
    this.usageMessage = message;
    return this;
  }
  help(name, format = "--help", description = "Show this help message") {
    this.helpOption = name;
    return this.option(name, format, "boolean", description);
  }
  runHelp(proc) {
    const title = chalk.bold.cyanBright;
    const { stdio } = proc;
    if (this.description) stdio.writeLn(`${this.description}
`);
    stdio.writeLn(`${title("Usage:")} ${this.name} ${this.args}`);
    if (this.usageMessage) stdio.writeLn(this.usageMessage);
    stdio.writeLn("");
    const optionNames = Object.keys(this.optionTypes);
    if (optionNames.length) {
      stdio.writeLn(title("Options:"));
      const maxShortOptionLength = Object.keys(this.shortOptions).map(prop("length")).max();
      const maxLongOptionLength = Object.keys(this.longOptions).map(prop("length")).max();
      optionNames.forEach((name) => {
        const shortForm = this.optionShortForms[name];
        const longForm = this.optionLongForms[name];
        stdio.writeLn(
          `${(mapOrNull(shortForm, (form) => `-${form}`) ?? "").padStart(maxShortOptionLength + 3)}` + (shortForm && longForm ? ", " : "  ") + `${(mapOrNull(longForm, (form) => `--${form}`) ?? "").padEnd(maxLongOptionLength + 2)}  ${this.optionDescriptions[name]}`
        );
      });
    }
    return 0;
  }
  program(handler) {
    return wrapProgram(async (proc, name, ...rawArgs) => {
      const options = {};
      const args = [];
      let optionFinished = false;
      let i = 0;
      const validateOption = (name2, type, arg) => {
        if (type === "string") return arg;
        if (type === "number") {
          const value = Number(arg);
          if (isNaN(value)) throw `Option ${name2} requires a number`;
          return value;
        }
        if (type === "integer") {
          const value = Number(arg);
          if (isNaN(value) || !Number.isInteger(value)) throw `Option ${name2} requires an integer`;
          return value;
        }
      };
      while (i < rawArgs.length) {
        const arg = rawArgs[i++];
        if (!optionFinished && arg === "--") {
          optionFinished = true;
          continue;
        }
        if (optionFinished || !arg.startsWith("-") || arg.length === 1) {
          args.push(arg);
          continue;
        }
        let booleanValue = true;
        let optionName;
        if (arg.startsWith("--")) {
          if (arg.startsWith("--no-")) {
            booleanValue = false;
            optionName = this.longOptions[arg.slice(5)];
          } else {
            optionName = this.longOptions[arg.slice(2)];
          }
        } else {
          optionName = this.shortOptions[arg.slice(1)];
        }
        if (!optionName) {
          switch (this.actionWhenUnknownOption) {
            case "throw":
              throw `Unknown option: ${arg}`;
            case "ignore":
              continue;
            case "make-arg":
              args.push(arg);
              continue;
          }
        }
        const optionType = this.optionTypes[optionName];
        if (optionType === "boolean") {
          if (optionName === this.helpOption) {
            return this.runHelp(proc);
          }
          options[optionName] = booleanValue;
          continue;
        }
        if (i === args.length) throw `Option ${arg} requires an argument`;
        const optionArg = rawArgs[i++];
        if (optionType.endsWith("[]")) {
          const arr = options[optionName] ?? (options[optionName] = []);
          arr.push(validateOption(`${optionName}[${arr.length}]`, optionType.slice(0, -2), optionArg));
        } else {
          options[optionName] = validateOption(optionName, optionType, optionArg);
        }
      }
      return handler({ proc, name, options }, ...args);
    });
  }
}
const createCommand = (name, args, description) => new Command(name, args, description);
const cat = createCommand("cat", "<FILE...>", "Concatenate FILE(s) to standard output.").help("help").usage("With no FILE, or when FILE is -, read standard input.").program(async ({ proc }, ...paths) => {
  proc.staticName = "cat";
  const { stdio, ctx: ctx2 } = proc;
  const eol = chalk.blackBright(chalk.bgWhiteBright("%")) + "\n";
  const writeEolBy = (str) => {
    var _a2;
    if (!str.endsWith("\n")) (_a2 = stdio.stdout) == null ? void 0 : _a2.write(eol);
  };
  let hasError = false;
  if (!paths.length) paths.push("-");
  for (const path of paths) {
    if (path === "-") {
      const data = await stdio.read();
      stdio.write(data);
      writeEolBy(data);
      return 0;
    }
    try {
      const fh = ctx2.fs.openU(path, "r").handle;
      const data = fh.read();
      stdio.write(data);
      writeEolBy(data);
    } catch (err) {
      proc.error(err);
      hasError = true;
    }
  }
  return hasError ? 1 : 0;
});
const fs_inodemap = (proc) => {
  const { stdio, ctx: ctx2 } = proc;
  proc.staticName = "fs_inodemap";
  const used = ctx2.fs.inodeBitmap.usedCount;
  const total = MAX_INODE_COUNT;
  stdio.writeLn(`${used}/${total} (${(used / total).toPercent(2)}) inodes used`);
  return 0;
};
const fs_format = wrapProgram((proc) => {
  proc.staticName = "fs_format";
  proc.ctx.fs.reset();
  proc.stdio.writeLn("File system formatted");
  return 0;
});
class GridDisplay {
  constructor(term, cells, {
    minWidth = 6,
    useEqualWidth = false,
    gap = 2,
    direction = "col"
  } = {}) {
    __publicField(this, "colWidths");
    __publicField(this, "rows");
    __publicField(this, "cols");
    __publicField(this, "options");
    this.term = term;
    this.cells = cells;
    this.options = { minWidth, useEqualWidth, gap, direction };
    if (!cells.length) {
      this.rows = 0;
      this.cols = 0;
      this.colWidths = [];
      return;
    }
    if (useEqualWidth) {
      const colWidth = Math.max(minWidth, cells.map((str) => term.getStringWidth(str)).max()) + gap;
      const maxCols = Math.floor((term.cols + gap) / colWidth);
      this.rows = Math.ceil(cells.length / maxCols);
      this.cols = Math.ceil(cells.length / this.rows);
      this.colWidths = Array.replicate(this.cols, colWidth);
      return;
    }
    const widths = cells.map((str) => term.getStringWidth(str) + gap);
    const maxRows = this.calcMaxRows(widths);
    const { rows, colWidths } = Array.range(maxRows, 0, -1).findMap((rows2) => {
      const colWidths2 = Array.range(0, Math.ceil(widths.length / rows2)).map(
        (col) => widths.slice(col * rows2, (col + 1) * rows2).max()
      );
      if (colWidths2.sum() - gap > term.cols) return Control.continue;
      return { rows: rows2, colWidths: colWidths2 };
    });
    const cols = colWidths.length;
    this.rows = rows;
    this.cols = cols;
    this.colWidths = colWidths;
  }
  calcMaxRows(widths) {
    const { cols: termWidth } = this.term;
    const sortedWidths = [...widths].sort((a, b) => b - a);
    let width = 0;
    let col = 0;
    for (const w of sortedWidths) {
      width += w;
      if (width > termWidth) break;
      col++;
    }
    col || (col = 1);
    return Math.ceil(widths.length / col);
  }
  toString({
    formatter = id
  } = {}) {
    return Array.range(0, this.rows).map(
      (row) => Array.range(0, this.cols).map((col) => {
        const index = this.options.direction === "col" ? row + col * this.rows : col + row * this.cols;
        const cell = this.cells[index] ?? "";
        const padWidth = this.colWidths[col] - this.options.gap - this.term.getStringWidth(cell);
        return formatter(cell + " ".repeat(padWidth), index) + (col === this.cols - 1 ? "\n" : " ".repeat(this.options.gap));
      }).join("")
    ).join("");
  }
}
const ls = createCommand("ls", "<path...>", "List directory contents").help("help").option("all", "--all, -a", "boolean", "Show hidden files").option("color", "--color, -c", "boolean", "Colorize the output").program(({ proc, options }, ...paths) => {
  const { stdio, ctx: ctx2 } = proc;
  proc.staticName = "ls";
  options.color ?? (options.color = true);
  const entries = [];
  const errs = [];
  if (!paths.length) paths.push("");
  paths.forEach((path) => {
    try {
      const { file } = ctx2.fs.findU(path);
      entries.push({ file, path });
    } catch (err) {
      errs.push(err);
    }
  });
  proc.error(errs);
  const [dirEntries, otherEntries] = entries.divideWith((entry) => entry.file.type === FileT.DIR);
  const outputs = [];
  if (otherEntries.length)
    outputs.push(new GridDisplay(ctx2.term, otherEntries.map(prop("path"))).toString());
  outputs.push(...dirEntries.map(({ file: dir, path }) => (paths.length > 1 ? `${path}:
` : "") + new GridDisplay(
    ctx2.term,
    Object.keys(dir.entries).filter((name) => options.all || !name.startsWith(".")).map((name) => {
      if (!options.color) return name;
      const child = ctx2.fs.getChild(dir, name);
      let display = name;
      if (!child) {
        display = chalk.redBright(display);
      } else if (child.type === FileT.DIR) {
        display = chalk.blueBright(display) + "/";
      } else if (child.type === FileT.JSEXE) {
        display = chalk.greenBright(display) + "*";
      }
      return display;
    })
  )));
  stdio.write(outputs.join("\n"));
  return errs.length ? 1 : 0;
});
const mkdir = createCommand("mkdir", "<DIRECTORY...>", "Create the DIRECTORY(ies), if they do not already exist.").help("help").option("parent", "--parent, -p", "boolean", "Create parent directories as needed").option("verbose", "--verbose, -v", "boolean", "Print a message for each created directory").program(async ({ proc, options }, ...paths) => {
  const { ctx: ctx2 } = proc;
  proc.staticName = "mkdir";
  if (!paths.length) {
    throw "Missing operand";
  }
  const errs = [];
  for (const path of paths) {
    try {
      ctx2.fs.mkdirU(path);
      if (options.verbose) {
        proc.log(`Created directory '${path}'`);
      }
    } catch (err) {
      errs.push(err);
    }
  }
  if (errs.length) {
    proc.error(errs);
    return 1;
  }
  return 0;
});
const pwd = wrapProgram((proc) => {
  proc.stdio.writeLn(proc.cwd);
  return 0;
});
var Path;
((Path2) => {
  Path2.hasSlash = (path) => path.includes("/");
  Path2.isAbs = (path) => path.startsWith("/");
  Path2.isRel = (path) => path.match(/^\.\.?(\/|$)/);
  Path2.isAbsOrRel = (path) => (0, Path2.isAbs)(path) || (0, Path2.isRel)(path);
  Path2.split = (path, doKeepSlashAtEnd = false) => path.split("/").filter((part, i, parts) => part || !i || i === parts.length - 1 && doKeepSlashAtEnd);
  Path2.trimSlash = (segment) => segment.replace(/\/+$/, "");
  Path2.join = (...segments) => segments.map(Path2.trimSlash).join("/");
  Path2.getDirAndName = (path, doKeepSlashAtEnd = false) => {
    if (!(0, Path2.isAbs)(path)) path = `./${path}`;
    const parts = (0, Path2.split)(path, doKeepSlashAtEnd);
    const filename = parts.pop();
    const dirname = parts.join("/") + "/";
    return { dirname, filename };
  };
  Path2.isLegalFilename = (name) => !!name && !name.includes("/");
  Path2.normalize = (path) => {
    const parts = (0, Path2.split)(path || ".", true);
    if (!["", ".", ".."].includes(parts.at(0))) parts.unshift(".");
    const normalizedParts = [];
    normalizedParts.push(parts[0]);
    for (let i = 1; i < parts.length; i++) {
      const part = parts[i];
      if (part === "..") normalizedParts.pop();
      else if (part !== ".") normalizedParts.push(part);
    }
    return normalizedParts.join("/");
  };
})(Path || (Path = {}));
Object.assign(window, { Path });
const _rmX = async (ctx2, options, path, parentInode, filename, inode) => {
  var _a2;
  const fail = (err, path2) => {
    var _a3;
    if (!(options.force && err.type === FOp.T.NOT_FOUND)) (_a3 = options.onErr) == null ? void 0 : _a3.call(options, err, path2);
  };
  $isDir: if (ctx2.fs.isInodeOfType(inode, [FileT.DIR])) {
    const { file } = inode;
    const childnames = Object.keys(file.entries);
    if (!childnames.length && options.dir) break $isDir;
    if (!options.recursive)
      return fail(FOp.err({ type: FOp.T.IS_A_DIR }), path);
    if (options.onPromptEnter && !await options.onPromptEnter(path)) break $isDir;
    let childFailed = false;
    for (const childname of childnames) {
      const childpath = Path.join(path, childname);
      const childInode = ctx2.fs.getChildInode(file, childname);
      if (!childInode) {
        childFailed = true;
        fail(FOp.err({ type: FOp.T.NOT_FOUND }), childpath);
        continue;
      }
      await _rmX(ctx2, options, childpath, inode, childname, childInode);
    }
    if (childFailed) return fail(FOp.err({ type: FOp.T.IS_A_DIR }), path);
  }
  if (options.onPromptRm && !await options.onPromptRm(inode.file.type, path)) return;
  ctx2.fs.rmWhere(parentInode, filename);
  (_a2 = options.onOk) == null ? void 0 : _a2.call(options, path);
};
const rmX = async (ctx2, path, options) => {
  const { parentInode, inode, filename } = ctx2.fs.findInodeU(path);
  if (!parentInode) return;
  await _rmX(ctx2, options, path, parentInode, filename, inode);
};
const rm = createCommand("rm", "<FILE...>", "Remove (unlink) the FILE(s).").help("help").option("dir", "--dir, -d", "boolean", "Remove empty directories.").option("force", "--force, -f", "boolean", "Ignore nonexistent files and arguments, never prompt.").option("interactive", "--interactive, -i", "boolean", "Prompt before each removal.").option("recursive", "--recursive, -r", "boolean", "Remove directories and their contents recursively.").option("verbose", "--verbose, -v", "boolean", "Explain what is being done.").program(async ({ proc, options }, ...paths) => {
  const { ctx: ctx2, stdio } = proc;
  options.interactive ?? (options.interactive = !options.force);
  for (const path of paths) {
    await rmX(ctx2, path, {
      ...pick(options, ["dir", "recursive", "force"]),
      onPromptEnter: options.interactive ? (path2) => stdio.prompt(`Enter ${displayFileT(FileT.DIR)} '${path2}'?`) : void 0,
      onPromptRm: options.interactive ? (type, path2) => stdio.prompt(`Remove ${displayFileT(type)} '${path2}'?`) : void 0,
      onErr: (err, path2) => {
        ctx2.fs.unwrap(err, `Cannot remove '${path2}'`);
      },
      onOk: (path2) => {
        if (options.verbose) stdio.writeLn(`Removed '${path2}'`);
      }
    });
  }
  return 0;
});
const cd = wrapProgram(async (proc, self2, ...args) => {
  const { env, ctx: ctx2 } = proc;
  if (args.length === 0) return cd(proc, self2, env.HOME);
  if (args.length > 1) throw "Too many arguments";
  const [path] = args;
  proc.cwd = ctx2.fs.findU(path, { allowedTypes: [FileT.DIR] }).path;
  return 0;
});
const echo = createCommand("echo", "<text...>", "Display a line of text").whenUnknownOption("make-arg").help("help").program(({ proc }, ...args) => {
  proc.stdio.writeLn(args.join(" "));
  return 0;
});
const ESCAPES = {
  "n": "\n",
  "r": "\r",
  "t": "	",
  "a": "\x07",
  "e": "\x1B"
};
var HSH_CHARS;
((HSH_CHARS2) => {
  HSH_CHARS2.white = [..." 	\r\n"];
  HSH_CHARS2.d8 = [..."01234567"];
  HSH_CHARS2.d10 = [...HSH_CHARS2.d8, ..."89"];
  HSH_CHARS2.d16 = [...HSH_CHARS2.d10, ..."abcdefABCDEF"];
  HSH_CHARS2.letter = [..."abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ"];
  HSH_CHARS2.senv = [...HSH_CHARS2.d10, "?"];
  HSH_CHARS2.env = [...HSH_CHARS2.letter, ...HSH_CHARS2.d10, "_"];
})(HSH_CHARS || (HSH_CHARS = {}));
const is = (kind, ch) => HSH_CHARS[kind].includes(ch);
const tokenize = (line, isStrict = true) => {
  const tokens = [];
  let isEsc = false;
  let isNesc = false;
  let isSq = false;
  let isDq = false;
  let isVar = false;
  let isWh = true;
  let now = "";
  let enow = "";
  let vnow = "";
  let begin = 0;
  let i = 0;
  const consumeNow = (d = -1) => {
    if (now) {
      tokens.push({
        type: "text",
        content: now,
        begin,
        end: i - 1 + d,
        isDq,
        isSq
      });
      now = "";
    }
    begin = i - 1;
  };
  const consumeEnow = () => {
    now += String.fromCharCode(parseInt(enow, isNesc === "o" ? 8 : 16));
    isNesc = false;
    enow = "";
  };
  while (true) {
    let ch = line[i++] ?? "\0";
    if (isEsc && isDq) {
      if (ch === "x" || ch === "u" || ch === "0") isNesc = ch === "0" ? "o" : ch;
      else now += ESCAPES[ch] ?? ch;
      isEsc = false;
      continue;
    }
    if (isNesc) {
      if (enow.length < (isNesc === "u" ? 4 : 2)) {
        if (is(isNesc === "o" ? "d8" : "d16", ch)) {
          enow += ch;
          continue;
        } else if (isNesc === "o") consumeEnow();
        else {
          now += isNesc + enow;
          isNesc = false;
          continue;
        }
      } else consumeEnow();
    }
    if (isVar) {
      if (!vnow.length) {
        if (is("senv", ch)) {
          tokens.push({
            type: "variable",
            content: "$" + ch,
            begin,
            end: i - 1
          });
          isVar = false;
          continue;
        } else if (is("env", ch)) {
          vnow += ch;
          continue;
        } else {
          now += "$";
          isVar = false;
        }
      } else {
        if (is("env", ch)) {
          vnow += ch;
          continue;
        } else {
          tokens.push({
            type: "variable",
            content: "$" + vnow,
            begin,
            end: i - 2
          });
          begin = i - 1;
          isVar = false;
          vnow = "";
        }
      }
    }
    if (ch === "\0") break;
    if (is("white", ch) && !isSq && !isDq) {
      if (!isWh) {
        consumeNow();
        isWh = true;
      }
      begin++;
      continue;
    } else isWh = false;
    if (!isDq && !isSq && ch === ">") {
      consumeNow();
      if (line[i] === ">") {
        tokens.push({
          type: "redirect",
          mode: "append",
          begin,
          end: i,
          content: ">>"
        });
        i++;
      } else {
        tokens.push({
          type: "redirect",
          mode: "write",
          begin,
          end: i - 1,
          content: ">"
        });
      }
      begin = i;
    } else if (ch === "\\" && !isSq) isEsc = true;
    else if (ch === "'" && !isDq) {
      if (isSq) {
        consumeNow(0);
        begin = i;
      }
      isSq = !isSq;
    } else if (ch === '"' && !isSq) {
      if (isDq) {
        consumeNow(0);
        begin = i;
      }
      isDq = !isDq;
    } else if (!isDq && !isSq && ch === "~") {
      consumeNow();
      tokens.push({
        type: "home",
        begin,
        end: i - 1,
        content: "~"
      });
      begin = i;
    } else if (!isSq && ch === "$") {
      if (is("env", line[i]) || is("senv", line[i])) {
        consumeNow();
        isVar = true;
      } else now += ch;
    } else now += ch;
  }
  consumeNow();
  if (isStrict) {
    if (isSq) throw "Unmatched single quote";
    if (isDq) throw "Unmatched double quote";
  }
  return tokens;
};
const expand = (tokens, env) => {
  const expanded = [];
  let text = null;
  for (const token of tokens) {
    if (token.type === "redirect") {
      if (text) {
        expanded.push(text);
        text = null;
      }
      expanded.push(token);
      continue;
    } else {
      const content = token.type === "text" ? token.content : token.type === "home" ? env.HOME : token.type === "variable" ? env[token.content.slice(1)] : "";
      if (text) {
        if (text.end + 1 === token.begin) {
          text.content += content;
          text.end = token.end;
          continue;
        } else {
          expanded.push(text);
        }
      }
      text = {
        type: "text",
        content,
        begin: token.begin,
        end: token.end
      };
    }
  }
  if (text) {
    expanded.push(text);
  }
  return expanded;
};
const parse = (tokens) => {
  const script = {
    commands: []
  };
  while (tokens.length) {
    const name = tokens[0].type === "redirect" ? "cat" : tokens.shift().content;
    const command = {
      name,
      args: []
    };
    while (tokens.length) {
      const token = tokens.shift();
      if (token.type === "redirect") {
        const target = tokens.shift();
        if (!target) throw "Expected redirect target, got end of input";
        if (target.type !== "text") throw "Expected redirect target, got " + target.type;
        command.output = {
          type: `${token.mode}To`,
          path: target.content
        };
      } else if (token.type === "text") {
        command.args.push(token.content);
      }
    }
    script.commands.push(command);
  }
  return script;
};
const hsh_tokenize = wrapProgram((proc, _, ...args) => {
  const { stdio, ctx: ctx2 } = proc;
  const raw = args.join(" ");
  const tokens = tokenize(raw, false);
  stdio.writeLn(raw);
  const tokenLine = Array.replicate(ctx2.term.getStringWidth(raw), " ");
  tokens.forEach(({ begin, end }) => {
    if (begin === end) {
      tokenLine[begin] = "┴";
    } else {
      tokenLine[begin] = "└";
      for (let i = begin + 1; i < end; i++) {
        tokenLine[i] = "─";
      }
      tokenLine[end] = "┘";
    }
  });
  stdio.writeLn(tokenLine.join(""));
  stdio.writeLn(
    tokens.map(
      (token) => `[${token.type.padStart(8)}] ${token.begin}:${token.end} "${token.content}"` + ("isSq" in token && token.isSq ? " [sq]" : "") + ("isDq" in token && token.isDq ? " [dq]" : "")
    ).join("\n")
  );
  return 0;
});
class ReadlineHistory {
  constructor(hist = []) {
    __publicField(this, "index");
    this.hist = hist;
    this.index = hist.length - 1;
  }
  get size() {
    return this.hist.length;
  }
  get current() {
    return this.hist[this.index];
  }
  set current(value) {
    this.hist[this.index] = value;
  }
  get isAtBegin() {
    return !this.index;
  }
  get isAtEnd() {
    return this.index === this.size - 1;
  }
  commit() {
    this.hist.push("");
    this.index++;
  }
}
class ReadlineCurrentLine {
  constructor(history = new ReadlineHistory()) {
    __publicField(this, "cursor", 0);
    __publicField(this, "compState", null);
    __publicField(this, "_isDirty", false);
    this.history = history;
  }
  get content() {
    return this.history.current;
  }
  set content(value) {
    this.history.current = value;
  }
  get before() {
    return this.content.slice(0, this.cursor);
  }
  get after() {
    return this.content.slice(this.cursor);
  }
  get isDirty() {
    if (this.history.isAtEnd) return !!this.content;
    return this._isDirty;
  }
  set isDirty(value) {
    if (this.history.isAtEnd) return;
    if (value) {
      this._isDirty = true;
      const { size } = this.history;
      this.history.hist[size - 1] = this.history.current;
      this.history.index = size - 1;
    } else {
      this._isDirty = false;
    }
  }
}
class Readline {
  constructor(proc, stdio = proc.stdio, term) {
    __publicField(this, "isReadingLn", false);
    __publicField(this, "loopHandle", null);
    this.proc = proc;
    this.stdio = stdio;
    this.term = term;
  }
  async _readLn({
    history,
    onComp,
    onBeforeClear,
    onClear
  }) {
    var _a2, _b2;
    const line = new ReadlineCurrentLine(history);
    const w = (str) => this.proc.ctx.term.getStringWidth(str);
    const useComp = !!onComp;
    const hideCursor = "\x1B[?25l";
    const showCursor = "\x1B[?25h";
    const clearScreen = "\x1B[2J\x1B[H";
    const back = (width) => "\b".repeat(width);
    const m = {
      left: (width) => "\x1B[D".repeat(width),
      right: (width) => "\x1B[C".repeat(width),
      up: (height) => "\x1B[A".repeat(height),
      down: (height) => "\x1B[B".repeat(height)
    };
    const clear = (width) => " ".repeat(width);
    const eraseAfter = (width) => clear(width) + back(width);
    const rewrite = (str) => back(w(line.before)) + str + eraseAfter(Math.max(0, w(line.content) - w(str)));
    const write = (char) => this.stdio.write(char);
    const wordBegin = () => {
      let i = line.cursor;
      while (i && line.content[i - 1] === " ") i--;
      while (i && line.content[i - 1] !== " ") i--;
      return i;
    };
    const wordEnd = () => {
      let i = line.cursor;
      while (i !== line.content.length && line.content[i] !== " ") i++;
      while (i !== line.content.length && line.content[i] === " ") i++;
      return i;
    };
    const kill = (length) => {
      markDirty();
      const erased = line.content.slice(line.cursor - length, line.cursor);
      const erasedWidth = w(erased);
      const { after } = line;
      line.content = line.content.slice(0, line.cursor - length) + after;
      write(back(erasedWidth) + after + eraseAfter(erasedWidth) + back(w(after)));
      line.cursor -= length;
    };
    const moveLeft = (length) => {
      markDirty();
      write(m.left(w(line.content.slice(line.cursor - length, line.cursor))));
      line.cursor -= length;
    };
    const moveRight = (length) => {
      markDirty();
      write(m.right(w(line.content.slice(line.cursor, line.cursor + length))));
      line.cursor += length;
    };
    const insert = (str) => {
      markDirty();
      const { after } = line;
      line.content = line.before + str + after;
      line.cursor += str.length;
      write(str + after + back(w(after)));
    };
    const renderComp = (mapIndex) => {
      const { term } = this;
      const { compState } = line;
      if (!compState || !term) return;
      const { display: { grid }, candidates } = compState;
      const index = mapIndex(compState);
      if (index !== null) {
        replaceCandidate(candidates[index]);
      }
      compState.index = index;
      const { cursorX } = term.buffer.active;
      write(
        "\n" + grid.toString({
          formatter: (str, i) => index === i ? chalk.black.bgWhiteBright(stripAnsi(str)) : str
        }) + hideCursor + "\r" + m.up(grid.rows + 1) + m.right(cursorX) + showCursor
      );
    };
    const clearComp = () => {
      const { compState } = line;
      const { term } = this;
      if (!compState || !term) return;
      const { display: { grid } } = compState;
      const { cursorX } = term.buffer.active;
      write(
        ("\n" + clear(term.cols)).repeat(grid.rows) + hideCursor + "\r" + m.up(grid.rows) + m.right(cursorX) + showCursor
      );
      line.compState = null;
    };
    const getCandidate = () => {
      if (!line.compState) return null;
      const { index, candidates } = line.compState;
      if (index === null) return null;
      return candidates[index];
    };
    const replaceCandidate = (target) => {
      let candidate;
      if (line.compState) {
        const { index, candidates } = line.compState;
        candidate = index === null ? "" : candidates[index];
      } else {
        candidate = "";
      }
      write(
        back(w(candidate)) + target + line.after + eraseAfter(Math.max(0, w(candidate) - w(target))) + back(w(line.after))
      );
    };
    const acceptComp = () => {
      const { index, candidates } = line.compState;
      if (index !== null) {
        const candidate = candidates[index];
        line.content = line.before + candidate + line.after;
        line.cursor += candidate.length;
      }
      clearComp();
    };
    const discardComp = () => {
      replaceCandidate("");
      clearComp();
    };
    const markDirty = () => {
      line.isDirty = true;
      if (line.compState && line.compState.index !== null) {
        acceptComp();
      }
    };
    const abortEmitter = new AbortEmitter();
    this.proc.on("interrupt", () => abortEmitter.emit("abort"));
    while (true) {
      const data = await this.stdio.readKey({ abortEmitter });
      if (data === "") {
        if (line.compState) {
          discardComp();
          continue;
        }
        write("\n");
        line.content = "";
        line.cursor = 0;
        return "";
      }
      if (data === "") {
        if (!line.content) return data;
      } else if (data === "\r") {
        if (line.compState) {
          acceptComp();
          continue;
        }
        write("\n");
        const { content } = line;
        if (history && content.trim()) {
          history.commit();
        }
        return content;
      } else if (data === "\x1B") {
        if (line.compState) {
          discardComp();
          continue;
        }
      } else if (data === "" || data === "\b") {
        if (line.cursor) kill(1);
      } else if (data === "	" || data === "\x1B[Z") {
        const dir = data === "	" ? 1 : -1;
        if (useComp) {
          const isNew = !line.compState || !equalBy(line, line.compState.source, ["content", "cursor"]);
          if (isNew) {
            const candidates = onComp(line);
            clearComp();
            if (!candidates.length) {
              line.compState = null;
              continue;
            }
            const commonPrefix = getCommonPrefix(candidates.map(prop("value")));
            if (commonPrefix) {
              insert(commonPrefix);
              continue;
            }
            const grid = new GridDisplay(
              this.term,
              candidates.map(prop("display")),
              { useEqualWidth: true }
            );
            line.compState = {
              source: pick(line, ["content", "cursor"]),
              index: null,
              display: {
                type: "grid",
                grid
              },
              candidates: candidates.map(prop("value")),
              length: candidates.length
            };
          }
          renderComp(({ index, length }) => {
            if (isNew) return index;
            if (index === null) return dir === 1 ? 0 : length - 1;
            else return (index + dir).mod(length);
          });
        }
      } else if (data === "\x1B[A") {
        if (line.compState) {
          renderComp(
            ({ index, length }) => index === null ? null : (index - 1).mod(length)
          );
          continue;
        }
        if (!history || line.isDirty) continue;
        if (history.isAtBegin) continue;
        const prev = history.hist[history.index - 1];
        write(rewrite(prev));
        history.index--;
        line.cursor = prev.length;
        line.isDirty = false;
      } else if (data === "\x1B[B") {
        if (line.compState) {
          renderComp(
            ({ index, length }) => index === null ? null : (index + 1).mod(length)
          );
          continue;
        }
        if (!history || line.isDirty) continue;
        if (history.isAtEnd) continue;
        const next = history.hist[history.index + 1];
        write(rewrite(next));
        history.index++;
        line.cursor = next.length;
        line.isDirty = false;
      } else if (data === "\x1B[C") {
        if (((_a2 = line.compState) == null ? void 0 : _a2.index) != null) {
          renderComp(({ index, length, display: { grid: { cols, rows } } }) => {
            let [row, col] = index.remDiv(rows);
            const lastColHeight = length % rows || rows;
            col++;
            if (col === cols || col === cols - 1 && row >= lastColHeight) {
              col = 0;
              row = (row + 1).mod(rows);
            }
            return col * rows + row;
          });
          continue;
        }
        if (line.cursor === line.content.length) continue;
        moveRight(1);
      } else if (data === "\x1B[1;5C") {
        if (line.cursor === line.content.length) continue;
        moveRight(wordEnd() - line.cursor);
      } else if (data === "\x1B[D") {
        if (((_b2 = line.compState) == null ? void 0 : _b2.index) != null) {
          renderComp(({ index, length, display: { grid: { rows, cols } } }) => {
            const lastColHeight = length % rows || rows;
            let [row, col] = index.remDiv(rows);
            col--;
            if (col < 0) {
              row = (row - 1).mod(rows);
              col = cols - 1 - (row < lastColHeight ? 0 : 1);
            }
            return col * rows + row;
          });
          continue;
        }
        if (!line.cursor) continue;
        moveLeft(1);
      } else if (data === "\x1B[1;5D") {
        if (!line.cursor) continue;
        moveLeft(line.cursor - wordBegin());
      } else if (data === "\x1B") {
        if (!line.cursor) continue;
        kill(line.cursor - wordBegin());
      } else if (data[0] === "\x1B") {
        console.debug(JSON.stringify(data), [...data].map((char) => char.charCodeAt(0)));
      } else if (data === "") {
        if (line.compState) {
          continue;
        }
        if (line.before) markDirty();
        write(m.left(w(line.before)));
        line.cursor = 0;
      } else if (data === "") {
        if (line.compState) {
          continue;
        }
        if (line.after) markDirty();
        write(m.right(w(line.after)));
        line.cursor = line.content.length;
      } else if (data === "\f") {
        if (onBeforeClear == null ? void 0 : onBeforeClear()) continue;
        this.stdio.write(hideCursor + clearScreen);
        onClear == null ? void 0 : onClear();
        const { after } = line;
        write(line.before + (getCandidate() ?? "") + after + back(w(after)) + showCursor);
        if (line.compState) {
          setTimeout(() => renderComp(({ index }) => index), 0);
        }
      } else if (data === "") {
        markDirty();
        write(rewrite(""));
        line.content = "";
        line.cursor = 0;
      } else {
        if (data.charCodeAt(0) < 32) {
          console.debug(JSON.stringify(data), [...data].map((c) => c.charCodeAt(0)));
          continue;
        }
        insert(data);
      }
    }
  }
  async readLn(options = {}) {
    if (this.isReadingLn) throw new Error("Already reading a line.");
    this.isReadingLn = true;
    const doEcho = this.term.doEcho;
    this.term.doEcho = false;
    const line = await this._readLn(options);
    this.term.doEcho = doEcho;
    this.isReadingLn = false;
    return line;
  }
  createLoop(options) {
    if (this.loopHandle) throw new Error("Loop already exists");
    return this.loopHandle = new ReadlineLoopHandle(this, options);
  }
}
class ReadlineLoopHandle {
  constructor(readline, options) {
    __publicField(this, "options");
    __publicField(this, "toStop", createSignal());
    var _a2;
    this.readline = readline;
    this.options = options;
    (_a2 = this.options).prompt ?? (_a2.prompt = "> ");
  }
  stop() {
    var _a2, _b2;
    this.readline.loopHandle = null;
    this.toStop.trigger();
    (_b2 = (_a2 = this.options).onEnd) == null ? void 0 : _b2.call(_a2);
  }
  writePrompt() {
    this.readline.stdio.write(compute(this.options.prompt));
  }
  async start() {
    var _a2, _b2, _c2, _d2;
    const history = this.options.history ?? new ReadlineHistory();
    while (true) {
      this.writePrompt();
      const line = await Promise.race([
        this.readline.readLn({
          history,
          onComp: this.options.onComp,
          onClear: () => this.writePrompt()
        }),
        this.toStop.promise
      ]);
      if (line === null) {
        if ((_b2 = (_a2 = this.options).onInterrupt) == null ? void 0 : _b2.call(_a2)) continue;
        break;
      }
      if (!line.trim()) continue;
      await ((_d2 = (_c2 = this.options).onLine) == null ? void 0 : _d2.call(_c2, line));
      if (this.toStop.triggered) break;
    }
  }
}
const execute = async (proc, command) => {
  const { name, args } = command;
  const { ctx: ctx2, env } = proc;
  const getStdio = () => {
    const stdin = new Stdin(ctx2.term);
    const stdout = new Stdout(ctx2.term);
    const { output: outputDesc } = command;
    const input = stdin;
    const output = outputDesc ? ctx2.fs.openU(outputDesc.path, outputDesc.type[0]).handle : stdout;
    const stdio = new Stdio(input, output);
    stdio.stdin = stdin;
    stdio.stdout = stdout;
    return stdio;
  };
  if (name in BUILTINS) {
    const originalStdio = proc.stdio;
    const originalName = proc.name;
    proc.stdio = getStdio();
    proc.name = name;
    try {
      return await BUILTINS[name](proc, name, ...args);
    } catch (err) {
      proc.error(err);
      return 1;
    } finally {
      proc.stdio = originalStdio;
      proc.name = originalName;
    }
  } else {
    const exeRes = ctx2.fs.findInEnvPath(name, env.PATH, { cwd: env.PWD });
    if (FOp.isErr(exeRes)) {
      if (exeRes.type === FOp.T.NOT_ALLOWED_TYPE) proc.error(`${name}: Not an executable`);
      else proc.stdio.writeLn(`${name}: Command not found`);
      return 127;
    }
    const { programName } = exeRes.file;
    return await proc.spawn(PROGRAMS[programName], { name, stdio: getStdio() }, ...args);
  }
};
const executeScript = async (proc, script) => {
  for (const command of script.commands) {
    const ret = await execute(proc, command);
    proc.env["?"] = ret.toString();
  }
};
const getCompProvider = (proc) => (line) => {
  const { ctx: ctx2, env } = proc;
  const tokens = tokenize(line.content, false);
  const etokens = expand(tokens, env);
  const getEmptyTokenEntry = () => [
    tokens.length ? null : 0,
    {
      type: "text",
      content: "",
      begin: -1,
      end: -1
    }
  ];
  const [tokenIndex, token] = [...tokens.entries()].find(([, token2]) => (line.cursor - 1).isBetween(token2.begin, token2.end)) ?? getEmptyTokenEntry();
  const [_etokenIndex, etoken] = [...etokens.entries()].find(([, etoken2]) => (line.cursor - 1).isBetween(etoken2.begin, etoken2.end)) ?? getEmptyTokenEntry();
  const getCandidates = (list, { cursorToken = token, startIndex = 0, endIndex = token.content.length } = {}) => {
    const { content, begin } = cursorToken;
    const tokenBefore = content.slice(startIndex, line.cursor - begin);
    const tokenAfter = content.slice(line.cursor - begin, endIndex);
    return list.filter(({ value }) => value.startsWith(tokenBefore) && value.endsWith(tokenAfter) && value !== content).map(({ value, display = value }) => ({
      value: value.slice(tokenBefore.length, value.length - tokenAfter.length),
      display
    }));
  };
  if (token.type === "variable" || token.type === "text" && token.content === "$" && !token.isSq) {
    return getCandidates([...Object.keys(env).sort(), ...HSH_CHARS.senv].map((name) => ({ value: "$" + name })));
  }
  const isExplicitPath = Path.isAbsOrRel(token.content);
  if (tokenIndex === 0 && !isExplicitPath) {
    return getCandidates([...Object.keys(PROGRAMS), ...Object.keys(BUILTINS)].map((name) => ({ value: name })));
  }
  const { dirname, filename } = Path.getDirAndName(etoken.content, true);
  if (filename === "..") return [{ value: "/", display: "../" }];
  const dirRes = ctx2.fs.find(dirname, { allowedTypes: [FileT.DIR] });
  if (FOp.isErr(dirRes)) return [];
  const { file: dir } = dirRes;
  return getCandidates(
    Object.keys(dir.entries).sort().map((name) => {
      const child = ctx2.fs.getChild(dir, name);
      let display = name, value = name;
      if (!child) {
        display = chalk.redBright(display);
      } else if (child.type === FileT.DIR) {
        display = chalk.blueBright(display) + "/";
        value += "/";
      } else if (child.type === FileT.JSEXE) {
        display = chalk.greenBright(display) + "*";
      }
      return { value, display };
    }),
    { cursorToken: etoken, startIndex: etoken.content.length - filename.length }
  );
};
const hsh = createCommand("hsh", "[FILE]", "Human SHell").help("help").option("command", "-c", "string", "Execute command").program(async ({ proc, options }, path) => {
  const { ctx: ctx2, env, stdio } = proc;
  proc.cwd = env.HOME;
  const executeLine = async (proc2, line) => {
    const script = await Promise.try(() => {
      const tokens = tokenize(line);
      const etokens = expand(tokens, env);
      const script2 = parse(etokens);
      return script2;
    }).catch((err) => {
      proc2.error(err);
      return null;
    });
    if (!script) {
      proc2.env["?"] = "130";
      return;
    }
    await executeScript(proc2, script);
  };
  if (options.command) {
    const lines = options.command.split("\n");
    for (const line of lines) {
      await executeLine(proc, line);
    }
  } else if (!path) {
    const historyFile = ctx2.fs.openU(".hsh_history", "ra").handle;
    const readline = new Readline(proc, stdio, ctx2.term);
    const loop = readline.createLoop({
      history: new ReadlineHistory(historyFile.read().split("\n")),
      prompt: () => `${chalk.blueBright(env.PWD)} ${chalk.greenBright("$")} `,
      onComp: getCompProvider(proc),
      onLine: async (line) => {
        if (line === "") return;
        if (line === "") {
          stdio.writeLn("");
          loop.stop();
          return;
        }
        await executeLine(proc, line);
        historyFile.appendLn(line);
      },
      onInterrupt: () => true,
      onEnd: () => stdio.writeLn("[Process exited]")
    });
    await loop.start();
  } else {
    const fh = ctx2.fs.openU(path, "r").handle;
    const lines = fh.read().split("\n");
    for (const line of lines) {
      await executeLine(proc, line);
    }
  }
  return 0;
});
const help = createCommand("help", "[PROGRAM]", "Show help for a PROGRAM").help("help").program(async ({ proc }, name) => {
  console.log();
  name || (name = "help");
  return proc.spawn(hsh, { name: "hsh" }, "-c", `${name} --help`);
});
const PROGRAMS = {
  cat,
  fs_inodemap,
  fs_format,
  ls,
  mkdir,
  rm,
  hsh,
  help
};
const BUILTINS = {
  cd,
  echo,
  hsh_tokenize,
  pwd
};
const getSysImage = () => Vfs.dir({
  bin: Vfs.dir(
    Object.fromEntries(Object.keys(PROGRAMS).map((name) => [name, Vfs.jsExe(name)]))
  ),
  home: Vfs.dir({
    test: Vfs.dir(Object.fromEntries(
      Array.range(1, 30).map((i) => [`file-${i.toString().padStart(3 + Math.trunc(i / 3), "0")}.txt`, Vfs.normal(`${i}`)])
    )),
    "hello.txt": Vfs.normal("Hello, world!")
  })
});
class Bitmap {
  constructor(size) {
    __publicField(this, "data");
    __publicField(this, "bits");
    __publicField(this, "_usedCount", 0);
    this.size = size;
    this.data = new Uint8Array(Math.ceil(size / 8));
    this.bits = new Proxy(this.data, {
      get: (target, prop2) => {
        if (typeof prop2 === "string") {
          const index = parseInt(prop2);
          const byteIndex = Math.trunc(index / 8);
          const bitIndex = index % 8;
          return (target[byteIndex] & 1 << bitIndex) >> bitIndex;
        }
        return Reflect.get(target, prop2);
      },
      set: (target, prop2, value) => {
        if (typeof prop2 === "string") {
          const index = parseInt(prop2);
          const byteIndex = Math.trunc(index / 8);
          const bitIndex = index % 8;
          const mask = 1 << bitIndex;
          if (value) {
            if (!(target[byteIndex] & mask)) {
              this._usedCount++;
              target[byteIndex] |= mask;
            }
          } else {
            if (target[byteIndex] & mask) {
              this._usedCount--;
              target[byteIndex] &= ~mask;
            }
          }
          return true;
        }
        return Reflect.set(target, prop2, value);
      }
    });
  }
  get usedCount() {
    return this._usedCount;
  }
  fill(start, end, value) {
    let startByteIndex = Math.trunc(start / 8);
    const startBitIndex = start % 8;
    const endByteIndex = Math.trunc(end / 8);
    const endBitIndex = end % 8;
    if (startBitIndex) {
      const mask = (1 << 8 - startBitIndex) - 1;
      if (value) this.data[startByteIndex] |= mask;
      else this.data[startByteIndex] &= ~mask;
      startByteIndex++;
    }
    const byte = value ? 255 : 0;
    for (let byteIndex = startByteIndex; byteIndex < endByteIndex; byteIndex++) {
      this.data[byteIndex] = byte;
    }
    if (endBitIndex) {
      const mask = (1 << endBitIndex) - 1;
      if (value) this.data[endByteIndex] |= mask;
      else this.data[endByteIndex] &= ~mask;
    }
  }
  clear() {
    this._usedCount = 0;
    this.data.fill(0);
  }
  getFree(start = 0, end = this.size - 1) {
    for (let i = start; i <= end; i++) {
      if (!this.bits[i]) {
        this.bits[i] = 1;
        return i;
      }
    }
    return -1;
  }
}
class FileHandle {
  constructor(ctx2, inode) {
    __publicField(this, "cursor", 0);
    this.ctx = ctx2;
    this.inode = inode;
  }
  get isAtEof() {
    return this.cursor >= this.inode.file.content.length;
  }
  get currentChar() {
    return this.inode.file.content[this.cursor];
  }
}
class FileHandleR extends FileHandle {
  constructor() {
    super(...arguments);
    __publicField(this, "mode", "r");
  }
  readChar() {
    if (this.isAtEof) return "";
    const char = this.currentChar;
    this.cursor++;
    return char;
  }
  readKey({}) {
    return this.readChar();
  }
  readUntil(pred) {
    let start = this.cursor;
    while (!(this.isAtEof || pred(this.currentChar))) this.cursor++;
    return this.inode.file.content.slice(start, this.cursor);
  }
  read() {
    return this.readUntil(() => false);
  }
  readLn() {
    return this.readUntil((char) => char === "\n");
  }
}
class FileHandleWritable extends FileHandle {
  sync() {
    this.ctx.fs.persistence.set(this.inode.iid, this.inode);
  }
  write(data) {
    if (this.mode.endsWith("a")) this.append(data);
    else this.rewrite(data);
  }
  writeLn(data) {
    this.write(data + "\n");
  }
  rewrite(data) {
    this.inode.file.content = data;
    this.sync();
  }
  rewriteLn(data) {
    this.rewrite(data + "\n");
  }
  append(data) {
    this.inode.file.content += data;
    this.sync();
  }
  appendLn(data) {
    this.append(data + "\n");
  }
}
const _FileHandleW = class _FileHandleW extends FileHandleWritable {
  constructor() {
    super(...arguments);
    __publicField(this, "mode", "w");
  }
};
mixin(_FileHandleW, FileHandleWritable);
let FileHandleW = _FileHandleW;
const _FileHandleA = class _FileHandleA extends FileHandleWritable {
  constructor() {
    super(...arguments);
    __publicField(this, "mode", "a");
  }
};
mixin(_FileHandleA, FileHandleWritable);
let FileHandleA = _FileHandleA;
const _FileHandleRW = class _FileHandleRW extends FileHandle {
  constructor() {
    super(...arguments);
    __publicField(this, "mode", "rw");
  }
};
mixin(_FileHandleRW, FileHandleR);
mixin(_FileHandleRW, FileHandleW);
let FileHandleRW = _FileHandleRW;
const _FileHandleRA = class _FileHandleRA extends FileHandle {
  constructor() {
    super(...arguments);
    __publicField(this, "mode", "ra");
  }
};
mixin(_FileHandleRA, FileHandleR);
mixin(_FileHandleRA, FileHandleA);
let FileHandleRA = _FileHandleRA;
const FILE_HANDLE_FROM_MODE = {
  r: FileHandleR,
  w: FileHandleW,
  a: FileHandleA,
  rw: FileHandleRW,
  ra: FileHandleRA
};
class LocalStorageFsPersistence {
  get isInitialized() {
    return localStorage.getJsonOr("fs:initialized", false);
  }
  set isInitialized(value) {
    localStorage.setJson("fs:initialized", value);
  }
  get(iid) {
    return localStorage.getJson(`i:${iid}`);
  }
  getAll() {
    return Object.entries(localStorage).filter(([key]) => key.startsWith("i:")).map(([key, value]) => [parseInt(key.slice(2)), JSON.parse(value)]);
  }
  set(iid, inode) {
    localStorage.setJson(`i:${iid}`, inode);
  }
  delete(iid) {
    localStorage.removeItem(`i:${iid}`);
  }
}
var FileT = /* @__PURE__ */ ((FileT2) => {
  FileT2[FileT2["DIR"] = 0] = "DIR";
  FileT2[FileT2["NORMAL"] = 1] = "NORMAL";
  FileT2[FileT2["JSEXE"] = 2] = "JSEXE";
  return FileT2;
})(FileT || {});
const FileTNames = {
  [
    0
    /* DIR */
  ]: "directory",
  [
    1
    /* NORMAL */
  ]: "normal file",
  [
    2
    /* JSEXE */
  ]: "JS executable"
};
const displayFileT = (type) => {
  return FileTNames[type];
};
const MAX_INODE_COUNT = 1024;
var FOp;
((FOp2) => {
  ((T2) => {
    T2[T2["OK"] = 0] = "OK";
    T2[T2["ILLEGAL_NAME"] = 1] = "ILLEGAL_NAME";
    T2[T2["NOT_FOUND"] = 2] = "NOT_FOUND";
    T2[T2["DANGLING_INODE"] = 3] = "DANGLING_INODE";
    T2[T2["NOT_DIR"] = 4] = "NOT_DIR";
    T2[T2["IS_A_DIR"] = 5] = "IS_A_DIR";
    T2[T2["IS_ROOT"] = 6] = "IS_ROOT";
    T2[T2["NOT_ALLOWED_TYPE"] = 7] = "NOT_ALLOWED_TYPE";
    T2[T2["ALREADY_EXISTS"] = 8] = "ALREADY_EXISTS";
    T2[T2["OUT_OF_INODES"] = 9] = "OUT_OF_INODES";
    T2[T2["AGGREGATED_ERROR"] = 10] = "AGGREGATED_ERROR";
  })(FOp2.T || (FOp2.T = {}));
  FOp2.kErr = Symbol("FOp.Err");
  FOp2.err = (err2) => ({
    [FOp2.kErr]: true,
    ...err2
  });
  FOp2.isErr = (res) => res.type !== 0;
  FOp2.isOk = (res) => res.type === 0;
  FOp2.displayError = (err2) => {
    switch (err2.type) {
      case 1:
        return `Illegal file name`;
      case 2:
        return `No such file or directory`;
      case 3:
        return `Dangling Inode`;
      case 4:
        return `Not a directory`;
      case 5:
        return `Is a directory`;
      case 6:
        return `Is root directory`;
      case 7:
        return `Not ${err2.allowedTypes.map(displayFileT).join(" or ")}`;
      case 8:
        return `File already exists`;
      case 9:
        return `Out of Inodes`;
      case 10:
        return `Got multiple errors:
${err2.errors.map((err3) => "  " + (0, FOp2.displayError)(err3)).join("\n")}`;
    }
  };
})(FOp || (FOp = {}));
class Fs {
  constructor(ctx2) {
    __publicField(this, "inodes", /* @__PURE__ */ new Map());
    __publicField(this, "inodeBitmap", new Bitmap(MAX_INODE_COUNT));
    __publicField(this, "rootIid", 1);
    __publicField(this, "persistence", new LocalStorageFsPersistence());
    this.ctx = ctx2;
    this.load();
  }
  get root() {
    return this.inodes.get(this.rootIid);
  }
  reset() {
    this.persistence.isInitialized = false;
    this.inodes.clear();
    this.inodeBitmap.clear();
    this.load();
  }
  load() {
    if (!this.persistence.isInitialized) {
      this.create(getSysImage());
      this.inodes.forEach((inode, iid) => {
        this.persistence.set(iid, inode);
      });
      this.persistence.isInitialized = true;
    } else {
      this.persistence.getAll().forEach(([iid, inode]) => {
        this.inodes.set(iid, inode);
        this.inodeBitmap.bits[iid] = 1;
      });
    }
  }
  get cwd() {
    return this.ctx.fgProc.cwd;
  }
  isFileOfType(file, types) {
    return types.includes(file.type);
  }
  isInodeOfType(inode, types) {
    return this.isFileOfType(inode.file, types);
  }
  create(tree) {
    return Vfs.create(this, tree);
  }
  createAt(parent, name, tree) {
    const createRes = this.create(tree);
    if (FOp.isErr(createRes)) return createRes;
    parent.file.entries[name] = createRes.inode.iid;
    this.persistence.set(parent.iid, parent);
    return createRes;
  }
  unwrap(res, errHead) {
    if (FOp.isOk(res)) return res;
    throw `${errHead}: ${FOp.displayError(res)}`;
  }
  findInode(path, { allowedTypes } = {}) {
    let path1 = path;
    if (!Path.isAbsOrRel(path1)) path1 = `./${path1}`;
    const parts = Path.split(path1);
    if (parts[0] === "." || parts[0] === "..") {
      parts.unshift(...Path.split(this.cwd));
    }
    if (!parts[0]) parts.shift();
    const inodeStack = new Stack(this.root);
    const partStack = new Stack("");
    for (const part of parts) {
      const { file } = inodeStack.top;
      if (file.type !== 0) return FOp.err({
        type: 4
        /* NOT_DIR */
      });
      if (part === ".") continue;
      if (part === "..") {
        if (inodeStack.length > 1) {
          inodeStack.pop();
          partStack.pop();
        }
        continue;
      }
      if (!(part in file.entries)) return FOp.err({
        type: 2
        /* NOT_FOUND */
      });
      const inode2 = this.inodes.get(file.entries[part]);
      if (!inode2) return FOp.err({
        type: 2
        /* NOT_FOUND */
      });
      inodeStack.push(inode2);
      partStack.push(part);
    }
    const inode = inodeStack.pop();
    if (allowedTypes && !this.isInodeOfType(inode, allowedTypes)) {
      return FOp.err({ type: 7, allowedTypes });
    }
    return {
      type: 0,
      inode,
      path: partStack.join("/") || "/",
      filename: partStack.top,
      parentInode: inodeStack.top ?? this.root
    };
  }
  findInodeU(path, options = {}) {
    return this.unwrap(this.findInode(path, options), path);
  }
  find(path, { allowedTypes } = {}) {
    const res = this.findInode(path, { allowedTypes });
    if (FOp.isErr(res)) return res;
    return {
      type: 0,
      file: res.inode.file,
      filename: res.filename,
      path: res.path,
      parent: res.parentInode.file
    };
  }
  findU(path, options = {}) {
    return this.unwrap(this.find(path, options), path);
  }
  getChild(dir, childName) {
    var _a2;
    return ((_a2 = this.getChildInode(dir, childName)) == null ? void 0 : _a2.file) ?? null;
  }
  getChildInode(dir, childName) {
    if (!(childName in dir.entries)) return null;
    return this.inodes.get(dir.entries[childName]);
  }
  getChildren(dir) {
    return Object.entries(dir.entries).map(([name, iid]) => {
      const inode = this.inodes.get(iid);
      return { name, iid, inode, file: (inode == null ? void 0 : inode.file) ?? null };
    });
  }
  isEmptyDir(dir) {
    return !Object.keys(dir.entries).length;
  }
  findInEnvPath(path, envPath, options) {
    if (Path.hasSlash(path)) return this.find(path, { ...options, allowedTypes: [
      2
      /* JSEXE */
    ] });
    const envPathList = envPath.split(":").filter(Boolean);
    for (const envPath2 of envPathList) {
      const entry = this.find(`${envPath2}/${path}`, { allowedTypes: [
        2
        /* JSEXE */
      ] });
      if (entry.type === 0) return entry;
    }
    return FOp.err({
      type: 2
      /* NOT_FOUND */
    });
  }
  mkdir(path) {
    const { dirname, filename } = Path.getDirAndName(path);
    if (!Path.isLegalFilename(filename)) return FOp.err({
      type: 1
      /* ILLEGAL_NAME */
    });
    const dirRes = this.findInode(dirname, { allowedTypes: [
      0
      /* DIR */
    ] });
    if (FOp.isErr(dirRes)) return dirRes;
    const { inode: parentInode } = dirRes;
    if (parentInode.file.entries[filename]) return FOp.err({
      type: 8
      /* ALREADY_EXISTS */
    });
    const createRes = this.createAt(parentInode, filename, Vfs.dir());
    if (FOp.isErr(createRes)) return createRes;
    const { inode } = createRes;
    return {
      type: 0,
      dir: inode.file
    };
  }
  mkdirU(path) {
    return this.unwrap(this.mkdir(path), `Cannot create directory '${path}'`);
  }
  rmWhere(parentInode, filename) {
    const inode = this.getChildInode(parentInode.file, filename);
    if (!inode) return FOp.err({
      type: 2
      /* NOT_FOUND */
    });
    const { file, iid } = inode;
    if (file.type === 0) {
      if (!this.isEmptyDir(file)) {
        return FOp.err({
          type: 5
          /* IS_A_DIR */
        });
      }
    }
    this.inodes.delete(iid);
    this.inodeBitmap.bits[iid] = 0;
    delete parentInode.file.entries[filename];
    this.persistence.delete(iid);
    this.persistence.set(parentInode.iid, parentInode);
    return {
      type: 0
      /* OK */
    };
  }
  rm(path) {
    const res = this.findInode(path, { allowedTypes: [
      0
      /* DIR */
    ] });
    if (FOp.isErr(res)) return res;
    const { parentInode: parent, filename } = res;
    if (parent === this.root) return FOp.err({
      type: 6
      /* IS_ROOT */
    });
    const rmRes = this.rmWhere(parent, filename);
    if (FOp.isErr(rmRes)) return rmRes;
    return {
      type: 0,
      path: Path.normalize(path)
    };
  }
  rmU(path) {
    return this.unwrap(this.rm(path), `Cannot remove '${path}'`);
  }
  createFileHandle(inode, mode) {
    const Handle = FILE_HANDLE_FROM_MODE[mode];
    return new Handle(this.ctx, inode);
  }
  open(path, mode) {
    const res = this.findInode(path, { allowedTypes: [
      1
      /* NORMAL */
    ] });
    let inode;
    if (FOp.isErr(res)) {
      if (mode === "r" || res.type === 7) return res;
      const { dirname, filename } = Path.getDirAndName(path);
      if (!filename) return FOp.err({
        type: 1
        /* ILLEGAL_NAME */
      });
      const dirRes = this.findInode(dirname, { allowedTypes: [
        0
        /* DIR */
      ] });
      if (FOp.isErr(dirRes)) return dirRes;
      const { inode: parentInode } = dirRes;
      const createRes = this.createAt(parentInode, filename, Vfs.normal(""));
      if (FOp.isErr(createRes)) return createRes;
      inode = createRes.inode;
    } else {
      inode = res.inode;
    }
    return {
      type: 0,
      handle: this.createFileHandle(inode, mode)
    };
  }
  openU(path, mode) {
    return this.unwrap(this.open(path, mode), path);
  }
}
class Context extends Emitter {
  constructor() {
    super();
    __publicField(this, "term");
    __publicField(this, "init");
    __publicField(this, "fs");
    __publicField(this, "fgProc");
    this.term = new Term();
    this.fs = new Fs(this);
    this.fgProc = this.init = new Process(this, null, {
      name: "init",
      env: {
        PWD: "/home",
        HOME: "/home",
        PATH: "/bin"
      }
    });
    this.term.on("interrupt", () => {
      this.fgProc.emit("interrupt");
    });
  }
  attach(element) {
    this.term.open(element);
  }
}
const hook = async (obj, overwrite, fn) => {
  const keys = Object.keys(overwrite);
  const original = pick(obj, keys);
  Object.assign(obj, overwrite);
  const ret = await fn(obj);
  Object.assign(obj, original);
  return ret;
};
const hsh1 = (proc, name, ...args) => {
  return hook(
    PROGRAMS,
    {
      help: (proc2) => {
        proc2.stdio.writeLn("You are helpless. jaja.");
        return 66;
      }
    },
    () => hsh(proc, name, ...args)
  );
};
const game0 = async (proc) => {
  const { stdio } = proc;
  stdio.writeLn("Welcome to HumanOS.");
  await proc.spawn(hsh1, { name: "hsh" });
  return 0;
};
const ctx = new Context();
Object.assign(window, { ctx });
ctx.attach(document.querySelector("#xterm-container"));
ctx.init.spawn(game0, { name: "game0" });
