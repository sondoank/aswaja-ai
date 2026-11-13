// State Management
let conversations = JSON.parse(localStorage.getItem('aswaja_conversations') || '[]');
let currentChatId = null;
let knowledgeBaseItems = [];
let geminiApiKey = localStorage.getItem('aswaja_gemini_api_key') || '';

// Initialize on DOM load
document.addEventListener('DOMContentLoaded', () => {
  updateApiKeyUI();
  renderChatHistorySidebar();
  fetchKnowledgeBase();

  const textarea = document.getElementById('userInput');
  textarea.addEventListener('input', () => {
    textarea.style.height = 'auto';
    textarea.style.height = Math.min(textarea.scrollHeight, 140) + 'px';
  });
});

function updateApiKeyUI() {
  const dot = document.getElementById('apiKeyStatusDot');
  const badge = document.getElementById('activeModeBadge');
  const input = document.getElementById('geminiApiKeyInput');
  if (input) input.value = geminiApiKey;

  if (geminiApiKey) {
    dot.className = 'w-2.5 h-2.5 rounded-full bg-emerald-400';
    dot.title = 'Gemini API Key Aktif';
    badge.innerHTML = '✨ Mode: Gemini 2.5 Flash + Hybrid RAG Aswaja';
    badge.className = 'text-xs px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-300 font-medium';
  } else {
    dot.className = 'w-2.5 h-2.5 rounded-full bg-amber-400';
    dot.title = 'Mode RAG Lokal + NU Online';
    badge.innerHTML = '⚡ Mode: Hybrid RAG Lokal + NU Online';
    badge.className = 'text-xs px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 font-medium';
  }
}

// Fetch Knowledge Base from Backend (with Static/GitHub Pages fallback)
async function fetchKnowledgeBase() {
  try {
    const res = await fetch('/api/knowledge');
    if (res.ok) {
      const data = await res.json();
      if (data.items) {
        knowledgeBaseItems = data.items;
      }
    } else {
      throw new Error('Static mode');
    }
  } catch (err) {
    // Fallback for GitHub Pages (Static Hosting)
    try {
      const resStatic = await fetch('./knowledge_base.json');
      const staticItems = await resStatic.json();
      const customItems = JSON.parse(localStorage.getItem('aswaja_custom_kb') || '[]');
      knowledgeBaseItems = [...customItems, ...staticItems];
    } catch (e) {
      console.error('Failed to load static knowledge base:', e);
    }
  }
  const badge = document.getElementById('kbCountBadge');
  if (badge) badge.textContent = knowledgeBaseItems.length;
}

// Client-side RAG fallback when hosted on GitHub Pages (Static Hosting without Node backend)
function clientSideSearchKB(query, topK = 3) {
  const stopWords = new Set(['apa','apakah','bagaimana','mengapa','kenapa','siapa','yang','dan','di','ke','dari','untuk','pada','dengan','dalam','atau','ini','itu','adalah','menurut','pandangan','hukum','hukumnya','tentang','mengenai','dalil','dalilnya','jelaskan','tolong','saya','mau','tanya']);
  const tokens = (query || '').toLowerCase().replace(/[^a-z0-9\s]/g, ' ').split(/\s+/).filter(w => w.length >= 2 && !stopWords.has(w));
  const lowerQuery = (query || '').toLowerCase();

  const scored = knowledgeBaseItems.map(item => {
    let score = 0;
    const tags = (item.tags || []).map(t => t.toLowerCase());
    for (const tag of tags) {
      if (lowerQuery.includes(tag)) score += 18;
    }
    for (const token of tokens) {
      if (tags.some(t => t.includes(token))) score += 9;
      if ((item.title || '').toLowerCase().includes(token)) score += 9;
      if ((item.summary || '').toLowerCase().includes(token)) score += 5;
      if ((item.content || '').toLowerCase().includes(token)) score += 3;
      if ((item.kitab_reference || '').toLowerCase().includes(token)) score += 5;
    }
    return { item, score };
  });
  scored.sort((a, b) => b.score - a.score);
  return scored.filter(s => s.score > 0).slice(0, topK);
}

async function clientSideChatFallback(message) {
  const retrieved = clientSideSearchKB(message, 3);
  const sources = retrieved.map(r => ({
    type: 'kitab_lokal',
    id: r.item.id,
    title: r.item.title,
    category: r.item.category,
    kitab: r.item.kitab_reference,
    bahtsul_masail: r.item.bahtsul_masail,
    url: r.item.source_url,
    score: r.score
  }));

  if (geminiApiKey) {
    try {
      const contextText = retrieved.map((r, i) => `[DOKUMEN #${i + 1}] ${r.item.title}\nKitab: ${r.item.kitab_reference}\nLBM: ${r.item.bahtsul_masail}\nIbarah: ${r.item.arabic_quote}\nTerjemah: ${r.item.arabic_translation}\nIsi: ${r.item.content}`).join('\n\n');
      const gRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${encodeURIComponent(geminiApiKey)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          system_instruction: { parts: [{ text: 'Anda adalah AswajaAI, asisten keislaman Ahlussunnah wal Jamaah An-Nahdliyah (NU). Jawab dengan santun beserta rujukan kitab dan hasil Bahtsul Masail.' }] },
          contents: [{ role: 'user', parts: [{ text: `KONTEKS KITAB:\n${contextText}\n\nPERTANYAAN:\n${message}` }] }]
        })
      });
      const gData = await gRes.json();
      const text = gData.candidates?.[0]?.content?.parts?.map(p => p.text).join('');
      if (text) return { reply: text, sources, mode: 'gemini-rag' };
    } catch (e) {
      console.warn('Client Gemini fallback error:', e);
    }
  }

  if (retrieved.length > 0) {
    const p = retrieved[0].item;
    let reply = `### 📌 Ringkasan Jawaban (${p.category})\n${p.summary}\n\n### 📖 Uraian & Penjelasan Keilmuan\n${p.content}\n\n`;
    if (p.arabic_quote) {
      reply += `### 📜 Ibarah Kitab / Dalil Rujukan\n> **${p.arabic_quote}**\n>\n> *Artinya: "${p.arabic_translation}"*\n> — **(${p.kitab_reference})**\n\n`;
    }
    reply += `### ⚖️ Rujukan Keputusan & Kitab Mu'tabarah\n- **Kitab Rujukan:** ${p.kitab_reference}\n- **Lembaga Bahtsul Masail / Muktamar:** ${p.bahtsul_masail || '-'}`;
    return { reply, sources, mode: 'local-rag' };
  }

  return {
    reply: `### Assalamu'alaikum Warahmatullahi Wabarakatuh\n\nPertanyaan mengenai **"${message}"** belum tersedia di basis data lokal. Silakan coba topik populer (Tahlilan, Akad Nikah Online, Qunut Subuh, Paylater/Pinjol, Aswaja, Metodologi Bahtsul Masail) atau masukkan **Gemini API Key** di menu **⚙️ Pengaturan AI**.`,
    sources: [],
    mode: 'local-rag'
  };
}

// Start a new conversation
function startNewChat() {
  currentChatId = null;
  document.getElementById('welcomeScreen').classList.remove('hidden');
  const stream = document.getElementById('chatStream');
  stream.classList.add('hidden');
  stream.innerHTML = '';
  renderChatHistorySidebar();
}

// Load an existing conversation
function selectConversation(chatId) {
  const conv = conversations.find(c => c.id === chatId);
  if (!conv) return;

  currentChatId = conv.id;
  document.getElementById('welcomeScreen').classList.add('hidden');
  const stream = document.getElementById('chatStream');
  stream.classList.remove('hidden');
  stream.innerHTML = '';

  conv.messages.forEach(msg => {
    appendMessageToDOM(msg.role, msg.content, msg.sources, msg.mode);
  });

  renderChatHistorySidebar();
  scrollToBottom();
}

// Delete a conversation
function deleteConversation(e, chatId) {
  e.stopPropagation();
  conversations = conversations.filter(c => c.id !== chatId);
  localStorage.setItem('aswaja_conversations', JSON.stringify(conversations));
  if (currentChatId === chatId) {
    startNewChat();
  } else {
    renderChatHistorySidebar();
  }
}

// Render Sidebar History
function renderChatHistorySidebar() {
  const listEl = document.getElementById('chatHistoryList');
  if (!conversations.length) {
    listEl.innerHTML = `<div class="px-3 py-2 text-emerald-400/60 italic">Belum ada riwayat tanya jawab</div>`;
    return;
  }

  listEl.innerHTML = conversations.map(c => {
    const isActive = c.id === currentChatId;
    return `
      <div onclick="selectConversation('${c.id}')" class="group flex items-center justify-between px-3 py-2 rounded-lg cursor-pointer transition ${isActive ? 'bg-emerald-800/90 text-white font-medium' : 'hover:bg-emerald-900/60 text-emerald-100/90'}">
        <span class="truncate pr-2">💬 ${escapeHtml(c.title)}</span>
        <button onclick="deleteConversation(event, '${c.id}')" class="opacity-0 group-hover:opacity-100 text-emerald-300 hover:text-red-300 text-sm px-1" title="Hapus">&times;</button>
      </div>
    `;
  }).join('');
}

// Preset starter card click
function askPreset(questionText) {
  const input = document.getElementById('userInput');
  input.value = questionText;
  handleSendMessage(new Event('submit'));
}

// Send message handler
async function handleSendMessage(e) {
  if (e) e.preventDefault();
  const input = document.getElementById('userInput');
  const text = input.value.trim();
  if (!text) return;

  input.value = '';
  input.style.height = 'auto';

  // Ensure active conversation exists
  if (!currentChatId) {
    currentChatId = 'chat-' + Date.now();
    conversations.unshift({
      id: currentChatId,
      title: text.slice(0, 42) + (text.length > 42 ? '...' : ''),
      createdAt: Date.now(),
      messages: []
    });
  }

  const conv = conversations.find(c => c.id === currentChatId);
  conv.messages.push({ role: 'user', content: text });
  localStorage.setItem('aswaja_conversations', JSON.stringify(conversations));

  document.getElementById('welcomeScreen').classList.add('hidden');
  const stream = document.getElementById('chatStream');
  stream.classList.remove('hidden');

  appendMessageToDOM('user', text);
  renderChatHistorySidebar();

  // Add typing indicator
  const loadingId = 'loading-' + Date.now();
  appendLoadingIndicator(loadingId);
  scrollToBottom();

  const sendBtn = document.getElementById('sendBtn');
  sendBtn.disabled = true;

  try {
    const enableWebSearch = document.getElementById('webSearchToggle').checked;
    let data;
    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: text,
          apiKey: geminiApiKey,
          enableWebSearch,
          history: conv.messages.slice(0, -1)
        })
      });
      if (!res.ok) throw new Error('Static hosting fallback');
      data = await res.json();
    } catch (staticErr) {
      // Running on GitHub Pages (Static mode)
      data = await clientSideChatFallback(text);
    }

    removeLoadingIndicator(loadingId);

    const reply = data.reply || data.error || 'Terjadi kesalahan saat memproses jawaban.';
    const sources = data.sources || [];
    const mode = data.mode || 'local-rag';

    conv.messages.push({
      role: 'assistant',
      content: reply,
      sources,
      mode
    });
    localStorage.setItem('aswaja_conversations', JSON.stringify(conversations));

    appendMessageToDOM('assistant', reply, sources, mode);
    scrollToBottom();
  } catch (err) {
    removeLoadingIndicator(loadingId);
    appendMessageToDOM('assistant', `Maaf, terjadi gangguan koneksi ke server: ${err.message}`, [], 'error');
  } finally {
    sendBtn.disabled = false;
  }
}

// Render User or Assistant Message Bubble
function appendMessageToDOM(role, content, sources = [], mode = 'local-rag') {
  const stream = document.getElementById('chatStream');
  const wrapper = document.createElement('div');

  if (role === 'user') {
    wrapper.className = 'flex justify-end';
    wrapper.innerHTML = `
      <div class="max-w-xl bg-emerald-700 text-white px-4 py-3 rounded-2xl rounded-tr-xs shadow-xs text-sm leading-relaxed">
        ${escapeHtml(content)}
      </div>
    `;
  } else {
    wrapper.className = 'flex items-start gap-3.5';
    const modeLabel = mode === 'gemini-rag'
      ? '✨ Gemini 2.5 Flash + RAG Aswaja'
      : '📚 Mesin Sintesis RAG Kitab & Bahtsul Masail';

    const sourcesHtml = sources && sources.length > 0
      ? `
        <div class="mt-4 pt-3.5 border-t border-slate-200/80">
          <div class="text-[11px] font-bold uppercase tracking-wider text-emerald-800 mb-2 flex items-center gap-1.5">
            <span>📜</span>
            <span>Kartu Rujukan Terverifikasi (${sources.length} Sumber):</span>
          </div>
          <div class="grid grid-cols-1 gap-2">
            ${sources.map(s => `
              <div class="p-2.5 rounded-xl bg-emerald-50/70 border border-emerald-200/80 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <div class="font-semibold text-emerald-950">${escapeHtml(s.title)}</div>
                  <div class="text-[11px] text-emerald-800 mt-0.5">
                    📖 <strong>Kitab / Sumber:</strong> ${escapeHtml(s.kitab || '-')}
                    ${s.bahtsul_masail && s.bahtsul_masail !== '-' ? ` • ⚖️ <strong>LBM:</strong> ${escapeHtml(s.bahtsul_masail)}` : ''}
                  </div>
                </div>
                ${s.url ? `<a href="${escapeHtml(s.url)}" target="_blank" rel="noopener noreferrer" class="px-2.5 py-1 rounded-lg bg-white hover:bg-emerald-600 hover:text-white text-emerald-700 border border-emerald-300 text-[11px] font-semibold shrink-0 transition self-start sm:self-center">Buka Rujukan ↗</a>` : ''}
              </div>
            `).join('')}
          </div>
        </div>
      `
      : '';

    wrapper.innerHTML = `
      <div class="w-9 h-9 rounded-xl bg-emerald-700 text-white flex items-center justify-center font-bold text-base shrink-0 shadow-xs mt-0.5">
        ۞
      </div>
      <div class="flex-1 bg-white border border-slate-200 rounded-2xl rounded-tl-xs p-5 shadow-xs">
        <div class="flex items-center justify-between mb-2 pb-2 border-b border-slate-100">
          <span class="text-xs font-bold text-emerald-900">AswajaAI • Majelis Ilmiah Nahdlatul Ulama</span>
          <span class="text-[10px] px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 font-medium">${modeLabel}</span>
        </div>
        <div class="prose-chat text-sm text-slate-700">
          ${renderMarkdown(content)}
        </div>
        ${sourcesHtml}
      </div>
    `;
  }

  stream.appendChild(wrapper);
}

function appendLoadingIndicator(id) {
  const stream = document.getElementById('chatStream');
  const el = document.createElement('div');
  el.id = id;
  el.className = 'flex items-start gap-3.5';
  el.innerHTML = `
    <div class="w-9 h-9 rounded-xl bg-emerald-700 text-white flex items-center justify-center font-bold text-base shrink-0 animate-pulse">
      ۞
    </div>
    <div class="bg-white border border-slate-200 rounded-2xl rounded-tl-xs px-5 py-4 shadow-xs text-xs text-slate-500 flex items-center gap-2.5">
      <div class="w-2 h-2 rounded-full bg-emerald-600 animate-ping"></div>
      <span>Sedang menelaah rujukan <em>Kutubul Mu'tabarah</em> & hasil <em>Bahtsul Masail NU</em>...</span>
    </div>
  `;
  stream.appendChild(el);
}

function removeLoadingIndicator(id) {
  const el = document.getElementById(id);
  if (el) el.remove();
}

function scrollToBottom() {
  const container = document.getElementById('messagesContainer');
  container.scrollTop = container.scrollHeight;
}

// Lightweight Markdown + Arabic text formatter
function renderMarkdown(md) {
  if (!md) return '';
  let html = escapeHtml(md);

  // Blockquotes (with automatic detection of Arabic characters for Amiri font)
  html = html.replace(/(?:^&gt; ?.*(?:\n|$))+/gm, (match) => {
    const inner = match.replace(/^&gt; ?/gm, '').trim();
    const hasArabic = /[\u0600-\u06FF]/.test(inner);
    const lines = inner.split('\n').map(line => {
      if (/[\u0600-\u06FF]/.test(line)) {
        return `<div class="font-arabic text-emerald-950 font-bold mb-2 text-right">${formatInline(line)}</div>`;
      }
      return `<div class="text-xs text-slate-600">${formatInline(line)}</div>`;
    }).join('');
    return `<blockquote>${lines}</blockquote>`;
  });

  // Headings
  html = html.replace(/^#### (.*$)/gm, '<h4>$1</h4>');
  html = html.replace(/^### (.*$)/gm, '<h3>$1</h3>');
  html = html.replace(/^## (.*$)/gm, '<h3>$1</h3>');

  // Horizontal rule
  html = html.replace(/^---$/gm, '<hr class="my-3 border-slate-200" />');

  // Bullet lists
  html = html.replace(/(?:^- .*(?:\n|$))+/gm, (match) => {
    const items = match.trim().split('\n').map(line => `<li>${formatInline(line.replace(/^- /, ''))}</li>`).join('');
    return `<ul>${items}</ul>`;
  });

  // Numbered lists
  html = html.replace(/(?:^\d+\. .*(?:\n|$))+/gm, (match) => {
    const items = match.trim().split('\n').map(line => `<li>${formatInline(line.replace(/^\d+\. /, ''))}</li>`).join('');
    return `<ol>${items}</ol>`;
  });

  // Paragraphs
  const blocks = html.split(/\n{2,}/);
  return blocks.map(block => {
    const trimmed = block.trim();
    if (!trimmed) return '';
    if (
      trimmed.startsWith('<h3>') ||
      trimmed.startsWith('<h4>') ||
      trimmed.startsWith('<ul>') ||
      trimmed.startsWith('<ol>') ||
      trimmed.startsWith('<blockquote>') ||
      trimmed.startsWith('<hr')
    ) {
      return trimmed;
    }
    return `<p>${formatInline(trimmed).replace(/\n/g, '<br/>')}</p>`;
  }).join('\n');
}

function formatInline(text) {
  return text
    .replace(/\*\*(.+?)\*\*/g, '<strong class="font-semibold text-slate-900">$1</strong>')
    .replace(/\*(.+?)\*/g, '<em class="italic">$1</em>')
    .replace(/`([^`]+)`/g, '<code class="px-1.5 py-0.5 rounded bg-slate-100 text-emerald-800 font-mono text-xs">$1</code>')
    .replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer" class="text-emerald-700 underline hover:text-emerald-900 font-medium">$1 ↗</a>');
}

function escapeHtml(str) {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// ==========================================
// MODAL HANDLERS (PUSTAKA, TAMBAH KITAB, SETTINGS)
// ==========================================

async function openKnowledgeModal() {
  await fetchKnowledgeBase();
  renderKnowledgeList();
  const modal = document.getElementById('knowledgeModal');
  modal.classList.remove('hidden');
  modal.classList.add('flex');
}

function closeKnowledgeModal() {
  const modal = document.getElementById('knowledgeModal');
  modal.classList.add('hidden');
  modal.classList.remove('flex');
}

function renderKnowledgeList() {
  const container = document.getElementById('knowledgeListContainer');
  const filter = (document.getElementById('kbFilterInput')?.value || '').toLowerCase();

  const filtered = knowledgeBaseItems.filter(item => {
    if (!filter) return true;
    return (
      (item.title || '').toLowerCase().includes(filter) ||
      (item.kitab_reference || '').toLowerCase().includes(filter) ||
      (item.category || '').toLowerCase().includes(filter) ||
      (item.summary || '').toLowerCase().includes(filter) ||
      (item.tags || []).some(t => t.toLowerCase().includes(filter))
    );
  });

  if (!filtered.length) {
    container.innerHTML = `<div class="text-center py-8 text-slate-400 text-sm">Tidak ditemukan referensi yang cocok dengan pencarian Anda.</div>`;
    return;
  }

  container.innerHTML = filtered.map(item => `
    <div class="p-4 rounded-xl border border-slate-200 bg-white hover:border-emerald-400 transition space-y-2 shadow-2xs">
      <div class="flex items-start justify-between gap-2">
        <div>
          <span class="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">${escapeHtml(item.category)}</span>
          <h4 class="font-bold text-sm text-slate-800 mt-1">${escapeHtml(item.title)}</h4>
        </div>
        <button onclick="askFromKnowledge('${escapeHtml(item.title)}')" class="px-2.5 py-1 rounded-lg bg-emerald-50 hover:bg-emerald-600 hover:text-white text-emerald-700 text-xs font-semibold border border-emerald-200 transition shrink-0">
          Tanyakan di Chat →
        </button>
      </div>
      ${item.arabic_quote ? `<div class="font-arabic text-emerald-950 bg-emerald-50/60 px-3 py-2 rounded-lg border-r-4 border-emerald-600 text-right">${escapeHtml(item.arabic_quote)}</div>` : ''}
      <p class="text-xs text-slate-600 leading-relaxed">${escapeHtml(item.summary)}</p>
      <div class="text-[11px] text-slate-500 pt-1 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2">
        <span>📖 <strong>Kitab:</strong> ${escapeHtml(item.kitab_reference)}</span>
        <span>⚖️ <strong>LBM:</strong> ${escapeHtml(item.bahtsul_masail || '-')}</span>
      </div>
    </div>
  `).join('');
}

function askFromKnowledge(title) {
  closeKnowledgeModal();
  askPreset(`Jelaskan mengenai ${title} beserta dalil dan rujukan kitabnya`);
}

function openAddReferenceModal() {
  const modal = document.getElementById('addReferenceModal');
  modal.classList.remove('hidden');
  modal.classList.add('flex');
}

function closeAddReferenceModal() {
  const modal = document.getElementById('addReferenceModal');
  modal.classList.add('hidden');
  modal.classList.remove('flex');
}

function handleFileImport(e) {
  const file = e.target.files?.[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = (evt) => {
    const content = evt.target.result || '';
    const baseName = file.name.replace(/\.[^.]+$/, '').replace(/[-_]/g, ' ');
    document.getElementById('refTitle').value = baseName;
    document.getElementById('refSummary').value = content.slice(0, 220).replace(/\s+/g, ' ').trim();
    document.getElementById('refContent').value = content;
    document.getElementById('refTags').value = baseName.toLowerCase().split(/\s+/).filter(w => w.length > 2).join(', ');
  };
  reader.readAsText(file);
}

async function handleAddReference(e) {
  e.preventDefault();
  const payload = {
    title: document.getElementById('refTitle').value,
    category: document.getElementById('refCategory').value,
    kitab_reference: document.getElementById('refKitab').value,
    bahtsul_masail: document.getElementById('refBM').value,
    tags: document.getElementById('refTags').value,
    arabic_quote: document.getElementById('refArabic').value,
    arabic_translation: document.getElementById('refTranslation').value,
    summary: document.getElementById('refSummary').value,
    content: document.getElementById('refContent').value,
    source_url: document.getElementById('refUrl').value
  };

  try {
    const res = await fetch('/api/knowledge', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const data = await res.json();
    if (data.status === 'ok') {
      document.getElementById('addRefForm').reset();
      closeAddReferenceModal();
      await fetchKnowledgeBase();
      alert(`Alhamdulillah! Referensi "${data.item.title}" berhasil ditambahkan ke Database RAG dan siap ditanyakan.`);
    } else {
      alert('Gagal menyimpan: ' + (data.error || 'Unknown error'));
    }
  } catch (err) {
    alert('Gagal menghubungi server: ' + err.message);
  }
}

function openSettingsModal() {
  document.getElementById('geminiApiKeyInput').value = geminiApiKey;
  const modal = document.getElementById('settingsModal');
  modal.classList.remove('hidden');
  modal.classList.add('flex');
}

function closeSettingsModal() {
  const modal = document.getElementById('settingsModal');
  modal.classList.add('hidden');
  modal.classList.remove('flex');
}

function saveSettings() {
  geminiApiKey = document.getElementById('geminiApiKeyInput').value.trim();
  localStorage.setItem('aswaja_gemini_api_key', geminiApiKey);
  updateApiKeyUI();
  closeSettingsModal();
}

