// products-section.js
window.Products = (()=>{
  let productScanner, saleScanner;

  function startProductScanner(){
    productScanner = new Html5Qrcode("scanner");
  }
  function startSaleScanner(){
    saleScanner = new Html5Qrcode("scanner");
  }

  async function saveProduct(){
    const code = (document.getElementById('prodBarcode').value||'').trim();
    const name = (document.getElementById('prodName').value||'').trim();
    const cat  = (document.getElementById('prodCategory').value||'').trim();
    const price= Number(document.getElementById('prodPrice').value||0);
    const stock= Number(document.getElementById('prodStock').value||0);
    const notes= (document.getElementById('prodNotes').value||'').trim();
    if(!code || !name) return alert('Barcode and Name required');
    await db.collection('products').doc(code).set({ name, category:cat, price, stock, notes }, {merge:true});
    alert('Product saved');
    await loadProducts();
  }

  async function loadProducts(){
    const snap = await db.collection('products').get();
    const list = document.getElementById('productList'); list.innerHTML='';
    snap.forEach(doc=>{
      const p = doc.data();
      const div = document.createElement('div');
      div.className='item';
      div.style.cssText='background:#fff;border-radius:12px;padding:12px;margin:8px 0;display:flex;justify-content:space-between;gap:10px;box-shadow:var(--shadow)';
      div.innerHTML = `<div><b>${p.name}</b><div class="muted">${doc.id}</div><div>₱${p.price||0} • ${p.category||''}</div><div>Stock: ${p.stock||0}</div></div>`;
      list.appendChild(div);
    });
  }

  async function recordSale(){
    const code = (document.getElementById('saleBarcode').value||'').trim();
    const qty  = Number(document.getElementById('saleQty').value||1);
    const buyer= (document.getElementById('saleBuyer').value||'').trim();
    const note = (document.getElementById('saleNote').value||'').trim();
    if(!code || qty<=0) return alert('Enter product and quantity');
    const prodRef = db.collection('products').doc(code);
    await db.runTransaction(async tx=>{
      const d = await tx.get(prodRef);
      if(!d.exists) throw 'Product not found';
      const p = d.data();
      const newStock = Math.max(0, (p.stock||0) - qty);
      tx.update(prodRef, { stock:newStock });
      const sale = { code, qty, price:p.price||0, buyer, note, timestamp: firebase.firestore.Timestamp.now(), category:p.category||'' };
      tx.set(db.collection('sales').doc(), sale);
    });
    alert('Sale recorded');
    await loadSales();
  }

  async function loadSales(){
    const snap = await db.collection('sales').orderBy('timestamp','desc').limit(20).get();
    const list = document.getElementById('salesList'); list.innerHTML='';
    snap.forEach(doc=>{
      const s = doc.data();
      const div = document.createElement('div');
      div.className='item';
      const dt = s.timestamp?.toDate ? s.timestamp.toDate().toLocaleString() : new Date().toLocaleString();
      div.innerHTML = `<div><b>${s.code}</b> × ${s.qty} — ₱${(s.qty*(s.price||0)).toLocaleString()}<div class="muted">${dt}</div></div>`;
      list.appendChild(div);
    });
  }

  function quickProductRange(kind){
    const fromEl = document.getElementById('prodAnaFrom');
    const toEl   = document.getElementById('prodAnaTo');
    const now = new Date();
    let from = new Date(), to = new Date();
    if(kind==='month'){ from = new Date(now.getFullYear(), now.getMonth(), 1); to = new Date(now.getFullYear(), now.getMonth()+1, 0, 23,59,59,999); }
    else { // lastmonth
      from = new Date(now.getFullYear(), now.getMonth()-1, 1);
      to   = new Date(now.getFullYear(), now.getMonth(), 0, 23,59,59,999);
    }
    fromEl.valueAsDate = from; toEl.valueAsDate = to;
    loadProductAnalytics();
  }

  async function loadProductAnalytics(){
    const fromEl = document.getElementById('prodAnaFrom').value;
    const toEl = document.getElementById('prodAnaTo').value;
    if(!fromEl || !toEl) return;
    const from = new Date(fromEl); from.setHours(0,0,0,0);
    const to   = new Date(toEl);  to.setHours(23,59,59,999);
    const fromTs = firebase.firestore.Timestamp.fromDate(from);
    const toTs   = firebase.firestore.Timestamp.fromDate(to);
    const snap = await db.collection('sales').where('timestamp','>=',fromTs).where('timestamp','<=',toTs).get();
    const rows = snap.docs.map(d=>d.data());

    const totalSold = rows.reduce((s,r)=>s+(r.qty||0),0);
    const totalRevenue = rows.reduce((s,r)=>s+(r.qty*(r.price||0)),0);
    const avgSale = rows.length ? (totalRevenue/rows.length) : 0;
    document.getElementById('pKpiSold').innerText = totalSold.toLocaleString();
    document.getElementById('pKpiRevenue').innerText = totalRevenue.toLocaleString();
    document.getElementById('pKpiAvg').innerText = avgSale.toFixed(2);
    const catMap = {}; rows.forEach(r=> catMap[r.category] = (catMap[r.category]||0) + (r.qty||0) );
    const topCat = Object.entries(catMap).sort((a,b)=>b[1]-a[1])[0]?.[0] || '-';
    document.getElementById('pKpiTopCat').innerText = topCat;

    const topMap = {}; rows.forEach(r=> topMap[r.code] = (topMap[r.code]||0) + (r.qty||0) );
    const top = Object.entries(topMap).sort((a,b)=>b[1]-a[1]).slice(0,10);

    const c1 = document.getElementById('chartTopProducts');
    const c2 = document.getElementById('chartCategory');
    if(c1){ new Chart(c1, { type:'bar', data:{ labels: top.map(t=>t[0]), datasets:[{ label:'Qty', data: top.map(t=>t[1]) }] } }); }
    if(c2){ new Chart(c2, { type:'pie', data:{ labels: Object.keys(catMap), datasets:[{ label:'Qty', data: Object.values(catMap) }] } }); }
  }

  return { startProductScanner, startSaleScanner, saveProduct, loadProducts, recordSale, loadSales, quickProductRange, loadProductAnalytics };
})();
