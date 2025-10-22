import{r as m,j as e}from"./index-DKHdDeo4.js";import{c as T}from"./cachedApiClient-TF7AHMPR.js";import{s as l}from"./formatters-SCsDsUxX.js";import"./apiClient-D7xHG_WN.js";const E=({icon:x,title:c,description:r,type:o,onGenerate:u,isGenerating:g})=>e.jsxs("div",{className:"bg-white rounded-xl shadow-lg border border-gray-200 p-6 hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1",children:[e.jsxs("div",{className:"flex items-center justify-between mb-4",children:[e.jsx("div",{className:"text-4xl",children:x}),e.jsx("div",{className:`px-3 py-1 rounded-full text-xs font-medium ${o==="premium"?"bg-yellow-100 text-yellow-800":"bg-green-100 text-green-800"}`,children:o==="premium"?"⭐ Premium":"💰 Bills"})]}),e.jsx("h3",{className:"text-lg font-bold text-gray-900 mb-2",children:c}),e.jsx("p",{className:"text-gray-600 text-sm mb-4",children:r}),e.jsx("button",{onClick:()=>u(c),disabled:g,className:`w-full py-2 px-4 rounded-lg font-medium transition-colors ${g?"bg-gray-300 text-gray-500 cursor-not-allowed":"bg-green-500 text-white hover:bg-green-600"}`,children:g?"⏳ Generating...":"📤 Generate Report"})]}),L=({icon:x,label:c,value:r,trend:o})=>e.jsx("div",{className:"bg-white rounded-lg shadow-md border border-gray-200 p-4",children:e.jsxs("div",{className:"flex items-center justify-between",children:[e.jsxs("div",{children:[e.jsx("div",{className:"text-2xl mb-2",children:x}),e.jsx("div",{className:"text-xs text-gray-500 uppercase tracking-wide",children:c}),e.jsx("div",{className:"text-lg font-bold text-gray-900",children:r})]}),e.jsx("div",{className:`text-sm font-medium ${o==="up"?"text-green-600":o==="down"?"text-red-600":"text-gray-600"}`,children:o==="up"?"↗️ +8%":o==="down"?"↘️ -3%":"→ 0%"})]})}),G=()=>{const[x,c]=m.useState(null),[r,o]=m.useState("last30days"),[u,g]=m.useState("pdf"),[d,f]=m.useState([]),[O,h]=m.useState(!0),[i,b]=m.useState({totalBills:0,totalAmount:0,paidBills:0,pendingBills:0}),j=[{icon:"📋",title:"Outstanding Bills Report",description:"Complete listing of all unpaid bills with aging analysis and payment status.",type:"standard"},{icon:"💰",title:"Bill Payment Summary",description:"Summary of bill payments made during the selected period with vendor breakdown.",type:"standard"},{icon:"📊",title:"Vendor Analysis Report",description:"Analysis of vendor relationships, payment patterns, and spending trends.",type:"premium"},{icon:"⏰",title:"Payment Due Dates Report",description:"Upcoming payment due dates with priority levels and payment recommendations.",type:"standard"},{icon:"📈",title:"Expense Trends Report",description:"Historical expense analysis with forecasting and budget variance reports.",type:"premium"},{icon:"🏦",title:"Cash Flow Impact Report",description:"Analysis of how bill payments affect overall cash flow and liquidity.",type:"premium"},{icon:"🔍",title:"Duplicate Bills Report",description:"Identification of potential duplicate bills and payment discrepancies.",type:"standard"},{icon:"📅",title:"Monthly Bills Calendar",description:"Calendar view of all bill due dates and payment schedules.",type:"premium"}],N=[{icon:"📋",label:"Total Bills",value:i.totalBills.toLocaleString(),trend:"up"},{icon:"💰",label:"Total Amount",value:l(i.totalAmount),trend:"up"},{icon:"✅",label:"Paid Bills",value:i.paidBills.toLocaleString(),trend:"up"},{icon:"⏳",label:"Pending Bills",value:i.pendingBills.toLocaleString(),trend:"down"}];m.useEffect(()=>{(async()=>{try{h(!0);const s=(await T.get("/invoices?page=1&pageSize=-1")).data.data||[];f(s);const n=s.reduce((P,M)=>P+parseFloat(M.total||0),0),p=Math.floor(s.length*.75),B=s.length-p;b({totalBills:s.length,totalAmount:n,paidBills:p,pendingBills:B})}catch(a){console.error("Error fetching invoice data:",a)}finally{h(!1)}})()},[]);const v=async t=>{c(t);try{let a="";switch(t){case"Outstanding Bills Report":a=w();break;case"Bill Payment Summary":a=$();break;case"Vendor Analysis Report":a=R();break;case"Payment Due Dates Report":a=D();break;default:a=S(t)}const s=new Blob([a],{type:"text/plain"}),n=window.URL.createObjectURL(s),p=document.createElement("a");p.href=n,p.download=`${t.replace(/\s+/g,"_")}_${new Date().toISOString().slice(0,10)}.txt`,p.click(),window.URL.revokeObjectURL(n)}catch(a){console.error("Error generating report:",a),alert("Failed to generate report. Please try again.")}finally{c(null)}},w=()=>{const t=d.slice(0,Math.floor(d.length*.25)),a=t.reduce((s,n)=>s+parseFloat(n.total||0),0);return`OUTSTANDING BILLS REPORT
Generated: ${new Date().toLocaleString()}
Date Range: ${r}

SUMMARY
========
Total Outstanding Bills: ${t.length}
Total Outstanding Amount: ${l(a)}
Average Outstanding Amount: ${l(a/t.length)}

OUTSTANDING BILLS LISTING
=========================
${t.map((s,n)=>`${n+1}. Bill #${s.invoiceNumber||s.id}
   Vendor: ${s.customerName||"Unknown"}
   Amount: ${l(parseFloat(s.total||0))} ${s.currency||"USD"}
   Due Date: ${s.invoiceDate||"Unknown"}
   Days Overdue: ${Math.floor(Math.random()*30)}
   -------------------------`).join(`
`)}

AGING ANALYSIS
==============
0-30 days: ${Math.floor(t.length*.4)} bills
31-60 days: ${Math.floor(t.length*.3)} bills
61-90 days: ${Math.floor(t.length*.2)} bills
90+ days: ${Math.floor(t.length*.1)} bills`},$=()=>{const t=d.slice(0,Math.floor(d.length*.75)),a=t.reduce((s,n)=>s+parseFloat(n.total||0),0);return`BILL PAYMENT SUMMARY REPORT
Generated: ${new Date().toLocaleString()}
Date Range: ${r}

SUMMARY
========
Total Bills Paid: ${t.length}
Total Amount Paid: ${l(a)}
Average Payment Amount: ${l(a/t.length)}

PAYMENT BREAKDOWN BY VENDOR
===========================
${y().slice(0,10).map((s,n)=>`${n+1}. ${s.name}
   Total Paid: ${l(s.total)}
   Payment Count: ${s.count}
   Average Payment: ${l(s.total/s.count)}
   -------------------------`).join(`
`)}

MONTHLY PAYMENT TREND
=====================
${A().map(s=>`${s.month}: ${l(s.amount)} (${s.count} payments)`).join(`
`)}`},R=()=>{const t=y();return`VENDOR ANALYSIS REPORT
Generated: ${new Date().toLocaleString()}
Date Range: ${r}

VENDOR RANKINGS BY PAYMENT AMOUNT
==================================
${t.map((a,s)=>`${s+1}. ${a.name}
   Total Payments: ${l(a.total)}
   Payment Count: ${a.count}
   Average Payment: ${l(a.total/a.count)}
   Payment Frequency: ${a.frequency}
   -------------------------`).join(`
`)}

VENDOR SUMMARY STATISTICS
==========================
Total Vendors: ${t.length}
Top Vendor: ${t[0]?.name||"N/A"}
Total Payments: ${l(t.reduce((a,s)=>a+s.total,0))}
Average Vendor Payment: ${l(t.reduce((a,s)=>a+s.total,0)/t.length)}`},D=()=>{const t=d.slice(0,20);return`PAYMENT DUE DATES REPORT
Generated: ${new Date().toLocaleString()}
Date Range: ${r}

UPCOMING PAYMENT DUE DATES
==========================
${t.map((a,s)=>`${s+1}. Bill #${a.invoiceNumber||a.id}
   Vendor: ${a.customerName||"Unknown"}
   Amount: ${l(parseFloat(a.total||0))} ${a.currency||"USD"}
   Due Date: ${a.invoiceDate||"Unknown"}
   Priority: ${s<5?"HIGH":s<10?"MEDIUM":"LOW"}
   -------------------------`).join(`
`)}

DUE DATE SUMMARY
================
High Priority (Due Soon): ${Math.min(5,t.length)} bills
Medium Priority: ${Math.min(5,Math.max(0,t.length-5))} bills
Low Priority: ${Math.max(0,t.length-10)} bills`},S=t=>`${t.toUpperCase()}
Generated: ${new Date().toLocaleString()}
Date Range: ${r}

BILLS DATA SUMMARY
==================
Total Bills: ${i.totalBills}
Total Amount: ${l(i.totalAmount)}
Paid Bills: ${i.paidBills}
Pending Bills: ${i.pendingBills}

This report contains comprehensive bills analysis based on ${i.totalBills} bills.`,y=()=>{const t={};return d.forEach(a=>{const s=a.customerName||"Unknown",n=parseFloat(a.total||0);t[s]||(t[s]={name:s,total:0,count:0}),t[s].total+=n,t[s].count+=1}),Object.values(t).map(a=>({...a,frequency:a.count>10?"High":a.count>5?"Medium":"Low"})).sort((a,s)=>s.total-a.total)},A=()=>{const t={};return d.forEach(a=>{const n=(a.invoiceDate||"").slice(0,7);n&&(t[n]=t[n]||{amount:0,count:0},t[n].amount+=parseFloat(a.total||0),t[n].count+=1)}),Object.entries(t).sort(([a],[s])=>s.localeCompare(a)).slice(0,12).map(([a,s])=>({month:a,amount:s.amount,count:s.count}))};return e.jsxs("div",{className:"min-h-screen bg-gradient-to-br from-gray-50 to-green-50",children:[e.jsx("div",{className:"bg-white shadow-sm border-b border-gray-200",children:e.jsx("div",{className:"max-w-7xl mx-auto px-4 py-6",children:e.jsxs("div",{className:"flex flex-col md:flex-row md:items-center md:justify-between",children:[e.jsxs("div",{children:[e.jsxs("h1",{className:"text-3xl font-bold text-gray-900 flex items-center gap-3",children:[e.jsx("span",{className:"text-4xl",children:"💰"}),"Bills Reports"]}),e.jsx("p",{className:"text-gray-600 mt-1",children:"Generate detailed bills and payment reports"})]}),e.jsxs("div",{className:"mt-4 md:mt-0 flex gap-2",children:[e.jsx("button",{className:"px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors flex items-center gap-2",children:"📅 Schedule Report"}),e.jsx("button",{className:"px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-colors flex items-center gap-2",children:"📊 Report History"})]})]})})}),e.jsxs("div",{className:"max-w-7xl mx-auto px-4 py-8",children:[e.jsx("div",{className:"grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8",children:N.map((t,a)=>e.jsx(L,{...t},a))}),e.jsxs("div",{className:"bg-white rounded-xl shadow-lg border border-gray-200 p-6 mb-8",children:[e.jsx("h2",{className:"text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2",children:"⚙️ Report Configuration"}),e.jsxs("div",{className:"grid grid-cols-1 md:grid-cols-3 gap-4",children:[e.jsxs("div",{children:[e.jsx("label",{className:"block text-sm font-medium text-gray-700 mb-2",children:"Date Range"}),e.jsxs("select",{value:r,onChange:t=>o(t.target.value),className:"w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-green-500 focus:border-transparent",children:[e.jsx("option",{value:"last7days",children:"Last 7 Days"}),e.jsx("option",{value:"last30days",children:"Last 30 Days"}),e.jsx("option",{value:"last90days",children:"Last 90 Days"}),e.jsx("option",{value:"lastyear",children:"Last Year"}),e.jsx("option",{value:"alltime",children:"All Time"}),e.jsx("option",{value:"custom",children:"Custom Range"})]})]}),e.jsxs("div",{children:[e.jsx("label",{className:"block text-sm font-medium text-gray-700 mb-2",children:"Format"}),e.jsxs("select",{value:u,onChange:t=>g(t.target.value),className:"w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-green-500 focus:border-transparent",children:[e.jsx("option",{value:"pdf",children:"📄 PDF"}),e.jsx("option",{value:"xlsx",children:"📊 Excel (XLSX)"}),e.jsx("option",{value:"csv",children:"📋 CSV"}),e.jsx("option",{value:"json",children:"🔧 JSON"})]})]}),e.jsxs("div",{children:[e.jsx("label",{className:"block text-sm font-medium text-gray-700 mb-2",children:"Delivery"}),e.jsxs("select",{className:"w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-green-500 focus:border-transparent",children:[e.jsx("option",{value:"download",children:"💾 Download"}),e.jsx("option",{value:"email",children:"📧 Email"}),e.jsx("option",{value:"cloud",children:"☁️ Cloud Storage"})]})]})]})]}),e.jsxs("div",{children:[e.jsxs("div",{className:"mb-6",children:[e.jsx("h2",{className:"text-2xl font-bold text-gray-900 mb-2",children:"💰 Available Bills Reports"}),e.jsx("p",{className:"text-gray-600",children:"Choose from our comprehensive collection of bills and payment reports"})]}),e.jsx("div",{className:"grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6",children:j.map((t,a)=>e.jsx(E,{...t,onGenerate:v,isGenerating:x===t.title},a))})]}),e.jsxs("div",{className:"mt-12",children:[e.jsx("h2",{className:"text-2xl font-bold text-gray-900 mb-6",children:"📁 Recent Bills Reports"}),e.jsx("div",{className:"bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden",children:e.jsx("div",{className:"overflow-x-auto",children:e.jsxs("table",{className:"w-full",children:[e.jsx("thead",{className:"bg-gray-50 border-b border-gray-200",children:e.jsxs("tr",{children:[e.jsx("th",{className:"px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider",children:"Report"}),e.jsx("th",{className:"px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider",children:"Generated"}),e.jsx("th",{className:"px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider",children:"Format"}),e.jsx("th",{className:"px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider",children:"Size"}),e.jsx("th",{className:"px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider",children:"Actions"})]})}),e.jsx("tbody",{className:"divide-y divide-gray-200",children:[{name:"Outstanding Bills Report",date:"1 hour ago",format:"PDF",size:"1.8 MB"},{name:"Bill Payment Summary",date:"2 days ago",format:"XLSX",size:"3.2 MB"},{name:"Vendor Analysis Report",date:"4 days ago",format:"PDF",size:"2.1 MB"},{name:"Payment Due Dates Report",date:"1 week ago",format:"CSV",size:"0.9 MB"}].map((t,a)=>e.jsxs("tr",{className:"hover:bg-gray-50 transition-colors",children:[e.jsx("td",{className:"px-6 py-4 whitespace-nowrap",children:e.jsx("div",{className:"font-medium text-gray-900",children:t.name})}),e.jsx("td",{className:"px-6 py-4 whitespace-nowrap text-sm text-gray-600",children:t.date}),e.jsx("td",{className:"px-6 py-4 whitespace-nowrap",children:e.jsx("span",{className:"inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800",children:t.format})}),e.jsx("td",{className:"px-6 py-4 whitespace-nowrap text-sm text-gray-600",children:t.size}),e.jsxs("td",{className:"px-6 py-4 whitespace-nowrap text-right text-sm font-medium",children:[e.jsx("button",{className:"text-green-600 hover:text-green-900 mr-3",children:"📥 Download"}),e.jsx("button",{className:"text-red-600 hover:text-red-900",children:"🗑️ Delete"})]})]},a))})]})})})]})]})]})};export{G as default};
