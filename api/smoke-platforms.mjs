const cases=[
  {name:'youtube',url:'https://www.youtube.com/watch?v=lkMBIDdkgjI',title:'',description:''},
  {name:'instagram',url:'https://www.instagram.com/reel/example/',title:'IG Reels 測試主題',description:'短影音產品介紹，前三秒直接說痛點，最後 CTA 私訊。'},
  {name:'facebook',url:'https://www.facebook.com/watch/?v=123456789',title:'Facebook Reels 測試主題',description:'企業 AI 導入案例，強調導入前後差異。'},
  {name:'tiktok',url:'https://www.tiktok.com/@demo/video/1234567890123456789',title:'TikTok 測試主題',description:'15秒教學型短影音，目標提高停留與留言。'},
  {name:'douyin',url:'https://www.douyin.com/video/1234567890123456789',title:'抖音手動資料測試',description:'平台限制時使用手動標題與內容觀察，不捏造 metadata。'},
  {name:'xiaohongshu',url:'https://www.xiaohongshu.com/explore/example',title:'小紅書手動資料測試',description:'平台限制時使用手動資料分析，輸出 Hook、分鏡與 CTA。'}
];
const timeoutFetch=async(url,options={},ms=90000)=>{const c=new AbortController();const t=setTimeout(()=>c.abort(),ms);try{return await fetch(url,{...options,signal:c.signal})}finally{clearTimeout(t)}};
const runOne=async(origin,item)=>{try{const r=await timeoutFetch(`${origin}/api/video/analyze`,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(item)},90000);const text=await r.text();let j={};try{j=JSON.parse(text)}catch{};return{name:item.name,ok:r.ok&&Array.isArray(j.hooks)&&j.hooks.length>=3&&Array.isArray(j.storyboard)&&j.storyboard.length>=3&&!j.storyboard.some((x)=>String(x).includes('[object Object]')),status:r.status,platform:j.platformLabel,confidence:j.confidence,hook:j.hooks?.[0]||'',metadataPlan:j.metadataPlan||'',error:j.error||j.detail||''}}catch(error){return{name:item.name,ok:false,error:error instanceof Error?error.message:String(error)}}};
export default async function handler(req,res){
  res.setHeader('Cache-Control','no-store');
  if(req.method!=='GET')return res.status(405).json({error:'GET only'});
  const host=req.headers['x-forwarded-host']||req.headers.host||'molti-ai-drab.vercel.app';
  const proto=req.headers['x-forwarded-proto']||'https';const origin=`${proto}://${host}`;
  const results=[];
  for(const item of cases) results.push(await runOne(origin,item));
  const passed=results.filter(x=>x.ok).length;
  return res.status(200).json({passed,total:results.length,allPassed:passed===results.length,results});
}
