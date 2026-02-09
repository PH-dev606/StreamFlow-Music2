
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  // Carrega as variáveis de ambiente com base no modo (development/production)
  // O terceiro parâmetro '' carrega todas as variáveis, independente do prefixo VITE_
  const env = loadEnv(mode, process.cwd(), '');

  return {
    plugins: [react()],
    define: {
      // Mapeia a chave do .env para process.env.API_KEY conforme exigido pelo SDK do Gemini
      'process.env.API_KEY': JSON.stringify(env.VITE_GEMINI_API_KEY || env.API_KEY || "")
    }
  };
});
