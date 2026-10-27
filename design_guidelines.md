# Pet Clinic Management System - Design Guidelines

## Design Approach

**Selected Framework**: Design System Approach - Material Design inspired with healthcare-optimized modifications

**Rationale**: This is a utility-focused, information-dense application requiring efficiency, reliability, and clear data hierarchy across multiple user roles. The system prioritizes functionality and learnability over visual experimentation, making a structured design system the optimal choice.

**Core Design Principles**:
- **Trust & Professionalism**: Healthcare context demands credibility and clarity
- **Warmth & Care**: Pet-focused warmth balances clinical efficiency
- **Information Clarity**: Complex data must be scannable and actionable
- **Role-Based Optimization**: Each user role sees tailored, relevant interfaces

---

## Color Palette

### Primary Colors (Professional Trust)
- **Primary Blue**: 210 85% 45% - Main actions, headers, trust elements
- **Primary Blue Light**: 210 85% 92% - Backgrounds, hover states
- **Primary Blue Dark**: 210 90% 30% - Active states, emphasis

### Secondary Colors (Pet Care Warmth)
- **Warm Coral**: 15 75% 65% - Accent for pet-related elements, gentle CTAs
- **Soft Teal**: 175 50% 55% - Success states, health indicators

### Semantic Colors
- **Success Green**: 145 60% 50% - Confirmed appointments, healthy status
- **Warning Amber**: 40 95% 55% - Low inventory, expiring medications
- **Error Red**: 0 70% 55% - Critical alerts, overdue appointments
- **Info Blue**: 210 85% 60% - General notifications

### Neutral Palette
- **Gray 950**: 220 15% 10% - Primary text
- **Gray 700**: 220 10% 40% - Secondary text
- **Gray 400**: 220 8% 65% - Borders, dividers
- **Gray 100**: 220 10% 96% - Backgrounds, cards
- **White**: Pure white for main backgrounds

### Dark Mode (Consistent Implementation)
- **Background**: 220 20% 10%
- **Card Surface**: 220 15% 15%
- **Text Primary**: 220 5% 95%
- **Borders**: 220 15% 25%

---

## Typography

### Font Families
- **Primary**: "Inter" (Google Fonts) - UI, forms, data tables
- **Display**: "Poppins" (Google Fonts) - Headings, section titles
- **Monospace**: "JetBrains Mono" (Google Fonts) - IDs, codes, technical data

### Type Scale
- **Display Large**: text-5xl (3rem) font-bold - Dashboard headers
- **Display Medium**: text-4xl (2.25rem) font-bold - Page titles
- **Heading 1**: text-3xl (1.875rem) font-semibold - Section headers
- **Heading 2**: text-2xl (1.5rem) font-semibold - Card headers
- **Heading 3**: text-xl (1.25rem) font-medium - Subsection titles
- **Body Large**: text-lg (1.125rem) font-normal - Emphasis text
- **Body**: text-base (1rem) font-normal - Default text
- **Body Small**: text-sm (0.875rem) font-normal - Helper text
- **Caption**: text-xs (0.75rem) font-medium - Labels, badges

---

## Layout System

### Spacing Primitives
Core spacing units: **2, 4, 6, 8, 12, 16, 20, 24** (Tailwind units)
- Micro spacing: gap-2, p-2 (within components)
- Standard spacing: gap-4, p-4 (component padding)
- Section spacing: gap-8, py-8 (between sections)
- Page spacing: gap-16, py-16 (major sections)

### Grid System
- **Dashboard Layout**: 12-column grid with sidebar (w-64 fixed)
- **Content Area**: max-w-7xl with p-6 to p-8 padding
- **Cards**: Grid columns - 1 (mobile) → 2 (md) → 3 (lg) for equal cards
- **Forms**: 1 column (mobile) → 2 columns (lg) for input efficiency

### Responsive Breakpoints
- Mobile: < 640px (single column, stacked navigation)
- Tablet: 640px - 1024px (2 columns, condensed sidebar)
- Desktop: ≥ 1024px (full layout, expanded sidebar)

---

## Component Library

### Navigation
**Sidebar (Desktop)**: 
- Fixed width (w-64), full height
- Logo + primary navigation with icons (Heroicons)
- Role-based menu items with badges for notifications
- User profile at bottom with quick actions

**Top Bar (Mobile)**:
- Fixed header with hamburger menu
- Clinic logo center, notifications/profile right
- Slide-in drawer navigation

**Breadcrumbs**: 
- Always visible for deep navigation
- text-sm with chevron separators

### Forms & Inputs
**Input Fields**:
- Floating labels for space efficiency
- Clear validation states (border colors)
- Helper text below (text-sm text-gray-600)
- Grouped related fields with fieldset

**Buttons**:
- Primary: bg-blue-600 text-white (main actions)
- Secondary: border border-gray-300 (alternative actions)
- Danger: bg-red-600 text-white (delete, critical)
- Icon-only: Square buttons with hover tooltips

**Date/Time Pickers**:
- Calendar overlay with time selection
- Quick options (Today, Tomorrow, Next Week)
- Appointment slot visualization

### Data Display
**Tables**:
- Sticky header on scroll
- Alternating row colors (hover states)
- Sortable columns with arrow indicators
- Inline actions (edit, view, delete icons)
- Pagination with page size selector

**Cards**:
- Subtle shadow (shadow-sm), rounded-lg
- Header with title + actions
- Organized content sections with dividers
- Footer with metadata (timestamps, status)

**Dashboards**:
- Stats cards in 2-4 column grid
- Large numbers (text-3xl) with trend indicators
- Charts using Chart.js (line for trends, bar for comparisons)
- Quick action shortcuts

### Status & Feedback
**Badges**:
- Pill-shaped (rounded-full) with color coding
- Appointment status: Pending (gray), Confirmed (green), Cancelled (red)
- Pet health: Healthy (green), Under Treatment (amber), Critical (red)

**Alerts**:
- Top-right toast notifications (dismissible)
- Inline alerts within forms/sections
- Icon + message + action button

**Progress Indicators**:
- Linear progress for file uploads
- Circular loaders for data fetching
- Skeleton screens for initial loads

### Modals & Overlays
**Dialogs**:
- Centered overlay with backdrop blur
- max-w-2xl for forms, max-w-md for confirmations
- Header + scrollable content + fixed footer actions

**Image/Document Viewer**:
- Full-screen lightbox for medical records
- Navigation arrows, zoom controls
- Download/share actions

---

## Animations & Interactions

**Micro-interactions** (use sparingly):
- Button press: scale-95 on active
- Card hover: subtle shadow increase (shadow-md)
- Notification entry: slide-in from right
- Form validation: shake animation on error

**Transitions**:
- Duration: 150ms for micro, 300ms for modals
- Easing: ease-in-out for natural feel

**Loading States**:
- Skeleton screens for initial page loads
- Spinner overlays for action processing
- Progress bars for file operations

---

## Page-Specific Layouts

### Dashboard (All Roles)
- Hero stats section: 3-4 metric cards with icons
- Recent activity feed: Timeline style with pet avatars
- Quick actions: Large button grid for common tasks
- Upcoming appointments: Compact list with time slots

### Appointment Management
- Calendar view: Month/Week/Day toggle
- Time slot grid with availability indicators
- Booking modal: Multi-step form (pet selection → time → service)
- List view: Filterable table with status badges

### Medical Records
- Two-panel layout: Pet list (left) → Record details (right)
- Timeline view for treatment history
- Image gallery for X-rays, photos
- Prescription form with drug search autocomplete

### Inventory Management
- Grid view for products with thumbnails
- Low stock warnings prominently displayed
- Batch/expiry tracking table
- Quick reorder actions

### Camera Monitoring (Customer View)
- Video grid: 1-4 camera feeds simultaneously
- Pet info sidebar with health updates
- Playback controls with timestamp markers
- Screenshot/clip download options

---

## Images & Visual Assets

### Hero Image Strategy
**Dashboard/Landing**: No large hero image - prioritize data density and quick access to tools

### Supporting Imagery
**Pet Profiles**: Circular avatars (96px) with species icon fallback
**Empty States**: Friendly illustrations of pets for "no data" screens
**Medical Records**: Document thumbnails in grid, expandable to full view
**Marketing Pages** (if applicable): High-quality pet photography showcasing happy, healthy animals in clinic environment

### Icon System
**Primary Library**: Heroicons (outline for navigation, solid for actions)
- Medical: Stethoscope, clipboard, pill icons
- Pets: Paw print, pet silhouettes (dog, cat, bird)
- Actions: Calendar, camera, document, chart icons

---

## Accessibility & Quality Standards

- **WCAG 2.1 AA Compliance**: Minimum 4.5:1 contrast for text
- **Keyboard Navigation**: Full support with visible focus indicators
- **Screen Readers**: Proper ARIA labels, landmark regions
- **Error Prevention**: Confirmation dialogs for destructive actions
- **Dark Mode**: Consistent throughout - all inputs, forms, and text fields properly styled

---

## Design Differentiation

This veterinary system balances clinical professionalism with pet care warmth through:
- Blue primary palette conveys medical trust
- Coral accents add approachability for pet owners
- Clear data hierarchy supports efficient staff workflows
- Role-optimized interfaces reduce cognitive load
- Consistent dark mode ensures 24/7 usability for night shifts