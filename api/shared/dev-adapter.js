// Keep local requests on the exact same validation and quota guards as production.
export function apiPlugin(handlers) {
  return {name:'local-api',configureServer(server){
    for(const [route,handler] of Object.entries(handlers))server.middlewares.use(route,async(req,res)=>{
      const reply={
        status(code){res.statusCode=code;return this;},
        setHeader(name,value){res.setHeader(name,value);return this;},
        end(body){res.end(body);return this;},
        json(body){res.setHeader('Content-Type','application/json');res.end(JSON.stringify(body));return this;},
      };
      try{
        if(req.method==='GET'){
          req.query={};
          const params=new URL(req.url,'http://localhost').searchParams;
          for(const name of new Set(params.keys())){const values=params.getAll(name);req.query[name]=values.length===1?values[0]:values;}
        }else if(req.method==='POST'){
          let size=0;const chunks=[];
          for await(const chunk of req){size+=Buffer.byteLength(chunk);if(size>32768)return reply.status(413).json({error:'Request is too large.'});chunks.push(Buffer.from(chunk));}
          try{req.body=JSON.parse(Buffer.concat(chunks).toString('utf8'));}catch{return reply.status(400).json({error:'Invalid JSON request body'});}
        }
        return await handler(req,reply);
      }catch{if(!res.headersSent)return reply.status(500).json({error:'Request could not be completed.'});res.end();}
    });
  }};
}
