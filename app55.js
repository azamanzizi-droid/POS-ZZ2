/* =========================================
   PWA: Daftar Service Worker (jika ada)
========================================= */
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('./service-worker.js')
    .then(reg => console.log('SW didaftarkan:', reg.scope))
    .catch(err => console.warn('SW gagal daftar:', err));
}

/* =========================================
   State & Persisten Data (LocalStorage)
========================================= */
let products = JSON.parse(localStorage.getItem('products') || '[]');
let sales    = JSON.parse(localStorage.getItem('sales')    || '[]');
let vendors  = JSON.parse(localStorage.getItem('vendors')  || '[]');

function saveAll() {
  localStorage.setItem('products', JSON.stringify(products));
  localStorage.setItem('sales',    JSON.stringify(sales));
  localStorage.setItem('vendors',  JSON.stringify(vendors));
}

/* =========================================
   Utiliti Ringkas
========================================= */
const RM = n => (Number(n) || 0).toFixed(2);
function byId(id){ return document.getElementById(id); }
function todayISO(){ return new Date().toISOString(); }

/* =========================================
   Navigasi Section Utama
========================================= */
function showSection(section) {
  const sections = ['home','produk','jualan','laporan','vendor','tetapan'];
  sections.forEach(sec => {
    const el = byId('section-' + sec);
    if (el) el.classList.add('hidden');
  });
  const target = byId('section-' + section);
  if (target) target.classList.remove('hidden');

  // Tukar status button aktif
  document.querySelectorAll('.nav button').forEach(b => b.classList.remove('active'));
  const btnId = 'btn' + section.charAt(0).toUpperCase() + section.slice(1);
  const btn = byId(btnId);
  if (btn) btn.classList.add('active');

  // Render awal jika masuk ke halaman tertentu
  if (section === 'produk') renderProducts();
  if (section === 'jualan') { renderProductsToSelect(); renderBasket(); }
  if (section === 'vendor') renderVendors();
  if (section === 'laporan') initLaporanOnce();
}
window.showSection = showSection;

/* =========================================
   PRODUK
   (padan dengan #productForm, #productTable)
========================================= */
const productForm = byId('productForm');
if (productForm){
  productForm.addEventListener('submit', e => {
    e.preventDefault();
    const product = {
      code:         byId('productCode').value.trim(),
      name:         byId('productName').value.trim(),
      price:        parseFloat(byId('productPrice').value),
      vendorPrice:  parseFloat(byId('productVendorPrice').value),
      commission:   parseFloat(byId('productCommission').value),
      stock:        parseInt(byId('productStock').value || '0', 10)
    };
    if (!product.code || !product.name) return alert('Kod & Nama produk wajib diisi');
    if (products.some(p => p.code === product.code)) return alert('Kod produk telah wujud');

    products.push(product);
    saveAll();
    renderProducts();
    renderProductsToSelect();
    productForm.reset();
  });
}

function renderProducts(){
  const tbody = document.querySelector('#productTable tbody');
  if (!tbody) return;
  tbody.innerHTML = '';
  products.forEach((p, i) => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${p.code}</td>
      <td>${p.name}</td>
      <td>${RM(p.price)}</td>
      <td>${RM(p.vendorPrice)}</td>
      <td>${RM(p.commission)}</td>
      <td>${p.stock}</td>
      <td>
        <button onclick="deleteProduct(${i})">Padam</button>
      </td>
    `;
    tbody.appendChild(tr);
  });
}
window.deleteProduct = function(i){
  if (!confirm('Padam produk ini?')) return;
  products.splice(i,1);
  saveAll();
  renderProducts();
  renderProductsToSelect();
};

function renderProductsToSelect(){
  const sel = byId('salesProductSelect');
  if (!sel) return;
  sel.innerHTML = '';
  products.forEach((p, i) => {
    const opt = document.createElement('option');
    opt.value = String(i);
    opt.textContent = `${p.name} (RM${RM(p.price)})`;
    sel.appendChild(opt);
  });
}

/* =========================================
   VENDOR
   (padan dengan #vendorForm, #vendorTable)
   vendors: [{name, productCode}]
========================================= */
const vendorForm = byId('vendorForm');
if (vendorForm){
  vendorForm.addEventListener('submit', e => {
    e.preventDefault();
    const name = byId('vendorName').value.trim();
    const productCode = byId('vendorProduk').value.trim();
    if (!name || !productCode) return alert('Isi nama vendor & kod produk');
    vendors.push({ name, productCode });
    saveAll();
    renderVendors();
    vendorForm.reset();
  });
}

function renderVendors(){
  const tbody = document.querySelector('#vendorTable tbody');
  if (!tbody) return;
  tbody.innerHTML = '';
  vendors.forEach((v, i) => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${v.name}</td>
      <td>${v.productCode}</td>
      <td><button onclick="deleteVendor(${i})">Padam</button></td>
    `;
    tbody.appendChild(tr);
  });
}
window.deleteVendor = function(i){
  if (!confirm('Padam vendor ini?')) return;
  vendors.splice(i,1);
  saveAll();
  renderVendors();
};

/* =========================================
   JUALAN & RESIT
   (padan dengan #salesForm, #basketTableBody,
    #basketTotal, #paymentReceived, #receiptModal)
========================================= */
let basket = [];

window.addToBasket = function(){
  const sel = byId('salesProductSelect');
  const qtyInput = byId('salesQty');
  if (!sel || !qtyInput) return;

  const idx = parseInt(sel.value, 10);
  const qty = parseInt(qtyInput.value || '1', 10);
  const p = products[idx];
  if (!p) return alert('Sila pilih produk');
  if (qty <= 0) return alert('Kuantiti mesti > 0');

  basket.push({
    code: p.code, name: p.name,
    price: p.price, commission: p.commission,
    qty
  });
  renderBasket();
};

function renderBasket(){
  const tbody = byId('basketTableBody');
  const totalEl = byId('basketTotal');
  if (!tbody || !totalEl) return;

  tbody.innerHTML = '';
  let total = 0;
  basket.forEach((item, i) => {
    const jumlah = item.qty * item.price;
    total += jumlah;
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${item.name}</td>
      <td>${item.qty}</td>
      <td>${RM(item.price)}</td>
      <td>${RM(jumlah)}</td>
      <td><button onclick="removeBasket(${i})">Padam</button></td>
    `;
    tbody.appendChild(tr);
  });
  totalEl.textContent = 'RM' + RM(total);
}
window.removeBasket = function(i){
  basket.splice(i,1);
  renderBasket();
};

window.processPayment = function(){
  if (basket.length === 0) return alert('Bakul kosong');
  const pay = parseFloat(byId('paymentReceived').value);
  const total = basket.reduce((s,i)=> s + i.qty * i.price, 0);
  if (isNaN(pay) || pay < total) return alert('Bayaran tidak mencukupi');

  const sale = {
    datetime: todayISO(),
    items: JSON.parse(JSON.stringify(basket)),
    total,
    received: pay,
    change: pay - total
  };
  sales.push(sale);
  saveAll();

  // Kurangkan stok (jika mahu)
  basket.forEach(bi => {
    const p = products.find(x => x.code === bi.code);
    if (p) p.stock = Math.max(0, (p.stock || 0) - bi.qty);
  });
  saveAll();

  // Reset UI
  basket = [];
  renderBasket();
  byId('paymentReceived').value = '';

  // Tunjuk resit
  showReceipt(sale);
};

function showReceipt(sale){
  const modal = byId('receiptModal');
  const content = byId('receiptContent');
  if (!modal || !content) return;

  const lines = sale.items.map(i => `
    <tr>
      <td>${i.name}</td>
      <td>${i.qty}</td>
      <td>${RM(i.price)}</td>
      <td>${RM(i.qty * i.price)}</td>
    </tr>`).join('');

  content.innerHTML = `
    <div class="receipt">
      <h3 style="margin:0">Zubaidajanai Enterprise</h3>
      <div>${new Date(sale.datetime).toLocaleString()}</div>
      <hr/>
      <table class="receipt-table">
        <thead>
          <tr><th>Item</th><th>Qty</th><th>Harga</th><th>Jumlah</th></tr>
        </thead>
        <tbody>${lines}</tbody>
      </table>
      <hr/>
      <div><strong>Total: RM${RM(sale.total)}</strong></div>
      <div>Diterima: RM${RM(sale.received)}</div>
      <div>Baki: RM${RM(sale.change)}</div>
    </div>
  `;
  modal.classList.remove('hidden');
}
window.closeReceipt = function(){
  const modal = byId('receiptModal');
  if (modal) modal.classList.add('hidden');
};

window.downloadReceipt = function(){
  const { jsPDF } = window.jspdf || {};
  if (!jsPDF) return alert('jsPDF belum dimuatkan');
  const doc = new jsPDF();
  const html = byId('receiptContent');
  doc.text('Resit Pembayaran', 14, 12);
  // Ringkas – jika mahu penuh, boleh guna html() renderer (bergantung versi) atau autotable
  doc.save('resit.pdf');
};

/* Export PDF dari halaman Jualan (bakul semasa) */
window.exportPDF = function(){
  const { jsPDF } = window.jspdf || {};
  if (!jsPDF) return alert('jsPDF belum dimuatkan');
  const doc = new jsPDF();
  doc.text('Senarai Bakul Semasa', 14, 12);

  const rows = basket.map(i => [i.name, i.qty, RM(i.price), RM(i.qty * i.price)]);
  if (rows.length === 0) rows.push(['(Tiada item)', '-', '-', '-']);

  doc.autoTable({
    head: [['Produk','Qty','Harga (RM)','Jumlah (RM)']],
    body: rows,
    startY: 20
  });
  doc.save('bakul-semasa.pdf');
};

/* =========================================
   LAPORAN (Harian, Vendor, Stok)
   (padan dengan #section-laporan, subnav)
========================================= */
let laporanInited = false;
function initLaporanOnce(){
  if (laporanInited) return;
  laporanInited = true;

  // Sediakan UI untuk panel Harian/Vendor/Stok
  const pnlH = byId('laporanPanelHarian');
  if (pnlH && !pnlH.dataset.ready){
    // Elemen input tarikh sudah ada dalam HTML anda; hanya tandakan ready
    pnlH.dataset.ready = '1';
  }

  const pnlV = byId('laporanPanelVendor');
  if (pnlV && !pnlV.dataset.ready){
    pnlV.innerHTML = `
      <h2>Laporan Vendor</h2>
      <div class="filter-form">
        <label>
          Pilih Vendor:
          <select id="vendorFilter"></select>
        </label>
        <button type="button" onclick="filterLaporanVendor()">Tapis</button>
        <button type="button" onclick="exportVendorPDF()" class="bg-blue-600 text-white px-3 py-1 rounded">📄 Export PDF</button>
      </div>
      <div id="laporanVendorContent" style="margin-top:8px;"></div>
    `;
    pnlV.dataset.ready = '1';
    populateVendorFilter();
  }

  const pnlS = byId('laporanPanelStok');
  if (pnlS && !pnlS.dataset.ready){
    pnlS.innerHTML = `
      <h2>Laporan Baki Item Tidak Terjual</h2>
      <div class="filter-form">
        <button type="button" onclick="generateBakiStok()">Jana Laporan</button>
        <button type="button" onclick="exportStokPDF()" class="bg-blue-600 text-white px-3 py-1 rounded">📄 Export PDF</button>
      </div>
      <div id="laporanStokContent" style="margin-top:8px;"></div>
    `;
    pnlS.dataset.ready = '1';
  }

  // Default buka panel Harian bila masuk ke Laporan
  showSubLaporan('harian');
}
window.showSubLaporan = function(which){
  const map = {harian:'laporanPanelHarian', vendor:'laporanPanelVendor', stok:'laporanPanelStok'};
  Object.values(map).forEach(id => {
    const el = byId(id);
    if (el) el.classList.add('hidden');
  });
  const tgt = byId(map[which]);
  if (tgt) tgt.classList.remove('hidden');

  // Auto-render kandungan kali pertama
  if (which === 'vendor') { populateVendorFilter(); filterLaporanVendor(); }
  if (which === 'stok')   { generateBakiStok(); }
};

/* ---------- Laporan Harian ---------- */
window.filterLaporanHarian = function(){
  const startDate = byId('startDate')?.value;
  const endDate   = byId('endDate')?.value;
  const container = byId('laporanHarianContent');
  if (!container) return;

  container.innerHTML = '';
  if (!startDate || !endDate){
    container.innerHTML = "<p style='color:red'>Sila pilih tarikh mula & akhir.</p>";
    return;
  }
  const start = new Date(startDate);
  const end   = new Date(endDate); end.setHours(23,59,59,999);

  const filtered = sales.filter(s => {
    const d = new Date(s.datetime);
    return d >= start && d <= end;
  });

  if (filtered.length === 0){
    container.innerHTML = "<p>Tiada jualan dalam julat tarikh ini.</p>";
    return;
  }

  let total = 0, totalKomisen = 0, totalItem = 0;
  const rows = filtered.map(s => {
    const bilItem = s.items.reduce((sum,i)=> sum + i.qty, 0);
    const komisen = s.items.reduce((sum,i)=> sum + (Number(i.commission)||0)*i.qty, 0);
    total += s.total; totalKomisen += komisen; totalItem += bilItem;
    return `
      <tr>
        <td>${new Date(s.datetime).toLocaleString()}</td>
        <td>${bilItem}</td>
        <td>${RM(s.total)}</td>
        <td>${RM(komisen)}</td>
      </tr>`;
  }).join('');

  container.innerHTML = `
    <table border="1" cellpadding="5" cellspacing="0">
      <thead>
        <tr><th>Tarikh & Masa</th><th>Bil. Item</th><th>Jumlah (RM)</th><th>Komisen (RM)</th></tr>
      </thead>
      <tbody>
        ${rows}
        <tr style="font-weight:bold">
          <td>Jumlah Keseluruhan</td>
          <td>${totalItem}</td>
          <td>${RM(total)}</td>
          <td>${RM(totalKomisen)}</td>
        </tr>
      </tbody>
    </table>
  `;
};

window.exportHarianPDF = function(){
  const startDate = byId('startDate')?.value;
  const endDate   = byId('endDate')?.value;
  if (!startDate || !endDate) return alert('Sila pilih tarikh dahulu');

  const start = new Date(startDate);
  const end   = new Date(endDate); end.setHours(23,59,59,999);
  const filtered = sales.filter(s => {
    const d = new Date(s.datetime);
    return d >= start && d <= end;
  });

  const { jsPDF } = window.jspdf || {};
  if (!jsPDF) return alert('jsPDF belum dimuatkan');
  const doc = new jsPDF();
  doc.text('Laporan Jualan Harian', 14, 15);
  doc.text(`Julat Tarikh: ${startDate} hingga ${endDate}`, 14, 23);

  let total = 0, totalKomisen = 0, totalItem = 0;
  const body = filtered.map(s => {
    const bilItem = s.items.reduce((sum,i)=> sum + i.qty, 0);
    const komisen = s.items.reduce((sum,i)=> sum + (Number(i.commission)||0)*i.qty, 0);
    total += s.total; totalKomisen += komisen; totalItem += bilItem;
    return [new Date(s.datetime).toLocaleString(), bilItem, RM(s.total), RM(komisen)];
  });

  if (filtered.length){
    body.push(['Jumlah Keseluruhan', totalItem, RM(total), RM(totalKomisen)]);
  } else {
    body.push(['(Tiada transaksi)', '-', '-', '-']);
  }

  doc.autoTable({
    head: [['Tarikh & Masa','Bil. Item','Jumlah (RM)','Komisen (RM)']],
    body,
    startY: 30
  });
  doc.save('laporan-harian.pdf');
};

/* ---------- Laporan Vendor ---------- */
function populateVendorFilter(){
  const sel = byId('vendorFilter');
  if (!sel) return;

  const names = Array.from(new Set(vendors.map(v => v.name))).sort();
  sel.innerHTML = '<option value="">-- Pilih Vendor --</option>';
  names.forEach(n => {
    const opt = document.createElement('option');
    opt.value = n; opt.textContent = n;
    sel.appendChild(opt);
  });
}

window.filterLaporanVendor = function(){
  const vendorName = byId('vendorFilter')?.value;
  const content = byId('laporanVendorContent');
  if (!content) return;
  content.innerHTML = '';

  if (!vendorName){
    content.innerHTML = "<p style='color:red'>Sila pilih vendor.</p>";
    return;
  }

  // Produk yang dipegang vendor ini (berdasarkan padanan vendors.productCode)
  const codes = vendors.filter(v => v.name === vendorName).map(v => v.productCode);
  const vendorProducts = products.filter(p => codes.includes(p.code));

  if (vendorProducts.length === 0){
    content.innerHTML = "<p>Tiada produk untuk vendor ini.</p>";
    return;
  }

  let totalJualan = 0, totalKomisen = 0;
  const rows = vendorProducts.map(p => {
    let qty=0, jualan=0, komisen=0;
    sales.forEach(s => s.items.forEach(i => {
      if (i.code === p.code){
        qty += i.qty;
        jualan += i.qty * i.price;
        komisen += (Number(i.commission)||0) * i.qty;
      }
    }));
    totalJualan += jualan; totalKomisen += komisen;
    return `
      <tr>
        <td>${p.code}</td>
        <td>${p.name}</td>
        <td>${qty}</td>
        <td>${RM(jualan)}</td>
        <td>${RM(komisen)}</td>
      </tr>`;
  }).join('');

  content.innerHTML = `
    <table border="1" cellpadding="5" cellspacing="0">
      <thead>
        <tr><th>Kod</th><th>Produk</th><th>Kuantiti Jual</th><th>Jumlah Jualan (RM)</th><th>Komisen (RM)</th></tr>
      </thead>
      <tbody>
        ${rows}
        <tr style="font-weight:bold">
          <td colspan="3">Jumlah Keseluruhan</td>
          <td>${RM(totalJualan)}</td>
          <td>${RM(totalKomisen)}</td>
        </tr>
      </tbody>
    </table>
  `;
};

window.exportVendorPDF = function(){
  const vendorName = byId('vendorFilter')?.value;
  if (!vendorName) return alert('Sila pilih vendor dahulu');

  const codes = vendors.filter(v => v.name === vendorName).map(v => v.productCode);
  const vendorProducts = products.filter(p => codes.includes(p.code));

  const { jsPDF } = window.jspdf || {};
  if (!jsPDF) return alert('jsPDF belum dimuatkan');
  const doc = new jsPDF();
  doc.text('Laporan Jualan Vendor', 14, 15);
  doc.text(`Vendor: ${vendorName}`, 14, 23);

  let totalJualan = 0, totalKomisen = 0;
  const body = vendorProducts.map(p => {
    let qty=0, jualan=0, komisen=0;
    sales.forEach(s => s.items.forEach(i => {
      if (i.code === p.code){
        qty += i.qty;
        jualan += i.qty * i.price;
        komisen += (Number(i.commission)||0) * i.qty;
      }
    }));
    totalJualan += jualan; totalKomisen += komisen;
    return [p.code, p.name, qty, RM(jualan), RM(komisen)];
  });

  if (body.length){
    body.push(['Jumlah Keseluruhan','', '', RM(totalJualan), RM(totalKomisen)]);
  } else {
    body.push(['(Tiada data)', '-', '-', '-', '-']);
  }

  doc.autoTable({
    head: [['Kod','Produk','Kuantiti Jual','Jumlah Jualan (RM)','Komisen (RM)']],
    body,
    startY: 30
  });
  doc.save('laporan-vendor.pdf');
};

/* ---------- Laporan Stok ---------- */
window.generateBakiStok = function(){
  const content = byId('laporanStokContent');
  if (!content) return;
  if (products.length === 0){
    content.innerHTML = '<p>Tiada produk direkodkan.</p>';
    return;
  }

  const rows = products.map(p => {
    let jual = 0;
    sales.forEach(s => s.items.forEach(i => {
      if (i.code === p.code) jual += i.qty;
    }));
    const baki = (p.stock || 0) - jual;
    // Cari vendor untuk produk ini (mungkin ramai; ambil yang pertama)
    const vRec = vendors.find(v => v.productCode === p.code);
    const vName = vRec ? vRec.name : '-';
    return `
      <tr>
        <td>${p.code}</td>
        <td>${p.name}</td>
        <td>${vName}</td>
        <td>${p.stock || 0}</td>
        <td>${jual}</td>
        <td>${baki}</td>
      </tr>`;
  }).join('');

  content.innerHTML = `
    <table border="1" cellpadding="5" cellspacing="0">
      <thead>
        <tr><th>Kod</th><th>Produk</th><th>Vendor</th><th>Stok Asal</th><th>Telah Dijual</th><th>Baki Stok</th></tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>
  `;
};

window.exportStokPDF = function(){
  const { jsPDF } = window.jspdf || {};
  if (!jsPDF) return alert('jsPDF belum dimuatkan');
  const doc = new jsPDF();
  doc.text('Laporan Baki Stok', 14, 15);

  const body = products.map(p => {
    let jual = 0;
    sales.forEach(s => s.items.forEach(i => {
      if (i.code === p.code) jual += i.qty;
    }));
    const baki = (p.stock || 0) - jual;
    const vRec = vendors.find(v => v.productCode === p.code);
    const vName = vRec ? vRec.name : '-';
    return [p.code, p.name, vName, p.stock || 0, jual, baki];
  });

  if (body.length === 0) body.push(['(Tiada data)','-','-','-','-','-']);

  doc.autoTable({
    head: [['Kod','Produk','Vendor','Stok Asal','Telah Dijual','Baki Stok']],
    body,
    startY: 22
  });
  doc.save('laporan-stok.pdf');
};

/* =========================================
   TETAPAN: Dialog Pengesahan & Backup
========================================= */
window.showConfirmation = function(type){
  const dlg = byId('confirmationDialog');
  if (!dlg) return;
  dlg.style.display = 'block';
  dlg.dataset.type = type;
};
window.hideConfirmation = function(){
  const dlg = byId('confirmationDialog');
  if (dlg) dlg.style.display = 'none';
};
window.confirmAction = function(){
  const dlg = byId('confirmationDialog');
  if (!dlg) return;
  const t = dlg.dataset.type;
  if (t === 'sales')   sales = [];
  if (t === 'products') products = [];
  if (t === 'vendors') vendors = [];
  if (t === 'all'){ sales = []; products = []; vendors = []; }
  saveAll();
  renderProducts();
  renderVendors();
  hideConfirmation();
  alert('Data telah dikosongkan.');
};

window.exportAllData = function(){
  const backup = { products, sales, vendors };
  const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = 'backup-pos.json'; a.click();
  setTimeout(()=> URL.revokeObjectURL(url), 1000);
};

window.importData = function(){
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = 'application/json';
  input.onchange = e => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try{
        const data = JSON.parse(reader.result);
        products = data.products || [];
        sales    = data.sales    || [];
        vendors  = data.vendors  || [];
        saveAll();
        renderProducts();
        renderVendors();
        alert('Data berjaya dipulihkan.');
      }catch(err){
        alert('Fail tidak sah.');
      }
    };
    reader.readAsText(file);
  };
  input.click();
};

/* =========================================
   INIT (panggil pada load)
========================================= */
document.addEventListener('DOMContentLoaded', () => {
  renderProducts();
  renderProductsToSelect();
  renderVendors();
  // Jika mula di Halaman Laporan, sediakan UI
  if (byId('section-laporan') && !byId('section-laporan').classList.contains('hidden')){
    initLaporanOnce();
  }
});

