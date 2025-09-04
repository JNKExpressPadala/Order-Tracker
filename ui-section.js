// ui-section.js
window.APP = {
  USERNAME: "JNK",
  PASSWORD: "11223344$",
  login(){
    const user = document.getElementById("username").value.trim();
    const pass = document.getElementById("password").value.trim();
    const msg = document.getElementById("loginMessage");
    msg.innerText = "";
    if(user===this.USERNAME && pass===this.PASSWORD){
      document.getElementById("loginSection").style.display = "none";
      document.getElementById("appSection").style.display = "block";
      UI.showTab('manage');
      Tracking.loadAllEntries();
      Analytics.quickRange('month');
      Products.loadProducts();
      Products.quickProductRange('month');
      Loyalty.loadLoyaltyMembers();
    }else{
      msg.innerText = "Invalid login.";
    }
  },
  logout(){
    document.getElementById("loginSection").style.display = "block";
    document.getElementById("appSection").style.display = "none";
    document.getElementById("username").value = "";
    document.getElementById("password").value = "";
  }
};

window.UI = {
  showTab(which){
    const m = document.getElementById('manageSection');
    const a = document.getElementById('analyticsSection');
    const p = document.getElementById('productsSection');
    const l = document.getElementById('loyaltySection');
    const bm = document.getElementById('tabManageBtn');
    const ba = document.getElementById('tabAnalyticsBtn');
    const bp = document.getElementById('tabProductsBtn');
    const bl = document.getElementById('tabLoyaltyBtn');
    [m,a,p,l].forEach(el=>el.classList.remove('show'));
    [bm,ba,bp,bl].forEach(b=>b.classList.remove('active'));
    if(which==='manage'){ m.classList.add('show'); bm.classList.add('active'); }
    else if(which==='analytics'){ a.classList.add('show'); ba.classList.add('active'); Analytics.loadAnalytics(); }
    else if(which==='products'){ p.classList.add('show'); bp.classList.add('active'); Products.loadProducts(); Products.quickProductRange('month'); }
    else if(which==='loyalty'){ l.classList.add('show'); bl.classList.add('active'); Loyalty.renderLoyaltyList(); }
  }
};

// expose password for legacy calls
window.PASSWORD = APP.PASSWORD;
