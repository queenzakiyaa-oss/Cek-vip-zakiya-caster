import { initializeApp } from "https://www.gstatic.com/firebasejs/12.2.1/firebase-app.js";

import {
  getAuth,
  signInWithEmailAndPassword,
  onAuthStateChanged,
  signOut
} from "https://www.gstatic.com/firebasejs/12.2.1/firebase-auth.js";

import {
  getFirestore,
  collection,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  onSnapshot,
  query,
  orderBy,
  serverTimestamp,
  runTransaction
} from "https://www.gstatic.com/firebasejs/12.2.1/firebase-firestore.js";

import { firebaseConfig } from "./firebase-config.js";


const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

const $ = id => document.getElementById(id);

let editingId = null;
let customers = [];
let unsubscribeCustomers = null;


// ===============================
// LOGIN
// ===============================

$("loginBtn").onclick = async () => {

  $("loginError").textContent = "";

  const email = $("email").value.trim();
  const password = $("password").value;

  if (!email || !password) {
    $("loginError").textContent = "Email dan password wajib diisi.";
    return;
  }

  try {

    await signInWithEmailAndPassword(
      auth,
      email,
      password
    );

  } catch (error) {

    console.error(error);

    $("loginError").textContent =
      "Email atau password salah.";
  }
};


// ===============================
// LOGOUT
// ===============================

$("logoutBtn").onclick = async () => {

  await signOut(auth);

};


// ===============================
// CEK STATUS LOGIN
// ===============================

onAuthStateChanged(auth, user => {

  $("loginPanel").hidden = !!user;
  $("adminPanel").hidden = !user;

  if (user) {

    startAdminRealtime();

  } else {

    if (unsubscribeCustomers) {
      unsubscribeCustomers();
      unsubscribeCustomers = null;
    }

  }

});


// ===============================
// RESET FORM
// ===============================

function resetForm() {

  editingId = null;

  $("customerForm").hidden = true;

  $("customerForm").reset();

  $("initialVip").value = 0;

  $("formTitle").textContent =
    "Tambah Customer";
}


// ===============================
// TAMBAH CUSTOMER
// ===============================

$("newCustomerBtn").onclick = () => {

  resetForm();

  $("customerForm").hidden = false;

  window.scrollTo({
    top: 0,
    behavior: "smooth"
  });

};


// ===============================
// BATAL
// ===============================

$("cancelBtn").onclick = resetForm;


// ===============================
// SIMPAN CUSTOMER
// ===============================

$("customerForm").onsubmit = async e => {

  e.preventDefault();

  const name =
    $("name").value.trim();

  const mlId =
    $("mlId").value.trim();

  const vip =
    Math.max(
      0,
      Number($("initialVip").value || 0)
    );

  const note =
    $("note").value.trim();


  try {

    // EDIT
    if (editingId) {

      await updateDoc(
        doc(db, "customers", editingId),
        {
          name,
          mlId,
          totalVip: vip,
          note,
          updatedAt: serverTimestamp()
        }
      );

    }

    // CUSTOMER BARU
    else {

      await addDoc(
        collection(db, "customers"),
        {
          name,
          mlId,
          totalVip: vip,
          note,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        }
      );

    }

    resetForm();

  } catch (error) {

    console.error(error);

    alert(
      "Gagal menyimpan data. Cek Firebase Rules."
    );

  }

};


// ===============================
// FIRESTORE REALTIME
// ===============================

function startAdminRealtime() {

  if (unsubscribeCustomers) {
    unsubscribeCustomers();
  }

  unsubscribeCustomers = onSnapshot(

    query(
      collection(db, "customers"),
      orderBy("name")
    ),

    snap => {

      customers = snap.docs.map(d => ({
        id: d.id,
        ...d.data()
      }));


      $("adminList").innerHTML =
        customers.length

        ? customers.map(c => {

            const vip =
              Number(c.totalVip || 0);

            return `

              <article class="customer-card admin-card">

                <div class="customer-main">

                  <h3>
                    ${escapeHtml(c.name || "-")}
                  </h3>

                  <small>
                    ID ML:
                    ${escapeHtml(c.mlId || "-")}
                  </small>

                  <div class="vip-number">
                    ${vip}
                    <span>VIP</span>
                  </div>


                  <div class="button-grid">

                    <button
                      data-id="${c.id}"
                      data-change="1"
                      class="plus">
                      +1
                    </button>

                    <button
                      data-id="${c.id}"
                      data-change="5"
                      class="plus">
                      +5
                    </button>

                    <button
                      data-id="${c.id}"
                      data-change="10"
                      class="plus">
                      +10
                    </button>

                    <button
                      data-id="${c.id}"
                      data-change="-1"
                      class="minus">
                      −1
                    </button>

                    <button
                      data-id="${c.id}"
                      data-change="-5"
                      class="minus">
                      −5
                    </button>

                    <button
                      data-id="${c.id}"
                      data-change="-10"
                      class="minus">
                      −10
                    </button>

                  </div>


                  <div class="form-actions">

                    <button
                      data-edit="${c.id}"
                      class="secondary">
                      Edit
                    </button>

                    <button
                      data-delete="${c.id}"
                      class="danger">
                      Hapus
                    </button>

                  </div>

                </div>

              </article>

            `;

          }).join("")

        : `
          <div class="empty">
            Belum ada customer.
          </div>
        `;


      $("adminLiveStatus").textContent =
        "● REALTIME AKTIF";

    },

    error => {

      console.error(error);

      $("adminLiveStatus").textContent =
        "● DATABASE ERROR";

    }

  );

}


// ===============================
// TOMBOL ADMIN
// ===============================

$("adminList").onclick = async e => {

  const btn =
    e.target.closest("button");

  if (!btn) return;


  // =============================
  // TAMBAH / KURANGI VIP
  // =============================

  if (
    btn.dataset.id &&
    btn.dataset.change
  ) {

    const id =
      btn.dataset.id;

    const change =
      Number(btn.dataset.change);


    try {

      await runTransaction(
        db,
        async transaction => {

          const ref =
            doc(db, "customers", id);

          const snap =
            await transaction.get(ref);

          if (!snap.exists()) {
            throw new Error(
              "Customer tidak ditemukan."
            );
          }


          const current =
            Number(
              snap.data().totalVip || 0
            );


          const newValue =
            Math.max(
              0,
              current + change
            );


          transaction.update(
            ref,
            {
              totalVip: newValue,
              updatedAt: serverTimestamp()
            }
          );

        }
      );

    } catch (error) {

      console.error(error);

      alert(
        "Gagal mengubah jumlah VIP."
      );

    }

    return;
  }


  // =============================
  // HAPUS
  // =============================

  if (btn.dataset.delete) {

    const confirmed =
      confirm(
        "Yakin ingin menghapus customer ini?"
      );

    if (!confirmed) return;


    try {

      await deleteDoc(
        doc(
          db,
          "customers",
          btn.dataset.delete
        )
      );

    } catch (error) {

      console.error(error);

      alert(
        "Gagal menghapus customer."
      );

    }

    return;
  }


  // =============================
  // EDIT
  // =============================

  if (btn.dataset.edit) {

    const c =
      customers.find(
        x => x.id === btn.dataset.edit
      );

    if (!c) return;


    editingId = c.id;

    $("formTitle").textContent =
      "Edit Customer";

    $("customerForm").hidden = false;

    $("name").value =
      c.name || "";

    $("mlId").value =
      c.mlId || "";

    $("initialVip").value =
      Number(c.totalVip || 0);

    $("note").value =
      c.note || "";


    window.scrollTo({
      top: 0,
      behavior: "smooth"
    });

  }

};


// ===============================
// SECURITY: ESCAPE HTML
// ===============================

function escapeHtml(value = "") {

  return String(value).replace(
    /[&<>"']/g,

    c => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#039;"
    }[c])
  );

}
