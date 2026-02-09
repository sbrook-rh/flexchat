# Implementation Tasks

## 1. Backend Validation
- [x] 1.1 Add duplicate LLM ID validation in `config-loader.js` after line 108
- [x] 1.2 Provide helpful error messages for duplicate IDs
- [x] 1.3 Test validation with duplicate provider IDs

## 2. LLM Wizard Updates
- [x] 2.1 Add `generateProviderId()` helper function (kebab-case conversion)
- [x] 2.2 Update component state to separate `providerId` and `description`
- [x] 2.3 Add dual-field UI in Step 5 (read-only ID, editable description)
- [x] 2.4 Update `handleSave()` to return both `id` and `name` (description)
- [x] 2.5 Update edit mode initialization to populate both fields

## 3. Config Builder Updates
- [x] 3.1 Fix `handleLLMSave()` to use `providerData.id` as key
- [x] 3.2 Store `description` field in provider config
- [x] 3.3 Update `handleEditLLMProvider()` to pass ID and description correctly
- [x] 3.4 Add duplicate ID prevention with clear error message
- [x] 3.5 Handle selected model storage with new structure

## 4. LLM Provider List Updates
- [x] 4.1 Update display logic to show description with ID as secondary info
- [x] 4.2 Update delete confirmation to use description
- [x] 4.3 Update map function to use stable ID as React key
- [x] 4.4 Implement backward compatibility fallback (description || id)

## 5. Edge Cases
- [x] 5.1 Add duplicate ID prevention with clear error message
- [x] 5.2 Implement backward compatibility fallback (description || id)
- [x] 5.3 Add empty description validation
- [x] 5.4 Test special character handling in ID generation

## 6. Testing
- [x] 6.1 Test create provider → ID generated from description
- [x] 6.2 Test edit description → no duplicate created, ID unchanged
- [x] 6.3 Test edit mode → ID field locked/disabled
- [x] 6.4 Test duplicate ID prevention
- [x] 6.5 Test backward compatibility with existing configs
- [x] 6.6 Test special characters in description → valid ID generation
- [x] 6.7 Test empty description → validation prevents save
- [x] 6.8 Test full workflow: create → use in handler → edit → validate → chat
- [x] 6.9 Verify all integration points work (response handlers, embeddings, intent, topic)
- [x] 6.10 Test that existing LLM references remain valid after adding description

