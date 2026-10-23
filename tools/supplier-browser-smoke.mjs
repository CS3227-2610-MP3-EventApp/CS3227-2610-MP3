// Isolated Chrome/HTTP integration fallback. Fresh invented data; no credentials logged.
import {spawn,spawnSync} from 'node:child_process';
import {randomUUID,randomBytes} from 'node:crypto';
import {mkdtemp,writeFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import net from 'node:net';
const root=path.resolve(import.meta.dirname,'..'),backend=path.join(root,'backend'),python=path.join(backend,'.venv/Scripts/python.exe');
const base='http://localhost:5173',eventId=randomUUID(),tag=randomUUID().replaceAll('-','').slice(0,12);
const password=randomBytes(24).toString('base64url'),orgName='sborg'+tag,bizName='sbbiz'+tag;
const env={...process.env,DATABASE_URL:'postgresql+psycopg://eventapp:eventapp@127.0.0.1:5432/eventapp',AI_ENABLED:'true',AI_SYNTHETIC_ONLY:'true',AI_REAL_DATA_ENABLED:'false',AI_SYNTHETIC_EVENT_IDS:JSON.stringify([eventId])};
async function free(port){await new Promise((resolve,reject)=>{const server=net.createServer();server.once('error',()=>reject(Error(`Port ${port} already occupied; refusing to use or stop existing service`)));server.listen(port,'127.0.0.1',()=>server.close(resolve));});}
for(const port of [8000,5173,9224])await free(port);
const profile=await mkdtemp(path.join(tmpdir(),'eventapp-supplier-browser-'));
const children=[];
function launch(executable,args,cwd=root){const child=spawn(executable,args,{cwd,env,windowsHide:true,stdio:'ignore'});children.push(child);return child;}
const delay=ms=>new Promise(resolve=>setTimeout(resolve,ms));
async function until(check,label){for(let i=0;i<120;i++){try{if(await check())return;}catch{}await delay(100);}throw Error('Timed out: '+label);}
const actor={cookie:''},organiser={cookie:''};
async function api(who,method,url,body,status=200){const response=await fetch(base+'/api/v1'+url,{method,headers:{Origin:base,...(who.cookie?{Cookie:who.cookie}:{}),...(body?{'Content-Type':'application/json'}:{})},...(body?{body:JSON.stringify(body)}:{})});for(const cookie of response.headers.getSetCookie())if(cookie.startsWith('eventapp_session='))who.cookie=cookie.split(';')[0];if(response.status!==status)throw Error(`${method} ${url}: expected ${status}, got ${response.status}`);return status===204?null:response.json();}
let socket;
try{
  const bootstrap=`import sys,json,contextlib,io\nfrom unittest.mock import patch\nfrom app.auth import bootstrap\nd=json.load(sys.stdin)\nfor args in [['event','--id',d['event'],'--title','Invented browser craft fair','--timezone','Asia/Singapore','--starts-at','2027-01-01T09:00:00+08:00','--ends-at','2027-01-01T18:00:00+08:00'],['organiser','--username',d['org'],'--email',d['org']+'@example.test','--display-name','Invented browser organiser','--event-id',d['event']]]:\n with patch.object(sys,'argv',['bootstrap']+args),patch('getpass.getpass',return_value=d['password']),contextlib.redirect_stdout(io.StringIO()):\n  assert bootstrap.main()==0\n`;
  const provision=spawnSync(python,['-c',bootstrap],{cwd:backend,env,encoding:'utf8',windowsHide:true,input:JSON.stringify({event:eventId,org:orgName,password})});if(provision.status!==0)throw Error('Synthetic provisioning failed');
  launch(python,['-m','uvicorn','app.main:app','--host','127.0.0.1','--port','8000'],backend);
  launch(process.execPath,[path.join(root,'frontend/node_modules/vite/bin/vite.js'),'--host','127.0.0.1','--port','5173','--strictPort'],path.join(root,'frontend'));
  await until(async()=> (await fetch(base+'/api/v1/health/ready')).ok,'API/Vite readiness');
  launch('C:/Program Files/Google/Chrome/Application/chrome.exe',['--headless=new','--disable-gpu','--no-first-run','--no-default-browser-check','--remote-debugging-port=9224',`--user-data-dir=${profile}`,'about:blank']);
  await until(async()=> (await fetch('http://127.0.0.1:9224/json')).ok,'isolated Chrome readiness');
  await api(organiser,'POST','/auth/login',{identifier:orgName,password,role:'organiser'});
  await api(organiser,'POST','/auth/change-password',{currentPassword:password,newPassword:randomBytes(24).toString('base64url')});
  const user=await api(actor,'POST','/auth/register/business',{username:bizName,email:bizName+'@example.test',displayName:'Invented browser owner',businessName:'Invented '+bizName,password:randomBytes(24).toString('base64url')},201);
  const businessId=user.businessMemberships[0].businessId;
  await api(organiser,'PUT',`/organiser/events/${eventId}/application-settings`,{expectedRevision:1,applicationsOpen:true});
  const app=await api(actor,'POST','/business/applications',{businessId,eventId,participantType:'exhibitor',description:'Invented display',requestedSpace:'Invented table',contactName:'Invented contact',contactEmail:'invented@example.test'},201);
  const pid=app.participationId,collection=`/business/participations/${pid}/supplier-research`;
  const targets=await (await fetch('http://127.0.0.1:9224/json')).json(),target=targets.find(t=>t.type==='page');if(!target)throw Error('No isolated browser tab');
  socket=new WebSocket(target.webSocketDebuggerUrl);const pending=new Map();let sequence=0;
  await new Promise((resolve,reject)=>{socket.addEventListener('open',resolve,{once:true});socket.addEventListener('error',reject,{once:true});});
  socket.addEventListener('message',event=>{const message=JSON.parse(event.data),request=pending.get(message.id);if(request){pending.delete(message.id);message.error?request.reject(Error('CDP error')):request.resolve(message.result);}});
  function cdp(method,params={}){return new Promise((resolve,reject)=>{const id=++sequence;pending.set(id,{resolve,reject});socket.send(JSON.stringify({id,method,params}));});}
  async function evaluate(expression){const value=await cdp('Runtime.evaluate',{expression,awaitPromise:true,returnByValue:true});if(value.exceptionDetails)throw Error('Browser evaluation failed');return value.result.value;}
  async function click(label){const point=await evaluate(`(()=>{const b=Array.from(document.querySelectorAll('button')).find(b=>b.innerText.trim()===${JSON.stringify(label)});if(!b||b.disabled)throw Error('Button unavailable');b.scrollIntoView({block:'center'});const r=b.getBoundingClientRect();return{x:r.x+r.width/2,y:r.y+r.height/2}})()`);await cdp('Input.dispatchMouseEvent',{type:'mousePressed',...point,button:'left',clickCount:1});await cdp('Input.dispatchMouseEvent',{type:'mouseReleased',...point,button:'left',clickCount:1});}
  async function fill(label,value){await until(()=>evaluate(`(()=>{const l=Array.from(document.querySelectorAll('label')).find(l=>l.innerText.trim()===${JSON.stringify(label)});const i=l&&document.getElementById(l.htmlFor);if(!i)return false;i.focus();return document.activeElement===i})()`),'label '+label);await cdp('Input.dispatchKeyEvent',{type:'keyDown',key:'a',code:'KeyA',modifiers:2,windowsVirtualKeyCode:65});await cdp('Input.dispatchKeyEvent',{type:'keyUp',key:'a',code:'KeyA',modifiers:2,windowsVirtualKeyCode:65});await cdp('Input.insertText',{text:value});}
  await cdp('Page.enable');await cdp('Network.enable');await cdp('Emulation.setFocusEmulationEnabled',{enabled:true});
  await cdp('Network.setCookie',{name:'eventapp_session',value:actor.cookie.slice('eventapp_session='.length),url:base,httpOnly:true,sameSite:'Lax'});
  await cdp('Page.navigate',{url:base+`/business/supplier-research?businessId=${businessId}&eventId=${eventId}&participationId=${pid}`});
  await until(()=>evaluate("!!Array.from(document.querySelectorAll('button')).find(b=>b.innerText.trim()==='Research suppliers')"),'research page');
  await fill('Research brief','Singapore A4 flyer printing 100 pieces price delivery working days');
  await fill('Delivery area','Singapore East');
  await click('Research suppliers');
  let history;
  await until(async()=>{history=await api(actor,'GET',collection);return !!history.latestJob;},'saved queued job');
  const worker=spawn(python,[path.join(root,'tools/supplier-live-worker.py')],{cwd:backend,env,windowsHide:true,stdio:['ignore','pipe','ignore']});
  worker.stdout.on('data',chunk=>{for(const line of String(chunk).split('\n'))if(line.startsWith('SYNTHETIC_DEBUG_FILE '))console.log(line);});
  await new Promise((resolve,reject)=>{const timeout=setTimeout(()=>{worker.kill();reject(Error('Worker timeout'));},185000);worker.once('exit',code=>{clearTimeout(timeout);code===0?resolve():reject(Error('Worker failure'));});});
  const completed=await api(actor,'GET',`/ai/jobs/${history.latestJob.id}`);if(completed.state!=='completed')throw Error('Actual sourced research failed: '+completed.failureCode);
  await click('Refresh status');await until(()=>evaluate("document.querySelectorAll('input[type=checkbox]').length>0"),'sourced offers');
  const point=await evaluate("(()=>{const box=document.querySelector('input[type=checkbox]');box.scrollIntoView({block:'center'});const r=box.getBoundingClientRect();return{x:r.x+r.width/2,y:r.y+r.height/2}})()");
  await cdp('Input.dispatchMouseEvent',{type:'mousePressed',...point,button:'left',clickCount:1});await cdp('Input.dispatchMouseEvent',{type:'mouseReleased',...point,button:'left',clickCount:1});
  await click('Save shortlist');
  const short=`/business/participations/${pid}/supplier-shortlist`;
  await until(async()=> (await api(actor,'GET',short)).selectedOffers.length===1,'saved shortlist');
  const beforeRestart=await api(actor,'GET',short);
  const ownedApi=children[0];ownedApi.kill();await new Promise(resolve=>ownedApi.once('exit',resolve));
  launch(python,['-m','uvicorn','app.main:app','--host','127.0.0.1','--port','8000'],backend);
  await until(async()=> (await fetch(base+'/api/v1/health/ready')).ok,'restarted API');
  if(JSON.stringify(await api(actor,'GET',short))!==JSON.stringify(beforeRestart))throw Error('Shortlist changed across restart');
  const reopened=await api(actor,'GET',`/business/supplier-research/${completed.snapshot.id}`);
  if(JSON.stringify(reopened)!==JSON.stringify(completed.snapshot))throw Error('Evidence changed across restart');
  console.log('PASS actual sourced research and shortlist persisted across API/worker process restart');
  await cdp('Page.reload');await until(()=>evaluate("!!document.querySelector('input[type=checkbox]:checked')"),'reopened shortlist');
  const stored=await evaluate('JSON.stringify(localStorage)+JSON.stringify(sessionStorage)');if(stored.includes('A4 colour')||stored.includes('eventapp_session')||stored.includes(completed.snapshot.id))throw Error('Private browser storage leak');
  await cdp('Emulation.setDeviceMetricsOverride',{width:320,height:900,deviceScaleFactor:1,mobile:false});await delay(300);
  if(await evaluate('document.documentElement.scrollWidth>innerWidth'))throw Error('320px horizontal overflow');
  const screenshot=await cdp('Page.captureScreenshot',{format:'png',captureBeyondViewport:false});await writeFile(path.join(root,'logs/isaac/f09-supplier-browser.png'),Buffer.from(screenshot.data,'base64'));
  await click('Clear selections');await click('Save shortlist');await until(async()=> (await api(actor,'GET',short)).selectedOffers.length===0,'cleared shortlist');
  // Native confirmation is accepted only for this explicitly requested synthetic deletion.
  await evaluate("(()=>{const b=Array.from(document.querySelectorAll('button')).find(b=>b.innerText.trim()==='Delete comparison');setTimeout(()=>b.click(),50);return true;})()");
  await delay(150);await cdp('Page.handleJavaScriptDialog',{accept:true}).catch(()=>{});
  await until(async()=> (await api(actor,'GET',collection)).total===0,'deleted comparison');
  if((await api(actor,'GET',`/ai/jobs/${history.latestJob.id}`)).snapshot!==null)throw Error('Deleted research resurrected');
  console.log('PASS isolated Chrome real Tavily/page/AI research -> shortlist/save -> reload -> 320px layout -> clear/delete; private browser storage absent');

}finally{
  if(socket)socket.close();
  for(const child of children.reverse()){if(child.exitCode===null)child.kill();}
  await delay(500);
  // This directory was freshly returned by mkdtemp under the system temp directory.
  const resolved=path.resolve(profile),temp=path.resolve(tmpdir())+path.sep;
  if(resolved.startsWith(temp)&&path.basename(resolved).startsWith('eventapp-supplier-browser-'))await rm(resolved,{recursive:true,force:true,maxRetries:4,retryDelay:300});
}
