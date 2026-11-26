const MAX_BYTES=32768;
// Enforce this in the handler too; do not rely on framework-specific body-parser settings.
export function enforceBodyLimit(req,res){
  try{
    const length=Number(req.headers?.['content-length']);
    if(length>MAX_BYTES||Buffer.byteLength(JSON.stringify(req.body??{}),'utf8')>MAX_BYTES){
      res.status(413).json({error:'Request is too large.'});return false;
    }
    return true;
  }catch{res.status(400).json({error:'Invalid JSON request body'});return false;}
}
