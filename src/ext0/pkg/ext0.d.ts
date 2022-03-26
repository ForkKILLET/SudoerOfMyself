/* tslint:disable */
/* eslint-disable */
/**
*/
export function init_panic_hook(): void;
/**
*/
export enum FileHandleMode {
  R,
  Wn,
  An,
  RW,
  RWn,
  RAn,
}
/**
*/
export enum FileType {
  Dir,
  Chr,
  Blk,
  Reg,
  FIFO,
  Lnk,
  Sock,
}
/**
*/
export class FS {
  free(): void;
/**
*/
  constructor();
/**
* @returns {Uint8Array}
*/
  get_raw(): Uint8Array;
/**
* @param {number} inode_id
* @returns {number}
*/
  static inode_get_offset(inode_id: number): number;
/**
* @param {number} inode_id
* @returns {Uint8Array}
*/
  inode_get_raw_vec(inode_id: number): Uint8Array;
/**
* @param {number} inode_id
* @returns {INode}
*/
  inode_get(inode_id: number): INode;
/**
* @param {number} uid
* @param {number} gid
* @returns {FileCreateOk}
*/
  file_create(uid: number, gid: number): FileCreateOk;
/**
* @param {number} inode_id
* @param {number} mode
* @returns {FileHandle}
*/
  file_open(inode_id: number, mode: number): FileHandle;
/**
* @param {FileHandle} fh
* @param {Uint8Array} buff
*/
  file_write(fh: FileHandle, buff: Uint8Array): void;
/**
* @param {FileHandle} fh
* @returns {Uint8Array}
*/
  file_read(fh: FileHandle): Uint8Array;
/**
* @param {FileHandle} fh
*/
  file_close(fh: FileHandle): void;
/**
* @param {number} id
* @returns {boolean}
*/
  bmap_get(id: number): boolean;
/**
* @param {number} id
*/
  bmap_set_used(id: number): void;
/**
* @param {number} id
*/
  bmap_set_unused(id: number): void;
/**
* @returns {number | undefined}
*/
  bmap_find_unused(): number | undefined;
/**
* @param {number} id
* @returns {boolean}
*/
  imap_get(id: number): boolean;
/**
* @param {number} id
*/
  imap_set_used(id: number): void;
/**
* @param {number} id
*/
  imap_set_unused(id: number): void;
/**
* @returns {number | undefined}
*/
  imap_find_unused(): number | undefined;
}
/**
*/
export class FileCreateOk {
  free(): void;
/**
*/
  block_id: number;
/**
*/
  inode: INode;
/**
*/
  inode_id: number;
}
/**
*/
export class FileHandle {
  free(): void;
/**
* @param {boolean} crlf
* @returns {string}
*/
  to_string(crlf: boolean): string;
/**
*/
  i_block: number;
/**
*/
  inode_id: number;
/**
*/
  mode: number;
/**
*/
  ptr_addr: number;
/**
*/
  ptr_id: number;
/**
*/
  ptr_now: number;
}
/**
*/
export class INode {
  free(): void;
/**
* @param {boolean} crlf
* @returns {string}
*/
  to_string(crlf: boolean): string;
/**
*/
  atime: number;
/**
*/
  ctime: number;
/**
*/
  gid: number;
/**
*/
  mode: number;
/**
*/
  mtime: number;
/**
*/
  ptr1: number;
/**
*/
  ptr2: number;
/**
*/
  ptr3: number;
/**
*/
  ptr4: number;
/**
*/
  ptr5: number;
/**
*/
  size: number;
/**
*/
  uid: number;
}

export type InitInput = RequestInfo | URL | Response | BufferSource | WebAssembly.Module;

export interface InitOutput {
  readonly memory: WebAssembly.Memory;
  readonly init_panic_hook: () => void;
  readonly __wbg_filecreateok_free: (a: number) => void;
  readonly __wbg_get_filecreateok_inode: (a: number) => number;
  readonly __wbg_set_filecreateok_inode: (a: number, b: number) => void;
  readonly __wbg_get_filecreateok_inode_id: (a: number) => number;
  readonly __wbg_set_filecreateok_inode_id: (a: number, b: number) => void;
  readonly __wbg_get_filecreateok_block_id: (a: number) => number;
  readonly __wbg_set_filecreateok_block_id: (a: number, b: number) => void;
  readonly __wbg_filehandle_free: (a: number) => void;
  readonly __wbg_get_filehandle_mode: (a: number) => number;
  readonly __wbg_set_filehandle_mode: (a: number, b: number) => void;
  readonly __wbg_get_filehandle_inode_id: (a: number) => number;
  readonly __wbg_set_filehandle_inode_id: (a: number, b: number) => void;
  readonly __wbg_get_filehandle_ptr_now: (a: number) => number;
  readonly __wbg_set_filehandle_ptr_now: (a: number, b: number) => void;
  readonly __wbg_get_filehandle_ptr_addr: (a: number) => number;
  readonly __wbg_set_filehandle_ptr_addr: (a: number, b: number) => void;
  readonly __wbg_get_filehandle_ptr_id: (a: number) => number;
  readonly __wbg_set_filehandle_ptr_id: (a: number, b: number) => void;
  readonly __wbg_get_filehandle_i_block: (a: number) => number;
  readonly __wbg_set_filehandle_i_block: (a: number, b: number) => void;
  readonly __wbg_fs_free: (a: number) => void;
  readonly fs_new: () => number;
  readonly fs_get_raw: (a: number, b: number) => void;
  readonly fs_inode_get_offset: (a: number) => number;
  readonly fs_inode_get_raw_vec: (a: number, b: number, c: number) => void;
  readonly fs_inode_get: (a: number, b: number) => number;
  readonly fs_file_create: (a: number, b: number, c: number, d: number) => void;
  readonly fs_file_open: (a: number, b: number, c: number, d: number) => void;
  readonly fs_file_write: (a: number, b: number, c: number, d: number, e: number) => void;
  readonly fs_file_read: (a: number, b: number, c: number) => void;
  readonly fs_file_close: (a: number, b: number, c: number) => void;
  readonly fs_bmap_get: (a: number, b: number) => number;
  readonly fs_bmap_set_used: (a: number, b: number) => void;
  readonly fs_bmap_set_unused: (a: number, b: number) => void;
  readonly fs_bmap_find_unused: (a: number) => number;
  readonly fs_imap_get: (a: number, b: number) => number;
  readonly fs_imap_set_used: (a: number, b: number) => void;
  readonly fs_imap_set_unused: (a: number, b: number) => void;
  readonly fs_imap_find_unused: (a: number) => number;
  readonly __wbg_inode_free: (a: number) => void;
  readonly __wbg_get_inode_mode: (a: number) => number;
  readonly __wbg_set_inode_mode: (a: number, b: number) => void;
  readonly __wbg_get_inode_size: (a: number) => number;
  readonly __wbg_set_inode_size: (a: number, b: number) => void;
  readonly __wbg_get_inode_ptr1: (a: number) => number;
  readonly __wbg_set_inode_ptr1: (a: number, b: number) => void;
  readonly __wbg_get_inode_ptr2: (a: number) => number;
  readonly __wbg_set_inode_ptr2: (a: number, b: number) => void;
  readonly __wbg_get_inode_ptr3: (a: number) => number;
  readonly __wbg_set_inode_ptr3: (a: number, b: number) => void;
  readonly __wbg_get_inode_ptr4: (a: number) => number;
  readonly __wbg_set_inode_ptr4: (a: number, b: number) => void;
  readonly __wbg_get_inode_ptr5: (a: number) => number;
  readonly __wbg_set_inode_ptr5: (a: number, b: number) => void;
  readonly __wbg_get_inode_uid: (a: number) => number;
  readonly __wbg_set_inode_uid: (a: number, b: number) => void;
  readonly __wbg_get_inode_gid: (a: number) => number;
  readonly __wbg_set_inode_gid: (a: number, b: number) => void;
  readonly __wbg_get_inode_atime: (a: number) => number;
  readonly __wbg_set_inode_atime: (a: number, b: number) => void;
  readonly __wbg_get_inode_mtime: (a: number) => number;
  readonly __wbg_set_inode_mtime: (a: number, b: number) => void;
  readonly __wbg_get_inode_ctime: (a: number) => number;
  readonly __wbg_set_inode_ctime: (a: number, b: number) => void;
  readonly inode_to_string: (a: number, b: number, c: number) => void;
  readonly filehandle_to_string: (a: number, b: number, c: number) => void;
  readonly __wbindgen_add_to_stack_pointer: (a: number) => number;
  readonly __wbindgen_free: (a: number, b: number) => void;
  readonly __wbindgen_malloc: (a: number) => number;
  readonly __wbindgen_realloc: (a: number, b: number, c: number) => number;
}

/**
* If `module_or_path` is {RequestInfo} or {URL}, makes a request and
* for everything else, calls `WebAssembly.instantiate` directly.
*
* @param {InitInput | Promise<InitInput>} module_or_path
*
* @returns {Promise<InitOutput>}
*/
export default function init (module_or_path?: InitInput | Promise<InitInput>): Promise<InitOutput>;
