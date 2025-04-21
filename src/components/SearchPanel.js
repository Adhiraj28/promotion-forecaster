import React, { useState } from 'react';

/**
 * Search panel component for finding officers by IRLA
 */
const SearchPanel = ({ onSearch }) => {
  const [searchText, setSearchText] = useState('');
  
  const handleSearch = () => {
    onSearch(searchText.trim());
  };
  
  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };
  
  return (
    <div className="search">
      <label htmlFor="search-irla">Search IRLA:</label>
      <input
        id="search-irla"
        type="text"
        value={searchText}
        onChange={(e) => setSearchText(e.target.value)}
        onKeyPress={handleKeyPress}
        placeholder="Enter IRLA number"
      />
      <button onClick={handleSearch}>Search</button>
    </div>
  );
};

export default SearchPanel;