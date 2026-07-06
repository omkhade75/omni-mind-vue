# OmniMind AI — Mall Intelligence & Decision OS 🚀

**OmniMind AI** is an advanced, AI-powered decision operating system designed specifically for modern mall operations and large-scale retail environments. It unifies sales, inventory, customers, suppliers, and utilities into a single, cohesive decision surface. With predictive analytics and evidence-backed AI recommendations, OmniMind AI is built for owners, administrators, and floor managers to make rapid, data-driven decisions.

🌐 **Live Project Link**: [https://omni-ai-5uz8.onrender.com](https://omni-ai-5uz8.onrender.com)

---

## ✨ Key Features

- **Command Center Dashboard**: Real-time analytics, daily revenue metrics, and high-level mall performance indicators.
- **Billing (POS) Engine**: Lightning-fast Point of Sale system with automatic GST (CGST/SGST) calculations, dynamic customer spend tracking, and beautiful printable invoices.
- **Accounts & Finance**: Automated tracking of Accounts Payable (suppliers) and Accounts Receivable (customers), ensuring cash flow is always visible.
- **Supplier & Purchase Order Management**: Track vendor performance, manage POs, and instantly identify pending payments.
- **Customer 360 & Loyalty**: Track customer footfall, monitor loyalty points, and identify high-value shoppers at risk of churning.
- **WhatsApp Mass Broadcasting**: (Coming Soon) Engage your customers instantly with personalized offers, discounts, and greetings directly via WhatsApp.
- **Smart Inventory**: Monitor stock levels, track reorder thresholds, and generate restock alerts before items run out.
- **WhatsApp Notifications**: Automatically dispatch digital POS receipts to customers via WhatsApp and send emergency low-stock alerts directly to the owner's phone.
- **Decision Intelligence AI**: Ask natural language questions about your business (e.g. *"Which products are low on stock?"*, *"Who are my top churning customers?"*) and get immediate, data-backed answers derived directly from the live PostgreSQL database.
- **Role-Based Authentication**: Secure access controls ensuring sensitive financial data is only visible to authorized roles (Owner, Admin, Manager).

---

## 🛠️ Technology Stack

OmniMind AI is built using a modern, scalable, and type-safe stack:

### Frontend
- **React 18**
- **TypeScript**
- **TanStack Start (Router)** for advanced, type-safe server-side rendering and routing.
- **Tailwind CSS** for rapid, responsive UI styling.
- **shadcn/ui** & **Radix UI** for accessible, customizable UI components.
- **Recharts** for beautiful, interactive data visualizations.
- **Lucide React** for crisp, consistent iconography.

### Backend & Database
- **Node.js** (Server-side rendering and API functions via TanStack Start).
- **Prisma ORM** for seamless database modeling, migrations, and type-safe querying.
- **PostgreSQL** as the primary relational database.

### AI & Intelligence
- Integration ready with **Google Gemini API** & **Groq**.
- Built-in **Prisma Dynamic Intent Engine** to answer analytical queries even without external LLMs.

### Deployment & Hosting
- **Render** for seamless, automated full-stack deployments.

---

## 🔒 Security & Access

This application implements secure authentication and protected routes. Unauthenticated visitors are greeted by a modern landing page but cannot access the internal dashboard. All database queries and AI insights are securely fenced behind the authentication layer.

*Note: As this is a live production environment, no local development URLs are present in this repository.*

---

*Designed and engineered to transform mall operations from reactive tracking to proactive intelligence.*
