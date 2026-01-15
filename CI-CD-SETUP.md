# CI/CD Setup with GitHub Actions and Firebase Hosting

This project is configured for automatic deployment to Firebase Hosting using GitHub Actions.

## Setup Instructions

### 1. Firebase Token Setup

1. Install Firebase CLI:

   ```bash
   npm install -g firebase-tools
   ```

2. Login to Firebase:

   ```bash
   firebase login
   ```

3. Generate Firebase token:

   ```bash
   firebase login:ci
   ```

4. Add Firebase Token to GitHub Secrets:
   - Go to your GitHub repository
   - Navigate to `Settings` > `Secrets and variables` > `Actions`
   - Click `New repository secret`
   - Name: `FIREBASE_TOKEN`
   - Value: Paste the token from step 3

### 2. Workflow Configuration

The CI/CD pipeline is configured in `.github/workflows/deploy.yml` and will:

- **Trigger on**: Push to `main` branch and Pull Requests to `main`
- **Steps**:
  1. Checkout repository
  2. Setup Node.js 18
  3. Install dependencies with `npm ci`
  4. Run tests with `npm test`
  5. Build Angular app with `npm run build`
  6. Deploy to Firebase Hosting using the token

### 3. Deployment Process

- **Automatic**: Every push to `main` branch triggers deployment
- **Testing**: Tests run before deployment
- **Production**: Uses production build configuration
- **Rollback**: Firebase keeps previous deployments for rollback

### 4. Manual Deployment (Optional)

To deploy manually:

```bash
npm run build:prod
firebase deploy --only hosting
```

### 5. Environment Variables

The workflow uses the following secret:

- `FIREBASE_TOKEN`: Authentication token for Firebase deployment

### 6. Build Configuration

- **Development**: `npm run build` (uses default configuration)
- **Production**: `npm run build:prod` (uses production configuration)
- **Output Directory**: `dist/angular-firebase-crud/browser`

### 7. Firebase Hosting Configuration

The `firebase.json` is configured to:

- Serve files from `dist/angular-firebase-crud/browser`
- Handle SPA routing with rewrites to `index.html`
- Ignore `node_modules` and hidden files

## Troubleshooting

### Build Failures

- Check Angular build logs in GitHub Actions
- Ensure all dependencies are in `package.json`
- Verify TypeScript compilation

### Test Failures

- Tests run in headless Chrome
- Check test logs in GitHub Actions
- Run tests locally: `npm test`

### Deployment Failures

- Verify `FIREBASE_TOKEN` is correctly set in GitHub Secrets
- Check Firebase project configuration
- Ensure Firebase CLI permissions

### Common Issues

1. **Token Expired**: Regenerate Firebase token and update GitHub secret
2. **Build Timeout**: Increase build resources or optimize build process
3. **Permission Denied**: Check Firebase project access and token permissions

## Best Practices

1. **Branch Protection**: Enable branch protection for `main` branch
2. **Review Required**: Require PR reviews before merge
3. **Environment Separation**: Use different Firebase projects for staging/production
4. **Monitoring**: Set up Firebase monitoring and alerts
5. **Backup**: Regularly backup Firebase configuration and data

## Security Notes

- Firebase token is stored securely in GitHub Secrets
- Token has minimal required permissions
- Workflow runs in isolated GitHub Actions environment
- No sensitive data is logged in workflow outputs
