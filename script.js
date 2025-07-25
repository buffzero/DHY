/**
 * 《如鸢》密探升级 & 修为助手　——　资源追踪系统
 * v2025‑07‑25  by ChatGPT rebuild
 */
const ResourceTracker = (() => {

  /* ============== 配置 ============== */
  const CONFIG = {
    containerId : '#resourceTracker',
    elements : {
      classStatus      : '#classStatus',
      attributeStatus  : '#attributeStatus',
      materialsList    : '#materials-list',
      moneyCheck       : '#money-check',
      fragments        : '#bingshu_canjuan',
      scrolls          : '#bingshu_quanjuan',
      expStatus        : '#exp-status',
      yinYangTraining  : '#yinYangTraining',
      windFireTraining : '#windFireTraining',
      earthWaterTraining : '#earthWaterTraining',
      lastUpdated      : '#lastUpdated'
    },
    storageKey   : 'DHY‑Upgrade‑Assistant_v2',
    requiredExp  : 2_386_300        // 兵书欠缺时用不到
  };

  /* ============== 常量数据 ============== */
  const CLASS_LIST   = ['诡道','神纪','岐黄','龙盾','破军'];
  const ATTR_LIST    = ['阴','阳','风','火','地','水'];
  const CLASS_KEY    = { '诡道':'guidao','神纪':'shenji','岐黄':'qihuang','龙盾':'longdun','破军':'pojun' };

  // 原素材 / 历练模板维持不变（与你仓库里最后版本一致）
  const MATERIALS = [ /* ------ 省略，保持原数组 ------ */ ];
  const TRAINING_TEMPLATE = {
    yinYang   : [6,12,24,35,47],
    windFire  : [6,12,24,35,47],
    earthWater: [6,12,24,35,47]
  };

  /* ============== 生成初始 state ============== */
  function freshState(){
    // 材料布尔表
    const mats = {}; MATERIALS.forEach(m=>mats[m.id]=false);
    const makeTrain = arr => arr.map(req=>({required:req,completed:0,userModified:false}));

    return {
      /* 基础 */
      moneyChecked:false, fragments:0, scrolls:0,
      /* 选中目标 */
      targetSelection:{
        classes   : Object.fromEntries(CLASS_LIST.map(k=>[CLASS_KEY[k],false])),
        attributes: {yin:false,yang:false,feng:false,huo:false,di:false,shui:false}
      },
      /* 材料 / 历练 */
      materials:mats,
      training : {
        yinYang   : makeTrain(TRAINING_TEMPLATE.yinYang),
        windFire  : makeTrain(TRAINING_TEMPLATE.windFire),
        earthWater: makeTrain(TRAINING_TEMPLATE.earthWater)
      },
      trainingHistory:[],
      lastUpdated:new Date().toISOString()
    };
  }
  let state = freshState();          // 全局可变
  const dom  = {};                   // DOM 缓存

  /* ============== DOM 构建 / 加载 ============== */
  function setupDOM(){
    dom.container = document.querySelector(CONFIG.containerId);
    Object.entries(CONFIG.elements).forEach(([k,sel])=> dom[k]=document.querySelector(sel));
  }
  function loadData(){
    try{
      const raw = localStorage.getItem(CONFIG.storageKey);
      if(raw){ state = {...freshState(),...JSON.parse(raw)};}
    }catch(e){ console.warn('本地存储读取失败',e);}
  }

  /* ============== 渲染 ============== */
  /* ——职/属状态—— */
  function renderClassStatus(baseOK){
    dom.classStatus.innerHTML = CLASS_LIST.map(c=>{
      const ok = baseOK && MATERIALS.filter(m=>m.class===c).every(m=>state.materials[m.id]);
      return `<div class="status-item ${CLASS_KEY[c]}"><span>${c}</span><span class="status-indicator ${ok?'ready':'pending'}">${ok?'可满级':'待沉淀'}</span></div>`;
    }).join('');
  }
  function renderAttributeStatus(){
    const ready = {
      yinYang   : state.training.yinYang  .every((t,i)=>t.completed>=t.required),
      windFire  : state.training.windFire .every((t,i)=>t.completed>=t.required),
      earthWater: state.training.earthWater.every((t,i)=>t.completed>=t.required)
    };
    dom.attributeStatus.innerHTML = ATTR_LIST.map(a=>{
      const map = {阴:'yin',阳:'yang',风:'feng',火:'huo',地:'di',水:'shui'};
      const catReady = {阴:ready.yinYang,阳:ready.yinYang,风:ready.windFire,火:ready.windFire,地:ready.earthWater,水:ready.earthWater}[a];
      return `<div class="status-item ${map[a]}"><span>${a}</span><span class="status-indicator ${catReady?'ready':'pending'}">${catReady?'可满级':'待沉淀'}</span></div>`;
    }).join('');
  }

  /* ——材料列表—— */
  function renderMaterials(){
    dom.materialsList.innerHTML = MATERIALS.map(m=>
      `<div class="resource-item ${m.level||'blue'}"><div class="resource-name">${m.name}</div>
         <div class="checkbox-container">
           <input type="checkbox" id="${m.id}-check"${state.materials[m.id]?' checked':''}>
           <label for="${m.id}-check" class="material-checkbox"></label>
         </div></div>`).join('');
  }

  /* ——历练块—— */
  function renderTrainingCategory(catKey,wrap){
    wrap.innerHTML = state.training[catKey].map((it,i)=>{
      const req = it.required, done = it.completed;
      const met = done>=req;
      const left= req-done;
      const dots=`<div class="circles-container">${Array.from({length:req})
                    .map((_,k)=>`<div class="circle ${k<done?'filled':''}"></div>`).join('')}</div>`;
      const label = ['四','六','八','十','十二'][i];
      const consumeBtns=[1,3,6].map(n=>
        `<button class="consume-btn" data-cat="${catKey}" data-idx="${i}" data-inc="${n}" ${met||left<n?'disabled':''}>核销${['一次','三次','六次'][[1,3,6].indexOf(n)]}</button>`).join('');
      return `<div class="training-item">
        <div class="training-header">
          <div class="training-name">【历练·${label}】</div>
          <div class="training-input-status">
            <input class="training-count-input" data-cat="${catKey}" data-idx="${i}" value="${req}">
            <div class="sub-status-indicator ${met?'met':'not-met'}">${met?'已满足':`${done}/${req}`}</div>
          </div>
        </div>${dots}
        <div class="training-actions">${consumeBtns}
          <button class="undo-btn" data-cat="${catKey}" data-idx="${i}" ${done===0?'disabled':''}>撤销</button>
        </div></div>`;
    }).join('');
  }
  function renderTraining(){
    renderTrainingCategory('yinYang',dom.yinYangTraining);
    renderTrainingCategory('windFire',dom.windFireTraining);
    renderTrainingCategory('earthWater',dom.earthWaterTraining);
    renderAttributeStatus();
  }

  /* ——整体一次—— */
  function renderAll(){
    const expOK   = state.fragments*100 + state.scrolls*1000 >= CONFIG.requiredExp;
    const moneyOK = state.moneyChecked;
    const baseOK  = expOK && moneyOK && MATERIALS.filter(m=>m.class==='通用').every(m=>state.materials[m.id]);
    // 基础 UI
    dom.expStatus.textContent = expOK ? '已满足' : '未满足';
    dom.expStatus.className   = `sub-status-indicator ${expOK?'met':'not-met'}`;
    dom.moneyCheck.checked    = moneyOK;
    dom.fragments.value       = state.fragments;
    dom.scrolls.value         = state.scrolls;
    // 目标块
    renderClassStatus(baseOK);
    renderMaterials();
    renderTraining();
    dom.lastUpdated.textContent = '最近更新：' + new Date(state.lastUpdated).toLocaleString();
  }

  /* ============== 保存 ============== */
  function save(){
    state.lastUpdated = new Date().toISOString();
    localStorage.setItem(CONFIG.storageKey,JSON.stringify(state));
  }
  function updateAndSave(){ save(); renderAll(); }

  /* ============== 历练操作 ============== */
  function consume(cat,idx,inc){
    const t = state.training[cat][idx];
    t.completed = Math.min(t.required, t.completed + inc);
    updateAndSave();
  }
  function undo(cat,idx){
    if(state.training[cat][idx].completed>0){
      state.training[cat][idx].completed--;
      updateAndSave();
    }
  }

  /* ============== 事件绑定 ============== */
  function setupEventListeners(){
    // 所有点击
    document.addEventListener('click',e=>{
      const cb = e.target.closest('.material-checkbox');
      if(cb){
        const id = cb.htmlFor.replace('-check','');
        state.materials[id] = !state.materials[id];
        updateAndSave(); return;
      }
      const consumeBtn = e.target.closest('.consume-btn');
      if(consumeBtn){
        consume(consumeBtn.dataset.cat, +consumeBtn.dataset.idx, +consumeBtn.dataset.inc); return;
      }
      const undoBtn = e.target.closest('.undo-btn');
      if(undoBtn){
        undo(undoBtn.dataset.cat, +undoBtn.dataset.idx); return;
      }
      const resetBtn = e.target.closest('.btn-reset-category');
      if(resetBtn){
        const key = resetBtn.dataset.cat;
        state.training[key].forEach(t=>t.completed=0);
        updateAndSave(); return;
      }
    });
    // 输入框
    document.addEventListener('input',e=>{
      const inp = e.target;
      if(inp.classList.contains('training-count-input')){
        inp.value = inp.value.replace(/[^\d]/g,'');
        const cat=inp.dataset.cat, idx=+inp.dataset.idx;
        state.training[cat][idx].required = +inp.value||0;
        state.training[cat][idx].userModified = true;
        renderTrainingCategory(cat, document.getElementById(`${cat}Training`));
        clearTimeout(inp._tm); inp._tm=setTimeout(updateAndSave,400);
      }
    });
    // 基础输入
    dom.moneyCheck.addEventListener('change',e=>{ state.moneyChecked=e.target.checked; updateAndSave();});
    dom.fragments .addEventListener('input',e=>{ state.fragments=+e.target.value||0; updateAndSave();});
    dom.scrolls   .addEventListener('input',e=>{ state.scrolls  =+e.target.value||0; updateAndSave();});
  }

  /* ============== 初始化 ============== */
  function init(){
    setupDOM();
    loadData();
    renderAll();
    setupEventListeners();
  }

  /* ============== 修为预设 & 一键撤销按钮 ============== */
  function addHelperUI(){
    // tier 选项
    const sel = document.querySelector('.tier-select');
    if(sel){ [13,15,17].forEach(v=>{
      if(![...sel.options].some(o=>+o.value===v)){
        const o=document.createElement('option');o.value=v;o.textContent=v;sel.appendChild(o);
      }
    });}

    // 监听修为切换
    const preset={
      13:{4:6,6:12,8:24,10:16,12:1},
      15:{4:6,6:12,8:24,10:35,12:12},
      17:{4:6,6:12,8:24,10:35,12:47}
    };
    sel?.addEventListener('change',()=>{
      const p=preset[+sel.value]; if(!p)return;
      ['yinYang','windFire','earthWater'].forEach(cat=>{
        [4,6,8,10,12].forEach((f,i)=>{ state.training[cat][i].required=p[f]; state.training[cat][i].userModified=true; });
      });
      updateAndSave();
    });
    sel && sel.dispatchEvent(new Event('change'));

    // 各类别一键撤销
    document.querySelectorAll('.training-category-title').forEach(h=>{
      if(h.querySelector('.btn-reset-category')) return;
      const cat = h.parentElement.id.replace('Training','');
      const b=document.createElement('button');
      b.textContent='一键撤销'; b.className='btn-reset-category'; b.dataset.cat=cat; b.style.marginLeft='8px';
      h.appendChild(b);
    });
  }

  /* ============== DOMContentLoaded ============== */
  document.addEventListener('DOMContentLoaded',()=>{
    init();
    addHelperUI();
  });

  return { init };
})();           /* 立即执行完毕 */
