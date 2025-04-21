import React from 'react';
import { formatDate, getRetirementDate } from '../utils/dateUtils';

/**
 * Table component for displaying officers in a rank
 */
const OfficerTable = ({ officers, onToggleFreeze }) => {
  return (
    <table>
      <thead>
        <tr>
          <th style={{ width: '80px', textAlign: 'center' }}>Freeze</th>
          <th style={{ width: '120px' }}>IRLA</th>
          <th>Name</th>
          <th style={{ width: '120px' }}>DOB</th>
          <th style={{ width: '120px' }}>Retirement</th>
        </tr>
      </thead>
      <tbody>
        {officers.length === 0 ? (
          <tr>
            <td colSpan="5" style={{ textAlign: 'center', padding: '20px' }}>No officers found</td>
          </tr>
        ) : (
          officers.map((officer, index) => {
            const retirementDate = getRetirementDate(officer.DOB);
            
            return (
              <tr key={officer.IRLA}>
                <td style={{ textAlign: 'center' }}>
                  <input
                    type="checkbox"
                    checked={officer.Frozen || false}
                    onChange={() => onToggleFreeze(index)}
                  />
                </td>
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
  );
};

export default OfficerTable;
