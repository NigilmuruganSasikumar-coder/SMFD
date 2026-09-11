// =========================================
// Selvamurugan Fast Drills
// quotation.js
// PART 1
// =========================================

window.onload = function () {

    const data = JSON.parse(localStorage.getItem("quotationData"));

    if (!data) {

        alert("No quotation data found.");

        window.close();

        return;

    }

    // =====================================
    // BASIC VALUES
    // =====================================

    const customerName = data.customerName || "-";
    const customerPhone = data.customerPhone || "-";

    const mode = data.mode;

    const depth = parseInt(data.depth) || 0;
    const baseRate = parseInt(data.baseRate) || 0;

    const reboreFeet = parseInt(data.reboreFeet) || 0;
    const reboreRate = parseInt(data.reboreRate) || 0;

    const casing7Feet = parseInt(data.casing7) || 0;
    const casing7Rate = parseInt(data.casing7Rate) || 0;

    const casing10Feet = parseInt(data.casing10) || 0;
    const casing10Rate = parseInt(data.casing10Rate) || 0;

    const gstEnabled = data.gst;

    // =====================================
    // DATE
    // =====================================

    const today = new Date();

    const currentDate =
        String(today.getDate()).padStart(2, "0") + "/" +
        String(today.getMonth() + 1).padStart(2, "0") + "/" +
        today.getFullYear();

    // =====================================
    // PDF SETUP
    // =====================================

    const { jsPDF } = window.jspdf;

    const pdf = new jsPDF({

        orientation: "portrait",
        unit: "mm",
        format: "a4"

    });

    const pageWidth = 210;
    const pageHeight = 297;

    let y = 15;

    // =====================================
    // HEADER
    // =====================================

    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(20);

    pdf.text("SELVAMURUGAN FAST DRILLS", 105, y, {
        align: "center"
    });

    y += 8;

    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(11);

    pdf.text("3/46 Kumaramangalam Pudhur", 105, y, {
        align: "center"
    });

    y += 5;

    pdf.text("(Erode - Namakkal Bypass Road)", 105, y, {
        align: "center"
    });

    y += 5;

    pdf.text("Tiruchengode, Namakkal", 105, y, {
        align: "center"
    });

    y += 5;

    pdf.text("+91 97887 99883 | +91 94432 88845", 105, y, {
        align: "center"
    });

    y += 12;

    // =====================================
    // TITLE
    // =====================================

    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(17);

    pdf.text("BOREWELL QUOTATION", 105, y, {
        align: "center"
    });

    y += 15;

    // =====================================
    // CUSTOMER DETAILS
    // =====================================

    pdf.setFontSize(12);
    pdf.setFont("helvetica", "bold");

    pdf.text("Customer Information", 15, y);

    y += 8;

    pdf.setFont("helvetica", "normal");

    pdf.text("Name :", 15, y);
    pdf.text(customerName, 50, y);

    y += 7;

    pdf.text("Phone :", 15, y);
    pdf.text(customerPhone, 50, y);

    y += 12;

    // =====================================
    // DRILLING DETAILS
    // =====================================

    pdf.setFont("helvetica", "bold");

    pdf.text("Drilling Details", 15, y);

    y += 8;

    pdf.setFont("helvetica", "normal");

    pdf.text("Mode", 15, y);
    pdf.text(mode.toUpperCase(), 50, y);

    y += 7;

    pdf.text("Depth", 15, y);
    pdf.text(depth + " ft", 50, y);

    y += 7;

    pdf.text("Base Rate", 15, y);
    pdf.text("Rs." + baseRate + " / ft", 50, y);

    y += 7;

    pdf.text("GST", 15, y);
    pdf.text(gstEnabled ? "ON" : "OFF", 50, y);

    y += 7;

    pdf.text("Date", 15, y);
    pdf.text(currentDate, 50, y);

    y += 15;

    // =====================================
    // PART 2 STARTS FROM HERE
    // =====================================

    let drillingTotal = 0;

    let start = 1;

    let currentRate = baseRate;

    let addValue = 5;
    // =====================================
// DRILLING COST BREAKDOWN
// =====================================

pdf.setFont("helvetica", "bold");
pdf.setFontSize(13);

pdf.text("Drilling Cost Breakdown", 15, y);

y += 8;

// Table Header
pdf.setFillColor(30, 30, 30);
pdf.setTextColor(255, 255, 255);

pdf.rect(15, y - 5, 55, 8, "F");
pdf.rect(70, y - 5, 55, 8, "F");
pdf.rect(125, y - 5, 70, 8, "F");

pdf.text("Depth", 20, y);
pdf.text("Rate", 75, y);
pdf.text("Amount", 130, y);

pdf.setTextColor(0, 0, 0);

y += 10;


// =====================================
// REBORE SECTION
// =====================================

if (mode === "rebore") {

    const reboreCost = reboreFeet * reboreRate;

    drillingTotal += reboreCost;

    pdf.rect(15, y - 5, 55, 8);
    pdf.rect(70, y - 5, 55, 8);
    pdf.rect(125, y - 5, 70, 8);

    pdf.text(`001-${reboreFeet} ft`, 20, y);
    pdf.text(`Rs.${reboreRate}/ft`, 75, y);
    pdf.text(`Rs.${reboreCost.toLocaleString()}`, 130, y);

    y += 8;

    start = reboreFeet + 1;

    if (reboreFeet > 300) {

        let slab = Math.floor((reboreFeet - 1) / 100);

        currentRate = baseRate;
        addValue = 5;

        for (let s = 3; s <= slab; s++) {

            currentRate += addValue;

            if (addValue === 5) {

                addValue = 10;

            } else {

                addValue += 10;

            }

        }

    }

}


// =====================================
// NORMAL DRILLING
// =====================================

while (start <= depth) {

    let end;

    if (start <= 300) {

        end = Math.min(300, depth);

    } else {

        end = Math.min(
            Math.ceil(start / 100) * 100,
            depth
        );

    }

    const feet = end - start + 1;

    const amount = feet * currentRate;

    drillingTotal += amount;

    // Page Break

    if (y > 270) {

        pdf.addPage();

        y = 20;

    }

    pdf.rect(15, y - 5, 55, 8);
    pdf.rect(70, y - 5, 55, 8);
    pdf.rect(125, y - 5, 70, 8);

    pdf.text(
        `${String(start).padStart(3, "0")}-${end} ft`,
        20,
        y
    );

    pdf.text(
        `Rs.${currentRate}/ft`,
        75,
        y
    );

    pdf.text(
        `Rs.${amount.toLocaleString()}`,
        130,
        y
    );

    y += 8;

    start = end + 1;

    if (end < 1000) {

        currentRate += addValue;

        if (addValue === 5) {

            addValue = 10;

        } else {

            addValue += 10;

        }

    } else {

        currentRate += 100;

    }

}


// =====================================
// TOTAL DRILLING COST
// =====================================

pdf.setFont("helvetica", "bold");

pdf.rect(15, y - 5, 110, 8);
pdf.rect(125, y - 5, 70, 8);

pdf.text(
    "Total Drilling Cost",
    20,
    y
);

pdf.text(
    `Rs.${drillingTotal.toLocaleString()}`,
    130,
    y
);

y += 18;


// =====================================
// PART 3 STARTS HERE
// =====================================

const pvc7Cost = casing7Feet * casing7Rate;

const pvc10Cost = casing10Feet * casing10Rate;

const subTotal =
    drillingTotal +
    pvc7Cost +
    pvc10Cost;

let gst = 0;

if (gstEnabled) {

    gst = Math.round(subTotal * 0.18);

}

const grandTotal =
    subTotal + gst;
    // =====================================
// ESTIMATION SUMMARY
// =====================================

pdf.setFont("helvetica", "bold");
pdf.setFontSize(14);

pdf.text("Estimation Summary", 15, y);

y += 8;

pdf.setFontSize(11);

const summary = [

    ["Drilling Cost", `Rs.${drillingTotal.toLocaleString()}`],

    ['7" PVC Cost', `Rs.${pvc7Cost.toLocaleString()}`],

    ['10" PVC Cost', `Rs.${pvc10Cost.toLocaleString()}`],

    ["GST (18%)", `Rs.${gst.toLocaleString()}`],

    ["Grand Total", `Rs.${grandTotal.toLocaleString()}`]

];

summary.forEach((row, index) => {

    if (y > 270) {

        pdf.addPage();

        y = 20;

    }

    if (index == summary.length - 1) {

        pdf.setFont("helvetica", "bold");

    } else {

        pdf.setFont("helvetica", "normal");

    }

    pdf.rect(15, y - 5, 110, 8);

    pdf.rect(125, y - 5, 70, 8);

    pdf.text(row[0], 20, y);

    pdf.text(row[1], 130, y);

    y += 8;

});


// =====================================
// TERMS & CONDITIONS
// =====================================

y += 12;

if (y > 230) {

    pdf.addPage();

    y = 20;

}

pdf.setFont("helvetica", "bold");
pdf.setFontSize(14);

pdf.text("Terms & Conditions", 15, y);

y += 10;

pdf.setFont("helvetica", "normal");
pdf.setFontSize(11);

const terms = [

"• Quotation is valid for 7 days from the date of issue.",

"• Advance payment is required before commencement of work.",

"• GST will be charged as applicable.",

"• Final drilling depth depends on geological conditions.",

"• PVC casing pipe charges are calculated separately.",

"• Transportation and additional site expenses, if any, will be charged extra.",

"• Final invoice may vary based on actual work completed."

];

terms.forEach(term => {

    pdf.text(term, 18, y);

    y += 7;

});


// =====================================
// THANK YOU
// =====================================

y += 12;

pdf.setFont("helvetica", "bold");
pdf.setFontSize(20);

pdf.text("THANK YOU!", 105, y, {

    align: "center"

});

y += 10;

pdf.setFontSize(13);

pdf.text(
    "We appreciate your trust in",
    105,
    y,
    { align: "center" }
);

y += 8;

pdf.setFontSize(16);

pdf.text(
    "Selvamurugan Fast Drills",
    105,
    y,
    { align: "center" }
);

y += 8;

pdf.setFontSize(11);

pdf.text(
    "Authorized Borewell Contractor",
    105,
    y,
    { align: "center" }
);


// =====================================
// SIGNATURES
// =====================================

y += 30;

pdf.line(20, y, 80, y);

pdf.line(130, y, 190, y);

y += 7;

pdf.setFontSize(11);

pdf.text(
    "Customer Signature",
    50,
    y,
    { align: "center" }
);

pdf.text(
    "Authorized Signature",
    160,
    y,
    { align: "center" }
);


// =====================================
// FOOTER
// =====================================

pdf.setFontSize(9);

pdf.setTextColor(120);

pdf.text(
    "Generated by Selvamurugan Fast Drills Estimation System",
    105,
    290,
    { align: "center" }
);


// =====================================
// SAVE PDF
// =====================================

pdf.save("Selvamurugan_Fast_Drills_Quotation.pdf");


// Close quotation tab automatically

setTimeout(() => {

    window.close();

}, 1000);

};
