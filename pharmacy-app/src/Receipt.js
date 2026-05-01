import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

export function generateReceipt(order) {
  const doc = new jsPDF();

  const subtotal = parseFloat(order.subtotal || order.total);
  const discount = parseFloat(order.discount || 0);
  const discountAmt = (subtotal * discount) / 100;
  const total = parseFloat(order.total);

  // Header background
  doc.setFillColor(30, 64, 175);
  doc.rect(0, 0, 210, 40, "F");

  // Pharmacy name
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(22);
  doc.setFont("helvetica", "bold");
  doc.text("Sardar Pharmacy", 105, 16, { align: "center" });

  // Pharmacy info
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.text("10/1 Pallabi, Mirpur-11½, Dhaka-1216 | 01559084327 | Open 8AM-11PM", 105, 24, { align: "center" });

  // Receipt title
  doc.setFontSize(11);
  doc.text("OFFICIAL RECEIPT", 105, 33, { align: "center" });

  // Order info box
  doc.setTextColor(30, 41, 59);
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.text("ORDER DETAILS", 14, 52);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.text(`Order ID: #${order.id?.slice(0, 8).toUpperCase() || "N/A"}`, 14, 60);
  doc.text(`Date: ${order.createdAt || new Date().toLocaleString()}`, 14, 67);
  doc.text(`Payment: ${order.paymentMethod || "Cash"}`, 14, 74);
  doc.text(`Status: ${order.status || "Pending"}`, 14, 81);

  // Customer info
  doc.setFont("helvetica", "bold");
  doc.text("CUSTOMER DETAILS", 110, 52);
  doc.setFont("helvetica", "normal");
  doc.text(`Name: ${order.name || "Walk-in Customer"}`, 110, 60);
  doc.text(`Phone: ${order.phone || "N/A"}`, 110, 67);

  const addressLines = doc.splitTextToSize(`Address: ${order.address || "N/A"}`, 85);
  doc.text(addressLines, 110, 74);

  // Divider
  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.5);
  doc.line(14, 90, 196, 90);

  // Items table
  const tableRows = order.items?.map((item) => {
    const packInfo = item.unit || "-";
    return [
      item.name,
      item.category || "",
      item.strength || "",
      packInfo,
      item.quantity,
      `Tk ${parseFloat(item.price).toFixed(2)}`,
      `Tk ${(parseFloat(item.price) * item.quantity).toFixed(2)}`,
    ];
  }) || [];

  autoTable(doc, {
    startY: 95,
    head: [["Medicine", "Category", "Strength", "Unit", "Qty", "Unit Price (Tk)", "Total (Tk)"]],
    body: tableRows,
    theme: "striped",
    headStyles: {
      fillColor: [30, 64, 175],
      textColor: 255,
      fontStyle: "bold",
      fontSize: 9,
    },
    bodyStyles: {
      fontSize: 9,
      textColor: [30, 41, 59],
    },
    alternateRowStyles: {
      fillColor: [239, 246, 255],
    },
    columnStyles: {
      0: { cellWidth: 45 },
      1: { cellWidth: 25 },
      2: { cellWidth: 22 },
      3: { cellWidth: 28 },
      4: { cellWidth: 12, halign: "center" },
      5: { cellWidth: 28, halign: "right" },
      6: { cellWidth: 22, halign: "right" },
    },
  });

  const finalY = doc.lastAutoTable.finalY + 10;

  // Summary box — show subtotal + discount if applicable
  let summaryY = finalY;

  if (discount > 0) {
    // Subtotal row
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(100, 116, 139);
    doc.text("Subtotal:", 140, summaryY);
    doc.text(`Tk ${subtotal.toFixed(2)}`, 193, summaryY, { align: "right" });
    summaryY += 7;

    // Discount row
    doc.setTextColor(22, 163, 74);
    doc.text(`Discount (${discount}%):`, 140, summaryY);
    doc.text(`-Tk ${discountAmt.toFixed(2)}`, 193, summaryY, { align: "right" });
    summaryY += 8;
  }

  // Total box
  doc.setFillColor(239, 246, 255);
  doc.roundedRect(120, summaryY, 76, 20, 3, 3, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(30, 64, 175);
  doc.text("TOTAL AMOUNT:", 125, summaryY + 8);
  doc.setFontSize(13);
  doc.text(`BDT ${total.toFixed(2)}`, 193, summaryY + 8, { align: "right" });
  doc.setFontSize(9);
  doc.setTextColor(100, 116, 139);
  doc.setFont("helvetica", "normal");
  doc.text(`In words: ${numberToWords(total)} Taka only`, 125, summaryY + 15);

  // Note
  if (order.note) {
    const noteY = summaryY + 28;
    doc.setTextColor(30, 41, 59);
    doc.setFont("helvetica", "italic");
    doc.setFontSize(9);
    doc.text(`Note: ${order.note}`, 14, noteY);
  }

  // Footer
  const footerY = summaryY + (order.note ? 45 : 35);
  doc.setDrawColor(226, 232, 240);
  doc.line(14, footerY, 196, footerY);
  doc.setFontSize(8);
  doc.setTextColor(148, 163, 184);
  doc.text("Thank you for choosing Sardar Pharmacy!", 105, footerY + 8, { align: "center" });
  doc.text("This is a computer generated receipt.", 105, footerY + 14, { align: "center" });
  doc.text("For queries call: 01559084327", 105, footerY + 20, { align: "center" });

  return doc;
}

export function downloadReceipt(order) {
  const doc = generateReceipt(order);
  doc.save(`Sardar-Pharmacy-Receipt-${order.id?.slice(0, 8).toUpperCase() || "ORDER"}.pdf`);
}

export function printReceipt(order) {
  const subtotal = parseFloat(order.subtotal || order.total);
  const discount = parseFloat(order.discount || 0);
  const discountAmt = (subtotal * discount) / 100;
  const total = parseFloat(order.total);

  const itemRows = order.items?.map((item) => {
    const packDisplay = item.unit || "-";
    return `
      <tr>
        <td>${item.name}${item.strength ? `<br/><span class="sub">${item.strength}</span>` : ""}</td>
        <td class="center">${packDisplay}</td>
        <td class="center">${item.quantity}</td>
        <td class="right">${parseFloat(item.price).toFixed(2)}</td>
        <td class="right">${(parseFloat(item.price) * item.quantity).toFixed(2)}</td>
      </tr>
    `;
  }).join("") || "";

  const discountRows = discount > 0 ? `
    <div class="summary-row">
      <span>Subtotal:</span>
      <span>৳${subtotal.toFixed(2)}</span>
    </div>
    <div class="summary-row discount">
      <span>Discount (${discount}%):</span>
      <span>-৳${discountAmt.toFixed(2)}</span>
    </div>
  ` : "";

  const noteRow = order.note ? `
    <div class="divider"></div>
    <div class="note">📝 Note: ${order.note}</div>
  ` : "";

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8"/>
      <title>Receipt</title>
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
          font-family: 'Courier New', monospace;
          font-size: 12px;
          width: 80mm;
          padding: 6px;
          color: #000;
          -webkit-print-color-adjust: exact;
          print-color-adjust: exact;
        }
        .center { text-align: center; }
        .right { text-align: right; }
        .bold { font-weight: bold; }
        .header { text-align: center; margin-bottom: 6px; }
        .header h1 { font-size: 16px; font-weight: 900; letter-spacing: 1px; }
        .header p { font-size: 11px; margin: 2px 0; font-weight: 600; }
        .divider { border-top: 2px dashed #000; margin: 6px 0; }
        .info-row {
          display: flex;
          justify-content: space-between;
          margin: 3px 0;
          font-size: 11px;
          font-weight: 700;
        }
        table { width: 100%; border-collapse: collapse; margin: 4px 0; font-size: 11px; }
        thead tr { border-top: 2px solid #000; border-bottom: 2px solid #000; }
        th { padding: 4px 2px; text-align: left; font-size: 11px; font-weight: 900; }
        td { padding: 4px 2px; vertical-align: top; font-weight: 700; }
        th:nth-child(2), td:nth-child(2),
        th:nth-child(3), td:nth-child(3) { text-align: center; }
        th:nth-child(4), td:nth-child(4),
        th:nth-child(5), td:nth-child(5) { text-align: right; }
        tbody tr:last-child { border-bottom: 2px solid #000; }
        .sub { font-size: 10px; color: #222; font-weight: 600; }
        .summary-row {
          display: flex;
          justify-content: space-between;
          font-size: 12px;
          font-weight: 700;
          margin: 4px 0;
        }
        .summary-row.discount { color: #166534; }
        .total-row {
          display: flex;
          justify-content: space-between;
          font-size: 14px;
          font-weight: 900;
          margin: 5px 0;
          border-top: 2px solid #000;
          padding-top: 4px;
        }
        .words { font-size: 10px; font-weight: 700; margin-bottom: 6px; }
        .note { font-size: 11px; font-weight: 600; margin: 4px 0; }
        .footer { text-align: center; font-size: 11px; font-weight: 700; margin-top: 8px; }
        @media print {
          @page { size: 80mm auto; margin: 0; }
          body { padding: 4px; }
        }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>Sardar Pharmacy</h1>
        <p>10/1 Pallabi, Mirpur-11½, Dhaka-1216</p>
        <p>Tel: 01559084327 | Open 8AM-11PM</p>
        <p>---- RECEIPT ----</p>
      </div>

      <div class="divider"></div>
      <div class="info-row"><span>Order ID:</span><span>#${order.id?.slice(0, 8).toUpperCase() || "N/A"}</span></div>
      <div class="info-row"><span>Date:</span><span>${order.createdAt || new Date().toLocaleString()}</span></div>
      <div class="info-row"><span>Payment:</span><span>${order.paymentMethod || "Cash"}</span></div>
      <div class="info-row"><span>Status:</span><span>${order.status || "Pending"}</span></div>

      <div class="divider"></div>
      <div class="info-row"><span>Customer:</span><span>${order.name || "Walk-in"}</span></div>
      <div class="info-row"><span>Phone:</span><span>${order.phone || "N/A"}</span></div>
      <div class="info-row"><span>Address:</span><span style="max-width:50mm;text-align:right;font-weight:700">${order.address || "N/A"}</span></div>

      <div class="divider"></div>
      <table>
        <thead>
          <tr>
            <th>Item</th>
            <th>Unit</th>
            <th>Qty</th>
            <th>Price</th>
            <th>Total</th>
          </tr>
        </thead>
        <tbody>${itemRows}</tbody>
      </table>

      <div class="divider"></div>
      ${discountRows}
      <div class="total-row">
        <span>TOTAL:</span>
        <span>৳${total.toFixed(2)}</span>
      </div>
      <div class="words">${numberToWords(total)} Taka only</div>
      ${noteRow}

      <div class="divider"></div>
      <div class="footer">
        <p>Thank you for choosing Sardar Pharmacy!</p>
        <p>For queries call: 01559084327</p>
      </div>
    </body>
    </html>
  `;

  const win = window.open("", "_blank", "width=320,height=600");
  win.document.write(html);
  win.document.close();
  win.onload = () => {
    win.focus();
    win.print();
    win.close();
  };
}

export function whatsappReceipt(order) {
  const subtotal = parseFloat(order.subtotal || order.total);
  const discount = parseFloat(order.discount || 0);
  const discountAmt = (subtotal * discount) / 100;
  const total = parseFloat(order.total);

  const items = order.items?.map(
    (item) => `• ${item.name}${item.unit_size > 1 ? ` (${item.unit})` : ""} x${item.quantity} = ৳${(parseFloat(item.price) * item.quantity).toFixed(2)}`
  ).join("\n") || "";

  const discountLine = discount > 0
    ? `\n🏷️ Subtotal: ৳${subtotal.toFixed(2)}\n💚 Discount (${discount}%): -৳${discountAmt.toFixed(2)}`
    : "";

  const noteLine = order.note ? `\n📝 Note: ${order.note}` : "";

  const message =
`💊 *Sardar Pharmacy*
📍 10/1 Pallabi, Mirpur-11½, Dhaka-1216
📞 01559084327

*RECEIPT*
━━━━━━━━━━━━━━━━
🔖 Order ID: #${order.id?.slice(0, 8).toUpperCase() || "N/A"}
📅 Date: ${order.createdAt || new Date().toLocaleString()}
━━━━━━━━━━━━━━━━
👤 Name: ${order.name || "Walk-in Customer"}
📞 Phone: ${order.phone || "N/A"}
📍 Address: ${order.address || "N/A"}
━━━━━━━━━━━━━━━━
*ITEMS:*
${items}
━━━━━━━━━━━━━━━━${discountLine}
💰 *TOTAL: ৳${total.toFixed(2)}*
💳 Payment: ${order.paymentMethod || "Cash"}
✅ Status: ${order.status || "Pending"}${noteLine}
━━━━━━━━━━━━━━━━
_Thank you for choosing Sardar Pharmacy!_`;

  const encoded = encodeURIComponent(message);

  if (order.phone && order.phone !== "N/A") {
    let phone = order.phone.trim().replace(/\s+/g, "");
    if (phone.startsWith("0")) {
      phone = "880" + phone.slice(1);
    } else if (!phone.startsWith("880")) {
      phone = "880" + phone;
    }
    window.open(`https://wa.me/${phone}?text=${encoded}`, "_blank");
  } else {
    window.open(`https://wa.me/?text=${encoded}`, "_blank");
  }
}

function numberToWords(num) {
  const ones = ["", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine",
    "Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen", "Seventeen", "Eighteen", "Nineteen"];
  const tens = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];

  if (num === 0) return "Zero";
  const integer = Math.floor(num);

  function convert(n) {
    if (n < 20) return ones[n];
    if (n < 100) return tens[Math.floor(n / 10)] + (n % 10 ? " " + ones[n % 10] : "");
    if (n < 1000) return ones[Math.floor(n / 100)] + " Hundred" + (n % 100 ? " " + convert(n % 100) : "");
    if (n < 100000) return convert(Math.floor(n / 1000)) + " Thousand" + (n % 1000 ? " " + convert(n % 1000) : "");
    return convert(Math.floor(n / 100000)) + " Lakh" + (n % 100000 ? " " + convert(n % 100000) : "");
  }

  return convert(integer);
}