# All Over Janitorial Services Website

A full-stack business website developed for All Over Janitorial Services, Inc., featuring responsive design, secure customer forms, Google review integration, bot protection, and server-side email notifications.

## Features

- Responsive multi-page website
- Node.js / Express backend
- Google Places API integration
- Google Reviews with server-side caching
- Cloudflare Turnstile bot protection
- Contact, quote, and employment application forms
- Brevo SMTP email notifications
- Server-side input validation
- Global and endpoint-specific rate limiting
- Helmet security headers
- Custom 404 handling
- SEO metadata and sitemap
- Mobile-responsive navigation
- Visitor request logging

## Technology

- HTML5
- CSS3
- JavaScript
- Node.js
- Express
- Google Places API
- Cloudflare Turnstile
- Brevo SMTP

## Security

The application implements multiple security controls including:

- Environment-based secret management
- Server-side validation
- CAPTCHA verification
- Request rate limiting
- Security HTTP headers
- Restricted access to server files
- Request body size limits

Sensitive credentials are excluded from source control using `.gitignore`.

## Environment Variables

Copy `.env.example` to `.env` and configure the required credentials.

## Deployment

The application is currently designed as a Node.js/Express web application.

Production deployment architecture and infrastructure documentation will be added as the project is migrated to AWS.

## Author

Tristan McMillin