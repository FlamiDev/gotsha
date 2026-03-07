import typescript from '@rollup/plugin-typescript';

export default {
    input: 'src/create-gotsha.ts',
    output: {
        dir: 'dist',
        format: 'es'
    },
    plugins: [typescript()]
};
