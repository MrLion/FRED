import { validateFredQuery } from './shared/fred-policy.js';
import { enforceRateLimit } from './shared/rate-limit.js';

export default async function handler(req, res) {
  if(req.method!=='GET')return res.status(405).json({error:'Method not allowed'});
  const invalid=validateFredQuery(req.query);
  if(invalid)return res.status(400).json({error:invalid});
  const apiKey=process.env.FRED_API_KEY;
  if(!apiKey)return res.status(500).json({error:'FRED API key not configured on server'});
  if(!await enforceRateLimit(req,res,'fred'))return;
  const {endpoint,...rest}=req.query;
  const params=new URLSearchParams(rest);
  params.set('api_key',apiKey);params.set('file_type','json');
  try{
    const response=await fetch(`https://api.stlouisfed.org/fred/${endpoint}?${params}`,{signal:AbortSignal.timeout(15000)});
    res.status(response.status);res.setHeader('Content-Type','application/json');res.setHeader('Cache-Control','no-store');
    return res.end(await response.text());
  }catch{return res.status(502).json({error:'Failed to reach FRED API'});}
}
