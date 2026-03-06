import tailwindcss from '@tailwindcss/vite';
import {defineConfig} from 'vite';
import solidPlugin from 'vite-plugin-solid';
import devtools from 'solid-devtools/vite';
import gotsha from "gotsha";

export default defineConfig({
    plugins: [devtools(), solidPlugin(), tailwindcss(), gotsha()],
    build: {
        target: 'esnext',
    },
});
