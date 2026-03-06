import typescript from '@rollup/plugin-typescript';

export default {
    input: 'src/gotsha.ts',
    output: {
        dir: 'dist',
        format: 'es'
    },
    plugins: [typescript()]
};
