let drillingMode = "new";

function setMode(mode){

    drillingMode = mode;

    document.getElementById("newBtn")
    .classList.remove("active");

    document.getElementById("reboreBtn")
    .classList.remove("active");

    if(mode === "new"){

        document.getElementById("newBtn")
        .classList.add("active");

    }

    else{

        document.getElementById("reboreBtn")
        .classList.add("active");

    }

    document
    .querySelectorAll(".rebore-fields")
    .forEach(el=>{

        el.style.display =
        mode === "rebore"
        ? "flex"
        : "none";

    });


}



function calculateTotal(){

    document.querySelector(".details-box")
    .style.display = "block";

    document.querySelector(".breakdown-box")
    .style.display = "block";

    document.querySelector(".result-box")
    .style.display = "flex";

    let depth =
    parseInt(document.getElementById("depth").value) || 0;

    let baseRate =
    parseInt(document.getElementById("baseRate").value) || 0;

    let casing7Feet =
    parseInt(document.getElementById("casing7").value) || 0;

    let casing7Rate =
    parseInt(document.getElementById("casing7Rate").value) || 0;

    let casing10Feet =
    parseInt(document.getElementById("casing10").value) || 0;

    let casing10Rate =
    parseInt(document.getElementById("casing10Rate").value) || 0;



    let start = 1;

    let drillingTotal = 0;

    let breakdownHTML = "";



    // ORIGINAL LOGIC SETTINGS

    let currentRate = baseRate;

    let addValue = 5;


// =========================
// REBORE SECTION
// =========================

if(drillingMode === "rebore"){

    let reboreFeet =
    parseInt(document.getElementById("reboreFeet").value) || 0;

    let reboreRate =
    parseInt(document.getElementById("reboreRate").value) || 0;



    // REBORE COST

    let reboreCost =
    reboreFeet * reboreRate;

    drillingTotal += reboreCost;



    // SHOW REBORE ROW

    breakdownHTML += `

    <div class="breakdown-row">

        <div>
            1-${reboreFeet} ft
        </div>

        <div>
            ₹${reboreRate}/ft
        </div>

        <div class="amount">
            Rs.${reboreCost.toLocaleString()}
        </div>

    </div>

    `;



    // NEXT STARTING POINT

    start = reboreFeet + 1;


// =========================
// REBORE RATE ADVANCEMENT (RULE B)
// =========================

currentRate = baseRate;
addValue = 5;

if (reboreFeet > 300) {

    // Determine the slab where the rebore ENDS
    let slab = Math.floor((reboreFeet - 1) / 100);

    // Example:
    // 301-400 -> slab = 3
    // 401-500 -> slab = 4
    // 501-600 -> slab = 5

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

    // =========================
    // NORMAL SLAB CALCULATION
    // =========================

    while(start <= depth){

        let end;


    if(start <= 300){

        end = Math.min(300, depth);

    }
    else{

        // Keep slab boundaries fixed at 400,500,600,700...
        end = Math.min(Math.ceil(start / 100) * 100, depth);

    }



        let feet =
        end - start + 1;



        let slabCost =
        feet * currentRate;



        drillingTotal += slabCost;



        breakdownHTML += `

        <div class="breakdown-row">

            <div>
                ${String(start).padStart(3,'0')}-${end} ft
            </div>

            <div>
                ₹${currentRate}/ft
            </div>

            <div class="amount">
                Rs.${slabCost.toLocaleString()}
            </div>

        </div>

        `;



        start = end + 1;



        // ORIGINAL NEW DRILLING LOGIC

        if(end < 1000){

            currentRate += addValue;

            if(addValue === 5){

                addValue = 10;

            }

            else{

                addValue += 10;

            }

        }

        else{

            currentRate += 100;

        }

    }



    // PVC COSTS

    let casing7Cost =
    casing7Feet * casing7Rate;

    let casing10Cost =
    casing10Feet * casing10Rate;



    // SUBTOTAL

    let subtotal =

    drillingTotal
    +
    casing7Cost
    +
    casing10Cost;



    // GST

    let gst = 0;

    if(document.getElementById("gstToggle").checked){

        gst = subtotal * 0.18;

    }



    // FINAL TOTAL

    let total =
    subtotal + gst;



    // DETAILS

    document.getElementById("detailsText")
    .innerHTML =

    `
    Total Depth:
    <b>${depth} ft</b>

    |

    Base Rate:
    <b>₹${baseRate}/ft</b>

    |

    Mode:
    <b>${drillingMode.toUpperCase()}</b>

    |

    7" PVC:
    <b>${casing7Feet} ft</b>

    |

    10" PVC:
    <b>${casing10Feet} ft</b>
    `;



    // BREAKDOWN

    document.getElementById("breakdown")
    .innerHTML =
    breakdownHTML;



    // RESULTS

    document.getElementById("drillingTotal")
    .innerHTML =
    "₹" + drillingTotal.toLocaleString();

    document.getElementById("casing7Total")
    .innerHTML =
    "₹" + casing7Cost.toLocaleString();

    document.getElementById("casing10Total")
    .innerHTML =
    "₹" + casing10Cost.toLocaleString();

    document.getElementById("gstAmount")
    .innerHTML =
    "₹" + gst.toLocaleString();

    document.getElementById("grandTotal")
    .innerHTML =
    "₹" + total.toLocaleString();

}



function clearCalculator(){

    document.getElementById("depth").value = "600";

    document.getElementById("baseRate").value = "90";

    document.getElementById("reboreFeet").value = "0";

    document.getElementById("reboreRate").value = "40";

    document.getElementById("casing7").value = "40";

    document.getElementById("casing7Rate").value = "450";

    document.getElementById("casing10").value = "20";

    document.getElementById("casing10Rate").value = "750";

    document.getElementById("gstToggle").checked = true;

    document.getElementById("detailsText").innerHTML = "";

    document.getElementById("breakdown").innerHTML = "";

    document.getElementById("drillingTotal").innerHTML = "₹0";

    document.getElementById("casing7Total").innerHTML = "₹0";

    document.getElementById("casing10Total").innerHTML = "₹0";

    document.getElementById("gstAmount").innerHTML = "₹0";

    document.getElementById("grandTotal").innerHTML = "₹0";

}
const today = new Date();

const formattedDate =

today.getDate() + "-" +
(today.getMonth()+1) + "-" +
today.getFullYear();

document.getElementById("todayDate")
.innerHTML = formattedDate;

function openQuotation() {

    // Calculate latest values
    calculateTotal();

    const quotationData = {

        customerName: document.getElementById("customerName").value,
        customerPhone: document.getElementById("customerPhone").value,

        mode: drillingMode,

        depth: document.getElementById("depth").value,
        baseRate: document.getElementById("baseRate").value,

        reboreFeet: document.getElementById("reboreFeet").value,
        reboreRate: document.getElementById("reboreRate").value,

        casing7: document.getElementById("casing7").value,
        casing7Rate: document.getElementById("casing7Rate").value,

        casing10: document.getElementById("casing10").value,
        casing10Rate: document.getElementById("casing10Rate").value,

        gst: document.getElementById("gstToggle").checked

    };

    localStorage.setItem(
        "quotationData",
        JSON.stringify(quotationData)
    );

    // Open quotation page
    window.open(
        "quotation.html",
        "_blank"
    );

}