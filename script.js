/**
 * 密探升级助手 - 资源追踪系统
 * 功能：追踪升级材料、历练进度和属性状态
 */
const ResourceTracker = (() => {

  // ==================== 配置常量 ====================
  const CONFIG = {
    containerId: '#resourceTracker',
    elements: {
      // 核心元素
      classStatus:      '#classStatus',
      attributeStatus:  '#attributeStatus',
      materialsList:    '#materials-list',

      // 金钱和经验
      moneyCheck: '#money-check',
      fragments:  '#bingshu_canjuan',
      scrolls:    '#bingshu_quanjuan',
      expStatus:  '#exp-status',

      // 历练
      yinYangTraining:  '#yinYangTraining',
      windFireTraining: '#windFireTraining',
      earthWaterTraining: '#earthWaterTraining',

      // 系统控制
      lastUpdated: '#lastUpdated',
      resetButton: '#resetButton'
    },
    storageKey: 'DHY-Upgrade-Assistant_v2',
    requiredExp: 2386300       // 所需总经验值
  };

  // ==================== 游戏数据 ====================
  const GAME_DATA = {
    // 职业 & 属性
    classes:    ['诡道','神纪','岐黄','龙盾','破军'],
    attributes: ['阴','阳','风','火','地','水'],

    // ---- 材料 ----
    materials: [
      // 80 级
      { id:'fujunhaitang', name:'【府君海棠】*30', class:'诡道', level:'gold' },
      { id:'panlonggu',    name:'【蟠龙鼓】*30',   class:'神纪', level:'gold' },
      { id:'yinwendao',    name:'【银纹刀】*30',   class:'岐黄', level:'gold' },
      { id:'yuguidun',     name:'【玉龟盾】*30',   class:'龙盾', level:'gold' },
      { id:'xijiaogong',   name:'【犀角弓】*30',   class:'破军', level:'gold' },

      // 70 级
      { id:'menghunlan',   name:'【梦魂兰】*30',   class:'诡道', level:'purple' },
      { id:'zhentiangu',   name:'【震天鼓】*30',   class:'神纪', level:'purple' },
      { id:'qingtongdao',  name:'【青铜刀】*30',   class:'岐黄', level:'purple' },
      { id:'caiwendun',    name:'【彩纹盾】*30',   class:'龙盾', level:'purple' },
      { id:'tietaigong',   name:'【铁胎弓】*30',   class:'破军', level:'purple' },

      // 通用
      { id:'zuigucao',   name:'【醉骨草】*30',    class:'通用', level:'purple' },
      { id:'qingtingyan',name:'【蜻蜓眼】*120',   class:'通用', level:'blue'   },
      { id:'ziyunying',  name:'【紫云英】*160',   class:'通用', level:'blue'   },
      { id:'yingqiongyao',name:'【瑛琼瑶】*105',  class:'通用', level:'blue'   },
      { id:'jincuodao',  name:'【金错刀】*80',    class:'通用', level:'blue'   },
      { id:'diguanghe',  name:'【低光荷】*100',   class:'通用', level:'blue'   },
      { id:'yuanyu',     name:'【鸢羽】*40',      class:'通用', level:'blue'   },
      { id:'jianjia',    name:'【蒹葭】*494',     class:'通用', level:'blue'   },
    ],

    // ---- 历练模板 ----
    training: {
      windFire:  [4,6,8,10,12].map((v,i)=>({ name:`【历练·${['四','六','八','十','十二'][i]}】`, required:[6,12,24,35,47][i], editable:true })),
      earthWater:[4,6,8,10,12].map((v,i)=>({ name:`【历练·${['四','六','八','十','十二'][i]}】`, required:[6,12,24,35,47][i], editable:true })),
      yinYang:   [4,6,8,10,12].map((v,i)=>({ name:`【历练·${['四','六','八','十','十二'][i]}】`, required:[6,12,24,35,47][i], editable:true }))
    }
  };

  // ==================== 状态对象 ====================
  let state = createFreshState();
  const dom  = {};                        // DOM 缓存

  // ========== 工具：生成初始 state ==========
  function createFreshState(){
    const blankMat = {};
    GAME_DATA.materials.forEach(m=>blankMat[m.id]=false);

    const makeTrain = cat => GAME_DATA.training[cat].map(t=>({
      completed:0, required:t.required, userModified:false
    }));

    return {
      moneyChecked:false, fragments:0, scrolls:0,
      materials:blankMat,
      training:{
        yinYang:   makeTrain('yinYang'),
        windFire:  makeTrain('windFire'),
        earthWater:makeTrain('earthWater')
      },
      targetSelection:{
        classes:{ guidao:false, shenji:false, qihuang:false, longdun:false, pojun:false },
        attributes:{ yin:false, yang:false, feng:false, huo:false, di:false, shui:false }
      },
      trainingHistory:[],
      lastUpdated:new Date().toISOString()
    };
  }

  // ==================== 渲染函数（必须写成函数声明，保证 hoist） ====================
  function renderTrainingCategory(category, container){
    // 保存输入焦点
    const active = document.activeElement;
    const editing = active?.classList.contains('training-count-input') && active.dataset.category===category;
    const editInfo = editing ? { idx:+active.dataset.index, val:active.value, pos:active.selectionStart } : null;

    container.innerHTML = GAME_DATA.training[category].map((tmpl,idx)=>{
      const cur   = state.training[category][idx];
      const req   = cur.userModified ? cur.required : tmpl.required;
      const done  = cur.completed;
      const met   = req===0 || done>=req;
      const left  = req-done;
      const circles = req>0 ? `<div class="circles-container">${Array.from({length:req}).map((_,i)=>`<div class="circle ${i<done?'filled':''}"></div>`).join('')}</div>` : '';

      return `<div class="training-item">
        <div class="training-header">
          <div class="training-name">${tmpl.name}</div>
          <div class="training-input-status">
            <input type="text" inputmode="numeric" class="training-count-input" data-category="${category}" data-index="${idx}" value="${req}">
            <div class="sub-status-indicator ${met?'met':'not-met'}">${met?'已满足':`${done}/${req}`}</div>
          </div>
        </div>
        ${circles}
        <div class="training-actions">
          ${[1,3,6].map(n=>`<button class="consume-btn" data-category="${category}" data-index="${idx}" data-count="${n}" ${met||left<n?'disabled':''}>核销${['一次','三次','六次'][[1,3,6].indexOf(n)]}</button>`).join('')}
          <button class="undo-btn" data-category="${category}" data-index="${idx}" ${done<=0?'disabled':''}>撤销</button>
        </div>
      </div>`;
    }).join('');

    // 恢复输入焦点
    if(editInfo){
      const inp = container.querySelector(`.training-count-input[data-index="${editInfo.idx}"]`);
      if(inp){ inp.value = editInfo.val; inp.focus(); inp.setSelectionRange(editInfo.pos,editInfo.pos); }
    }
  }

  function renderAll(){
    const expStat = calculateExpStatus();
    const baseOk  = checkBaseConditions(expStat);

    updateBasicUI(expStat);
    renderTargetSelection();
    renderClassStatus(baseOk);
    renderMaterials();
    renderTraining();                     // 三大类
  }

  // ==================== 其余渲染/计算/事件函数 ====================
  // ---- UI 基础 ----
  function updateBasicUI(expStatus){
    dom.expStatus.textContent = expStatus.text;
    dom.expStatus.className   = expStatus.className;
    dom.moneyCheck.checked    = state.moneyChecked;
    dom.fragments.value       = state.fragments;
    dom.scrolls.value         = state.scrolls;
  }

  function renderTargetSelection(){
    const sec = document.querySelector('.target-section');
    if(!sec) return;
    sec.querySelectorAll('input[type="checkbox"]').forEach(cb=>{
      const t = cb.dataset.type, v = cb.dataset.value;
      cb.checked = t==='class' ? state.targetSelection.classes[v] : state.targetSelection.attributes[v];
    });
  }

  function renderClassStatus(baseOk){
    dom.classStatus.innerHTML = GAME_DATA.classes.map(c=>{
      const ok = checkClassReady(c,baseOk);
      const key= getClassKey(c);
      return `<div class="status-item ${key}"><span>${c}</span><span class="status-indicator ${ok?'ready':'pending'}">${ok?'可满级':'待沉淀'}</span></div>`;
    }).join('');
  }

  function renderAttributeStatus(){
    const ready = {
      yinYang:   checkTrainingComplete('yinYang'),
      windFire:  checkTrainingComplete('windFire'),
      earthWater:checkTrainingComplete('earthWater')
    };
    dom.attributeStatus.innerHTML = GAME_DATA.attributes.map(a=>{
      let ok=false, cls='';
      switch(a){
        case '阴': cls='yin'; ok=ready.yinYang; break;
        case '阳': cls='yang';ok=ready.yinYang; break;
        case '风': cls='feng';ok=ready.windFire; break;
        case '火': cls='huo'; ok=ready.windFire; break;
        case '地': cls='di';  ok=ready.earthWater; break;
        case '水': cls='shui';ok=ready.earthWater; break;
      }
      return `<div class="status-item ${cls}"><span>${a}</span><span class="status-indicator ${ok?'ready':'pending'}">${ok?'可满级':'待沉淀'}</span></div>`;
    }).join('');
  }

  function renderMaterials(){
    dom.materialsList.innerHTML = GAME_DATA.materials.map(m=>{
      return `<div class="resource-item ${m.level||'blue'}">
        <div class="resource-name">${m.name}</div>
        <div class="checkbox-container">
          <input type="checkbox" id="${m.id}-check" ${state.materials[m.id]?'checked':''}>
          <label for="${m.id}-check" class="material-checkbox"></label>
        </div>
      </div>`;
    }).join('');
  }

  function renderTraining(){
    renderTrainingCategory('yinYang'  , dom.yinYangTraining);
    renderTrainingCategory('windFire' , dom.windFireTraining);
    renderTrainingCategory('earthWater',dom.earthWaterTraining);
    renderAttributeStatus();
    addCategoryResetButtons();           // 保证按钮存在
  }

  // ---- 计算 ----
  function calculateExpStatus(){
    const cur = state.fragments*100 + state.scrolls*1000;
    const met = cur >= CONFIG.requiredExp;
    return { isMet:met, text:met?'已满足':'未满足', className:`sub-status-indicator ${met?'met':'not-met'}` };
  }

  function checkBaseConditions(expStat){
    const generalsMet = GAME_DATA.materials.filter(m=>m.class==='通用').every(m=>state.materials[m.id]);
    return state.moneyChecked && expStat.isMet && generalsMet;
  }

  function checkClassReady(c,baseOk){
    const matsOk = GAME_DATA.materials.filter(m=>m.class===c).every(m=>state.materials[m.id]);
    return baseOk && matsOk;
  }

  function checkTrainingComplete(cat){
    return state.training[cat].every((it,i)=> it.completed >= (it.userModified?it.required:GAME_DATA.training[cat][i].required));
  }

  // ---- 操作 & 事件 ----
  function handleConsume(cat,idx,n){
    const it = state.training[cat][idx];
    const req = it.required, done = it.completed;
    const add = Math.min(n, req-done);
    if(add<=0) return;
    state.trainingHistory.push({category:cat,index:idx,previousCount:done,count:add,timestamp:new Date().toISOString()});
    it.completed = done+add;
    updateAndSave();
  }
  function handleUndo(cat,idx){
    const it=state.training[cat][idx]; if(!it||it.completed<=0) return;
    const histIdx=[...state.trainingHistory].reverse().findIndex(a=>a.category===cat&&a.index===idx);
    if(histIdx!==-1){
      const real=state.trainingHistory.length-1-histIdx;
      it.completed = state.trainingHistory[real].previousCount;
      state.trainingHistory.splice(real,1);
      updateAndSave();
    }
  }

  function setupEventListeners(){
  // 事件代理：一次绑定即可
  document.addEventListener('click', e => {
    const btn = e.target.closest('.undo-btn');   // 点击到“核销…”按钮？
    if (!btn) return;                            // 不是就退出

    const catDiv = btn.closest('.training-category');   // 当前历练块
    const key    = catDiv.id.replace('Training','');    // yinYang / windFire / earthWater
    const floor  = +btn.dataset.floor;                 // 0‑4
    const inc    = +btn.dataset.inc;                   // 1 / 3 / 6

    const t = state.training[key][floor];
    t.completed = Math.min(t.required, t.completed + inc);  // 叠加次数但不超上限

    renderTrainingCategory(key, catDiv);   // 只刷新这一块
    renderAttributeStatus();               // 更新属性总览
    saveData();                            // 写入 localStorage
  }, true);
}

  function eventHandler(e){
    const t=e.target;
    // 目标复选
    if(t.matches('.target-section input[type="checkbox"]')){
      const type=t.dataset.type,val=t.dataset.value;
      if(type==='class')      state.targetSelection.classes[val]=t.checked;
      else if(type==='attribute') state.targetSelection.attributes[val]=t.checked;
      updateAndSave();
    }
    // 金钱
    else if(t===dom.moneyCheck){ state.moneyChecked=t.checked; updateAndSave(); }
    // 兵书
    else if(t===dom.fragments){ state.fragments=+t.value||0; updateAndSave(); }
    else if(t===dom.scrolls){   state.scrolls  =+t.value||0; updateAndSave(); }
    // 材料
    else if(t.closest('.materials-list')){
      if(t.type==='checkbox'){
        const id=t.id.replace('-check','');
        state.materials[id]=t.checked; updateAndSave();
      }
    }
    // 输入圈数
    else if(t.classList.contains('training-count-input')){
      t.value = t.value.replace(/[^0-9]/g,'');
      const cat=t.dataset.category, idx=+t.dataset.index;
      state.training[cat][idx].required = +t.value||0;
      state.training[cat][idx].userModified = true;
      renderTrainingCategory(cat, document.getElementById(`${cat}Training`));
      clearTimeout(t._save); t._save=setTimeout(updateAndSave,500);
    }
    // 核销 / 撤销
    else if(t.classList.contains('consume-btn')){
      handleConsume(t.dataset.category,+t.dataset.index,+t.dataset.count||1);
    }
    else if(t.classList.contains('undo-btn')){
      handleUndo(t.dataset.category,+t.dataset.index);
    }
  }
  document.addEventListener('click',eventHandler,true);
  document.addEventListener('input',eventHandler,true);
  document.addEventListener('_RT_listener',eventHandler,true); // 用自定义事件名方便一次性解绑

  // ---- 保存/日期 ----
  function updateAndSave(){ state.lastUpdated=new Date().toISOString(); saveData(); renderAll(); }
  function saveData(){ try{localStorage.setItem(CONFIG.storageKey,JSON.stringify(state));}catch(e){console.error('保存失败',e);} }

  // ---- DOM 构建 & 加载 ----
  function setupDOM(){
    dom.container=document.querySelector(CONFIG.containerId);
    Object.entries(CONFIG.elements).forEach(([k,s])=>dom[k]=document.querySelector(s));
  }
  function loadData(){
    try{
      const s=localStorage.getItem(CONFIG.storageKey);
      if(s){ const p=JSON.parse(s); state={...createFreshState(),...p}; }
    }catch(e){console.error('load fail',e);}
  }

  // ==================== 初始化 ====================
  function init(){
    try{
      setupDOM();
      buildAttributeStatus(); 
      renderAll(); 
      setupEventListeners();
    }catch(e){ console.error('初始化失败',e); alert('系统初始化失败，请刷新'); }
  }

  // ==================== 额外辅助：一键撤销 & 修为预设 ====================
  function addCategoryResetButtons(){
    document.querySelectorAll('.training-category').forEach(cat=>{
      const title=cat.querySelector('.training-category-title');
      if(!title||title.querySelector('.btn-reset')) return;
      const btn=document.createElement('button');
      btn.textContent='一键撤销'; btn.className='btn-reset'; btn.style.marginLeft='8px';
      btn.onclick=()=>{
        const key=cat.id.replace('Training','');
        state.training[key].forEach(t=>t.completed=0);
        renderTrainingCategory(key,cat); renderAttributeStatus(); saveData();
      };
      title.appendChild(btn);
    });
  }
  function addExtraTierOptions(){
    document.querySelectorAll('select[target-tier]').forEach(sel=>{
      [13,15,17].forEach(v=>{
        if([ ...sel.options ].every(o=>+o.value!==v)){
          const opt=document.createElement('option'); opt.value=v; opt.textContent=v; sel.appendChild(opt);
        }
      });
    });
  }
  const presetRuns={
    13:{4:6,6:12,8:24,10:16,12:1},
    15:{4:6,6:12,8:24,10:35,12:12},
    17:{4:6,6:12,8:24,10:35,12:47}
  };
  function applyPreset(tier){
    const p=presetRuns[tier]; if(!p) return;
    ['yinYang','windFire','earthWater'].forEach(cat=>{
      [4,6,8,10,12].forEach((f,i)=>{
        state.training[cat][i].required=p[f]; state.training[cat][i].userModified=true;
      });
      renderTrainingCategory(cat,document.getElementById(`${cat}Training`));
    });
    renderAttributeStatus(); saveData();
  }
// ---- 首次 DOMContentLoaded ----
document.addEventListener('DOMContentLoaded',()=>{
  init();                             // ⭐️ 先初始化

  addCategoryResetButtons();
  addExtraTierOptions();

  const sel=document.querySelector('.tier-select');
  if(sel){
    sel.addEventListener('change',()=>applyPreset(+sel.value));
    applyPreset(+sel.value);          // 首次执行
  }
});


  // ========= 对外 =========
  return { init };

})();   // 立即执行
