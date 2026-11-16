# Changelog

Mudanças do app, da mais nova para a mais antiga. Cada item é um pull request mesclado na `main`.

## 2026-11-16 — repositório próprio

- Configurações: campos de senha pedem no mínimo 8 caracteres (igual ao servidor) (#10)
- Segurança: senha mínima de 8 caracteres (antes 6), igual aos outros apps (#9)
- Testes: tradução de estado do Home Assistant (#8)
- Home Assistant: mapas de modo/ventilação e stateToPatch em ha-map.js (testáveis) (#7)
- CI: roda os testes do backend (#6)
- Testes: datas no fuso do app (#5)
- Backend: funções de data em dates.js (testáveis sem o banco) (#4)
- CI: lint do backend no GitHub Actions (#3)
- Lint: eslint.config.js com no-undef no backend (pega import esquecido) (#2)
- SECURITY.md: como avisar sobre uma falha de forma privada (#1)
- Primeira versão no GitHub. Antes do envio, a senha padrão do admin foi tirada do código e do `.env.example` (o repositório é público).
