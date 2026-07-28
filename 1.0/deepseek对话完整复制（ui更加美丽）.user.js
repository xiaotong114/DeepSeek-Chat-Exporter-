// ==UserScript==
// @name         DeepSeek 对话全文抓取器 (美化折叠版)
// @namespace    http://tampermonkey.net/
// @version      2.1
// @description  自动滚动加载 DeepSeek 对话页面，保存完整对话，界面美化可折叠
// @author       你
// @match        https://chat.deepseek.com/*
// @grant        none
// ==/UserScript==

(function() {
    'use strict';

    if (window.__deepseekScraperGUI) return;
    window.__deepseekScraperGUI = true;

    // ---------- 样式 (增加折叠小圆点和提示) ----------
    const style = document.createElement('style');
    style.textContent = `
        #ds-scraper-gui {
            position: fixed;
            top: 80px;
            right: 20px;
            z-index: 999999;
            background: rgba(20, 25, 35, 0.85);
            backdrop-filter: blur(16px) saturate(180%);
            -webkit-backdrop-filter: blur(16px) saturate(180%);
            color: #eef2fb;
            border-radius: 20px;
            box-shadow: 0 20px 40px rgba(0, 0, 0, 0.4), 0 0 0 1px rgba(255, 255, 255, 0.05) inset;
            font-family: 'Inter', system-ui, -apple-system, BlinkMacSystemFont, sans-serif;
            font-size: 13px;
            width: 320px;
            padding: 20px;
            user-select: none;
            transition: all 0.3s cubic-bezier(0.2, 0.9, 0.4, 1);
            border: none;
            transform-origin: top right;
        }
        
        #ds-scraper-gui.collapsed {
            width: 52px;
            height: 52px;
            padding: 0;
            border-radius: 26px;
            background: rgba(30, 40, 60, 0.9);
            backdrop-filter: blur(12px);
            box-shadow: 0 8px 20px rgba(0,0,0,0.3);
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            transition: all 0.3s ease;
        }
        #ds-scraper-gui.collapsed:hover {
            transform: scale(1.08);
            background: rgba(50, 65, 90, 0.9);
        }
        #ds-scraper-gui.collapsed .panel-content {
            display: none;
        }
        #ds-scraper-gui.collapsed .collapse-icon {
            display: flex;
            font-size: 26px;
            margin: 0;
            opacity: 0.9;
        }
        
        #ds-scraper-gui .panel-content {
            display: block;
        }
        
        #ds-scraper-gui .collapse-icon {
            display: none;
        }
        
        #ds-scraper-gui .header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 18px;
            cursor: move;
        }
        #ds-scraper-gui .header h3 {
            margin: 0;
            color: #b7c9e2;
            font-size: 16px;
            font-weight: 500;
            letter-spacing: 0.3px;
            display: flex;
            align-items: center;
            gap: 8px;
        }
        #ds-scraper-gui .header h3::before {
            content: "📜";
            font-size: 18px;
            opacity: 0.9;
        }
        #ds-scraper-gui .header-actions {
            display: flex;
            gap: 8px;
        }
        #ds-scraper-gui .collapse-btn {
            cursor: pointer;
            color: #7f8fa3;
            font-size: 18px;
            line-height: 1;
            transition: all 0.2s;
            width: 28px;
            height: 28px;
            display: flex;
            align-items: center;
            justify-content: center;
            border-radius: 50%;
            background: rgba(255, 255, 255, 0.03);
        }
        #ds-scraper-gui .collapse-btn:hover {
            color: #a8c1e0;
            background: rgba(255, 255, 255, 0.1);
            transform: scale(1.05);
        }
        #ds-scraper-gui .close-btn {
            cursor: pointer;
            color: #7f8fa3;
            font-size: 20px;
            line-height: 1;
            transition: all 0.2s;
            width: 28px;
            height: 28px;
            display: flex;
            align-items: center;
            justify-content: center;
            border-radius: 50%;
            background: rgba(255, 255, 255, 0.03);
        }
        #ds-scraper-gui .close-btn:hover {
            color: #ff7b89;
            background: rgba(255, 123, 137, 0.15);
            transform: scale(1.05);
        }
        
        #ds-scraper-gui .btn-group {
            display: flex;
            flex-direction: column;
            gap: 10px;
            margin-bottom: 18px;
        }
        #ds-scraper-gui button {
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 8px;
            width: 100%;
            padding: 12px 16px;
            border: none;
            border-radius: 14px;
            background: rgba(45, 55, 72, 0.7);
            color: #e0e7ff;
            font-weight: 500;
            font-size: 14px;
            cursor: pointer;
            transition: all 0.25s cubic-bezier(0.2, 0.9, 0.4, 1);
            border: 1px solid rgba(255, 255, 255, 0.06);
            box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
            letter-spacing: 0.2px;
            backdrop-filter: blur(4px);
        }
        #ds-scraper-gui button:hover {
            background: rgba(60, 75, 95, 0.8);
            border-color: rgba(255, 255, 255, 0.15);
            transform: translateY(-1px);
            box-shadow: 0 6px 12px rgba(0, 0, 0, 0.2);
        }
        #ds-scraper-gui button:active {
            transform: translateY(1px);
            box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
        }
        #ds-scraper-gui button.primary {
            background: linear-gradient(145deg, #5f7eb0, #4a6792);
            border: 1px solid rgba(255, 255, 255, 0.2);
            color: white;
            font-weight: 600;
            box-shadow: 0 4px 12px rgba(74, 103, 146, 0.3);
        }
        #ds-scraper-gui button.primary:hover {
            background: linear-gradient(145deg, #6f8ec0, #5675a0);
            box-shadow: 0 8px 18px rgba(74, 103, 146, 0.4);
        }
        #ds-scraper-gui button.stop {
            background: linear-gradient(145deg, #b55a6b, #9e4a5a);
            border: 1px solid rgba(255, 255, 255, 0.15);
            color: white;
            box-shadow: 0 4px 12px rgba(180, 70, 90, 0.25);
        }
        #ds-scraper-gui button.stop:hover {
            background: linear-gradient(145deg, #c56a7b, #ae5a6a);
            box-shadow: 0 8px 18px rgba(180, 70, 90, 0.35);
        }
        #ds-scraper-gui button:disabled {
            opacity: 0.45;
            filter: grayscale(0.5);
            transform: none;
            box-shadow: none;
            pointer-events: none;
        }
        
        #ds-scraper-gui .config-section {
            background: rgba(0, 0, 0, 0.2);
            border-radius: 16px;
            padding: 14px 16px;
            margin: 18px 0;
            border: 1px solid rgba(255, 255, 255, 0.03);
        }
        #ds-scraper-gui .config-row {
            display: flex;
            align-items: center;
            gap: 12px;
            margin-bottom: 12px;
            color: #b0c2da;
            font-size: 13px;
        }
        #ds-scraper-gui .config-row:last-child {
            margin-bottom: 0;
        }
        #ds-scraper-gui .config-row label {
            width: 80px;
            display: flex;
            align-items: center;
            gap: 6px;
            opacity: 0.85;
        }
        #ds-scraper-gui .config-row input {
            flex: 1;
            background: rgba(20, 28, 40, 0.7);
            border: 1px solid rgba(255, 255, 255, 0.1);
            border-radius: 12px;
            color: #e0e7ff;
            padding: 8px 14px;
            font-size: 13px;
            font-weight: 500;
            transition: all 0.2s;
            backdrop-filter: blur(4px);
        }
        #ds-scraper-gui .config-row input:focus {
            outline: none;
            border-color: #7f9bc2;
            background: rgba(30, 40, 55, 0.8);
            box-shadow: 0 0 0 3px rgba(127, 155, 194, 0.2);
        }
        #ds-scraper-gui .config-row input::placeholder {
            color: #6a7a94;
            font-weight: 400;
        }
        
        #ds-scraper-gui .status-area {
            margin: 18px 0 12px;
        }
        #ds-scraper-gui .status {
            margin: 8px 0;
            font-size: 13px;
            color: #c6d3e8;
            text-align: center;
            min-height: 36px;
            padding: 8px 12px;
            background: rgba(0, 0, 0, 0.15);
            border-radius: 24px;
            backdrop-filter: blur(4px);
            border: 1px solid rgba(255, 255, 255, 0.02);
            display: flex;
            align-items: center;
            justify-content: center;
            font-weight: 450;
        }
        
        #ds-scraper-gui .progress-container {
            margin: 12px 0 6px;
        }
        #ds-scraper-gui .progress {
            height: 6px;
            background: rgba(0, 0, 0, 0.4);
            border-radius: 20px;
            overflow: hidden;
            box-shadow: inset 0 1px 3px rgba(0,0,0,0.3);
        }
        #ds-scraper-gui .progress-bar {
            height: 100%;
            width: 0%;
            background: linear-gradient(90deg, #8fc1a0, #a8d8b9);
            border-radius: 20px;
            transition: width 0.2s ease;
            box-shadow: 0 0 8px rgba(143, 193, 160, 0.5);
        }
        
        #ds-scraper-gui .footer-note {
            font-size: 11px;
            color: #8a9bb5;
            text-align: center;
            margin-top: 16px;
            opacity: 0.75;
            letter-spacing: 0.2px;
        }
        
        #ds-scraper-gui .ua-tip {
            margin-top: 12px;
            padding: 8px 10px;
            background: rgba(127, 155, 194, 0.1);
            border-radius: 20px;
            font-size: 11px;
            color: #b0c2da;
            text-align: center;
            border: 1px dashed rgba(255,255,255,0.1);
            backdrop-filter: blur(4px);
        }
        
        #ds-scraper-gui .badge {
            background: rgba(127, 155, 194, 0.15);
            padding: 2px 8px;
            border-radius: 30px;
            font-size: 11px;
            color: #b0c2da;
            border: 1px solid rgba(255,255,255,0.05);
        }
    `;
    document.head.appendChild(style);

    // ---------- 菜单 HTML (增加折叠按钮和提示) ----------
    const menu = document.createElement('div');
    menu.id = 'ds-scraper-gui';
    menu.innerHTML = `
        <div class="collapse-icon" style="display:none;">📜</div>
        <div class="panel-content">
            <div class="header">
                <h3>对话抓取器 <span class="badge">v2.1</span></h3>
                <div class="header-actions">
                    <span class="collapse-btn" title="折叠面板">▼</span>
                    <span class="close-btn" title="关闭">×</span>
                </div>
            </div>
            
            <div class="btn-group">
                <button id="ds-scrape-up" class="primary">⬆ 向上滚动抓取</button>
                <button id="ds-scrape-down" class="primary">⬇ 向下滚动抓取</button>
                <button id="ds-scrape-all" class="primary">🔄 抓取全部 (先上后下)</button>
                <button id="ds-stop" class="stop" disabled>⏹ 停止抓取</button>
            </div>
            
            <div class="config-section">
                <div class="config-row">
                    <label>⏱️ 间隔</label>
                    <input id="ds-interval" type="number" min="20" max="5000" value="40" step="10">
                    <span style="opacity:0.6; font-size:12px;">ms</span>
                </div>
                <div class="config-row">
                    <label>📏 步长</label>
                    <input id="ds-step" type="number" min="100" max="2000" value="1000" step="50">
                    <span style="opacity:0.6; font-size:12px;">px</span>
                </div>
            </div>
            
            <div class="status-area">
                <div class="status" id="ds-status">✨ 就绪，点击按钮开始</div>
                <div class="progress-container">
                    <div class="progress">
                        <div class="progress-bar" id="ds-progress"></div>
                    </div>
                </div>
            </div>
            
            <div class="footer-note">
                💡 自动滚动并保存 · 文件为 TXT 格式
            </div>
            <div class="ua-tip">
                💻 提示：使用电脑UA（桌面版网站）效果更佳
            </div>
        </div>
    `;
    document.body.appendChild(menu);

    // ---------- 折叠逻辑 ----------
    const collapseBtn = menu.querySelector('.collapse-btn');
    const collapseIcon = menu.querySelector('.collapse-icon');
    let isCollapsed = false;

    collapseBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        isCollapsed = !isCollapsed;
        if (isCollapsed) {
            menu.classList.add('collapsed');
            collapseBtn.style.display = 'none';
            collapseIcon.style.display = 'flex';
            statusDiv.innerText = '📦 面板已折叠';
        } else {
            menu.classList.remove('collapsed');
            collapseBtn.style.display = 'flex';
            collapseIcon.style.display = 'none';
        }
    });

    // 点击折叠后的小圆点可展开
    menu.addEventListener('click', (e) => {
        if (isCollapsed && e.target === menu || e.target === collapseIcon) {
            isCollapsed = false;
            menu.classList.remove('collapsed');
            collapseBtn.style.display = 'flex';
            collapseIcon.style.display = 'none';
        }
    });

    // ---------- 拖动功能 (保持不变) ----------
    let isDragging = false, offsetX, offsetY;
    const header = menu.querySelector('.header');
    header.addEventListener('mousedown', (e) => {
        if (e.target.tagName === 'BUTTON' || e.target.classList.contains('close-btn') || 
            e.target.classList.contains('collapse-btn') || e.target.tagName === 'INPUT') return;
        isDragging = true;
        const rect = menu.getBoundingClientRect();
        offsetX = e.clientX - rect.left;
        offsetY = e.clientY - rect.top;
        menu.style.cursor = 'grabbing';
    });
    document.addEventListener('mousemove', (e) => {
        if (!isDragging) return;
        menu.style.left = (e.clientX - offsetX) + 'px';
        menu.style.right = 'auto';
        menu.style.top = (e.clientY - offsetY) + 'px';
    });
    document.addEventListener('mouseup', () => {
        isDragging = false;
        menu.style.cursor = '';
    });

    // ---------- 元素引用 ----------
    const upBtn = document.getElementById('ds-scrape-up');
    const downBtn = document.getElementById('ds-scrape-down');
    const allBtn = document.getElementById('ds-scrape-all');
    const stopBtn = document.getElementById('ds-stop');
    const statusDiv = document.getElementById('ds-status');
    const progressBar = document.getElementById('ds-progress');
    const closeBtn = menu.querySelector('.close-btn');
    const intervalInput = document.getElementById('ds-interval');
    const stepInput = document.getElementById('ds-step');

    // ---------- 状态与核心逻辑 (完全沿用，无改动) ----------
    let isRunning = false;
    let stopRequested = false;
    let collectedMessages = new Set();
    let fullText = [];
    let scrollInterval = null;
    let currentDirection = null;
    let scrollContainer = null;

    function findScrollContainer() {
        const candidates = [];
        const allDivs = document.querySelectorAll('div');
        for (let div of allDivs) {
            const style = window.getComputedStyle(div);
            if ((style.overflowY === 'auto' || style.overflowY === 'scroll') && div.scrollHeight > div.clientHeight) {
                candidates.push(div);
            }
        }
        if (candidates.length === 0) return document.scrollingElement || document.documentElement;
        candidates.sort((a, b) => (b.clientWidth * b.clientHeight) - (a.clientWidth * a.clientHeight));
        return candidates[0];
    }

    function extractMessages() {
        const selectors = [
            '[data-message-id]', '.prose', '.whitespace-pre-wrap',
            '[class*="message"]', '[data-testid*="message"]',
            '.chat-message', '.conversation-turn'
        ];
        const elements = new Set();
        for (let sel of selectors) {
            document.querySelectorAll(sel).forEach(el => elements.add(el));
        }
        const newMessages = [];
        for (let el of elements) {
            const text = el.textContent.trim();
            if (text.length < 5) continue;
            const key = text.slice(0, 60) + '_' + text.length;
            if (!collectedMessages.has(key)) {
                collectedMessages.add(key);
                newMessages.push(text);
            }
        }
        return newMessages;
    }

    function updateStatusAndProgress() {
        const newMsgs = extractMessages();
        if (newMsgs.length > 0) {
            fullText.push(...newMsgs);
        }
        const totalChars = fullText.reduce((sum, t) => sum + t.length, 0);
        statusDiv.innerText = `📊 已收集 ${fullText.length} 条 · ${(totalChars/1024).toFixed(1)} KB`;
        if (scrollContainer) {
            const progress = (scrollContainer.scrollTop / (scrollContainer.scrollHeight - scrollContainer.clientHeight)) * 100;
            progressBar.style.width = Math.min(progress, 100) + '%';
        }
        return newMsgs.length;
    }

    function saveToFile() {
        if (fullText.length === 0) {
            alert('没有抓取到任何内容');
            return;
        }
        const title = document.title.replace(/[\\/:*?"<>|]/g, '_').trim() || 'deepseek_chat';
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
        const content = fullText.join('\n\n---\n\n');
        const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${title}_${timestamp}.txt`;
        a.click();
        URL.revokeObjectURL(url);
        statusDiv.innerText = `✅ 已保存 ${fullText.length} 条消息`;
    }

    function scrollStep() {
        if (!isRunning || stopRequested || !scrollContainer) return;
        const step = parseInt(stepInput.value, 10);
        const beforeTop = scrollContainer.scrollTop;
        if (currentDirection === 'up') {
            scrollContainer.scrollBy({ top: -step, behavior: 'auto' });
        } else {
            scrollContainer.scrollBy({ top: step, behavior: 'auto' });
        }
        setTimeout(() => {
            if (!isRunning || stopRequested) return;
            const afterTop = scrollContainer.scrollTop;
            updateStatusAndProgress();
            const atTop = afterTop <= 0;
            const atBottom = (afterTop + scrollContainer.clientHeight) >= scrollContainer.scrollHeight - 5;
            if ((currentDirection === 'up' && atTop) || (currentDirection === 'down' && atBottom)) {
                statusDiv.innerText = `⏸️ 已到达${currentDirection === 'up' ? '顶部' : '底部'}`;
                stop();
                return;
            }
            if (Math.abs(afterTop - beforeTop) < 5) {
                if (!window.__noChangeCount) window.__noChangeCount = 0;
                window.__noChangeCount++;
                if (window.__noChangeCount >= 3) {
                    statusDiv.innerText = '⚠️ 滚动无变化，可能已到底';
                    stop();
                    return;
                }
            } else {
                window.__noChangeCount = 0;
            }
        }, 200);
    }

    function startScrolling(direction) {
        if (isRunning) return;
        isRunning = true;
        stopRequested = false;
        currentDirection = direction;
        window.__noChangeCount = 0;
        upBtn.disabled = downBtn.disabled = allBtn.disabled = true;
        stopBtn.disabled = false;
        scrollContainer = findScrollContainer();
        console.log('DeepSeek Scraper: 滚动容器', scrollContainer);
        statusDiv.innerText = `🔍 容器: ${scrollContainer.tagName}.${scrollContainer.className}`;
        collectedMessages.clear();
        fullText = [];
        updateStatusAndProgress();
        const intervalTime = parseInt(intervalInput.value, 10);
        scrollInterval = setInterval(() => { scrollStep(); }, intervalTime);
        statusDiv.innerText = direction === 'up' ? '⬆ 向上滚动中...' : '⬇ 向下滚动中...';
    }

    function startAll() {
        if (isRunning) return;
        startScrolling('up');
        const checkUpDone = setInterval(() => {
            if (!isRunning) {
                clearInterval(checkUpDone);
                setTimeout(() => { startScrolling('down'); }, 500);
            }
        }, 500);
    }

    function stop() {
        stopRequested = true;
        isRunning = false;
        if (scrollInterval) {
            clearInterval(scrollInterval);
            scrollInterval = null;
        }
        upBtn.disabled = downBtn.disabled = allBtn.disabled = false;
        stopBtn.disabled = true;
        saveToFile();
        progressBar.style.width = '0%';
        window.__noChangeCount = 0;
    }

    // 事件绑定
    upBtn.addEventListener('click', () => startScrolling('up'));
    downBtn.addEventListener('click', () => startScrolling('down'));
    allBtn.addEventListener('click', startAll);
    stopBtn.addEventListener('click', stop);
    closeBtn.addEventListener('click', () => {
        if (isRunning) {
            if (confirm('正在抓取中，确定关闭？')) {
                stop();
                menu.remove();
                window.__deepseekScraperGUI = false;
            }
        } else {
            menu.remove();
            window.__deepseekScraperGUI = false;
        }
    });

    window.addEventListener('beforeunload', () => {
        if (isRunning) stop();
    });

    // 默认高效参数
    intervalInput.value = 40;
    stepInput.value = 1000;
})();
