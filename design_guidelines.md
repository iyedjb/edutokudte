# EDucfy+ Design Guidelines

## Design Approach
**System-Based with Custom Theming**: Drawing from Material Design principles for educational apps, customized with the specified white-and-blue theme. Mobile-first TikTok-inspired video interface combined with clean dashboard aesthetics.

## Core Design Elements

### A. Color Palette
**Light Mode (Primary):**
- Primary Blue: `210 100% 52%` (#0B72FF)
- Background: `0 0% 100%` (pure white)
- Surface: `210 20% 98%` (subtle blue-tinted white)
- Text Primary: `220 20% 15%`
- Text Secondary: `220 10% 45%`
- Success: `140 60% 45%` (grades/positive feedback)
- Border: `210 15% 90%`

**Accent Colors:**
- Interactive Hover: `210 100% 58%` (lighter blue)
- Active State: `210 100% 45%` (darker blue)
- Notification Badge: `5 85% 55%` (red for alerts)

### B. Typography
**Font Family:**
- Primary: Inter (Google Fonts) - clean, modern, excellent readability
- Headings: Inter 600-700 (semibold to bold)
- Body: Inter 400-500 (regular to medium)

**Scale:**
- Hero/Dashboard Title: text-3xl md:text-4xl font-bold
- Section Headers: text-xl md:text-2xl font-semibold
- Card Titles: text-lg font-semibold
- Body Text: text-base
- Captions/Meta: text-sm text-gray-600

### C. Layout System
**Spacing Primitives:** Use Tailwind units of 2, 4, 6, and 8 for consistent rhythm
- Component padding: p-4 to p-6
- Section spacing: space-y-6 to space-y-8
- Card gaps: gap-4
- Page margins: px-4 md:px-6 lg:px-8

**Container Widths:**
- Mobile: Full width with px-4
- Desktop Dashboard: max-w-7xl mx-auto
- Content Cards: max-w-4xl
- Chat/Messages: max-w-3xl

### D. Component Library

**Navigation:**
- Bottom Tab Bar (Mobile): Fixed bottom navigation with 5 icons - Dashboard, EduTok, Chat, Grades, AI Chat
- Each tab: Icon (24px) + label, active state with primary blue fill
- Floating AI Chat Button: Fixed bottom-right on desktop, integrated in mobile nav

**Cards:**
- Style: Rounded-xl (12px), shadow-md, white background, border border-gray-100
- Hover: shadow-lg transition-shadow duration-200
- Padding: p-6
- Common types: Class cards, grade cards, video metadata cards, chat message bubbles

**Dashboard Components:**
- Welcome Header: Gradient background (blue-50 to white), user avatar, greeting text
- Quick Stats: Grid of 2x2 cards showing attendance, upcoming events, recent grades
- Class Cards: Horizontal scroll on mobile, grid on desktop, each with class name, teacher, schedule chip
- Calendar Widget: Compact monthly view with event dots

**EduTok Video Feed:**
- Full-screen vertical scrolling
- Video player takes 70vh on mobile, centered
- Bottom overlay: Video title, caption, uploader info
- Right-side action column: Like (heart icon + count), comment (chat icon + count), share
- Swipe gestures: Up/down for next/previous video
- Comment sheet: Slide up modal with rounded-t-3xl

**Chat Interface:**
- Message Bubbles: Rounded-2xl, own messages (blue bg, white text, ml-auto), others (gray-100 bg, text-gray-900)
- Input Bar: Fixed bottom, rounded-full input with send button (blue circle)
- Timestamps: Small gray text, grouped by time
- Teacher messages: Subtle blue left border indicator

**Grade Display:**
- Subject Cards: Grid layout, each showing subject name, average, progress ring
- Bimestre Tabs: Horizontal pills, blue fill for active
- Grade Table: Clean rows with subject, grade, date, teacher

**AI Chatbot:**
- Floating Button: Blue circle with sparkle/robot icon, pulse animation
- Chat Modal: Slide-up on mobile (rounded-t-3xl), centered on desktop (max-w-2xl)
- Bot messages: Light blue background, left-aligned
- Suggested questions: Pill buttons below input

**Forms & Inputs:**
- Text Fields: Rounded-lg, border-2 border-gray-200, focus:border-blue-500
- Buttons Primary: Rounded-lg, bg-blue-600, hover:bg-blue-700, px-6 py-3, font-semibold
- Buttons Secondary: Rounded-lg, border-2 border-blue-600, text-blue-600, hover:bg-blue-50

### E. Animations
**Minimal, Purposeful Motion:**
- Page transitions: Fade + slide up (300ms ease-out)
- Card hover: Scale 1.02, shadow transition
- Button press: Scale 0.98
- Loading states: Subtle pulse on skeleton screens
- Notification entry: Slide down from top
- Video like: Heart scale + color change
- No complex scroll-driven or parallax effects

### F. Mobile-First Considerations
- Touch targets minimum 44px
- Bottom navigation always accessible
- Swipeable video feed
- Pull-to-refresh on dashboard and feeds
- Sticky headers for long scrolls
- Large, clear CTAs

### G. Iconography
**Library:** Heroicons (CDN) for consistency
- Navigation: outline style, 24px
- In-card actions: mini solid style, 16-20px
- Use consistent metaphors: Home (dashboard), PlayCircle (videos), ChatBubble, AcademicCap (grades), Sparkles (AI)

### H. Images & Media
**Profile/Avatars:** Circular, 40px default, 64px on profile pages
**Video Thumbnails:** 16:9 aspect ratio, rounded-lg
**Empty States:** Use blue-tinted illustrations or icons, not photos
**No hero images needed** - dashboard leads with functional cards immediately

## Brazilian Portuguese Localization
All UI text, buttons, placeholders, and messages must be in natural Brazilian Portuguese. Use formal but friendly tone suitable for students.