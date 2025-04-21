import React from 'react';

/**
 * Timeline component for displaying officer promotion timeline
 */
const Timeline = ({ timeline, officer }) => {
  if (!officer) {
    return (
      <div className="timeline">
        <p>Search for an officer by IRLA to see their promotion timeline.</p>
      </div>
    );
  }
  
  return (
    <div className="timeline">
      <h3>Officer Information</h3>
      <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: '10px 20px', marginBottom: '20px' }}>
        <strong>IRLA:</strong>
        <span>{officer.IRLA}</span>
        
        <strong>Name:</strong>
        <span>{officer.Name}</span>
        
        <strong>Current Rank:</strong>
        <span>{officer.Rank}</span>
        
        <strong>DOB:</strong>
        <span>{officer.DOB}</span>
      </div>
      
      <h3>Promotion Timeline</h3>
      {timeline && timeline !== "No promotions recorded." ? (
        <pre style={{ 
          backgroundColor: '#f1f8ff', 
          borderLeft: '4px solid #3498db' 
        }}>{timeline}</pre>
      ) : (
        <p>No promotions recorded for this officer.</p>
      )}
    </div>
  );
};

export default Timeline;