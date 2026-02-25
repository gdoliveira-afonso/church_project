import { defineConfig } from 'vite';

export default defineConfig({
    server: {
        proxy: {
            '/api': 'http://localhost:3000'
        },
        watch: {
            ignored: ['**/server/**', '**/dev.db', '**/dev.db-journal']
        }
    }
});
