# FleetGuard Mobile Troubleshooting Guide

## Expo Go Bundling Errors

### Metro Config Module Resolution Error

**Symptom:** When trying to load the app through Expo Go, you see an error like:
```
Error: Cannot find module './index.flow'
Require stack:
- .../node_modules/metro-config/src/index.js
```

**Cause:** The metro-config package (v0.83.2) has a bug where `index.js` tries to require `'./index.flow'` but the actual file is named `'index.flow.js'`.

**Solution:** This issue is automatically fixed by a postinstall script. If you encounter this error:

1. **Clean install dependencies:**
   ```bash
   cd mobile
   rm -rf node_modules package-lock.json
   npm install
   ```

2. **Clear Metro bundler cache:**
   ```bash
   npx expo start --clear
   ```

3. **Verify the fix was applied:**
   - Check that `mobile/node_modules/metro-config/src/index.flow` exists
   - It should contain: `module.exports = require("./index.flow.js");`

### React Version Compatibility

**Current versions:**
- Expo SDK: ~54.0.25
- React: 19.1.0
- React Native: 0.81.5

These versions are compatible. If you see warnings about React version, run:
```bash
npx expo install --check
```

### General Bundling Issues

If you encounter other bundling errors:

1. **Clear all caches:**
   ```bash
   cd mobile
   npm cache clean --force
   rm -rf node_modules package-lock.json
   npx expo start --clear
   ```

2. **Verify Node version:**
   - Check `.nvmrc` for the required Node version
   - Run: `node --version` to verify

3. **Check for asset issues:**
   - Ensure all required assets exist in `mobile/assets/`
   - Run: `npx expo-doctor` to check for issues

## Getting Help

If issues persist:
1. Check the GitHub issues for similar problems
2. Run `npx expo-doctor --verbose` for detailed diagnostics
3. Provide the full error message when reporting issues
