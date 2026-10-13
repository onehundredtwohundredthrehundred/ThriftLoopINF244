import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig } from 'vite';
export default defineConfig(() => {
    return {
        plugins: [react(), tailwindcss()],
        define: {
            'import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY': JSON.stringify(process.env.VITE_STRIPE_PUBLISHABLE_KEY ||
                'pk_test_51U7SNwKC304NxFdv6swsOvK3VLgtjQziYUiWYqx8R4MGNgnIG4RGKbMm8nhZFP9fOnfBwtOsLzIXAoAal6Zcv9Ow00Uhz8ixDC'),
        },
        resolve: {
            alias: {
                '@': path.resolve(__dirname, '.'),
            },
        },
        server: {
            hmr: process.env.DISABLE_HMR !== 'true',
            watch: process.env.DISABLE_HMR === 'true' ? null : {},
        },
    };
});
