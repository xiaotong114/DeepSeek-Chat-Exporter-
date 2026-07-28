// ==UserScript==
// @name         DeepSeek 聊天记录导出
// @namespace    http://tampermonkey.net/
// @version      1.0
// @description  启动显示为圆形图标，点击展开，向上/向下/全部自动滚动，勾选轮次，MD/TXT导出，思维链开关，可拖动，亮暗主题
// @match        *://*.deepseek.com/*
// @grant        none
// @license      MIT
// ==/UserScript==
 
(function() {
    'use strict';
 
    if (window.__deepseekExportScraper) return;
    window.__deepseekExportScraper = true;
 
    // ==================== 全局状态 ====================
    let cachedMessages = [];
    let collectedKeySet = new Set();
    let isScraping = false;
    let stopRequested = false;
    let currentDirection = null;
    let isAllMode = false;
    let scrollInterval = null;
    let scrollContainer = null;
    let hasDragged = false;
    let btnOffsetX = 0, btnOffsetY = 0;
    let isCollapsed = true; // 默认折叠状态
 
    // ==================== 工具函数 ====================
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
    function generateFilename(ext) {
        const now = new Date();
        const pad = (n) => n.toString().padStart(2, '0');
        return `DeepSeek对话_${now.getFullYear()}-${pad(now.getMonth()+1)}-${pad(now.getDate())}_${pad(now.getHours())}-${pad(now.getMinutes())}-${pad(now.getSeconds())}.${ext}`;
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
                if (tag === 'script' && node.getAttribute('type') === 'math/tex') return '$' + node.textContent.trim() + '$';
                if (tag === 'script' && node.getAttribute('type') === 'math/tex; mode=display') return '\n$$\n' + node.textContent.trim() + '\n$$\n\n';
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
            } catch (e) { return node.textContent || ''; }
        }
        let md = processNode(div);
        md = md.replace(/\n{3,}/g, '\n\n');
        return md.trim();
    }
 
    function isThinkingElement(el) {
        if (el.querySelector('.ds-think-content')) return true;
        if (el.className.includes('think') || el.className.includes('reason')) return true;
        const span = el.querySelector('span');
        if (span && /^已思考（用时 .* 秒）$/.test(span.innerText.trim())) {
            return el.querySelectorAll('.ds-icon, svg').length >= 2;
        }
        return false;
    }
    function isAssistant(el) {
        return el.className.includes('assistant') || el.className.includes('ds-assistant');
    }
    function isAIGeneratedHint(el) {
        return el.innerText.trim() === '本回答由 AI 生成，内容仅供参考，请仔细甄别';
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
 
    // ==================== 消息提取（去重增量） ====================
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
 
    function collectNewMessages() {
        const raw = extractRawMessages();
        let added = 0;
        raw.forEach(msg => {
            const key = msg.role + '_' + (msg.html.slice(0, 150).replace(/\s+/g, ' ')) + '_len' + msg.html.length;
            if (!collectedKeySet.has(key)) {
                collectedKeySet.add(key);
                cachedMessages.push(msg);
                added++;
            }
        });
        return added;
    }
 
    // ==================== 滚动容器查找 ====================
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
 
    // ==================== 抓取进度UI更新 ====================
    function updateProgressAndStatus(forceStatus) {
        const total = cachedMessages.length;
        const userCount = cachedMessages.filter(m => m.role === 'user').length;
        document.getElementById('ds-scraper-status').innerText = forceStatus || `📊 已收集 ${userCount} 轮对话 (共 ${total} 条消息)`;
        if (scrollContainer) {
            const progress = (scrollContainer.scrollTop / (scrollContainer.scrollHeight - scrollContainer.clientHeight)) * 100;
            document.getElementById('ds-scraper-progress').style.width = Math.min(progress, 100) + '%';
        }
    }
 
    function setButtonsDisabled(disabled) {
        document.getElementById('ds-scraper-all-btn').disabled = disabled;
        document.getElementById('ds-scraper-up-btn').disabled = disabled;
        document.getElementById('ds-scraper-down-btn').disabled = disabled;
        document.getElementById('ds-scraper-stop-btn').disabled = !disabled;
    }
 
    // ==================== 滚动步骤 ====================
    function scrollStep() {
        if (!isScraping || stopRequested || !scrollContainer) return;
        const step = parseInt(document.getElementById('ds-scraper-step').value, 10);
        if (currentDirection === 'up') {
            scrollContainer.scrollBy({ top: -step, behavior: 'auto' });
        } else {
            scrollContainer.scrollBy({ top: step, behavior: 'auto' });
        }
        setTimeout(() => {
            if (!isScraping || stopRequested) return;
            collectNewMessages();
            updateProgressAndStatus();
            const atTop = scrollContainer.scrollTop <= 0;
            const atBottom = (scrollContainer.scrollTop + scrollContainer.clientHeight) >= scrollContainer.scrollHeight - 5;
            if ((currentDirection === 'up' && atTop) || (currentDirection === 'down' && atBottom)) {
                finishCurrentDirection();
            } else {
                if (!window.__dsNoChange) window.__dsNoChange = { count: 0, lastTop: 0 };
                const topNow = scrollContainer.scrollTop;
                if (Math.abs(topNow - window.__dsNoChange.lastTop) < 5) {
                    window.__dsNoChange.count++;
                    if (window.__dsNoChange.count >= 4) {
                        finishCurrentDirection();
                        return;
                    }
                } else {
                    window.__dsNoChange.count = 0;
                }
                window.__dsNoChange.lastTop = topNow;
            }
        }, 200);
    }
 
    function finishCurrentDirection() {
        clearInterval(scrollInterval);
        scrollInterval = null;
        if (isAllMode && currentDirection === 'up') {
            currentDirection = 'down';
            document.getElementById('ds-scraper-status').innerText = '⬇ 向下滚动中...';
            const interval = parseInt(document.getElementById('ds-scraper-interval').value, 10);
            scrollInterval = setInterval(scrollStep, interval);
        } else {
            stopScraping(true);
        }
    }
 
    // ==================== 抓取启动 ====================
    function startScraping(mode) {
        if (isScraping) return;
        isScraping = true;
        stopRequested = false;
        cachedMessages = [];
        collectedKeySet = new Set();
        isAllMode = (mode === 'all');
        currentDirection = (mode === 'down') ? 'down' : 'up';
        window.__dsNoChange = { count: 0, lastTop: 0 };
        scrollContainer = findScrollContainer();
        document.getElementById('ds-scraper-status').innerText = mode === 'down' ? '⬇ 向下滚动中...' : '⬆ 向上滚动中...';
        setButtonsDisabled(true);
        document.getElementById('ds-scraper-md-btn').disabled = true;
        document.getElementById('ds-scraper-txt-btn').disabled = true;
        collectNewMessages();
        updateProgressAndStatus();
        const interval = parseInt(document.getElementById('ds-scraper-interval').value, 10);
        scrollInterval = setInterval(scrollStep, interval);
    }
 
    function stopScraping(complete = false) {
        stopRequested = true;
        isScraping = false;
        isAllMode = false;
        if (scrollInterval) {
            clearInterval(scrollInterval);
            scrollInterval = null;
        }
        setButtonsDisabled(false);
        document.getElementById('ds-scraper-md-btn').disabled = (cachedMessages.length === 0);
        document.getElementById('ds-scraper-txt-btn').disabled = (cachedMessages.length === 0);
        if (complete) {
            document.getElementById('ds-scraper-status').innerText = '✅ 抓取完成！可导出';
            document.getElementById('ds-scraper-progress').style.width = '100%';
        } else {
            document.getElementById('ds-scraper-status').innerText = '⏹ 已停止，可导出已抓取内容';
            document.getElementById('ds-scraper-progress').style.width = '0%';
        }
        window.__dsNoChange = null;
    }
 
    // ==================== 导出逻辑 ====================
    function parseRoundInput(input, maxRound) {
        const trimmed = input.trim().toLowerCase();
        if (trimmed === 'all' || trimmed === '') return Array.from({length: maxRound}, (_, i) => i+1);
        const parts = trimmed.split(',').map(p => p.trim());
        const rounds = new Set();
        for (const part of parts) {
            if (part.includes('-')) {
                const [s, e] = part.split('-').map(v => parseInt(v.trim()));
                if (isNaN(s) || isNaN(e) || s<1 || e>maxRound || s>e) return null;
                for (let i=s; i<=e; i++) rounds.add(i);
            } else {
                const n = parseInt(part);
                if (isNaN(n) || n<1 || n>maxRound) return null;
                rounds.add(n);
            }
        }
        return Array.from(rounds).sort((a,b)=>a-b);
    }
    function formatRounds(rounds) {
        if (!rounds.length) return '';
        const sorted = [...rounds].sort((a,b)=>a-b);
        const ranges = []; let start = sorted[0], end = sorted[0];
        for (let i=1; i<sorted.length; i++) {
            if (sorted[i] === end+1) end = sorted[i];
            else { ranges.push(start===end?`${start}`:`${start}-${end}`); start = sorted[i]; end = sorted[i]; }
        }
        ranges.push(start===end?`${start}`:`${start}-${end}`);
        return ranges.join(',');
    }
    function filterMessagesByRounds(messages, selectedRounds) {
        if (!selectedRounds?.length) return [];
        const set = new Set(selectedRounds);
        const out = []; let round = 0;
        for (let i=0; i<messages.length; i++) {
            if (messages[i].role === 'user') {
                round++;
                if (set.has(round)) {
                    out.push(messages[i]);
                    if (i+1 < messages.length && messages[i+1].role === 'assistant') {
                        out.push(messages[i+1]); i++;
                    }
                }
            }
        }
        return out;
    }
    function buildMarkdown(messages, includeThinking) {
        const userMsgs = messages.filter(m=>m.role==='user');
        let toc = '';
        if (userMsgs.length) {
            const items = userMsgs.map((m,i) => {
                const plain = getPlainText(m.html); const clean = removeNewlines(plain);
                return `${i+1}. [${truncate(clean,100)||'[图片]'}](#msg-${i+1})`;
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
        return toc + body;
    }
    function buildPlainText(messages, opts) {
        let text = '';
        for (const m of messages) {
            if (m.role === 'user' && !opts.exportUser) continue;
            if (m.role === 'assistant' && !opts.exportAI) continue;
            const html = (m.role==='assistant' && !opts.includeThinking) ? removeThinkingElements(m.html) : m.html;
            let content = htmlToPlainText(html);
            if (!content && /<img/i.test(html)) content = '[图片]';
            text += (m.role==='user' ? '用户: ' : 'AI: ') + content + '\n';
        }
        return text.replace(/\n+$/, '');
    }
 
    function showRoundDialog(messages, showContentOpts, callback) {
        const old = document.getElementById('ds-export-dialog'); if (old) old.remove();
        const userMsgs = messages.filter(m=>m.role==='user');
        const userCount = userMsgs.length;
        const assistantCount = messages.filter(m=>m.role==='assistant').length;
        const userSummaries = userMsgs.map(m => {
            const t = getPlainText(m.html); return t ? removeNewlines(t) : (m.html.includes('<img')?'[图片消息]':'');
        });
        const overlay = document.createElement('div');
        overlay.id = 'ds-export-dialog';
        overlay.style.cssText = 'position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.4);z-index:99999;display:flex;align-items:center;justify-content:center;';
        const box = document.createElement('div');
        box.style.cssText = 'background:white;border-radius:12px;padding:24px;max-width:550px;width:90%;max-height:80vh;display:flex;flex-direction:column;box-shadow:0 10px 25px rgba(0,0,0,0.3);font-family:sans-serif;';
        let contentHTML = '';
        if (showContentOpts) {
            contentHTML = `<div style="margin-top:12px;font-size:13px;color:#555;">
                <label><input type="checkbox" id="ds-export-user" checked> 导出用户消息</label>
                <label style="margin-left:20px;"><input type="checkbox" id="ds-export-ai" checked> 导出 AI 消息</label>
            </div>`;
        }
        box.innerHTML = `
            <h3 style="margin-top:0;">📤 选择要导出的轮次</h3>
            <p style="color:#555;margin-bottom:8px;">已抓取 <b>${userCount}</b> 轮对话（用户${userCount}条，助手${assistantCount}条）</p>
            <div style="display:flex;gap:10px;margin-bottom:12px;">
                <button id="ds-select-all" style="padding:6px 12px;font-size:12px;background:#e9ecef;border:1px solid #ced4da;border-radius:4px;cursor:pointer;">全选</button>
                <button id="ds-select-none" style="padding:6px 12px;font-size:12px;background:#e9ecef;border:1px solid #ced4da;border-radius:4px;cursor:pointer;">取消全选</button>
                <span style="flex:1;"></span>
                <span style="font-size:12px;color:#888;align-self:center;">已选 <span id="ds-selected-count">${userCount}</span> 轮</span>
            </div>
            <div id="ds-round-list" style="overflow-y:auto;max-height:250px;border:1px solid #dee2e6;border-radius:6px;padding:4px;background:#f8f9fa;"></div>
            <div style="margin-top:12px;">
                <label style="font-size:13px;color:#555;">手动输入范围（与勾选同步）：</label>
                <input type="text" id="ds-round-input" style="width:100%;padding:10px;font-size:15px;border:1px solid #ccc;border-radius:6px;box-sizing:border-box;margin-top:4px;" value="all">
            </div>
            <div style="margin-top:12px;font-size:13px;color:#555;">
                <label><input type="checkbox" id="ds-export-thinking"> 包含思维链（思考过程）</label>
            </div>
            ${contentHTML}
            <div style="margin-top:16px;display:flex;gap:10px;justify-content:flex-end;">
                <button id="ds-round-cancel" style="padding:10px 20px;border:none;background:#ddd;border-radius:6px;cursor:pointer;">取消</button>
                <button id="ds-round-confirm" style="padding:10px 20px;border:none;background:#17a2b8;color:white;border-radius:6px;cursor:pointer;">确认导出</button>
            </div>
        `;
        overlay.appendChild(box);
        document.body.appendChild(overlay);
 
        const list = document.getElementById('ds-round-list');
        const input = document.getElementById('ds-round-input');
        const checkboxes = [];
        for (let i=0; i<userCount; i++) {
            const label = document.createElement('label');
            label.style.cssText = 'display:flex;align-items:center;padding:6px 8px;border-bottom:1px solid #e9ecef;cursor:pointer;background:white;transition:background 0.1s;';
            label.innerHTML = `<input type="checkbox" class="ds-round-checkbox" data-round="${i+1}" checked style="margin-right:10px;"><span style="font-size:13px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${i+1}. ${escapeHtml(truncate(userSummaries[i]||'',80))}</span>`;
            checkboxes.push(label.querySelector('input'));
            list.appendChild(label);
        }
        function escapeHtml(t){ const d=document.createElement('div'); d.textContent=t; return d.innerHTML; }
        function getSelected(){ return checkboxes.filter(c=>c.checked).map(c=>parseInt(c.dataset.round)); }
        function updateInput(){ const s=getSelected(); input.value = s.length===userCount?'all':(s.length===0?'':formatRounds(s)); document.getElementById('ds-selected-count').textContent=s.length; }
        function updateCheckboxes(){ const p=parseRoundInput(input.value,userCount); if(!p)return; const s=new Set(p); checkboxes.forEach(c=>c.checked=s.has(parseInt(c.dataset.round))); document.getElementById('ds-selected-count').textContent=s.size; }
        updateInput();
        checkboxes.forEach(c=>c.addEventListener('change',updateInput));
        input.addEventListener('input',()=>{ updateCheckboxes(); if(input.value.trim()===''){ checkboxes.forEach(c=>c.checked=true); updateInput(); } });
        document.getElementById('ds-select-all').addEventListener('click',()=>{ checkboxes.forEach(c=>c.checked=true); updateInput(); });
        document.getElementById('ds-select-none').addEventListener('click',()=>{ checkboxes.forEach(c=>c.checked=false); updateInput(); });
        document.getElementById('ds-round-confirm').addEventListener('click',()=>{
            const selected = getSelected();
            if (selected.length===0) { alert('请至少选择一轮对话'); return; }
            const opts = {
                rounds: input.value.trim()||'all',
                includeThinking: document.getElementById('ds-export-thinking')?.checked ?? false,
                exportUser: document.getElementById('ds-export-user')?.checked ?? true,
                exportAI: document.getElementById('ds-export-ai')?.checked ?? true
            };
            overlay.remove();
            callback(opts);
        });
        document.getElementById('ds-round-cancel').addEventListener('click',()=>{ overlay.remove(); callback(null); });
    }
 
    async function saveFile(content, filename, mimeType, extensions) {
        if (window.showSaveFilePicker) {
            try {
                const handle = await window.showSaveFilePicker({ suggestedName: filename, types: [{ description:'文件', accept:{ [mimeType]: extensions } }] });
                const writable = await handle.createWritable();
                await writable.write(content);
                await writable.close();
                return;
            } catch(e) { if (e.name==='AbortError') return; }
        }
        const blob = new Blob([content],{type:mimeType+';charset=utf-8'});
        const url = URL.createObjectURL(blob); const a=document.createElement('a'); a.href=url; a.download=filename;
        document.body.appendChild(a); a.click(); document.body.removeChild(a);
        setTimeout(()=>URL.revokeObjectURL(url),5000);
    }
 
    function startExportMD() {
        if (!cachedMessages.length) { alert('请先点击“抓取全部对话”加载完整内容'); return; }
        showRoundDialog(cachedMessages, false, (opts)=>{
            if (!opts) return;
            const selected = parseRoundInput(opts.rounds, cachedMessages.filter(m=>m.role==='user').length);
            if (!selected) { alert('范围格式错误'); return; }
            const filtered = filterMessagesByRounds(cachedMessages, selected);
            const md = buildMarkdown(filtered, opts.includeThinking);
            if (!md.trim()) { alert('转换后内容为空'); return; }
            saveFile(md, generateFilename('md'), 'text/markdown', ['.md','.markdown']);
        });
    }
 
    function startExportTXT() {
        if (!cachedMessages.length) { alert('请先点击“抓取全部对话”加载完整内容'); return; }
        showRoundDialog(cachedMessages, true, (opts)=>{
            if (!opts) return;
            const selected = parseRoundInput(opts.rounds, cachedMessages.filter(m=>m.role==='user').length);
            if (!selected) { alert('范围格式错误'); return; }
            const filtered = filterMessagesByRounds(cachedMessages, selected);
            const txt = buildPlainText(filtered, opts);
            if (!txt.trim()) { alert('转换后内容为空'); return; }
            saveFile(txt, generateFilename('txt'), 'text/plain', ['.txt']);
        });
    }
 
    // ==================== UI 面板与样式 ====================
    const panelCSS = `
        #ds-export-panel {
            position:fixed; top:80px; right:20px; z-index:99999;
            background:rgba(20,25,35,0.88); backdrop-filter:blur(16px) saturate(180%);
            -webkit-backdrop-filter:blur(16px) saturate(180%); color:#eef2fb;
            border-radius:20px; box-shadow:0 20px 40px rgba(0,0,0,0.4),0 0 0 1px rgba(255,255,255,0.05) inset;
            font-family:'Inter',system-ui,-apple-system,sans-serif; font-size:13px;
            width:340px; padding:20px; user-select:none;
            transition:all 0.3s cubic-bezier(0.2,0.9,0.4,1);
        }
        #ds-export-panel.collapsed {
            width:52px; height:52px; padding:0; border-radius:26px;
            background:rgba(30,40,60,0.9); cursor:grab;
            display:flex; align-items:center; justify-content:center;
        }
        #ds-export-panel.collapsed:active { cursor:grabbing; }
        #ds-export-panel.collapsed .panel-content { display:none; }
        #ds-export-panel.collapsed .collapse-icon { display:flex; font-size:26px; opacity:0.9; }
        #ds-export-panel .collapse-icon { display:none; }
        #ds-export-panel .header { display:flex; justify-content:space-between; align-items:center; margin-bottom:18px; }
        #ds-export-panel .header h3 { margin:0; color:#b7c9e2; font-size:16px; font-weight:500; display:flex; align-items:center; gap:8px; }
        #ds-export-panel .header h3::before { content:"📜"; font-size:18px; }
        #ds-export-panel .header-actions { display:flex; gap:8px; align-items:center; }
        #ds-export-panel .collapse-btn, #ds-export-panel .close-btn {
            cursor:pointer; color:#7f8fa3; font-size:18px; width:28px; height:28px;
            display:flex; align-items:center; justify-content:center; border-radius:50%;
            background:rgba(255,255,255,0.03); transition:all 0.2s;
        }
        #ds-export-panel .theme-btn {
            cursor:pointer; font-size:18px; width:28px; height:28px;
            display:flex; align-items:center; justify-content:center; border-radius:50%;
            background:rgba(255,255,255,0.05); transition:all 0.2s;
        }
        #ds-export-panel .collapse-btn:hover { color:#a8c1e0; background:rgba(255,255,255,0.1); }
        #ds-export-panel .close-btn:hover { color:#ff7b89; background:rgba(255,123,137,0.15); }
        #ds-export-panel .theme-btn:hover { background:rgba(255,255,255,0.15); }
        #ds-export-panel .btn-group { display:flex; flex-direction:column; gap:10px; margin-bottom:18px; }
        #ds-export-panel button {
            display:flex; align-items:center; justify-content:center; gap:6px; width:100%;
            padding:12px 16px; border:none; border-radius:14px; background:rgba(45,55,72,0.7);
            color:#e0e7ff; font-weight:500; font-size:14px; cursor:pointer;
            transition:all 0.25s; border:1px solid rgba(255,255,255,0.06);
            box-shadow:0 2px 4px rgba(0,0,0,0.1); letter-spacing:0.2px; backdrop-filter:blur(4px);
        }
        #ds-export-panel button:hover { background:rgba(60,75,95,0.8); border-color:rgba(255,255,255,0.15); transform:translateY(-1px); }
        #ds-export-panel button:active { transform:translateY(1px); }
        #ds-export-panel button.primary { background:linear-gradient(145deg,#5f7eb0,#4a6792); border:1px solid rgba(255,255,255,0.2); color:white; font-weight:600; }
        #ds-export-panel button.stop { background:linear-gradient(145deg,#b55a6b,#9e4a5a); border:1px solid rgba(255,255,255,0.15); color:white; }
        #ds-export-panel button.export { background:linear-gradient(145deg,#17a2b8,#138496); border:1px solid rgba(255,255,255,0.2); color:white; }
        #ds-export-panel button:disabled { opacity:0.45; filter:grayscale(0.5); pointer-events:none; }
        #ds-export-panel .config-section { background:rgba(0,0,0,0.2); border-radius:16px; padding:14px 16px; margin:18px 0; }
        #ds-export-panel .config-row { display:flex; align-items:center; gap:12px; margin-bottom:12px; color:#b0c2da; font-size:13px; }
        #ds-export-panel .config-row label { width:60px; }
        #ds-export-panel .config-row input { flex:1; background:rgba(20,28,40,0.7); border:1px solid rgba(255,255,255,0.1); border-radius:12px; color:#e0e7ff; padding:8px 14px; }
        #ds-export-panel .status { margin:8px 0; font-size:13px; color:#c6d3e8; text-align:center; min-height:36px; padding:8px 12px; background:rgba(0,0,0,0.15); border-radius:24px; }
        #ds-export-panel .progress { height:6px; background:rgba(0,0,0,0.4); border-radius:20px; overflow:hidden; margin:12px 0 6px; }
        #ds-export-panel .progress-bar { height:100%; width:0%; background:linear-gradient(90deg,#8fc1a0,#a8d8b9); border-radius:20px; transition:width 0.2s; }
        #ds-export-panel .footer-note { font-size:11px; color:#8a9bb5; text-align:center; margin-top:16px; opacity:0.75; }
        #ds-export-panel .badge { background:rgba(127,155,194,0.15); padding:2px 8px; border-radius:30px; font-size:11px; }
 
        /* 亮色主题 */
        #ds-export-panel.light {
            background: rgba(255, 255, 255, 0.9);
            color: #1a1a1a;
            box-shadow: 0 20px 40px rgba(0,0,0,0.1), 0 0 0 1px rgba(0,0,0,0.05) inset;
        }
        #ds-export-panel.light .header h3 { color: #333; }
        #ds-export-panel.light button {
            background: rgba(240,240,245,0.9); color: #222; border-color: rgba(0,0,0,0.08);
        }
        #ds-export-panel.light button:hover { background: rgba(225,225,235,0.9); }
        #ds-export-panel.light button.primary { background: linear-gradient(145deg,#6c8fc7,#5a7ab0); color:white; }
        #ds-export-panel.light button.stop { background: linear-gradient(145deg,#d06a7b,#b85a6a); color:white; }
        #ds-export-panel.light button.export { background: linear-gradient(145deg,#20b2aa,#1a8c86); color:white; }
        #ds-export-panel.light .config-section { background: rgba(0,0,0,0.05); }
        #ds-export-panel.light .config-row { color: #444; }
        #ds-export-panel.light .config-row input { background: rgba(0,0,0,0.05); border-color: rgba(0,0,0,0.1); color: #222; }
        #ds-export-panel.light .status { color: #333; background: rgba(0,0,0,0.03); }
        #ds-export-panel.light .footer-note { color: #666; }
        #ds-export-panel.light .badge { background: rgba(0,0,0,0.05); color: #555; }
    `;
    document.head.appendChild(document.createElement('style')).textContent = panelCSS;
 
    const panel = document.createElement('div');
    panel.id = 'ds-export-panel';
    panel.innerHTML = `
        <div class="collapse-icon" style="display:none;">📜</div>
        <div class="panel-content">
            <div class="header">
                <h3>对话导出<span class="badge">v1.0</span></h3>
                <div class="header-actions">
                    <span class="theme-btn" id="ds-theme-toggle" title="切换亮色/暗色">☀️</span>
                    <span class="collapse-btn" title="折叠面板">▼</span>
                    <span class="close-btn" title="关闭">×</span>
                </div>
            </div>
            <div class="btn-group">
                <button id="ds-scraper-all-btn" class="primary">🔄 抓取全部（先上后下）</button>
                <div style="display:flex; gap:10px;">
                    <button id="ds-scraper-up-btn" class="primary" style="flex:1;">⬆ 向上</button>
                    <button id="ds-scraper-down-btn" class="primary" style="flex:1;">⬇ 向下</button>
                </div>
                <button id="ds-scraper-stop-btn" class="stop" disabled>⏹ 停止抓取</button>
                <button id="ds-scraper-md-btn" class="export" disabled>📄 导出 MD</button>
                <button id="ds-scraper-txt-btn" class="export" disabled>📄 导出 TXT</button>
            </div>
            <div class="config-section">
                <div class="config-row">
                    <label>⏱️ 间隔</label>
                    <input id="ds-scraper-interval" type="number" min="50" max="5000" value="300" step="10">
                    <span style="opacity:0.6;font-size:12px;">ms</span>
                </div>
                <div class="config-row">
                    <label>📏 步长</label>
                    <input id="ds-scraper-step" type="number" min="200" max="2000" value="600" step="50">
                    <span style="opacity:0.6;font-size:12px;">px</span>
                </div>
            </div>
            <div class="status" id="ds-scraper-status">✨ 就绪，请先抓取完整对话</div>
            <div class="progress"><div class="progress-bar" id="ds-scraper-progress"></div></div>
            <div class="footer-note">💡 可拖动 · 点击图标展开 · 主题切换</div>
        </div>
    `;
    document.body.appendChild(panel);
 
    // 按钮引用
    const collapseBtn = panel.querySelector('.collapse-btn');
    const collapseIcon = panel.querySelector('.collapse-icon');
    const allBtn = document.getElementById('ds-scraper-all-btn');
    const upBtn = document.getElementById('ds-scraper-up-btn');
    const downBtn = document.getElementById('ds-scraper-down-btn');
    const stopBtn = document.getElementById('ds-scraper-stop-btn');
    const mdBtn = document.getElementById('ds-scraper-md-btn');
    const txtBtn = document.getElementById('ds-scraper-txt-btn');
    const themeBtn = document.getElementById('ds-theme-toggle');
 
    // ==================== 初始化默认折叠状态 ====================
    function initCollapsed() {
        // 先让面板以展开状态渲染，以便获取折叠按钮的正确位置
        panel.classList.remove('collapsed');
        // 强制重排，确保按钮位置计算准确
        panel.offsetHeight;
        const btnRect = collapseBtn.getBoundingClientRect();
        btnOffsetX = btnRect.left - panel.getBoundingClientRect().left + btnRect.width / 2;
        btnOffsetY = btnRect.top - panel.getBoundingClientRect().top + btnRect.height / 2;
        const centerX = btnRect.left + btnRect.width / 2;
        const centerY = btnRect.top + btnRect.height / 2;
        // 移动面板使圆形图标中心对齐按钮中心
        panel.style.left = (centerX - 26) + 'px';
        panel.style.right = 'auto';
        panel.style.top = (centerY - 26) + 'px';
        // 应用折叠样式
        panel.classList.add('collapsed');
        collapseBtn.style.display = 'none';
        collapseIcon.style.display = 'flex';
        isCollapsed = true;
    }
 
    // 在 DOM 完全加载后执行初始化
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initCollapsed);
    } else {
        initCollapsed();
    }
 
    // ==================== 折叠/展开（精确定位） ====================
    collapseBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        isCollapsed = !isCollapsed;
        if (isCollapsed) {
            const btnRect = collapseBtn.getBoundingClientRect();
            btnOffsetX = btnRect.left - panel.getBoundingClientRect().left + btnRect.width / 2;
            btnOffsetY = btnRect.top - panel.getBoundingClientRect().top + btnRect.height / 2;
            const centerX = btnRect.left + btnRect.width / 2;
            const centerY = btnRect.top + btnRect.height / 2;
            panel.style.left = (centerX - 26) + 'px';
            panel.style.right = 'auto';
            panel.style.top = (centerY - 26) + 'px';
            panel.classList.add('collapsed');
        } else {
            expandPanelAtIconCenter();
        }
        collapseBtn.style.display = isCollapsed ? 'none' : 'flex';
        collapseIcon.style.display = isCollapsed ? 'flex' : 'none';
    });
 
    // 点击圆形图标展开
    panel.addEventListener('click', (e) => {
        if (hasDragged) return;
        if (isCollapsed && (e.target === panel || e.target === collapseIcon)) {
            isCollapsed = false;
            expandPanelAtIconCenter();
            panel.classList.remove('collapsed');
            collapseBtn.style.display = 'flex';
            collapseIcon.style.display = 'none';
        }
    });
 
    function expandPanelAtIconCenter() {
        const rect = panel.getBoundingClientRect();
        const iconCenterX = rect.left + rect.width / 2;
        const iconCenterY = rect.top + rect.height / 2;
        panel.style.left = (iconCenterX - btnOffsetX) + 'px';
        panel.style.right = 'auto';
        panel.style.top = (iconCenterY - btnOffsetY) + 'px';
    }
 
    // ==================== 拖动（折叠后圆形图标可拖动） ====================
    let dragging = false, offsetX, offsetY;
    panel.addEventListener('mousedown', (e) => {
        const target = e.target;
        if (target.closest('button') || target.closest('input') || target.closest('.close-btn') || target.closest('.collapse-btn') || target.closest('.theme-btn')) return;
        if (target.closest('.header') || panel.classList.contains('collapsed')) {
            dragging = true;
            hasDragged = false;
            const rect = panel.getBoundingClientRect();
            offsetX = e.clientX - rect.left;
            offsetY = e.clientY - rect.top;
            panel.style.cursor = 'grabbing';
            e.preventDefault();
        }
    });
    document.addEventListener('mousemove', (e) => {
        if (!dragging) return;
        hasDragged = true;
        panel.style.left = (e.clientX - offsetX) + 'px';
        panel.style.right = 'auto';
        panel.style.top = (e.clientY - offsetY) + 'px';
    });
    document.addEventListener('mouseup', () => {
        if (dragging) {
            setTimeout(() => { hasDragged = false; }, 0);
        }
        dragging = false;
        panel.style.cursor = '';
    });
 
    // ==================== 亮暗主题 ====================
    let isLight = false;
    themeBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        isLight = !isLight;
        panel.classList.toggle('light', isLight);
        themeBtn.textContent = isLight ? '🌙' : '☀️';
    });
 
    // ==================== 事件绑定 ====================
    allBtn.addEventListener('click', () => startScraping('all'));
    upBtn.addEventListener('click', () => startScraping('up'));
    downBtn.addEventListener('click', () => startScraping('down'));
    stopBtn.addEventListener('click', () => stopScraping(false));
    mdBtn.addEventListener('click', startExportMD);
    txtBtn.addEventListener('click', startExportTXT);
 
    panel.querySelector('.close-btn').addEventListener('click', () => {
        if (isScraping && !confirm('抓取进行中，确定关闭？')) return;
        stopScraping(false);
        panel.remove();
        window.__deepseekExportScraper = false;
    });
 
    window.addEventListener('beforeunload', () => { if (isScraping) stopScraping(); });
 
    console.log('DeepSeek 导出+抓取 v1.0 已启动 (启动时默认折叠)');
})();





