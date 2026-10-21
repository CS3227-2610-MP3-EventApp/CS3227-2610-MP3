// Supplemental local HTTP/Chrome smoke, using invented fixtures only.
// Start retained development DB/API/Vite and isolated Chrome CDP port9223 first.
// Never logs credentials; fixture provisioning uses the trusted CLI with synthetic input.
import { randomUUID, randomBytes } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { createInterface } from 'node:readline';
const root = path.resolve(import.meta.dirname, '..'), base = 'http://localhost:5173';
const eventId = randomUUID(), tag = randomUUID().replaceAll('-', '').slice(0, 16);
const orgName = 'f06org' + tag, bizName = 'f06biz' + tag;
const password = () => randomBytes(24).toString('base64url');
const initial = password(), changed = password(), businessPassword = password();
const fixture = `import sys,json,io,contextlib
from unittest.mock import patch
from app.auth import bootstrap
d=json.load(sys.stdin)
commands=[['event','--id',d['eventId'],'--title','Invented F06 smoke event','--timezone','Asia/Singapore','--starts-at','2027-01-01T09:00:00+08:00','--ends-at','2027-01-01T18:00:00+08:00'],['organiser','--username',d['orgName'],'--email',d['orgName']+'@example.test','--display-name','Invented organiser','--event-id',d['eventId']]]
for args in commands:
 sys.argv=['bootstrap']+args
 with patch('getpass.getpass',return_value=d['password']),contextlib.redirect_stdout(io.StringIO()):
  assert bootstrap.main()==0
`;
const provision = spawnSync(path.join(root, 'backend/.venv/Scripts/python.exe'), ['-c', fixture], {
  cwd: path.join(root, 'backend'), encoding: 'utf8',
  env: { ...process.env, DATABASE_URL: 'postgresql+psycopg://eventapp:eventapp@127.0.0.1:5432/eventapp' },
  input: JSON.stringify({ eventId, orgName, password: initial }),
});
if (provision.status !== 0) throw Error('Trusted invented fixture provisioning failed');
const org = { cookie: '' }, biz = { cookie: '' }, anon = { cookie: '' };
async function api(actor, method, url, body, status = 200, origin = true) {
  const response = await fetch(base + url, { method, headers: {
    ...(actor.cookie ? { Cookie: actor.cookie } : {}), ...(origin ? { Origin: base } : {}),
    ...(body ? { 'Content-Type': 'application/json' } : {}),
  }, ...(body ? { body: JSON.stringify(body) } : {}) });
  for (const cookie of response.headers.getSetCookie()) if (cookie.startsWith('eventapp_session=')) actor.cookie = cookie.split(';')[0];
  if (response.status !== status) throw Error(method + ' ' + url + ' expected ' + status + ', got ' + response.status);
  if (response.headers.get('cache-control') !== 'no-store') throw Error('Missing no-store');
  return response.json();
}
await api(org, 'POST', '/api/v1/auth/login', { identifier: orgName, password: initial, role: 'organiser' });
await api(org, 'POST', '/api/v1/auth/change-password', { currentPassword: initial, newPassword: changed });
const actor = await api(biz, 'POST', '/api/v1/auth/register/business', { username: bizName, email: bizName + '@example.test', displayName: 'Invented owner', password: businessPassword, businessName: 'Invented F06 business ' + tag }, 201);
const businessId = actor.businessMemberships[0].businessId;
await api(org, 'PUT', '/api/v1/organiser/events/' + eventId + '/application-settings', { expectedRevision: 1, applicationsOpen: true });
const application = await api(biz, 'POST', '/api/v1/business/applications', { businessId, eventId, participantType: 'exhibitor', description: 'Invented display products', requestedSpace: 'One invented table', contactName: 'Invented contact', contactEmail: 'invented@example.test' }, 201);
const pid = application.participationId, endpoint = '/api/v1/business/participations/' + pid + '/preparation';
const empty = await api(biz, 'GET', endpoint);
if (empty.revision !== 1) throw Error('Initial virtual revision wrong');
const line = { description: 'Invented odd amount', quantity: 1000000, unitPriceMinorUnits: 99999999999, priceBasis: 'estimate', quotationBasis: null };
const body = { expectedRevision: 1, tasks: [{ title: 'Retained invented smoke task', status: 'not_started', dueDate: null }], budget: { currency: 'SGD', lines: [line, { ...line, description: 'Invented final cent', quantity: 1, unitPriceMinorUnits: 1 }] } };
const saved = await api(biz, 'PUT', endpoint, body);
if (saved.budget.totalMinorUnits !== '99999999999000001') throw Error('Exact odd total failed');
await api(anon, 'GET', endpoint, undefined, 401);
await api(org, 'GET', endpoint, undefined, 403);
await api(biz, 'PUT', endpoint, { ...body, expectedRevision: 2 }, 403, false);
await api(biz, 'PUT', endpoint, { ...body, expectedRevision: 2, budget: { ...body.budget, lines: [{ ...line, quantity: 1000001 }] } }, 422);
if (JSON.stringify(await api(biz, 'GET', endpoint)) !== JSON.stringify(saved)) throw Error('Rejected writes changed content');
console.log(JSON.stringify({ stage: 'HTTP_SMOKE_PASS', eventId, businessId, applicationId: application.id, participationId: pid, exactTotal: saved.budget.totalMinorUnits }));
const targets = await (await fetch('http://localhost:9223/json')).json();
const target = targets.find(item => item.type === 'page');
if (!target) throw Error('No isolated Chrome tab');
const socket = new WebSocket(target.webSocketDebuggerUrl), pending = new Map();
let sequence = 0;
await new Promise((resolve, reject) => { socket.addEventListener('open', resolve, { once: true }); socket.addEventListener('error', reject, { once: true }); });
socket.addEventListener('message', event => { const message = JSON.parse(event.data); if (pending.has(message.id)) { const request = pending.get(message.id); pending.delete(message.id); message.error ? request.reject(Error('CDP failure')) : request.resolve(message.result); } });
function cdp(method, params = {}) { return new Promise((resolve, reject) => { const id = ++sequence; pending.set(id, { resolve, reject }); socket.send(JSON.stringify({ id, method, params })); }); }
async function evaluate(expression) {
  const result = await cdp('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true });
  if (result.exceptionDetails) {
    const message = result.exceptionDetails.exception?.description?.split('\n')[0] ?? 'Unknown browser exception';
    throw Error('Browser evaluation failed: ' + message);
  }
  return result.result.value;
}
async function until(check) {
  for (let i = 0; i < 80; i++) {
    try { if (await check()) return; } catch (error) {
      // A navigation can replace the execution context between Page.navigate and the poll.
      if (!error.message.startsWith('Browser evaluation failed:')) throw error;
    }
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  throw Error('Browser condition timed out');
}
async function clickText(label) {
  const point = await evaluate(`(()=>{const button=Array.from(document.querySelectorAll('button')).find(item=>item.innerText.trim()===${JSON.stringify(label)});if(!button)throw Error('Missing button');button.scrollIntoView({block:'center'});const box=button.getBoundingClientRect();return{x:box.x+box.width/2,y:box.y+box.height/2};})()`);
  await cdp('Input.dispatchMouseEvent', { type: 'mousePressed', ...point, button: 'left', clickCount: 1 });
  await cdp('Input.dispatchMouseEvent', { type: 'mouseReleased', ...point, button: 'left', clickCount: 1 });
}
async function fillLabel(label, text) {
  const focus = `(()=>{const label=Array.from(document.querySelectorAll('label')).find(item=>item.innerText.replaceAll('*','').trim()===${JSON.stringify(label)});if(!label)return false;const input=document.getElementById(label.htmlFor);if(!input)return false;input.focus();return true;})()`;
  // Activating a headless page can cause the application's mandatory authority refresh.
  // Wait for the real labelled control to stay focused across that refresh before typing.
  for (let attempt = 0; attempt < 20; attempt++) {
    await until(() => evaluate(focus));
    await new Promise(resolve => setTimeout(resolve, 150));
    if (await evaluate(`document.activeElement?.labels?.[0]?.innerText.trim()===${JSON.stringify(label)}`)) break;
    if (attempt === 19) throw Error('Label did not retain focus');
  }
  await cdp('Input.insertText', { text });
}
async function browserAs(actor, route) {
  await cdp('Network.setCookie', { name: 'eventapp_session', value: actor.cookie.slice('eventapp_session='.length), url: base, httpOnly: true, sameSite: 'Lax' });
  await cdp('Emulation.setFocusEmulationEnabled', { enabled: true });
  await cdp('Page.navigate', { url: base + route });
}
let savedSetup;
await cdp('Page.enable'); await cdp('Network.enable');
await cdp('Network.setCookie', { name: 'eventapp_session', value: biz.cookie.slice('eventapp_session='.length), url: base, httpOnly: true, sameSite: 'Lax' });
await cdp('Page.navigate', { url: base + '/business/preparation?businessId=' + businessId + '&eventId=' + eventId + '&participationId=' + pid });
console.log('BROWSER_READY; commands phase2, restart2, phase3, restart3, quit. Credentials remain memory-only.');
const input = createInterface({ input: process.stdin, crlfDelay: Infinity });
for await (const command of input) {
  try {
    if (command === 'phase2') {
      await cdp('Page.reload');
      await until(() => evaluate("!!Array.from(document.querySelectorAll('input')).find(input=>input.value==='Retained invented smoke task')"));
      const facts = await evaluate('({text:document.body.innerText,stored:JSON.stringify(localStorage)+JSON.stringify(sessionStorage)})');
      if (!facts.text.replaceAll(',', '').includes('999999999990000.01')) throw Error('Real browser exact amount missing');
      if (facts.stored.includes('Retained invented')) throw Error('Private browser storage');
      await cdp('Emulation.setDeviceMetricsOverride', { width: 320, height: 900, deviceScaleFactor: 1, mobile: false });
      await until(() => evaluate('innerWidth===320'));
      if (await evaluate('document.documentElement.scrollWidth>innerWidth')) throw Error('320px horizontal overflow');
      await cdp('Emulation.clearDeviceMetricsOverride');
      console.log('PHASE2_BROWSER_PASS: real UI/exact odd amount/private storage/320px reflow');
    } else if (command === 'restart2') {
      if (JSON.stringify(await api(biz, 'GET', endpoint)) !== JSON.stringify(saved)) throw Error('Restart changed retained document');
      await cdp('Page.reload');
      await until(() => evaluate("!!Array.from(document.querySelectorAll('input')).find(input=>input.value==='Retained invented smoke task')"));
      console.log('PHASE2_RESTART_PASS: saved document and existing cookie survive without reseeding');
    } else if (command === 'phase3') {
      const current = await api(biz, 'GET', '/api/v1/business/applications/' + application.id);
      const submitted = await api(biz, 'POST', '/api/v1/business/applications/' + application.id + '/submit', { expectedRevision: current.revision });
      await api(org, 'POST', '/api/v1/organiser/events/' + eventId + '/applications/' + application.id + '/decision', { expectedRevision: submitted.revision, outcome: 'accepted', reason: null });
      await browserAs(org, '/organiser/applications?eventId=' + eventId + '&applicationId=' + application.id);
      await until(() => evaluate("Array.from(document.querySelectorAll('label')).some(label=>label.innerText.trim()==='Booth label')"));
      await fillLabel('Booth label', 'INVENTED-SMOKE-A1');
      await fillLabel('Setup instructions', 'Invented setup at 08:00; no real allocation');
      await clickText('Save setup');
      await until(() => evaluate("!!document.querySelector('[role=dialog]')"));
      if (!(await evaluate("document.querySelector('[role=dialog]').innerText")).includes('INVENTED-SMOKE-A1')) throw Error('Confirmation omitted exact booth');
      await clickText('Cancel');
      const setupPath = '/api/v1/business/participations/' + pid + '/setup';
      if ((await api(biz, 'GET', setupPath)).revision !== 1) throw Error('Cancel published setup');
      await clickText('Save setup');
      await until(() => evaluate("!!document.querySelector('[role=dialog]')"));
      await clickText('Publish setup');
      await until(async () => (await api(biz, 'GET', setupPath)).revision === 2);
      savedSetup = await api(biz, 'GET', setupPath);
      if (savedSetup.boothLabel !== 'INVENTED-SMOKE-A1' || savedSetup.setupInstructions !== 'Invented setup at 08:00; no real allocation') throw Error('Published facts differ');
      await browserAs(biz, '/business/applications?businessId=' + businessId + '&eventId=' + eventId + '&applicationId=' + application.id);
      await until(() => evaluate("document.body.innerText.includes('INVENTED-SMOKE-A1')"));
      if (JSON.stringify(await api(biz, 'GET', endpoint)) !== JSON.stringify(saved)) throw Error('Setup changed manual preparation');
      console.log('PHASE3_BROWSER_PASS: real organizer confirmation/cancel/publication, business visibility, manual independence');
    } else if (command === 'restart3') {
      if (!savedSetup || JSON.stringify(await api(biz, 'GET', '/api/v1/business/participations/' + pid + '/setup')) !== JSON.stringify(savedSetup)) throw Error('Restart changed setup');
      if (JSON.stringify(await api(biz, 'GET', endpoint)) !== JSON.stringify(saved)) throw Error('Restart changed manual preparation');
      await cdp('Page.reload');
      await until(() => evaluate("document.body.innerText.includes('INVENTED-SMOKE-A1')"));
      console.log('PHASE3_RESTART_PASS: setup and manual preparation retained without reseeding');
    } else if (command === 'quit') { await cdp('Browser.close'); break; }
    else console.log('UNKNOWN_COMMAND');
  } catch (error) { console.log('SMOKE_FAILURE: ' + error.message); }
}
