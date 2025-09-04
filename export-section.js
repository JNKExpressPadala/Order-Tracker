// export-section.js
window.Export = {
  exportExcelByDateRange(){
    const fromEl = document.getElementById("excelFrom").value;
    const toEl = document.getElementById("excelTo").value;
    if(!fromEl || !toEl){ alert("Please select FROM and TO dates."); return; }

    const from = new Date(fromEl);
    const to = new Date(toEl); to.setHours(23,59,59,999);

    const filtered = (Tracking.allEntries||[]).filter(entry => entry.timestamp && entry.timestamp >= from && entry.timestamp <= to);
    if (filtered.length === 0) return alert("No entries found in selected date range.");

    const aoa = [["TrackingNumber","ParcelName","Barangay","Price"]];
    filtered.forEach(e => {
      const priceNum = Number(e.price) || 0;
      aoa.push([e.id, e.parcelName || '-', e.barangay || '-', priceNum]);
    });

    const totalEntries = filtered.length;
    const totalPrice = filtered.reduce((sum, e) => sum + (Number(e.price) || 0), 0);
    aoa.push([]);
    aoa.push(["TOTAL ENTRIES", totalEntries]);
    aoa.push(["TOTAL PRICE", totalPrice]);

    const ws = XLSX.utils.aoa_to_sheet(aoa);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Tracking Data");
    XLSX.writeFile(wb, `tracking_export_${filtered.length}_items_${Date.now()}.xlsx`);
  },

  exportAnalyticsExcel(){
    if(!window.__analyticsRows){ alert("No analytics data loaded. Please refresh analytics first."); return; }
    const aoa = [];
    aoa.push(["JNK Express Padala"]);
    aoa.push([`Date Generated: ${new Date().toLocaleString()}`]);
    aoa.push([]);
    aoa.push(["Date","Tracking #","Parcel Name","Barangay","Price"]);
    window.__analyticsRows.forEach(r=>{
      aoa.push([r.ts.toLocaleDateString(), r.id, r.name, r.barangay, r.price]);
    });
    aoa.push([]); aoa.push(["Daily Summary"]);
    (window.__analyticsDaily||[]).forEach(d=> aoa.push([d.date, d.parcels, "", "", d.revenue]));
    aoa.push([]); aoa.push(["Barangay Distribution"]);
    (window.__analyticsBarangay||[]).forEach(b=> aoa.push([b.barangay, b.count]));
    aoa.push([]); aoa.push(["JNK Express Padala • Trusted Service for Lubangenos • ©2021"]);
    const ws = XLSX.utils.aoa_to_sheet(aoa);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Analytics");
    XLSX.writeFile(wb, `analytics_${Date.now()}.xlsx`);
  },

  exportAnalyticsPDF(){
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF('p','pt','a4');
    doc.setFontSize(16);
    doc.setTextColor(215, 40, 47);
    doc.text("JNK Express Padala — Analytics Dashboard", 14, 28);
    doc.setFontSize(10);
    doc.setTextColor(120,120,120);
    doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 42);

    doc.setFontSize(12); doc.setTextColor(0,0,0);
    let kpiY = 60;
    doc.text(`Total Parcels: ${document.getElementById("kpiParcels").innerText}`, 14, kpiY);
    doc.text(`Total Revenue: ₱${document.getElementById("kpiRevenue").innerText}`, 250, kpiY);
    kpiY += 14;
    doc.text(`Average Price: ₱${document.getElementById("kpiAvg").innerText}`, 14, kpiY);
    doc.text(`Repeat Customers: ${document.getElementById("kpiRepeat").innerText}`, 250, kpiY);

    // Charts
    const chart1 = document.getElementById("chartParcels");
    const chart2 = document.getElementById("chartRevenue");
    const chart3 = document.getElementById("chartBarangay");
    let yCharts = 90;
    if(chart1){ const img1 = chart1.toDataURL("image/png", 1.0); doc.addImage(img1, "PNG", 14, yCharts, 260, 160); doc.text("Daily Parcels", 14, yCharts-4); }
    if(chart2){ const img2 = chart2.toDataURL("image/png", 1.0); doc.addImage(img2, "PNG", 300, yCharts, 260, 160); doc.text("Daily Revenue", 300, yCharts-4); }
    if(chart3){ const img3 = chart3.toDataURL("image/png", 1.0); doc.addImage(img3, "PNG", 14, yCharts+180, 260, 160); doc.text("Barangay Distribution", 14, yCharts+176); }

    // Top barangays
    doc.setFontSize(12); doc.setTextColor(215, 40, 47);
    doc.text("Top Barangays", 300, yCharts+176);
    doc.setFontSize(9); doc.setTextColor(0,0,0);
    let yTable = yCharts + 186;
    const rows = (window.__analyticsBarangay || []).slice(0,8);
    rows.forEach((r, i)=>{
      doc.text(`${i+1}. ${r.barangay}`, 300, yTable + (i*12));
      doc.text(`${r.count}`, 540, yTable + (i*12), {align:"right"});
    });

    // footer
    doc.setFontSize(9); doc.setTextColor(150,150,150);
    doc.text("JNK Express Padala • Trusted Service for Lubangenos • ©2021", 14, 820);

    // filename
    const fromEl = document.getElementById("anaFrom").value;
    const toEl   = document.getElementById("anaTo").value;
    let filename = "analytics_dashboard.pdf";
    if(fromEl && toEl){ filename = `analytics_dashboard_${fromEl}_to_${toEl}.pdf`; }
    doc.save(filename);
  },

  exportProductsExcel(){
    alert("Export Products: implement as needed.");
  },

  exportLoyaltyExcel(){
    alert("Export Loyalty: implement as needed.");
  }
};
