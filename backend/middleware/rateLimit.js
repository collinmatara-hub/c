module.exports = function rateLimit({windowMs=60000,max=300}={}) {
  const buckets = new Map();
  return (req,res,next)=>{
    const key=req.ip||req.socket.remoteAddress||'unknown'; const now=Date.now(); let b=buckets.get(key);
    if(!b||now-b.started>windowMs){b={started:now,count:0};buckets.set(key,b)} b.count++;
    if(b.count>max){res.setHeader('Retry-After',Math.ceil((windowMs-(now-b.started))/1000));return res.status(429).json({error:'Too many requests. Please try again shortly.'});}
    next();
  };
};
