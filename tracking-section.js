// tracking-section.js
window.Tracking = (()=>{
  let scanner;
  let allEntries = [];
  let currentPage = 1;
  const pageSize = 10;

  function cleanName(inputName){
    if(!inputName) return '';
    return inputName.replace(/\(.*?\)/g,'').replace(/\s+/g,' ').trim().toUpperCase();
  }

  async function saveTracking(){
    const number   = document.getElementById("trackNumber").value.trim().toUpperCase();
    const name     = document.getElementById("parcelName").value.trim();
    const barangay = document.getElementById("barangay").value.trim();
    const price    = document.getElementById("price").value.trim();
    const status   = document.getElementById("trackStatus").value;
    const location = document.getElementById("trackLocation").value.trim();
    const estDate  = document.getElementById("estimatedDate").value;

    if(!number) return alert("Enter Tracking Number");

    const ref = db.collection("tracking").doc(number);
    const now = firebase.firestore.Timestamp.now();

    await db.runTransaction(async (tx)=>{
      const doc = await tx.get(ref);
      const history = doc.exists ? (doc.data().statusHistory || []) : [];
      if(status) history.push({ status, timestamp: now });
      tx.set(ref, {
        parcelName: name || (doc.exists ? doc.data().parcelName : ""),
        barangay: barangay || (doc.exists ? doc.data().barangay : ""),
        price: price || (doc.exists ? doc.data().price : ""),
        location: location || (doc.exists ? doc.data().location : ""),
        estimatedDate: estDate || (doc.exists ? doc.data().estimatedDate : ""),
        timestamp: doc.exists ? (doc.data().timestamp || now) : now,
        statusHistory: history
      }, { merge: true });
    });

    // Try awarding loyalty point if matches a registered member
    await Loyalty.tryAwardLoyaltyPoint(cleanName(name), number);

    alert("Saved.");
    loadAllEntries();
  }

  function renderEntries(){
    const search = (document.getElementById("searchInput")?.value || '').toUpperCase();
    const entriesDiv = document.getElementById("entries");
    entriesDiv.innerHTML = "";
    const filtered = allEntries.filter(e => e.id.includes(search));
    const start = (currentPage - 1) * pageSize;
    const paginated = filtered.slice(start, start + pageSize);

    if (paginated.length === 0) {
      entriesDiv.innerHTML = `<div class="card">No entries found.</div>`;
      return;
    }

    paginated.forEach(entry => {
      const timeline = (entry.statusHistory || []).map(h => {
        const date = h.timestamp ? (h.timestamp.toDate ? h.timestamp.toDate().toLocaleString() : h.timestamp.toLocaleString()) : 'N/A';
        return `- [${date}] ${h.status}`;
      }).join("<br>");
      const el = document.createElement('div');
      el.className = 'item';
      el.style.cssText = 'background:#fff;border-radius:12px;padding:12px;margin:8px 0;display:flex;justify-content:space-between;gap:10px;box-shadow:var(--shadow)';
      el.innerHTML = `
        <div>
          <div style="font-weight:700">${entry.id} ${entry.loyaltyAwarded ? '<span style="color:green;font-weight:600;margin-left:8px">(Point awarded)</span>' : ''}</div>
          <div class='meta'>
            Name: <b>${entry.parcelName||''}</b><br>
            Barangay: ${entry.barangay||''}<br>
            Location: ${entry.location||''}<br>
            Price: ₱${entry.price||''}<br>
            Estimated Delivery: ${entry.estimatedDate||''}<br>
            <b>Encoded:</b> ${entry.timestamp ? (entry.timestamp.toDate?entry.timestamp.toDate().toLocaleString():entry.timestamp.toLocaleString()) : 'N/A'}<br>
            Timeline:<div class='timeline'>${timeline}</div>
          </div>
        </div>
        <div>
          <button class='delete-btn' onclick="Tracking.deleteEntry('${entry.id}')">Delete</button>
        </div>`;
      entriesDiv.appendChild(el);
    });
  }

  function nextPage(){
    const filtered = allEntries.filter(e => e.id.includes((document.getElementById("searchInput")?.value || '').toUpperCase()));
    const totalPages = Math.ceil(filtered.length / pageSize);
    if (currentPage < totalPages) currentPage++;
    renderEntries();
  }
  function prevPage(){
    if (currentPage > 1) currentPage--;
    renderEntries();
  }

  async function deleteEntry(id){
    const confirmPass = prompt("Enter admin password to delete:");
    if (confirmPass !== window.PASSWORD) return alert("❌ Incorrect password.");
    await db.collection("tracking").doc(id).delete();
    alert("Deleted.");
  }

  function startScanner(){
    document.getElementById("scannerContainer").style.display = "block";
    scanner = new Html5Qrcode("scanner");
    scanner.start(
      { facingMode: "environment" }, { fps: 10, qrbox: 250 },
      (decodedText) => {
        document.getElementById("trackNumber").value = decodedText.trim().toUpperCase();
        stopScanner();
        printAndSave();
      },
      () => {}
    );
  }
  function stopScanner(){
    document.getElementById("scannerContainer").style.display = "none";
    if (scanner) scanner.stop().then(() => scanner.clear()).catch(()=>{});
  }

  function attachPrintHandler(){
    const printBtn = document.getElementById("printReceiptBtn");
    if(printBtn) printBtn.addEventListener("click", printAndSave);
  }

  async function printAndSave(){
    await saveTracking();
    const tn = document.getElementById("trackNumber").value.trim().toUpperCase();
    const name = document.getElementById("parcelName").value.trim();
    const price = document.getElementById("price").value.trim();
    const loc = document.getElementById("trackLocation").value.trim();
    const status = document.getElementById("trackStatus").value || '-';
    const now = new Date().toLocaleString();
    const div = document.getElementById("receiptContent");
    div.innerHTML = `
      <div style="text-align:center;font-weight:700;">JNK EXPRESS PADALA</div>
      <div style="text-align:center">Thanks for trusting us!</div>
      <hr/>
      <div>Tracking: <b>${tn}</b></div>
      <div>Name: ${name||'-'}</div>
      <div>Price: ₱${price||'-'}</div>
      <div>Location: ${loc||'-'}</div>
      <div>Status: ${status}</div>
      <div style="margin-top:6px;">Date: ${now}</div>
      <hr/>
      <div style="text-align:center">— Thank you! —</div>`;
    const w = window.open("", "printwin");
    w.document.write(`<html><head><title>Print</title></head><body>${div.innerHTML}</body></html>`);
    w.document.close();
    w.focus();
    w.print();
    w.close();
  }

  function loadAllEntries(){
    // realtime
    db.collection('tracking').orderBy('timestamp','desc').onSnapshot(snap=>{
      allEntries = snap.docs.map(d=>({ id:d.id, ...d.data(), timestamp:(d.data().timestamp?.toDate ? d.data().timestamp.toDate() : d.data().timestamp) }));
      currentPage = 1;
      renderEntries();
    });
  }

  // expose
  return {
    saveTracking, renderEntries, nextPage, prevPage, deleteEntry,
    startScanner, stopScanner, attachPrintHandler, loadAllEntries,
    get allEntries(){ return allEntries; }, set currentPage(v){ currentPage=v; }
  };
})();

document.addEventListener('DOMContentLoaded', Tracking.attachPrintHandler);
