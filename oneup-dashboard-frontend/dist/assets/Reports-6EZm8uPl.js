import{r as p,j as e}from"./index-7PsT1hLB.js";import{c as L}from"./cachedApiClient-TF7AHMPR.js";import{s as n}from"./formatters-SCsDsUxX.js";import"./apiClient-D7xHG_WN.js";const U=({icon:u,title:m,description:c,type:d,onGenerate:h,isGenerating:x})=>e.jsxs("div",{className:"bg-white rounded-xl shadow-lg border border-gray-200 p-6 hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1",children:[e.jsxs("div",{className:"flex items-center justify-between mb-4",children:[e.jsx("div",{className:"text-4xl",children:u}),e.jsx("div",{className:`px-3 py-1 rounded-full text-xs font-medium ${d==="premium"?"bg-yellow-100 text-yellow-800":"bg-blue-100 text-blue-800"}`,children:d==="premium"?"⭐ Premium":"📊 Standard"})]}),e.jsx("h3",{className:"text-lg font-bold text-gray-900 mb-2",children:m}),e.jsx("p",{className:"text-gray-600 text-sm mb-4",children:c}),e.jsx("button",{onClick:()=>h(m),disabled:x,className:`w-full py-2 px-4 rounded-lg font-medium transition-colors ${x?"bg-gray-300 text-gray-500 cursor-not-allowed":"bg-blue-500 text-white hover:bg-blue-600"}`,children:x?"⏳ Generating...":"📤 Generate Report"})]}),k=({icon:u,label:m,value:c,trend:d})=>e.jsx("div",{className:"bg-white rounded-lg shadow-md border border-gray-200 p-4",children:e.jsxs("div",{className:"flex items-center justify-between",children:[e.jsxs("div",{children:[e.jsx("div",{className:"text-2xl mb-2",children:u}),e.jsx("div",{className:"text-xs text-gray-500 uppercase tracking-wide",children:m}),e.jsx("div",{className:"text-lg font-bold text-gray-900",children:c})]}),e.jsx("div",{className:`text-sm font-medium ${d==="up"?"text-green-600":d==="down"?"text-red-600":"text-gray-600"}`,children:d==="up"?"↗️ +12%":d==="down"?"↘️ -5%":"→ 0%"})]})}),z=()=>{const[u,m]=p.useState(null),[c,d]=p.useState("last30days"),[h,x]=p.useState("pdf"),[l,R]=p.useState([]),[M,y]=p.useState(!0),[i,f]=p.useState({totalInvoices:0,totalRevenue:0,totalCustomers:0,totalSalespersons:0}),j=[{icon:"📊",title:"Sales Performance Report",description:"Comprehensive analysis of sales metrics, trends, and performance indicators.",type:"standard"},{icon:"👥",title:"Salesperson Performance Report",description:"Individual salesperson metrics, rankings, and performance comparisons.",type:"standard"},{icon:"🏢",title:"Customer Analytics Report",description:"Customer behavior, spending patterns, and retention analysis.",type:"premium"},{icon:"💰",title:"Revenue Analysis Report",description:"Detailed revenue breakdown by currency, region, and time period.",type:"standard"},{icon:"📈",title:"Growth Trends Report",description:"Historical growth analysis with forecasting and projections.",type:"premium"},{icon:"🎯",title:"Target vs Achievement Report",description:"Compare actual performance against set targets and goals.",type:"premium"},{icon:"📋",title:"Invoice Summary Report",description:"Complete invoice listing with filtering and sorting options.",type:"standard"},{icon:"🔄",title:"Recurring Revenue Report",description:"Analysis of recurring customers and subscription-based revenue.",type:"premium"}],S=[{icon:"📊",label:"Total Invoices",value:i.totalInvoices.toLocaleString(),trend:"up"},{icon:"💰",label:"Total Revenue",value:n(i.totalRevenue),trend:"up"},{icon:"🏢",label:"Total Customers",value:i.totalCustomers.toLocaleString(),trend:"up"},{icon:"👥",label:"Salespersons",value:i.totalSalespersons.toLocaleString(),trend:"up"}];p.useEffect(()=>{(async()=>{try{y(!0);const s=(await L.get("/invoices?page=1&pageSize=-1")).data.data||[];R(s);const r=new Set(s.map(g=>g.customerName)).size,o=new Set(s.map(g=>g.salespersonName)).size,I=s.reduce((g,O)=>g+parseFloat(O.total||0),0);f({totalInvoices:s.length,totalRevenue:I,totalCustomers:r,totalSalespersons:o})}catch(t){console.error("Error fetching invoice data:",t)}finally{y(!1)}})()},[]);const N=async a=>{m(a);try{let t="";switch(a){case"Sales Performance Report":t=w();break;case"Salesperson Performance Report":t=$();break;case"Customer Analytics Report":t=C();break;case"Revenue Analysis Report":t=A();break;case"Invoice Summary Report":t=D();break;default:t=E(a)}const s=new Blob([t],{type:"text/plain"}),r=window.URL.createObjectURL(s),o=document.createElement("a");o.href=r,o.download=`${a.replace(/\s+/g,"_")}_${new Date().toISOString().slice(0,10)}.txt`,o.click(),window.URL.revokeObjectURL(r)}catch(t){console.error("Error generating report:",t),alert("Failed to generate report. Please try again.")}finally{m(null)}},w=()=>{const a=l.reduce((r,o)=>r+parseFloat(o.total||0),0),t=a/l.length,s={};return l.forEach(r=>{const o=r.currency||"USD";s[o]=(s[o]||0)+parseFloat(r.total||0)}),`SALES PERFORMANCE REPORT
Generated: ${new Date().toLocaleString()}
Date Range: ${c}

SUMMARY
========
Total Invoices: ${l.length}
Total Revenue: ${n(a)}
Average Invoice Value: ${n(t)}
Total Customers: ${i.totalCustomers}
Total Salespersons: ${i.totalSalespersons}

CURRENCY BREAKDOWN
==================
${Object.entries(s).map(([r,o])=>`${r}: ${n(o)}`).join(`
`)}

TOP PERFORMING SALESPERSONS
===========================
${v().slice(0,10).map((r,o)=>`${o+1}. ${r.name}: ${n(r.total)} (${r.count} invoices)`).join(`
`)}

TOP CUSTOMERS
=============
${b().slice(0,10).map((r,o)=>`${o+1}. ${r.name}: ${n(r.total)} (${r.count} invoices)`).join(`
`)}`},$=()=>{const a=v();return`SALESPERSON PERFORMANCE REPORT
Generated: ${new Date().toLocaleString()}
Date Range: ${c}

SALESPERSON RANKINGS
====================
${a.map((t,s)=>`${s+1}. ${t.name}
   Total Sales: ${n(t.total)}
   Invoice Count: ${t.count}
   Average Sale: ${n(t.total/t.count)}
   Currency Mix: ${t.currencies.join(", ")}
   -------------------------`).join(`
`)}

SUMMARY STATISTICS
==================
Total Salespersons: ${a.length}
Top Performer: ${a[0]?.name||"N/A"}
Total Revenue: ${n(a.reduce((t,s)=>t+s.total,0))}`},C=()=>{const a=b();return`CUSTOMER ANALYTICS REPORT
Generated: ${new Date().toLocaleString()}
Date Range: ${c}

CUSTOMER RANKINGS
=================
${a.map((t,s)=>`${s+1}. ${t.name}
   Total Spent: ${n(t.total)}
   Invoice Count: ${t.count}
   Average Order: ${n(t.total/t.count)}
   -------------------------`).join(`
`)}

SUMMARY STATISTICS
==================
Total Customers: ${a.length}
Top Customer: ${a[0]?.name||"N/A"}
Total Revenue: ${n(a.reduce((t,s)=>t+s.total,0))}`},A=()=>{const a={};return l.forEach(t=>{const s=t.currency||"USD";a[s]=(a[s]||0)+parseFloat(t.total||0)}),`REVENUE ANALYSIS REPORT
Generated: ${new Date().toLocaleString()}
Date Range: ${c}

CURRENCY BREAKDOWN
==================
${Object.entries(a).map(([t,s])=>`${t}: ${n(s)} (${(s/i.totalRevenue*100).toFixed(1)}%)`).join(`
`)}

MONTHLY REVENUE TREND
=====================
${T().map(t=>`${t.month}: ${n(t.revenue)}`).join(`
`)}

SUMMARY
========
Total Revenue: ${n(i.totalRevenue)}
Primary Currency: ${Object.entries(a).sort(([,t],[,s])=>s-t)[0]?.[0]||"N/A"}
Revenue Growth: Calculated based on historical data`},D=()=>`INVOICE SUMMARY REPORT
Generated: ${new Date().toLocaleString()}
Date Range: ${c}

INVOICE LISTING
===============
${l.slice(0,100).map((a,t)=>`${t+1}. Invoice #${a.invoiceNumber||a.id}
   Customer: ${a.customerName||"Unknown"}
   Salesperson: ${a.salespersonName||"Unknown"}
   Amount: ${n(parseFloat(a.total||0))} ${a.currency||"USD"}
   Date: ${a.invoiceDate||"Unknown"}
   -------------------------`).join(`
`)}

${l.length>100?`
... and ${l.length-100} more invoices`:""}

SUMMARY
========
Total Invoices: ${l.length}
Total Value: ${n(l.reduce((a,t)=>a+parseFloat(t.total||0),0))}`,E=a=>`${a.toUpperCase()}
Generated: ${new Date().toLocaleString()}
Date Range: ${c}

DATA SUMMARY
============
Total Invoices: ${l.length}
Total Revenue: ${n(i.totalRevenue)}
Total Customers: ${i.totalCustomers}
Total Salespersons: ${i.totalSalespersons}

This report contains comprehensive data analysis based on ${l.length} invoices.`,v=()=>{const a={};return l.forEach(t=>{const s=t.salespersonName||"Unknown",r=parseFloat(t.total||0),o=t.currency||"USD";a[s]||(a[s]={name:s,total:0,count:0,currencies:new Set}),a[s].total+=r,a[s].count+=1,a[s].currencies.add(o)}),Object.values(a).map(t=>({...t,currencies:Array.from(t.currencies)})).sort((t,s)=>s.total-t.total)},b=()=>{const a={};return l.forEach(t=>{const s=t.customerName||"Unknown",r=parseFloat(t.total||0);a[s]||(a[s]={name:s,total:0,count:0}),a[s].total+=r,a[s].count+=1}),Object.values(a).sort((t,s)=>s.total-t.total)},T=()=>{const a={};return l.forEach(t=>{const r=(t.invoiceDate||"").slice(0,7);r&&(a[r]=(a[r]||0)+parseFloat(t.total||0))}),Object.entries(a).sort(([t],[s])=>s.localeCompare(t)).slice(0,12).map(([t,s])=>({month:t,revenue:s}))};return e.jsxs("div",{className:"min-h-screen bg-gradient-to-br from-gray-50 to-blue-50",children:[e.jsx("div",{className:"bg-white shadow-sm border-b border-gray-200",children:e.jsx("div",{className:"max-w-7xl mx-auto px-4 py-6",children:e.jsxs("div",{className:"flex flex-col md:flex-row md:items-center md:justify-between",children:[e.jsxs("div",{children:[e.jsxs("h1",{className:"text-3xl font-bold text-gray-900 flex items-center gap-3",children:[e.jsx("span",{className:"text-4xl",children:"📋"}),"Reports & Analytics"]}),e.jsx("p",{className:"text-gray-600 mt-1",children:"Generate detailed reports and export data"})]}),e.jsxs("div",{className:"mt-4 md:mt-0 flex gap-2",children:[e.jsx("button",{className:"px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors flex items-center gap-2",children:"📅 Schedule Report"}),e.jsx("button",{className:"px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-colors flex items-center gap-2",children:"📊 Report History"})]})]})})}),e.jsxs("div",{className:"max-w-7xl mx-auto px-4 py-8",children:[e.jsx("div",{className:"grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8",children:S.map((a,t)=>e.jsx(k,{...a},t))}),e.jsxs("div",{className:"bg-white rounded-xl shadow-lg border border-gray-200 p-6 mb-8",children:[e.jsx("h2",{className:"text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2",children:"⚙️ Report Configuration"}),e.jsxs("div",{className:"grid grid-cols-1 md:grid-cols-3 gap-4",children:[e.jsxs("div",{children:[e.jsx("label",{className:"block text-sm font-medium text-gray-700 mb-2",children:"Date Range"}),e.jsxs("select",{value:c,onChange:a=>d(a.target.value),className:"w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent",children:[e.jsx("option",{value:"last7days",children:"Last 7 Days"}),e.jsx("option",{value:"last30days",children:"Last 30 Days"}),e.jsx("option",{value:"last90days",children:"Last 90 Days"}),e.jsx("option",{value:"lastyear",children:"Last Year"}),e.jsx("option",{value:"alltime",children:"All Time"}),e.jsx("option",{value:"custom",children:"Custom Range"})]})]}),e.jsxs("div",{children:[e.jsx("label",{className:"block text-sm font-medium text-gray-700 mb-2",children:"Format"}),e.jsxs("select",{value:h,onChange:a=>x(a.target.value),className:"w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent",children:[e.jsx("option",{value:"pdf",children:"📄 PDF"}),e.jsx("option",{value:"xlsx",children:"📊 Excel (XLSX)"}),e.jsx("option",{value:"csv",children:"📋 CSV"}),e.jsx("option",{value:"json",children:"🔧 JSON"})]})]}),e.jsxs("div",{children:[e.jsx("label",{className:"block text-sm font-medium text-gray-700 mb-2",children:"Delivery"}),e.jsxs("select",{className:"w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent",children:[e.jsx("option",{value:"download",children:"💾 Download"}),e.jsx("option",{value:"email",children:"📧 Email"}),e.jsx("option",{value:"cloud",children:"☁️ Cloud Storage"})]})]})]})]}),e.jsxs("div",{children:[e.jsxs("div",{className:"mb-6",children:[e.jsx("h2",{className:"text-2xl font-bold text-gray-900 mb-2",children:"📊 Available Reports"}),e.jsx("p",{className:"text-gray-600",children:"Choose from our comprehensive collection of business reports"})]}),e.jsx("div",{className:"grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6",children:j.map((a,t)=>e.jsx(U,{...a,onGenerate:N,isGenerating:u===a.title},t))})]}),e.jsxs("div",{className:"mt-12",children:[e.jsx("h2",{className:"text-2xl font-bold text-gray-900 mb-6",children:"📁 Recent Reports"}),e.jsx("div",{className:"bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden",children:e.jsx("div",{className:"overflow-x-auto",children:e.jsxs("table",{className:"w-full",children:[e.jsx("thead",{className:"bg-gray-50 border-b border-gray-200",children:e.jsxs("tr",{children:[e.jsx("th",{className:"px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider",children:"Report"}),e.jsx("th",{className:"px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider",children:"Generated"}),e.jsx("th",{className:"px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider",children:"Format"}),e.jsx("th",{className:"px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider",children:"Size"}),e.jsx("th",{className:"px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider",children:"Actions"})]})}),e.jsx("tbody",{className:"divide-y divide-gray-200",children:[{name:"Sales Performance Report",date:"2 hours ago",format:"PDF",size:"2.4 MB"},{name:"Customer Analytics Report",date:"1 day ago",format:"XLSX",size:"5.1 MB"},{name:"Revenue Analysis Report",date:"3 days ago",format:"CSV",size:"1.8 MB"},{name:"Salesperson Performance Report",date:"1 week ago",format:"PDF",size:"3.2 MB"}].map((a,t)=>e.jsxs("tr",{className:"hover:bg-gray-50 transition-colors",children:[e.jsx("td",{className:"px-6 py-4 whitespace-nowrap",children:e.jsx("div",{className:"font-medium text-gray-900",children:a.name})}),e.jsx("td",{className:"px-6 py-4 whitespace-nowrap text-sm text-gray-600",children:a.date}),e.jsx("td",{className:"px-6 py-4 whitespace-nowrap",children:e.jsx("span",{className:"inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800",children:a.format})}),e.jsx("td",{className:"px-6 py-4 whitespace-nowrap text-sm text-gray-600",children:a.size}),e.jsxs("td",{className:"px-6 py-4 whitespace-nowrap text-right text-sm font-medium",children:[e.jsx("button",{className:"text-blue-600 hover:text-blue-900 mr-3",children:"📥 Download"}),e.jsx("button",{className:"text-red-600 hover:text-red-900",children:"🗑️ Delete"})]})]},t))})]})})})]})]})]})};export{z as default};
