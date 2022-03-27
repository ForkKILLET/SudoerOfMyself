use wasm_bindgen::prelude::*;
use paste::paste;

#[wasm_bindgen]
extern {
    #[wasm_bindgen(js_namespace = console)]
    fn log(s: String);

    #[wasm_bindgen(js_namespace = Date, js_name = now)]
    fn _time_now() -> f64;
}

fn time_now() -> u32 {
    (_time_now() as u64 / 1000) as u32
}

#[wasm_bindgen]
pub fn init_panic_hook() {
    #[cfg(feature = "console_error_panic_hook")]
    console_error_panic_hook::set_once();
}

const BLOCK_SIZE: u16               = 2048;
const BLOCK_BYTE: u16               = BLOCK_SIZE / 8;
const BLOCK_NUM: u16                = BLOCK_SIZE; // 1 bmap for all blocks
const TOTAL_BYTE: usize             = BLOCK_BYTE as usize * BLOCK_NUM as usize;

const INODE_SIZE: u16               = 256;
const INODE_BYTE: u16               = INODE_SIZE / 8;
const INODE_NUM: u16                = 1024;
const INODE_NUM_PER_BLOCK: u16      = BLOCK_BYTE / INODE_BYTE;
const INODE_BLOCK_NUM: u16          = INODE_NUM / INODE_NUM_PER_BLOCK;

const BMAP_OFFSET: u16              = 0;
const IMAP_OFFSET: u16              = 1;
const INODE_OFFSET: u16             = 2;
const BLOCK_OFFSET: u16             = 2 + INODE_BLOCK_NUM;

const BMAP_OFFSET_BYTE: usize       = BLOCK_BYTE as usize * BMAP_OFFSET     as usize;
const IMAP_OFFSET_BYTE: usize       = BLOCK_BYTE as usize * IMAP_OFFSET     as usize;
const INODE_OFFSET_BYTE: usize      = BLOCK_BYTE as usize * INODE_OFFSET    as usize;
#[allow(dead_code)]
const BLOCK_OFFSET_BYTE: usize      = BLOCK_BYTE as usize * BLOCK_OFFSET    as usize;

macro_rules! bitmap {
    ($parent:ident, $name:ident, $offset:expr, $block_num:expr) => {
        paste! {
            #[wasm_bindgen]
            impl $parent {
                pub fn [<$name _get>] (&self, id: u16) -> bool {
                    1 == (self.raw[$offset + id as usize / 8] >> (7 - id & 7)) & 1
                }
                pub fn [<$name _set_used>] (&mut self, id: u16) {
                    self.raw[$offset + id as usize / 8] |= 1 << (7 - id & 7)
                }
                pub fn [<$name _set_unused>] (&mut self, id: u16) {
                    self.raw[$offset + id as usize / 8] &= !(1 << (7 - id & 7))
                }
                pub fn [<$name _find_unused>] (&self) -> Option<u16> {
                    let byte_end: usize = $offset + BLOCK_BYTE as usize * $block_num as usize;
                    let mut byte_id: usize = $offset;
                    while byte_id < byte_end {
                        let byte = self.raw[byte_id];
                        let mut mask = 1 << 7;
                        let mut bit_id = 0;
                        while bit_id < 8 {
                            if byte & mask == 0 {
                                break
                            }
                            bit_id += 1;
                            mask >>= 1;
                        }
                        if bit_id < 8 {
                            return Some((byte_id - $offset) as u16 * 8 + bit_id)
                        }
                        byte_id += 1;
                    }
                    None
                }
            }
        }
    }
}

#[wasm_bindgen]
pub struct FileCreateOk {
    pub inode: INode,
    pub inode_id: u16,
    pub block_id: u16
}

#[wasm_bindgen]
#[derive(Debug, Copy, Clone)]
pub enum FileHandleMode {
    R,      // "r"
    Wn,     // "w"
    An,     // "a"
    RW,     // "r+"
    RWn,    // "w+"
    RAn,    // "a+"
}

#[wasm_bindgen]
#[derive(Debug)]
pub struct FileHandle {
    pub mode: FileHandleMode,
    pub inode_id: u16,
    pub ptr_now: u16,
    pub ptr_addr: usize,
    pub ptr_id: u16,
    pub i_block: u16,
    used_pnode: bool
}

impl FileHandle {
    fn init_ptr(&mut self, fs: &FS) {
        self.ptr_id = 1;
        self.ptr_addr = FS::inode_get_offset(self.inode_id) + 6;
        self.ptr_now = splice_u16(&fs.raw, self.ptr_addr);
    }

    fn next_ptr(&mut self, fs: &FS) -> bool { // returns true when tail
        self.i_block = 0;
        if self.ptr_id % 30 == 4 {
            self.ptr_addr += 2;
            self.ptr_now = splice_u16(&fs.raw, self.ptr_addr);
            if self.ptr_now != 0 && self.ptr_now < INODE_NUM {
                let offset = FS::inode_get_offset(self.ptr_now);
                self.ptr_now = splice_u16(&fs.raw, offset + 2);
                self.ptr_addr = offset + 2;
                self.used_pnode = true;
            }
        }
        else {
            if self.ptr_id % 30 == 5 {
                if ! self.used_pnode {
                    return true
                }
                else {
                    self.used_pnode = false
                }
            }
            self.ptr_addr += 2;
            self.ptr_now = splice_u16(&fs.raw, self.ptr_addr);
        }
        return false
    }
}

#[wasm_bindgen]
pub struct FS {
    raw: Vec<u8>,
    locks: Vec<u16>
}

macro_rules! file_walk {
    (
        { $fs:expr, $fh:expr, $buff:expr, $i_buff:expr, $buff_size:expr },
        when tail ptr => $tail_ptr:block,
        when null ptr => $null_ptr:block,
        when ok => $ok:block
    ) => {
        if $fh.ptr_id == 0 {
            $fh.init_ptr($fs);
        }

        while $i_buff < $buff_size {
            $ok
            $i_buff += 1;
            $fh.i_block += 1;
            if $fh.i_block == BLOCK_BYTE {
                $fh.i_block = 0;
                if $fh.next_ptr($fs) {
                    $tail_ptr
                }
                if $fh.ptr_now == 0 {
                    $null_ptr
                }
                $fh.ptr_id += 1;
            }
        }
    }
}

#[wasm_bindgen]
pub enum FileType {
    Dir     = 0b0100,
    Chr     = 0b0010,
    Blk     = 0b0110,
    Reg     = 0b1000,
    FIFO    = 0b0001,
    Lnk     = 0b1010,
    Sock    = 0b1100,
}

#[wasm_bindgen]
impl FS {
    #[wasm_bindgen(constructor)]
    pub fn new() -> FS {
        FS {
            raw: vec! [0; TOTAL_BYTE],
            locks: vec! []
        }
    }

    pub fn from_raw(raw: Vec<u8>) -> FS {
        FS {
            raw,
            locks: vec! []
        }
    }

    pub fn to_raw(&self) -> Vec<u8> {
        self.raw.clone()
    }

    pub fn inode_get_offset(inode_id: u16) -> usize {
        INODE_OFFSET_BYTE + (inode_id * INODE_BYTE) as usize
    }
    fn inode_get_raw(&self, inode_id: u16) -> &[u8] {
        let start = FS::inode_get_offset(inode_id);
        &self.raw[start..start + INODE_BYTE as usize]
    }
    pub fn inode_to_raw(&self, inode_id: u16) -> Vec<u8> {
        self.inode_get_raw(inode_id).into()
    }
    pub fn inode_get(&self, inode_id: u16) -> INode {
        INode::from_raw(FS::inode_get_offset(inode_id) as usize, &self.raw)
    }

    pub fn file_create(&mut self, uid: u16, gid: u16) -> Result<FileCreateOk, String> {
        let inode_id = self.imap_find_unused().ok_or("fs: no space for new inode".to_string())?;
        let block_id = self.bmap_find_unused().ok_or("fs: no space for new block".to_string())?;

        let now = time_now();
        let inode = INode {
            mode:   (FileType::Reg as u16) << 12 | 0o0644,
            size:   0,
            ptr1:   INODE_NUM + block_id as u16,
            ptr2:   0,
            ptr3:   0,
            ptr4:   0,
            ptr5:   0,
            uid,
            gid,
            atime:  now,
            mtime:  now,
            ctime:  now,
        };

        inode.to_raw(FS::inode_get_offset(inode_id) as usize, &mut self.raw);

        self.imap_set_used(inode_id);
        self.bmap_set_used(block_id);

        Ok(FileCreateOk {
            inode,
            inode_id,
            block_id
        })
    }

    pub fn file_open(&mut self, inode_id: u16, mode: FileHandleMode) -> Result<FileHandle, String> {
        if ! self.imap_get(inode_id) {
            Err("no such inode".to_string())?
        }

        if ! matches! (mode, FileHandleMode::R) {
            if self.locks.iter().any(|&x| x == inode_id) {
                Err("fs: file is locked")?;
            }
            else {
                self.locks.push(inode_id);
            }
        }

        Ok(FileHandle {
            mode,
            inode_id,
            i_block: 0,
            ptr_now: 0,
            ptr_id: 0,
            ptr_addr: 0,
            used_pnode: false
        })
    }

    pub fn file_write(&mut self, fh: &mut FileHandle, buff: Vec<u8>) -> Result<(), String> {
        use FileHandleMode::*;
        match fh.mode {
            R => {
                Err("fs: file handle is read-only")?;
            },
            Wn | RWn | RW => {},
            An | RAn => {}
        }

        let mut i_buff = 0;
        let buff_size = buff.len() as u16;

        file_walk! {
            { &self, fh, buff, i_buff, buff_size },
            when tail ptr => {
                if let Some(pnode_id) = self.imap_find_unused() {
                    self.imap_set_used(pnode_id);
                    let offset = FS::inode_get_offset(pnode_id);
                    split_u16(&mut self.raw, fh.ptr_addr, pnode_id);
                    split_u16(&mut self.raw, offset + 2, fh.ptr_now);
                    fh.ptr_now = 0;
                    fh.ptr_addr = offset + 4;
                }
                else {
                    Err("fs: no space for new pnode")?
                }
            },
            when null ptr => {
                if let Some(block_id) = self.bmap_find_unused() {
                    self.bmap_set_used(block_id);
                    fh.ptr_now = INODE_NUM + block_id;
                    split_u16(&mut self.raw, fh.ptr_addr, fh.ptr_now);
                }
                else {
                    Err("fs: no space for new block")?
                }
            },
            when ok => {
                self.raw[((fh.ptr_now - INODE_NUM + BLOCK_OFFSET) * BLOCK_BYTE + fh.i_block) as usize] = buff[i_buff as usize];
            }
        }

        INodeHelper::from_id(fh.inode_id).set_size(self, buff.len() as u32);

        Ok(())
    }

    pub fn file_read(&self, fh: &mut FileHandle) -> Result<Vec<u8>, String> {
        use FileHandleMode::*;
        match fh.mode {
            Wn | An => Err("fs: file handle is write-only")?,
            _ => {}
        }

        let buff_size = INodeHelper::from_id(fh.inode_id).get_size(self) as usize;
        
        let mut buff: Vec<u8> = Vec::with_capacity(buff_size);
        let mut i_buff = 0;

        file_walk! {
            { &self, fh, buff, i_buff, buff_size },
            when tail ptr => {},
            when null ptr => {
                Err("fs: got null ptr when reading the file")?;
            },
            when ok => {
                buff.push(self.raw[((fh.ptr_now - INODE_NUM + BLOCK_OFFSET)* BLOCK_BYTE + fh.i_block) as usize]);
            }
        }

        Ok(buff)
    }

    pub fn file_close(&mut self, fh: FileHandle) -> Result<(), String> {
        if ! matches! (fh.mode, FileHandleMode::R) {
            if let Some(i) = self.locks.iter().position(|&x| x == fh.inode_id) {
                self.locks.swap_remove(i);
            }
            else {
                Err("fs: file is not locked")?;
            }
        }
        Ok(())
    }
}

bitmap! (FS, bmap, BMAP_OFFSET_BYTE, 1);
bitmap! (FS, imap, IMAP_OFFSET_BYTE, 1);

#[inline(always)]
fn splice_u16(vec: &Vec<u8>, start: usize) -> u16 {
    ((vec[start] as u16) << 8) | vec[start + 1] as u16
}
#[inline(always)]
fn splice_u32(vec: &Vec<u8>, start: usize) -> u32 {
    ((splice_u16(vec, start) as u32) << 16) | splice_u16(vec, start + 2) as u32
}
#[inline(always)]
fn split_u16(vec: &mut Vec<u8>, start: usize, val: u16) {
    vec[start] = (val >> 8) as u8;
    vec[start + 1] = (val & 0xFF) as u8;
}
#[inline(always)]
fn split_u32(vec: &mut Vec<u8>, start: usize, val: u32) {
    split_u16(vec, start, (val >> 16) as u16);
    split_u16(vec, start + 2, (val & 0xFFFF) as u16);
}

macro_rules! define_inode {
    ($($attr:tt: $ty:ty, $byte:expr,)+) => {
        paste! {
            #[wasm_bindgen]
            #[derive(Debug, Copy, Clone)]
            pub struct INode {
                $(pub $attr: $ty,)+
            }

            impl INode {
                pub fn from_raw(offset: usize, raw: &Vec<u8>) -> INode {
                    let offset = offset as usize;
                    INode {
                        $(
                            $attr: [<splice_ $ty>](raw, offset + $byte),
                        )+
                    }
                }

                pub fn to_raw(&self, offset: usize, raw: &mut Vec<u8>) {
                    $(
                        [<split_ $ty>](raw, offset + $byte, self.$attr);
                    )+
                }
            }

            #[allow(dead_code)]
            struct INodeHelper {
                inode_id: u16,
                inode_offset: usize
            }

            #[allow(dead_code)]
            impl INodeHelper {
                pub fn from_id(inode_id: u16) -> INodeHelper {
                    INodeHelper {
                        inode_id,
                        inode_offset: FS::inode_get_offset(inode_id)
                    }
                }

                $(
                    pub fn [<get_ $attr>](&self, fs: &FS) -> $ty {
                        [<splice_ $ty>](&fs.raw, self.inode_offset + $byte)
                    }
                    pub fn [<set_ $attr>](&self, fs: &mut FS, val: $ty) {
                        [<split_ $ty>](&mut fs.raw, self.inode_offset + $byte, val);
                    }
                )+
            }
        }
    }
}

define_inode! {
    mode:   u16,00,
    size:   u32,02,
    ptr1:   u16,06,
    ptr2:   u16,08,
    ptr3:   u16,10,
    ptr4:   u16,12,
    ptr5:   u16,14,
    uid:    u16,16,
    gid:    u16,18,
    atime:  u32,20,
    mtime:  u32,24,
    ctime:  u32,28,
}

// Call me when wasm_bindgen support trait impl.
macro_rules! impl_to_fmt_string {
    ($ty:ty) => {
        #[wasm_bindgen]
        impl $ty {
            pub fn to_string(&self, crlf: bool) -> String {
                let s = format! ("{:#?}", self);
                if crlf {
                    s.replace("\n", "\r\n")
                }
                else {
                    s
                }
            }
        }
    }
}

impl_to_fmt_string! { INode }
impl_to_fmt_string! { FileHandle }
