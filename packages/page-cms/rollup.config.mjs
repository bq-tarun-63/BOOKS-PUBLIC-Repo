import resolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import typescript from '@rollup/plugin-typescript';

/** @type {import('rollup').RollupOptions} */
export default {
  input: 'src/index.ts',
  output: [
    { file: 'dist/index.js', format: 'esm', sourcemap: true },
    { file: 'dist/index.cjs', format: 'cjs', sourcemap: true }
  ],
  external: ['react', 'next'],
  plugins: [
    resolve({ extensions: ['.js', '.ts', '.tsx'] }),
    commonjs(),
    typescript({ tsconfig: './tsconfig.build.json' })
  ]
};
