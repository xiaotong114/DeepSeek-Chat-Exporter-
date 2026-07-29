// ==UserScript==
// @name         ds对话导出（美化版）
// @namespace    http://tampermonkey.net/
// @version      6.0
// @description  单对话抓取 + 批量抓取 + 关键词过滤 + 导出选择 + 美化UI + 可折叠
// @author       你
// @match        https://chat.deepseek.com/*
// @grant        none
// ==/UserScript==

(function() {
    'use strict';

    if (window.__dsScraperUltimate) return;
    window.__dsScraperUltimate = true;

    // ---------- 样式 (毛玻璃 + 渐变按钮 + 折叠) ----------
    const style = document.createElement('style');
    style.textContent = `
        #ds-scraper-ultimate {
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
        #ds-scraper-ultimate.collapsed {
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
        #ds-scraper-ultimate.collapsed:hover {
            transform: scale(1.08);
            background: rgba(50, 65, 90, 0.9);
        }
        #ds-scraper-ultimate.collapsed .panel-content {
            display: none;
        }
        #ds-scraper-ultimate.collapsed .collapse-icon {
            display: flex;
            font-size: 26px;
            margin: 0;
            opacity: 0.9;
        }
        #ds-scraper-ultimate .panel-content {
            display: block;
        }
        #ds-scraper-ultimate .collapse-icon {
            display: none;
        }
        #ds-scraper-ultimate .header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 18px;
            cursor: move;
        }
        #ds-scraper-ultimate .header h3 {
            margin: 0;
            color: #b7c9e2;
            font-size: 16px;
            font-weight: 500;
            letter-spacing: 0.3px;
            display: flex;
            align-items: center;
            gap: 8px;
        }
        #ds-scraper-ultimate .header h3::before {
            content: "📜";
            font-size: 18px;
            opacity: 0.9;
        }
        #ds-scraper-ultimate .header-actions {
            display: flex;
            gap: 8px;
            align-items: center;
        }
        #ds-scraper-ultimate .collapse-header-btn {
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
        #ds-scraper-ultimate .collapse-header-btn:hover {
            color: #a8c1e0;
            background: rgba(255, 255, 255, 0.1);
            transform: scale(1.05);
        }
        #ds-scraper-ultimate .close-btn {
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
        #ds-scraper-ultimate .close-btn:hover {
            color: #ff7b89;
            background: rgba(255, 123, 137, 0.15);
            transform: scale(1.05);
        }
        #ds-scraper-ultimate .mode-switch {
            display: flex;
            gap: 6px;
            margin-bottom: 10px;
        }
        #ds-scraper-ultimate .mode-btn {
            flex: 1;
            padding: 6px 8px;
            border: 1px solid rgba(255, 255, 255, 0.1);
            border-radius: 10px;
            background: rgba(45, 55, 72, 0.5);
            color: #a0b0d0;
            font-size: 12px;
            cursor: pointer;
            transition: all 0.2s;
            text-align: center;
            backdrop-filter: blur(4px);
        }
        #ds-scraper-ultimate .mode-btn.active {
            background: rgba(95, 126, 176, 0.35);
            border-color: rgba(137, 180, 250, 0.4);
            color: #89b4fa;
            font-weight: 600;
        }
        #ds-scraper-ultimate .mode-btn:hover {
            border-color: rgba(255, 255, 255, 0.2);
        }
        #ds-scraper-ultimate .btn-group {
            display: flex;
            flex-direction: column;
            gap: 10px;
            margin-bottom: 18px;
        }
        #ds-scraper-ultimate button {
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
        #ds-scraper-ultimate button:hover {
            background: rgba(60, 75, 95, 0.8);
            border-color: rgba(255, 255, 255, 0.15);
            transform: translateY(-1px);
            box-shadow: 0 6px 12px rgba(0, 0, 0, 0.2);
        }
        #ds-scraper-ultimate button:active {
            transform: translateY(1px);
            box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
        }
        #ds-scraper-ultimate button.primary {
            background: linear-gradient(145deg, #5f7eb0, #4a6792);
            border: 1px solid rgba(255, 255, 255, 0.2);
            color: white;
            font-weight: 600;
            box-shadow: 0 4px 12px rgba(74, 103, 146, 0.3);
        }
        #ds-scraper-ultimate button.primary:hover {
            background: linear-gradient(145deg, #6f8ec0, #5675a0);
            box-shadow: 0 8px 18px rgba(74, 103, 146, 0.4);
        }
        #ds-scraper-ultimate button.warning {
            background: linear-gradient(145deg, #e0b070, #c89050);
            border: 1px solid rgba(255, 255, 255, 0.2);
            color: white;
            font-weight: 600;
        }
        #ds-scraper-ultimate button.stop {
            background: linear-gradient(145deg, #b55a6b, #9e4a5a);
            border: 1px solid rgba(255, 255, 255, 0.15);
            color: white;
            box-shadow: 0 4px 12px rgba(180, 70, 90, 0.25);
        }
        #ds-scraper-ultimate button.stop:hover {
            background: linear-gradient(145deg, #c56a7b, #ae5a6a);
            box-shadow: 0 8px 18px rgba(180, 70, 90, 0.35);
        }
        #ds-scraper-ultimate button:disabled {
            opacity: 0.45;
            filter: grayscale(0.5);
            transform: none;
            box-shadow: none;
            pointer-events: none;
        }
        #ds-scraper-ultimate .config-section {
            background: rgba(0, 0, 0, 0.2);
            border-radius: 16px;
            padding: 14px 16px;
            margin: 18px 0;
            border: 1px solid rgba(255, 255, 255, 0.03);
        }
        #ds-scraper-ultimate .config-row {
            display: flex;
            align-items: center;
            gap: 12px;
            margin-bottom: 12px;
            color: #b0c2da;
            font-size: 13px;
        }
        #ds-scraper-ultimate .config-row:last-child {
            margin-bottom: 0;
        }
        #ds-scraper-ultimate .config-row label {
            width: 60px;
            display: flex;
            align-items: center;
            gap: 6px;
            opacity: 0.85;
            flex-shrink: 0;
        }
        #ds-scraper-ultimate .config-row input,
        #ds-scraper-ultimate .config-row select {
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
        #ds-scraper-ultimate .config-row select {
            cursor: pointer;
        }
        #ds-scraper-ultimate .config-row input:focus,
        #ds-scraper-ultimate .config-row select:focus {
            outline: none;
            border-color: #7f9bc2;
            background: rgba(30, 40, 55, 0.8);
            box-shadow: 0 0 0 3px rgba(127, 155, 194, 0.2);
        }
        #ds-scraper-ultimate .config-row input::placeholder {
            color: #6a7a94;
            font-weight: 400;
        }
        #ds-scraper-ultimate .section-title {
            font-size: 11px;
            color: #89b4fa;
            margin: 10px 0 4px;
            border-top: 1px solid rgba(255,255,255,0.06);
            padding-top: 8px;
        }
        #ds-scraper-ultimate .status-area {
            margin: 18px 0 12px;
        }
        #ds-scraper-ultimate .status {
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
        #ds-scraper-ultimate .progress-container {
            margin: 12px 0 6px;
        }
        #ds-scraper-ultimate .progress {
            height: 6px;
            background: rgba(0, 0, 0, 0.4);
            border-radius: 20px;
            overflow: hidden;
            box-shadow: inset 0 1px 3px rgba(0,0,0,0.3);
        }
        #ds-scraper-ultimate .progress-bar {
            height: 100%;
            width: 0%;
            background: linear-gradient(90deg, #8fc1a0, #a8d8b9);
            border-radius: 20px;
            transition: width 0.2s ease;
            box-shadow: 0 0 8px rgba(143, 193, 160, 0.5);
        }
        #ds-scraper-ultimate .footer-note {
            font-size: 11px;
            color: #8a9bb5;
            text-align: center;
            margin-top: 16px;
            opacity: 0.75;
            letter-spacing: 0.2px;
        }
        #ds-scraper-ultimate .ua-tip {
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
        #ds-scraper-ultimate .badge {
            background: rgba(127, 155, 194, 0.15);
            padding: 2px 8px;
            border-radius: 30px;
            font-size: 11px;
            color: #b0c2da;
            border: 1px solid rgba(255,255,255,0.05);
        }
        .single-mode-only { display: block; }
        .batch-mode-only { display: none; }
    `;
    document.head.appendChild(style);

    // ---------- 菜单 HTML ----------
    const menu = document.createElement('div');
    menu.id = 'ds-scraper-ultimate';
    menu.innerHTML = `
        <div class="collapse-icon" style="display:none;">📜</div>
        <div class="panel-content">
            <div class="header">
                <h3>对话抓取器 <span class="badge">v6.0</span></h3>
                <div class="header-actions">
                    <span class="collapse-header-btn" title="折叠面板">▼</span>
                    <span class="close-btn" title="关闭">×</span>
                </div>
            </div>
            
            <div class="mode-switch">
                <div class="mode-btn active" data-mode="single">📄 单对话</div>
                <div class="mode-btn" data-mode="batch">📦 批量抓取</div>
            </div>
            
            <!-- 单对话按钮 -->
            <div class="btn-group single-mode-only" id="single-btns">
                <button id="ds-scrape-up" class="primary">⬆ 向上滚动抓取</button>
                <button id="ds-scrape-down" class="primary">⬇ 向下滚动抓取</button>
                <button id="ds-scrape-all" class="primary">🔄 抓取全部 (先上后下)</button>
            </div>
            
            <!-- 批量按钮 -->
            <div class="btn-group batch-mode-only" id="batch-btns">
                <button id="ds-batch-start" class="primary">▶ 开始批量抓取</button>
                <button id="ds-batch-pause" class="warning">⏸ 暂停并保存</button>
                <button id="ds-batch-stop" class="stop">⏹ 停止 (不保存)</button>
            </div>
            
            <div class="config-section">
                <div class="config-row">
                    <label>⏱️ 间隔</label>
                    <input id="ds-interval" type="number" min="10" max="5000" value="40" step="10">
                    <span style="opacity:0.6; font-size:12px;">ms</span>
                </div>
                <div class="config-row">
                    <label>📏 步长</label>
                    <input id="ds-step" type="number" min="100" max="2000" value="800" step="50">
                    <span style="opacity:0.6; font-size:12px;">px</span>
                </div>
            </div>
            
            <!-- 批量独有 -->
            <div class="batch-mode-only">
                <div class="section-title">🔍 关键词过滤（留空=全部抓取）</div>
                <div class="config-row">
                    <input id="ds-filter-keyword" type="text" placeholder="输入关键词，如：第几代">
                </div>
                <div class="section-title">📁 导出方式</div>
                <div class="config-row">
                    <select id="ds-export-mode">
                        <option value="separate">📂 每个对话独立文件</option>
                        <option value="merge">💾 合并为一个文件</option>
                    </select>
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
            
            <div class="footer-note" id="footer-note">
                💡 自动滚动并保存 · 文件为 TXT 格式
            </div>
            <div class="ua-tip">
                💻 提示：使用电脑UA（桌面版网站）效果更佳
            </div>
        </div>
    `;
    document.body.appendChild(menu);

    // ---------- 折叠逻辑 ----------
    const collapseHeaderBtn = menu.querySelector('.collapse-header-btn');
    const collapseIcon = menu.querySelector('.collapse-icon');
    let isCollapsed = false;

    collapseHeaderBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        isCollapsed = !isCollapsed;
        if (isCollapsed) {
            menu.classList.add('collapsed');
            collapseHeaderBtn.style.display = 'none';
            collapseIcon.style.display = 'flex';
            statusDiv.innerText = '📦 面板已折叠';
        } else {
            menu.classList.remove('collapsed');
            collapseHeaderBtn.style.display = 'flex';
            collapseIcon.style.display = 'none';
        }
    });

    menu.addEventListener('click', (e) => {
        if (isCollapsed && e.target === menu || e.target === collapseIcon) {
            isCollapsed = false;
            menu.classList.remove('collapsed');
            collapseHeaderBtn.style.display = 'flex';
            collapseIcon.style.display = 'none';
        }
    });

    // ---------- 模式切换 ----------
    const modeBtns = menu.querySelectorAll('.mode-btn');
    const singleBtns = document.getElementById('single-btns');
    const batchBtns = document.getElementById('batch-btns');
    const batchOnlyEls = menu.querySelectorAll('.batch-mode-only');
    const singleOnlyEls = menu.querySelectorAll('.single-mode-only');
    const footerNote = document.getElementById('footer-note');
    let currentMode = 'single';

    function setMode(mode) {
        currentMode = mode;
        modeBtns.forEach(b => b.classList.remove('active'));
        const activeBtn = menu.querySelector(`.mode-btn[data-mode="${mode}"]`);
        if (activeBtn) activeBtn.classList.add('active');

        if (mode === 'single') {
            singleBtns.style.display = 'flex';
            batchBtns.style.display = 'none';
            batchOnlyEls.forEach(el => el.style.display = 'none');
            singleOnlyEls.forEach(el => el.style.display = 'block');
            footerNote.innerHTML = '💡 自动滚动并保存 · 文件为 TXT 格式';
        } else {
            singleBtns.style.display = 'none';
            batchBtns.style.display = 'flex';
            batchOnlyEls.forEach(el => el.style.display = 'block');
            singleOnlyEls.forEach(el => el.style.display = 'none');
            footerNote.innerHTML = '💡 预筛选加速 · 合并文件带标题';
        }
    }

    modeBtns.forEach(btn => {
        btn.addEventListener('click', () => setMode(btn.dataset.mode));
    });

    // ---------- 拖动功能 ----------
    let isDragging = false, offsetX, offsetY;
    const header = menu.querySelector('.header');
    header.addEventListener('mousedown', (e) => {
        if (e.target.tagName === 'BUTTON' || e.target.classList.contains('close-btn') || 
            e.target.classList.contains('collapse-header-btn') || e.target.tagName === 'INPUT' || 
            e.target.tagName === 'SELECT' || e.target.classList.contains('mode-btn')) return;
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
    const batchStartBtn = document.getElementById('ds-batch-start');
    const batchPauseBtn = document.getElementById('ds-batch-pause');
    const batchStopBtn = document.getElementById('ds-batch-stop');
    const statusDiv = document.getElementById('ds-status');
    const progressBar = document.getElementById('ds-progress');
    const closeBtn = menu.querySelector('.close-btn');
    const intervalInput = document.getElementById('ds-interval');
    const stepInput = document.getElementById('ds-step');
    const filterInput = document.getElementById('ds-filter-keyword');
    const exportSelect = document.getElementById('ds-export-mode');

    // ---------- 公共工具 ----------
    const sleep = ms => new Promise(r => setTimeout(r, ms));

    function findScrollContainer() {
        const candidates = [];
        document.querySelectorAll('div').forEach(div => {
            const style = window.getComputedStyle(div);
            if ((style.overflowY === 'auto' || style.overflowY === 'scroll') && div.scrollHeight > div.clientHeight) {
                candidates.push(div);
            }
        });
        if (candidates.length === 0) return document.scrollingElement || document.documentElement;
        candidates.sort((a, b) => (b.clientWidth * b.clientHeight) - (a.clientWidth * a.clientHeight));
        return candidates[0];
    }

    function getChatLinks() {
        return Array.from(document.querySelectorAll('a[href*="/a/chat/s/"]'));
    }

    function getCurrentChatLink() {
        const currentPath = window.location.pathname + window.location.search;
        return getChatLinks().find(a => a.href.includes(currentPath));
    }

    // ==================== 单对话模式 ====================
    let isSingleRunning = false;
    let singleStopRequested = false;
    let singleMessages = [];
    let singleSeen = new Set();
    let singleInterval = null;
    let singleDirection = null;
    let singleContainer = null;

    function singleExtractMessages() {
        const selectors = ['[data-message-id]', '.prose', '.whitespace-pre-wrap', '[class*="message"]', '[data-testid*="message"]', '.chat-message', '.conversation-turn'];
        const elements = new Set();
        selectors.forEach(s => document.querySelectorAll(s).forEach(e => elements.add(e)));
        const newMsgs = [];
        elements.forEach(el => {
            const text = el.textContent.trim();
            if (text.length < 5) return;
            const key = text.slice(0, 60) + text.length;
            if (!singleSeen.has(key)) {
                singleSeen.add(key);
                newMsgs.push(text);
            }
        });
        return newMsgs;
    }

    function singleUpdateStatus() {
        const newMsgs = singleExtractMessages();
        if (newMsgs.length > 0) singleMessages.push(...newMsgs);
        const totalChars = singleMessages.reduce((sum, t) => sum + t.length, 0);
        statusDiv.innerText = `📊 已收集 ${singleMessages.length} 条 · ${(totalChars/1024).toFixed(1)} KB`;
        if (singleContainer) {
            const progress = (singleContainer.scrollTop / (singleContainer.scrollHeight - singleContainer.clientHeight)) * 100;
            progressBar.style.width = Math.min(progress, 100) + '%';
        }
    }

    function singleSave() {
        if (singleMessages.length === 0) { alert('没有抓取到任何内容'); return; }
        const title = document.title.replace(/[\\/:*?"<>|]/g, '_').trim() || 'deepseek_chat';
        const content = singleMessages.join('\n\n---\n\n');
        const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = `${title}_${new Date().toISOString().slice(0,19).replace(/:/g,'-')}.txt`;
        a.click();
        URL.revokeObjectURL(a.href);
    }

    function singleScrollStep() {
        if (!isSingleRunning || singleStopRequested || !singleContainer) return;
        const step = parseInt(stepInput.value);
        const before = singleContainer.scrollTop;
        singleContainer.scrollBy({ top: singleDirection === 'up' ? -step : step, behavior: 'auto' });
        setTimeout(() => {
            if (!isSingleRunning || singleStopRequested) return;
            const after = singleContainer.scrollTop;
            singleUpdateStatus();
            const atTop = after <= 0;
            const atBottom = (after + singleContainer.clientHeight) >= singleContainer.scrollHeight - 5;
            if ((singleDirection === 'up' && atTop) || (singleDirection === 'down' && atBottom)) {
                statusDiv.innerText = `⏸️ 已到达${singleDirection === 'up' ? '顶部' : '底部'}`;
                singleStop();
                return;
            }
            if (Math.abs(after - before) < 5) {
                if (!window.__noChange) window.__noChange = 0;
                window.__noChange++;
                if (window.__noChange >= 3) { statusDiv.innerText = '⚠️ 滚动无变化'; singleStop(); return; }
            } else window.__noChange = 0;
        }, 200);
    }

    function singleStart(direction) {
        if (isSingleRunning) return;
        isSingleRunning = true;
        singleStopRequested = false;
        singleDirection = direction;
        window.__noChange = 0;
        upBtn.disabled = downBtn.disabled = allBtn.disabled = true;
        batchStartBtn.disabled = true;
        singleContainer = findScrollContainer();
        singleSeen.clear();
        singleMessages = [];
        singleUpdateStatus();
        const intervalTime = parseInt(intervalInput.value);
        singleInterval = setInterval(singleScrollStep, intervalTime);
        statusDiv.innerText = direction === 'up' ? '⬆ 向上滚动中...' : '⬇ 向下滚动中...';
    }

    function singleStartAll() {
        if (isSingleRunning) return;
        singleStart('up');
        const check = setInterval(() => { if (!isSingleRunning) { clearInterval(check); setTimeout(() => singleStart('down'), 500); } }, 500);
    }

    function singleStop() {
        singleStopRequested = true;
        isSingleRunning = false;
        if (singleInterval) { clearInterval(singleInterval); singleInterval = null; }
        upBtn.disabled = downBtn.disabled = allBtn.disabled = false;
        batchStartBtn.disabled = false;
        singleSave();
        progressBar.style.width = '0%';
        window.__noChange = 0;
    }

    // ==================== 批量模式 ====================
    let isBatchRunning = false;
    let batchStopRequested = false;
    let batchPaused = false;
    let batchProcessed = new Set();
    let batchCurrentMessages = [];
    let batchCurrentTitle = '';
    let batchCollected = new Set();
    let allChatContents = [];

    function batchUpdateProgress(container) {
        if (!container) return;
        const s = container === document.scrollingElement ? document.documentElement : container;
        const pct = s.scrollHeight <= s.clientHeight ? 100 : (s.scrollTop / (s.scrollHeight - s.clientHeight)) * 100;
        progressBar.style.width = Math.min(pct, 100) + '%';
    }

    function batchGetVisibleTexts() {
        const selectors = ['[data-message-id]', '.prose', '.whitespace-pre-wrap', '[class*="message"]', '.chat-message'];
        const texts = [];
        const seen = new Set();
        selectors.forEach(s => document.querySelectorAll(s).forEach(e => {
            const txt = e.textContent.trim();
            if (txt.length >= 5) { const key = txt.slice(0, 60) + txt.length; if (!seen.has(key)) { seen.add(key); texts.push(txt); } }
        }));
        return texts;
    }

    function batchIncrementalExtract() {
        const texts = batchGetVisibleTexts();
        texts.forEach(txt => {
            const key = txt.slice(0, 60) + txt.length;
            if (!batchCollected.has(key)) { batchCollected.add(key); batchCurrentMessages.push(txt); }
        });
    }

    function batchGetAllLinksWithTitles() {
        return getChatLinks().map(a => {
            const title = a.textContent.trim().slice(0, 40).replace(/[\\/:*?"<>|]/g, '_') || 'untitled';
            return { element: a, href: a.href, title };
        });
    }

    function batchFindChatByHref(href) {
        return getChatLinks().find(a => a.href === href);
    }

    async function batchClickLink(link) {
        if (!link) return false;
        const oldPath = window.location.pathname;
        link.click();
        for (let i = 0; i < 50; i++) { await sleep(100); if (window.location.pathname !== oldPath) return true; }
        return false;
    }

    function batchGetTitle() {
        const current = getCurrentChatLink();
        if (current) return current.textContent.trim().slice(0, 40).replace(/[\\/:*?"<>|]/g, '_') || 'untitled';
        return document.title.replace(/[\\/:*?"<>|]/g, '_').slice(0, 40) || 'untitled';
    }

    function batchSave(title, messages) {
        if (messages.length === 0) return;
        if (exportSelect.value === 'merge') {
            allChatContents.push({ title, content: messages.join('\n\n---\n\n') });
        } else {
            const blob = new Blob([messages.join('\n\n---\n\n')], { type: 'text/plain' });
            const a = document.createElement('a');
            a.href = URL.createObjectURL(blob);
            a.download = `${title}_${new Date().toISOString().slice(0,19).replace(/:/g,'-')}.txt`;
            a.click();
        }
    }

    function batchExportMerged() {
        if (allChatContents.length === 0) return;
        const merged = allChatContents.map(c => `===== ${c.title} =====\n\n${c.content}`).join('\n\n\n');
        const blob = new Blob([merged], { type: 'text/plain' });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = `deepseek_merged_${new Date().toISOString().slice(0,19).replace(/:/g,'-')}.txt`;
        a.click();
    }

    async function batchQuickToTop(container) {
        while (!batchStopRequested && !batchPaused) {
            const before = container.scrollTop;
            container.scrollBy({ top: -5000, behavior: 'auto' });
            await sleep(2);
            if (container.scrollTop <= 0 || Math.abs(container.scrollTop - before) < 5) break;
        }
    }

    async function batchScrollDown(container) {
        let noChange = 0, counter = 0;
        while (!batchStopRequested && !batchPaused) {
            const step = parseInt(stepInput.value), interval = parseInt(intervalInput.value);
            const before = container.scrollTop;
            container.scrollBy({ top: step, behavior: 'auto' });
            batchUpdateProgress(container);
            await sleep(interval);
            batchIncrementalExtract();
            if (++counter % 3 === 0) statusDiv.innerHTML = `📄 抓取中: ${batchCurrentTitle}<br>已收集 ${batchCurrentMessages.length} 条`;
            if (Math.abs(container.scrollTop - before) < 5) { if (++noChange >= 3) break; } else noChange = 0;
            if (container.scrollTop + container.clientHeight >= container.scrollHeight - 5) break;
        }
        batchIncrementalExtract();
    }

    async function batchScrollUp(container) {
        let noChange = 0, counter = 0;
        while (!batchStopRequested && !batchPaused) {
            const step = parseInt(stepInput.value), interval = parseInt(intervalInput.value);
            const before = container.scrollTop;
            container.scrollBy({ top: -step, behavior: 'auto' });
            batchUpdateProgress(container);
            await sleep(interval);
            batchIncrementalExtract();
            if (++counter % 3 === 0) statusDiv.innerHTML = `📄 抓取中: ${batchCurrentTitle}<br>已收集 ${batchCurrentMessages.length} 条`;
            if (Math.abs(container.scrollTop - before) < 5) { if (++noChange >= 3) break; } else noChange = 0;
            if (container.scrollTop <= 0) break;
        }
        batchIncrementalExtract();
    }

    async function batchScrapeCurrent() {
        batchCurrentTitle = batchGetTitle();
        statusDiv.innerHTML = `📄 抓取中: ${batchCurrentTitle}`;
        progressBar.style.width = '0%';
        batchCollected.clear();
        batchCurrentMessages = [];
        const container = findScrollContainer();
        if (!container) return;
        await batchQuickToTop(container);
        if (batchStopRequested) return;
        await batchScrollDown(container);
        if (batchStopRequested) return;
        await sleep(500);
        await batchScrollUp(container);
        statusDiv.innerHTML = `✅ ${batchCurrentTitle}: ${batchCurrentMessages.length} 条`;
        progressBar.style.width = '100%';
    }

    function batchPrescan() {
        const keyword = filterInput.value.trim().toLowerCase();
        if (!keyword) return null;
        return batchGetAllLinksWithTitles().filter(c => c.title.toLowerCase().includes(keyword));
    }

    async function batchStart() {
        isBatchRunning = true;
        batchStopRequested = false;
        batchPaused = false;
        batchProcessed.clear();
        allChatContents = [];
        batchStartBtn.disabled = true;
        batchPauseBtn.disabled = false;
        batchStopBtn.disabled = false;
        upBtn.disabled = downBtn.disabled = allBtn.disabled = true;

        const keyword = filterInput.value.trim();
        const matches = batchPrescan();

        if (matches !== null) {
            const total = batchGetAllLinksWithTitles().length;
            statusDiv.innerHTML = `🔍 筛选: "${keyword}"<br>找到 ${matches.length} 个 (共 ${total} 个)`;
            if (matches.length === 0) { batchCleanup(); statusDiv.innerHTML = '⚠️ 无匹配对话'; return; }
            const first = matches[0];
            const currentEl = getCurrentChatLink();
            if (!currentEl || currentEl.href !== first.href) { const el = batchFindChatByHref(first.href); if (el) { await batchClickLink(el); await sleep(2000); } }
            for (let i = 0; i < matches.length; i++) {
                if (batchStopRequested || batchPaused) break;
                const chat = matches[i];
                if (batchProcessed.has(chat.href)) continue;
                const curLink = getCurrentChatLink();
                if (!curLink || curLink.href !== chat.href) { const el = batchFindChatByHref(chat.href); if (!el) continue; await batchClickLink(el); await sleep(2000); }
                await batchScrapeCurrent();
                if (batchStopRequested) break;
                if (batchCurrentMessages.length > 0) { batchSave(batchCurrentTitle, batchCurrentMessages); batchProcessed.add(chat.href); }
            }
            statusDiv.innerHTML = `🎉 完成！共抓取 ${batchProcessed.size} 个`;
        } else {
            const links = getChatLinks();
            if (links.length === 0) { batchCleanup(); statusDiv.innerHTML = '❌ 未找到对话链接'; return; }
            let current = getCurrentChatLink();
            if (!current) { await batchClickLink(links[0]); await sleep(2000); }
            while (!batchStopRequested && !batchPaused) {
                const cur = getCurrentChatLink();
                if (!cur) break;
                if (batchProcessed.has(cur.href)) {
                    const idx = getChatLinks().indexOf(cur);
                    const next = idx >= 0 && idx < links.length - 1 ? links[idx + 1] : null;
                    if (!next) break;
                    await batchClickLink(next); await sleep(2000);
                    continue;
                }
                await batchScrapeCurrent();
                if (batchStopRequested) break;
                if (batchCurrentMessages.length > 0) { batchSave(batchCurrentTitle, batchCurrentMessages); batchProcessed.add(cur.href); }
                const idx = getChatLinks().indexOf(cur);
                const next = idx >= 0 && idx < links.length - 1 ? links[idx + 1] : null;
                if (!next) { statusDiv.innerHTML = `🎉 完成！共 ${batchProcessed.size} 个`; break; }
                await batchClickLink(next); await sleep(2000);
            }
        }

        if (exportSelect.value === 'merge' && allChatContents.length > 0) batchExportMerged();
        batchCleanup();
    }

    function batchCleanup() {
        isBatchRunning = false;
        batchStartBtn.disabled = false;
        batchPauseBtn.disabled = true;
        batchStopBtn.disabled = true;
        upBtn.disabled = downBtn.disabled = allBtn.disabled = false;
        progressBar.style.width = '0%';
    }

    function batchTogglePause() {
        if (!isBatchRunning) return;
        batchPaused = !batchPaused;
        batchPauseBtn.textContent = batchPaused ? '▶ 继续' : '⏸ 暂停并保存';
        if (!batchPaused) { batchStart(); }
        else {
            if (batchCurrentMessages.length > 0) {
                const href = getCurrentChatLink()?.href;
                if (href && !batchProcessed.has(href)) { batchSave(batchCurrentTitle, batchCurrentMessages); batchProcessed.add(href); }
            }
            if (exportSelect.value === 'merge' && allChatContents.length > 0) batchExportMerged();
        }
    }

    function batchRequestStop() {
        batchStopRequested = true;
        batchPaused = false;
    }

    // ---------- 事件绑定 ----------
    upBtn.addEventListener('click', () => singleStart('up'));
    downBtn.addEventListener('click', () => singleStart('down'));
    allBtn.addEventListener('click', singleStartAll);
    batchStartBtn.addEventListener('click', batchStart);
    batchPauseBtn.addEventListener('click', batchTogglePause);
    batchStopBtn.addEventListener('click', batchRequestStop);

    // 统一停止按钮（单对话和批量各自管理，无需额外处理）

    closeBtn.addEventListener('click', () => {
        if (isSingleRunning || isBatchRunning) {
            if (confirm('正在抓取中，确定关闭？')) {
                if (isSingleRunning) singleStop();
                batchRequestStop();
                menu.remove();
                window.__dsScraperUltimate = false;
            }
        } else {
            menu.remove();
            window.__dsScraperUltimate = false;
        }
    });

    window.addEventListener('beforeunload', () => {
        if (isSingleRunning) singleStop();
        batchRequestStop();
    });
})();
