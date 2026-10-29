---
name: SmartPay Africa Design System
colors:
  surface: '#f9f9ff'
  surface-dim: '#d0daf2'
  surface-bright: '#f9f9ff'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f0f3ff'
  surface-container: '#e8eeff'
  surface-container-high: '#dfe8ff'
  surface-container-highest: '#d9e3fb'
  on-surface: '#111c2d'
  on-surface-variant: '#45474c'
  inverse-surface: '#273143'
  inverse-on-surface: '#ecf0ff'
  outline: '#76777d'
  outline-variant: '#c6c6cd'
  surface-tint: '#565e71'
  primary: '#000000'
  on-primary: '#ffffff'
  primary-container: '#141b2c'
  on-primary-container: '#7c8498'
  inverse-primary: '#bfc6dc'
  secondary: '#8c4f00'
  on-secondary: '#ffffff'
  secondary-container: '#fe9821'
  on-secondary-container: '#663800'
  tertiary: '#000000'
  on-tertiary: '#ffffff'
  tertiary-container: '#00210e'
  on-tertiary-container: '#009756'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#dbe2f9'
  primary-fixed-dim: '#bfc6dc'
  on-primary-fixed: '#141b2c'
  on-primary-fixed-variant: '#3f4759'
  secondary-fixed: '#ffdcbf'
  secondary-fixed-dim: '#ffb874'
  on-secondary-fixed: '#2d1600'
  on-secondary-fixed-variant: '#6b3b00'
  tertiary-fixed: '#70fda7'
  tertiary-fixed-dim: '#51df8e'
  on-tertiary-fixed: '#00210e'
  on-tertiary-fixed-variant: '#00522c'
  background: '#f9f9ff'
  on-background: '#111c2d'
  surface-variant: '#d9e3fb'
typography:
  display-hero:
    fontFamily: Inter
    fontSize: 36px
    fontWeight: '700'
    lineHeight: 44px
    letterSpacing: -0.02em
  display-hero-mobile:
    fontFamily: Inter
    fontSize: 30px
    fontWeight: '700'
    lineHeight: 38px
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Outfit
    fontSize: 28px
    fontWeight: '700'
    lineHeight: 36px
    letterSpacing: -0.01em
  headline-md:
    fontFamily: Outfit
    fontSize: 22px
    fontWeight: '600'
    lineHeight: 30px
    letterSpacing: -0.01em
  headline-sm:
    fontFamily: Outfit
    fontSize: 18px
    fontWeight: '600'
    lineHeight: 26px
  balance-num-lg:
    fontFamily: Inter
    fontSize: 32px
    fontWeight: '700'
    lineHeight: 40px
    letterSpacing: -0.02em
  balance-num-md:
    fontFamily: Inter
    fontSize: 22px
    fontWeight: '700'
    lineHeight: 28px
    letterSpacing: -0.01em
  body-lg:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '500'
    lineHeight: 24px
  body-md:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
  body-sm:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '400'
    lineHeight: 18px
  label-nav:
    fontFamily: Inter
    fontSize: 10px
    fontWeight: '600'
    lineHeight: 12px
    letterSpacing: 0.06em
  label-badge:
    fontFamily: Inter
    fontSize: 11px
    fontWeight: '600'
    lineHeight: 14px
    letterSpacing: 0.02em
  mono-crypto:
    fontFamily: Inter
    fontSize: 13px
    fontWeight: '500'
    lineHeight: 18px
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  gutter: 1rem
  margin: 1rem
  space-xs: 0.25rem
  space-sm: 0.5rem
  space-md: 1rem
  space-lg: 1.5rem
  space-xl: 2rem
---

## Brand & Style

This design system establishes a high-trust, premium African fintech aesthetic engineered specifically for high-speed Bitcoin Lightning network transactions and cross-border digital financial services. The visual atmosphere balances the institutional security of tier-one banking with the vibrancy and innovation of the continent's digital transformation.

### Brand Personality & Emotional Profile
- **Institutional Reliability:** Robust deep navy anchors establish structural clarity and banking-grade security.
- **Dynamic Energy:** Bitcoin amber-orange and emerald green accents convey immediate settlement speed, growth, and optimism.
- **Effortless Clarity:** Clean visual hierarchies, high-contrast numeric data displays, and uncluttered mobile canvases minimize cognitive load during real-time transactions.
- **Localized Professionalism:** Fully French-language localized nomenclature (`ACCUEIL`, `ACTIVITÉ`, `SCANNER`, `SERVICES`, `PROFIL`) tailored to West, Central, and Pan-African Francophone mobile-first users.

### Design Movement
**Modern Mobile Neomorphism / Contemporary Fintech:** A synthesis of crisp surface layers, ultra-soft diffused ambient shadows, generous 16px–24px rounded containers, high-legibility numerical layouts, and distinctive status badges (including explicit `Mode Démonstration Regtest` environments).

## Colors

The color palette is deliberately calibrated for financial precision, accessibility, and instant transaction feedback across mobile displays.

### Palette Roles & Hierarchy
- **Primary Navy (`#101828`):** Dominates primary structural navigation, master typography, interactive dark cards, and prominent action button surfaces.
- **Bitcoin Orange (`#F7931A`):** Applied selectively to primary Lightning payment triggers, active tab states, satoshi counters, and Bitcoin identity elements.
- **African Green (`#12B76A`):** Designates successful inbound Lightning settlements, positive balance growth, confirmed block states, and active channel health.
- **Background Gray (`#F4F6F8`):** Neutral canvas providing gentle relief behind elevated white cards and interactive sheets.
- **Surface Pure White (`#FFFFFF`):** Base container fill for elevated dashboard modules, action modals, and form elements.
- **Secondary Text (`#667085`):** Subdued contrast for transaction timestamps, invoice IDs, exchange fees, and metadata labels.
- **Light Border (`#EAECF0`):** Single-pixel perimeter strokes framing cards, dividers, and input borders.
- **System Feedback Alerts:**
  - **Error Red (`#F04438`):** Failed routing, expired invoices, insufficient channel liquidity.
  - **Warning Amber (`#F79009`):** Network congestion warnings, testnet balance disclaimers, pending node confirmations.
  - **Regtest Badge:** Amber tint `#FEF0C7` with `#B54708` label fill for `Mode Démonstration Regtest` notices.

## Typography

The typographic hierarchy couples geometric structural headers with ultra-functional, dense data tables.

- **Primary Headings (Outfit):** Utilized for screen titling, category banners, and promotional greetings to deliver warm, geometric modernity reminiscent of clean contemporary fintech branding.
- **Financial Balances & Currency Readouts (Inter Bold):** Tabular numeric figures are strictly rendered in Inter to guarantee fixed-width alignment across satoshis (SATS), Bitcoin (BTC), and West African CFA Franc (XOF) values.
- **Functional Body & Metadata (Inter Regular / Medium):** Powers all descriptions, fee breakdowns, form prompts, and transaction histories with optimal legibility on compact OLED and LCD mobile screens.
- **Navigation Labels (Inter SemiBold):** Fully uppercase tracking (`letter-spacing: 0.06em`) for the 5-item mobile bottom navigation bar (`ACCUEIL`, `ACTIVITÉ`, `SCANNER`, `SERVICES`, `PROFIL`).

## Layout & Spacing

The layout is built on a mobile-first, vertical rhythm system rooted in an 8pt base grid with a 4pt subgrid for micro-alignments.

### Grid & Viewport Specifications
- **Canvas Edge Margin:** Fixed `16px` (`margin`) on mobile screens (`360px` to `428px`), expanding to `24px` on tablet viewports.
- **Vertical Card Padding:** Internal card containers maintain uniform `16px` to `24px` padding to preserve touch targets and visual breathing room.
- **Interaction Spacing:** Minimum interactive target dimensions are `48px × 48px` for all buttons, tab items, and QR action triggers.
- **Safe Area Insets:** Strict enforcement of native status bar allowances at top (`44px`–`48px`) and home indicator inset at bottom (`24px`–`34px`) beneath the bottom navigation bar.

## Elevation & Depth

Visual hierarchy uses a layered card architecture rather than stark drop shadows, ensuring clarity under bright outdoor conditions.

### Elevation Levels
- **Level 0 (Canvas Base):** Background Light Gray (`#F4F6F8`), completely flat.
- **Level 1 (Surface Cards):** Pure White (`#FFFFFF`) with a 1px border stroke of Light Border (`#EAECF0`) and an ambient, low-spread shadow: `0px 2px 8px rgba(16, 24, 40, 0.04)`.
- **Level 2 (Featured Wallet Cards):** Premium balance presentation surfaces featuring subtle linear gradients (e.g., Deep Navy `#101828` to `#1D2939`) paired with a soft ambient shadow: `0px 8px 24px rgba(16, 24, 40, 0.12)`.
- **Level 3 (Floating Elements & Modals):** QR Scanner sheets, PIN-entry bottom drawers, and active bottom navigation docked to the screen bottom: `0px -4px 20px rgba(16, 24, 40, 0.06)`, framed with `#EAECF0` top borders.
- **Level 4 (Elevated Action Buttons):** The central `SCANNER` floating tab button features an orange ambient glow: `0px 6px 16px rgba(247, 147, 26, 0.35)`.

## Shapes

The shape system employs generous, organic radii to deliver a welcoming, ultra-modern mobile wallet feel.

- **Primary Cards & Modules:** `16px` (`rounded-lg`) to `24px` (`rounded-xl`) outer radius.
- **Buttons & Input Fields:** `12px` to `16px` radius for tactile grip.
- **Badges, Tags & Quick-Pills:** Full circular rounding (`9999px` / pill) for network identifiers, status alerts, and regtest markers.
- **Central Action Button (Scanner):** Perfectly circular (`56px × 56px`, `rounded-full`) floating focal point.

## Components

### 1. Navigation Bar (Barre de Navigation Basse)
- **Structure:** 5 fixed touch zones: `ACCUEIL`, `ACTIVITÉ`, `SCANNER`, `SERVICES`, `PROFIL`.
- **Styling:** White surface background (`#FFFFFF`), `1px` top border (`#EAECF0`). Height of `64px` + device bottom safe inset.
- **Active State:** Icon and label transition to Bitcoin Orange (`#F7931A`) with `font-weight: 600`.
- **Central Action (`SCANNER`):** Elevated circular trigger (`56px` diameter) resting slightly above the bar baseline, filled with Bitcoin Orange (`#F7931A`), carrying a white lightning camera/QR icon with elevation level 4 glow.

### 2. Status Badges & Testnet Indicators
- **Regtest Badge:** Pill-shaped pill badge with text `"Mode Démonstration Regtest"`. Fill: `#FEF0C7`, text: `#B54708`, border: `1px solid #FEDF89`.
- **Transaction Status Badges:**
  - *Succès:* Fill `#D1FADF`, text `#039855`.
  - *En attente:* Fill `#FEF0C7`, text `#B54708`.
  - *Échec:* Fill `#FEE4E2`, text `#D92D20`.

### 3. Financial Balance Cards
- **Main Balance Tile:** Deep Navy (`#101828`) card with `20px` radius, housing the aggregate wallet value in BTC/SATS alongside regional conversion currency (FCFA / XOF).
- **Secondary Metric Cards:** White surface (`#FFFFFF`) with `16px` corner radius, displaying Lightning channel capacity, daily limits, and fast actions (`Envoyer`, `Recevoir`, `Acheter`).

### 4. Action Buttons (Boutons)
- **Primary:** Filled Dark Navy (`#101828`) or Bitcoin Orange (`#F7931A`) with bold white text, height `52px`, `12px` corner radius.
- **Secondary / Ghost:** White background, `1px` Light Border (`#EAECF0`), Dark Navy text (`#101828`).
- **Icon Action Buttons:** Rounded circular containers (`48px`) with muted light gray fills (`#F4F6F8`) and Dark Navy glyphs.

### 5. Input Fields & Amount Selectors
- **Input Containers:** `52px` height, `#FFFFFF` fill, `#EAECF0` default border, transitioning to `#F7931A` on focus.
- **Satoshi / Currency Converter Input:** Large display inputs featuring embedded currency toggle chips (`BTC` / `SATS` / `XOF`).

### 6. Transaction Activity List (Liste d'Activité)
- **List Item Layout:** Left circular icon badge (`40px`, green arrow for receipt, navy arrow for outbound payment), center headline and time metadata, right aligned numeric amount (`+0.0024 BTC` in `#12B76A` or `-50,000 SATS` in `#101828`).