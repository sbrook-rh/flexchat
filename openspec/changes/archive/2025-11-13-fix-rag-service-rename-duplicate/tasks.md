# Implementation Tasks

## 1. Backend Validation
- [x] 1.1 Add RAG service reference validation in `config-loader.js` after line 108
- [x] 1.2 Mirror LLM validation pattern for consistency
- [x] 1.3 Test validation with orphaned handler references

## 2. RAG Wizard Updates
- [x] 2.1 Add `generateServiceId()` helper function (kebab-case conversion)
- [x] 2.2 Update component state to separate `serviceId` and `description`
- [x] 2.3 Add dual-field UI in Step 4 (read-only ID, editable description)
- [x] 2.4 Update `handleSave()` to return both `id` and `name` (description)
- [x] 2.5 Update edit mode initialization to populate both fields

## 3. Config Builder Updates
- [x] 3.1 Fix `handleRAGSave()` to use `providerData.id` as key
- [x] 3.2 Store `description` field in service config
- [x] 3.3 Update display logic to show description with ID as secondary info
- [x] 3.4 Update delete confirmation to use description
- [x] 3.5 Update handler display to show service descriptions

## 4. Edge Cases
- [x] 4.1 Add duplicate ID prevention with clear error message
- [x] 4.2 Implement backward compatibility fallback (description || id)
- [x] 4.3 Add empty description validation
- [x] 4.4 Test special character handling in ID generation

## 5. Testing
- [x] 5.1 Test create service → ID generated from description
- [x] 5.2 Test edit description → no duplicate created, ID unchanged
- [x] 5.3 Test edit mode → ID field locked/disabled
- [x] 5.4 Test delete service → validation error if handlers reference it
- [x] 5.5 Test duplicate ID prevention
- [x] 5.6 Test backward compatibility with existing configs
- [x] 5.7 Test special characters in description → valid ID generation
- [x] 5.8 Test empty description → validation prevents save
- [x] 5.9 Test full workflow: create → use in handler → edit → validate → chat
- [x] 5.10 Verify error format matches LLM validation pattern

