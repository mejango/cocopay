# CocoPay Hardware Terminal

> Payment terminal blueprint for local commerce

---

## Overview

The CocoPay Terminal is a dedicated payment device for merchants who want a persistent, always-on payment station. It runs the same app as mobile, locked into Staff Mode.

### Why Hardware?

| Mobile App | Hardware Terminal |
|------------|-------------------|
| Personal device, shared use | Dedicated payment station |
| Battery dependent | Always plugged in |
| Distractions (notifications) | Single-purpose |
| Staff uses own phone | Shared device for all staff |
| Risk of personal/work mixing | Clean separation |

### Target Merchant

- High-volume locations (cafes, restaurants, markets)
- Multiple staff members on shift
- Counter or table-service setups
- Merchants who don't want staff using personal phones

---

## Hardware Specifications

### Form Factor

```
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│                    COCOPAY TERMINAL                         │
│                                                             │
│    ┌───────────────────────────────────────────────────┐   │
│    │                                                   │   │
│    │                                                   │   │
│    │                                                   │   │
│    │              7" TOUCHSCREEN                       │   │
│    │              (1280 x 800)                         │   │
│    │                                                   │   │
│    │                                                   │   │
│    │                                                   │   │
│    │                                                   │   │
│    └───────────────────────────────────────────────────┘   │
│                                                             │
│         [ NFC ]              ◯ LED            [ SPEAKER ]   │
│                                                             │
└─────────────────────────────────────────────────────────────┘
                              │
                              │ (adjustable stand)
                         ┌────┴────┐
                         │  BASE   │
                         │ USB-C   │
                         │ POWER   │
                         └─────────┘
```

### Components

| Component | Specification | Purpose |
|-----------|--------------|---------|
| **Display** | 7" IPS LCD, 1280x800, 400 nits | Show QR, payment status |
| **Touch** | Capacitive multi-touch | Staff interaction |
| **Processor** | Quad-core ARM (RK3566 or similar) | Run Android + app |
| **RAM** | 2GB | Smooth operation |
| **Storage** | 16GB eMMC | App + offline cache |
| **WiFi** | 2.4GHz + 5GHz | Primary connectivity |
| **Cellular** | Optional 4G LTE module | Backup connectivity |
| **NFC** | ISO 14443 A/B | Future: tap-to-pay |
| **Speaker** | 2W mono | Payment confirmation audio |
| **Microphone** | Dual MEMS, noise-canceling | Voice ordering |
| **LED** | RGB status light | Visual payment feedback |
| **Power** | 12V DC, 2A | Always-on operation |
| **Battery** | 3000mAh backup | Survive power outages |

### Physical Design

- **Dimensions**: 180mm x 120mm x 15mm (screen only)
- **Weight**: ~400g with stand
- **Stand**: Adjustable tilt (15° - 75°), counter or wall mount
- **Materials**: ABS plastic shell, tempered glass screen
- **Colors**: White (primary), Black (optional)
- **Branding**: CocoPay logo on bezel, customizable boot screen

### Environmental

- **Operating temp**: 0°C to 40°C
- **Humidity**: 10% - 90% non-condensing
- **IP rating**: IP54 (splash resistant)
- **Drop**: Survives 1m drop onto concrete

---

## Software Architecture

### Operating System

Android 12 (AOSP) with:
- Kiosk mode (single-app lockdown)
- OTA updates via CocoPay servers
- Remote device management (MDM)
- No Play Store, no other apps

### App Configuration

The terminal runs the standard CocoPay app with special flags:

```typescript
interface TerminalConfig {
  mode: 'terminal'              // Locks into staff mode
  storeId: string               // Bound to specific store
  deviceId: string              // Unique device identifier
  allowPersonalAccount: false   // No account switching
  showBalance: false            // Staff can't see store balance
  audioEnabled: true            // Payment confirmation sounds
  screenTimeout: 'never'        // Always on
  brightnessSchedule: {         // Auto-dim at night
    day: 100,
    night: 30,
    nightStart: '22:00',
    nightEnd: '06:00'
  }
}
```

### Provisioning Flow

1. **Factory state**: Terminal shows setup QR code
2. **Owner scans QR** with their phone app
3. **Binds to store**: Terminal registered to store
4. **Downloads config**: Store name, branding, settings
5. **Ready**: Shows payment QR

```
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│                    SET UP TERMINAL                          │
│                                                             │
│         Scan this code with your CocoPay app                │
│         to connect this terminal to your store              │
│                                                             │
│              ┌───────────────────────┐                     │
│              │ ▓▓░░▓▓░░▓▓░░▓▓░░▓▓   │                     │
│              │ ░░▓▓░░▓▓░░▓▓░░▓▓░░   │                     │
│              │ ▓▓░░▓▓  QR  ░░▓▓░░   │                     │
│              │ ░░▓▓░░▓▓░░▓▓░░▓▓░░   │                     │
│              │ ▓▓░░▓▓░░▓▓░░▓▓░░▓▓   │                     │
│              └───────────────────────┘                     │
│                                                             │
│                  Device ID: COCO-A7B3C9                     │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## Terminal Interface

### Default State (Ready for Payment)

```
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│                                                             │
│                    ☕ Café da Praia                         │
│                                                             │
│                                                             │
│              ┌───────────────────────┐                     │
│              │ ▓▓░░▓▓░░▓▓░░▓▓░░▓▓   │                     │
│              │ ░░▓▓░░▓▓░░▓▓░░▓▓░░   │                     │
│              │ ▓▓░░▓▓░░▓▓░░▓▓░░▓▓   │                     │
│              │ ░░▓▓░░▓▓  QR  ▓▓░░   │                     │
│              │ ▓▓░░▓▓░░▓▓░░▓▓░░▓▓   │                     │
│              │ ░░▓▓░░▓▓░░▓▓░░▓▓░░   │                     │
│              │ ▓▓░░▓▓░░▓▓░░▓▓░░▓▓   │                     │
│              └───────────────────────┘                     │
│                                                             │
│                     Scan to pay                             │
│                                                             │
│  ───────────────────────────────────────────────────────   │
│                                                             │
│     Today: $342.50              Last: João $45.00 (2m)     │
│                                                             │
└─────────────────────────────────────────────────────────────┘

LED: Solid green (ready)
```

### Payment Received

```
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│                                                             │
│                                                             │
│                          ✓                                  │
│                                                             │
│                                                             │
│                      $45.00                                 │
│                                                             │
│                   from João S.                              │
│                                                             │
│                                                             │
│                                                             │
│                                                             │
│                                                             │
│  ───────────────────────────────────────────────────────   │
│                                                             │
│     Today: $387.50                                         │
│                                                             │
└─────────────────────────────────────────────────────────────┘

LED: Flash green 3x
Audio: Confirmation chime (2 tones, ascending)
Duration: 4 seconds, then return to ready state
```

### Payment Processing

```
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│                                                             │
│                                                             │
│                                                             │
│                        ◠ ◠ ◠                               │
│                                                             │
│                    Processing...                            │
│                                                             │
│                                                             │
│                                                             │
│                                                             │
│                                                             │
│                                                             │
│  ───────────────────────────────────────────────────────   │
│                                                             │
│     Today: $342.50                                         │
│                                                             │
└─────────────────────────────────────────────────────────────┘

LED: Pulsing blue
Audio: None
```

### Offline Mode

```
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│  ⚠️ OFFLINE - Reconnecting...                               │
│                                                             │
│                    ☕ Café da Praia                         │
│                                                             │
│              ┌───────────────────────┐                     │
│              │                       │                     │
│              │    QR code may be     │                     │
│              │    outdated. Check    │                     │
│              │    WiFi connection.   │                     │
│              │                       │                     │
│              └───────────────────────┘                     │
│                                                             │
│     Last online: 5 minutes ago                              │
│                                                             │
│  ───────────────────────────────────────────────────────   │
│                                                             │
│     Today: $342.50 (may be incomplete)                     │
│                                                             │
└─────────────────────────────────────────────────────────────┘

LED: Solid amber
Audio: Single low tone on disconnect
```

### Staff Interaction (Tap Screen)

Tapping the screen reveals controls including voice ordering:

```
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │                                                     │   │
│  │              ☕ Café da Praia                       │   │
│  │                                                     │   │
│  │  ┌─────────────────────────────────────────────┐   │   │
│  │  │  🎤  "Two lattes and a croissant"           │   │   │
│  │  └─────────────────────────────────────────────┘   │   │
│  │                                                     │   │
│  │  Today's Payments                      $387.50     │   │
│  │  ──────────────────────────────────────────────    │   │
│  │  João S.        $45.00              2 min ago      │   │
│  │  Maria L.       $22.50             15 min ago      │   │
│  │  Anonymous      $18.00                  1h ago     │   │
│  │                                                     │   │
│  │  ┌─────────────────────────────────────────────┐   │   │
│  │  │           Show QR Code                      │   │   │
│  │  └─────────────────────────────────────────────┘   │   │
│  │                                                     │   │
│  │  ┌───────────────┐    ┌───────────────────────┐   │   │
│  │  │  Settings 🔒  │    │  Brightness  ☀️ ━━━●  │   │   │
│  │  └───────────────┘    └───────────────────────┘   │   │
│  │                                                     │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
└─────────────────────────────────────────────────────────────┘

Auto-hide after 30 seconds of no interaction
Settings requires PIN (set by owner in app)
```

### Voice Ordering on Terminal

Staff taps mic button and speaks the order:

```
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│                    🎤 Listening...                          │
│                                                             │
│         "Two cappuccinos and an açaí bowl"                  │
│                                                             │
│                        ◠ ◠ ◠                               │
│                                                             │
└─────────────────────────────────────────────────────────────┘

            ↓ (AI processes)

┌─────────────────────────────────────────────────────────────┐
│                                                             │
│                    Order Ready                              │
│                                                             │
│         2x Cappuccino              $8.00                    │
│         1x Açaí Bowl               $12.00                   │
│         ─────────────────────────────────                   │
│         Total                      $20.00                   │
│                                                             │
│              ┌───────────────────────┐                     │
│              │       [QR CODE]       │                     │
│              │        $20.00         │                     │
│              └───────────────────────┘                     │
│                                                             │
│                  Customer scans to pay                      │
│                                                             │
│     ┌───────────────────┐  ┌───────────────────┐          │
│     │    Edit Order     │  │      Cancel       │          │
│     └───────────────────┘  └───────────────────┘          │
│                                                             │
└─────────────────────────────────────────────────────────────┘

Audio: Soft chime when order is ready
Returns to default QR after payment or 60s timeout
```

---

## Integration with Mobile App

### Terminal Management (Owner's App)

Owners manage terminals from **More → My Store → Devices**:

```
┌─────────────────────────────────────────┐
│  ← Store Settings                       │
│                                         │
│             Devices                     │
│                                         │
│  ┌─────────────────────────────────┐   │
│  │  📱 Terminal - Counter          │   │
│  │     COCO-A7B3C9                 │   │
│  │     Online • Last payment 2m    │   │
│  └─────────────────────────────────┘   │
│                                         │
│  ┌─────────────────────────────────┐   │
│  │  📱 Terminal - Patio            │   │
│  │     COCO-B8C4D0                 │   │
│  │     Online • Last payment 15m   │   │
│  └─────────────────────────────────┘   │
│                                         │
│  ┌─────────────────────────────────┐   │
│  │  📱 Terminal - Kitchen          │   │
│  │     COCO-C9D5E1                 │   │
│  │     Offline • Since 10:30 AM    │   │
│  └─────────────────────────────────┘   │
│                                         │
│  ────────────────────────────────────   │
│                                         │
│  ┌─────────────────────────────────┐   │
│  │     + Add New Terminal          │   │
│  └─────────────────────────────────┘   │
│                                         │
└─────────────────────────────────────────┘
```

### Device Settings (Owner's App)

```
┌─────────────────────────────────────────┐
│  ← Devices                              │
│                                         │
│       Terminal - Counter                │
│          COCO-A7B3C9                    │
│                                         │
│  Status                    ● Online     │
│  Last payment              2 min ago    │
│  Today's payments          $387.50      │
│  Firmware                  v2.1.3       │
│                                         │
│  ────────────────────────────────────   │
│                                         │
│  Device name                            │
│  ┌─────────────────────────────────┐   │
│  │  Counter                        │   │
│  └─────────────────────────────────┘   │
│                                         │
│  Settings PIN                           │
│  ┌─────────────────────────────────┐   │
│  │  ••••           Change          │   │
│  └─────────────────────────────────┘   │
│                                         │
│  Audio                                  │
│  ┌─────────────────────────────────┐   │
│  │  Payment sounds          ████   │   │
│  └─────────────────────────────────┘   │
│                                         │
│  ────────────────────────────────────   │
│                                         │
│  ┌─────────────────────────────────┐   │
│  │     Restart Device              │   │
│  └─────────────────────────────────┘   │
│                                         │
│  ┌─────────────────────────────────┐   │
│  │     Remove Device               │   │
│  └─────────────────────────────────┘   │
│                                         │
└─────────────────────────────────────────┘
```

### How Terminal Relates to Team Roles

| Feature | Terminal | Staff (Phone) | Admin | Owner |
|---------|----------|---------------|-------|-------|
| Show payment QR | ✓ | ✓ | ✓ | ✓ |
| See today's payments | ✓ | ✓ | ✓ | ✓ |
| See all payment history | ✗ | ✗ | ✓ | ✓ |
| See store balance | ✗ | ✗ | ✗ | ✓ |
| Manage payouts | ✗ | ✗ | ✗ | ✓ |
| Manage team | ✗ | ✗ | ✓ | ✓ |
| Manage devices | ✗ | ✗ | ✗ | ✓ |
| Switch to personal account | ✗ | ✓ | ✓ | ✓ |

Terminal is essentially a **shared Staff Mode device** without personal account access.

---

## Customer Experience

### Paying at a Terminal

1. **Approach terminal** - QR code already displayed
2. **Open CocoPay app** on phone (or any wallet)
3. **Scan QR** - phone camera
4. **Enter amount** (on phone, not terminal)
5. **Confirm payment** (on phone)
6. **Hear confirmation** - terminal chimes
7. **See confirmation** - terminal shows checkmark

The terminal is **passive** - customers interact with their own phones.

### With NFC (Future)

1. **Approach terminal**
2. **Tap phone** to terminal's NFC zone
3. **Authenticate** on phone (Face ID / fingerprint)
4. **Done** - instant payment

NFC flow skips QR scanning for faster checkout.

---

## Technical Integration

### API Endpoints

Terminal uses the same API as mobile app, with device authentication:

```
POST /device/register
  Body: { setupCode, storeId }
  Returns: { deviceId, deviceToken, config }

GET /device/config
  Headers: X-Device-Token
  Returns: { storeId, storeName, settings }

WS /device/events
  Headers: X-Device-Token
  Events: payment_received, config_updated, restart

POST /device/heartbeat
  Headers: X-Device-Token
  Body: { status, batteryLevel, lastPaymentAt }
```

### Real-Time Updates

Terminal maintains WebSocket connection for instant payment notifications:

```typescript
// Terminal receives
interface PaymentEvent {
  type: 'payment_received'
  amount: number
  customerName?: string
  timestamp: string
}

// On receive: show success animation, play sound
```

### Offline Handling

When offline:
1. Terminal shows warning banner
2. QR code remains (static store payment URL)
3. Payments still work (customer's phone handles the transaction)
4. Terminal won't show confirmation until reconnected
5. Syncs payment history when back online

```typescript
interface OfflineState {
  isOffline: boolean
  lastOnline: Date
  cachedPayments: Payment[]  // Shown in today's list
  pendingSync: number        // Payments made while offline
}
```

---

## Manufacturing Considerations

### Bill of Materials (Estimate)

| Component | Est. Cost |
|-----------|-----------|
| Display + touch panel | $35 |
| Main board (SoC, RAM, storage) | $25 |
| WiFi/BT module | $5 |
| NFC module | $8 |
| Speaker | $2 |
| LED | $1 |
| Battery | $8 |
| Enclosure + stand | $15 |
| Power adapter | $5 |
| Assembly + testing | $20 |
| **Total BOM** | **~$125** |

### Retail Pricing Strategy

- **Hardware cost**: ~$125
- **Suggested retail**: $199 - $249
- **Or**: Free with 12-month commitment (recovered via small tx fee)

### Production Partners

Consider ODM partners with Android tablet experience:
- Shenzhen manufacturers (lower cost, higher MOQ)
- Taiwan/Korea manufacturers (higher quality, lower MOQ)

### Certifications Required

- FCC (USA)
- ANATEL (Brazil)
- CE (Europe)
- RoHS compliance

---

## Rollout Strategy

### Phase 1: Pilot (Florianópolis)

1. **Produce 50-100 units** via ODM partner
2. **Deploy to top merchants** (free, as beta program)
3. **Gather feedback** on hardware + UX
4. **Iterate design** based on real-world use

### Phase 2: Local Launch

1. **Finalize design** based on pilot learnings
2. **Produce 500-1000 units**
3. **Sell/lease to merchants** in Florianópolis
4. **Support infrastructure** (repairs, replacements)

### Phase 3: Scale

1. **Expand to other cities**
2. **Higher volume production** (lower unit cost)
3. **Distribution partnerships** (POS resellers)

---

## Accessories

### Receipt Printer (Optional)

Bluetooth thermal printer integration:

```
┌─────────────────────────────────────────┐
│  ← Device Settings                      │
│                                         │
│           Printer                       │
│                                         │
│  ┌─────────────────────────────────┐   │
│  │  🖨️ COCO-PRINT-001             │   │
│  │     Connected                   │   │
│  └─────────────────────────────────┘   │
│                                         │
│  Print receipt                          │
│  ┌─────────────────────────────────┐   │
│  │  ○ Never                        │   │
│  │  ○ Ask customer                 │   │
│  │  ● Always                       │   │
│  └─────────────────────────────────┘   │
│                                         │
└─────────────────────────────────────────┘
```

Receipt format:
```
================================
       CAFÉ DA PRAIA
================================

Date: Feb 16, 2026  2:34 PM

Amount:           $45.00

Payment:          CocoPay
Confirmation:     A7B3C9

--------------------------------

You earned $2.25 in rewards!

Scan QR to download CocoPay:

    [QR CODE]

================================
     Thank you for visiting!
================================
```

### Customer Display (Future)

Second screen facing customer:
- Shows payment QR larger
- Confirms amount before payment
- Shows success/rewards after

---

## Security

### Device Security

- **Secure boot**: Verified boot chain
- **Encrypted storage**: Device token encrypted at rest
- **No user data**: Terminal doesn't store customer info
- **Remote wipe**: Owner can reset device remotely
- **PIN protection**: Settings locked behind PIN

### Physical Security

- **Kensington lock slot**: Theft prevention
- **Tamper detection**: Alerts if device opened
- **Unique device ID**: Can't clone/spoof devices

### Network Security

- **TLS 1.3**: All API communication encrypted
- **Certificate pinning**: Prevent MITM attacks
- **Token rotation**: Device tokens refresh periodically

---

## Support & Maintenance

### Firmware Updates

- OTA updates pushed from CocoPay servers
- Updates install during off-hours (configurable)
- Rollback capability if update fails

### Diagnostics

Owner can view device health in app:
- Connectivity status
- Battery health
- Storage usage
- Last error logs

### Warranty & Repair

- 1-year hardware warranty
- Advance replacement program (ship new, return old)
- Repair depot for out-of-warranty

---

## Future Enhancements

### V2 Hardware

- **Larger display**: 10" for higher visibility
- **Camera**: Scan customer QR (reverse flow)
- **Dual display**: Customer-facing screen
- **Better audio**: Stereo speakers for ambiance

### Software Features

- **Multi-currency**: Display prices in BRL alongside USD
- **Tipping**: Optional tip prompt after payment
- **Loyalty**: Show customer's reward balance
- **Split payments**: Multiple customers, one bill
