# Google Drive Backup System

Automated daily backup system for the `uploads/` folder to Google Drive.

## Setup

### 1. Google Cloud Service Account

You can use your existing Firebase service account, or create a new one:

**Option A: Use Firebase Service Account**
- Extract credentials from `FIREBASE_SERVICE_ACCOUNT_JSON` in your `.env`
- Enable Google Drive API in [Google Cloud Console](https://console.cloud.google.com/apis/library/drive.googleapis.com)

**Option B: Create New Service Account**
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create or select a project
3. Enable Google Drive API
4. Create a service account
5. Download JSON key file
6. Extract credentials to `.env`

### 2. Environment Variables

Add to your `.env` file:

```bash
# Google Drive Backup Configuration
GOOGLE_PROJECT_ID=your_project_id
GOOGLE_CLIENT_EMAIL=service_account_email@project.iam.gserviceaccount.com
GOOGLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----"

# Enable/disable automatic backups (default: true)
ENABLE_DRIVE_BACKUP=true
```

**Important:** The `GOOGLE_PRIVATE_KEY` must have literal `\n` characters that will be replaced with real newlines. If your private key is in a JSON file, copy it exactly as shown (with `\n`).

### 3. Verify Setup

Test the backup manually:

```bash
npm run backup
```

This will:
- Compress the `uploads/` folder
- Upload to Google Drive folder: `friendly_upload_backups`
- Keep only the latest 7 backups

## Usage

### Automatic Backups

Backups run automatically every day at **3 AM** via cron job in `server.js`.

To disable automatic backups, set in `.env`:
```bash
ENABLE_DRIVE_BACKUP=false
```

### Manual Backup

```bash
npm run backup
```

### Restore from Backup

```bash
npm run restore
```

This will:
- Find the latest backup in Google Drive
- Download it
- Extract and restore to `uploads/` folder
- Backup existing `uploads/` folder before restoring

## Backup Retention

- **Keeps latest 7 backups** automatically
- Older backups are deleted to save space
- Each backup is named: `uploads_YYYY-MM-DDTHH-MM-SS.zip`

## File Structure

```
backup/
  uploads_2024-01-15T03-00-00.zip  (local temp, deleted after upload)
  latest.zip                        (downloaded during restore, deleted after extraction)
```

## Troubleshooting

### "Missing Google Drive credentials"
- Check that all three env vars are set: `GOOGLE_PROJECT_ID`, `GOOGLE_CLIENT_EMAIL`, `GOOGLE_PRIVATE_KEY`
- Verify private key has `\n` characters (not actual newlines)

### "Permission denied" or "Insufficient permissions"
- Ensure Google Drive API is enabled in Google Cloud Console
- Verify service account has Drive API access
- Check that the service account email is correct

### "Backup folder not found"
- The script will create the folder automatically on first run
- If it fails, manually create a folder named `friendly_upload_backups` in Google Drive

### Cron job not running
- Check server logs for cron errors
- Verify `ENABLE_DRIVE_BACKUP` is not set to `false`
- Ensure server is running at 3 AM (cron only runs when server is active)

## Notes

- Backups are compressed with maximum compression (level 9)
- Local ZIP files are deleted after upload to save disk space
- Existing `uploads/` folder is backed up before restore
- The backup folder in Google Drive is created automatically if it doesn't exist

