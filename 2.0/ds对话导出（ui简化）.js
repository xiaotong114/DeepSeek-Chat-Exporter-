// ==UserScript==
// @name         DeepSeek 对话抓取器 (轻量UI版)
// @namespace    http://tampermonkey.net/
// @version      6.1
// @description  功能完全不变，仅UI轻量化，适合性能不佳的设备
// @author       你
// @match        https://chat.deepseek.com/*
// @grant        none
// ==/UserScript==

(function() {
    'use strict';

    if (window.__dsScraperLite) return;
    window.__dsScraperLite = true;

    // ---------- 轻量样式：去毛玻璃、去渐变、去发光、去圆角大、去过渡 ----------
    const style = document.createElement('style');
    style.textContent = `
        #ds-scraper-lite {
            position: fixed;
            top: 80px;
            right: 20px;
            z-index: 999999;
            background: #1e1e2e;
            color: #cdd6f4;
            border-radius: 6px;
            padding: 12px;
            width: 280px;
            font-family: system-ui, sans-serif;
            font-size: 12px;
            box-shadow: 0 2px 8px rgba(0,0,0,0.3);
            border: 1px solid #45475a;
        }
        #ds-scraper-lite.collapsed {
            width: 44px;
            height: 44px;
            padding: 0;
            border-radius: 22px;
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
        }
        #ds-scraper-lite.collapsed .panel-content { display: none; }
        #ds-scraper-lite.collapsed .collapse-icon { display: flex; font-size: 22px; margin: 0; }
        #ds-scraper-lite .panel-content { display: block; }
        #ds-scraper-lite .collapse-icon { display: none; }
        
        #ds-scraper-lite .header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 10px;
            cursor: move;
        }
        #ds-scraper-lite .header h3 {
            margin: 0;
            color: #89b4fa;
            font-size: 14px;
            font-weight: 500;
        }
        #ds-scraper-lite .header-actions { display: flex; gap: 4px; align-items: center; }
        #ds-scraper-lite .collapse-header-btn,
        #ds-scraper-lite .close-btn {
            cursor: pointer;
            color: #6c7086;
            font-size: 16px;
            width: 24px;
            height: 24px;
            display: flex;
            align-items: center;
            justify-content: center;
            border-radius: 4px;
        }
        #ds-scraper-lite .close-btn:hover { color: #f38ba8; }
        #ds-scraper-lite .collapse-header-btn:hover { color: #89b4fa; }
        
        #ds-scraper-lite .mode-switch { display: flex; gap: 4px; margin-bottom: 8px; }
        #ds-scraper-lite .mode-btn {
            flex: 1;
            padding: 4px 6px;
            border: 1px solid #45475a;
            border-radius: 4px;
            background: #313244;
            color: #a6adc8;
            font-size: 11px;
            cursor: pointer;
            text-align: center;
        }
        #ds-scraper-lite .mode-btn.active {
            background: #45475a;
            color: #89b4fa;
            font-weight: 600;
        }
        
        #ds-scraper-lite .btn-group { display: flex; flex-direction: column; gap: 6px; margin-bottom: 10px; }
        #ds-scraper-lite button {
            width: 100%;
            padding: 8px 10px;
            border: 1px solid #45475a;
            border-radius: 4px;
            background: #313244;
            color: #cdd6f4;
            font-weight: 500;
            font-size: 12px;
            cursor: pointer;
        }
        #ds-scraper-lite button:hover { background: #45475a; }
        #ds-scraper-lite button.primary { background: #89b4fa; color: #1e1e2e; border-color: #89b4fa; font-weight: 600; }
        #ds-scraper-lite button.primary:hover { background: #a6c8ff; }
        #ds-scraper-lite button.warning { background: #fab387; color: #1e1e2e; border-color: #fab387; font-weight: 600; }
        #ds-scraper-lite button.stop { background: #f38ba8; color: #1e1e2e; border-color: #f38ba8; font-weight: 600; }
        #ds-scraper-lite button.stop:hover { background: #ffa0b4; }
        #ds-scraper-lite button:disabled { opacity: 0.4; pointer-events: none; }
        
        #ds-scraper-lite .config-section { background: #181825; border-radius: 4px; padding: 8px 10px; margin: 8px 0; border: 1px solid #313244; }
        #ds-scraper-lite .config-row { display: flex; align-items: center; gap: 6px; margin-bottom: 6px; font-size: 11px; }
        #ds-scraper-lite .config-row:last-child { margin-bottom: 0; }
        #ds-scraper-lite .config-row label { width: 50px; flex-shrink: 0; }
        #ds-scraper-lite .config-row input,
        #ds-scraper-lite .config-row select {
            flex: 1;
            background: #1e1e2e;
            border: 1px solid #45475a;
            border-radius: 4px;
            color: #cdd6f4;
            padding: 4px 6px;
            font-size: 11px;
        }
        #ds-scraper-lite .config-row select { cursor: pointer; }
        #ds-scraper-lite .config-row input:focus,
        #ds-scraper-lite .config-row select:focus { outline: none; border-color: #89b4fa; }
        
        #ds-scraper-lite .section-title { font-size: 10px; color: #89b4fa; margin: 8px 0 2px; border-top: 1px solid #313244; padding-top: 6px; }
        
        #ds-scraper-lite .status {
            margin: 8px 0;
            padding: 6px 8px;
            background: #181825;
            border-radius: 4px;
            text-align: center;
            font-size: 11px;
            min-height: 28px;
        }
        #ds-scraper-lite .progress {
            height: 4px;
            background: #313244;
            border-radius: 2px;
            overflow: hidden;
            margin: 6px 0;
        }
        #ds-scraper-lite .progress-bar {
            height: 100%;
            width: 0%;
            background: #a6e3a1;
        }
        
        #ds-scraper-lite .footer-note { font-size: 10px; color: #6c7086; text-align: center; margin-top: 8px; }
        #ds-scraper-lite .ua-tip { font-size: 10px; color: #6c7086; text-align: center; margin-top: 4px; }
        #ds-scraper-lite .badge { background: #45475a; padding: 1px 5px; border-radius: 3px; font-size: 10px; color: #a6adc8; }
        
        .single-mode-only { display: block; }
        .batch-mode-only { display: none; }
    `;
    document.head.appendChild(style);

    // ---------- 菜单 HTML ----------
    const menu = document.createElement('div');
    menu.id = 'ds-scraper-lite';
    menu.innerHTML = `
        <div class="collapse-icon" style="display:none;">📜</div>
        <div class="panel-content">
            <div class="header">
                <h3>抓取器 <span class="badge">lite</span></h3>
                <div class="header-actions">
                    <span class="collapse-header-btn" title="折叠">▼</span>
                    <span class="close-btn" title="关闭">×</span>
                </div>
            </div>
            
            <div class="mode-switch">
                <div class="mode-btn active" data-mode="single">单对话</div>
                <div class="mode-btn" data-mode="batch">批量</div>
            </div>
            
            <div class="btn-group single-mode-only" id="single-btns">
                <button id="ds-scrape-up" class="primary">⬆ 向上滚动抓取</button>
                <button id="ds-scrape-down" class="primary">⬇ 向下滚动抓取</button>
                <button id="ds-scrape-all" class="primary">🔄 抓取全部</button>
            </div>
            
            <div class="btn-group batch-mode-only" id="batch-btns">
                <button id="ds-batch-start" class="primary">▶ 开始批量抓取</button>
                <button id="ds-batch-pause" class="warning">⏸ 暂停并保存</button>
                <button id="ds-batch-stop" class="stop">⏹ 停止</button>
            </div>
            
            <div class="config-section">
                <div class="config-row">
                    <label>⏱️ 间隔</label>
                    <input id="ds-interval" type="number" min="10" max="5000" value="40" step="10">
                    <span style="font-size:10px;">ms</span>
                </div>
                <div class="config-row">
                    <label>📏 步长</label>
                    <input id="ds-step" type="number" min="100" max="2000" value="800" step="50">
                    <span style="font-size:10px;">px</span>
                </div>
            </div>
            
            <div class="batch-mode-only">
                <div class="section-title">🔍 关键词（留空=全部）</div>
                <div class="config-row">
                    <input id="ds-filter-keyword" type="text" placeholder="如：第几代">
                </div>
                <div class="section-title">📁 导出方式</div>
                <div class="config-row">
                    <select id="ds-export-mode">
                        <option value="separate">独立文件</option>
                        <option value="merge">合并文件</option>
                    </select>
                </div>
            </div>
            
            <div class="status" id="ds-status">✨ 就绪</div>
            <div class="progress">
                <div class="progress-bar" id="ds-progress"></div>
            </div>
            
            <div class="footer-note">💡 自动保存为 TXT 格式</div>
            <div class="ua-tip">💻 电脑UA效果更佳</div>
        </div>
    `;
    document.body.appendChild(menu);

    // ---------- 折叠 ----------
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
            statusDiv.innerText = '📦 已折叠';
        } else {
            menu.classList.remove('collapsed');
            collapseHeaderBtn.style.display = 'flex';
            collapseIcon.style.display = 'none';
        }
    });

    menu.addEventListener('click', (e) => {
        if (isCollapsed && (e.target === menu || e.target === collapseIcon)) {
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
    let currentMode = 'single';

    function setMode(mode) {
        currentMode = mode;
        modeBtns.forEach(b => b.classList.remove('active'));
        menu.querySelector(`.mode-btn[data-mode="${mode}"]`).classList.add('active');
        if (mode === 'single') {
            singleBtns.style.display = 'flex';
            batchBtns.style.display = 'none';
            batchOnlyEls.forEach(e => e.style.display = 'none');
            singleOnlyEls.forEach(e => e.style.display = 'block');
        } else {
            singleBtns.style.display = 'none';
            batchBtns.style.display = 'flex';
            batchOnlyEls.forEach(e => e.style.display = 'block');
            singleOnlyEls.forEach(e => e.style.display = 'none');
        }
    }
    modeBtns.forEach(b => b.addEventListener('click', () => setMode(b.dataset.mode)));

    // ---------- 拖动 ----------
    let dragging = false, ox, oy;
    const header = menu.querySelector('.header');
    header.addEventListener('mousedown', e => {
        if (e.target.tagName === 'BUTTON' || e.target.closest('.close-btn') || e.target.closest('.collapse-header-btn') || e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT' || e.target.classList.contains('mode-btn')) return;
        dragging = true;
        const r = menu.getBoundingClientRect();
        ox = e.clientX - r.left;
        oy = e.clientY - r.top;
        menu.style.cursor = 'grabbing';
    });
    document.addEventListener('mousemove', e => {
        if (!dragging) return;
        menu.style.left = (e.clientX - ox) + 'px';
        menu.style.right = 'auto';
        menu.style.top = (e.clientY - oy) + 'px';
    });
    document.addEventListener('mouseup', () => { dragging = false; menu.style.cursor = ''; });

    // ---------- 元素 ----------
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

    // ---------- 公共 ----------
    const sleep = ms => new Promise(r => setTimeout(r, ms));
    function findScrollContainer() {
        const cs = [];
        document.querySelectorAll('div').forEach(d => {
            const s = getComputedStyle(d);
            if ((s.overflowY==='auto'||s.overflowY==='scroll') && d.scrollHeight>d.clientHeight) cs.push(d);
        });
        if (!cs.length) return document.scrollingElement||document.documentElement;
        cs.sort((a,b)=>(b.clientWidth*b.clientHeight)-(a.clientWidth*a.clientHeight));
        return cs[0];
    }
    function getChatLinks() { return Array.from(document.querySelectorAll('a[href*="/a/chat/s/"]')); }
    function getCurrentChatLink() {
        const p = location.pathname+location.search;
        return getChatLinks().find(a=>a.href.includes(p));
    }

    // ===== 单对话 =====
    let sr=false, ss=false, sDir=null, sCont=null, sMsgs=[], sSeen=new Set(), sInt=null;
    function sExtract() {
        const sels=['[data-message-id]','.prose','.whitespace-pre-wrap','[class*="message"]','.chat-message'];
        const els=new Set(); sels.forEach(s=>document.querySelectorAll(s).forEach(e=>els.add(e)));
        const n=[]; els.forEach(e=>{const t=e.textContent.trim(); if(t.length<5)return; const k=t.slice(0,60)+t.length; if(!sSeen.has(k)){sSeen.add(k);n.push(t);}});
        return n;
    }
    function sUpdate() {
        const nm=sExtract(); if(nm.length) sMsgs.push(...nm);
        const c=sMsgs.reduce((a,t)=>a+t.length,0);
        statusDiv.innerText=`📊 ${sMsgs.length}条·${(c/1024).toFixed(1)}KB`;
        if(sCont){const p=(sCont.scrollTop/(sCont.scrollHeight-sCont.clientHeight))*100; progressBar.style.width=Math.min(p,100)+'%';}
    }
    function sSave() {
        if(!sMsgs.length){alert('无内容');return;}
        const t=document.title.replace(/[\\/:*?"<>|]/g,'_').trim()||'chat';
        const b=new Blob([sMsgs.join('\n\n---\n\n')],{type:'text/plain'});
        const a=document.createElement('a'); a.href=URL.createObjectURL(b); a.download=`${t}_${new Date().toISOString().slice(0,19).replace(/:/g,'-')}.txt`; a.click();
    }
    function sStep() {
        if(!sr||ss||!sCont) return;
        const st=parseInt(stepInput.value); sCont.scrollBy({top:sDir==='up'?-st:st,behavior:'auto'});
        setTimeout(()=>{
            if(!sr||ss) return;
            const a=sCont.scrollTop, at=a<=0, ab=a+sCont.clientHeight>=sCont.scrollHeight-5;
            sUpdate();
            if((sDir==='up'&&at)||(sDir==='down'&&ab)){statusDiv.innerText=`⏸ 已到${sDir==='up'?'顶':'底'}`;sStop();return;}
            if(!window._nc)window._nc=0;
            if(Math.abs(a-(window._lt||0))<5){if(++window._nc>=3){statusDiv.innerText='⚠ 无变化';sStop();}}else window._nc=0;
            window._lt=a;
        },200);
    }
    function sStart(d) {
        if(sr) return; sr=true; ss=false; sDir=d; window._nc=0; window._lt=0;
        upBtn.disabled=downBtn.disabled=allBtn.disabled=batchStartBtn.disabled=true;
        sCont=findScrollContainer(); sSeen.clear(); sMsgs=[]; sUpdate();
        sInt=setInterval(sStep,parseInt(intervalInput.value));
        statusDiv.innerText=d==='up'?'⬆ 向上中':'⬇ 向下中';
    }
    function sAll() { if(sr)return; sStart('up'); const c=setInterval(()=>{if(!sr){clearInterval(c);setTimeout(()=>sStart('down'),500);}},500); }
    function sStop() {
        ss=true; sr=false; if(sInt){clearInterval(sInt);sInt=null;}
        upBtn.disabled=downBtn.disabled=allBtn.disabled=batchStartBtn.disabled=false;
        sSave(); progressBar.style.width='0%'; window._nc=0;
    }

    // ===== 批量 =====
    let br=false, bp=false, bs=false, bProc=new Set(), bMsgs=[], bTitle='', bCol=new Set(), bAll=[];
    function bProg(c){if(!c)return;const s=c===document.scrollingElement?document.documentElement:c;const p=s.scrollHeight<=s.clientHeight?100:(s.scrollTop/(s.scrollHeight-s.clientHeight))*100;progressBar.style.width=Math.min(p,100)+'%';}
    function bVis(){
        const sels=['[data-message-id]','.prose','.whitespace-pre-wrap','[class*="message"]','.chat-message'];
        const ts=[],sn=new Set(); sels.forEach(s=>document.querySelectorAll(s).forEach(e=>{const t=e.textContent.trim();if(t.length>=5){const k=t.slice(0,60)+t.length;if(!sn.has(k)){sn.add(k);ts.push(t);}}}));
        return ts;
    }
    function bInc(){bVis().forEach(t=>{const k=t.slice(0,60)+t.length;if(!bCol.has(k)){bCol.add(k);bMsgs.push(t);}});}
    function bLinks(){return getChatLinks().map(a=>({el:a,href:a.href,title:a.textContent.trim().slice(0,40).replace(/[\\/:*?"<>|]/g,'_')||'untitled'}));}
    function bFind(h){return getChatLinks().find(a=>a.href===h);}
    async function bClick(l){if(!l)return false;const o=location.pathname;l.click();for(let i=0;i<50;i++){await sleep(100);if(location.pathname!==o)return true;}return false;}
    function bTitleNow(){const c=getCurrentChatLink();if(c)return c.textContent.trim().slice(0,40).replace(/[\\/:*?"<>|]/g,'_')||'untitled';return document.title.replace(/[\\/:*?"<>|]/g,'_').slice(0,40)||'untitled';}
    function bSave(t,m){if(!m.length)return;if(exportSelect.value==='merge'){bAll.push({title:t,content:m.join('\n\n---\n\n')});}else{const b=new Blob([m.join('\n\n---\n\n')],{type:'text/plain'});const a=document.createElement('a');a.href=URL.createObjectURL(b);a.download=`${t}_${new Date().toISOString().slice(0,19).replace(/:/g,'-')}.txt`;a.click();}}
    function bMerged(){if(!bAll.length)return;const m=bAll.map(c=>`===== ${c.title} =====\n\n${c.content}`).join('\n\n\n');const b=new Blob([m],{type:'text/plain'});const a=document.createElement('a');a.href=URL.createObjectURL(b);a.download=`merged_${new Date().toISOString().slice(0,19).replace(/:/g,'-')}.txt`;a.click();}
    async function bQuickTop(c){while(!bs&&!bp){const bf=c.scrollTop;c.scrollBy({top:-5000,behavior:'auto'});await sleep(2);if(c.scrollTop<=0||Math.abs(c.scrollTop-bf)<5)break;}}
    async function bDown(c){let nc=0,sc=0;while(!bs&&!bp){const st=parseInt(stepInput.value),iv=parseInt(intervalInput.value);const bf=c.scrollTop;c.scrollBy({top:st,behavior:'auto'});bProg(c);await sleep(iv);bInc();if(++sc%3===0)statusDiv.innerHTML=`📄 ${bTitle}<br>${bMsgs.length}条`;if(Math.abs(c.scrollTop-bf)<5){if(++nc>=3)break;}else nc=0;if(c.scrollTop+c.clientHeight>=c.scrollHeight-5)break;}bInc();}
    async function bUp(c){let nc=0,sc=0;while(!bs&&!bp){const st=parseInt(stepInput.value),iv=parseInt(intervalInput.value);const bf=c.scrollTop;c.scrollBy({top:-st,behavior:'auto'});bProg(c);await sleep(iv);bInc();if(++sc%3===0)statusDiv.innerHTML=`📄 ${bTitle}<br>${bMsgs.length}条`;if(Math.abs(c.scrollTop-bf)<5){if(++nc>=3)break;}else nc=0;if(c.scrollTop<=0)break;}bInc();}
    async function bScrape(){bTitle=bTitleNow();statusDiv.innerHTML=`📄 ${bTitle}`;progressBar.style.width='0%';bCol.clear();bMsgs=[];const c=findScrollContainer();if(!c)return;await bQuickTop(c);if(bs)return;await bDown(c);if(bs)return;await sleep(500);await bUp(c);statusDiv.innerHTML=`✅ ${bTitle}:${bMsgs.length}条`;progressBar.style.width='100%';}
    function bPrescan(){const kw=filterInput.value.trim().toLowerCase();if(!kw)return null;return bLinks().filter(c=>c.title.toLowerCase().includes(kw));}
    async function bStart(){
        br=true;bp=false;bs=false;bProc.clear();bAll=[];
        batchStartBtn.disabled=true;batchPauseBtn.disabled=false;batchStopBtn.disabled=false;
        upBtn.disabled=downBtn.disabled=allBtn.disabled=true;
        const ms=bPrescan();
        if(ms!==null){
            const tl=bLinks().length;statusDiv.innerHTML=`🔍 找到${ms.length}个(共${tl}个)`;
            if(!ms.length){bClean();statusDiv.innerHTML='⚠ 无匹配';return;}
            const f=ms[0];const ce=getCurrentChatLink();if(!ce||ce.href!==f.href){const el=bFind(f.href);if(el){await bClick(el);await sleep(2000);}}
            for(let i=0;i<ms.length;i++){if(bs||bp)break;const ch=ms[i];if(bProc.has(ch.href))continue;const cl=getCurrentChatLink();if(!cl||cl.href!==ch.href){const el=bFind(ch.href);if(!el)continue;await bClick(el);await sleep(2000);}await bScrape();if(bs)break;if(bMsgs.length){bSave(bTitle,bMsgs);bProc.add(ch.href);}}
            statusDiv.innerHTML=`🎉 完成${bProc.size}个`;
        }else{
            const ls=getChatLinks();if(!ls.length){bClean();statusDiv.innerHTML='❌ 无链接';return;}
            let cu=getCurrentChatLink();if(!cu){await bClick(ls[0]);await sleep(2000);}
            while(!bs&&!bp){const cl=getCurrentChatLink();if(!cl)break;if(bProc.has(cl.href)){const idx=getChatLinks().indexOf(cl);const nx=idx>=0&&idx<ls.length-1?ls[idx+1]:null;if(!nx)break;await bClick(nx);await sleep(2000);continue;}await bScrape();if(bs)break;if(bMsgs.length){bSave(bTitle,bMsgs);bProc.add(cl.href);}const idx=getChatLinks().indexOf(cl);const nx=idx>=0&&idx<ls.length-1?ls[idx+1]:null;if(!nx){statusDiv.innerHTML=`🎉 完成${bProc.size}个`;break;}await bClick(nx);await sleep(2000);}
        }
        if(exportSelect.value==='merge'&&bAll.length)bMerged();
        if(bs)statusDiv.innerHTML='⏹ 已停止';
        bClean();
    }
    function bClean(){br=false;batchStartBtn.disabled=false;batchPauseBtn.disabled=true;batchStopBtn.disabled=true;upBtn.disabled=downBtn.disabled=allBtn.disabled=false;progressBar.style.width='0%';}
    function bTogglePause(){if(!br)return;bp=!bp;batchPauseBtn.textContent=bp?'▶ 继续':'⏸ 暂停并保存';if(!bp){bStart();}else{if(bMsgs.length){const h=getCurrentChatLink()?.href;if(h&&!bProc.has(h)){bSave(bTitle,bMsgs);bProc.add(h);}}if(exportSelect.value==='merge'&&bAll.length)bMerged();}}
    function bReqStop(){bs=true;bp=false;}

    // ---------- 事件 ----------
    upBtn.onclick=()=>sStart('up');
    downBtn.onclick=()=>sStart('down');
    allBtn.onclick=sAll;
    batchStartBtn.onclick=bStart;
    batchPauseBtn.onclick=bTogglePause;
    batchStopBtn.onclick=bReqStop;
    closeBtn.onclick=()=>{if(sr||br){if(confirm('确定关闭？')){if(sr)sStop();bReqStop();menu.remove();window.__dsScraperLite=false;}}else{menu.remove();window.__dsScraperLite=false;}};
    window.addEventListener('beforeunload',()=>{if(sr)sStop();bReqStop();});
})();
