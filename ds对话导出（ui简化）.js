// ==UserScript==
// @name         DeepSeek 对话抓取器
// @namespace    http://tampermonkey.net/
// @version      1.5
// @description  抓取 DeepSeek 对话记录，支持滚动自动捕获、URL变化检测
// @author       You
// @match        https://chat.deepseek.com/*
// @grant        none
// @run-at       document-end
// ==/UserScript==

(function() {
    'use strict';

    if (window.__deepseekScraperGUI) return;
    window.__deepseekScraperGUI = true;

    // ---------- 样式 ----------
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
            width: 320px;
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
            white-space: pre-line;
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
            <input id="ds-interval" type="number" min="200" max="5000" value="400" step="100">
        </div>
        <div class="config-row">
            <span>📏 步长(px):</span>
            <input id="ds-step" type="number" min="100" max="1000" value="300" step="50">
        </div>
        <div class="status" id="ds-status">就绪，点击按钮开始</div>
        <div class="progress">
            <div class="progress-bar" id="ds-progress"></div>
        </div>
        <div class="note">
            💡 自动滚动并保存全部对话<br>
            📁 停止后自动下载 HTML 文件<br>
            🔑 奇数=用户 偶数=助手
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
    let collectedMessages = new Map(); // key -> {key, type, content}
    let scrollInterval = null;
    let currentDirection = null;
    let scrollContainer = null;
    let observer = null;
    let currentUrl = window.location.href;

    // ---------- 定位滚动容器 ----------
    function findScrollContainer() {
        const virtualList = document.querySelector('.ds-virtual-list');
        if (virtualList) {
            let parent = virtualList.parentElement;
            while (parent) {
                const style = window.getComputedStyle(parent);
                if ((style.overflowY === 'auto' || style.overflowY === 'scroll') && parent.scrollHeight > parent.clientHeight) {
                    return parent;
                }
                parent = parent.parentElement;
            }
        }
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

    // ---------- 根据 key 奇偶判断消息类型 ----------
    function getMessageType(key) {
        return (key % 2 === 1) ? 'user' : 'assistant';
    }

    // ---------- 提取消息内容 ----------
    function getMessageContent(msg, key) {
        const type = getMessageType(key);

        if (type === 'user') {
            // 用户消息：取整个消息的 innerHTML，但去掉按钮等无关元素
            const clone = msg.cloneNode(true);
            const useless = clone.querySelectorAll('button, [role="button"], .ds-icon-button, .ds-flex.items-center');
            useless.forEach(el => el.remove());
            return clone.innerHTML;
        } else {
            // 助手消息：优先取 ds-markdown 内容（包含思考和回答）
            const thinkContent = msg.querySelector('div.ds-think-content');
            const assistantMain = msg.querySelector('div.ds-assistant-message-main-content');
            const markdownContent = msg.querySelector('div.ds-markdown');

            let fullContent = '';

            if (thinkContent) {
                fullContent += thinkContent.outerHTML;
            }

            if (assistantMain) {
                fullContent += assistantMain.innerHTML;
            } else if (markdownContent) {
                fullContent += markdownContent.outerHTML;
            } else {
                // 兜底：取整个消息的 innerHTML
                fullContent = msg.innerHTML;
            }

            return fullContent;
        }
    }

    // ---------- 提取所有可见消息 ----------
    function extractMessages() {
        const messages = document.querySelectorAll('div.ds-virtual-list div.ds-virtual-list-items div.ds-message');
        let newMessagesCount = 0;

        messages.forEach(msg => {
            let virtualItem = msg.closest('[data-virtual-list-item-key]');
            if (!virtualItem) return;

            const key = parseInt(virtualItem.getAttribute('data-virtual-list-item-key'));
            if (isNaN(key)) return;

            // 跳过已收集
            if (collectedMessages.has(key)) return;

            const type = getMessageType(key);
            const content = getMessageContent(msg, key);

            if (content && content.trim().length > 0) {
                collectedMessages.set(key, {
                    key: key,
                    type: type,
                    content: content,
                    timestamp: new Date().toISOString()
                });
                newMessagesCount++;
            }
        });

        return newMessagesCount;
    }

    // ---------- MutationObserver ----------
    // 滚动页面的过程中只要 `div.ds-virtual-list` 中的内容产生变化，就更新存储的信息
    function setupObserver() {
        if (observer) {
            observer.disconnect();
            observer = null;
        }

        const virtualList = document.querySelector('.ds-virtual-list');
        if (!virtualList) {
            console.warn('DeepSeek Scraper: 未找到 .ds-virtual-list');
            return;
        }

        observer = new MutationObserver((mutations) => {
            if (!isRunning) return;

            let hasNewContent = false;
            mutations.forEach(mutation => {
                if (mutation.type === 'childList') {
                    mutation.addedNodes.forEach(node => {
                        if (node.nodeType === 1) {
                            if (node.hasAttribute && node.hasAttribute('data-virtual-list-item-key')) {
                                hasNewContent = true;
                            }
                            if (node.querySelector && (node.querySelector('div.ds-message') || node.classList.contains('ds-message'))) {
                                hasNewContent = true;
                            }
                        }
                    });
                }
            });

            if (hasNewContent) {
                const newCount = extractMessages();
                if (newCount > 0) {
                    updateStatus();
                }
            }
        });

        observer.observe(virtualList, {
            childList: true,
            subtree: true
        });
    }

    // ---------- 更新状态 ----------
    function updateStatus() {
        const totalMessages = collectedMessages.size;
        const keys = Array.from(collectedMessages.keys()).sort((a, b) => a - b);
        const minKey = keys.length > 0 ? keys[0] : 'N/A';
        const maxKey = keys.length > 0 ? keys[keys.length - 1] : 'N/A';
        const users = keys.filter(k => k % 2 === 1).length;
        const assistants = keys.filter(k => k % 2 === 0).length;

        statusDiv.innerText = `📊 已收集 ${totalMessages} 条\n👤 用户: ${users} | 🤖 助手: ${assistants}\nKey 范围: ${minKey} - ${maxKey}`;

        if (scrollContainer) {
            const scrollTop = scrollContainer.scrollTop;
            const scrollHeight = scrollContainer.scrollHeight;
            const clientHeight = scrollContainer.clientHeight;
            if (scrollHeight > clientHeight) {
                const progress = (scrollTop / (scrollHeight - clientHeight)) * 100;
                progressBar.style.width = Math.min(Math.max(progress, 0), 100) + '%';
            }
        }
    }

    // ---------- 保存为 HTML 文件 ----------
    function saveToFile() {
        if (collectedMessages.size === 0) {
            alert('没有抓取到任何内容');
            return;
        }

        const sortedMessages = Array.from(collectedMessages.values())
            .sort((a, b) => a.key - b.key);

        const keys = sortedMessages.map(m => m.key);
        const minKey = keys[0];
        const maxKey = keys[keys.length - 1];
        const totalCount = sortedMessages.length;
        const userCount = sortedMessages.filter(m => m.type === 'user').length;
        const assistantCount = sortedMessages.filter(m => m.type === 'assistant').length;

        // 计算缺失的 key
        const expectedRange = maxKey - minKey + 1;
        const missingCount = expectedRange - totalCount;
        const missingKeys = [];
        for (let i = minKey; i <= maxKey; i++) {
            if (!collectedMessages.has(i)) {
                missingKeys.push(i);
            }
        }

        // 构建 html
        let htmlContent = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>DeepSeek 对话记录</title>
<style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
        font-family: system-ui, -apple-system, sans-serif;
        max-width: 900px;
        margin: 0 auto;
        padding: 20px;
        background: #1e1e2e;
        color: #cdd6f4;
        line-height: 1.6;
    }
    .header {
        text-align: center;
        padding: 30px 20px;
        border-bottom: 2px solid #45475a;
        margin-bottom: 30px;
    }
    .header h1 { color: #89b4fa; font-size: 24px; margin-bottom: 10px; }
    .header p { color: #6c7086; font-size: 14px; }
    .message {
        margin: 20px 0;
        padding: 20px;
        border-radius: 10px;
    }
    .message-key {
        font-size: 12px;
        color: #6c7086;
        margin-bottom: 12px;
        padding-bottom: 8px;
        border-bottom: 1px solid #45475a;
    }
    .message-key .badge {
        display: inline-block;
        padding: 2px 8px;
        border-radius: 12px;
        font-size: 11px;
        font-weight: bold;
    }
    .badge-user { background: #89b4fa33; color: #89b4fa; }
    .badge-assistant { background: #a6e3a133; color: #a6e3a1; }
    .user {
        background: #313244;
        border-left: 4px solid #89b4fa;
    }
    .assistant {
        background: #1e1e2e;
        border: 1px solid #45475a;
    }
    .message-content {
        word-wrap: break-word;
        overflow-wrap: break-word;
    }
    .user .message-content {
        white-space: pre-wrap; /* 保留空格并正常换行 */
    }
    .message-content pre {
        background: #11111b;
        padding: 12px;
        border-radius: 6px;
        overflow-x: auto;
        margin: 10px 0;
    }
    .message-content code {
        font-family: 'JetBrains Mono', monospace;
        font-size: 13px;
    }
    .message-content p { margin: 8px 0; }
    .message-content ul, .message-content ol { margin: 8px 0; padding-left: 24px; }
    .message-content table {
        border-collapse: collapse;
        width: 100%;
        margin: 10px 0;
    }
    .message-content th, .message-content td {
        border: 1px solid #45475a;
        padding: 8px;
        text-align: left;
    }
    .message-content th { background: #313244; }
    .ds-think-content {
        background: #181825;
        border: 1px dashed #45475a;
        padding: 12px;
        border-radius: 8px;
        margin-bottom: 12px;
        color: #a6adc8;
        font-style: italic;
    }
    .stats {
        margin-top: 40px;
        padding: 24px;
        background: #313244;
        border-radius: 10px;
        border: 1px solid #45475a;
    }
    .stats h2 { color: #89b4fa; margin-bottom: 16px; font-size: 20px; }
    .stats ul { list-style: none; }
    .stats li {
        padding: 8px 0;
        border-bottom: 1px solid #45475a33;
        font-size: 14px;
    }
    .stats li:last-child { border-bottom: none; }
    .missing { color: #f38ba8; font-weight: bold; }
    .success { color: #a6e3a1; }
</style>
</head>
<body>
<div class="header">
    <h1>📜 DeepSeek 对话记录</h1>
    <p>导出时间: ${new Date().toLocaleString('zh-CN')}</p>
    <p>页面标题: ${document.title}</p>
    <p>URL: ${currentUrl}</p>
</div>
<div class="messages">
`;

        sortedMessages.forEach(msg => {
            const typeClass = msg.type;
            const typeLabel = msg.type === 'user' ? '👤 用户' : '🤖 助手';
            const badgeClass = msg.type === 'user' ? 'badge-user' : 'badge-assistant';

            htmlContent += `
<div class="message ${typeClass}">
    <div class="message-key">
        🔑 Key: <strong>${msg.key}</strong>
        <span class="badge ${badgeClass}">${typeLabel}</span>
    </div>
    <div class="message-content">${msg.content}</div>
</div>
`;
        });

        htmlContent += `
</div>
<div class="stats">
    <h2>📊 导出统计</h2>
    <ul>
        <li><strong>实际导出条数:</strong> ${totalCount}</li>
        <li><strong>用户消息:</strong> ${userCount} 条 (奇数 Key)</li>
        <li><strong>助手消息:</strong> ${assistantCount} 条 (偶数 Key)</li>
        <li><strong>Key 起始值:</strong> ${minKey}</li>
        <li><strong>Key 结束值:</strong> ${maxKey}</li>
        <li><strong>Key 范围:</strong> ${minKey} ~ ${maxKey} (共 ${expectedRange} 个位置)</li>
        <li><strong>缺失条数:</strong> ${missingCount}</li>
        ${missingCount > 0
            ? `<li class="missing"><strong>⚠️ 缺失的 Key:</strong> ${missingKeys.join(', ')}</li>`
            : '<li class="success"><strong>✅ Key 连续完整，无缺失</strong></li>'}
    </ul>
</div>
</body>
</html>`;

        const title = document.title.replace(/[\\/:*?"<>|]/g, '_').trim() || 'deepseek_chat';
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
        const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${title}_${timestamp}.html`;
        a.click();
        URL.revokeObjectURL(url);

        statusDiv.innerText = `✅ 已保存 ${totalCount} 条\n👤${userCount} 用户 | 🤖${assistantCount} 助手`;
    }

    // ---------- 滚动 ----------
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
            updateStatus();

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
        currentUrl = window.location.href;
        window.__noChangeCount = 0;

        upBtn.disabled = downBtn.disabled = allBtn.disabled = true;
        stopBtn.disabled = false;

        scrollContainer = findScrollContainer();
        console.log('DeepSeek Scraper: 滚动容器', scrollContainer);

        collectedMessages.clear();

        extractMessages();
        setupObserver();
        updateStatus();

        const intervalTime = parseInt(intervalInput.value, 10);
        scrollInterval = setInterval(() => {
            if (window.location.href !== currentUrl) {
                console.log('抓取过程中检测到 URL 变化，停止抓取');
                stop();
                return;
            }
            scrollStep();
        }, intervalTime);

        statusDiv.innerText = direction === 'up' ? '⬆ 向上滚动中...' : '⬇ 向下滚动中...';
    }

    function startAll() {
        if (isRunning) return;
        startScrolling('up');

        const checkUpDone = setInterval(() => {
            if (!isRunning) {
                clearInterval(checkUpDone);
                setTimeout(() => {
                    startScrolling('down');
                }, 1000);
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

        if (observer) {
            observer.disconnect();
            observer = null;
        }

        upBtn.disabled = downBtn.disabled = allBtn.disabled = false;
        stopBtn.disabled = true;

        saveToFile();
        progressBar.style.width = '0%';
        window.__noChangeCount = 0;
    }

    // ---------- URL 变化检测 ----------
    function checkUrlChange() {
        const newUrl = window.location.href;
        if (newUrl !== currentUrl) {
            console.log('DeepSeek Scraper: 检测到 URL 变化，重置抓取器');
            console.log('旧 URL:', currentUrl);
            console.log('新 URL:', newUrl);

            if (isRunning) {
                stopRequested = true;
                isRunning = false;
                if (scrollInterval) {
                    clearInterval(scrollInterval);
                    scrollInterval = null;
                }
                if (observer) {
                    observer.disconnect();
                    observer = null;
                }
            }

            currentUrl = newUrl;
            collectedMessages.clear();
            scrollContainer = null;
            currentDirection = null;
            window.__noChangeCount = 0;

            upBtn.disabled = downBtn.disabled = allBtn.disabled = false;
            stopBtn.disabled = true;
            statusDiv.innerText = '🔄 对话已切换，就绪';
            progressBar.style.width = '0%';

            setTimeout(() => {
                scrollContainer = findScrollContainer();
                console.log('DeepSeek Scraper: 重新定位滚动容器', scrollContainer);
                statusDiv.innerText = '就绪，点击按钮开始';
            }, 500);
        }
    }

    // 监听 URL 变化
    window.addEventListener('popstate', () => {
        setTimeout(checkUrlChange, 100);
    });

    const originalPushState = history.pushState;
    history.pushState = function() {
        originalPushState.apply(this, arguments);
        setTimeout(checkUrlChange, 100);
    };

    const originalReplaceState = history.replaceState;
    history.replaceState = function() {
        originalReplaceState.apply(this, arguments);
        setTimeout(checkUrlChange, 100);
    };

    setInterval(checkUrlChange, 1000);

    // ---------- 事件绑定 ----------
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

    console.log('✅ DeepSeek 对话抓取器已就绪 (v1.5)');
})();
