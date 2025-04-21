import { RETIREMENT_AGE } from '../data/config';

/**
 * Parse a date string into a Date object
 * @param {string} dateStr - Date string in format DD-MM-YYYY
 * @returns {Date} - JavaScript Date object
 */
export const parseDate = (dateStr) => {
  const [day, month, year] = dateStr.split('-').map(num => parseInt(num, 10));
  return new Date(year, month - 1, day); // month is 0-indexed in JS Date
};

/**
 * Format a Date object to a string in DD-MM-YYYY format
 * @param {Date} date - JavaScript Date object
 * @returns {string} - Formatted date string
 */
export const formatDate = (date) => {
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0'); // month is 0-indexed
  const year = date.getFullYear();
  return `${day}-${month}-${year}`;
};

/**
 * Get the last day of a given month and year
 * @param {number} year - Year
 * @param {number} month - Month (1-12)
 * @returns {number} - Last day of the month
 */
export const getLastDayOfMonth = (year, month) => {
  // Get the last day by creating a date for the first day of the next month
  // and then going back one day
  return new Date(year, month, 0).getDate();
};

/**
 * Calculate retirement date from date of birth
 * An officer retires on the last day of the month in which they turn RETIREMENT_AGE
 * @param {string} dobStr - Date of birth in DD-MM-YYYY format
 * @returns {Date} - Retirement date as a Date object
 */
export const getRetirementDate = (dobStr) => {
  const dob = parseDate(dobStr);
  const retireYear = dob.getFullYear() + RETIREMENT_AGE;
  const month = dob.getMonth() + 1; // 1-indexed month for getLastDayOfMonth
  const lastDay = getLastDayOfMonth(retireYear, month);
  
  return new Date(retireYear, dob.getMonth(), lastDay);
};

/**
 * Check if an officer is retired as of a given date
 * @param {string} dobStr - Date of birth in DD-MM-YYYY format
 * @param {Date} currentDate - Current date to compare against
 * @returns {boolean} - True if officer is retired
 */
export const isOfficerRetired = (dobStr, currentDate) => {
  const retirementDate = getRetirementDate(dobStr);
  return retirementDate <= currentDate;
};

/**
 * Convert a string date to ISO format for input[type="date"]
 * @param {string} dateStr - Date in DD-MM-YYYY format
 * @returns {string} - Date in YYYY-MM-DD format
 */
export const toISODateString = (dateStr) => {
  const date = parseDate(dateStr);
  return date.toISOString().split('T')[0];
};

/**
 * Convert an ISO format date to DD-MM-YYYY
 * @param {string} isoDateStr - Date in YYYY-MM-DD format
 * @returns {string} - Date in DD-MM-YYYY format
 */
export const fromISODateString = (isoDateStr) => {
  const date = new Date(isoDateStr);
  return formatDate(date);
};

/**
 * Get current date as a string in DD-MM-YYYY format
 * @returns {string} - Current date
 */
export const getCurrentDateString = () => {
  return formatDate(new Date());
};