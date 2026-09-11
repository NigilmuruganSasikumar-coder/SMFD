/* ui.js — presentation glue only. script.js (calculation logic) is never modified. */

function calculateAndDisplay(){
  calculateTotal(); // defined in script.js, untouched
  revealResultPanels();
  syncExtraDisplayFields();
}

function revealResultPanels(){
  document.getElementById("breakdownDetails").style.display = "block";
  document.getElementById("summaryDetails").style.display = "block";
}

function currency(n){
  return "₹" + Math.round(n).toLocaleString("en-IN");
}

function parseCurrency(text){
  return parseInt((text || "").replace(/[^0-9-]/g, "")) || 0;
}

function syncExtraDisplayFields(){
  const depth = document.getElementById("depth").value || 0;
  const drillingTotalText = document.getElementById("drillingTotal").innerText;
  const casing7Feet = document.getElementById("casing7").value || 0;
  const casing7Rate = document.getElementById("casing7Rate").value || 0;
  const casing10Feet = document.getElementById("casing10").value || 0;
  const casing10Rate = document.getElementById("casing10Rate").value || 0;
  const casing7TotalText = document.getElementById("casing7Total").innerText;
  const casing10TotalText = document.getElementById("casing10Total").innerText;
  const gstText = document.getElementById("gstAmount").innerText;
  const grandTotalText = document.getElementById("grandTotal").innerText;

  // stat card: combined PVC cost
  const pvcTotal = parseCurrency(casing7TotalText) + parseCurrency(casing10TotalText);
  document.getElementById("pvcTotalDisplay").innerText = currency(pvcTotal);

  // breakdown table footer
  document.getElementById("totalDepthFooter").innerText = depth + " ft";
  document.getElementById("totalDrillingCostFooter").innerText = drillingTotalText;

  // estimate summary panel
  document.getElementById("summaryDrilling").innerText = drillingTotalText;
  document.getElementById("summary7pvc").innerText = `${casing7Feet} ft @ ₹${casing7Rate}`;
  document.getElementById("summary7pvcAmt").innerText = casing7TotalText;
  document.getElementById("summary10pvc").innerText = `${casing10Feet} ft @ ₹${casing10Rate}`;
  document.getElementById("summary10pvcAmt").innerText = casing10TotalText;

  const subtotal = parseCurrency(drillingTotalText) + parseCurrency(casing7TotalText) + parseCurrency(casing10TotalText);
  document.getElementById("summarySubtotal").innerText = currency(subtotal);
  document.getElementById("summaryGST").innerText = gstText;
  document.getElementById("summaryTotal").innerText = grandTotalText;

  // keep accordions open right after a fresh calculation
  document.getElementById("breakdownDetails").open = true;
  document.getElementById("summaryDetails").open = true;
}

function applyResponsiveAccordionState(){
  const narrow = window.innerWidth <= 900;
  const breakdown = document.getElementById("breakdownDetails");
  const summary = document.getElementById("summaryDetails");
  if (breakdown.style.display !== "none"){
    breakdown.open = !narrow;
    summary.open = !narrow;
  }
}

function shareOnWhatsApp(){
  const total = document.getElementById("grandTotal").innerText;
  const depth = document.getElementById("depth").value || 0;
  const name = document.getElementById("customerName").value || "there";
  const msg = `Hi ${name}, here is your borewell drilling estimate:\n` +
              `Total Depth: ${depth} ft\n` +
              `Total Estimate: ${total}\n` +
              `— Nisite Webcraft Borewell Drilling Solutions`;
  window.open("https://wa.me/?text=" + encodeURIComponent(msg), "_blank");
}

function downloadEstimateImage(){
  if (typeof html2canvas === "undefined"){
    window.print();
    return;
  }
  const target = document.querySelector(".page");
  html2canvas(target, { backgroundColor: "#080b14", scale: 2 }).then(canvas => {
    const link = document.createElement("a");
    link.download = "borewell-estimate.png";
    link.href = canvas.toDataURL("image/png");
    link.click();
  });
}

document.addEventListener("DOMContentLoaded", () => {
  document.getElementById("downloadBtn").addEventListener("click", downloadEstimateImage);
  document.getElementById("whatsappBtn").addEventListener("click", shareOnWhatsApp);
  window.addEventListener("resize", applyResponsiveAccordionState);
});