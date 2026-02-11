// ================= KONFIGURASI FIREBASE (WAJIB DIGANTI) =================
// 1. Masuk ke console.firebase.google.com
// 2. Buat Project -> Firestore Database (Start in Test Mode)
// 3. Project Settings -> Add Web App -> Copy Config di sini:

const firebaseConfig = {
apiKey: "AIzaSyBEK0l2ny3GEFsVKs5lwe2MtxfrqJeqoO8",

  authDomain: "tchat-b3a7e.firebaseapp.com",

  projectId: "tchat-b3a7e",

  storageBucket: "tchat-b3a7e.firebasestorage.app",

  messagingSenderId: "189953900844",

  appId: "1:189953900844:web:520e2d313658ac665aac89"

};

// ================= VARIABLES GLOBAL =================
let dataBackup = [];     // Master data modul
let rekapData = [];      // Data nilai (Akan di-sync dengan Firebase)
let db = null;           // Reference ke Firestore

// ================= ASPEK PENILAIAN =================
const aspekBase = [
    ["Teknis", "Navigasi lancar, tombol berfungsi, tidak ada error/bug, loading cepat."],
    ["Materi", "Kesesuaian dengan kurikulum, konsep akurat, kedalaman materi tepat."],
    ["Penyajian", "Urutan materi sistematis, bahasa mudah dipahami, instruksi jelas."],
    ["Tampilan", "Desain visual menarik, pemilihan font & warna nyaman dibaca."],
    ["Multimedia", "Kualitas gambar/video/audio baik dan relevan dengan materi."],
    ["Interaktivitas", "Adanya keterlibatan siswa (klik, input, drag-drop, quiz interaktif)."],
    ["Evaluasi", "Soal latihan/kuis tersedia, relevan, dan memberikan umpan balik."]
];

// ================= INITIALIZATION =================
document.addEventListener('DOMContentLoaded', async function() {
    console.log("System Starting...");
    
    // 1. Init Firebase
    initFirebaseService();

    // 2. Load Master Data (Modul)
    await loadDataFromBackup();

    // 3. Load Data Nilai (Prioritas: Cloud -> Local)
    await syncDataFromCloud();
    
    // 4. Setup UI
    showTab('input');
});

// ================= FIREBASE SERVICE =================
function initFirebaseService() {
    if (typeof firebase !== 'undefined' && !firebase.apps.length) {
        try {
            firebase.initializeApp(firebaseConfig);
            db = firebase.firestore();
            console.log("🔥 Firebase Connected!");
        } catch (error) {
            console.error("Firebase Config Error. Pastikan Anda sudah mengganti config di script.js", error);
            alert("Koneksi Database Gagal! Cek console untuk detail.");
        }
    } else {
        console.error("Firebase SDK belum dimuat di index.html");
    }
}

// Fungsi Ambil Data dari Cloud
async function syncDataFromCloud() {
    if (!db) return;

    const notifBtn = document.querySelector('.header h1'); 
    
    try {
        const snapshot = await db.collection('penilaian_modul').get();
        const cloudData = [];
        
        snapshot.forEach(doc => {
            cloudData.push(doc.data());
        });

        if (cloudData.length > 0) {
            rekapData = cloudData;
            console.log(`Berhasil memuat ${cloudData.length} data dari Cloud.`);
            
            // Update LocalStorage agar sinkron
            localStorage.setItem('rekapData_v2', JSON.stringify(rekapData));
            
            // Update UI
            renderRekap();
            renderDashboardStats();
            // Refresh dropdown jika sedang di tab input
            const evalVal = document.getElementById('filter-evaluator').value;
            if(evalVal) filterModulesByEvaluator();
        }
    } catch (error) {
        console.error("Gagal ambil data Cloud:", error);
        alert("Gagal mengambil data terbaru. Cek koneksi internet.");
    }
}

// Fungsi Simpan ke Cloud
function saveToFirebase(record) {
    if (!db) {
        alert("Database belum terhubung! Cek Config.");
        return;
    }

    // Gunakan moduleIndex sebagai ID Dokumen agar data selalu update (tidak duplikat)
    db.collection('penilaian_modul')
        .doc(String(record.moduleIndex)) 
        .set(record)
        .then(() => {
            console.log("✅ Data tersimpan di Cloud Firestore");
            // Tampilkan notifikasi toast kecil (opsional)
        })
        .catch((error) => {
            console.error("Error saving document: ", error);
            alert("Gagal menyimpan ke Cloud! Cek internet.");
        });
}

// ================= DATA LOADING =================
async function loadDataFromBackup() {
    try {
        const response = await fetch('backup.json');
        dataBackup = await response.json();
        console.log("Data Backup Loaded:", dataBackup.length);
        initEvaluatorDropdown();
        renderRekap();
    } catch (err) {
        console.error("Gagal load backup.json:", err);
    }
}

// ================= LOGIKA APLIKASI UTAMA =================

function initEvaluatorDropdown() {
    const evalSelect = document.getElementById('filter-evaluator');
    const uniqueEvaluators = [...new Set(dataBackup.map(item => item.evaluator))].sort();
    
    evalSelect.innerHTML = '<option value="">-- Pilih Nama Evaluator --</option>';
    uniqueEvaluators.forEach(name => {
        if(name) {
            let opt = document.createElement('option');
            opt.value = name;
            opt.textContent = name;
            evalSelect.appendChild(opt);
        }
    });
}

function filterModulesByEvaluator() {
    const selectedEval = document.getElementById('filter-evaluator').value;
    const moduleSelect = document.getElementById('select-module');
    
    moduleSelect.innerHTML = '<option value="">-- Pilih Modul --</option>';
    document.getElementById('module-info').style.display = 'none';
    document.getElementById('form-penilaian').style.display = 'none';
    document.getElementById('preview-frame').src = "about:blank";

    if (!selectedEval) {
        moduleSelect.disabled = true;
        return;
    }

    moduleSelect.disabled = false;

    const filteredModules = dataBackup
        .map((item, index) => ({ ...item, originalIndex: index }))
        .filter(item => item.evaluator === selectedEval);

    filteredModules.forEach(item => {
        const isDone = rekapData.some(d => d.moduleIndex == item.originalIndex);
        let statusIcon = isDone ? "✅" : "⭕";
        let statusText = isDone ? "(Selesai)" : "(Belum)";
        
        let opt = document.createElement('option');
        opt.value = item.originalIndex;
        opt.textContent = `${statusIcon} ${statusText} ${item.mapel} | ${item.lesson}`;
        if(isDone) opt.style.color = "green";
        
        moduleSelect.appendChild(opt);
    });
}

function loadModuleData() {
    const idx = document.getElementById('select-module').value;
    if (idx === "") return;

    const data = dataBackup[idx];
    
    document.getElementById('module-info').style.display = 'block';
    document.getElementById('info-title').textContent = data.lesson;
    document.getElementById('info-mapel').textContent = data.mapel;
    document.getElementById('info-level').textContent = "Level " + data.level;
    document.getElementById('info-writer').textContent = data.writer;
    
    const iframe = document.getElementById('preview-frame');
    iframe.src = data.embed ? data.embed : "";

    renderFormTable(idx);
}

function renderFormTable(idx) {
    const tbody = document.getElementById('rating-tbody');
    tbody.innerHTML = ''; 
    document.getElementById('form-penilaian').style.display = 'block';

    const existingData = rekapData.find(d => d.moduleIndex == idx);

    aspekBase.forEach((aspek) => {
        const aspekName = aspek[0];
        const desc = aspek[1];
        const savedVal = existingData ? existingData.scores[aspekName] : 0;

        const row = document.createElement('tr');
        let radioCells = '';
        for (let val = 1; val <= 5; val++) {
            radioCells += `
                <td class="text-center radio-cell" onclick="selectRadio(this)">
                    <input type="radio" name="${aspekName}" value="${val}" ${savedVal == val ? 'checked' : ''}>
                </td>
            `;
        }

        row.innerHTML = `
            <td><strong>${aspekName}</strong></td>
            <td style="font-size: 0.9em; color: #666;">${desc}</td>
            ${radioCells}
        `;
        tbody.appendChild(row);
    });
}

function selectRadio(cell) {
    const radio = cell.querySelector('input[type="radio"]');
    if(radio) radio.checked = true;
}

// FUNGSI SIMPAN (Update Cloud & Local)
function saveRating() {
    const moduleIdx = document.getElementById('select-module').value;
    if (moduleIdx === "") return alert("Pilih modul dulu!");

    const moduleInfo = dataBackup[moduleIdx];
    let scores = {};
    let total = 0;
    let count = 0;
    let complete = true;

    aspekBase.forEach(a => {
        const name = a[0];
        const el = document.querySelector(`input[name="${name}"]:checked`);
        if (el) {
            const val = parseInt(el.value);
            scores[name] = val;
            total += val;
            count++;
        } else {
            complete = false;
        }
    });

    if (!complete) return alert("Mohon lengkapi penilaian di semua baris!");

    const finalScore = (total / count).toFixed(1);

    const record = {
        moduleIndex: parseInt(moduleIdx),
        evaluator: moduleInfo.evaluator,
        mapel: moduleInfo.mapel,
        lesson: moduleInfo.lesson,
        writer: moduleInfo.writer,
        scores: scores,
        finalScore: finalScore,
        timestamp: new Date().toISOString()
    };

    // 1. Update Array di Memori
    const existingIdx = rekapData.findIndex(d => d.moduleIndex == record.moduleIndex);
    if (existingIdx > -1) {
        rekapData[existingIdx] = record;
    } else {
        rekapData.push(record);
    }

    // 2. Simpan ke LocalStorage (Backup Offline)
    localStorage.setItem('rekapData_v2', JSON.stringify(rekapData));

    // 3. SIMPAN KE FIREBASE (Inti Permintaan Anda)
    saveToFirebase(record);

    alert(`Tersimpan! Skor Akhir: ${finalScore}`);
    
    // Refresh UI
    const currentEval = document.getElementById('filter-evaluator').value;
    filterModulesByEvaluator();
    document.getElementById('filter-evaluator').value = currentEval;
    document.getElementById('select-module').value = moduleIdx;
    
    renderRekap();
    renderDashboardStats();
}

// ================= REKAPAN & DASHBOARD =================
function renderRekap() {
    const tbody = document.querySelector('#rekap-table tbody');
    if(!tbody) return;
    tbody.innerHTML = '';

    dataBackup.forEach((item, index) => {
        const saved = rekapData.find(d => d.moduleIndex == index);
        const row = document.createElement('tr');
        
        let statusHtml = '<span class="badge badge-pending">Belum</span>';
        let scoreHtml = '-';
        
        if (saved) {
            statusHtml = '<span class="badge badge-success">Selesai</span>';
            scoreHtml = saved.finalScore;
        }

        row.innerHTML = `
            <td>${index + 1}</td>
            <td><strong>${item.evaluator}</strong></td>
            <td>${item.mapel}</td>
            <td>${item.level}</td>
            <td>
                <div style="font-weight:600;">${item.lesson}</div>
                <div style="font-size:0.8em; color:#888;">Ch: ${item.chapter}</div>
            </td>
            <td>${statusHtml}</td>
            <td class="text-center score-cell">${scoreHtml}</td>
        `;
        tbody.appendChild(row);
    });
    
    renderDashboardStats();
}

function renderDashboardStats() {
    const totalModules = dataBackup.length;
    const totalFinished = rekapData.length; 
    const totalPercent = totalModules === 0 ? 0 : Math.round((totalFinished / totalModules) * 100);

    const barTotal = document.getElementById('total-progress-bar');
    if(barTotal) {
        barTotal.style.width = `${totalPercent}%`;
        document.getElementById('total-progress-text').textContent = 
            `${totalFinished} dari ${totalModules} Modul Selesai (${totalPercent}%)`;
    }

    const statsMap = {}; 
    dataBackup.forEach(item => {
        const name = item.evaluator || "Tanpa Nama";
        if (!statsMap[name]) statsMap[name] = { target: 0, done: 0 };
        statsMap[name].target++;
    });

    rekapData.forEach(savedItem => {
        const masterItem = dataBackup[savedItem.moduleIndex];
        if (masterItem) {
            const name = masterItem.evaluator || "Tanpa Nama";
            if (statsMap[name]) statsMap[name].done++;
        }
    });

    const container = document.getElementById('evaluator-stats-container');
    if(!container) return;
    container.innerHTML = '';

    const sortedNames = Object.keys(statsMap).sort((a, b) => {
        const pA = statsMap[a].target ? (statsMap[a].done / statsMap[a].target) : 0;
        const pB = statsMap[b].target ? (statsMap[b].done / statsMap[b].target) : 0;
        return pB - pA;
    });

    sortedNames.forEach(name => {
        const data = statsMap[name];
        const percent = data.target === 0 ? 0 : Math.round((data.done / data.target) * 100);
        let colorClass = 'progress-high';
        if(percent < 50) colorClass = 'progress-low';
        else if(percent < 100) colorClass = 'progress-med';

        const row = document.createElement('div');
        row.className = 'eval-card';
        row.innerHTML = `
            <div class="eval-name"><i class="fas fa-user-circle"></i> ${name}</div>
            <div class="progress-container">
                <div class="progress-bar ${colorClass}" style="width: ${percent}%"></div>
            </div>
            <div class="eval-stats">${percent}% <small>${data.done}/${data.target}</small></div>
        `;
        container.appendChild(row);
    });
}

function showTab(tabName) {
    document.querySelectorAll('.tab-content').forEach(el => el.style.display = 'none');
    document.querySelectorAll('.tab-btn').forEach(el => el.classList.remove('active'));
    document.getElementById(tabName + '-tab').style.display = 'block';
    const buttons = document.querySelectorAll('.tab-btn');
    if(tabName === 'input') buttons[0].classList.add('active');
    else buttons[1].classList.add('active');
}


// ================= UPDATE EXPORT PDF =================
function exportToPDF() {
    // Cek library
    if (!window.jspdf) { 
        alert("Library PDF belum dimuat. Tunggu sebentar atau refresh."); 
        return; 
    }

    const { jsPDF } = window.jspdf;
    
    // Gunakan 'l' (landscape) agar tabel lebar muat
    const doc = new jsPDF('l', 'mm', 'a4'); 
    
    // Judul Dokumen
    doc.setFontSize(16);
    doc.text("Laporan Rekapan Penilaian Modul Digital", 14, 15);
    
    doc.setFontSize(10);
    doc.text(`Dicetak pada: ${new Date().toLocaleString()}`, 14, 22);

    // Persiapkan Data Tabel
    const tableRows = dataBackup.map((item, idx) => {
        const saved = rekapData.find(d => d.moduleIndex == idx);
        return [
            idx + 1,
            item.evaluator,
            item.mapel,
            item.level,
            item.lesson,
            item.writer,      // <--- KOLOM PENULIS DITAMBAHKAN
            saved ? saved.finalScore : "-",
            saved ? "Selesai" : "Belum"
        ];
    });

    // Generate Tabel
    doc.autoTable({
        head: [['No', 'Evaluator', 'Mapel', 'Lvl', 'Judul Modul', 'Penulis', 'Skor', 'Status']],
        body: tableRows,
        startY: 28,
        theme: 'grid',
        styles: { fontSize: 9, cellPadding: 3 },
        headStyles: { fillColor: [0, 86, 179] }, // Warna Biru Header
        columnStyles: {
            0: { cellWidth: 10 }, // No
            1: { cellWidth: 25 }, // Evaluator
            2: { cellWidth: 25 }, // Mapel
            3: { cellWidth: 15 }, // Level
            4: { cellWidth: 'auto' }, // Judul (Otomatis sisa ruang)
            5: { cellWidth: 35 }, // Penulis
            6: { cellWidth: 15, halign: 'center' }, // Skor
            7: { cellWidth: 20, halign: 'center' }  // Status
        }
    });
    
    const fileName = `Laporan_Modul_${new Date().toISOString().slice(0,10)}.pdf`;
    doc.save(fileName);
}