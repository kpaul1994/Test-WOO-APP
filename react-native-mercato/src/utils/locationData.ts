export interface CountryItem {
  code: string;
  name: string;
}

export interface StateItem {
  code: string;
  name: string;
}

export const COUNTRIES: CountryItem[] = [
  { code: 'IN', name: 'India' },
  { code: 'US', name: 'United States (US)' },
  { code: 'BD', name: 'Bangladesh' },
  { code: 'GB', name: 'United Kingdom (UK)' },
  { code: 'CA', name: 'Canada' },
  { code: 'AU', name: 'Australia' },
  { code: 'AE', name: 'United Arab Emirates' },
  { code: 'SG', name: 'Singapore' },
  { code: 'MY', name: 'Malaysia' },
  { code: 'SA', name: 'Saudi Arabia' },
  { code: 'PK', name: 'Pakistan' },
  { code: 'NP', name: 'Nepal' },
  { code: 'LK', name: 'Sri Lanka' },
  { code: 'DE', name: 'Germany' },
  { code: 'FR', name: 'France' },
  { code: 'IT', name: 'Italy' },
  { code: 'ES', name: 'Spain' },
  { code: 'NL', name: 'Netherlands' },
  { code: 'NZ', name: 'New Zealand' },
  { code: 'ZA', name: 'South Africa' },
  { code: 'BR', name: 'Brazil' },
  { code: 'MX', name: 'Mexico' },
  { code: 'JP', name: 'Japan' },
  { code: 'PH', name: 'Philippines' },
  { code: 'ID', name: 'Indonesia' },
  { code: 'TH', name: 'Thailand' },
  { code: 'VN', name: 'Vietnam' },
  { code: 'EG', name: 'Egypt' },
  { code: 'NG', name: 'Nigeria' },
  { code: 'KE', name: 'Kenya' },
  { code: 'IE', name: 'Ireland' },
  { code: 'SE', name: 'Sweden' },
  { code: 'CH', name: 'Switzerland' },
  { code: 'NO', name: 'Norway' },
  { code: 'DK', name: 'Denmark' },
  { code: 'FI', name: 'Finland' },
  { code: 'PL', name: 'Poland' },
  { code: 'PT', name: 'Portugal' },
  { code: 'TR', name: 'Turkey' },
  { code: 'GR', name: 'Greece' },
  { code: 'AT', name: 'Austria' },
  { code: 'BE', name: 'Belgium' },
];

export const COUNTRY_STATES: Record<string, StateItem[]> = {
  IN: [
    { code: 'WB', name: 'West Bengal' },
    { code: 'MH', name: 'Maharashtra' },
    { code: 'DL', name: 'Delhi' },
    { code: 'KA', name: 'Karnataka' },
    { code: 'TN', name: 'Tamil Nadu' },
    { code: 'TG', name: 'Telangana' },
    { code: 'GJ', name: 'Gujarat' },
    { code: 'UP', name: 'Uttar Pradesh' },
    { code: 'RJ', name: 'Rajasthan' },
    { code: 'KL', name: 'Kerala' },
    { code: 'AP', name: 'Andhra Pradesh' },
    { code: 'MP', name: 'Madhya Pradesh' },
    { code: 'PB', name: 'Punjab' },
    { code: 'HR', name: 'Haryana' },
    { code: 'BR', name: 'Bihar' },
    { code: 'OR', name: 'Odisha' },
    { code: 'JH', name: 'Jharkhand' },
    { code: 'AS', name: 'Assam' },
    { code: 'CT', name: 'Chhattisgarh' },
    { code: 'UT', name: 'Uttarakhand' },
    { code: 'HP', name: 'Himachal Pradesh' },
    { code: 'GA', name: 'Goa' },
    { code: 'TR', name: 'Tripura' },
    { code: 'ML', name: 'Meghalaya' },
    { code: 'MN', name: 'Manipur' },
    { code: 'NL', name: 'Nagaland' },
    { code: 'MZ', name: 'Mizoram' },
    { code: 'AR', name: 'Arunachal Pradesh' },
    { code: 'SK', name: 'Sikkim' },
    { code: 'JK', name: 'Jammu and Kashmir' },
    { code: 'LA', name: 'Ladakh' },
    { code: 'CH', name: 'Chandigarh' },
    { code: 'PY', name: 'Puducherry' },
    { code: 'AN', name: 'Andaman and Nicobar Islands' },
    { code: 'DN', name: 'Dadra and Nagar Haveli and Daman and Diu' },
    { code: 'LD', name: 'Lakshadweep' },
  ],
  US: [
    { code: 'AL', name: 'Alabama' },
    { code: 'AK', name: 'Alaska' },
    { code: 'AZ', name: 'Arizona' },
    { code: 'AR', name: 'Arkansas' },
    { code: 'CA', name: 'California' },
    { code: 'CO', name: 'Colorado' },
    { code: 'CT', name: 'Connecticut' },
    { code: 'DE', name: 'Delaware' },
    { code: 'DC', name: 'District of Columbia' },
    { code: 'FL', name: 'Florida' },
    { code: 'GA', name: 'Georgia' },
    { code: 'HI', name: 'Hawaii' },
    { code: 'ID', name: 'Idaho' },
    { code: 'IL', name: 'Illinois' },
    { code: 'IN', name: 'Indiana' },
    { code: 'IA', name: 'Iowa' },
    { code: 'KS', name: 'Kansas' },
    { code: 'KY', name: 'Kentucky' },
    { code: 'LA', name: 'Louisiana' },
    { code: 'ME', name: 'Maine' },
    { code: 'MD', name: 'Maryland' },
    { code: 'MA', name: 'Massachusetts' },
    { code: 'MI', name: 'Michigan' },
    { code: 'MN', name: 'Minnesota' },
    { code: 'MS', name: 'Mississippi' },
    { code: 'MO', name: 'Missouri' },
    { code: 'MT', name: 'Montana' },
    { code: 'NE', name: 'Nebraska' },
    { code: 'NV', name: 'Nevada' },
    { code: 'NH', name: 'New Hampshire' },
    { code: 'NJ', name: 'New Jersey' },
    { code: 'NM', name: 'New Mexico' },
    { code: 'NY', name: 'New York' },
    { code: 'NC', name: 'North Carolina' },
    { code: 'ND', name: 'North Dakota' },
    { code: 'OH', name: 'Ohio' },
    { code: 'OK', name: 'Oklahoma' },
    { code: 'OR', name: 'Oregon' },
    { code: 'PA', name: 'Pennsylvania' },
    { code: 'RI', name: 'Rhode Island' },
    { code: 'SC', name: 'South Carolina' },
    { code: 'SD', name: 'South Dakota' },
    { code: 'TN', name: 'Tennessee' },
    { code: 'TX', name: 'Texas' },
    { code: 'UT', name: 'Utah' },
    { code: 'VT', name: 'Vermont' },
    { code: 'VA', name: 'Virginia' },
    { code: 'WA', name: 'Washington' },
    { code: 'WV', name: 'West Virginia' },
    { code: 'WI', name: 'Wisconsin' },
    { code: 'WY', name: 'Wyoming' },
  ],
  CA: [
    { code: 'AB', name: 'Alberta' },
    { code: 'BC', name: 'British Columbia' },
    { code: 'MB', name: 'Manitoba' },
    { code: 'NB', name: 'New Brunswick' },
    { code: 'NL', name: 'Newfoundland and Labrador' },
    { code: 'NT', name: 'Northwest Territories' },
    { code: 'NS', name: 'Nova Scotia' },
    { code: 'NU', name: 'Nunavut' },
    { code: 'ON', name: 'Ontario' },
    { code: 'PE', name: 'Prince Edward Island' },
    { code: 'QC', name: 'Quebec' },
    { code: 'SK', name: 'Saskatchewan' },
    { code: 'YT', name: 'Yukon' },
  ],
  AU: [
    { code: 'ACT', name: 'Australian Capital Territory' },
    { code: 'NSW', name: 'New South Wales' },
    { code: 'NT', name: 'Northern Territory' },
    { code: 'QLD', name: 'Queensland' },
    { code: 'SA', name: 'South Australia' },
    { code: 'TAS', name: 'Tasmania' },
    { code: 'VIC', name: 'Victoria' },
    { code: 'WA', name: 'Western Australia' },
  ],
  BD: [
    { code: 'BD-01', name: 'Dhaka' },
    { code: 'BD-02', name: 'Chittagong' },
    { code: 'BD-03', name: 'Sylhet' },
    { code: 'BD-04', name: 'Rajshahi' },
    { code: 'BD-05', name: 'Khulna' },
    { code: 'BD-06', name: 'Barisal' },
    { code: 'BD-07', name: 'Rangpur' },
    { code: 'BD-08', name: 'Mymensingh' },
  ],
};

export const COMMON_CITIES: Record<string, string[]> = {
  'IN_WB': ['Kolkata', 'Howrah', 'Siliguri', 'Durgapur', 'Asansol', 'Kharagpur', 'Bardhaman', 'Malda', 'Darjeeling', 'Baharampur'],
  'IN_MH': ['Mumbai', 'Pune', 'Nagpur', 'Thane', 'Nashik', 'Aurangabad', 'Solapur', 'Navi Mumbai', 'Kolhapur'],
  'IN_DL': ['New Delhi', 'Delhi', 'North Delhi', 'South Delhi', 'Dwarka', 'Rohini', 'Connaught Place'],
  'IN_KA': ['Bengaluru', 'Mysuru', 'Hubballi', 'Mangaluru', 'Belagavi', 'Davanagere', 'Bellary'],
  'IN_TN': ['Chennai', 'Coimbatore', 'Madurai', 'Tiruchirappalli', 'Salem', 'Tirunelveli', 'Erode', 'Vellore'],
  'IN_TG': ['Hyderabad', 'Warangal', 'Nizamabad', 'Khammam', 'Karimnagar', 'Ramagundam', 'Secunderabad'],
  'IN_GJ': ['Ahmedabad', 'Surat', 'Vadodara', 'Rajkot', 'Bhavnagar', 'Jamnagar', 'Gandhinagar'],
  'IN_UP': ['Lucknow', 'Kanpur', 'Noida', 'Greater Noida', 'Varanasi', 'Agra', 'Prayagraj', 'Ghaziabad', 'Meerut'],
  'IN_KL': ['Kochi', 'Thiruvananthapuram', 'Kozhikode', 'Thrissur', 'Kollam', 'Alappuzha', 'Kannur'],
  'IN_RJ': ['Jaipur', 'Jodhpur', 'Kota', 'Bikaner', 'Ajmer', 'Udaipur', 'Bhilwara'],
  'IN_PB': ['Ludhiana', 'Amritsar', 'Jalandhar', 'Patiala', 'Bathinda', 'Mohali'],
  'IN_HR': ['Gurugram', 'Faridabad', 'Panipat', 'Ambala', 'Yamunanagar', 'Rohtak', 'Hisar'],
  'IN_BR': ['Patna', 'Gaya', 'Bhagalpur', 'Muzaffarpur', 'Purnia', 'Darbhanga'],
  'US_CA': ['Los Angeles', 'San Francisco', 'San Diego', 'San Jose', 'Sacramento', 'Oakland'],
  'US_NY': ['New York', 'Buffalo', 'Rochester', 'Yonkers', 'Syracuse', 'Albany'],
  'US_TX': ['Houston', 'Dallas', 'Austin', 'San Antonio', 'Fort Worth', 'El Paso'],
  'US_FL': ['Miami', 'Orlando', 'Tampa', 'Jacksonville', 'St. Petersburg', 'Fort Lauderdale'],
  'US_WA': ['Seattle', 'Spokane', 'Tacoma', 'Vancouver', 'Bellevue', 'Everett'],
  'BD_BD-01': ['Dhaka', 'Gazipur', 'Narayanganj', 'Tangail', 'Faridpur'],
  'BD_BD-02': ['Chittagong', 'Cox\'s Bazar', 'Comilla', 'Feni', 'Brahmanbaria'],
};

export function getStatesForCountry(countryCode: string): StateItem[] {
  const code = (countryCode || '').trim().toUpperCase();
  return COUNTRY_STATES[code] || [];
}

export function getCountryName(countryCode: string): string {
  const code = (countryCode || '').trim().toUpperCase();
  const found = COUNTRIES.find((c) => c.code === code);
  return found ? found.name : countryCode;
}

export function getStateName(countryCode: string, stateCodeOrName: string): string {
  const states = getStatesForCountry(countryCode);
  const clean = (stateCodeOrName || '').trim().toLowerCase();
  if (!clean) return '';

  const match = states.find(
    (s) => s.code.toLowerCase() === clean || s.name.toLowerCase() === clean,
  );
  return match ? match.name : stateCodeOrName;
}

/**
 * Normalizes state name to the official WooCommerce state code.
 * E.g., for country 'IN': 'west bengal' -> 'WB', 'wb' -> 'WB'.
 */
export function normalizeStateCode(countryCode: string, stateInput: string): string {
  const cleanInput = (stateInput || '').trim();
  if (!cleanInput) return '';

  const states = getStatesForCountry(countryCode);
  if (states.length === 0) {
    return cleanInput;
  }

  const lower = cleanInput.toLowerCase();
  const match = states.find(
    (s) => s.code.toLowerCase() === lower || s.name.toLowerCase() === lower,
  );

  return match ? match.code : cleanInput.toUpperCase();
}

export function getCitySuggestions(countryCode: string, stateCode: string): string[] {
  const c = (countryCode || '').trim().toUpperCase();
  const s = normalizeStateCode(c, stateCode);
  const key = `${c}_${s}`;
  return COMMON_CITIES[key] || [];
}
