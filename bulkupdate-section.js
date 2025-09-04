// bulkupdate-section.js
window.BulkUpdate = {
  async bulkUpdateByTimeRange(){
    const fromDateStr = document.getElementById("bulkFromDate").value;
    const fromTimeStr = document.getElementById("bulkFromTime").value || "00:00";
    const toDateStr   = document.getElementById("bulkToDate").value;
    const toTimeStr   = document.getElementById("bulkToTime").value || "23:59";
    const status      = document.getElementById("bulkStatus").value;
    const location    = document.getElementById("bulkLocation").value.trim();

    if (!fromDateStr || !toDateStr || !status) return alert("Fill all date/time and status fields.");
    const fromDateTime = new Date(`${fromDateStr}T${fromTimeStr}`);
    const toDateTime   = new Date(`${toDateStr}T${toTimeStr}`);
    if (toDateTime < fromDateTime) return alert("TO date/time must be after FROM date/time.");

    const confirmPass = prompt("Enter admin password to apply bulk update:");
    if (confirmPass !== window.PASSWORD) return alert("❌ Incorrect password.");

    const fromTs = firebase.firestore.Timestamp.fromDate(fromDateTime);
    const toTs   = firebase.firestore.Timestamp.fromDate(toDateTime);

    const snapshot = await db.collection("tracking").where("timestamp", ">=", fromTs).where("timestamp", "<=", toTs).get();
    if (snapshot.empty) return alert("No entries found in selected range.");

    const batch = db.batch();
    snapshot.docs.forEach(doc => {
      const data = doc.data();
      const history = data.statusHistory || [];
      history.push({ status, timestamp: firebase.firestore.Timestamp.now() });
      batch.update(doc.ref, {
        location: location || data.location || '',
        estimatedDate: data.estimatedDate || '',
        statusHistory: history
      });
    });

    await batch.commit();
    alert(`✅ Bulk update applied to ${snapshot.size} entries.`);
  }
};
