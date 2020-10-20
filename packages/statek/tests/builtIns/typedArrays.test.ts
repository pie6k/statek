import { isStore, store, watch } from 'statek';

const TypedArrays = [
  Int8Array,
  Uint8Array,
  Uint8ClampedArray,
  Int16Array,
  Uint16Array,
  Int32Array,
  Uint32Array,
  Float32Array,
  Float64Array,
];

describe('typed arrays', () => {
  for (const TypedArray of TypedArrays) {
    it(`${TypedArray.name} should observe mutations`, () => {
      let dummy;
      const array = store(new TypedArray(2));
      expect(isStore(array)).toBe(true);

      watch(() => {
        dummy = array[0];
        // TODO This will fail TypeError: this is not a typed array.at Proxy.forEach (<anonymous>)
        // array.forEach(() => {});
      });

      expect(dummy).toBe(0);
      array[0] = 12;
      expect(dummy).toBe(12);
    });
  }
});
