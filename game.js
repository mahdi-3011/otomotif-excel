/* ═══════════════════════════════════════════════════════════════
   EXCEL FORMULA CHALLENGE – OTOMOTIF EDITION
   game.js – Complete Game Engine
═══════════════════════════════════════════════════════════════ */

// ─── STATE ──────────────────────────────────────────────────────
let player = {};
let gameState = {};
let timerInterval = null;
let currentLevel = 1;

// ─── SOUND ENGINE (Web Audio API) ───────────────────────────────
const AudioCtx = window.AudioContext || window.webkitAudioContext;
let audioCtx;

function getAudioCtx() {
  if (!audioCtx) audioCtx = new AudioCtx();
  return audioCtx;
}

function playSound(type) {
  try {
    const ctx = getAudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);

    const sounds = {
      correct: { type:'sine', freq:[523,659,784], dur:0.15 },
      wrong:   { type:'sawtooth', freq:[220,180], dur:0.2 },
      click:   { type:'sine', freq:[440], dur:0.05 },
      tick:    { type:'sine', freq:[880], dur:0.03 },
      combo:   { type:'sine', freq:[523,659,784,1047], dur:0.1 },
      win:     { type:'sine', freq:[523,659,784,1047,1319], dur:0.15 },
    };

    const s = sounds[type] || sounds.click;
    osc.type = s.type;
    gain.gain.setValueAtTime(0.15, ctx.currentTime);

    s.freq.forEach((f, i) => {
      setTimeout(() => {
        try { osc.frequency.setValueAtTime(f, ctx.currentTime); } catch(e){}
      }, i * s.dur * 1000);
    });

    osc.start();
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + s.freq.length * s.dur + 0.1);
    osc.stop(ctx.currentTime + s.freq.length * s.dur + 0.15);
  } catch(e) {}
}

// ─── PARTICLES ──────────────────────────────────────────────────
(function initParticles() {
  const canvas = document.getElementById('particles-canvas');
  const ctx = canvas.getContext('2d');
  let W, H, pts = [];

  function resize() {
    W = canvas.width = window.innerWidth;
    H = canvas.height = window.innerHeight;
  }
  resize();
  window.addEventListener('resize', resize);

  for (let i = 0; i < 60; i++) {
    pts.push({
      x: Math.random() * 2000,
      y: Math.random() * 2000,
      r: Math.random() * 1.5 + 0.3,
      vx: (Math.random() - 0.5) * 0.4,
      vy: (Math.random() - 0.5) * 0.4,
      alpha: Math.random() * 0.5 + 0.1
    });
  }

  function draw() {
    ctx.clearRect(0, 0, W, H);
    pts.forEach(p => {
      p.x += p.vx; p.y += p.vy;
      if (p.x < 0) p.x = W; if (p.x > W) p.x = 0;
      if (p.y < 0) p.y = H; if (p.y > H) p.y = 0;
      ctx.beginPath();
      ctx.arc(p.x % W, p.y % H, p.r, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(30,127,255,${p.alpha})`;
      ctx.fill();
    });

    // Draw connections
    pts.forEach((p, i) => {
      pts.slice(i + 1).forEach(q => {
        const dx = (p.x % W) - (q.x % W), dy = (p.y % H) - (q.y % H);
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < 120) {
          ctx.beginPath();
          ctx.moveTo(p.x % W, p.y % H);
          ctx.lineTo(q.x % W, q.y % H);
          ctx.strokeStyle = `rgba(30,127,255,${0.05 * (1 - dist / 120)})`;
          ctx.stroke();
        }
      });
    });
    requestAnimationFrame(draw);
  }
  draw();
})();

// ─── SCREEN NAVIGATION ──────────────────────────────────────────
function showScreen(id) {
  playSound('click');
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  document.getElementById(id).classList.add('active');

  if (id === 'screen-menu') updateMenuUI();
  if (id === 'screen-profile') updateProfileUI();
  if (id === 'screen-leaderboard') updateLeaderboard('all');
}

// ─── LOCAL STORAGE HELPERS ──────────────────────────────────────
function saveData(key, val) {
  try { localStorage.setItem('efc_' + key, JSON.stringify(val)); } catch(e){}
}
function loadData(key, def) {
  try {
    const v = localStorage.getItem('efc_' + key);
    return v ? JSON.parse(v) : def;
  } catch(e) { return def; }
}

// ─── LOGIN ──────────────────────────────────────────────────────
function doLogin() {
  const name = document.getElementById('login-name').value.trim();
  const nim  = document.getElementById('login-nim').value.trim();
  const prodi = document.getElementById('login-prodi').value;

  if (!name) { shakeInput('login-name'); return; }
  if (!nim)  { shakeInput('login-nim'); return; }

  player = { name, nim, prodi };
  saveData('player', player);

  playSound('win');
  showScreen('screen-menu');
}

function shakeInput(id) {
  const el = document.getElementById(id);
  el.style.borderColor = 'var(--accent-red)';
  el.style.animation = 'shake 0.4s ease';
  setTimeout(() => { el.style.borderColor = ''; el.style.animation = ''; }, 500);
}

// Add shake keyframe dynamically
const shakeStyle = document.createElement('style');
shakeStyle.textContent = '@keyframes shake { 0%,100%{transform:translateX(0)} 25%{transform:translateX(-6px)} 75%{transform:translateX(6px)} }';
document.head.appendChild(shakeStyle);

// ─── MENU UI ────────────────────────────────────────────────────
function updateMenuUI() {
  const p = loadData('player', player);
  if (p.name) {
    document.getElementById('menu-player-name').textContent = p.name;
    document.getElementById('menu-avatar').textContent = p.name[0].toUpperCase();
    player = p;
  }

  const stats = loadData('stats', { games: 0, correct: 0, bestScore: 0, badges: 0 });
  const history = loadData('history', []);
  const bestScore = history.length ? Math.max(...history.map(h => h.score)) : 0;

  document.getElementById('menu-total-score').textContent = bestScore;
  document.getElementById('stat-games').textContent = stats.games;
  document.getElementById('stat-correct').textContent = stats.correct;
  document.getElementById('stat-best').textContent = bestScore;
  document.getElementById('stat-badges').textContent = loadData('badges', []).length;
}

// ─── QUESTION DATABASE ──────────────────────────────────────────
const QUESTIONS = {
  1: [ // LEVEL 1 – SUM, AVERAGE
    {
      id: 'l1q1',
      text: 'Bengkel "Auto Prima" menerima 5 kendaraan untuk servis bulan ini. Gunakan fungsi SUM untuk menghitung TOTAL BIAYA SERVIS dari semua kendaraan (cell B8).',
      context: 'Pilih formula yang benar untuk cell B8',
      formula: 'sum',
      timeLimit: 60,
      tableData: {
        headers: ['No', 'Kendaraan', 'Biaya Servis (Rp)'],
        rows: [
          ['1', 'Toyota Avanza', '850.000'],
          ['2', 'Honda Vario 150', '320.000'],
          ['3', 'Mitsubishi Xpander', '1.200.000'],
          ['4', 'Yamaha NMAX', '280.000'],
          ['5', 'Daihatsu Sigra', '750.000'],
          ['', 'TOTAL', '=SUM(B2:B6)'],
        ],
        resultRow: 5,
        resultCol: 2,
        highlight: [5, 2]
      },
      choices: [
        '=SUM(B2:B6)',
        '=TOTAL(B2:B6)',
        '=SUM(B1:B5)',
        '=ADD(B2,B3,B4,B5,B6)'
      ],
      correct: 0,
      explanation: 'Formula <code>=SUM(B2:B6)</code> menjumlahkan semua nilai dari cell B2 hingga B6. SUM adalah fungsi penjumlahan paling dasar di Excel. Range B2:B6 mencakup 5 biaya servis kendaraan. Hasilnya: Rp 3.400.000',
      hint: { formula: '=SUM(B2:B6)', text: 'Gunakan =SUM() dengan range dari baris pertama data hingga baris terakhir data. Data biaya ada di kolom B baris 2-6.' }
    },
    {
      id: 'l1q2',
      text: 'Hitung RATA-RATA nilai praktik 6 mahasiswa Pendidikan Otomotif menggunakan fungsi AVERAGE (cell B9).',
      context: 'Pilih formula yang benar untuk cell B9',
      formula: 'average',
      timeLimit: 60,
      tableData: {
        headers: ['No', 'Nama Mahasiswa', 'Nilai Praktik'],
        rows: [
          ['1', 'Ahmad Fauzi', '85'],
          ['2', 'Budi Santoso', '78'],
          ['3', 'Citra Lestari', '92'],
          ['4', 'Deni Kurniawan', '67'],
          ['5', 'Eka Putri', '88'],
          ['6', 'Fajar Nugroho', '73'],
          ['', 'RATA-RATA', '=AVERAGE(C2:C7)'],
        ],
        resultRow: 6,
        resultCol: 2,
        highlight: [6, 2]
      },
      choices: [
        '=AVERAGE(C2:C7)',
        '=AVG(C2:C7)',
        '=AVERAGE(B2:B7)',
        '=SUM(C2:C7)/7'
      ],
      correct: 0,
      explanation: 'Formula <code>=AVERAGE(C2:C7)</code> menghitung rata-rata dari nilai C2 hingga C7. AVERAGE = total semua nilai ÷ jumlah data. Hasilnya: (85+78+92+67+88+73)/6 = 80.5',
      hint: { formula: '=AVERAGE(C2:C7)', text: 'Gunakan =AVERAGE() dengan range kolom C (nilai praktik). Data nilai ada di kolom C baris 2-7.' }
    },
    {
      id: 'l1q3',
      text: 'Hitung TOTAL PENDAPATAN bengkel dari semua jenis layanan bulan April menggunakan SUM (cell C7).',
      context: 'Pilih formula yang benar untuk cell C7',
      formula: 'sum',
      timeLimit: 60,
      tableData: {
        headers: ['No', 'Jenis Layanan', 'Pendapatan (Rp)'],
        rows: [
          ['1', 'Servis Rutin', '4.500.000'],
          ['2', 'Ganti Oli', '2.100.000'],
          ['3', 'Tune Up', '3.800.000'],
          ['4', 'Ganti Sparepart', '6.200.000'],
          ['', 'TOTAL APRIL', '=SUM(C2:C5)'],
        ],
        resultRow: 4,
        resultCol: 2,
        highlight: [4, 2]
      },
      choices: [
        '=SUM(C2:C5)',
        '=SUM(C1:C5)',
        '=TOTAL(C2:C5)',
        '=SUM(C2,C3,C4,C5)'
      ],
      correct: 0,
      explanation: 'Formula <code>=SUM(C2:C5)</code> menjumlahkan pendapatan dari baris 2 hingga 5. Hasilnya: Rp 16.600.000. Penggunaan range lebih efisien daripada menuliskan tiap cell.',
      hint: { formula: '=SUM(C2:C5)', text: 'Data pendapatan ada di kolom C baris 2-5. Gunakan SUM dengan range yang tepat.' }
    },
    {
      id: 'l1q4',
      text: 'Hitung rata-rata WAKTU SERVIS (dalam jam) kendaraan di bengkel menggunakan AVERAGE (cell C8).',
      context: 'Pilih formula untuk menghitung rata-rata waktu servis',
      formula: 'average',
      timeLimit: 60,
      tableData: {
        headers: ['No', 'Jenis Servis', 'Waktu (Jam)'],
        rows: [
          ['1', 'Servis Ringan', '1.5'],
          ['2', 'Tune Up Lengkap', '3.0'],
          ['3', 'Servis Transmisi', '4.5'],
          ['4', 'Overhaul Mesin', '8.0'],
          ['5', 'Ganti Kampas Rem', '1.0'],
          ['6', 'Service AC', '2.5'],
          ['', 'RATA-RATA', '=AVERAGE(C2:C7)'],
        ],
        resultRow: 6,
        resultCol: 2,
        highlight: [6, 2]
      },
      choices: [
        '=AVERAGE(C2:C7)',
        '=AVERAGE(C2:C8)',
        '=AVG(C2:C7)',
        '=SUM(C2:C7)/6'
      ],
      correct: 0,
      explanation: 'Formula <code>=AVERAGE(C2:C7)</code> menghitung rata-rata waktu servis. Hasilnya: (1.5+3.0+4.5+8.0+1.0+2.5)/6 = 3.42 jam. AVERAGE lebih efisien daripada SUM/COUNT manual.',
      hint: { formula: '=AVERAGE(C2:C7)', text: 'Data waktu ada di kolom C baris 2-7. AVERAGE menghitung otomatis rata-rata semua nilai.' }
    },
    {
      id: 'l1q5',
      text: 'Bengkel perlu mengetahui TOTAL dan RATA-RATA stok sparepart. Hitung RATA-RATA stok (cell B9).',
      context: 'Hitung rata-rata jumlah stok sparepart',
      formula: 'average',
      timeLimit: 60,
      tableData: {
        headers: ['No', 'Nama Sparepart', 'Stok (pcs)'],
        rows: [
          ['1', 'Filter Oli', '45'],
          ['2', 'Kampas Rem Depan', '30'],
          ['3', 'Busi NGK', '120'],
          ['4', 'Aki GS Astra', '15'],
          ['5', 'Belt Timing', '22'],
          ['', 'TOTAL STOK', '232'],
          ['', 'RATA-RATA', '=AVERAGE(C2:C6)'],
        ],
        resultRow: 6,
        resultCol: 2,
        highlight: [6, 2]
      },
      choices: [
        '=AVERAGE(C2:C6)',
        '=AVERAGE(C2:C7)',
        '=AVG(C2:C7)',
        '=C7/5'
      ],
      correct: 0,
      explanation: 'Formula <code>=AVERAGE(C2:C6)</code> menghitung rata-rata stok 5 jenis sparepart. Hasilnya: (45+30+120+15+22)/5 = 46.4 pcs. Penting: jangan ikutkan baris TOTAL dalam range AVERAGE!',
      hint: { formula: '=AVERAGE(C2:C6)', text: 'Hitung rata-rata data stok di baris 2-6. Jangan ikutkan baris total!' }
    },
  ],

  2: [ // LEVEL 2 – IF, COUNTIF
    {
      id: 'l2q1',
      text: 'Tentukan STATUS KELULUSAN mahasiswa: jika nilai ≥ 75 maka "LULUS", jika tidak maka "TIDAK LULUS". Buat formula untuk cell D2.',
      context: 'Nilai minimum kelulusan = 75',
      formula: 'if',
      timeLimit: 45,
      tableData: {
        headers: ['No', 'Nama', 'Nilai Ujian', 'Status'],
        rows: [
          ['1', 'Ahmad Fauzi', '82', '=IF(C2>=75,"LULUS","TIDAK LULUS")'],
          ['2', 'Budi Santoso', '65', 'TIDAK LULUS'],
          ['3', 'Citra Lestari', '90', 'LULUS'],
          ['4', 'Deni Kurniawan', '73', 'TIDAK LULUS'],
          ['5', 'Eka Putri', '75', 'LULUS'],
        ],
        resultRow: 0,
        resultCol: 3,
        highlight: [0, 3]
      },
      choices: [
        '=IF(C2>=75,"LULUS","TIDAK LULUS")',
        '=IF(C2>75,"LULUS","TIDAK LULUS")',
        '=IF(C2>=75,LULUS,TIDAK LULUS)',
        '=IFLULUS(C2,75)'
      ],
      correct: 0,
      explanation: 'Formula <code>=IF(C2>=75,"LULUS","TIDAK LULUS")</code> menggunakan operator >= (lebih besar atau sama dengan). Nilai 75 tepat akan menghasilkan LULUS. Teks dalam IF harus diapit tanda kutip ganda ("").',
      hint: { formula: '=IF(C2>=75,"LULUS","TIDAK LULUS")', text: 'Sintaks IF: =IF(kondisi, jika_benar, jika_salah). Kondisi: C2>=75. Hasil benar: "LULUS". Hasil salah: "TIDAK LULUS".' }
    },
    {
      id: 'l2q2',
      text: 'Hitung jumlah kendaraan yang berstatus "SERVIS" dari daftar kendaraan di bengkel (cell B12) menggunakan COUNTIF.',
      context: 'Hitung kendaraan yang SEDANG dalam proses servis',
      formula: 'countif',
      timeLimit: 45,
      tableData: {
        headers: ['No', 'Kendaraan', 'Status'],
        rows: [
          ['1', 'Toyota Avanza', 'SELESAI'],
          ['2', 'Honda Beat', 'SERVIS'],
          ['3', 'Yamaha Mio', 'SERVIS'],
          ['4', 'Suzuki Ertiga', 'MENUNGGU'],
          ['5', 'Daihatsu Terios', 'SERVIS'],
          ['6', 'Mitsubishi Pajero', 'SELESAI'],
          ['7', 'Honda CBR', 'SERVIS'],
          ['', 'Jumlah SERVIS', '=COUNTIF(C2:C8,"SERVIS")'],
        ],
        resultRow: 7,
        resultCol: 2,
        highlight: [7, 2]
      },
      choices: [
        '=COUNTIF(C2:C8,"SERVIS")',
        '=COUNT(C2:C8,"SERVIS")',
        '=COUNTIF(C2:C8,SERVIS)',
        '=SUMIF(C2:C8,"SERVIS")'
      ],
      correct: 0,
      explanation: 'Formula <code>=COUNTIF(C2:C8,"SERVIS")</code> menghitung sel yang berisi teks "SERVIS". Hasilnya: 4 kendaraan. COUNTIF membutuhkan range dan kriteria. Kriteria teks harus diapit tanda kutip.',
      hint: { formula: '=COUNTIF(C2:C8,"SERVIS")', text: 'Sintaks COUNTIF: =COUNTIF(range, kriteria). Range: C2:C8. Kriteria: "SERVIS" (dengan tanda kutip karena teks).' }
    },
    {
      id: 'l2q3',
      text: 'Tentukan KATEGORI KENDARAAN: jika biaya servis > 1.000.000 maka "MAHAL", jika tidak maka "TERJANGKAU" (cell D2).',
      context: 'Biaya > 1.000.000 = MAHAL, selainnya = TERJANGKAU',
      formula: 'if',
      timeLimit: 45,
      tableData: {
        headers: ['No', 'Kendaraan', 'Biaya', 'Kategori'],
        rows: [
          ['1', 'Toyota Alphard', '3.500.000', '=IF(C2>1000000,"MAHAL","TERJANGKAU")'],
          ['2', 'Honda Beat', '250.000', 'TERJANGKAU'],
          ['3', 'Mitsubishi Pajero', '2.100.000', 'MAHAL'],
          ['4', 'Yamaha Vixion', '450.000', 'TERJANGKAU'],
          ['5', 'Mercedes C300', '5.000.000', 'MAHAL'],
        ],
        resultRow: 0,
        resultCol: 3,
        highlight: [0, 3]
      },
      choices: [
        '=IF(C2>1000000,"MAHAL","TERJANGKAU")',
        '=IF(C2>=1000000,"MAHAL","TERJANGKAU")',
        '=IF(C2>1000000,MAHAL,TERJANGKAU)',
        '=IF(C2,"MAHAL","TERJANGKAU",1000000)'
      ],
      correct: 0,
      explanation: 'Formula <code>=IF(C2>1000000,"MAHAL","TERJANGKAU")</code> menggunakan operator > (lebih dari). Biaya Alphard 3.500.000 > 1.000.000 = "MAHAL". Catatan: angka dalam kondisi IF tidak menggunakan tanda kutip.',
      hint: { formula: '=IF(C2>1000000,"MAHAL","TERJANGKAU")', text: 'Kondisi menggunakan > untuk "lebih dari". Angka 1000000 tidak perlu tanda kutip dalam formula.' }
    },
    {
      id: 'l2q4',
      text: 'Hitung berapa kendaraan yang sudah "SELESAI" diservis menggunakan COUNTIF (cell E1).',
      context: 'Hitung total kendaraan dengan status SELESAI',
      formula: 'countif',
      timeLimit: 45,
      tableData: {
        headers: ['No', 'Plat Nomor', 'Jenis', 'Status'],
        rows: [
          ['1', 'B 1234 ABC', 'Mobil', 'SELESAI'],
          ['2', 'D 5678 XYZ', 'Motor', 'ANTRI'],
          ['3', 'B 9012 DEF', 'Mobil', 'SELESAI'],
          ['4', 'F 3456 GHI', 'Motor', 'SERVIS'],
          ['5', 'B 7890 JKL', 'Mobil', 'SELESAI'],
          ['6', 'D 1122 MNO', 'Motor', 'ANTRI'],
          ['7', 'B 3344 PQR', 'Mobil', 'SELESAI'],
          ['', 'Total Selesai:', '=COUNTIF(D2:D8,"SELESAI")'],
        ],
        resultRow: 7,
        resultCol: 2,
        highlight: [7, 2]
      },
      choices: [
        '=COUNTIF(D2:D8,"SELESAI")',
        '=COUNTIF(D2:D8,SELESAI)',
        '=COUNT(D2:D8,"SELESAI")',
        '=COUNTIFS(D2:D8,"SELESAI")'
      ],
      correct: 0,
      explanation: 'Formula <code>=COUNTIF(D2:D8,"SELESAI")</code> menghitung kendaraan dengan status SELESAI. Hasilnya: 4. Jika data bertambah, range bisa diperluas menjadi D2:D100 tanpa mengubah formula.',
      hint: { formula: '=COUNTIF(D2:D8,"SELESAI")', text: 'COUNTIF menghitung sel sesuai kriteria. Range ada di kolom D, kriteria adalah "SELESAI".' }
    },
    {
      id: 'l2q5',
      text: 'Tentukan STATUS STOK sparepart: jika stok < 10 maka "RESTOCK", jika tidak maka "AMAN" (cell D2).',
      context: 'Stok minimum aman = 10 unit',
      formula: 'if',
      timeLimit: 45,
      tableData: {
        headers: ['Kode', 'Sparepart', 'Stok', 'Status'],
        rows: [
          ['SP001', 'Filter Oli', '5', '=IF(C2<10,"RESTOCK","AMAN")'],
          ['SP002', 'Busi NGK', '45', 'AMAN'],
          ['SP003', 'Kampas Rem', '8', 'RESTOCK'],
          ['SP004', 'Oli Mesin', '20', 'AMAN'],
          ['SP005', 'Filter Udara', '3', 'RESTOCK'],
        ],
        resultRow: 0,
        resultCol: 3,
        highlight: [0, 3]
      },
      choices: [
        '=IF(C2<10,"RESTOCK","AMAN")',
        '=IF(C2<=10,"RESTOCK","AMAN")',
        '=IF(C2<10,RESTOCK,AMAN)',
        '=IF(C2,"RESTOCK","AMAN",10)'
      ],
      correct: 0,
      explanation: 'Formula <code>=IF(C2<10,"RESTOCK","AMAN")</code> menggunakan operator < (kurang dari). Stok SP001 = 5, yang < 10, sehingga hasilnya "RESTOCK". Sangat berguna untuk manajemen inventori bengkel!',
      hint: { formula: '=IF(C2<10,"RESTOCK","AMAN")', text: 'Gunakan operator < untuk "kurang dari". Stok < 10 berarti perlu restock.' }
    },
  ],

  3: [ // LEVEL 3 – VLOOKUP, XLOOKUP
    {
      id: 'l3q1',
      text: 'Gunakan VLOOKUP untuk mencari HARGA SPAREPART berdasarkan kode SP001 dari tabel referensi. Buat formula di cell C2.',
      context: 'Cari harga otomatis menggunakan kode sparepart',
      formula: 'vlookup',
      timeLimit: 30,
      tableData: {
        headers: ['Kode SP', 'Nama Sparepart', 'Harga', 'Kolom Ref'],
        rows: [
          ['SP001', 'Filter Oli', '=VLOOKUP(A2,E2:G6,3,0)', ''],
          ['SP002', 'Busi NGK', '45.000', ''],
          ['SP003', 'Kampas Rem', '120.000', ''],
          ['', '─── TABEL REFERENSI ───', '', ''],
          ['Kode', 'Nama', 'Harga', ''],
          ['SP001', 'Filter Oli', '35.000', ''],
          ['SP002', 'Busi NGK', '45.000', ''],
          ['SP003', 'Kampas Rem', '120.000', ''],
        ],
        resultRow: 0,
        resultCol: 2,
        highlight: [0, 2]
      },
      choices: [
        '=VLOOKUP(A2,E2:G6,3,0)',
        '=VLOOKUP(A2,E2:G6,2,0)',
        '=VLOOKUP(C2,E2:G6,3,0)',
        '=VLOOKUP(A2,E2:G6,3,1)'
      ],
      correct: 0,
      explanation: 'Formula <code>=VLOOKUP(A2,E2:G6,3,0)</code>: A2=nilai yang dicari (SP001), E2:G6=tabel referensi, 3=kolom ke-3 (Harga), 0=exact match. VLOOKUP mencari dari kiri ke kanan secara vertikal.',
      hint: { formula: '=VLOOKUP(A2,E2:G6,3,0)', text: 'VLOOKUP(nilai_cari, tabel, nomor_kolom, 0). Harga ada di kolom ke-3 tabel referensi. Gunakan 0 untuk exact match.' }
    },
    {
      id: 'l3q2',
      text: 'Gunakan VLOOKUP untuk menampilkan NAMA PELANGGAN berdasarkan ID Pelanggan di cell B2.',
      context: 'Cari nama pelanggan otomatis dari database',
      formula: 'vlookup',
      timeLimit: 30,
      tableData: {
        headers: ['ID Pelanggan', 'Nama', 'No. HP', ''],
        rows: [
          ['PLG003', '=VLOOKUP(A2,E2:G5,2,0)', '081234567890', ''],
          ['', '─── DATABASE PELANGGAN ───', '', ''],
          ['ID', 'Nama', 'No. HP', ''],
          ['PLG001', 'Ahmad Fauzi', '081111111111', ''],
          ['PLG002', 'Budi Santoso', '082222222222', ''],
          ['PLG003', 'Citra Lestari', '083333333333', ''],
          ['PLG004', 'Deni Kurniawan', '084444444444', ''],
        ],
        resultRow: 0,
        resultCol: 1,
        highlight: [0, 1]
      },
      choices: [
        '=VLOOKUP(A2,E2:G5,2,0)',
        '=VLOOKUP(A2,E2:G5,1,0)',
        '=VLOOKUP(B2,E2:G5,2,0)',
        '=VLOOKUP(A2,E2:G5,2,1)'
      ],
      correct: 0,
      explanation: 'Formula <code>=VLOOKUP(A2,E2:G5,2,0)</code>: mencari PLG003 di kolom pertama tabel, lalu mengambil nilai kolom ke-2 (Nama). Hasilnya: "Citra Lestari". Parameter terakhir 0 = exact match (harus persis sama).',
      hint: { formula: '=VLOOKUP(A2,E2:G5,2,0)', text: 'Nama ada di kolom ke-2 tabel database. VLOOKUP akan mencari ID di kolom pertama tabel referensi.' }
    },
    {
      id: 'l3q3',
      text: 'Gunakan XLOOKUP untuk mencari HARGA SPAREPART berdasarkan nama sparepart. Formula di cell C2.',
      context: 'XLOOKUP lebih fleksibel – tidak harus dari kolom pertama',
      formula: 'xlookup',
      timeLimit: 30,
      tableData: {
        headers: ['Nama Sparepart', 'Kode', 'Harga', ''],
        rows: [
          ['Oli Mesin Castrol', 'SP010', '=XLOOKUP(A2,E2:E6,G2:G6)', ''],
          ['', '─── KATALOG SPAREPART ───', '', ''],
          ['Nama', 'Kode', 'Harga', ''],
          ['Filter Oli', 'SP001', '35.000', ''],
          ['Busi NGK', 'SP002', '45.000', ''],
          ['Kampas Rem', 'SP003', '120.000', ''],
          ['Oli Mesin Castrol', 'SP010', '85.000', ''],
        ],
        resultRow: 0,
        resultCol: 2,
        highlight: [0, 2]
      },
      choices: [
        '=XLOOKUP(A2,E2:E6,G2:G6)',
        '=XLOOKUP(A2,E2:E6,F2:F6)',
        '=VLOOKUP(A2,E2:G6,3,0)',
        '=XLOOKUP(A2,G2:G6,E2:E6)'
      ],
      correct: 0,
      explanation: 'Formula <code>=XLOOKUP(A2,E2:E6,G2:G6)</code>: A2=nilai cari, E2:E6=kolom pencarian (nama), G2:G6=kolom hasil (harga). XLOOKUP lebih modern dari VLOOKUP: tidak perlu nomor kolom, bisa cari dari mana saja!',
      hint: { formula: '=XLOOKUP(A2,E2:E6,G2:G6)', text: 'XLOOKUP(nilai_cari, array_cari, array_hasil). Cari di kolom nama (E), ambil dari kolom harga (G).' }
    },
    {
      id: 'l3q4',
      text: 'Gunakan VLOOKUP untuk mengambil NOMOR MESIN kendaraan berdasarkan plat nomor (cell C2).',
      context: 'Ambil data teknis kendaraan dari database',
      formula: 'vlookup',
      timeLimit: 30,
      tableData: {
        headers: ['Plat Nomor', 'Merek', 'No. Mesin', ''],
        rows: [
          ['B 1234 ABC', 'Toyota Avanza', '=VLOOKUP(A2,E2:G5,3,0)', ''],
          ['', '─── DATABASE KENDARAAN ───', '', ''],
          ['Plat', 'Merek', 'No. Mesin', ''],
          ['B 1234 ABC', 'Toyota Avanza', 'K3VE-123456', ''],
          ['D 5678 XYZ', 'Honda Vario', 'eSP-789012', ''],
          ['F 9012 MNO', 'Yamaha NMAX', 'E3L1E-345678', ''],
        ],
        resultRow: 0,
        resultCol: 2,
        highlight: [0, 2]
      },
      choices: [
        '=VLOOKUP(A2,E2:G5,3,0)',
        '=VLOOKUP(A2,E2:G5,2,0)',
        '=VLOOKUP(C2,E2:G5,3,0)',
        '=XLOOKUP(A2,E2:G5,3)'
      ],
      correct: 0,
      explanation: 'Formula <code>=VLOOKUP(A2,E2:G5,3,0)</code> mencari plat nomor dan mengambil kolom ke-3 (No. Mesin). Hasilnya: K3VE-123456. Ini sangat berguna untuk administrasi kendaraan yang masuk bengkel!',
      hint: { formula: '=VLOOKUP(A2,E2:G5,3,0)', text: 'No. Mesin ada di kolom ke-3 tabel database. Cari berdasarkan plat nomor di kolom pertama.' }
    },
    {
      id: 'l3q5',
      text: 'Gunakan XLOOKUP untuk mendapatkan NAMA TEKNISI yang menangani kendaraan berdasarkan ID Servis (cell C2).',
      context: 'XLOOKUP dapat mengembalikan nilai dari kolom mana saja',
      formula: 'xlookup',
      timeLimit: 30,
      tableData: {
        headers: ['ID Servis', 'Kendaraan', 'Teknisi', ''],
        rows: [
          ['SRV-005', 'Honda CRV', '=XLOOKUP(A2,E2:E6,G2:G6)', ''],
          ['', '─── DATA SERVIS ───', '', ''],
          ['ID', 'Kendaraan', 'Teknisi', ''],
          ['SRV-003', 'Toyota Rush', 'Pak Hendra', ''],
          ['SRV-004', 'Suzuki Swift', 'Pak Bambang', ''],
          ['SRV-005', 'Honda CRV', 'Pak Rudi', ''],
          ['SRV-006', 'Mitsubishi Xpander', 'Pak Hendra', ''],
        ],
        resultRow: 0,
        resultCol: 2,
        highlight: [0, 2]
      },
      choices: [
        '=XLOOKUP(A2,E2:E6,G2:G6)',
        '=XLOOKUP(A2,E2:E6,F2:F6)',
        '=VLOOKUP(A2,E2:G6,3,0)',
        '=XLOOKUP(A2,G2:G6,E2:E6)'
      ],
      correct: 0,
      explanation: 'Formula <code>=XLOOKUP(A2,E2:E6,G2:G6)</code>: mencari SRV-005 di kolom ID (E), mengambil nilai dari kolom Teknisi (G). Hasilnya: "Pak Rudi". XLOOKUP lebih intuitif karena langsung menunjuk kolom hasil.',
      hint: { formula: '=XLOOKUP(A2,E2:E6,G2:G6)', text: 'Cari ID Servis di kolom E, ambil nama teknisi dari kolom G.' }
    },
  ],

  4: [ // LEVEL 4 – EXPERT (combinasi semua)
    {
      id: 'l4q1',
      text: 'EXPERT: Hitung TOTAL BIAYA SERVIS bulan ini DAN tentukan apakah bengkel sudah mencapai TARGET Rp 10.000.000. Gunakan SUM untuk total (B8) dan IF untuk status target (D1).',
      context: 'Kombinasi SUM + IF untuk laporan keuangan bengkel',
      formula: 'sum+if',
      timeLimit: 20,
      tableData: {
        headers: ['No', 'Kendaraan', 'Biaya', 'Target: =IF(SUM(C2:C6)>=10000000,"TERCAPAI","BELUM")'],
        rows: [
          ['1', 'Toyota Fortuner', '3.500.000', ''],
          ['2', 'Honda Jazz', '850.000', ''],
          ['3', 'BMW X3', '8.200.000', ''],
          ['4', 'Yamaha R15', '420.000', ''],
          ['5', 'Toyota Innova', '1.100.000', ''],
          ['', 'TOTAL', '=SUM(C2:C6)', ''],
        ],
        resultRow: 5,
        resultCol: 2,
        highlight: [5, 2]
      },
      choices: [
        '=SUM(C2:C6)',
        '=IF(SUM(C2:C6)>=10000000,"TERCAPAI","BELUM")',
        '=AVERAGE(C2:C6)',
        '=COUNTIF(C2:C6,">1000000")'
      ],
      correct: 0,
      explanation: 'Formula <code>=SUM(C2:C6)</code> untuk total biaya = Rp 14.070.000. Status target menggunakan nested formula: <code>=IF(SUM(C2:C6)>=10000000,"TERCAPAI","BELUM")</code>. Kombinasi fungsi sangat powerful dalam Excel!',
      hint: { formula: '=SUM(C2:C6)', text: 'Untuk total biaya gunakan SUM. Untuk status target bisa nested: =IF(SUM(C2:C6)>=10000000,"TERCAPAI","BELUM")' }
    },
    {
      id: 'l4q2',
      text: 'EXPERT: Hitung JUMLAH teknisi dengan level "SENIOR" menggunakan COUNTIF, dan hitung RATA-RATA gaji semua teknisi dengan AVERAGE.',
      context: 'Analisis SDM bengkel - kombinasi COUNTIF + AVERAGE',
      formula: 'countif+average',
      timeLimit: 20,
      tableData: {
        headers: ['No', 'Nama Teknisi', 'Level', 'Gaji (Rp)'],
        rows: [
          ['1', 'Pak Hendra', 'SENIOR', '7.500.000'],
          ['2', 'Pak Bambang', 'JUNIOR', '4.000.000'],
          ['3', 'Pak Rudi', 'SENIOR', '7.200.000'],
          ['4', 'Pak Dani', 'JUNIOR', '3.800.000'],
          ['5', 'Pak Eko', 'SENIOR', '7.800.000'],
          ['', 'Jumlah SENIOR', '=COUNTIF(C2:C6,"SENIOR")', ''],
          ['', 'Rata-rata Gaji', '', '=AVERAGE(D2:D6)'],
        ],
        resultRow: 5,
        resultCol: 2,
        highlight: [5, 2]
      },
      choices: [
        '=COUNTIF(C2:C6,"SENIOR")',
        '=COUNT(C2:C6,"SENIOR")',
        '=AVERAGE(C2:C6)',
        '=SUMIF(C2:C6,"SENIOR")'
      ],
      correct: 0,
      explanation: 'Formula <code>=COUNTIF(C2:C6,"SENIOR")</code> menghasilkan 3 (tiga teknisi senior). Rata-rata gaji: <code>=AVERAGE(D2:D6)</code> = Rp 6.060.000. Analisis seperti ini penting untuk manajemen SDM bengkel profesional.',
      hint: { formula: '=COUNTIF(C2:C6,"SENIOR")', text: 'COUNTIF untuk menghitung jumlah SENIOR. Range di kolom C (Level).' }
    },
    {
      id: 'l4q3',
      text: 'EXPERT: Buat laporan lengkap - Cari HARGA sparepart dengan VLOOKUP, lalu tentukan apakah harga > 100.000 maka "PREMIUM" else "STANDAR" dengan IF (cell D2).',
      context: 'Nested VLOOKUP dalam IF untuk kategorisasi otomatis',
      formula: 'vlookup+if',
      timeLimit: 20,
      tableData: {
        headers: ['Kode', 'Nama', 'Harga', 'Kategori'],
        rows: [
          ['SP003', 'Kampas Rem', '120.000', '=IF(VLOOKUP(A2,F2:H5,3,0)>100000,"PREMIUM","STANDAR")'],
          ['SP001', 'Filter Oli', '35.000', 'STANDAR'],
          ['SP010', 'Oli Castrol', '85.000', 'STANDAR'],
          ['', '─── REFERENSI ───', '', ''],
          ['Kode', 'Nama', 'Harga', ''],
          ['SP001', 'Filter Oli', '35.000', ''],
          ['SP002', 'Busi NGK', '45.000', ''],
          ['SP003', 'Kampas Rem', '120.000', ''],
          ['SP010', 'Oli Castrol', '85.000', ''],
        ],
        resultRow: 0,
        resultCol: 3,
        highlight: [0, 3]
      },
      choices: [
        '=IF(VLOOKUP(A2,F2:H5,3,0)>100000,"PREMIUM","STANDAR")',
        '=IF(C2>100000,"PREMIUM","STANDAR")',
        '=VLOOKUP(A2,F2:H5,3,0)',
        '=IF(VLOOKUP(A2,F2:H5,2,0)>100000,"PREMIUM","STANDAR")'
      ],
      correct: 0,
      explanation: 'Formula nested: <code>=IF(VLOOKUP(A2,F2:H5,3,0)>100000,"PREMIUM","STANDAR")</code>. VLOOKUP dulu mencari harga, lalu IF mengevaluasi nilainya. Kampas rem (120.000) > 100.000 → "PREMIUM". Ini adalah teknik tingkat lanjut yang sangat berguna!',
      hint: { formula: '=IF(VLOOKUP(A2,F2:H5,3,0)>100000,"PREMIUM","STANDAR")', text: 'Nested formula: masukkan VLOOKUP sebagai kondisi dalam IF. VLOOKUP cari harga, IF evaluasi apakah > 100000.' }
    },
    {
      id: 'l4q4',
      text: 'EXPERT: Hitung rata-rata biaya SERVIS RINGAN saja menggunakan AVERAGEIF. Jika tidak ada AVERAGEIF, gunakan SUMIF/COUNTIF kombinasi.',
      context: 'Hitung rata-rata khusus untuk kategori tertentu',
      formula: 'averageif',
      timeLimit: 20,
      tableData: {
        headers: ['No', 'Jenis Servis', 'Kategori', 'Biaya'],
        rows: [
          ['1', 'Ganti Oli', 'RINGAN', '150.000'],
          ['2', 'Tune Up Lengkap', 'BESAR', '850.000'],
          ['3', 'Cek Rem', 'RINGAN', '100.000'],
          ['4', 'Overhaul Mesin', 'BESAR', '5.000.000'],
          ['5', 'Ganti Filter', 'RINGAN', '200.000'],
          ['', 'Rata2 RINGAN', '', '=AVERAGEIF(C2:C6,"RINGAN",D2:D6)'],
        ],
        resultRow: 5,
        resultCol: 3,
        highlight: [5, 3]
      },
      choices: [
        '=AVERAGEIF(C2:C6,"RINGAN",D2:D6)',
        '=AVERAGE(D2:D6)',
        '=SUMIF(C2:C6,"RINGAN",D2:D6)',
        '=IF(C2="RINGAN",AVERAGE(D2:D6),0)'
      ],
      correct: 0,
      explanation: 'Formula <code>=AVERAGEIF(C2:C6,"RINGAN",D2:D6)</code>: hitung rata-rata kolom D hanya untuk baris yang kolom C = "RINGAN". Hasilnya: (150.000+100.000+200.000)/3 = Rp 150.000. AVERAGEIF adalah fungsi kondisional yang powerful!',
      hint: { formula: '=AVERAGEIF(C2:C6,"RINGAN",D2:D6)', text: 'AVERAGEIF(range_kriteria, kriteria, range_rata2). Kriteria: "RINGAN", rata2 dari kolom D.' }
    },
    {
      id: 'l4q5',
      text: 'EXPERT FINAL: Buat formula XLOOKUP untuk mencari data pelanggan VIP lengkap, kemudian IF untuk menentukan apakah berhak mendapat DISKON 20% (jika total servis > Rp 5.000.000).',
      context: 'Laporan akhir bengkel – kombinasi XLOOKUP + IF + logika bisnis',
      formula: 'xlookup+if',
      timeLimit: 20,
      tableData: {
        headers: ['ID', 'Nama', 'Total Servis', 'Diskon'],
        rows: [
          ['VIP001', '=XLOOKUP(A2,E2:E4,F2:F4)', '7.500.000', '=IF(C2>5000000,"20%","0%")'],
          ['VIP002', 'Budi VIP', '3.200.000', '0%'],
          ['VIP003', 'Citra VIP', '8.900.000', '20%'],
          ['', '─── DATABASE VIP ───', '', ''],
          ['ID', 'Nama', '', ''],
          ['VIP001', 'Ahmad VIP', '', ''],
          ['VIP002', 'Budi VIP', '', ''],
          ['VIP003', 'Citra VIP', '', ''],
        ],
        resultRow: 0,
        resultCol: 3,
        highlight: [0, 3]
      },
      choices: [
        '=IF(C2>5000000,"20%","0%")',
        '=IF(C2>=5000000,"20%","0%")',
        '=XLOOKUP(A2,E2:E4,F2:F4)',
        '=IF(C2>5000000,20%,0%)'
      ],
      correct: 0,
      explanation: 'Formula <code>=IF(C2>5000000,"20%","0%")</code> menentukan diskon. Total servis VIP001 = Rp 7.500.000 > 5.000.000 → "20%". Nama diambil dengan XLOOKUP: <code>=XLOOKUP(A2,E2:E4,F2:F4)</code>. Ini adalah simulasi nyata sistem CRM bengkel!',
      hint: { formula: '=IF(C2>5000000,"20%","0%")', text: 'Untuk diskon gunakan IF dengan kondisi C2>5000000. Hasilnya string "20%" atau "0%".' }
    },
  ]
};

// ─── LEVEL CONFIG ────────────────────────────────────────────────
const LEVEL_CONFIG = {
  1: { name: 'DASAR', color: '#00e676', basePoints: 100, timeLimit: 60 },
  2: { name: 'MENENGAH', color: '#1e7fff', basePoints: 200, timeLimit: 45 },
  3: { name: 'LANJUTAN', color: '#ff6b35', basePoints: 350, timeLimit: 30 },
  4: { name: 'EXPERT', color: '#ff3b30', basePoints: 500, timeLimit: 20 },
};

// ─── BADGES ──────────────────────────────────────────────────────
const BADGES_DEF = [
  { id: 'beginner', icon: '🔰', name: 'Excel Beginner', desc: 'Selesaikan Level 1', condition: g => g.level >= 1 && g.correct >= 3 },
  { id: 'hunter', icon: '🎯', name: 'Formula Hunter', desc: 'Jawab 10 soal benar', condition: (g, stats) => (stats.correct || 0) >= 10 },
  { id: 'speedster', icon: '⚡', name: 'Speed Demon', desc: 'Jawab dalam 5 detik', condition: g => g.fastAnswer === true },
  { id: 'combo3', icon: '🔥', name: 'Combo Master', desc: 'Combo 3x berturut-turut', condition: g => g.maxCombo >= 3 },
  { id: 'master', icon: '🏆', name: 'Spreadsheet Master', desc: 'Selesaikan Level 3', condition: g => g.level >= 3 && g.correct >= 4 },
  { id: 'expert', icon: '🚀', name: 'Automotive Data Expert', desc: 'Selesaikan Level 4', condition: g => g.level >= 4 && g.correct >= 4 },
  { id: 'perfect', icon: '💎', name: 'Perfect Score', desc: 'Jawab semua benar', condition: g => g.wrong === 0 && g.correct >= 5 },
  { id: 'persistent', icon: '💪', name: 'Pantang Menyerah', desc: 'Mainkan 5x game', condition: (g, stats) => (stats.games || 0) >= 5 },
];

// ─── GAME START ──────────────────────────────────────────────────
function startLevel(level) {
  currentLevel = level;
  const cfg = LEVEL_CONFIG[level];
  const qs = [...QUESTIONS[level]].sort(() => Math.random() - 0.5);

  gameState = {
    level,
    questions: qs,
    currentQ: 0,
    score: 0,
    correct: 0,
    wrong: 0,
    combo: 0,
    maxCombo: 0,
    fastAnswer: false,
    selectedAnswer: null,
    answered: false,
    startTime: Date.now(),
    questionStartTime: Date.now(),
    totalTime: 0,
  };

  document.getElementById('game-level-badge').textContent = `LEVEL ${level} – ${cfg.name}`;
  showScreen('screen-game');
  loadQuestion();
}

function loadQuestion() {
  const q = gameState.questions[gameState.currentQ];
  if (!q) { endGame(); return; }

  gameState.selectedAnswer = null;
  gameState.answered = false;
  gameState.questionStartTime = Date.now();

  // Update progress
  const total = gameState.questions.length;
  const current = gameState.currentQ + 1;
  document.getElementById('game-progress').style.width = `${((current - 1) / total) * 100}%`;
  document.getElementById('progress-label').textContent = `Soal ${current} / ${total}`;
  document.getElementById('q-number').textContent = `Soal ${current}`;
  document.getElementById('q-text').textContent = q.text;
  document.getElementById('q-context').textContent = q.context || '';

  // Build Excel table
  buildExcelTable(q.tableData);

  // Build choices
  buildChoices(q);

  // Enable submit
  const btn = document.getElementById('btn-submit');
  btn.disabled = false;
  btn.textContent = '✓ Cek Jawaban';

  // Clear formula input
  document.getElementById('formula-input').value = '';

  // Start timer
  startTimer(q.timeLimit || LEVEL_CONFIG[currentLevel].timeLimit);
}

function buildExcelTable(td) {
  if (!td) return;
  const wrap = document.getElementById('excel-table');
  wrap.innerHTML = '';

  // Column header row (A, B, C...)
  const letters = ['', 'A', 'B', 'C', 'D', 'E', 'F', 'G'];
  const colCount = td.headers.length + 1;
  const colHeader = document.createElement('div');
  colHeader.className = 'excel-row row-num-header';
  colHeader.style.gridTemplateColumns = `36px repeat(${td.headers.length}, 1fr)`;
  letters.slice(0, colCount).forEach((l, i) => {
    const cell = document.createElement('div');
    cell.className = i === 0 ? 'excel-cell row-num' : 'excel-cell col-header';
    cell.textContent = l;
    colHeader.appendChild(cell);
  });
  wrap.appendChild(colHeader);

  // Header data row
  const hRow = document.createElement('div');
  hRow.className = 'excel-row header-row';
  hRow.style.gridTemplateColumns = `36px repeat(${td.headers.length}, 1fr)`;
  const hNum = document.createElement('div');
  hNum.className = 'excel-cell row-num';
  hNum.textContent = '1';
  hRow.appendChild(hNum);
  td.headers.forEach(h => {
    const cell = document.createElement('div');
    cell.className = 'excel-cell';
    cell.textContent = h;
    hRow.appendChild(cell);
  });
  wrap.appendChild(hRow);

  // Data rows
  td.rows.forEach((row, ri) => {
    const tr = document.createElement('div');
    tr.className = 'excel-row';
    tr.style.gridTemplateColumns = `36px repeat(${td.headers.length}, 1fr)`;

    const rNum = document.createElement('div');
    rNum.className = 'excel-cell row-num';
    rNum.textContent = ri + 2;
    tr.appendChild(rNum);

    row.forEach((cellVal, ci) => {
      const cell = document.createElement('div');
      cell.className = 'excel-cell';

      const isHighlight = td.highlight && td.highlight[0] === ri && td.highlight[1] === ci;
      const isResult = td.resultRow === ri && td.resultCol === ci;

      if (isHighlight || isResult) {
        cell.className += ' highlight result-cell';
        cell.textContent = '?';
      } else if (cellVal.startsWith('=')) {
        cell.className += ' result-cell';
        cell.textContent = cellVal;
      } else if (cellVal.includes('───')) {
        cell.style.color = '#999';
        cell.style.fontStyle = 'italic';
        cell.textContent = cellVal;
      } else {
        cell.textContent = cellVal;
      }
      tr.appendChild(cell);
    });
    wrap.appendChild(tr);
  });
}

function buildChoices(q) {
  const wrap = document.getElementById('answer-choices');
  wrap.innerHTML = '';
  q.choices.forEach((choice, i) => {
    const btn = document.createElement('button');
    btn.className = 'choice-btn';
    btn.textContent = choice;
    btn.onclick = () => selectChoice(i, btn);
    wrap.appendChild(btn);
  });
}

function selectChoice(idx, btn) {
  if (gameState.answered) return;
  playSound('click');
  gameState.selectedAnswer = idx;

  // Update formula bar
  const q = gameState.questions[gameState.currentQ];
  document.getElementById('formula-input').value = q.choices[idx];

  // UI feedback
  document.querySelectorAll('.choice-btn').forEach(b => b.classList.remove('selected'));
  btn.classList.add('selected');
}

// ─── TIMER ───────────────────────────────────────────────────────
function startTimer(seconds) {
  clearInterval(timerInterval);
  let remaining = seconds;
  const circumference = 163.4;
  const ring = document.getElementById('timer-ring');
  const display = document.getElementById('timer-display');

  function update() {
    const pct = remaining / seconds;
    ring.style.strokeDashoffset = circumference * (1 - pct);
    display.textContent = remaining;

    if (remaining <= 10) {
      ring.style.stroke = 'var(--accent-red)';
      display.style.color = 'var(--accent-red)';
      if (remaining <= 5) playSound('tick');
    } else if (remaining <= seconds * 0.5) {
      ring.style.stroke = 'var(--accent-yellow)';
      display.style.color = 'var(--accent-yellow)';
    } else {
      ring.style.stroke = 'var(--accent-cyan)';
      display.style.color = 'var(--text-primary)';
    }

    if (remaining <= 0) {
      clearInterval(timerInterval);
      timeUp();
    } else {
      remaining--;
    }
  }
  update();
  timerInterval = setInterval(update, 1000);
}

function timeUp() {
  if (gameState.answered) return;
  gameState.answered = true;
  gameState.wrong++;
  gameState.combo = 0;
  updateComboUI();
  showFeedback(false, 'Waktu Habis!', 'Coba lebih cepat lain kali.');
}

// ─── SUBMIT ANSWER ───────────────────────────────────────────────
function submitAnswer() {
  if (gameState.answered) return;
  if (gameState.selectedAnswer === null) {
    // Check formula input
    const typed = document.getElementById('formula-input').value.trim().toUpperCase();
    const q = gameState.questions[gameState.currentQ];
    const correctFormula = q.choices[q.correct].toUpperCase();
    if (typed && typed === correctFormula) {
      gameState.selectedAnswer = q.correct;
    } else if (typed) {
      // Mark wrong
      gameState.selectedAnswer = -1;
    } else {
      // Shake button
      const btn = document.getElementById('btn-submit');
      btn.style.animation = 'shake 0.4s ease';
      setTimeout(() => btn.style.animation = '', 400);
      return;
    }
  }

  clearInterval(timerInterval);
  gameState.answered = true;

  const q = gameState.questions[gameState.currentQ];
  const isCorrect = gameState.selectedAnswer === q.correct;

  // Highlight choices
  document.querySelectorAll('.choice-btn').forEach((btn, i) => {
    if (i === q.correct) btn.classList.add('correct');
    else if (i === gameState.selectedAnswer) btn.classList.add('wrong');
  });

  const elapsed = Math.floor((Date.now() - gameState.questionStartTime) / 1000);
  const timeLimit = q.timeLimit || LEVEL_CONFIG[currentLevel].timeLimit;
  const remaining = timeLimit - elapsed;
  const timerEl = document.getElementById('timer-display');
  const actualRemaining = parseInt(timerEl.textContent);

  if (isCorrect) {
    // Calculate points
    let pts = LEVEL_CONFIG[currentLevel].basePoints;
    if (actualRemaining > timeLimit * 0.5) { pts += 50; gameState.fastAnswer = true; }
    if (actualRemaining < 5) gameState.fastAnswer = true;

    gameState.combo++;
    if (gameState.combo > gameState.maxCombo) gameState.maxCombo = gameState.combo;
    if (gameState.combo >= 2) pts = Math.floor(pts * (1 + gameState.combo * 0.1));

    gameState.score += pts;
    gameState.correct++;
    updateScoreUI(pts);
    updateComboUI();
    playSound(gameState.combo >= 3 ? 'combo' : 'correct');
    showFeedback(true, 'Benar! 🎉', q.explanation, pts);
  } else {
    const penalty = 50;
    gameState.score = Math.max(0, gameState.score - penalty);
    gameState.wrong++;
    gameState.combo = 0;
    updateComboUI();
    playSound('wrong');
    showFeedback(false, 'Salah ❌', q.explanation, -penalty);
  }
}

function updateScoreUI(delta) {
  const el = document.getElementById('game-score');
  el.textContent = gameState.score;
  el.style.transform = 'scale(1.3)';
  setTimeout(() => el.style.transform = 'scale(1)', 200);

  // Score popup
  const popup = document.createElement('div');
  popup.className = 'score-popup';
  popup.textContent = delta > 0 ? `+${delta}` : delta;
  popup.style.color = delta > 0 ? 'var(--accent-green)' : 'var(--accent-red)';
  popup.style.left = '50%';
  popup.style.top = '80px';
  document.body.appendChild(popup);
  setTimeout(() => popup.remove(), 1200);
}

function updateComboUI() {
  const el = document.getElementById('combo-display');
  document.getElementById('combo-count').textContent = gameState.combo;
  el.classList.toggle('visible', gameState.combo >= 2);
}

function showFeedback(correct, title, explanation, pts) {
  const overlay = document.getElementById('feedback-overlay');
  const card = document.getElementById('feedback-card');
  document.getElementById('feedback-icon').textContent = correct ? '✅' : '❌';
  document.getElementById('feedback-title').textContent = title;
  document.getElementById('feedback-pts').textContent = pts ? (pts > 0 ? `+${pts} poin` : `${pts} poin`) : '';
  document.getElementById('feedback-pts').style.color = pts > 0 ? 'var(--accent-yellow)' : 'var(--accent-red)';
  document.getElementById('feedback-explanation').innerHTML = explanation || '';

  card.className = 'feedback-card ' + (correct ? 'correct' : 'wrong');
  overlay.classList.add('show');
}

function nextQuestion() {
  document.getElementById('feedback-overlay').classList.remove('show');
  gameState.currentQ++;
  if (gameState.currentQ >= gameState.questions.length) {
    endGame();
  } else {
    loadQuestion();
  }
}

function showHint() {
  const q = gameState.questions[gameState.currentQ];
  if (!q || !q.hint) return;
  playSound('click');
  document.getElementById('hint-body').innerHTML = `
    <div class="hint-formula">${q.hint.formula}</div>
    <div class="hint-text">${q.hint.text}</div>
  `;
  document.getElementById('hint-modal').classList.add('show');
}

function closeHint() {
  document.getElementById('hint-modal').classList.remove('show');
}

function quitGame() {
  if (confirm('Yakin ingin keluar? Progres akan hilang.')) {
    clearInterval(timerInterval);
    showScreen('screen-menu');
  }
}

// ─── GAME END ────────────────────────────────────────────────────
function endGame() {
  clearInterval(timerInterval);
  playSound('win');

  // Save stats
  const stats = loadData('stats', { games: 0, correct: 0, wrong: 0, bestScore: 0 });
  stats.games = (stats.games || 0) + 1;
  stats.correct = (stats.correct || 0) + gameState.correct;
  stats.wrong = (stats.wrong || 0) + gameState.wrong;
  saveData('stats', stats);

  // Save history
  const history = loadData('history', []);
  const entry = {
    level: currentLevel,
    score: gameState.score,
    correct: gameState.correct,
    wrong: gameState.wrong,
    combo: gameState.maxCombo,
    date: new Date().toLocaleDateString('id-ID'),
    timestamp: Date.now()
  };
  history.unshift(entry);
  saveData('history', history.slice(0, 20));

  // Update leaderboard
  updateLeaderboardData(entry);

  // Check badges
  const newBadges = checkBadges(entry, stats);

  // Show result screen
  showResultScreen(entry, newBadges);
}

function showResultScreen(entry, newBadges) {
  const total = gameState.questions.length;
  const pct = gameState.correct / total;
  let trophy = '🏆';
  let title = 'Kerja Bagus!';
  if (pct === 1) { trophy = '💎'; title = 'Sempurna! Luar Biasa!'; }
  else if (pct >= 0.8) { trophy = '🥇'; title = 'Hasil Luar Biasa!'; }
  else if (pct >= 0.6) { trophy = '🥈'; title = 'Bagus! Terus Berlatih!'; }
  else { trophy = '📖'; title = 'Jangan Menyerah!'; }

  document.getElementById('result-trophy').textContent = trophy;
  document.getElementById('result-title').textContent = title;
  document.getElementById('result-subtitle').textContent = `Level ${currentLevel} – ${LEVEL_CONFIG[currentLevel].name}`;
  document.getElementById('result-score').textContent = entry.score.toLocaleString();
  document.getElementById('result-correct').textContent = entry.correct;
  document.getElementById('result-wrong').textContent = entry.wrong;
  document.getElementById('result-combo').textContent = entry.combo;

  const avgTime = Math.floor((Date.now() - gameState.startTime) / 1000 / total);
  document.getElementById('result-time').textContent = avgTime + 's';

  // Badge display
  const bWrap = document.getElementById('result-badge-earned');
  bWrap.innerHTML = newBadges.map((b, i) => `
    <div class="badge-earned" style="animation-delay:${i*0.2}s">
      <span class="badge-icon">${b.icon}</span>
      <div class="badge-name">${b.name}</div>
    </div>
  `).join('');

  // Certificate data
  const p = loadData('player', player);
  document.getElementById('cert-name').textContent = p.name || 'Pemain';
  document.getElementById('cert-nim').textContent = p.nim || '-';
  document.getElementById('cert-score').textContent = entry.score.toLocaleString();
  document.getElementById('cert-level').textContent = currentLevel;
  document.getElementById('cert-date').textContent = new Date().toLocaleDateString('id-ID');

  showScreen('screen-result');
}

function checkBadges(entry, stats) {
  const existing = loadData('badges', []);
  const newBadges = [];

  BADGES_DEF.forEach(badge => {
    if (!existing.includes(badge.id)) {
      let earned = false;
      try {
        earned = badge.condition(
          { ...entry, level: entry.level, maxCombo: entry.combo, fastAnswer: gameState.fastAnswer },
          stats
        );
      } catch(e) {}

      if (earned) {
        existing.push(badge.id);
        newBadges.push(badge);
      }
    }
  });

  saveData('badges', existing);
  return newBadges;
}

// ─── LEADERBOARD ─────────────────────────────────────────────────
function updateLeaderboardData(entry) {
  const lb = loadData('leaderboard', []);
  const p = loadData('player', player);
  lb.push({
    name: p.name || 'Anonymous',
    nim: p.nim || '-',
    score: entry.score,
    level: entry.level,
    combo: entry.combo,
    date: entry.date,
    timestamp: entry.timestamp
  });
  lb.sort((a, b) => b.score - a.score);
  saveData('leaderboard', lb.slice(0, 50));
}

function updateLeaderboard(filter) {
  let lb = loadData('leaderboard', []);
  if (filter !== 'all') lb = lb.filter(e => e.level == filter);
  lb.sort((a, b) => b.score - a.score);

  // Add demo data if empty
  if (lb.length === 0) {
    lb = [
      { name: 'Ahmad Fauzi', nim: '2024001', score: 4850, level: 4, combo: 5, date: '10/05/2026' },
      { name: 'Citra Lestari', nim: '2024002', score: 4200, level: 4, combo: 4, date: '09/05/2026' },
      { name: 'Budi Santoso', nim: '2024003', score: 3800, level: 3, combo: 3, date: '08/05/2026' },
      { name: 'Deni Kurniawan', nim: '2024004', score: 2950, level: 2, combo: 3, date: '07/05/2026' },
      { name: 'Eka Putri', nim: '2024005', score: 2400, level: 2, combo: 2, date: '06/05/2026' },
    ];
  }

  const p = loadData('player', player);
  const currentNim = p.nim || '';

  const wrap = document.getElementById('leaderboard-list');
  if (!wrap) return;

  wrap.innerHTML = lb.map((e, i) => {
    const rank = i + 1;
    const rankClass = rank === 1 ? 'top1' : rank === 2 ? 'top2' : rank === 3 ? 'top3' : '';
    const isCurrent = e.nim === currentNim ? 'current' : '';
    const medal = rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : rank;

    return `
      <div class="lb-entry ${rankClass} ${isCurrent}">
        <div class="lb-rank">${medal}</div>
        <div class="lb-player">
          <div class="lb-avatar">${(e.name[0] || 'A').toUpperCase()}</div>
          <div>
            <div class="lb-name">${e.name} ${isCurrent ? '⭐' : ''}</div>
            <div class="lb-sub">${e.nim} · ${e.date} · Combo ${e.combo}x</div>
          </div>
        </div>
        <div class="lb-level">L${e.level}</div>
        <div class="lb-score">${e.score.toLocaleString()}</div>
      </div>
    `;
  }).join('');
}

function switchLbTab(filter, btn) {
  document.querySelectorAll('.lb-tab').forEach(t => t.classList.remove('active'));
  btn.classList.add('active');
  updateLeaderboard(filter);
}

// ─── PROFILE ─────────────────────────────────────────────────────
function updateProfileUI() {
  const p = loadData('player', player);
  document.getElementById('profile-avatar-lg').textContent = (p.name || 'A')[0].toUpperCase();
  document.getElementById('profile-name').textContent = p.name || '-';
  document.getElementById('profile-nim').textContent = '📋 NIM: ' + (p.nim || '-');
  document.getElementById('profile-prodi').textContent = '🎓 ' + (p.prodi || '-');

  const stats = loadData('stats', { games: 0, correct: 0, wrong: 0 });
  const history = loadData('history', []);
  const bestScore = history.length ? Math.max(...history.map(h => h.score)) : 0;
  const total = (stats.correct || 0) + (stats.wrong || 0);
  const accuracy = total > 0 ? Math.round((stats.correct / total) * 100) : 0;

  document.getElementById('ps-games').textContent = stats.games || 0;
  document.getElementById('ps-score').textContent = bestScore.toLocaleString();
  document.getElementById('ps-correct').textContent = stats.correct || 0;
  document.getElementById('ps-accuracy').textContent = accuracy + '%';

  // Badges
  const earned = loadData('badges', []);
  const bgWrap = document.getElementById('badges-grid');
  bgWrap.innerHTML = BADGES_DEF.map(b => `
    <div class="badge-item ${earned.includes(b.id) ? 'earned' : 'locked'}">
      <span class="b-icon">${b.icon}</span>
      <div class="b-name">${b.name}</div>
      <div class="b-desc">${b.desc}</div>
    </div>
  `).join('');

  // History
  const hWrap = document.getElementById('history-list');
  if (history.length === 0) {
    hWrap.innerHTML = '<p style="color:var(--text-muted);text-align:center;padding:20px">Belum ada riwayat game</p>';
  } else {
    hWrap.innerHTML = history.slice(0, 10).map(h => `
      <div class="history-item">
        <div>
          <div class="hi-level">LEVEL ${h.level} – ${LEVEL_CONFIG[h.level]?.name || ''}</div>
          <div style="font-size:0.8rem;color:var(--text-secondary);margin-top:2px">✅ ${h.correct} benar · ❌ ${h.wrong} salah · 🔥 Combo ${h.combo}x</div>
        </div>
        <div class="hi-score">${h.score.toLocaleString()}</div>
        <div class="hi-date">${h.date}</div>
      </div>
    `).join('');
  }
}

// ─── RESULT ACTIONS ──────────────────────────────────────────────
function playAgain() {
  startLevel(currentLevel);
}

function showCertificate() {
  showScreen('screen-certificate');
}

function downloadCertificate() {
  // Simple print-based download
  const cert = document.getElementById('certificate');
  const original = document.body.innerHTML;
  const print = `
    <html><head>
    <link href="https://fonts.googleapis.com/css2?family=Rajdhani:wght@400;700;800&family=Share+Tech+Mono&family=Exo+2:wght@400;600;800&display=swap" rel="stylesheet">
    <style>
      body { margin: 0; padding: 20px; background: white; font-family: 'Exo 2', sans-serif; }
      .certificate { background: linear-gradient(135deg,#fefefe,#f5f5f0); border-radius:12px; padding:60px; max-width:700px; margin:0 auto; color:#1a1a1a; border: 2px solid #1e7fff; position:relative; }
      .cert-logo { font-family: 'Rajdhani'; font-size:1rem; font-weight:800; letter-spacing:4px; color:#217346; text-align:center; }
      .cert-subtitle { font-size:0.75rem; color:#666; letter-spacing:3px; text-align:center; margin-bottom:40px; }
      .cert-declares { text-align:center; font-size:0.9rem; color:#666; margin-bottom:8px; }
      .cert-name { font-family:'Rajdhani'; font-size:3rem; font-weight:800; text-align:center; margin-bottom:4px; }
      .cert-nim { font-family:'Share Tech Mono'; font-size:0.9rem; color:#666; text-align:center; margin-bottom:24px; }
      .cert-text { font-size:0.95rem; color:#444; line-height:1.8; text-align:center; max-width:500px; margin:0 auto 32px; }
      .cert-score-display { display:flex; justify-content:center; gap:40px; padding:20px; background:#f0f8ff; border-radius:12px; margin-bottom:40px; }
      .cert-score-item { text-align:center; }
      .cert-score-item span { display:block; font-family:'Rajdhani'; font-size:2rem; font-weight:800; color:#217346; }
      .cert-score-item small { font-size:0.75rem; color:#888; text-transform:uppercase; letter-spacing:1px; }
      .cert-footer { display:flex; justify-content:space-between; align-items:flex-end; }
      .cert-seal { font-size:3rem; }
      .cert-sign p { font-size:0.75rem; color:#666; }
      .cert-line { width:160px; border-top:2px solid #333; margin-bottom:8px; }
    </style></head>
    <body>${cert.outerHTML}</body></html>
  `;

  const win = window.open('', '_blank');
  win.document.write(print);
  win.document.close();
  setTimeout(() => { win.print(); win.close(); }, 500);
}

// ─── INIT ────────────────────────────────────────────────────────
window.addEventListener('load', () => {
  const saved = loadData('player', null);
  if (saved && saved.name && saved.nim) {
    player = saved;
    showScreen('screen-menu');
  } else {
    showScreen('screen-login');
  }
});
