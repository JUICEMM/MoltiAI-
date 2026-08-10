export default async function handler(req,res){
  res.setHeader('Cache-Control','no-store');
  if(req.method!=='GET') return res.status(405).json({error:'GET only'});
  const host=req.headers['x-forwarded-host']||req.headers.host||'molti-ai-drab.vercel.app';
  const proto=req.headers['x-forwarded-proto']||'https';
  const origin=`${proto}://${host}`;
  const source='https://www.youtube.com/watch?v=lkMBIDdkgjI';
  try{
    const r=await fetch(`${origin}/api/video/analyze`,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({url:source})});
    const text=await r.text();
    let j={}; try{j=JSON.parse(text)}catch{}
    const comps=Array.isArray(j.comparisons)?j.comparisons:[];
    const urls=comps.map((x)=>String(x).match(/連結：(https:\/\/www\.youtube\.com\/watch\?v=[A-Za-z0-9_-]{11})/)?.[1]).filter(Boolean);
    const hooks=Array.isArray(j.hooks)?j.hooks:[];
    const badHook=hooks.some((h)=>/你是不是也遇過「我是如何花三年的時間|師父商學院 EP/i.test(String(h)));
    const sourceLeak=urls.some((u)=>u.includes('lkMBIDdkgjI'));
    return res.status(200).json({ok:r.ok&&hooks.length>=5&&urls.length>=1&&!badHook&&!sourceLeak,status:r.status,platform:j.platformLabel,topic:j.topic,hooks,competitorUrls:urls,comparisons:comps,evidence:j.evidence,error:j.error||'',detail:j.detail||''});
  }catch(error){return res.status(200).json({ok:false,error:error instanceof Error?error.message:String(error)});}
}
