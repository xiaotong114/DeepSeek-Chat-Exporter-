// ==UserScript==
// @name         DeepSeek 对话导出 V3.1 轻量版
// @namespace    http://tampermonkey.net/
// @version      3.1-lite
// @description  单对话/批量抓取 · 选轮次导出 · MD/TXT/HTML · 思维链开关 · 亮暗主题 · 文件名标题 · 桌面通知 · 导出历史 · 统计信息 · 批量支持格式选择（UI轻量化）
// @author       你 + 社区贡献
// @match        https://chat.deepseek.com/*
// @match        *://*.deepseek.com/*
// @grant        none
// @license      MIT
// ==/UserScript==

(function() {
    'use strict';

    if (window.__dsScraperV3Lite) return;
    window.__dsScraperV3Lite = true;

    // ==================== 常量 ====================
    const STORAGE_KEY = 'ds_export_history_v3_lite';

    // ==================== CSS 样式（轻量扁平） ====================
    const style = document.createElement('style');
    style.textContent = `
        :root {
            --ds-bg: #1e1e2e;
            --ds-bg2: #313244;
            --ds-text: #cdd6f4;
            --ds-text2: #89b4fa;
            --ds-text3: #a6adc8;
            --ds-border: #45475a;
            --ds-input: #313244;
            --ds-shadow: 0 2px 8px rgba(0,0,0,0.3);
            --ds-btn: #313244;
            --ds-btn-hover: #45475a;
            --ds-primary: #89b4fa;
            --ds-primary-hover: #a6c8ff;
            --ds-stop: #f38ba8;
            --ds-stop-hover: #ffa0b4;
            --ds-export: #89b4fa;
            --ds-export-hover: #a6c8ff;
            --ds-progress: #a6e3a1;
            --ds-overlay: rgba(0,0,0,0.4);
            --ds-dialog-bg: #1e1e2e;
            --ds-dialog-text: #cdd6f4;
            --ds-dialog-border: #45475a;
        }

        .ds-theme-light {
            --ds-bg: #ffffff;
            --ds-bg2: #f0f0f5;
            --ds-text: #1a1a1a;
            --ds-text2: #1a1a1a;
            --ds-text3: #555;
            --ds-border: #d0d0d0;
            --ds-input: #f5f5f5;
            --ds-shadow: 0 2px 8px rgba(0,0,0,0.08);
            --ds-btn: #f0f0f5;
            --ds-btn-hover: #e0e0e5;
            --ds-primary: #5a7ab0;
            --ds-primary-hover: #6c8fc7;
            --ds-stop: #d06a7b;
            --ds-stop-hover: #e07a8b;
            --ds-export: #5a7ab0;
            --ds-export-hover: #6c8fc7;
            --ds-progress: #5cb87a;
            --ds-overlay: rgba(0,0,0,0.2);
            --ds-dialog-bg: #ffffff;
            --ds-dialog-text: #1a1a1a;
            --ds-dialog-border: #d0d0d0;
        }

        #ds-v3-lite {
            position: fixed;
            top: 80px;
            right: 20px;
            z-index: 999999;
            background: var(--ds-bg);
            color: var(--ds-text);
            border-radius: 6px;
            box-shadow: var(--ds-shadow);
            font-family: system-ui, -apple-system, sans-serif;
            font-size: 12px;
            width: 300px;
            padding: 14px 16px;
            user-select: none;
            border: 1px solid var(--ds-border);
            transition: none;
        }
        #ds-v3-lite.collapsed {
            width: 44px;
            height: 44px;
            padding: 0;
            border-radius: 22px;
            cursor: grab;
            display: flex;
            align-items: center;
            justify-content: center;
            background: var(--ds-bg2);
            border: 1px solid var(--ds-border);
        }
        #ds-v3-lite.collapsed:active { cursor: grabbing; }
        #ds-v3-lite.collapsed .panel-content { display: none; }
        #ds-v3-lite.collapsed .collapse-icon { display: flex; font-size: 22px; opacity: 0.9; }
        #ds-v3-lite .collapse-icon { display: none; }

        #ds-v3-lite .panel-content { display: block; }

        #ds-v3-lite .header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 10px;
            cursor: move;
        }
        #ds-v3-lite .header h3 {
            margin: 0;
            color: var(--ds-text2);
            font-size: 14px;
            font-weight: 600;
            display: flex;
            align-items: center;
            gap: 6px;
        }
        #ds-v3-lite .header h3::before { content: "📜"; font-size: 16px; }
        #ds-v3-lite .header-actions {
            display: flex;
            gap: 2px;
            align-items: center;
        }
        #ds-v3-lite .header-actions > span {
            cursor: pointer;
            color: var(--ds-text3);
            font-size: 16px;
            width: 24px;
            height: 24px;
            display: flex;
            align-items: center;
            justify-content: center;
            border-radius: 4px;
            transition: background 0.15s;
        }
        #ds-v3-lite .header-actions > span:hover {
            background: var(--ds-btn-hover);
        }
        #ds-v3-lite .header-actions .close-btn:hover { color: var(--ds-stop); }
        #ds-v3-lite .header-actions .theme-btn:hover { color: #f0c674; }

        #ds-v3-lite .mode-switch {
            display: flex;
            gap: 4px;
            margin-bottom: 8px;
        }
        #ds-v3-lite .mode-btn {
            flex: 1;
            padding: 4px 6px;
            border: 1px solid var(--ds-border);
            border-radius: 4px;
            background: var(--ds-btn);
            color: var(--ds-text3);
            font-size: 11px;
            cursor: pointer;
            text-align: center;
            transition: background 0.15s;
        }
        #ds-v3-lite .mode-btn.active {
            background: var(--ds-primary);
            color: #1e1e2e;
            font-weight: 600;
            border-color: var(--ds-primary);
        }
        #ds-v3-lite .mode-btn:hover:not(.active) { background: var(--ds-btn-hover); }

        #ds-v3-lite .btn-group {
            display: flex;
            flex-direction: column;
            gap: 5px;
            margin-bottom: 10px;
        }
        #ds-v3-lite .btn-row {
            display: flex;
            gap: 5px;
        }
        #ds-v3-lite .btn-row button { flex: 1; }

        #ds-v3-lite button {
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 4px;
            padding: 6px 10px;
            border: 1px solid var(--ds-border);
            border-radius: 4px;
            background: var(--ds-btn);
            color: var(--ds-text);
            font-weight: 500;
            font-size: 11px;
            cursor: pointer;
            transition: background 0.15s;
        }
        #ds-v3-lite button:hover {
            background: var(--ds-btn-hover);
        }
        #ds-v3-lite button:disabled {
            opacity: 0.4;
            pointer-events: none;
        }
        #ds-v3-lite button.primary {
            background: var(--ds-primary);
            color: #1e1e2e;
            border-color: var(--ds-primary);
            font-weight: 600;
        }
        #ds-v3-lite button.primary:hover { background: var(--ds-primary-hover); }
        #ds-v3-lite button.stop {
            background: var(--ds-stop);
            color: #1e1e2e;
            border-color: var(--ds-stop);
            font-weight: 600;
        }
        #ds-v3-lite button.stop:hover { background: var(--ds-stop-hover); }
        #ds-v3-lite button.export {
            background: var(--ds-export);
            color: #1e1e2e;
            border-color: var(--ds-export);
            font-weight: 600;
        }
        #ds-v3-lite button.export:hover { background: var(--ds-export-hover); }
        #ds-v3-lite button.warning {
            background: #fab387;
            color: #1e1e2e;
            border-color: #fab387;
            font-weight: 600;
        }
        #ds-v3-lite button.warning:hover { background: #ffc8a0; }

        #ds-v3-lite .config-section {
            background: var(--ds-btn);
            border-radius: 4px;
            padding: 8px 10px;
            margin: 8px 0;
            border: 1px solid var(--ds-border);
        }
        #ds-v3-lite .config-row {
            display: flex;
            align-items: center;
            gap: 6px;
            margin-bottom: 4px;
            color: var(--ds-text3);
            font-size: 11px;
        }
        #ds-v3-lite .config-row:last-child { margin-bottom: 0; }
        #ds-v3-lite .config-row label {
            width: 44px;
            flex-shrink: 0;
            font-size: 11px;
        }
        #ds-v3-lite .config-row input,
        #ds-v3-lite .config-row select {
            flex: 1;
            background: var(--ds-input);
            border: 1px solid var(--ds-border);
            border-radius: 3px;
            color: var(--ds-text);
            padding: 4px 8px;
            font-size: 11px;
        }
        #ds-v3-lite .config-row input:focus,
        #ds-v3-lite .config-row select:focus {
            outline: none;
            border-color: var(--ds-primary);
        }

        #ds-v3-lite .status-area { margin: 8px 0 6px; }
        #ds-v3-lite .status {
            font-size: 12px;
            color: var(--ds-text3);
            text-align: center;
            min-height: 28px;
            padding: 4px 10px;
            background: var(--ds-btn);
            border-radius: 4px;
            display: flex;
            align-items: center;
            justify-content: center;
            border: 1px solid var(--ds-border);
        }
        #ds-v3-lite .progress {
            height: 3px;
            background: var(--ds-border);
            border-radius: 2px;
            overflow: hidden;
            margin: 6px 0 4px;
        }
        #ds-v3-lite .progress-bar {
            height: 100%;
            width: 0%;
            background: var(--ds-progress);
            border-radius: 2px;
            transition: width 0.15s;
        }

        #ds-v3-lite .footer-note {
            font-size: 10px;
            color: var(--ds-text3);
            text-align: center;
            margin-top: 8px;
            opacity: 0.7;
        }
        #ds-v3-lite .badge {
            background: var(--ds-border);
            padding: 1px 6px;
            border-radius: 3px;
            font-size: 9px;
            color: var(--ds-text3);
        }

        #ds-v3-lite .history-row {
            font-size: 10px;
            color: var(--ds-text3);
            padding: 0 2px;
            margin-top: 2px;
        }
        #ds-v3-lite .history-row .count {
            color: var(--ds-text2);
            font-weight: 600;
        }

        .single-mode-only { display: block; }
        .batch-mode-only { display: none; }

        /* ===== 导出弹窗（轻量） ===== */
        #ds-export-dialog-lite {
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: var(--ds-overlay);
            z-index: 9999999;
            display: flex;
            align-items: center;
            justify-content: center;
        }
        #ds-export-dialog-lite .dialog-box {
            background: var(--ds-dialog-bg);
            color: var(--ds-dialog-text);
            border-radius: 8px;
            padding: 20px;
            max-width: 520px;
            width: 92%;
            max-height: 85vh;
            display: flex;
            flex-direction: column;
            box-shadow: 0 8px 24px rgba(0,0,0,0.3);
            border: 1px solid var(--ds-dialog-border);
        }
        #ds-export-dialog-lite .dialog-box h3 {
            margin-top: 0;
            margin-bottom: 6px;
            font-weight: 600;
            font-size: 16px;
        }
        #ds-export-dialog-lite .dialog-box .sub {
            color: var(--ds-text3);
            font-size: 12px;
            margin-bottom: 10px;
            opacity: 0.8;
        }
        #ds-export-dialog-lite .round-list {
            overflow-y: auto;
            max-height: 160px;
            border: 1px solid var(--ds-dialog-border);
            border-radius: 4px;
            padding: 4px;
            background: var(--ds-btn);
        }
        #ds-export-dialog-lite .round-list label {
            display: flex;
            align-items: center;
            padding: 4px 6px;
            border-bottom: 1px solid var(--ds-dialog-border);
            cursor: pointer;
            font-size: 12px;
        }
        #ds-export-dialog-lite .round-list label:hover { background: var(--ds-btn-hover); }
        #ds-export-dialog-lite .round-list label input { margin-right: 8px; }
        #ds-export-dialog-lite .round-list label .summary {
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
        }

        #ds-export-dialog-lite .dialog-actions {
            display: flex;
            gap: 8px;
            margin-top: 10px;
            justify-content: flex-end;
        }
        #ds-export-dialog-lite .dialog-actions button {
            padding: 6px 16px;
            border: 1px solid var(--ds-dialog-border);
            border-radius: 4px;
            cursor: pointer;
            font-weight: 500;
            font-size: 12px;
            transition: background 0.15s;
        }
        #ds-export-dialog-lite .dialog-actions .btn-cancel {
            background: var(--ds-btn);
            color: var(--ds-text);
        }
        #ds-export-dialog-lite .dialog-actions .btn-confirm {
            background: var(--ds-export);
            color: #1e1e2e;
            border-color: var(--ds-export);
        }
        #ds-export-dialog-lite .dialog-actions .btn-confirm:hover { background: var(--ds-export-hover); }
        #ds-export-dialog-lite .dialog-actions .btn-cancel:hover { background: var(--ds-btn-hover); }

        #ds-export-dialog-lite .filter-row {
            display: flex;
            gap: 10px;
            flex-wrap: wrap;
            margin: 8px 0;
            font-size: 12px;
        }
        #ds-export-dialog-lite .filter-row label {
            display: flex;
            align-items: center;
            gap: 3px;
            cursor: pointer;
        }
        #ds-export-dialog-lite .range-input {
            width: 100%;
            padding: 6px 10px;
            border: 1px solid var(--ds-dialog-border);
            border-radius: 4px;
            background: var(--ds-input);
            color: var(--ds-dialog-text);
            font-size: 13px;
            box-sizing: border-box;
            margin-top: 4px;
        }
        #ds-export-dialog-lite .range-input:focus {
            outline: none;
            border-color: var(--ds-primary);
        }
        #ds-export-dialog-lite .btn-sm {
            padding: 3px 10px;
            font-size: 11px;
            border: 1px solid var(--ds-dialog-border);
            border-radius: 3px;
            background: var(--ds-btn);
            color: var(--ds-text);
            cursor: pointer;
        }
        #ds-export-dialog-lite .btn-sm:hover { background: var(--ds-btn-hover); }
        #ds-export-dialog-lite .selected-count {
            font-size: 12px;
            color: var(--ds-text3);
            align-self: center;
        }
        #ds-export-dialog-lite .format-row {
            display: flex;
            gap: 10px;
            margin: 6px 0;
            flex-wrap: wrap;
        }
        #ds-export-dialog-lite .format-row label {
            display: flex;
            align-items: center;
            gap: 3px;
            cursor: pointer;
            font-size: 12px;
        }
        #ds-export-dialog-lite .top-row {
            display: flex;
            gap: 8px;
            flex-wrap: wrap;
            margin-bottom: 6px;
            align-items: center;
        }
    `;
    document.head.appendChild(style);

    // ==================== 工具函数 ====================
    function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

    function escapeHtml(text) {
        const d = document.createElement('div');
        d.textContent = text;
        return d.innerHTML;
    }

    function getPlainText(html) {
        const div = document.createElement('div');
        div.innerHTML = html;
        return div.textContent.trim();
    }

    function truncate(text, maxLen) {
        if (text.length <= maxLen) return text;
        return text.slice(0, maxLen) + '…';
    }

    function removeNewlines(text) {
        return text.replace(/[\r\n]+/g, ' ');
    }

    // ==================== 获取对话标题 ====================
    function getCurrentChatTitle() {
        const link = getCurrentChatLink();
        if (link) {
            const title = link.textContent.trim();
            if (title) return title.replace(/[\\/:*?"<>|]/g, '_').slice(0, 40) || 'DeepSeek对话';
        }
        const docTitle = document.title.replace(/[\\/:*?"<>|]/g, '_').trim();
        if (docTitle && docTitle !== 'DeepSeek') return docTitle.slice(0, 40);
        return 'DeepSeek对话';
    }

    // ==================== 导出历史记录 ====================
    function getExportHistory() {
        try {
            return JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
        } catch { return []; }
    }

    function addExportHistory(title, count, format) {
        const history = getExportHistory();
        history.push({
            title: title || '未命名',
            count: count || 0,
            format: format || 'md',
            time: new Date().toISOString()
        });
        if (history.length > 200) history.splice(0, history.length - 200);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(history));
    }

    function getExportCount() {
        return getExportHistory().length;
    }

    function updateExportHistoryUI() {
        const el = document.getElementById('ds-export-count-lite');
        if (el) el.textContent = getExportCount();
    }

    // ==================== 桌面通知 ====================
    function sendNotification(title, body, icon) {
        if (!('Notification' in window)) return;
        if (Notification.permission === 'granted') {
            try {
                new Notification(title, { body: body || '', icon: icon || '📜' });
            } catch (e) {}
        } else if (Notification.permission === 'default') {
            Notification.requestPermission();
        }
    }

    function requestNotificationPermission() {
        if ('Notification' in window && Notification.permission === 'default') {
            Notification.requestPermission();
        }
    }

    // ==================== 统计信息生成 ====================
    function buildStatistics(messages, format) {
        const userCount = messages.filter(m => m.role === 'user').length;
        const assistantCount = messages.filter(m => m.role === 'assistant').length;
        const totalChars = messages.reduce((sum, m) => sum + m.html.length, 0);
        const totalWords = messages.reduce((sum, m) => sum + getPlainText(m.html).length, 0);

        if (format === 'html') {
            return `
                <hr>
                <div style="font-size:13px;color:#888;padding:12px 0;border-top:2px solid #e0e0e0;margin-top:20px;">
                    <b>📊 统计信息</b><br>
                    总轮数：${userCount} 轮 &nbsp;|&nbsp; AI 回答数：${assistantCount} 条<br>
                    总字符数：${totalChars.toLocaleString()} &nbsp;|&nbsp; 总字数：${totalWords.toLocaleString()}<br>
                    导出时间：${new Date().toLocaleString('zh-CN')}<br>
                    导出工具：DeepSeek 对话导出 V3.1
                </div>
            `;
        }

        return `
---
📊 统计信息
- 总轮数：${userCount}
- AI 回答数：${assistantCount}
- 总字符数：${totalChars.toLocaleString()}
- 总字数：${totalWords.toLocaleString()}
- 导出时间：${new Date().toLocaleString('zh-CN')}
- 导出工具：DeepSeek 对话导出 V3.1
---`;
    }

    // ==================== 生成文件名 ====================
    function generateFilename(ext, customTitle) {
        const now = new Date();
        const pad = (n) => n.toString().padStart(2, '0');
        const ts = `${now.getFullYear()}-${pad(now.getMonth()+1)}-${pad(now.getDate())}_${pad(now.getHours())}-${pad(now.getMinutes())}-${pad(now.getSeconds())}`;
        const title = customTitle || getCurrentChatTitle() || 'DeepSeek对话';
        return `${title}_${ts}.${ext}`;
    }

    // ==================== 消息提取 ====================
    function extractRawMessages() {
        const groups = document.querySelectorAll('.ds-message, [class*="message-container"], [class*="chat-item"]');
        if (!groups.length) return [];
        let all = [];
        for (const g of groups) {
            const children = Array.from(g.children).filter(el =>
                el.tagName === 'DIV' && hasValidContent(el)
            );
            let userEl = null, assistantEl = null;
            let thinkingHTMLs = [];
            for (const el of children) {
                if (isAIGeneratedHint(el)) continue;
                if (isSearchReferenceBlock(el)) continue;
                if (isThinkingElement(el)) {
                    thinkingHTMLs.push(el.innerHTML.trim());
                    continue;
                }
                if (isAssistant(el)) {
                    assistantEl = el;
                    continue;
                }
                if (!userEl) userEl = el;
            }
            if (userEl) {
                const html = userEl.innerHTML.trim();
                if (html) all.push({ role: 'user', html });
            }
            if (assistantEl) {
                const contentEl = assistantEl.querySelector('.ds-markdown, .markdown, .prose, .message-content') || assistantEl;
                let assistantHTML = contentEl.innerHTML.trim();
                if (thinkingHTMLs.length > 0) {
                    assistantHTML = thinkingHTMLs.join('\n') + '\n' + assistantHTML;
                }
                if (assistantHTML) all.push({ role: 'assistant', html: assistantHTML });
            }
        }
        return all;
    }

    function collectNewMessages(cachedMessages, seenSet) {
        const raw = extractRawMessages();
        let added = 0;
        raw.forEach(msg => {
            const key = msg.role + '_' + (msg.html.slice(0, 150).replace(/\s+/g, ' ')) + '_len' + msg.html.length;
            if (!seenSet.has(key)) {
                seenSet.add(key);
                cachedMessages.push(msg);
                added++;
            }
        });
        return added;
    }

    // ==================== 滚动容器 ====================
    function findScrollContainer() {
        const candidates = [];
        document.querySelectorAll('div').forEach(div => {
            const style = window.getComputedStyle(div);
            if ((style.overflowY === 'auto' || style.overflowY === 'scroll') && div.scrollHeight > div.clientHeight) {
                candidates.push(div);
            }
        });
        if (!candidates.length) return document.scrollingElement || document.documentElement;
        candidates.sort((a, b) => (b.clientWidth * b.clientHeight) - (a.clientWidth * a.clientHeight));
        return candidates[0];
    }

    function getChatLinks() {
        return Array.from(document.querySelectorAll('a[href*="/a/chat/s/"]'));
    }

    function getCurrentChatLink() {
        const p = location.pathname + location.search;
        return getChatLinks().find(a => a.href.includes(p));
    }

    // ==================== 思维链 / 搜索块 检测与移除 ====================
    function isThinkingElement(el) {
        if (el.querySelector('.ds-think-content')) return true;
        if (el.className.includes('think') || el.className.includes('reason')) return true;
        const span = el.querySelector('span');
        if (span && /^已思考（用时 .* 秒）$/.test(span.innerText.trim())) {
            return el.querySelectorAll('.ds-icon, svg').length >= 2;
        }
        return false;
    }

    function isSearchReferenceBlock(el) {
        if (el.querySelector('._287b564')) return true;
        if (el.querySelector('.ds-search-banner')) return true;
        if (el.querySelector('.ds-search-results')) return true;
        if (el.className.includes('search')) return true;
        const text = el.innerText.trim();
        if (/^搜索到\s*\d+\s*个网页/.test(text)) return true;
        if (/^浏览\s*\d+\s*个页面/.test(text)) return true;
        if (/\d+\s*个网页/.test(text)) return true;
        if (el.querySelector('img.site_logo_img')) return true;
        return false;
    }

    function isAIGeneratedHint(el) {
        return el.innerText.trim() === '本回答由 AI 生成，内容仅供参考，请仔细甄别';
    }

    function isAssistant(el) {
        return el.className.includes('assistant') || el.className.includes('ds-assistant');
    }

    function hasValidContent(el) {
        if (el.innerText.trim().length > 0) return true;
        if (el.querySelector('img, video, audio, iframe')) return true;
        return false;
    }

    function removeThinkingElements(html) {
        const div = document.createElement('div');
        div.innerHTML = html;
        function remove(node) {
            const children = Array.from(node.childNodes);
            for (const child of children) {
                if (child.nodeType === Node.ELEMENT_NODE) {
                    if (isThinkingElement(child) || isSearchReferenceBlock(child)) {
                        child.remove();
                    } else {
                        remove(child);
                    }
                }
            }
        }
        remove(div);
        return div.innerHTML;
    }

    // ==================== HTML → Markdown / PlainText ====================
    function htmlToMarkdown(html) {
        const div = document.createElement('div');
        div.innerHTML = html;

        function processNode(node) {
            try {
                if (node.nodeType === Node.TEXT_NODE) return node.textContent;
                if (node.nodeType !== Node.ELEMENT_NODE) return '';
                const tag = node.tagName.toLowerCase();
                const cls = node.className || '';

                if (cls.includes('katex-display')) {
                    const ann = node.querySelector('annotation[encoding="application/x-tex"]');
                    const tex = ann ? ann.textContent.trim() : node.textContent.trim();
                    return '\n$$\n' + tex + '\n$$\n\n';
                }
                if (cls.includes('katex')) {
                    const ann = node.querySelector('annotation[encoding="application/x-tex"]');
                    const tex = ann ? ann.textContent.trim() : node.textContent.trim();
                    return '$' + tex + '$';
                }
                if (tag === 'script' && node.getAttribute('type') === 'math/tex') {
                    return '$' + node.textContent.trim() + '$';
                }
                if (tag === 'script' && node.getAttribute('type') === 'math/tex; mode=display') {
                    return '\n$$\n' + node.textContent.trim() + '\n$$\n\n';
                }

                if (node.classList && node.classList.contains('md-code-block-banner')) return '';

                if (tag === 'pre') {
                    let lang = '';
                    let parent = node.parentElement;
                    while (parent && parent !== document.body) {
                        const langSpan = parent.querySelector('.d813de27');
                        if (langSpan) { lang = langSpan.textContent.trim(); break; }
                        const codeEl = parent.querySelector('code');
                        if (codeEl) {
                            const match = codeEl.className.match(/language-(\w+)/);
                            if (match) { lang = match[1]; break; }
                        }
                        parent = parent.parentElement;
                    }
                    const clone = node.cloneNode(true);
                    clone.querySelectorAll('[role="button"], .ds-button').forEach(b => b.remove());
                    let code = clone.textContent.replace(/^\s+/, '').replace(/\s+$/, '');
                    return '```' + lang + '\n' + code + '\n```\n\n';
                }

                if (tag === 'img') {
                    const src = node.getAttribute('src') || '';
                    const alt = node.getAttribute('alt') || '图片';
                    return src ? `![${alt}](${src})` : `[${alt}]`;
                }

                const children = Array.from(node.childNodes).map(processNode).join('');

                switch (tag) {
                    case 'h1': return '# ' + children + '\n\n';
                    case 'h2': return '## ' + children + '\n\n';
                    case 'h3': return '### ' + children + '\n\n';
                    case 'h4': return '#### ' + children + '\n\n';
                    case 'h5': return '##### ' + children + '\n\n';
                    case 'h6': return '###### ' + children + '\n\n';
                    case 'p': return children + '\n\n';
                    case 'strong': case 'b': return '**' + children + '**';
                    case 'em': case 'i': return '*' + children + '*';
                    case 'code': return '`' + children + '`';
                    case 'ul': return children + '\n';
                    case 'ol': return children + '\n';
                    case 'li': return '- ' + children + '\n';
                    case 'blockquote': return '> ' + children.replace(/\n/g, '\n> ') + '\n\n';
                    case 'a': return '[' + children + '](' + (node.getAttribute('href') || '#') + ')';
                    case 'br': return '\n';
                    case 'hr': return '---\n\n';
                    case 'div': case 'span': case 'section': return children;
                    default: return children;
                }
            } catch (e) {
                return node.textContent || '';
            }
        }

        let md = processNode(div);
        md = md.replace(/\n{3,}/g, '\n\n');
        return md.trim();
    }

    function htmlToPlainText(html) {
        const div = document.createElement('div');
        div.innerHTML = html;
        function process(node) {
            if (node.nodeType === Node.TEXT_NODE) return node.textContent;
            if (node.nodeType !== Node.ELEMENT_NODE) return '';
            const tag = node.tagName.toLowerCase();
            const content = Array.from(node.childNodes).map(process).join('');
            const blockTags = ['p','div','h1','h2','h3','h4','h5','h6','blockquote','pre','ul','ol','li','section','article','header','footer','main'];
            if (blockTags.includes(tag)) return content + '\n';
            if (tag === 'br') return '\n';
            return content;
        }
        let text = process(div);
        text = text.replace(/\n{2,}/g, '\n').trim();
        return text;
    }

    // ==================== 轮次解析 ====================
    function parseRoundInput(input, maxRound) {
        const trimmed = input.trim().toLowerCase();
        if (trimmed === 'all' || trimmed === '') {
            return Array.from({ length: maxRound }, (_, i) => i + 1);
        }
        const parts = trimmed.split(',').map(p => p.trim());
        const rounds = new Set();
        for (const part of parts) {
            if (part.includes('-')) {
                const [s, e] = part.split('-').map(v => parseInt(v.trim()));
                if (isNaN(s) || isNaN(e) || s < 1 || e > maxRound || s > e) return null;
                for (let i = s; i <= e; i++) rounds.add(i);
            } else {
                const n = parseInt(part);
                if (isNaN(n) || n < 1 || n > maxRound) return null;
                rounds.add(n);
            }
        }
        return Array.from(rounds).sort((a, b) => a - b);
    }

    function formatRounds(rounds) {
        if (!rounds.length) return '';
        const sorted = [...rounds].sort((a, b) => a - b);
        const ranges = [];
        let start = sorted[0], end = sorted[0];
        for (let i = 1; i < sorted.length; i++) {
            if (sorted[i] === end + 1) { end = sorted[i]; }
            else { ranges.push(start === end ? `${start}` : `${start}-${end}`); start = sorted[i]; end = sorted[i]; }
        }
        ranges.push(start === end ? `${start}` : `${start}-${end}`);
        return ranges.join(',');
    }

    function filterMessagesByRounds(messages, selectedRounds) {
        if (!selectedRounds?.length) return [];
        const set = new Set(selectedRounds);
        const out = [];
        let round = 0;
        for (let i = 0; i < messages.length; i++) {
            if (messages[i].role === 'user') {
                round++;
                if (set.has(round)) {
                    out.push(messages[i]);
                    if (i + 1 < messages.length && messages[i + 1].role === 'assistant') {
                        out.push(messages[i + 1]);
                        i++;
                    }
                }
            }
        }
        return out;
    }

    // ==================== 导出构建 ====================
    function buildMarkdown(messages, includeThinking) {
        const userMsgs = messages.filter(m => m.role === 'user');

        let toc = '';
        if (userMsgs.length) {
            const items = userMsgs.map((m, i) => {
                const plain = getPlainText(m.html);
                const clean = removeNewlines(plain);
                return `${i + 1}. [${truncate(clean, 100) || '[图片]'}](#msg-${i + 1})`;
            });
            toc = '# 📑 目录\n\n' + items.join('\n') + '\n\n___\n\n';
        }

        let body = '', uIdx = 0;
        for (const m of messages) {
            if (m.role === 'user') {
                uIdx++;
                body += `<span id="msg-${uIdx}"></span>\n\n**👤 用户**\n\n${htmlToMarkdown(m.html)}\n\n___\n\n`;
            } else {
                const html = includeThinking ? m.html : removeThinkingElements(m.html);
                const md = htmlToMarkdown(html) || m.html;
                if (md) body += `**🤖 DeepSeek**\n\n${md}\n\n___\n\n`;
            }
        }

        const stats = buildStatistics(messages, 'md');
        return toc + body + '\n' + stats;
    }

    function buildPlainText(messages, opts) {
        let text = '';
        for (const m of messages) {
            if (m.role === 'user' && !opts.exportUser) continue;
            if (m.role === 'assistant' && !opts.exportAI) continue;
            const html = (m.role === 'assistant' && !opts.includeThinking) ? removeThinkingElements(m.html) : m.html;
            let content = htmlToPlainText(html);
            if (!content && /<img/i.test(html)) content = '[图片]';
            text += (m.role === 'user' ? '用户: ' : 'AI: ') + content + '\n';
        }
        text = text.replace(/\n+$/, '');
        const stats = buildStatistics(messages, 'txt');
        return text + '\n\n' + stats;
    }

    function buildHTML(messages, includeThinking) {
        let html = '<html><head><meta charset="utf-8"><title>DeepSeek 对话导出</title>';
        html += '<style>body{max-width:800px;margin:40px auto;padding:20px;font-family:system-ui,sans-serif;line-height:1.7;background:#fafafa;color:#222;}';
        html += '.msg{margin:20px 0;padding:16px 20px;border-radius:12px;}';
        html += '.user{background:#e3f2fd;}';
        html += '.assistant{background:#f5f5f5;}';
        html += '.label{font-weight:600;font-size:14px;margin-bottom:6px;color:#555;}';
        html += '.content{white-space:pre-wrap;}';
        html += 'pre{background:#2d2d2d;color:#f8f8f2;padding:16px;border-radius:8px;overflow-x:auto;}';
        html += 'code{font-family:monospace;}';
        html += 'hr{margin:30px 0;border:1px solid #e0e0e0;}';
        html += 'img{max-width:100%;}</style></head><body>';

        let uIdx = 0;
        for (const m of messages) {
            if (m.role === 'user') {
                uIdx++;
                const content = includeThinking ? m.html : removeThinkingElements(m.html);
                html += `<div class="msg user"><div class="label">👤 用户 #${uIdx}</div><div class="content">${content}</div></div>\n<hr>\n`;
            } else {
                const content = includeThinking ? m.html : removeThinkingElements(m.html);
                html += `<div class="msg assistant"><div class="label">🤖 DeepSeek</div><div class="content">${content}</div></div>\n<hr>\n`;
            }
        }

        const stats = buildStatistics(messages, 'html');
        html += stats;
        html += '</body></html>';
        return html;
    }

    // ==================== 导出弹窗 ====================
    function showExportDialog(messages, callback, defaultFormat) {
        const old = document.getElementById('ds-export-dialog-lite');
        if (old) old.remove();

        const userMsgs = messages.filter(m => m.role === 'user');
        const userCount = userMsgs.length;
        const assistantCount = messages.filter(m => m.role === 'assistant').length;

        const userSummaries = userMsgs.map(m => {
            const t = getPlainText(m.html);
            return t ? removeNewlines(t) : (m.html.includes('<img') ? '[图片消息]' : '');
        });

        const format = defaultFormat || 'md';

        const overlay = document.createElement('div');
        overlay.id = 'ds-export-dialog-lite';
        overlay.innerHTML = `
            <div class="dialog-box">
                <h3>📤 选择导出轮次</h3>
                <div class="sub">已抓取 <b>${userCount}</b> 轮（用户 ${userCount}，助手 ${assistantCount}）</div>

                <div class="top-row">
                    <button class="btn-sm" id="ds-select-all-lite">全选</button>
                    <button class="btn-sm" id="ds-select-none-lite">取消</button>
                    <span style="flex:1;"></span>
                    <span class="selected-count">已选 <span id="ds-selected-count-lite">${userCount}</span> 轮</span>
                </div>

                <div class="round-list" id="ds-round-list-lite"></div>

                <input type="text" class="range-input" id="ds-round-input-lite" placeholder="范围如: 1-5,7,9-12 (留空=全部)" value="all">

                <div class="filter-row">
                    <label><input type="checkbox" id="ds-export-thinking-lite"> 🧠 思维链</label>
                    <label><input type="checkbox" id="ds-export-user-lite" checked> 👤 用户</label>
                    <label><input type="checkbox" id="ds-export-ai-lite" checked> 🤖 AI</label>
                </div>

                <div class="format-row">
                    <label><input type="radio" name="export-format-lite" value="md" ${format === 'md' ? 'checked' : ''}> MD</label>
                    <label><input type="radio" name="export-format-lite" value="txt" ${format === 'txt' ? 'checked' : ''}> TXT</label>
                    <label><input type="radio" name="export-format-lite" value="html" ${format === 'html' ? 'checked' : ''}> HTML</label>
                </div>

                <div class="dialog-actions">
                    <button class="btn-cancel" id="ds-export-cancel-lite">取消</button>
                    <button class="btn-confirm" id="ds-export-confirm-lite">✅ 确认</button>
                </div>
            </div>
        `;
        document.body.appendChild(overlay);

        const list = document.getElementById('ds-round-list-lite');
        const input = document.getElementById('ds-round-input-lite');
        const checkboxes = [];

        for (let i = 0; i < userCount; i++) {
            const label = document.createElement('label');
            const summary = truncate(userSummaries[i] || '', 80);
            label.innerHTML = `<input type="checkbox" class="ds-round-cb-lite" data-round="${i+1}" checked> <span class="summary">${i+1}. ${escapeHtml(summary)}</span>`;
            list.appendChild(label);
            checkboxes.push(label.querySelector('input'));
        }

        function getSelected() {
            return checkboxes.filter(c => c.checked).map(c => parseInt(c.dataset.round));
        }

        function updateInput() {
            const s = getSelected();
            input.value = s.length === userCount ? 'all' : (s.length === 0 ? '' : formatRounds(s));
            document.getElementById('ds-selected-count-lite').textContent = s.length;
        }

        function updateCheckboxes() {
            const parsed = parseRoundInput(input.value, userCount);
            if (!parsed) return;
            const set = new Set(parsed);
            checkboxes.forEach(c => c.checked = set.has(parseInt(c.dataset.round)));
            document.getElementById('ds-selected-count-lite').textContent = getSelected().length;
        }

        updateInput();
        checkboxes.forEach(c => c.addEventListener('change', updateInput));
        input.addEventListener('input', () => {
            if (input.value.trim() === '') {
                checkboxes.forEach(c => c.checked = true);
                updateInput();
                return;
            }
            updateCheckboxes();
        });

        document.getElementById('ds-select-all-lite').addEventListener('click', () => {
            checkboxes.forEach(c => c.checked = true);
            updateInput();
        });
        document.getElementById('ds-select-none-lite').addEventListener('click', () => {
            checkboxes.forEach(c => c.checked = false);
            updateInput();
        });

        document.getElementById('ds-export-cancel-lite').addEventListener('click', () => {
            overlay.remove();
            callback(null);
        });

        document.getElementById('ds-export-confirm-lite').addEventListener('click', () => {
            const selected = getSelected();
            if (selected.length === 0) { alert('请至少选择一轮对话'); return; }

            const fmt = document.querySelector('input[name="export-format-lite"]:checked')?.value || 'md';
            const opts = {
                rounds: input.value.trim() || 'all',
                includeThinking: document.getElementById('ds-export-thinking-lite').checked,
                exportUser: document.getElementById('ds-export-user-lite').checked,
                exportAI: document.getElementById('ds-export-ai-lite').checked,
                format: fmt,
                selectedRounds: selected
            };
            overlay.remove();
            callback(opts);
        });
    }

    // ==================== 保存文件 ====================
    async function saveFile(content, filename, mimeType) {
        if (window.showSaveFilePicker) {
            try {
                const handle = await window.showSaveFilePicker({
                    suggestedName: filename,
                    types: [{ description: '文件', accept: { [mimeType]: ['.' + filename.split('.').pop()] } }]
                });
                const writable = await handle.createWritable();
                await writable.write(content);
                await writable.close();
                return;
            } catch (e) {
                if (e.name === 'AbortError') return;
            }
        }
        const blob = new Blob([content], { type: mimeType + ';charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        setTimeout(() => URL.revokeObjectURL(url), 5000);
    }

    // ==================== 单对话导出入口 ====================
    function startExport(messages, formatHint) {
        if (!messages.length) { alert('请先抓取对话内容'); return; }
        showExportDialog(messages, (opts) => {
            if (!opts) return;

            const selected = opts.selectedRounds || parseRoundInput(opts.rounds, messages.filter(m => m.role === 'user').length);
            if (!selected || !selected.length) { alert('轮次格式错误，请检查'); return; }

            const filtered = filterMessagesByRounds(messages, selected);

            let content, ext, mime;
            const title = getCurrentChatTitle();

            switch (opts.format) {
                case 'txt':
                    content = buildPlainText(filtered, opts);
                    ext = 'txt';
                    mime = 'text/plain';
                    break;
                case 'html':
                    content = buildHTML(filtered, opts.includeThinking);
                    ext = 'html';
                    mime = 'text/html';
                    break;
                case 'md':
                default:
                    content = buildMarkdown(filtered, opts.includeThinking);
                    ext = 'md';
                    mime = 'text/markdown';
                    break;
            }

            if (!content || !content.trim()) { alert('转换后内容为空，请检查'); return; }

            const filename = generateFilename(ext, title);
            saveFile(content, filename, mime);

            const userCount = filtered.filter(m => m.role === 'user').length;
            addExportHistory(title, userCount, ext);
            updateExportHistoryUI();

            sendNotification('✅ 导出完成', `「${title}」共 ${userCount} 轮已导出`, '📄');

            updateStatus(`✅ 已导出「${title}」${userCount} 轮`);
        }, formatHint);
    }

    // ==================== 面板 UI ====================
    const panel = document.createElement('div');
    panel.id = 'ds-v3-lite';
    panel.innerHTML = `
        <div class="collapse-icon" style="display:none;">📜</div>
        <div class="panel-content">
            <div class="header">
                <h3>导出器 <span class="badge">lite</span></h3>
                <div class="header-actions">
                    <span class="theme-btn" id="ds-theme-toggle-lite" title="切换主题">☀️</span>
                    <span class="collapse-btn" id="ds-collapse-btn-lite" title="折叠">▼</span>
                    <span class="close-btn" id="ds-close-btn-lite" title="关闭">×</span>
                </div>
            </div>

            <div class="mode-switch">
                <div class="mode-btn active" data-mode="single">单对话</div>
                <div class="mode-btn" data-mode="batch">批量</div>
            </div>

            <div class="btn-group single-mode-only" id="single-btns-lite">
                <button id="ds-scrape-all-lite" class="primary">🔄 抓取全部</button>
                <div class="btn-row">
                    <button id="ds-scrape-up-lite" class="primary">⬆ 向上</button>
                    <button id="ds-scrape-down-lite" class="primary">⬇ 向下</button>
                </div>
                <button id="ds-stop-single-lite" class="stop" disabled>⏹ 停止</button>
            </div>

            <div class="btn-group batch-mode-only" id="batch-btns-lite" style="display:none;">
                <button id="ds-batch-start-lite" class="primary">▶ 开始批量</button>
                <div class="btn-row">
                    <button id="ds-batch-pause-lite" class="warning" disabled>⏸ 暂停</button>
                    <button id="ds-batch-stop-lite" class="stop" disabled>⏹ 停止</button>
                </div>
            </div>

            <div class="btn-group" style="margin-top:4px;">
                <div class="btn-row">
                    <button id="ds-export-md-lite" class="export" disabled>MD</button>
                    <button id="ds-export-txt-lite" class="export" disabled>TXT</button>
                    <button id="ds-export-html-lite" class="export" disabled>HTML</button>
                </div>
            </div>

            <div class="config-section">
                <div class="config-row">
                    <label>间隔</label>
                    <input id="ds-interval-lite" type="number" min="20" max="5000" value="300" step="10">
                    <span style="opacity:0.6;font-size:10px;">ms</span>
                </div>
                <div class="config-row">
                    <label>步长</label>
                    <input id="ds-step-lite" type="number" min="100" max="2000" value="600" step="50">
                    <span style="opacity:0.6;font-size:10px;">px</span>
                </div>
                <div class="config-row batch-mode-only" style="display:none;">
                    <label>过滤</label>
                    <input id="ds-filter-keyword-lite" type="text" placeholder="关键词筛选">
                </div>
                <div class="config-row batch-mode-only" style="display:none;">
                    <label>导出</label>
                    <select id="ds-export-mode-lite">
                        <option value="separate">独立文件</option>
                        <option value="merge">合并文件</option>
                    </select>
                </div>
            </div>

            <div class="status-area">
                <div class="status" id="ds-status-lite">✨ V3.1 就绪</div>
                <div class="progress"><div class="progress-bar" id="ds-progress-lite"></div></div>
                <div class="history-row">📚 已导出 <span class="count" id="ds-export-count-lite">0</span> 个对话</div>
            </div>

            <div class="footer-note">拖动 · 选轮次 · 思维链 · 主题 · 通知 · 批量支持格式选择</div>
        </div>
    `;
    document.body.appendChild(panel);

    // ==================== DOM 引用 ====================
    const $ = (id) => document.getElementById(id);
    const status = $('ds-status-lite');
    const progress = $('ds-progress-lite');

    const collapseBtn = $('ds-collapse-btn-lite');
    const collapseIcon = panel.querySelector('.collapse-icon');
    const closeBtn = $('ds-close-btn-lite');
    const themeBtn = $('ds-theme-toggle-lite');

    const modeBtns = panel.querySelectorAll('.mode-btn');
    const singleBtns = $('single-btns-lite');
    const batchBtns = $('batch-btns-lite');

    const scrapeAll = $('ds-scrape-all-lite');
    const scrapeUp = $('ds-scrape-up-lite');
    const scrapeDown = $('ds-scrape-down-lite');
    const stopSingle = $('ds-stop-single-lite');

    const batchStart = $('ds-batch-start-lite');
    const batchPause = $('ds-batch-pause-lite');
    const batchStop = $('ds-batch-stop-lite');

    const exportMD = $('ds-export-md-lite');
    const exportTXT = $('ds-export-txt-lite');
    const exportHTML = $('ds-export-html-lite');

    const intervalInput = $('ds-interval-lite');
    const stepInput = $('ds-step-lite');
    const filterInput = $('ds-filter-keyword-lite');
    const exportModeSelect = $('ds-export-mode-lite');

    // ==================== 折叠逻辑 ====================
    let isCollapsed = true;

    function collapsePanel() {
        isCollapsed = true;
        panel.classList.add('collapsed');
        collapseBtn.style.display = 'none';
        collapseIcon.style.display = 'flex';
        updateStatus('📦 已折叠');
    }

    function expandPanel() {
        isCollapsed = false;
        panel.classList.remove('collapsed');
        collapseBtn.style.display = 'flex';
        collapseIcon.style.display = 'none';
        updateStatus('✨ V3.1 就绪');
    }

    collapseBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        collapsePanel();
    });

    panel.addEventListener('click', (e) => {
        if (isCollapsed && (e.target === panel || e.target === collapseIcon)) {
            expandPanel();
        }
    });

    // ==================== 拖动 ====================
    let dragging = false, dragX = 0, dragY = 0;

    panel.addEventListener('mousedown', (e) => {
        if (e.target.closest('button') || e.target.closest('input') || e.target.closest('select') ||
            e.target.closest('.close-btn') || e.target.closest('.collapse-btn') || e.target.closest('.theme-btn') ||
            e.target.closest('.mode-btn')) return;
        if (e.target.closest('.header') || isCollapsed) {
            dragging = true;
            const rect = panel.getBoundingClientRect();
            dragX = e.clientX - rect.left;
            dragY = e.clientY - rect.top;
            panel.style.cursor = 'grabbing';
            e.preventDefault();
        }
    });

    document.addEventListener('mousemove', (e) => {
        if (!dragging) return;
        panel.style.left = (e.clientX - dragX) + 'px';
        panel.style.right = 'auto';
        panel.style.top = (e.clientY - dragY) + 'px';
    });

    document.addEventListener('mouseup', () => {
        dragging = false;
        panel.style.cursor = '';
    });

    // ==================== 亮暗主题 ====================
    let isLightTheme = false;
    themeBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        isLightTheme = !isLightTheme;
        panel.classList.toggle('ds-theme-light', isLightTheme);
        themeBtn.textContent = isLightTheme ? '🌙' : '☀️';
    });

    // ==================== 模式切换 ====================
    let currentMode = 'single';

    function setMode(mode) {
        currentMode = mode;
        modeBtns.forEach(b => b.classList.toggle('active', b.dataset.mode === mode));
        if (mode === 'single') {
            singleBtns.style.display = 'block';
            batchBtns.style.display = 'none';
            document.querySelectorAll('.batch-mode-only').forEach(el => el.style.display = 'none');
            document.querySelectorAll('.single-mode-only').forEach(el => el.style.display = 'block');
        } else {
            singleBtns.style.display = 'none';
            batchBtns.style.display = 'block';
            document.querySelectorAll('.batch-mode-only').forEach(el => el.style.display = 'block');
            document.querySelectorAll('.single-mode-only').forEach(el => el.style.display = 'none');
        }
        updateExportButtons();
    }

    modeBtns.forEach(btn => {
        btn.addEventListener('click', () => setMode(btn.dataset.mode));
    });

    // ==================== 状态更新 ====================
    function updateStatus(msg) {
        status.innerHTML = msg;
    }

    function updateProgress(pct) {
        progress.style.width = Math.min(pct, 100) + '%';
    }

    function updateExportButtons() {
        if (currentMode === 'single') {
            const hasContent = cachedMessages.length > 0;
            exportMD.disabled = !hasContent;
            exportTXT.disabled = !hasContent;
            exportHTML.disabled = !hasContent;
        } else {
            const hasContent = batchAllContents.length > 0;
            exportMD.disabled = !hasContent;
            exportTXT.disabled = !hasContent;
            exportHTML.disabled = !hasContent;
        }
    }

    function setButtonsDisabled(disabled) {
        [scrapeAll, scrapeUp, scrapeDown].forEach(b => b.disabled = disabled);
        stopSingle.disabled = !disabled;
        batchStart.disabled = disabled;
        updateExportButtons();
    }

    // ==================== 单对话核心 ====================
    let cachedMessages = [];
    let seenSet = new Set();
    let singleRunning = false;
    let singleStopReq = false;
    let singleDirection = null;
    let singleContainer = null;
    let singleInterval = null;
    let singleNoChange = 0;

    function singleCollect() {
        return collectNewMessages(cachedMessages, seenSet);
    }

    function singleUpdateUI() {
        const total = cachedMessages.length;
        const userCount = cachedMessages.filter(m => m.role === 'user').length;
        updateStatus(`📊 ${userCount} 轮 (${total} 条)`);
        if (singleContainer) {
            const pct = (singleContainer.scrollTop / (singleContainer.scrollHeight - singleContainer.clientHeight)) * 100;
            updateProgress(Math.min(pct, 100));
        }
        updateExportButtons();
        updateExportHistoryUI();
    }

    function singleStep() {
        if (!singleRunning || singleStopReq || !singleContainer) return;
        const step = parseInt(stepInput.value) || 600;
        const before = singleContainer.scrollTop;
        singleContainer.scrollBy({ top: singleDirection === 'up' ? -step : step, behavior: 'auto' });

        setTimeout(() => {
            if (!singleRunning || singleStopReq) return;
            const after = singleContainer.scrollTop;
            singleCollect();
            singleUpdateUI();

            const atTop = after <= 0;
            const atBottom = (after + singleContainer.clientHeight) >= singleContainer.scrollHeight - 5;

            if ((singleDirection === 'up' && atTop) || (singleDirection === 'down' && atBottom)) {
                updateStatus(`⏸️ 已到${singleDirection === 'up' ? '顶' : '底'}`);
                singleStop();
                return;
            }

            if (Math.abs(after - before) < 5) {
                singleNoChange++;
                if (singleNoChange >= 4) {
                    updateStatus('⚠️ 滚动无变化');
                    singleStop();
                    return;
                }
            } else {
                singleNoChange = 0;
            }
        }, 200);
    }

    function singleStart(direction) {
        if (singleRunning) return;
        singleRunning = true;
        singleStopReq = false;
        singleDirection = direction;
        singleNoChange = 0;
        singleContainer = findScrollContainer();
        if (!singleContainer) {
            updateStatus('❌ 未找到滚动容器');
            singleRunning = false;
            return;
        }
        cachedMessages = [];
        seenSet = new Set();
        setButtonsDisabled(true);
        singleCollect();
        singleUpdateUI();
        const interval = parseInt(intervalInput.value) || 300;
        singleInterval = setInterval(singleStep, interval);
        updateStatus(singleDirection === 'up' ? '⬆ 向上...' : '⬇ 向下...');
    }

    function singleStartAll() {
        if (singleRunning) return;
        singleStart('up');
        const check = setInterval(() => {
            if (!singleRunning) {
                clearInterval(check);
                setTimeout(() => singleStart('down'), 500);
            }
        }, 500);
    }

    function singleStop() {
        singleStopReq = true;
        singleRunning = false;
        if (singleInterval) {
            clearInterval(singleInterval);
            singleInterval = null;
        }
        setButtonsDisabled(false);
        const userCount = cachedMessages.filter(m => m.role === 'user').length;
        updateStatus(`✅ 完成！${userCount} 轮`);
        updateProgress(100);
        updateExportButtons();
        updateExportHistoryUI();
        sendNotification('✅ 抓取完成', `共 ${userCount} 轮对话`, '📜');
    }

    // ==================== 批量核心 ====================
    let batchRunning = false;
    let batchStopReq = false;
    let batchPaused = false;
    let batchProcessed = new Set();
    let batchCurrentMessages = [];
    let batchCurrentTitle = '';
    let batchCollected = new Set();
    let batchAllContents = [];

    function batchGetTitle() {
        const cur = getCurrentChatLink();
        if (cur) return cur.textContent.trim().slice(0, 40).replace(/[\\/:*?"<>|]/g, '_') || 'untitled';
        return document.title.replace(/[\\/:*?"<>|]/g, '_').slice(0, 40) || 'untitled';
    }

    function batchGetVisibleTexts() {
        const selectors = ['[data-message-id]', '.prose', '.whitespace-pre-wrap', '[class*="message"]', '.chat-message'];
        const texts = [];
        const seen = new Set();
        selectors.forEach(s => document.querySelectorAll(s).forEach(e => {
            const txt = e.textContent.trim();
            if (txt.length >= 5) {
                const key = txt.slice(0, 60) + txt.length;
                if (!seen.has(key)) { seen.add(key); texts.push(txt); }
            }
        }));
        return texts;
    }

    function batchIncrementalExtract() {
        const texts = batchGetVisibleTexts();
        texts.forEach(txt => {
            const key = txt.slice(0, 60) + txt.length;
            if (!batchCollected.has(key)) {
                batchCollected.add(key);
                batchCurrentMessages.push(txt);
            }
        });
    }

    async function batchClickLink(link) {
        if (!link) return false;
        const oldPath = location.pathname;
        link.click();
        for (let i = 0; i < 50; i++) {
            await sleep(100);
            if (location.pathname !== oldPath) return true;
        }
        return false;
    }

    async function batchQuickToTop(container) {
        while (!batchStopReq && !batchPaused) {
            const before = container.scrollTop;
            container.scrollBy({ top: -5000, behavior: 'auto' });
            await sleep(2);
            if (container.scrollTop <= 0 || Math.abs(container.scrollTop - before) < 5) break;
        }
    }

    async function batchScrollDown(container) {
        let noChange = 0, counter = 0;
        while (!batchStopReq && !batchPaused) {
            const step = parseInt(stepInput.value) || 600;
            const interval = parseInt(intervalInput.value) || 300;
            const before = container.scrollTop;
            container.scrollBy({ top: step, behavior: 'auto' });
            const pct = container.scrollHeight <= container.clientHeight ? 100 :
                (container.scrollTop / (container.scrollHeight - container.clientHeight)) * 100;
            updateProgress(Math.min(pct, 100));
            await sleep(interval);
            batchIncrementalExtract();
            if (++counter % 3 === 0) {
                updateStatus(`📄 ${batchCurrentTitle}<br>${batchCurrentMessages.length} 条`);
            }
            if (Math.abs(container.scrollTop - before) < 5) {
                if (++noChange >= 3) break;
            } else noChange = 0;
            if (container.scrollTop + container.clientHeight >= container.scrollHeight - 5) break;
        }
        batchIncrementalExtract();
    }

    async function batchScrollUp(container) {
        let noChange = 0, counter = 0;
        while (!batchStopReq && !batchPaused) {
            const step = parseInt(stepInput.value) || 600;
            const interval = parseInt(intervalInput.value) || 300;
            const before = container.scrollTop;
            container.scrollBy({ top: -step, behavior: 'auto' });
            const pct = container.scrollHeight <= container.clientHeight ? 100 :
                (container.scrollTop / (container.scrollHeight - container.clientHeight)) * 100;
            updateProgress(Math.min(pct, 100));
            await sleep(interval);
            batchIncrementalExtract();
            if (++counter % 3 === 0) {
                updateStatus(`📄 ${batchCurrentTitle}<br>${batchCurrentMessages.length} 条`);
            }
            if (Math.abs(container.scrollTop - before) < 5) {
                if (++noChange >= 3) break;
            } else noChange = 0;
            if (container.scrollTop <= 0) break;
        }
        batchIncrementalExtract();
    }

    function batchGetRawMessages() {
        const raw = extractRawMessages();
        return raw.filter(m => m.html && m.html.trim().length > 0);
    }

    async function batchScrapeCurrent() {
        batchCurrentTitle = batchGetTitle();
        updateStatus(`📄 抓取: ${batchCurrentTitle}`);
        updateProgress(0);
        batchCollected.clear();
        batchCurrentMessages = [];
        const container = findScrollContainer();
        if (!container) return;
        await batchQuickToTop(container);
        if (batchStopReq) return;
        await batchScrollDown(container);
        if (batchStopReq) return;
        await sleep(500);
        await batchScrollUp(container);
        const rawMsgs = batchGetRawMessages();
        const userCount = rawMsgs.filter(m => m.role === 'user').length;
        updateStatus(`✅ ${batchCurrentTitle}: ${userCount} 轮 (${rawMsgs.length} 条)`);
        updateProgress(100);
        return rawMsgs;
    }

    function batchStoreMessages(title, messages) {
        if (!messages || !messages.length) return;
        batchAllContents.push({ title: title || '未命名', messages: messages });
    }

    // ==================== 批量导出 ====================
    function batchExportAll(format) {
        if (!batchAllContents.length) {
            alert('没有批量抓取的内容可导出');
            return;
        }

        const mode = exportModeSelect.value;
        const title = getCurrentChatTitle();

        if (mode === 'separate') {
            let successCount = 0;
            for (const item of batchAllContents) {
                const msgs = item.messages;
                if (!msgs || !msgs.length) continue;
                const userCount = msgs.filter(m => m.role === 'user').length;
                const chatTitle = item.title || '未命名';

                let content, ext, mime;
                const opts = {
                    includeThinking: false,
                    exportUser: true,
                    exportAI: true
                };

                switch (format) {
                    case 'txt':
                        content = buildPlainText(msgs, opts);
                        ext = 'txt';
                        mime = 'text/plain';
                        break;
                    case 'html':
                        content = buildHTML(msgs, false);
                        ext = 'html';
                        mime = 'text/html';
                        break;
                    case 'md':
                    default:
                        content = buildMarkdown(msgs, false);
                        ext = 'md';
                        mime = 'text/markdown';
                        break;
                }

                if (!content || !content.trim()) continue;
                const filename = generateFilename(ext, chatTitle);
                saveFile(content, filename, mime);
                addExportHistory(chatTitle, userCount, ext);
                successCount++;
            }
            updateExportHistoryUI();
            sendNotification('✅ 批量导出完成', `共导出 ${successCount} 个对话 (${format.toUpperCase()})`, '📦');
            updateStatus(`✅ 批量导出完成！${successCount} 个对话 (${format.toUpperCase()})`);
        } else {
            let mergedContent = '';
            let totalRounds = 0;

            for (const item of batchAllContents) {
                const msgs = item.messages;
                if (!msgs || !msgs.length) continue;
                const chatTitle = item.title || '未命名';
                const userCount = msgs.filter(m => m.role === 'user').length;
                totalRounds += userCount;

                let chatContent;
                const opts = {
                    includeThinking: false,
                    exportUser: true,
                    exportAI: true
                };

                switch (format) {
                    case 'txt':
                        chatContent = buildPlainText(msgs, opts);
                        break;
                    case 'html':
                        chatContent = buildHTML(msgs, false);
                        break;
                    case 'md':
                    default:
                        chatContent = buildMarkdown(msgs, false);
                        break;
                }

                if (!chatContent || !chatContent.trim()) continue;

                if (format === 'html') {
                    mergedContent += `<div style="border:2px solid #89b4fa;padding:16px;margin:20px 0;border-radius:12px;"><h2>📁 ${chatTitle}</h2>${chatContent}</div><hr>`;
                } else {
                    mergedContent += `===== ${chatTitle} =====\n\n${chatContent}\n\n\n`;
                }
            }

            if (!mergedContent || !mergedContent.trim()) {
                alert('合并内容为空');
                return;
            }

            let ext, mime;
            switch (format) {
                case 'txt':
                    ext = 'txt';
                    mime = 'text/plain';
                    break;
                case 'html':
                    ext = 'html';
                    mime = 'text/html';
                    break;
                case 'md':
                default:
                    ext = 'md';
                    mime = 'text/markdown';
                    break;
            }

            if (format === 'html') {
                mergedContent = `<html><head><meta charset="utf-8"><title>DeepSeek 批量导出</title>
                    <style>body{max-width:800px;margin:40px auto;padding:20px;font-family:system-ui,sans-serif;line-height:1.7;background:#fafafa;color:#222;}
                    .msg{margin:20px 0;padding:16px 20px;border-radius:12px;}.user{background:#e3f2fd;}.assistant{background:#f5f5f5;}
                    .label{font-weight:600;font-size:14px;margin-bottom:6px;color:#555;}.content{white-space:pre-wrap;}
                    pre{background:#2d2d2d;color:#f8f8f2;padding:16px;border-radius:8px;overflow-x:auto;}code{font-family:monospace;}
                    hr{margin:30px 0;border:1px solid #e0e0e0;}img{max-width:100%;}</style></head><body>
                    <h1>📦 DeepSeek 批量导出</h1>
                    <p>共 ${batchAllContents.length} 个对话，总计 ${totalRounds} 轮</p>
                    <hr>
                    ${mergedContent}
                    <hr>
                    <p style="color:#888;font-size:13px;">导出时间：${new Date().toLocaleString('zh-CN')} | 导出工具：DeepSeek 对话导出 V3.1</p>
                </body></html>`;
            }

            const filename = generateFilename(ext, '批量导出_合并');
            saveFile(mergedContent, filename, mime);
            addExportHistory('批量合并导出', totalRounds, ext);
            updateExportHistoryUI();
            sendNotification('✅ 批量合并导出完成', `${batchAllContents.length} 个对话合并为 ${format.toUpperCase()}`, '📦');
            updateStatus(`✅ 合并导出完成！${batchAllContents.length} 个对话 (${format.toUpperCase()})`);
        }
    }

    // ==================== 批量控制 ====================
    async function batchStartProcess() {
        batchRunning = true;
        batchStopReq = false;
        batchPaused = false;
        batchProcessed.clear();
        batchAllContents = [];
        batchStart.disabled = true;
        batchPause.disabled = false;
        batchStop.disabled = false;
        [scrapeAll, scrapeUp, scrapeDown].forEach(b => b.disabled = true);
        stopSingle.disabled = true;

        const keyword = filterInput.value.trim().toLowerCase();
        let links = getChatLinks();

        if (keyword) {
            const all = getChatLinks();
            const matched = all.filter(a => a.textContent.trim().toLowerCase().includes(keyword));
            updateStatus(`🔍 筛选 "${keyword}": 找到 ${matched.length} 个 (共 ${all.length} 个)`);
            if (!matched.length) { batchCleanup(); updateStatus('⚠️ 无匹配对话'); return; }
            links = matched;
        }

        if (!links.length) {
            batchCleanup();
            updateStatus('❌ 未找到对话链接');
            return;
        }

        let current = getCurrentChatLink();
        let startIdx = 0;
        if (current) {
            const idx = links.findIndex(a => a.href === current.href);
            if (idx >= 0) startIdx = idx;
        } else {
            await batchClickLink(links[0]);
            await sleep(2000);
        }

        for (let i = startIdx; i < links.length; i++) {
            if (batchStopReq || batchPaused) break;
            const link = links[i];
            if (batchProcessed.has(link.href)) continue;

            const cur = getCurrentChatLink();
            if (!cur || cur.href !== link.href) {
                const el = getChatLinks().find(a => a.href === link.href);
                if (!el) continue;
                await batchClickLink(el);
                await sleep(2000);
            }

            const rawMsgs = await batchScrapeCurrent();
            if (batchStopReq) break;
            if (rawMsgs && rawMsgs.length > 0) {
                const title = batchCurrentTitle || batchGetTitle();
                batchStoreMessages(title, rawMsgs);
                batchProcessed.add(link.href);
            }
        }

        const count = batchProcessed.size;
        batchCleanup();
        if (count > 0) {
            updateStatus(`✅ 批量完成！共 ${count} 个对话，点击 MD/TXT/HTML 导出`);
            updateExportButtons();
            sendNotification('✅ 批量抓取完成', `共 ${count} 个对话，点击格式按钮导出`, '📦');
        } else {
            updateStatus('⚠️ 未抓取到任何内容');
        }
    }

    function batchCleanup() {
        batchRunning = false;
        batchStart.disabled = false;
        batchPause.disabled = true;
        batchStop.disabled = true;
        [scrapeAll, scrapeUp, scrapeDown].forEach(b => b.disabled = false);
        stopSingle.disabled = true;
        updateProgress(0);
        updateExportButtons();
    }

    function batchTogglePause() {
        if (!batchRunning) return;
        batchPaused = !batchPaused;
        batchPause.textContent = batchPaused ? '▶ 继续' : '⏸ 暂停';
        if (!batchPaused) {
            batchStartProcess();
        } else {
            updateStatus(`⏸ 已暂停，已抓取 ${batchProcessed.size} 个`);
        }
    }

    function batchRequestStop() {
        batchStopReq = true;
        batchPaused = false;
    }

    // ==================== 导出按钮事件 ====================
    function handleExportClick(format) {
        if (currentMode === 'single') {
            startExport(cachedMessages, format);
        } else {
            batchExportAll(format);
        }
    }

    // ==================== 事件绑定 ====================
    scrapeAll.addEventListener('click', singleStartAll);
    scrapeUp.addEventListener('click', () => singleStart('up'));
    scrapeDown.addEventListener('click', () => singleStart('down'));
    stopSingle.addEventListener('click', singleStop);

    batchStart.addEventListener('click', batchStartProcess);
    batchPause.addEventListener('click', batchTogglePause);
    batchStop.addEventListener('click', batchRequestStop);

    exportMD.addEventListener('click', () => handleExportClick('md'));
    exportTXT.addEventListener('click', () => handleExportClick('txt'));
    exportHTML.addEventListener('click', () => handleExportClick('html'));

    closeBtn.addEventListener('click', () => {
        if ((singleRunning || batchRunning) && !confirm('抓取进行中，确定关闭？')) return;
        if (singleRunning) singleStop();
        if (batchRunning) batchRequestStop();
        panel.remove();
        window.__dsScraperV3Lite = false;
    });

    window.addEventListener('beforeunload', () => {
        if (singleRunning) singleStop();
        if (batchRunning) batchRequestStop();
    });

    // ==================== 初始化 ====================
    collapsePanel();
    setButtonsDisabled(false);
    updateExportHistoryUI();
    requestNotificationPermission();

    console.log('🚀 DeepSeek 对话导出 V3.1 轻量版已启动');
    console.log('🔧 修复：批量导出支持 MD/TXT/HTML 格式选择');

})();