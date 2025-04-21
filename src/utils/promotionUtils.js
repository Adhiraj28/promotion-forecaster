import { RANK_ORDER, SLOTS } from '../data/config';
import { getRetirementDate, formatDate } from './dateUtils';

/**
 * Build rank structures - organize officers by rank
 * @param {Array} officers - List of all officers
 * @returns {Object} - Map of rank to officer list
 */
export const buildRankStructures = (officers) => {
  // Initialize empty map with all ranks
  const rankMap = {};
  RANK_ORDER.forEach(rank => {
    rankMap[rank] = [];
  });
  
  // Add officers to their respective ranks
  officers.forEach(officer => {
    rankMap[officer.Rank].push(officer);
  });
  
  return rankMap;
};

/**
 * Build retirement events list
 * @param {Array} officers - List of all officers
 * @returns {Array} - List of [date, officer] pairs sorted by date
 */
export const buildRetirementEvents = (officers) => {
  const events = [];
  
  officers.forEach(officer => {
    const retirementDate = getRetirementDate(officer.DOB);
    events.push([retirementDate, officer]);
  });
  
  // Sort by retirement date (ascending)
  events.sort((a, b) => a[0] - b[0]);
  
  return events;
};

/**
 * Fill vacancies by promoting officers from lower ranks
 * @param {Object} rankMap - Map of rank to officer list
 * @param {string} rank - Current rank with vacancy
 * @param {Date} eventDate - Date of the event causing the vacancy
 * @param {Object} promotions - Map of officer IRLA to promotion records
 * @param {Object} cause - Officer causing the promotion
 */
const fillRankUpwards = (rankMap, rank, eventDate, promotions, cause) => {
  while (rankMap[rank].length < SLOTS[rank]) {
    const idx = RANK_ORDER.indexOf(rank);
    if (idx === RANK_ORDER.length - 1) {
      break; // No lower rank exists
    }
    
    const lowerRank = RANK_ORDER[idx + 1];
    if (!rankMap[lowerRank] || rankMap[lowerRank].length === 0) {
      break; // No officers in lower rank
    }
    
    // Find first eligible candidate
    let candidate = null;
    for (const cand of rankMap[lowerRank]) {
      if (!cand.Retired) {
        candidate = cand;
        break;
      }
    }
    
    if (!candidate) {
      break; // No eligible candidates
    }
    
    // Promote the candidate
    const index = rankMap[lowerRank].indexOf(candidate);
    rankMap[lowerRank].splice(index, 1);
    candidate.Rank = rank;
    rankMap[rank].push(candidate);
    
    // Record promotion
    if (!promotions[candidate.IRLA]) {
      promotions[candidate.IRLA] = [];
    }
    
    // Use tuple format exactly like Python: [new_rank, date, cause_irla, cause_name]
    promotions[candidate.IRLA].push([
      rank, 
      eventDate, 
      cause.IRLA, 
      cause.Name || 'Unknown'
    ]);
    
    // Cascade: fill vacancy in lower rank
    fillRankUpwards(rankMap, lowerRank, eventDate, promotions, cause);
  }
};

/**
 * Simulate promotions for all officers
 * @param {Array} officers - List of all officers
 * @returns {Object} - Map of officer IRLA to promotion records
 */
export const simulatePromotions = (officers) => {
  const promotions = {};
  
  // Build rank structure
  const rankMap = buildRankStructures(officers);
  
  // Build retirement events
  const events = buildRetirementEvents(officers);
  
  // Process each retirement event
  events.forEach(([retirementDate, retiringOfficer]) => {
    if (retiringOfficer.Retired) {
      return; // Skip if already retired
    }
    
    // Mark as retired and remove from rank
    retiringOfficer.Retired = true;
    const rank = retiringOfficer.Rank;
    const rankList = rankMap[rank];
    
    for (let i = 0; i < rankList.length; i++) {
      if (rankList[i].IRLA === retiringOfficer.IRLA) {
        rankList.splice(i, 1);
        break;
      }
    }
    
    // Trigger promotions using this retiring officer as the cause
    fillRankUpwards(rankMap, rank, retirementDate, promotions, retiringOfficer);
  });
  
  return promotions;
};

/**
 * Compute promotion timeline for a specific officer
 * @param {string} officerIRLA - IRLA of the officer
 * @param {Object} promotions - Promotion records from simulation
 * @returns {string} - Formatted timeline text
 */
export const computePromotionTimeline = (officerIRLA, promotions) => {
  if (!promotions[officerIRLA] || promotions[officerIRLA].length === 0) {
    return "No promotions recorded.";
  }
  
  const timelineLines = [];
  
  // Each promotion record is: [new_rank, date, cause_irla, cause_name]
  promotions[officerIRLA].forEach(record => {
    const [newRank, date, causeIRLA, causeName] = record;
    timelineLines.push(`Promoted to ${newRank} on ${formatDate(date)} (triggered by retirement of ${causeName} [${causeIRLA}])`);
  });
  
  return timelineLines.join('\n');
};

/**
 * Find an officer by IRLA
 * @param {Array} officers - List of all officers
 * @param {string} irla - IRLA to search for
 * @returns {Object|null} - Officer object if found, null otherwise
 */
export const findOfficerByIRLA = (officers, irla) => {
  return officers.find(officer => officer.IRLA === irla) || null;
};