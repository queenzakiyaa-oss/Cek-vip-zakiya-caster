import { initializeApp } from "https://www.gstatic.com/firebasejs/12.2.1/firebase-app.js";
import { getFirestore, collection, onSnapshot, query, orderBy } from "https://www.gstatic.com/firebasejs/12.2.1/firebase-firestore.js";
import { firebaseConfig } from "./firebase-config.js";

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const listEl = document.getElementById("customerList");
const searchEl = document.getElementById("searchInput");
let customers = [];

const escapeHtml = (value="") => String(value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));

function daysStored(createdAt) {
  if (!createdAt) return 0;
  const start = createdAt.toDate ? createdAt.toDate() : new Date(createdAt);
  return Math.max(0, Math.floor((Date.now() - start.getTime()) / 86400000));
}

function render() {
  const term = searchEl.value.trim().toLowerCase();
  const filtered = customers.filter(c =>
    c.name.toLowerCase().includes(term) || c.mlId.toLowerCase().includes(term)
  );

  listEl.innerHTML = filtered.length ? filtered.map(c => {
    const remaining = Number(c.totalVip || 0);
    const days = daysStored(c.createdAt);
    return `
      <article class="customer-card">
        <div class="avatar">${escapeHtml(c.name.charAt(0).toUpperCase())}</div>
        <div class="customer-main">
          <h3>${escapeHtml(c.name)}</h3>
          <small>ID ML: ${escapeHtml(c.mlId)}</small>
          <div class="vip-number">${remaining} <span>VIP</span></div>
          <div class="meta">Tersimpan ${days} hari • ${remaining > 0 ? "MASIH TERSIMPAN" : "SELESAI"}</div>
        </div>
      </article>`;
  }).join("") : `<div class="empty">VIP tidak ditemukan.</div>`;

  document.getElementById("totalVip").textContent = customers.reduce((s,c)=>s+Number(c.totalVip||0),0);
  document.getElementById("totalCustomers").textContent = customers.length;
  document.getElementById("savedCustomers").textContent = customers.filter(c=>Number(c.totalVip||0)>0).length;
}

onSnapshot(query(collection(db, "customers"), orderBy("name")), snap => {
  customers = snap.docs.map(d => ({ id:d.id, ...d.data() }));
  render();
  document.getElementById("liveStatus").textContent = "● REALTIME AKTIF";
}, err => {
  listEl.innerHTML = `<div class="empty">Database belum terhubung atau konfigurasi belum benar.</div>`;
  console.error(err);
});

searchEl.addEventListener("input", render);
