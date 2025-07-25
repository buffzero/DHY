
(()=>{
const dom={app:document.getElementById('app')};

// ---------- 数据 -----------
const trainingTemplate=[4,6,8,10,12].map(v=>({name:`【历练·${v}】`,required:v*1,completed:0}));
const state={
  tier:13,
  training:{
    yinYang:JSON.parse(JSON.stringify(trainingTemplate)),
    windFire:JSON.parse(JSON.stringify(trainingTemplate)),
    earthWater:JSON.parse(JSON.stringify(trainingTemplate))
  }
};
const presetRuns={
  13:{4:6,6:12,8:24,10:16,12:1},
  15:{4:6,6:12,8:24,10:35,12:12},
  17:{4:6,6:12,8:24,10:35,12:47}
};

// ---------- 渲染 ----------
function render(){
  dom.app.innerHTML=`
  <div class="container">
    <div class="section">
      <div class="section-title">目标修为</div>
      <select class="tier-select">
        <option value="13"\${state.tier===13?' selected':''}>13</option>
        <option value="15"\${state.tier===15?' selected':''}>15</option>
        <option value="17"\${state.tier===17?' selected':''}>17</option>
      </select>
    </div>
    \${renderTrainingBlock('阴阳历练','yinYang')}
    \${renderTrainingBlock('风火历练','windFire')}
    \${renderTrainingBlock('地水历练','earthWater')}
  </div>\`;
  setupEventListeners();
}

function renderTrainingBlock(title,key){
  const cat=state.training[key];
  return \`
  <div class="section training-category" id="\${key}Training">
    <div class="training-category-title">\${title}<button class="btn-reset" data-cat="\${key}">一键撤销</button></div>
    \${cat.map((t,i)=>renderTrainingRow(key,i,t)).join('')}
  </div>\`;
}
function renderTrainingRow(cat,index,item){
  const dots=Array.from({length:item.required}).map((_,i)=>\`<span class="material-dot \${i<item.completed?'done':''}"></span>\`).join('');
  return \`
    <div data-cat="\${cat}" data-idx="\${index}">
      <div style="margin-top:8px;font-weight:600">\${item.name}</div>
      <div>\${dots}</div>
      <button data-add="1">核销一次</button>
      <button data-add="3">核销三次</button>
      <button data-add="6">核销六次</button>
    </div>\`;
}

// ---------- 交互 ----------
function setupEventListeners(){
  // tier select
  document.querySelector('.tier-select').onchange=e=>{
    state.tier=parseInt(e.target.value);
    applyPreset(state.tier);
    render();
  };
  // add buttons
  document.querySelectorAll('[data-add]').forEach(btn=>{
    btn.onclick=e=>{
      const add=parseInt(e.target.dataset.add);
      const row=e.target.closest('[data-cat]');
      const cat=row.dataset.cat;
      const idx=row.dataset.idx;
      state.training[cat][idx].completed=Math.min(state.training[cat][idx].completed+add,state.training[cat][idx].required);
      render();
    };
  });
  // reset buttons
  document.querySelectorAll('.btn-reset').forEach(btn=>{
    btn.onclick=()=>{
      const key=btn.dataset.cat;
      state.training[key].forEach(t=>t.completed=0);
      render();
    };
  });
}

function applyPreset(tier){
  const preset=presetRuns[tier];
  if(!preset)return;
  ['yinYang','windFire','earthWater'].forEach(cat=>{
    state.training[cat].forEach(t=>{
      const floor=parseInt(t.name.match(/历练·(\d+)/)[1]);
      t.required=preset[floor]||t.required;
      t.completed=0;
    });
  });
}

render();
})();
