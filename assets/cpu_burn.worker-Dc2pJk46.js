var __defProp = Object.defineProperty;
var __defNormalProp = (obj, key, value) => key in obj ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
var __publicField = (obj, key, value) => __defNormalProp(obj, typeof key !== "symbol" ? key + "" : key, value);
(function() {
  "use strict";
  class ResultOk {
    constructor(val) {
      __publicField(this, "val");
      __publicField(this, "isOk", true);
      __publicField(this, "isErr", false);
      this.val = val;
    }
    isOkAnd(fn) {
      return fn(this.val);
    }
    isErrAnd() {
      return false;
    }
    unwrap() {
      return this.val;
    }
    unwrapBy() {
      return this.val;
    }
    expect() {
      return this.val;
    }
    unwrapOr() {
      return this.val;
    }
    match(onOk, _) {
      return onOk(this.val);
    }
    union() {
      return this.val;
    }
    map(fn) {
      return src_Result.ok(fn(this.val));
    }
    mapErr() {
      return this;
    }
    bind(fn) {
      return fn(this.val);
    }
    bindErr() {
      return this;
    }
    tap(fn) {
      fn(this.val);
      return this;
    }
    tapErr() {
      return this;
    }
  }
  class ResultErr {
    constructor(err) {
      __publicField(this, "err");
      __publicField(this, "isOk", false);
      __publicField(this, "isErr", true);
      this.err = err;
    }
    isOkAnd() {
      return false;
    }
    isErrAnd(fn) {
      return fn(this.err);
    }
    unwrap() {
      throw this.err;
    }
    unwrapBy(unwrapper) {
      unwrapper(this.err);
    }
    expect(msg) {
      throw new Error(msg);
    }
    unwrapOr(def) {
      return def;
    }
    match(_, onErr) {
      return onErr(this.err);
    }
    union() {
      return this.err;
    }
    map() {
      return this;
    }
    mapErr(fn) {
      return src_Result.err(fn(this.err));
    }
    bind() {
      return this;
    }
    bindErr(fn) {
      return fn(this.err);
    }
    tap() {
      return this;
    }
    tapErr(fn) {
      fn(this.err);
      return this;
    }
  }
  const Ok = (val) => new ResultOk(val);
  const Err = (err) => new ResultErr(err);
  (function(Result) {
    Result.ok = Ok;
    Result.err = Err;
    Result.all = (results) => {
      const vals = [];
      for (const result of results) {
        if (result.isErr) return result;
        vals.push(result.val);
      }
      return Result.ok(vals);
    };
    Result.any = (results) => {
      const errs = [];
      for (const result of results) {
        if (result.isOk) return result;
        errs.push(result.err);
      }
      return Result.err(errs);
    };
    Result.wrap = (fn) => {
      try {
        return Result.ok(fn());
      } catch (err) {
        return Result.err(err);
      }
    };
    Result.fold = (list, init, folder) => list.reduce((accResult, curr, index) => accResult.bind((acc) => folder(acc, curr, index)), Result.ok(init));
    Result.isOk = (result) => result.isOk;
    Result.isErr = (result) => result.isErr;
    Result.isOkAnd = (fn) => (result) => result.isOkAnd(fn);
    Result.isErrAnd = (fn) => (result) => result.isErrAnd(fn);
    Result.unwrap = (result) => result.unwrap();
    Result.unwrapBy = (unwrapper) => (result) => result.unwrapBy(unwrapper);
    Result.expect = (msg) => (result) => result.expect(msg);
    Result.unwrapOr = (def) => (result) => result.unwrapOr(def);
    Result.map = (fn) => (result) => result.map(fn);
    Result.mapErr = (fn) => (result) => result.mapErr(fn);
    Result.bind = (fn) => (result) => result.bind(fn);
    Result.bindErr = (fn) => (result) => result.bindErr(fn);
    Result.match = (onOk, onErr) => (result) => result.match(onOk, onErr);
    Result.union = (result) => result.union();
    Result.tap = (fn) => (result) => result.tap(fn);
    Result.tapErr = (fn) => (result) => result.tapErr(fn);
  })(src_Result || (src_Result = {}));
  var src_Result;
  const transportError = (code, message) => ({ source: "transport", code, message });
  const STATE_INDEX = 0;
  const REQUEST_LENGTH_INDEX = 1;
  const RESPONSE_LENGTH_INDEX = 2;
  const HEADER_WORDS = 3;
  const HEADER_BYTES = HEADER_WORDS * Int32Array.BYTES_PER_ELEMENT;
  const MIN_CAPACITY = 256;
  const encoder = new TextEncoder();
  const decoder = new TextDecoder("utf-8", { fatal: true });
  const serialize = (value) => {
    const serialized = src_Result.wrap(() => JSON.stringify(value));
    if (serialized.isErr) {
      return Err(transportError("serialization-failed", `Could not serialize syscall payload: ${String(serialized.err)}`));
    }
    if (serialized.val === void 0) {
      return Err(transportError("serialization-failed", "Syscall payload is not JSON-serializable"));
    }
    return Ok(encoder.encode(serialized.val));
  };
  const deserialize = (bytes) => {
    const parsed = src_Result.wrap(() => JSON.parse(decoder.decode(bytes)));
    return parsed.mapErr((error) => transportError(
      "serialization-failed",
      `Could not deserialize syscall payload: ${String(error)}`
    ));
  };
  class SyscallMemory {
    constructor(descriptor) {
      __publicField(this, "capacity");
      __publicField(this, "header");
      __publicField(this, "payload");
      this.descriptor = descriptor;
      const { buffer } = descriptor;
      if (!(buffer instanceof SharedArrayBuffer) || buffer.byteLength < HEADER_BYTES + MIN_CAPACITY) {
        throw new RangeError("Invalid syscall SharedArrayBuffer");
      }
      this.header = new Int32Array(buffer, 0, HEADER_WORDS);
      this.payload = new Uint8Array(buffer, HEADER_BYTES);
      this.capacity = this.payload.byteLength;
    }
    beginRequest(request) {
      const state = Atomics.load(this.header, STATE_INDEX);
      if (state === 3) {
        return Err(transportError("channel-closed", "Syscall channel is closed"));
      }
      if (state !== 0) {
        return Err(transportError("invalid-state", "Syscall channel already has an in-flight request"));
      }
      const bytesResult = this.encodePayload(request);
      if (bytesResult.isErr) return bytesResult;
      this.payload.set(bytesResult.val);
      Atomics.store(this.header, REQUEST_LENGTH_INDEX, bytesResult.val.byteLength);
      Atomics.store(this.header, RESPONSE_LENGTH_INDEX, 0);
      Atomics.store(
        this.header,
        STATE_INDEX,
        1
        /* REQUEST_READY */
      );
      return Ok(void 0);
    }
    takeRequest() {
      const state = Atomics.load(this.header, STATE_INDEX);
      if (state !== 1) {
        return Err(transportError("invalid-state", "Syscall channel has no request ready"));
      }
      return this.decodePayload(Atomics.load(this.header, REQUEST_LENGTH_INDEX));
    }
    respond(response) {
      const state = Atomics.load(this.header, STATE_INDEX);
      if (state !== 1) {
        return Err(transportError("invalid-state", "Cannot respond without an active syscall request"));
      }
      const bytesResult = this.encodePayload(response);
      if (bytesResult.isErr) return bytesResult;
      this.payload.set(bytesResult.val);
      Atomics.store(this.header, RESPONSE_LENGTH_INDEX, bytesResult.val.byteLength);
      Atomics.store(
        this.header,
        STATE_INDEX,
        2
        /* RESPONSE_READY */
      );
      Atomics.notify(this.header, STATE_INDEX);
      return Ok(void 0);
    }
    waitForResponse() {
      while (true) {
        const state = Atomics.load(this.header, STATE_INDEX);
        if (state === 2) {
          return this.decodePayload(Atomics.load(this.header, RESPONSE_LENGTH_INDEX));
        }
        if (state === 3) {
          return Err(transportError("channel-closed", "Syscall channel was closed while waiting"));
        }
        if (state !== 1) {
          return Err(transportError("invalid-state", `Unexpected syscall channel state: ${state}`));
        }
        const waitResult = src_Result.wrap(
          () => Atomics.wait(
            this.header,
            STATE_INDEX,
            1
            /* REQUEST_READY */
          )
        );
        if (waitResult.isErr) {
          return Err(transportError(
            "blocking-not-supported",
            `This context cannot synchronously wait for syscalls: ${String(waitResult.err)}`
          ));
        }
      }
    }
    releaseResponse() {
      const previous = Atomics.compareExchange(
        this.header,
        STATE_INDEX,
        2,
        0
        /* IDLE */
      );
      return previous === 2 ? Ok(void 0) : Err(transportError("invalid-state", "Syscall channel has no response to release"));
    }
    cancelRequest() {
      const previous = Atomics.compareExchange(
        this.header,
        STATE_INDEX,
        1,
        0
        /* IDLE */
      );
      return previous === 1;
    }
    close() {
      Atomics.store(
        this.header,
        STATE_INDEX,
        3
        /* CLOSED */
      );
      Atomics.notify(this.header, STATE_INDEX);
    }
    encodePayload(value) {
      const bytesResult = serialize(value);
      if (bytesResult.isErr) return bytesResult;
      if (bytesResult.val.byteLength > this.capacity) {
        return Err(transportError(
          "payload-too-large",
          `Syscall payload requires ${bytesResult.val.byteLength} bytes; channel capacity is ${this.capacity}`
        ));
      }
      return bytesResult;
    }
    decodePayload(length) {
      if (length < 0 || length > this.capacity) {
        return Err(transportError("invalid-message", `Invalid syscall payload length: ${length}`));
      }
      return deserialize(this.payload.slice(0, length));
    }
  }
  class SyncSyscallClient {
    constructor(descriptor, sink, timing = {}) {
      __publicField(this, "memory");
      this.sink = sink;
      this.timing = timing;
      this.memory = new SyscallMemory(descriptor);
    }
    call(name, ...args) {
      var _a, _b;
      const now = this.timing.now ?? performance.now.bind(performance);
      const startedAt = now();
      try {
        return this.callUnchecked(name, args);
      } finally {
        (_b = (_a = this.timing).onCallTime) == null ? void 0 : _b.call(_a, Math.max(0, now() - startedAt));
      }
    }
    callUnchecked(name, args) {
      const request = { name, args: [...args] };
      const begun = this.memory.beginRequest(request);
      if (begun.isErr) return begun;
      const signalled = src_Result.wrap(() => this.sink.postMessage({
        type: "sudoer:syscall",
        channelId: this.memory.descriptor.channelId
      }));
      if (signalled.isErr) {
        this.memory.cancelRequest();
        return Err(transportError("signal-failed", `Could not signal syscall server: ${String(signalled.err)}`));
      }
      const response = this.memory.waitForResponse();
      if (response.isErr) {
        if (this.memory.releaseResponse().isErr) this.memory.cancelRequest();
        return response;
      }
      const released = this.memory.releaseResponse();
      if (released.isErr) return released;
      if (!response.val || typeof response.val !== "object" || typeof response.val.ok !== "boolean") {
        return Err(transportError("invalid-message", "Syscall server returned an invalid response envelope"));
      }
      return response.val.ok ? Ok(response.val.value) : Err(response.val.error);
    }
  }
  class WorkerProcessApi {
    constructor(client) {
      this.client = client;
    }
    readKey() {
      return this.readKeyFd(0);
    }
    write(data) {
      return this.writeFd(1, data);
    }
    writeLn(data) {
      return this.write(data + "\n");
    }
    writeError(data) {
      return this.writeFd(2, data);
    }
    writeErrorLn(data) {
      return this.writeError(data + "\n");
    }
    open(path, mode) {
      return this.client.call("fd.open", path, mode);
    }
    readKeyFd(fd) {
      return this.client.call("fd.readKey", fd);
    }
    readFd(fd) {
      return this.client.call("fd.read", fd);
    }
    writeFd(fd, data) {
      return this.client.call("fd.write", fd, data);
    }
    close(fd) {
      return this.client.call("fd.close", fd);
    }
    dup(fd, newFd = null) {
      return this.client.call("fd.dup", fd, newFd);
    }
    readFile(path) {
      return this.client.call("fs.readFile", path);
    }
    writeFile(path, data, mode = "write") {
      return this.client.call("fs.writeFile", path, data, mode);
    }
    getEnv(name) {
      return this.client.call("env.get", name);
    }
    getCwd() {
      return this.client.call("cwd.get");
    }
    getTime(clock) {
      return this.client.call("clock.gettime", clock);
    }
  }
  const isWorkerInitMessage = (value) => {
    if (!value || typeof value !== "object") return false;
    const message = value;
    return message.type === "sudoer:worker-init" && !!message.channel && typeof message.name === "string" && Array.isArray(message.args);
  };
  const startWorkerProgram = (scope, program) => {
    let hasStarted = false;
    scope.addEventListener("message", (event) => {
      if (!isWorkerInitMessage(event.data) || hasStarted) return;
      hasStarted = true;
      const { channel, name, args } = event.data;
      const startedAt = performance.now();
      let syscallMs = 0;
      const client = new SyncSyscallClient(channel, scope, {
        onCallTime: (milliseconds) => {
          syscallMs += milliseconds;
        }
      });
      const process = new WorkerProcessApi(client);
      try {
        const exitCode = program(process, name, ...args);
        const elapsedMs = Math.max(0, performance.now() - startedAt);
        scope.postMessage({
          type: "sudoer:worker-exit",
          exitCode,
          usage: {
            userMs: Math.max(0, elapsedMs - syscallMs),
            syscallMs
          }
        });
      } catch (error) {
        const failure = {
          type: "sudoer:worker-failure",
          message: error instanceof Error ? error.message : String(error),
          ...error instanceof Error && error.stack ? { stack: error.stack } : {}
        };
        scope.postMessage(failure);
      }
    });
  };
  const cpuBurn = (process, name, durationArg = "10") => {
    const durationSeconds = Number(durationArg);
    if (!Number.isFinite(durationSeconds) || durationSeconds < 0) {
      process.writeLn(`cpu_burn: invalid duration: ${durationArg}`);
      return 1;
    }
    process.writeLn(`Burning CPU for ${durationSeconds} second(s); press Ctrl+C to terminate.`).unwrap();
    const deadline = performance.now() + durationSeconds * 1e3;
    let accumulator = 0;
    while (performance.now() < deadline) {
      accumulator = Math.imul(accumulator + 1, 2654435761);
    }
    process.writeLn(`CPU task completed (${accumulator >>> 0}).`).unwrap();
    return 0;
  };
  startWorkerProgram(globalThis, cpuBurn);
})();
