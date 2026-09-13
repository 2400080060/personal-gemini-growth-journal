import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup, signInWithRedirect, getRedirectResult, signOut, onAuthStateChanged } from 'firebase/auth';

const firebaseConfig = { apiKey: 'AIzaSyB73GPj6P_HI4RPcfqINOmXpam4rlHwANo', authDomain: 'personal-gemini-growth-journal.firebaseapp.com', projectId: 'personal-gemini-growth-journal', storageBucket: 'personal-gemini-growth-journal.firebasestorage.app', messagingSenderId: '302524930437', appId: '1:302524930437:web:81b64c6d23c48a3ba3ccec' };
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const provider = new GoogleAuthProvider();
provider.setCustomParameters({ prompt: 'select_account' });

const $ = id => document.getElementById(id);
const status = $('status');
let currentUser = null;
let chatHistory = [];

function setStatus(message) { status.textContent = message; }
function setBusy(button, busy, label) { if (!button) return; button.disabled = busy; if (busy) { button.dataset.label = button.textContent; button.textContent = label || 'Working…'; } else if (button.dataset.label) { button.textContent = button.dataset.label; } }
function escapeHtml(s='') { return s.replace(/[&<>'"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c])); }
function fmtDate(value) { const d=new Date(value); return Number.isNaN(d.getTime())?'':d.toLocaleString([], {month:'short',day:'numeric',hour:'numeric',minute:'2-digit'}); }
async function api(path, options={}) { if (!currentUser) throw new Error('Please sign in first.'); const token=await currentUser.getIdToken(); const r=await fetch(path,{...options,headers:{'Content-Type':'application/json',Authorization:`Bearer ${token}`,...(options.headers||{})}}); const data=await r.json().catch(()=>({})); if(!r.ok) throw new Error(data.error || `Request failed (${r.status})`); return data; }

async function completeLogin(user) {
  currentUser=user;
  $('authCard').hidden=true; $('appShell').hidden=false;
  $('userName').textContent=user.displayName || 'there'; $('userEmail').textContent=user.email || '';
  setStatus('');
  try { await api('/api/me'); await loadJournals(); await loadGoals(); } catch(e) { console.error(e); alert(e.message); }
}

$('signInButton').addEventListener('click', async()=>{
  const b=$('signInButton'); setBusy(b,true,'Opening Google…'); setStatus('Opening secure Google sign-in…');
  try { await signInWithPopup(auth,provider); }
  catch(e) {
    console.error('Sign-in:',e.code,e.message);
    if(['auth/popup-closed-by-user','auth/popup-blocked','auth/cancelled-popup-request'].includes(e.code)) {
      setStatus('Popup sign-in was interrupted. Use redirect sign-in if your browser blocks popups.'); $('redirectSignInButton').hidden=false;
    } else if(e.code==='auth/unauthorized-domain') setStatus('This Cloud Run domain is not authorized in Firebase Authentication.');
    else setStatus(`Sign-in failed: ${e.code || 'unknown error'}`);
  } finally { setBusy(b,false); }
});
$('redirectSignInButton').addEventListener('click',()=>signInWithRedirect(auth,provider));
getRedirectResult(auth).catch(e=>{ if(e) setStatus(`Sign-in failed: ${e.code || 'unknown error'}`); });
$('signOutButton').addEventListener('click',()=>signOut(auth));

onAuthStateChanged(auth,user=>{ if(user) completeLogin(user); else { currentUser=null; $('authCard').hidden=false; $('appShell').hidden=true; } });

function switchTab(name) { document.querySelectorAll('.tab').forEach(b=>b.classList.toggle('active',b.dataset.tab===name)); document.querySelectorAll('.tab-panel').forEach(p=>{const active=p.id===`tab-${name}`;p.hidden=!active;p.classList.toggle('active',active);}); }
document.querySelectorAll('.tab').forEach(b=>b.addEventListener('click',()=>switchTab(b.dataset.tab)));

$('journalText').addEventListener('input',()=> $('journalCount').textContent=`${$('journalText').value.length} / 8000`);
$('saveJournal').addEventListener('click',async()=>{const text=$('journalText').value.trim();if(!text)return $('journalText').focus();const b=$('saveJournal');setBusy(b,true,'Gemini is reflecting…');try{const d=await api('/api/journals',{method:'POST',body:JSON.stringify({text})});const a=d.journal.analysis||{};$('journalResult').hidden=false;$('journalResult').innerHTML=`<div class="result-title">${escapeHtml(a.summary||'Reflection saved.')}</div><div class="chips">${(a.themes||[]).map(x=>`<span>${escapeHtml(x)}</span>`).join('')}</div><div class="mini-grid"><div><b>Win</b><p>${escapeHtml((a.wins||['—'])[0])}</p></div><div><b>Challenge</b><p>${escapeHtml((a.challenges||['—'])[0])}</p></div><div><b>Next step</b><p>${escapeHtml(a.action||'—')}</p></div></div>`;$('journalText').value='';$('journalCount').textContent='0 / 8000';await loadJournals();}catch(e){alert(e.message);}finally{setBusy(b,false);}});
async function loadJournals(){try{const d=await api('/api/journals');const list=$('journalList');if(!d.journals.length){list.innerHTML='<div class="empty">No entries yet. Your first reflection starts the timeline.</div>';return;}list.innerHTML=d.journals.map(j=>`<article class="journal-item"><div class="journal-meta"><span>${fmtDate(j.createdAt)}</span><button data-delete="${j.id}" class="icon-btn" title="Delete entry">×</button></div><p>${escapeHtml(j.text)}</p>${j.analysis?.summary?`<small>✦ ${escapeHtml(j.analysis.summary)}</small>`:''}</article>`).join('');list.querySelectorAll('[data-delete]').forEach(b=>b.addEventListener('click',async()=>{if(confirm('Delete this journal entry?')){await api('/api/journals/'+b.dataset.delete,{method:'DELETE'});await loadJournals();}}));}catch(e){console.error(e);}}
$('refreshJournals').addEventListener('click',loadJournals);

$('generateInsights').addEventListener('click',async()=>{const b=$('generateInsights');setBusy(b,true,'Finding patterns…');try{const d=await api('/api/journals/insights',{method:'GET'});const i=d.insights;if(!i){$('insightsResult').innerHTML=`<div class="empty">${escapeHtml(d.message||'Add more journal entries first.')}</div>`;return;}$('insightsResult').innerHTML=`<div class="insight-main"><span class="eyebrow">PERSONAL SIGNAL</span><h3>${escapeHtml(i.headline)}</h3><p><b>Momentum:</b> ${escapeHtml(i.momentum)}</p><p><b>Focus:</b> ${escapeHtml(i.focus)}</p></div>${(i.patterns||[]).map(p=>`<article class="insight"><span>✦</span><div><h4>${escapeHtml(p.pattern)}</h4><p>${escapeHtml(p.evidence)}</p><small>Try: ${escapeHtml(p.suggestion)}</small></div></article>`).join('')}`;}catch(e){alert(e.message);}finally{setBusy(b,false);}});

async function loadGoals(){try{const d=await api('/api/journals/goals');$('goalList').innerHTML=d.goals.length?d.goals.map(g=>`<article class="goal"><div><b>${escapeHtml(g.title)}</b><p>${escapeHtml(g.description||'No details')}</p></div><button class="ghost compare" data-id="${g.id}">Compare with history</button></article>`).join(''):'<div class="empty">No active goals yet.</div>';document.querySelectorAll('.compare').forEach(b=>b.addEventListener('click',async()=>{setBusy(b,true,'Comparing…');try{const d=await api(`/api/journals/goals/${b.dataset.id}/compare`,{method:'POST'});const p=d.progress;alert(`${p.status.toUpperCase()} · ${p.score}/100\n\n${p.evidence.join('\n')}\n\nNext: ${p.nextStep}`);}catch(e){alert(e.message);}finally{setBusy(b,false);}}));}catch(e){console.error(e);}}
$('addGoal').addEventListener('click',async()=>{const title=$('goalTitle').value.trim(),description=$('goalDescription').value.trim();if(!title)return $('goalTitle').focus();const b=$('addGoal');setBusy(b,true,'Saving…');try{await api('/api/journals/goals',{method:'POST',body:JSON.stringify({title,description})});$('goalTitle').value='';$('goalDescription').value='';await loadGoals();}catch(e){alert(e.message);}finally{setBusy(b,false);}});
$('generatePlan').addEventListener('click',async()=>{const b=$('generatePlan');setBusy(b,true,'Building plan…');try{const d=await api('/api/journals/growth-plan',{method:'POST'});const p=d.plan;$('planResult').hidden=false;$('planResult').innerHTML=`<span class="eyebrow">YOUR 30 DAYS</span><h3>${escapeHtml(p.title)}</h3><p>${escapeHtml(p.why)}</p>${(p.weeks||[]).map(w=>`<div class="week"><b>Week ${w.week} · ${escapeHtml(w.focus)}</b><ul>${(w.actions||[]).map(a=>`<li>${escapeHtml(a)}</li>`).join('')}</ul></div>`).join('')}<p><b>Daily check-in:</b> ${escapeHtml(p.dailyCheckIn)}</p><p><b>Success signal:</b> ${escapeHtml(p.successSignal)}</p>`;}catch(e){alert(e.message);}finally{setBusy(b,false);}});

function addChat(role,text){const el=document.createElement('div');el.className=`bubble ${role}`;el.textContent=text;$('chatMessages').appendChild(el);$('chatMessages').scrollTop=$('chatMessages').scrollHeight;}
$('chatForm').addEventListener('submit',async e=>{e.preventDefault();const input=$('chatInput'),message=input.value.trim();if(!message)return;input.value='';addChat('user',message);const b=e.submitter;setBusy(b,true,'Thinking…');try{const d=await api('/api/journals/chat',{method:'POST',body:JSON.stringify({message,history:chatHistory})});addChat('assistant',d.reply);chatHistory.push({role:'user',content:message},{role:'assistant',content:d.reply});}catch(err){addChat('assistant',err.message);}finally{setBusy(b,false);}});
