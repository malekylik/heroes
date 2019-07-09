#define COMPILE 0
#define min( a, b ) ( (a) < (b) ? (a) : (b) )
#define max( a, b ) ( (a) > (b) ? (a) : (b) )
#define V 2
#define B 25

#if COMPILE
function abc() {
    return max(V, B);
}
#else
function abc() {
    return min(V, B);
}
#endif

export { abc };
