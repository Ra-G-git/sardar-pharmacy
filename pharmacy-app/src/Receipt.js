import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

export function generateReceipt(order) {
  const doc = new jsPDF();

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

  // Address with word wrap
  const addressLines = doc.splitTextToSize(`Address: ${order.address || "N/A"}`, 85);
  doc.text(addressLines, 110, 74);

  // Divider
  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.5);
  doc.line(14, 90, 196, 90);

  // Items table
  const tableRows = order.items?.map((item) => [
    item.name,
    item.category || "",
    item.strength || "",
    item.quantity,
    `${parseFloat(item.price).toFixed(2)}`,
    `${(parseFloat(item.price) * item.quantity).toFixed(2)}`,
  ]) || [];

  autoTable(doc, {
    startY: 95,
    head: [["Medicine", "Category", "Strength", "Qty", "Unit Price (৳)", "Total (৳)"]],
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
      0: { cellWidth: 50 },
      1: { cellWidth: 30 },
      2: { cellWidth: 25 },
      3: { cellWidth: 15, halign: "center" },
      4: { cellWidth: 30, halign: "right" },
      5: { cellWidth: 30, halign: "right" },
    },
  });

  const finalY = doc.lastAutoTable.finalY + 10;

  // Total box
  doc.setFillColor(239, 246, 255);
  doc.roundedRect(120, finalY, 76, 20, 3, 3, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(30, 64, 175);
  doc.text("TOTAL AMOUNT:", 125, finalY + 8);
  doc.setFontSize(13);
  doc.text(`BDT ${parseFloat(order.total).toFixed(2)}`, 193, finalY + 8, { align: "right" });
  doc.setFontSize(9);
  doc.setTextColor(100, 116, 139);
  doc.setFont("helvetica", "normal");
  doc.text(`In words: ${numberToWords(parseFloat(order.total))} Taka only`, 125, finalY + 15);

  // Footer
  const footerY = finalY + 35;
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
  const doc = generateReceipt(order);
  const blob = doc.output("blob");
  const url = URL.createObjectURL(blob);
  const win = window.open(url);
  win.onload = () => {
    win.print();
  };
}

export function whatsappReceipt(order) {
  const items = order.items?.map(
    (item) => `• ${item.name} x${item.quantity} = ৳${(parseFloat(item.price) * item.quantity).toFixed(2)}`
  ).join("\n") || "";

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
━━━━━━━━━━━━━━━━
💰 *TOTAL: ৳${parseFloat(order.total).toFixed(2)}*
💳 Payment: ${order.paymentMethod || "Cash"}
✅ Status: ${order.status || "Pending"}
━━━━━━━━━━━━━━━━
_Thank you for choosing Sardar Pharmacy!_`;

  const encoded = encodeURIComponent(message);
  window.open(`https://wa.me/?text=${encoded}`, "_blank");
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