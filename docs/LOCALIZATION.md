# CocoPay Localization

> Portuguese (Brazil) primary, English secondary

---

## Supported Languages

| Language | Code | Status | Coverage |
|----------|------|--------|----------|
| Portuguese (Brazil) | `pt-BR` | Primary | 100% |
| English | `en` | Secondary | 100% |

---

## Implementation

### Mobile (React Native)

Using `react-i18next`:

```typescript
// src/i18n/index.ts
import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import * as Localization from 'expo-localization'

import ptBR from './locales/pt-BR.json'
import en from './locales/en.json'

i18n
  .use(initReactI18next)
  .init({
    resources: {
      'pt-BR': { translation: ptBR },
      'en': { translation: en },
    },
    lng: Localization.locale.startsWith('pt') ? 'pt-BR' : 'en',
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false,
    },
  })

export default i18n
```

### Backend (Rails)

Using Rails I18n:

```ruby
# config/application.rb
config.i18n.default_locale = :'pt-BR'
config.i18n.available_locales = [:'pt-BR', :en]
config.i18n.fallbacks = true
```

```yaml
# config/locales/pt-BR.yml
pt-BR:
  errors:
    insufficient_balance: "Saldo insuficiente para este pagamento"
    payment_failed: "Não foi possível completar o pagamento"
    # ...
```

---

## Translation Keys

### Common

```json
{
  "common": {
    "loading": {
      "pt-BR": "Carregando...",
      "en": "Loading..."
    },
    "error": {
      "pt-BR": "Erro",
      "en": "Error"
    },
    "success": {
      "pt-BR": "Sucesso",
      "en": "Success"
    },
    "cancel": {
      "pt-BR": "Cancelar",
      "en": "Cancel"
    },
    "confirm": {
      "pt-BR": "Confirmar",
      "en": "Confirm"
    },
    "done": {
      "pt-BR": "Concluído",
      "en": "Done"
    },
    "retry": {
      "pt-BR": "Tentar novamente",
      "en": "Try again"
    },
    "back": {
      "pt-BR": "Voltar",
      "en": "Back"
    }
  }
}
```

### Onboarding

```json
{
  "onboarding": {
    "welcome": {
      "title": {
        "pt-BR": "Bem-vindo ao CocoPay",
        "en": "Welcome to CocoPay"
      },
      "subtitle": {
        "pt-BR": "Pague, receba e ganhe recompensas em Floripa",
        "en": "Pay, receive, and earn rewards in Floripa"
      },
      "cta": {
        "pt-BR": "Começar",
        "en": "Get Started"
      }
    },
    "email": {
      "title": {
        "pt-BR": "Qual é o seu email?",
        "en": "What's your email?"
      },
      "placeholder": {
        "pt-BR": "seu@email.com",
        "en": "you@email.com"
      },
      "cta": {
        "pt-BR": "Enviar link",
        "en": "Send link"
      }
    },
    "magic_link": {
      "title": {
        "pt-BR": "Verifique seu email",
        "en": "Check your email"
      },
      "subtitle": {
        "pt-BR": "Enviamos um link para {{email}}",
        "en": "We sent a link to {{email}}"
      },
      "resend": {
        "pt-BR": "Reenviar link",
        "en": "Resend link"
      },
      "resend_countdown": {
        "pt-BR": "Reenviar em {{seconds}}s",
        "en": "Resend in {{seconds}}s"
      }
    }
  }
}
```

### Balance

```json
{
  "balance": {
    "title": {
      "pt-BR": "Seu Saldo",
      "en": "Your Balance"
    },
    "expand": {
      "pt-BR": "Toque para ver detalhes",
      "en": "Tap to see breakdown"
    },
    "dollars": {
      "pt-BR": "Dólares",
      "en": "Dollars"
    },
    "rewards": {
      "pt-BR": "recompensas",
      "en": "rewards"
    },
    "available_bonus": {
      "pt-BR": "Bônus Disponível",
      "en": "Available Bonus"
    },
    "claim_bonus": {
      "pt-BR": "Resgatar Bônus",
      "en": "Claim Bonus"
    },
    "per_chain": {
      "pt-BR": "Por rede",
      "en": "By chain"
    },
    "consolidate": {
      "pt-BR": "Consolidar",
      "en": "Consolidate"
    }
  }
}
```

### Payments

```json
{
  "payment": {
    "pay": {
      "pt-BR": "Pagar",
      "en": "Pay"
    },
    "receive": {
      "pt-BR": "Receber",
      "en": "Receive"
    },
    "scan_qr": {
      "pt-BR": "Escanear QR Code",
      "en": "Scan QR Code"
    },
    "enter_amount": {
      "pt-BR": "Digite o valor",
      "en": "Enter amount"
    },
    "preview": {
      "title": {
        "pt-BR": "Pagando {{store}}",
        "en": "Paying {{store}}"
      },
      "using": {
        "pt-BR": "Usando:",
        "en": "Using:"
      },
      "youll_earn": {
        "pt-BR": "Você vai ganhar:",
        "en": "You'll earn:"
      },
      "confirm": {
        "pt-BR": "Confirmar Pagamento",
        "en": "Confirm Payment"
      }
    },
    "success": {
      "title": {
        "pt-BR": "Pago!",
        "en": "Paid!"
      },
      "to": {
        "pt-BR": "para {{store}}",
        "en": "to {{store}}"
      },
      "earned": {
        "pt-BR": "Você ganhou {{amount}} em recompensas de {{store}}",
        "en": "You earned {{amount}} in {{store}} rewards"
      },
      "confirmation_code": {
        "pt-BR": "Código de confirmação",
        "en": "Confirmation code"
      }
    },
    "failed": {
      "title": {
        "pt-BR": "Pagamento não completado",
        "en": "Payment couldn't complete"
      },
      "try_again": {
        "pt-BR": "Tentar novamente",
        "en": "Try again"
      }
    }
  }
}
```

### Merchant

```json
{
  "merchant": {
    "my_store": {
      "pt-BR": "Minha Loja",
      "en": "My Store"
    },
    "today_sales": {
      "pt-BR": "Vendas de Hoje",
      "en": "Today's Sales"
    },
    "show_qr": {
      "pt-BR": "Mostrar QR Code",
      "en": "Show QR Code"
    },
    "recent_payments": {
      "pt-BR": "Pagamentos Recentes",
      "en": "Recent Payments"
    },
    "analytics": {
      "pt-BR": "Análises",
      "en": "Analytics"
    },
    "team": {
      "pt-BR": "Equipe",
      "en": "Team"
    },
    "payouts": {
      "pt-BR": "Saques",
      "en": "Payouts"
    },
    "settings": {
      "pt-BR": "Configurações da Loja",
      "en": "Store Settings"
    },
    "create_store": {
      "title": {
        "pt-BR": "Criar Loja",
        "en": "Create Store"
      },
      "subtitle": {
        "pt-BR": "Aceite pagamentos de qualquer pessoa",
        "en": "Accept payments from anyone"
      }
    },
    "roles": {
      "owner": {
        "pt-BR": "Proprietário",
        "en": "Owner"
      },
      "admin": {
        "pt-BR": "Administrador",
        "en": "Admin"
      },
      "staff": {
        "pt-BR": "Funcionário",
        "en": "Staff"
      }
    },
    "payment_received": {
      "pt-BR": "Pagamento Recebido",
      "en": "Payment Received"
    },
    "from": {
      "pt-BR": "de {{name}}",
      "en": "from {{name}}"
    }
  }
}
```

### Errors

```json
{
  "errors": {
    "insufficient_balance": {
      "pt-BR": "Saldo insuficiente para este pagamento",
      "en": "Not enough balance for this payment"
    },
    "payment_failed": {
      "pt-BR": "Não foi possível completar o pagamento. Tente novamente.",
      "en": "Payment failed. Please try again."
    },
    "network_error": {
      "pt-BR": "Erro de conexão. Verifique sua internet.",
      "en": "Connection error. Check your internet."
    },
    "invalid_magic_link": {
      "pt-BR": "Link inválido ou expirado. Tente novamente.",
      "en": "Invalid or expired link. Please try again."
    },
    "session_expired": {
      "pt-BR": "Sua sessão expirou. Faça login novamente.",
      "en": "Your session expired. Please log in again."
    },
    "store_not_found": {
      "pt-BR": "Loja não encontrada",
      "en": "Store not found"
    },
    "generic": {
      "pt-BR": "Algo deu errado. Tente novamente.",
      "en": "Something went wrong. Please try again."
    }
  }
}
```

### Navigation

```json
{
  "nav": {
    "home": {
      "pt-BR": "Início",
      "en": "Home"
    },
    "activity": {
      "pt-BR": "Atividade",
      "en": "Activity"
    },
    "explore": {
      "pt-BR": "Explorar",
      "en": "Explore"
    },
    "more": {
      "pt-BR": "Mais",
      "en": "More"
    }
  }
}
```

### Settings

```json
{
  "settings": {
    "title": {
      "pt-BR": "Configurações",
      "en": "Settings"
    },
    "profile": {
      "pt-BR": "Perfil",
      "en": "Profile"
    },
    "security": {
      "pt-BR": "Segurança",
      "en": "Security"
    },
    "passkeys": {
      "pt-BR": "Chaves de Acesso",
      "en": "Passkeys"
    },
    "backup_owner": {
      "pt-BR": "Contato de Recuperação",
      "en": "Backup Contact"
    },
    "help": {
      "pt-BR": "Ajuda e Suporte",
      "en": "Help & Support"
    },
    "logout": {
      "pt-BR": "Sair",
      "en": "Log Out"
    },
    "advanced": {
      "pt-BR": "Avançado",
      "en": "Advanced"
    }
  }
}
```

### Bonus/Cash Out

```json
{
  "bonus": {
    "available": {
      "pt-BR": "Bônus Disponível",
      "en": "Available Bonus"
    },
    "claim": {
      "pt-BR": "Resgatar",
      "en": "Claim"
    },
    "claim_as_cash": {
      "pt-BR": "Resgatar como dinheiro",
      "en": "Claim as cash"
    },
    "claim_as_rewards": {
      "pt-BR": "Resgatar como recompensas",
      "en": "Claim as rewards"
    },
    "youll_receive": {
      "pt-BR": "Você receberá",
      "en": "You'll receive"
    },
    "fee": {
      "pt-BR": "Taxa",
      "en": "Fee"
    },
    "total": {
      "pt-BR": "Total",
      "en": "Total"
    },
    "send_to": {
      "pt-BR": "Enviar para",
      "en": "Send to"
    },
    "pix": {
      "pt-BR": "PIX",
      "en": "PIX"
    },
    "confirm_claim": {
      "pt-BR": "Confirmar Resgate",
      "en": "Confirm Claim"
    }
  }
}
```

---

## Currency & Number Formatting

```typescript
// src/utils/format.ts

export function formatCurrency(
  amount: number,
  locale: string = 'pt-BR',
  currency: string = 'USD'
): string {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount)
}

// Examples:
// formatCurrency(127.50, 'pt-BR') → "US$ 127,50"
// formatCurrency(127.50, 'en')    → "$127.50"
```

---

## Date & Time Formatting

```typescript
export function formatDate(
  date: Date,
  locale: string = 'pt-BR',
  options?: Intl.DateTimeFormatOptions
): string {
  const defaultOptions: Intl.DateTimeFormatOptions = {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }
  return new Intl.DateTimeFormat(locale, options || defaultOptions).format(date)
}

export function formatTime(
  date: Date,
  locale: string = 'pt-BR'
): string {
  return new Intl.DateTimeFormat(locale, {
    hour: '2-digit',
    minute: '2-digit',
  }).format(date)
}

export function formatRelativeTime(
  date: Date,
  locale: string = 'pt-BR'
): string {
  const rtf = new Intl.RelativeTimeFormat(locale, { numeric: 'auto' })
  const diff = (date.getTime() - Date.now()) / 1000

  if (Math.abs(diff) < 60) return locale === 'pt-BR' ? 'agora' : 'just now'
  if (Math.abs(diff) < 3600) return rtf.format(Math.round(diff / 60), 'minute')
  if (Math.abs(diff) < 86400) return rtf.format(Math.round(diff / 3600), 'hour')
  return rtf.format(Math.round(diff / 86400), 'day')
}

// Examples:
// formatDate(new Date(), 'pt-BR') → "16 de fev. de 2026"
// formatDate(new Date(), 'en')    → "Feb 16, 2026"
// formatRelativeTime(justNow, 'pt-BR') → "agora"
// formatRelativeTime(fiveMinAgo, 'pt-BR') → "há 5 minutos"
```

---

## App Store Listings

### Portuguese (Brazil)

**Nome:** CocoPay

**Subtítulo:** Pague e ganhe em Floripa

**Descrição:**
```
CocoPay é o aplicativo de pagamentos da comunidade de Florianópolis.

✓ Pague em lojas locais sem taxas
✓ Ganhe recompensas em cada compra
✓ Acumule bônus que cresce com o tempo
✓ Receba pagamentos se você é comerciante

Como funciona:
1. Cadastre-se com seu email
2. Escaneie o QR code da loja
3. Pague e ganhe recompensas automaticamente

Sem taxas escondidas. Sem complicação. Apenas pagamentos simples e recompensas para a comunidade.

Desenvolvido para Florianópolis, com amor.
```

**Palavras-chave:** pagamento, recompensas, florianópolis, floripa, loja, comércio, pix

### English

**Name:** CocoPay

**Subtitle:** Pay and earn in Floripa

**Description:**
```
CocoPay is the community payments app for Florianópolis.

✓ Pay at local stores with zero fees
✓ Earn rewards on every purchase
✓ Accumulate bonus that grows over time
✓ Receive payments if you're a merchant

How it works:
1. Sign up with your email
2. Scan the store's QR code
3. Pay and earn rewards automatically

No hidden fees. No complications. Just simple payments and rewards for the community.

Built for Florianópolis, with love.
```

**Keywords:** payment, rewards, florianópolis, floripa, store, commerce, local

---

## Translation Workflow

### Adding New Strings

1. Add key to `en.json` first (source of truth)
2. Add translation to `pt-BR.json`
3. Run validation: `npm run i18n:check`
4. Test in both locales

### Validation Script

```bash
# scripts/i18n-check.js
const en = require('../src/i18n/locales/en.json')
const ptBR = require('../src/i18n/locales/pt-BR.json')

function getKeys(obj, prefix = '') {
  return Object.keys(obj).reduce((keys, key) => {
    const fullKey = prefix ? `${prefix}.${key}` : key
    if (typeof obj[key] === 'object') {
      return [...keys, ...getKeys(obj[key], fullKey)]
    }
    return [...keys, fullKey]
  }, [])
}

const enKeys = getKeys(en)
const ptKeys = getKeys(ptBR)

const missingInPt = enKeys.filter(k => !ptKeys.includes(k))
const missingInEn = ptKeys.filter(k => !enKeys.includes(k))

if (missingInPt.length > 0) {
  console.error('Missing in pt-BR:', missingInPt)
  process.exit(1)
}

if (missingInEn.length > 0) {
  console.warn('Extra keys in pt-BR (not in en):', missingInEn)
}

console.log('✓ All translations present')
```
