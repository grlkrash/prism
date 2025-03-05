# Mock API Responses

This document outlines the mock API responses used in the MBD AI integration while console.mbd.xyz is unavailable.

## Feed For You Endpoint

```typescript
// POST /casts/feed/for-you
{
  "data": {
    "casts": [
      {
        "hash": "0x123...",
        "threadHash": "0x456...",
        "parentHash": "0x789...",
        "author": {
          "fid": 123,
          "username": "artist1",
          "displayName": "Digital Artist",
          "pfp": "https://picsum.photos/200",
          "bio": "Digital artist specializing in AI-generated art"
        },
        "text": "Check out my latest digital art piece!",
        "timestamp": "2024-03-20T12:00:00Z",
        "reactions": {
          "likes": 150,
          "recasts": 50
        },
        "replies": {
          "count": 25
        },
        "viewerContext": {
          "liked": false,
          "recasted": false
        },
        "labels": ["art", "digital", "culture", "creative"],
        "aiAnalysis": {
          "category": "Digital Art",
          "sentiment": 0.8,
          "popularity": 150,
          "aiScore": 0.9,
          "culturalContext": "Contemporary digital art movement",
          "artStyle": "Abstract Digital",
          "isArtwork": true,
          "hasCulturalElements": true
        }
      }
    ],
    "next": {
      "cursor": "cursor_123"
    }
  }
}
```

## Search Semantic Endpoint

```typescript
// POST /casts/search/semantic
{
  "data": {
    "casts": [
      {
        "hash": "0x123...",
        "text": "Digital art piece",
        "author": {
          "fid": 123,
          "username": "artist1"
        },
        "timestamp": "2024-03-20T12:00:00Z",
        "reactions": {
          "likes": 150,
          "recasts": 50
        },
        "aiAnalysis": {
          "category": "Digital Art",
          "sentiment": 0.8,
          "popularity": 150,
          "aiScore": 0.9,
          "culturalContext": "Contemporary digital art movement",
          "artStyle": "Abstract Digital",
          "isArtwork": true,
          "hasCulturalElements": true
        }
      }
    ],
    "next": {
      "cursor": "cursor_123"
    }
  }
}
```

## Labels For Items Endpoint

```typescript
// POST /casts/labels/for-items
{
  "data": {
    "labels": [
      {
        "hash": "0x123...",
        "labels": ["art", "digital", "culture", "creative"]
      }
    ]
  }
}
```

## Users Similar Endpoint

```typescript
// POST /users/feed/similar
{
  "data": {
    "users": [
      {
        "fid": 123,
        "username": "artist1",
        "displayName": "Digital Artist",
        "pfp": "https://picsum.photos/200",
        "bio": "Digital artist specializing in AI-generated art",
        "aiAnalysis": {
          "category": "Digital Artist",
          "sentiment": 0.8,
          "popularity": 150,
          "aiScore": 0.9,
          "culturalContext": "Contemporary digital art movement"
        }
      }
    ],
    "next": {
      "cursor": "cursor_123"
    }
  }
}
```

## Error Responses

```typescript
// Rate Limit Error
{
  "error": {
    "code": "RATE_LIMIT_EXCEEDED",
    "message": "Rate limit exceeded. Please try again later."
  }
}

// API Error
{
  "error": {
    "code": "API_ERROR",
    "message": "Failed to communicate with MBD AI API"
  }
}

// Invalid Response
{
  "error": {
    "code": "INVALID_RESPONSE",
    "message": "Invalid response from MBD AI API"
  }
}
```

## Rate Limiting

- Max requests: 100 per minute
- Window: 60 seconds
- Headers:
  - `X-RateLimit-Limit`: 100
  - `X-RateLimit-Remaining`: remaining requests
  - `X-RateLimit-Reset`: timestamp when limit resets

## Authentication

- Bearer token authentication
- Header: `Authorization: Bearer ${MBD_API_KEY}`
- API key format: `mbd_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx` 