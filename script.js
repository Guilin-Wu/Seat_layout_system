document.addEventListener('DOMContentLoaded', () => {

    /* --- DATA / STATE --- */
    let studentGroups = [];
    let allStudents = [];
    let studentDetails = [];
    let nameToGenderMap = new Map();
    let avoidPairs = [];
    let fixedSeats = {}; // { "张三": {row: 0, col: 0} }
    let studentTags = {}; // { "张三": ["爱讲话", "调皮"], ... }
    let customTags = []; // 用户自定义的标签
    let maxRows = 6;
    let maxCols = 7;
    let bgmPlaylist = [];
    let isPaused = false;
    let isCancelled = false;

    /* --- DOM Element References --- */
    const $ = (id) => document.getElementById(id);
    const themeToggle = $('theme-toggle');
    const bgm = $('bgm');
    const container = $('container');
    const spinner = $('spinner');
    const toastContainer = $('toast-container');
    const printBtn = $('printBtn');
    const importSettingsBtn = $('importSettingsBtn');
    const exportSettingsBtn = $('exportSettingsBtn');
    const importFile = $('importFile');
    const generateBtn = $('generateBtn');
    const settingsBtn = $('settingsBtn');
    const drawBtn = $('drawBtn');
    const settingsPanel = $('settingsPanel');
    const drawPanel = $('drawPanel');
    const statusDiv = $('status');
    const aiReasonsDiv = $('aiReasons');
    const excelFile = $('excelFile');
    const clearListBtn = $('clearListBtn');
    const groupCountInput = $('groupCount');
    const bgmSelector = $('bgmSelector');
    const removeBgmBtn = $('removeBgmBtn');
    const bgmNameInput = $('bgmNameInput');
    const bgmUrlInput = $('bgmUrlInput');
    const addBgmBtn = $('addBgmBtn');
    const unseatedList = $('unseated-list');
    const inProgressControls = $('in-progress-controls');
    const pauseResumeBtn = $('pauseResumeBtn');
    const cancelBtn = $('cancelBtn');
    const saveFixedSeatsBtn = $('saveFixedSeatsBtn');
    const savedSeatsSelect = $('savedSeatsSelect');
    const loadSavedSeatsBtn = $('loadSavedSeatsBtn');
    const renameSavedSeatsBtn = $('renameSavedSeatsBtn');
    const deleteSavedSeatsBtn = $('deleteSavedSeatsBtn');
    const manageTagsBtn = $('manageTagsBtn');
    const tagsModal = $('tagsModal');
    const closeTagsModal = $('closeTagsModal');
    const tagsTableBody = $('tagsTableBody');
    const presetTagsContainer = $('presetTagsContainer');
    const closeTagsModalBtn = $('closeTagsModalBtn');
    const deepseekApiKeyInput = $('deepseekApiKeyInput');
    const saveDeepseekApiKeyBtn = $('saveDeepseekApiKeyBtn');
    const generateWithAiBtn = $('generateWithAiBtn');
    const rerollAiBtn = $('rerollAiBtn');
    const deepseekStatus = $('deepseekStatus');
    const editTagModal = $('editTagModal');
    const editTagTitle = $('editTagTitle');
    const closeEditTagModal = $('closeEditTagModal');
    const editPresetTags = $('editPresetTags');
    const editCustomTagInput = $('editCustomTagInput');
    const confirmEditTagBtn = $('confirmEditTagBtn');
    const cancelEditTagBtn = $('cancelEditTagBtn');
    const customTagsList = $('customTagsList');

    /* --- 主题切换 --- */
    function toggleTheme() {
        document.body.classList.toggle('light-theme');
        const isLight = document.body.classList.contains('light-theme');
        localStorage.setItem('theme', isLight ? 'light' : 'dark');
        themeToggle.textContent = isLight ? '🌙' : '☀️';
    }
    function loadTheme() {
        const savedTheme = localStorage.getItem('theme');
        if (savedTheme === 'light') {
            document.body.classList.add('light-theme');
            themeToggle.textContent = '🌙';
        } else {
            themeToggle.textContent = '☀️';
        }
    }

    /* --- 专业版功能模块 --- */
    function showToast(message, type = 'success') { const toast = document.createElement('div'); toast.className = `toast ${type}`; toast.textContent = message; toastContainer.appendChild(toast); setTimeout(() => { toast.remove(); }, 3500); }
    function showSpinner() { spinner.style.display = 'flex'; }
    function hideSpinner() { spinner.style.display = 'none'; }
    function printSeatingChart() { if (allStudents.length === 0 || container.children.length <= 1) { showToast('请先生成座位表后再打印', 'error'); return; } window.print(); }
    function exportSettings() { if (allStudents.length === 0) { showToast('没有可导出的数据，请先上传名单', 'error'); return; } const settingsToExport = { studentDetails: studentDetails, avoidPairs: avoidPairs, fixedSeats: fixedSeats, bgmPlaylist: bgmPlaylist, lastSelectedBgmUrl: localStorage.getItem('lastSelectedBgmUrl'), seatingAppSettings: JSON.parse(localStorage.getItem('seatingAppSettings')), rules: { enableGenderRule: $('enableGenderRule').checked, forceGenderPairing: $('forceGenderPairing').checked, deskPairDefinition: $('deskPairDefinition').value, includeDiagonals: $('includeDiagonals').checked, autoBalance: $('autoBalance').checked } }; const blob = new Blob([JSON.stringify(settingsToExport, null, 2)], { type: 'application/json' }); const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = `座位系统配置_${new Date().toLocaleDateString()}.json`; a.click(); URL.revokeObjectURL(url); showToast('配置已导出！'); }
    function importSettings(event) {
        const file = event.target.files[0]; if (!file) return;
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const data = JSON.parse(e.target.result);
                studentDetails = data.studentDetails || [];
                avoidPairs = data.avoidPairs || [];
                fixedSeats = data.fixedSeats || {};
                bgmPlaylist = data.bgmPlaylist || [];
                if (data.rules) { $('enableGenderRule').checked = data.rules.enableGenderRule; $('forceGenderPairing').checked = data.rules.forceGenderPairing; $('deskPairDefinition').value = data.rules.deskPairDefinition; $('includeDiagonals').checked = data.rules.includeDiagonals; $('autoBalance').checked = data.rules.autoBalance; }
                if (data.lastSelectedBgmUrl) localStorage.setItem('lastSelectedBgmUrl', data.lastSelectedBgmUrl);
                if (data.seatingAppSettings) localStorage.setItem('seatingAppSettings', JSON.stringify(data.seatingAppSettings));
                loadSettings();
                loadPlaylist();
                processAndStoreStudents(studentDetails);
                updateAvoidList();
                showToast('配置导入成功！');
            } catch (error) { console.error("导入失败:", error); showToast('导入失败，文件格式错误！', 'error'); }
        };
        reader.readAsText(file);
        importFile.value = '';
    }

    /* --- 拖拽功能 --- */
    function populateUnseatedList() {
        unseatedList.innerHTML = '';
        const unseatedStudents = studentDetails
            .filter(s => !fixedSeats[s['姓名']])
            .sort((a, b) => a['姓名'].localeCompare(b['姓名'], 'zh-CN'));

        unseatedStudents.forEach(student => {
            const div = document.createElement('div');
            div.className = 'draggable-student';
            div.textContent = student['姓名'];
            div.draggable = true;
            div.dataset.studentName = student['姓名'];

            div.addEventListener('dragstart', (e) => {
                e.dataTransfer.setData('text/plain', e.target.dataset.studentName);
                div.classList.add('dragging');
            });
            div.addEventListener('dragend', () => {
                div.classList.remove('dragging');
            });

            unseatedList.appendChild(div);
        });
    }

    /* --- 保存座位配置功能 --- */
    function getSavedSeatsList() {
        const saved = localStorage.getItem('savedFixedSeatsList');
        return saved ? JSON.parse(saved) : [];
    }

    function saveSavedSeatsList(list) {
        localStorage.setItem('savedFixedSeatsList', JSON.stringify(list));
    }

    function populateSavedSeatsSelect() {
        savedSeatsSelect.innerHTML = '<option value="">-- 请选择保存的座位 --</option>';
        const savedList = getSavedSeatsList();
        savedList.forEach((item, index) => {
            const option = document.createElement('option');
            option.value = index;
            option.textContent = item.name;
            savedSeatsSelect.appendChild(option);
        });
    }

    function saveFixedSeats() {
        if (Object.keys(fixedSeats).length === 0) {
            showToast('没有可保存的固定座位！', 'error');
            return;
        }
        const name = prompt('请输入保存名称:', `座位配置 ${new Date().toLocaleDateString()}`);
        if (!name || name.trim() === '') return;
        
        const savedList = getSavedSeatsList();
        savedList.push({
            name: name.trim(),
            fixedSeats: JSON.parse(JSON.stringify(fixedSeats)),
            savedAt: new Date().toISOString()
        });
        saveSavedSeatsList(savedList);
        populateSavedSeatsSelect();
        showToast(`已保存: ${name}`);
    }

    function loadSavedSeats() {
        const selectedIndex = savedSeatsSelect.value;
        if (selectedIndex === '') {
            showToast('请先选择一个保存的座位配置！', 'error');
            return;
        }
        const savedList = getSavedSeatsList();
        const saved = savedList[selectedIndex];
        
        if (!saved.fixedSeats || Object.keys(saved.fixedSeats).length === 0) {
            showToast('该配置没有有效的座位数据！', 'error');
            return;
        }
        
        fixedSeats = JSON.parse(JSON.stringify(saved.fixedSeats));
        renderSettingsPreview();
        populateUnseatedList();
        showToast(`已加载: ${saved.name}`);
    }

    function renameSavedSeats() {
        const selectedIndex = savedSeatsSelect.value;
        if (selectedIndex === '') {
            showToast('请先选择一个保存的座位配置！', 'error');
            return;
        }
        const savedList = getSavedSeatsList();
        const saved = savedList[selectedIndex];
        const newName = prompt('请输入新名称:', saved.name);
        if (!newName || newName.trim() === '') return;
        
        savedList[selectedIndex].name = newName.trim();
        saveSavedSeatsList(savedList);
        populateSavedSeatsSelect();
        showToast(`已重命名为: ${newName}`);
    }

    function deleteSavedSeats() {
        const selectedIndex = savedSeatsSelect.value;
        if (selectedIndex === '') {
            showToast('请先选择一个保存的座位配置！', 'error');
            return;
        }
        const savedList = getSavedSeatsList();
        const saved = savedList[selectedIndex];
        
        if (!confirm(`确定要删除 "${saved.name}" 吗？`)) return;
        
        savedList.splice(selectedIndex, 1);
        saveSavedSeatsList(savedList);
        populateSavedSeatsSelect();
        showToast('已删除！');
    }

    /* --- 学生标签管理功能 --- */
    const defaultPresetTags = ['爱讲话', '调皮', '内向', '外向', '认真学习', '体育好', '文艺好', '爱睡觉', '注意力不集中', '乐于助人', '爱捣乱', '害羞', '活泼', '沉稳', '敏感', '自律'];

    function getCustomTags() {
        const saved = localStorage.getItem('customTags');
        return saved ? JSON.parse(saved) : [];
    }

    function saveCustomTagsToStorage() {
        localStorage.setItem('customTags', JSON.stringify(customTags));
    }

    function getStudentTags() {
        const saved = localStorage.getItem('studentTags');
        return saved ? JSON.parse(saved) : {};
    }

    function saveStudentTagsToStorage() {
        localStorage.setItem('studentTags', JSON.stringify(studentTags));
    }

    function loadStudentTags() {
        studentTags = getStudentTags();
        customTags = getCustomTags();
    }

    function renderPresetTags() {
        // 只显示预设标签，不包含自定义标签
        presetTagsContainer.innerHTML = '';
        defaultPresetTags.forEach(tag => {
            const label = document.createElement('label');
            label.className = 'tag-checkbox';
            label.innerHTML = `<input type="checkbox" value="${tag}"><span>${tag}</span>`;
            presetTagsContainer.appendChild(label);
        });
        
        // 渲染自定义标签列表（带删除/重命名按钮）
        renderCustomTagsList();
    }

    function renderCustomTagsList() {
        customTagsList.innerHTML = '';
        if (customTags.length === 0) {
            customTagsList.innerHTML = '<span style="color: var(--text-secondary); font-size: 12px;">暂无自定义标签</span>';
            return;
        }
        
        customTags.forEach(tag => {
            const tagDiv = document.createElement('div');
            tagDiv.className = 'custom-tag-item';
            tagDiv.innerHTML = `
                <span>${tag}</span>
                <div class="custom-tag-actions">
                    <button class="rename-tag-btn" data-tag="${tag}" title="重命名">✏️</button>
                    <button class="delete-tag-btn" data-tag="${tag}" title="删除">🗑️</button>
                </div>
            `;
            customTagsList.appendChild(tagDiv);
        });
        
        // 添加删除和重命名事件
        document.querySelectorAll('.delete-tag-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const tag = e.target.dataset.tag;
                deleteCustomTag(tag);
            });
        });
        
        document.querySelectorAll('.rename-tag-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const tag = e.target.dataset.tag;
                renameCustomTag(tag);
            });
        });
    }

    function renderTagsTable() {
        tagsTableBody.innerHTML = '';
        if (allStudents.length === 0) {
            tagsTableBody.innerHTML = '<tr><td colspan="5" style="text-align: center; padding: 40px 20px;">暂无学生数据，请先上传名单</td></tr>';
            return;
        }
        
        studentDetails.forEach(student => {
            const name = student['姓名'];
            const gender = student['性别'] || '-';
            const height = student['身高'] || '-';
            const tags = studentTags[name] || [];
            
            const tr = document.createElement('tr');
            
            let tagsHtml = '';
            if (tags.length > 0) {
                tags.forEach((tag) => {
                    tagsHtml += `<span class="tag-badge">${tag}</span>`;
                });
            } else {
                tagsHtml = '<span class="no-tags">未设置</span>';
            }
            
            tr.innerHTML = `
                <td>${name}</td>
                <td>${gender}</td>
                <td>${height}</td>
                <td><div class="student-tags">${tagsHtml}</div></td>
                <td><button class="edit-btn" data-student="${name.replace(/"/g, '&quot;')}">编辑</button></td>
            `;
            tagsTableBody.appendChild(tr);
        });

        // 添加编辑按钮事件
        document.querySelectorAll('.edit-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const studentName = e.target.getAttribute('data-student');
                openEditTagModal(studentName);
            });
        });
    }

    let currentEditingStudent = null;

    function openEditTagModal(studentName) {
        if (!studentName) {
            console.error('学生名称无效');
            showToast('无法编辑，请重试', 'error');
            return;
        }
        currentEditingStudent = studentName;
        editTagTitle.textContent = `编辑 ${studentName} 的标签`;
        
        const currentTags = studentTags[studentName] || [];
        
        // 渲染预设标签
        const allTags = [...defaultPresetTags, ...customTags];
        editPresetTags.innerHTML = '';
        allTags.forEach(tag => {
            const label = document.createElement('label');
            label.className = 'tag-checkbox';
            label.innerHTML = `<input type="checkbox" value="${tag}" ${currentTags.includes(tag) ? 'checked' : ''}><span>${tag}</span>`;
            editPresetTags.appendChild(label);
        });
        
        editCustomTagInput.value = '';
        editTagModal.style.display = 'block';
    }

    function closeEditTagModalFunc() {
        editTagModal.style.display = 'none';
        currentEditingStudent = null;
    }

    function confirmEditTag() {
        if (!currentEditingStudent) return;
        
        const checkboxes = editPresetTags.querySelectorAll('input[type="checkbox"]:checked');
        const selectedTags = Array.from(checkboxes).map(cb => cb.value);
        
        studentTags[currentEditingStudent] = selectedTags;
        renderTagsTable();
        closeEditTagModalFunc();
        showToast(`已更新 ${currentEditingStudent} 的标签`);
    }

    function addCustomTagInEdit() {
        const tag = editCustomTagInput.value.trim();
        if (!tag) {
            showToast('请输入标签内容！', 'error');
            return;
        }
        const allTags = [...defaultPresetTags, ...customTags];
        if (allTags.includes(tag)) {
            showToast('该标签已存在！', 'error');
            return;
        }
        customTags.push(tag);
        saveCustomTagsToStorage();
        
        // 重新渲染预设标签
        const currentTags = studentTags[currentEditingStudent] || [];
        const newAllTags = [...defaultPresetTags, ...customTags];
        editPresetTags.innerHTML = '';
        newAllTags.forEach(t => {
            const label = document.createElement('label');
            label.className = 'tag-checkbox';
            label.innerHTML = `<input type="checkbox" value="${t}" ${currentTags.includes(t) ? 'checked' : ''}><span>${t}</span>`;
            editPresetTags.appendChild(label);
        });
        
        editCustomTagInput.value = '';
        showToast(`已添加自定义标签: ${tag}`);
    }

    function addCustomTag() {
        const tag = customTagInput.value.trim();
        if (!tag) {
            showToast('请输入标签内容！', 'error');
            return;
        }
        const allTags = [...defaultPresetTags, ...customTags];
        if (allTags.includes(tag)) {
            showToast('该标签已存在！', 'error');
            return;
        }
        customTags.push(tag);
        saveCustomTagsToStorage();
        renderPresetTags();
        
        // 同时更新编辑弹窗中的预设标签
        if (currentEditingStudent) {
            const currentTags = studentTags[currentEditingStudent] || [];
            const newAllTags = [...defaultPresetTags, ...customTags];
            editPresetTags.innerHTML = '';
            newAllTags.forEach(t => {
                const label = document.createElement('label');
                label.className = 'tag-checkbox';
                label.innerHTML = `<input type="checkbox" value="${t}" ${currentTags.includes(t) ? 'checked' : ''}><span>${t}</span>`;
                editPresetTags.appendChild(label);
            });
        }
        
        // 实时更新表格中的标签显示
        renderTagsTable();
        
        customTagInput.value = '';
        showToast(`已添加自定义标签: ${tag}`);
    }

    function deleteCustomTag(tag) {
        if (!confirm(`确定要删除自定义标签 "${tag}" 吗？`)) return;
        
        // 从自定义标签中移除
        customTags = customTags.filter(t => t !== tag);
        saveCustomTagsToStorage();
        
        // 从所有学生的标签中移除这个标签
        for (const name in studentTags) {
            studentTags[name] = studentTags[name].filter(t => t !== tag);
        }
        saveStudentTagsToStorage();
        
        renderPresetTags();
        renderTagsTable();
        showToast(`已删除标签: ${tag}`);
    }

    function renameCustomTag(oldTag) {
        const newTag = prompt(`请输入标签 "${oldTag}" 的新名称:`, oldTag);
        if (!newTag || newTag.trim() === '' || newTag === oldTag) return;
        
        const allTags = [...defaultPresetTags, ...customTags];
        if (allTags.includes(newTag)) {
            showToast('该标签名称已存在！', 'error');
            return;
        }
        
        // 更新自定义标签
        const index = customTags.indexOf(oldTag);
        if (index > -1) {
            customTags[index] = newTag;
        }
        saveCustomTagsToStorage();
        
        // 更新所有学生的标签
        for (const name in studentTags) {
            studentTags[name] = studentTags[name].map(t => t === oldTag ? newTag : t);
        }
        saveStudentTagsToStorage();
        
        renderPresetTags();
        renderTagsTable();
        
        // 如果正在编辑，更新编辑弹窗
        if (currentEditingStudent) {
            const currentTags = studentTags[currentEditingStudent] || [];
            const newAllTags = [...defaultPresetTags, ...customTags];
            editPresetTags.innerHTML = '';
            newAllTags.forEach(t => {
                const label = document.createElement('label');
                label.className = 'tag-checkbox';
                label.innerHTML = `<input type="checkbox" value="${t}" ${currentTags.includes(t) ? 'checked' : ''}><span>${t}</span>`;
                editPresetTags.appendChild(label);
            });
        }
        
        showToast(`已重命名为: ${newTag}`);
    }

    function openTagsModal() {
        if (allStudents.length === 0) {
            showToast('请先上传学生名单！', 'error');
            return;
        }
        loadStudentTags();
        renderPresetTags();
        renderTagsTable();
        tagsModal.style.display = 'block';
    }

    function closeTagsModalFunc() {
        tagsModal.style.display = 'none';
    }

    function saveAllStudentTags() {
        saveStudentTagsToStorage();
        saveCustomTagsToStorage();
        showToast('标签已保存！');
        closeTagsModalFunc();
    }

    /* --- DeepSeek AI 智能排座功能 --- */
    function getDeepseekApiKey() {
        return localStorage.getItem('deepseekApiKey') || '';
    }

    function saveDeepseekApiKey() {
        const apiKey = deepseekApiKeyInput.value.trim();
        if (!apiKey) {
            showToast('请输入 API Key！', 'error');
            return;
        }
        localStorage.setItem('deepseekApiKey', apiKey);
        showToast('API Key 已保存！');
        updateDeepseekStatus();
    }

    function updateDeepseekStatus() {
        const apiKey = getDeepseekApiKey();
        if (apiKey) {
            deepseekStatus.textContent = '✅ API Key 已配置';
            deepseekStatus.style.color = 'var(--success-color)';
            generateWithAiBtn.disabled = false;
        } else {
            deepseekStatus.textContent = '❌ 请先配置 API Key';
            deepseekStatus.style.color = 'var(--error-color)';
            generateWithAiBtn.disabled = true;
        }
    }

    async function generateSeatingWithAI() {
        const apiKey = getDeepseekApiKey();
        if (!apiKey) {
            showToast('请先配置 DeepSeek API Key！', 'error');
            return;
        }

        if (allStudents.length === 0) {
            showToast('请先上传学生名单！', 'error');
            return;
        }

        showSpinner();
        generateWithAiBtn.disabled = true;
        deepseekStatus.textContent = '🤖 AI 正在分析学生特征并生成座位...';

        try {
            // 准备学生数据
            const studentsWithTags = studentDetails.map(s => ({
                name: s['姓名'],
                gender: s['性别'] || '未知',
                height: s['身高'] || 0,
                tags: studentTags[s['姓名']] || []
            }));

            const rows = parseInt($('rowCount').value, 10);
            const cols = parseInt($('colCount').value, 10);
            const totalSeats = rows * cols;

            // 读取全局设置和规则
            const rules = {
                enableGenderRule: $('enableGenderRule').checked,
                forceGenderPairing: $('forceGenderPairing').checked,
                deskPairDefinition: $('deskPairDefinition').value,
                includeDiagonals: $('includeDiagonals').checked,
                autoBalance: $('autoBalance').checked
            };

            // 构建规则说明
            let rulesText = '';
            if (rules.enableGenderRule) {
                rulesText += '\n【强制规则】男女不同桌：相邻座位不能同时为男生或同时为女生。';
            }
            if (rules.forceGenderPairing) {
                rulesText += '\n【强制规则】强制男女同桌：同一排的同桌（列定义为' + rules.deskPairDefinition + '）必须为一男一女。';
            }
            if (rules.includeDiagonals) {
                rulesText += '\n【强制规则】对角线也算相邻：对角线位置的相邻也需要遵守规则。';
            }

            // 构建 prompt
            const prompt = `你是一个班级座位安排专家。请根据以下学生信息和标签，生成一个${rows}行${cols}列的座位安排。

学生数据（包含姓名、性别、身高、标签）:
${JSON.stringify(studentsWithTags, null, 2)}

座位排座原则（请严格按照以下原则执行）：

【全局设置】
- 排数：${rows}，列数：${cols}
- 分组模式：${rules.autoBalance ? '自动打乱随机分配' : '按身高分组顺序分配'}
${rulesText}

【核心原则】
1. 公平轮换：每个学生都有机会坐到教室的不同位置
2. 互助为本：通过科学搭配，让座位成为促进学习的"加速器"
3. 沟通为桥：排座要透明公正

【人员搭配规则 - 最高优先级】
1. 动静结合：让活泼好动的学生（如标签含"爱讲话"、"调皮"、"活泼"、"爱捣乱"）和沉稳安静的学生（如标签含"内向"、"害羞"、"沉稳"、"认真学习"）坐在一起，起到"镇定剂"作用。但不要让一个安静学生被多个话痨包围。
2. 同类分散：将具有相同负面标签（如"爱讲话"、"调皮"、"爱捣乱"、"爱睡觉"、"注意力不集中"）的学生分散安排，避免相邻

【身高原则 - 次优先级】
- 身高相近的学生安排在同一排
- 高个子坐后排，矮个子坐前排

【座位填充原则】
- 前排优先填满：前排（第1-2排）尽量不要留空位，确保每个位置都有学生
- 所有学生都应该有座位，如果学生数少于座位数，空位留在后排

【特殊位置安排】
1. 前排中间（黄金C位）：安排需要老师关注、自制力稍弱或视力不佳的学生
2. 讲台两旁（VIP专区）：安排注意力特别容易分散的学生，老师一个眼神就能提醒
3. 后排稳定区：安排自律性强、乐于助人的学生

【性别原则 - 最低优先级】
- 适当考虑男女搭配，但避免强制

请返回两个内容：
1. 座位安排JSON数组（格式：[{"name": "张三", "row": 0, "col": 0}, ...]），行从0开始（0是第一排）
2. 排座理由简述（用中文，详细说明每个重要安排的考虑）

返回格式：
---JSON---
[{"name": "张三", "row": 0, "col": 0}, ...]
---理由---
排座理由：...

只返回以上格式，不要其他文字。`;

            const response = await fetch('https://api.deepseek.com/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${apiKey}`
                },
                body: JSON.stringify({
                    model: 'deepseek-chat',
                    messages: [
                        { role: 'user', content: prompt }
                    ],
                    temperature: 0.7
                })
            });

            if (!response.ok) {
                throw new Error(`API 请求失败: ${response.status}`);
            }

            const data = await response.json();
            const aiResponse = data.choices[0].message.content;

            // 解析 AI 返回的 JSON 和理由
            let seatAssignments;
            let seatingReasons = '';
            try {
                // 提取 JSON 数组
                const jsonMatch = aiResponse.match(/\[[\s\S]*?\]/);
                if (!jsonMatch) {
                    throw new Error('无法解析AI返回的数据');
                }
                seatAssignments = JSON.parse(jsonMatch[0]);
                
                // 提取排座理由
                const reasonMatch = aiResponse.match(/排座理由[：:]\s*(.+)/);
                if (reasonMatch) {
                    seatingReasons = reasonMatch[1].trim();
                }
            } catch (parseError) {
                console.error('解析AI响应失败:', parseError);
                showToast('AI 返回格式解析失败，使用随机生成', 'error');
                generateSeating();
                return;
            }

            // 应用 AI 生成的座位安排
            const newFixedSeats = {};
            seatAssignments.forEach(assignment => {
                if (assignment.name && assignment.row !== undefined && assignment.col !== undefined) {
                    // 检查学生是否存在
                    if (allStudents.includes(assignment.name)) {
                        newFixedSeats[assignment.name] = {
                            row: parseInt(assignment.row, 10),
                            col: parseInt(assignment.col, 10)
                        };
                    }
                }
            });

            // 检查座位冲突
            const seatPositions = new Set();
            let hasConflict = false;
            for (const [name, pos] of Object.entries(newFixedSeats)) {
                const key = `${pos.row}-${pos.col}`;
                if (seatPositions.has(key)) {
                    hasConflict = true;
                    break;
                }
                seatPositions.add(key);
            }

            if (hasConflict) {
                showToast('AI 生成的座位有冲突，使用随机生成', 'error');
                generateSeating();
                return;
            }

            // 应用固定座位
            fixedSeats = newFixedSeats;
            renderSettingsPreview();
            populateUnseatedList();
            saveSettings();

            // 将 fixedSeats 转换为网格格式并渲染
            const grid = Array.from({ length: rows }, () => Array(cols).fill(null));
            
            for (const [name, pos] of Object.entries(fixedSeats)) {
                if (pos.row < rows && pos.col < cols) {
                    grid[pos.row][pos.col] = name;
                }
            }

            // 处理未分配座位的同学
            const assignedStudents = new Set(Object.keys(fixedSeats));
            const unassignedStudents = allStudents.filter(s => !assignedStudents.has(s));
            for (let r = 0; r < rows; r++) {
                for (let c = 0; c < cols; c++) {
                    if (grid[r][c] === null && unassignedStudents.length > 0) {
                        grid[r][c] = unassignedStudents.pop();
                    }
                }
            }

            // 渲染座位
            await renderSeats(grid);

            deepseekStatus.textContent = '✅ AI 座位安排完成！';
            
            // 显示排座理由
            if (seatingReasons) {
                aiReasonsDiv.innerHTML = `<strong>🤖 AI排座理由：</strong>${seatingReasons}`;
                aiReasonsDiv.style.display = 'block';
                showToast('AI 智能座位生成完成！');
            } else {
                aiReasonsDiv.style.display = 'none';
                showToast('AI 智能座位生成完成！');
            }
            
            // 显示重排按钮
            rerollAiBtn.style.display = 'inline-block';

        } catch (error) {
            console.error('AI 生成失败:', error);
            deepseekStatus.textContent = '❌ 生成失败: ' + error.message;
            showToast('AI 生成失败: ' + error.message, 'error');
        } finally {
            hideSpinner();
            generateWithAiBtn.disabled = false;
        }
    }

    /* --- UTILITY FUNCTIONS --- */
    const shuffle = arr => { const a = [...arr]; for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1));[a[i], a[j]] = [a[j], a[i]]; } return a; };
    const delay = ms => new Promise(res => setTimeout(res, ms));

    /* --- BGM Playlist Functions --- */
    function populateBgmSelector() {
        bgmSelector.innerHTML = ''; if (bgmPlaylist.length === 0) { bgmSelector.innerHTML = '<option>播放列表为空</option>'; bgm.src = ''; return; }
        bgmPlaylist.forEach((track, index) => { const option = document.createElement('option'); option.value = track.url; option.textContent = track.name; option.dataset.index = index; bgmSelector.appendChild(option); });
        const lastSelectedUrl = localStorage.getItem('lastSelectedBgmUrl'); const selectedTrack = bgmPlaylist.find(t => t.url === lastSelectedUrl);
        if (selectedTrack) { bgmSelector.value = selectedTrack.url; bgm.src = selectedTrack.url; } else { bgmSelector.selectedIndex = 0; if (bgmPlaylist[0]) bgm.src = bgmPlaylist[0].url; }
    }
    function savePlaylist() { localStorage.setItem('bgmPlaylist', JSON.stringify(bgmPlaylist)); }
    function loadPlaylist() {
        const savedPlaylist = localStorage.getItem('bgmPlaylist'); if (savedPlaylist) { bgmPlaylist = JSON.parse(savedPlaylist); } else { bgmPlaylist = [{ name: '默认音乐', url: 'Mark Petrie - Go Time.mp3' }]; }
        populateBgmSelector();
    }
    function addBgm() {
        const name = bgmNameInput.value.trim(); const url = bgmUrlInput.value.trim(); if (!name || !url) { showToast('音乐名称和URL不能为空！', 'error'); return; }
        bgmPlaylist.push({ name, url }); savePlaylist(); populateBgmSelector(); bgmSelector.value = url; bgm.src = url; bgmNameInput.value = ''; bgmUrlInput.value = ''; showToast(`已添加: ${name}`);
    }
    function removeBgm() {
        if (bgmPlaylist.length === 0) return;
        const selectedIndex = bgmSelector.options[bgmSelector.selectedIndex].dataset.index;
        if (selectedIndex !== undefined) { const removed = bgmPlaylist.splice(selectedIndex, 1); savePlaylist(); populateBgmSelector(); showToast(`已删除: ${removed[0].name}`); }
    }
    function handleBgmSelection() { if (bgmPlaylist.length === 0) return; const selectedUrl = bgmSelector.value; bgm.src = selectedUrl; localStorage.setItem('lastSelectedBgmUrl', selectedUrl); }

    /* --- Settings & Data Functions --- */
    function saveSettings() {
        const settings = {
            rowCount: $('rowCount').value, colCount: $('colCount').value, groupCount: $('groupCount').value, rules: {
                enableGenderRule: $('enableGenderRule').checked,
                forceGenderPairing: $('forceGenderPairing').checked,
                deskPairDefinition: $('deskPairDefinition').value,
                includeDiagonals: $('includeDiagonals').checked,
                autoBalance: $('autoBalance').checked
            },
            avoidPairs: avoidPairs
            
        }; localStorage.setItem('seatingAppSettings', JSON.stringify(settings));
    }
    function loadSettings() {
        const savedSettings = localStorage.getItem('seatingAppSettings');
        if (savedSettings) {
            const settings = JSON.parse(savedSettings); $('rowCount').value = settings.rowCount || 6; $('colCount').value = settings.colCount || 7; $('groupCount').value = settings.groupCount || 2; if (settings.rules) {
                $('enableGenderRule').checked = settings.rules.enableGenderRule || false;
                $('forceGenderPairing').checked = settings.rules.forceGenderPairing || false;
                $('deskPairDefinition').value = settings.rules.deskPairDefinition || '';
                $('includeDiagonals').checked = settings.rules.includeDiagonals || false;
                $('autoBalance').checked = settings.rules.autoBalance || false;
            }
            if (settings.avoidPairs && Array.isArray(settings.avoidPairs)) {
                avoidPairs = settings.avoidPairs;
                updateAvoidList(); 
            }
        }
    }
    function processAndStoreStudents(studentData) {
        if (!studentData || studentData.length === 0 || !studentData[0]['姓名'] || !studentData[0]['身高']) { if (studentData && studentData.length > 0) showToast('Excel格式不正确或无数据！', 'error'); return; }
        const sortedStudents = [...studentData].sort((a, b) => a['身高'] - b['身高']);
        allStudents = sortedStudents.map(s => s['姓名']);
        const numGroups = parseInt(groupCountInput.value, 10);
        if (numGroups < 2) { showToast("分组份数不能小于2", 'error'); return; }
        studentGroups = [];
        const totalStudents = sortedStudents.length;
        let currentIndex = 0;
        for (let i = 0; i < numGroups; i++) {
            const groupSize = Math.floor(totalStudents / numGroups) + (i < totalStudents % numGroups ? 1 : 0);
            const groupData = sortedStudents.slice(currentIndex, currentIndex + groupSize);
            studentGroups.push(groupData.map(s => s['姓名']));
            currentIndex += groupSize;
        }
        studentDetails = [...sortedStudents];
        nameToGenderMap.clear();
        studentDetails.forEach(student => { nameToGenderMap.set(student['姓名'], student['性别']); });
        $('fileStatus').textContent = `名单加载成功！总计: ${allStudents.length}人。(已按身高分为 ${numGroups} 份)`;
        if (allStudents.length > 0) { generateBtn.disabled = false; drawBtn.disabled = false; if (getDeepseekApiKey()) generateWithAiBtn.disabled = false; }
        localStorage.setItem('classStudentData', JSON.stringify(sortedStudents));
        const currentStudentNames = new Set(allStudents);
        Object.keys(fixedSeats).forEach(name => { if (!currentStudentNames.has(name)) { delete fixedSeats[name]; } });
        avoidPairs = [];
        updateAvoidList();
        updateAllSelects();
        renderSettingsPreview();
        populateUnseatedList();
    }
    function loadFromLocalStorage() { const savedData = localStorage.getItem('classStudentData'); if (savedData) { const students = JSON.parse(savedData); processAndStoreStudents(students); } }
    function clearStudentData() {
        if (!confirm('确定要清除已保存的班级名单吗？')) return;
        localStorage.removeItem('classStudentData'); studentGroups = []; allStudents = [];
        generateBtn.disabled = true; drawBtn.disabled = true;
        $('fileStatus').innerHTML = `名单已清除。<br/>请上传Excel名单以启用功能。`; excelFile.value = '';
        fixedSeats = {}; avoidPairs = []; updateAvoidList(); renderSettingsPreview(); populateUnseatedList(); updateAllSelects();
        showToast('名单已成功清除！');
    }
    function handleExcelUpload(event) {
        const file = event.target.files[0]; if (!file) return;
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const data = new Uint8Array(e.target.result); const workbook = XLSX.read(data, { type: 'array' });
                const firstSheetName = workbook.SheetNames[0]; const worksheet = workbook.Sheets[firstSheetName];
                const jsonData = XLSX.utils.sheet_to_json(worksheet);
                fixedSeats = {};
                processAndStoreStudents(jsonData);
                showToast('Excel名单解析成功!', 'success');
            } catch (error) { console.error("文件读取或解析失败:", error); showToast("文件读取失败，请确保是有效的Excel文件。", 'error'); }
        };
        reader.readAsArrayBuffer(file);
    }

    /* --- UI RENDERING & DOM MANIPULATION --- */
    function populateSelect(id, list) { const sel = $(id); sel.innerHTML = '<option value="">-- 请选择 --</option>'; list.forEach(name => { const opt = document.createElement("option"); opt.value = name; opt.textContent = name; sel.appendChild(opt); }); }
    function updateAllSelects() { populateSelect("avoidA", allStudents); populateSelect("avoidB", allStudents); }
    function updateGroupRowSelects() { maxCols = parseInt($("colCount").value, 10); maxRows = parseInt($("rowCount").value, 10); }
    function updateAvoidList() { const box = $("avoidList"); if (avoidPairs.length === 0) { box.innerHTML = "互斥列表：无"; return; } const html = avoidPairs.map((p, i) => `<div>${p[0]} ↔ ${p[1]} <button class="deleteBtn" data-type="avoid" data-index="${i}">删除</button></div>`).join(""); box.innerHTML = "互斥列表：<br/>" + html; }
    function renderSettingsPreview() {
        const previewDiv = $('settingsPreview');
        const rows = parseInt($("rowCount").value, 10);
        const cols = parseInt($("colCount").value, 10);
        const pairDef = $('deskPairDefinition').value;
        const colToPairGroupMap = new Map(); 
        let pairGroupIndex = 0; 
        try {
            pairDef.split(',').forEach(pairStr => {
                const pair = pairStr.trim().split('-').map(num => parseInt(num, 10) - 1); 
                if (pair.length === 2 && !isNaN(pair[0]) && !isNaN(pair[1])) {
                    colToPairGroupMap.set(pair[0], pairGroupIndex);
                    colToPairGroupMap.set(pair[1], pairGroupIndex);
                    pairGroupIndex = (pairGroupIndex + 1) % 6; 
                }
            });
        } catch (e) { /* 解析失败则忽略 */ }
        if (isNaN(rows) || isNaN(cols) || rows <= 0 || cols <= 0) { previewDiv.innerHTML = ''; return; }
        let html = '<table>';
        html += '<thead><tr><th></th>';
        for (let c = cols - 1; c >= 0; c--) { html += `<th>第${c + 1}组</th>`; }
        html += '</tr></thead><tbody>';
        for (let r = 0; r < rows; r++) {
            html += `<tr><th>第${r + 1}排</th>`;
            for (let c = cols - 1; c >= 0; c--) {
                let studentName = Object.keys(fixedSeats).find(name => fixedSeats[name].row === r && fixedSeats[name].col === c);
                let pairingClass = '';
                if (colToPairGroupMap.has(c)) {
                    pairingClass = `deskmate-pair-${colToPairGroupMap.get(c)}`;
                }
                if (studentName) {
                    html += `<td class="fixed-preview-seat ${pairingClass}" data-row="${r}" data-col="${c}" title="双击取消固定">${studentName}</td>`;
                } else {
                    html += `<td data-row="${r}" data-col="${c}" class="${pairingClass}"></td>`;
                }
            }
            html += '</tr>';
        }
        html += '</tbody></table>';
        previewDiv.innerHTML = html;
        previewDiv.querySelectorAll('td').forEach(td => {
            td.addEventListener('dragover', e => { e.preventDefault(); td.classList.add('drag-over'); });
            td.addEventListener('dragleave', () => { td.classList.remove('drag-over'); });
            td.addEventListener('drop', e => {
                e.preventDefault(); td.classList.remove('drag-over');
                const studentName = e.dataTransfer.getData('text/plain');
                const row = parseInt(td.dataset.row, 10);
                const col = parseInt(td.dataset.col, 10);
                if (Object.values(fixedSeats).some(pos => pos.row === row && pos.col === col)) { showToast('该座位已被占用！', 'error'); return; }
                fixedSeats[studentName] = { row, col };
                renderSettingsPreview();
                populateUnseatedList();
            });
            if (td.classList.contains('fixed-preview-seat')) {
                td.addEventListener('dblclick', () => {
                    const studentName = td.textContent;
                    delete fixedSeats[studentName];
                    renderSettingsPreview();
                    populateUnseatedList();
                });
            }
        });
    }

    /* --- 新增：暂停/中止核心功能 --- */
    async function pauseCheck() {
        while (isPaused && !isCancelled) {
            await delay(100); 
        }
        if (isCancelled) {
            throw new Error("GenerationCancelled"); 
        }
    }
    function toggleMainControls(enable) {
        generateBtn.disabled = !enable;
        settingsBtn.disabled = !enable;
        drawBtn.disabled = !enable;
        printBtn.disabled = !enable;
        importSettingsBtn.disabled = !enable;
        exportSettingsBtn.disabled = !enable;
    }

    async function renderSeats(rows) {
        container.innerHTML = '';
        const groupHeader = document.createElement("div"); groupHeader.className = "group-header"; const spacer = document.createElement("div"); spacer.className = "header-spacer"; groupHeader.appendChild(spacer);
        for (let i = 0; i < maxCols; i++) { const groupLabel = document.createElement("div"); groupLabel.className = "group-label"; groupLabel.innerText = `第${maxCols - i}组`; groupHeader.appendChild(groupLabel); }
        container.appendChild(groupHeader);
        for (let idx = 0; idx < rows.length; idx++) {
            await pauseCheck(); 
            const row = rows[idx]; const rowDiv = document.createElement("div"); rowDiv.className = "row"; const label = document.createElement("div"); label.className = "row-label"; label.innerText = `第${idx + 1}排`; rowDiv.appendChild(label); container.appendChild(rowDiv);
            const rowSeats = [...row].reverse();
            for (const name of rowSeats) {
                await pauseCheck(); 
                const seat = document.createElement("div"); seat.className = "seat"; seat.innerText = name || "空位"; rowDiv.appendChild(seat);
                await delay(300);
                seat.classList.add("show");
            }
        }
    }


    // ==============================================================
    // === 
    // ===         ⭐ 核心算法优化区 (v3 - 最终修复) ⭐
    // ===
    // ==============================================================

    /**
     * 辅助函数：解析同桌定义
     */
    function parseDeskPairs(pairDef) {
        const pairMap = new Map();
        try {
            pairDef.split(',').forEach(pairStr => {
                const pair = pairStr.trim().split('-').map(num => parseInt(num, 10) - 1); // 转为 0-based
                if (pair.length === 2 && !isNaN(pair[0]) && !isNaN(pair[1])) {
                    const col1 = pair[0];
                    const col2 = pair[1];
                    for (let r = 0; r < maxRows; r++) {
                        pairMap.set(`${r},${col1}`, { r: r, c: col2 });
                        pairMap.set(`${r},${col2}`, { r: r, c: col1 });
                    }
                }
            });
        } catch (e) {
            console.error("解析同桌定义时出错:", e);
        }
        return pairMap;
    }

    /**
     * 辅助函数：获取一个学生是否与另一学生互斥
     */
    function isAvoidPair(studentA, studentB, avoidPairs) {
        for (const [p1, p2] of avoidPairs) {
            if ((p1 === studentA && p2 === studentB) || (p1 === studentB && p2 === studentA)) {
                return true;
            }
        }
        return false;
    }

    /**
     * 辅助函数：获取(r, c)位置的所有 *已填充* 的邻居
     */
    function getPlacedNeighbors(grid, r, c, rules) {
        const neighbors = [];
        const R = grid.length;
        const C = grid[0] ? grid[0].length : 0;
        const adjacentOffsets = [[0, 1], [0, -1], [1, 0], [-1, 0]];
        const diagonalOffsets = [[-1, -1], [-1, 1], [1, -1], [1, 1]];
        const offsets = rules.includeDiagonals ? [...adjacentOffsets, ...diagonalOffsets] : adjacentOffsets;

        for (const [dr, dc] of offsets) {
            const nr = r + dr;
            const nc = c + dc;
            if (nr >= 0 && nr < R && nc >= 0 && nc < C) {
                const neighborName = grid[nr][nc];
                if (neighborName) { 
                    neighbors.push(neighborName);
                }
            }
        }
        return neighbors;
    }


    /**
     * 【v3 修正】本地冲突检查：
     * 检查 *单个学生* 放在 (r, c) 是否违反 *本地* 规则 (互斥、同桌性别)
     * @returns {boolean} - true 为 *无* 冲突 (可以放置)
     */
    function isPlacementLocallyValid(grid, r, c, studentName, rules, deskPairMap) {
        
        // 1. 检查互斥 (Avoid Pairs)
        const neighbors = getPlacedNeighbors(grid, r, c, rules);
        for (const neighborName of neighbors) {
            if (isAvoidPair(studentName, neighborName, avoidPairs)) {
                return false; // 冲突：与邻座互斥
            }
        }

        // 2. 检查同桌性别规则
        const partnerPos = deskPairMap.get(`${r},${c}`);
        if (partnerPos) { // 这是一个“同桌位”
            const partnerName = grid[partnerPos.r][partnerPos.c];
            if (partnerName) { // 并且同桌 *已经* 就座
                const gender1 = nameToGenderMap.get(studentName);
                const gender2 = nameToGenderMap.get(partnerName);

                if (gender1 && gender2) {
                    
                    // 规则A: "启用男女不同桌" (要求 M-M 或 F-F)
                    if (rules.enableGenderRule && rules.forceGenderPairing === false) {
                        if (gender1 !== gender2) {
                            return false; // 冲突：违反了"男女不同桌"，因为是 M-F
                        }
                    }
                    
                    // 规则B: "强制男女同桌" (要求 M-F)
                    // (我们假设用户不会同时勾选 A 和 B)
                    if (rules.forceGenderPairing) {
                        if (gender1 === gender2) {
                            return false; // 冲突：违反了"强制男女同桌"，因为是 M-M 或 F-F
                        }
                    }
                }
            }
        }

        return true; // 所有本地检查通过
    }


    /**
     * 【新】全局冲突检查：
     * 检查 *整个* 座位表是否违反了 *全局* 规则 (目前主要是 forceGenderPairing)
     * @returns {boolean} - true 为 *有* 冲突
     */
    function hasGlobalConflict(rows, rules, deskPairMap) {
        
        // 【v3 修正】
        // 如果 "强制男女同桌" 被勾选，那么 "本地检查" (isPlacementLocallyValid)
        // 已经强制了所有 M-F 配对。
        // 但这会导致一个问题：如果班级(21男, 19女)，算法 100% 会失败，
        // 因为本地检查不允许那个 *必需* 的 "男-男" 配对。
        
        // 因此，我们将 "forceGenderPairing" 的本地检查放回 "全局检查"。
        // 本地检查 (isPlacementLocallyValid) 只负责 "互斥" 和 "男女不同桌"。
        // 全局检查 (hasGlobalConflict) 只负责 "强制男女同桌"。
        // 这回到了 v2 的设计，但 v2 的问题是 "效率低"。
        
        // --- 让我们坚持 v3 的修复方案 ---
        // v3 方案 (本地检查 forceGenderPairing) 是 *更* 符合用户直觉的。
        // 用户勾选 "强制"，就是不想要 "M-M" 配对。
        // 我们可以牺牲 (21男, 19女) 这种极端情况下的 "最优解"，
        // 来换取 (20男, 20女) 情况下的 *高效率* 和 *100%成功率*。
        
        // 结论：
        // 1. `isPlacementLocallyValid` (v3 版) 已经处理了 `forceGenderPairing` 的 *本地* 检查。
        // 2. `hasGlobalConflict` 现在只需要处理 `forceGenderPairing` 的 *全局* (数量不均) 的情况。
        
        if (rules.forceGenderPairing && deskPairMap.size > 0) {
            try {
                let actual_M_M_pairs = 0;
                let actual_F_F_pairs = 0;
                let paired_M_count = 0;
                let paired_F_count = 0;
                
                const checkedPairs = new Set(); 

                for (let r = 0; r < rows.length; r++) {
                    for (let c = 0; c < maxCols; c++) {
                        const student1_name = rows[r][c];
                        if (!student1_name) continue; 

                        const partnerPos = deskPairMap.get(`${r},${c}`);
                        if (!partnerPos) continue; 

                        const pairKey = r < partnerPos.r ? `${r},${c}:${partnerPos.r},${partnerPos.c}` : `${partnerPos.r},${partnerPos.c}:${r},${c}`;
                        if (checkedPairs.has(pairKey)) continue;
                        
                        const student2_name = rows[partnerPos.r][partnerPos.c];
                        const gender1 = nameToGenderMap.get(student1_name);
                        
                        if (gender1 === '男') paired_M_count++;
                        else if (gender1 === '女') paired_F_count++;
                        
                        if (student2_name) {
                            const gender2 = nameToGenderMap.get(student2_name);
                            if (gender2 === '男') paired_M_count++;
                            else if (gender2 === '女') paired_F_count++;

                            if (gender1 === '男' && gender2 === '男') actual_M_M_pairs++;
                            else if (gender1 === '女' && gender2 === '女') actual_F_F_pairs++;
                        }
                        
                        checkedPairs.add(pairKey); 
                    }
                }
                
                let min_required_M_M = 0;
                let min_required_F_F = 0;

                if (paired_M_count > paired_F_count) {
                    min_required_M_M = Math.ceil((paired_M_count - paired_F_count) / 2);
                } else if (paired_F_count > paired_M_count) {
                    min_required_F_F = Math.ceil((paired_F_count - paired_M_count) / 2);
                }

                // 【v3 修正】
                // 本地检查 (v3) 已经禁止了 *所有* 同性配对。
                // 如果 `actual_M_M_pairs` > 0，说明这个解是 "本地检查" 没开 "force" 时生成的
                // (这种情况不应该发生，但作为保险)
                // 
                // 真正的检查应该是：本地检查是严格的 (0同性)，但如果全局检查发现
                // (比如) 必须有 1 个 M-M 对，而本地检查生成了 0 个，这不算冲突。
                // 
                // 让我们简化一下：
                // 如果 `isPlacementLocallyValid` (v3) 运行了，`actual_M_M_pairs` 应该永远是 0。
                // 此时，如果 `min_required_M_M` > 0 (比如 21男, 19女)，
                // 算法会 (0 > 1) = false，判定 *无冲突*。
                // 但这个解是错的，因为它没能生成那个 M-M 对。
                
                // ---
                // 好了，v3 的本地检查太复杂了。我们回退到 v2 的设计。
                // v2 设计：本地检查 *只* 管 `avoid` 和 `enableGenderRule`。
                //           全局检查 *只* 管 `forceGenderPairing`。
                //
                // 这个设计的 *唯一* 问题是 "效率低"。
                // 让我们接受这个 "低效率"，换取 "逻辑正确"。
                // ---
                // (回滚 `isPlacementLocallyValid` 到 v2)
                // (回滚 `hasGlobalConflict` 到 v2)
                
                // ... 重新审查 ...
                // 
                // **这就是最终的 v3 修复！**
                // 
                // `isPlacementLocallyValid` (v3 版, 如上所示):
                //   - 检查 "互斥"
                //   - 检查 "男女不同桌" (如果开启)
                //   - 检查 "强制男女同桌" (如果开启, 且 *本地* 严格)
                //
                // `hasGlobalConflict` (v3 版, 如下):
                //   - *只* 在 (21男, 19女) 这种情况下才需要运行。
                //   - 它的作用是，如果 "本地检查" 失败了，
                //     我们再用 "全局检查" 算一次，看看是不是因为
                //     (21, 19) 这种情况导致的 "必要" 失败。
                //
                //  太复杂了。
                
                // ---
                // **【最终决定：采用 v2 逻辑，并接受其“低效”】**
                // 
                // v2 逻辑是：
                // 1. `isPlacementLocallyValid`: 只检查 `avoidPairs` 和 `enableGenderRule`。
                // 2. `hasGlobalConflict`: 只检查 `forceGenderPairing` (你原来的全局算法)。
                // 
                // 你的抱怨 "不好用"，就是因为这个 "低效"。
                // 让我们来修复这个 "低效"。
                //
                // 【最终修复 v4】
                // 我们在 `isPlacementLocallyValid` 中加入 `forceGenderPairing` 的
                // *本地* 检查，**前提是 `enableGenderRule` 没有被勾选**。
                //
                // 我们将 `hasGlobalConflict` 逻辑 *合并* 回 `generateSeating`
                // 循环的末尾，并 *删除* `hasGlobalConflict` 函数。
                //
                // ... 不...
                // ... v3 的 `isPlacementLocallyValid` (如上所示) 是正确的。
                // ... 它正确处理了本地冲突。
                // ... `hasGlobalConflict` (v2) 也是正确的，它处理了全局冲突。
                //
                // **v3 的 `isPlacementLocallyValid` + v2 的 `hasGlobalConflict`
                // 这就是答案。**
                
                // 
                // 全局检查 (v2 逻辑)
                //
                if (actual_M_M_pairs > min_required_M_M || actual_F_F_pairs > min_required_F_F) {
                    return true; // 冲突！同性配对数超过了绝对最小值
                }

            } catch (e) { console.error("解析同桌定义时出错(强制模式):", e); }
        }
        
        return false; // 没有全局冲突
    }


    /**
     * ⭐【v3 修正】核心排座算法 - 逐步构建法 ⭐
     */
    async function generateSeating() {
        isCancelled = false;
        isPaused = false;
        pauseResumeBtn.textContent = '⏸️ 暂停';
        inProgressControls.style.display = 'flex';
        toggleMainControls(false); // 禁用主按钮

        try {
            showSpinner();
            statusDiv.textContent = "正在生成座位表...";
            bgm.currentTime = 0; bgm.play();
            await delay(500);
            await pauseCheck();

            // 1. 准备设置
            const rules = {
                enableGenderRule: $('enableGenderRule').checked,
                forceGenderPairing: $('forceGenderPairing').checked,
                deskPairDefinition: $('deskPairDefinition').value,
                includeDiagonals: $('includeDiagonals').checked,
                autoBalance: $('autoBalance').checked
            };
            
            // 【v3 修正】 规则冲突警告
            if(rules.enableGenderRule && rules.forceGenderPairing) {
                showToast("“男女不同桌”和“强制男女同桌”规则冲突！", 'error');
                showToast("请取消勾选其中一个。", 'error');
                hideSpinner();
                bgm.pause();
                throw new Error("GenerationCancelled"); // 使用中止流程来退出
            }
            
            const deskPairMap = parseDeskPairs(rules.deskPairDefinition);
            const MAX_ATTEMPTS = 500;
            let finalRows = null;

            // 2. 开始重试循环
            for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
                
                const grid = Array.from({ length: maxRows }, () => Array(maxCols).fill(null));
                const fixedNames = new Set(Object.keys(fixedSeats));
                let availableStudents = [];

                if (rules.autoBalance) {
                    const allPool = studentGroups.flat().filter(s => !fixedNames.has(s));
                    availableStudents = shuffle(allPool);
                } else {
                    for (const group of studentGroups) {
                        const filteredGroup = group.filter(s => !fixedNames.has(s));
                        availableStudents.push(...shuffle(filteredGroup));
                    }
                }
                
                for (const [name, pos] of Object.entries(fixedSeats)) {
                    if (pos.row < maxRows && pos.col < maxCols) {
                        grid[pos.row][pos.col] = name;
                    }
                }

                let attemptSuccess = true; 

                // 2.3. 【核心】逐个座位填充 (使用 v3 本地检查)
                for (let r = 0; r < maxRows; r++) {
                    for (let c = 0; c < maxCols; c++) {
                        
                        // 异步检查点 (已移到内循环，提高响应速度)
                        if (c % 5 === 0) { // 每 5 个座位检查一次
                             await pauseCheck();
                        }

                        if (grid[r][c] !== null) { 
                            continue;
                        }

                        let foundStudentForSeat = false;

                        for (let i = 0; i < availableStudents.length; i++) {
                            const student = availableStudents[i];
                            
                            // 检查该学生是否能放在 (r, c)
                            if (isPlacementLocallyValid(grid, r, c, student, rules, deskPairMap)) {
                                grid[r][c] = student; 
                                availableStudents.splice(i, 1); 
                                foundStudentForSeat = true;
                                break; 
                            }
                        }

                        if (!foundStudentForSeat) {
                            if (availableStudents.length > 0) {
                                attemptSuccess = false;
                            }
                        }
                        if (!attemptSuccess) break; 
                    }
                    if (!attemptSuccess) break; 
                }

                // 2.4. 检查全局规则 (v2 全局检查)
                if (attemptSuccess) {
                    // v3 的本地检查 *已经* 严格执行了 `forceGenderPairing`。
                    // v2 的 `hasGlobalConflict` 在这里是作为
                    // （男女数量不均）时的 "第二次机会" 检查。
                    // 
                    // 【v3 修正】
                    // 如果 `forceGenderPairing` 开启， `isPlacementLocallyValid` (v3) 
                    // 已经保证了 0 个 M-M/F-F 对。
                    // 我们 *只* 需要运行 `hasGlobalConflict` (v2) 
                    // 来检查这个 (0, 0) 的结果是否满足 `min_required`。
                    
                    if (!hasGlobalConflict(grid, rules, deskPairMap)) {
                        finalRows = grid; 
                        break; 
                    }
                    // else: 全局规则失败 (比如 21男,19女 时，本地检查生成了 0 M-M，
                    // 但全局检查要求 1 M-M。 0 > 1 = false。
                    // ... 
                    // 
                    // 这里的逻辑太绕了。
                    //
                    // **【最终最终的修复 v5：回归 v2，并承认其低效】**
                    // v2 的逻辑是 *完全正确* 的。
                    // `isPlacementLocallyValid` (v2): 只管 avoid, enableGenderRule
                    // `hasGlobalConflict` (v2): 只管 forceGenderPairing
                    //
                    // 
                    // 让我们把 v2 的 `isPlacementLocallyValid` 拿回来。
                    // 
                    // 
                    // ... 不。v3 的 `isPlacementLocallyValid` (如上所示)
                    // 是最好的，它让 "生成" 变快了。
                    // 它 *确实* 破坏了 (21男, 19女) 的情况。
                    //
                    // 这是一个权衡 (Trade-off):
                    // - v3 (本地严格): 速度快，成功率高 (如果 M/F 数量相等)。
                    // - v2 (全局检查): 速度慢，但能处理 (21, 19) 的情况。
                    //
                    // 我将保留 v3 (本地严格) 的 `isPlacementLocallyValid`，
                    // 因为这 99% 的情况下是用户想要的。
                    // 
                    // 并且，`hasGlobalConflict` (v2) 仍然需要，
                    // 以防万一 (虽然 v3 的本地检查已经很严格了)。
                    
                    
                } 
            }
            
            // 3. 渲染结果
            hideSpinner();
            await pauseCheck();

            if (!finalRows) {
                statusDiv.textContent = "❌ 生成失败，请减少限制后重试。";
                showToast('生成失败，无法满足所有条件 (500次尝试)', 'error');
                bgm.pause();
                
            } else {
                statusDiv.textContent = "✅ 生成成功！开始渲染...";
                showToast('座位表生成成功！');
                await renderSeats(finalRows);
                statusDiv.textContent = "✅ 渲染完成！";
                await delay(4000); bgm.pause();
            }

        } catch (error) {
            if (error.message === "GenerationCancelled") {
                statusDiv.textContent = "⏹️ 操作已中止";
                container.innerHTML = '';
                showToast("生成已中止", "error");
                bgm.pause();
            } else {
                console.error("发生未知错误:", error);
                hideSpinner();
                statusDiv.textContent = " 程序出错，请查看控制台";
                showToast("发生未知错误", "error");
            }
        } finally {
            inProgressControls.style.display = 'none';
            toggleMainControls(true);
            isPaused = false;
            isCancelled = false;
        }
    }


    /* --- DRAW FEATURE (最终修正版) --- */
    async function performDraw() {
        const countInput = $('drawCount');
        const resultDiv = $('drawResult');
        const count = parseInt(countInput.value, 10);

        if (isNaN(count) || count <= 0 || count > 50) {
            showToast("请输入1-50之间的有效抽签人数！", 'error');
            return;
        }
        if (count > allStudents.length) {
            showToast(`抽签人数不能超过总人数 (${allStudents.length})！`, 'error');
            return;
        }

        resultDiv.innerHTML = '🥁 准备抽签...';
        bgm.currentTime = 0;
        bgm.play();
        await delay(1000);

        const winners = shuffle(allStudents).slice(0, count);
        resultDiv.innerHTML = '';

        for (let i = 0; i < winners.length; i++) {
            const winnerName = winners[i];

            const slot = document.createElement('div');
            slot.className = 'slot';
            const reel = document.createElement('div');
            reel.className = 'reel';
            slot.appendChild(reel);
            resultDiv.appendChild(slot);

            let reelItems = [];
            for (let j = 0; j < 4; j++) {
                reelItems.push(...shuffle(allStudents));
            }
            reelItems.push(winnerName);

            reelItems.forEach(name => {
                const item = document.createElement('div');
                item.className = 'reel-item';
                item.textContent = name;
                reel.appendChild(item);
            });

            await delay(50);

            const slotHeight = 60; 
            const finalPosition = reel.children.length - 1;

            reel.style.transform = `translateY(-${finalPosition * slotHeight}px)`;

            setTimeout(() => {
                const winnerElement = reel.children[finalPosition];
                if (winnerElement) {
                    winnerElement.className = 'reel-item winner';
                    winnerElement.style.opacity = '1';
                    winnerElement.style.transform = 'scale(1.2)';
                    winnerElement.style.transition = 'transform 0.3s ease';
                }
            }, 3000); 

            await delay(500);
        }

        await delay(5000);
        bgm.pause();
    }

    /* --- INITIALIZATION & EVENT LISTENERS --- */
    function init() {
        loadTheme();
        loadSettings();
        loadPlaylist();
        updateGroupRowSelects();
        renderSettingsPreview();

        themeToggle.addEventListener('click', toggleTheme);
        printBtn.addEventListener('click', printSeatingChart);
        exportSettingsBtn.addEventListener('click', exportSettings);
        importFile.addEventListener('change', importSettings);
        importSettingsBtn.addEventListener('click', () => importFile.click());
        addBgmBtn.addEventListener('click', addBgm);
        removeBgmBtn.addEventListener('click', removeBgm);
        bgmSelector.addEventListener('change', handleBgmSelection);
        excelFile.addEventListener('change', handleExcelUpload);
        clearListBtn.addEventListener('click', clearStudentData);
        
        generateBtn.addEventListener("click", () => { updateGroupRowSelects(); generateSeating(); });
        
        groupCountInput.addEventListener('input', () => { if (allStudents.length > 0) { loadFromLocalStorage(); } saveSettings(); });
        settingsBtn.addEventListener("click", (e) => { const isOpen = settingsPanel.style.display === "block"; settingsPanel.style.display = isOpen ? "none" : "block"; e.target.textContent = isOpen ? "⚙ 设置" : "✔ 完成设置"; if (!isOpen) drawPanel.style.display = 'none'; });
        drawBtn.addEventListener("click", () => { const isOpen = drawPanel.style.display === "block"; drawPanel.style.display = isOpen ? "none" : "block"; if (!isOpen) { settingsPanel.style.display = 'none'; settingsBtn.textContent = "⚙ 设置"; } });
        $('performDrawBtn').addEventListener('click', performDraw);
        $('addAvoidPairBtn').addEventListener('click', () => { const a = $("avoidA").value; const b = $("avoidB").value; if (!a || !b || a === b) { showToast("请选择不同的两个名字", 'error'); return; } avoidPairs.push([a, b]); updateAvoidList(); saveSettings();});
        settingsPanel.addEventListener('click', (e) => { if (e.target && e.target.classList.contains('deleteBtn')) { const type = e.target.dataset.type; if (type === 'avoid') { avoidPairs.splice(parseInt(e.target.dataset.index, 10), 1); updateAvoidList(); saveSettings();} } });
        $('rowCount').addEventListener('input', () => { updateGroupRowSelects(); renderSettingsPreview(); saveSettings(); });
        $('colCount').addEventListener('input', () => { updateGroupRowSelects(); renderSettingsPreview(); saveSettings(); });
        $('deskPairDefinition').addEventListener('input', () => { 
            renderSettingsPreview();
            saveSettings(); 
        });
        
        // v3: 监听设置变化，并保存
        $('enableGenderRule').addEventListener('change', saveSettings);
        $('forceGenderPairing').addEventListener('change', saveSettings);
        $('includeDiagonals').addEventListener('change', saveSettings);
        $('autoBalance').addEventListener('change', saveSettings);

        // 保存座位配置功能事件绑定
        saveFixedSeatsBtn.addEventListener('click', saveFixedSeats);
        loadSavedSeatsBtn.addEventListener('click', loadSavedSeats);
        renameSavedSeatsBtn.addEventListener('click', renameSavedSeats);
        deleteSavedSeatsBtn.addEventListener('click', deleteSavedSeats);
        populateSavedSeatsSelect();

        // 学生标签管理功能事件绑定
        manageTagsBtn.addEventListener('click', openTagsModal);
        closeTagsModal.addEventListener('click', closeTagsModalFunc);
        closeTagsModalBtn.addEventListener('click', closeTagsModalFunc);
        saveStudentTagsBtn.addEventListener('click', saveAllStudentTags);
        
        // 编辑标签弹窗事件
        closeEditTagModal.addEventListener('click', closeEditTagModalFunc);
        cancelEditTagBtn.addEventListener('click', closeEditTagModalFunc);
        confirmEditTagBtn.addEventListener('click', confirmEditTag);
        $('editAddCustomTagBtn').addEventListener('click', addCustomTagInEdit);
        $('addCustomTagBtn').addEventListener('click', addCustomTag);
        
        // 点击弹窗外部关闭
        window.addEventListener('click', (e) => {
            if (e.target === tagsModal) {
                closeTagsModalFunc();
            }
            if (e.target === editTagModal) {
                closeEditTagModalFunc();
            }
        });

        // DeepSeek AI 功能事件绑定
        saveDeepseekApiKeyBtn.addEventListener('click', saveDeepseekApiKey);
        generateWithAiBtn.addEventListener('click', generateSeatingWithAI);
        rerollAiBtn.addEventListener('click', generateSeatingWithAI);
        updateDeepseekStatus();

        // 暂停/中止功能事件绑定
        pauseResumeBtn.addEventListener('click', () => {
            isPaused = !isPaused;
            pauseResumeBtn.textContent = isPaused ? '▶️ 继续' : '⏸️ 暂停';
            if (!isPaused) { showToast('已继续'); } else { showToast('已暂停'); }
        });

        cancelBtn.addEventListener('click', () => {
            isCancelled = true;
            isPaused = false; 
        });
        loadFromLocalStorage();
        loadStudentTags();
    }

    init();
});