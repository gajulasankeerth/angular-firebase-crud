# 🏛️ Lusso Granite – Project Consultation & Specification System

A modern, high-performance web application built with **Angular 20**, **Tailwind CSS**, **Firebase**, and **Dropbox API** for **Lusso Granite** (Artisanal Stone Fabrication & Installation, Clarksville, TN).

The platform allows homeowners, builders, and contractors to configure countertop project specifications, digitally sign consultation agreements, automatically generate **native vector PDFs** with selectable text, store documents in Dropbox, and manage inquiries through an administrative portal.

---

## ✨ Key Features

### 📋 Interactive Project Consultation Form
- **Customer & Site Details**: Capture homeowner/builder information, job site address, subdivision, lot number, and contact info.
- **Scope & Project Conditions**: Selectable condition cards (*New Cabinets*, *Pre-Existing Cabinets*, *Remodel / Renovation*, *Tear Out & Removal*).
- **Dynamic Project Areas Builder**:
  - Add, edit, and configure individual surface areas (*Kitchen, Master Bath, Island, etc.*).
  - Specify material/color (*Quartz, Granite, Marble, Quartzite, Porcelain, or Custom Stone*).
  - Select edge profile (*Straight, Beveled, Bullnose, Ogee, Mitered, etc.*).
  - Configure sink mounting (*Undermount, Drop-in, Farmhouse*), backsplash height, faucet spread, and stove/cooktop cutouts.
  - Responsive presentation: interactive cards on mobile and full data table on desktop.
- **Digital Signature Pad**:
  - Live HTML5 canvas signature drawing pad with clear and touch support.
  - Automatic signature date stamping and agreement to terms of service.

### 📄 Smart Native Vector PDF Generator
- **100% Selectable & Searchable Text**:
  - Powered by `jsPDF` without blurry canvas screenshots or slow DOM cloning.
  - Real vector typography matching the brand palette (`#D4AF37` Gold, `#1C1917` Dark Slate).
  - Searchable with `Ctrl+F` / `Cmd+F`, crisp at any zoom level, and lightweight (~30–50 KB vs. 2 MB+ bitmap images).
- **Branded Layout**: Includes geometric stone facet logo, client details grid, address specifications, scope chips, areas table, estimator notes, terms of service, and high-resolution embedded digital signature.
- **Dynamic Multi-Page Support**: Automatically calculates vertical geometry and splits content cleanly across pages with running headers and footers.

### ☁️ Dropbox Cloud Storage
- Automatic background upload of generated specification PDFs directly to Dropbox storage (`/online-form-submissions`).
- Sanitized filenames with timestamp: `<Customer_Name>_Quote_<Timestamp>.pdf`.
- Built-in **OAuth Token Refresh Service** (`DropboxTokenService`) handling automatic token refreshes upon expiration without interrupting user flow.
- Shareable Dropbox links stored directly alongside form records in Firebase.

### 📊 Submissions Admin Portal (`/portal`)
- Search and filter customer inquiries in real-time by customer name, email, phone number, or city.
- Filter by status and review complete project area specifications.
- Quick links to view/download the uploaded specification PDF from Dropbox.

### 📱 Responsive & Mobile-Optimized Header
- **Desktop**: Full brand logo, company name, tagline, location, and phone call action.
- **Mobile**: Minimalist, sticky top navigation bar with brand logo and company name side-by-side on a single row (~40px height) to maximize screen real estate.

---

## 🛠️ Technology Stack

| Layer | Technology |
| :--- | :--- |
| **Framework** | [Angular 20](https://angular.dev/) (Standalone Components, Signals, Reactive Forms) |
| **Styling** | [Tailwind CSS 3.4](https://tailwindcss.com/) + Custom SCSS |
| **Database** | [Firebase](https://firebase.google.com/) (`@angular/fire`) |
| **Cloud Storage** | [Dropbox API v2](https://www.dropbox.com/developers/documentation/http/overview) |
| **PDF Generation** | [jsPDF](https://github.com/parallax/jsPDF) (Native Vector Rendering) |
| **Icons** | [Lucide Angular](https://lucide.dev/) + Inline SVG |
| **Fonts** | Google Fonts (*DM Sans*, *Playfair Display*) |

---

## 📂 Project Structure

```text
src/
├── app/
│   ├── components/
│   │   └── pdf-template/          # Visual HTML/SCSS PDF template component
│   ├── environment/
│   │   └── environment.ts         # Firebase environment configuration
│   ├── form-component/
│   │   ├── form-component.html    # Consultation form template & header
│   │   ├── form-component.scss    # Custom form & design system styles
│   │   └── form-component.ts      # Reactive form logic, modal, & submission
│   ├── portal/
│   │   ├── portal.html            # Admin inquiries dashboard
│   │   ├── portal.scss            # Portal styles
│   │   └── portal.ts              # Search, filter, & Firebase listing logic
│   ├── services/
│   │   ├── dropbox.service.ts     # Dropbox API integration & upload handling
│   │   ├── pdf-generator.service.ts # Pure vector PDF generator (jsPDF)
│   │   └── token.service.ts       # Dropbox OAuth token & auto-refresh
│   ├── app.html                   # Root template (<router-outlet />)
│   ├── app.routes.ts              # Route definitions (/ and /portal)
│   └── app.ts                     # Root application component
├── styles.scss                    # Global Tailwind directives & fonts
└── main.ts                        # Application bootstrap
```

---

## 🚀 Getting Started

### Prerequisites
- **Node.js**: `v18.x` or higher (tested with Node 20 / 24)
- **npm**: `v9.x` or higher
- **Angular CLI**: `npm install -g @angular/cli` (optional, local CLI supported via `npm run`)

### 1. Clone the Repository
```bash
git clone https://github.com/<your-username>/angular-firebase-crud.git
cd angular-firebase-crud
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Environment Configuration
Verify your Firebase and Dropbox credentials:

- **Firebase**: Ensure [src/app/environment/environment.ts](file:///Users/gajulasankeerth/Desktop/angular/angular-firebase-crud/src/app/environment/environment.ts) contains your valid Firebase configuration:
  ```typescript
  export const environment = {
    production: false,
    firebase: {
      apiKey: 'YOUR_API_KEY',
      authDomain: 'YOUR_AUTH_DOMAIN',
      projectId: 'YOUR_PROJECT_ID',
      storageBucket: 'YOUR_STORAGE_BUCKET',
      messagingSenderId: 'YOUR_MESSAGING_SENDER_ID',
      appId: 'YOUR_APP_ID',
    },
  };
  ```

- **Dropbox**: Configure your client credentials and refresh token in [src/app/services/token.service.ts](file:///Users/gajulasankeerth/Desktop/angular/angular-firebase-crud/src/app/services/token.service.ts).

---

## 💻 Development Commands

| Command | Description |
| :--- | :--- |
| `npm start` or `ng serve` | Start local development server at `http://localhost:4200/` |
| `npm run build` | Build production bundle to `dist/angular-firebase-crud` |
| `npm run watch` | Build with watch mode enabled for development |
| `npm test` | Run unit test suite using Karma |

---

## 📖 Application Routes

| Path | Component | Description |
| :--- | :--- | :--- |
| `/` | `FormComponent` | Customer consultation & countertop specification form |
| `/portal` | `Portal` | Admin inquiry portal for managing submissions |

---

## 🔒 Security & Best Practices

- **Separation of Concerns**: Storage operations (`DropboxService`) are decoupled from document creation (`PdfGeneratorService`).
- **Token Resilience**: Dropbox OAuth access tokens automatically refresh on `401 Unauthorized` responses without dropping user transactions.
- **Client-Side Validation**: Reactive form guards prevent submission of incomplete customer data, unselected project scopes, or missing signatures.
- **Optimized Bundle**: Tree-shaken vector generator replaces heavy DOM-cloning packages, keeping runtime memory footprint minimal.

---

## 📄 License

This project is licensed under the [MIT License](LICENSE).
