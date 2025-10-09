document.addEventListener('DOMContentLoaded', () => {

    /* --- DATA / STATE --- */
    let studentGroups = []; 
    let allStudents = [];
    let studentDetails = [];
    let nameToGenderMap = new Map();
    let avoidPairs = [];
    let fixedSeats = {}; // { "张三": {row: 0, col: 0} }
    let maxRows = 6;
    let maxCols = 7;
    let bgmPlaylist = [];
        // 新增：暂停/中止状态
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
    const excelFile = $('excelFile');
    const clearListBtn = $('clearListBtn');
    const groupCountInput = $('groupCount');
    const bgmSelector = $('bgmSelector');
    const removeBgmBtn = $('removeBgmBtn');
    const bgmNameInput = $('bgmNameInput');
    const bgmUrlInput = $('bgmUrlInput');
    const addBgmBtn = $('addBgmBtn');
    const unseatedList = $('unseated-list');
    // 新增：过程控制按钮的引用
    const inProgressControls = $('in-progress-controls');
    const pauseResumeBtn = $('pauseResumeBtn');
    const cancelBtn = $('cancelBtn');

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
    function exportSettings() { if (allStudents.length === 0) { showToast('没有可导出的数据，请先上传名单', 'error'); return; } const settingsToExport = { studentDetails: studentDetails, avoidPairs: avoidPairs, fixedSeats: fixedSeats, bgmPlaylist: bgmPlaylist, lastSelectedBgmUrl: localStorage.getItem('lastSelectedBgmUrl'), seatingAppSettings: JSON.parse(localStorage.getItem('seatingAppSettings')), rules: { enableGenderRule: $('enableGenderRule').checked, deskPairDefinition: $('deskPairDefinition').value, includeDiagonals: $('includeDiagonals').checked, autoBalance: $('autoBalance').checked } }; const blob = new Blob([JSON.stringify(settingsToExport, null, 2)], { type: 'application/json' }); const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = `座位系统配置_${new Date().toLocaleDateString()}.json`; a.click(); URL.revokeObjectURL(url); showToast('配置已导出！'); }
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
                if(data.rules) { $('enableGenderRule').checked = data.rules.enableGenderRule; $('deskPairDefinition').value = data.rules.deskPairDefinition; $('includeDiagonals').checked = data.rules.includeDiagonals; $('autoBalance').checked = data.rules.autoBalance; }
                if(data.lastSelectedBgmUrl) localStorage.setItem('lastSelectedBgmUrl', data.lastSelectedBgmUrl);
                if(data.seatingAppSettings) localStorage.setItem('seatingAppSettings', JSON.stringify(data.seatingAppSettings));
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
                e.dataTransfer.setData('text/plain', student['姓名']);
                div.classList.add('dragging');
            });
            div.addEventListener('dragend', () => {
                div.classList.remove('dragging');
            });

            unseatedList.appendChild(div);
        });
    }

    /* --- UTILITY FUNCTIONS --- */
    const shuffle = arr => { const a = [...arr]; for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
    const delay = ms => new Promise(res => setTimeout(res, ms));

    /* --- BGM Playlist Functions --- */
    function populateBgmSelector() {
        bgmSelector.innerHTML = ''; if (bgmPlaylist.length === 0) { bgmSelector.innerHTML = '<option>播放列表为空</option>'; bgm.src = ''; return; }
        bgmPlaylist.forEach((track, index) => { const option = document.createElement('option'); option.value = track.url; option.textContent = track.name; option.dataset.index = index; bgmSelector.appendChild(option); });
        const lastSelectedUrl = localStorage.getItem('lastSelectedBgmUrl'); const selectedTrack = bgmPlaylist.find(t => t.url === lastSelectedUrl);
        if (selectedTrack) { bgmSelector.value = selectedTrack.url; bgm.src = selectedTrack.url; } else { bgmSelector.selectedIndex = 0; if(bgmPlaylist[0]) bgm.src = bgmPlaylist[0].url; }
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
    function saveSettings() { const settings = { rowCount: $('rowCount').value, colCount: $('colCount').value, groupCount: $('groupCount').value }; localStorage.setItem('seatingAppSettings', JSON.stringify(settings)); }
    function loadSettings() {
        const savedSettings = localStorage.getItem('seatingAppSettings');
        if (savedSettings) { const settings = JSON.parse(savedSettings); $('rowCount').value = settings.rowCount || 6; $('colCount').value = settings.colCount || 7; $('groupCount').value = settings.groupCount || 2; }
    }
    function processAndStoreStudents(studentData) {
        if (!studentData || studentData.length === 0 || !studentData[0]['姓名'] || !studentData[0]['身高']) { if(studentData && studentData.length > 0) showToast('Excel格式不正确或无数据！', 'error'); return; }
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
        if (allStudents.length > 0) { generateBtn.disabled = false; drawBtn.disabled = false; }
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
        if (isNaN(rows) || isNaN(cols) || rows <= 0 || cols <= 0) { previewDiv.innerHTML = ''; return; }
        let html = '<table>';
        html += '<thead><tr><th></th>';
        for (let c = cols - 1; c >= 0; c--) { html += `<th>第${c + 1}组</th>`; }
        html += '</tr></thead><tbody>';
        for (let r = 0; r < rows; r++) {
            html += `<tr><th>第${r + 1}排</th>`;
            for (let c = cols - 1; c >= 0; c--) {
                let studentName = Object.keys(fixedSeats).find(name => fixedSeats[name].row === r && fixedSeats[name].col === c);
                if (studentName) {
                    html += `<td class="fixed-preview-seat" data-row="${r}" data-col="${c}" title="双击取消固定">${studentName}</td>`;
                } else {
                    html += `<td data-row="${r}" data-col="${c}"></td>`;
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
            await delay(100); // 如果是暂停状态，则每100毫秒检查一次
        }
        if (isCancelled) {
            throw new Error("GenerationCancelled"); // 抛出一个特定错误来中断执行
        }
    }
    
    // 切换主控制按钮和过程控制按钮的可用状态
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
            await pauseCheck(); // <-- 新增：渲染每排前检查
            const row = rows[idx]; const rowDiv = document.createElement("div"); rowDiv.className = "row"; const label = document.createElement("div"); label.className = "row-label"; label.innerText = `第${idx + 1}排`; rowDiv.appendChild(label); container.appendChild(rowDiv);
            const rowSeats = [...row].reverse();
            for (const name of rowSeats) {
                await pauseCheck(); // <-- 新增：渲染每个座位前检查
                const seat = document.createElement("div"); seat.className = "seat"; seat.innerText = name || "空位"; rowDiv.appendChild(seat);
                await delay(300);
                seat.classList.add("show");
            }
        }
    }
    
    /* --- CORE LOGIC: SEATING GENERATION --- */
    function hasConflict(rows) {
        const genderRuleEnabled = document.getElementById('enableGenderRule').checked; const pairDef = document.getElementById('deskPairDefinition').value; 
        if (genderRuleEnabled && pairDef) { try { const deskPairs = pairDef.split(',').map(pair => pair.trim().split('-').map(num => parseInt(num, 10) - 1)); for (let r = 0; r < rows.length; r++) { for (const pair of deskPairs) { if (pair.length !== 2 || isNaN(pair[0]) || isNaN(pair[1])) continue; const col1 = pair[0]; const col2 = pair[1]; const student1_name = rows[r][col1]; const student2_name = rows[r][col2]; if (student1_name && student2_name) { const gender1 = nameToGenderMap.get(student1_name); const gender2 = nameToGenderMap.get(student2_name); if (gender1 && gender2 && gender1 !== gender2) { return true; } } } } } catch (e) { console.error("解析同桌定义时出错，请检查格式:", e); } } 
        const R = rows.length, C = rows[0] ? rows[0].length : 0; const includeDiagonals = $("includeDiagonals").checked; const adjacentOffsets = [[0, 1], [0, -1], [1, 0], [-1, 0]]; const diagonalOffsets = [[-1, -1], [-1, 1], [1, -1], [1, 1]]; const offsets = includeDiagonals ? [...adjacentOffsets, ...diagonalOffsets] : adjacentOffsets; 
        for (const [p1, p2] of avoidPairs) { for (let r = 0; r < R; r++) { for (let c = 0; c < C; c++) { if (rows[r][c] === p1) { for (const [dr, dc] of offsets) { const nr = r + dr, nc = c + dc; if (nr >= 0 && nr < R && nc >= 0 && nc < C && rows[nr][nc] === p2) { return true; } } } } } } 
        return false;
    }
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

            let finalRows = null;
            const MAX_ATTEMPTS = 500; const autoBalance = $("autoBalance").checked;
            for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
                const fixedNames = new Set(Object.keys(fixedSeats)); let combinedPool = [];
                if (autoBalance) { const allPool = studentGroups.flat().filter(s => !fixedNames.has(s)); combinedPool = shuffle(allPool); } else { for (const group of studentGroups) { const filteredGroup = group.filter(s => !fixedNames.has(s)); combinedPool.push(...shuffle(filteredGroup)); } }
                const rows = Array.from({ length: maxRows }, () => Array(maxCols).fill(null));
                for (const [name, pos] of Object.entries(fixedSeats)) { if (pos.row < maxRows && pos.col < maxCols) { rows[pos.row][pos.col] = name; } }
                for (let r = 0; r < maxRows; r++) { for (let c = 0; c < maxCols; c++) { if (rows[r][c] === null) { rows[r][c] = combinedPool.shift() || null; } } }
                if (!hasConflict(rows)) { finalRows = rows; break; }
            }

            hideSpinner();
            await pauseCheck();

            if (!finalRows) {
                statusDiv.textContent = "❌ 生成失败，请减少限制后重试。";
                showToast('生成失败，无法满足所有互斥条件', 'error');
                bgm.pause(); return;
            }

            statusDiv.textContent = "✅ 生成成功！开始渲染...";
            showToast('座位表生成成功！');
            await renderSeats(finalRows);
            statusDiv.textContent = "✅ 渲染完成！";
            await delay(4000); bgm.pause();

        } catch (error) {
            if (error.message === "GenerationCancelled") {
                statusDiv.textContent = "⏹️ 操作已中止";
                container.innerHTML = ''; // 清空座位
                showToast("生成已中止", "error");
                bgm.pause();
            } else {
                console.error("发生未知错误:", error);
                hideSpinner(); // 确保隐藏动画
                statusDiv.textContent = " 程序出错，请查看控制台";
                showToast("发生未知错误", "error");
            }
        } finally {
            // 无论成功、失败还是中止，最后都执行清理工作
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

            const slotHeight = 60; // 直接使用CSS中定义的60px高度
            const finalPosition = reel.children.length - 1;

            // 设置滚动动画
            reel.style.transform = `translateY(-${finalPosition * slotHeight}px)`;

            // --- 全新的高亮逻辑 ---
            setTimeout(() => {
                const winnerElement = reel.children[finalPosition];
                if (winnerElement) {
                    // 1. 强制清除任何可能存在的干扰class，只保留基础和winner
                    winnerElement.className = 'reel-item winner';

                    // 2. 通过JS直接、强制地应用最终样式
                    winnerElement.style.opacity = '1';
                    winnerElement.style.transform = 'scale(1.2)';
                    winnerElement.style.transition = 'transform 0.3s ease'; // 只给放大效果一个平滑过渡
                }
            }, 3000); // 3秒，与CSS中的transition时长一致

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
        $('addAvoidPairBtn').addEventListener('click', () => { const a = $("avoidA").value; const b = $("avoidB").value; if (!a || !b || a === b) { showToast("请选择不同的两个名字", 'error'); return; } avoidPairs.push([a, b]); updateAvoidList(); });
        settingsPanel.addEventListener('click', (e) => { if (e.target && e.target.classList.contains('deleteBtn')) { const type = e.target.dataset.type; if (type === 'avoid') { avoidPairs.splice(parseInt(e.target.dataset.index, 10), 1); updateAvoidList(); } } });
        $('rowCount').addEventListener('input', () => { updateGroupRowSelects(); renderSettingsPreview(); saveSettings(); });
        $('colCount').addEventListener('input', () => { updateGroupRowSelects(); renderSettingsPreview(); saveSettings(); });
         // 暂停/中止功能事件绑定
        pauseResumeBtn.addEventListener('click', () => {
            isPaused = !isPaused;
            pauseResumeBtn.textContent = isPaused ? '▶️ 继续' : '⏸️ 暂停';
            if (!isPaused) { showToast('已继续'); } else { showToast('已暂停'); }
        });

        cancelBtn.addEventListener('click', () => {
            isCancelled = true;
            isPaused = false; // 如果处于暂停循环，让它跳出来
        });
        loadFromLocalStorage();
    }
    
    init();
});