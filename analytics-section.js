// analytics-section.js
window.Analytics = (()=>{
  let chartParcels, chartRevenue, chartBarangay;

  function quickRange(kind){
    const fromEl = document.getElementById('anaFrom');
    const toEl   = document.getElementById('anaTo');
    const now = new Date();
    let from = new Date(), to = new Date();
    if(kind==='today'){ from.setHours(0,0,0,0); to.setHours(23,59,59,999); }
    else if(kind==='week'){
      const day = now.getDay();
      const diff = (day === 0 ? -6 : 1 - day);
      from = new Date(now); from.setDate(now.getDate() + diff); from.setHours(0,0,0,0);
      to = new Date(from); to.setDate(from.getDate()+6); to.setHours(23,59,59,999);
    } else {
      from = new Date(now.getFullYear(), now.getMonth(), 1);
      to   = new Date(now.getFullYear(), now.getMonth()+1, 0, 23,59,59,999);
    }
    fromEl.valueAsDate = from; toEl.valueAsDate = to;
    loadAnalytics();
  }

  async function loadAnalytics(){
    const fromEl = document.getElementById('anaFrom').value;
    const toEl = document.getElementById('anaTo').value;
    if(!fromEl || !toEl) return;

    const fromDate = new Date(fromEl); fromDate.setHours(0,0,0,0);
    const toDate = new Date(toEl); toDate.setHours(23,59,59,999);

    const fromTs = firebase.firestore.Timestamp.fromDate(fromDate);
    const toTs   = firebase.firestore.Timestamp.fromDate(toDate);

    const snap = await db.collection('tracking')
      .where('timestamp','>=', fromTs)
      .where('timestamp','<=', toTs)
      .get();

    const rows = snap.docs.map(d => {
      const x = d.data();
      return { id: d.id, name: x.parcelName||'-', barangay: x.barangay||'-', price: Number(x.price)||0, ts: x.timestamp?.toDate() || null };
    }).filter(r=>!!r.ts);

    window.__analyticsRows = rows;

    // KPIs
    const totalParcels = rows.length;
    const totalRevenue = rows.reduce((s,r)=>s+r.price,0);
    const avgPrice = totalParcels ? (totalRevenue/totalParcels) : 0;
    const nameCount = {}; rows.forEach(r=>{ nameCount[r.name]=(nameCount[r.name]||0)+1; });
    const repeatCustomers = Object.values(nameCount).filter(c=>c>1).length;
    document.getElementById('kpiParcels').innerText = totalParcels.toLocaleString();
    document.getElementById('kpiRevenue').innerText = totalRevenue.toLocaleString();
    document.getElementById('kpiAvg').innerText = avgPrice.toFixed(2);
    document.getElementById('kpiRepeat').innerText = repeatCustomers.toLocaleString();

    // Daily
    const dayMap = {};
    rows.forEach(r=>{
      const key = r.ts.toISOString().slice(0,10);
      (dayMap[key] ||= { date:key, parcels:0, revenue:0 });
      dayMap[key].parcels += 1;
      dayMap[key].revenue += r.price;
    });
    const daily = Object.values(dayMap).sort((a,b)=>a.date.localeCompare(b.date));
    window.__analyticsDaily = daily;

    // Barangay
    const barangayMap = {};
    rows.forEach(r=> barangayMap[r.barangay] = (barangayMap[r.barangay]||0)+1 );
    const barangayRows = Object.entries(barangayMap).map(([barangay,count])=>({barangay,count})).sort((a,b)=>b.count-a.count);
    window.__analyticsBarangay = barangayRows;

    // Render charts
    const ctx1 = document.getElementById('chartParcels');
    const ctx2 = document.getElementById('chartRevenue');
    const ctx3 = document.getElementById('chartBarangay');
    chartParcels && chartParcels.destroy();
    chartRevenue && chartRevenue.destroy();
    chartBarangay && chartBarangay.destroy();
    if(ctx1){
      chartParcels = new Chart(ctx1, { type:'line', data:{ labels: daily.map(d=>d.date), datasets:[{ label:'Parcels', data: daily.map(d=>d.parcels)}] } });
    }
    if(ctx2){
      chartRevenue = new Chart(ctx2, { type:'line', data:{ labels: daily.map(d=>d.date), datasets:[{ label:'Revenue', data: daily.map(d=>d.revenue)}] } });
    }
    if(ctx3){
      chartBarangay = new Chart(ctx3, { type:'bar', data:{ labels: barangayRows.map(b=>b.barangay), datasets:[{ label:'Parcels', data: barangayRows.map(b=>b.count)}] } });
      // also fill table
      const tbody = document.querySelector('#topBarangaysTable tbody'); if(tbody){ tbody.innerHTML=''; barangayRows.slice(0,10).forEach(b=>{ const tr=document.createElement('tr'); tr.innerHTML=`<td>${b.barangay}</td><td>${b.count}</td>`; tbody.appendChild(tr); }); }
    }
  }

  return { quickRange, loadAnalytics };
})();
