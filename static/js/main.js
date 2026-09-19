document.addEventListener('DOMContentLoaded', () => {
  const toggle = document.getElementById('menuToggle');
  const sidebar = document.getElementById('sidebar');
  if (toggle && sidebar) toggle.addEventListener('click', () => sidebar.classList.toggle('open'));

  document.querySelectorAll('form[data-validate]').forEach(form => {
    form.addEventListener('submit', event => {
      if (!form.checkValidity()) { event.preventDefault(); form.reportValidity(); }
    });
  });

  const root = document.getElementById('simulator');
  if (root) initSimulator(root);
  const analyzer = document.getElementById('analyzerForm');
  if (analyzer) initAnalyzer(analyzer);
});

function initSimulator(root) {
  const scenarios = JSON.parse(root.dataset.scenarios || '[]');
  let index = 0, answer = '', clues = new Set(), action = '';
  const $ = id => document.getElementById(id);
  const submit = $('submitAttempt'), next = $('nextScenario');
  function render() {
    const s = scenarios[index]; answer=''; clues=new Set(); action='';
    $('scenarioCount').textContent = `SCENARIO ${index+1} / ${scenarios.length}`;
    $('scenarioMeta').textContent = `${s.channel} · ${s.level}`;
    $('scenarioTitle').textContent=s.title; $('sender').textContent=s.sender;
    $('subject').textContent=s.subject; $('messageBody').textContent=s.body;
    const list=$('clueList'); list.replaceChildren();
    s.clues.forEach(clue => {
      const b=document.createElement('button'); b.type='button'; b.className='clue-option';
      b.innerHTML='<span class="check-box"></span>'; const label=document.createElement('span'); label.textContent=clue; b.append(label);
      b.addEventListener('click',()=>{if(clues.has(clue)){clues.delete(clue);b.classList.remove('selected');b.querySelector('.check-box').textContent='';}else{clues.add(clue);b.classList.add('selected');b.querySelector('.check-box').textContent='✓';}});
      list.append(b);
    });
    document.querySelectorAll('[data-answer]').forEach(b=>{b.classList.remove('chosen');b.onclick=()=>{answer=b.dataset.answer;document.querySelectorAll('[data-answer]').forEach(x=>x.classList.toggle('chosen',x===b));checkReady();};});
    $('safeAction').value=''; $('safeAction').onchange=e=>{action=e.target.value;checkReady();};
    $('simFeedback').classList.add('hidden'); next.classList.add('hidden'); submit.classList.remove('hidden');submit.disabled=true;
  }
  function checkReady(){submit.disabled=!(answer&&action);}
  submit.addEventListener('click', async()=>{
    submit.disabled=true;
    try {
      const response=await fetch('/api/attempt',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({scenario_id:scenarios[index].id,answer,clues:[...clues],action})});
      const data=await response.json(); if(!response.ok)throw new Error(data.error||'Could not save attempt.');
      const box=$('simFeedback');box.className='feedback '+(data.correct?'good':'review');
      const title=document.createElement('b');title.textContent=data.correct?'✓ Correct classification':'↻ Review and learn';box.replaceChildren(title);
      const p=document.createElement('p');p.textContent=`Correct classification: ${data.expected}. ${data.explanation}`;box.append(p);
      const p2=document.createElement('p');p2.textContent='Safer next step: '+data.safe_action;box.append(p2);
      submit.classList.add('hidden');next.classList.remove('hidden');
    } catch(e){const box=$('simFeedback');box.className='feedback review';box.textContent=e.message;submit.disabled=false;}
  });
  next.addEventListener('click',()=>{index=(index+1)%scenarios.length;render();});
  render();
}

function initAnalyzer(form) {
  const input=document.getElementById('messageInput'), count=document.getElementById('charCount');
  const button=document.getElementById('analyzeButton'), err=document.getElementById('analyzerError');
  input.addEventListener('input',()=>count.textContent=input.value.length);
  form.addEventListener('submit',async e=>{
    e.preventDefault();err.classList.add('hidden');
    if(!input.value.trim()){err.textContent='Please enter a message.';err.classList.remove('hidden');input.focus();return;}
    if(input.value.length>5000){err.textContent='Maximum length is 5,000 characters.';err.classList.remove('hidden');return;}
    button.disabled=true;button.textContent='Analyzing…';
    try{
      const r=await fetch('/api/analyze',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({message:input.value})});
      const data=await r.json();if(!r.ok)throw new Error(data.error||'Analysis failed.');
      const result=document.getElementById('analysisResult');result.replaceChildren();result.className='';
      const risk=document.createElement('span');risk.className='risk '+data.risk.toLowerCase();risk.textContent=data.risk+' risk';result.append(risk);
      const summary=document.createElement('p');summary.textContent=data.summary;result.append(summary);
      addList(result,'Signals identified',data.indicators);addList(result,'Recommended next steps',data.next_steps);
      const source=document.createElement('small');source.className='source-note';source.textContent='Source: '+data.source+' · Automated guidance is not a guarantee.';result.append(source);
      document.getElementById('analysisPlaceholder').classList.add('hidden');
    }catch(ex){err.textContent=ex.message;err.classList.remove('hidden');}
    finally{button.disabled=false;button.textContent='Analyze message ✧';}
  });
}
function addList(parent,title,items){
  const h=document.createElement('h4');h.textContent=title;parent.append(h);
  const ul=document.createElement('ul');(items||[]).forEach(text=>{const li=document.createElement('li');li.textContent=text;ul.append(li);});parent.append(ul);
}


// URL review and call transcript reuse the existing defensive analyzer endpoints.
document.addEventListener('DOMContentLoaded', () => {
 const urlBtn=document.getElementById('checkUrlButton'), urlInput=document.getElementById('urlInput'), urlResult=document.getElementById('urlResult');
 if(urlBtn) urlBtn.addEventListener('click', async()=>{urlResult.textContent='Checking locally…'; try{const r=await fetch('/api/analyze-url',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({url:urlInput.value})});const d=await r.json();urlResult.innerHTML=''; const h=document.createElement('h4');h.textContent='Risk: '+(d.risk||'Unknown');urlResult.appendChild(h);const p=document.createElement('p');p.textContent=d.summary||d.error||'';urlResult.appendChild(p);(d.indicators||[]).forEach(x=>{const li=document.createElement('p');li.textContent='• '+x;urlResult.appendChild(li)});}catch(e){urlResult.textContent='Could not check URL.';}});
 const tbtn=document.getElementById('analyzeTranscript'), transcript=document.getElementById('callTranscript'), msg=document.getElementById('messageInput');
 if(tbtn&&transcript&&msg) tbtn.addEventListener('click',()=>{msg.value=transcript.value;msg.dispatchEvent(new Event('input',{bubbles:true}));document.getElementById('analyzerForm').requestSubmit();});
});
