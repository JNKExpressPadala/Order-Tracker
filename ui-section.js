// ui-section.js
// Handles tab switching and confirmation dialogs
function showTab(tab) {
  document.querySelectorAll('.tab').forEach(el => el.style.display = 'none');
  document.getElementById(tab + 'Tab').style.display = 'block';
}
console.log("UI section loaded");
