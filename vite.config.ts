import { defineConfig } from 'vite'
({
    base: './',
    resolve: {
        alias: {
            '@': '/src/',
        }
    },
    build: {
        minify: false
    }
})