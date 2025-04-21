import React from 'react';
import { toISODateString, getCurrentDateString } from '../utils/dateUtils';

/**
 * Date filter component for selecting the current simulation date
 */
const DateFilter = ({ currentDate, setCurrentDate, onApplyFilter }) => {
  // Convert current date for input[type="date"]
  const handleDateChange = (e) => {
    setCurrentDate(new Date(e.target.value));
  };
  
  return (
    <div className="date-filter">
      <label htmlFor="current-date">Current date:</label>
      <input
        id="current-date"
        type="date"
        value={currentDate.toISOString().split('T')[0]}
        onChange={handleDateChange}
      />
      <button onClick={onApplyFilter}>Apply Date Filter</button>
    </div>
  );
};

export default DateFilter;