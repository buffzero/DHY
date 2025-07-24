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
            classStatus: '#classStatus',
            attributeStatus: '#attributeStatus',
            materialsList: '#materials-list',
            
            // 金钱和经验
            moneyCheck: '#money-check',
            fragments: '#bingshu_canjuan',
            scrolls: '#bingshu_quanjuan',
            expStatus: '#exp-status',
            
            // 历练
            yinYangTraining: '#yinYangTraining',
            windFireTraining: '#windFireTraining',
            earthWaterTraining: '#earthWaterTraining',
            
            // 系统控制
            lastUpdated: '#lastUpdated',
            resetButton: '#resetButton'
        },
        storageKey: 'DHY-Upgrade-Assistant_v1',
        requiredExp: 2386300 // 所需总经验值
    };

    // ==================== 游戏数据 ====================
    const GAME_DATA = {
        // 职业列表
        classes: ['诡道', '神纪', '岐黄', '龙盾', '破军'],
        
        // 属性列表
        attributes: ['阴', '阳', '风', '火', '地', '水'],
        
        // 所有材料数据
        materials: [
            // 80级突破材料
            { id: 'fujunhaitang', name: '【府君海棠】*30', class: '诡道', level: 'gold' },
            { id: 'panlonggu', name: '【蟠龙鼓】*30', class: '神纪', level: 'gold' },
            { id: 'yinwendao', name: '【银纹刀】*30', class: '岐黄', level: 'gold' },
            { id: 'yuguidun', name: '【玉龟盾】*30', class: '龙盾', level: 'gold' },
            { id: 'xijiaogong', name: '【犀角弓】*30', class: '破军', level: 'gold' },
            
            // 70级突破材料
            { id: 'menghunlan', name: '【梦魂兰】*30', class: '诡道', level: 'purple' },
            { id: 'zhentiangu', name: '【震天鼓】*30', class: '神纪', level: 'purple' },
            { id: 'qingtongdao', name: '【青铜刀】*30', class: '岐黄', level: 'purple' },
            { id: 'caiwendun', name: '【彩纹盾】*30', class: '龙盾', level: 'purple' },
            { id: 'tietaigong', name: '【铁胎弓】*30', class: '破军', level: 'purple' },
            
            // 通用升级材料
            { id: 'zuigucao', name: '【醉骨草】*30', class: '通用', level: 'purple' },
            { id: 'qingtingyan', name: '【蜻蜓眼】*120', class: '通用', level: 'blue' },
            { id: 'ziyunying', name: '【紫云英】*160', class: '通用', level: 'blue' },
            { id: 'yingqiongyao', name: '【瑛琼瑶】*105', class: '通用', level: 'blue' },
            { id: 'jincuodao', name: '【金错刀】*80', class: '通用', level: 'blue' },
            { id: 'diguanghe', name: '【低光荷】*100', class: '通用', level: 'blue' },
            { id: 'yuanyu', name: '【鸢羽】*40', class: '通用', level: 'blue' },
            { id: 'jianjia', name: '【蒹葭】*494', class: '通用', level: 'blue' },
        ],
        
        // 历练配置
        training: {
            windFire: [
                { name: '【历练·四】', required: 6, editable: true },
                { name: '【历练·六】', required: 12, editable: true },
                { name: '【历练·八】', required: 24, editable: true },
                { name: '【历练·十】', required: 35, editable: true },
                { name: '【历练·十二】', required: 47, editable: true }
            ],
            earthWater: [
                { name: '【历练·四】', required: 6, editable: true },
                { name: '【历练·六】', required: 12, editable: true },
                { name: '【历练·八】', required: 24, editable: true },
                { name: '【历练·十】', required: 35, editable: true },
                { name: '【历练·十二】', required: 47, editable: true }
            ],
            yinYang: [
                { name: '【历练·四】', required: 6, editable: true },
                { name: '【历练·六】', required: 12, editable: true },
                { name: '【历练·八】', required: 24, editable: true },
                { name: '【历练·十】', required: 35, editable: true },
                { name: '【历练·十二】', required: 47, editable: true }
            ],
        }
    };

    // ==================== 状态管理 ====================
    let state = {
        // 基础状态
        moneyChecked: false,
        fragments: 0,
        scrolls: 0,
        // 材料收集状态
        materials: {},
        // 历练进度
        training: {
            yinYang: Array(5).fill().map(() => ({ completed: 0, required: 6, userModified: false })),
            windFire: Array(5).fill().map(() => ({ completed: 0, required: 6, userModified: false })),
            earthWater: Array(5).fill().map(() => ({ completed: 0, required: 6, userModified: false }))
        },
        targetSelection: {
            classes: {
                guidao: false,
                shenji: false,
                qihuang: false,
                longdun: false,
                pojun: false
            },
            attributes: {
                yin: false,
                yang: false,
                feng: false,
                huo: false,
                di: false,
                shui: false
            }
        },
        trainingHistory: [], // 核销操作历史记录
        lastUpdated: null
    };
    const dom = {}; // 缓存DOM元素

    // ==================== 核心函数 ====================

    /**
     * 初始化应用
     * 1. 设置DOM引用
     * 2. 加载保存数据
     * 3. 渲染界面
     * 4. 绑定事件
     */
    const init = () => {
        console.log('🚀 密探资源系统启动...');
        try {
            setupDOM();
            loadData();
            renderAll();
            setupEventListeners();
            console.log('✅ 初始化完成');
        } catch (error) {
            console.error('初始化过程中出错:', error);
            alert('系统初始化失败，请刷新页面重试');
        }
    };

    const setupDOM = () => {
        dom.container = document.querySelector(CONFIG.containerId);
        Object.entries(CONFIG.elements).forEach(([key, selector]) => {
            dom[key] = document.querySelector(selector);
        });
    };

    const loadData = () => {
        try {
            const saved = localStorage.getItem(CONFIG.storageKey);
            if (saved) {
                const parsed = JSON.parse(saved);
                
                // 初始化材料状态
                const materials = {};
                GAME_DATA.materials.forEach(material => {
                    materials[material.id] = parsed.materials?.[material.id] || false;
                });
                
                // 合并状态
                state = {
                    ...resetState(),
                    ...parsed,
                    materials,
                    targetSelection: parsed.targetSelection || resetState().targetSelection,
                    trainingHistory: parsed.trainingHistory || []
                };

                // 确保历练状态正确加载
                ['yinYang', 'windFire', 'earthWater'].forEach(category => {
                    if (parsed.training?.[category]) {
                        state.training[category] = parsed.training[category].map((item, i) => ({
                            completed: item.completed || 0,
                            required: item.required >= 0 ? item.required : GAME_DATA.training[category][i].required,
                            userModified: item.userModified || false
                        }));
                    }
                });
            }
            updateLastUpdated();
        } catch (e) {
            console.error('数据加载失败:', e);
            state = resetState();
        }
    };
    

    // ==================== 渲染函数 ====================

    // 渲染整个界面
    const renderAll = () => {
        const expStatus = calculateExpStatus();
        const baseConditionsMet = checkBaseConditions(expStatus);
        
        updateBasicUI(expStatus);
        renderTargetSelection();
        renderClassStatus(baseConditionsMet);
        renderMaterials();
        renderTraining();
    };

    // 更新基础UI元素
    const updateBasicUI = (expStatus) => {
        dom.expStatus.textContent = expStatus.text;
        dom.expStatus.className = expStatus.className;
        dom.moneyCheck.checked = state.moneyChecked;
        dom.fragments.value = state.fragments;
        dom.scrolls.value = state.scrolls;
    };


    // 目标密探元素
    const renderTargetSelection = () => {
        const targetSection = document.querySelector('.target-section');
        if (!targetSection) {
            console.error('目标密探区域未找到');
            return;
        }
        
        // 更新所有复选框状态
        const checkboxes = targetSection.querySelectorAll('input[type="checkbox"]');
        checkboxes.forEach(checkbox => {
            const type = checkbox.dataset.type;
            const value = checkbox.dataset.value;
            checkbox.checked = type === 'class' 
                ? state.targetSelection.classes[value] 
                : state.targetSelection.attributes[value];
        });
    };
    
    // 渲染职业状态
    const renderClassStatus = (baseConditionsMet) => {
        dom.classStatus.innerHTML = GAME_DATA.classes.map(className => {
          const isReady = checkClassReady(className, baseConditionsMet);
          const classKey = getClassKey(className);
          return `
            <div class="status-item ${classKey}">
              <span>${className}</span>
              <span class="status-indicator ${isReady ? 'ready' : 'pending'}">
                ${isReady ? '可满级' : '待沉淀'}
              </span>
            </div>
          `;
        }).join('');
    };
    
    // 渲染属性状态
    const renderAttributeStatus = () => {
        // 预计算各历练类型的完成状态
        const isYinYangReady = checkTrainingComplete('yinYang');
        const isWindFireReady = checkTrainingComplete('windFire');
        const isEarthWaterReady = checkTrainingComplete('earthWater');
    
        dom.attributeStatus.innerHTML = GAME_DATA.attributes.map(attr => {
            // 确定每个属性对应的历练类型和完成状态
            let isReady;
            let attrClass;
            
            switch(attr) {
                case '阴':
                case '阳':
                    isReady = isYinYangReady;
                    attrClass = attr === '阴' ? 'yin' : 'yang';
                    break;
                case '风':
                case '火':
                    isReady = isWindFireReady;
                    attrClass = attr === '风' ? 'feng' : 'huo';
                    break;
                case '地':
                case '水':
                    isReady = isEarthWaterReady;
                    attrClass = attr === '地' ? 'di' : 'shui';
                    break;
                default:
                    isReady = false;
                    attrClass = '';
            }
    
            return `
                <div class="status-item ${attrClass}">
                    <span>${attr}</span>
                    <span class="status-indicator ${isReady ? 'ready' : 'pending'}">
                        ${isReady ? '可满级' : '待沉淀'}
                    </span>
                </div>
            `;
        }).join('');
    };
   
    // 渲染材料列表
    const renderMaterials = () => {
        dom.materialsList.innerHTML = GAME_DATA.materials.map(material => {
            const checked = state.materials[material.id] ? 'checked' : '';
            return `
                <div class="resource-item ${material.level || 'blue'}">
                    <div class="resource-name">${material.name}</div>
                    <div class="checkbox-container">
                        <input type="checkbox" id="${material.id}-check" ${checked}>
                        <label for="${material.id}-check" class="material-checkbox"></label>
                    </div>
                </div>
            `;
        }).join('');
    };


    // 渲染所有历练类别
    const renderTraining = () => {
        renderTrainingCategory('yinYang', dom.yinYangTraining);
        renderTrainingCategory('windFire', dom.windFireTraining);
        renderTrainingCategory('earthWater', dom.earthWaterTraining);
        renderAttributeStatus();
    };

    // 渲染单个历练类别
    const renderTrainingCategory = (category, container) => {
        // 保存当前编辑状态
        const activeInput = document.activeElement;
        const isEditing = activeInput?.classList?.contains('training-count-input') && 
                        activeInput.dataset.category === category;
        const editData = isEditing ? {
            index: parseInt(activeInput.dataset.index),
            value: activeInput.value,
            cursorPos: activeInput.selectionStart
        } : null;

        // 主要渲染逻辑
        container.innerHTML = GAME_DATA.training[category].map((item, index) => {
            const trainingItem = state.training[category][index] || { completed: 0 };
            
            const required = trainingItem.userModified ? 
                trainingItem.required : 
                item.required;
            const completed = trainingItem.completed || 0;
            const isMet = required === 0 || completed >= required;
            const remaining = required - completed;
            return `
                <div class="training-item">
                    <div class="training-header">
                        <div class="training-name">${item.name}</div>
                        <div class="training-input-status">
                            <input type="text"
                                inputmode="numeric"
                                class="training-count-input" 
                                data-category="${category}" 
                                data-index="${index}"
                                value="${required}">
                            <div class="sub-status-indicator ${isMet ? 'met' : 'not-met'}">
                                ${isMet ? '已满足' : `${completed}/${required}`}
                            </div>
                        </div>
                    </div>
                    ${required > 0 ? renderCircles(required, completed) : ''}
                    <div class="training-actions">
                        <button class="consume-btn" 
                            data-category="${category}" 
                            data-index="${index}" 
                            data-count="1"
                            ${isMet ? 'disabled' : ''}>
                            核销一次
                        </button>
                        <button class="consume-btn" 
                            data-category="${category}" 
                            data-index="${index}" 
                            data-count="3"
                            ${isMet || remaining < 3 ? 'disabled' : ''}>
                            核销三次
                        </button>
                        <button class="consume-btn" 
                            data-category="${category}" 
                            data-index="${index}" 
                            data-count="6"
                            ${isMet || remaining < 6 ? 'disabled' : ''}>
                            核销六次
                        </button>
                        <button class="undo-btn" 
                            data-category="${category}" 
                            data-index="${index}"
                            ${completed <= 0 ? 'disabled' : ''}>
                            撤销
                        </button>
                    </div>
                </div>
            `;
        }).join('');

        // 恢复编辑状态
        if (editData) {
            const input = container.querySelector(
                `.training-count-input[data-index="${editData.index}"]`
            );
            if (input) {
                input.value = editData.value;
                input.focus();
                if (input.value.length > 0) {
                    try {
                        input.setSelectionRange(editData.cursorPos, editData.cursorPos);
                    } catch (e) {
                        console.log('光标设置跳过:', e);
                    }
                }
            }
        }
    };
    
    // 渲染圆圈进度 (自适应宽度布局)
    const renderCircles = (required, completed) => {
        if (required <= 0) return '';
        
        let circlesHTML = '';
        for (let i = 0; i < required; i++) {
            circlesHTML += `<div class="circle ${i < completed ? 'filled' : ''}"></div>`;
        }
        return `
            <div class="circles-container">
                ${circlesHTML}
            </div>
        `;
    };

    // ==================== 状态计算 ====================

    // 计算经验值状态
    const calculateExpStatus = () => {
        const currentExp = state.fragments * 100 + state.scrolls * 1000;
        const isMet = currentExp >= CONFIG.requiredExp;
        return {
            isMet,
            text: isMet ? '已满足' : '未满足',
            className: `sub-status-indicator ${isMet ? 'met' : 'not-met'}`
        };
    };
    

    // 检查通用升级材料是否满足
    const checkBaseConditions = (expStatus) => {
        const generalMaterials = GAME_DATA.materials.filter(m => m.class === '通用');
        const allGeneralMet = generalMaterials.every(m => state.materials[m.id]);
        return state.moneyChecked && expStatus.isMet && allGeneralMet;
    };

    // 检查职业升级材料是否满足
    const checkClassReady = (className, baseConditionsMet) => {
        const classMaterials = GAME_DATA.materials.filter(m => m.class === className);
        return baseConditionsMet && classMaterials.every(m => state.materials[m.id]);
    };

    // 检查历练是否全部完成
    const checkTrainingComplete = (category) => {
        return state.training[category].every((item, i) => 
            item.completed >= (item.userModified ? item.required : GAME_DATA.training[category][i].required)
        );
    };

    // ==================== 操作处理 ====================

    // 处理核销操作
    const handleConsume = (category, index, count) => {
        const trainingItem = state.training[category][index] || { completed: 0 };
        const required = trainingItem.required || 0;
        const completed = trainingItem.completed || 0;
        const remaining = required - completed;
        
        const actualCount = Math.min(count, remaining);
        if (actualCount <= 0) return;
        
        // 记录操作历史
        state.trainingHistory.push({
            category,
            index,
            previousCount: completed,
            count: actualCount,
            timestamp: new Date().toISOString()
        });
        
        // 更新状态
        state.training[category][index].completed = completed + actualCount;
        updateAndSave();
    };
    
    // 处理撤销操作
    const handleUndo = (category, index) => {
        const trainingItem = state.training[category][index];
        if (!trainingItem || trainingItem.completed <= 0) return;
        
        // 找到最近一次操作
        const lastActionIndex = [...state.trainingHistory]
            .reverse()
            .findIndex(a => a.category === category && a.index === index);
        
        if (lastActionIndex !== -1) {
            const actualIndex = state.trainingHistory.length - 1 - lastActionIndex;
            const lastAction = state.trainingHistory[actualIndex];
            
            trainingItem.completed = lastAction.previousCount;
            state.trainingHistory.splice(actualIndex, 1);
            updateAndSave();
        }
    };

    // ==================== 事件处理 ====================

    // 设置事件监听器
    const setupEventListeners = () => {
        // 目标选择变化监听
        document.addEventListener('change', (e) => {
            if (e.target.matches('.target-section input[type="checkbox"]')) {
                const checkbox = e.target;
                const type = checkbox.dataset.type;
                const value = checkbox.dataset.value;
                
                if (type === 'class') {
                    state.targetSelection.classes[value] = checkbox.checked;
                } else if (type === 'attribute') {
                    state.targetSelection.attributes[value] = checkbox.checked;
                }
                
                updateAndSave();
            }
        });

        // 金钱复选框
        dom.moneyCheck.addEventListener('change', () => {
            state.moneyChecked = dom.moneyCheck.checked;
            updateAndSave();
        });
        
        // 兵书数量输入
        dom.fragments.addEventListener('input', () => {
            state.fragments = parseInt(dom.fragments.value) || 0;
            updateAndSave();
        });
        
        dom.scrolls.addEventListener('input', () => {
            state.scrolls = parseInt(dom.scrolls.value) || 0;
            updateAndSave();
        });
        
        // 材料复选框
        dom.materialsList.addEventListener('change', (e) => {
            if (e.target.type === 'checkbox') {
                const materialId = e.target.id.replace('-check', '');
                state.materials[materialId] = e.target.checked;
                updateAndSave();
            }
        });

        // 历练次数
        document.addEventListener('input', (e) => {
            if (e.target.classList.contains('training-count-input')) {
                const input = e.target;
                const category = input.dataset.category;
                const index = parseInt(input.dataset.index);
                
                // 过滤非数字字符
                input.value = input.value.replace(/[^0-9]/g, '');
                
                // 更新状态（允许0值）
                const newValue = parseInt(input.value) || 0;
                state.training[category][index].required = newValue;
                state.training[category][index].userModified = true;
                
                // 即时渲染
                renderTrainingCategory(category, document.getElementById(`${category}Training`));
                
                // 延迟保存
                clearTimeout(input.saveTimeout);
                input.saveTimeout = setTimeout(() => {
                    updateAndSave();
                }, 500);
            }
        });

        // 核销按钮
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('consume-btn')) {
                const btn = e.target;
                handleConsume(
                    btn.dataset.category,
                    parseInt(btn.dataset.index),
                    parseInt(btn.dataset.count) || 1
                );
                e.stopPropagation();
            }
            
            // 撤销按钮
            if (e.target.classList.contains('undo-btn')) {
                const btn = e.target;
                const category = btn.dataset.category;
                const index = parseInt(btn.dataset.index);
                handleUndo(category, index);
                e.stopPropagation();
            }
        });

        // 重置按钮
        dom.resetButton.addEventListener('click', () => {
            if (confirm('确定要清空所有记录吗？')) {
                state = resetState();
                updateAndSave();
            }
        });
    };

    // ==================== 工具函数 ====================

    // 更新并保存数据
    const updateAndSave = () => {
        state.lastUpdated = new Date().toISOString();
        saveData();
        renderAll();
    };

    // 更新时间戳显示
    const updateLastUpdated = () => {
        if (state.lastUpdated && dom.lastUpdated) {
            const date = new Date(state.lastUpdated);
            dom.lastUpdated.textContent = `最近更新：${formatDate(date)}`;
        }
    };

    // 格式化日期显示
    const formatDate = (date) => {
        return date.toLocaleString('zh-CN', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            hour12: false
        }).replace(/\//g, '-');
    };

    // 保存数据到本地存储
    const saveData = () => {
        try {
            localStorage.setItem(CONFIG.storageKey, JSON.stringify(state));
        } catch (e) {
            console.error('保存数据失败:', e);
        }
    };

    // 重置初始化状态
    const resetState = () => {
        // 初始化材料状态
        const materials = {};
        GAME_DATA.materials.forEach(material => {
            materials[material.id] = false;
        });
        
        // 初始化历练状态
        const initTraining = (category) => 
            GAME_DATA.training[category].map(item => ({
                completed: 0,
                required: item.required,
                userModified: false
            }));

        return {
            moneyChecked: false,
            fragments: 0,
            scrolls: 0,
            materials,
            training: {
                yinYang: initTraining('yinYang'),
                windFire: initTraining('windFire'),
                earthWater: initTraining('earthWater')
            },
            targetSelection: {
                classes: {
                    guidao: false,
                    shenji: false,
                    qihuang: false,
                    longdun: false,
                    pojun: false
                },
                attributes: {
                    yin: false,
                    yang: false,
                    feng: false,
                    huo: false,
                    di: false,
                    shui: false
                }
            },
            trainingHistory: [],
            lastUpdated: new Date().toISOString()
        };
    };

    // 初始化职业状态
    const getClassKey = (className) => {
        const map = {
            '诡道': 'guidao',
            '神纪': 'shenji',
            '岐黄': 'qihuang',
            '龙盾': 'longdun',
            '破军': 'pojun'
        };
        return map[className] || '';
    };

    // ==================== 公共接口 ====================
    return { init };

/* === Added by helper: per-category reset button & tier options === */
function addCategoryResetButtons(){ 
  document.querySelectorAll('.training-category').forEach(cat=>{
    const title=cat.querySelector('.training-category-title');
    if(!title)return;
    // avoid duplicate
    if(title.querySelector('.btn-reset')) return;
    const btn=document.createElement('button');
    btn.textContent='一键撤销';
    btn.className='btn-reset';
    btn.style.marginLeft='8px';
    btn.onclick=()=>{
      // loop through undo buttons until all counts cleared
      cat.querySelectorAll('.undo-btn:not(:disabled)').forEach(b=>b.click());
    };
    title.appendChild(btn);
  });
}
// append extra tier options if select exists
function addExtraTierOptions(){
  document.querySelectorAll('select[target-tier]').forEach(sel=>{
    [13,15,17].forEach(v=>{
      if(![...sel.options].some(o=>parseInt(o.value)===v)){
        const opt=document.createElement('option');opt.value=v;opt.textContent=v;
        sel.appendChild(opt);
      }
    });
  });
}
document.addEventListener('DOMContentLoaded',()=>{ 
  addCategoryResetButtons(); 
  addExtraTierOptions();
});
/* === helper end === */

/* === helper: preset runs for tier 13/15/17 === */
const presetRuns = {
  13:{4:6,6:12,8:24,10:16,12:1},
  15:{4:6,6:12,8:24,10:35,12:12},
  17:{4:6,6:12,8:24,10:35,12:47}
};
// add event listeners to tier selects
document.querySelectorAll('.tier-select').forEach(sel=>{
  sel.addEventListener('change',()=>{
    const tier=parseInt(sel.value);
    const path=sel.closest('.path-wrapper')?.dataset.path;
    if(presetRuns[tier] && path){
      Object.entries(presetRuns[tier]).forEach(([floor,count])=>{
        const inp=document.querySelector(`input[data-path="${path}"][data-floor="${floor}"]`);
        if(inp){
          inp.value=count;
          inp.dispatchEvent(new Event('input'));
        }
      });
    }
  });
});
/* === helper end === */
})();

// 页面初始化
document.addEventListener('DOMContentLoaded', () => {
    if (!('localStorage' in window)) {
        alert('您的浏览器不支持本地存储功能，部分功能将无法使用');
        return;
    }
    try {
        ResourceTracker.init();
    } catch (error) {
        console.error('初始化失败:', error);
        alert('系统初始化失败，请刷新页面重试');
        setTimeout(() => location.reload(), 20000);
    }
});

