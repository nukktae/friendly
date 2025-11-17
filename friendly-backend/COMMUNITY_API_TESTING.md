# Community API Testing Guide

## Overview
The Community API allows school-verified students to create posts, like, comment, and interact with the community. Only verified students can create posts and interact.

## Base URL
```
{{baseUrl}}/api/community
```

---

## Endpoints

### 1. Check School Verification

**GET** `/api/community/verify/:userId`

**Path Parameters:**
- `userId` (required): User ID

**Response:**
```json
{
  "success": true,
  "schoolVerified": true,
  "university": "Seoul National University"
}
```

**cURL:**
```bash
curl -X GET "http://localhost:4000/api/community/verify/o4gJhRwNMxY2G9YuAS0eiuZL6YX2"
```

---

### 2. Create Post

**POST** `/api/community/posts`

**Headers:**
```
Content-Type: application/json
```

**Body:**
```json
{
  "userId": "o4gJhRwNMxY2G9YuAS0eiuZL6YX2",
  "content": "Just aced my Algorithm midterm! The sorting algorithms practice really paid off.",
  "category": "Study Tips"
}
```

**Required Fields:**
- `userId` (string)
- `content` (string)

**Optional Fields:**
- `category` (string): Defaults to "General"

**Response:**
```json
{
  "success": true,
  "postId": "post_1763391790414_ahrf96oa3",
  "post": {
    "id": "post_1763391790414_ahrf96oa3",
    "author": {
      "userId": "o4gJhRwNMxY2G9YuAS0eiuZL6YX2",
      "name": "John Doe",
      "avatar": null,
      "university": "Seoul National University",
      "country": "South Korea"
    },
    "content": "Just aced my Algorithm midterm!",
    "category": "Study Tips",
    "likes": [],
    "comments": [],
    "likesCount": 0,
    "commentsCount": 0,
    "createdAt": {...},
    "updatedAt": {...}
  },
  "message": "Post created successfully"
}
```

**Error (Not Verified):**
```json
{
  "error": "School verification required",
  "message": "Only school-verified students can create posts and interact with the community"
}
```

**cURL:**
```bash
curl -X POST "http://localhost:4000/api/community/posts" \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "o4gJhRwNMxY2G9YuAS0eiuZL6YX2",
    "content": "Just aced my Algorithm midterm!",
    "category": "Study Tips"
  }'
```

---

### 3. Get All Posts

**GET** `/api/community/posts`

**Query Parameters:**
- `category` (optional): Filter by category (e.g., "Study Tips", "General")
- `university` (optional): Filter by university
- `userId` (optional): Filter by user ID
- `limit` (optional): Limit number of results

**Response:**
```json
{
  "success": true,
  "posts": [
    {
      "id": "post_1763391790414_ahrf96oa3",
      "author": {...},
      "content": "...",
      "category": "Study Tips",
      "likes": ["userId1", "userId2"],
      "comments": [...],
      "likesCount": 2,
      "commentsCount": 5,
      "createdAt": {...}
    }
  ],
  "count": 1
}
```

**cURL:**
```bash
curl -X GET "http://localhost:4000/api/community/posts?category=Study%20Tips&limit=10"
```

---

### 4. Get Post by ID

**GET** `/api/community/posts/:postId`

**Path Parameters:**
- `postId` (required): Post ID

**Response:**
```json
{
  "success": true,
  "post": {...}
}
```

**cURL:**
```bash
curl -X GET "http://localhost:4000/api/community/posts/post_1763391790414_ahrf96oa3"
```

---

### 5. Update Post

**PATCH** `/api/community/posts/:postId`

**Path Parameters:**
- `postId` (required): Post ID

**Body:**
```json
{
  "userId": "o4gJhRwNMxY2G9YuAS0eiuZL6YX2",
  "content": "Updated content",
  "category": "Success Stories"
}
```

**Required Fields:**
- `userId` (string)

**Optional Fields:**
- `content` (string)
- `category` (string)

**Response:**
```json
{
  "success": true,
  "postId": "post_1763391790414_ahrf96oa3",
  "post": {...},
  "message": "Post updated successfully"
}
```

**cURL:**
```bash
curl -X PATCH "http://localhost:4000/api/community/posts/post_1763391790414_ahrf96oa3" \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "o4gJhRwNMxY2G9YuAS0eiuZL6YX2",
    "content": "Updated content"
  }'
```

---

### 6. Delete Post

**DELETE** `/api/community/posts/:postId?userId={{userId}}`

**Path Parameters:**
- `postId` (required): Post ID

**Query Parameters:**
- `userId` (required): User ID

**Response:**
```json
{
  "success": true,
  "postId": "post_1763391790414_ahrf96oa3",
  "message": "Post deleted successfully"
}
```

**cURL:**
```bash
curl -X DELETE "http://localhost:4000/api/community/posts/post_1763391790414_ahrf96oa3?userId=o4gJhRwNMxY2G9YuAS0eiuZL6YX2"
```

---

### 7. Toggle Like

**POST** `/api/community/posts/:postId/like`

**Path Parameters:**
- `postId` (required): Post ID

**Body:**
```json
{
  "userId": "o4gJhRwNMxY2G9YuAS0eiuZL6YX2"
}
```

**Required Fields:**
- `userId` (string)

**Response:**
```json
{
  "success": true,
  "postId": "post_1763391790414_ahrf96oa3",
  "isLiked": true,
  "likesCount": 3
}
```

**cURL:**
```bash
curl -X POST "http://localhost:4000/api/community/posts/post_1763391790414_ahrf96oa3/like" \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "o4gJhRwNMxY2G9YuAS0eiuZL6YX2"
  }'
```

---

### 8. Add Comment

**POST** `/api/community/posts/:postId/comments`

**Path Parameters:**
- `postId` (required): Post ID

**Body:**
```json
{
  "userId": "o4gJhRwNMxY2G9YuAS0eiuZL6YX2",
  "content": "Great job! Can you share your study notes?"
}
```

**Required Fields:**
- `userId` (string)
- `content` (string)

**Response:**
```json
{
  "success": true,
  "postId": "post_1763391790414_ahrf96oa3",
  "comment": {
    "id": "comment_1763391790504_abc123",
    "author": {
      "userId": "o4gJhRwNMxY2G9YuAS0eiuZL6YX2",
      "name": "John Doe",
      "avatar": null,
      "university": "Seoul National University"
    },
    "content": "Great job! Can you share your study notes?",
    "createdAt": {...}
  },
  "message": "Comment added successfully"
}
```

**cURL:**
```bash
curl -X POST "http://localhost:4000/api/community/posts/post_1763391790414_ahrf96oa3/comments" \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "o4gJhRwNMxY2G9YuAS0eiuZL6YX2",
    "content": "Great job! Can you share your study notes?"
  }'
```

---

## Categories

Available categories:
- `All`
- `Study Tips`
- `Study Groups`
- `Success Stories`
- `Research`
- `Community Projects`
- `General`

---

## School Verification

To enable school verification for a user, update their profile:

**PATCH** `/api/users/:uid/profile`

```json
{
  "schoolVerified": true,
  "university": "Seoul National University"
}
```

---

## Summary

| Method | Endpoint | Requires Verification | Description |
|--------|----------|---------------------|-------------|
| GET | `/api/community/verify/:userId` | No | Check if user is verified |
| POST | `/api/community/posts` | Yes | Create a post |
| GET | `/api/community/posts` | No | List all posts |
| GET | `/api/community/posts/:postId` | No | Get post by ID |
| PATCH | `/api/community/posts/:postId` | Yes | Update post (author only) |
| DELETE | `/api/community/posts/:postId` | Yes | Delete post (author only) |
| POST | `/api/community/posts/:postId/like` | Yes | Toggle like |
| POST | `/api/community/posts/:postId/comments` | Yes | Add comment |

