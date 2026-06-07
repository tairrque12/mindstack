# MindStack Design System

## Identity
MindStack is a personal second brain — dark, quiet, and intelligent. The UI is ambient, not aggressive. It doesn't shout. It listens.

## Colors
```
--bg:          #080808           /* near-black background */
--accent:      #F5A623           /* amber — CTAs, active states, insights only */
--text-primary: rgba(255,255,255,0.9)
--text-secondary: rgba(255,255,255,0.4)
--text-muted:   rgba(255,255,255,0.2)
--card-bg:      rgba(255,255,255,0.04)
--card-border:  rgba(255,255,255,0.1)
--input-bg:     rgba(255,255,255,0.06)
```

## Typography
- **Headers / Logo**: Syne Bold — the brand voice
- **Metadata / Insights / Tags / UI labels**: DM Mono — precise, technical
- Body text (streaming response): DM Mono or system-ui fallback
- Load from Google Fonts: `Syne:wght@700` + `DM+Mono:wght@400`
- No Inter. No Roboto. No system-ui as primary.

## Spacing
- Base unit: 8px
- Screen padding: 20px horizontal
- Card padding: 16px
- Section gap: 32px
- Touch target minimum: 44px

## Cards
```css
background: rgba(255,255,255,0.04);
border: 0.5px solid rgba(255,255,255,0.1);
border-radius: 8px;   /* subtle, not bubbly */
padding: 16px;
```

## Buttons
- Primary CTA (ADD, SAVE TO BRAIN): `background: #F5A623; color: #080808; font: DM Mono uppercase; height: 52px`
- Secondary (VIEW BRAIN, MIND MAP): `background: rgba(255,255,255,0.08); color: rgba(255,255,255,0.6); font: DM Mono uppercase tracking-wider; height: 40px`
- No box shadows on buttons. No gradients.

## Input fields
```css
background: rgba(255,255,255,0.06);
border: 0.5px solid rgba(255,255,255,0.1);
border-radius: 12px;
font-family: DM Mono;
color: rgba(255,255,255,0.9);
```
Focus state: border color transitions to rgba(245,166,35,0.6) — amber glow without a shadow.

## Accent usage rules
Amber (#F5A623) is used ONLY on:
- Primary CTA buttons
- Active/selected states
- Insight text on cards
- Currently active navigation item
- Streaming response cursor

Never use amber for decorative purposes. It means "action" or "insight."

## Animation
- Particle canvas: always on, behind everything. 60-80 nodes, amber (#F5A623) at 0.6 opacity, connected by lines at 0.3 opacity. Drift speed: slow (0.2–0.4px/frame). Responds to cursor on desktop (nodes nudge away slightly).
- Token streaming: text appears character-by-character. No typewriter cursor — just flowing text.
- Screen transitions: 200ms ease-in-out fade + 16px vertical translate.
- Card entrance: staggered fade-in, 40ms delay per card.
- No bounce animations. No spring physics. No attention-seeking motion.

## Rules
- NO gradients on UI elements
- NO box shadows (on anything)
- NO purple, blue, or any color besides the system above
- NO rounded corners > 12px (prefer 8px on cards)
- NO placeholder-as-only-label (labels must remain visible)
- NO card grids on mobile — single column list for Library
- NO emoji as design elements

## Navigation
- React Router with history stack
- Home: `/` — the hub
- Capture: `/add` — push screen, floating back arrow top-left
- Library: `/brain` — push screen, floating back arrow top-left
- Mind Map: `/map` — deferred, "Coming soon" toast on tap
- Back: small floating arrow `←` at 40px, rgba(255,255,255,0.3), no background

## Screens
### Home (/)
- Full-screen particle canvas always active
- Logo MINDSTACK (Syne Bold) top-left
- Center: single chat input, placeholder "What's on your mind?"
- Below input: 3 buttons [ADD] [VIEW BRAIN] [MIND MAP]
- Bottom: horizontal scroll of recent node cards (or onboarding prompt if empty)
- On submit: input animates to top, response streams inline below, particle stays

### Capture (/add)
- Source type pills — horizontal scroll
- Large text area for paste
- Title + author fields below
- Camera icon (top right of textarea) + mic icon — both open native camera/mic
- SAVE TO BRAIN — amber, full-width bottom button
- On save: button shows spinner → success state → amber insight card fades in

### Library (/brain)
- Search bar top
- Filter pills: All | Book | YouTube | Podcast | Voice | Tweet | LinkedIn | Reddit | Note
- Domain filter row: Business | Mindset | Fitness | Design | Engineering | Leadership...
- Single-column card list (2-col at 768px+)
- Each card: source icon + title + 2-line excerpt + insight (amber) + domain tags
- Tap = full node view (push screen)
- Long press = enter selection mode

## Interaction States
| Feature | Loading | Empty | Error | Success |
|---|---|---|---|---|
| Home query | Pulsing amber border on input | "Your brain is empty. Tap ADD." | Toast: "Couldn't reach brain" | Tokens stream inline |
| Capture save | SAVE button spinner | — | Toast: "Capture failed. Try again." | Insight card appears |
| Library fetch | 3 skeleton cards shimmer | "Brain is empty. Add your first capture." | Toast: "Couldn't load brain" | Cards populate |
| Image OCR | "Reading page..." overlay | — | Toast: "Couldn't read image." | Text appears in textarea |

## PWA
- manifest.json: name "MindStack", background_color "#080808", theme_color "#080808"
- Status bar: dark — iOS immersive mode
- Camera access: MediaDevices.getUserMedia({ video: true })
- Mic access: MediaDevices.getUserMedia({ audio: true })
- Offline queue: captures stored in IndexedDB, synced on reconnect
- Offline indicator: small amber dot top-right when offline
