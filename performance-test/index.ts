import { defineStruct } from '../src/memory/types/struct/struct';
import { Float64 } from '../src/memory/types/Float/Float64';
import { defineArray, sizeof, getAddressFromArray } from '../src/memory/types';
import { createAllocator, dlmalloc, set8Byte, get8Byte } from '../src/memory/allocator';

const retrie = 100;
const amount = 1000000;

const PointStruct = defineStruct({
  x: Float64,
  y: Float64,
});
const PointsArray = defineArray(PointStruct, amount);

const isNativeJS = false;
let sum = 0;
let summ = 0;

let now = 0;

if (isNativeJS) {
  const array = new Array(amount);

  now = performance.now();

  for (let j = 0; j < retrie; j++) {

    for (let i = 0; i < amount; i++) {
      sum = i;
      const x = i % 2 === 0 ? i : -i;
      const y = (i % 2 === 0 ? -i : i) * 2;

      array[i] = {
        x,
        y,
      };

      sum += array[i].x;
      sum += array[i].y;
    }

    summ += sum / 10000;
  }

} else {
  const a = createAllocator(sizeof(PointsArray) * 2);
  const array = dlmalloc(a, sizeof(PointsArray));

  now = performance.now();

  for (let j = 0; j < retrie; j++) {

    for (let i = 0; i < amount; i++) {
      sum = i;
      const p = getAddressFromArray(PointsArray, array, i);

      const x = i % 2 === 0 ? i : -i;
      const y = (i % 2 === 0 ? -i : i) * 2;

      set8Byte(a, PointStruct.get.x(p), x);
      set8Byte(a, PointStruct.get.y(p), y);

      sum += get8Byte(a, PointStruct.get.x(p));
      sum += get8Byte(a, PointStruct.get.y(p));
    }

    summ += sum / 10000;
  }
}


console.log((performance.now() - now) / amount);
console.log(summ);
