# Fix Config Path Resolution - Tasks

## 1. Analysis and Design

### 1.1 Current Behavior Analysis ✅
- [x] 1.1.1 Analyze current `resolveConfigPath` implementation
- [x] 1.1.2 Identify the specific issue with relative path resolution
- [x] 1.1.3 Document the expected behavior vs actual behavior

### 1.2 Solution Design ✅
- [x] 1.2.1 Design new path resolution logic that respects `FLEX_CHAT_CONFIG_DIR` for relative paths
- [x] 1.2.2 Plan flexible config filename resolution using `FLEX_CHAT_CONFIG_FILE`
- [x] 1.2.3 Plan fallback logic for when `FLEX_CHAT_CONFIG_DIR` is not set
- [x] 1.2.4 Ensure backward compatibility with existing usage patterns

## 2. Implementation

### 2.1 Core Fix ✅
- [x] 2.1.1 Modify `resolveConfigPath` to use `FLEX_CHAT_CONFIG_DIR` as base for relative paths
- [x] 2.1.2 Add `resolveFileName()` function to handle flexible config filenames
- [x] 2.1.3 Add fallback logic to determine project root when env var not set
- [x] 2.1.4 Maintain existing absolute path handling
- [x] 2.1.5 Preserve environment variable precedence
- [x] 2.1.6 Simplify environment variable logic and remove combined scenario

### 2.2 Testing ✅
- [x] 2.2.1 Test relative path resolution from project root
- [x] 2.2.2 Test relative path resolution from backend/chat directory
- [x] 2.2.3 Test absolute path resolution (should be unchanged)
- [x] 2.2.4 Test environment variable precedence
- [x] 2.2.5 Test flexible config filename with `FLEX_CHAT_CONFIG_FILE`
- [x] 2.2.6 Test `FLEX_CHAT_CONFIG_FILE_PATH` environment variable
- [x] 2.2.7 Test directory vs file argument handling

### 2.3 Validation ✅
- [x] 2.3.1 Verify server starts correctly from different directories
- [x] 2.3.2 Confirm `FLEX_CHAT_CONFIG_DIR` is respected
- [x] 2.3.3 Ensure no regression in existing functionality
