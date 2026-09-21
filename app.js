import { initializeApp } from "https://www.gstatic.com/firebasejs/12.2.1/firebase-app.js";
import {
  getFirestore,
  collection,
  onSnapshot,
  query,
  orderBy
} from "https://www.gstatic.com/firebasejs/12.2.1/firebase-firestore.js";

import { firebaseConfig } from "./firebase-config.js";

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const listEl = document.getElementById("customerList");
const searchEl = document.getElementById("searchInput");

let customers = [];

const escapeHtml = (value = "") =>
  String(value).replace(/[&<>"']/g, c => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;"
  }[c]));

// Hitung berapa hari VIP sudah tersimpan
function daysStored(createdAt) {
  if (!createdAt) return 0;

  const start = createdAt.toDate
    ? createdAt.toDate()
    : new Date(createdAt);

  return Math.max(
    0,
    Math.floor((Date.now() - start.getTime()) / 86400000)
  );
}

// Hitung sisa VIP
function getRemainingVip(customer) {
  const total = Number(customer.vipTotal || 0);
  const used = Number(customer.vipUsed || 0);

  return Math.max(0, total - used);
}

function render() {
  const term = searchEl.value.trim().toLowerCase();

  const filtered = customers.filter(c =>
    String(c.name || "").toLowerCase().includes(term) ||
    String(c.mlId || "").toLowerCase().includes(term)
  );

  listEl.innerHTML = filtered.length
    ? filtered.map(c => {

        const remaining = getRemainingVip(c);
        const days = daysStored(c.savedAt);

        const status = String(c.status || "").toLowerCase();

        return `
          <article class="customer-card">

            <div class="avatar">
              ${escapeHtml(
                String(c.name || "?").charAt(0).toUpperCase()
              )}
            </div>

            <div class="customer-main">

              <h3>${escapeHtml(c.name || "-")}</h3>

              <small>
                ID ML: ${escapeHtml(c.mlId || "-")}
              </small>

              <div class="vip-number">
                ${remaining}
                <span>VIP</span>
              </div>

              <div class="meta">
                Tersimpan ${days} hari •
                ${
                  remaining > 0
                    ? escapeHtml(status ? status.toUpperCase() : "MASIH TERSIMPAN")
                    : "SELESAI"
                }
              </div>

            </div>

          </article>
        `;
      }).join("")
    : `<div class="empty">VIP tidak ditemukan.</div>`;

  // TOTAL VIP DARI SEMUA CUSTOMER
  const totalVip = customers.reduce(
    (sum, c) => sum + getRemainingVip(c),
    0
  );

  // JUMLAH CUSTOMER
  const totalCustomers = customers.length;

  // TOTAL VIP YANG MASIH TERSIMPAN
  const savedVip = customers.reduce(
    (sum, c) => sum + getRemainingVip(c),
    0
  );

  document.getElementById("totalVip").textContent = totalVip;
  document.getElementById("totalCustomers").textContent = totalCustomers;
  document.getElementById("savedCustomers").textContent = savedVip;
}

// Ambil data realtime dari Firestore
onSnapshot(
  query(
    collection(db, "customers"),
    orderBy("name")
  ),

  snap => {

    customers = snap.docs.map(d => ({
      id: d.id,
      ...d.data()
    }));

    console.log("Data Firebase:", customers);

    render();

    document.getElementById("liveStatus").textContent =
      "● REALTIME AKTIF";
  },

  err => {

    console.error("Firebase error:", err);

    listEl.innerHTML = `
      <div class="empty">
        Database belum terhubung atau konfigurasi belum benar.
      </div>
    `;

    document.getElementById("liveStatus").textContent =
      "● DATABASE ERROR";
  }
);

// Pencarian realtime
searchEl.addEventListener("input", render);
