import { RANK_ORDER, SLOTS } from '../data/config';

/**
 * Calculate retirement date from date of birth
 * @param {string} dobStr - Date of birth in DD-MM-YYYY format
 * @returns {Date} - Retirement date
 */
export function getRetirementDate(dobStr) {
  const [day, month, year] = dobStr.split('-').map(num => parseInt(num, 10));
  const dob = new Date(year, month - 1, day);
  
  const retireYear = dob.getFullYear() + 60; // Retirement age is 60
  const retireMonth = dob.getMonth();
  
  // Get the last day of the retirement month
  const lastDay = new Date(retireYear, retireMonth + 1, 0).getDate();
  
  return new Date(retireYear, retireMonth, lastDay);
}

/**
 * Format a date as DD-MM-YYYY
 * @param {Date} date - Date to format
 * @returns {string} - Formatted date string
 */
export function formatDate(date) {
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  return `${day}-${month}-${year}`;
}

/**
 * Build rank structure by grouping officers by rank
 * @param {Array} officers - List of all officers
 * @returns {Object} - Map of rank to officer list
 */
export function buildRankStructures(officers) {
  const rankMap = {};
  
  // Initialize empty arrays for each rank
  RANK_ORDER.forEach(rank => {
    rankMap[rank] = [];
  });
  
  // Add officers to their respective ranks
  officers.forEach(officer => {
    rankMap[officer.Rank].push({...officer});
  });
  
  // Sort each rank by seniority (frozen officers last)
  for (const rank in rankMap) {
    rankMap[rank].sort((a, b) => {
      // Frozen officers come last
      if (a.Frozen !== b.Frozen) {
        return a.Frozen ? 1 : -1;
      }
      // Otherwise sort by order_index (seniority)
      return a.order_index - b.order_index;
    });
  }
  
  return rankMap;
}

/**
 * Build a list of retirement events
 * @param {Array} officers - List of all officers
 * @returns {Array} - List of retirement events
 */
export function buildRetirementEvents(officers) {
  const events = [];
  
  officers.forEach(officer => {
    // Skip frozen officers
    if (officer.Frozen) return;
    
    const retirementDate = getRetirementDate(officer.DOB);
    events.push([retirementDate, officer]);
  });
  
  // Sort by retirement date
  events.sort((a, b) => a[0] - b[0]);
  
  return events;
}

/**
 * Simulate officer promotions
 * @param {Array} officers - List of all officers
 * @returns {Object} - Map of IRLA to promotion records
 */
export function simulatePromotions(officers) {
  // Create deep copy to avoid modifying the original
  const officersCopy = JSON.parse(JSON.stringify(officers));
  
  // Initialize promotion records
  const promotions = {};
  
  // Reset retired flags
  officersCopy.forEach(officer => {
    officer.Retired = false;
  });
  
  // Build rank structure
  const rankMap = buildRankStructures(officersCopy);
  
  // Build retirement events
  const events = buildRetirementEvents(officersCopy);
  
  // Process retirement events
  events.forEach(([retirementDate, retiringOfficer]) => {
    // Skip if already retired
    if (retiringOfficer.Retired) return;
    
    // Mark as retired
    retiringOfficer.Retired = true;
    
    // Remove from current rank
    const rank = retiringOfficer.Rank;
    const rankList = rankMap[rank];
    
    for (let i = 0; i < rankList.length; i++) {
      if (rankList[i].IRLA === retiringOfficer.IRLA) {
        rankList.splice(i, 1);
        break;
      }
    }
    
    // Fill the vacancy
    fillRankUpwards(rankMap, rank, retirementDate, promotions, retiringOfficer);
  });
  
  return promotions;
}

/**
 * Fill vacancies by promoting officers
 */
function fillRankUpwards(rankMap, rank, eventDate, promotions, cause) {
  while (rankMap[rank].length < SLOTS[rank]) {
    const rankIndex = RANK_ORDER.indexOf(rank);
    
    // If this is the lowest rank, can't fill from below
    if (rankIndex === RANK_ORDER.length - 1) {
      break;
    }
    
    const lowerRank = RANK_ORDER[rankIndex + 1];
    
    // If no officers in lower rank, can't fill
    if (!rankMap[lowerRank] || rankMap[lowerRank].length === 0) {
      break;
    }
    
    // Find first eligible candidate
    let candidate = null;
    
    for (const officer of rankMap[lowerRank]) {
      if (!officer.Retired && !officer.Frozen) {
        candidate = officer;
        break;
      }
    }
    
    // If no eligible candidates, can't fill
    if (!candidate) {
      break;
    }
    
    // Remove from lower rank
    const index = rankMap[lowerRank].indexOf(candidate);
    rankMap[lowerRank].splice(index, 1);
    
    // Update rank
    const oldRank = candidate.Rank;
    candidate.Rank = rank;
    
    // Add to new rank
    rankMap[rank].push(candidate);
    
    // Record promotion
    if (!promotions[candidate.IRLA]) {
      promotions[candidate.IRLA] = [];
    }
    
    promotions[candidate.IRLA].push([
      rank,              // New rank
      eventDate,         // Promotion date
      cause.IRLA,        // Cause IRLA
      cause.Name || "Unknown"  // Cause name
    ]);
    
    // Fill vacancy in lower rank
    fillRankUpwards(rankMap, lowerRank, eventDate, promotions, cause);
  }
}

/**
 * Compute promotion timeline for an officer
 * @param {string} irla - Officer IRLA
 * @param {Object} promotions - Promotion records
 * @returns {string} - Formatted timeline
 */
export function computePromotionTimeline(irla, promotions) {
  if (!promotions[irla] || promotions[irla].length === 0) {
    return "No promotions recorded.";
  }
  
  const lines = [];
  
  for (const [newRank, date, causeIRLA, causeName] of promotions[irla]) {
    const dateStr = formatDate(date);
    lines.push(`Promoted to ${newRank} on ${dateStr} (triggered by retirement of ${causeName} [${causeIRLA}])`);
  }
  
  return lines.join('\n');
}

/**
 * Filter officers based on current date
 * @param {Array} officers - List of all officers
 * @param {Object} promotions - Promotion records
 * @param {Date} currentDate - Current date
 * @returns {Object} - Filtered rank map
 */
export function filterByDate(officers, promotions, currentDate) {
  // Create deep copy
  const officersCopy = JSON.parse(JSON.stringify(officers));
  
  // Initialize rank map
  const rankMap = {};
  RANK_ORDER.forEach(rank => {
    rankMap[rank] = [];
  });
  
  // Process each officer
  officersCopy.forEach(officer => {
    const retirementDate = getRetirementDate(officer.DOB);
    
    // Skip if retired by current date (unless frozen)
    if (retirementDate <= currentDate && !officer.Frozen) {
      return;
    }
    
    // Determine current rank
    let currentRank = officer.Rank;
    
    // Check if officer has been promoted by current date
    if (promotions[officer.IRLA]) {
      const pastPromotions = promotions[officer.IRLA].filter(
        promo => promo[1] <= currentDate
      );
      
      if (pastPromotions.length > 0) {
        // Use the most recent promotion
        currentRank = pastPromotions[pastPromotions.length - 1][0];
      }
    }
    
    // Add to the appropriate rank
    rankMap[currentRank].push({
      ...officer,
      Rank: currentRank
    });
  });
  
  return rankMap;
}