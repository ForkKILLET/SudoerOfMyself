
let wasm;

let cachedTextDecoder = new TextDecoder('utf-8', { ignoreBOM: true, fatal: true });

cachedTextDecoder.decode();

let cachegetUint8Memory0 = null;
function getUint8Memory0() {
    if (cachegetUint8Memory0 === null || cachegetUint8Memory0.buffer !== wasm.memory.buffer) {
        cachegetUint8Memory0 = new Uint8Array(wasm.memory.buffer);
    }
    return cachegetUint8Memory0;
}

function getStringFromWasm0(ptr, len) {
    return cachedTextDecoder.decode(getUint8Memory0().subarray(ptr, ptr + len));
}

const heap = new Array(32).fill(undefined);

heap.push(undefined, null, true, false);

let heap_next = heap.length;

function addHeapObject(obj) {
    if (heap_next === heap.length) heap.push(heap.length + 1);
    const idx = heap_next;
    heap_next = heap[idx];

    heap[idx] = obj;
    return idx;
}

function getObject(idx) { return heap[idx]; }

function dropObject(idx) {
    if (idx < 36) return;
    heap[idx] = heap_next;
    heap_next = idx;
}

function takeObject(idx) {
    const ret = getObject(idx);
    dropObject(idx);
    return ret;
}

function notDefined(what) { return () => { throw new Error(`${what} is not defined`); }; }
/**
*/
export function init_panic_hook() {
    wasm.init_panic_hook();
}

function _assertClass(instance, klass) {
    if (!(instance instanceof klass)) {
        throw new Error(`expected instance of ${klass.name}`);
    }
    return instance.ptr;
}

let cachegetInt32Memory0 = null;
function getInt32Memory0() {
    if (cachegetInt32Memory0 === null || cachegetInt32Memory0.buffer !== wasm.memory.buffer) {
        cachegetInt32Memory0 = new Int32Array(wasm.memory.buffer);
    }
    return cachegetInt32Memory0;
}

function getArrayU8FromWasm0(ptr, len) {
    return getUint8Memory0().subarray(ptr / 1, ptr / 1 + len);
}

let WASM_VECTOR_LEN = 0;

function passArray8ToWasm0(arg, malloc) {
    const ptr = malloc(arg.length * 1);
    getUint8Memory0().set(arg, ptr / 1);
    WASM_VECTOR_LEN = arg.length;
    return ptr;
}

let cachedTextEncoder = new TextEncoder('utf-8');

const encodeString = (typeof cachedTextEncoder.encodeInto === 'function'
    ? function (arg, view) {
    return cachedTextEncoder.encodeInto(arg, view);
}
    : function (arg, view) {
    const buf = cachedTextEncoder.encode(arg);
    view.set(buf);
    return {
        read: arg.length,
        written: buf.length
    };
});

function passStringToWasm0(arg, malloc, realloc) {

    if (realloc === undefined) {
        const buf = cachedTextEncoder.encode(arg);
        const ptr = malloc(buf.length);
        getUint8Memory0().subarray(ptr, ptr + buf.length).set(buf);
        WASM_VECTOR_LEN = buf.length;
        return ptr;
    }

    let len = arg.length;
    let ptr = malloc(len);

    const mem = getUint8Memory0();

    let offset = 0;

    for (; offset < len; offset++) {
        const code = arg.charCodeAt(offset);
        if (code > 0x7F) break;
        mem[ptr + offset] = code;
    }

    if (offset !== len) {
        if (offset !== 0) {
            arg = arg.slice(offset);
        }
        ptr = realloc(ptr, len, len = offset + arg.length * 3);
        const view = getUint8Memory0().subarray(ptr + offset, ptr + len);
        const ret = encodeString(arg, view);

        offset += ret.written;
    }

    WASM_VECTOR_LEN = offset;
    return ptr;
}
/**
*/
export const FileHandleMode = Object.freeze({ R:0,"0":"R",Wn:1,"1":"Wn",An:2,"2":"An",RW:3,"3":"RW",RWn:4,"4":"RWn",RAn:5,"5":"RAn", });
/**
*/
export const FileType = Object.freeze({ Dir:4,"4":"Dir",Chr:2,"2":"Chr",Blk:6,"6":"Blk",Reg:8,"8":"Reg",FIFO:1,"1":"FIFO",Lnk:10,"10":"Lnk",Sock:12,"12":"Sock", });
/**
*/
export class FS {

    static __wrap(ptr) {
        const obj = Object.create(FS.prototype);
        obj.ptr = ptr;

        return obj;
    }

    __destroy_into_raw() {
        const ptr = this.ptr;
        this.ptr = 0;

        return ptr;
    }

    free() {
        const ptr = this.__destroy_into_raw();
        wasm.__wbg_fs_free(ptr);
    }
    /**
    */
    constructor() {
        var ret = wasm.fs_new();
        return FS.__wrap(ret);
    }
    /**
    * @returns {Uint8Array}
    */
    get_raw() {
        try {
            const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
            wasm.fs_get_raw(retptr, this.ptr);
            var r0 = getInt32Memory0()[retptr / 4 + 0];
            var r1 = getInt32Memory0()[retptr / 4 + 1];
            var v0 = getArrayU8FromWasm0(r0, r1).slice();
            wasm.__wbindgen_free(r0, r1 * 1);
            return v0;
        } finally {
            wasm.__wbindgen_add_to_stack_pointer(16);
        }
    }
    /**
    * @param {number} inode_id
    * @returns {Uint8Array}
    */
    inode_get_raw_vec(inode_id) {
        try {
            const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
            wasm.fs_inode_get_raw_vec(retptr, this.ptr, inode_id);
            var r0 = getInt32Memory0()[retptr / 4 + 0];
            var r1 = getInt32Memory0()[retptr / 4 + 1];
            var v0 = getArrayU8FromWasm0(r0, r1).slice();
            wasm.__wbindgen_free(r0, r1 * 1);
            return v0;
        } finally {
            wasm.__wbindgen_add_to_stack_pointer(16);
        }
    }
    /**
    * @param {number} inode_id
    * @returns {INode}
    */
    inode_get(inode_id) {
        var ret = wasm.fs_inode_get(this.ptr, inode_id);
        return INode.__wrap(ret);
    }
    /**
    * @param {number} uid
    * @param {number} gid
    * @returns {FileCreateOk}
    */
    file_create(uid, gid) {
        try {
            const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
            wasm.fs_file_create(retptr, this.ptr, uid, gid);
            var r0 = getInt32Memory0()[retptr / 4 + 0];
            var r1 = getInt32Memory0()[retptr / 4 + 1];
            var r2 = getInt32Memory0()[retptr / 4 + 2];
            if (r2) {
                throw takeObject(r1);
            }
            return FileCreateOk.__wrap(r0);
        } finally {
            wasm.__wbindgen_add_to_stack_pointer(16);
        }
    }
    /**
    * @param {number} inode_id
    * @param {number} mode
    * @returns {FileHandle}
    */
    file_open(inode_id, mode) {
        try {
            const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
            wasm.fs_file_open(retptr, this.ptr, inode_id, mode);
            var r0 = getInt32Memory0()[retptr / 4 + 0];
            var r1 = getInt32Memory0()[retptr / 4 + 1];
            var r2 = getInt32Memory0()[retptr / 4 + 2];
            if (r2) {
                throw takeObject(r1);
            }
            return FileHandle.__wrap(r0);
        } finally {
            wasm.__wbindgen_add_to_stack_pointer(16);
        }
    }
    /**
    * @param {FileHandle} fh
    * @param {Uint8Array} buff
    */
    file_write(fh, buff) {
        try {
            const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
            _assertClass(fh, FileHandle);
            var ptr0 = passArray8ToWasm0(buff, wasm.__wbindgen_malloc);
            var len0 = WASM_VECTOR_LEN;
            wasm.fs_file_write(retptr, this.ptr, fh.ptr, ptr0, len0);
            var r0 = getInt32Memory0()[retptr / 4 + 0];
            var r1 = getInt32Memory0()[retptr / 4 + 1];
            if (r1) {
                throw takeObject(r0);
            }
        } finally {
            wasm.__wbindgen_add_to_stack_pointer(16);
        }
    }
    /**
    * @param {FileHandle} fh
    * @returns {Uint8Array}
    */
    file_read(fh) {
        try {
            const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
            _assertClass(fh, FileHandle);
            wasm.fs_file_read(retptr, this.ptr, fh.ptr);
            var r0 = getInt32Memory0()[retptr / 4 + 0];
            var r1 = getInt32Memory0()[retptr / 4 + 1];
            var r2 = getInt32Memory0()[retptr / 4 + 2];
            var r3 = getInt32Memory0()[retptr / 4 + 3];
            if (r3) {
                throw takeObject(r2);
            }
            var v0 = getArrayU8FromWasm0(r0, r1).slice();
            wasm.__wbindgen_free(r0, r1 * 1);
            return v0;
        } finally {
            wasm.__wbindgen_add_to_stack_pointer(16);
        }
    }
    /**
    * @param {FileHandle} fh
    */
    file_close(fh) {
        try {
            const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
            _assertClass(fh, FileHandle);
            var ptr0 = fh.ptr;
            fh.ptr = 0;
            wasm.fs_file_close(retptr, this.ptr, ptr0);
            var r0 = getInt32Memory0()[retptr / 4 + 0];
            var r1 = getInt32Memory0()[retptr / 4 + 1];
            if (r1) {
                throw takeObject(r0);
            }
        } finally {
            wasm.__wbindgen_add_to_stack_pointer(16);
        }
    }
    /**
    * @param {number} id
    * @returns {boolean}
    */
    bmap_get(id) {
        var ret = wasm.fs_bmap_get(this.ptr, id);
        return ret !== 0;
    }
    /**
    * @param {number} id
    */
    bmap_set_used(id) {
        wasm.fs_bmap_set_used(this.ptr, id);
    }
    /**
    * @param {number} id
    */
    bmap_set_unused(id) {
        wasm.fs_bmap_set_unused(this.ptr, id);
    }
    /**
    * @returns {number | undefined}
    */
    bmap_find_unused() {
        var ret = wasm.fs_bmap_find_unused(this.ptr);
        return ret === 0xFFFFFF ? undefined : ret;
    }
    /**
    * @param {number} id
    * @returns {boolean}
    */
    imap_get(id) {
        var ret = wasm.fs_imap_get(this.ptr, id);
        return ret !== 0;
    }
    /**
    * @param {number} id
    */
    imap_set_used(id) {
        wasm.fs_imap_set_used(this.ptr, id);
    }
    /**
    * @param {number} id
    */
    imap_set_unused(id) {
        wasm.fs_imap_set_unused(this.ptr, id);
    }
    /**
    * @returns {number | undefined}
    */
    imap_find_unused() {
        var ret = wasm.fs_imap_find_unused(this.ptr);
        return ret === 0xFFFFFF ? undefined : ret;
    }
}
/**
*/
export class FileCreateOk {

    static __wrap(ptr) {
        const obj = Object.create(FileCreateOk.prototype);
        obj.ptr = ptr;

        return obj;
    }

    __destroy_into_raw() {
        const ptr = this.ptr;
        this.ptr = 0;

        return ptr;
    }

    free() {
        const ptr = this.__destroy_into_raw();
        wasm.__wbg_filecreateok_free(ptr);
    }
    /**
    */
    get inode() {
        var ret = wasm.__wbg_get_filecreateok_inode(this.ptr);
        return INode.__wrap(ret);
    }
    /**
    * @param {INode} arg0
    */
    set inode(arg0) {
        _assertClass(arg0, INode);
        var ptr0 = arg0.ptr;
        arg0.ptr = 0;
        wasm.__wbg_set_filecreateok_inode(this.ptr, ptr0);
    }
    /**
    */
    get inode_id() {
        var ret = wasm.__wbg_get_filecreateok_inode_id(this.ptr);
        return ret;
    }
    /**
    * @param {number} arg0
    */
    set inode_id(arg0) {
        wasm.__wbg_set_filecreateok_inode_id(this.ptr, arg0);
    }
    /**
    */
    get block_id() {
        var ret = wasm.__wbg_get_filecreateok_block_id(this.ptr);
        return ret;
    }
    /**
    * @param {number} arg0
    */
    set block_id(arg0) {
        wasm.__wbg_set_filecreateok_block_id(this.ptr, arg0);
    }
}
/**
*/
export class FileHandle {

    static __wrap(ptr) {
        const obj = Object.create(FileHandle.prototype);
        obj.ptr = ptr;

        return obj;
    }

    __destroy_into_raw() {
        const ptr = this.ptr;
        this.ptr = 0;

        return ptr;
    }

    free() {
        const ptr = this.__destroy_into_raw();
        wasm.__wbg_filehandle_free(ptr);
    }
    /**
    */
    get mode() {
        var ret = wasm.__wbg_get_filehandle_mode(this.ptr);
        return ret >>> 0;
    }
    /**
    * @param {number} arg0
    */
    set mode(arg0) {
        wasm.__wbg_set_filehandle_mode(this.ptr, arg0);
    }
    /**
    */
    get inode_id() {
        var ret = wasm.__wbg_get_filehandle_inode_id(this.ptr);
        return ret;
    }
    /**
    * @param {number} arg0
    */
    set inode_id(arg0) {
        wasm.__wbg_set_filehandle_inode_id(this.ptr, arg0);
    }
    /**
    */
    get ptr_now() {
        var ret = wasm.__wbg_get_filehandle_ptr_now(this.ptr);
        return ret;
    }
    /**
    * @param {number} arg0
    */
    set ptr_now(arg0) {
        wasm.__wbg_set_filehandle_ptr_now(this.ptr, arg0);
    }
    /**
    */
    get ptr_offset() {
        var ret = wasm.__wbg_get_filehandle_ptr_offset(this.ptr);
        return ret >>> 0;
    }
    /**
    * @param {number} arg0
    */
    set ptr_offset(arg0) {
        wasm.__wbg_set_filehandle_ptr_offset(this.ptr, arg0);
    }
    /**
    */
    get ptr_addr() {
        var ret = wasm.__wbg_get_filehandle_ptr_addr(this.ptr);
        return ret >>> 0;
    }
    /**
    * @param {number} arg0
    */
    set ptr_addr(arg0) {
        wasm.__wbg_set_filehandle_ptr_addr(this.ptr, arg0);
    }
    /**
    */
    get ptr_id() {
        var ret = wasm.__wbg_get_filehandle_ptr_id(this.ptr);
        return ret;
    }
    /**
    * @param {number} arg0
    */
    set ptr_id(arg0) {
        wasm.__wbg_set_filehandle_ptr_id(this.ptr, arg0);
    }
    /**
    */
    get i_block() {
        var ret = wasm.__wbg_get_filehandle_i_block(this.ptr);
        return ret;
    }
    /**
    * @param {number} arg0
    */
    set i_block(arg0) {
        wasm.__wbg_set_filehandle_i_block(this.ptr, arg0);
    }
    /**
    * @param {boolean} crlf
    * @returns {string}
    */
    to_string(crlf) {
        try {
            const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
            wasm.filehandle_to_string(retptr, this.ptr, crlf);
            var r0 = getInt32Memory0()[retptr / 4 + 0];
            var r1 = getInt32Memory0()[retptr / 4 + 1];
            return getStringFromWasm0(r0, r1);
        } finally {
            wasm.__wbindgen_add_to_stack_pointer(16);
            wasm.__wbindgen_free(r0, r1);
        }
    }
}
/**
*/
export class INode {

    static __wrap(ptr) {
        const obj = Object.create(INode.prototype);
        obj.ptr = ptr;

        return obj;
    }

    __destroy_into_raw() {
        const ptr = this.ptr;
        this.ptr = 0;

        return ptr;
    }

    free() {
        const ptr = this.__destroy_into_raw();
        wasm.__wbg_inode_free(ptr);
    }
    /**
    */
    get mode() {
        var ret = wasm.__wbg_get_inode_mode(this.ptr);
        return ret;
    }
    /**
    * @param {number} arg0
    */
    set mode(arg0) {
        wasm.__wbg_set_inode_mode(this.ptr, arg0);
    }
    /**
    */
    get size() {
        var ret = wasm.__wbg_get_inode_size(this.ptr);
        return ret >>> 0;
    }
    /**
    * @param {number} arg0
    */
    set size(arg0) {
        wasm.__wbg_set_inode_size(this.ptr, arg0);
    }
    /**
    */
    get ptr1() {
        var ret = wasm.__wbg_get_inode_ptr1(this.ptr);
        return ret;
    }
    /**
    * @param {number} arg0
    */
    set ptr1(arg0) {
        wasm.__wbg_set_inode_ptr1(this.ptr, arg0);
    }
    /**
    */
    get ptr2() {
        var ret = wasm.__wbg_get_inode_ptr2(this.ptr);
        return ret;
    }
    /**
    * @param {number} arg0
    */
    set ptr2(arg0) {
        wasm.__wbg_set_inode_ptr2(this.ptr, arg0);
    }
    /**
    */
    get ptr3() {
        var ret = wasm.__wbg_get_inode_ptr3(this.ptr);
        return ret;
    }
    /**
    * @param {number} arg0
    */
    set ptr3(arg0) {
        wasm.__wbg_set_inode_ptr3(this.ptr, arg0);
    }
    /**
    */
    get ptr4() {
        var ret = wasm.__wbg_get_inode_ptr4(this.ptr);
        return ret;
    }
    /**
    * @param {number} arg0
    */
    set ptr4(arg0) {
        wasm.__wbg_set_inode_ptr4(this.ptr, arg0);
    }
    /**
    */
    get ptr5() {
        var ret = wasm.__wbg_get_inode_ptr5(this.ptr);
        return ret;
    }
    /**
    * @param {number} arg0
    */
    set ptr5(arg0) {
        wasm.__wbg_set_inode_ptr5(this.ptr, arg0);
    }
    /**
    */
    get uid() {
        var ret = wasm.__wbg_get_inode_uid(this.ptr);
        return ret;
    }
    /**
    * @param {number} arg0
    */
    set uid(arg0) {
        wasm.__wbg_set_inode_uid(this.ptr, arg0);
    }
    /**
    */
    get gid() {
        var ret = wasm.__wbg_get_inode_gid(this.ptr);
        return ret;
    }
    /**
    * @param {number} arg0
    */
    set gid(arg0) {
        wasm.__wbg_set_inode_gid(this.ptr, arg0);
    }
    /**
    */
    get atime() {
        var ret = wasm.__wbg_get_inode_atime(this.ptr);
        return ret >>> 0;
    }
    /**
    * @param {number} arg0
    */
    set atime(arg0) {
        wasm.__wbg_set_inode_atime(this.ptr, arg0);
    }
    /**
    */
    get mtime() {
        var ret = wasm.__wbg_get_inode_mtime(this.ptr);
        return ret >>> 0;
    }
    /**
    * @param {number} arg0
    */
    set mtime(arg0) {
        wasm.__wbg_set_inode_mtime(this.ptr, arg0);
    }
    /**
    */
    get ctime() {
        var ret = wasm.__wbg_get_inode_ctime(this.ptr);
        return ret >>> 0;
    }
    /**
    * @param {number} arg0
    */
    set ctime(arg0) {
        wasm.__wbg_set_inode_ctime(this.ptr, arg0);
    }
    /**
    * @param {boolean} crlf
    * @returns {string}
    */
    to_string(crlf) {
        try {
            const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
            wasm.inode_to_string(retptr, this.ptr, crlf);
            var r0 = getInt32Memory0()[retptr / 4 + 0];
            var r1 = getInt32Memory0()[retptr / 4 + 1];
            return getStringFromWasm0(r0, r1);
        } finally {
            wasm.__wbindgen_add_to_stack_pointer(16);
            wasm.__wbindgen_free(r0, r1);
        }
    }
}

async function load(module, imports) {
    if (typeof Response === 'function' && module instanceof Response) {
        if (typeof WebAssembly.instantiateStreaming === 'function') {
            try {
                return await WebAssembly.instantiateStreaming(module, imports);

            } catch (e) {
                if (module.headers.get('Content-Type') != 'application/wasm') {
                    console.warn("`WebAssembly.instantiateStreaming` failed because your server does not serve wasm with `application/wasm` MIME type. Falling back to `WebAssembly.instantiate` which is slower. Original error:\n", e);

                } else {
                    throw e;
                }
            }
        }

        const bytes = await module.arrayBuffer();
        return await WebAssembly.instantiate(bytes, imports);

    } else {
        const instance = await WebAssembly.instantiate(module, imports);

        if (instance instanceof WebAssembly.Instance) {
            return { instance, module };

        } else {
            return instance;
        }
    }
}

async function init(input) {
    if (typeof input === 'undefined') {
        input = new URL('ext0_bg.wasm', import.meta.url);
    }
    const imports = {};
    imports.wbg = {};
    imports.wbg.__wbg_now_b5215ffee26d321b = typeof Date.now == 'function' ? Date.now : notDefined('Date.now');
    imports.wbg.__wbg_log_2646dbabba67dca2 = function(arg0, arg1) {
        try {
            console.log(getStringFromWasm0(arg0, arg1));
        } finally {
            wasm.__wbindgen_free(arg0, arg1);
        }
    };
    imports.wbg.__wbindgen_string_new = function(arg0, arg1) {
        var ret = getStringFromWasm0(arg0, arg1);
        return addHeapObject(ret);
    };
    imports.wbg.__wbg_new_693216e109162396 = function() {
        var ret = new Error();
        return addHeapObject(ret);
    };
    imports.wbg.__wbg_stack_0ddaca5d1abfb52f = function(arg0, arg1) {
        var ret = getObject(arg1).stack;
        var ptr0 = passStringToWasm0(ret, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        var len0 = WASM_VECTOR_LEN;
        getInt32Memory0()[arg0 / 4 + 1] = len0;
        getInt32Memory0()[arg0 / 4 + 0] = ptr0;
    };
    imports.wbg.__wbg_error_09919627ac0992f5 = function(arg0, arg1) {
        try {
            console.error(getStringFromWasm0(arg0, arg1));
        } finally {
            wasm.__wbindgen_free(arg0, arg1);
        }
    };
    imports.wbg.__wbindgen_object_drop_ref = function(arg0) {
        takeObject(arg0);
    };
    imports.wbg.__wbindgen_throw = function(arg0, arg1) {
        throw new Error(getStringFromWasm0(arg0, arg1));
    };

    if (typeof input === 'string' || (typeof Request === 'function' && input instanceof Request) || (typeof URL === 'function' && input instanceof URL)) {
        input = fetch(input);
    }



    const { instance, module } = await load(await input, imports);

    wasm = instance.exports;
    init.__wbindgen_wasm_module = module;

    return wasm;
}

export default init;

