import { expect } from 'chai';

import {
  Allocator,
  createAllocator,
  mchunkptr,
  SIZE_T_SIZE,
  getFootAddress,
  getHeadAddress,
  getForwardAddress,
  getBackwardAddress,
  setFootValue,
  setHeadValue,
  setForwardValue,
  setBackwardValue,
  getFootValue,
  getHeadValue,
  getForwardValue,
  getBackwardValue,
} from './allocator';


describe('Allocator', () => {
  let a: Allocator;

  beforeEach(() => {
      a = createAllocator(1024);
  });

  it('Small chunks', () => {
    const p: mchunkptr = 0;

    const footValue = 123;
    const headValue = 4212;
    const forwardValue = 596;
    const backValue = 8745;

    expect(getFootAddress(p), 'Wrong foot address').to.be.equal(SIZE_T_SIZE * 0);
    expect(getHeadAddress(p), 'Wrong head address').to.be.equal(SIZE_T_SIZE * 1);
    expect(getForwardAddress(p), 'Wrong forward address').to.be.equal(SIZE_T_SIZE * 2);
    expect(getBackwardAddress(p), 'Wrong backward address').to.be.equal(SIZE_T_SIZE * 3);

    setFootValue(a, p, footValue);
    setHeadValue(a, p, headValue);
    setForwardValue(a, p, forwardValue);
    setBackwardValue(a, p, backValue);

    expect(getFootValue(a, p), 'Wrong foot value').to.be.equal(footValue);
    expect(getHeadValue(a, p), 'Wrong head value').to.be.equal(headValue);
    expect(getForwardValue(a, p), 'Wrong forward value').to.be.equal(forwardValue);
    expect(getBackwardValue(a, p), 'Wrong backward value').to.be.equal(backValue);
  });
});
