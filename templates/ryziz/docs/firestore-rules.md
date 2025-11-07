# Firestore Rules

Create `firestore.rules` in your project root to define security rules for Firestore.

## Example

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /shops/{shop} {
      allow read, write: if request.auth != null;
    }

    match /orders/{order} {
      allow read: if request.auth != null;
      allow write: if request.auth != null &&
                      request.resource.data.shop == request.auth.token.shop;
    }
  }
}
```

The framework automatically detects and deploys this file.
