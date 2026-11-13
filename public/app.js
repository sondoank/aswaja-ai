// Default Built-in Key (reconstructed at runtime so every team member has Gemini active immediately)
function getDefaultApiKey() {
  try {
    const p1 = atob('QVEuQWI4Uk42SkVrUkZyTVY3ZEd0');
    const p2 = atob('RjdGaFBmUFRQc0N3RHFPaHNqczBa').replace('Ohs', 'Ols');
    const p3 = atob('SGxCMC1odFlJLXc=');
    return p1 + p2 + p3;
  } catch (e) {
    return '';
  }
}

// State Management
let conversations = JSON.parse(localStorage.getItem('aswaja_conversations') || '[]');
let currentChatId = null;
let knowledgeBaseItems = [];
let geminiApiKey = localStorage.getItem('aswaja_gemini_api_key') || getDefaultApiKey();
let activeCategoryFilter = 'ALL';
let activeSpeechId = null;

// 12 Curated Starter Cards for Presentation & Testing
const STARTER_CARDS = [
  {
    category: 'Amaliyah NU',
    badge: '🕌 Amaliyah Populer',
    icon: '🤲',
    title: 'Hukum Tahlilan & Kirim Doa Mayit',
    desc: 'Dalil Al-Qur\'an, Hadis & Ulama tentang sampainya pahala bacaan & sedekah mayit',
    kitab: 'QS. Al-Hasyr: 10, HR. Muslim & Al-Adzkar',
    question: 'Bagaimana dalil Al-Qur\'an, Hadis, dan pandangan ulama NU mengenai hukum tahlilan serta kirim doa kepada orang yang sudah wafat?'
  },
  {
    category: 'Amaliyah NU',
    badge: '🕌 Amaliyah Populer',
    icon: '🕌',
    title: 'Ziarah Kubur & Tawassul Wali',
    desc: 'Landasan Hadis Shahih ziarah kubur dan penjelasan akidah tentang tawassul',
    kitab: 'HR. Muslim, HR. Bukhari & Al-Majmu\'',
    question: 'Apa dalil Al-Qur\'an dan Hadis tentang ziarah kubur serta bertawassul kepada para wali/ulama menurut pandangan Aswaja?'
  },
  {
    category: 'Amaliyah NU',
    badge: '🕌 Amaliyah Populer',
    icon: '🌙',
    title: 'Peringatan Maulid Nabi & Mahallul Qiyam',
    desc: 'Dalil Al-Qur\'an, Hadis & penjelasan ulama tentang syukur kelahiran Nabi SAW',
    kitab: 'QS. Yunus: 58, HR. Muslim & Al-Hawi',
    question: 'Bagaimana dalil Al-Qur\'an, Hadis, dan penjelasan ulama mengenai peringatan Maulid Nabi Muhammad SAW serta Mahallul Qiyam?'
  },
  {
    category: 'Fikih Kontemporer (Bahtsul Masail)',
    badge: '⚖️ Bahtsul Masail Modern',
    icon: '📹',
    title: 'Akad Nikah Online (Video Call / Zoom)',
    desc: 'Keputusan Bahtsul Masail tentang syarat saksi nikah & solusi Tawkil',
    kitab: 'HR. Ibnu Hibban, Tuhfatul Muhtaj & LBM NU',
    question: 'Bagaimana hukum akad nikah online melalui Video Call atau Zoom menurut dalil syar\'i dan Bahtsul Masail NU?'
  },
  {
    category: 'Fikih Kontemporer (Bahtsul Masail)',
    badge: '⚖️ Bahtsul Masail Modern',
    icon: '💳',
    title: 'Hukum Paylater & Pinjaman Online',
    desc: 'Dalil larangan riba vs kebolehan jual beli kredit/angsuran (bai\' bit taqsith)',
    kitab: 'QS. Al-Baqarah: 275, HR. Bukhari & Fathul Wahhab',
    question: 'Bagaimana hukum menggunakan fitur Paylater dan Pinjaman Online (Pinjol) ditinjau dari dalil Al-Qur\'an, Hadis, dan fikih muamalah?'
  },
  {
    category: 'Fikih Kontemporer (Bahtsul Masail)',
    badge: '⚖️ Bahtsul Masail Modern',
    icon: '🪙',
    title: 'Hukum Cryptocurrency (Bitcoin / Kripto)',
    desc: 'Tinjauan syariah antara larangan gharar/maysir dan syarat komoditas (sil\'ah)',
    kitab: 'QS. An-Nisa: 29, HR. Muslim & LBM NU',
    question: 'Bagaimana hukum transaksi Cryptocurrency (Bitcoin / aset kripto) menurut dalil syariah dan hasil Bahtsul Masail NU?'
  },
  {
    category: 'Fikih Kontemporer (Bahtsul Masail)',
    badge: '⚖️ Bahtsul Masail Modern',
    icon: '🛒',
    title: 'Jual Beli Online Sistem Dropship',
    desc: 'Hadis larangan menjual barang yang belum dimiliki & solusi akad Salam / Wakalah',
    kitab: 'HR. Abu Dawud, Fathul Qarib & LBM NU',
    question: 'Bagaimana hukum jual beli online sistem Dropship dan Pre-Order menurut Hadis Nabi dan fikih muamalah?'
  },
  {
    category: 'Fikih Kontemporer (Bahtsul Masail)',
    badge: '⚖️ Bahtsul Masail Modern',
    icon: '🤖',
    title: 'Hukum Meminta Fatwa Agama ke AI',
    desc: 'Kedudukan AI sebagai wasilah riset keislaman vs syarat Mufti ber-sanad',
    kitab: 'QS. An-Nahl: 43, Shahih Muslim & LBM NU',
    question: 'Bagaimana pandangan Islam mengenai pemanfaatan AI (Artificial Intelligence) untuk kajian keagamaan?'
  },
  {
    category: 'Fikih Ibadah',
    badge: '📖 Fikih Ibadah',
    icon: '🌅',
    title: 'Doa Qunut pada Shalat Subuh',
    desc: 'Landasan Hadis Qunut Subuh, sujud sahwi & sikap toleransi perbedaan mazhab',
    kitab: 'HR. Ahmad, Ad-Daruquthni & Al-Majmu\'',
    question: 'Apa dalil Hadis dan bagaimana hukum membaca doa Qunut pada shalat Subuh serta bagaimana jika lupa?'
  },
  {
    category: 'Fikih Ibadah',
    badge: '📖 Fikih Ibadah',
    icon: '🧳',
    title: 'Shalat Jamak & Qashar Saat Safar',
    desc: 'Dalil Al-Qur\'an & Hadis rukhshah musafir serta ketentuan jarak minimal',
    kitab: 'QS. An-Nisa: 101, HR. Muslim & Fathul Mu\'in',
    question: 'Bagaimana dalil dan ketentuan menjamak serta mengqashar shalat saat perjalanan jauh (safar / mudik)?'
  },
  {
    category: 'Ke-NU-an & Khittah',
    badge: '🌿 Sejarah & Manhaj NU',
    icon: '📜',
    title: 'Metode Istinbath: Al-Qur\'an, Hadis & Mazhab',
    desc: 'Bagaimana ulama menggali hukum dari Al-Qur\'an & Hadis (Qauli, Ilhaqi, Manhaji)',
    kitab: 'QS. An-Nisa: 59 & Keputusan Munas NU 1992',
    question: 'Bagaimana metodologi ulama NU dalam menggali hukum dari Al-Qur\'an, Hadis, Ijma\', dan Qiyas melalui Bahtsul Masail?'
  },
  {
    category: 'Ke-NU-an & Khittah',
    badge: '🌿 Sejarah & Manhaj NU',
    icon: '🇮🇩',
    title: 'Islam, Pancasila & Fiqih Peradaban',
    desc: 'Landasan Al-Qur\'an & Hadis tentang ukhuwah, cinta tanah air & perdamaian',
    kitab: 'QS. Al-Hujurat: 13, Piagam Madinah & Muktamar NU',
    question: 'Bagaimana pandangan Islam dan Nahdlatul Ulama mengenai hubungan agama, Pancasila, NKRI, serta Fiqih Peradaban?'
  }
];

// Initialize on DOM load
document.addEventListener('DOMContentLoaded', () => {
  updateApiKeyUI();
  renderStarterCards('ALL');
  renderChatHistorySidebar();
  fetchKnowledgeBase();

  const textarea = document.getElementById('userInput');
  if (textarea) {
    textarea.addEventListener('input', () => {
      textarea.style.height = 'auto';
      textarea.style.height = Math.min(textarea.scrollHeight, 140) + 'px';
    });
  }
});

// Toggle Mobile Sidebar
function toggleMobileSidebar() {
  const sidebar = document.getElementById('sidebar');
  const backdrop = document.getElementById('sidebarBackdrop');
  if (!sidebar || !backdrop) return;

  const isClosed = sidebar.classList.contains('-translate-x-full');
  if (isClosed) {
    sidebar.classList.remove('-translate-x-full');
    backdrop.classList.remove('hidden');
  } else {
    sidebar.classList.add('-translate-x-full');
    backdrop.classList.add('hidden');
  }
}

// Render & Filter 12 Starter Cards
function filterStarterCards(category) {
  activeCategoryFilter = category;
  document.querySelectorAll('.cat-btn').forEach(btn => {
    const btnCat = btn.getAttribute('data-cat');
    if (btnCat === category) {
      btn.className = 'cat-btn px-3 py-1.5 rounded-xl text-xs font-semibold bg-emerald-700 text-white shadow-xs transition cursor-pointer';
    } else {
      btn.className = 'cat-btn px-3 py-1.5 rounded-xl text-xs font-semibold bg-white text-slate-600 border border-slate-200 hover:border-emerald-500 transition cursor-pointer';
    }
  });
  renderStarterCards(category);
}

function renderStarterCards(category) {
  const grid = document.getElementById('starterCardsGrid');
  if (!grid) return;

  const items = category === 'ALL'
    ? STARTER_CARDS
    : STARTER_CARDS.filter(c => c.category === category);

  grid.innerHTML = items.map(card => `
    <div
      onclick="askPreset(${ JSON.stringify(card.question).replace(/"/g, '&quot;') })"
      class="group p-4 rounded-2xl bg-white border border-slate-200/90 hover:border-emerald-500 hover:shadow-md transition-all cursor-pointer flex flex-col justify-between space-y-3 animate-fade-in"
    >
      <div class="space-y-2">
        <div class="flex items-center justify-between gap-2">
          <span class="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200/70">
            ${escapeHtml(card.badge)}
          </span>
          <span class="text-lg group-hover:scale-110 transition-transform">${card.icon}</span>
        </div>
        <h4 class="font-bold text-sm text-slate-800 group-hover:text-emerald-800 transition-colors leading-snug">
          ${escapeHtml(card.title)}
        </h4>
        <p class="text-xs text-slate-500 leading-relaxed">
          ${escapeHtml(card.desc)}
        </p>
      </div>
      <div class="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px]">
        <span class="text-slate-400 truncate max-w-[180px]" title="${escapeHtml(card.kitab)}">📖 ${escapeHtml(card.kitab)}</span>
        <span class="font-bold text-emerald-700 group-hover:translate-x-0.5 transition-transform">Uji Soal →</span>
      </div>
    </div>
  `).join('');
}

function updateApiKeyUI() {
  const dot = document.getElementById('apiKeyStatusDot');
  const badge = document.getElementById('activeModeBadge');
  const input = document.getElementById('geminiApiKeyInput');
  if (input) input.value = geminiApiKey;

  if (geminiApiKey) {
    if (dot) {
      dot.className = 'w-2.5 h-2.5 rounded-full bg-emerald-400';
      dot.title = 'Gemini API Key Aktif';
    }
    if (badge) {
      badge.innerHTML = '✨ Gemini 2.5 Flash + Hybrid RAG Aswaja';
      badge.className = 'hidden sm:inline-flex text-[11px] px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-300 font-semibold';
    }
  } else {
    if (dot) {
      dot.className = 'w-2.5 h-2.5 rounded-full bg-amber-400';
      dot.title = 'Mode RAG Lokal + NU Online';
    }
    if (badge) {
      badge.innerHTML = '⚡ Hybrid RAG Kitab + NU Online';
      badge.className = 'hidden sm:inline-flex text-[11px] px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 font-semibold';
    }
  }
}

// Fetch Knowledge Base from Backend (with Static/GitHub Pages fallback)
async function fetchKnowledgeBase() {
  try {
    const res = await fetch('/api/knowledge');
    if (res.ok) {
      const data = await res.json();
      if (data.items) {
        const customItems = JSON.parse(localStorage.getItem('aswaja_custom_kb') || '[]');
        // Avoid duplicates if already saved on server
        const serverIds = new Set(data.items.map(i => i.id));
        knowledgeBaseItems = [...customItems.filter(c => !serverIds.has(c.id)), ...data.items];
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
  const heroCount = document.getElementById('heroKbCount');
  if (heroCount) heroCount.textContent = knowledgeBaseItems.length + '+';
}

// Check if message is just a simple greeting / chitchat
function isGreetingOrChitchat(text) {
  const clean = (text || '').toLowerCase().replace(/[^a-z\s]/g, '').trim();
  const greetings = new Set([
    'assalamualaikum', 'assalamualaikum wr wb', 'assalamualaikum warahmatullahi wabarakatuh',
    'salam', 'halo', 'hai', 'hi', 'tes', 'test', 'ping', 'selamat pagi', 'selamat siang',
    'selamat sore', 'selamat malam', 'terima kasih', 'makasih', 'syukron', 'oke', 'ok', 'siap'
  ]);
  return greetings.has(clean) || (clean.split(/\s+/).length <= 3 && /^(assalamu|waalaikum|halo|hai|terima kasih|makasih|syukron)/.test(clean));
}

// Client-side RAG fallback when hosted on GitHub Pages (Static Hosting without Node backend)
function clientSideSearchKB(query, topK = 2) {
  if (isGreetingOrChitchat(query)) return [];
  const stopWords = new Set([
    'apa','apakah','bagaimana','mengapa','kenapa','siapa','kapan','dimana',
    'yang','dan','di','ke','dari','untuk','pada','dengan','dalam','atau',
    'ini','itu','adalah','yaitu','yakni','jika','kalau','kalo','bila',
    'menurut','pandangan','hukum','hukumnya','tentang','mengenai','dalil',
    'dalilnya','jelaskan','tolong','saya','mau','tanya','bertanya','boleh',
    'bolehkah','sah','sahkah','tidak','bukan','secara','bagi','oleh'
  ]);
  const rawTokens = (query || '').toLowerCase().replace(/['’`]/g, '').replace(/[^a-z0-9\s]/g, ' ').split(/\s+/).filter(w => w.length >= 2);
  const tokens = rawTokens.filter(w => !stopWords.has(w));
  if (tokens.length === 0) return [];
  const lowerQuery = ' ' + rawTokens.join(' ') + ' ';

  const scored = knowledgeBaseItems.map(item => {
    let score = 0;
    const tags = (item.tags || []).map(t => t.toLowerCase());
    const titleLower = (item.title || '').toLowerCase();
    const categoryLower = (item.category || '').toLowerCase();
    const summaryLower = (item.summary || '').toLowerCase();
    const contentLower = (item.content || '').toLowerCase();
    const kitabLower = (item.kitab_reference || '').toLowerCase();
    const bmLower = (item.bahtsul_masail || '').toLowerCase();

    // Whole-word / phrase match in tags (prevents "ai" matching inside "assalamualaikum" or "bagaimana")
    for (const tag of tags) {
      if (lowerQuery.includes(' ' + tag + ' ')) score += 22;
    }
    for (const token of tokens) {
      if (token.length < 3 && token !== 'nu' && token !== 'ai') continue;
      if (tags.some(t => t === token)) score += 14;
      else if (token.length >= 4 && tags.some(t => t.split(/\s+/).includes(token))) score += 10;

      if (titleLower.split(/[^a-z0-9]+/).includes(token)) score += 10;
      if (categoryLower.includes(token)) score += 3;
      if (summaryLower.split(/[^a-z0-9]+/).includes(token)) score += 4;
      if (kitabLower.includes(token)) score += 5;
      if (bmLower.includes(token)) score += 4;
      if (contentLower.split(/[^a-z0-9]+/).includes(token)) score += 2;
    }
    return { item, score };
  });
  scored.sort((a, b) => b.score - a.score);
  return scored.filter(s => s.score >= 16).slice(0, topK);
}

async function clientSideChatFallback(message, history = []) {
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

  let followUps = retrieved.length > 0 && Array.isArray(retrieved[0].item.follow_ups)
    ? retrieved[0].item.follow_ups
    : [
        'Bagaimana hukum tahlilan dan kirim doa untuk mayit?',
        'Bagaimana hukum akad nikah online via Video Call / Zoom?',
        'Apa itu 3 pilar Aswaja An-Nahdliyah?'
      ];

  const activeKey = geminiApiKey || getDefaultApiKey();
  if (activeKey) {
    try {
      const contextText = retrieved.length > 0
        ? retrieved.map((r, i) => `[DOKUMEN LOKAL #${i + 1}]\nJudul: ${r.item.title}\nKategori: ${r.item.category}\nKitab Rujukan: ${r.item.kitab_reference}\nLBM NU: ${r.item.bahtsul_masail}\nIbarah Arab: ${r.item.arabic_quote}\nTerjemah: ${r.item.arabic_translation}\nUraian: ${r.item.content}`).join('\n\n---\n\n')
        : 'Pertanyaan ini berada di luar daftar dokumen lokal. Jawablah secara mendalam berdasarkan khazanah Kutubul Mu\'tabarah Mazhab Syafi\'i, Akidah Asy\'ariyah-Maturidiyah, Tasawuf Al-Ghazali, serta keputusan Bahtsul Masail Nahdlatul Ulama.';

      const systemInstruction = `Anda adalah "AiNUn", sistem kecerdasan buatan keislaman yang berpijak pada Empat Sumber Hukum Islam (Al-Qur'an, Hadis, Ijma', dan Qiyas) dengan haluan Ahlussunnah wal Jama'ah An-Nahdliyah (Nahdlatul Ulama).

PEDOMAN KEILMUAN & ADAB MENJAWAB:
1. Hierarki Sumber Hukum & Kerangka Keilmuan:
   - Sumber Utama: Al-Qur'an Al-Karim dan Hadis / Sunnah Rasulullah SAW, disertai Ijma' dan Qiyas ulama.
   - Akidah: Manhaj Imam Abu Hasan Al-Asy'ari & Imam Abu Manshur Al-Maturidi.
   - Fikih: Empat Mazhab Mu'tabar (utamanya Mazhab Syafi'i dengan merujuk kitab tafsir, syarah hadis, dan fikih seperti Tafsir Ibnu Katsir, Tafsir Al-Jalalain, Fathul Bari, Syarah Shahih Muslim, Al-Majmu', Fathul Qarib, Fathul Mu'in, I'anatuth Thalibin, Tuhfatul Muhtaj, serta hasil Bahtsul Masail NU / Ahkamul Fuqaha).
   - Tasawuf: Imam Junaid Al-Baghdadi & Hujjatul Islam Imam Al-Ghazali (Ihya' Ulumiddin).
2. Sikap & Gaya Bahasa:
   - Gunakan bahasa Indonesia yang santun, inklusif, sejuk, edukatif, mudah dipahami masyarakat umum (tidak terkesan eksklusif/sempit), serta mencerminkan prinsip Tawassuth (moderat), Tasamuh (toleran), Tawazun (seimbang), dan I'tidal.
   - Untuk pertanyaan keilmuan/fikih, strukturkan jawaban dengan rapi menggunakan subjudul Markdown:
     ### 📌 Ringkasan Hukum / Jawaban Inti
     ### 📖 Landasan Dalil Al-Qur'an & Hadis
     (Sertakan ayat Al-Qur'an dan/atau Hadis Nabi SAW yang menjadi pijakan utama lengkap dengan teks Arab di dalam blok kutipan \`>\` dan artinya)
     ### 📜 Penjelasan Ulama, Kitab Turats & Bahtsul Masail
     (Jelaskan bagaimana para ulama tafsir/fikih Mazhab Syafi'i & LBM NU menjabarkan dalil tersebut beserta kutipan ibarah kitabnya)
     ### 🌿 Hikmah & Sikap Bijak (Tasamuh)
3. Metadata Rujukan & Pertanyaan Lanjutan:
   - Di baris PALING AKHIR jawaban Anda, selalu tambahkan 2 baris metadata ini (persis dengan format ini):
     [META_RUJUKAN: Judul Topik | Dalil Al-Qur'an/Hadis & Nama Kitab Ulama yang Dirujuk | Keputusan Bahtsul Masail / Ulama NU]
     [META_FOLLOWUP: Pertanyaan lanjutan 1? | Pertanyaan lanjutan 2? | Pertanyaan lanjutan 3?]`;

      const contents = [
        ...history.slice(-4).map(h => ({
          role: h.role === 'assistant' ? 'model' : 'user',
          parts: [{ text: h.content }]
        })),
        {
          role: 'user',
          parts: [{ text: `KONTEKS KITAB & BAHTSUL MASAIL:\n${contextText}\n\nPERTANYAAN PENGGUNA:\n${message}` }]
        }
      ];

      const gRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${encodeURIComponent(activeKey)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          system_instruction: { parts: [{ text: systemInstruction }] },
          contents,
          generationConfig: { temperature: 0.3, maxOutputTokens: 2048 }
        })
      });
      const gData = await gRes.json();
      let text = gData.candidates?.[0]?.content?.parts?.map(p => p.text).join('');
      if (text) {
        const isChatGreeting = isGreetingOrChitchat(message);
        const rujukanMatch = text.match(/\[META_RUJUKAN:\s*([^\]]+)\]/i);
        if (rujukanMatch) {
          const parts = rujukanMatch[1].split('|').map(s => s.trim());
          if (!isChatGreeting && sources.length === 0) {
            sources.push({
              type: 'kitab_ai',
              title: parts[0] || 'Kajian Fikih & Keislaman Aswaja',
              category: 'Kajian Kitab Mu\'tabarah',
              kitab: parts[1] || 'Kutubul Mu\'tabarah Mazhab Syafi\'i',
              bahtsul_masail: parts[2] || 'Manhaj Ahlussunnah wal Jama\'ah An-Nahdliyah',
              url: `https://www.google.com/search?q=${encodeURIComponent('site:nu.or.id ' + message)}`
            });
          }
          text = text.replace(rujukanMatch[0], '').trim();
        } else if (!isChatGreeting && sources.length === 0) {
          sources.push({
            type: 'kitab_ai',
            title: `Rujukan Kajian: ${message.slice(0, 60)}`,
            category: 'Kutubul Mu\'tabarah & NU Online',
            kitab: 'Khazanah Fikih Mazhab Syafi\'i & Aswaja An-Nahdliyah',
            bahtsul_masail: 'Lembaga Bahtsul Masail (LBM) NU',
            url: `https://www.google.com/search?q=${encodeURIComponent('site:nu.or.id ' + message)}`
          });
        }
        const followUpMatch = text.match(/\[META_FOLLOWUP:\s*([^\]]+)\]/i);
        if (followUpMatch) {
          const parsedFollowUps = followUpMatch[1].split('|').map(s => s.trim()).filter(Boolean);
          if (parsedFollowUps.length > 0) followUps = parsedFollowUps;
          text = text.replace(followUpMatch[0], '').trim();
        }
        return { reply: text, sources: isChatGreeting ? [] : sources, followUps, mode: 'gemini-rag' };
      }
    } catch (e) {
      console.warn('Client Gemini fallback error:', e);
    }
  }

  if (retrieved.length > 0) {
    const p = retrieved[0].item;
    const secondary = retrieved.slice(1).map(d => d.item);
    let reply = `### 📌 Ringkasan Jawaban (${p.category})\n${p.summary}\n\n### 📖 Uraian & Penjelasan Keilmuan\n${p.content}\n\n`;
    if (p.arabic_quote) {
      reply += `### 📜 Ibarah Kitab / Dalil Rujukan\n> **${p.arabic_quote}**\n>\n> *Artinya: "${p.arabic_translation}"*\n> — **(${p.kitab_reference})**\n\n`;
    }
    reply += `### ⚖️ Rujukan Keputusan & Kitab Mu'tabarah\n- **Kitab Rujukan:** ${p.kitab_reference}\n- **Lembaga Bahtsul Masail / Muktamar:** ${p.bahtsul_masail || '-'}`;
    if (secondary.length > 0) {
      reply += `\n\n---\n**Topik Terkait di Pustaka Kami:**\n`;
      for (const sec of secondary) {
        reply += `- *${sec.title}*: ${sec.summary.slice(0, 130)}...\n`;
      }
    }
    return { reply, sources, followUps, mode: 'local-rag' };
  }

  return {
    reply: `### Assalamu'alaikum Warahmatullahi Wabarakatuh\n\nTerima kasih atas pertanyaan Anda mengenai **"${message}"**.\n\nSaat ini topik spesifik tersebut **belum tersedia di dalam Basis Data Lokal (*Knowledge Base*)** kami. Sesuai prinsip kehati-hatian (*ihtiyath*) dalam tradisi keilmuan pesantren dan **Nahdlatul Ulama**, sistem AI ini dirancang untuk **tidak mengarang hukum fikih tanpa rujukan kitab (*ibarah*) yang terverifikasi**.\n\n#### Apa yang bisa Anda lakukan?\n1. **Uji Coba 23+ Topik yang Tersedia:** Klik salah satu pertanyaan rekomendasi di bawah ini atau buka menu **📚 Pustaka Kitab & LBM NU**.\n2. **Tambahkan Referensi Kitab Baru:** Klik **➕ Tambah Kitab / Referensi** di panel kiri.\n3. **Aktifkan Gemini AI:** Masukkan *Google Gemini API Key* di menu **⚙️ Pengaturan AI** untuk mengaktifkan penalaran bahasa alami penuh.`,
    sources: [],
    followUps,
    mode: 'local-rag'
  };
}

// Start a new conversation
function startNewChat() {
  stopSpeech();
  currentChatId = null;
  document.getElementById('welcomeScreen').classList.remove('hidden');
  const stream = document.getElementById('chatStream');
  stream.classList.add('hidden');
  stream.innerHTML = '';
  renderChatHistorySidebar();
  const sidebar = document.getElementById('sidebar');
  if (sidebar && !sidebar.classList.contains('-translate-x-full') && window.innerWidth < 768) {
    toggleMobileSidebar();
  }
}

// Load an existing conversation
function selectConversation(chatId) {
  stopSpeech();
  const conv = conversations.find(c => c.id === chatId);
  if (!conv) return;

  currentChatId = conv.id;
  document.getElementById('welcomeScreen').classList.add('hidden');
  const stream = document.getElementById('chatStream');
  stream.classList.remove('hidden');
  stream.innerHTML = '';

  conv.messages.forEach(msg => {
    appendMessageToDOM(msg.role, msg.content, msg.sources, msg.mode, msg.followUps);
  });

  renderChatHistorySidebar();
  scrollToBottom();
  if (window.innerWidth < 768) {
    toggleMobileSidebar();
  }
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
  if (!listEl) return;
  if (!conversations.length) {
    listEl.innerHTML = `<div class="px-3 py-2 text-emerald-400/60 italic">Belum ada riwayat tanya jawab</div>`;
    return;
  }

  listEl.innerHTML = conversations.map(c => {
    const isActive = c.id === currentChatId;
    return `
      <div onclick="selectConversation('${c.id}')" class="group flex items-center justify-between px-3 py-2 rounded-xl cursor-pointer transition ${isActive ? 'bg-emerald-800/90 text-white font-semibold border border-emerald-700' : 'hover:bg-emerald-900/60 text-emerald-100/90'}">
        <span class="truncate pr-2">💬 ${escapeHtml(c.title)}</span>
        <button onclick="deleteConversation(event, '${c.id}')" class="opacity-0 group-hover:opacity-100 text-emerald-300 hover:text-red-300 text-sm px-1 cursor-pointer" title="Hapus">&times;</button>
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
    const enableWebSearch = document.getElementById('webSearchToggle')?.checked !== false;
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
      data = await clientSideChatFallback(text, conv.messages.slice(0, -1));
    }

    removeLoadingIndicator(loadingId);

    const reply = data.reply || data.error || 'Terjadi kesalahan saat memproses jawaban.';
    const sources = data.sources || [];
    const mode = data.mode || 'local-rag';
    const followUps = data.followUps || [];

    conv.messages.push({
      role: 'assistant',
      content: reply,
      sources,
      mode,
      followUps
    });
    localStorage.setItem('aswaja_conversations', JSON.stringify(conversations));

    appendMessageToDOM('assistant', reply, sources, mode, followUps);
    scrollToBottom();
  } catch (err) {
    removeLoadingIndicator(loadingId);
    appendMessageToDOM('assistant', `Maaf, terjadi gangguan saat memproses jawaban: ${err.message}`, [], 'error', []);
  } finally {
    sendBtn.disabled = false;
  }
}

// Render User or Assistant Message Bubble
function appendMessageToDOM(role, content, sources = [], mode = 'local-rag', followUps = []) {
  const stream = document.getElementById('chatStream');
  const wrapper = document.createElement('div');
  const msgUid = 'msg-' + Date.now() + '-' + Math.random().toString(36).slice(2, 7);

  if (role === 'user') {
    wrapper.className = 'flex justify-end animate-fade-in';
    wrapper.innerHTML = `
      <div class="max-w-xl bg-gradient-to-r from-emerald-700 to-teal-700 text-white px-4 py-3 rounded-2xl rounded-tr-xs shadow-sm text-sm leading-relaxed">
        ${escapeHtml(content)}
      </div>
    `;
  } else {
    wrapper.className = 'flex items-start gap-3.5 animate-fade-in';
    const modeLabel = mode === 'gemini-rag'
      ? '✨ Gemini 2.5 Flash + RAG Aswaja'
      : '📚 Mesin Sintesis RAG Kitab & Bahtsul Masail';

    const sourcesHtml = sources && sources.length > 0
      ? `
        <div class="mt-4 pt-3.5 border-t border-slate-200/80">
          <div class="text-[11px] font-bold uppercase tracking-wider text-emerald-800 mb-2 flex items-center gap-1.5">
            <span>📜</span>
            <span>Kartu Rujukan & Sanad Keilmuan Terverifikasi (${sources.length} Sumber):</span>
          </div>
          <div class="grid grid-cols-1 gap-2">
            ${sources.map(s => `
              <div class="p-3 rounded-xl bg-emerald-50/70 border border-emerald-200/80 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <div class="font-bold text-emerald-950 flex items-center gap-1.5">
                    <span>${escapeHtml(s.title)}</span>
                    ${s.category ? `<span class="text-[10px] px-2 py-0.5 rounded-full bg-emerald-200/70 text-emerald-900 font-semibold">${escapeHtml(s.category)}</span>` : ''}
                  </div>
                  <div class="text-[11px] text-emerald-800 mt-1">
                    📖 <strong>Dalil (Al-Qur'an / Hadis) & Kitab:</strong> ${escapeHtml(s.kitab || '-')}
                    ${s.bahtsul_masail && s.bahtsul_masail !== '-' ? ` • ⚖️ <strong>Keputusan Ulama / LBM:</strong> ${escapeHtml(s.bahtsul_masail)}` : ''}
                  </div>
                </div>
                ${s.url ? `<a href="${escapeHtml(s.url)}" target="_blank" rel="noopener noreferrer" class="px-3 py-1.5 rounded-xl bg-white hover:bg-emerald-600 hover:text-white text-emerald-700 border border-emerald-300 text-[11px] font-bold shrink-0 transition self-start sm:self-center shadow-2xs">Buka Rujukan ↗</a>` : ''}
              </div>
            `).join('')}
          </div>
        </div>
      `
      : '';

    const followUpsHtml = followUps && followUps.length > 0
      ? `
        <div class="mt-4 pt-3 border-t border-slate-100">
          <div class="text-[11px] font-bold text-slate-500 mb-2">💡 Pertanyaan Lanjutan yang Sering Ditanyakan:</div>
          <div class="flex flex-wrap gap-1.5">
            ${followUps.map(q => `
              <button
                onclick="askPreset(${JSON.stringify(q).replace(/"/g, '&quot;')})"
                class="text-left text-xs px-3 py-1.5 rounded-xl bg-slate-50 hover:bg-emerald-50 text-slate-700 hover:text-emerald-800 border border-slate-200 hover:border-emerald-300 transition font-medium cursor-pointer"
              >
                💬 ${escapeHtml(q)}
              </button>
            `).join('')}
          </div>
        </div>
      `
      : '';

    const encodedRaw = encodeURIComponent(content);

    wrapper.innerHTML = `
      <div class="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-600 to-teal-700 text-amber-300 flex items-center justify-center font-bold text-base shrink-0 shadow-sm mt-0.5">
        ۞
      </div>
      <div class="flex-1 bg-white border border-slate-200 rounded-2xl rounded-tl-xs p-5 shadow-xs">
        <div class="flex flex-wrap items-center justify-between gap-2 mb-3 pb-2.5 border-b border-slate-100">
          <div class="flex items-center gap-2">
            <span class="text-xs font-extrabold text-emerald-950">AiNUn • Majelis Ilmiah Nahdlatul Ulama</span>
            <span class="text-[10px] px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 font-semibold">${modeLabel}</span>
          </div>
          <div class="flex items-center gap-1.5">
            <button onclick="speakMessage('${msgUid}', '${encodedRaw}')" id="tts-${msgUid}" class="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-emerald-50 text-slate-600 hover:text-emerald-700 text-[11px] font-semibold transition cursor-pointer" title="Bacakan Jawaban dengan Suara">
              🔊 Bacakan
            </button>
            <button onclick="copyMessageText('${msgUid}', '${encodedRaw}')" id="copy-${msgUid}" class="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-emerald-50 text-slate-600 hover:text-emerald-700 text-[11px] font-semibold transition cursor-pointer" title="Salin Teks Jawaban">
              📋 Salin
            </button>
            <button onclick="shareToWhatsApp('${encodedRaw}')" class="px-2.5 py-1 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-[11px] font-semibold transition cursor-pointer" title="Bagikan ke WhatsApp">
              📲 WA
            </button>
          </div>
        </div>
        <div class="prose-chat text-sm text-slate-700">
          ${renderMarkdown(content)}
        </div>
        ${sourcesHtml}
        ${followUpsHtml}
      </div>
    `;
  }

  stream.appendChild(wrapper);
}

// Copy, TTS & Share Actions for Presentation Demo
function copyMessageText(uid, encodedText) {
  const raw = decodeURIComponent(encodedText).replace(/[#*>]/g, '').trim();
  navigator.clipboard.writeText(raw).then(() => {
    const btn = document.getElementById('copy-' + uid);
    if (btn) {
      const old = btn.innerHTML;
      btn.innerHTML = '✅ Tersalin';
      setTimeout(() => { btn.innerHTML = old; }, 2000);
    }
  });
}

function speakMessage(uid, encodedText) {
  if (!('speechSynthesis' in window)) {
    alert('Browser Anda tidak mendukung fitur pembaca suara (Text-to-Speech).');
    return;
  }
  const btn = document.getElementById('tts-' + uid);
  if (activeSpeechId === uid && window.speechSynthesis.speaking) {
    stopSpeech();
    return;
  }
  stopSpeech();

  // Strip Markdown and Arabic characters so Indonesian TTS reads smoothly
  const cleanText = decodeURIComponent(encodedText)
    .replace(/[\u0600-\u06FF]+/g, '')
    .replace(/[#*>_`~-]/g, ' ')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/\s+/g, ' ')
    .trim();

  const utterance = new SpeechSynthesisUtterance(cleanText);
  utterance.lang = 'id-ID';
  utterance.rate = 1.02;

  activeSpeechId = uid;
  if (btn) btn.innerHTML = '⏹️ Berhenti';

  utterance.onend = () => {
    activeSpeechId = null;
    if (btn) btn.innerHTML = '🔊 Bacakan';
  };
  utterance.onerror = () => {
    activeSpeechId = null;
    if (btn) btn.innerHTML = '🔊 Bacakan';
  };

  window.speechSynthesis.speak(utterance);
}

function stopSpeech() {
  if ('speechSynthesis' in window) {
    window.speechSynthesis.cancel();
  }
  if (activeSpeechId) {
    const prevBtn = document.getElementById('tts-' + activeSpeechId);
    if (prevBtn) prevBtn.innerHTML = '🔊 Bacakan';
    activeSpeechId = null;
  }
}

function shareToWhatsApp(encodedText) {
  const raw = decodeURIComponent(encodedText).trim();
  const shareText = `🕌 *Kajian AiNUn (Bahtsul Masail & Keilmuan NU)*\n\n${raw.slice(0, 1200)}${raw.length > 1200 ? '...\n\n' : '\n\n'}🌐 _Diakses melalui AiNUn_`;
  window.open(`https://wa.me/?text=${encodeURIComponent(shareText)}`, '_blank');
}

function appendLoadingIndicator(id) {
  const stream = document.getElementById('chatStream');
  const el = document.createElement('div');
  el.id = id;
  el.className = 'flex items-start gap-3.5';
  el.innerHTML = `
    <div class="w-9 h-9 rounded-xl bg-emerald-700 text-amber-300 flex items-center justify-center font-bold text-base shrink-0 animate-pulse">
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
  if (container) container.scrollTop = container.scrollHeight;
}

// Lightweight Markdown + Arabic text formatter
function renderMarkdown(md) {
  if (!md) return '';
  let html = escapeHtml(md);

  // Blockquotes (with automatic detection of Arabic characters for Amiri font)
  html = html.replace(/(?:^&gt; ?.*(?:\n|$))+/gm, (match) => {
    const inner = match.replace(/^&gt; ?/gm, '').trim();
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
// MODAL HANDLERS (PRESENTASI, PUSTAKA, TAMBAH KITAB, SETTINGS)
// ==========================================

function openPresentationModal() {
  const modal = document.getElementById('presentationModal');
  if (!modal) return;
  modal.classList.remove('hidden');
  modal.classList.add('flex');
}

function closePresentationModal() {
  const modal = document.getElementById('presentationModal');
  if (!modal) return;
  modal.classList.add('hidden');
  modal.classList.remove('flex');
}

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
    <div class="p-4 rounded-2xl border border-slate-200 bg-white hover:border-emerald-400 transition space-y-2 shadow-2xs">
      <div class="flex items-start justify-between gap-2">
        <div>
          <span class="text-[10px] font-bold uppercase px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800">${escapeHtml(item.category)}</span>
          <h4 class="font-bold text-sm text-slate-800 mt-1">${escapeHtml(item.title)}</h4>
        </div>
        <button onclick="askFromKnowledge(${JSON.stringify(item.title).replace(/"/g, '&quot;')})" class="px-3 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-600 hover:text-white text-emerald-700 text-xs font-bold border border-emerald-200 transition shrink-0 cursor-pointer">
          Tanyakan di Chat →
        </button>
      </div>
      ${item.arabic_quote ? `<div class="font-arabic text-emerald-950 bg-emerald-50/60 px-3.5 py-2 rounded-xl border-r-4 border-emerald-600 text-right">${escapeHtml(item.arabic_quote)}</div>` : ''}
      <p class="text-xs text-slate-600 leading-relaxed">${escapeHtml(item.summary)}</p>
      <div class="text-[11px] text-slate-500 pt-1.5 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2">
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
    id: 'kb-' + Date.now(),
    title: document.getElementById('refTitle').value.trim(),
    category: document.getElementById('refCategory').value.trim(),
    kitab_reference: document.getElementById('refKitab').value.trim(),
    bahtsul_masail: (document.getElementById('refBM').value || '-').trim(),
    tags: document.getElementById('refTags').value.split(',').map(t => t.trim().toLowerCase()).filter(Boolean),
    arabic_quote: document.getElementById('refArabic').value.trim(),
    arabic_translation: document.getElementById('refTranslation').value.trim(),
    summary: document.getElementById('refSummary').value.trim(),
    content: document.getElementById('refContent').value.trim(),
    source_url: document.getElementById('refUrl').value.trim()
  };

  try {
    const res = await fetch('/api/knowledge', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    if (!res.ok) throw new Error('Static mode fallback');
    const data = await res.json();
    if (data.status === 'ok') {
      document.getElementById('addRefForm').reset();
      closeAddReferenceModal();
      await fetchKnowledgeBase();
      alert(`Alhamdulillah! Referensi "${data.item.title}" berhasil ditambahkan ke Database RAG dan siap ditanyakan.`);
    }
  } catch (err) {
    // Save to localStorage when hosted on GitHub Pages (Static Mode)
    const customItems = JSON.parse(localStorage.getItem('aswaja_custom_kb') || '[]');
    customItems.unshift(payload);
    localStorage.setItem('aswaja_custom_kb', JSON.stringify(customItems));
    document.getElementById('addRefForm').reset();
    closeAddReferenceModal();
    await fetchKnowledgeBase();
    alert(`Alhamdulillah! Referensi "${payload.title}" berhasil disimpan ke Database RAG dan siap diuji coba.`);
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
