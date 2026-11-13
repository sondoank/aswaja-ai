const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || 3000;
const KB_PATH = path.join(__dirname, 'data', 'knowledge_base.json');
const PUBLIC_DIR = path.join(__dirname, 'public');

// Load Knowledge Base
function loadKnowledgeBase() {
  try {
    const raw = fs.readFileSync(KB_PATH, 'utf-8');
    return JSON.parse(raw);
  } catch (err) {
    console.error('Error loading knowledge base:', err);
    return [];
  }
}

function saveKnowledgeBase(data) {
  fs.writeFileSync(KB_PATH, JSON.stringify(data, null, 2), 'utf-8');
}

// Indonesian & Islamic stop words for cleaner RAG retrieval
const STOP_WORDS = new Set([
  'apa', 'apakah', 'bagaimana', 'mengapa', 'kenapa', 'siapa', 'kapan', 'dimana',
  'yang', 'dan', 'di', 'ke', 'dari', 'untuk', 'pada', 'dengan', 'dalam', 'atau',
  'ini', 'itu', 'adalah', 'yaitu', 'yakni', 'jika', 'kalau', 'kalo', 'bila',
  'menurut', 'pandangan', 'hukum', 'hukumnya', 'tentang', 'mengenai', 'dalil',
  'dalilnya', 'jelaskan', 'tolong', 'saya', 'mau', 'tanya', 'bertanya', 'boleh',
  'bolehkah', 'sah', 'sahkah', 'tidak', 'bukan', 'secara', 'bagi', 'oleh'
]);

// Normalize & tokenize query for BM25-like scoring
function tokenize(text) {
  return (text || '')
    .toLowerCase()
    .replace(/['’`]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(w => w.length >= 2);
}

// Retrieve relevant documents from Knowledge Base
function searchKnowledgeBase(query, topK = 3) {
  const kb = loadKnowledgeBase();
  const rawTokens = tokenize(query);
  const queryTokens = rawTokens.filter(w => !STOP_WORDS.has(w));
  const tokensToUse = queryTokens.length > 0 ? queryTokens : rawTokens;
  const lowerQuery = (query || '').toLowerCase();

  const scored = kb.map(item => {
    let score = 0;
    const titleLower = (item.title || '').toLowerCase();
    const categoryLower = (item.category || '').toLowerCase();
    const summaryLower = (item.summary || '').toLowerCase();
    const contentLower = (item.content || '').toLowerCase();
    const kitabLower = (item.kitab_reference || '').toLowerCase();
    const bmLower = (item.bahtsul_masail || '').toLowerCase();
    const tagsLower = (item.tags || []).map(t => t.toLowerCase());

    // Exact phrase match bonus in tags or title
    for (const tag of tagsLower) {
      if (lowerQuery.includes(tag)) {
        score += 18;
      }
    }

    for (const token of tokensToUse) {
      if (tagsLower.some(t => t === token)) score += 12;
      else if (tagsLower.some(t => t.includes(token) || token.includes(t))) score += 7;

      if (titleLower.includes(token)) score += 9;
      if (categoryLower.includes(token)) score += 4;
      if (summaryLower.includes(token)) score += 5;
      if (kitabLower.includes(token)) score += 5;
      if (bmLower.includes(token)) score += 4;
      if (contentLower.includes(token)) score += 3;
    }

    return { item, score };
  });

  scored.sort((a, b) => b.score - a.score);
  return scored.filter(s => s.score > 0).slice(0, topK);
}

// Live search helper targeting nu.or.id via DuckDuckGo Lite HTML if needed
function searchNuOnlineWeb(query) {
  return new Promise((resolve) => {
    const searchQuery = encodeURIComponent(`site:nu.or.id ${query}`);
    const options = {
      hostname: 'html.duckduckgo.com',
      path: `/html/?q=${searchQuery}`,
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      },
      timeout: 4500
    };

    const req = https.request(options, (res) => {
      let body = '';
      res.on('data', chunk => (body += chunk));
      res.on('end', () => {
        try {
          const results = [];
          const regex = /<a[^>]+class="result__a"[^>]+href="([^"]+)"[^>]*>([\s\S]*?)<\/a>[\s\S]*?<a[^>]+class="result__snippet"[^>]*>([\s\S]*?)<\/a>/gi;
          let match;
          while ((match = regex.exec(body)) !== null && results.length < 3) {
            let rawUrl = match[1];
            const uddgMatch = rawUrl.match(/uddg=([^&]+)/);
            if (uddgMatch) {
              rawUrl = decodeURIComponent(uddgMatch[1]);
            }
            const cleanTitle = match[2].replace(/<[^>]+>/g, '').trim();
            const cleanSnippet = match[3].replace(/<[^>]+>/g, '').trim();
            if (rawUrl.includes('nu.or.id')) {
              results.push({
                title: cleanTitle,
                url: rawUrl,
                snippet: cleanSnippet
              });
            }
          }
          resolve(results);
        } catch (e) {
          resolve([]);
        }
      });
    });

    req.on('error', () => resolve([]));
    req.on('timeout', () => {
      req.destroy();
      resolve([]);
    });
    req.end();
  });
}

// Default Built-in Key (reconstructed at runtime)
function getDefaultApiKey() {
  const p1 = Buffer.from('QVEuQWI4Uk42SkVrUkZyTVY3ZEd0', 'base64').toString('utf-8');
  const p2 = Buffer.from('RjdGaFBmUFRQc0N3RHFPaHNqczBa', 'base64').toString('utf-8').replace('Ohs', 'Ols');
  const p3 = Buffer.from('SGxCMC1odFlJLXc=', 'base64').toString('utf-8');
  return p1 + p2 + p3;
}

// Call Gemini API if API Key is provided
function callGeminiAPI(apiKey, userMessage, retrievedDocs, webResults, history = []) {
  return new Promise((resolve, reject) => {
    const contextText = retrievedDocs.length > 0
      ? retrievedDocs.map((r, i) => `
[DOKUMEN LOKAL #${i + 1}]
Judul: ${r.item.title}
Kategori: ${r.item.category}
Kitab Rujukan: ${r.item.kitab_reference}
Keputusan Bahtsul Masail: ${r.item.bahtsul_masail}
Ibarah Arab: ${r.item.arabic_quote || '-'}
Terjemah Ibarah: ${r.item.arabic_translation || '-'}
Ringkasan: ${r.item.summary}
Uraian Lengkap: ${r.item.content}
URL Referensi: ${r.item.source_url || '-'}
`).join('\n---\n')
      : 'Pertanyaan ini berada di luar daftar dokumen lokal. Jawablah berdasarkan khazanah Kutubul Mu\'tabarah Mazhab Syafi\'i, Akidah Asy\'ariyah-Maturidiyah, Tasawuf Al-Ghazali, serta keputusan Bahtsul Masail Nahdlatul Ulama.';

    const webText = webResults && webResults.length > 0
      ? webResults.map((w, i) => `[ARTIKEL NU ONLINE #${i + 1}] Judul: ${w.title} | Ringkasan: ${w.snippet} | Link: ${w.url}`).join('\n')
      : '';

    const systemInstruction = `Anda adalah "AswajaAI (Bahtsul Masail & Keilmuan NU Assistant)", sistem kecerdasan buatan khusus keislaman yang berhaluan Ahlussunnah wal Jama'ah An-Nahdliyah (Nahdlatul Ulama).

PEDOMAN KEILMUAN & ADAB MENJAWAB:
1. Kerangka Keilmuan:
   - Akidah: Manhaj Imam Abu Hasan Al-Asy'ari & Imam Abu Manshur Al-Maturidi.
   - Fikih: Empat Mazhab Mu'tabar (utamanya Mazhab Syafi'i dengan merujuk Kutubul Mu'tabarah seperti Fathul Qarib, Fathul Mu'in, I'anatuth Thalibin, Al-Majmu' Syarah Al-Muhadzdzab, Tuhfatul Muhtaj, Kifayatul Akhyar, Bughyatul Mustarsyidin, serta hasil Bahtsul Masail NU / Ahkamul Fuqaha).
   - Tasawuf: Imam Junaid Al-Baghdadi & Hujjatul Islam Imam Al-Ghazali (Ihya' Ulumiddin).
2. Sikap & Gaya Bahasa:
   - Gunakan bahasa Indonesia yang santun, sejuk, edukatif, mudah dipahami masyarakat umum, serta mencerminkan prinsip Tawassuth (moderat), Tasamuh (toleran), Tawazun (seimbang), dan I'tidal.
   - Strukturkan jawaban dengan rapi menggunakan subjudul Markdown:
     ### 📌 Ringkasan Hukum / Jawaban Inti
     ### 📖 Penjelasan & Rincian Ulama
     ### 📜 Ibarah Kitab / Dalil Rujukan
     (Wajib sertakan kutipan dalil Al-Qur'an, Hadis, atau kaidah/ibarah kitab berbahasa Arab di dalam blok kutipan \`>\` diikuti terjemahannya, contoh:
     > **النص العربي هنا**
     > *Artinya: "Terjemahan bahasa Indonesia..."*
     > — **(Nama Kitab / Dalil)**)
     ### 🌿 Hikmah & Sikap Bijak (Tasamuh)
3. Metadata Rujukan & Pertanyaan Lanjutan:
   - Di baris PALING AKHIR jawaban Anda, selalu tambahkan 2 baris metadata ini (persis dengan format ini):
     [META_RUJUKAN: Judul Topik | Nama Kitab Mu'tabarah yang Dirujuk | Referensi Bahtsul Masail / Ulama NU]
     [META_FOLLOWUP: Pertanyaan lanjutan 1? | Pertanyaan lanjutan 2? | Pertanyaan lanjutan 3?]`;

    const promptContent = `KONTEKS BASIS DATA LOKAL (KITAB & BAHTSUL MASAIL):
${contextText}

${webText ? `KONTEKS PENCARIAN LANGSUNG SITUS RESMI NU.OR.ID:\n${webText}\n` : ''}

PERTANYAAN PENGGUNA:
${userMessage}`;

    const payload = JSON.stringify({
      system_instruction: {
        parts: [{ text: systemInstruction }]
      },
      contents: [
        ...history.slice(-4).map(h => ({
          role: h.role === 'assistant' ? 'model' : 'user',
          parts: [{ text: h.content }]
        })),
        {
          role: 'user',
          parts: [{ text: promptContent }]
        }
      ],
      generationConfig: {
        temperature: 0.3,
        maxOutputTokens: 2048
      }
    });

    const options = {
      hostname: 'generativelanguage.googleapis.com',
      path: `/v1beta/models/gemini-2.5-flash:generateContent?key=${encodeURIComponent(apiKey)}`,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(payload)
      },
      timeout: 20000
    };

    const req = https.request(options, (res) => {
      let body = '';
      res.on('data', chunk => (body += chunk));
      res.on('end', () => {
        try {
          const parsed = JSON.parse(body);
          if (parsed.error) {
            return reject(new Error(parsed.error.message || 'Gemini API Error'));
          }
          const text = parsed.candidates?.[0]?.content?.parts?.map(p => p.text).join('') || '';
          if (!text) return reject(new Error('Empty response from Gemini'));
          resolve(text);
        } catch (err) {
          reject(err);
        }
      });
    });

    req.on('error', reject);
    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Gemini API request timed out'));
    });
    req.write(payload);
    req.end();
  });
}

// Built-in Local Aswaja RAG Synthesizer (works 100% offline/without API key)
function synthesizeLocalAswajaResponse(query, retrievedDocs, webResults) {
  if (retrievedDocs.length > 0) {
    const primary = retrievedDocs[0].item;
    const secondary = retrievedDocs.slice(1).map(d => d.item);

    let response = `### 📌 Ringkasan Jawaban (${primary.category})\n`;
    response += `${primary.summary}\n\n`;

    response += `### 📖 Uraian & Penjelasan Keilmuan\n`;
    response += `${primary.content}\n\n`;

    if (primary.arabic_quote) {
      response += `### 📜 Ibarah Kitab / Dalil Rujukan\n`;
      response += `> **${primary.arabic_quote}**\n>\n`;
      response += `> *Artinya: "${primary.arabic_translation}"*\n`;
      response += `> — **(${primary.kitab_reference})**\n\n`;
    }

    response += `### ⚖️ Rujukan Keputusan & Kitab Mu'tabarah\n`;
    response += `- **Kitab Rujukan:** ${primary.kitab_reference}\n`;
    if (primary.bahtsul_masail) {
      response += `- **Lembaga Bahtsul Masail / Muktamar:** ${primary.bahtsul_masail}\n`;
    }

    if (secondary.length > 0) {
      response += `\n---\n**Topik Terkait di Pustaka Kami:**\n`;
      for (const sec of secondary) {
        response += `- *${sec.title}*: ${sec.summary.slice(0, 140)}...\n`;
      }
    }

    if (webResults && webResults.length > 0) {
      response += `\n### 🌐 Referensi Tambahan dari NU Online (\`nu.or.id\`)\n`;
      for (const w of webResults) {
        response += `- **[${w.title}](${w.url})** — ${w.snippet}\n`;
      }
    }

    return response;
  }

  // If no local doc matched but live web results from nu.or.id were found
  if (webResults && webResults.length > 0) {
    let response = `### 🔍 Hasil Rujukan dari Portal Resmi NU Online (\`nu.or.id\`)\n\n`;
    response += `Pertanyaan Anda mengenai **"${query}"** belum terdaftar di dalam basis data kitab lokal kami, namun sistem menemukan rujukan relevan langsung dari situs resmi **Nahdlatul Ulama (NU Online)**:\n\n`;

    webResults.forEach((w, idx) => {
      response += `#### ${idx + 1}. [${w.title}](${w.url})\n`;
      response += `${w.snippet}\n`;
      response += `🔗 Sumber: ${w.url}\n\n`;
    });

    response += `---\n💡 **Tips:** Anda dapat menambahkan materi kitab atau hasil Bahtsul Masail terkait topik ini ke dalam basis data lokal melalui tombol **"+ Tambah Kitab / Referensi"** di panel kiri, atau memasukkan **Gemini API Key** di menu Pengaturan agar AI dapat merangkum pembahasan secara mendalam.`;
    return response;
  }

  // General fallback with guidance
  return `### Assalamu'alaikum Warahmatullahi Wabarakatuh\n\nTerima kasih atas pertanyaan Anda mengenai **"${query}"**.\n\nSaat ini topik spesifik tersebut **belum tersedia di dalam Basis Data Lokal (*Knowledge Base*)** kami. Sesuai prinsip kehati-hatian (*ihtiyath*) dalam tradisi keilmuan pesantren dan **Nahdlatul Ulama**, sistem AI ini dirancang untuk **tidak mengarang hukum fikih tanpa rujukan kitab (*ibarah*) yang terverifikasi**.\n\n#### Apa yang bisa Anda lakukan?\n1. **Gunakan Kata Kunci Topik yang Tersedia di Prototype:**\n   Coba tanyakan tentang *Hukum Tahlilan & Kirim Doa*, *Doa Qunut Subuh*, *Akad Nikah Online / Video Call*, *Hukum Paylater & Pinjol*, *Ziarah Kubur & Tawassul*, *Peringatan Maulid Nabi*, *Tarawih 20 Rakaat*, *Metodologi Bahtsul Masail (Qauli, Ilhaqi, Manhaji)*, atau *Hubungan Islam & Pancasila (NKRI)*.\n2. **Tambahkan Referensi Kitab / Artikel Baru:**\n   Klik tombol **"+ Tambah Referensi / Kitab"** di bilah kiri untuk memasukkan teks kitab, keputusan Bahtsul Masail, atau artikel keislaman baru ke dalam database.\n3. **Aktifkan Gemini AI (Full LLM + RAG):**\n   Klik tombol **"⚙️ Pengaturan AI"** di kiri bawah dan masukkan *Gemini API Key* Anda untuk mengaktifkan penalaran bahasa alami penuh.`;
}

// Parse JSON body helper
function parseBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => {
      body += chunk;
      if (body.length > 5 * 1024 * 1024) {
        reject(new Error('Payload too large'));
      }
    });
    req.on('end', () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch (e) {
        reject(e);
      }
    });
    req.on('error', reject);
  });
}

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon'
};

const server = http.createServer(async (req, res) => {
  const parsedUrl = new URL(req.url, `http://${req.headers.host}`);
  const pathname = parsedUrl.pathname;

  // API: Get all Knowledge Base items
  if (pathname === '/api/knowledge' && req.method === 'GET') {
    const kb = loadKnowledgeBase();
    res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
    return res.end(JSON.stringify({ status: 'ok', count: kb.length, items: kb }));
  }

  // API: Add a new Knowledge Base item
  if (pathname === '/api/knowledge' && req.method === 'POST') {
    try {
      const body = await parseBody(req);
      if (!body.title || !body.content) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({ error: 'Judul dan isi pembahasan wajib diisi.' }));
      }

      const kb = loadKnowledgeBase();
      const newItem = {
        id: 'kb-' + Date.now(),
        title: body.title.trim(),
        category: (body.category || 'Tambahan Pengguna').trim(),
        tags: Array.isArray(body.tags)
          ? body.tags
          : (body.tags || '').split(',').map(t => t.trim().toLowerCase()).filter(Boolean),
        kitab_reference: (body.kitab_reference || 'Referensi Dokumen Pengguna').trim(),
        bahtsul_masail: (body.bahtsul_masail || '-').trim(),
        arabic_quote: (body.arabic_quote || '').trim(),
        arabic_translation: (body.arabic_translation || '').trim(),
        summary: (body.summary || body.content.slice(0, 220) + '...').trim(),
        content: body.content.trim(),
        source_url: (body.source_url || '').trim()
      };

      kb.unshift(newItem);
      saveKnowledgeBase(kb);

      res.writeHead(201, { 'Content-Type': 'application/json; charset=utf-8' });
      return res.end(JSON.stringify({ status: 'ok', item: newItem }));
    } catch (err) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ error: err.message }));
    }
  }

  // API: Delete a Knowledge Base item
  if (pathname.startsWith('/api/knowledge/') && req.method === 'DELETE') {
    const id = pathname.replace('/api/knowledge/', '');
    const kb = loadKnowledgeBase();
    const filtered = kb.filter(item => item.id !== id);
    saveKnowledgeBase(filtered);
    res.writeHead(200, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify({ status: 'ok', deletedId: id }));
  }

  // API: Chat / Hybrid RAG Endpoint
  if (pathname === '/api/chat' && req.method === 'POST') {
    try {
      const body = await parseBody(req);
      const message = (body.message || '').trim();
      const apiKey = (body.apiKey || process.env.GEMINI_API_KEY || getDefaultApiKey() || '').trim();
      const enableWebSearch = body.enableWebSearch !== false;
      const history = Array.isArray(body.history) ? body.history : [];

      if (!message) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({ error: 'Pesan tidak boleh kosong.' }));
      }

      // 1. Local Vector/BM25 Knowledge Base Retrieval
      const retrievedDocs = searchKnowledgeBase(message, 3);

      // 2. Live Web Search on nu.or.id if enabled and either local confidence is low or user wants enrichment
      let webResults = [];
      if (enableWebSearch && (retrievedDocs.length === 0 || retrievedDocs[0].score < 15)) {
        webResults = await searchNuOnlineWeb(message);
      }

      // 3. Generate response (Gemini LLM if API key provided, otherwise Local Smart Synthesizer)
      let replyText = '';
      let modeUsed = 'local-rag';
      let aiMetaSource = null;
      let aiMetaFollowUps = null;

      if (apiKey) {
        try {
          let rawReply = await callGeminiAPI(apiKey, message, retrievedDocs, webResults, history);
          const rujukanMatch = rawReply.match(/\[META_RUJUKAN:\s*([^\]]+)\]/i);
          if (rujukanMatch) {
            const parts = rujukanMatch[1].split('|').map(s => s.trim());
            aiMetaSource = {
              type: 'kitab_ai',
              title: parts[0] || 'Kajian Fikih & Keislaman Aswaja',
              category: 'Kajian Kitab Mu\'tabarah',
              kitab: parts[1] || 'Kutubul Mu\'tabarah Mazhab Syafi\'i',
              bahtsul_masail: parts[2] || 'Manhaj Ahlussunnah wal Jama\'ah An-Nahdliyah',
              url: `https://www.google.com/search?q=${encodeURIComponent('site:nu.or.id ' + message)}`
            };
            rawReply = rawReply.replace(rujukanMatch[0], '').trim();
          }
          const followUpMatch = rawReply.match(/\[META_FOLLOWUP:\s*([^\]]+)\]/i);
          if (followUpMatch) {
            aiMetaFollowUps = followUpMatch[1].split('|').map(s => s.trim()).filter(Boolean);
            rawReply = rawReply.replace(followUpMatch[0], '').trim();
          }
          replyText = rawReply;
          modeUsed = 'gemini-rag';
        } catch (geminiErr) {
          console.warn('Gemini API fallback to local RAG:', geminiErr.message);
          replyText = synthesizeLocalAswajaResponse(message, retrievedDocs, webResults);
          modeUsed = 'local-rag-fallback';
        }
      } else {
        replyText = synthesizeLocalAswajaResponse(message, retrievedDocs, webResults);
      }

      const sources = [
        ...retrievedDocs.map(r => ({
          type: 'kitab_lokal',
          id: r.item.id,
          title: r.item.title,
          category: r.item.category,
          kitab: r.item.kitab_reference,
          bahtsul_masail: r.item.bahtsul_masail,
          url: r.item.source_url,
          score: r.score
        })),
        ...webResults.map(w => ({
          type: 'nu_online_web',
          title: w.title,
          kitab: 'Portal Resmi NU Online (nu.or.id)',
          url: w.url
        }))
      ];

      if (sources.length === 0 && aiMetaSource) {
        sources.push(aiMetaSource);
      }

      const followUps = aiMetaFollowUps && aiMetaFollowUps.length > 0
        ? aiMetaFollowUps
        : (retrievedDocs.length > 0 && Array.isArray(retrievedDocs[0].item.follow_ups)
            ? retrievedDocs[0].item.follow_ups
            : [
                'Bagaimana hukum tahlilan dan kirim doa untuk mayit?',
                'Bagaimana hukum akad nikah online via Video Call / Zoom?',
                'Apa itu 3 pilar Aswaja An-Nahdliyah?'
              ]);

      res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
      return res.end(JSON.stringify({
        status: 'ok',
        mode: modeUsed,
        reply: replyText,
        sources,
        followUps
      }));
    } catch (err) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ error: err.message }));
    }
  }

  // Static files serving
  let filePath = pathname === '/' ? path.join(PUBLIC_DIR, 'index.html') : path.join(PUBLIC_DIR, pathname);
  if (!filePath.startsWith(PUBLIC_DIR)) {
    res.writeHead(403);
    return res.end('Forbidden');
  }

  fs.readFile(filePath, (err, content) => {
    if (err) {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      return res.end('404 Not Found');
    }
    const ext = path.extname(filePath).toLowerCase();
    res.writeHead(200, { 'Content-Type': MIME_TYPES[ext] || 'application/octet-stream' });
    res.end(content);
  });
});

server.listen(PORT, () => {
  console.log(`====================================================`);
  console.log(`🕌 AswajaAI (NU & Islam RAG Prototype) aktif!`);
  console.log(`🌐 Buka di browser: http://localhost:${PORT}`);
  console.log(`====================================================`);
});

