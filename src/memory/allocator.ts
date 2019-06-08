import { Pointer, alignTo8, alignBin, alignTo } from './types';
import { MemoryChunk } from './memory-chunk';
import { toInt32 } from './coercion';
import { createArray, assert } from '../utils';

const PAGE_SIZE = 4096;

export class Allocator {
    memory: ArrayBuffer;
    totalSize: number;
    freeSize: number;

    programBreak: number;
    freeChuncks: MemoryChunk[];

    int32View: Int32Array;
    float64View: Float64Array;
}

export function createAllocator(size: number, options?: object): Allocator {
    const allocator: Allocator = new Allocator();
    const memory: ArrayBuffer = new ArrayBuffer(size);
    const alignedSize: number = alignTo(PAGE_SIZE, size);

    allocator.freeChuncks = new Array(1);
    allocator.freeChuncks[0] = {
        address: 0,
        size
    };

    allocator.programBreak = 32;

    allocator.totalSize = alignedSize;
    allocator.freeSize = alignedSize - 32;

    allocator.memory = memory;

    allocator.int32View = new Int32Array(memory);
    allocator.float64View = new Float64Array(memory);

    return allocator;
}

export function sbrk(allocator: Allocator, amount: number): Pointer {
    const { programBreak, totalSize } = allocator;
    const newProgramBreak = programBreak + amount;

    if (newProgramBreak >= 0 && newProgramBreak <= totalSize) {
        allocator.programBreak = newProgramBreak;
        allocator.freeSize = allocator.totalSize - newProgramBreak;

        return programBreak;
    }

    return -1;
}

export function allocate(allocator: Allocator, size: number): Pointer {
    const freeMemoryChunk: MemoryChunk = getFreeMemoryAddress(allocator.freeChuncks, size);

    if (freeMemoryChunk === null) return null; 

    const { address, size: chunkSize } = freeMemoryChunk;
    const addressWithAlignment: number = address < 8 ? alignBin(address) : alignTo8(address);

    if ((address + chunkSize) - (addressWithAlignment + size)) {
        const newAddress: number = addressWithAlignment + size;
        const newSize: number = (address + chunkSize) - newAddress;

        const zeroChunk: MemoryChunk = getZeroSizeMemoryChunk(allocator.freeChuncks);

        if (zeroChunk) {
            zeroChunk.address = newAddress;
            zeroChunk.size = newSize;
        } else {
            allocator.freeChuncks.push({
                address: newAddress,
                size: newSize,
            });
        }
    }

    freeMemoryChunk.size = addressWithAlignment - address;

    insertationSort(allocator.freeChuncks);

    return addressWithAlignment;
}

export function get4Byte(a: Allocator, address: number): number {
    return a.int32View[address >> 2];
}

export function set4Byte(a: Allocator, address: number, v: number): number {
    return a.int32View[address >> 2] = v;
}

export function get8Byte(a: Allocator, address: number): number {
    return a.float64View[address >> 3];
}

export function set8Byte(a: Allocator, address: number, v: number): number {
    return a.float64View[address >> 3] = v;
}

export function getFreeMemoryAddress(chunks: MemoryChunk[], size: number): MemoryChunk | null {
    return getFreeMemoryAddressRec(chunks, size, 0, chunks.length);
}

function getZeroSizeMemoryChunk(chunks: MemoryChunk[]): MemoryChunk | null {
    for (let i = 0; i < chunks.length; i++) {
        if (!chunks[i].size) return chunks[i];
    }

    return null;
}

function getFreeMemoryAddressRec(chunks: MemoryChunk[], size: number, l: number, r: number): MemoryChunk | null {
    const median: number = toInt32((r + l) / 2);
    const { address, size: chunkSize } = chunks[median];
    const sizeWithAlignment: number = chunkSize - (alignTo8(address) - address);

    if (r - l === 0) return sizeWithAlignment < size ? null : chunks[median];

    if (size <= sizeWithAlignment) return getFreeMemoryAddressRec(chunks, size, l, median);
    return getFreeMemoryAddressRec(chunks, size, median + 1, r);
}

function insertationSort(chunks: MemoryChunk[]): void {
    let temp: number;

    for (let i = 1; i < chunks.length; i++) {
        for (let j = i - 1; j < i; j++) {
            if (chunks[i].size < chunks[j].size) {
                temp = chunks[i].size;
                chunks[i].size = chunks[j].size;
                chunks[j].size = temp;

                temp = chunks[i].address;
                chunks[i].address = chunks[j].address;
                chunks[j].address = temp;
            } else break;
        }
    }
}

// ----------------------dlmalloc-------------------

const USE_LOCKS: boolean = false;
const INSECURE: boolean = false;
const DEBUG: boolean = true;
const FOOTERS: boolean = false;

const T_SIZE: number           = 4;
const MALLOC_ALIGNMENT: number = 2 * T_SIZE;
const malloc_getpagesize: number = PAGE_SIZE;
const DEFAULT_GRANULARITY: number = 0;

function CORRUPTION_ERROR_ACTION(_: mstate): never { // #define CORRUPTION_ERROR_ACTION(m) ABORT
  throw 'CORRUPTION_ERROR_ACTION';
}

let ok_address: (M: mstate, a: Pointer) => boolean;
let ok_next: (p: Pointer, n: Pointer) => boolean;
// let ok_inuse;
// let ok_pinuse;

if (!INSECURE) {
  /* Check if address a is at least as high as any from MORECORE or MMAP */
  ok_address = function (M: mstate, a: Pointer): boolean { // #define ok_address(M, a) ((char*)(a) >= (M)->least_addr)
    return a >= M.least_addr;
  }
  // /* Check if address of next chunk n is higher than base chunk p */
  ok_next = function (p: Pointer, n: Pointer): boolean { // #define ok_next(p, n)    ((char*)(p) < (char*)(n))
    return p < n;
  }
  // /* Check if p has inuse status */
  // #define ok_inuse(p)     is_inuse(p)
  // /* Check if p has its pinuse bit on */
  // #define ok_pinuse(p)     pinuse(p)
} else {
  ok_address = function (_: mstate, __: Pointer): boolean { //   #define ok_address(M, a) (1)
    return true;
  }

  ok_next = function (p: Pointer, n: Pointer): boolean { return true; } // #define ok_next(b, n)    (1)
  // #define ok_inuse(p)      (1)
  // #define ok_pinuse(p)     (1)
}

// #if !FOOTERS

// #define mark_inuse_foot(M,p,s)

/* Macros for setting head/foot of non-mmapped chunks */

/* Set cinuse bit and pinuse bit of next chunk */
// #define set_inuse(M,p,s)\
//   ((p)->head = (((p)->head & PINUSE_BIT)|s|CINUSE_BIT),\
//   ((mchunkptr)(((char*)(p)) + (s)))->head |= PINUSE_BIT)

/* Set cinuse and pinuse of this chunk and pinuse of next chunk */
function set_inuse_and_pinuse(a: Allocator, _: mstate, p: mchunkptr, s: number): void { // #define set_inuse_and_pinuse(M,p,s)
  setHeadValue(a, p, (s | PINUSE_BIT | CINUSE_BIT)); //   ((p)->head = (s|PINUSE_BIT|CINUSE_BIT),

  const head: number = getHeadValue(a, p + s);

  setHeadValue(a, p + s, head | PINUSE_BIT); //   ((mchunkptr)(((char*)(p)) + (s)))->head |= PINUSE_BIT)
}

/* Set size, cinuse and pinuse bit of this chunk */
function set_size_and_pinuse_of_inuse_chunk(a: Allocator, _: mstate, p: mchunkptr, s: number): void { // #define set_size_and_pinuse_of_inuse_chunk(M, p, s)\
  setHeadValue(a, p, s | PINUSE_BIT | CINUSE_BIT); // ((p)->head = (s|PINUSE_BIT|CINUSE_BIT))
}

// #else /* FOOTERS */

// /* Set foot of inuse chunk to be xor of mstate and seed */
// #define mark_inuse_foot(M,p,s)\
//   (((mchunkptr)((char*)(p) + (s)))->prev_foot = ((size_t)(M) ^ mparams.magic))

// #define get_mstate_for(p)\
//   ((mstate)(((mchunkptr)((char*)(p) +\
//     (chunksize(p))))->prev_foot ^ mparams.magic))

// #define set_inuse(M,p,s)\
//   ((p)->head = (((p)->head & PINUSE_BIT)|s|CINUSE_BIT),\
//   (((mchunkptr)(((char*)(p)) + (s)))->head |= PINUSE_BIT), \
//   mark_inuse_foot(M,p,s))

// #define set_inuse_and_pinuse(M,p,s)\
//   ((p)->head = (s|PINUSE_BIT|CINUSE_BIT),\
//   (((mchunkptr)(((char*)(p)) + (s)))->head |= PINUSE_BIT),\
//  mark_inuse_foot(M,p,s))

// #define set_size_and_pinuse_of_inuse_chunk(M, p, s)\
//   ((p)->head = (s|PINUSE_BIT|CINUSE_BIT),\
//   mark_inuse_foot(M, p, s))

// #endif /* !FOOTERS */

/* -------------------------- Debugging setup ---------------------------- */

let check_malloced_chunk: (a: Allocator, M: mstate, P: Pointer, N: number) => void;
let check_top_chunk: (a: Allocator, M: mstate, P: Pointer) => void;

if (!DEBUG) {
  // #define check_free_chunk(M,P)
  // #define check_inuse_chunk(M,P)
  check_malloced_chunk = function (_, __, ___, ____): void {} // #define check_malloced_chunk(M,P,N)
  // #define check_mmapped_chunk(M,P)
  // #define check_malloc_state(M)
  check_top_chunk = function (_, __, ___): void {} // #define check_top_chunk(M,P)
} else { // #else /* DEBUG */
  // #define check_free_chunk(M,P)       do_check_free_chunk(M,P)
  // #define check_inuse_chunk(M,P)      do_check_inuse_chunk(M,P)
  check_top_chunk = do_check_top_chunk; // #define check_top_chunk(M,P)        do_check_top_chunk(M,P)
  check_malloced_chunk = do_check_malloced_chunk; // #define check_malloced_chunk(M,P,N) do_check_malloced_chunk(M,P,N)
  // #define check_mmapped_chunk(M,P)    do_check_mmapped_chunk(M,P)
  // #define check_malloc_state(M)       do_check_malloc_state(M)

  /* ------------------------- Debugging Support --------------------------- */

/* Check properties of any chunk, whether free, inuse, mmapped etc  */
function do_check_any_chunk(a: Allocator, m: mstate, p: mchunkptr): void { // static void do_check_any_chunk(mstate m, mchunkptr p) {
  assert((is_aligned(chunk2mem(p))) || (getHeadValue(a, p) === FENCEPOST_HEAD)); // assert((is_aligned(chunk2mem(p))) || (p->head == FENCEPOST_HEAD));
  assert(ok_address(m, p));
}

// /* Check properties of top chunk */
// static void do_check_top_chunk(mstate m, mchunkptr p) {
//   msegmentptr sp = segment_holding(m, (char*)p);
//   size_t  sz = p->head & ~INUSE_BITS; /* third-lowest bit can be set! */
//   assert(sp != 0);
//   assert((is_aligned(chunk2mem(p))) || (p->head == FENCEPOST_HEAD));
//   assert(ok_address(m, p));
//   assert(sz == m->topsize);
//   assert(sz > 0);
//   assert(sz == ((sp->base + sp->size) - (char*)p) - TOP_FOOT_SIZE);
//   assert(pinuse(p));
//   assert(!pinuse(chunk_plus_offset(p, sz)));
// }

/* Check properties of (inuse) mmapped chunks */
function do_check_mmapped_chunk(a: Allocator, m: mstate, p: mchunkptr): void { // static void do_check_mmapped_chunk(mstate m, mchunkptr p) {
  const sz: number = chunksize(a, p); //   size_t  sz = chunksize(p);
  const len: number = (sz + getFootValue(a, p) + MMAP_FOOT_PAD); //   size_t len = (sz + (p->prev_foot) + MMAP_FOOT_PAD);

  assert(is_mmapped(a, p));
  assert(Boolean(use_mmap(m)));
  assert((is_aligned(chunk2mem(p))) || (getHeadValue(a, p) === FENCEPOST_HEAD)); //  assert((is_aligned(chunk2mem(p))) || (p->head == FENCEPOST_HEAD));
  assert(ok_address(m, p));
  assert(!is_small(sz));
  assert((len & (mparams.page_size - SIZE_T_ONE)) === 0);
  // assert(chunk_plus_offset(p, sz)->head == FENCEPOST_HEAD);
  // assert(chunk_plus_offset(p, sz+SIZE_T_SIZE)->head == 0);
}

/* Check properties of inuse chunks */
function do_check_inuse_chunk(a: Allocator, m: mstate, p: mchunkptr): void { // static void do_check_inuse_chunk(mstate m, mchunkptr p) {
  do_check_any_chunk(a, m, p);

  assert(is_inuse(a, p));
  assert(Boolean(next_pinuse(a, p)));

  /* If not pinuse and not mmapped, previous chunk has OK offset */
  assert(is_mmapped(a, p) || Boolean(pinuse(a, p)) || next_chunk(a, prev_chunk(a, p)) == p);

  if (is_mmapped(a, p)) {
    do_check_mmapped_chunk(a, m, p); 
  }
}

// /* Check properties of free chunks */
// static void do_check_free_chunk(mstate m, mchunkptr p) {
//   size_t sz = chunksize(p);
//   mchunkptr next = chunk_plus_offset(p, sz);
//   do_check_any_chunk(m, p);
//   assert(!is_inuse(p));
//   assert(!next_pinuse(p));
//   assert (!is_mmapped(p));
//   if (p != m->dv && p != m->top) {
//     if (sz >= MIN_CHUNK_SIZE) {
//       assert((sz & CHUNK_ALIGN_MASK) == 0);
//       assert(is_aligned(chunk2mem(p)));
//       assert(next->prev_foot == sz);
//       assert(pinuse(p));
//       assert (next == m->top || is_inuse(next));
//       assert(p->fd->bk == p);
//       assert(p->bk->fd == p);
//     }
//     else  /* markers are always of size SIZE_T_SIZE */
//       assert(sz == SIZE_T_SIZE);
//   }
// }

/* Check properties of malloced chunks at the point they are malloced */
function do_check_malloced_chunk(a: Allocator, m: mstate, mem: Pointer, s: number): void { // static void do_check_malloced_chunk(mstate m, void* mem, size_t s) {
  if (mem !== 0) {
    const p: mchunkptr = mem2chunk(mem); //     mchunkptr p = mem2chunk(mem);
    const sz: number = getHeadValue(a, p) & ~INUSE_BITS; //     size_t sz = p->head & ~INUSE_BITS;

    do_check_inuse_chunk(a, m, p);

    assert((sz & CHUNK_ALIGN_MASK) == 0);
    assert(sz >= MIN_CHUNK_SIZE);
    assert(sz >= s);

    /* unless mmapped, size is less than MIN_CHUNK_SIZE more than request */
    assert(is_mmapped(a, p) || sz < (s + MIN_CHUNK_SIZE));
  }
}

// /* Check a tree and its subtrees.  */
// static void do_check_tree(mstate m, tchunkptr t) {
//   tchunkptr head = 0;
//   tchunkptr u = t;
//   bindex_t tindex = t->index;
//   size_t tsize = chunksize(t);
//   bindex_t idx;
//   compute_tree_index(tsize, idx);
//   assert(tindex == idx);
//   assert(tsize >= MIN_LARGE_SIZE);
//   assert(tsize >= minsize_for_tree_index(idx));
//   assert((idx == NTREEBINS-1) || (tsize < minsize_for_tree_index((idx+1))));

//   do { /* traverse through chain of same-sized nodes */
//     do_check_any_chunk(m, ((mchunkptr)u));
//     assert(u->index == tindex);
//     assert(chunksize(u) == tsize);
//     assert(!is_inuse(u));
//     assert(!next_pinuse(u));
//     assert(u->fd->bk == u);
//     assert(u->bk->fd == u);
//     if (u->parent == 0) {
//       assert(u->child[0] == 0);
//       assert(u->child[1] == 0);
//     }
//     else {
//       assert(head == 0); /* only one node on chain has parent */
//       head = u;
//       assert(u->parent != u);
//       assert (u->parent->child[0] == u ||
//               u->parent->child[1] == u ||
//               *((tbinptr*)(u->parent)) == u);
//       if (u->child[0] != 0) {
//         assert(u->child[0]->parent == u);
//         assert(u->child[0] != u);
//         do_check_tree(m, u->child[0]);
//       }
//       if (u->child[1] != 0) {
//         assert(u->child[1]->parent == u);
//         assert(u->child[1] != u);
//         do_check_tree(m, u->child[1]);
//       }
//       if (u->child[0] != 0 && u->child[1] != 0) {
//         assert(chunksize(u->child[0]) < chunksize(u->child[1]));
//       }
//     }
//     u = u->fd;
//   } while (u != t);
//   assert(head != 0);
// }

// /*  Check all the chunks in a treebin.  */
// static void do_check_treebin(mstate m, bindex_t i) {
//   tbinptr* tb = treebin_at(m, i);
//   tchunkptr t = *tb;
//   int empty = (m->treemap & (1U << i)) == 0;
//   if (t == 0)
//     assert(empty);
//   if (!empty)
//     do_check_tree(m, t);
// }

// /*  Check all the chunks in a smallbin.  */
// static void do_check_smallbin(mstate m, bindex_t i) {
//   sbinptr b = smallbin_at(m, i);
//   mchunkptr p = b->bk;
//   unsigned int empty = (m->smallmap & (1U << i)) == 0;
//   if (p == b)
//     assert(empty);
//   if (!empty) {
//     for (; p != b; p = p->bk) {
//       size_t size = chunksize(p);
//       mchunkptr q;
//       /* each chunk claims to be free */
//       do_check_free_chunk(m, p);
//       /* chunk belongs in bin */
//       assert(small_index(size) == i);
//       assert(p->bk == b || chunksize(p->bk) == chunksize(p));
//       /* chunk is followed by an inuse chunk */
//       q = next_chunk(p);
//       if (q->head != FENCEPOST_HEAD)
//         do_check_inuse_chunk(m, q);
//     }
//   }
// }

// /* Find x in a bin. Used in other check functions. */
// static int bin_find(mstate m, mchunkptr x) {
//   size_t size = chunksize(x);
//   if (is_small(size)) {
//     bindex_t sidx = small_index(size);
//     sbinptr b = smallbin_at(m, sidx);
//     if (smallmap_is_marked(m, sidx)) {
//       mchunkptr p = b;
//       do {
//         if (p == x)
//           return 1;
//       } while ((p = p->fd) != b);
//     }
//   }
//   else {
//     bindex_t tidx;
//     compute_tree_index(size, tidx);
//     if (treemap_is_marked(m, tidx)) {
//       tchunkptr t = *treebin_at(m, tidx);
//       size_t sizebits = size << leftshift_for_tree_index(tidx);
//       while (t != 0 && chunksize(t) != size) {
//         t = t->child[(sizebits >> (SIZE_T_BITSIZE-SIZE_T_ONE)) & 1];
//         sizebits <<= 1;
//       }
//       if (t != 0) {
//         tchunkptr u = t;
//         do {
//           if (u == (tchunkptr)x)
//             return 1;
//         } while ((u = u->fd) != t);
//       }
//     }
//   }
//   return 0;
// }

// /* Traverse each chunk and check it; return total */
// static size_t traverse_and_check(mstate m) {
//   size_t sum = 0;
//   if (is_initialized(m)) {
//     msegmentptr s = &m->seg;
//     sum += m->topsize + TOP_FOOT_SIZE;
//     while (s != 0) {
//       mchunkptr q = align_as_chunk(s->base);
//       mchunkptr lastq = 0;
//       assert(pinuse(q));
//       while (segment_holds(s, q) &&
//              q != m->top && q->head != FENCEPOST_HEAD) {
//         sum += chunksize(q);
//         if (is_inuse(q)) {
//           assert(!bin_find(m, q));
//           do_check_inuse_chunk(m, q);
//         }
//         else {
//           assert(q == m->dv || bin_find(m, q));
//           assert(lastq == 0 || is_inuse(lastq)); /* Not 2 consecutive free */
//           do_check_free_chunk(m, q);
//         }
//         lastq = q;
//         q = next_chunk(q);
//       }
//       s = s->next;
//     }
//   }
//   return sum;
// }


// /* Check all properties of malloc_state. */
// static void do_check_malloc_state(mstate m) {
//   bindex_t i;
//   size_t total;
//   /* check bins */
//   for (i = 0; i < NSMALLBINS; ++i)
//     do_check_smallbin(m, i);
//   for (i = 0; i < NTREEBINS; ++i)
//     do_check_treebin(m, i);

//   if (m->dvsize != 0) { /* check dv chunk */
//     do_check_any_chunk(m, m->dv);
//     assert(m->dvsize == chunksize(m->dv));
//     assert(m->dvsize >= MIN_CHUNK_SIZE);
//     assert(bin_find(m, m->dv) == 0);
//   }

//   if (m->top != 0) {   /* check top chunk */
//     do_check_top_chunk(m, m->top);
//     /*assert(m->topsize == chunksize(m->top)); redundant */
//     assert(m->topsize > 0);
//     assert(bin_find(m, m->top) == 0);
//   }

//   total = traverse_and_check(m);
//   assert(total <= m->footprint);
//   assert(m->footprint <= m->max_footprint);
// }

} // #endif /* DEBUG */





// static void   do_check_any_chunk(mstate m, mchunkptr p);
// static void   do_check_top_chunk(mstate m, mchunkptr p);
// static void   do_check_mmapped_chunk(mstate m, mchunkptr p);
// static void   do_check_inuse_chunk(mstate m, mchunkptr p);
// static void   do_check_free_chunk(mstate m, mchunkptr p);
// static void   do_check_malloced_chunk(mstate m, void* mem, size_t s);
// static void   do_check_tree(mstate m, tchunkptr t);
// static void   do_check_treebin(mstate m, bindex_t i);
// static void   do_check_smallbin(mstate m, bindex_t i);
// static void   do_check_malloc_state(mstate m);
// static int    bin_find(mstate m, mchunkptr x);
// static size_t traverse_and_check(mstate m);


/* ------------------- size_t and alignment properties -------------------- */

/* The byte and bit size of a size_t */
const SIZE_T_SIZE: number        = T_SIZE;          // #define SIZE_T_SIZE         (sizeof(size_t))
const SIZE_T_BITSIZE: number     = (T_SIZE << 3);   // #define SIZE_T_BITSIZE      (sizeof(size_t) << 3)

/* The maximum possible size_t value has all bits set */
const MAX_SIZE_T: number         = (2 ** (T_SIZE << SIZE_T_BITSIZE) - 1); // #define MAX_SIZE_T           (~(size_t)0)

/* Some constants coerced to size_t */
/* Annoying but necessary to avoid errors on some platforms */
const SIZE_T_ZERO: number         = 0; // #define SIZE_T_ZERO         ((size_t)0)
const SIZE_T_ONE: number          = 1; // #define SIZE_T_ONE          ((size_t)1)
const SIZE_T_TWO: number          = 2; // #define SIZE_T_TWO          ((size_t)2)
const SIZE_T_FOUR: number         = 4; // #define SIZE_T_FOUR         ((size_t)4)
const TWO_SIZE_T_SIZES: number    = SIZE_T_SIZE << 1; // #define TWO_SIZE_T_SIZES    (SIZE_T_SIZE<<1)
const FOUR_SIZE_T_SIZES: number   = SIZE_T_SIZE << 2; // #define FOUR_SIZE_T_SIZES   (SIZE_T_SIZE<<2)
const SIX_SIZE_T_SIZES: number    = FOUR_SIZE_T_SIZES + TWO_SIZE_T_SIZES; // #define SIX_SIZE_T_SIZES    (FOUR_SIZE_T_SIZES+TWO_SIZE_T_SIZES)
const HALF_MAX_SIZE_T: number     = toInt32(MAX_SIZE_T / 2); // #define HALF_MAX_SIZE_T     (MAX_SIZE_T / 2U)

/* The bit mask value corresponding to MALLOC_ALIGNMENT */
const CHUNK_ALIGN_MASK: number    = MALLOC_ALIGNMENT - SIZE_T_ONE; // #define CHUNK_ALIGN_MASK    (MALLOC_ALIGNMENT - SIZE_T_ONE)

/* True if address a has acceptable alignment */
function is_aligned(A: Pointer): boolean { // #define is_aligned(A)       (((size_t)((A)) & (CHUNK_ALIGN_MASK)) == 0)
  return ((A) & (CHUNK_ALIGN_MASK)) == 0;
}

// /* the number of bytes to offset an address to align it */
// const align_offset(A)\
//  ((((size_t)(A) & CHUNK_ALIGN_MASK) == 0)? 0 :\
//   ((MALLOC_ALIGNMENT - ((size_t)(A) & CHUNK_ALIGN_MASK)) & CHUNK_ALIGN_MASK))

/* -------------------------- MMAP preliminaries ------------------------- */

/*
   If HAVE_MORECORE or HAVE_MMAP are false, we just define calls and
   checks to fail so compiler optimizer can delete code rather than
   using so many "#if"s.
*/


/* MORECORE and MMAP must return MFAIL on failure */
const MFAIL: Pointer = MAX_SIZE_T;  // #define MFAIL ((void*)(MAX_SIZE_T))
const CMFAIL: Pointer = MFAIL;      // #define CMFAIL ((char*)(MFAIL)) /* defined for convenience */

const USE_MMAP_BIT: number = SIZE_T_ONE; // #define USE_MMAP_BIT            (SIZE_T_ONE)

/* ------------------ Operations on head and foot fields ----------------- */

/*
  The head field of a chunk is or'ed with PINUSE_BIT when previous
  adjacent chunk in use, and or'ed with CINUSE_BIT if this chunk is in
  use, unless mmapped, in which case both bits are cleared.

  FLAG4_BIT is not used by this malloc, but might be useful in extensions.
*/

const PINUSE_BIT: number =  (SIZE_T_ONE); // #define PINUSE_BIT          (SIZE_T_ONE)
const CINUSE_BIT: number =  (SIZE_T_TWO); // #define CINUSE_BIT          (SIZE_T_TWO)
const FLAG4_BIT: number =   (SIZE_T_FOUR); // #define FLAG4_BIT           (SIZE_T_FOUR)
const INUSE_BITS: number =  (PINUSE_BIT | CINUSE_BIT); // #define INUSE_BITS          (PINUSE_BIT|CINUSE_BIT)
const FLAG_BITS: number =   (PINUSE_BIT | CINUSE_BIT | FLAG4_BIT); // #define FLAG_BITS           (PINUSE_BIT|CINUSE_BIT|FLAG4_BIT)

/* Head value for fenceposts */
const FENCEPOST_HEAD: number = (INUSE_BITS | SIZE_T_SIZE); // #define FENCEPOST_HEAD      (INUSE_BITS|SIZE_T_SIZE)

/* extraction of fields from head words */
// #define cinuse(p)           ((p)->head & CINUSE_BIT)
function pinuse(a: Allocator, p: mchunkptr): number { // #define pinuse(p)           ((p)->head & PINUSE_BIT)
  return (getHeadValue(a, p) & PINUSE_BIT);
}

// #define flag4inuse(p)       ((p)->head & FLAG4_BIT)
function is_inuse(a: Allocator, p: mchunkptr): boolean { // #define is_inuse(p)         (((p)->head & INUSE_BITS) != PINUSE_BIT)
  return (getHeadValue(a, p) & INUSE_BITS) != PINUSE_BIT;
}

function is_mmapped(a: Allocator, p: mchunkptr): boolean { // #define is_mmapped(p)       (((p)->head & INUSE_BITS) == 0)
  return ((getHeadValue(a, p) & INUSE_BITS) == 0);
}

function chunksize(a: Allocator, p: mchunkptr): number { // ((p)->head & ~(FLAG_BITS)) // #define chunksize(p)        ((p)->head & ~(FLAG_BITS))
  return getHeadValue(a, p) & ~(FLAG_BITS);
}
// const clear_pinuse(p)     ((p)->head &= ~PINUSE_BIT)
// const set_flag4(p)        ((p)->head |= FLAG4_BIT)
// const clear_flag4(p)      ((p)->head &= ~FLAG4_BIT)

/* Treat space at ptr +/- offset as a chunk */
function chunk_plus_offset(p: mchunkptr, s: Pointer): mchunkptr { // #define chunk_plus_offset(p, s)  ((mchunkptr)(((char*)(p)) + (s)))
  return p + s;
}
function chunk_minus_offset(p: mchunkptr, s: Pointer): mchunkptr { // #define chunk_minus_offset(p, s) ((mchunkptr)(((char*)(p)) - (s)))
  return p - s;
}

/* Ptr to next or previous physical malloc_chunk. */
function next_chunk(a: Allocator, p: mchunkptr): mchunkptr { // #define next_chunk(p) ((mchunkptr)( ((char*)(p)) + ((p)->head & ~FLAG_BITS)))
  return ((p) + (getHeadValue(a, p) & ~FLAG_BITS));
}

function prev_chunk(a: Allocator, p: mchunkptr): mchunkptr { // #define prev_chunk(p) ((mchunkptr)( ((char*)(p)) - ((p)->prev_foot) ))
  return (((p)) - (getFootValue(a, p)));
}

/* extract next chunk's pinuse bit */
function next_pinuse(a: Allocator, p: mchunkptr): number { // #define next_pinuse(p)  ((next_chunk(p)->head) & PINUSE_BIT)
  return getHeadValue(a, next_chunk(a, p)) & PINUSE_BIT;
}

// /* Get/set size at footer */
function get_foot(a: Allocator, p: mchunkptr, s: Pointer): void { // #define get_foot(p, s)  (((mchunkptr)((char*)(p) + (s)))->prev_foot)
  getFootValue(a, p + s);
}
function set_foot(a: Allocator, p: mchunkptr, s: Pointer): void { // #define set_foot(p, s)  (((mchunkptr)((char*)(p) + (s)))->prev_foot = (s))
  setFootValue(a, p + s, s);
}

/* Set size, pinuse bit, and foot */
function set_size_and_pinuse_of_free_chunk(a: Allocator, p: mchunkptr, s: number): void { //  #define set_size_and_pinuse_of_free_chunk(p, s)
  setHeadValue(a, p, s | PINUSE_BIT); // ((p)->head = (s|PINUSE_BIT), set_foot(p, s))
  set_foot(a, p, s);
}


// /* Set size, pinuse bit, foot, and clear next pinuse */
// const set_free_with_pinuse(p, s, n)\
//   (clear_pinuse(n), set_size_and_pinuse_of_free_chunk(p, s))

// /* Get the internal overhead associated with chunk p */
// const overhead_for(p)\
//  (is_mmapped(p)? MMAP_CHUNK_OVERHEAD : CHUNK_OVERHEAD)

// /* Return true if malloced space is not necessarily cleared */
// #if MMAP_CLEARS
// const calloc_must_clear(p) (!is_mmapped(p))
// #else /* MMAP_CLEARS */
// const calloc_must_clear(p) (1)
// #endif /* MMAP_CLEARS */

/* -----------------------  Chunk representations ------------------------ */

/*
  (The following includes lightly edited explanations by Colin Plumb.)

  The malloc_chunk declaration below is misleading (but accurate and
  necessary).  It declares a "view" into memory allowing access to
  necessary fields at known offsets from a given base.

  Chunks of memory are maintained using a `boundary tag' method as
  originally described by Knuth.  (See the paper by Paul Wilson
  ftp://ftp.cs.utexas.edu/pub/garbage/allocsrv.ps for a survey of such
  techniques.)  Sizes of free chunks are stored both in the front of
  each chunk and at the end.  This makes consolidating fragmented
  chunks into bigger chunks fast.  The head fields also hold bits
  representing whether chunks are free or in use.

  Here are some pictures to make it clearer.  They are "exploded" to
  show that the state of a chunk can be thought of as extending from
  the high 31 bits of the head field of its header through the
  prev_foot and PINUSE_BIT bit of the following chunk header.

  A chunk that's in use looks like:

   chunk-> +-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
           | Size of previous chunk (if P = 0)                             |
           +-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
         +-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+ |P|
         | Size of this chunk                                         1| +-+
   mem-> +-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
         |                                                               |
         +-                                                             -+
         |                                                               |
         +-                                                             -+
         |                                                               :
         +-      size - sizeof(size_t) available payload bytes          -+
         :                                                               |
 chunk-> +-                                                             -+
         |                                                               |
         +-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
       +-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+ |1|
       | Size of next chunk (may or may not be in use)               | +-+
 mem-> +-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+

    And if it's free, it looks like this:

   chunk-> +-                                                             -+
           | User payload (must be in use, or we would have merged!)       |
           +-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
         +-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+ |P|
         | Size of this chunk                                         0| +-+
   mem-> +-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
         | Next pointer                                                  |
         +-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
         | Prev pointer                                                  |
         +-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
         |                                                               :
         +-      size - sizeof(struct chunk) unused bytes               -+
         :                                                               |
 chunk-> +-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
         | Size of this chunk                                            |
         +-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
       +-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+ |0|
       | Size of next chunk (must be in use, or we would have merged)| +-+
 mem-> +-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
       |                                                               :
       +- User payload                                                -+
       :                                                               |
       +-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
                                                                     |0|
                                                                     +-+
  Note that since we always merge adjacent free chunks, the chunks
  adjacent to a free chunk must be in use.

  Given a pointer to a chunk (which can be derived trivially from the
  payload pointer) we can, in O(1) time, find out whether the adjacent
  chunks are free, and if so, unlink them from the lists that they
  are on and merge them with the current chunk.

  Chunks always begin on even word boundaries, so the mem portion
  (which is returned to the user) is also on an even word boundary, and
  thus at least double-word aligned.

  The P (PINUSE_BIT) bit, stored in the unused low-order bit of the
  chunk size (which is always a multiple of two words), is an in-use
  bit for the *previous* chunk.  If that bit is *clear*, then the
  word before the current chunk size contains the previous chunk
  size, and can be used to find the front of the previous chunk.
  The very first chunk allocated always has this bit set, preventing
  access to non-existent (or non-owned) memory. If pinuse is set for
  any given chunk, then you CANNOT determine the size of the
  previous chunk, and might even get a memory addressing fault when
  trying to do so.

  The C (CINUSE_BIT) bit, stored in the unused second-lowest bit of
  the chunk size redundantly records whether the current chunk is
  inuse (unless the chunk is mmapped). This redundancy enables usage
  checks within free and realloc, and reduces indirection when freeing
  and consolidating chunks.

  Each freshly allocated chunk must have both cinuse and pinuse set.
  That is, each allocated chunk borders either a previously allocated
  and still in-use chunk, or the base of its memory arena. This is
  ensured by making all allocations from the `lowest' part of any
  found chunk.  Further, no free chunk physically borders another one,
  so each free chunk is known to be preceded and followed by either
  inuse chunks or the ends of memory.

  Note that the `foot' of the current chunk is actually represented
  as the prev_foot of the NEXT chunk. This makes it easier to
  deal with alignments etc but can be very confusing when trying
  to extend or adapt this code.

  The exceptions to all this are

     1. The special chunk `top' is the top-most available chunk (i.e.,
        the one bordering the end of available memory). It is treated
        specially.  Top is never included in any bin, is used only if
        no other chunk is available, and is released back to the
        system if it is very large (see M_TRIM_THRESHOLD).  In effect,
        the top chunk is treated as larger (and thus less well
        fitting) than any other available chunk.  The top chunk
        doesn't update its trailing size field since there is no next
        contiguous chunk that would have to index off it. However,
        space is still allocated for it (TOP_FOOT_SIZE) to enable
        separation or merging when space is extended.

     3. Chunks allocated via mmap, have both cinuse and pinuse bits
        cleared in their head fields.  Because they are allocated
        one-by-one, each must carry its own prev_foot field, which is
        also used to hold the offset this chunk has within its mmapped
        region, which is needed to preserve alignment. Each mmapped
        chunk is trailed by the first two fields of a fake next-chunk
        for sake of usage checks.

*/

                            // typedef struct malloc_chunk  mchunk;
type mchunkptr = Pointer;   // typedef struct malloc_chunk* mchunkptr;
type sbinptr = Pointer;     // typedef struct malloc_chunk* sbinptr;  /* The type of bins of chunks */
type bindex_t = number;     // typedef unsigned int bindex_t;         /* Described below */
type binmap_t = number;     // typedef unsigned int binmap_t;         /* Described below */
type flag_t = number;       // typedef unsigned int flag_t;           /* The type of various bit flag sets */

                                            // struct malloc_chunk {
const prevFoot: number      = SIZE_T_SIZE;  //   size_t               prev_foot;  /* Size of previous chunk (if free).  */
const head: number          = SIZE_T_SIZE;  //   size_t               head;       /* Size and inuse bits. */
const fd: mchunkptr         = SIZE_T_SIZE;  //   struct malloc_chunk* fd;         /* double links -- used only if free. */
const bk: mchunkptr         = SIZE_T_SIZE;  //   struct malloc_chunk* bk;
                                            // };

const prevFootOffset: number = 0;
const headOffset: number = prevFootOffset + prevFoot;
const fdOffset: number = headOffset + head;
const bkOffset: number = fdOffset + fd;

function getFootAddress(chunck: mchunkptr): mchunkptr {
  return chunck + prevFootOffset;
}

function getFootValue(a: Allocator, chunck: mchunkptr): mchunkptr {
  return get4Byte(a, getFootAddress(chunck));
}

function setFootValue(a: Allocator, chunck: mchunkptr, size: number): mchunkptr {
  return set4Byte(a, getFootAddress(chunck), size);
}

function getHeadAddress(chunck: mchunkptr): mchunkptr {
  return chunck + headOffset;
}

function getHeadValue(a: Allocator, chunck: mchunkptr): mchunkptr {
  return get4Byte(a, getHeadAddress(chunck));
}

function setHeadValue(a: Allocator, chunck: mchunkptr, size: number): mchunkptr {
  return set4Byte(a, getHeadAddress(chunck), size);
}

function getForwardAddress(chunck: mchunkptr): mchunkptr {
  return chunck + fdOffset;
}

function getForwardValue(a: Allocator, chunck: mchunkptr): mchunkptr {
  return get4Byte(a, getForwardAddress(chunck));
}

function setForwardValue(a: Allocator, chunck: mchunkptr, fd: mchunkptr): mchunkptr {
  return set4Byte(a, getForwardAddress(chunck), fd);
}

function getBackwardAddress(chunck: mchunkptr): mchunkptr {
  return chunck + bkOffset;
}

function getBackwardValue(a: Allocator, chunck: mchunkptr): mchunkptr {
  return get4Byte(a, getBackwardAddress(chunck));
}

function setBackwardValue(a: Allocator, chunck: mchunkptr, bk: mchunkptr): mchunkptr {
  return set4Byte(a, getBackwardAddress(chunck), bk);
}

/* ------------------- Chunks sizes and alignments ----------------------- */

const MCHUNK_SIZE: number   = bkOffset + bk; // #define MCHUNK_SIZE         (sizeof(mchunk))

// #if FOOTERS
// #define CHUNK_OVERHEAD      (TWO_SIZE_T_SIZES)
// #else /* FOOTERS */
const CHUNK_OVERHEAD: number = SIZE_T_SIZE; // #define CHUNK_OVERHEAD      (SIZE_T_SIZE)
// #endif /* FOOTERS */

// /* MMapped chunks need a second word of overhead ... */
// #define MMAP_CHUNK_OVERHEAD (TWO_SIZE_T_SIZES)
// /* ... and additional padding for fake next-chunk at foot */
const MMAP_FOOT_PAD: number = FOUR_SIZE_T_SIZES; // #define MMAP_FOOT_PAD       (FOUR_SIZE_T_SIZES)

/* The smallest size we can malloc is an aligned minimal chunk */
const MIN_CHUNK_SIZE: number = ((MCHUNK_SIZE + CHUNK_ALIGN_MASK) & ~CHUNK_ALIGN_MASK);      // #define MIN_CHUNK_SIZE\
                                                                                            //   ((MCHUNK_SIZE + CHUNK_ALIGN_MASK) & ~CHUNK_ALIGN_MASK)

// /* conversion from malloc headers to user pointers, and back */
function chunk2mem(p: mchunkptr): Pointer { // #define chunk2mem(p)        ((void*)((char*)(p)       + TWO_SIZE_T_SIZES))
  return p + TWO_SIZE_T_SIZES;
}

function mem2chunk(mem: Pointer): mchunkptr { // #define mem2chunk(mem)      ((mchunkptr)((char*)(mem) - TWO_SIZE_T_SIZES))
  return mem - TWO_SIZE_T_SIZES;
}
// /* chunk associated with aligned address A */
// #define align_as_chunk(A)   (mchunkptr)((A) + align_offset(chunk2mem(A)))

/* Bounds on request (not chunk) sizes. */
const MAX_REQUEST: number = ((-MIN_CHUNK_SIZE) << 2);                       //  #define MAX_REQUEST         ((-MIN_CHUNK_SIZE) << 2)
const MIN_REQUEST: number = (MIN_CHUNK_SIZE - CHUNK_OVERHEAD - SIZE_T_ONE); // #define MIN_REQUEST         (MIN_CHUNK_SIZE - CHUNK_OVERHEAD - SIZE_T_ONE)

/* pad request bytes into a usable size */
function pad_request(req: number): number {                                       // #define pad_request(req) \
return (((req) + CHUNK_OVERHEAD + CHUNK_ALIGN_MASK) & ~CHUNK_ALIGN_MASK); //    (((req) + CHUNK_OVERHEAD + CHUNK_ALIGN_MASK) & ~CHUNK_ALIGN_MASK)
}

// /* pad request, checking for minimum (but not maximum) */
// #define request2size(req) \
//   (((req) < MIN_REQUEST)? MIN_CHUNK_SIZE : pad_request(req))



/* ---------------------------- malloc_state ----------------------------- */

/*
   A malloc_state holds all of the bookkeeping for a space.
   The main fields are:

  Top
    The topmost chunk of the currently active segment. Its size is
    cached in topsize.  The actual size of topmost space is
    topsize+TOP_FOOT_SIZE, which includes space reserved for adding
    fenceposts and segment records if necessary when getting more
    space from the system.  The size at which to autotrim top is
    cached from mparams in trim_check, except that it is disabled if
    an autotrim fails.

  Designated victim (dv)
    This is the preferred chunk for servicing small requests that
    don't have exact fits.  It is normally the chunk split off most
    recently to service another small request.  Its size is cached in
    dvsize. The link fields of this chunk are not maintained since it
    is not kept in a bin.

  SmallBins
    An array of bin headers for free chunks.  These bins hold chunks
    with sizes less than MIN_LARGE_SIZE bytes. Each bin contains
    chunks of all the same size, spaced 8 bytes apart.  To simplify
    use in double-linked lists, each bin header acts as a malloc_chunk
    pointing to the real first node, if it exists (else pointing to
    itself).  This avoids special-casing for headers.  But to avoid
    waste, we allocate only the fd/bk pointers of bins, and then use
    repositioning tricks to treat these as the fields of a chunk.

  TreeBins
    Treebins are pointers to the roots of trees holding a range of
    sizes. There are 2 equally spaced treebins for each power of two
    from TREE_SHIFT to TREE_SHIFT+16. The last bin holds anything
    larger.

  Bin maps
    There is one bit map for small bins ("smallmap") and one for
    treebins ("treemap).  Each bin sets its bit when non-empty, and
    clears the bit when empty.  Bit operations are then used to avoid
    bin-by-bin searching -- nearly all "search" is done without ever
    looking at bins that won't be selected.  The bit maps
    conservatively use 32 bits per map word, even if on 64bit system.
    For a good description of some of the bit-based techniques used
    here, see Henry S. Warren Jr's book "Hacker's Delight" (and
    supplement at http://hackersdelight.org/). Many of these are
    intended to reduce the branchiness of paths through malloc etc, as
    well as to reduce the number of memory locations read or written.

  Segments
    A list of segments headed by an embedded malloc_segment record
    representing the initial space.

  Address check support
    The least_addr field is the least address ever obtained from
    MORECORE or MMAP. Attempted frees and reallocs of any address less
    than this are trapped (unless INSECURE is defined).

  Magic tag
    A cross-check field that should always hold same value as mparams.magic.

  Max allowed footprint
    The maximum allowed bytes to allocate from system (zero means no limit)

  Flags
    Bits recording whether to use MMAP, locks, or contiguous MORECORE

  Statistics
    Each space keeps track of current and maximum system memory
    obtained via MORECORE or MMAP.

  Trim support
    Fields holding the amount of unused topmost memory that should trigger
    trimming, and a counter to force periodic scanning to release unused
    non-topmost segments.

  Locking
    If USE_LOCKS is defined, the "mutex" lock is acquired and released
    around every public call using this mspace.

  Extension support
    A void* pointer and a size_t field that can be used to help implement
    extensions to this malloc.
*/

/* Bin types, widths and sizes */
const NSMALLBINS: number            = 32;   // #define NSMALLBINS        (32U)
const NTREEBINS: number             = 32;   // #define NTREEBINS         (32U)
const SMALLBIN_SHIFT: number        = 3;    // #define SMALLBIN_SHIFT    (3U)
const SMALLBIN_WIDTH: number        = SIZE_T_ONE << SMALLBIN_SHIFT; // #define SMALLBIN_WIDTH    (SIZE_T_ONE << SMALLBIN_SHIFT)
const TREEBIN_SHIFT: number         = 8;    // #define TREEBIN_SHIFT     (8U)
const MIN_LARGE_SIZE: number        = SIZE_T_ONE << TREEBIN_SHIFT; // #define MIN_LARGE_SIZE    (SIZE_T_ONE << TREEBIN_SHIFT)
const MAX_SMALL_SIZE: number        = MIN_LARGE_SIZE - SIZE_T_ONE; // #define MAX_SMALL_SIZE    (MIN_LARGE_SIZE - SIZE_T_ONE)
const MAX_SMALL_REQUEST: number     = MAX_SMALL_SIZE - CHUNK_ALIGN_MASK - CHUNK_OVERHEAD; // #define MAX_SMALL_REQUEST (MAX_SMALL_SIZE - CHUNK_ALIGN_MASK - CHUNK_OVERHEAD)

interface mallocState {         // struct malloc_state {
  smallmap: binmap_t;           //   binmap_t   smallmap;
  treemap: binmap_t;            //   binmap_t   treemap;
  dvsize: number;               //   size_t     dvsize;
  topsize: number;              //   size_t     topsize;
  least_addr: Pointer;          //   char*      least_addr;
  dv: mchunkptr;                //   mchunkptr  dv;
  top: mchunkptr;               //   mchunkptr  top;
                                //   size_t     trim_check;
                                //   size_t     release_checks;
                                //   size_t     magic;
  smallbins: Array<mchunkptr>;  //   mchunkptr  smallbins[(NSMALLBINS+1)*2];
  treebins: Array<tbinptr>;     //   tbinptr    treebins[NTREEBINS];
                                //   size_t     footprint;
                                //   size_t     max_footprint;
                                //   size_t     footprint_limit; /* zero means no limit */
  mflags: flag_t;               //   flag_t     mflags;
                                // #if USE_LOCKS
                                //   MLOCK_T    mutex;     /* locate lock among fields that rarely change */
                                // #endif /* USE_LOCKS */
                                //   msegment   seg;
                                //   void*      extp;      /* Unused but available for extensions */
                                //   size_t     exts;
}                               // };

 type mstate = mallocState; //typedef struct malloc_state*    mstate;

 /* ------------- Global malloc_state and malloc_params ------------------- */

/*
  malloc_params holds global properties, including those that can be
  dynamically set using mallopt. There is a single instance, mparams,
  initialized in init_mparams. Note that the non-zeroness of "magic"
  also serves as an initialization flag.
*/

interface mallocParams { // struct malloc_params {
  magic: number;          //   size_t magic;
  page_size: number;      //   size_t page_size;
  granularity: number;    //   size_t granularity;
  mmap_threshold: number; //   size_t mmap_threshold;
  trim_threshold: number; //   size_t trim_threshold;
  default_mflags: flag_t; //   flag_t default_mflags;
};

type malloc_params = mallocParams;
const mparams: malloc_params = { // static struct malloc_params mparams;
    magic: 0,
    page_size: 0,
    granularity: 0,
    mmap_threshold: 0,
    trim_threshold: 0,
    default_mflags: 0,
}; 

/* Ensure mparams initialized */
function ensure_initialization(): void { // #define ensure_initialization() (void)(mparams.magic != 0 || init_mparams())
    mparams.magic != 0 || init_mparams();
}

//#if !ONLY_MSPACES

/* The global malloc_state used for all non-"mspace" calls */
const _gm_: mstate = { // static struct malloc_state _gm_;
  smallmap: 0,
  treemap: 0,
  dvsize: 0,
  topsize: 0,
  least_addr: 0,
  dv: 0,
  top: 0,
  smallbins: createArray<mchunkptr>((NSMALLBINS + 1) * 2, 0),
  treebins: createArray<tbinptr>(NTREEBINS, 0),
  mflags: 0,
};
const gm: mstate = _gm_; // #define gm                 (&_gm_)

function is_global(M: mstate): boolean { // #define is_global(M)       ((M) == &_gm_)
    return M === _gm_;
}

// #endif /* !ONLY_MSPACES */

function is_initialized(M: mstate): boolean {// #define is_initialized(M)  ((M)->top != 0)
    return M.top !== 0;
}

/* ---------------------- Overlaid data structures ----------------------- */

/*
  When chunks are not in use, they are treated as nodes of either
  lists or trees.

  "Small"  chunks are stored in circular doubly-linked lists, and look
  like this:

    chunk-> +-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
            |             Size of previous chunk                            |
            +-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
    `head:' |             Size of chunk, in bytes                         |P|
      mem-> +-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
            |             Forward pointer to next chunk in list             |
            +-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
            |             Back pointer to previous chunk in list            |
            +-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
            |             Unused space (may be 0 bytes long)                .
            .                                                               .
            .                                                               |
nextchunk-> +-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
    `foot:' |             Size of chunk, in bytes                           |
            +-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+

  Larger chunks are kept in a form of bitwise digital trees (aka
  tries) keyed on chunksizes.  Because malloc_tree_chunks are only for
  free chunks greater than 256 bytes, their size doesn't impose any
  constraints on user chunk sizes.  Each node looks like:

    chunk-> +-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
            |             Size of previous chunk                            |
            +-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
    `head:' |             Size of chunk, in bytes                         |P|
      mem-> +-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
            |             Forward pointer to next chunk of same size        |
            +-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
            |             Back pointer to previous chunk of same size       |
            +-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
            |             Pointer to left child (child[0])                  |
            +-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
            |             Pointer to right child (child[1])                 |
            +-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
            |             Pointer to parent                                 |
            +-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
            |             bin index of this chunk                           |
            +-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
            |             Unused space                                      .
            .                                                               |
nextchunk-> +-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
    `foot:' |             Size of chunk, in bytes                           |
            +-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+

  Each tree holding treenodes is a tree of unique chunk sizes.  Chunks
  of the same size are arranged in a circularly-linked list, with only
  the oldest chunk (the next to be used, in our FIFO ordering)
  actually in the tree.  (Tree members are distinguished by a non-null
  parent pointer.)  If a chunk with the same size an an existing node
  is inserted, it is linked off the existing node using pointers that
  work in the same way as fd/bk pointers of small chunks.

  Each tree contains a power of 2 sized range of chunk sizes (the
  smallest is 0x100 <= x < 0x180), which is is divided in half at each
  tree level, with the chunks in the smaller half of the range (0x100
  <= x < 0x140 for the top nose) in the left subtree and the larger
  half (0x140 <= x < 0x180) in the right subtree.  This is, of course,
  done by inspecting individual bits.

  Using these rules, each node's left subtree contains all smaller
  sizes than its right subtree.  However, the node at the root of each
  subtree has no particular ordering relationship to either.  (The
  dividing line between the subtree sizes is based on trie relation.)
  If we remove the last chunk of a given size from the interior of the
  tree, we need to replace it with a leaf node.  The tree ordering
  rules permit a node to be replaced by any leaf below it.

  The smallest chunk in a tree (a common operation in a best-fit
  allocator) can be found by walking a path to the leftmost leaf in
  the tree.  Unlike a usual binary tree, where we follow left child
  pointers until we reach a null, here we follow the right child
  pointer any time the left one is null, until we reach a leaf with
  both child pointers null. The smallest chunk in the tree will be
  somewhere along that path.

  The worst case number of steps to add, find, or remove a node is
  bounded by the number of bits differentiating chunks within
  bins. Under current bin calculations, this ranges from 6 up to 21
  (for 32 bit sizes) or up to 53 (for 64 bit sizes). The typical case
  is of course much better.
*/

// struct malloc_tree_chunk {
//   /* The first four fields must be compatible with malloc_chunk */
// const prevFoot: number      = SIZE_T_SIZE; //   size_t                    prev_foot;
// const head: number          = SIZE_T_SIZE; //   size_t                    head;
// const fd: mchunkptr         = SIZE_T_SIZE; //   struct malloc_tree_chunk* fd;
// const bk: mchunkptr         = SIZE_T_SIZE; //   struct malloc_tree_chunk* bk;
const leftChild: tbinptr       = SIZE_T_SIZE; //   struct malloc_tree_chunk* child[2];
const rigthChild: tbinptr      = SIZE_T_SIZE;
const parent: tbinptr          = SIZE_T_SIZE; // struct malloc_tree_chunk* parent;
const index: bindex_t          = SIZE_T_SIZE; //   bindex_t                  index;
// };

// typedef struct malloc_tree_chunk  tchunk;
type tchunkptr = Pointer; // typedef struct malloc_tree_chunk* tchunkptr;
type tbinptr = Pointer;  // typedef struct malloc_tree_chunk* tbinptr; /* The type of bins of trees */

const leftChildOffset: number = bkOffset + bk;
const rigthChildOffset: number = leftChildOffset + leftChild;
const parentOffset: number = rigthChildOffset + rigthChild;
const indexOffset: number = parentOffset + parent;

function getLeftChildAddress(chunck: mchunkptr): mchunkptr {
  return chunck + leftChildOffset;
}

function getLeftChildValue(a: Allocator, chunck: mchunkptr): mchunkptr {
  return get4Byte(a, getLeftChildAddress(chunck));
}

function setLeftChildValue(a: Allocator, chunck: mchunkptr, size: number): mchunkptr {
  return set4Byte(a, getLeftChildAddress(chunck), size);
}

function getRigthChildAddress(chunck: mchunkptr): mchunkptr {
  return chunck + rigthChildOffset;
}

function getRigthChildValue(a: Allocator, chunck: mchunkptr): mchunkptr {
  return get4Byte(a, getRigthChildAddress(chunck));
}

function setRigthChildValue(a: Allocator, chunck: mchunkptr, size: number): mchunkptr {
  return set4Byte(a, getRigthChildAddress(chunck), size);
}

function getParentAddress(chunck: mchunkptr): mchunkptr {
  return chunck + parentOffset;
}

function getParentValue(a: Allocator, chunck: mchunkptr): mchunkptr {
  return get4Byte(a, getParentAddress(chunck));
}

function setParentValue(a: Allocator, chunck: mchunkptr, fd: mchunkptr): mchunkptr {
  return set4Byte(a, getParentAddress(chunck), fd);
}

function getIndexAddress(chunck: mchunkptr): mchunkptr {
  return chunck + indexOffset;
}

function getIndexValue(a: Allocator, chunck: mchunkptr): mchunkptr {
  return get4Byte(a, getIndexAddress(chunck));
}

function setIndexValue(a: Allocator, chunck: mchunkptr, bk: mchunkptr): mchunkptr {
  return set4Byte(a, getIndexAddress(chunck), bk);
}

/* A little helper macro for trees */
function leftmost_child(a: Allocator, t: tchunkptr): tchunkptr { // #define leftmost_child(t) ((t)->child[0] != 0? (t)->child[0] : (t)->child[1])
  const leftChild: mchunkptr = getLeftChildValue(a, t);

  return leftChild != 0 ? leftChild : getRigthChildValue(a, t);
}

/* -------------------------- system alloc setup ------------------------- */

/* Operations on mflags */

// #define use_lock(M)           ((M)->mflags &   USE_LOCK_BIT)
// #define enable_lock(M)        ((M)->mflags |=  USE_LOCK_BIT)
// #if USE_LOCKS
// #define disable_lock(M)       ((M)->mflags &= ~USE_LOCK_BIT)
// #else
// #define disable_lock(M)
// #endif

function use_mmap(M: mstate): number { // #define use_mmap(M)           ((M)->mflags &   USE_MMAP_BIT)
    return M.mflags & USE_MMAP_BIT;
}
// #define enable_mmap(M)        ((M)->mflags |=  USE_MMAP_BIT)
// #if HAVE_MMAP
// #define disable_mmap(M)       ((M)->mflags &= ~USE_MMAP_BIT)
// #else
// #define disable_mmap(M)
// #endif

// #define use_noncontiguous(M)  ((M)->mflags &   USE_NONCONTIGUOUS_BIT)
// #define disable_contiguous(M) ((M)->mflags |=  USE_NONCONTIGUOUS_BIT)

// #define set_lock(M,L)\
//  ((M)->mflags = (L)?\
//   ((M)->mflags | USE_LOCK_BIT) :\
//   ((M)->mflags & ~USE_LOCK_BIT))

// /* page-align a size */
// #define page_align(S)\
//  (((S) + (mparams.page_size - SIZE_T_ONE)) & ~(mparams.page_size - SIZE_T_ONE))

// /* granularity-align a size */
// #define granularity_align(S)\
//   (((S) + (mparams.granularity - SIZE_T_ONE))\
//    & ~(mparams.granularity - SIZE_T_ONE))


// /* For mmap, use granularity alignment on windows, else page-align */
// #ifdef WIN32
// #define mmap_align(S) granularity_align(S)
// #else
// #define mmap_align(S) page_align(S)
// #endif

// /* For sys_alloc, enough padding to ensure can malloc request on success */
// #define SYS_ALLOC_PADDING (TOP_FOOT_SIZE + MALLOC_ALIGNMENT)

// #define is_page_aligned(S)\
//    (((size_t)(S) & (mparams.page_size - SIZE_T_ONE)) == 0)
// #define is_granularity_aligned(S)\
//    (((size_t)(S) & (mparams.granularity - SIZE_T_ONE)) == 0)

// /*  True if segment S holds address A */
// #define segment_holds(S, A)\
//   ((char*)(A) >= S->base && (char*)(A) < S->base + S->size)

// /* Return segment holding given address */
// static msegmentptr segment_holding(mstate m, char* addr) {
//   msegmentptr sp = &m->seg;
//   for (;;) {
//     if (addr >= sp->base && addr < sp->base + sp->size)
//       return sp;
//     if ((sp = sp->next) == 0)
//       return 0;
//   }
// }

// /* Return true if segment contains a segment link */
// static int has_segment_link(mstate m, msegmentptr ss) {
//   msegmentptr sp = &m->seg;
//   for (;;) {
//     if ((char*)sp >= ss->base && (char*)sp < ss->base + ss->size)
//       return 1;
//     if ((sp = sp->next) == 0)
//       return 0;
//   }
// }

// #ifndef MORECORE_CANNOT_TRIM
// #define should_trim(M,s)  ((s) > (M)->trim_check)
// #else  /* MORECORE_CANNOT_TRIM */
// #define should_trim(M,s)  (0)
// #endif /* MORECORE_CANNOT_TRIM */

// /*
//   TOP_FOOT_SIZE is padding at the end of a segment, including space
//   that may be needed to place segment records and fenceposts when new
//   noncontiguous segments are added.
// */
// #define TOP_FOOT_SIZE\
//   (align_offset(chunk2mem(0))+pad_request(sizeof(struct malloc_segment))+MIN_CHUNK_SIZE)

/* -------------------------------  Hooks -------------------------------- */

/*
  PREACTION should be defined to return 0 on success, and nonzero on
  failure. If you are not using locking, you can redefine these to do
  anything you like.
*/

// #if USE_LOCKS
function PREACTION(_: mstate): boolean { // #define PREACTION(M)  ((use_lock(M))? ACQUIRE_LOCK(&(M)->mutex) : 0)
    return false;
}
function POSTACTION(_: mstate): void { // #define POSTACTION(M) { if (use_lock(M)) RELEASE_LOCK(&(M)->mutex); }
}
// #else /* USE_LOCKS */

// #ifndef PREACTION
// #define PREACTION(M) (0)
// #endif  /* PREACTION */

// #ifndef POSTACTION
// #define POSTACTION(M)
// #endif  /* POSTACTION */

// #endif /* USE_LOCKS */

// /*
//   CORRUPTION_ERROR_ACTION is triggered upon detected bad addresses.
//   USAGE_ERROR_ACTION is triggered on detected bad frees and
//   reallocs. The argument p is an address that might have triggered the
//   fault. It is ignored by the two predefined actions, but might be
//   useful in custom actions that try to help diagnose errors.
// */

// #if PROCEED_ON_ERROR

// /* A count of the number of corruption errors causing resets */
// int malloc_corruption_error_count;

// /* default corruption action */
// static void reset_on_error(mstate m);

// #define CORRUPTION_ERROR_ACTION(m)  reset_on_error(m)
// #define USAGE_ERROR_ACTION(m, p)

// #else /* PROCEED_ON_ERROR */

// #ifndef CORRUPTION_ERROR_ACTION
// #define CORRUPTION_ERROR_ACTION(m) ABORT
// #endif /* CORRUPTION_ERROR_ACTION */

// #ifndef USAGE_ERROR_ACTION
// #define USAGE_ERROR_ACTION(m,p) ABORT
// #endif /* USAGE_ERROR_ACTION */

// #endif /* PROCEED_ON_ERROR */


/* ---------------------------- setting mparams -------------------------- */

// #if LOCK_AT_FORK
// static void pre_fork(void)         { ACQUIRE_LOCK(&(gm)->mutex); }
// static void post_fork_parent(void) { RELEASE_LOCK(&(gm)->mutex); }
// static void post_fork_child(void)  { INITIAL_LOCK(&(gm)->mutex); }
// #endif /* LOCK_AT_FORK */

/* Initialize mparams */
function init_mparams(): number { // static int init_mparams(void) {
// #ifdef NEED_GLOBAL_LOCK_INIT
//   if (malloc_global_mutex_status <= 0)
//     init_malloc_global_mutex();
// #endif

//   ACQUIRE_MALLOC_GLOBAL_LOCK();
  if (mparams.magic == 0) {
    const magic: number = 0; // size_t magic;
    let psize: number = 0; // size_t psize;
    let gsize: number = 0; // size_t gsize;

// #ifndef WIN32
    psize = malloc_getpagesize;
    gsize = ((DEFAULT_GRANULARITY != 0)? DEFAULT_GRANULARITY : psize);
// #else /* WIN32 */
//     {
//       SYSTEM_INFO system_info;
//       GetSystemInfo(&system_info);
//       psize = system_info.dwPageSize;
//       gsize = ((DEFAULT_GRANULARITY != 0)?
//                DEFAULT_GRANULARITY : system_info.dwAllocationGranularity);
//     }
// #endif /* WIN32 */

    /* Sanity-check configuration:
       size_t must be unsigned and as wide as pointer type.
       ints must be at least 4 bytes.
       alignment must be at least 8.
       Alignment, min chunk size, and page size must all be powers of 2.
    */
    // if ((sizeof(size_t) != sizeof(char*)) ||
    //     (MAX_SIZE_T < MIN_CHUNK_SIZE)  ||
    //     (sizeof(int) < 4)  ||
    //     (MALLOC_ALIGNMENT < (size_t)8U) ||
    //     ((MALLOC_ALIGNMENT & (MALLOC_ALIGNMENT-SIZE_T_ONE)) != 0) ||
    //     ((MCHUNK_SIZE      & (MCHUNK_SIZE-SIZE_T_ONE))      != 0) ||
    //     ((gsize            & (gsize-SIZE_T_ONE))            != 0) ||
    //     ((psize            & (psize-SIZE_T_ONE))            != 0))
    //   ABORT;
//     mparams.granularity = gsize;
//     mparams.page_size = psize;
//     mparams.mmap_threshold = DEFAULT_MMAP_THRESHOLD;
//     mparams.trim_threshold = DEFAULT_TRIM_THRESHOLD;
// // #if MORECORE_CONTIGUOUS
//     mparams.default_mflags = USE_LOCK_BIT|USE_MMAP_BIT;
// // #else  /* MORECORE_CONTIGUOUS */
// //     mparams.default_mflags = USE_LOCK_BIT|USE_MMAP_BIT|USE_NONCONTIGUOUS_BIT;
// // #endif /* MORECORE_CONTIGUOUS */

// // #if !ONLY_MSPACES
//     /* Set up lock for main malloc area */
//     gm.mflags = mparams.default_mflags;
//     // (void)INITIAL_LOCK(&gm->mutex);
// // #endif
// // #if LOCK_AT_FORK
// //     pthread_atfork(&pre_fork, &post_fork_parent, &post_fork_child);
// // #endif

//     {
// #if USE_DEV_RANDOM
//       int fd;
//       unsigned char buf[sizeof(size_t)];
//       /* Try to use /dev/urandom, else fall back on using time */
//       if ((fd = open("/dev/urandom", O_RDONLY)) >= 0 &&
//           read(fd, buf, sizeof(buf)) == sizeof(buf)) {
//         magic = *((size_t *) buf);
//         close(fd);
//       }
//       else
// #endif /* USE_DEV_RANDOM */
// #ifdef WIN32
//       magic = (size_t)(GetTickCount() ^ (size_t)0x55555555U);
// #elif defined(LACKS_TIME_H)
//       magic = (size_t)&magic ^ (size_t)0x55555555U;
// #else
//       magic = (size_t)(time(0) ^ (size_t)0x55555555U);
// #endif
//       magic |= (size_t)8U;    /* ensure nonzero */
//       magic &= ~(size_t)7U;   /* improve chances of fault for bad values */
//       /* Until memory modes commonly available, use volatile-write */
//       (*(volatile size_t *)(&(mparams.magic))) = magic;
//     }
  }

//   RELEASE_MALLOC_GLOBAL_LOCK();
  return 1;
}

// /* support for mallopt */
// static int change_mparam(int param_number, int value) {
//   size_t val;
//   ensure_initialization();
//   val = (value == -1)? MAX_SIZE_T : (size_t)value;
//   switch(param_number) {
//   case M_TRIM_THRESHOLD:
//     mparams.trim_threshold = val;
//     return 1;
//   case M_GRANULARITY:
//     if (val >= mparams.page_size && ((val & (val-1)) == 0)) {
//       mparams.granularity = val;
//       return 1;
//     }
//     else
//       return 0;
//   case M_MMAP_THRESHOLD:
//     mparams.mmap_threshold = val;
//     return 1;
//   default:
//     return 0;
//   }
// }

/* ---------------------------- Indexing Bins ---------------------------- */

function is_small(s: bindex_t): boolean { // #define is_small(s) (((s) >> SMALLBIN_SHIFT) < NSMALLBINS)
    return (((s) >> SMALLBIN_SHIFT) < NSMALLBINS);
}
function small_index(s: bindex_t): bindex_t { // #define small_index(s) (bindex_t)((s)  >> SMALLBIN_SHIFT)
    return ((s)  >> SMALLBIN_SHIFT);
}
function small_index2size(i: bindex_t): number { // #define small_index2size(i) ((i)  << SMALLBIN_SHIFT)
  return (i)  << SMALLBIN_SHIFT;
}
// #define MIN_SMALL_INDEX     (small_index(MIN_CHUNK_SIZE))

// /* addressing by index. See above about smallbin repositioning */
function smallbin_at(M: mstate, i: bindex_t): sbinptr { // #define smallbin_at(M, i)   ((sbinptr)((char*)&((M)->smallbins[(i)<<1])))
  return M.smallbins[i << 1];
}
function treebin_at(M: mstate, i: bindex_t): tchunkptr { // #define treebin_at(M,i)     (&((M)->treebins[i]))
  return M.treebins[i];
}

/* assign tree index for size S to variable I. Use x86 asm if possible  */
function compute_tree_index(S: number): bindex_t { // #define compute_tree_index(S, I)\
  const X: number = S >>> TREEBIN_SHIFT; //   size_t X = S >> TREEBIN_SHIFT;\

  if (X === 0) {
    return 0;
   } else if (X > 0xFFFF) {
    return NTREEBINS - 1;
   } else {
    let Y: number = (X); // unsigned int Y = (unsigned int)X;
    let N: number = (((Y - 0x100) >>> 16) & 8); // unsigned int N = ((Y - 0x100) >> 16) & 8;
    let K: number = ((((Y <<= N) - 0x1000) >>> 16) & 4); // unsigned int K = (((Y <<= N) - 0x1000) >> 16) & 4;

    N += K;
    N += K = (((Y <<= K) - 0x4000) >> 16) & 2;
    K = 14 - N + ((Y <<= K) >>> 15);

    return (K << 1) + ((S >>> (K + (TREEBIN_SHIFT - 1)) & 1));
  }
}

// /* Bit representing maximum resolved size in a treebin at i */
// #define bit_for_tree_index(i) \
//    (i == NTREEBINS-1)? (SIZE_T_BITSIZE-1) : (((i) >> 1) + TREEBIN_SHIFT - 2)

/* Shift placing maximum resolved bit in a treebin at i as sign bit */
function leftshift_for_tree_index(i: bindex_t): number { // #define leftshift_for_tree_index(i) \
    return ((i === NTREEBINS - 1) ? 0 :
           ((SIZE_T_BITSIZE-SIZE_T_ONE) - (((i) >> 1) + TREEBIN_SHIFT - 2)))
}

// /* The size of the smallest chunk held in bin with index i */
// #define minsize_for_tree_index(i) \
//    ((SIZE_T_ONE << (((i) >> 1) + TREEBIN_SHIFT)) |  \
//    (((size_t)((i) & SIZE_T_ONE)) << (((i) >> 1) + TREEBIN_SHIFT - 1)))


/* -----------------------  Direct-mmapping chunks ----------------------- */

/*
  Directly mmapped chunks are set up with an offset to the start of
  the mmapped region stored in the prev_foot field of the chunk. This
  allows reconstruction of the required argument to MUNMAP when freed,
  and also allows adjustment of the returned chunk to meet alignment
  requirements (especially in memalign).
*/

// /* Malloc using mmap */
// static void* mmap_alloc(mstate m, size_t nb) {
//     size_t mmsize = mmap_align(nb + SIX_SIZE_T_SIZES + CHUNK_ALIGN_MASK);
//     if (m->footprint_limit != 0) {
//       size_t fp = m->footprint + mmsize;
//       if (fp <= m->footprint || fp > m->footprint_limit)
//         return 0;
//     }
//     if (mmsize > nb) {     /* Check for wrap around 0 */
//       char* mm = (char*)(CALL_DIRECT_MMAP(mmsize));
//       if (mm != CMFAIL) {
//         size_t offset = align_offset(chunk2mem(mm));
//         size_t psize = mmsize - offset - MMAP_FOOT_PAD;
//         mchunkptr p = (mchunkptr)(mm + offset);
//         p->prev_foot = offset;
//         p->head = psize;
//         mark_inuse_foot(m, p, psize);
//         chunk_plus_offset(p, psize)->head = FENCEPOST_HEAD;
//         chunk_plus_offset(p, psize+SIZE_T_SIZE)->head = 0;
  
//         if (m->least_addr == 0 || mm < m->least_addr)
//           m->least_addr = mm;
//         if ((m->footprint += mmsize) > m->max_footprint)
//           m->max_footprint = m->footprint;
//         assert(is_aligned(chunk2mem(p)));
//         check_mmapped_chunk(m, p);
//         return chunk2mem(p);
//       }
//     }
//     return 0;
//   }
  
//   /* Realloc using mmap */
//   static mchunkptr mmap_resize(mstate m, mchunkptr oldp, size_t nb, int flags) {
//     size_t oldsize = chunksize(oldp);
//     (void)flags; /* placate people compiling -Wunused */
//     if (is_small(nb)) /* Can't shrink mmap regions below small size */
//       return 0;
//     /* Keep old chunk if big enough but not too big */
//     if (oldsize >= nb + SIZE_T_SIZE &&
//         (oldsize - nb) <= (mparams.granularity << 1))
//       return oldp;
//     else {
//       size_t offset = oldp->prev_foot;
//       size_t oldmmsize = oldsize + offset + MMAP_FOOT_PAD;
//       size_t newmmsize = mmap_align(nb + SIX_SIZE_T_SIZES + CHUNK_ALIGN_MASK);
//       char* cp = (char*)CALL_MREMAP((char*)oldp - offset,
//                                     oldmmsize, newmmsize, flags);
//       if (cp != CMFAIL) {
//         mchunkptr newp = (mchunkptr)(cp + offset);
//         size_t psize = newmmsize - offset - MMAP_FOOT_PAD;
//         newp->head = psize;
//         mark_inuse_foot(m, newp, psize);
//         chunk_plus_offset(newp, psize)->head = FENCEPOST_HEAD;
//         chunk_plus_offset(newp, psize+SIZE_T_SIZE)->head = 0;
  
//         if (cp < m->least_addr)
//           m->least_addr = cp;
//         if ((m->footprint += newmmsize - oldmmsize) > m->max_footprint)
//           m->max_footprint = m->footprint;
//         check_mmapped_chunk(m, newp);
//         return newp;
//       }
//     }
//     return 0;
//   }

/* ------------------------ Operations on bin maps ----------------------- */

/* bit corresponding to given index */
function idx2bit(i: bindex_t): binmap_t {  // #define idx2bit(i)              ((binmap_t)(1) << (i))
  return 1 << i;
}

/* Mark/Clear bits with given index */
function mark_smallmap(M: mstate, i: bindex_t): void { // #define mark_smallmap(M,i)      ((M)->smallmap |=  idx2bit(i))
  M.smallmap |=  idx2bit(i);
}
function clear_smallmap(M: mstate, i: bindex_t): void { // #define clear_smallmap(M,i)     ((M)->smallmap &= ~idx2bit(i))
  M.smallmap &= ~idx2bit(i);
}
function smallmap_is_marked(M: mstate, i: bindex_t): boolean {// #define smallmap_is_marked(M,i) ((M)->smallmap &   idx2bit(i))
  return Boolean(M.smallmap & idx2bit(i));
}

function mark_treemap(M: mstate, i: bindex_t): void { // #define mark_treemap(M,i)       ((M)->treemap  |=  idx2bit(i))
  M.treemap |= idx2bit(i);
}

function clear_treemap(M: mstate, i: binmap_t): void { // #define clear_treemap(M,i)      ((M)->treemap  &= ~idx2bit(i))
  M.treemap &= ~idx2bit(i);
}

function treemap_is_marked(M: mstate, i: bindex_t): binmap_t { // #define treemap_is_marked(M,i)
  return M.treemap & idx2bit(i); // ((M)->treemap  &   idx2bit(i))
}

// /* isolate the least set bit of a bitmap */
function least_bit(x: bindex_t): number { // #define least_bit(x)         ((x) & -(x))
  return  (x) & ((-x) << SIZE_T_BITSIZE >>> SIZE_T_BITSIZE);
}

/* mask with all bits to left of least bit of x on */
function left_bits(x: bindex_t): number { // #define left_bits(x)         ((x<<1) | -(x<<1))
  return (x << 1) | ((-x << 1) << SIZE_T_BITSIZE >>> SIZE_T_BITSIZE);
}

/* mask with all bits to left of or equal to least bit of x on */
// #define same_or_left_bits(x) ((x) | -(x))

/* index corresponding to given bit. Use x86 asm if possible */

function compute_bit2idx(X: binmap_t): bindex_t { // #define compute_bit2idx(X, I)\
  let Y: number = toInt32(X - 1 < 0 ? MAX_SIZE_T : X - 1); // Y = X - 1;
  let K: number = toInt32(Y >> (16 - 4) & 16); // unsigned int K = Y >> (16-4) & 16;\
  let N: number = K; Y >>>= K; // unsigned int N = K;        Y >>= K;\
  N += K = Y >> (8-3) &  8;  Y >>= K;
  N += K = Y >> (4-2) &  4;  Y >>= K;
  N += K = Y >> (2-1) &  2;  Y >>= K;
  N += K = Y >> (1-0) &  1;  Y >>= K;
  return N + Y;
}

/* ----------------------- Operations on smallbins ----------------------- */

/*
  Various forms of linking and unlinking are defined as macros.  Even
  the ones for trees, which are very long but have very short typical
  paths.  This is ugly but reduces reliance on inlining support of
  compilers.
*/

/* Link a free chunk into a smallbin  */
function insert_small_chunk(a: Allocator, M: mstate, P: mchunkptr, S: number) { // #define insert_small_chunk(M, P, S) {\
  const I: bindex_t = small_index(S); // bindex_t I  = small_index(S);
  const B: mchunkptr = smallbin_at(M, I); // mchunkptr B = smallbin_at(M, I);
  let F: mchunkptr = B; // mchunkptr F = B;

  assert(S >= MIN_CHUNK_SIZE);

  if (!smallmap_is_marked(M, I)) {
    mark_smallmap(M, I);
  } else if (assert(ok_address(M, getForwardValue(a, B)))) {
    F = getForwardValue(a, B); // F = B->fd;
  } else {
    CORRUPTION_ERROR_ACTION(M);
  }

  setForwardValue(a, B, P); // B->fd = P;
  setBackwardValue(a, F, P); // F->bk = P;
  setForwardValue(a, P, F); // P->fd = F;
  setBackwardValue(a, P, B); // P->bk = B;
}

/* Unlink a chunk from a smallbin  */
// #define unlink_small_chunk(M, P, S) {\
//   mchunkptr F = P->fd;\
//   mchunkptr B = P->bk;\
//   bindex_t I = small_index(S);\
//   assert(P != B);\
//   assert(P != F);\
//   assert(chunksize(P) == small_index2size(I));\
//   if (RTCHECK(F == smallbin_at(M,I) || (ok_address(M, F) && F->bk == P))) { \
//     if (B == F) {\
//       clear_smallmap(M, I);\
//     }\
//     else if (RTCHECK(B == smallbin_at(M,I) ||\
//                      (ok_address(M, B) && B->fd == P))) {\
//       F->bk = B;\
//       B->fd = F;\
//     }\
//     else {\
//       CORRUPTION_ERROR_ACTION(M);\
//     }\
//   }\
//   else {\
//     CORRUPTION_ERROR_ACTION(M);\
//   }\
// }

/* Unlink the first chunk from a smallbin */
function unlink_first_small_chunk(a: Allocator, M: mstate, B: mchunkptr, P: mchunkptr, I: bindex_t) { // #define unlink_first_small_chunk(M, B, P, I) {\
  const F = getForwardValue(a, P); //   mchunkptr F = P->fd;\

  if (DEBUG) {
    assert(P != B);
    assert(P != F);
    assert(chunksize(a, P) == small_index2size(I));
  }

  if (B == F) {
    clear_smallmap(M, I);
  } else if (assert(ok_address(M, F) &&  getBackwardValue(a, F) == P)) {
    setBackwardValue(a, F, B); // F->bk = B;
    setForwardValue(a, B, F); // B->fd = F;
  } else {
    CORRUPTION_ERROR_ACTION(M);
  }
}

/* Replace dv node, binning the old one */
/* Used only when dvsize known to be small */
function replace_dv(a: Allocator, M: mstate, P: mchunkptr, S: number) { // #define replace_dv(M, P, S) {\
  const DVS: number = M.dvsize; // size_t DVS = M->dvsize;\

  assert(is_small(DVS));

  if (DVS !== 0) {
    const DV: mchunkptr = M.dv; // mchunkptr DV = M->dv;\
    insert_small_chunk(a, M, DV, DVS);
  }

  M.dvsize = S; // M->dvsize = S;
  M.dv = P; //  M->dv = P;
}

/* ------------------------- Operations on trees ------------------------- */

/* Insert chunk into tree */
function insert_large_chunk(a: Allocator, M: mstate, X: tchunkptr, S: number): void { // #define insert_large_chunk(M, X, S) {\
  const I: bindex_t = compute_tree_index(S); // bindex_t I;\
  let H: tbinptr = treebin_at(M, I); // tbinptr* H;\

  setIndexValue(a, X, I); // X->index = I;
  setLeftChildValue(a, X, setRigthChildValue(a, X, 0)); // X->child[0] = X->child[1] = 0;

  if (!treemap_is_marked(M, I)) {
    mark_treemap(M, I);
    H = X;

    setParentValue(a, X, H); // X->parent = (tchunkptr)H;\
    setForwardValue(a, X, setBackwardValue(a, X, X)) // X->fd = X->bk = X;\
  } else {
    let T: tchunkptr = H; // tchunkptr T = *H;\
    let K: number = S << leftshift_for_tree_index(I); // size_t K = S << lef(K >> (SIZE_T_BITSIZE-SIZE_T_ONE)) & 1tshift_for_tree_index(I);\

    for (;;) {
      if (chunksize(a, T) !== S) {
        let C: tchunkptr = (((K >> (SIZE_T_BITSIZE-SIZE_T_ONE)) & 1) === 0) ? getLeftChildValue(a, T) : getRigthChildValue(a, T); //         tchunkptr* C = &(T->child[(K >> (SIZE_T_BITSIZE-SIZE_T_ONE)) & 1]);\
        K <<= 1;

        if (C != 0) {
          T = C;
        } else if (assert(ok_address(M, C))) {
          C = X;
          setParentValue(a, X, T);  // X->parent = T;
          setForwardValue(a, X, setBackwardValue(a, X, X)); // X->fd = X->bk = X;

          break;
        } else {
          CORRUPTION_ERROR_ACTION(M);

          break;
        }
      } else {
        const F: tchunkptr = getForwardValue(a, T);  // tchunkptr F = T->fd;

        if (assert(ok_address(M, T) && ok_address(M, F))) {
          setForwardValue(a, T, setBackwardValue(a, T, X)); // T->fd = F->bk = X;
          setForwardValue(a, X, F); // X->fd = F;
          setBackwardValue(a, X, T); // X->bk = T;
          setParentValue(a, X, 0); // X->parent = 0;

          break;
        } else {
          CORRUPTION_ERROR_ACTION(M);

          break;
        }
      }
    }
  }
}

/*
  Unlink steps:

  1. If x is a chained node, unlink it from its same-sized fd/bk links
     and choose its bk node as its replacement.
  2. If x was the last node of its size, but not a leaf node, it must
     be replaced with a leaf node (not merely one with an open left or
     right), to make sure that lefts and rights of descendents
     correspond properly to bit masks.  We use the rightmost descendent
     of x.  We could use any other leaf, but this is easy to locate and
     tends to counteract removal of leftmosts elsewhere, and so keeps
     paths shorter than minimally guaranteed.  This doesn't loop much
     because on average a node in a tree is near the bottom.
  3. If x is the base of a chain (i.e., has parent links) relink
     x's parent and children to x's replacement (or null if none).
*/

function unlink_large_chunk(a: Allocator, M: mstate, X: tchunkptr) { // #define unlink_large_chunk(M, X) {\
  const XP: tchunkptr = getParentValue(a, X); //   tchunkptr XP = X->parent;\
  let R: tchunkptr; //   tchunkptr R;\

  if (getBackwardValue(a, X) !== X) { // if (X->bk != X) {\
    const F: tchunkptr = getForwardValue(a, X); //     tchunkptr F = X->fd;\

    R = getBackwardValue(a, X); //     R = X->bk;\

    if (assert(ok_address(M, F) && getBackwardValue(a, F) === X && getForwardValue(a, R) === X)) { //     if (RTCHECK(ok_address(M, F) && F->bk == X && R->fd == X)) {\
      setBackwardValue(a, F, R); //       F->bk = R;\
      setForwardValue(a, R, F);  //       R->fd = F;\
    } else {
      CORRUPTION_ERROR_ACTION(M);
    }
  } else {
    let RP: tchunkptr; //     tchunkptr* RP;\

    if (
        ((R = (RP = (getRigthChildValue(a, X)))) != 0) || //     if (((R = *(RP = &(X->child[1]))) != 0) ||\
        ((R = (RP = (getLeftChildValue(a, X))))  != 0)
       ) { //         ((R = *(RP = &(X->child[0]))) != 0)) {\
      let CP: tchunkptr; //       tchunkptr* CP;\

      while (((CP = (getRigthChildValue(a, R))) != 0) || //       while ((*(CP = &(R->child[1])) != 0) ||\
            ( (CP = (getLeftChildValue(a, R)))  != 0)) { //              (*(CP = &(R->child[0])) != 0)) {\
        R = (RP = CP) //         R = *(RP = CP);\
      }

      if (assert(ok_address(M, RP))) { // if (RTCHECK(ok_address(M, RP)))\
        RP = 0; //         *RP = 0;\
      } else {
        CORRUPTION_ERROR_ACTION(M);
      }
    }
  } if (XP != 0) {
    let H: tbinptr = treebin_at(M, getIndexValue(a, X)); //     tbinptr* H = treebin_at(M, X->index);\

    if (X === H) { //     if (X == *H) {\
      if ((H = R) === 0) {//       if ((*H = R) == 0) \
        clear_treemap(M, getIndexValue(a, X)); //         clear_treemap(M, X->index);\
      }
    } else if (assert(ok_address(M, XP))) {
        if (getLeftChildValue(a, XP) === X) { //       if (XP->child[0] == X) \
          setLeftChildValue(a, XP, R); //         XP->child[0] = R;\
        } else {
          setRigthChildValue(a, XP, R); //         XP->child[1] = R;\
        }
    } else {
      CORRUPTION_ERROR_ACTION(M);
    }

    if (R != 0) {
      if (assert(ok_address(M, R))) {
        let C0: tchunkptr; //         tchunkptr C0, C1;\
        let C1: tchunkptr;

        setParentValue(a, R, XP); //         R->parent = XP;\

        if ((C0 = getLeftChildValue(a, X)) !== 0) { //         if ((C0 = X->child[0]) != 0) {\
          if (assert(ok_address(M, C0))) {
            setLeftChildValue(a, R, C0); //          R->child[0] = C0;\
            setParentValue(a, C0, R); //             C0->parent = R;\
          } else {
            CORRUPTION_ERROR_ACTION(M);
          }
        } if ((C1 = getRigthChildValue(a, X)) !== 0) { //         if ((C1 = X->child[1]) != 0) {\
            if (assert(ok_address(M, C1))) {
              setRigthChildValue(a, R, C1); //         R->child[1] = C1;\
              setParentValue(a, C1, R); //             C1->parent = R;\
          } else {
            CORRUPTION_ERROR_ACTION(M);
          }
        }
      } else {
        CORRUPTION_ERROR_ACTION(M);
      }
    }
  }
}

/* Relays to large vs small bin operations */

function insert_chunk(a: Allocator, M: mstate, P: mchunkptr, S: number): void { // #define insert_chunk(M, P, S)\
  if (is_small(S)) {
    insert_small_chunk(a, M, P, S);
  }
  else { 
    const TP: tchunkptr = P; // tchunkptr TP = (tchunkptr)(P);
    insert_large_chunk(a, M, TP, S);
  }
}

// #define unlink_chunk(M, P, S)\
//   if (is_small(S)) unlink_small_chunk(M, P, S)\
//   else { tchunkptr TP = (tchunkptr)(P); unlink_large_chunk(M, TP); }


// /* Relays to internal calls to malloc/free from realloc, memalign etc */

// #if ONLY_MSPACES
// #define internal_malloc(m, b) mspace_malloc(m, b)
// #define internal_free(m, mem) mspace_free(m,mem);
// #else /* ONLY_MSPACES */
// #if MSPACES
// #define internal_malloc(m, b)\
//   ((m == gm)? dlmalloc(b) : mspace_malloc(m, b))
// #define internal_free(m, mem)\
//    if (m == gm) dlfree(mem); else mspace_free(m,mem);
// #else /* MSPACES */
// #define internal_malloc(m, b) dlmalloc(b)
// #define internal_free(m, mem) dlfree(mem)
// #endif /* MSPACES */
// #endif /* ONLY_MSPACES */

/* -------------------------- System allocation -------------------------- */

/* 
    Get memory from system using MORECORE or MMAP
    void* sys_alloc(mstate m, size_t nb)
*/
function sys_alloc(m: mstate, nb: number): Pointer {
    // const tbase: Pointer = CMFAIL; // char* tbase = CMFAIL;
    // const tsize: number = 0 // size_t tsize = 0;
    // const mmap_flag: flag_t = 0; // flag_t mmap_flag = 0;
    // const asize: number = 0; // size_t asize; /* allocation size */

    // ensure_initialization();

    // /* Directly map large chunks, but only if already initialized */
    // if (use_mmap(m) && nb >= mparams.mmap_threshold && m->topsize != 0) {
    //     const mem: Pointer = mmap_alloc(m, nb); // void* mem = mmap_alloc(m, nb);

    //     if (mem != 0) {
    //         return mem;
    //     }
    // }

//     asize = granularity_align(nb + SYS_ALLOC_PADDING);
//     if (asize <= nb)
//         return 0; /* wraparound */
//     if (m->footprint_limit != 0) {
//         size_t fp = m->footprint + asize;
//         if (fp <= m->footprint || fp > m->footprint_limit)
//         return 0;
//     }

// /*
//     Try getting memory in any of three ways (in most-preferred to
//     least-preferred order):
//     1. A call to MORECORE that can normally contiguously extend memory.
//         (disabled if not MORECORE_CONTIGUOUS or not HAVE_MORECORE or
//         or main space is mmapped or a previous contiguous call failed)
//     2. A call to MMAP new space (disabled if not HAVE_MMAP).
//         Note that under the default settings, if MORECORE is unable to
//         fulfill a request, and HAVE_MMAP is true, then mmap is
//         used as a noncontiguous system allocator. This is a useful backup
//         strategy for systems with holes in address spaces -- in this case
//         sbrk cannot contiguously expand the heap, but mmap may be able to
//         find space.
//     3. A call to MORECORE that cannot usually contiguously extend memory.
//         (disabled if not HAVE_MORECORE)

//     In all cases, we need to request enough bytes from system to ensure
//     we can malloc nb bytes upon success, so pad with enough space for
//     top_foot, plus alignment-pad to make sure we don't lose bytes if
//     not on boundary, and round this up to a granularity unit.
// */

// if (MORECORE_CONTIGUOUS && !use_noncontiguous(m)) {
//     char* br = CMFAIL;
//     size_t ssize = asize; /* sbrk call size */
//     msegmentptr ss = (m->top == 0)? 0 : segment_holding(m, (char*)m->top);
//     ACQUIRE_MALLOC_GLOBAL_LOCK();

//     if (ss == 0) {  /* First time through or recovery */
//     char* base = (char*)CALL_MORECORE(0);
//     if (base != CMFAIL) {
//         size_t fp;
//         /* Adjust to end on a page boundary */
//         if (!is_page_aligned(base))
//         ssize += (page_align((size_t)base) - (size_t)base);
//         fp = m->footprint + ssize; /* recheck limits */
//         if (ssize > nb && ssize < HALF_MAX_SIZE_T &&
//             (m->footprint_limit == 0 ||
//             (fp > m->footprint && fp <= m->footprint_limit)) &&
//             (br = (char*)(CALL_MORECORE(ssize))) == base) {
//         tbase = base;
//         tsize = ssize;
//         }
//     }
//     }
//     else {
//     /* Subtract out existing available top space from MORECORE request. */
//     ssize = granularity_align(nb - m->topsize + SYS_ALLOC_PADDING);
//     /* Use mem here only if it did continuously extend old space */
//     if (ssize < HALF_MAX_SIZE_T &&
//         (br = (char*)(CALL_MORECORE(ssize))) == ss->base+ss->size) {
//         tbase = br;
//         tsize = ssize;
//     }
//     }

//     if (tbase == CMFAIL) {    /* Cope with partial failure */
//     if (br != CMFAIL) {    /* Try to use/extend the space we did get */
//         if (ssize < HALF_MAX_SIZE_T &&
//             ssize < nb + SYS_ALLOC_PADDING) {
//         size_t esize = granularity_align(nb + SYS_ALLOC_PADDING - ssize);
//         if (esize < HALF_MAX_SIZE_T) {
//             char* end = (char*)CALL_MORECORE(esize);
//             if (end != CMFAIL)
//             ssize += esize;
//             else {            /* Can't use; try to release */
//             (void) CALL_MORECORE(-ssize);
//             br = CMFAIL;
//             }
//         }
//         }
//     }
//     if (br != CMFAIL) {    /* Use the space we did get */
//         tbase = br;
//         tsize = ssize;
//     }
//     else
//         disable_contiguous(m); /* Don't try contiguous path in the future */
//     }

//     RELEASE_MALLOC_GLOBAL_LOCK();
// }

// if (HAVE_MMAP && tbase == CMFAIL) {  /* Try MMAP */
//     char* mp = (char*)(CALL_MMAP(asize));
//     if (mp != CMFAIL) {
//     tbase = mp;
//     tsize = asize;
//     mmap_flag = USE_MMAP_BIT;
//     }
// }

// if (HAVE_MORECORE && tbase == CMFAIL) { /* Try noncontiguous MORECORE */
//     if (asize < HALF_MAX_SIZE_T) {
//     char* br = CMFAIL;
//     char* end = CMFAIL;
//     ACQUIRE_MALLOC_GLOBAL_LOCK();
//     br = (char*)(CALL_MORECORE(asize));
//     end = (char*)(CALL_MORECORE(0));
//     RELEASE_MALLOC_GLOBAL_LOCK();
//     if (br != CMFAIL && end != CMFAIL && br < end) {
//         size_t ssize = end - br;
//         if (ssize > nb + TOP_FOOT_SIZE) {
//         tbase = br;
//         tsize = ssize;
//         }
//     }
//     }
// }

// if (tbase != CMFAIL) {

//     if ((m->footprint += tsize) > m->max_footprint)
//     m->max_footprint = m->footprint;

//     if (!is_initialized(m)) { /* first-time initialization */
//     if (m->least_addr == 0 || tbase < m->least_addr)
//         m->least_addr = tbase;
//     m->seg.base = tbase;
//     m->seg.size = tsize;
//     m->seg.sflags = mmap_flag;
//     m->magic = mparams.magic;
//     m->release_checks = MAX_RELEASE_CHECK_RATE;
//     init_bins(m);
// #if !ONLY_MSPACES
//     if (is_global(m))
//         init_top(m, (mchunkptr)tbase, tsize - TOP_FOOT_SIZE);
//     else
// #endif
//     {
//         /* Offset top by embedded malloc_state */
//         mchunkptr mn = next_chunk(mem2chunk(m));
//         init_top(m, mn, (size_t)((tbase + tsize) - (char*)mn) -TOP_FOOT_SIZE);
//     }
//     }

//     else {
//     /* Try to merge with an existing segment */
//     msegmentptr sp = &m->seg;
//     /* Only consider most recent segment if traversal suppressed */
//     while (sp != 0 && tbase != sp->base + sp->size)
//         sp = (NO_SEGMENT_TRAVERSAL) ? 0 : sp->next;
//     if (sp != 0 &&
//         !is_extern_segment(sp) &&
//         (sp->sflags & USE_MMAP_BIT) == mmap_flag &&
//         segment_holds(sp, m->top)) { /* append */
//         sp->size += tsize;
//         init_top(m, m->top, m->topsize + tsize);
//     }
//     else {
//         if (tbase < m->least_addr)
//         m->least_addr = tbase;
//         sp = &m->seg;
//         while (sp != 0 && sp->base != tbase + tsize)
//         sp = (NO_SEGMENT_TRAVERSAL) ? 0 : sp->next;
//         if (sp != 0 &&
//             !is_extern_segment(sp) &&
//             (sp->sflags & USE_MMAP_BIT) == mmap_flag) {
//         char* oldbase = sp->base;
//         sp->base = tbase;
//         sp->size += tsize;
//         return prepend_alloc(m, tbase, oldbase, nb);
//         }
//         else
//         add_segment(m, tbase, tsize, mmap_flag);
//     }
//     }

//     if (nb < m->topsize) { /* Allocate from new or extended top space */
//     size_t rsize = m->topsize -= nb;
//     mchunkptr p = m->top;
//     mchunkptr r = m->top = chunk_plus_offset(p, nb);
//     r->head = rsize | PINUSE_BIT;
//     set_size_and_pinuse_of_inuse_chunk(m, p, nb);
//     check_top_chunk(m, m->top);
//     check_malloced_chunk(m, chunk2mem(p), nb);
//     return chunk2mem(p);
//     }
// }

//     MALLOC_FAILURE_ACTION;
    return 0;
}

  /* ---------------------------- malloc --------------------------- */

  /* allocate a large request from the best fitting chunk in a treebin */
function tmalloc_large(a: Allocator, m: mstate, nb: number): Pointer { // static void* tmalloc_large(mstate m, size_t nb) {
  const idx: bindex_t = compute_tree_index(nb); //   bindex_t idx;
  let v: tchunkptr = 0; //   tchunkptr v = 0;
  let rsize: number = ((-nb) << SIZE_T_BITSIZE >>> SIZE_T_BITSIZE); //   size_t rsize = -nb; /* Unsigned negation */
  let t: tchunkptr;  // tchunkptr t;


  if ((t = treebin_at(m, idx)) !== 0) { //   if ((t = *treebin_at(m, idx)) != 0) {
    /* Traverse tree for this bin looking for node with size == nb */
    let sizebits: number = nb << leftshift_for_tree_index(idx); //     size_t sizebits = nb << leftshift_for_tree_index(idx);
    let rst: tchunkptr = 0; //     tchunkptr rst = 0;  /* The deepest untaken right subtree */

    for (;;) {
      const trem: number = chunksize(a, t) - nb; //       size_t trem = chunksize(t) - nb;
      let rt: tchunkptr; //       tchunkptr rt;

      if (trem < rsize) {
        v = t;

        if ((rsize = trem) === 0) {
          break;
        }
      }

      rt = getRigthChildValue(a, t); //       rt = t->child[1];
      t = ((sizebits >> (SIZE_T_BITSIZE-SIZE_T_ONE)) & 1) === 0 ? getLeftChildValue(a, t) : getRigthChildValue(a, t); //       t = t->child[(sizebits >> (SIZE_T_BITSIZE-SIZE_T_ONE)) & 1];
      if (rt != 0 && rt != t) {
        rst = rt;
      }

      if (t == 0) {
        t = rst; /* set t to least subtree holding sizes > nb */
        break;
      }

      sizebits <<= 1;
    }
  }

  if (t === 0 && v === 0) { /* set t to root of next non-empty treebin */
    const leftbits: binmap_t = left_bits(idx2bit(idx)) & m.treemap; //     binmap_t leftbits = left_bits(idx2bit(idx)) & m->treemap;

    if (leftbits !== 0) {
      const leastbit: binmap_t = least_bit(leftbits); //       binmap_t leastbit = least_bit(leftbits);
      const i: bindex_t = compute_bit2idx(leastbit); // bindex_t i; // compute_bit2idx(leastbit, i);

      t = treebin_at(m, i);
    }
  }

  while (t !== 0) { /* find smallest of tree or subtree */
    const trem = chunksize(a, t) - nb; //     size_t trem = chunksize(t) - nb;

    if (trem < rsize) {
      rsize = trem;
      v = t;
    }
    t = leftmost_child(a, t);
  }

  /*  If dv is a better fit, return 0 so malloc will use it */
  if (v !== 0 && rsize < (m.dvsize - nb)) {
    if (assert(ok_address(m, v))) { /* split */
      const r: mchunkptr = chunk_plus_offset(v, nb); //       mchunkptr r = chunk_plus_offset(v, nb);
      assert(chunksize(a, v) === rsize + nb);

      if (assert(ok_next(v, r))) {
        unlink_large_chunk(a, m, v);

        if (rsize < MIN_CHUNK_SIZE) {
          set_inuse_and_pinuse(a, m, v, (rsize + nb));
        } else {
          set_size_and_pinuse_of_inuse_chunk(a, m, v, nb);
          set_size_and_pinuse_of_free_chunk(a, r, rsize);
          insert_chunk(a, m, r, rsize);
        }

        return chunk2mem(v);
      }
    }

    CORRUPTION_ERROR_ACTION(m);
  }

  return 0;
}

/* allocate a small request from the best fitting chunk in a treebin */
function tmalloc_small(a: Allocator, m: mstate, nb: number): Pointer { // static void* tmalloc_small(mstate m, size_t nb) {
  const leastbit: binmap_t = least_bit(m.treemap);// binmap_t leastbit = least_bit(m->treemap);
  const i: bindex_t = compute_bit2idx(leastbit); // bindex_t i;
  let t: tchunkptr = treebin_at(m, i); // tchunkptr t, v;
  let v: tchunkptr = t; // v = t = *treebin_at(m, i);
  let rsize: number = chunksize(a, t) - nb; // size_t rsize; rsize = chunksize(t) - nb;

  while ((t = leftmost_child(a, t)) != 0) {
    const trem: number = chunksize(a, t) - nb; // size_t trem = chunksize(t) - nb;

    if (trem < rsize) {
      rsize = trem;
      v = t;
    }
  }

  if (assert(ok_address(m, v))) {
    const r: mchunkptr = chunk_plus_offset(v, nb); // mchunkptr r = chunk_plus_offset(v, nb);

    assert(chunksize(a, v) == rsize + nb);

    if (assert(ok_next(v, r))) {
      unlink_large_chunk(a, m, v);

      if (rsize < MIN_CHUNK_SIZE) {
        set_inuse_and_pinuse(a, m, v, (rsize + nb));
      } else {
        set_size_and_pinuse_of_inuse_chunk(a, m, v, nb);
        set_size_and_pinuse_of_free_chunk(a, r, rsize);
        replace_dv(a, m, r, rsize);
      }

      return chunk2mem(v);
    }
  }

  CORRUPTION_ERROR_ACTION(m);
  return 0;
}

function dlmalloc(a: Allocator, bytes: number): Pointer { // void* dlmalloc(size_t bytes) {
/*
    Basic algorithm:
    If a small request (< 256 bytes minus per-chunk overhead):
        1. If one exists, use a remainderless chunk in associated smallbin.
        (Remainderless means that there are too few excess bytes to
        represent as a chunk.)
        2. If it is big enough, use the dv chunk, which is normally the
        chunk adjacent to the one used for the most recent small request.
        3. If one exists, split the smallest available chunk in a bin,
        saving remainder in dv.
        4. If it is big enough, use the top chunk.
        5. If available, get memory from system and use it
    Otherwise, for a large request:
        1. Find the smallest available binned chunk that fits, and use it
        if it is better fitting than dv chunk, splitting if necessary.
        2. If better fitting than any binned chunk, use the dv chunk.
        3. If it is big enough, use the top chunk.
        4. If request size >= mmap threshold, try to directly mmap this chunk.
        5. If available, get memory from system and use it

    The ugly goto's here ensure that postaction occurs along all paths.
*/

  if (USE_LOCKS) {
      ensure_initialization(); /* initialize in sys_alloc if not using locks */
  }

  if (!PREACTION(gm)) {
    let mem: Pointer = 0; // void* mem;
    let nb: number = 0; // size_t nb;

      if (bytes <= MAX_SMALL_REQUEST) {
        let idx: bindex_t = 0; // bindex_t idx;
        let smallbits: binmap_t = 0; // binmap_t smallbits;

        nb = (bytes < MIN_REQUEST) ? MIN_CHUNK_SIZE : pad_request(bytes); // nb = (bytes < MIN_REQUEST)? MIN_CHUNK_SIZE : pad_request(bytes);
        idx = small_index(nb);
        smallbits = gm.smallmap >> idx;

        if ((smallbits & 0x3) != 0) { /* Remainderless fit to a smallbin. */
          let b: mchunkptr; // mchunkptr b, p;
          let p: mchunkptr; // mchunkptr b, p;

          idx += ~smallbits & 1;       /* Uses next bin if idx empty */

          b = smallbin_at(gm, idx);
          p = getForwardValue(a, b); // b->fd;

          assert(chunksize(a, p) === small_index2size(idx));

          unlink_first_small_chunk(a, gm, b, p, idx);
          set_inuse_and_pinuse(a, gm, p, small_index2size(idx));
          mem = chunk2mem(p);

          check_malloced_chunk(a, gm, mem, nb);

          // goto postaction;
          POSTACTION(gm);
          return mem;
        } else if (nb > gm.dvsize) {
            if (smallbits != 0) { /* Use chunk in next nonempty smallbin */
            const leftbits: binmap_t = (smallbits << idx) & left_bits(idx2bit(idx)); // binmap_t leftbits = (smallbits << idx) & left_bits(idx2bit(idx));
            const leastbit: binmap_t = least_bit(leftbits); // binmap_t leastbit = least_bit(leftbits);
            const i : bindex_t = compute_bit2idx(leastbit); // bindex_t i; // compute_bit2idx(leastbit, i);
            const b: mchunkptr = smallbin_at(gm, i); // mchunkptr b, p, r; //           b = smallbin_at(gm, i);
            const p: mchunkptr = getForwardValue(a, b);
            const rsize: number = small_index2size(i) - nb; //size_t rsize;
            let r: mchunkptr;

            assert(chunksize(a, p) == small_index2size(i));

            unlink_first_small_chunk(a, gm, b, p, i);

            /* Fit here cannot be remainderless if 4byte sizes */
            if (SIZE_T_SIZE != 4 && rsize < MIN_CHUNK_SIZE) {
              set_inuse_and_pinuse(a, gm, p, small_index2size(i));
            } else {
              set_size_and_pinuse_of_inuse_chunk(a, gm, p, nb);
              r = chunk_plus_offset(p, nb);
              set_size_and_pinuse_of_free_chunk(a, r, rsize);
              replace_dv(a, gm, r, rsize);
            }

            mem = chunk2mem(p);
            check_malloced_chunk(a, gm, mem, nb);
            // goto postaction;

            POSTACTION(gm);
            return mem;
          } else if (gm.treemap != 0 && (mem = tmalloc_small(a, gm, nb)) != 0) {
            check_malloced_chunk(a, gm, mem, nb);

            // goto postaction;
            POSTACTION(gm);
            return mem;
          }
        }
    } else if (bytes >= MAX_REQUEST) {
      nb = MAX_SIZE_T; // nb = MAX_SIZE_T; /* Too big to allocate. Force failure (in sys alloc) */
    } else {
      nb = pad_request(bytes);

      if (gm.treemap !== 0 && (mem = tmalloc_large(a, gm, nb)) !== 0) { // if (gm->treemap != 0 && (mem = tmalloc_large(gm, nb)) != 0) {
        check_malloced_chunk(a, gm, mem, nb);

        // goto postaction;
        POSTACTION(gm);
        return mem;
      }
    }

  if (nb <= gm.dvsize) {
    const rsize: number = gm.dvsize - nb; // size_t rsize = gm->dvsize - nb;
    const p: mchunkptr =  gm.dv; // mchunkptr p = gm->dv;

    if (rsize >= MIN_CHUNK_SIZE) { /* split dv */
      const r: mchunkptr = gm.dv = chunk_plus_offset(p, nb); // mchunkptr r = gm->dv = chunk_plus_offset(p, nb);

      gm.dvsize = rsize; // gm->dvsize = rsize;

      set_size_and_pinuse_of_free_chunk(a, r, rsize);
      set_size_and_pinuse_of_inuse_chunk(a, gm, p, nb);
    } else { /* exhaust dv */
      const dvs: number = gm.dvsize; // size_t dvs = gm->dvsize;

      gm.dvsize = 0; // gm->dvsize = 0;
      gm.dv = 0; // gm->dv = 0;

      set_inuse_and_pinuse(a, gm, p, dvs);
    }
      mem = chunk2mem(p);

      check_malloced_chunk(a, gm, mem, nb);

    // goto postaction;
      POSTACTION(gm);
      return mem;
  } else if (nb < gm.topsize) { /* Split top */
    const rsize: number = gm.topsize -= nb; // size_t rsize = gm->topsize -= nb;
    const p: mchunkptr = gm.top; // mchunkptr p = gm->top;
    const r = gm.top = chunk_plus_offset(p, nb); // mchunkptr r = gm->top = chunk_plus_offset(p, nb);

    setHeadValue(a, r, rsize | PINUSE_BIT); // r->head = rsize | PINUSE_BIT;

    set_size_and_pinuse_of_inuse_chunk(a, gm, p, nb);

    mem = chunk2mem(p);

    check_top_chunk(a, gm, gm.top);
    check_malloced_chunk(a, gm, mem, nb);

    // goto postaction;
    POSTACTION(gm);
    return mem;
  }

  mem = sys_alloc(gm, nb);

// postaction:
//     POSTACTION(gm);
//     return mem;
}

  return 0;
}
