import { RANK_ORDER, SLOTS } from '../data/config';
import { getRetirementDate } from './dateUtils';

/**
 * Run a full promotion simulation up to a specific date
 * 
 * @param {Array} officers - Original list of all officers
 * @param {Date} currentDate - Date to simulate up to
 * @returns {Object} - Contains new officer states and promotion records
 */
export const runFullSimulation = (officers, currentDate) => {
  // Create deep copies to avoid modifying original data
  const officersCopy = JSON.parse(JSON.stringify(officers));
  
  // Track all promotions for timeline view
  const promotionRecords = {};
  
  // PHASE 1: Process ALL retirement events for complete timeline
  // ----------------------------------------------------------
  
  // Create the initial rank structure for full timeline simulation
  const timelineRankStructure = {};
  RANK_ORDER.forEach(rank => {
    timelineRankStructure[rank] = [];
  });
  
  // Add all officers to their starting ranks
  officersCopy.forEach(officer => {
    timelineRankStructure[officer.Rank].push({...officer});
    
    // Initialize state
    officer.Retired = false;
    officer.Frozen = officer.Frozen || false;
  });
  
  // Sort each rank by seniority (order_index)
  for (const rank in timelineRankStructure) {
    timelineRankStructure[rank].sort((a, b) => {
      // Frozen officers come last
      if (a.Frozen !== b.Frozen) {
        return a.Frozen ? 1 : -1;
      }
      // Otherwise sort by order_index (seniority)
      return a.order_index - b.order_index;
    });
  }
  
  // Build a list of ALL retirement events
  const allRetirementEvents = [];
  
  officersCopy.forEach(officer => {
    // Skip frozen officers for retirement events
    if (officer.Frozen) return;
    
    const retirementDate = getRetirementDate(officer.DOB);
    allRetirementEvents.push({
      date: retirementDate,
      officer: {...officer}
    });
  });
  
  // Sort events chronologically
  allRetirementEvents.sort((a, b) => a.date - b.date);
  
  // Process ALL events for complete timeline
  allRetirementEvents.forEach(event => {
    const { officer, date } = event;
    
    // Find this officer in the timeline structure
    const rankList = timelineRankStructure[officer.Rank];
    const index = rankList.findIndex(o => o.IRLA === officer.IRLA);
    
    // Skip if already retired or not found
    if (index === -1) return;
    
    // Remove from current rank
    const retiredOfficer = rankList.splice(index, 1)[0];
    retiredOfficer.Retired = true;
    
    // Fill the resulting vacancy
    fillVacancy(timelineRankStructure, officer.Rank, date, promotionRecords, officer);
  });
  
  // PHASE 2: Create display ranks for current date
  // ---------------------------------------------
  
  // For the display, we'll run a separate simulation up to the current date
  // This ensures we respect SLOTS and don't duplicate officers
  
  // Create new rank structure for display
  const displayRankStructure = {};
  RANK_ORDER.forEach(rank => {
    displayRankStructure[rank] = [];
  });
  
  // Add all officers to their starting ranks for display
  officersCopy.forEach(officer => {
    // Reset retired flag for display simulation
    officer.displayRetired = false;
    displayRankStructure[officer.Rank].push(officer);
  });
  
  // Sort each rank by seniority
  for (const rank in displayRankStructure) {
    displayRankStructure[rank].sort((a, b) => {
      if (a.Frozen !== b.Frozen) {
        return a.Frozen ? 1 : -1;
      }
      return a.order_index - b.order_index;
    });
  }
  
  // Build events up to current date
  const displayEvents = [];
  officersCopy.forEach(officer => {
    if (officer.Frozen) return;
    
    const retirementDate = getRetirementDate(officer.DOB);
    if (retirementDate <= currentDate) {
      displayEvents.push({
        date: retirementDate, 
        officer
      });
    }
  });
  
  // Sort events
  displayEvents.sort((a, b) => a.date - b.date);
  
  // Process events up to current date
  displayEvents.forEach(event => {
    const { officer, date } = event;
    
    // Find in display structure
    const rankList = displayRankStructure[officer.Rank];
    const index = rankList.findIndex(o => o.IRLA === officer.IRLA && !o.displayRetired);
    
    if (index === -1) return;
    
    // Remove from rank
    const retiredOfficer = rankList.splice(index, 1)[0];
    retiredOfficer.displayRetired = true;
    
    // Fill vacancy for display
    fillDisplayVacancy(displayRankStructure, officer.Rank, officer);
  });
  
  // Create final display ranks
  const displayRanks = {};
  RANK_ORDER.forEach(rank => {
    displayRanks[rank] = displayRankStructure[rank].filter(o => !o.displayRetired);
  });
  
  // Return simulation results
  return {
    displayRanks,
    updatedOfficers: officersCopy,
    promotionRecords
  };
};

/**
 * Fill a vacancy in the display ranks
 */
function fillDisplayVacancy(rankStructure, vacancyRank, causeOfficer) {
  // While there's a vacancy in this rank
  while (rankStructure[vacancyRank].filter(o => !o.displayRetired).length < SLOTS[vacancyRank]) {
    const rankIndex = RANK_ORDER.indexOf(vacancyRank);
    
    // If this is the lowest rank, we can't fill from below
    if (rankIndex === RANK_ORDER.length - 1) {
      break;
    }
    
    const lowerRank = RANK_ORDER[rankIndex + 1];
    const eligibleOfficers = rankStructure[lowerRank].filter(o => !o.Frozen && !o.displayRetired);
    
    // If no officers in lower rank, we can't fill
    if (eligibleOfficers.length === 0) {
      break;
    }
    
    // Promote the most senior eligible officer
    const candidate = eligibleOfficers[0];
    
    // Remove from lower rank (mark as promoted)
    const index = rankStructure[lowerRank].findIndex(o => o.IRLA === candidate.IRLA);
    if (index !== -1) {
      rankStructure[lowerRank].splice(index, 1);
    }
    
    // Update rank for display
    candidate.Rank = vacancyRank;
    
    // Add to new rank
    rankStructure[vacancyRank].push(candidate);
    
    // Fill vacancy in lower rank
    fillDisplayVacancy(rankStructure, lowerRank, causeOfficer);
  }
}

/**
 * Fill a vacancy in a rank by promoting the most senior officer from the lower rank
 * 
 * @param {Object} rankStructure - Current rank structure
 * @param {string} vacancyRank - Rank with the vacancy
 * @param {Date} date - Date of the vacancy
 * @param {Object} promotionRecords - Record of all promotions
 * @param {Object} causeOfficer - Officer who caused the vacancy
 */
function fillVacancy(rankStructure, vacancyRank, date, promotionRecords, causeOfficer) {
  // While there's a vacancy in this rank
  while (rankStructure[vacancyRank].length < SLOTS[vacancyRank]) {
    const rankIndex = RANK_ORDER.indexOf(vacancyRank);
    
    // If this is the lowest rank, we can't fill from below
    if (rankIndex === RANK_ORDER.length - 1) {
      break;
    }
    
    const lowerRank = RANK_ORDER[rankIndex + 1];
    
    // If no officers in lower rank, we can't fill
    if (rankStructure[lowerRank].length === 0) {
      break;
    }
    
    // Find the first eligible candidate (not frozen or retired)
    let candidate = null;
    let candidateIndex = -1;
    
    for (let i = 0; i < rankStructure[lowerRank].length; i++) {
      const officer = rankStructure[lowerRank][i];
      if (!officer.Frozen && !officer.Retired) {
        candidate = officer;
        candidateIndex = i;
        break;
      }
    }
    
    // If no eligible candidates, we can't fill
    if (!candidate) {
      break;
    }
    
    // Remove from lower rank
    rankStructure[lowerRank].splice(candidateIndex, 1);
    
    // Update rank
    const oldRank = candidate.Rank;
    candidate.Rank = vacancyRank;
    
    // Add to new rank
    rankStructure[vacancyRank].push(candidate);
    
    // Record the promotion
    if (!promotionRecords[candidate.IRLA]) {
      promotionRecords[candidate.IRLA] = [];
    }
    
    console.log(`Recording promotion: ${candidate.IRLA} to ${vacancyRank}`);
    
    promotionRecords[candidate.IRLA].push([
      vacancyRank, 
      date, 
      causeOfficer.IRLA, 
      causeOfficer.Name || 'Unknown'
    ]);
    
    // Now fill the vacancy in the lower rank
    fillVacancy(rankStructure, lowerRank, date, promotionRecords, causeOfficer);
  }
}

/**
 * Generate a promotion timeline for an officer
 * 
 * @param {string} irla - IRLA of the officer
 * @param {Object} promotionRecords - Records of all promotions
 * @returns {string} - Formatted timeline text
 */
export const generateTimeline = (irla, promotionRecords) => {
  console.log("Generating timeline for IRLA:", irla);
  console.log("Promotion records:", promotionRecords);
  
  if (!promotionRecords[irla] || promotionRecords[irla].length === 0) {
    return "No promotions recorded.";
  }
  
  const lines = promotionRecords[irla].map(([rank, date, causeIRLA, causeName]) => {
    const dateStr = formatDate(date);
    return `Promoted to ${rank} on ${dateStr} (triggered by retirement of ${causeName} [${causeIRLA}])`;
  });
  
  return lines.join('\n');
};

/**
 * Format a date as DD-MM-YYYY
 * 
 * @param {Date} date - Date to format
 * @returns {string} - Formatted date string
 */
function formatDate(date) {
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  return `${day}-${month}-${year}`;
}