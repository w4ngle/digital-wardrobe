# Security and privacy

Please report vulnerabilities privately through GitHub Security Advisories. Do not open a public issue containing credentials, private photos or user identifiers.

## Deployment checklist

- Keep all `.env*` files except `.env.example` out of Git.
- Use server-only keys for Supabase administration and AI providers.
- Configure `TELEGRAM_ALLOWED_USER_ID` before exposing the Mini App.
- Set a strong `CRON_SECRET` for scheduled notification routes.
- Review Supabase RLS and Storage policies for your deployment model.
- Never seed a public environment with real wardrobe photos without consent.

The hosted demo is allow-listed because wardrobe and wear-history data are personal.
