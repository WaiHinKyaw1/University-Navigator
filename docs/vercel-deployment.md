# Vercel Deployment Notes

The frontend is deployed to Vercel from the project `university-navigator-frontend` (team `WaiHinKyaw`). Only that project should be connected to this repository; other legacy Vercel projects (e.g., the former `university-navigator` project) have been removed to avoid failing deployment checks.

Deploy workflow: push to `development` for preview, merge to `main` for production. Never deploy from unrelated branches.
