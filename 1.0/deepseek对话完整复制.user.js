// ==UserScript==
// @name         deepseek对话完整复制
// @namespace    http://tampermonkey.net/
// @version      1.2
// @description  自动滚动加载 DeepSeek 对话页面，保存完整对话为 txt 文件
// @author       你
// @match        https://chat.deepseek.com/*
// @grant        none
// ==/UserScript==

(function() {
    'use strict';

    if (window.__deepseekScraperGUI) return;
    window.__deepseekScraperGUI = true;

    // ---------- 样式 (深色主题，适配 DeepSeek 风格) ----------
    const style = document.createElement('style');
    style.textContent = `
        #ds-scraper-gui {
            position: fixed;
            top: 80px;
            right: 20px;
            z-index: 999999;
            background: #1e1e2e;
            color: #cdd6f4;
            border-radius: 12px;
            box-shadow: 0 8px 20px rgba(0,0,0,0.5);
            font-family: system-ui, -apple-system, sans-serif;
            font-size: 13px;
            width: 300px;
            padding: 16px;
            user-select: none;
            border: 1px solid #313244;
            backdrop-filter: blur(4px);
        }
        #ds-scraper-gui h3 {
            margin: 0 0 12px 0;
            text-align: center;
            color: #89b4fa;
            font-size: 16px;
            border-bottom: 1px solid #313244;
            padding-bottom: 8px;
            cursor: move;
        }
        #ds-scraper-gui button {
            display: block;
            width: 100%;
            margin: 8px 0;
            padding: 10px;
            border: none;
            border-radius: 6px;
            background: #313244;
            color: #cdd6f4;
            font-weight: bold;
            cursor: pointer;
            transition: 0.2s;
            border: 1px solid #45475a;
            font-size: 13px;
        }
        #ds-scraper-gui button:hover {
            background: #45475a;
        }
        #ds-scraper-gui button.primary {
            background: #89b4fa;
            color: #1e1e2e;
            border-color: #89b4fa;
        }
        #ds-scraper-gui button.primary:hover {
            background: #b4befe;
        }
        #ds-scraper-gui button.stop {
            background: #f38ba8;
            color: #1e1e2e;
            border-color: #f38ba8;
        }
        #ds-scraper-gui .status {
            margin: 12px 0 8px;
            font-size: 12px;
            color: #a6adc8;
            text-align: center;
            min-height: 32px;
        }
        #ds-scraper-gui .progress {
            height: 6px;
            background: #313244;
            border-radius: 3px;
            overflow: hidden;
            margin: 8px 0;
        }
        #ds-scraper-gui .progress-bar {
            height: 100%;
            width: 0%;
            background: #a6e3a1;
            transition: width 0.1s;
        }
        #ds-scraper-gui .close-btn {
            float: right;
            cursor: pointer;
            color: #6c7086;
            font-size: 18px;
            line-height: 1;
            margin-left: 8px;
        }
        #ds-scraper-gui .close-btn:hover {
            color: #f38ba8;
        }
        #ds-scraper-gui .config-row {
            display: flex;
            align-items: center;
            gap: 8px;
            margin: 8px 0;
            color: #a6adc8;
            font-size: 12px;
        }
        #ds-scraper-gui .config-row input {
            flex: 1;
            background: #313244;
            border: 1px solid #45475a;
            color: #cdd6f4;
            padding: 4px 8px;
            border-radius: 4px;
            font-size: 12px;
        }
        #ds-scraper-gui .note {
            font-size: 11px;
            color: #6c7086;
            text-align: center;
            margin-top: 10px;
        }
    `;
    document.head.appendChild(style);

    // ---------- 菜单 HTML ----------
    const menu = document.createElement('div');
    menu.id = 'ds-scraper-gui';
    menu.innerHTML = `
        <div style="display: flex; justify-content: space-between; align-items: center;">
            <h3 style="margin:0; border:none; padding:0; cursor:move; flex:1;">📜 对话抓取器</h3>
            <span class="close-btn" title="关闭">×</span>
        </div>
        <button id="ds-scrape-up" class="primary">⬆ 向上滚动抓取</button>
        <button id="ds-scrape-down" class="primary">⬇ 向下滚动抓取</button>
        <button id="ds-scrape-all" class="primary">🔄 抓取全部 (先上后下)</button>
        <button id="ds-stop" class="stop" disabled>⏹ 停止</button>
        <div class="config-row">
            <span>⏱️ 间隔(ms):</span>
            <input id="ds-interval" type="number" min="500" max="5000" value="1200" step="100">
        </div>
        <div class="config-row">
            <span>📏 步长(px):</span>
            <input id="ds-step" type="number" min="100" max="1000" value="400" step="50">
        </div>
        <div class="status" id="ds-status">就绪，点击按钮开始</div>
        <div class="progress">
            <div class="progress-bar" id="ds-progress"></div>
        </div>
        <div class="note">
            💡 自动滚动并保存全部对话<br>
            📁 停止后自动下载 txt 文件<br>
            ⚡ 滚动容器自动识别
        </div>
    `;
    document.body.appendChild(menu);

    // ---------- 拖动功能 ----------
    let isDragging = false, offsetX, offsetY;
    const header = menu.querySelector('h3');
    header.addEventListener('mousedown', (e) => {
        if (e.target.tagName === 'BUTTON' || e.target.classList.contains('close-btn')) return;
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

    // ---------- 元素 ----------
    const upBtn = document.getElementById('ds-scrape-up');
    const downBtn = document.getElementById('ds-scrape-down');
    const allBtn = document.getElementById('ds-scrape-all');
    const stopBtn = document.getElementById('ds-stop');
    const statusDiv = document.getElementById('ds-status');
    const progressBar = document.getElementById('ds-progress');
    const closeBtn = menu.querySelector('.close-btn');
    const intervalInput = document.getElementById('ds-interval');
    const stepInput = document.getElementById('ds-step');

    // ---------- 状态 ----------
    let isRunning = false;
    let stopRequested = false;
    let collectedMessages = new Set();      // 去重用
    let fullText = [];
    let scrollInterval = null;
    let currentDirection = null;
    let scrollContainer = null;

    // ---------- 核心函数：定位滚动容器 ----------
    function findScrollContainer() {
        // DeepSeek 页面常见滚动容器特征
        const candidates = [];
        const allDivs = document.querySelectorAll('div');
        for (let div of allDivs) {
            const style = window.getComputedStyle(div);
            if ((style.overflowY === 'auto' || style.overflowY === 'scroll') && div.scrollHeight > div.clientHeight) {
                candidates.push(div);
            }
        }
        if (candidates.length === 0) return document.scrollingElement || document.documentElement;
        
        // 选择面积最大且可滚动的元素（通常是主内容区）
        candidates.sort((a, b) => (b.clientWidth * b.clientHeight) - (a.clientWidth * a.clientHeight));
        return candidates[0];
    }

    // 提取所有可见消息文本
    function extractMessages() {
        // 消息选择器 (覆盖 DeepSeek 各种可能类名)
        const selectors = [
            '[data-message-id]',
            '.prose',
            '.whitespace-pre-wrap',
            '[class*="message"]',
            '[data-testid*="message"]',
            '.chat-message',
            '.conversation-turn'
        ];
        const elements = new Set();
        for (let sel of selectors) {
            document.querySelectorAll(sel).forEach(el => elements.add(el));
        }

        const newMessages = [];
        for (let el of elements) {
            const text = el.textContent.trim();
            if (text.length < 5) continue;
            // 使用前60字符+长度作为去重key
            const key = text.slice(0, 60) + '_' + text.length;
            if (!collectedMessages.has(key)) {
                collectedMessages.add(key);
                newMessages.push(text);
            }
        }
        return newMessages;
    }

    // 更新状态与进度条
    function updateStatusAndProgress() {
        const newMsgs = extractMessages();
        if (newMsgs.length > 0) {
            fullText.push(...newMsgs);
        }
        const totalChars = fullText.reduce((sum, t) => sum + t.length, 0);
        statusDiv.innerText = `📊 已收集 ${fullText.length} 条消息，${totalChars} 字符`;

        if (scrollContainer) {
            const progress = (scrollContainer.scrollTop / (scrollContainer.scrollHeight - scrollContainer.clientHeight)) * 100;
            progressBar.style.width = Math.min(progress, 100) + '%';
        }
        return newMsgs.length;
    }

    // 保存为 txt 文件
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

    // 滚动一步
    function scrollStep() {
        if (!isRunning || stopRequested || !scrollContainer) return;

        const step = parseInt(stepInput.value, 10);
        const beforeTop = scrollContainer.scrollTop;

        // 执行滚动
        if (currentDirection === 'up') {
            scrollContainer.scrollBy({ top: -step, behavior: 'auto' });
        } else {
            scrollContainer.scrollBy({ top: step, behavior: 'auto' });
        }

        // 等待新内容渲染 (由主循环控制间隔，这里只是收集)
        setTimeout(() => {
            if (!isRunning || stopRequested) return;

            const afterTop = scrollContainer.scrollTop;
            updateStatusAndProgress();

            // 判断是否到达边界
            const atTop = afterTop <= 0;
            const atBottom = (afterTop + scrollContainer.clientHeight) >= scrollContainer.scrollHeight - 5;

            if ((currentDirection === 'up' && atTop) || (currentDirection === 'down' && atBottom)) {
                statusDiv.innerText = `⏸️ 已到达${currentDirection === 'up' ? '顶部' : '底部'}`;
                stop();
                return;
            }

            // 如果滚动位置几乎没变，可能卡住或到底了（给两次机会）
            if (Math.abs(afterTop - beforeTop) < 5) {
                if (!window.__noChangeCount) window.__noChangeCount = 0;
                window.__noChangeCount++;
                if (window.__noChangeCount >= 3) {
                    statusDiv.innerText = '⚠️ 滚动无变化，可能已到底或加载慢';
                    stop();
                    return;
                }
            } else {
                window.__noChangeCount = 0;
            }
        }, 200); // 快速反馈
    }

    // 主循环
    function startScrolling(direction) {
        if (isRunning) return;
        isRunning = true;
        stopRequested = false;
        currentDirection = direction;
        window.__noChangeCount = 0;

        upBtn.disabled = downBtn.disabled = allBtn.disabled = true;
        stopBtn.disabled = false;

        // 定位滚动容器
        scrollContainer = findScrollContainer();
        console.log('DeepSeek Scraper: 滚动容器', scrollContainer);
        statusDiv.innerText = `🔍 容器: ${scrollContainer.tagName}.${scrollContainer.className}`;

        // 重置收集状态
        collectedMessages.clear();
        fullText = [];
        updateStatusAndProgress();

        // 设置定时器
        const intervalTime = parseInt(intervalInput.value, 10);
        scrollInterval = setInterval(() => {
            scrollStep();
        }, intervalTime);

        statusDiv.innerText = direction === 'up' ? '⬆ 向上滚动中...' : '⬇ 向下滚动中...';
    }

    function startAll() {
        if (isRunning) return;
        startScrolling('up');
        // 监听向上完成
        const checkUpDone = setInterval(() => {
            if (!isRunning) {
                clearInterval(checkUpDone);
                setTimeout(() => {
                    startScrolling('down');
                }, 500);
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

    // 绑定事件
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

    // 清理
    window.addEventListener('beforeunload', () => {
        if (isRunning) stop();
    });

})();
