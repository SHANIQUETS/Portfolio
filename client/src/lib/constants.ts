// Parish constants for Jamaica
export const JAMAICA_PARISHES = [
  { value: "clarendon", label: "Clarendon" },
  { value: "hanover", label: "Hanover" },
  { value: "kingston", label: "Kingston" },
  { value: "manchester", label: "Manchester" },
  { value: "portland", label: "Portland" },
  { value: "standrews", label: "St. Andrew" },
  { value: "stann", label: "St. Ann" },
  { value: "stcatherine", label: "St. Catherine" },
  { value: "stelizabeth", label: "St. Elizabeth" },
  { value: "stjames", label: "St. James" },
  { value: "stmary", label: "St. Mary" },
  { value: "stthomas", label: "St. Thomas" },
  { value: "trelawny", label: "Trelawny" },
  { value: "westmoreland", label: "Westmoreland" },
  { value: "other", label: "Other" }
];

// Blood types
export const BLOOD_TYPES = [
  { value: "A+", label: "A+" },
  { value: "A-", label: "A-" },
  { value: "B+", label: "B+" },
  { value: "B-", label: "B-" },
  { value: "AB+", label: "AB+" },
  { value: "AB-", label: "AB-" },
  { value: "O+", label: "O+" },
  { value: "O-", label: "O-" },
  { value: "unknown", label: "Unknown" }
];

// Marital status options
export const MARITAL_STATUSES = [
  { value: "single", label: "Single" },
  { value: "married", label: "Married" },
  { value: "divorced", label: "Divorced" },
  { value: "widowed", label: "Widowed" },
  { value: "separated", label: "Separated" },
  { value: "other", label: "Other" }
];

// Gender options
export const GENDERS = [
  { value: "male", label: "Male" },
  { value: "female", label: "Female" },
  { value: "other", label: "Other" }
];

// Organ donor status options
export const ORGAN_DONOR_STATUSES = [
  { value: "yes", label: "Yes" },
  { value: "no", label: "No" },
  { value: "unknown", label: "Unknown" }
];

// Visit types
export const VISIT_TYPES = [
  { value: "checkup", label: "Regular Check-up" },
  { value: "followup", label: "Follow-up" },
  { value: "consultation", label: "Consultation" },
  { value: "urgent", label: "Urgent Care" },
  { value: "physical", label: "Physical Examination" },
  { value: "vaccination", label: "Vaccination" },
  { value: "procedure", label: "Medical Procedure" },
  { value: "labresults", label: "Lab Results Review" },
  { value: "prescription", label: "Prescription Refill" },
  { value: "other", label: "Other" }
];

// Patient types
export const PATIENT_TYPES = [
  { value: "new", label: "New Patient" },
  { value: "consultation", label: "Consultation" },
  { value: "returning", label: "Returning Patient" }
];

// Major cities/towns in Jamaica
export const JAMAICA_CITIES = [
  { value: "kingston", label: "Kingston" },
  { value: "montego_bay", label: "Montego Bay" },
  { value: "spanish_town", label: "Spanish Town" },
  { value: "may_pen", label: "May Pen" },
  { value: "mandeville", label: "Mandeville" },
  { value: "ocho_rios", label: "Ocho Rios" },
  { value: "portmore", label: "Portmore" },
  { value: "port_antonio", label: "Port Antonio" },
  { value: "savanna_la_mar", label: "Savanna-la-Mar" },
  { value: "lucea", label: "Lucea" },
  { value: "morant_bay", label: "Morant Bay" },
  { value: "port_maria", label: "Port Maria" },
  { value: "falmouth", label: "Falmouth" },
  { value: "black_river", label: "Black River" },
  { value: "linstead", label: "Linstead" },
  { value: "other", label: "Other" }
];

// Clinic tier pricing constants
export const CLINIC_TIER_PRICING = {
  "sole_trader": 100,
  "small_clinic": 150,
  "standard_clinic": 200,
  "enterprise": "custom"
};

// Stripe amount IDs mapping to tiers
// In production, these would be real Stripe price IDs created in the Stripe dashboard
export const STRIPE_AMOUNT_IDS = {
  "sole_trader": "price_sole_trader", // Replace with actual Stripe price ID
  "small_clinic": "price_small_clinic", // Replace with actual Stripe price ID 
  "standard_clinic": "price_standard_clinic", // Replace with actual Stripe price ID
  "enterprise": "" // Enterprise is custom amount, so no fixed price ID
};