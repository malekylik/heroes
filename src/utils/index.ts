export function assert(condition: boolean): boolean {
  if (!condition) {
      throw "Assertation doesn't work!";
  }

  return condition;
}

export function createArray<U>(length: number, initValue: U): Array<U> {
  const arr: Array<U> = new Array<U>(length);

  for (let i = length - 1; i >= 0; i--) {
      arr[i] = initValue;
  }

  return arr;
}

export function swap<U>(arr: Array<U>, i1: number, i2: number): Array<U> {
  const temp: U = arr[i1];

  arr[i1] = arr[i2];
  arr[i2] = temp;

  return arr;
}
