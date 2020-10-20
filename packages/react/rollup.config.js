import typescript from '@rollup/plugin-typescript';

export default {
  input: './lib/index.ts',
  output: {
    file: './lib/index.js',
    format: 'cjs',
  },
  plugins: [typescript()],
  external: ['tslib', 'react', 'react-dom', 'statek'],
};
