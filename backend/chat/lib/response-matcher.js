/**
 * Response Matcher - Phase 3 of request flow
 * 
 * Matches a response rule from config against the profile.
 * First match wins, fallback response has no match clause.
 */

/**
 * Evaluate if a match clause matches the profile
 * 
 * @param {Object} matchClause - The match object from a response rule
 * @param {Object} profile - The profile object from Phase 1b/2
 * @returns {boolean} True if all conditions in match clause are satisfied
 */
function evaluateMatch(matchClause, profile) {
  // Empty match clause = always matches (fallback)
  if (!matchClause || Object.keys(matchClause).length === 0) {
    return true;
  }

  // All conditions must pass (AND logic)
  for (const [key, value] of Object.entries(matchClause)) {
    if (key.endsWith('_contains')) {
      // Pattern: field_contains -> substring match on profile[field]
      const field = key.replace('_contains', '');
      const fieldValue = profile[field];
      if (!fieldValue || typeof fieldValue !== 'string' || !fieldValue.includes(value)) {
        return false;
      }
    } else if (key.endsWith('_regexp')) {
      // Pattern: field_regexp -> regex match on profile[field]
      const field = key.replace('_regexp', '');
      const fieldValue = profile[field];
      if (!fieldValue || typeof fieldValue !== 'string') {
        return false;
      }
      
      // Parse regex pattern (supports "/pattern/flags" or plain "pattern")
      let regex;
      const regexMatch = value.match(/^\/(.+)\/([gimuy]*)$/);
      if (regexMatch) {
        // Format: "/pattern/flags"
        regex = new RegExp(regexMatch[1], regexMatch[2]);
      } else {
        // Plain pattern string
        regex = new RegExp(value);
      }
      
      if (!regex.test(fieldValue)) {
        return false;
      }
    } else if (key === 'rag_results' && value === 'any') {
      // Special: match if rag_results is "match" OR "partial"
      if (profile.rag_results !== 'match' && profile.rag_results !== 'partial') {
        return false;
      }
    } else {
      // Default: exact equality match
      if (profile[key] !== value) {
        return false;
      }
    }
  }

  return true;
}

/**
 * Find the first response rule that matches the profile
 * 
 * @param {Object} profile - The profile object from Phase 1b/2
 * @param {Array} responses - Array of response rules from config
 * @returns {Object} The matched response rule
 * @throws {Error} If no response rule matches
 */
function matchResponseRule(profile, responses) {
  console.log(`\n🎯 Phase 3: Matching response rule... against service:${profile.service}, collection:${profile.collection}`);
  
  if (!responses || responses.length === 0) {
    throw new Error('No response rules defined in configuration');
  }

  for (let i = 0; i < responses.length; i++) {
    const response = responses[i];
    // console.log(`    Trying ${JSON.stringify(response.match)}`);
    // Check if this response matches
    if (evaluateMatch(response.match, profile)) {
      console.log(`   ✅ Matched response rule #${i + 1}`);
      if (response.match && Object.keys(response.match).length > 0) {
        console.log(`      Conditions: ${JSON.stringify(response.match)}`);
      } else {
        console.log(`      (Fallback response - no conditions)`);
      }
      return response;
    }
  }

  // Should never reach here if config has proper fallback
  throw new Error('No matching response rule found (missing fallback?)');
}

module.exports = {
  matchResponseRule,
  evaluateMatch
};

