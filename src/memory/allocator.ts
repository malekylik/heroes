import { Pointer, alignTo8, alignBin } from './types';
import { MemoryChunk } from './memory-chunk';
import { toInt32 } from './coercion';

export class Allocator {
    memory: SharedArrayBuffer;
    totalSize: number;
    freeSize: number;

    programBreak: number;
    freeChuncks: MemoryChunk[];

    int32View: Int32Array;
    float64View: Float64Array;
}

export function createAllocator(size: number, options?: object): Allocator {
    const allocator: Allocator = new Allocator();
    const memory: SharedArrayBuffer = new ArrayBuffer(size);

    allocator.freeChuncks = new Array(1);
    allocator.freeChuncks[0] = {
        address: 0,
        size
    };

    allocator.programBreak = 32 < size ? 32 : size;

    allocator.totalSize = size;
    allocator.freeSize = size;

    allocator.memory = memory;

    allocator.int32View = new Int32Array(memory);
    allocator.float64View = new Float64Array(memory);

    return allocator;
}

export function sbrk(allocator: Allocator, amount: number): Pointer {
    const { programBreak, totalSize } = allocator;

    if (programBreak + amount <= totalSize) {
        allocator.programBreak += amount;

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

const T_SIZE: number           = 4;
const MALLOC_ALIGNMENT: number = 2 * T_SIZE;

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

// /* True if address a has acceptable alignment */
// const is_aligned(A)       (((size_t)((A)) & (CHUNK_ALIGN_MASK)) == 0)

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

// /*
//   The head field of a chunk is or'ed with PINUSE_BIT when previous
//   adjacent chunk in use, and or'ed with CINUSE_BIT if this chunk is in
//   use, unless mmapped, in which case both bits are cleared.

//   FLAG4_BIT is not used by this malloc, but might be useful in extensions.
// */

// const PINUSE_BIT          (SIZE_T_ONE)
// const CINUSE_BIT          (SIZE_T_TWO)
// const FLAG4_BIT           (SIZE_T_FOUR)
// const INUSE_BITS          (PINUSE_BIT|CINUSE_BIT)
// const FLAG_BITS           (PINUSE_BIT|CINUSE_BIT|FLAG4_BIT)

// /* Head value for fenceposts */
// const FENCEPOST_HEAD      (INUSE_BITS|SIZE_T_SIZE)

// /* extraction of fields from head words */
// const cinuse(p)           ((p)->head & CINUSE_BIT)
// const pinuse(p)           ((p)->head & PINUSE_BIT)
// const flag4inuse(p)       ((p)->head & FLAG4_BIT)
// const is_inuse(p)         (((p)->head & INUSE_BITS) != PINUSE_BIT)
// const is_mmapped(p)       (((p)->head & INUSE_BITS) == 0)

// const chunksize(p)        ((p)->head & ~(FLAG_BITS))

// const clear_pinuse(p)     ((p)->head &= ~PINUSE_BIT)
// const set_flag4(p)        ((p)->head |= FLAG4_BIT)
// const clear_flag4(p)      ((p)->head &= ~FLAG4_BIT)

// /* Treat space at ptr +/- offset as a chunk */
// const chunk_plus_offset(p, s)  ((mchunkptr)(((char*)(p)) + (s)))
// const chunk_minus_offset(p, s) ((mchunkptr)(((char*)(p)) - (s)))

// /* Ptr to next or previous physical malloc_chunk. */
// const next_chunk(p) ((mchunkptr)( ((char*)(p)) + ((p)->head & ~FLAG_BITS)))
// const prev_chunk(p) ((mchunkptr)( ((char*)(p)) - ((p)->prev_foot) ))

// /* extract next chunk's pinuse bit */
// const next_pinuse(p)  ((next_chunk(p)->head) & PINUSE_BIT)

// /* Get/set size at footer */
// const get_foot(p, s)  (((mchunkptr)((char*)(p) + (s)))->prev_foot)
// const set_foot(p, s)  (((mchunkptr)((char*)(p) + (s)))->prev_foot = (s))

// /* Set size, pinuse bit, and foot */
// const set_size_and_pinuse_of_free_chunk(p, s)\
//   ((p)->head = (s|PINUSE_BIT), set_foot(p, s))

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
                            // typedef struct malloc_chunk* sbinptr;  /* The type of bins of chunks */
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
// #define MMAP_FOOT_PAD       (FOUR_SIZE_T_SIZES)

/* The smallest size we can malloc is an aligned minimal chunk */
const MIN_CHUNK_SIZE: number = ((MCHUNK_SIZE + CHUNK_ALIGN_MASK) & ~CHUNK_ALIGN_MASK);      // #define MIN_CHUNK_SIZE\
                                                                                            //   ((MCHUNK_SIZE + CHUNK_ALIGN_MASK) & ~CHUNK_ALIGN_MASK)

// /* conversion from malloc headers to user pointers, and back */
// #define chunk2mem(p)        ((void*)((char*)(p)       + TWO_SIZE_T_SIZES))
// #define mem2chunk(mem)      ((mchunkptr)((char*)(mem) - TWO_SIZE_T_SIZES))
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

interface mallocState {   // struct malloc_state {
                        //   binmap_t   smallmap;
                        //   binmap_t   treemap;
                        //   size_t     dvsize;
                        //   size_t     topsize;
                        //   char*      least_addr;
                        //   mchunkptr  dv;
    top: mchunkptr;     //   mchunkptr  top;
                        //   size_t     trim_check;
                        //   size_t     release_checks;
                        //   size_t     magic;
                        //   mchunkptr  smallbins[(NSMALLBINS+1)*2];
                        //   tbinptr    treebins[NTREEBINS];
                        //   size_t     footprint;
                        //   size_t     max_footprint;
                        //   size_t     footprint_limit; /* zero means no limit */
                        //   flag_t     mflags;
                        // #if USE_LOCKS
                        //   MLOCK_T    mutex;     /* locate lock among fields that rarely change */
                        // #endif /* USE_LOCKS */
                        //   msegment   seg;
                        //   void*      extp;      /* Unused but available for extensions */
                        //   size_t     exts;
}                       // };

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
};// };

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
    top: 0,
};
const gm: mstate = _gm_; // #define gm                 (&_gm_)
function is_global(M: mstate):boolean { // #define is_global(M)       ((M) == &_gm_)
    return M === _gm_;
}

// #endif /* !ONLY_MSPACES */

function is_initialized(M: mstate): boolean {// #define is_initialized(M)  ((M)->top != 0)
    return M.top !== 0;
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
// #define POSTACTION(M) { if (use_lock(M)) RELEASE_LOCK(&(M)->mutex); }
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
    const psize: number = 0; // size_t psize;
    const gsize: number = 0; // size_t gsize;

#ifndef WIN32
    psize = malloc_getpagesize;
    gsize = ((DEFAULT_GRANULARITY != 0)? DEFAULT_GRANULARITY : psize);
#else /* WIN32 */
    {
      SYSTEM_INFO system_info;
      GetSystemInfo(&system_info);
      psize = system_info.dwPageSize;
      gsize = ((DEFAULT_GRANULARITY != 0)?
               DEFAULT_GRANULARITY : system_info.dwAllocationGranularity);
    }
#endif /* WIN32 */

    /* Sanity-check configuration:
       size_t must be unsigned and as wide as pointer type.
       ints must be at least 4 bytes.
       alignment must be at least 8.
       Alignment, min chunk size, and page size must all be powers of 2.
    */
    if ((sizeof(size_t) != sizeof(char*)) ||
        (MAX_SIZE_T < MIN_CHUNK_SIZE)  ||
        (sizeof(int) < 4)  ||
        (MALLOC_ALIGNMENT < (size_t)8U) ||
        ((MALLOC_ALIGNMENT & (MALLOC_ALIGNMENT-SIZE_T_ONE)) != 0) ||
        ((MCHUNK_SIZE      & (MCHUNK_SIZE-SIZE_T_ONE))      != 0) ||
        ((gsize            & (gsize-SIZE_T_ONE))            != 0) ||
        ((psize            & (psize-SIZE_T_ONE))            != 0))
      ABORT;
    mparams.granularity = gsize;
    mparams.page_size = psize;
    mparams.mmap_threshold = DEFAULT_MMAP_THRESHOLD;
    mparams.trim_threshold = DEFAULT_TRIM_THRESHOLD;
#if MORECORE_CONTIGUOUS
    mparams.default_mflags = USE_LOCK_BIT|USE_MMAP_BIT;
#else  /* MORECORE_CONTIGUOUS */
    mparams.default_mflags = USE_LOCK_BIT|USE_MMAP_BIT|USE_NONCONTIGUOUS_BIT;
#endif /* MORECORE_CONTIGUOUS */

#if !ONLY_MSPACES
    /* Set up lock for main malloc area */
    gm->mflags = mparams.default_mflags;
    (void)INITIAL_LOCK(&gm->mutex);
#endif
#if LOCK_AT_FORK
    pthread_atfork(&pre_fork, &post_fork_parent, &post_fork_child);
#endif

    {
#if USE_DEV_RANDOM
      int fd;
      unsigned char buf[sizeof(size_t)];
      /* Try to use /dev/urandom, else fall back on using time */
      if ((fd = open("/dev/urandom", O_RDONLY)) >= 0 &&
          read(fd, buf, sizeof(buf)) == sizeof(buf)) {
        magic = *((size_t *) buf);
        close(fd);
      }
      else
#endif /* USE_DEV_RANDOM */
#ifdef WIN32
      magic = (size_t)(GetTickCount() ^ (size_t)0x55555555U);
#elif defined(LACKS_TIME_H)
      magic = (size_t)&magic ^ (size_t)0x55555555U;
#else
      magic = (size_t)(time(0) ^ (size_t)0x55555555U);
#endif
      magic |= (size_t)8U;    /* ensure nonzero */
      magic &= ~(size_t)7U;   /* improve chances of fault for bad values */
      /* Until memory modes commonly available, use volatile-write */
      (*(volatile size_t *)(&(mparams.magic))) = magic;
    }
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
// #define small_index2size(i) ((i)  << SMALLBIN_SHIFT)
// #define MIN_SMALL_INDEX     (small_index(MIN_CHUNK_SIZE))

// /* addressing by index. See above about smallbin repositioning */
// #define smallbin_at(M, i)   ((sbinptr)((char*)&((M)->smallbins[(i)<<1])))
// #define treebin_at(M,i)     (&((M)->treebins[i]))

// /* assign tree index for size S to variable I. Use x86 asm if possible  */
// #if defined(__GNUC__) && (defined(__i386__) || defined(__x86_64__))
// #define compute_tree_index(S, I)\
// {\
//   unsigned int X = S >> TREEBIN_SHIFT;\
//   if (X == 0)\
//     I = 0;\
//   else if (X > 0xFFFF)\
//     I = NTREEBINS-1;\
//   else {\
//     unsigned int K = (unsigned) sizeof(X)*__CHAR_BIT__ - 1 - (unsigned) __builtin_clz(X); \
//     I =  (bindex_t)((K << 1) + ((S >> (K + (TREEBIN_SHIFT-1)) & 1)));\
//   }\
// }

// #elif defined (__INTEL_COMPILER)
// #define compute_tree_index(S, I)\
// {\
//   size_t X = S >> TREEBIN_SHIFT;\
//   if (X == 0)\
//     I = 0;\
//   else if (X > 0xFFFF)\
//     I = NTREEBINS-1;\
//   else {\
//     unsigned int K = _bit_scan_reverse (X); \
//     I =  (bindex_t)((K << 1) + ((S >> (K + (TREEBIN_SHIFT-1)) & 1)));\
//   }\
// }

// #elif defined(_MSC_VER) && _MSC_VER>=1300
// #define compute_tree_index(S, I)\
// {\
//   size_t X = S >> TREEBIN_SHIFT;\
//   if (X == 0)\
//     I = 0;\
//   else if (X > 0xFFFF)\
//     I = NTREEBINS-1;\
//   else {\
//     unsigned int K;\
//     _BitScanReverse((DWORD *) &K, (DWORD) X);\
//     I =  (bindex_t)((K << 1) + ((S >> (K + (TREEBIN_SHIFT-1)) & 1)));\
//   }\
// }

// #else /* GNUC */
// #define compute_tree_index(S, I)\
// {\
//   size_t X = S >> TREEBIN_SHIFT;\
//   if (X == 0)\
//     I = 0;\
//   else if (X > 0xFFFF)\
//     I = NTREEBINS-1;\
//   else {\
//     unsigned int Y = (unsigned int)X;\
//     unsigned int N = ((Y - 0x100) >> 16) & 8;\
//     unsigned int K = (((Y <<= N) - 0x1000) >> 16) & 4;\
//     N += K;\
//     N += K = (((Y <<= K) - 0x4000) >> 16) & 2;\
//     K = 14 - N + ((Y <<= K) >> 15);\
//     I = (K << 1) + ((S >> (K + (TREEBIN_SHIFT-1)) & 1));\
//   }\
// }
// #endif /* GNUC */

// /* Bit representing maximum resolved size in a treebin at i */
// #define bit_for_tree_index(i) \
//    (i == NTREEBINS-1)? (SIZE_T_BITSIZE-1) : (((i) >> 1) + TREEBIN_SHIFT - 2)

// /* Shift placing maximum resolved bit in a treebin at i as sign bit */
// #define leftshift_for_tree_index(i) \
//    ((i == NTREEBINS-1)? 0 : \
//     ((SIZE_T_BITSIZE-SIZE_T_ONE) - (((i) >> 1) + TREEBIN_SHIFT - 2)))

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

/* Malloc using mmap */
static void* mmap_alloc(mstate m, size_t nb) {
    size_t mmsize = mmap_align(nb + SIX_SIZE_T_SIZES + CHUNK_ALIGN_MASK);
    if (m->footprint_limit != 0) {
      size_t fp = m->footprint + mmsize;
      if (fp <= m->footprint || fp > m->footprint_limit)
        return 0;
    }
    if (mmsize > nb) {     /* Check for wrap around 0 */
      char* mm = (char*)(CALL_DIRECT_MMAP(mmsize));
      if (mm != CMFAIL) {
        size_t offset = align_offset(chunk2mem(mm));
        size_t psize = mmsize - offset - MMAP_FOOT_PAD;
        mchunkptr p = (mchunkptr)(mm + offset);
        p->prev_foot = offset;
        p->head = psize;
        mark_inuse_foot(m, p, psize);
        chunk_plus_offset(p, psize)->head = FENCEPOST_HEAD;
        chunk_plus_offset(p, psize+SIZE_T_SIZE)->head = 0;
  
        if (m->least_addr == 0 || mm < m->least_addr)
          m->least_addr = mm;
        if ((m->footprint += mmsize) > m->max_footprint)
          m->max_footprint = m->footprint;
        assert(is_aligned(chunk2mem(p)));
        check_mmapped_chunk(m, p);
        return chunk2mem(p);
      }
    }
    return 0;
  }
  
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

/* -------------------------- System allocation -------------------------- */

/* 
    Get memory from system using MORECORE or MMAP
    void* sys_alloc(mstate m, size_t nb)
*/
function sys_alloc(m: mstate, nb: number): Pointer {
    const tbase: Pointer = CMFAIL; // char* tbase = CMFAIL;
    const tsize: number = 0 // size_t tsize = 0;
    const mmap_flag: flag_t = 0; // flag_t mmap_flag = 0;
    const asize: number = 0; // size_t asize; /* allocation size */

    ensure_initialization();

    /* Directly map large chunks, but only if already initialized */
    if (use_mmap(m) && nb >= mparams.mmap_threshold && m->topsize != 0) {
        const mem: Pointer = mmap_alloc(m, nb); // void* mem = mmap_alloc(m, nb);

        if (mem != 0) {
            return mem;
        }
    }

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

function dlmalloc(bytes: number): Pointer { // void* dlmalloc(size_t bytes) {
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
        const mem: Pointer = 0; // void* mem;
        let nb: number = 0; // size_t nb;

        if (bytes <= MAX_SMALL_REQUEST) {
            let idx: bindex_t = 0; // bindex_t idx;
            let smallbits: binmap_t = 0; // binmap_t smallbits;

            nb = (bytes < MIN_REQUEST) ? MIN_CHUNK_SIZE : pad_request(bytes); // nb = (bytes < MIN_REQUEST)? MIN_CHUNK_SIZE : pad_request(bytes);
            idx = small_index(nb);
            smallbits = gm.smallmap >> idx;

    if ((smallbits & 0x3) != 0) { /* Remainderless fit to a smallbin. */
        mchunkptr b, p;
        idx += ~smallbits & 1;       /* Uses next bin if idx empty */
        b = smallbin_at(gm, idx);
        p = b->fd;
        assert(chunksize(p) == small_index2size(idx));
        unlink_first_small_chunk(gm, b, p, idx);
        set_inuse_and_pinuse(gm, p, small_index2size(idx));
        mem = chunk2mem(p);
        check_malloced_chunk(gm, mem, nb);
        goto postaction;
    }

    else if (nb > gm->dvsize) {
        if (smallbits != 0) { /* Use chunk in next nonempty smallbin */
        mchunkptr b, p, r;
        size_t rsize;
        bindex_t i;
        binmap_t leftbits = (smallbits << idx) & left_bits(idx2bit(idx));
        binmap_t leastbit = least_bit(leftbits);
        compute_bit2idx(leastbit, i);
        b = smallbin_at(gm, i);
        p = b->fd;
        assert(chunksize(p) == small_index2size(i));
        unlink_first_small_chunk(gm, b, p, i);
        rsize = small_index2size(i) - nb;
        /* Fit here cannot be remainderless if 4byte sizes */
        if (SIZE_T_SIZE != 4 && rsize < MIN_CHUNK_SIZE)
            set_inuse_and_pinuse(gm, p, small_index2size(i));
        else {
            set_size_and_pinuse_of_inuse_chunk(gm, p, nb);
            r = chunk_plus_offset(p, nb);
            set_size_and_pinuse_of_free_chunk(r, rsize);
            replace_dv(gm, r, rsize);
        }
        mem = chunk2mem(p);
        check_malloced_chunk(gm, mem, nb);
        goto postaction;
        }

        else if (gm->treemap != 0 && (mem = tmalloc_small(gm, nb)) != 0) {
        check_malloced_chunk(gm, mem, nb);
        goto postaction;
        }
    }
    }
    else if (bytes >= MAX_REQUEST)
    nb = MAX_SIZE_T; /* Too big to allocate. Force failure (in sys alloc) */
    else {
    nb = pad_request(bytes);
    if (gm->treemap != 0 && (mem = tmalloc_large(gm, nb)) != 0) {
        check_malloced_chunk(gm, mem, nb);
        goto postaction;
    }
    }

    if (nb <= gm->dvsize) {
    size_t rsize = gm->dvsize - nb;
    mchunkptr p = gm->dv;
    if (rsize >= MIN_CHUNK_SIZE) { /* split dv */
        mchunkptr r = gm->dv = chunk_plus_offset(p, nb);
        gm->dvsize = rsize;
        set_size_and_pinuse_of_free_chunk(r, rsize);
        set_size_and_pinuse_of_inuse_chunk(gm, p, nb);
    }
    else { /* exhaust dv */
        size_t dvs = gm->dvsize;
        gm->dvsize = 0;
        gm->dv = 0;
        set_inuse_and_pinuse(gm, p, dvs);
    }
    mem = chunk2mem(p);
    check_malloced_chunk(gm, mem, nb);
    goto postaction;
    }

    else if (nb < gm->topsize) { /* Split top */
    size_t rsize = gm->topsize -= nb;
    mchunkptr p = gm->top;
    mchunkptr r = gm->top = chunk_plus_offset(p, nb);
    r->head = rsize | PINUSE_BIT;
    set_size_and_pinuse_of_inuse_chunk(gm, p, nb);
    mem = chunk2mem(p);
    check_top_chunk(gm, gm->top);
    check_malloced_chunk(gm, mem, nb);
    goto postaction;
    }

    mem = sys_alloc(gm, nb);

    postaction:
        POSTACTION(gm);
        return mem;
    }

    return 0;
}
