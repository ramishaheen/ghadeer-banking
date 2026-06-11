# Kinetic Finance / Rafiq — Extracted Design Intelligence

Source: Stitch project 5072592019834396433 — "Remix of Foundation UI Screens"
Extracted: 2026-06-11

## Project context (from Stitch sessions)

The project designs a mobile banking experience for **Bank al Etihad** (Jordan, JOD currency) consisting of:

1. **Kinetic Finance** — the core banking app screens (light mode): Accounts Overview (home), Products & Investments Hub, Physical Gold marketplace (shop, product detail), purchase flow.
2. **Rafiq رفيق** — an AI banking companion overlay (dark mode, premium): greeting/home, chat interface, smart insight cards, task execution (transfers with FaceID confirm), financial coaching, voice command, AI layer trigger on banking home.
3. **AI-guided tutorials** (the "orb"): gold purchase tutorial (6 frames), KYC annual update tutorial (5 frames), contextual AI tips overlays (accounts overview, hub investment guide, gold shop smart tips).

Session prompts (user asks, chronological-ish):
- "I'm designing a mobile AI companion called Rafiq رفيق for Bank al Etihad's banking app... Use [screenshots of the existing app] as source of truth for real services and features, existing navigation structure, actual UI components and layouts, real transaction types and account views."
- "Design a mobile AI companion app screen for Rafiq رفيق — an AI banking assistant by Bank al Etihad" (5-screen overlay spec)
- "Add the AI companion named (Rafeeq)" / "Give Rafeeq a more professional tone"
- "create similar for kyc update steps"
- "add AI layer and voice command"

## Brand colors (canonical, from session brief)

- Primary Orange: #DA532C
- Dark Orange: #B53F1A
- Amber: #F5A623
- Charcoal bg: #1A1A1A
- Card surface: #2C2C2C (also #2A2A2A in style guide)
- White text: #FFFFFF
- Muted text: #8A8A8A
- Project accent (Stitch theme): #ff6b00
- Language: Bilingual — English + Arabic (RTL support)
- Style: Dark mode premium fintech (Rafiq) + light mode clean banking (Kinetic core)

## Style Guide 1: "Kinetic Finance" (core banking, light)

## Brand & Style

The design system is built for a modern fintech audience, blending the reliability of a traditional institution with the agility of a startup. It evokes a sense of clarity, energy, and financial empowerment.

The style is **Corporate / Modern** with subtle **Tactile** influences. It prioritizes high legibility and efficient data density while using soft color gradients and rounded containers to feel approachable. The aesthetic is defined by "clean friction"—meaning every interaction feels intentional and secure, utilizing a light gray background to make card-based content feel physically separate and elevated.

## Layout & Spacing

This design system follows a **fluid grid** model tailored for mobile-first consumption.

- **Margins:** A standard 16px (1rem) margin is applied to the left and right of the main screen container.
- **Card Padding:** All internal card content should have a minimum padding of 20px (1.25rem) to ensure data doesn't feel cramped.
- **Product Grids:** The "Hub" utilizes a 4-column grid for utility icons and a 2-column grid for e-commerce/product cards.
- **Vertical Rhythm:** Sections are separated by a 24px gap to allow the light-gray background to act as a visual breather.

## Elevation & Depth

Hierarchy is established through **Tonal Layers** and subtle depth markers:

- **Surface Tiers:** The base layer is the light gray background. Content sits on white "Level 1" cards.
- **Shadows:** Use extremely soft, low-opacity (4-8%) neutral shadows for cards to give them a "lifted" feel without looking heavy.
- **Gradients:** Use linear gradients (Primary to a slightly lighter tint) on large balance cards and product icons to create a tactile, pillowy effect.
- **Active States:** Interactive elements like buttons and navigation icons use a slight color shift or scale-down (98%) effect rather than traditional deep shadows.

## Components

### Buttons & Actions
- **Primary Button:** Solid orange background with white text. Pill-shaped for high-level actions (e.g., "Show balance").
- **Secondary Button:** White background with a light gray border and dark text. Used for utility actions like "Transfer" or "IBAN".
- **Floating Action Button (FAB):** Small circular orange buttons with a '+' icon, typically overlaid on the bottom right of product cards.

### Cards
- **Balance Card:** Large, orange gradient container with white typography.
- **Product Card:** White base with an image/graphic top and structured text below. Includes a "badge" area for status (e.g., "Out of stock").
- **List Items:** Horizontal layout with an icon on the left, label/description in the center, and value/action on the right.

### Navigation
- **Bottom Nav:** A clean white bar with 3 primary destinations: 'Payment' (double arrows), 'Home' (flower-logo), and 'Hub' (geometric shapes). The active state is indicated by the primary orange color.
- **Segmented Control:** Used at the top of lists (e.g., Accounts, Cards, Stocks) with a subtle gray background for the inactive state and a white elevated card for the active state.

### Input Fields
- **Search Bar:** Subtle gray background with a magnifying glass icon, using the standard `rounded-lg` corner radius.
- **Chips:** Small, rounded labels used for "New" tags or status indicators, usually floating in the corner of parent components.

## Style Guide 2: "Kinetic Rafiq" (AI companion, dark)

## Brand & Style

This design system establishes a premium, "High-Net-Worth" digital environment for an AI banking assistant. The brand personality is authoritative yet conversational, blending the heritage of traditional banking with the velocity of AI-driven finance.

The aesthetic is **Modern Corporate with subtle Glassmorphism**, prioritizing high-contrast legibility and a sense of "prestige dark mode." The emotional response should be one of security, intelligence, and exclusivity. The interface utilizes depth through layered surfaces and "kinetic" orange glows that signify the AI's presence and activity. The design is built to be natively bilingual, ensuring the premium feel translates seamlessly between English (LTR) and Arabic (RTL) scripts.

## Layout & Spacing

This design system follows an **iOS-inspired fluid grid** with a strong emphasis on vertical stacks and generous inner padding.

- **Grid:** A 4-column layout for mobile and 12-column for tablet/desktop.
- **Margins:** Standard horizontal padding of 20px on mobile to ensure content doesn't hit the screen edges.
- **Bilingual Reflow:** The layout must completely flip for Arabic. Icons that indicate direction (like arrows) must be mirrored, except for those representing "clock-wise" time or universal symbols (like a credit card chip).
- **Safe Areas:** Adhere strictly to iOS Home Indicator and Status Bar safe areas, especially for the "Rafiq" input bar at the bottom of the screen.

## Elevation & Depth

Hierarchy is achieved through **Tonal Layering and Glassmorphism** rather than traditional heavy shadows.

- **Tier 1 (Base):** #1A1A1A (Background).
- **Tier 2 (Cards/Containers):** #2A2A2A with a subtle 1px border of #FFFFFF (10% opacity).
- **Tier 3 (Modals/Popovers):** Background blur (20px) with a #2A2A2A fill at 80% opacity. This creates the "premium glass" feel characteristic of high-end fintech.
- **Interaction Depth:** When a card is pressed, it should scale slightly (0.98) and increase the intensity of its inner glow rather than casting a larger shadow.
- **Kinetic Glow:** Use a soft, blurred Primary Orange orb (opacity 15%) behind the main AI interaction area to lift it from the background.

## Components

### Buttons
- **Primary:** Solid #DA532C background with white text. High-gloss finish optional.
- **Secondary:** Ghost style with #DA532C border and text.
- **Tertiary:** Pure text with an icon, used for less frequent actions like "View History."

### AI Input Bar (The "Rafiq" Bar)
A floating element at the bottom of the screen. Uses a heavy background blur, a 1px orange-tinted border, and a "Kinetic Glow" that pulses when the user is speaking or the AI is typing.

### Financial Cards
Balance displays should use **IBM Plex Serif** for the amount. Include a subtle "Sparkline" chart in the background of the card using a gradient of Primary Orange to transparent.

### Lists & Transaction Items
High-density layout. Iconography should be circular with a #2A2A2A background. Amount colors: Negative values in white, positive values in #F5A623 (Amber) or a custom success green if required.

### Chips & Tags
Small, 4px rounded capsules used for categorizing spending (e.g., "Food," "Travel"). Use #2A2A2A with a Primary Orange dot for active filters.

### Interactive Charts
Use the Primary/Dark Orange gradient for area charts. Touchpoints should trigger a haptic pulse and a vertical line indicating the date/value.

## Prototype navigation flows (from Stitch prototypes)

### Prototype 1: "Kinetic Banking & Wealth Hub"
Screens: Accounts Overview (8614...), Hub (2ae8...), Physical Gold Shop (a0e9...), Gold Product Detail (f3b0...)
- Accounts Overview: tap 'Hub' nav → Hub; tap 'Payment' nav → Hub
- Hub: tap 'Home' nav → Accounts Overview; tap 'Gold' tile → Physical Gold Shop; tap 'Payment' → Accounts Overview
- Physical Gold Shop: back button → Hub; 'Home' → Accounts; 'Payment' → Accounts; tap '5g PAMP' card → Gold Product Detail
- Gold Product Detail: back → Physical Gold Shop

### Prototype 2: "Kinetic Gold Investment Flow" (AI tutorial)
Screens: Tutorial Frames 1→6 (trigger → intent → path highlight → selection → confirmation → success)
- Frame 1 (Trigger): tap gradient-orb → Frame 2 (Intent Capture); tap monitoring row → Frame 3
- Frame 2 (Intent): tap 'Buy gold' chip → Frame 4 (Selection)
- Frame 3 (Path Highlight): tap #gold-tile → Frame 4; 'Next' → stays
- Frame 4 (Selection): tap 5g Gold Bar plus button → Frame 5 (Confirmation); 'SKIP' → Frame 1
- Frame 5 (Confirmation): 'Confirm purchase' → Frame 6 (Success)
- Frame 6 (Success): 'Show me other investments' → Frame 4; 'Hub' nav → Frame 1

## Screen inventory (29 HTML files in data/screens/)

Core banking (light): 28-accounts-overview, 01-products-investments-hub, 08-physical-gold-shop, 10-gold-product-detail
Rafiq AI companion (dark): 13-rafiq-home-greeting-dark, 25-rafiq-home-greeting-light, 02-rafiq-chat-interface, 14-rafiq-ai-companion-chat, 11-rafiq-smart-insight-card, 24-rafiq-task-execution-flow, 21-rafiq-financial-coaching, 23-rafiq-voice-command-active-listening, 18-banking-home-with-ai-layer-trigger
Gold purchase tutorial: 17-frame1-trigger, 09-frame2-intent-capture, 00-frame3-path-highlight, 05-frame4-selection, 12-frame5-confirmation, 19-frame6-success
KYC tutorial: 27-kyc1-trigger, 04-kyc2-section-overview, 20-kyc3-personal-info-entry, 03-kyc4-work-details, 06-kyc5-final-submission
AI overlay variants: 15-accounts-overview-with-ai-tutorial, 26-hub-with-ai-investment-guide, 07-gold-shop-with-ai-smart-tips
Prototypes: 16-kinetic-banking-wealth-hub-prototype, 22-kinetic-gold-investment-flow-prototype

## Key data facts (from screen prompts)

- User persona: "Ahmed" — Total Balance JOD 42,850.24, Checking JOD 12,400, Savings JOD 30,450
- Account: "Regular Demand JOD" account with Transfer / Show / IBAN actions
- Accounts Overview: 'Standard' membership badge, notifications, search, Total balance card (masked values), Money in/Money out, Cashback in vault + withdraw, Accounts list
- Hub Products: Bills, Loans, Savings Goals, Cards, Safety Box, Cheques, FlexiPay, Memberships, Subscription Manager
- Hub Investment: Stocks, Manage Wealth, Deposits, Physical Gold, Precious Metals (some with NEW badges)
- Gold shop: segmented Explore | My orders; 2-col grid; PAMP Gold Minted Bars 1g/2.5g/5g/10g; prices in JOD; some out of stock; 5g = JOD 564.727; live price updated every 60 seconds
- Gold purchase: delivery vs vault toggle; source account selector; confirm → Order placed, Order ID #99281, Track in My Orders
- Rafiq chat example: "Why was I charged SAR 150 yesterday?" → "That was your Netflix subscription renewal. You spend SAR 450/month on subscriptions. Want a full breakdown?" + [View Report]; quick chips: Transfer, Pay Bill, Check Balance
- Rafiq insight: "You saved JOD 120 more this month on Utilities than last month" + chart + Take Action/Dismiss
- Rafiq coaching: spending by category (Groceries, Dining, Subscriptions), savings goal "New Car Goal - 75%", tip: "+JOD 20/month hits goal 2 months early", Set a New Goal button
- Rafiq task execution: Transfer from Regular Demand JOD → Savings, JOD 500, FaceID confirm, success checkmark
- Rafiq voice: "Transfer 500 JOD to my savings account" transcript, "Rafiq is listening..." EN/AR
- KYC flow: annual KYC update — personal details checklist → personal info (marital status, spouse) → work details (employment status, company, job title) → final submission
- Bottom nav: Payment (double arrows) / Home (flower logo) / Hub (geometric shapes)
- Tutorial success: "I have added a reminder to check gold prices weekly. Want me to set a price alert?" chips: Yes set alert / No thanks / Show me other investments
