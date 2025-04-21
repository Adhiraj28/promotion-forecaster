import React, { useState, useEffect } from 'react';
import OfficerTable from './OfficerTable';
import { isOfficerRetired } from '../utils/dateUtils';

/**
 * Tab component for a specific rank
 */
const OfficerTab = ({ rank, officersInRank, currentDate, onToggleFreeze }) => {
  const [filteredOfficers, setFilteredOfficers] = useState(officersInRank);
  
  // Update filtered list when officers or date changes
  useEffect(() => {
    // Make sure we have all officers first
    setFilteredOfficers(officersInRank);
    
    // Don't filter by retirement - just display all officers in the rank
    // This fixes the issue with not showing all officers
  }, [officersInRank]);
  
  // Handle freeze toggle
  const handleToggleFreeze = (index) => {
    const officer = filteredOfficers[index];
    onToggleFreeze(rank, officer.IRLA);
  };
  
  return (
    <div className="officer-tab" data-rank={rank}>
      <h3>{rank} Officers <span style={{ color: '#3498db', fontSize: '16px' }}>({filteredOfficers.length})</span></h3>
      <OfficerTable 
        officers={filteredOfficers} 
        onToggleFreeze={handleToggleFreeze}
      />
    </div>
  );
};

export default OfficerTab;