/**
 * 密探升级助手 —— 资源追踪系统
 * （2025‑07‑25 全量修正版）
 * =======================================================
 * ① 追踪升级材料、历练进度、属性/职业完成度
 * ② 支持一键撤销、13/15/17 修为预设圈数
 * ③ 兼容手机 / iPad
 * =======================================================
 */
const ResourceTracker = (() => {
  /* ---------------- 常量 ---------------- */
  const CONFIG = {
    containerId : '#resourceTracker',
    elements : {
      classStatus      : '#classStatus',
      attributeStatus  : '#attributeStatus',
      materialsList    : '#materials-list',
      /* 资金经验 */
      moneyCheck       : '#money-check',
      fragments        : '#bingshu_canjuan',
      scrolls          : '#bingshu_quanjuan',
      expStatus        : '#exp-status',
      /* 历练 */
      yinYangTraining  : '#yinYangTraining',
      windFireTraining : '#windFireTraining',
      earthWaterTraining:'#earthWaterTraining',
      /* 其它 */
      lastUpdated      : '#lastUpdated',
      resetButton      : '#resetButton'
    },
    storageKey : 'DHY-Upgrade-Assistant_v1',
    requiredExp: 2386300          // 兵书经验总需求
  };

  /* ---------------- 游戏静态数据 ---------------- */
  const GAME_DATA = {
    classes    : ['诡道','神纪','岐黄','龙盾','破军'],
    attributes : ['阴','阳','风','火','地','水'],
    /* 材料清单（略） —— 与你现有 html 对应即可 */
    materials  : [ /* ……略，保留你原来的列表…… */ ],
    /* 历练圈数默认值（会被用户改写） */
    training   : {
      windFire :  [6,12,24,35,47].map((n,i)=>({name:`【历练·${['四','六','八','十','十二'][i]}】`,required:n,editable:true})),
      earthWater:[6,12,24,35,47].map((n,i)=>({name:`【历练·${['四','六','八','十','十二'][i]}】`,required:n,editable:true})),
      yinYang  :  [6,12,24,35,47].map((n,i)=>({name:`【历练·${['四','六','八','十','十二'][i]}】`,required:n,editable:true}))
    }
  };

  /* ---------------- 运行时状态 ---------------- */
  let state = {
    moneyChecked:false,
    fragments:0,
    scrolls:0,
    materials:{},
    training:{
      yinYang   :GAME_DATA.training.yinYang  .map(() => ({completed:0,required:6,userModified:false})),
      windFire  :GAME_DATA.training.windFire .map(() => ({completed:0,required:6,userModified:false})),
      earthWater:GAME_DATA.training.earthWater.map(()=>({completed:0,required:6,userModified:false}))
    },
    targetSelection:{
      classes   :{guidao:false,shenji:false,qihuang:false,longdun:false,pojun:false},
      attributes:{yin:false,yang:false,feng:false,huo:false,di:false,shui:false}
    },
    trainingHistory:[],
    lastUpdated:null
  };

  /* ---------------- DOM 缓存 ---------------- */
  const dom = {};

  /* ======================================================
     初始化流程
  ====================================================== */
  const init = () => {
    try{
      setupDOM();
      loadData();
      renderAll();
      setupEventListeners();
      console.log('✅ DHY 助手已就绪');
    }catch(err){
      console.error('初始化失败：',err);
      alert('系统初始化失败，请刷新页面重试');
    }
  };

  const setupDOM = () => {
    dom.container = document.querySelector(CONFIG.containerId);
    Object.entries(CONFIG.elements).forEach(([k,sel])=>{
      dom[k] = document.querySelector(sel);   // 可能为 null，后面做保护
    });
  };

  /* ======= 数据加载 / 保存 ======= */
  const loadData = () => {
    try{
      const saved = JSON.parse(localStorage.getItem(CONFIG.storageKey) || '{}');
      // 合并材料
      const mats={};
      GAME_DATA.materials.forEach(m=>mats[m.id]=saved.materials?.[m.id]||false);
      // 合并历练
      const mergeTraining = cat =>
        (saved.training?.[cat]||[]).map((it,i)=>({
          completed   : it.completed||0,
          required    : it.userModified?it.required:GAME_DATA.training[cat][i].required,
          userModified: !!it.userModified
        }));
      state = {
        ...state,
        ...saved,
        materials:mats,
        training:{
          yinYang   : mergeTraining('yinYang'),
          windFire  : mergeTraining('windFire'),
          earthWater: mergeTraining('earthWater')
        }
      };
    }catch(e){ console.warn('无本地存储，使用默认'); }
  };

  const save = () => {
    state.lastUpdated = new Date().toISOString();
    localStorage.setItem(CONFIG.storageKey,JSON.stringify(state));
  };

  /* ======================================================
     渲染函数（省略不动你的原代码，只贴改动的块）
  ====================================================== */

  /** 渲染所有历练并挂上“一键撤销”按钮 */
  const renderTraining = () => {
    ['yinYang','windFire','earthWater'].forEach(cat=>{
      renderTrainingCategory(cat,dom[`${cat}Training`]);
    });
    renderAttributeStatus();
    addCategoryResetButtons();            // ★放这里即可，多次调用安全
  };

  /* ======================================================
     事件监听（加 null 保护）
  ====================================================== */
  const setupEventListeners = () =>{
    /* money checkbox */
    dom.moneyCheck?.addEventListener('change',()=>{
      state.moneyChecked = dom.moneyCheck.checked;
      updateAndSave();
    });
    /* 兵书数量 */
    dom.fragments?.addEventListener('input',()=>{
      state.fragments = +dom.fragments.value||0;
      updateAndSave();
    });
    dom.scrolls?.addEventListener('input',()=>{
      state.scrolls = +dom.scrolls.value||0;
      updateAndSave();
    });
    /* 全局委托：核销/撤销/材料勾选/目标勾选……（保持你原来的实现） */
    document.removeEventListener('click',globalClickHandler);
    document.addEventListener('click',globalClickHandler);
  };

  /* ======================================================
     ★ 新增：一键撤销按钮 & 修为预设
  ====================================================== */
  /* 将按钮 append 到每个 .training-category-title 右侧 */
  function addCategoryResetButtons(){
    document.querySelectorAll('.training-category').forEach(cat=>{
      const title = cat.querySelector('.training-category-title');
      if(!title||title.querySelector('.btn-reset')) return;
      const btn=document.createElement('button');
      btn.textContent='一键撤销';
      btn.className='btn-reset';
      btn.onclick=()=>{
        const key = cat.id.replace('Training','');  // yinYang / windFire / earthWater
        state.training[key].forEach(t=>t.completed=0);
        renderTrainingCategory(key,cat);
        renderAttributeStatus();
        save();
      };
      title.appendChild(btn);
    });
  }

  /* 下拉追加 13/15/17 */
  function addExtraTierOptions(){
    document.querySelectorAll('select[target-tier]').forEach(sel=>{
      [13,15,17].forEach(v=>{
        if([...sel.options].every(o=>+o.value!==v)){
          const opt=document.createElement('option');
          opt.value=v; opt.textContent=v; sel.appendChild(opt);
        }
      });
    });
  }

  /* 圈数预设 */
  const presetRuns = {
    13:{4:6,6:12,8:24,10:16,12:1},
    15:{4:6,6:12,8:24,10:35,12:12},
    17:{4:6,6:12,8:24,10:35,12:47}
  };
  function applyPreset(tier){
    const preset=presetRuns[tier]; if(!preset) return;
    ['yinYang','windFire','earthWater'].forEach(cat=>{
      [4,6,8,10,12].forEach((floor,idx)=>{
        state.training[cat][idx].required = preset[floor];
        state.training[cat][idx].userModified = true;
      });
      renderTrainingCategory(cat,dom[`${cat}Training`]);
    });
    renderAttributeStatus();
    save();
  }

  /* 页面完全加载后再挂辅助功能，保证容器已渲染 */
  window.addEventListener('DOMContentLoaded',()=>{
    addExtraTierOptions();
    const sel=document.querySelector('.tier-select');
    if(sel){
      sel.addEventListener('change',()=>applyPreset(+sel.value));
      applyPreset(+sel.value);      // 首次执行
    }
  });

  /* ====================================================== */
  /* 其余原有函数保持不动 —— 这里只保留修改 / 新增的部分 */
  /* ====================================================== */

  /* 对外暴露 */
  return { init };
})();

/* ---------------- 启动 ---------------- */
document.addEventListener('DOMContentLoaded',()=>ResourceTracker.init());
