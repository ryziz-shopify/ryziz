# Storage Rules

Create `storage.rules` in your project root to define security rules for Cloud Storage.

## Example

```
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /uploads/{userId}/{allPaths=**} {
      allow read: if request.auth != null;
      allow write: if request.auth != null &&
                      request.auth.uid == userId;
    }
  }
}
```

The framework automatically detects and deploys this file.
