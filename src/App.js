import React, { useState, useEffect, useCallback } from 'react';
import './index.css';
import { RANK_ORDER, SLOTS } from './data/config';
import { getAllOfficers } from './data/officerData';

// Utility functions
function getRetirementDate(dobStr) {
  const [day, month, year] = dobStr.split('-').map(num => parseInt(num, 10));
  const dob = new Date(year, month - 1, day);
  
  const retireYear = dob.getFullYear() + 60; // Retirement age is 60
  const retireMonth = dob.getMonth();
  
  // Get the last day of the retirement month
  const lastDay = new Date(retireYear, retireMonth + 1, 0).getDate();
  
  return new Date(retireYear, retireMonth, lastDay);
}

function formatDate(date) {
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  return `${day}-${month}-${year}`;
}

function App() {
  // State
  const [allOfficers, setAllOfficers] = useState([]);
  const [displayRanks, setDisplayRanks] = useState({});
  const [currentDate] = useState(new Date()); // No setter needed as date is fixed to current
  const [selectedTab, setSelectedTab] = useState(RANK_ORDER[0]);
  const [searchedOfficer, setSearchedOfficer] = useState(null);
  const [timeline, setTimeline] = useState('');
  const [promotionRecords, setPromotionRecords] = useState({});
  const [searchText, setSearchText] = useState('');
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [searchResults, setSearchResults] = useState([]);
  
  // DISPLAY LOGIC - Apply current date filter to display ranks
  const applyCurrentDateFilter = useCallback(() => {
    console.log("Applying current date filter for:", currentDate);
    
    // Step 1: Start with fresh copies of all officers
    const officersCopy = JSON.parse(JSON.stringify(allOfficers));
    
    // Step 2: Mark officers as retired or not based on current date
    officersCopy.forEach(officer => {
      const retirementDate = getRetirementDate(officer.DOB);
      officer.isRetired = retirementDate <= currentDate;
    });
    
    // Step 3: Create rank structure (all officers in original ranks)
    const rankStructure = {};
    RANK_ORDER.forEach(rank => {
      rankStructure[rank] = [];
    });
    
    // Add officers to their original ranks
    officersCopy.forEach(officer => {
      rankStructure[officer.Rank].push(officer);
    });
    
    // Step 4: Remove retired officers and fill vacancies
    // Process each rank from highest to lowest
    RANK_ORDER.forEach(rank => {
      // Remove retired officers from this rank
      const activeOfficers = rankStructure[rank].filter(o => !o.isRetired);
      rankStructure[rank] = activeOfficers;
      
      // Calculate how many vacancies need to be filled
      const vacancies = SLOTS[rank] - activeOfficers.length;
      
      // If there are vacancies, fill them from the next lower rank
      if (vacancies > 0) {
        fillVacanciesForDisplay(rankStructure, rank, vacancies);
      }
    });
    
    // Step 5: Set the display ranks
    setDisplayRanks(rankStructure);
    
    // Log counts for debugging
    RANK_ORDER.forEach(rank => {
      console.log(`${rank}: ${rankStructure[rank].length} / ${SLOTS[rank]}`);
    });
  }, [allOfficers, currentDate]);
  
  // Helper function to fill vacancies in display
  function fillVacanciesForDisplay(rankStructure, rank, count) {
    const rankIndex = RANK_ORDER.indexOf(rank);
    
    // If this is the lowest rank, can't fill
    if (rankIndex === RANK_ORDER.length - 1) {
      return;
    }
    
    // Get the next lower rank
    const lowerRank = RANK_ORDER[rankIndex + 1];
    
    // Get active officers from lower rank
    const lowerRankOfficers = rankStructure[lowerRank].filter(o => !o.isRetired);
    
    // If no officers in lower rank, can't fill
    if (lowerRankOfficers.length === 0) {
      return;
    }
    
    // Determine how many officers to promote (limited by available officers)
    const promoteCount = Math.min(count, lowerRankOfficers.length);
    
    // Promote officers (the most senior ones first)
    for (let i = 0; i < promoteCount; i++) {
      // Find most senior officer (lowest order_index)
      lowerRankOfficers.sort((a, b) => a.order_index - b.order_index); // Lower index (more senior) first
      
      // Get the most senior officer
      const officerToPromote = lowerRankOfficers.shift();
      
      // Remove from lower rank
      const index = rankStructure[lowerRank].findIndex(o => o.IRLA === officerToPromote.IRLA);
      if (index !== -1) {
        rankStructure[lowerRank].splice(index, 1);
      }
      
      // Update rank for display only
      officerToPromote.Rank = rank;
      
      // Add to higher rank
      rankStructure[rank].push(officerToPromote);
    }
    
    // Now fill vacancies in the lower rank
    const lowerRankVacancies = SLOTS[lowerRank] - rankStructure[lowerRank].length;
    if (lowerRankVacancies > 0) {
      fillVacanciesForDisplay(rankStructure, lowerRank, lowerRankVacancies);
    }
  }
  
  // Search handler for dropdown search
  const handleSearchChange = useCallback((e) => {
    const value = e.target.value;
    setSearchText(value);
    
    if (value.trim().length < 2) {
      setShowSearchResults(false);
      return;
    }
    
    // Debounce search to improve performance
    setTimeout(() => {
      const results = allOfficers.filter(officer => 
        officer.Name.toLowerCase().includes(value.toLowerCase()) ||
        officer.IRLA.toLowerCase().includes(value.toLowerCase()) ||
        officer.Rank.toLowerCase().includes(value.toLowerCase())
      );
      
      setSearchResults(results);
      setShowSearchResults(true);
    }, 300);
  }, [allOfficers]);

  // Select officer from search results
  const selectOfficer = useCallback((officer) => {
    // Create a copy of the officer to display
    const officerToDisplay = { ...officer };
    
    // Check if the officer has any promotions up to current date
    if (promotionRecords[officer.IRLA] && promotionRecords[officer.IRLA].length > 0) {
      // Get all promotions that happened on or before current date
      const validPromotions = promotionRecords[officer.IRLA].filter(promotion => {
        const promotionDate = promotion[1]; // Date is the second item in the promotion array
        return promotionDate <= currentDate;
      });
      
      // If there are valid promotions, update the displayed rank to the latest one
      if (validPromotions.length > 0) {
        const latestPromotion = validPromotions[validPromotions.length - 1];
        officerToDisplay.Rank = latestPromotion[0]; // Update to promoted rank
      }
    }
    
    setSearchedOfficer(officerToDisplay);
    setSearchText(officer.Name);
    setShowSearchResults(false);
    
    // Compute promotion timeline for the selected officer
    const timelineText = computePromotionTimeline(officer.IRLA, promotionRecords);
    setTimeline(timelineText);
  }, [promotionRecords, currentDate]);

  // Load initial data and apply current date filter
  useEffect(() => {
    const officers = getAllOfficers();
    setAllOfficers(officers);
    
    // Run simulation for promotion records
    const promotions = runSimulation(officers);
    setPromotionRecords(promotions);
    
    // Create the initial display with all officers in their ranks
    const initialRankStructure = {};
    RANK_ORDER.forEach(rank => {
      initialRankStructure[rank] = [];
    });
    
    // Mark officers as retired or not based on current date
    officers.forEach(officer => {
      const retirementDate = getRetirementDate(officer.DOB);
      officer.isRetired = retirementDate <= currentDate;
      
      // Add to rank structure if not retired
      if (!officer.isRetired) {
        initialRankStructure[officer.Rank].push({...officer});
      }
    });
    
    // Fill vacancies for the initial display
    RANK_ORDER.forEach(rank => {
      const activeOfficers = initialRankStructure[rank];
      const vacancies = SLOTS[rank] - activeOfficers.length;
      
      if (vacancies > 0) {
        fillVacanciesForDisplay(initialRankStructure, rank, vacancies);
      }
    });
    
    setDisplayRanks(initialRankStructure);
  }, [currentDate]);

  // Simulation function
  function runSimulation(officers) {
    // Create deep copy
    const officersCopy = JSON.parse(JSON.stringify(officers));
    
    // Track promotions
    const promotions = {};
    
    // Reset retired flags
    officersCopy.forEach(officer => {
      officer.Retired = false;
    });
    
    // Build rank structure
    const rankMap = {};
    RANK_ORDER.forEach(rank => {
      rankMap[rank] = [];
    });
    
    // Add officers to their ranks
    officersCopy.forEach(officer => {
      rankMap[officer.Rank].push(officer);
    });
    
    // Sort each rank by seniority
    for (const rank in rankMap) {
      rankMap[rank].sort((a, b) => a.order_index - b.order_index);
    }
    
    // Build retirement events
    const events = [];
    officersCopy.forEach(officer => {
      const retirementDate = getRetirementDate(officer.DOB);
      events.push([retirementDate, officer]);
    });
    
    // Sort events
    events.sort((a, b) => a[0] - b[0]);
    
    // Process events
    events.forEach(([retirementDate, retiringOfficer]) => {
      if (retiringOfficer.Retired) return;
      
      // Mark as retired
      retiringOfficer.Retired = true;
      
      // Remove from rank
      const rank = retiringOfficer.Rank;
      const index = rankMap[rank].findIndex(o => o.IRLA === retiringOfficer.IRLA);
      if (index !== -1) {
        rankMap[rank].splice(index, 1);
      }
      
      // Fill vacancy
      fillVacancy(rankMap, rank, retirementDate, promotions, retiringOfficer);
    });
    
    return promotions;
  }
  
  // Fill vacancy function
  function fillVacancy(rankMap, rank, date, promotions, causeOfficer) {
    // While there's a vacancy
    while (rankMap[rank].length < SLOTS[rank]) {
      const rankIndex = RANK_ORDER.indexOf(rank);
      
      // If lowest rank, can't fill
      if (rankIndex === RANK_ORDER.length - 1) {
        break;
      }
      
      const lowerRank = RANK_ORDER[rankIndex + 1];
      
      // If no lower rank officers, can't fill
      if (!rankMap[lowerRank] || rankMap[lowerRank].length === 0) {
        break;
      }
      
      // Find eligible candidate
      let candidate = null;
      let candidateIndex = -1;
      
      for (let i = 0; i < rankMap[lowerRank].length; i++) {
        const officer = rankMap[lowerRank][i];
        if (!officer.Retired) {
          candidate = officer;
          candidateIndex = i;
          break;
        }
      }
      
      // If no candidates, can't fill
      if (!candidate) {
        break;
      }
      
      // Remove from lower rank
      rankMap[lowerRank].splice(candidateIndex, 1);
      
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
        rank,
        date,
        causeOfficer.IRLA,
        causeOfficer.Name || "Unknown"
      ]);
      
      // Fill vacancy in lower rank
      fillVacancy(rankMap, lowerRank, date, promotions, causeOfficer);
    }
  }
  
  // Compute promotion timeline
  function computePromotionTimeline(irla, promotions) {
    if (!promotions[irla] || promotions[irla].length === 0) {
      return "No promotions recorded.";
    }
    
    // Instead of plain text, we'll format the timeline with HTML for better styling
    const lines = [];
    
    promotions[irla].forEach(([newRank, date, causeIRLA, causeName]) => {
      const dateStr = formatDate(date);
      
      // Create HTML formatted text for each promotion event
      const formattedLine = `<div class="promotion-event">
        <span class="promotion-rank">Promotion to <strong>${newRank}</strong></span>
        <span class="promotion-date">on <strong>${dateStr}</strong></span>
        <span class="promotion-cause">(triggered by retirement of <strong>${causeName}</strong> [${causeIRLA}])</span>
      </div>`;
      
      lines.push(formattedLine);
    });
    
    return lines.join('');
  }
  
  return (
    <div className="container">
      <div className="header">
        <h1>CRPF Promotion Forecaster</h1>
      </div>
      
      <div className="search-panel">
        <div className="search-container">
          <label htmlFor="search-input">Search Officers:</label>
          <div className="search-input-wrapper">
            <input 
              id="search-input"
              type="text" 
              placeholder="Search by name, IRLA, or rank..."
              value={searchText}
              onChange={handleSearchChange}
              onFocus={() => searchText.length >= 2 && setShowSearchResults(true)}
              className="search-input"
            />
            
            {showSearchResults && searchResults.length > 0 && (
              <div className="search-results">
                {searchResults.map(officer => (
                  <div key={officer.IRLA} className="search-result-item" onClick={() => selectOfficer(officer)}>
                    <div className="officer-details">
                      <div className="officer-name">{officer.Name}</div>
                      <div className="officer-meta">
                        {officer.Rank} | IRLA: {officer.IRLA} | DOB: {officer.DOB}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
            
            {showSearchResults && searchResults.length === 0 && searchText.length >= 2 && (
              <div className="search-results">
                <div className="no-results">No officers found</div>
              </div>
            )}
          </div>
        </div>
      </div>
      
      {/* Timeline Results Card - shown when search is performed */}
      {searchedOfficer && (
        <div className="timeline-card">
          <div className="timeline-header">
            <h3>Officer Timeline: {searchedOfficer.Name} [{searchedOfficer.IRLA}]</h3>
            <button className="close-btn" onClick={() => {setSearchedOfficer(null); setTimeline('');}}>×</button>
          </div>
          <div className="timeline-content">
            <div className="officer-info">
              <div className="info-item">
                <strong>IRLA:</strong> {searchedOfficer.IRLA}
              </div>
              <div className="info-item">
                <strong>Name:</strong> {searchedOfficer.Name}
              </div>
              <div className="info-item">
                <strong>Current Rank:</strong> {searchedOfficer.Rank}
              </div>
              <div className="info-item">
                <strong>DOB:</strong> {searchedOfficer.DOB}
              </div>
            </div>
            
            <h4>Promotion Timeline</h4>
            {timeline && timeline !== "No promotions recorded." ? (
              <div 
                className="timeline-pre"
                dangerouslySetInnerHTML={{ __html: timeline }}
              />
            ) : (
              <p>No promotions recorded for this officer.</p>
            )}
          </div>
        </div>
      )}
      
      <div className="tabs">
        <div className="tab-buttons">
          {RANK_ORDER.map(rank => (
            <button
              key={rank}
              onClick={() => setSelectedTab(rank)}
              className={selectedTab === rank ? 'active' : ''}
            >
              {rank}
            </button>
          ))}
        </div>
        
        <div className="tab-content">
          {RANK_ORDER.map(rank => (
            <div
              key={rank}
              style={{ display: selectedTab === rank ? 'block' : 'none' }}
            >
              <div className="officer-tab" data-rank={rank}>
                <h3>
                  {rank} Officers 
                  <span style={{ color: '#3498db', fontSize: '16px', marginLeft: '10px' }}>
                    ({displayRanks[rank]?.length || 0})
                  </span>
                </h3>
                <table>
                  <thead>
                    <tr>
                      <th style={{ width: '120px' }}>IRLA</th>
                      <th>Name</th>
                      <th style={{ width: '120px' }}>DOB</th>
                      <th style={{ width: '120px' }}>Retirement</th>
                    </tr>
                  </thead>
                  <tbody>
                    {!displayRanks[rank] || displayRanks[rank].length === 0 ? (
                      <tr>
                        <td colSpan="4" style={{ textAlign: 'center', padding: '20px' }}>No officers found</td>
                      </tr>
                    ) : (
                      displayRanks[rank].map((officer) => {
                        const retirementDate = getRetirementDate(officer.DOB);
                        
                        return (
                          <tr key={officer.IRLA}>
                            <td>{officer.IRLA}</td>
                            <td>{officer.Name}</td>
                            <td>{officer.DOB}</td>
                            <td>{formatDate(retirementDate)}</td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </div>
      </div>
      <div className="footer">
        Developed by Adhiraj Singh Bains
      </div>
    </div>
  );
}

export default App;