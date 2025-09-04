// loyalty-section.js
window.Loyalty = (()=>{
  let loyaltyScanner;
  let loyaltyCache = [];
  function startLoyaltyScanner(){
    document.getElementById("loyaltyScannerContainer").style.display = "block";
    loyaltyScanner = new Html5Qrcode("loyaltyScanner");
    loyaltyScanner.start({facingMode:'environment'},{fps:10,qrbox:250}, (decodedText)=>{
      document.getElementById("loyCardId").value = decodedText.trim();
      stopLoyaltyScanner();
    }, ()=>{});
  }
  function stopLoyaltyScanner(){
    document.getElementById("loyaltyScannerContainer").style.display = "none";
    if (loyaltyScanner) loyaltyScanner.stop().then(()=>loyaltyScanner.clear()).catch(()=>{});
  }

  function cleanName(s){ return (s||'').replace(/\(.*?\)/g,'').replace(/\s+/g,' ').trim().toUpperCase(); }

  async function registerLoyalty(){
    const id = (document.getElementById('loyCardId').value||'').trim();
    const name = (document.getElementById('loyName').value||'').trim();
    const phone = (document.getElementById('loyPhone').value||'').trim();
    const address = (document.getElementById('loyAddress').value||'').trim();
    if(!id || !name) return alert('Card ID and Name are required');
    await db.collection('loyalty').doc(id).set({ name, phone, address, points:0, pointsHistory:[] }, {merge:true});
    alert('Registered.');
    await loadLoyaltyMembers();
  }

  async function loadLoyaltyMembers(){
    const snap = await db.collection('loyalty').get();
    loyaltyCache = snap.docs.map(d=>({ id:d.id, ...d.data() }));
    renderLoyaltyList();
  }

  function renderLoyaltyList(){
    const q = (document.getElementById('loySearch').value||'').trim().toUpperCase();
    const list = document.getElementById('loyaltyList'); list.innerHTML='';
    loyaltyCache
      .filter(m => [m.id, m.name?.toUpperCase(), m.phone?.toUpperCase()].some(v => (v||'').includes(q)))
      .forEach(m=>{
        const div = document.createElement('div');
        div.className='item';
        div.style.cssText='background:#fff;border-radius:12px;padding:12px;margin:8px 0;display:flex;justify-content:space-between;gap:10px;box-shadow:var(--shadow)';
        div.innerHTML = `<div><b>${m.name}</b><div class="muted">${m.id}</div><div>Phone: ${m.phone||'-'}</div><div>Points: ${m.points||0}</div></div>
                         <div><button onclick="Loyalty.openLoyaltyDetails('${m.id}')">Details</button>
                         <button class="delete-btn" onclick="Loyalty.promptAdjustPoints('${m.id}')">Adjust</button></div>`;
        list.appendChild(div);
      });
  }

  async function openLoyaltyDetails(cardId){
    const doc = await db.collection('loyalty').doc(cardId).get();
    if(!doc.exists) return alert('Member not found.');
    const d = doc.data();
    const h = (d.pointsHistory || []).slice().reverse().map(h=> {
      const t = h.timestamp && h.timestamp.toDate ? h.timestamp.toDate().toLocaleString() : (h.timestamp ? new Date(h.timestamp).toLocaleString() : '-');
      return `${t} • ${h.type} ${h.amount} (${h.reason || ''})`;
    }).join('\n') || 'No history.';
    alert(`Name: ${d.name}\nPhone: ${d.phone}\nAddress: ${d.address}\nPoints: ${d.points || 0}\n\nHistory:\n${h}`);
  }

  async function promptAdjustPoints(cardId){
    const pass = prompt('Enter admin password to adjust points:');
    if(pass !== window.PASSWORD) return alert('Incorrect password.');
    const deltaStr = prompt('Enter points to add (positive) or deduct (negative), e.g. 1 or -1:');
    if(!deltaStr) return;
    const delta = Number(deltaStr);
    if(isNaN(delta) || delta === 0) return alert('Invalid number.');
    const reason = prompt('Reason (optional):') || 'Manual adjustment';
    await adjustPoints(cardId, delta, reason);
    alert('Points adjusted.');
  }

  async function adjustPoints(cardId, delta, reason){
    const now = firebase.firestore.Timestamp.now();
    const ref = db.collection('loyalty').doc(cardId);
    await db.runTransaction(async (tx)=>{
      const doc = await tx.get(ref);
      if(!doc.exists) throw 'Member not found';
      const cur = doc.data().points || 0;
      const newPoints = Math.max(0, cur + delta);
      const history = doc.data().pointsHistory || [];
      history.push({ type: delta>0 ? 'manual-add' : 'manual-deduct', amount: delta, reason, timestamp: now });
      tx.update(ref, { points: newPoints, pointsHistory: history });
    });
    await loadLoyaltyMembers();
  }

  async function tryAwardLoyaltyPoint(cleanedName, trackingNumber){
    if(!cleanedName) return;
    if(loyaltyCache.length===0){ await loadLoyaltyMembers(); }
    const member = loyaltyCache.find(m => m.name && m.name.toUpperCase() === cleanedName);
    if(!member) return;
    const ref = db.collection('loyalty').doc(member.id);
    const now = firebase.firestore.Timestamp.now();
    await db.runTransaction(async tx=>{
      const doc = await tx.get(ref);
      if(!doc.exists) return;
      const cur = doc.data().points || 0;
      const history = doc.data().pointsHistory || [];
      history.push({ type:'auto-award', amount:1, reason:`Parcel ${trackingNumber}`, timestamp: now });
      tx.update(ref, { points: cur+1, pointsHistory: history });
    });
  }

  return { startLoyaltyScanner, stopLoyaltyScanner, registerLoyalty, loadLoyaltyMembers, renderLoyaltyList, openLoyaltyDetails, promptAdjustPoints, tryAwardLoyaltyPoint };
})();
