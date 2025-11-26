#!/bin/bash

# Test script for Notes API endpoints
BASE_URL="http://localhost:3000"
TOKEN="your-jwt-token-here"

echo "Testing Notes API endpoints..."
echo ""

# Test 1: Create a note
echo "1. Creating a new note..."
curl -X POST "$BASE_URL/notes" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "My First Note",
    "content": "This is a test note content"
  }'
echo -e "\n"

# Test 2: Get all notes
echo "2. Getting all notes..."
curl -X GET "$BASE_URL/notes" \
  -H "Authorization: Bearer $TOKEN"
echo -e "\n"

# Test 3: Get my notes
echo "3. Getting my notes..."
curl -X GET "$BASE_URL/notes/my-notes" \
  -H "Authorization: Bearer $TOKEN"
echo -e "\n"

# Test 4: Get note by ID (replace 1 with actual ID)
echo "4. Getting note by ID..."
curl -X GET "$BASE_URL/notes/1" \
  -H "Authorization: Bearer $TOKEN"
echo -e "\n"

# Test 5: Update a note (replace 1 with actual ID)
echo "5. Updating a note..."
curl -X PATCH "$BASE_URL/notes/1" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Updated Note Title",
    "content": "Updated content"
  }'
echo -e "\n"

# Test 6: Delete a note (replace 1 with actual ID)
echo "6. Deleting a note..."
curl -X DELETE "$BASE_URL/notes/1" \
  -H "Authorization: Bearer $TOKEN"
echo -e "\n"

echo "Testing completed!"
