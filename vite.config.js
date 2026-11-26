import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import fredHandler from './api/fred-proxy.js';
import analyzeHandler from './api/analyze.js';
import nlSearchHandler from './api/nl-search.js';
import { apiPlugin } from './api/shared/dev-adapter.js';
export default defineConfig(({mode})=>{
  Object.assign(process.env,loadEnv(mode,process.cwd(),''));
  return {plugins:[react(),apiPlugin({'/api/fred-proxy':fredHandler,'/api/analyze':analyzeHandler,'/api/nl-search':nlSearchHandler})]};
});
