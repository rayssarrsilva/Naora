# Security policy · Política de segurança

**English** · [Português](#português)

## Reporting a vulnerability

Please **do not open a public issue**. Email **rayssarrsilva1@gmail.com** with the steps to reproduce and the impact. I aim to answer within 3 business days. The same contact is in [`/.well-known/security.txt`](./public/.well-known/security.txt).

## What is in place

- Content Security Policy with a new nonce on every request (`'strict-dynamic'`, no `unsafe-inline` or `unsafe-eval` in production).
- HSTS, `X-Frame-Options: DENY`, `frame-ancestors 'none'`, `nosniff`, a strict `Referrer-Policy` and `Permissions-Policy`.
- API responses carry their own policy (`default-src 'none'`).
- The locale cookie is `HttpOnly` and `SameSite=Lax`.
- The Docker image runs as a non-root user.
- CodeQL (`security-extended`) and Dependabot on every pull request.

---

## Português

Por favor, **não abra uma issue pública**. Mande um e-mail para **rayssarrsilva1@gmail.com** com os passos para reproduzir e o impacto. Procuro responder em até 3 dias úteis.
