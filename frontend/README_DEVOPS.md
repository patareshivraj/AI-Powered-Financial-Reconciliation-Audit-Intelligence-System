# DevOps Deployment Guide: Bank AI Frontend

This document outlines the requirements and procedures for deploying the Bank AI Frontend to a production environment.

## 1. Environment & Network Configuration

The application is configured to communicate with the live FastAPI backend via environment variables.

*   **Production Environment File:** `.env.production` has been created in the repository root.
*   **Target Backend URL:** `https://tdtlworld.com/bank-ai-backend/api/v1`

**Important API Routing Note:** 
Ensure that CORS configurations on the production FastAPI server (`tdtlworld.com`) allow requests from the domain where this frontend will be hosted.

## 2. CI/CD Installation & Build Instructions

Due to the integration of React 19 and Create React App (CRA) alongside modern styling utilities, you **must** use the legacy peer dependencies flag during the NPM installation phase. 

**Build Pipeline Steps:**
```bash
# 1. Install dependencies (STRICT REQUIREMENT)
npm install --legacy-peer-deps

# 2. Build for Production
npm run build
```

This will output an optimized, minified bundle to the `build/` directory.

## 3. Web Server / Hosting Configuration (Critical)

This application is a **React Single Page Application (SPA)** utilizing client-side routing. It is critical that your web server (Nginx, Apache, AWS CloudFront, etc.) is configured to route all unknown paths to the `index.html` file. 

If this step is skipped, users will receive a **404 Not Found** error if they attempt to refresh the page or navigate to a direct link (e.g., `/dashboard`).

**Example Nginx Configuration:**
```nginx
server {
    listen 80;
    server_name your-frontend-domain.com;
    root /path/to/your/build/directory;
    index index.html;

    location / {
        # Fallback to index.html for client-side routing
        try_files $uri $uri/ /index.html;
    }
}
```

## 4. Current State Considerations

*   **Auth Simulation:** The application currently ships with an `Enterprise Auth Simulation` overlay (`simulation-login.tsx`). This allows access for demo/presentation purposes using hardcoded mock credentials (`localpassword123`) and auto-generates users on the backend upon selection. If this deployment is for real-world end-users, this component must be swapped for standard SSO/Auth infrastructure.
*   **Tailwind CSS Pipeline:** The project utilizes Tailwind CSS v3 native integration with Create React App. No external CLI watchers are required in production; Webpack handles the CSS compilation natively during `npm run build`.
