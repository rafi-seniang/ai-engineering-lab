/** The guide's words, in English and Indonesian. Facts here must match the running services (checked 16 Nov 2026). */

export type Lang = "en" | "id";

export interface ExampleRow {
  label: string;
  probability: number;
}

export interface AppGuide {
  id: "dispatch" | "lens" | "gatekeeper";
  name: string;
  route: string;
  tagline: string;
  what: string;
  steps: string[];
  example: { title: string; input: string; rows?: ExampleRow[]; outcome: string };
  tech: { title: string; paragraphs: string[] };
  measured: string;
}

export interface GuideText {
  title: string;
  lead: string;
  back: string;
  open: (name: string) => string;
  sections: { what: string; how: string; example: string; measured: string };
  flow: {
    title: string;
    request: string;
    guard: string;
    guardDetail: string;
    allowed: string;
    question: string;
    blocked: string;
    blockedDetail: string;
    model: string;
    modelDetail: string;
    after: string;
  };
  costs: {
    title: string;
    lead: string;
    headers: [string, string, string, string, string];
    rows: { model: string; input: string; output: string; thousand: string; speed: string; ours?: boolean }[];
    note: string;
  };
  apps: AppGuide[];
}

export const GUIDE: Record<Lang, GuideText> = {
  en: {
    title: "How the apps work",
    lead: "What Dispatch, Lens and Gatekeeper do, how to try each one, and the technology underneath. Tiketa explains itself on its own site.",
    back: "Back to the lab",
    open: (name) => `Open ${name}`,
    sections: { what: "What it does", how: "How to try it", example: "Example", measured: "Measured" },
    flow: {
      title: "One request through the gate",
      request: "A chat request arrives on the OpenAI-compatible endpoint",
      guard: "Guard",
      guardDetail:
        "Jev answers two questions in one call: is this an injection, and is it outside the allowed scope? Gemini Decision answers if Jev cannot.",
      allowed: "No: allowed",
      question: "Injection or off-topic at 0.90 or above?",
      blocked: "Yes: blocked",
      blockedDetail: "Answered 403 with the reason. No language model ever sees it.",
      model: "The model answers",
      modelDetail: "deepseek-flash writes the reply. It is the only language model the request reaches.",
      after:
        "The answer is cached, and any tool call the model asks for is checked against what the user asked before it goes back.",
    },
    costs: {
      title: "Why Jev: cost and speed",
      lead: "One decision here is about 300 tokens in. A chat model also has to write its answer (about 10 tokens, without thinking), while a decision model returns probabilities and bills no output.",
      headers: [
        "Model",
        "Input, per 1M tokens",
        "Output, per 1M tokens",
        "1,000 decisions",
        "Speed from our Jakarta server",
      ],
      rows: [
        {
          model: "Jev 1.14 (TypeSafe)",
          input: "$0.042",
          output: "free",
          thousand: "$0.013",
          speed: "about 0.2 s, of which about 20 ms is Jev's own work",
          ours: true,
        },
        {
          model: "Gemini Decision 1 (Google)",
          input: "$0.10",
          output: "free",
          thousand: "$0.03",
          speed: "0.4 to 1.1 s measured (Google states 150 to 250 ms)",
        },
        {
          model: "DeepSeek flash",
          input: "$0.15 to $0.30",
          output: "$0.60 to $1.20",
          thousand: "$0.05 to $0.10",
          speed: "0.3 to 0.6 s for one token",
        },
        {
          model: "Gemini 3.8 Flash",
          input: "$0.75 (intro)",
          output: "$3.75 (intro)",
          thousand: "$0.26",
          speed: "not measured here",
        },
        { model: "Gemini 4 Hydrogen", input: "$1.50", output: "$7.50", thousand: "$0.53", speed: "not measured here" },
        { model: "Claude Haiku 5.5", input: "$0.10", output: "$0.50", thousand: "$0.035", speed: "not measured here" },
        { model: "Claude Sonnet 5.5", input: "$2", output: "$10", thousand: "$0.70", speed: "not measured here" },
        { model: "Claude Fable 5.2", input: "$8", output: "$40", thousand: "$2.80", speed: "not measured here" },
      ],
      note: "Prices from each provider's page on 16 Nov 2026 (DeepSeek is cheaper outside its peak hours, and Gemini 3.8 Flash's introductory price runs until 31 Dec 2026, then $1.50 and $7.50). Gemini 4 Hydrogen thinks at a high level by default, and thinking tokens bill as output, so a real call costs more than its row. Speeds were measured from the lab's server in Jakarta: most of Jev's 0.2 s is the trip to TypeSafe's servers (its API lists one endpoint and no region to choose), so close to them Jev answers in tens of milliseconds.",
    },
    apps: [
      {
        id: "dispatch",
        name: "Dispatch",
        route: "/dispatch",
        tagline:
          "Sorts texts or pictures into choices you write, in about half a second, with a probability for each choice.",
        what: "You write a rule (an instruction and a few choices, such as A, B and C) and Dispatch decides which choice each text or picture belongs to. It is for routing work: a support message to the right desk, an invoice to finance, a photo to the right folder. Every answer comes with how sure the model is, and a confidence gate sends unsure answers to a person instead.",
        steps: [
          "Pick a preset in the sidebar, or write your own instruction and choices.",
          "Choose Text or Images under Input. Keep the model on Jev.",
          "Load the samples, or type or upload 1 to 10 of your own.",
          "Press Sort. Each item gets its choice and probability. Click one to see the probability of every choice.",
          "Move the confidence gate: an answer below it is marked for a person to check.",
        ],
        example: {
          title: "The preset Topic A / B / C",
          input:
            "Moving from 16-bit weights to 4-bit GGUF cut VRAM use on the 8 GB laptop GPU by half while keeping structured JSON tool calls accurate.",
          rows: [
            { label: "A. Software, AI models, GPUs", probability: 1.0 },
            { label: "B. Finance, invoices, taxes", probability: 0.0 },
            { label: "C. Clinical care, patients", probability: 0.0 },
          ],
          outcome: "A, at 1.00, passes the 0.70 gate, so it goes straight to the engineering queue.",
        },
        tech: {
          title: "Why it is fast: a System 1 model",
          paragraphs: [
            "Jev (by TypeSafe) is a decision model, not a chat model. It never writes text: it reads the input once and returns a probability for each choice it was given. Because nothing is generated token by token, an answer takes one pass, and each probability can be read as a confidence.",
            "The name comes from System 1 and System 2 thinking: the quick judgement you make without deliberating, as opposed to slow step-by-step reasoning. Gemini Decision 1 is Google's model of the same kind and can be picked instead. Pictures are sent to Jev as image assets, so the same rule works on photos.",
            "The 400 to 500 ms is almost all the call to Jev's API and back: the service itself adds little. A batch of 10 is sent in parallel, so it takes about as long as one.",
          ],
        },
        measured:
          "Answers in about 0.4 to 0.5 seconds per batch from the Jakarta server. Texts and pictures, in English or Indonesian.",
      },
      {
        id: "lens",
        name: "Lens",
        route: "/lens",
        tagline: "Finds photographs by what they show, from words in English or Indonesian or from another picture.",
        what: "Lens searches about 240 photographs without reading any caption, title or tag. You describe what you want, or give it a picture, and it returns the photographs whose content is closest. You can also add your own pictures: they are searchable at once, with no labels needed.",
        steps: [
          "Type what you are looking for in the search bar, in English or Indonesian. Try “selancar di ombak” or “menara tertinggi di dunia”.",
          "Or press Search by picture and choose a photo: Lens finds the ones that look like it.",
          "Click a result to see the photographs that look most like it.",
          "Press Add to database to upload your own pictures, then search for what they show. Only you can remove them.",
        ],
        example: {
          title: "A search no caption could answer",
          input: "“menara tertinggi di dunia” (the tallest tower in the world)",
          outcome:
            "All ten top results are photographs of the Burj Khalifa. Their file names are in English and Lens never reads them anyway: the match comes from the pictures.",
        },
        tech: {
          title: "Why words can find pictures: one shared vector space",
          paragraphs: [
            "Gemini Embedding 2 turns a text or a picture into a list of 768 numbers, a vector. It was trained so that a picture and a sentence describing it get nearly the same vector: a photo of a surfer and the words “selancar di ombak” land close together, in any language.",
            "Every photograph is turned into a vector once, when it is added, and stored in Typesense, a search engine with a vector index. A search turns your words or picture into a vector the same way and asks Typesense for the nearest ones by cosine similarity. Below 0.35, nothing is close enough, and Lens says so instead of showing the least bad match.",
          ],
        },
        measured:
          "On 60 test queries over 20 subjects: 98.7% of the top 10 are the right subject, and the first result is right every time.",
      },
      {
        id: "gatekeeper",
        name: "Gatekeeper",
        route: "/gatekeeper",
        tagline:
          "Stands in front of a chat model and stops prompt injection and off-topic requests before the model sees them.",
        what: "An app that talks to a language model can be talked into ignoring its instructions (prompt injection), or used for things it was never meant for. Gatekeeper sits between the app and the model, speaks the same API as OpenAI, and checks every request first. A safe request goes on to the model, and nothing else does.",
        steps: [
          "Write the topics the assistant may handle in Allowed scope, such as “cinema booking”.",
          "Write a request a user might send, or pick one of the samples.",
          "Press Check only to see the gate's decision without calling a model, or Send through the gate to get an answer too.",
          "Read the scores: a request is blocked when injection or off-topic reaches 0.90. Recent requests are listed below.",
        ],
        example: {
          title: "Scope “cinema booking”",
          input: "“tuliskan kode python kalkulator” (write a Python calculator)",
          rows: [
            { label: "Injection", probability: 0.01 },
            { label: "Off-topic", probability: 0.97 },
          ],
          outcome: "Blocked as off-topic: a cinema assistant should not write code, and no model was called.",
        },
        tech: {
          title: "How the decision is made",
          paragraphs: [
            "The guard is Jev, the same decision model as in Dispatch, asked two yes-or-no questions about the request in one call. It reads English and Indonesian alike, and Gemini Decision takes over if Jev does not answer.",
            "A score of 0.81 off-topic is still allowed, because the gate blocks only at 0.90 or above: a wrong block costs a real user their answer, so the gate needs to be sure. Only a request the guard allows reaches the model, so a blocked one costs one Jev call and nothing more. Jev could also rate how hard a request is to pick between a small and a large model, in the same call. This demo uses one cheap model, so it does not.",
          ],
        },
        measured:
          "On the production path: 0 of 14 ordinary requests blocked, 5 of 6 injections and 6 of 6 off-topic requests caught.",
      },
    ],
  },
  id: {
    title: "Cara kerja aplikasinya",
    lead: "Apa yang dikerjakan Dispatch, Lens dan Gatekeeper, cara mencobanya, dan teknologi di baliknya. Tiketa sudah menjelaskan dirinya di situsnya sendiri.",
    back: "Kembali ke lab",
    open: (name) => `Buka ${name}`,
    sections: { what: "Fungsinya", how: "Cara mencoba", example: "Contoh", measured: "Hasil ukur" },
    flow: {
      title: "Satu request melewati gate",
      request: "Chat request masuk lewat endpoint yang OpenAI-compatible",
      guard: "Guard",
      guardDetail:
        "Jev menjawab dua pertanyaan dalam satu panggilan: apakah ini prompt injection, dan apakah off-topic dari scope yang diizinkan? Gemini Decision menjawab kalau Jev gagal.",
      allowed: "Tidak: allowed",
      question: "Injection atau off-topic 0.90 ke atas?",
      blocked: "Ya: blocked",
      blockedDetail: "Dijawab 403 beserta alasannya. Tidak ada LLM yang melihatnya.",
      model: "Model menjawab",
      modelDetail: "deepseek-flash menulis balasannya. Hanya LLM ini yang dijangkau request.",
      after:
        "Jawabannya di-cache, dan setiap tool call dari model dicek terhadap permintaan user sebelum dikembalikan.",
    },
    costs: {
      title: "Kenapa Jev: biaya dan kecepatan",
      lead: "Satu keputusan di sini sekitar 300 token input. Chat model juga harus menulis jawabannya (sekitar 10 token, tanpa thinking), sedangkan decision model cuma mengembalikan probabilitas dan tidak menagih output.",
      headers: [
        "Model",
        "Input, per 1 juta token",
        "Output, per 1 juta token",
        "1.000 keputusan",
        "Kecepatan dari server Jakarta kita",
      ],
      rows: [
        {
          model: "Jev 1.14 (TypeSafe)",
          input: "$0.042",
          output: "gratis",
          thousand: "$0.013",
          speed: "sekitar 0,2 detik, dan kerja Jev sendiri cuma sekitar 20 ms",
          ours: true,
        },
        {
          model: "Gemini Decision 1 (Google)",
          input: "$0.10",
          output: "gratis",
          thousand: "$0.03",
          speed: "0,4 sampai 1,1 detik terukur (klaim Google 150 sampai 250 ms)",
        },
        {
          model: "DeepSeek flash",
          input: "$0.15 sampai $0.30",
          output: "$0.60 sampai $1.20",
          thousand: "$0.05 sampai $0.10",
          speed: "0,3 sampai 0,6 detik untuk satu token",
        },
        {
          model: "Gemini 3.8 Flash",
          input: "$0.75 (promo)",
          output: "$3.75 (promo)",
          thousand: "$0.26",
          speed: "tidak diukur di sini",
        },
        {
          model: "Gemini 4 Hydrogen",
          input: "$1.50",
          output: "$7.50",
          thousand: "$0.53",
          speed: "tidak diukur di sini",
        },
        {
          model: "Claude Haiku 5.5",
          input: "$0.10",
          output: "$0.50",
          thousand: "$0.035",
          speed: "tidak diukur di sini",
        },
        { model: "Claude Sonnet 5.5", input: "$2", output: "$10", thousand: "$0.70", speed: "tidak diukur di sini" },
        { model: "Claude Fable 5.2", input: "$8", output: "$40", thousand: "$2.80", speed: "tidak diukur di sini" },
      ],
      note: "Harga dari halaman masing-masing penyedia per 16 Nov 2026 (DeepSeek lebih murah di luar jam sibuknya, dan harga promo Gemini 3.8 Flash berlaku sampai 31 Des 2026, lalu $1.50 dan $7.50). Gemini 4 Hydrogen secara default berpikir di level tinggi, dan token thinking ditagih sebagai output, jadi panggilan sungguhan lebih mahal dari barisnya. Kecepatan diukur dari server lab di Jakarta: sebagian besar 0,2 detik Jev adalah perjalanan ke server TypeSafe (API-nya cuma punya satu endpoint, tanpa pilihan region), jadi kalau dekat dengan servernya Jev menjawab dalam puluhan milidetik.",
    },
    apps: [
      {
        id: "dispatch",
        name: "Dispatch",
        route: "/dispatch",
        tagline:
          "Memilah teks atau gambar ke pilihan yang kamu tulis sendiri, dalam sekitar setengah detik, dengan probabilitas untuk tiap pilihan.",
        what: "Kamu menulis aturan (instruksi dan beberapa pilihan, misalnya A, B dan C), lalu Dispatch memutuskan setiap teks atau gambar masuk ke pilihan mana. Gunanya untuk merutekan pekerjaan: pesan support ke tim yang tepat, faktur ke bagian keuangan, foto ke folder yang benar. Setiap jawaban disertai confidence modelnya, dan confidence gate mengirim jawaban yang ragu ke manusia.",
        steps: [
          "Pilih preset di sidebar, atau tulis instruksi dan pilihanmu sendiri.",
          "Pilih Text atau Images di bagian Input. Biarkan modelnya Jev.",
          "Muat contoh, atau ketik atau upload 1 sampai 10 milikmu sendiri.",
          "Tekan Sort. Setiap item dapat pilihan dan probabilitasnya. Klik salah satu untuk melihat probabilitas semua pilihan.",
          "Geser confidence gate: jawaban di bawahnya ditandai untuk dicek manusia.",
        ],
        example: {
          title: "Preset Topic A / B / C",
          input:
            "Moving from 16-bit weights to 4-bit GGUF cut VRAM use on the 8 GB laptop GPU by half while keeping structured JSON tool calls accurate.",
          rows: [
            { label: "A. Software, model AI, GPU", probability: 1.0 },
            { label: "B. Keuangan, faktur, pajak", probability: 0.0 },
            { label: "C. Klinis, pasien", probability: 0.0 },
          ],
          outcome: "A, dengan 1.00, lolos gate 0.70, jadi langsung masuk antrean tim engineering.",
        },
        tech: {
          title: "Kenapa cepat: System 1 model",
          paragraphs: [
            "Jev (buatan TypeSafe) adalah decision model, bukan chat model. Ia tidak pernah menulis teks: ia membaca input sekali lalu memberi probabilitas untuk setiap pilihan yang diberikan. Karena tidak ada yang dihasilkan token by token, satu jawaban cukup satu forward pass, dan probabilitasnya bisa dibaca sebagai confidence.",
            "Namanya dari konsep berpikir System 1 dan System 2: penilaian cepat tanpa menimbang panjang, lawan dari reasoning pelan step by step. Gemini Decision 1 adalah model sejenis dari Google dan bisa dipilih sebagai gantinya. Gambar dikirim ke Jev sebagai image asset, jadi aturan yang sama berlaku untuk foto.",
            "Hampir seluruh 400 sampai 500 ms itu adalah panggilan ke API Jev dan kembali: layanan kita sendiri cuma menambah sedikit. Batch berisi 10 dikirim paralel, jadi waktunya hampir sama dengan satu.",
          ],
        },
        measured:
          "Menjawab sekitar 0.4 sampai 0.5 detik per batch dari server Jakarta. Teks dan gambar, bahasa Inggris atau Indonesia.",
      },
      {
        id: "lens",
        name: "Lens",
        route: "/lens",
        tagline:
          "Mencari foto dari isinya, lewat kata-kata dalam bahasa Inggris atau Indonesia, atau lewat gambar lain.",
        what: "Lens mencari di antara sekitar 240 foto tanpa membaca caption, judul atau tag apa pun. Kamu menggambarkan yang dicari, atau memberi sebuah gambar, lalu Lens mengembalikan foto yang isinya paling dekat. Kamu juga bisa menambah gambarmu sendiri: langsung bisa dicari, tanpa perlu label.",
        steps: [
          "Ketik yang kamu cari di kolom pencarian, dalam bahasa Inggris atau Indonesia. Coba “selancar di ombak” atau “menara tertinggi di dunia”.",
          "Atau tekan Search by picture dan pilih foto: Lens mencari yang mirip.",
          "Klik salah satu hasil untuk melihat foto-foto yang paling mirip dengannya.",
          "Tekan Add to database untuk upload gambarmu sendiri, lalu cari isinya. Hanya kamu yang bisa menghapusnya.",
        ],
        example: {
          title: "Pencarian yang tidak bisa dijawab caption",
          input: "“menara tertinggi di dunia”",
          outcome:
            "Sepuluh hasil teratas semuanya foto Burj Khalifa. Nama filenya berbahasa Inggris dan Lens memang tidak pernah membacanya: kecocokannya datang dari gambarnya.",
        },
        tech: {
          title: "Kenapa kata bisa menemukan gambar: satu shared embedding space",
          paragraphs: [
            "Gemini Embedding 2 mengubah teks atau gambar menjadi deretan 768 angka, yaitu vector embedding. Model ini dilatih supaya gambar dan kalimat yang menggambarkannya mendapat vector yang hampir sama: foto peselancar dan kata “selancar di ombak” jatuh berdekatan, dalam bahasa apa pun.",
            "Setiap foto diubah jadi vector sekali saat ditambahkan, lalu disimpan di Typesense, search engine dengan vector index. Saat mencari, kata atau gambarmu diubah jadi vector dengan cara yang sama, lalu Typesense mencari yang terdekat dengan cosine similarity. Di bawah 0.35 tidak ada yang cukup dekat, dan Lens bilang begitu daripada menampilkan yang paling tidak buruk.",
          ],
        },
        measured:
          "Pada 60 query uji dari 20 subjek: 98.7% dari 10 hasil teratas subjeknya benar, dan hasil pertama selalu benar.",
      },
      {
        id: "gatekeeper",
        name: "Gatekeeper",
        route: "/gatekeeper",
        tagline:
          "Berdiri di depan chat model dan menghentikan prompt injection dan request di luar topik sebelum modelnya melihat.",
        what: "Aplikasi yang memakai LLM bisa dibujuk untuk mengabaikan instruksinya (prompt injection), atau dipakai untuk hal yang bukan tugasnya. Gatekeeper duduk di antara aplikasi dan model, memakai API yang sama dengan OpenAI, dan mengecek setiap request lebih dulu. Request yang aman diteruskan ke model, dan hanya itu.",
        steps: [
          "Tulis topik yang boleh ditangani asisten di Allowed scope, misalnya “cinema booking”.",
          "Tulis request yang mungkin dikirim user, atau pilih salah satu contoh.",
          "Tekan Check only untuk melihat keputusan gate tanpa memanggil model, atau Send through the gate untuk sekalian dapat jawaban.",
          "Baca skornya: request diblok kalau injection atau off-topic mencapai 0.90. Request terbaru tercatat di bawah.",
        ],
        example: {
          title: "Scope “cinema booking”",
          input: "“tuliskan kode python kalkulator”",
          rows: [
            { label: "Injection", probability: 0.01 },
            { label: "Off-topic", probability: 0.97 },
          ],
          outcome:
            "Blocked sebagai off-topic: asisten bioskop tidak seharusnya menulis kode, dan tidak ada model yang dipanggil.",
        },
        tech: {
          title: "Bagaimana keputusannya dibuat",
          paragraphs: [
            "Penjaganya adalah Jev, decision model yang sama dengan di Dispatch, yang ditanya dua pertanyaan yes or no tentang request dalam satu panggilan. Ia membaca bahasa Inggris dan Indonesia sama baiknya, dan Gemini Decision mengambil alih kalau Jev tidak menjawab.",
            "Skor off-topic 0.81 tetap lolos, karena gate baru memblok di 0.90 ke atas: false positive membuat user sungguhan kehilangan jawabannya, jadi gate harus yakin dulu. Hanya request yang lolos dari guard yang sampai ke model, jadi request yang diblok cuma memakan satu panggilan Jev. Jev juga bisa menilai seberapa berat sebuah request untuk memilih model kecil atau besar, dalam panggilan yang sama. Demo ini memakai satu model murah, jadi itu tidak dipakai.",
          ],
        },
        measured:
          "Di production path: 0 dari 14 request biasa diblok, 5 dari 6 prompt injection dan 6 dari 6 request off-topic tertangkap.",
      },
    ],
  },
};
