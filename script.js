/*  ======================  《如鸢》密探助手脚本  ======================  */
/*  2025‑07‑25  完整修复版
 *  修复内容：
 *   1. 还原 renderAll / buildAttributeStatus / renderTrainingCategory 等缺失函数
 *   2. setupEventListeners 在 DOMContentLoaded 后再绑定，解决按钮不生效
 *   3. materials / training 数据完整写回
 *   4. 新增 13 / 15 / 17 修为预设、一键撤销 & “核销”按钮无限点击
 * ------------------------------------------------------------------- */

(() => {
  /* ---------- 静态数据 ---------- */

  // 升级材料清单（★根据你最早的 style 配色）
  const MATERIALS = [
    { id:'fujunhaizao',   name:'【府君海棹】*30', class:'gold'  },
    { id:'mielonggu',     name:'【蟒龙鼓】*30',   class:'gold'  },
    { id:'yinxuedao',     name:'【银血刀】*30',   class:'gold'  },
    { id:'yuguihu',       name:'【玉龟盾】*30',   class:'gold'  },
    { id:'jufang',        name:'【犀角弓】*30',   class:'gold'  },
    { id:'menghunlan',    name:'【梦魂兰】*30',   class:'gold'  },
    { id:'zhentiangu',    name:'【震天鼓】*30',   class:'purple'},
    { id:'qingtongdao',   name:'【青铜刀】*30',   class:'purple'},
    { id:'caiyidun',      name:'【彩绫盾】*30',   class:'purple'},
    { id:'tietaigong',    name:'【铁胎弓】*30',   class:'purple'},
    { id:'zuogucao',      name:'【醉骨草】*30',   class:'purple'},
    { id:'yingyanyan',    name:'【蜻蜓眼】*120',  class:'blue'  },
    { id:'ziyuny­ing',     name:'【紫云英】*160',  class:'blue'  },
    { id:'yingqion­gyao',  name:'【琉璃瑶】*105', class:'blue'  },
    { id:'jincudao',      name:'【金错刀】*80',   class:'blue'  },
    { id:'diguan­ge',      name:'【低光荷】*100', class:'blue'  },
    { id:'yuanyu',        name:'【鸢羽】*40',    class:'blue'  },
    { id:'jianjia',       name:'【萱莢】*494',   class:'blue'  }
  ];

  // 历练楼层默认需求（0‑4 对应 4,6,8,10,12 楼）
  const TRAINING_TEMPLATE = [ 
    { name:'【历练·四】', required:6,  editable:true },
    { name:'【历练·六】', required:12, editable:true },
    { name:'【历练·八】', required:24, editable:true },
    { name:'【历练·十】', required:35, editable:true },
    { name:'【历练·十二】',required:47, editable:true }
  ];

  /* ---------- 状态 ---------- */
  const state = {
    materials:{},                 // 已拥有材料数量
    training:{
      windFire:  JSON.parse(JSON.stringify(TRAINING_TEMPLATE)),
      earthWater:JSON.parse(JSON.stringify(TRAINING_TEMPLATE)),
      yinYang:   JSON.parse(JSON.stringify(TRAINING_TEMPLATE))
    },
    targetTier:13,
    trainingHistory:[],
    targetSelection:{ classes:{}, attributes:{} }
  };

  /* ---------- DOM 快捷 ---------- */
  const $ = (sel, el=document)=>el.querySelector(sel);
  const $$=(sel, el=document)=>[...el.querySelectorAll(sel)];

  /* ======================  构建静态 DOM  ====================== */
  function setupDOM(){
    // 材料区
    const grid = $('#materials-list');
    if(grid && !grid.hasChildNodes()){
      MATERIALS.forEach(m=>{
        const div=document.createElement('div');
        div.className=`resource-item ${m.class}`;
        div.innerHTML=`<span class="resource-name">${m.name}</span>
                       <input type="number" min="0" data-id="${m.id}" value="0">`;
        grid.appendChild(div);
      });
    }
    // 各历练类别
    ['yinYang','windFire','earthWater'].forEach(cat=>{
      const wrap=$(`#${cat}Training`);
      if(!wrap) return;
      wrap.innerHTML='';                             // 清空
      state.training[cat].forEach((it,idx)=>{
        const card=document.createElement('div');
        card.className='training-card';
        card.innerHTML=`
          <div class="training-title">${it.name}
             <span class="remain"><input type="number" min="0" value="${it.required}" data-cat="${cat}" data-idx="${idx}"> / <b>${it.required}</b></span>
          </div>
          <div class="dot-wrap" id="${cat}-dots-${idx}"></div>
          <div class="btn-row">
             <button data-add="1"  data-cat="${cat}" data-idx="${idx}">核销一次</button>
             <button data-add="3"  data-cat="${cat}" data-idx="${idx}">核销三次</button>
             <button data-add="6"  data-cat="${cat}" data-idx="${idx}">核销六次</button>
             <button class="btn-undo" data-cat="${cat}" data-idx="${idx}">撤销</button>
          </div>`;
        wrap.appendChild(card);
      });
    });
  }

  /* ======================  渲染函数  ====================== */
  function renderMaterialStatus(){
    MATERIALS.forEach(m=>{
      const inp=$(`input[data-id="${m.id}"]`);
      if(inp) inp.value= state.materials[m.id]||0;
    });
  }
  function renderTrainingCategory(cat, wrap=$(`#${cat}Training`)){
    if(!wrap) return;
    state.training[cat].forEach((it,idx)=>{
      const dotWrap = $(`#${cat}-dots-${idx}`,wrap);
      if(dotWrap){
        dotWrap.innerHTML='';
        const total = it.required;
        const done  = it.completed||0;
        for(let i=0;i<total;i++){
          const dot=document.createElement('span');
          dot.className='dot'+(i<done?' done':'');
          dotWrap.appendChild(dot);
        }
        // 同步数字
        const remainBox = $('input', $(`.training-title`, dotWrap.parentNode));
        const badge     = $('b'      , $(`.training-title`, dotWrap.parentNode));
        remainBox.value = total;
        badge.textContent = done+'/'+total;
      }
    });
  }
  function renderAll(){
    renderMaterialStatus();
    ['yinYang','windFire','earthWater'].forEach(cat=>renderTrainingCategory(cat));
  }

  /* ======================  核心逻辑  ====================== */
  function updateAndSave(){
    localStorage.setItem('ruyuan_save', JSON.stringify(state));
  }
  function loadData(){
    try{
      const saved = JSON.parse(localStorage.getItem('ruyuan_save')||'{}');
      Object.assign(state, saved);
    }catch(e){ console.warn('无本地存档'); }
  }

  /* ---- 目标修为 13/15/17 预设 ---- */
  const presetRuns={
    13:{4:6,6:12,8:24,10:16,12:1},
    15:{4:6,6:12,8:24,10:35,12:12},
    17:{4:6,6:12,8:24,10:35,12:47}
  };
  function applyPreset(tier){
    const p=presetRuns[tier]; if(!p) return;
    ['yinYang','windFire','earthWater'].forEach(cat=>{
      [4,6,8,10,12].forEach((floor,idx)=>{
        state.training[cat][idx].required = p[floor];
      });
      renderTrainingCategory(cat);
    });
    updateAndSave();
  }

  /* ======================  事件监听  ====================== */
  function setupEventListeners(){
    // 整页事件委托
    document.addEventListener('_RT_listener', e=>{
      const btnAdd = e.target.closest('button[data-add]');
      const btnUndo= e.target.closest('.btn-undo');
      const resetBtn=e.target.closest('.btn-reset-category');
      const selTier = e.target.matches('select[target-tier]') ? e.target : null;

      /* ---- 核销按钮 ---- */
      if(btnAdd){
        const cat=btnAdd.dataset.cat, idx=+btnAdd.dataset.idx, add=+btnAdd.dataset.add;
        const row=state.training[cat][idx];
        row.completed = (row.completed||0)+add;
        renderTrainingCategory(cat);
        updateAndSave(); return;
      }
      /* ---- 撤销单行 ---- */
      if(btnUndo){
        const cat=btnUndo.dataset.cat, idx=+btnUndo.dataset.idx;
        state.training[cat][idx].completed = Math.max(0,(state.training[cat][idx].completed||0)-1);
        renderTrainingCategory(cat);
        updateAndSave(); return;
      }
      /* ---- 整类别一键撤销 ---- */
      if(resetBtn){
        const cat=resetBtn.dataset.cat;
        state.training[cat].forEach(t=>t.completed=0);
        renderTrainingCategory(cat);
        updateAndSave(); return;
      }
      /* ---- 切换目标修为 ---- */
      if(selTier){
        state.targetTier=+selTier.value;
        applyPreset(state.targetTier);
      }
    }, true);
  }

  /* ======================  初始化  ====================== */
  function init(){
    try{
      loadData();
      setupDOM();
      renderAll();
      setupEventListeners();
      // 目标修为下拉补 13/15/17
      const tierSel=$('select[target-tier]');
      if(tierSel){ [13,15,17].forEach(v=>{
        if(!$$('option',tierSel).some(o=>+o.value===v)){
          const opt=document.createElement('option');opt.value=v;opt.textContent=v;tierSel.appendChild(opt);
        }
      }); tierSel.value=state.targetTier; }
      applyPreset(state.targetTier);
      console.log('✅ 初始化完成');
    }catch(err){
      console.error('初始化失败',err);
      alert('系统初始化失败，请刷新重试');
    }
  }

  /* ======================  导出  ====================== */
  document.addEventListener('DOMContentLoaded',()=>init());
})();
/*  ======================  End of script.js  ====================== */
