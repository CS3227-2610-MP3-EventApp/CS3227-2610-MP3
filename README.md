# EventApp

EventApp is a role-based event platform for attendees, organisers and business
participants. It supports programme publishing, business applications, attendee
planning, disruption announcements and bounded AI assistance with human review.

## Try the project

- **Hosted application:** [eventapp-ws7v.onrender.com](https://eventapp-ws7v.onrender.com/)
- **Product website:** [EventApp on GitHub Pages](https://cs3227-2610-mp3-eventapp.github.io/CS3227-2610-MP3/)

The hosted URL is the deployed application entry point. Some AI capabilities
require the configured synthetic-data environment and provider access; use the
guides for the supported test flows and current limitations.

## Project documentation

- [User Guide](docs/UserGuide.md) — current features and manual user flows
- [Developer Guide](docs/DeveloperGuide.md) — local setup, architecture and checks
- [Security rules](docs/security.md) — AI, authorisation and data-handling boundaries
- [Reflections](docs/Reflections.md) — lessons from AI security, SDD and multi-agent development
- [Specifications](specs/README.md) — capability contracts and implementation status
- [Development logs](logs/README.md) — verified summaries of project interactions and evidence

## Local checks

The repository uses Docker PostgreSQL, `uv` for the FastAPI backend and npm for
the Vite frontend. Follow the [Developer Guide](docs/DeveloperGuide.md) for
environment setup and the guarded test-database commands. The main GitHub
Actions workflow runs the backend suite and frontend tests/build; the Pages
workflow publishes the static product website from `pages/`.
