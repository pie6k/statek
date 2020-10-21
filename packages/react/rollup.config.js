import typescript from 'rollup-plugin-typescript2';

export default [
  {
    input: './lib/index.ts',
    output: {
      file: './lib/index.js',
      format: 'cjs',
    },
    plugins: [typescript({ useTsconfigDeclarationDir: true })],
    external: ['tslib', 'react', 'react-dom', 'statek'],
  },
];
